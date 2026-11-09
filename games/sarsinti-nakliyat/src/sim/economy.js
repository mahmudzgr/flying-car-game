// Kuruş hesapları (TASARIM §8.3–8.4). Saf; arayüz/kayıt kullanır.
import { ECONOMY } from '../config.js';

/**
 * Bölüm sonu kuruş ödülü.
 * @param {{base:number}} levelReward  bölümün `reward` alanı
 * @param {{score:number, stars:number, pickups:number}} r  levelEnd özeti (pickups = yolda toplanan kuruş toplamı)
 * @param {number} prevStars  bu bölümde daha önce kazanılmış en yüksek yıldız (0 = hiç bitirilmedi)
 * @returns {{total:number, completion:number, starBonus:number, scoreCoins:number, pickups:number}}
 */
export function levelReward(levelReward, r, prevStars) {
  const first = prevStars === 0;
  const completion = Math.round(levelReward.base * (first ? 1 : ECONOMY.repeatFactor));
  let starBonus = 0;
  for (let s = prevStars + 1; s <= r.stars; s++) starBonus += ECONOMY.starBonus[s - 1];
  const scoreCoins = Math.min(ECONOMY.coinsCap, Math.floor(r.score / ECONOMY.scoreToCoins));
  const total = completion + starBonus + scoreCoins + (r.pickups | 0);
  return { total, completion, starBonus, scoreCoins, pickups: r.pickups | 0 };
}

/** Yükseltme kademesi maliyeti; level = mevcut kademe (0..3) → bir sonrakinin fiyatı. null = azami. */
export function upgradeCost(level) {
  return level >= ECONOMY.upgradeMaxLevel ? null : ECONOMY.upgradeCost[level];
}
