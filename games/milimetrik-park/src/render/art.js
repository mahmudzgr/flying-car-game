// Milimetrik Park — prosedürel dokular ve araç çizimleri (kuş bakışı).
// Araç çizimleri yerel koordinatta: x ileri (sprite'ta sağa), y sağ (sprite'ta aşağı), metre.
import { rng } from '../levels/build.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

function noiseFill(ctx, w, h, base, amp, seed, grain = 1) {
  const r = rng(seed);
  const img = ctx.createImageData(w, h);
  const [br, bg, bb] = base;
  for (let i = 0; i < w * h; i++) {
    const n = (r() - 0.5) * amp + (r() - 0.5) * amp * 0.5 * grain;
    img.data[i * 4] = br + n; img.data[i * 4 + 1] = bg + n; img.data[i * 4 + 2] = bb + n; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Dokular: {canvas, meters} — meters: dokunun dünyada kapladığı kenar uzunluğu. */
export function makeTextures() {
  const T = {};
  // asfalt
  {
    const c = canvas(256, 256), x = c.getContext('2d');
    noiseFill(x, 256, 256, [62, 66, 72], 18, 11);
    const r = rng(5);
    for (let i = 0; i < 26; i++) {
      x.fillStyle = `rgba(${r() < 0.5 ? '30,32,36' : '92,96,100'},${0.05 + r() * 0.06})`;
      x.beginPath(); x.ellipse(r() * 256, r() * 256, 8 + r() * 30, 6 + r() * 22, r() * 3, 0, Math.PI * 2); x.fill();
    }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(150,150,150,${r() * 0.18})`; x.fillRect(r() * 256, r() * 256, 1, 1); }
    T.asphalt = { canvas: c, meters: 5 };
  }
  // beton zemin (kapalı otopark)
  {
    const c = canvas(256, 256), x = c.getContext('2d');
    noiseFill(x, 256, 256, [104, 110, 108], 8, 21, 0.4);
    const r = rng(9);
    for (let i = 0; i < 14; i++) {
      x.fillStyle = `rgba(40,44,44,${0.03 + r() * 0.05})`;
      x.beginPath(); x.ellipse(r() * 256, r() * 256, 10 + r() * 40, 8 + r() * 26, r() * 3, 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = 'rgba(40,44,46,0.35)'; x.lineWidth = 1.5;
    x.strokeRect(0.75, 0.75, 254.5, 254.5);
    T.floor = { canvas: c, meters: 6 };
  }
  // beton (garaj içi / döşeme)
  {
    const c = canvas(128, 128), x = c.getContext('2d');
    noiseFill(x, 128, 128, [152, 154, 150], 10, 31, 0.5);
    x.strokeStyle = 'rgba(70,72,70,0.4)'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, 127, 127);
    T.concrete = { canvas: c, meters: 2 };
  }
  // çim
  {
    const c = canvas(256, 256), x = c.getContext('2d');
    noiseFill(x, 256, 256, [78, 128, 58], 26, 41);
    const r = rng(43);
    for (let i = 0; i < 1600; i++) {
      x.strokeStyle = r() < 0.5 ? `rgba(40,86,30,${0.25 + r() * 0.3})` : `rgba(130,176,90,${0.18 + r() * 0.25})`;
      const px = r() * 256, py = r() * 256, a = -Math.PI / 2 + (r() - 0.5) * 1.2;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 4, py + Math.sin(a) * 4); x.stroke();
    }
    T.grass = { canvas: c, meters: 4 };
  }
  // kaldırım taşı
  {
    const c = canvas(128, 128), x = c.getContext('2d');
    noiseFill(x, 128, 128, [176, 170, 160], 14, 51);
    x.strokeStyle = 'rgba(95,90,82,0.55)'; x.lineWidth = 1.4;
    const s = 32;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const ox = (row % 2) * (s / 2);
        x.strokeRect(col * s - ox + 0.7, row * s + 0.7, s - 1.4, s - 1.4);
      }
    }
    T.sidewalk = { canvas: c, meters: 1.6 };
  }
  // çit / çalı
  {
    const c = canvas(128, 128), x = c.getContext('2d');
    noiseFill(x, 128, 128, [46, 92, 40], 22, 61);
    const r = rng(63);
    for (let i = 0; i < 90; i++) {
      x.fillStyle = r() < 0.5 ? `rgba(28,64,26,${0.3 + r() * 0.3})` : `rgba(104,150,70,${0.25 + r() * 0.3})`;
      x.beginPath(); x.arc(r() * 128, r() * 128, 3 + r() * 7, 0, Math.PI * 2); x.fill();
    }
    T.hedge = { canvas: c, meters: 2 };
  }
  // kapalı alan dış zemini (görünmeyen kısım)
  {
    const c = canvas(64, 64), x = c.getContext('2d');
    noiseFill(x, 64, 64, [36, 38, 42], 6, 71);
    T.indoor = { canvas: c, meters: 4 };
  }
  return T;
}

// ------------------------------------------------------------------ araçlar

const MODEL_SHAPE = {
  //       kaput  cam    tavan  arka cam   (boyun yüzdesi, önden)   greenhouse genişliği
  hatch: { ws: [0.25, 0.39], roof: [0.39, 0.8], rw: [0.8, 0.93], gw: 0.8, rf: 0.34, rr: 0.22 },
  sedan: { ws: [0.27, 0.39], roof: [0.39, 0.68], rw: [0.68, 0.79], gw: 0.79, rf: 0.36, rr: 0.26 },
  suv: { ws: [0.23, 0.34], roof: [0.34, 0.86], rw: [0.86, 0.94], gw: 0.82, rf: 0.3, rr: 0.18, rails: true },
  van: { ws: [0.12, 0.23], roof: [0.23, 0.975], rw: null, gw: 0.9, rf: 0.28, rr: 0.12, ribs: true },
  mini: { ws: [0.22, 0.37], roof: [0.37, 0.8], rw: [0.8, 0.94], gw: 0.8, rf: 0.42, rr: 0.3 },
};

function shade(col, k) {
  let r, g, b;
  if (col[0] === '#') { const n = parseInt(col.slice(1), 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
  else { [r, g, b] = col.match(/\d+(\.\d+)?/g).map(Number); }
  if (k >= 0) { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  else { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function roundRectPath(ctx, x0, y0, x1, y1, rf, rr) {
  // x1 = ön (yarıçap rf), x0 = arka (yarıçap rr)
  ctx.beginPath();
  ctx.moveTo(x0 + rr, y0);
  ctx.lineTo(x1 - rf, y0);
  ctx.quadraticCurveTo(x1, y0, x1, y0 + rf);
  ctx.lineTo(x1, y1 - rf);
  ctx.quadraticCurveTo(x1, y1, x1 - rf, y1);
  ctx.lineTo(x0 + rr, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - rr);
  ctx.lineTo(x0, y0 + rr);
  ctx.quadraticCurveTo(x0, y0, x0 + rr, y0);
  ctx.closePath();
}

function trap(ctx, xa, wa, xb, wb) {
  ctx.beginPath();
  ctx.moveTo(xa, -wa / 2); ctx.lineTo(xb, -wb / 2); ctx.lineTo(xb, wb / 2); ctx.lineTo(xa, wa / 2); ctx.closePath();
}

/**
 * Aracı (0,0) merkezli, x ileri çizer. o: {roof: renk, stripe: bool}
 */
export function paintCar(ctx, model, color, len, wid, o = {}) {
  const S = MODEL_SHAPE[model] || MODEL_SHAPE.hatch;
  const hl = len / 2, hw = wid / 2;
  const X = (f) => hl - f * len;              // önden oran → x
  // aynalar
  const mx = X(S.ws[0] + 0.02);
  ctx.fillStyle = shade(color, -0.35);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(mx, s * (hw + 0.07), 0.09, 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // gövde
  roundRectPath(ctx, -hl, -hw, hl, hw, S.rf * wid * 0.55, S.rr * wid * 0.55);
  const g = ctx.createLinearGradient(0, -hw, 0, hw);
  g.addColorStop(0, shade(color, -0.32));
  g.addColorStop(0.18, shade(color, -0.06));
  g.addColorStop(0.5, shade(color, 0.1));
  g.addColorStop(0.82, shade(color, -0.06));
  g.addColorStop(1, shade(color, -0.36));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.035;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.stroke();
  // tamponlar
  ctx.fillStyle = 'rgba(25,27,30,0.55)';
  roundRectPath(ctx, hl - 0.09, -hw + 0.18, hl - 0.005, hw - 0.18, 0.04, 0.02); ctx.fill();
  roundRectPath(ctx, -hl + 0.005, -hw + 0.2, -hl + 0.08, hw - 0.2, 0.02, 0.04); ctx.fill();
  // kaput çizgileri
  ctx.strokeStyle = shade(color, -0.2); ctx.lineWidth = 0.025;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(hl - 0.15, s * hw * 0.42); ctx.quadraticCurveTo(X(S.ws[0] * 0.5), s * hw * 0.5, X(S.ws[0]) + 0.05, s * hw * 0.55); ctx.stroke();
  }
  // greenhouse: ön cam, yan camlar, tavan, arka cam
  const gw = wid * S.gw;
  const glass = (x0, x1) => { const gg = ctx.createLinearGradient(x0, 0, x1, 0); gg.addColorStop(0, '#16202a'); gg.addColorStop(1, '#2f4252'); return gg; };
  // yan camlar (tavanın iki yanında ince şerit)
  const sideA = X(S.ws[0] + 0.02), sideB = S.rw ? X(S.rw[1] - 0.01) : X(S.roof[1]);
  ctx.fillStyle = '#1b2530';
  roundRectPath(ctx, sideB, -gw / 2, sideA, gw / 2, 0.12, 0.12); ctx.fill();
  // ön cam
  trap(ctx, X(S.ws[0]), gw, X(S.ws[1]), gw * 0.9);
  ctx.fillStyle = glass(X(S.ws[0]), X(S.ws[1])); ctx.fill();
  // tavan
  const roofCol = o.roof || color;
  const rx1 = X(S.roof[0]) + 0.02, rx0 = X(S.roof[1]) - 0.02;
  roundRectPath(ctx, rx0, -gw * 0.44, rx1, gw * 0.44, 0.1, 0.1);
  const rg = ctx.createLinearGradient(0, -gw * 0.44, 0, gw * 0.44);
  rg.addColorStop(0, shade(roofCol, -0.18)); rg.addColorStop(0.5, shade(roofCol, 0.08)); rg.addColorStop(1, shade(roofCol, -0.2));
  ctx.fillStyle = rg; ctx.fill();
  if (S.rails) {
    ctx.strokeStyle = 'rgba(20,20,20,0.6)'; ctx.lineWidth = 0.05;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(rx0 + 0.1, s * gw * 0.37); ctx.lineTo(rx1 - 0.1, s * gw * 0.37); ctx.stroke(); }
  }
  if (S.ribs) {
    ctx.strokeStyle = shade(roofCol, -0.22); ctx.lineWidth = 0.03;
    for (let x = rx0 + 0.4; x < rx1 - 0.2; x += 0.45) { ctx.beginPath(); ctx.moveTo(x, -gw * 0.4); ctx.lineTo(x, gw * 0.4); ctx.stroke(); }
  }
  if (o.stripe) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(X(S.ws[0]) + 0.02, -0.17, hl - X(S.ws[0]) - 0.12, 0.1);
    ctx.fillRect(X(S.ws[0]) + 0.02, 0.07, hl - X(S.ws[0]) - 0.12, 0.1);
  }
  // arka cam
  if (S.rw) {
    trap(ctx, X(S.rw[0]), gw * 0.88, X(S.rw[1]), gw * 0.8);
    ctx.fillStyle = glass(X(S.rw[1]), X(S.rw[0])); ctx.fill();
  }
  // cam parlaması
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.04;
  ctx.beginPath(); ctx.moveTo(X(S.ws[0]) - 0.05, -gw * 0.3); ctx.lineTo(X(S.ws[1]) + 0.05, -gw * 0.1); ctx.stroke();
  // kapı çizgileri
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 0.02;
  const doors = model === 'van' ? [0.3, 0.55] : model === 'mini' || model === 'hatch' ? [0.47] : [0.42, 0.62];
  for (const f of doors) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X(f), s * (gw / 2 + 0.02)); ctx.lineTo(X(f), s * (hw - 0.03)); ctx.stroke(); }
  // farlar
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#e9edf0';
    ctx.beginPath(); ctx.ellipse(hl - 0.1, s * (hw - 0.24), 0.07, 0.17, s * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9c1b22';
    ctx.beginPath(); ctx.ellipse(-hl + 0.07, s * (hw - 0.2), 0.05, 0.16, -s * 0.15, 0, Math.PI * 2); ctx.fill();
  }
}

/** Yumuşak gölge sprite'ı (dikdörtgen ayak izi). */
export function makeShadow(len, wid, ppm) {
  const pad = 0.5;
  const c = canvas((len + pad * 2) * ppm, (wid + pad * 2) * ppm);
  const x = c.getContext('2d');
  x.scale(ppm, ppm);
  x.translate(len / 2 + pad, wid / 2 + pad);
  x.shadowColor = 'rgba(0,0,0,0.55)';
  x.shadowBlur = 0.22 * ppm;
  x.fillStyle = 'rgba(0,0,0,0.55)';
  roundRectPath(x, -len / 2 + 0.05, -wid / 2 + 0.05, len / 2 - 0.05, wid / 2 - 0.05, 0.4, 0.3);
  x.fill();
  return { canvas: c, pad };
}

/** Önbellekli araç sprite'ı. */
export function createSpriteCache() {
  const cache = new Map();
  return {
    car(model, color, len, wid, ppm, o = {}) {
      const b = Math.pow(2, Math.round(Math.log2(Math.max(8, Math.min(220, ppm))) * 2) / 2);
      const key = `${model}|${color}|${len}|${wid}|${b}|${o.roof || ''}|${o.stripe ? 1 : 0}`;
      let s = cache.get(key);
      if (!s) {
        const pad = 0.3;
        const c = canvas((len + pad * 2) * b, (wid + pad * 2) * b);
        const x = c.getContext('2d');
        x.scale(b, b);
        x.translate(len / 2 + pad, wid / 2 + pad);
        paintCar(x, model, color, len, wid, o);
        s = { canvas: c, pad };
        cache.set(key, s);
      }
      return s;
    },
    shadow(len, wid, ppm) {
      const b = Math.pow(2, Math.round(Math.log2(Math.max(8, Math.min(160, ppm)))));
      const key = `sh|${len}|${wid}|${b}`;
      let s = cache.get(key);
      if (!s) { s = makeShadow(len, wid, b); cache.set(key, s); }
      return s;
    },
    clear() { cache.clear(); },
    get size() { return cache.size; },
  };
}

/** Ağaç tepesi (önbellekli). */
export function makeTree(r, seed, ppm) {
  const pad = 0.3, size = (r + pad) * 2;
  const c = canvas(size * ppm, size * ppm);
  const x = c.getContext('2d');
  x.scale(ppm, ppm);
  x.translate(r + pad, r + pad);
  const R = rng(Math.floor(seed * 1e6) + 7);
  const blobs = [];
  for (let i = 0; i < 9; i++) {
    const a = R() * Math.PI * 2, d = R() * r * 0.55;
    blobs.push([Math.cos(a) * d, Math.sin(a) * d, r * (0.42 + R() * 0.25)]);
  }
  x.fillStyle = '#2c5a2a';
  for (const [bx, by, br] of blobs) { x.beginPath(); x.arc(bx, by, br, 0, Math.PI * 2); x.fill(); }
  for (const [bx, by, br] of blobs) {
    const g = x.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.1, bx, by, br);
    g.addColorStop(0, 'rgba(140,190,90,0.9)');
    g.addColorStop(0.6, 'rgba(66,120,52,0.6)');
    g.addColorStop(1, 'rgba(30,70,30,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(bx, by, br, 0, Math.PI * 2); x.fill();
  }
  return { canvas: c, pad, r };
}
