# Paldır Küldür 💥

> [Oyun Salonu](../../README.md)'nun oyunlarından biri. Ana menünün sol üstündeki **‹ Oyunlar** düğmesi oyun
> seçim ekranına döner.

Tarayıcıda oynanan, mobil uyumlu bir **fizik yıkım** oyunu: sapanı geri çek, bırak; gülleyle kuleleri yık,
jöleleri patlat.

## İçerik

- **Macera:** 4 dünya × 10 bölüm = 40 bölüm (Yeşil Vadi, Kızgın Çöl, Buz Diyarı, Ay Üssü — Ay'da yerçekimi düşük).
  Her bölümden en fazla 3 yıldız (toplam 120).
- **Sonsuz Kuşatma:** kaç dalga dayanabildiğini ölçen sonsuz mod.
- **Oyun Alanı:** serbest fizik laboratuvarı.
- **Altı gülle:** Gülle, Üçlü (dokununca üçe bölünür), Roket (dokununca ileri atılır), Bomba, Dev (dokununca
  büyüyüp ağırlaşır), Kara Delik (çevresindekileri içine çekip savurur).
- 26 başarım, ayarlar (ses efektleri, müzik, ekran sarsıntısı, titreşim, nişan çizgisi, efekt kalitesi) ve dikey
  ekranda oyunu yan çeviren **yatay mod**.

## Nasıl oynanır

- **Nişan:** ekranın herhangi bir yerinden geri çek, bırak.
- **Yetenek:** gülle uçarken ekrana dokun.
- **Kamera:** iki parmakla kaydır ve yakınlaştır, çift dokunuşla sıfırla.
- **Klavye:** Boşluk yetenek, R yeniden başlat, Esc duraklat.

İlerleme bu tarayıcının yerel deposunda `paldirkuldur.v1` anahtarıyla tutulur.

## Dosyalar

```
index.html             Oyunun tamamı: kod, planck.js fizik motoru ve yazı tipleri tek dosyaya gömülü
icon-192.png, icon-512.png  Ana ekran simgeleri (oyunun kendi "kral jöle" çiziminden üretildi)
manifest.webmanifest   Ana ekrana eklenebilir uygulama bilgisi
cover.webp             Oyun seçim ekranındaki kapak görseli (oyunun demo sahnesinden)
```

## Oyun Salonu entegrasyonu

`index.html` başka bir oturumda üretilmiş tek dosyalık bir derlemedir; oyun koduna dokunulmadı. Oyun
Salonu'na bağlamak için dosyaya yalnızca iki işaretli blok eklendi:

1. `<head>` içinde `<title>` satırının hemen altına, `<!-- ===== Oyun Salonu: açıklama, simgeler, manifest … -->`
   ile başlayan satırlar (açıklama, simge ve manifest bağlantıları).
2. `</body>` etiketinin hemen önüne, `<!-- ===== Oyun Salonu entegrasyonu … -->` ile başlayıp
   `<!-- ===== /Oyun Salonu entegrasyonu ===== -->` ile biten blok. Bu blok, oyun ana menüyü oluşturduğunda
   (`#menu`) sol üst köşeye `../../` adresine giden **Oyunlar** düğmesini ekler ve `../../hub/back.js`
   yardımcısını yükler.

Oyunun yeni bir sürümünü aldığında `index.html`'yi değiştir, ardından bu iki bloğu eski dosyadan kopyalayıp
aynı yerlere yeniden ekle ve `npm run check` çalıştır. Kayıt anahtarı (`paldirkuldur.v1`) değişmediği sürece
ilerleme korunur.

## Üçüncü taraf bileşenler

- planck.js v1.5.1 (MIT) — lisans metni dosyanın içinde.
- DynaPuff ve Nunito yazı tipleri (SIL Open Font License) — telif ve lisans bilgisi yazı tiplerinin meta verisinde.
