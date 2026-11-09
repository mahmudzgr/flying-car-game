// Araçlar: Tosun (pikap), Zıpır (bagi), Paşa (traktör + römork), Koca (kamyon). Sahip: Grafik.
// Her şey şasi yerel çerçevesinde (orijin = şasi kutusu merkezi, +x burun, y yukarı) çizilir; süspansiyon
// tekerlek ile bağlantı noktası arasındaki farktan canlanır. İki katman: Back (tekerlek+gövde) → sürücü → Front (kapı/cam).
import { INK, VEHICLE_COLORS, shade, rgba, mix } from './palette.js';
import { ART, TAU, rr, fs, circle, line, coil, clamp, hash } from './util.js';

const DARK = '#1c1722', TIRE = '#3a3340', CHROME = '#dfe6ec', CREAM = '#fff1d0', GLASS = '#bfe6f5';

/** Sim bu araçları göndermese de çizebilmek için yedek geometri (config.js ile aynı). */
export const FALLBACK = {
  pasa: {
    parts: [{ part: 'chassis', x: 0, y: 0, w: 2.8, h: 1.0 }, { part: 'cab', x: 0.1, y: 1.0, w: 1.2, h: 0.9 }, { part: 'roof', x: 0.1, y: 1.5, w: 1.1, h: 0.1 }, { part: 'chassis', x: 1.1, y: 0.45, w: 0.6, h: 0.5 }],
    wheels: [{ id: 'rear', x: -0.95, y: -0.06, r: 0.62 }, { id: 'front', x: 1.2, y: -0.3, r: 0.38 }],
    wheelR: 0.38, seat: { x: 0.1, y: 0.95 },
    trailer: { hitch: { x: -1.5, y: 0.08 }, parts: [{ part: 'trailer', x: -2.0, y: 0.0, w: 3.6, h: 0.25 }, { part: 'trailer', x: -3.75, y: 0.35, w: 0.1, h: 0.7 }, { part: 'trailer', x: -0.3, y: 0.35, w: 0.1, h: 0.7 }, { part: 'trailer', x: -0.7, y: -0.1, w: 1.4, h: 0.1 }], wheels: [{ id: 'trailer', x: -2.9, y: -0.3, r: 0.45 }] },
  },
  koca: {
    parts: [{ part: 'chassis', x: 0, y: 0, w: 6.0, h: 1.3 }, { part: 'cab', x: 2.15, y: 1.15, w: 1.5, h: 1.0 }, { part: 'roof', x: 2.15, y: 1.7, w: 1.4, h: 0.1 }, { part: 'chassis', x: -2.95, y: 1.0, w: 0.1, h: 0.7 }],
    wheels: [{ id: 'front', x: 2.3, y: -0.5 }, { id: 'rear', x: -1.7, y: -0.5 }, { id: 'rear2', x: -2.8, y: -0.5 }],
    wheelR: 0.55, seat: { x: 2.1, y: 1.15 },
  },
};
/** Egzoz çıkış noktası (şasi yerel) — partikül için. */
export const EXHAUST = { tosun: { x: -1.95, y: -0.36 }, zipir: { x: -1.46, y: 0.52 }, pasa: { x: 0.97, y: 1.52 }, koca: { x: 1.25, y: 2.1 } };
/** Ön far konumu (şasi yerel). */
export const HEADLIGHT = { tosun: { x: 1.8, y: 0.28 }, zipir: { x: 1.3, y: 0.18 }, pasa: { x: 1.4, y: 0.2 }, koca: { x: 2.98, y: 0.3 } };

function geo(vs, id) {
  if (vs && vs.parts && vs.parts.length) return vs;
  return { ...(FALLBACK[id] ?? FALLBACK.pasa), ...(vs ?? {}), parts: FALLBACK[id]?.parts, wheels: vs?.wheels?.length ? vs.wheels : FALLBACK[id]?.wheels };
}
function bbox(parts, role) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
  for (const p of parts) if (!role || p.part === role) { n++; x0 = Math.min(x0, p.x - p.w / 2); x1 = Math.max(x1, p.x + p.w / 2); y0 = Math.min(y0, p.y - p.h / 2); y1 = Math.max(y1, p.y + p.h / 2); }
  return n ? { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 } : null;
}

// ---------------------------------------------------------------- tekerlekler
function wheelBlur(ctx, r, spin, col) {
  const b = clamp((Math.abs(spin) - 20) / 22, 0, 0.85);
  if (b > 0.02) { ctx.globalAlpha = b; circle(ctx, 0, 0, r); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; }
}
/** Tek tekerlek; ctx şasi yerelinde, (0,0) = teker merkezi, dönüş uygulanmış. */
function wheelArt(ctx, id, r, spin, px, k) {
  // Lastik
  if (id === 'zipir') {
    // iri tırtıklı lastik
    const n = 14;
    ctx.fillStyle = DARK;
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; ctx.save(); ctx.rotate(a); ctx.beginPath(); rr(ctx, r - 0.02, -0.055, 0.075, 0.11, 0.025); ctx.fill(); ctx.lineWidth = 1.6 * px; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore(); }
    circle(ctx, 0, 0, r); fs(ctx, px, TIRE, 2.2);
    circle(ctx, 0, 0, r * 0.78); ctx.lineWidth = 1.4 * px; ctx.strokeStyle = '#51485a'; ctx.stroke();
    // jant: açık gri, 6 delik
    circle(ctx, 0, 0, r * 0.56); fs(ctx, px, '#e6ebef', 1.8);
    ctx.fillStyle = DARK;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; circle(ctx, Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, r * 0.1); ctx.fill(); }
    wheelBlur(ctx, r * 0.56, spin, '#e6ebef');
    circle(ctx, 0, 0, r * 0.15); fs(ctx, px, k, 1.6);
    return;
  }
  if (id === 'pasa') {
    // traktör: şevron dişli iri lastik
    const n = r > 0.5 ? 16 : 12;
    ctx.fillStyle = TIRE;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU; ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(r - 0.03, -0.07); ctx.lineTo(r + 0.07, -0.02); ctx.lineTo(r + 0.07, 0.07); ctx.lineTo(r - 0.03, 0.03); ctx.closePath();
      ctx.fillStyle = DARK; ctx.fill(); ctx.lineWidth = 1.5 * px; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
    }
    circle(ctx, 0, 0, r); fs(ctx, px, TIRE, 2.2);
    circle(ctx, 0, 0, r * 0.62); fs(ctx, px, k, 2);
    circle(ctx, 0, 0, r * 0.62); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = shade(k, 0.35); ctx.stroke();
    ctx.fillStyle = DARK;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; circle(ctx, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.05); ctx.fill(); }
    wheelBlur(ctx, r * 0.62, spin, k);
    circle(ctx, 0, 0, r * 0.14); fs(ctx, px, CHROME, 1.6);
    return;
  }
  if (id === 'koca') {
    circle(ctx, 0, 0, r); fs(ctx, px, TIRE, 2.3);
    circle(ctx, 0, 0, r * 0.84); ctx.lineWidth = 1.5 * px; ctx.strokeStyle = '#554b5e'; ctx.stroke();
    circle(ctx, 0, 0, r * 0.58); fs(ctx, px, '#d7dde3', 2);
    ctx.fillStyle = INK;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; circle(ctx, Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38, r * 0.06); ctx.fill(); }
    wheelBlur(ctx, r * 0.58, spin, '#d7dde3');
    circle(ctx, 0, 0, r * 0.22); fs(ctx, px, k, 1.8);
    return;
  }
  // Tosun: klasik lastik + 5 kollu jant
  circle(ctx, 0, 0, r); fs(ctx, px, TIRE, 2.2);
  circle(ctx, 0, 0, r * 0.8); ctx.lineWidth = 1.3 * px; ctx.strokeStyle = '#554b5e'; ctx.stroke();
  circle(ctx, 0, 0, r * 0.62); fs(ctx, px, '#e9eef2', 1.8);
  ctx.lineWidth = 0.075; ctx.strokeStyle = shade('#e9eef2', -0.45); ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56); }
  ctx.stroke();
  wheelBlur(ctx, r * 0.6, spin, '#e9eef2');
  circle(ctx, 0, 0, r * 0.17); fs(ctx, px, k, 1.6);
}

/** Süspansiyon: amortisör + yay. (ax,ay) = şasi üzerindeki üst bağlantı, (hx,hy) = teker merkezi (yerel). */
function strut(ctx, ax, ay, hx, hy, px, spring, thick = 0.075, coils = 5) {
  const dx = hx - ax, dy = hy - ay, L = Math.hypot(dx, dy) || 1e-6;
  const mx = ax + dx * 0.5, my = ay + dy * 0.5;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // amortisör gövdesi (koyu) + piston (krom)
  line(ctx, ax, ay, mx, my); ctx.lineWidth = thick + 3.4 * px; ctx.strokeStyle = INK; ctx.stroke();
  line(ctx, ax, ay, mx, my); ctx.lineWidth = thick; ctx.strokeStyle = '#6b6475'; ctx.stroke();
  line(ctx, mx, my, hx, hy); ctx.lineWidth = thick * 0.55 + 3 * px; ctx.strokeStyle = INK; ctx.stroke();
  line(ctx, mx, my, hx, hy); ctx.lineWidth = thick * 0.55; ctx.strokeStyle = CHROME; ctx.stroke();
  // yay
  coil(ctx, ax, ay, hx, hy, coils, thick * 1.05);
  ctx.lineWidth = 0.05 + 3.2 * px; ctx.strokeStyle = INK; ctx.stroke();
  coil(ctx, ax, ay, hx, hy, coils, thick * 1.05);
  ctx.lineWidth = 0.05; ctx.strokeStyle = spring; ctx.stroke();
  circle(ctx, hx, hy, 0.05); fs(ctx, px, CHROME, 1.4);
  return L;
}

// ---------------------------------------------------------------- Path2D önbelleği (statik geometri)
const P = {};
function path(key, build) { return P[key] ?? (P[key] = build(new Path2D())); }
function pRR(p, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
}
function drawP(ctx, p, fill, px, lw = 2.2) { ctx.fillStyle = fill; ctx.fill(p); if (lw) { ctx.lineWidth = lw * px; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke(p); } }

function lights(ctx, v, px, hl, tl, big = 1) {
  // fren / geri vites lambası
  const on = v.brake > 0.25 || v.reversing;
  ctx.save(); ctx.translate(tl.x, tl.y);
  ctx.beginPath(); rr(ctx, -0.05 * big, -0.07 * big, 0.1 * big, 0.14 * big, 0.03);
  fs(ctx, px, v.reversing ? '#ffffff' : on ? '#ff3b30' : '#a8302a', 1.4);
  if (on) { ctx.globalAlpha = 0.28; circle(ctx, -0.08, 0, 0.14 * big); ctx.fillStyle = v.reversing ? '#ffffff' : '#ff3b30'; ctx.fill(); ctx.globalAlpha = 1; }
  ctx.restore();
  // far
  ctx.save(); ctx.translate(hl.x, hl.y);
  if (ART.biome === 'bataklik') {
    const g = ctx.createLinearGradient(0, 0, 4, 0); g.addColorStop(0, 'rgba(255,244,180,.45)'); g.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, 0.9); ctx.lineTo(4, -0.7); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
  }
  circle(ctx, 0, 0, 0.13 * big); fs(ctx, px, '#fff6c8', 1.6);
  circle(ctx, 0.02, 0.02, 0.05 * big); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
}

// ================================================================ TOSUN
function tosunBody(ctx, v, vs, px, g, hubs) {
  const C = VEHICLE_COLORS.tosun, Cd = shade(C, -0.22), Cl = shade(C, 0.4);
  const body = path('tosun.body', (p) => {
    // yatak + kapı + kaput tek siluet
    p.moveTo(-1.7, -0.45);
    p.arcTo(-1.8, -0.45, -1.8, -0.3, 0.1); p.lineTo(-1.8, 0.45);
    p.lineTo(0.6, 0.45); p.lineTo(0.6, 0.75);
    p.lineTo(1.3, 0.75);
    p.quadraticCurveTo(1.5, 0.74, 1.62, 0.7);          // kaput
    p.quadraticCurveTo(1.78, 0.66, 1.8, 0.5);
    p.lineTo(1.8, -0.32); p.arcTo(1.8, -0.45, 1.68, -0.45, 0.1); p.closePath();
    return p;
  });
  drawP(ctx, body, C, px, 2.4);
  // alt gölge şeridi
  ctx.save(); ctx.clip(body);
  ctx.fillStyle = Cd; ctx.fillRect(-1.9, -0.5, 3.8, 0.2);
  ctx.fillStyle = Cl; ctx.globalAlpha = 0.55; ctx.fillRect(-1.9, 0.38, 2.6, 0.07); ctx.globalAlpha = 1;
  // krem yan şerit
  ctx.fillStyle = CREAM; ctx.fillRect(-1.9, 0.02, 3.8, 0.1);
  ctx.lineWidth = 1.4 * px; ctx.strokeStyle = rgba(INK, 0.55);
  ctx.beginPath(); ctx.moveTo(-1.9, 0.02); ctx.lineTo(1.9, 0.02); ctx.moveTo(-1.9, 0.12); ctx.lineTo(1.9, 0.12); ctx.stroke();
  // kapı çizgisi
  ctx.beginPath(); ctx.moveTo(0.62, 0.7); ctx.lineTo(0.62, -0.3); ctx.moveTo(1.28, 0.7); ctx.lineTo(1.28, -0.3); ctx.strokeStyle = rgba(INK, 0.5); ctx.stroke();
  ctx.restore();
  // tekerlek yuvaları (karanlık kemer)
  ctx.save(); ctx.clip(body);
  for (const h of hubs) { circle(ctx, h.ax, h.ay, g.wheelR + 0.1); ctx.fillStyle = DARK; ctx.fill(); }
  ctx.restore();
  // tampon
  ctx.beginPath(); rr(ctx, -1.9, -0.4, 0.12, 0.16, 0.04); fs(ctx, px, '#8d95a0', 1.8);
  ctx.beginPath(); rr(ctx, 1.74, -0.38, 0.13, 0.18, 0.05); fs(ctx, px, CHROME, 1.8);
  // kasa içi (arka duvar tarafı): iç panel koyu
  ctx.beginPath(); rr(ctx, -1.72, 0.45, 0.1, 0.46, 0.03); fs(ctx, px, Cd, 2);
  ctx.beginPath(); rr(ctx, -1.74, 0.88, 0.14, 0.06, 0.03); fs(ctx, px, Cl, 1.6);       // tahta üst kenar
  ctx.beginPath(); rr(ctx, -1.8, 0.42, 2.4, 0.07, 0.03); fs(ctx, px, Cl, 1.8);          // yatak dudağı
  // çamurluk (arka)
  ctx.beginPath(); rr(ctx, -1.64 - 0.12, -0.45, 0.07, 0.3, 0.03); fs(ctx, px, DARK, 1.2);
  // koltuk arkalığı + kabin arka duvarı
  ctx.beginPath(); rr(ctx, 0.6, 0.45, 0.2, 0.55, 0.07); fs(ctx, px, Cd, 2.2);
  ctx.beginPath(); rr(ctx, 0.66, 0.55, 0.08, 0.3, 0.03); ctx.fillStyle = shade(Cd, -0.3); ctx.fill();
  // roll çubuğu (tavan): ince tüp
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.7, 0.98); ctx.lineTo(0.7, 1.04); ctx.lineTo(1.45, 1.04); ctx.lineTo(1.34, 0.78);
  ctx.lineWidth = 0.075 + 3.4 * px; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 0.075; ctx.strokeStyle = Cl; ctx.stroke();
  // egzoz borusu
  ctx.beginPath(); rr(ctx, -1.97, -0.4, 0.14, 0.09, 0.04); fs(ctx, px, '#59616b', 1.4);
  // ön cam (sürücünün arkasında kalır; yarı saydam)
  ctx.beginPath(); ctx.moveTo(1.3, 0.75); ctx.lineTo(1.22, 1.04); ctx.lineTo(1.45, 1.04); ctx.lineTo(1.4, 0.74); ctx.closePath();
  ctx.fillStyle = rgba(GLASS, 0.45); ctx.fill(); ctx.lineWidth = 1.8 * px; ctx.strokeStyle = INK; ctx.stroke();
}
function tosunFront(ctx, v, vs, px) {
  const C = VEHICLE_COLORS.tosun, Cd = shade(C, -0.22), Cl = shade(C, 0.4);
  // kapı üst kenarı ve cam: sürücünün alt gövdesini örter
  ctx.beginPath(); rr(ctx, 0.6, 0.45, 0.72, 0.3, 0.06); fs(ctx, px, C, 2.2);
  ctx.beginPath(); rr(ctx, 0.66, 0.68, 0.6, 0.06, 0.03); ctx.fillStyle = Cl; ctx.fill();
  ctx.beginPath(); rr(ctx, 0.9, 0.52, 0.22, 0.07, 0.03); fs(ctx, px, CHROME, 1.3);   // kapı kolu
  // ayna
  ctx.beginPath(); rr(ctx, 1.26, 0.78, 0.06, 0.12, 0.03); fs(ctx, px, Cd, 1.4);
  // kaput çizgisi + ızgara
  ctx.lineWidth = 1.4 * px; ctx.strokeStyle = rgba(INK, 0.55);
  ctx.beginPath(); ctx.moveTo(1.4, 0.68); ctx.lineTo(1.78, 0.52); ctx.stroke();
}

// ================================================================ ZIPIR
function zipirBody(ctx, v, vs, px, g, hubs, t) {
  const C = VEHICLE_COLORS.zipir, Cd = shade(C, -0.25), Cl = shade(C, 0.42), STEEL = '#cfd6dc';
  // motor bloğu (arka) + egzoz
  ctx.beginPath(); rr(ctx, -1.3, 0.3, 0.8, 0.42, 0.08); fs(ctx, px, '#5d6671', 2.2);
  ctx.lineWidth = 1.4 * px; ctx.strokeStyle = rgba('#ffffff', 0.35);
  ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-1.22 + i * 0.18, 0.4); ctx.lineTo(-1.22 + i * 0.18, 0.66); } ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1.28, 0.55); ctx.lineTo(-1.46, 0.52); ctx.lineWidth = 0.09 + 3.4 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 0.09; ctx.strokeStyle = CHROME; ctx.stroke();
  // gövde (tekne)
  const body = path('zipir.body', (p) => {
    p.moveTo(-1.2, -0.35); p.lineTo(-1.3, -0.1); p.lineTo(-1.3, 0.35); p.lineTo(0.55, 0.35);
    p.quadraticCurveTo(0.8, 0.5, 1.0, 0.42); p.quadraticCurveTo(1.34, 0.36, 1.34, 0.12);
    p.lineTo(1.3, -0.25); p.quadraticCurveTo(1.25, -0.35, 1.1, -0.35); p.closePath(); return p;
  });
  drawP(ctx, body, C, px, 2.4);
  ctx.save(); ctx.clip(body);
  ctx.fillStyle = Cd; ctx.fillRect(-1.4, -0.4, 2.8, 0.16);
  ctx.fillStyle = Cl; ctx.globalAlpha = 0.6; ctx.fillRect(-1.4, 0.27, 2.8, 0.07); ctx.globalAlpha = 1;
  // numara yuvarlağı
  circle(ctx, -0.05, 0.02, 0.2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.8 * px; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.11, 0.1); ctx.lineTo(0.09, 0.1); ctx.lineTo(-0.1, -0.1); ctx.lineTo(0.1, -0.1); ctx.lineWidth = 0.055; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
  // tekerlek kemer çizgileri: kısa çamurluk
  for (const h of hubs) {
    ctx.beginPath(); ctx.arc(h.ax, h.ay, g.wheelR + 0.05, Math.PI * 0.05, Math.PI * 0.95); ctx.lineWidth = 0.07 + 3.4 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = 0.07; ctx.strokeStyle = C; ctx.stroke();
  }
  // koltuk
  ctx.beginPath(); rr(ctx, -0.35, 0.32, 0.55, 0.5, 0.12); fs(ctx, px, '#3b3340', 2.2);
  ctx.beginPath(); rr(ctx, -0.3, 0.32, 0.4, 0.14, 0.06); ctx.fillStyle = C; ctx.fill();
  // roll kafesi (tüp)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const tube = (pts, w = 0.08) => {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineWidth = w + 3.4 * px; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = STEEL; ctx.stroke();
  };
  tube([-0.2, 0.35, -0.2, 1.15, 0.8, 1.15, 0.8, 0.35]);
  tube([-0.2, 1.15, -0.75, 0.62], 0.06);
  tube([-0.2, 0.75, 0.8, 0.75], 0.05);
  tube([0.8, 1.15, 1.18, 0.55], 0.06);                     // ön destek
  // ön tampon çubuğu + farlar
  tube([1.34, 0.35, 1.52, 0.2, 1.4, -0.12], 0.07);
  // anten + flama
  const ax = -1.1, ay = 0.7;
  const bend = clamp(-(v.vx ?? 0) * 0.022 - (v.w ?? 0) * 0.05, -0.55, 0.12) , fl = Math.sin(t * 19) * 0.04;
  const tx = ax + bend * 0.5 - 0.02, ty = ay + 1.55;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + bend * 0.15, ay + 0.8, tx, ty);
  ctx.lineWidth = 0.025 + 3 * px; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 0.025; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 0.3, ty + 0.1 + fl, tx - 0.55 + bend, ty - 0.02 + fl * 2); ctx.lineTo(tx - 0.02, ty - 0.2); ctx.closePath();
  fs(ctx, px, '#ffd23c', 1.8);
}
function zipirFront(ctx, v, vs, px) {
  const C = VEHICLE_COLORS.zipir, Cl = shade(C, 0.42);
  // yan kapı/çamurluk paneli: sürücünün bacaklarını örter
  ctx.beginPath(); ctx.moveTo(-0.38, 0.35); ctx.lineTo(0.88, 0.35); ctx.lineTo(0.82, 0.62); ctx.quadraticCurveTo(0.4, 0.66, 0.1, 0.6); ctx.lineTo(-0.38, 0.55); ctx.closePath();
  fs(ctx, px, C, 2.2);
  ctx.beginPath(); rr(ctx, -0.3, 0.52, 1.0, 0.05, 0.02); ctx.fillStyle = Cl; ctx.fill();
  // direksiyon
  ctx.beginPath(); ctx.moveTo(0.62, 0.62); ctx.lineTo(0.55, 0.98); ctx.lineWidth = 0.05 + 3 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 0.05; ctx.strokeStyle = '#59616b'; ctx.stroke();
  ctx.save(); ctx.translate(0.55, 0.98); ctx.rotate(0.35); ctx.beginPath(); ctx.ellipse(0, 0, 0.05, 0.17, 0, 0, TAU); fs(ctx, px, '#59616b', 1.8); ctx.restore();
}

// ================================================================ PAŞA (traktör + römork)
function pasaBody(ctx, v, vs, px, g, hubs, t) {
  const C = VEHICLE_COLORS.pasa, Cd = shade(C, -0.25), Cl = shade(C, 0.4), Y = '#f0c83c';
  const chs = g.parts.filter((p) => p.part === 'chassis'), main = chs[0], hood = chs[1] ?? { x: 1.1, y: 0.45, w: 0.6, h: 0.5 };
  const cab = bbox(g.parts, 'cab') ?? { x0: -0.5, x1: 0.7, y0: 0.55, y1: 1.45 }, roof = bbox(g.parts, 'roof');
  const x0 = main.x - main.w / 2, x1 = main.x + main.w / 2, yb = main.y - main.h / 2, yt = main.y + main.h / 2;
  const hx0 = hood.x - hood.w / 2, hx1 = hood.x + hood.w / 2, hyt = hood.y + hood.h / 2;
  const rear = hubs.find((h) => h.id === 'rear') ?? hubs[0], R = rear.w.r;
  // gövde bloğu (şanzıman/şasi)
  ctx.beginPath(); rr(ctx, x0, yb, x1 - x0, yt - yb - 0.12, 0.1); fs(ctx, px, Cd, 2.3);
  ctx.beginPath(); rr(ctx, x0, yb + 0.5, x1 - x0, 0.28, 0.06); fs(ctx, px, C, 2.2);                               // gövde üst
  ctx.fillStyle = Y; ctx.fillRect(x0 + 0.02, yb + 0.58, x1 - x0 - 0.04, 0.07);
  // motor kaputu
  ctx.beginPath(); ctx.moveTo(hx0, yb + 0.1); ctx.lineTo(hx0, hyt - 0.12); ctx.quadraticCurveTo(hx0, hyt, hx0 + 0.14, hyt); ctx.lineTo(hx1 - 0.14, hyt - 0.02);
  ctx.quadraticCurveTo(hx1, hyt - 0.04, hx1, hyt - 0.2); ctx.lineTo(hx1, yb + 0.1); ctx.closePath(); fs(ctx, px, C, 2.4);
  ctx.save(); ctx.clip();
  ctx.fillStyle = Cl; ctx.globalAlpha = 0.5; ctx.fillRect(hx0, hyt - 0.1, hx1 - hx0, 0.06); ctx.globalAlpha = 1;
  ctx.fillStyle = Y; ctx.fillRect(hx0, yb + 0.55, hx1 - hx0, 0.07);
  ctx.restore();
  ctx.lineWidth = 1.5 * px; ctx.strokeStyle = INK; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const gx = hx1 - 0.1 - i * 0.07; ctx.moveTo(gx, hyt - 0.1); ctx.lineTo(gx, yb + 0.7); } ctx.stroke();
  // egzoz borusu + kapak
  const ex = hx0 + 0.22;
  ctx.beginPath(); rr(ctx, ex - 0.05, hyt - 0.05, 0.1, 0.75, 0.03); fs(ctx, px, '#59616b', 1.8);
  ctx.beginPath(); rr(ctx, ex - 0.09, hyt + 0.66, 0.18, 0.07, 0.03); fs(ctx, px, '#3c434b', 1.6);
  // arka devasa çamurluk
  const rx = rear.ax, ry = rear.ay;
  ctx.beginPath(); ctx.arc(rx, ry, R + 0.1, Math.PI * 0.02, Math.PI * 0.98); ctx.lineTo(rx - R - 0.1, ry - 0.1); ctx.lineTo(rx + R + 0.1, ry - 0.1); ctx.closePath();
  fs(ctx, px, C, 2.4);
  ctx.beginPath(); ctx.arc(rx, ry, R + 0.1, Math.PI * 0.1, Math.PI * 0.9); ctx.lineWidth = 0.05; ctx.strokeStyle = Cl; ctx.stroke();
  // koltuk
  const sx = g.seat?.x ?? 0.1;
  ctx.beginPath(); rr(ctx, sx - 0.32, cab.y0 - 0.02, 0.55, 0.2, 0.07); fs(ctx, px, '#3b3340', 2.2);
  ctx.beginPath(); rr(ctx, sx - 0.36, cab.y0 - 0.02, 0.16, 0.62, 0.07); fs(ctx, px, '#3b3340', 2.2);
  // kabin: direkler + tente
  ctx.lineCap = 'round';
  for (const cx of [cab.x0 + 0.04, cab.x1 - 0.04]) { ctx.beginPath(); ctx.moveTo(cx, cab.y0 - 0.05); ctx.lineTo(cx, cab.y1 + 0.02); ctx.lineWidth = 0.07 + 3.4 * px; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 0.07; ctx.strokeStyle = CHROME; ctx.stroke(); }
  const rt = roof ?? { x0: cab.x0, x1: cab.x1, y0: cab.y1, y1: cab.y1 + 0.1 };
  ctx.beginPath(); rr(ctx, rt.x0 - 0.1, rt.y0 - 0.02, rt.x1 - rt.x0 + 0.2, rt.y1 - rt.y0 + 0.06, 0.06); fs(ctx, px, Y, 2.2);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(rt.x0, rt.y1 + 0.02, rt.x1 - rt.x0, 0.025);
  // çeki kancası (römork bağlantısı)
  ctx.beginPath(); rr(ctx, x0 - 0.12, yb + 0.55, 0.2, 0.12, 0.05); fs(ctx, px, '#59616b', 1.8);
  circle(ctx, x0 - 0.04, yb + 0.61, 0.04); ctx.fillStyle = DARK; ctx.fill();
}
function pasaFront(ctx, v, vs, px, g) {
  const sx = g.seat?.x ?? 0.1, cab = bbox(g.parts, 'cab') ?? { y0: 0.55 };
  // direksiyon simidi
  ctx.beginPath(); ctx.moveTo(sx + 0.38, cab.y0); ctx.lineTo(sx + 0.3, cab.y0 + 0.45); ctx.lineWidth = 0.06 + 3 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 0.06; ctx.strokeStyle = '#59616b'; ctx.stroke();
  ctx.save(); ctx.translate(sx + 0.3, cab.y0 + 0.45); ctx.rotate(0.5); ctx.beginPath(); ctx.ellipse(0, 0, 0.05, 0.2, 0, 0, TAU); fs(ctx, px, '#59616b', 1.8); ctx.restore();
  // yan çamurluk üst paneli: sürücünün bacaklarını örter
  ctx.beginPath(); rr(ctx, sx - 0.45, cab.y0 - 0.12, 0.95, 0.16, 0.05); fs(ctx, px, VEHICLE_COLORS.pasa, 2.1);
}
/** Römork gövdesi: static.vehicle.trailer.parts (römork yerelinde, orijin = kanca) ve römork tekerleği. */
function trailerArt(ctx, v, vs, px, hubsT) {
  const tr = v.trailer, ts = vs?.trailer ?? FALLBACK.pasa.trailer;
  ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(tr.a);
  const WOOD = '#b98a52', WD = '#8a5f33';
  for (const p of ts.parts) {
    if (p.h <= 0.12 && p.w > 0.8) { // çeki demiri
      ctx.beginPath(); rr(ctx, p.x - p.w / 2, p.y - p.h / 2 - 0.02, p.w, p.h + 0.04, 0.04); fs(ctx, px, '#6b6475', 2); continue;
    }
    if (p.w <= 0.15) { // kapak/duvar: tahta kaplı
      ctx.beginPath(); rr(ctx, p.x - 0.07, p.y - p.h / 2, 0.14, p.h, 0.03); fs(ctx, px, WOOD, 2.2);
      ctx.strokeStyle = rgba(INK, 0.45); ctx.lineWidth = 1.2 * px; ctx.beginPath(); for (let k = 1; k < 4; k++) { const yy = p.y - p.h / 2 + (p.h * k) / 4; ctx.moveTo(p.x - 0.07, yy); ctx.lineTo(p.x + 0.07, yy); } ctx.stroke(); continue;
    }
    // taban
    ctx.beginPath(); rr(ctx, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 0.05); fs(ctx, px, WOOD, 2.3);
    ctx.save(); ctx.clip(); ctx.fillStyle = WD; ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h * 0.3);
    ctx.strokeStyle = rgba(INK, 0.45); ctx.lineWidth = 1.2 * px; ctx.beginPath(); for (let xx = p.x - p.w / 2 + 0.6; xx < p.x + p.w / 2; xx += 0.6) { ctx.moveTo(xx, p.y - p.h / 2); ctx.lineTo(xx, p.y + p.h / 2); } ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#6b6475'; for (const sx of [-0.4, 0.4]) { ctx.fillRect(p.x + sx * p.w - 0.04, p.y - p.h / 2, 0.08, p.h); }
  }
  // tekerlek (römork yerelinde) + çamurluk + yay
  for (const h of hubsT) {
    const lx = h.hx, ly = h.hy;
    ctx.beginPath(); ctx.arc(h.ax, h.ay, h.w.r + 0.1, Math.PI * 0.02, Math.PI * 0.98); ctx.lineWidth = 0.08 + 3.4 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 0.08; ctx.strokeStyle = shade(VEHICLE_COLORS.pasa, -0.1); ctx.stroke();
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(h.w.a - tr.a); wheelArt(ctx, 'pasa', h.w.r, h.w.spin ?? 0, px, '#f0c83c'); ctx.restore();
    strut(ctx, h.ax, h.ay + 0.36, lx, ly, px, '#f0c83c', 0.06, 4);
  }
  ctx.restore();
}

// ================================================================ KOCA (kamyon)
function kocaBody(ctx, v, vs, px, g, hubs, t) {
  const C = VEHICLE_COLORS.koca, Cd = shade(C, -0.25), Cl = shade(C, 0.4);
  const main = g.parts.find((p) => p.part === 'chassis'), gate = g.parts.filter((p) => p.part === 'chassis')[1];
  const cab = bbox(g.parts, 'cab') ?? { x0: 1.4, x1: 2.9, y0: 0.65, y1: 1.65 }, roof = bbox(g.parts, 'roof');
  const x0 = main.x - main.w / 2, x1 = main.x + main.w / 2, yb = main.y - main.h / 2, yt = main.y + main.h / 2;
  // şasi + kargo platformu
  ctx.beginPath(); rr(ctx, x0, yb, x1 - x0, yt - yb, 0.1); fs(ctx, px, '#59616b', 2.4);
  ctx.save(); ctx.clip(); ctx.fillStyle = shade('#59616b', -0.25); ctx.fillRect(x0, yb, x1 - x0, 0.22); ctx.restore();
  ctx.beginPath(); rr(ctx, x0, yt - 0.18, cab.x0 - x0 + 0.05, 0.2, 0.05); fs(ctx, px, '#b98a52', 2.2);                // tahta zemin
  ctx.strokeStyle = rgba(INK, 0.4); ctx.lineWidth = 1.2 * px; ctx.beginPath(); for (let xx = x0 + 0.7; xx < cab.x0; xx += 0.7) { ctx.moveTo(xx, yt - 0.18); ctx.lineTo(xx, yt + 0.02); } ctx.stroke();
  // yakıt deposu + alet kutusu
  ctx.beginPath(); rr(ctx, -0.8, yb + 0.12, 1.1, 0.42, 0.1); fs(ctx, px, '#cfd6dc', 2); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-0.7, yb + 0.4, 0.9, 0.05);
  ctx.beginPath(); rr(ctx, 0.5, yb + 0.15, 0.55, 0.3, 0.05); fs(ctx, px, Cd, 2);
  // burun bloğu (kabin altı) + panjur
  ctx.beginPath(); rr(ctx, cab.x0, yb + 0.05, x1 - cab.x0, yt - yb - 0.05, 0.1); fs(ctx, px, C, 2.4);
  ctx.save(); ctx.clip(); ctx.fillStyle = Cd; ctx.fillRect(cab.x0, yb, x1 - cab.x0, 0.2); ctx.fillStyle = Cl; ctx.globalAlpha = 0.5; ctx.fillRect(cab.x0, yt - 0.12, x1 - cab.x0, 0.06); ctx.globalAlpha = 1; ctx.restore();
  ctx.beginPath(); rr(ctx, x1 - 0.22, yb + 0.3, 0.2, 0.55, 0.05); fs(ctx, px, CHROME, 1.8);
  ctx.lineWidth = 1.5 * px; ctx.strokeStyle = INK; ctx.beginPath(); for (let i = 0; i < 4; i++) { const yy = yb + 0.38 + i * 0.12; ctx.moveTo(x1 - 0.2, yy); ctx.lineTo(x1 - 0.04, yy); } ctx.stroke();
  // kabin
  const cx0 = cab.x0, cx1 = cab.x1, cy0 = cab.y0 - 0.02, cy1 = cab.y1;
  ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0, cy1 - 0.1); ctx.quadraticCurveTo(cx0, cy1, cx0 + 0.1, cy1); ctx.lineTo(cx1 - 0.35, cy1 + 0.02);
  ctx.lineTo(cx1, cy0 + 0.35); ctx.lineTo(cx1, cy0); ctx.closePath(); fs(ctx, px, Cd, 2.4);
  ctx.beginPath(); ctx.moveTo(cx0 + 0.15, cy0 + 0.3); ctx.lineTo(cx0 + 0.15, cy1 - 0.22); ctx.lineTo(cx1 - 0.45, cy1 - 0.2); ctx.lineTo(cx1 - 0.1, cy0 + 0.32); ctx.closePath();
  ctx.fillStyle = GLASS; ctx.fill(); ctx.lineWidth = 1.8 * px; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(cx0 + 0.3, cy1 - 0.25); ctx.lineTo(cx0 + 0.55, cy1 - 0.25); ctx.lineTo(cx0 + 0.4, cy0 + 0.35); ctx.lineTo(cx0 + 0.15, cy0 + 0.35); ctx.closePath(); ctx.fill();
  ctx.beginPath(); rr(ctx, cx0 + 0.2, cy0 + 0.05, 0.5, 0.09, 0.04); fs(ctx, px, CHROME, 1.3);                          // kapı kolu
  // tavan + uyarı lambaları
  const rt = roof ?? { x0: cx0, x1: cx1, y0: cy1, y1: cy1 + 0.1 };
  ctx.beginPath(); rr(ctx, rt.x0 - 0.05, rt.y0 + 0.0, rt.x1 - rt.x0 + 0.12, rt.y1 - rt.y0 + 0.02, 0.05); fs(ctx, px, shade(C, -0.1), 2);
  for (let i = 0; i < 3; i++) { ctx.beginPath(); rr(ctx, rt.x0 + 0.35 + i * 0.28, rt.y1 + 0.0, 0.18, 0.1, 0.04); fs(ctx, px, i === 1 ? '#fff6c8' : '#ffb02e', 1.4); }
  // egzoz bacası (kabin arkası)
  ctx.beginPath(); rr(ctx, cx0 - 0.17, yt, 0.12, 1.4, 0.05); fs(ctx, px, '#cfd6dc', 1.8);
  ctx.beginPath(); rr(ctx, cx0 - 0.2, yt + 1.35, 0.18, 0.07, 0.03); fs(ctx, px, '#59616b', 1.6);
  // tampon
  ctx.beginPath(); rr(ctx, x1 - 0.08, yb + 0.02, 0.17, 0.22, 0.05); fs(ctx, px, CHROME, 1.8);
  // arka kapak (fizik kenarı)
  if (gate) { ctx.beginPath(); rr(ctx, gate.x - 0.07, gate.y - gate.h / 2, 0.14, gate.h, 0.03); fs(ctx, px, '#b98a52', 2.2); ctx.strokeStyle = rgba(INK, 0.45); ctx.lineWidth = 1.2 * px; ctx.beginPath(); for (let k = 1; k < 4; k++) { const yy = gate.y - gate.h / 2 + (gate.h * k) / 4; ctx.moveTo(gate.x - 0.07, yy); ctx.lineTo(gate.x + 0.07, yy); } ctx.stroke(); }
  // çamurluk yayları + çamur perdesi
  for (const h of hubs) { ctx.beginPath(); ctx.arc(h.ax, h.ay, h.w.r + 0.1, Math.PI * 0.02, Math.PI * 0.98); ctx.lineWidth = 0.09 + 3.4 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 0.09; ctx.strokeStyle = Cd; ctx.stroke(); }
}
function kocaFront(ctx, v, vs, px, g) {
  const seat = g.seat ?? { x: 2.1, y: 1.15 };
  ctx.beginPath(); ctx.moveTo(seat.x + 0.4, seat.y - 0.45); ctx.lineTo(seat.x + 0.32, seat.y - 0.05); ctx.lineWidth = 0.06 + 3 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 0.06; ctx.strokeStyle = '#59616b'; ctx.stroke();
  ctx.save(); ctx.translate(seat.x + 0.32, seat.y - 0.05); ctx.rotate(0.6); ctx.beginPath(); ctx.ellipse(0, 0, 0.05, 0.22, 0, 0, TAU); fs(ctx, px, '#59616b', 1.8); ctx.restore();
}

// ================================================================ ana çizim
const hubs = [], hubsT = [];       // yeniden kullanılan geçici diziler
function prep(v, vs) {
  const g = geo(vs, v.id);
  hubs.length = 0; hubsT.length = 0;
  const c = Math.cos(v.a), s = Math.sin(v.a), tr = v.trailer;
  const tc = tr ? Math.cos(tr.a) : 1, ts = tr ? Math.sin(tr.a) : 0, tst = vs?.trailer ?? g.trailer;
  for (let i = 0; i < v.wheels.length; i++) {
    const w = v.wheels[i];
    if (w.trailer) {
      if (!tr) continue;
      const st = tst?.wheels?.find((q) => q.id === w.id) ?? tst?.wheels?.[0] ?? { x: 0, y: 0 };
      const dx = w.x - tr.x, dy = w.y - tr.y;
      const h = hubsT[hubsT.length] ?? (hubsT[hubsT.length] = {});
      h.id = w.id; h.ax = st.x; h.ay = st.y; h.hx = dx * tc + dy * ts; h.hy = -dx * ts + dy * tc; h.w = w;
      continue;
    }
    const st = g.wheels?.find((q) => q.id === w.id) ?? g.wheels?.[i] ?? { x: 0, y: 0 };
    const dx = w.x - v.x, dy = w.y - v.y;
    const h = hubs[hubs.length] ?? (hubs[hubs.length] = {});
    h.id = w.id; h.ax = st.x; h.ay = st.y; h.hx = dx * c + dy * s; h.hy = -dx * s + dy * c; h.w = w;
  }
  return g;
}

/** Arka katman: römork + tekerlek + süspansiyon + gövde. Sürücüden ÖNCE çağrılır. */
export function drawVehicleBack(ctx, v, vs, px, t = ART.t) {
  const g = prep(v, vs), id = v.id, C = VEHICLE_COLORS[id] ?? '#19b5a5';
  if (v.trailer && (vs?.trailer || g.trailer)) trailerArt(ctx, v, vs, px, hubsT);
  ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a);
  if (id === 'tosun') {
    tosunBody(ctx, v, vs, px, g, hubs);
    wheelsAndStruts(ctx, v, g, px, C, 0.62, '#ffb02e', 0.075, 5, 'tosun');
    lights(ctx, v, px, HEADLIGHT.tosun, { x: -1.78, y: 0.2 });
  } else if (id === 'zipir') {
    zipirBody(ctx, v, vs, px, g, hubs, t);
    wheelsAndStruts(ctx, v, g, px, C, 0.75, '#ffe14a', 0.06, 6, 'zipir');
    lights(ctx, v, px, HEADLIGHT.zipir, { x: -1.3, y: 0.0 }, 0.9);
  } else if (id === 'pasa') {
    pasaBody(ctx, v, vs, px, g, hubs, t);
    wheelsAndStruts(ctx, v, g, px, C, 0.5, '#f0c83c', 0.07, 4, 'pasa');
    lights(ctx, v, px, HEADLIGHT.pasa, { x: -1.42, y: 0.15 });
  } else if (id === 'koca') {
    kocaBody(ctx, v, vs, px, g, hubs, t);
    wheelsAndStruts(ctx, v, g, px, C, 0.45, '#ffb02e', 0.08, 4, 'koca');
    lights(ctx, v, px, HEADLIGHT.koca, { x: -2.99, y: 0.3 }, 1.1);
  } else {
    for (const p of g.parts) { ctx.beginPath(); rr(ctx, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 0.08); fs(ctx, px, C, 2.2); }
    wheelsAndStruts(ctx, v, g, px, C, 0.5, '#ffd23c', 0.07, 4, 'tosun');
  }
  ctx.restore();
}
function wheelsAndStruts(ctx, v, g, px, hubCol, anchorUp, springCol, thick, coils, style) {
  for (let i = 0; i < hubs.length; i++) {
    const h = hubs[i], w = h.w;
    ctx.save(); ctx.translate(h.hx, h.hy); ctx.rotate(w.a - v.a);
    wheelArt(ctx, style, w.r, w.spin ?? 0, px, hubCol);
    ctx.restore();
  }
  for (let i = 0; i < hubs.length; i++) {
    const h = hubs[i];
    const up = style === 'zipir' ? 0.78 : style === 'pasa' && h.id === 'rear' ? 0.55 : anchorUp;
    strut(ctx, h.ax, h.ay + up, h.hx, h.hy, px, springCol, thick, coils);
  }
}
/** Ön katman: kapı/cam/direksiyon — sürücüyü ÖRTER. Sürücüden SONRA çağrılır. */
export function drawVehicleFront(ctx, v, vs, px, t = ART.t) {
  const g = geo(vs, v.id);
  ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a);
  if (v.id === 'tosun') tosunFront(ctx, v, vs, px);
  else if (v.id === 'zipir') zipirFront(ctx, v, vs, px);
  else if (v.id === 'pasa') pasaFront(ctx, v, vs, px, g);
  else if (v.id === 'koca') kocaFront(ctx, v, vs, px, g);
  ctx.restore();
}
/** Araç + tekerlekler (sürücüsüz). Uyumluluk için: Back + Front. */
export function drawVehicle(ctx, v, vs, px, t = ART.t) {
  drawVehicleBack(ctx, v, vs, px, t); drawVehicleFront(ctx, v, vs, px, t);
}

/** Aracın altına yumuşak zemin gölgesi. gy = araç altı zemin yüksekliği, slope = eğim açısı. */
export function drawShadow(ctx, x, gy, slope, height, wide, px) {
  const k = clamp(1 - height / 5, 0, 1);
  if (k <= 0.02) return;
  ctx.save(); ctx.translate(x, gy + 0.03); ctx.rotate(slope); ctx.scale(1, 0.14 * (0.8 + 0.2 * k));
  circle(ctx, 0, 0, wide * (0.75 + 0.25 * k)); ctx.fillStyle = `rgba(30,20,40,${0.28 * k})`; ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------- sabit (sahte) araç: galeri / garaj önizleme
/** Sim olmadan aracı durağan bir pozda tanımlayan {v: snapshot.vehicle, vs: static.vehicle} çifti (spawn pozu: şasi orijinde). */
export function fakeVehicle(id, cfg) {
  const g = (cfg && cfg.parts && cfg.parts.length) ? cfg : FALLBACK[id];
  const wr = (w) => w.r ?? g.wheelR ?? 0.4;
  const vs = { id, parts: g.parts, wheels: g.wheels.map((w) => ({ id: w.id, x: w.x, y: w.y, r: wr(w) })), wheelR: g.wheelR, seat: g.seat, bay: g.bay, trailer: g.trailer ?? null };
  const v = { id, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, speed: 0, brake: 0, reversing: false, throttle: 0, wheels: [], trailer: null };
  g.wheels.forEach((w) => v.wheels.push({ id: w.id, x: w.x, y: w.y - 0.04, a: 0, r: wr(w), spin: 0, compression: 0.5, trailer: false }));
  if (g.trailer) {
    v.trailer = { x: g.trailer.hitch.x, y: g.trailer.hitch.y, a: 0 };
    g.trailer.wheels.forEach((w) => v.wheels.push({ id: w.id, x: g.trailer.hitch.x + w.x, y: g.trailer.hitch.y + w.y - 0.04, a: 0, r: wr(w), spin: 0, compression: 0.5, trailer: true }));
  }
  return { v, vs };
}
void mix; void hash;
