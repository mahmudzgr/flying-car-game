// Ortak çizim yardımcıları. Sahip: Grafik. Dünya dönüşümü (y yukarı) varsayılır.
import { INK } from './palette.js';

export const TAU = Math.PI * 2;
/** Çizim zamanı/kalitesi: renderer her karede günceller (art/ fonksiyonları durum tutmaz, yalnızca bunu okur). */
export const ART = { t: 0, quality: 'high' };

/** Deterministik sahte rastgele: tamsayı → [0,1). */
export function hash(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Yuvarlatılmış dikdörtgen yolu (x,y = sol-alt; w,h pozitif). */
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Mevcut yolu doldur + konturla. */
export function fs(ctx, px, fill, lw = 2.2, ink = INK) {
  ctx.fillStyle = fill; ctx.fill();
  if (lw > 0) { ctx.lineWidth = lw * px; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
export function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
export function line(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }

/** Dünya (y yukarı) içinde yerel metin: ctx.scale(1,-1) ile çevrilir. size metre. */
export function text(ctx, str, x, y, size, fill, px, align = 'center', strokeW = 3) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, -1);
  ctx.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (strokeW) { ctx.lineWidth = strokeW * px; ctx.strokeStyle = INK; ctx.strokeText(str, 0, 0); }
  ctx.fillStyle = fill; ctx.fillText(str, 0, 0);
  ctx.restore();
}

/** Yay (zikzak) çizer: (x0,y0)→(x1,y1) arası n sarım, genişlik amp. */
export function coil(ctx, x0, y0, x1, y1, n, amp) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L, ny = dx / L;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  const lead = 0.12;                       // uçlarda düz
  ctx.lineTo(x0 + dx * lead, y0 + dy * lead);
  const m = n * 2;
  for (let i = 1; i < m; i++) {
    const t = lead + (1 - 2 * lead) * (i / m), s = (i % 2 ? 1 : -1) * amp;
    ctx.lineTo(x0 + dx * t + nx * s, y0 + dy * t + ny * s);
  }
  ctx.lineTo(x0 + dx * (1 - lead), y0 + dy * (1 - lead));
  ctx.lineTo(x1, y1);
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
