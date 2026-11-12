// Milimetrik Park — ekranlar ve HUD.
// Ana menü (modlar), kariyer (bölgeler → bölümler), brifing, duraklat, sonuçlar, vale, günlük görev, sınavlar,
// garaj (araç + boya), başarımlar/istatistik, ayarlar.
import { ZONES, LEVELS, EXAMS, PLAYGROUND, VALET_LOT } from '../levels/index.js';
import { VEHICLES, VEHICLE_ORDER, PAINTS } from '../config.js';
import { totalStars } from '../save.js';
import { ACHIEVEMENTS } from '../achievements.js';

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
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 9v4l2.5 2M9.5 2.8h5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
  moves: '<svg viewBox="0 0 24 24"><path d="M7 4v12M7 4L4 7M7 4l3 3M17 20V8M17 20l-3-3M17 20l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  dmg: '<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.2v.3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f2c230"/><circle cx="12" cy="12" r="6.4" fill="none" stroke="#b8860b" stroke-width="1.6"/><path d="M10 8.5h3a2.2 2.2 0 0 1 0 4.4h-3V8.5zM10 12.9v3" fill="none" stroke="#8a6408" stroke-width="1.8" stroke-linecap="round"/></svg>',
  car: '<svg viewBox="0 0 24 24"><path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11M4 11h16v5H4zM6.5 16v2M17.5 16v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="7.5" cy="13.5" r="1" /><circle cx="16.5" cy="13.5" r="1"/></svg>',
  valet: '<svg viewBox="0 0 24 24"><path d="M8 3h8l-1 5H9z" fill="currentColor"/><circle cx="12" cy="11.5" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 21c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="14.5" r="1.6"/></svg>',
  exam: '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 9l2 2 4-4M8.5 15.5h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cone: '<svg viewBox="0 0 24 24"><path d="M10 4h4l4 14H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.5 11.5h7M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4.5a3 3 0 0 0 3 4M17 6h2.5a3 3 0 0 1-3 4M12 13v4M8 20h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const ENV_ICON = { day: '☀️', dusk: '🌇', night: '🌙', rain: '🌧️', storm: '⛈️', indoor: '🅿️' };
const ENV_NAME = { day: 'Gündüz', dusk: 'Akşam', night: 'Gece', rain: 'Yağmur', storm: 'Fırtına', indoor: 'Kapalı alan' };
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const fmtTime = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
const fmtClock = (t) => { const s = Math.max(0, Math.ceil(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const stars = (arr) => arr.map((on) => `<i class="st ${on ? 'on' : ''}">${I.star}</i>`).join('');
const fmt1 = (x) => x.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf = (x) => Math.round(x).toLocaleString('tr-TR');

const SETTINGS_SPEC = [
  { key: 'scheme', label: 'Sürüş kontrolü', opts: [['lever', 'Sürüş kolu'], ['pedals', 'Pedal + vites']], note: 'Sürüş kolu: yukarı it ileri, aşağı çek geri, bırakınca fren; P ayrı. Pedal + vites: gerçekçi P-R-N-D.' },
  { key: 'autoHold', label: 'Auto Hold (pedal modunda)', opts: [[true, 'Açık'], [false, 'Kapalı']], note: 'Frenle tamamen durunca fren tutulur, gaza basınca bırakılır; vites değiştirirken araç kaçmaz.' },
  { key: 'steer', label: 'Dokunmatik direksiyon', opts: [['wheel', 'Simit'], ['slider', 'Kaydırma']] },
  { key: 'touchLock', label: 'Simit: merkezden kilide', opts: [[270, '270°'], [360, '360°'], [450, '450°'], [540, '540°']], note: 'Büyük değer = daha çok çevirme, daha ince ayar. Gerçek araç ~450°.' },
  { key: 'autoCenter', label: 'Direksiyon kendini toplasın', opts: [[true, 'Gerçekçi'], [false, 'Kapalı']], note: 'Gerçekçi: ileri giderken simidi bırakınca düzelir, geri giderken neredeyse düzelmez.' },
  { key: 'camera', label: 'Kamera', opts: [['north', 'Kuzey sabit'], ['follow', 'Araçla dön']] },
  { key: 'guides', label: 'Yörünge çizgileri', opts: [[true, 'Açık'], [false, 'Kapalı']] },
  { key: 'sensors', label: 'Park sensörü', opts: [[true, 'Açık'], [false, 'Kapalı']] },
  { key: 'sound', label: 'Ses', opts: [[true, 'Açık'], [false, 'Kapalı']] },
  { key: 'vibration', label: 'Titreşim', opts: [[true, 'Açık'], [false, 'Kapalı']] },
  { key: 'quality', label: 'Grafik', opts: [['high', 'Yüksek'], ['low', 'Düşük (pil dostu)']] },
];

export function createUI(root, cb) {
  const screens = h('<div class="screens"></div>');
  root.appendChild(screens);
  let current = null, currentData = null;
  let settingsReturn = 'home';

  function show(name, data) {
    screens.replaceChildren();
    current = name; currentData = data;
    document.body.dataset.screen = name || '';
    if (!name) return;
    const el = build[name](data || {});
    screens.appendChild(el);
    const first = el.querySelector('[data-focus]') || el.querySelector('button:not([disabled])');
    if (first && matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true });
  }
  const click = (el, sel, fn) => { const n = el.querySelector(sel); if (n) n.addEventListener('click', () => { cb.click(); fn(); }); };
  const coinChip = () => `<span class="coins">${I.coin}<b>${nf(cb.getSave().coins)}</b></span>`;
  const bar = (title, back = 'home') => `<header class="bar"><button class="btn icon ghost" data-act="back" aria-label="Geri">${I.back}</button><h2>${title}</h2><span class="spacer"></span>${coinChip()}</header>`;
  const wireBack = (el, to) => click(el, '[data-act="back"]', () => (typeof to === 'function' ? to() : show(to)));
  const unlockAll = () => cb.unlockAll();

  function zoneStars(z, s) { return z.levels.reduce((n, L) => n + (s.levels[L.id]?.stars.filter(Boolean).length || 0), 0); }
  function zoneOpen(z, s) { return unlockAll() || totalStars(s) >= z.stars; }
  function levelOpen(z, i, s) { return unlockAll() || i === 0 || !!s.levels[z.levels[i - 1].id]?.stars[0]; }

  const build = {
    home() {
      const s = cb.getSave();
      const ts = totalStars(s);
      const today = cb.dailyInfo();
      const el = h(`
        <section class="screen home">
          <div class="home-top">${coinChip()}<button class="btn icon ghost" data-act="ach" aria-label="Başarımlar">${I.trophy}</button><button class="btn icon ghost" data-act="settings" aria-label="Ayarlar">${I.gear}</button></div>
          <div class="home-card">
            <div class="logo">
              <span class="psign">P</span>
              <div><h1>Milimetrik<span>Park</span></h1><p>Gerçekçi sürüş, kuş bakışı park.</p></div>
            </div>
            <div class="menu">
              <button class="btn primary big" data-act="career" data-focus>${I.play}<span>Kariyer</span><small>${ts} / ${LEVELS.length * 3} ★</small></button>
              <div class="menu-grid">
                <button class="btn tile" data-act="valet">${I.valet}<span>Vale</span><small>${s.valet.best ? `rekor ${nf(s.valet.best)}` : 'süreli'}</small></button>
                <button class="btn tile ${today.done ? '' : 'glow'}" data-act="daily">${I.cal}<span>Günlük</span><small>${today.done ? `bugün %${today.best}` : 'yeni görev'}</small></button>
                <button class="btn tile" data-act="exams">${I.exam}<span>Sınav</span><small>${EXAMS.filter((e) => s.levels[e.id]?.stars[0]).length}/3 geçti</small></button>
                <button class="btn tile" data-act="free">${I.cone}<span>Antrenman</span><small>serbest</small></button>
                <button class="btn tile" data-act="garage">${I.car}<span>Garaj</span><small>${s.vehicles.owned.length}/${VEHICLE_ORDER.length} araç</small></button>
              </div>
            </div>
          </div>
        </section>`);
      click(el, '[data-act="career"]', () => show('career'));
      click(el, '[data-act="valet"]', () => show('valetIntro'));
      click(el, '[data-act="daily"]', () => show('daily'));
      click(el, '[data-act="exams"]', () => show('exams'));
      click(el, '[data-act="free"]', () => show('free'));
      click(el, '[data-act="garage"]', () => show('garage'));
      click(el, '[data-act="ach"]', () => show('achievements'));
      click(el, '[data-act="settings"]', () => { settingsReturn = 'home'; show('settings'); });
      return el;
    },

    career() {
      const s = cb.getSave();
      const el = h(`<section class="screen list">${bar('Kariyer')}<div class="grid zones"></div></section>`);
      const grid = el.querySelector('.grid');
      const ts = totalStars(s);
      for (const z of ZONES) {
        const open = zoneOpen(z, s), got = zoneStars(z, s);
        const card = h(`
          <button class="zcard ${open ? '' : 'locked'}" style="--zc:${z.color}" ${open ? '' : 'aria-disabled="true"'}>
            <span class="zenv">${ENV_ICON[z.env]}</span>
            <span class="zname">${z.name}</span>
            <span class="zdesc">${z.desc}</span>
            <span class="zfoot">${open ? `<span class="zst">${I.star}<b>${got}</b>/${z.levels.length * 3}</span>` : `<span class="zlock">${I.lock} ${z.stars} ★ gerekli (${ts})</span>`}</span>
          </button>`);
        card.onclick = () => { cb.click(); if (open) show('zone', { zone: z }); else cb.toast(`Bu bölge için ${z.stars} yıldız gerekli`, 'warn'); };
        grid.appendChild(card);
      }
      wireBack(el, 'home');
      return el;
    },

    zone({ zone }) {
      const s = cb.getSave();
      const el = h(`<section class="screen list">${bar(zone.name)}<div class="grid"></div></section>`);
      const grid = el.querySelector('.grid');
      zone.levels.forEach((L, i) => {
        const r = s.levels[L.id], open = levelOpen(zone, i, s), v = VEHICLES[L.vehicle];
        const card = h(`
          <button class="lcard ${r?.stars[0] ? 'done' : ''} ${open ? '' : 'locked'}">
            <span class="num">${open ? i + 1 : I.lock}</span>
            <span class="lname">${L.name}</span>
            <span class="lshort">${L.short}</span>
            <span class="lmeta">${ENV_ICON[L.env || 'day']} ${v.name}</span>
            <span class="lstars">${stars(r ? r.stars : [false, false, false])}</span>
            <span class="lbest">${r?.best ? `En iyi %${r.best}` : '&nbsp;'}</span>
          </button>`);
        card.onclick = () => { cb.click(); if (open) cb.openLevel(L.id, 'career'); else cb.toast('Önce önceki bölümü bitir', 'warn'); };
        grid.appendChild(card);
      });
      wireBack(el, 'career');
      return el;
    },

    brief({ level, mode, index, extra }) {
      const p = level.par, v = VEHICLES[level.vehicle || cb.getSave().vehicles.selected];
      let goals = '';
      if (level.exam) {
        goals = `<ol class="tasks">${level.tasks.map((t) => `<li>${t.label}</li>`).join('')}</ol>
          <p class="rules">Koniye ya da herhangi bir yere değmek sınavı bitirir. Kaldırım teması ve %${level.exam.minQuality} altı isabet hata yazar.</p>`;
      } else if (!level.free && mode !== 'valet') {
        goals = `<ul class="goals">
          <li>${stars([true])}<span>Park et: çizgilerin içinde dur, <b>P</b>'ye bas</span></li>
          <li>${stars([true])}<span>Hasarsız: hiçbir yere çarpma, sürtme</span></li>
          <li>${stars([true])}<span>Usta: en fazla <b>${p.moves}</b> hamle ve <b>%${p.quality}</b>+ isabet</span></li>
        </ul>`;
      }
      const kick = mode === 'career' ? `${extra?.zone?.name || ''} · Bölüm ${index + 1}` : mode === 'daily' ? `Günlük Görev · ${level.short}` : mode === 'exam' ? 'Sınav Parkuru' : mode === 'valet' ? 'Vale' : 'Serbest sürüş';
      const el = h(`
        <section class="screen modal brief">
          <div class="panel">
            <p class="kicker">${kick}</p>
            <h2>${level.name}</h2>
            <p class="desc">${level.desc}</p>
            <div class="vchip"><span>${I.car}</span><div><b>${v.name}</b> <small>${v.kind}</small><small>${v.length.toFixed(2).replace('.', ',')} × ${v.width.toFixed(2).replace('.', ',')} m · dönüş Ø ${String(v.turning).replace('.', ',')} m${v.trailer ? ' · römork 3,6 m' : ''}</small></div><span class="envtag">${ENV_ICON[level.env || 'day']} ${ENV_NAME[level.env || 'day']}</span></div>
            ${goals}
            ${level.tip ? `<p class="tip"><b>İpucu</b> ${level.tip}</p>` : ''}
            <div class="ctl-help">${controlsHelp()}</div>
            <div class="row">
              <button class="btn ghost" data-act="back">${I.list}<span>Geri</span></button>
              <button class="btn primary" data-act="go" data-focus>${I.play}<span>Başla</span></button>
            </div>
          </div>
        </section>`);
      click(el, '[data-act="go"]', () => cb.begin());
      click(el, '[data-act="back"]', () => cb.leave());
      return el;
    },

    pause({ level, mode }) {
      const el = h(`
        <section class="screen modal pause">
          <div class="panel">
            <h2>Duraklatıldı</h2>
            <p class="desc">${level.name}</p>
            <div class="col">
              <button class="btn primary" data-act="resume" data-focus>${I.play}<span>Devam</span></button>
              ${mode === 'valet' ? '' : `<button class="btn" data-act="retry">${I.retry}<span>Yeniden başla</span><small>R</small></button>`}
              <button class="btn" data-act="settings">${I.gear}<span>Ayarlar</span></button>
              <button class="btn ghost" data-act="leave">${I.list}<span>${mode === 'valet' ? 'Turu bitir' : 'Çık'}</span></button>
            </div>
          </div>
        </section>`);
      click(el, '[data-act="resume"]', () => cb.resume());
      click(el, '[data-act="retry"]', () => cb.retry());
      click(el, '[data-act="settings"]', () => { settingsReturn = 'pause'; show('settings', { level, mode }); });
      click(el, '[data-act="leave"]', () => cb.leave(true));
      return el;
    },

    result({ level, mode, res, fresh, coins, hasNext, fail, reason, achievements }) {
      if (fail) {
        const why = { damage: ['Araç ağır hasar aldı', 'Hasar %100\'e ulaştı. Daha yavaş git; sensörü dinle.'], pedestrian: ['Yayaya çarptın!', 'Yayalar her zaman önceliklidir. Dur, bekle, sonra devam et.'], 'exam-cone': ['Sınavdan kaldın', 'Koniye değdin. Sınavda koniye değmek kesin hatadır.'], 'exam-hit': ['Sınavdan kaldın', 'Bir yere çarptın.'], time: ['Süre doldu', 'Bu bölümde süre sınırı var.'] }[reason] || ['Olmadı', ''];
        const el = h(`
          <section class="screen modal result fail">
            <div class="panel">
              <p class="kicker">${level.name}</p>
              <h2>${why[0]}</h2>
              <p class="desc">${why[1]}</p>
              <div class="row">
                <button class="btn ghost" data-act="leave">${I.list}<span>Çık</span></button>
                <button class="btn primary" data-act="retry" data-focus>${I.retry}<span>Tekrar</span></button>
              </div>
            </div>
          </section>`);
        click(el, '[data-act="retry"]', () => cb.retry());
        click(el, '[data-act="leave"]', () => cb.leave(true));
        return el;
      }
      const p = level.par;
      const exam = !!level.exam;
      const title = exam ? (res.faults ? 'Geçtin (hatalarla)' : 'SINAVI GEÇTİN!') : res.perfect ? 'MİLİMETRİK!' : res.quality >= 85 ? 'Tertemiz park!' : res.quality >= 65 ? 'Park edildi' : 'Park edildi… sayılır';
      const labels = exam ? ['Geçti', 'Hatasız', `≤${fmtClock(level.exam.parTime)}`] : ['Park et', 'Hasarsız', `≤${p.moves} hamle, %${p.quality}+`];
      const el = h(`
        <section class="screen modal result ${res.perfect || (exam && !res.faults) ? 'perfect' : ''}">
          <div class="panel">
            <p class="kicker">${mode === 'daily' ? 'Günlük Görev' : level.name}</p>
            <h2>${title}</h2>
            <div class="bigstars">${res.stars.map((on, i) => `<div class="bs ${on ? 'on' : ''} ${fresh?.[i] ? 'fresh' : ''}" style="--d:${i * 0.18}s"><i>${I.star}</i><small>${labels[i]}</small></div>`).join('')}</div>
            ${exam ? `<div class="quality"><span>Hata</span><b>${res.faults}</b></div>` : `<div class="quality"><span>İsabet</span><b>%${res.quality}</b></div>`}
            <dl class="stats">
              ${exam ? '' : `<div><dt>Açı sapması</dt><dd>${fmt1(res.angDeg)}°</dd></div><div><dt>Yanal kayma</dt><dd>${Math.round(Math.abs(res.latCm))} cm</dd></div><div><dt>İleri-geri</dt><dd>${Math.round(Math.abs(res.lonCm))} cm</dd></div>`}
              <div><dt>Hamle</dt><dd>${res.moves}${exam ? '' : ` <small>/ ${p.moves}</small>`}</dd></div>
              <div><dt>Süre</dt><dd>${fmtTime(res.time)}</dd></div>
              <div><dt>Hasar</dt><dd>%${Math.round(res.damage)}</dd></div>
            </dl>
            ${coins ? `<p class="earned">${I.coin}<b>+${nf(coins)}</b> jeton</p>` : ''}
            ${achievements?.length ? `<p class="earned ach">${I.trophy}${achievements.map((a) => `<b>${a.name}</b>`).join(' · ')}</p>` : ''}
            <div class="row">
              <button class="btn ghost" data-act="leave">${I.list}<span>Çık</span></button>
              <button class="btn" data-act="retry">${I.retry}<span>Tekrar</span></button>
              ${hasNext ? `<button class="btn primary" data-act="next" data-focus>${I.next}<span>Sonraki</span></button>` : ''}
            </div>
          </div>
        </section>`);
      click(el, '[data-act="retry"]', () => cb.retry());
      click(el, '[data-act="leave"]', () => cb.leave(true));
      click(el, '[data-act="next"]', () => cb.next());
      return el;
    },

    valetIntro() {
      const s = cb.getSave();
      const el = h(`
        <section class="screen modal brief">
          <div class="panel">
            <p class="kicker">Vale</p>
            <h2>Akşam vardiyası</h2>
            <p class="desc">${VALET_LOT.desc}</p>
            <ul class="goals plain">
              <li>${I.timer}<span>150 saniye; her başarılı park <b>+20 sn</b>.</span></li>
              <li>${I.star}<span>Puan = isabet + hız; hasar puanı ve bahşişi düşürür.</span></li>
              <li>${I.car}<span>Müşteriler farklı araçlarla gelir: Kumru'dan Baykuş'a.</span></li>
              <li>${I.trophy}<span>Rekor: <b>${nf(s.valet.best)}</b> puan · ${s.valet.bestCars} araç</span></li>
            </ul>
            <div class="row">
              <button class="btn ghost" data-act="back">${I.list}<span>Geri</span></button>
              <button class="btn primary" data-act="go" data-focus>${I.play}<span>Vardiyaya başla</span></button>
            </div>
          </div>
        </section>`);
      click(el, '[data-act="go"]', () => cb.startValet());
      wireBack(el, 'home');
      return el;
    },

    valetResult({ session, best, coins, achievements }) {
      const el = h(`
        <section class="screen modal result ${best ? 'perfect' : ''}">
          <div class="panel">
            <p class="kicker">Vale · vardiya bitti</p>
            <h2>${best ? 'YENİ REKOR!' : 'Vardiya bitti'}</h2>
            <div class="quality"><span>Puan</span><b>${nf(session.score)}</b></div>
            <dl class="stats">
              <div><dt>Park edilen</dt><dd>${session.cars}</dd></div>
              <div><dt>Hasarlı / iptal</dt><dd>${session.failed}</dd></div>
              <div><dt>Ort. isabet</dt><dd>%${session.log.length ? Math.round(session.log.reduce((a, x) => a + x.quality, 0) / session.log.length) : 0}</dd></div>
            </dl>
            <p class="earned">${I.coin}<b>+${nf(coins)}</b> bahşiş</p>
            ${achievements?.length ? `<p class="earned ach">${I.trophy}${achievements.map((a) => `<b>${a.name}</b>`).join(' · ')}</p>` : ''}
            <div class="row">
              <button class="btn ghost" data-act="leave">${I.list}<span>Ana menü</span></button>
              <button class="btn primary" data-act="again" data-focus>${I.retry}<span>Yeni vardiya</span></button>
            </div>
          </div>
        </section>`);
      click(el, '[data-act="again"]', () => cb.startValet());
      click(el, '[data-act="leave"]', () => cb.toHome());
      return el;
    },

    daily() {
      const info = cb.dailyInfo();
      const L = info.level, v = VEHICLES[L.vehicle];
      const el = h(`
        <section class="screen modal brief">
          <div class="panel">
            <p class="kicker">Günlük Görev · ${info.date.split('-').reverse().join('.')}</p>
            <h2>${L.short}</h2>
            <p class="desc">${L.desc}</p>
            <div class="vchip"><span>${I.car}</span><div><b>${v.name}</b> <small>${v.kind}</small></div><span class="envtag">${ENV_ICON[L.env]} ${ENV_NAME[L.env]}</span></div>
            <ul class="goals plain">
              <li>${I.trophy}<span>Bugünkü en iyi: <b>${info.done ? `%${info.best}` : '—'}</b></span></li>
              <li>${I.cal}<span>Seri: <b>${info.streak}</b> gün${info.done ? '' : ` · bitirince <b>+${info.reward}</b> jeton`}</span></li>
            </ul>
            <div class="row">
              <button class="btn ghost" data-act="back">${I.list}<span>Geri</span></button>
              <button class="btn primary" data-act="go" data-focus>${I.play}<span>${info.done ? 'Rekoru geliştir' : 'Başla'}</span></button>
            </div>
          </div>
        </section>`);
      click(el, '[data-act="go"]', () => cb.openLevel(L.id, 'daily'));
      wireBack(el, 'home');
      return el;
    },

    exams() {
      const s = cb.getSave();
      const el = h(`<section class="screen list">${bar('Sınav Parkuru')}<p class="lead-note">Ehliyet sınavından esinlenen parkurlar: sırayla görevleri yap, hiçbir şeye değme. (Resmî sınav içeriğinin birebir aynısı değildir.)</p><div class="grid"></div></section>`);
      const grid = el.querySelector('.grid');
      for (const E of EXAMS) {
        const r = s.levels[E.id], v = VEHICLES[E.vehicle];
        const card = h(`
          <button class="lcard exam ${r?.stars[0] ? 'done' : ''}">
            <span class="num">${E.name[0]}</span>
            <span class="lname">${E.name}</span>
            <span class="lshort">${E.short} · ${v.name}</span>
            <span class="lmeta">${E.tasks.map((t) => t.label).join(' → ')}</span>
            <span class="lstars">${stars(r ? r.stars : [false, false, false])}</span>
            <span class="lbest">${r?.stars[0] ? `${I.check} Geçti` : '&nbsp;'}</span>
          </button>`);
        card.onclick = () => { cb.click(); cb.openLevel(E.id, 'exam'); };
        grid.appendChild(card);
      }
      wireBack(el, 'home');
      return el;
    },

    free() {
      const s = cb.getSave();
      const el = h(`<section class="screen list">${bar('Antrenman')}<p class="lead-note">${PLAYGROUND.desc}</p><div class="grid vgrid"></div></section>`);
      const grid = el.querySelector('.grid');
      for (const id of VEHICLE_ORDER) {
        const v = VEHICLES[id], own = s.vehicles.owned.includes(id);
        const card = h(`<button class="vcard ${own ? '' : 'locked'}"><canvas width="240" height="110"></canvas><b>${v.name}</b><small>${own ? v.kind : 'Garajda kilitli'}</small></button>`);
        cb.drawVehicle(card.querySelector('canvas'), id, cb.paintOf(id));
        card.onclick = () => { cb.click(); if (own) cb.startFree(id); else cb.toast('Bu aracı garajdan al', 'warn'); };
        grid.appendChild(card);
      }
      wireBack(el, 'home');
      return el;
    },

    garage({ sel } = {}) {
      const s = cb.getSave();
      sel = sel || s.vehicles.selected;
      const v = VEHICLES[sel], own = s.vehicles.owned.includes(sel), ts = totalStars(s);
      const el = h(`
        <section class="screen list garage">
          ${bar('Garaj')}
          <div class="garage-body">
            <div class="vlist"></div>
            <div class="vdetail panel">
              <canvas class="vbig" width="520" height="230"></canvas>
              <h3>${v.name} <small>${v.kind}</small></h3>
              <dl class="specs">
                <div><dt>Boy × en</dt><dd>${v.length.toFixed(2).replace('.', ',')} × ${v.width.toFixed(2).replace('.', ',')} m</dd></div>
                <div><dt>Dönüş çapı</dt><dd>${String(v.turning).replace('.', ',')} m</dd></div>
                <div><dt>Dingil mesafesi</dt><dd>${v.wheelbase.toFixed(2).replace('.', ',')} m</dd></div>
                <div><dt>Çekiş</dt><dd>${{ fwd: 'Önden', rwd: 'Arkadan', awd: '4×4' }[v.drive]}</dd></div>
                <div><dt>Kütle</dt><dd>${nf(v.mass)} kg</dd></div>
                <div><dt>Güç</dt><dd>${Math.round(v.power / 735.5)} BG</dd></div>
              </dl>
              ${v.trailer ? '<p class="note">Römork: 3,6 m kasa, 850 kg. Geri giderken römork direksiyonun tersine döner.</p>' : ''}
              <div class="vactions"></div>
              <h4>Boya</h4>
              <div class="paints"></div>
            </div>
          </div>
        </section>`);
      const list = el.querySelector('.vlist');
      for (const id of VEHICLE_ORDER) {
        const x = VEHICLES[id], o = s.vehicles.owned.includes(id);
        const item = h(`<button class="vitem ${id === sel ? 'sel' : ''} ${o ? '' : 'locked'}"><canvas width="200" height="90"></canvas><span><b>${x.name}</b><small>${o ? (s.vehicles.selected === id ? 'Seçili' : x.kind) : `${x.unlock.stars} ★ · ${nf(x.unlock.price)} jeton`}</small></span></button>`);
        cb.drawVehicle(item.querySelector('canvas'), id, cb.paintOf(id));
        item.onclick = () => { cb.click(); show('garage', { sel: id }); };
        list.appendChild(item);
      }
      cb.drawVehicle(el.querySelector('.vbig'), sel, cb.paintOf(sel));
      const act = el.querySelector('.vactions');
      if (own) {
        const b = h(`<button class="btn ${s.vehicles.selected === sel ? 'ghost' : 'primary'}" ${s.vehicles.selected === sel ? 'disabled' : ''}>${s.vehicles.selected === sel ? 'Seçili araç' : 'Seç'}</button>`);
        b.onclick = () => { cb.click(); cb.selectVehicle(sel); show('garage', { sel }); };
        act.appendChild(b);
      } else {
        const can = ts >= v.unlock.stars;
        const b = h(`<button class="btn primary" ${can && s.coins >= v.unlock.price ? '' : 'disabled'}>${I.coin}<span>${nf(v.unlock.price)} jetonla al</span></button>`);
        b.onclick = () => { cb.click(); if (cb.buyVehicle(sel)) show('garage', { sel }); };
        act.appendChild(b);
        if (!can) act.appendChild(h(`<small class="need">${I.lock} ${v.unlock.stars} yıldız gerekli (şu an ${ts})</small>`));
      }
      const paints = el.querySelector('.paints');
      const cur = s.vehicles.paint[sel] || null;
      const def = h(`<button class="sw ${!cur ? 'sel' : ''}" style="--c:${v.color}" title="Fabrika rengi"><i></i><small>Fabrika</small></button>`);
      def.onclick = () => { cb.click(); cb.setPaint(sel, null); show('garage', { sel }); };
      paints.appendChild(def);
      for (const p of PAINTS) {
        const owned = s.paintsOwned.includes(p.id);
        const sw = h(`<button class="sw ${cur === p.id ? 'sel' : ''} ${owned ? '' : 'buy'}" style="--c:${p.color}" title="${p.name}"><i></i><small>${owned ? p.name : `${p.price}`}</small></button>`);
        sw.onclick = () => {
          cb.click();
          if (!own) { cb.toast('Önce aracı al', 'warn'); return; }
          if (!owned && !cb.buyPaint(p.id)) { cb.toast('Yeterli jeton yok', 'warn'); return; }
          cb.setPaint(sel, p.id); show('garage', { sel });
        };
        paints.appendChild(sw);
      }
      wireBack(el, 'home');
      return el;
    },

    achievements() {
      const s = cb.getSave();
      const el = h(`<section class="screen list">${bar('Başarımlar')}<div class="ach-stats"></div><div class="grid ach"></div></section>`);
      const st = s.stats;
      el.querySelector('.ach-stats').innerHTML = `
        <span><b>${totalStars(s)}</b> yıldız</span><span><b>${st.parks}</b> park</span><span><b>${st.perfect}</b> milimetrik</span>
        <span><b>${st.valetCars}</b> vale aracı</span><span><b>${Math.round(st.playTime / 60)}</b> dk oyun</span>`;
      const grid = el.querySelector('.grid');
      for (const a of ACHIEVEMENTS) {
        const got = !!s.achievements[a.id];
        grid.appendChild(h(`<div class="acard ${got ? 'got' : ''}"><span>${got ? I.trophy : I.lock}</span><b>${a.name}</b><small>${a.desc}</small></div>`));
      }
      wireBack(el, 'home');
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
    const lever = cb.getSave().settings.scheme === 'lever';
    const touch = lever
      ? `<div><b>Dokunmatik</b><span>Sol: direksiyon simidini çevir. Sağ: <b>sürüş kolu</b> — yukarı it ileri, aşağı çek geri; ortadan ne kadar uzaksa o kadar hızlı. Bırakınca araç durur. <b>P</b>: park et.</span></div>`
      : `<div><b>Dokunmatik</b><span>Sol: direksiyon simidi. Sağ: <b>FREN</b> ve <b>GAZ</b> (parmak ne kadar yukarıdaysa o kadar sert), vites P R N D. Auto Hold açıkken frenle durunca araç bekler.</span></div>`;
    const kb = lever
      ? `<div><b>Klavye</b><span><kbd>W</kbd>/<kbd>↑</kbd> ileri · <kbd>S</kbd>/<kbd>↓</kbd> geri (basılı tuttukça hızlanır, <kbd>Shift</kbd> ile çok yavaş) · <kbd>A</kbd><kbd>D</kbd> direksiyon (kısa bas: ince ayar) · <kbd>P</kbd> park · <kbd>Boşluk</kbd> el freni · <kbd>C</kbd> kamera · <kbd>Tab</kbd> harita · <kbd>R</kbd> yeniden · <kbd>Esc</kbd> duraklat</span></div>`
      : `<div><b>Klavye</b><span><kbd>W</kbd> gaz · <kbd>S</kbd> fren · <kbd>A</kbd><kbd>D</kbd> direksiyon · <kbd>E</kbd> D · <kbd>Q</kbd> R · <kbd>N</kbd> N · <kbd>P</kbd> park · <kbd>Boşluk</kbd> el freni · <kbd>C</kbd> kamera · <kbd>Tab</kbd> harita · <kbd>R</kbd> yeniden · <kbd>Esc</kbd> duraklat</span></div>`;
    const pad = `<div><b>Oyun kolu</b><span>Sol çubuk direksiyon · ${lever ? 'RT ileri, LT geri' : 'RT gaz · LT fren · RB D · LB R'} · Y park · X el freni · B harita</span></div>`;
    const basics = lever
      ? `<div><b>Nasıl?</b><span>Kolu az it: araç çok yavaş gider. Bırak: frenle durur ve bekler. Yön değiştirince vites kendiliğinden geçer. Yere girince <b>P</b>.</span></div>`
      : `<div><b>Nasıl?</b><span>Otomatik vites: D/R'de gaza basmasan da araç ~6 km/h sürünür. Hızı frenle ayarla, yere girince <b>P</b>.</span></div>`;
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
        <span class="chip big" data-k="clockChip" hidden><i>${I.timer}</i><b data-k="clock">2:30</b></span>
        <span class="chip" data-k="timeChip"><i>${I.timer}</i><b data-k="time">0:00.0</b></span>
        <span class="chip" data-k="movesChip"><i>${I.moves}</i><b data-k="moves">0</b><small data-k="par"></small></span>
        <span class="chip" data-k="carsChip" hidden><i>${I.car}</i><b data-k="cars">0</b></span>
        <span class="chip" data-k="scoreChip" hidden><i>${I.star}</i><b data-k="score">0</b></span>
        <span class="chip dmg" data-k="dmgChip"><i>${I.dmg}</i><b data-k="dmg">%0</b></span>
        <span class="chip" data-k="faultChip" hidden><i>${I.exam}</i><b data-k="faults">0</b><small>hata</small></span>
      </div>
      <div class="hud-tr">
        <div class="speedo"><b data-k="speed">0</b><small>km/h</small></div>
        <div class="gearbadge" data-k="gear">P</div>
        <button class="hbtn" data-act="cam" aria-label="Kamera">${I.cam}</button>
        <button class="hbtn" data-act="map" aria-label="Harita (basılı tut)">${I.map}</button>
      </div>
      <ol class="tasklist" data-k="tasks" hidden></ol>
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
  const vis = (k, on) => { if (K[k].hidden === on) K[k].hidden = !on; };

  function toast(msg, kind = '', ms = 1800) {
    const host = hud.hidden ? screens : K.toasts;
    const t = h(`<div class="toast ${kind}">${msg}</div>`);
    if (hud.hidden) { t.classList.add('floating'); document.body.appendChild(t); }
    else { K.toasts.prepend(t); while (K.toasts.children.length > 3) K.toasts.lastChild.remove(); }
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
    void host;
  }

  let hudMode = 'career';
  function hudShow(on, level, mode) {
    hud.hidden = !on;
    if (on && level) {
      hudMode = mode || 'career';
      set('name', level.name); set('short', mode === 'valet' ? 'Vale vardiyası' : level.short);
      vis('movesChip', !level.free && mode !== 'valet');
      vis('timeChip', mode !== 'valet');
      vis('clockChip', mode === 'valet');
      vis('carsChip', mode === 'valet');
      vis('scoreChip', mode === 'valet');
      vis('faultChip', !!level.exam);
      set('par', level.free || level.exam ? '' : `/${level.par.moves}`);
      K.toasts.replaceChildren();
      vis('tasks', !!level.tasks);
      last.taskIdx = -1;
    }
  }

  function hudUpdate(game, sens, settings, extra) {
    const car = game.car;
    set('time', fmtTime(game.time));
    set('moves', String(game.moves));
    set('dmg', `%${Math.round(game.damage)}`);
    K.dmgChip.classList.toggle('bad', game.damage > 0);
    set('speed', String(Math.round(Math.abs(car.vLong) * 3.6)));
    const hold = game.driver.hold;
    const gk = car.gear + (hold ? 'A' : '');
    if (last.gearv !== gk) { last.gearv = gk; K.gear.textContent = car.gear; K.gear.dataset.g = car.gear; K.gear.classList.toggle('hold', hold); }
    if (hudMode === 'valet' && extra) {
      set('clock', fmtClock(extra.timeLeft)); K.clockChip.classList.toggle('bad', extra.timeLeft < 20);
      set('cars', String(extra.cars)); set('score', nf(extra.score));
    }
    if (game.level.exam) set('faults', String(game.faults));
    if (game.tasks && last.taskIdx !== game.taskIndex + (game.tasks[game.taskIndex]?.gate || 0) * 100) {
      last.taskIdx = game.taskIndex + (game.tasks[game.taskIndex]?.gate || 0) * 100;
      K.tasks.innerHTML = game.tasks.map((t, i) => `<li class="${t.done ? 'done' : i === game.taskIndex ? 'cur' : ''}">${t.label}${t.type === 'gates' && i === game.taskIndex ? ` <small>${t.gate}/${t.gates.length}</small>` : ''}</li>`).join('');
    }
    const lv = game.live;
    const showLive = !!lv && game.status === 'play';
    vis('live', showLive);
    if (showLive) {
      const ok = lv.inside && lv.facingOk;
      K.live.classList.toggle('ok', ok);
      set('liveState', !lv.facingOk && lv.inside ? 'Ters yön' : ok ? (Math.abs(car.vLong) < 0.3 ? 'İçeride · P\'ye bas' : 'İçeride') : 'Çizgi dışında');
      set('lvA', `${fmt1(lv.angDeg)}°`);
      set('lvL', `${Math.round(Math.abs(lv.latCm))} cm`);
      set('lvQ', `%${lv.quality}`);
    }
    let sd = Infinity, side = '';
    if (sens && settings.sensors) {
      if (car.gear === 'R' && sens.minRear < sd) { sd = sens.minRear; side = 'ARKA'; }
      if (sens.minFront < sd && car.gear !== 'R') { sd = sens.minFront; side = 'ÖN'; }
    }
    const showS = sd < 1.6 && game.status === 'play';
    vis('sensor', showS);
    if (showS) {
      set('sensSide', side);
      set('sensD', sd < 0.3 ? 'DUR' : `${Math.round(sd * 100)} cm`);
      K.sensor.dataset.lvl = sd < 0.3 ? 3 : sd < 0.6 ? 2 : sd < 1 ? 1 : 0;
    }
  }

  return { show, get current() { return current; }, get data() { return currentData; }, toast, hud: { show: hudShow, update: hudUpdate, el: hud } };
}
