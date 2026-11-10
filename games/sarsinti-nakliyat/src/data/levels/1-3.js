// Bölge 1 / Bölüm 3 — "Yumurta Seferi": hassas sürüş; hız ↔ güvenlik. Yumurta can = göreli çarpma > 3,5 m/s.
// Akılda kalan an: "Dik İniş" — uzun, hafif dik yamaç; yavaş inersen yumurtalar sağlam, sonunda asfalt rahatlaması.
export default {
  id: '1-3',
  name: 'Yumurta Seferi',
  region: 1, order: 3,
  biome: 'elma', music: 'elma', difficulty: 2,
  teaches: 'Hassas sürüş; hız ↔ güvenlik',

  terrain: {
    surface: 'asphalt',
    pieces: [
      { type: 'flat', len: 16 },
      { type: 'hills', len: 40, amp: 0.7, waves: 1, surface: 'grass' },   // ısınma: yumuşak
      { type: 'flat', len: 12, surface: 'dirt' },
      { type: 'bumps', len: 22, h: 0.2, n: 4, surface: 'wet' },          // tahta tümsekler (alçak ve geniş: güvenli ders)
      { type: 'flat', len: 14, surface: 'dirt' },
      { type: 'slope', len: 36, dy: -5.0, surface: 'dirt' },             // 1. dik iniş (~8°)
      { type: 'bumps', len: 12, h: 0.3, n: 3, surface: 'wet' },          // inişin dibinde tahta eşik: hızlı gelirsen yumurtalar sarsılır
      { type: 'flat', len: 20, surface: 'grass' },                       // nefes + fren payı
      { type: 'bumps', len: 30, h: 0.28, n: 5, surface: 'wet' },         // tahta tümsekler: yavaş geç
      { type: 'flat', len: 12, surface: 'dirt' },
      { type: 'slope', len: 20, dy: 2.5 },
      { type: 'flat', len: 8 },
      { type: 'slope', len: 44, dy: -7.5, surface: 'dirt' },             // 2. dik iniş (~10°): büyük an
      { type: 'bumps', len: 14, h: 0.32, n: 3, surface: 'wet' },         // inişin dibinde ikinci eşik
      { type: 'hills', len: 30, amp: 0.6, waves: 2, surface: 'grass' },
      { type: 'flat', len: 30, surface: 'asphalt' },                     // kısa asfalt: hızlanma ödülü
      { type: 'bumps', len: 26, h: 0.22, n: 4, surface: 'dirt' },
      { type: 'hills', len: 60, amp: 0.8, waves: 2, surface: 'grass' },
      { type: 'flat', len: 24, surface: 'asphalt' },
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'eggs', count: 1 }, { type: 'crate', count: 2 }],
  minDelivered: 1,
  parTime: 50, timeLimit: null,
  objects: [
    { type: 'coins', x: 24, n: 5, spacing: 1.7, h: 1.2 },
    { type: 'coins', x: 94, n: 4, spacing: 1.7, h: 1.0 },
    { type: 'coins', x: 112, n: 6, spacing: 2.0, h: 1.0 },        // inişte: hızlı gidersen yakalamak zor, ama sarsar
    { type: 'coins', x: 234, n: 8, spacing: 2.2, h: 1.2 },        // 2. inişte
    { type: 'coins', x: 330, n: 5, spacing: 1.6, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Yumurtalar kırılgan: sarsıntıdan kaçın', icon: 'eggs' },
    { x: 60, text: 'Tahta tümsekler: yavaş geç, yumurtalar zıplamasın', icon: 'warn' },
    { x: 108, text: 'Dik iniş! Hafif fren, hız sınırlı', icon: 'brake' },
    { x: 214, text: 'Daha dik bir iniş geliyor', icon: 'warn' },
  ],
  stars: {
    2: [{ kind: 'eggs', min: 3, label: 'En az 3 yumurta sağlam' }],
    3: [{ kind: 'eggs', min: 6, label: '6 yumurtanın hepsi sağlam' }, { kind: 'time', max: 56, label: '56 sn altında' }],
  },
  reward: { base: 80 },
  bot: { speed: 9 },
};
