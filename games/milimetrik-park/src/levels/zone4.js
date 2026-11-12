// Bölge 4 — Gece: karanlık, sokak lambaları ve farlar.
import { makeLevel } from './build.js';
import { lot, lotLamps, street } from './common.js';

const Z = { zone: 'gece', env: 'night' };

export default [
  makeLevel({
    ...Z, id: 'gece-otoparki', name: 'Gece Otoparkı', short: 'Karanlıkta burunla', vehicle: 'serce',
    desc: 'Gece, yarı boş otopark. Farların ve lambaların aydınlattığı yere burnuyla gir.',
    tip: 'Karanlıkta yörünge çizgileri ve sensörler en iyi dostun.',
    w: 34, h: 22.5, par: { moves: 1, quality: 85 },
  }, (b) => {
    const r = lot(b, { aisle: 7, x0: 2.5, nTop: 11, nBot: 11, topFill: [0, 2, 3, 6, 8, 9, 10], bottomFill: [1, 2, 4, 5, 7, 9], stoppers: true });
    lotLamps(b, r, [7.6, 17.6, 27.6]);
    b.tree(33.3, 11, 2.2).tree(0.7, 15, 2.0);
    b.target(r.top[5], { facing: 'nose', idealLong: 0.15 });
    b.start(4.4, r.aisleY, 0);
  }),

  makeLevel({
    ...Z, id: 'karanlik-sokak', name: 'Karanlık Sokak', short: 'Gece paralel (Baykuş)', vehicle: 'baykus',
    desc: 'Gece trafiğinde SUV ile sağdaki boşluğa paralel park et. Karşıdan gelen farlar göz alır.',
    tip: 'Boşluk 6,4 m; Baykuş 4,6 m. Önce öndeki araca paralel dur.',
    w: 44, h: 22, par: { moves: 3, quality: 85 },
  }, (b) => {
    const W = 44;
    const { y0, y1 } = street(b, { y0: 5, width: 10, tone: 2 });
    b.dashed(0, (y0 + y1) / 2, W, (y0 + y1) / 2);
    b.line(0, y0 + 2.2, W, y0 + 2.2, { w: 0.1 });
    const south = [[3.2, 'sedan'], [8.6, 'hatch'], [14.0, 'suv']];
    for (const [x, model] of south) b.parked(x, y1 - 1.1, 0, { model, jitter: 0.3 });
    for (const [x, model] of [[27.9, 'van'], [33.6, 'sedan'], [39.3, 'hatch']]) b.parked(x, y1 - 1.1, 0, { model, jitter: 0.3 });
    for (const x of [4, 10, 16.5, 23, 29.5, 36, 41.5]) b.parked(x, y0 + 1.1, 180, { models: ['hatch', 'sedan', 'suv', 'van'] });
    for (const x of [5.5, 19.5, 33.5]) b.lamp(x, y1 + 0.4, { arm: -90 });
    for (const x of [12.5, 26.5, 40.5]) b.lamp(x, y0 - 0.4, { arm: 90 });
    b.traffic([[W + 8, y0 + 3.5], [-8, y0 + 3.5]], { speed: 8, every: [5, 9], initial: 1 });
    b.traffic([[-8, y1 - 3.4], [W + 8, y1 - 3.4]], { speed: 6, every: [16, 26], initial: 0, delay: 12 });
    b.target({ x: 20.85, y: y1 - 1.1, a: 0, l: 6.0, w: 2.2, parallel: true }, { facing: 'nose' });
    b.start(4.0, y1 - 3.4, 0);
  }),

  makeLevel({
    ...Z, id: 'benzinlik', name: 'Benzinlik', short: 'Pompanın yanına yanaş (Martı)', vehicle: 'marti',
    desc: 'Gece yarısı benzinlik. Kanopinin altına gir ve sol pompanın yanındaki kutuda, yakıt kapağı pompaya bakacak şekilde (doğu yönünde) dur.',
    tip: 'Pompa adasına sürtmemek için ön tekerlerin adayı geçtiğinde kırmaya başla.',
    w: 36, h: 25, par: { moves: 1, quality: 85 },
  }, (b) => {
    const W = 36, H = 25;
    b.rect('concrete', 1, 3.5, W - 1, 18.5);
    b.rect('sidewalk', 0, 18.5, W, 19.3).rect('asphalt', 0, 19.3, W, H - 0.4);
    b.block(1, 0, W - 1, 3.5, 'building', { tone: 1 });
    b.label(18, 1.7, 0, 'MARKET • 24 SAAT', { size: 0.9 });
    b.block(0, 3.5, 1, 18.5, 'hedge').block(W - 1, 3.5, W, 18.5, 'hedge');
    // giriş ve çıkış: kaldırım aralıkları
    b.curb(0, 19.3, 4, 19.3, -1).curb(11, 19.3, 25, 19.3, -1).curb(32, 19.3, W, 19.3, -1);
    b.curb(0, H - 0.4, W, H - 0.4, 1);
    b.wall(-0.3, 19.3, -0.3, H, 0.3, { kind: 'barrier' }).wall(W + 0.3, 19.3, W + 0.3, H, 0.3, { kind: 'barrier' });
    b.block(11, 18.5, 25, 19.3, 'hedge');
    for (const [x, y] of [[12, 8], [24, 8], [12, 13.6], [24, 13.6]]) b.pump(x, y, 0);
    b.canopy(7, 5.2, 29, 16.4, { color: '#dde3e8', stripe: '#d9443b' });
    for (const [x, y] of [[10, 6.5], [18, 6.5], [26, 6.5], [10, 15], [18, 15], [26, 15]]) b.light(x, y, 6.5, { k: 0.95 });
    b.lamp(3, 17.8, { arm: 90 }).lamp(33, 17.8, { arm: 90 });
    b.parked(24.2, 10.8, 0, { model: 'suv' });
    b.parked(30.5, 5.6, -90, { model: 'van' });
    b.arrow(7.5, 21.9, 0).arrow(28.5, 21.9, 0).arrow(7.5, 16.5, -90, { s: 0.7 }).arrow(28.5, 16.5, 90, { s: 0.7 });
    b.traffic([[-8, 22.8], [W + 8, 22.8]], { speed: 7, every: [8, 14], initial: 0, delay: 6 });
    b.target({ x: 12, y: 10.8, a: 0, l: 5.8, w: 2.5 }, { facing: 'nose', kind: 'pump' });
    b.start(3.0, 21.0, 0);
  }),

  makeLevel({
    ...Z, id: 'otel-girisi', name: 'Otel Girişi', short: 'Kanopi altında kolonlar arası (Martı)', vehicle: 'marti',
    desc: 'Otelin vale alanındaki iki kolon arasındaki yere geri geri gir. Kanopi ışıkları dışında her yer karanlık.',
    tip: 'Kolonlar arası 2,9 m. Kolonu geçtikten sonra direksiyonu kır.',
    w: 36, h: 24, par: { moves: 2, quality: 85 },
  }, (b) => {
    const W = 36, H = 24;
    b.rect('concrete', 1, 1, W - 1, 9.5).rect('asphalt', 1, 9.5, W - 1, H - 1.5);
    b.block(1, 0, W - 1, 1.0, 'building', { tone: 3 });
    b.label(18, 0.5, 0, 'OTEL', { size: 0.8 });
    b.block(0, 0, 1, H, 'hedge').block(W - 1, 0, W, H, 'hedge').block(0, H - 1, W, H, 'hedge');
    b.curb(1, H - 1.5, W - 1, H - 1.5, 1).curb(1, 1, 1, H - 1.5, 1).curb(W - 1, 1, W - 1, H - 1.5, -1);
    const slots = b.bays({ x: 6.4 + 1.45, y: 4.0, ang: -90, n: 8, w: 2.9, l: 5.6, back: false });
    for (let k = 0; k <= 8; k++) b.pillar(6.4 + k * 2.9, 6.85, 0.4);
    for (const i of [0, 1, 2, 4, 5, 7]) b.fill(slots[i], { facing: 'tail', models: ['sedan', 'suv', 'van'] });
    b.canopy(5, 1, 31, 7.2, { color: '#2a2d33', stripe: '#c9a24a' });
    for (let x = 7.5; x < 31; x += 4.3) b.light(x, 4.2, 5, { k: 0.9 });
    b.lamp(1.7, 15, { arm: 0 }).lamp(34.3, 15, { arm: 180 });
    for (const x of [10, 22]) b.tree(x, H - 0.4, 1.4);
    b.peds([[W + 1, 8.6], [-1, 8.6]], { every: [10, 16], initial: 1 });
    b.target(slots[3], { facing: 'tail' });
    b.start(4.0, 13.0, 0);
  }),

  makeLevel({
    ...Z, id: 'cikmaz-sokak', name: 'Çıkmaz Sokak', short: 'Dön ve garaja geri gir', vehicle: 'serce',
    desc: 'Dar çıkmaz sokağın sonundaki garaja geri geri girmen gerek. Önce aracı sokakta çevir. Gece ve lambalar seyrek.',
    tip: 'Sokağın sonu biraz geniş: orada üç noktada dön, sonra garaja geri gir.',
    w: 18, h: 42, par: { moves: 4, quality: 85 },
  }, (b) => {
    const W = 18, H = 42;
    b.rect('asphalt', 3, 5.6, 10.6, H).rect('sidewalk', 0, 5.6, 3, H).rect('sidewalk', 10.6, 12, 12, H);
    b.rect('concrete', 10.6, 6.6, 16.8, 9.8);
    b.block(0, 0, W, 5.6, 'building', { tone: 2 });
    b.block(10.6, 0, W, 6.6, 'building', { tone: 4 });
    b.block(10.6, 9.8, W, 12, 'building', { tone: 4 });
    b.block(12, 12, W, H, 'building', { tone: 0 });
    b.block(16.8, 6.6, W, 9.8, 'wall');
    b.block(0, 5.6, 0.4, H, 'building', { tone: 1 });
    b.curb(3, 5.6, 3, H, 1).curb(10.6, 12, 10.6, H, -1).curb(10.6, 9.8, 10.6, 12, -1).curb(10.6, 5.6, 10.6, 6.6, -1);
    b.wall(3, H + 0.3, 10.6, H + 0.3, 0.3, { kind: 'barrier' });
    for (const y of [14.2, 19.6, 25.0, 30.4, 36.0]) b.parked(4.15, y, -90, { models: ['hatch', 'sedan', 'mini'] });
    for (const y of [13, 25, 37]) b.lamp(2.6, y, { arm: 0, r: 7 });
    b.light(13.5, 8.2, 3.5, { k: 0.8 });
    b.target({ x: 13.7, y: 8.2, a: 0, l: 5.8, w: 2.8 }, { facing: 'tail', kind: 'garage' });
    b.start(7.6, 38.0, -90);
  }),

  makeLevel({
    ...Z, id: 'gece-vardiyasi', name: 'Gece Vardiyası', short: 'Hastane otoparkı (Baykuş)', vehicle: 'baykus',
    desc: 'Hastane otoparkı, gece vardiyası. Ambulans alanına girme! Personel yerlerinden boş olana geri geri park et.',
    tip: 'Girişe doğru yürüyen sağlık çalışanlarına dikkat.',
    w: 38, h: 23, par: { moves: 2, quality: 85 },
  }, (b) => {
    const r = lot(b, { aisle: 7, x0: 3.5, nTop: 12, nBot: 12, topFill: [0, 1, 2, 4, 5, 7, 8, 9], bottomFill: [0, 1, 3, 4, 5, 6, 8, 9, 10, 11], models: ['sedan', 'suv', 'hatch', 'van'] });
    b.hatch(r.top[10].x - 1.25, 2.2, r.top[11].x + 1.25, 7.2, { color: 'red' });
    b.label(r.top[10].x + 1.25, 4.6, 0, 'AMBULANS', { size: 0.6 });
    lotLamps(b, r, [8.5, 18.5, 28.5]);
    b.peds([[-1, r.aisleY + 2.5], [36, r.aisleY + 2.5], [36, 1]], { every: [9, 15], initial: 1 });
    b.peds([[37.5, r.aisleY - 2.6], [2, r.aisleY - 2.6], [2, r.H]], { every: [12, 18], initial: 0, delay: 6 });
    b.target(r.top[6], { facing: 'tail' });
    b.start(4.5, r.aisleY, 0);
  }),
];
