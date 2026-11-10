// Bölge 1 / Bölüm 4 — "Samanlık Sıçrayışı": mini final. Hava kontrolü ve kombo (↔ gaz = burun yukarı, fren = burun aşağı).
// Akılda kalan an: 3 rampa — 1. güvenli öğretici, 2. orta, 3. büyük "vadi atlayışı" (takla fırsatı, kargo riski).
export default {
  id: '1-4',
  name: 'Samanlık Sıçrayışı',
  region: 1, order: 4,
  biome: 'elma', music: 'elma', difficulty: 2,
  teaches: 'Hava kontrolü, kombo',
  recommended: { vehicle: 'tosun', tier: 1 },   // 16 m vadi: Paşa atlayamaz

  terrain: {
    surface: 'dirt',
    pieces: [
      { type: 'flat', len: 18 },
      { type: 'hills', len: 40, amp: 0.8, waves: 2, surface: 'grass' },
      { type: 'flat', len: 16, surface: 'dirt' },
      // 1. rampa: öğretici — altı düz zemin (çukur yok), güvenle uçulur
      { type: 'ramp', len: 10, dy: 1.6 },
      { type: 'slope', len: 12, dy: -1.6 },
      { type: 'flat', len: 26 },
      { type: 'hills', len: 40, amp: 0.9, waves: 2, surface: 'grass' },
      { type: 'flat', len: 14, surface: 'dirt' },
      // 2. rampa: kısa çukur
      { type: 'ramp', len: 12, dy: 2.0 },
      { type: 'pts', pts: [[0, -6], [4.5, 0], [0, 4]] },          // 4,5 m çukur; karşı yaka 2 m aşağıda (iniş affeder)
      { type: 'slope', len: 16, dy: -2.0 },
      { type: 'flat', len: 30 },
      { type: 'bumps', len: 30, h: 0.3, n: 5 },
      { type: 'flat', len: 24, surface: 'grass' },
      // 3. rampa: büyük vadi atlayışı
      { type: 'ramp', len: 16, dy: 5.0 },                              // dik fırlatma: ≥1,5 sn havada (takla fırsatı)
      { type: 'pts', pts: [[0, -17], [16, 0], [0, 9]] },          // 16 m vadi; karşı yaka 8 m aşağıda (iniş yamacı affeder)
      { type: 'slope', len: 24, dy: -8.0 },                       // ~19° iniş rampası: takla sonrası iniş yönüne eğimli
      { type: 'flat', len: 20, surface: 'dirt' },
      { type: 'hills', len: 60, amp: 0.8, waves: 2, surface: 'grass' },
      { type: 'flat', len: 30, surface: 'asphalt' },
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 2 }, { type: 'bale', count: 1 }],
  minDelivered: 0,                     // takla rotası kargoyu savurur (risk–ödül); güvenli rota kargoyu taşır
  parTime: 46, timeLimit: null,
  objects: [
    { type: 'coins', x: 22, n: 5, spacing: 1.7, h: 1.2 },
    { type: 'coins', x: 76, n: 5, spacing: 1.7, h: 2.2 },         // 1. rampa havası
    { type: 'coins', x: 187, n: 4, spacing: 1.6, h: 3.6 },        // 2. çukurun üstü
    { type: 'coins', x: 245, n: 7, spacing: 1.6, h: 1.0 },        // tümsek dizisi
    { type: 'coins', x: 305, n: 6, spacing: 1.7, h: 4.4 },        // büyük atlayışın tepe noktası (risk–ödül)
    { type: 'coins', x: 395, n: 5, spacing: 1.6, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Bu bölümde rampalar var: havada uç, kombo yap', icon: 'jump' },
    { x: 62, text: 'Rampa: hızını koru. Havada gaz = burun yukarı, fren = aşağı', icon: 'jump' },
    { x: 160, text: 'Çukurlu rampa! Yeterli hız şart', icon: 'warn' },
    { x: 272, text: 'Büyük vadi: hız şart (≥10 m/s). Havada gaza basılı tut: takla!', icon: 'jump' },
  ],
  stars: {
    2: [{ kind: 'flips', min: 1, label: 'Bir takla at' }],
    3: [{ kind: 'flips', min: 1, label: 'Taklayla ×3 kombo' }, { kind: 'combo', min: 3, label: 'Kombo ×3' }, { kind: 'deliveredAll', label: '3 kargonun hepsi' }],
  },
  reward: { base: 90 },
  bot: { speed: 12 },
};
