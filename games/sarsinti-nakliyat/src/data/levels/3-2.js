// Bölge 3 / Bölüm 2 — "Tahterevalli Tepesi": denge noktası. Tahterevalli, ağırlık merkezi ortayı geçince devrilir:
// yavaş ve düzgün git, tam ortada hafifçe gazı bırak. İlk tahterevalli alçak ve kolay; sonra iki art arda; finalde çift + kısa tepe.
export default {
  id: '3-2',
  name: 'Tahterevalli Tepesi',
  region: 3, order: 2,
  biome: 'bataklik', music: 'bataklik', difficulty: 4,
  teaches: 'Ağırlık aktarımı, denge noktası',

  terrain: {
    surface: 'grass',
    pieces: [
      { type: 'flat', len: 18, surface: 'grass' },  // 0
      { type: 'hills', len: 40, amp: 0.8, waves: 2, surface: 'dirt' },  // 18
      { type: 'flat', len: 20, surface: 'wet' },  // 58
      { type: 'flat', len: 10, surface: 'grass' },  // 78
      { type: 'pts', pts: [[0.3, -0.3]], surface: 'wet' },  // 88 basamak: tahtaya düz giriş
      { type: 'flat', len: 8, surface: 'wet' },  // 88
      { type: 'flat', len: 18, surface: 'grass' },  // 96
      { type: 'bumps', len: 28, h: 0.3, n: 5, surface: 'dirt' },  // 114
      { type: 'slope', len: 22, dy: 2, surface: 'grass' },  // 142
      { type: 'flat', len: 24, surface: 'wet' },  // 164
      { type: 'pts', pts: [[0.3, -0.3]], surface: 'wet' },  // 188 basamak: tahtaya düz giriş
      { type: 'flat', len: 8, surface: 'wet' },  // 188
      { type: 'flat', len: 10, surface: 'grass' },  // 196
      { type: 'pts', pts: [[0.3, -0.3]], surface: 'wet' },  // 206 basamak: tahtaya düz giriş
      { type: 'flat', len: 8, surface: 'wet' },  // 206
      { type: 'flat', len: 8, surface: 'grass' },  // 214
      { type: 'slope', len: 22, dy: -2, surface: 'grass' },  // 222
      { type: 'hills', len: 40, amp: 1, waves: 2, surface: 'dirt' },  // 244
      { type: 'flat', len: 26, surface: 'wet' },  // 284
      { type: 'pts', pts: [[0.3, -0.3]], surface: 'wet' },  // 310 basamak: tahtaya düz giriş
      { type: 'flat', len: 8, surface: 'wet' },  // 310
      { type: 'flat', len: 3, surface: 'wet' },  // 318
      { type: 'pts', pts: [[0.3, -0.3]], surface: 'wet' },  // 321 basamak: tahtaya düz giriş
      { type: 'flat', len: 8, surface: 'wet' },  // 321
      { type: 'flat', len: 14, surface: 'wet' },  // 329
      { type: 'hills', len: 50, amp: 0.9, waves: 2, surface: 'grass' },  // 343
      { type: 'flat', len: 30, surface: 'dirt' },  // 393
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'crate', count: 4 }, { type: 'milk', count: 2 }],
  minDelivered: 2,
  parTime: 60, timeLimit: null,
  checkpoints: [],
  objects: [
    { type: 'seesaw', x: 88, len: 6 },
    { type: 'seesaw', x: 188, len: 6 },
    { type: 'seesaw', x: 206, len: 6 },
    { type: 'seesaw', x: 310, len: 6 },
    { type: 'seesaw', x: 321, len: 6 },
    { type: 'coins', x: 24, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 94, n: 5, spacing: 1.6, h: 1.4 },      // tahterevalli üstü: yavaş gidersen topla
    { type: 'coins', x: 152, n: 5, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 204, n: 5, spacing: 1.6, h: 1.4 },
    { type: 'coins', x: 250, n: 5, spacing: 1.6, h: 1.4 },
    { type: 'coins', x: 306, n: 6, spacing: 2.0, h: 2.0 },
    { type: 'coins', x: 344, n: 8, spacing: 1.6, h: 1.4 },     // çift tahterevalli: en riskli sıra
    { type: 'coins', x: 410, n: 6, spacing: 1.8, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Bu bölümde tahterevalliler var', icon: 'seesaw' },
    { x: 76, text: 'Tahterevalli: ortaya kadar yavaş git, ağırlığın devirir', icon: 'seesaw' },
    { x: 100, text: 'Ortada gazı bırak, denge bulunsun', icon: 'warn' },
    { x: 190, text: 'İki tahterevalli art arda: sakin ol', icon: 'seesaw' },
    { x: 332, text: 'Son: çift tahterevalli! Denge noktasını hatırla', icon: 'warn' },
  ],
  stars: {
    2: [{ kind: 'deliveredAll', label: '6 kargonun hepsi' }],
    3: [{ kind: 'intact', label: 'Hiç hasar ve kayıp yok' }, { kind: 'time', max: 65, label: '65 sn altında' }],
  },
  reward: { base: 190 },
  bot: { speed: 7 },
};
