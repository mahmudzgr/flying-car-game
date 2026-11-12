// Milimetrik Park — trafik araçları ve yayalar: yol (çoklu çizgi) izleyen kinematik cisimler.
// Önlerindeki engeli (oyuncu aracı, römork, diğer ajanlar) "görür", yavaşlar ve durur; oyuncu yolu uzun süre
// kapatırsa araçlar korna çalar. Kinematik oldukları için itilemezler; çarpışma oyuncuya hasar yazar,
// yayaya çarpmak bölümü bitirir. DOM kullanmaz.
import { Body, polyShape, circleShape, collideShapes, LAYER } from './physics.js';
import { PARKED_MODELS, COLORS } from '../config.js';

const SHIRTS = ['#d64545', '#3d7bd9', '#f0b429', '#2f9e6e', '#8d5bd1', '#e8e2d4', '#2b2f36', '#f07f3c', '#5fb8c9', '#c94f86'];
const HAIR = ['#2b1d14', '#4a3222', '#1c1c1c', '#8a6239', '#c9a26a', '#6b6b6b'];

function pathInfo(pts) {
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(L); total += L; }
  return { pts, seg, total };
}

/** Yol üzerinde s (m) konumu ve yön. */
function sampleAt(p, s, out) {
  if (s <= 0) { const a = Math.atan2(p.pts[1][1] - p.pts[0][1], p.pts[1][0] - p.pts[0][0]); out.x = p.pts[0][0] + Math.cos(a) * s; out.y = p.pts[0][1] + Math.sin(a) * s; out.a = a; return out; }
  let acc = 0;
  for (let i = 0; i < p.seg.length; i++) {
    const L = p.seg[i];
    if (s <= acc + L || i === p.seg.length - 1) {
      const k = (s - acc) / L, [x0, y0] = p.pts[i], [x1, y1] = p.pts[i + 1];
      out.x = x0 + (x1 - x0) * k; out.y = y0 + (y1 - y0) * k; out.a = Math.atan2(y1 - y0, x1 - x0);
      return out;
    }
    acc += L;
  }
  return out;
}

function carVerts(len, wid) {
  const hx = len / 2, hy = wid / 2, cf = 0.3, cr = 0.2;
  return [[hx, -hy + cf], [hx, hy - cf], [hx - cf, hy], [-hx + cr, hy], [-hx, hy - cr], [-hx, -hy + cr], [-hx + cr, -hy], [hx - cf, -hy]];
}

const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createAgents(game, level, rand) {
  const world = game.world;
  const list = [];
  const spawners = [];
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const tmp = { x: 0, y: 0, a: 0 }, tmp2 = { x: 0, y: 0, a: 0 };

  for (const t of level.traffic || []) spawners.push({ kind: 'car', def: t, path: pathInfo(t.path), timer: t.delay ?? 0.5 + rand() * (t.every?.[0] ?? 4) });
  for (const p of level.peds || []) spawners.push({ kind: 'ped', def: p, path: pathInfo(p.path), timer: p.delay ?? rand() * (p.every?.[0] ?? 5) });

  function playerShapes() { return game.playerBodies.flatMap((b) => b.shapes.filter((s) => s.layer === LAYER.BODY)); }

  function spawn(sp, s0 = 0) {
    const def = sp.def;
    sampleAt(sp.path, s0, tmp);
    if (sp.kind === 'car') {
      const model = def.model || pick(def.models || ['hatch', 'sedan', 'suv', 'van', 'mini', 'hatch', 'sedan']);
      const m = PARKED_MODELS[model];
      const b = new Body({ kinematic: true, kind: 'agent', x: tmp.x, y: tmp.y, a: tmp.a });
      b.add(polyShape(carVerts(m.length, m.width), { layer: LAYER.BODY, mask: LAYER.BODY, kind: 'agent', mu: 0.3, e: 0.1 }));
      const probe = new Body({ x: tmp.x, y: tmp.y, a: tmp.a });
      const probeShape = probe.add(polyShape([[0, -0.5], [1, -0.5], [1, 0.5], [0, 0.5]], { kind: 'probe' }));
      const ag = { kind: 'car', body: b, probe, probeShape, model, color: def.color || pick(COLORS.parked), len: m.length, wid: m.width, path: sp.path, def,
        s: s0, v: def.speed, cruise: def.speed, blockedT: 0, honkT: 0, braking: false, loop: !!def.loop, heading: tmp.a };
      world.addBody(b);
      b.updateGeom();
      list.push(ag);
      return ag;
    }
    const b = new Body({ kinematic: true, kind: 'ped', x: tmp.x, y: tmp.y, a: tmp.a });
    b.add(circleShape(0.27, 0, 0, { layer: LAYER.BODY, mask: LAYER.BODY, kind: 'ped', mu: 0.3, e: 0 }));
    const speed = (def.speed || 1.3) * (0.85 + rand() * 0.3);
    const ag = { kind: 'ped', body: b, path: sp.path, def, s: s0, v: speed, cruise: speed, phase: rand() * 6, shirt: pick(SHIRTS), hair: pick(HAIR), bag: rand() < 0.35, loop: !!def.loop, blockedT: 0, heading: tmp.a };
    world.addBody(b);
    b.updateGeom();
    list.push(ag);
    return ag;
  }

  function startClear(sp) {
    sampleAt(sp.path, 0, tmp);
    const r = sp.kind === 'car' ? 6 : 1.2;
    for (const ag of list) if (Math.hypot(ag.body.x - tmp.x, ag.body.y - tmp.y) < r) return false;
    for (const b of game.playerBodies) if (Math.hypot(b.x - tmp.x, b.y - tmp.y) < r + 2) return false;
    return true;
  }

  // başlangıç nüfusu: yolların üzerine dağıt
  for (const sp of spawners) {
    const n = sp.def.initial ?? (sp.kind === 'car' ? 1 : 1);
    for (let k = 0; k < n; k++) {
      const s0 = sp.path.total * (0.15 + 0.7 * ((k + rand() * 0.5) / Math.max(1, n)));
      sampleAt(sp.path, s0, tmp);
      let ok = true;
      for (const b of game.playerBodies) if (Math.hypot(b.x - tmp.x, b.y - tmp.y) < 7) ok = false;
      for (const ag of list) if (Math.hypot(ag.body.x - tmp.x, ag.body.y - tmp.y) < 6.5) ok = false;
      if (ok) spawn(sp, s0);
    }
  }

  function blockedCar(ag) {
    const b = ag.body, look = 1.2 + ag.v * 1.3 + (ag.v > 0.5 ? 1 : 0);
    // ileri sondaj dikdörtgeni (araç önünden)
    const ps = ag.probeShape, hw = ag.wid / 2 + 0.25;
    ps.lx[0] = ag.len / 2; ps.ly[0] = -hw; ps.lx[1] = ag.len / 2 + look; ps.ly[1] = -hw;
    ps.lx[2] = ag.len / 2 + look; ps.ly[2] = hw; ps.lx[3] = ag.len / 2; ps.ly[3] = hw;
    ag.probe.x = b.x; ag.probe.y = b.y; ag.probe.a = b.a;
    ag.probe.updateGeom();
    for (const sh of playerShapes()) {
      if (sh.maxx < ps.minx || sh.minx > ps.maxx || sh.maxy < ps.miny || sh.miny > ps.maxy) continue;
      if (collideShapes(ps, sh)) return 'player';
    }
    for (const o of list) {
      if (o === ag) continue;
      const sh = o.body.shapes[0];
      if (sh.maxx < ps.minx || sh.minx > ps.maxx || sh.maxy < ps.miny || sh.miny > ps.maxy) continue;
      if (collideShapes(ps, sh)) return o.kind;
    }
    return null;
  }

  function blockedPed(ag) {
    const b = ag.body, c = Math.cos(b.a), s = Math.sin(b.a);
    const px = b.x + c * 0.9, py = b.y + s * 0.9;
    for (const sh of playerShapes()) {
      if (px + 0.7 < sh.minx || px - 0.7 > sh.maxx || py + 0.7 < sh.miny || py - 0.7 > sh.maxy) continue;
      // nokta-çokgen yaklaşık: çokgenin köşelerine/kenarına 0,7 m'den yakın mı
      for (let i = 0; i < sh.n; i++) {
        const j = (i + 1) % sh.n, ex = sh.wx[j] - sh.wx[i], ey = sh.wy[j] - sh.wy[i];
        const t = Math.max(0, Math.min(1, ((px - sh.wx[i]) * ex + (py - sh.wy[i]) * ey) / (ex * ex + ey * ey || 1)));
        if (Math.hypot(px - sh.wx[i] - ex * t, py - sh.wy[i] - ey * t) < 0.7) return 'player';
      }
    }
    for (const o of list) {
      if (o === ag || o.kind !== 'car') continue;
      if (Math.hypot(o.body.x - px, o.body.y - py) < o.len / 2 + 0.6) return 'car';
    }
    return null;
  }

  const api = {
    list,
    /** Her fizik adımında world.step'ten ÖNCE: hedef pozu hesaplar ve kinematik hızı ayarlar. */
    step(dt, emit) {
      for (const sp of spawners) {
        sp.timer -= dt;
        if (sp.timer <= 0) {
          const e = sp.def.every || [5, 9];
          sp.timer = e[0] + rand() * (e[1] - e[0]);
          if ((sp.def.max ?? 99) > list.filter((a) => a.def === sp.def).length && startClear(sp)) spawn(sp, 0);
        }
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const ag = list[i], b = ag.body;
        if (ag.frozen) { b.vx = 0; b.vy = 0; b.w = 0; continue; }
        const blk = ag.kind === 'car' ? blockedCar(ag) : blockedPed(ag);
        const target = blk ? 0 : ag.cruise;
        const up = ag.kind === 'car' ? 2.2 : 2, down = ag.kind === 'car' ? 6 : 5;
        ag.v = target > ag.v ? Math.min(target, ag.v + up * dt) : Math.max(target, ag.v - down * dt);
        ag.braking = target < ag.v + 0.05 && ag.v < ag.cruise - 0.1;
        if (blk === 'player') { ag.blockedT += dt; } else ag.blockedT = Math.max(0, ag.blockedT - dt);
        ag.honkT -= dt;
        if (ag.kind === 'car' && ag.blockedT > 2.5 && ag.honkT <= 0) { ag.honkT = 4 + rand() * 2; emit?.({ type: 'horn', x: b.x, y: b.y }); }
        ag.s += ag.v * dt;
        if (ag.s > ag.path.total + (ag.kind === 'car' ? ag.len : 0.5)) {
          if (ag.loop) ag.s -= ag.path.total;
          else { world.removeBody(b); list.splice(i, 1); continue; }
        }
        // konum: araçlar için yönü biraz ileriden al (köşelerde yumuşak dönüş)
        sampleAt(ag.path, Math.min(ag.s, ag.path.total), tmp);
        let a = tmp.a;
        if (ag.kind === 'car') {
          sampleAt(ag.path, Math.min(ag.s + 1.6, ag.path.total), tmp2);
          const back = sampleAt(ag.path, Math.max(0, ag.s - 1.6), { x: 0, y: 0, a: 0 });
          a = Math.atan2(tmp2.y - back.y, tmp2.x - back.x);
        } else ag.phase += ag.v * dt * 5.5;
        if (ag.s > ag.path.total) { const ex = ag.s - ag.path.total; tmp.x += Math.cos(a) * ex; tmp.y += Math.sin(a) * ex; }
        b.vx = (tmp.x - b.x) / dt; b.vy = (tmp.y - b.y) / dt;
        b.w = wrapA(a - b.a) / dt;
        ag.heading = a;
      }
    },
    /** Oyuncu çarptı: ajan durur (korna). */
    bump(body) {
      const ag = list.find((a) => a.body === body);
      if (ag && ag.kind === 'car') { ag.blockedT = 3; ag.honkT = 0; }
    },
    freeze() { for (const ag of list) ag.frozen = true; },
  };
  return api;
}
