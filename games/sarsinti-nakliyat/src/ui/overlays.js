// Duraklatma, sonuç ve onay ekranları. Sahip: Arayüz.
import { esc, stars, star, coin, check, cross, bulb, arrowRight, clock } from './icons.js';
import { failInfo, WIN_TITLES, fmtTime, fmtNum, CARGO_PLURAL } from './texts.js';

export function createPause(ctx) {
  const el = document.createElement('section');
  el.className = 'screen overlay pause';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Duraklatıldı');
  function draw() {
    const l = ctx.currentLevel();
    ctx.nav.render(el, `
      <div class="panel pause-panel">
        <small>${l ? `${esc(l.id)} · ${esc(l.name)}` : 'Oyun'}</small>
        <h2>Duraklatıldı</h2>
        <div class="menu-col">
          <button class="btn btn-primary btn-lg" data-act="resume" data-autofocus data-key="resume"><span>Devam</span>${arrowRight()}</button>
          <button class="btn btn-sun" data-act="retry" data-key="retry">Yeniden dene</button>
          <div class="row2"><button class="btn btn-ghost" data-act="levels" data-key="levels">Bölümler</button><button class="btn btn-ghost" data-act="settings" data-key="settings">Ayarlar</button></div>
        </div>
      </div>`);
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'resume') ctx.flow.resume();
    else if (a === 'retry') ctx.flow.retry();
    else if (a === 'levels') ctx.goMenu('levels');
    else if (a === 'settings') ctx.nav.push('settings', { from: 'pause' });
  });
  return { el, enter(p = {}) { draw(); }, refresh: draw };
}

export function createResult(ctx) {
  const el = document.createElement('section');
  el.className = 'screen overlay result';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Sonuç');
  let timers = [], shownAt = 0, params = null;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  function countTo(node, to, ms = 900) {
    const t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      node.textContent = `+${fmtNum(to * (1 - Math.pow(1 - k, 3)))}`;
      if (k < 1 && node.isConnected) requestAnimationFrame(tick);
    };
    tick();
  }

  function draw() {
    clear();
    const { result: r, reward, level } = params;
    const win = r.result === 'win';
    const d = ctx.save.data, rec = d.levels[level?.id] ?? {};
    const nextExists = win && level && ctx.levels.findIndex((l) => l.id === level.id) >= 0 && ctx.levels[ctx.levels.findIndex((l) => l.id === level.id) + 1];
    el.classList.toggle('win', win); el.classList.toggle('fail', !win);
    if (win) {
      const goals = [2, 3].map((n) => `<li class="${r.stars >= n ? 'done' : 'miss'}"><span class="gstars">${stars(n, n)}</span><span class="gtext">${esc((level?.stars?.[n] ?? []).map((c) => c.label).join(' + ') || '—')}</span>${r.stars >= n ? check('gtick') : cross('gx')}</li>`).join('');
      const best = rec.bestTime && Math.abs(rec.bestTime - r.time) < 0.001;
      ctx.nav.render(el, `
        <div class="panel result-panel">
          <header class="res-head"><div><small>${esc(level?.id ?? '')} · ${esc(level?.name ?? '')}</small><h2>${WIN_TITLES[r.stars] ?? 'Teslim edildi!'}</h2></div>
            <div class="res-stars" aria-label="${r.stars} yıldız">${[1, 2, 3].map((i) => `<span class="rs" data-i="${i}">${star(false, 'empty')}${star(true, 'full')}</span>`).join('')}</div></header>
          <div class="res-body">
            <div class="res-col">
              <dl class="dl">
                <div><dt>Skor</dt><dd><b>${fmtNum(r.score)}</b>${rec.best === r.score && rec.tries > 1 ? ' <em class="rec">rekor!</em>' : ''}</dd></div>
                <div><dt>Süre</dt><dd>${clock()}${fmtTime(r.time)}${best ? (rec.tries > 1 ? ' <em class="rec">en iyi!</em>' : '') : rec.bestTime ? ` <small>(en iyi ${fmtTime(rec.bestTime)})</small>` : ''}</dd></div>
                <div><dt>Kargo</dt><dd>${r.cargoDelivered}/${r.cargoTotal}${r.intact ? ' <em class="rec">hasarsız</em>' : ''}</dd></div>
                ${r.flips ? `<div><dt>Takla</dt><dd>${r.flips}</dd></div>` : ''}
                ${r.maxMultiplier > 1 ? `<div><dt>En yüksek kombo</dt><dd>×${r.maxMultiplier}</dd></div>` : ''}
              </dl>
              <ul class="goals compact">${goals}</ul>
            </div>
            <div class="res-col reward">
              <ul class="dl rew">
                <li><span>Bölüm ödülü</span><b>+${fmtNum(reward?.completion ?? 0)}</b></li>
                ${reward?.starBonus ? `<li><span>Yeni yıldız primi</span><b>+${fmtNum(reward.starBonus)}</b></li>` : ''}
                <li><span>Skor</span><b>+${fmtNum(reward?.scoreCoins ?? 0)}</b></li>
                ${reward?.pickups ? `<li><span>Yolda toplanan</span><b>+${fmtNum(reward.pickups)}</b></li>` : ''}
              </ul>
              <div class="total">${coin()}<b id="res-total">+0</b></div>
            </div>
          </div>
          <footer class="res-actions">
            <button class="btn btn-ghost" data-act="retry" data-key="retry" ${nextExists ? '' : 'data-autofocus'}>Tekrar</button>
            <button class="btn btn-ghost" data-act="garage" data-key="garage">Garaj</button>
            <button class="btn btn-ghost" data-act="levels" data-key="levels">Bölümler</button>
            ${nextExists ? `<button class="btn btn-primary" data-act="next" data-key="next" data-autofocus><span>Sonraki</span>${arrowRight()}</button>` : ''}
          </footer>
        </div>`);
      countTo(el.querySelector('#res-total'), reward?.total ?? 0);
      for (let i = 1; i <= r.stars; i++) timers.push(setTimeout(() => {
        el.querySelector(`.rs[data-i="${i}"]`)?.classList.add('lit'); ctx.emit('ui:star', { index: i });
      }, 350 + (i - 1) * 520));
    } else {
      const info = failInfo(r.reason, (rec.tries | 0) + (r.reason?.length | 0));
      const lostCoins = reward?.total | 0;
      ctx.nav.render(el, `
        <div class="panel result-panel fail-panel">
          <div class="fail-head"><span class="fail-badge" aria-hidden="true">!</span><div><small>${esc(level?.id ?? '')} · ${esc(level?.name ?? '')}${rec.tries ? ` · deneme ${rec.tries}` : ''}</small><h2>${esc(info.title)}</h2></div></div>
          <p class="fail-line">${esc(info.line)}</p>
          <p class="fail-tip">${bulb()}<span><b>İpucu:</b> ${esc(info.tip)}</span></p>
          ${r.cargoTotal ? `<p class="fail-meta">Kargo: ${r.cargoDelivered}/${r.cargoTotal} teslim${lostCoins ? ` · yoldan ${coin()} +${fmtNum(lostCoins)}` : ''}</p>` : ''}
          <footer class="res-actions">
            <button class="btn btn-primary btn-xl" data-act="retry" data-key="retry" data-autofocus><span>Tekrar dene</span>${arrowRight()}</button>
            <button class="btn btn-ghost" data-act="levels" data-key="levels">Bölümler</button>
            <button class="btn btn-ghost" data-act="garage" data-key="garage">Garaj</button>
          </footer>
        </div>`);
    }
  }

  el.addEventListener('click', (e) => {
    const guard = performance.now() - shownAt < 350;
    const b = e.target.closest('[data-act]');
    if (!b) { // başarısızlıkta boşluğa dokun = anında yeniden dene
      if (!el.classList.contains('fail') || guard || e.target.closest('.panel')) return;
      ctx.flow.retry(); return;
    }
    if (guard && e.detail > 0) return; // şans eseri çift dokunuşa karşı
    switch (b.dataset.act) {
      case 'retry': ctx.flow.retry(); break;
      case 'next': ctx.flow.nextLevel(); break;
      case 'garage': ctx.goMenu('garage'); break;
      case 'levels': ctx.goMenu('levels', params?.level?.region); break;
    }
  });
  return { el, enter(p = {}) { if (p.result) { params = p; shownAt = performance.now(); } if (params) draw(); }, refresh() {}, leave: clear };
}

export function createConfirm(ctx) {
  const el = document.createElement('section');
  el.className = 'screen modal confirm';
  el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
  let opts = null;
  function draw() {
    ctx.nav.render(el, `
      <div class="panel confirm-panel">
        <h3>${esc(opts.title)}</h3><p>${esc(opts.text)}</p>
        <div class="row2">
          <button class="btn btn-ghost" data-act="no" data-key="no" ${opts.tone === 'warn' ? 'data-autofocus' : ''}>Vazgeç</button>
          <button class="btn ${opts.tone === 'warn' ? 'btn-danger' : 'btn-primary'}" data-act="yes" data-key="yes" ${opts.tone === 'warn' ? '' : 'data-autofocus'}>${esc(opts.yes ?? 'Tamam')}</button>
        </div>
      </div>`);
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const o = opts; ctx.nav.back();
    if (b.dataset.act === 'yes') o.onYes?.();
  });
  return { el, modal: true, enter(p = {}) { if (p.title) opts = p; if (opts) draw(); } };
}
