// Game controller: state machine, input, HUD, menus, campaign + endless mode.
import { GameScene, THEMES } from './scene.js';
import { Run, CRASH_IMPACT, landingRating } from './run.js';
import { LEVELS, makeEndlessLevel } from './levels.js';
import { Progress, ACHIEVEMENTS, PAINTS } from './progress.js';
import { Sound } from './audio.js';
import { Music, THEME_TRACK } from './music.js';
import { restHeight } from './physics.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const THEME_ICON = {
  earth: '🌳', valley: '💨', canyon: '🏜️', city: '🏙️', moon: '🌙', mars: '🔴', sea: '🌊', sunset: '🌋',
  snow: '⛷️', frost: '🧊', titan: '🪐', site: '🏗️', neon: '🌃', storm: '⛈️',
};
const isTouch = matchMedia('(pointer: coarse)').matches;
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const dec = (n, d = 1) => n.toFixed(d).replace('.', ',');

function autoQuality() {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.min(screen.width, screen.height) * dpr;
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 4 || px < 800) return 'medium';
  return 'high';
}

class Game {
  constructor() {
    this.progress = new Progress();
    const S = this.progress.data.settings;
    this.sound = new Sound();
    this.sound.enabled = S.sound;
    this.music = new Music(this.sound);
    this.music.enabled = S.music;
    this.sound.onReady = () => {
      this.music.attach();
      this.music.setEnabled(this.progress.data.settings.music);
      this.sound.setAmbient(this.sound.ambient);
    };
    this.qualityMode = S.quality;
    const q = S.quality === 'auto' ? autoQuality() : S.quality;
    this.scene = new GameScene($('#game'), q);
    this.scene.setPaint(this.paintColor());
    this.scene.onThunder = (delay) => this.sound.sfx('thunder', { delay });
    this.state = 'menu';
    this.mode = 'campaign';
    this.levelIdx = 0;
    this.def = null;
    this.run = null;
    this.endless = null;
    this.timeScale = 1;
    this.slowTimer = 0;
    this.introT = 0;
    this.menuT = 0;
    this.holds = new Map(); // source id -> action
    this.finishTimer = -1;
    this.fps = { acc: 0, frames: 0 };
    this.lastWarnBeep = 0;
    this.musicLevel = -1;

    this.bindUI();
    this.bindInput();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
      const ctx = this.sound.ctx;
      if (ctx) {
        if (document.hidden) ctx.suspend().catch(() => {});
        else ctx.resume().catch(() => {});
      }
    });

    // background level for the main menu
    this.loadLevel(this.nextPlayableIndex(), false);
    this.showScreen('menu');
    this.refreshMenu();
    this.onResize();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    setTimeout(() => $('#loading').classList.add('hidden'), 50);
  }

  paintColor() {
    const id = this.progress.data.settings.paint;
    return (PAINTS.find((p) => p.id === id) || PAINTS[0]).color;
  }

  // ---------------------------------------------------------------- screens
  showScreen(id) {
    for (const s of ['menu', 'levels', 'achievements', 'settings', 'help', 'garage', 'briefing', 'pause', 'result']) {
      $('#' + s).classList.toggle('hidden', s !== id);
    }
    $('#hud').classList.toggle('hidden', !(id === null || id === 'pause'));
    this.screen = id;
  }

  refreshMenu() {
    const p = this.progress;
    const total = LEVELS.length * 3;
    const ach = Object.keys(p.data.achievements).length;
    const e = p.data.endless;
    $('#menu-stats').textContent = `★ ${p.totalStars()}/${total}   ·   🏆 ${ach}/${ACHIEVEMENTS.length}   ·   Takla: ${p.data.stats.flips}${e.bestStreak ? `   ·   ♾️ en iyi seri: ${e.bestStreak}` : ''}`;
    const next = this.nextPlayableIndex();
    $('#m-play').textContent = p.totalStars() > 0 ? `OYNA · ${LEVELS[next].id}. ${LEVELS[next].name}` : 'OYNA';
  }

  nextPlayableIndex() {
    const p = this.progress;
    for (let i = 0; i < LEVELS.length; i++) {
      if (p.level(LEVELS[i].id).stars === 0 && p.isUnlocked(LEVELS[i].id, LEVELS)) return i;
    }
    // all done: first level without 3 stars
    const i = LEVELS.findIndex((l) => p.level(l.id).stars < 3);
    return i >= 0 ? i : 0;
  }

  renderLevels() {
    const g = $('#level-grid');
    g.innerHTML = '';
    const p = this.progress;
    $('#levels-stars').textContent = `★ ${p.totalStars()}/${LEVELS.length * 3}`;
    LEVELS.forEach((def, i) => {
      const lv = p.level(def.id);
      const unlocked = p.isUnlocked(def.id, LEVELS);
      const b = document.createElement('button');
      b.className = 'lvl' + (unlocked ? '' : ' locked') + (def.id > 10 && !lv.stars && unlocked ? ' fresh' : '');
      const stars = [0, 1, 2].map((k) => `<span class="${k < lv.stars ? '' : 'off'}">★</span>`).join('');
      b.innerHTML = `<div class="theme">${THEME_ICON[def.theme] || '🌍'}</div><div class="n">${def.id}</div><div class="t">${def.name}</div><div class="s">${stars}</div><div class="b">${lv.best ? 'En iyi: ' + fmt(lv.best) : unlocked ? 'Yeni' : 'Kilitli'}</div>`;
      b.addEventListener('click', () => {
        this.sound.init();
        this.sound.sfx('click');
        if (!unlocked) {
          this.toast('🔒', 'Kilitli', 'Önceki bölümü en az 1 yıldızla bitir.');
          return;
        }
        this.openBriefing(i);
      });
      g.appendChild(b);
    });
  }

  renderAchievements() {
    const l = $('#ach-list');
    l.innerHTML = '';
    const got = this.progress.data.achievements;
    $('#ach-count').textContent = `${Object.keys(got).length}/${ACHIEVEMENTS.length}`;
    for (const a of ACHIEVEMENTS) {
      const d = document.createElement('div');
      d.className = 'ach' + (got[a.id] ? ' on' : '');
      d.innerHTML = `<div class="i">${a.icon}</div><div><b>${a.name}</b><span>${a.desc}</span></div>`;
      l.appendChild(d);
    }
  }

  renderSettings() {
    const S = this.progress.data.settings;
    $$('[data-set]').forEach((b) => b.classList.toggle('on', !!S[b.dataset.set]));
    $$('#quality-seg button').forEach((b) => b.classList.toggle('on', b.dataset.q === S.quality));
  }

  renderGarage() {
    const grid = $('#paint-grid');
    grid.innerHTML = '';
    const stars = this.progress.totalStars();
    const cur = this.progress.data.settings.paint;
    $('#garage-stars').textContent = `★ ${stars}`;
    for (const p of PAINTS) {
      const open = stars >= p.stars;
      const b = document.createElement('button');
      b.className = 'paint' + (p.id === cur ? ' on' : '') + (open ? '' : ' locked');
      const hex = '#' + p.color.toString(16).padStart(6, '0');
      b.innerHTML = `<span class="sw" style="background:${hex}"></span><b>${p.name}</b><small>${open ? (p.id === cur ? 'Seçili' : 'Seç') : `🔒 ${p.stars} ★`}</small>`;
      b.addEventListener('click', () => {
        this.sound.init();
        this.sound.sfx('click');
        if (!open) {
          this.toast('🔒', 'Kilitli', `Bu renk için ${p.stars} yıldız gerekiyor (sende ${stars}).`);
          return;
        }
        const S = this.progress.data.settings;
        const changed = S.paint !== p.id;
        S.paint = p.id;
        this.progress.save();
        this.scene.setPaint(p.color);
        if (changed && p.id !== 'red') {
          const out = { newAch: [] };
          this.progress.unlock('painter', out);
          for (const a of out.newAch) {
            this.toast(a.icon, 'BAŞARIM AÇILDI', a.name);
            this.sound.sfx('ach');
          }
        }
        this.renderGarage();
      });
      grid.appendChild(b);
    }
  }

  // ---------------------------------------------------------------- levels
  loadDef(def, withGhost) {
    this.def = def;
    this.run = new Run(def);
    const lv = def.endless ? {} : this.progress.level(def.id);
    const ghost = withGhost && !def.endless && this.progress.data.settings.ghost && lv.ghost ? lv.ghost : null;
    this.scene.load(this.run, { ghost });
    this.finishTimer = -1;
    this.timeScale = 1;
    this.slowTimer = 0;
    this.holds.clear();
    $$('.ctl').forEach((b) => b.classList.remove('down'));
    $('#hud-level').textContent = def.endless ? `♾️ ${def.name}` : `${def.id}. ${def.name}`;
    const band = this.run.L.speedBand;
    this.speedMax = Math.max(200, band.max * 3.6 * 1.6);
    $('#speed-band').style.left = `${((band.min * 3.6) / this.speedMax) * 100}%`;
    $('#speed-band').style.width = `${(((band.max - band.min) * 3.6) / this.speedMax) * 100}%`;
    $('#popups').innerHTML = '';
    $('#flip-meter').classList.add('hidden');
    $('#warning').classList.add('hidden');
    $('#hint').classList.add('hidden');
    const th = THEMES[def.theme] || THEMES.earth;
    this.sound.setAmbient(th.rain ? 'rain' : null);
    this.music.setTrack(THEME_TRACK[def.theme] || 'sky');
  }

  loadLevel(i, withGhost) {
    this.mode = 'campaign';
    this.levelIdx = i;
    this.loadDef(LEVELS[i], withGhost);
  }

  briefingFacts(def, L) {
    const g = L.gravity;
    const facts = [
      `<span class="fact g">Hedef hız ${Math.round(L.speedBand.min * 3.6)}–${Math.round(L.speedBand.max * 3.6)} km/sa</span>`,
      `<span class="fact">Yerçekimi ${dec(g, 2)} m/s²</span>`,
    ];
    if (L.pad.hill) facts.push(`<span class="fact">İniş yamacı ${Math.round(L.pad.len)} m</span>`, '<span class="fact g">İticisiz iniş mümkün</span>');
    else facts.push(`<span class="fact">Boşluk ${Math.round(L.pad.x0 - L.canyonStart)} m</span>`, `<span class="fact">Platform ${Math.round(L.pad.len)} m</span>`);
    if (L.airDensity > 2) facts.push(`<span class="fact">Hava yoğunluğu ${dec(L.airDensity)} kg/m³</span>`);
    if (L.airDensity === 0) facts.push('<span class="fact">Atmosfer yok</span>');
    if (def.wind) facts.push(`<span class="fact">Rüzgar ${def.wind.base ? Math.abs(def.wind.base * 3.6).toFixed(0) + '±' : '±'}${(def.wind.gust * 3.6).toFixed(0)} km/sa</span>`);
    if ((def.pad.mu ?? 1) < 0.5) facts.push(`<span class="fact">Buz: sürtünme ${dec(def.pad.mu, 2)}</span>`);
    const mo = def.pad.motion;
    if (mo) facts.push(`<span class="fact">${mo.type === 'pendulum' ? 'Sallanan platform' : mo.type === 'lift' ? 'Asansör platformu' : 'Hareketli platform'}</span>`);
    if (def.runoff && def.runoff.len === 0 && !L.pad.hill) facts.push('<span class="fact">Pist sonu yok: platformda dur!</span>');
    return facts.join('');
  }

  openBriefing(i) {
    this.loadLevel(i, true);
    const def = LEVELS[i];
    const L = this.run.L;
    const lv = this.progress.level(def.id);
    $('#b-num').textContent = `BÖLÜM ${def.id} / ${LEVELS.length}`;
    $('#b-name').textContent = def.name;
    $('#b-desc').textContent = def.desc;
    $('#b-facts').innerHTML = this.briefingFacts(def, L);
    $('#b-obj-head').textContent = 'GÖREVLER';
    $('#b-obj').innerHTML = def.objectives.map((o, k) => `<li class="${lv.objectives[k] ? 'done' : ''}"><span class="st">★</span>${o.text}</li>`).join('');
    $('#b-tip').textContent = def.tip || '';
    $('#b-back').textContent = 'GERİ';
    this.state = 'briefing';
    this.introT = 0;
    this.showScreen('briefing');
  }

  // ---------------------------------------------------------------- endless mode
  startEndless() {
    this.endless = { seed: (Date.now() % 100000) + 1, round: 1, total: 0, streak: 0, prevTheme: null };
    this.openEndlessRound();
  }

  openEndlessRound() {
    const E = this.endless;
    const def = makeEndlessLevel(E.round, E.seed, E.prevTheme);
    E.prevTheme = def.theme;
    this.mode = 'endless';
    this.loadDef(def, false);
    const L = this.run.L;
    const best = this.progress.data.endless;
    $('#b-num').textContent = `SONSUZ MOD · TUR ${E.round}`;
    $('#b-name').textContent = def.name.split(' · ')[1] || def.name;
    $('#b-desc').textContent = def.desc;
    $('#b-facts').innerHTML = this.briefingFacts(def, L);
    $('#b-obj-head').textContent = 'SERİ';
    $('#b-obj').innerHTML = [
      `<li class="done"><span class="st">♾️</span>Seri: ${E.streak} iniş · Toplam ${fmt(E.total)} puan</li>`,
      `<li><span class="st">🏆</span>En iyi seri: ${best.bestStreak} · En yüksek toplam: ${fmt(best.bestScore)}</li>`,
      '<li><span class="st">💥</span>Tek bir kaza ya da ıskalama seriyi bitirir</li>',
    ].join('');
    $('#b-tip').textContent = 'Her tur biraz daha uzun, rüzgarlı ya da hareketli olabilir. Yakıtı ve zamanlamayı iyi kullan.';
    $('#b-back').textContent = 'MENÜ';
    this.state = 'briefing';
    this.introT = 0;
    this.showScreen('briefing');
  }

  startPlaying() {
    this.state = 'playing';
    this.showScreen(null);
    this.run.world.update(0);
    this.popup('BAŞLA!', 'green');
    this.sound.sfx('go');
    this.hintKey = '';
  }

  restart() {
    this.sound.sfx('click');
    if (this.mode === 'endless') {
      // one life per run: restarting starts a new endless run
      this.startEndless();
      return;
    }
    this.loadLevel(this.levelIdx, true);
    this.state = 'playing';
    this.showScreen(null);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.renderSettings();
    $('#p-restart').textContent = this.mode === 'endless' ? 'YENİ SERİ' : 'YENİDEN BAŞLA';
    this.showScreen('pause');
  }

  resume() {
    this.state = 'playing';
    this.showScreen(null);
    this.last = performance.now();
  }

  toMenu() {
    this.state = 'menu';
    if (this.mode === 'endless') this.loadLevel(this.nextPlayableIndex(), false);
    else this.loadLevel(this.levelIdx, false);
    this.refreshMenu();
    this.showScreen('menu');
  }

  // ---------------------------------------------------------------- UI wiring
  bindUI() {
    const click = (sel, fn) => $(sel).addEventListener('click', () => {
      this.sound.init();
      this.sound.sfx('click');
      fn();
    });
    click('#m-play', () => {
      this.goFullscreen();
      this.openBriefing(this.nextPlayableIndex());
    });
    click('#m-endless', () => {
      this.goFullscreen();
      this.startEndless();
    });
    click('#m-levels', () => { this.renderLevels(); this.showScreen('levels'); });
    click('#m-ach', () => { this.renderAchievements(); this.showScreen('achievements'); });
    click('#m-garage', () => { this.renderGarage(); this.showScreen('garage'); });
    click('#m-settings', () => { this.renderSettings(); this.showScreen('settings'); });
    click('#m-help', () => this.showScreen('help'));
    $$('[data-back]').forEach((b) => b.addEventListener('click', () => {
      this.sound.sfx('click');
      this.refreshMenu();
      this.showScreen('menu');
    }));
    click('#b-back', () => {
      if (this.mode === 'endless') {
        this.toMenu();
        return;
      }
      this.renderLevels();
      this.state = 'menu';
      this.showScreen('levels');
    });
    click('#b-start', () => { this.goFullscreen(); this.startPlaying(); });
    click('#btn-pause', () => this.pause());
    click('#btn-restart', () => this.restart());
    click('#p-resume', () => this.resume());
    click('#p-restart', () => this.restart());
    click('#p-levels', () => {
      this.toMenu();
      if (this.mode !== 'endless') {
        this.renderLevels();
        this.showScreen('levels');
      }
    });
    click('#r-retry', () => this.restart());
    click('#r-levels', () => {
      const wasEndless = this.mode === 'endless';
      this.toMenu();
      if (!wasEndless) {
        this.renderLevels();
        this.showScreen('levels');
      }
    });
    click('#r-next', () => {
      if (this.mode === 'endless') {
        if (this.run.result && this.run.result.success) {
          this.endless.round++;
          this.openEndlessRound();
        } else this.startEndless();
        return;
      }
      const n = this.levelIdx + 1;
      if (n < LEVELS.length && this.progress.isUnlocked(LEVELS[n].id, LEVELS)) this.openBriefing(n);
      else { this.toMenu(); this.renderLevels(); this.showScreen('levels'); }
    });
    $$('[data-set]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.set;
      const S = this.progress.data.settings;
      S[k] = !S[k];
      this.progress.save();
      this.sound.init();
      if (k === 'sound') this.sound.setEnabled(S.sound);
      if (k === 'music') this.music.setEnabled(S.music);
      if (k === 'vibration' && S.vibration) this.vibrate(40);
      this.sound.sfx('click');
      this.renderSettings();
    }));
    $$('#quality-seg button').forEach((b) => b.addEventListener('click', () => {
      const S = this.progress.data.settings;
      S.quality = b.dataset.q;
      this.qualityMode = S.quality;
      this.progress.save();
      this.scene.setQuality(S.quality === 'auto' ? autoQuality() : S.quality);
      this.renderSettings();
    }));
    click('#reset-progress', () => {
      const b = $('#reset-progress');
      if (!this.resetArmed) {
        // two-step confirmation inside the page (no browser dialogs)
        this.resetArmed = true;
        b.textContent = 'Emin misin? Silmek için tekrar dokun';
        setTimeout(() => {
          this.resetArmed = false;
          b.textContent = 'İlerlemeyi sıfırla';
        }, 3000);
        return;
      }
      this.resetArmed = false;
      b.textContent = 'İlerlemeyi sıfırla';
      this.progress.reset();
      this.scene.setPaint(this.paintColor());
      this.refreshMenu();
      this.toast('🗑️', 'Sıfırlandı', 'Yıldızlar, rekorlar ve başarımlar silindi.');
    });
    $('#rotate-ok').addEventListener('click', () => {
      $('#rotate-hint').classList.add('hidden');
      try { sessionStorage.setItem('rot-ok', '1'); } catch (e) { /* ignore */ }
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  goFullscreen() {
    if (!isTouch) return;
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}))
      .catch(() => {});
  }

  bindInput() {
    // A button's meaning is fixed at press time: holding GAS up the ramp never turns into a flip.
    const actionFor = (k) => {
      const airborne = this.run && !this.run.car.grounded;
      if (k === 'left') return airborne ? 'rotL' : 'brake';
      if (k === 'right') return airborne ? 'rotR' : 'gas';
      return 'thrust';
    };
    for (const btn of $$('.ctl')) {
      const k = btn.dataset.k;
      const down = (e) => {
        e.preventDefault();
        this.sound.init();
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        this.holds.set('p' + e.pointerId, { action: actionFor(k), btn });
        btn.classList.add('down');
        if (k === 'thrust') this.vibrate(8);
      };
      const up = (e) => {
        const h = this.holds.get('p' + e.pointerId);
        if (h) this.holds.delete('p' + e.pointerId);
        if (![...this.holds.values()].some((v) => v.btn === btn)) btn.classList.remove('down');
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
    }
    const keyMap = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'thrust', KeyW: 'thrust', Space: 'thrust' };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        return;
      }
      if (e.code === 'KeyR' && (this.state === 'playing' || this.state === 'result' || this.state === 'paused')) {
        this.restart();
        return;
      }
      if ((e.code === 'Enter' || e.code === 'Space') && this.state === 'briefing') {
        e.preventDefault();
        this.startPlaying();
        return;
      }
      if (e.code === 'KeyM') {
        const S = this.progress.data.settings;
        S.music = !S.music;
        this.progress.save();
        this.sound.init();
        this.music.setEnabled(S.music);
        this.toast(S.music ? '🎵' : '🔇', 'MÜZİK', S.music ? 'Açık' : 'Kapalı');
        return;
      }
      if (e.code === 'KeyQ') { this.holds.set('kQ', { action: 'rotL' }); return; }
      if (e.code === 'KeyE') { this.holds.set('kE', { action: 'rotR' }); return; }
      const k = keyMap[e.code];
      if (!k) return;
      e.preventDefault();
      this.sound.init();
      if (!this.holds.has('k' + e.code)) this.holds.set('k' + e.code, { action: actionFor(k), btn: $(`.ctl[data-k="${k}"]`) });
      $(`.ctl[data-k="${k}"]`).classList.add('down');
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyQ') { this.holds.delete('kQ'); return; }
      if (e.code === 'KeyE') { this.holds.delete('kE'); return; }
      const k = keyMap[e.code];
      if (!k) return;
      const h = this.holds.get('k' + e.code);
      this.holds.delete('k' + e.code);
      if (h && h.btn && ![...this.holds.values()].some((v) => v.btn === h.btn)) h.btn.classList.remove('down');
    });
    window.addEventListener('blur', () => {
      this.holds.clear();
      $$('.ctl').forEach((b) => b.classList.remove('down'));
    });
  }

  applyInput() {
    if (this.autopilot) return this.autopilot(this.run);
    const inp = this.run.input;
    inp.gas = inp.brake = inp.thrust = inp.rotL = inp.rotR = false;
    if (this.state !== 'playing') return;
    for (const h of this.holds.values()) inp[h.action] = true;
  }

  vibrate(p) {
    if (this.progress.data.settings.vibration && navigator.vibrate) {
      try { navigator.vibrate(p); } catch (e) { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------- feedback
  popup(text, cls = '', small = false) {
    const d = document.createElement('div');
    d.className = `popup ${cls} ${small ? 'small' : ''}`;
    d.textContent = text;
    $('#popups').appendChild(d);
    setTimeout(() => d.remove(), 1450);
    while ($('#popups').children.length > 4) $('#popups').firstChild.remove();
  }

  toast(icon, title, text) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = `<div class="i">${icon}</div><div><small>${title}</small><b>${text}</b></div>`;
    $('#toast-wrap').appendChild(d);
    setTimeout(() => d.remove(), 4100);
  }

  slowmo(scale, dur) {
    this.timeScale = scale;
    this.slowTimer = dur;
  }

  handleEvents() {
    const run = this.run;
    const sc = this.scene;
    for (const e of run.events) {
      switch (e.type) {
        case 'launch': {
          this.sound.sfx('launch');
          this.popup(`FIRLATMA! ${Math.round(e.speed * 3.6)} km/sa`, 'gold', true);
          if (e.kick > 0.12) this.popup('MANCINIK ETKİSİ!', 'green', true);
          sc.shake(0.4);
          this.vibrate(20);
          break;
        }
        case 'flip': {
          this.popup(`${e.dir === 'back' ? 'GERİ TAKLA' : 'ÖN TAKLA'}${e.combo > 1 ? ' ×' + e.combo : ''}!`, 'gold');
          this.sound.sfx('flip', { combo: e.combo });
          this.vibrate(25);
          break;
        }
        case 'collect':
          if (e.kind === 'star') {
            this.sound.sfx('star');
            this.popup('+★', 'gold', true);
          } else {
            this.sound.sfx('fuel');
            this.popup('+%25 YAKIT', 'green', true);
          }
          this.vibrate(15);
          break;
        case 'touch':
          this.sound.sfx('touch', { impact: e.impact });
          sc.shake(Math.min(1.2, e.impact * 0.12));
          sc.landingPuff(run);
          this.vibrate(Math.min(80, 15 + e.impact * 8));
          break;
        case 'landed': {
          const r = e.rating;
          this.popup(r.text, 'green');
          if (e.flips > 0) this.popup(`${e.flips} TAKLA ONAYLANDI!`, 'gold', true);
          if (e.padDist < 1) this.popup('TAM İSABET! 🎯', 'gold', true);
          if (!run.usedMainThrust) this.popup('İTİCİSİZ İNİŞ! 🪂', 'gold', true);
          if (this.music.enabled && this.music.ready) this.music.stinger('win');
          else this.sound.sfx('land');
          if (r.key === 'perfect') this.slowmo(0.35, 0.6);
          break;
        }
        case 'retry':
          this.popup('Pistte kaldın — tekrar hızlan!', '', true);
          break;
        case 'missed':
          this.popup('HEDEFİ ISKALADIN', 'red');
          this.sound.sfx('fail');
          this.music.stinger('lose');
          break;
        case 'crash':
          sc.explosion(e.x, e.y);
          this.sound.sfx('crash');
          this.music.duck(0.22, 2.2);
          sc.shake(1.8);
          this.vibrate([120, 60, 220]);
          this.popup('KAZA!', 'red');
          this.slowmo(0.3, 0.9);
          break;
        case 'finish':
          this.finishTimer = e.result.success ? 1.3 : 2.0;
          break;
        default:
          break;
      }
    }
    run.events.length = 0;
  }

  showResult() {
    const run = this.run;
    const r = run.result;
    const def = run.def;
    const endless = this.mode === 'endless';
    const prevBest = endless ? 0 : this.progress.level(def.id).best || 0;
    const rec = this.progress.recordRun(def, run, LEVELS, { endless });
    this.state = 'result';
    const t = $('#r-title');
    $('#r-stars').classList.toggle('hidden', endless);
    if (r.success) {
      t.textContent = endless ? `TUR ${this.endless.round} TAMAM!` : 'BAŞARILI İNİŞ!';
      t.className = 'win';
      $('#r-reason').textContent = landingRating(r.impact).text + ` · ${dec(r.impact)} m/s · hedefe ${dec(r.padDist)} m`;
    } else {
      t.textContent = endless ? 'SERİ BİTTİ' : run.phase === 'missed' ? 'ISKALADIN!' : 'KAZA!';
      t.className = 'lose';
      $('#r-reason').textContent = r.reason;
    }
    $$('#r-stars span').forEach((s, i) => s.classList.toggle('on', i < r.stars));
    const best = $('#r-best');
    if (endless) {
      const E = this.endless;
      if (r.success) {
        E.total += r.score;
        E.streak++;
      }
      const er = this.progress.recordEndless(E.streak, E.total);
      rec.newAch.push(...er.newAch);
      const pe = this.progress.data.endless;
      $('#r-obj').innerHTML = [
        `<li class="done"><span class="st">♾️</span>Seri: ${E.streak} başarılı iniş</li>`,
        `<li class="done"><span class="st">Σ</span>Toplam: ${fmt(E.total)} puan</li>`,
        `<li><span class="st">🏆</span>En iyi seri ${pe.bestStreak} · en yüksek ${fmt(pe.bestScore)}</li>`,
      ].join('');
      best.textContent = !r.success && er.newBest ? 'YENİ REKOR!' : `Tur puanı`;
      best.className = !r.success && er.newBest ? 'new' : '';
    } else {
      $('#r-obj').innerHTML = def.objectives.map((o, k) => `<li class="${r.objectives[k] ? 'done' : 'fail'}"><span class="st">${r.objectives[k] ? '★' : '✗'}</span>${o.text}</li>`).join('');
      if (r.success && r.score > prevBest && prevBest > 0) {
        best.textContent = 'YENİ REKOR!';
        best.className = 'new';
      } else {
        best.textContent = `En iyi: ${fmt(Math.max(prevBest, r.score))}`;
        best.className = '';
      }
    }
    $('#r-break').innerHTML = r.breakdown.length
      ? r.breakdown.map((b) => `<li><span>${b.label}</span><b>+${fmt(b.pts)}</b></li>`).join('')
      : '<li><span>Puan için güvenli iniş gerekli</span><b>0</b></li>';
    $('#r-total').textContent = fmt(r.score);
    $('#r-ach').innerHTML = rec.newAch.map((a) => `<span class="chip">${a.icon} ${a.name}</span>`).join('');
    if (rec.newAch.length) setTimeout(() => this.sound.sfx('ach'), 500);
    const next = $('#r-next');
    if (endless) {
      next.textContent = r.success ? `TUR ${this.endless.round + 1} ›` : 'YENİ SERİ';
      next.style.opacity = 1;
      $('#r-retry').classList.toggle('hidden', !!r.success);
      $('#r-retry').textContent = 'YENİ SERİ';
      $('#r-levels').textContent = 'MENÜ';
      if (!r.success) next.classList.add('hidden');
      else next.classList.remove('hidden');
    } else {
      const n = this.levelIdx + 1;
      const nextOk = n < LEVELS.length && this.progress.isUnlocked(LEVELS[n].id, LEVELS);
      next.classList.remove('hidden');
      $('#r-retry').classList.remove('hidden');
      $('#r-retry').textContent = 'TEKRAR';
      $('#r-levels').textContent = 'BÖLÜMLER';
      next.textContent = n >= LEVELS.length ? 'BÖLÜMLER' : nextOk ? 'SONRAKİ ›' : 'SONRAKİ 🔒';
      next.style.opacity = nextOk || n >= LEVELS.length ? 1 : 0.45;
    }
    this.showScreen('result');
  }

  // ---------------------------------------------------------------- HUD
  updateHUD() {
    const run = this.run;
    const c = run.car;
    const L = run.L;
    const g = L.gravity;
    // live score (provisional)
    const pend = run.pendingBack + run.pendingFront;
    const live = Math.round(600 * pend * (1 + 0.5 * Math.max(0, pend - 1)) + run.jumpAirtime * 150 * (run.phase !== 'drive' ? 1 : 0) + run.starsCollected * 300);
    const base = this.mode === 'endless' ? this.endless.total : 0;
    $('#hud-score').textContent = fmt(base + (run.result ? run.result.score : live));
    const fuel = Math.max(0, c.fuel);
    const ff = $('#fuel-fill');
    ff.style.width = fuel + '%';
    ff.classList.toggle('low', fuel < 20);
    $('#fuel-pct').textContent = Math.round(fuel) + '%';
    const kmh = Math.abs(c.vx * Math.cos(c.a) + c.vy * Math.sin(c.a)) * 3.6;
    const spd = run.phase === 'drive' ? kmh : Math.hypot(c.vx, c.vy) * 3.6;
    $('#spd').textContent = Math.round(spd);
    $('#speed-needle').style.left = `${Math.min(100, (spd / this.speedMax) * 100)}%`;
    // altitude above whatever is below
    const rh = restHeight(g);
    const hit = L.world.raycast(c.x, c.y, 0, -1, 400);
    const groundY = hit ? hit.y : L.pad.y;
    const alt = Math.max(0, c.y - rh - groundY);
    $('#alt').textContent = alt < 10 ? alt.toFixed(1) : Math.round(alt);
    // vertical speed relative to the surface below; on a slope, the speed *into* the slope matters
    let vy = c.vy - (hit ? hit.vy : 0);
    if (hit && hit.ny < 0.97 && hit.body.tag === 'pad') vy = -Math.max(0, -((c.vx - hit.vx) * hit.nx + (c.vy - hit.vy) * hit.ny));
    $('#vs').textContent = (vy < 0 ? '↓ ' : '↑ ') + Math.abs(vy).toFixed(1);
    const vsw = $('#vs-wrap');
    const desc = -vy;
    const airborne = run.phase === 'air' || run.phase === 'touchdown';
    vsw.className = 'inst-value ' + (!airborne || desc <= 3 ? 'ok' : desc <= 5 ? 'mid' : desc <= CRASH_IMPACT ? 'hi' : 'bad');
    // attitude relative to the landing surface (the slope on the ski hill)
    let padA = L.pad.body.state.angle;
    if (L.pad.hill && hit && hit.body.tag === 'pad') padA = Math.atan2(-hit.nx, hit.ny);
    const err = wrapA(c.a - padA);
    $('#att-car').style.transform = `rotate(${-c.a}rad)`;
    $('#att-ring').classList.toggle('ok', Math.abs(err) < 0.26);
    $('#att-deg').textContent = Math.round((wrapA(c.a) * 180) / Math.PI) + '°';

    // control labels (context)
    const inAir = !c.grounded;
    const lb = $('#c-left'), rb = $('#c-right');
    if (inAir !== this.lastAirUI) {
      this.lastAirUI = inAir;
      lb.querySelector('.ico').textContent = inAir ? '⟲' : '◀';
      rb.querySelector('.ico').textContent = inAir ? '⟳' : '▶';
      lb.querySelector('.lbl').textContent = inAir ? 'GERİ TAKLA' : 'FREN';
      rb.querySelector('.lbl').textContent = inAir ? 'ÖN TAKLA' : 'GAZ';
      lb.classList.toggle('air', inAir);
      rb.classList.toggle('air', inAir);
    }

    // landing warnings
    let warn = '';
    let urge = false;
    if (airborne && !c.crashed && vy < -0.5 && !L.pad.hill) {
      const ta = c.thrustAccel * Math.max(0.2, Math.cos(err)) - g;
      const vImpact = Math.sqrt(vy * vy + 2 * g * alt);
      const brakeH = (vy * vy) / (2 * Math.max(0.5, ta));
      if (vImpact > CRASH_IMPACT * 0.9 && alt < brakeH * 1.5 + 6) {
        urge = true;
        if (fuel <= 0) warn = 'YAKIT BİTTİ!';
        else if (alt < brakeH * 1.15 + 3) warn = 'İTİCİYİ ATEŞLE!';
      }
    }
    if (airborne && !c.crashed && vy < -0.5 && alt < 14 && Math.abs(err) > 0.5) warn = L.pad.hill ? 'YAMACA PARALEL TUT!' : 'BURNU DÜZELT!';
    $('#c-thrust').classList.toggle('urge', urge && this.state === 'playing');
    const w = $('#warning');
    if (warn && this.state === 'playing') {
      w.textContent = warn;
      w.classList.remove('hidden');
      if (performance.now() - this.lastWarnBeep > 450) {
        this.lastWarnBeep = performance.now();
        this.sound.sfx('warn');
      }
    } else w.classList.add('hidden');

    // flip meter
    const fm = $('#flip-meter');
    if (run.phase === 'air' && (pend > 0 || Math.abs(run.flipAccum) > 1.2)) {
      const pct = Math.min(99, Math.round((Math.abs(run.flipAccum) / (Math.PI * 2)) * 100));
      fm.textContent = `🔄 ×${pend}${Math.abs(run.flipAccum) > 0.6 ? `  ·  %${pct}` : ''}`;
      fm.classList.remove('hidden');
    } else fm.classList.add('hidden');

    this.updateHint(run, spd / 3.6, alt, vy);

    // pad indicator when off screen
    const pa = $('#pad-arrow');
    const padX = L.pad.body.state.ox;
    const p = this.scene.project(padX, L.pad.y + 1, 0);
    const W = window.innerWidth, H = window.innerHeight;
    if (!run.done && (p.x < 20 || p.x > W - 20 || p.y < 20 || p.y > H - 20 || p.behind)) {
      const m = 50;
      const x = Math.max(m + 120, Math.min(W - m, p.x));
      const y = Math.max(m + 40, Math.min(H - m - 120, p.y));
      pa.style.left = x + 'px';
      pa.style.top = y + 'px';
      const ang = Math.atan2(p.y - y, p.x - x);
      pa.querySelector('span').style.transform = `rotate(${ang}rad)`;
      $('#pad-dist').textContent = Math.round(Math.abs(padX - c.x)) + ' m';
      pa.classList.remove('hidden');
    } else pa.classList.add('hidden');
  }

  // First-time coaching on level 1 (and a reminder on the ski jump).
  updateHint(run, speed, alt, vy) {
    const el = $('#hint');
    const def = this.def;
    let text = '';
    if (this.state === 'playing' && this.mode === 'campaign') {
      const first = def.id === 1 && this.progress.level(1).stars === 0;
      const ski = run.L.pad.hill && this.progress.level(def.id).stars === 0;
      const band = run.L.speedBand;
      if (first) {
        if (run.phase === 'drive' && run.car.x < run.L.rampX) {
          if (speed < band.min) text = '▶ GAZ\'a basılı tut — hız göstergesindeki yeşil bölgeye ulaş';
          else if (speed <= band.max) text = 'Yeşil bölgedesin! Gazı bırakıp rampaya gir';
          else text = '◀ FREN ile biraz yavaşla — yeşil bölgeyi aştın';
        } else if (run.phase === 'air' && vy > 0) text = 'Havadasın! ⟲ ⟳ tuşlarıyla takla atabilirsin';
        else if (run.phase === 'air' && alt < 30) text = '🔥 İTİCİ\'ye bas: düşüşü yavaşlat, dikey hız yeşil kalsın';
      } else if (ski && run.phase === 'air') {
        text = 'Ana iticiye dokunma: ⟲ ⟳ ile burnu yamaca paralel tut';
      } else if (ski && run.phase === 'drive' && run.car.x < run.L.rampX) {
        text = 'Yeşil bölge: iticisiz yumuşak iniş hızı';
      }
    }
    if (text !== this.hintKey) {
      this.hintKey = text;
      el.textContent = text;
      el.classList.toggle('hidden', !text);
    }
  }

  // ---------------------------------------------------------------- loop
  onResize() {
    this.scene.resize();
    const portrait = window.innerHeight > window.innerWidth;
    let ok = false;
    try { ok = sessionStorage.getItem('rot-ok') === '1'; } catch (e) { /* ignore */ }
    $('#rotate-hint').classList.toggle('hidden', !(isTouch && portrait && !ok));
  }

  monitorFps(dt) {
    if (this.qualityMode !== 'auto' || this.state !== 'playing') return;
    this.fps.acc += dt;
    this.fps.frames++;
    if (this.fps.acc >= 3) {
      const fps = this.fps.frames / this.fps.acc;
      this.fps.acc = 0;
      this.fps.frames = 0;
      if (fps < 40) {
        const q = this.scene.quality;
        if (q === 'high') this.scene.setQuality('medium');
        else if (q === 'medium' && fps < 30) this.scene.setQuality('low');
      }
    }
  }

  updateMusic() {
    let lvl = 0;
    if (this.state === 'playing') {
      const ph = this.run.phase;
      lvl = ph === 'air' || ph === 'touchdown' ? 2 : 1;
      if (this.run.car.crashed) lvl = 0;
    }
    if (lvl !== this.musicLevel) {
      this.musicLevel = lvl;
      this.music.setIntensity(lvl);
    }
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 1 / 20);
    if (this.fixedDt) dt = this.fixedDt; // used by automated tests
    this.monitorFps(dt);
    const run = this.run;
    const view = { assist: this.progress.data.settings.assist, ghost: this.progress.data.settings.ghost, playing: this.state === 'playing', intro: 0 };

    if (this.state === 'playing') {
      if (this.slowTimer > 0) {
        this.slowTimer -= dt;
        if (this.slowTimer <= 0) this.timeScale = 1;
      }
      this.applyInput();
      run.advance(dt * this.timeScale);
      this.handleEvents();
      if (this.finishTimer > 0) {
        this.finishTimer -= dt;
        if (this.finishTimer <= 0) this.showResult();
      }
      this.sound.update({
        speed: Math.hypot(run.car.vx, run.car.vy),
        gas: run.car.input.gas,
        thrust: run.car.active.thrust,
        rcs: run.car.active.rotL || run.car.active.rotR ? 1 : 0,
        air: run.car.grounded ? 0 : 1,
        active: true,
      });
    } else {
      this.sound.update({ active: false });
      if (this.state === 'result') {
        // keep the world alive behind the results (wreck rolling / car braking)
        run.advance(dt);
        run.events.length = 0;
      }
    }
    this.updateMusic();

    if (this.state === 'briefing') {
      this.introT = Math.min(1, this.introT + dt / 3.5);
      view.intro = Math.max(0.001, this.introT);
      this.menuT += dt;
      run.world.update(this.menuT);
    } else if (this.state === 'menu') {
      this.menuT += dt;
      view.intro = 0.5 + 0.5 * Math.sin(this.menuT * 0.12 - Math.PI / 2) + 0.001;
      run.world.update(this.menuT);
    }

    this.scene.update(dt * (this.state === 'playing' ? this.timeScale : 1), run, view);
    if (this.state === 'playing' || this.state === 'paused') this.updateHUD();
    this.scene.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    window.game = new Game();
  } catch (err) {
    console.error(err);
    $('#loading').textContent = 'Oyun başlatılamadı: ' + (err && err.message ? err.message : err) + ' (WebGL destekleniyor mu?)';
  }
});
