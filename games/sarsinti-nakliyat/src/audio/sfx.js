// Olay efektleri (TASARIM §14 olay listesinin tamamı) + arayüz sesleri. Hepsi sentez; ses sayısı sınırlı (voice limiting).
import { clamp, rnd, pick, cents } from './util.js';

const PENTA = [0, 200, 400, 700, 900];
/** Neşeli pentatonik merdiven: n=0 → base, n=5 → bir oktav üst. */
const lad = (n, base = 523.25) => cents(base, PENTA[((n % 5) + 5) % 5] + 1200 * Math.floor(n / 5));

const TEX = { // yüzey dokusu (iniş/temas): [gürültü, merkez Hz, Q, kazanç]
  asphalt: ['white', 1800, 1.2, 1], dirt: ['pink', 700, 0.8, 1], grass: ['pink', 480, 0.6, 0.8], gravel: ['crackle', 2400, 0.8, 1.6],
  sand: ['pink', 900, 0.5, 0.8], mud: ['brown', 320, 1, 1.4], wet: ['white', 1200, 0.8, 0.9], snow: ['pink', 1600, 0.5, 0.8], ice: ['white', 3600, 2, 0.9], water: ['white', 900, 0.6, 1.2],
};
const PRI = { crash: 3, land: 3, bodyHit: 3, levelEnd: 3, starEarned: 3, comboBank: 3, bridgeBreak: 3, cargoLost: 3, driverEject: 3, cargoDelivered: 2, cargoHit: 2, cargoDamage: 2, flip: 2, hazardTrigger: 2, 'ui:click': 3, 'ui:back': 3, 'ui:star': 3, purchase: 3, upgrade: 3 };
const COOL = { cargoSlide: 0.1, coin: 0.03, cargoHit: 0.045, bodyHit: 0.07, land: 0.1, suspension: 0.09, wheelContact: 0.09, surfaceChange: 0.15, bridgeStress: 0.45, nearMiss: 0.25, throttle: 0.12, brake: 0.15, airborne: 0.2, flip: 0.15, toast: 0.3, 'ui:hover': 0.04 };

export function createSfx(env, hooks) {
  const { ctx } = env;
  const S = env.synth, tone = S.tone, noise = S.noise, bell = S.bell, pluck = S.pluck;
  const max = env.low ? 11 : 18;
  let slots = [];            // {end, pri}
  const last = {};           // ad → son çalma zamanı
  const cnt = hooks.counts;  // hata ayıklama sayaçları
  const st = { coinChain: 0, coinT: -9, delivered: 0, deliveredT: -9, combo: 0, mult: 1, surface: () => 'dirt', speed: () => 0, rpm: () => 0 };
  const tex = () => TEX[st.surface()] || TEX.dirt;

  function reserve(name, dur) {
    const t = ctx.currentTime, pri = PRI[name] ?? 1;
    if (last[name] != null && t - last[name] < (COOL[name] ?? 0.02)) return false;
    slots = slots.filter((s) => s.end > t);
    if (slots.length >= max && pri < 3) return false;
    if (slots.length >= max * 2) return false;
    // dolmaya yakınken düşük öncelikliler (<2) elenir
    if (slots.length >= max * 0.75 && pri < 2 && Math.random() < 0.6) return false;
    last[name] = t; slots.push({ end: t + dur, pri });
    cnt[name] = (cnt[name] || 0) + 1;
    return true;
  }

  // ---------- yardımcı sesler ----------
  const thump = (g = 0.5, f = 130, f2 = 45, dur = 0.2, t = 0) => tone({ type: 'sine', f, f2, dur, g, t, a: 0.002 });
  const surfTap = (g, dur = 0.12, t = 0, rate = 1) => { const [src, f, q, k] = tex(); noise({ src, f, q, dur, g: g * k, t, rate, a: 0.002 }); };
  const ding = (f, g = 0.12, dur = 0.7, t = 0, rev = 0.25) => bell({ f, g, dur, t, rev, parts: [[1, 1, 1], [3, 0.3, 0.5], [5.2, 0.12, 0.3]] });
  const sparkle = (t = 0, g = 0.06, n = 4, base = 2400) => { for (let i = 0; i < n; i++) tone({ type: 'sine', f: base * (1 + i * 0.32) * rnd(0.97, 1.03), dur: 0.18, g, t: t + i * 0.045, a: 0.002, rev: 0.3 }); };
  const darbuka = (t = 0, g = 0.2, kind = 'D') => {
    if (kind === 'D') tone({ f: 190, f2: 78, dur: 0.17, g, t, a: 0.002 });
    else { tone({ f: kind === 'T' ? 480 : 700, f2: kind === 'T' ? 420 : 640, dur: 0.07, g: g * 0.7, t, a: 0.001 }); noise({ f: kind === 'T' ? 2800 : 4000, q: 1.5, dur: 0.05, g: g * 0.6, t, a: 0.001 }); }
  };
  const slide = (f, f2, dur, g = 0.12, t = 0, type = 'triangle') => tone({ type, f, f2, dur, g, t, a: 0.01, lp: 2400, rev: 0.15 });
  const splash = (g = 0.3, t = 0) => { noise({ src: 'white', f: 1400, f2: 500, q: 0.6, dur: 0.5, g, t, a: 0.004 }); noise({ src: 'pink', ft: 'lowpass', f: 700, dur: 0.4, g: g * 0.8, t, a: 0.01 }); for (let i = 0; i < 4; i++) tone({ f: rnd(500, 1100), f2: rnd(900, 1800), dur: 0.07, g: g * 0.25, t: t + 0.08 + i * rnd(0.04, 0.09), a: 0.004 }); };
  const creak = (g = 0.1, f = 90, dur = 0.4, t = 0) => { tone({ type: 'sawtooth', f, f2: f * rnd(1.3, 1.7), dur, g, t, lp: 600, q: 4, a: 0.05, sweep: 0.9 }); noise({ f: 800, f2: 1400, q: 7, dur, g: g * 0.5, t, a: 0.05 }); };
  const woodSnap = (t, g = 0.25) => { noise({ f: rnd(1600, 3200), q: 2, dur: 0.04, g, t, a: 0.001 }); tone({ type: 'triangle', f: rnd(180, 320), f2: 90, dur: 0.07, g: g * 0.7, t, a: 0.001 }); };
  const clank = (g = 0.15, f = 260, t = 0) => { bell({ f, g, dur: 0.5, t, parts: [[1, 1, 1], [2.4, 0.7, 0.6], [4.3, 0.4, 0.4], [6.9, 0.2, 0.25]] }); noise({ f: 3000, q: 1, dur: 0.03, g: g * 0.6, t, a: 0.001 }); };

  // ---------- kargo ----------
  function cargoHit(type, speed, damage) {
    const sc = clamp(speed / 9, 0.12, 1), g = 0.24 * sc;
    switch (type) {
      case 'watermelon': tone({ f: 190, f2: 70, dur: 0.16, g: g * 1.1, a: 0.002, lp: 500 }); noise({ src: 'brown', f: 320, ft: 'lowpass', dur: 0.12, g: g * 0.9 }); break;
      case 'eggs': tone({ f: rnd(1000, 1300), f2: 700, dur: 0.04, g: g * 0.5, a: 0.001 }); if (damage > 0 || sc > 0.5) for (let i = 0; i < 2; i++) noise({ ft: 'highpass', f: 4000, dur: 0.012, g: g * 0.5, t: i * rnd(0.02, 0.05), a: 0.001 }); break;
      case 'milk': bell({ f: rnd(300, 420), g: g * 0.55, dur: 0.6 + sc * 0.5, parts: [[1, 1, 1], [2.3, 0.6, 0.7], [4.1, 0.4, 0.5], [6.7, 0.2, 0.3]], rev: 0.15 }); thump(g * 0.4, 110, 60, 0.1); noise({ src: 'brown', f: 500, f2: 250, ft: 'lowpass', dur: 0.25, g: g * 0.4, t: 0.03 }); break;
      case 'piano': pianoCluster(0.1 + sc * 0.22, sc > 0.55 ? 4 : 2); thump(g * 0.9, 90, 40, 0.18); break;
      case 'bale': noise({ src: 'pink', ft: 'lowpass', f: 300, dur: 0.14, g: g * 1.2 }); thump(g * 0.6, 90, 55, 0.12); break;
      default: tone({ f: rnd(190, 230), f2: 105, dur: 0.1, g: g * 1.1, a: 0.001 }); noise({ f: 1300, q: 2, dur: 0.05, g: g * 0.8, a: 0.001 }); tone({ type: 'triangle', f: rnd(320, 380), f2: 290, dur: 0.07, g: g * 0.35, a: 0.001, t: 0.01 });
    }
  }
  function pianoCluster(g, n) {
    const root = pick([65.4, 73.4, 82.4, 98]), ratios = [1, 1.122, 1.335, 1.498, 1.682, 1.888, 2.0, 2.378].sort(() => Math.random() - 0.5).slice(0, n);
    ratios.forEach((r, i) => { const f = root * r * 2; tone({ type: 'triangle', f, dur: 1.1, g: g * 0.6, t: i * 0.012, a: 0.002, lp: 3000, lp2: 600, rev: 0.25 }); tone({ type: 'sine', f: f * 2.0, dur: 0.6, g: g * 0.25, t: i * 0.012, a: 0.002 }); });
    noise({ f: 900, q: 1, dur: 0.08, g: g * 0.8 });
  }
  function cargoBreak(type) {
    switch (type) {
      case 'watermelon': noise({ src: 'pink', f: 1300, f2: 300, q: 0.7, dur: 0.3, g: 0.34, a: 0.002 }); thump(0.4, 150, 45, 0.25); for (let i = 0; i < 4; i++) noise({ f: rnd(600, 1000), q: 2, dur: 0.05, g: 0.1, t: 0.08 + i * rnd(0.04, 0.08) }); break;
      case 'eggs': for (let i = 0; i < 4; i++) noise({ ft: 'highpass', f: rnd(3000, 5000), dur: 0.015, g: 0.22, t: i * rnd(0.01, 0.04), a: 0.001 }); noise({ f: 500, f2: 250, dur: 0.14, g: 0.12, t: 0.05 }); break;
      case 'milk': clank(0.2, 220); noise({ src: 'brown', ft: 'lowpass', f: 600, f2: 200, dur: 0.5, g: 0.25, t: 0.05 }); for (let i = 0; i < 3; i++) tone({ f: rnd(200, 300), f2: rnd(350, 500), dur: 0.08, g: 0.08, t: 0.2 + i * 0.1 }); break;
      case 'piano': pianoCluster(0.32, 6); thump(0.5, 100, 40, 0.3); clank(0.15, 160, 0.05); break;
      case 'bale': noise({ src: 'pink', ft: 'lowpass', f: 400, dur: 0.3, g: 0.3 }); thump(0.3, 80, 45, 0.2); break;
      default: for (let i = 0; i < 5; i++) woodSnap(i * rnd(0.015, 0.04), 0.2); thump(0.35, 120, 50, 0.2);
    }
  }

  // ---------- melodiler ----------
  function winJingle() {
    const seq = [0, 2, 4, 7, 9], t = (i) => i * 0.11;
    seq.forEach((d, i) => { pluck({ f: lad(d, 392), dur: 0.5, g: 0.2, t: t(i), bright: 3800, rev: 0.25, type: 'triangle' }); });
    ding(lad(10, 392), 0.2, 1.4, 0.58, 0.4); ding(lad(7, 392), 0.12, 1.4, 0.58, 0.4); ding(lad(14, 392), 0.08, 1.2, 0.62, 0.4);
    darbuka(0, 0.18, 'D'); darbuka(0.22, 0.12, 'T'); darbuka(0.44, 0.15, 'D'); sparkle(0.6, 0.05, 5);
  }
  function failJingle(t = 0) {
    [392, 349.2, 311.1].forEach((f, i) => tone({ type: 'sawtooth', f, f2: f * 0.97, dur: 0.3, g: 0.09, t: t + i * 0.3, lp: 900, lp2: 500, a: 0.02, rev: 0.2 }));
    tone({ type: 'sawtooth', f: 261.6, f2: 196, dur: 0.9, g: 0.1, t: t + 0.9, lp: 800, lp2: 300, a: 0.03, sweep: 1, rev: 0.25 });
  }
  // Uzun Yol: koşu bitişi (ölüm değil "mola"): teslim sayısına göre uzayan yumuşak inen-çıkan motif
  function endJingle(d) {
    const k = clamp(d / 8); [4, 2, 0].forEach((deg, i) => pluck({ f: lad(deg, 330), dur: 0.5, g: 0.16, t: 0.3 + i * 0.16, rev: 0.3, type: 'triangle', bright: 2600 }));
    ding(lad(7, 330), 0.12 + 0.1 * k, 1.4, 0.85, 0.4); if (d >= 3) sparkle(0.9, 0.04, 3 + Math.floor(k * 4));
  }
  function record(t) { // rekor: parlak yükselen arpej + alkış benzeri kısa kıvılcım + darbuka
    [0, 2, 4, 7, 9, 12].forEach((d, i) => { pluck({ f: lad(d, 523.25), dur: 0.45, g: 0.17, t: t + i * 0.085, bright: 4200, rev: 0.3, type: 'triangle' }); });
    ding(lad(14, 523.25), 0.2, 1.8, t + 0.55, 0.45); ding(lad(11, 523.25), 0.12, 1.8, t + 0.55, 0.45); sparkle(t + 0.5, 0.05, 8, 3000);
    for (let i = 0; i < 12; i++) noise({ ft: 'highpass', f: 3500, dur: 0.03, g: 0.05, t: t + 0.55 + i * rnd(0.03, 0.07), a: 0.001 });
    darbuka(t, 0.18, 'D'); darbuka(t + 0.17, 0.12, 'T'); darbuka(t + 0.34, 0.16, 'D'); hooks.duck(0.3, 2.2);
  }
  function cash(g = 0.15, t = 0) { noise({ ft: 'highpass', f: 5000, dur: 0.03, g: g * 0.7, t, a: 0.001 }); ding(1568, g, 0.5, t + 0.04, 0.2); ding(2093, g * 0.8, 0.8, t + 0.12, 0.25); }

  // ---------- olay çözücü ----------
  function handle(e) {
    const n = e.name;
    switch (n) {
      case 'ui:click': if (reserve(n, 0.1)) { tone({ type: 'triangle', f: 760, f2: 600, dur: 0.07, g: 0.14, a: 0.002, pm: false, dest: env.out.ui }); tone({ type: 'sine', f: 1520, dur: 0.05, g: 0.04, a: 0.001, pm: false, dest: env.out.ui }); } break;
      case 'ui:hover': if (reserve(n, 0.05)) tone({ type: 'sine', f: 1200, dur: 0.03, g: 0.035, a: 0.001, pm: false, dest: env.out.ui }); break;
      case 'ui:back': if (reserve(n, 0.15)) { tone({ type: 'triangle', f: 560, f2: 420, dur: 0.08, g: 0.13, a: 0.002, pm: false, dest: env.out.ui }); tone({ type: 'triangle', f: 400, f2: 300, dur: 0.1, g: 0.1, a: 0.002, t: 0.07, pm: false, dest: env.out.ui }); } break;
      case 'ui:star': if (reserve(n, 0.8)) { const i = (e.index || 1) - 1; ding(lad(i * 2 + 5, 523.25), 0.18, 1, 0, 0.3); sparkle(0.05, 0.04, 3 + i, 3000); } break;
      case 'toast': if (reserve(n, 0.4)) { ding(1318.5, 0.07, 0.4, 0, 0.2); ding(e.icon === 'warn' ? 987.8 : 1760, 0.06, 0.4, 0.09, 0.2); } break;
      case 'purchase': if (reserve(n, 0.9)) { cash(0.15); for (let i = 0; i < 3; i++) ding(lad(i * 2 + 10, 392), 0.08, 0.4, 0.2 + i * 0.07); } break;
      case 'upgrade': if (reserve(n, 1)) { [0, 2, 4, 7].forEach((d, i) => pluck({ f: lad(d, 330), dur: 0.35, g: 0.17, t: i * 0.07, bright: 3500, rev: 0.25, type: 'triangle' })); ding(lad(9, 330), 0.15, 1, 0.3, 0.35); sparkle(0.3, 0.05, 5); } break;

      case 'levelStart': if (reserve(n, 1.2)) { ignition(); pluck({ f: 392, dur: 0.5, g: 0.14, t: 0.35, rev: 0.25, type: 'triangle', bright: 3000 }); pluck({ f: 587.3, dur: 0.7, g: 0.15, t: 0.5, rev: 0.3, type: 'triangle', bright: 3000 }); } break;
      case 'levelEnd':
        if (reserve(n, 2.5)) { hooks.duck(0.25, 2.6); if (e.result === 'win') winJingle(); else if (e.result === 'end') { endJingle(e.deliveries || 0); if (e.newBest) record(1.6); } else failJingle(0.35); } break;
      case 'newRecord': if (reserve(n, 2)) record(0); break;
      case 'starEarned': if (reserve(n, 1.2)) { const i = clamp((e.index || 1) - 1, 0, 2), f = lad(i * 2 + 7, 523.25); ding(f, 0.2, 1.1, 0, 0.35); ding(f * 2, 0.08, 0.9, 0.02, 0.35); sparkle(0.02, 0.05, 4 + i * 2, 3200); if (i === 2) { ding(lad(2, 523.25), 0.12, 1.5, 0.05, 0.4); ding(lad(4, 523.25), 0.1, 1.5, 0.08, 0.4); darbuka(0, 0.18, 'D'); } } break;
      case 'delivery': if (reserve(n, 2.2)) {
        const pay = e.pay || 0, k = clamp(Math.log10(pay + 1) / 3), coins = Math.min(9, 2 + Math.floor(k * 8));
        cash(0.14 + 0.06 * k);
        for (let i = 0; i < coins; i++) { const f = lad(i + 8, 392); tone({ type: 'square', f, dur: 0.05, g: 0.03, t: 0.15 + i * 0.065, a: 0.002, lp: 5000 }); tone({ type: 'square', f: f * 1.5, dur: 0.2, g: 0.028, t: 0.2 + i * 0.065, a: 0.002, lp: 5000, rev: 0.15 }); }
        [0, 2, 4, 7].slice(0, 2 + Math.round(k * 2)).forEach((d, i) => pluck({ f: lad(d, 392), dur: 0.45, g: 0.15, t: i * 0.09, rev: 0.3, type: 'triangle', bright: 3500 }));
        ding(lad(9 + Math.round(k * 3), 392), 0.14 + 0.08 * k, 1.3, 0.2 + coins * 0.065, 0.4);
        if (e.intact !== false) { sparkle(0.25, 0.045, 4 + Math.round(k * 4)); darbuka(0, 0.14, 'D'); darbuka(0.2, 0.1, 'T'); }
        hooks.duck(0.55, 1.2);
      } break;
      case 'biomeChange': if (reserve(n, 1.2)) { noise({ src: 'pink', f: 300, f2: 2200, q: 0.8, dur: 0.9, g: 0.06, a: 0.4 }); ding(lad(7, 392), 0.07, 1.2, 0.5, 0.5); ding(lad(9, 392), 0.06, 1.2, 0.6, 0.5); } break;
      case 'cargoSlide': if (reserve(n, 0.25)) { // sürtünerek kayma: tahta tabanda kısa sürtme (hız ve türe göre)
        const sp = clamp((e.speed ?? 3) / 8, 0.15, 1), ty = e.type, g = 0.07 + 0.1 * sp;
        if (ty === 'watermelon' || ty === 'bale') noise({ src: 'pink', ft: 'lowpass', f: 500, f2: 300, dur: 0.2, g: g * 0.8, a: 0.04 });
        else if (ty === 'milk') { noise({ f: 1500, f2: 900, q: 3, dur: 0.2, g: g * 0.6, a: 0.03 }); tone({ type: 'triangle', f: 280, f2: 250, dur: 0.15, g: 0.02, a: 0.03 }); }
        else if (ty === 'eggs') noise({ ft: 'highpass', f: 3000, dur: 0.12, g: g * 0.4, a: 0.02 });
        else { noise({ src: 'brown', f: rnd(450, 650), f2: rnd(300, 500), q: 1.5, dur: 0.2, g: g * 1.2, a: 0.03 }); noise({ ft: 'highpass', f: 2500, dur: 0.08, g: g * 0.3, t: rnd(0, 0.1), a: 0.01 }); }
      } break;
      case 'checkpoint': if (reserve(n, 0.8)) { ding(1046.5, 0.12, 0.6, 0, 0.3); ding(1568, 0.12, 0.9, 0.12, 0.3); } break;

      case 'throttle': if (!e.on && st.rpm() > 0.55 && Math.random() < 0.3 && reserve(n, 0.1)) { noise({ f: 450, q: 1, dur: 0.05, g: 0.09, a: 0.001 }); tone({ f: 120, f2: 60, dur: 0.07, g: 0.1, a: 0.001 }); } break;
      case 'brake': if (e.on && st.speed() > 5 && reserve(n, 0.25)) { noise({ ft: 'highpass', f: 3500, dur: 0.22, g: 0.03, a: 0.01 }); if (st.surface() === 'asphalt') tone({ f: 2200, f2: 1900, dur: 0.16, g: 0.012, a: 0.02, type: 'sine' }); } break;
      case 'wheelContact': if (e.started && st.speed() > 1.5 && reserve(n, 0.1)) { const tx = TEX[e.surface] || tex(); if (e.surface === 'water') splash(0.12); else noise({ src: tx[0], f: tx[1], q: tx[2], dur: 0.07, g: 0.09 * tx[3] }); } break;
      case 'surfaceChange': if (reserve(n, 0.2)) { if (e.to === 'water') splash(0.25); else { const tx = TEX[e.to] || TEX.dirt; noise({ src: tx[0], f: tx[1] * 0.6, f2: tx[1] * 1.3, q: 0.8, dur: 0.2, g: 0.14 * tx[3], a: 0.03 }); } } break;
      case 'suspension': if (e.bottomOut && reserve(n, 0.3)) { const g = 0.08 + 0.08 * clamp(e.compression ?? 1); thump(g * 1.4, 100, 50, 0.1); clank(g * 0.8, 210); noise({ f: 700, q: 1.5, dur: 0.05, g: g * 0.6 }); } break;
      case 'airborne': if (reserve(n, 0.3)) noise({ src: 'pink', f: 300, f2: 1100, q: 0.9, dur: 0.3, g: 0.12, a: 0.1 }); break;
      case 'land': {
        const v = e.impactSpeed || 0, lv = v < 2.5 ? 0 : v < 6 ? 1 : 2, g = clamp(v / 11, 0.15, 1);
        if (reserve(n, 0.7)) {
          thump(0.55 * g, 135, 42, 0.18 + 0.1 * lv); surfTap(0.35 * g, 0.12 + 0.08 * lv);
          if (lv >= 1) { creak(0.06 * g, 150, 0.25, 0.03); tone({ type: 'sine', f: 170, f2: 120, dur: 0.22, g: 0.08 * g, t: 0.06, a: 0.01 }); }
          if (lv === 2) { clank(0.14 * g, 240, 0.01); hooks.duck(0.6, 0.35); noise({ src: 'pink', ft: 'lowpass', f: 900, dur: 0.4, g: 0.12 * g, t: 0.05, a: 0.02 }); }
          if (e.clean === false) clank(0.12, 190, 0.02);
          else if (lv >= 1) noise({ ft: 'highpass', f: 4500, dur: 0.22, g: 0.025, t: 0.02, a: 0.02 });
          hooks.engineDip(g);
        } break;
      }
      case 'flip': if (reserve(n, 0.5)) { const c = clamp(e.count || 1, 1, 6); noise({ src: 'pink', f: 350, f2: 2400, q: 1.5, dur: 0.28, g: 0.12, a: 0.03 }); tone({ type: 'sawtooth', f: 180, f2: 800 * (1 + c * 0.06), dur: 0.26, g: 0.045, lp: 1800, a: 0.02 }); pluck({ f: lad(c + 2, 523.25), dur: 0.35, g: 0.12, t: 0.12, rev: 0.2, type: 'triangle', bright: 3500 }); if (c >= 2) sparkle(0.2, 0.04, 3); } break;
      case 'wheelie': if (reserve('wheelie', 0.4)) { const d = clamp(e.duration || 1, 1, 4); pluck({ f: lad(3, 392), dur: 0.3, g: 0.13, rev: 0.2, type: 'triangle' }); pluck({ f: lad(5 + Math.floor(d), 392), dur: 0.4, g: 0.13, t: 0.09, rev: 0.25, type: 'triangle' }); } break;
      case 'bodyHit': if (reserve(n, 0.4)) {
        const g = clamp((e.speed || 3) / 10, 0.15, 1);
        if (e.part === 'roof') { bell({ f: rnd(150, 190), g: 0.2 * g, dur: 0.5, parts: [[1, 1, 1], [2.1, 0.6, 0.6], [3.5, 0.35, 0.4]] }); thump(0.4 * g, 120, 50, 0.12); noise({ f: 1800, q: 1, dur: 0.05, g: 0.15 * g }); }
        else if (e.part === 'cab') { thump(0.45 * g, 140, 55, 0.14); noise({ f: 1200, q: 0.9, dur: 0.09, g: 0.22 * g }); tone({ type: 'triangle', f: 260, f2: 200, dur: 0.1, g: 0.1 * g }); }
        else { clank(0.18 * g, rnd(190, 250)); thump(0.4 * g, 110, 45, 0.14); noise({ f: 2200, q: 0.8, dur: 0.1, g: 0.14 * g, t: 0.01 }); }
        hooks.duck(0.7, 0.2); hooks.engineDip(g * 0.6);
      } break;
      case 'cargoHit': if (reserve(n, 0.3)) { cargoHit(e.type, e.speed || 2, e.damage || 0); if (e.wall || (e.surface === 'wall' && (e.speed || 0) > 3)) { thump(0.3 * clamp((e.speed || 3) / 9), 105, 50, 0.14); woodSnap(0.01, 0.1); } } break;
      case 'cargoDamage': if (reserve(n, 0.4)) { if ((e.hpLeft ?? 1) <= 0) { if (!last.__brk || ctx.currentTime - last.__brk > 0.25) { last.__brk = ctx.currentTime; cargoBreak(e.type); } } else if (e.type === 'eggs') noise({ ft: 'highpass', f: 4200, dur: 0.015, g: 0.14 }); else if (e.type === 'crate') woodSnap(0, 0.12); else tone({ f: 600, f2: 300, dur: 0.05, g: 0.05 }); } break;
      case 'cargoLost': if (reserve(n, 0.8)) {
        if (e.reason === 'broke') { if (!last.__brk || ctx.currentTime - last.__brk > 0.25) { last.__brk = ctx.currentTime; cargoBreak(e.type); } }
        else if (e.reason === 'water') { splash(0.28); tone({ f: 300, f2: 150, dur: 0.15, g: 0.1, t: 0.2 }); }
        else if (e.reason === 'left') { tone({ type: 'sine', f: 500, f2: 900, dur: 0.07, g: 0.08 }); }
        else { slide(760, 240, 0.5, 0.1, 0, 'sine'); noise({ src: 'pink', f: 800, f2: 300, q: 0.7, dur: 0.3, g: 0.07, t: 0.05 }); }
        hooks.duck(0.7, 0.4);
      } break;
      case 'cargoDelivered': if (reserve(n, 0.8)) {
        const now = ctx.currentTime; st.delivered = now - st.deliveredT < 1.3 ? st.delivered + 1 : 0; st.deliveredT = now;
        const k = Math.min(st.delivered, 6); ding(lad(k + 7, 392), 0.15, 0.8, 0, 0.3); ding(lad(k + 7, 392) * 1.5, 0.07, 0.8, 0.07, 0.3); noise({ ft: 'highpass', f: 5000, dur: 0.03, g: 0.05 });
      } break;
      case 'coin': if (reserve(n, 0.4)) {
        const now = ctx.currentTime; st.coinChain = now - st.coinT < 0.7 ? Math.min(st.coinChain + 1, 9) : 0; st.coinT = now;
        const f = lad(st.coinChain + 10, 392); tone({ type: 'square', f, dur: 0.06, g: 0.035, a: 0.002, lp: 5000 }); tone({ type: 'square', f: f * 1.5, dur: 0.22, g: 0.03, t: 0.055, a: 0.002, lp: 5000, rev: 0.15 }); ding(f * 2, 0.07, 0.35, 0.04, 0.2);
      } break;
      case 'comboChange': {
        const c = e.count || 0, m = e.multiplier || 1;
        if (c > st.combo && reserve(n, 0.4)) { const k = Math.min(c, 12); pluck({ f: lad(k + 3, 392), dur: 0.35, g: 0.13, bright: 3600, rev: 0.25, type: 'triangle' }); ding(lad(k + 8, 392), 0.07, 0.5, 0.02, 0.3); if (m > st.mult) sparkle(0.05, 0.05, 4, 2800 + m * 200); }
        st.combo = c; st.mult = m;
      } break;
      case 'comboBank': if (reserve(n, 1.4)) { const m = clamp(e.multiplier || 1, 1, 8); cash(0.13 + m * 0.01); [0, 2, 4].forEach((d, i) => ding(lad(d + Math.min(m, 5), 392), 0.1, 1.1, 0.08 + i * 0.05, 0.35)); thump(0.2, 100, 60, 0.2); st.combo = 0; st.mult = 1; } break;
      case 'comboBurn': if (reserve(n, 0.8)) { noise({ src: 'pink', ft: 'lowpass', f: 2400, f2: 300, dur: 0.5, g: 0.14, a: 0.01 }); noise({ src: 'crackle', ft: 'highpass', f: 1500, dur: 0.5, g: 0.14, rate: 2 }); tone({ type: 'sawtooth', f: 420, f2: 90, dur: 0.4, g: 0.07, lp: 800, a: 0.01 }); st.combo = 0; st.mult = 1; } break;
      case 'driverEject': if (reserve(n, 0.8)) { const g = clamp((e.headSpeed || 6) / 12, 0.4, 1); noise({ f: 600, q: 0.8, dur: 0.07, g: 0.25 * g, a: 0.001 }); tone({ f: 330, f2: 120, dur: 0.1, g: 0.3 * g, a: 0.001 }); tone({ type: 'sine', f: 260, f2: 620, dur: 0.22, g: 0.1, t: 0.07, a: 0.01, rev: 0.15 }); tone({ type: 'sine', f: 620, f2: 380, dur: 0.25, g: 0.09, t: 0.28, a: 0.01 }); hooks.duck(0.5, 0.5); } break;
      case 'crash': if (reserve(n, 1.2)) {
        if (e.reason === 'headHit') { tone({ f: 230, f2: 120, dur: 0.12, g: 0.25, a: 0.001 }); noise({ f: 900, q: 1.5, dur: 0.06, g: 0.2 }); }
        else if (e.reason === 'flipped') { clank(0.2, 200); thump(0.5, 120, 45, 0.25); noise({ src: 'pink', ft: 'lowpass', f: 1500, dur: 0.35, g: 0.15, a: 0.01 }); }
        else if (e.reason === 'fell') { slide(900, 120, 1.1, 0.12, 0, 'sine'); noise({ src: 'pink', f: 900, f2: 200, dur: 0.9, g: 0.05, a: 0.1 }); thump(0.4, 70, 35, 0.4, 1.1); }
        else { thump(0.35, 100, 50, 0.2); }
        hooks.duck(0.45, 0.8);
      } break;
      case 'slowmo': hooks.slowmo(e.scale ?? 0.4, e.duration ?? 1); if (reserve(n, 0.6)) { tone({ type: 'sawtooth', f: 700, f2: 90, dur: 0.5, g: 0.06, lp: 1600, lp2: 300, a: 0.01, pm: false, sweep: 1 }); noise({ src: 'pink', f: 1800, f2: 200, q: 0.6, dur: 0.5, g: 0.1, a: 0.01, pm: false }); thump(0.25, 80, 40, 0.3); } break;
      case 'bridgeStress': if (reserve(n, 0.5)) { const s = clamp(e.stress ?? 0.5); creak(0.07 + 0.1 * s, 80 + s * 70, 0.35 + s * 0.2); if (s > 0.7) woodSnap(0.1, 0.1); } break;
      case 'bridgeBreak': if (reserve(n, 1.8)) { for (let i = 0; i < 7; i++) woodSnap(i * rnd(0.03, 0.09), 0.2); pluck({ f: 98, dur: 1.2, g: 0.2, type: 'triangle', strings: [0], bright: 900, rev: 0.2 }); noise({ src: 'brown', ft: 'lowpass', f: 500, dur: 1, g: 0.3, a: 0.05, t: 0.1 }); thump(0.4, 90, 38, 0.4, 0.3); hooks.duck(0.5, 1); } break;
      case 'seesaw': if (reserve('bridgeStress', 0.5)) { const w = clamp(Math.abs(e.angVel ?? 1) / 2); creak(0.04 + 0.08 * w, 110 + 70 * w, 0.3); if (w > 0.6) thump(0.15, 120, 70, 0.1, 0.2); } break;
      case 'hazardTrigger': if (reserve(n, 1.8)) {
        if (e.type === 'rock') { noise({ src: 'brown', ft: 'lowpass', f: 500, f2: 250, dur: 1.6, g: 0.4, a: 0.25 }); for (let i = 0; i < 6; i++) thump(0.18, rnd(80, 120), 45, 0.12, 0.15 + i * rnd(0.12, 0.2)); noise({ f: 2000, q: 1, dur: 0.05, g: 0.2 }); }
        else if (e.type === 'snowball') { noise({ src: 'pink', f: 300, f2: 800, q: 0.5, dur: 1.5, g: 0.22, a: 0.4 }); noise({ src: 'brown', ft: 'lowpass', f: 300, dur: 1.5, g: 0.3, a: 0.3 }); }
        else for (let i = 0; i < 6; i++) { const t = i * rnd(0.1, 0.2); tone({ f: rnd(120, 180), f2: 95, dur: 0.12, g: 0.16, t, a: 0.002 }); noise({ f: rnd(400, 700), q: 1.5, dur: 0.06, g: 0.12, t }); }
        hooks.duck(0.7, 0.8);
      } break;
      case 'nearMiss': if (reserve(n, 0.4)) { const d = clamp(1 - (e.distance ?? 1) / 3, 0.3, 1); noise({ src: 'pink', f: 400, f2: 2600, q: 1.2, dur: 0.14, g: 0.4 * d, a: 0.05 }); noise({ src: 'pink', f: 2600, f2: 500, q: 1.2, dur: 0.2, g: 0.32 * d, a: 0.005, t: 0.13 }); } break;
      default: break;
    }
  }

  function ignition() {
    thump(0.25, 80, 40, 0.15); noise({ src: 'brown', ft: 'lowpass', f: 400, dur: 0.3, g: 0.2, a: 0.01 });
    for (let i = 0; i < 4; i++) { thump(0.12, rnd(70, 110), 45, 0.07, 0.08 + i * 0.09); noise({ f: 500, q: 1, dur: 0.04, g: 0.07, t: 0.08 + i * 0.09 }); }
  }
  return {
    handle, st, shift() { if (reserve('shift', 0.15)) noise({ ft: 'highpass', f: 2500, dur: 0.09, g: 0.05, a: 0.005 }); }, slowEnd() { if (reserve('slowEnd', 0.5)) { noise({ src: 'pink', f: 200, f2: 2200, q: 0.7, dur: 0.35, g: 0.08, a: 0.1, pm: false }); tone({ type: 'sine', f: 120, f2: 360, dur: 0.3, g: 0.07, pm: false }); } },
    get voices() { const t = ctx.currentTime; return slots.filter((s) => s.end > t).length; },
  };
}
