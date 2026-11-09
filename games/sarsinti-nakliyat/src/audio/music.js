// Prosedürel müzik: 4 biyom + menü. Seçilmiş makam benzeri diziler (sent cinsinden), bağlama/saz tınısı, darbuka ritmi.
// Tohumlu (seeded) üretim → döngü her seferinde aynı; 32 ölçülük uzun döngü. Çok sesli akorlar yerine boş beşli/kök → makamla çatışmaz.
import { mulberry32, cents, clamp, IS_LOW } from './util.js';

const RAST = [0, 204, 355, 498, 702, 906, 1051];       // Rast (nötr üçlü ve yedili)
const MAJOR = [0, 200, 400, 500, 700, 900, 1100];
const HICAZ = [0, 100, 400, 500, 700, 800, 1000];      // Hicaz (spagetti-western rengi)
const USSAK = [0, 150, 300, 500, 700, 800, 1000];      // Uşşak benzeri (gizemli, hafif blues)
const LYDIAN = [0, 200, 400, 600, 700, 900, 1100];

const TRACKS = {
  menu: { bpm: 96, root: 220, scale: MAJOR, seed: 11, swing: 0.06, inst: 'uke', bassInst: 'bass', pad: 0.045,
    prog: [0, 0, 5, 3, 0, 0, 4, 4, 0, 0, 5, 3, 3, 4, 0, 0], bass: '1...5...1...5...',
    mel: { rhythms: ['4...2.2.4...2.2.', '2.2.4...2.2.4...', '3..1.2.4...2.2.'], start: 9, lo: 7, hi: 14, density: 0.9 },
    perc: 'D...t...D.t.t...', percG: 0.5, rev: 0.28 },
  elma: { bpm: 108, root: 196, scale: RAST, seed: 23, swing: 0.1, inst: 'saz', bassInst: 'bass',
    prog: [0, 0, 3, 4, 0, 0, 4, 0, 0, 0, 3, 4, 3, 4, 0, 0], bass: '1.5.1.5.1.5.1.51',
    mel: { rhythms: ['4...2.2.4...2.2.', '2.2.4...2.2.2.2.', '2.1.1.4...2.2.4.', '3..1.2.2.4...2.'], start: 9, lo: 7, hi: 15, density: 0.92 },
    perc: 'D.t.T.t.D.tkT.t.', percG: 0.8, rev: 0.22 },
  kanyon: { bpm: 100, root: 164.8, scale: HICAZ, seed: 37, swing: 0, inst: 'twang', bassInst: 'bass', trem: true,
    prog: [0, 0, 1, 0, 0, 0, 3, 4, 0, 0, 1, 0, 3, 4, 1, 0], bass: '1.11.1..1.11.1..',
    mel: { rhythms: ['8.......4...2.2.', '6.....2.4...4...', '2.2.4...8.......', '4...4...2.2.4...'], start: 9, lo: 7, hi: 14, density: 0.85, breath: true },
    perc: 'D..tD.t.D..tD.t.', percG: 0.75, rev: 0.32, pad: 0.03 },
  bataklik: { bpm: 88, root: 110, scale: USSAK, seed: 53, swing: 0.16, inst: 'marimba', bassInst: 'sub', pad: 0.06, drips: 0.55, frogs: true,
    prog: [0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 1, 1, 3, 3, 0, 0], bass: '1.......1.5.....',
    mel: { rhythms: ['6.....2.4...4...', '8.......2.2.4...', '4...6.....2.....'], start: 9, lo: 7, hi: 13, density: 0.6, breath: true },
    perc: 'D.....t.....T...', hat: 'h.h.h.h.h.h.h.h.', percG: 0.6, rev: 0.4 },
  zirve: { bpm: 116, root: 261.6, scale: LYDIAN, seed: 71, swing: 0.04, inst: 'celesta', bassInst: 'bass', pad: 0.04, arp: true, chime: true, shaker: true,
    prog: [0, 0, 4, 4, 3, 3, 4, 0, 0, 0, 5, 5, 3, 4, 0, 0], bass: '1.1.5.1.1.1.5.1.',
    mel: { rhythms: ['2.2.2.2.4...4...', '2.2.4...2.2.4...', '1.1.2.2.4...2.2.', '4...2.2.2.2.4...'], start: 9, lo: 8, hi: 16, density: 0.9 },
    perc: 'D.t.T.tkD.t.T.tk', percG: 0.7, rev: 0.4 },
};
const ALIAS = { 'bataklık': 'bataklik', swamp: 'bataklik', apple: 'elma', canyon: 'kanyon', summit: 'zirve' };
const BARS = 32, STEPS = 16;

function compose(cfg) {
  const sc = cfg.scale, nS = sc.length;
  const dc = (d) => sc[((d % nS) + nS) % nS] + 1200 * Math.floor(d / nS);
  const ev = Array.from({ length: BARS * STEPS }, () => []);
  const add = (bar, step, e) => ev[bar * STEPS + step].push(e);
  for (let b = 0; b < BARS; b++) {
    const rootD = cfg.prog[b % cfg.prog.length], rc = dc(rootD) - 1200;
    // bas
    for (let s = 0; s < 16; s++) { const ch = cfg.bass[s]; if (ch === '1') add(b, s, { v: 'bass', c: rc, d: 2 }); else if (ch === '5') add(b, s, { v: 'bass', c: rc + 700, d: 2 }); else if (ch === '8') add(b, s, { v: 'bass', c: rc + 1200, d: 2 }); }
    if (cfg.pad && (b % 2 === 0)) for (const o of [0, 700, 1200]) add(b, 0, { v: 'pad', c: rc + o + 1200, d: 32, vel: cfg.pad });
    if (cfg.chime && b % 4 === 0) add(b, 0, { v: 'chime', c: dc(rootD) + 2400, d: 16 });
    if (cfg.arp) { const pat = [0, 2, 4, 2, 4, 6, 4, 2]; for (let s = 0; s < 16; s += 2) add(b, s, { v: 'arp', c: dc(rootD + pat[(s / 2) % pat.length]) + 1200, d: 2, vel: 0.35 + (s % 8 === 0 ? 0.15 : 0) }); }
  }
  // melodi: A A' B A / C A' B' A''
  const seedOf = ['A', 'A', 'B', 'A', 'C', 'A', 'B', 'A'], variant = [0, 1, 0, 2, 0, 1, 1, 2];
  const seeds = { A: cfg.seed, B: cfg.seed + 11, C: cfg.seed + 23 };
  let cur = cfg.mel.start;
  for (let ph = 0; ph < 8; ph++) {
    const r = mulberry32(seeds[seedOf[ph]] * 31 + (variant[ph] === 1 ? 5 : 0) * (seedOf[ph] === 'A' ? 0 : 1));
    cur = cfg.mel.start;
    for (let pb = 0; pb < 4; pb++) {
      const bar = ph * 4 + pb, rootD = cfg.prog[bar % cfg.prog.length], rh = cfg.mel.rhythms[Math.floor(r() * cfg.mel.rhythms.length)];
      const lastOnset = (() => { let l = -1; for (let s = 0; s < 16; s++) if (rh[s] !== '.') l = s; return l; })();
      const breath = cfg.mel.breath && pb === 3 && ph % 2 === 1;
      for (let s = 0; s < 16; s++) {
        const dur = rh[s] === '.' ? 0 : +rh[s];
        if (!dur) continue;
        const strong = s % 8 === 0;
        if (breath && s > 4) continue;
        if (!strong && r() > cfg.mel.density) { r(); continue; }
        const m = r();
        cur += m < 0.12 ? -2 : m < 0.38 ? -1 : m < 0.52 ? 0 : m < 0.78 ? 1 : m < 0.92 ? 2 : 3;
        if (cur > cfg.mel.hi) cur -= 2; if (cur < cfg.mel.lo) cur += 2;
        if (s === 0 || s === 8) { const tg = [rootD + 7, rootD + 9, rootD + 11].reduce((q, x) => (Math.abs(x - cur) < Math.abs(q - cur) ? x : q)); if (Math.abs(tg - cur) <= 3) cur = tg; }
        if (pb === 3 && s === lastOnset) cur = cfg.mel.start - 2 + (variant[ph] === 2 ? 4 : 0) + (variant[ph] === 1 ? 2 : 0);
        add(bar, s, { v: 'mel', c: dc(cur), d: dur, vel: strong ? 1 : 0.8 });
      }
    }
  }
  // vurmalılar
  const pr = mulberry32(cfg.seed + 99);
  for (let b = 0; b < BARS; b++) {
    for (let s = 0; s < 16; s++) {
      const ch = cfg.perc[s]; if (ch !== '.') add(b, s, { v: 'perc', k: ch });
      if (cfg.hat && cfg.hat[s] !== '.') add(b, s, { v: 'perc', k: 'h' });
      if (cfg.shaker && s % 2 === 0) add(b, s, { v: 'perc', k: 's' });
      if (cfg.drips && pr() < cfg.drips / 16 * 2) add(b, s, { v: 'drip', c: dc(Math.floor(pr() * 8) + 7) + 1200 });
      if (cfg.frogs && b % 8 === 7 && (s === 6 || s === 14) && pr() < 0.7) add(b, s, { v: 'frog' });
    }
  }
  return ev;
}

export function createMusic(env, bus) {
  const { ctx } = env, S = env.synth;
  let inst = null, curId = null, tempoScale = 1, tempoTarget = 1, intensity = 0.5, paused = false, timer = null;
  const LOOK = 0.22, TICK = IS_LOW ? 60 : 40;
  const plans = {};

  function voices(cfg, tg) {
    const mk = (g) => { const n = ctx.createGain(); n.gain.value = g; n.connect(tg); return n; };
    return { bass: mk(0.32), mel: mk(0.24), perc: mk(0.2), pad: mk(1), fx: mk(0.2) };
  }

  function playEvent(e, cfg, v, at, stepDur) {
    const f = cents(cfg.root, e.c || 0), rev = cfg.rev ?? 0.25, dur = (e.d || 1) * stepDur;
    switch (e.v) {
      case 'bass':
        if (cfg.bassInst === 'sub') { S.tone({ type: 'sine', f: f * 0.5 > 40 ? f * 0.5 : f, at, dur: Math.min(1.1, dur * 3), g: 0.55, a: 0.02, dest: v.bass, pm: false }); S.tone({ type: 'triangle', f, at, dur: dur * 2, g: 0.12, a: 0.02, lp: 500, dest: v.bass, pm: false }); }
        else { S.tone({ type: 'triangle', f, at, dur: Math.max(0.25, dur * 1.1), g: 0.55, a: 0.006, lp: 700, dest: v.bass, pm: false }); S.tone({ type: 'sine', f: f * 2, at, dur: 0.18, g: 0.12, a: 0.004, dest: v.bass, pm: false }); }
        break;
      case 'mel': {
        const vel = e.vel ?? 1, d = Math.max(dur, 0.2);
        const I = cfg.inst;
        if (I === 'saz') S.pluck({ f, at, dur: Math.min(1.1, d + 0.3), vel, g: 0.22, bright: 3400, fall: 0.15, strings: [-6, 6], type: 'sawtooth', dest: v.mel, rev, pm: false });
        else if (I === 'uke') S.pluck({ f, at, dur: Math.min(0.7, d + 0.15), vel, g: 0.22, bright: 2400, fall: 0.25, strings: [-3, 3], type: 'triangle', dest: v.mel, rev, pm: false });
        else if (I === 'twang') {
          const n = cfg.trem && d > 0.45 ? Math.min(6, Math.floor(d / (stepDur))) : 1;
          for (let i = 0; i < n; i++) S.pluck({ f, at: at + i * stepDur * (n > 2 ? 1 : 2), dur: Math.min(1.2, d + 0.3), vel: vel * (1 - i * 0.12), g: 0.2, bright: 4200, q: 3, fall: 0.12, strings: [-4, 4], type: 'sawtooth', vib: -20, dest: v.mel, rev, pm: false });
        } else if (I === 'marimba') { S.tone({ type: 'sine', f, at, dur: 0.45, g: 0.3 * vel, a: 0.003, dest: v.mel, rev, pm: false }); S.tone({ type: 'sine', f: f * 4, at, dur: 0.1, g: 0.08 * vel, a: 0.002, dest: v.mel, pm: false }); }
        else if (I === 'celesta') S.bell({ f: f * 2, at, dur: 1.1, g: 0.14 * vel, parts: [[1, 1, 1], [4, 0.22, 0.35], [6.3, 0.08, 0.2]], dest: v.mel, rev, pm: false });
        break;
      }
      case 'pad': S.tone({ type: 'triangle', f, at, dur: dur * 0.9, g: e.vel, a: 0.8, lp: 900, dest: v.pad, rev: 0.2, detune: 6, pm: false }); break;
      case 'chime': S.bell({ f, at, dur: 2.4, g: 0.09, dest: v.fx, rev: 0.5, parts: [[1, 1, 1], [2.76, 0.4, 0.6], [5.4, 0.2, 0.3]], pm: false }); break;
      case 'arp': S.bell({ f: f * 2, at, dur: 0.5, g: 0.07 * e.vel * 2, parts: [[1, 1, 1], [4, 0.2, 0.3]], dest: v.fx, rev: 0.3, pm: false }); break;
      case 'drip': S.tone({ type: 'sine', f: f * 2, f2: f * 1.5, at, dur: 0.22, g: 0.1, a: 0.002, dest: v.fx, rev: 0.6, pm: false }); break;
      case 'frog': { const b = 190 + Math.random() * 40; for (let i = 0; i < 2; i++) S.tone({ type: 'square', f: b, f2: b * 1.5, at: at + i * 0.1, dur: 0.07, g: 0.045, a: 0.004, lp: 700, dest: v.fx, rev: 0.3, pm: false }); break; }
      case 'perc': perc(e.k, at, v, intensity); break;
      default: break;
    }
  }

  function perc(k, at, v, it) {
    const g = 0.55 + 0.45 * it, d = v.perc;
    if (k === 'D') { S.tone({ type: 'sine', f: 175, f2: 70, at, dur: 0.2, g: 0.55 * g, a: 0.002, dest: d, pm: false }); S.noise({ at, f: 600, q: 0.8, dur: 0.03, g: 0.1 * g, dest: d, pm: false }); }
    else if (k === 'T') { S.tone({ type: 'sine', f: 500, f2: 430, at, dur: 0.07, g: 0.2 * g, a: 0.001, dest: d, pm: false }); S.noise({ at, f: 3000, q: 1.5, dur: 0.06, g: 0.2 * g, a: 0.001, dest: d, pm: false }); }
    else if (it < 0.4) return;
    else if (k === 'K' || k === 'k') { S.noise({ at, f: 4200, q: 1.5, dur: 0.04, g: 0.12 * g, a: 0.001, dest: d, pm: false }); S.tone({ type: 'sine', f: 720, f2: 650, at, dur: 0.05, g: 0.08 * g, a: 0.001, dest: d, pm: false }); }
    else if (k === 't') S.noise({ at, f: 2600, q: 1.5, dur: 0.035, g: 0.1 * g, a: 0.001, dest: d, pm: false });
    else if (k === 'h') S.noise({ at, ft: 'highpass', f: 6500, dur: 0.045, g: 0.07 * g, a: 0.001, dest: d, pm: false });
    else if (k === 's') S.noise({ at, ft: 'bandpass', f: 7000, q: 2, dur: 0.05, g: 0.06 * g, a: 0.002, dest: d, pm: false });
  }

  function pump(until) {
    const m = inst; if (!m) return;
    if (m.next < ctx.currentTime - 0.3) m.next = ctx.currentTime + 0.05; // uzun donmadan sonra geçmişi doldurma
    while (m.next < until) {
      const bpm = m.cfg.bpm, stepDur = 60 / bpm / 4 / tempoScale, si = m.step % (BARS * STEPS), sw = si % 2 ? m.cfg.swing * stepDur : 0;
      const at = m.next + sw;
      if (!paused) for (const e of m.plan[si]) { try { playEvent(e, m.cfg, m.v, at, stepDur); } catch { /* */ } }
      m.next += stepDur; m.step++;
    }
  }
  function tick() {
    tempoScale += (tempoTarget - tempoScale) * 0.15;
    if (inst && ctx.state === 'running') pump(ctx.currentTime + LOOK);
  }

  function stopCur(fade = 0.6) {
    if (!inst) return; const m = inst; inst = null;
    const t = ctx.currentTime; m.tg.gain.cancelScheduledValues(t); m.tg.gain.setValueAtTime(m.tg.gain.value, t); m.tg.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { try { m.tg.disconnect(); } catch { /* */ } }, fade * 1000 + 400);
  }
  function play(id) {
    id = id ? (ALIAS[id] || id) : null;
    if (id && !TRACKS[id]) id = null;
    if (id === curId) return;
    stopCur(); curId = id;
    if (!id) { if (timer) { clearInterval(timer); timer = null; } return; }
    const cfg = TRACKS[id]; plans[id] ??= compose(cfg);
    const tg = ctx.createGain(); tg.gain.setValueAtTime(0, ctx.currentTime); tg.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.9); tg.connect(bus);
    inst = { cfg, plan: plans[id], tg, v: voices(cfg, tg), step: 0, next: ctx.currentTime + 0.12 };
    if (!timer && typeof setInterval === 'function') timer = setInterval(tick, TICK);
  }

  return {
    play, pump, tick, get id() { return curId; }, tracks: Object.keys(TRACKS),
    setTempo(s) { tempoTarget = clamp(s, 0.4, 1.2); },
    setIntensity(x) { intensity += (clamp(x) - intensity) * 0.1; },
    setPaused(p) { paused = p; },
    destroy() { stopCur(0.05); if (timer) clearInterval(timer); timer = null; },
    _plan: (id) => (plans[id] ??= compose(TRACKS[id])),
  };
}
