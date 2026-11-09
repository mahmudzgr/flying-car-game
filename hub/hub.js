// Oyun Salonu — oyun seçim ekranı.
// Kartlar kök dizindeki games.js listesinden oluşturulur; bu dosyayı yeni oyun için değiştirmen gerekmez.

const ORIENTATION = {
  landscape: 'Yatay ekran önerilir',
  portrait: 'Dikey ekran önerilir',
};

// yan çevrilmiş telefon + dönme oku
const ICON_ROTATE =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="10" width="15" height="10" rx="2"/><path d="M14.5 15h.01"/><path d="M11 3.5a8.5 8.5 0 0 1 9.5 6.5"/><path d="M21 6.5v3.7h-3.7"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function card(game, index) {
  const base = `games/${game.id}/`;

  const li = h('li', 'card');
  if (game.accent) li.style.setProperty('--accent', game.accent);
  li.style.setProperty('--i', index);

  const link = h('a', 'card-link');
  link.href = base;

  const cover = h('div', 'cover');
  const img = h('img');
  img.src = base + (game.cover || 'cover.webp');
  img.alt = '';
  img.width = 1280;
  img.height = 720;
  img.decoding = 'async';
  if (index > 1) img.loading = 'lazy';
  img.addEventListener('error', () => cover.classList.add('no-img'), { once: true });
  cover.append(img);

  const info = h('div', 'info');
  info.append(h('h3', 'name', game.title));
  if (game.tagline) info.append(h('p', 'tagline', game.tagline));

  if (Array.isArray(game.tags) && game.tags.length) {
    const tags = h('div', 'tags');
    for (const t of game.tags) tags.append(h('span', 'tag', t));
    info.append(tags);
  }

  const foot = h('div', 'card-foot');
  const hint = ORIENTATION[game.orientation];
  const orient = h('span', 'orient');
  if (hint) {
    orient.innerHTML = ICON_ROTATE;
    orient.append(h('span', null, hint));
  }
  const play = h('span', 'play');
  play.innerHTML = ICON_PLAY;
  play.append(h('span', null, 'Oyna'));
  foot.append(orient, play);
  info.append(foot);

  link.append(cover, info);
  li.append(link);
  return li;
}

const list = document.getElementById('games');
const status = document.getElementById('status');
const count = document.getElementById('games-count');

import('../games.js')
  .then(({ GAMES }) => {
    const games = Array.isArray(GAMES) ? GAMES : [];
    list.replaceChildren(...games.map(card));
    count.textContent = String(games.length);
    count.hidden = games.length === 0;
    status.textContent = games.length ? '' : 'Henüz oyun eklenmemiş.';
    document.documentElement.classList.add('ready');
  })
  .catch((err) => {
    console.error(err);
    status.textContent = 'Oyun listesi yüklenemedi. Sayfayı yenilemeyi dene.';
  });
