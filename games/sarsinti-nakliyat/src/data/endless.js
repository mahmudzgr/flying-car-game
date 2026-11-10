// Uzun Yol (sonsuz mod): tohumlu parça üreteci. Saf fonksiyonlar: DOM yok, Math.random yok (aynı tohum → aynı yol).
// Sahip: Çekirdek. Sözleşme: docs/MIMARI.md §14. Sim (`sim/endless.js`) bu üreteci sırayla çağırır.
//
// Bir "parça" (segment) = 40–80 m'lik zemin + nesne şablonu. Bütün x değerleri parçanın BAŞINA göredir; sim mutlak x ekler.
// Zemin parçaları `sim/terrain.js` ile aynı sözlüktür (flat/slope/ramp/hills/bumps/gap/pts). Nesneler MIMARI §10 ile aynıdır.
import { ENDLESS } from '../config.js';

export const BIOME_ORDER = ['elma', 'kanyon', 'bataklik', 'zirve'];

// biyom başına yüzey rolleri
const SURF = {
  elma:     { road: 'asphalt', rough: 'dirt',   soft: 'grass', bump: 'dirt' },
  kanyon:   { road: 'dirt',    rough: 'gravel', soft: 'sand',  bump: 'gravel' },
  bataklik: { road: 'grass',   rough: 'dirt',   soft: 'mud',   bump: 'wet' },
  zirve:    { road: 'gravel',  rough: 'snow',   soft: 'snow',  bump: 'snow' },
};

/** mulberry32: küçük, hızlı, tohumlu RNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (a, b) => { let h = (a >>> 0) ^ Math.imul((b >>> 0) + 0x9e3779b9, 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
const lerp = (a, b, t) => a + (b - a) * t;
const sumLen = (pieces) => pieces.reduce((s, p) => s + (p.type === 'pts' ? p.pts.reduce((a, q) => a + q[0], 0) : p.len), 0);

/** Zorluk 0..1: mesafeyle yumuşakça artar (1 − e^(−m/ölçek)). */
export function difficultyAt(dist) { return 1 - Math.exp(-Math.max(0, dist) / ENDLESS.difficultyScale); }
/** Mesafedeki biyom kimliği. */
export function biomeAt(dist) { return BIOME_ORDER[Math.floor(Math.max(0, dist) / ENDLESS.biomeLen) % BIOME_ORDER.length]; }

// ---- şablonlar: (c) => {pieces, objects}. c = {r(a,b), ri(a,b), d, S, biome}. Her şablon yükseklik farkını sıfırlar (zemin sürüklenmez). ----
const coinsAt = (c, x, h = 1.2, n = c.ri(4, 6)) => ({ type: 'coins', x, n, spacing: 1.7, h });

const TEMPLATES = {
  bumpRun: {
    minD: 0, w: 3, biomes: null,
    build(c) {
      const len = c.ri(24, 36), h = lerp(0.2, 0.46, c.d) * c.r(0.9, 1.1);
      return {
        pieces: [{ type: 'flat', len: 8, surface: c.S.road }, { type: 'bumps', len, h, n: c.ri(4, 6), surface: c.S.bump }, { type: 'flat', len: 8, surface: c.S.road }],
        objects: [coinsAt(c, 12, 1.1)],
      };
    },
  },
  hillRoll: {
    minD: 0, w: 3, biomes: null,
    build(c) {
      const len = c.ri(50, 72);
      return {
        pieces: [{ type: 'flat', len: 6, surface: c.S.road }, { type: 'hills', len, amp: lerp(0.6, 1.5, c.d), waves: 2, surface: c.biome === 'zirve' ? 'snow' : c.S.rough }, { type: 'flat', len: 6, surface: c.S.road }],
        objects: [coinsAt(c, 14, 1.4, 6)],
      };
    },
  },
  kicker: {   // rampa + iniş: havaya fırlat, düz yere in
    minD: 0.08, w: 2.5, biomes: ['elma', 'kanyon', 'zirve'],
    build(c) {
      const dy = lerp(1.6, 2.8, c.d) * c.r(0.9, 1.1);
      return {
        pieces: [{ type: 'flat', len: 12, surface: c.S.road }, { type: 'ramp', len: 12, dy, surface: c.S.road }, { type: 'flat', len: 2 }, { type: 'slope', len: 22, dy: -dy }, { type: 'flat', len: 10, surface: c.S.road }],
        objects: [{ type: 'coins', x: 26, n: 4, spacing: 1.4, h: dy + 1.1 }],
      };
    },
  },
  rampGap: {  // küçük rampa + dar çukur: hızla atla
    minD: 0.14, w: 2.5, biomes: ['elma', 'kanyon', 'zirve'],
    build(c) {
      const w = lerp(3.4, 6.4, c.d) * c.r(0.95, 1.05), dy = lerp(0.8, 1.7, c.d);
      return {
        pieces: [{ type: 'flat', len: 16, surface: c.S.road }, { type: 'ramp', len: lerp(6, 8, c.d), dy, surface: c.S.rough }, { type: 'gap', len: w, depth: 6 }, { type: 'flat', len: 18, surface: c.S.road }],
        objects: [{ type: 'coins', x: 18, n: 4, spacing: 1.5, h: 2.6 }],
        heavy: true,
      };
    },
  },
  bridge: {   // zayıf tahtalı köprü: yavaş geç
    minD: 0.1, w: 2.5, biomes: ['kanyon', 'bataklik', 'elma'], minDByBiome: { elma: 0.35 },
    build(c) {
      const L = c.ri(12, 16), a = L * 0.4, b = L - 2 * a;
      const weak = [];
      if (c.d > 0.22) weak.push(c.ri(5, L - 5));
      if (c.d > 0.6) weak.push(c.ri(5, L - 5));
      return {
        pieces: [{ type: 'flat', len: 14, surface: 'dirt' }, { type: 'pts', pts: [[a, -1.6], [b, 0], [a, 1.6]], surface: 'wet' }, { type: 'flat', len: 14, surface: 'dirt' }],
        objects: [{ type: 'bridge', x: 14, len: L, planks: L, weak: [...new Set(weak)] }, { type: 'coins', x: 15, n: 3, spacing: 4, h: 1.0 }],
        zones: [{ x0: 8, x1: 14 + L + 3, speed: 6 }],
        heavy: true,
      };
    },
  },
  barrels: {  // varil yığını
    minD: 0.18, w: 2, biomes: null,
    build(c) {
      return {
        pieces: [{ type: 'flat', len: 20, surface: c.S.road }, { type: 'flat', len: 22, surface: c.S.road }],
        objects: [{ type: 'barrels', x: 24, cols: c.d > 0.5 ? 3 : 2, rows: c.d > 0.35 ? 3 : 2 }, coinsAt(c, 8, 1.1, 3)],
        zones: [{ x0: 14, x1: 36, speed: 8 }],
      };
    },
  },
  seesaw: {
    minD: 0.28, w: 2, biomes: ['elma', 'kanyon', 'bataklik'],
    build(c) {
      return {
        pieces: [{ type: 'flat', len: 14, surface: c.S.road }, { type: 'pts', pts: [[0.3, -0.3]], surface: 'wet' }, { type: 'flat', len: 8, surface: 'wet' }, { type: 'slope', len: 8, dy: 0.3, surface: c.S.road }, { type: 'flat', len: 12, surface: c.S.road }],
        objects: [{ type: 'seesaw', x: 14.3, len: 6 }],
        zones: [{ x0: 8, x1: 30, speed: 6 }],
        heavy: true,
      };
    },
  },
  softPatch: {  // çamur / kum / kar / çimen kesiti
    minD: 0.1, w: 3, biomes: null,
    build(c) {
      const len = c.ri(20, 32) + Math.round(c.d * 10);
      const pieces = [{ type: 'flat', len: 8, surface: c.S.road }, c.r(0, 1) < 0.5 ? { type: 'flat', len, surface: c.S.soft } : { type: 'hills', len: len + 12, amp: lerp(0.5, 1.0, c.d), waves: 2, surface: c.S.soft }, { type: 'flat', len: 10, surface: c.S.road }];
      return { pieces, objects: [coinsAt(c, 12, 1.1, 5)] };
    },
  },
  sandDunes: {  // kum tepeleri (kanyon, kar tepeleri zirvede)
    minD: 0.1, w: 3, biomes: ['kanyon', 'zirve', 'bataklik'],
    build(c) {
      return {
        pieces: [{ type: 'flat', len: 8, surface: c.S.road }, { type: 'hills', len: c.ri(44, 60), amp: lerp(0.8, 1.5, c.d), waves: 3, surface: c.biome === 'bataklik' ? 'mud' : c.S.soft }, { type: 'flat', len: 10, surface: c.S.road }],
        objects: [coinsAt(c, 14, 2.0, 6)],
      };
    },
  },
  icePatch: {   // buz yaması (yalnız zirve): düz ve hızla geç
    minD: 0.05, w: 4, biomes: ['zirve'],
    build(c) {
      return {
        pieces: [{ type: 'flat', len: 12, surface: 'snow' }, { type: 'flat', len: c.ri(16, 22) + Math.round(c.d * 8), surface: 'ice' }, { type: 'flat', len: 14, surface: 'snow' }],
        objects: [coinsAt(c, 16, 1.0, 4)],
      };
    },
  },
  steepHill: {  // uzun çıkış + iniş
    minD: 0.06, w: 2, biomes: ['elma', 'kanyon', 'bataklik', 'zirve'],
    build(c) {
      const dy = lerp(2.2, 4.5, c.d) * (c.biome === 'zirve' ? 0.6 : 1);
      return {
        pieces: [{ type: 'flat', len: 8, surface: c.S.road }, { type: 'slope', len: 30, dy, surface: c.S.rough }, { type: 'flat', len: 6, surface: c.S.rough }, { type: 'slope', len: 30, dy: -dy, surface: c.S.rough }, { type: 'flat', len: 8, surface: c.S.road }],
        objects: [coinsAt(c, 14, 1.2, 6)],
      };
    },
  },
  waterLogs: {  // su + yüzen kütükler (bataklık)
    minD: 0.12, w: 3, biomes: ['bataklik'],
    build(c) {
      const n = c.ri(3, 4), w = 4, gapLen = n * (w + 0.6) + 0.6;
      return {
        pieces: [{ type: 'flat', len: 14, surface: 'dirt' }, { type: 'gap', len: gapLen, depth: 4, surface: 'wet' }, { type: 'flat', len: 14, surface: 'dirt' }],
        objects: [{ type: 'water', x: 14, len: gapLen }, { type: 'logs', x: 14 + 0.3 + w / 2, n, w, spacing: w + 0.6 }, { type: 'coins', x: 16, n: 3, spacing: 4, h: 1.5 }],
        zones: [{ x0: 8, x1: 14 + gapLen + 2, speed: 5 }],
        heavy: true,
      };
    },
  },
};

export const TEMPLATE_NAMES = Object.keys(TEMPLATES);
/** Tek bir şablonu üretir (deney/ayar için: tools/bot.mjs --template). */
export function buildTemplate(name, d = 0.5, biome = 'kanyon', seed = 1) {
  const rng = mulberry32(hash2(seed >>> 0, 0x7e57));
  const c = { d, biome, S: SURF[biome], rng, r: (a, b) => a + rng() * (b - a), ri: (a, b) => a + Math.floor(rng() * (b - a + 1)) };
  const b = TEMPLATES[name].build(c);
  return { template: name, biome, d, ...b, len: sumLen(b.pieces) };
}

/**
 * @param {number} seed
 * @returns {{seed:number, level:object, next(x:number):object, loadFor(k:number, cfg:{capacity:number, vehicleId:string}):Array<{type:string,count:number}>}}
 */
export function createEndlessGen(seed) {
  seed = seed >>> 0;
  const rng = mulberry32(hash2(seed, 0x5eed));
  let idx = 0, nextPadAt = ENDLESS.deliveryEvery, lastTpl = '', lastHeavy = false, lastBiome = 'elma';

  const mk = (d, biome) => ({
    d, biome, S: SURF[biome], rng,
    r: (a, b) => a + rng() * (b - a),
    ri: (a, b) => a + Math.floor(rng() * (b - a + 1)),
  });

  /** İlk (başlangıç) parçası: düz asfalt. Bölüm verisi biçiminde döner. */
  const start = { kind: 'start', x0: 0, biome: 'elma', pieces: [{ type: 'flat', len: ENDLESS.startLen, surface: 'asphalt' }], objects: [{ type: 'coins', x: 12, n: 4, spacing: 1.7, h: 1.2 }], zones: [], d: 0 };
  start.len = sumLen(start.pieces);

  const level = {
    id: 'endless', name: 'Uzun Yol', region: 0, order: 0, difficulty: 1, biome: 'elma', music: 'elma',
    terrain: { surface: 'asphalt', pieces: start.pieces },
    spawn: { x: 3 }, finish: { x: 1e9 }, cargo: [], minDelivered: 0, parTime: 0, timeLimit: null,
    objects: [], hints: [], stars: { 2: [], 3: [] }, reward: { base: 0 }, bot: { speed: 11 }, mode: 'endless',
  };

  return {
    seed, level, start,
    /** Sıradaki parça. x = bu parçanın mutlak başlangıç x'i (başlangıçta 0 = oyunun x=0'ı; mesafe = x). */
    next(x) {
      const dist = Math.max(0, x);
      const d = difficultyAt(dist), biome = biomeAt(dist);
      const biomeChanged = biome !== lastBiome; lastBiome = biome;
      let seg;
      if (dist >= nextPadAt) {   // teslim noktası: düz asfalt + bayrak
        nextPadAt = dist + ENDLESS.deliveryEvery;
        const pieces = [{ type: 'flat', len: ENDLESS.padLen, surface: 'asphalt' }];
        seg = { kind: 'pad', pieces, objects: [{ type: 'coins', x: 3, n: 8, spacing: 1.6, h: 1.1 }], zones: [], deliveryAt: ENDLESS.padLen * 0.5, heavy: false, template: 'pad' };
        lastHeavy = false;
      } else {
        const c = mk(d, biome);
        const pool = [];
        for (const [name, t] of Object.entries(TEMPLATES)) {
          const minD = t.minDByBiome?.[biome] ?? t.minD;
          if (d < minD || (t.biomes && !t.biomes.includes(biome)) || name === lastTpl) continue;
          if (lastHeavy && t.build.length >= 0 && ['rampGap', 'bridge', 'seesaw', 'waterLogs'].includes(name)) continue;
          pool.push([name, t.w]);
        }
        let tot = 0; for (const [, w] of pool) tot += w;
        let pick = rng() * tot, name = pool[0][0];
        for (const [n, w] of pool) { pick -= w; if (pick <= 0) { name = n; break; } }
        const b = TEMPLATES[name].build(c);
        seg = { kind: 'road', template: name, pieces: b.pieces, objects: b.objects, zones: b.zones ?? [], heavy: !!b.heavy };
        lastTpl = name; lastHeavy = seg.heavy;
      }
      seg.len = sumLen(seg.pieces);
      seg.index = ++idx; seg.x0 = x; seg.biome = biome; seg.d = d; seg.biomeChanged = biomeChanged;
      return seg;
    },
    /** k. teslimde araca yüklenecek kargo listesi (k=0: başlangıç). Bağımsız RNG: zamanlamadan etkilenmez. */
    loadFor(k, { capacity, vehicleId }) {
      const r = mulberry32(hash2(seed, 0xca60 + k));
      const d = difficultyAt(k * ENDLESS.deliveryEvery);
      const n = Math.max(1, Math.min(capacity, ENDLESS.cargoStart + Math.floor(k / ENDLESS.cargoStep)));
      const pool = [['crate', 5], ['milk', 3], ['watermelon', 3], ['bale', 1 + d * 2], ['eggs', 1.5 + d * 2]];
      const bigOk = capacity >= 8;
      if (bigOk && d > 0.25) pool.push(['piano', 1.2]);
      const out = {};
      let piano = 0;
      for (let i = 0; i < n; i++) {
        let tot = 0; for (const [, w] of pool) tot += w;
        let p = r() * tot, type = 'crate';
        for (const [t, w] of pool) { p -= w; if (p <= 0) { type = t; break; } }
        if (type === 'piano') { if (piano >= 1 || n < 4) type = 'crate'; else piano++; }
        out[type] = (out[type] ?? 0) + 1;
      }
      void vehicleId;
      return Object.entries(out).map(([type, count]) => ({ type, count }));
    },
  };
}
