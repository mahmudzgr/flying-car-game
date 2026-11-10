// Sarsıntı Nakliyat — TÜM ayar değerleri burada (TASARIM §4, §5, §8). Hepsi "ayarlanacak" başlangıç değeridir.
// Sahip: Çekirdek. Sim, render, ses ve arayüz bu dosyayı OKUR; çalışma zamanında değiştirmez.
// Birimler: metre, saniye, kilogram, radyan, N·m. Yön: x sağ, y YUKARI, açı saat yönünün tersi (CCW) pozitif.

export const SAVE_KEY = 'sarsinti.v1';

/** Fizik dünyası ve sabit adım. */
export const SIM = {
  step: 1 / 120,            // sabit simülasyon adımı (s)
  velocityIterations: 8,
  positionIterations: 3,
  gravity: -9.81,
  cargoGravityScale: 1.15,  // kargoya hafif ek yerçekimi (TASARIM §4.5)
  maxFrameDt: 0.05,         // main.js: bir karede en fazla bu kadar gerçek zaman ilerletilir (spiral önleme)
  maxBodies: 70,
  chainEdge: 1.0,           // zemin poliçizgisi kenar uzunluğu (≤1,2 m)
  startWallHeight: 8,       // bölüm başında geri çıkışı engelleyen duvar
  killDepth: 14,            // en alçak zeminin bu kadar altı = uçurum çizgisi (killY)
  roundCargoDamping: 1.5,   // yuvarlak kargo (karpuz/balya) yuvarlanma sönümü
  settleTime: 0.5,          // başlangıçta aracın yere oturması için hareketsiz bırakıldığı süre (sn, saat durur)
};

/** Çarpışma kategorileri (planck filterCategoryBits/maskBits). */
export const CAT = { ground: 0x1, chassis: 0x2, wheel: 0x4, cargo: 0x8, driver: 0x10, object: 0x20 };

/** Yüzeyler (TASARIM §4.3). mu = etkin sürtünme; rolling = tekerlek angularDamping. */
export const SURFACES = {
  asphalt: { id: 'asphalt', name: 'Asfalt', mu: 1.0, rolling: 0.10, sink: 0 },
  dirt:    { id: 'dirt',    name: 'Toprak yol', mu: 0.80, rolling: 0.25, sink: 0.015 },
  grass:   { id: 'grass',   name: 'Çimen', mu: 0.70, rolling: 0.35, sink: 0.03 },
  gravel:  { id: 'gravel',  name: 'Çakıl', mu: 0.75, rolling: 0.30, sink: 0.04, shake: true },
  sand:    { id: 'sand',    name: 'Kum', mu: 0.60, rolling: 1.20, sink: 0.25, },
  mud:     { id: 'mud',     name: 'Çamur', mu: 0.55, rolling: 1.60, sink: 0.35 },
  wet:     { id: 'wet',     name: 'Islak kaya / tahta', mu: 0.50, rolling: 0.15, sink: 0 },
  snow:    { id: 'snow',    name: 'Kar', mu: 0.35, rolling: 0.70, sink: 0.1 },
  ice:     { id: 'ice',     name: 'Buz', mu: 0.12, rolling: 0.05, sink: 0 },
  water:   { id: 'water',   name: 'Su', mu: 0, rolling: 3.0, deadly: 1.5 /* sn */ }, // P1
};
// sink: yumuşak zeminde hızla orantılı ek sürükleme (N / (kg·m/s)); kum/çamur hızı gerçekten sınırlar.
export const AIR_ROLLING = 0.05;       // havadaki tekerleğin angularDamping'i
export const WHEELSPIN_SLIP = 3;       // m/s: teker çevresel hızı − zemin hızı eşiği (wheelspin olayı)

/**
 * Araçlar (TASARIM §4.2, §5). Şasi yerel koordinatı: orijin = şasi kutusunun merkezi, +x = ileri (burun), +y = yukarı.
 * implemented=false olanlar yalnızca veridir (P1); sim bunları kurmayı reddeder.
 */
export const VEHICLES = {
  tosun: {
    id: 'tosun', name: 'Tosun', kind: 'Pikap', implemented: true,
    unlock: { stars: 0, coins: 0 },
    stats: { speed: 3, traction: 3, balance: 3, capacity: 3, air: 3 },
    mass: 1100, comY: -0.12,              // comY: kütle merkezinin kutu merkezine göre alçaltılması
    inertia: 1350,                        // kg·m² (TASARIM §4.2 hava torku kontrolü)
    // Şasi parçaları (fizik fikstürü + çizim ipucu). role: body | cab | roof | rail
    parts: [
      { part: 'chassis', x: 0,     y: 0,    w: 3.6, h: 0.9 },
      { part: 'cab',     x: 1.2,   y: 0.9,  w: 1.0, h: 0.9 },
      { part: 'roof',    x: 1.2,   y: 1.4,  w: 0.9, h: 0.1 },
      { part: 'chassis', x: -1.75, y: 0.68, w: 0.1, h: 0.46 },  // arka kapak (kenarlık)
    ],
    wheels: [
      { id: 'rear',  x: -1.25, y: -0.35, driven: true },
      { id: 'front', x: 1.25,  y: -0.35, driven: false },
    ],
    wheelR: 0.38, wheelMass: 35,
    freqHz: 1.7, zeta: 0.55, travel: [-0.14, 0.14],
    motorTorque: 1300, maxWheelSpeed: 52, brakeTorque: 3600,
    airTorque: 5500, airMaxW: 7, grip: 1.0, drag: 0.55, pitchGain: 3.0,
    capacity: 6,
    bay: { x0: -1.68, x1: 0.68, floorY: 0.45, rail: 0.46 },          // kargo bölmesi (şasi yerel)
    seat: { x: 1.15, y: 0.8 },                                     // sürücü gövdesi merkezi (şasi yerel)
  },
  zipir: {
    id: 'zipir', name: 'Zıpır', kind: 'Bagi', implemented: true,
    unlock: { stars: 12, coins: 1100 },
    stats: { speed: 5, traction: 4, balance: 2, capacity: 1, air: 5 },
    mass: 600, comY: -0.1, inertia: 520,
    parts: [
      { part: 'chassis', x: 0,    y: 0,    w: 2.6, h: 0.7 },
      { part: 'roof',    x: 0.65, y: 1.5,  w: 1.3, h: 0.08 },    // roll kafesi tavanı
      { part: 'cab',     x: 1.15, y: 0.95, w: 0.1, h: 1.2 },     // ön ayak
      { part: 'cab',     x: 0.15, y: 0.95, w: 0.1, h: 1.2 },     // arka ayak
      { part: 'chassis', x: -1.28, y: 0.6,  w: 0.08, h: 0.5 },   // arka kenarlık
    ],
    wheels: [
      { id: 'rear',  x: -1.1, y: -0.15, driven: true },
      { id: 'front', x: 1.1,  y: -0.15, driven: true },
    ],
    wheelR: 0.42, wheelMass: 25,
    freqHz: 2.6, zeta: 0.35, travel: [-0.22, 0.22],
    motorTorque: 1100, maxWheelSpeed: 62, brakeTorque: 2400,
    airTorque: 3200, airMaxW: 9, grip: 0.95, drag: 0.35, pitchGain: 1.5,
    capacity: 3,
    bay: { x0: -1.22, x1: 0.08, floorY: 0.35, rail: 0.5 },
    seat: { x: 0.65, y: 0.7 },
  },
  pasa: {
    id: 'pasa', name: 'Paşa', kind: 'Traktör + römork', implemented: true,
    unlock: { stars: 22, coins: 2200 },
    stats: { speed: 1, traction: 5, balance: 4, capacity: 4, air: 1 },
    mass: 1500, comY: -0.2, inertia: 1100,
    parts: [
      { part: 'chassis', x: 0,    y: 0,    w: 2.8, h: 1.0 },
      { part: 'cab',     x: 0.1,  y: 1.0,  w: 1.2, h: 0.9 },
      { part: 'roof',    x: 0.1,  y: 1.5,  w: 1.1, h: 0.1 },
      { part: 'chassis', x: 1.1,  y: 0.45, w: 0.6, h: 0.5 },    // motor kaputu
    ],
    wheels: [
      { id: 'rear',  x: -0.95, y: -0.06, r: 0.62, mass: 70, driven: true },
      { id: 'front', x: 1.2,   y: -0.30, r: 0.38, mass: 30, driven: false },
    ],
    wheelR: 0.38, wheelMass: 30,
    freqHz: 1.5, zeta: 0.70, travel: [-0.10, 0.10], motorTorque: 3400, maxWheelSpeed: 18, brakeTorque: 5000,
    airTorque: 6500, airMaxW: 3, grip: 1.2, drag: 0.45, pitchGain: 2.0, capacity: 10,
    seat: { x: 0.1, y: 0.95 },
    trailer: {                      // eklemli römork (kargo burada). Yerel orijin = bağlantı (kanca) noktası
      mass: 300, inertia: 500, comX: -1.9, comY: 0, hitch: { x: -1.5, y: 0.08 }, hitchLimit: 0.9,
      freqHz: 1.6, zeta: 0.6, travel: [-0.12, 0.12],
      parts: [
        { part: 'trailer', x: -2.0,  y: 0.0,  w: 3.6, h: 0.25 },    // yük tabanı
        { part: 'trailer', x: -3.75, y: 0.35, w: 0.1, h: 0.7 },     // arka kapak
        { part: 'trailer', x: -0.3,  y: 0.35, w: 0.1, h: 0.7 },     // ön duvar
        { part: 'trailer', x: -0.7,  y: -0.1, w: 1.4, h: 0.1 },     // çeki demiri
      ],
      wheels: [{ id: 'trailer', x: -2.9, y: -0.30, r: 0.45, mass: 40 }],
      bay: { x0: -3.68, x1: -0.35, floorY: 0.125, rail: 0.7 },
    },
  },
  koca: {
    id: 'koca', name: 'Koca', kind: 'Kamyon', implemented: true,
    unlock: { stars: 34, coins: 3600 },
    stats: { speed: 2, traction: 4, balance: 5, capacity: 5, air: 1 },
    mass: 3200, comY: -0.25, inertia: 10000,
    parts: [
      { part: 'chassis', x: 0,    y: 0,    w: 6.0, h: 1.3 },
      { part: 'cab',     x: 2.15, y: 1.15, w: 1.5, h: 1.0 },
      { part: 'roof',    x: 2.15, y: 1.7,  w: 1.4, h: 0.1 },
      { part: 'chassis', x: -2.95, y: 1.0, w: 0.1, h: 0.7 },       // arka kapak
    ],
    wheels: [
      { id: 'front', x: 2.3,  y: -0.50, driven: false },
      { id: 'rear',  x: -1.7, y: -0.50, driven: true },
      { id: 'rear2', x: -2.8, y: -0.50, driven: true },
    ],
    wheelR: 0.55, wheelMass: 80,
    freqHz: 1.3, zeta: 0.80, travel: [-0.12, 0.14], motorTorque: 5200, maxWheelSpeed: 27, brakeTorque: 9000,
    airTorque: 12000, airMaxW: 2.5, grip: 1.05, drag: 0.90, pitchGain: 3.0, capacity: 10,
    bay: { x0: -2.9, x1: 1.2, floorY: 0.65, rail: 0.7 },
    seat: { x: 2.1, y: 1.15 },
  },
};
export const VEHICLE_ORDER = ['tosun', 'zipir', 'pasa', 'koca'];

/** Sürücü Fındık (TASARIM §4.1). */
export const DRIVER = {
  torso: { w: 0.35, h: 0.55, mass: 45 },
  head: { r: 0.17, mass: 5, offsetY: 0.40 },   // gövde merkezine göre
  seatLimit: 0.35, neckLimit: 0.6,
  headHitSpeed: 6,                              // m/s (TASARIM §9)
  failDelay: 0.6,                               // kafa vuruşundan başarısızlığa kadar (sn, oyun zamanı)
};

/** Kargo türleri (TASARIM §4.4). shape: 'box' (w,h) | 'circle' (r). */
export const CARGO = {
  crate:      { id: 'crate',      name: 'Kasa',          shape: 'box', w: 0.7, h: 0.7, mass: 25,  restitution: 0.1,  friction: 0.6, hp: 1, hitSpeed: Infinity, value: { base: 20, perHp: 0 } },
  watermelon: { id: 'watermelon', name: 'Karpuz',        shape: 'circle', r: 0.20,  mass: 6,   restitution: 0.25, friction: 0.5, hp: 1, hitSpeed: 9, value: { base: 25, perHp: 0 } },
  eggs:       { id: 'eggs',       name: 'Yumurta kolisi', shape: 'box', w: 0.6, h: 0.3, mass: 1.5, restitution: 0.1, friction: 0.5, hp: 6, hitSpeed: 3.5, maxHitDamage: 2, value: { base: 15, perHp: 10 } },
  milk:       { id: 'milk',       name: 'Süt bidonu',    shape: 'box', w: 0.4, h: 0.7, mass: 20,  restitution: 0.1,  friction: 0.5, hp: 1, hitSpeed: Infinity, value: { base: 22, perHp: 0 } },
  piano:      { id: 'piano',      name: 'Piyano',        shape: 'box', w: 1.5, h: 1.1, mass: 180, restitution: 0.1,  friction: 0.6, hp: 2, hitSpeed: 8, value: { base: 0, perHp: 75 } }, // hp 1 = "kırık" (%50)
  bale:       { id: 'bale',       name: 'Balya',         shape: 'circle', r: 0.45,  mass: 40,  restitution: 0.05, friction: 0.9, hp: 1, hitSpeed: Infinity, value: { base: 18, perHp: 0 } },
};
/** Kargo kaybı kuralları (TASARIM §4.4). */
export const CARGO_LOSS = { behindDist: 8, restTime: 2, restDist: 4, deliverRadius: 6 };

/** Engel/nesne türleri (TASARIM §4.4). */
export const OBJECTS = {
  barrel: { w: 0.6, h: 0.9, mass: 30, friction: 0.5, restitution: 0.1 },
  rock:   { mass: 600, friction: 0.8, restitution: 0.1 },        // r bölüm verisinden
  coin:   { r: 0.25, value: 5 },
  plank:  { w: 1.0, h: 0.2, mass: 30 },                          // köprü tahtası
  seesaw: { len: 8.0, h: 0.3, mass: 200, limit: 0.45, rest: 0.22, damping: 2.0 },   // rest: sol uç yerdeyken eğim (rad); zemin teması gerçek aralığı belirler
};

/** Köprü, kar topu, su, kütük ayarları (TASARIM §4.4, §7). */
export const PROPS = {
  bridge: { weakForce: 12000 },  // N: zayıf tahtaya binen temas kuvveti tepesi bu değeri aşarsa tahta kopar (yavaş: ~9,5 kN, hızlı: ~17 kN)
  snowball: { r: 1.6, behind: 14, v0: 6, v1: 12, ramp: 40 },     // kovalayan top: başlangıç/son hız (m/s), ramp sn
  // Yüzen kütük: arcade "su" — yoğunluk gerçekçi (1000) değil; kütük araç ağırlığında çok batmasın. tether: yatay yay (N/m), dragX/dragY: sönüm (N·sn/m), angDamp: dönme sönümü.
  log: { w: 4.0, h: 0.9, mass: 360, tether: 4000, dragX: 80, dragY: 500, angDamp: 1.5 },
  water: { deadly: 1.5, density: 1000, bodyDrag: 800 },
};

/** Başarısızlık eşikleri (TASARIM §9). */
export const RULES = {
  flipAngle: 2.09,        // rad (~120°)
  flipSpeed: 1.0,         // m/s altı
  flipTime: 2.0,          // sn
  reverseDelay: 0.25,     // fren basılı + durduktan sonra geri vites gecikmesi
  reverseSpeedFrac: 0.35, // geri vites hız oranı
  airborneDebounce: 0.1,  // sn: tüm tekerlekler havadayken "havada" sayılması
  wheelieAngle: 0.25,     // rad
  badLandingSpeed: 6,     // şasi çarpması > bu ⇒ kombo yanar
  slowmo: { headHit: { scale: 0.35, duration: 1.0 }, finish: { scale: 0.5, duration: 0.5 } },
  stuckTime: 5,           // sn: gaz/fren basılıyken kıpırdamama ⇒ 'stuck' başarısızlığı
  finishHold: 1.0,        // bitişten sonra sim'in "won" durumda bile adımlamaya devam edeceği süre ipucu (sn)
};

/** Puanlama (TASARIM §8.1–8.2). */
export const SCORING = {
  perMeter: 1, cargoMult: 10, intactBonus: 0.25, timeBonusPerSec: 10,
  airPerSec: 20, airMin: 0.6, flip: 150, wheeliePerSec: 40, wheelieMin: 1.0,
  cargoAir: 100, cargoAirMin: 0.8, nearMiss: 60,
  comboWindow: 3, comboMaxMult: 5,       // çarpan = 1 + floor(sayaç/2), en çok 5
};

/** Ekonomi (TASARIM §8.3–8.4, §5). */
export const ECONOMY = {
  starBonus: [40, 80, 150],       // ★1/★2/★3 ilk kazanış
  repeatFactor: 0.5,
  scoreToCoins: 20, coinsCap: 300,
  pickupCoin: 5,
  startCoins: 0,
  upgradeCost: [100, 180, 300, 480],   // kademe 1..4
  upgradeMaxLevel: 4,
  resetRefund: 1.0,
};
export const UPGRADE_LINES = ['motor', 'suspansiyon', 'lastik'];
/** Kademe başına etki (TASARIM §8.4). upgrades.js uygular. */
export const UPGRADE_EFFECT = {
  motor:       { torque: 0.10, speed: 0.03 },
  suspansiyon: { freq: 0.04, zeta: 0.05, travel: 0.06 },
  lastik:      { grip: 0.05, softRolling: -0.07 },   // softRolling: kum/çamurda yuvarlanma direnci
};

/** Bölgeler (TASARIM §7). */
export const REGIONS = [
  { id: 1, name: 'Elma Vadisi',     biome: 'elma',   unlockStars: 0 },
  { id: 2, name: 'Kızıl Kanyon',    biome: 'kanyon', unlockStars: 5 },
  { id: 3, name: 'Sisli Bataklık',  biome: 'bataklik', unlockStars: 14, p1: true },
  { id: 4, name: 'Zirve Köyü',      biome: 'zirve',  unlockStars: 24, p1: true },
];

/** Kamera ve görüntü varsayılanları (TASARIM §11). Grafik ekibi okur/ayarlar. */
export const CAMERA = {
  widthMin: 24, widthMax: 32,   // görünür dünya genişliği (m)
  followHalfLife: 0.25,          // sn
  lookAhead: 0.25,               // hız yönünde ekran oranı
  anchorX: 0.33,                 // araç ekranın soluna doğru (0..1)
  maxDpr: 2,
};

/** Uzun Yol (sonsuz mod) ayarları (TASARIM §6). Mesafeler metre. */
export const ENDLESS = {
  genAhead: 260,          // araçtan bu kadar ileriye kadar zemin üretilir (teslim aralığından büyük: ileride hep bir bayrak vardır)
  spawnAhead: 80,         // dinamik nesneler (varil, köprü, kütük...) araç bu kadar yaklaşınca kurulur (gövde bütçesi)
  keepBehind: 60,         // araçtan bu kadar geride kalan nesne/kargo/zemin gövdesi yok edilir
  trimBehind: 90,         // zemin dizisi (görsel) bu kadar geriden kırpılır; fizik parçaları keepBehind'da atılır
  tickEvery: 10,          // üretim/temizlik denetimi kaç adımda bir (teslim denetimi her adım)
  startLen: 30,           // başlangıç düzlüğü
  biomeLen: 400,          // her 400 m'de biyom değişir (elma → kanyon → bataklik → zirve → …)
  deliveryEvery: 150,     // teslim noktası aralığı (m)
  padLen: 18,             // teslim düzlüğü uzunluğu
  difficultyScale: 1500,  // zorluk = 1 − e^(−mesafe/ölçek)
  cargoStart: 3,          // ilk yükte kargo sayısı; her `cargoStep` teslimde +1 (araç kapasitesine kadar)
  cargoStep: 2,
  payFactor: 1,           // teslim kuruşu = sağlam kargo değeri × payFactor
  deliveredLinger: 3,     // teslim edilen kargo gövdesi bu kadar sn sonra yok edilir
  lostLinger: 6,          // kaybedilen kargo gövdesi bu kadar sn sonra (ya da arkada kalınca) yok edilir
  goneDelay: 0.8,         // son kargo kaybından 'cargoGone' bitişine (sn)
};
