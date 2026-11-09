// Ses (MIMARI §8). Sahip: Ses. API sabittir. Tamamen Web Audio ile sentez; harici dosya yok. Sim'e dokunmaz.
//
// Mimari (bkz. dosyalar):
//   util.js   — ortam tespiti, gürültü/yankı tamponları, rastgele   synth.js — tek seferlik ses ilkelleri (ton/gürültü/çan/pluck)
//   engine.js — araç başına motor sentezi                          ground.js — yuvarlanma/patinaj/rüzgâr döngüleri
//   sfx.js    — §14 olay efektleri + arayüz sesleri (ses sınırlama)  music.js  — prosedürel müzik (4 biyom + menü)
//
// Grafik:  [motor, zemin, sfx, müzik] → slowLP (yavaş çekim filtresi) → pause kapısı ┐
//          arayüz sesleri ───────────────────────────────────────────────────────┴→ ana ses → kompresör → limiter → yumuşak kırpma → çıkış
import { hasAudio, IS_IOS, IS_LOW, makeBuffers, makeImpulse, clamp, lerp, fin } from './util.js';
import { createSynth } from './synth.js';
import { createEngine } from './engine.js';
import { createGround } from './ground.js';
import { createSfx } from './sfx.js';
import { createMusic } from './music.js';

// iOS: sessiz mod anahtarını aşmak için "playback" oturumu (sessiz WAV'ı <audio> ile çal).
let silentUrl = null;
function silentWav() {
  if (silentUrl) return silentUrl;
  const n = 2000, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer), str = (o, t) => { for (let i = 0; i < t.length; i++) buf[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); str(36, 'data'); dv.setUint32(40, n, true); buf.fill(128, 44);
  return (silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
}

/**
 * @param {{context?:BaseAudioContext}} [opts] yalnızca test/OfflineAudioContext için; oyun argümansız çağırır.
 * @returns {{unlock():void, setEngine(p:{vehicleId:string,rpm01:number,throttle:number,load:number,onGround:boolean,reversing?:boolean,speed?:number}):void,
 *   onEvent(e:{name:string,t?:number}):void, music(trackId:string|null):void,
 *   setVolumes(v:{master?:number,music?:number,sfx?:number}):void, suspend():void, resume():void, destroy():void}}
 */
export function createAudio(opts = {}) {
  const vol = { master: 1, music: 0.7, sfx: 1 };
  const counts = {};
  let ctx = null, env = null, g = null, parts = null, disabled = false, listeners = false, keepAlive = null;
  let paused = false, hidden = false, wantMusic = null, tickTimer = null, resuspendTimer = null;
  const slow = { target: 1, cur: 1, until: 0, active: false };
  const duck = { depth: 1, until: 0, applied: 1 };
  const eng = { last: 0, lastWrite: 0, speed: 0, reversing: false };

  const now = () => (ctx ? ctx.currentTime : 0);
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const external = !!opts.context;

  function build() {
    const low = IS_LOW;
    env = { ctx, low, pm: 1, bufs: makeBuffers(ctx, low), out: {}, now };
    const gn = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    g = { master: gn(vol.master), pause: gn(1), musicVol: gn(vol.music), sfxVol: gn(vol.sfx), duck: gn(1), ui: gn(1) };
    const slowLP = ctx.createBiquadFilter(); slowLP.type = 'lowpass'; slowLP.frequency.value = 20000; slowLP.Q.value = 0.5; g.slowLP = slowLP;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.22;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    const clip = ctx.createWaveShaper(); clip.curve = (() => { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x); c[i] = Math.sign(x) * (a < 0.9 ? a : 0.9 + 0.1 * Math.tanh((a - 0.9) / 0.1)); } return c; })();
    g.musicVol.connect(g.duck); g.duck.connect(slowLP); g.sfxVol.connect(slowLP);
    slowLP.connect(g.pause); g.pause.connect(g.master); g.ui.connect(g.master);
    g.master.connect(comp); comp.connect(lim); lim.connect(clip); clip.connect(ctx.destination);
    g.comp = comp;
    // yankılar: sfx (kısa) ve müzik (uzun) ayrı; kendi ses düğmelerinden geçer
    const rv = (secs, out, level) => { const c = ctx.createConvolver(); c.buffer = makeImpulse(ctx, secs); const lv = gn(level); c.connect(lv); lv.connect(out); const inp = gn(1); inp.connect(c); return inp; };
    env.out.sfx = gn(0.9); env.out.sfx.connect(g.sfxVol);
    env.out.eng = gn(1); env.out.eng.connect(g.sfxVol);
    env.out.ui = g.ui;
    env.out.rev = rv(low ? 0.5 : 0.8, g.sfxVol, 0.8);
    const mout = gn(1.4); mout.connect(g.musicVol); env.out.music = mout;
    env.synth = createSynth(env);
    const envM = Object.create(env); envM.out = { sfx: mout, eng: mout, rev: rv(low ? 0.8 : 1.3, g.musicVol, 0.8) }; envM.pm = 1; env.synthM = createSynth(envM);
    parts = {
      engine: createEngine(env, () => parts.sfx.shift()),
      ground: createGround(env),
      music: createMusic({ ...envM, synth: env.synthM, ctx, now }, mout),
    };
    parts.sfx = createSfx(env, {
      counts, duck: duckMusic, slowmo: startSlow, engineDip: (a) => parts.engine.dip(a),
    });
    parts.sfx.st.surface = () => parts.ground.st.surface; parts.sfx.st.speed = () => Math.abs(eng.speed); parts.sfx.st.rpm = () => parts.engine.state.rpm;
    tickTimer = setInterval(tick, 100);
    if (wantMusic) parts.music.play(wantMusic);
  }

  function duckMusic(depth, dur) { duck.depth = Math.min(duck.depth, depth); duck.until = Math.max(duck.until, now() + dur); }
  function startSlow(scale, dur) { slow.target = clamp(scale, 0.2, 1); slow.until = now() + Math.max(0.3, dur); slow.active = true; }

  function tick() {
    if (!ctx) return;
    const t = now();
    // yavaş çekim zarfı
    if (slow.active && t > slow.until) { slow.target = 1; slow.active = false; if (slow.cur < 0.9) parts.sfx.slowEnd(); }
    slow.cur += (slow.target - slow.cur) * 0.25;
    if (Math.abs(slow.cur - 1) < 0.003) slow.cur = 1;
    env.pm = 0.55 + 0.45 * slow.cur;
    g.slowLP.frequency.setTargetAtTime(1400 + 18600 * slow.cur * slow.cur, t, 0.06);
    parts.music.setTempo(0.5 + 0.5 * slow.cur);
    // müzik kısılması (duck) bırakma
    if (t > duck.until && duck.depth < 1) duck.depth = 1;
    if (duck.depth !== duck.applied) { g.duck.gain.setTargetAtTime(duck.depth, t, duck.depth < duck.applied ? 0.02 : 0.3); duck.applied = duck.depth; }
    // motor bekçisi: setEngine gelmiyorsa (menü/duraklatma/sonuç) sustur ve düğümleri bırak
    if (ms() - eng.last > 350 && (parts.engine.running || parts.ground.running)) { parts.engine.stop(); parts.ground.stop(); }
  }

  function iosSession() {
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch { /* */ }
    if (!IS_IOS || external || hidden || typeof document === 'undefined') return;
    try {
      if (!keepAlive) { const a = document.createElement('audio'); a.src = silentWav(); a.loop = true; a.preload = 'auto'; a.setAttribute('playsinline', ''); keepAlive = a; }
      if (keepAlive.paused) keepAlive.play()?.catch?.(() => {});
    } catch { /* */ }
  }
  function kick() {
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch { /* */ }
  }
  function wake() {
    if (!ctx || external || paused || hidden) return;
    iosSession();
    if (ctx.state !== 'running') { try { ctx.resume()?.catch?.(() => {}); } catch { /* */ } kick(); }
  }
  function attachListeners() {
    if (listeners || external || typeof document === 'undefined') return; listeners = true;
    // iOS 'interrupted' (arama, kilit ekranı) ve sekme dönüşü: sonraki dokunuşta uyandır
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) document.addEventListener(ev, wake, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      if (!ctx || external) return;
      if (hidden) { try { ctx.suspend()?.catch?.(() => {}); } catch { /* */ } if (keepAlive) keepAlive.pause(); }
      else wake();
    });
    ctx.onstatechange = () => { if (ctx && ctx.state === 'interrupted') wake(); };
  }

  const api = {
    /** İlk kullanıcı dokunuşunda çağrılır (AudioContext oluştur/resume). Birden çok kez çağrılabilir. */
    unlock() {
      if (disabled) return;
      try {
        if (!ctx) {
          if (!external && !hasAudio) { disabled = true; return; }
          const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
          ctx = opts.context || new AC({ latencyHint: 'interactive' });
          build(); attachListeners();
        }
        wake();
      } catch { disabled = true; ctx = null; }
    },
    /** Her karede çağrılır. rpm01 0..1, throttle 0..1, load 0..1; isteğe bağlı reversing/speed. */
    setEngine(p) {
      if (!ctx || !p || paused || disabled) return;
      const t = ms(); eng.last = t;
      const dt = (t - eng.lastWrite) / 1000;
      if (dt < 0.024) return;
      eng.lastWrite = t;
      try {
        const q = { ...p, reversing: p.reversing ?? eng.reversing };
        if (p.speed != null) eng.speed = p.speed;
        parts.ground.st.air = p.onGround === false;
        parts.engine.update(q, Math.min(dt, 0.1), env.pm, false);
        parts.ground.st.speed = eng.speed;
        parts.ground.update(false, env.pm);
      } catch { /* ses hatası oyunu durdurmasın */ }
    },
    /** Sim olayları ve UI olayları: e.name ∈ MIMARI §6 listesi + 'ui:click' 'ui:back' 'ui:star' (+ 'ui:hover'). */
    onEvent(e) {
      if (!ctx || !e || disabled) return;
      const n = e.name, ui = n.startsWith('ui:') || n === 'purchase' || n === 'upgrade';
      if (paused) { if (!ui) return; briefResume(); }
      try {
        const gr = parts.ground;
        switch (n) {
          case 'engine': eng.speed = fin(e.speed, eng.speed); eng.reversing = e.speed < -0.6; gr.st.speed = eng.speed; parts.music.setIntensity(clamp(Math.abs(eng.speed) / 10)); return;
          case 'wheelContact': gr.wheelContact(e.wheel, e.surface, e.started); break;
          case 'surfaceChange': gr.surfaceChange(e.wheel, e.to); break;
          case 'wheelspin': gr.wheelspin(e.surface, e.slip, now()); return;
          case 'airborne': gr.st.air = true; break;
          case 'land': gr.st.air = false; if (e.wheels != null) gr.st.contacts = e.wheels; break;
          case 'levelStart': gr.reset(); parts.engine.kick(); parts.sfx.st.combo = 0; parts.sfx.st.mult = 1; duck.depth = 1; duck.until = 0; slow.target = 1; slow.cur = 1; slow.active = false; break;
          case 'pause': case 'resume': return;
          default: break;
        }
        parts.sfx.handle(e);
      } catch { /* */ }
    },
    /** trackId: 'menu' | 'elma' | 'kanyon' | 'bataklik' | 'zirve' | null (sustur). Kilit açılmadan çağrılırsa hatırlanır. */
    music(id) {
      wantMusic = id || null;
      if (ctx && parts) { try { parts.music.play(wantMusic); } catch { /* */ } }
    },
    setVolumes(v) {
      if (!v) return;
      for (const k of ['master', 'music', 'sfx']) if (v[k] != null && Number.isFinite(+v[k])) vol[k] = clamp(+v[k]);
      if (!ctx || !g) return;
      const t = now();
      g.master.gain.setTargetAtTime(vol.master, t, 0.03); g.musicVol.gain.setTargetAtTime(vol.music, t, 0.03); g.sfxVol.gain.setTargetAtTime(vol.sfx, t, 0.03);
    },
    /** Duraklatma: sesi kısıp bağlamı durdur (CPU). Arayüz tıkları kısa süre uyandırılır. */
    suspend() {
      if (!ctx || disabled) return; paused = true; parts.music.setPaused(true);
      g.pause.gain.cancelScheduledValues(now()); g.pause.gain.setTargetAtTime(0, now(), 0.025);
      parts.engine.stop(); parts.ground.stop();
      if (external) return;
      clearTimeout(resuspendTimer);
      resuspendTimer = setTimeout(() => { if (paused && ctx) { try { ctx.suspend()?.catch?.(() => {}); } catch { /* */ } } }, 160);
    },
    resume() {
      if (!ctx || disabled) return; paused = false; clearTimeout(resuspendTimer); parts.music.setPaused(false);
      if (!external && !hidden) { try { ctx.resume()?.catch?.(() => {}); } catch { /* */ } }
      g.pause.gain.cancelScheduledValues(now()); g.pause.gain.setTargetAtTime(1, now(), 0.06);
    },
    destroy() {
      clearInterval(tickTimer); clearTimeout(resuspendTimer); tickTimer = null;
      try { parts?.music.destroy(); parts?.engine.stop(); parts?.ground.stop(); } catch { /* */ }
      try { if (!external) ctx?.close?.(); } catch { /* */ }
      if (keepAlive) { try { keepAlive.pause(); } catch { /* */ } }
      ctx = null; parts = null; g = null;
    },
    /** Hata ayıklama/test: sayaçlar ve iç nesneler (oyun kullanmaz). */
    get debug() { return { ctx, env, parts, g, counts, vol, paused, hidden, disabled, voices: parts?.sfx.voices ?? 0 }; },
  };

  function briefResume() {
    if (external) return;
    try { ctx.resume()?.catch?.(() => {}); } catch { /* */ }
    clearTimeout(resuspendTimer);
    resuspendTimer = setTimeout(() => { if (paused && ctx) { try { ctx.suspend()?.catch?.(() => {}); } catch { /* */ } } }, 900);
  }
  return api;
}
