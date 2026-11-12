// Bölge 2 — Şehir (gündüz, trafik): paralel park, yokuş, durak, kavşak.
import { makeLevel } from './build.js';
import { lot, street } from './common.js';

const Z = { zone: 'sehir', env: 'day' };

export default [
  makeLevel({
    ...Z, id: 'paralel', name: 'Paralel Park', short: 'Kaldırıma paralel', vehicle: 'serce',
    desc: 'Sağdaki boş kutuya geri geri paralel park et. Yol yönünde dur, kaldırıma ~20 cm yanaş. Trafik akıyor.',
    tip: 'Öndeki aracın hizasında dur, geri vitese geç, sağa kır; araç ~45° olunca sola kırarak içeri gir.',
    w: 44, h: 18, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 44;
    b.rect('sidewalk', 0, 1.2, W, 3.0).rect('asphalt', 0, 3.0, W, 13.0).rect('sidewalk', 0, 13.0, W, 15.6);
    for (let x = 0; x < W; x += 8.8) b.block(x + 0.2, 0, x + 8.6, 1.2, 'building', { tone: (x / 8.8) % 3 });
    for (let x = 0; x < W; x += 11) b.block(x + 0.3, 15.6, x + 10.7, 18, 'building', { tone: 1 + (x / 11) % 3 });
    b.curb(0, 3.0, W, 3.0, -1).curb(0, 13.0, W, 13.0, 1);
    b.wall(-0.3, 3, -0.3, 13, 0.3, { kind: 'barrier' }).wall(W + 0.3, 3, W + 0.3, 13, 0.3, { kind: 'barrier' });
    b.dashed(0, 8.1, W, 8.1).line(0, 5.2, W, 5.2, { w: 0.1 });
    const box = b.parallelBays({ x: 5.0, y: 11.9, ang: 0, n: 7, l: 6.0, w: 2.2, outer: -1 });
    for (const i of [0, 1, 2, 4, 5, 6]) b.fill(box[i], { facing: 'nose', models: ['hatch', 'sedan', 'suv', 'mini'] });
    for (const x of [3.5, 9.6, 15.2, 21.4, 27.2, 33.6, 39.8]) b.parked(x, 4.1, 180, { models: ['hatch', 'sedan', 'suv', 'van'] });
    for (const x of [7, 18.5, 31, 40]) b.tree(x, 14.6, 1.9);
    b.post(25.2, 13.55, 0.12, 'lamp');
    b.arrow(12, 9.45, 0).arrow(36, 9.45, 0).arrow(30, 6.65, 180).arrow(6, 6.65, 180);
    b.traffic([[W + 8, 6.65], [-8, 6.65]], { speed: 7, every: [6, 11], initial: 1 });
    b.traffic([[-8, 9.45], [W + 8, 9.45]], { speed: 6, every: [16, 26], initial: 0, delay: 12 });
    b.peds([[-2, 14.0], [W + 2, 14.0]], { every: [8, 14], initial: 1 });
    b.target(box[3], { facing: 'nose' });
    b.start(6.0, 9.45, 0);
  }),

  makeLevel({
    ...Z, id: 'sikisik', name: 'Sıkışık Sokak', short: '5,4 m boşluğa paralel', vehicle: 'serce',
    desc: 'Tek yönlü dar sokakta iki araç arasındaki 5,4 m\'lik boşluğa paralel park et. Arkandan araç gelirse bekler, korna çalar.',
    tip: 'Birkaç hamle normal. Kaldırımdaki direğe ve ağaçlara arka köşe taşabilir, dikkat.',
    w: 40, h: 16, par: { moves: 4, quality: 85 },
  }, (b) => {
    const W = 40;
    b.rect('sidewalk', 0, 0.8, W, 3.0).rect('asphalt', 0, 3.0, W, 11.0).rect('sidewalk', 0, 11.0, W, 13.6);
    for (let x = 0; x < W; x += 10) b.block(x + 0.2, 0, x + 9.8, 0.8, 'building', { tone: (x / 10) % 3 });
    for (let x = 0; x < W; x += 8) b.block(x + 0.2, 13.6, x + 7.8, 16, 'building', { tone: 2 - (x / 8) % 3 });
    b.curb(0, 3.0, W, 3.0, -1).curb(0, 11.0, W, 11.0, 1);
    b.wall(-0.3, 3, -0.3, 11, 0.3, { kind: 'barrier' }).wall(W + 0.3, 3, W + 0.3, 11, 0.3, { kind: 'barrier' });
    const south = [[3.1, 'sedan'], [8.45, 'hatch'], [13.3, 'mini'], [17.6, 'sedan'], [27.4, 'hatch'], [32.95, 'van'], [38.1, 'mini']];
    for (const [x, model] of south) b.parked(x, 9.92, 0, { model, jitter: 0.25 });
    for (const x of [3.8, 9.4, 15.1, 20.6, 26.4, 31.9, 37.3]) b.parked(x, 4.05, 0, { models: ['hatch', 'sedan', 'suv', 'mini'] });
    for (const x of [6, 13.5, 30.5, 37]) b.tree(x, 12.4, 1.7);
    b.post(21.3, 11.75, 0.13, 'lamp');
    b.arrow(6, 7.0, 0).arrow(30, 7.0, 0);
    b.traffic([[-8, 7.0], [W + 8, 7.0]], { speed: 5, every: [18, 30], initial: 0, delay: 15 });
    b.target({ x: 22.6, y: 9.95, a: 0, l: 5.3, w: 2.1, parallel: true }, { facing: 'nose', idealLat: -0.04 });
    b.start(5.0, 7.0, 0);
  }),

  makeLevel({
    ...Z, id: 'uzun-kuyruk', name: 'Uzun Kuyruk', short: 'Sedanla duvara geri (Martı)', vehicle: 'marti',
    desc: 'Martı sedanın arkası uzun. Ofis otoparkında duvara dayalı 5,2 m\'lik yere geri geri gir; duvara değmeden çizgilerin içinde kal.',
    tip: 'Arka sensör 30 cm\'de sürekli öter. Duvara yaklaşınca kolu çok az geri çek.',
    w: 36, h: 21, par: { moves: 2, quality: 85 },
  }, (b) => {
    const r = lot(b, { y0: 2.4, bayW: 2.6, bayL: 5.2, aisle: 6.6, x0: 3.0, nTop: 11, nBot: 11, topFill: [0, 1, 3, 4, 6, 7, 9, 10], bottomFill: [0, 1, 2, 4, 5, 6, 8, 9, 10], models: ['sedan', 'suv', 'hatch', 'sedan'] });
    b.L.solids = b.L.solids.filter((s) => !(s.kind === 'hedge' && s.verts[0][1] === 0 && s.verts[2][1] < 2));
    b.block(1.5, 0, 34.5, 2.55, 'building', { tone: 1 });
    b.label(18, 1.2, 0, 'OFİS', { size: 1 });
    b.target(r.top[5], { facing: 'tail' });
    b.start(4.4, r.aisleY, 0);
  }),

  makeLevel({
    ...Z, id: 'yokus', name: 'Yokuş', short: '%9 yokuşta paralel', vehicle: 'serce',
    desc: 'Yokuş yukarı giden sokakta sağa paralel park et. Yokuşta araç geri kaçar: durunca fren tutar, kalkarken biraz daha gaz gerekir.',
    tip: 'Yokuş aşağı geri giderken araç kendiliğinden hızlanmak ister; kolu az çek.',
    w: 42, h: 21, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 42;
    const { y0, y1 } = street(b, { y0: 5, width: 9.6, slope: { dir: 180, grade: 0.09 }, tone: 1 });
    b.dashed(0, (y0 + y1) / 2, W, (y0 + y1) / 2);
    b.line(0, y0 + 2.2, W, y0 + 2.2, { w: 0.1 });
    const box = b.parallelBays({ x: 5.0, y: y1 - 1.1, ang: 0, n: 6, l: 6.2, w: 2.2, outer: -1 });
    for (const i of [0, 1, 2, 4, 5]) b.fill(box[i], { facing: 'nose', models: ['hatch', 'sedan', 'mini'] });
    for (const x of [4, 10, 16.5, 23, 29.5, 36]) b.parked(x, y0 + 1.1, 180, { models: ['hatch', 'sedan', 'suv', 'van'] });
    for (const x of [8, 21, 34]) b.tree(x, y1 + 1.8, 1.6);
    b.label(38, (y0 + y1) / 2 + 1.4, 0, '%9 ↑', { size: 0.8 });
    b.traffic([[W + 8, y0 + 3.5], [-8, y0 + 3.5]], { speed: 7, every: [7, 12], initial: 1 });
    b.traffic([[-8, y1 - 3.4], [W + 8, y1 - 3.4]], { speed: 5, every: [18, 28], initial: 0, delay: 14 });
    b.target(box[3], { facing: 'nose' });
    b.start(5.0, y1 - 3.4, 0);
  }),

  makeLevel({
    ...Z, id: 'otobus-duragi', name: 'Otobüs Durağı', short: 'Durak ile araç arasına (Martı)', vehicle: 'marti',
    desc: 'Taralı otobüs durağı ile park etmiş araç arasındaki 6 m\'lik kutuya paralel gir. Durakta yolcular bekliyor; yangın musluğuna dikkat.',
    tip: 'Uzun sedanla 3 hamle normaldir. Arka köşe kaldırıma taşarken musluğu kolla.',
    w: 44, h: 22, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 44;
    const { y0, y1 } = street(b, { y0: 5, width: 10, tone: 3 });
    b.dashed(0, (y0 + y1) / 2, W, (y0 + y1) / 2);
    b.line(0, y0 + 2.2, W, y0 + 2.2, { w: 0.1 }).line(0, y1 - 2.2, 25.9, y1 - 2.2, { w: 0.1 });
    b.hatch(26, y1 - 2.6, 39, y1, { color: 'yellow' });
    b.symbol(32.5, y1 - 1.3, 0, 'bus', { s: 1.2 });
    b.block(28, y1 + 1.4, 35, y1 + 2.2, 'box');
    b.target({ x: 22.4, y: y1 - 1.1, a: 0, l: 6.0, w: 2.2, parallel: true }, { facing: 'nose' });
    b.line(19.4, y1 - 2.2, 19.4, y1).line(25.4, y1 - 2.2, 25.4, y1);
    for (const [x, m] of [[3.5, 'hatch'], [9, 'sedan'], [15.0, 'sedan']]) b.parked(x, y1 - 1.1, 0, { model: m, jitter: 0.3 });
    b.parked(41.5, y1 - 1.1, 0, { model: 'mini' });
    for (const x of [4, 10, 16, 22.5, 29, 35, 41]) b.parked(x, y0 + 1.1, 180, { models: ['hatch', 'sedan', 'suv'] });
    b.hydrant(19.6, y1 + 0.45);
    b.tree(8, y1 + 1.9, 1.6).tree(40, y1 + 1.9, 1.6);
    b.peds([[-2, y1 + 0.9], [W + 2, y1 + 0.9]], { every: [6, 10], initial: 1 });
    b.peds([[W + 2, y1 + 1.0], [33, y1 + 1.0], [33, y1 + 0.95]], { every: [10, 16], initial: 1 });
    b.traffic([[W + 8, y0 + 3.4], [-8, y0 + 3.4]], { speed: 7, every: [6, 10], initial: 1 });
    b.traffic([[-8, y1 - 3.5], [W + 8, y1 - 3.5]], { speed: 5.5, every: [16, 26], initial: 0, delay: 12 });
    b.start(4.0, y1 - 3.5, 0);
  }),

  makeLevel({
    ...Z, id: 'kavsak', name: 'Kavşak', short: 'Ara sokağa dön, geri park', vehicle: 'serce',
    desc: 'Ana caddeden sağdaki ara sokağa dön, yolun sağındaki dik park yerlerinden birine geri geri gir. Kavşakta trafik ve yaya geçidi var.',
    tip: 'Dönmeden önce yaya geçidini kontrol et. Ara sokaktan gelen araçlar sen bitirene kadar bekler.',
    w: 42, h: 33, par: { moves: 2, quality: 85 },
  }, (b) => {
    const W = 42, H = 33;
    b.rect('sidewalk', 0, 1.8, W, 4).rect('asphalt', 0, 4, W, 12);
    b.rect('sidewalk', 0, 12, 26, 15.2).rect('asphalt', 26, 12, 33, H).rect('asphalt', 20.8, 15.2, 26, 31.2);
    b.rect('sidewalk', 0, 15.2, 20.8, H).rect('sidewalk', 33, 12, 35.5, H);
    for (let x = 0, i = 0; x < W; x += 10, i++) b.block(x + 0.3, 0, x + 9.7, 1.8, 'building', { tone: i % 5 });
    b.block(0.5, 17, 19.2, H, 'building', { tone: 2 }).block(36, 13.5, W, H, 'building', { tone: 4 });
    b.curb(0, 4, W, 4, -1);
    b.curb(0, 12, 26, 12, 1).curb(33, 12, W, 12, 1);
    b.curb(26, 12, 26, 15.2, 1).curb(26, 31.2, 26, H, 1);
    b.curb(33, 12, 33, H, -1);
    b.curb(20.8, 15.2, 20.8, 31.2, 1).curb(20.8, 15.2, 26, 15.2, -1).curb(20.8, 31.2, 26, 31.2, 1);
    b.wall(-0.3, 4, -0.3, 12, 0.3, { kind: 'barrier' }).wall(W + 0.3, 4, W + 0.3, 12, 0.3, { kind: 'barrier' }).wall(26, H + 0.3, 33, H + 0.3, 0.3, { kind: 'barrier' });
    b.dashed(0, 8, 26, 8).dashed(33, 8, W, 8);
    b.dashed(29.5, 16, 29.5, H);
    b.crosswalk(26, 12.4, 33, 14.8, true);
    const bays = b.bays({ x: 23.4, y: 16.5, ang: 180, n: 6, w: 2.4, l: 5.2, side: -1 });
    for (const i of [0, 1, 3, 5]) b.fill(bays[i], { facing: 'rand' });
    b.lamp(33.4, 14, { arm: 180 });
    b.tree(10, 13.8, 1.5);
    b.arrow(10, 10, 0).arrow(16, 6, 180).arrow(27.75, 20, 90).arrow(31.25, 26, -90);
    b.peds([[-2, 13.5], [26, 13.5], [33, 13.5], [W + 2, 13.5]], { every: [7, 12], initial: 1 });
    b.peds([[34.2, H + 2], [34.2, 12.8], [W + 2, 12.8]], { every: [10, 16], initial: 0, delay: 4 });
    b.traffic([[W + 8, 6], [-8, 6]], { speed: 8, every: [6, 10], initial: 1 });
    b.traffic([[-8, 10], [W + 8, 10]], { speed: 7, every: [14, 22], initial: 0, delay: 10 });
    b.traffic([[31.25, H + 8], [31.25, 10.5], [24, 6], [-8, 6]], { speed: 5, every: [14, 22], initial: 0, delay: 6 });
    b.target(bays[2], { facing: 'tail' });
    b.start(5.0, 10.0, 0);
  }),
];
