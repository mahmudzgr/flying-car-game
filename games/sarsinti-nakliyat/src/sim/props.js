// Köprü, tahterevalli, kar topu, su + yüzen kütük, kontrol noktası. Sim içi; DOM yok.
// sim.js her nesne türü için buildProp çağırır; props.update() her adımın sonunda çalışır.
import * as pl from '../../vendor/planck.mjs';
import { CAT, OBJECTS, PROPS } from '../config.js';
import { heightAt } from './terrain.js';

const V = pl.Vec2;

/** ctx: {world, ground, terr, track, objects(dizi), warnings, emit, S(durum), getChassis(), getCargo()} */
export function createProps(ctx) {
  const { world, ground, terr, track, objects, warnings } = ctx;
  const bridges = [], dbg = { bridges: null }, seesaws = [], snowballs = [], waters = [], logs = [], checkpoints = [];
  const staticProps = [];
  let nextId = 0;
  const id = (p) => `${p}${nextId++}`;

  function addBody(def, shape, fix, type, extra) {
    const body = world.createBody(def);
    const ob = { id: id(type), type, body, ...extra };
    body.createFixture(shape, { userData: { k: 'obj', prop: ob }, filterCategoryBits: CAT.object, ...fix });
    ob.pose = track(body, { w: extra?.w ?? 0, h: extra?.h ?? 0, r: extra?.r ?? 0 });
    objects.push(ob);
    return ob;
  }

  const builders = {
    bridge(o) {
      const n = o.planks ?? Math.max(4, Math.round(o.len / OBJECTS.plank.w));
      const pw = o.len / n, y0 = heightAt(terr, o.x - 0.01) - (o.drop ?? 0.1);
      const weak = new Set(o.weak ?? []);
      const b = { id: id('bridge'), x: o.x, len: o.len, y: y0, planks: [], joints: [], broken: new Set(), stress: 0, lastEmit: -1, n, weak };
      let prev = ground;
      for (let i = 0; i < n; i++) {
        const ob = addBody({ type: 'dynamic', position: V(o.x + (i + 0.5) * pw, y0 - OBJECTS.plank.h / 2), linearDamping: 0.1, angularDamping: 0.6 },
          pl.Box(pw / 2, OBJECTS.plank.h / 2),
          { density: OBJECTS.plank.mass / (OBJECTS.plank.w * OBJECTS.plank.h) , friction: 0.9, restitution: 0, filterGroupIndex: -7, filterMaskBits: CAT.wheel | CAT.chassis | CAT.cargo | CAT.driver | CAT.object },
          'plank', { w: pw, h: OBJECTS.plank.h, bridge: b.id, idx: i, weak: weak.has(i) });
        const j = world.createJoint(new pl.RevoluteJoint({ enableLimit: true, lowerAngle: -0.5, upperAngle: 0.5 }, prev, ob.body, V(o.x + i * pw, y0 - OBJECTS.plank.h / 2)));
        b.joints.push({ joint: j, weak: weak.has(i) || (i > 0 && weak.has(i - 1)) });
        b.planks.push(ob); prev = ob.body;
      }
      b.joints.push({ joint: world.createJoint(new pl.RevoluteJoint({ enableLimit: true, lowerAngle: -0.5, upperAngle: 0.5 }, prev, ground, V(o.x + o.len, y0 - OBJECTS.plank.h / 2))), weak: weak.has(n - 1) });
      bridges.push(b);
      staticProps.push({ type: 'bridge', id: b.id, x: o.x, y: y0 + OBJECTS.plank.h / 2, len: o.len, planks: n, weak: [...weak] });
    },
    seesaw(o) {
      const len = o.len ?? OBJECTS.seesaw.len, lim = OBJECTS.seesaw.limit, h = OBJECTS.seesaw.h;
      const cx = o.x + len / 2, gy = heightAt(terr, cx);
      const rest = OBJECTS.seesaw.rest;   // zeminle temas açısı: tahterevalli yere değince durur
      const piv = V(cx, gy + (len / 2) * Math.sin(rest) + h / 2 * Math.cos(rest));
      const ob = addBody({ type: 'dynamic', position: piv, angle: rest, angularDamping: OBJECTS.seesaw.damping },
        pl.Polygon([V(-len / 2, -h / 2), V(len / 2, -h / 2), V(len / 2 - 0.6, h / 2), V(-len / 2 + 0.6, h / 2)]), { density: OBJECTS.seesaw.mass / (len * h), friction: 1.0, restitution: 0, filterMaskBits: CAT.ground | CAT.wheel | CAT.chassis | CAT.cargo | CAT.driver | CAT.object },
        'seesaw', { w: len, h });
      world.createJoint(new pl.RevoluteJoint({ collideConnected: true, enableLimit: true, lowerAngle: -lim, upperAngle: lim }, ground, ob.body, piv));
      seesaws.push(ob);
      staticProps.push({ type: 'seesaw', id: ob.id, x: o.x, len, pivot: { x: piv.x, y: piv.y }, limit: lim });
    },
    snowball(o) {
      const r = o.r ?? PROPS.snowball.r;
      const body = world.createBody({ type: 'kinematic', position: V(terr.startX - 14, terr.startY ?? 0) });
      body.createFixture(pl.Circle(V(0, 0), r), { friction: 0.5, filterCategoryBits: CAT.object, filterMaskBits: CAT.wheel | CAT.chassis | CAT.cargo | CAT.driver, userData: { k: 'obj' } });
      const ob = { id: id('snowball'), type: 'snowball', body, r, trig: o.trigger?.x ?? ctx.spawnX + 2, behind: o.behind ?? PROPS.snowball.behind, v0: Math.min(o.v0 ?? PROPS.snowball.v0, ctx.topSpeed * PROPS.snowball.maxTopFrac), v1: Math.min(o.v1 ?? PROPS.snowball.v1, ctx.topSpeed * PROPS.snowball.maxTopFrac), ramp: o.ramp ?? PROPS.snowball.ramp, triggered: false, t: 0, x: 0, near: false };
      ob.pose = track(body, { w: 0, h: 0, r });
      objects.push(ob); snowballs.push(ob);
    },
    water(o) {
      const bank = heightAt(terr, o.x - 0.01);
      const y = typeof o.y === 'number' ? o.y : typeof o.y === 'string' && /^bank[-+]/.test(o.y) ? bank + parseFloat(o.y.slice(4)) : bank - (o.below ?? PROPS.water.below);   // y: mutlak sayı | 'bank-1.5' | boş (kıyı − below)
      waters.push({ x0: o.x, x1: o.x + o.len, y });
    },
    logs(o) {
      const n = o.n ?? 3, w = o.w ?? PROPS.log.w, h = o.h ?? PROPS.log.h, sp = o.spacing ?? (w + 1.0);
      const wy = (o.y ?? waters.find((q) => o.x >= q.x0 && o.x <= q.x1)?.y ?? heightAt(terr, o.x));
      for (let i = 0; i < n; i++) {
        const ob = addBody({ type: 'dynamic', position: V(o.x + i * sp, wy), linearDamping: 0.3, angularDamping: PROPS.log.angDamp, bullet: true },
          pl.Box(w / 2, h / 2), { density: PROPS.log.mass / (w * h), friction: 0.9, restitution: 0.05, filterMaskBits: CAT.wheel | CAT.chassis | CAT.cargo | CAT.driver | CAT.object },
          'log', { w, h, x0: o.x + i * sp });
        logs.push(ob);
      }
    },
    checkpoint(o) {
      checkpoints.push({ id: id('cp'), x: o.x, y: heightAt(terr, o.x), reached: false });
    },
  };

  dbg.bridges = bridges;
  return {
    dbg, staticProps, waters, checkpoints, snowballs,
    /** nesne verisi bu türü işler mi? */
    handles: (t) => !!builders[t],
    build(o) { builders[o.type](o); },
    /** köprü kırılma durumu (yıldız ölçütü) */
    get bridgeBroken() { return bridges.some((b) => b.broken.size > 0); },
    waterAt(x, y) { return waters.some((w) => x >= w.x0 && x <= w.x1 && y < w.y); },
    /** world.step'ten ÖNCE her adım (ve yerleşme turunda): kütük kaldırma kuvveti — uzunluk boyunca 5 noktada (doğrulma torku). */
    forces() {
      for (const lg of logs) {
        const w = waters.find((q) => lg.body.getPosition().x >= q.x0 && lg.body.getPosition().x <= q.x1);
        if (!w) continue;
        const a = lg.body.getAngle(), ca = Math.cos(a), N = 5;
        const lv = lg.body.getLinearVelocity();
        lg.body.applyForceToCenter(V(-lv.x * PROPS.log.dragX - PROPS.log.tether * (lg.body.getPosition().x - lg.x0), -lv.y * PROPS.log.dragY), true);
        for (let k = 0; k < N; k++) {
          const pt = lg.body.getWorldPoint(V((k - (N - 1) / 2) * lg.pose.w / N, 0));
          const sub = Math.max(0, Math.min(lg.pose.h, w.y - (pt.y - lg.pose.h / 2 * ca)));
          if (sub > 0) lg.body.applyForce(V(0, PROPS.water.density * 9.81 * sub * lg.pose.w / N), pt, true);
        }
      }
    },
    /** Uzun Yol: x'in gerisinde kalan köprü/tahterevalli/kütük/su/kar topu kayıtlarını atar (gövdeleri çağıran yok eder). Diziler yerinde kısalır. */
    cull(cullX) {
      const dropIf = (arr, f) => { for (let i = arr.length - 1; i >= 0; i--) if (f(arr[i])) arr.splice(i, 1); };
      dropIf(bridges, (b) => b.x + b.len < cullX);
      dropIf(staticProps, (p) => (p.type === 'bridge' ? p.x + p.len : p.x + p.len) < cullX);
      dropIf(seesaws, (o) => o.body.getPosition().x < cullX);
      dropIf(logs, (o) => o.body.getPosition().x < cullX);
      dropIf(waters, (w) => w.x1 < cullX);
      dropIf(snowballs, (o) => o.body.getPosition().x < cullX);
      dropIf(checkpoints, (c) => c.x < cullX);
    },
    /** Her adım (world.step'ten sonra). chassis: planck gövdesi, S: sim durumu. Döner: {fail?:reason} */
    update(S, dt, chassis, cargo) {
      const cp = chassis.getPosition();
      // köprü: zayıf tahta yük/darbe eşiğini aşınca (post-solve'dan kuyruğa alınır) eklemleri kopar
      for (const b of bridges) {
        let maxS = 0;
        for (const pk of b.planks) {
          if (!pk.weak) continue;
          const s = Math.min(1, (pk.peak ?? 0) / PROPS.bridge.weakForce);
          if (s > maxS) maxS = s;
          b.maxF = Math.max(b.maxF ?? 0, pk.peak ?? 0);
          if (pk.peak > PROPS.bridge.weakForce && !b.broken.has(pk.idx)) {
            b.broken.add(pk.idx);
            for (const j of [b.joints[pk.idx], b.joints[pk.idx + 1]]) { try { world.destroyJoint(j.joint); } catch { /* zaten yok */ } }
            ctx.emit('bridgeBreak', { id: b.id, pos: { x: pk.body.getPosition().x, y: pk.body.getPosition().y } });
          }
          pk.peak = 0;
        }
        b.stress = maxS;
        if (b.stress > 0.4 && S.t - b.lastEmit > 0.1) { b.lastEmit = S.t; ctx.emit('bridgeStress', { id: b.id, stress: b.stress }); }
      }
      // tahterevalli gıcırtısı (10 Hz)
      for (const sw of seesaws) {
        const av = sw.body.getAngularVelocity();
        if (Math.abs(av) > 0.25 && S.t - (sw.lastEmit ?? -1) > 0.1) { sw.lastEmit = S.t; ctx.emit('seesaw', { id: sw.id, angVel: av }); }
      }
      // kar topu
      for (const s of snowballs) {
        if (!s.triggered && cp.x >= s.trig) {
          s.triggered = true; s.x = cp.x - s.behind;
          ctx.emit('hazardTrigger', { id: s.id, type: 'snowball', pos: { x: s.x, y: heightAt(terr, Math.max(s.x, terr.startX)) + s.r } });
        }
        if (s.triggered) {
          s.t += dt;
          const v = s.v0 + (s.v1 - s.v0) * Math.min(1, s.t / s.ramp);
          s.x += v * dt;
          const gy = heightAt(terr, Math.max(s.x, terr.startX));
          s.body.setTransform(V(s.x, gy + s.r * 0.9), s.body.getAngle() - v * dt / s.r);
          s.body.setLinearVelocity(V(v, 0));
          const d = Math.hypot(cp.x - s.x, cp.y - (gy + s.r));
          if (!s.near && d < s.r + 4.0 && d > s.r + 1.9) { s.near = true; ctx.emit('nearMiss', { id: s.id, distance: d - s.r }); }
          if (cp.x - s.x < s.r + 1.9) return { fail: 'chased', pos: { x: cp.x, y: cp.y } };
        }
      }
      // su: sürükleme, kaldırma, kargo kaybı, boğulma
      if (waters.length) {
        const v = chassis.getLinearVelocity();
        const inW = waters.find((w) => cp.x >= w.x0 && cp.x <= w.x1 && cp.y < w.y);
        if (inW) {
          S.waterT = (S.waterT ?? 0) + dt;
          chassis.applyForceToCenter(V(-v.x * PROPS.water.bodyDrag, -v.y * PROPS.water.bodyDrag), true);
          if (S.waterT > PROPS.water.deadly) return { fail: 'water', pos: { x: cp.x, y: cp.y } };
        } else S.waterT = 0;
        for (const c of cargo) {
          if (c.state !== 'onboard') continue;
          const p = c.body.getPosition();
          if (waters.some((w) => p.x >= w.x0 && p.x <= w.x1 && p.y < w.y - 0.2)) ctx.loseCargo(c, 'water');
        }
      }
      // kontrol noktası
      for (const c of checkpoints) if (!c.reached && cp.x >= c.x) { c.reached = true; ctx.emit('checkpoint', { id: c.id, pos: { x: c.x, y: c.y }, x: c.x }); }
      return null;
    },
  };
}
