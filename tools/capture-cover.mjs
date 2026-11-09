// Oyun Salonu — bir oyunun ekran görüntüsünden kapak görseli (games/<id>/cover.webp) üretir.
//
// Kullanım:
//   node tools/capture-cover.mjs <oyun-id> [seçenekler]
//
// Seçenekler:
//   --wait <ms>       Sayfa açıldıktan (ve tıklamalardan) sonra bekleme süresi. Varsayılan: 3000
//   --click <seçici>  Çekimden önce tıklanacak öğe; birden çok kez verilebilir (ör. menüden oyuna geçmek için)
//   --hide <seçici>   Çekimde gizlenecek öğeler, CSS seçici (ör. "#menu, #hud")
//   --webgl           3D (WebGL) kullanan oyunlar için yazılımsal GPU'yu etkinleştirir (yavaştır)
//   --out <dosya>     Çıktı yolu. Varsayılan: games/<id>/cover.webp
//
// Örnek: node tools/capture-cover.mjs paldir-kuldur --wait 6000 --hide "#ui"
//
// Playwright gerekir. Claude Code bulut oturumlarında hazır gelir; kendi bilgisayarında:
//   npm i -D playwright && npx playwright install chromium
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 1280;
const HEIGHT = 720;

function parseArgs(argv) {
  const opts = { id: null, wait: 3000, clicks: [], hide: '', webgl: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--wait') opts.wait = Number(argv[++i]);
    else if (a === '--click') opts.clicks.push(argv[++i]);
    else if (a === '--hide') opts.hide = argv[++i];
    else if (a === '--webgl') opts.webgl = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (!a.startsWith('--') && !opts.id) opts.id = a;
    else throw new Error(`Bilinmeyen seçenek: ${a}`);
  }
  return opts;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
};

// GitHub Pages'e benzer küçük bir statik sunucu (repo kökünü sunar).
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.id) {
    console.error('Kullanım: node tools/capture-cover.mjs <oyun-id> [--wait ms] [--click seçici] [--hide seçici] [--webgl] [--out dosya]');
    process.exit(1);
  }
  if (!existsSync(join(root, 'games', opts.id, 'index.html'))) {
    console.error(`games/${opts.id}/index.html bulunamadı.`);
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright'));
  } catch {
    console.error('Playwright bulunamadı. Kurmak için: npm i -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  // 2D tuval oyunları CPU çizimiyle daha hızlı; WebGL için yazılımsal GPU gerekir.
  const args = opts.webgl ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : ['--disable-gpu'];
  const browser = await chromium.launch({ args });
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.warn(`[sayfa hatası] ${e.message}`));
    await page.goto(`${base}/games/${opts.id}/`, { waitUntil: 'load' });
    for (const sel of opts.clicks) {
      await page.waitForTimeout(800);
      await page.click(sel);
    }
    await page.waitForTimeout(opts.wait);
    if (opts.hide) await page.addStyleTag({ content: `${opts.hide} { visibility: hidden !important; }` });
    await page.waitForTimeout(300);
    const png = await page.screenshot({ type: 'png', timeout: 120000 });

    // WebP'ye tarayıcının kendi kodlayıcısıyla çevir (ek bağımlılık gerekmez).
    const enc = await browser.newPage();
    const dataUrl = await enc.evaluate(async ({ b64, w, h }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/webp', 0.82);
    }, { b64: png.toString('base64'), w: WIDTH, h: HEIGHT });
    const out = resolve(opts.out || join(root, 'games', opts.id, 'cover.webp'));
    writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`✓ ${out} (${WIDTH}×${HEIGHT})`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
