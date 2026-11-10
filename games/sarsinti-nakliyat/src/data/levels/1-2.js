// Bölge 1 / Bölüm 2 — "Karpuz Mevsimi": yuvarlanan kargo; ağırlık aktarımı ve yumuşak fren (sınama: 1-1'in öğrettiği kayma).
// Akılda kalan an: iki küçük çukur arasındaki "karpuz atlayışı" ve uzun tümsek dizisi.
export default {
  id: '1-2',
  name: 'Karpuz Mevsimi',
  region: 1, order: 2,
  biome: 'elma', music: 'elma', difficulty: 1.5,
  teaches: 'Ağırlık aktarımı, yumuşak fren',

  terrain: {
    surface: 'dirt',
    pieces: [
      { type: 'flat', len: 16 },
      { type: 'bumps', len: 30, h: 0.3, n: 4 },                   // ilk tümsekler: karpuzlar zıplar
      { type: 'flat', len: 18 },
      { type: 'slope', len: 20, dy: 2.0 },                        // yokuş: karpuzlar geri yuvarlanır
      { type: 'flat', len: 12, surface: 'grass' },
      { type: 'slope', len: 20, dy: -2.0 },                       // iniş: fren dersi (karpuzlar öne yuvarlanır)
      { type: 'flat', len: 18, surface: 'dirt' },
      { type: 'pts', pts: [[2, -0.55], [0.8, 0], [2, 0.55]] },  // 1. çukur: ≤17° kenarlı sığ hendek (sürerek çıkılır; yavaş geçersen karpuzlar sarsılır)
      { type: 'flat', len: 20 },
      { type: 'bumps', len: 60, h: 0.35, n: 8 },                  // uzun tümsek dizisi: zirve
      { type: 'flat', len: 16, surface: 'grass' },
      { type: 'pts', pts: [[2.4, -0.8], [1, 0], [2.4, 0.8]] },        // 2. çukur: biraz daha derin hendek
      { type: 'flat', len: 14 },
      { type: 'hills', len: 60, amp: 1.0, waves: 2, surface: 'grass' },
      { type: 'slope', len: 20, dy: -1.5 },
      { type: 'flat', len: 40, surface: 'dirt' },
      { type: 'hills', len: 50, amp: 0.7, waves: 2 },
      { type: 'flat', len: 20, surface: 'asphalt' },
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'watermelon', count: 6 }],
  minDelivered: 3,
  parTime: 40, timeLimit: null,
  objects: [
    { type: 'coins', x: 20, n: 5, spacing: 1.6, h: 1.2 },
    { type: 'coins', x: 118, n: 4, spacing: 1.6, h: 1.1 },
    { type: 'coins', x: 137, n: 4, spacing: 1.2, h: 2.6 },        // 1. çukurun üstü: atlayıp topla
    { type: 'coins', x: 168, n: 8, spacing: 1.7, h: 1.0 },        // tümsek dizisinin üstü
    { type: 'coins', x: 242, n: 4, spacing: 1.2, h: 2.9 },        // 2. çukur (daha geniş) üstü
    { type: 'coins', x: 290, n: 6, spacing: 1.6, h: 1.2 },
  ],
  hints: [
    { x: 4, text: 'Karpuzlar yuvarlanır: yumuşak gaz, yumuşak fren', icon: 'cargo' },
    { x: 58, text: 'Yokuşta gaz kısma: karpuzlar geri yuvarlanır', icon: 'cargo' },
    { x: 97, text: 'İnişte frene hafif bas: karpuzlar öne kaçar', icon: 'brake' },
    { x: 122, text: 'Önde hendek! Yumuşak geç, karpuzlar zıplamasın', icon: 'warn' },
    { x: 232, text: 'Bir hendek daha, biraz daha derin', icon: 'warn' },
  ],
  stars: {
    2: [{ kind: 'delivered', min: 5, label: 'En az 5 karpuz teslim' }],
    3: [{ kind: 'deliveredAll', label: '6 karpuzun hepsi' }, { kind: 'time', max: 45, label: '45 sn içinde' }],
  },
  reward: { base: 75 },
  bot: { speed: 11 },
};
