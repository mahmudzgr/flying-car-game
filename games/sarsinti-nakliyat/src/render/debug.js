// Hata ayıklama çizimi: fizik şekillerini doğrudan snapshot'tan çizer. Sahip: Çekirdek.
// Dünya dönüşümünde (y yukarı, metre) çağrılır; yalnızca ara değerlenmiş snapshot ile.
export function drawDebug(ctx, st, s, px) {
  ctx.lineWidth = 1.5 * px;
  ctx.strokeStyle = '#00c8ff';
  const v = s.vehicle;
  for (const p of st.vehicle.parts) {
    ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.a);
    ctx.strokeRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h); ctx.restore();
  }
  ctx.strokeStyle = '#ffcc00';
  for (const w of v.wheels) {
    ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, 6.2832); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + Math.cos(w.a) * w.r, w.y + Math.sin(w.a) * w.r); ctx.stroke();
  }
  ctx.strokeStyle = '#ff5fa0';
  for (const c of s.cargo) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
    if (c.r > 0) { ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.2832); ctx.stroke(); } else ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  }
  ctx.strokeStyle = '#7cff6a';
  for (const o of s.objects) {
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
    if (o.r > 0) { ctx.beginPath(); ctx.arc(0, 0, o.r, 0, 6.2832); ctx.stroke(); } else ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.restore();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(s.driver.head.x, s.driver.head.y, s.driver.head.r, 0, 6.2832); ctx.stroke();
  ctx.save(); ctx.translate(s.driver.torso.x, s.driver.torso.y); ctx.rotate(s.driver.torso.a);
  ctx.strokeRect(-s.driver.torso.w / 2, -s.driver.torso.h / 2, s.driver.torso.w, s.driver.torso.h); ctx.restore();
}
