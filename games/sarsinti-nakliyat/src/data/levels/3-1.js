// Bölge 3 / Bölüm 1 — "Çamur Banyosu": gaz modülasyonu ve çekiş. Çamurda yüksek gazla tekerlek kazır; hız yüksek rolling direnci yüzünden düşer.
// Sıra: kısa güvenli çamur (öğren) → çamur tepeleri → ıslak tahta molası → derin çamur yamacı (sınama) → son çamur gölü.
// Paşa'nın bölümü: çekiş kralı çamurda en rahat o geçer.
export default {
  id: '3-1',
  name: 'Çamur Banyosu',
  region: 3, order: 1,
  biome: 'bataklik', music: 'bataklik', difficulty: 3,
  teaches: 'Gaz modülasyonu, tekerlek kazıması',
  recommended: { vehicle: 'tosun', tier: 1 },

  terrain: {
    surface: 'grass',
    pieces: [
      { type: 'flat', len: 18 },                                          // 0
      { type: 'hills', len: 36, amp: 0.7, waves: 2, surface: 'dirt' },    // 18
      { type: 'flat', len: 12, surface: 'dirt' },                         // 54
      { type: 'flat', len: 24, surface: 'mud' },                          // 66  GÜVENLİ ilk çamur (düz)
      { type: 'flat', len: 16, surface: 'grass' },                        // 90  dinlen
      { type: 'hills', len: 60, amp: 1.0, waves: 2, surface: 'mud' },     // 106 çamur tepeleri
      { type: 'flat', len: 14, surface: 'dirt' },                         // 166
      { type: 'bumps', len: 24, h: 0.25, n: 4, surface: 'wet' },          // 180 ıslak tahta molası
      { type: 'flat', len: 14, surface: 'grass' },                        // 204
      { type: 'slope', len: 30, dy: 3.0, surface: 'mud' },                // 218 derin çamur yamacı (~6°)
      { type: 'flat', len: 12, surface: 'dirt' },                         // 248
      { type: 'slope', len: 24, dy: -3.0, surface: 'mud' },               // 260
      { type: 'flat', len: 18, surface: 'grass' },                        // 284
      { type: 'hills', len: 70, amp: 1.2, waves: 3, surface: 'mud' },     // 302 zirve: uzun çamur dalgaları
      { type: 'flat', len: 16, surface: 'dirt' },                         // 372
      { type: 'bumps', len: 30, h: 0.3, n: 5, surface: 'mud' },           // 388
      { type: 'flat', len: 16, surface: 'grass' },                        // 418
      { type: 'hills', len: 50, amp: 1.0, waves: 2, surface: 'mud' },     // 434 son çamur gölü
      { type: 'flat', len: 20, surface: 'dirt' },                         // 484
      { type: 'hills', len: 40, amp: 0.8, waves: 2, surface: 'grass' },   // 504
      { type: 'flat', len: 20, surface: 'wet' },                          // 544
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 3 }, { type: 'milk', count: 3 }],
  minDelivered: 2,
  parTime: 70, timeLimit: null,
  objects: [
    { type: 'coins', x: 22, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 70, n: 5, spacing: 1.8, h: 1.0 },
    { type: 'coins', x: 120, n: 6, spacing: 2.0, h: 1.8 },      // çamur tepeleri üstü
    { type: 'coins', x: 222, n: 6, spacing: 2.2, h: 1.0 },      // yamaç yolu: hız tutarak topla
    { type: 'coins', x: 320, n: 8, spacing: 2.2, h: 2.6 },      // dev dalgaların tepesi
    { type: 'coins', x: 392, n: 6, spacing: 1.8, h: 1.2 },
    { type: 'coins', x: 450, n: 6, spacing: 1.9, h: 1.0 },
  ],
  hints: [
    { x: 4, text: 'Sisli Bataklık: çamur seni yutar', icon: 'mud' },
    { x: 60, text: 'Çamur! Gazı yumuşak ver, tekerlek kazımasın', icon: 'mud' },
    { x: 100, text: 'Kazıyorsan gazı kıs, sonra tekrar ver', icon: 'info' },
    { x: 205, text: 'Derin çamur yamacı: hızla gir, gazı bırakma', icon: 'warn' },
    { x: 298, text: 'Uzun çamur dalgaları: ritmi bul', icon: 'mud' },
  ],
  stars: {
    2: [{ kind: 'noReverse', label: 'Geri vitese basma' }],
    3: [{ kind: 'deliveredAll', label: '6 kargonun hepsi' }, { kind: 'time', max: 70, label: '70 sn altında' }],
  },
  reward: { base: 170 },
  bot: { speed: 9 },
};
