// Milimetrik Park — araç dinamiği.
//
// Model: dört tekerlekli düzlemsel araç (3 serbestlik: x, y, yön).
//  - Ackermann direksiyon: iç teker daha çok döner; tüm tekerlerin dönme merkezi arka dingil hizasında.
//  - Lastik yanal kuvveti "yumuşak kısıt": Fy = −Cα·α (Cα yükle orantılı). Düşük hızda kısıt sertleşir ve
//    araç kaymadan (kinematik) döner; yüksek hızda kayma açısı oluşur; sürtünme çemberi aşılınca kayar.
//  - Boyuna: fren ve yuvarlanma direnci Coulomb sürtünmesi gibi çözülür → frende araç titremeden durur ve
//    yerinde kalır. Otomatik vitesin rölanti sürünmesi (D/R'de pedalsız ~6 km/h) gerçek park tekniğini
//    (fren pedalıyla hız ayarı) mümkün kılar.
//  - Ağırlık aktarımı: boyuna/yanal ivme tekerlek yüklerini değiştirir (tutuş ve görsel salınım).
//  - P vitesi çekiş tekerlerini, el freni arka tekerleri kilitler (yönsüz kayma sürtünmesi).
//  - Direksiyon simidi hareket hâlinde kendini toplar (ileri giderken belirgin, geri giderken çok az).
import { GRAVITY } from '../config.js';
import { Body, polyShape, chamferBoxVerts, boxVerts, LAYER } from './physics.js';

const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

/** Araç gövdesinin yerel ölçüleri (x ileri, ağırlık merkezi orijinde). */
export function carGeom(spec) {
  const a = spec.cgToFront, b = spec.wheelbase - spec.cgToFront;
  const xf = a + spec.overhangF, xr = -(b + spec.overhangR);
  return { a, b, xf, xr, hw: spec.width / 2, gcx: (xf + xr) / 2, length: xf - xr, width: spec.width };
}

/** Geometrik merkezi (cx, cy), yönü ang olan araç gövdesi. */
export function createCarBody(spec, cx, cy, ang) {
  const g = carGeom(spec);
  const fx = Math.cos(ang), fy = Math.sin(ang);
  const body = new Body({ x: cx - fx * g.gcx, y: cy - fy * g.gcx, a: ang, mass: spec.mass, inertia: spec.inertia, kind: 'car' });
  body.add(polyShape(chamferBoxVerts(g.xr, g.xf, g.hw, 0.3, 0.2), { layer: LAYER.BODY, mask: LAYER.BODY, mu: 0.3, e: 0.12, kind: 'carBody' }));
  const ht = spec.track / 2;
  for (const [name, bx, by] of [['FL', g.a, -ht], ['FR', g.a, ht], ['RL', -g.b, -ht], ['RR', -g.b, ht]]) {
    body.add(polyShape(boxVerts(bx, by, spec.wheelRadius, spec.tireWidth / 2 + 0.01), {
      layer: LAYER.WHEEL, mask: LAYER.CURB, mu: 0.7, e: 0.05, kind: 'wheel', data: { wheel: name },
    }));
  }
  body.updateGeom();
  return body;
}

function makeWheel(name, bx, by, front) {
  return {
    name, bx, by, front, driven: false, delta: 0, Fz: 0, Fz0: 0, locked: false, sliding: false,
    rx: 0, ry: 0, fx: 1, fy: 0, sx: 0, sy: 1, kL: 1, kS: 1, gamma: 0, JLmax: 0, Jmu: 0, Jiso: 0,
    JL: 0, JS: 0, Jdrive: 0, slip: 0, vL: 0,
  };
}

export class Vehicle {
  constructor(spec, body) {
    this.spec = spec;
    this.body = body;
    this.geom = carGeom(spec);
    const { a, b } = this.geom, ht = spec.track / 2;
    this.wheels = [makeWheel('FL', a, -ht, true), makeWheel('FR', a, ht, true), makeWheel('RL', -b, -ht, false), makeWheel('RR', -b, ht, false)];
    for (const w of this.wheels) {
      w.driven = spec.drive === 'awd' || (spec.drive === 'fwd' ? w.front : !w.front);
      w.Fz0 = (spec.mass * GRAVITY * (w.front ? b : a)) / spec.wheelbase / 2;
      w.Fz = w.Fz0;
    }
    this.nDriven = this.wheels.filter((w) => w.driven).length;
    this.gear = 'P';
    this.steer = 0;            // -1..1 (direksiyon simidi / kilit)
    this.steerHoldT = 0;
    this.throttle = 0;         // pedal (gecikmeli)
    this.brake = 0;
    this.handbrake = false;
    this.ctrl = { throttle: 0, brake: 0, handbrake: false, steerAbs: null, steerDir: 0, autoCenter: true };
    this.axF = 0; this.ayF = 0;          // süzülmüş gövde ivmesi (m/s²): x ileri, y sağ
    this.vx0 = 0; this.vy0 = 0;
    this.vLong = 0; this.vLat = 0; this.speed = 0;
    this.driveForce = 0;
    this.rpm = spec.idleRpm;
    this.autoGear = 1;
    this.turnR = Infinity;
    this.frozen = false;                  // bölüm bitince araç P'de kilitli
  }

  setControls(c) { this.ctrl = c; }

  /** Vites isteği: {ok, reason}. P için durmak, D↔R için yavaşlamak gerekir. */
  requestGear(g) {
    if (!'PRND'.includes(g) || g.length !== 1) return { ok: false, reason: 'invalid' };
    if (g === this.gear) return { ok: true, same: true };
    const v = this.vLong;
    if (g === 'P' && Math.abs(v) > 0.35) return { ok: false, reason: 'park-speed' };
    if ((g === 'D' && v < -1.4) || (g === 'R' && v > 1.4)) return { ok: false, reason: 'dir-speed' };
    this.gear = g;
    return { ok: true };
  }

  get gearDir() { return this.gear === 'D' ? 1 : this.gear === 'R' ? -1 : 0; }

  /** Ön tekerlerin ortalama (merkez) açısı, rad. */
  get steerAngle() { return this.steer * this.spec.maxSteer; }

  preStep(dt) {
    const sp = this.spec, B = this.body, c = this.ctrl;
    this.vx0 = B.vx; this.vy0 = B.vy;
    const cos = Math.cos(B.a), sin = Math.sin(B.a);
    const vLong = B.vx * cos + B.vy * sin;

    // --- direksiyon
    if (this.frozen) {
      this.steerHoldT = 0;
    } else if (c.steerAbs != null) {
      const step = sp.steerRateAbs * dt;
      this.steer += clamp(clamp(c.steerAbs, -1, 1) - this.steer, -step, step);
      this.steerHoldT = 0;
    } else if (c.steerDir) {
      this.steerHoldT += dt;
      const rate = Math.min(sp.steerRateMax, sp.steerRate0 + sp.steerAccel * this.steerHoldT);
      this.steer = clamp(this.steer + c.steerDir * rate * dt, -1, 1);
    } else {
      this.steerHoldT = 0;
      if (c.autoCenter !== false && this.steer !== 0) {
        const k = vLong > 0 ? sp.centerFwd : sp.centerRev;
        const st = k * Math.abs(vLong) * dt;
        this.steer = Math.abs(this.steer) <= st ? 0 : this.steer - Math.sign(this.steer) * st;
      }
    }

    // --- pedallar (aktüatör gecikmesi)
    const tT = this.frozen ? 0 : clamp(c.throttle || 0, 0, 1);
    const tB = this.frozen ? 1 : clamp(c.brake || 0, 0, 1);
    this.throttle += clamp(tT - this.throttle, -dt / 0.08, dt / 0.14);
    this.brake += clamp(tB - this.brake, -dt / 0.07, dt / 0.07);
    this.handbrake = !!c.handbrake && !this.frozen;

    // --- Ackermann
    const L = sp.wheelbase, dc = this.steer * sp.maxSteer;
    if (Math.abs(dc) < 1e-6) {
      this.turnR = Infinity;
      for (const w of this.wheels) w.delta = 0;
    } else {
      const R = L / Math.tan(dc);
      this.turnR = R;
      for (const w of this.wheels) w.delta = w.front ? Math.atan(L / (R - w.by)) : 0;
    }

    // --- tekerlek yükleri (ağırlık aktarımı)
    const m = sp.mass, h = sp.cgHeight, { a, b } = this.geom;
    const ff = m * GRAVITY * b / L - m * this.axF * h / L;
    const fr = m * GRAVITY * a / L + m * this.axF * h / L;
    const latF = m * this.ayF * h / sp.track * sp.rollFront;
    const latR = m * this.ayF * h / sp.track * (1 - sp.rollFront);
    const W = this.wheels, minFz = 0.08 * m * GRAVITY / 4;
    W[0].Fz = Math.max(minFz, ff / 2 + latF); W[1].Fz = Math.max(minFz, ff / 2 - latF);
    W[2].Fz = Math.max(minFz, fr / 2 + latR); W[3].Fz = Math.max(minFz, fr / 2 - latR);

    // --- aktarma organları (tork konvertörlü otomatik)
    const dir = this.gearDir;
    let F = 0;
    if (dir) {
      const vg = vLong * dir;
      // tork konvertörü: durağanken en güçlü, hız arttıkça karesel azalır; ters yönde kayarken artar
      const x = vg / sp.creepSpeed;
      const creep = sp.creepForce * (x <= 0 ? Math.min(1.5, 1 - x * 0.5) : Math.max(0, 1 - x * x));
      const thr = Math.pow(this.throttle, 1.45);
      const vmax = dir > 0 ? sp.vmaxFwd : sp.vmaxRev;
      const P = dir > 0 ? sp.power : sp.powerRev;
      let avail = Math.min(sp.maxDriveForce, P / Math.max(vg, 0.5));
      if (vg > vmax) avail = 0;
      F = creep * (1 - thr) + thr * avail;
      if (thr < 0.02 && vg > sp.creepSpeed) F -= Math.min(sp.engineBrake, (vg - sp.creepSpeed) * sp.engineBrakeK);
      F *= dir;
    }
    this.driveForce = F;
    const Fw = F / this.nDriven;
    for (const w of this.wheels) {
      w.Jdrive = 0;
      if (!w.driven || !F) continue;
      const lim = sp.tireMu * w.Fz;
      const f = clamp(Fw, -lim, lim);
      const ang = B.a + w.delta;
      const fx = Math.cos(ang), fy = Math.sin(ang);
      const rx = w.bx * cos - w.by * sin, ry = w.bx * sin + w.by * cos;
      B.impulse(fx * f * dt, fy * f * dt, B.x + rx, B.y + ry);
      w.Jdrive = f * dt;
    }

    // --- hava direnci
    const sp2 = Math.hypot(B.vx, B.vy);
    if (sp2 > 0.01) {
      const k = 0.5 * 1.2 * sp.dragArea * sp2 * dt * B.invM;
      B.vx -= B.vx * k; B.vy -= B.vy * k;
    }
  }

  prepare(dt) {
    const sp = this.spec, B = this.body;
    const c = Math.cos(B.a), s = Math.sin(B.a);
    const brakeT = Math.pow(this.brake, 2) * sp.brakeForce;   // kademeli pedal: hafif basışta ince ayar
    for (const w of this.wheels) {
      const ang = B.a + w.delta;
      const fx = Math.cos(ang), fy = Math.sin(ang);
      w.fx = fx; w.fy = fy; w.sx = -fy; w.sy = fx;
      w.rx = w.bx * c - w.by * s; w.ry = w.bx * s + w.by * c;
      const rnF = w.rx * fy - w.ry * fx;
      w.kL = B.invM + B.invI * rnF * rnF;
      const rnS = w.rx * w.sy - w.ry * w.sx;
      w.kS = B.invM + B.invI * rnS * rnS;
      const vpx = B.vx - B.w * w.ry, vpy = B.vy + B.w * w.rx;
      const vL = vpx * fx + vpy * fy;
      w.vL = vL;
      w.locked = (this.handbrake && !w.front) || (this.gear === 'P' && w.driven);
      w.JL = 0; w.JS = 0;
      if (w.locked) {
        const vtot = Math.hypot(vpx, vpy);
        w.Jiso = (vtot < 0.25 ? sp.tireMu : sp.tireMuSlide) * w.Fz * dt;
        w.Jdrive = 0;
      } else {
        w.Jmu = (w.sliding ? sp.tireMuSlide : sp.tireMu) * w.Fz * dt;
        const bf = brakeT * (w.front ? sp.brakeBias : 1 - sp.brakeBias) / 2;
        w.JLmax = Math.min((bf + sp.rollingResistance * w.Fz) * dt, w.Jmu);
        w.gamma = Math.abs(vL) / (sp.corneringStiffness * w.Fz * dt);
      }
    }
  }

  solve() {
    const B = this.body;
    for (const w of this.wheels) {
      let vpx = B.vx - B.w * w.ry, vpy = B.vy + B.w * w.rx;
      const px = B.x + w.rx, py = B.y + w.ry;
      if (w.locked) {
        const vl = vpx * w.fx + vpy * w.fy, vs = vpx * w.sx + vpy * w.sy;
        let nl = w.JL - vl / w.kL, ns = w.JS - vs / w.kS;
        const mag = Math.hypot(nl, ns);
        if (mag > w.Jiso) { const k = w.Jiso / mag; nl *= k; ns *= k; }
        const dl = nl - w.JL, ds = ns - w.JS;
        w.JL = nl; w.JS = ns;
        B.impulse(dl * w.fx + ds * w.sx, dl * w.fy + ds * w.sy, px, py);
        continue;
      }
      if (w.JLmax > 0) {
        const vl = vpx * w.fx + vpy * w.fy;
        const nl = clamp(w.JL - vl / w.kL, -w.JLmax, w.JLmax);
        const dl = nl - w.JL;
        if (dl !== 0) {
          w.JL = nl;
          B.impulse(dl * w.fx, dl * w.fy, px, py);
          vpx = B.vx - B.w * w.ry; vpy = B.vy + B.w * w.rx;
        }
      }
      const vs = vpx * w.sx + vpy * w.sy;
      const used = Math.abs(w.Jdrive + w.JL);
      const avail = used >= w.Jmu ? 0 : Math.sqrt(w.Jmu * w.Jmu - used * used);
      const ns = clamp(w.JS - (vs + w.gamma * w.JS) / (w.kS + w.gamma), -avail, avail);
      const ds = ns - w.JS;
      if (ds !== 0) {
        w.JS = ns;
        B.impulse(ds * w.sx, ds * w.sy, px, py);
      }
      w.availS = avail;
    }
  }

  postStep(dt) {
    const sp = this.spec, B = this.body;
    const c = Math.cos(B.a), s = Math.sin(B.a);
    const axw = (B.vx - this.vx0) / dt, ayw = (B.vy - this.vy0) / dt;
    const axb = clamp(axw * c + ayw * s, -14, 14), ayb = clamp(-axw * s + ayw * c, -14, 14);
    const k = 1 - Math.exp(-dt / 0.09);
    this.axF += (axb - this.axF) * k;
    this.ayF += (ayb - this.ayF) * k;
    this.vLong = B.vx * c + B.vy * s;
    this.vLat = -B.vx * s + B.vy * c;
    this.speed = Math.hypot(B.vx, B.vy);

    for (const w of this.wheels) {
      const vpx = B.vx - B.w * w.ry, vpy = B.vy + B.w * w.rx;
      if (w.locked) {
        w.slip = Math.hypot(vpx, vpy);
        w.sliding = w.slip > 0.3;
      } else {
        const vs = vpx * w.sx + vpy * w.sy;
        w.slip = Math.abs(vs);
        w.sliding = w.slip > 0.6 && Math.abs(w.JS) >= (w.availS || 0) * 0.97;
      }
    }

    // --- motor devri (ses için)
    const vk = Math.abs(this.vLong) * 3.6;
    const dir = this.gearDir;
    let target;
    if (dir) {
      const ratios = [0, 92, 56, 39, 30, 24, 20];
      if (dir < 0) this.autoGear = 1;
      else {
        const up = 2100 + this.throttle * 2600, down = 1150 + this.throttle * 900;
        const rpmNow = vk * ratios[this.autoGear];
        if (rpmNow > up && this.autoGear < 6) this.autoGear++;
        else if (rpmNow < down && this.autoGear > 1) this.autoGear--;
      }
      const wheelRpm = vk * (dir < 0 ? 88 : ratios[this.autoGear]);
      const tc = (sp.idleRpm + this.throttle * 1900) * clamp(1 - vk / 22, 0, 1);
      target = Math.max(sp.idleRpm, wheelRpm, tc);
    } else {
      target = sp.idleRpm + this.throttle * (sp.maxRpm - sp.idleRpm) * 0.85;
    }
    target = Math.min(target, sp.maxRpm);
    this.rpm += (target - this.rpm) * (1 - Math.exp(-dt / 0.1));
  }
}
