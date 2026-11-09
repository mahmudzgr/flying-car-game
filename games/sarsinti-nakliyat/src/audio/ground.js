// Lastik/zemin: yüzeye göre yuvarlanma (hız ile perde/yoğunluk), patinaj/kayma, rüzgâr. Sürekli döngüler; ~40 Hz güncellenir.
import { clamp, fin } from './util.js';

// roll: [kazanç, bant merkezi Hz, Q]; cr: çıtırtı (çakıl/kar) [kazanç, Hz, Q]; slip: [kazanç, Hz, Q, ton Hz, ton kazancı]
const SURF = {
  asphalt: { roll: [0.1, 220, 0.5], cr: [0, 2000, 1], slip: [0.2, 2400, 4, 880, 0.035] },
  dirt:    { roll: [0.1, 520, 0.5], cr: [0.05, 1800, 0.8], slip: [0.17, 1500, 1, 0, 0] },
  grass:   { roll: [0.07, 380, 0.4], cr: [0.015, 1500, 0.8], slip: [0.1, 900, 0.8, 0, 0] },
  gravel:  { roll: [0.07, 900, 0.5], cr: [0.17, 2600, 0.8], slip: [0.2, 2500, 0.8, 0, 0] },
  sand:    { roll: [0.1, 750, 0.3], cr: [0, 1500, 1], slip: [0.14, 1200, 0.5, 0, 0] },
  mud:     { roll: [0.16, 260, 0.9], cr: [0.06, 520, 0.8], slip: [0.2, 420, 1.2, 0, 0] },
  wet:     { roll: [0.1, 650, 0.6], cr: [0, 1500, 1], slip: [0.15, 1800, 1, 0, 0] },
  snow:    { roll: [0.07, 1400, 0.4], cr: [0.07, 3400, 0.7], slip: [0.12, 3200, 1, 1900, 0.025] },
  ice:     { roll: [0.05, 2600, 1], cr: [0, 3000, 1], slip: [0.11, 5200, 1.5, 2700, 0.05] },
  water:   { roll: [0.16, 500, 0.5], cr: [0, 1500, 1], slip: [0.18, 800, 0.6, 0, 0] },
};
SURF.default = SURF.dirt;

export function createGround(env) {
  const { ctx } = env;
  let n = null;
  const st = { speed: 0, contacts: 0, slip: 0, slipUntil: 0, surface: 'dirt', air: false, roll: 0, wheelSurf: { front: null, rear: null }, wheelOn: { front: false, rear: false } };

  function build() {
    const out = ctx.createGain(); out.gain.value = 1; out.connect(env.out.sfx);
    const gn = () => { const g = ctx.createGain(); g.gain.value = 0; g.connect(out); return g; };
    const bq = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const src = (buf, rate = 1) => { const s = ctx.createBufferSource(); s.buffer = env.bufs[buf]; s.loop = true; s.playbackRate.value = rate; s.start(0, Math.random()); return s; };
    const rs = src('pink'), rf = bq('bandpass', 400, 0.5), rg = gn(); rs.connect(rf); rf.connect(rg);
    const cs = src('crackle'), cf = bq('bandpass', 2000, 0.8), cg = gn(); cs.connect(cf); cf.connect(cg);
    const ss = src('pink', 1.3), sf = bq('bandpass', 1500, 1), sg = gn(); ss.connect(sf); sf.connect(sg);
    const to = ctx.createOscillator(); to.type = 'sine'; to.frequency.value = 900; const tg = gn(); to.connect(tg); to.start();
    const ws = src('brown', 0.8), wf = bq('lowpass', 500, 0.5), wg = gn(); ws.connect(wf); wf.connect(wg);
    n = { out, rs, rf, rg, cs, cf, cg, ss, sf, sg, to, tg, ws, wf, wg, all: [rs, cs, ss, to, ws] };
  }
  const set = (p, v, tc = 0.05) => p.setTargetAtTime(fin(v), ctx.currentTime, tc);

  function update(paused, pitchMul) {
    if (!n) build();
    const ph = SURF[st.surface] || SURF.default;
    const sp = clamp(Math.abs(st.speed) / 14), grounded = st.contacts > 0 && !st.air ? Math.min(1, 0.55 + 0.45 * st.contacts / 2) : 0;
    const mute = paused ? 0 : 1;
    const rollLvl = grounded * clamp(Math.abs(st.speed) / 3) * (0.35 + 0.65 * sp) * mute;
    set(n.rg.gain, ph.roll[0] * rollLvl); set(n.rf.frequency, ph.roll[1] * (0.7 + 0.8 * sp) * pitchMul); n.rf.Q.value = ph.roll[2];
    set(n.cg.gain, ph.cr[0] * rollLvl * 1.2); set(n.cf.frequency, ph.cr[1]); n.cf.Q.value = ph.cr[2];
    n.cs.playbackRate.setTargetAtTime(0.4 + sp * 2.2, ctx.currentTime, 0.08);
    const slipOn = env.now() < st.slipUntil && grounded > 0 ? clamp(st.slip / 6, 0.35, 1) : 0;
    set(n.sg.gain, ph.slip[0] * slipOn * mute, 0.04); set(n.sf.frequency, ph.slip[1] * (0.85 + 0.3 * slipOn) * pitchMul); n.sf.Q.value = ph.slip[2];
    set(n.tg.gain, ph.slip[4] * slipOn * mute, 0.04); set(n.to.frequency, (ph.slip[3] || 900) * (0.95 + 0.1 * Math.sin(env.now() * 9)) * pitchMul);
    // rüzgâr: hızla ve havadayken
    const wind = Math.pow(clamp(Math.abs(st.speed) / 24), 1.6) * (st.air ? 1.35 : 1) * mute;
    set(n.wg.gain, 0.16 * wind, 0.15); set(n.wf.frequency, 260 + 1100 * wind);
  }

  function stop() {
    if (!n) return; const o = n; n = null;
    try { o.out.gain.setTargetAtTime(0, ctx.currentTime, 0.06); } catch { /* */ }
    setTimeout(() => { for (const s of o.all) { try { s.stop(); } catch { /* */ } } try { o.out.disconnect(); } catch { /* */ } }, 400);
  }

  return {
    st, update, stop, get running() { return !!n; },
    wheelContact(wheel, surface, started) {
      st.wheelOn[wheel] = !!started; if (started && surface) { st.wheelSurf[wheel] = surface; st.surface = surface; }
      st.contacts = (st.wheelOn.front ? 1 : 0) + (st.wheelOn.rear ? 1 : 0);
    },
    surfaceChange(wheel, to) { st.wheelSurf[wheel] = to; st.surface = to; },
    wheelspin(surface, slip, now) { if (surface) st.surface = surface; st.slip = fin(slip); st.slipUntil = now + 0.22; },
    reset() { st.contacts = 0; st.wheelOn.front = st.wheelOn.rear = false; st.slipUntil = 0; st.speed = 0; },
  };
}
