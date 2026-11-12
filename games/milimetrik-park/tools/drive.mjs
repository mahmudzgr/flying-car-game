// Milimetrik Park — planlayıcı çözümünü sürüş koluyla gerçek fizikte süren yardımcı (bot.mjs ve hata ayıklama için).
import { DT } from '../src/config.js';
import { createGame } from '../src/sim/game.js';

const DEAD = 0.06;
function leverFor(vt, dir) {
  const a = dir > 0 ? Math.pow(Math.max(0, vt - 0.12) / 10.5, 1 / 2.2) : Math.sqrt(Math.max(0, vt - 0.12) / 4.3);
  return dir * (DEAD + 0.002 + a * (1 - DEAD));
}

/**
 * Planlayıcı çözümünü sürüş koluyla gerçek fizikte süren sürücü: dur → direksiyonu çevir → kolla sürün → dur.
 * run() birden çok kez çağrılabilir (kaldığı yerden sürer); run(A); run(B) ile run([...A, ...B]) aynı sonucu verir.
 * {reset: 1} işaretli parça: dur ve mesafe devrini sıfırla (o noktadan yeniden planlandığını gösterir).
 */
export const driveStats = { errSum: 0, errN: 0 };
export function createDriver(level, opts = {}) {
  const game = createGame(level, { scheme: 'lever', noAgents: true, ...opts });
  const car = game.car;
  const raw = { lever: 0, steerAbs: 0, steerDir: 0, autoCenter: false, handbrake: false };
  const step = (n = 1) => { for (let i = 0; i < n; i++) game.step(raw); };
  const stop = () => { raw.lever = 0; let k = 0; while ((Math.abs(car.vLong) > 0.003 || car.brake < 0.9) && k++ < 2400) step(); };
  let carry = 0, lastDir = 0;
  return {
    game,
    get lastDir() { return lastDir; },
    run(segments) {
      for (const sg of segments) {
        if (game.status !== 'play') return;
        if (sg.reset) { stop(); carry = 0; continue; }
        stop();
        raw.steerAbs = sg.steer;
        let k = 0;
        while (Math.abs(car.steer - sg.steer) > 0.001 && k++ < 2400) step();
        // kolla sürün; yumuşak yavaşla, duruş mesafesini tahmin edip kolu bırak, durana kadar yolu say.
        // Aynı yöndeki bir önceki parçanın fazlası/eksiği bu parçadan düşülür.
        const len = sg.len - (sg.dir === lastDir ? carry : 0);
        let dist = 0, braking = false; k = 0;
        while (k++ < 240 * 80) {
          const v = Math.abs(car.vLong), remain = len - dist;
          if (!braking && remain <= (v * v) / (2 * (2.6 * v + 0.5)) + 0.085 * v + 0.002) braking = true;
          if (braking && v < 0.003 && car.brake > 0.9) break;
          raw.lever = braking ? 0 : leverFor(Math.min(1.0, Math.sqrt(2 * 0.35 * Math.max(0, remain)) + 0.03), sg.dir);
          step();
          dist += Math.abs(car.vLong) * DT;
        }
        carry = dist - len; lastDir = sg.dir;
        driveStats.errSum += Math.abs(dist - len); driveStats.errN++;
      }
    },
    /** Durmuş aracın pozu (planlayıcının start biçiminde). */
    pose() {
      const c = game.center();
      return { x: c.x, y: c.y, a: game.body.a, phi: game.trailer ? game.trailer.a : undefined };
    },
    finish() {
      if (game.status === 'play') { stop(); game.requestPark(); step(240); }
      return game;
    },
  };
}

export function drive(level, segments, opts = {}) {
  const d = createDriver(level, opts);
  d.run(segments);
  return d.finish();
}
