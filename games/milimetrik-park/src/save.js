// Milimetrik Park — kayıt. Anahtar: milimetrik.v1 (alan adı ortak; başka oyunların anahtarlarına dokunmaz).
// Şema sürümü kaydın içindedir (v); eski kayıtlar migrate() ile korunarak yükseltilir.
// Her erişim try/catch içinde: gizli mod / kota durumunda oyun bellekte çalışmayı sürdürür.
import { SAVE_KEY, VEHICLES, VEHICLE_ORDER, PAINTS, ECONOMY } from './config.js';

export const SCHEMA = 2;

export const DEFAULT_SETTINGS = {
  scheme: 'lever',         // 'lever' (sürüş kolu) | 'pedals' (pedal + vites)
  autoHold: true,          // pedal şemasında: durunca freni tut
  steer: 'wheel',          // dokunmatik direksiyon: 'wheel' (simit) | 'slider' (kaydırma)
  touchLock: 360,          // simit: merkezden kilide kaç derece
  autoCenter: true,        // direksiyon kendini toplasın (gerçekçi)
  camera: 'north',         // 'north' | 'follow'
  guides: true,            // yörünge çizgileri
  sensors: true,           // park sensörü
  sound: true,
  vibration: true,
  quality: 'high',         // 'high' | 'low'
};

export function defaults() {
  return {
    v: SCHEMA,
    coins: 300,
    levels: {},
    vehicles: { owned: ['kumru', 'serce'], selected: 'serce', paint: {} },
    paintsOwned: [],
    valet: { best: 0, bestCars: 0, runs: 0 },
    daily: { done: {}, streak: 0, last: null },
    achievements: {},
    stats: { parks: 0, perfect: 0, playTime: 0, hits: 0, valetCars: 0, exams: 0 },
    settings: { ...DEFAULT_SETTINGS },
  };
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const num = (x, d) => (Number.isFinite(x) ? x : d);

export function migrate(raw) {
  const d = defaults();
  if (!isObj(raw)) return d;
  if (isObj(raw.levels)) {
    for (const [id, r] of Object.entries(raw.levels)) {
      if (!isObj(r)) continue;
      d.levels[id] = {
        stars: Array.isArray(r.stars) ? [0, 1, 2].map((i) => r.stars[i] === true) : [false, false, false],
        best: Math.max(0, Math.min(100, num(r.best, 0))),
        bestTime: num(r.bestTime, 0),
        bestMoves: num(r.bestMoves, 0),
        tries: num(r.tries, 0),
      };
    }
  }
  const s = isObj(raw.settings) ? raw.settings : {};
  d.settings = {
    scheme: s.scheme === 'pedals' ? 'pedals' : 'lever',
    autoHold: s.autoHold !== false,
    steer: s.steer === 'slider' ? 'slider' : 'wheel',
    touchLock: [270, 360, 450, 540].includes(s.touchLock) ? s.touchLock : 360,
    autoCenter: s.autoCenter !== false,
    camera: s.camera === 'follow' ? 'follow' : 'north',
    guides: s.guides !== false,
    sensors: s.sensors !== false,
    sound: s.sound !== false,
    vibration: s.vibration !== false,
    quality: s.quality === 'low' ? 'low' : 'high',
  };
  if (isObj(raw.stats)) for (const k of Object.keys(d.stats)) d.stats[k] = num(raw.stats[k], d.stats[k]);
  if ((raw.v || 1) < 2) {
    // v1 → v2: kazanılmış yıldızlar için jeton
    let stars = 0;
    for (const r of Object.values(d.levels)) stars += r.stars.filter(Boolean).length;
    d.coins = 300 + stars * 40;
    return d;
  }
  d.coins = Math.max(0, Math.floor(num(raw.coins, d.coins)));
  if (isObj(raw.vehicles)) {
    const owned = Array.isArray(raw.vehicles.owned) ? raw.vehicles.owned.filter((v) => VEHICLES[v]) : [];
    d.vehicles.owned = [...new Set(['kumru', 'serce', ...owned])];
    d.vehicles.selected = d.vehicles.owned.includes(raw.vehicles.selected) ? raw.vehicles.selected : 'serce';
    if (isObj(raw.vehicles.paint)) for (const [k, v] of Object.entries(raw.vehicles.paint)) if (VEHICLES[k] && PAINTS.some((p) => p.id === v)) d.vehicles.paint[k] = v;
  }
  if (Array.isArray(raw.paintsOwned)) d.paintsOwned = raw.paintsOwned.filter((p) => PAINTS.some((x) => x.id === p));
  if (isObj(raw.valet)) for (const k of Object.keys(d.valet)) d.valet[k] = num(raw.valet[k], 0);
  if (isObj(raw.daily)) {
    if (isObj(raw.daily.done)) for (const [k, v] of Object.entries(raw.daily.done)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isObj(v)) d.daily.done[k] = { best: num(v.best, 0), time: num(v.time, 0) };
    d.daily.streak = num(raw.daily.streak, 0);
    d.daily.last = typeof raw.daily.last === 'string' ? raw.daily.last : null;
  }
  if (isObj(raw.achievements)) for (const [k, v] of Object.entries(raw.achievements)) if (Number.isFinite(v)) d.achievements[k] = v;
  return d;
}

export function totalStars(data) {
  let n = 0;
  for (const r of Object.values(data.levels)) n += r.stars.filter(Boolean).length;
  return n;
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
    /** Bölüm sonucu: en iyileri günceller; {fresh: yeni yıldızlar, coins: kazanılan jeton}. */
    record(levelId, res) {
      const L = api.data.levels[levelId] || (api.data.levels[levelId] = { stars: [false, false, false], best: 0, bestTime: 0, bestMoves: 0, tries: 0 });
      const fresh = res.stars.map((s, i) => s && !L.stars[i]);
      L.stars = L.stars.map((s, i) => s || res.stars[i]);
      if (res.quality > L.best) L.best = res.quality;
      if (!L.bestTime || res.time < L.bestTime) L.bestTime = Math.round(res.time * 10) / 10;
      if (!L.bestMoves || res.moves < L.bestMoves) L.bestMoves = res.moves;
      L.tries++;
      const st = api.data.stats;
      st.parks++;
      if (res.perfect) st.perfect++;
      const coins = ECONOMY.levelBase + ECONOMY.perStar * res.stars.filter(Boolean).length + ECONOMY.newStar * fresh.filter(Boolean).length + (res.perfect ? ECONOMY.perfect : 0);
      api.data.coins += coins;
      api.save(true);
      return { fresh, coins };
    },
    addCoins(n) { api.data.coins += Math.max(0, Math.round(n)); api.save(); },
    spend(n) { if (api.data.coins < n) return false; api.data.coins -= n; api.save(true); return true; },
    buyVehicle(id) {
      const v = VEHICLES[id];
      if (!v || api.data.vehicles.owned.includes(id)) return false;
      if (totalStars(api.data) < v.unlock.stars || !api.spend(v.unlock.price)) return false;
      api.data.vehicles.owned.push(id);
      api.save(true);
      return true;
    },
    buyPaint(id) {
      const p = PAINTS.find((x) => x.id === id);
      if (!p || api.data.paintsOwned.includes(id) || !api.spend(p.price)) return false;
      api.data.paintsOwned.push(id);
      api.save(true);
      return true;
    },
    /** Aracın boyası (renk) — seçili boya yoksa aracın kendi rengi. */
    paintOf(vehId) {
      const pid = api.data.vehicles.paint[vehId];
      const p = pid && PAINTS.find((x) => x.id === pid);
      return p ? p.color : VEHICLES[vehId].color;
    },
    ownsAll() { return VEHICLE_ORDER.every((v) => api.data.vehicles.owned.includes(v)); },
  };
  if (typeof addEventListener === 'function') addEventListener('pagehide', () => { if (timer) api.write(); });
  return api;
}
