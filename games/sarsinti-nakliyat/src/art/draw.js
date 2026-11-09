// Saf çizim fonksiyonları (STUB: düz şekiller). Sahip: Grafik — bu dosyayı bölüp zenginleştirebilirler, imzalar sabit kalmalı.
// KOORDİNAT KURALI: ctx şu an DÜNYA dönüşümünde: 1 birim = 1 metre, y YUKARI, açı CCW. Metin çizmeyin
// (ya da ctx.scale(1,-1) ile kendi yerelinizde çevirin). `px` = bir ekran pikselinin metre karşılığı (sabit kalınlıklı çizgi için).
// Verilen pozlar (x,y,a) ara değerlenmiş ve görsel olarak kullanıma hazırdır (alfa'yı renderer uygular).
import { BIOMES, SURFACE_TOP, INK, CARGO_COLORS, VEHICLE_COLORS } from './palette.js';

const stroke = (ctx, px, w = 2) => { ctx.lineWidth = w * px; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); };

/** Gökyüzü: ekranı kaplar; dünya dönüşünden BAĞIMSIZ (ekran pikselleri). @param {{w:number,h:number}} view css px */
export function drawSky(ctx, biome, view) {
  const b = BIOMES[biome] ?? BIOMES.elma;
  const g = ctx.createLinearGradient(0, 0, 0, view.h);
  g.addColorStop(0, b.sky[0]); g.addColorStop(1, b.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
}

/** Parallax katmanı (ekran pikselleri). layer: 0 uzak, 1 orta, 2 yakın; camX metre. STUB: dalgalı silüet. */
export function drawParallax(ctx, biome, layer, camX, view, scale) {
  const b = BIOMES[biome] ?? BIOMES.elma;
  const f = [0.15, 0.35, 0.6][layer];
  ctx.fillStyle = layer === 0 ? b.far : b.mid;
  ctx.globalAlpha = layer === 2 ? 0.6 : 1;
  ctx.beginPath(); ctx.moveTo(0, view.h);
  for (let x = 0; x <= view.w; x += 16) {
    const wx = x + camX * scale * f;
    ctx.lineTo(x, view.h * (0.62 + layer * 0.08) - Math.sin(wx * 0.008 * (layer + 1)) * (28 - layer * 7));
  }
  ctx.lineTo(view.w, view.h); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}

/** Zemin: poliçizgi + dolgu. @param {{terrain:{xs:number[],ys:number[],surf:string[]},biome:string,bounds:object}} st @param {{x0:number,x1:number}} range görünen x aralığı (m) */
export function drawTerrain(ctx, st, range, px) {
  const { xs, ys, surf } = st.terrain, b = BIOMES[st.biome] ?? BIOMES.elma;
  const bottom = st.bounds.minY - 30;
  ctx.fillStyle = b.fill;
  ctx.beginPath(); ctx.moveTo(xs[0], bottom);
  for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.lineTo(xs[xs.length - 1], bottom); ctx.closePath(); ctx.fill();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < xs.length - 1; i++) {
    if (xs[i + 1] < range.x0 - 2 || xs[i] > range.x1 + 2) continue;
    ctx.beginPath(); ctx.moveTo(xs[i], ys[i]); ctx.lineTo(xs[i + 1], ys[i + 1]);
    ctx.strokeStyle = SURFACE_TOP[surf[i]] ?? b.top; ctx.lineWidth = 7 * px; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.lineWidth = 2.5 * px; ctx.strokeStyle = INK; ctx.stroke();
}

/** Bitiş/başlangıç çizgisi (bayrak). */
export function drawFinish(ctx, x, y, px, label = 'finish') {
  ctx.fillStyle = INK; ctx.fillRect(x - 0.05, y, 0.1, 4);
  ctx.fillStyle = label === 'finish' ? '#ffffff' : '#19b5a5';
  ctx.beginPath(); ctx.rect(x + 0.05, y + 2.6, 1.8, 1.2); ctx.fill(); stroke(ctx, px);
}

/** Araç: şasi parçaları + tekerlekler. v = snapshot.vehicle (ara değerlenmiş), vs = static.vehicle. */
export function drawVehicle(ctx, v, vs, px) {
  const col = VEHICLE_COLORS[v.id] ?? '#19b5a5';
  ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a);
  for (const p of vs.parts) {
    ctx.beginPath(); ctx.rect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    ctx.fillStyle = p.part === 'roof' ? '#2a2230' : p.part === 'cab' ? '#ffffffaa' : col; ctx.fill(); stroke(ctx, px);
  }
  ctx.restore();
  for (const w of v.wheels) {
    ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.a);
    ctx.beginPath(); ctx.arc(0, 0, w.r, 0, 6.2832); ctx.fillStyle = '#3a3340'; ctx.fill(); stroke(ctx, px);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w.r * 0.85, 0); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2 * px; ctx.stroke();
    ctx.restore();
  }
}

/** Sürücü Fındık. d = snapshot.driver. */
export function drawDriver(ctx, d, px) {
  const t = d.torso, h = d.head;
  ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
  ctx.beginPath(); ctx.rect(-t.w / 2, -t.h / 2, t.w, t.h); ctx.fillStyle = '#ff8a3c'; ctx.fill(); stroke(ctx, px); ctx.restore();
  ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.2832); ctx.fillStyle = '#ffd23c'; ctx.fill(); stroke(ctx, px);
}

/** Kargo parçası. c = snapshot.cargo[i] (state 'lost' ise soluk çiz). */
export function drawCargo(ctx, c, px) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
  ctx.globalAlpha = c.state === 'lost' ? 0.45 : 1;
  ctx.beginPath();
  if (c.r > 0) ctx.arc(0, 0, c.r, 0, 6.2832); else ctx.rect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.fillStyle = CARGO_COLORS[c.type] ?? '#ccc'; ctx.fill(); stroke(ctx, px);
  ctx.restore();
}

/** Dinamik nesne (varil, kaya...). o = snapshot.objects[i]. */
export function drawObject(ctx, o, px) {
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
  ctx.beginPath();
  if (o.r > 0) ctx.arc(0, 0, o.r, 0, 6.2832); else ctx.rect(-o.w / 2, -o.h / 2, o.w, o.h);
  ctx.fillStyle = o.type === 'rock' ? '#8a8078' : '#c0453c'; ctx.fill(); stroke(ctx, px);
  ctx.restore();
}

/** Madeni kuruş. */
export function drawCoin(ctx, k, px, t = 0) {
  ctx.beginPath(); ctx.arc(k.x, k.y, 0.25, 0, 6.2832); ctx.fillStyle = '#ffd23c'; ctx.fill(); stroke(ctx, px, 1.5);
}
