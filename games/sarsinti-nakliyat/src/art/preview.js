// Garaj / araç kartı önizlemesi: düz (y AŞAĞI) bir canvas bağlamında yan görünüm araç + Fındık. Sahip: Grafik.
// Kullanım: drawVehiclePreview(ctx2d, 'tosun', cx, cy, widthPx, t)  — kendi dönüşümünü kurar ve geri alır.
import { VEHICLES } from '../config.js';
import { fakeVehicle, drawVehicleBack, drawVehicleFront } from './vehicles.js';
import { drawDriver } from './driver.js';

/**
 * @param ctx 2B bağlam (y aşağı, css/px dönüşümü kurulu — önizleme kendi ölçeğini ekler)
 * @param id 'tosun'|'zipir'|'pasa'|'koca'
 * @param cx,cy  araç gövdesinin görünür merkezi (px)   @param widthPx  aracın (römork dahil) kapladığı genişlik
 * @param t  zaman (sn): tekerlek dönüşü ve hafif süspansiyon salınımı   @param opts {driver?:boolean, dpr?:number}
 */
export function drawVehiclePreview(ctx, id, cx, cy, widthPx, t = 0, opts = {}) {
  const { v, vs } = fakeVehicle(id, VEHICLES[id]);
  // sınır kutusu (m)
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of vs.parts) { x0 = Math.min(x0, p.x - p.w / 2); x1 = Math.max(x1, p.x + p.w / 2); y0 = Math.min(y0, p.y - p.h / 2); y1 = Math.max(y1, p.y + p.h / 2); }
  for (const w of v.wheels) { const r = w.r; x0 = Math.min(x0, w.x - r); x1 = Math.max(x1, w.x + r); y0 = Math.min(y0, w.y - r); y1 = Math.max(y1, w.y + r); }
  if (vs.trailer) for (const p of vs.trailer.parts) x0 = Math.min(x0, vs.trailer.hitch.x + p.x - p.w / 2);
  y1 = Math.max(y1, (vs.seat?.y ?? 1) + 0.9) + (id === 'zipir' ? 1.0 : 0.1);
  const s = widthPx / (x1 - x0), px = 1 / (s * (opts.dpr ?? 1));
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, -s); ctx.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  // hafif oturuş + tekerlek dönüşü
  const bob = Math.sin(t * 3) * 0.025;
  v.y += bob; v.a = Math.sin(t * 1.4) * 0.012;
  const ca = Math.cos(v.a), sa = Math.sin(v.a);
  vs.wheels.forEach((d) => { const w = v.wheels.find((q) => q.id === d.id && !q.trailer); if (!w) return; w.x = v.x + d.x * ca - (d.y - 0.04 - bob * 0) * sa; w.y = v.y + d.x * sa + (d.y - 0.04) * ca - bob; w.a = -t * 3 / w.r * 0.5; w.spin = 0; });
  v.wheels.forEach((w) => { if (w.trailer) { w.a = -t * 1.5; w.y -= 0; } });
  if (v.trailer) v.trailer.y += bob * 0;
  drawVehicleBack(ctx, v, vs, px, t);
  if (opts.driver !== false) {
    const rs = vs.seat ?? { x: 0.5, y: 0.95 };
    const T = { x: v.x + rs.x * ca - rs.y * sa, y: v.y + rs.x * sa + rs.y * ca, a: v.a, w: 0.35, h: 0.55 };
    drawDriver(ctx, { state: 'seated', torso: T, head: { x: T.x - Math.sin(v.a) * 0.45, y: T.y + Math.cos(v.a) * 0.45, a: v.a, r: 0.17 } }, px, t);
  }
  drawVehicleFront(ctx, v, vs, px, t);
  ctx.restore();
}
