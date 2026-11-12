// Milimetrik Park — küçük 2B katı cisim fiziği.
// Yalnızca bu oyunun ihtiyacı: dışbükey çokgen ve daire şekilleri, statik/dinamik cisimler,
// sıralı darbe (sequential impulse) çözücü, sürtünme, sekme ve "split impulse" ile konum düzeltme.
// Araç lastikleri (vehicle.js) aynı çözücü döngüsüne "denetleyici" olarak katılır; böylece lastik
// tutuşu ile çarpışmalar birlikte çözülür.
//
// Koordinatlar: metre, x sağa, y AŞAĞI; açı radyan, saat yönünde pozitif (canvas ile aynı).
// DOM kullanmaz; Node'da da çalışır.

export const LAYER = { BODY: 1, WHEEL: 2, CURB: 4 };

const VEL_ITERS = 10;
const POS_ITERS = 4;
const SLOP = 0.004;          // izin verilen iç içe geçme (m)
const BETA = 0.3;            // konum düzeltme oranı
const REST_SPEED = 0.6;      // bu yaklaşma hızının altında sekme yok (m/s)

let nextShapeId = 1;

function baseShape(type, opt) {
  return {
    id: nextShapeId++,
    type,
    layer: opt.layer ?? LAYER.BODY,
    mask: opt.mask ?? LAYER.BODY,
    mu: opt.mu ?? 0.4,
    e: opt.e ?? 0.1,
    kind: opt.kind || 'solid',
    data: opt.data || null,
    group: opt.group || 0,          // aynı (sıfır olmayan) gruptaki şekiller çarpışmaz (çekici + römork)
    body: null,
    minx: 0, miny: 0, maxx: 0, maxy: 0,
  };
}

/** Dışbükey çokgen. verts: [[x,y], ...] cismin yerel koordinatında (sıra fark etmez). */
export function polyShape(verts, opt = {}) {
  const v = verts.map((p) => [p[0], p[1]]);
  let area = 0;
  for (let i = 0; i < v.length; i++) {
    const p = v[i], q = v[(i + 1) % v.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  if (area < 0) v.reverse();
  const n = v.length;
  const s = baseShape('poly', opt);
  s.n = n;
  s.lx = new Float64Array(n); s.ly = new Float64Array(n);
  s.lnx = new Float64Array(n); s.lny = new Float64Array(n);
  s.wx = new Float64Array(n); s.wy = new Float64Array(n);
  s.wnx = new Float64Array(n); s.wny = new Float64Array(n);
  for (let i = 0; i < n; i++) { s.lx[i] = v[i][0]; s.ly[i] = v[i][1]; }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ex = s.lx[j] - s.lx[i], ey = s.ly[j] - s.ly[i];
    const len = Math.hypot(ex, ey) || 1;
    s.lnx[i] = ey / len; s.lny[i] = -ex / len;
  }
  return s;
}

/** Merkezi (ox, oy) olan daire (yerel koordinat). */
export function circleShape(r, ox = 0, oy = 0, opt = {}) {
  const s = baseShape('circle', opt);
  s.r = r; s.ox = ox; s.oy = oy; s.cx = 0; s.cy = 0;
  return s;
}

/** Merkezi (cx, cy), yarı boyları (hx, hy), açısı a olan dikdörtgenin köşeleri. */
export function boxVerts(cx, cy, hx, hy, a = 0) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

/** Köşeleri pahlı dikdörtgen (araç gövdesi): x ileri. */
export function chamferBoxVerts(x0, x1, hy, chF, chR) {
  return [
    [x1, -hy + chF], [x1, hy - chF], [x1 - chF, hy], [x0 + chR, hy],
    [x0, hy - chR], [x0, -hy + chR], [x0 + chR, -hy], [x1 - chF, -hy],
  ];
}

export class Body {
  constructor(o = {}) {
    this.x = o.x || 0; this.y = o.y || 0; this.a = o.a || 0;
    this.vx = 0; this.vy = 0; this.w = 0;
    this.pvx = 0; this.pvy = 0; this.pw = 0;
    this.mass = o.mass || 0;
    this.inertia = o.inertia || 0;
    // 'static' | 'dynamic' | 'kinematic' (kinematik: hızı dışarıdan verilir, sonsuz kütleli gibi davranır)
    this.type = o.kinematic ? 'kinematic' : this.mass ? 'dynamic' : 'static';
    this.invM = this.type === 'dynamic' ? 1 / this.mass : 0;
    this.invI = this.type === 'dynamic' && this.inertia ? 1 / this.inertia : 0;
    this.isStatic = this.type === 'static';
    this.linFric = o.linFric || 0;   // yer sürtünmesi (m/s²) — koni gibi serbest nesneler
    this.angFric = o.angFric || 0;   // (rad/s²)
    this.kind = o.kind || 'body';
    this.data = o.data || null;
    this.shapes = [];
    this.c = 1; this.s = 0;
    this.minx = 0; this.miny = 0; this.maxx = 0; this.maxy = 0;
    this.prevX = this.x; this.prevY = this.y; this.prevA = this.a;
    this.awake = true;
  }

  add(shape) { shape.body = this; this.shapes.push(shape); return shape; }

  updateGeom() {
    const c = Math.cos(this.a), s = Math.sin(this.a);
    this.c = c; this.s = s;
    let bminx = Infinity, bminy = Infinity, bmaxx = -Infinity, bmaxy = -Infinity;
    for (const sh of this.shapes) {
      if (sh.type === 'poly') {
        let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
        for (let i = 0; i < sh.n; i++) {
          const x = this.x + sh.lx[i] * c - sh.ly[i] * s;
          const y = this.y + sh.lx[i] * s + sh.ly[i] * c;
          sh.wx[i] = x; sh.wy[i] = y;
          sh.wnx[i] = sh.lnx[i] * c - sh.lny[i] * s;
          sh.wny[i] = sh.lnx[i] * s + sh.lny[i] * c;
          if (x < minx) minx = x; if (x > maxx) maxx = x;
          if (y < miny) miny = y; if (y > maxy) maxy = y;
        }
        sh.minx = minx; sh.miny = miny; sh.maxx = maxx; sh.maxy = maxy;
      } else {
        sh.cx = this.x + sh.ox * c - sh.oy * s;
        sh.cy = this.y + sh.ox * s + sh.oy * c;
        sh.minx = sh.cx - sh.r; sh.maxx = sh.cx + sh.r;
        sh.miny = sh.cy - sh.r; sh.maxy = sh.cy + sh.r;
      }
      if (sh.minx < bminx) bminx = sh.minx; if (sh.maxx > bmaxx) bmaxx = sh.maxx;
      if (sh.miny < bminy) bminy = sh.miny; if (sh.maxy > bmaxy) bmaxy = sh.maxy;
    }
    this.minx = bminx; this.miny = bminy; this.maxx = bmaxx; this.maxy = bmaxy;
  }

  /** Dünya noktası (px, py)'ye dünya darbesi (jx, jy). */
  impulse(jx, jy, px, py) {
    this.vx += jx * this.invM; this.vy += jy * this.invM;
    this.w += this.invI * ((px - this.x) * jy - (py - this.y) * jx);
  }

  /** Dünya noktasının hızı. */
  pointVel(px, py, out) {
    out.x = this.vx - this.w * (py - this.y);
    out.y = this.vy + this.w * (px - this.x);
    return out;
  }

  savePrev() { this.prevX = this.x; this.prevY = this.y; this.prevA = this.a; }
}

// ---------------------------------------------------------------- çarpışma tespiti

const SEP = { v: 0, i: 0 };

function maxSeparation(A, B) {
  let best = -Infinity, bi = 0;
  for (let i = 0; i < A.n; i++) {
    const nx = A.wnx[i], ny = A.wny[i], vx = A.wx[i], vy = A.wy[i];
    let mn = Infinity;
    for (let j = 0; j < B.n; j++) {
      const d = nx * (B.wx[j] - vx) + ny * (B.wy[j] - vy);
      if (d < mn) mn = d;
    }
    if (mn > best) { best = mn; bi = i; }
  }
  SEP.v = best; SEP.i = bi;
}

function polyPoly(A, B) {
  maxSeparation(A, B);
  const sepA = SEP.v, ea = SEP.i;
  if (sepA > 0) return null;
  maxSeparation(B, A);
  const sepB = SEP.v, eb = SEP.i;
  if (sepB > 0) return null;

  let R, I, e, flip;
  if (sepB > sepA + 0.001) { R = B; I = A; e = eb; flip = true; } else { R = A; I = B; e = ea; flip = false; }
  const nx = R.wnx[e], ny = R.wny[e];
  const e2 = (e + 1) % R.n;
  const v1x = R.wx[e], v1y = R.wy[e], v2x = R.wx[e2], v2y = R.wy[e2];

  let ie = 0, md = Infinity;
  for (let j = 0; j < I.n; j++) {
    const d = nx * I.wnx[j] + ny * I.wny[j];
    if (d < md) { md = d; ie = j; }
  }
  const ie2 = (ie + 1) % I.n;
  let ax = I.wx[ie], ay = I.wy[ie], bx = I.wx[ie2], by = I.wy[ie2];

  let tx = v2x - v1x, ty = v2y - v1y;
  const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;

  // yan düzlem 1: t·p >= t·v1
  const o1 = tx * v1x + ty * v1y;
  let da = tx * ax + ty * ay - o1, db = tx * bx + ty * by - o1;
  if (da < 0 && db < 0) return null;
  if (da < 0) { const k = da / (da - db); ax += (bx - ax) * k; ay += (by - ay) * k; }
  else if (db < 0) { const k = da / (da - db); bx = ax + (bx - ax) * k; by = ay + (by - ay) * k; }
  // yan düzlem 2: t·p <= t·v2
  const o2 = tx * v2x + ty * v2y;
  da = o2 - (tx * ax + ty * ay); db = o2 - (tx * bx + ty * by);
  if (da < 0 && db < 0) return null;
  if (da < 0) { const k = da / (da - db); ax += (bx - ax) * k; ay += (by - ay) * k; }
  else if (db < 0) { const k = da / (da - db); bx = ax + (bx - ax) * k; by = ay + (by - ay) * k; }

  const pts = [];
  const sa = nx * (ax - v1x) + ny * (ay - v1y);
  if (sa <= 0) pts.push({ x: ax - nx * sa * 0.5, y: ay - ny * sa * 0.5, depth: -sa });
  const sb = nx * (bx - v1x) + ny * (by - v1y);
  if (sb <= 0) pts.push({ x: bx - nx * sb * 0.5, y: by - ny * sb * 0.5, depth: -sb });
  if (!pts.length) return null;
  return { nx: flip ? -nx : nx, ny: flip ? -ny : ny, pts };
}

/** Çokgen P ile daire C; normal P'den C'ye (flip: C'den P'ye). */
function polyCircle(P, C, flip) {
  const cx = C.cx, cy = C.cy, r = C.r;
  let sep = -Infinity, ni = 0;
  for (let i = 0; i < P.n; i++) {
    const s = P.wnx[i] * (cx - P.wx[i]) + P.wny[i] * (cy - P.wy[i]);
    if (s > r) return null;
    if (s > sep) { sep = s; ni = i; }
  }
  const j = (ni + 1) % P.n;
  const v1x = P.wx[ni], v1y = P.wy[ni], v2x = P.wx[j], v2y = P.wy[j];
  let nx, ny, depth, px, py;
  if (sep < 1e-9) {
    nx = P.wnx[ni]; ny = P.wny[ni]; depth = r - sep;
    px = cx - nx * (r - depth * 0.5); py = cy - ny * (r - depth * 0.5);
  } else {
    const u1 = (cx - v1x) * (v2x - v1x) + (cy - v1y) * (v2y - v1y);
    const u2 = (cx - v2x) * (v1x - v2x) + (cy - v2y) * (v1y - v2y);
    if (u1 <= 0) {
      const dx = cx - v1x, dy = cy - v1y, d = Math.hypot(dx, dy);
      if (d > r || d < 1e-12) return null;
      nx = dx / d; ny = dy / d; depth = r - d; px = v1x; py = v1y;
    } else if (u2 <= 0) {
      const dx = cx - v2x, dy = cy - v2y, d = Math.hypot(dx, dy);
      if (d > r || d < 1e-12) return null;
      nx = dx / d; ny = dy / d; depth = r - d; px = v2x; py = v2y;
    } else {
      nx = P.wnx[ni]; ny = P.wny[ni]; depth = r - sep;
      px = cx - nx * (r - depth * 0.5); py = cy - ny * (r - depth * 0.5);
    }
  }
  if (flip) { nx = -nx; ny = -ny; }
  return { nx, ny, pts: [{ x: px, y: py, depth }] };
}

function circleCircle(A, B) {
  const dx = B.cx - A.cx, dy = B.cy - A.cy;
  const d = Math.hypot(dx, dy), rs = A.r + B.r;
  if (d > rs) return null;
  const nx = d > 1e-9 ? dx / d : 1, ny = d > 1e-9 ? dy / d : 0;
  const depth = rs - d;
  return { nx, ny, pts: [{ x: A.cx + nx * (A.r - depth * 0.5), y: A.cy + ny * (A.r - depth * 0.5), depth }] };
}

/** İki şekil arasındaki temas (normal A'dan B'ye) ya da null. */
export function collideShapes(sa, sb) {
  if (sa.type === 'poly') return sb.type === 'poly' ? polyPoly(sa, sb) : polyCircle(sa, sb, false);
  return sb.type === 'poly' ? polyCircle(sb, sa, true) : circleCircle(sa, sb);
}

const overlap = (a, b) => a.minx <= b.maxx && b.minx <= a.maxx && a.miny <= b.maxy && b.miny <= a.maxy;
const canHit = (a, b) => (a.layer & b.mask) !== 0 && (b.layer & a.mask) !== 0 && !(a.group && a.group === b.group);

// ---------------------------------------------------------------- dünya

export class World {
  constructor() {
    this.ground = new Body({ kind: 'ground' });   // tüm statik şekiller bu cisimde
    this.bodies = [];                             // dinamik cisimler
    this.controllers = [];                        // araçlar: preStep/prepare/solve/postStep
    this.joints = [];                             // römork bağlantısı vb.
    this.contacts = [];
    this.stepCount = 0;
  }

  addStatic(shape) { this.ground.add(shape); return shape; }
  addBody(b) { this.bodies.push(b); b.updateGeom(); return b; }
  removeBody(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); }
  finalizeStatics() { this.ground.updateGeom(); }

  step(dt) {
    const bodies = this.bodies;
    for (const b of bodies) {
      b.savePrev();
      if (b.type !== 'dynamic') continue;
      if (b.linFric) {
        const sp = Math.hypot(b.vx, b.vy), dv = b.linFric * dt;
        if (sp <= dv) { b.vx = 0; b.vy = 0; } else { const k = (sp - dv) / sp; b.vx *= k; b.vy *= k; }
      }
      if (b.angFric) {
        const dw = b.angFric * dt;
        b.w = Math.abs(b.w) <= dw ? 0 : b.w - Math.sign(b.w) * dw;
      }
    }
    for (const c of this.controllers) c.preStep(dt);
    for (const b of bodies) b.updateGeom();

    // --- temaslar
    const contacts = [];
    const g = this.ground;
    for (let i = 0; i < bodies.length; i++) {
      const A = bodies[i];
      const moving = A.type === 'dynamic' && (A.vx !== 0 || A.vy !== 0 || A.w !== 0 || !A.data?.sleepy);
      if (moving) {
        for (const sa of A.shapes) {
          for (const sb of g.shapes) {
            if (!canHit(sa, sb) || !overlap(sa, sb)) continue;
            const m = collideShapes(sa, sb);
            if (m) contacts.push(this._manifold(A, g, sa, sb, m));
          }
        }
      }
      for (let j = i + 1; j < bodies.length; j++) {
        const B = bodies[j];
        if (A.type !== 'dynamic' && B.type !== 'dynamic') continue;
        if (!overlap(A, B)) continue;
        for (const sa of A.shapes) {
          for (const sb of B.shapes) {
            if (!canHit(sa, sb) || !overlap(sa, sb)) continue;
            const m = collideShapes(sa, sb);
            if (m) contacts.push(this._manifold(A, B, sa, sb, m));
          }
        }
      }
    }
    this.contacts = contacts;

    for (const m of contacts) prepareContact(m, dt);
    for (const j of this.joints) j.prepare(dt);
    for (const c of this.controllers) c.prepare(dt);

    for (let it = 0; it < VEL_ITERS; it++) {
      for (const j of this.joints) j.solve();
      for (const m of contacts) solveContact(m);
      for (const c of this.controllers) c.solve(it);
    }
    for (let it = 0; it < POS_ITERS; it++) for (const m of contacts) solvePosition(m);

    for (const b of bodies) {
      if (b.type === 'static') continue;
      b.x += (b.vx + b.pvx) * dt;
      b.y += (b.vy + b.pvy) * dt;
      b.a += (b.w + b.pw) * dt;
      b.pvx = 0; b.pvy = 0; b.pw = 0;
    }
    for (const c of this.controllers) c.postStep(dt);
    this.stepCount++;
  }

  _manifold(A, B, sa, sb, m) {
    m.a = A; m.b = B; m.sa = sa; m.sb = sb;
    m.mu = Math.sqrt(sa.mu * sb.mu);
    m.e = Math.max(sa.e, sb.e);
    return m;
  }

  /**
   * Işın: (ox,oy) noktasından birim (dx,dy) yönünde en yakın engel uzaklığı (yoksa maxD).
   * shapes verilirse yalnızca onlara bakar (sensörler aynı adayları birçok ışında kullanır).
   */
  raycast(ox, oy, dx, dy, maxD, shapes, skipGroup = 0) {
    let best = maxD;
    const ex = ox + dx * maxD, ey = oy + dy * maxD;
    const minx = Math.min(ox, ex), maxx = Math.max(ox, ex), miny = Math.min(oy, ey), maxy = Math.max(oy, ey);
    for (const sh of shapes) {
      if (skipGroup && sh.group === skipGroup) continue;
      if (sh.maxx < minx || sh.minx > maxx || sh.maxy < miny || sh.miny > maxy) continue;
      if (sh.type === 'circle') {
        const ocx = ox - sh.cx, ocy = oy - sh.cy;
        const b = ocx * dx + ocy * dy, c = ocx * ocx + ocy * ocy - sh.r * sh.r;
        const disc = b * b - c;
        if (disc < 0) continue;
        let t = -b - Math.sqrt(disc);
        if (t < 0) t = c <= 0 ? 0 : -b + Math.sqrt(disc);
        if (t >= 0 && t < best) best = t;
      } else {
        for (let i = 0; i < sh.n; i++) {
          const j = (i + 1) % sh.n;
          const p1x = sh.wx[i], p1y = sh.wy[i], e1 = sh.wx[j] - p1x, e2 = sh.wy[j] - p1y;
          const den = dx * e2 - dy * e1;
          if (Math.abs(den) < 1e-12) continue;
          const qx = p1x - ox, qy = p1y - oy;
          const t = (qx * e2 - qy * e1) / den, u = (qx * dy - qy * dx) / den;
          if (t >= 0 && u >= 0 && u <= 1 && t < best) best = t;
        }
      }
    }
    return best;
  }

  /** Belirli bir noktadan geçen statik şekiller (hata ayıklama/yerleştirme denetimi). */
  queryShapes(minx, miny, maxx, maxy, mask = LAYER.BODY) {
    const out = [];
    const box = { minx, miny, maxx, maxy };
    for (const sh of this.ground.shapes) if ((sh.layer & mask) && overlap(sh, box)) out.push(sh);
    for (const b of this.bodies) for (const sh of b.shapes) if ((sh.layer & mask) && overlap(sh, box)) out.push(sh);
    return out;
  }
}

function prepareContact(m, dt) {
  const A = m.a, B = m.b, nx = m.nx, ny = m.ny, tx = -ny, ty = nx;
  for (const p of m.pts) {
    p.rax = p.x - A.x; p.ray = p.y - A.y;
    p.rbx = p.x - B.x; p.rby = p.y - B.y;
    const rnA = p.rax * ny - p.ray * nx, rnB = p.rbx * ny - p.rby * nx;
    p.mn = 1 / (A.invM + B.invM + A.invI * rnA * rnA + B.invI * rnB * rnB);
    const rtA = p.rax * ty - p.ray * tx, rtB = p.rbx * ty - p.rby * tx;
    p.mt = 1 / (A.invM + B.invM + A.invI * rtA * rtA + B.invI * rtB * rtB);
    const dvx = (B.vx - B.w * p.rby) - (A.vx - A.w * p.ray);
    const dvy = (B.vy + B.w * p.rbx) - (A.vy + A.w * p.rax);
    const vn = dvx * nx + dvy * ny;
    p.vn0 = vn;
    p.vt0 = dvx * tx + dvy * ty;
    p.bias = vn < -REST_SPEED ? -m.e * vn : 0;
    p.pbias = (BETA / dt) * Math.max(0, p.depth - SLOP);
    p.Pn = 0; p.Pt = 0; p.Pp = 0;
  }
}

function applyPair(A, B, p, px, py) {
  A.vx -= px * A.invM; A.vy -= py * A.invM; A.w -= A.invI * (p.rax * py - p.ray * px);
  B.vx += px * B.invM; B.vy += py * B.invM; B.w += B.invI * (p.rbx * py - p.rby * px);
}

function solveContact(m) {
  const A = m.a, B = m.b, nx = m.nx, ny = m.ny, tx = -ny, ty = nx;
  for (const p of m.pts) {
    let dvx = (B.vx - B.w * p.rby) - (A.vx - A.w * p.ray);
    let dvy = (B.vy + B.w * p.rbx) - (A.vy + A.w * p.rax);
    const vn = dvx * nx + dvy * ny;
    let lam = p.mn * (-vn + p.bias);
    const pn = Math.max(p.Pn + lam, 0);
    lam = pn - p.Pn; p.Pn = pn;
    applyPair(A, B, p, lam * nx, lam * ny);

    dvx = (B.vx - B.w * p.rby) - (A.vx - A.w * p.ray);
    dvy = (B.vy + B.w * p.rbx) - (A.vy + A.w * p.rax);
    const vt = dvx * tx + dvy * ty;
    let lt = p.mt * -vt;
    const maxF = m.mu * p.Pn;
    const pt = Math.max(-maxF, Math.min(maxF, p.Pt + lt));
    lt = pt - p.Pt; p.Pt = pt;
    applyPair(A, B, p, lt * tx, lt * ty);
  }
}

function solvePosition(m) {
  const A = m.a, B = m.b, nx = m.nx, ny = m.ny;
  for (const p of m.pts) {
    if (p.pbias <= 0) continue;
    const dvx = (B.pvx - B.pw * p.rby) - (A.pvx - A.pw * p.ray);
    const dvy = (B.pvy + B.pw * p.rbx) - (A.pvy + A.pw * p.rax);
    const vn = dvx * nx + dvy * ny;
    let lam = p.mn * (-vn + p.pbias);
    const pp = Math.max(p.Pp + lam, 0);
    lam = pp - p.Pp; p.Pp = pp;
    const px = lam * nx, py = lam * ny;
    A.pvx -= px * A.invM; A.pvy -= py * A.invM; A.pw -= A.invI * (p.rax * py - p.ray * px);
    B.pvx += px * B.invM; B.pvy += py * B.invM; B.pw += B.invI * (p.rbx * py - p.rby * px);
  }
}

// ---------------------------------------------------------------- mafsal (römork bağlantısı)

/**
 * İki cismi bir noktadan birbirine bağlar (dönebilir). İsteğe bağlı göreli açı sınırı (lo..hi, rad)
 * makaslamayı (jackknife) sınırlar. Hız düzeyinde çözülür; konum hatası Baumgarte ile düzeltilir.
 */
export class RevoluteJoint {
  constructor(A, B, wx, wy, limit = null) {
    this.A = A; this.B = B;
    const ca = Math.cos(A.a), sa = Math.sin(A.a), cb = Math.cos(B.a), sb = Math.sin(B.a);
    const ax = wx - A.x, ay = wy - A.y, bx = wx - B.x, by = wy - B.y;
    this.lax = ax * ca + ay * sa; this.lay = -ax * sa + ay * ca;
    this.lbx = bx * cb + by * sb; this.lby = -bx * sb + by * cb;
    this.ref = B.a - A.a;
    this.limit = limit;
    this.angle = 0;
  }

  prepare(dt) {
    const A = this.A, B = this.B;
    const ca = Math.cos(A.a), sa = Math.sin(A.a), cb = Math.cos(B.a), sb = Math.sin(B.a);
    this.rax = this.lax * ca - this.lay * sa; this.ray = this.lax * sa + this.lay * ca;
    this.rbx = this.lbx * cb - this.lby * sb; this.rby = this.lbx * sb + this.lby * cb;
    const mA = A.invM, mB = B.invM, iA = A.invI, iB = B.invI;
    const k11 = mA + mB + iA * this.ray * this.ray + iB * this.rby * this.rby;
    const k12 = -iA * this.rax * this.ray - iB * this.rbx * this.rby;
    const k22 = mA + mB + iA * this.rax * this.rax + iB * this.rbx * this.rbx;
    const det = k11 * k22 - k12 * k12 || 1e-12;
    this.i11 = k22 / det; this.i12 = -k12 / det; this.i22 = k11 / det;
    const cx = B.x + this.rbx - A.x - this.rax, cy = B.y + this.rby - A.y - this.ray;
    const beta = 0.25 / dt;
    this.bx = cx * beta; this.by = cy * beta;
    // açı sınırı
    let rel = B.a - A.a - this.ref;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    this.angle = rel;
    this.lim = 0; this.Pl = 0;
    if (this.limit) {
      this.mAng = 1 / ((iA + iB) || 1e-12);
      if (rel <= this.limit[0]) { this.lim = -1; this.lbias = (rel - this.limit[0]) * beta; }
      else if (rel >= this.limit[1]) { this.lim = 1; this.lbias = (rel - this.limit[1]) * beta; }
    }
  }

  solve() {
    const A = this.A, B = this.B;
    if (this.lim) {
      const cdot = B.w - A.w;
      let lam = -this.mAng * (cdot + this.lbias);
      const old = this.Pl;
      this.Pl = this.lim < 0 ? Math.max(0, old + lam) : Math.min(0, old + lam);
      lam = this.Pl - old;
      A.w -= A.invI * lam; B.w += B.invI * lam;
    }
    const vx = (B.vx - B.w * this.rby) - (A.vx - A.w * this.ray) + this.bx;
    const vy = (B.vy + B.w * this.rbx) - (A.vy + A.w * this.rax) + this.by;
    const lx = -(this.i11 * vx + this.i12 * vy), ly = -(this.i12 * vx + this.i22 * vy);
    A.vx -= lx * A.invM; A.vy -= ly * A.invM; A.w -= A.invI * (this.rax * ly - this.ray * lx);
    B.vx += lx * B.invM; B.vy += ly * B.invM; B.w += B.invI * (this.rbx * ly - this.rby * lx);
  }
}

// ---------------------------------------------------------------- geometri yardımcıları

/** İki doğru parçası arasındaki en kısa uzaklık; out: {d, ax, ay, bx, by} (en yakın noktalar). */
export function segSegDist(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y, out) {
  const d1x = q1x - p1x, d1y = q1y - p1y, d2x = q2x - p2x, d2y = q2y - p2y;
  const rx = p1x - p2x, ry = p1y - p2y;
  const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry;
  let s, t;
  if (a <= 1e-12 && e <= 1e-12) { s = 0; t = 0; }
  else if (a <= 1e-12) { s = 0; t = clamp01(f / e); }
  else {
    const c = d1x * rx + d1y * ry;
    if (e <= 1e-12) { t = 0; s = clamp01(-c / a); }
    else {
      const b = d1x * d2x + d1y * d2y, den = a * e - b * b;
      s = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp01(-c / a); } else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
    }
  }
  out.ax = p1x + d1x * s; out.ay = p1y + d1y * s;
  out.bx = p2x + d2x * t; out.by = p2y + d2y * t;
  out.d = Math.hypot(out.ax - out.bx, out.ay - out.by);
  return out;
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

/** Nokta dışbükey çokgenin (dünya köşeleri) içinde mi? */
export function pointInShape(sh, x, y) {
  if (sh.type === 'circle') return Math.hypot(x - sh.cx, y - sh.cy) <= sh.r;
  for (let i = 0; i < sh.n; i++) if (sh.wnx[i] * (x - sh.wx[i]) + sh.wny[i] * (y - sh.wy[i]) > 0) return false;
  return true;
}
