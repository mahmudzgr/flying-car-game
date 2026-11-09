# Oyun Salonu — çalışma notları

Bu depo birden fazla tarayıcı oyununu barındırır ve GitHub Pages'te derleme adımı olmadan yayınlanır.
Kullanıcıyla Türkçe konuş; arayüz metinleri Türkçe.

## Yapı

- `index.html` + `hub/` — oyun seçim ekranı. Kartlar `games.js` içindeki `GAMES` dizisinden oluşturulur.
- `games/<id>/` — her oyun kendi klasöründe ve kendi başına çalışır; giriş dosyası `index.html`,
  kapak `cover.webp` (16:9).
- `hub/back.js` — oyunlardan seçim ekranına dönüşü geçmişte geri giderek yapar (bağlantı onsuz da çalışır).
- `tools/check-games.mjs` — liste ve klasör denetimi; `tools/capture-cover.mjs` — Playwright ile kapak çekimi.

## Yeni oyun eklerken kurallar

1. Klasör adı = `id`: küçük harf, rakam, tire. Oyunun bütün dosyaları bu klasörde.
2. Yalnızca göreli yollar. `/` ile başlayan yollar Pages alt dizininde (`/flying-car-game/`) bozulur.
   Dış CDN'e bağımlılık ekleme; kütüphaneleri klasöre koy ya da dosyaya göm.
3. Ana menüye `<a href="../../" data-hub-back>Oyunlar</a>` ve `<script src="../../hub/back.js" defer></script>`.
   Bağlantı yalnızca ana menüde görünsün, oyun sırasında HUD'u kapatmasın.
4. `localStorage` tüm oyunlarda ortak (aynı alan adı): oyuna özgü önek kullan. Mevcut anahtarlar:
   `roadster-flip-save-v1…`, `paldirkuldur.v1`. Var olan anahtarları asla değiştirme; kayıtlar silinir.
5. `games.js`'e kayıt ekle (alanlar dosyanın başında), kapak üret, `npm run check` çalıştır.
6. İsteğe bağlı oyun manifesti: `"start_url": "./"`, `"scope": "../../"`.

## Mevcut oyunlara dair

- **Paldır Küldür** (`games/paldir-kuldur/index.html`) başka bir oturumda üretilmiş tek dosyalık bir derleme
  (fontlar ve planck.js gömülü). Oyun koduna dokunmadan yalnızca `<head>`'e ve `</body>` öncesine işaretli
  "Oyun Salonu" blokları eklendi. Dosya yeni sürümle değiştirilirse bu blokları yeniden ekle
  (ayrıntı: `games/paldir-kuldur/README.md`).
- **Uçan Roadster** (`games/ucan-roadster/`) ES modülleriyle yazılmış kaynak kodu; testleri
  `node games/ucan-roadster/tools/bot.mjs` ve `endless-test.mjs`. Kayıt anahtarını ve kayıt biçimini koru.

## Komutlar

- `npm start` — yerel sunucu (http://localhost:8080)
- `npm run check` — liste/klasör denetimi
- `npm test` — denetim + Uçan Roadster otomatik pilot testleri (~40 sn)
- `npm run cover -- <id> [--wait ms] [--click seçici] [--hide seçici] [--webgl]` — kapak çekimi
