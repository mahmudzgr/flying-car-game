// Milimetrik Park — Node testleri (DOM yok):
//  1) Sürüş ölçümleri (6 araç): rölanti sürünmesi, dönüş çapı, fren mesafesi, frende kımıldamama.
//  2) Sürüş kolu yardımcısı: hız takibi, bırakınca durup bekleme, yokuşta kalkış; pedal şemasında Auto Hold.
//  3) Römork: mafsal sağlamlığı, makaslama sınırı, yörünge tahmini.
//  4) Bölüm denetimi: başlangıç boş, hedef ideal pozda içeride ve %95+, 3 sn boşta hatasız (ajanlarla).
//  5) Kayıtlı çözümler (tools/solutions.json) sürüş koluyla gerçek fizikte sürülür: bölüm hasarsız bitmeli ve
//     "Usta" yıldızının hamle hedefi tutmalı. --plan ile çözümler planlayıcıyla yeniden üretilir (yavaş).
//  6) Günlük görev: örnek tarihler kurulur (--plan ile çözülebilirlikleri de denenir). Determinizm.
//
//   node games/milimetrik-park/tools/bot.mjs                     (npm test bunu çalıştırır)
//   node games/milimetrik-park/tools/bot.mjs --plan              (tüm çözümleri yeniden planla ve kaydet)
//   node games/milimetrik-park/tools/bot.mjs --plan --only kavsak
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VEHICLES, VEHICLE_ORDER, DT } from '../src/config.js';
import { World, polyShape, boxVerts, LAYER, collideShapes } from '../src/sim/physics.js';
import { Vehicle, TrailerAxle, createRig, trailerGeom } from '../src/sim/vehicle.js';
import { Driver, leverSpeed } from '../src/sim/assist.js';
import { createGame } from '../src/sim/game.js';
import { LEVELS, EXAMS, PLAYGROUND, VALET_LOT } from '../src/levels/index.js';
import { dailyLevel } from '../src/modes/daily.js';
import { makeLevel } from '../src/levels/build.js';
import { planPark } from '../src/sim/planner.js';
import { drive, createDriver } from './drive.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SOL_FILE = join(here, 'solutions.json');
const args = process.argv.slice(2);
const PLAN = args.includes('--plan');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) fails++; };
const kmh = (v) => (v * 3.6).toFixed(1);

function rig(id, walls = [], terrain = null) {
  const w = new World();
  for (const v of walls) w.addStatic(polyShape(v, { layer: LAYER.BODY, mask: LAYER.BODY }));
  w.finalizeStatics();
  const spec = VEHICLES[id], r = createRig(spec, 0, 0, 0);
  w.addBody(r.body);
  const car = new Vehicle(spec, r.body);
  w.controllers.push(car);
  if (r.trailer) { w.addBody(r.trailer); w.joints.push(r.joint); w.controllers.push(new TrailerAxle(spec.trailer, r.trailer, car)); }
  if (terrain) car.terrain = terrain;
  const drv = new Driver(car);
  const gear = (g) => car.requestGear(g);
  const run = (sec, raw, each) => { for (let i = 0, n = Math.round(sec / DT); i < n; i++) { drv.update(raw, DT, gear); w.step(DT); each?.(); } };
  return { w, car, body: r.body, trailer: r.trailer, joint: r.joint, drv, run, spec };
}

if (!ONLY) {
  // ------------------------------------------------------------ 1) sürüş ölçümleri
  for (const id of VEHICLE_ORDER) {
    const spec = VEHICLES[id];
    const out = [];
    let ok = true;
    {
      const r = rig(id); r.drv.scheme = 'pedals'; r.drv.autoHold = false; r.car.requestGear('D'); r.run(10, { throttle: 0, brake: 0 });
      const v = r.car.vLong * 3.6; out.push(`sürünme ${v.toFixed(1)} km/h`); ok &&= v > 4.5 && v < 7.5;
    }
    if (!spec.trailer) {
      const r = rig(id); r.drv.scheme = 'pedals'; r.drv.autoHold = false; r.car.requestGear('D'); r.car.steer = 1;
      let mnx = Infinity, mxx = -Infinity; const fl = r.car.wheels[0];
      r.run(30, { throttle: 0, brake: 0, steerAbs: 1, autoCenter: false }, () => { const b = r.body, x = b.x + fl.bx * Math.cos(b.a) - fl.by * Math.sin(b.a); mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); });
      const d = mxx - mnx; out.push(`dönüş çapı ${d.toFixed(2)} m (hedef ${spec.turning})`); ok &&= Math.abs(d - spec.turning) < 0.5;
    }
    {
      const r = rig(id); r.drv.scheme = 'pedals'; r.drv.autoHold = false; r.car.requestGear('D');
      r.run(30, { throttle: 0.5 });
      let k = 0; while (r.car.vLong > 30 / 3.6 && k++ < 24000) { r.drv.update({ throttle: 0, brake: 0.3 }, DT, () => {}); r.w.step(DT); }
      const x0 = r.body.x; let t = 0;
      while (r.car.speed > 0.01 && t < 10) { r.drv.update({ brake: 1 }, DT, () => {}); r.w.step(DT); t += DT; }
      const d = r.body.x - x0; out.push(`30→0 ${d.toFixed(2)} m`); ok &&= d > 3.4 && d < 6.5;
      const x1 = r.body.x; r.run(4, { brake: 1 });
      out.push(`tutma ${((r.body.x - x1) * 1000).toFixed(2)} mm`); ok &&= Math.abs(r.body.x - x1) < 2e-4;
    }
    check(ok, `${spec.name} (${spec.kind}): ${out.join(', ')}`);
  }
  {
    const r = rig('serce', [boxVerts(30, 0, 0.15, 5, 0)]); r.drv.scheme = 'pedals'; r.car.requestGear('D');
    let mx = -Infinity;
    r.run(8, { throttle: 1 }, () => { const sh = r.body.shapes[0]; for (let i = 0; i < sh.n; i++) mx = Math.max(mx, sh.wx[i]); });
    check(mx < 29.85 + 0.06, `tam gazla duvara: iç içe geçme ${((mx - 29.85) * 100).toFixed(1)} cm (< 6)`);
  }

  // ------------------------------------------------------------ 2) sürüş kolu ve Auto Hold
  {
    const r = rig('serce');
    const out = []; let ok = true;
    for (const L of [0.2, 0.4, 0.7]) {
      r.run(6, { lever: L }); const want = leverSpeed((L - 0.06) / 0.94, 1);
      out.push(`${L}→${kmh(r.car.vLong)}`); ok &&= Math.abs(r.car.vLong - want) < 0.15;
    }
    r.run(4, { lever: 0 }); const x0 = r.body.x; r.run(3, { lever: 0 });
    ok &&= Math.abs(r.body.x - x0) < 1e-4 && Math.abs(r.car.vLong) < 0.01;
    r.run(4, { lever: -0.4 }); ok &&= r.car.gear === 'R' && r.car.vLong < -0.5;
    check(ok, `sürüş kolu: hız takibi (km/h) ${out.join(' ')}, bırakınca duruyor ve bekliyor, geriye kendiliğinden R`);
  }
  {
    const slope = () => ({ mu: 1, sx: -9.81 * Math.sin(Math.atan(0.12)), sy: 0, kind: 'ramp' });
    const r = rig('pelikan', [], slope);
    r.run(2, { lever: 0 }); const x0 = r.body.x; r.run(3, { lever: 0 });
    const held = Math.abs(r.body.x - x0) < 1e-3;
    r.run(6, { lever: 0.25 });
    check(held && r.car.vLong > 0.3, `%12 yokuş (Pelikan): bırakılıyken kaymıyor, az kolla tırmanıyor (${kmh(r.car.vLong)} km/h)`);
  }
  {
    const r = rig('serce'); r.drv.scheme = 'pedals'; r.car.requestGear('D'); r.run(3, { throttle: 0, brake: 0 }); r.run(2, { brake: 1 });
    r.car.requestGear('R'); const x = r.body.x; r.run(2, { brake: 0 });
    const held = Math.abs(r.body.x - x) < 1e-4;
    r.run(0.3, { throttle: 0.15 }); r.run(1.5, { throttle: 0 });
    check(held && r.car.vLong < -0.3, 'Auto Hold: frenle durup vites değişince araç kaçmıyor; gaza dokununca bırakıyor');
  }

  // ------------------------------------------------------------ 3) römork
  {
    const r = rig('kervan');
    const j = r.joint;
    let maxErr = 0;
    const err = () => { const A = j.A, B = j.B; const ax = A.x + j.lax * Math.cos(A.a) - j.lay * Math.sin(A.a), ay = A.y + j.lax * Math.sin(A.a) + j.lay * Math.cos(A.a); const bx = B.x + j.lbx * Math.cos(B.a) - j.lby * Math.sin(B.a), by = B.y + j.lbx * Math.sin(B.a) + j.lby * Math.cos(B.a); return Math.hypot(ax - bx, ay - by); };
    r.run(3, { lever: 0.45, steerAbs: 0 }, () => { maxErr = Math.max(maxErr, err()); });
    r.run(6, { lever: 0.35, steerAbs: 1, autoCenter: false }, () => { maxErr = Math.max(maxErr, err()); });
    // geri giderken ters kilit: römork makaslar, mafsal sınırında (75°) durmalı
    let maxAng = 0;
    r.run(14, { lever: -0.35, steerAbs: -1, autoCenter: false }, () => { maxErr = Math.max(maxErr, err()); maxAng = Math.max(maxAng, Math.abs(j.angle * 180 / Math.PI)); });
    check(maxErr < 0.005 && maxAng > 70 && maxAng <= 76, `römork: mafsal açılması en çok ${(maxErr * 1000).toFixed(1)} mm, geri giderken makaslama ${maxAng.toFixed(1)}° (sınır 75°)`);
  }
  {
    const L = makeLevel({ id: 't', name: 't', w: 80, h: 80, vehicle: 'kervan' }, (b) => { b.rect('asphalt', 0, 0, 80, 80); b.target({ x: 70, y: 70, a: 0, l: 6, w: 3 }); b.start(30, 40, 0); });
    const tg = trailerGeom(VEHICLES.kervan.trailer);
    let worst = 0;
    for (const steer of [0.15, -0.3, 0.6]) {
      const g = createGame(L);
      for (let i = 0; i < 240 * 3; i++) g.step({ lever: 0.4, steerAbs: 0 });
      for (let i = 0; i < 240 * 2; i++) g.step({ lever: 0, steerAbs: steer, autoCenter: false });
      while (g.car.gear !== 'R') g.step({ lever: -0.25, steerAbs: steer, autoCenter: false });
      const pred = g.guides(3.0), N = pred.trailer.left.length;
      let tr = 0;
      while (tr < 3.0) { g.step({ lever: -0.25, steerAbs: steer, autoCenter: false }); tr += Math.abs(g.car.vLong) * DT; }
      const t = g.trailer, c = Math.cos(t.a), s = Math.sin(t.a);
      const px = t.x - c * tg.hl + s * tg.hw, py = t.y - s * tg.hl - c * tg.hw;
      worst = Math.max(worst, Math.hypot(pred.trailer.left[N - 2] - px, pred.trailer.left[N - 1] - py));
    }
    check(worst < 0.06, `römork yörünge çizgisi: 3 m geride gerçek yolla fark en çok ${(worst * 100).toFixed(1)} cm`);
  }
}

// ------------------------------------------------------------ 4) bölüm denetimi
const ALL = [...LEVELS, ...EXAMS, PLAYGROUND, VALET_LOT];
function staticCheck(L) {
  const g = createGame(L);
  const issues = [];
  for (const B of g.playerBodies) for (const sa of B.shapes) for (const sb of g.world.ground.shapes) {
    if ((sa.layer & sb.mask) && (sb.layer & sa.mask) && collideShapes(sa, sb)) issues.push(`başlangıç ${sa.kind}↔${sb.kind}`);
  }
  const cars = g.world.ground.shapes.filter((s) => s.kind === 'car');
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) if (collideShapes(cars[i], cars[j])) issues.push('park araçları çakışıyor');
  for (let i = 0; i < 720; i++) g.step({ lever: 0, steerDir: 0 });
  if (g.status !== 'play') issues.push(`boşta ${g.status} (${g.failReason})`);
  // ideal poz (ayrı oyunda; ışınlamak fiziği bozmasın)
  const spots = L.tasks ? L.tasks.filter((t) => t.type === 'park').map((t) => L.spots[t.spot]) : g.targets;
  for (const t of spots.slice(0, 6)) {
    const h = createGame(L, { noAgents: true });
    const sb = h.subject(t), a = t.facing === 'tail' ? t.a + Math.PI : t.a;
    const cx = t.x + Math.cos(t.a) * (t.idealLong || 0) - Math.sin(t.a) * (t.idealLat || 0);
    const cy = t.y + Math.sin(t.a) * (t.idealLong || 0) + Math.cos(t.a) * (t.idealLat || 0);
    if (sb === h.body) { const gm = h.car.geom; sb.x = cx - Math.cos(a) * gm.gcx; sb.y = cy - Math.sin(a) * gm.gcx; } else { sb.x = cx; sb.y = cy; }
    sb.a = a; sb.updateGeom();
    const e = h.evaluate(t);
    if (!e.inside || e.quality < 95) issues.push(`ideal pozda %${e.quality}${e.inside ? '' : ' dışarıda'}`);
    for (const sa of sb.shapes) for (const s2 of h.world.ground.shapes) {
      if (s2.kind === 'stopper') continue;
      if ((sa.layer & s2.mask) && (s2.layer & sa.mask) && collideShapes(sa, s2)) { issues.push(`ideal pozda ${sa.kind}↔${s2.kind}`); break; }
    }
  }
  return [...new Set(issues)];
}
if (!ONLY) {
  for (const L of ALL) { const iss = staticCheck(L); check(!iss.length, `${L.id}: kurulum${iss.length ? ' — ' + iss.join(', ') : ''}`); }
}

// ------------------------------------------------------------ 5) çözümler
/** Sınav bölümünde tek bir park görevi: görevsiz, yalnız o yerin hedef olduğu kopya. */
function examTask(L, t) {
  return { ...L, id: `${L.id}#${t.spot}`, tasks: null, exam: null, par: { moves: 99, quality: L.par.quality }, spots: [{ ...L.spots[t.spot], target: true }], start: { ...t.from, gear: 'P' } };
}

/**
 * Kapalı döngü sürüş: planı sürer, yolun sonuna ~10 m ve ~3,5 m kala (römorkta daha sık) durur ve bulunduğu yerden yeniden planlar
 * (gerçek bir sürücünün düzeltmesi gibi; uzun yolda biriken birkaç cm'lik sapmayı siler). Sonuç deterministiktir:
 * kaydedilen parça listesi ({reset} işaretleriyle) aynen yeniden sürülünce aynı sonucu verir.
 */
function closedLoop(L, plan, margin, minQuality, weight) {
  const d = createDriver(L);
  let segs = plan.segments;
  const out = [];
  // römorkla geri gitmek kararsızdır (sapma büyür): daha sık dur ve yeniden planla
  for (const R of L.vehicle && VEHICLES[L.vehicle].trailer ? [24, 18, 13, 9, 6, 3.5] : [10, 3.5]) {
    let rem = segs.reduce((n, g) => n + g.len, 0), k = 0;
    while (k < segs.length && rem - segs[k].len >= R) { rem -= segs[k].len; k++; }
    if (k === 0) continue;
    const prefix = segs.slice(0, k);
    d.run(prefix); d.run([{ reset: 1 }]);
    out.push(...prefix, { reset: 1 });
    if (d.game.status !== 'play') break;
    let re = { ok: false };
    for (const m of [margin, margin * 0.6]) {
      re = planPark(L, { margin: m, maxMoves: plan.moves, minQuality, maxExpand: 250000, weight, start: d.pose(), dir0: d.lastDir, moves0: d.game.moves, steer0: prefix[k - 1].steer });
      if (re.ok) break;
    }
    segs = re.ok ? re.segments : segs.slice(k);
  }
  d.run(segs); out.push(...segs);
  return { game: d.finish(), segments: out };
}

/**
 * En az hamleli çözümü arar. accept(game) kapalı döngü sürüşün sonucunu onaylar; onaylanmazsa aynı hamle
 * sayısında daha sıkı hedef/daha geniş payla yeniden denenir.
 */
function planLevel(L, accept = () => true) {
  let res = { ok: false }, expanded = 0;
  const trailer = !!VEHICLES[L.vehicle || 'serce']?.trailer;
  const maxM = Math.min(L.par.moves + 2, 6);
  const budget = trailer ? 6e6 : 4e6;
  // römorkta fizik ile kinematik model uzun yolda birkaç cm ayrışır: pay daha geniş
  // [pay, isabet payı, A* ağırlığı]; römorkta 4 boyutlu arama uzayı büyük: daha açgözlü (ağırlıklı) A*
  const combos = trailer ? [[0.16, 6, 2.5], [0.16, 10, 2.5], [0.22, 8, 2.5], [0.12, 2, 2.5], [0.1, 1, 5]] : [[0.08, 6], [0.08, 10], [0.12, 8], [0.05, 2]];
  const parM = Math.min(L.par.moves, 3);
  outer: for (let m = 1; m <= maxM; m++) {
    // hedeften az hamleyle yalnızca hızlı bir deneme; hedef hamlede ve üstünde tüm seçenekler, geniş bütçe
    for (const [margin, dq, weight] of m < parM ? combos.slice(0, 1) : combos) {
      if (expanded > budget) break outer;
      const r = planPark(L, { margin, maxMoves: m, minQuality: L.par.quality + dq, maxExpand: m < parM ? 200000 : 900000, weight });
      expanded += r.expanded;
      if (r.ok) {
        r.margin = margin;
        const cl = closedLoop(L, r, margin, L.par.quality + Math.max(4, dq), weight);
        const sol = { ...r, segments: cl.segments, driven: cl.game };
        if (accept(cl.game)) { res = sol; break outer; }
        if (!res.ok) res = sol;   // hiçbiri onaylanmazsa en azından bulunan ilk çözüm kalsın
      }
    }
  }
  res.expanded = expanded;
  return res;
}

/** Plan kipinde: çözümü hemen dosyaya yaz (paralel süreçler için oku-değiştir-yaz). */
function saveSolution(key, val) {
  let cur = {};
  try { cur = JSON.parse(readFileSync(SOL_FILE, 'utf8')); } catch { cur = {}; }
  if (val) cur[key] = val; else delete cur[key];
  writeFileSync(SOL_FILE, JSON.stringify(cur, null, 1) + '\n');
}

const sols = existsSync(SOL_FILE) ? JSON.parse(readFileSync(SOL_FILE, 'utf8')) : {};
const targets = [...LEVELS.map((L) => ({ key: L.id, L })), ...EXAMS.flatMap((E) => E.tasks.filter((t) => t.type === 'park').map((t) => ({ key: `${E.id}#${t.spot}`, L: examTask(E, t) })))];
for (const { key, L } of targets) {
  if (ONLY && !ONLY.split(',').some((o) => key.startsWith(o))) continue;
  if (PLAN) {
    const t0 = Date.now();
    const res = planLevel(L, (g) => g.status === 'done' && g.damage === 0 && g.result.quality >= L.par.quality);
    console.log(`  plan ${key}: ${res.ok ? `${res.moves} hamle, %${res.quality}, pay ${res.margin} m` : 'BULUNAMADI'} (${res.expanded} düğüm, ${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
    if (res.ok) sols[key] = { moves: res.moves, segments: res.segments };
    else delete sols[key];
    saveSolution(key, sols[key]);
  }
  const s = sols[key];
  if (!s) { check(false, `${key}: kayıtlı çözüm yok (--plan)`); continue; }
  const g = drive(L, s.segments);
  const r = g.result;
  const ok = g.status === 'done' && g.damage === 0;
  check(ok, `${key}: çözüm sürüldü → ${g.status === 'done' ? `park, %${r.quality}, ${r.moves} hamle (hedef ≤${L.par.moves}), hasar %${Math.round(g.damage)}` : `${g.status}, hasar %${Math.round(g.damage)}, isabet ${g.lastParkEval ? '%' + g.lastParkEval.quality + (g.lastParkEval.inside ? '' : ' (dışarıda)') : '-'}`}`);
  if (ok && !key.includes('#')) check(r.stars[2], `${key}: "Usta" yıldızı alınabiliyor (≤${L.par.moves} hamle, %${L.par.quality}+)`);
}

// ------------------------------------------------------------ 6) günlük görev ve determinizm
if (!ONLY || ONLY.split(',').includes('gunluk')) {
  const days = [];
  const d0 = new Date('2026-11-01T12:00:00Z');
  for (let i = 0; i < (PLAN ? 12 : 30); i++) { const d = new Date(d0.getTime() + i * 86400000); days.push(d.toISOString().slice(0, 10)); }
  let bad = 0, planned = 0;
  for (const day of days) {
    const L = dailyLevel(day);
    const iss = staticCheck(L);
    if (iss.length) { bad++; console.log(`  ✗ ${L.id}: ${iss.join(', ')}`); continue; }
    if (PLAN) {
      const res = planLevel(L, (g) => g.status === 'done' && g.damage === 0);
      if (!res.ok) { bad++; console.log(`  ✗ ${L.id} (${L.short}, ${L.vehicle}): çözüm bulunamadı`); continue; }
      const g = drive(L, res.segments);
      if (g.status !== 'done' || g.damage > 0) { bad++; console.log(`  ✗ ${L.id}: sürüş ${g.status}`); continue; }
      planned++;
    }
  }
  check(!bad, `günlük görev: ${days.length} tarih kuruldu${PLAN ? `, ${planned} tanesi çözülüp sürüldü` : ''}`);
}
if (!ONLY) {
  const run = () => {
    const g = createGame(LEVELS.find((l) => l.id === 'yokus'), { seed: 3 });
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 240 * 20; i++) g.step({ lever: Math.sin(i / 400) * 0.7, steerAbs: Math.sin(i / 300) * 0.9, steerDir: 0, autoCenter: rnd() < 2 });
    return g.hash();
  };
  check(run() === run(), 'determinizm: aynı girdiler aynı sonucu veriyor (trafik dahil)');
}

if (fails) { console.log(`\n${fails} denetim başarısız.`); process.exit(1); }
console.log('\nMilimetrik Park: tüm denetimler geçti.');
