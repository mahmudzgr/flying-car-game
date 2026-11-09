// Zemin: önbellekli toprak dolgusu (parça parça) + canlı yüzey bandı/dekor + mürekkep çizgisi. Sahip: Grafik.
import { BIOMES, SURFACE_TOP, SURFACE_DARK, SURFACE_LIGHT, INK, shade, rgba } from './palette.js';
import { ART, TAU, hash } from './util.js';

const CW = 10;          // parça genişliği (m)
const PAD = 0.5;
const MAX_CHUNKS = 10;

/** xs içinde x'ten küçük-eşit son düğümün indeksi (0..n-2). */
export function edgeIndex(xs, x) {
  let lo = 0, hi = xs.length - 2;
  if (x <= xs[0]) return 0;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (xs[m] <= x) lo = m; else hi = m - 1; }
  return lo;
}
/** Zemin yüksekliği (dikey duvarlarda üstteki değer). */
export function heightAt(st, x) {
  const { xs, ys } = st.terrain;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  const i = edgeIndex(xs, x), dx = xs[i + 1] - xs[i];
  if (dx < 1e-6) return Math.max(ys[i], ys[i + 1]);
  return ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / dx;
}
export function slopeAt(st, x) {
  const { xs, ys } = st.terrain;
  const i = edgeIndex(xs, x), dx = xs[i + 1] - xs[i];
  return dx < 1e-6 ? 0 : Math.atan2(ys[i + 1] - ys[i], dx);
}

/** Uzun Yol'da biyom bölgeleri (static.biomes = [{x0, biome}]); yoksa static.biome. */
export function biomeAtX(st, x) {
  const z = st.biomes;
  if (!z || !z.length) return st.biome;
  let cur = z[0].biome;
  for (let i = 0; i < z.length; i++) if (z[i].x0 <= x) cur = z[i].biome; else break;
  return cur;
}
const caches = new WeakMap();
function cacheOf(st) {
  let c = caches.get(st);
  if (!c) { c = { chunks: new Map(), tick: 0, K: ART.quality === 'low' ? 18 : 28 }; caches.set(st, c); }
  return c;
}
export function clearTerrainCache(st) { caches.delete(st); }
/** Verilen x aralığındaki zemin parçalarını önceden üret. */
export function prewarmTerrain(st, x0, x1) {
  const c = cacheOf(st), xs = st.terrain.xs;
  const a = Math.max(Math.floor(xs[0] / CW), Math.floor(x0 / CW)), b = Math.min(Math.floor(xs[xs.length - 1] / CW), Math.floor(x1 / CW));
  for (let ci = a; ci <= b; ci++) getChunk(st, c, ci);
}

function surfaceY(ys, xs, x) { // kısa yol: heightAt benzeri ama st gerektirmez
  const i = edgeIndex(xs, x), dx = xs[i + 1] - xs[i];
  return dx < 1e-6 ? Math.max(ys[i], ys[i + 1]) : ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / dx;
}

function buildChunk(st, ci, K) {
  const { xs, ys } = st.terrain, biome = biomeAtX(st, ci * CW + CW / 2), b = BIOMES[biome] ?? BIOMES.elma;
  const x0 = ci * CW, x1 = x0 + CW, xa = x0 - PAD, xb = x1 + PAD;
  // yüzey noktaları
  const px_ = [], py_ = [];
  let ymin = 1e9, ymax = -1e9;
  const clampX = (x) => Math.max(xs[0], Math.min(xs[xs.length - 1], x));
  const pushPt = (x, y) => { px_.push(x); py_.push(y); if (y < ymin) ymin = y; if (y > ymax) ymax = y; };
  pushPt(xa, surfaceY(ys, xs, clampX(xa)));
  for (let i = edgeIndex(xs, xa); i < xs.length; i++) { if (xs[i] <= xa) continue; if (xs[i] >= xb) break; pushPt(xs[i], ys[i]); }
  pushPt(xb, surfaceY(ys, xs, clampX(xb)));
  const yb = ymin - 4, yt = ymax + 0.6;
  const w = Math.ceil((CW + 2 * PAD) * K), h = Math.ceil((yt - yb) * K);
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = cv.getContext('2d');
  g.setTransform(K, 0, 0, -K, -xa * K, yt * K);
  const poly = (dy, bottom) => { g.beginPath(); g.moveTo(px_[0], bottom); for (let i = 0; i < px_.length; i++) g.lineTo(px_[i], py_[i] - dy); g.lineTo(px_[px_.length - 1], bottom); g.closePath(); };
  // dolgu + derinlik bantları
  poly(0.1, yb - 1); g.fillStyle = b.fill; g.fill();
  const deep = [[1.7, shade(b.fill, -0.1)], [3.6, shade(b.fill, -0.2)]];
  for (const [d, col] of deep) { poly(d, yb - 1); g.fillStyle = col; g.fill(); }
  // dekor (parça içinde; deterministik)
  g.save(); g.beginPath(); g.rect(x0, yb - 1, CW, yt - yb + 2); g.clip();
  if (biome === 'kanyon') {
    for (let k = 0; k < 4; k++) {
      const d = 0.55 + k * 0.95; g.beginPath();
      for (let x = x0; x <= x1 + 0.01; x += 0.5) { const y = surfaceY(ys, xs, clampX(x)) - d - Math.sin(x * 0.9 + k * 2.1) * 0.12; if (x === x0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.lineWidth = 0.13 + (k % 2) * 0.1; g.strokeStyle = k % 2 ? rgba(b.soilLight, 0.45) : rgba(b.soil, 0.5); g.lineJoin = 'round'; g.stroke();
    }
  }
  const nStone = Math.round(CW * 1.7);
  for (let i = 0; i < nStone; i++) {
    const hx = x0 + hash(ci * 131 + i * 7.3) * CW, d = 0.6 + hash(ci * 71 + i * 3.1) * 3.2;
    const sy = surfaceY(ys, xs, clampX(hx)) - d, rx = 0.07 + hash(ci * 17 + i) * 0.2, ry = rx * (0.55 + hash(i + ci * 5) * 0.3);
    g.beginPath(); g.ellipse(hx, sy, rx, ry, hash(i * 3 + ci) * 3, 0, TAU);
    g.fillStyle = hash(i + ci * 9) > 0.5 ? rgba(b.soilLight, 0.55) : rgba(b.soil, 0.7); g.fill();
    g.lineWidth = 0.025; g.strokeStyle = rgba(INK, 0.28); g.stroke();
  }
  if (biome === 'bataklik') {
    for (let i = 0; i < 14; i++) { const hx = x0 + hash(ci * 5 + i * 9.7) * CW, sy = surfaceY(ys, xs, clampX(hx)) - 0.4 - hash(ci + i * 2.3) * 2.5; g.beginPath(); g.arc(hx, sy, 0.04 + hash(i + ci) * 0.05, 0, TAU); g.fillStyle = rgba(b.soilLight, 0.5); g.fill(); }
  } else if (biome === 'zirve') {
    g.lineWidth = 0.04; g.strokeStyle = rgba('#ffffff', 0.55);
    for (let i = 0; i < 9; i++) { const hx = x0 + hash(ci * 13 + i * 4.1) * CW, sy = surfaceY(ys, xs, clampX(hx)) - 0.7 - hash(ci + i * 1.7) * 2.8; g.beginPath(); g.moveTo(hx, sy); g.lineTo(hx + 0.3, sy - 0.18); g.lineTo(hx + 0.5, sy + 0.05); g.stroke(); }
  } else if (biome === 'elma') {
    g.lineWidth = 0.035; g.strokeStyle = rgba('#5a3f27', 0.55); g.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const hx = x0 + hash(ci * 19 + i * 2.9) * CW, sy = surfaceY(ys, xs, clampX(hx)) - 0.5; g.beginPath(); g.moveTo(hx, sy); g.quadraticCurveTo(hx + 0.2, sy - 0.35, hx + 0.1, sy - 0.8 - hash(i + ci) * 0.5); g.stroke(); }
  }
  g.restore();
  return { cv, x: xa, yt, w, h, K, last: 0, biome, startX: xs[0], endX: xs[xs.length - 1], open: xa < xs[0] || xb > xs[xs.length - 1] };
}

function getChunk(st, c, ci) {
  let ch = c.chunks.get(ci);
  if (ch) { // akan zemin (Uzun Yol): uç parçalar / biyom değiştiyse yeniden üret
    const xs = st.terrain.xs;
    if ((ch.open && (ch.startX !== xs[0] || ch.endX !== xs[xs.length - 1])) || (st.biomes && biomeAtX(st, ci * CW + CW / 2) !== ch.biome)) { c.chunks.delete(ci); ch = null; }
  }
  if (!ch) {
    ch = buildChunk(st, ci, c.K); c.chunks.set(ci, ch);
    if (c.chunks.size > MAX_CHUNKS) { // en eski kullanılanı at
      let oldest = null, ot = Infinity;
      for (const [k, v] of c.chunks) if (v.last < ot && k !== ci) { ot = v.last; oldest = k; }
      if (oldest !== null) c.chunks.delete(oldest);
    }
  }
  ch.last = ++c.tick;
  return ch;
}

// ---------------------------------------------------------------- yüzey bandı (canlı)
const BW = { asphalt: 0.3, dirt: 0.34, grass: 0.34, gravel: 0.34, sand: 0.36, mud: 0.38, wet: 0.3, snow: 0.46, ice: 0.3, water: 0.32 };

const steep = (xs, ys, i) => Math.abs(ys[i + 1] - ys[i]) > 2.2 * Math.abs(xs[i + 1] - xs[i]);
function runPath(ctx, xs, ys, a, b, dy) {
  ctx.beginPath(); ctx.moveTo(xs[a], ys[a] + dy);
  for (let i = a + 1; i <= b + 1; i++) ctx.lineTo(xs[i], ys[i] + dy);
}

function decorEdge(ctx, st, i, surf, px, t) {
  const { xs, ys } = st.terrain;
  const x0 = xs[i], y0 = ys[i], x1 = xs[i + 1], y1 = ys[i + 1];
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  if (L < 0.05) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;     // yüzey normali (yukarı)
  const bw = BW[surf] ?? 0.3, key = i * 1.37;
  switch (surf) {
    case 'asphalt': {
      if (i % 2 === 0) { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - bw * 0.5; ctx.beginPath(); ctx.moveTo(mx - ux * 0.3, my - uy * 0.3); ctx.lineTo(mx + ux * 0.3, my + uy * 0.3); ctx.lineWidth = 0.07; ctx.strokeStyle = '#f3d54a'; ctx.lineCap = 'butt'; ctx.stroke(); }
      break;
    }
    case 'dirt': {
      for (let k = 0; k < 2; k++) { const u = hash(key + k * 3.3) * L, off = bw * (0.25 + hash(key + k) * 0.5); ctx.beginPath(); ctx.arc(x0 + ux * u - nx * off, y0 + uy * u - ny * off, 0.03 + hash(key + k * 1.7) * 0.03, 0, TAU); ctx.fillStyle = hash(key + k * 5) > 0.5 ? SURFACE_LIGHT.dirt : SURFACE_DARK.dirt; ctx.fill(); }
      break;
    }
    case 'grass': break; // ot telleri ayrı (üstte)
    case 'gravel': {
      for (let k = 0; k < 3; k++) { const u = (k + 0.5 + (hash(key + k) - 0.5) * 0.5) * (L / 3), r = 0.05 + hash(key + k * 2.1) * 0.05; ctx.beginPath(); ctx.arc(x0 + ux * u - nx * (bw * 0.35), y0 + uy * u - ny * (bw * 0.35), r, 0, TAU); ctx.fillStyle = k % 2 ? SURFACE_LIGHT.gravel : SURFACE_DARK.gravel; ctx.fill(); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = rgba(INK, 0.7); ctx.stroke(); }
      break;
    }
    case 'sand': {
      ctx.fillStyle = SURFACE_DARK.sand;
      for (let k = 0; k < 4; k++) { const u = hash(key + k * 1.9) * L, off = bw * (0.2 + hash(key + k) * 0.6); ctx.fillRect(x0 + ux * u - nx * off, y0 + uy * u - ny * off, 0.04, 0.04); }
      break;
    }
    case 'mud': {
      const u = hash(key) * L * 0.6; ctx.beginPath(); ctx.moveTo(x0 + ux * u - nx * 0.08, y0 + uy * u - ny * 0.08); ctx.lineTo(x0 + ux * (u + 0.35) - nx * 0.08, y0 + uy * (u + 0.35) - ny * 0.08);
      ctx.lineWidth = 0.05; ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineCap = 'round'; ctx.stroke();
      if (hash(key + 2) > 0.5) { ctx.beginPath(); ctx.arc(x0 + ux * L * 0.7 - nx * 0.2, y0 + uy * L * 0.7 - ny * 0.2, 0.05, 0, TAU); ctx.fillStyle = SURFACE_LIGHT.mud; ctx.fill(); }
      break;
    }
    case 'wet': {
      ctx.lineWidth = 0.025; ctx.strokeStyle = rgba(INK, 0.55); ctx.beginPath();
      for (let k = 0; k < 2; k++) { const u = k * L * 0.5 + 0.02, px0 = x0 + ux * u, py0 = y0 + uy * u; ctx.moveTo(px0, py0); ctx.lineTo(px0 - nx * bw, py0 - ny * bw); } ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0 + ux * 0.1 - nx * 0.08, y0 + uy * 0.1 - ny * 0.08); ctx.lineTo(x0 + ux * 0.38 - nx * 0.08, y0 + uy * 0.38 - ny * 0.08); ctx.lineWidth = 0.04; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
      break;
    }
    case 'ice': {
      const u = hash(key) * L * 0.6; ctx.beginPath(); ctx.moveTo(x0 + ux * u - nx * 0.05, y0 + uy * u - ny * 0.05); ctx.lineTo(x0 + ux * (u + 0.28) - nx * 0.22, y0 + uy * (u + 0.28) - ny * 0.22);
      ctx.lineWidth = 0.045; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.stroke();
      break;
    }
    case 'water': {
      ctx.beginPath(); for (let k = 0; k <= 4; k++) { const u = (k / 4) * L, wv = Math.sin(t * 3 + (x0 + ux * u) * 2.6) * 0.04; const X = x0 + ux * u, Y = y0 + uy * u - 0.06 + wv; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
      ctx.lineWidth = 0.04; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
      break;
    }
    default: break;
  }
}

function aboveDecor(ctx, st, i, surf, px, t) {
  const { xs, ys } = st.terrain;
  const x0 = xs[i], y0 = ys[i], dx = xs[i + 1] - x0, dy = ys[i + 1] - y0, L = Math.hypot(dx, dy);
  if (L < 0.05) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, key = i * 2.17;
  if (surf === 'grass') {
    ctx.lineJoin = 'round'; ctx.lineWidth = 1 * px; ctx.strokeStyle = rgba(INK, 0.75);
    for (let k = 0; k < 3; k++) {
      const u = (k + 0.2 + hash(key + k) * 0.6) * (L / 3), bx = x0 + ux * u, by = y0 + uy * u, h = 0.13 + hash(key + k * 1.3) * 0.12;
      const sway = Math.sin(t * 2.2 + bx * 1.1) * 0.04 + 0.02;
      ctx.beginPath(); ctx.moveTo(bx - 0.07, by - 0.03); ctx.quadraticCurveTo(bx + sway * 0.3 - 0.02, by + h * 0.6, bx + sway, by + h); ctx.quadraticCurveTo(bx + sway * 0.3 + 0.05, by + h * 0.5, bx + 0.07, by - 0.03); ctx.closePath();
      ctx.fillStyle = k % 2 ? SURFACE_LIGHT.grass : SURFACE_TOP.grass; ctx.fill(); ctx.stroke();
    }
  } else if (surf === 'snow') {
    const u = (0.5 + (hash(key) - 0.5) * 0.4) * L, bx = x0 + ux * u, by = y0 + uy * u, r = 0.2 + hash(key + 2) * 0.12;
    ctx.beginPath(); ctx.ellipse(bx, by, r, r * 0.55, Math.atan2(uy, ux), 0, Math.PI); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1.8 * px; ctx.strokeStyle = INK; ctx.stroke();
  } else if (surf === 'gravel') {
    // yüzeyden taşan irili ufaklı taşlar
    const u = hash(key) * L, bx = x0 + ux * u, by = y0 + uy * u;
    ctx.beginPath(); ctx.arc(bx, by + 0.01, 0.06 + hash(key + 4) * 0.04, 0, Math.PI); ctx.fillStyle = SURFACE_LIGHT.gravel; ctx.fill(); ctx.lineWidth = 1.3 * px; ctx.strokeStyle = INK; ctx.stroke();
  } else if (surf === 'sand') {
    if (hash(key + 1) > 0.7) { const u = hash(key) * L, bx = x0 + ux * u, by = y0 + uy * u; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 0.03, by + 0.14); ctx.moveTo(bx, by); ctx.lineTo(bx + 0.05, by + 0.12); ctx.lineWidth = 1.4 * px; ctx.strokeStyle = '#8c7140'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
}

/**
 * Zemin: önbellekli dolgu + yüzey bandı + ink çizgisi. range = {x0,x1,y0?,y1?} görünen alan (m).
 * Not: statik `st` başına önbellek tutulur; setLevel'de `clearTerrainCache(st)` çağrılabilir.
 */
export function drawTerrain(ctx, st, range, px) {
  const { xs, ys, surf } = st.terrain, c = cacheOf(st), t = ART.t;
  const c0 = Math.floor((range.x0 - 1) / CW), c1 = Math.floor((range.x1 + 1) / CW);
  const yLow = range.y0 ?? st.bounds.minY - 30;
  const lastCi = Math.floor(xs[xs.length - 1] / CW), firstCi = Math.floor(xs[0] / CW);
  // 1) toprak dolgusu (parçalar)
  for (let ci = Math.max(c0, firstCi); ci <= Math.min(c1, lastCi); ci++) {
    const ch = getChunk(st, c, ci);
    const sx = PAD * ch.K, sw = (CW + 0.04) * ch.K;
    ctx.save(); ctx.translate(ci * CW, ch.yt); ctx.scale(1, -1);
    ctx.drawImage(ch.cv, sx, 0, sw, ch.h, 0, 0, sw / ch.K, ch.h / ch.K);
    ctx.restore();
    // parçanın altı: derin renk
    const bot = ch.yt - ch.h / ch.K;
    if (yLow < bot) { ctx.fillStyle = shade((BIOMES[ch.biome] ?? BIOMES.elma).fill, -0.2); ctx.fillRect(ci * CW, yLow - 2, CW + 0.04, bot - yLow + 2.05); }
  }
  // sıradaki parçayı önceden hazırla (kare başına en çok bir)
  const ahead = c1 + 1, behind = c0 - 1;
  if (ahead <= lastCi && !c.chunks.has(ahead)) getChunk(st, c, ahead);
  else if (behind >= firstCi && !c.chunks.has(behind)) getChunk(st, c, behind);

  // 2) yüzey bandı (aynı yüzeyli ardışık kenarlar tek yol)
  const i0 = Math.max(0, edgeIndex(xs, range.x0) - 1), i1 = Math.min(xs.length - 2, edgeIndex(xs, range.x1) + 1);
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  let a = i0;
  while (a <= i1) {
    if (steep(xs, ys, a)) { a++; continue; }
    let e = a; const s = surf[a];
    while (e + 1 <= i1 && surf[e + 1] === s && !steep(xs, ys, e + 1)) e++;
    const bw = BW[s] ?? 0.3;
    if (s === 'water') { ctx.globalAlpha = 0.85; }
    runPath(ctx, xs, ys, a, e, -bw / 2); ctx.lineWidth = bw; ctx.strokeStyle = SURFACE_TOP[s] ?? '#888'; ctx.stroke();
    ctx.globalAlpha = 1;
    runPath(ctx, xs, ys, a, e, -bw - 0.025); ctx.lineWidth = 0.06; ctx.strokeStyle = SURFACE_DARK[s] ?? '#000'; ctx.stroke();
    runPath(ctx, xs, ys, a, e, -0.06); ctx.lineWidth = 0.05; ctx.strokeStyle = SURFACE_LIGHT[s] ?? '#fff'; ctx.stroke();
    // geçiş işareti: yüzey değişen noktada koyu dikey çizgi
    if (a > i0) { ctx.beginPath(); ctx.moveTo(xs[a], ys[a]); ctx.lineTo(xs[a], ys[a] - bw - 0.18); ctx.lineWidth = 2.2 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt'; }
    a = e + 1;
  }
  // 3) yüzey dekoru
  for (let i = i0; i <= i1; i++) if (!steep(xs, ys, i)) decorEdge(ctx, st, i, surf[i], px, t);
  // 4) mürekkep üst çizgisi
  ctx.beginPath(); ctx.moveTo(xs[i0], ys[i0]);
  for (let i = i0 + 1; i <= i1 + 1; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.lineWidth = 2.6 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  // 5) çizginin üstüne taşan dekor (ot, kar topakları, taşlar)
  for (let i = i0; i <= i1; i++) if (!steep(xs, ys, i)) aboveDecor(ctx, st, i, surf[i], px, t);
}

/** Ön plan: kamera önünde sallanan otlar/sazlar (zemin üzerinde, araçtan sonra). */
export function drawForeground(ctx, st, range, px, t) {
  const { xs, ys, surf } = st.terrain;
  const i0 = Math.max(0, edgeIndex(xs, range.x0) - 1), i1 = Math.min(xs.length - 2, edgeIndex(xs, range.x1) + 1);
  for (let i = i0; i <= i1; i++) {
    const s = surf[i];
    const reed = biomeAtX(st, xs[i]) === 'bataklik';
    if (s !== 'grass' && !(reed && s === 'mud')) continue;
    const x0 = xs[i], y0 = ys[i], dx = xs[i + 1] - x0, dy = ys[i + 1] - y0;
    if (Math.abs(dx) < 0.05) continue;
    const n = reed ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const hsh = hash(i * 5.3 + k * 1.1);
      if (hsh > 0.55) continue;
      const u = hash(i * 9.1 + k), bx = x0 + dx * u, by = y0 + dy * u;
      const h = reed ? 0.7 + hsh * 0.9 : 0.14 + hsh * 0.2, sway = Math.sin(t * 1.8 + bx * 0.8) * (reed ? 0.09 : 0.05);
      ctx.beginPath(); ctx.moveTo(bx - 0.06, by - 0.1); ctx.quadraticCurveTo(bx + sway * 0.5 - 0.02, by + h * 0.5, bx + sway, by + h); ctx.quadraticCurveTo(bx + sway * 0.5 + 0.07, by + h * 0.4, bx + 0.06, by - 0.1); ctx.closePath();
      ctx.fillStyle = reed ? '#6b8f4a' : '#3f8f4a'; ctx.fill(); ctx.lineWidth = 1 * px; ctx.strokeStyle = rgba(INK, 0.45); ctx.stroke();
      if (reed && hsh < 0.25) { ctx.beginPath(); ctx.ellipse(bx + sway, by + h, 0.045, 0.14, 0, 0, TAU); ctx.fillStyle = '#7a4e2c'; ctx.fill(); ctx.stroke(); }
    }
  }
}
