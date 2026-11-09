# Sarsıntı Nakliyat — Teknik Mimari ve Modül Sözleşmeleri

> Okuyucu: Grafik, Ses, Arayüz, Bölüm tasarımı ve Test ekipleri. Oyun tasarımı için tek referans `TASARIM.md`; **bu belge kodun sözleşmesidir**.
> İskelet çalışır durumdadır (`index.html` açılır, Tosun test pistinde sürülür). İmzalar sabittir; stub'ların içini değiştirmekte serbestsiniz.

## 1. Genel bakış

- **Derleme yok**, ES modülleri, dış CDN yok, yalnızca göreli yollar (`CLAUDE.md`). Fizik: `vendor/planck.mjs` (planck.js **1.4.2**, MIT, `planck.LICENSE`), tarayıcıda ve Node'da `import * as pl from '../../vendor/planck.mjs'`.
- **Simülasyon DOM'suzdur**: `src/sim/**` window/document/canvas/audio/localStorage kullanmaz → `tools/bot.mjs` Node'da başsız çalışır. Render, ses ve arayüz sim'i yalnızca **snapshot** (okuma) ve **olaylar** (dinleme) ile görür; sim'e yalnızca `step(input)` ile giriş verilir.
- **Tek ayar dosyası**: `src/config.js`. Fizik sabitleri, araçlar, yüzeyler, kargo, ekonomi, kamera varsayılanları orada; çalışma zamanında değiştirilmez.
- Veri akışı:

```
input.js ─{throttle,brake}─► sim.step() ──► sim.snapshot() ──► renderer.render(snap, alpha, dt)
   ▲ (klavye + ui/touch.js)       │                 └────────► ui.hudUpdate(snap), audio.setEngine(...)
                                  └─ olaylar (sim.on('*')) ──► renderer.onEvent / audio.onEvent / ui.onEvent / main.js
```

## 2. Klasör yapısı ve dosya sahipliği

```
games/sarsinti-nakliyat/
  index.html  style.css            Arayüz     (giriş sayfası; ana menüde ‹ Oyunlar bağlantısı ui/index.js'tedir)
  vendor/planck.mjs planck.LICENSE Çekirdek
  docs/TASARIM.md MIMARI.md        Çekirdek (TASARIM: proje yönetimi)
  src/config.js events.js input.js main.js     Çekirdek
  src/sim/  sim.js vehicle.js terrain.js bus.js upgrades.js economy.js   Çekirdek
  src/render/ index.js camera.js interp.js     Grafik
  src/render/debug.js                          Çekirdek (fizik şekli çizimi; `?debug`)
  src/art/  draw.js palette.js                 Grafik (saf çizim fonksiyonları; dosya bölünebilir)
  src/audio/ index.js                          Ses
  src/ui/   index.js touch.js                  Arayüz
  src/save.js                                  Arayüz
  src/data/levels/ index.js 1-1.js ...         Bölüm tasarımı (index.js kayıt defteri; test-track.js Çekirdek)
  dev/art.html                                 Grafik   (sim ile sürerek çizim denemesi)
  dev/audio.html                               Ses      (tüm olaylar/motor için düğmeler)
  dev/ui.html                                  Arayüz   (sahte snapshot ile ekranlar)
  tools/bot.mjs                                Çekirdek (Test ekibi genişletir: yeni stratejiler/raporlar)
```

| Ekip | Yazabilir | Okur (değiştirmez; istek Çekirdek'e) |
|---|---|---|
| Çekirdek | `src/sim/**`, `config.js`, `events.js`, `input.js`, `main.js`, `render/debug.js`, `tools/**`, `vendor/**` | — |
| Grafik | `src/render/**` (debug.js hariç), `src/art/**`, `dev/art.html` | config.js (`CAMERA`, `SURFACES`...), snapshot, olaylar |
| Ses | `src/audio/**`, `dev/audio.html` | config.js, `events.js`, olaylar |
| Arayüz | `index.html`, `style.css`, `src/ui/**`, `src/save.js`, `dev/ui.html` | config.js, `sim/upgrades.js`, `sim/economy.js` |
| Bölüm | `src/data/levels/**` | `config.js`, bu belge §10 |
| Test | `tools/**` ile Çekirdek'e **PR benzeri istek**; bölüm ekleyince `npm run bot` | tümü |

Kural: bir modülün sözleşmesini değiştirmek gerekirse önce bu belge güncellenir (Çekirdek onayı), sonra kod.

## 3. Koordinat sistemi, birimler, ölçek

- **Dünya (sim, snapshot, bölüm verisi, art/ çizimi):** metre, **x sağa, y YUKARI**, açı **radyan, saat yönünün TERSİ (CCW) pozitif**. Araç +x yönüne (sağa) gider. Ağırlık: kg, kuvvet N, tork N·m, zaman sn. Zemin x=0 civarında başlar; bölüm sağa uzar.
- **Ekran:** css piksel, y aşağı. Renderer dünyayı şu dönüşümle çizer (`render/index.js`): `ctx.setTransform(dpr·s, 0, 0, −dpr·s, dpr·(W/2 − camX·s), dpr·(H/2 + camY·s))`; `s = W / cam.width` (piksel/metre; kamera genişliği 24–32 m, `CAMERA`). Yani `art/` fonksiyonları **y-yukarı dünya dönüşümünde** çizer: `ctx.rotate(a)` doğrudan dünya açısıdır. Metin çizilecekse `ctx.scale(1,-1)` ile yerelde çevirin. Sabit kalınlık için `px = 1/s` (bir css pikselin metre karşılığı) argümanı verilir: `ctx.lineWidth = 2*px`.
- **Gökyüzü ve parallax** dünya dönüşümü *dışında*, ekran pikselinde çizilir (`drawSky`, `drawParallax`).
- **DPR:** `dpr = min(devicePixelRatio, CAMERA.maxDpr=2)`. Canvas boyutu = css boyutu × dpr (`renderer.resize()`; `resize`/`orientationchange`'te main.js çağırır). Mantıksal tasarım yüksekliği 360–640 css px'e sığmalıdır.
- **Zaman:** sim sabit adımı `SIM.step = 1/120 s`. main.js birikimli (accumulator) döngüsü: `acc += min(dt, 0.05) × snapshot.timeScale; while (acc ≥ step) { sim.step(input); acc −= step }`; `alpha = acc/step`. 60 FPS'te kare başına 2 adım.
- **Performans bütçesi:** ≤70 dinamik gövde; kare başına sim ≤ 4 ms (orta telefon), çizim ≤ 8 ms; `snapshot()` kare başına **bir** kez çağrılır; çizimde nesne tahsisi minimumda tutulur (yeniden kullanılan `out` nesneleri). Partikül üst sınırı Grafik'te (öneri ≤300 canlı).

## 4. Sözleşme A — Sim API (`src/sim/sim.js`)

```js
import { createSim } from './sim/sim.js';

/**
 * @param {object} opts
 * @param {Level}  opts.level                 bölüm verisi (§10)
 * @param {'tosun'|'zipir'|'pasa'|'koca'} [opts.vehicleId='tosun']
 * @param {{motor?:number,suspansiyon?:number,lastik?:number}} [opts.upgrades]   kademe 0..4 (save.vehicles[id].up)
 * @param {{assistLanding?:boolean}} [opts.settings]
 * @param {number} [opts.bestScore]           levelStart olayına geçer
 * @param {{x:number,time:number}} [opts.checkpoint]   kontrol noktasından yeniden doğma: araç x'te başlar, saat `time`'dan sürer; önceki nesne/ipuçları atlanır; ★3 verilmez (`levelEnd.usedCheckpoint`)
 * @returns {Sim}
 */
createSim(opts);

/** @typedef {object} Sim
 * @prop {StaticSnapshot} static             bölüm başına değişmez veri (§5.1)
 * @prop {(input:{throttle:number,brake:number})=>void} step   tam 1 sabit adım (1/120 sn). input 0..1.
 *        Bölüm bittikten sonra da çağrılabilir (araç sürüşsüz yuvarlanır; kurallar donar).
 * @prop {()=>Snapshot} snapshot()           dinamik durum (§5.2). Dönen nesne bir sonraki snapshot() çağrısına kadar geçerli, YENİDEN KULLANILIR → saklamayın, kopyalayın.
 * @prop {(name:string|'*', fn:(e:Event)=>void)=>(()=>void)} on   olay aboneliği; '*' = hepsi. Dönüş: abonelikten çıkış fonksiyonu.
 * @prop {'running'|'won'|'failed'} status
 * @prop {LevelResult|null} result           bitince dolar (levelEnd yüküyle aynı)
 * @prop {number} time                       bölüm süresi (sn, yalnızca canlı adımlar)
 * @prop {string[]} warnings                 uygulanmamış nesne türü, kapasite aşımı gibi uyarılar
 * @prop {(p:{assistLanding?:boolean})=>void} setSettings(p)   çalışırken değişebilen ayarlar (yardımcı iniş/"kedi refleksi": ters ve yere <1,2 m ise hafif düzeltme torku)
 * @prop {()=>void} destroy()                dünyayı ve dinleyicileri bırakır
 */
```

- **Sıfırlama = `destroy()` + yeni `createSim()`** (senkron, ≈ birkaç ms; "yeniden dene <0,4 sn" bütçesi içinde). Kurulumda araç 0,5 sn "saat durmuşken" yere oturtulur; olay yayılmaz.
- Olaylar `step()` **sonunda** sırayla dağıtılır (dinleyici sim'i değiştiremez/değiştirmemeli). Dinleyici hataları yakalanıp konsola yazılır.
- Hız birimi snapshot'ta **m/s**; HUD km/s için `×3.6`.
- Başarısızlık/bitiş kuralları (kafa vuruşu, ters kalma, uçurum/çukur, süre, kargo yetersiz) sim içindedir (`levelEnd.reason`).

### Giriş (`src/input.js`)

```js
const input = createInput(window);   // klavye: → D Boşluk = gaz; ← A = fren/geri; R yeniden; Esc/P duraklat; M ses; Enter onay
input.read()                         // → {throttle:0|1, brake:0|1}  (klavye + sanal düğmeler)
input.setVirtual('throttle'|'brake', on)   // dokunmatik düğmeler (ui/touch.js) bunu çağırır
input.onAction(fn)                   // fn('retry'|'pause'|'mute'|'confirm') → kapatma fonksiyonu döner
input.reset()                        // takılı tuşları bırak (duraklatma/blur)
```

## 5. Sözleşme B — Snapshot (render/ses/arayüzün gördüğü her şey)

### 5.1 `sim.static` (bölüm başına bir kez; `renderer.setLevel(sim.static)`)

```js
{ levelId, name, biome:'elma'|'kanyon'|'bataklik'|'zirve', music:string|null,
  terrain: { xs:number[], ys:number[],          // poliçizgi düğümleri (soldan sağa; başta/sonda dik duvar; çukurlarda dik kenarlar)
             surf:string[] },                    // surf[i] = (i → i+1) KENARININ yüzeyi: 'asphalt'|'dirt'|'grass'|'gravel'|'sand'|'mud'|'wet'|'snow'|'ice'
  startX, startY, finishX, finishY, killY,       // başlangıç/bitiş çizgisi (m); killY altı = uçurum
  spawn:{x,y}, bounds:{minX,maxX,minY,maxY},
  vehicle: { id, parts:[{part:'chassis'|'cab'|'roof', x,y,w,h}],   // şasi yerel koordinatı (orijin = şasi kutusu merkezi, +x = burun)
             wheels:[{id:'rear'|'front', x,y, driven}],            // tekerlek bağlantı noktası (şasi yerel)
             wheelR, travel:[lo,hi], seat:{x,y}, bay:{x0,x1,floorY,rail} },
  props: [ {type:'bridge', id, x, y /*tahta üst yüzü*/, len, planks, weak:[idx]},
           {type:'seesaw', id, x, len, pivot:{x,y}, limit} ],      // sabit dekor bilgisi (dinamik parçalar snapshot.objects'te)
  water: [ {x0, x1, y} ],                       // su bölgeleri (y = yüzey); suyun altı sürükleme/boğulma
  checkpoints: [ {id, x, y} ], hints:[{x,text,icon}] }
// Römorklu araç (Paşa): vehicle.trailer = { parts:[{part:'trailer',x,y,w,h}], hitch:{x,y}, wheels:[{id:'trailer',x,y,r}], bay } — yerel çerçeve: römork gövdesi (orijin = kanca noktası).
```

### 5.2 `sim.snapshot()` — her kare

**Ara değerleme:** Her poz nesnesi `{x,y,a, px,py,pa}` taşır: `x,y,a` = **son adımın sonundaki** durum, `px,py,pa` = **bir önceki adımın** durumu. Renderer `lerp(px→x, alpha)` uygular (açılar sürekli/sarılmamıştır → düz lerp doğru). Hazır yardımcı: `render/interp.js → interpolateSnapshot(snap, alpha, out)` aynı şekilli, pozları ara değerlenmiş nesne üretir; `art/` fonksiyonları **ara değerlenmiş** nesne alır (alfa bilmez).

```js
{
  t, steps, timeScale,                  // timeScale: yavaş çekim çarpanı (main.js dt'ye çarpar; ses perdesi için de okunabilir)
  run: { status:'running'|'won'|'failed', reason:string|null, time, distance, progress /*0..1*/, timeLeft:number|null },
  vehicle: {
    id, x,y,a,px,py,pa,                 // şasi
    vx,vy, w /*açısal hız rad/s*/, speed /*m/s, kamera ileri-bakış için vx,vy*/,
    throttle, brake /*0..1*/, rpm /*0..1 (rölanti .12)*/, load /*0..1*/,
    airborne:boolean, reversing:boolean, wheelie:number /*sn*/,
    trailer: {x,y,a,px,py,pa}|null,       // yalnız Paşa: römork gövdesi (çizim için static.vehicle.trailer ile birlikte)
    wheels:[{ id:'rear'|'front'|'rear2'|'trailer', trailer:boolean, x,y,a,px,py,pa, r,
              compression /*0..1 (0.5 = statik çökme konumu)*/, onGround, surface:string|null,
              spinning:boolean, slip /*m/s*/, spin /*açısal hız rad/s*/, bottomOut:boolean }]
              // Süspansiyon animasyonu: wheel.(x,y) ile şasi bağlantı noktası (static.vehicle.wheels[i]) arasındaki fark.
  },
  driver: { state:'seated'|'ragdoll',
            torso:{x,y,a,px,py,pa,w,h}, head:{x,y,a,px,py,pa,r} },   // ragdoll'da bağlar kopar; gövde+kafa serbest cisim
  cargo: [{ id,type:'crate'|'watermelon'|'eggs'|'milk'|'piano'|'bale', x,y,a,px,py,pa, w,h,r /*r>0 ⇒ daire*/,
            hp,hpMax, state:'onboard'|'lost'|'delivered', reason:string|null }],
  objects: [{ id, type:'barrel'|'rock'|'plank'|'seesaw'|'log'|'snowball', x,y,a,px,py,pa, w,h,r, active }],   // dinamik/tetikli nesneler
              // plank (köprü tahtası: w=tahta boyu, h=0.2; köprü kırılınca serbest düşer), seesaw (w=uzunluk), log (w,h), snowball (r; active=tetiklendi)
  coins: [{ id,x,y,taken }],            // sabit konum
  combo: { count, multiplier, timeLeft01 /*0..1 halka*/, pending },
  score, pickups /*toplanan kuruş*/, cargoSummary:{total,onboard,delivered,lost}
}
```

Notlar: kuruş/bitiş/başlangıç konumları `static`'te. Kamera için hız vektörü `vehicle.vx, vy`. Tekerlek kimlikleri: Tosun/Zıpır `rear,front`; Koca `front,rear,rear2`; Paşa `rear,front,trailer`.

## 6. Sözleşme C — Olaylar (`src/events.js` tek kaynak; TASARIM §14)

Biçim: **düz nesne** `e = { name, t, ...yük }`; `t` = bölüm saniyesi (sim olayları). Birimler: hız m/s, açı rad, konum m (`pos:{x,y}`, y yukarı). Kaynaklar: **sim** (createSim), **game** (main.js: `pause`, `resume`), **ui** (`purchase`, `upgrade`, `ui:click`, `ui:back`, `ui:star`).

| Olay | Yük | Not |
|---|---|---|
| `levelStart` | `{levelId, biome, vehicleId, cargo:[{type,count}], bestScore}` | ilk `step()`'te |
| `levelEnd` | `{result:'win'\|'fail', reason, score, stars, time, distance, cargoDelivered, cargoLost, cargoTotal, coins, pickups, maxMultiplier, flips, intact}` | `reason`: `finish` `headHit` `flipped` `fell` `timeout` `cargoShort` `chased` (kar topu/kaya yakaladı) `water` (suda 1,5 sn) `stuck` (gaz/fren basılıyken 5 sn kıpırdamama). `usedCheckpoint:boolean`. `coins` = yolda toplanan kuruş (ödül için `sim/economy.js`) |
| `pause` / `resume` | `{}` | game |
| `throttle` / `brake` | `{on}` | kenar tetikli |
| `engine` | `{vehicleId, rpm, load, speed}` | 60 Hz (her 2. adım). Ses için `audio.setEngine` da kullanılır |
| `wheelContact` | `{wheel, surface, started}` | |
| `surfaceChange` | `{wheel, from, to}` | suya girince/çıkınca `to/from:'water'` |
| `wheelspin` | `{wheel, surface, slip}` | patinajda ≈10 Hz |
| `suspension` | `{wheel, compression, bottomOut}` | yalnızca uç tampona vurunca (kenar) |
| `airborne` | `{startT}` | tüm tekerler ≥0,1 sn havada |
| `land` | `{impactSpeed, tilt, wheels, clean, airTime}` | |
| `flip` | `{count, direction:'back'\|'front', airTime}` | her tamamlanan 360°'de (havada) |
| `wheelie` | `{duration}` | bitince (≥1 sn) |
| `bodyHit` | `{speed, part:'roof'\|'cab'\|'chassis', normal:{x,y}}` | >2 m/s |
| `cargoHit` | `{id, type, speed, damage}` | >1,5 m/s |
| `cargoDamage` | `{id, type, hpLeft}` | |
| `cargoLost` | `{id, type, reason:'fell'\|'water'\|'broke'\|'left'}` | |
| `cargoDelivered` | `{id, type, value, hpLeft}` | bitiş çizgisinde |
| `comboChange` | `{count, multiplier, timeLeft}` | |
| `comboBank` | `{points, multiplier}` | |
| `comboBurn` | `{reason, lostPoints}` | `badLanding` `cargoLost` `headHit` `bodyHit` |
| `coin` | `{value, pos}` | |
| `driverEject` | `{headSpeed, pos}` | ragdoll başlar |
| `crash` | `{reason, pos}` | başarısızlığın nedeni |
| `bridgeStress` | `{id, stress:0..1}` | zayıf tahtaya binen yük / eşik; >0,4 iken ≤10 Hz |
| `bridgeBreak` | `{id, pos}` | zayıf tahta kopar (eşik `PROPS.bridge.weakForce`: yavaş geçiş güvenli, hızlı/sıçrayarak kopar) |
| `checkpoint` | `{id, pos, x}` | kontrol noktası geçildi |
| `seesaw` | `{id, angVel}` | tahterevalli hareketinde ≤10 Hz (gıcırtı) |
| `hazardTrigger` | `{id, type:'rock'\|'snowball'\|'barrels', pos}` | kaya/kar topu tetiklenince; `barrels` ilk varil çarpışmasında |
| `nearMiss` | `{id, distance}` | |
| `slowmo` | `{scale, duration, reason}` | `duration` **sim saniyesi**; gerçek süre = duration/scale (ör. 1 sn @0,35 ≈ 2,9 sn). Sim `timeScale`'i kendisi uygular |
| `starEarned` | `{index:1..3}` | `levelEnd`'den sonra sırayla |
| `purchase` / `upgrade` | `{item\|vehicleId+line, cost, level}` | UI yayar |
| `toast` | `{text, icon}` | bölüm `hints`'inden |

Dağıtım: main.js `sim.on('*', e => { renderer.onEvent(e); audio.onEvent(e); ui.onEvent(e) })`. Yeni olay eklemek = `events.js` + bu tablo + ilgili ekibe haber.

## 7. Sözleşme D — Grafik API (`src/render/index.js`, `src/art/*`)

```js
const r = createRenderer(canvas, { debug?:boolean, quality?:'high'|'low', shake?:0|1|2 });
r.setLevel(sim.static);              // bölüm başında bir kez (önbellekleri sıfırla, kamerayı oturt)
r.render(snapshot, alpha, dt);       // her kare; alpha 0..1, dt gerçek saniye (kamera/partikül gerçek zamanla; yavaş çekimde timeScale snapshot'ta)
r.onEvent(e);                        // sim olayları: partikül, sarsıntı, flaş
r.resize();                          // canvas boyutu/DPR güncelle
r.setOptions({debug, quality, shake});
r.destroy();
```

Çizim sırası (arkadan öne): gökyüzü → parallax uzak/orta → zemin dolgusu+üst çizgi (yüzey rengi `static.terrain.surf`) → başlangıç/bitiş bayrağı → kuruşlar → dinamik nesneler → sürücü → araç (tekerlekler, süspansiyon) → kargo → partiküller → ön plan otları → (debug). HUD **DOM**'dadır (renderer HUD çizmez).

`src/art/` saf çizim fonksiyonları (stub `draw.js`; dosyalara bölünebilir). Hepsi **dünya dönüşümünde** (m, y yukarı) çağrılır, durum tutmaz, `px` = bir css piksel (m):

```js
drawSky(ctx, biome, view{w,h})                        // ekran pikseli
drawParallax(ctx, biome, layer 0|1|2, camX, view, scale)   // ekran pikseli
drawTerrain(ctx, static, range{x0,x1}, px)
drawFinish(ctx, x, y, px, 'start'|'finish')
drawVehicle(ctx, vehicleInterp, static.vehicle, px)   // araç + tekerlekler
drawDriver(ctx, driverInterp, px)
drawCargo(ctx, cargoItemInterp, px)
drawObject(ctx, objectInterp, px)
drawCoin(ctx, coin, px, t)
```

Palet: `art/palette.js` (`BIOMES`, `SURFACE_TOP`, `CARGO_COLORS`). Kamera: `render/camera.js` (`CAMERA` değerleri). Ekran sarsıntısı ve yavaş çekim: Grafik `onEvent`'ten tetikler (`bodyHit`, `land`); ayar `shake` 0/1/2.

## 8. Sözleşme E — Ses API (`src/audio/index.js`)

```js
const audio = createAudio();
audio.unlock();                       // ilk dokunuş/tuşta (main.js) — AudioContext oluştur/resume
audio.setEngine({ vehicleId, rpm01, throttle, load, onGround });   // her karede (60 Hz) çağrılır; ses ekibi kendi içinde yumuşatır
audio.onEvent(e);                     // §6 olayları + 'ui:*'; e.name ile ayırt edilir
audio.music(trackId|null);            // 'menu' | bölüm.music ('elma','kanyon',…) | null
audio.setVolumes({ master?, music?, sfx? });   // 0..1 (kayıttaki settings.sfx/music)
audio.suspend(); audio.resume(); audio.destroy();
```

Web Audio'da tamamen sentez; harici dosya yok. Duraklatmada `suspend()`; `visibilitychange`'de main.js duraklatır. `dev/audio.html` her olayı ve motoru elle tetikler.

## 9. Sözleşme F — Arayüz API (`src/ui/index.js`, `src/save.js`)

```js
const ui = createUI({ root, input, save, flow, levels /* CAMPAIGN */ });
ui.show('menu'|'hud'|'pause'|'result'|'none', params)   // params: result → {result:LevelResult, reward, level}
ui.hudUpdate(snapshot)               // her karede (playing); DOM'u yalnız değişince güncelle
ui.onEvent(e)                        // toast, kargo hasarı flaşı, kombo vb.
ui.destroy()
// UI → oyun akışı (main.js sağlar):
flow = { startLevel(levelId, vehicleId?), retry(), pause(), resume(), toMenu(), nextLevel() }
```

- **Ekranlar** (TASARIM §10): menü, bölüm seçimi, bölüm ön ekranı, garaj, ayarlar, HUD, duraklat, sonuç. İskelet yalnızca menü(Başla)/HUD/duraklat/sonuç içerir; ana menüde `‹ Oyunlar` (`<a href="../../" data-hub-back>`) var, `hub/back.js` `index.html`'de yüklenir; bağlantı yalnızca menüde görünür.
- **Dokunmatik** (`ui/touch.js`): GAZ sağ-alt, FREN sol-alt; pointer events + `setPointerCapture`, çoklu dokunuş, `touch-action:none`; basılıyken `input.setVirtual('throttle'|'brake', true/false)` — sim yalnızca `input.read()` görür. Düğme hit-alanı ≥88 px.
- **Ekonomi yardımcıları:** `sim/economy.js → levelReward(level.reward, levelEnd, prevStars)`, `upgradeCost(level)`; `sim/upgrades.js → effectiveVehicle(id, up)` (garajda istatistik önizlemesi). Satın alma/yükseltme/açma mantığı UI'dadır (`save.update`), `purchase`/`upgrade` olayını `ui` yayar.
- **Ayarlar** (`save.data.settings`): `sfx, music, shake, haptics, assistLanding, quality, btnScale`; main.js renderer/audio'ya uygular.

**Kayıt (`src/save.js`)** — anahtar `sarsinti.v1` (TASARIM §15), başka anahtara dokunmaz:

```js
const save = createSave(storage?);   // localStorage yoksa/atarsa bellek
save.load()                          // → data; yoksa defaults(); BOZUK JSON → varsayılan, eskisi 'sarsinti.v1.bak'e yedeklenir
save.data                            // canlı nesne (şema TASARIM §15)
save.update(fn)                      // fn(data) uygula + debounce'lu kaydet (≤1/sn)
save.save(now?) / save.flush()       // flush: bekleyen yazımı hemen yaz (bölüm sonu)
save.reset()                         // yalnızca bu anahtarı siler
SCHEMA_VERSION = 1; migrate(raw)     // eski/eksik alanları tamamlar; v2 gelince burada yükseltilir
```

## 10. Sözleşme G — Bölüm verisi (`src/data/levels/*.js`)

Her bölüm `export default {…}` ve `levels/index.js`'te `CAMPAIGN` dizisine sırayla eklenir. **Tam örnek: `1-1.js`**; her yüzey/parça için `test-track.js`.

```js
{
  id:'1-1', name:'İlk Sipariş', region:1, order:1, difficulty:1, teaches:'…',
  biome:'elma',                 // elma | kanyon | bataklik | zirve (palet)
  music:'elma',                 // ses parça kimliği | null
  terrain:{ surface:'asphalt',  // varsayılan yüzey
    pieces:[ …parçalar… ] },    // x=0'dan SAĞA eklenir; her parça önceki parçanın bittiği yerden başlar
  spawn:{ x:3 },                // araç şasi merkezi x (y otomatik)
  finish:{ x:'end' },           // 'end' | metre
  cargo:[{ type:'crate', count:3 }],   // araca otomatik yerleşir (kapasite: Tosun 6, Zıpır 3, Paşa 10 (römorkta), Koca 10; yuvarlaklar arka kapağa, kutular önüne dizilir)
  minDelivered:1,               // bitişte teslim edilen < bu ise 'cargoShort' (başarısız)
  parTime:40, timeLimit:null,   // süre bonusu referansı / süre sınırı (sn)
  objects:[ …nesneler… ],
  hints:[{ x, text, icon }],    // araç x'e gelince 'toast' olayı
  stars:{ 2:[ölçüt…], 3:[ölçüt…] },    // ★1 = bitir. Bir kademe = listedeki TÜM ölçütler; ★3 için ★2 de gerekir
  reward:{ base:70 },           // bölüm tamamlama kuruşu (TASARIM §8.3)
  bot:{ speed:12 },             // test botu hedef hızı (m/s)
  killY?: number, checkpoints?: []   // isteğe bağlı (killY varsayılan: en alçak zemin − 14 m)
}
```

**Zemin parçaları** (`type` + alanlar; `surface` verilmezse öncekinin yüzeyi; kenar uzunluğu otomatik ≤1 m):

| type | Alanlar | Anlamı |
|---|---|---|
| `flat` | `len` | düz |
| `slope` / `ramp` | `len, dy` | doğrusal yükselti (dy<0 iniş). `ramp` = aynı geometri; adlandırma anlamsal (fırlatma için ardından `gap`/iniş koy) |
| `hills` | `len, amp, waves` | yumuşak tepeler; uçlar aynı yükseklikte |
| `bumps` | `len, h, n` | n adet sin² tümsek (yükseklik h) |
| `gap` | `len, depth` | dik duvarlı çukur (≥1,5 sn çukurda/3 m altında kalma = `fell`) |
| `pts` | `pts:[[dx,dy],…]` | ham göreli noktalar (dx ≥ 0) |

Yüzeyler: `asphalt dirt grass gravel sand mud wet snow ice` (`water` P1). Başlangıçta geri çıkışı engelleyen duvar ve bitişten sonra 12 m düz yol + duvar otomatik eklenir.

**Nesneler** (`objects:[…]`; `x` = zemin x'i, y zeminden hesaplanır):

| type | Alanlar | Durum |
|---|---|---|
| `coins` | `x, n, spacing=1.5, h=1.2` | uygulandı (5 kuruş/adet) |
| `barrels` | `x, cols=3, rows=3` | uygulandı (devrilen yığın) |
| `rock` | `x, r, mass?, trigger:{x}, vx=-3` | uygulandı (araç `trigger.x`'e gelince yuvarlanır, `hazardTrigger`) |
| `bridge` | `x, len, planks=len/1, weak:[idx], drop=0.1` | **uygulandı.** Zemin parçalarında `{type:'gap', len, depth}` (ya da vadi) bırakıp köprüyü `x` = çukur başı, `len` = çukur boyu ile koy. Eklemli tahtalar, iki ucu zemine bağlı. `weak` tahtalar yük/darbe eşiğini aşarsa kopar (`bridgeBreak`) |
| `seesaw` | `x, len=8` | **uygulandı** (tahterevalli sol ucu yerde başlar; `x` = sol uç; altı düz zemin olmalı; araç ağırlık merkezini geçince devrilir) |
| `snowball` | `trigger:{x}, behind=14, v0=6, v1=12, ramp=40, r=1.6` | **uygulandı** (kovalayan top, arkadan v0→v1 m/s; yakalarsa `chased`) |
| `water` | `x, len, y?` | **uygulandı**; altı çukur (`gap`) olmalı; `y` = yüzey (varsayılan sol kenar −0,5). Araç gövdesi suda 1,5 sn ⇒ `water`; kargo suya düşerse `cargoLost 'water'` |
| `logs` | `x, n, spacing=w+0.1, w=4, h=0.9, y?` | **uygulandı** yüzen kütükler (su bölgesi içine; yatay yaylı bağlı) |
| `checkpoint` | `x` | **uygulandı** (`checkpoint` olayı; `main.flow.retryFromCheckpoint()`) |

**Yıldız ölçütleri** (`{kind, …, label}`; `label` UI'da gösterilen Türkçe metin): `delivered{min}` `deliveredAll` `time{max}` `eggs{min}` (kalan yumurta can) `flips{min}` `combo{min}` (çarpan) `noReverse` `intact` (kargo hasarsız ve kayıpsız) `noHit` (şasi çarpması >6 m/s yok) `bridgeIntact` (köprü kopmadı) `noCheckpoint`. Yeni ölçüt = Çekirdek'e istek.

## 11. Sözleşme H — `main.js` durum makinesi

```
boot ─► menu ─(Başla/startLevel)─► loading ─► playing ◄─(resume)─ paused
                ▲                                │  ▲               ▲
                │                                │  └──(Esc/P, sekme gizlenince: pause)
                └──(toMenu)── result ◄───────────┘   levelEnd + 1,0 sn (kazanma) / 0,5 sn (kayıp) gerçek zaman gecikmesi
                               │ retry(R/Enter/düğme) ─► loading ─► playing
```

- `loading` senkrondur: eski sim `destroy()`, `createSim()`, `renderer.setLevel()`, müzik. Yeniden deneme <0,4 sn.
- `menu` durumunda arka planda boşta bir sim (CAMPAIGN[0]) çizilir, adım atılmaz.
- `levelEnd` → `finishLevel`: ödül (`levelReward`), kayıt (`save.update`: yıldız/skor/süre/deneme, kuruş, istatistik, `flush`), `ui.show('result', …)`.
- `flow` ek yöntemleri: `startLevel(id, vehicleId?)` (retry aynı aracı kullanır), `retryFromCheckpoint()`/`hasCheckpoint()`, `emit(name,data)` (UI → ses/grafik: purchase, upgrade, ui:*), `applySettings(settings)` (UI ayar değişince; ses seviyesi, sarsıntı, kalite, yardımcı iniş).
- Duraklatma: `input.reset()`, `audio.suspend()`, `pause` olayı; devamda `resume`.
- Bağlama: `sim.on('*')` → renderer/audio/ui; her karede `renderer.render`, `ui.hudUpdate`, `audio.setEngine`. `?debug` → fizik çizgileri + `window.__sarsinti` (durum, sim, snap, flow) — Test (Playwright) için.

## 12. Sözleşme I — Test (`tools/bot.mjs`)

```
node games/sarsinti-nakliyat/tools/bot.mjs [bölümId …] [--vehicle tosun|zipir] [--speed m/s] [--max sn] [--strict]
```

Seçenekler: `--matrix` (tüm araçlar), `--determinism` (aynı koşu iki kez, sonuç aynı olmalı), `--strict`, `--json`. Bölümde isteğe bağlı `bot:{speed, jumpSpeed, zones:[{x0,x1,speed}], vehicles:{zipir:{speed}}}`; bot geniş çukurlardan önce otomatik hızlanır, köprüde `zones` ile yavaşlatılabilir. Başsız: `createSim` + `autopilot(snapshot, hedefHız)` (hedef hıza gaz/fren, havada açıyı düzelt). Her bölüm için sonuç (`OK/FAIL`), neden, süre, yıldız, skor, kargo; `--strict` kampanya bölümü bitmezse çıkış kodu 1. Sonraki adımlar (Test ekibi): bölüm başına strateji (`level.bot`), boş/dolu kasa ve araç matrisi, sürtünme eğimi testi, kafa vuruşu yanlış tetikleme testi, kargo kaybı eşikleri, determinizm (aynı giriş → aynı sonuç), kayıt bozulma testi (`save.js` Node'da bellekle çalışır). Tarayıcı duman testi: Playwright ile `index.html?debug` aç, konsol hatası yok, `window.__sarsinti.state`.

## 13. Fizik ayar kararları ve bilinen sınırlar (Çekirdek)

- **Süspansiyon:** WheelJoint yayı (planck 1.4'te yolculuk sınırı yok) + elle uç tamponu; frekans/sönüm sprung kütleden türetilir (`sim/vehicle.js`). Tosun 1,7 Hz (daha yumuşak: ağırlık aktarımı görünsün), Zıpır 2,6 Hz. `pitchGain`: gaz/fren torkunun şasiye ek yüzdesi (gazda burun kalkar, frende çöker; Tosun ±0,03–0,07 rad).
- **Kargo:** bölme "skyline" ile dizilir (yuvarlaklar arkaya, kutular öne; daireler arasına oturur), arka kapak yükseltildi, yuvarlak kargoya yuvarlanma sönümü. Normal sürüşte kargo kalır; sıçrayan tümsek/atlayış/sert inişte yumurta kırılır, kasa/karpuz düşebilir.
- **Yumuşak zemin:** `SURFACES[*].sink` hızla orantılı batma sürüklemesi (kum ≈ 8 m/s, çamur ≈ 6,5 m/s Tosun tepe hızı). Patinaj buzda belirgin (Tosun ≈ 5 m/s'de takılır).
- **Kafa vuruşu:** sürücü kabin içinde (tavan üstünde değil); eşik 6 m/s göreli normal hız; normal inişlerde (12–16 m/s atlayış) tetiklenmedi.
- **Determinizm:** sabit adım, Math.random yok; `bot --determinism` aynı sonuç verir (kampanya × 4 araç).
- Römork: Paşa'da `hitchLimit` 0,9 rad (jackknife sınırı). Paşa atlayışlı bölümlerde (2-4) düşer: tasarım gereği "Hava 1".
- Yok: Uzun Yol, gamepad, tahterevalli+köprü için ayrı kilit/ayar arayüzü; kar topu yalnızca düz kinematik takip (zemini izler).
