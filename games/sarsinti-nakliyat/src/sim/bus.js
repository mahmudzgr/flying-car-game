// Basit olay veri yolu. DOM yok. Olaylar adım sonunda sırayla dağıtılır (dinleyici dünyayı değiştirmesin diye).
export function createBus() {
  const subs = new Map();   // ad -> Set<fn>
  const queue = [];
  return {
    /** on('ad', fn(e)) ya da on('*', fn(e)); e = {name, t, ...yük}. Dönüş: aboneliği kaldıran fonksiyon. */
    on(name, fn) {
      if (!subs.has(name)) subs.set(name, new Set());
      subs.get(name).add(fn);
      return () => subs.get(name)?.delete(fn);
    },
    emit(name, t, data) { queue.push({ name, t, ...data }); },
    flush() {
      for (let i = 0; i < queue.length; i++) {
        const e = queue[i];
        for (const key of [e.name, '*']) {
          const set = subs.get(key);
          if (!set) continue;
          for (const fn of set) {
            try { fn(e); } catch (err) { console.error(`[olay:${e.name}]`, err); }
          }
        }
      }
      queue.length = 0;
    },
    clear() { subs.clear(); queue.length = 0; },
  };
}
