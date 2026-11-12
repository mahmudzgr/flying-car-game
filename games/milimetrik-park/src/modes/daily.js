// Günlük Görev: tarihten (Türkiye saati) tohumlanan, her gün herkes için aynı park görevi.
// Yerleşimler çözülebilir kalacak şekilde ölçülendirilir (koridor ve boşluklar araca göre); bot birçok
// tarih için planlayıcıyla doğrular.
import { makeLevel, rng, hashStr } from '../levels/build.js';
import { lot, lotLamps, street } from '../levels/common.js';
import { VEHICLES } from '../config.js';

/** Türkiye saatine göre (UTC+3) bugünün tarihi: 'YYYY-AA-GG'. */
export function todayStr(d = new Date()) {
  return new Date(d.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Bir önceki gün. */
export function prevDay(s) {
  const d = new Date(s + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const TYPES = {
  'perp-nose': 'Dik park, burunla',
  'perp-tail': 'Dik park, geri geri',
  parallel: 'Paralel park',
  angled: 'Açılı park',
};
const ENV_NAMES = { day: 'gündüz', dusk: 'akşam', night: 'gece', rain: 'yağmur' };

export function dailyLevel(dateStr) {
  const r = rng(hashStr('milimetrik-gunluk-' + dateStr));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const vehicle = pick(['kumru', 'serce', 'serce', 'marti', 'baykus']);
  const spec = VEHICLES[vehicle];
  const env = pick(['day', 'day', 'dusk', 'night', 'rain']);
  const type = pick(['perp-nose', 'perp-tail', 'perp-tail', 'parallel', 'parallel', 'angled']);
  const id = 'gunluk-' + dateStr;
  const desc = `${TYPES[type]} · ${spec.name} (${spec.kind}) · ${ENV_NAMES[env]}. Her gün yeni bir görev; en iyi isabetin kaydedilir.`;
  const meta = { id, name: 'Günlük Görev', short: TYPES[type], vehicle, env, zone: 'gunluk', desc, tip: 'Günlük görevi her gün bir kez ödüllü bitirebilirsin; tekrar denemek serbest.' };

  if (type === 'perp-nose' || type === 'perp-tail') {
    const tail = type === 'perp-tail';
    const bayW = Math.round((Math.max(2.4, spec.width + 0.6) + r() * 0.2) * 100) / 100;
    const bayL = Math.max(5.0, Math.round((spec.length + 0.55) * 10) / 10);
    const aisle = Math.round((6.6 + r() * 1.0 + Math.max(0, spec.length - 4.15) * 0.9) * 10) / 10;
    const n = 11, x0 = 3.5, W = x0 + n * bayW + 3;
    const H = 2 + 0.2 + bayL * 2 + aisle + 0.2 + 2.4;
    const ti = 3 + Math.floor(r() * (n - 6));
    const top = [], bot = [];
    for (let i = 0; i < n; i++) {
      if (i === ti) continue;
      const near = Math.abs(i - ti) === 1;
      if (r() < (near ? 0.8 : 0.6)) top.push(i);
      if (r() < 0.7) bot.push(i);
    }
    return makeLevel({ ...meta, w: W, h: H, par: { moves: tail ? 3 : 2, quality: 88 } }, (b) => {
      const res = lot(b, { bayW, bayL, aisle, x0, nTop: n, nBot: n, topFill: top, bottomFill: bot, stoppers: r() < 0.5 });
      if (env === 'night' || env === 'dusk') { const xs = []; for (let x = 7; x < W - 3; x += 9) xs.push(x); lotLamps(b, res, xs); }
      if (env === 'rain') for (let k = 0; k < 3; k++) b.puddle(6 + r() * (W - 12), res.aisleY + (r() - 0.5) * 3, 1 + r() * 1.2, 0.6 + r() * 0.5, r() * 60);
      b.target(res.top[ti], { facing: tail ? 'tail' : 'nose' });
      b.start(Math.max(x0 - 0.4, 1.5 + spec.length / 2 + 0.7), res.aisleY, 0);
    });
  }

  if (type === 'parallel') {
    const gap = Math.round(spec.length * (1.38 + r() * 0.22) * 10) / 10;
    const W = 46, y0 = 5, width = 10;
    return makeLevel({ ...meta, w: W, h: 22, par: { moves: 4, quality: 85 } }, (b) => {
      const { y1 } = street(b, { y0, width, tone: Math.floor(r() * 5) });
      b.dashed(0, (y0 + y1) / 2, W, (y0 + y1) / 2);
      b.line(0, y0 + 2.2, W, y0 + 2.2, { w: 0.1 });
      const cy = y1 - 1.1;
      const gx0 = 18 + r() * 4, gx1 = gx0 + gap;
      // boşluğun iki yanı ve devamı
      let x = gx0;
      for (let k = 0; k < 4; k++) { const L = 4.1 + r() * 0.5; b.parked(x - L / 2, cy, 0, { models: ['hatch', 'sedan', 'mini'], jitter: 0.3 }); x -= L + 0.8 + r() * 0.8; if (x < 3) break; }
      x = gx1;
      for (let k = 0; k < 4; k++) { const L = 4.1 + r() * 0.5; b.parked(x + L / 2, cy, 0, { models: ['hatch', 'sedan', 'suv'], jitter: 0.3 }); x += L + 0.8 + r() * 0.8; if (x > W - 3) break; }
      for (let xx = 4; xx < W - 2; xx += 6.3) b.parked(xx, y0 + 1.1, 180, { models: ['hatch', 'sedan', 'suv', 'van'] });
      if (env === 'night' || env === 'dusk') for (const lx of [8, 24, 40]) b.lamp(lx, y1 + 0.4, { arm: -90 });
      if (env === 'rain') b.puddle(gx0 - 3, y1 - 3.2, 1.6, 0.8);
      b.traffic([[W + 8, y0 + 3.5], [-8, y0 + 3.5]], { speed: 7, every: [8, 14], initial: 1 });
      b.target({ x: (gx0 + gx1) / 2, y: cy, a: 0, l: gap - 0.25, w: 2.2, parallel: true }, { facing: 'nose' });
      b.start(Math.max(5, 1 + spec.length / 2), y1 - 3.4, 0);
    });
  }

  // açılı
  const n = 9;
  return makeLevel({ ...meta, w: 38, h: 22, par: { moves: 2, quality: 88 } }, (b) => {
    const W = 38, H = 22;
    b.rect('asphalt', 1.2, 2.0, W - 1.2, H - 2.2);
    b.curb(1.2, 2.0, W - 1.2, 2.0, -1).curb(1.2, H - 2.2, W - 1.2, H - 2.2, 1);
    b.curb(1.2, 2.0, 1.2, H - 2.2, 1).curb(W - 1.2, 2.0, W - 1.2, H - 2.2, -1);
    b.block(0, 0, W, 0.9, 'hedge').block(0, H - 0.9, W, H, 'hedge').block(0, 0, 0.5, H, 'hedge').block(W - 0.5, 0, W, H, 'hedge');
    const north = b.angledBays({ x: 6.5, y: 8.4 - 2.79, rowAng: 0, ang: -60, n });
    const south = b.angledBays({ x: 8, y: 13.2 + 2.79, rowAng: 0, ang: 60, n });
    const ti = 2 + Math.floor(r() * (n - 4));
    for (let i = 0; i < n; i++) { if (i !== ti && r() < 0.7) b.fill(north[i], { facing: 'nose' }); if (r() < 0.65) b.fill(south[i], { facing: 'nose' }); }
    if (env === 'night' || env === 'dusk') for (const x of [8, 19, 30]) { b.lamp(x, 1.45, { arm: 90, reach: 1.1, r: 9 }); b.lamp(x, H - 1.5, { arm: -90, reach: 1.1, r: 9 }); }
    if (env === 'rain') b.puddle(14 + r() * 10, 10.8, 1.5, 0.8);
    b.arrow(4.5, 10.8, 0).arrow(20, 10.8, 0);
    b.target(north[ti], { facing: 'nose' });
    b.start(Math.max(3.6, 1.2 + spec.length / 2 + 0.7), 10.8, 0);
  });
}
