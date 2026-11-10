# Sarsıntı Nakliyat — Fizik Gerçekçiliği Denetimi

Denetçi: Fizik Gerçekçiliği Denetçisi. Yöntem: Node'da başsız sim (planck 1.4.2, adım 1/120 s, 8/3 yineleme), ölçüm betikleri
`/tmp/claude-0/-home-user-flying-car-game/705351c4-7d50-5223-91d5-4aeeba58981b/scratchpad/fizik/` altında. Kod/veri dosyalarına dokunulmadı;
"X yapılırsa" denen yerlerde değerler yalnızca denetim sürecinde bellekte değiştirilip ölçüldü.

Not: Denetim sürerken diğer ekipler bölüm verisini değiştirdi (3-2, 3-4, 4-4 Paşa ile ilk ölçümde takılıyordu, son ölçümde geçiyor).
Bölüm bazlı sonuçlar "an" görüntüsüdür; araç bazlı sayılar `config.js` değerlerine dayanır (denetim boyunca değişmedi).

---

## 1. Özet

| | Puan |
|---|---|
| **Gerçekçilik** (oyun fiziği olarak tutarlılık + inandırıcılık) | **6,5 / 10** |
| **Kararlılık** (jitter, tünelleme, eklem, CPU, determinizm) | **8,5 / 10** |

**Yargı (3 cümle).** Çekirdek (yay-damper, tork-sınırlı motor, yüzey μ, kargo teması) sağlam, deterministik ve çok ucuz (0,1–0,3 ms/adım); durgun jitter yok, bot determinizmi sıfır sapma. Gerçekçiliği bozan şey fiziğin kendisi değil, **`pitchGain` hilesi**: görünür eğimi neredeyse hiç artırmadan (Paşa'da 0,031 → 0,043 rad) aracın ivmesini, tırmanışını ve fren mesafesini ciddi biçimde kemiriyor (Paşa 0–25 km/s 3,0 → 4,1 sn, maks. eğim 16,5° → 10,5°; Tosun frende 13,7 → 20,4 m), ve Paşa kampanyada bu yüzden (artı kar topu hızı) takılıyor. İkinci sorun, "eğlence" katmanlarının ölü olması: kafa vuruşu fiilen tetiklenmiyor, bu dengeyle atlayışlarda takla (0,4 tur altı) ve fren/yüzey farkı (asfalt = toprak = çimen = çakıl) hissedilmiyor.

---

## 2. Ölçüm tabloları

Tüm süreler düz asfalt, boş araç, tek gaz; "yük" = tipik kargo. Eğim testi: 12 m düz giriş + sabit eğim, 35 m yukarı çıkabilen en dik açı (giriş momentumu içerir; durgun kalkış değeri 1–3° daha düşük).

### 2.1 Hızlanma ve azami hız (maddeler 1)

| Araç | 0→25 km/s | 0→50 km/s | 0→50 yüklü | Maks. hız | Tam yükselt. 0→50 / maks. | Gerçek sınıf kıyası |
|---|---|---|---|---|---|---|
| Tosun (pikap) | 2,55 sn | **5,16 sn** | 5,78 | 70,8 km/s (19,7 m/s) | 3,67 sn / 79,3 | Gerçek pikap 0→50 ≈ 3,5–4 sn, maks. 150+: ivme makul, hız ~%50 kısık (oyun ölçeği: 26 m görüş) |
| Zıpır (bagi) | 1,93 sn | **3,89 sn** | 4,29 | 93,3 km/s | 2,77 sn / 104,5 | Gerçek bagi 0→50 ≈ 2,5 sn: biraz yavaş, hissi tatlı |
| Paşa (traktör+römork) | 4,13 sn | **hiç ulaşmıyor** | — | 40,1 km/s (11,1 m/s) | – / 44,9 | Gerçek traktör 30–40 km/s: hız çok gerçekçi, ivme çok **atik** (gerçek ≈ 6–8 sn) ama aslında `pitchGain` yüzünden olması gerekenden de yavaş |
| Koca (kamyon) | 2,66 sn | **5,37 sn** | 6,19 | 53,4 km/s | 3,82 sn / 59,7 | Gerçek 18 t kamyon 0→50 ≈ 15–20 sn: Koca bir pikap gibi kalkıyor, "ağırlık" hissi yok |

Önemli: ivme **sabit** (0→25 ile 25→50 süreleri eşit) ve hız tavanı sert (tekerlek açısal hızı × yarıçap); TASARIM §4.5'teki "maks. hıza yaklaşırken tork lineer düşer" **uygulanmamış**. Hız tavanı `maxWheelSpeed·r` ile birebir (Tosun 52·0,38 = 19,8 m/s), aerodinamik sürükleme ihmal edilebilir (213 N @ tavan).
Yüzeyde 0→25 km/s (Tosun / Zıpır / Paşa / Koca): asfalt 2,5/1,9/4,1/2,7; kum 4,5/2,8/12,7/5,1; kar 4,5/2,7/6,5/4,1; buz 11,0/6,3/30,9/10,1; **çamur: Tosun, Paşa, Koca 25 km/s'ye hiç çıkamıyor** (son hız 6,8 / 5,1 / 6,4 m/s).

### 2.2 Fren mesafesi, 50 km/s → 0 (madde 2; Paşa 36 km/s'den, çünkü 50'ye çıkamaz)

Mevcut config, yükseltmesiz. Format: metre. İdeal = v²/(2μg).

| Yüzey (μ) | İdeal | Tosun | Zıpır | Paşa (10 m/s; ideal asf 5,1) | Koca |
|---|---|---|---|---|---|
| Asfalt (1,0) | 9,8 | **20,4** | 17,3 | 7,5 | **23,1** |
| Toprak (0,8) | 12,3 | 20,3 | 17,6 | 8,1 | 23,2 |
| Çimen (0,7) | 14,0 | 19,9 | 17,5 | 7,9 | 22,9 |
| Çakıl (0,75) | 13,1 | 19,4 | 17,1 | 7,9 | 22,2 |
| Kum (0,6) | 16,4 | 13,9 | 13,0 | 6,6 | 15,8 |
| Çamur (0,55) | 17,9 | 12,3 | 11,7 | 6,0 | 14,0 |
| Islak (0,5) | 19,7 | 22,1 | 20,4 | — | 29,1 |
| Kar (0,35) | 28,1 | 21,7 | 22,8 | 10,2 | 25,2 |
| Buz (0,12) | 81,9 | 79,0 | 82,6 | 31,5 | 76,4 |

Bulgular: (a) asfalt/toprak/çimen/çakıl **aynı mesafede**: fren torku sınırlı, μ ≥ 0,7'de yüzey hissedilmiyor; (b) kum/çamur/kar'da "batma sürüklemesi" frene yardım ediyor (çamurda 12 m < asfaltta 20 m: sezgiye ters ama fiziksel olarak tutarlı); (c) buz doğru; (d) asfalt değeri ideal torkun (≈12,7 m) çok üstünde → nedeni `pitchGain` (bkz. §3, öneri 5): frende arka teker erken kilitleniyor (kayıt: arka om = 0 @0,2 sn, ön teker 1800 N·m ile sınırın hemen altında yuvarlanıyor).
Pitch/pitchGain etkisi: Tosun asfalt `pitchGain` 3 → 1 → 0: **20,4 → 15,4 → 13,7 m**. Koca (9000 N·m): 23,1 → 20,9 → 20,9 (kamyon için kabul edilebilir).

### 2.3 Tırmanma (madde 3) — sınır: hangi yüzeyde ne sınırlıyor?

Maks. eğim (derece), yükseltmesiz / tam yükseltmeli:

| Yüzey | Tosun | Zıpır | Paşa | Koca |
|---|---|---|---|---|
| Asfalt | 19,5 / 27 | 25,5 / 34,5 | **10,5** / 21 | 18 / 25,5 |
| Toprak | 18 / 25,5 | 25,5 / 31,5 | 10,5 / 21 | 18 / 24 |
| Kum | 15 / 22,5 | 19,5 / 25,5 | 9 / 18 | 15 / 21 |
| Çamur | 15 / 22,5 | 18 / 24 | **7,5** / 18 | 13,5 / 21 |
| Kar | **10,5** / 15 | 18 / 22,5 | 7,5 / 18 | 12 / 15 |
| Buz | **4,5** / 4,5 | 7,5 / 9 | **0** / 6 | 4,5 / 6 |

Sınırlayıcı: asfalt/toprak/çimen/çakıl'da **tork sınırlı** (F = T/r; Tosun 3420 N); kar/buz'da **çekiş sınırlı** (tan θ ≈ μ·N_arka/(mg): kar 0,35·0,55 = 0,19 → 10,9° ölçülen 10,5° ile tutarlı); kum/çamurda **batma sürüklemesi + tork**.
Kritik: **Paşa kuramsal olarak 16° çıkmalı** (5484 N / 2000 kg → 0,28 g) ama 10,5° çıkıyor; `pitchGain=0` ile 16,5° (ölçüldü). Kayıp tamamen hileden.
Kampanya eğimleri: tepeler/tümsekler 8–10° (örn. `hills amp 1,0 len 44 waves 2` → 8,1°; `bumps h 0,3 n 5 len 30` → 8,9°; kar `slope dy 3,5/len 24` → 8,3°). Paşa'nın çamurda 7,5°, karda 7,5° sınırı **bu eğimlerin altında** → bot "stuck".

### 2.4 Süspansiyon ve ağırlık aktarımı (madde 4)

| Araç | Statik çökme (arka/ön) | Yolculuk (±) | 0,3 m basamak inişi: sıkışma tepe / dip vurma | Salınım (eğim) | Gazda eğim | Frende eğim (12 m/s tam fren) |
|---|---|---|---|---|---|---|
| Tosun | 10,0 / 11,0 cm | 14 cm | %70 / **0 kez** | ~1 aşım (0,021 → −0,004) | +0,029 rad (1,7°) | −0,084 rad (4,8°) |
| Zıpır | 3,7 / 4,0 cm | 22 cm | %67 / 0 | 1 aşım | +0,016 (0,9°) | −0,037 (2,1°) |
| Paşa | 10,6 / 9,6 / römork 8,0 cm | 10 cm | %80 / 0 | 1 aşım | +0,043 (2,5°) | −0,045 (2,6°) |
| Koca | 15 / 12,5 / 11,8 cm | 12–14 cm | %85 / 0 | ~0–1 aşım | −0,003 (≈0) | −0,050 (2,9°) |

`pitchGain=0` ile (hile devre dışı) gaz/fren eğimi: Tosun +0,008 / −0,031; Zıpır +0,007 / −0,021; Paşa +0,031 / −0,001; Koca −0,006 / −0,036. Yani hile görünür eğimi yaklaşık 2–4 kat artırıyor (üstelik fiziksel ivme/fren kayıplarıyla).
**Yöneticinin şüphesi doğru**: gazda 1–2,5° (Tosun'da burun 5 cm kalkar) gözle neredeyse görünmez; frende 3–5° görünür ama zayıf. Süspansiyon aşırı iyi sönümlü: bir basamaktan sonra ≤1 aşım, **dip vurma ölçülen hiçbir senaryoda yok** (maks. sıkışma %65–85) → "sarsıntı" teması süspansiyondan gelmiyor.

### 2.5 Havada kontrol (madde 5)

Serbest düşüşte tam hava torku (asist kapalı):

| Araç | α (geri takla) | α (ön takla) | Tam takla süresi | Açısal hız tavanı |
|---|---|---|---|---|
| Tosun | 3,8 rad/s² (TASARIM 4,0) | 3,3 | **2,06 sn** (TASARIM 1,8) | 7 rad/s |
| Zıpır | 6,4 | 4,9 | 1,63 sn | 9 |
| Paşa | 5,0 | 3,9 | 3,25 sn | 3 |
| Koca | 1,3 | 0,9 | 4,04 sn | 2,5 |

Tipik atlayış: kampanya rampaları (`ramp len 10–14, dy 1,8–2,5` + 5–8 m çukur) 10–20 m/s'de havada kalma **0,4–1,2 sn**; en fazla 0,2–0,3 tur (Tosun gazla ≈ +0,1–0,2 tur). Analitik: θ = ½αt² → 1,2 sn'de Tosun 2,7 rad (0,43 tur). Tam takla (SCORING.flip = 150 puan) için ≥ 2 sn hava gerekir: mevcut rampalarla ulaşılamaz. Geri/ön takla asimetrik (ön ~%13–25 zayıf: sürücü tekerleklerin tepkisi).

### 2.6 Kargo (madde 6)

Eşikler (hesap + ölçüm): kargo–kasa sürtünmesi √(μ_kargo·0,4) ≈ 0,45–0,49, kargoya ×1,15 yerçekimi → kayma eşiği ≈ 5,0–5,5 m/s². Oyundaki en yüksek yatay ivme: gaz 2,7, fren 4,7 → **kargo hiçbir fren/gazda kaymıyor** (ölçüldü: 50 km/s tam fren, 8 sn tam gaz; buzda da kaymaz çünkü kasa sürtünmesi yüzeyden bağımsız). Eğimde kayma eşiği ≈ tan θ > 0,49 → **26°**: kampanyada hiç. Yani kargo riski yalnızca **düşey** hareketten (tümsek, atlayış, iniş).

| Senaryo (Tosun, 6 parça karışık) | Sonuç |
|---|---|
| Tümsek h 0,25 n 6 @6/10/15 m/s | 0 kayıp, 0 hasar |
| Tümsek h 0,45 n 6 | 1 / 2 / 1 kayıp (yumurta/bidon/karpuz) |
| Basamak −1,0 m @10 | 1 kayıp; −1,5 m: yumurta −2 can; **−3 m: 3 kayıp**, piyano kırıldı (Koca) |
| Koca @10, tümsek 0,45 | 0 kayıp (ağır araç + dik kenarlık iyi) |
| Zıpır, tümsek 0,25 n 6 @8 | yumurta kolisi **fırlayıp düşüyor** (1,5 kg kutu, 600 kg araç; başka hiçbir parça kaybolmuyor) |

Kırılma eşiklerinin tutarlılığı: yumurta 3,5 m/s ≈ 0,6 m düşüş, karpuz 9 m/s ≈ 4 m düşüş, piyano 8 m/s ≈ 3,3 m: sıralama sezgisel (yumurta ≪ piyano < karpuz). Karpuz (6 kg, hitSpeed 9) piyanodan daha dayanıklı görünüyor, tuhaf ama oyun bakımından zararsız.
**Yanlış pozitif**: karışık yükte (yumurta bidonun üstüne istiflenmiş) tam gazda ilk 0,58 sn'de yumurta–bidon temasında 3,6 m/s göreli hız → yumurta **1 can** kaybediyor (eşik 3,5). Tamamen düz asfaltta, oyuncu hata yapmadan. Betik: `t6b.mjs`.

### 2.7 Kararlılık ve performans (madde 7)

| Test | Sonuç |
|---|---|
| Durgun jitter (20 sn, 4 araç + yük) | Hepsi 3 sn'de uykuya dalıyor, \|v\| = 0,0000 (Zıpır'da uykudan önce 0,009 m/s) |
| Tünelleme: 60 m yükseklikten düşüş (~34 m/s) | Yok (4 araç + kargo) |
| Tünelleme: 150 m (53 m/s), Paşa+kargo | **Paşa zemin altına düşüyor (y = −2809, v = 240 m/s)**: yalnız >45 m/s; oyunda ulaşılamaz (killDepth 14) |
| Paşa römork, 11 m/s ani fren, 20° iniş freni, 15° gazsız iniş | hitch −0,05…+0,06 rad, eklem kayması 0,00 cm, römork w 0,1 rad/s |
| Paşa 2,5 m basamaktan iniş @9 m/s | hitch −0,91 (limit −0,9'a dayanıyor), kayma 4 cm |
| Paşa 5 m çukura düşüş | hitch −1,3 rad (limit aşılıyor), eklem **75 cm açılıyor**; yineleme sayısı artırmak (12/8) düzeltmiyor → ezilme/sıkışma, oyun zaten `fell/stuck` ile bitiriyor |
| Paşa geri vites | 3,9 m/s (14 km/s) çalışıyor; başlangıç duvarına yakınken (spawn römorkla duvara 0,6 m) geri gidemiyor (beklenen) |
| Köprü 2-2 (36 tahta) | 4 araç da geçiyor; durdurulursa orta zayıf tahta kopar (12 kN eşiği ≈ 1,25 t aracın statik ağırlığı!); sönüm sınırlı: 80 sn sonra bile tahtalarda 0,18 m/s dolaşım, ancak patlama/enerji birikimi yok |
| Tahterevalli (6 m) | Tüm araçlar ±0,22 rad (zemin teması) arasında; durgun w = 0,000 |
| Uzun Yol (endless) 150–200 sn × 4 araç | Gövde ≤ 38, eklem ≤ 32, düğüm ≤ 494 (sabit); bellek büyümesi yok |
| **CPU / adım** (Node) | Düz+yük 0,10–0,16 ms; 2-2 köprü 0,26; 4-4 0,29; endless 0,11 ms. Telefon ×3 ≈ 0,3–0,9 ms/adım → **kare başı 2 adım ≈ 0,6–1,7 ms** (16,7 ms bütçenin %10'u). Bütçe çok geniş: yineleme veya adım sayısı artırılabilir |
| Determinizm | `bot --matrix --determinism` (1-2, 2-2, 3-2, 4-4 × 4 araç) ve endless ×2 tohum: **sapma 0** |

### 2.8 Kafa vuruşu / ragdoll (madde 8)

36 hedefli senaryo (1,5–8 m düz iniş, ters iniş, burun-aşağı, çatıda kayma, yan düşüş × 4 araç): **headHit 0**. Rastgele sert iniş parkurları (4 araç × 30 tohum): 120 koşuda **1** headHit. Sebep geometri: kafa kabin/tavanın 3–8 cm altında (Tosun: kafa tepe 1,37, tavan alt 1,35–1,45 → 2 cm taşma ama tavan geniş; Paşa/Koca 3 cm) ve kafa şasiyle çarpışmıyor → zemin yalnızca tavan yoldan çekilirse kafaya değiyor. Yani yanlış pozitif yok, **yanlış negatif çok**: TASARIM §9'un "kafa vuruşu" başarısızlığı pratikte ölü; asıl ters-kalma kaybı `flipped` (açı > 120°, hız < 1 m/s, 2 sn) ile oluyor ve düzgün çalışıyor (ters iniş senaryolarında tetiklendi).

---

## 3. Önceliklendirilmiş öneriler (en fazla 20)

Biçim: **[Öncelik]** Sorun — Kanıt — Öneri — Eğlenceye etkisi. Sayılar "denetimde ölçüldü" ise belirtildi, aksi halde "tahmin".

**1. [P0] Paşa `pitchGain` hilesi aracı boğuyor.**
Kanıt: `pitchGain` 2 → 0,5 → 0: 0→25 km/s 4,13 → 3,21 → 2,99 sn; maks. eğim 10,5° → 15° → 16,5°; görünür eğim 0,043 → 0,033 → 0,031 rad (`pg.mjs`, `pg2.mjs`).
Öneri: `VEHICLES.pasa.pitchGain 2.0 → 0.5`.
Eğlence: Paşa "ağır ama güçlü traktör" olur, tepelerde donmaz; hissedilen eğim neredeyse aynı kalır.

**2. [P0] Paşa kar topu (4-2) ile hız çelişkisi.**
Kanıt: Paşa maks. 11,1 m/s (tam yükseltmede 12,5); 4-2 kar topu `v1 12 m/s`, `ramp 45 sn` → t = 40,7 sn'de "chased" (bot, tekrarlanabilir; `pasa3.mjs`).
Öneri (biri): bölüm verisi 4-2 `snowball v1 12 → 10`; ya da topu araç hızına bağla (`v1 = min(v1, 0.9·maxWheelSpeed·wheelR)`) ya da `VEHICLES.pasa.maxWheelSpeed 18 → 20` (12,4 m/s; yalnız tek başına yetmez, çünkü karda kar-sürükleme).
Eğlence: Paşa'nın kovalanma bölümü bitirilebilir; topun tehlikesi Tosun için aynı kalır.

**3. [P0] Paşa tork/çekiş kampanya eğimlerinin altında.**
Kanıt: kampanyada 8–10° tepeler; Paşa çamur 7,5°, kar 7,5° (yüksüz). Önerilen birleşik ayar ölçüldü (6 kasa yüklü): pg 0,5 + motor 4300 + grip 1,5 → asfalt 17°, toprak 17°, çamur 14°, kar 12°, çamur son hız 8,0 m/s (şimdi 4,9).
Öneri: `VEHICLES.pasa.motorTorque 3400 → 4300`, `VEHICLES.pasa.grip 1.2 → 1.5` (öneri 1 ile birlikte). Kar eğimi çekiş sınırlıdır: grip 1,2/1,5/1,8 → kar 9°/12°/15°.
Eğlence: Paşa ölçeklenir ("traktör çamurda ve karda parlar" kimliği); Koca/Tosun yine hızlı kalır.

**4. [P0] Tosun ve Koca `pitchGain` fren/gaz hissini bozuyor, görünürlük yine zayıf.**
Kanıt: Tosun asfalt fren 20,4 m (`pitchGain` 3), 15,4 (1), 13,7 (0); ideal tork sınırı 12,7 m. Görünür eğim 0,084 → 0,045 → 0,031 rad.
Öneri: `VEHICLES.tosun.pitchGain 3.0 → 1.0` ve `brakeTorque 3600 → 4800` (asfalt 13,6 m; ölçüldü). `VEHICLES.koca.pitchGain 3.0 → 1.5`, `brakeTorque 9000 → 12000` (asfalt 18,0 m; kamyon yine uzun durur).
Eğlence: fren "güveni" artar (şimdi 50 km/s'de 20 m = 0,48 g, gerçek pikap ≥ 0,8 g); eğim kaybı öneri 5 ile telafi edilir.

**5. [P1] Gövde eğimi (ağırlık aktarımı) görünmez; fizik yerine çizimde abart.**
Kanıt: gazda 1–2,5° (Tosun +0,029 rad = burun 5 cm), Koca gazda 0.
Öneri: `render/` tarafında salt görsel bir eğim ekle: `lean = clamp(0,12·ivme_x/g, ±0,10 rad)` (yumuşatma 0,15 sn); fizikte `pitchGain` ≤ 1. (Config anahtarı önerisi: `CAMERA`/render alanına `bodyLean: { gain: 0.12, max: 0.10, halfLife: 0.15 }`.)
Eğlence: "yaylı, canlı" his gerçekçilik kaybı olmadan; fiziksel ivmeye dokunmaz.

**6. [P1] Frende yüzey farkı yok (asfalt = toprak = çimen = çakıl).**
Kanıt: tablo 2.2: 20,4 / 20,3 / 19,9 / 19,4 m; tork sınırlı. Öneri 4 uygulanınca bile 13,6 / 13,9 / 13,9 / 13,6 (fark yok); 6000 N·m'de asfalt 12,2 – çimen 13,3.
Öneri: yüzey farkı istenirse kullanıcıya görünür kılmak için `SURFACES.grass.mu 0.70 → 0.60`, `SURFACES.gravel.mu 0.75 → 0.65`, `SURFACES.dirt.mu 0.80 → 0.70` (tahmin, ölçülmedi: friction-limited olmaları için `brakeTorque` ≥ 6000 gerekir).
Eğlence: "toprakta daha geç durursun" öğrenilebilir olur; ama arka tarafta ıslak (0,5) ile kar (0,35) arasındaki fark zaten belirgin, risk: Tosun'da kum ve çamur frende avantaj (12 m) — öneri 7.

**7. [P1] Kum/çamurda frenin asfalttan kısa olması sezgiye ters.**
Kanıt: Tosun asfalt 20,4 m, çamur 12,3 m; sürükleme `sink·m·1,15·v` yumuşak zeminde ivme-sürüklemesi (kütleden bağımsız).
Öneri: frenden bağımsız bırak, ama `SURFACES.mud.sink 0.35 → 0.30` ve `SURFACES.sand.sink 0.25 → 0.22` (çamur son hız Tosun 6,8 → ~7,6 m/s, tahmin). Çamurda 25 km/s'ye hiç çıkılamıyor (Tosun/Koca/Paşa).
Eğlence: çamur "yavaş ve yapışkan" kalır, çaresizlik azalır.

**8. [P1] Tosun hava torku: tam takla 2,06 sn, kampanya atlayışları 0,4–1,2 sn.**
Kanıt: 5500 N·m → α 3,8 rad/s²; havada 1,2 sn → 0,43 tur; `SCORING.flip` yalnız tam tur sayar.
Öneri: `VEHICLES.tosun.airTorque 5500 → 7500` ve `airMaxW 7 → 8` (hesap: α ≈ 5,2 → takla ≈ 1,6 sn; ölçülmedi); Zıpır (1,63 sn) kalsın. Alternatif/ek: bölüm tasarımına ≥ 14 m'lik "takla rampaları" (`ramp len 14 dy 3.5`, boşluk ≥ 12 m).
Eğlence: takla (150 puan) erişilebilir risk/ödül olur; Paşa/Koca zaten takla yapamıyor (stats air:1) — doğru.

**9. [P1] Kafa vuruşu mekaniği fiilen ölü.**
Kanıt: 36 hedefli senaryoda 0, 120 rastgele koşuda 1. Kafa tepesi tavanın 3–8 cm altında; kafa şasiyle çarpışmıyor.
Öneri: ya (a) mekaniği kaldırıp `flipped`'ı tek ters-kalma kuralı olarak belgele, ya (b) tavan çarpmasını tetikçi yap: `bodyHit` `part:'roof'` olup hız > 9 m/s ve araç ters (|açı| > 2,0) ise `driverEject` (yeni anahtar `DRIVER.roofCrushSpeed: 9`).
Eğlence: (b) "ters inersen yandın" gerilimi kazandırır, ama adaletsiz hissettirmemek için Zıpır'da (roll cage) hızı 11 yapın.

**10. [P1] Yumurta yanlış pozitifi (ilk gazda).**
Kanıt: karışık yük, Tosun, düz asfalt, tam gaz: t = 0,58 sn'de 3,6 m/s temas → yumurta −1 can (hitSpeed 3,5).
Öneri: `CARGO.eggs.hitSpeed 3.5 → 4.3` (≈ 1 m düşüş) ve/veya `sim` içinde ilk 1 sn hasar yok (`S.t < 1`). Yükleyicide yumurtayı bidon üstüne istiflememe (kök neden: bidon–yumurta göreli hareketi).
Eğlence: oyuncu kendi hatası olmadan "yumurta kırdım" hissini yaşamaz.

**11. [P1] Paşa'da kampanya geçişleri: bölüm verisi çatışmaları.**
Kanıt (`pasa3.mjs`, son durum): 3-3 x = 142,6 stuck (1. nehir: 6 m boşluk, karşı kıyı 1,5–2,3 m yüksek; dikey basamak aşma tablosu aşağıda; Paşa 11 m/s ile 6 m'yi atlayamıyor), 4-2 chased. 3-2, 3-4, 4-4 son ölçümde bitiyor/ilerliyor (bölüm verisi değişti).
Öneri: 3-3 nehir çıkışına 30° eğimli kıyı (0,5 m'ye kadar Paşa 30° ramp-basamak aşıyor) ya da kütüğü rampa olarak yerleştir; bölüm başına araç bot testi `bot --matrix` CI'ya.
Eğlence: Paşa kampanyası kilitli kalmaz.

**12. [P2] Dikey/dik basamaklar duvar.**
Kanıt (`step.mjs`, `step2.mjs`): hiçbir araç 0,2 m dikey çıkıntıyı aşamıyor (Zıpır 0,3 @3 m/s); 45° kenarlı 0,3 m yalnız Tosun/Koca/Zıpır; 60° kenar Tosun/Paşa/Koca için 0.
Öneri: bölüm tasarımına kural: 15 cm üzeri dikey kenar duvardır, geçilecekse ≤ 30° eğimle yap; `docs/MIMARI` bölüm rehberine ekle. Gerçek araç 15–20 cm kaldırımı çıkar; istenirse tekerlek kapsülü/çatlak: tekerlek fikstürüne `restitution 0.05` yerine 'ön kenar yuvarlatma' (kod değişikliği, ölçülmedi).
Eğlence: haksız takılmalar azalır.

**13. [P2] Koca kamyon gibi hissettirmiyor.**
Kanıt: 0→50 5,4 sn (gerçek kamyon 15–20 sn); TASARIM tablosu motor 4200, fren 4000; config motor 5200, fren 9000.
Öneri: `VEHICLES.koca.motorTorque 5200 → 4200` (0→50 ≈ 6,6 sn, hesap) ve fren yerinde kalsın. Dokümanla config'i hizala (Tosun freqHz 2,2 ↔ 1,7, Paşa motor 2600 ↔ 3400 vb.; TASARIM §4.2 tablosu eskimiş).
Eğlence: Koca "ağır ama tanklaşan" kimlik kazanır; Tosun'dan ayrışır.

**14. [P2] Tork eğrisi uygulanmamış (sabit ivme + sert tavan).**
Kanıt: 0→25 ve 25→50 süreleri eşit; hız tavanda sertçe sabitleniyor.
Öneri: `driveVehicle` içinde `torque *= 1 − 0.5·rpm²` gibi hafif eğri (kod; ~%25 ivme kaybı yüksek hızda) ya da TASARIM §4.5'ten bu cümleyi sil.
Eğlence: hız aralığı daha doğal, tavana yaklaşma "dolgun" olur.

**15. [P2] Süspansiyon dip vuruyor mu? Hayır; teması zayıf.**
Kanıt: 0,3 m basamak iniş sıkışması %65–85, dip vurma 0; Tosun ≤ 1 aşım.
Öneri: `VEHICLES.tosun.travel [-0.14,0.14] → [-0.11,0.11]` ve `zeta 0.55 → 0.45` (tahmin: dip vurma ve 2 aşım; ölçülmedi), Zıpır `zeta 0.35` yerinde. Tam yükseltmede zeta ×1,2, travel ×1,24 zaten dip vurmayı daha da azaltır.
Eğlence: "Sarsıntı" kimliği güçlenir; kargo riski artar (Tosun tümsek 0,45'te zaten 1–2 kayıp).

**16. [P2] Paşa römork: ezilme sırasında eklem limiti aşılıyor.**
Kanıt: 5 m çukura düşüş: hitch −1,3 rad, eklem 75 cm; yineleme 12/8'de de aynı.
Öneri: kod: `hitchLimit` ihlalinde (|açı| > limit + 0,3) römorku yeniden-hizala veya `fell`'e bağla. Config yok.
Eğlence: nadir durum; görsel çirkinliği önler.

**17. [P2] >45 m/s düşüşte tünelleme (Paşa).**
Kanıt: `t8.mjs` H = 150 m, Paşa + 2 kasa 2 karpuz yumurta bidon: y = −2809. Oyunda erişilemez (en yüksek ~12–15 m düşüş).
Öneri: römork gövdesine `bullet: true` ve `maxFrameDt` ile birlikte hız üst sınırı 40 m/s (`SIM.maxBodySpeed: 40`, sim'de kıskaç). Düşük öncelik.

**18. [P2] Zıpır: yumurta kolisi tümsekte fırlıyor.**
Kanıt: `zip2.mjs`: tümsek h 0,25 n 6 @8 m/s'de yalnızca yumurta düşüyor (kasa/karpuz kalıyor).
Öneri: `CARGO.eggs.mass 1.5 → 3` (kütle oranı; kırılma eşiği ayrı) ve/veya arka kenarlık Zıpır `parts[4].h 0.5 → 0.65`.
Eğlence: Zıpır'ın "yumurta taşımaz" kimliği korunur ama haksız kayıp azalır.

**19. [P2] Köprü zayıf tahta eşiği, durağan ağırlıkla kopuyor.**
Kanıt: 1,25 t Tosun ortada durunca zayıf tahta kopuyor; `PROPS.bridge.weakForce 12000` (≈ 1,22 × statik ağırlık).
Öneri: `weakForce 12000 → 15000` (hızlı geçiş ~17 kN yine koparır; yavaş ~9,5 kN geçer; ölçülmedi).
Eğlence: "yavaş geç, hızlı geçme" öğretisi korunur, durup bakmak ceza olmaz.

**20. [P2] Adım bütçesi geniş: kaliteyi yükselt.**
Kanıt: 0,10–0,29 ms/adım; telefon ×3 ≈ 0,9 ms.
Öneri: `SIM.velocityIterations 8 → 10`; `SIM.step` 1/120 yerinde (1/240 ≈ iki katı maliyet, hâlâ < 4 ms/kare telefon). Çarpma sertliği/eklem iyileşmesi ölçülmedi (yineleme 12/8 Paşa çukur düşüşünü düzeltmedi).
Eğlence: dolaylı.

### 3.1 §4.5 "bilinçli hileler" değerlendirmesi

| Hile | Karar |
|---|---|
| Alçak kütle merkezi (`comY`) | **Mantıklı**, ters kalma 30 rastgele sert parkurda yalnız 2–7 kez `flipped`. Kalsın. |
| Şasi–zemin sürtünmesi 0,4 | Mantıklı; çatıda kayma ters-kalmada sıkışmayı azaltıyor. |
| Tork/fren/aero "eğri" | **Uygulanmamış** (§2.1); doğrusu: ya yap ya dokümandan çıkar. |
| Hava torku gerçek eylemsizlikten bağımsız | Mantıklı; Tosun için hâlâ zayıf (öneri 8). |
| Kargoya ×1,15 yerçekimi | Mantıklı, ama etkisi yalnız düşeyde; kayma eşiğini (0,49·g_eff) de yükseltiyor, kargo yatay hiç kaymıyor — kargo "yapışık". İsteğe bağlı: kasa–kargo sürtünmesini düşür (`CARGO.crate.friction 0.6 → 0.4` ⇒ kayma eşiği ≈ 4,4 m/s², Tosun freninde (4,7) kaymaya başlar; tahmin). Bu **gerçekçi + eğlenceli** bir kargo-yönetimi katmanı ekler. |
| **`pitchGain` (dokümanda yok!)** | **Zararlı**: doküman "burun hafif kalkar, gerçek ağırlık aktarımı, fizik sonucu" diyor; kodda hile var ve aracı yavaşlatıyor. Öneri 1, 4, 5. |

Gerçekçilik/eğlence dengesi özeti: **sıkıcı/sinir bozucu gerçekçilik**: çamurda 25 km/s'ye çıkamama, 0,2 m çıkıntı duvarı, Paşa'nın zayıf çekişi. **Gerçekçiliği bozan hile**: `pitchGain` (eğimi göstermeden performans kemiriyor), kargonun hiç kaymaması, süspansiyonun dip vurmaması, Koca'nın pikap gibi kalkması.

### 3.2 Box2D/planck'a özgü bilinen sorunlar — bu projede var mı?

| Sorun | Durum |
|---|---|
| Kütle oranı > 10:1 eklem kararsızlığı | Var (araç/tekerlek: Koca 3200:80 = 40:1; Tosun 1100:35 = 31:1; kargo 1,5 kg : 600 kg = 400:1) ama **kararsızlık yok**: WheelJoint yumuşak (Hz/ζ), jitter 0, uykuya dalıyor. Yumurta kutusu tümsekte fırlıyor (öneri 18). |
| Hızlı/ince gövde tünelleme | Tekerlekler `bullet`; dinamik/statik sürekli çarpışma açık; 34 m/s'de sorun yok. **53 m/s'de Paşa** (öneri 17). İnce köprü tahtası (0,2 m) × hızlı kargo test edilmedi. |
| Chain shape hayalet çarpışma | Çoğu bölümde `Chain` açık kenar uzunluğu 1,0 m; tekerlek zeminde 0,01 sapma/sekme gözlenmedi. Uzun Yol parçalı zincirler "hayalet köşeli" yapılmış; endless 4 araç × 200 sn sorunsuz. |
| Eklem patlaması | Römork: normal sürüşte sıfır; yalnız ezilme/çukur düşüşünde (öneri 16). Köprü: patlama yok; kontrollü kopma. |
| Enerji birikimi | Köprüde 80 sn sonra tahta KE 6–117 J arasında dolaşıyor, artan trend yok. Endless 200 sn gövde/bellek sabit. |

---

## 4. Kararlılık / hata bulguları (yeniden üretme)

Betik klasörü: `/tmp/claude-0/-home-user-flying-car-game/705351c4-7d50-5223-91d5-4aeeba58981b/scratchpad/fizik/`. Hepsi `node <betik>.mjs` ile çalışır (`lib.mjs` ortak yardımcı).

| # | Bulgu | Önem | Betik |
|---|---|---|---|
| B1 | `pitchGain` Paşa ivmesini %28, tırmanmasını %37 düşürüyor; görünür etkisi +0,012 rad | **Yüksek** | `pg.mjs`, `pg2.mjs`, `pasa4.mjs` |
| B2 | Paşa 4-2 kar topu: t = 40,7 sn "chased" (top 11,7 m/s > araç 11,1 m/s) | Yüksek | `pasa3.mjs` |
| B3 | Paşa çamur/kar tırmanma 7,5° < kampanya eğimi 8–10° | Yüksek | `t3.mjs`, `pasa2.mjs`, `pasa5.mjs` |
| B4 | Eşit fren mesafesi asfalt/toprak/çimen/çakıl (tork sınırı); asfalt ideal tork mesafesinden %60 uzun (Tosun) | Orta | `t2.mjs`, `t2b.mjs`, `t2c.mjs` |
| B5 | Yumurta ilk gazda −1 can (karışık yük) | Orta | `t6b.mjs` |
| B6 | Kafa vuruşu tetiklenmiyor (0/36, 1/120) | Orta | `t9.mjs`, `t9b.mjs` |
| B7 | Paşa >45 m/s düşüşte zemini deliyor (y = −2809) | Düşük (oyunda yok) | `t8.mjs` (H = 150) |
| B8 | Paşa römork eklemi ezilmede limit aşımı: hitch −1,3 rad, 75 cm açılma | Düşük | `t8.mjs`, `t11.mjs` |
| B9 | Dikey basamak: tüm araçlar ≤ 0,2–0,3 m aşıyor | Bilgi (bölüm tasarımı) | `step.mjs`, `step2.mjs` |
| B10 | Köprü: durağan 1,25 t araç zayıf tahtayı koparıyor | Düşük | `t10.mjs` |
| B11 | Zıpır, tümsekte yumurta kolisi fırlıyor | Düşük | `zip2.mjs`, `zip.mjs` |

Sorun olmayanlar (ölçüldü, temiz): durgun jitter, determinizm, endless bellek/gövde sayısı, CPU, tahterevalli, 60 m düşüş tünelleme, Paşa römork normal sürüş ve frende.

Eşzamanlı çalışma uyarısı: bu rapor yazılırken `src/config.js`, `src/sim/sim.js`, `src/sim/props.js`, `src/data/levels/*` başka ekiplerce değişiyordu; Paşa bölüm sonuçları (3-2, 3-4, 4-4) bu yüzden ilk ve son ölçüm arasında farklıdır. Araç ölçümleri config değişmediği için kararlıdır (kontrol: 0→50 ve fren sonuçları yeniden alındı).
