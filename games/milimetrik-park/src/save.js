// Milimetrik Park — kayıt. Anahtar: milimetrik.v1 (alan adı ortak; başka oyunların anahtarlarına dokunmaz).
// Her erişim try/catch içinde: gizli mod / kota durumunda oyun bellekte çalışmayı sürdürür.
import { SAVE_KEY } from './config.js';

export const SCHEMA = 1;

export const DEFAULT_SETTINGS = {
  steer: 'wheel',          // dokunmatik direksiyon: 'wheel' (simit) | 'slider' (kaydırma)
  touchLock: 360,          // simit: merkezden kilide kaç derece
  autoCenter: true,        // direksiyon kendini toplasın (gerçekçi)
  camera: 'north',         // 'north' | 'follow'
  guides: true,            // yörünge çizgileri
  sensors: true,           // park sensörü
  sound: true,
};

export function defaults() {
  return { v: SCHEMA, levels: {}, settings: { ...DEFAULT_SETTINGS }, stats: { parks: 0, perfect: 0, playTime: 0 } };
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

export function migrate(raw) {
  const d = defaults();
  if (!isObj(raw)) return d;
  if (isObj(raw.levels)) {
    for (const [id, r] of Object.entries(raw.levels)) {
      if (!isObj(r)) continue;
      d.levels[id] = {
        stars: Array.isArray(r.stars) ? [0, 1, 2].map((i) => r.stars[i] === true) : [false, false, false],
        best: Number.isFinite(r.best) ? Math.max(0, Math.min(100, r.best)) : 0,
        bestTime: Number.isFinite(r.bestTime) ? r.bestTime : 0,
        bestMoves: Number.isFinite(r.bestMoves) ? r.bestMoves : 0,
        tries: Number.isFinite(r.tries) ? r.tries : 0,
      };
    }
  }
  const s = isObj(raw.settings) ? raw.settings : {};
  d.settings = {
    steer: s.steer === 'slider' ? 'slider' : 'wheel',
    touchLock: [270, 360, 450, 540].includes(s.touchLock) ? s.touchLock : 360,
    autoCenter: s.autoCenter !== false,
    camera: s.camera === 'follow' ? 'follow' : 'north',
    guides: s.guides !== false,
    sensors: s.sensors !== false,
    sound: s.sound !== false,
  };
  if (isObj(raw.stats)) for (const k of Object.keys(d.stats)) if (Number.isFinite(raw.stats[k])) d.stats[k] = raw.stats[k];
  return d;
}

export function createSave() {
  let store = null;
  try { store = globalThis.localStorage; store?.getItem(SAVE_KEY); } catch { store = null; }
  let timer = null;
  const api = {
    data: defaults(),
    persistent: !!store,
    load() {
      try {
        const t = store?.getItem(SAVE_KEY);
        api.data = t ? migrate(JSON.parse(t)) : defaults();
      } catch {
        api.data = defaults();
      }
      return api.data;
    },
    write() {
      timer = null;
      try { store?.setItem(SAVE_KEY, JSON.stringify(api.data)); api.persistent = !!store; } catch { api.persistent = false; }
    },
    save(now = false) {
      if (now) { if (timer) clearTimeout(timer); api.write(); return; }
      if (!timer) timer = setTimeout(api.write, 600);
    },
    /** Bölüm sonucu: en iyileri günceller, yeni yıldızları döndürür. */
    record(levelId, res) {
      const L = api.data.levels[levelId] || (api.data.levels[levelId] = { stars: [false, false, false], best: 0, bestTime: 0, bestMoves: 0, tries: 0 });
      const fresh = res.stars.map((s, i) => s && !L.stars[i]);
      L.stars = L.stars.map((s, i) => s || res.stars[i]);
      if (res.quality > L.best) L.best = res.quality;
      if (!L.bestTime || res.time < L.bestTime) L.bestTime = Math.round(res.time * 10) / 10;
      if (!L.bestMoves || res.moves < L.bestMoves) L.bestMoves = res.moves;
      api.data.stats.parks++;
      if (res.perfect) api.data.stats.perfect++;
      api.save(true);
      return fresh;
    },
  };
  if (typeof addEventListener === 'function') addEventListener('pagehide', () => { if (timer) api.write(); });
  return api;
}
