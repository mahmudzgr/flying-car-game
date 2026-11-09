# Uçan Roadster 🚗🔥

> [Oyun Salonu](../../README.md)'nun oyunlarından biri. Ana menünün sol üstündeki **‹ OYUNLAR** düğmesi oyun
> seçim ekranına döner.

Mobilde (ve masaüstünde) tarayıcıdan oynanan, **2.5D** bir fizik oyunu: görüntü 3D (Three.js), kontroller ve fizik 2D.
Elektrikli roadster ile **dönen rampaya** doğru hızlan, havada **takla** at, ardından **soğuk gaz iticilerini**
kontrol ederek iniş platformuna **güvenli bir şekilde kon**.

## Nasıl oynanır

| Kontrol | Yerde | Havada |
|---|---|---|
| ◀ (sol alt) | Fren / geri | Geri takla (burun yukarı) |
| ▶ (sol alt) | Gaz | Ön takla (burun aşağı) |
| 🔥 İTİCİ (sağ alt) | Zıplama | Ana itici – aracı **kendi tavanı yönünde** iter |

Bir tuşun anlamı **basıldığı anda** belirlenir: rampaya gazla çıkarken ▶'ye basılı tutarsan havada da gaz
olarak kalır (istemeden takla atmazsın). Takla için tuşu bırakıp yeniden bas.

Klavye: `←/→` veya `A/D`, itici `Boşluk/↑/W`, ayrıca `Q/E` her zaman takla iticisi. `R` yeniden başlat, `M` müzik, `Esc` duraklat.

**Saf Fizik (iticisiz iniş):** Düz bir platforma itici kullanmadan inmek fiziksel olarak mümkün değil (düşüş
hızı 7 m/s sınırını aşar). Kayak Atlayışı bölümündeki yamaç ise uçuş yoluna paralel tasarlandı: önemli olan yüzeye
*dik* çarpma hızı olduğu için burnu yamaca paralel tutarak 120 km/sa hızla bile ~3 m/s ile konabilirsin.

**Güvenli iniş kuralları**
- İki teker platforma değmeli, dokunma hızı **7 m/s altında** olmalı (sol paneldeki dikey hız yeşil/sarı iken güvendesin).
- Tavan/cam yere değerse ya da gövde 7,5 m/s üzerinde çarparsa kaza.
- Platformu aşarsan veya kısa kalırsan ıskalamış olursun.

**Puan:** takla (tek atlayıştaki taklalar kombo çarpanıyla katlanır), havada kalma süresi, iniş yumuşaklığı,
hedef merkezine yakınlık, kalan yakıt ve toplanan yıldızlar.

## Özellikler

- **Gerçekçi 2D katı cisim fiziği** (sabit 240 Hz adım): kütle, eylemsizlik momenti, yay-sönümleyicili
  ışın-izlemeli süspansiyon, lastik sürtünmesi (μ·N sınırı), güç sınırlı elektrik motoru, aerodinamik sürükleme
  (½ρC<sub>d</sub>Av²), rüzgâr, gövde çarpışmaları.
- **Dönen rampa:** kavisli, menteşeli rampa sürekli açı değiştirir. Rampa yükselirken üzerindeysen yüzey hızı
  aracı ekstra fırlatır ("mancınık etkisi"). Doğru anı yakalamak oyunun parçası.
- **İticiler:** ana itici + burun/kuyruk yön iticileri, sınırlı yakıt, yakıt kutuları.
- **16 bölüm, 14 farklı ortam:** çayır, kanyon, gökdelen çatısı, rüzgârlı vadi, mancınık rampa,
  Ay (g = 1,62 m/s², atmosfer yok), Mars (g = 3,71 m/s², çok ince atmosfer), dalgalarda sallanan/kayan deniz
  platformu, lav kanyonlu final, **kayak atlama yamacı**, **buzlu göl** (sürtünme ~0,1), **Titan**
  (g = 1,35 m/s², Dünya'dan ~4 kat yoğun atmosfer, metan gölü), **sallanan vinç platformu**, **neon şehirde
  asansör platformu** ve iki yönlü sert rüzgarlı **fırtına** (yağmur, şimşek).
- **Sonsuz mod:** her başarılı inişte yeni, biraz daha zor, rastgele üretilmiş parkur (üretici, hedef hıza
  pistte ulaşılabildiğini ve platforma ulaşan bir hız bandı olduğunu kontrol eder). Tek hata seriyi bitirir.
- **Müzik:** dosyasız, WebAudio ile anlık üretilen müzik. Her ortamın kendi tonu/temposu var; menüde sakin,
  sürüşte bas ve hi-hat, uçuşta tam davul ve melodi devreye girer. Kazada müzik kısılır, inişte zafer cümlesi çalar.
- **Garaj:** yıldız topladıkça açılan 9 boya rengi.
- **Görevler:** her bölümde 3 yıldızlık görev (yumuşak iniş, belirli takla türü/sayısı, isabet, yakıt tasarrufu,
  yıldız toplama, havada kalma, puan…). Bir sonraki bölüm, öncekinden en az 1 yıldızla açılır.
- **31 başarım** (Kuş Tüyü, On İkiden, Saf Fizik, Mancınık Ustası, Kasırga, Uçan Kayakçı, Maratoncu…), istatistikler, yerel kayıt.
- **Oynanışı geliştiren ekler:** yörünge asistanı (tahmini iniş noktası yeşil/kırmızı), hedef hız bandı,
  iniş uyarıları ("İTİCİYİ ATEŞLE!", "BURNU DÜZELT!"), en iyi koşunun **hayalet** tekrarı, kusursuz inişte ağır çekim,
  kamera sarsıntısı, titreşim (destekleyen telefonlarda), tamamen kodla üretilmiş sesler.
- Otomatik grafik kalitesi (FPS düşerse kendini düşürür), PWA manifesti (ana ekrana eklenebilir), dış bağımlılık yok
  (Three.js `vendor/` içinde).

## İlerleme ve kayıt

- İlerleme (yıldızlar, rekorlar, başarımlar, ayarlar) tarayıcının yerel deposunda (`localStorage`) tutulur.
  Güncellemeler aynı kayıt anahtarını kullanır ve eski kayıtları silmez; yeni alanlar (müzik, garaj, sonsuz mod)
  eksikse varsayılanlarla eklenir. Bu, önceki sürümle oynanıp kaydedilmiş gerçek bir kayıtla test edildi.
- Kayıt bozulursa (ör. yarım yazılmış veri) oyun sıfırdan başlamaz: aynı tarayıcıdaki güvenlik kopyasından
  geri yükler, okunamayan veriyi de silmeden ayrı bir anahtarda saklar. Depolama dolarsa önce güvenlik kopyası,
  gerekirse hayalet kayıtları feda edilir; yıldız ve başarımlar korunur.
- **Ayarlar → İlerleme Yedeği:** ilerlemeni kısa bir yedek koduna (`UR1-…`) dönüştürür. Kodu başka bir
  tarayıcıda/cihazda geri yükleyebilirsin; geri yükleme mevcut ilerlemeyi silmez, ikisinin en iyisini birleştirir.

## Ses (iPhone notu)

iPhone/iPad'deki tüm tarayıcılar (Chrome dahil) WebKit kullanır. WebKit'te Web Audio sesi, telefonun yandaki
sessiz anahtarı açıkken kısılır ve ses motoru yalnızca bir dokunuşla başlatılabilir. Oyun bu yüzden ilk dokunuşta
ses motorunu başlatır, iOS'ta sesi "medya oynatma" moduna alır (sessiz modda da duyulur) ve her dokunuşta askıda
kalmış motoru yeniden uyandırır. **Ayarlar → Ses durumu / Ses testi** ile kontrol edilebilir.

## Çalıştırma

ES modülleri kullandığı için bir HTTP sunucusu gerekir (dosyayı doğrudan açmak çalışmaz). Sunucuyu deponun
**kök dizininde** başlat:

```bash
python3 -m http.server 8080
# oyun seçim ekranı: http://localhost:8080
# doğrudan oyun:    http://localhost:8080/games/ucan-roadster/
```

Telefonda denemek için bilgisayarla aynı Wi-Fi'de `http://<bilgisayarın-ip-adresi>:8080` adresini aç.
GitHub Pages ile yayınlama, kök dizindeki [README](../../README.md) dosyasında anlatılıyor;
yayınlandığında oyun `https://mahmudzgr.github.io/flying-car-game/games/ucan-roadster/` adresinde açılır.

## Otomatik pilot testi

Fizik ve kurallar render katmanından bağımsızdır; `tools/bot.mjs` her bölümü gerçek fizikle yüzlerce kez
(farklı hız, rampa zamanlaması ve takla sayısıyla) oynayıp bölümlerin çözülebilir olduğunu doğrular.
Deponun kök dizininden:

```bash
node games/ucan-roadster/tools/bot.mjs           # tüm bölümler (bot hedef hıza ulaşınca rampaya gazsız girer)
node games/ucan-roadster/tools/bot.mjs 11        # sadece 11. bölüm (kayak: bot ana iticiyi hiç kullanmaz)
node games/ucan-roadster/tools/endless-test.mjs  # sonsuz mod üreticisinin bölümlerini dener
```

## Proje yapısı

```
index.html, style.css     Arayüz (menüler, HUD, dokunmatik kontroller)
src/physics.js            2D katı cisim + süspansiyon + itici fiziği (saf JS)
src/levels.js             Bölüm tanımları, geometri üretimi, hedef hız bandı
src/run.js                Oyun kuralları: takla sayımı, iniş değerlendirme, puan
src/scene.js              Three.js 2.5D diorama, kamera, efektler
src/carModel.js           Prosedürel araç modeli
src/effects.js            Parçacık sistemi
src/audio.js              WebAudio ile sentezlenen ses efektleri
src/music.js              Prosedürel müzik (adım sıralayıcı, temaya göre parçalar)
src/progress.js           Kayıt, yıldızlar, başarımlar
src/main.js               Durum makinesi, giriş, HUD
tools/bot.mjs             Otomatik pilot / denge testi
tools/endless-test.mjs    Sonsuz mod üreticisi testi
vendor/three.module.min.js  Three.js r170 (MIT)
cover.webp                Oyun seçim ekranındaki kapak görseli
manifest.webmanifest      Ana ekrana eklenebilir uygulama bilgisi (simgeler: icon.svg, icon-*.png)
```

> Not: Oyundaki araç gerçek bir ürünün resmi modeli değildir; prosedürel olarak üretilmiş genel bir elektrikli
> roadster'dır. Fizik değerleri oyun için seçilmiş makul değerlerdir, gerçek araç verisi iddiası taşımaz.
