// Uzun Yol: mod ön ekranı (açıklama, rekor, araç seçimi). Sahip: Arayüz.
import { VEHICLES, ENDLESS } from '../config.js';
import { esc, lock, vehicleArt, arrowRight, flag, coin } from './icons.js';
import { ownedVehicles } from './progress.js';
import { fmtNum } from './texts.js';

export function createEndless(ctx) {
  const el = document.createElement('section');
  el.className = 'screen endless modal';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Uzun Yol');

  function draw() {
    const d = ctx.save.data, e = d.endless ?? {};
    const owned = ownedVehicles(d);
    const chips = Object.values(VEHICLES).filter((v) => v.implemented).map((v) => {
      const own = d.vehicles[v.id]?.owned, sel = d.vehicle === v.id;
      return `<button class="vchip ${sel ? 'sel' : ''} ${own ? '' : 'off'}" data-act="veh" data-id="${v.id}" data-key="v${v.id}" ${own ? '' : 'disabled'} aria-pressed="${sel}">${vehicleArt(v.id, !own)}<b>${esc(v.name)}</b><small>${own ? esc(v.kind) : `${lock()} Kilitli`}</small></button>`;
    }).join('');
    ctx.nav.render(el, `
      <div class="panel brief-panel">
        <header class="bar">
          <button class="btn btn-ghost btn-icon" data-act="back" aria-label="Geri" data-key="back">‹</button>
          <div class="bar-title"><small>Sonsuz mod</small><h2>Uzun Yol</h2></div>
        </header>
        <div class="brief-body">
          <div class="brief-col">
            <p class="lead">Yol bitmez, kargo bitmez! Her ~${ENDLESS.deliveryEvery} m'de bir bayrağa teslimat yap, yeni yük al, biyomlar arasında yoluna devam et. Kargon bitince ya da kaza yapınca yolculuk sona erer.</p>
            <ul class="recs">
              <li><span>En uzun yol</span><b>${fmtNum(e.bestDistance | 0)} m</b></li>
              <li><span>En yüksek skor</span><b>${fmtNum(e.bestScore | 0)}</b></li>
              <li><span>Yolculuk</span><b>${fmtNum(e.runs | 0)}</b></li>
            </ul>
            <p class="note">${flag()} Teslimatlar kuruş kazandırır ${coin()}</p>
          </div>
          <div class="brief-col">
            <h3>Araç</h3>
            <div class="vchips">${chips}</div>
            <button class="btn btn-primary btn-xl go" data-act="go" data-autofocus data-key="go" ${owned.length ? '' : 'disabled'}><span>Yola çık</span>${arrowRight()}</button>
          </div>
        </div>
      </div>`);
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'back') ctx.nav.back();
    else if (b.dataset.act === 'veh') { const id = b.dataset.id; ctx.save.update((d) => { d.vehicle = id; }); ctx.save.flush(); draw(); }
    else if (b.dataset.act === 'go') { ctx.save.flush(); ctx.flow.startEndless(ctx.save.data.vehicle); }
  });
  return { el, modal: true, enter() { draw(); }, refresh: draw };
}
