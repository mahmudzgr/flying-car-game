// Milimetrik Park — WebAudio ile üretilen sesler: motor, lastik, sürtme, park sensörü, efektler.
// Ses dosyası yok; her şey sentezlenir. İlk dokunuş/tuşla açılır (tarayıcı kuralı).

export function createAudio() {
  let ac = null, master = null, enabled = true;
  let eng = null, squeal = null, scrape = null, beeper = null, noiseBuf = null;
  let beepT = 0, beepOn = false;

  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function loopNoise() {
    const s = ac.createBufferSource();
    s.buffer = noise(); s.loop = true; s.start();
    return s;
  }

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = enabled ? 0.9 : 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ac.destination);

    // motor: testere + kare + düşük gürültü, alçak geçiren süzgeç
    const o1 = ac.createOscillator(); o1.type = 'sawtooth';
    const o2 = ac.createOscillator(); o2.type = 'square';
    const o3 = ac.createOscillator(); o3.type = 'triangle';
    const g1 = ac.createGain(); g1.gain.value = 0.5;
    const g2 = ac.createGain(); g2.gain.value = 0.22;
    const g3 = ac.createGain(); g3.gain.value = 0.35;
    const rum = loopNoise();
    const rumF = ac.createBiquadFilter(); rumF.type = 'lowpass'; rumF.frequency.value = 160;
    const rumG = ac.createGain(); rumG.gain.value = 0.25;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2; lp.frequency.value = 400;
    const out = ac.createGain(); out.gain.value = 0;
    o1.connect(g1).connect(lp); o2.connect(g2).connect(lp); o3.connect(g3).connect(lp);
    rum.connect(rumF).connect(rumG).connect(lp);
    lp.connect(out).connect(master);
    o1.start(); o2.start(); o3.start();
    eng = { o1, o2, o3, lp, out, rumG };

    // lastik cıyaklaması
    {
      const src = loopNoise();
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1050; bp.Q.value = 7;
      const g = ac.createGain(); g.gain.value = 0;
      src.connect(bp).connect(g).connect(master);
      squeal = { g, bp };
    }
    // sürtme
    {
      const src = loopNoise();
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.4;
      const g = ac.createGain(); g.gain.value = 0;
      src.connect(bp).connect(g).connect(master);
      scrape = { g, bp };
    }
    // park sensörü
    {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 2350;
      const g = ac.createGain(); g.gain.value = 0;
      o.connect(g).connect(master); o.start();
      beeper = { o, g };
    }
  }

  function env(g, t, a, peak, d) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) {
    if (!ac || !enabled) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const g = ac.createGain();
    o.connect(g).connect(master);
    env(g, t, 0.005, vol, dur);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function burst(dur, freq, q, vol, delay = 0, type = 'bandpass') {
    if (!ac || !enabled) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = noise();
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    s.connect(f).connect(g).connect(master);
    env(g, t, 0.004, vol, dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const api = {
    unlock() {
      if (!ac) init();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    setEnabled(on) {
      enabled = on;
      if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.05);
    },
    get enabled() { return enabled; },

    /**
     * Her kare. s: {active, rpm, throttle, load, slip, scrape, sensor (m | Infinity), sensorOn}
     */
    update(dt, s) {
      if (!ac || !eng) return;
      const t = ac.currentTime;
      const on = enabled && s.active;
      const f = (s.rpm / 60) * 2;                     // 4 silindir: devir başına 2 ateşleme
      eng.o1.frequency.setTargetAtTime(f, t, 0.03);
      eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
      eng.o3.frequency.setTargetAtTime(f * 2.01, t, 0.03);
      eng.lp.frequency.setTargetAtTime(220 + s.throttle * 900 + s.rpm * 0.12, t, 0.05);
      eng.out.gain.setTargetAtTime(on ? 0.075 + s.throttle * 0.06 + Math.min(0.04, s.rpm / 100000) : 0, t, 0.06);
      squeal.g.gain.setTargetAtTime(on ? Math.min(0.16, Math.max(0, s.slip - 1.2) * 0.05) : 0, t, 0.04);
      squeal.bp.frequency.setTargetAtTime(900 + Math.min(600, s.slip * 60), t, 0.05);
      scrape.g.gain.setTargetAtTime(on ? Math.min(0.3, s.scrape * 0.25) * (0.7 + Math.random() * 0.6) : 0, t, 0.02);
      // sensör bip'i
      const d = s.sensor;
      if (!on || !s.sensorOn || !(d < 1.5)) {
        if (beepOn) { beeper.g.gain.setTargetAtTime(0, t, 0.01); beepOn = false; }
        beepT = 0;
        return;
      }
      beeper.o.frequency.setValueAtTime(s.sensorSide === 'front' ? 2050 : 2350, t);
      if (d < 0.28) {
        if (!beepOn) { beeper.g.gain.setTargetAtTime(0.09, t, 0.01); beepOn = true; }
        return;
      }
      if (beepOn) { beeper.g.gain.setTargetAtTime(0, t, 0.01); beepOn = false; }
      beepT -= dt;
      if (beepT <= 0) {
        const interval = 0.09 + ((d - 0.28) / 1.22) * 0.62;
        beepT = interval;
        env(beeper.g, t, 0.004, 0.09, 0.07);
      }
    },

    sfx(name, v = 0) {
      if (!ac || !enabled) return;
      switch (name) {
        case 'hit': {
          const k = Math.min(1, v / 15);
          tone(110, 0.25 + k * 0.2, 'sine', 0.35 + k * 0.3, 0.4);
          burst(0.18 + k * 0.25, 900 + k * 1400, 0.8, 0.25 + k * 0.4);
          if (v > 5) burst(0.35, 3200, 2, 0.15 * k, 0.04);
          break;
        }
        case 'touch': burst(0.12, 2600, 1.5, 0.12); break;
        case 'curb': tone(75, 0.16, 'sine', 0.3 + Math.min(0.3, v / 20), 0.6); burst(0.08, 400, 1, 0.12); break;
        case 'stopper': tone(90, 0.12, 'sine', 0.22, 0.7); break;
        case 'cone': tone(420, 0.1, 'triangle', 0.15, 0.6); burst(0.12, 1200, 1, 0.1); break;
        case 'gear': burst(0.03, 3000, 2, 0.18); tone(140, 0.08, 'square', 0.06, 0.6, 0.02); break;
        case 'deny': tone(220, 0.12, 'square', 0.08, 0.8); tone(180, 0.14, 'square', 0.08, 0.8, 0.12); break;
        case 'click': burst(0.02, 4000, 3, 0.12); break;
        case 'park': tone(523, 0.12, 'triangle', 0.18); tone(659, 0.12, 'triangle', 0.18, 0, 0.1); tone(784, 0.28, 'triangle', 0.2, 0, 0.2); break;
        case 'star': tone(880 + v * 220, 0.18, 'triangle', 0.16); tone(1320 + v * 330, 0.22, 'sine', 0.08, 0, 0.05); break;
        case 'perfect': [523, 659, 784, 1046, 1318].forEach((fr, i) => tone(fr, 0.22, 'triangle', 0.14, 0, i * 0.07)); break;
        case 'fail': tone(330, 0.25, 'sawtooth', 0.12, 0.6); tone(220, 0.4, 'sawtooth', 0.12, 0.5, 0.2); break;
        case 'free': tone(659, 0.1, 'triangle', 0.15); tone(988, 0.18, 'triangle', 0.15, 0, 0.09); break;
        default: break;
      }
    },
  };
  return api;
}
