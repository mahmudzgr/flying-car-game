// Bölge 2 / Bölüm 2 — "Sallanan Köprü": yavaş sürüş, dinamik yüzey. 36 m halatlı asma köprü; bazı tahtalar zayıf.
// Köprünün altındaki vadi, köprü olmasa da geçilebilecek (dik olmayan yamaçlı) bir çukurdur: nesne henüz uygulanmamışsa
// bölüm yine de bitirilebilir. Akılda kalan an: köprüde dengeli, yavaş geçiş (kargo sarsıntısı + tahta çatırtısı).
export default {
  id: '2-2',
  name: 'Sallanan Köprü',
  region: 2, order: 2,
  biome: 'kanyon', music: 'kanyon', difficulty: 3,
  teaches: 'Yavaş sürüş, dinamik yüzey',

  terrain: {
    surface: 'gravel',
    pieces: [
      { type: 'flat', len: 16 },
      { type: 'hills', len: 40, amp: 1.0, waves: 2 },
      { type: 'flat', len: 14, surface: 'dirt' },
      { type: 'bumps', len: 24, h: 0.3, n: 4, surface: 'wet' },       // ıslak tahta ısınma: kaygan, yavaş geç
      { type: 'flat', len: 12, surface: 'gravel' },
      { type: 'slope', len: 30, dy: 3.0, surface: 'sand' },            // kanyon kenarına tırmanış
      { type: 'hills', len: 30, amp: 1.0, waves: 1, surface: 'gravel' },
      { type: 'flat', len: 20, surface: 'dirt' },                      // köprü girişi: dur, bak, nefes al
      // KÖPRÜ x=186..222 (bridge nesnesi). Altı: yamaçları dik olmayan vadi (köprüsüz de geçilir)
      { type: 'pts', pts: [[11, -3.2], [14, 0], [11, 3.2]], surface: 'wet' },
      { type: 'flat', len: 20, surface: 'dirt' },                      // köprü çıkışı: rahatlama
      { type: 'hills', len: 50, amp: 1.2, waves: 2, surface: 'gravel' },
      { type: 'ramp', len: 8, dy: 1.0 },
      { type: 'slope', len: 12, dy: -1.0 },
      { type: 'bumps', len: 36, h: 0.3, n: 6, surface: 'gravel' },
      { type: 'hills', len: 50, amp: 0.9, waves: 2, surface: 'dirt' },
      { type: 'flat', len: 30, surface: 'asphalt' },
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'watermelon', count: 2 }, { type: 'crate', count: 3 }],
  minDelivered: 2,
  parTime: 55, timeLimit: null,
  objects: [
    { type: 'bridge', x: 186, len: 36, planks: 36, weak: [9, 17, 24] },
    { type: 'coins', x: 22, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 92, n: 4, spacing: 1.6, h: 1.0 },
    { type: 'coins', x: 189, n: 8, spacing: 4.0, h: 1.0 },        // köprü üstü: yavaş gidersen hepsini toplarsın
    { type: 'coins', x: 250, n: 5, spacing: 1.7, h: 1.2 },
    { type: 'coins', x: 291, n: 4, spacing: 1.6, h: 2.2 },        // rampa: küçük risk
    { type: 'coins', x: 360, n: 6, spacing: 1.7, h: 1.0 },
  ],
  hints: [
    { x: 4, text: 'Kanyon kenarı: dikkatli sür', icon: 'info' },
    { x: 52, text: 'Islak tahta kaygan: yavaş geç', icon: 'warn' },
    { x: 150, text: 'Köprü geliyor! Yavaş ve düzgün sür', icon: 'bridge' },
    { x: 178, text: 'Bazı tahtalar zayıf: gaza abanma, tahtalar çatırdar', icon: 'bridge' },
    { x: 226, text: 'Geçtin! Şimdi biraz hızlan', icon: 'info' },
  ],
  stars: {
    2: [{ kind: 'deliveredAll', label: 'Köprüden sonra 5 kargonun 5\'i teslim' }],
    3: [{ kind: 'bridgeIntact', label: 'Köprüyü sağlam bırak' }, { kind: 'intact', label: 'Kargo kaybı ve hasarı yok' }],
  },
  reward: { base: 120 },
  bot: { speed: 9, zones: [{ x0: 0, x1: 14, speed: 4 }, { x0: 178, x1: 226, speed: 6 }] },   // yumuşak kalkış + köprüde yavaş
};
