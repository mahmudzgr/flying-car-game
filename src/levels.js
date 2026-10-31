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
  add({ tag: 'ground', points: rect(-120, deep, canyonStart, gy), data: { kind: 'runway' } });
  add({ tag: 'ground', points: rect(-140, deep, -120, gy + 12), data: { kind: 'wall' } });

  // Pad
  const padX0 = canyonStart + def.pad.dist;
  const padLen = def.pad.len;
  const padY = def.pad.y;
  const padCX = padX0 + padLen / 2;
  let padBody;
  const runoffLen = def.runoff ? def.runoff.len : 70;
  if (def.pad.motion) {
    const mo = def.pad.motion;
    const h = 3.2;
    padBody = add({
      tag: 'pad',
      points: rect(-padLen / 2, -h, padLen / 2, 0),
      origin: { x: padCX, y: padY },
      motion: (t) => ({
        dx: mo.amp * Math.sin((t * Math.PI * 2) / mo.period),
        dy: mo.heave * Math.sin((t * Math.PI * 2) / (mo.period * 0.37)),
        angle: mo.roll * DEG * Math.sin((t * Math.PI * 2) / (mo.period * 0.53) + 0.7),
      }),
      data: { barge: true, len: padLen, h },
    });
  } else {
    padBody = add({
      tag: 'pad',
      points: rect(-padLen / 2, deep - padY, padLen / 2, 0),
      origin: { x: padCX, y: padY },
      data: { len: padLen, rooftop: !!def.pad.rooftop },
    });
  }

  // Runoff ground after the pad (+ end wall), or a drop (rooftop / barge)
  const padX1 = padX0 + padLen;
  let endX = padX1 + 40;
  if (runoffLen > 0) {
    add({ tag: 'ground', points: rect(padX1, deep, padX1 + runoffLen, padY), data: { kind: 'runoff' } });
    add({ tag: 'ground', points: rect(padX1 + runoffLen, deep, padX1 + runoffLen + 30, padY + 14), data: { kind: 'wall' } });
    endX = padX1 + runoffLen + 30;
  }

  // Canyon floor / hazard (spans gap and beyond)
  const hazardX0 = canyonStart - (def.canyon.open ? 0 : 0);
  add({
    tag: 'hazard',
    points: rect(hazardX0, deep - 20, endX + 400, bottom),
    data: { hazard: def.canyon.hazard, hazardText },
  });

  // Obstacles (rock pillars) at fractions of the gap
  const obstacles = [];
  for (const o of def.obstacles || []) {
    const cx = canyonStart + def.pad.dist * o.f;
    const b = add({ tag: 'ground', points: rect(cx - o.w / 2, bottom - 2, cx + o.w / 2, gy + o.top), data: { kind: 'pillar' } });
    obstacles.push(b);
  }

  const windDef = def.wind;
  const wind = windDef
    ? (t) => windDef.base + windDef.gust * (0.6 * Math.sin((t * Math.PI * 2) / windDef.period) + 0.4 * Math.sin((t * Math.PI * 2) / (windDef.period * 0.43) + 1.3))
    : () => 0;

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
    pad: { body: padBody, x0: padX0, x1: padX1, len: padLen, y: padY, cx: padCX },
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

// Approach speeds (m/s) that land on the pad with no thrust, ramp at its mid angle.
export function computeSpeedBand(L) {
  const r = L.def.ramp;
  const g = L.gravity;
  const midA = ((r.dmin + r.dmax) / 2) * DEG;
  const lipLocal = L.rampProfile.lip;
  const c = Math.cos(midA), s = Math.sin(midA);
  const lipX = L.rampX + c * lipLocal[0] - s * lipLocal[1];
  const lipY = L.groundY + s * lipLocal[0] + c * lipLocal[1];
  const theta = L.rampProfile.beta + midA;
  const h = lipY - L.groundY;
  const k = (0.5 * L.airDensity * CAR_SPEC.cdA) / CAR_SPEC.mass;
  const wind = L.world.wind;
  const rest = restHeight(g);
  const thrustA = thrustAccelFor(g);
  const ok = [];
  let best = null;
  const paths = {};
  for (let v = 4; v <= 75; v += 0.25) {
    const vl2 = v * v - 2 * g * h * 1.08; // small loss for suspension/rolling on the ramp
    if (vl2 <= 4) continue;
    const vl = Math.sqrt(vl2);
    let x = lipX - Math.sin(theta) * rest;
    let y = lipY + Math.cos(theta) * rest;
    let vx = vl * Math.cos(theta), vy = vl * Math.sin(theta);
    const pts = [[x, y]];
    let t = 0;
    let landX = null;
    for (let i = 0; i < 4000; i++) {
      const dt = 1 / 60;
      const rvx = vx - wind(t);
      const rv = Math.hypot(rvx, vy);
      vx -= k * rvx * rv * dt;
      vy -= (g + k * vy * rv) * dt;
      // emulate a typical soft-landing burn (level attitude) – it stretches the flight
      if (vy < -1.2) {
        const hh = Math.max(0.1, y - rest - L.pad.y);
        if ((vy * vy - 1.44) / (2 * hh) > (thrustA - g) * 0.8) vy += thrustA * dt;
      }
      x += vx * dt;
      y += vy * dt;
      t += dt;
      if (i % 3 === 0) pts.push([x, y]);
      if (vy < 0 && y <= L.pad.y + rest) {
        landX = x;
        break;
      }
      if (y < L.bottom) break;
    }
    paths[v] = pts;
    if (landX !== null && landX > L.pad.x0 + 3 && landX < L.pad.x1 - 3) {
      ok.push(v);
      const err = Math.abs(landX - L.pad.cx);
      if (!best || err < best.err) best = { v, err, pts };
    }
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
