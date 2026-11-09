// Palet ve renk yardımcıları (TASARIM §12). Sahip: Grafik.
// Biyom alanları: sky[0..1] gökyüzü, far/mid/near parallax tonları, top/fill zemin, accent vurgu, soil* toprak detayı.
export const BIOMES = {
  elma: {
    sky: ['#8fd3ff', '#e3f6ff'], haze: '#f6fbff', far: '#9ec7a0', mid: '#6fb06f', near: '#4d9a55',
    top: '#5aa05a', fill: '#8b6a4a', soil: '#6f5238', soilLight: '#a07c58', accent: '#e8453c', sun: '#fff4c2',
  },
  kanyon: {
    sky: ['#ffcf8a', '#ffefd0'], haze: '#fff4dc', far: '#d98e6b', mid: '#b8603f', near: '#8e4630',
    top: '#d9a066', fill: '#9a5a3c', soil: '#7e472d', soilLight: '#b87550', accent: '#2e86ab', sun: '#fff0b8',
  },
  bataklik: {
    sky: ['#7fa89a', '#c5d8cc'], haze: '#dbe8df', far: '#6a8a82', mid: '#4b6b5a', near: '#37523f',
    top: '#5a6b3a', fill: '#3b3a2a', soil: '#2d2c20', soilLight: '#55513a', accent: '#f0c83c', sun: '#f2f0c4',
  },
  zirve: {
    sky: ['#b7d7f2', '#f4f9ff'], haze: '#ffffff', far: '#c9d6e6', mid: '#8fa5bf', near: '#6a819e',
    top: '#f3f8ff', fill: '#9fb3c8', soil: '#7d93ab', soilLight: '#c4d3e2', accent: '#ff7a3c', sun: '#ffffff',
  },
};

// Yüzey üst bandı: [ana renk, koyu ton, açık ton]
export const SURFACE_TOP = {
  asphalt: '#4a4f57', dirt: '#a8794d', grass: '#5aa05a', gravel: '#9a9a96', sand: '#e2c27a',
  mud: '#5b3d26', wet: '#6b7a82', snow: '#ffffff', ice: '#bfe6f5', water: '#4aa3d8',
};
export const SURFACE_DARK = {
  asphalt: '#33373d', dirt: '#85582f', grass: '#3f7f45', gravel: '#74746f', sand: '#c29e55',
  mud: '#3b2615', wet: '#4d5a62', snow: '#cfe0ee', ice: '#8fcbe4', water: '#2f7fb4',
};
export const SURFACE_LIGHT = {
  asphalt: '#6a707a', dirt: '#c79a68', grass: '#86c46a', gravel: '#bcbcb6', sand: '#f3dca2',
  mud: '#7b5638', wet: '#9db0b8', snow: '#ffffff', ice: '#e8f8ff', water: '#8fd0f0',
};
export const INK = '#2a2230';           // kontur rengi
export const INK_SOFT = '#4a3f54';
export const CARGO_COLORS = { crate: '#d8a85c', watermelon: '#4fa34f', eggs: '#f4e6c8', milk: '#6f8fb5', piano: '#2b2b33', bale: '#e8c547' };
export const VEHICLE_COLORS = { tosun: '#19b5a5', zipir: '#ff7a3c', pasa: '#5aa05a', koca: '#c0453c' };
export const SKIN = '#ffd9b0';
export const HELMET = '#ffd23c';
export const OVERALL = '#ff8a3c';
export const GOLD = '#ffd23c';

// ---- renk yardımcıları (önbellekli; kare başına tahsis yok) ----
const memo = new Map();
function parse(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const to2 = (n) => (n < 16 ? '0' : '') + Math.round(n).toString(16);
/** k<0 koyulaştırır (siyaha), k>0 açar (beyaza). */
export function shade(hex, k) {
  const key = hex + k;
  let r = memo.get(key);
  if (r) return r;
  const [R, G, B] = parse(hex);
  const t = k < 0 ? 0 : 255, a = Math.abs(k);
  r = '#' + to2(R + (t - R) * a) + to2(G + (t - G) * a) + to2(B + (t - B) * a);
  memo.set(key, r);
  return r;
}
export function mix(a, b, t) {
  const key = a + b + t;
  let r = memo.get(key);
  if (r) return r;
  const A = parse(a), B = parse(b);
  r = '#' + to2(A[0] + (B[0] - A[0]) * t) + to2(A[1] + (B[1] - A[1]) * t) + to2(A[2] + (B[2] - A[2]) * t);
  memo.set(key, r);
  return r;
}
export function rgba(hex, a) {
  const key = 'a' + hex + a;
  let r = memo.get(key);
  if (r) return r;
  const [R, G, B] = parse(hex);
  r = `rgba(${R},${G},${B},${a})`;
  memo.set(key, r);
  return r;
}
