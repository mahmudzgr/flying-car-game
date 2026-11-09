// Motor sesi: araç başına karakterli, sürekli sentez. Devir → perde, gaz/yük → parlaklık+ses, havada → serbest devir,
// iniş → yük altında çökme. Geri vites bip'i (Koca). Parametreler JS tarafında yumuşatılır, ~40 Hz'de ses grafiğine yazılır.
import { harmWave, satCurve, clamp, lerp, fin } from './util.js';

const odd = (n, p = 1) => Array.from({ length: n }, (_, i) => ((i + 1) % 2 ? 1 / Math.pow(i + 1, p) : 0));
const saw = (n, p = 1) => Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, p));

// lo/hi: temel frekans (Hz). amps: ana dalga harmonikleri (zayıf temel: telefon hoparlöründe 2.-6. harmonik taşır).
// pulse: {k: nabız hızı = f*k, d0: rölanti derinliği, fall: devirle sönme}. lp: [taban, devir, yük]. gain: [taban, gaz, yük].
const VEH = {
  tosun: { lo: 60, hi: 180, curve: 1.15, amps: [1, 0.62, 0.55, 0.36, 0.3, 0.2, 0.15, 0.12, 0.1, 0.07], w2: odd(9), r2: 0.5, g2: 0.5, drive: 1.6,
    pulse: { k: 0.2, d0: 0.5, fall: 1.3 }, lp: [700, 1700, 1500], gain: [0.16, 0.12, 0.1], noise: [0.01, 0.07, 1400, 1800], shiftBlip: false },
  zipir: { lo: 120, hi: 420, curve: 0.95, amps: [0.55, 1, 0.85, 0.72, 0.6, 0.5, 0.42, 0.36, 0.3, 0.26, 0.2, 0.16], w2: odd(10, 0.8), r2: 2.01, g2: 0.35, drive: 2.1,
    pulse: { k: 0.5, d0: 0.3, fall: 1.6 }, lp: [1600, 3600, 2200], gain: [0.11, 0.1, 0.07], noise: [0.015, 0.1, 2600, 2600], shiftBlip: true },
  pasa: { lo: 35, hi: 90, curve: 1.0, amps: [0.7, 1, 0.9, 0.6, 0.5, 0.36, 0.26, 0.2, 0.12, 0.08], w2: saw(5, 1.3), r2: 0.5, g2: 0.4, drive: 2.4,
    pulse: { k: 0.18, d0: 0.9, fall: 0.9 }, lp: [500, 1100, 900], gain: [0.2, 0.1, 0.1], noise: [0.012, 0.05, 700, 700], shiftBlip: false },
  koca: { lo: 40, hi: 110, curve: 1.05, amps: [0.8, 1, 0.72, 0.56, 0.4, 0.3, 0.2, 0.15, 0.1], w2: saw(4, 1.6), r2: 0.5, g2: 0.55, drive: 1.9,
    pulse: { k: 0.15, d0: 0.4, fall: 1.5 }, lp: [420, 1250, 1100], gain: [0.2, 0.1, 0.11], noise: [0.02, 0.08, 900, 1400], whistle: true, beep: true, shiftBlip: true },
};
VEH.default = VEH.tosun;

export function createEngine(env, onShift) {
  const { ctx } = env;
  let nodes = null, cfg = null, vehId = null;
  const s = { rpm: 0.12, thr: 0, load: 0, air: 0, dip: 0, lastRpm: 0.12, lastWrite: -1, shiftT: 0, beepNext: 0, level: 0 };
  const pulseWave = (() => { const n = 24, re = new Float32Array(n + 1); for (let h = 1; h <= n; h++) re[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * 0.25); return ctx.createPeriodicWave(re, new Float32Array(n + 1)); })();
  const curve = satCurve(2);
  const waves = {};
  const wave = (key, amps) => (waves[key] ??= harmWave(ctx, amps));

  function build(id) {
    stop(true);
    cfg = VEH[id] || VEH.default; vehId = id;
    const mk = (type, f = 0) => { const o = ctx.createOscillator(); if (type) o.type = type; if (f) o.frequency.value = f; return o; };
    const gn = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const bq = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const out = gn(0), amp = gn(1), lfoG = gn(0), lp = bq('lowpass', 800, 0.9), shaper = ctx.createWaveShaper(), pre = gn(1);
    shaper.curve = curve; shaper.oversample = 'none';
    const o1 = mk(), o2 = mk(); o1.setPeriodicWave(wave(id + 'a', cfg.amps)); o2.setPeriodicWave(wave(id + 'b', cfg.w2));
    const m1 = gn(1), m2 = gn(cfg.g2);
    const lfo = mk(); lfo.setPeriodicWave(pulseWave);
    const ns = ctx.createBufferSource(); ns.buffer = env.bufs.pink; ns.loop = true;
    const nbp = bq('bandpass', cfg.noise[2], 0.8), ng = gn(0);
    o1.connect(m1); o2.connect(m2); m1.connect(pre); m2.connect(pre); ns.connect(nbp); nbp.connect(ng); ng.connect(pre);
    pre.connect(lp); lp.connect(shaper); shaper.connect(amp); lfo.connect(lfoG); lfoG.connect(amp.gain); amp.connect(out); out.connect(env.out.eng);
    let wh = null, whg = null;
    if (cfg.whistle) { wh = mk('sine', 600); whg = gn(0); wh.connect(whg); whg.connect(out); wh.start(); }
    const t = ctx.currentTime; o1.start(t); o2.start(t); lfo.start(t); ns.start(t, Math.random());
    nodes = { out, amp, lfoG, lp, o1, o2, lfo, ns, nbp, ng, m2, wh, whg, pre, all: [o1, o2, lfo, ns, wh].filter(Boolean) };
    s.level = 0;
  }

  function stop(now) {
    if (!nodes) return;
    const n = nodes; nodes = null;
    const t = ctx.currentTime;
    try { n.out.gain.cancelScheduledValues(t); n.out.gain.setTargetAtTime(0, t, now ? 0.01 : 0.08); } catch { /* */ }
    setTimeout(() => { for (const o of n.all) { try { o.stop(); } catch { /* */ } } try { n.out.disconnect(); } catch { /* */ } }, now ? 60 : 400);
  }

  const set = (p, v, tc = 0.03) => p.setTargetAtTime(fin(v), ctx.currentTime, tc);

  /** p: {vehicleId,rpm01,throttle,load,onGround} (+ isteğe bağlı reversing, speed). dt gerçek zaman (sn). */
  function update(p, dt, pitchMul, paused) {
    const id = VEH[p.vehicleId] ? p.vehicleId : 'default';
    if (!nodes || vehId !== id) build(id);
    const c = cfg, n = nodes;
    const air = p.onGround === false ? 1 : 0;
    const kUp = 1 - Math.exp(-dt * 14), kDn = 1 - Math.exp(-dt * 9);
    const rpmT = clamp(fin(p.rpm01, 0.12)), r0 = s.rpm;
    s.rpm += (rpmT - s.rpm) * (rpmT > s.rpm ? kUp : kDn);
    s.thr += (clamp(fin(p.throttle)) - s.thr) * (1 - Math.exp(-dt * 12));
    s.load += (clamp(fin(p.load)) - s.load) * (1 - Math.exp(-dt * 10));
    s.air += (air - s.air) * (1 - Math.exp(-dt * 8));
    s.dip *= Math.exp(-dt * 3.2);
    // vites geçişi: gazdayken ani devir düşüşü
    if (c.shiftBlip && s.thr > 0.3 && r0 - rpmT > 0.08 && s.shiftT < env.now()) { s.shiftT = env.now() + 0.4; n.amp.gain.cancelScheduledValues(ctx.currentTime); onShift?.(); s.dip = Math.max(s.dip, 0.04); }
    s.lastRpm = rpmT;

    const r = s.rpm, rp = Math.pow(r, c.curve);
    const f = (c.lo + (c.hi - c.lo) * rp) * pitchMul * (1 - s.dip) * (1 - 0.015 * s.air * (1 - s.thr));
    set(n.o1.frequency, f, 0.025); set(n.o2.frequency, f * c.r2 * (c.r2 > 1 ? 1.004 : 1), 0.025);
    // nabız (puf-puf): rölantide derin, devirle sönen; havada gazsızken zayıf
    const d = clamp(c.pulse.d0 * (1 - clamp(r * c.pulse.fall)) + 0.05 + s.load * 0.1 - s.air * 0.1, 0, 0.95);
    set(n.lfo.frequency, Math.max(2, f * c.pulse.k), 0.05);
    set(n.lfoG.gain, d / 1.5, 0.05); set(n.amp.gain, 1 - d / 1.5, 0.05);
    // yük ↔ parlaklık
    const cut = (c.lp[0] + c.lp[1] * r + c.lp[2] * (0.35 * s.load + 0.65 * s.thr)) * (1 - s.air * 0.12) * (0.55 + 0.45 * Math.min(1, pitchMul * 1.3));
    set(n.lp.frequency, cut, 0.04);
    const g = c.gain[0] + c.gain[1] * s.thr + c.gain[2] * s.load * (1 - s.air * 0.6);
    const target = paused ? 0 : 0.4 * g * (0.65 + 0.5 * r);
    set(n.out.gain, target, 0.05);
    set(n.ng.gain, c.noise[0] + c.noise[1] * s.thr * (0.3 + r), 0.05); set(n.nbp.frequency, c.noise[2] + c.noise[3] * r, 0.05);
    set(n.m2.gain, c.g2 * (0.7 + 0.5 * s.thr), 0.05);
    if (n.wh) { set(n.wh.frequency, (500 + 1500 * r) * pitchMul, 0.05); set(n.whg.gain, 0.003 + 0.02 * s.thr * r, 0.06); }
    // geri vites bip'i
    if (c.beep && p.reversing) {
      const now = ctx.currentTime;
      if (s.beepNext < now) s.beepNext = now + 0.02;
      while (s.beepNext < now + 0.35) { beep(s.beepNext); s.beepNext += 0.62; }
    } else s.beepNext = 0;
    s.active = true;
  }

  function beep(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1000;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.008); g.gain.setValueAtTime(0.07, t + 0.27); g.gain.linearRampToValueAtTime(0.0001, t + 0.285);
    o.connect(f); f.connect(g); g.connect(env.out.sfx); o.start(t); o.stop(t + 0.3); o.onended = () => g.disconnect();
  }

  return {
    update, stop: () => stop(false), get running() { return !!nodes; },
    /** iniş/çarpma: motor yük altında çöker. */
    dip(a) { s.dip = Math.max(s.dip, clamp(a) * 0.12); },
    /** ateşleme: rölantiden hafif kabarma */
    kick() { s.rpm = Math.max(s.rpm, 0.45); },
    state: s,
  };
}
