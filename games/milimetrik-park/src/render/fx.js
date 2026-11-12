// Milimetrik Park — ortam efektleri: gece ışık haritası (lambalar, farlar, stop lambaları) ve yağmur.
// Işık haritası yarım çözünürlükte çizilir: karanlık bir katmana ışıklar "delik" olarak açılır, sonra
// sahnenin üstüne konur; ışık kaynaklarına toplamalı parıltı eklenir.

export function createFx() {
  let lc = null, lx = null;
  const drops = [];
  let ripples = [];
  let dropsN = 0;

  function ensure(w, h) {
    if (!lc) { lc = document.createElement('canvas'); lx = lc.getContext('2d'); }
    const W = Math.max(1, Math.round(w / 2)), H = Math.max(1, Math.round(h / 2));
    if (lc.width !== W || lc.height !== H) { lc.width = W; lc.height = H; }
  }

  function hole(x, y, r, k = 1) {
    const g = lx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${k})`);
    g.addColorStop(0.45, `rgba(0,0,0,${k * 0.7})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = g;
    lx.beginPath(); lx.arc(x, y, r, 0, Math.PI * 2); lx.fill();
  }

  /** Far konisi: (x,y) kaynağı, a yönü, L uzunluk, açıklık yarım açısı. */
  function beam(x, y, a, L, half, k) {
    const g = lx.createRadialGradient(x, y, 0.2, x, y, L);
    g.addColorStop(0, `rgba(0,0,0,${k})`);
    g.addColorStop(0.55, `rgba(0,0,0,${k * 0.75})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = g;
    lx.beginPath();
    lx.moveTo(x + Math.cos(a + Math.PI / 2) * 0.15, y + Math.sin(a + Math.PI / 2) * 0.15);
    lx.lineTo(x + Math.cos(a + half) * L, y + Math.sin(a + half) * L);
    lx.arc(x, y, L, a + half, a - half, true);
    lx.lineTo(x + Math.cos(a - Math.PI / 2) * 0.15, y + Math.sin(a - Math.PI / 2) * 0.15);
    lx.closePath();
    lx.fill();
  }

  /**
   * Işık kaynakları: {lamps:[{x,y,r,color,k}], cars:[{x,y,a,len,wid,head,brake,rev}]}
   * cam.apply ile dünya dönüşümü kurulur.
   */
  function night(ctx, canvas, cam, dpr, env, sources, time) {
    if (!env.dark) return;
    ensure(canvas.width, canvas.height);
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, lc.width, lc.height);
    lx.fillStyle = `rgba(5,9,22,${env.dark})`;
    lx.fillRect(0, 0, lc.width, lc.height);
    lx.globalCompositeOperation = 'destination-out';
    cam.apply(lx, dpr * 0.5);
    for (const l of sources.lamps) hole(l.x, l.y, l.r, l.k ?? 1);
    for (const c of sources.cars) {
      const ca = Math.cos(c.a), sa = Math.sin(c.a);
      const fx = c.x + ca * (c.len / 2), fy = c.y + sa * (c.len / 2);
      if (c.head) {
        for (const s of [-1, 1]) {
          const hx = fx - sa * s * (c.wid / 2 - 0.3), hy = fy + ca * s * (c.wid / 2 - 0.3);
          beam(hx, hy, c.a + s * 0.04, c.headLen || 15, 0.36, 0.95);
        }
        hole(fx + ca * 2, fy + sa * 2, 3.2, 0.6);
      }
      const bx = c.x - ca * (c.len / 2), by = c.y - sa * (c.len / 2);
      hole(bx - ca * 0.6, by - sa * 0.6, c.brake ? 2.2 : 1.3, c.brake ? 0.55 : 0.3);
      if (c.rev) hole(bx - ca * 1.8, by - sa * 1.8, 3.6, 0.7);
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lc, 0, 0, canvas.width, canvas.height);
    // parıltılar
    ctx.globalCompositeOperation = 'lighter';
    cam.apply(ctx, dpr);
    for (const l of sources.lamps) {
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, Math.min(2.4, l.r * 0.35));
      g.addColorStop(0, `rgba(${l.color},0.55)`); g.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, Math.min(2.4, l.r * 0.35), 0, Math.PI * 2); ctx.fill();
    }
    for (const c of sources.cars) {
      const ca = Math.cos(c.a), sa = Math.sin(c.a);
      if (c.head) for (const s of [-1, 1]) {
        const hx = c.x + ca * (c.len / 2) - sa * s * (c.wid / 2 - 0.3), hy = c.y + sa * (c.len / 2) + ca * s * (c.wid / 2 - 0.3);
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 0.9);
        g.addColorStop(0, 'rgba(255,248,220,0.7)'); g.addColorStop(1, 'rgba(255,248,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 0.9, 0, Math.PI * 2); ctx.fill();
      }
      for (const s of [-1, 1]) {
        const tx = c.x - ca * (c.len / 2) - sa * s * (c.wid / 2 - 0.25), ty = c.y - sa * (c.len / 2) + ca * s * (c.wid / 2 - 0.25);
        const r = c.brake ? 0.9 : 0.5;
        const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, r);
        g.addColorStop(0, `rgba(255,30,20,${c.brake ? 0.85 : 0.45})`); g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    void time;
  }

  /** Yağmur: ekran uzayında damlalar. */
  function rain(ctx, canvas, dpr, dt, quality) {
    const want = quality === 'low' ? 70 : 190;
    if (dropsN !== want) {
      drops.length = 0; dropsN = want;
      for (let i = 0; i < want; i++) drops.push({ x: Math.random(), y: Math.random(), l: 0.5 + Math.random() * 0.5, v: 0.9 + Math.random() * 0.5 });
    }
    const w = canvas.width, h = canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(205,220,240,0.32)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    for (const d of drops) {
      d.y += dt * d.v * 1.6; d.x += dt * d.v * 0.25;
      if (d.y > 1.05) { d.y -= 1.1; d.x = Math.random(); }
      if (d.x > 1.05) d.x -= 1.1;
      const x = d.x * w, y = d.y * h, L = 26 * d.l * dpr;
      ctx.moveTo(x, y); ctx.lineTo(x - L * 0.15, y - L);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Su birikintisi halkaları (dünya). puddles: [{x,y,r}] */
  function ripplesDraw(ctx, puddles, dt) {
    if (puddles.length && Math.random() < dt * 10) {
      const p = puddles[Math.floor(Math.random() * puddles.length)];
      const a = Math.random() * Math.PI * 2, d = Math.random() * p.r * 0.7;
      ripples.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, t: 0 });
    }
    ripples = ripples.filter((r) => (r.t += dt) < 0.8);
    ctx.lineWidth = 0.03;
    for (const r of ripples) {
      ctx.strokeStyle = `rgba(210,225,240,${0.45 * (1 - r.t / 0.8)})`;
      ctx.beginPath(); ctx.arc(r.x, r.y, 0.05 + r.t * 0.35, 0, Math.PI * 2); ctx.stroke();
    }
  }

  return { night, rain, ripples: ripplesDraw };
}
