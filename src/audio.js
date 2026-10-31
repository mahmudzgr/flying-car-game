// Procedural sound (WebAudio) – no audio files needed.
export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(ctx.destination);

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
    this.ready = true;
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
      default: break;
    }
  }
}
