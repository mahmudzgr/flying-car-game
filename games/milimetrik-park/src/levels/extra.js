// Antrenman alanı (serbest sürüş) ve vale otoparkı.
import { makeLevel } from './build.js';

export const PLAYGROUND = makeLevel({
  id: 'antrenman', name: 'Antrenman Alanı', short: 'Serbest sürüş', zone: 'serbest', env: 'day',
  desc: 'Serbest sürüş: slalom, el freni, paralel park kutusu, rampa, su birikintisi ve yağ lekesi. İşaretli bir yerde P\'ye basarsan isabetini görürsün.',
  tip: 'El freni: Boşluk. Kamera: C. Harita: Tab. Garajdaki araçlarından birini seçerek gelebilirsin.',
  w: 70, h: 48, free: true, par: { moves: 99, quality: 0 },
}, (b) => {
  const W = 70, H = 48;
  b.rect('asphalt', 1.5, 1.5, W - 1.5, H - 1.5);
  b.curb(1.5, 1.5, W - 1.5, 1.5, -1).curb(1.5, H - 1.5, W - 1.5, H - 1.5, 1).curb(1.5, 1.5, 1.5, H - 1.5, 1).curb(W - 1.5, 1.5, W - 1.5, H - 1.5, -1);
  b.block(0, 0, W, 0.6, 'hedge').block(0, H - 0.6, W, H, 'hedge').block(0, 0, 0.6, H, 'hedge').block(W - 0.6, 0, W, H, 'hedge');
  for (let i = 0; i < 6; i++) b.cone(12 + i * 6, 7.5);
  b.label(8, 7.5, 0, 'SLALOM', { size: 0.8 });
  const px = 50, py = 6.5;
  b.line(px - 3.25, py - 1.1, px + 3.25, py - 1.1).line(px - 3.25, py + 1.1, px + 3.25, py + 1.1);
  b.line(px - 3.25, py - 1.1, px - 3.25, py + 1.1).line(px + 3.25, py - 1.1, px + 3.25, py + 1.1);
  for (const [x, y] of [[px - 3.5, py - 1.3], [px + 3.5, py - 1.3], [px - 3.5, py + 1.3], [px + 3.5, py + 1.3]]) b.cone(x, y);
  b.target({ x: px, y: py, a: 0, l: 6.5, w: 2.2, parallel: true }, { facing: 'any' });
  const row = b.bays({ x: 8.25, y: 22.5, ang: -90, n: 9, stoppers: true });
  for (const i of [0, 2, 3, 6, 8]) b.fill(row[i]);
  for (const i of [1, 4, 5, 7]) b.target(row[i], { facing: 'any', idealLong: 0.15 });
  const ang = b.angledBays({ x: 38, y: 22.4, rowAng: 0, ang: -60, n: 6 });
  for (const i of [0, 3, 5]) b.fill(ang[i], { facing: 'nose' });
  for (const i of [1, 2, 4]) b.target(ang[i], { facing: 'any' });
  for (let i = 0; i <= 5; i++) { b.cone(59.8, 33 + i * 1.1); b.cone(62.9, 33 + i * 1.1); }
  for (let i = 0; i <= 2; i++) b.cone(60 + i * 1.4, 32.4);
  b.target({ x: 61.35, y: 35.9, a: -Math.PI / 2, l: 5.6, w: 2.7 }, { facing: 'any', kind: 'garage' });
  // rampa, birikinti, yağ
  b.ramp(30, 32, 42, 38, 180, 0.12);
  b.label(36, 35, 0, '%12', { size: 0.8 });
  b.puddle(14, 34, 3.2, 1.6).oil(20, 40, 2.2, 1.4, 20);
  b.tree(46, 42, 2.4).tree(4, 42, 2.0);
  b.start(6, 34, 0);
});

/** Vale otoparkı: solda bırakma şeridi; dört sıra park yeri (boşlar hedef). */
export const VALET_LOT = makeLevel({
  id: 'vale', name: 'Vale', short: 'Süreli vale', zone: 'vale', env: 'dusk',
  desc: 'Müşteriler arabalarını bırakıyor. Her aracı boş bir yere park et; süre bitmeden olabildiğince çok araç. Hasar bahşişi düşürür.',
  tip: 'İsabetli ve hızlı park = daha çok puan. Her park süreye +20 sn ekler.',
  w: 54, h: 38.6, par: { moves: 99, quality: 0 },
}, (b) => {
  const W = 54, H = 38.6;
  b.rect('asphalt', 1.5, 2, W - 1.5, H - 2);
  b.curb(1.5, 2, W - 1.5, 2, -1).curb(1.5, H - 2, W - 1.5, H - 2, 1).curb(1.5, 2, 1.5, H - 2, 1).curb(W - 1.5, 2, W - 1.5, H - 2, -1);
  b.block(0, 0, W, 1, 'hedge').block(0, H - 1, W, H, 'hedge').block(0, 0, 0.6, H, 'hedge').block(W - 0.6, 0, W, H, 'hedge');
  const x0 = 9.5, w = 2.6, n = 16;
  const rows = [
    b.bays({ x: x0 + w / 2, y: 4.7, ang: -90, n, w }),
    b.bays({ x: x0 + w / 2, y: 16.7, ang: 90, n, w, side: -1, back: false }),
    b.bays({ x: x0 + w / 2, y: 21.7, ang: -90, n, w, back: true }),
    b.bays({ x: x0 + w / 2, y: 33.7, ang: 90, n, w, side: -1 }),
  ];
  // bırakma şeridi ve vale kulübesi
  b.rect('concrete', 1.6, 6, 7.5, 33);
  b.line(7.5, 6, 7.5, 33, { color: 'yellow', w: 0.14 });
  b.block(2.0, 17.6, 3.6, 19.8, 'box');
  b.label(5.3, 18.7, 90, 'VALE', { size: 0.8 });
  b.canopy(1.8, 16.4, 7.4, 21, { color: '#c9a24a' });
  b.arrow(4.6, 28, -90, { s: 0.8 });
  for (const x of [14.7, 27.7, 40.7]) { b.post(x, 19.2, 0.12, 'lamp', { arm: 0 }); b.light(x, 19.2, 10); b.lamp(x, 1.4, { arm: 90, reach: 1.1, r: 8 }); b.lamp(x, H - 1.45, { arm: -90, reach: 1.1, r: 8 }); }
  // başlangıçta dolu yerler (sabit desen), kalanlar hedef
  const R = (i, k) => ((i * 7 + k * 13) % 10) < 4;
  rows.forEach((row, k) => row.forEach((bay, i) => {
    if (R(i, k)) b.fill(bay, { facing: 'rand' });
    else b.target(bay, { facing: 'any', idealLong: 0 });
  }));
  b.start(4.6, 29.5, -90);
});
