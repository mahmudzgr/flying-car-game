// Bölüm zemin şablonlarını poliçizgiye çevirir. Saf fonksiyonlar, DOM yok.
// Ayrıntı: docs/MIMARI.md §10 (Bölüm verisi).
import { SIM, SURFACES } from '../config.js';

/**
 * @param {{pieces:Array<object>, start?:{x:number,y:number}, surface?:string}} spec
 * @returns {{xs:number[], ys:number[], surf:string[], endX:number, endY:number, minY:number, startX:number}}
 *   surf[i] = i. kenarın (xs[i],ys[i])→(xs[i+1],ys[i+1]) yüzeyi.
 */
export function buildTerrain(spec) {
  const step = SIM.chainEdge;
  let cx = spec.start?.x ?? 0;
  let cy = spec.start?.y ?? 0;
  let surface = spec.surface ?? 'asphalt';
  const startX = cx;
  const xs = [], ys = [], surf = [];

  // Başlangıç duvarı: geri çıkışı engeller (yüzeyi asfalt, görünür).
  const wall = SIM.startWallHeight;
  const wallX = cx - 2;
  for (let h = wall; h > 0; h -= step) { xs.push(wallX); ys.push(cy + h); surf.push('asphalt'); }
  xs.push(wallX); ys.push(cy); surf.push('asphalt');
  const addPt = (x, y, s) => { xs.push(x); ys.push(y); surf.push(s); };
  // bağlantı kenarı (duvar dibi → başlangıç)
  addPt(cx, cy, surface);

  const lin = (len, f, s) => {   // f(u) -> y farkı (u: 0..1); uç nokta dahil değil sonu yazılır
    const n = Math.max(1, Math.ceil(len / step));
    for (let i = 1; i <= n; i++) { const u = i / n; addPt(cx + len * u, cy + f(u), s); }
  };
  for (const p of spec.pieces) {
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
  // bitiş sonrası düz yol + son duvar
  const endX = cx;
  addPt(cx + 12, cy, surface);
  addPt(cx + 12, cy + wall, surface);
  let minY = Infinity;
  for (const y of ys) if (y < minY) minY = y;
  // surf[k] k. NOKTAYA varan kenarın yüzeyidir; kenar i için surf[i+1] -> kaydır
  surf.shift();
  return { xs, ys, surf, endX, endY: cy, minY, startX };
}

/** Zemin yüksekliği (x'te üstteki ilk çizgi, yaklaşık; çukur duvarlarında üst kenar). */
export function heightAt(t, x) {
  let best = -Infinity;
  for (let i = 0; i < t.xs.length - 1; i++) {
    const x0 = t.xs[i], x1 = t.xs[i + 1];
    if (x0 === x1) continue;
    if ((x >= x0 && x <= x1) || (x >= x1 && x <= x0)) {
      const y = t.ys[i] + (t.ys[i + 1] - t.ys[i]) * (x - x0) / (x1 - x0);
      if (y > best) best = y;
    }
  }
  return best === -Infinity ? t.minY : best;
}

/** x çevresinde ±r m içindeki en yüksek zemin noktası (çukur/uçurum duvarı tespiti için). */
export function topNear(t, x, r) {
  let best = -Infinity;
  for (let i = 0; i < t.xs.length; i++) if (Math.abs(t.xs[i] - x) <= r && t.ys[i] > best) best = t.ys[i];
  return best === -Infinity ? t.minY : best;
}
