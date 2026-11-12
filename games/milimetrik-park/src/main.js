// Milimetrik Park — giriş noktası: modlar (kariyer, günlük, sınav, vale, antrenman), durum makinesi, döngü.
import { DT, VEHICLES, ECONOMY } from './config.js';
import { LEVELS, EXAMS, PLAYGROUND, levelById, nextLevel, zoneOf, ZONES } from './levels/index.js';
import { createGame } from './sim/game.js';
import { createRenderer } from './render/renderer.js';
import { createCamera } from './render/camera.js';
import { paintCar, paintTrailer } from './render/art.js';
import { trailerGeom } from './sim/vehicle.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createSave } from './save.js';
import { createUI } from './ui/ui.js';
import { createControls } from './ui/controls.js';
import { checkAchievements } from './achievements.js';
import { dailyLevel, todayStr, prevDay } from './modes/daily.js';
import { createValetSession } from './modes/valet.js';

const canvas = document.getElementById('game');
const uiRoot = document.getElementById('ui');
const save = createSave();
save.load();
const S = () => save.data.settings;
const UNLOCK = /[?&]unlock\b/.test(location.search);

const renderer = createRenderer(canvas);
const cam = createCamera();
const input = createInput();
const audio = createAudio();

let game = null;
let level = null;
let mode = 'menu';            // 'menu' | 'brief' | 'play' | 'pause' | 'result'
let playMode = 'career';      // 'career' | 'daily' | 'exam' | 'valet' | 'free'
let freeVehicle = 'serce';
let valet = null;
let valetCustomer = null;
let acc = 0;
let sens = null;
let hintT = 0;
let mapHeld = false;
let briefData = null;

// ------------------------------------------------------------ yardımcılar

function dailyInfo() {
  const date = todayStr();
  const L = dailyLevel(date);
  const rec = save.data.daily.done[date];
  const d = save.data.daily;
  const streakAlive = d.last === date || d.last === prevDay(date);
  return { date, level: L, done: !!rec, best: rec?.best || 0, streak: streakAlive ? d.streak : 0, reward: ECONOMY.dailyBase + Math.min(ECONOMY.dailyStreakMax, (streakAlive ? d.streak : 0) + 1) * ECONOMY.dailyStreak };
}

function drawVehicle(cv, id, color) {
  const v = VEHICLES[id], x = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  x.clearRect(0, 0, W, H);
  const total = v.trailer ? v.length + v.trailer.hitchBehind + v.trailer.drawbar + v.trailer.boxLength : v.length;
  const s = Math.min((W * 0.9) / total, (H * 0.8) / v.width);
  x.save();
  x.translate(W / 2 + (v.trailer ? (total - v.length) * s / 2 : 0), H / 2);
  x.scale(s, s);
  if (v.trailer) {
    const t = v.trailer, tg = trailerGeom(t);
    x.save();
    x.translate(-v.length / 2 - t.hitchBehind - tg.xHitch, 0);
    x.strokeStyle = '#3a3e44'; x.lineWidth = 0.09;
    x.beginPath(); x.moveTo(tg.hl, -tg.hw + 0.25); x.lineTo(tg.xHitch, 0); x.lineTo(tg.hl, tg.hw - 0.25); x.stroke();
    paintTrailer(x, tg.length, tg.width, t.color);
    x.restore();
  }
  x.fillStyle = 'rgba(0,0,0,0.25)';
  x.fillRect(-v.length / 2 + 0.1, -v.width / 2 + 0.15, v.length, v.width);
  paintCar(x, v.model, color, v.length, v.width, { roof: v.roof, stripe: v.stripe, checker: v.model === 'minibus' });
  x.restore();
}

function vibrate(ms) { if (S().vibration && navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* yoksay */ } } }

const ui = createUI(uiRoot, {
  getSave: () => save.data,
  click: () => { audio.unlock(); audio.sfx('click'); },
  toast: (m, k) => ui.toast(m, k),
  unlockAll: () => UNLOCK,
  dailyInfo,
  drawVehicle,
  paintOf: (id) => save.paintOf(id),
  openLevel: (id, m) => openLevel(id, m),
  begin: () => begin(),
  leave: (fromGame) => leave(fromGame),
  toHome: () => { stopGame(); ui.show('home'); },
  resume: () => resume(),
  retry: () => retry(),
  next: () => next(),
  pause: () => pause(),
  backToPause: () => ui.show('pause', { level, mode: playMode }),
  toggleCamera: () => toggleCamera(),
  setMap: (on) => { mapHeld = on; },
  startValet: () => startValet(),
  startFree: (id) => { freeVehicle = id; openLevel(PLAYGROUND.id, 'free'); },
  selectVehicle: (id) => { save.data.vehicles.selected = id; save.save(); },
  buyVehicle: (id) => { const ok = save.buyVehicle(id); if (ok) { audio.sfx('star', 2); awardAchievements(); } else ui.toast('Yeterli jeton ya da yıldız yok', 'warn'); return ok; },
  buyPaint: (id) => { const ok = save.buyPaint(id); if (ok) { audio.sfx('star', 1); awardAchievements(); } return ok; },
  setPaint: (veh, pid) => { if (pid) save.data.vehicles.paint[veh] = pid; else delete save.data.vehicles.paint[veh]; save.save(); },
  setSetting: (k, v) => { save.data.settings[k] = v; save.save(); applySettings(); },
});

const controls = createControls(uiRoot, input);
controls.show(false);

function applySettings() {
  const s = S();
  controls.setMode(s.steer, s.touchLock);
  controls.setScheme(s.scheme);
  input.state.scheme = s.scheme;
  cam.mode = s.camera;
  audio.setEnabled(s.sound);
  renderer.setQuality(s.quality);
  document.documentElement.dataset.haptics = s.vibration ? '1' : '0';
  if (game) { game.driver.scheme = s.scheme; game.driver.autoHold = s.autoHold; }
  resize();
}

function awardAchievements() {
  const got = checkAchievements(save.data);
  if (got.length) { save.save(true); for (const a of got) ui.toast(`🏆 Başarım: <b>${a.name}</b>`, 'good', 2600); }
  return got;
}

// ------------------------------------------------------------ akış

function vehicleFor(L, m) {
  if (m === 'free') return freeVehicle;
  if (m === 'valet') return valetCustomer?.vehicle || 'serce';
  return L.vehicle || save.data.vehicles.selected;
}

function loadGame(L, m, intro = true) {
  level = L;
  const vid = vehicleFor(L, m);
  game = createGame(L, { vehicle: vid, scheme: S().scheme, autoHold: S().autoHold, seed: Math.floor(Math.random() * 1e6) });
  renderer.setLevel(L);
  renderer.setPlayer(VEHICLES[vid], m === 'valet' ? valetCustomer.color : save.paintOf(vid));
  cam.reset(game, intro);
  acc = 0;
}

function openLevel(id, m) {
  const L = levelById(id);
  if (!L) return;
  playMode = m;
  loadGame(L, m, true);
  mode = 'brief';
  ui.hud.show(false);
  controls.show(false);
  const z = zoneOf(id);
  briefData = { level: L, mode: m, index: z ? z.levels.indexOf(L) : 0, extra: { zone: z } };
  ui.show('brief', briefData);
}

function begin() {
  mode = 'play';
  ui.show(null);
  ui.hud.show(true, level, playMode);
  controls.show(true);
  input.reset(); input.clearGears();
  hintT = 0;
  const first = !save.data.stats.parks;
  setTimeout(() => {
    if (mode !== 'play' || playMode === 'valet') return;
    const kb = input.state.device === 'keyboard' && matchMedia('(hover: hover)').matches;
    const lever = S().scheme === 'lever';
    const msg = lever ? (kb ? '<kbd>W</kbd> ileri · <kbd>S</kbd> geri · bırakınca durur · <kbd>P</kbd> park' : 'Kolu yukarı it: ileri · aşağı çek: geri · bırak: dur') : (kb ? 'Vitesi <b>D</b>\'ye al: <kbd>E</kbd> · geri: <kbd>Q</kbd>' : 'Vitesi <b>D</b>\'ye al, frenle hızını ayarla');
    ui.toast(msg, 'info', first ? 4200 : 2400);
  }, 800);
}

function retry() {
  if (!level) return;
  if (playMode === 'valet') return;
  loadGame(level, playMode, false);
  mode = 'play';
  ui.show(null);
  ui.hud.show(true, level, playMode);
  controls.show(true);
  input.reset(); input.clearGears();
}

function next() {
  const n = nextLevel(level.id);
  if (!n) { leave(true); return; }
  const z = zoneOf(n.id);
  if (!UNLOCK && z.levels.indexOf(n) === 0 && totalStarsNow() < z.stars) { ui.toast(`Sonraki bölge için ${z.stars} yıldız gerekli`, 'warn', 2400); leave(true); return; }
  openLevel(n.id, 'career');
}

function totalStarsNow() { let n = 0; for (const r of Object.values(save.data.levels)) n += r.stars.filter(Boolean).length; return n; }

function leave(fromGame) {
  const pm = playMode;
  if (pm === 'valet' && fromGame && valet && !valet.over) { endValet(); return; }
  stopGame();
  if (pm === 'career') { const z = zoneOf(level?.id || ''); ui.show(z ? 'zone' : 'career', z ? { zone: z } : undefined); }
  else if (pm === 'exam') ui.show('exams');
  else if (pm === 'daily') ui.show('daily');
  else if (pm === 'free') ui.show('free');
  else ui.show('home');
}

function stopGame() {
  mode = 'menu';
  ui.hud.show(false);
  controls.show(false);
  valet = null;
  showcase();
}

function pause() {
  if (mode !== 'play') return;
  mode = 'pause';
  controls.show(false);
  ui.show('pause', { level, mode: playMode });
}

function resume() {
  if (mode !== 'pause') return;
  mode = 'play';
  ui.show(null);
  controls.show(true);
  input.reset();
}

function toggleCamera() {
  const s = S();
  s.camera = s.camera === 'north' ? 'follow' : 'north';
  save.save();
  cam.mode = s.camera;
  ui.toast(s.camera === 'north' ? 'Kamera: kuzey sabit' : 'Kamera: araçla dönüyor', 'info', 1200);
}

/** Menü arkasında yavaşça dolaşan sahne. */
let menuLevel = null;
function showcase() {
  menuLevel = menuLevel || levelById('paralel');
  playMode = 'career';
  level = menuLevel;
  game = createGame(menuLevel, { seed: 11 });
  renderer.setLevel(menuLevel);
  renderer.setPlayer(VEHICLES.serce, save.paintOf('serce'));
  cam.introT = 0;
}

// ------------------------------------------------------------ vale

function startValet() {
  valet = createValetSession(Date.now());
  playMode = 'valet';
  nextCustomer(true);
}

function nextCustomer(first = false) {
  if (!valet) return;
  const c = valet.next();
  valetCustomer = c;
  loadGame(c.level, 'valet', first);
  if (first) {
    mode = 'brief';
    ui.hud.show(false); controls.show(false);
    briefData = { level: c.level, mode: 'valet' };
    begin();
  } else {
    mode = 'play';
    ui.hud.show(true, level, 'valet');
    controls.show(true);
    input.reset();
  }
  ui.toast(`Müşteri: <b>${VEHICLES[c.vehicle].name}</b> <small>${VEHICLES[c.vehicle].kind}</small>`, 'info', 1800);
}

function endValet() {
  if (!valet) return;
  const sess = valet;
  const d = save.data.valet;
  const best = sess.score > d.best;
  d.best = Math.max(d.best, sess.score); d.bestCars = Math.max(d.bestCars, sess.cars); d.runs++;
  save.data.stats.valetCars += sess.cars;
  save.data.coins += sess.tips;
  save.save(true);
  const ach = awardAchievements();
  audio.sfx(best ? 'perfect' : 'park');
  mode = 'result';
  ui.hud.show(false); controls.show(false);
  valet = null;
  ui.show('valetResult', { session: sess, best, coins: sess.tips, achievements: ach });
}

// ------------------------------------------------------------ olaylar

const GEAR_DENY = { 'park-speed': 'P için tamamen dur', 'dir-speed': 'Yön değiştirmek için önce dur', invalid: '' };

function handleEvents() {
  for (const e of game.events) {
    renderer.onEvent(e);
    switch (e.type) {
      case 'hit':
        if (e.kind === 'ped') { audio.sfx('hit', 8); vibrate(80); break; }
        if (e.kmh < 1) { audio.sfx('touch'); ui.toast('Sürttün!', 'warn', 1100); }
        else { audio.sfx('hit', e.kmh); ui.toast(`Çarptın! <small>${Math.round(e.kmh)} km/h</small>`, 'bad', 1500); shake(Math.min(1, e.kmh / 12)); }
        vibrate(e.kmh < 1 ? 10 : 40);
        break;
      case 'curb':
        audio.sfx('curb', e.kmh);
        if (e.kmh > 2.5) ui.toast(level.exam ? 'Kaldırım! <small>(hata)</small>' : 'Kaldırım!', 'warn', 1000);
        vibrate(15);
        break;
      case 'stopper': audio.sfx('stopper', e.kmh); vibrate(8); break;
      case 'cone': audio.sfx('cone'); ui.toast('Koni!', 'warn', 1000); break;
      case 'horn': audio.sfx('horn'); if (Math.random() < 0.5) ui.toast('Korna! <small>yolu kapatıyorsun</small>', 'warn', 1200); break;
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
      case 'parkTask': audio.sfx('free'); ui.toast(`Görev tamam <small>isabet %${e.eval.quality}</small>`, 'good', 1600); break;
      case 'gate': audio.sfx('click'); break;
      case 'task': if (!e.last) { audio.sfx('star', 0); ui.toast(`Sıradaki: <b>${game.tasks[game.taskIndex].label}</b>`, 'info', 1800); } break;
      case 'examFault': ui.toast('Hata: isabet düşük', 'warn', 1500); break;
      case 'done': onDone(e.result); break;
      case 'fail': onFail(game.failReason); break;
      default: break;
    }
  }
  game.events.length = 0;
}

let shakeAmt = 0;
function shake(k) { shakeAmt = Math.max(shakeAmt, k); }

function onDone(res) {
  controls.releaseAll();
  if (playMode === 'valet') {
    const r = valet.parkedCar(game);
    audio.sfx(res.perfect ? 'perfect' : 'park');
    ui.toast(`+${r.pts} puan · ${r.tip} jeton bahşiş <small>%${res.quality}</small>`, res.perfect ? 'good' : 'info', 1600);
    setTimeout(() => { if (valet && !valet.over && playMode === 'valet') nextCustomer(); }, 900);
    return;
  }
  let fresh = [false, false, false], coins = 0;
  if (playMode === 'career' || playMode === 'exam') {
    const r = save.record(level.id, res);
    fresh = r.fresh; coins = r.coins;
    if (playMode === 'exam' && fresh[0]) { save.data.coins += ECONOMY.examPass; coins += ECONOMY.examPass; save.data.stats.exams++; save.save(true); }
  } else if (playMode === 'daily') {
    const info = dailyInfo();
    const d = save.data.daily;
    const rec = d.done[info.date];
    if (!rec) {
      d.streak = info.streak + 1; d.last = info.date;
      coins = info.reward; save.data.coins += coins;
    }
    d.done[info.date] = { best: Math.max(rec?.best || 0, res.quality), time: rec?.time ? Math.min(rec.time, res.time) : res.time };
    save.data.stats.parks++; if (res.perfect) save.data.stats.perfect++;
    save.save(true);
  }
  const ach = awardAchievements();
  audio.sfx(res.perfect ? 'perfect' : 'park');
  setTimeout(() => {
    if (!game || game.result !== res) return;
    mode = 'result';
    ui.hud.show(false);
    controls.show(false);
    const n = playMode === 'career' ? nextLevel(level.id) : null;
    ui.show('result', { level, mode: playMode, res, fresh, coins, hasNext: !!n, achievements: ach });
    res.stars.forEach((on, k) => { if (on) audio.sfx('star', k); });
  }, 900);
}

function onFail(reason) {
  controls.releaseAll();
  audio.sfx('fail');
  if (playMode === 'valet') {
    valet.failedCar();
    ui.toast(reason === 'pedestrian' ? 'Yayaya çarptın! Müşteri aracını geri aldı (−15 sn)' : 'Araç hasar gördü! Müşteri kızgın (−15 sn)', 'bad', 2200);
    setTimeout(() => { if (valet && !valet.over && playMode === 'valet') nextCustomer(); else if (valet) endValet(); }, 1400);
    return;
  }
  setTimeout(() => {
    if (!game || game.status !== 'fail') return;
    mode = 'result';
    ui.hud.show(false);
    controls.show(false);
    ui.show('result', { level, mode: playMode, fail: true, reason });
  }, 1100);
}

input.onAction((a) => {
  audio.unlock();
  if (a === 'pause') { if (mode === 'play') pause(); else if (mode === 'pause') resume(); return; }
  if (a === 'retry' && playMode !== 'valet' && (mode === 'play' || mode === 'pause' || mode === 'result') && level && level !== menuLevel) { retry(); return; }
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

let last = performance.now();
let menuT = 0;
function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  const raw = input.read(dt);
  if (game) {
    if (mode === 'play') {
      if (raw.gear && S().scheme === 'pedals') game.requestGear(raw.gear);
      if (raw.park) game.requestPark();
      raw.autoCenter = S().autoCenter;
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 40) { game.step(raw); acc -= DT; n++; }
      handleEvents();
      if (playMode === 'valet' && valet) { valet.tick(dt); if (valet.over && game.status === 'play') endValet(); }
      hintT -= dt;
      if (S().scheme === 'pedals' && raw.throttle > 0.3 && (game.car.gear === 'P' || game.car.gear === 'N') && game.car.speed < 0.2 && hintT <= 0 && game.status === 'play') {
        const kb = input.state.device === 'keyboard';
        ui.toast(`Vites ${game.car.gear}'de — ileri: <b>D</b>${kb ? ' (E)' : ''} · geri: <b>R</b>${kb ? ' (Q)' : ''}`, 'info', 2000);
        hintT = 3;
      }
      if (game.status === 'play') save.data.stats.playTime += dt;
    } else if (mode === 'menu') {
      menuT += dt;
      acc += dt;
      let n = 0;
      while (acc >= DT && n < 30) { game.step({ lever: 0, steerAbs: null, steerDir: 0, autoCenter: true }); acc -= DT; n++; }
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
      ui.hud.update(game, sens, s, valet);
      const lv = game.live;
      controls.update(game.car, !!(lv && lv.inside && lv.facingOk && game.car.speed < 0.3 && game.car.gear !== 'P'), game.driver.hold);
    }
    const car = game.car;
    let sd = Infinity, side = 'rear';
    if (sens) {
      if (car.gear === 'R') { sd = sens.minRear; side = 'rear'; if (sens.minFront < sd) { sd = sens.minFront; side = 'front'; } }
      else { sd = sens.minFront; side = 'front'; }
    }
    let slip = 0;
    for (const w of car.wheels) if (w.sliding || w.locked) slip = Math.max(slip, w.slip);
    audio.update(dt, {
      active: mode === 'play', rpm: car.rpm, throttle: car.throttle, slip: car.speed > 0.5 ? slip : 0, scrape: game.scraping,
      sensor: sd, sensorOn: !!sens, sensorSide: side, rain: !!game.env.rain && (mode === 'play' || mode === 'pause'), indoor: !!game.level.indoor && mode === 'play',
    });
  }
  requestAnimationFrame(frame);
}

applySettings();
showcase();
ui.show('home');
requestAnimationFrame(frame);

// test kancası
if (/[?&](debug|test)\b/.test(location.search)) {
  window.__mp = { get game() { return game; }, cam, input, save, openLevel, begin, retry, startValet, get valet() { return valet; }, get mode() { return mode; }, LEVELS, EXAMS, ZONES, PLAYGROUND, levelById, dailyInfo };
}
