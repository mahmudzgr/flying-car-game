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

  const nW = cfg.wheels.length;
  const spMass = cfg.mass / nW;
  const omega = 2 * Math.PI * cfg.freqHz;
  const k = spMass * omega * omega;               // sprung kütleye göre yay sertliği
  const wOmega = Math.sqrt(k / cfg.wheelMass);    // WheelJoint, yay kütlesi olarak ≈ tekerlek kütlesini kullanır
  const jointHz = wOmega / (2 * Math.PI);
  const jointZeta = (2 * cfg.zeta * spMass * omega) / (2 * cfg.wheelMass * wOmega);

  const wheels = cfg.wheels.map((w) => {
    const pos = chassis.getWorldPoint(V(w.x, w.y));
    const body = world.createBody({ type: 'dynamic', position: pos, bullet: true, angularDamping: AIR_ROLLING });
    body.createFixture(pl.Circle(V(0, 0), cfg.wheelR), {
      density: cfg.wheelMass / (Math.PI * cfg.wheelR * cfg.wheelR),
      friction: 1, restitution: 0.05,
      filterCategoryBits: CAT.wheel, filterMaskBits: CAT.ground | CAT.object,
      userData: { k: 'wheel', id: w.id },
    });
    const joint = world.createJoint(new pl.WheelJoint({
      enableMotor: true, maxMotorTorque: 0, motorSpeed: 0, frequencyHz: jointHz, dampingRatio: jointZeta,
    }, chassis, body, pos, chassis.getWorldVector(V(0, 1))));
    return {
      id: w.id, def: w, body, joint, driven: !!w.driven, contacts: 0, surface: null, prevSurface: null,
      comp: 0, t0: 0, slip: 0, spinning: false, kBump: 5 * k, trans: 0, lastSpinEmit: -1,
    };
  });

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
    cfg, chassis, wheels, driver: { torso, head, seatJoint, neckJoint, ejected: false },
    airborne: false, airT: 0, groundT: 0, revTimer: 0, reversing: false, rpm: 0, load: 0,
    throttle: 0, brake: 0, gravity: SIM.gravity,
  };
}

/** Giriş + dünya durumuna göre motor/fren/süspansiyon/hava kuvvetlerini uygular (her adımda, world.step'ten önce). */
export function driveVehicle(veh, input, opt) {
  const { cfg, chassis, wheels } = veh;
  const thr = clamp01(input.throttle), brk = clamp01(input.brake);
  veh.throttle = thr; veh.brake = brk;
  const onGround = wheels.filter((w) => w.contacts > 0).length;
  const fwdSpeed = chassis.getLinearVelocity().x * Math.cos(chassis.getAngle()) + chassis.getLinearVelocity().y * Math.sin(chassis.getAngle());

  // geri vites: fren basılı ve durmuş halde ≥250 ms
  if (brk > 0.1 && thr < 0.1 && fwdSpeed < 0.6) veh.revTimer += opt.dt; else if (brk < 0.1) veh.revTimer = 0;
  veh.reversing = veh.revTimer > RULES.reverseDelay;

  const nDriven = wheels.filter((w) => w.driven).length || 1;
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
      torque = cfg.brakeTorque / wheels.length * brk; speed = 0;
    }
    j.enableMotor(true); j.setMotorSpeed(speed); j.setMaxMotorTorque(torque);
    if (w.driven) rpmAcc += om / cfg.maxWheelSpeed;

    // yüzeye bağlı yuvarlanma direnci
    const s = w.contacts > 0 && w.surface ? SURFACES[w.surface] : null;
    let rolling = s ? s.rolling : AIR_ROLLING;
    if (s && (s.id === 'sand' || s.id === 'mud')) rolling *= cfg.softRollingScale ?? 1;
    w.body.setAngularDamping(rolling);

    // süspansiyon durumu (sıkışma 0..1) ve yaylanma yolu uç tamponu
    const axis = chassis.getWorldVector(V(0, 1));
    const anchor = chassis.getWorldPoint(V(w.def.x, w.def.y));
    const d = w.body.getPosition().clone().sub(anchor);
    w.trans = d.x * axis.x + d.y * axis.y;     // ham eksen ötelenmesi (yukarı = sıkışma)
    const t = w.trans - w.t0;                   // yerleşme (statik çökme) konumuna göre; yolculuk ±travel bu merkez çevresinde
    const lo = cfg.travel[0], hi = cfg.travel[1];
    w.comp = clamp01((t - lo) / (hi - lo));
    let f = 0;
    if (t > hi) f = -w.kBump * (t - hi);
    else if (t < lo) f = w.kBump * (lo - t);
    if (f) {
      f = Math.max(-1e5, Math.min(1e5, f));
      const F = V(axis.x * f, axis.y * f);
      w.body.applyForceToCenter(F, true);
      chassis.applyForce(V(-F.x, -F.y), anchor, true);
    }
    w.bottomOut = t > hi || t < lo;
  }
  veh.rpm = Math.max(0.12, Math.min(1, rpmAcc / nDriven));
  veh.load = clamp01(thr * (1 - 0.6 * veh.rpm));

  // aerodinamik sürükleme
  const v = chassis.getLinearVelocity();
  const sp = v.length();
  if (sp > 0.01) { const fd = cfg.drag * sp; chassis.applyForceToCenter(V(-v.x * fd, -v.y * fd), true); }
  // kum: yüksek hızda ek sürükleme
  for (const w of wheels) {
    const s = w.contacts > 0 && w.surface ? SURFACES[w.surface] : null;
    if (s && s.softAbove && sp > s.softAbove) chassis.applyForceToCenter(V(-v.x * 0.25 * 0.5, 0), true);
  }

  // ağırlık aktarımı abartısı (görsel/his): gazda burun kalkar, frende çöker (config: pitchGain)
  if (onGround > 0 && cfg.pitchGain) {
    let pt = veh.load * cfg.motorTorque * cfg.pitchGain;
    if (brk > 0.1 && fwdSpeed > 1) pt -= brk * cfg.brakeTorque * cfg.pitchGain * 0.8;
    if (pt) chassis.applyTorque(pt, true);
  }
  // hava torku (TASARIM §3.3)
  const frac = onGround === 0 ? 1 : onGround < wheels.length ? 0.35 : 0;
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
