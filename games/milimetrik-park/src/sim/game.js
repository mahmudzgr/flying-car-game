// Milimetrik Park — bölüm çalışma zamanı: dünya kurulumu, sürücü yardımcısı, zemin/eğim, trafik ve yayalar,
// hasar, hamle sayımı, görevler (sınav), park değerlendirmesi, park sensörleri ve yörünge çizgileri.
// DOM kullanmaz (Node'daki bot da bunu kullanır).
import { World, Body, polyShape, circleShape, LAYER } from './physics.js';
import { Vehicle, TrailerAxle, createRig, trailerGeom } from './vehicle.js';
import { Driver } from './assist.js';
import { createAgents } from './agents.js';
import { rng } from '../levels/build.js';
import { VEHICLES, PLAYER_CAR, DT, DAMAGE, SCORE, SURFACES, ENVS, GRAVITY } from '../config.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

// ------------------------------------------------------------ zemin ızgarası

const KINDS = Object.keys(SURFACES);

function pointInPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Bölüm alanlarından 0,5 m'lik zemin ızgarası: sürtünme türü ve eğim ivmesi. */
export function buildTerrain(level, env) {
  const C = 0.5;
  const nx = Math.ceil(level.w / C) + 2, ny = Math.ceil(level.h / C) + 2;
  const base = KINDS.indexOf(level.indoor ? 'floor' : 'grass');
  const kind = new Uint8Array(nx * ny).fill(base);
  const sx = new Float32Array(nx * ny), sy = new Float32Array(nx * ny);
  for (const ar of level.areas) {
    const k = KINDS.indexOf(ar.type);
    if (k < 0 && !ar.slope) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of ar.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    let gx = 0, gy = 0;
    if (ar.slope) { const s = GRAVITY * Math.sin(Math.atan(ar.slope.grade)); gx = Math.cos(ar.slope.dir) * s; gy = Math.sin(ar.slope.dir) * s; }
    for (let j = Math.max(0, Math.floor(y0 / C)); j <= Math.min(ny - 1, Math.ceil(y1 / C)); j++) {
      for (let i = Math.max(0, Math.floor(x0 / C)); i <= Math.min(nx - 1, Math.ceil(x1 / C)); i++) {
        if (!pointInPoly(ar.pts, (i + 0.5) * C, (j + 0.5) * C)) continue;
        const id = j * nx + i;
        if (k >= 0) kind[id] = k;
        if (ar.slope || k >= 0) { sx[id] = gx; sy[id] = gy; }
      }
    }
  }
  const grip = env.grip;
  const out = { mu: 1, sx: 0, sy: 0, kind: 'asphalt' };
  return {
    query(x, y) {
      const i = Math.min(nx - 1, Math.max(0, Math.floor(x / C))), j = Math.min(ny - 1, Math.max(0, Math.floor(y / C)));
      const id = j * nx + i, k = KINDS[kind[id]];
      out.mu = SURFACES[k] * grip; out.sx = sx[id]; out.sy = sy[id]; out.kind = k;
      return out;
    },
  };
}

// ------------------------------------------------------------ park sensörü geometrisi

/**
 * Tampon başına 4 bölge (sol köşe, sol orta, sağ orta, sağ köşe); her bölge birkaç ışın.
 * Köşe sensörleri çaprazı, orta sensörler arkayı/önü görür; yanlara bakmaz (yandaki araç bip'letmez).
 */
function sensorLayout(hl, hw) {
  const R = 0.25, k45 = Math.SQRT1_2;
  const out = { rear: [], front: [] };
  for (const [side, sg] of [['rear', -1], ['front', 1]]) {
    for (const [zone, sy] of [[0, -1], [3, 1]]) {
      const ox = sg * (hl - R + R * k45), oy = sy * (hw - R + R * k45);
      const rays = [22, 42, 62].map((deg) => { const a = (deg * Math.PI) / 180; return { ox, oy, dx: sg * Math.cos(a), dy: sy * Math.sin(a) }; });
      out[side][zone] = { rays, range: 1.0 };
    }
    for (const [zone, sy] of [[1, -1], [2, 1]]) {
      const rays = [];
      for (const f of [0.18, 0.5]) for (const deg of [-10, 0, 10]) {
        const a = (deg * Math.PI) / 180;
        rays.push({ ox: sg * hl, oy: sy * hw * f, dx: sg * Math.cos(a), dy: sy * Math.sin(a) });
      }
      out[side][zone] = { rays, range: 1.6 };
    }
  }
  return out;
}

// ------------------------------------------------------------ oyun

/**
 * @param {object} level  levels/build.js çıktısı
 * @param {{vehicle?:string, scheme?:'lever'|'pedals', autoHold?:boolean, noAgents?:boolean, extraSolids?:object[], seed?:number}} [opts]
 */
export function createGame(level, opts = {}) {
  const vehicleId = opts.vehicle || level.vehicle || PLAYER_CAR;
  const spec = VEHICLES[vehicleId];
  const env = ENVS[level.env] || ENVS.day;
  const world = new World();

  for (const s of [...level.solids, ...(opts.extraSolids || [])]) {
    const o = { layer: LAYER.BODY, mask: LAYER.BODY, mu: 0.3, e: 0.12, kind: s.kind, data: s };
    world.addStatic(s.shape === 'circle' ? circleShape(s.r, s.x, s.y, o) : polyShape(s.verts, o));
  }
  for (const c of level.curbs) {
    world.addStatic(polyShape(c.verts, { layer: LAYER.CURB, mask: LAYER.WHEEL, mu: 0.6, e: 0.05, kind: c.kind, data: c }));
  }
  world.finalizeStatics();

  const cones = level.cones.map((c) => {
    const b = new Body({ x: c.x, y: c.y, mass: 3.5, inertia: 0.05, linFric: 4.5, angFric: 9, kind: 'cone', data: { sleepy: true, hx: c.x, hy: c.y, hit: false, knocked: false } });
    b.add(circleShape(0.17, 0, 0, { layer: LAYER.BODY, mask: LAYER.BODY, mu: 0.5, e: 0.3, kind: 'cone' }));
    return world.addBody(b);
  });

  const st = opts.start || level.start;
  const rig = createRig(spec, st.x, st.y, st.a);
  const body = rig.body;
  world.addBody(body);
  const car = new Vehicle(spec, body);
  car.gear = st.gear || 'P';
  world.controllers.push(car);
  let trailer = null;
  if (rig.trailer) {
    world.addBody(rig.trailer);
    world.joints.push(rig.joint);
    world.controllers.push(new TrailerAxle(spec.trailer, rig.trailer, car));
    trailer = rig.trailer;
  }
  const terrain = buildTerrain(level, env);
  car.terrain = terrain.query;
  const driver = new Driver(car);
  driver.scheme = opts.scheme || 'lever';
  driver.autoHold = opts.autoHold !== false;

  const g = car.geom;
  const tasks = level.tasks ? level.tasks.map((t) => ({ ...t, done: false, gate: 0 })) : null;
  const allTargets = level.spots.filter((s) => s.target);

  const game = {
    level, spec, vehicleId, world, car, body, trailer, joint: rig.joint, cones, driver, env, terrain,
    playerBodies: trailer ? [body, trailer] : [body],
    targets: allTargets,
    tasks, taskIndex: 0,
    status: 'play',            // 'play' | 'done' | 'fail'
    started: false,
    time: 0,
    steps: 0,
    moves: 0,
    damage: 0,
    hits: 0,
    curbTouches: 0,
    conesHit: 0,
    faults: 0,                 // sınav hataları
    scraping: 0,               // anlık sürtme hızı (m/s) — ses için
    events: [],
    live: null,                // hedefe göre anlık değerlendirme (içerideyken)
    result: null,
    failReason: null,
    lastParkEval: null,
    agents: null,

    /** Bir fizik adımı. raw: {throttle, brake, lever, handbrake, steerAbs, steerDir, autoCenter} */
    step(raw) {
      if (!this.started && (raw.throttle > 0.02 || raw.brake > 0.02 || Math.abs(raw.lever || 0) > 0.06 || raw.steerDir || raw.handbrake || car.gear !== st.gear || raw.steerAbs != null)) {
        this.started = true;
      }
      car.frozen = this.status !== 'play';
      driver.update(raw, DT, (gr) => this.requestGear(gr));
      if (this.agents) this.agents.step(DT, emit);
      const pcx = this._cx, pcy = this._cy;
      world.step(DT);
      body.updateGeom();
      if (trailer) trailer.updateGeom();
      this.steps++;
      if (this.started && this.status === 'play') {
        this.time += DT;
        if (level.timeLimit && this.time > level.timeLimit) fail('time');
      }
      processContacts();
      trackMoves();
      const c = this.center(cpos);
      this._cx = c.x; this._cy = c.y;
      if (tasks && this.status === 'play' && pcx !== undefined) trackTasks(pcx, pcy, c.x, c.y);
      if (this.steps % 6 === 0 || this.live) updateLive();
    },

    /** Vites isteği. P hedefin içindeyken bölümü (ya da görevi) bitirir. */
    requestGear(gear) {
      if (this.status !== 'play') return { ok: false, reason: 'over' };
      const prev = car.gear;
      const r = car.requestGear(gear);
      if (!r.ok) { emit({ type: 'gearDenied', gear, reason: r.reason }); return r; }
      if (r.same) { if (gear === 'P') tryPark(); return r; }
      this.started = true;
      emit({ type: 'gear', gear, prev });
      if (gear === 'P') tryPark();
      return r;
    },

    /** Sürüş kolu şeması: P düğmesi — dur ve park et. */
    requestPark() {
      if (this.status !== 'play') return;
      if (Math.abs(car.vLong) < 0.08) this.requestGear('P');
      else driver.parkReq = true;
    },

    /** Değerlendirilen cisim: hedef "römork" ise römork, değilse araç. */
    subject(spot) { return spot && spot.subject === 'trailer' && trailer ? trailer : body; },

    /** Aracın geometrik merkezi (dünya). */
    center(out = {}) {
      out.x = body.x + Math.cos(body.a) * g.gcx;
      out.y = body.y + Math.sin(body.a) * g.gcx;
      return out;
    },

    /** Kamera odağı: römork varsa ikisinin ortası. */
    focus(out = {}) {
      this.center(out);
      if (trailer) { out.x = (out.x + trailer.x) / 2; out.y = (out.y + trailer.y) / 2; }
      return out;
    },

    /** Şu an hedeflenen park yerleri (görevli bölümlerde geçerli görevin yeri). */
    currentTargets() {
      if (!tasks) return allTargets;
      const t = tasks[this.taskIndex];
      return t && t.type === 'park' ? [level.spots[t.spot]] : [];
    },

    evaluate(spot) { return evaluate(spot); },
    sensors() { return sensors(); },
    guides(len) { return guides(len); },

    /** Determinizm denetimi için durum özeti. */
    hash() {
      const r = (x) => Math.round(x * 1e6);
      const parts = [r(body.x), r(body.y), r(body.a), r(body.vx), r(body.vy), r(body.w), this.moves, Math.round(this.damage * 1000)];
      if (trailer) parts.push(r(trailer.x), r(trailer.y), r(trailer.a));
      for (const c of cones) parts.push(r(c.x) + r(c.y));
      return parts.join(',');
    },
  };
  const cpos = { x: 0, y: 0 };

  if (!opts.noAgents && ((level.traffic && level.traffic.length) || (level.peds && level.peds.length))) {
    game.agents = createAgents(game, level, rng((opts.seed ?? 7) + level.id.length * 131));
  }

  // ------------------------------------------------------------ temaslar → hasar

  const touch = new Map();      // anahtar → son temas adımı
  function emit(e) { game.events.push(e); }

  function addDamage(v) {
    if (game.status !== 'play') return;
    game.damage = Math.min(100, game.damage + v);
    if (game.damage >= 100) fail('damage');
  }

  function processContacts() {
    const now = game.steps;
    let scrape = 0;
    const ex = level.exam;
    for (const m of world.contacts) {
      const aP = m.a === body || m.a === trailer, bP = m.b === body || m.b === trailer;
      if (!aP && !bP) continue;
      if (aP && bP) continue;
      const cs = aP ? m.sa : m.sb, other = aP ? m.sb : m.sa;
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

      if (other.kind === 'ped') {
        emit({ type: 'hit', kmh: approach * 3.6, x: px, y: py, kind: 'ped' });
        fail('pedestrian');
        continue;
      }
      if (other.kind === 'cone') {
        const cone = other.body;
        if (!cone.data.hit) {
          cone.data.hit = true;
          game.conesHit++;
          addDamage(DAMAGE.cone);
          emit({ type: 'cone', x: px, y: py, kmh: approach * 3.6 });
          if (ex && ex.noCone) fail('exam-cone');
        }
        if (approach > 0.9) cone.data.knocked = true;
        continue;
      }
      if (cs.kind === 'wheel') {
        if (isNew && approach > 0.12) {
          const kmh = approach * 3.6;
          if (other.kind === 'curb') { game.curbTouches++; if (ex) game.faults++; }
          emit({ type: other.kind === 'stopper' ? 'stopper' : 'curb', kmh, x: px, y: py });
          if (kmh > DAMAGE.curbKmh) addDamage((kmh - DAMAGE.curbKmh) * DAMAGE.curbPerKmh + 2);
        }
        continue;
      }
      if (other.kind === 'agent' && isNew) game.agents?.bump(other.body);
      // gövde: çarpma ya da sürtme
      if (isNew) {
        const kmh = approach * 3.6;
        const dmg = kmh < 1 ? DAMAGE.touch : Math.max(DAMAGE.min, kmh * DAMAGE.perKmh);
        game.hits++;
        emit({ type: 'hit', kmh, x: px, y: py, kind: other.kind });
        addDamage(dmg);
        if (ex && ex.noHit) fail('exam-hit');
      } else if (slide > 0.12) {
        scrape = Math.max(scrape, slide);
        addDamage(DAMAGE.scrapePerMeter * slide * DT);
      }
    }
    game.scraping = scrape;
    if (now % 240 === 0) for (const [k, v] of touch) if (now - v > 240) touch.delete(k);
    for (const c of cones) {
      if (!c.data.hit && Math.hypot(c.x - c.data.hx, c.y - c.data.hy) > 0.25) {
        c.data.hit = true; game.conesHit++; addDamage(DAMAGE.cone);
        emit({ type: 'cone', x: c.x, y: c.y, kmh: 0 });
        if (ex && ex.noCone) fail('exam-cone');
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

  // ------------------------------------------------------------ görevler (sınav parkuru)

  function segCross(ax, ay, bx, by, cx, cy, dx, dy) {
    const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }

  function completeTask() {
    const t = tasks[game.taskIndex];
    t.done = true;
    game.taskIndex++;
    emit({ type: 'task', index: game.taskIndex - 1, task: t, last: game.taskIndex >= tasks.length });
    if (game.taskIndex >= tasks.length) finish(game.lastParkEval || { quality: 100, angDeg: 0, latCm: 0, lonCm: 0, inside: true });
  }

  function trackTasks(px, py, cx, cy) {
    const t = tasks[game.taskIndex];
    if (!t) return;
    if (t.type === 'gates') {
      const gt = t.gates[t.gate];
      if (gt && segCross(px, py, cx, cy, gt[0][0], gt[0][1], gt[1][0], gt[1][1])) {
        t.gate++;
        emit({ type: 'gate', index: t.gate, total: t.gates.length });
        if (t.gate >= t.gates.length) completeTask();
      }
    } else if (t.type === 'reach') {
      const [x0, y0, x1, y1] = t.rect;
      if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1 && Math.abs(car.vLong) < 1) completeTask();
    }
  }

  // ------------------------------------------------------------ park değerlendirmesi

  function evaluate(spot) {
    const sb = game.subject(spot);
    const ux = Math.cos(spot.a), uy = Math.sin(spot.a), px = -uy, py = ux;
    const sh = sb.shapes[0];
    let inside = true, worst = 0;
    for (let i = 0; i < sh.n; i++) {
      const dx = sh.wx[i] - spot.x, dy = sh.wy[i] - spot.y;
      const du = Math.abs(dx * ux + dy * uy) - spot.l / 2, dp = Math.abs(dx * px + dy * py) - spot.w / 2;
      const out = Math.max(du, dp);
      if (out > worst) worst = out;
      if (out > 0.005) inside = false;
    }
    let cxx, cyy;
    if (sb === trailer) { cxx = trailer.x; cyy = trailer.y; }
    else { const c = game.center(); cxx = c.x; cyy = c.y; }
    const diff = wrap(sb.a - spot.a);
    const facing = Math.abs(diff) <= Math.PI / 2 ? 'nose' : 'tail';
    const angErr = facing === 'nose' ? Math.abs(diff) : Math.PI - Math.abs(diff);
    const facingOk = spot.facing === 'any' || spot.facing === facing;
    const lat = (cxx - spot.x) * px + (cyy - spot.y) * py - (spot.idealLat || 0);
    const lon = (cxx - spot.x) * ux + (cyy - spot.y) * uy - (spot.idealLong || 0);
    const angDeg = (angErr * 180) / Math.PI;
    const aS = Math.exp(-((angDeg / SCORE.angleScale) ** 2));
    const lS = Math.exp(-((lat / SCORE.latScale) ** 2));
    const gS = Math.exp(-((lon / SCORE.longScale) ** 2));
    const quality = Math.round(100 * (SCORE.wAngle * aS + SCORE.wLat * lS + SCORE.wLong * gS));
    return { inside, outBy: worst, facing, facingOk, angDeg, latCm: lat * 100, lonCm: lon * 100, quality, spot };
  }

  function nearestTarget() {
    const list = game.currentTargets();
    if (list.length <= 1) return list[0] || null;
    const c = game.center();
    let best = null, bd = Infinity;
    for (const s of list) { const d = Math.hypot(s.x - c.x, s.y - c.y); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  function updateLive() {
    const spot = nearestTarget();
    if (!spot) { game.live = null; return; }
    const sb = game.subject(spot);
    const cx = sb === body ? game.center().x : sb.x, cy = sb === body ? game.center().y : sb.y;
    if (Math.hypot(spot.x - cx, spot.y - cy) > Math.max(spot.l, 6)) { game.live = null; return; }
    const e = evaluate(spot);
    game.live = e.inside || e.outBy < 1.2 ? e : null;
  }

  function finish(e) {
    const par = level.par;
    const stars = level.exam
      ? [true, game.faults === 0 && game.damage === 0, game.faults === 0 && game.time <= (level.exam.parTime || 1e9)]
      : [true, game.damage === 0 && game.conesHit === 0, e.quality >= par.quality && game.moves <= par.moves];
    game.result = { ...e, time: game.time, moves: game.moves, damage: game.damage, hits: game.hits, curbTouches: game.curbTouches, conesHit: game.conesHit, faults: game.faults, stars, perfect: e.quality >= SCORE.perfect };
    game.status = 'done';
    game.agents?.freeze();
    emit({ type: 'done', result: game.result });
  }

  function tryPark() {
    const spot = nearestTarget();
    const e = spot ? evaluate(spot) : null;
    game.lastParkEval = e;
    if (!e || !e.inside) { emit({ type: 'parkOutside', eval: e }); return; }
    if (!e.facingOk) { emit({ type: 'parkWrongWay', eval: e }); return; }
    if (level.free) { emit({ type: 'parkFree', eval: e }); return; }
    if (tasks) {
      const t = tasks[game.taskIndex];
      if (t && t.type === 'park') {
        if (level.exam && e.quality < (level.exam.minQuality || 0)) { game.faults++; emit({ type: 'examFault', reason: 'quality', eval: e }); }
        emit({ type: 'parkTask', eval: e });
        completeTask();
      }
      return;
    }
    finish(e);
  }

  function fail(reason) {
    if (game.status !== 'play') return;
    game.status = 'fail';
    game.failReason = reason;
    game.agents?.freeze();
    emit({ type: 'fail', reason });
  }

  // ------------------------------------------------------------ park sensörleri (ışınlar)

  const layout = sensorLayout(g.length / 2, g.hw);
  const sensorOut = { rear: [Infinity, Infinity, Infinity, Infinity], front: [Infinity, Infinity, Infinity, Infinity], minRear: Infinity, minFront: Infinity, towing: !!trailer };

  function sensors() {
    const c = game.center();
    const cos = Math.cos(body.a), sin = Math.sin(body.a);
    const R = g.length / 2 + 2;
    const cands = world.queryShapes(c.x - R, c.y - R, c.x + R, c.y + R, LAYER.BODY).filter((sh) => sh.body !== body && sh.body !== trailer);
    const r = sensorOut;
    for (const side of ['rear', 'front']) {
      const arr = r[side];
      for (let z = 0; z < 4; z++) {
        const zone = layout[side][z];
        let best = Infinity;
        if (!(trailer && side === 'rear')) {        // römork takılıyken arka sensör kapalı (gerçekte de)
          for (const ray of zone.rays) {
            const ox = c.x + ray.ox * cos - ray.oy * sin, oy = c.y + ray.ox * sin + ray.oy * cos;
            const dx = ray.dx * cos - ray.dy * sin, dy = ray.dx * sin + ray.dy * cos;
            const d = world.raycast(ox, oy, dx, dy, zone.range, cands);
            if (d < zone.range && d < best) best = d;
          }
        }
        arr[z] = best;
      }
    }
    r.minRear = Math.min(...r.rear);
    r.minFront = Math.min(...r.front);
    return r;
  }

  // ------------------------------------------------------------ yörünge çizgileri

  /** Mevcut direksiyon açısıyla gidilecek yol: köşe izleri (dünya); römork varsa römorkun arka köşeleri. */
  function guides(len = 4.5) {
    const dir = car.gearDir;
    if (!dir) return null;
    const L = spec.wheelbase, dc = car.steerAngle, b = g.b;
    const cos = Math.cos(body.a), sin = Math.sin(body.a);
    // arka dingil merkezi
    let rx = body.x - cos * b, ry = body.y - sin * b, th = body.a;
    const N = 24;
    const ds = (dir * len) / N;
    const out = { dir, left: [], right: [], trailer: null };
    const tanD = Math.tan(dc);
    let phi = trailer ? trailer.a : 0;
    const t = spec.trailer, tg = t ? trailerGeom(t) : null;
    const hOff = t ? spec.overhangR + t.hitchBehind : 0;
    if (trailer) out.trailer = { left: [], right: [] };
    const pushCorners = () => {
      if (!trailer || dir > 0) {
        const xEnd = dir < 0 ? g.xr + b : g.xf + b;     // arka dingile göre
        const c2 = Math.cos(th), s2 = Math.sin(th);
        out.left.push(rx + xEnd * c2 + g.hw * s2, ry + xEnd * s2 - g.hw * c2);
        out.right.push(rx + xEnd * c2 - g.hw * s2, ry + xEnd * s2 + g.hw * c2);
      }
      if (trailer) {
        const c2 = Math.cos(th), s2 = Math.sin(th);
        const hx = rx - c2 * hOff, hy = ry - s2 * hOff;
        const cp = Math.cos(phi), spn = Math.sin(phi);
        const back = tg.xHitch + tg.hl;                 // çeki noktasından kasa arkasına
        const tx = hx - cp * back, ty = hy - spn * back;
        out.trailer.left.push(tx + tg.hw * spn, ty - tg.hw * cp);
        out.trailer.right.push(tx - tg.hw * spn, ty + tg.hw * cp);
      }
    };
    pushCorners();
    for (let i = 0; i < N; i++) {
      const sub = 4;
      for (let k = 0; k < sub; k++) {
        const d = ds / sub;
        const w = (d * tanD) / L;
        if (trailer) {
          // çeki noktası hızı → römork yön değişimi (kinematik model)
          const c2 = Math.cos(th), s2 = Math.sin(th);
          const vhx = d * c2 + hOff * w * s2, vhy = d * s2 - hOff * w * c2;   // çeki noktası = arka dingil − h·ileri
          const nx = -Math.sin(phi), ny = Math.cos(phi);
          phi += (vhx * nx + vhy * ny) / t.axleFromHitch;
        }
        rx += Math.cos(th) * d; ry += Math.sin(th) * d; th += w;
      }
      pushCorners();
    }
    return out;
  }

  updateLive();
  return game;
}
