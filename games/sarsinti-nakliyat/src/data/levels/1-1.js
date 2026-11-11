// Bölge 1 / Bölüm 1 — "İlk Sipariş" (TASARIM §7). Çok kolay, keyifli ilk deneyim.
// Ritim: kısa düz → ilk tümsek (kargo ilk kez kayar!) → tepeler → yokuş/iniş → küçük rampa → tümsek dizisi → rahat final.
// Yüzeyler: asphalt dirt grass gravel sand mud wet snow ice. Birimler metre; y yukarı; zemin x=0'dan başlar.
export default {
  id: '1-1',
  name: 'İlk Sipariş',
  region: 1, order: 1,
  biome: 'elma',
  music: 'elma',
  difficulty: 1,
  teaches: 'Gaz/fren, süspansiyon, kargo kayması',

  terrain: {
    surface: 'asphalt',
    pieces: [
      { type: 'flat', len: 14 },                                   // nefes: gaz ver, hızlan
      { type: 'bumps', len: 18, h: 0.45, n: 3, surface: 'dirt' },  // ~x=14 (≈6. sn): ilk sarsıntı, "vay, kargo kayıyor!"
      { type: 'flat', len: 5 },
      { type: 'ramp', len: 8, dy: 1.0 },                           // ~x=37 (≈9. sn tam gazda 4. sn): erken küçük havalanma, "vay" anı
      { type: 'slope', len: 8, dy: -1.0 },
      { type: 'flat', len: 4 },
      { type: 'hills', len: 40, amp: 1.2, waves: 1 },
      { type: 'flat', len: 16 },
      { type: 'slope', len: 24, dy: 2.5 },                         // yokuş: hız kaybı, kargo geriye kayar
      { type: 'hills', len: 50, amp: 1.0, waves: 2, surface: 'grass' },
      { type: 'slope', len: 20, dy: -2.5 },
      { type: 'flat', len: 16, surface: 'dirt' },
      { type: 'ramp', len: 10, dy: 1.2 },                          // küçük rampa: ilk "havada kalma"
      { type: 'slope', len: 8, dy: -1.2 },
      { type: 'flat', len: 8 },
      { type: 'bumps', len: 40, h: 0.35, n: 6, surface: 'dirt' },
      { type: 'hills', len: 50, amp: 0.8, waves: 2, surface: 'grass' },
      { type: 'flat', len: 20, surface: 'asphalt' },
    ],
  },
  spawn: { x: 3 },
  finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 3 }],
  minDelivered: 1,
  parTime: 34,
  timeLimit: null,
  objects: [
    { type: 'coins', x: 20, n: 4, spacing: 1.6, h: 1.1 },
    { type: 'coins', x: 88, n: 5, spacing: 1.6, h: 1.6 },     // tepe üstü: yükselirken topla
    { type: 'coins', x: 210, n: 5, spacing: 1.5, h: 1.2 },
    { type: 'coins', x: 228, n: 3, spacing: 1.5, h: 2.4 },    // rampanın havası: hafif risk
    { type: 'coins', x: 260, n: 6, spacing: 1.6, h: 1.0 },
  ],
  hints: [
    { x: 34, text: 'Küçük rampa: kısa bir uçuş!', icon: 'jump' },
    { x: 4, text: 'Gaza basılı tut: sağ düğme ya da →', icon: 'throttle' },
    { x: 11, text: 'Tümsekte kasalar sallanır: gazı biraz bırak', icon: 'cargo' },
    { x: 95, text: 'Yokuşta kasalar geri kayar: hızını koru', icon: 'cargo' },
    { x: 205, text: 'Küçük rampa: hafif uçarsın, kasalar kalsın!', icon: 'jump' },
    { x: 260, text: 'Fren: ← ya da sol düğme. Yumuşak bas.', icon: 'brake' },
  ],
  stars: {
    2: [{ kind: 'deliveredAll', label: '3 kasadan 3\'ü teslim' }],
    3: [{ kind: 'intact', label: 'Kasalar çatlamadan' }, { kind: 'time', max: 30, label: '30 sn içinde bitir' }],
  },
  reward: { base: 70 },
  bot: { speed: 15, zones: [{ x0: 10, x1: 33, speed: 10.5 }, { x0: 248, x1: 295, speed: 11 }] },   // hızlı ama kontrollü: tümseklerde yavaşla
};
