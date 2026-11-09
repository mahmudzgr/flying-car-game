// Level definitions + geometry builder (pure JS, shared by the game and the Node test bot).
import { Body, World, G_EARTH, CAR_SPEC, restHeight, thrustAccelFor } from './physics.js';

const DEG = Math.PI / 180;

export const HAZARD_TEXT = {
  water: 'Suya düştün!',
  lava: 'Lavlara düştün!',
  rocks: 'Kayalara çakıldın!',
  street: 'Caddeye çakıldın!',
  void: 'Boşluğa düştün!',
  sea: 'Denize düştün!',
  methane: 'Metan gölüne düştün!',
  icewater: 'Buzlu suya düştün!',
};

// Objective helpers -------------------------------------------------------
export const OBJ = {
  land: () => ({ type: 'land', text: 'Piste güvenli iniş yap' }),
  flips: (n) => ({ type: 'flips', value: n, text: `Toplam ${n} takla at ve in` }),
  combo: (n) => ({ type: 'combo', value: n, text: `Tek atlayışta ${n} takla` }),
  back: (n) => ({ type: 'back', value: n, text: n > 1 ? `${n} geri takla (backflip)` : 'Geri takla (backflip) at' }),
  front: (n) => ({ type: 'front', value: n, text: n > 1 ? `${n} ön takla (frontflip)` : 'Ön takla (frontflip) at' }),
  soft: (v) => ({ type: 'soft', value: v, text: `${v.toFixed(1).replace('.', ',')} m/s altında yumuşak iniş` }),
  precise: (d) => ({ type: 'precise', value: d, text: `Hedefin ${d} m yakınına in` }),
  fuel: (p) => ({ type: 'fuel', value: p, text: `%${p} yakıtla bitir` }),
  stars: () => ({ type: 'stars', text: 'Tüm yıldızları topla' }),
  air: (s) => ({ type: 'air', value: s, text: `${s} sn havada kal` }),
  score: (s) => ({ type: 'score', value: s, text: `${s.toLocaleString('tr-TR')} puan topla` }),
  noThrust: () => ({ type: 'noThrust', text: 'Ana itici kullanmadan in' }),
};

export function checkObjective(o, r) {
  if (!r.success) return false;
  switch (o.type) {
    case 'land': return true;
    case 'flips': return r.backflips + r.frontflips >= o.value;
    case 'combo': return r.maxCombo >= o.value;
    case 'back': return r.backflips >= o.value;
    case 'front': return r.frontflips >= o.value;
    case 'soft': return r.impact <= o.value;
    case 'precise': return r.padDist <= o.value;
    case 'fuel': return r.fuel >= o.value;
    case 'stars': return r.starsCollected >= r.starsTotal;
    case 'air': return r.airtime >= o.value;
    case 'score': return r.score >= o.value;
    case 'noThrust': return !r.usedMainThrust;
    default: return false;
  }
}

// Levels --------------------------------------------------------------------
export const LEVELS = [
  {
    id: 1,
    name: 'İlk Sıçrayış',
    desc: 'Rampaya hızlan, havadayken iticilerle süzül ve platforma yumuşakça kon.',
    theme: 'earth',
    runway: 150,
    ramp: { len: 14, arc: 20, dmin: 0, dmax: 6, period: 6 },
    pad: { dist: 42, len: 46, y: 0 },
    canyon: { depth: 14, hazard: 'water' },
    collect: { stars: [{ f: 0.3, dy: 1 }, { f: 0.55, dy: 1.5 }, { f: 0.8, dy: 1 }], fuel: [] },
    objectives: [OBJ.land(), OBJ.soft(3.5), OBJ.stars()],
    tip: 'İpucu: Hız göstergesindeki yeşil bölge, rampadan sonra hedefe ulaştıran hızdır.',
  },
  {
    id: 2,
    name: 'Takla Okulu',
    desc: 'Havada sol tuşlarla dön. Taklayı tamamla, burnu düzelt, sonra iticiyle yavaşla.',
    theme: 'earth',
    runway: 150,
    ramp: { len: 16, arc: 26, dmin: 0, dmax: 10, period: 5 },
    pad: { dist: 58, len: 42, y: 0 },
    canyon: { depth: 18, hazard: 'water' },
    collect: { stars: [{ f: 0.25, dy: 2 }, { f: 0.5, dy: 3 }, { f: 0.75, dy: 2 }], fuel: [] },
    objectives: [OBJ.land(), OBJ.back(1), OBJ.precise(4)],
    tip: 'İpucu: ↺ tuşu burnu kaldırır (geri takla), ↻ burnu indirir (ön takla).',
  },
  {
    id: 3,
    name: 'Kanyon Atlayışı',
    desc: 'Derin bir kanyon. Yeterince hızlı değilsen kayalara çakılırsın.',
    theme: 'canyon',
    runway: 170,
    ramp: { len: 16, arc: 28, dmin: -2, dmax: 10, period: 4.5 },
    pad: { dist: 88, len: 40, y: 0 },
    canyon: { depth: 45, hazard: 'rocks' },
    collect: { stars: [{ f: 0.3, dy: 3 }, { f: 0.5, dy: 5 }, { f: 0.7, dy: 3 }], fuel: [{ f: 0.42, dy: 0 }] },
    objectives: [OBJ.land(), OBJ.flips(2), OBJ.fuel(35)],
    tip: 'İpucu: Yakıt kutuları depoyu %25 doldurur.',
  },
  {
    id: 4,
    name: 'Gökdelen Çatısı',
    desc: 'Karşı binanın çatısı daha yüksek ve kısa. İnişten sonra durabilmelisin!',
    theme: 'city',
    runway: 160,
    ramp: { len: 16, arc: 30, dmin: 0, dmax: 10, period: 4 },
    pad: { dist: 70, len: 44, y: 6, rooftop: true },
    canyon: { depth: 60, hazard: 'street' },
    runoff: { len: 0 },
    collect: { stars: [{ f: 0.3, dy: 3 }, { f: 0.55, dy: 5 }, { f: 0.8, dy: 4 }], fuel: [] },
    objectives: [OBJ.land(), OBJ.front(1), OBJ.precise(3)],
    tip: 'İpucu: İnmeden önce burnu hafif yukarı kaldırıp iticiyle yatay hızını da kesebilirsin.',
  },
  {
    id: 5,
    name: 'Rüzgarlı Vadi',
    desc: 'Karşıdan sert rüzgar esiyor. Bayraklara dikkat et, hızını buna göre ayarla.',
    theme: 'valley',
    runway: 170,
    wind: { base: -9, gust: 6, period: 3.7 },
    ramp: { len: 16, arc: 28, dmin: 0, dmax: 10, period: 5 },
    pad: { dist: 66, len: 40, y: -4 },
    canyon: { depth: 26, hazard: 'water' },
    collect: { stars: [{ f: 0.3, dy: 2 }, { f: 0.5, dy: 4 }, { f: 0.72, dy: 2 }], fuel: [{ f: 0.6, dy: -1 }] },
    objectives: [OBJ.land(), OBJ.air(4), OBJ.soft(2)],
    tip: 'İpucu: Rüzgar seni geri iter; yeşil bölgenin üst sınırına yakın gir.',
  },
  {
    id: 6,
    name: 'Mancınık',
    desc: 'Bu rampa çok hızlı dönüyor! Yukarı kalkarken binersen seni fırlatır.',
    theme: 'earth',
    runway: 160,
    ramp: { len: 16, arc: 24, dmin: -4, dmax: 16, period: 2.4 },
    pad: { dist: 92, len: 42, y: 0 },
    canyon: { depth: 22, hazard: 'water' },
    collect: { stars: [{ f: 0.3, dy: 4 }, { f: 0.5, dy: 6 }, { f: 0.7, dy: 4 }], fuel: [{ f: 0.4, dy: 2 }] },
    objectives: [OBJ.land(), OBJ.combo(2), OBJ.stars()],
    tip: 'İpucu: Rampa yükselirken üzerinde olmak sana ekstra dikey hız kazandırır.',
  },
  {
    id: 7,
    name: 'Ay Üssü',
    desc: 'Yerçekimi 1,62 m/s². Hava yok, sürtünme az. Uzun uçuş, bol takla!',
    theme: 'moon',
    gravity: 1.62,
    airDensity: 0,
    runway: 150,
    ramp: { len: 16, arc: 30, dmin: 0, dmax: 10, period: 7 },
    pad: { dist: 120, len: 40, y: 0 },
    canyon: { depth: 30, hazard: 'void' },
    collect: { stars: [{ f: 0.25, dy: 3 }, { f: 0.5, dy: 5 }, { f: 0.75, dy: 3 }], fuel: [] },
    objectives: [OBJ.land(), OBJ.flips(3), OBJ.precise(2)],
    tip: 'İpucu: Ayda tekerlek tutuşu azdır, hızlanma yavaştır. Pist uzun, sabırlı ol.',
  },
  {
    id: 8,
    name: 'Kızıl Gezegen',
    desc: 'Mars: yerçekimi 3,71 m/s², atmosfer çok ince. Hedef yüksek bir platoda, kaya sütunlarına dikkat!',
    theme: 'mars',
    gravity: 3.71,
    airDensity: 0.02,
    runway: 160,
    ramp: { len: 16, arc: 30, dmin: 0, dmax: 12, period: 6 },
    pad: { dist: 100, len: 40, y: 8 },
    canyon: { depth: 40, hazard: 'rocks' },
    obstacles: [{ f: 0.45, w: 6, top: 14 }],
    collect: { stars: [{ f: 0.3, dy: 3 }, { f: 0.55, dy: 6 }, { f: 0.78, dy: 3 }], fuel: [] },
    objectives: [OBJ.land(), OBJ.back(2), OBJ.fuel(50)],
    tip: 'İpucu: Sütunun üzerinden geçecek kadar yüksel; uzun uçuşta yakıtı idareli kullan.',
  },
  {
    id: 9,
    name: 'Deniz Platformu',
    desc: 'İniş platformu dalgalarla sallanıyor ve kayıyor. Zamanlama her şey!',
    theme: 'sea',
    runway: 160,
    groundY: 2,
    ramp: { len: 16, arc: 26, dmin: 0, dmax: 10, period: 5 },
    pad: { dist: 80, len: 38, y: 2, motion: { amp: 9, period: 10, roll: 2.2, heave: 0.6 } },
    canyon: { depth: 6, hazard: 'sea', open: true },
    runoff: { len: 0 },
    collect: { stars: [{ f: 0.3, dy: 3 }, { f: 0.5, dy: 4 }, { f: 0.7, dy: 3 }], fuel: [{ f: 0.55, dy: 0 }] },
    objectives: [OBJ.land(), OBJ.soft(2.5), OBJ.precise(3)],
    tip: 'İpucu: Platformun konumu değişir; hedef işaretini takip et.',
  },
  {
    id: 10,
    name: 'Büyük Final',
    desc: 'Uzun bir kanyon, iki sütun ve çatı katında daralan bir hedef. Bütün öğrendiklerini kullan.',
    theme: 'sunset',
    runway: 190,
    ramp: { len: 18, arc: 30, dmin: -3, dmax: 14, period: 3.4 },
    pad: { dist: 150, len: 34, y: 4 },
    canyon: { depth: 50, hazard: 'lava' },
    obstacles: [{ f: 0.3, w: 5, top: 10 }, { f: 0.7, w: 5, top: 12 }],
    collect: { stars: [{ f: 0.2, dy: 4 }, { f: 0.5, dy: 7 }, { f: 0.82, dy: 4 }], fuel: [{ f: 0.45, dy: 1 }, { f: 0.62, dy: 1 }] },
    objectives: [OBJ.land(), OBJ.combo(3), OBJ.score(9000)],
    tip: 'İpucu: Çoklu takla puanı katlar; ama yakıtını iniş için sakla.',
  },
  {
    id: 11,
    name: 'Kayak Atlayışı',
    desc: 'İniş pisti uçuş yoluna paralel eğimli bir yamaç. Burnu yamaca paralel tutarsan iticiye hiç gerek kalmadan kayarak inersin.',
    theme: 'snow',
    runway: 150,
    ramp: { len: 10, arc: 6, dmin: -1, dmax: 2, period: 6 },
    pad: { type: 'hill', designSpeed: 40, b: 0.085, lambda: 10, plateau: 4, endAngle: 38, arc: 70, outrun: 130, kFrac: 0.35 },
    canyon: { depth: 120, hazard: 'void' },
    runoff: { len: 0 },
    collect: { stars: [{ f: 0.3, dy: 1.5 }, { f: 0.55, dy: 1.2 }, { f: 0.8, dy: 1 }], fuel: [] },
    objectives: [OBJ.land(), OBJ.noThrust(), OBJ.precise(4)],
    tip: 'İpucu: Yamaca dik çarpma hızı önemlidir. Eğime paralel inersen 30 m/s hızla bile yumuşak konarsın; ana iticiye dokunma!',
  },
  {
    id: 12,
    name: 'Buzlu Göl',
    desc: 'Donmuş göl buz gibi kaygan: frenler neredeyse işe yaramaz. Yatay hızını havada iticiyle kesmezsen kar setine çarparsın.',
    theme: 'frost',
    runway: 160,
    ramp: { len: 16, arc: 24, dmin: 0, dmax: 8, period: 5 },
    pad: { dist: 56, len: 80, y: -2, mu: 0.1, wall: 3, settle: 16 },
    canyon: { depth: 5, hazard: 'icewater' },
    runoff: { len: 60 },
    collect: { stars: [{ f: 0.3, dy: 2 }, { f: 0.5, dy: 3 }, { f: 0.72, dy: 2 }], fuel: [{ f: 0.62, dy: 0 }] },
    objectives: [OBJ.land(), OBJ.precise(5), OBJ.fuel(20)],
    tip: 'İpucu: Buzda sürtünme katsayısı ~0,1. İnmeden önce burnu geriye yatırıp iticiyi ateşle; yatay hızın 12 m/s altına insin.',
  },
  {
    id: 13,
    name: 'Titan',
    desc: 'Satürn\'ün uydusu Titan: yerçekimi 1,35 m/s², atmosfer Dünya\'dakinden yaklaşık 4 kat yoğun. Hava seni frenler, süzülerek uçarsın.',
    theme: 'titan',
    gravity: 1.352,
    airDensity: 5.3,
    runway: 160,
    ramp: { len: 16, arc: 30, dmin: 0, dmax: 10, period: 7 },
    pad: { dist: 95, len: 40, y: 0 },
    canyon: { depth: 30, hazard: 'methane' },
    collect: { stars: [{ f: 0.25, dy: 3 }, { f: 0.5, dy: 5 }, { f: 0.75, dy: 3 }], fuel: [] },
    objectives: [OBJ.land(), OBJ.air(10), OBJ.flips(4)],
    tip: 'İpucu: Yoğun hava hem yatay hızını hem de dönüşünü yavaşlatır. Biraz daha hızlı gir.',
  },
  {
    id: 14,
    name: 'Vinç Platformu',
    desc: 'İniş platformu bir vincin kancasında sarkaç gibi sallanıyor. Hem konumu hem eğimi sürekli değişiyor.',
    theme: 'site',
    runway: 160,
    ramp: { len: 16, arc: 26, dmin: 0, dmax: 10, period: 5 },
    pad: { dist: 72, len: 46, y: 4, motion: { type: 'pendulum', pivotH: 30, amp: 7, period: 7.4 } },
    canyon: { depth: 50, hazard: 'street' },
    runoff: { len: 0 },
    collect: { stars: [{ f: 0.3, dy: 3 }, { f: 0.55, dy: 4 }, { f: 0.78, dy: 3 }], fuel: [{ f: 0.6, dy: 0 }] },
    objectives: [OBJ.land(), OBJ.soft(2.5), OBJ.combo(2)],
    tip: 'İpucu: Platform sallanırken eğimi değişir; burnunu platformun eğimine göre ayarla.',
  },
  {
    id: 15,
    name: 'Neon Asansör',
    desc: 'Gece şehrinde iniş platformu bir asansör gibi inip çıkıyor. Yükselen platforma inmek çarpmayı sertleştirir!',
    theme: 'neon',
    runway: 170,
    ramp: { len: 16, arc: 28, dmin: -2, dmax: 12, period: 4 },
    pad: { dist: 88, len: 48, y: 2, motion: { type: 'lift', amp: 5, period: 10 } },
    canyon: { depth: 55, hazard: 'street' },
    runoff: { len: 0 },
    obstacles: [{ f: 0.45, w: 5, top: 9 }],
    collect: { stars: [{ f: 0.25, dy: 3 }, { f: 0.5, dy: 6 }, { f: 0.75, dy: 3 }], fuel: [{ f: 0.62, dy: 1 }] },
    objectives: [OBJ.land(), OBJ.front(2), OBJ.stars()],
    tip: 'İpucu: Platform alçalırken in; yükselen platform dikey çarpma hızına eklenir.',
  },
  {
    id: 16,
    name: 'Fırtına',
    desc: 'Açık denizde fırtına: rüzgar iki yönden de sert esiyor, platform dalgalarla kayıp sallanıyor. Son sınav!',
    theme: 'storm',
    runway: 170,
    groundY: 2,
    wind: { base: 0, gust: 8, period: 6.5 },
    ramp: { len: 16, arc: 28, dmin: 0, dmax: 10, period: 5 },
    pad: { dist: 80, len: 48, y: 2, motion: { amp: 5, period: 13, roll: 3, heave: 0.8 } },
    canyon: { depth: 6, hazard: 'sea', open: true },
    runoff: { len: 0 },
    collect: { stars: [{ f: 0.3, dy: 3 }, { f: 0.5, dy: 5 }, { f: 0.7, dy: 3 }], fuel: [{ f: 0.4, dy: 1 }, { f: 0.62, dy: 1 }] },
    objectives: [OBJ.land(), OBJ.combo(2), OBJ.score(8000)],
    tip: 'İpucu: Bayraklar rüzgarın yönünü gösterir. Rüzgar arkandan eserken fırlamak daha uzağa taşır.',
  },
];

// Geometry -------------------------------------------------------------------
function rect(x0, y0, x1, y1) {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

// Curved kicker ramp in local coords (pivot at entry = origin).
export function rampProfile(len, arcDeg, thickness = 0.55, segments = 14) {
  const beta = arcDeg * DEG;
  const R = len / beta;
  const top = [];
  for (let i = 0; i <= segments; i++) {
    const th = (beta * i) / segments;
    top.push([R * Math.sin(th), R * (1 - Math.cos(th)), th]);
  }
  const bottom = top.map(([x, y, th]) => [x + Math.sin(th) * thickness, y - Math.cos(th) * thickness]);
  // CCW: bottom from entry → lip, then top from lip → entry
  const pts = [];
  for (const p of bottom) pts.push([p[0], p[1]]);
  for (let i = top.length - 1; i >= 0; i--) pts.push([top[i][0], top[i][1]]);
  return { pts, top, lip: top[top.length - 1], beta, R };
}

export function rampAngle(r, t) {
  const mid = (r.dmin + r.dmax) / 2;
  const amp = (r.dmax - r.dmin) / 2;
  return (mid + amp * Math.sin((t * Math.PI * 2) / r.period + (r.phase || 0))) * DEG;
}

const midAngle = (r) => ((r.dmin + r.dmax) / 2) * DEG;

// Centre-of-mass launch state at the ramp lip for a given approach speed (ramp at angle offset `a`).
function launchState(def, prof, gy, g, v, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const lip = prof.lip;
  const lipX = def.runway + c * lip[0] - s * lip[1];
  const lipY = gy + s * lip[0] + c * lip[1];
  const theta = prof.beta + a;
  const vl2 = v * v - 2 * g * (lipY - gy) * 1.08; // small loss for suspension/rolling on the ramp
  if (vl2 <= 4) return null;
  const vl = Math.sqrt(vl2);
  const rest = restHeight(g);
  return { x: lipX - Math.sin(theta) * rest, y: lipY + Math.cos(theta) * rest, vx: vl * Math.cos(theta), vy: vl * Math.sin(theta), lipX, lipY };
}

function makeWind(w) {
  if (!w) return () => 0;
  return (t) => w.base + w.gust * (0.6 * Math.sin((t * Math.PI * 2) / w.period) + 0.4 * Math.sin((t * Math.PI * 2) / (w.period * 0.43) + 1.3));
}

// Ski-jump landing hill. Trajectories leaving the same lip at the same angle are nested parabolas, so a
// hill shaped like  S(x) = y_nominal(x) − b·Δx − c0·e^(−Δx/λ)  is crossed by every slower trajectory at
// (almost) the same small angle b. The touchdown speed normal to the slope is then ≈ v·sin(b), i.e. soft,
// even at 30 m/s — no thruster needed (this is why real ski-jump landing hills are steep).
function buildHillProfile(def, prof, gy, g, rho, x0) {
  const H = def.pad;
  const k = (0.5 * rho * CAR_SPEC.cdA) / CAR_SPEC.mass;
  const ls = launchState(def, prof, gy, g, H.designSpeed, midAngle(def.ramp));
  let { x, y, vx, vy } = ls;
  const path = [[x, y]];
  const dt = 1 / 240;
  while (Math.atan2(vy, vx) > -H.endAngle * DEG && path.length < 200000) {
    const v = Math.hypot(vx, vy);
    vx -= k * vx * v * dt;
    vy -= (g + k * vy * v) * dt;
    x += vx * dt;
    y += vy * dt;
    path.push([x, y]);
  }
  const pathY = (px) => {
    if (px <= path[0][0]) return path[0][1];
    let lo = 0, hi = path.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (path[mid][0] < px) lo = mid; else hi = mid;
    }
    const a = path[lo], b = path[hi];
    return a[1] + ((b[1] - a[1]) * (px - a[0])) / (b[0] - a[0] || 1);
  };
  const xl = path[0][0];
  const xEnd = path[path.length - 1][0];
  const top0 = gy - 0.5;
  const c0 = pathY(xl) - top0;
  const S = (px) => {
    const d = Math.max(0, px - xl);
    return pathY(px) - H.b * d - c0 * Math.exp(-d / H.lambda);
  };
  // gently sloping snow table until the hill surface drops below it
  const plateau = (px) => top0 - (px - x0) * Math.tan(H.plateau * DEG);
  let xs = xEnd;
  for (let px = x0 + 2; px < xEnd; px += 0.25) {
    if (S(px) < plateau(px)) {
      xs = px;
      break;
    }
  }
  const top = [];
  for (let px = x0; px < xs; px += 2) top.push([px, plateau(px)]);
  top.push([xs, plateau(xs)]);
  for (let px = xs + 1.5; px < xEnd; px += 1.5) top.push([px, S(px)]);
  top.push([xEnd, S(xEnd)]);
  // circular transition to a flat outrun
  const n = top.length;
  const ang0 = Math.atan2(top[n - 1][1] - top[n - 2][1], top[n - 1][0] - top[n - 2][0]); // negative
  const R = H.arc;
  const [ex, ey] = top[n - 1];
  // centre of the concave-up arc lies above-right of the end point
  const cx = ex - Math.sin(ang0) * R;
  const cy = ey + Math.cos(ang0) * R;
  for (let a = ang0 + 3 * DEG; a < 0; a += 3 * DEG) top.push([cx + Math.sin(a) * R, cy - Math.cos(a) * R]);
  const outY = cy - R;
  top.push([cx, outY]);
  top.push([cx + H.outrun, outY]);
  return { top, zoneX0: xs, zoneX1: xEnd, outY, endX: cx + H.outrun };
}

export function buildLevel(def) {
  const gravity = def.gravity ?? G_EARTH;
  const airDensity = def.airDensity ?? 1.225;
  const gy = def.groundY ?? 0;
  const bodies = [];
  let id = 0;
  const add = (o) => {
    const b = new Body({ id: id++, ...o });
    bodies.push(b);
    return b;
  };
  const hazardText = HAZARD_TEXT[def.canyon.hazard] || 'Düştün!';
  const bottom = gy - def.canyon.depth;
  const deep = bottom - 30;

  // Ramp
  const rampX = def.runway;
  const prof = rampProfile(def.ramp.len, def.ramp.arc);
  const ramp = add({
    tag: 'ramp',
    points: prof.pts,
    origin: { x: rampX, y: gy },
    motion: (t) => ({ dx: 0, dy: 0, angle: rampAngle(def.ramp, t) }),
  });
  const lipX = rampX + prof.lip[0];
  const canyonStart = Math.ceil(lipX - 1);

  // Start ground (runway) + a wall behind the start
  add({ tag: 'ground', points: rect(-120, deep, canyonStart, gy), data: { kind: 'runway', mu: def.runwayMu } });
  add({ tag: 'ground', points: rect(-140, deep, -120, gy + 12), data: { kind: 'wall' } });

  const P = def.pad;
  let padBody, padX0, padX1, padLen, padY, padCX;
  let endX;
  const runoffLen = def.runoff ? def.runoff.len : 70;

  if (P.type === 'hill') {
    const hill = buildHillProfile(def, prof, gy, gravity, airDensity, canyonStart);
    const top = hill.top;
    const surfAt = (x) => {
      for (let i = 1; i < top.length; i++) {
        if (top[i][0] >= x) {
          const a = top[i - 1], b = top[i];
          return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1);
        }
      }
      return top[top.length - 1][1];
    };
    padX0 = hill.zoneX0;
    padX1 = hill.zoneX1;
    padLen = padX1 - padX0;
    padCX = padX0 + padLen * P.kFrac;
    padY = surfAt(padCX);
    // knoll (not a landing zone): from the runway edge to the start of the landing zone
    const knollTop = top.filter((p) => p[0] < padX0);
    knollTop.push([padX0, surfAt(padX0)]);
    const kpts = [[canyonStart, deep], [padX0, deep]];
    for (let i = knollTop.length - 1; i >= 0; i--) kpts.push(knollTop[i]);
    kpts.push([canyonStart, gy]);
    add({ tag: 'ground', points: dedupe(kpts), data: { kind: 'knoll' } });
    // landing zone + transition + outrun as one pad body (local coords around the K point)
    const zoneTop = top.filter((p) => p[0] > padX0);
    zoneTop.unshift([padX0, surfAt(padX0)]);
    const last = zoneTop[zoneTop.length - 1];
    const ppts = [[padX0, deep], [last[0], deep]];
    for (let i = zoneTop.length - 1; i >= 0; i--) ppts.push(zoneTop[i]);
    padBody = add({
      tag: 'pad',
      points: dedupe(ppts).map(([x, y]) => [x - padCX, y - padY]),
      origin: { x: padCX, y: padY },
      data: { hill: true, len: padLen, zoneX0: padX0 - padCX, zoneX1: padX1 - padCX, outY: hill.outY - padY },
    });
    add({ tag: 'ground', points: rect(last[0], deep, last[0] + 30, hill.outY + 14), data: { kind: 'wall' } });
    endX = last[0] + 30;
  } else {
    padX0 = canyonStart + P.dist;
    padLen = P.len;
    padY = P.y;
    padCX = padX0 + padLen / 2;
    padX1 = padX0 + padLen;
    const mo = P.motion;
    if (mo) {
      const type = mo.type || 'barge';
      const T = (t) => (t * Math.PI * 2) / mo.period + (mo.phase || 0);
      let motion;
      let h = 3.2;
      if (type === 'pendulum') {
        h = 1.4;
        motion = (t) => {
          const th = mo.amp * DEG * Math.sin(T(t));
          return { dx: mo.pivotH * Math.sin(th), dy: mo.pivotH * (1 - Math.cos(th)), angle: th };
        };
      } else if (type === 'lift') {
        h = 1.6;
        motion = (t) => ({ dx: 0, dy: mo.amp * Math.sin(T(t)), angle: 0 });
      } else {
        motion = (t) => ({
          dx: mo.amp * Math.sin(T(t)),
          dy: mo.heave * Math.sin((t * Math.PI * 2) / (mo.period * 0.37)),
          angle: mo.roll * DEG * Math.sin((t * Math.PI * 2) / (mo.period * 0.53) + 0.7),
        });
      }
      padBody = add({
        tag: 'pad',
        points: rect(-padLen / 2, -h, padLen / 2, 0),
        origin: { x: padCX, y: padY },
        motion,
        data: { barge: type === 'barge', moving: type, pivotH: mo.pivotH, len: padLen, h, mu: P.mu },
      });
    } else {
      padBody = add({
        tag: 'pad',
        points: rect(-padLen / 2, deep - padY, padLen / 2, 0),
        origin: { x: padCX, y: padY },
        data: { len: padLen, rooftop: !!P.rooftop, mu: P.mu, ice: (P.mu ?? 1) < 0.5 },
      });
    }
    endX = padX1 + 40;
    let rx = padX1;
    let ry = padY;
    if (P.wall) {
      // snow bank at the end of the lake
      add({ tag: 'ground', points: rect(padX1, deep, padX1 + 8, padY + P.wall), data: { kind: 'bank' } });
      rx = padX1 + 8;
      ry = padY + P.wall;
    }
    if (runoffLen > 0) {
      add({ tag: 'ground', points: rect(rx, deep, rx + runoffLen, ry), data: { kind: 'runoff' } });
      add({ tag: 'ground', points: rect(rx + runoffLen, deep, rx + runoffLen + 30, ry + 14), data: { kind: 'wall' } });
      endX = rx + runoffLen + 30;
    }
  }

  // Canyon floor / hazard (spans gap and beyond)
  add({
    tag: 'hazard',
    points: rect(canyonStart, deep - 20, endX + 400, bottom),
    data: { hazard: def.canyon.hazard, hazardText },
  });

  // Obstacles (rock pillars / towers) at fractions of the gap
  const obstacles = [];
  for (const o of def.obstacles || []) {
    const cx = canyonStart + (P.dist ?? padX0 - canyonStart) * o.f;
    const b = add({ tag: 'ground', points: rect(cx - o.w / 2, bottom - 2, cx + o.w / 2, gy + o.top), data: { kind: 'pillar' } });
    obstacles.push(b);
  }

  const wind = makeWind(def.wind);
  const world = new World({ bodies, gravity, airDensity, wind });
  world.update(0);

  const L = {
    def,
    world,
    gravity,
    airDensity,
    groundY: gy,
    ramp,
    rampProfile: prof,
    rampX,
    lipX,
    canyonStart,
    pad: { body: padBody, x0: padX0, x1: padX1, len: padLen, y: padY, cx: padCX, hill: P.type === 'hill' },
    obstacles,
    bottom,
    killY: bottom - 15,
    endX,
    start: { x: 8, y: gy + restHeight(gravity) },
    collectibles: [],
  };
  L.padCenter = () => padBody.state.ox;
  L.speedBand = computeSpeedBand(L);
  placeCollectibles(L);
  return L;
}

function dedupe(pts) {
  const out = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push(p);
  }
  return out;
}

// Approach speeds (m/s) that reach the pad, ramp at its mid angle. Uses the real level geometry:
// normal pads assume a typical soft-landing burn, the ski hill assumes no thrust and a soft (<4.5 m/s) touchdown.
const bandCache = new WeakMap(); // the band only depends on the level definition

export function computeSpeedBand(L) {
  const cached = bandCache.get(L.def);
  if (cached) return cached;
  const band = computeSpeedBandRaw(L);
  bandCache.set(L.def, band);
  return band;
}

function computeSpeedBandRaw(L) {
  const def = L.def;
  const g = L.gravity;
  const k = (0.5 * L.airDensity * CAR_SPEC.cdA) / CAR_SPEC.mass;
  const wind = L.world.wind;
  const rest = restHeight(g);
  const thrustA = thrustAccelFor(g);
  const burn = !L.pad.hill;
  const a = midAngle(def.ramp);
  const W = L.world;
  const ok = [];
  let best = null;
  const dt = 1 / 60;
  // above every static surface nothing can be hit: skip the (costly) collision queries there
  let maxTop = -Infinity;
  for (const b of W.bodies) if (b.tag !== 'ramp') maxTop = Math.max(maxTop, b.bbox.y1 + (b.motion ? 15 : 0));
  const clearY = maxTop + rest + 0.5;
  let overshoots = 0;
  for (let v = 4; v <= 75; v += 0.5) {
    const ls = launchState(def, L.rampProfile, L.groundY, g, v, a);
    if (!ls) continue;
    let { x, y, vx, vy } = ls;
    const pts = [[x, y]];
    let t = 0;
    let land = null;
    let burnLeft = 100 / CAR_SPEC.thrustFuel; // seconds of main thrust in a full tank
    for (let i = 0; i < 3000; i++) {
      const rvx = vx - wind(t);
      const rv = Math.hypot(rvx, vy);
      vx -= k * rvx * rv * dt;
      vy -= (g + k * vy * rv) * dt;
      // emulate a typical soft-landing burn aimed at the pad height (it stretches the flight)
      if (burn && vy < -1.2 && burnLeft > 0) {
        const hh = Math.max(0.1, y - rest - L.pad.y);
        if ((vy * vy - 1.44) / (2 * hh) > (thrustA - g) * 0.8) {
          vy += thrustA * dt;
          burnLeft -= dt;
        }
      }
      const nx = x + vx * dt;
      const ny = y + vy * dt;
      if (ny > clearY) {
        x = nx;
        y = ny;
        t += dt;
        if (i % 3 === 0) pts.push([x, y]);
        continue;
      }
      if (W.pointQuery(nx, ny)) break; // flew into a pillar / cliff
      if (vy < 0) {
        const hit = W.raycast(nx, ny, 0, -1, rest);
        if (hit) {
          land = { x: nx, hit, vx, vy };
          break;
        }
      }
      x = nx;
      y = ny;
      t += dt;
      if (i % 3 === 0) pts.push([x, y]);
      if (y < L.bottom) break;
    }
    if (ok.length && land && land.x > L.pad.x1 + 40) {
      // past the band: every faster approach lands even further, stop searching
      if (++overshoots >= 4) break;
    } else overshoots = 0;
    if (!land || land.hit.body !== L.pad.body) continue;
    if (land.x < L.pad.x0 + 3 || land.x > L.pad.x1 - 3) continue;
    if (!burn && -(land.vx * land.hit.nx + land.vy * land.hit.ny) > 4.5) continue;
    pts.push([land.x, land.hit.y + rest]);
    ok.push(v);
    const err = Math.abs(land.x - L.pad.cx);
    if (!best || err < best.err) best = { v, err, pts };
  }
  if (!ok.length) return { min: 0, max: 0, nominal: 0, path: [] };
  return { min: ok[0], max: ok[ok.length - 1], nominal: best.v, path: best.pts };
}

function placeCollectibles(L) {
  const path = L.speedBand.path;
  if (!path.length) return;
  const x0 = path[0][0];
  const x1 = L.pad.cx;
  const at = (f) => {
    const tx = x0 + (x1 - x0) * f;
    for (let i = 1; i < path.length; i++) {
      if (path[i][0] >= tx) {
        const a = path[i - 1], b = path[i];
        const u = (tx - a[0]) / (b[0] - a[0] || 1);
        return [tx, a[1] + (b[1] - a[1]) * u];
      }
    }
    return path[path.length - 1];
  };
  const c = L.def.collect || { stars: [], fuel: [] };
  for (const s of c.stars || []) {
    const [x, y] = at(s.f);
    L.collectibles.push({ type: 'star', x, y: y + s.dy, taken: false });
  }
  for (const s of c.fuel || []) {
    const [x, y] = at(s.f);
    L.collectibles.push({ type: 'fuel', x, y: y + s.dy, taken: false });
  }
}

// ---------------------------------------------------------------------------
// Endless mode: procedurally generated, solvability-checked levels
// ---------------------------------------------------------------------------
const ENDLESS_SETS = [
  { theme: 'earth', hazard: 'water', depth: 16, label: 'Çayır' },
  { theme: 'valley', hazard: 'water', depth: 22, wind: true, label: 'Rüzgarlı Vadi' },
  { theme: 'canyon', hazard: 'rocks', depth: 38, label: 'Kanyon' },
  { theme: 'sunset', hazard: 'lava', depth: 40, label: 'Lav Kanyonu' },
  { theme: 'city', hazard: 'street', depth: 55, drop: true, label: 'Gökdelenler' },
  { theme: 'moon', hazard: 'void', depth: 35, g: 1.62, rho: 0, label: 'Ay' },
  { theme: 'mars', hazard: 'rocks', depth: 38, g: 3.71, rho: 0.02, label: 'Mars' },
  { theme: 'sea', hazard: 'sea', depth: 6, groundY: 2, barge: true, label: 'Açık Deniz' },
  { theme: 'snow', hazard: 'void', depth: 40, label: 'Karlı Dağ' },
  { theme: 'titan', hazard: 'methane', depth: 28, g: 1.352, rho: 5.3, label: 'Titan' },
  { theme: 'neon', hazard: 'street', depth: 55, drop: true, lift: true, label: 'Neon Şehir' },
  { theme: 'frost', hazard: 'icewater', depth: 5, ice: true, label: 'Buzlu Göl' },
  { theme: 'site', hazard: 'street', depth: 50, drop: true, crane: true, label: 'Şantiye' },
];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Highest approach speed reachable on the runway (traction, power and drag limited).
export function reachableSpeed(def) {
  const g = def.gravity ?? G_EARTH;
  const rho = def.airDensity ?? 1.225;
  const S = CAR_SPEC;
  const k = (0.5 * rho * S.cdA) / S.mass;
  let v = 0, x = 8;
  const dt = 0.02;
  while (x < def.runway - 4) {
    const drive = Math.min(S.mu * g * 0.97, S.maxDriveForce / S.mass, S.power / (S.mass * Math.max(4, v)));
    v += (drive - k * v * v - (2 * S.rollC * v) / S.mass) * dt;
    x += v * dt;
  }
  return v;
}

function interpPath(path, x) {
  for (let i = 1; i < path.length; i++) {
    if (path[i][0] >= x) {
      const a = path[i - 1], b = path[i];
      return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0] || 1);
    }
  }
  return null;
}

export function makeEndlessLevel(round, seed, prevTheme = null) {
  const r = mulberry(seed * 7919 + round * 104729);
  const d = Math.min(1, (round - 1) / 10); // difficulty 0 → 1 over ten rounds
  for (let attempt = 0; attempt < 14; attempt++) {
    let set = ENDLESS_SETS[Math.floor(r() * ENDLESS_SETS.length)];
    if (set.theme === prevTheme) set = ENDLESS_SETS[(ENDLESS_SETS.indexOf(set) + 1) % ENDLESS_SETS.length];
    const gy = set.groundY ?? 0;
    const dmin = Math.round(-2 + r() * 3);
    const ramp = {
      len: Math.round(14 + r() * 4),
      arc: Math.round(18 + r() * 12),
      dmin,
      dmax: Math.round(dmin + 4 + d * 10 * r()),
      period: +(2.6 + (1 - d) * 3 + r() * 2).toFixed(1),
    };
    const shrink = 1 - attempt * 0.06;
    const pad = {
      dist: Math.round((40 + 55 * d + r() * 35) * shrink),
      len: Math.round(48 - 12 * d - r() * 4),
      y: gy + Math.round((r() - 0.35) * 8 * (0.3 + d)),
    };
    if (set.barge) pad.motion = { amp: +(3 + 4 * d).toFixed(1), period: Math.round(9 + r() * 4), roll: +(1.5 + 2 * d).toFixed(1), heave: 0.6 };
    if (set.lift) pad.motion = { type: 'lift', amp: +(2.5 + 2.5 * d).toFixed(1), period: Math.round(9 + r() * 3) };
    if (set.crane) pad.motion = { type: 'pendulum', pivotH: 28, amp: +(3 + 4 * d).toFixed(1), period: +(7 + r() * 2).toFixed(1) };
    if (set.ice) Object.assign(pad, { mu: 0.12, wall: 3, settle: 15, len: pad.len + 24, y: gy - 2 });
    if (set.drop || set.barge) {
      // no run-off: the car must stop on the platform, so keep jumps shorter and platforms longer
      pad.dist = Math.min(pad.dist, Math.round(set.drop ? 46 + 18 * d : 58 + 22 * d));
      pad.len = Math.max(pad.len, 48);
      if (set.drop) pad.y = Math.max(pad.y, gy + 2);
    }
    if (set.barge) pad.y = gy;
    const def = {
      id: `E${round}`,
      endless: true,
      seed,
      name: `Tur ${round} · ${set.label}`,
      desc: 'Sonsuz mod: her başarılı inişte yeni ve biraz daha zor bir parkur. Tek kaza seriyi bitirir.',
      theme: set.theme,
      gravity: set.g,
      airDensity: set.rho,
      groundY: set.groundY,
      runway: 150 + Math.round(r() * 30),
      ramp,
      pad,
      canyon: { depth: set.depth, hazard: set.hazard, open: set.hazard === 'sea' },
      runoff: set.barge ? { len: 0 } : set.drop ? { len: 25 } : set.ice ? { len: 60 } : undefined,
      obstacles: [],
      collect: { stars: [{ f: 0.3, dy: 2 }, { f: 0.55, dy: 3 }, { f: 0.8, dy: 2 }], fuel: d > 0.4 ? [{ f: 0.5, dy: 0 }] : [] },
      objectives: [OBJ.land()],
    };
    if ((set.wind || (d > 0.5 && r() < 0.3)) && (set.rho ?? 1.225) > 0.5) {
      def.wind = { base: -(2 + 6 * d * r()), gust: +(2 + 5 * d * r()).toFixed(1), period: +(3 + r() * 2).toFixed(1) };
    }
    let L = buildLevel(def);
    if (!L.speedBand.max || L.speedBand.min > reachableSpeed(def) - 2) continue;
    // optional pillar, placed safely below the nominal flight path
    if (d > 0.3 && r() < 0.6 * d && !set.barge) {
      const f = 0.35 + r() * 0.3;
      const px = L.canyonStart + pad.dist * f;
      const py = interpPath(L.speedBand.path, px);
      if (py !== null) {
        const top = Math.min(py - gy - 7, 30);
        if (top > -set.depth + 6) {
          def.obstacles = [{ f, w: 5, top: Math.round(top) }];
          const L2 = buildLevel(def);
          if (L2.speedBand.max && L2.speedBand.min <= reachableSpeed(def) - 2) L = L2;
          else def.obstacles = [];
        }
      }
    }
    return def;
  }
  // fallback: a gentle earth level
  return { ...LEVELS[0], id: `E${round}`, endless: true, seed, name: `Tur ${round} · Çayır`, objectives: [OBJ.land()] };
}
