// Bölge 4 / Bölüm 4 — "Zirve Teslimatı": bölge ve oyun finali. Her şey birleşir: kar, buz, asma köprü, tahterevalli, çamur, rampa/atlayış, varil yığını.
// 3 kontrol noktası var (köprü sonrası, çamur sonrası, final öncesi); kontrol noktasından devam ★3'ü vermez.
// Ritim: 1) kar ısınması 2) buz iniş 3) KÖPRÜ 4) tahterevalli 5) çamur 6) kanal atlayışı 7) buz + varil 8) dev yokuş ve zirve atlayışı.
// Önerilen araç: Tosun ya da Koca; kritik yük yumurta kolisi (sarsıntı, atlayış).
export default {
  id: '4-4',
  name: 'Zirve Teslimatı',
  region: 4, order: 4,
  biome: 'zirve', music: 'zirve', difficulty: 5,
  teaches: 'Final: her şeyin birleşimi',
  recommended: { vehicle: 'koca', tier: 4 },

  terrain: {
    surface: 'snow',
    pieces: [
      { type: 'flat', len: 20, surface: 'snow' },  // 0
      { type: 'hills', len: 40, amp: 0.8, waves: 2 },  // 20
      { type: 'flat', len: 14, surface: 'gravel' },  // 60
      { type: 'flat', len: 20, surface: 'ice' },  // 74
      { type: 'flat', len: 14, surface: 'snow' },  // 94
      { type: 'slope', len: 24, dy: 2.5, surface: 'snow' },  // 108
      { type: 'slope', len: 36, dy: -2.5, surface: 'ice' },  // 132
      { type: 'flat', len: 24, surface: 'snow' },  // 168
      { type: 'flat', len: 16, surface: 'gravel' },  // 192
      { type: 'pts', pts: [[11, -3.2], [14, 0], [11, 3.2]], surface: 'wet' },  // 208
      { type: 'flat', len: 18, surface: 'gravel' },  // 244
      { type: 'hills', len: 36, amp: 0.9, waves: 2, surface: 'snow' },  // 262
      { type: 'flat', len: 14, surface: 'snow' },  // 298
      { type: 'pts', pts: [[0.3, -0.3]], surface: 'wet' },  // 312
      { type: 'flat', len: 8, surface: 'wet' },  // 312
      { type: 'flat', len: 18, surface: 'snow' },  // 320
      { type: 'bumps', len: 22, h: 0.25, n: 4, surface: 'mud' },  // 338
      { type: 'flat', len: 26, surface: 'mud' },  // 360
      { type: 'hills', len: 40, amp: 1, waves: 2, surface: 'mud' },  // 386
      { type: 'flat', len: 14, surface: 'snow' },  // 426
      { type: 'slope', len: 26, dy: 3.5, surface: 'snow' },  // 440
      { type: 'slope', len: 34, dy: -3.5, surface: 'snow' },  // 466
      { type: 'flat', len: 24, surface: 'snow' },  // 500
      { type: 'ramp', len: 10, dy: 1.8, surface: 'snow' },  // 524
      { type: 'pts', pts: [[0, -5], [5.5, 0], [0, 3.5]], surface: 'snow' },  // 534
      { type: 'slope', len: 20, dy: -1, surface: 'snow' },  // 540
      { type: 'flat', len: 20, surface: 'snow' },  // 560
      { type: 'flat', len: 28, surface: 'snow' },  // 580
      { type: 'bumps', len: 26, h: 0.3, n: 5, surface: 'gravel' },  // 608
      { type: 'slope', len: 30, dy: 4, surface: 'snow' },  // 634
      { type: 'flat', len: 10, surface: 'snow' },  // 664
      { type: 'slope', len: 44, dy: -5, surface: 'snow' },  // 674
      { type: 'flat', len: 20, surface: 'snow' },  // 718
      { type: 'ramp', len: 14, dy: 2.5, surface: 'snow' },  // 738
      { type: 'pts', pts: [[0, -6.5], [8, 0], [0, 5]], surface: 'snow' },  // 752
      { type: 'slope', len: 24, dy: -2.5, surface: 'snow' },  // 760
      { type: 'hills', len: 50, amp: 1, waves: 3, surface: 'snow' },  // 784
      { type: 'flat', len: 24, surface: 'snow' },  // 834
      { type: 'flat', len: 24, surface: 'ice' },  // 858
      { type: 'flat', len: 30, surface: 'snow' },  // 882
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'eggs', count: 1 }, { type: 'milk', count: 2 }, { type: 'crate', count: 3 }],
  minDelivered: 3,
  parTime: 95, timeLimit: null,
  objects: [
    { type: 'bridge', x: 208, len: 36, planks: 36, weak: [9, 17, 24] },
    { type: 'seesaw', x: 312.3, len: 6 },
    { type: 'barrels', x: 588, cols: 2, rows: 2 },
    { type: 'checkpoint', x: 256 },
    { type: 'checkpoint', x: 436 },
    { type: 'checkpoint', x: 630 },
    { type: 'coins', x: 24, n: 5, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 78, n: 5, spacing: 2.4, h: 1.0 },      // buz yaması
    { type: 'coins', x: 212, n: 8, spacing: 4.0, h: 1.0 },      // köprü üstü
    { type: 'coins', x: 312, n: 4, spacing: 1.3, h: 1.4 },      // tahterevalli üstü
    { type: 'coins', x: 346, n: 6, spacing: 2.0, h: 1.2 },      // çamur
    { type: 'coins', x: 532, n: 4, spacing: 1.4, h: 3.0 },      // kanal atlayışı
    { type: 'coins', x: 594, n: 6, spacing: 2.4, h: 1.2 },
    { type: 'coins', x: 646, n: 6, spacing: 2.4, h: 1.2 },
    { type: 'coins', x: 750, n: 5, spacing: 1.6, h: 3.8 },      // zirve atlayışı: yüksek risk
    { type: 'coins', x: 802, n: 6, spacing: 2.2, h: 1.6 },
  ],
  hints: [
    { x: 4, text: 'Final! Öğrendiğin her şey bu yolda', icon: 'flag' },
    { x: 60, text: 'Buz: hızı önceden ayarla', icon: 'ice' },
    { x: 196, text: 'Asma köprü: yavaş ve düzgün', icon: 'bridge' },
    { x: 290, text: 'Tahterevalli: ortada gazı bırak', icon: 'seesaw' },
    { x: 334, text: 'Çamur: gazı yumuşak ver', icon: 'mud' },
    { x: 508, text: 'Kanal atlayışı: hız şart', icon: 'warn' },
    { x: 572, text: 'Varil yığını: içinden geç', icon: 'barrel' },
    { x: 718, text: 'Son atlayış! Tam gaz, burnu inişe çevir', icon: 'jump' },
  ],
  stars: {
    2: [{ kind: 'delivered', min: 5, label: 'En fazla 1 kargo kaybı' }],
    3: [{ kind: 'deliveredAll', label: '6 kargonun hepsi' }, { kind: 'combo', min: 4, label: '×4 kombo yap' }],
  },
  reward: { base: 320 },
  bot: { speed: 12, zones: [{ x0: 196, x1: 248, speed: 8 }, { x0: 290, x1: 320, speed: 7 }] },
};
