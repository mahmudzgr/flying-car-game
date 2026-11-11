// Milimetrik Park — tarayıcı duman testi (Playwright): sayfa hatası olmadan açılıyor mu, menüler ve
// sürüş çalışıyor mu? Ekran görüntülerini --shots <klasör> ile kaydeder.
//   node games/milimetrik-park/tools/smoke.mjs [--shots /tmp/mp] [--mobile]
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const mobile = args.includes('--mobile');
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--disable-gpu'] });
const errors = [];
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) fails++; };

try {
  const ctxOpts = mobile ? { ...devices['Pixel 7'], viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(`${base}/games/milimetrik-park/?test`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const shot = async (name) => { if (shotsDir) await page.screenshot({ path: join(shotsDir, `${name}.png`) }); };
  await shot('01-home');
  check(await page.isVisible('.home'), 'ana menü görünüyor');
  check(await page.isVisible('a[data-hub-back]'), '‹ Oyunlar bağlantısı ana menüde görünüyor');

  await page.click('[data-act="play"]');
  await page.waitForTimeout(300);
  check((await page.locator('.lcard').count()) === 7, '7 bölüm kartı');
  await shot('02-levels');

  await page.locator('.lcard').nth(1).click();
  await page.waitForTimeout(400);
  check(await page.isVisible('.brief'), 'brifing ekranı');
  await shot('03-brief');
  await page.click('[data-act="go"]');
  await page.waitForTimeout(1600);
  check(await page.isHidden('a[data-hub-back]'), 'oyun sırasında Oyunlar bağlantısı gizli');

  // sürüş: D'ye al, ileri sürün, sonra R ile geri
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(2500);
  let st = await page.evaluate(() => ({ g: window.__mp.game.car.gear, v: window.__mp.game.car.vLong, x: window.__mp.game.body.x }));
  check(st.g === 'D' && st.v > 0.9, `D'de sürünme (v=${(st.v * 3.6).toFixed(1)} km/h)`);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(600);
  await shot('04-drive');
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyS');
  st = await page.evaluate(() => ({ v: window.__mp.game.car.vLong }));
  check(Math.abs(st.v) < 0.5, `frenle yavaşlama (v=${(st.v * 3.6).toFixed(1)} km/h)`);
  await page.keyboard.down('KeyS');
  await page.keyboard.press('KeyQ');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(1500);
  st = await page.evaluate(() => ({ g: window.__mp.game.car.gear, v: window.__mp.game.car.vLong }));
  check(st.g === 'R' && st.v < -0.5, `R'de geri sürünme (v=${(st.v * 3.6).toFixed(1)} km/h)`);
  await shot('05-reverse');

  // park sonucu: aracı hedefe ışınla, P'ye al
  await page.evaluate(() => {
    const g = window.__mp.game, t = g.targets[0], b = g.body, geom = g.car.geom;
    const a = t.facing === 'tail' ? t.a + Math.PI : t.a;
    const cx = t.x + Math.cos(t.a) * (t.idealLong || 0), cy = t.y + Math.sin(t.a) * (t.idealLong || 0);
    b.x = cx - Math.cos(a) * geom.gcx; b.y = cy - Math.sin(a) * geom.gcx; b.a = a; b.vx = b.vy = b.w = 0; b.savePrev(); b.updateGeom();
  });
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyP');
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(1800);
  check(await page.isVisible('.result'), 'sonuç ekranı');
  await shot('06-result');
  const q = await page.evaluate(() => window.__mp.game.result?.quality);
  check(q >= 95, `ideal konumda isabet %${q}`);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('milimetrik.v1') || 'null'));
  check(!!saved?.levels?.['geri-geri']?.stars?.[0], 'kayıt (milimetrik.v1) yazıldı');

  // tüm bölümler yükleniyor mu
  for (const L of await page.evaluate(() => window.__mp.LEVELS.map((l) => l.id).concat(['antrenman']))) {
    await page.evaluate((id) => { window.__mp.openLevel(id); window.__mp.begin(); }, L);
    await page.waitForTimeout(1500);
    await shot(`10-${L}`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(await page.isVisible('.pause'), 'Esc ile duraklatma');
  await page.click('[data-act="settings"]');
  await page.waitForTimeout(300);
  check(await page.isVisible('.settings'), 'ayarlar ekranı');
  await shot('20-settings');
  await context.close();
} finally {
  await browser.close();
  server.close();
}
for (const e of errors) console.log(`✗ ${e}`);
if (errors.length || fails) { console.log(`\n${fails} denetim başarısız, ${errors.length} hata.`); process.exit(1); }
console.log('\nDuman testi temiz.');
