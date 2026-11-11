// Fizik ölçüm laboratuvarı (başsız): ivme, fren, gövde eğimi, havada takla, kargo kayması, kafa vuruşu.
// Kullanım: node tools/olcum.mjs [accel|brake|tilt|air|cargo|head|all] [--vehicle id]
import { fileURLToPath } from 'node:url';
import * as pl from '../vendor/planck.mjs';
import { createSim } from '../src/sim/sim.js';
import { VEHICLE_ORDER } from '../src/config.js';

const V = pl.Vec2;
export const level = (pieces, { cargo = [], surface = 'asphalt' } = {}) => ({
  id: 'ol', name: 'ol', biome: 'elma', terrain: { surface, pieces }, spawn: { x: 3 }, finish: { x: 'end' }, cargo, minDelivered: 0, objects: [],
  hints: [], stars: { 2: [], 3: [] }, reward: { base: 0 },
});
export const mk = (id, pieces, o = {}) => createSim({ level: level(pieces, o), vehicleId: id, upgrades: o.up ?? {}, settings: { assistLanding: o.assist ?? true } });
const allBodies = (d) => [d.veh.chassis, ...d.veh.wheels.map((w) => w.body), d.veh.driver.torso, d.veh.driver.head, ...(d.veh.trailer ? [d.veh.trailer.body] : []), ...d.cargo.map((c) => c.body)];
export function setSpeed(sim, v) {
  const d = sim._debug;
  for (const b of allBodies(d)) b.setLinearVelocity(V(v, 0));
  for (const w of d.veh.wheels) w.body.setAngularVelocity(-v / w.r);
  for (let i = 0; i < 3; i++) sim.step({});
}
const kmh = (v) => v * 3.6;

export function accel(id, surface = 'asphalt') {
  const sim = mk(id, [{ type: 'flat', len: 1500 }], { surface }), ch = sim._debug.veh.chassis;
  let t25 = null, t50 = null, vmax = 0;
  for (let i = 0; i < 120 * 40 && sim.status === 'running'; i++) {
    sim.step({ throttle: 1 });
    const v = ch.getLinearVelocity().x, t = (i + 1) / 120;
    if (t25 === null && v >= 25 / 3.6) t25 = t;
    if (t50 === null && v >= 50 / 3.6) t50 = t;
    vmax = Math.max(vmax, v);
  }
  return { t25, t50, vmax: kmh(vmax) };
}
export function brake(id, surface, v0 = 50 / 3.6, cargo = []) {
  const sim = mk(id, [{ type: 'flat', len: 400 }], { surface, cargo }), ch = sim._debug.veh.chassis;
  setSpeed(sim, v0);
  const x0 = ch.getPosition().x; let minA = 0, bottom = 0;
  for (let i = 0; i < 120 * 40; i++) {
    sim.step({ brake: 1 });
    minA = Math.min(minA, ch.getAngle());
    for (const w of sim._debug.veh.wheels) if (w.bottomOut) bottom++;
    if (ch.getLinearVelocity().x < 0.15) break;
  }
  return { dist: ch.getPosition().x - x0, pitchDeg: minA * 57.3, bottom };
}
export function tilt(id) {
  const sim = mk(id, [{ type: 'flat', len: 1500 }]), ch = sim._debug.veh.chassis; let up = 0, bottom = 0, a0 = ch.getAngle();
  for (let i = 0; i < 120 * 3; i++) { sim.step({ throttle: 1 }); up = Math.max(up, ch.getAngle() - a0); for (const w of sim._debug.veh.wheels) if (w.bottomOut) bottom++; }
  return { gasDeg: up * 57.3, gasBottom: bottom };
}
export function airFlip(id) {
  const sim = mk(id, [{ type: 'flat', len: 300 }], { assist: false }), d = sim._debug, ch = d.veh.chassis;
  for (const b of allBodies(d)) { const p = b.getPosition(); b.setTransform(V(p.x, p.y + 300), b.getAngle()); b.setLinearVelocity(V(0, 0)); }
  let a0 = ch.getAngle(), t1 = null;
  for (let i = 0; i < 120 * 6; i++) { sim.step({ throttle: 1 }); if (t1 === null && Math.abs(ch.getAngle() - a0) >= 2 * Math.PI) t1 = (i + 1) / 120; }
  return { flipT: t1 };
}
/** Sürekli gaz sonra sert fren: kargo kayması (m) ve ön duvar çarpması. */
export function cargoSlide(id, v0, cargo, steps = 480) {
  const sim = mk(id, [{ type: 'flat', len: 600 }], { cargo }), d = sim._debug;
  const ev = [], first = {};
  sim.on('cargoHit', (e) => ev.push(e.data ?? e)); sim.on('cargoLost', (e) => (first.lost = e.data ?? e));
  setSpeed(sim, v0);
  const bay = d.veh.bayBody, x0 = d.cargo.map((c) => bay.getLocalPoint(c.body.getPosition()).x);
  let maxSlide = 0;
  for (let i = 0; i < steps; i++) { sim.step({ brake: 1 }); d.cargo.forEach((c, k) => { maxSlide = Math.max(maxSlide, bay.getLocalPoint(c.body.getPosition()).x - x0[k]); }); }
  return { maxSlide, wallHits: ev.filter((e) => e.wall).map((e) => `${e.type}:${e.speed.toFixed(1)}${e.damage ? '!' : ''}`), lost: d.cargo.filter((c) => c.state === 'lost').length };
}
export function gasHold(id, cargo, secs = 4) {
  const sim = mk(id, [{ type: 'flat', len: 900 }], { cargo }), d = sim._debug; let lost = 0;
  sim.on('cargoLost', () => lost++);
  const bay = d.veh.bayBody, x0 = d.cargo.map((c) => bay.getLocalPoint(c.body.getPosition()).x); let back = 0;
  for (let i = 0; i < 120 * secs; i++) { sim.step({ throttle: 1 }); d.cargo.forEach((c, k) => { back = Math.max(back, x0[k] - bay.getLocalPoint(c.body.getPosition()).x); }); }
  return { lost, back };
}
export const MIXED = [{ type: 'crate', count: 2 }, { type: 'milk', count: 1 }, { type: 'eggs', count: 1 }, { type: 'watermelon', count: 2 }];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const what = process.argv[2] ?? 'all', only = process.argv.includes('--vehicle') ? process.argv[process.argv.indexOf('--vehicle') + 1] : null;
  const ids = only ? [only] : VEHICLE_ORDER, f = (x, n = 1) => (x == null ? '-' : x.toFixed(n));
  for (const id of ids) {
    const out = [id];
    if (what === 'accel' || what === 'all') { const a = accel(id); out.push(`0→25 ${f(a.t25, 2)}s 0→50 ${f(a.t50, 2)}s vmax ${f(a.vmax, 0)}km/s`); }
    if (what === 'brake' || what === 'all') {
      const v0 = id === 'pasa' ? 36 / 3.6 : 50 / 3.6;
      out.push('fren(' + (v0 * 3.6).toFixed(0) + '): ' + ['asphalt', 'dirt', 'grass', 'gravel', 'wet', 'snow', 'ice'].map((s) => `${s} ${f(brake(id, s, v0).dist)}`).join(' '));
      const b = brake(id, 'asphalt', v0); out.push(`fren eğim ${f(b.pitchDeg)}° dipVurma ${b.bottom}`);
    }
    if (what === 'tilt' || what === 'all') { const t = tilt(id); out.push(`gaz eğim +${f(t.gasDeg)}° dipVurma ${t.gasBottom}`); }
    if (what === 'air' || what === 'all') out.push(`takla ${f(airFlip(id).flipT, 2)}s`);
    if (what === 'cargo' || what === 'all') {
      const g = gasHold(id, MIXED), s = cargoSlide(id, 50 / 3.6, MIXED);
      out.push(`kargo: gaz4sn kayıp ${g.lost} geri ${f(g.back, 2)}m | fren50 kayma ${f(s.maxSlide, 2)}m duvar [${s.wallHits.join(' ')}] kayıp ${s.lost}`);
    }
    console.log(out.join(' | '));
  }
}
