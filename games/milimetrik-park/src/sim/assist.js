// Milimetrik Park — sürücü yardımcıları (simülasyonun parçası, deterministik).
//
// İki kontrol şeması:
//  - 'lever' (sürüş kolu): tek eksenli yaylı kol. İleri it → ileri, geri çek → geri; ortadan uzaklık gaz
//    miktarıdır (küçük itiş = yavaş). Bırakınca kol ortaya döner ve araç yumuşakça durup frende kalır.
//    Vites (D/R) yön değişince kendiliğinden seçilir; P ayrı düğmedir. Yardımcı, aracın gerçek gaz/fren
//    pedallarını iyi bir sürücü gibi kullanır: fizik değişmez (sürünme, eğim, yük aynı kalır).
//  - 'pedals' (pedal + vites): gerçekçi şema. İsteğe bağlı "Auto Hold": araç frenle tamamen durunca fren
//    tutulur; gaza basınca bırakılır (modern araçlardaki gibi). Vites değiştirirken araç kaçmaz.
import { GRAVITY } from '../config.js';

const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const DEAD = 0.06;

/** Kol konumundan hedef hız (m/s). Küçük itiş çok yavaş: milimetrik ayar için. */
export const leverSpeed = (a, dir) => (dir > 0 ? 0.12 + 10.5 * Math.pow(a, 2.2) : 0.12 + 4.3 * a * a);

export class Driver {
  constructor(vehicle) {
    this.car = vehicle;
    this.scheme = 'lever';
    this.autoHold = true;
    this.hold = false;
    this.parkReq = false;
    this.fi = 0;              // hız hatasının integrali (N)
    this.lastWant = 0;
    this.out = { throttle: 0, brake: 0, handbrake: false, steerAbs: null, steerDir: 0, autoCenter: true };
  }

  /** raw: {throttle, brake, lever, handbrake, steerAbs, steerDir, autoCenter}; gear(g): vites isteği (olaylı). */
  update(raw, dt, gear) {
    const car = this.car, o = this.out;
    o.steerAbs = raw.steerAbs ?? null; o.steerDir = raw.steerDir || 0; o.autoCenter = raw.autoCenter !== false;
    o.handbrake = !!raw.handbrake;
    if (this.scheme === 'pedals') return this._pedals(raw, gear);
    return this._lever(raw, dt, gear);
  }

  _pedals(raw, gear) {
    const car = this.car, o = this.out;
    let br = clamp(raw.brake || 0, 0, 1);
    const thr = clamp(raw.throttle || 0, 0, 1);
    if (this.autoHold && !car.frozen) {
      const still = Math.abs(car.vLong) < 0.05;
      if (!this.hold && still && br > 0.2 && car.gear !== 'P' && car.gear !== 'N') this.hold = true;
      if (this.hold && (thr > 0.05 || car.gear === 'P' || car.gear === 'N')) this.hold = false;
      if (this.hold) br = 1;
    } else this.hold = false;
    if (this.parkReq) {
      br = 1;
      if (Math.abs(car.vLong) < 0.08) { this.parkReq = false; gear('P'); }
    }
    o.throttle = thr; o.brake = br;
    car.setControls(o);
  }

  _lever(raw, dt, gear) {
    const car = this.car, sp = car.spec, o = this.out;
    this.hold = false;
    const L = clamp(raw.lever || 0, -1, 1);
    let a = Math.abs(L) < DEAD ? 0 : (Math.abs(L) - DEAD) / (1 - DEAD);
    let want = a ? Math.sign(L) : 0;
    if (this.parkReq) { a = 0; want = 0; }
    const v = car.vLong;
    if (want !== this.lastWant) { this.fi = 0; this.lastWant = want; }

    // vites: yön değişince önce dur, sonra D/R
    if (want) {
      const g = want > 0 ? 'D' : 'R';
      if (car.gear !== g && (Math.abs(v) < 0.3 || Math.sign(v) === want)) gear(g);
    }
    const dirG = car.gearDir || want || 1;
    const vg = v * dirG;
    const m = car.totalMass;
    const resist = sp.rollingResistance * m * GRAVITY - car.slopeForce * dirG;
    let throttle = 0, brake = 0;

    if (!a) {
      // bırakıldı: yumuşak ama kararlı dur, sonra frende kal
      this.fi = 0;
      if (Math.abs(v) < 0.04 || vg < 0 || !car.gearDir) brake = 1;
      else {
        const ades = Math.max(-4.5, -2.6 * vg - 0.5);
        const fb = car.creepAt(vg) - (m * ades + resist);
        brake = Math.sqrt(clamp(fb / car.brakeMax, 0, 1));
      }
    } else if (car.gearDir !== want) {
      brake = 1;                                    // henüz ters yönde: önce dur
    } else if (vg < -0.05) {
      // istenen yönün tersine kayıyor (yokuş): dur ve kalkışa hazırlan (fren + gaz)
      brake = Math.min(1, 0.55 + Math.abs(vg));
      throttle = Math.min(1, a + (resist > 0 ? car.throttleFor(resist * 1.05, 0, want) : 0));
    } else {
      const vt = leverSpeed(a, want);
      const err = vt - vg;
      const ades = clamp(err * 2.2, -4.5, 0.6 + 2.4 * a);
      this.fi = clamp(this.fi + err * m * 0.9 * dt, -0.35 * m, 0.35 * m);
      const need = m * ades + resist + this.fi;
      const creep = car.creepAt(vg);
      // gaz miktarı kol konumuyla sınırlı; yokuşta "tutmaya yetecek gaz" bunun üstüne eklenir
      const hold = resist > 0 ? car.throttleFor(resist * 1.05, 0, want) : 0;
      if (need > creep) throttle = Math.min(car.throttleFor(need, vg, want), Math.min(1, Math.max(0.08, a) + hold));
      else brake = Math.sqrt(clamp((creep - need) / car.brakeMax, 0, 1));
    }

    if (this.parkReq && Math.abs(v) < 0.08) { this.parkReq = false; brake = 1; gear('P'); }
    o.throttle = throttle; o.brake = brake;
    car.setControls(o);
  }
}
