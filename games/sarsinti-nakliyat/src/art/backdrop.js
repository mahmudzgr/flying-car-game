// Gökyüzü + parallax katmanları (ekran pikselinde). Sahip: Grafik.
// Her katman bir kez yatay döşenebilir şerit olarak önbelleğe çizilir; kare başına yalnızca 2 drawImage.
import { BIOMES, shade, mix, rgba, INK } from './palette.js';
import { ART, TAU, hash } from './util.js';

const FACT = [0.1, 0.26, 0.5, 0.04];          // yatay kayma oranları (katman 3 = bulut)
const BASE = [0.62, 0.72, 0.84, 0.0];         // katman taban çizgisi (ekran yüksekliği oranı)
const SPAN = [0.34, 0.3, 0.26, 0.5];          // katmanın üstte kapladığı alan

// ---------------------------------------------------------------- gökyüzü
let skyKey = '', skyGrad = null, sunGrad = null;
/** Gökyüzü: ekranı kaplar; dünya dönüşünden BAĞIMSIZ. @param {{w:number,h:number}} view css px */
export function drawSky(ctx, biome, view) {
  const b = BIOMES[biome] ?? BIOMES.elma;
  const key = biome + view.h;
  if (key !== skyKey) {
    skyKey = key;
    skyGrad = ctx.createLinearGradient(0, 0, 0, view.h);
    skyGrad.addColorStop(0, b.sky[0]); skyGrad.addColorStop(0.62, b.sky[1]); skyGrad.addColorStop(1, b.haze);
    const r = Math.max(60, view.h * 0.3), sx = 0, sy = 0;
    sunGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    sunGrad.addColorStop(0, rgba(b.sun, 0.9)); sunGrad.addColorStop(0.22, rgba(b.sun, 0.55)); sunGrad.addColorStop(1, rgba(b.sun, 0));
  }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, view.w, view.h);
  // güneş (sabit, ekranın sağ üstü)
  const sx = view.w * 0.8, sy = view.h * (biome === 'kanyon' ? 0.26 : 0.2);
  ctx.save(); ctx.translate(sx, sy); ctx.fillStyle = sunGrad; const r = Math.max(60, view.h * 0.3); ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.beginPath(); ctx.arc(0, 0, view.h * (biome === 'kanyon' ? 0.07 : 0.045), 0, TAU); ctx.fillStyle = biome === 'bataklik' ? 'rgba(255,255,230,.55)' : '#fffbe0'; ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- şerit önbelleği
const strips = new Map();
function getStrip(biome, layer, view, dpr) {
  const bs = Math.min(dpr, 1.25);
  const key = `${biome}|${layer}|${view.w}|${view.h}|${bs}|${ART.quality}`;
  let s = strips.get(key);
  if (s) return s;
  if (strips.size > 10) strips.clear();
  const P = Math.ceil(view.w), H = view.h;
  const top = Math.max(0, H * (BASE[layer] - SPAN[layer]));
  const sh = layer === 3 ? H * 0.55 : H + 170 - top;     // bulut şeridi üstte, diğerleri alta kadar
  const w = Math.ceil(P * bs), h = Math.ceil(sh * bs);
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const g = cv.getContext('2d');
  g.scale(bs, bs);
  const baseY = layer === 3 ? 0 : H * BASE[layer] - top;
  PAINT[biome]?.[layer]?.(g, P, sh, baseY, H, BIOMES[biome] ?? BIOMES.elma);
  s = { cv, P, top, sh };
  strips.set(key, s);
  return s;
}
export function clearBackdropCache() { strips.clear(); skyKey = ''; }

/** Parallax katmanı (ekran pikselleri). layer: 0 uzak, 1 orta, 2 yakın, 3 bulut. camX/camY metre. */
export function drawParallax(ctx, biome, layer, camX, view, scale, camY = 0) {
  const dpr = ART.dpr || 1;
  const s = getStrip(biome, layer, view, dpr);
  const f = FACT[layer];
  let off = camX * scale * f + (layer === 3 ? ART.t * 7 : 0);
  off = ((off % s.P) + s.P) % s.P;
  const dy = layer === 3 ? -camY * scale * 0.02 : Math.max(-90, Math.min(90, camY * scale * f * 0.45));
  const y = s.top + dy;
  ctx.drawImage(s.cv, -off, y, s.P + 1, s.sh);
  ctx.drawImage(s.cv, -off + s.P, y, s.P + 1, s.sh);
}

// ---------------------------------------------------------------- çizim yardımcıları (şerit uzayı)
function wrap(P, margin, x, fn) { fn(x); if (x < margin) fn(x + P); else if (x > P - margin) fn(x - P); }
function hills(g, P, baseY, amp, fill, seed, ks = [1, 2, 3], extraY = 0) {
  g.beginPath(); g.moveTo(0, baseY + 400);
  const ph = ks.map((_, i) => hash(seed + i) * TAU);
  for (let x = 0; x <= P; x += 8) {
    let y = 0; ks.forEach((k, i) => { y += Math.sin((x / P) * TAU * k * (i === 0 ? 1 : 1) + ph[i]) * amp / (i + 1.4); });
    g.lineTo(x, baseY - amp - y + extraY);
  }
  g.lineTo(P, baseY + 400); g.closePath(); g.fillStyle = fill; g.fill();
}
function ground(g, P, y, h, fill) { g.fillStyle = fill; g.fillRect(0, y, P, h); }
function blob(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = fill; g.fill(); }
function cloudShape(g, x, y, s, col, shadeCol) {
  const parts = [[0, 0, 26], [28, -10, 32], [62, -2, 28], [88, 6, 20], [-26, 8, 18]];
  g.fillStyle = shadeCol; for (const [dx, dy, r] of parts) { g.beginPath(); g.arc(x + dx * s, y + dy * s + 6 * s, r * s, 0, TAU); g.fill(); }
  g.fillStyle = col; for (const [dx, dy, r] of parts) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); }
  g.fillRect(x - 26 * s, y + 8 * s, 140 * s, 14 * s);
}

// ---------------------------------------------------------------- biyom ressamları: [uzak, orta, yakın, bulut]
const PAINT = {
  elma: [
    (g, P, h, B, H, b) => {   // uzak: mavimsi dağlar + yumuşak yeşil tepeler + ambar ve yel değirmeni
      hills(g, P, B - 40, 46, mix(b.far, '#bcd8f0', 0.55), 3, [1, 3]);
      hills(g, P, B + 6, 36, b.far, 11, [2, 3]);
      wrap(P, 80, P * 0.22, (x) => { const y = B - 56; g.fillStyle = '#d9867c'; g.fillRect(x - 16, y - 18, 32, 20); g.beginPath(); g.moveTo(x - 20, y - 18); g.lineTo(x, y - 34); g.lineTo(x + 20, y - 18); g.closePath(); g.fillStyle = '#b86c64'; g.fill(); });
      wrap(P, 80, P * 0.68, (x) => { const y = B - 60; g.strokeStyle = '#d9e6dc'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 40); g.stroke(); g.lineWidth = 3; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + Math.cos(a) * 30, y - 40 - Math.sin(a) * 30); g.stroke(); } });
    },
    (g, P, h, B, H, b) => {   // orta: elma bahçesi
      hills(g, P, B + 4, 22, b.mid, 21, [1, 2]);
      const n = 11;
      for (let i = 0; i < n; i++) wrap(P, 60, (i + hash(i * 3.3) * 0.6) * (P / n), (x) => {
        const s = 0.8 + hash(i * 7.1) * 0.5, y = B - 18 + Math.sin((x / P) * TAU * 2 + 0.7) * 4;
        g.fillStyle = '#7a5a3a'; g.fillRect(x - 3 * s, y - 26 * s, 6 * s, 28 * s);
        blob(g, x, y - 38 * s, 24 * s, shade(b.mid, -0.1)); blob(g, x - 12 * s, y - 31 * s, 15 * s, shade(b.mid, -0.1)); blob(g, x + 13 * s, y - 32 * s, 16 * s, shade(b.mid, -0.1));
        blob(g, x - 3 * s, y - 42 * s, 19 * s, b.mid);
        g.fillStyle = b.accent; for (let k = 0; k < 4; k++) blob(g, x + (hash(i * 9 + k) - 0.5) * 34 * s, y - (28 + hash(i * 4 + k) * 22) * s, 3.2 * s, b.accent);
      });
      // çit
      g.fillStyle = '#b89c74'; for (let x = 0; x < P; x += 26) g.fillRect(x, B - 6, 3, 14); g.fillRect(0, B - 1, P, 2.5);
    },
    (g, P, h, B, H, b) => {   // yakın: çalılar ve uzun otlar
      ground(g, P, B + 18, h, b.near);
      for (let i = 0; i < 14; i++) wrap(P, 70, (i + hash(i * 5.1) * 0.7) * (P / 14), (x) => {
        const s = 0.7 + hash(i * 2.3) * 0.7, y = B + 22;
        blob(g, x, y - 10 * s, 20 * s, shade(b.near, -0.06)); blob(g, x - 15 * s, y - 4 * s, 14 * s, b.near); blob(g, x + 16 * s, y - 5 * s, 15 * s, b.near);
        g.fillStyle = shade(b.near, 0.2); for (let k = 0; k < 5; k++) { const bx = x + (k - 2) * 8 * s; g.beginPath(); g.moveTo(bx - 3, y); g.lineTo(bx + (k - 2) * 2, y - 34 * s * (0.6 + hash(i + k) * 0.5)); g.lineTo(bx + 3, y); g.fill(); }
      });
    },
    (g, P, h, B, H, b) => {   // bulutlar
      for (let i = 0; i < 5; i++) wrap(P, 150, (i + 0.3 + hash(i * 2.7) * 0.4) * (P / 5), (x) => cloudShape(g, x, 50 + hash(i * 4.1) * h * 0.55, 0.8 + hash(i * 6.1) * 0.7, 'rgba(255,255,255,.92)', 'rgba(205,225,245,.9)'));
    },
  ],
  kanyon: [
    (g, P, h, B, H, b) => {   // uzak: mesa'lar
      hills(g, P, B - 10, 14, mix(b.far, '#ffe3c4', 0.4), 5, [2]);
      const m = [[0.1, 150, 90], [0.32, 210, 120], [0.55, 130, 100], [0.8, 190, 110]];
      for (const [fx, w, hh] of m) wrap(P, 160, fx * P, (x) => {
        const y = B + 6;
        g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2 + 12, y - hh * 0.7); g.lineTo(x - w / 2 + 20, y - hh); g.lineTo(x + w / 2 - 20, y - hh); g.lineTo(x + w / 2 - 12, y - hh * 0.7); g.lineTo(x + w / 2, y); g.closePath();
        g.fillStyle = b.far; g.fill();
        g.fillStyle = shade(b.far, -0.1); g.fillRect(x - w / 2 + 6, y - hh * 0.55, w - 12, 5); g.fillRect(x - w / 2 + 3, y - hh * 0.25, w - 6, 5);
        g.fillStyle = shade(b.far, 0.18); g.fillRect(x - w / 2 + 20, y - hh, w - 40, 6);
      });
      ground(g, P, B + 6, h, mix(b.far, b.mid, 0.4));
    },
    (g, P, h, B, H, b) => {   // orta: kaya sütunları ve kemer
      hills(g, P, B + 10, 20, b.mid, 31, [1, 2]);
      const pil = [[0.12, 46, 130], [0.3, 34, 95], [0.62, 52, 150], [0.86, 38, 110]];
      for (const [fx, w, hh] of pil) wrap(P, 100, fx * P, (x) => {
        const y = B + 14;
        g.beginPath(); g.moveTo(x - w / 2 - 8, y); g.lineTo(x - w / 2, y - hh * 0.6); g.lineTo(x - w / 2 + 4, y - hh); g.lineTo(x + w / 2 - 4, y - hh); g.lineTo(x + w / 2, y - hh * 0.6); g.lineTo(x + w / 2 + 8, y); g.closePath();
        g.fillStyle = b.mid; g.fill(); g.fillStyle = shade(b.mid, -0.18); g.fillRect(x - w / 2, y - hh * 0.7, w, 6); g.fillRect(x - w / 2 + 2, y - hh * 0.35, w - 4, 6);
        g.fillStyle = shade(b.mid, 0.2); g.fillRect(x - w / 2 + 4, y - hh, w - 8, 7);
      });
      // kemer
      wrap(P, 160, P * 0.47, (x) => { const y = B + 14; g.fillStyle = b.mid; g.beginPath(); g.moveTo(x - 70, y); g.lineTo(x - 66, y - 70); g.quadraticCurveTo(x, y - 140, x + 66, y - 70); g.lineTo(x + 70, y); g.lineTo(x + 40, y); g.quadraticCurveTo(x, y - 90, x - 40, y); g.closePath(); g.fill(); });
    },
    (g, P, h, B, H, b) => {   // yakın: iri kayalar ve kaktüsler
      ground(g, P, B + 20, h, b.near);
      for (let i = 0; i < 9; i++) wrap(P, 90, (i + hash(i * 3.7) * 0.7) * (P / 9), (x) => {
        const s = 0.7 + hash(i * 1.9) * 0.8, y = B + 24;
        if (i % 3 === 1) { // kaktüs
          g.fillStyle = '#5f8a4a'; g.strokeStyle = '#3f6535'; g.lineWidth = 2;
          g.beginPath(); g.roundRect ? g.roundRect(x - 7 * s, y - 70 * s, 14 * s, 74 * s, 7 * s) : g.rect(x - 7 * s, y - 70 * s, 14 * s, 74 * s); g.fill();
          g.beginPath(); g.roundRect ? g.roundRect(x - 26 * s, y - 52 * s, 10 * s, 28 * s, 5 * s) : g.rect(x - 26 * s, y - 52 * s, 10 * s, 28 * s); g.fill(); g.fillRect(x - 24 * s, y - 28 * s, 22 * s, 8 * s);
          g.beginPath(); g.roundRect ? g.roundRect(x + 16 * s, y - 62 * s, 10 * s, 30 * s, 5 * s) : g.rect(x + 16 * s, y - 62 * s, 10 * s, 30 * s); g.fill(); g.fillRect(x + 2 * s, y - 36 * s, 22 * s, 8 * s);
        } else { g.beginPath(); g.moveTo(x - 38 * s, y); g.lineTo(x - 28 * s, y - 24 * s); g.lineTo(x - 6 * s, y - 34 * s); g.lineTo(x + 20 * s, y - 28 * s); g.lineTo(x + 40 * s, y); g.closePath(); g.fillStyle = shade(b.near, 0.05); g.fill(); g.fillStyle = shade(b.near, -0.2); g.beginPath(); g.moveTo(x - 6 * s, y - 34 * s); g.lineTo(x + 20 * s, y - 28 * s); g.lineTo(x + 40 * s, y); g.lineTo(x + 4 * s, y); g.closePath(); g.fill(); }
      });
    },
    (g, P, h, B, H, b) => {   // güneş ışığı demetleri + ince bulutlar
      g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 4; i++) wrap(P, 200, (i + 0.4 + hash(i * 3.1) * 0.3) * (P / 4), (x) => { g.beginPath(); g.ellipse(x, 60 + hash(i * 8.1) * 90, 90 + hash(i) * 40, 7, 0, 0, TAU); g.fill(); });
      for (let i = 0; i < 3; i++) wrap(P, 200, (i + 0.2 + hash(i * 6.1) * 0.5) * (P / 3), (x) => {
        const gr = g.createLinearGradient(x, 0, x - 120, h); gr.addColorStop(0, 'rgba(255,248,210,.28)'); gr.addColorStop(1, 'rgba(255,248,210,0)');
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x - 140, h); g.lineTo(x - 220, h); g.closePath(); g.fillStyle = gr; g.fill();
      });
    },
  ],
  bataklik: [
    (g, P, h, B, H, b) => {   // uzak: sisli selvi silüetleri
      hills(g, P, B - 6, 14, mix(b.far, '#dbe8df', 0.35), 7, [1, 3]);
      for (let i = 0; i < 13; i++) wrap(P, 60, (i + hash(i * 3.3) * 0.7) * (P / 13), (x) => {
        const s = 0.7 + hash(i * 5.7) * 0.9, y = B + 6;
        g.fillStyle = b.far; g.fillRect(x - 3 * s, y - 70 * s, 6 * s, 74 * s);
        g.beginPath(); g.ellipse(x, y - 78 * s, 20 * s, 30 * s, 0, 0, TAU); g.fill();
        g.strokeStyle = b.far; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - 14 * s + k * 9 * s, y - 62 * s); g.lineTo(x - 15 * s + k * 9 * s, y - 40 * s); g.stroke(); }
      });
      ground(g, P, B + 6, h, b.far);
    },
    (g, P, h, B, H, b) => {   // orta: mangrov ağaçları + fener
      hills(g, P, B + 8, 10, b.mid, 41, [2]);
      for (let i = 0; i < 9; i++) wrap(P, 100, (i + hash(i * 4.4) * 0.6) * (P / 9), (x) => {
        const s = 0.8 + hash(i * 2.9) * 0.6, y = B + 14;
        g.strokeStyle = shade(b.mid, -0.35); g.lineWidth = 7 * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - 20 * s, y + 4); g.quadraticCurveTo(x - 10 * s, y - 30 * s, x, y - 58 * s); g.moveTo(x + 22 * s, y + 4); g.quadraticCurveTo(x + 10 * s, y - 30 * s, x, y - 58 * s); g.moveTo(x, y + 2); g.lineTo(x, y - 60 * s); g.stroke();
        blob(g, x, y - 74 * s, 30 * s, shade(b.mid, -0.1)); blob(g, x - 24 * s, y - 62 * s, 20 * s, shade(b.mid, -0.1)); blob(g, x + 26 * s, y - 64 * s, 21 * s, shade(b.mid, -0.1)); blob(g, x - 5 * s, y - 82 * s, 22 * s, b.mid);
        g.strokeStyle = rgba(b.mid, 0.9); g.lineWidth = 2; for (let k = 0; k < 6; k++) { const mx = x - 34 * s + k * 13 * s; g.beginPath(); g.moveTo(mx, y - 62 * s); g.quadraticCurveTo(mx + 2, y - 48 * s, mx - 1, y - (30 + hash(i * 3 + k) * 20) * s); g.stroke(); }
      });
      for (let i = 0; i < 3; i++) wrap(P, 40, (i + 0.5) * (P / 3) + 30, (x) => { const y = B + 14; g.fillStyle = '#5a4a38'; g.fillRect(x - 2, y - 50, 4, 54); g.fillStyle = b.accent; g.beginPath(); g.arc(x, y - 56, 7, 0, TAU); g.fill(); g.fillStyle = 'rgba(240,200,60,.25)'; g.beginPath(); g.arc(x, y - 56, 22, 0, TAU); g.fill(); });
    },
    (g, P, h, B, H, b) => {   // yakın: sazlıklar, nilüfer yaprakları
      ground(g, P, B + 18, h, b.near);
      for (let i = 0; i < 30; i++) wrap(P, 40, (i + hash(i * 1.9) * 0.9) * (P / 30), (x) => {
        const s = 0.6 + hash(i * 3.1) * 0.9, y = B + 22;
        g.strokeStyle = shade(b.near, 0.12 + hash(i) * 0.1); g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (hash(i * 7) - 0.5) * 18, y - 40 * s, x + (hash(i * 5) - 0.5) * 24, y - 70 * s * (0.6 + hash(i * 2) * 0.6)); g.stroke();
        if (i % 4 === 0) { g.fillStyle = '#7a4e2c'; g.beginPath(); g.ellipse(x + (hash(i * 5) - 0.5) * 24, y - 72 * s, 4, 11, 0, 0, TAU); g.fill(); }
      });
    },
    (g, P, h, B, H, b) => {   // sis
      for (let i = 0; i < 4; i++) wrap(P, 300, (i + 0.5) * (P / 4), (x) => { const y = 100 + i * 70; const gr = g.createRadialGradient(x, y, 10, x, y, 260); gr.addColorStop(0, 'rgba(225,240,232,.5)'); gr.addColorStop(1, 'rgba(225,240,232,0)'); g.fillStyle = gr; g.fillRect(x - 260, y - 130, 520, 260); });
    },
  ],
  zirve: [
    (g, P, h, B, H, b) => {   // uzak: karlı zirveler
      const pk = [[0.08, 150, 130], [0.28, 210, 190], [0.5, 140, 120], [0.72, 230, 210], [0.94, 160, 140]];
      for (const [fx, w, hh] of pk) wrap(P, 160, fx * P, (x) => {
        const y = B + 20;
        g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y - hh); g.lineTo(x + w / 2, y); g.closePath(); g.fillStyle = b.far; g.fill();
        g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x + w / 2, y); g.lineTo(x + w * 0.1, y); g.lineTo(x, y - hh * 0.3); g.closePath(); g.fillStyle = shade(b.far, -0.08); g.fill();
        g.beginPath(); g.moveTo(x - w * 0.17, y - hh * 0.66); g.lineTo(x, y - hh); g.lineTo(x + w * 0.17, y - hh * 0.66); g.lineTo(x + w * 0.07, y - hh * 0.72); g.lineTo(x, y - hh * 0.62); g.lineTo(x - w * 0.07, y - hh * 0.72); g.closePath(); g.fillStyle = '#ffffff'; g.fill();
      });
      ground(g, P, B + 18, h, mix(b.far, b.mid, 0.3));
    },
    (g, P, h, B, H, b) => {   // orta: çam ormanı + dağ evleri
      hills(g, P, B + 8, 18, b.mid, 51, [1, 2]);
      for (let i = 0; i < 16; i++) wrap(P, 50, (i + hash(i * 3.9) * 0.7) * (P / 16), (x) => {
        const s = 0.7 + hash(i * 4.1) * 0.8, y = B + 14;
        g.fillStyle = shade(b.mid, -0.3);
        for (let k = 0; k < 3; k++) { const w = (34 - k * 8) * s, yy = y - k * 22 * s - 8 * s; g.beginPath(); g.moveTo(x - w / 2, yy); g.lineTo(x, yy - 28 * s); g.lineTo(x + w / 2, yy); g.closePath(); g.fill(); }
        g.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) { const w = (34 - k * 8) * s, yy = y - k * 22 * s - 8 * s; g.beginPath(); g.moveTo(x - w * 0.22, yy - 20 * s); g.lineTo(x, yy - 28 * s); g.lineTo(x + w * 0.22, yy - 20 * s); g.lineTo(x + w * 0.1, yy - 17 * s); g.lineTo(x, yy - 22 * s); g.lineTo(x - w * 0.1, yy - 17 * s); g.closePath(); g.fill(); }
      });
      for (const fx of [0.2, 0.62]) wrap(P, 100, fx * P, (x) => { const y = B + 12; g.fillStyle = '#b5524a'; g.fillRect(x - 20, y - 30, 40, 32); g.beginPath(); g.moveTo(x - 26, y - 30); g.lineTo(x, y - 52); g.lineTo(x + 26, y - 30); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.fillStyle = '#ffd86b'; g.fillRect(x - 12, y - 22, 9, 10); g.fillRect(x + 4, y - 22, 9, 10); g.fillStyle = '#7a4e2c'; g.fillRect(x + 14, y - 58, 6, 14); });
    },
    (g, P, h, B, H, b) => {   // yakın: karlı çamlar + kar yığınları
      ground(g, P, B + 20, h, '#dfe9f4');
      hills(g, P, B + 24, 12, '#eef4fb', 61, [2, 3]);
      for (let i = 0; i < 8; i++) wrap(P, 80, (i + hash(i * 6.3) * 0.7) * (P / 8), (x) => {
        const s = 0.8 + hash(i * 2.1) * 0.7, y = B + 26;
        g.fillStyle = '#4b6b78'; for (let k = 0; k < 4; k++) { const w = (54 - k * 11) * s, yy = y - k * 24 * s; g.beginPath(); g.moveTo(x - w / 2, yy); g.lineTo(x, yy - 34 * s); g.lineTo(x + w / 2, yy); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - w * 0.3, yy - 20 * s); g.lineTo(x, yy - 34 * s); g.lineTo(x + w * 0.3, yy - 20 * s); g.lineTo(x, yy - 14 * s); g.closePath(); g.fill(); g.fillStyle = '#4b6b78'; }
        g.fillStyle = '#6b4c34'; g.fillRect(x - 4 * s, y, 8 * s, 14 * s);
      });
    },
    (g, P, h, B, H, b) => {   // ince bulutlar
      for (let i = 0; i < 5; i++) wrap(P, 160, (i + 0.4 + hash(i * 2.2) * 0.4) * (P / 5), (x) => { const y = 40 + hash(i * 3.3) * h * 0.55; g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x, y, 90 + hash(i) * 40, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + 40, y - 9, 56, 8, 0, 0, TAU); g.fill(); });
    },
  ],
};
void INK;
