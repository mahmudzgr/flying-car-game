// Milimetrik Park — park yolu planlayıcı (Hybrid A*, kinematik araç modeli; römorklu araçta çekici+römork).
// Bölüm doğrulaması için: hedefe en az hamleyle (yön değişimi) çarpmadan giden bir manevra arar.
// Çıktı: [{dir: 1|-1, steer: -1..1, len: metre}] — arka dingil merkezinin yol uzunluğu.
// DOM kullanmaz.
import { createGame } from './game.js';
import { createRig, trailerGeom } from './vehicle.js';
import { collideShapes } from './physics.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; }
    a[i] = n;
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i, mf = last.f;
        if (l < a.length && a[l].f < mf) { m = l; mf = a[l].f; }
        if (r < a.length && a[r].f < mf) { m = r; }
        if (m === i) break;
        a[i] = a[m]; i = m;
      }
      a[i] = last;
    }
    return top;
  }
}

/**
 * @param {object} level
 * @param {{margin?:number, maxMoves?:number, minQuality?:number, maxExpand?:number, spot?:object, step?:number, start?:object, extraSolids?:object[], vehicle?:string}} o
 */
export function planPark(level, o = {}) {
  const game = createGame(level, { noAgents: true, extraSolids: o.extraSolids, start: o.start, vehicle: o.vehicle });
  const spec = game.spec, geom = game.car.geom, L = spec.wheelbase, b = geom.b;
  const margin = o.margin ?? 0.08;
  const tspec = spec.trailer;
  const probeSpec = {
    ...spec, width: spec.width + margin * 2, overhangF: spec.overhangF + margin, overhangR: spec.overhangR + margin,
    trailer: tspec ? { ...tspec, width: tspec.width + margin * 2, boxLength: tspec.boxLength + margin * 2, drawbar: tspec.drawbar - margin, hitchBehind: tspec.hitchBehind } : null,
  };
  const probeRig = createRig(probeSpec, 0, 0, 0);
  const probe = probeRig.body, probeT = probeRig.trailer;
  const tg = tspec ? trailerGeom(probeSpec.trailer) : null;
  const hOff = tspec ? spec.overhangR + tspec.hitchBehind : 0;
  const limit = tspec ? ((tspec.limitDeg - 8) * Math.PI) / 180 : 0;

  const statics = [...game.world.ground.shapes, ...game.cones.map((c) => c.shapes[0])];
  const CELL = 2;
  const grid = new Map();
  for (const sh of statics) {
    for (let gx = Math.floor(sh.minx / CELL); gx <= Math.floor(sh.maxx / CELL); gx++) {
      for (let gy = Math.floor(sh.miny / CELL); gy <= Math.floor(sh.maxy / CELL); gy++) {
        const k = gx * 10007 + gy;
        let arr = grid.get(k); if (!arr) grid.set(k, (arr = []));
        arr.push(sh);
      }
    }
  }
  let stamp = 1;
  const seen = new Map();
  const spot = o.spot || game.targets[0] || game.currentTargets()[0];
  const minQ = o.minQuality ?? level.par.quality;
  const maxMoves = o.maxMoves ?? 8;
  const trailerSubject = spot.subject === 'trailer' && !!tspec;

  function poseTrailer(B, rx, ry, th, phi) {
    const hx = rx - Math.cos(th) * hOff, hy = ry - Math.sin(th) * hOff;
    B.x = hx - Math.cos(phi) * tg.xHitch; B.y = hy - Math.sin(phi) * tg.xHitch; B.a = phi;
    B.updateGeom();
  }
  function hitBody(B) {
    stamp++;
    for (let gx = Math.floor(B.minx / CELL); gx <= Math.floor(B.maxx / CELL); gx++) {
      for (let gy = Math.floor(B.miny / CELL); gy <= Math.floor(B.maxy / CELL); gy++) {
        const arr = grid.get(gx * 10007 + gy);
        if (!arr) continue;
        for (const sh of arr) {
          if (seen.get(sh) === stamp) continue;
          seen.set(sh, stamp);
          if (sh.maxx < B.minx || sh.minx > B.maxx || sh.maxy < B.miny || sh.miny > B.maxy) continue;
          for (const ps of B.shapes) {
            if (!(ps.layer & sh.mask) || !(sh.layer & ps.mask)) continue;
            if (ps.maxx < sh.minx || ps.minx > sh.maxx || ps.maxy < sh.miny || ps.miny > sh.maxy) continue;
            if (collideShapes(ps, sh)) return true;
          }
        }
      }
    }
    return false;
  }
  function collides(rx, ry, th, phi) {
    probe.x = rx + Math.cos(th) * b; probe.y = ry + Math.sin(th) * b; probe.a = th;
    probe.updateGeom();
    if (hitBody(probe)) return true;
    if (probeT) { poseTrailer(probeT, rx, ry, th, phi); if (hitBody(probeT)) return true; }
    return false;
  }
  // değerlendirme: gerçek oyunun evaluate'i (aracı ve römorku poza koyarak)
  const gb = game.body;
  function quality(rx, ry, th, phi) {
    gb.x = rx + Math.cos(th) * b; gb.y = ry + Math.sin(th) * b; gb.a = th;
    gb.updateGeom();
    if (game.trailer) poseTrailer(game.trailer, rx, ry, th, phi);
    return game.evaluate(spot);
  }

  const st = o.start || level.start;
  // geometrik merkez → arka dingil: merkez = CG + gcx·ileri; CG = arka + b·ileri
  const rx0 = st.x - Math.cos(st.a) * (geom.gcx + b), ry0 = st.y - Math.sin(st.a) * (geom.gcx + b);
  const fa = spot.facing === 'tail' ? spot.a + Math.PI : spot.a;
  const gcx = spot.x + Math.cos(spot.a) * (spot.idealLong || 0) - Math.sin(spot.a) * (spot.idealLat || 0);
  const gcy = spot.y + Math.sin(spot.a) * (spot.idealLong || 0) + Math.cos(spot.a) * (spot.idealLat || 0);
  // hedef: araç için arka dingil, römork için römork merkezi
  const goalX = trailerSubject ? gcx : gcx - Math.cos(fa) * (geom.gcx + b);
  const goalY = trailerSubject ? gcy : gcy - Math.sin(fa) * (geom.gcx + b);

  const steers = o.steers || [-1, -0.55, -0.2, 0, 0.2, 0.55, 1];
  const STEP = o.step ?? 0.6, SUB = 3;
  const SWITCH = o.switchCost ?? 7;
  const W = o.weight ?? 1.6;
  const XY = 0.25, TH = (4 * Math.PI) / 180, PH = (6 * Math.PI) / 180;
  const subjXY = (n) => {
    if (!trailerSubject) return [n.rx, n.ry];
    const hx = n.rx - Math.cos(n.th) * hOff, hy = n.ry - Math.sin(n.th) * hOff;
    return [hx - Math.cos(n.phi) * tg.xHitch, hy - Math.sin(n.phi) * tg.xHitch];
  };
  const h = (n) => {
    const [x, y] = subjXY(n);
    const d = Math.hypot(goalX - x, goalY - y);
    return d + 2.2 * Math.abs(wrap(fa - (trailerSubject ? n.phi : n.th)));
  };
  const keyOf = (n) => `${Math.round(n.rx / XY)},${Math.round(n.ry / XY)},${Math.round(wrap(n.th) / TH)},${tspec ? Math.round(wrap(n.th - n.phi) / PH) : 0},${n.dir},${n.moves}`;
  const best = new Map();
  const open = new Heap();
  // yeniden planlama: o.start.phi (römork açısı), o.dir0/o.moves0 (aynı yönde devam etmek hamle saymaz)
  const root = { rx: rx0, ry: ry0, th: st.a, phi: st.phi ?? st.a, dir: o.dir0 || 0, s: o.steer0 ?? 0, g: 0, moves: o.moves0 || 0, parent: null, f: 0 };
  root.f = W * h(root);
  open.push(root);
  const maxExpand = o.maxExpand ?? 120000;
  let expanded = 0, found = null;
  const D = tspec ? tspec.axleFromHitch : 1;

  while (open.size && expanded < maxExpand) {
    const n = open.pop();
    const k = keyOf(n);
    if ((best.get(k) ?? Infinity) < n.g - 1e-9) continue;
    expanded++;
    for (const dir of [1, -1]) {
      const sw = n.dir !== 0 && dir !== n.dir;
      const moves = n.moves + (n.dir === dir ? 0 : 1);
      if (moves > maxMoves) continue;
      for (const s of steers) {
        let rx = n.rx, ry = n.ry, th = n.th, phi = n.phi, ok = true, goal = null;
        const tanD = Math.tan(s * spec.maxSteer);
        const kappa = tanD / L;
        for (let i = 1; i <= SUB; i++) {
          const sub = tspec ? 4 : 1;
          for (let q = 0; q < sub; q++) {
            const ds = ((STEP / SUB) * dir) / sub;
            const w = ds * kappa;
            if (tspec) {
              // römork açısı: adım ortasındaki çekici yönüyle (orta nokta)
              const tm = th + w / 2, c2 = Math.cos(tm), s2 = Math.sin(tm);
              const vhx = ds * c2 + hOff * w * s2, vhy = ds * s2 - hOff * w * c2;
              const pm = phi + ((vhx * -Math.sin(phi) + vhy * Math.cos(phi)) / D) / 2;
              phi += (vhx * -Math.sin(pm) + vhy * Math.cos(pm)) / D;
            }
            // tam yay (Euler değil): uzun dönüşlerde birikimli sapma olmasın
            if (Math.abs(w) < 1e-9) { rx += Math.cos(th) * ds; ry += Math.sin(th) * ds; }
            else { const R = 1 / kappa, t2 = th + w; rx += R * (Math.sin(t2) - Math.sin(th)); ry -= R * (Math.cos(t2) - Math.cos(th)); th = t2; continue; }
          }
          if (tspec && Math.abs(wrap(th - phi)) > limit) { ok = false; break; }
          if (collides(rx, ry, th, phi)) { ok = false; break; }
          const [sx, sy] = subjXY({ rx, ry, th, phi });
          if (Math.hypot(sx - goalX, sy - goalY) < 1.4) {
            const e = quality(rx, ry, th, phi);
            if (e.inside && e.facingOk && e.quality >= minQ) { goal = { e, frac: i / SUB }; break; }
          }
        }
        if (!ok) continue;
        const len = goal ? STEP * goal.frac : STEP;
        const g = n.g + len * (dir < 0 ? 1.1 : 1) + (sw ? SWITCH : 0) + (s !== n.s ? 0.08 * Math.abs(s - n.s) : 0);
        const child = { rx, ry, th, phi, dir, s, g, moves, parent: n, len, f: 0 };
        if (goal) { found = { node: child, eval: goal.e }; break; }
        const ck = keyOf(child);
        if ((best.get(ck) ?? Infinity) <= g) continue;
        best.set(ck, g);
        child.f = g + W * h(child);
        open.push(child);
      }
      if (found) break;
    }
    if (found) break;
  }
  if (!found) return { ok: false, expanded };
  const prims = [];
  for (let n = found.node; n.parent; n = n.parent) prims.push({ dir: n.dir, steer: n.s, len: n.len });
  prims.reverse();
  const segments = [];
  for (const p of prims) {
    const last = segments[segments.length - 1];
    if (last && last.dir === p.dir && last.steer === p.steer) last.len += p.len;
    else segments.push({ ...p });
  }
  for (const sg of segments) sg.len = Math.round(sg.len * 1000) / 1000;
  return { ok: true, segments, moves: found.node.moves, quality: found.eval.quality, expanded };
}
