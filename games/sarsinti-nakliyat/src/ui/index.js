// Arayüz (STUB): ana menü (Başla), HUD, duraklat, sonuç. Sahip: Arayüz. API sabittir (MIMARI §9).
// UI, oyun akışını yalnızca `flow` geri çağrılarıyla yönetir; sim'e doğrudan dokunmaz.
import { createTouchControls } from './touch.js';

/**
 * @param {{root:HTMLElement, input:object, save:object, flow:object, levels:object[]}} deps
 *   flow = {startLevel(levelId, vehicleId?), retry(), pause(), resume(), toMenu(), nextLevel()}
 */
export function createUI({ root, input, save, flow, levels }) {
  root.innerHTML = `
    <section class="screen" id="scr-menu">
      <a class="back" href="../../" data-hub-back>Oyunlar</a>
      <h1>Sarsıntı Nakliyat</h1>
      <p class="tag">Kargonu devirme, kafanı da vurma!</p>
      <button class="btn big" id="btn-start">Başla</button>
      <p class="muted" id="menu-coins"></p>
    </section>
    <section class="hud" id="hud" hidden>
      <button class="icon-btn" id="btn-pause" aria-label="Duraklat">II</button>
      <div class="hud-top"><span id="hud-dist">0 m</span><span id="hud-cargo"></span><span id="hud-coins">0</span></div>
      <div class="hud-bottom"><span id="hud-speed">0 km/s</span><span id="hud-combo"></span></div>
      <div class="toast" id="toast" hidden></div>
    </section>
    <section class="screen overlay" id="scr-pause" hidden>
      <h2>Duraklatıldı</h2>
      <button class="btn" id="btn-resume">Devam</button><button class="btn" id="btn-retry-p">Yeniden Dene</button><button class="btn" id="btn-menu-p">Menü</button>
    </section>
    <section class="screen overlay" id="scr-result" hidden>
      <h2 id="res-title"></h2><p id="res-body"></p>
      <button class="btn big" id="btn-retry">TEKRAR DENE</button><button class="btn" id="btn-menu">Menü</button>
    </section>`;
  const $ = (id) => root.querySelector('#' + id);
  const screens = { menu: $('scr-menu'), pause: $('scr-pause'), result: $('scr-result') };
  const hud = $('hud');
  const touch = createTouchControls(root, input);
  touch.show(false);

  $('btn-start').onclick = () => flow.startLevel(levels[0].id);
  $('btn-pause').onclick = () => flow.pause();
  $('btn-resume').onclick = () => flow.resume();
  $('btn-retry-p').onclick = () => flow.retry();
  $('btn-menu-p').onclick = () => flow.toMenu();
  $('btn-retry').onclick = () => flow.retry();
  $('btn-menu').onclick = () => flow.toMenu();

  let toastTimer = 0;
  const api = {
    /** @param {'menu'|'hud'|'pause'|'result'|'none'} name — hud: oyun içi (dokunmatik düğmeler açık); pause/result HUD üstüne biner. */
    show(name, params = {}) {
      for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
      const playing = name === 'hud' || name === 'pause' || name === 'result';
      hud.hidden = !playing; touch.show(name === 'hud');
      if (name === 'menu') $('menu-coins').textContent = `Kuruş: ${save.data.coins}`;
      if (name === 'result') {
        const r = params.result;
        $('res-title').textContent = r.result === 'win' ? `Teslim edildi! ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}` : 'Olmadı!';
        $('res-body').textContent = r.result === 'win'
          ? `Skor ${r.score} · ${r.time.toFixed(1)} sn · kargo ${r.cargoDelivered}/${r.cargoTotal} · +${params.reward?.total ?? 0} kuruş`
          : `Sebep: ${REASONS[r.reason] ?? r.reason}`;
      }
    },
    /** Her karede çağrılır. snapshot = sim.snapshot(). */
    hudUpdate(s) {
      $('hud-dist').textContent = `${Math.round(s.run.distance)} m · %${Math.round(s.run.progress * 100)}`;
      $('hud-cargo').textContent = `Kargo ${s.cargoSummary.onboard}/${s.cargoSummary.total}`;
      $('hud-coins').textContent = `${s.pickups} kuruş`;
      $('hud-speed').textContent = `${Math.round(s.vehicle.speed * 3.6)} km/s`;
      $('hud-combo').textContent = s.combo.count ? `×${s.combo.multiplier} (${s.combo.count})` : '';
    },
    /** Sim olayları (MIMARI §6) + 'toast'. */
    onEvent(e) {
      if (e.name === 'toast') {
        const t = $('toast'); t.textContent = e.text; t.hidden = false;
        clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 1500);
      }
    },
    destroy() { touch.destroy(); root.innerHTML = ''; },
  };
  return api;
}
const REASONS = { headHit: 'Kafa vuruşu', flipped: 'Devrildin!', fell: 'Uçuruma düştün', timeout: 'Süre doldu', cargoShort: 'Kargo yetmedi' };
