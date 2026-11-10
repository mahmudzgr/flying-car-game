# Sarsıntı Nakliyat — QA Raporu

Test: Playwright (Chromium, başsız, yazılımsal GPU), başsız sim (Node), 7 cihaz boyutu. Kod değiştirilmedi; tek yeni dosya `tools/smoke.mjs`.
Kanıtlar ve betikler: `/tmp/claude-0/-home-user-flying-car-game/705351c4-7d50-5223-91d5-4aeeba58981b/scratchpad/qa/` (`t2…t9.mjs`, `cons.mjs`, `perf.mjs`, `touch.mjs`, `small.mjs`, `dev-*.png`).
Önceki raporlardaki (eğlence/fizik) oynanış maddeleri tekrar edilmedi.

## 1. Özet — yayına hazır mı?

**Evet, 2 Yüksek hata düzeltilirse (ikisi de küçük düzeltme).** Engelleyici yok: 16 bölüm + Uzun Yol (4 araç) konsol hatasız açılıyor, dış istek/404 yok, kayıt dayanıklı, diğer oyunların anahtarlarına dokunulmuyor, dokunmatik çoklu basış çalışıyor, otomatik testler yeşil. Ama sabah ilk kez oynayacak kullanıcı (1) başta geri vitese basarsa haksız yere "Uçuruma uçtun!" alıyor, (2) 1-4 / 2-4 / 3-4 sonrası "Sonraki" bölge yıldız kilidini deliyor.

Otomatik: `npm run check` ✓, `npm test` ✓ (exit 0), `bot --matrix --determinism --strict` exit 0 (60/68 koşu; determinizm sapması 0; Tosun kampanya başarısız 0), `--endless` tohum 1,2,7,42: hepsi 300 sn botTimeout, sapma 0. `tools/smoke.mjs` temiz (16 bölüm + 4 araçla Uzun Yol, 0 konsol hatası, 0 dış istek, 0 HTTP ≥400).

## 2. Hata listesi

**1. [Yüksek] sim/config — Başlangıçta geri vitese basılı tutmak "Uçuruma uçtun!" (fell) ile bitiriyor.**
Adımlar: herhangi bir bölüm, Tosun/Zıpır, FREN/← basılı tut (geri vites), araç başlangıç duvarına dayanır → ~3,2 sn'de bölüm başarısız. (Paşa/Koca duvara dayanınca `stuck` — doğru sonuç.)
Beklenen: duvara dayanınca 6 sn sonra `stuck`. Gerçek: `fell`, "Uçurum seni çağırdı…". Kanıt: `t4.mjs` (3 bölüm × Tosun/Zıpır hepsi t≈3,2 `fell`), `t5.mjs` (x=-0,18, y=0,65, killY -14, olay `crash:fell`).
Kök neden: `src/sim/sim.js:525` `S.pitT = p.y < topNear(terr, p.x, 3) - 2.5 …`; `topNear` 3 m yarıçapta başlangıç duvarının tepesini (y=8) görüyor → duvara yakın zemin "çukur" sayılıyor. Öneri: `topNear` aramasında yalnız `x ≥ startX` / bitiş duvarı öncesini kullan ya da çukur testini yalnız `gap` parçaları için yap.

**2. [Yüksek] main.js (+ui) — "Sonraki" bölge yıldız kilidini atlatıyor.**
Adımlar: 1-4'ü ★1 ile bitir (toplam yıldız <5) → sonuç ekranında "Sonraki" → 2-1 açılıyor (gerekli 5★). Aynı şekilde 2-4→3-1 (14★), 3-4→4-1 (24★).
Gerçek kanıt: `nl.mjs`: boş kayıtta `startLevel('1-4'); nextLevel()` → 2-1, `state=playing`. Kök: `src/main.js` `flow.nextLevel()` kilit denetlemiyor; `src/ui/overlays.js:58` `nextExists` yalnız dizideki sonraki bölüme bakıyor. Öneri: `levelLock(save.data, levels, next).locked` ise "Sonraki" düğmesini gizle (ya da "Bölümler"e yönlendir; ≥N★ gerekli notu).

**3. [Orta] ui-save ↔ sim — Zıpır için UI ile sim kargo sayısı tutarsız (16 bölüm × 4 araçtan 10 tutarsız, hepsi Zıpır).**
`progress.js` `loadedCount` = min(kapasite 3, toplam); sim yığın yüksekliği sınırı yüzünden daha az yerleştiriyor (1-1: 2, 4-3: 1; console.warn "Kasa dolu: crate yerleştirilmedi"). Sonuçlar (`cons.mjs`): 1-1,1-4,2-3,3-1,3-2,3-3,3-4,4-1,4-2,4-3 Zıpır'da "3 parça sığar" yazıp 1–2 yüklüyor; 1-4'te minDelivered sim=1, UI=0; 3-4 sim=1/UI=2; 4-2 sim=1/UI=2; 3-3 ★ "4 teslim" sim=2/UI=3. Diğer 3 araç (48/48) birebir uyumlu. Ayrıca Zıpır seçiliyken menü arka planı konsola `[sim]` uyarısı basıyor. Öneri: UI'ya sim'in yerleştirdiği sayıyı ver (sim.static'e `loaded` ekleyip `scaledNeed` onu kullansın) ya da Zıpır için yığın sınırını gevşet.

**4. [Orta] ui-save — Küçük ekranlarda birincil düğmeler kıvrımın altında / kartlar kırpık.**
568×320, 600×300, 640×360 (740×360, 667×375 ve üstü temiz): bölüm ön ekranında araç seçici ve **Başla** (y=409–463 > 320), sonuç ekranında **Sonraki/Tekrar** (y=391–435), Ayarlar ve Uzun Yol ön ekranında alt kısım; paneller `overflow:auto` olduğundan kaydırarak ulaşılıyor ama ilk bakışta görünmüyor. Bölüm kartlarında "Dinamik platform", "Önce 3-1 Çamur Banyosu" kırpılıyor, 4. kart sağdan taşıyor. Kanıt: `dev-small568x320-{brief,win,settings,endless-brief,levels}.png`, `small.mjs`. Öneri: <700 px genişlik/<380 px yükseklikte kompakt düzen (araç seçici yan yana, eylem düğmeleri paneli sabit altbar).

**5. [Orta] levels/sim — Paşa'yla sabit-hız botu 4 bölümü bitiremiyor** (matrix): 1-4 `fell`, 2-4 `fell`, 4-2 `chased`, 4-4 `cargoShort` (hedef hız 12–14 m/s). Paşa'yı seçen oyuncu için bu bölümler zor/haksız olabilir; insan oyuncuyla doğrulanmadı. (Fizik/eğlence raporlarıyla örtüşür.)

**6. [Düşük] ui — `stuck` metni "Beş saniyedir yerinde sayıyorsun" ama `RULES.stuckTime = 6`** (`texts.js` FAIL.stuck.lines[0], `config.js:213`). Metni "Birkaç saniyedir" yap.

**7. [Düşük] levels — 1-4 ipucu "hız şart (≥10 m/s)"; HUD hızı km/sa gösteriyor.** Birim tutarsız; "≥36 km/sa" yaz.

**8. [Düşük] ui-save — `migrate()` eksik `btnScale` için 1 (Orta) veriyor, `defaults()` 0,85 (Küçük)** (`save.js`). Eski/eksik kayıtlarda düğme boyutu sessizce değişir.

**9. [Düşük] ui-save — `setItem` kota/izin hatasında `save.persistent` true kalıyor** (ölçüm: `persistent:true`, yazılamıyor). Ayarlar'daki "Tarayıcı kaydı kapalı" uyarısı yalnızca `localStorage` erişimi baştan atınca çıkıyor. Oyun çalışıyor, ilerleme sessizce kaybolur. Öneri: `io.set` false dönünce `persistent=false`.

**10. [Düşük] ui-save — Gelecek sürüm kaydı (`v:2`) sessizce v1'e indirgenip üzerine yazılıyor** (yedek `.bak` alınıyor, bilinmeyen alanlar kayboluyor). Kabul edilebilir; not.

**11. [Düşük] main.js/ekonomi — Yolda toplanan kuruş her denemede (başarısız olsa bile) tahsil ediliyor** (1-1: başarısız denemede +40, kazanınca tekrar +40). Kuruş çiftçiliği mümkün; ekonomi kararı olarak gözden geçir (ör. ★/rekor başına ya da yalnız kazanımda).

**12. [Düşük] render-art — Ana menü arka planında sol tarafta büyük koyu dikdörtgen** (başlangıç duvarı, `menu1280.png`); kamera menüde duvarı kadraja alıyor. Kozmetik.

**Doğrulanıp sorun çıkmayanlar:** Hub → kart → oyun → "Oyunlar" (geçmişte geri) ✓; Esc/P duraklat-devam ✓, R yeniden dene ✓, sekme gizlenince otomatik duraklat ✓ (dönünce duraklı kalır, beklenen); başarısızlık ekranları headHit/fell/timeout/cargoShort/stuck gerçek tetiklendi, metinler doğru; kazanma → Sonraki → bölümler → garaj; satın alma (130 kuruş), yetersiz bakiye (düğmeler pasif), araç açma (Zıpır 1300), şartı eksik Paşa ("Şartlar eksik"), sıfırlama iadesi tam (1500 geri); ayarlar kalıcı (yenilemeden sonra aynı), "İlerlemeyi sıfırla" iki dokunuşlu ve yalnız `sarsinti.v1`i siler; `roadster-flip-save-v1`, `roadster-flip-save-v1.extra`, `paldirkuldur.v1` hiçbir senaryoda değişmedi. Kayıt: bozuk JSON → varsayılan + `sarsinti.v1.bak`; dizi/null/eksik/aşırı değerli alanlar temizleniyor; `setItem` atar / `localStorage` getter atar / `getItem` atar → oyun çalışıyor; 20 000 girişli kayıt açılıyor. Dikey ekran: oyun sırasında dikey → "Telefonu yan çevir" + otomatik duraklatma. Dokunmatik (CDP, 740×360): gaz, gaz+fren eşzamanlı, parmak kaydırma (basılı pedal yakalanıyor), bırakınca 0, sekme gizlenince sıfırlama ✓; pedal vuruş alanı 138×88, duraklat 44×44. Metin: km/sa, sn, m birimleri doğru; yazım hatası bulunmadı (madde 6, 7 hariç).

## 3. Performans (CDP CPU 4×, 740×360, yazılımsal render, 30 sn)

| Senaryo | Ort. FPS | Ort. kare | %95 kare | %99 | >50 ms kare | Bellek |
|---|---|---|---|---|---|---|
| 4-4 Tosun (52 gövde) | 15,8 | 63,5 ms | 100 ms | 117 ms | 269/470 | 14 MB |
| 3-4 Tosun (varil yığını) | 18,0 | 55,6 | 83 | 100 | 226/537 | 12 MB |
| 4-4 Paşa | 15,2 | 65,7 | 100 | 117 | 291/454 | 12 MB |
| Uzun Yol Tosun | 19,1 | 52,3 | 83 | 83 | 202/572 | 10 MB |
| Uzun Yol Koca | 18,1 | 55,2 | 83 | 100 | 232/542 | 11 MB |
| 4-4 Tosun, throttle yok (1×) | 59,4 | 16,8 | 16,8 | 16,8 | 0/1781 | 12 MB |

Yorum: 1×'te sabit 60 FPS; 4× yavaşlatmada (≈ 5–6 yıllık düşük seviye telefon) 15–19 FPS — oynanabilir sınırda, uzun kare nedeni sim adımı + canvas çizimi birlikte (kare başına birden çok 1/120 sn adım, `SIM.maxFrameDt` ile tavanlı). Sim 0,1–0,3 ms/adım, yük çoğunlukla çizimde; "Düşük" kalite 4×'te denenmedi. Uzun süreli bellek: aşağıdaki not.

**Uzun Yol, 1× hız, 178 sn (düz sürüş, 825 m, sonunda kaza):** ort. 59,9 FPS, %95 = 16,7 ms, 10 789 karede yalnızca 1 kare >50 ms; JS yığını 11→11→10→13→13→10 MB (30 sn aralıklarla) — sızıntı belirtisi yok. (3 dk koşu bot desteksiz bitti; botla 300 sn koşuların bellek örnekleri `bot.mjs --endless` çıktısında sınırlı: gövde ≤47, düğüm ≤475.)

## 4. Cihaz matrisi (konsol hatası hiçbirinde yok)

| Cihaz | Menü/Bölüm/Ön ekran | HUD | Garaj | Ayarlar | Sonuç (kazan/kaybet) | Not |
|---|---|---|---|---|---|---|
| Masaüstü 1280×720 | ✓ | ✓ | ✓ | ✓ | ✓ | |
| iPhone 13 yatay (750×342) | ✓ | ✓ | ✓ | ✓ | ✓ | boş durum satırı 5 px taşıyor (görünmez) |
| Pixel 7 yatay | ✓ | ✓ | ✓ | ✓ | ✓ | |
| 740×360 | ✓ | ✓ | ✓ | ✓ | ✓ | temiz |
| 667×375 | ✓ | — | — | — | ✓ | düğmeler görünür |
| 640×360 / 600×300 / 568×320 | kırpık, kaydırma gerek | ✓ | garaj kısmen | kaydırma gerek | kaydırma gerek | Hata 4 |
| iPhone 13 / Pixel 7 dikey | "Telefonu yan çevir" uyarısı kaplıyor (arkadaki menü taşması gizli) | oyun duraklıyor | | | | beklenen |
