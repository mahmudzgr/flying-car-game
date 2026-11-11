// Milimetrik Park — giriş noktası: durum makinesi ve oyun döngüsü.
import { DT } from './config.js';
import { LEVELS, PLAYGROUND, levelById } from './levels/index.js';
import { createGame } from './sim/game.js';
import { createRenderer } from './render/renderer.js';
import { createCamera } from './render/camera.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createSave } from './save.js';
import { createUI } from './ui/ui.js';
import { createControls } from './ui/controls.js';

const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui');
const save = createSave();
save.load();
const S = () => save.data.settings;

const renderer = createRenderer(canvas);
const cam = createCamera();
const input = createInput();
const audio = createAudio();
audio.setEnabled(S().sound);

let game = null;
let level = null;
let mode = 'menu';            // 'menu' | 'brief' | 'play' | 'pause' | 'result'
let acc = 0;
let sens = null;
let hintT = 0;
let mapHeld = false;

const ui = createUI(uiRoot, {
  getSave: () => save.data,
  click: () => { audio.unlock(); audio.sfx('click'); },
  startLevel: (id) => openLevel(id),
  begin: () => begin(),
  toLevels: () => { leaveGame(); ui.show('levels'); },
  toHome: () => { leaveGame(); ui.show('home'); },
  resume: () => resume(),
  retry: () => retry(),
  next: () => next(),
  pause: () => pause(),
  backToPause: () => ui.show('pause', { level }),
  toggleCamera: () => toggleCamera(),
  setMap: (on) => { mapHeld = on; },
  setSetting: (k, v) => {
    save.data.settings[k] = v;
    save.save();
    applySettings();
  },
});

const controls = createControls(uiRoot, input);
controls.show(false);

function applySettings() {
  const s = S();
  controls.setMode(s.steer, s.touchLock);
  cam.mode = s.camera;
  audio.setEnabled(s.sound);
}
applySettings();

// ------------------------------------------------------------ akış

function loadGame(L) {
  level = L;
  game = createGame(L);
  renderer.setLevel(L);
  cam.reset(game, true);
  acc = 0;
}

function openLevel(id) {
  const L = levelById(id);
  if (!L) return;
  loadGame(L);
  mode = 'brief';
  ui.hud.show(false);
  controls.show(false);
  ui.show('brief', { level: L, index: LEVELS.indexOf(L) });
}

function begin() {
  mode = 'play';
  ui.show(null);
  ui.hud.show(true, level);
  controls.show(true);
  input.reset(); input.clearGears();
  hintT = 0;
  const first = !save.data.levels[level.id];
  setTimeout(() => {
    if (mode !== 'play') return;
    const kb = input.state.device === 'keyboard' && matchMedia('(hover: hover)').matches;
    ui.toast(kb ? 'Vitesi <b>D</b>\'ye al: <kbd>E</kbd> · geri için <kbd>Q</kbd>' : 'Vitesi <b>D</b>\'ye al, frenle hızını ayarla', 'info', first ? 4200 : 2600);
  }, 900);
}

function retry() {
  if (!level) return;
  loadGame(level);
  cam.reset(game, false);
  mode = 'play';
  ui.show(null);
  ui.hud.show(true, level);
  controls.show(true);
  input.reset(); input.clearGears();
}

function next() {
  const i = LEVELS.indexOf(level);
  if (i >= 0 && i < LEVELS.length - 1) openLevel(LEVELS[i + 1].id);
  else { leaveGame(); ui.show('levels'); }
}

function pause() {
  if (mode !== 'play') return;
  mode = 'pause';
  controls.show(false);
  ui.show('pause', { level });
}

function resume() {
  if (mode !== 'pause') return;
  mode = 'play';
  ui.show(null);
  controls.show(true);
  input.reset();
}

function leaveGame() {
  mode = 'menu';
  ui.hud.show(false);
  controls.show(false);
  showcase();
}

function toggleCamera() {
  const s = S();
  s.camera = s.camera === 'north' ? 'follow' : 'north';
  save.save();
  cam.mode = s.camera;
  ui.toast(s.camera === 'north' ? 'Kamera: kuzey sabit' : 'Kamera: araçla dönüyor', 'info', 1200);
}

/** Menü arkasında yavaşça dolaşan sahne. */
function showcase() {
  loadGame(LEVELS[1]);
  cam.introT = 0;
  cam.zoom = 1;
}

// ------------------------------------------------------------ olaylar

const GEAR_DENY = { 'park-speed': 'P için tamamen dur', 'dir-speed': 'Yön değiştirmek için önce dur', invalid: '' };

function handleEvents() {
  for (const e of game.events) {
    renderer.onEvent(e);
    switch (e.type) {
      case 'hit':
        if (e.kmh < 1) { audio.sfx('touch'); ui.toast('Sürttün!', 'warn', 1100); }
        else { audio.sfx('hit', e.kmh); ui.toast(`Çarptın! <small>${Math.round(e.kmh)} km/h</small>`, 'bad', 1500); shake(Math.min(1, e.kmh / 12)); }
        vibrate(e.kmh < 1 ? 10 : 40);
        break;
      case 'curb':
        audio.sfx('curb', e.kmh);
        if (e.kmh > 2.5) ui.toast('Kaldırım!', 'warn', 1000);
        vibrate(15);
        break;
      case 'stopper': audio.sfx('stopper', e.kmh); vibrate(8); break;
      case 'cone': audio.sfx('cone'); ui.toast('Koni!', 'warn', 1000); break;
      case 'gear': audio.sfx('gear'); break;
      case 'gearDenied': audio.sfx('deny'); if (GEAR_DENY[e.reason]) ui.toast(GEAR_DENY[e.reason], 'warn', 1300); break;
      case 'parkOutside': {
        const cm = e.eval ? Math.max(1, Math.round(e.eval.outBy * 100)) : 0;
        ui.toast(e.eval && e.eval.outBy < 1.5 ? `Park yerinin dışındasın <small>(${cm} cm taşıyor)</small>` : 'Burası park yeri değil', 'warn', 1800);
        break;
      }
      case 'parkWrongWay':
        ui.toast(e.eval.spot.facing === 'tail' ? 'Bu yere <b>geri geri</b> girmelisin' : 'Bu yere <b>burnuyla</b> girmelisin', 'warn', 2000);
        break;
      case 'parkFree': {
        const v = e.eval;
        audio.sfx('free');
        ui.toast(`İsabet <b>%${v.quality}</b> <small>açı ${v.angDeg.toFixed(1)}° · yanal ${Math.round(Math.abs(v.latCm))} cm</small>`, v.quality >= 95 ? 'good' : 'info', 2600);
        break;
      }
      case 'done': onDone(e.result); break;
      case 'fail': onFail(); break;
      default: break;
    }
  }
  game.events.length = 0;
}

let shakeAmt = 0;
function shake(k) { shakeAmt = Math.max(shakeAmt, k); }
function vibrate(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* yoksay */ } } }

function onDone(res) {
  const fresh = save.record(level.id, res);
  audio.sfx(res.perfect ? 'perfect' : 'park');
  controls.releaseAll();
  setTimeout(() => {
    if (!game || game.result !== res) return;
    mode = 'result';
    ui.hud.show(false);
    controls.show(false);
    const i = LEVELS.indexOf(level);
    ui.show('result', { level, res, fresh, hasNext: i >= 0 && i < LEVELS.length - 1 });
    res.stars.forEach((on, k) => { if (on) audio.sfx('star', k); });
  }, 900);
}

function onFail() {
  audio.sfx('fail');
  controls.releaseAll();
  setTimeout(() => {
    if (!game || game.status !== 'fail') return;
    mode = 'result';
    ui.hud.show(false);
    controls.show(false);
    ui.show('result', { level, fail: true });
  }, 1100);
}

input.onAction((a) => {
  audio.unlock();
  if (a === 'pause') { if (mode === 'play') pause(); else if (mode === 'pause') resume(); return; }
  if (a === 'retry' && (mode === 'play' || mode === 'pause' || mode === 'result')) { retry(); return; }
  if (a === 'camera' && mode === 'play') { toggleCamera(); return; }
  if (a === 'mute') { save.data.settings.sound = !S().sound; save.save(); applySettings(); return; }
  if (a === 'guides' && mode === 'play') { save.data.settings.guides = !S().guides; save.save(); ui.toast(S().guides ? 'Yörünge çizgileri açık' : 'Yörünge çizgileri kapalı', 'info', 1100); return; }
  if (a === 'zoomIn') cam.zoom = Math.min(1.8, cam.zoom * 1.2);
  if (a === 'zoomOut') cam.zoom = Math.max(0.55, cam.zoom / 1.2);
  if (a === 'confirm') {
    const btn = document.querySelector('.screens [data-focus]');
    if (btn && mode !== 'play') btn.click();
  }
});

canvas.addEventListener('wheel', (e) => {
  if (mode !== 'play') return;
  e.preventDefault();
  cam.zoom = Math.max(0.55, Math.min(1.8, cam.zoom * (e.deltaY > 0 ? 1 / 1.1 : 1.1)));
}, { passive: false });

for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') pause(); });

// ------------------------------------------------------------ döngü

function resize() { renderer.resize(cam); }
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

let last = performance.now();
let menuT = 0;
function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  const ctrl = input.read(dt);
  if (game) {
    if (mode === 'play') {
      if (ctrl.gear) game.requestGear(ctrl.gear);
      ctrl.autoCenter = S().autoCenter;
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 40) { game.step(ctrl); acc -= DT; n++; }
      handleEvents();
      // P/N'de gaz: ipucu
      hintT -= dt;
      if (ctrl.throttle > 0.3 && (game.car.gear === 'P' || game.car.gear === 'N') && game.car.speed < 0.2 && hintT <= 0 && game.status === 'play') {
        const kb = input.state.device === 'keyboard';
        ui.toast(`Vites ${game.car.gear}'de — ileri: <b>D</b>${kb ? ' (E)' : ''} · geri: <b>R</b>${kb ? ' (Q)' : ''}`, 'info', 2000);
        hintT = 3;
      }
      if (game.status === 'play') save.data.stats.playTime += dt;
    } else if (mode === 'menu') {
      // vitrin: araç rölantide, kamera yavaşça döner
      menuT += dt;
      acc += dt;
      while (acc >= DT) { game.step({ throttle: 0, brake: 0, steerAbs: null, steerDir: 0, autoCenter: true }); acc -= DT; }
      game.events.length = 0;
    }
    cam.overview = mode === 'play' && (mapHeld || input.state.map);
    if (mode === 'menu') {
      const L = game.level;
      cam.x = L.w / 2 + Math.cos(menuT * 0.07) * L.w * 0.18;
      cam.y = L.h / 2 + Math.sin(menuT * 0.09) * L.h * 0.12;
      cam.scale = cam.fitScale(L) * 1.35;
      cam.rot = 0;
    } else cam.update(dt, game);
    if (shakeAmt > 0.01) {
      cam.x += (Math.random() - 0.5) * shakeAmt * 0.12; cam.y += (Math.random() - 0.5) * shakeAmt * 0.12;
      shakeAmt *= Math.exp(-dt * 10);
    }
    const s = S();
    sens = mode === 'play' && s.sensors && game.status === 'play' && (game.car.gear === 'R' || (game.car.gear === 'D' && game.car.speed < 4)) ? game.sensors() : null;
    renderer.update(dt, game);
    renderer.render(game, cam, mode === 'play' ? acc / DT : 1, { guides: s.guides && mode === 'play', sensors: sens });
    if (mode === 'play') {
      ui.hud.update(game, sens, s);
      const lv = game.live;
      controls.update(game.car, !!(lv && lv.inside && lv.facingOk && game.car.speed < 0.3 && game.car.gear !== 'P'));
    }
    const car = game.car;
    let sd = Infinity, side = 'rear';
    if (sens) {
      if (car.gear === 'R') { sd = sens.minRear; side = 'rear'; if (sens.minFront < sd) { sd = sens.minFront; side = 'front'; } }
      else { sd = sens.minFront; side = 'front'; }
    }
    let slip = 0;
    for (const w of car.wheels) if (w.sliding || w.locked) slip = Math.max(slip, w.slip);
    audio.update(dt, { active: mode === 'play' || mode === 'pause' ? mode === 'play' : false, rpm: car.rpm, throttle: car.throttle, slip: car.speed > 0.5 ? slip : 0, scrape: game.scraping, sensor: sd, sensorOn: !!sens, sensorSide: side });
  }
  requestAnimationFrame(frame);
}

showcase();
ui.show('home');
requestAnimationFrame(frame);

// test kancası
if (/[?&](debug|test)\b/.test(location.search)) {
  window.__mp = { get game() { return game; }, cam, input, save, openLevel, begin, retry, get mode() { return mode; }, LEVELS, PLAYGROUND };
}
