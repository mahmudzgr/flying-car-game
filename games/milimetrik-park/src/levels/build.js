// Milimetrik Park — bölüm kurucu.
// Bölümler kodla tarif edilir (levels/*.js). Açılar DERECE (0 = doğu/sağ, 90 = güney/aşağı),
// uzunluklar metre. Çıktı, sim/game.js ve render/'ın okuduğu düz bir veri nesnesidir (açılar radyan).
import { PARKED_MODELS, COLORS } from '../config.js';

const rad = (d) => (d * Math.PI) / 180;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export { hashStr };

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Merkez, yarı boylar ve açıdan (rad) köşe listesi. */
export function obox(cx, cy, hx, hy, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

/** Araç gövdesine benzer pahlı dikdörtgen. */
export function carPoly(cx, cy, len, wid, a, chF = 0.3, chR = 0.2) {
  const hx = len / 2, hy = wid / 2;
  const loc = [[hx, -hy + chF], [hx, hy - chF], [hx - chF, hy], [-hx + chR, hy], [-hx, hy - chR], [-hx, -hy + chR], [-hx + chR, -hy], [hx - chF, -hy]];
  const c = Math.cos(a), s = Math.sin(a);
  return loc.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

function ellipse(cx, cy, rx, ry, rotDeg = 0, n = 14) {
  const r = rad(rotDeg), c = Math.cos(r), s = Math.sin(r);
  const out = [];
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}

export function makeLevel(meta, build) {
  const b = new LevelBuilder(meta);
  build(b);
  return b.finish();
}

const META = ['vehicle', 'env', 'zone', 'timeLimit', 'exam', 'theme', 'hint', 'water'];

export class LevelBuilder {
  constructor(meta) {
    this.L = {
      id: meta.id, name: meta.name, short: meta.short || meta.name, desc: meta.desc || '', tip: meta.tip || '',
      w: meta.w, h: meta.h, bg: meta.bg || 'grass', indoor: !!meta.indoor, free: !!meta.free,
      par: { moves: 2, quality: 85, ...(meta.par || {}) },
      areas: [], marks: [], solids: [], curbs: [], cones: [], trees: [], decor: [], spots: [], lights: [], overhead: [],
      traffic: [], peds: [], tasks: null, start: null,
    };
    for (const k of META) if (meta[k] !== undefined) this.L[k] = meta[k];
    this.rand = rng(meta.seed ?? hashStr(meta.id));
  }

  // ------------------------------------------------ zemin ve boya
  area(type, pts, extra) { this.L.areas.push({ type, pts, ...(extra || {}) }); return this; }
  rect(type, x0, y0, x1, y1) { return this.area(type, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); }
  /** Rampa: dirDeg = aşağı yön (yer çekiminin çektiği yön), grade = eğim (0,1 = %10). */
  ramp(x0, y0, x1, y1, dirDeg, grade) {
    return this.area('ramp', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { slope: { dir: rad(dirDeg), grade } });
  }
  /** Eğimli bölge: zemin türü korunur (yokuş sokak). */
  slope(x0, y0, x1, y1, dirDeg, grade, type = 'asphalt') {
    return this.area(type, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { slope: { dir: rad(dirDeg), grade } });
  }
  puddle(x, y, rx, ry, rot = 0) { return this.area('puddle', ellipse(x, y, rx, ry, rot)); }
  oil(x, y, rx, ry, rot = 0) { return this.area('oil', ellipse(x, y, rx, ry, rot)); }
  water(x0, y0, x1, y1) { return this.area('water', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); }

  line(x1, y1, x2, y2, o = {}) {
    this.L.marks.push({ t: 'line', pts: [[x1, y1], [x2, y2]], color: o.color || 'white', w: o.w || 0.12, dash: o.dash || null });
    return this;
  }
  dashed(x1, y1, x2, y2, o = {}) { return this.line(x1, y1, x2, y2, { dash: [3, 3], ...o }); }
  arrow(x, y, angDeg, o = {}) { this.L.marks.push({ t: 'arrow', x, y, a: rad(angDeg), s: o.s || 1, color: o.color || 'white', kind: o.kind || 'straight' }); return this; }
  label(x, y, angDeg, text, o = {}) { this.L.marks.push({ t: 'text', x, y, a: rad(angDeg), text, size: o.size || 1.2, color: o.color || 'white' }); return this; }
  hatch(x0, y0, x1, y1, o = {}) { this.L.marks.push({ t: 'hatch', x0, y0, x1, y1, color: o.color || 'yellow' }); return this; }
  /** Yaya geçidi: (x0,y0)-(x1,y1) dikdörtgeni, şeritler dirDeg yönünde (yolun yönü). */
  crosswalk(x0, y0, x1, y1, vertical = false) { this.L.marks.push({ t: 'zebra', x0, y0, x1, y1, vertical }); return this; }
  /** Engelli park sembolü vb. */
  symbol(x, y, angDeg, kind, o = {}) { this.L.marks.push({ t: 'symbol', x, y, a: rad(angDeg), kind, s: o.s || 1 }); return this; }
  decor(kind, x, y, o = {}) { this.L.decor.push({ kind, x, y, ...o }); return this; }
  /** Araçların üstünde çizilen yarı saydam örtü (kanopi, benzinlik çatısı). */
  canopy(x0, y0, x1, y1, o = {}) { this.L.overhead.push({ kind: 'canopy', x0, y0, x1, y1, ...o }); return this; }

  // ------------------------------------------------ ışıklar (gece)
  light(x, y, r = 7, o = {}) { this.L.lights.push({ x, y, r, color: o.color || '255,236,190', k: o.k ?? 1 }); return this; }
  lamp(x, y, o = {}) {
    this.post(x, y, 0.13, 'lamp', { arm: o.arm ?? -90 });
    const a = rad(o.arm ?? -90), d = o.reach ?? 0.85;
    return this.light(x + Math.cos(a) * d, y + Math.sin(a) * d, o.r || 7.5, o);
  }

  // ------------------------------------------------ katı engeller (gövde katmanı)
  solid(kind, verts, style = {}) { const s = { kind, shape: 'poly', verts, style }; this.L.solids.push(s); return s; }
  wall(x1, y1, x2, y2, t = 0.25, style = {}) {
    const a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
    this.solid(style.kind || 'wall', obox((x1 + x2) / 2, (y1 + y2) / 2, len / 2 + t / 2, t / 2, a), style);
    return this;
  }
  block(x0, y0, x1, y1, kind = 'building', style = {}) { this.solid(kind, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], style); return this; }
  box(cx, cy, w, h, angDeg, kind = 'box', style = {}) { this.solid(kind, obox(cx, cy, w / 2, h / 2, rad(angDeg)), style); return this; }
  pillar(cx, cy, s = 0.6) { this.solid('pillar', obox(cx, cy, s / 2, s / 2, 0), { size: s }); return this; }
  post(x, y, r = 0.13, kind = 'post', style = {}) { this.L.solids.push({ kind, shape: 'circle', x, y, r, style }); return this; }
  bollard(x, y) { return this.post(x, y, 0.11, 'bollard'); }
  hydrant(x, y) { return this.post(x, y, 0.16, 'hydrant'); }
  tree(x, y, r = 2.0) {
    this.post(x, y, 0.22, 'trunk');
    this.L.trees.push({ x, y, r, seed: this.rand() });
    return this;
  }
  container(cx, cy, angDeg, o = {}) {
    const len = o.len || 6.06;
    const colors = ['#b5452f', '#2f6b9a', '#3d7f4f', '#c9902a', '#7a7f86', '#8a3f6a'];
    this.solid('container', obox(cx, cy, len / 2, 1.22, rad(angDeg)), { color: o.color || colors[Math.floor(this.rand() * colors.length)], len });
    return this;
  }
  /** Benzin pompası adası (uzun ekseni angDeg). */
  pump(cx, cy, angDeg) { this.solid('pump', obox(cx, cy, 1.6, 0.45, rad(angDeg)), {}); return this; }

  // ------------------------------------------------ alçak engeller (yalnızca tekerlekler çarpar)
  /** Kaldırım: (x1,y1)→(x2,y2) çizgisi kaldırımın yol tarafındaki yüzü; gövde side=+1 ise çizginin sağında. */
  curb(x1, y1, x2, y2, side = 1, t = 0.2) {
    const a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
    const nx = -Math.sin(a) * side, ny = Math.cos(a) * side;
    const cx = (x1 + x2) / 2 + nx * t / 2, cy = (y1 + y2) / 2 + ny * t / 2;
    this.L.curbs.push({ kind: 'curb', verts: obox(cx, cy, len / 2, t / 2, a) });
    return this;
  }
  stopper(cx, cy, angDeg, len = 1.7) {
    this.L.curbs.push({ kind: 'stopper', verts: obox(cx, cy, len / 2, 0.08, rad(angDeg)) });
    return this;
  }
  cone(x, y) { this.L.cones.push({ x, y }); return this; }

  // ------------------------------------------------ trafik ve yayalar
  /** Trafik: araçlar yolu izler. o: {speed m/s, every [min,max] sn, models, initial, loop, max} */
  traffic(path, o = {}) { this.L.traffic.push({ path, speed: o.speed ?? 6, every: o.every || [5, 10], models: o.models, initial: o.initial ?? 1, loop: !!o.loop, max: o.max ?? 4, delay: o.delay }); return this; }
  peds(path, o = {}) { this.L.peds.push({ path, speed: o.speed ?? 1.3, every: o.every || [4, 9], initial: o.initial ?? 1, loop: !!o.loop, max: o.max ?? 3, delay: o.delay }); return this; }

  // ------------------------------------------------ park yerleri
  /**
   * Dik park sırası. (x, y): ilk yerin merkezi; ang: yerin "burun içeri" yönü (giriş → dip);
   * sıra, bu yönün sağına (side=1) ya da soluna (side=-1) doğru uzar.
   */
  bays({ x, y, ang, n, w = 2.5, l = 5.0, side = 1, back = true, stoppers = false, color }) {
    const a = rad(ang), ux = Math.cos(a), uy = Math.sin(a), rx = -uy * side, ry = ux * side;
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: x + rx * i * w, y: y + ry * i * w, a, l, w });
    for (let k = 0; k <= n; k++) {
      const ox = x + rx * (k - 0.5) * w, oy = y + ry * (k - 0.5) * w;
      this.line(ox - ux * l / 2, oy - uy * l / 2, ox + ux * l / 2, oy + uy * l / 2, { color });
    }
    if (back) {
      const bx = x + ux * l / 2, by = y + uy * l / 2;
      this.line(bx - rx * w / 2, by - ry * w / 2, bx + rx * (n - 0.5) * w, by + ry * (n - 0.5) * w, { color });
    }
    if (stoppers) for (const b of out) this.stopper(b.x + ux * (l / 2 - 0.7), b.y + uy * (l / 2 - 0.7), ang + 90, 1.6);
    return out;
  }

  /**
   * Açılı park sırası. (x, y): ilk yerin merkezi; rowAng: sıranın uzandığı yön; ang: burun içeri yönü.
   * Çizgiler paralelkenar, değerlendirme alanı l×w dikdörtgendir.
   */
  angledBays({ x, y, rowAng, ang, n, w = 2.5, l = 5.0 }) {
    const a = rad(ang), r = rad(rowAng);
    const ux = Math.cos(a), uy = Math.sin(a), rx = Math.cos(r), ry = Math.sin(r);
    const sin = Math.abs(ux * ry - uy * rx), cos = Math.abs(ux * rx + uy * ry);
    const pitch = w / sin, depth = l * sin + w * cos, half = depth / 2 / sin;
    let nx = -ry, ny = rx;
    if (nx * ux + ny * uy < 0) { nx = -nx; ny = -ny; }
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: x + rx * i * pitch, y: y + ry * i * pitch, a, l, w, angled: true });
    for (let k = 0; k <= n; k++) {
      const ox = x + rx * (k - 0.5) * pitch, oy = y + ry * (k - 0.5) * pitch;
      this.line(ox - ux * half, oy - uy * half, ox + ux * half, oy + uy * half);
    }
    const bx = x + nx * depth / 2, by = y + ny * depth / 2;
    this.line(bx - rx * pitch / 2, by - ry * pitch / 2, bx + rx * (n - 0.5) * pitch, by + ry * (n - 0.5) * pitch);
    return out;
  }

  /** Paralel park kutuları: (x, y) ilk kutunun merkezi, ang araçların yönü, kutular ang yönünde dizilir. */
  parallelBays({ x, y, ang, n, l = 6.0, w = 2.2, outer = -1 }) {
    const a = rad(ang), ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: x + ux * i * l, y: y + uy * i * l, a, l, w, parallel: true });
    const ox = x + px * outer * w / 2, oy = y + py * outer * w / 2;
    this.line(ox - ux * l / 2, oy - uy * l / 2, ox + ux * (n - 0.5) * l, oy + uy * (n - 0.5) * l);
    for (let k = 0; k <= n; k++) {
      const cx = x + ux * (k - 0.5) * l, cy = y + uy * (k - 0.5) * l;
      this.line(cx - px * w / 2, cy - py * w / 2, cx + px * w / 2, cy + py * w / 2);
    }
    return out;
  }

  _pick(models) {
    const list = models || ['hatch', 'sedan', 'sedan', 'suv', 'hatch', 'van', 'mini'];
    return list[Math.floor(this.rand() * list.length)];
  }

  /** Park etmiş araç. o: {model, models, color, jitter}. */
  parked(cx, cy, angDeg, o = {}) {
    const model = o.model || this._pick(o.models);
    const m = PARKED_MODELS[model];
    const color = o.color || COLORS.parked[Math.floor(this.rand() * COLORS.parked.length)];
    const j = o.jitter ?? 1;
    const a = rad(angDeg + (this.rand() - 0.5) * 4 * j);
    const x = cx + (this.rand() - 0.5) * 0.16 * j, y = cy + (this.rand() - 0.5) * 0.16 * j;
    const big = model === 'truck' || model === 'bus';
    this.solid('car', carPoly(x, y, m.length, m.width, a, big ? 0.15 : 0.3, big ? 0.1 : 0.2), { model, color, x, y, a, len: m.length, wid: m.width });
    return this;
  }

  /** Bir park yerine araç koy. facing: 'nose' (burun dipte) | 'tail' | 'rand'. */
  fill(bay, o = {}) {
    const f = o.facing === 'tail' ? 'tail' : o.facing === 'nose' ? 'nose' : this.rand() < 0.6 ? 'nose' : 'tail';
    const model = o.model || this._pick(o.models);
    const ang = (bay.a * 180) / Math.PI + (f === 'tail' ? 180 : 0);
    let x = bay.x, y = bay.y;
    if (!bay.parallel) {
      const k = Math.max(0, (bay.l - PARKED_MODELS[model].length) / 2 - 0.35);
      x += Math.cos(bay.a) * k; y += Math.sin(bay.a) * k;
    }
    return this.parked(x, y, ang, { ...o, model });
  }

  /** Hedef park yeri. facing: 'nose' | 'tail' | 'any'; subject: 'car' | 'trailer'. */
  target(bay, o = {}) {
    const s = this._spot(bay, o);
    s.target = true;
    this.L.spots.push(s);
    return s;
  }

  _spot(bay, o) {
    return {
      x: bay.x, y: bay.y, a: bay.a, l: bay.l, w: bay.w, facing: o.facing || 'any', idealLat: o.idealLat || 0, idealLong: o.idealLong || 0,
      subject: o.subject || 'car', target: false, kind: o.kind || (bay.parallel ? 'parallel' : bay.angled ? 'angled' : 'bay'),
    };
  }

  // ------------------------------------------------ görevler (sınav parkuru)
  _tasks() { if (!this.L.tasks) this.L.tasks = []; return this.L.tasks; }
  /** Sırayla park edilecek yer (görev). */
  taskPark(bay, o = {}) {
    const s = this._spot(bay, o);
    this.L.spots.push(s);
    this._tasks().push({ type: 'park', spot: this.L.spots.length - 1, label: o.label || 'Park et', from: o.from || null });
    return s;
  }
  /** Sırayla içinden geçilecek kapılar: [[x1,y1],[x2,y2]] çiftleri. */
  taskGates(gates, o = {}) { this._tasks().push({ type: 'gates', gates, label: o.label || 'Kapılardan geç' }); return this; }
  taskReach(x0, y0, x1, y1, o = {}) { this._tasks().push({ type: 'reach', rect: [x0, y0, x1, y1], label: o.label || 'Çıkışa git' }); return this; }

  start(x, y, angDeg, gear = 'P') { this.L.start = { x, y, a: rad(angDeg), gear }; return this; }

  finish() {
    if (!this.L.start) throw new Error(`${this.L.id}: başlangıç yok`);
    if (!this.L.spots.length) throw new Error(`${this.L.id}: hedef yok`);
    return this.L;
  }
}
