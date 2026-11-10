# Sarsıntı Nakliyat 🚚

> [Oyun Salonu](../../README.md)'nun oyunlarından biri. Ana menünün sol üstündeki **‹ Oyunlar** bağlantısı oyun
> seçim ekranına döner.

Yan görünüşlü, gerçek 2D fizikli bir **nakliye sürüşü**: yaylı süspansiyonlu aracınla bozuk yollarda, çamurda,
buzda ve sallanan köprülerde kargonu devirmeden teslim et. Kasalar, karpuzlar, yumurta kolisi, süt bidonları ve
piyano gerçek fizik cisimleridir; frende öne kayar, tümsekte sıçrar. Sürücü **Fındık** ve küçük aile şirketi
"Sarsıntı Nakliyat" sana eşlik eder.

## Nasıl oynanır

İki düğmeyle oynanır; derinlik fizikten gelir. Havada kalma, takla ve tek teker kombo çarpanı kazandırır; kargo
düşerse ya da kafa yere vurursa bölüm başarısız olur ve anında yeniden denenir.

| Eylem | Dokunmatik | Klavye |
|---|---|---|
| Gaz | Sağ alt **GAZ** | `→` / `D` / `Boşluk` |
| Fren / geri | Sol alt **FREN** (durunca basılı tutmak geri vites) | `←` / `A` |
| Yeniden dene | duraklatma / sonuç ekranı | `R` |
| Duraklat | Sağ üst **II** | `Esc` / `P` |
| Müzik/ses aç-kapa | Ayarlar | `M` |
| Menülerde | dokun | `↑↓←→` + `Enter`, `Esc` geri |

Havada gaz geri takla, fren ön takla torku verir.

## Bölgeler ve araçlar

- **Elma Vadisi** (1-1…1-4), **Kızıl Kanyon** (2-1…2-4), **Sisli Bataklık** (3-1…3-4), **Zirve Köyü** (4-1…4-4):
  toplam 16 bölüm, her bölümde 3 yıldız. Bölümler sırayla, bölgeler yıldızla açılır.
- **Tosun** (pikap, baştan açık), **Zıpır** (bagi), **Paşa** (römorklu traktör), **Koca** (kamyon): yıldız ve
  kuruşla açılır, garajda yükseltilir.

Ayrıntılı tasarım: [`docs/TASARIM.md`](docs/TASARIM.md).

## Kayıt

İlerleme bu tarayıcının yerel deposunda `sarsinti.v1` anahtarıyla tutulur (alan adı ortak; anahtarı değiştirme).

## Dosyalar

```
index.html, style.css      Giriş sayfası ve genel stil
manifest.webmanifest       Ana ekrana eklenebilir uygulama bilgisi; icon.svg, icon-192/512.png
cover.webp                 Seçim ekranı kapağı (16:9)
src/sim/                   Fizik simülasyonu (DOM'suz; Node'da da çalışır)
src/art/, src/render/      Çizim (canvas 2D)      src/audio/   WebAudio ses ve müzik
src/ui/                    Menüler, HUD, garaj    src/data/    Bölüm ve sonsuz mod verisi
src/main.js, input.js, save.js, config.js, events.js
vendor/                    planck.js 1.4.2 ve lisansı
tools/bot.mjs              Otomatik pilot testi
docs/                      TASARIM.md, MIMARI.md (sözleşmeler, dosya sahipliği), raporlar
```

Mimari ve sözleşmeler için bkz. [`docs/MIMARI.md`](docs/MIMARI.md).

## Geliştirici sayfaları

Yerel sunucuyla (`npm start`) açılır:

- `dev/art.html` — araç, kargo ve nesne çizimleri
- `dev/audio.html` — ses ve müzik denemeleri
- `dev/ui.html` — arayüz ekranları
- `index.html?debug` — fizik çizgileri ve `window.__sarsinti` test kancası

## Testler

```bash
node games/sarsinti-nakliyat/tools/bot.mjs --strict                 # kampanya bölümlerini otomatik pilotla sürer; bitmezse çıkış kodu 1
node games/sarsinti-nakliyat/tools/bot.mjs --matrix --determinism   # tüm araçlar + aynı koşunun iki kez aynı sonuç vermesi
```

`npm test` içinde `--strict` çalışır.

## Üçüncü taraf

- **planck.js 1.4.2** 2D fizik motoru — MIT lisansı (`vendor/planck.mjs`, lisans metni `vendor/planck.LICENSE`).
