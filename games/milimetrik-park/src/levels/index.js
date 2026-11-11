// Milimetrik Park — bölümler (konsept: 7 bölüm + antrenman alanı).
// Açılar derece: 0 doğu (sağ), 90 güney (aşağı), -90 kuzey (yukarı). Ölçüler metre.
import { makeLevel } from './build.js';

/** Açık hava otoparkı: üstte ve altta dik park sıraları, ortada 7 m koridor. */
function openLot(b, { topFill, bottomFill, stoppers = true, decor = 'trees' }) {
  const W = b.L.w, H = b.L.h;
  b.rect('asphalt', 1.5, 2.0, W - 1.5, H - 2.4);
  // sınırlar: kaldırımlar (tekerlek) + çit/çalı (gövde)
  b.curb(1.5, 2.0, W - 1.5, 2.0, -1);
  b.curb(1.5, H - 2.4, W - 1.5, H - 2.4, 1);
  b.curb(1.5, 2.0, 1.5, H - 2.4, 1);
  b.curb(W - 1.5, 2.0, W - 1.5, H - 2.4, -1);
  b.block(0, 0, W, 0.9, 'hedge');
  b.block(0, H - 1.0, W, H, 'hedge');
  b.block(0, 0, 0.6, H, 'hedge');
  b.block(W - 0.6, 0, W, H, 'hedge');
  const top = b.bays({ x: 4.25, y: 4.7, ang: -90, n: 11, stoppers });
  const bottom = b.bays({ x: 4.25, y: H - 2.6 - 2.5, ang: 90, n: 11, side: -1, stoppers });
  for (const i of topFill) b.fill(top[i]);
  for (const i of bottomFill) b.fill(bottom[i]);
  const midY = (7.2 + (H - 2.6 - 5)) / 2;
  b.arrow(9, midY, 0, { s: 0.9 }).arrow(W - 9, midY, 180, { s: 0.9 });
  if (decor === 'trees') {
    for (let x = 3; x < W; x += 6.5) b.decor('bush', x, 1.2, { r: 0.9 });
    b.tree(W - 0.9, H / 2, 2.4).tree(0.9, H / 2 + 3, 2.2);
  }
  return { top, bottom, midY };
}

export const LEVELS = [
  makeLevel({
    id: 'ilk-park', name: 'İlk Park', short: 'Burunla dik park',
    desc: 'Boş yere burnuyla gir. Tekerlekler takoza değince dur ve P\'ye al.',
    tip: 'D\'de gaza basmasan da araç kendiliğinden ~6 km/h ilerler; hızı frenle ayarla.',
    w: 34, h: 24, par: { moves: 1, quality: 85 },
  }, (b) => {
    const { top, midY } = openLot(b, { topFill: [0, 1, 3, 8, 9], bottomFill: [0, 2, 3, 5, 6, 9, 10] });
    b.target(top[5], { facing: 'nose', idealLong: 0.15 });
    b.start(5.0, midY, 0);
  }),

  makeLevel({
    id: 'geri-geri', name: 'Geri Geri', short: 'İki araç arasına geri park',
    desc: 'İki aracın arasına geri geri park et: yeri biraz geç, dur, R\'ye al ve direksiyonu kırarak gir.',
    tip: 'Geri vitesteyken arkadaki renkli çizgiler aracın izleyeceği yolu gösterir.',
    w: 34, h: 24, par: { moves: 2, quality: 85 },
  }, (b) => {
    const { top, midY } = openLot(b, { topFill: [0, 2, 3, 5, 7, 9, 10], bottomFill: [0, 1, 2, 4, 5, 6, 7, 9, 10] });
    b.target(top[6], { facing: 'tail', idealLong: 0.15 });
    b.start(4.5, midY, 0);
  }),

  makeLevel({
    id: 'capraz', name: 'Çapraz Park', short: '60° açılı park',
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
    id: 'paralel', name: 'Paralel Park', short: 'Kaldırıma paralel',
    desc: 'Sağdaki boş kutuya geri geri paralel park et. Yol yönünde dur, kaldırıma ~20 cm yanaş.',
    tip: 'Öndeki aracın hizasında dur, R\'ye al, sağa kır; araç ~45° olunca sola kırarak içeri gir.',
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
    b.target(box[3], { facing: 'nose' });
    b.start(6.0, 9.45, 0);
  }),

  makeLevel({
    id: 'dar-garaj', name: 'Dar Garaj', short: '3 m garaja geri',
    desc: 'Garaja geri geri gir; sabah çıkarken kolay olsun. Kapı 3 m, araç 1,78 m.',
    tip: 'Kapıyı geç, aracı çaprazla. Geri giderken sensör bip\'lerinin hızlanmasını izle.',
    w: 36, h: 18, bg: 'grass', par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 36;
    b.rect('sidewalk', 0, 7.0, W, 8.2).rect('asphalt', 0, 8.2, W, 14.6).rect('sidewalk', 0, 14.6, W, 16.2);
    b.rect('concrete', 17.0, 1.0, 20.0, 8.2);
    // garaj duvarları
    b.block(16.7, 0.7, 17.0, 7.0, 'wall').block(20.0, 0.7, 20.3, 7.0, 'wall').block(16.7, 0.7, 20.3, 1.0, 'wall');
    // evler ve bahçe çitleri
    b.block(1.0, 0.4, 16.2, 5.4, 'building', { tone: 0, roof: 'tile' });
    b.block(20.8, 0.4, 34.0, 5.4, 'building', { tone: 2, roof: 'tile' });
    b.block(0, 6.6, 16.7, 7.0, 'fence').block(20.3, 6.6, W, 7.0, 'fence');
    b.block(-0.4, 7.0, 0, 16.2, 'barrier').block(W, 7.0, W + 0.4, 16.2, 'barrier');
    b.block(0, 16.2, W, 16.6, 'fence');
    // kaldırım: garaj önünde indirilmiş
    b.curb(0, 8.2, 16.2, 8.2, -1).curb(20.8, 8.2, W, 8.2, -1);
    b.curb(0, 14.6, W, 14.6, 1);
    for (const x of [3.2, 8.4, 27.6, 32.8]) b.parked(x, 13.5, 0, { models: ['hatch', 'sedan', 'suv'] });
    b.tree(12, 3.4, 1.7).tree(24, 15.6, 1.6).tree(5, 15.6, 1.5);
    b.decor('bush', 15.4, 6.0, { r: 0.7 }).decor('bush', 21.6, 6.0, { r: 0.7 });
    b.target({ x: 18.5, y: 3.95, a: -Math.PI / 2, l: 5.5, w: 2.7 }, { facing: 'tail', kind: 'garage' });
    b.start(5.0, 10.6, 0);
  }),

  makeLevel({
    id: 'avm', name: 'AVM Otoparkı', short: 'Kolon dibine geri park',
    desc: 'Kolonla araç arasındaki yere geri geri park et. Kolonlar affetmez!',
    tip: 'Kolonu geçmeden direksiyonu tam kırma; arka köşe kolona yakın geçer.',
    w: 40, h: 18, bg: 'indoor', indoor: true, par: { moves: 2, quality: 85 },
  }, (b) => {
    const W = 40, H = 18;
    b.rect('floor', 0.5, 0.5, W - 0.5, H - 0.5);
    b.block(0, 0, W, 0.5, 'wall').block(0, H - 0.5, W, H, 'wall').block(0, 0, 0.5, H, 'wall').block(W - 0.5, 0, W, H, 'wall');
    const w = 2.6;
    const top = b.bays({ x: 3.5 + w / 2, y: 3.3, ang: -90, n: 13, w });
    const bottom = b.bays({ x: 3.5 + w / 2, y: 14.3, ang: 90, n: 13, w, side: -1 });
    for (const k of [0, 3, 6, 9, 12]) { b.pillar(3.5 + k * w, 5.8, 0.5); b.pillar(3.5 + k * w, 11.8, 0.5); }
    for (const i of [0, 1, 2, 4, 5, 7, 9, 10, 12]) b.fill(top[i], { facing: 'rand' });
    for (const i of [0, 2, 3, 4, 6, 7, 8, 10, 11]) b.fill(bottom[i]);
    b.cone(top[8].x - 0.7, 5.5).cone(top[8].x + 0.7, 5.5).cone(top[8].x, 5.5);
    b.box(37.2, 8.8, 0.9, 0.6, 15, 'cart');
    b.arrow(8, 8.8, 0).arrow(22, 8.8, 0).arrow(33, 8.8, 0);
    b.label(1.6, 8.8, 90, 'GİRİŞ', { size: 0.8 });
    b.target(top[6], { facing: 'tail' });
    b.start(3.0, 8.8, 0);
  }),

  makeLevel({
    id: 'sikisik', name: 'Sıkışık Sokak', short: '5,4 m boşluğa paralel',
    desc: 'Tek yönlü dar sokakta iki araç arasındaki 5,4 m\'lik boşluğa paralel park et.',
    tip: 'Birkaç hamle normal. Kaldırımdaki direğe ve ağaçlara arka köşe taşabilir, dikkat.',
    w: 40, h: 16, par: { moves: 4, quality: 85 },
  }, (b) => {
    const W = 40;
    b.rect('sidewalk', 0, 0.8, W, 3.0).rect('asphalt', 0, 3.0, W, 11.0).rect('sidewalk', 0, 11.0, W, 13.6);
    for (let x = 0; x < W; x += 10) b.block(x + 0.2, 0, x + 9.8, 0.8, 'building', { tone: (x / 10) % 3 });
    for (let x = 0; x < W; x += 8) b.block(x + 0.2, 13.6, x + 7.8, 16, 'building', { tone: 2 - (x / 8) % 3 });
    b.curb(0, 3.0, W, 3.0, -1).curb(0, 11.0, W, 11.0, 1);
    b.wall(-0.3, 3, -0.3, 11, 0.3, { kind: 'barrier' }).wall(W + 0.3, 3, W + 0.3, 11, 0.3, { kind: 'barrier' });
    // güney şeridi: hedef boşluk 19,9 – 25,3 m
    const south = [[3.1, 'sedan'], [8.45, 'hatch'], [13.3, 'mini'], [17.6, 'sedan'], [27.4, 'hatch'], [32.95, 'van'], [38.1, 'mini']];
    for (const [x, model] of south) b.parked(x, 9.92, 0, { model, jitter: 0.25 });
    for (const x of [3.8, 9.4, 15.1, 20.6, 26.4, 31.9, 37.3]) b.parked(x, 4.05, 0, { models: ['hatch', 'sedan', 'suv', 'mini'] });
    for (const x of [6, 13.5, 30.5, 37]) b.tree(x, 12.4, 1.7);
    b.post(21.3, 11.75, 0.13, 'lamp');
    b.arrow(6, 7.0, 0).arrow(30, 7.0, 0);
    b.target({ x: 22.6, y: 9.95, a: 0, l: 5.3, w: 2.1, parallel: true }, { facing: 'nose', idealLat: -0.04 });
    b.start(5.0, 7.0, 0);
  }),
];

export const PLAYGROUND = makeLevel({
  id: 'antrenman', name: 'Antrenman Alanı', short: 'Serbest sürüş',
  desc: 'Serbest sürüş: slalom, el freni, paralel park kutusu. İşaretli bir yerde P\'ye alırsan isabetini görürsün.',
  tip: 'El freni: Boşluk tuşu. Kamera: C. Harita: Tab.',
  w: 64, h: 44, free: true, par: { moves: 99, quality: 0 },
}, (b) => {
  const W = 64, H = 44;
  b.rect('asphalt', 1.5, 1.5, W - 1.5, H - 1.5);
  b.curb(1.5, 1.5, W - 1.5, 1.5, -1).curb(1.5, H - 1.5, W - 1.5, H - 1.5, 1).curb(1.5, 1.5, 1.5, H - 1.5, 1).curb(W - 1.5, 1.5, W - 1.5, H - 1.5, -1);
  b.block(0, 0, W, 0.6, 'hedge').block(0, H - 0.6, W, H, 'hedge').block(0, 0, 0.6, H, 'hedge').block(W - 0.6, 0, W, H, 'hedge');
  // slalom
  for (let i = 0; i < 6; i++) b.cone(12 + i * 6, 7.5);
  b.label(8, 7.5, 0, 'SLALOM', { size: 0.8 });
  // paralel park kutusu (konilerle)
  const px = 46, py = 6.5;
  b.line(px - 3.25, py - 1.1, px + 3.25, py - 1.1).line(px - 3.25, py + 1.1, px + 3.25, py + 1.1);
  b.line(px - 3.25, py - 1.1, px - 3.25, py + 1.1).line(px + 3.25, py - 1.1, px + 3.25, py + 1.1);
  for (const [x, y] of [[px - 3.5, py - 1.3], [px + 3.5, py - 1.3], [px - 3.5, py + 1.3], [px + 3.5, py + 1.3]]) b.cone(x, y);
  b.target({ x: px, y: py, a: 0, l: 6.5, w: 2.2, parallel: true }, { facing: 'any' });
  // dik park sırası
  const row = b.bays({ x: 8.25, y: 22.5, ang: -90, n: 9, stoppers: true });
  for (const i of [0, 2, 3, 6, 8]) b.fill(row[i]);
  for (const i of [1, 4, 5, 7]) b.target(row[i], { facing: 'any', idealLong: 0.15 });
  // açılı sıra
  const ang = b.angledBays({ x: 38, y: 22.4, rowAng: 0, ang: -60, n: 6 });
  for (const i of [0, 3, 5]) b.fill(ang[i], { facing: 'nose' });
  for (const i of [1, 2, 4]) b.target(ang[i], { facing: 'any' });
  // koni garajı
  for (let i = 0; i <= 5; i++) { b.cone(53.8, 31 + i * 1.1); b.cone(56.9, 31 + i * 1.1); }
  for (let i = 0; i <= 2; i++) b.cone(54 + i * 1.4, 30.4);
  b.target({ x: 55.35, y: 33.9, a: -Math.PI / 2, l: 5.6, w: 2.7 }, { facing: 'any', kind: 'garage' });
  b.tree(32, 38, 2.6).tree(20, 39, 2.2);
  b.start(6, 34, 0);
});

export function levelById(id) {
  if (id === PLAYGROUND.id) return PLAYGROUND;
  return LEVELS.find((l) => l.id === id) || null;
}
