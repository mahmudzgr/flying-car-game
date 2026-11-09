// Kamera: hıza göre ileri bakış + yakınlaştırma, yumuşak takip, iniş sıçraması, havada bakış payı. Sahip: Grafik. Birim: metre; y yukarı.
import { CAMERA } from '../config.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function createCamera() {
  const cam = { x: 0, y: 0, width: CAMERA.widthMin };
  let init = false, anchor = 0.4, airK = 0, slowK = 0, bounce = 0, bvel = 0, lookY = 0;
  return {
    cam,
    reset() { init = false; bounce = 0; bvel = 0; airK = 0; slowK = 0; },
    /** İniş/çarpma: araç gövdesine kamera yayı vurur (v>0 yukarı). */
    kick(v) { bvel += v; },
    /** @param v interpolated snapshot.vehicle  @param dt gerçek saniye  @param aspect w/h  @param timeScale yavaş çekim çarpanı */
    update(v, dt, aspect, timeScale = 1) {
      const sp = v.speed ?? 0;
      const speedK = clamp(sp / 22, 0, 1);
      airK += ((v.airborne ? 1 : 0) - airK) * (1 - Math.pow(0.5, dt / 0.5));
      slowK += ((timeScale < 0.95 ? 1 : 0) - slowK) * (1 - Math.pow(0.5, dt / 0.12));
      let targetW = CAMERA.widthMin + (CAMERA.widthMax - CAMERA.widthMin) * speedK + airK * Math.min(3, Math.abs(v.vy ?? 0) * 0.25 + 0.8);
      targetW *= 1 - 0.07 * slowK;
      // ileri bakış: hızlandıkça araç ekranın soluna kayar; geri giderken sağa
      const dir = clamp((v.vx ?? 0) / 14, -1, 1);
      const targetAnchor = CAMERA.anchorX + 0.07 - CAMERA.lookAhead * 0.5 * Math.max(0, dir) + 0.18 * Math.max(0, -dir);
      const tx0 = v.x + (0.5 - anchor) * cam.width;
      const viewH = cam.width / aspect;
      lookY += (clamp((v.vy ?? 0) * 0.22, -3.2, 2.4) - lookY) * (1 - Math.pow(0.5, dt / 0.3));
      const ty = v.y + 0.14 * viewH + lookY;
      const kx = init ? 1 - Math.pow(0.5, dt / CAMERA.followHalfLife) : 1, ky = init ? 1 - Math.pow(0.5, dt / (CAMERA.followHalfLife * 1.3)) : 1;
      cam.x += (tx0 - cam.x) * kx; cam.y += (ty - cam.y) * ky;
      cam.width += (targetW - cam.width) * (init ? 1 - Math.pow(0.5, dt / 0.6) : 1);
      anchor += (targetAnchor - anchor) * (init ? 1 - Math.pow(0.5, dt / 0.5) : 1);
      // iniş yayı
      bvel += (-120 * bounce - 12 * bvel) * dt; bounce += bvel * dt;
      init = true;
      return cam;
    },
    get bounce() { return bounce; },
  };
}
