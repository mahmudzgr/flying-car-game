// Bölge 3 / Bölüm 4 — "Balık Pazarı Acelesi": bölge finali, süre sınırı 60 sn. Çamur, ıslak iskele, varil yığınları, rampalar.
// Akılda kalan an: varil dominoları (iskelede devrilen yığın) ve pazar girişine büyük atlayış. Gaza bas, ama çamurda kazıma!
export default {
  id: '3-4',
  name: 'Balık Pazarı Acelesi',
  region: 3, order: 4,
  biome: 'bataklik', music: 'bataklik', difficulty: 4,
  teaches: 'Baskı altında sürüş',
  recommended: { vehicle: 'tosun', tier: 3 },

  terrain: {
    surface: 'wet',
    pieces: [
      { type: 'flat', len: 22 },                                          // 0   iskele başlangıcı
      { type: 'hills', len: 36, amp: 0.7, waves: 2, surface: 'dirt' },    // 22
      { type: 'flat', len: 34, surface: 'wet' },                          // 58  varil yığını 1 (x≈78)
      { type: 'bumps', len: 28, h: 0.25, n: 5, surface: 'wet' },          // 92
      { type: 'flat', len: 14, surface: 'dirt' },                         // 120
      { type: 'flat', len: 26, surface: 'mud' },                          // 134 kısa çamur
      { type: 'hills', len: 44, amp: 1.0, waves: 2, surface: 'dirt' },    // 160
      { type: 'flat', len: 18, surface: 'grass' },                        // 204
      { type: 'ramp', len: 10, dy: 1.8, surface: 'dirt' },                // 222 rampa 1
      { type: 'pts', pts: [[0, -5], [5, 0], [0, 4]], surface: 'wet' },    // 232 kısa kanal (5 m, karşı yaka 1 m aşağıda)
      { type: 'slope', len: 16, dy: -1.0, surface: 'dirt' },              // 237
      { type: 'flat', len: 36, surface: 'wet' },                          // 253 varil yığını 2 (x≈275)
      { type: 'bumps', len: 30, h: 0.3, n: 5, surface: 'mud' },           // 289
      { type: 'flat', len: 16, surface: 'dirt' },                         // 319
      { type: 'hills', len: 50, amp: 1.2, waves: 2, surface: 'grass' },   // 335
      { type: 'flat', len: 30, surface: 'wet' },                          // 385 varil yığını 3 (x≈400)
      { type: 'ramp', len: 14, dy: 2.5, surface: 'dirt' },                // 415 pazar atlayışı
      { type: 'pts', pts: [[0, -7], [8, 0], [0, 5.5]], surface: 'wet' },  // 429 8 m, karşı yaka 1,5 m aşağıda
      { type: 'slope', len: 20, dy: -2.5, surface: 'dirt' },              // 437
      { type: 'flat', len: 20, surface: 'wet' },                          // 457
      { type: 'hills', len: 40, amp: 0.8, waves: 2, surface: 'grass' },   // 477
      { type: 'flat', len: 24, surface: 'asphalt' },                      // 517 pazar
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 6 }],
  minDelivered: 3,
  parTime: 48, timeLimit: 60,
  objects: [
    { type: 'barrels', x: 78, cols: 2, rows: 2 },
    { type: 'barrels', x: 275, cols: 2, rows: 2 },
    { type: 'barrels', x: 400, cols: 2, rows: 3 },
    { type: 'coins', x: 26, n: 5, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 100, n: 6, spacing: 1.8, h: 1.0 },
    { type: 'coins', x: 168, n: 6, spacing: 2.0, h: 1.6 },
    { type: 'coins', x: 230, n: 4, spacing: 1.3, h: 3.0 },     // kanal atlayışı
    { type: 'coins', x: 296, n: 6, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 342, n: 6, spacing: 2.2, h: 2.2 },
    { type: 'coins', x: 428, n: 5, spacing: 1.6, h: 3.8 },     // pazar atlayışı: yüksek risk
    { type: 'coins', x: 484, n: 6, spacing: 1.8, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Süre sınırı: 60 sn! Gaza bas, ama kargoya dikkat', icon: 'timer' },
    { x: 55, text: 'Varil yığını: içinden geç, devrilirler', icon: 'barrel' },
    { x: 128, text: 'Çamurda gazı yumuşak ver, vakit kaybetme', icon: 'mud' },
    { x: 210, text: 'Kanal! Rampadan hızla çık', icon: 'warn' },
    { x: 385, text: 'Pazar girişi: büyük atlayış, hız şart', icon: 'warn' },
  ],
  stars: {
    2: [{ kind: 'delivered', min: 4, label: 'En az 4 kargo teslim' }],
    3: [{ kind: 'time', max: 50, label: '50 sn altında' }],
  },
  reward: { base: 200 },
  bot: { speed: 12 },
};
