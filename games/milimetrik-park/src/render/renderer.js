// Milimetrik Park — kuş bakışı canvas 2D çizimi.
import { makeTextures, createSpriteCache, makeTree, drawPed, shade } from './art.js';
import { createFx } from './fx.js';
import { trailerGeom } from '../sim/vehicle.js';
import { ENVS } from '../config.js';

const SHADOW = { dx: 0.22, dy: 0.32 };          // güneş sol üstte: gölge sağ alta
const HEIGHT = { building: 2.6, wall: 1.2, hedge: 0.8, fence: 0.6, barrier: 0.5, pillar: 0, post: 1.4, lamp: 2.0, cart: 0.5, box: 0.6, trunk: 0, container: 2.2, pump: 1.2, bollard: 0.5, hydrant: 0.5, railing: 0.6 };
const TONES = ['#9c7a64', '#8e959c', '#b5a68e', '#71808f', '#a46b54'];
const LINE = { white: 'rgba(238,238,230,0.9)', yellow: '#e9be2d', blue: '#3b7ddd', red: '#d9443b' };

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
  const fx = createFx();
  let level = null, P = null, env = ENVS.day;
  const skids = [];
  const MAX_SKIDS = 1600;
  const lastWheel = new Map();
  const parts = [];
  let time = 0, frameDt = 0.016;
  let quality = 'high';
  let player = { model: 'hatch', color: '#ff5a2c', roof: null, stripe: false };
  const debug = typeof location !== 'undefined' && /[?&]debug\b/.test(location.search);

  function ensureTextures() {
    if (tex) return;
    tex = makeTextures();
    for (const [k, t] of Object.entries(tex)) {
      const p = ctx.createPattern(t.canvas, 'repeat');
      const s = t.meters / t.canvas.width;
      try { p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0])); } catch { /* eski tarayıcı: ölçeksiz */ }
      pats[k] = p;
      pats[k + 'Scale'] = s;
    }
  }

  function resize(cam) {
    dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.25 : 2);
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    cam.vw = w; cam.vh = h;
  }

  /** Oyuncu aracının görünüşü (model, boya). */
  function setPlayer(spec, color) {
    player = { model: spec.model, color: color || spec.color, roof: spec.roof || null, stripe: !!spec.stripe, checker: spec.model === 'minibus', trailer: spec.trailer };
  }

  function setLevel(L) {
    ensureTextures();
    level = L;
    env = ENVS[L.env] || ENVS.day;
    skids.length = 0; parts.length = 0; lastWheel.clear();
    P = { areas: [], lines: new Map(), arrows: new Path2D(), curbs: new Path2D(), stoppers: new Path2D(), shadows: new Path2D(), solids: [], circles: [], cars: [], bushes: [], hatches: [], texts: [], zebras: [], symbols: [], puddles: [] };
    for (const a of L.areas) {
      const item = { type: a.type, path: polyPath(a.pts), pts: a.pts, slope: a.slope };
      if (a.slope) {
        // eğim gölgelendirmesi: aşağı uçtan yukarı uca
        let mn = Infinity, mx = -Infinity;
        const dx = Math.cos(a.slope.dir), dy = Math.sin(a.slope.dir);
        for (const [x, y] of a.pts) { const d = x * dx + y * dy; mn = Math.min(mn, d); mx = Math.max(mx, d); }
        const c = centroid(a.pts), cd = c[0] * dx + c[1] * dy;
        item.g0 = [c[0] + dx * (mn - cd), c[1] + dy * (mn - cd)];
        item.g1 = [c[0] + dx * (mx - cd), c[1] + dy * (mx - cd)];
        item.c = c;
      }
      if (a.type === 'puddle' || a.type === 'oil') {
        const c = centroid(a.pts);
        let r = 0; for (const [x, y] of a.pts) r = Math.max(r, Math.hypot(x - c[0], y - c[1]));
        P.puddles.push({ x: c[0], y: c[1], r, oil: a.type === 'oil' });
      }
      P.areas.push(item);
    }
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
      else if (m.t === 'zebra') P.zebras.push(m);
      else if (m.t === 'symbol') P.symbols.push(m);
    }
    for (const c of L.curbs) polyPath(c.verts, c.kind === 'stopper' ? P.stoppers : P.curbs);
    for (const s of L.solids) {
      const h = HEIGHT[s.kind] ?? 0.6;
      if (s.shape === 'circle') {
        P.circles.push(s);
        if (h > 0 && !L.indoor) { P.shadows.moveTo(s.x + SHADOW.dx * h + s.r, s.y + SHADOW.dy * h); P.shadows.arc(s.x + SHADOW.dx * h, s.y + SHADOW.dy * h, s.r, 0, Math.PI * 2); }
        continue;
      }
      if (s.kind === 'car') { P.cars.push(s); continue; }
      const path = polyPath(s.verts);
      P.solids.push({ s, path, c: centroid(s.verts) });
      if (h > 0 && !L.indoor) polyPath(hull([...s.verts, ...s.verts.map(([x, y]) => [x + SHADOW.dx * h, y + SHADOW.dy * h])]), P.shadows);
      else if (L.indoor && (s.kind === 'pillar' || s.kind === 'container')) polyPath(s.verts.map(([x, y]) => [x + 0.12, y + 0.16]), P.shadows);
    }
    for (const d of L.decor) if (d.kind === 'bush') P.bushes.push(d);
  }

  // ------------------------------------------------------------ efektler

  function spawn(o) { if (parts.length < (quality === 'low' ? 160 : 400)) parts.push(o); }

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

  function trackWheels(body, wheels, speed, key) {
    const c = Math.cos(body.a), s = Math.sin(body.a);
    for (let i = 0; i < wheels.length; i++) {
      const w = wheels[i], id = key + i;
      const x = body.x + w.bx * c - w.by * s, y = body.y + w.bx * s + w.by * c;
      const marking = speed > 0.6 && (w.sliding || (w.locked && w.slip > 0.4));
      const lw = lastWheel.get(id);
      if (marking && lw) {
        if (Math.hypot(x - lw[0], y - lw[1]) > 0.06) {
          if (skids.length >= MAX_SKIDS) skids.shift();
          skids.push([lw[0], lw[1], x, y, Math.min(0.55, 0.15 + w.slip / 8)]);
          lastWheel.set(id, [x, y]);
          if (Math.random() < 0.35 && w.slip > 1.5) spawn({ t: 'smoke', x, y, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: 1 + Math.random() * 0.6, age: 0, r: 0.3 });
        }
      } else lastWheel.set(id, marking ? [x, y] : null);
      if (w.surf === 'puddle' && speed > 0.7 && Math.random() < speed * 0.08) {
        for (let k = 0; k < 2; k++) spawn({ t: 'splash', x, y, vx: (Math.random() - 0.5) * speed * 0.6, vy: (Math.random() - 0.5) * speed * 0.6, life: 0.45, age: 0, r: 0.06 });
      }
    }
  }

  function update(dt, game) {
    time += dt; frameDt = dt;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.t === 'spark' ? 3 : 1.8;
      p.vx *= Math.exp(-k * dt); p.vy *= Math.exp(-k * dt);
    }
    if (!game) return;
    trackWheels(game.body, game.car.wheels, game.car.speed, 'p');
    if (game.trailer) trackWheels(game.trailer, game.world.controllers[1].wheels, game.car.speed, 't');
  }

  // ------------------------------------------------------------ çizim parçaları

  function drawGround(cam) {
    const L = level;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = L.indoor ? '#24272b' : L.bg === 'water' ? '#22566f' : '#4d7f3a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    const bb = cam.bounds();
    const bgPat = L.indoor ? pats.indoor : L.bg === 'water' ? pats.water : pats.grass;
    if (L.bg === 'water') waterShift(pats.water, pats.waterScale);
    ctx.fillStyle = bgPat;
    ctx.fillRect(bb.minx, bb.miny, bb.maxx - bb.minx, bb.maxy - bb.miny);
    for (const a of P.areas) {
      if (a.type === 'puddle' || a.type === 'oil') continue;
      if (a.type === 'water') waterShift(pats.water, pats.waterScale);
      ctx.fillStyle = pats[a.type] || pats.asphalt;
      ctx.fill(a.path);
      if (a.slope) {
        const g = ctx.createLinearGradient(a.g0[0], a.g0[1], a.g1[0], a.g1[1]);
        g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = g; ctx.fill(a.path);
      }
    }
    for (const a of P.areas) if (a.type === 'sidewalk') { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.06; ctx.stroke(a.path); }
    if (env.rain) {
      // ıslak zemin: koyu ve hafif mavi
      ctx.fillStyle = 'rgba(18,30,52,0.18)';
      ctx.fillRect(bb.minx, bb.miny, bb.maxx - bb.minx, bb.maxy - bb.miny);
    }
    for (const p of P.puddles) {
      const a = P.areas.find((x) => x.type === (p.oil ? 'oil' : 'puddle') && Math.abs(centroid(x.pts)[0] - p.x) < 0.01);
      if (!a) continue;
      ctx.fillStyle = p.oil ? 'rgba(20,18,26,0.82)' : 'rgba(40,62,86,0.62)';
      ctx.fill(a.path);
      const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0.05, p.x, p.y, p.r);
      g.addColorStop(0, p.oil ? 'rgba(140,90,200,0.35)' : 'rgba(190,215,240,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fill(a.path);
    }
  }

  function waterShift(p, s) {
    try { p.setTransform(new DOMMatrix([s, 0, 0, s, (time * 0.35) % 8, Math.sin(time * 0.4) * 0.3])); } catch { /* yoksay */ }
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
    for (const z of P.zebras) {
      ctx.fillStyle = 'rgba(240,240,232,0.9)';
      if (z.vertical) for (let x = z.x0 + 0.1; x < z.x1 - 0.2; x += 0.9) ctx.fillRect(x, z.y0, 0.5, z.y1 - z.y0);
      else for (let y = z.y0 + 0.1; y < z.y1 - 0.2; y += 0.9) ctx.fillRect(z.x0, y, z.x1 - z.x0, 0.5);
    }
    for (const s of P.symbols) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.scale(s.s, s.s);
      if (s.kind === 'disabled') {
        ctx.fillStyle = 'rgba(59,125,221,0.85)'; ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0.05, 0.25, 0.38, 0.3, 4.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(-0.05, -0.5, 0.1, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-0.08, -0.32); ctx.lineTo(-0.02, 0.15); ctx.lineTo(0.35, 0.15); ctx.lineTo(0.45, 0.5); ctx.stroke();
      } else {
        ctx.fillStyle = s.kind === 'bus' ? '#e9be2d' : LINE.white;
        ctx.font = '800 100px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.scale(0.009, 0.009);
        ctx.fillText(s.kind === 'bus' ? 'OTOBÜS' : s.kind === 'taxi' ? 'TAKSİ' : s.kind === 'dolmus' ? 'DOLMUŞ' : s.kind === 'load' ? 'YÜKLEME' : 'P', 0, 0);
      }
      ctx.restore();
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
    // rampa okları
    for (const a of P.areas) {
      if (!a.slope) continue;
      const up = a.slope.dir + Math.PI, c = Math.cos(up), s = Math.sin(up);
      ctx.save(); ctx.translate(a.c[0], a.c[1]); ctx.rotate(up);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (const off of [-1.2, 0, 1.2]) { ctx.beginPath(); ctx.moveTo(off + 0.4, 0); ctx.lineTo(off - 0.3, -0.5); ctx.lineTo(off - 0.1, 0); ctx.lineTo(off - 0.3, 0.5); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      void c; void s;
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
    ctx.save();
    ctx.translate(spot.x, spot.y); ctx.rotate(spot.a);
    const ok = live && live.spot === spot && live.inside && live.facingOk;
    const col = ok ? '60,214,120' : spot.subject === 'trailer' ? '255,170,40' : '64,150,255';
    ctx.fillStyle = `rgba(${col},${0.14 + 0.1 * pulse})`;
    ctx.fillRect(-spot.l / 2, -spot.w / 2, spot.l, spot.w);
    ctx.strokeStyle = `rgba(${col},${0.75 + 0.25 * pulse})`;
    ctx.lineWidth = 0.09;
    ctx.setLineDash([0.45, 0.3]);
    ctx.lineDashOffset = -time * 0.6;
    ctx.strokeRect(-spot.l / 2 + 0.05, -spot.w / 2 + 0.05, spot.l - 0.1, spot.w - 0.1);
    ctx.setLineDash([]);
    if (!game.level.free || spot.facing !== 'any') {
      let hl, hw;
      if (spot.subject === 'trailer' && game.trailer) { const tg = trailerGeom(game.spec.trailer); hl = tg.hl; hw = tg.hw; }
      else { hl = game.car.geom.length / 2; hw = game.car.geom.hw; }
      const flip = spot.facing === 'tail' ? Math.PI : 0;
      ctx.translate(spot.idealLong || 0, spot.idealLat || 0);
      ctx.rotate(flip);
      ctx.strokeStyle = `rgba(255,255,255,${0.32 + 0.18 * pulse})`;
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(-hl + 0.2, -hw); ctx.lineTo(hl - 0.3, -hw); ctx.quadraticCurveTo(hl, -hw, hl, -hw + 0.3);
      ctx.lineTo(hl, hw - 0.3); ctx.quadraticCurveTo(hl, hw, hl - 0.3, hw); ctx.lineTo(-hl + 0.2, hw);
      ctx.quadraticCurveTo(-hl, hw, -hl, hw - 0.2); ctx.lineTo(-hl, -hw + 0.2); ctx.quadraticCurveTo(-hl, -hw, -hl + 0.2, -hw);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.45 + 0.25 * pulse})`;
      ctx.beginPath(); ctx.moveTo(hl - 0.35, 0); ctx.lineTo(hl - 1.0, -0.42); ctx.lineTo(hl - 0.85, 0); ctx.lineTo(hl - 1.0, 0.42); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /** Sınav kapıları: sıradaki kapı vurgulu. */
  function drawGates(game) {
    if (!game.tasks) return;
    const t = game.tasks[game.taskIndex];
    if (!t || t.type !== 'gates') return;
    for (let i = t.gate; i < t.gates.length; i++) {
      const [[x1, y1], [x2, y2]] = t.gates[i];
      ctx.strokeStyle = i === t.gate ? `rgba(255,210,63,${0.6 + 0.3 * Math.sin(time * 5)})` : 'rgba(255,210,63,0.25)';
      ctx.lineWidth = 0.12; ctx.setLineDash([0.3, 0.25]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
    }
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

  const shadowOff = () => (level.indoor ? { dx: 0.08, dy: 0.12 } : { dx: 0.18, dy: 0.26 });

  function drawShadows(ppm) {
    ctx.fillStyle = level.indoor ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.26)';
    ctx.fill(P.shadows);
    const off = shadowOff();
    for (const s of P.cars) drawCarShadow(s.style.x, s.style.y, s.style.a, s.style.len, s.style.wid, ppm, off);
    if (!level.indoor) for (const t of level.trees) {
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
            ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(c[0] - 0.6, c[1] - 0.35, 1.2, 0.7);
            ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(c[0] + 1.4, c[1] - 0.2, 0.6, 0.45);
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
        case 'railing':
          ctx.fillStyle = '#9aa3ab'; ctx.fill(path);
          ctx.strokeStyle = '#5c646b'; ctx.lineWidth = 0.04; ctx.stroke(path);
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
        case 'container': {
          ctx.fillStyle = s.style.color; ctx.fill(path);
          ctx.save(); ctx.clip(path);
          const [p0, p1, , p3] = s.verts, ax = p1[0] - p0[0], ay = p1[1] - p0[1], L = Math.hypot(ax, ay), ux = ax / L, uy = ay / L;
          ctx.strokeStyle = shade(s.style.color, -0.25); ctx.lineWidth = 0.05;
          for (let d = 0.3; d < L; d += 0.3) { ctx.beginPath(); ctx.moveTo(p0[0] + ux * d, p0[1] + uy * d); ctx.lineTo(p3[0] + ux * d, p3[1] + uy * d); ctx.stroke(); }
          ctx.restore();
          ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.05; ctx.stroke(path);
          break;
        }
        case 'pump':
          ctx.fillStyle = '#c9ccc9'; ctx.fill(path);
          ctx.strokeStyle = '#7d817d'; ctx.lineWidth = 0.05; ctx.stroke(path);
          ctx.fillStyle = '#d9443b'; ctx.fillRect(c[0] - 0.9, c[1] - 0.25, 0.5, 0.5);
          ctx.fillStyle = '#2f7bff'; ctx.fillRect(c[0] + 0.4, c[1] - 0.25, 0.5, 0.5);
          break;
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
      ctx.fillStyle = s.kind === 'trunk' ? '#5b4231' : s.kind === 'lamp' ? '#3c4148' : s.kind === 'hydrant' ? '#c8322b' : s.kind === 'bollard' ? '#3b3f45' : '#50565d';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.kind === 'bollard') { ctx.strokeStyle = '#f0c12c'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.65, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.4, 0, Math.PI * 2); ctx.fill();
      if (s.kind === 'lamp') {
        const a = ((s.style?.arm ?? -90) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
        ctx.strokeStyle = '#2f343a'; ctx.lineWidth = 0.08;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + c * 0.75, s.y + sn * 0.75); ctx.stroke();
        ctx.save(); ctx.translate(s.x + c * 0.85, s.y + sn * 0.85); ctx.rotate(a);
        ctx.fillStyle = '#2f343a'; ctx.beginPath(); ctx.ellipse(0, 0, 0.22, 0.13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,246,200,0.75)'; ctx.beginPath(); ctx.ellipse(0, 0, 0.13, 0.06, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }

  function carSprite(st, ppm) {
    const big = st.model === 'truck' || st.model === 'bus';
    return sprites.car(st.model, st.color, st.len, st.wid, ppm, { checker: st.model === 'minibus' && st.color === '#e3b51a', box: big && st.model === 'truck' ? '#e6e8ea' : undefined });
  }

  function drawParked(ppm) {
    for (const s of P.cars) {
      const st = s.style;
      const sp = carSprite(st, ppm);
      ctx.save();
      ctx.translate(st.x, st.y); ctx.rotate(st.a);
      ctx.drawImage(sp.canvas, -st.len / 2 - sp.pad, -st.wid / 2 - sp.pad, st.len + sp.pad * 2, st.wid + sp.pad * 2);
      ctx.restore();
    }
  }

  function drawCones(game, alpha) {
    for (const b of game.cones) {
      const x = b.prevX + (b.x - b.prevX) * alpha, y = b.prevY + (b.y - b.prevY) * alpha;
      ctx.save();
      ctx.translate(x, y);
      if (b.data.knocked) {
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

  const lerpA = (a0, a1, t) => a0 + Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)) * t;

  function drawAgents(game, alpha, ppm, lightsOut) {
    if (!game.agents) return;
    const off = shadowOff();
    for (const ag of game.agents.list) {
      const b = ag.body;
      const x = b.prevX + (b.x - b.prevX) * alpha, y = b.prevY + (b.y - b.prevY) * alpha, a = lerpA(b.prevA, b.a, alpha);
      if (ag.kind === 'ped') { drawPed(ctx, x, y, a, ag.phase, ag.shirt, ag.hair, ag.bag); continue; }
      drawCarShadow(x, y, a, ag.len, ag.wid, ppm, off);
      const sp = carSprite({ model: ag.model, color: ag.color, len: ag.len, wid: ag.wid }, ppm);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(a);
      ctx.drawImage(sp.canvas, -ag.len / 2 - sp.pad, -ag.wid / 2 - sp.pad, ag.len + sp.pad * 2, ag.wid + sp.pad * 2);
      if (ag.braking || ag.v < 0.2) brakeGlow(ag.len, ag.wid, 0.8);
      ctx.restore();
      lightsOut.push({ x, y, a, len: ag.len, wid: ag.wid, head: true, brake: ag.braking || ag.v < 0.2, rev: false, headLen: 11 });
    }
  }

  function brakeGlow(len, wid, k) {
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      const gr = ctx.createRadialGradient(-len / 2 + 0.05, side * (wid / 2 - 0.2), 0.02, -len / 2 - 0.05, side * (wid / 2 - 0.2), 0.55);
      gr.addColorStop(0, `rgba(255,40,30,${0.7 * k})`); gr.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(-len / 2 - 0.05, side * (wid / 2 - 0.2), 0.55, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawTrailer(game, alpha, ppm) {
    const t = game.trailer, ts = game.spec.trailer, tg = trailerGeom(ts);
    const a = lerpA(t.prevA, t.a, alpha);
    const x = t.prevX + (t.x - t.prevX) * alpha, y = t.prevY + (t.y - t.prevY) * alpha;
    drawCarShadow(x, y, a, tg.length, tg.width, ppm, shadowOff());
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    // tekerlekler (çamurluk dışına taşar)
    ctx.fillStyle = '#141414';
    for (const s of [-1, 1]) ctx.fillRect(tg.xAxle - ts.wheelRadius, s * ts.track / 2 - ts.tireWidth / 2, ts.wheelRadius * 2, ts.tireWidth);
    // çeki demiri (A çerçeve)
    ctx.strokeStyle = '#3a3e44'; ctx.lineWidth = 0.09; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tg.hl - 0.05, -tg.hw + 0.25); ctx.lineTo(tg.xHitch, 0); ctx.lineTo(tg.hl - 0.05, tg.hw - 0.25);
    ctx.stroke();
    ctx.fillStyle = '#23262a'; ctx.beginPath(); ctx.arc(tg.xHitch, 0, 0.09, 0, Math.PI * 2); ctx.fill();
    const sp = sprites.trailer(tg.length, tg.width, ts.color, ppm);
    ctx.drawImage(sp.canvas, -tg.hl - sp.pad, -tg.hw - sp.pad, tg.length + sp.pad * 2, tg.width + sp.pad * 2);
    if (game.car.brake > 0.04) brakeGlow(tg.length, tg.width, Math.min(1, 0.35 + game.car.brake));
    ctx.restore();
    ctx.lineCap = 'butt';
    return { x, y, a, len: tg.length, wid: tg.width, head: false, brake: game.car.brake > 0.04, rev: game.car.gear === 'R' };
  }

  function drawPlayer(game, alpha, ppm, lightsOut) {
    const b = game.body, car = game.car, g = car.geom, sp = car.spec;
    const a = lerpA(b.prevA, b.a, alpha);
    const bx = b.prevX + (b.x - b.prevX) * alpha, by = b.prevY + (b.y - b.prevY) * alpha;
    const c = Math.cos(a), s = Math.sin(a);
    const cx = bx + c * g.gcx, cy = by + s * g.gcx;
    const len = g.length, wid = g.width;
    drawCarShadow(cx, cy, a, len, wid, ppm, shadowOff());
    if (level.indoor && !env.dark) {
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
    const sx = Math.max(-0.05, Math.min(0.05, -car.axF * 0.006)), sy = Math.max(-0.05, Math.min(0.05, -car.ayF * 0.006));
    const spr = sprites.car(player.model, player.color, len, wid, ppm, { roof: player.roof, stripe: player.stripe, checker: player.checker });
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a); ctx.translate(sx, sy);
    ctx.drawImage(spr.canvas, -len / 2 - spr.pad, -wid / 2 - spr.pad, len + spr.pad * 2, wid + spr.pad * 2);
    if (car.brake > 0.04 || car.gear === 'P') brakeGlow(len, wid, car.gear === 'P' ? 0.25 : Math.min(1, 0.35 + car.brake));
    if (car.gear === 'R' && !game.trailer) {
      ctx.globalCompositeOperation = 'lighter';
      for (const side of [-1, 1]) {
        const gr = ctx.createRadialGradient(-len / 2, side * 0.45, 0.02, -len / 2 - 0.25, side * 0.45, 0.95);
        gr.addColorStop(0, 'rgba(255,255,235,0.32)'); gr.addColorStop(1, 'rgba(255,255,235,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(-len / 2 - 0.25, side * 0.45, 0.95, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    lightsOut.push({ x: cx, y: cy, a, len, wid, head: true, brake: car.brake > 0.04, rev: car.gear === 'R' && !game.trailer, headLen: 16 });
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

  function drawOverhead(game) {
    if (!level.overhead.length) return;
    const c = game.center();
    for (const o of level.overhead) {
      const under = c.x > o.x0 - 1 && c.x < o.x1 + 1 && c.y > o.y0 - 1 && c.y < o.y1 + 1;
      ctx.globalAlpha = under ? 0.3 : 0.88;
      ctx.fillStyle = o.color || '#e6e8eb';
      ctx.fillRect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.06;
      ctx.strokeRect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0);
      ctx.beginPath();
      for (let x = o.x0 + 1.5; x < o.x1; x += 1.5) { ctx.moveTo(x, o.y0); ctx.lineTo(x, o.y1); }
      ctx.stroke();
      if (o.stripe) { ctx.fillStyle = o.stripe; ctx.fillRect(o.x0, o.y1 - 0.35, o.x1 - o.x0, 0.35); }
    }
    ctx.globalAlpha = 1;
  }

  function drawGuidePath(arr, N, len, colorAt) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.12;
    ctx.beginPath(); ctx.moveTo(arr[0], arr[1]); for (let i = 1; i < N; i++) ctx.lineTo(arr[i * 2], arr[i * 2 + 1]); ctx.stroke();
    ctx.lineWidth = 0.06;
    for (let i = 1; i < N; i++) {
      ctx.globalAlpha = 0.95 - (0.6 * i) / N;
      ctx.strokeStyle = colorAt(i);
      ctx.beginPath(); ctx.moveTo(arr[i * 2 - 2], arr[i * 2 - 1]); ctx.lineTo(arr[i * 2], arr[i * 2 + 1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    void len;
  }

  function drawGuides(game) {
    const L = game.trailer ? 6 : 4.5;
    const gd = game.guides(L);
    if (!gd) return;
    ctx.lineCap = 'round';
    const N = gd.left.length / 2;
    if (N > 1) {
      const colorAt = (i) => { const d = (L * i) / (N - 1); return d < 0.6 ? '#ff4b3a' : d < 1.6 ? '#ffd23f' : '#4fdc78'; };
      drawGuidePath(gd.left, N, L, colorAt); drawGuidePath(gd.right, N, L, colorAt);
      for (const d of [0.5, 1.5, 3.0]) {
        const i = Math.round((d / L) * (N - 1));
        ctx.globalAlpha = 0.8 - d * 0.12;
        ctx.strokeStyle = colorAt(i); ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.moveTo(gd.left[i * 2], gd.left[i * 2 + 1]); ctx.lineTo(gd.right[i * 2], gd.right[i * 2 + 1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (gd.trailer) {
      const T = gd.trailer, M = T.left.length / 2;
      const colT = (i) => (i < M * 0.3 ? '#ffb347' : '#ffd23f');
      drawGuidePath(T.left, M, L, colT); drawGuidePath(T.right, M, L, colT);
    }
    ctx.lineCap = 'butt';
  }

  const SENSOR_COLORS = (d) => (d < 0.3 ? '#ff3b30' : d < 0.6 ? '#ff9f1a' : d < 1.0 ? '#ffd23f' : '#5fd57e');

  /** Park sensörü: her bölgede, ölçülen uzaklıkta tampon konturuna paralel çizgi/yay. */
  function drawSensors(game, sens) {
    if (!sens) return;
    const b = game.body, g = game.car.geom;
    const c = game.center();
    ctx.save();
    ctx.translate(c.x, c.y); ctx.rotate(b.a);
    const hl = g.length / 2, hw = g.hw, R = 0.25;
    ctx.lineCap = 'round';
    for (const side of ['rear', 'front']) {
      const arr = sens[side];
      const sg = side === 'rear' ? -1 : 1;
      for (let z = 0; z < 4; z++) {
        const d = arr[z];
        if (!(d < 1.6)) continue;
        const col = SENSOR_COLORS(d);
        for (const [w, al] of [[0.16, 0.25], [0.08, 0.95]]) {
          ctx.strokeStyle = col; ctx.globalAlpha = al; ctx.lineWidth = w;
          ctx.beginPath();
          if (z === 1 || z === 2) {
            const ys = z === 1 ? -1 : 1;
            const y0 = ys * (hw - R - 0.04), y1 = ys * 0.06, x = sg * (hl + d);
            ctx.moveTo(x - sg * 0.02, y0); ctx.quadraticCurveTo(x + sg * 0.05, (y0 + y1) / 2, x, y1);
          } else {
            const ys = z === 0 ? -1 : 1;
            const cxr = sg * (hl - R), cyr = ys * (hw - R);
            // bölge: tampon yönünden yana doğru 15°–75°
            const base = sg > 0 ? 0 : Math.PI;
            const toward = ys * sg;              // açı artış yönü (y aşağı koordinatta)
            const a0 = base + toward * (15 * Math.PI / 180), a1 = base + toward * (75 * Math.PI / 180);
            ctx.arc(cxr, cyr, R + d, Math.min(a0, a1), Math.max(a0, a1));
          }
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }

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
      } else if (p.t === 'splash') {
        ctx.fillStyle = `rgba(200,220,240,${0.6 * (1 - k)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k), 0, Math.PI * 2); ctx.fill();
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
  }

  function vignette() {
    const w = canvas.width, h = canvas.height;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, level.indoor ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (env.tint) { ctx.fillStyle = env.tint; ctx.fillRect(0, 0, w, h); }
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
    if (env.rain) fx.ripples(ctx, P.puddles, frameDt);
    drawMarks();
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    for (const s of game.currentTargets()) drawSpot(game, s, game.live, pulse);
    drawGates(game);
    drawBushes();
    drawSkids();
    drawLow();
    drawShadows(ppm);
    drawSolids();
    drawParked(ppm);
    drawCones(game, alpha);
    const lights = [];
    drawAgents(game, alpha, ppm, lights);
    if (opts.guides && game.status === 'play') drawGuides(game);
    if (game.trailer) lights.push(drawTrailer(game, alpha, ppm));
    drawPlayer(game, alpha, ppm, lights);
    drawTrees(game, ppm);
    drawOverhead(game);
    if (opts.sensors && game.status === 'play') drawSensors(game, opts.sensors);
    drawParticles();
    if (debug) drawDebug(game);
    if (env.dark) fx.night(ctx, canvas, cam, dpr, env, { lamps: level.lights, cars: lights }, time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (env.rain) fx.rain(ctx, canvas, dpr, frameDt, quality);
    vignette();
  }

  return {
    resize, setLevel, setPlayer, render, update, onEvent, sprites,
    setQuality(q) { quality = q; },
    get ctx() { return ctx; }, get dpr() { return dpr; },
  };
}
