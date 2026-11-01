// Procedural soundtrack: a small WebAudio step sequencer (no audio files).
// Each theme gets its own key, tempo and chord progression; layers fade in with the action:
// 0 = menu/briefing (pad + soft arpeggio), 1 = driving (+ bass, hats, half-time kick), 2 = flying (+ full drums, lead).

const TRACKS = {
  // chords are semitone offsets from the track root
  sky: { bpm: 112, root: 48, prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], scale: [0, 2, 4, 7, 9], arp: 'square', lead: 'triangle', swing: 0 },
  desert: { bpm: 96, root: 50, prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-2, 2, 5]], scale: [0, 3, 5, 7, 10], arp: 'triangle', lead: 'sawtooth', swing: 0.12 },
  neon: { bpm: 118, root: 45, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], scale: [0, 3, 5, 7, 10], arp: 'sawtooth', lead: 'square', swing: 0 },
  orbit: { bpm: 84, root: 40, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], scale: [0, 2, 3, 7, 10], arp: 'sine', lead: 'sine', swing: 0, sparse: true },
  crystal: { bpm: 104, root: 43, prog: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]], scale: [0, 2, 4, 7, 9], arp: 'bell', lead: 'triangle', swing: 0.08 },
  storm: { bpm: 128, root: 38, prog: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]], scale: [0, 3, 5, 7, 10], arp: 'sawtooth', lead: 'sawtooth', swing: 0 },
};

export const THEME_TRACK = {
  earth: 'sky', valley: 'sky', sea: 'sky',
  canyon: 'desert', mars: 'desert', sunset: 'desert',
  city: 'neon', site: 'neon', neon: 'neon',
  moon: 'orbit', titan: 'orbit',
  snow: 'crystal', frost: 'crystal',
  storm: 'storm',
};

const BASS = [0, null, 0, null, 0, null, 12, null, 0, null, 0, null, 7, null, 12, null];
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.enabled = true;
    this.ready = false;
    this.trackName = null;
    this.track = null;
    this.intensity = 0;
    this.volume = 0.42;
  }

  // Call after the AudioContext exists (first user gesture).
  attach() {
    const S = this.sound;
    if (this.ready || !S.ctx) return;
    const ctx = (this.ctx = S.ctx);
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass';
    this.tone.frequency.value = 18000;
    this.out.connect(this.tone).connect(S.comp);
    // reverb (synthetic impulse response) and a tempo-synced echo
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(1.8);
    const rv = ctx.createGain();
    rv.gain.value = 0.32;
    this.reverb.connect(rv).connect(this.out);
    this.delay = ctx.createDelay(1.5);
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.3;
    const dOut = ctx.createGain();
    dOut.gain.value = 0.28;
    this.delay.connect(this.delayFb).connect(this.delay);
    this.delay.connect(dOut).connect(this.out);
    this.noise = S.noiseBuf;
    this.ready = true;
    this.timer = setInterval(() => this.schedule(), 25);
    if (this.trackName) this.start(this.trackName);
  }

  makeImpulse(sec) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(on ? this.volume : 0, t, 0.3);
    if (on) this.nextTime = Math.max(this.nextTime || 0, t + 0.05);
  }

  setTrack(name) {
    if (!TRACKS[name] || name === this.trackName) return;
    this.trackName = name;
    if (this.ready) this.start(name);
  }

  start(name) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    // quick fade out, switch, fade back in
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(0, t, 0.08);
    this.track = TRACKS[name];
    this.step = 0;
    this.stepDur = 60 / this.track.bpm / 4;
    this.nextTime = t + 0.35;
    this.delay.delayTime.setValueAtTime(this.stepDur * 3, t);
    this.makeMotif(name);
    if (this.enabled) this.out.gain.setTargetAtTime(this.volume, t + 0.3, 0.25);
  }

  // 2-bar lead motif from the track's pentatonic scale; chord tones on strong beats
  makeMotif(name) {
    const tr = this.track;
    const r = seeded(name.length * 131 + tr.bpm);
    this.motif = [];
    for (let i = 0; i < 32; i++) {
      const strong = i % 4 === 0;
      if (!strong && r() < 0.55) {
        this.motif.push(null);
        continue;
      }
      this.motif.push({ deg: Math.floor(r() * tr.scale.length), oct: r() < 0.25 ? 12 : 0, chordTone: strong, len: r() < 0.3 ? 3 : 1.6 });
    }
  }

  setIntensity(level) {
    this.intensity = level;
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(level >= 2 ? 18000 : level === 1 ? 9000 : 3800, t, 0.4);
  }

  // Crash: dip the music and muffle it, then recover.
  duck(depth = 0.2, dur = 2.5) {
    if (!this.ready || !this.enabled) return;
    const t = this.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this.volume * depth, t, 0.05);
    g.setTargetAtTime(this.volume, t + dur, 0.6);
    this.tone.frequency.cancelScheduledValues(t);
    this.tone.frequency.setTargetAtTime(500, t, 0.05);
    this.tone.frequency.setTargetAtTime(this.intensity >= 2 ? 18000 : 3800, t + dur, 0.8);
  }

  // Short phrase in the current key: 'win' (rising major) or 'lose' (falling).
  stinger(kind) {
    if (!this.ready || !this.enabled || !this.track) return;
    const t = this.ctx.currentTime + 0.05;
    const root = this.track.root + 24;
    const notes = kind === 'win' ? [0, 4, 7, 12, 16, 19, 24] : [7, 3, 0, -5];
    notes.forEach((n, i) => this.pluck(midiHz(root + n), t + i * (kind === 'win' ? 0.075 : 0.16), kind === 'win' ? 0.5 : 0.4, 0.11, 'triangle', true));
    if (kind === 'win') this.padChord([0, 4, 7, 12].map((n) => root - 12 + n), t, 1.6, 0.05);
  }

  schedule() {
    if (!this.ready || !this.track) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (this.nextTime < now - 0.25) this.nextTime = now + 0.05; // tab was suspended
    while (this.nextTime < now + 0.14) {
      if (this.enabled) this.playStep(this.step, this.nextTime);
      const swing = this.track.swing && this.step % 2 === 0 ? this.track.swing : this.track.swing ? -this.track.swing : 0;
      this.nextTime += this.stepDur * (1 + swing);
      this.step++;
    }
  }

  playStep(step, t) {
    const tr = this.track;
    const lvl = this.intensity;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const chord = tr.prog[bar % tr.prog.length];
    const root = tr.root;
    const barDur = this.stepDur * 16;

    // pad: one chord per bar
    if (s === 0) this.padChord(chord.map((n) => root + 12 + n), t, barDur, lvl === 0 ? 0.045 : 0.035);

    // bass
    if (lvl === 0) {
      if (s === 0) this.bass(midiHz(root + chord[0] - 12), t, barDur * 0.9, 0.12);
    } else {
      const b = BASS[s];
      if (b !== null && !(tr.sparse && s % 4 !== 0)) this.bass(midiHz(root + chord[0] + b - 12), t, this.stepDur * 1.7, 0.16);
    }

    // arpeggio
    const arpEvery = lvl === 0 ? 2 : 1;
    if (s % arpEvery === 0 && !(tr.sparse && lvl === 0 && s % 4 !== 0)) {
      const tones = [chord[0], chord[1], chord[2], chord[0] + 12];
      const idx = (s / arpEvery) % 4;
      const n = root + 24 + tones[bar % 2 ? 3 - idx : idx];
      if (tr.arp === 'bell') this.bell(midiHz(n + 12), t, 0.05);
      else this.pluck(midiHz(n), t, 0.16, lvl === 0 ? 0.03 : 0.045, tr.arp, true);
    }

    // drums
    if (lvl >= 1) {
      const kickOn = lvl >= 2 ? s % 4 === 0 : s === 0 || s === 8;
      if (kickOn && !(tr.sparse && s % 8 !== 0)) this.kick(t);
      if (lvl >= 2 && (s === 4 || s === 12)) this.snare(t);
      const hatEvery = lvl >= 2 && !tr.sparse ? 1 : 2;
      if (s % hatEvery === 0) this.hat(t, s % 4 === 2 ? 0.055 : 0.03, s === 14 && lvl >= 2);
    }

    // lead melody while flying
    if (lvl >= 2) {
      const m = this.motif[step % 32];
      if (m) {
        let semi = tr.scale[m.deg] + m.oct;
        if (m.chordTone) semi = chord[m.deg % 3] + (chord[m.deg % 3] < 0 ? 12 : 0);
        this.lead(midiHz(root + 24 + semi), t, this.stepDur * m.len, 0.05, tr.lead);
      }
    }
  }

  // --- instruments ---------------------------------------------------------
  env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  padChord(notes, t, dur, vol) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900 + this.intensity * 500;
    f.Q.value = 0.6;
    const g = ctx.createGain();
    this.env(g, t, 0.35, vol, dur + 0.3, 0.6);
    f.connect(g);
    g.connect(this.out);
    g.connect(this.reverb);
    for (const n of notes) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midiHz(n);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.35);
      }
    }
  }

  bass(freq, t, dur, vol) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq / 2;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 4;
    f.frequency.setValueAtTime(380 + this.intensity * 260, t);
    f.frequency.exponentialRampToValueAtTime(160, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.01, vol, dur, 0.08);
    o.connect(f);
    sub.connect(f);
    f.connect(g).connect(this.out);
    o.start(t);
    sub.start(t);
    o.stop(t + dur + 0.05);
    sub.stop(t + dur + 0.05);
  }

  pluck(freq, t, dur, vol, type = 'square', echo = false) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type === 'bell' ? 'sine' : type;
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(700, t + dur);
    const g = ctx.createGain();
    this.env(g, t, 0.005, vol, dur, dur * 0.8);
    o.connect(f).connect(g);
    g.connect(this.out);
    g.connect(this.reverb);
    if (echo) g.connect(this.delay);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  bell(freq, t, vol) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    this.env(g, t, 0.003, vol, 1.1, 1.0);
    g.connect(this.out);
    g.connect(this.reverb);
    for (const [mul, amp] of [[1, 1], [2.76, 0.4], [5.4, 0.15]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mul;
      const a = ctx.createGain();
      a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(t + 1.2);
    }
  }

  lead(freq, t, dur, vol, type) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ctx.createGain();
    lg.gain.value = freq * 0.006;
    lfo.connect(lg).connect(o.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = type === 'sine' ? 6000 : 2200;
    const g = ctx.createGain();
    this.env(g, t, 0.02, vol, dur, Math.min(0.15, dur * 0.5));
    o.connect(f).connect(g);
    g.connect(this.out);
    g.connect(this.delay);
    g.connect(this.reverb);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.32);
  }

  snare(t) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    n.connect(f).connect(g);
    g.connect(this.out);
    g.connect(this.reverb);
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.2);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.12, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og).connect(this.out);
    o.start(t);
    o.stop(t + 0.12);
  }

  hat(t, vol, open = false) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7500;
    const g = ctx.createGain();
    const d = open ? 0.22 : 0.045;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(f).connect(g).connect(this.out);
    n.start(t, Math.random() * 1.5);
    n.stop(t + d + 0.02);
  }
}
