# Oyun Salonu 🎮

Mobilde ve masaüstünde tarayıcıdan oynanan oyunlar. Ana ekranda bir oyun seçip hemen oynarsın; kurulum,
hesap ya da derleme adımı yok. Site GitHub Pages ile yayınlanacak şekilde düzenlendi.

## Oyunlar

| Oyun | Ne? | Klasör |
|---|---|---|
| **Uçan Roadster** | 2.5D fizik: dönen rampadan fırla, havada takla at, iticilerle platforma kon. 16 bölüm, sonsuz mod. | [`games/ucan-roadster/`](games/ucan-roadster/) |
| **Paldır Küldür** | Fizik yıkım: sapanla gülle fırlat, kuleleri yık, jöleleri patlat. 40 bölüm, Sonsuz Kuşatma, Oyun Alanı. | [`games/paldir-kuldur/`](games/paldir-kuldur/) |

Her oyunun ayrıntıları kendi klasöründeki `README.md` dosyasında.

## GitHub Pages ile yayınlama

1. GitHub'da depo sayfası → **Settings → Pages**.
2. **Build and deployment → Source:** `Deploy from a branch`.
3. **Branch:** yayınlamak istediğin dalı ve `/ (root)` klasörünü seç → **Save**.
4. Birkaç dakika sonra site `https://<kullanıcı-adı>.github.io/<depo-adı>/` adresinde açılır
   (bu depo için: `https://mahmudzgr.github.io/flying-car-game/`).

Derleme adımı yoktur; dosyalar olduğu gibi sunulur. Kökteki boş `.nojekyll` dosyası GitHub Pages'in
Jekyll işlemesini kapatır. Seçtiğin dala her push'ta site kendiliğinden güncellenir.

## Yerelde çalıştırma

Ana ekran ve Uçan Roadster ES modülleri kullandığı için dosyayı çift tıklayarak açmak yerine bir HTTP sunucusu gerekir:

```bash
npm start                 # = python3 -m http.server 8080
# tarayıcıda: http://localhost:8080
```

Telefonda denemek için bilgisayarla aynı Wi-Fi'de `http://<bilgisayarın-ip-adresi>:8080` adresini aç.

## Proje yapısı

```
index.html                Oyun seçim ekranı (sitenin ana sayfası)
games.js                  Oyun listesi: ana ekrandaki kartlar buradan oluşturulur
manifest.webmanifest      Ana ekrana eklenebilir uygulama bilgisi (Oyun Salonu)
hub/                      Seçim ekranının stili, betiği ve simgeleri
hub/back.js               Oyunlardan seçim ekranına dönüş yardımcısı (tüm oyunlar kullanır)
games/<id>/               Her oyun kendi klasöründe, kendi başına çalışır
  index.html              Oyunun giriş sayfası
  cover.webp              Seçim ekranındaki kapak görseli (16:9)
tools/check-games.mjs     Oyun listesi ve klasör denetimi (npm run check)
tools/capture-cover.mjs   Oyunun ekran görüntüsünden kapak üretme yardımcısı
```

## Yeni oyun ekleme

1. **Klasör:** `games/<id>/` oluştur. `id` küçük harf, rakam ve tireden oluşsun (ör. `uzay-macerasi`); adres
   `…/games/uzay-macerasi/` olur. Oyunun bütün dosyaları bu klasörde dursun. Her şeyi içine gömülü tek bir
   HTML dosyası da olur (Paldır Küldür böyle).
2. **Giriş dosyası:** `games/<id>/index.html`.
3. **Göreli yollar:** dosyalara `src/main.js`, `./img/a.png` gibi göreli yollarla eriş. `/` ile başlayan yollar
   GitHub Pages'in alt dizininde (`/flying-car-game/…`) bozulur.
4. **Geri dönüş:** oyunun ana menüsüne seçim ekranına dönen bir bağlantı koy:
   ```html
   <a href="../../" data-hub-back>Oyunlar</a>
   <script src="../../hub/back.js" defer></script>
   ```
5. **Kayıt anahtarı:** Bütün oyunlar aynı alan adında (`mahmudzgr.github.io`) çalıştığı için `localStorage`
   ortaktır. Her oyun kendine özgü bir önek kullansın (ör. `uzay-macerasi.save.v1`). Kullanımdaki anahtarlar:
   `roadster-flip-save-v1…` (Uçan Roadster), `paldirkuldur.v1` (Paldır Küldür).
6. **Kapak:** `games/<id>/cover.webp`, 16:9 (önerilen 1280×720). Elle koyabilir ya da oyunun ekran
   görüntüsünden üretebilirsin:
   ```bash
   node tools/capture-cover.mjs uzay-macerasi --wait 4000 --hide "#menu"   # 3D oyunlarda: --webgl
   ```
7. **Listeye ekle:** `games.js` içindeki `GAMES` dizisine bir kayıt ekle (alanlar dosyanın başında açıklanıyor).
8. **Denetle:** `npm run check` hata vermiyorsa commit'le ve push'la.

İsteğe bağlı: oyunun kendi ana ekran simgesi için klasöre `manifest.webmanifest` koy
(`"start_url": "./"`, `"scope": "../../"`; örnekler mevcut oyunlarda).

## İlerleme ve kayıtlar

- Her oyunun ilerlemesi tarayıcının yerel deposunda (`localStorage`) tutulur ve alan adına bağlıdır; oyunun
  klasörü değişse bile aynı sitede kaldıkça kayıt korunur. Uçan Roadster'ın kök dizinden
  `games/ucan-roadster/` klasörüne taşınması bu yüzden kayıtları etkilemez.
- Tarayıcı verilerini silmek ya da başka bir tarayıcı/cihaz kullanmak ilerlemeyi göstermez. Uçan Roadster'da
  **Ayarlar → İlerleme Yedeği** ile yedek kodu alınabilir.

## Testler

```bash
npm run check     # oyun listesi ve klasör denetimi
npm test          # denetim + Uçan Roadster otomatik pilot testleri (~40 sn)
```

## Üçüncü taraf bileşenler

- **Uçan Roadster:** three.js r170, MIT lisansı (`games/ucan-roadster/vendor/`, lisans metni yanında).
- **Paldır Küldür:** planck.js v1.5.1 fizik motoru (MIT; lisans metni dosyanın içinde) ile DynaPuff ve Nunito
  yazı tipleri (SIL Open Font License; telif ve lisans bilgisi yazı tiplerinin kendi meta verisinde) oyun
  dosyasının içine gömülüdür.
