// Bölge 4 / Bölüm 2 — "Kar Topu Kaçışı": hız yönetimi. Dev kar topu çizgiyi geçince arkandan yuvarlanmaya başlar ve hızlanır.
// Durmak yok: yokuşlarda hız kaybı, buz yamasında gazsızlık ve rampalardaki havada kalma süresi seni topa yaklaştırır.
// Ritim: kısa ısınma → yamaç → serbest iniş (topu uzaklaştır) → buz yaması → atlayışlar → son dik inişte nefes.
export default {
  id: '4-2',
  name: 'Kar Topu Kaçışı',
  region: 4, order: 2,
  biome: 'zirve', music: 'zirve', difficulty: 5,
  teaches: 'Hız yönetimi',
  recommended: { vehicle: 'tosun', tier: 4 },

  terrain: {
    surface: 'snow',
    pieces: [
      { type: 'flat', len: 30 },                                          // 0   top x=34'te tetiklenir
      { type: 'hills', len: 50, amp: 0.8, waves: 2, surface: 'snow' },    // 30
      { type: 'slope', len: 34, dy: -4.0, surface: 'snow' },              // 80  iniş: hız kazan
      { type: 'flat', len: 20, surface: 'snow' },                         // 114
      { type: 'slope', len: 26, dy: 3.0, surface: 'snow' },               // 134 yokuş: topu yakınlaştırır
      { type: 'flat', len: 10, surface: 'snow' },                         // 160
      { type: 'slope', len: 40, dy: -5.0, surface: 'snow' },              // 170 iniş
      { type: 'flat', len: 30, surface: 'ice' },                          // 210 BUZ YAMASI: gaz işe yaramaz, momentumla geç
      { type: 'bumps', len: 28, h: 0.3, n: 5, surface: 'snow' },          // 240
      { type: 'flat', len: 14, surface: 'snow' },                         // 268
      { type: 'ramp', len: 10, dy: 1.8, surface: 'snow' },                // 282 rampa 1
      { type: 'pts', pts: [[0, -5], [5, 0], [0, 3.5]], surface: 'snow' }, // 292 çukur 5 m (karşı yaka 1,5 aşağıda)
      { type: 'slope', len: 20, dy: -1.5, surface: 'snow' },              // 297
      { type: 'hills', len: 50, amp: 1.0, waves: 2, surface: 'snow' },    // 317
      { type: 'slope', len: 24, dy: 3.5, surface: 'snow' },               // 367 yokuş 2
      { type: 'slope', len: 44, dy: -6.0, surface: 'snow' },              // 391 uzun iniş
      { type: 'bumps', len: 30, h: 0.3, n: 6, surface: 'snow' },          // 435
      { type: 'flat', len: 10, surface: 'snow' },                         // 465
      { type: 'slope', len: 30, dy: -3.5, surface: 'snow' },              // 475 iniş: büyük atlayış için hız topla
      { type: 'ramp', len: 8, dy: 1.6, surface: 'snow' },                 // 505 rampa 2 (büyük)
      { type: 'pts', pts: [[0, -6], [7, 0], [0, 4.5]], surface: 'snow' }, // 513 çukur 7 m (karşı yaka 1,5 aşağıda)
      { type: 'slope', len: 22, dy: -2.5, surface: 'snow' },              // 510
      { type: 'hills', len: 60, amp: 1.1, waves: 3, surface: 'snow' },    // 532
      { type: 'flat', len: 20, surface: 'snow' },                         // 592
      { type: 'slope', len: 40, dy: -4.0, surface: 'snow' },              // 612 son iniş
      { type: 'flat', len: 40, surface: 'snow' },                         // 652
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 4 }],
  minDelivered: 2,
  parTime: 60, timeLimit: null,
  objects: [
    { type: 'snowball', trigger: { x: 34 }, behind: 14, v0: 6, v1: 12, ramp: 45 },
    { type: 'coins', x: 22, n: 5, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 90, n: 6, spacing: 2.4, h: 1.0 },       // inişte: hızlıyken topla
    { type: 'coins', x: 218, n: 6, spacing: 2.4, h: 1.0 },      // buz yaması
    { type: 'coins', x: 290, n: 4, spacing: 1.4, h: 2.8 },      // çukur: atlayıp topla
    { type: 'coins', x: 330, n: 6, spacing: 2.0, h: 1.6 },
    { type: 'coins', x: 400, n: 8, spacing: 2.6, h: 1.0 },
    { type: 'coins', x: 510, n: 5, spacing: 1.6, h: 3.6 },      // büyük çukur üstü: yüksek risk
    { type: 'coins', x: 545, n: 6, spacing: 2.4, h: 1.8 },
    { type: 'coins', x: 620, n: 6, spacing: 2.4, h: 1.0 },
  ],
  hints: [
    { x: 4, text: 'Çizgiyi geçince dev kar topu peşine düşer!', icon: 'snowball' },
    { x: 40, text: 'Kar topu arkanda! Durma, hızlan', icon: 'warn' },
    { x: 150, text: 'Yokuşta gazı bırakma: top yaklaşıyor', icon: 'warn' },
    { x: 200, text: 'Buz yaması: gaz işe yaramaz, hızla geç', icon: 'ice' },
    { x: 270, text: 'Çukur! Rampadan hızla çık', icon: 'warn' },
    { x: 480, text: 'Son büyük atlayış: tam gaz', icon: 'warn' },
  ],
  stars: {
    2: [{ kind: 'deliveredAll', label: '4 kasanın hepsi' }],
    3: [{ kind: 'time', max: 58, label: '58 sn altında' }, { kind: 'intact', label: 'Kargo sağlam' }],
  },
  reward: { base: 270 },
  bot: { speed: 13 },
};
