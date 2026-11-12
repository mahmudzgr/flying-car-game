// Milimetrik Park — başarımlar. check(save.data, ctx) → true ise kazanılır (bir kez).
import { ZONES, EXAMS } from './levels/index.js';
import { VEHICLE_ORDER } from './config.js';

const zoneDone = (d, id) => ZONES.find((z) => z.id === id).levels.every((L) => d.levels[L.id]?.stars[0]);
const count = (d, i) => Object.entries(d.levels).filter(([k, r]) => !k.startsWith('sinav') && r.stars[i]).length;
const stars = (d) => Object.values(d.levels).reduce((n, r) => n + r.stars.filter(Boolean).length, 0);

export const ACHIEVEMENTS = [
  { id: 'ilk', name: 'İlk park', desc: 'Bir bölümü bitir.', check: (d) => d.stats.parks >= 1 },
  { id: 'milimetrik', name: 'Milimetrik!', desc: '%95+ isabetle park et.', check: (d) => d.stats.perfect >= 1 },
  { id: 'cerrah', name: 'Cerrah eli', desc: '10 kez %95+ isabet.', check: (d) => d.stats.perfect >= 10 },
  { id: 'kusursuz', name: 'Kusursuz sürücü', desc: '10 bölümü hasarsız bitir.', check: (d) => count(d, 1) >= 10 },
  { id: 'usta', name: 'Usta', desc: '18 "Usta" yıldızı topla.', check: (d) => count(d, 2) >= 18 },
  { id: 'yildiz50', name: 'Yıldız avcısı', desc: '50 yıldız topla.', check: (d) => stars(d) >= 50 },
  { id: 'yildiz100', name: 'Takımyıldız', desc: '100 yıldız topla.', check: (d) => stars(d) >= 100 },
  { id: 'mahalle', name: 'Mahallenin delikanlısı', desc: 'Mahalle bölgesini bitir.', check: (d) => zoneDone(d, 'mahalle') },
  { id: 'sehir', name: 'Şehirli', desc: 'Şehir bölgesini bitir.', check: (d) => zoneDone(d, 'sehir') },
  { id: 'otopark', name: 'Kolon dostu', desc: 'Katlı Otopark bölgesini bitir.', check: (d) => zoneDone(d, 'otopark') },
  { id: 'gece', name: 'Gece kuşu', desc: 'Gece bölgesini bitir.', check: (d) => zoneDone(d, 'gece') },
  { id: 'yagmur', name: 'Yağmur adamı', desc: 'Yağmur bölgesini bitir.', check: (d) => zoneDone(d, 'yagmur') },
  { id: 'kaptan', name: 'Kaptan', desc: 'Liman bölgesini bitir.', check: (d) => zoneDone(d, 'liman') },
  { id: 'vale10', name: 'Vale çırağı', desc: 'Bir vardiyada 10 araç park et.', check: (d) => d.valet.bestCars >= 10 },
  { id: 'vale20', name: 'Vale şefi', desc: 'Bir vardiyada 20 araç park et.', check: (d) => d.valet.bestCars >= 20 },
  { id: 'gunluk7', name: 'Alışkanlık', desc: '7 gün üst üste günlük görev.', check: (d) => d.daily.streak >= 7 },
  { id: 'ehliyet', name: 'Ehliyetli', desc: 'Bir sınavı geç.', check: (d) => EXAMS.some((e) => d.levels[e.id]?.stars[0]) },
  { id: 'tum-siniflar', name: 'Her sınıf', desc: 'B, D1 ve BE sınavlarının hepsini geç.', check: (d) => EXAMS.every((e) => d.levels[e.id]?.stars[0]) },
  { id: 'koleksiyon', name: 'Garaj dolu', desc: 'Bütün araçlara sahip ol.', check: (d) => VEHICLE_ORDER.every((v) => d.vehicles.owned.includes(v)) },
  { id: 'boyaci', name: 'Boyacı', desc: '5 boya satın al.', check: (d) => d.paintsOwned.length >= 5 },
];

/** Yeni kazanılan başarımları işaretler ve döndürür. */
export function checkAchievements(data) {
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (data.achievements[a.id]) continue;
    try { if (a.check(data)) { data.achievements[a.id] = Date.now(); out.push(a); } } catch { /* yoksay */ }
  }
  return out;
}
