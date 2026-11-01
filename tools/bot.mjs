// Autopilot bot: verifies every level is completable with the real physics/rules
// and prints the speed band, success rate and stats per level.
import { LEVELS } from '../src/levels.js';
import { Run } from '../src/run.js';
import { restHeight } from '../src/physics.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function autopilot(run, cfg) {
  const car = run.car;
  const L = run.L;
  const inp = run.input;
  inp.gas = inp.brake = inp.thrust = inp.rotL = inp.rotR = false;
  if (run.phase === 'drive') {
    if (run.time < cfg.wait) return;
    // like a player following the HUD: reach the target speed, then coast up the ramp
    if (car.vx < cfg.speed && (!cfg.coast || car.x < L.rampX)) inp.gas = true;
    return;
  }
  if (run.phase !== 'air' && run.phase !== 'touchdown') return;
  const g = run.world.gravity;
  // ski hill: align with the slope below, never use the main thruster
  if (L.pad.hill) {
    const below = run.world.raycast(car.x, car.y, 0, -1, 300);
    const target = below ? Math.atan2(-below.nx, below.ny) : 0;
    const err = wrap(car.a - target);
    const desired = Math.max(-6, Math.min(6, -3.2 * err));
    if (car.w < desired - 0.35) inp.rotL = true;
    else if (car.w > desired + 0.35) inp.rotR = true;
    return;
  }
  // horizontal guidance: predict the touchdown x and tilt back to brake if overshooting
  let target = L.pad.body.state.angle;
  const rh0 = restHeight(g);
  const hAbovePad = car.y - rh0 - L.pad.y;
  let tHit = 0;
  {
    const disc = car.vy * car.vy + 2 * g * Math.max(0, hAbovePad);
    tHit = (car.vy + Math.sqrt(disc)) / g;
  }
  const padCX = L.pad.body.state.ox + (cfg.lead ? L.pad.body.state.vx * tHit : 0);
  const xLand = car.x + car.vx * tHit * 1.15;
  const over = xLand - padCX;
  const desiredVxAtTouch = Math.min(12, Math.sqrt(Math.max(0, 2 * 7 * (L.pad.x1 - padCX)))) ;
  const brakeTilt = car.vy < 0 && (over > 3 || car.vx > desiredVxAtTouch + 6) ? Math.min(0.55, 0.12 + Math.max(0, over) * 0.02) : 0;
  target += brakeTilt;
  // flips first
  const flipsDone = run.pendingBack + run.pendingFront;
  const tooLow = car.vy < 0 && (car.y - L.pad.y) < 18 + Math.abs(car.vy) * 1.2;
  if (flipsDone < cfg.flips && !tooLow && run.phase === 'air') {
    if (cfg.dir > 0) inp.rotL = true; else inp.rotR = true;
  } else {
    const err = wrap(car.a - target);
    const desired = Math.max(-6, Math.min(6, -3.2 * err));
    if (car.w < desired - 0.35) inp.rotL = true;
    else if (car.w > desired + 0.35) inp.rotR = true;
  }
  // suicide burn toward the surface below (or pad height)
  const rh = restHeight(g);
  const hit = run.world.raycast(car.x, car.y, 0, -1, 200);
  // aim the burn at the pad height while the pad is still ahead (like a player watching the pad)
  const surfY = Math.max(hit ? hit.y : L.pad.y, car.x < L.pad.body.state.ox + L.pad.len / 2 + 5 ? L.pad.y : -1e9);
  const h = Math.max(0.1, car.y - rh - surfY);
  const netA = car.thrustAccel * Math.cos(car.a) - g;
  const vt = -1.2;
  if (car.vy < vt && netA > 0) {
    const req = (car.vy * car.vy - vt * vt) / (2 * h);
    if (req > netA * 0.8 && Math.abs(wrap(car.a - target)) < 0.6) inp.thrust = true;
  }
  if (brakeTilt > 0.1 && car.vy < -2.5 && Math.abs(wrap(car.a - target)) < 0.2 && car.fuel > 30 && hAbovePad > 2) inp.thrust = true;
}

export function simulate(def, cfg, maxT = 60) {
  const run = new Run(def);
  while (!run.done && run.time < maxT) {
    autopilot(run, cfg);
    for (let i = 0; i < 4; i++) run.step();
  }
  return run;
}

if (typeof process !== "undefined" && import.meta.url === `file://${process.argv[1]}`) main();
function main() {
const only = process.argv[2] ? Number(process.argv[2]) : null;
const COAST = !process.argv.includes('--gas');
let allOk = true;
for (const def of LEVELS) {
  if (only && def.id !== only) continue;
  const probe = new Run(def);
  const band = probe.L.speedBand;
  let ok = 0, total = 0;
  const reasons = {};
  let best = null;
  const speeds = [];
  for (let v = Math.max(3, band.min - 4); v <= band.max + 4; v += Math.max(0.5, (band.max - band.min + 8) / 14)) speeds.push(v);
  for (const speed of speeds) {
    for (let wait = 0; wait < def.ramp.period; wait += def.ramp.period / 5) {
      for (const flips of [0, 1, 2, 3]) {
        const run = simulate(def, { speed, wait, flips, dir: flips % 2 ? 1 : -1, lead: true, coast: COAST });
        total++;
        const r = run.result || { success: false, reason: 'timeout ' + run.phase };
        if (r.success) {
          ok++;
          if (!best || r.stars > best.r.stars || (r.stars === best.r.stars && r.score > best.r.score)) best = { r, speed, wait, flips };
        } else {
          const k = (r.reason || '').replace(/\(.*\)/, '').replace(/\d+/g, 'N').split('—')[0].trim();
          reasons[k] = (reasons[k] || 0) + 1;
        }
      }
    }
  }
  const b = best ? best.r : null;
  console.log(`L${def.id} ${def.name.padEnd(16)} band ${band.min.toFixed(1)}-${band.max.toFixed(1)} m/s (${(band.min*3.6).toFixed(0)}-${(band.max*3.6).toFixed(0)} km/h)  success ${ok}/${total}`);
  if (b) console.log(`    best: v=${best.speed.toFixed(1)} wait=${best.wait.toFixed(1)} flips=${best.flips} → stars ${b.stars} score ${b.score} impact ${b.impact.toFixed(2)} pad ${b.padDist.toFixed(1)} fuel ${b.fuel} air ${b.airtime.toFixed(1)} B${b.backflips}/F${b.frontflips} stars ${b.starsCollected}/${b.starsTotal} obj ${b.objectives.map(o=>o?'✓':'✗').join('')}`);
  console.log('    fails:', JSON.stringify(reasons));
  if (!ok) allOk = false;
}
if (!allOk) { console.log('SOME LEVELS UNSOLVED'); process.exitCode = 1; }
}
