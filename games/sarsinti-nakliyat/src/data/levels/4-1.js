// Bölge 4 / Bölüm 1 — "Buz Pateni": buz kontrolü ve frenleme planı. Buzda (μ 0,12) gaz ve fren neredeyse etkisizdir:
// hızı buza GİRMEDEN ayarla. Buz yalnızca düz ya da inişte; yokuşlar karlı (tutunur). Önce kısa güvenli buz, sonra kıvrımlı buz, finalde uzun buz inişi.
export default {
  id: '4-1',
  name: 'Buz Pateni',
  region: 4, order: 1,
  biome: 'zirve', music: 'zirve', difficulty: 4,
  teaches: 'Buz kontrolü',
  recommended: { vehicle: 'tosun', tier: 3 },

  terrain: {
    surface: 'snow',
    pieces: [
      { type: 'flat', len: 20 },                                          // 0
      { type: 'hills', len: 40, amp: 0.8, waves: 2 },                     // 20  kar: ısınma
      { type: 'flat', len: 12, surface: 'gravel' },                       // 60
      { type: 'flat', len: 22, surface: 'ice' },                          // 72  GÜVENLİ ilk buz (düz, kısa)
      { type: 'flat', len: 18, surface: 'snow' },                         // 94
      { type: 'slope', len: 22, dy: 2.5, surface: 'snow' },               // 112 karlı yokuş
      { type: 'slope', len: 36, dy: -2.5, surface: 'ice' },               // 134 buz inişi: hızlanırsın, frenin yok
      { type: 'flat', len: 28, surface: 'snow' },                         // 170 kar: frenlenme alanı
      { type: 'hills', len: 44, amp: 0.9, waves: 2, surface: 'ice' },     // 198 buz kıvrımları (hafif)
      { type: 'flat', len: 20, surface: 'snow' },                         // 242
      { type: 'bumps', len: 26, h: 0.25, n: 4, surface: 'snow' },         // 262
      { type: 'slope', len: 26, dy: 3.5, surface: 'snow' },               // 288 tepeye çık
      { type: 'flat', len: 12, surface: 'snow' },                         // 314
      { type: 'slope', len: 54, dy: -3.5, surface: 'ice' },               // 326 UZUN BUZ İNİŞİ (zirve)
      { type: 'flat', len: 30, surface: 'ice' },                          // 380 buz düzlüğü: kayarak ilerle
      { type: 'flat', len: 26, surface: 'snow' },                         // 410 kar: toparlan
      { type: 'hills', len: 44, amp: 0.8, waves: 2, surface: 'ice' },     // 436
      { type: 'flat', len: 20, surface: 'snow' },                         // 480
      { type: 'hills', len: 30, amp: 0.6, waves: 1, surface: 'snow' },    // 500
      { type: 'flat', len: 20, surface: 'snow' },                         // 530
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 3 }, { type: 'milk', count: 2 }],
  minDelivered: 1,
  parTime: 60, timeLimit: null,
  objects: [
    { type: 'coins', x: 24, n: 5, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 74, n: 5, spacing: 2.2, h: 1.0 },       // güvenli buz üstü
    { type: 'coins', x: 138, n: 6, spacing: 2.6, h: 1.0 },      // buz inişi: kayarken topla
    { type: 'coins', x: 204, n: 6, spacing: 2.2, h: 1.6 },
    { type: 'coins', x: 266, n: 5, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 330, n: 8, spacing: 3.0, h: 1.0 },      // uzun buz inişi: hızlıyken
    { type: 'coins', x: 442, n: 6, spacing: 2.2, h: 1.4 },
    { type: 'coins', x: 505, n: 5, spacing: 1.8, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Zirve Köyü: kar ve buz. Buzda fren işe yaramaz', icon: 'ice' },
    { x: 56, text: 'Buz! Hızı buza girmeden ayarla', icon: 'ice' },
    { x: 125, text: 'Buz inişi: gaza basma, kayarak in', icon: 'warn' },
    { x: 305, text: 'Uzun buz inişi: tepeden yavaş çık', icon: 'warn' },
    { x: 395, text: 'Karda frenle, buzda frenleme', icon: 'brake' },
  ],
  stars: {
    2: [{ kind: 'deliveredAll', label: '5 kargonun hepsi' }],
    3: [{ kind: 'time', max: 60, label: '60 sn altında' }, { kind: 'noHit', label: 'Sert çarpma yok' }],
  },
  reward: { base: 260 },
  bot: { speed: 9 },
};
