// Milimetrik Park — ayarlar ve araç verileri.
// Birimler: metre, kilogram, saniye, newton, radyan. Dünya: x sağa, y AŞAĞI; açı saat yönünde pozitif.

export const SAVE_KEY = 'milimetrik.v1';

/** Fizik adımı (sn). 240 Hz: düşük hızda hassas, ince duvarlardan geçme yok. */
export const DT = 1 / 240;
export const GRAVITY = 9.81;

const deg = (d) => (d * Math.PI) / 180;

/**
 * Araçlar. Ölçüler gerçek bir kompakt hatchback'e yakındır:
 * 4,15 m boy, 2,55 m dingil mesafesi, ~10,4 m dönüş çapı (kaldırımdan kaldırıma).
 */
export const CARS = {
  serce: {
    id: 'serce',
    name: 'Serçe',
    length: 4.15,
    width: 1.78,
    wheelbase: 2.55,
    overhangF: 0.85,
    overhangR: 0.75,
    track: 1.52,
    cgToFront: 1.05,          // ağırlık merkezinden ön dingile (önde %59 ağırlık)
    cgHeight: 0.55,
    mass: 1250,
    inertia: 2000,            // dikey eksende eylemsizlik (kg·m²)
    maxSteer: deg(34),        // tam kilitte arka dingil merkezine göre Ackermann açısı
    lockDeg: 450,             // direksiyon simidi: merkezden kilide 450° (kilitten kilide 2,5 tur)
    tireMu: 0.95,             // kuru asfalt tepe sürtünmesi
    tireMuSlide: 0.78,        // kilitli / kayan lastik
    corneringStiffness: 16,   // yük başına viraj sertliği (1/rad): Cα = 16 · Fz
    wheelRadius: 0.31,
    tireWidth: 0.2,
    drive: 'fwd',
    creepForce: 900,          // tork konvertörü rölanti sürünmesi (D/R, pedal yok)
    creepSpeed: 1.9,          // sürünme kuvvetinin sıfırlandığı hız (m/s); denge ≈ 6 km/h
    maxDriveForce: 4300,
    power: 66000,             // W
    powerRev: 22000,
    vmaxFwd: 46,              // m/s
    vmaxRev: 8.5,             // m/s (geri vites devir sınırı ≈ 30 km/h)
    engineBrake: 380,
    engineBrakeK: 45,
    brakeForce: 10500,        // tam fren (ABS'li, ~0,85 g)
    brakeBias: 0.68,          // önde frenleme payı
    rollingResistance: 0.013,
    dragArea: 0.66,           // Cd·A (m²)
    rollFront: 0.56,          // yanal yük aktarımında ön pay
    // direksiyon (s: -1 tam sol … +1 tam sağ)
    steerRate0: 0.42,         // klavye: basınca başlangıç hızı (1/sn) — kısa dokunuş ince ayar
    steerRateMax: 1.8,        // klavye: basılı tutunca çıkılan en yüksek hız
    steerAccel: 2.6,          // klavye: hızlanma (1/sn²)
    steerRateAbs: 3.4,        // dokunmatik/kol: hedefe yaklaşma sınırı (1/sn)
    centerFwd: 0.24,          // ileri giderken kendini toplama: hız (m/s) başına 1/sn
    centerRev: 0.02,          // geri giderken neredeyse hiç toplamaz
    idleRpm: 800,
    maxRpm: 6200,
    colors: { body: '#ff5a2c', roof: '#ffffff' },
  },
};

export const PLAYER_CAR = 'serce';

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

export const COLORS = {
  parked: ['#d6d9dc', '#f2f2ef', '#24282e', '#8c1f24', '#2d5385', '#5d6873', '#b9a47c', '#2e5e48', '#e3b51a', '#6d3f8a', '#9aa7b3', '#3b3f45'],
};

/** Park etmiş araç tipleri (çarpışma ve çizim ölçüleri). */
export const PARKED_MODELS = {
  mini: { length: 3.6, width: 1.66 },
  hatch: { length: 4.1, width: 1.76 },
  sedan: { length: 4.6, width: 1.8 },
  suv: { length: 4.5, width: 1.88 },
  van: { length: 4.9, width: 1.95 },
};
