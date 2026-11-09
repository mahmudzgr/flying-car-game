// Renderer (STUB — düz şekiller). Sahip: Grafik. API sabittir (MIMARI §7); içi serbestçe değiştirilebilir.
import { CAMERA } from '../config.js';
import { createCamera } from './camera.js';
import { interpolateSnapshot } from './interp.js';
import { drawDebug } from './debug.js';
import { drawSky, drawParallax, drawTerrain, drawFinish, drawVehicle, drawDriver, drawCargo, drawObject, drawCoin } from '../art/draw.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{debug?:boolean, quality?:'high'|'low', shake?:0|1|2}} [opts]
 */
export function createRenderer(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const camera = createCamera();
  let st = null, view = { w: 1, h: 1, dpr: 1 }, out = {}, shakeAmt = 0;
  const o = { debug: !!opts.debug, quality: opts.quality ?? 'high', shake: opts.shake ?? 2 };

  function resize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, CAMERA.maxDpr);
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    view = { w, h, dpr };
  }
  resize();

  return {
    /** Bölüm başında bir kez: sim.static. */
    setLevel(staticSnap) { st = staticSnap; camera.reset(); shakeAmt = 0; },
    /** @param snap sim.snapshot()  @param alpha 0..1 adım arası  @param dt gerçek sn */
    render(snap, alpha, dt) {
      if (!st) return;
      const s = interpolateSnapshot(snap, alpha, out); out = s;
      const cam = camera.update(s.vehicle, dt, view.w / view.h);
      const scale = view.w / cam.width, px = 1 / scale;
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      drawSky(ctx, st.biome, view);
      for (let l = 0; l < 2; l++) drawParallax(ctx, st.biome, l, cam.x, view, scale);
      const sh = shakeAmt > 0.01 ? shakeAmt : 0; shakeAmt *= Math.pow(0.001, dt);
      const jx = sh ? (Math.random() - 0.5) * sh : 0, jy = sh ? (Math.random() - 0.5) * sh : 0;
      // dünya dönüşümü: y YUKARI. ekran = (dünya − kamera) * ölçek, y çevrili
      ctx.setTransform(view.dpr * scale, 0, 0, -view.dpr * scale, view.dpr * (view.w / 2 - cam.x * scale + jx), view.dpr * (view.h / 2 + cam.y * scale + jy));
      const range = { x0: cam.x - cam.width / 2, x1: cam.x + cam.width / 2 };
      drawTerrain(ctx, st, range, px);
      drawFinish(ctx, st.startX + 1, st.startY, px, 'start');
      drawFinish(ctx, st.finishX, st.finishY, px, 'finish');
      for (const k of s.coins) if (!k.taken) drawCoin(ctx, k, px, s.t);
      for (const ob of s.objects) drawObject(ctx, ob, px);
      drawDriver(ctx, s.driver, px);
      drawVehicle(ctx, s.vehicle, st.vehicle, px);
      for (const c of s.cargo) drawCargo(ctx, c, px);
      if (o.debug) drawDebug(ctx, st, s, px);
    },
    /** Sim olayı: e = {name, t, ...yük}. Partikül/sarsıntı/flaş buradan tetiklenir. */
    onEvent(e) {
      if (o.shake && (e.name === 'bodyHit' || e.name === 'land')) shakeAmt = Math.max(shakeAmt, Math.min(10, (e.speed ?? e.impactSpeed ?? 0) * 0.8) * (o.shake / 2));
    },
    resize,
    setOptions(p) { Object.assign(o, p); },
    destroy() { st = null; },
  };
}
