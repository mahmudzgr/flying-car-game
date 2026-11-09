// Yükseltmeleri araç yapılandırmasına uygular. Saf; arayüz de istatistik göstermek için kullanır.
import { VEHICLES, UPGRADE_EFFECT as E } from '../config.js';

/** @param {string} vehicleId @param {{motor?:number,suspansiyon?:number,lastik?:number}} up @returns {object} etkin araç ayarı (kopya) */
export function effectiveVehicle(vehicleId, up = {}) {
  const base = VEHICLES[vehicleId];
  if (!base) throw new Error(`Bilinmeyen araç: ${vehicleId}`);
  const m = up.motor | 0, s = up.suspansiyon | 0, l = up.lastik | 0;
  return {
    ...base,
    motorTorque: base.motorTorque * (1 + E.motor.torque * m),
    maxWheelSpeed: base.maxWheelSpeed * (1 + E.motor.speed * m),
    freqHz: base.freqHz * (1 + E.suspansiyon.freq * s),
    zeta: base.zeta * (1 + E.suspansiyon.zeta * s),
    travel: base.travel.map((v) => v * (1 + E.suspansiyon.travel * s)),
    grip: base.grip + E.lastik.grip * l,
    softRollingScale: 1 + E.lastik.softRolling * l,   // kum/çamur yuvarlanma direnci çarpanı
  };
}
