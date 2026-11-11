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
  const k = first ? 1 : ECONOMY.repeatFactor;   // tekrar: taban ödül ve yolda toplanan kuruş yarıya, skor kuruşu ×repeatScore (kuruş çiftçiliği azalsın)
  const scoreCoins = Math.floor(Math.min(ECONOMY.coinsCap, Math.floor(r.score / ECONOMY.scoreToCoins)) * (first ? 1 : ECONOMY.repeatScore));
  const pickups = Math.round((r.pickups | 0) * k);
  const total = completion + starBonus + scoreCoins + pickups;
  return { total, completion, starBonus, scoreCoins, pickups };
}

/** Yükseltme kademesi maliyeti; level = mevcut kademe (0..3) → bir sonrakinin fiyatı. null = azami. */
export function upgradeCost(level) {
  return level >= ECONOMY.upgradeMaxLevel ? null : ECONOMY.upgradeCost[level];
}
