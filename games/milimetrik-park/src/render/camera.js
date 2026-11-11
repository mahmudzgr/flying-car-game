// Milimetrik Park — kamera: kuzey sabit ya da araçla dönen takip, hıza göre yakınlaşma, harita görünümü.
const TAU = Math.PI * 2;
const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const ease = (k, dt) => 1 - Math.exp(-k * dt);

export function createCamera() {
  const cam = {
    x: 0, y: 0, rot: 0, scale: 30,
    mode: 'north',          // 'north' | 'follow'
    zoom: 1,                // kullanıcı yakınlaştırması (0.6–1.8)
    overview: false,        // harita (bölümün tamamı)
    focusY: 0.47,           // ekranda aracın dikey konumu (oran)
    vw: 1, vh: 1,
    introT: 0,

    baseScale() {
      const short = Math.min(cam.vw, cam.vh);
      const carPx = Math.min(short * 0.25, 170);
      return carPx / 4.15;
    },

    fitScale(level) {
      return Math.min(cam.vw / (level.w + 2), cam.vh / (level.h + 2));
    },

    /** Bölüm başında: önce harita, sonra araca süzülür. */
    reset(game, intro = true) {
      const L = game.level;
      if (intro) {
        cam.x = L.w / 2; cam.y = L.h / 2; cam.scale = cam.fitScale(L); cam.rot = 0;
        cam.introT = 1.1;
      } else {
        const c = game.center();
        cam.x = c.x; cam.y = c.y; cam.scale = cam.baseScale() * cam.zoom;
        cam.rot = cam.mode === 'follow' ? -game.body.a - Math.PI / 2 : 0;
        cam.introT = 0;
        for (let i = 0; i < 60; i++) cam.update(0.1, game);
      }
    },

    update(dt, game) {
      if (!game) return;
      const L = game.level, b = game.body, car = game.car;
      if (cam.introT > 0) { cam.introT -= dt; return; }
      let tx, ty, ts, tr = 0;
      if (cam.overview) {
        tx = L.w / 2; ty = L.h / 2; ts = cam.fitScale(L);
      } else {
        const c = game.center();
        const lead = 0.45, lx = b.vx * lead, ly = b.vy * lead, lm = Math.hypot(lx, ly), lk = lm > 3.5 ? 3.5 / lm : 1;
        tx = c.x + lx * lk; ty = c.y + ly * lk;
        // hedef yakınsa onu da kadraja al
        const t = game.targets.length === 1 ? game.targets[0] : null;
        if (t) {
          const d = Math.hypot(t.x - c.x, t.y - c.y);
          if (d < 14) { const w = 0.3 * (1 - d / 14); tx += (t.x - tx) * w; ty += (t.y - ty) * w; }
        }
        ts = (cam.baseScale() * cam.zoom) / (1 + car.speed / 14);
        if (cam.mode === 'follow') tr = -b.a - Math.PI / 2;
      }
      if (!cam.overview && cam.mode === 'north') {
        // görüş alanı bölüm sınırlarını aşmasın (bölüm görüşten küçükse ortala)
        const hw = cam.vw / 2 / ts, hTop = (cam.vh * cam.focusY) / ts, hBot = (cam.vh * (1 - cam.focusY)) / ts, m = 1.2;
        tx = L.w + 2 * m <= hw * 2 ? L.w / 2 : Math.max(hw - m, Math.min(L.w + m - hw, tx));
        ty = L.h + 2 * m <= hTop + hBot ? L.h / 2 + (hTop - hBot) / 2 : Math.max(hTop - m, Math.min(L.h + m - hBot, ty));
      }
      const kp = ease(cam.overview ? 4 : 6, dt), ks = ease(3.2, dt), kr = ease(4, dt);
      cam.x += (tx - cam.x) * kp;
      cam.y += (ty - cam.y) * kp;
      cam.scale += (ts - cam.scale) * ks;
      cam.rot += wrap(tr - cam.rot) * kr;
    },

    /** Dünya → ekran (css px). */
    toScreen(x, y, out = {}) {
      const c = Math.cos(cam.rot), s = Math.sin(cam.rot), dx = x - cam.x, dy = y - cam.y;
      out.x = cam.vw / 2 + (c * dx - s * dy) * cam.scale;
      out.y = cam.vh * cam.focusY + (s * dx + c * dy) * cam.scale;
      return out;
    },

    /** Canvas dönüşümü (dpr dahil). */
    apply(ctx, dpr) {
      const c = Math.cos(cam.rot) * cam.scale * dpr, s = Math.sin(cam.rot) * cam.scale * dpr;
      const fx = cam.vw / 2 * dpr, fy = cam.vh * cam.focusY * dpr;
      ctx.setTransform(c, s, -s, c, fx - (c * cam.x - s * cam.y), fy - (s * cam.x + c * cam.y));
    },

    /** Görünür dünya alanının sınır kutusu (dönüşte de kapsar). */
    bounds() {
      const hw = cam.vw / cam.scale, hh = cam.vh / cam.scale;
      const r = Math.hypot(hw, hh) * 0.6 + 2;
      return { minx: cam.x - r, miny: cam.y - r, maxx: cam.x + r, maxy: cam.y + r };
    },
  };
  return cam;
}
