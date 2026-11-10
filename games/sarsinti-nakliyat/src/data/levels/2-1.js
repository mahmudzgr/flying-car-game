// Bölge 2 / Bölüm 1 — "Kum Geçidi": yeni mekanik = yüzey farkı. Kum yüksek yuvarlanma direnci taşır (momentum!).
// Önce asfalt/çakılda hız kazan, sonra kum: ilk kum kısa ve düz (güvenli ders), sonra kum tepeleri (sınama).
// Akılda kalan an: dev kum tepesi — hızla çıkarsan geçersin, yavaşlarsan geri vites ya da küreme.
export default {
  id: '2-1',
  name: 'Kum Geçidi',
  region: 2, order: 1,
  biome: 'kanyon', music: 'kanyon', difficulty: 2,
  teaches: 'Yüzey farkı, momentum, patinaj',

  terrain: {
    surface: 'asphalt',
    pieces: [
      { type: 'flat', len: 18 },
      { type: 'hills', len: 30, amp: 0.8, waves: 1, surface: 'gravel' },   // 18: çakıl, yeni yüzey, hafif titreşim
      { type: 'flat', len: 14, surface: 'dirt' },
      { type: 'flat', len: 26, surface: 'sand' },                          // 62: GÜVENLİ ilk kum: düz, hız düşer
      { type: 'flat', len: 18, surface: 'gravel' },                        // dinlen, toparlan
      { type: 'hills', len: 60, amp: 1.5, waves: 2, surface: 'sand' },     // 106: kum tepeleri: momentum
      { type: 'flat', len: 16, surface: 'gravel' },
      { type: 'slope', len: 16, dy: -2.0, surface: 'dirt' },               // inişte hız topla
      { type: 'slope', len: 30, dy: 4.0, surface: 'sand' },                // 198: büyük kum yamacı (~7.5°)
      { type: 'slope', len: 24, dy: -4.0, surface: 'sand' },
      { type: 'flat', len: 18, surface: 'gravel' },
      { type: 'hills', len: 80, amp: 2.0, waves: 3, surface: 'sand' },     // 270: zirve, 3 dev tepe
      { type: 'flat', len: 22, surface: 'dirt' },
      { type: 'bumps', len: 40, h: 0.3, n: 6, surface: 'gravel' },
      { type: 'flat', len: 12, surface: 'dirt' },
      { type: 'hills', len: 56, amp: 1.4, waves: 2, surface: 'sand' },     // son kum
      { type: 'flat', len: 30, surface: 'gravel' },
      { type: 'flat', len: 24, surface: 'asphalt' },
    ],
  },
  spawn: { x: 3 }, finish: { x: 'end' },
  cargo: [{ type: 'milk', count: 5 }],
  minDelivered: 2,
  parTime: 50, timeLimit: null,
  objects: [
    { type: 'coins', x: 22, n: 5, spacing: 1.7, h: 1.1 },
    { type: 'coins', x: 76, n: 5, spacing: 1.8, h: 1.0 },       // güvenli ilk kum
    { type: 'coins', x: 150, n: 4, spacing: 2.2, h: 2.4 },       // kum tepesinin üstü (zıpla)
    { type: 'coins', x: 235, n: 6, spacing: 1.8, h: 1.1 },
    { type: 'coins', x: 330, n: 5, spacing: 2.0, h: 2.8 },       // 3. dalganın tepesi: momentumla ulaşılır
    { type: 'coins', x: 395, n: 5, spacing: 1.6, h: 1.1 },
  ],
  hints: [
    { x: 4, text: 'Kızıl Kanyon: kum ve çakıl seni yavaşlatır', icon: 'sand' },
    { x: 40, text: 'Çakıl sarsar ama tutunursun', icon: 'info' },
    { x: 64, text: 'Kum! Hızın düşer: gazı kesme, momentum önemli', icon: 'sand' },
    { x: 110, text: 'Kum tepeleri: yamaca hızla gir', icon: 'warn' },
    { x: 190, text: 'Büyük kum yamacı: önce inişte hız topla', icon: 'warn' },
    { x: 290, text: 'Tekerlek kazıyorsa gazı biraz kıs', icon: 'info' },
  ],
  stars: {
    2: [{ kind: 'deliveredAll', label: '5 bidonun hepsi teslim' }],
    3: [{ kind: 'time', max: 50, label: '50 sn içinde' }, { kind: 'noReverse', label: 'Geri vites kullanma' }],
  },
  reward: { base: 110 },
  bot: { speed: 12 },
};
