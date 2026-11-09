// Ayarlar paneli (menüden ve duraklatmadan açılır). Sahip: Arayüz.
import { fullscreenIcon } from './icons.js';

const SHAKE = [['0', 'Kapalı'], ['1', 'Az'], ['2', 'Tam']];
const QUALITY = [['high', 'Yüksek'], ['low', 'Düşük']];
const BTN = [['0.85', 'Küçük'], ['1', 'Orta'], ['1.2', 'Büyük']];

export function createSettings(ctx) {
  const el = document.createElement('section');
  el.className = 'screen settings modal';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Ayarlar');
  let armed = false, armTimer = 0, note = '';
  const fsOk = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  const seg = (key, opts, cur) => `<div class="seg" role="group" aria-label="${key}">${opts.map(([v, t]) => `<button class="segbtn ${String(cur) === v ? 'on' : ''}" data-act="seg" data-k="${key}" data-v="${v}" data-key="${key}-${v}" aria-pressed="${String(cur) === v}">${t}</button>`).join('')}</div>`;
  const slider = (key, label, v) => `<label class="srow"><span>${label}</span><input type="range" min="0" max="100" step="5" value="${Math.round(v * 100)}" data-k="${key}" data-key="s-${key}" aria-label="${label}"><output>${Math.round(v * 100)}%</output></label>`;
  const toggle = (key, label, on, hint = '') => `<div class="srow"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span><button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="tog" data-k="${key}" data-key="t-${key}" aria-label="${label}"><i></i><em>${on ? 'Açık' : 'Kapalı'}</em></button></div>`;

  function draw() {
    const s = ctx.save.data.settings;
    ctx.nav.render(el, `
      <div class="panel settings-panel">
        <header class="bar"><button class="btn btn-ghost btn-icon" data-act="back" aria-label="Geri" data-key="back" data-autofocus>‹</button><h2>Ayarlar</h2><span class="spacer"></span>
          ${fsOk ? `<button class="btn btn-ghost btn-icon" data-act="fs" aria-label="Tam ekran" data-key="fs">${fullscreenIcon(ctx.isFullscreen())}</button>` : ''}</header>
        <div class="settings-body">
          <div class="scol">
            <h3>Ses</h3>
            ${slider('master', 'Ana ses', s.master ?? 1)}
            ${slider('music', 'Müzik', s.music)}
            ${slider('sfx', 'Efektler', s.sfx)}
            <h3>Oynanış</h3>
            ${toggle('assistLanding', 'Yardımcı iniş', s.assistLanding, 'Ters inişte burnu hafifçe düzeltir')}
            ${'vibrate' in navigator ? toggle('haptics', 'Titreşim', s.haptics) : ''}
          </div>
          <div class="scol">
            <h3>Görünüm</h3>
            <div class="srow"><span>Ekran sarsıntısı</span>${seg('shake', SHAKE, s.shake)}</div>
            <div class="srow"><span>Grafik kalitesi</span>${seg('quality', QUALITY, s.quality)}</div>
            <div class="srow"><span>Düğme boyutu</span>${seg('btnScale', BTN, s.btnScale)}</div>
            <h3>İlerleme</h3>
            <div class="srow"><span>Kayıt<small>${ctx.save.persistent === false ? 'Tarayıcı kaydı kapalı: ilerleme yalnızca bu oturumda tutulur.' : 'Bu cihazda saklanır'}</small></span>
              <button class="btn ${armed ? 'btn-danger' : 'btn-ghost'} btn-sm" data-act="wipe" data-key="wipe">${armed ? 'Emin misin? Tekrar dokun' : 'İlerlemeyi sıfırla'}</button></div>
            <p class="settings-note" role="status" aria-live="polite">${note}</p>
          </div>
        </div>
      </div>`);
  }
  const apply = () => { ctx.save.update(() => {}); ctx.applySettings(); };
  const setVal = (k, v) => { ctx.save.data.settings[k] = v; apply(); };

  el.addEventListener('input', (e) => {
    const r = e.target.closest('input[type=range]'); if (!r) return;
    const v = r.value / 100; r.nextElementSibling.textContent = `${r.value}%`;
    setVal(r.dataset.k, v);
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const s = ctx.save.data.settings;
    switch (b.dataset.act) {
      case 'back': clearTimeout(armTimer); armed = false; ctx.save.flush(); ctx.nav.back(); break;
      case 'fs': ctx.toggleFullscreen(); break;
      case 'tog': setVal(b.dataset.k, !s[b.dataset.k]); draw(); break;
      case 'seg': { const k = b.dataset.k, v = b.dataset.v; setVal(k, k === 'quality' ? v : +v); draw(); break; }
      case 'wipe':
        if (!armed) { armed = true; note = ''; clearTimeout(armTimer); armTimer = setTimeout(() => { armed = false; draw(); }, 4000); draw(); }
        else { clearTimeout(armTimer); armed = false; ctx.save.reset(); ctx.applySettings(); note = 'Her şey sıfırlandı. Temiz sayfa!'; ctx.refreshAll(); draw(); }
        break;
    }
  });
  return { el, modal: true, enter(p = {}) { if (!p.resume) { armed = false; note = ''; } draw(); }, refresh: draw };
}
