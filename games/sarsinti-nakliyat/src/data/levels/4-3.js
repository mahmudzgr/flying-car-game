// Bölge 4 / Bölüm 3 — "Piyano Taşıma": ağır yük dinamiği. 180 kg'lık piyano ağırlık merkezini yükseltir ve arkaya bindirir;
// yokuşta arkaya, inişte öne kayar, sarsıntıda süspansiyonu ezer. Hasar: 8 m/s üstü darbe piyanoyu "kırık" yapar (değer %50).
// Ritim: yumuşak başlangıç → karlı yokuş → buz yaması (frensiz bölüm) → rampa/atlayış → yavaş final tümsekleri.
// Önerilen araç: Koca (ağır yük). Tosun ile de bitirilebilir, ama dikkat ister.
export default {
  id: '4-3',
  name: 'Piyano Taşıma',
  region: 4, order: 3,
  biome: 'zirve', music: 'zirve', difficulty: 5,
  teaches: 'Ağır yük dinamiği',
  recommended: { vehicle: 'koca', tier: 2 },

  terrain: {
    surface: 'snow',
    pieces: [
      { type: 'flat', len: 20 },                                          // 0
      { type: 'hills', len: 40, amp: 0.7, waves: 2, surface: 'snow' },    // 20
      { type: 'flat', len: 16, surface: 'gravel' },                       // 60
      { type: 'slope', len: 30, dy: 3.0, surface: 'snow' },               // 76  yokuş: piyano arkaya biner
      { type: 'flat', len: 14, surface: 'snow' },                         // 106
      { type: 'slope', len: 34, dy: -3.0, surface: 'snow' },              // 120 iniş: piyano öne biner
      { type: 'flat', len: 22, surface: 'snow' },                         // 154
      { type: 'flat', len: 24, surface: 'ice' },                          // 176 BUZ YAMASI (düz): frenlenemez
      { type: 'flat', len: 20, surface: 'snow' },                         // 200
      { type: 'bumps', len: 30, h: 0.25, n: 5, surface: 'snow' },         // 220 sarsıntı: yavaş geç
      { type: 'flat', len: 16, surface: 'gravel' },                       // 250
      { type: 'ramp', len: 8, dy: 1.2, surface: 'snow' },                 // 266 küçük rampa (piyano "havada")
      { type: 'slope', len: 12, dy: -1.2, surface: 'snow' },              // 274
      { type: 'flat', len: 20, surface: 'snow' },                         // 286
      { type: 'slope', len: 36, dy: 4.0, surface: 'snow' },               // 306 dik yokuş
      { type: 'flat', len: 12, surface: 'snow' },                         // 342
      { type: 'slope', len: 40, dy: -4.0, surface: 'snow' },              // 354 dik iniş
      { type: 'flat', len: 26, surface: 'snow' },                         // 394
      { type: 'bumps', len: 36, h: 0.3, n: 6, surface: 'gravel' },        // 420 final tümsekleri
      { type: 'hills', len: 50, amp: 0.9, waves: 2, surface: 'snow' },    // 456
      { type: 'flat', len: 30, surface: 'snow' },                         // 506
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'piano', count: 1 }, { type: 'crate', count: 2 }],
  minDelivered: 1,
  parTime: 68, timeLimit: null,
  objects: [
    { type: 'coins', x: 24, n: 5, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 80, n: 5, spacing: 2.0, h: 1.2 },
    { type: 'coins', x: 124, n: 6, spacing: 2.2, h: 1.1 },
    { type: 'coins', x: 178, n: 5, spacing: 2.4, h: 1.0 },      // buz yaması
    { type: 'coins', x: 224, n: 6, spacing: 1.8, h: 1.2 },
    { type: 'coins', x: 266, n: 4, spacing: 1.4, h: 2.4 },      // küçük rampa: piyano riski
    { type: 'coins', x: 310, n: 6, spacing: 2.2, h: 1.5 },
    { type: 'coins', x: 424, n: 6, spacing: 1.8, h: 1.2 },
    { type: 'coins', x: 470, n: 6, spacing: 2.0, h: 1.5 },
  ],
  hints: [
    { x: 4, text: 'Piyano ağır: ani gaz ve fren yok', icon: 'piano' },
    { x: 66, text: 'Yokuşta piyano arkaya biner: gazı koru', icon: 'piano' },
    { x: 112, text: 'İnişte piyano öne biner: hafif frenle', icon: 'brake' },
    { x: 165, text: 'Buz yaması: fren yok, hızını önceden ayarla', icon: 'ice' },
    { x: 212, text: 'Tümsekler piyanoyu kırar: yavaş geç', icon: 'warn' },
    { x: 410, text: 'Son tümsekler: piyano sağlam kalsın', icon: 'piano' },
  ],
  stars: {
    2: [{ kind: 'intact', label: 'Piyano sağlam teslim' }],
    3: [{ kind: 'intact', label: 'Piyano ve kasalar sağlam' }, { kind: 'time', max: 70, label: '70 sn altında' }],
  },
  reward: { base: 280 },
  bot: { speed: 8 },
};
