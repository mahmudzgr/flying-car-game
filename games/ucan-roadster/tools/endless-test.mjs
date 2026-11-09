// Plays generated endless-mode levels with the autopilot to check they are solvable.
import { makeEndlessLevel } from '../src/levels.js';
import { Run } from '../src/run.js';
import { simulate } from './bot.mjs';

const seeds = Number(process.argv[2] || 3);
const rounds = Number(process.argv[3] || 12);
let solved = 0, total = 0;
for (let seed = 1; seed <= seeds; seed++) {
  let prev = null;
  const line = [];
  for (let round = 1; round <= rounds; round++) {
    const def = makeEndlessLevel(round, seed, prev);
    prev = def.theme;
    const band = new Run(def).L.speedBand;
    let ok = 0, n = 0;
    for (let v = band.min - 1; v <= band.max + 1.5; v += Math.max(0.75, (band.max - band.min + 2.5) / 6)) {
      for (let wait = 0; wait < def.ramp.period; wait += def.ramp.period / 5) {
        const run = simulate(def, { speed: v, wait, flips: 0, dir: -1, lead: true, coast: true }, 70);
        n++;
        if (run.result && run.result.success) ok++;
      }
    }
    total++;
    if (ok > 0) solved++;
    line.push(`${round}:${def.theme}${ok ? '✓' : '✗'}${ok}/${n}`);
  }
  console.log(`seed ${seed}: ${line.join(' ')}`);
}
console.log(`solvable: ${solved}/${total}`);
