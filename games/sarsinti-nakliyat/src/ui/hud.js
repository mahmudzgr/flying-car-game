// Oyun içi HUD: ilerleme, kargo, süre, hız, kombo, kuruş, bildirimler, ipucu. Sahip: Arayüz.
// hudUpdate her karede çağrılır → DOM yalnızca değer değişince güncellenir.
import { esc, coin, pauseIcon, cargoIcon, hintIcon, flag } from './icons.js';
import { SCORING } from '../config.js';
import { fmtClock, failInfo, CARGO_PLURAL, BIOME_NAMES, fmtNum } from './texts.js';

const RING = 2 * Math.PI * 17;

export function createHud(ctx) {
  const el = document.createElement('section');
  el.className = 'hud';
  el.setAttribute('aria-label', 'Oyun göstergeleri');
  el.innerHTML = `
    <div class="hud-tl"><div class="hud-cargo" id="h-cargo" aria-label="Kargo"></div><div class="hud-time" id="h-time">0:00.0</div><div class="hud-end" id="h-end" hidden><span id="h-del">Teslim 0</span><span id="h-carry"></span><span id="h-rec"></span></div></div>
    <div class="hud-tc"><div class="progress" role="progressbar" aria-label="Bitişe ilerleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="h-prog">
      <div class="ptrack"><i class="pfill" id="h-pfill"></i><span class="ptick-wrap" id="h-ticks"></span></div>
      <div class="prange"><span class="pcar" id="h-pcar"></span></div><span class="pflag">${flag()}</span></div>
      <div class="pdist" id="h-dist">0 m</div></div>
    <div class="hud-tr"><span class="chip coins" id="h-coinchip">${coin()}<b id="h-coins">0</b></span>
      <button class="pausebtn" id="h-pause" aria-label="Duraklat" title="Duraklat (Esc)">${pauseIcon()}</button></div>
    <div class="hud-bc">
      <div class="combo" id="h-combo" hidden><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="ring-bg" cx="20" cy="20" r="17"/><circle class="ring" id="h-ring" cx="20" cy="20" r="17" stroke-dasharray="${RING.toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 20 20)"/></svg><b id="h-mult">×1</b><small id="h-count"></small></div>
      <div class="speed"><b id="h-speed">0</b><small>km/sa</small></div>
    </div>
    <div class="toast" id="h-toast" hidden role="status"></div>
    <div class="pops" id="h-pops" aria-live="polite"></div>
    <div class="danger left" id="h-dl" hidden aria-hidden="true"><span>&#9664;</span><b></b></div><div class="danger right" id="h-dr" hidden aria-hidden="true"><b></b><span>&#9654;</span></div>
    <div class="flash" id="h-flash" aria-hidden="true"></div>`;
  const $ = (id) => el.querySelector('#' + id);
  const n = { cargo: $('h-cargo'), time: $('h-time'), pfill: $('h-pfill'), pcar: $('h-pcar'), prog: $('h-prog'), dist: $('h-dist'), ticks: $('h-ticks'),
    coins: $('h-coins'), coinchip: $('h-coinchip'), combo: $('h-combo'), ring: $('h-ring'), mult: $('h-mult'), count: $('h-count'),
    speed: $('h-speed'), end: $('h-end'), del: $('h-del'), carry: $('h-carry'), rec: $('h-rec'), dl: $('h-dl'), dr: $('h-dr'), pops: $('h-pops'), toast: $('h-toast'), flash: $('h-flash') };
  $('h-pause').onclick = () => ctx.flow.pause();

  const cache = { sig: '', cargoSig: '', time: '', prog: -1, dist: -1, coins: -1, mult: 0, count: -1, ring: -1, speed: -1, timeLow: null, dl: '', dr: '', del: '', carry: '', rec: '', dtext: '' };
  let recState = 0, stuckT = 0, stuckHinted = false;
  const hp = new Map(); // kargo id → son hp (hasar farkı için)
  let lastProgress = 0, toastTimer = 0;

  function cargoHtml(c) {
    const state = c.state === 'lost' ? 'lost' : c.state === 'delivered' ? 'done' : c.hp < c.hpMax ? 'dmg' : 'ok';
    const pips = c.hpMax > 1 && c.state !== 'lost' ? `<i class="hp">${c.hp}</i>` : '';
    return `<span class="ci ${state}" title="${esc(CARGO_PLURAL[c.type] ?? c.type)}">${cargoIcon(c.type, state)}${pips}</span>`;
  }

  function pop(text, kind = 'gold', big = false) {
    const p = document.createElement('div');
    p.className = `pop ${kind} ${big ? 'big' : ''}`;
    p.textContent = text;
    n.pops.appendChild(p);
    while (n.pops.children.length > 3) n.pops.firstChild.remove();
    p.addEventListener('animationend', () => p.remove());
    setTimeout(() => p.remove(), 2600);
  }
  function showToast(text, icon) {
    n.toast.innerHTML = `${hintIcon(icon)}<span>${esc(text)}</span>`; n.toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { n.toast.hidden = true; }, 2500);
  }
  function flash() { n.flash.classList.remove('go'); void n.flash.offsetWidth; n.flash.classList.add('go'); }
  function bump(node) { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }

  return {
    el,
    reset() {
      Object.assign(cache, { sig: '', cargoSig: '', time: '', prog: -1, dist: -1, coins: -1, mult: 0, count: -1, ring: -1, speed: -1, timeLow: null, dl: '', dr: '', del: '', carry: '', rec: '', dtext: '' }); n.dl.hidden = n.dr.hidden = true; n.end.hidden = true; recState = 0; stuckT = 0; stuckHinted = false;
      hp.clear(); n.pops.innerHTML = ''; n.toast.hidden = true; n.ticks.innerHTML = ''; n.cargo.innerHTML = ''; n.combo.hidden = true; lastProgress = 0;
    },
    update(s) {
      // kargo satırı
      const sig = s.cargo.map((c) => c.id).join(',');
      const st = s.cargo.map((c) => c.state[0] + c.hp).join('');
      if (sig !== cache.sig || st !== cache.cargoSig) {
        cache.sig = sig; cache.cargoSig = st;
        n.cargo.innerHTML = s.cargo.map(cargoHtml).join('');
        for (const c of s.cargo) hp.set(c.id, c.hp);
      }
      // süre
      const left = s.run.timeLeft;
      const tv = left != null ? fmtClock(left) : fmtClock(s.run.time);
      if (tv !== cache.time) { cache.time = tv; n.time.textContent = left != null ? `Kalan ${tv}` : tv; }
      const low = left != null && left < 10;
      if (low !== cache.timeLow) { cache.timeLow = low; n.time.classList.toggle('urgent', low); n.time.classList.toggle('limit', left != null); }
      // ilerleme
      const p = Math.max(0, Math.min(1, s.run.progress));
      lastProgress = p;
      const pr = Math.round(p * 500);
      if (pr !== cache.prog) { cache.prog = pr; const pc = pr / 5; n.pfill.style.transform = `scaleX(${p.toFixed(4)})`; n.pcar.style.left = `${pc}%`; n.prog.setAttribute('aria-valuenow', String(Math.round(pc))); }
      const en = s.endless;
      const dm = Math.round(en ? en.distance : s.run.distance);
      const dtext = en ? `${dm} m · bayrağa ${Math.max(0, Math.round(en.toNext))} m` : `${dm} m`;
      if (dtext !== cache.dtext) { cache.dtext = dtext; n.dist.textContent = dtext; }
      if (en) {
        if (n.end.hidden) n.end.hidden = false;
        const dv = `Teslim ${en.deliveries}`; if (dv !== cache.del) { cache.del = dv; n.del.textContent = dv; }
        const cy = en.carried ? `Yük ${Math.round(en.carried)}` : ''; if (cy !== cache.carry) { cache.carry = cy; n.carry.textContent = cy; }
        const best = ctx.save.data.endless?.bestDistance | 0;
        let rt = '';
        if (best > 0) rt = dm > best ? 'REKOR!' : `Rekor ${fmtNum(best)} m`;
        if (rt !== cache.rec) { cache.rec = rt; n.rec.textContent = rt; n.rec.classList.toggle('hit', dm > best); }
        if (best > 0 && recState === 0 && dm >= best - 50 && dm < best) { recState = 1; pop(`Rekora ${best - dm} m kaldı!`, 'blue'); }
        if (best > 0 && recState < 2 && dm > best) { recState = 2; pop('Yeni rekor!', 'gold', true); }
      }
      // saplanma ipucu (kıpırdamadan gaz basılı)
      if (s.vehicle.throttle > 0.5 && s.vehicle.speed < 0.3) { stuckT += 1 / 60; if (stuckT > 2.5 && !stuckHinted) { stuckHinted = true; showToast('Geri vites: ← ya da FREN basılı tut', 'brake'); } }
      else { stuckT = 0; stuckHinted = false; }
      // kuruş
      if (s.pickups !== cache.coins) { if (cache.coins >= 0 && s.pickups > cache.coins) bump(n.coinchip); cache.coins = s.pickups; n.coins.textContent = s.pickups; }
      // hız
      const sp = Math.round(s.vehicle.speed * 3.6);
      if (sp !== cache.speed) { cache.speed = sp; n.speed.textContent = sp; }
      // tehlike oku (kar topu / kaya ekran dışında yaklaşırken)
      let nl = null, nr = null;
      for (const o of s.objects ?? []) {
        if ((o.type !== 'snowball' && o.type !== 'rock') || !o.active) continue;
        const dx = o.x - s.vehicle.x;
        if (dx < -10 && dx > -80 && (nl === null || dx > nl)) nl = dx;
        else if (dx > 18 && dx < 80 && (nr === null || dx < nr)) nr = dx;
      }
      const dlv = nl === null ? '' : String(Math.round(-nl)), drv = nr === null ? '' : String(Math.round(nr));
      if (dlv !== cache.dl) { cache.dl = dlv; n.dl.hidden = !dlv; n.dl.querySelector('b').textContent = dlv && `${dlv} m`; n.dl.classList.toggle('near', nl !== null && nl > -25); }
      if (drv !== cache.dr) { cache.dr = drv; n.dr.hidden = !drv; n.dr.querySelector('b').textContent = drv && `${drv} m`; n.dr.classList.toggle('near', nr !== null && nr < 30); }
      // kombo
      const cb = s.combo;
      const show = cb.count > 0;
      if (show === n.combo.hidden) n.combo.hidden = !show;
      if (show) {
        if (cb.multiplier !== cache.mult) { if (cache.mult && cb.multiplier > cache.mult) bump(n.combo); cache.mult = cb.multiplier; n.mult.textContent = `×${cb.multiplier}`; }
        if (cb.count !== cache.count) { cache.count = cb.count; n.count.textContent = `${cb.count} hareket`; }
        const rg = Math.round((1 - Math.max(0, Math.min(1, cb.timeLeft01))) * 100);
        if (rg !== cache.ring) { cache.ring = rg; n.ring.style.strokeDashoffset = (RING * rg / 100).toFixed(2); }
      } else { cache.mult = 0; cache.count = -1; }
    },
    onEvent(e) {
      switch (e.name) {
        case 'toast': showToast(e.text, e.icon); break;
        case 'biomeChange': pop(BIOME_NAMES[e.biome] ?? e.biome, 'blue', true); break;
        case 'flip': pop(`TAKLA${e.count > 1 ? ' ×' + e.count : ''}!`, 'gold', true); break;
        case 'land': if (e.airTime >= SCORING.airMin) pop(`Havada ${e.airTime.toFixed(1).replace('.', ',')} sn`, 'blue'); break;
        case 'wheelie': pop(`Tek teker ${e.duration.toFixed(1).replace('.', ',')} sn`, 'blue'); break;
        case 'nearMiss': pop('Kıl payı!', 'gold'); break;
        case 'comboBank': pop(`Kombo +${Math.round(e.points)}`, 'gold'); break;
        case 'comboBurn': pop('Kombo yandı!', 'red'); break;
        case 'cargoDamage': {
          const prev = hp.get(e.id); hp.set(e.id, e.hpLeft);
          const lost = prev != null ? prev - e.hpLeft : 1;
          pop(e.type === 'eggs' ? `-${lost} yumurta` : 'Kargo hasarlı!', 'red'); flash();
          break;
        }
        case 'cargoLost': {
          pop('Kargo kayıp!', 'red'); flash();
          const t = document.createElement('i'); t.className = 'ptick'; t.style.left = `${(lastProgress * 100).toFixed(1)}%`; n.ticks.appendChild(t);
          break;
        }
        case 'checkpoint': pop('Kontrol noktası', 'blue'); break;
        case 'levelEnd': {
          if (e.result === 'win') pop('Teslim edildi!', 'gold', true);
          else pop(failInfo(e.reason).title, 'red', true);
          break;
        }
        default: break;
      }
    },
  };
}
