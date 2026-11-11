// İlerleme hesapları (yıldız toplamı, kilitler, araç satın alma). Saf; UI ve dev sayfası kullanır. Sahip: Arayüz.
import { VEHICLES, VEHICLE_ORDER, ECONOMY, UPGRADE_LINES, REGIONS } from '../config.js';
import { upgradeCost } from '../sim/economy.js';
import { planCargo } from '../sim/cargoPlan.js';

export const totalStars = (d) => Object.values(d.levels ?? {}).reduce((a, l) => a + (l?.stars | 0), 0);
export const regionOf = (id) => REGIONS.find((r) => r.id === id) ?? REGIONS[0];

/** Bölüm kilidi: bölge yıldız şartı + önceki bölümden ≥1★. */
export function levelLock(d, levels, level) {
  const reg = regionOf(level.region ?? 1);
  const stars = totalStars(d);
  if (stars < reg.unlockStars) return { locked: true, why: 'region', need: reg.unlockStars, have: stars, text: `${reg.unlockStars}★ gerekli (${stars}/${reg.unlockStars})` };
  const i = levels.findIndex((l) => l.id === level.id);
  if (i > 0) {
    const prev = levels[i - 1];
    if (!((d.levels[prev.id]?.stars | 0) >= 1)) return { locked: true, why: 'prev', prev, text: `Önce ${prev.id} ${prev.name}` };
  }
  return { locked: false };
}

/** Oynanacak ilk (en ileri) bölüm: bitirilmemiş ilk açık bölüm, yoksa sonuncu. */
export function nextPlayable(d, levels) {
  for (const l of levels) { if (!levelLock(d, levels, l).locked && !((d.levels[l.id]?.stars | 0) >= 1)) return l; }
  return levels[levels.length - 1];
}

export const vehicleState = (d, id) => d.vehicles[id] ?? { owned: false, up: {} };
export const spentOn = (d, id) => {
  const up = vehicleState(d, id).up ?? {};
  let sum = 0;
  for (const line of UPGRADE_LINES) for (let k = 0; k < (up[line] | 0); k++) sum += upgradeCost(k) ?? 0;
  return sum;
};

/** Araç kilidini açma: yıldız + kuruş. */
export function unlockCheck(d, id) {
  const v = VEHICLES[id], u = v.unlock;
  const stars = totalStars(d);
  return { okStars: stars >= u.stars, okCoins: d.coins >= u.coins, stars, need: u }; 
}
export function buyVehicle(save, id) {
  const c = unlockCheck(save.data, id);
  if (!VEHICLES[id].implemented || save.data.vehicles[id].owned || !c.okStars || !c.okCoins) return false;
  save.update((d) => { d.coins -= VEHICLES[id].unlock.coins; d.vehicles[id].owned = true; });
  return true;
}
/** Yükseltme: bir sonraki kademe. Dönüş: {cost, level} ya da null. */
export function buyUpgrade(save, id, line) {
  const rec = save.data.vehicles[id];
  const lvl = rec?.up?.[line] | 0;
  const cost = upgradeCost(lvl);
  if (!rec?.owned || cost == null || save.data.coins < cost) return null;
  save.update((d) => { d.coins -= cost; d.vehicles[id].up[line] = lvl + 1; });
  return { cost, level: lvl + 1 };
}
/** Ücretsiz sıfırlama: harcananın tamamı (ECONOMY.resetRefund) iade. */
export function resetUpgrades(save, id) {
  const refund = Math.round(spentOn(save.data, id) * ECONOMY.resetRefund);
  if (refund <= 0) return 0;
  save.update((d) => { d.coins += refund; for (const l of UPGRADE_LINES) d.vehicles[id].up[l] = 0; });
  return refund;
}
export const ownedVehicles = (d) => VEHICLE_ORDER.filter((id) => d.vehicles[id]?.owned && VEHICLES[id].implemented);

// --- Araca göre etkin kargo/teslim gereksinimi: sim ile AYNI kaynak (sim/cargoPlan.js) ---
export const cargoPlan = (level, vehicleId) => planCargo(level, vehicleId);
export const cargoTotal = (level) => (level.cargo ?? []).reduce((a, c) => a + (c.count ?? 1), 0);
