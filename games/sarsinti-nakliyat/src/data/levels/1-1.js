// Bölge 1 / Bölüm 1 — "İlk Sipariş" (TASARIM §7). ÖRNEK BÖLÜM: biçim için docs/MIMARI.md §10'a bakın.
// Yüzeyler: asphalt dirt grass gravel sand mud wet snow ice. Birimler metre; y yukarı; zemin x=0'dan başlar.
export default {
  id: '1-1',
  name: 'İlk Sipariş',
  region: 1, order: 1,
  biome: 'elma',            // art/palette.js biyom anahtarı
  music: 'elma',            // ses ekibinin parça kimliği (null = müzik yok)
  difficulty: 1,
  teaches: 'Gaz/fren, süspansiyon, kargo kayması',

  // Zemin: parçalar soldan sağa eklenir. Her parça: type + parametreler (+ isteğe bağlı surface; verilmezse öncekinin yüzeyi).
  terrain: {
    surface: 'asphalt',
    pieces: [
      { type: 'flat', len: 12 },
      { type: 'hills', len: 40, amp: 1.2, waves: 1, surface: 'dirt' },
      { type: 'flat', len: 20 },
      { type: 'slope', len: 24, dy: 2.5 },
      { type: 'hills', len: 50, amp: 1.0, waves: 2, surface: 'grass' },
      { type: 'slope', len: 20, dy: -2.5 },
      { type: 'flat', len: 20, surface: 'dirt' },
      { type: 'ramp', len: 10, dy: 1.2 },          // küçük rampa
      { type: 'slope', len: 8, dy: -1.2 },
      { type: 'bumps', len: 40, h: 0.35, n: 6, surface: 'dirt' },
      { type: 'hills', len: 60, amp: 0.8, waves: 2, surface: 'grass' },
      { type: 'flat', len: 20, surface: 'asphalt' },
    ],
  },
  spawn: { x: 3 },                         // araç şasi merkezi x (y otomatik)
  finish: { x: 'end' },                    // 'end' = son parçanın sonu; ya da sayı (m)
  cargo: [{ type: 'crate', count: 3 }],    // araca otomatik yerleşir (kapasite aşılırsa uyarı)
  minDelivered: 1,                         // bitişte teslim edilebilir kargo bundan azsa "kargoShort"
  parTime: 40,                             // süre bonusu referansı (sn); timeLimit yoksa serbest
  timeLimit: null,                         // sn; dolunca başarısız
  objects: [
    { type: 'coins', x: 30, n: 5, spacing: 1.6, h: 1.4 },
    { type: 'coins', x: 190, n: 4, spacing: 1.6, h: 1.4 },
  ],
  hints: [
    { x: 4, text: 'Gaza basılı tut: sağ düğme ya da →', icon: 'throttle' },
    { x: 60, text: 'Kasaların kaymasın: tepede gazı bırak', icon: 'cargo' },
  ],
  // Yıldız ölçütleri: ★1 = bitişe ulaş (sayılır). ★2 ve ★3 listedeki TÜM ölçütler. kind'lar MIMARI.md §10.
  stars: {
    2: [{ kind: 'deliveredAll', label: '3 kasadan 3\'ü teslim' }],
    3: [{ kind: 'time', max: 40, label: '40 sn içinde bitir' }],
  },
  reward: { base: 70 },                    // TASARIM §8.3 taban kuruş
  bot: { speed: 12 },                      // tools/bot.mjs sürüş stratejisi ipucu (hedef hız m/s)
};
