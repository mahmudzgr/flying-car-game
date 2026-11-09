// Başsız otomatik pilot: her bölümü bir sürüş stratejisiyle sürer; bitirip bitirmediğini, süreyi,
// yıldızı ve kargo durumunu raporlar. Node'da çalışır (DOM yok).
//
// Kullanım:
//   node tools/bot.mjs [bölümId ...] [--vehicle tosun|zipir|pasa|koca] [--matrix] [--speed m/s] [--max sn]
//                      [--determinism] [--strict] [--json]
//   --matrix       : seçili bölümler × tüm araçlar tablosu (varsayılan: yalnız Tosun)
//   --determinism  : her koşuyu iki kez sürüp sonuçların aynı olduğunu doğrular
//   --strict       : Tosun ile bir kampanya bölümü bitmezse ya da determinizm bozulursa çıkış kodu 1
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

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Zemin eğimi (rad), x civarında. */
function slopeAt(st, x) {
  const { xs, ys } = st.terrain;
  for (let i = 0; i < xs.length - 1; i++) if (xs[i] < xs[i + 1] && x >= xs[i] && x <= xs[i + 1]) return Math.atan2(ys[i + 1] - ys[i], xs[i + 1] - xs[i]);
  return 0;
}

/** Çukur (atlanacak dik düşüş) başlangıçlarının x listesi; köprü altındakiler hariç. */
function findGaps(st) {
  const { xs, ys } = st.terrain, out = [];
  for (let i = 0; i < xs.length - 1; i++) {
    if (xs[i] === xs[i + 1] && ys[i + 1] < ys[i] - 0.1) {
      let j = i; while (j < xs.length - 1 && xs[j] === xs[j + 1]) j++;
      let k = j; while (k < xs.length - 1 && !(xs[k] === xs[k + 1] && ys[k + 1] > ys[k])) k++;   // karşı duvar
      if (ys[i] - ys[j] >= 2.5 && !(st.props ?? []).some((p) => p.type === 'bridge' && Math.abs(p.x - xs[i]) < 1.5)) out.push({ x: xs[i], w: xs[k] - xs[i] });
      i = j;
    }
  }
  return out;
}

/** Strateji: hedef hıza gaz/fren; havada burnu inişteki zemin eğimine hizala. @returns {{throttle:number, brake:number}} */
export function autopilot(snap, st, plan) {
  const v = snap.vehicle;
  const x = v.x;
  let target = plan.speed;
  for (const z of plan.zones ?? []) if (x >= z.x0 && x <= z.x1) target = z.speed;
  if (!plan.gaps) plan.gaps = findGaps(st);
  for (const g of plan.gaps) if (x < g.x && x > g.x - 45) target = Math.max(target, Math.min(plan.jumpSpeed, 6 + 1.1 * g.w));   // çukura tam hızla gir
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
  const plan = { speed: speed ?? level.bot?.vehicles?.[vehicleId]?.speed ?? level.bot?.speed ?? Math.min(12, VEHICLES[vehicleId].maxWheelSpeed * VEHICLES[vehicleId].wheelR * 0.6), zones: level.bot?.zones, jumpSpeed: level.bot?.jumpSpeed ?? 18 };
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

// ---- CLI ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opt = { vehicleId: 'tosun' }, flags = new Set(), ids = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--vehicle') opt.vehicleId = argv[++i];
    else if (argv[i] === '--speed') opt.speed = +argv[++i];
    else if (argv[i] === '--max') opt.maxTime = +argv[++i];
    else if (argv[i].startsWith('--')) flags.add(argv[i].slice(2));
    else ids.push(argv[i]);
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
