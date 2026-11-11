// Milimetrik Park — ekranlar (ana menü, bölümler, brifing, duraklat, sonuç, ayarlar) ve HUD.
import { LEVELS, PLAYGROUND } from '../levels/index.js';

const I = {
  pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke-width="2.2" stroke-linecap="round" fill="none" stroke="currentColor"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z"/></svg>',
  retry: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  guide: '<svg viewBox="0 0 24 24"><path d="M7 21c0-6 2-11 5-16M17 21c0-6-2-11-5-16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 3"/></svg>',
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 9v4l2.5 2M9.5 2.8h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
  moves: '<svg viewBox="0 0 24 24"><path d="M7 4v12M7 4L4 7M7 4l3 3M17 20V8M17 20l-3-3M17 20l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  dmg: '<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.2v.3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const fmtTime = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
const stars = (arr) => arr.map((on) => `<i class="st ${on ? 'on' : ''}">${I.star}</i>`).join('');
const fmt1 = (x) => x.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const SETTINGS_SPEC = [
  { key: 'steer', label: 'Dokunmatik direksiyon', opts: [['wheel', 'Simit'], ['slider', 'Kaydırma']] },
  { key: 'touchLock', label: 'Simit: merkezden kilide', opts: [[270, '270°'], [360, '360°'], [450, '450°'], [540, '540°']], note: 'Büyük değer = daha çok çevirme, daha ince ayar. Gerçek araç ~450°.' },
  { key: 'autoCenter', label: 'Direksiyon kendini toplasın', opts: [[true, 'Gerçekçi'], [false, 'Kapalı']], note: 'Gerçekçi: ileri giderken simidi bırakınca düzelir, geri giderken neredeyse düzelmez.' },
  { key: 'camera', label: 'Kamera', opts: [['north', 'Kuzey sabit'], ['follow', 'Araçla dön']] },
  { key: 'guides', label: 'Yörünge çizgileri', opts: [[true, 'Açık'], [false, 'Kapalı']] },
  { key: 'sensors', label: 'Park sensörü', opts: [[true, 'Açık'], [false, 'Kapalı']] },
  { key: 'sound', label: 'Ses', opts: [[true, 'Açık'], [false, 'Kapalı']] },
];

export function createUI(root, cb) {
  const screens = h('<div class="screens"></div>');
  root.appendChild(screens);
  let current = null;
  let settingsReturn = 'home';

  function show(name, data) {
    screens.replaceChildren();
    current = name;
    document.body.dataset.screen = name || '';
    if (!name) return;
    const el = build[name](data);
    screens.appendChild(el);
    const first = el.querySelector('[data-focus]') || el.querySelector('button');
    if (first && matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true });
  }

  const build = {
    home() {
      const s = cb.getSave();
      const total = LEVELS.reduce((n, L) => n + (s.levels[L.id]?.stars.filter(Boolean).length || 0), 0);
      const el = h(`
        <section class="screen home">
          <div class="home-card">
            <div class="logo">
              <span class="psign">P</span>
              <div><h1>Milimetrik<span>Park</span></h1><p>Gerçekçi sürüş, kuş bakışı park.</p></div>
            </div>
            <div class="menu">
              <button class="btn primary big" data-act="play" data-focus>${I.play}<span>Oyna</span><small>${total} / ${LEVELS.length * 3} ★</small></button>
              <button class="btn" data-act="free">${I.guide}<span>Antrenman Alanı</span><small>serbest sürüş</small></button>
              <button class="btn ghost" data-act="settings">${I.gear}<span>Ayarlar</span></button>
            </div>
            <p class="badge">Konsept sürüm · 7 bölüm</p>
          </div>
        </section>`);
      el.querySelector('[data-act="play"]').onclick = () => cb.click() || show('levels');
      el.querySelector('[data-act="free"]').onclick = () => cb.click() || cb.startLevel(PLAYGROUND.id);
      el.querySelector('[data-act="settings"]').onclick = () => { cb.click(); settingsReturn = 'home'; show('settings'); };
      return el;
    },

    levels() {
      const s = cb.getSave();
      const el = h(`
        <section class="screen levels">
          <header class="bar"><button class="btn icon ghost" data-act="back" aria-label="Geri">${I.back}</button><h2>Bölümler</h2></header>
          <div class="grid"></div>
        </section>`);
      const grid = el.querySelector('.grid');
      LEVELS.forEach((L, i) => {
        const r = s.levels[L.id];
        const card = h(`
          <button class="lcard ${r?.stars[0] ? 'done' : ''}">
            <span class="num">${i + 1}</span>
            <span class="lname">${L.name}</span>
            <span class="lshort">${L.short}</span>
            <span class="lstars">${stars(r ? r.stars : [false, false, false])}</span>
            <span class="lbest">${r?.best ? `En iyi %${r.best}` : '&nbsp;'}</span>
          </button>`);
        card.onclick = () => { cb.click(); cb.startLevel(L.id); };
        grid.appendChild(card);
      });
      el.querySelector('[data-act="back"]').onclick = () => { cb.click(); show('home'); };
      return el;
    },

    brief({ level, index }) {
      const p = level.par;
      const goals = level.free ? '' : `
        <ul class="goals">
          <li>${stars([true])}<span>Park et: çizgilerin içinde dur, <b>P</b>'ye al</span></li>
          <li>${stars([true])}<span>Hasarsız: hiçbir yere çarpma, sürtme</span></li>
          <li>${stars([true])}<span>Usta: en fazla <b>${p.moves}</b> hamle ve <b>%${p.quality}</b>+ isabet</span></li>
        </ul>`;
      const el = h(`
        <section class="screen modal brief">
          <div class="panel">
            <p class="kicker">${level.free ? 'Serbest sürüş' : `Bölüm ${index + 1} / ${LEVELS.length}`}</p>
            <h2>${level.name}</h2>
            <p class="desc">${level.desc}</p>
            ${goals}
            ${level.tip ? `<p class="tip"><b>İpucu</b> ${level.tip}</p>` : ''}
            <div class="ctl-help">${controlsHelp()}</div>
            <div class="row">
              <button class="btn ghost" data-act="back">${I.list}<span>Bölümler</span></button>
              <button class="btn primary" data-act="go" data-focus>${I.play}<span>Başla</span></button>
            </div>
          </div>
        </section>`);
      el.querySelector('[data-act="go"]').onclick = () => { cb.click(); cb.begin(); };
      el.querySelector('[data-act="back"]').onclick = () => { cb.click(); cb.toLevels(); };
      return el;
    },

    pause({ level }) {
      const el = h(`
        <section class="screen modal pause">
          <div class="panel">
            <h2>Duraklatıldı</h2>
            <p class="desc">${level.name}</p>
            <div class="col">
              <button class="btn primary" data-act="resume" data-focus>${I.play}<span>Devam</span></button>
              <button class="btn" data-act="retry">${I.retry}<span>Yeniden başla</span><small>R</small></button>
              <button class="btn" data-act="settings">${I.gear}<span>Ayarlar</span></button>
              <button class="btn ghost" data-act="levels">${I.list}<span>${level.free ? 'Ana menü' : 'Bölümler'}</span></button>
            </div>
          </div>
        </section>`);
      el.querySelector('[data-act="resume"]').onclick = () => { cb.click(); cb.resume(); };
      el.querySelector('[data-act="retry"]').onclick = () => { cb.click(); cb.retry(); };
      el.querySelector('[data-act="settings"]').onclick = () => { cb.click(); settingsReturn = 'pause'; show('settings', { level }); };
      el.querySelector('[data-act="levels"]').onclick = () => { cb.click(); level.free ? cb.toHome() : cb.toLevels(); };
      return el;
    },

    result({ level, res, fresh, hasNext, fail }) {
      if (fail) {
        const el = h(`
          <section class="screen modal result fail">
            <div class="panel">
              <p class="kicker">${level.name}</p>
              <h2>Araç ağır hasar aldı</h2>
              <p class="desc">Hasar %100'e ulaştı. Daha yavaş git; frenle hız ayarla, sensörü dinle.</p>
              <div class="row">
                <button class="btn ghost" data-act="levels">${I.list}<span>Bölümler</span></button>
                <button class="btn primary" data-act="retry" data-focus>${I.retry}<span>Tekrar</span></button>
              </div>
            </div>
          </section>`);
        el.querySelector('[data-act="retry"]').onclick = () => { cb.click(); cb.retry(); };
        el.querySelector('[data-act="levels"]').onclick = () => { cb.click(); cb.toLevels(); };
        return el;
      }
      const p = level.par;
      const title = res.perfect ? 'MİLİMETRİK!' : res.quality >= 85 ? 'Tertemiz park!' : res.quality >= 65 ? 'Park edildi' : 'Park edildi… sayılır';
      const labels = ['Park et', 'Hasarsız', `≤${p.moves} hamle, %${p.quality}+`];
      const el = h(`
        <section class="screen modal result ${res.perfect ? 'perfect' : ''}">
          <div class="panel">
            <p class="kicker">${level.name}</p>
            <h2>${title}</h2>
            <div class="bigstars">${res.stars.map((on, i) => `<div class="bs ${on ? 'on' : ''} ${fresh[i] ? 'fresh' : ''}" style="--d:${i * 0.18}s"><i>${I.star}</i><small>${labels[i]}</small></div>`).join('')}</div>
            <div class="quality"><span>İsabet</span><b>%${res.quality}</b></div>
            <dl class="stats">
              <div><dt>Açı sapması</dt><dd>${fmt1(res.angDeg)}°</dd></div>
              <div><dt>Yanal kayma</dt><dd>${Math.round(Math.abs(res.latCm))} cm</dd></div>
              <div><dt>İleri-geri</dt><dd>${Math.round(Math.abs(res.lonCm))} cm</dd></div>
              <div><dt>Hamle</dt><dd>${res.moves} <small>/ ${p.moves}</small></dd></div>
              <div><dt>Süre</dt><dd>${fmtTime(res.time)}</dd></div>
              <div><dt>Hasar</dt><dd>%${Math.round(res.damage)}</dd></div>
            </dl>
            <div class="row">
              <button class="btn ghost" data-act="levels">${I.list}<span>Bölümler</span></button>
              <button class="btn" data-act="retry">${I.retry}<span>Tekrar</span></button>
              ${hasNext ? `<button class="btn primary" data-act="next" data-focus>${I.next}<span>Sonraki</span></button>` : ''}
            </div>
          </div>
        </section>`);
      el.querySelector('[data-act="retry"]').onclick = () => { cb.click(); cb.retry(); };
      el.querySelector('[data-act="levels"]').onclick = () => { cb.click(); cb.toLevels(); };
      el.querySelector('[data-act="next"]')?.addEventListener('click', () => { cb.click(); cb.next(); });
      return el;
    },

    settings() {
      const s = cb.getSave().settings;
      const el = h(`
        <section class="screen modal settings">
          <div class="panel wide">
            <header class="bar"><button class="btn icon ghost" data-act="back" aria-label="Geri">${I.back}</button><h2>Ayarlar</h2></header>
            <div class="setlist"></div>
            <details class="keys"><summary>Kontroller</summary>${controlsHelp(true)}</details>
          </div>
        </section>`);
      const list = el.querySelector('.setlist');
      for (const spec of SETTINGS_SPEC) {
        const row = h(`<div class="setrow"><div class="sl"><span>${spec.label}</span>${spec.note ? `<small>${spec.note}</small>` : ''}</div><div class="seg"></div></div>`);
        const seg = row.querySelector('.seg');
        for (const [val, txt] of spec.opts) {
          const b = h(`<button class="segbtn ${s[spec.key] === val ? 'sel' : ''}">${txt}</button>`);
          b.onclick = () => {
            cb.click();
            cb.setSetting(spec.key, val);
            for (const x of seg.children) x.classList.remove('sel');
            b.classList.add('sel');
          };
          seg.appendChild(b);
        }
        list.appendChild(row);
      }
      el.querySelector('[data-act="back"]').onclick = () => { cb.click(); settingsReturn === 'pause' ? cb.backToPause() : show('home'); };
      return el;
    },
  };

  function controlsHelp(full = false) {
    const touch = `<div><b>Dokunmatik</b><span>Sol: direksiyon simidini parmağınla çevir (birkaç tur atabilirsin). Sağ: <b>FREN</b> ve <b>GAZ</b> pedalları; parmağın pedalın ne kadar yukarısındaysa o kadar sert basar. Vites: P R N D.</span></div>`;
    const kb = `<div><b>Klavye</b><span><kbd>W</kbd>/<kbd>↑</kbd> gaz · <kbd>S</kbd>/<kbd>↓</kbd> fren · <kbd>A</kbd><kbd>D</kbd>/<kbd>←</kbd><kbd>→</kbd> direksiyon (kısa bas: ince ayar) · <kbd>E</kbd> D · <kbd>Q</kbd> R · <kbd>N</kbd> N · <kbd>P</kbd> park · <kbd>Boşluk</kbd> el freni · <kbd>C</kbd> kamera · <kbd>Tab</kbd> harita · <kbd>R</kbd> yeniden · <kbd>Esc</kbd> duraklat</span></div>`;
    const pad = `<div><b>Oyun kolu</b><span>Sol çubuk direksiyon · RT gaz · LT fren · RB D · LB R · Y P · X el freni · B harita</span></div>`;
    const basics = `<div><b>Nasıl?</b><span>Otomatik vites: D/R'de gaza basmasan da araç ~6 km/h sürünür. Hızı frenle ayarla, yeri bulunca dur ve <b>P</b>'ye al.</span></div>`;
    return full ? basics + touch + kb + pad : basics + (matchMedia('(pointer: coarse)').matches ? touch : kb);
  }

  // ------------------------------------------------------------ HUD
  const hud = h(`
    <div class="hud" hidden>
      <div class="hud-tl">
        <button class="hbtn" data-act="pause" aria-label="Duraklat">${I.pause}</button>
        <div class="hud-title"><b data-k="name"></b><small data-k="short"></small></div>
      </div>
      <div class="hud-tc">
        <span class="chip"><i>${I.timer}</i><b data-k="time">0:00.0</b></span>
        <span class="chip" data-k="movesChip"><i>${I.moves}</i><b data-k="moves">0</b><small data-k="par"></small></span>
        <span class="chip dmg" data-k="dmgChip"><i>${I.dmg}</i><b data-k="dmg">%0</b></span>
      </div>
      <div class="hud-tr">
        <div class="speedo"><b data-k="speed">0</b><small>km/h</small></div>
        <div class="gearbadge" data-k="gear">P</div>
        <button class="hbtn" data-act="cam" aria-label="Kamera">${I.cam}</button>
        <button class="hbtn" data-act="map" aria-label="Harita (basılı tut)">${I.map}</button>
      </div>
      <div class="live" data-k="live" hidden>
        <span data-k="liveState"></span>
        <span class="lv"><small>Açı</small><b data-k="lvA"></b></span>
        <span class="lv"><small>Yanal</small><b data-k="lvL"></b></span>
        <span class="lv"><small>İsabet</small><b data-k="lvQ"></b></span>
      </div>
      <div class="toasts" data-k="toasts"></div>
      <div class="sensor" data-k="sensor" hidden><small data-k="sensSide"></small><b data-k="sensD"></b></div>
    </div>`);
  root.appendChild(hud);
  const K = {};
  for (const n of hud.querySelectorAll('[data-k]')) K[n.dataset.k] = n;
  hud.querySelector('[data-act="pause"]').onclick = () => cb.pause();
  hud.querySelector('[data-act="cam"]').onclick = () => cb.toggleCamera();
  const mapBtn = hud.querySelector('[data-act="map"]');
  mapBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); cb.setMap(true); mapBtn.classList.add('on'); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) mapBtn.addEventListener(ev, () => { cb.setMap(false); mapBtn.classList.remove('on'); });

  const last = {};
  const set = (k, v) => { if (last[k] !== v) { last[k] = v; K[k].textContent = v; } };

  function toast(msg, kind = '', ms = 1800) {
    const t = h(`<div class="toast ${kind}">${msg}</div>`);
    K.toasts.prepend(t);
    while (K.toasts.children.length > 3) K.toasts.lastChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
  }

  function hudShow(on, level) {
    hud.hidden = !on;
    if (on && level) {
      set('name', level.name); set('short', level.short);
      K.movesChip.hidden = !!level.free;
      set('par', level.free ? '' : `/${level.par.moves}`);
      K.toasts.replaceChildren();
    }
  }

  function hudUpdate(game, sens, settings) {
    const car = game.car;
    set('time', fmtTime(game.time));
    set('moves', String(game.moves));
    set('dmg', `%${Math.round(game.damage)}`);
    K.dmgChip.classList.toggle('bad', game.damage > 0);
    set('speed', String(Math.round(Math.abs(car.vLong) * 3.6)));
    if (last.gearv !== car.gear) { last.gearv = car.gear; K.gear.textContent = car.gear; K.gear.dataset.g = car.gear; }
    const lv = game.live;
    const showLive = !!lv && game.status === 'play';
    if (K.live.hidden === showLive) K.live.hidden = !showLive;
    if (showLive) {
      const ok = lv.inside && lv.facingOk;
      K.live.classList.toggle('ok', ok);
      set('liveState', !lv.facingOk && lv.inside ? 'Ters yön' : ok ? (Math.abs(car.vLong) < 0.3 ? 'İçeride · P\'ye al' : 'İçeride') : 'Çizgi dışında');
      set('lvA', `${fmt1(lv.angDeg)}°`);
      set('lvL', `${Math.round(Math.abs(lv.latCm))} cm`);
      set('lvQ', `%${lv.quality}`);
    }
    // sensör mesafesi
    let sd = Infinity, side = '';
    if (sens && settings.sensors) {
      if (car.gear === 'R' && sens.minRear < sd) { sd = sens.minRear; side = 'ARKA'; }
      if (sens.minFront < sd && car.gear !== 'R') { sd = sens.minFront; side = 'ÖN'; }
    }
    const showS = sd < 1.5 && game.status === 'play';
    if (K.sensor.hidden === showS) K.sensor.hidden = !showS;
    if (showS) {
      set('sensSide', side);
      set('sensD', sd < 0.3 ? 'DUR' : `${Math.round(sd * 100)} cm`);
      K.sensor.dataset.lvl = sd < 0.3 ? 3 : sd < 0.6 ? 2 : sd < 1 ? 1 : 0;
    }
  }

  return { show, get current() { return current; }, toast, hud: { show: hudShow, update: hudUpdate, el: hud } };
}
