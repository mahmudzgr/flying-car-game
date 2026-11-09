// Sarsıntı Nakliyat — simülasyon çekirdeği. DOM/window/canvas/audio KULLANMAZ (Node'da çalışır).
// Sözleşme: docs/MIMARI.md §4 (Sim API), §5 (Snapshot), §6 (Olaylar).
import * as pl from '../../vendor/planck.mjs';
import { SIM, CAT, CARGO, CARGO_LOSS, DRIVER, OBJECTS, RULES, SCORING, SURFACES, WHEELSPIN_SLIP, VEHICLES } from '../config.js';
import { createBus } from './bus.js';
import { buildTerrain, heightAt, topNear } from './terrain.js';
import { effectiveVehicle } from './upgrades.js';
import { buildVehicle, driveVehicle, wrapAngle } from './vehicle.js';

const V = pl.Vec2;
const DT = SIM.step;

/**
 * @typedef {{throttle:number, brake:number}} SimInput   0..1 (dokunmatik/klavye 0 ya da 1)
 * @param {{level:object, vehicleId?:string, upgrades?:object, settings?:{assistLanding?:boolean}, seed?:number}} opts
 */
export function createSim(opts) {
  const level = opts.level;
  const vehicleId = opts.vehicleId ?? 'tosun';
  if (!VEHICLES[vehicleId]?.implemented) throw new Error(`Araç henüz uygulanmadı: ${vehicleId}`);
  const cfg = effectiveVehicle(vehicleId, opts.upgrades);
  const assist = opts.settings?.assistLanding ?? true;
  const bus = createBus();
  const warnings = [];

  // ---- dünya + zemin ----
  const world = new pl.World({ gravity: V(0, SIM.gravity) });
  const terr = buildTerrain(level.terrain);
  const ground = world.createBody({ type: 'static' });
  ground.createFixture(pl.Chain(terr.xs.map((x, i) => V(x, terr.ys[i])), false), {
    friction: 1, restitution: 0, filterCategoryBits: CAT.ground, filterMaskBits: 0xffff, userData: { k: 'ground' },
  });
  const killY = level.killY ?? terr.minY - SIM.killDepth;
  const spawnX = level.spawn?.x ?? terr.startX + 3;
  const finishX = level.finish?.x === undefined || level.finish.x === 'end' ? terr.endX : level.finish.x;

  // ---- takip edilen gövdeler (ara değerleme için önceki poz) ----
  const tracked = [];
  const track = (body, extra) => { const pose = { x: 0, y: 0, a: 0, px: 0, py: 0, pa: 0, ...extra }; tracked.push({ body, pose }); return pose; };

  // ---- araç ----
  const spawnY = heightAt(terr, spawnX) + cfg.wheelR + 0.35 + 0.03;
  const veh = buildVehicle(world, cfg, spawnX, spawnY);
  const chassisPose = track(veh.chassis);
  for (const w of veh.wheels) w.pose = track(w.body, { r: cfg.wheelR });
  const torsoPose = track(veh.driver.torso, { w: DRIVER.torso.w, h: DRIVER.torso.h });
  const headPose = track(veh.driver.head, { r: DRIVER.head.r });

  // ---- kargo ----
  const cargo = [];
  {
    const bay = cfg.bay;
    let cursor = bay.x0, rowY = bay.floorY, rowH = 0, n = 0;
    for (const grp of level.cargo ?? []) {
      const def = CARGO[grp.type];
      if (!def) throw new Error(`Bilinmeyen kargo: ${grp.type}`);
      for (let i = 0; i < (grp.count ?? 1); i++) {
        if (n >= cfg.capacity) { warnings.push(`Kargo kapasitesi aşıldı (${cfg.capacity}); fazlası yerleştirilmedi.`); break; }
        const w = def.shape === 'box' ? def.w : def.r * 2, h = def.shape === 'box' ? def.h : def.r * 2;
        if (cursor + w > bay.x1 + 1e-6 && cursor > bay.x0) { cursor = bay.x0; rowY += rowH + 0.02; rowH = 0; }
        const local = V(cursor + w / 2, rowY + h / 2 + 0.01);
        cursor += w + 0.02; rowH = Math.max(rowH, h);
        const body = world.createBody({ type: 'dynamic', position: veh.chassis.getWorldPoint(local), angle: veh.chassis.getAngle(), gravityScale: SIM.cargoGravityScale, angularDamping: 0.1 });
        const shape = def.shape === 'box' ? pl.Box(w / 2, h / 2) : pl.Circle(V(0, 0), def.r);
        const area = def.shape === 'box' ? w * h : Math.PI * def.r * def.r;
        const c = { id: `c${n}`, type: grp.type, def, body, hp: def.hp, hpMax: def.hp, state: 'onboard', restT: 0, w, h };
        body.createFixture(shape, {
          density: def.mass / area, friction: def.friction, restitution: def.restitution,
          filterCategoryBits: CAT.cargo, filterMaskBits: CAT.ground | CAT.chassis | CAT.cargo | CAT.object,
          userData: { k: 'cargo', c },
        });
        c.pose = track(body, { w, h, r: def.r ?? 0 });
        cargo.push(c); n++;
      }
    }
  }

  // ---- nesneler ----
  const objects = [];   // dinamik/tetikli nesneler
  const coins = [];
  const hints = (level.hints ?? []).map((h) => ({ ...h, shown: false }));
  for (const o of level.objects ?? []) {
    const gy = heightAt(terr, o.x);
    switch (o.type) {
      case 'coins': {
        const nC = o.n ?? 5, sp = o.spacing ?? 1.5;
        for (let i = 0; i < nC; i++) { const x = o.x + i * sp; coins.push({ id: `k${coins.length}`, x, y: heightAt(terr, x) + (o.h ?? 1.2), taken: false }); }
        break;
      }
      case 'barrels': {
        const d = OBJECTS.barrel, cols = o.cols ?? 3, rows = o.rows ?? 3;
        for (let r = 0; r < rows; r++) for (let cI = 0; cI < cols - (r % 2 ? 1 : 0); cI++) {
          const body = world.createBody({ type: 'dynamic', position: V(o.x + cI * (d.w + 0.03) + (r % 2 ? d.w / 2 : 0), gy + d.h / 2 + r * (d.h + 0.01) + 0.01) });
          body.createFixture(pl.Box(d.w / 2, d.h / 2), { density: d.mass / (d.w * d.h), friction: d.friction, restitution: d.restitution, filterCategoryBits: CAT.object, filterMaskBits: 0xffff, userData: { k: 'obj' } });
          const ob = { id: `o${objects.length}`, type: 'barrel', body, hit: false };
          ob.pose = track(body, { w: d.w, h: d.h, r: 0 });
          objects.push(ob);
        }
        break;
      }
      case 'rock': {
        const r = o.r ?? 1.0, trig = o.trigger?.x ?? o.x - 20;
        const body = world.createBody({ type: 'static', position: V(o.x, gy + r) });
        body.createFixture(pl.Circle(V(0, 0), r), { density: (o.mass ?? OBJECTS.rock.mass) / (Math.PI * r * r), friction: OBJECTS.rock.friction, restitution: OBJECTS.rock.restitution, filterCategoryBits: CAT.object, filterMaskBits: 0xffff, userData: { k: 'obj' } });
        const ob = { id: `o${objects.length}`, type: 'rock', body, trig, triggered: false, vx: o.vx ?? -3, near: false };
        ob.pose = track(body, { w: 0, h: 0, r });
        objects.push(ob);
        break;
      }
      default:
        warnings.push(`Nesne türü henüz uygulanmadı (atlandı): ${o.type}`);
    }
  }

  // ---- durum ----
  const S = {
    t: 0, steps: 0, live: false, status: 'running', reason: null, started: false,
    score: 0, distScore: 0, coinsPicked: 0, pickups: 0,
    combo: { count: 0, mult: 1, pending: 0, timer: 0 },
    stats: { flips: 0, maxMult: 1, reversed: false, hits: 0, wheelieT: 0, airTime: 0, cargoDelivered: 0, cargoLost: 0, eggsLeft: 0 },
    air: { on: false, t0: 0, startAngle: 0, accAngle: 0, lastAngle: 0, flips: 0, cargoOk: true, dir: 'back', startT: 0 },
    wheelie: { t: 0 }, flipT: 0, throttleOn: false, brakeOn: false,
    slow: { scale: 1, until: 0 }, pendingFail: null, pendingEject: null, result: null, engineTick: 0,
  };
  const emit = (name, data = {}) => { if (S.live) bus.emit(name, S.t, data); };

  // ---- temas dinleyicileri ----
  const wheelById = Object.fromEntries(veh.wheels.map((w) => [w.id, w]));
  const relSpeed = (c) => {
    const wm = c.getWorldManifold(null);
    if (!wm || !wm.points || !wm.points[0]) return 0;
    const p = wm.points[0], n = wm.normal;
    const va = c.getFixtureA().getBody().getLinearVelocityFromWorldPoint(p);
    const vb = c.getFixtureB().getBody().getLinearVelocityFromWorldPoint(p);
    return Math.abs((vb.x - va.x) * n.x + (vb.y - va.y) * n.y);
  };
  const groundChild = (c, fa) => (fa.getUserData()?.k === 'ground' ? c.getChildIndexA() : c.getChildIndexB());

  world.on('pre-solve', (c) => {
    const A = c.getFixtureA().getUserData(), B = c.getFixtureB().getUserData();
    let w = null, g = null;
    if (A?.k === 'wheel' && B?.k === 'ground') { w = wheelById[A.id]; g = c.getChildIndexB(); }
    else if (B?.k === 'wheel' && A?.k === 'ground') { w = wheelById[B.id]; g = c.getChildIndexA(); }
    if (!w) return;
    const sid = terr.surf[g] ?? 'asphalt';
    w.surface = sid;
    c.setFriction(Math.max(0.02, cfg.grip * SURFACES[sid].mu));
  });
  world.on('begin-contact', (c) => {
    const fa = c.getFixtureA(), fb = c.getFixtureB();
    const A = fa.getUserData(), B = fb.getUserData();
    if (!A || !B) return;
    const spd = relSpeed(c);
    for (const [X, Y, fx] of [[A, B, fa], [B, A, fb]]) {
      if (X.k === 'wheel' && Y.k === 'ground') {
        const w = wheelById[X.id]; w.contacts++;
        w.surface = terr.surf[groundChild(c, fa.getUserData()?.k === 'ground' ? fa : fb)] ?? w.surface;
        emit('wheelContact', { wheel: w.id, surface: w.surface, started: true });
      } else if (X.k === 'chassis' && (Y.k === 'ground' || Y.k === 'obj')) {
        if (spd > 2) {
          emit('bodyHit', { speed: spd, part: X.part === 'cab' ? 'cab' : X.part === 'roof' ? 'roof' : 'chassis', normal: { x: c.getWorldManifold(null)?.normal.x ?? 0, y: c.getWorldManifold(null)?.normal.y ?? 1 } });
          if (spd > RULES.badLandingSpeed) { S.stats.hits++; burn('bodyHit'); }
        }
      } else if (X.k === 'head' && Y.k !== 'torso' && !veh.driver.ejected && spd > DRIVER.headHitSpeed) {
        S.pendingEject = { headSpeed: spd, pos: { x: veh.driver.head.getPosition().x, y: veh.driver.head.getPosition().y } };
      } else if (X.k === 'cargo') {
        const cg = X.c;
        if (spd > 1.5 && cg.state === 'onboard') emit('cargoHit', { id: cg.id, type: cg.type, speed: spd, damage: damageFor(cg, spd) });
        if (S.live && cg.state === 'onboard') applyDamage(cg, damageFor(cg, spd));
      }
    }
  });
  world.on('end-contact', (c) => {
    const A = c.getFixtureA().getUserData(), B = c.getFixtureB().getUserData();
    if (!A || !B) return;
    for (const [X, Y] of [[A, B], [B, A]]) {
      if (X.k === 'wheel' && Y.k === 'ground') {
        const w = wheelById[X.id]; w.contacts = Math.max(0, w.contacts - 1);
        emit('wheelContact', { wheel: w.id, surface: w.surface, started: false });
      }
    }
  });

  function damageFor(cg, spd) {
    const d = cg.def;
    if (spd <= d.hitSpeed) return 0;
    return Math.min(d.maxHitDamage ?? 99, spd > d.hitSpeed * 2 ? 2 : 1);
  }
  function applyDamage(cg, dmg) {
    if (dmg <= 0 || cg.hp <= 0) return;
    cg.hp = Math.max(0, cg.hp - dmg);
    S.air.cargoOk = false;
    emit('cargoDamage', { id: cg.id, type: cg.type, hpLeft: cg.hp });
    if (cg.hp <= 0) lose(cg, 'broke');
  }
  function lose(cg, reason) {
    if (cg.state !== 'onboard') return;
    cg.state = 'lost'; cg.reason = reason; S.stats.cargoLost++;
    S.air.cargoOk = false;
    emit('cargoLost', { id: cg.id, type: cg.type, reason });
    burn('cargoLost');
  }
  const cargoValue = (cg) => cg.def.value.base + cg.def.value.perHp * cg.hp;

  // ---- kombo ----
  function addMove(points) {
    const c = S.combo;
    c.count++; c.pending += points; c.timer = SCORING.comboWindow;
    c.mult = Math.min(SCORING.comboMaxMult, 1 + Math.floor(c.count / 2));
    S.stats.maxMult = Math.max(S.stats.maxMult, c.mult);
    emit('comboChange', { count: c.count, multiplier: c.mult, timeLeft: c.timer });
  }
  function bank() {
    const c = S.combo;
    if (c.count > 0) {
      const pts = Math.round(c.pending * c.mult);
      S.score += pts;
      emit('comboBank', { points: pts, multiplier: c.mult });
    }
    c.count = 0; c.pending = 0; c.mult = 1; c.timer = 0;
  }
  function burn(reason) {
    const c = S.combo;
    if (c.count > 0) emit('comboBurn', { reason, lostPoints: Math.round(c.pending * c.mult) });
    c.count = 0; c.pending = 0; c.mult = 1; c.timer = 0;
  }

  // ---- yardımcılar ----
  function slowmo(kind, reason) {
    const s = RULES.slowmo[kind];
    S.slow = { scale: s.scale, until: S.t + s.duration };
    emit('slowmo', { scale: s.scale, duration: s.duration, reason });
  }
  function endLevel(result, reason) {
    if (S.status !== 'running') return;
    S.status = result === 'win' ? 'won' : 'failed'; S.reason = reason;
    bank();
    const delivered = cargo.filter((c) => c.state === 'delivered');
    const dist = Math.max(0, Math.min(chassisPose.x, finishX) - terr.startX);
    let score = S.score + Math.round(dist * SCORING.perMeter);
    let cargoPts = 0;
    for (const c of delivered) cargoPts += cargoValue(c) * SCORING.cargoMult;
    const intact = delivered.length > 0 && S.stats.cargoLost === 0 && delivered.every((c) => c.hp === c.hpMax);
    if (result === 'win') {
      score += cargoPts + (intact ? Math.round(cargoPts * SCORING.intactBonus) : 0);
      if (level.parTime) score += Math.max(0, Math.round((level.parTime - S.t) * SCORING.timeBonusPerSec));
    }
    S.stats.cargoDelivered = delivered.length;
    S.stats.eggsLeft = delivered.filter((c) => c.type === 'eggs').reduce((a, c) => a + c.hp, 0);
    const stars = result === 'win' ? evalStars() : 0;
    S.result = {
      result, reason, score, stars, time: S.t, distance: dist,
      cargoDelivered: delivered.length, cargoLost: S.stats.cargoLost, cargoTotal: cargo.length,
      coins: S.pickups, pickups: S.pickups, maxMultiplier: S.stats.maxMult, flips: S.stats.flips, intact,
    };
    emit('levelEnd', S.result);
    for (let i = 1; i <= stars; i++) emit('starEarned', { index: i });
    if (result === 'win') slowmo('finish', 'finish');
  }
  function evalStars() {
    const st = S.stats, delivered = cargo.filter((c) => c.state === 'delivered');
    const ok = (k) => {
      switch (k.kind) {
        case 'delivered': return st.cargoDelivered >= k.min;
        case 'deliveredAll': return st.cargoDelivered === cargo.length;
        case 'time': return S.t <= k.max;
        case 'eggs': return st.eggsLeft >= k.min;
        case 'flips': return st.flips >= k.min;
        case 'combo': return st.maxMult >= k.min;
        case 'noReverse': return !st.reversed;
        case 'intact': return delivered.every((c) => c.hp === c.hpMax) && st.cargoLost === 0;
        case 'noHit': return st.hits === 0;
        default: warnings.push(`Bilinmeyen yıldız ölçütü: ${k.kind}`); return false;
      }
    };
    let stars = 1;
    for (const tier of [2, 3]) {
      const list = level.stars?.[tier] ?? [];
      if (list.every(ok)) stars = tier; else break;
    }
    return stars;
  }

  // ---- adım ----
  function step(input = {}) {
    if (!S.started) { S.started = true; S.live = true; emit('levelStart', { levelId: level.id, biome: level.biome, vehicleId, cargo: summarizeCargo(), bestScore: opts.bestScore ?? 0 }); }
    const ended = S.status !== 'running';
    const inp = ended ? { throttle: 0, brake: 0 } : input;
    for (const { body, pose } of tracked) { const p = body.getPosition(); pose.px = p.x; pose.py = p.y; pose.pa = body.getAngle(); }
    const thr = +inp.throttle || 0, brk = +inp.brake || 0;
    if ((thr > 0.5) !== S.throttleOn) { S.throttleOn = thr > 0.5; emit('throttle', { on: S.throttleOn }); }
    if ((brk > 0.5) !== S.brakeOn) { S.brakeOn = brk > 0.5; emit('brake', { on: S.brakeOn }); }
    const cp = veh.chassis.getPosition();
    const onGround = driveVehicle(veh, { throttle: thr, brake: brk }, { dt: DT, assistLanding: assist, groundDist: cp.y - heightAt(terr, cp.x) });
    if (veh.reversing) S.stats.reversed = true;
    world.step(DT, SIM.velocityIterations, SIM.positionIterations);
    if (S.live) { S.t += DT; S.steps++; }
    if (!ended) post(onGround);
    bus.flush();
  }
  function summarizeCargo() {
    const m = {};
    for (const c of cargo) m[c.type] = (m[c.type] ?? 0) + 1;
    return Object.entries(m).map(([type, count]) => ({ type, count }));
  }

  function post() {
    const p = veh.chassis.getPosition(), vel = veh.chassis.getLinearVelocity(), ang = veh.chassis.getAngle();
    const speed = vel.length();
    const nOn = veh.wheels.filter((w) => w.contacts > 0).length;

    // yüzey değişimi, patinaj, süspansiyon
    for (const w of veh.wheels) {
      const on = w.contacts > 0;
      if (on && w.prevSurface && w.surface !== w.prevSurface) emit('surfaceChange', { wheel: w.id, from: w.prevSurface, to: w.surface });
      if (on) w.prevSurface = w.surface;
      const wv = w.body.getLinearVelocity();
      const fwd = wv.x * Math.cos(ang) + wv.y * Math.sin(ang);
      const surfSpeed = -w.body.getAngularVelocity() * cfg.wheelR;
      w.slip = on ? Math.abs(surfSpeed - fwd) : 0;
      w.spinning = on && w.slip > WHEELSPIN_SLIP;
      if (w.spinning && S.t - w.lastSpinEmit > 0.1) { w.lastSpinEmit = S.t; emit('wheelspin', { wheel: w.id, surface: w.surface, slip: w.slip }); }
      if (w.bottomOut && !w.wasBottom) emit('suspension', { wheel: w.id, compression: w.comp, bottomOut: true });
      w.wasBottom = w.bottomOut;
    }
    if (++S.engineTick % 2 === 0) emit('engine', { vehicleId, rpm: veh.rpm, load: veh.load, speed });

    // havada kalma / iniş / takla
    veh.airT = nOn === 0 ? veh.airT + DT : 0;
    veh.groundT = nOn > 0 ? veh.groundT + DT : 0;
    if (!S.air.on && veh.airT >= RULES.airborneDebounce) {
      S.air = { on: true, startT: S.t - veh.airT, startAngle: ang, lastAngle: ang, accAngle: 0, flips: 0, cargoOk: true, dir: 'back' };
      emit('airborne', { startT: S.air.startT });
    }
    if (S.air.on) {
      S.air.accAngle += ang - S.air.lastAngle; S.air.lastAngle = ang;
      const f = Math.floor(Math.abs(S.air.accAngle) / (2 * Math.PI));
      if (f > S.air.flips) {
        S.air.flips = f; S.air.dir = S.air.accAngle > 0 ? 'back' : 'front';
        emit('flip', { count: f, direction: S.air.dir, airTime: S.t - S.air.startT });
      }
      if (nOn > 0) landing(nOn, ang, vel);
    }

    // tek teker
    const rear = wheelById.rear, front = wheelById.front;
    const wheelieNow = rear && front && rear.contacts > 0 && front.contacts === 0 && wrapAngle(ang) > RULES.wheelieAngle;
    if (wheelieNow) S.wheelie.t += DT;
    else if (S.wheelie.t > 0) {
      if (S.wheelie.t >= SCORING.wheelieMin) { emit('wheelie', { duration: S.wheelie.t }); addMove(SCORING.wheeliePerSec * S.wheelie.t); }
      S.wheelie.t = 0;
    }
    if (S.combo.count > 0) { S.combo.timer -= DT; if (S.combo.timer <= 0) bank(); }

    // kargo kaybı
    for (const c of cargo) {
      if (c.state !== 'onboard') continue;
      const cpos = c.body.getPosition();
      if (cpos.y < killY + SIM.killDepth * 0.5) { lose(c, 'fell'); continue; }
      if (p.x - cpos.x > CARGO_LOSS.behindDist) { lose(c, 'left'); continue; }
      const farFromCar = Math.hypot(cpos.x - p.x, cpos.y - p.y) > CARGO_LOSS.restDist;
      if (farFromCar && c.body.getLinearVelocity().length() < 0.3) { c.restT += DT; if (c.restT > CARGO_LOSS.restTime) lose(c, 'fell'); } else c.restT = 0;
    }

    // kuruşlar, ipuçları, tehlikeler
    for (const k of coins) {
      if (!k.taken && Math.hypot(k.x - p.x, k.y - p.y) < 1.3) {
        k.taken = true; S.pickups += OBJECTS.coin.value;
        emit('coin', { value: OBJECTS.coin.value, pos: { x: k.x, y: k.y } });
      }
    }
    for (const h of hints) if (!h.shown && p.x >= h.x) { h.shown = true; emit('toast', { text: h.text, icon: h.icon ?? 'info' }); }
    for (const o of objects) {
      if (o.type !== 'rock') continue;
      if (!o.triggered && p.x >= o.trig) {
        o.triggered = true; o.body.setType('dynamic'); o.body.setLinearVelocity(V(o.vx, 0)); o.body.setAwake(true);
        emit('hazardTrigger', { id: o.id, type: 'rock', pos: { x: o.body.getPosition().x, y: o.body.getPosition().y } });
      }
      if (o.triggered && !o.near) {
        const d = Math.hypot(o.body.getPosition().x - p.x, o.body.getPosition().y - p.y) - o.pose.r;
        if (d < 0.6 && d > -0.2) { o.near = true; emit('nearMiss', { id: o.id, distance: d }); addMove(SCORING.nearMiss); }
      }
    }

    // sürücü fırlaması
    if (S.pendingEject) {
      const ev = S.pendingEject; S.pendingEject = null;
      world.destroyJoint(veh.driver.seatJoint); veh.driver.ejected = true;
      emit('driverEject', ev); emit('crash', { reason: 'headHit', pos: ev.pos });
      burn('headHit'); slowmo('headHit', 'headHit');
      S.pendingFail = { at: S.t + DRIVER.failDelay, reason: 'headHit' };
    }
    if (S.pendingFail && S.t >= S.pendingFail.at) { endLevel('fail', S.pendingFail.reason); return; }
    if (S.pendingFail) return;

    // başarısızlık: ters kalma, uçurum, süre
    const tilt = Math.abs(wrapAngle(ang));
    if (tilt > RULES.flipAngle && speed < RULES.flipSpeed) S.flipT += DT; else S.flipT = 0;
    if (S.flipT >= RULES.flipTime) { emit('crash', { reason: 'flipped', pos: { x: p.x, y: p.y } }); endLevel('fail', 'flipped'); return; }
    // çukura düşüp kalma: çevre zeminin 3 m altında 1.5 sn
    S.pitT = p.y < topNear(terr, p.x, 3) - 2.5 ? (S.pitT ?? 0) + DT : 0;
    if (S.pitT > 1.5) { emit('crash', { reason: 'fell', pos: { x: p.x, y: p.y } }); endLevel('fail', 'fell'); return; }
    if (p.y < killY) { emit('crash', { reason: 'fell', pos: { x: p.x, y: p.y } }); endLevel('fail', 'fell'); return; }
    if (level.timeLimit && S.t >= level.timeLimit) { endLevel('fail', 'timeout'); return; }

    // bitiş
    if (p.x >= finishX) {
      for (const c of cargo) {
        if (c.state !== 'onboard') continue;
        const cp = c.body.getPosition();
        if (Math.hypot(cp.x - p.x, cp.y - p.y) <= CARGO_LOSS.deliverRadius) {
          c.state = 'delivered';
          emit('cargoDelivered', { id: c.id, type: c.type, value: cargoValue(c), hpLeft: c.hp });
        } else lose(c, 'left');
      }
      const nDel = cargo.filter((c) => c.state === 'delivered').length;
      if (nDel >= (level.minDelivered ?? 1) || cargo.length === 0) endLevel('win', 'finish');
      else { emit('crash', { reason: 'cargoShort', pos: { x: p.x, y: p.y } }); endLevel('fail', 'cargoShort'); }
    }
  }

  function landing(nOn, ang, vel) {
    const a = S.air, airTime = S.t - a.startT, tilt = Math.abs(wrapAngle(ang));
    const clean = nOn >= 1 && tilt < 1.0;
    a.on = false;
    emit('land', { impactSpeed: Math.abs(vel.y), tilt: wrapAngle(ang), wheels: nOn, clean, airTime });
    S.stats.airTime += airTime;
    if (!clean) { burn('badLanding'); return; }
    if (a.flips > 0) { S.stats.flips += a.flips; for (let i = 0; i < a.flips; i++) addMove(SCORING.flip); }
    if (airTime >= SCORING.airMin) addMove(SCORING.airPerSec * airTime);
    if (airTime >= SCORING.cargoAirMin && a.cargoOk && cargo.length) addMove(SCORING.cargoAir);
  }

  // ---- yerleşme: saat durmuşken aracı oturt ----
  for (let i = 0; i < Math.round(SIM.settleTime / DT); i++) {
    driveVehicle(veh, { throttle: 0, brake: 0 }, { dt: DT, assistLanding: false, groundDist: 1 });
    world.step(DT, SIM.velocityIterations, SIM.positionIterations);
  }
  for (const w of veh.wheels) { w.t0 = w.trans; w.comp = 0.5; w.prevSurface = w.surface; w.lastSpinEmit = -1; w.wasBottom = false; }
  for (const c of cargo) { c.body.setLinearVelocity(V(0, 0)); }
  S.live = false;

  // ---- statik anlık görüntü (bölüm başına bir kez) ----
  const staticSnap = {
    levelId: level.id, name: level.name, biome: level.biome ?? 'elma', music: level.music ?? null,
    terrain: { xs: terr.xs, ys: terr.ys, surf: terr.surf },
    startX: terr.startX, startY: heightAt(terr, terr.startX), finishX, finishY: heightAt(terr, finishX), killY, spawn: { x: spawnX, y: spawnY },
    bounds: { minX: terr.xs[0], maxX: terr.xs[terr.xs.length - 1], minY: terr.minY, maxY: Math.max(...terr.ys) },
    vehicle: { id: vehicleId, parts: cfg.parts, wheels: cfg.wheels.map((w) => ({ id: w.id, x: w.x, y: w.y, driven: !!w.driven })), wheelR: cfg.wheelR, travel: cfg.travel, seat: cfg.seat, bay: cfg.bay },
    checkpoints: level.checkpoints ?? [],
    hints: level.hints ?? [],
  };

  // ---- dinamik anlık görüntü ----
  const snap = {
    t: 0, steps: 0, timeScale: 1,
    run: { status: 'running', reason: null, time: 0, distance: 0, progress: 0, timeLeft: null },
    vehicle: null, driver: null, cargo: [], objects: [], coins: coins.map((k) => ({ id: k.id, x: k.x, y: k.y, taken: false })),
    combo: { count: 0, multiplier: 1, timeLeft01: 0, pending: 0 },
    score: 0, pickups: 0, cargoSummary: { total: cargo.length, onboard: 0, delivered: 0, lost: 0 },
  };
  const readPoses = () => {
    for (const { body, pose } of tracked) { const p = body.getPosition(); pose.x = p.x; pose.y = p.y; pose.a = body.getAngle(); }
  };
  function snapshot() {
    readPoses();
    const v = veh.chassis.getLinearVelocity();
    snap.t = S.t; snap.steps = S.steps;
    snap.timeScale = S.t < S.slow.until ? S.slow.scale : 1;
    const run = snap.run;
    run.status = S.status; run.reason = S.reason; run.time = S.t;
    run.distance = Math.max(0, chassisPose.x - terr.startX);
    run.progress = Math.max(0, Math.min(1, (chassisPose.x - terr.startX) / (finishX - terr.startX)));
    run.timeLeft = level.timeLimit ? Math.max(0, level.timeLimit - S.t) : null;
    snap.vehicle = {
      id: vehicleId, ...chassisPose, vx: v.x, vy: v.y, w: veh.chassis.getAngularVelocity(), speed: v.length(),
      throttle: veh.throttle, brake: veh.brake, rpm: veh.rpm, load: veh.load, airborne: S.air.on, reversing: veh.reversing,
      wheelie: S.wheelie.t,
      wheels: veh.wheels.map((w) => ({
        id: w.id, ...w.pose, r: cfg.wheelR, compression: w.comp, onGround: w.contacts > 0, surface: w.contacts > 0 ? w.surface : null,
        spinning: w.spinning, slip: w.slip, spin: w.body.getAngularVelocity(), bottomOut: !!w.bottomOut,
      })),
    };
    snap.driver = { state: veh.driver.ejected ? 'ragdoll' : 'seated', torso: torsoPose, head: headPose };
    snap.cargo = cargo.map((c) => ({ id: c.id, type: c.type, ...c.pose, hp: c.hp, hpMax: c.hpMax, state: c.state, reason: c.reason ?? null }));
    snap.objects = objects.map((o) => ({ id: o.id, type: o.type, ...o.pose, active: o.type !== 'rock' || o.triggered }));
    for (let i = 0; i < coins.length; i++) snap.coins[i].taken = coins[i].taken;
    snap.combo.count = S.combo.count; snap.combo.multiplier = S.combo.mult; snap.combo.pending = Math.round(S.combo.pending);
    snap.combo.timeLeft01 = S.combo.count ? Math.max(0, S.combo.timer / SCORING.comboWindow) : 0;
    snap.score = S.score; snap.pickups = S.pickups;
    const cs = snap.cargoSummary;
    cs.onboard = cargo.filter((c) => c.state === 'onboard').length; cs.delivered = cargo.filter((c) => c.state === 'delivered').length; cs.lost = cargo.filter((c) => c.state === 'lost').length;
    return snap;
  }
  readPoses();
  for (const { pose } of tracked) { pose.px = pose.x; pose.py = pose.y; pose.pa = pose.a; }

  return {
    /** Bölüm başına bir kez okunan değişmez veri (zemin, biyom, bitiş...). */
    static: staticSnap,
    step, snapshot,
    on: bus.on,
    get status() { return S.status; },
    get result() { return S.result; },
    get time() { return S.t; },
    warnings,
    /** Dünya ve dinleyicileri bırakır. Sıfırlama = destroy() + yeni createSim(). */
    destroy() { bus.clear(); world.clearForces?.(); for (let b = world.getBodyList(); b;) { const n = b.getNext(); world.destroyBody(b); b = n; } },
    /** Yalnızca test/hata ayıklama: ham planck nesneleri. */
    _debug: { world, veh, cargo, objects, terr },
  };
}
