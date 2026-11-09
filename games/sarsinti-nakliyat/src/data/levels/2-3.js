// Bölge 2 / Bölüm 3 — "Kaya Yağmuru": zamanlama ve kaçış. Yamaç tepesindeki kayalar araç çizgiyi geçince yuvarlanır.
// Tek boyutlu yol kuralı: kaya yolun önünde durur; bu yüzden her yamacın dibinde bir ÇUKUR vardır — kaya çukura düşer ve kaybolur,
// sen de çukuru atlarsın. Tetik çizgisi çukurdan uzak: sabit hızla gidersen kaya tam sen varmadan düşer (kıl payı!);
// erken/hızlı gelirsen kayayla yamaçta karşılaşırsın, bu yüzden "kaya düşene kadar bekle, sonra gazla" doğru zamanlamadır.
// Kayalar: küçük (0,8 m) → orta (1,0 m) → dev (1,2 m, dik yamaç, geniş çukur).
export default {
  id: '2-3',
  name: 'Kaya Yağmuru',
  region: 2, order: 3,
  biome: 'kanyon', music: 'kanyon', difficulty: 3,
  teaches: 'Zamanlama, kaçış',

  terrain: {
    surface: 'gravel',
    pieces: [
      { type: 'flat', len: 18, surface: 'gravel' },  // 0
      { type: 'hills', len: 40, amp: 0.9, waves: 2 },  // 18
      { type: 'flat', len: 10, surface: 'dirt' },  // 58
      { type: 'flat', len: 22, surface: 'dirt' },  // 68
      { type: 'hills', len: 52, amp: 0.6, waves: 2, surface: 'dirt' },  // 90
      { type: 'flat', len: 8, surface: 'dirt' },  // 142
      { type: 'ramp', len: 6, dy: 0.8, surface: 'gravel' },  // 150
      { type: 'gap', len: 3.8, depth: 6 },  // 156
      { type: 'slope', len: 28, dy: 3.5, surface: 'gravel' },  // 160
      { type: 'flat', len: 8, surface: 'dirt' },  // 188
      { type: 'slope', len: 20, dy: -3.5, surface: 'gravel' },  // 196
      { type: 'hills', len: 36, amp: 1, waves: 2, surface: 'gravel' },  // 216
      { type: 'flat', len: 22, surface: 'dirt' },  // 252
      { type: 'hills', len: 52, amp: 0.6, waves: 2, surface: 'dirt' },  // 274
      { type: 'flat', len: 8, surface: 'dirt' },  // 326
      { type: 'ramp', len: 6, dy: 0.8, surface: 'gravel' },  // 334
      { type: 'gap', len: 3.8, depth: 6 },  // 340
      { type: 'slope', len: 28, dy: 3.5, surface: 'gravel' },  // 344
      { type: 'flat', len: 8, surface: 'dirt' },  // 372
      { type: 'slope', len: 20, dy: -3.5, surface: 'gravel' },  // 380
      { type: 'bumps', len: 28, h: 0.3, n: 5, surface: 'gravel' },  // 400
      { type: 'flat', len: 10, surface: 'dirt' },  // 428
      { type: 'ramp', len: 8, dy: 1.2, surface: 'gravel' },  // 438
      { type: 'slope', len: 12, dy: -1.2 },  // 446
      { type: 'flat', len: 8, surface: 'dirt' },  // 458
      { type: 'flat', len: 22, surface: 'dirt' },  // 466
      { type: 'hills', len: 62, amp: 0.6, waves: 2, surface: 'dirt' },  // 488
      { type: 'flat', len: 8, surface: 'dirt' },  // 550
      { type: 'ramp', len: 6, dy: 0.8, surface: 'gravel' },  // 558
      { type: 'gap', len: 4.2, depth: 6 },  // 564
      { type: 'slope', len: 32, dy: 4.5, surface: 'gravel' },  // 568
      { type: 'flat', len: 8, surface: 'dirt' },  // 600
      { type: 'slope', len: 20, dy: -4.5, surface: 'gravel' },  // 608
      { type: 'hills', len: 40, amp: 0.8, waves: 2 },  // 628
      { type: 'flat', len: 30, surface: 'asphalt' },  // 668
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 4 }],
  minDelivered: 1,
  parTime: 62, timeLimit: null,
  objects: [
    { type: 'rock', x: 187, r: 0.8, trigger: { x: 74 }, vx: -3 },
    { type: 'rock', x: 371, r: 1.0, trigger: { x: 258 }, vx: -3 },
    { type: 'rock', x: 599, r: 1.2, trigger: { x: 472 }, vx: -4 },
    { type: 'coins', x: 22, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 100, n: 5, spacing: 1.8, h: 1.0 },
    { type: 'coins', x: 148, n: 4, spacing: 1.3, h: 2.6 },        // 1. çukurun üstü: atlarken topla
    { type: 'coins', x: 172, n: 5, spacing: 1.7, h: 1.1 },        // yamaçta (kaya geçti)
    { type: 'coins', x: 290, n: 5, spacing: 1.8, h: 1.0 },
    { type: 'coins', x: 332, n: 4, spacing: 1.3, h: 2.8 },        // 2. çukur
    { type: 'coins', x: 402, n: 6, spacing: 1.6, h: 1.0 },        // tümsek dizisi
    { type: 'coins', x: 440, n: 4, spacing: 1.4, h: 2.4 },        // rampa: küçük risk
    { type: 'coins', x: 515, n: 5, spacing: 1.8, h: 1.0 },
    { type: 'coins', x: 560, n: 4, spacing: 1.4, h: 3.2 },        // dev kaya çukuru: yüksek ve riskli
    { type: 'coins', x: 650, n: 6, spacing: 1.7, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Kanyonda kayalar gevşek: yamaç tepelerine dikkat', icon: 'rock' },
    { x: 66, text: 'Çizgiyi geçince tepedeki kaya yuvarlanacak!', icon: 'rock' },
    { x: 118, text: 'Kaya çukura düşer; sen de atla. Erken varırsan bekle!', icon: 'warn' },
    { x: 250, text: 'Daha büyük kaya: zamanlaman önemli', icon: 'rock' },
    { x: 462, text: 'Dev kaya! Yamaç dik, kaya hızlı', icon: 'warn' },
  ],
  stars: {
    2: [{ kind: 'noHit', label: 'Kayaya çarpmadan bitir' }],
    3: [{ kind: 'time', max: 62, label: '62 sn içinde bitir' }],
  },
  reward: { base: 130 },
  bot: { speed: 11 },
};
