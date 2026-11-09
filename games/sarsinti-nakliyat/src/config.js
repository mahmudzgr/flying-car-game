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
  asphalt: { id: 'asphalt', name: 'Asfalt', mu: 1.0, rolling: 0.10 },
  dirt:    { id: 'dirt',    name: 'Toprak yol', mu: 0.80, rolling: 0.25 },
  grass:   { id: 'grass',   name: 'Çimen', mu: 0.70, rolling: 0.35 },
  gravel:  { id: 'gravel',  name: 'Çakıl', mu: 0.75, rolling: 0.30, shake: true },
  sand:    { id: 'sand',    name: 'Kum', mu: 0.60, rolling: 1.20, softAbove: 10 /* m/s üstünde ek sürükleme */ },
  mud:     { id: 'mud',     name: 'Çamur', mu: 0.55, rolling: 1.60 },
  wet:     { id: 'wet',     name: 'Islak kaya / tahta', mu: 0.50, rolling: 0.15 },
  snow:    { id: 'snow',    name: 'Kar', mu: 0.35, rolling: 0.70 },
  ice:     { id: 'ice',     name: 'Buz', mu: 0.12, rolling: 0.05 },
  water:   { id: 'water',   name: 'Su', mu: 0, rolling: 3.0, deadly: 1.5 /* sn */ }, // P1
};
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
      { part: 'cab',     x: 1.1,   y: 0.7,  w: 1.2, h: 0.5 },
      { part: 'roof',    x: 1.1,   y: 1.0,  w: 1.0, h: 0.1 },
      { part: 'chassis', x: -1.75, y: 0.68, w: 0.1, h: 0.46 },  // arka kapak (kenarlık)
    ],
    wheels: [
      { id: 'rear',  x: -1.25, y: -0.35, driven: true },
      { id: 'front', x: 1.25,  y: -0.35, driven: false },
    ],
    wheelR: 0.38, wheelMass: 35,
    freqHz: 1.7, zeta: 0.55, travel: [-0.14, 0.14],
    motorTorque: 1300, maxWheelSpeed: 52, brakeTorque: 1800,
    airTorque: 5500, airMaxW: 7, grip: 1.0, drag: 0.55, pitchGain: 2.5,
    capacity: 6,
    bay: { x0: -1.68, x1: 0.48, floorY: 0.45, rail: 0.46 },          // kargo bölmesi (şasi yerel)
    seat: { x: 1.0, y: 0.95 },                                     // sürücü gövdesi merkezi (şasi yerel)
  },
  zipir: {
    id: 'zipir', name: 'Zıpır', kind: 'Bagi', implemented: true,
    unlock: { stars: 12, coins: 1100 },
    stats: { speed: 5, traction: 4, balance: 2, capacity: 1, air: 5 },
    mass: 600, comY: -0.1, inertia: 520,
    parts: [
      { part: 'chassis', x: 0,    y: 0,    w: 2.6, h: 0.7 },
      { part: 'roof',    x: 0.3,  y: 1.15, w: 1.0, h: 0.08 },    // roll kafesi tavanı
      { part: 'cab',     x: 0.8,  y: 0.75, w: 0.1, h: 0.8 },     // ön ayak
      { part: 'cab',     x: -0.2, y: 0.75, w: 0.1, h: 0.8 },     // arka ayak
      { part: 'chassis', x: -1.28, y: 0.5,  w: 0.08, h: 0.3 },   // arka kenarlık
    ],
    wheels: [
      { id: 'rear',  x: -1.1, y: -0.15, driven: true },
      { id: 'front', x: 1.1,  y: -0.15, driven: true },
    ],
    wheelR: 0.42, wheelMass: 25,
    freqHz: 3.2, zeta: 0.35, travel: [-0.22, 0.22],
    motorTorque: 1100, maxWheelSpeed: 62, brakeTorque: 1200,
    airTorque: 3200, airMaxW: 9, grip: 0.95, drag: 0.35, pitchGain: 1.5,
    capacity: 3,
    bay: { x0: -1.22, x1: -0.3, floorY: 0.35, rail: 0.3 },
    seat: { x: 0.3, y: 0.85 },
  },
  pasa: {
    id: 'pasa', name: 'Paşa', kind: 'Traktör + römork', implemented: false,
    unlock: { stars: 22, coins: 2200 },
    stats: { speed: 1, traction: 5, balance: 4, capacity: 4, air: 1 },
    mass: 1500, trailerMass: 300, wheelbase: 2.2, wheelRFront: 0.38, wheelRRear: 0.62,
    freqHz: 1.6, zeta: 0.70, travel: [-0.10, 0.10], motorTorque: 2600, maxWheelSpeed: 18, brakeTorque: 2400,
    airTorque: 6500, airMaxW: 3, grip: 1.2, drag: 0.45, capacity: 10,
  },
  koca: {
    id: 'koca', name: 'Koca', kind: 'Kamyon', implemented: false,
    unlock: { stars: 34, coins: 3600 },
    stats: { speed: 2, traction: 4, balance: 5, capacity: 5, air: 1 },
    mass: 3200, wheelbase: 4.0, wheelR: 0.55,
    freqHz: 1.4, zeta: 0.80, travel: [-0.10, 0.12], motorTorque: 4200, maxWheelSpeed: 27, brakeTorque: 4000,
    airTorque: 12000, airMaxW: 2.5, grip: 1.05, drag: 0.90, capacity: 10,
  },
};
export const VEHICLE_ORDER = ['tosun', 'zipir', 'pasa', 'koca'];

/** Sürücü Fındık (TASARIM §4.1). */
export const DRIVER = {
  torso: { w: 0.35, h: 0.55, mass: 45 },
  head: { r: 0.17, mass: 5, offsetY: 0.45 },   // gövde merkezine göre
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
  plank:  { w: 1.0, h: 0.2, mass: 30 },                          // P1 (köprü)
  seesaw: { len: 8.0, h: 0.3, mass: 200, limit: 0.45 },          // P1
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
