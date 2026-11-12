# Milimetrik Park 🅿️

> [Oyun Salonu](../../README.md)'nun oyunlarından biri. Ana menünün sol üstündeki **‹ Oyunlar** bağlantısı oyun
> seçim ekranına döner.

Kuş bakışı bir park oyunu. Önceliği **gerçekçi sürüş dinamiği ve kontroller**:

- **Ackermann direksiyon:** iç teker daha çok döner; araç arka dingil hizasındaki bir merkez etrafında döner.
  Her aracın dönüş çapı gerçek sınıfındaki gibidir (Kumru 9,6 m … Pelikan 13 m).
- **Lastikler:** düşük hızda kaymadan döner; hızlandıkça kayma açısı oluşur, sınır aşılınca kayar ve iz bırakır.
  Islak zeminde ve su birikintisinde tutuş düşer; yokuşta araç kayar (sürüş kolu yokuşta tutar).
- **Otomatik vites:** D ya da R'deyken araç rölantide ~6 km/h sürünür. Önden, arkadan ve dört çeker araçlar.
- **Direksiyon kendini toplar:** ileri giderken simidi bırakınca düzelir; geri giderken neredeyse hiç düzelmez.
- **Kaldırım yalnızca tekerlekleri durdurur:** tampon kaldırımın üstüne taşabilir. Teker takozları da öyle.
- **Park sensörü:** ön ve arka tamponda 4'er bölge; bip'ler yaklaştıkça hızlanır, 30 cm'de sürekli öter.
  Aracın çevresinde engelin yönünü gösteren renkli yaylar çizilir.
- **Yörünge çizgileri:** mevcut direksiyon açısıyla izlenecek yol (kırmızı 0,6 m, sarı 1,6 m, yeşil ötesi).
  Römorkla geri giderken römorkun izleyeceği yol da gösterilir.
- **Römork:** Kervan kamyonetin römorku gerçek bir mafsalla bağlıdır; geri giderken sapma büyür, 75°'de makaslar.

## Kontroller

İki sürüş şeması var (Ayarlar → Sürüş kontrolü):

- **Sürüş kolu** (varsayılan): sağdaki yaylı kolu yukarı it → ileri, aşağı çek → geri. Ortadan ne kadar
  uzaklaştırırsan o kadar hızlı gider. Bırakınca kol ortaya döner ve araç frenle durup bekler; yokuşta kaymaz.
  D/R vitesi kendiliğinden seçilir. **P** ayrı düğmedir: araç durur ve parka alınır.
- **Pedal + vites:** gerçekçi P-R-N-D, gaz ve fren pedalları (parmak ne kadar yukarıdaysa o kadar sert).
  **Auto Hold** açıkken frenle tamamen durunca fren tutulur, gaza basınca bırakılır; vites değiştirirken araç kaçmaz.

Dokunmatik direksiyon: sol alttaki **simit** (merkezden kilide 270–540° ayarlanabilir) ya da **kaydırma**.

| Eylem | Klavye | Oyun kolu |
|---|---|---|
| Direksiyon | `A` `D` / `←` `→` (kısa bas: ince ayar) | Sol çubuk |
| Sürüş kolu: ileri / geri | `W` / `↑`, `S` / `↓` (basılı tut: hızlanır; `Shift` ile hassas sürünme) | RT / LT |
| Pedal şeması: gaz / fren | `W` / `↑`, `S` / `↓` | RT / LT |
| Vites (pedal şeması) | `E` → D, `Q` → R, `N` → N | RB → D, LB → R |
| Park et (P) | `P` | Y |
| El freni | `Boşluk` | X |
| Kamera (kuzey sabit / araçla dön) | `C` | — |
| Harita (basılı tut) | `Tab` | B |
| Yörünge çizgileri aç/kapa | `G` | — |
| Yakınlaştır | `+` / `-`, fare tekerleği | — |
| Yeniden başla / duraklat | `R` / `Esc` | Back / Start |

## Nasıl oynanır

Hedef yer mavi kesikli çizgiyle ve içindeki hayalet araçla gösterilir; hayaletin oku aracın burnunun bakması
gereken yönü gösterir. Çizgilerin içinde dur ve **P**'ye al. Değerlendirme: açı sapması, yanal kayma, ileri-geri
konum → **isabet %**. %95 ve üstü **"Milimetrik!"**. Römorklu bölümlerde hedefe römorku sokarsın.

Her bölümde 3 yıldız: **Park et** · **Hasarsız** (hiçbir yere çarpmadan, koni devirmeden) · **Usta** (hamle
hedefi ve %85+ isabet). *Hamle*, yön değişimi sayısıdır: ileri git = 1, sonra geri = 2… Hasar %100 olursa ya da
bir yayaya çarparsan bölüm biter.

## Modlar

- **Kariyer:** 6 bölge × 6 bölüm. Bölgeler yıldızla açılır.
  1. **Mahalle** (gündüz): dik, geri geri, açılı park, garaj, market önü.
  2. **Şehir** (trafik ve yayalar): paralel park, yokuş, otobüs durağı, kavşak.
  3. **Katlı Otopark** (kapalı): kolonlar, rampa başı, spiral, kalabalık AVM.
  4. **Gece:** farlar ve sokak lambaları; benzinlik, otel girişi, çıkmaz sokak.
  5. **Yağmur:** kaygan zemin, su birikintileri, minibüs ve okul servisi, fırtına.
  6. **Liman:** feribota araç yükleme, römorkla manevra, rampaya yanaşma, kamyon şeridi.
- **Vale:** 150 saniyelik vardiya. Müşterilerin araçlarını (rastgele araç ve renk) otoparka park et;
  her araç +20 sn kazandırır, park ettiğin araçlar otoparkta kalır ve yer daralır. Puan isabete, hıza ve hasara göre.
- **Günlük Görev:** her gün (Türkiye saatiyle) herkes için aynı rastgele park görevi; art arda günlerde seri ödülü.
- **Sınav Parkuru:** B (otomobil), D1 (minibüs) ve BE (römorklu araç) sınıfı. Koniye değmeden slalom, park görevleri ve
  çıkış. Koniye ya da bir yere çarpmak sınavı bitirir; kaldırıma değmek ve düşük isabet hata sayılır.
- **Antrenman Alanı:** serbest sürüş; slalom, koni garajı, paralel kutu.
- **Garaj:** 6 araç (Kumru, Serçe, Martı, Baykuş 4×4, Pelikan minibüs, Kervan kamyonet + römork) ve 16 boya.
  Araçlar yıldız ve jetonla, boyalar jetonla açılır. Jeton bölüm, vale, günlük görev ve sınavlardan gelir.
- **Başarımlar:** 20 başarım.

## Kayıt

İlerleme bu tarayıcının yerel deposunda `milimetrik.v1` anahtarıyla tutulur (alan adı ortak; anahtarı değiştirme).
Kayıt biçiminin sürümü kaydın içindedir (`v: 2`); konsept sürümün kayıtları açılışta yeni biçime taşınır.

## Dosyalar

```
index.html, style.css          Giriş sayfası ve stil
manifest.webmanifest, icon*    Ana ekrana eklenebilir uygulama bilgisi
cover.webp                     Seçim ekranı kapağı (16:9)
src/config.js                  Araçlar, boyalar, zeminler, ortamlar, ekonomi, puan ayarları
src/sim/physics.js             Kendi 2B katı cisim fiziği (SAT çarpışma, sıralı darbe çözücü, mafsal, ışın)
src/sim/vehicle.js             Araç dinamiği: Ackermann, lastik kısıtları, tork konvertörü, fren, ağırlık aktarımı, römork
src/sim/assist.js              Sürüş kolu hız denetleyicisi ve Auto Hold
src/sim/agents.js              Trafik ve yayalar
src/sim/game.js                Bölüm çalışma zamanı: hasar, hamle, park değerlendirmesi, sensörler, yörünge çizgileri, sınav
src/sim/planner.js             Park yolu planlayıcı (Hybrid A*, römork dahil): bölüm doğrulaması için
src/levels/                    Bölüm kurucu (build.js), ortak yerleşimler, 6 bölge, sınavlar, antrenman ve vale alanı
src/modes/                     Günlük görev üreticisi, vale oturumu
src/render/                    Canvas 2D çizim, prosedürel dokular ve araç çizimleri, gece/yağmur efektleri, kamera
src/ui/                        Ekranlar ve HUD (ui.js), dokunmatik kontroller (controls.js)
src/input.js, audio.js, save.js, achievements.js, main.js
tools/bot.mjs                  Node testleri; tools/solutions.json planlayıcının bulduğu çözümler
tools/drive.mjs                Çözümü sürüş koluyla gerçek fizikte süren yardımcı
tools/smoke.mjs                Tarayıcı duman testi (Playwright)
```

`src/sim/` DOM kullanmaz; Node'da çalışır. Fizik 240 Hz sabit adımla ilerler ve deterministiktir.

## Testler

```bash
node games/milimetrik-park/tools/bot.mjs           # sürüş ölçümleri, bölüm denetimi, çözümlerin gerçek fizikle sürülmesi, günlük görev, determinizm
node games/milimetrik-park/tools/bot.mjs --plan    # çözümleri planlayıcıyla yeniden üret (yavaş; --only ile bölüm seç)
node games/milimetrik-park/tools/bot.mjs --plan --only kavsak,feribot,sinav
node games/milimetrik-park/tools/smoke.mjs [--shots klasör] [--mobile]   # tarayıcıda menüler, sürüş, park, kayıt, tüm modlar
```

Bölüm geometrisini değiştirdikten sonra o bölüm için `--plan` çalıştır: planlayıcı en az hamleli çarpışmasız
manevrayı arar, bot bunu sürüş koluyla gerçek fizikte sürer (dur → direksiyonu çevir → sürün → dur); sürüşte
isabet düşerse daha sıkı hedefle yeniden planlar. Böylece her bölümün hasarsız bitebildiği ve "Usta" yıldızının
hamle hedefinin ulaşılabilir olduğu doğrulanır. `npm test` kayıtlı çözümleri sürer. Çözümler `solutions.json`'a
her bölümden sonra yazılır; paralel süreçlerle (`--only`) çalıştırılabilir.

Adres parametreleri: `?debug` çarpışma şekillerini, temas noktalarını ve lastik kuvvetlerini çizer;
`?test` test kancasını (`window.__mp`) açar; `?unlock` her şeyi açık gösterir (kayda yazmaz).
