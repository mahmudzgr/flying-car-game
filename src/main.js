// Game controller: state machine, input, HUD, menus.
import { GameScene } from './scene.js';
import { Run, CRASH_IMPACT, landingRating } from './run.js';
import { LEVELS } from './levels.js';
import { Progress, ACHIEVEMENTS } from './progress.js';
import { Sound } from './audio.js';
import { restHeight, thrustAccelFor } from './physics.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const THEME_ICON = { earth: '🌳', valley: '💨', canyon: '🏜️', city: '🏙️', moon: '🌙', mars: '🔴', sea: '🌊', sunset: '🌋' };
const isTouch = matchMedia('(pointer: coarse)').matches;

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
    this.qualityMode = S.quality;
    const q = S.quality === 'auto' ? autoQuality() : S.quality;
    this.scene = new GameScene($('#game'), q);
    this.state = 'menu';
    this.levelIdx = 0;
    this.run = null;
    this.timeScale = 1;
    this.slowTimer = 0;
    this.introT = 0;
    this.menuT = 0;
    this.holds = new Map(); // source id -> action
    this.finishTimer = -1;
    this.fps = { acc: 0, frames: 0, low: 0 };
    this.lastWarnBeep = 0;

    this.bindUI();
    this.bindInput();
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });

    // background level for the main menu
    this.loadLevel(0, false);
    this.showScreen('menu');
    this.refreshMenu();
    this.onResize();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
    setTimeout(() => $('#loading').classList.add('hidden'), 50);
  }

  // ---------------------------------------------------------------- screens
  showScreen(id) {
    for (const s of ['menu', 'levels', 'achievements', 'settings', 'help', 'briefing', 'pause', 'result']) {
      $('#' + s).classList.toggle('hidden', s !== id);
    }
    $('#hud').classList.toggle('hidden', !(id === null || id === 'pause'));
    this.screen = id;
  }

  refreshMenu() {
    const p = this.progress;
    const total = LEVELS.length * 3;
    const ach = Object.keys(p.data.achievements).length;
    $('#menu-stats').textContent = `★ ${p.totalStars()}/${total}   ·   🏆 ${ach}/${ACHIEVEMENTS.length}   ·   Takla: ${p.data.stats.flips}`;
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
      b.className = 'lvl' + (unlocked ? '' : ' locked');
      const stars = [0, 1, 2].map((k) => `<span class="${k < lv.stars ? '' : 'off'}">★</span>`).join('');
      b.innerHTML = `<div class="theme">${THEME_ICON[def.theme] || '🌍'}</div><div class="n">${def.id}</div><div class="t">${def.name}</div><div class="s">${stars}</div><div class="b">${lv.best ? 'En iyi: ' + lv.best.toLocaleString('tr-TR') : unlocked ? 'Yeni' : 'Kilitli'}</div>`;
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

  openBriefing(i) {
    this.loadLevel(i, true);
    const def = LEVELS[i];
    const L = this.run.L;
    const lv = this.progress.level(def.id);
    $('#b-num').textContent = `BÖLÜM ${def.id} / ${LEVELS.length}`;
    $('#b-name').textContent = def.name;
    $('#b-desc').textContent = def.desc;
    const g = L.gravity;
    const facts = [
      `<span class="fact g">Hedef hız ${Math.round(L.speedBand.min * 3.6)}–${Math.round(L.speedBand.max * 3.6)} km/sa</span>`,
      `<span class="fact">Yerçekimi ${g.toFixed(2).replace('.', ',')} m/s²</span>`,
      `<span class="fact">Boşluk ${Math.round(def.pad.dist)} m</span>`,
      `<span class="fact">Platform ${def.pad.len} m</span>`,
    ];
    if (def.wind) facts.push(`<span class="fact">Rüzgar ${Math.abs(def.wind.base * 3.6).toFixed(0)}±${(def.wind.gust * 3.6).toFixed(0)} km/sa</span>`);
    if (def.pad.motion) facts.push('<span class="fact">Hareketli platform</span>');
    $('#b-facts').innerHTML = facts.join('');
    $('#b-obj').innerHTML = def.objectives.map((o, k) => `<li class="${lv.objectives[k] ? 'done' : ''}"><span class="st">★</span>${o.text}</li>`).join('');
    $('#b-tip').textContent = def.tip || '';
    this.state = 'briefing';
    this.introT = 0;
    this.showScreen('briefing');
  }

  loadLevel(i, withGhost) {
    this.levelIdx = i;
    const def = LEVELS[i];
    this.run = new Run(def);
    const lv = this.progress.level(def.id);
    const ghost = withGhost && this.progress.data.settings.ghost && lv.ghost ? lv.ghost : null;
    this.scene.load(this.run, { ghost });
    this.finishTimer = -1;
    this.timeScale = 1;
    this.slowTimer = 0;
    this.holds.clear();
    this.jumpScore = 0;
    $('#hud-level').textContent = `${def.id}. ${def.name}`;
    const band = this.run.L.speedBand;
    this.speedMax = Math.max(200, band.max * 3.6 * 1.6);
    $('#speed-band').style.left = `${((band.min * 3.6) / this.speedMax) * 100}%`;
    $('#speed-band').style.width = `${(((band.max - band.min) * 3.6) / this.speedMax) * 100}%`;
    $('#popups').innerHTML = '';
    $('#flip-meter').classList.add('hidden');
    $('#warning').classList.add('hidden');
  }

  startPlaying() {
    this.state = 'playing';
    this.showScreen(null);
    this.run.world.update(0);
    this.popup('BAŞLA!', 'green');
    this.sound.sfx('go');
  }

  restart() {
    this.sound.sfx('click');
    this.loadLevel(this.levelIdx, true);
    this.state = 'playing';
    this.showScreen(null);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.renderSettings();
    this.showScreen('pause');
  }

  resume() {
    this.state = 'playing';
    this.showScreen(null);
    this.last = performance.now();
  }

  toMenu() {
    this.state = 'menu';
    this.loadLevel(this.levelIdx, false);
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
    click('#m-levels', () => { this.renderLevels(); this.showScreen('levels'); });
    click('#m-ach', () => { this.renderAchievements(); this.showScreen('achievements'); });
    click('#m-settings', () => { this.renderSettings(); this.showScreen('settings'); });
    click('#m-help', () => this.showScreen('help'));
    $$('[data-back]').forEach((b) => b.addEventListener('click', () => {
      this.sound.sfx('click');
      this.refreshMenu();
      this.showScreen('menu');
    }));
    click('#b-back', () => { this.renderLevels(); this.state = 'menu'; this.showScreen('levels'); });
    click('#b-start', () => { this.goFullscreen(); this.startPlaying(); });
    click('#btn-pause', () => this.pause());
    click('#btn-restart', () => this.restart());
    click('#p-resume', () => this.resume());
    click('#p-restart', () => this.restart());
    click('#p-levels', () => { this.toMenu(); this.renderLevels(); this.showScreen('levels'); });
    click('#r-retry', () => this.restart());
    click('#r-levels', () => { this.toMenu(); this.renderLevels(); this.showScreen('levels'); });
    click('#r-next', () => {
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
          this.sound.sfx('land');
          if (r.key === 'perfect') this.slowmo(0.35, 0.6);
          break;
        }
        case 'retry':
          this.popup('Pistte kaldın — tekrar hızlan!', '', true);
          break;
        case 'missed':
          this.popup('HEDEFİ ISKALADIN', 'red');
          this.sound.sfx('fail');
          break;
        case 'crash':
          sc.explosion(e.x, e.y);
          this.sound.sfx('crash');
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
    const prevBest = this.progress.level(def.id).best || 0;
    const rec = this.progress.recordRun(def, run, LEVELS);
    this.state = 'result';
    const t = $('#r-title');
    if (r.success) {
      t.textContent = 'BAŞARILI İNİŞ!';
      t.className = 'win';
      $('#r-reason').textContent = landingRating(r.impact).text + ` · ${r.impact.toFixed(1)} m/s · hedefe ${r.padDist.toFixed(1)} m`;
    } else {
      t.textContent = run.phase === 'missed' ? 'ISKALADIN!' : 'KAZA!';
      t.className = 'lose';
      $('#r-reason').textContent = r.reason;
    }
    $$('#r-stars span').forEach((s, i) => s.classList.toggle('on', i < r.stars));
    $('#r-obj').innerHTML = def.objectives.map((o, k) => `<li class="${r.objectives[k] ? 'done' : 'fail'}"><span class="st">${r.objectives[k] ? '★' : '✗'}</span>${o.text}</li>`).join('');
    $('#r-break').innerHTML = r.breakdown.length
      ? r.breakdown.map((b) => `<li><span>${b.label}</span><b>+${b.pts.toLocaleString('tr-TR')}</b></li>`).join('')
      : '<li><span>Puan için güvenli iniş gerekli</span><b>0</b></li>';
    $('#r-total').textContent = r.score.toLocaleString('tr-TR');
    const best = $('#r-best');
    if (r.success && r.score > prevBest && prevBest > 0) {
      best.textContent = 'YENİ REKOR!';
      best.className = 'new';
    } else {
      best.textContent = `En iyi: ${Math.max(prevBest, r.score).toLocaleString('tr-TR')}`;
      best.className = '';
    }
    $('#r-ach').innerHTML = rec.newAch.map((a) => `<span class="chip">${a.icon} ${a.name}</span>`).join('');
    if (rec.newAch.length) setTimeout(() => this.sound.sfx('ach'), 500);
    const n = this.levelIdx + 1;
    const nextOk = n < LEVELS.length && this.progress.isUnlocked(LEVELS[n].id, LEVELS);
    $('#r-next').textContent = n >= LEVELS.length ? 'BÖLÜMLER' : nextOk ? 'SONRAKİ ›' : 'SONRAKİ 🔒';
    $('#r-next').disabled = false;
    $('#r-next').style.opacity = nextOk || n >= LEVELS.length ? 1 : 0.45;
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
    $('#hud-score').textContent = (run.result ? run.result.score : live).toLocaleString('tr-TR');
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
    const vy = c.vy - (hit ? hit.vy : 0);
    $('#vs').textContent = (vy < 0 ? '↓ ' : '↑ ') + Math.abs(vy).toFixed(1);
    const vsw = $('#vs-wrap');
    const desc = -vy;
    const airborne = run.phase === 'air' || run.phase === 'touchdown';
    vsw.className = 'inst-value ' + (!airborne || desc <= 3 ? 'ok' : desc <= 5 ? 'mid' : desc <= CRASH_IMPACT ? 'hi' : 'bad');
    // attitude
    const padA = L.pad.body.state.angle;
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
    if (airborne && !c.crashed && vy < -0.5) {
      const ta = c.thrustAccel * Math.max(0.2, Math.cos(err)) - g;
      const vImpact = Math.sqrt(vy * vy + 2 * g * alt);
      const brakeH = (vy * vy) / (2 * Math.max(0.5, ta));
      if (vImpact > CRASH_IMPACT * 0.9 && alt < brakeH * 1.5 + 6) {
        urge = true;
        if (fuel <= 0) warn = 'YAKIT BİTTİ!';
        else if (alt < brakeH * 1.15 + 3) warn = 'İTİCİYİ ATEŞLE!';
      }
      if (alt < 14 && Math.abs(err) > 0.5) warn = 'BURNU DÜZELT!';
    }
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
        active: !run.car.crashed || true,
      });
    } else {
      this.sound.update({ active: false });
      if (this.state === 'result') {
        // keep the world alive behind the results (wreck rolling / car braking)
        run.advance(dt);
        run.events.length = 0;
      }
    }

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
void thrustAccelFor;
