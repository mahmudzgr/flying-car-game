// Bölge 3 / Bölüm 3 — "Kütük Nehri": dinamik platform. İki nehir var; kıyıdan kıyıya yüzen kütükler dizili.
// GÜVENLİ ÇİZGİ: karşı kıyılar 1,5–2 m alçakta ve nehirler dar (6 m ve 8 m): kütüklere hiç inmeden hızla atlayarak da geçilir.
// Kütüklerden geçmek yavaş ve riskli ama kargoyu sarsmaz; kütük bölümü kısa (≤ 8 m).
export default {
  id: '3-3',
  name: 'Kütük Nehri',
  region: 3, order: 3,
  biome: 'bataklik', music: 'bataklik', difficulty: 4,
  teaches: 'Dinamik platform',
  recommended: { vehicle: 'tosun', tier: 2 },

  terrain: {
    surface: 'grass',
    pieces: [
      { type: 'flat', len: 18 },                                          // 0
      { type: 'hills', len: 40, amp: 0.8, waves: 2, surface: 'dirt' },    // 18
      { type: 'flat', len: 14, surface: 'mud' },                          // 58
      { type: 'bumps', len: 24, h: 0.25, n: 4, surface: 'wet' },          // 72  ıslak tahta ısınma
      { type: 'flat', len: 40, surface: 'grass' },                        // 96  kıyıya yaklaş (hız topla)
      { type: 'pts', pts: [[0, -3.8], [6, 0], [0, 2.3]], surface: 'wet' },  // 136 1. NEHİR (6 m; karşı kıyı 1,5 m aşağıda)
      { type: 'flat', len: 30, surface: 'grass' },                        // 142
      { type: 'hills', len: 44, amp: 1.0, waves: 2, surface: 'mud' },     // 172
      { type: 'flat', len: 26, surface: 'dirt' },                         // 216
      { type: 'bumps', len: 28, h: 0.3, n: 5, surface: 'wet' },           // 242
      { type: 'flat', len: 40, surface: 'grass' },                        // 270 2. nehre yaklaşım
      { type: 'pts', pts: [[0, -4], [8, 0], [0, 2]], surface: 'wet' },  // 310 2. NEHİR (8 m; karşı kıyı 1,5 m aşağıda)
      { type: 'flat', len: 26, surface: 'grass' },                        // 318
      { type: 'hills', len: 50, amp: 1.0, waves: 2, surface: 'mud' },     // 344
      { type: 'flat', len: 20, surface: 'dirt' },                         // 394
      { type: 'hills', len: 44, amp: 0.8, waves: 2, surface: 'grass' },   // 414
      { type: 'flat', len: 24, surface: 'wet' },                          // 458
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 3 }, { type: 'milk', count: 2 }],
  minDelivered: 1,
  parTime: 62, timeLimit: null,
  objects: [
    { type: 'water', x: 136, len: 6, y: -1.9 },
    { type: 'logs', x: 136.3, n: 1, w: 5 },
    { type: 'water', x: 310, len: 8, y: -3.9 },
    { type: 'logs', x: 310.2, n: 2, w: 3.7 },
    { type: 'coins', x: 22, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 76, n: 5, spacing: 1.7, h: 1.0 },
    { type: 'coins', x: 133, n: 4, spacing: 1.5, h: 2.4 },      // 1. nehrin üstü: atlayarak toplanır
    { type: 'coins', x: 176, n: 6, spacing: 1.9, h: 1.8 },
    { type: 'coins', x: 246, n: 6, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 307, n: 5, spacing: 1.6, h: 2.8 },      // 2. nehrin üstü (risk–ödül)
    { type: 'coins', x: 350, n: 6, spacing: 1.9, h: 1.6 },
    { type: 'coins', x: 420, n: 6, spacing: 1.8, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Bataklıkta nehir var: kütükler su üstünde yüzer', icon: 'water' },
    { x: 100, text: 'Nehir! Kütükler sallanır. Hızlan ve atla ya da yavaşça kütüğe in', icon: 'water' },
    { x: 280, text: 'İkinci nehir daha geniş: hızını koru', icon: 'warn' },
  ],
  stars: {
    2: [{ kind: 'delivered', min: 4, label: 'En az 4 kargo teslim' }],
    3: [{ kind: 'deliveredAll', label: '5 kargonun hepsi' }, { kind: 'time', max: 75, label: '75 sn altında' }],
  },
  reward: { base: 190 },
  bot: { speed: 9, zones: [{ x0: 100, x1: 136, speed: 14 }, { x0: 272, x1: 310, speed: 15 }] },
};
