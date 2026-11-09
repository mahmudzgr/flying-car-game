// Partikül havuzu (sabit boyutlu, çöp üretmez), patinaj izleri, yüzen yazılar, ortam parçacıkları. Sahip: Grafik.
import { INK, rgba } from '../art/palette.js';
import { TAU, text, clamp } from '../art/util.js';

// kinds: 0 nokta, 1 yumuşak duman/toz (büyür, solar), 2 kıymık/parça (döner dikdörtgen), 3 yıldız, 4 halka, 5 çizgi, 6 konfeti
export function createParticles(max = 320) {
  const X = new Float32Array(max), Y = new Float32Array(max), VX = new Float32Array(max), VY = new Float32Array(max);
  const LIFE = new Float32Array(max), TMAX = new Float32Array(max), SZ = new Float32Array(max), ROT = new Float32Array(max), VR = new Float32Array(max);
  const GR = new Float32Array(max), DR = new Float32Array(max), GROW = new Float32Array(max), A0 = new Float32Array(max);
  const KIND = new Uint8Array(max);
  const COL = new Array(max).fill('#fff');
  let n = 0, cap = max;

  function spawn(kind, x, y, vx, vy, life, size, col, grav = 0, drag = 0, grow = 0, vr = 0, alpha = 1) {
    if (n >= cap) return;
    const i = n++;
    X[i] = x; Y[i] = y; VX[i] = vx; VY[i] = vy; LIFE[i] = life; TMAX[i] = life; SZ[i] = size; COL[i] = col; GR[i] = grav; DR[i] = drag; GROW[i] = grow;
    KIND[i] = kind; ROT[i] = Math.random() * TAU; VR[i] = vr; A0[i] = alpha;
  }
  function update(dt) {
    for (let i = 0; i < n;) {
      LIFE[i] -= dt;
      if (LIFE[i] <= 0) { // sondakini bu yuvaya taşı
        const j = --n; if (i !== j) { X[i] = X[j]; Y[i] = Y[j]; VX[i] = VX[j]; VY[i] = VY[j]; LIFE[i] = LIFE[j]; TMAX[i] = TMAX[j]; SZ[i] = SZ[j]; ROT[i] = ROT[j]; VR[i] = VR[j]; GR[i] = GR[j]; DR[i] = DR[j]; GROW[i] = GROW[j]; A0[i] = A0[j]; KIND[i] = KIND[j]; COL[i] = COL[j]; }
        continue;
      }
      const dk = Math.max(0, 1 - DR[i] * dt);
      VX[i] *= dk; VY[i] = VY[i] * dk + GR[i] * dt;
      X[i] += VX[i] * dt; Y[i] += VY[i] * dt; ROT[i] += VR[i] * dt; SZ[i] += GROW[i] * dt;
      i++;
    }
  }
  function draw(ctx, px) {
    for (let i = 0; i < n; i++) {
      const k = LIFE[i] / TMAX[i];            // 1 → 0
      const kind = KIND[i], sz = SZ[i];
      switch (kind) {
        case 0: ctx.globalAlpha = A0[i] * Math.min(1, k * 3); ctx.fillStyle = COL[i]; ctx.beginPath(); ctx.arc(X[i], Y[i], sz * (0.5 + 0.5 * k), 0, TAU); ctx.fill(); break;
        case 1: ctx.globalAlpha = A0[i] * k * k; ctx.fillStyle = COL[i]; ctx.beginPath(); ctx.arc(X[i], Y[i], sz, 0, TAU); ctx.fill(); break;
        case 2: ctx.globalAlpha = A0[i] * Math.min(1, k * 4); ctx.fillStyle = COL[i]; ctx.save(); ctx.translate(X[i], Y[i]); ctx.rotate(ROT[i]); ctx.fillRect(-sz, -sz * 0.4, sz * 2, sz * 0.8); ctx.lineWidth = 1 * px; ctx.strokeStyle = INK; ctx.strokeRect(-sz, -sz * 0.4, sz * 2, sz * 0.8); ctx.restore(); break;
        case 3: { ctx.globalAlpha = A0[i] * Math.min(1, k * 2.5); ctx.fillStyle = COL[i]; ctx.save(); ctx.translate(X[i], Y[i]); ctx.rotate(ROT[i]); const s = sz * (0.4 + 0.6 * k);
          ctx.beginPath(); ctx.moveTo(0, s); ctx.lineTo(s * 0.28, s * 0.28); ctx.lineTo(s, 0); ctx.lineTo(s * 0.28, -s * 0.28); ctx.lineTo(0, -s); ctx.lineTo(-s * 0.28, -s * 0.28); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.28, s * 0.28); ctx.closePath(); ctx.fill(); ctx.restore(); break; }
        case 4: ctx.globalAlpha = A0[i] * k; ctx.strokeStyle = COL[i]; ctx.lineWidth = Math.max(1, 5 * k) * px; ctx.beginPath(); ctx.arc(X[i], Y[i], sz, 0, TAU); ctx.stroke(); break;
        case 5: ctx.globalAlpha = A0[i] * k; ctx.strokeStyle = COL[i]; ctx.lineWidth = 2 * px; ctx.beginPath(); ctx.moveTo(X[i], Y[i]); ctx.lineTo(X[i] - VX[i] * 0.04, Y[i] - VY[i] * 0.04); ctx.stroke(); break;
        case 6: ctx.globalAlpha = A0[i] * Math.min(1, k * 3); ctx.fillStyle = COL[i]; ctx.save(); ctx.translate(X[i], Y[i]); ctx.rotate(ROT[i]); ctx.scale(1, Math.cos(ROT[i] * 2.3)); ctx.fillRect(-sz, -sz * 0.5, sz * 2, sz); ctx.restore(); break;
        default: break;
      }
    }
    ctx.globalAlpha = 1;
  }
  return { spawn, update, draw, clear() { n = 0; }, get count() { return n; }, setCap(c) { cap = Math.min(max, c); } };
}

// ---------------------------------------------------------------- patinaj / tekerlek izi
const SKID_COL = { asphalt: '#1c1722', dirt: '#4a3320', grass: '#3b6a3c', gravel: '#5a5a56', sand: '#a98a4c', mud: '#24150a', wet: '#33414a', snow: '#a9bfd4', ice: '#9fc8de', water: '#2f7fb4' };
export function createSkids(max = 120) {
  const x0 = new Float32Array(max), y0 = new Float32Array(max), x1 = new Float32Array(max), y1 = new Float32Array(max), life = new Float32Array(max), w = new Float32Array(max);
  const col = new Array(max).fill('#000');
  let head = 0;
  return {
    add(ax, ay, bx, by, surf, width = 0.1, ttl = 7) { const i = head; head = (head + 1) % max; x0[i] = ax; y0[i] = ay; x1[i] = bx; y1[i] = by; life[i] = ttl; w[i] = width; col[i] = SKID_COL[surf] ?? '#222'; },
    update(dt) { for (let i = 0; i < max; i++) if (life[i] > 0) life[i] -= dt; },
    draw(ctx, xa, xb) {
      ctx.lineCap = 'round';
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue;
        if (x1[i] < xa || x0[i] > xb) continue;
        ctx.globalAlpha = Math.min(0.55, life[i] * 0.2);
        ctx.strokeStyle = col[i]; ctx.lineWidth = w[i];
        ctx.beginPath(); ctx.moveTo(x0[i], y0[i]); ctx.lineTo(x1[i], y1[i]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    clear() { life.fill(0); },
  };
}

// ---------------------------------------------------------------- yüzen yazılar (kombo, takla, kuruş...)
export function createTexts(max = 10) {
  const items = [];
  for (let i = 0; i < max; i++) items.push({ on: false, s: '', x: 0, y: 0, vy: 1, life: 0, tmax: 1, size: 0.5, col: '#fff', pop: 0 });
  let next = 0;
  return {
    add(s, x, y, size = 0.5, col = '#fff', life = 1.1, vy = 1.4) {
      const t = items[next]; next = (next + 1) % max;
      t.on = true; t.s = s; t.x = x; t.y = y; t.size = size; t.col = col; t.life = t.tmax = life; t.vy = vy;
    },
    update(dt) { for (const t of items) if (t.on) { t.life -= dt; t.y += t.vy * dt; t.vy *= Math.max(0, 1 - 2.2 * dt); if (t.life <= 0) t.on = false; } },
    draw(ctx, px) {
      for (const t of items) {
        if (!t.on) continue;
        const k = t.life / t.tmax, age = 1 - k;
        const pop = age < 0.12 ? 0.6 + (age / 0.12) * 0.55 : age < 0.22 ? 1.15 - ((age - 0.12) / 0.1) * 0.15 : 1;
        ctx.globalAlpha = Math.min(1, k * 3);
        text(ctx, t.s, t.x, t.y, t.size * pop, t.col, px, 'center', 4);
      }
      ctx.globalAlpha = 1;
    },
    clear() { for (const t of items) t.on = false; },
  };
}

// ---------------------------------------------------------------- ortam (ekran uzayı): yaprak, toz, ateşböceği, kar
export function createAmbient(n = 26) {
  const a = [];
  for (let i = 0; i < n; i++) a.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), ph: Math.random() * 6.28 });
  return {
    update(dt, biome, camDx, view) {
      for (const p of a) {
        const fall = biome === 'zirve' ? 0.08 + p.s * 0.05 : biome === 'elma' ? 0.04 : biome === 'bataklik' ? 0 : 0.0;
        const wind = biome === 'kanyon' ? -0.05 : biome === 'zirve' ? -0.02 : -0.025;
        p.y += (fall + (biome === 'bataklik' ? Math.sin(p.ph) * 0.0 : 0)) * dt * 1;
        p.x += (wind * p.s) * dt - camDx * 0.9 / view.w;
        if (biome === 'bataklik') p.y += Math.sin(p.ph + p.x * 9) * 0.0008;
        p.ph += dt * 1.4;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        if (p.y < -0.1) p.y = 1.05;
        if (p.x < -0.05) p.x += 1.1; else if (p.x > 1.05) p.x -= 1.1;
      }
    },
    draw(ctx, biome, view, t, quality) {
      const cnt = quality === 'low' ? 10 : a.length;
      for (let i = 0; i < cnt; i++) {
        const p = a[i], x = p.x * view.w, y = p.y * view.h;
        if (biome === 'zirve') { ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + Math.sin(p.ph) * 6, y, 1.3 + p.s * 1.4, 0, TAU); ctx.fill(); }
        else if (biome === 'elma') { ctx.globalAlpha = 0.8; ctx.save(); ctx.translate(x + Math.sin(p.ph) * 10, y); ctx.rotate(p.ph); ctx.fillStyle = i % 3 ? '#8cc152' : '#f0a23c'; ctx.beginPath(); ctx.ellipse(0, 0, 4 * p.s, 2 * p.s, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        else if (biome === 'kanyon') { ctx.globalAlpha = 0.45; ctx.fillStyle = '#ffe9b8'; ctx.beginPath(); ctx.arc(x, y, 1.2 + p.s, 0, TAU); ctx.fill(); }
        else { const g = 0.4 + 0.6 * Math.max(0, Math.sin(p.ph * 1.7)); ctx.globalAlpha = g; ctx.fillStyle = '#f7e36a'; ctx.beginPath(); ctx.arc(x, y, 2 * p.s, 0, TAU); ctx.fill(); ctx.globalAlpha = g * 0.25; ctx.beginPath(); ctx.arc(x, y, 7 * p.s, 0, TAU); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    },
  };
}
void rgba; void clamp;
