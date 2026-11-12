// Milimetrik Park — bölüm kayıt defteri: kariyer bölgeleri, sınavlar, antrenman, vale, günlük görev.
// Açılar derece: 0 doğu (sağ), 90 güney (aşağı), -90 kuzey (yukarı). Ölçüler metre.
import zone1 from './zone1.js';
import zone2 from './zone2.js';
import zone3 from './zone3.js';
import zone4 from './zone4.js';
import zone5 from './zone5.js';
import zone6 from './zone6.js';
import { EXAMS } from './exam.js';
import { PLAYGROUND, VALET_LOT } from './extra.js';
import { dailyLevel } from '../modes/daily.js';

export const ZONES = [
  { id: 'mahalle', name: 'Mahalle', env: 'day', color: '#5fb85a', desc: 'Temel manevralar: dik, açılı, garaj.', stars: 0, levels: zone1 },
  { id: 'sehir', name: 'Şehir', env: 'day', color: '#2f7bff', desc: 'Trafikte paralel park, yokuş, kavşak.', stars: 8, levels: zone2 },
  { id: 'otopark', name: 'Katlı Otopark', env: 'indoor', color: '#9aa3ab', desc: 'Kolonlar, rampalar, kalabalık.', stars: 18, levels: zone3 },
  { id: 'gece', name: 'Gece', env: 'night', color: '#7b6be0', desc: 'Farlar, lambalar, benzinlik.', stars: 30, levels: zone4 },
  { id: 'yagmur', name: 'Yağmur', env: 'rain', color: '#3fa7c9', desc: 'Kaygan zemin, minibüs.', stars: 44, levels: zone5 },
  { id: 'liman', name: 'Liman', env: 'day', color: '#e08a2e', desc: 'Feribot ve römork.', stars: 58, levels: zone6 },
];

export const LEVELS = ZONES.flatMap((z) => z.levels);
export { EXAMS, PLAYGROUND, VALET_LOT };

export function zoneOf(levelId) { return ZONES.find((z) => z.levels.some((l) => l.id === levelId)) || null; }

export function levelById(id) {
  if (id === PLAYGROUND.id) return PLAYGROUND;
  if (id === VALET_LOT.id) return VALET_LOT;
  if (id.startsWith('gunluk-')) return dailyLevel(id.slice(7));
  return LEVELS.find((l) => l.id === id) || EXAMS.find((l) => l.id === id) || null;
}

/** Bir sonraki kariyer bölümü (aynı bölgede ya da sonraki bölgenin ilki). */
export function nextLevel(id) {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
}
