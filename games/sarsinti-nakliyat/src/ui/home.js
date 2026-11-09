// Ana menü. Sahip: Arayüz.
import { coin, fullscreenIcon, vehicleArt, stars as starsSvg, arrowRight } from './icons.js';
import { totalStars, nextPlayable } from './progress.js';
import { fmtNum } from './texts.js';

const LOGO = 'SARSINTI'.split('').map((ch, i) => `<span style="--r:${[-5, 3, -3, 5, -4, 4, -3, 5][i]}deg;--d:${(i * 0.11).toFixed(2)}s">${ch}</span>`).join('');

export function createHome(ctx) {
  const el = document.createElement('section');
  el.className = 'screen home';
  el.setAttribute('aria-label', 'Ana menü');
  const fsOk = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  function draw() {
    const d = ctx.save.data;
    el.innerHTML = `
      <a class="back" href="../../" data-hub-back aria-label="Oyunlar: oyun seçim ekranına dön">Oyunlar</a>
      <div class="home-tr">
        <span class="chip" aria-label="Kuruş">${coin()}<b>${fmtNum(d.coins)}</b></span>
        <span class="chip" aria-label="Yıldız">${starsSvg(1, 1)}<b>${totalStars(d)}</b></span>
        ${fsOk ? `<button class="btn btn-ghost btn-icon" data-act="fs" aria-label="Tam ekran" title="Tam ekran">${fullscreenIcon(ctx.isFullscreen())}</button>` : ''}
      </div>
      <div class="home-main">
        <div class="logo" role="img" aria-label="Sarsıntı Nakliyat">
          <div class="logo-word" aria-hidden="true">${LOGO}</div>
          <div class="logo-ribbon" aria-hidden="true"><i></i>NAKLİYAT<i></i></div>
          <div class="logo-car" aria-hidden="true">${vehicleArt('tosun')}</div>
          <p class="logo-tag">Kargonu devirme, kafanı da vurma!</p>
        </div>
        <nav class="home-menu" aria-label="Ana menü">
          <button class="btn btn-primary btn-xl" data-act="play" data-autofocus data-key="play"><span>Oyna</span>${arrowRight()}</button>
          <button class="btn btn-sun" data-act="garage" data-key="garage">Garaj</button>
          <button class="btn btn-ghost" data-act="settings" data-key="settings">Ayarlar</button>
        </nav>
      </div>
      <p class="home-foot">Ok tuşları + Enter ile de gezebilirsin</p>`;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'play') ctx.nav.push('levels', { region: nextPlayable(ctx.save.data, ctx.levels)?.region ?? 1 });
    else if (act === 'garage') ctx.nav.push('garage');
    else if (act === 'settings') ctx.nav.push('settings', { from: 'menu' });
    else if (act === 'fs') { ctx.toggleFullscreen(); }
  });
  return { el, enter: draw, refresh: draw };
}
