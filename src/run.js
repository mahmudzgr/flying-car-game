// Game rules for a single attempt: phases, flip counting, landing evaluation, scoring.
// Pure JS – shared by the browser game and the Node test bot.
import { Car, TAU } from './physics.js';
import { buildLevel, checkObjective } from './levels.js';

export const DT = 1 / 240;
export const CRASH_IMPACT = 7.0; // m/s – wheel touchdown speed that destroys the suspension
const FLIP_TOL = 0.42; // rad of leniency per flip (~24°)

export function landingRating(v) {
  if (v <= 1.5) return { key: 'perfect', text: 'KUSURSUZ İNİŞ', pts: 2000 };
  if (v <= 3) return { key: 'soft', text: 'YUMUŞAK İNİŞ', pts: 1200 };
  if (v <= 5) return { key: 'good', text: 'İYİ İNİŞ', pts: 600 };
  return { key: 'hard', text: 'SERT İNİŞ', pts: 150 };
}

export class Run {
  constructor(def, opts = {}) {
    this.def = def;
    this.L = buildLevel(def);
    this.world = this.L.world;
    this.car = new Car(this.world, this.L.start.x, this.L.start.y);
    this.car.fuel = def.fuel ?? 100;
    this.time = 0;
    this.phase = 'drive';
    this.events = [];
    this.collectibles = this.L.collectibles.map((c) => ({ ...c }));
    this.starsTotal = this.collectibles.filter((c) => c.type === 'star').length;
    this.starsCollected = 0;
    this.airborneFor = 0;
    this.groundedFor = 0;
    this.airtime = 0;
    this.jumpAirtime = 0;
    this.maxAirtime = 0;
    this.flipAccum = 0;
    this.pendingBack = 0;
    this.pendingFront = 0;
    this.backflips = 0;
    this.frontflips = 0;
    this.maxCombo = 0;
    this.usedMainThrust = false;
    this.touch = null;
    this.landedT = 0;
    this.launchSpeed = 0;
    this.launchKick = 0;
    this.maxHeight = 0;
    this.result = null;
    this.record = [];
    this.recordAcc = 0;
    this.input = { gas: false, brake: false, thrust: false, rotL: false, rotR: false };
    this.rampTouched = false;
    this.opts = opts;
  }

  emit(type, data = {}) {
    this.events.push({ type, t: this.time, ...data });
  }

  get done() {
    return this.phase === 'complete' || this.phase === 'crashed' || this.phase === 'missed';
  }

  // advance by real dt (seconds); runs fixed sub-steps
  advance(dt) {
    this._acc = (this._acc || 0) + dt;
    let n = 0;
    while (this._acc >= DT && n < 40) {
      this._acc -= DT;
      this.step();
      n++;
    }
  }

  step() {
    const car = this.car;
    const W = this.world;
    this.time += DT;
    W.update(this.time);

    // Inputs (controls lock after landing / crash)
    const inp = car.input;
    if (this.phase === 'landed') {
      inp.gas = false; inp.thrust = false; inp.rotL = false; inp.rotR = false; inp.brake = true;
      car.noReverse = true;
    } else if (this.done) {
      inp.gas = inp.brake = inp.thrust = inp.rotL = inp.rotR = false;
    } else {
      Object.assign(inp, this.input);
    }

    const prevCrashed = car.crashed;
    // Scraping the bumper on the ramp kink while driving is a jolt, not a wreck.
    car.bodyImpactFatal = this.phase !== 'drive' || car.x > this.L.lipX + 1;
    car.step(DT);
    if (car.active.thrust) this.usedMainThrust = true;

    // Fell off the world
    if (!car.crashed && car.y < this.L.killY) car.crash('Boşluğa düştün!');

    // Collectibles
    for (const c of this.collectibles) {
      if (c.taken) continue;
      const dx = c.x - car.x, dy = c.y - car.y;
      if (dx * dx + dy * dy < 2.6 * 2.6) {
        c.taken = true;
        if (c.type === 'star') this.starsCollected++;
        else car.fuel = Math.min(100, car.fuel + 25);
        this.emit('collect', { kind: c.type, x: c.x, y: c.y });
      }
    }

    // Contact bookkeeping
    const touching = car.grounded;
    if (touching) {
      this.groundedFor += DT;
      this.airborneFor = 0;
    } else {
      this.airborneFor += DT;
      this.groundedFor = 0;
    }
    for (const w of car.wheels) if (w.contact && w.tag === 'ramp') this.rampTouched = true;

    if (car.crashed && !prevCrashed && !this.done) {
      this.phase = 'crashed';
      this.emit('crash', { reason: car.crashReason, x: car.x, y: car.y });
      this.finish(false, car.crashReason);
    }

    switch (this.phase) {
      case 'drive': {
        if (!touching && this.airborneFor > 0.25 && car.x > this.L.rampX + 2 && this.rampTouched) {
          this.phase = 'air';
          this.jumpAirtime = this.airborneFor;
          this.flipAccum = 0;
          this.pendingBack = this.pendingFront = 0;
          this.launchSpeed = car.speed;
          this.launchKick = this.L.ramp.state.w;
          this.emit('launch', { speed: car.speed, kick: this.L.ramp.state.w });
        }
        break;
      }
      case 'air': {
        this.airtime += DT;
        this.jumpAirtime += DT;
        this.maxAirtime = Math.max(this.maxAirtime, this.jumpAirtime);
        this.maxHeight = Math.max(this.maxHeight, car.y - this.L.groundY);
        this.trackFlips(DT);
        if (touching) {
          this.phase = 'touchdown';
          this.touch = {
            t: this.time,
            impact: car.maxImpact,
            x: car.x,
            vx: car.vx,
            vy: car.vy,
            padDist: this.padDistance(),
            onPad: car.wheels.some((w) => w.contact && w.tag === 'pad'),
          };
          this.emit('touch', { impact: car.maxImpact });
        }
        break;
      }
      case 'touchdown': {
        const tc = this.touch;
        const since = this.time - tc.t;
        if (since < 0.3) {
          tc.impact = Math.max(tc.impact, car.maxImpact);
          if (car.wheels.some((w) => w.contact && w.tag === 'pad')) {
            if (!tc.onPad) tc.padDist = this.padDistance();
            tc.onPad = true;
          }
        }
        if (tc.impact > CRASH_IMPACT && !car.crashed) {
          car.crash(`Çok sert iniş! (${tc.impact.toFixed(1)} m/s)`);
          this.phase = 'crashed';
          this.emit('crash', { reason: car.crashReason, x: car.x, y: car.y });
          this.finish(false, car.crashReason);
          break;
        }
        if (!touching && this.airborneFor > 0.2) {
          // bounced: keep flying, the jump continues
          this.phase = 'air';
          this.jumpAirtime += this.airborneFor;
          break;
        }
        // settled on both wheels (or came to rest in an odd pose after a long time)
        const settled = (car.wheelsDown === 2 && this.groundedFor > 0.6) || (since > 6 && car.speed < 1.5 && touching);
        if (settled) {
          const tags = new Set(car.wheels.map((w) => w.tag));
          if (tags.has('pad') || tc.onPad) {
            this.phase = 'landed';
            this.landedT = this.time;
            this.backflips += this.pendingBack;
            this.frontflips += this.pendingFront;
            this.maxCombo = Math.max(this.maxCombo, this.pendingBack + this.pendingFront);
            this.emit('landed', { impact: tc.impact, rating: landingRating(tc.impact), flips: this.pendingBack + this.pendingFront, padDist: tc.padDist });
          } else {
            const kinds = car.wheels.map((w) => w.body && w.body.data.kind);
            if (tags.has('ramp') || kinds.includes('runway')) {
              // fell short back onto the runway / ramp – just try again
              this.phase = 'drive';
              this.rampTouched = tags.has('ramp');
              this.emit('retry');
            } else {
              this.phase = 'missed';
              this.emit('missed');
              const pad = this.L.pad;
              const shift = pad.body.state.ox - pad.body.origin.x; // moving platforms
              const px0 = pad.x0 + shift, px1 = pad.x1 + shift;
              const tx = this.touch.x;
              const why = tx > px1 ? `Platformu ${Math.round(tx - px1)} m aştın — daha yavaş gir veya havada fren yap.`
                : tx < px0 ? `Platforma ${Math.round(px0 - tx)} m kısa kaldın — daha hızlı gir.`
                : 'Hedefi ıskaladın!';
              this.finish(false, why);
            }
          }
        }
        break;
      }
      case 'landed': {
        const padV = this.L.pad.body.state;
        const rel = Math.hypot(car.vx - padV.vx, car.vy - padV.vy);
        if ((rel < 0.6 && this.time - this.landedT > 0.8) || this.time - this.landedT > (this.def.pad.settle || 7)) {
          this.phase = 'complete';
          this.finish(true);
        }
        break;
      }
      default:
        break;
    }

    // ghost recording (30 Hz)
    this.recordAcc += DT;
    if (this.recordAcc >= 1 / 30 && this.record.length < 30 * 90) {
      this.recordAcc -= 1 / 30;
      this.record.push(Math.round(car.x * 100) / 100, Math.round(car.y * 100) / 100, Math.round(car.a * 1000) / 1000);
    }
  }

  trackFlips(dt) {
    this.flipAccum += this.car.w * dt;
    const need = TAU - FLIP_TOL;
    if (this.flipAccum >= need) {
      this.flipAccum -= TAU;
      this.pendingBack++;
      this.emit('flip', { dir: 'back', combo: this.pendingBack + this.pendingFront });
    } else if (this.flipAccum <= -need) {
      this.flipAccum += TAU;
      this.pendingFront++;
      this.emit('flip', { dir: 'front', combo: this.pendingBack + this.pendingFront });
    }
  }

  padDistance() {
    const st = this.L.pad.body.state;
    // car position in pad-local coordinates (handles moving / rolling barge)
    const dx = this.car.x - st.ox, dy = this.car.y - st.oy;
    const c = Math.cos(-st.angle), s = Math.sin(-st.angle);
    return Math.abs(c * dx - s * dy);
  }

  finish(success, reason = '') {
    if (this.result) return;
    const car = this.car;
    const tc = this.touch || { impact: 99, padDist: 99 };
    const r = {
      success,
      reason,
      backflips: this.backflips,
      frontflips: this.frontflips,
      maxCombo: this.maxCombo,
      airtime: this.maxAirtime,
      impact: tc.impact,
      padDist: tc.padDist,
      fuel: Math.round(car.fuel),
      starsCollected: this.starsCollected,
      starsTotal: this.starsTotal,
      usedMainThrust: this.usedMainThrust,
      launchSpeed: this.launchSpeed,
      launchKick: this.launchKick,
      time: this.time,
      breakdown: [],
      score: 0,
    };
    if (success) {
      const n = r.backflips + r.frontflips;
      const add = (label, pts) => {
        if (pts > 0) r.breakdown.push({ label, pts: Math.round(pts) });
      };
      if (n > 0) add(`Takla ×${n}${n > 1 ? ` (kombo ×${(1 + 0.5 * (n - 1)).toFixed(1)})` : ''}`, 600 * n * (1 + 0.5 * (n - 1)));
      add(`Havada kalma ${r.airtime.toFixed(1)} sn`, r.airtime * 150);
      const rating = landingRating(r.impact);
      add(`${rating.text} (${r.impact.toFixed(1)} m/s)`, rating.pts);
      const half = this.L.pad.len / 2;
      add(`İsabet (${r.padDist.toFixed(1)} m)`, Math.max(0, 1 - r.padDist / half) * 1500 + (r.padDist < 1 ? 500 : 0));
      add(`Kalan yakıt %${r.fuel}`, r.fuel * 12);
      add(`Yıldız ${r.starsCollected}/${r.starsTotal}`, r.starsCollected * 300);
      r.score = r.breakdown.reduce((a, b) => a + b.pts, 0);
    }
    r.objectives = this.def.objectives.map((o) => checkObjective(o, r));
    r.stars = r.objectives.filter(Boolean).length;
    this.result = r;
    this.emit('finish', { result: r });
  }
}
