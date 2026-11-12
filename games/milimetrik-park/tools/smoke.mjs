// Milimetrik Park — tarayıcı duman testi (Playwright): sayfa hatası olmadan açılıyor mu, menüler, sürüş kolu,
// park, kayıt ve tüm modlar çalışıyor mu? Ekran görüntülerini --shots <klasör> ile kaydeder.
//   node games/milimetrik-park/tools/smoke.mjs [--shots klasör] [--mobile]
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
  await page.goto(`${base}/games/milimetrik-park/?test&unlock`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const shot = async (name) => { if (shotsDir) await page.screenshot({ path: join(shotsDir, `${name}.png`) }); };
  await shot('01-home');
  check(await page.isVisible('.home'), 'ana menü görünüyor');
  check(await page.isVisible('a[data-hub-back]'), '‹ Oyunlar bağlantısı ana menüde görünüyor');

  await page.click('[data-act="career"]');
  await page.waitForTimeout(300);
  check((await page.locator('.zcard').count()) === 6, '6 kariyer bölgesi');
  await shot('02-career');
  await page.locator('.zcard').first().click();
  await page.waitForTimeout(300);
  check((await page.locator('.lcard').count()) === 6, 'bölgede 6 bölüm');
  await shot('03-zone');
  await page.locator('.lcard').nth(1).click();
  await page.waitForTimeout(400);
  check(await page.isVisible('.brief'), 'brifing ekranı');
  await shot('04-brief');
  await page.click('[data-act="go"]');
  await page.waitForTimeout(1500);
  check(await page.isHidden('a[data-hub-back]'), 'oyun sırasında Oyunlar bağlantısı gizli');

  // sürüş kolu (klavye): W ileri, bırak dur, S geri
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1800);
  let st = await page.evaluate(() => ({ g: window.__mp.game.car.gear, v: window.__mp.game.car.vLong }));
  check(st.g === 'D' && st.v > 0.5, `kol ileri: vites D, ${(st.v * 3.6).toFixed(1)} km/h`);
  await shot('05-drive');
  await page.keyboard.up('KeyW');
  // başsız tarayıcıda kareler yavaş olabilir: durmayı en çok 4 sn bekle
  await page.waitForFunction(() => Math.abs(window.__mp.game.car.vLong) < 0.05, null, { timeout: 4000 }).catch(() => {});
  st = await page.evaluate(() => ({ v: window.__mp.game.car.vLong }));
  check(Math.abs(st.v) < 0.05, `bırakınca durdu (${(st.v * 3.6).toFixed(2)} km/h)`);
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(1600);
  st = await page.evaluate(() => ({ g: window.__mp.game.car.gear, v: window.__mp.game.car.vLong }));
  check(st.g === 'R' && st.v < -0.3, `kol geri: vites kendiliğinden R, ${(st.v * 3.6).toFixed(1)} km/h`);
  await shot('06-reverse');
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(1200);

  // park: aracı hedefe ışınla, P
  await page.evaluate(() => {
    const g = window.__mp.game, t = g.targets[0], b = g.body, geom = g.car.geom;
    const a = t.facing === 'tail' ? t.a + Math.PI : t.a;
    const cx = t.x + Math.cos(t.a) * (t.idealLong || 0), cy = t.y + Math.sin(t.a) * (t.idealLong || 0);
    b.x = cx - Math.cos(a) * geom.gcx; b.y = cy - Math.sin(a) * geom.gcx; b.a = a; b.vx = b.vy = b.w = 0; b.savePrev(); b.updateGeom();
  });
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(1800);
  check(await page.isVisible('.result'), 'sonuç ekranı');
  await shot('07-result');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('milimetrik.v1') || 'null'));
  check(saved?.v === 2 && !!saved?.levels?.['geri-geri']?.stars?.[0] && saved.coins > 300, `kayıt (milimetrik.v1, şema 2) yazıldı, jeton ${saved?.coins}`);

  // tüm bölgelerin bir bölümü, sınavlar, günlük, antrenman
  const ids = await page.evaluate(() => [...window.__mp.ZONES.map((z) => z.levels[z.levels.length > 3 ? 3 : 0].id), ...window.__mp.ZONES.map((z) => z.levels[1].id)]);
  for (const id of ids) {
    await page.evaluate((id) => { window.__mp.openLevel(id, 'career'); window.__mp.begin(); }, id);
    await page.keyboard.down('KeyW'); await page.waitForTimeout(900); await page.keyboard.up('KeyW');
    await page.waitForTimeout(500);
    await shot(`10-${id}`);
  }
  for (const id of ['sinav-b', 'sinav-e']) {
    await page.evaluate((id) => { window.__mp.openLevel(id, 'exam'); window.__mp.begin(); }, id);
    await page.waitForTimeout(1200);
    await shot(`20-${id}`);
  }
  check(await page.isVisible('.tasklist'), 'sınav görev listesi HUD\'da');
  await page.evaluate(() => { const L = window.__mp.dailyInfo().level; window.__mp.openLevel(L.id, 'daily'); window.__mp.begin(); });
  await page.waitForTimeout(1200);
  await shot('21-daily');
  await page.evaluate(() => { window.__mp.openLevel('antrenman', 'free'); window.__mp.begin(); });
  await page.waitForTimeout(1200);
  await shot('22-free');
  // vale
  await page.evaluate(() => window.__mp.startValet());
  await page.waitForTimeout(1500);
  check(await page.evaluate(() => !!window.__mp.valet && window.__mp.mode === 'play'), 'vale vardiyası başladı');
  await shot('23-valet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check(await page.isVisible('.pause'), 'Esc ile duraklatma');
  await page.click('[data-act="leave"]');
  await page.waitForTimeout(600);
  check(await page.isVisible('.result'), 'vale sonuç ekranı');
  await shot('24-valet-result');
  await page.click('[data-act="leave"]');
  await page.waitForTimeout(400);
  // garaj, başarımlar, ayarlar
  await page.click('[data-act="garage"]');
  await page.waitForTimeout(500);
  check((await page.locator('.vitem').count()) === 6, 'garajda 6 araç');
  await shot('30-garage');
  await page.click('[data-act="back"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="ach"]');
  await page.waitForTimeout(300);
  check((await page.locator('.acard').count()) >= 15, 'başarımlar listesi');
  await shot('31-achievements');
  await page.click('[data-act="back"]');
  await page.waitForTimeout(300);
  await page.click('.home-top [data-act="settings"]');
  await page.waitForTimeout(300);
  check(await page.isVisible('.settings'), 'ayarlar ekranı');
  await shot('32-settings');
  await context.close();
} finally {
  await browser.close();
  server.close();
}
for (const e of errors) console.log(`✗ ${e}`);
if (errors.length || fails) { console.log(`\n${fails} denetim başarısız, ${errors.length} hata.`); process.exit(1); }
console.log('\nDuman testi temiz.');
