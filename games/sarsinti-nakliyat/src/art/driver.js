// Sürücü Fındık: yuvarlak sarı kasklı, büyük gözlü, turuncu tulumlu kurye. Sahip: Grafik.
// Oturur halde kolu direksiyonda; ragdoll'da kollar/bacaklar savrulur, ifade şaşkın olur. Parçalar ayrı çizilir.
import { INK, SKIN, HELMET, OVERALL, shade } from './palette.js';
import { ART, TAU, rr, fs, circle, clamp } from './util.js';

const SHIRT = '#fff3d6', BOOT = '#4a3f54';

function limb(ctx, x0, y0, x1, y1, w, fill, px) {
  ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
  ctx.lineWidth = w + 3.6 * px; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = w; ctx.strokeStyle = fill; ctx.stroke();
}

/** Gövde (torso yerelinde çizilir). */
function torso(ctx, t, px) {
  const w = t.w, h = t.h;
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h, 0.09); fs(ctx, px, OVERALL, 2.2);
  ctx.save(); ctx.clip();
  ctx.fillStyle = SHIRT; ctx.fillRect(-w / 2, h * 0.16, w, h * 0.4);             // gömlek
  ctx.fillStyle = shade(OVERALL, -0.18); ctx.fillRect(-w / 2, -h / 2, w, h * 0.12);  // alt gölge
  ctx.restore();
  // önlük askıları + cep
  ctx.lineWidth = 0.05; ctx.strokeStyle = shade(OVERALL, -0.25); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-w * 0.18, h * 0.18); ctx.lineTo(-w * 0.18, h * 0.5); ctx.moveTo(w * 0.22, h * 0.18); ctx.lineTo(w * 0.22, h * 0.5); ctx.stroke();
  ctx.beginPath(); rr(ctx, -w * 0.05, -h * 0.12, w * 0.32, h * 0.2, 0.03); fs(ctx, px, shade(OVERALL, -0.15), 1.4);
  ctx.beginPath(); rr(ctx, -w / 2, h / 2 - 0.02, w, 0.0001, 0); // (yer tutucu)
  ctx.beginPath(); rr(ctx, -w / 2, -h / 2, w, h, 0.09); ctx.lineWidth = 2.2 * px; ctx.strokeStyle = INK; ctx.stroke();
}

/** Kafa (kafa yerelinde). R = kask yarıçapı. */
function head(ctx, h, px, scared, look) {
  const R = h.r * 1.34;
  // fındık sapı
  ctx.beginPath(); rr(ctx, -0.035, R - 0.04, 0.07, 0.1, 0.03); fs(ctx, px, '#8a5f33', 1.6);
  circle(ctx, 0, 0, R); fs(ctx, px, HELMET, 2.2);
  ctx.save(); ctx.clip();
  ctx.fillStyle = shade(HELMET, -0.15); ctx.fillRect(-R, -R, R * 2, R * 0.55);       // alt gölge
  // yüz penceresi
  ctx.beginPath(); ctx.ellipse(R * 0.3, -R * 0.08, R * 0.62, R * 0.58, 0, 0, TAU); ctx.fillStyle = SKIN; ctx.fill(); ctx.lineWidth = 1.8 * px; ctx.strokeStyle = INK; ctx.stroke();
  ctx.restore();
  // parlak
  ctx.beginPath(); ctx.ellipse(-R * 0.35, R * 0.55, R * 0.3, R * 0.12, 0.5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill();
  // kask şeridi
  ctx.beginPath(); ctx.arc(0, 0, R * 0.9, Math.PI * 0.62, Math.PI * 0.95); ctx.lineWidth = 0.035; ctx.strokeStyle = '#e8453c'; ctx.stroke();
  // göz
  const ex = R * 0.44, ey = R * 0.02, er = R * (scared ? 0.36 : 0.31);
  circle(ctx, ex, ey, er); fs(ctx, px, '#ffffff', 1.5);
  circle(ctx, ex + er * 0.35 * look[0], ey + er * 0.3 * look[1], er * (scared ? 0.32 : 0.52)); ctx.fillStyle = INK; ctx.fill();
  if (!scared) { circle(ctx, ex + er * 0.45, ey + er * 0.32, er * 0.14); ctx.fillStyle = '#fff'; ctx.fill(); }
  // kaş
  ctx.lineWidth = 0.03; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.beginPath();
  if (scared) { ctx.moveTo(ex - er, ey + er * 1.45); ctx.lineTo(ex + er * 0.9, ey + er * 1.8); } else { ctx.moveTo(ex - er, ey + er * 1.3); ctx.lineTo(ex + er * 0.9, ey + er * 1.1); }
  ctx.stroke();
  // ağız
  if (scared) { ctx.beginPath(); ctx.ellipse(R * 0.55, -R * 0.34, R * 0.1, R * 0.15, 0, 0, TAU); ctx.fillStyle = '#7a2b2b'; ctx.fill(); ctx.lineWidth = 1.5 * px; ctx.strokeStyle = INK; ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(R * 0.5, -R * 0.2, R * 0.2, Math.PI * 0.15, Math.PI * 0.85); ctx.lineWidth = 0.028; ctx.strokeStyle = INK; ctx.stroke(); }
  // yanak
  circle(ctx, R * 0.2, -R * 0.26, R * 0.1); ctx.fillStyle = 'rgba(255,120,120,.5)'; ctx.fill();
}

const look = [1, 0];
/** @param d snapshot.driver (ara değerlenmiş)  @param px  @param t zaman (sn) — ragdoll sallanması */
export function drawDriver(ctx, d, px, t = ART.t) {
  const T = d.torso, H = d.head, rag = d.state === 'ragdoll';
  ctx.save(); ctx.translate(T.x, T.y); ctx.rotate(T.a);
  const w = T.w, h = T.h;
  if (rag) {
    const ph = T.x * 1.7;
    // bacaklar (gövdenin altından, sallanır)
    for (let i = 0; i < 2; i++) {
      const ang = -Math.PI / 2 + (i ? 0.5 : -0.35) + Math.sin(t * 13 + ph + i * 2) * 0.55;
      const hx = (i ? 0.06 : -0.06), hy = -h / 2 + 0.05;
      const kx = hx + Math.cos(ang) * 0.22, ky = hy + Math.sin(ang) * 0.22;
      const fx = kx + Math.cos(ang + 0.5 * Math.sin(t * 9 + i)) * 0.2, fy = ky + Math.sin(ang + 0.5 * Math.sin(t * 9 + i)) * 0.2;
      limb(ctx, hx, hy, kx, ky, 0.11, shade(OVERALL, -0.1), px); limb(ctx, kx, ky, fx, fy, 0.11, shade(OVERALL, -0.1), px);
      circle(ctx, fx, fy, 0.075); fs(ctx, px, BOOT, 1.6);
    }
    // arka kol
    armRag(ctx, t, ph + 1.3, -1, w, h, px);
  } else {
    // oturan: arka kol direksiyona
    limb(ctx, -0.02, h * 0.22, 0.2, h * 0.02, 0.1, shade(OVERALL, -0.12), px);
    limb(ctx, 0.2, h * 0.02, 0.34, -h * 0.1, 0.1, shade(OVERALL, -0.12), px);
  }
  torso(ctx, T, px);
  if (rag) armRag(ctx, t, ph0(T), 1, w, h, px);
  else {
    limb(ctx, 0.02, h * 0.24, 0.24, h * 0.0, 0.11, OVERALL, px);
    limb(ctx, 0.24, h * 0.0, 0.38, -h * 0.12, 0.11, OVERALL, px);
    circle(ctx, 0.39, -h * 0.12, 0.065); fs(ctx, px, '#fff', 1.6);   // eldiven
  }
  ctx.restore();
  ctx.save(); ctx.translate(H.x, H.y); ctx.rotate(H.a);
  head(ctx, H, px, rag, look);
  ctx.restore();
}
const ph0 = (T) => T.y * 2.1;
function armRag(ctx, t, ph, side, w, h, px) {
  const sx = 0.02, sy = h * 0.3;
  const a1 = Math.PI / 2 + side * 0.5 + Math.sin(t * 15 + ph) * 0.7;
  const ex = sx + Math.cos(a1) * 0.2, ey = sy + Math.sin(a1) * 0.2;
  const a2 = a1 + Math.sin(t * 11 + ph) * 0.9;
  const hx = ex + Math.cos(a2) * 0.2, hy = ey + Math.sin(a2) * 0.2;
  limb(ctx, sx, sy, ex, ey, 0.1, OVERALL, px); limb(ctx, ex, ey, hx, hy, 0.1, OVERALL, px);
  circle(ctx, hx, hy, 0.065); fs(ctx, px, '#fff', 1.6);
}
void clamp;
