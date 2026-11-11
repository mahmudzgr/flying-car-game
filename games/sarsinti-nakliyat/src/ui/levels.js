// Bölge/bölüm seçimi + bölüm ön ekranı (brifing). Sahip: Arayüz.
import { REGIONS, VEHICLES } from '../config.js';
import { esc, stars, star, lock, coin, check, cargoIcon, vehicleArt, arrowRight, clock } from './icons.js';
import { levelLock, totalStars, ownedVehicles, regionOf, cargoPlan } from './progress.js';
import { fmtTime, fmtNum, CARGO_NAMES, diffName, BIOME_NAMES } from './texts.js';


export function createLevels(ctx) {
  const el = document.createElement('section');
  el.className = 'screen levels';
  el.setAttribute('aria-label', 'Bölüm seçimi');
  let region = 1, note = '';

  function regionLevels(id) { return ctx.levels.filter((l) => (l.region ?? 1) === id); }

  function draw() {
    const d = ctx.save.data, stars_ = totalStars(d);
    const tabs = REGIONS.map((r) => {
      const n = regionLevels(r.id).length;
      const locked = stars_ < r.unlockStars;
      const soon = n === 0;
      const sub = soon ? 'Yakında' : locked ? `${lock()} ${r.unlockStars}★` : `${regionLevels(r.id).reduce((a, l) => a + (d.levels[l.id]?.stars | 0), 0)}/${n * 3}★`;
      return `<button class="tab ${r.id === region ? 'sel' : ''} ${locked || soon ? 'dim' : ''}" data-act="region" data-id="${r.id}" data-key="r${r.id}" data-biome="${r.biome}" role="tab" aria-selected="${r.id === region}"><b>${esc(r.name)}</b><small>${sub}</small></button>`;
    }).join('');
    const reg = regionOf(region);
    const list = regionLevels(region);
    const regLocked = stars_ < reg.unlockStars;
    const cards = [];
    const focusId = (list.find((x) => !levelLock(d, ctx.levels, x).locked && !((d.levels[x.id]?.stars | 0) >= 1)) ?? list.find((x) => !levelLock(d, ctx.levels, x).locked))?.id;
    const perRegion = Math.max(4, ...REGIONS.map((r) => regionLevels(r.id).length));
    for (let i = 0; i < Math.max(perRegion, list.length); i++) {
      const l = list[i];
      if (!l) { cards.push(`<div class="lcard soon" aria-hidden="true"><div class="lnum">${region}-${i + 1}</div><div class="lsoon">${lock()}<span>Yakında</span></div></div>`); continue; }
      const rec = d.levels[l.id] ?? {};
      const lk = levelLock(d, ctx.levels, l);
      const cargoTotal = (l.cargo ?? []).reduce((a, c) => a + c.count, 0);
      cards.push(`<button class="lcard ${lk.locked ? 'locked' : ''} ${(rec.stars | 0) >= 3 ? 'gold' : ''}" data-act="level" data-id="${esc(l.id)}" data-key="l${esc(l.id)}" ${l.id === focusId ? 'data-autofocus' : ''} aria-label="${esc(l.id)} ${esc(l.name)}${lk.locked ? ', kilitli: ' + esc(lk.text) : ', ' + (rec.stars | 0) + ' yıldız'}">
        <div class="lnum">${esc(l.id)}</div>
        <div class="lname">${esc(l.name)}</div>
        ${l.teaches ? `<div class="lteach">${esc(l.teaches)}</div>` : ''}
        <div class="lstars">${stars(rec.stars | 0)}</div>
        ${lk.locked ? `<div class="llock">${lock()}<span>${esc(lk.text)}</span></div>`
          : `<div class="lmeta"><span>${cargoTotal} kargo</span><span>${rec.bestTime ? clock() + fmtTime(rec.bestTime) : diffName(l.difficulty)}</span></div>`}
      </button>`);
    }
    ctx.nav.render(el, `
      <header class="bar">
        <button class="btn btn-ghost btn-icon" data-act="back" aria-label="Geri" data-key="back">‹</button>
        <h2>Siparişler</h2>
        <span class="spacer"></span>
        <span class="chip">${coin()}<b>${fmtNum(d.coins)}</b></span>
        <span class="chip">${star(true)}<b>${stars_}</b></span>
      </header>
      <div class="tabs" role="tablist" aria-label="Bölgeler">${tabs}</div>
      <p class="region-note ${regLocked ? 'warn' : ''}" role="status">${regLocked ? `${lock()} <b>${esc(reg.name)}</b> ${reg.unlockStars} yıldızla açılır; şu an ${stars_}★ var.` : note ? esc(note) : `${esc(BIOME_NAMES[reg.biome] ?? reg.name)} · ${list.length ? 'bir bölüm seç' : 'bu bölgenin siparişleri yolda'}`}</p>
      <div class="cards" role="list">${cards.join('')}</div>`);
    const sel = el.querySelector('.tab.sel'); sel?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'back') ctx.nav.back();
    else if (act === 'region') { region = +b.dataset.id; note = ''; draw(); }
    else if (act === 'level') {
      const l = ctx.levels.find((x) => x.id === b.dataset.id);
      const lk = levelLock(ctx.save.data, ctx.levels, l);
      if (lk.locked) { note = `${l.id} kilitli: ${lk.text}.`; draw(); ctx.emit('ui:locked', { id: l.id }); return; }
      ctx.nav.push('brief', { level: l });
    }
  });
  return {
    el,
    enter(p = {}) { if (p.region) region = p.region; note = ''; draw(); },
    refresh: draw,
  };
}

/** Bölüm ön ekranı: kargo, yıldız hedefleri, araç seçimi. */
export function createBrief(ctx) {
  const el = document.createElement('section');
  el.className = 'screen brief modal';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Bölüm ön ekranı');
  let level = null;

  function recommended() {
    const rec = level.recommended;
    if (rec?.vehicle) return { vehicle: rec.vehicle, tier: rec.tier | 0 };
    const diff = level.difficulty ?? 1;
    return { vehicle: 'tosun', tier: diff >= 3 ? Math.round((diff - 2) * 2) : 0 };
  }

  function draw() {
    const d = ctx.save.data, rec = d.levels[level.id] ?? {};
    const vid = d.vehicle, vname = VEHICLES[vid]?.name ?? '';
    const plan = cargoPlan(level, vid), total = plan.total, loaded = plan.loaded;
    const scaled = loaded < total;
    const noteFor = (n) => {
      if (!scaled) return '';
      const parts = [];
      for (const c of level.stars?.[n] ?? []) {
        if (c.kind === 'delivered') parts.push(`en az ${plan.need(c)}/${loaded} teslim`);
        else if (c.kind === 'deliveredAll') parts.push(`${loaded}/${loaded} teslim`);
      }
      return parts.length ? `${vname} ile: ${parts.join(', ')}` : '';
    };
    const goals = [
      { n: 1, text: 'Bitiş bayrağına ulaş' },
      { n: 2, text: (level.stars?.[2] ?? []).map((c) => c.label).join(' + ') || '—' },
      { n: 3, text: (level.stars?.[3] ?? []).map((c) => c.label).join(' + ') || '—' },
    ];
    const cargo = (level.cargo ?? []).map((c) => `<li>${cargoIcon(c.type)}<span><b>${c.count}×</b> ${esc(CARGO_NAMES[c.type] ?? c.type)}</span></li>`).join('');
    const owned = ownedVehicles(d);
    const recm = recommended();
    const vehicles = Object.values(VEHICLES).filter((v) => v.implemented).map((v) => {
      const own = d.vehicles[v.id]?.owned;
      const sel = d.vehicle === v.id;
      return `<button class="vchip ${sel ? 'sel' : ''} ${own ? '' : 'off'}" data-act="veh" data-id="${v.id}" data-key="v${v.id}" ${own ? '' : 'disabled'} aria-pressed="${sel}">${vehicleArt(v.id, !own)}<b>${esc(v.name)}</b>${own ? (recm.vehicle === v.id ? '<small class="rec">önerilen</small>' : `<small>${esc(v.kind)}</small>`) : `<small>${lock()} Kilitli</small>`}</button>`;
    }).join('');
    const recVeh = level.recommended?.vehicle;
    const recWarn = recVeh && d.vehicle !== recVeh ? `<p class="note warnnote">${esc(VEHICLES[d.vehicle]?.name ?? '')} bu bölümde zorlanabilir — önerilen: ${esc(VEHICLES[recVeh]?.name ?? '')}.</p>` : '';
    const tierTxt = recm.tier > 0 ? ` · yükseltme: toplam ~${recm.tier} kademe` : '';
    ctx.nav.render(el, `
      <div class="panel brief-panel">
        <header class="bar">
          <button class="btn btn-ghost btn-icon" data-act="back" aria-label="Geri" data-key="back">‹</button>
          <div class="bar-title"><small>${esc(level.id)} · ${esc(BIOME_NAMES[level.biome] ?? '')} · ${diffName(level.difficulty)}</small><h2>${esc(level.name)}</h2></div>
          <span class="spacer"></span>
          <span class="stars-big" aria-label="${rec.stars | 0} yıldız">${stars(rec.stars | 0)}</span>
        </header>
        <div class="brief-body">
          <div class="brief-col">
            <h3>Kargo</h3>
            <ul class="cargo-list">${cargo || '<li>—</li>'}</ul>
            ${scaled ? `<p class="note warnnote">${vname} yalnızca ${loaded} parça taşıyabilir (${total} yerine); gereken teslim: ${plan.minDelivered}.</p>` : ''}
            <h3>Hedefler</h3>
            <ol class="goals">${goals.map((g) => `<li class="${(rec.stars | 0) >= g.n ? 'done' : ''}"><span class="gstars">${stars(g.n, g.n)}</span><span class="gtext">${esc(g.text)}${noteFor(g.n) ? `<small class="gnote">${esc(noteFor(g.n))}</small>` : ''}</span>${(rec.stars | 0) >= g.n ? check('gtick') : ''}</li>`).join('')}</ol>
            ${level.timeLimit ? `<p class="note">${clock()} Süre sınırı: <b>${level.timeLimit} sn</b></p>` : ''}
            ${rec.best ? `<p class="note">En iyi: <b>${fmtNum(rec.best)}</b> puan · ${fmtTime(rec.bestTime)}</p>` : ''}
          </div>
          <div class="brief-col">
            <h3>Araç <small class="rec-hint">Önerilen: ${esc(VEHICLES[recm.vehicle]?.name ?? '')}${tierTxt}</small></h3>
            <div class="vchips">${vehicles}</div>
            ${recWarn}
            <button class="btn btn-primary btn-xl go" data-act="go" data-autofocus data-key="go" ${owned.length ? '' : 'disabled'}><span>Başla</span>${arrowRight()}</button>
          </div>
        </div>
      </div>`);
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'back') ctx.nav.back();
    else if (act === 'veh') { const id = b.dataset.id; ctx.save.update((d) => { d.vehicle = id; }); ctx.save.flush(); draw(); }
    else if (act === 'go') { ctx.save.flush(); ctx.flow.startLevel(level.id, ctx.save.data.vehicle); }
  });
  return { el, modal: true, enter(p = {}) { if (p.level) level = p.level; if (level) draw(); }, refresh() { if (level) draw(); } };
}
