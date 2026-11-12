// Milimetrik Park — ayarlar ve araç verileri.
// Birimler: metre, kilogram, saniye, newton, radyan. Dünya: x sağa, y AŞAĞI; açı saat yönünde pozitif.

export const SAVE_KEY = 'milimetrik.v1';

/** Fizik adımı (sn). 240 Hz: düşük hızda hassas, ince duvarlardan geçme yok. */
export const DT = 1 / 240;
export const GRAVITY = 9.81;

const deg = (d) => (d * Math.PI) / 180;

/** Tüm araçlarda ortak varsayılanlar. */
const BASE = {
  tireMu: 0.95,             // kuru asfalt tepe sürtünmesi
  tireMuSlide: 0.78,        // kilitli / kayan lastik
  corneringStiffness: 16,   // yük başına viraj sertliği (1/rad): Cα = 16 · Fz
  wheelRadius: 0.31,
  tireWidth: 0.2,
  creepSpeed: 1.9,          // sürünme kuvvetinin sıfırlandığı hız (m/s); denge ≈ 6 km/h
  vmaxFwd: 46,
  vmaxRev: 8.5,             // geri vites devir sınırı ≈ 30 km/h
  engineBrake: 380,
  engineBrakeK: 45,
  brakeBias: 0.68,          // önde frenleme payı
  rollingResistance: 0.013,
  rollFront: 0.56,          // yanal yük aktarımında ön pay
  lockDeg: 450,             // direksiyon simidi: merkezden kilide (kilitten kilide 2,5 tur)
  steerRate0: 0.42,         // klavye: basınca başlangıç hızı (1/sn) — kısa dokunuş ince ayar
  steerRateMax: 1.8,        // klavye: basılı tutunca çıkılan en yüksek hız
  steerAccel: 2.6,          // klavye: hızlanma (1/sn²)
  steerRateAbs: 3.4,        // dokunmatik/kol: hedefe yaklaşma sınırı (1/sn)
  centerFwd: 0.24,          // ileri giderken kendini toplama: hız (m/s) başına 1/sn
  centerRev: 0.02,          // geri giderken neredeyse hiç toplamaz
  idleRpm: 800,
  maxRpm: 6200,
  chamferF: 0.3,
  chamferR: 0.2,
  trailer: null,
};

/**
 * Oyuncu araçları. Ölçüler gerçek araç sınıflarına yakın; dönüş çapı (dış ön teker, kaldırımdan kaldırıma)
 * maxSteer ile ayarlıdır. model: çizim biçimi (render/art.js).
 */
export const VEHICLES = {
  kumru: {
    ...BASE, id: 'kumru', name: 'Kumru', kind: 'Şehir aracı', model: 'mini', color: '#1fb5ad', roof: '#f2f2ef',
    length: 3.62, width: 1.68, wheelbase: 2.36, overhangF: 0.7, overhangR: 0.56, track: 1.44,
    cgToFront: 0.95, cgHeight: 0.52, mass: 960, inertia: 1150, maxSteer: deg(34.3),
    wheelRadius: 0.28, tireWidth: 0.18, drive: 'fwd',
    creepForce: 700, maxDriveForce: 3300, power: 52000, powerRev: 18000, brakeForce: 8000, dragArea: 0.6,
    chamferF: 0.34, chamferR: 0.26, turning: 9.6, unlock: { stars: 0, price: 0 },
  },
  serce: {
    ...BASE, id: 'serce', name: 'Serçe', kind: 'Hatchback', model: 'hatch', color: '#ff5a2c', roof: '#ffffff', stripe: true,
    length: 4.15, width: 1.78, wheelbase: 2.55, overhangF: 0.85, overhangR: 0.75, track: 1.52,
    cgToFront: 1.05, cgHeight: 0.55, mass: 1250, inertia: 2000, maxSteer: deg(34),
    drive: 'fwd', creepForce: 900, maxDriveForce: 4300, power: 66000, powerRev: 22000, brakeForce: 10500, dragArea: 0.66,
    turning: 10.4, unlock: { stars: 0, price: 0 },
  },
  marti: {
    ...BASE, id: 'marti', name: 'Martı', kind: 'Sedan', model: 'sedan', color: '#2d5385',
    length: 4.68, width: 1.82, wheelbase: 2.7, overhangF: 0.92, overhangR: 1.06, track: 1.56,
    cgToFront: 1.12, cgHeight: 0.53, mass: 1420, inertia: 2650, maxSteer: deg(34),
    wheelRadius: 0.32, tireWidth: 0.21, drive: 'fwd',
    creepForce: 1000, maxDriveForce: 4900, power: 85000, powerRev: 26000, brakeForce: 12000, dragArea: 0.62,
    chamferF: 0.32, chamferR: 0.24, turning: 11.0, unlock: { stars: 12, price: 600 },
  },
  baykus: {
    ...BASE, id: 'baykus', name: 'Baykuş', kind: 'SUV (4×4)', model: 'suv', color: '#3f6b4a',
    length: 4.6, width: 1.9, wheelbase: 2.7, overhangF: 0.92, overhangR: 0.98, track: 1.62,
    cgToFront: 1.25, cgHeight: 0.72, mass: 1680, inertia: 3200, maxSteer: deg(32.7),
    wheelRadius: 0.35, tireWidth: 0.23, drive: 'awd', tireMu: 0.93, rollFront: 0.55,
    creepForce: 1250, maxDriveForce: 6800, power: 115000, powerRev: 32000, brakeForce: 14000, dragArea: 0.85,
    chamferF: 0.26, chamferR: 0.18, turning: 11.4, unlock: { stars: 30, price: 1200 },
  },
  pelikan: {
    ...BASE, id: 'pelikan', name: 'Pelikan', kind: 'Minibüs', model: 'minibus', color: '#f3c623',
    length: 5.7, width: 2.02, wheelbase: 3.5, overhangF: 0.95, overhangR: 1.25, track: 1.72,
    cgToFront: 1.75, cgHeight: 0.85, mass: 2650, inertia: 7600, maxSteer: deg(37.1),
    wheelRadius: 0.35, tireWidth: 0.22, drive: 'rwd', lockDeg: 540, steerRateMax: 1.5,
    creepForce: 1750, maxDriveForce: 8000, power: 100000, powerRev: 30000, brakeForce: 21500, dragArea: 1.6, vmaxFwd: 40,
    centerFwd: 0.2, idleRpm: 750, maxRpm: 4200, rpmRatios: [0, 70, 42, 30, 23, 18],
    chamferF: 0.2, chamferR: 0.12, turning: 13.0, unlock: { stars: 45, price: 1800 },
  },
  kervan: {
    ...BASE, id: 'kervan', name: 'Kervan', kind: 'Kamyonet + römork', model: 'pickup', color: '#d8dde2',
    length: 5.3, width: 1.98, wheelbase: 3.1, overhangF: 0.95, overhangR: 1.25, track: 1.66,
    cgToFront: 1.35, cgHeight: 0.8, mass: 2300, inertia: 6100, maxSteer: deg(34.3),
    wheelRadius: 0.36, tireWidth: 0.22, drive: 'rwd', lockDeg: 540, steerRateMax: 1.5,
    creepForce: 1700, maxDriveForce: 8500, power: 105000, powerRev: 32000, brakeForce: 19500, dragArea: 1.4, vmaxFwd: 38,
    idleRpm: 750, maxRpm: 4200, rpmRatios: [0, 72, 44, 31, 24, 19],
    chamferF: 0.22, chamferR: 0.1, turning: 12.4, unlock: { stars: 60, price: 2500 },
    trailer: {
      hitchBehind: 0.25,      // çeki topu, arka tamponun gerisinde
      drawbar: 1.15,          // kasanın önünden çeki demirine
      boxLength: 3.6, width: 1.95,
      axleFromHitch: 3.15,    // çeki noktasından römork dingiline
      track: 1.75, mass: 850, inertia: 1500,
      wheelRadius: 0.33, tireWidth: 0.2, tireMu: 0.95, corneringStiffness: 15,
      limitDeg: 75,           // makaslama sınırı (çekici–römork açısı)
      color: '#c9ced3',
    },
  },
};

export const VEHICLE_ORDER = ['kumru', 'serce', 'marti', 'baykus', 'pelikan', 'kervan'];
/** Geriye uyum (eski kod ve testler). */
export const CARS = VEHICLES;
export const PLAYER_CAR = 'serce';

/** Boyalar (garaj). Her aracın kendi rengi ücretsizdir. */
export const PAINTS = [
  { id: 'turuncu', name: 'Turuncu', color: '#ff5a2c', price: 200 },
  { id: 'kirmizi', name: 'Kırmızı', color: '#d62f2f', price: 200 },
  { id: 'bordo', name: 'Bordo', color: '#7c1d2b', price: 250 },
  { id: 'sari', name: 'Sarı', color: '#f3c623', price: 200 },
  { id: 'yesil', name: 'Yeşil', color: '#3f8f4f', price: 200 },
  { id: 'orman', name: 'Orman', color: '#3f6b4a', price: 250 },
  { id: 'turkuaz', name: 'Turkuaz', color: '#1fb5ad', price: 250 },
  { id: 'mavi', name: 'Mavi', color: '#2f6fd6', price: 200 },
  { id: 'lacivert', name: 'Lacivert', color: '#2d5385', price: 250 },
  { id: 'mor', name: 'Mor', color: '#7b4bb7', price: 300 },
  { id: 'pembe', name: 'Pembe', color: '#ff7eb6', price: 300 },
  { id: 'beyaz', name: 'Beyaz', color: '#f2f2ef', price: 150 },
  { id: 'gumus', name: 'Gümüş', color: '#b9c0c7', price: 150 },
  { id: 'siyah', name: 'Siyah', color: '#1e2226', price: 200 },
  { id: 'krem', name: 'Krem', color: '#e8dcc0', price: 250 },
  { id: 'altin', name: 'Altın', color: '#d4a63a', price: 800 },
];

/** Ekonomi (jeton). */
export const ECONOMY = {
  levelBase: 20, perStar: 15, newStar: 40, perfect: 30,
  valetPerCar: 12, valetQuality: 0.3,
  dailyBase: 120, dailyStreak: 20, dailyStreakMax: 7,
  examPass: 150,
};

/** Hasar puanları (%). */
export const DAMAGE = {
  touch: 1,               // < 1 km/h temas (sürtme)
  perKmh: 5,              // çarpma: km/h başına
  min: 3,
  scrapePerMeter: 7,      // sürtünerek ilerleme
  cone: 2,
  curbKmh: 4,             // bu hızın üstündeki kaldırım vuruşu jant hasarı verir
  curbPerKmh: 2,
};

/** Puan: açı, yanal ve boyuna konum. */
export const SCORE = {
  angleScale: 5,          // derece
  latScale: 0.25,         // m
  longScale: 0.6,         // m
  wAngle: 0.45,
  wLat: 0.4,
  wLong: 0.15,
  perfect: 95,
};

/** Zemin sürtünme çarpanları (lastik μ ile çarpılır). */
export const SURFACES = {
  asphalt: 1, floor: 0.98, concrete: 1, sidewalk: 0.95, ramp: 0.97,
  steel: 0.85, gravel: 0.72, grass: 0.62, puddle: 0.55, oil: 0.35,
};

/** Ortamlar: hava ve ışık. grip: tüm zeminlerde çarpan. */
export const ENVS = {
  day: { grip: 1, dark: 0 },
  dusk: { grip: 1, dark: 0.35, tint: 'rgba(255,140,60,0.12)' },
  night: { grip: 1, dark: 0.86 },
  rain: { grip: 0.78, dark: 0.18, rain: true },
  storm: { grip: 0.74, dark: 0.82, rain: true },
  indoor: { grip: 1, dark: 0 },
};

export const COLORS = {
  parked: ['#d6d9dc', '#f2f2ef', '#24282e', '#8c1f24', '#2d5385', '#5d6873', '#b9a47c', '#2e5e48', '#e3b51a', '#6d3f8a', '#9aa7b3', '#3b3f45'],
};

/** Park etmiş / trafik araç tipleri (çarpışma ve çizim ölçüleri). */
export const PARKED_MODELS = {
  mini: { length: 3.6, width: 1.66 },
  hatch: { length: 4.1, width: 1.76 },
  sedan: { length: 4.6, width: 1.8 },
  suv: { length: 4.5, width: 1.88 },
  van: { length: 4.9, width: 1.95 },
  minibus: { length: 5.7, width: 2.02 },
  pickup: { length: 5.3, width: 1.98 },
  truck: { length: 7.4, width: 2.4 },
  bus: { length: 11.6, width: 2.5 },
};
