// Kargo: kasa, karpuz, yumurta kolisi, süt bidonu, piyano, balya (hasar durumlarıyla). Sahip: Grafik.
import { INK, CARGO_COLORS, shade, rgba } from './palette.js';
import { ART, TAU, rr, fs, circle, line, hash } from './util.js';
import { warnTri } from './objects.js';

/** id → hasar flaşı bitiş zamanı (ART.t). Renderer `cargoDamage` olayında çağırır. */
export const cargoFlash = new Map();
export function flashCargo(id, dur = 0.28) { cargoFlash.set(id, ART.t + dur); }
export function resetCargoFx() { cargoFlash.clear(); }

function crate(ctx, c, px) {
  const dmg = c.hpMax > 1 && c.hp < c.hpMax;
  const w = c.w, h = c.h, W = dmg ? '#b98a58' : '#d8a85c', Wd = shade(W, -0.2), Wl = shade(W, 0.3);
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h, 0.05); fs(ctx, px, W, 2.3);
  ctx.save(); ctx.clip();
  ctx.strokeStyle = Wd; ctx.lineWidth = 1.5 * px; ctx.beginPath();
  for (let i = 1; i < 4; i++) { const y = -h / 2 + (h * i) / 4; ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); } ctx.stroke();
  // çerçeve + çapraz destek
  ctx.lineWidth = 0.075; ctx.strokeStyle = Wd; ctx.beginPath(); ctx.rect(-w / 2 + 0.04, -h / 2 + 0.04, w - 0.08, h - 0.08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w / 2 + 0.05, -h / 2 + 0.05); ctx.lineTo(w / 2 - 0.05, h / 2 - 0.05); ctx.stroke();
  ctx.lineWidth = 0.02; ctx.strokeStyle = Wl; ctx.beginPath(); ctx.moveTo(-w / 2 + 0.07, h / 2 - 0.09); ctx.lineTo(w / 2 - 0.09, h / 2 - 0.09); ctx.stroke();
  ctx.restore();
  // metal köşeler
  ctx.fillStyle = '#8d95a0';
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * w / 2, sy * h / 2); ctx.lineTo(sx * (w / 2 - 0.16), sy * h / 2); ctx.lineTo(sx * w / 2, sy * (h / 2 - 0.16)); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.3 * px; ctx.strokeStyle = INK; ctx.stroke(); }
  if (dmg) { // çatlak + kırık tahta
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 0.035;
    ctx.beginPath(); ctx.moveTo(-w * 0.1, h / 2); ctx.lineTo(-w * 0.02, h * 0.15); ctx.lineTo(-w * 0.2, -h * 0.05); ctx.lineTo(-w * 0.08, -h * 0.3); ctx.lineTo(w * 0.05, -h / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.22, -h * 0.5); ctx.lineTo(w * 0.3, -h * 0.28); ctx.lineTo(w * 0.18, -h * 0.2); ctx.stroke();
    ctx.fillStyle = '#d8a85c'; ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.3); ctx.lineTo(w * 0.62, h * 0.22); ctx.lineTo(w * 0.55, h * 0.1); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.4 * px; ctx.stroke();
  }
  // "bu yüz yukarı" oku
  ctx.beginPath(); ctx.moveTo(0.02, 0.14); ctx.lineTo(0.02, -0.12); ctx.moveTo(-0.07, 0.04); ctx.lineTo(0.02, 0.15); ctx.lineTo(0.11, 0.04);
  ctx.lineWidth = 0.035; ctx.strokeStyle = '#e8453c'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}

function melonHalf(ctx, r, px, flip) {
  ctx.save(); if (flip) ctx.scale(-1, 1);
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5); ctx.closePath(); fs(ctx, px, '#3f8f45', 2);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.84, Math.PI * 0.5, Math.PI * 1.5); ctx.closePath(); fs(ctx, px, '#ff5a5f', 1.2);
  ctx.fillStyle = INK; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-r * 0.35, (i - 1) * r * 0.4, 0.018, 0.03, 0.4, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function melon(ctx, c, px) {
  const r = c.r;
  if (c.state === 'lost' && c.reason === 'broke' || c.hp < c.hpMax) { melonHalf(ctx, r, px, false); ctx.save(); ctx.translate(0.05, -0.05); ctx.rotate(0.5); melonHalf(ctx, r, px, true); ctx.restore(); return; }
  circle(ctx, 0, 0, r); fs(ctx, px, '#5fbf5a', 2.2);
  ctx.save(); ctx.clip();
  ctx.strokeStyle = '#2f7d3a'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
  for (const b of [-0.62, -0.18, 0.3, 0.74]) { ctx.beginPath(); ctx.moveTo(0, r * 1.05); ctx.quadraticCurveTo(r * b * 1.7, 0, 0, -r * 1.05); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(-r * 0.35, r * 0.4, r * 0.28, r * 0.12, 0.8, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
  ctx.beginPath(); rr(ctx, -0.02, r - 0.025, 0.04, 0.05, 0.015); fs(ctx, px, '#8a5f33', 1.2);
  circle(ctx, 0, 0, r); ctx.lineWidth = 2.2 * px; ctx.strokeStyle = INK; ctx.stroke();
}

function eggs(ctx, c, px) {
  const w = c.w, h = c.h, n = c.hpMax || 6, hp = c.hp, slot = (w - 0.06) / n;
  // koli tabanı (arka), yumurtalar, ön kenar
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h * 0.7, 0.04); fs(ctx, px, '#cdb78f', 2.2);
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + 0.03 + slot * (i + 0.5);
    if (i < hp) {
      ctx.beginPath(); ctx.ellipse(cx, h * 0.12, slot * 0.47, h * 0.36, 0, 0, TAU); fs(ctx, px, '#fffaf0', 1.5);
      ctx.beginPath(); ctx.ellipse(cx - slot * 0.14, h * 0.2, slot * 0.1, h * 0.12, 0.3, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
    } else { // kırık: sarı sızıntılı boş yuva
      ctx.beginPath(); ctx.ellipse(cx, -h * 0.02, slot * 0.42, h * 0.12, 0, 0, TAU); ctx.fillStyle = '#ffc928'; ctx.fill(); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - slot * 0.35, h * 0.1); ctx.lineTo(cx - slot * 0.12, h * 0.22); ctx.lineTo(cx + slot * 0.05, h * 0.08); ctx.lineTo(cx + slot * 0.35, h * 0.2);
      ctx.lineWidth = 1.5 * px; ctx.strokeStyle = '#d9c9a4'; ctx.stroke();
    }
  }
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h * 0.4, 0.04); fs(ctx, px, '#f4e6c8', 2.2);
  ctx.beginPath(); rr(ctx, -w * 0.2, -h * 0.4, w * 0.4, h * 0.2, 0.03); ctx.fillStyle = '#e8453c'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, -h * 0.3, 0.035, 0.026, 0, 0, TAU); ctx.fill();
}

function milk(ctx, c, px) {
  const dmg = c.hpMax > 1 && c.hp < c.hpMax;
  const w = c.w, h = c.h, B = dmg ? '#5d7898' : CARGO_COLORS.milk;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2 + 0.05); ctx.arcTo(-w / 2, -h / 2, -w / 2 + 0.06, -h / 2, 0.06); ctx.lineTo(w / 2 - 0.06, -h / 2); ctx.arcTo(w / 2, -h / 2, w / 2, -h / 2 + 0.06, 0.06);
  ctx.lineTo(w / 2, h * 0.16); ctx.quadraticCurveTo(w / 2, h * 0.28, w * 0.28, h * 0.32); ctx.lineTo(w * 0.22, h * 0.42); ctx.lineTo(w * 0.22, h * 0.46);
  ctx.lineTo(-w * 0.22, h * 0.46); ctx.lineTo(-w * 0.22, h * 0.42); ctx.lineTo(-w * 0.28, h * 0.32); ctx.quadraticCurveTo(-w / 2, h * 0.28, -w / 2, h * 0.16); ctx.closePath();
  fs(ctx, px, B, 2.3);
  ctx.save(); ctx.clip();
  ctx.fillStyle = shade(B, -0.2); ctx.fillRect(-w / 2, -h / 2, w, 0.1);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-w / 2 + 0.04, -h * 0.3, 0.05, h * 0.55);
  ctx.strokeStyle = shade(B, -0.3); ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(-w / 2, h * 0.15); ctx.lineTo(w / 2, h * 0.15); ctx.moveTo(-w / 2, -h * 0.34); ctx.lineTo(w / 2, -h * 0.34); ctx.stroke();
  ctx.restore();
  // etiket
  ctx.beginPath(); rr(ctx, -w * 0.32, -h * 0.28, w * 0.64, h * 0.34, 0.04); fs(ctx, px, '#fffaf0', 1.6);
  ctx.beginPath(); ctx.moveTo(0, -0.0); ctx.quadraticCurveTo(0.07, -0.09, 0, -0.17); ctx.quadraticCurveTo(-0.07, -0.09, 0, 0); ctx.fillStyle = '#3d7fd6'; ctx.fill();
  if (dmg) { // ezik: koyu iç bükey leke + çizgi
    ctx.save(); ctx.beginPath(); ctx.ellipse(w * 0.12, -h * 0.05, w * 0.22, h * 0.2, 0.4, 0, TAU); ctx.fillStyle = 'rgba(30,30,50,.35)'; ctx.fill(); ctx.lineWidth = 1.4 * px; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  }
  // kapak + kulplar (hasarda eğik)
  ctx.save(); if (dmg) { ctx.translate(0, h * 0.44); ctx.rotate(-0.28); ctx.translate(0, -h * 0.44); }
  ctx.beginPath(); rr(ctx, -w * 0.27, h * 0.44, w * 0.54, 0.09, 0.04); fs(ctx, px, '#c9d1d8', 1.8); ctx.restore();
  ctx.lineWidth = 0.04; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(-w / 2, h * 0.02, 0.07, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(w / 2, h * 0.02, 0.07, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
}

function piano(ctx, c, px) {
  const w = c.w, h = c.h, broken = c.hp < c.hpMax;
  const K = '#2b2b33', Kl = '#44444f';
  // gövde
  ctx.beginPath(); rr(ctx, -w / 2, -h * 0.42, w, h * 0.92, 0.07); fs(ctx, px, K, 2.4);
  ctx.beginPath(); rr(ctx, -w / 2 - 0.02, h * 0.4, w + 0.04, 0.1, 0.04); fs(ctx, px, Kl, 2);                     // üst kapak
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-w / 2 + 0.06, h * 0.12, w - 0.12, 0.05);
  // nota sehpası
  ctx.beginPath(); rr(ctx, -w * 0.28, h * 0.1, w * 0.56, h * 0.26, 0.04); fs(ctx, px, '#3a3a45', 1.8);
  ctx.strokeStyle = '#b9b9c4'; ctx.lineWidth = 0.012; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-w * 0.24, h * 0.14 + i * 0.045); ctx.lineTo(w * 0.24, h * 0.14 + i * 0.045); } ctx.stroke();
  // klavye
  const ky = -h * 0.02, kh = h * 0.16, kw = w * 0.9, kx = -kw / 2;
  ctx.beginPath(); rr(ctx, kx, ky, kw, kh, 0.02); fs(ctx, px, '#fffaf0', 1.8);
  const n = 18;
  ctx.fillStyle = INK; ctx.strokeStyle = 'rgba(42,34,48,.5)'; ctx.lineWidth = 1 * px;
  for (let i = 1; i < n; i++) { const x = kx + (kw * i) / n; ctx.beginPath(); ctx.moveTo(x, ky); ctx.lineTo(x, ky + kh); ctx.stroke(); }
  for (let i = 0; i < n - 1; i++) { if ([2, 6, 9, 13, 16].includes(i)) continue; const x = kx + (kw * (i + 1)) / n - kw / n * 0.22; if (broken && (i === 4 || i === 11)) continue; ctx.fillRect(x, ky + kh * 0.38, (kw / n) * 0.44, kh * 0.62); }
  // pedallar + bacaklar + tekerlek
  ctx.beginPath(); rr(ctx, -w * 0.08, -h * 0.4, 0.04, 0.1, 0.02); fs(ctx, px, '#d9b45a', 1.2); ctx.beginPath(); rr(ctx, w * 0.04, -h * 0.4, 0.04, 0.1, 0.02); fs(ctx, px, '#d9b45a', 1.2);
  for (const sx of [-1, 1]) { ctx.beginPath(); rr(ctx, sx * w * 0.42 - 0.06, -h * 0.5, 0.12, 0.14, 0.03); fs(ctx, px, Kl, 1.8); circle(ctx, sx * w * 0.42, -h * 0.5, 0.045); fs(ctx, px, '#c9d1d8', 1.4); }
  if (broken) { // çatlak + kırık kapak
    ctx.beginPath(); ctx.moveTo(-w * 0.35, h * 0.4); ctx.lineTo(-w * 0.2, h * 0.28); ctx.lineTo(-w * 0.28, h * 0.12); ctx.lineTo(-w * 0.1, -h * 0.06);
    ctx.lineWidth = 0.025; ctx.strokeStyle = '#e8453c'; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.32, h * 0.4); ctx.lineTo(w * 0.24, h * 0.25); ctx.lineTo(w * 0.34, h * 0.1); ctx.stroke();
  }
}

function bale(ctx, c, px) {
  const r = c.r, Y = CARGO_COLORS.bale;
  circle(ctx, 0, 0, r); fs(ctx, px, Y, 2.4);
  ctx.save(); ctx.clip();
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(Y, -0.22); ctx.lineWidth = 0.035;
  ctx.beginPath(); for (let i = 0; i < 5; i++) { const rad = r * (0.18 + i * 0.17); ctx.moveTo(rad, 0); ctx.arc(0, 0, rad, 0, TAU * 0.88); } ctx.stroke();      // sarmal
  ctx.strokeStyle = shade(Y, 0.4); ctx.lineWidth = 0.02; ctx.beginPath();
  for (let i = 0; i < 18; i++) { const a = hash(i + 7) * TAU, d = r * (0.25 + hash(i + 3) * 0.7); const x = Math.cos(a) * d, y = Math.sin(a) * d; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + 1.3) * 0.09, y + Math.sin(a + 1.3) * 0.09); }
  ctx.stroke();
  // sicim bantları
  ctx.strokeStyle = '#8a5f33'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(-r, -r * 0.38); ctx.lineTo(r, -r * 0.38); ctx.moveTo(-r, r * 0.38); ctx.lineTo(r, r * 0.38); ctx.stroke();
  ctx.restore();
  circle(ctx, 0, 0, r); ctx.lineWidth = 2.4 * px; ctx.strokeStyle = INK; ctx.stroke();
}

function generic(ctx, c, px) {
  ctx.beginPath(); if (c.r > 0) ctx.arc(0, 0, c.r, 0, TAU); else rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 0.05);
  fs(ctx, px, CARGO_COLORS[c.type] ?? '#ccc', 2.2);
}

const DRAW = { crate, watermelon: melon, eggs, milk, piano, bale };
/** Kargo parçası. c = snapshot.cargo[i] (ara değerlenmiş). */
export function drawCargo(ctx, c, px) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
  if (c.state === 'lost') ctx.globalAlpha = c.reason === 'broke' ? 0.9 : 0.5;
  (DRAW[c.type] ?? generic)(ctx, c, px);
  if (c.state === 'onboard' && c.hpMax > 1 && c.hp < c.hpMax && c.type !== 'eggs') { const bx = c.r > 0 ? c.r * 0.7 : c.w / 2 - 0.02, by = c.r > 0 ? c.r * 0.7 : c.h / 2 - 0.02; ctx.save(); ctx.rotate(-c.a); ctx.translate(Math.cos(c.a) * bx - Math.sin(c.a) * by, Math.sin(c.a) * bx + Math.cos(c.a) * by); warnTri(ctx, 0, 0.0, 0.7, px); ctx.restore(); }
  const f = cargoFlash.get(c.id);
  if (f !== undefined) {
    const k = (f - ART.t) / 0.28;
    if (k > 0) { ctx.beginPath(); if (c.r > 0) ctx.arc(0, 0, c.r, 0, TAU); else rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 0.05); ctx.fillStyle = `rgba(255,50,40,${0.55 * k})`; ctx.fill(); }
    else cargoFlash.delete(c.id);
  }
  ctx.restore();
}
void line; void rgba;
