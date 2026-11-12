// Bölge 5 — Yağmur: düşük tutuş, su birikintileri (daha da kaygan), minibüs.
import { makeLevel } from './build.js';
import { lot, lotLamps, street } from './common.js';

const Z = { zone: 'yagmur', env: 'rain' };

export default [
  makeLevel({
    ...Z, id: 'islak-zemin', name: 'Islak Zemin', short: 'Yağmurda burunla', vehicle: 'serce',
    desc: 'Yağmur yağıyor: frenler daha geç tutar, su birikintileri kaygan. Boş yere burnuyla gir.',
    tip: 'Su birikintisinde fren mesafesi uzar; yavaş yaklaş.',
    w: 34, h: 21.5, par: { moves: 1, quality: 85 },
  }, (b) => {
    const r = lot(b, { aisle: 6.8, x0: 2.5, nTop: 11, nBot: 11, topFill: [0, 1, 2, 4, 7, 8, 10], bottomFill: [0, 2, 3, 5, 6, 8, 9], stoppers: true });
    b.puddle(10, r.aisleY + 0.6, 1.6, 0.9, 10).puddle(21, r.aisleY - 0.8, 2.0, 1.0, -15).puddle(28, r.aisleY + 1.2, 1.2, 0.7, 30);
    b.tree(33.3, 10.5, 2.1);
    b.target(r.top[5], { facing: 'nose', idealLong: 0.15 });
    b.start(4.2, r.aisleY, 0);
  }),

  makeLevel({
    ...Z, id: 'dolmus-duragi', name: 'Dolmuş Durağı', short: 'Minibüsle cebe yanaş (Pelikan)', vehicle: 'pelikan',
    desc: 'Pelikan minibüs 5,7 m. Kaldırımdaki dolmuş cebine ileriden yanaş ve kutunun içinde dur. Durakta yolcu var.',
    tip: 'Cebin girişindeki eğimli kaldırıma tekerlek çarptırma; geniş dön.',
    w: 48, h: 23, par: { moves: 2, quality: 85 },
  }, (b) => {
    const W = 48;
    const y0 = 5, y1 = 13;
    b.rect('sidewalk', 0, y0 - 2.2, W, y0).rect('asphalt', 0, y0, W, y1).rect('sidewalk', 0, y1, W, 18.5);
    b.area('asphalt', [[18, y1], [34, y1], [31, 15.6], [21, 15.6]]);
    for (let x = 0, i = 0; x < W; x += 9.6, i++) b.block(x + 0.3, 0, x + 9.3, y0 - 2.2, 'building', { tone: i % 5 });
    for (let x = 0, i = 0; x < W; x += 12, i++) b.block(x + 0.3, 18.5, x + 11.7, 23, 'building', { tone: (i + 2) % 5 });
    b.curb(0, y0, W, y0, -1);
    b.curb(0, y1, 18, y1, 1).curb(18, y1, 21, 15.6, 1).curb(21, 15.6, 31, 15.6, 1).curb(31, 15.6, 34, y1, 1).curb(34, y1, W, y1, 1);
    b.wall(-0.3, y0, -0.3, y1, 0.3, { kind: 'barrier' }).wall(W + 0.3, y0, W + 0.3, y1, 0.3, { kind: 'barrier' });
    b.dashed(0, (y0 + y1) / 2, W, (y0 + y1) / 2);
    b.symbol(26, 14.3, 0, 'dolmus', { s: 1.1 });
    b.block(22, 16.4, 30, 17.0, 'box');
    b.puddle(14, y1 - 1.2, 1.4, 0.8).puddle(38, y1 - 1.0, 1.8, 0.8).puddle(25, y0 + 1.8, 1.5, 0.7);
    for (const x of [8, 40]) b.tree(x, 16.6, 1.6);
    b.peds([[-2, 17.2], [26, 17.2], [26, 16.2]], { every: [8, 14], initial: 1 });
    b.peds([[W + 2, 17.6], [-2, 17.6]], { every: [9, 15], initial: 1 });
    b.traffic([[W + 8, y0 + 2], [-8, y0 + 2]], { speed: 7, every: [7, 12], initial: 1 });
    b.traffic([[-8, y1 - 2], [W + 8, y1 - 2]], { speed: 6, every: [18, 28], initial: 0, delay: 14 });
    b.target({ x: 26, y: 14.3, a: 0, l: 9.0, w: 2.6 }, { facing: 'nose', kind: 'bay' });
    b.start(5, y1 - 2, 0);
  }),

  makeLevel({
    ...Z, id: 'okul-servisi', name: 'Okul Servisi', short: 'Minibüsü geri yanaştır (Pelikan)', vehicle: 'pelikan',
    desc: 'Okul bahçesindeki servis yerlerinden birine minibüsü geri geri park et. Yerler 3,2 × 7 m; iki yanda servis araçları.',
    tip: 'Uzun dingil mesafesi = geniş dönüş. Yeri iyice geç, sonra geri gir.',
    w: 42, h: 28, par: { moves: 2, quality: 85 },
  }, (b) => {
    const r = lot(b, { bayW: 3.2, bayL: 7.0, aisle: 9, x0: 3.5, nTop: 11, nBot: 11, topFill: [0, 1, 2, 3, 5, 6, 8, 9, 10], bottomFill: [0, 1, 3, 4, 5, 7, 8, 9], models: ['minibus', 'van', 'minibus'] });
    b.puddle(14, r.aisleY + 1.5, 2.2, 1.0, 5).puddle(30, r.aisleY - 1.2, 1.6, 0.8, -10);
    b.label(39, r.aisleY, 90, 'SERVİS', { size: 0.8 });
    b.target(r.top[4], { facing: 'tail' });
    b.start(4.4, r.aisleY, 0);
  }),

  makeLevel({
    ...Z, id: 'su-birikintisi', name: 'Su Birikintisi', short: 'Kaygan yolda paralel', vehicle: 'serce',
    desc: 'Yağmurda paralel park. Boşluğun önünde büyük bir su birikintisi var; frende araç kayabilir.',
    tip: 'Birikintinin üstünde durmak yerine öncesinde yavaşla.',
    w: 44, h: 22, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 44;
    const { y0, y1 } = street(b, { y0: 5, width: 10, tone: 4 });
    b.dashed(0, (y0 + y1) / 2, W, (y0 + y1) / 2);
    b.line(0, y0 + 2.2, W, y0 + 2.2, { w: 0.1 });
    const box = b.parallelBays({ x: 5.0, y: y1 - 1.1, ang: 0, n: 6, l: 6.2, w: 2.2, outer: -1 });
    for (const i of [0, 1, 2, 4, 5]) b.fill(box[i], { facing: 'nose', models: ['hatch', 'sedan', 'suv'] });
    for (const x of [4, 10, 16.5, 23, 29.5, 36, 41.5]) b.parked(x, y0 + 1.1, 180, { models: ['hatch', 'sedan', 'suv', 'van'] });
    b.puddle(25, y1 - 3.2, 2.4, 1.1).puddle(19, y1 - 1.0, 1.2, 0.6).puddle(10, y0 + 3.6, 2.0, 0.9);
    for (const x of [7, 20, 33]) b.tree(x, y1 + 1.8, 1.6);
    b.traffic([[W + 8, y0 + 3.5], [-8, y0 + 3.5]], { speed: 7, every: [6, 10], initial: 1 });
    b.traffic([[-8, y1 - 3.4], [W + 8, y1 - 3.4]], { speed: 5.5, every: [16, 26], initial: 0, delay: 12 });
    b.target(box[3], { facing: 'nose' });
    b.start(5.0, y1 - 3.4, 0);
  }),

  makeLevel({
    ...Z, id: 'yagmurlu-yokus', name: 'Yağmurlu Yokuş', short: 'Islak yokuşta paralel (Martı)', vehicle: 'marti',
    desc: 'Yokuş aşağı inen ıslak sokakta sola paralel park et. Islak yokuşta frenler daha zor tutar.',
    tip: 'Yokuş aşağı giderken kol hafif olsun; araç kendiliğinden hızlanır.',
    w: 44, h: 22, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 44;
    const { y0, y1 } = street(b, { y0: 5, width: 9.6, slope: { dir: 0, grade: 0.08 }, tone: 0 });
    b.line(0, y1 - 2.2, W, y1 - 2.2, { w: 0.1 });
    // tek yönlü batıdan doğuya, park şeridi kuzeyde (solda)
    const box = b.parallelBays({ x: 5.2, y: y0 + 1.1, ang: 0, n: 6, l: 6.4, w: 2.2, outer: 1 });
    for (const i of [0, 1, 2, 4, 5]) b.fill(box[i], { facing: 'nose', models: ['hatch', 'sedan', 'suv'] });
    for (const x of [4, 10, 16.5, 23, 29.5, 36, 41.5]) b.parked(x, y1 - 1.1, 0, { models: ['hatch', 'sedan', 'van'] });
    b.puddle(26, y0 + 3.3, 1.8, 0.8).puddle(12, y1 - 3.3, 1.5, 0.7);
    b.label(39, (y0 + y1) / 2, 0, '%8 ↓', { size: 0.8 });
    b.arrow(9, (y0 + y1) / 2, 0).arrow(34, (y0 + y1) / 2, 0);
    b.traffic([[-8, (y0 + y1) / 2], [W + 8, (y0 + y1) / 2]], { speed: 5, every: [18, 28], initial: 0, delay: 14 });
    b.target(box[3], { facing: 'nose' });
    b.start(5.0, (y0 + y1) / 2, 0);
  }),

  makeLevel({
    ...Z, id: 'firtina', name: 'Fırtına', short: 'Gece + yağmur (Baykuş)', vehicle: 'baykus', env: 'storm',
    desc: 'Gece fırtına var. Sundurmanın altında, minibüsün yanındaki kolon dibi yere SUV\'yi geri geri park et.',
    tip: 'Kolon sağ arka köşene yakın: sensör çizgisi kırmızıya dönünce dur, düzelt.',
    w: 38, h: 24, par: { moves: 2, quality: 85 },
  }, (b) => {
    const r = lot(b, { aisle: 7.2, x0: 3.5, bayW: 2.7, nTop: 11, nBot: 11, topFill: [0, 1, 2, 3, 5, 6, 7, 9, 10], bottomFill: [0, 1, 2, 4, 5, 6, 8, 9, 10], models: ['suv', 'van', 'sedan'] });
    b.L.solids = b.L.solids.filter((s) => !(s.kind === 'car' && Math.abs(s.style.x - r.top[3].x) < 1.5 && s.style.y < r.topEnt));
    b.fill(r.top[3], { model: 'minibus', facing: 'nose' });
    for (let k = 0; k <= 11; k += 2) b.pillar(3.5 + k * 2.7, r.topEnt - 0.35, 0.42);
    b.canopy(3, 2.0, 33.5, r.topEnt - 0.1, { color: '#3a3f46' });
    lotLamps(b, r, [9.5, 20.3, 31.1], { r: 8 });
    b.puddle(14, r.aisleY + 0.8, 2.0, 1.0).puddle(25, r.aisleY - 1.0, 1.6, 0.8);
    b.target(r.top[4], { facing: 'tail' });
    b.start(4.5, r.aisleY, 0);
  }),
];
