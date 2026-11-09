// Küçük sentez kütüphanesi: tek seferlik sesler (ton, gürültü, çan, pluck). Her çağrı birkaç düğüm üretir ve kendini temizler.
// env = { ctx, bufs, pm (perde çarpanı: yavaş çekimde <1), out:{sfx,music,eng,rev} }

export function createSynth(env) {
  const { ctx } = env;
  const T = (o) => (o.at != null ? o.at : ctx.currentTime + (o.t || 0));
  const EPS = 0.0001, NYQ = ctx.sampleRate * 0.45, cl = (f) => Math.min(f, NYQ);

  function envGain(o, t0, dur, peak) {
    const g = ctx.createGain(), a = o.a ?? 0.003;
    g.gain.setValueAtTime(EPS, t0);
    g.gain.linearRampToValueAtTime(Math.max(peak, EPS * 2), t0 + Math.min(a, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(EPS, t0 + dur);
    return g;
  }
  function route(g, o) {
    g.connect(o.dest || env.out.sfx);
    if (o.rev && env.out.rev) { const s = ctx.createGain(); s.gain.value = o.rev; g.connect(s); s.connect(env.out.rev); }
  }
  function cleanup(src, g) { src.onended = () => { try { g.disconnect(); } catch { /* */ } }; }

  /** o: {type,f,f2,dur,g,a,t|at,lp,lp2,q,hp,dest,rev,detune} */
  function tone(o) {
    const t0 = T(o), dur = o.dur ?? 0.2, pm = o.pm === false ? 1 : env.pm;
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(cl(o.f * pm), t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, cl(o.f2 * pm)), t0 + dur * (o.sweep ?? 1));
    if (o.detune) osc.detune.value = o.detune;
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q ?? 0.7; f.frequency.setValueAtTime(o.lp, t0); if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t0 + dur); node.connect(f); node = f; }
    const g = envGain(o, t0, dur, o.g ?? 0.3);
    node.connect(g); route(g, o);
    osc.start(t0); osc.stop(t0 + dur + 0.05); cleanup(osc, g);
    return osc;
  }

  /** Gürültü patlaması. o: {src:'white'|'pink'|'brown'|'crackle', ft,f,f2,q,dur,g,a,rate,t|at} */
  function noise(o) {
    const t0 = T(o), dur = o.dur ?? 0.2;
    const src = ctx.createBufferSource(); src.buffer = env.bufs[o.src || 'white']; src.loop = true;
    src.playbackRate.value = (o.rate ?? 1) * (o.pm === false ? 1 : Math.sqrt(env.pm));
    let node = src;
    if (o.f) {
      const f = ctx.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.Q.value = o.q ?? 0.8;
      f.frequency.setValueAtTime(cl(o.f), t0); if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, cl(o.f2)), t0 + dur);
      node.connect(f); node = f;
    }
    const g = envGain(o, t0, dur, o.g ?? 0.3);
    node.connect(g); route(g, o);
    src.start(t0, Math.random() * 0.8); src.stop(t0 + dur + 0.05); cleanup(src, g);
    return src;
  }

  /** Çan/metalik tınlama: eşit olmayan kısmi sesler. o: {f,dur,g,parts:[[oran,kazanç,sönümÇarpanı]]} */
  function bell(o) {
    const parts = o.parts || [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.22, 0.35]], dur = o.dur ?? 0.8;
    for (const [r, gain, dm] of parts) if (o.f * r < 11000) tone({ ...o, f: o.f * r, f2: o.f2 ? o.f2 * r : undefined, g: (o.g ?? 0.25) * gain, dur: dur * dm, type: 'sine' });
  }

  /** Telli çalgı (saz/ukulele/gitar): çift tel, alçak geçirgen süpürme, kısa pena tıkı. */
  function pluck(o) {
    const t0 = T(o), dur = o.dur ?? 0.5, f = cl(o.f * (o.pm === false ? 1 : env.pm)), vel = o.vel ?? 1;
    const g = envGain({ a: 0.004 }, t0, dur, (o.g ?? 0.25) * vel);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = o.q ?? 1.2;
    const br = (o.bright ?? 3000) * (0.5 + vel * 0.6);
    lp.frequency.setValueAtTime(cl(br), t0); lp.frequency.exponentialRampToValueAtTime(Math.max(200, cl(br) * (o.fall ?? 0.2)), t0 + dur * 0.8);
    lp.connect(g);
    const oscs = [];
    for (const dt of o.strings || [-5, 5]) {
      const osc = ctx.createOscillator(); osc.type = o.type || 'sawtooth'; osc.frequency.value = f; osc.detune.value = dt;
      if (o.vib) { osc.detune.setValueAtTime(dt, t0); osc.detune.linearRampToValueAtTime(dt + o.vib, t0 + dur * 0.6); }
      osc.connect(lp); osc.start(t0); osc.stop(t0 + dur + 0.05); oscs.push(osc);
    }
    if (o.pick !== false) noise({ at: t0, src: 'white', ft: 'highpass', f: 2500, dur: 0.02, g: 0.05 * vel, dest: lp, pm: false });
    route(g, o); cleanup(oscs[0], g);
  }

  return { tone, noise, bell, pluck, T };
}
