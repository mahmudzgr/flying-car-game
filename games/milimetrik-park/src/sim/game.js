// Milimetrik Park — bölüm çalışma zamanı: dünya kurulumu, hasar, hamle sayımı, park değerlendirmesi,
// park sensörleri ve yörünge çizgileri. DOM kullanmaz (Node'daki bot da bunu kullanır).
import { World, Body, polyShape, circleShape, LAYER, segSegDist } from './physics.js';
import { Vehicle, createCarBody } from './vehicle.js';
import { CARS, PLAYER_CAR, DT, DAMAGE, SCORE } from '../config.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const SENSOR_RANGE = 1.8;
const tmpSeg = { d: 0, ax: 0, ay: 0, bx: 0, by: 0 };

/**
 * @param {object} level  levels/build.js çıktısı
 * @param {{car?:string}} [opts]
 */
export function createGame(level, opts = {}) {
  const spec = CARS[opts.car || PLAYER_CAR];
  const world = new World();

  for (const s of level.solids) {
    const o = { layer: LAYER.BODY, mask: LAYER.BODY, mu: 0.3, e: 0.12, kind: s.kind, data: s };
    world.addStatic(s.shape === 'circle' ? circleShape(s.r, s.x, s.y, o) : polyShape(s.verts, o));
  }
  for (const c of level.curbs) {
    world.addStatic(polyShape(c.verts, { layer: LAYER.CURB, mask: LAYER.WHEEL, mu: 0.6, e: 0.05, kind: c.kind, data: c }));
  }
  world.finalizeStatics();

  const cones = level.cones.map((c) => {
    const b = new Body({ x: c.x, y: c.y, mass: 3.5, inertia: 0.05, linFric: 4.5, angFric: 9, kind: 'cone', data: { sleepy: true, hx: c.x, hy: c.y, hit: false, knocked: false, tip: 0 } });
    b.add(circleShape(0.17, 0, 0, { layer: LAYER.BODY, mask: LAYER.BODY, mu: 0.5, e: 0.3, kind: 'cone' }));
    return world.addBody(b);
  });

  const st = level.start;
  const body = createCarBody(spec, st.x, st.y, st.a);
  world.addBody(body);
  const car = new Vehicle(spec, body);
  car.gear = st.gear || 'P';
  world.controllers.push(car);

  const targets = level.spots.filter((s) => s.target);
  const g = car.geom;

  const game = {
    level, spec, world, car, body, cones, targets,
    status: 'play',            // 'play' | 'done' | 'fail'
    started: false,
    time: 0,
    steps: 0,
    moves: 0,
    damage: 0,
    hits: 0,
    curbTouches: 0,
    conesHit: 0,
    scraping: 0,               // anlık sürtme hızı (m/s) — ses için
    events: [],
    live: null,                // hedefe göre anlık değerlendirme (içerideyken)
    result: null,
    failReason: null,
    lastParkEval: null,

    /** Bir fizik adımı. ctrl: {throttle, brake, handbrake, steerAbs, steerDir, autoCenter} */
    step(ctrl) {
      if (!this.started && (ctrl.throttle > 0.02 || ctrl.brake > 0.02 || ctrl.steerDir || ctrl.handbrake || car.gear !== st.gear || ctrl.steerAbs != null)) {
        this.started = true;
      }
      car.frozen = this.status !== 'play';
      car.setControls(ctrl);
      world.step(DT);
      body.updateGeom();
      this.steps++;
      if (this.started && this.status === 'play') this.time += DT;
      processContacts();
      trackMoves();
      if (this.steps % 6 === 0 || this.live) updateLive();
      for (const c of cones) if (c.data.knocked && c.data.tip < 1) c.data.tip = Math.min(1, c.data.tip + DT * 6);
    },

    /** Vites isteği. P hedefin içindeyken bölümü bitirir. */
    requestGear(gear) {
      if (this.status !== 'play') return { ok: false, reason: 'over' };
      const prev = car.gear;
      const r = car.requestGear(gear);
      if (!r.ok) { this.events.push({ type: 'gearDenied', gear, reason: r.reason }); return r; }
      if (r.same) return r;
      this.started = true;
      this.events.push({ type: 'gear', gear, prev });
      if (gear === 'P') tryPark();
      return r;
    },

    /** Geometrik merkez (dünya). */
    center(out = {}) {
      out.x = body.x + Math.cos(body.a) * g.gcx;
      out.y = body.y + Math.sin(body.a) * g.gcx;
      return out;
    },

    evaluate(spot) { return evaluate(spot); },
    sensors() { return sensors(); },
    guides(len) { return guides(len); },

    /** Determinizm denetimi için durum özeti. */
    hash() {
      const r = (x) => Math.round(x * 1e6);
      return [r(body.x), r(body.y), r(body.a), r(body.vx), r(body.vy), r(body.w), this.moves, Math.round(this.damage * 1000), ...cones.map((c) => r(c.x) + r(c.y))].join(',');
    },
  };

  // ------------------------------------------------------------ temaslar → hasar

  let touch = new Map();      // anahtar → son temas adımı

  function emit(e) { game.events.push(e); }

  function addDamage(v) {
    if (game.status !== 'play') return;
    game.damage = Math.min(100, game.damage + v);
    if (game.damage >= 100) fail('damage');
  }

  function processContacts() {
    const now = game.steps;
    let scrape = 0;
    for (const m of world.contacts) {
      const carA = m.a === body, carB = m.b === body;
      if (!carA && !carB) continue;
      const cs = carA ? m.sa : m.sb, other = carA ? m.sb : m.sa;
      let approach = 0, slide = 0, px = 0, py = 0;
      for (const p of m.pts) {
        if (-p.vn0 > approach) approach = -p.vn0;
        const vt = Math.abs(p.vt0);
        if (vt > slide) slide = vt;
        px = p.x; py = p.y;
      }
      const key = cs.id * 1e6 + other.id;
      const last = touch.get(key);
      const isNew = last === undefined || now - last > 48;   // 0,2 sn temas yoksa yeni temas
      touch.set(key, now);

      if (other.kind === 'cone') {
        const cone = other.body;
        if (!cone.data.hit) {
          cone.data.hit = true;
          game.conesHit++;
          addDamage(DAMAGE.cone);
          emit({ type: 'cone', x: px, y: py, kmh: approach * 3.6 });
        }
        if (approach > 0.9) cone.data.knocked = true;
        continue;
      }
      if (cs.kind === 'wheel') {
        if (isNew && approach > 0.12) {
          const kmh = approach * 3.6;
          if (other.kind === 'curb') game.curbTouches++;
          emit({ type: other.kind === 'stopper' ? 'stopper' : 'curb', kmh, x: px, y: py });
          if (kmh > DAMAGE.curbKmh) addDamage((kmh - DAMAGE.curbKmh) * DAMAGE.curbPerKmh + 2);
        }
        continue;
      }
      // gövde: çarpma ya da sürtme
      if (isNew) {
        const kmh = approach * 3.6;
        const dmg = kmh < 1 ? DAMAGE.touch : Math.max(DAMAGE.min, kmh * DAMAGE.perKmh);
        game.hits++;
        emit({ type: 'hit', kmh, x: px, y: py, kind: other.kind });
        addDamage(dmg);
      } else if (slide > 0.12) {
        scrape = Math.max(scrape, slide);
        addDamage(DAMAGE.scrapePerMeter * slide * DT);
      }
    }
    game.scraping = scrape;
    // eski kayıtları temizle
    if (now % 240 === 0) for (const [k, v] of touch) if (now - v > 240) touch.delete(k);
    // koniler: araçla değmeden de devrilmiş/kaymış olabilir (başka koninin çarpması)
    for (const c of cones) {
      if (!c.data.hit && Math.hypot(c.x - c.data.hx, c.y - c.data.hy) > 0.25) {
        c.data.hit = true; game.conesHit++; addDamage(DAMAGE.cone);
        emit({ type: 'cone', x: c.x, y: c.y, kmh: 0 });
      }
    }
  }

  // ------------------------------------------------------------ hamleler (yön değişimi)

  let moveDir = 0, candDist = 0;
  function trackMoves() {
    const v = car.vLong;
    if (Math.abs(v) < 0.04) return;
    const d = v > 0 ? 1 : -1;
    if (d === moveDir) { candDist = 0; return; }
    candDist += Math.abs(v) * DT;
    if (candDist > 0.12) {
      moveDir = d; candDist = 0;
      if (game.status === 'play') { game.moves++; emit({ type: 'move', moves: game.moves, dir: d }); }
    }
  }

  // ------------------------------------------------------------ park değerlendirmesi

  function evaluate(spot) {
    const ux = Math.cos(spot.a), uy = Math.sin(spot.a), px = -uy, py = ux;
    const sh = body.shapes[0];
    let inside = true, worst = 0;
    for (let i = 0; i < sh.n; i++) {
      const dx = sh.wx[i] - spot.x, dy = sh.wy[i] - spot.y;
      const du = Math.abs(dx * ux + dy * uy) - spot.l / 2, dp = Math.abs(dx * px + dy * py) - spot.w / 2;
      const out = Math.max(du, dp);
      if (out > worst) worst = out;
      if (out > 0.005) inside = false;
    }
    const c = game.center();
    const diff = wrap(body.a - spot.a);
    const facing = Math.abs(diff) <= Math.PI / 2 ? 'nose' : 'tail';
    const angErr = facing === 'nose' ? Math.abs(diff) : Math.PI - Math.abs(diff);
    const facingOk = spot.facing === 'any' || spot.facing === facing;
    const lat = (c.x - spot.x) * px + (c.y - spot.y) * py - (spot.idealLat || 0);
    const lon = (c.x - spot.x) * ux + (c.y - spot.y) * uy - (spot.idealLong || 0);
    const angDeg = (angErr * 180) / Math.PI;
    const aS = Math.exp(-((angDeg / SCORE.angleScale) ** 2));
    const lS = Math.exp(-((lat / SCORE.latScale) ** 2));
    const gS = Math.exp(-((lon / SCORE.longScale) ** 2));
    const quality = Math.round(100 * (SCORE.wAngle * aS + SCORE.wLat * lS + SCORE.wLong * gS));
    return { inside, outBy: worst, facing, facingOk, angDeg, latCm: lat * 100, lonCm: lon * 100, quality, spot };
  }

  function nearestTarget() {
    if (targets.length === 1) return targets[0];
    const c = game.center();
    let best = null, bd = Infinity;
    for (const s of targets) { const d = Math.hypot(s.x - c.x, s.y - c.y); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  function updateLive() {
    const spot = nearestTarget();
    const c = game.center();
    if (!spot || Math.hypot(spot.x - c.x, spot.y - c.y) > Math.max(spot.l, 6)) { game.live = null; return; }
    const e = evaluate(spot);
    game.live = e.inside || e.outBy < 1.2 ? e : null;
  }

  function tryPark() {
    const spot = nearestTarget();
    const e = spot ? evaluate(spot) : null;
    game.lastParkEval = e;
    if (!e || !e.inside) { emit({ type: 'parkOutside', eval: e }); return; }
    if (!e.facingOk) { emit({ type: 'parkWrongWay', eval: e }); return; }
    if (level.free) { emit({ type: 'parkFree', eval: e }); return; }
    const par = level.par;
    const stars = [true, game.damage === 0 && game.conesHit === 0, e.quality >= par.quality && game.moves <= par.moves];
    game.result = { ...e, time: game.time, moves: game.moves, damage: game.damage, hits: game.hits, curbTouches: game.curbTouches, conesHit: game.conesHit, stars, perfect: e.quality >= SCORE.perfect };
    game.status = 'done';
    emit({ type: 'done', result: game.result });
  }

  function fail(reason) {
    if (game.status !== 'play') return;
    game.status = 'fail';
    game.failReason = reason;
    emit({ type: 'fail', reason });
  }

  // ------------------------------------------------------------ park sensörleri

  // Tampon parçaları (geometrik merkeze göre yerel): arka ve ön, her biri sol-orta-sağ.
  const hl = g.length / 2, hw = g.hw, ch = 0.3;
  const bumpers = {
    rear: [[-hl + ch, -hw, -hl, -hw + ch], [-hl, -hw + ch, -hl, hw - ch], [-hl, hw - ch, -hl + ch, hw]],
    front: [[hl - ch, -hw, hl, -hw + ch], [hl, -hw + ch, hl, hw - ch], [hl, hw - ch, hl - ch, hw]],
  };
  const sensorOut = { rear: [Infinity, Infinity, Infinity], front: [Infinity, Infinity, Infinity], minRear: Infinity, minFront: Infinity, near: null };

  function sensors() {
    const c = game.center();
    const cos = Math.cos(body.a), sin = Math.sin(body.a);
    const toLocal = (x, y, o) => { const dx = x - c.x, dy = y - c.y; o[0] = dx * cos + dy * sin; o[1] = -dx * sin + dy * cos; return o; };
    const r = sensorOut;
    r.rear.fill(Infinity); r.front.fill(Infinity);
    r.near = null;
    let nearD = Infinity;
    const R = hl + SENSOR_RANGE + 0.5;
    const cands = world.queryShapes(c.x - R, c.y - R, c.x + R, c.y + R, LAYER.BODY);
    const A = [0, 0], B = [0, 0];
    for (const sh of cands) {
      if (sh.body === body) continue;
      for (const side of ['rear', 'front']) {
        const segs = bumpers[side], arr = r[side];
        for (let k = 0; k < 3; k++) {
          const [x1, y1, x2, y2] = segs[k];
          let d = Infinity, qx = 0, qy = 0;
          if (sh.type === 'circle') {
            toLocal(sh.cx, sh.cy, A);
            segSegDist(x1, y1, x2, y2, A[0], A[1], A[0], A[1], tmpSeg);
            d = tmpSeg.d - sh.r;
            const k2 = tmpSeg.d > 1e-6 ? sh.r / tmpSeg.d : 0;
            qx = A[0] + (tmpSeg.ax - A[0]) * k2; qy = A[1] + (tmpSeg.ay - A[1]) * k2;
          } else {
            for (let i = 0; i < sh.n; i++) {
              const j = (i + 1) % sh.n;
              toLocal(sh.wx[i], sh.wy[i], A); toLocal(sh.wx[j], sh.wy[j], B);
              segSegDist(x1, y1, x2, y2, A[0], A[1], B[0], B[1], tmpSeg);
              if (tmpSeg.d < d) { d = tmpSeg.d; qx = tmpSeg.bx; qy = tmpSeg.by; }
            }
          }
          if (d > SENSOR_RANGE) continue;
          // görüş alanı: tamponun önünde/arkasında, yanlarda biraz taşma
          if (side === 'rear' ? qx > -hl + 0.45 : qx < hl - 0.45) continue;
          if (Math.abs(qy) > hw + 0.9) continue;
          const zone = qy < -hw / 3 ? 0 : qy > hw / 3 ? 2 : 1;
          const dd = Math.max(0, d);
          if (dd < arr[zone]) arr[zone] = dd;
          if (dd < nearD) { nearD = dd; r.near = { side, zone, d: dd }; }
        }
      }
    }
    r.minRear = Math.min(...r.rear);
    r.minFront = Math.min(...r.front);
    return r;
  }

  // ------------------------------------------------------------ yörünge çizgileri

  /** Mevcut direksiyon açısıyla gidilecek yol: köşe izleri (dünya). */
  function guides(len = 4.5) {
    const dir = car.gearDir;
    if (!dir) return null;
    const L = spec.wheelbase, dc = car.steerAngle, b = g.b;
    const xEnd = dir < 0 ? g.xr : g.xf;
    const pts = [[xEnd, -g.hw], [xEnd, g.hw]];
    const cos = Math.cos(body.a), sin = Math.sin(body.a);
    const R = Math.abs(dc) < 1e-4 ? Infinity : L / Math.tan(dc);
    const N = 22;
    const out = { dir, left: [], right: [], marks: [] };
    for (let i = 0; i <= N; i++) {
      const sgm = (dir * len * i) / N;
      for (let k = 0; k < 2; k++) {
        let [x, y] = pts[k];
        if (R === Infinity) { x += sgm; }
        else {
          const phi = sgm / R, cx = -b, cy = R;
          const dx = x - cx, dy = y - cy, cp = Math.cos(phi), sp = Math.sin(phi);
          x = cx + dx * cp - dy * sp; y = cy + dx * sp + dy * cp;
        }
        const wx = body.x + x * cos - y * sin, wy = body.y + x * sin + y * cos;
        (k ? out.right : out.left).push(wx, wy);
      }
    }
    return out;
  }

  updateLive();
  return game;
}
