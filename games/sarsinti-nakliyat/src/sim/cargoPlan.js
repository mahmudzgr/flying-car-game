// Kargo yerleştirme planı — SAF (planck/DOM yok). Sim yerleştirmeyi ve teslim gereksinimini, arayüz de brifing/kart
// sayılarını BURADAN alır: ikisi yapı gereği aynı sonucu verir (QA #3).
import { CARGO, CARGO_STACK_MAX, VEHICLES } from '../config.js';

const RES = 0.05;   // skyline çözünürlüğü (m)

/**
 * Kargo listesini ([{type,count}]) araç bölmesine dizer ("skyline"): yuvarlaklar (karpuz/balya) önce arkaya, kutular önlerine;
 * kutu eşit olmayan yüzeye (yuvarlak tepesi) oturtulmaz; yığın üst sınırı (`bay.stackMax ?? CARGO_STACK_MAX`) aşılırsa parça yerleştirilmez.
 * @returns {{placed:{type:string,idx:number,def:object,w:number,h:number,lx:number,ly:number}[], skipped:{type:string,idx:number,reason:'capacity'|'stack'}[]}}
 *   lx/ly = parçanın bölme (şasi/römork yerel) koordinatındaki merkezi; idx = bölüm sırası (seqStart'tan).
 */
export function layoutCargo(list, bay, capacity, seqStart = 0) {
  const cols = Math.max(1, Math.floor((bay.x1 - bay.x0) / RES));
  const sky = new Array(cols).fill(bay.floorY);
  const items = [];
  for (const grp of list ?? []) {
    if (!CARGO[grp.type]) throw new Error(`Bilinmeyen kargo: ${grp.type}`);
    for (let i = 0; i < (grp.count ?? 1); i++) items.push({ type: grp.type, idx: seqStart + items.length });
  }
  const skipped = items.slice(capacity).map((it) => ({ ...it, reason: 'capacity' }));
  const order = items.slice(0, capacity).sort((a, b) => (CARGO[a.type].shape === 'circle' ? 0 : 1) - (CARGO[b.type].shape === 'circle' ? 0 : 1) || a.idx - b.idx);
  const placed = [];
  for (const it of order) {
    const def = CARGO[it.type];
    const w = def.shape === 'box' ? def.w : def.r * 2, h = def.shape === 'box' ? def.h : def.r * 2;
    const span = Math.min(cols, Math.ceil((w + 0.02) / RES));
    const prof = (k) => {   // dairede alt/üst eğrisi (yuvarlaklar birbirinin arasına oturur), kutuda düz
      if (def.shape === 'box') return [0, h];
      const dx = (k + 0.5 - span / 2) * RES, q = Math.sqrt(Math.max(0, def.r * def.r - dx * dx));
      return [def.r - q, def.r + q];
    };
    let bestX = 0, bestY = Infinity, bestScore = Infinity;
    for (let x0 = 0; x0 + span <= cols; x0++) {
      let yb = bay.floorY, lo = Infinity;
      for (let k = 0; k < span; k++) { yb = Math.max(yb, sky[x0 + k] - prof(k)[0]); lo = Math.min(lo, sky[x0 + k] - prof(k)[0]); }
      const score = yb + (def.shape === 'box' ? 1.5 * (yb - lo) : 0);   // kutu için yüzey eşitsizliği cezası
      if (score < bestScore - 1e-9) { bestScore = score; bestY = yb; bestX = x0; }
    }
    if (bestY + h > bay.floorY + (bay.stackMax ?? CARGO_STACK_MAX)) { skipped.push({ ...it, reason: 'stack' }); continue; }
    for (let k = 0; k < span; k++) sky[bestX + k] = bestY + prof(k)[1] + 0.01;
    placed.push({ ...it, def, w, h, lx: bay.x0 + bestX * RES + w / 2 + 0.01, ly: bestY + h / 2 + 0.01 });
  }
  placed.sort((a, b) => a.idx - b.idx);
  return { placed, skipped };
}

/**
 * Bölüm × araç kargo özeti: sim'in gerçekte yerleştireceği sayı ve teslim gereksinimi.
 * @returns {{total:number, loaded:number, byType:Record<string,{total:number,loaded:number}>, minDelivered:number, need:(c:{kind:string,min?:number})=>number|null}}
 *   need({kind:'delivered',min}) / need({kind:'deliveredAll'}) → bu araçla gereken teslim sayısı (yüklenen/istenen oranında ölçeklenir, ≥1); diğer ölçütlerde `min` ya da null.
 */
export function planCargo(level, vehicleId) {
  const v = VEHICLES[vehicleId];
  const bay = v.trailer?.bay ?? v.bay;
  const { placed } = layoutCargo(level.cargo ?? [], bay, v.capacity);
  const byType = {};
  let total = 0;
  for (const g of level.cargo ?? []) { const n = g.count ?? 1; total += n; (byType[g.type] ??= { total: 0, loaded: 0 }).total += n; }
  for (const p of placed) byType[p.type].loaded++;
  const loaded = placed.length;
  const scale = (n) => (loaded >= total ? n : Math.max(1, Math.min(loaded, Math.ceil(n * loaded / total))));
  const need = (c) => {
    if (c?.kind === 'deliveredAll') return loaded;
    if (c?.kind === 'delivered') return loaded === 0 ? 0 : scale(c.min);
    return c?.min ?? null;
  };
  return { total, loaded, byType, minDelivered: loaded === 0 ? 0 : scale(level.minDelivered ?? 1), need };
}
