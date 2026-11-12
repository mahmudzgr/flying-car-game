// Sınav Parkuru — sırayla görevler: kapılardan geç (slalom), park et, çıkışa git.
// Kurallar: koniye ya da herhangi bir yere değmek sınavı bitirir; kaldırım teması ve düşük isabet hata yazar.
import { makeLevel } from './build.js';

function ground(b, W, H) {
  b.rect('asphalt', 1, 1, W - 1, H - 1);
  b.curb(1, 1, W - 1, 1, -1).curb(1, H - 1, W - 1, H - 1, 1).curb(1, 1, 1, H - 1, 1).curb(W - 1, 1, W - 1, H - 1, -1);
  b.block(0, 0, W, 0.5, 'fence').block(0, H - 0.5, W, H, 'fence').block(0, 0, 0.5, H, 'fence').block(W - 0.5, 0, W, H, 'fence');
}

/** Slalom kapıları: koni çiftleri; her kapı bir öncekine göre yanda kaydırılmış. */
function slalom(b, x0, y, n, gap, width, sway) {
  const gates = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap, cy = y + (i % 2 ? sway : -sway);
    const y1 = cy - width / 2, y2 = cy + width / 2;
    b.cone(x, y1).cone(x, y2);
    gates.push([[x, y1 + 0.2], [x, y2 - 0.2]]);
  }
  return gates;
}

/** Konilerle çevrili park kutusu (köşelerde koni). */
function coneBox(b, cx, cy, l, w, angDeg) {
  const a = (angDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const pts = [[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
  for (let i = 0; i < 4; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 4]; b.line(x1, y1, x2, y2); }
  for (const [x, y] of [[-l / 2 - 0.35, -w / 2 - 0.35], [l / 2 + 0.35, -w / 2 - 0.35], [l / 2 + 0.35, w / 2 + 0.35], [-l / 2 - 0.35, w / 2 + 0.35]]) b.cone(cx + x * c - y * s, cy + x * s + y * c);
  return { x: cx, y: cy, a, l, w };
}

export const EXAMS = [
  makeLevel({
    id: 'sinav-b', name: 'B Sınıfı', short: 'Otomobil sınavı', vehicle: 'serce', zone: 'sinav', env: 'day',
    desc: 'Slalomu koniye değmeden geç, kutuya paralel park et, geri geri dik park et ve çıkışa git.',
    tip: 'Sınavda acele yok; süre yalnızca üçüncü yıldızı etkiler.',
    w: 60, h: 40, par: { moves: 99, quality: 70 }, exam: { noCone: true, noHit: true, parTime: 170, minQuality: 70 },
  }, (b) => {
    ground(b, 60, 40);
    const gates = slalom(b, 14, 8, 5, 6.5, 3.4, 1.2);
    b.taskGates(gates, { label: 'Slalom' });
    const p1 = coneBox(b, 49, 18, 6.2, 2.4, 90);
    b.curb(50.6, 12, 50.6, 24, -1);
    b.rect('sidewalk', 50.6, 12, 59, 24);
    b.taskPark(p1, { facing: 'nose', label: 'Paralel park', from: { x: 45, y: 6, a: 0 } });
    const bay = { x: 24, y: 33.5, a: Math.PI / 2, l: 5.2, w: 2.6 };
    b.line(22.7, 30.9, 22.7, 36.1).line(25.3, 30.9, 25.3, 36.1).line(22.7, 36.1, 25.3, 36.1);
    b.cone(22.3, 36.6).cone(25.7, 36.6);
    b.taskPark(bay, { facing: 'tail', label: 'Geri geri park', from: { x: 40, y: 26, a: Math.PI } });
    b.rect('concrete', 2, 16, 7, 24);
    b.label(4.5, 20, 90, 'ÇIKIŞ', { size: 0.9 });
    b.taskReach(2, 16, 7, 24, { label: 'Çıkışa git' });
    b.label(10, 4, 0, 'BAŞLA', { size: 0.8 });
    b.start(5.5, 8, 0);
  }),

  makeLevel({
    id: 'sinav-d', name: 'D1 Sınıfı', short: 'Minibüs sınavı', vehicle: 'pelikan', zone: 'sinav', env: 'day',
    desc: 'Minibüsle geniş slalom, rampaya geri yanaşma ve kaldırıma paralel duruş. Koniye değmek yok.',
    tip: 'Uzun araçta arka teker içeriden geçer: kapılara geniş gir.',
    w: 70, h: 46, par: { moves: 99, quality: 70 }, exam: { noCone: true, noHit: true, parTime: 210, minQuality: 70 },
  }, (b) => {
    ground(b, 70, 46);
    const gates = slalom(b, 18, 9, 4, 9, 3.9, 1.3);
    b.taskGates(gates, { label: 'Slalom' });
    b.block(28, 41, 40, 45.5, 'building', { tone: 3 });
    const dock = { x: 34, y: 37, a: Math.PI / 2, l: 7.4, w: 3.2 };
    b.line(32.4, 33.3, 32.4, 40.8, { color: 'yellow', w: 0.14 }).line(35.6, 33.3, 35.6, 40.8, { color: 'yellow', w: 0.14 });
    b.taskPark(dock, { facing: 'tail', label: 'Rampaya geri', from: { x: 50, y: 26, a: Math.PI } });
    const p = coneBox(b, 60, 14, 8.6, 2.7, 90);
    b.curb(61.8, 6, 61.8, 24, -1);
    b.rect('sidewalk', 61.8, 6, 69, 24);
    b.taskPark(p, { facing: 'nose', label: 'Kaldırıma yanaş', from: { x: 52, y: 30, a: -Math.PI / 2 } });
    b.rect('concrete', 2, 18, 8, 28);
    b.label(5, 23, 90, 'ÇIKIŞ', { size: 0.9 });
    b.taskReach(2, 18, 8, 28, { label: 'Çıkışa git' });
    b.start(7, 9, 0);
  }),

  makeLevel({
    id: 'sinav-e', name: 'BE Sınıfı', short: 'Römorklu araç sınavı', vehicle: 'kervan', zone: 'sinav', env: 'day',
    desc: 'Römorkla geniş kapılardan geç, römorku konilerle çevrili kutuya geri geri sok ve çıkışa git.',
    tip: 'Römorkla geri: küçük direksiyon, bol sabır. Römorku izle, kamyoneti değil.',
    w: 76, h: 50, par: { moves: 99, quality: 65 }, exam: { noCone: true, noHit: true, parTime: 260, minQuality: 65 },
  }, (b) => {
    ground(b, 76, 50);
    const gates = slalom(b, 26, 9, 3, 13, 4.6, 0.9);
    b.taskGates(gates, { label: 'Kapılar' });
    const box = coneBox(b, 40, 39, 5.4, 3.6, 90);
    b.taskPark({ ...box }, { facing: 'tail', subject: 'trailer', label: 'Römorku kutuya', from: { x: 52, y: 22, a: Math.PI } });
    b.rect('concrete', 2, 20, 9, 32);
    b.label(5.5, 26, 90, 'ÇIKIŞ', { size: 0.9 });
    b.taskReach(2, 20, 9, 32, { label: 'Çıkışa git' });
    b.start(16, 9, 0);
  }),
];
