// Kayıt modülü (TASARIM §15). Anahtar: sarsinti.v1. Sahip: Arayüz.
// Başka oyunların anahtarlarına (roadster-flip-save-v1…, paldirkuldur.v1) ASLA dokunmaz.
// Her erişim try/catch içinde; localStorage yoksa/dolmuşsa (gizli mod, kota) oyun bellekte çalışmaya devam eder.
import { SAVE_KEY, VEHICLES, VEHICLE_ORDER, UPGRADE_LINES, ECONOMY } from './config.js';

export const SCHEMA_VERSION = 1;
export const BACKUP_KEY = SAVE_KEY + '.bak';

/** Varsayılan (boş) kayıt. */
export function defaults() {
  const vehicles = {};
  for (const id of VEHICLE_ORDER) vehicles[id] = { owned: id === 'tosun', up: Object.fromEntries(UPGRADE_LINES.map((l) => [l, 0])) };
  return {
    v: SCHEMA_VERSION, coins: ECONOMY.startCoins, vehicle: 'tosun', vehicles, levels: {},
    endless: { bestDistance: 0, bestScore: 0, runs: 0 },
    stats: { distance: 0, flips: 0, airTime: 0, cargoDelivered: 0, cargoLost: 0, crashes: 0, playTime: 0 },
    // master: ana ses (TASARIM §15 şemasına eklenen alan; eski kayıtlarda varsayılan 1)
    settings: { master: 1, sfx: 1, music: 0.7, shake: 2, haptics: true, assistLanding: true, quality: 'high', btnScale: 0.85 },
    tutorial: { seen: [] },
  };
}

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const num = (x, def, lo = -Infinity, hi = Infinity) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def);

/** Eski sürümlerden yükseltir; bilinmeyen/eksik/bozuk alanları varsayılanla tamamlar. Girdiyi değiştirmez. */
export function migrate(raw) {
  const d = defaults();
  if (!isObj(raw)) return d;
  // v1 → ileride: if (raw.v === 1) {...raw.v = 2}
  const out = { ...d };
  out.coins = Math.floor(num(raw.coins, d.coins, 0, 1e9));
  for (const id of VEHICLE_ORDER) {
    const r = isObj(raw.vehicles) && isObj(raw.vehicles[id]) ? raw.vehicles[id] : {};
    out.vehicles[id] = { owned: id === 'tosun' ? true : r.owned === true, up: {} };
    for (const l of UPGRADE_LINES) out.vehicles[id].up[l] = Math.floor(num(r.up?.[l], 0, 0, ECONOMY.upgradeMaxLevel));
  }
  out.vehicle = VEHICLES[raw.vehicle] && out.vehicles[raw.vehicle]?.owned ? raw.vehicle : 'tosun';
  out.levels = {};
  if (isObj(raw.levels)) {
    for (const [id, r] of Object.entries(raw.levels)) {
      if (!isObj(r)) continue;
      out.levels[id] = { stars: Math.floor(num(r.stars, 0, 0, 3)), best: Math.floor(num(r.best, 0, 0)), bestTime: num(r.bestTime, 0, 0), tries: Math.floor(num(r.tries, 0, 0)) };
    }
  }
  const mergeNums = (def, src) => { const o = { ...def }; if (isObj(src)) for (const k of Object.keys(def)) o[k] = num(src[k], def[k], 0); return o; };
  out.endless = mergeNums(d.endless, raw.endless);
  out.stats = mergeNums(d.stats, raw.stats);
  const s = isObj(raw.settings) ? raw.settings : {};
  out.settings = {
    master: num(s.master, 1, 0, 1), sfx: num(s.sfx, 1, 0, 1), music: num(s.music, 0.7, 0, 1),
    shake: [0, 1, 2].includes(s.shake) ? s.shake : 2,
    haptics: s.haptics !== false, assistLanding: s.assistLanding !== false,
    quality: s.quality === 'low' ? 'low' : 'high', btnScale: num(s.btnScale, 0.85, 0.7, 1.4),
  };
  out.tutorial = { seen: Array.isArray(raw.tutorial?.seen) ? raw.tutorial.seen.filter((x) => typeof x === 'string') : [] };
  out.v = SCHEMA_VERSION;
  return out;
}

/**
 * @param {Storage} [storage]  varsayılan: globalThis.localStorage (yoksa/atarsa bellek)
 * @returns {{data:object, persistent:boolean, lastError:any, load():object, save(now?:boolean):void, update(fn:(d:object)=>void):void, reset():void, flush():void}}
 */
export function createSave(storage) {
  let store = storage;
  try { store = store ?? globalThis.localStorage; void store?.getItem; } catch { store = null; }
  const mem = new Map();
  let timer = null, lastWrite = 0, dirty = false;
  const io = {
    get(k) { try { return store ? store.getItem(k) : mem.get(k) ?? null; } catch { return mem.get(k) ?? null; } },
    set(k, v) { // başarılıysa true; kota/gizli mod hatasında bellekte tut, false dön
      try { if (store) { store.setItem(k, v); mem.delete(k); return true; } mem.set(k, v); return false; }
      catch (e) { api.lastError = e; mem.set(k, v); return false; }
    },
    del(k) { try { store?.removeItem(k); } catch { /* yoksay */ } mem.delete(k); },
  };
  const write = () => {
    timer = null; lastWrite = Date.now(); dirty = false;
    let text;
    try { text = JSON.stringify(api.data); } catch (e) { api.lastError = e; return; }
    api.persistent = io.set(SAVE_KEY, text) && !!store;
    if (!api.persistent) dirty = true;           // bir sonraki fırsatta yeniden dene
  };
  const api = {
    data: defaults(),
    /** false: depolama yazılamıyor (gizli mod/kota); oyun bellekte sürer. */
    persistent: !!store,
    lastError: null,
    /** Okur, göç ettirir ve api.data'ya koyar. Bozuk JSON/şema ise varsayılana döner, eskisini sarsinti.v1.bak'a yedekler. */
    load() {
      const text = io.get(SAVE_KEY);
      if (text == null) { api.data = defaults(); return api.data; }
      try {
        const raw = JSON.parse(text);
        if (!isObj(raw)) throw new Error('kayıt nesne değil');
        if (raw.v > SCHEMA_VERSION) io.set(BACKUP_KEY, text);   // daha yeni sürümden geliyor: yedekle, okunabildiğince yükle
        api.data = migrate(raw);
      } catch {
        io.set(BACKUP_KEY, text);
        api.data = defaults();
      }
      return api.data;
    },
    /** Debounce'lu yazım (≤1/sn). now=true hemen yazar. */
    save(now = false) {
      dirty = true;
      if (now) { if (timer) clearTimeout(timer); write(); return; }
      if (timer) return;
      timer = setTimeout(write, Math.max(0, 1000 - (Date.now() - lastWrite)));
      timer?.unref?.();
    },
    /** Bekleyen yazımı hemen yaz (bölüm sonu, sekme kapanırken). */
    flush() { if (timer) clearTimeout(timer); if (timer || dirty) write(); },
    /** Değiştirip kaydeder: save.update((d) => { d.coins += 10; }) */
    update(fn) { fn(api.data); api.save(); },
    /** İlerlemeyi sıfırlar (yalnızca bu anahtar; yedek dokunulmaz). */
    reset() { if (timer) clearTimeout(timer); timer = null; dirty = false; io.del(SAVE_KEY); api.data = defaults(); api.persistent = !!store; },
  };
  if (typeof addEventListener === 'function' && typeof document !== 'undefined') {
    addEventListener('pagehide', () => api.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) api.flush(); });
  }
  return api;
}
