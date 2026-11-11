// Milimetrik Park — Node testleri (DOM yok):
//  1) Sürüş ölçümleri: rölanti sürünmesi, dönüş çapı, fren mesafesi, frende kımıldamama, duvardan geçmeme.
//  2) Bölüm denetimi: başlangıç boş, hedef aracın sığacağı boyutta, ideal pozda isabet ≥ %95.
//  3) Kayıtlı çözümler (tools/solutions.json) gerçek fizikle sürülür: bölüm hasarsız bitmeli ve
//     "Usta" yıldızının hamle hedefi tutmalı. --plan ile çözümler planlayıcıyla yeniden üretilir (yavaş).
//  4) Determinizm: aynı girdi → aynı sonuç.
//
//   node games/milimetrik-park/tools/bot.mjs            (npm test bunu çalıştırır)
//   node games/milimetrik-park/tools/bot.mjs --plan     (çözümleri yeniden planla ve kaydet)
//   node games/milimetrik-park/tools/bot.mjs --plan --only paralel
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARS, PLAYER_CAR, DT } from '../src/config.js';
import { World, polyShape, boxVerts, LAYER, collideShapes } from '../src/sim/physics.js';
import { Vehicle, createCarBody } from '../src/sim/vehicle.js';
import { createGame } from '../src/sim/game.js';
import { LEVELS } from '../src/levels/index.js';
import { planPark } from '../src/sim/planner.js';

const here = dirname(fileURLToPath(import.meta.url));
const SOL_FILE = join(here, 'solutions.json');
const args = process.argv.slice(2);
const PLAN = args.includes('--plan');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) fails++; };
const kmh = (v) => (v * 3.6).toFixed(1);

// ------------------------------------------------------------ 1) sürüş ölçümleri
{
  const spec = CARS[PLAYER_CAR];
  const rig = (walls = []) => {
    const w = new World();
    for (const v of walls) w.addStatic(polyShape(v, { layer: LAYER.BODY, mask: LAYER.BODY }));
    w.finalizeStatics();
    const body = createCarBody(spec, 0, 0, 0);
    w.addBody(body);
    const car = new Vehicle(spec, body);
    w.controllers.push(car);
    const run = (sec, c, each) => { for (let i = 0, n = Math.round(sec / DT); i < n; i++) { car.setControls(c); w.step(DT); each?.(); } };
    return { w, car, body, run };
  };
  {
    const r = rig(); r.car.requestGear('D'); r.run(10, { throttle: 0, brake: 0 });
    check(r.car.vLong * 3.6 > 5 && r.car.vLong * 3.6 < 7.5, `D rölanti sürünmesi ${kmh(r.car.vLong)} km/h (5–7,5)`);
  }
  {
    const r = rig(); r.car.requestGear('D'); r.car.steer = 1;
    let mnx = Infinity, mxx = -Infinity;
    const fl = r.car.wheels[0];
    r.run(30, { throttle: 0, brake: 0, steerAbs: 1, autoCenter: false }, () => {
      const b = r.body, x = b.x + fl.bx * Math.cos(b.a) - fl.by * Math.sin(b.a);
      mnx = Math.min(mnx, x); mxx = Math.max(mxx, x);
    });
    const d = mxx - mnx;
    check(d > 9.8 && d < 11.2, `dönüş çapı (dış ön teker) ${d.toFixed(2)} m (9,8–11,2)`);
  }
  {
    const r = rig(); r.car.requestGear('D');
    r.run(30, { throttle: 0.5 });
    while (r.car.vLong > 30 / 3.6) { r.car.setControls({ throttle: 0, brake: 0.3 }); r.w.step(DT); }
    const x0 = r.body.x; let t = 0;
    while (r.car.speed > 0.01 && t < 10) { r.car.setControls({ brake: 1 }); r.w.step(DT); t += DT; }
    const d = r.body.x - x0;
    check(d > 3.6 && d < 5.6, `30 km/h'den fren mesafesi ${d.toFixed(2)} m (3,6–5,6)`);
    const x1 = r.body.x; r.run(5, { brake: 1 });
    check(Math.abs(r.body.x - x1) < 1e-4, `frende D'de kımıldamıyor (${((r.body.x - x1) * 1000).toFixed(3)} mm)`);
  }
  {
    const r = rig([boxVerts(30, 0, 0.15, 5, 0)]); r.car.requestGear('D');
    let mx = -Infinity;
    r.run(8, { throttle: 1 }, () => { const sh = r.body.shapes[0]; for (let i = 0; i < sh.n; i++) mx = Math.max(mx, sh.wx[i]); });
    check(mx < 29.85 + 0.06, `tam gazla duvara: iç içe geçme ${((mx - 29.85) * 100).toFixed(1)} cm (< 6)`);
  }
  {
    // kaldırım yalnızca tekerlekleri durdurur, gövde taşabilir
    const w = new World();
    w.addStatic(polyShape(boxVerts(12, 0, 0.1, 6, 0), { layer: LAYER.CURB, mask: LAYER.WHEEL, kind: 'curb' }));
    w.finalizeStatics();
    const body = createCarBody(spec, 0, 0, 0); w.addBody(body);
    const car = new Vehicle(spec, body); w.controllers.push(car); car.requestGear('D');
    for (let i = 0; i < 240 * 12; i++) { car.setControls({ throttle: 0, brake: 0 }); w.step(DT); }
    const sh = body.shapes[0]; let front = -Infinity; for (let i = 0; i < sh.n; i++) front = Math.max(front, sh.wx[i]);
    check(front > 11.95 && car.speed < 0.05, `kaldırım: teker durdu, tampon ${((front - 11.9) * 100).toFixed(0)} cm taştı`);
  }
}

// ------------------------------------------------------------ 2) bölüm denetimi
for (const L of LEVELS) {
  const g = createGame(L);
  let overlap = false;
  for (const sa of g.body.shapes) for (const sb of g.world.ground.shapes) {
    if ((sa.layer & sb.mask) && (sb.layer & sa.mask) && collideShapes(sa, sb)) overlap = true;
  }
  const t = g.targets[0];
  const fits = t.l >= g.car.geom.length + 0.3 && t.w >= g.car.geom.width + 0.2;
  // ideal poz
  const b = g.body, geom = g.car.geom, a = t.facing === 'tail' ? t.a + Math.PI : t.a;
  const cx = t.x + Math.cos(t.a) * (t.idealLong || 0) - Math.sin(t.a) * (t.idealLat || 0);
  const cy = t.y + Math.sin(t.a) * (t.idealLong || 0) + Math.cos(t.a) * (t.idealLat || 0);
  b.x = cx - Math.cos(a) * geom.gcx; b.y = cy - Math.sin(a) * geom.gcx; b.a = a; b.updateGeom();
  const e = g.evaluate(t);
  check(!overlap && fits && e.inside && e.quality >= 95, `${L.id}: başlangıç boş, hedef ${t.l}×${t.w} m, ideal pozda isabet %${e.quality}`);
}

// ------------------------------------------------------------ 3) çözümler
/** Bir manevrayı gerçek fizikle sürer: her bölümde dur → direksiyonu çevir → vites → sürün → dur. */
export function drive(level, segments) {
  const game = createGame(level);
  const car = game.car;
  const ctrl = { throttle: 0, brake: 1, handbrake: false, steerAbs: 0, steerDir: 0, autoCenter: false };
  const step = (n = 1) => { for (let i = 0; i < n; i++) game.step(ctrl); };
  const stop = () => { ctrl.brake = 1; let k = 0; while (Math.abs(car.vLong) > 0.005 && k++ < 2400) step(); step(12); };
  for (const sg of segments) {
    stop();
    ctrl.steerAbs = sg.steer;
    let k = 0;
    while (Math.abs(car.steer - sg.steer) > 0.001 && k++ < 2400) step();
    const gear = sg.dir > 0 ? 'D' : 'R';
    if (car.gear !== gear) game.requestGear(gear);
    // sürünme + frenle hız ayarı: sona yaklaştıkça yavaşla, tam noktada dur
    let dist = 0; k = 0;
    while (k++ < 240 * 60) {
      const remain = sg.len - dist;
      if (remain <= 0.002) break;
      const v = Math.abs(car.vLong), vt = Math.min(1.6, Math.sqrt(2 * 1.0 * remain) + 0.04);
      ctrl.brake = v > vt ? Math.min(1, (v - vt) * 4 + 0.3) : 0;
      step();
      dist += Math.abs(car.vLong) * DT;
    }
  }
  stop();
  game.requestGear('P');
  step(10);
  return game;
}

const sols = existsSync(SOL_FILE) ? JSON.parse(readFileSync(SOL_FILE, 'utf8')) : {};
for (const L of LEVELS) {
  if (ONLY && L.id !== ONLY) continue;
  if (PLAN) {
    const t0 = Date.now();
    let res = { ok: false, expanded: 0 };
    let expanded = 0;
    // en az hamleden başla: bulunan ilk çözüm, planlayıcının bulabildiği en az hamleli çözümdür
    outer: for (let m = 1; m <= L.par.moves + 2; m++) {
      for (const [margin, dq] of [[0.08, 6], [0.08, 2], [0.05, 2]]) {
        const r = planPark(L, { margin, maxMoves: m, minQuality: L.par.quality + dq, maxExpand: 300000 });
        expanded += r.expanded;
        if (r.ok) { res = r; res.margin = margin; break outer; }
      }
    }
    res.expanded = expanded;
    console.log(`  plan ${L.id}: ${res.ok ? `${res.moves} hamle, %${res.quality}, pay ${res.margin} m` : 'BULUNAMADI'} (${res.expanded} düğüm, ${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
    if (res.ok) sols[L.id] = { moves: res.moves, segments: res.segments };
  }
  const s = sols[L.id];
  if (!s) { check(false, `${L.id}: kayıtlı çözüm yok (--plan)`); continue; }
  const g = drive(L, s.segments);
  const r = g.result;
  check(g.status === 'done' && g.damage === 0, `${L.id}: çözüm sürüldü → ${g.status === 'done' ? `park, %${r.quality}, ${r.moves} hamle (hedef ≤${L.par.moves}), hasar %${Math.round(g.damage)}` : `${g.status}, hasar %${Math.round(g.damage)}, isabet ${g.lastParkEval ? '%' + g.lastParkEval.quality + (g.lastParkEval.inside ? '' : ' (dışarıda)') : '-'}`}`);
  if (g.status === 'done') check(r.stars[2], `${L.id}: "Usta" yıldızı alınabiliyor (≤${L.par.moves} hamle, %${L.par.quality}+)`);
}
if (PLAN) writeFileSync(SOL_FILE, JSON.stringify(sols, null, 1) + '\n');

// ------------------------------------------------------------ 4) determinizm
{
  const run = () => {
    const g = createGame(LEVELS[3]);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.requestGear('D');
    for (let i = 0; i < 240 * 20; i++) {
      if (i % 120 === 0 && rnd() < 0.3) g.requestGear(rnd() < 0.5 ? 'D' : 'R');
      g.step({ throttle: rnd() < 0.5 ? rnd() : 0, brake: rnd() < 0.2 ? rnd() : 0, steerAbs: Math.sin(i / 300) * 0.9, steerDir: 0, autoCenter: true });
    }
    return g.hash();
  };
  check(run() === run(), 'determinizm: aynı girdiler aynı sonucu veriyor');
}

if (fails) { console.log(`\n${fails} denetim başarısız.`); process.exit(1); }
console.log('\nMilimetrik Park: tüm denetimler geçti.');
