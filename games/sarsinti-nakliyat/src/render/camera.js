// Kamera (STUB: yumuşak takip + ileri bakış). Sahip: Grafik. Birim: metre; y yukarı.
import { CAMERA } from '../config.js';

export function createCamera() {
  const cam = { x: 0, y: 0, width: CAMERA.widthMin };
  let init = false;
  return {
    cam,
    reset() { init = false; },
    /** @param v interpolated snapshot.vehicle  @param dt gerçek saniye  @param aspect w/h */
    update(v, dt, aspect) {
      const speedK = Math.min(1, v.speed / 20);
      const targetW = CAMERA.widthMin + (CAMERA.widthMax - CAMERA.widthMin) * speedK;
      const tx = v.x + Math.max(-1, Math.min(1, v.vx / 15)) * CAMERA.lookAhead * cam.width - (CAMERA.anchorX - 0.5) * cam.width;
      const ty = v.y + 1.5;
      const k = init ? 1 - Math.pow(0.5, dt / CAMERA.followHalfLife) : 1;
      cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.width += (targetW - cam.width) * k;
      init = true;
      return cam;
    },
  };
}
