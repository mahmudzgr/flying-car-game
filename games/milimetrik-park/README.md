# Milimetrik Park 🅿️

> [Oyun Salonu](../../README.md)'nun oyunlarından biri. Ana menünün sol üstündeki **‹ Oyunlar** bağlantısı oyun
> seçim ekranına döner. **Konsept sürüm:** sürüş hissi ve kontroller için geri bildirim toplanıyor.

Kuş bakışı bir park oyunu. Önceliği **gerçekçi sürüş dinamiği ve kontroller**:

- **Ackermann direksiyon:** iç teker daha çok döner; araç arka dingil hizasındaki bir merkez etrafında döner.
  Dönüş çapı 10,4 m (gerçek bir kompakt hatchback gibi). Direksiyon simidi merkezden kilide 450°.
- **Lastikler:** düşük hızda kaymadan döner; hızlandıkça kayma açısı oluşur (hafif önden kayma), sınır aşılınca
  kayar ve iz bırakır. Yükler ağırlık aktarımıyla değişir (frende burun yüklenir).
- **Otomatik vites (P-R-N-D):** D ya da R'deyken pedala basmasan da araç ~6 km/h sürünür. Gerçek hayattaki gibi
  hızı fren pedalıyla ayarlarsın. Fren pedalı kademelidir; hafif basış sürünmeyi yavaşlatır, tam basış durdurur.
- **Direksiyon kendini toplar:** ileri giderken simidi bırakınca düzelir; geri giderken neredeyse hiç düzelmez.
  Duran araçta direksiyon çevrilebilir (kuru direksiyon). Ayarlardan kapatılabilir.
- **Kaldırım yalnızca tekerlekleri durdurur:** tampon kaldırımın üstüne taşabilir. Teker takozları da öyle;
  takoza hafifçe değmek park yerinin dibine yanaştığını gösterir.
- **Park sensörü** (bip'ler yaklaştıkça hızlanır, 30 cm'de sürekli öter) ve **yörünge çizgileri**
  (aracın mevcut direksiyon açısıyla izleyeceği yol: kırmızı 0,6 m, sarı 1,6 m, yeşil ötesi).

## Nasıl oynanır

Hedef yer mavi kesikli çizgiyle ve içindeki hayalet araçla gösterilir; hayaletin oku aracın burnunun bakması
gereken yönü gösterir. Çizgilerin içinde dur ve **P**'ye al. Değerlendirme: açı sapması, yanal kayma, ileri-geri
konum → **isabet %**. %95 ve üstü **"Milimetrik!"**.

Her bölümde 3 yıldız: **Park et** · **Hasarsız** (hiçbir yere çarpmadan/sürtmeden) · **Usta** (hamle hedefi ve
%85+ isabet). *Hamle*, yön değişimi sayısıdır: ileri git = 1, sonra geri = 2…

| Eylem | Dokunmatik | Klavye | Oyun kolu |
|---|---|---|---|
| Direksiyon | Sol alttaki simidi çevir (ya da Ayarlar → Kaydırma) | `A` `D` / `←` `→` (kısa bas: ince ayar) | Sol çubuk |
| Gaz / fren | Sağ alttaki pedallar (parmak ne kadar yukarıdaysa o kadar sert) | `W` / `↑`, `S` / `↓` | RT / LT |
| Vites | P R N D düğmeleri | `E` → D, `Q` → R, `N` → N, `P` → park | RB → D, LB → R, Y → P |
| El freni | — | `Boşluk` | X |
| Kamera (kuzey sabit / araçla dön) | sağ üst düğme | `C` | — |
| Harita (basılı tut) | sağ üst düğme | `Tab` | B |
| Yakınlaştır | — | `+` / `-`, fare tekerleği | — |
| Yeniden başla / duraklat | duraklat menüsü | `R` / `Esc` | Back / Start |

## Bölümler

1. **İlk Park:** burunla dik park (takozlu)
2. **Geri Geri:** iki araç arasına geri geri
3. **Çapraz Park:** tek yönlü koridorda 60° açılı
4. **Paralel Park:** kaldırıma paralel, kutulu
5. **Dar Garaj:** 3 m'lik garaja geri geri
6. **AVM Otoparkı:** kolon dibine geri geri (kapalı otopark, farlar yanar)
7. **Sıkışık Sokak:** iki araç arasındaki 5,4 m boşluğa paralel

**Antrenman Alanı:** serbest sürüş; slalom, koni garajı, paralel kutu, işaretli yerlerde P'ye alınca isabet gösterilir.

## Kayıt

İlerleme bu tarayıcının yerel deposunda `milimetrik.v1` anahtarıyla tutulur (alan adı ortak; anahtarı değiştirme).

## Dosyalar

```
index.html, style.css          Giriş sayfası ve stil
manifest.webmanifest, icon*    Ana ekrana eklenebilir uygulama bilgisi
cover.webp                     Seçim ekranı kapağı (16:9)
src/config.js                  Araç ölçüleri, fizik sabitleri, hasar ve puan ayarları
src/sim/physics.js             Kendi 2B katı cisim fiziği (SAT çarpışma, sıralı darbe çözücü)
src/sim/vehicle.js             Araç dinamiği: Ackermann, lastik kısıtları, tork konvertörü, fren, ağırlık aktarımı
src/sim/game.js                Bölüm çalışma zamanı: hasar, hamle, park değerlendirmesi, sensörler, yörünge çizgileri
src/sim/planner.js             Park yolu planlayıcı (Hybrid A*): bölüm doğrulaması için
src/levels/                    Bölüm kurucu (build.js) ve bölümler (index.js)
src/render/                    Canvas 2D çizim, prosedürel dokular ve araç çizimleri, kamera
src/ui/                        Ekranlar ve HUD (ui.js), dokunmatik kontroller (controls.js)
src/input.js, audio.js, save.js, main.js
tools/bot.mjs                  Node testleri; tools/solutions.json planlayıcının bulduğu çözümler
tools/smoke.mjs                Tarayıcı duman testi (Playwright)
```

`src/sim/` DOM kullanmaz; Node'da çalışır. Fizik 240 Hz sabit adımla ilerler ve deterministiktir.

## Testler

```bash
node games/milimetrik-park/tools/bot.mjs           # sürüş ölçümleri, bölüm denetimi, çözümlerin gerçek fizikle sürülmesi, determinizm
node games/milimetrik-park/tools/bot.mjs --plan    # çözümleri planlayıcıyla yeniden üret (bölüm değişince; ~30 sn)
node games/milimetrik-park/tools/smoke.mjs [--shots klasör] [--mobile]   # tarayıcıda menü → sürüş → park → kayıt
```

Bölüm geometrisini değiştirdikten sonra `--plan` çalıştır: planlayıcı her bölüm için en az hamleli çarpışmasız
manevrayı arar, bot bunu gerçek fizikle (sürün → frenle → dur → direksiyonu çevir) sürer ve "Usta" yıldızının
hamle hedefinin ulaşılabilir olduğunu doğrular. `npm test` kayıtlı çözümleri sürer.

Geliştirici kipi: `index.html?debug` çarpışma şekillerini, temas noktalarını ve lastik kuvvetlerini çizer.
