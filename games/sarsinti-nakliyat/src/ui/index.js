// Arayüz: menü, bölüm seçimi, garaj, ayarlar, HUD, duraklat, sonuç. Sahip: Arayüz. API sabittir (MIMARI §9).
// UI, oyun akışını yalnızca `flow` geri çağrılarıyla yönetir; sim'e doğrudan dokunmaz.
//   flow = { startLevel(id, vehicleId?), retry(), pause(), resume(), toMenu(), nextLevel(), emit?(name,data), applySettings?(settings) }
// flow.emit ve flow.applySettings İSTEĞE BAĞLIDIR (docs/ISTEKLER.md); yoksa UI sessizce atlar.
import { createTouchControls } from './touch.js';
import { createNav } from './nav.js';
import { createHome } from './home.js';
import { createLevels, createBrief } from './levels.js';
import { createGarage } from './garage.js';
import { createSettings } from './settings.js';
import { createPause, createResult, createConfirm } from './overlays.js';
import { createHud } from './hud.js';

/**
 * @param {{root:HTMLElement, input:object, save:object, flow:object, levels:object[]}} deps
 */
export function createUI({ root, input, save, flow, levels }) {
  root.innerHTML = '';
  const hud = createHud({ flow });
  root.appendChild(hud.el);
  const touch = createTouchControls(root, input);
  const layer = document.createElement('div');
  layer.className = 'layer';
  root.appendChild(layer);
  const rotate = document.createElement('div');
  rotate.className = 'rotate-warn';
  rotate.setAttribute('role', 'alert');
  rotate.innerHTML = '<div class="phone" aria-hidden="true"><i></i></div><b>Telefonu yan çevir</b><small>Sarsıntı Nakliyat yatay ekranda oynanır</small>';
  root.appendChild(rotate);

  const nav = createNav(layer);
  let mode = 'none';            // none | menu | hud | pause | result
  let levelId = null, pending = null;

  const emit = (name, data = {}) => { try { flow.emit?.(name, data); } catch (e) { console.error(e); } };
  const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function toggleFullscreen() {
    const de = document.documentElement;
    try {
      if (!isFullscreen()) {
        const p = (de.requestFullscreen || de.webkitRequestFullscreen)?.call(de);
        Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
      } else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } catch { /* tam ekran desteklenmiyor */ }
  }
  function applySettings() {
    const s = save.data.settings;
    touch.setScale(s.btnScale ?? 1);
    root.dataset.haptics = s.haptics === false ? '0' : '1';
    try { flow.applySettings?.({ ...s, sfx: s.sfx * (s.master ?? 1), music: s.music * (s.master ?? 1) }); } catch (e) { console.error(e); }
    try { window.dispatchEvent(new CustomEvent('sarsinti:settings', { detail: s })); } catch { /* yoksay */ }
  }
  const ctx = {
    save, flow, input, levels, nav, emit, applySettings, isFullscreen, toggleFullscreen,
    currentLevel: () => levels.find((l) => l.id === levelId) ?? null,
    confirm: (opts) => nav.push('confirm', opts),
    refreshAll: () => { for (const n of ['home', 'levels', 'garage']) screens[n].refresh?.(); },
    /** Oyundan (duraklat/sonuç) menü ekranlarına dön: önce flow.toMenu(), sonra istenen alt ekran. */
    goMenu(screen, region) {
      pending = { screen, region: region ?? ctx.currentLevel()?.region };
      flow.toMenu();
      if (pending) api.show('menu');   // flow.toMenu show('menu') çağırmadıysa
    },
  };

  const screens = {
    home: createHome(ctx), levels: createLevels(ctx), brief: createBrief(ctx), garage: createGarage(ctx),
    settings: createSettings(ctx), pause: createPause(ctx), result: createResult(ctx), confirm: createConfirm(ctx),
  };
  for (const [name, s] of Object.entries(screens)) nav.register(name, s);

  // ---- klavye: menülerde ↑↓←→ Enter Esc; oyun girişine karışmaz ----
  const SWALLOW = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape']);
  const DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  function onKey(e) {
    if (!nav.active || !SWALLOW.has(e.code) || e.metaKey || e.ctrlKey || e.altKey) return;
    const top = nav.topName();
    if (e.code === 'Escape') {
      if (nav.stack.length > 1) { e.stopImmediatePropagation(); e.preventDefault(); emit('ui:back'); nav.back(); }
      else if (top === 'home' || top === 'result') { e.stopImmediatePropagation(); }
      return; // pause: main Esc ile devam ettirir
    }
    e.stopImmediatePropagation();
    if (e.code === 'Space') return;                       // odaktaki düğme tıklanır (varsayılan eylem)
    if (e.code === 'Enter') {
      const a = document.activeElement;
      if (!a || a === document.body || !nav.top()?.el.contains(a)) { e.preventDefault(); nav.top()?.el.querySelector('[data-autofocus]')?.click(); }
      return;
    }
    const a = document.activeElement;
    if (a?.type === 'range' && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) return;   // kaydırıcı kendi okunu işler
    e.preventDefault();
    nav.move(DIR[e.code]);
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', (e) => { if (nav.active && SWALLOW.has(e.code)) e.stopImmediatePropagation(); }, true);
  root.addEventListener('click', (e) => { if (e.target.closest('button, a')) emit('ui:click', {}); });

  // ---- dikey ekran uyarısı: oyun sürerken duraklat ----
  const mqPortrait = matchMedia('(orientation: portrait) and (max-width: 900px)');
  const onPortrait = () => { if (mqPortrait.matches && mode === 'hud') flow.pause(); touch.releaseAll(); };
  mqPortrait.addEventListener?.('change', onPortrait);
  const onFs = () => { nav.top()?.refresh?.(); };
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);

  applySettings();

  const api = {
    /** @param {'menu'|'hud'|'pause'|'result'|'none'} name — hud: oyun içi (dokunmatik düğmeler açık); pause/result HUD üstüne biner. */
    show(name, params = {}) {
      mode = name === 'hud' ? 'hud' : name;
      const playing = name === 'hud' || name === 'pause' || name === 'result';
      hud.el.hidden = !playing;
      touch.show(name === 'hud');
      screens.result.leave?.();
      if (name === 'hud') { input.reset?.(); nav.set([]); }
      else if (name === 'menu') {
        const p = pending; pending = null;
        const stack = ['home'];
        if (p?.screen) stack.push(p.screen);
        nav.set(stack, p?.screen === 'levels' ? { region: p.region } : {});
      } else if (name === 'pause') nav.set(['pause']);
      else if (name === 'result') nav.set(['result'], params);
      else nav.set([]);
      if (name === 'hud' && mqPortrait.matches) flow.pause();
    },
    /** Her karede çağrılır. snapshot = sim.snapshot(). */
    hudUpdate(s) { hud.update(s); },
    /** Sim olayları (MIMARI §6) + 'toast'. */
    onEvent(e) {
      if (e.name === 'levelStart') { levelId = e.levelId; hud.reset(); }
      hud.onEvent(e);
    },
    destroy() {
      window.removeEventListener('keydown', onKey, true);
      mqPortrait.removeEventListener?.('change', onPortrait);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      touch.destroy(); root.innerHTML = '';
    },
    /** Dev/test için: kayıt değişince açık ekranları yeniden çiz. */
    refresh() { nav.top()?.refresh?.(); },
  };
  return api;
}
