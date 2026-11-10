// Bölüm zemin şablonlarını poliçizgiye çevirir. Saf fonksiyonlar, DOM yok.
// Ayrıntı: docs/MIMARI.md §10 (Bölüm verisi).
import { SIM, SURFACES } from '../config.js';

/**
 * @param {{pieces:Array<object>, start?:{x:number,y:number}, surface?:string, open?:boolean}} spec
 *   open=true (Uzun Yol): bitiş şeridi/duvarı eklenmez, `append(pieces)` ile sağa uzatılır, `trim(x)` ile soldan kırpılır.
 * @returns {{xs:number[], ys:number[], surf:string[], endX:number, endY:number, minY:number, startX:number, base:number,
 *   append(pieces:Array<object>):{x0:number,x1:number,n:number}, trim(keepX:number):number}}
 *   surf[i] = i. kenarın (xs[i],ys[i])→(xs[i+1],ys[i+1]) yüzeyi. `base` = baştan kırpılan toplam düğüm sayısı
 *   (mutlak düğüm indeksi = base + yerel indeks). Diziler YERİNDE büyür/kısalır (referanslar geçerli kalır).
 */
export function buildTerrain(spec) {
  const step = SIM.chainEdge;
  let cx = spec.start?.x ?? 0;
  let cy = spec.start?.y ?? 0;
  let surface = spec.surface ?? 'asphalt';
  const startX = cx;
  const xs = [], ys = [], surf = [];
  const addPt = (x, y, s) => { xs.push(x); ys.push(y); if (xs.length > 1) surf.push(s); };   // surf[i] = i→i+1 kenarı

  // Başlangıç duvarı: geri çıkışı engeller (yüzeyi asfalt, görünür).
  const wall = SIM.startWallHeight;
  const wallX = cx - 2;
  for (let h = wall; h > 0; h -= step) addPt(wallX, cy + h, 'asphalt');
  addPt(wallX, cy, 'asphalt');
  // bağlantı kenarı (duvar dibi → başlangıç)
  addPt(cx, cy, surface);

  const lin = (len, f, s) => {   // f(u) -> y farkı (u: 0..1); uç nokta dahil değil sonu yazılır
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 1; i <= n; i++) { const u = i / n; addPt(cx + len * u, cy + f(u), s); }
  };
  const addPieces = (pieces) => {
    for (const p of pieces) {
      if (p.surface) surface = p.surface;
      const s = surface;
      switch (p.type) {
        case 'flat': lin(p.len, () => 0, s); cx += p.len; break;
        case 'slope': case 'ramp': { const dy = p.dy; lin(p.len, (u) => dy * u, s); cx += p.len; cy += dy; break; }
        case 'hills': { const a = p.amp, k = p.waves ?? 1; lin(p.len, (u) => a * (1 - Math.cos(2 * Math.PI * k * u)) / 2, s); cx += p.len; break; }
        case 'bumps': { const h = p.h, n = p.n ?? 4; lin(p.len, (u) => h * Math.sin(Math.PI * n * u) ** 2, s); cx += p.len; break; }
        case 'gap': {   // çukur: dik duvarlı, derinlik p.depth
          const d = p.depth ?? 6, n = Math.ceil(d / step);
          for (let i = 1; i <= n; i++) addPt(cx, cy - d * i / n, s);
          const m = Math.max(1, Math.ceil(p.len / step));
          for (let i = 1; i <= m; i++) addPt(cx + p.len * i / m, cy - d, s);
          for (let i = 1; i <= n; i++) addPt(cx + p.len, cy - d + d * i / n, s);
          cx += p.len; break;
        }
        case 'pts': {   // ham göreli noktalar [[dx,dy],...] (dx>=0 olmalı)
          let px = cx, py = cy;
          for (const [dx, dy] of p.pts) {
            const len = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(len / step));
            for (let i = 1; i <= n; i++) addPt(px + dx * i / n, py + dy * i / n, s);
            px += dx; py += dy;
          }
          cx = px; cy = py; break;
        }
        default: throw new Error(`Bilinmeyen zemin parçası: ${p.type}`);
      }
    }
  };
  addPieces(spec.pieces);
  const T = { xs, ys, surf, endX: cx, endY: cy, minY: 0, startX, base: 0 };
  if (!spec.open) {
    // bitiş sonrası düz yol + son duvar
    addPt(cx + 12, cy, surface);
    addPt(cx + 12, cy + wall, surface);
  }
  const calcMin = () => { let m = Infinity; for (const y of ys) if (y < m) m = y; T.minY = m; };
  calcMin();
  if (spec.open) {
    /** Sağa yeni parçalar ekler; {x0: ilk eklenen parçanın başladığı x, x1: yeni uç x, n: eklenen düğüm sayısı}. */
    T.append = (pieces) => {
      const n0 = xs.length, x0 = cx;
      addPieces(pieces);
      T.endX = cx; T.endY = cy;
      for (let i = n0; i < ys.length; i++) if (ys[i] < T.minY) T.minY = ys[i];
      return { x0, x1: cx, n: xs.length - n0 };
    };
    /** x'in solundaki düğümleri atar (xs[0] ≤ keepX kalacak biçimde); atılan sayı. Diziler yerinde kısalır. */
    T.trim = (keepX) => {
      let k = 0;
      while (k + 1 < xs.length && xs[k + 1] <= keepX) k++;
      if (k <= 0) return 0;
      xs.splice(0, k); ys.splice(0, k); surf.splice(0, k);
      T.base += k; calcMin();
      return k;
    };
  }
  return T;
}

/** xs (azalmayan) içinde x'ten büyük-eşit ilk düğümün indeksi. */
function lowerBound(xs, x) {
  let lo = 0, hi = xs.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < x) lo = m + 1; else hi = m; }
  return lo;
}

/** Zemin yüksekliği (x'te üstteki ilk çizgi, yaklaşık; çukur duvarlarında üst kenar). O(log n + k). */
export function heightAt(t, x) {
  const { xs, ys } = t;
  let best = -Infinity;
  for (let i = Math.max(0, lowerBound(xs, x) - 1); i < xs.length - 1 && xs[i] <= x; i++) {
    const x0 = xs[i], x1 = xs[i + 1];
    if (x0 === x1 || x > x1) continue;
    const y = ys[i] + (ys[i + 1] - ys[i]) * (x - x0) / (x1 - x0);
    if (y > best) best = y;
  }
  return best === -Infinity ? t.minY : best;
}

/** x çevresinde ±r m içindeki en yüksek zemin noktası (çukur/uçurum duvarı tespiti için). minX: bunun solundaki noktalar sayılmaz (başlangıç duvarı). */
export function topNear(t, x, r, minX = -Infinity) {
  const { xs, ys } = t;
  let best = -Infinity;
  for (let i = lowerBound(xs, Math.max(x - r, minX)); i < xs.length && xs[i] <= x + r; i++) if (ys[i] > best) best = ys[i];
  return best === -Infinity ? t.minY : best;
}
