// Kayıt modülü (TASARIM §15). Anahtar: sarsinti.v1. Sahip: Arayüz.
// Başka oyunların anahtarlarına ASLA dokunmaz. Her erişim try/catch içinde; localStorage yoksa bellekte çalışır.
import { SAVE_KEY, VEHICLES, VEHICLE_ORDER, UPGRADE_LINES, ECONOMY } from './config.js';

export const SCHEMA_VERSION = 1;

/** Varsayılan (boş) kayıt. */
export function defaults() {
  const vehicles = {};
  for (const id of VEHICLE_ORDER) vehicles[id] = { owned: id === 'tosun', up: Object.fromEntries(UPGRADE_LINES.map((l) => [l, 0])) };
  return {
    v: SCHEMA_VERSION, coins: ECONOMY.startCoins, vehicle: 'tosun', vehicles, levels: {},
    endless: { bestDistance: 0, bestScore: 0, runs: 0 },
    stats: { distance: 0, flips: 0, airTime: 0, cargoDelivered: 0, cargoLost: 0, crashes: 0, playTime: 0 },
    settings: { sfx: 1, music: 0.7, shake: 2, haptics: true, assistLanding: true, quality: 'high', btnScale: 1 },
    tutorial: { seen: [] },
  };
}

/** Eski sürümlerden yükseltir; bilinmeyen/eksik alanları varsayılanla tamamlar. Girdiyi değiştirmez. */
export function migrate(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  // v1 → ileride: if (raw.v === 1) {...raw.v = 2}
  const out = { ...d, ...raw, v: SCHEMA_VERSION };
  out.vehicles = { ...d.vehicles, ...(raw.vehicles ?? {}) };
  for (const id of VEHICLE_ORDER) out.vehicles[id] = { ...d.vehicles[id], ...out.vehicles[id], up: { ...d.vehicles[id].up, ...(out.vehicles[id]?.up ?? {}) } };
  out.settings = { ...d.settings, ...(raw.settings ?? {}) };
  out.stats = { ...d.stats, ...(raw.stats ?? {}) };
  out.endless = { ...d.endless, ...(raw.endless ?? {}) };
  out.tutorial = { seen: Array.isArray(raw.tutorial?.seen) ? raw.tutorial.seen : [] };
  out.levels = raw.levels && typeof raw.levels === 'object' ? raw.levels : {};
  if (!VEHICLES[out.vehicle] || !out.vehicles[out.vehicle].owned) out.vehicle = 'tosun';
  if (!Number.isFinite(out.coins) || out.coins < 0) out.coins = 0;
  return out;
}

/**
 * @param {Storage} [storage]  varsayılan: globalThis.localStorage (yoksa/atarsa bellek)
 * @returns {{data:object, load():object, save(now?:boolean):void, update(fn:(d:object)=>void):void, reset():void, flush():void}}
 */
export function createSave(storage) {
  let store = storage;
  try { store = store ?? globalThis.localStorage; store?.getItem; } catch { store = null; }
  const mem = new Map();
  const io = {
    get: (k) => { try { return store ? store.getItem(k) : mem.get(k) ?? null; } catch { return mem.get(k) ?? null; } },
    set: (k, v) => { try { if (store) store.setItem(k, v); else mem.set(k, v); } catch { mem.set(k, v); } },
    del: (k) => { try { store?.removeItem(k); } catch { /* yoksay */ } mem.delete(k); },
  };
  let timer = null, lastWrite = 0;
  const api = {
    data: defaults(),
    /** Okur, göç ettirir ve api.data'ya koyar. Bozuk JSON ise varsayılana döner, eskisini sarsinti.v1.bak'a yedekler. */
    load() {
      const text = io.get(SAVE_KEY);
      if (text == null) { api.data = defaults(); return api.data; }
      try { api.data = migrate(JSON.parse(text)); }
      catch { io.set(SAVE_KEY + '.bak', text); api.data = defaults(); }
      return api.data;
    },
    /** Debounce'lu yazım (≤1/sn). now=true hemen yazar. */
    save(now = false) {
      const write = () => { timer = null; lastWrite = Date.now(); io.set(SAVE_KEY, JSON.stringify(api.data)); };
      if (now) { if (timer) clearTimeout(timer); return write(); }
      if (timer) return;
      const wait = Math.max(0, 1000 - (Date.now() - lastWrite));
      timer = setTimeout(write, wait);
    },
    flush() { if (timer) { clearTimeout(timer); timer = null; io.set(SAVE_KEY, JSON.stringify(api.data)); } },
    /** Değiştirip kaydeder: save.update((d) => { d.coins += 10; }) */
    update(fn) { fn(api.data); api.save(); },
    /** İlerlemeyi sıfırlar (yalnızca bu anahtar). */
    reset() { io.del(SAVE_KEY); api.data = defaults(); },
  };
  return api;
}
