// Sarsıntı Nakliyat — giriş noktası: modülleri bağlar, oyun durum makinesini ve ana döngüyü yürütür.
// Sahip: Çekirdek. Durumlar: boot → menu → loading → playing ⇄ paused → result → (loading | menu).
// Ayrıntı: docs/MIMARI.md §8.
import { SIM } from './config.js';
import { createSim } from './sim/sim.js';
import { levelReward } from './sim/economy.js';
import { CAMPAIGN, getLevel } from './data/levels/index.js';
import { createInput } from './input.js';
import { createSave } from './save.js';
import { createRenderer } from './render/index.js';
import { createAudio } from './audio/index.js';
import { createUI } from './ui/index.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('game');
const save = createSave(); save.load();
const input = createInput(window);
const audio = createAudio();
const renderer = createRenderer(canvas, { debug: params.has('debug'), shake: save.data.settings.shake, quality: save.data.settings.quality });

let state = 'boot';
let sim = null, level = null, snap = null;
let acc = 0, last = performance.now(), resultTimer = 0, pendingEnd = null;

function emitLocal(name, data = {}) {      // sim dışı olaylar: pause/resume/purchase/upgrade/ui:*
  const e = { name, t: sim?.time ?? 0, ...data };
  audio.onEvent(e); ui.onEvent(e); renderer.onEvent(e);
}

/** Bölümü (ya da menü arka planı için boş bir sim'i) kurar. Eski sim yok edilir. */
function loadLevel(levelId, { idle = false } = {}) {
  sim?.destroy();
  level = getLevel(levelId);
  const rec = save.data.vehicles[save.data.vehicle];
  sim = createSim({
    level, vehicleId: save.data.vehicle, upgrades: rec.up,
    settings: { assistLanding: save.data.settings.assistLanding },
    bestScore: save.data.levels[levelId]?.best ?? 0,
  });
  if (sim.warnings.length) console.warn('[sim]', ...sim.warnings);
  renderer.setLevel(sim.static);
  acc = 0; pendingEnd = null; resultTimer = 0;
  if (!idle) sim.on('*', onSimEvent);
  snap = sim.snapshot();
  if (!idle) audio.music(level.music ?? null);
}

function onSimEvent(e) {
  renderer.onEvent(e); audio.onEvent(e); ui.onEvent(e);
  if (e.name === 'levelEnd') pendingEnd = e;
  if (e.name === 'cargoDamage' || e.name === 'driverEject' || e.name === 'bodyHit') {
    if (save.data.settings.haptics && navigator.vibrate) navigator.vibrate(e.name === 'driverEject' ? 60 : 15);
  }
}

function finishLevel(e) {
  const prev = save.data.levels[level.id] ?? { stars: 0, best: 0, bestTime: 0, tries: 0 };
  const win = e.result === 'win';
  const reward = win ? levelReward(level.reward ?? { base: 60 }, e, prev.stars) : { total: e.pickups };
  save.update((d) => {
    const r = (d.levels[level.id] ??= { stars: 0, best: 0, bestTime: 0, tries: 0 });
    r.tries++;
    if (win) { r.stars = Math.max(r.stars, e.stars); r.best = Math.max(r.best, e.score); r.bestTime = r.bestTime ? Math.min(r.bestTime, e.time) : e.time; }
    d.coins += reward.total;
    d.stats.distance += e.distance; d.stats.flips += e.flips; d.stats.cargoDelivered += e.cargoDelivered;
    d.stats.cargoLost += e.cargoLost; d.stats.crashes += win ? 0 : 1; d.stats.playTime += e.time;
  });
  save.flush();
  state = 'result';
  ui.show('result', { result: e, reward, level });
}

const flow = {
  startLevel(levelId) { state = 'loading'; loadLevel(levelId); state = 'playing'; ui.show('hud'); audio.unlock(); },
  retry() { if (level) flow.startLevel(level.id); },
  nextLevel() {
    const i = CAMPAIGN.findIndex((l) => l.id === level?.id);
    if (i >= 0 && CAMPAIGN[i + 1]) flow.startLevel(CAMPAIGN[i + 1].id); else flow.toMenu();
  },
  pause() { if (state !== 'playing') return; state = 'paused'; input.reset(); audio.suspend(); emitLocal('pause'); ui.show('pause'); },
  resume() { if (state !== 'paused') return; state = 'playing'; last = performance.now(); audio.resume(); emitLocal('resume'); ui.show('hud'); },
  toMenu() { state = 'menu'; input.reset(); audio.music('menu'); audio.resume(); loadLevel(CAMPAIGN[0].id, { idle: true }); ui.show('menu'); },
};
const ui = createUI({ root: document.getElementById('ui'), input, save, flow, levels: CAMPAIGN });

input.onAction((a) => {
  if (a === 'pause') { if (state === 'playing') flow.pause(); else if (state === 'paused') flow.resume(); }
  else if (a === 'retry' && (state === 'playing' || state === 'paused' || state === 'result')) flow.retry();
  else if (a === 'confirm' && state === 'menu') flow.startLevel(CAMPAIGN[0].id);
  else if (a === 'confirm' && state === 'result') flow.retry();
  else if (a === 'mute') { const s = save.data.settings; s.sfx = s.sfx ? 0 : 1; s.music = s.music ? 0 : 0.7; audio.setVolumes({ sfx: s.sfx, music: s.music }); save.save(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) flow.pause(); });
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => audio.unlock(), { once: true });
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('orientationchange', () => renderer.resize());
audio.setVolumes({ sfx: save.data.settings.sfx, music: save.data.settings.music });

function frame(now) {
  const raw = Math.min((now - last) / 1000, SIM.maxFrameDt); last = now;
  if (sim && (state === 'playing' || state === 'result' || state === 'menu')) {
    if (state !== 'menu') {
      acc += raw * (snap?.timeScale ?? 1);
      const inp = state === 'playing' ? input.read() : { throttle: 0, brake: 0 };
      while (acc >= SIM.step) { sim.step(inp); acc -= SIM.step; }
    }
    snap = sim.snapshot();
    renderer.render(snap, state === 'menu' ? 1 : acc / SIM.step, raw);
    if (state === 'playing') {
      ui.hudUpdate(snap);
      audio.setEngine({ vehicleId: snap.vehicle.id, rpm01: snap.vehicle.rpm, throttle: snap.vehicle.throttle, load: snap.vehicle.load, onGround: !snap.vehicle.airborne });
    }
    if (pendingEnd && state === 'playing') { resultTimer += raw; if (resultTimer > (pendingEnd.result === 'win' ? 1.0 : 0.5)) { const e = pendingEnd; pendingEnd = null; finishLevel(e); } }
  }
  requestAnimationFrame(frame);
}

flow.toMenu();
requestAnimationFrame((t) => { last = t; frame(t); });

if (params.has('debug')) window.__sarsinti = { get state() { return state; }, get sim() { return sim; }, get snap() { return snap; }, flow, input, save, renderer };
