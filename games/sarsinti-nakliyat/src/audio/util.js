// Ses yardımcıları: ortam tespiti, rastgele, gürültü/yankı tamponları. DOM'a bağımlı değil (Node'da import güvenli).

const G = globalThis;
export const hasAudio = typeof G.AudioContext !== 'undefined' || typeof G.webkitAudioContext !== 'undefined';
const UA = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
export const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** Düşük güçlü cihaz: telefon/tablet ya da ≤4 çekirdek → daha az ses, kısa yankı. */
export const IS_LOW = /Android|iPhone|iPad|iPod|Mobile/i.test(UA) || IS_IOS || (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8) <= 4);

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const cents = (base, c) => base * Math.pow(2, c / 1200);
export const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Beyaz/pembe/kahverengi gürültü + çıtırtı tamponları (döngülü). */
export function makeBuffers(ctx, low) {
  const sr = ctx.sampleRate, n = Math.floor(sr * (low ? 1.5 : 2));
  const mk = (fill) => { const b = ctx.createBuffer(1, n, sr); fill(b.getChannelData(0)); return b; };
  const white = mk((d) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
  const pink = mk((d) => {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  });
  const brown = mk((d) => { let l = 0; for (let i = 0; i < n; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
  const crackle = mk((d) => {
    // seyrek, rastgele genlikli kısa tıklar (çakıl/kar ezilmesi)
    for (let i = 0; i < n; i++) d[i] = 0;
    const clicks = Math.floor(n / sr * 55);
    for (let k = 0; k < clicks; k++) {
      const p = (Math.random() * (n - 200)) | 0, a = Math.random() * 0.9 + 0.1, len = 20 + ((Math.random() * 80) | 0);
      for (let j = 0; j < len; j++) d[p + j] += (Math.random() * 2 - 1) * a * Math.exp(-j / (len * 0.3));
    }
  });
  return { white, pink, brown, crackle };
}

/** Sentetik yankı dürtüsü (üstel sönümlü, alçak geçirilmiş gürültü). */
export function makeImpulse(ctx, secs, decay = 2.6) {
  const sr = ctx.sampleRate, n = Math.floor(sr * secs), b = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / n, decay) * 1.6; }
  }
  return b;
}

/** Yumuşak doyurucu eğri (motor sıcaklığı / patlama koruması). */
export function satCurve(k = 2, n = 1024) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
  return c;
}

/** Harmonik genlik listesinden periyodik dalga. */
export function harmWave(ctx, amps, phase = 'sin') {
  const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1);
  amps.forEach((a, i) => { if (phase === 'sin') im[i + 1] = a; else re[i + 1] = a; });
  return ctx.createPeriodicWave(re, im);
}
