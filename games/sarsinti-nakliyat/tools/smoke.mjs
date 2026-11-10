// Sarsıntı Nakliyat — tarayıcı duman testi (Playwright).
// 16 bölümü ve Uzun Yol'u (4 araç) açar, kısa süre sürer; konsol hatası, yakalanmamış istisna,
// 4xx/5xx yanıt ve dış alan adı isteği olursa çıkış kodu 1.
//
// Kullanım:  node games/sarsinti-nakliyat/tools/smoke.mjs [--port N] [--secs 3] [--endless-secs 8] [--levels 1-1,2-3] [--headed]
// Kendi statik sunucusunu (depo kökü) açar ve bitince kapatır; --port verilmezse rastgele boş port.
// Playwright gerekir (bulut oturumlarında hazır; yerelde: npm i -D playwright && npx playwright install chromium).
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const secs = Number(arg('--secs', 3)), endlessSecs = Number(arg('--endless-secs', 8));
const only = arg('--levels', null)?.split(',');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end('404'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(Number(arg('--port', 0)), '127.0.0.1', r));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright bulunamadı.'); server.close(); process.exit(2); }

const problems = [];
const note = (where, msg) => { problems.push(`${where}: ${msg}`); console.log(`  ✗ ${msg}`); };
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 740, height: 360 }, hasTouch: true });
const page = await ctx.newPage();
let where = 'yükleme';
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') note(where, `konsol ${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => note(where, `istisna: ${e.message}`));
page.on('requestfailed', (r) => note(where, `istek başarısız: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) note(where, `HTTP ${r.status()}: ${r.url()}`); });
page.on('request', (r) => { if (!r.url().startsWith(origin) && !/^(data|blob):/.test(r.url())) note(where, `dış istek: ${r.url()}`); });

await page.goto(`${origin}/games/sarsinti-nakliyat/?debug`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__sarsinti?.state === 'menu', null, { timeout: 15000 });
const levelIds = await page.evaluate(async () => (await import('./src/data/levels/index.js')).CAMPAIGN.map((l) => l.id));
const vehicles = await page.evaluate(async () => (await import('./src/config.js')).VEHICLE_ORDER);
await page.evaluate((vs) => { const s = window.__sarsinti.save; s.update((d) => { for (const v of vs) d.vehicles[v].owned = true; }); }, vehicles);

async function drive(ms) {
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(ms);
  await page.keyboard.up('ArrowRight');
}
const state = () => page.evaluate(() => ({ st: window.__sarsinti.state, t: window.__sarsinti.snap?.run?.time, x: window.__sarsinti.snap?.vehicle?.x, run: window.__sarsinti.snap?.run?.status }));

for (const id of levelIds.filter((i) => !only || only.includes(i))) {
  where = `bölüm ${id}`;
  await page.evaluate((i) => window.__sarsinti.flow.startLevel(i, 'tosun'), id);
  await drive(secs * 1000);
  const s = await state();
  if (!['playing', 'result'].includes(s.st)) note(where, `beklenmeyen durum: ${s.st}`);
  if (!(s.t > 0)) note(where, 'sim zamanı ilerlemedi');
  console.log(`  ${id}: ${s.st}/${s.run}, t=${s.t?.toFixed(1)}, x=${s.x?.toFixed(0)}`);
}
for (const v of vehicles) {
  where = `Uzun Yol (${v})`;
  await page.evaluate((vv) => window.__sarsinti.flow.startEndless(vv, 7), v);
  await drive(endlessSecs * 1000);
  const s = await state();
  if (!['playing', 'result'].includes(s.st)) note(where, `beklenmeyen durum: ${s.st}`);
  if (!(s.t > 0)) note(where, 'sim zamanı ilerlemedi');
  console.log(`  uzun yol ${v}: ${s.st}/${s.run}, t=${s.t?.toFixed(1)}, x=${s.x?.toFixed(0)}`);
}
await browser.close(); server.close();
if (problems.length) { console.log(`\n${problems.length} sorun bulundu.`); process.exit(1); }
console.log('\nDuman testi temiz: konsol hatası, 4xx/5xx ve dış istek yok.');
