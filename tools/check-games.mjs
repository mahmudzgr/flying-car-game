// Oyun Salonu — oyun listesini (games.js) ve oyun klasörlerini denetler.
// Kullanım: node tools/check-games.mjs   (ya da: npm run check)
// Hata varsa çıkış kodu 1 olur; uyarılar çıkış kodunu etkilemez.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

let GAMES;
try {
  ({ GAMES } = await import(pathToFileURL(join(root, 'games.js')).href));
} catch (err) {
  console.error(`✗ games.js okunamadı: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(GAMES) || GAMES.length === 0) errors.push('games.js içinde GAMES dizisi yok ya da boş.');

const ORIENTATIONS = ['landscape', 'portrait', 'any'];
const ids = new Set();

for (const [i, g] of (Array.isArray(GAMES) ? GAMES : []).entries()) {
  const at = `GAMES[${i}]${g && typeof g.id === 'string' ? ` (${g.id})` : ''}`;
  if (!g || typeof g !== 'object') {
    errors.push(`${at}: nesne olmalı.`);
    continue;
  }

  if (typeof g.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(g.id)) {
    errors.push(`${at}: 'id' yalnızca küçük harf, rakam ve tire içermeli (ör. 'uzay-macerasi').`);
    continue;
  }
  if (ids.has(g.id)) errors.push(`${at}: 'id' tekrar ediyor.`);
  ids.add(g.id);

  for (const key of ['title', 'tagline']) {
    if (typeof g[key] !== 'string' || !g[key].trim()) errors.push(`${at}: '${key}' boş olamaz.`);
  }
  if (g.tags !== undefined && (!Array.isArray(g.tags) || g.tags.some((t) => typeof t !== 'string' || !t.trim()))) {
    errors.push(`${at}: 'tags' metinlerden oluşan bir dizi olmalı.`);
  }
  if (g.accent !== undefined && !/^#[0-9a-f]{6}$/i.test(g.accent)) errors.push(`${at}: 'accent' #rrggbb biçiminde olmalı.`);
  if (g.orientation !== undefined && !ORIENTATIONS.includes(g.orientation)) {
    errors.push(`${at}: 'orientation' şunlardan biri olmalı: ${ORIENTATIONS.join(', ')}.`);
  }

  const dir = join(root, 'games', g.id);
  const index = join(dir, 'index.html');
  if (!existsSync(index)) {
    errors.push(`${at}: games/${g.id}/index.html bulunamadı.`);
    continue;
  }
  const cover = g.cover || 'cover.webp';
  if (typeof cover !== 'string' || cover.startsWith('/') || cover.includes('..') || !existsSync(join(dir, cover))) {
    errors.push(`${at}: kapak görseli bulunamadı: games/${g.id}/${cover}`);
  }

  const html = readFileSync(index, 'utf8');
  if (!html.includes('data-hub-back')) {
    warnings.push(`${at}: oyun seçim ekranına dönüş bağlantısı yok. Ana menüye <a href="../../" data-hub-back>Oyunlar</a> ekle.`);
  }
  const rootRelative = html.match(/\b(?:src|href)\s*=\s*["']\/(?!\/)[^"']*/g);
  if (rootRelative) {
    warnings.push(`${at}: '/' ile başlayan yollar GitHub Pages alt dizininde bozulur: ${rootRelative.slice(0, 3).join(', ')}`);
  }
}

const gamesDir = join(root, 'games');
if (existsSync(gamesDir)) {
  for (const name of readdirSync(gamesDir)) {
    if (statSync(join(gamesDir, name)).isDirectory() && !ids.has(name)) {
      warnings.push(`games/${name}/ klasörü games.js listesinde yok; ana ekranda görünmez.`);
    }
  }
}

for (const w of warnings) console.warn(`! ${w}`);
for (const e of errors) console.error(`✗ ${e}`);
if (errors.length) {
  console.error(`\n${errors.length} hata bulundu.`);
  process.exit(1);
}
console.log(`✓ ${ids.size} oyun denetlendi${warnings.length ? `, ${warnings.length} uyarı` : ''}: ${[...ids].join(', ')}`);
