// Milimetrik Park — kuş bakışı canvas 2D çizimi.
import { makeTextures, createSpriteCache, makeTree } from './art.js';
import { CARS, PLAYER_CAR } from '../config.js';

const SHADOW = { dx: 0.22, dy: 0.32 };          // güneş sol üstte: gölge sağ alta
const HEIGHT = { building: 2.6, wall: 1.2, hedge: 0.8, fence: 0.6, barrier: 0.5, pillar: 0, post: 1.4, lamp: 2.0, cart: 0.5, box: 0.6, trunk: 0 };
const TONES = ['#9c7a64', '#8e959c', '#b5a68e', '#71808f', '#a46b54'];
const LINE = { white: 'rgba(238,238,230,0.9)', yellow: '#e9be2d' };

function polyPath(pts, path = new Path2D()) {
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  path.closePath();
  return path;
}

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

function centroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let dpr = 1;
  let tex = null;
  const pats = {};
  const sprites = createSpriteCache();
  const trees = new Map();
  let level = null, P = null;
  const skids = [];
  const MAX_SKIDS = 1600;
  const lastWheel = [null, null, null, null];
  const parts = [];
  let time = 0;
  const debug = typeof location !== 'undefined' && /[?&]debug\b/.test(location.search);
  const playerSpec = CARS[PLAYER_CAR];

  function ensureTextures() {
    if (tex) return;
    tex = makeTextures();
    for (const [k, t] of Object.entries(tex)) {
      const p = ctx.createPattern(t.canvas, 'repeat');
      const s = t.meters / t.canvas.width;
      try { p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0])); } catch { /* eski tarayıcı: ölçeksiz */ }
      pats[k] = p;
    }
  }

  function resize(cam) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    cam.vw = w; cam.vh = h;
  }

  function setLevel(L) {
    ensureTextures();
    level = L;
    skids.length = 0; parts.length = 0; lastWheel.fill(null);
    P = { areas: [], lines: new Map(), arrows: new Path2D(), curbs: new Path2D(), stoppers: new Path2D(), shadows: new Path2D(), solids: [], circles: [], cars: [], bushes: [], hatches: [], texts: [] };
    for (const a of L.areas) P.areas.push({ type: a.type, path: polyPath(a.pts) });
    for (const m of L.marks) {
      if (m.t === 'line') {
        const key = `${m.color}|${m.w}|${m.dash ? m.dash.join(',') : ''}`;
        let g = P.lines.get(key);
        if (!g) { g = { color: m.color, w: m.w, dash: m.dash, path: new Path2D() }; P.lines.set(key, g); }
        g.path.moveTo(m.pts[0][0], m.pts[0][1]); g.path.lineTo(m.pts[1][0], m.pts[1][1]);
      } else if (m.t === 'arrow') {
        const c = Math.cos(m.a), s = Math.sin(m.a), k = m.s;
        const loc = [[-1.6, -0.14], [0.35, -0.14], [0.35, -0.42], [1.5, 0], [0.35, 0.42], [0.35, 0.14], [-1.6, 0.14]];
        polyPath(loc.map(([x, y]) => [m.x + (x * c - y * s) * k, m.y + (x * s + y * c) * k]), P.arrows);
      } else if (m.t === 'text') P.texts.push(m);
      else if (m.t === 'hatch') P.hatches.push(m);
    }
    for (const c of L.curbs) polyPath(c.verts, c.kind === 'stopper' ? P.stoppers : P.curbs);
    for (const s of L.solids) {
      const h = HEIGHT[s.kind] ?? 0.6;
      if (s.shape === 'circle') {
        P.circles.push(s);
        if (h > 0) { P.shadows.moveTo(s.x + SHADOW.dx * h + s.r, s.y + SHADOW.dy * h); P.shadows.arc(s.x + SHADOW.dx * h, s.y + SHADOW.dy * h, s.r, 0, Math.PI * 2); }
        continue;
      }
      if (s.kind === 'car') { P.cars.push(s); continue; }
      const path = polyPath(s.verts);
      P.solids.push({ s, path, c: centroid(s.verts) });
      if (h > 0 && !L.indoor) polyPath(hull([...s.verts, ...s.verts.map(([x, y]) => [x + SHADOW.dx * h, y + SHADOW.dy * h])]), P.shadows);
      else if (L.indoor && s.kind === 'pillar') polyPath(s.verts.map(([x, y]) => [x + 0.12, y + 0.16]), P.shadows);
    }
    for (const d of L.decor) if (d.kind === 'bush') P.bushes.push(d);
  }

  // ------------------------------------------------------------ efektler

  function spawn(o) { if (parts.length < 400) parts.push(o); }

  function onEvent(e) {
    if (e.type === 'hit') {
      const n = Math.min(26, 6 + e.kmh * 2);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * (2 + e.kmh * 0.4);
        spawn({ t: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.25 + Math.random() * 0.35, age: 0 });
      }
      if (e.kmh > 4) for (let i = 0; i < 6; i++) spawn({ t: 'chip', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 0.8, age: 0, r: 0.04 + Math.random() * 0.05 });
    } else if (e.type === 'curb' || e.type === 'stopper') {
      for (let i = 0; i < 6; i++) spawn({ t: 'dust', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, life: 0.7 + Math.random() * 0.4, age: 0, r: 0.15 });
    } else if (e.type === 'cone') {
      for (let i = 0; i < 5; i++) spawn({ t: 'dust', x: e.x, y: e.y, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), life: 0.6, age: 0, r: 0.12 });
    }
  }

  function update(dt, game) {
    time += dt;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.t === 'spark' ? 3 : 1.8;
      p.vx *= Math.exp(-k * dt); p.vy *= Math.exp(-k * dt);
    }
    if (!game) return;
    const b = game.body, car = game.car, c = b.c, s = b.s;
    for (let i = 0; i < 4; i++) {
      const w = car.wheels[i];
      const x = b.x + w.bx * c - w.by * s, y = b.y + w.bx * s + w.by * c;
      const marking = car.speed > 0.6 && (w.sliding || (w.locked && w.slip > 0.4));
      if (marking && lastWheel[i]) {
        const [px, py] = lastWheel[i];
        if (Math.hypot(x - px, y - py) > 0.06) {
          if (skids.length >= MAX_SKIDS) skids.shift();
          skids.push([px, py, x, y, Math.min(0.55, 0.15 + w.slip / 8)]);
          lastWheel[i] = [x, y];
          if (Math.random() < 0.35 && w.slip > 1.5) spawn({ t: 'smoke', x, y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: 1 + Math.random() * 0.6, age: 0, r: 0.3 });
        }
      } else lastWheel[i] = marking ? [x, y] : null;
    }
  }

  // ------------------------------------------------------------ çizim parçaları

  function drawGround(cam) {
    const L = level;
    // dış zemin
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = L.indoor ? '#24272b' : '#4d7f3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const bb = cam.bounds();
    ctx.fillStyle = L.indoor ? pats.indoor : pats.grass;
    ctx.fillRect(bb.minx, bb.miny, bb.maxx - bb.minx, bb.maxy - bb.miny);
    for (const a of P.areas) {
      ctx.fillStyle = pats[a.type] || pats.asphalt;
      ctx.fill(a.path);
    }
    // kaldırım kenarı gölgesi
    for (const a of P.areas) if (a.type === 'sidewalk') { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.06; ctx.stroke(a.path); }
  }

  function drawMarks() {
    ctx.lineCap = 'butt';
    for (const g of P.lines.values()) {
      ctx.strokeStyle = LINE[g.color] || g.color;
      ctx.lineWidth = g.w;
      ctx.setLineDash(g.dash || []);
      ctx.stroke(g.path);
    }
    ctx.setLineDash([]);
    ctx.fillStyle = LINE.white;
    ctx.fill(P.arrows);
    for (const h of P.hatches) {
      ctx.save();
      ctx.beginPath(); ctx.rect(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0); ctx.clip();
      ctx.strokeStyle = LINE[h.color] || h.color; ctx.lineWidth = 0.14;
      ctx.beginPath();
      for (let k = h.x0 - (h.y1 - h.y0); k < h.x1; k += 0.8) { ctx.moveTo(k, h.y1); ctx.lineTo(k + (h.y1 - h.y0), h.y0); }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = LINE[h.color] || h.color; ctx.lineWidth = 0.12; ctx.strokeRect(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0);
    }
    for (const t of P.texts) {
      ctx.save();
      ctx.translate(t.x, t.y); ctx.rotate(t.a); ctx.scale(t.size / 100, t.size / 100);
      ctx.fillStyle = LINE[t.color] || t.color;
      ctx.font = '800 100px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
  }

  function drawBushes() {
    for (const d of P.bushes) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.arc(d.x + 0.15, d.y + 0.2, d.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pats.hedge;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,50,20,0.5)'; ctx.lineWidth = 0.05; ctx.stroke();
    }
  }

  function drawSpot(game, spot, live, pulse) {
    const c = Math.cos(spot.a), s = Math.sin(spot.a);
    ctx.save();
    ctx.translate(spot.x, spot.y); ctx.rotate(spot.a);
    const ok = live && live.spot === spot && live.inside && live.facingOk;
    const col = ok ? '60,214,120' : '64,150,255';
    ctx.fillStyle = `rgba(${col},${0.14 + 0.1 * pulse})`;
    ctx.fillRect(-spot.l / 2, -spot.w / 2, spot.l, spot.w);
    ctx.strokeStyle = `rgba(${col},${0.75 + 0.25 * pulse})`;
    ctx.lineWidth = 0.09;
    ctx.setLineDash([0.45, 0.3]);
    ctx.lineDashOffset = -time * 0.6;
    ctx.strokeRect(-spot.l / 2 + 0.05, -spot.w / 2 + 0.05, spot.l - 0.1, spot.w - 0.1);
    ctx.setLineDash([]);
    // hayalet araç: istenen yön
    if (!game.level.free || spot.facing !== 'any') {
      const g = game.car.geom;
      const flip = spot.facing === 'tail' ? Math.PI : 0;
      ctx.translate(spot.idealLong || 0, spot.idealLat || 0);
      ctx.rotate(flip);
      ctx.strokeStyle = `rgba(255,255,255,${0.32 + 0.18 * pulse})`;
      ctx.lineWidth = 0.05;
      const hl = g.length / 2, hw = g.hw;
      ctx.beginPath();
      ctx.moveTo(-hl + 0.2, -hw); ctx.lineTo(hl - 0.3, -hw); ctx.quadraticCurveTo(hl, -hw, hl, -hw + 0.3);
      ctx.lineTo(hl, hw - 0.3); ctx.quadraticCurveTo(hl, hw, hl - 0.3, hw); ctx.lineTo(-hl + 0.2, hw);
      ctx.quadraticCurveTo(-hl, hw, -hl, hw - 0.2); ctx.lineTo(-hl, -hw + 0.2); ctx.quadraticCurveTo(-hl, -hw, -hl + 0.2, -hw);
      ctx.stroke();
      // ön yönü oku
      ctx.fillStyle = `rgba(255,255,255,${0.45 + 0.25 * pulse})`;
      ctx.beginPath(); ctx.moveTo(hl - 0.35, 0); ctx.lineTo(hl - 1.0, -0.42); ctx.lineTo(hl - 0.85, 0); ctx.lineTo(hl - 1.0, 0.42); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    void c; void s;
  }

  function drawSkids() {
    if (!skids.length) return;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.19;
    for (const k of skids) {
      ctx.strokeStyle = `rgba(18,18,20,${k[4]})`;
      ctx.beginPath(); ctx.moveTo(k[0], k[1]); ctx.lineTo(k[2], k[3]); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  function drawLow() {
    ctx.fillStyle = '#cbc7bd'; ctx.fill(P.curbs);
    ctx.strokeStyle = '#8f8b82'; ctx.lineWidth = 0.035; ctx.stroke(P.curbs);
    ctx.fillStyle = '#d8c25c'; ctx.fill(P.stoppers);
    ctx.strokeStyle = 'rgba(60,50,20,0.7)'; ctx.lineWidth = 0.03; ctx.stroke(P.stoppers);
  }

  function drawShadows(cam, ppm) {
    ctx.fillStyle = level.indoor ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.26)';
    ctx.fill(P.shadows);
    const off = level.indoor ? { dx: 0.08, dy: 0.12 } : { dx: 0.18, dy: 0.26 };
    for (const s of P.cars) drawCarShadow(s.style.x, s.style.y, s.style.a, s.style.len, s.style.wid, ppm, off);
    for (const t of level.trees) {
      if (level.indoor) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(t.x + 0.9, t.y + 1.3, t.r * 0.95, t.r * 0.9, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawCarShadow(x, y, a, len, wid, ppm, off) {
    const sh = sprites.shadow(len, wid, ppm);
    ctx.save();
    ctx.translate(x + off.dx, y + off.dy); ctx.rotate(a);
    ctx.drawImage(sh.canvas, -len / 2 - sh.pad, -wid / 2 - sh.pad, len + sh.pad * 2, wid + sh.pad * 2);
    ctx.restore();
  }

  function drawSolids() {
    for (const { s, path, c } of P.solids) {
      switch (s.kind) {
        case 'building': {
          const tone = s.style.roof === 'tile' ? '#a8573f' : TONES[(s.style.tone || 0) % TONES.length];
          ctx.fillStyle = tone; ctx.fill(path);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.08; ctx.stroke(path);
          ctx.save(); ctx.clip(path);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.35; ctx.stroke(path);
          if (s.style.roof === 'tile') {
            const xs = s.verts.map((v) => v[0]), ys = s.verts.map((v) => v[1]);
            const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            ctx.strokeStyle = 'rgba(70,25,15,0.35)'; ctx.lineWidth = 0.05;
            for (let y = y0 + 0.35; y < y1; y += 0.35) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(60,20,10,0.6)'; ctx.lineWidth = 0.14;
            ctx.beginPath(); ctx.moveTo(x0 + 0.5, (y0 + y1) / 2); ctx.lineTo(x1 - 0.5, (y0 + y1) / 2); ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.16)';
            ctx.fillRect(c[0] - 0.6, c[1] - 0.35, 1.2, 0.7);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(c[0] + 1.4, c[1] - 0.2, 0.6, 0.45);
          }
          ctx.restore();
          break;
        }
        case 'hedge':
          ctx.fillStyle = pats.hedge; ctx.fill(path);
          ctx.strokeStyle = 'rgba(16,40,16,0.55)'; ctx.lineWidth = 0.06; ctx.stroke(path);
          break;
        case 'wall':
          ctx.fillStyle = level.indoor ? '#4d5259' : '#6b7179'; ctx.fill(path);
          ctx.strokeStyle = level.indoor ? '#7c838c' : '#959ca4'; ctx.lineWidth = 0.05; ctx.stroke(path);
          break;
        case 'fence':
          ctx.fillStyle = '#7d6a52'; ctx.fill(path);
          ctx.strokeStyle = '#4e4031'; ctx.lineWidth = 0.04; ctx.stroke(path);
          break;
        case 'barrier':
          ctx.fillStyle = '#f1f1ef'; ctx.fill(path);
          ctx.save(); ctx.clip(path);
          ctx.strokeStyle = '#d6332c'; ctx.lineWidth = 0.35;
          ctx.beginPath();
          for (let k = -20; k < 40; k += 0.9) { ctx.moveTo(c[0] + k - 10, c[1] - 10); ctx.lineTo(c[0] + k + 10, c[1] + 10); }
          ctx.stroke(); ctx.restore();
          break;
        case 'pillar': {
          ctx.save(); ctx.clip(path);
          ctx.fillStyle = '#1c1c1c'; ctx.fill(path);
          ctx.strokeStyle = '#f0c12c'; ctx.lineWidth = 0.09;
          ctx.beginPath();
          for (let k = -1; k < 1; k += 0.2) { ctx.moveTo(c[0] + k - 0.5, c[1] - 0.5); ctx.lineTo(c[0] + k + 0.5, c[1] + 0.5); }
          ctx.stroke();
          const inner = (s.style.size || 0.6) / 2 - 0.08;
          ctx.fillStyle = '#b7bbbe'; ctx.fillRect(c[0] - inner, c[1] - inner, inner * 2, inner * 2);
          ctx.restore();
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.03; ctx.stroke(path);
          break;
        }
        case 'cart':
          ctx.fillStyle = 'rgba(190,196,202,0.5)'; ctx.fill(path);
          ctx.strokeStyle = '#8d949b'; ctx.lineWidth = 0.04; ctx.stroke(path);
          ctx.save(); ctx.clip(path); ctx.lineWidth = 0.015;
          ctx.beginPath(); for (let k = -1; k < 1; k += 0.1) { ctx.moveTo(c[0] + k, c[1] - 1); ctx.lineTo(c[0] + k, c[1] + 1); } ctx.stroke();
          ctx.restore();
          break;
        default:
          ctx.fillStyle = '#7a7f86'; ctx.fill(path);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.04; ctx.stroke(path);
      }
    }
    for (const s of P.circles) {
      if (s.kind === 'trunk') { ctx.fillStyle = '#5b4231'; }
      else if (s.kind === 'lamp') { ctx.fillStyle = '#3c4148'; }
      else ctx.fillStyle = '#50565d';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.4, 0, Math.PI * 2); ctx.fill();
      if (s.kind === 'lamp') {
        ctx.strokeStyle = '#2f343a'; ctx.lineWidth = 0.08;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - 0.75); ctx.stroke();
        ctx.fillStyle = '#2f343a';
        ctx.beginPath(); ctx.ellipse(s.x, s.y - 0.85, 0.13, 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,246,200,0.75)';
        ctx.beginPath(); ctx.ellipse(s.x, s.y - 0.85, 0.06, 0.13, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  function drawParked(ppm) {
    for (const s of P.cars) {
      const st = s.style;
      const sp = sprites.car(st.model, st.color, st.len, st.wid, ppm);
      ctx.save();
      ctx.translate(st.x, st.y); ctx.rotate(st.a);
      ctx.drawImage(sp.canvas, -st.len / 2 - sp.pad, -st.wid / 2 - sp.pad, st.len + sp.pad * 2, st.wid + sp.pad * 2);
      ctx.restore();
    }
  }

  function drawCones(game, alpha) {
    for (const b of game.cones) {
      const x = b.prevX + (b.x - b.prevX) * alpha, y = b.prevY + (b.y - b.prevY) * alpha;
      const d = b.data;
      ctx.save();
      ctx.translate(x, y);
      if (d.knocked) {
        ctx.rotate(b.a);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-0.32, -0.1, 0.66, 0.26);
        ctx.fillStyle = '#ef6a1d';
        ctx.beginPath(); ctx.moveTo(-0.34, -0.17); ctx.lineTo(0.34, -0.04); ctx.lineTo(0.34, 0.04); ctx.lineTo(-0.34, 0.17); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4f4f0'; ctx.fillRect(-0.05, -0.1, 0.12, 0.2);
        ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-0.4, -0.2, 0.08, 0.4);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(0.07, 0.1, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-0.19, -0.19, 0.38, 0.38);
        ctx.fillStyle = '#ef6a1d'; ctx.beginPath(); ctx.arc(0, 0, 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(0, 0, 0.11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef6a1d'; ctx.beginPath(); ctx.arc(0, 0, 0.065, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawPlayer(game, alpha, ppm) {
    const b = game.body, car = game.car, g = car.geom, sp = car.spec;
    const a = b.prevA + (b.a - b.prevA) * alpha;
    const bx = b.prevX + (b.x - b.prevX) * alpha, by = b.prevY + (b.y - b.prevY) * alpha;
    const c = Math.cos(a), s = Math.sin(a);
    const cx = bx + c * g.gcx, cy = by + s * g.gcx;
    const len = g.length, wid = g.width;
    drawCarShadow(cx, cy, a, len, wid, ppm, level.indoor ? { dx: 0.08, dy: 0.12 } : { dx: 0.18, dy: 0.26 });
    // farlar (kapalı alanda)
    if (level.indoor) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.globalCompositeOperation = 'lighter';
      for (const side of [-1, 1]) {
        const gr = ctx.createRadialGradient(len / 2, side * 0.55, 0.1, len / 2 + 2.5, side * 0.7, 6);
        gr.addColorStop(0, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(len / 2, side * 0.55 - 0.15); ctx.lineTo(len / 2 + 7, side * 0.55 - 2.2); ctx.lineTo(len / 2 + 7, side * 0.55 + 2.2); ctx.lineTo(len / 2, side * 0.55 + 0.15); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // tekerlekler
    ctx.fillStyle = '#141414';
    for (const w of car.wheels) {
      const wx = bx + w.bx * c - w.by * s, wy = by + w.bx * s + w.by * c;
      ctx.save();
      ctx.translate(wx, wy); ctx.rotate(a + w.delta);
      ctx.fillRect(-sp.wheelRadius, -sp.tireWidth / 2, sp.wheelRadius * 2, sp.tireWidth);
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-sp.wheelRadius + 0.06, -0.03, sp.wheelRadius * 2 - 0.12, 0.06);
      ctx.fillStyle = '#141414';
      ctx.restore();
    }
    // gövde (ağırlık aktarımıyla hafif salınım)
    const sx = Math.max(-0.05, Math.min(0.05, -car.axF * 0.006)), sy = Math.max(-0.05, Math.min(0.05, -car.ayF * 0.006));
    const spr = sprites.car('hatch', sp.colors.body, len, wid, ppm, { roof: sp.colors.roof, stripe: true });
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a); ctx.translate(sx, sy);
    ctx.drawImage(spr.canvas, -len / 2 - spr.pad, -wid / 2 - spr.pad, len + spr.pad * 2, wid + spr.pad * 2);
    // lambalar
    ctx.globalCompositeOperation = 'lighter';
    if (car.brake > 0.04 || car.gear === 'P') {
      const k = car.gear === 'P' ? 0.25 : Math.min(1, 0.35 + car.brake);
      for (const side of [-1, 1]) {
        const gr = ctx.createRadialGradient(-len / 2 + 0.05, side * (wid / 2 - 0.2), 0.02, -len / 2 - 0.05, side * (wid / 2 - 0.2), 0.55);
        gr.addColorStop(0, `rgba(255,40,30,${0.7 * k})`); gr.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(-len / 2 - 0.05, side * (wid / 2 - 0.2), 0.55, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (car.gear === 'R') {
      for (const side of [-1, 1]) {
        const gr = ctx.createRadialGradient(-len / 2, side * 0.45, 0.02, -len / 2 - 0.25, side * 0.45, 0.95);
        gr.addColorStop(0, 'rgba(255,255,235,0.32)'); gr.addColorStop(1, 'rgba(255,255,235,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(-len / 2 - 0.25, side * 0.45, 0.95, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawTrees(game, ppm) {
    if (!level.trees.length) return;
    const c = game.center();
    for (const t of level.trees) {
      const key = `${t.x},${t.y}|${Math.round(Math.log2(ppm) * 2)}`;
      let tr = trees.get(key);
      if (!tr) { tr = makeTree(t.r, t.seed, Math.pow(2, Math.round(Math.log2(Math.min(120, ppm)) * 2) / 2)); trees.set(key, tr); }
      const under = Math.hypot(c.x - t.x, c.y - t.y) < t.r + 2.2;
      ctx.globalAlpha = under ? 0.45 : 0.96;
      ctx.drawImage(tr.canvas, t.x - t.r - tr.pad, t.y - t.r - tr.pad, (t.r + tr.pad) * 2, (t.r + tr.pad) * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawGuides(game) {
    const gd = game.guides(4.5);
    if (!gd) return;
    const N = gd.left.length / 2;
    const colorAt = (i) => { const d = (4.5 * i) / (N - 1); return d < 0.6 ? '#ff4b3a' : d < 1.6 ? '#ffd23f' : '#4fdc78'; };
    ctx.lineCap = 'round';
    for (const arr of [gd.left, gd.right]) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.12;
      ctx.beginPath(); ctx.moveTo(arr[0], arr[1]); for (let i = 1; i < N; i++) ctx.lineTo(arr[i * 2], arr[i * 2 + 1]); ctx.stroke();
      ctx.lineWidth = 0.06;
      for (let i = 1; i < N; i++) {
        ctx.globalAlpha = 0.95 - (0.6 * i) / N;
        ctx.strokeStyle = colorAt(i);
        ctx.beginPath(); ctx.moveTo(arr[i * 2 - 2], arr[i * 2 - 1]); ctx.lineTo(arr[i * 2], arr[i * 2 + 1]); ctx.stroke();
      }
    }
    // mesafe çizgileri: 0,5 m, 1,5 m, 3 m
    for (const d of [0.5, 1.5, 3.0]) {
      const i = Math.round((d / 4.5) * (N - 1));
      ctx.globalAlpha = 0.8 - d * 0.12;
      ctx.strokeStyle = colorAt(i); ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(gd.left[i * 2], gd.left[i * 2 + 1]); ctx.lineTo(gd.right[i * 2], gd.right[i * 2 + 1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }

  const SENSOR_COLORS = (d) => (d < 0.3 ? '#ff3b30' : d < 0.6 ? '#ff9f1a' : d < 1.0 ? '#ffd23f' : '#5fd57e');

  function drawSensors(game, sens) {
    if (!sens) return;
    const car = game.car, b = game.body, g = car.geom;
    const c = game.center();
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(b.a);
    const hl = g.length / 2, hw = g.hw;
    for (const side of ['rear', 'front']) {
      const arr = sens[side];
      const sgn = side === 'rear' ? -1 : 1;
      for (let z = 0; z < 3; z++) {
        const d = arr[z];
        if (!(d < 1.5)) continue;
        const y0 = -hw + (z * wid3(hw)), y1 = y0 + wid3(hw);
        const x = sgn * (hl + 0.12 + Math.min(d, 1.4) * 0.55);
        ctx.strokeStyle = SENSOR_COLORS(d);
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 0.13;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const bend = sgn * 0.12 * (z === 1 ? 1 : 0.4);
        ctx.moveTo(x - (z === 0 ? -sgn * 0.12 : 0), y0 + 0.08);
        ctx.quadraticCurveTo(x + bend, (y0 + y1) / 2, x - (z === 2 ? -sgn * 0.12 : 0), y1 - 0.08);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }
  const wid3 = (hw) => (hw * 2) / 3;

  function drawParticles() {
    for (const p of parts) {
      const k = p.age / p.life;
      if (p.t === 'spark') {
        ctx.strokeStyle = `rgba(255,${200 - k * 120},80,${1 - k})`; ctx.lineWidth = 0.04;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
      } else if (p.t === 'smoke') {
        ctx.fillStyle = `rgba(210,210,210,${0.35 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 2.5), 0, Math.PI * 2); ctx.fill();
      } else if (p.t === 'dust') {
        ctx.fillStyle = `rgba(170,160,140,${0.4 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 2), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(40,40,40,${1 - k})`;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    }
  }

  function drawDebug(game) {
    ctx.lineWidth = 0.03;
    const shapes = [...game.world.ground.shapes, ...game.world.bodies.flatMap((b) => b.shapes)];
    for (const sh of shapes) {
      ctx.strokeStyle = sh.layer === 1 ? 'rgba(0,255,255,0.8)' : sh.layer === 2 ? 'rgba(255,0,255,0.9)' : 'rgba(255,255,0,0.9)';
      ctx.beginPath();
      if (sh.type === 'circle') ctx.arc(sh.cx, sh.cy, sh.r, 0, Math.PI * 2);
      else { ctx.moveTo(sh.wx[0], sh.wy[0]); for (let i = 1; i < sh.n; i++) ctx.lineTo(sh.wx[i], sh.wy[i]); ctx.closePath(); }
      ctx.stroke();
    }
    ctx.fillStyle = 'red';
    for (const m of game.world.contacts) for (const p of m.pts) ctx.fillRect(p.x - 0.05, p.y - 0.05, 0.1, 0.1);
    const b = game.body;
    for (const w of game.car.wheels) {
      const x = b.x + w.rx, y = b.y + w.ry;
      ctx.strokeStyle = '#0f0'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w.sx * w.JS * 600, y + w.sy * w.JS * 600); ctx.stroke();
      ctx.strokeStyle = '#f80'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w.fx * (w.JL + w.Jdrive) * 600, y + w.fy * (w.JL + w.Jdrive) * 600); ctx.stroke();
    }
  }

  function vignette() {
    const w = canvas.width, h = canvas.height;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, level.indoor ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  /**
   * @param {object} game
   * @param {object} cam
   * @param {number} alpha  fizik ara değer oranı
   * @param {{guides:boolean, sensors:object|null}} opts
   */
  function render(game, cam, alpha, opts = {}) {
    if (!level || !game) return;
    const ppm = cam.scale * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    cam.apply(ctx, dpr);
    drawGround(cam);
    drawMarks();
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    for (const s of game.targets) drawSpot(game, s, game.live, pulse);
    drawBushes();
    drawSkids();
    drawLow();
    drawShadows(cam, ppm);
    drawSolids();
    drawParked(ppm);
    drawCones(game, alpha);
    if (opts.guides && game.status === 'play') drawGuides(game);
    drawPlayer(game, alpha, ppm);
    drawTrees(game, ppm);
    if (opts.sensors && game.status === 'play') drawSensors(game, opts.sensors);
    drawParticles();
    if (debug) drawDebug(game);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    vignette();
  }

  return { resize, setLevel, render, update, onEvent, get ctx() { return ctx; }, get dpr() { return dpr; }, sprites, playerSpec };
}
