// Başsız otomatik pilot: her bölümü sabit bir sürüş stratejisiyle sürer; bitirip bitirmediğini, süreyi,
// yıldızı ve kargo durumunu raporlar. Kullanım:
//   node tools/bot.mjs [bölümId ...] [--vehicle tosun] [--speed m/s] [--max sn] [--strict]
// --strict: hedefi "bitir" olan bölümlerden biri bitmezse çıkış kodu 1 (npm test için).
import { createSim } from '../src/sim/sim.js';
import { CAMPAIGN, DEV_LEVELS, getLevel } from '../src/data/levels/index.js';
import { SIM } from '../src/config.js';

/**
 * Strateji: hedef hıza gaz/fren; havadayken burnu zemine paralel tutmaya çalışır.
 * Bölüm verisindeki `bot: {speed}` ipucunu kullanır. @returns {{throttle:number, brake:number}}
 */
export function autopilot(snap, target) {
  const v = snap.vehicle;
  const fwd = v.vx;
  let throttle = fwd < target ? 1 : 0, brake = fwd > target + 1.5 ? 1 : 0;
  if (v.airborne) {          // havada: açıyı düzelt (burun yukarı = gaz, aşağı = fren)
    const a = Math.atan2(Math.sin(v.a), Math.cos(v.a));
    throttle = a < -0.15 ? 1 : 0; brake = a > 0.15 ? 1 : 0;
  }
  return { throttle, brake };
}

export function runLevel(level, { vehicleId = 'tosun', speed, maxTime = 150 } = {}) {
  const sim = createSim({ level, vehicleId, upgrades: {}, settings: { assistLanding: true } });
  const target = speed ?? level.bot?.speed ?? 10;
  const ev = {};
  sim.on('*', (e) => { ev[e.name] = (ev[e.name] ?? 0) + 1; });
  let snap = sim.snapshot();
  const maxSteps = Math.round(maxTime / SIM.step);
  for (let i = 0; i < maxSteps && sim.status === 'running'; i++) {
    sim.step(autopilot(snap, target));
    if (i % 2 === 0) snap = sim.snapshot();   // 60 Hz'de karar ver
  }
  const r = sim.result ?? { result: 'timeout', reason: 'botTimeout', time: sim.time, stars: 0, score: 0, cargoDelivered: 0, cargoTotal: 0 };
  const out = { id: level.id, vehicleId, target, ...r, warnings: sim.warnings, events: ev };
  sim.destroy();
  return out;
}

// ---- CLI ----
const argv = process.argv.slice(2);
const opt = { vehicleId: 'tosun', strict: false };
const ids = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--vehicle') opt.vehicleId = argv[++i];
  else if (argv[i] === '--speed') opt.speed = +argv[++i];
  else if (argv[i] === '--max') opt.maxTime = +argv[++i];
  else if (argv[i] === '--strict') opt.strict = true;
  else ids.push(argv[i]);
}
const levels = ids.length ? ids.map((id) => getLevel(id)) : [...CAMPAIGN, ...DEV_LEVELS];
let failed = 0;
for (const lv of levels) {
  if (!lv) { console.error('Bölüm bulunamadı'); process.exit(2); }
  const r = runLevel(lv, opt);
  const ok = r.result === 'win';
  const mustFinish = CAMPAIGN.includes(lv);
  if (!ok && mustFinish) failed++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${r.id.padEnd(9)} ${r.vehicleId} hedef ${r.target} m/s  ${String(r.reason).padEnd(10)} ${r.time.toFixed(1)} sn  ★${r.stars}  skor ${r.score}  kargo ${r.cargoDelivered}/${r.cargoTotal}${r.warnings.length ? '  uyarı: ' + r.warnings.join('; ') : ''}`);
}
if (opt.strict && failed) { console.error(`${failed} kampanya bölümü bitirilemedi.`); process.exit(1); }
