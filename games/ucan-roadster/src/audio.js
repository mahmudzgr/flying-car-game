// Procedural sound (WebAudio) – no audio files needed.

// iPhone/iPad (every iOS browser uses WebKit). iPadOS reports itself as a Mac with touch.
export const IS_IOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// A tiny silent WAV (8 kHz, 8-bit, mono). Playing it through an <audio> element moves iOS into the
// "playback" audio session, so Web Audio is not silenced by the ring/silent switch.
function silentWavUrl() {
  const n = 2000;
  const buf = new Uint8Array(44 + n);
  const dv = new DataView(buf.buffer);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) buf[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  str(36, 'data'); dv.setUint32(40, n, true);
  buf.fill(128, 44);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
    this.keepAlive = null;
  }

  // 'none' (not started yet) | 'running' | 'suspended' | 'interrupted' (iOS) | 'closed'
  get status() {
    return this.ctx ? this.ctx.state : 'none';
  }

  // Ask for the "playback" audio session (plays even when the phone is on silent).
  unlockSession() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    } catch (e) { /* not supported */ }
    if (!IS_IOS || document.hidden) return;
    if (!this.keepAlive) {
      const a = document.createElement('audio');
      a.src = silentWavUrl();
      a.loop = true;
      a.preload = 'auto';
      a.setAttribute('playsinline', '');
      a.setAttribute('x-webkit-airplay', 'deny');
      this.keepAlive = a;
      try {
        if ('mediaSession' in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: 'Uçan Roadster' });
      } catch (e) { /* ignore */ }
    }
    if (this.keepAlive.paused) {
      const pr = this.keepAlive.play();
      if (pr && pr.catch) pr.catch(() => {});
    }
  }

  // Page hidden: stop everything; page visible again: the next touch wakes it up.
  sleep() {
    if (this.keepAlive) this.keepAlive.pause();
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  wake() {
    if (!this.ctx) return;
    this.unlockSession();
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  // Must run inside a user gesture (touch/click): creates or wakes up the audio engine.
  init() {
    this.unlockSession();
    if (this.ctx) {
      if (this.ctx.state !== 'running') {
        // covers 'suspended' and the iOS-only 'interrupted' state (calls, lock screen, other apps)
        this.ctx.resume().catch(() => {});
        this.kick();
      }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    ctx.onstatechange = () => { if (this.onState) this.onState(ctx.state); };
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    this.kick();
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.comp = comp; // the music bus joins here (independent of the SFX volume)

    // white noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    // Electric motor whine: two detuned oscillators through a filter
    this.motorGain = ctx.createGain();
    this.motorGain.gain.value = 0;
    const mf = ctx.createBiquadFilter();
    mf.type = 'lowpass';
    mf.frequency.value = 1800;
    this.motorOsc1 = ctx.createOscillator();
    this.motorOsc1.type = 'sawtooth';
    this.motorOsc2 = ctx.createOscillator();
    this.motorOsc2.type = 'triangle';
    const g1 = ctx.createGain(); g1.gain.value = 0.18;
    const g2 = ctx.createGain(); g2.gain.value = 0.5;
    this.motorOsc1.connect(g1).connect(mf);
    this.motorOsc2.connect(g2).connect(mf);
    mf.connect(this.motorGain).connect(this.master);
    this.motorOsc1.start();
    this.motorOsc2.start();

    // Main thruster: band-passed noise roar
    this.thrustGain = this.loopNoise('bandpass', 420, 0.7);
    // Pitch thrusters: higher hiss
    this.rcsGain = this.loopNoise('highpass', 2500, 0.5);
    // Wind / rolling noise
    this.windGain = this.loopNoise('lowpass', 500, 0.4);
    // Weather ambience (rain hiss)
    this.rainGain = this.loopNoise('bandpass', 2600, 0.35);
    this.ready = true;
    if (this.onReady) this.onReady();
  }

  // Start a 1-sample silent buffer inside the gesture: the classic WebKit audio unlock.
  kick() {
    try {
      const ctx = this.ctx;
      const b = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) { /* ignore */ }
  }

  setAmbient(kind) {
    this.ambient = kind;
    if (!this.ready) return;
    this.rainGain.gain.setTargetAtTime(kind === 'rain' ? 0.12 : 0, this.ctx.currentTime, 0.5);
  }

  loopNoise(type, freq, q) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    g.filter = f;
    return g;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
  }

  // Continuous sounds, called every frame
  update({ speed = 0, gas = false, thrust = 0, rcs = 0, air = 0, active = true }) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const k = 0.08;
    const f = 60 + speed * 9 + (gas ? 40 : 0);
    this.motorOsc1.frequency.setTargetAtTime(f, t, k);
    this.motorOsc2.frequency.setTargetAtTime(f * 2.01, t, k);
    this.motorGain.gain.setTargetAtTime(active ? (gas ? 0.11 : 0.04) * Math.min(1, 0.3 + speed / 30) : 0, t, k);
    this.thrustGain.gain.setTargetAtTime(active ? thrust * 0.55 : 0, t, 0.04);
    this.thrustGain.filter.frequency.setTargetAtTime(380 + Math.random() * 80, t, 0.05);
    this.rcsGain.gain.setTargetAtTime(active ? rcs * 0.14 : 0, t, 0.03);
    this.windGain.gain.setTargetAtTime(active ? Math.min(0.25, (speed / 60) ** 2 * 0.3 * (0.4 + air)) : 0, t, 0.1);
  }

  tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, freq, vol = 0.5, type = 'lowpass', delay = 0) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  sfx(name, p = {}) {
    if (!this.ready) return;
    switch (name) {
      case 'click': this.tone(660, 0.06, 'square', 0.08); break;
      case 'count': this.tone(520, 0.15, 'square', 0.12); break;
      case 'go': this.tone(880, 0.35, 'square', 0.14); break;
      case 'launch': this.noise(0.5, 1500, 0.25, 'bandpass'); this.tone(180, 0.4, 'sawtooth', 0.08, 220); break;
      case 'flip': {
        const base = 520 * Math.pow(1.122, Math.min(8, (p.combo || 1) - 1));
        this.tone(base, 0.12, 'triangle', 0.22);
        this.tone(base * 1.5, 0.18, 'triangle', 0.18, 0, 0.08);
        break;
      }
      case 'star': this.tone(1046, 0.1, 'sine', 0.22); this.tone(1568, 0.25, 'sine', 0.2, 0, 0.07); break;
      case 'fuel': this.tone(300, 0.25, 'sine', 0.25, 500); break;
      case 'touch': this.noise(0.25, 300, Math.min(0.9, 0.2 + (p.impact || 0) * 0.1)); this.tone(90, 0.2, 'sine', 0.3, -40); break;
      case 'land': [0, 4, 7, 12].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 0.35, 'triangle', 0.16, 0, i * 0.09)); break;
      case 'crash':
        this.noise(1.4, 1200, 0.9);
        this.noise(0.8, 200, 0.9, 'lowpass', 0.05);
        this.tone(70, 0.9, 'sawtooth', 0.25, -40);
        break;
      case 'fail': this.tone(330, 0.3, 'square', 0.1, -120); this.tone(220, 0.45, 'square', 0.1, -100, 0.25); break;
      case 'ach': [0, 7, 12, 16, 19].forEach((s, i) => this.tone(660 * Math.pow(2, s / 12), 0.25, 'sine', 0.14, 0, i * 0.07)); break;
      case 'warn': this.tone(1200, 0.08, 'square', 0.07); break;
      case 'thunder':
        this.noise(2.8, 420, 0.75, 'lowpass', p.delay || 0);
        this.noise(1.6, 160, 0.9, 'lowpass', (p.delay || 0) + 0.1);
        break;
      default: break;
    }
  }
}
