// Bölge 2 / Bölüm 4 — "Kanyon Atlayışı": bölge finali. Önceki üç dersi birleştirir: kum (momentum), kaygan tahta/çakıl, rampa-hava.
// Hız kazanma ve iniş açısı: 1. çukur (6 m) ısınma; sonra kum tepelerinden hız kaybet, uzun inişle toparla, düz asfaltta tam gaz,
// dev kanyon atlayışı (12 m, karşı yaka 2,5 m aşağıda) — iniş yamacı atlayışı affeder, ama yetersiz hız = uçuruma düşüş.
// Akılda kalan an: kanyonun üstünden uçuş (takla fırsatı) ve geniş çukurun üstündeki jeton sırası.
export default {
  id: '2-4',
  name: 'Kanyon Atlayışı',
  region: 2, order: 4,
  biome: 'kanyon', music: 'kanyon', difficulty: 3,
  teaches: 'Hız kazanma, iniş açısı',
  recommended: { vehicle: 'tosun', tier: 1 },   // 12 m'lik dev çukur: Paşa atlayamaz

  terrain: {
    surface: 'gravel',
    pieces: [
      { type: 'flat', len: 18 },                                              // 0
      { type: 'hills', len: 44, amp: 1.0, waves: 2 },                         // 18
      { type: 'flat', len: 14, surface: 'dirt' },                             // 62
      { type: 'flat', len: 28, surface: 'sand' },                             // 76  kum: hız düşer
      { type: 'bumps', len: 30, h: 0.3, n: 5, surface: 'gravel' },            // 104 sarsıntı: yumurta için dikkat
      { type: 'flat', len: 40, surface: 'dirt' },                             // 134 1. çukur için hız topla
      { type: 'ramp', len: 12, dy: 2.0, surface: 'gravel' },                  // 174
      { type: 'gap', len: 6, depth: 7 },                                      // 186 1. ÇUKUR (6 m, ısınma)
      { type: 'slope', len: 18, dy: -2.0, surface: 'gravel' },                // 192
      { type: 'flat', len: 20, surface: 'dirt' },                             // 210
      { type: 'hills', len: 56, amp: 1.5, waves: 2, surface: 'sand' },        // 230 kum tepeleri: hız kaybı
      { type: 'flat', len: 16, surface: 'gravel' },                           // 286
      { type: 'slope', len: 20, dy: 3.0, surface: 'gravel' },                 // 302 tepeye çık
      { type: 'slope', len: 54, dy: -6.0, surface: 'gravel' },                // 322 UZUN İNİŞ: hız kazan
      { type: 'flat', len: 44, surface: 'asphalt' },                          // 376 tam gaz: hız şartı
      { type: 'ramp', len: 16, dy: 3.5, surface: 'asphalt' },                 // 420 (~12°: yüksek fırlatma)
      { type: 'pts', pts: [[0, -13], [12, 0], [0, 10.5]], surface: 'gravel' }, // 436 DEV ÇUKUR (12 m; karşı kenar 2,5 m aşağıda)
      { type: 'slope', len: 28, dy: -4.0, surface: 'gravel' },                // 447 iniş rampası: açıyı yakala
      { type: 'flat', len: 26, surface: 'dirt' },                             // 475
      { type: 'bumps', len: 28, h: 0.3, n: 5, surface: 'gravel' },            // 501
      { type: 'hills', len: 60, amp: 1.1, waves: 2, surface: 'dirt' },        // 529
      { type: 'flat', len: 30, surface: 'asphalt' },                          // 589
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'eggs', count: 1 }, { type: 'crate', count: 5 }],
  minDelivered: 1,
  parTime: 52, timeLimit: null,
  objects: [
    { type: 'coins', x: 22, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 80, n: 5, spacing: 1.8, h: 1.0 },
    { type: 'coins', x: 184, n: 4, spacing: 1.5, h: 2.8 },        // 1. çukur
    { type: 'coins', x: 236, n: 6, spacing: 1.8, h: 2.6 },        // kum tepeleri
    { type: 'coins', x: 340, n: 8, spacing: 2.2, h: 1.0 },        // uzun inişte
    { type: 'coins', x: 430, n: 8, spacing: 2.0, h: 4.4 },        // DEV çukur üstü: tepe nokta ödülü (risk)
    { type: 'coins', x: 480, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 540, n: 6, spacing: 1.7, h: 1.2 },
  ],
  hints: [
    { x: 4, text: 'Kanyon finali: hızlan, atla, kargoyu koru', icon: 'jump' },
    { x: 78, text: 'Kumda hız düşer; sonrası için hız topla', icon: 'sand' },
    { x: 150, text: 'Çukur! Rampadan hızla çık', icon: 'warn' },
    { x: 300, text: 'Uzun iniş: gazı kökle, asfaltta tam hıza çık', icon: 'jump' },
    { x: 400, text: 'DEV ÇUKUR! Hız şart. Havada burnu iniş yamacına çevir', icon: 'warn' },
    { x: 478, text: 'Kargon sağlam mı? Son düzlük!', icon: 'cargo' },
  ],
  stars: {
    2: [{ kind: 'delivered', min: 4, label: 'En az 4 kargo teslim' }],
    3: [{ kind: 'flips', min: 1, label: 'Bir takla at' }, { kind: 'noHit', label: 'Sert iniş yok' }, { kind: 'delivered', min: 5, label: '5+ kargo teslim' }],
  },
  reward: { base: 140 },
  bot: { speed: 15 },
};
