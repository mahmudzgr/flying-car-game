// Araç (şasi + 2 tekerlek WheelJoint) ve sürücü Fındık. Yalnızca planck kullanır; DOM yok.
import * as pl from '../../vendor/planck.mjs';
import { CAT, SIM, DRIVER, SURFACES, AIR_ROLLING, RULES } from '../config.js';

const V = pl.Vec2;

/** Araç + sürücü gövdelerini kurar. cfg = upgrades.effectiveVehicle() çıktısı. */
export function buildVehicle(world, cfg, x, y) {
  const chassis = world.createBody({ type: 'dynamic', position: V(x, y), angularDamping: 0.3 });
  for (const p of cfg.parts) {
    chassis.createFixture(pl.Box(p.w / 2, p.h / 2, V(p.x, p.y), 0), {
      density: 1, friction: 0.4, restitution: 0.05,
      filterCategoryBits: CAT.chassis,
      filterMaskBits: CAT.ground | CAT.cargo | CAT.object,
      userData: { k: 'chassis', part: p.part },
    });
  }
  // Kütle merkezi alçak, eylemsizlik TASARIM değerinden (TASARIM §4.5).
  const c = V(0, cfg.comY);
  chassis.setMassData({ mass: cfg.mass, center: c, I: cfg.inertia + cfg.mass * c.lengthSquared() });

  // Römork (Paşa): tractor'a RevoluteJoint ile bağlı, kendi tekerleği/süspansiyonu var.
  let trailer = null;
  if (cfg.trailer) {
    const T = cfg.trailer;
    const hp = chassis.getWorldPoint(V(T.hitch.x, T.hitch.y));
    const body = world.createBody({ type: 'dynamic', position: hp, angularDamping: 0.3 });
    for (const p of T.parts) {
      body.createFixture(pl.Box(p.w / 2, p.h / 2, V(p.x, p.y), 0), {
        density: 1, friction: 0.4, restitution: 0.05, filterCategoryBits: CAT.chassis,
        filterMaskBits: CAT.ground | CAT.cargo | CAT.object, userData: { k: 'chassis', part: 'trailer' },
      });
    }
    const tc = V(T.comX ?? -1.8, T.comY ?? 0);
    body.setMassData({ mass: T.mass, center: tc, I: T.inertia + T.mass * tc.lengthSquared() });
    const joint = world.createJoint(new pl.RevoluteJoint({ enableLimit: true, lowerAngle: -T.hitchLimit, upperAngle: T.hitchLimit }, chassis, body, hp));
    trailer = { body, joint, cfg: T };
  }

  const makeWheel = (w, parent, parentMass, nOnParent, parentCfg) => {
    const r = w.r ?? cfg.wheelR, wm = w.mass ?? cfg.wheelMass;
    const spMass = parentMass / nOnParent;
    const omega = 2 * Math.PI * (parentCfg.freqHz ?? cfg.freqHz);
    const k = spMass * omega * omega;
    const wOmega = Math.sqrt(k / wm);
    const jointHz = wOmega / (2 * Math.PI);
    const jointZeta = (2 * (parentCfg.zeta ?? cfg.zeta) * spMass * omega) / (2 * wm * wOmega);
    const pos = parent.getWorldPoint(V(w.x, w.y));
    const body = world.createBody({ type: 'dynamic', position: pos, bullet: true, angularDamping: AIR_ROLLING });
    body.createFixture(pl.Circle(V(0, 0), r), {
      density: wm / (Math.PI * r * r), friction: 1, restitution: 0.05,
      filterCategoryBits: CAT.wheel, filterMaskBits: CAT.ground | CAT.object,
      userData: { k: 'wheel', id: w.id },
    });
    const joint = world.createJoint(new pl.WheelJoint({
      enableMotor: true, maxMotorTorque: 0, motorSpeed: 0, frequencyHz: jointHz, dampingRatio: jointZeta,
    }, parent, body, pos, parent.getWorldVector(V(0, 1))));
    return {
      id: w.id, def: w, r, parent, trailerWheel: parentCfg !== cfg, body, joint, driven: !!w.driven, contacts: 0, surface: null, prevSurface: null,
      comp: 0, t0: 0, slip: 0, spinning: false, kBump: 5 * k, trans: 0, lastSpinEmit: -1,
      travel: w.travel ?? (parentCfg.travel ?? cfg.travel),
    };
  };
  const wheels = cfg.wheels.map((w) => makeWheel(w, chassis, cfg.mass, cfg.wheels.length, cfg));
  if (trailer) for (const w of cfg.trailer.wheels) wheels.push(makeWheel(w, trailer.body, cfg.trailer.mass, cfg.trailer.wheels.length, cfg.trailer));

  // Sürücü (TASARIM §4.1)
  const seat = chassis.getWorldPoint(V(cfg.seat.x, cfg.seat.y));
  const tmask = CAT.ground | CAT.object;
  const torso = world.createBody({ type: 'dynamic', position: seat, angularDamping: 0.5 });
  torso.createFixture(pl.Box(DRIVER.torso.w / 2, DRIVER.torso.h / 2), {
    density: DRIVER.torso.mass / (DRIVER.torso.w * DRIVER.torso.h), friction: 0.4,
    filterCategoryBits: CAT.driver, filterMaskBits: tmask, userData: { k: 'torso' },
  });
  const head = world.createBody({ type: 'dynamic', position: V(seat.x, seat.y + DRIVER.head.offsetY), angularDamping: 0.5 });
  head.createFixture(pl.Circle(V(0, 0), DRIVER.head.r), {
    density: DRIVER.head.mass / (Math.PI * DRIVER.head.r ** 2), friction: 0.4, restitution: 0.1,
    filterCategoryBits: CAT.driver, filterMaskBits: tmask, userData: { k: 'head' },
  });
  const seatJoint = world.createJoint(new pl.RevoluteJoint({
    enableLimit: true, lowerAngle: -DRIVER.seatLimit, upperAngle: DRIVER.seatLimit,
  }, chassis, torso, V(seat.x, seat.y - DRIVER.torso.h / 2)));
  const neckJoint = world.createJoint(new pl.RevoluteJoint({
    enableLimit: true, lowerAngle: -DRIVER.neckLimit, upperAngle: DRIVER.neckLimit,
  }, torso, head, V(seat.x, seat.y + DRIVER.torso.h / 2)));

  return {
    cfg, chassis, trailer, bayBody: trailer ? trailer.body : chassis, wheels, driver: { torso, head, seatJoint, neckJoint, ejected: false },
    airborne: false, airT: 0, groundT: 0, revTimer: 0, reversing: false, rpm: 0, load: 0,
    throttle: 0, brake: 0, gravity: SIM.gravity,
  };
}

/** Giriş + dünya durumuna göre motor/fren/süspansiyon/hava kuvvetlerini uygular (her adımda, world.step'ten önce). */
export function driveVehicle(veh, input, opt) {
  const { cfg, chassis, wheels } = veh;
  const thr = clamp01(input.throttle), brk = clamp01(input.brake);
  veh.throttle = thr; veh.brake = brk;
  const tw = wheels.filter((w) => !w.trailerWheel);
  const onGround = tw.filter((w) => w.contacts > 0).length;
  const fwdSpeed = chassis.getLinearVelocity().x * Math.cos(chassis.getAngle()) + chassis.getLinearVelocity().y * Math.sin(chassis.getAngle());

  // geri vites: fren basılı ve durmuş halde ≥250 ms
  if (brk > 0.1 && thr < 0.1 && fwdSpeed < 0.6) veh.revTimer += opt.dt; else if (brk < 0.1) veh.revTimer = 0;
  veh.reversing = veh.revTimer > RULES.reverseDelay;

  const nDriven = wheels.filter((w) => w.driven).length || 1;
  const nBrake = wheels.filter((w) => !w.trailerWheel).length;
  let rpmAcc = 0;
  for (const w of wheels) {
    const j = w.joint;
    let torque = 0, speed = 0;
    const om = Math.abs(w.body.getAngularVelocity());
    if (w.driven && thr > 0.05 && !(brk > 0.1)) {            // gaz
      torque = cfg.motorTorque / nDriven * thr; speed = -cfg.maxWheelSpeed;
    } else if (w.driven && thr > 0.05 && brk > 0.1) {          // motor freni / patinaj yönetimi
      torque = cfg.brakeTorque / nDriven * 0.5; speed = 0;
    } else if (brk > 0.1 && veh.reversing) {                   // geri
      torque = (w.driven ? cfg.motorTorque / nDriven : 0) * 0.6 * brk; speed = cfg.maxWheelSpeed * RULES.reverseSpeedFrac;
    } else if (brk > 0.1) {                                     // fren (tüm tekerlekler)
      torque = cfg.brakeTorque / nBrake * brk; speed = 0;
    }
    j.enableMotor(true); j.setMotorSpeed(speed); j.setMaxMotorTorque(torque);
    if (w.driven) rpmAcc += om / cfg.maxWheelSpeed;
    if (w.trailerWheel) { torque = brk > 0.1 ? cfg.brakeTorque * 0.15 * brk : 0; speed = 0; j.setMaxMotorTorque(torque); j.setMotorSpeed(0); }

    // yüzeye bağlı yuvarlanma direnci
    const s = w.contacts > 0 && w.surface ? SURFACES[w.surface] : null;
    let rolling = s ? s.rolling : AIR_ROLLING;
    if (s && (s.id === 'sand' || s.id === 'mud')) rolling *= cfg.softRollingScale ?? 1;
    w.body.setAngularDamping(rolling);

    // süspansiyon durumu (sıkışma 0..1) ve yaylanma yolu uç tamponu
    const par = w.parent;
    const axis = par.getWorldVector(V(0, 1));
    const anchor = par.getWorldPoint(V(w.def.x, w.def.y));
    const d = w.body.getPosition().clone().sub(anchor);
    w.trans = d.x * axis.x + d.y * axis.y;     // ham eksen ötelenmesi (yukarı = sıkışma)
    const t = w.trans - w.t0;                   // yerleşme (statik çökme) konumuna göre; yolculuk ±travel bu merkez çevresinde
    const lo = w.travel[0], hi = w.travel[1];
    w.comp = clamp01((t - lo) / (hi - lo));
    let f = 0;
    if (t > hi) f = -w.kBump * (t - hi);
    else if (t < lo) f = w.kBump * (lo - t);
    if (f) {
      f = Math.max(-1e5, Math.min(1e5, f));
      const F = V(axis.x * f, axis.y * f);
      w.body.applyForceToCenter(F, true);
      par.applyForce(V(-F.x, -F.y), anchor, true);
    }
    w.bottomOut = t > hi || t < lo;
  }
  veh.rpm = Math.max(0.12, Math.min(1, rpmAcc / nDriven));
  veh.load = clamp01(thr * (1 - 0.6 * veh.rpm));

  // aerodinamik sürükleme
  const v = chassis.getLinearVelocity();
  const sp = v.length();
  if (sp > 0.01) { const fd = cfg.drag * sp; chassis.applyForceToCenter(V(-v.x * fd, -v.y * fd), true); }
  // yumuşak zeminde (kum/çamur/kar...) hızla orantılı batma sürüklemesi
  let sinkF = 0;
  for (const w of wheels) {
    const s = w.contacts > 0 && w.surface ? SURFACES[w.surface] : null;
    if (s && s.sink) sinkF += s.sink * (s.id === 'sand' || s.id === 'mud' ? (cfg.softRollingScale ?? 1) : 1) / wheels.length;
  }
  if (sinkF) chassis.applyForceToCenter(V(-v.x * sinkF * cfg.mass * 1.15, -v.y * sinkF * cfg.mass * 1.15 * 0.3), true);

  // ağırlık aktarımı abartısı (görsel/his): gazda burun kalkar, frende çöker (config: pitchGain)
  if (onGround > 0 && cfg.pitchGain) {
    let pt = veh.load * cfg.motorTorque * cfg.pitchGain;
    if (brk > 0.1 && fwdSpeed > 1) pt -= brk * cfg.brakeTorque * cfg.pitchGain * 0.8;
    if (pt) chassis.applyTorque(pt, true);
  }
  // hava torku (TASARIM §3.3)
  const frac = onGround === 0 ? 1 : onGround < tw.length ? 0.35 : 0;
  if (frac > 0) {
    const w = chassis.getAngularVelocity();
    let tq = 0;
    if (thr > 0.05 && w < cfg.airMaxW) tq += cfg.airTorque * frac * thr;
    if (brk > 0.05 && w > -cfg.airMaxW) tq -= cfg.airTorque * frac * brk;
    // iniş yardımı (hafif "kedi refleksi"): ters ve yere yakınsa
    if (opt.assistLanding && onGround === 0 && !tq) {
      const a = wrapAngle(chassis.getAngle());
      if (Math.abs(a) > 2.6 && opt.groundDist < 1.2) tq = -Math.sign(a) * cfg.airTorque * 0.2;
    }
    if (tq) chassis.applyTorque(tq, true);
  }
  return onGround;
}

export function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
