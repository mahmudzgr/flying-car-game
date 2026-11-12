// Bölge 1 — Mahalle (gündüz): temel manevralar.
import { makeLevel } from './build.js';
import { openLot, lot, street } from './common.js';

const Z = { zone: 'mahalle', env: 'day' };

export default [
  makeLevel({
    ...Z, id: 'ilk-park', name: 'İlk Park', short: 'Burunla dik park', vehicle: 'serce',
    desc: 'Boş yere burnuyla gir. Tekerlekler takoza değince dur ve P\'ye al.',
    tip: 'Kolu az itersen araç çok yavaş gider; bırakınca kendiliğinden durur.',
    w: 34, h: 24, par: { moves: 1, quality: 85 },
  }, (b) => {
    const { top, midY } = openLot(b, { topFill: [0, 1, 3, 8, 9], bottomFill: [0, 2, 3, 5, 6, 9, 10] });
    b.target(top[5], { facing: 'nose', idealLong: 0.15 });
    b.start(5.0, midY, 0);
  }),

  makeLevel({
    ...Z, id: 'geri-geri', name: 'Geri Geri', short: 'İki araç arasına geri park', vehicle: 'serce',
    desc: 'İki aracın arasına geri geri park et: yeri biraz geç, dur, geri vitese geç ve direksiyonu kırarak gir.',
    tip: 'Geri giderken arkadaki renkli çizgiler aracın izleyeceği yolu gösterir.',
    w: 34, h: 24, par: { moves: 2, quality: 85 },
  }, (b) => {
    const { top, midY } = openLot(b, { topFill: [0, 2, 3, 5, 7, 9, 10], bottomFill: [0, 1, 2, 4, 5, 6, 7, 9, 10] });
    b.target(top[6], { facing: 'tail', idealLong: 0.15 });
    b.start(4.5, midY, 0);
  }),

  makeLevel({
    ...Z, id: 'capraz', name: 'Çapraz Park', short: '60° açılı park', vehicle: 'serce',
    desc: 'Tek yönlü koridordan 60° açılı yere burnuyla gir.',
    tip: 'Erken dönersen soldaki araca, geç dönersen sağdakine yaklaşırsın.',
    w: 36, h: 21, par: { moves: 1, quality: 85 },
  }, (b) => {
    const W = 36, H = 21;
    b.rect('asphalt', 1.2, 2.0, W - 1.2, H - 2.2);
    b.curb(1.2, 2.0, W - 1.2, 2.0, -1).curb(1.2, H - 2.2, W - 1.2, H - 2.2, 1);
    b.curb(1.2, 2.0, 1.2, H - 2.2, 1).curb(W - 1.2, 2.0, W - 1.2, H - 2.2, -1);
    b.block(0, 0, W, 0.9, 'hedge').block(0, H - 0.9, W, H, 'hedge').block(0, 0, 0.5, H, 'hedge').block(W - 0.5, 0, W, H, 'hedge');
    const aisleTop = 8.0, aisleBot = 12.5;
    const north = b.angledBays({ x: 6.0, y: aisleTop - 2.79, rowAng: 0, ang: -60, n: 9 });
    const south = b.angledBays({ x: 7.5, y: aisleBot + 2.79, rowAng: 0, ang: 60, n: 9 });
    for (const i of [0, 1, 3, 5, 6, 8]) b.fill(north[i], { facing: 'nose' });
    for (const i of [0, 1, 2, 4, 5, 7, 8]) b.fill(south[i], { facing: 'nose' });
    b.arrow(4.5, 10.25, 0).arrow(16, 10.25, 0).arrow(28, 10.25, 0);
    b.label(31.5, 10.25, 90, 'ÇIKIŞ', { size: 0.9 });
    for (let x = 3; x < W; x += 7) b.decor('bush', x, 1.25, { r: 0.85 });
    b.target(north[4], { facing: 'nose' });
    b.start(3.6, 10.25, 0);
  }),

  makeLevel({
    ...Z, id: 'minik-kumru', name: 'Minik Kumru', short: 'Dar yere burunla (Kumru)', vehicle: 'kumru',
    desc: 'Küçük araçlara ayrılmış 2,3 m\'lik yerlerden birine burnuyla gir. Kumru çevik ama yer dar, koridor 5,5 m.',
    tip: 'Dönüşe erken başlama; aracın sağ arka köşesi soldaki araca yaklaşır. Gerekirse bir kez geri gelip düzelt.',
    w: 28, h: 19.5, par: { moves: 2, quality: 85 },
  }, (b) => {
    const r = lot(b, { bayW: 2.3, bayL: 4.6, aisle: 5.5, x0: 2.5, nTop: 10, nBot: 10, topFill: [0, 1, 2, 3, 5, 6, 8, 9], bottomFill: [0, 2, 3, 4, 6, 7, 9], models: ['mini', 'hatch', 'mini'], stoppers: true });
    for (let x = 3; x < 28; x += 5.5) b.decor('bush', x, 0.6, { r: 0.7 });
    b.tree(27.4, 9.5, 2.0);
    b.label(25.5, r.aisleY, 90, 'KÜÇÜK ARAÇ', { size: 0.6 });
    b.target(r.top[4], { facing: 'nose', idealLong: 0.15 });
    b.start(4.4, r.aisleY, 0);
  }),

  makeLevel({
    ...Z, id: 'dar-garaj', name: 'Dar Garaj', short: '3 m garaja geri', vehicle: 'serce',
    desc: 'Garaja geri geri gir; sabah çıkarken kolay olsun. Kapı 3 m, araç 1,78 m.',
    tip: 'Kapıyı geç, aracı çaprazla. Geri giderken sensör bip\'lerinin hızlanmasını izle.',
    w: 36, h: 18, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 36;
    b.rect('sidewalk', 0, 7.0, W, 8.2).rect('asphalt', 0, 8.2, W, 14.6).rect('sidewalk', 0, 14.6, W, 16.2);
    b.rect('concrete', 17.0, 1.0, 20.0, 8.2);
    b.block(16.7, 0.7, 17.0, 7.0, 'wall').block(20.0, 0.7, 20.3, 7.0, 'wall').block(16.7, 0.7, 20.3, 1.0, 'wall');
    b.block(1.0, 0.4, 16.2, 5.4, 'building', { tone: 0, roof: 'tile' });
    b.block(20.8, 0.4, 34.0, 5.4, 'building', { tone: 2, roof: 'tile' });
    b.block(0, 6.6, 16.7, 7.0, 'fence').block(20.3, 6.6, W, 7.0, 'fence');
    b.block(-0.4, 7.0, 0, 16.2, 'barrier').block(W, 7.0, W + 0.4, 16.2, 'barrier');
    b.block(0, 16.2, W, 16.6, 'fence');
    b.curb(0, 8.2, 16.2, 8.2, -1).curb(20.8, 8.2, W, 8.2, -1);
    b.curb(0, 14.6, W, 14.6, 1);
    for (const x of [3.2, 8.4, 27.6, 32.8]) b.parked(x, 13.5, 0, { models: ['hatch', 'sedan', 'suv'] });
    b.tree(12, 3.4, 1.7).tree(24, 15.6, 1.6).tree(5, 15.6, 1.5);
    b.decor('bush', 15.4, 6.0, { r: 0.7 }).decor('bush', 21.6, 6.0, { r: 0.7 });
    b.target({ x: 18.5, y: 3.95, a: -Math.PI / 2, l: 5.5, w: 2.7 }, { facing: 'tail', kind: 'garage' });
    b.start(5.0, 10.6, 0);
  }),

  makeLevel({
    ...Z, id: 'market-onu', name: 'Market Önü', short: 'Yayalar varken paralel', vehicle: 'serce',
    desc: 'Marketin önündeki boş kutuya paralel park et. Kaldırımda ve yaya geçidinde yayalar var; onlara asla çarpma!',
    tip: 'Yaya geçidinde biri varsa bekle. Arkandaki araçlar korna çalabilir; acele etme.',
    w: 42, h: 24, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 42;
    const { y0, y1 } = street(b, { y0: 6.0, width: 9.5, buildings: false });
    b.block(0, 0, 11, 3.8, 'building', { tone: 3 }).block(11.4, 0, 30.6, 3.8, 'building', { tone: 4 }).block(31, 0, W, 3.8, 'building', { tone: 1 });
    b.canopy(13, 3.8, 29, 5.0, { color: '#d9443b', stripe: '#f2f2ef' });
    b.label(21, 2.0, 0, 'MARKET', { size: 1.1 });
    for (let x = 0, i = 0; x < W; x += 10, i++) b.block(x + 0.3, y1 + 2.4, x + 9.7, 24, 'building', { tone: (i + 2) % 5 });
    // tek yönlü (doğuya); iki yanda park şeridi
    b.line(0, y0 + 2.2, 31.5, y0 + 2.2, { w: 0.1 }).line(35.5, y0 + 2.2, W, y0 + 2.2, { w: 0.1 });
    const box = b.parallelBays({ x: 3.5, y: y1 - 1.1, ang: 0, n: 5, l: 6.2, w: 2.2, outer: -1 });
    for (const i of [0, 1, 2, 4]) b.fill(box[i], { facing: 'nose', models: ['hatch', 'sedan', 'mini', 'suv'] });
    for (const x of [4, 9.6, 15.2, 20.8, 26.4]) b.parked(x, y0 + 1.1, 0, { models: ['hatch', 'sedan', 'van'] });
    b.crosswalk(32.4, y0, 35.2, y1, true);
    b.hatch(36.5, y1 - 2.2, 41.5, y1, { color: 'yellow' });
    b.arrow(12, 10.75, 0).arrow(38, 10.75, 0);
    for (const x of [7, 19, 39]) b.tree(x, y1 + 1.9, 1.6);
    b.lamp(6.6, y1 + 0.35, { arm: -90 }).lamp(31.6, y1 + 0.35, { arm: -90 });
    b.bollard(31.8, y0 - 0.4).bollard(35.8, y0 - 0.4);
    // yayalar: kaldırımlar ve geçit
    b.peds([[-2, y1 + 1.0], [W + 2, y1 + 1.0]], { every: [5, 9], initial: 2 });
    b.peds([[W + 2, y0 - 1.0], [33.8, y0 - 1.0], [33.8, y1 + 1.0], [-2, y1 + 1.0]], { every: [7, 12], initial: 1 });
    b.peds([[21, 4.4], [21, y0 - 1.0], [W + 2, y0 - 1.0]], { every: [9, 14], initial: 0, delay: 3 });
    b.traffic([[-8, 10.75], [W + 8, 10.75]], { speed: 5.5, every: [12, 20], initial: 0, delay: 9 });
    b.target(box[3], { facing: 'nose' });
    b.start(5.0, 10.75, 0);
  }),
];
