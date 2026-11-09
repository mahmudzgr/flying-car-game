// Garaj: araçlar, istatistikler, 3 hat × 4 kademe yükseltme, araç açma, sıfırlama/iade. Sahip: Arayüz.
import { VEHICLES, VEHICLE_ORDER, UPGRADE_LINES, ECONOMY } from '../config.js';
import { effectiveVehicle } from '../sim/upgrades.js';
import { upgradeCost } from '../sim/economy.js';
import { esc, coin, star, lock, check, cross, vehicleArt } from './icons.js';
import { totalStars, unlockCheck, buyVehicle, buyUpgrade, resetUpgrades, spentOn, vehicleState } from './progress.js';
import { STAT_NAMES, LINE_NAMES, LINE_HINT, fmtNum } from './texts.js';

const clamp5 = (v) => Math.max(0, Math.min(5, v));

/** Çubuk değerleri: taban (config.stats) + yükseltme etkisi. */
export function vehicleStats(id, up) {
  const base = VEHICLES[id], eff = effectiveVehicle(id, up), b = base.stats;
  const torque = eff.motorTorque / base.motorTorque;
  return {
    speed: clamp5(b.speed * (eff.maxWheelSpeed / base.maxWheelSpeed) * (1 + (torque - 1) * 0.5)),
    traction: clamp5(b.traction * (eff.grip / base.grip) * (1 + (torque - 1) * 0.3)),
    balance: clamp5(b.balance * (eff.zeta / base.zeta) * (1 + (eff.travel[1] / base.travel[1] - 1) * 0.5)),
    capacity: b.capacity,
    air: b.air,
  };
}

export function createGarage(ctx) {
  const el = document.createElement('section');
  el.className = 'screen garage';
  el.setAttribute('aria-label', 'Garaj');
  let sel = 'tosun', note = '';

  function statBars(id, up) {
    const base = vehicleStats(id, {}), cur = vehicleStats(id, up);
    return Object.keys(STAT_NAMES).map((k) => {
      const bonus = Math.max(0, cur[k] - base[k]);
      return `<div class="stat"><span>${STAT_NAMES[k]}</span><div class="bar-track" role="img" aria-label="${STAT_NAMES[k]} ${cur[k].toFixed(1)} / 5"><i class="b" style="width:${(base[k] / 5) * 100}%"></i><i class="u" style="left:${(base[k] / 5) * 100}%;width:${(bonus / 5) * 100}%"></i></div><em>${cur[k].toFixed(1)}</em></div>`;
    }).join('');
  }

  function side(d, id) {
    const v = VEHICLES[id], rec = vehicleState(d, id);
    if (!v.implemented) return `<div class="soon-box"><div class="big-lock">${lock()}</div><h3>Yakında</h3><p>${esc(v.name)} henüz atölyede. Bir sonraki sürümde yollarda!</p></div>`;
    if (!rec.owned) {
      const c = unlockCheck(d, id), ok = c.okStars && c.okCoins;
      return `<div class="unlock-box"><h3>${esc(v.name)} kilitli</h3>
        <ul class="reqs">
          <li class="${c.okStars ? 'ok' : 'no'}">${c.okStars ? check() : cross()}<span>${star(true)} <b>${v.unlock.stars}</b> yıldız <small>(şu an ${c.stars})</small></span></li>
          <li class="${c.okCoins ? 'ok' : 'no'}">${c.okCoins ? check() : cross()}<span>${coin()} <b>${fmtNum(v.unlock.coins)}</b> kuruş <small>(şu an ${fmtNum(d.coins)})</small></span></li>
        </ul>
        <button class="btn btn-primary" data-act="unlock" data-key="unlock" data-autofocus ${ok ? '' : 'disabled'}>${ok ? 'Kilidi aç' : 'Şartlar eksik'}</button></div>`;
    }
    const rows = UPGRADE_LINES.map((line) => {
      const lvl = rec.up[line] | 0, cost = upgradeCost(lvl);
      const pips = Array.from({ length: ECONOMY.upgradeMaxLevel }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      const can = cost != null && d.coins >= cost;
      return `<div class="urow"><div class="uinfo"><b>${LINE_NAMES[line]}</b><small>${LINE_HINT[line]}</small><div class="pips" aria-label="${lvl} / ${ECONOMY.upgradeMaxLevel} kademe">${pips}</div></div>
        <button class="btn btn-sun btn-sm" data-act="up" data-line="${line}" data-key="up-${line}" ${cost != null && can ? '' : 'disabled'} aria-label="${LINE_NAMES[line]} yükselt${cost != null ? ', ' + cost + ' kuruş' : ', en üst kademe'}">${cost == null ? 'Tam' : `${coin()}${fmtNum(cost)}`}</button></div>`;
    }).join('');
    const refund = Math.round(spentOn(d, id) * ECONOMY.resetRefund);
    const using = d.vehicle === id;
    return `${rows}<div class="gact">
        <button class="btn ${using ? 'btn-ghost' : 'btn-primary'} btn-sm" data-act="use" data-key="use" data-autofocus ${using ? 'disabled' : ''}>${using ? check() + ' Seçili' : 'Bunu sür'}</button>
        <button class="btn btn-ghost btn-sm" data-act="reset" data-key="reset" ${refund > 0 ? '' : 'disabled'} title="Harcanan kuruşun tamamı iade edilir">Sıfırla${refund > 0 ? ` <small>+${fmtNum(refund)}</small>` : ''}</button></div>`;
  }

  function draw() {
    const d = ctx.save.data, v = VEHICLES[sel], rec = vehicleState(d, sel);
    const list = VEHICLE_ORDER.map((id) => {
      const vv = VEHICLES[id], r = vehicleState(d, id);
      const status = !vv.implemented ? 'Yakında' : r.owned ? (d.vehicle === id ? 'Seçili' : 'Senin') : 'Kilitli';
      return `<button class="vitem ${id === sel ? 'sel' : ''} ${r.owned && vv.implemented ? '' : 'off'}" data-act="pick" data-id="${id}" data-key="p${id}" aria-pressed="${id === sel}">${vehicleArt(id, !(r.owned && vv.implemented))}<span><b>${esc(vv.name)}</b><small>${status}</small></span></button>`;
    }).join('');
    ctx.nav.render(el, `
      <header class="bar">
        <button class="btn btn-ghost btn-icon" data-act="back" aria-label="Geri" data-key="back">‹</button>
        <h2>Garaj</h2><span class="spacer"></span>
        <span class="chip" aria-label="Kuruş">${coin()}<b>${fmtNum(d.coins)}</b></span>
        <span class="chip" aria-label="Yıldız">${star(true)}<b>${totalStars(d)}</b></span>
      </header>
      <div class="garage-body">
        <nav class="vlist" aria-label="Araçlar">${list}</nav>
        <div class="vmain panel">
          <div class="vstage">${vehicleArt(sel, !(rec.owned && v.implemented))}</div>
          <h3>${esc(v.name)} <small>${esc(v.kind)}</small></h3>
          <div class="stats">${statBars(sel, rec.up ?? {})}</div>
        </div>
        <div class="vside panel">${side(d, sel)}</div>
      </div>
      <p class="garage-note" role="status" aria-live="polite">${esc(note)}</p>`);
  }

  function confirmBuy(opts) { ctx.confirm(opts); }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const d = ctx.save.data;
    switch (b.dataset.act) {
      case 'back': ctx.nav.back(); break;
      case 'pick': sel = b.dataset.id; note = ''; draw(); break;
      case 'use': ctx.save.update((x) => { x.vehicle = sel; }); ctx.save.flush(); note = `${VEHICLES[sel].name} artık senin aracın.`; draw(); break;
      case 'unlock': {
        const cost = VEHICLES[sel].unlock.coins;
        confirmBuy({ title: `${VEHICLES[sel].name} alınsın mı?`, text: `${fmtNum(cost)} kuruş harcanacak.`, yes: 'Satın al', onYes() {
          if (buyVehicle(ctx.save, sel)) { ctx.save.flush(); ctx.emit('purchase', { item: sel, cost, level: 1 }); note = `${VEHICLES[sel].name} garajında! Hayırlı olsun.`; }
          draw();
        } });
        break;
      }
      case 'up': {
        const line = b.dataset.line, lvl = d.vehicles[sel].up[line] | 0, cost = upgradeCost(lvl);
        confirmBuy({ title: `${LINE_NAMES[line]} ${lvl + 1}. kademe`, text: `${fmtNum(cost)} kuruş harcanacak.`, yes: 'Yükselt', onYes() {
          const r = buyUpgrade(ctx.save, sel, line);
          if (r) { ctx.save.flush(); ctx.emit('upgrade', { vehicleId: sel, line, cost: r.cost, level: r.level }); note = `${LINE_NAMES[line]} ${r.level}. kademe oldu.`; }
          draw();
        } });
        break;
      }
      case 'reset': {
        const refund = Math.round(spentOn(d, sel) * ECONOMY.resetRefund);
        confirmBuy({ title: 'Yükseltmeler sıfırlansın mı?', text: `Harcadığın ${fmtNum(refund)} kuruşun tamamı iade edilir.`, yes: 'Sıfırla', tone: 'warn', onYes() {
          const r = resetUpgrades(ctx.save, sel);
          if (r) { ctx.save.flush(); note = `${fmtNum(r)} kuruş cebine döndü.`; }
          draw();
        } });
        break;
      }
    }
  });
  return {
    el,
    enter(p = {}) { if (!p.resume) { sel = ctx.save.data.vehicle in VEHICLES ? ctx.save.data.vehicle : 'tosun'; note = ''; } draw(); },
    refresh: draw,
  };
}
