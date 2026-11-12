// Bölge 6 — Liman: feribot güvertesi, yükleme rampaları, römorklu kamyonet.
import { makeLevel } from './build.js';

const Z = { zone: 'liman', env: 'day' };

/** Depo cephesi ve yükleme rampaları: kapılar x listesinde; rampanın önü y=wallY. */
function warehouse(b, W, wallY, doors) {
  b.block(0.5, 0, W - 0.5, wallY, 'building', { tone: 3 });
  b.label(W / 2, wallY / 2, 0, 'DEPO', { size: 1.4 });
  for (const x of doors) {
    b.block(x - 1.9, wallY, x - 1.6, wallY + 0.35, 'box').block(x + 1.6, wallY, x + 1.9, wallY + 0.35, 'box');
    b.line(x - 1.85, wallY + 0.4, x - 1.85, wallY + 13, { color: 'yellow', w: 0.14 });
    b.line(x + 1.85, wallY + 0.4, x + 1.85, wallY + 13, { color: 'yellow', w: 0.14 });
    b.light(x, wallY + 1.5, 5, { k: 0.8 });
  }
}

export default [
  makeLevel({
    ...Z, id: 'feribot', name: 'Feribot', short: 'Güvertede tampon tampona', vehicle: 'serce', bg: 'water',
    desc: 'Rampadan feribota çık ve ortadaki şeritte öndeki aracın arkasına, kutunun içine dur. Güverte çelik: biraz kaygan.',
    tip: 'Öndeki araca 30-50 cm kala dur; ön sensör sürekli ötünce yeter.',
    w: 46, h: 26, par: { moves: 1, quality: 85 },
  }, (b) => {
    const W = 46;
    b.rect('concrete', 0, 2, 9, 24);
    b.ramp(9, 9, 14, 17, 180, 0.06);
    b.rect('steel', 14, 2, 44, 24);
    b.block(0, 1.5, 9, 2, 'railing').block(0, 24, 9, 24.5, 'railing');
    b.block(9, 8.6, 14, 9, 'railing').block(9, 17, 14, 17.4, 'railing');
    b.block(14, 1.6, 44.4, 2, 'railing').block(14, 24, 44.4, 24.4, 'railing').block(44, 2, 44.4, 24, 'railing');
    b.block(13.6, 2, 14, 9, 'railing').block(13.6, 17, 14, 24, 'railing');
    b.block(-0.4, 2, 0, 24, 'barrier');
    for (const y of [4, 22]) b.bollard(8.4, y);
    for (let y = 3.5; y <= 21.5; y += 3) b.line(16, y, 43, y, { w: 0.1 });
    const lanes = { 5: 2, 8: 3, 11: 4, 14: 2, 17: 3, 20: 2 };
    for (const [yy, n] of Object.entries(lanes)) {
      let x = 42.6;
      for (let k = 0; k < n; k++) {
        const model = ['sedan', 'hatch', 'suv', 'van', 'mini'][(k + Number(yy)) % 5];
        const L = { sedan: 4.6, hatch: 4.1, suv: 4.5, van: 4.9, mini: 3.6 }[model];
        b.parked(x - L / 2, Number(yy), 0, { model, jitter: 0.3 });
        x -= L + 0.6;
      }
    }
    b.arrow(5, 13, 0).arrow(19, 14, 0);
    b.target({ x: 29.9, y: 14, a: 0, l: 5.0, w: 2.6 }, { facing: 'nose', kind: 'lane' });
    b.start(4.0, 13.0, 0);
  }),

  makeLevel({
    ...Z, id: 'romork-tanisma', name: 'Römorkla Tanışma', short: 'Römorku şeride sok (Kervan)', vehicle: 'kervan',
    desc: 'Kervan kamyonetin arkasında 3,6 m\'lik bir römork var. Sağa dönüp römorku şeritteki turuncu kutuya getir. Dönüşte römork içeriden gelir!',
    tip: 'Dönüşe geç başla ve geniş dön; römork köşeyi keser.',
    w: 50, h: 34, par: { moves: 1, quality: 85 },
  }, (b) => {
    const W = 50, H = 34;
    b.rect('asphalt', 1, 1, W - 1, H - 1);
    b.block(0, 0, W, 1, 'fence').block(0, H - 1, W, H, 'fence').block(0, 0, 1, H, 'fence').block(W - 1, 0, W, H, 'fence');
    b.dashed(1, 7, 20, 7, { color: 'yellow' });
    for (let x = 22; x <= 42; x += 4) b.line(x, 9, x, H - 2, { color: 'yellow', w: 0.14 });
    b.parked(24, 26, 90, { model: 'truck', jitter: 0.2 }).parked(28, 25, 90, { model: 'truck', jitter: 0.2 });
    b.parked(36, 26, 90, { model: 'truck', jitter: 0.2 }).parked(40, 24, 90, { model: 'pickup', jitter: 0.2 });
    for (const [x, y] of [[22, 9], [26, 9], [30, 9], [34, 9], [38, 9], [42, 9]]) b.bollard(x, y - 0.4);
    b.container(10, 14, 90).container(10, 22, 90).container(13, 18, 90);
    b.target({ x: 32, y: 17, a: Math.PI / 2, l: 5.0, w: 3.6 }, { facing: 'nose', subject: 'trailer', kind: 'lane' });
    b.start(16.0, 4.6, 0);
  }),

  makeLevel({
    ...Z, id: 'duz-geri', name: 'Düz Geri', short: 'Römorku rampaya düz geri', vehicle: 'kervan',
    desc: 'Römork rampaya tam hizalı. Düz geri git ve römorku rampaya yanaştır. Römork geri giderken en küçük sapmayı büyütür; erken ve az düzelt.',
    tip: 'Römork sola kaçıyorsa direksiyonu SOLA çevir: kamyonet sağa döner, römorku sağa iter.',
    w: 40, h: 36, par: { moves: 1, quality: 85 },
  }, (b) => {
    const W = 40, H = 36;
    b.rect('asphalt', 0.5, 6, W - 0.5, H - 0.5);
    b.block(0, H - 0.5, W, H, 'fence').block(0, 6, 0.5, H, 'fence').block(W - 0.5, 6, W, H, 'fence');
    const doors = [8, 14, 20, 26, 32];
    warehouse(b, W, 6, doors);
    for (const x of [8, 14, 26]) b.parked(x, 6.4 + 3.7, 90, { model: 'truck', jitter: 0.15 });
    b.parked(32, 6.4 + 2.65, 90, { model: 'pickup', jitter: 0.15 });
    b.target({ x: 20, y: 8.7, a: -Math.PI / 2, l: 5.0, w: 3.5 }, { facing: 'tail', subject: 'trailer', kind: 'dock', idealLong: 0.55 });
    b.start(20, 27.0, 90);
  }),

  makeLevel({
    ...Z, id: 'rampa-yanasma', name: 'Rampa Yanaşma', short: 'Römorku dönerek rampaya', vehicle: 'kervan',
    desc: 'Rampanın önünden geç, kamyoneti açıya getir ve römorku dönerek 4 numaralı rampaya yanaştır. Gerçek tır şoförlerinin günlük işi.',
    tip: 'Geri giderken römorkun gitmesini istediğin yönün tersine direksiyon çevir; açı büyüyünce düzelt.',
    w: 46, h: 38, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 46, H = 38;
    b.rect('asphalt', 0.5, 6, W - 0.5, H - 0.5);
    b.block(0, H - 0.5, W, H, 'fence').block(0, 6, 0.5, H, 'fence').block(W - 0.5, 6, W, H, 'fence');
    const doors = [9, 16, 23, 30, 37];
    warehouse(b, W, 6, doors);
    for (const x of [9, 16, 37]) b.parked(x, 6.4 + 3.7, 90, { model: 'truck', jitter: 0.15 });
    b.parked(23, 6.4 + 2.65, 90, { model: 'pickup', jitter: 0.15 });
    b.target({ x: 30, y: 8.7, a: -Math.PI / 2, l: 5.0, w: 3.5 }, { facing: 'tail', subject: 'trailer', kind: 'dock', idealLong: 0.55 });
    b.start(14.0, 29.0, 0);
  }),

  makeLevel({
    ...Z, id: 'kamyon-seridi', name: 'Kamyon Şeridi', short: 'Kamyonların arasına (Pelikan)', vehicle: 'pelikan', bg: 'water',
    desc: 'Feribotun kamyon güvertesinde iki kamyonun arasındaki boş şeride minibüsü geri geri park et.',
    tip: 'Şerit 3,4 m; minibüs 2,02 m. Güvertenin ortasında geniş dön.',
    w: 48, h: 32, par: { moves: 2, quality: 85 },
  }, (b) => {
    const W = 48, H = 32;
    b.rect('steel', 2, 2, W - 2, H - 2);
    b.block(1.6, 1.6, W - 1.6, 2, 'railing').block(1.6, H - 2, W - 1.6, H - 1.6, 'railing').block(1.6, 2, 2, H - 2, 'railing').block(W - 2, 2, W - 1.6, H - 2, 'railing');
    const lanes = [];
    for (let k = 0; k < 11; k++) lanes.push(5 + k * 3.4 + 1.7);
    for (let k = 0; k <= 11; k++) b.line(5 + k * 3.4, 2.2, 5 + k * 3.4, 15.5, { w: 0.1 });
    lanes.forEach((x, k) => { if (k !== 6) b.parked(x, 2.3 + 3.9, -90, { model: k % 3 === 0 ? 'bus' : k % 3 === 1 ? 'truck' : 'van', jitter: 0.2 }); });
    for (const x of [8, 20, 33, 44]) b.parked(x, 27.5, 0, { models: ['sedan', 'hatch', 'suv'] });
    b.target({ x: lanes[6], y: 9.2, a: -Math.PI / 2, l: 7.0, w: 3.0 }, { facing: 'tail' });
    b.start(7.0, 21.5, 0);
  }),

  makeLevel({
    ...Z, id: 'usta-kaptan', name: 'Usta Kaptan', short: 'Konteynerlerin arasına römork', vehicle: 'kervan',
    desc: 'Final: konteyner sahasında iki istif arasındaki 4 m\'lik boşluğa römorku geri geri sok. Römorkun tamamı kutunun içinde olmalı.',
    tip: 'Önce kamyoneti boşluğun karşısına, yola çapraz konumla; römorku küçük düzeltmelerle içeri yönlendir.',
    w: 52, h: 36, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 52, H = 36;
    b.rect('asphalt', 1, 1, W - 1, H - 1);
    b.block(0, 0, W, 1, 'fence').block(0, H - 1, W, H, 'fence').block(0, 0, 1, H, 'fence').block(W - 1, 0, W, H, 'fence');
    // kuzey istifleri: boşluk x 24..28
    for (const [x0, x1] of [[2, 24], [28, 50]]) {
      for (let x = x0 + 1.3; x < x1 - 1.0; x += 2.6) b.container(x, 5.2, 90, { len: 6.06 });
      for (let x = x0 + 1.3; x < x1 - 1.0; x += 2.6) b.container(x, 11.3, 90, { len: 6.06 });
    }
    b.line(24.05, 2, 24.05, 14.4, { color: 'yellow', w: 0.12 }).line(27.95, 2, 27.95, 14.4, { color: 'yellow', w: 0.12 });
    for (let x = 4; x < W - 4; x += 9) b.container(x + 3, H - 4, 0, { len: 6.06 });
    b.dashed(2, 22, W - 2, 22, { color: 'yellow' });
    b.target({ x: 26, y: 5.5, a: -Math.PI / 2, l: 6.0, w: 3.9 }, { facing: 'tail', subject: 'trailer', kind: 'slot' });
    b.start(14.0, 25.0, 0);
  }),
];
