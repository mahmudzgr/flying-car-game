// Nesneler: varil, kaya, köprü tahtası, tahterevalli, kar topu, kütük, kuruş, başlangıç/bitiş, ipucu tabelaları. Sahip: Grafik.
import { INK, GOLD, shade, rgba, mix, BIOMES } from './palette.js';
import { ART, TAU, rr, fs, circle, line, hash, text, clamp } from './util.js';

function strHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }

// ---------------------------------------------------------------- tehlike işareti (üçgen + ünlem)
export function warnTri(ctx, x, y, s, px) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(-0.22 * s, -0.17 * s); ctx.lineTo(0.22 * s, -0.17 * s); ctx.lineTo(0, 0.22 * s); ctx.closePath();
  ctx.lineJoin = 'round'; fs(ctx, px, '#ff9f1c', 2);
  ctx.fillStyle = INK; ctx.fillRect(-0.02 * s, -0.08 * s, 0.04 * s, 0.17 * s); ctx.beginPath(); ctx.arc(0, -0.12 * s, 0.025 * s, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- nesneler
function barrel(ctx, o, px) {
  const w = o.w || 0.6, h = o.h || 0.9, R = '#c0453c';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 0.03, -h / 2); ctx.lineTo(w / 2 - 0.03, -h / 2);
  ctx.quadraticCurveTo(w / 2 + 0.04, 0, w / 2 - 0.03, h / 2); ctx.lineTo(-w / 2 + 0.03, h / 2); ctx.quadraticCurveTo(-w / 2 - 0.04, 0, -w / 2 + 0.03, -h / 2); ctx.closePath();
  fs(ctx, px, R, 2.3);
  ctx.save(); ctx.clip();
  ctx.fillStyle = shade(R, -0.2); ctx.fillRect(w * 0.12, -h / 2, w, h);                 // gölge yarısı
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-w * 0.34, -h * 0.4, 0.05, h * 0.8);
  for (const y of [-0.3, 0, 0.3]) { ctx.fillStyle = '#8d95a0'; ctx.fillRect(-w, y * h - 0.03, w * 2, 0.06); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = INK; ctx.strokeRect(-w, y * h - 0.03, w * 2, 0.06); }
  ctx.restore();
  // alev işareti
  ctx.beginPath(); ctx.moveTo(0, -0.12); ctx.quadraticCurveTo(0.1, -0.02, 0.04, 0.08); ctx.quadraticCurveTo(0, 0.04, -0.03, 0.09); ctx.quadraticCurveTo(-0.1, -0.02, 0, -0.12); ctx.fillStyle = '#ffd23c'; ctx.fill(); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = INK; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-w / 2 + 0.03, -h / 2); ctx.lineTo(w / 2 - 0.03, -h / 2); ctx.lineWidth = 2.3 * px; ctx.strokeStyle = INK; ctx.stroke();
}

const ROCK_PTS = 11;
function rock(ctx, o, px) {
  const r = o.r > 0 ? o.r : Math.max(o.w, o.h) / 2 || 0.8, sd = strHash(String(o.id));
  ctx.beginPath();
  for (let i = 0; i < ROCK_PTS; i++) {
    const a = (i / ROCK_PTS) * TAU, k = r * (0.86 + hash(sd + i * 1.7) * 0.18);
    const x = Math.cos(a) * k, y = Math.sin(a) * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath(); fs(ctx, px, '#8a8078', 2.6);
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#6d645d'; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.lineTo(r, -r * 0.3); ctx.lineTo(r, r); ctx.lineTo(-r * 0.6, r); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#aaa098'; ctx.beginPath(); ctx.moveTo(-r, r * 0.1); ctx.lineTo(-r * 0.5, r * 0.8); ctx.lineTo(-r * 0.1, r * 0.55); ctx.lineTo(-r * 0.5, r * 0.05); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 2 * px; ctx.strokeStyle = rgba(INK, 0.6); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(r * 0.1, r * 0.6); ctx.lineTo(r * 0.05, r * 0.1); ctx.lineTo(r * 0.3, -r * 0.15); ctx.moveTo(r * 0.05, r * 0.1); ctx.lineTo(-r * 0.25, -r * 0.1); ctx.stroke();
  ctx.fillStyle = 'rgba(120,150,70,.7)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.55, r * 0.25, r * 0.1, 0.4, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(0, 0); // (kontur zaten çizildi)
}

function plank(ctx, o, px) {
  const w = o.w || 1, h = o.h || 0.2;
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h, 0.03); fs(ctx, px, '#b98a52', 2.2);
  ctx.strokeStyle = rgba(INK, 0.5); ctx.lineWidth = 1.2 * px; ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.2); ctx.lineTo(w * 0.1, -h * 0.2); ctx.moveTo(-w * 0.1, h * 0.22); ctx.lineTo(w * 0.35, h * 0.22); ctx.stroke();
  for (const sx of [-1, 1]) circle(ctx, sx * (w / 2 - 0.08), 0, 0.025), ctx.fillStyle = '#59616b', ctx.fill();
  if (o.weak) { // zayıf tahta: kırmızı çatlak + işaret
    ctx.beginPath(); ctx.moveTo(-w * 0.12, h / 2); ctx.lineTo(-w * 0.02, 0.0); ctx.lineTo(-w * 0.14, -h * 0.2); ctx.lineTo(w * 0.04, -h / 2);
    ctx.lineWidth = 0.035; ctx.strokeStyle = '#e8453c'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(232,69,60,.35)'; ctx.fillRect(-w / 2, -h / 2, w, h);
    circle(ctx, w * 0.3, 0, 0.045); ctx.fillStyle = '#ff9f1c'; ctx.fill(); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = INK; ctx.stroke();
  }
}

function seesaw(ctx, o, px) {
  const w = o.w || 8, h = o.h || 0.3;
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h, 0.07); fs(ctx, px, '#c9965a', 2.4);
  ctx.save(); ctx.clip();
  ctx.fillStyle = shade('#c9965a', -0.18); ctx.fillRect(-w / 2, -h / 2, w, h * 0.3);
  ctx.strokeStyle = rgba(INK, 0.4); ctx.lineWidth = 1.4 * px; ctx.beginPath(); for (let x = -w / 2 + 0.8; x < w / 2; x += 0.8) { ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2); } ctx.stroke();
  ctx.restore();
  // uç tutamaçları
  for (const sx of [-1, 1]) { ctx.beginPath(); rr(ctx, sx * (w / 2 - 0.2) - 0.05, h / 2, 0.1, 0.25, 0.03); fs(ctx, px, '#59616b', 1.6); }
  circle(ctx, 0, 0, 0.09); fs(ctx, px, '#d7dde3', 1.6);
}

function snowball(ctx, o, px) {
  const r = o.r > 0 ? o.r : 1.2;
  circle(ctx, 0, 0, r); fs(ctx, px, '#f4f8fd', 2.8);
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#c9d9ea'; ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.3, r * 1.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f4f8fd'; ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.15, r * 0.95, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a9bdd3'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0.3, 2.4); ctx.moveTo(r * 0.8, 0); ctx.arc(0, 0, r * 0.8, -1.2, 0.5); ctx.stroke();
  ctx.fillStyle = '#7a8a9a'; for (let i = 0; i < 5; i++) { const a = hash(i * 3.3) * TAU, d = r * (0.3 + hash(i) * 0.5); circle(ctx, Math.cos(a) * d, Math.sin(a) * d, r * 0.06); ctx.fill(); }
  ctx.restore();
  circle(ctx, 0, 0, r); ctx.lineWidth = 2.8 * px; ctx.strokeStyle = INK; ctx.stroke();
}

function log(ctx, o, px) {
  const w = o.w || 2.5, h = o.h || 0.5;
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h, h * 0.4); fs(ctx, px, '#9a6a3c', 2.4);
  ctx.save(); ctx.clip();
  ctx.strokeStyle = shade('#9a6a3c', -0.3); ctx.lineWidth = 0.03; ctx.beginPath(); for (let i = 0; i < 4; i++) { const y = -h * 0.3 + i * h * 0.2; ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y + 0.02); } ctx.stroke();
  ctx.restore();
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * (w / 2 - 0.05), 0, 0.12, h / 2, 0, 0, TAU); fs(ctx, px, '#d9b27c', 2); ctx.beginPath(); ctx.ellipse(sx * (w / 2 - 0.05), 0, 0.06, h * 0.25, 0, 0, TAU); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = rgba(INK, 0.5); ctx.stroke(); }
}

function generic(ctx, o, px) {
  ctx.beginPath(); if (o.r > 0) ctx.arc(0, 0, o.r, 0, TAU); else rr(ctx, -(o.w || 0.5) / 2, -(o.h || 0.5) / 2, o.w || 0.5, o.h || 0.5, 0.05);
  fs(ctx, px, '#b9a6c9', 2.2);
  ctx.save(); ctx.clip(); ctx.strokeStyle = rgba(INK, 0.35); ctx.lineWidth = 1.5 * px; const s = Math.max(o.w || 0, o.h || 0, (o.r || 0.3) * 2);
  ctx.beginPath(); for (let k = -s; k < s; k += 0.25) { ctx.moveTo(k, -s); ctx.lineTo(k + s, s); } ctx.stroke(); ctx.restore();
}

const OBJ = { barrel, rock, plank, seesaw, snowball, log };
/** Dinamik nesne (varil, kaya...). o = snapshot.objects[i] (ara değerlenmiş). Bilinmeyen tür → genel şekil. */
export function drawObject(ctx, o, px) {
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
  (OBJ[o.type] ?? generic)(ctx, o, px);
  ctx.restore();
  if (o.type === 'rock' && o.active === false) warnTri(ctx, o.x, o.y + (o.r || 1) + 0.45 + Math.sin(ART.t * 3) * 0.04, 1.1, px);
}
/** Köprü halatı: ardışık plank nesneleri (x'e göre sıralı) arasında halat çizer. */
export function drawBridgeRopes(ctx, planks, px) {
  if (planks.length < 2) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pass = (lift, w, col) => {
    ctx.beginPath(); let started = false;
    for (let i = 0; i < planks.length; i++) {
      const p = planks[i];
      const x = p.x - Math.sin(p.a) * lift, y = p.y + Math.cos(p.a) * lift;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.lineWidth = w + 3 * px; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  };
  pass(-0.1, 0.05, '#c9a56a');
  pass(0.95, 0.045, '#d9bd82');
  ctx.lineWidth = 0.025; ctx.strokeStyle = '#c9a56a';
  ctx.beginPath(); for (let i = 0; i < planks.length; i += 2) { const p = planks[i]; ctx.moveTo(p.x, p.y + 0.0); ctx.lineTo(p.x - Math.sin(p.a) * 0.95, p.y + Math.cos(p.a) * 0.95); } ctx.stroke();
}

// ---------------------------------------------------------------- kuruş
export function drawCoin(ctx, k, px, t = ART.t) {
  const ph = (k.x * 1.3 + (k.y || 0)) * 2.1;
  const bob = Math.sin(t * 2.4 + ph) * 0.06;
  const sx = Math.max(0.18, Math.abs(Math.cos(t * 2.8 + ph)));
  ctx.save(); ctx.translate(k.x, k.y + bob); ctx.scale(sx, 1);
  circle(ctx, 0, 0, 0.26); fs(ctx, px, GOLD, 2);
  circle(ctx, 0, 0, 0.18); ctx.lineWidth = 1.5 * px; ctx.strokeStyle = '#c99a12'; ctx.stroke();
  ctx.fillStyle = '#c99a12'; ctx.fillRect(-0.03, -0.1, 0.06, 0.2);
  ctx.beginPath(); ctx.ellipse(-0.09, 0.1, 0.05, 0.025, 0.7, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
  ctx.restore();
  // parıltı
  const tw = Math.sin(t * 3.1 + ph * 1.7);
  if (tw > 0.93) { const s = (tw - 0.93) / 0.07; ctx.save(); ctx.translate(k.x + 0.14, k.y + bob + 0.16); ctx.beginPath(); ctx.moveTo(0, 0.12 * s); ctx.lineTo(0.03 * s, 0.03 * s); ctx.lineTo(0.12 * s, 0); ctx.lineTo(0.03 * s, -0.03 * s); ctx.lineTo(0, -0.12 * s); ctx.lineTo(-0.03 * s, -0.03 * s); ctx.lineTo(-0.12 * s, 0); ctx.lineTo(-0.03 * s, 0.03 * s); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
}

// ---------------------------------------------------------------- başlangıç / bitiş
const signCache = new Map();
const SC = 64;
function mkCanvas(w, h) { return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }); }
function buildSign(kind) {
  const W = kind === 'start' ? 4.2 : 4.6, H = kind === 'start' ? 1.7 : 1.5;
  const cv = mkCanvas(Math.ceil(W * SC), Math.ceil(H * SC)), g = cv.getContext('2d');
  g.setTransform(SC, 0, 0, SC, 0, 0);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const px = 1 / SC;
  // tahta zemin
  g.beginPath(); rr2(g, 0.05, 0.05, W - 0.1, H - 0.1, 0.18);
  g.fillStyle = kind === 'start' ? '#19b5a5' : '#e8453c'; g.fill(); g.lineWidth = 3 * px; g.strokeStyle = INK; g.stroke();
  g.beginPath(); rr2(g, 0.2, 0.2, W - 0.4, H - 0.4, 0.12); g.lineWidth = 2.5 * px; g.strokeStyle = '#fff1d0'; g.stroke();
  g.fillStyle = '#fff1d0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 4 * px; g.strokeStyle = INK;
  if (kind === 'start') {
    g.font = '900 0.56px system-ui, "Segoe UI", Roboto, sans-serif'; g.strokeText('SARSINTI', W / 2, 0.62); g.fillText('SARSINTI', W / 2, 0.62);
    g.font = '900 0.46px system-ui, "Segoe UI", Roboto, sans-serif'; g.fillStyle = '#ffd23c'; g.strokeText('NAKLİYAT', W / 2, 1.14); g.fillText('NAKLİYAT', W / 2, 1.14);
  } else {
    g.font = '900 0.54px system-ui, "Segoe UI", Roboto, sans-serif'; g.strokeText('TESLİM', W / 2, 0.55); g.fillText('TESLİM', W / 2, 0.55);
    g.font = '900 0.36px system-ui, "Segoe UI", Roboto, sans-serif'; g.fillStyle = '#ffd23c'; g.strokeText('NOKTASI', W / 2, 1.02); g.fillText('NOKTASI', W / 2, 1.02);
  }
  return { cv, W, H };
}
function rr2(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function flag(ctx, x, y, w, h, col, px, t, ph = 0) {
  ctx.beginPath(); ctx.moveTo(x, y);
  const n = 6;
  for (let i = 1; i <= n; i++) ctx.lineTo(x + (w * i) / n, y + Math.sin(t * 5 + ph + i * 0.9) * 0.05 * i);
  for (let i = n; i >= 0; i--) ctx.lineTo(x + (w * i) / n, y - h + Math.sin(t * 5 + ph + i * 0.9) * 0.05 * i);
  ctx.closePath(); fs(ctx, px, col, 2);
}

/** Bitiş/başlangıç: (x,y) zemin üstü noktası. 'start' = Sarsıntı Nakliyat tabelası + yol çizgisi; 'finish' = teslim kapısı. */
export function drawFinish(ctx, x, y, px, label = 'finish') {
  const t = ART.t;
  let s = signCache.get(label); if (!s) { s = buildSign(label); signCache.set(label, s); }
  const postH = 3.0;
  ctx.lineCap = 'round';
  // zemin şeridi
  if (label === 'finish') {
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#fff' : INK; ctx.fillRect(x - 0.3, y + 0.02 + i * 0.1, 0.3, 0.1); ctx.fillStyle = i % 2 ? INK : '#fff'; ctx.fillRect(x, y + 0.02 + i * 0.1, 0.3, 0.1); }
    ctx.lineWidth = 1.5 * px; ctx.strokeStyle = INK; ctx.strokeRect(x - 0.3, y + 0.02, 0.6, 0.6);
  } else {
    ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 0.1 + (i % 2 ? 0.0 : 0), y + 0.04 + i * 0.12, 0.2, 0.07);
  }
  // direkler
  const half = s.W / 2 - 0.35;
  for (const sx of [-1, 1]) {
    const px0 = x + sx * half;
    line(ctx, px0, y - 0.05, px0, y + postH); ctx.lineWidth = 0.17 + 3.5 * px; ctx.strokeStyle = INK; ctx.stroke();
    line(ctx, px0, y - 0.05, px0, y + postH); ctx.lineWidth = 0.17; ctx.strokeStyle = '#a97a45'; ctx.stroke();
    line(ctx, px0 - 0.04, y + 0.1, px0 - 0.04, y + postH - 0.1); ctx.lineWidth = 0.03; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
  }
  // tabela (önbellekli, ters çevrilmiş çizim)
  ctx.save(); ctx.translate(x - s.W / 2, y + postH - 0.1 + s.H * 0.0); ctx.translate(0, 0); ctx.scale(1, -1);
  ctx.drawImage(s.cv, 0, -s.H + 0.0, s.W, s.H);
  ctx.restore();
  // bayraklar
  if (label === 'finish') { flag(ctx, x - half, y + postH + 0.0, 0.8, 0.5, '#fff', px, t, 0); flag(ctx, x + half, y + postH + 0.0, 0.8, 0.5, '#fff', px, t, 1.2); }
  else { line(ctx, x + half + 0.45, y, x + half + 0.45, y + postH + 0.9); ctx.lineWidth = 0.07 + 3 * px; ctx.strokeStyle = INK; ctx.stroke(); line(ctx, x + half + 0.45, y, x + half + 0.45, y + postH + 0.9); ctx.lineWidth = 0.07; ctx.strokeStyle = '#d7dde3'; ctx.stroke(); flag(ctx, x + half + 0.45, y + postH + 0.88, 1.0, 0.6, '#ffd23c', px, t, 0); }
  // fıstık tel flamalar
  ctx.lineWidth = 0.02; ctx.strokeStyle = INK;
  const cols = ['#e8453c', '#ffd23c', '#19b5a5', '#ff7a3c'];
  const bx0 = x - half, bx1 = x + half;
  ctx.beginPath(); ctx.moveTo(bx0, y + postH - 0.05); ctx.quadraticCurveTo(x, y + postH - 0.35, bx1, y + postH - 0.05); ctx.stroke();
  void cols;
}

// ---------------------------------------------------------------- ipucu tabelaları
function icon(ctx, kind, px) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (kind) {
    case 'throttle': ctx.beginPath(); ctx.moveTo(-0.14, -0.14); ctx.lineTo(0.16, 0); ctx.lineTo(-0.14, 0.14); ctx.closePath(); fs(ctx, px, '#3fbf5a', 1.8); break;
    case 'brake': ctx.beginPath(); ctx.moveTo(0.14, -0.14); ctx.lineTo(-0.16, 0); ctx.lineTo(0.14, 0.14); ctx.closePath(); fs(ctx, px, '#e8453c', 1.8); break;
    case 'jump': ctx.beginPath(); ctx.moveTo(-0.17, -0.1); ctx.quadraticCurveTo(0, 0.28, 0.17, -0.1); ctx.lineWidth = 0.06; ctx.strokeStyle = '#2e86ab'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0.04, -0.03); ctx.lineTo(0.17, -0.1); ctx.lineTo(0.1, 0.04); ctx.stroke(); break;
    case 'cargo': ctx.beginPath(); rr(ctx, -0.14, -0.12, 0.28, 0.24, 0.03); fs(ctx, px, '#d8a85c', 1.8); ctx.lineWidth = 0.03; ctx.strokeStyle = '#8a5f33'; ctx.beginPath(); ctx.moveTo(-0.14, 0); ctx.lineTo(0.14, 0); ctx.stroke(); break;
    case 'warn': ctx.beginPath(); ctx.moveTo(-0.16, -0.13); ctx.lineTo(0.16, -0.13); ctx.lineTo(0, 0.16); ctx.closePath(); fs(ctx, px, '#ff9f1c', 1.8); ctx.fillStyle = INK; ctx.fillRect(-0.015, -0.06, 0.03, 0.12); circle(ctx, 0, -0.09, 0.02); ctx.fill(); break;
    default: circle(ctx, 0, 0.0, 0.13); fs(ctx, px, '#2e86ab', 1.8); ctx.fillStyle = '#fff'; ctx.fillRect(-0.015, -0.07, 0.03, 0.11); circle(ctx, 0, 0.08, 0.025); ctx.fill();
  }
}
/** Yol kenarı ipucu tabelası (metin HUD'da toast olarak çıkar). */
export function drawHintSign(ctx, x, y, kind, px, t = ART.t) {
  const sway = Math.sin(t * 1.5 + x) * 0.01;
  line(ctx, x, y - 0.05, x + sway, y + 1.0); ctx.lineWidth = 0.08 + 3 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  line(ctx, x, y - 0.05, x + sway, y + 1.0); ctx.lineWidth = 0.08; ctx.strokeStyle = '#a97a45'; ctx.stroke();
  ctx.save(); ctx.translate(x + sway, y + 1.18);
  ctx.beginPath(); rr(ctx, -0.36, -0.28, 0.72, 0.56, 0.1); fs(ctx, px, '#fff1d0', 2.2);
  ctx.beginPath(); rr(ctx, -0.3, -0.22, 0.6, 0.44, 0.07); ctx.lineWidth = 1.4 * px; ctx.strokeStyle = rgba(INK, 0.35); ctx.stroke();
  icon(ctx, kind, px);
  ctx.restore();
}
void mix; void BIOMES; void text; void clamp;

// ---------------------------------------------------------------- statik dekor: köprü direkleri, tahterevalli dayanağı, su, kontrol noktası
/** static.props: köprü direkleri ve tahterevalli dayanağı (dinamik parçalar objects'te). */
export function drawProps(ctx, st, range, px) {
  const props = st.props;
  if (!props) return;
  for (const p of props) {
    if (p.type === 'bridge') {
      if (p.x + p.len < range.x0 - 2 || p.x > range.x1 + 2) continue;
      for (const bx of [p.x - 0.28, p.x + p.len + 0.28]) {
        const gy = heightAtLocal(st, bx), top = p.y + 1.2;
        ctx.beginPath(); rr(ctx, bx - 0.12, gy - 0.3, 0.24, top - gy + 0.3, 0.05); fs(ctx, px, '#9a6a3c', 2.3);
        ctx.beginPath(); rr(ctx, bx - 0.17, top - 0.04, 0.34, 0.12, 0.04); fs(ctx, px, '#7a5a30', 2);
        ctx.strokeStyle = rgba(INK, 0.4); ctx.lineWidth = 1.2 * px; ctx.beginPath(); ctx.moveTo(bx - 0.04, gy + 0.1); ctx.lineTo(bx - 0.04, top - 0.1); ctx.stroke();
      }
    } else if (p.type === 'seesaw') {
      if (p.x + p.len < range.x0 - 2 || p.x > range.x1 + 2) continue;
      const gy = heightAtLocal(st, p.pivot.x);
      ctx.beginPath(); ctx.moveTo(p.pivot.x - 0.7, gy); ctx.lineTo(p.pivot.x + 0.7, gy); ctx.lineTo(p.pivot.x, p.pivot.y - 0.12); ctx.closePath(); fs(ctx, px, '#7a5a30', 2.4);
      ctx.beginPath(); ctx.moveTo(p.pivot.x - 0.32, gy + 0.05); ctx.lineTo(p.pivot.x, p.pivot.y - 0.2); ctx.lineTo(p.pivot.x + 0.32, gy + 0.05); ctx.lineWidth = 1.4 * px; ctx.strokeStyle = rgba(INK, 0.45); ctx.stroke();
    }
  }
}
function heightAtLocal(st, x) {
  const { xs, ys } = st.terrain;
  let lo = 0, hi = xs.length - 2;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (xs[m] <= x) lo = m; else hi = m - 1; }
  const dx = xs[lo + 1] - xs[lo];
  return dx < 1e-6 ? Math.max(ys[lo], ys[lo + 1]) : ys[lo] + ((ys[lo + 1] - ys[lo]) * (x - xs[lo])) / dx;
}

/** Su bölgeleri: front=false → araçtan önce (opak ağırlıklı), front=true → araçtan sonra (hafif örtü + köpük). */
export function drawWater(ctx, waters, range, px, t, front) {
  if (!waters) return;
  for (const w of waters) {
    if (w.x1 < range.x0 || w.x0 > range.x1) continue;
    const x0 = Math.max(w.x0, range.x0 - 1), x1 = Math.min(w.x1, range.x1 + 1), yb = (range.y0 ?? w.y - 20) - 2;
    ctx.beginPath(); ctx.moveTo(x0, yb);
    for (let x = x0; x <= x1 + 0.01; x += 0.25) ctx.lineTo(x, w.y + Math.sin(t * 2.4 + x * 2.1) * 0.05 + Math.sin(t * 1.3 + x * 0.7) * 0.04);
    ctx.lineTo(x1, yb); ctx.closePath();
    ctx.fillStyle = front ? 'rgba(74,163,216,.30)' : 'rgba(47,127,180,.78)'; ctx.fill();
    if (!front) {
      ctx.fillStyle = 'rgba(143,208,240,.35)'; ctx.fillRect(x0, w.y - 0.7, x1 - x0, 0.7);
    } else {
      ctx.beginPath(); for (let x = x0; x <= x1 + 0.01; x += 0.25) { const y = w.y + Math.sin(t * 2.4 + x * 2.1) * 0.05 + Math.sin(t * 1.3 + x * 0.7) * 0.04; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.lineWidth = 0.07; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineWidth = 2.2 * px; ctx.strokeStyle = INK; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
}

/** Köprü halatları (başlangıç/bitiş direklerinden tahtalara). planks x'e göre sıralı. */
export function drawBridge(ctx, prop, planks, st, px) {
  if (!planks.length) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pw = prop.len / prop.planks, lift = 0.95;
  const ax0 = prop.x - 0.28, ax1 = prop.x + prop.len + 0.28, ay = prop.y + 1.15;
  const rope = (liftN, w, col, anchor) => {
    ctx.beginPath(); ctx.moveTo(ax0, anchor);
    let prev = null;
    for (const p of planks) {
      const x = p.x - Math.sin(p.a) * liftN, y = p.y + Math.cos(p.a) * liftN;
      if (prev && Math.hypot(x - prev.x, y - prev.y) > pw * 1.8) { ctx.moveTo(x, y); } else ctx.lineTo(x, y);
      prev = { x, y };
    }
    ctx.lineTo(ax1, anchor);
    ctx.lineWidth = w + 3 * px; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  };
  rope(lift, 0.045, '#d9bd82', ay);
  ctx.lineWidth = 0.025; ctx.strokeStyle = '#c9a56a'; ctx.beginPath();
  for (let i = 0; i < planks.length; i += 2) { const p = planks[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.sin(p.a) * lift, p.y + Math.cos(p.a) * lift); }
  ctx.stroke();
}

/** Kontrol noktası bayrağı. reached → yeşil, değilse beyaz. */
export function drawCheckpoint(ctx, cp, reached, px, t = ART.t) {
  line(ctx, cp.x, cp.y - 0.05, cp.x, cp.y + 2.0); ctx.lineWidth = 0.08 + 3 * px; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.stroke();
  line(ctx, cp.x, cp.y - 0.05, cp.x, cp.y + 2.0); ctx.lineWidth = 0.08; ctx.strokeStyle = '#d7dde3'; ctx.stroke();
  flag(ctx, cp.x, cp.y + 2.0, 0.9, 0.55, reached ? '#3fbf5a' : '#ffffff', px, t, cp.x);
  circle(ctx, cp.x, cp.y + 0.02, 0.2); ctx.fillStyle = '#8d95a0'; ctx.fill(); ctx.lineWidth = 2 * px; ctx.strokeStyle = INK; ctx.stroke();
  if (!reached) { ctx.beginPath(); ctx.arc(cp.x + 0.45, cp.y + 1.73, 0.1, 0, TAU); }
}
