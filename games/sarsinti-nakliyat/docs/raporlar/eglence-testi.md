# Sarsıntı Nakliyat — Oynanış ve Oyun Hissi Testi

Test: Playwright (740×360 dokunmatik, 1280×720) + başsız sim (`createSim`, 4 strateji × 4 araç × Bölge 1–2; Bölge 3–4'e kısa bot koşusu). Kod değiştirilmedi. Ses dinlenemedi (başsız tarayıcı), ses hakkında yargı yok. Tüm tarayıcı koşularında konsol hatası/uyarısı: yok.
Ekran görüntüleri: `/tmp/claude-0/-home-user-flying-car-game/705351c4-7d50-5223-91d5-4aeeba58981b/scratchpad/eglence/`. Ölçüm betikleri: aynı klasörün bir üstü (`matrix.mjs`, `sweep.mjs`, `idle.mjs`, `launch.mjs`, `veh.mjs`, `air.mjs`, `eco.mjs`).

## 1. Özet

| | Puan |
|---|---|
| Eğlence | **6,5 / 10** |
| Gerçekçilik hissi | **7 / 10** |

Görsel kimlik, yaylı süspansiyon, kargonun gerçek cisim olması ve araç çeşitliliği (özellikle Koca ve Paşa) güçlü; sonuç ekranı ve ipuçları temiz. Ama oyun bugün "gazı kök, bitir" ile kolay bölümlerde ★3 veriyor (1-1: sürekli gazla 23 sn ★3; 1-1/1-3'te 5–22 m/s her hızda başarı), kargo frende neredeyse hiç kaymıyor, havada takla fiilen yapılamıyor ve bazı bölümlerde oyuncunun hatası olmayan haksız kayıplar var (Paşa bekleyince kargo "düştü" sayılıyor, 1-4'te arka kasa ilk 3 sn'de kaçıyor). Ekonomi 8 bölümde (~4200 kuruş) tüm Tosun yükseltmelerini (3180) ve Zıpır'ı (1100) bitirecek kadar bol: motivasyon eğrisi düz.

## 2. Önceliklendirilmiş iyileştirme listesi

**1. [P0] Çekirdek — Paşa'da durunca kargo "düştü" sayılıyor.**
Sorun: `sim.js:429-430` kargonun "dinlenme mesafesini" (`CARGO_LOSS.restDist=4`) şasi merkezinden ölçüyor; Paşa'nın römorkundaki kargo şasiden ~4,8 m uzakta. Araç 2 sn kıpırdamazsa (bölüm başında ipucu okurken, yokuşta bekleyince) römorkun üstündeki kargo `fell` ile kaybediliyor.
Kanıt: `idle.mjs`: Paşa, tüm 8 bölümde t=2,0 sn'de 2–4 kargo kaybediyor (1-1: 3→1). Tarayıcıda doğrulandı: `eglence/c-pasaidle-03.png` (HUD'da 2 kasa üstü çizili, römork üzerinde duran kasalar hâlâ görünüyor).
Öneri: Uzaklık ölçümünde Paşa için römork gövdesi konumunu kullan (en yakın gövdeye mesafe) ya da `restDist` 4→7; `behindDist` (8) römork dahil kontrol edilsin.

**2. [P0] Çekirdek/Bölüm — 1-4 ve 2-4'te arka kasa ilk saniyelerde kaçıyor.**
Sorun: 2 kasa + 4 balya Tosun'a piramit gibi yığılıyor; en üstteki/arkadaki kasa kasa kenarlığından (rail 0,46) aşıyor.
Kanıt: `launch.mjs`: 1-4'te gaz görev oranı %100/%50/%30 hepsinde kasa 2,1/2,9/3,4 sn'de `left` ile kayboluyor (yani nazik sürüş de kurtarmıyor); 2-4 tam gazda 2,9 sn'de. `matrix.mjs`: 1-4'te her strateji ≤4/6 teslim, ★ hep 1. `dbg14` çıktısı: kasa yığının +2,4 m üstünde duruyor.
Öneri: Yığın yüksekliğini sınırla (4+ yuvarlak + kutu karışımında ikinci sıra yerine arkaya yay), Tosun `bay.rail` 0,46→0,75 ya da 1-4 yükünü 2 kasa+3 balya yap; 2-4'te 1 yumurta+5 kasa yerine 1+4.

**3. [P0] Bölüm/Çekirdek — 1-2 ilk çukuru (2,8 m, x≈141) yavaş sürüşü cezalandırıyor ve sıkışma ile bitiriyor.**
Sorun: Bölüm "kolay" (difficulty 1,5) ama <10 m/s ile gelen araç ön tekeri çukura düşürüp karşı duvara 8,4 m/s ile çarpıyor; 5 karpuzun hepsi `broke`, araç çukurda kalıyor ve 5 sn sonra `stuck` ile başarısız oluyor.
Kanıt: `sweep.mjs` (sabit hedef hız): 1-2'de 5/7/9 m/s → `stuck@141/141/246`, ≥11 m/s geçiyor. `dbg12.mjs`: bodyHit 8,4 m/s → 5 karpuz kırıldı.
Öneri: Çukur 2,8→1,8 m ve derinlik 5→1,2 (sürerek çıkılabilir), rampa `dy` 0,5→0,9; ya da bölüm 1-2'den çukurları kaldırıp 1-4'e bırak. İlk çukurdan önce ipucu: "Hızlan!".

**4. [P0] Çekirdek — Havada takla pratikte yapılamıyor; ★'lar buna bağlı.**
Sorun: Tosun'da havada gazla geri takla ≈2,8 rad/s² ivmelenir; 1-4'ün en büyük atlayışı ~1,1–1,3 sn havada → en çok ~160°. Ön takla (fren) daha güçlü (−3,7 rad/s @1 sn) ama yine 360° için ≥1,8 sn lazım. Geri takla gaz ile ≥2,4 sn.
Kanıt: `flips.mjs`/`flips3.mjs`/`air.mjs`: tüm araç/stratejilerde `flip` olayı = 0 (1-4 ve 2-4). 1-4 ★2 ("Bir takla at") ve ★3 ("2 takla"), 2-4 ★3 ("Bir takla at") bu yüzden erişilemez görünüyor; ipucu "takla atmak ister misin?" yanıltıcı. (Not: insan oyuncunun rampada ön yük binmesiyle daha iyi yapabileceği doğrulanmadı.)
Öneri: Tosun `airTorque` 5500→9000, `airMaxW` 7→9,5 (Zıpır 3200→5500, 9→11); gaz/fren hava torku asimetrisi eşitlensin; ya da `inertia` 1350→1000. Büyük atlayışlarda hava süresi ≥1,8 sn olacak rampa dy +1 m. Hedef: büyük atlayışta 1 takla "zor ama mümkün".

**5. [P1] Bölüm — Kolay bölümlerde beceri ifadesi yok; "gazı kök" kazanıyor.**
Kanıt: `matrix.mjs`: 1-1 sürekli gaz 23,2 sn ★3, 1-3 sürekli gaz 27,3 sn ★3 3/3, 2-1 41,4 sn ★3. `sweep.mjs`: 1-1 ve 1-3'te 5–22 m/s'nin hepsi kazanıyor. 1-3 "Yumurta Seferi" yumurta ★'ları (≥3 ve 6 sağlam) kolayca alınıyor; ders "hız ↔ güvenlik" öğretmiyor.
Öneri: `CARGO.eggs.hitSpeed` 3,5→2,2 ve `maxHitDamage` 2→3; 1-3 inişine 2 tümsek ekle; 1-1 ★3 süre 40→28 sn (sürekli gaz 23 sn, dikkatli 31–33 sn arası denge), 1-3 ★3'e `time max 36` ekle; 2-1 ★3 süre 70→48.

**6. [P1] Çekirdek — Kargo frende/ivmelenmede neredeyse hiç kaymıyor; "ağırlık aktarımı" kargoda hissedilmiyor.**
Kanıt: `veh.mjs` (10 m/s'den tam fren): Tosun'da kargo kayması maks. 0,16 m, Koca 0,03 m, Paşa 0,65 m. Tasarım "frene basınca öne kayar" diyor.
Öneri: `CARGO.crate.friction` 0,6→0,38, `milk` 0,5→0,35, `watermelon` yuvarlanma sönümü (roundCargoDamping 1,5→0,8); Tosun fren torku 3600→3000 yerine, kargo kayması 0,5–1 m aralığında hedeflenmeli. Böylece "yumuşak fren" dersi (1-2, 2-1) gerçek olur.

**7. [P1] Ekonomi — Kuruş bol, yıldız kapıları anlamsız.**
Kanıt: `eco.mjs` (Tosun, bot): 1-1 ilk bitirmede +489 kuruş (ekran: `a11-end.png`: ödül 70 + yıldız 270 + skor 58 + toplanan 100); 8 bölümün sonunda toplam ≈4208 kuruş, ★20. Tosun'un üç hattı tam = 3180, Zıpır 1100: ilk bölgenin sonunda her şey alınabiliyor. Yıldız eşiği: Paşa 22★, Koca 34★ — bot 8 bölümde 20★ topluyor.
Öneri: `ECONOMY.scoreToCoins` 20→45, `starBonus` [40,80,150]→[20,40,70], `pickupCoin` 5→3; yükseltme maliyetleri ×1,5 ([150,270,450,720]); araç kilidi Zıpır 12★→10★ ama 1100→1500 kuruş. Hedef: Bölge 2 sonunda ≈2000 kuruş birikmiş olsun.

**8. [P1] Grafik/Arayüz — Telefonda (740×360) araç ve kargo küçük; pedallar yolu örtüyor.**
Kanıt: `a11-03.png`, `e24k-01.png`: Tosun ekranın ≈%14'ü (~105 css px), kasa ≈20 px, sürücü ≈12 px. Alt köşelerdeki GAZ/FREN pedalları (≈150×60 css px) inişte yolun ucunu örtüyor (`e24k-01.png`: sağ kenarda yol GAZ'ın altına giriyor). Yönetici şüphesi kısmen haklı. İleri görüş yeterli: 12 m/s'de ~18 m ≈ 1,5 sn.
Öneri: Kamera `widthMin` 24→21, `widthMax` 32→28 (yalnız genişlik <900 css px ve yükseklik <420 ise); `anchorX` 0,33→0,30; pedal yüksekliği ~60→48 css px, boşluk opaklığı 0,55; zemin çizgisi alt pedal bandının üstünde kalsın: kamera dikey ofsetini `0,14·viewH`→`0,20·viewH`.

**9. [P1] Çekirdek — Zıpır dengesiz/kapasite uyumsuz.**
Kanıt: Zıpır kapasitesi 3; 1-2, 1-4, 2-1…2-4'te 6 kargo veriliyor ("Kargo kapasitesi aşıldı" uyarısı; `bot --matrix`), ★ pratikte ≤1. Ayrıca `veh.mjs`: 10 m/s'den frenle Zıpır 4,8 sn'de duruyor (18 m), kargonun 2'sini kaybediyor, kargo 17 m kayıyor (takla/savrulma). 1-4 hava testinde 6 `badLand`, sonuç `stuck`.
Öneri: Kampanyada Zıpır'ın kargo sayısını `min(count, kapasite)` ile kes ve ★'ları araca göre uyarla; `pitchGain` 1,5→0,9, `brakeTorque` 2400→1900; iniş yardımı (kedi refleksi) Zıpır için %20→35.

**10. [P1] Arayüz — `stuck` başarısızlığı sessiz ve soğuk.**
Sorun: Gaz basılıyken 5 sn kıpırdamama sonucu bölüm bitiyor; çukura saplanan oyuncu geri vitesi bilmeyebilir.
Öneri: 2,5 sn kıpırdamada toast "Geri vites: ← basılı tut" + 5. sn'de otomatik "Kontrol noktasından devam" teklifi (`retryFromCheckpoint` zaten var); `RULES.stuckTime` 5→7.

**11. [P1] Bölüm — 2-3 "Kaya Yağmuru" çok dar hız penceresi.**
Kanıt: `sweep.mjs`: 5–9 m/s → ilk çukurda `fell@158/342`, 11 m/s ★2 bitiş, 13–22 m/s → `stuck@158/357/566/527`. Hız tam 10–12 m/s olmak zorunda; hızlı gelince kayanın çukura düşüp yolu tıkaması (doğrulanmalı) olası.
Öneri: Çukur 1,5 m daralt ya da rampa ekle (düşük hız bandı 8 m/s'ye insin); kaya çukurda 4 sn sonra kaybolsun (tıkanma önlemi); `trigger.x` 74→60 (bekleme penceresi geniş).

**12. [P1] Bölüm — İlk "vay" anı geç.**
Kanıt: 1-1 sürekli gazla ilk havalanma t≈19 sn'de (x≈200 küçük rampa; `airMax` 0,5 sn); ilk 15 sn düz/tümsek + kargo çok az hareket ediyor (madde 6).
Öneri: 1-1'e x≈38'de (≈5. sn) `ramp len 8, dy 1.0` + kuruş yayı koy; ilk tümsekte `h` 0,3→0,45.

**13. [P1] Çekirdek — Koca, Tosun'un katı üstünü (dominant).**
Kanıt: `bot --matrix`: aynı sürelerde (1-1: 31,0 vs 31,2 sn) ama 2-4'te Koca 6/6 teslim, Tosun 4/6; Koca'da kargo kaybı ≈0. Dezavantajı yalnızca kilit (34★/3600).
Öneri: Koca `motorTorque` 5200→4300, `maxWheelSpeed` 27→22 (0→8 m/s ≈4,5 sn), `drag` 0,9→1,1; çukur genişliği >8 m geçilemesin (zaten ağır).

**14. [P1] Grafik — 2-2 köprü okunmuyor, halat araca ve kargoya biniyor.**
Kanıt: `d22-06.png`: köprü zemini rampa gibi görünüyor, uzun halat çizgisi araç/kargo/sürücünün önünden geçiyor; zayıf tahta ipucu görünmüyor.
Öneri: Halatı araç ve kargonun arkasında çiz (z sırası: halat < araç), zayıf tahtaları 0,4 sn aralıkla hafif titret/koyulaştır (`bridgeStress >0,4`'te), köprü ucuna 2 m düz giriş.

**15. [P2] Arayüz — HUD çakışmaları.**
Kanıt: `b14-01.png`: "Kargo kayıp!" bandı yol çubuğu mesafe etiketinin (193 m) üstüne biniyor; `f32-02.png` (1280×720): kombo halkası ×2 hız etiketini ("27 km/sa") örtüyor. İpucu bandı + kombo bandı birlikte görününce sahne üst-orta ağır.
Öneri: Kombo halkasını hız etiketinin 28 px üstüne al; "Kargo kayıp!" bandını mesafe etiketinin altına (+22 px) kaydır; ipucu bandını 3,5→2,5 sn göster.

**16. [P2] Grafik — Sürücü başı kargo yığınında kaybolabiliyor.**
Kanıt: `b14-01.png`, `b14-03.png`: 6 yüklü Tosun'da balyalar sürücü kafasının önüne biniyor, sürücü okunmuyor.
Öneri: Çizim sırasını kargo < sürücü yap ya da yığın en çok 2 sıra (madde 2 ile birlikte).

**17. [P2] Çekirdek — Yükseltme etkisi yalnızca motorda hissediliyor.**
Kanıt: `veh.mjs` (düz, Tosun): motor T0→T4: 0→8 m/s 3,3→2,2 sn (hissedilir), tepe hız 19,6→20,5 m/s; hepsi T4: 21,0 m/s. Süspansiyon/lastik yalnızca düz zeminde ölçüldü, fark yok (kum/çamur/buz ölçümü yapılmadı).
Öneri: `UPGRADE_EFFECT.lastik.grip` 0,05→0,09 ve `softRolling` −0,07→−0,12; süspansiyon `travel` 0,06→0,10 + `zeta` 0,05→0,08; garajda "kumda +%x" gibi somut istatistik göster.

**18. [P2] Bölüm — Bölge 3–4 (kısa bakış): 4-4 en uzun bölüm (95 sn bot), 3-4/4-2 bot ile ★1, 3-3/4-3 ★3.**
Kanıt: `bot.mjs 3-1…4-4`: tümü bitiyor. 1-4'teki kargo kaybı ve 2-4 çukur ritmi benzeri sorunlar 3-4 (3/6) ve 4-2 (3/4) için de bakılmalı.
Öneri: 4-4 hedef süre 70 sn altına çek ya da ara kontrol noktası ekle (`checkpoint` nesnesi var).

**19. [P2] Arayüz — Bölüm kartı alt bilgisi boş.**
Kanıt: `m02-select.png`: kartların orta kısmı boş, kilitli kartlarda yalnızca "Önce 1-1 …". Öneri: bölüm "teaches" metnini ve yıldız ölçütlerini karta ekle (örn. "Yumuşak fren, karpuz").

**20. [P2] Ses — Doğrulanamadı.** Başsız tarayıcıda ses dinlenemedi; kargo kaybı, iniş, kafa vuruşu ve kombo için ayırt edilebilir üç ayrı SFX katmanı insan kulağıyla kontrol edilmeli.

(Toplam 20 madde; daha az etkili olanlar eklenmedi.)

## 3. Bölüm bölüm notları

| Bölüm | Süre (bot) | En iyi an | En kötü an | Not |
|---|---|---|---|---|
| 1-1 İlk Sipariş | 31 sn | Tepeler ve kuruş yayları; sonuç ekranı | İlk 15 sn düz; sürekli gaz ★3 (23 sn) | Çok kolay; öğretici ama gerilimsiz. Madde 5, 12. |
| 1-2 Karpuz Mevsimi | 43 sn | Tümsek dizisinde karpuz zıplaması | 2,8 m çukur <10 m/s'de ağır ceza + stuck | Madde 3. Karpuzlar frende kaymıyor (madde 6). |
| 1-3 Yumurta Seferi | 49 sn | Dik iniş sonrası rahatlama | Her hızda ★3; yumurta hasar almıyor | Ders işlemiyor, madde 5. |
| 1-4 Samanlık Sıçrayışı | 39 sn | 3 rampa kademesi, 4,4 m yükseklikte kuruşlar | Kasa ilk 3 sn'de kaçıyor; takla ★'ları erişilmez | Madde 2, 4. En çok kuruş/hava fırsatı olan bölüm. |
| 2-1 Kum Geçidi | 50 sn | Kum tepelerinde momentum hissi | ★3 sürekli gazla (41 sn) | Yüzey farkı iyi öğretiliyor. |
| 2-2 Sallanan Köprü | 50 sn | Köprüde sarsıntı ve toz | Köprü görsel olarak okunmuyor; 22 m/s'de stuck | Madde 14. |
| 2-3 Kaya Yağmuru | 68 sn | Kayanın çukura düşmesini beklemek | Hız penceresi 10–12 m/s; hızlı gelince stuck | Madde 11. Yalnız ★2. |
| 2-4 Kanyon Atlayışı | 45 sn | 12 m dev çukur atlayışı | Kasa 2,9 sn'de kaçıyor; Paşa düşüyor (tasarım gereği) | Madde 2, 4. |

## 4. Araç notları

- **Tosun:** Dengeli ve okunur; burun hafif kalkıyor (gazda ≈9°). 0→8 m/s 3,3 sn: biraz tembel, motor T2+ ile 2,6 sn. Havada takla zayıf (madde 4).
- **Zıpır:** En hızlı (0→8 m/s 2,5 sn, ≈24 m/s tepe) ve "eğlenceli" ama kapasite 3 ile kampanya kargosu uyumsuz (madde 9), frende savruluyor.
- **Paşa:** En ayırt edilir (0→8 m/s 6,7 sn, römork sallanıyor, 1-1'i 36,6 sn bitirir). Madde 1 hatası onu bozuyor; 2-4'ü atlayamaması tasarım gereği ama UI'da "önerilen araç: Tosun" uyarısı yeterince görünür olmalı.
- **Koca:** Görsel olarak en iyisi (`e24k-01.png`), kargo kaybı yok, kamyon ağırlığı hissediliyor. Ama çok baskın (madde 13).

## 5. Bulunan hatalar (yeniden üretme)

1. **Paşa kargosu bekleyince kayboluyor.** `?debug` ile aç; konsolda `__sarsinti.save.update(d=>{for(const k in d.vehicles)d.vehicles[k].owned=true})`, `__sarsinti.flow.startLevel('1-1','pasa')`; hiçbir tuşa basma. t=2,0 sn'de 2 kasa `fell`. (Çekirdek, `sim.js:429`)
2. **1-4'te kasa kendiliğinden düşüyor.** 1-4, Tosun, gaza bas (ya da %30 görev oranı). 2,1–3,4 sn'de bir kasa `cargoLost reason:left`. 2-4'te tam gazda 2,9 sn.
3. **1-2 çukurunda sıkışma.** 1-2, Tosun, 6–9 m/s ile ilk çukura (x≈141) gir: ön tekerlek duvara çarpar, karpuzlar `broke`, 5 sn sonra `stuck`.
4. **2-3'te yüksek hızla stuck.** 2-3, sabit 13+ m/s: x≈158'de `stuck` (kayanın çukuru tıkaması olası; doğrulanmadı).
5. **Takla ★'ları (1-4 ★2/★3, 2-4 ★3) fiilen alınamıyor.** Madde 4; tüm koşularda `flip` olayı 0.
6. **Köprü halatı araç/kargoyu kesiyor (2-2).** `d22-06.png`.
7. **HUD çakışması.** Kombo halkası × hız etiketi (`f32-02.png`); "Kargo kayıp!" bandı × mesafe etiketi (`b14-01.png`).
8. **Küçük, kullanıcıya dönük olmayan:** `flow.startLevel(id, kilitliAraç)` kilitli araçta sessizce Tosun'a düşüyor (Paşa testinde x=3'te başladı; araç sahipliği açılınca düzeldi).

Not: `?debug` modu fizik şekillerini çiziyor (`a11-03.png`); mağaza görünümü için `renderer.setOptions({debug:false})`.
