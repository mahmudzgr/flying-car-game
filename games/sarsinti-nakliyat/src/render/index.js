// Renderer — Canvas 2D, sözleşme: MIMARI §7. Sahip: Grafik.
// Çizim sırası: gökyüzü → bulut → parallax 0/1/2 → zemin → izler → tabelalar → nesneler → kuruşlar → gölge →
// araç(arka) → sürücü → araç(ön) → kargo → partiküller/yazılar → ön plan otları → ortam → vinyet/flaş.
import { CAMERA } from '../config.js';
import { createCamera } from './camera.js';
import { interpolateSnapshot } from './interp.js';
import { drawDebug } from './debug.js';
import { createParticles, createSkids, createTexts, createAmbient } from './particles.js';
import {
  drawSky, drawParallax, drawTerrain, drawForeground, heightAt, slopeAt, clearTerrainCache, clearBackdropCache, prewarmBackdrop, prewarmTerrain,
  drawFinish, drawHintSign, drawVehicleBack, drawVehicleFront, drawShadow, drawDriver, drawCargo, flashCargo, resetCargoFx,
  drawObject, drawBridge, drawProps, drawWater, drawCheckpoint, drawCoin, EXHAUST, ART,
} from '../art/draw.js';
import { BIOMES, SURFACE_TOP, SURFACE_LIGHT, SURFACE_DARK } from '../art/palette.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const LOOSE = { dirt: 1, grass: 1, gravel: 1, sand: 1.3, mud: 1.2, snow: 1.2, ice: 0.5, wet: 0.7 };
const DUST = { dirt: ['#c79a68', '#a8794d'], grass: ['#9bd06a', '#7ab35a'], gravel: ['#bcbcb6', '#9a9a96'], sand: ['#f3dca2', '#e2c27a'], mud: ['#5b3d26', '#3b2615'], snow: ['#ffffff', '#e6f1fa'], ice: ['#e8f8ff', '#bfe6f5'], wet: ['#cfe6f2', '#9db0b8'], asphalt: ['#9aa0a8', '#7a808a'], water: ['#bfe6f5', '#8fd0f0'] };

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{debug?:boolean, quality?:'high'|'low', shake?:0|1|2}} [opts]
 */
export function createRenderer(canvas, opts = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const camera = createCamera();
  let particles = createParticles(320), skids = createSkids(120), texts = createTexts(10), ambient = createAmbient(26);
  let st = null, view = { w: 1, h: 1, dpr: 1 }, out = null, cur = null;
  let T = 0, shakeAmt = 0, shakePh = 0, flash = 0, flashCol = '#fff', vig = 0, vigRed = 0, lastMult = 1, lastCamX = 0, finishWon = false, finishT = 0;
  const wheelAcc = [0, 0, 0, 0, 0, 0]; let exhAcc = 0; const lastContact = [null, null, null, null, null, null];
  const o = { debug: !!opts.debug, quality: opts.quality ?? 'high', shake: opts.shake ?? 2 };
  const range = { x0: 0, x1: 0, y0: 0, y1: 0 };
  const bridgeGroups = [[], [], [], []], plain = [];
  let lastFinishX = null, lastFinishY = 0; const gates = []; const seenCargo = new Map(); let firstCargo = true;
  let vigCv = null, vigKey = '', bgBiome = null, bgPrev = null, bgFade = 1;

  function applyQuality() {
    ART.quality = o.quality;
    particles.setCap(o.quality === 'low' ? 140 : 320);
  }
  function resize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, o.quality === 'low' ? 1.25 : CAMERA.maxDpr);
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    view = { w, h, dpr };
    vigKey = '';
  }
  applyQuality(); resize();

  const vigImage = () => {
    const key = view.w + 'x' + view.h;
    if (key !== vigKey) {
      vigKey = key;
      vigCv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(64, 36) : Object.assign(document.createElement('canvas'), { width: 64, height: 36 });
      const g = vigCv.getContext('2d'), gr = g.createRadialGradient(32, 18, 8, 32, 18, 40);
      gr.addColorStop(0, 'rgba(20,0,10,0)'); gr.addColorStop(0.6, 'rgba(20,0,10,.28)'); gr.addColorStop(1, 'rgba(20,0,10,.75)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 36);
    }
    return vigCv;
  };

  function drawBackdrop(biome, cam, scale) {
    drawSky(ctx, biome, view);
    drawParallax(ctx, biome, 3, cam.x, view, scale, cam.y);
    for (let l = 0; l < 3; l++) drawParallax(ctx, biome, l, cam.x, view, scale, cam.y);
  }
  // ------------------------------------------------------------ yardımcılar
  const sc = () => (o.shake / 2);
  function addShake(a) { if (o.shake) shakeAmt = Math.max(shakeAmt, Math.min(10, a) * sc()); }
  function wheelContact(w, out2) {
    const sl = st ? slopeAt(st, w.x) : 0;
    out2.x = w.x + Math.sin(sl) * w.r; out2.y = w.y - Math.cos(sl) * w.r; return out2;
  }
  const cp = { x: 0, y: 0 };
  function dustBurst(x, y, surf, n, spread = 3, up = 1.5) {
    const c = DUST[surf] ?? DUST.dirt, q = o.quality === 'low' ? 0.6 : 1;
    n = Math.round(n * q);
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      if (surf === 'mud') particles.spawn(0, x, y, dir * Math.random() * spread, 1 + Math.random() * up * 2, 0.55 + Math.random() * 0.4, 0.05 + Math.random() * 0.07, c[i & 1], -14, 0, 0, 0, 1);
      else if (surf === 'gravel') particles.spawn(2, x, y, dir * Math.random() * spread, 1 + Math.random() * up * 2, 0.5 + Math.random() * 0.3, 0.035 + Math.random() * 0.03, c[i & 1], -14, 0, 0, 8, 1);
      else particles.spawn(1, x, y + 0.05, dir * (0.4 + Math.random() * spread), 0.3 + Math.random() * up, 0.5 + Math.random() * 0.45, 0.1 + Math.random() * 0.12, c[i & 1], 0.5, 2.2, 0.35, 0, surf === 'snow' ? 0.85 : 0.55);
    }
  }
  function sparks(x, y, n, nx = 0, ny = 1) {
    for (let i = 0; i < n; i++) { const a = Math.atan2(ny, nx) + (Math.random() - 0.5) * 2.2, s = 2 + Math.random() * 6; particles.spawn(5, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.25 + Math.random() * 0.3, 1, Math.random() < 0.5 ? '#ffd23c' : '#fff3b0', -9, 0.6, 0, 0, 1); }
  }
  function stars(x, y, n, cols, spd = 4) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random()); particles.spawn(3, x, y, Math.cos(a) * s, Math.sin(a) * s + 1, 0.5 + Math.random() * 0.4, 0.1 + Math.random() * 0.1, cols[i % cols.length], -3, 2.2, 0, 4, 1); }
  }
  function cargoById(id) { if (cur) for (const c of cur.cargo) if (c.id === id) return c; return null; }
  function burst(type, x, y, big) {
    const k = big ? 2 : 1;
    if (type === 'eggs') { for (let i = 0; i < 9 * k; i++) particles.spawn(0, x, y, (Math.random() - 0.5) * 5, 1 + Math.random() * 4, 0.7 + Math.random() * 0.4, 0.05 + Math.random() * 0.06, i % 3 ? '#ffc928' : '#fffaf0', -12, 0, 0, 0, 1); for (let i = 0; i < 4; i++) particles.spawn(2, x, y, (Math.random() - 0.5) * 4, 1 + Math.random() * 3, 0.8, 0.05, '#f4e6c8', -12, 0, 0, 9, 1); }
    else if (type === 'watermelon') { for (let i = 0; i < 12 * k; i++) particles.spawn(0, x, y, (Math.random() - 0.5) * 6, 1 + Math.random() * 4.5, 0.7 + Math.random() * 0.5, 0.05 + Math.random() * 0.07, i % 4 ? '#ff5a5f' : '#2f7d3a', -12, 0, 0, 0, 1); for (let i = 0; i < 4; i++) particles.spawn(0, x, y, (Math.random() - 0.5) * 5, 2 + Math.random() * 3, 0.9, 0.025, INKC, -12, 0, 0, 0, 1); }
    else if (type === 'crate') { for (let i = 0; i < 8 * k; i++) particles.spawn(2, x, y, (Math.random() - 0.5) * 6, 1 + Math.random() * 4, 0.7 + Math.random() * 0.4, 0.06 + Math.random() * 0.05, i % 2 ? '#d8a85c' : '#a97a45', -12, 0, 0, 10, 1); }
    else if (type === 'milk') { for (let i = 0; i < 12 * k; i++) particles.spawn(0, x, y, (Math.random() - 0.5) * 5, 1 + Math.random() * 4, 0.6 + Math.random() * 0.4, 0.05 + Math.random() * 0.06, i % 3 ? '#ffffff' : '#dbe8f5', -12, 0, 0, 0, 1); }
    else if (type === 'piano') { sparks(x, y, 8, 0, 1); for (let i = 0; i < 6 * k; i++) particles.spawn(2, x, y, (Math.random() - 0.5) * 5, 1 + Math.random() * 3, 0.8, 0.06, i % 2 ? '#fffaf0' : '#2b2b33', -12, 0, 0, 10, 1); }
    else if (type === 'bale') { for (let i = 0; i < 10 * k; i++) particles.spawn(2, x, y, (Math.random() - 0.5) * 5, 0.5 + Math.random() * 3, 0.9, 0.05, '#e8c547', -6, 0.5, 0, 6, 1); }
    else dustBurst(x, y, 'dirt', 6);
  }
  const INKC = '#2a2230';
  const surfTop = (s) => SURFACE_TOP[s] ?? '#999';

  // ------------------------------------------------------------ sürekli efektler (kare başı)
  function continuousFx(s, dtP) {
    const v = s.vehicle, q = o.quality === 'low' ? 0.5 : 1;
    // tekerlek tozu / izler
    for (let i = 0; i < v.wheels.length && i < 6; i++) {
      const w = v.wheels[i];
      if (!w.onGround || !w.surface) { lastContact[i] = null; continue; }
      wheelContact(w, cp);
      const loose = LOOSE[w.surface] ?? 0;
      const slipping = w.spinning || (v.brake > 0.6 && v.speed > 4 && Math.abs(w.spin * w.r) < v.speed * 0.5);
      const sp = clamp(v.speed - 2, 0, 16);
      let rate = loose * sp * 1.3 * q + (slipping ? 26 * q : 0);
      if (w.surface === 'asphalt') rate = slipping ? 22 * q : 0;
      wheelAcc[i] += rate * dtP;
      while (wheelAcc[i] >= 1) {
        wheelAcc[i] -= 1;
        const back = v.vx >= 0 ? -1 : 1, c = DUST[w.surface] ?? DUST.dirt;
        const vx = back * (0.8 + Math.random() * 2.4) + v.vx * 0.15, vy = 0.5 + Math.random() * 1.8 + (slipping ? 1.5 : 0);
        if (w.surface === 'mud') particles.spawn(0, cp.x, cp.y + 0.05, vx * 1.3, vy * 1.6, 0.5 + Math.random() * 0.4, 0.05 + Math.random() * 0.06, c[Math.random() < 0.5 ? 0 : 1], -14, 0, 0, 0, 1);
        else if (w.surface === 'gravel') particles.spawn(2, cp.x, cp.y + 0.05, vx * 1.4, vy * 1.6, 0.45, 0.03 + Math.random() * 0.03, c[Math.random() < 0.5 ? 0 : 1], -14, 0, 0, 9, 1);
        else particles.spawn(1, cp.x, cp.y + 0.06, vx, vy, 0.45 + Math.random() * 0.45, 0.09 + Math.random() * 0.1, c[Math.random() < 0.5 ? 0 : 1], 0.4, 2, 0.4, 0, w.surface === 'snow' ? 0.85 : w.surface === 'asphalt' ? 0.5 : 0.55);
      }
      // iz: kayarken ya da yumuşak yüzeyde
      const trail = slipping || w.surface === 'snow' || w.surface === 'mud' || (w.surface === 'sand' && v.speed > 3);
      const lc = lastContact[i];
      if (trail && v.speed > 1) {
        if (lc) { if ((cp.x - lc.x) ** 2 + (cp.y - lc.y) ** 2 > 0.04) { skids.add(lc.x, lc.y, cp.x, cp.y, w.surface, slipping ? 0.13 : 0.09, slipping ? 7 : 4.5); lc.x = cp.x; lc.y = cp.y; } }
        else lastContact[i] = { x: cp.x, y: cp.y };
      } else lastContact[i] = null;
    }
    // egzoz
    const ex = EXHAUST[v.id];
    if (ex && s.run.status !== 'failed') {
      const heavy = v.id === 'pasa' || v.id === 'koca';
      const rate = (6 + v.throttle * (heavy ? 30 : 18)) * q;
      exhAcc += rate * dtP;
      const c = Math.cos(v.a), sn = Math.sin(v.a);
      while (exhAcc >= 1) {
        exhAcc -= 1;
        const wx = v.x + ex.x * c - ex.y * sn, wy = v.y + ex.x * sn + ex.y * c;
        const dirx = v.id === 'pasa' || v.id === 'koca' ? 0 : -c, diry = v.id === 'pasa' || v.id === 'koca' ? 1 : -sn;
        particles.spawn(1, wx, wy, dirx * (1 + Math.random()) + v.vx * 0.2, diry * (1 + Math.random()) + (heavy ? 1.4 : 0.4), 0.55 + Math.random() * 0.4, heavy ? 0.1 : 0.06, heavy ? '#3a3340' : '#a8aeb6', 0.9, 1.2, heavy ? 0.5 : 0.28, 0, heavy ? 0.5 : 0.35);
      }
    }
  }

  // kargo: yeni yük gelişi, kayma/çarpma tozu
  function cargoFx(s, dtP) {
    let fresh = 0;
    for (const c of s.cargo) {
      let m = seenCargo.get(c.id);
      if (!m) { m = { x: c.x, y: c.y, slide: 0 }; seenCargo.set(c.id, m); if (!firstCargo && c.state === 'onboard') { fresh++; stars(c.x, c.y + 0.3, 5, ['#ffd23c', '#fff'], 2.5); } continue; }
      if (c.state === 'onboard' && dtP > 0.001 && o.quality !== 'low') {
        const vx = (c.x - m.x) / dtP - s.vehicle.vx, vy = (c.y - m.y) / dtP - s.vehicle.vy;
        const rel = Math.hypot(vx, vy);
        if (rel > 1.3 && rel < 12 && s.vehicle.speed > 0.5 || (rel > 1.3 && rel < 12 && s.vehicle.brake > 0.3)) {
          m.slide += rel * dtP * 6;
          while (m.slide >= 1) { m.slide -= 1; const hh = (c.h || c.r * 2) / 2; particles.spawn(1, c.x, c.y - hh, -Math.sign(vx || 1) * (0.3 + Math.random()), 0.3 + Math.random() * 0.6, 0.35, 0.05 + Math.random() * 0.04, '#d9c9a4', 0.2, 2, 0.2, 0, 0.5); }
        }
      }
      m.x = c.x; m.y = c.y;
    }
    if (fresh) texts.add('YENİ YÜK!', s.vehicle.x, s.vehicle.y + 3.4, 0.5, '#ffd23c', 1.2, 1.4);
    if (s.cargo.length) firstCargo = false;
    if (seenCargo.size > 80) { const ids = new Set(); for (const c of s.cargo) ids.add(c.id); for (const k of seenCargo.keys()) if (!ids.has(k)) seenCargo.delete(k); }
  }

  // ------------------------------------------------------------ ana çizim
  function render(snap, alpha, dt) {
    if (!st) return;
    T += dt; ART.t = T; ART.biome = st.biome; ART.dpr = view.dpr;
    const s = out = interpolateSnapshot(snap, alpha, out); cur = s;
    const ts = clamp(snap.timeScale ?? 1, 0.1, 1), dtP = dt * ts;
    const cam = camera.update(s.vehicle, dt, view.w / view.h, snap.timeScale, view.w, view.h);
    const scale = view.w / cam.width, px = 1 / scale;
    const halfH = view.h / scale / 2;
    vig += ((ts < 0.95 ? 1 : 0) - vig) * (1 - Math.pow(0.5, dt / 0.1));
    flash *= Math.pow(0.5, dt / 0.08);
    // sarsıntı (ekran pikseli, sönümlü, titreşimli)
    shakeAmt *= Math.pow(0.5, dt / 0.07); shakePh += dt * 70;
    let jx = 0, jy = 0;
    if (shakeAmt > 0.15) { jx = Math.sin(shakePh * 1.3) * shakeAmt; jy = Math.cos(shakePh * 1.7) * shakeAmt * 0.8; }
    // mikro titreşim: çakıl / kum / ıslak üstünde hızlıyken
    else if (o.shake && s.vehicle.speed > 6) for (const w of s.vehicle.wheels) if (w.onGround && w.surface === 'gravel') { jy = Math.sin(T * 90) * 0.6 * sc(); break; }

    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    // gökyüzü + parallax; Uzun Yol'da biyom değişince 2 sn'lik çapraz geçiş
    if (st.biome !== bgBiome) { bgPrev = bgBiome; bgBiome = st.biome; bgFade = bgPrev ? 0 : 1; }
    if (bgFade < 1) bgFade = Math.min(1, bgFade + dt / 2);
    if (bgFade < 1 && bgPrev) { drawBackdrop(bgPrev, cam, scale); ctx.globalAlpha = bgFade; drawBackdrop(bgBiome, cam, scale); ctx.globalAlpha = 1; }
    else drawBackdrop(bgBiome, cam, scale);

    const cy = cam.y + camera.bounce;
    ctx.setTransform(view.dpr * scale, 0, 0, -view.dpr * scale, view.dpr * (view.w / 2 - cam.x * scale + jx), view.dpr * (view.h / 2 + cy * scale + jy));
    range.x0 = cam.x - cam.width / 2 - 1; range.x1 = cam.x + cam.width / 2 + 1; range.y0 = cy - halfH - 1; range.y1 = cy + halfH + 1;
    drawTerrain(ctx, st, range, px);
    skids.draw(ctx, range.x0, range.x1);
    if (st.startX + 5 > range.x0 && st.startX - 5 < range.x1) drawFinish(ctx, st.startX + 1.2, st.startY, px, 'start');
    if (lastFinishX !== null && st.finishX !== lastFinishX) { gates.push({ x: lastFinishX, y: lastFinishY }); if (gates.length > 3) gates.shift(); }
    lastFinishX = st.finishX; lastFinishY = st.finishY;
    for (const g of gates) if (g.x > range.x0 - 5 && g.x < range.x1 + 5) drawFinish(ctx, g.x, g.y, px, 'finish');
    drawFinish(ctx, st.finishX, st.finishY, px, 'finish');
    const hs = st.hints;
    if (hs) for (let i = 0; i < hs.length; i++) { const h = hs[i]; if (h.x > range.x0 - 1 && h.x < range.x1 + 1) drawHintSign(ctx, h.x, heightAt(st, h.x), h.icon, px, T); }
    drawProps(ctx, st, range, px);
    drawWater(ctx, st.water, range, px, T, false);
    const cps = st.checkpoints;
    if (cps) for (const cp of cps) if (cp.x > range.x0 - 2 && cp.x < range.x1 + 2) drawCheckpoint(ctx, cp, s.vehicle.x > cp.x - 0.3, px, T);
    // nesneler (köprü tahtaları halatla)
    const bridges = st.props ? st.props : null;
    for (let i = 0; i < bridgeGroups.length; i++) bridgeGroups[i].length = 0;
    plain.length = 0;
    for (const ob of s.objects) {
      if (ob.x < range.x0 - 6 || ob.x > range.x1 + 6) continue;
      if (ob.type === 'plank') {
        let placed = false;
        if (bridges) for (let bi = 0, k = 0; bi < bridges.length; bi++) {
          const b = bridges[bi]; if (b.type !== 'bridge') continue;
          if (ob.x >= b.x - 0.5 && ob.x <= b.x + b.len + 0.5 && ob.y > b.y - 2.5) {
            const idx = Math.floor((ob.x - b.x) / (b.len / b.planks));
            ob.weak = !!b.weak && b.weak.includes(idx) && Math.abs(ob.y - b.y) < 1.2;
            if (k < bridgeGroups.length) bridgeGroups[k].push(ob);
            placed = true; break;
          }
          k++;
        }
        if (!placed) { ob.weak = false; drawObject(ctx, ob, px); }
      } else drawObject(ctx, ob, px);
    }
    if (bridges) for (let bi = 0, k = 0; bi < bridges.length; bi++) {
      const b = bridges[bi]; if (b.type !== 'bridge') continue;
      const g = bridgeGroups[k++]; if (!g || !g.length) continue;
      drawBridge(ctx, b, g, st, px); for (const p of g) drawObject(ctx, p, px);
    }
    for (const k of s.coins) if (!k.taken && k.x > range.x0 - 1 && k.x < range.x1 + 1) drawCoin(ctx, k, px, T);
    // gölge
    const v = s.vehicle;
    const gy = heightAt(st, v.x);
    drawShadow(ctx, v.x, gy, slopeAt(st, v.x), Math.max(0, v.y - gy - 0.5), v.id === 'koca' ? 2.8 : v.id === 'pasa' ? 2.0 : v.id === 'zipir' ? 1.5 : 1.9, px);
    drawVehicleBack(ctx, v, st.vehicle, px, T);
    for (const c of s.cargo) { if (c.x < range.x0 - 4 || c.x > range.x1 + 4) continue; drawCargo(ctx, c, px); }
    drawDriver(ctx, s.driver, px, T);
    drawVehicleFront(ctx, v, st.vehicle, px, T);
    cargoFx(s, dtP);
    if (s.combo && s.combo.count >= 2 && s.combo.timeLeft01 > 0) { // kombo halkası: araç çevresinde azalan yay
      ctx.beginPath(); ctx.arc(v.x, v.y + 0.5, 2.1, Math.PI / 2, Math.PI / 2 + TAU * s.combo.timeLeft01);
      ctx.lineWidth = 5 * px; ctx.strokeStyle = s.combo.multiplier >= 4 ? '#ff7a3c' : '#ffd23c'; ctx.globalAlpha = 0.85; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
    }
    drawWater(ctx, st.water, range, px, T, true);

    // partiküller
    continuousFx(s, dtP);
    particles.update(dtP); skids.update(dtP); texts.update(dtP);
    particles.draw(ctx, px); texts.draw(ctx, px);
    drawForeground(ctx, st, range, px, T);
    if (o.debug) drawDebug(ctx, st, s, px);

    // ekran katmanı
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (o.quality !== 'low' || st.biome === 'zirve') { ambient.update(dtP, bgBiome, cam.x - lastCamX, view); ambient.draw(ctx, bgBiome, view, T, o.quality); }
    lastCamX = cam.x;
    // hız çizgileri
    const spd = v.speed;
    if (spd > 18 && o.quality !== 'low') {
      const a = clamp((spd - 18) / 14, 0, 1) * 0.35; ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 7; i++) { const yy = ((i * 0.137 + T * 0.9) % 1) * view.h, xx = ((i * 0.31 + T * 2.3) % 1) * view.w; ctx.moveTo(xx, yy); ctx.lineTo(xx - 40 - spd, yy); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (vig > 0.02) { ctx.globalAlpha = Math.min(1, vig); ctx.drawImage(vigImage(), 0, 0, view.w, view.h); ctx.globalAlpha = vigRed * vig * 0.4; ctx.fillStyle = '#d02020'; ctx.fillRect(0, 0, view.w, view.h); ctx.globalAlpha = 1; }
    else vigRed *= 0.98;
    if (flash > 0.01) { ctx.globalAlpha = flash; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, view.w, view.h); ctx.globalAlpha = 1; }
    // bitiş konfetisi
    if (finishWon && finishT > 0) { finishT -= dtP; }
  }

  // ------------------------------------------------------------ olaylar
  function vPos(local) { const v = cur.vehicle, c = Math.cos(v.a), sn = Math.sin(v.a); return { x: v.x + local.x * c - local.y * sn, y: v.y + local.x * sn + local.y * c }; }
  function onEvent(e) {
    if (e.name === 'levelStart') { particles.clear(); skids.clear(); texts.clear(); resetCargoFx(); lastMult = 1; flash = 0; vig = 0; shakeAmt = 0; return; }
    if (!cur || !st) return;
    const v = cur.vehicle, q = o.quality === 'low' ? 0.6 : 1;
    switch (e.name) {
      case 'land': {
        const imp = e.impactSpeed ?? 0;
        if (imp > 1.5) addShake(imp * 0.75);
        camera.kick(-clamp(imp * 0.5, 0, 8)); if (imp > 6) camera.punch(0.8);
        for (const w of v.wheels) if (w.onGround || imp > 2) { wheelContact(w, cp); dustBurst(cp.x, cp.y, w.surface ?? 'dirt', Math.min(16, 3 + imp * 1.3), 2 + imp * 0.4, 1 + imp * 0.12); }
        if (imp > 7) { flash = Math.max(flash, 0.1); flashCol = '#fff'; }
        break;
      }
      case 'bodyHit': {
        const p = vPos({ x: e.part === 'roof' ? 0.9 : 0.4, y: e.part === 'roof' ? 1.1 : e.part === 'cab' ? 0.8 : 0 });
        sparks(p.x, p.y, Math.round((6 + e.speed) * q), e.normal?.x ?? 0, e.normal?.y ?? 1);
        addShake(e.speed * 0.8); flash = Math.max(flash, clamp(e.speed * 0.012, 0, 0.18)); flashCol = '#fff';
        if (e.speed > 6) camera.kick(-e.speed * 0.3);
        break;
      }
      case 'cargoHit': {
        const c = cargoById(e.id);
        if (c) {
          const sp = e.speed ?? 2, hh = (c.h ?? c.r * 2) / 2;
          dustBurst(c.x, c.y - hh, 'dirt', 2 + sp * 0.6, 1.5, 1);
          if (c.type === 'crate' || c.type === 'piano') burst('crate', c.x, c.y, false);
          if (sp > 3) addShake(Math.min(4, sp * 0.4));
        }
        break;
      }
      case 'cargoDamage': { const c = cargoById(e.id); if (c) { burst(c.type, c.x, c.y, false); flashCargo(e.id); } break; }
      case 'cargoLost': {
        const c = cargoById(e.id);
        if (c) {
          burst(c.type, c.x, c.y, true);
          if (e.reason === 'water') for (let i = 0; i < 12; i++) particles.spawn(0, c.x, c.y, (Math.random() - 0.5) * 4, 2 + Math.random() * 4, 0.7, 0.06, '#bfe6f5', -12, 0, 0, 0, 1);
          texts.add('✕', c.x, c.y + 0.6, 0.5, '#ff5a5f', 0.9, 1.2);
        }
        break;
      }
      case 'cargoDelivered': {
        const c = cargoById(e.id);
        if (c) { stars(c.x, c.y + 0.3, Math.round(7 * q), ['#ffd23c', '#fff', '#7be08a'], 3.5); if (st.mode !== 'endless') texts.add('+' + e.value, c.x, c.y + 0.7, 0.42, '#7be08a', 1.0, 1.4); }
        break;
      }
      case 'coin': {
        const p = e.pos ?? v;
        stars(p.x, p.y, Math.round(6 * q), ['#ffd23c', '#fff3b0'], 3);
        particles.spawn(4, p.x, p.y, 0, 0, 0.3, 0.25, '#ffd23c', 0, 0, 2.2, 0, 0.9);
        texts.add('+' + (e.value ?? 5), p.x, p.y + 0.5, 0.3, '#ffd23c', 0.7, 2);
        break;
      }
      case 'delivery': { const fx = st.finishX; for (let i = 0; i < 40 * q; i++) { const a = Math.PI * (0.2 + Math.random() * 0.6), sp = 5 + Math.random() * 7; particles.spawn(6, fx + (Math.random() - 0.5) * 3, st.finishY + 3, Math.cos(a) * sp * (Math.random() - 0.5) * 1.6, Math.sin(a) * sp, 1.6 + Math.random(), 0.07 + Math.random() * 0.05, ['#ffd23c', '#e8453c', '#19b5a5', '#fff', '#ff7a3c'][i % 5], -7, 0.6, 0, 6, 1); } texts.add('TESLİM! +' + (e.pay ?? e.coins ?? ''), v.x, v.y + 2.4, 0.6, '#7be08a', 1.6, 1.0); break; }
      case 'comboChange': {
        if (e.count >= 2) {
          const m = 1 + Math.floor(e.count / 2);
          if (m > lastMult) { texts.add('×' + m + '!', v.x, v.y + 2.1, 0.7, m >= 4 ? '#ff7a3c' : '#ffd23c', 1.1, 1.6); particles.spawn(4, v.x, v.y + 0.4, 0, 0, 0.45, 0.6, '#ffd23c', 0, 0, 5, 0, 1); stars(v.x, v.y + 1, Math.round(8 * q), ['#ffd23c', '#fff'], 4.5); }
          lastMult = m;
        }
        break;
      }
      case 'comboBank': { texts.add('+' + e.points, v.x, v.y + 2.0, 0.55, '#7be08a', 1.4, 1.6); stars(v.x, v.y + 1, Math.round(10 * q), ['#7be08a', '#fff', '#ffd23c'], 4); lastMult = 1; break; }
      case 'comboBurn': { lastMult = 1; for (let i = 0; i < 10 * q; i++) particles.spawn(1, v.x + (Math.random() - 0.5), v.y + 1.2, (Math.random() - 0.5) * 2, 1 + Math.random() * 2, 0.9, 0.12, '#4a4552', 0.8, 1, 0.5, 0, 0.7); texts.add('YANDI!', v.x, v.y + 2.0, 0.5, '#ff5a5f', 1.1, 1.2); break; }
      case 'flip': { camera.punch(1.6); flash = Math.max(flash, 0.12); flashCol = '#bfeaff'; texts.add(e.count > 1 ? e.count + '× TAKLA!' : 'TAKLA!', v.x, v.y + 2.2, 0.62, '#4fd0ff', 1.2, 1.5); stars(v.x, v.y + 0.8, Math.round(9 * q), ['#4fd0ff', '#fff', '#ffd23c'], 5); particles.spawn(4, v.x, v.y + 0.6, 0, 0, 0.5, 0.5, '#4fd0ff', 0, 0, 6, 0, 1); break; }
      case 'wheelie': { texts.add('TEK TEKER! ' + e.duration.toFixed(1) + ' sn', v.x, v.y + 2.0, 0.42, '#ff7a3c', 1.1, 1.3); break; }
      case 'nearMiss': { texts.add('ÇOK YAKIN!', v.x, v.y + 2.0, 0.42, '#ffd23c', 0.9, 1.4); break; }
      case 'driverEject': {
        const p = e.pos ?? cur.driver.head;
        addShake(10); flash = 0.35; flashCol = '#ff6a5a'; vigRed = 1; camera.kick(-4);
        stars(p.x, p.y, Math.round(10 * q), ['#ffd23c', '#fff', '#ff6a5a'], 5);
        texts.add('AY!', p.x, p.y + 1.0, 0.7, '#ff5a5f', 1.0, 1.6);
        break;
      }
      case 'crash': { const p = e.pos ?? v; for (let i = 0; i < 12 * q; i++) particles.spawn(1, p.x, p.y + 0.3, (Math.random() - 0.5) * 3, 0.5 + Math.random() * 2.5, 1 + Math.random() * 0.6, 0.14, '#5b535e', 0.6, 1.2, 0.4, 0, 0.7); break; }
      case 'hazardTrigger': { const p = e.pos ?? v; dustBurst(p.x, p.y - 0.5, 'dirt', 14, 3, 2); addShake(3); break; }
      case 'surfaceChange': {
        if (e.to === 'water' || e.from === 'water') { const w0 = v.wheels.find((q2) => q2.id === e.wheel); if (w0) { for (let i = 0; i < 14 * q; i++) particles.spawn(0, w0.x, w0.y, (Math.random() - 0.5) * 5, 1.5 + Math.random() * 4, 0.7, 0.05 + Math.random() * 0.06, i % 3 ? '#bfe6f5' : '#ffffff', -12, 0, 0, 0, 1); particles.spawn(4, w0.x, w0.y, 0, 0, 0.5, 0.4, '#ffffff', 0, 0, 3, 0, 0.9); } break; } const w = v.wheels.find((q2) => q2.id === e.wheel); if (w) { wheelContact(w, cp); dustBurst(cp.x, cp.y, e.to ?? 'dirt', 3, 1.5, 1); } break; }
      case 'suspension': { if (e.bottomOut) { const w = v.wheels.find((q2) => q2.id === e.wheel); if (w) { sparks(w.x, w.y + 0.2, 4, 0, 1); addShake(1.5); } } break; }
      case 'levelEnd': {
        if (e.result === 'win') { const fx = st.finishX; for (let i = 0; i < 70 * q; i++) { const a = Math.PI * (0.25 + Math.random() * 0.5), sp = 6 + Math.random() * 8; particles.spawn(6, fx + (Math.random() - 0.5) * 3, st.finishY + 3, Math.cos(a) * sp * (Math.random() - 0.5) * 1.6, Math.sin(a) * sp, 1.8 + Math.random(), 0.07 + Math.random() * 0.05, ['#ffd23c', '#e8453c', '#19b5a5', '#fff', '#ff7a3c'][i % 5], -7, 0.6, 0, 6, 1); } texts.add('TESLİM!', fxClamp(v.x), v.y + 2.4, 0.8, '#7be08a', 1.6, 1.0); }
        break;
      }
      default: break;
    }
  }
  const fxClamp = (x) => x;

  // olay dışı "wheelspin" ek efekti
  const base = onEvent;
  function onEventWrap(e) {
    base(e);
    if (e.name === 'wheelspin' && cur && st) {
      const w = cur.vehicle.wheels.find((q2) => q2.id === e.wheel);
      if (w && w.onGround) { wheelContact(w, cp); if (e.surface === 'asphalt') for (let i = 0; i < 2; i++) particles.spawn(1, cp.x, cp.y + 0.05, -1 - Math.random() * 2, 0.3 + Math.random(), 0.8, 0.1, '#a8aeb6', 0.6, 1.5, 0.45, 0, 0.5); else dustBurst(cp.x, cp.y, e.surface ?? 'dirt', 3, 2.5, 1.5); }
    }
  }

  return {
    /** Bölüm başında bir kez: sim.static. */
    setLevel(staticSnap) {
      if (st) clearTerrainCache(st);
      lastFinishX = null; gates.length = 0; seenCargo.clear(); firstCargo = true;
      st = staticSnap; bgBiome = st.biome; bgPrev = null; bgFade = 1; camera.reset(); shakeAmt = 0; flash = 0; vig = 0; out = null; cur = null; lastMult = 1;
      particles.clear(); skids.clear(); texts.clear(); resetCargoFx(); clearBackdropCache();
      ART.biome = st.biome; ART.dpr = view.dpr;
      try { prewarmBackdrop(st.biome, view, view.dpr); prewarmTerrain(st, (st.spawn?.x ?? 0) - 20, (st.spawn?.x ?? 0) + 45); } catch (e) { /* önbellek ısıtma isteğe bağlı */ }
    },
    render,
    onEvent: onEventWrap,
    resize,
    setOptions(p) {
      const q = o.quality;
      Object.assign(o, p);
      if (p.quality && p.quality !== q) { ART.quality = o.quality; applyQuality(); clearBackdropCache(); if (st) clearTerrainCache(st); resize(); }
    },
    destroy() { if (st) clearTerrainCache(st); st = null; cur = null; out = null; },
  };
}
void BIOMES; void SURFACE_LIGHT; void SURFACE_DARK;
