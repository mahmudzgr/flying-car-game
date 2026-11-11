// Milimetrik Park — park yolu planlayıcı (Hybrid A*, kinematik araç modeli).
// Bölüm doğrulaması için: hedefe en az hamleyle (yön değişimi) çarpmadan giden bir manevra arar.
// Çıktı: [{dir: 1|-1, steer: -1..1, len: metre}] — arka dingil merkezinin yol uzunluğu.
// DOM kullanmaz.
import { createGame } from './game.js';
import { createCarBody } from './vehicle.js';
import { collideShapes, LAYER } from './physics.js';

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
 * @param {{margin?:number, maxMoves?:number, minQuality?:number, maxExpand?:number, spot?:object, step?:number}} o
 */
export function planPark(level, o = {}) {
  const game = createGame(level);
  const spec = game.spec, geom = game.car.geom, L = spec.wheelbase, b = geom.b;
  const margin = o.margin ?? 0.08;
  const probeSpec = { ...spec, width: spec.width + margin * 2, overhangF: spec.overhangF + margin, overhangR: spec.overhangR + margin };
  const probe = createCarBody(probeSpec, 0, 0, 0);
  // statik şekiller + koniler (başlangıç yerlerinde)
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
  const spot = o.spot || game.targets[0];
  const minQ = o.minQuality ?? level.par.quality;
  const maxMoves = o.maxMoves ?? 8;

  function setPose(rx, ry, th) {
    probe.x = rx + Math.cos(th) * b; probe.y = ry + Math.sin(th) * b; probe.a = th;
    probe.updateGeom();
  }
  function collides(rx, ry, th) {
    setPose(rx, ry, th);
    stamp++;
    for (let gx = Math.floor(probe.minx / CELL); gx <= Math.floor(probe.maxx / CELL); gx++) {
      for (let gy = Math.floor(probe.miny / CELL); gy <= Math.floor(probe.maxy / CELL); gy++) {
        const arr = grid.get(gx * 10007 + gy);
        if (!arr) continue;
        for (const sh of arr) {
          if (seen.get(sh) === stamp) continue;
          seen.set(sh, stamp);
          if (sh.maxx < probe.minx || sh.minx > probe.maxx || sh.maxy < probe.miny || sh.miny > probe.maxy) continue;
          for (const ps of probe.shapes) {
            if (!(ps.layer & sh.mask) || !(sh.layer & ps.mask)) continue;
            if (ps.maxx < sh.minx || ps.minx > sh.maxx || ps.maxy < sh.miny || ps.miny > sh.maxy) continue;
            if (collideShapes(ps, sh)) return true;
          }
        }
      }
    }
    return false;
  }
  // değerlendirme: gerçek oyunun evaluate'i (aracı poza koyarak)
  const gb = game.body;
  function quality(rx, ry, th) {
    gb.x = rx + Math.cos(th) * b; gb.y = ry + Math.sin(th) * b; gb.a = th;
    gb.updateGeom();
    return game.evaluate(spot);
  }

  const st = level.start;
  // geometrik merkez → arka dingil: merkez = CG + gcx·ileri; CG = arka + b·ileri
  const rx0 = st.x - Math.cos(st.a) * (geom.gcx + b), ry0 = st.y - Math.sin(st.a) * (geom.gcx + b);
  const fa = spot.facing === 'tail' ? spot.a + Math.PI : spot.a;
  const gcx = spot.x + Math.cos(spot.a) * (spot.idealLong || 0) + -Math.sin(spot.a) * (spot.idealLat || 0);
  const gcy = spot.y + Math.sin(spot.a) * (spot.idealLong || 0) + Math.cos(spot.a) * (spot.idealLat || 0);
  const goalRx = gcx - Math.cos(fa) * (geom.gcx + b), goalRy = gcy - Math.sin(fa) * (geom.gcx + b);

  const steers = o.steers || [-1, -0.55, -0.2, 0, 0.2, 0.55, 1];
  const STEP = o.step ?? 0.6, SUB = 3;
  const SWITCH = o.switchCost ?? 7;
  const W = o.weight ?? 1.6;
  const XY = 0.25, TH = (4 * Math.PI) / 180;
  const h = (rx, ry, th) => {
    const d = Math.hypot(goalRx - rx, goalRy - ry);
    return d + 2.2 * Math.abs(wrap(fa - th));
  };
  const keyOf = (n) => `${Math.round(n.rx / XY)},${Math.round(n.ry / XY)},${Math.round(wrap(n.th) / TH)},${n.dir},${n.moves}`;
  const best = new Map();
  const open = new Heap();
  const root = { rx: rx0, ry: ry0, th: st.a, dir: 0, s: 0, g: 0, moves: 0, parent: null, f: 0 };
  root.f = W * h(root.rx, root.ry, root.th);
  open.push(root);
  const maxExpand = o.maxExpand ?? 120000;
  let expanded = 0, found = null;
  const L2 = L;

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
        let rx = n.rx, ry = n.ry, th = n.th, ok = true, goal = null;
        const R = s === 0 ? Infinity : L2 / Math.tan(s * spec.maxSteer);
        for (let i = 1; i <= SUB; i++) {
          const ds = (STEP / SUB) * dir;
          if (R === Infinity) { rx += Math.cos(th) * ds; ry += Math.sin(th) * ds; }
          else {
            const th2 = th + ds / R;
            rx += R * (Math.sin(th2) - Math.sin(th)); ry += -R * (Math.cos(th2) - Math.cos(th));
            th = th2;
          }
          if (collides(rx, ry, th)) { ok = false; break; }
          if (Math.hypot(rx - goalRx, ry - goalRy) < 1.2) {
            const e = quality(rx, ry, th);
            if (e.inside && e.facingOk && e.quality >= minQ) { goal = { e, frac: i / SUB }; break; }
          }
        }
        if (!ok) continue;
        const len = goal ? STEP * goal.frac : STEP;
        const g = n.g + len * (dir < 0 ? 1.1 : 1) + (sw ? SWITCH : 0) + (s !== n.s ? 0.08 * Math.abs(s - n.s) : 0);
        const child = { rx, ry, th, dir, s, g, moves, parent: n, len, f: 0 };
        if (goal) { found = { node: child, eval: goal.e }; break; }
        const ck = keyOf(child);
        if ((best.get(ck) ?? Infinity) <= g) continue;
        best.set(ck, g);
        child.f = g + W * h(rx, ry, th);
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
