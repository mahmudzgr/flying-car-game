// Vale modu oturumu (DOM'suz): süre, müşteri araçları, dolan otopark ve puan.
// Her müşteri için vale otoparkının bir kopyası kurulur: önceki park edilen araçlar katı engel olarak eklenir,
// dolu yerler hedef olmaktan çıkar. Oyun (sim/game.js) her araç için yeniden oluşturulur.
import { VALET_LOT } from '../levels/extra.js';
import { VEHICLES, COLORS, ECONOMY } from '../config.js';
import { rng } from '../levels/build.js';

export const VALET_TIME = 150;
export const VALET_BONUS = 20;

export function createValetSession(seed = Date.now()) {
  const r = rng(seed >>> 0);
  const parked = [];                 // vale tarafından park edilen araçlar (katı engel)
  const occupied = new Set();        // dolan hedef yer indeksleri
  const s = {
    timeLeft: VALET_TIME,
    score: 0,
    cars: 0,
    failed: 0,
    tips: 0,
    customer: null,
    over: false,
    log: [],

    /** Sıradaki müşteri: {level, vehicle, color} */
    next() {
      const vehicle = ['kumru', 'serce', 'serce', 'marti', 'baykus'][Math.floor(r() * 5)];
      const color = COLORS.parked[Math.floor(r() * COLORS.parked.length)];
      const spots = VALET_LOT.spots.map((sp, i) => (occupied.has(i) ? { ...sp, target: false } : sp));
      const level = { ...VALET_LOT, spots, solids: [...VALET_LOT.solids, ...parked], start: { ...VALET_LOT.start, x: VALET_LOT.start.x + (r() - 0.5) * 0.3 } };
      s.customer = { vehicle, color, t0: VALET_TIME - s.timeLeft };
      return { level, vehicle, color };
    },

    tick(dt) {
      if (s.over) return;
      s.timeLeft -= dt;
      if (s.timeLeft <= 0) { s.timeLeft = 0; s.over = true; }
    },

    /** Park başarılı: araç otoparkta kalır; puan ve bahşiş. */
    parkedCar(game) {
      const res = game.result;
      const idx = VALET_LOT.spots.indexOf(res.spot);
      if (idx >= 0) occupied.add(idx);
      const b = game.body, sh = b.shapes[0], g = game.car.geom;
      const cx = b.x + Math.cos(b.a) * g.gcx, cy = b.y + Math.sin(b.a) * g.gcx;
      parked.push({ kind: 'car', shape: 'poly', verts: Array.from({ length: sh.n }, (_, i) => [sh.wx[i], sh.wy[i]]), style: { model: VEHICLES[game.vehicleId].model, color: s.customer.color, x: cx, y: cy, a: b.a, len: g.length, wid: g.width } });
      const t = VALET_TIME - s.timeLeft - s.customer.t0;
      const pts = Math.max(10, Math.round(100 + res.quality + Math.max(0, 40 - t) * 2 - res.damage * 2));
      const tip = Math.round(ECONOMY.valetPerCar + res.quality * ECONOMY.valetQuality * (res.damage > 0 ? 0.5 : 1));
      s.score += pts; s.cars++; s.tips += tip;
      s.timeLeft += VALET_BONUS;
      s.log.push({ vehicle: game.vehicleId, quality: res.quality, time: t, damage: res.damage, pts, tip });
      return { pts, tip };
    },

    /** Araç hasarla bitti ya da müşteri vazgeçti: süre cezası. */
    failedCar() { s.failed++; s.timeLeft = Math.max(0, s.timeLeft - 15); if (s.timeLeft <= 0) s.over = true; },

    freeSpots() { return VALET_LOT.spots.length - occupied.size; },
  };
  return s;
}
