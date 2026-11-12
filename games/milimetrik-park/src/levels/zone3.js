// Bölge 3 — Katlı Otopark (kapalı alan): kolonlar, rampalar, kalabalık.
import { makeLevel } from './build.js';
import { garageShell } from './common.js';

const Z = { zone: 'otopark', env: 'indoor', indoor: true, bg: 'indoor' };

function ceilingLights(b, W, H, step = 8) {
  for (let x = step / 2; x < W; x += step) for (const y of [H * 0.3, H * 0.7]) b.light(x, y, 6, { k: 0.8 });
}

export default [
  makeLevel({
    ...Z, id: 'avm', name: 'AVM Otoparkı', short: 'Kolon dibine geri park', vehicle: 'serce',
    desc: 'Kolonla araç arasındaki yere geri geri park et. Kolonlar affetmez!',
    tip: 'Kolonu geçmeden direksiyonu tam kırma; arka köşe kolona yakın geçer.',
    w: 40, h: 18, par: { moves: 2, quality: 85 },
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
    ...Z, id: 'kolon-ormani', name: 'Kolon Ormanı', short: 'İki kolon arasına (Martı)', vehicle: 'marti',
    desc: 'Her iki yerde bir kolon var ve koridor 5,6 m. Uzun sedanı iki kolonun arasındaki yere geri geri sok.',
    tip: 'Koridor dar: girmeden önce aracı karşı tarafa yanaştır, sonra kır.',
    w: 40, h: 19, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 40, H = 19;
    garageShell(b, W, H);
    const w = 2.7;
    const top = b.bays({ x: 3.5 + w / 2, y: 3.4, ang: -90, n: 13, w, l: 5.2 });
    const bottom = b.bays({ x: 3.5 + w / 2, y: 14.2, ang: 90, n: 13, w, l: 5.2, side: -1 });
    for (let k = 0; k <= 13; k += 2) { b.pillar(3.5 + k * w, 6.0, 0.45); b.pillar(3.5 + k * w, 11.6, 0.45); }
    for (const i of [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 12]) b.fill(top[i], { facing: 'rand', models: ['sedan', 'suv', 'hatch'] });
    for (const i of [0, 1, 3, 4, 5, 6, 7, 9, 10, 11, 12]) b.fill(bottom[i], { models: ['sedan', 'suv', 'hatch', 'van'] });
    b.arrow(9, 8.8, 0).arrow(27, 8.8, 0);
    ceilingLights(b, W, H);
    b.target(top[7], { facing: 'tail' });
    b.start(3.3, 8.8, 0);
  }),

  makeLevel({
    ...Z, id: 'rampa-basi', name: 'Rampa Başı', short: '%12 rampadan çık, park et', vehicle: 'serce',
    desc: 'Alt kattan %12\'lik rampayla üst kata çık ve rampanın hemen ilerisindeki yere geri geri gir. Rampada durursan araç geri kaçmak ister.',
    tip: 'Rampada kolu bırakırsan araç frenle durur; kalkarken kolu biraz daha it.',
    w: 44, h: 22, par: { moves: 2, quality: 85 },
  }, (b) => {
    const W = 44, H = 22;
    b.rect('floor', 0.5, 5.5, 12, 16.5);
    b.ramp(12, 8.4, 22, 13.6, 180, 0.12);
    b.rect('floor', 22, 0.5, W - 0.5, H - 0.5);
    // alt kat duvarları
    b.block(0, 5, 12, 5.5, 'wall').block(0, 16.5, 12, 17, 'wall').block(0, 5, 0.5, 17, 'wall');
    b.block(12, 7.9, 22, 8.4, 'wall').block(12, 13.6, 22, 14.1, 'wall');
    b.block(11.5, 5, 12, 8.4, 'wall').block(11.5, 13.6, 12, 17, 'wall');
    // üst kat kabuğu
    b.block(22, 0, W, 0.5, 'wall').block(22, H - 0.5, W, H, 'wall').block(W - 0.5, 0, W, H, 'wall');
    b.block(22, 0, 22.5, 8.4, 'wall').block(22, 13.6, 22.5, H, 'wall');
    const top = b.bays({ x: 23.5 + 1.25, y: 3.0, ang: -90, n: 7, w: 2.5, l: 5.0 });
    const bottom = b.bays({ x: 23.5 + 1.25, y: 19.0, ang: 90, n: 7, w: 2.5, l: 5.0, side: -1 });
    for (const i of [0, 2, 3, 4, 5, 6]) b.fill(top[i]);
    for (const i of [0, 1, 2, 4, 5, 6]) b.fill(bottom[i]);
    b.label(17, 11, 0, '%12', { size: 0.9 });
    b.arrow(6, 11, 0).arrow(36, 11, 0);
    ceilingLights(b, W, H, 9);
    b.target(top[1], { facing: 'tail' });
    b.start(4.0, 11.0, 0);
  }),

  makeLevel({
    ...Z, id: 'genis-govde', name: 'Geniş Gövde', short: 'SUV ile duvar dibine (Baykuş)', vehicle: 'baykus',
    desc: 'Baykuş 1,90 m geniş. Duvarla araç arasındaki 2,45 m\'lik son yere burnuyla gir; iki yanda 27 cm kalır.',
    tip: 'Koridorun karşı tarafından yaklaş. Dönüşe erken başlarsan sol yan, soldaki araca sürter; geç kalırsan sağ ön köşe duvara değer.',
    w: 39, h: 20, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 39, H = 20;
    garageShell(b, W, H);
    // son yerin sağında yer derinliğinde bir duvar; koridor duvarın ötesinde 3 m daha sürer (dönüş payı)
    const w = 2.45, n = 12, x0 = W - 0.5 - 3.0 - 0.35 - n * w;
    b.block(x0 + n * w, 0.5, x0 + n * w + 0.35, 5.8, 'wall');
    const top = b.bays({ x: x0 + w / 2, y: 3.3, ang: -90, n, w, l: 5.0 });
    const bottom = b.bays({ x: x0 + w / 2 + 1.2, y: 15.3, ang: 90, n: 10, w: 2.6, l: 5.0, side: -1 });
    for (const k of [0, 4, 8]) b.pillar(x0 + k * w, 5.8, 0.45);
    for (const i of [0, 1, 3, 4, 6, 7, 8, 9, 10]) b.fill(top[i], { models: ['suv', 'van', 'sedan'] });
    for (const i of [0, 1, 2, 3, 5, 6, 7, 8, 9]) b.fill(bottom[i], { models: ['suv', 'sedan', 'hatch'] });
    ceilingLights(b, W, H);
    b.arrow(10, 9, 0);
    b.target(top[11], { facing: 'nose' });
    b.start(3.2, 9.2, 0);
  }),

  makeLevel({
    ...Z, id: 'spiral', name: 'Spiral', short: 'Rampadan in, en uca park', vehicle: 'marti',
    desc: 'Kat boyunca ilerle, %10\'luk rampadan aşağı in ve alt koridorun sonundaki yere burnuyla gir. Tek hamlede yapabilir misin?',
    tip: 'Rampa aşağı inerken kolu az it; araç kendiliğinden hızlanmak ister.',
    w: 37, h: 34, par: { moves: 1, quality: 85 },
  }, (b) => {
    const W = 37, H = 34;
    b.rect('floor', 0.5, 0.5, W - 0.5, H - 0.5);
    b.ramp(28.5, 12, 36.5, 19, 90, 0.1);
    b.block(0, 0, W, 0.5, 'wall').block(0, H - 0.5, W, H, 'wall').block(0, 0, 0.5, H, 'wall').block(W - 0.5, 0, W, H, 'wall');
    b.block(0.5, 12, 28.5, 19, 'wall');
    const upper = b.bays({ x: 3 + 1.25, y: 3.3, ang: -90, n: 9, w: 2.5, l: 5.0 });
    for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8]) b.fill(upper[i]);
    const lower = b.bays({ x: 3 + 1.25, y: 28.7, ang: 90, n: 10, w: 2.5, l: 5.0, side: -1 });
    for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9]) b.fill(lower[i]);
    for (const k of [1, 4, 7, 10]) b.pillar(3 + k * 2.5, 26.2, 0.45);
    b.label(32.5, 15.5, 90, '%10', { size: 0.9 });
    b.arrow(14, 9, 0).arrow(32.5, 22.5, 90).arrow(20, 22.5, 180);
    for (let x = 6; x < W; x += 9) { b.light(x, 9, 6, { k: 0.8 }); b.light(x, 22.5, 6, { k: 0.8 }); }
    b.target(lower[0], { facing: 'nose' });
    b.start(4.0, 9.0, 0);
  }),

  makeLevel({
    ...Z, id: 'kalabalik-avm', name: 'Kalabalık AVM', short: 'Yayalar arasında geri park (Baykuş)', vehicle: 'baykus',
    desc: 'Hafta sonu öğleden sonra: alışveriş arabalı yayalar koridoru geçiyor. SUV\'yi kolon yanındaki boş yere geri geri park et.',
    tip: 'Yayalar seni görünce durur ama sen de dur. Geri giderken yandan çıkan yayalar sensörde görünür.',
    w: 44, h: 19, par: { moves: 2, quality: 85 },
  }, (b) => {
    const W = 44, H = 19;
    garageShell(b, W, H);
    const w = 2.6;
    const top = b.bays({ x: 3.5 + w / 2, y: 3.3, ang: -90, n: 15, w });
    const bottom = b.bays({ x: 3.5 + w / 2, y: 15.2, ang: 90, n: 15, w, side: -1 });
    for (const k of [0, 3, 6, 9, 12, 15]) { b.pillar(3.5 + k * w, 5.8, 0.5); b.pillar(3.5 + k * w, 12.7, 0.5); }
    for (const i of [0, 1, 2, 3, 4, 6, 9, 10, 11, 13, 14]) b.fill(top[i], { models: ['suv', 'sedan', 'hatch', 'van', 'mini'] });
    b.hatch(21.7, 0.8, 24.3, 5.8, { color: 'white' });
    for (const i of [0, 1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 14]) b.fill(bottom[i]);
    b.block(20.3, 0.5, 23.7, 0.8, 'box');
    b.label(22, 1.4, 0, 'ASANSÖR', { size: 0.6 });
    ceilingLights(b, W, H);
    const yA = 9.25;
    b.peds([[12.6, H + 1], [12.6, yA], [23, yA - 1.5], [23, 1.2]], { every: [6, 10], initial: 1 });
    b.peds([[23, 1.2], [23, yA + 1.2], [38.6, yA + 1.2], [38.6, H + 1]], { every: [7, 12], initial: 1, delay: 2 });
    b.target(top[8], { facing: 'tail' });
    b.start(3.0, yA, 0);
  }),
];
