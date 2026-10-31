# Uçan Roadster 🚗🔥

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

Klavye: `←/→` veya `A/D`, itici `Boşluk/↑/W`, ayrıca `Q/E` her zaman takla iticisi. `R` yeniden başlat, `Esc` duraklat.

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
- **10 bölüm, 8 farklı ortam:** çayır, kanyon, gökdelen çatısı, rüzgârlı vadi, mancınık rampa,
  Ay (g = 1,62 m/s², atmosfer yok), Mars (g = 3,71 m/s², çok ince atmosfer), dalgalarda sallanan/kayan deniz
  platformu ve lav kanyonlu büyük final.
- **Görevler:** her bölümde 3 yıldızlık görev (yumuşak iniş, belirli takla türü/sayısı, isabet, yakıt tasarrufu,
  yıldız toplama, havada kalma, puan…). Bir sonraki bölüm, öncekinden en az 1 yıldızla açılır.
- **22 başarım** (Kuş Tüyü, On İkiden, Saf Fizik, Mancınık Ustası, Kasırga…), istatistikler, yerel kayıt.
- **Oynanışı geliştiren ekler:** yörünge asistanı (tahmini iniş noktası yeşil/kırmızı), hedef hız bandı,
  iniş uyarıları ("İTİCİYİ ATEŞLE!", "BURNU DÜZELT!"), en iyi koşunun **hayalet** tekrarı, kusursuz inişte ağır çekim,
  kamera sarsıntısı, titreşim (destekleyen telefonlarda), tamamen kodla üretilmiş sesler.
- Otomatik grafik kalitesi (FPS düşerse kendini düşürür), PWA manifesti (ana ekrana eklenebilir), dış bağımlılık yok
  (Three.js `vendor/` içinde).

## Çalıştırma

ES modülleri kullandığı için bir HTTP sunucusu gerekir (dosyayı doğrudan açmak çalışmaz):

```bash
python3 -m http.server 8080
# tarayıcıda: http://localhost:8080
```

Telefonda denemek için bilgisayarla aynı Wi-Fi'de `http://<bilgisayarın-ip-adresi>:8080` adresini aç.

### GitHub Pages ile yayınlama

Depo ayarlarında **Settings → Pages → Build and deployment → Source: Deploy from a branch**, dal olarak bu dalı
(veya birleştirildikten sonra `main`) ve `/ (root)` klasörünü seç. Birkaç dakika sonra oyun
`https://<kullanıcı-adı>.github.io/flying-car-game/` adresinde açılır. Derleme adımı yoktur.

## Otomatik pilot testi

Fizik ve kurallar render katmanından bağımsızdır; `tools/bot.mjs` her bölümü gerçek fizikle yüzlerce kez
(farklı hız, rampa zamanlaması ve takla sayısıyla) oynayıp bölümlerin çözülebilir olduğunu doğrular:

```bash
node tools/bot.mjs        # tüm bölümler
node tools/bot.mjs 4      # sadece 4. bölüm
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
src/audio.js              WebAudio ile sentezlenen sesler
src/progress.js           Kayıt, yıldızlar, başarımlar
src/main.js               Durum makinesi, giriş, HUD
tools/bot.mjs             Otomatik pilot / denge testi
vendor/three.module.min.js  Three.js r170 (MIT)
```

> Not: Oyundaki araç gerçek bir ürünün resmi modeli değildir; prosedürel olarak üretilmiş genel bir elektrikli
> roadster'dır. Fizik değerleri oyun için seçilmiş makul değerlerdir, gerçek araç verisi iddiası taşımaz.
