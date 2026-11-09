// Başsız otomatik pilot: her bölümü bir sürüş stratejisiyle sürer; bitirip bitirmediğini, süreyi,
// yıldızı ve kargo durumunu raporlar. Node'da çalışır (DOM yok).
//
// Kullanım:
//   node tools/bot.mjs [bölümId ...] [--vehicle tosun|zipir|pasa|koca] [--matrix] [--speed m/s] [--max sn]
//                      [--determinism] [--strict] [--json]
//   --matrix       : seçili bölümler × tüm araçlar tablosu (varsayılan: yalnız Tosun)
//   --determinism  : her koşuyu iki kez sürüp sonuçların aynı olduğunu doğrular
//   --strict       : Tosun ile bir kampanya bölümü bitmezse ya da determinizm bozulursa çıkış kodu 1
//   --template ad [--d 0.5] [--biome kanyon] [--runs K] [--seed N] : tek Uzun Yol şablonunu K tohumla dener (ayar laboratuvarı); ad: 
//                    bumpRun hillRoll kicker rampGap bridge barrels seesaw softPatch sandDunes icePatch steepHill waterLogs
//   --endless      : Uzun Yol (sonsuz mod) koşusu. --seed N (varsayılan 1) --runs K (ardışık K tohum) --max sn (varsayılan 300)
//                    Rapor: mesafe, ölüm nedeni, teslimler, gövde sayısı/zemin düğümü/bellek (sabit kalmalı).
//
// Bölüm verisinde isteğe bağlı strateji ipuçları (`level.bot`):
//   { speed: 12,                      // hedef hız (m/s)
//     jumpSpeed: 18,                  // çukurdan önceki 45 m'de hedef hız
//     zones: [{ x0, x1, speed }],     // bölgesel hız (ör. köprüde yavaş)
//     vehicles: { zipir: { speed: 15 } } }   // araca özel geçersiz kılma
import { fileURLToPath } from 'node:url';
import { createSim } from '../src/sim/sim.js';
import { CAMPAIGN, DEV_LEVELS, getLevel } from '../src/data/levels/index.js';
import { SIM, VEHICLES, VEHICLE_ORDER } from '../src/config.js';
import { buildTemplate, TEMPLATE_NAMES } from '../src/data/endless.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Zemin eğimi (rad), x civarında. */
function slopeAt(st, x) {
  const { xs, ys } = st.terrain;
  for (let i = 0; i < xs.length - 1; i++) if (xs[i] < xs[i + 1] && x >= xs[i] && x <= xs[i + 1]) return Math.atan2(ys[i + 1] - ys[i], xs[i + 1] - xs[i]);
  return 0;
}

/** xs (azalmayan) içinde x'ten büyük-eşit ilk indeks. */
function lowerBound(xs, x) { let lo = 0, hi = xs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < x) lo = m + 1; else hi = m; } return lo; }

/** [x0,x1] aralığındaki çukur (atlanacak dik düşüş) başlangıçları; köprü altındakiler hariç. */
function findGaps(st, x0 = -Infinity, x1 = Infinity) {
  const { xs, ys } = st.terrain, out = [];
  for (let i = Math.max(0, lowerBound(xs, x0) - 1); i < xs.length - 1 && xs[i] <= x1; i++) {
    if (xs[i] === xs[i + 1] && ys[i + 1] < ys[i] - 0.1) {
      let j = i; while (j < xs.length - 1 && xs[j] === xs[j + 1]) j++;
      let k = j; while (k < xs.length - 1 && !(xs[k] === xs[k + 1] && ys[k + 1] > ys[k])) k++;   // karşı duvar
      if (ys[i] - ys[j] >= 2.5 && !(st.props ?? []).some((p) => p.type === 'bridge' && Math.abs(p.x - xs[i]) < 1.5)
        && !(st.water ?? []).some((w) => Math.abs(w.x0 - xs[i]) < 1.5)) out.push({ x: xs[i], w: xs[k] - xs[i] });
      i = j;
    }
  }
  return out;
}

/** Uzun Yol: algılanan yavaş bölgeler (köprü, tahterevalli, su, varil) — bot yalnızca static/snapshot'tan okur. */
function senseZones(snap, st, x) {
  const zones = [];
  for (const p of st.props ?? []) {
    if (p.type === 'bridge' && x > p.x - 18 && x < p.x + p.len + 4) zones.push({ x0: p.x - 7, x1: p.x + p.len + 3, speed: 6 });
    if (p.type === 'seesaw' && x > p.x - 18 && x < p.x + p.len + 6) zones.push({ x0: p.x - 6, x1: p.x + p.len + 4, speed: 7.5 });
  }
  for (const w of st.water ?? []) if (x > w.x0 - 18 && x < w.x1 + 4) zones.push({ x0: w.x0 - 7, x1: w.x1 + 3, speed: 5 });
  for (const o of snap.objects) if (o.type === 'barrel' && o.x > x && o.x < x + 30) { zones.push({ x0: o.x - 14, x1: o.x + 6, speed: 8 }); break; }
  return zones;
}

function surfAhead(st, x) {
  const { xs, surf } = st.terrain;
  const i = Math.min(surf.length - 1, Math.max(0, lowerBound(xs, x) - 1));
  return surf[i];
}

/** Strateji: hedef hıza gaz/fren; havada burnu inişteki zemin eğimine hizala. @returns {{throttle:number, brake:number}} */
export function autopilot(snap, st, plan) {
  const v = snap.vehicle;
  const x = v.x;
  let target = plan.speed;
  for (const z of plan.zones ?? []) if (x >= z.x0 && x <= z.x1) target = z.speed;
  let gaps = plan.gaps;
  if (plan.endless) {   // akan zemin: algıyı her kararda yenile
    for (const z of senseZones(snap, st, x)) if (x >= z.x0 && x <= z.x1) target = Math.min(target, z.speed);
    gaps = findGaps(st, x, x + 50);
    const sf = surfAhead(st, x + 3);
    if (sf === 'ice') target = Math.min(target, 9);
    else if (sf === 'sand' || sf === 'mud') target = Math.max(target, plan.speed + 2);
  } else if (!gaps) gaps = plan.gaps = findGaps(st);
  for (const g of gaps) if (x < g.x && x > g.x - 45) target = Math.max(target, Math.min(plan.jumpSpeed, 6 + 1.1 * g.w));   // çukura tam hızla gir
  const fwd = v.vx;
  let throttle = fwd < target ? 1 : 0, brake = fwd > target + 1.5 ? 1 : 0;
  if (v.airborne) {
    const want = slopeAt(st, x + Math.max(0, v.vx) * 0.6);
    const err = wrap(v.a - want);
    throttle = err < -0.12 - v.w * 0.1 ? 1 : 0;          // burun düşük → gaz (burun kalkar)
    brake = err > 0.12 - v.w * 0.1 ? 1 : 0;
  }
  return { throttle, brake };
}

export function runLevel(level, { vehicleId = 'tosun', speed, maxTime = 180 } = {}) {
  const sim = createSim({ level, vehicleId, upgrades: {}, settings: { assistLanding: true } });
  const plan = { speed: speed ?? level.bot?.vehicles?.[vehicleId]?.speed ?? level.bot?.speed ?? Math.min(12, VEHICLES[vehicleId].maxWheelSpeed * VEHICLES[vehicleId].wheelR * 0.6), zones: level.bot?.zones, jumpSpeed: level.bot?.jumpSpeed ?? 18, endless: !!level._tpl };
  const ev = {};
  sim.on('*', (e) => { ev[e.name] = (ev[e.name] ?? 0) + 1; });
  let snap = sim.snapshot();
  const maxSteps = Math.round(maxTime / SIM.step);
  for (let i = 0; i < maxSteps && sim.status === 'running'; i++) {
    sim.step(autopilot(snap, sim.static, plan));
    if (i % 2 === 0) snap = sim.snapshot();            // 60 Hz'de karar ver
  }
  const r = sim.result ?? { result: 'timeout', reason: 'botTimeout', time: sim.time, stars: 0, score: 0, cargoDelivered: 0, cargoTotal: snap.cargoSummary.total };
  const out = { id: level.id, vehicleId, target: plan.speed, ...r, warnings: sim.warnings, events: ev };
  sim.destroy();
  return out;
}

/** Şablon laboratuvarı: düz giriş + şablon + düz çıkış bölümü (bölüm gibi sürülür). */
export function templateLevel(name, { d = 0.5, biome = 'kanyon', seed = 1 } = {}) {
  const t = buildTemplate(name, d, biome, seed), lead = 30;
  return {
    id: `tpl-${name}`, name, biome, terrain: { surface: 'asphalt', pieces: [{ type: 'flat', len: lead, surface: 'asphalt' }, ...t.pieces, { type: 'flat', len: 20, surface: 'asphalt' }] },
    spawn: { x: 3 }, finish: { x: 'end' }, cargo: [{ type: 'crate', count: 2 }, { type: 'watermelon', count: 1 }, { type: 'eggs', count: 1 }], minDelivered: 0,
    objects: t.objects.map((o) => ({ ...o, x: o.x + lead })), hints: [], stars: { 2: [], 3: [] }, reward: { base: 0 }, bot: { speed: 11 }, _tpl: t,
  };
}

/** Uzun Yol koşusu: ölene ya da maxTime'a kadar sürer. Bellek/gövde/zemin düğümü örnekleri toplanır. */
export function runEndless({ seed = 1, vehicleId = 'tosun', maxTime = 300, speed } = {}) {
  const sim = createSim({ endless: { seed }, vehicleId, upgrades: {}, settings: { assistLanding: true } });
  const plan = { speed: speed ?? 11, jumpSpeed: 18, endless: true };
  const ev = {};
  let deliveries = 0, lastEv = null;
  sim.on('*', (e) => { ev[e.name] = (ev[e.name] ?? 0) + 1; if (e.name === 'delivery') deliveries++; if (e.name === 'crash') lastEv = e; });
  let snap = sim.snapshot();
  const maxSteps = Math.round(maxTime / SIM.step);
  const samples = [];
  let maxBodies = 0, maxPts = 0, maxJoints = 0, maxFix = 0;
  const w = sim._debug.world;
  for (let i = 0; i < maxSteps && sim.status === 'running'; i++) {
    sim.step(autopilot(snap, sim.static, plan));
    if (i % 2 === 0) snap = sim.snapshot();
    if (i % 120 === 0) {
      maxBodies = Math.max(maxBodies, w.getBodyCount()); maxJoints = Math.max(maxJoints, w.getJointCount());
      maxPts = Math.max(maxPts, sim.static.terrain.xs.length);
      let fx = 0; for (let b = w.getBodyList(); b; b = b.getNext()) for (let f = b.getFixtureList(); f; f = f.getNext()) fx++;
      maxFix = Math.max(maxFix, fx);
      if (i % (120 * 30) === 0) { globalThis.gc?.(); samples.push({ t: Math.round(i / 120), heapMB: +(process.memoryUsage().heapUsed / 1048576).toFixed(1), bodies: w.getBodyCount(), pts: sim.static.terrain.xs.length, dist: Math.round(snap.run.distance) }); }
    }
  }
  const r = sim.result ?? { result: 'alive', reason: 'botTimeout', time: sim.time, score: snap.score, distance: snap.run.distance, deliveries, pay: snap.endless?.pay ?? 0 };
  const cx = sim._debug.veh.chassis.getPosition().x;
  const seg = sim._debug.endless?.state.segs.find((q) => cx >= q.x0 && cx < q.x1);
  const out = { seed, vehicleId, ...r, deathAt: seg ? `${seg.template ?? seg.kind}@${Math.round(cx - seg.x0)}/${Math.round(seg.len)} ${seg.biome}` : '?', deliveries, maxBodies, maxJoints, maxFix, maxPts, samples, biome: sim.static.biome, events: ev, lastCrash: lastEv?.reason ?? null };
  sim.destroy();
  return out;
}

// ---- CLI ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opt = { vehicleId: 'tosun' }, flags = new Set(), ids = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--vehicle') opt.vehicleId = argv[++i];
    else if (argv[i] === '--speed') opt.speed = +argv[++i];
    else if (argv[i] === '--max') opt.maxTime = +argv[++i];
    else if (argv[i] === '--seed') opt.seed = +argv[++i];
    else if (argv[i] === '--template') opt.template = argv[++i];
    else if (argv[i] === '--d') opt.d = +argv[++i];
    else if (argv[i] === '--biome') opt.biome = argv[++i];
    else if (argv[i] === '--runs') opt.runs = +argv[++i];
    else if (argv[i].startsWith('--')) flags.add(argv[i].slice(2));
    else ids.push(argv[i]);
  }
  if (opt.template) {
    if (!TEMPLATE_NAMES.includes(opt.template)) { console.error('Şablonlar: ' + TEMPLATE_NAMES.join(' ')); process.exit(2); }
    const runs = opt.runs ?? 8, res = {};
    for (let k = 0; k < runs; k++) {
      const lv = templateLevel(opt.template, { d: opt.d ?? 0.5, biome: opt.biome ?? 'kanyon', seed: (opt.seed ?? 1) + k });
      const r = runLevel(lv, { ...opt, speed: undefined });
      const key = r.result === 'win' ? 'OK' : r.reason; res[key] = (res[key] ?? 0) + 1;
      console.log(`${r.result === 'win' ? 'OK  ' : 'FAIL'} ${opt.template} d=${opt.d ?? 0.5} ${opt.biome ?? 'kanyon'} seed ${(opt.seed ?? 1) + k}  ${String(r.reason).padEnd(10)} ${r.time.toFixed(1)} sn  kargo ${r.cargoDelivered}/${r.cargoTotal}  köprü-kırıldı:${r.events.bridgeBreak ?? 0}`);
    }
    console.log('Özet:', Object.entries(res).map(([k, v]) => `${k}×${v}`).join(' '));
    process.exit(0);
  }
  if (flags.has('endless')) {
    const runs = opt.runs ?? 1, rowsE = [];
    for (let k = 0; k < runs; k++) {
      const seed = (opt.seed ?? 1) + k, t0 = Date.now();
      const r = runEndless({ seed, vehicleId: opt.vehicleId, maxTime: opt.maxTime ?? 300, speed: opt.speed });
      let det = '';
      if (flags.has('determinism')) { const r2 = runEndless({ seed, vehicleId: opt.vehicleId, maxTime: opt.maxTime ?? 300, speed: opt.speed }); if (r2.distance !== r.distance || r2.score !== r.score || r2.reason !== r.reason) det = '  !DETERMINIZM'; }
      rowsE.push({ ...r, det: !!det });
      console.log(`seed ${String(seed).padStart(3)} ${opt.vehicleId.padEnd(5)} ${String(r.reason).padEnd(10)} ${r.distance.toFixed(0).padStart(5)} m  ${r.time.toFixed(0).padStart(4)} sn  teslim ${String(r.deliveries).padStart(2)}  kuruş ${String(r.pay ?? 0).padStart(4)}+${String(r.pickups ?? 0).padStart(3)}  skor ${String(r.score).padStart(6)}  gövde≤${r.maxBodies} eklem≤${r.maxJoints} fixture≤${r.maxFix} düğüm≤${r.maxPts}  (${((Date.now() - t0) / 1000).toFixed(1)} sn gerçek) ${r.reason === 'botTimeout' ? '' : 'ölüm: ' + r.deathAt}${det}`);
      if (flags.has('samples')) console.log('   örnekler:', r.samples.map((x) => `${x.t}s:${x.heapMB}MB/${x.bodies}g/${x.pts}d/${x.dist}m`).join('  '));
    }
    const mean = rowsE.reduce((a, r) => a + r.distance, 0) / rowsE.length;
    const hist = {}; for (const r of rowsE) hist[r.reason] = (hist[r.reason] ?? 0) + 1;
    const nd = rowsE.filter((r) => r.det).length;
    console.log(`\nÖzet: ${rowsE.length} koşu; ortalama mesafe ${mean.toFixed(0)} m (min ${Math.min(...rowsE.map((r) => r.distance)).toFixed(0)}, maks ${Math.max(...rowsE.map((r) => r.distance)).toFixed(0)}); ölüm nedenleri: ${Object.entries(hist).map(([k, v]) => `${k}×${v}`).join(' ')}; determinizm sapması: ${nd}`);
    process.exit(flags.has('strict') && nd ? 1 : 0);
  }
  const levels = ids.length ? ids.map((id) => getLevel(id)) : [...CAMPAIGN, ...DEV_LEVELS];
  const vehicles = flags.has('matrix') ? VEHICLE_ORDER.filter((v) => VEHICLES[v].implemented) : [opt.vehicleId];
  const rows = [];
  let hardFail = 0, nondet = 0;
  for (const lv of levels) {
    if (!lv) { console.error('Bölüm bulunamadı'); process.exit(2); }
    for (const vehicleId of vehicles) {
      const r = runLevel(lv, { ...opt, vehicleId });
      let det = '';
      if (flags.has('determinism')) {
        const r2 = runLevel(lv, { ...opt, vehicleId });
        const same = r.time === r2.time && r.score === r2.score && r.reason === r2.reason && r.cargoDelivered === r2.cargoDelivered;
        if (!same) { nondet++; det = '  !DETERMINIZM'; }
      }
      const ok = r.result === 'win';
      if (!ok && CAMPAIGN.includes(lv) && vehicleId === 'tosun') hardFail++;
      rows.push({ ...r, ok });
      if (flags.has('json')) continue;
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${r.id.padEnd(9)} ${vehicleId.padEnd(6)} hedef ${String(r.target.toFixed?.(0) ?? r.target).padStart(2)} m/s  ${String(r.reason).padEnd(10)} ${r.time.toFixed(1).padStart(5)} sn  ★${r.stars}  skor ${String(r.score).padStart(5)}  kargo ${r.cargoDelivered}/${r.cargoTotal}${r.warnings.length ? '  uyarı: ' + r.warnings.join('; ') : ''}${det}`);
    }
  }
  if (flags.has('json')) console.log(JSON.stringify(rows.map(({ events, ...r }) => r), null, 1));
  const wins = rows.filter((r) => r.ok).length;
  console.log(`\nÖzet: ${wins}/${rows.length} koşu bitti; Tosun kampanya başarısız: ${hardFail}; determinizm sapması: ${nondet}`);
  if (flags.has('strict') && (hardFail || nondet)) process.exit(1);
}
