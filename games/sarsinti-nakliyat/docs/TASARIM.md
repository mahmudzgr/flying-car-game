# Sarsıntı Nakliyat — Oyun Tasarım Belgesi (Konsept v1)

> Hedef kitle: teknik mimar, fizik programcısı, grafik, ses, arayüz, bölüm tasarımı ve test ekipleri.
> Bu belge tek referanstır. Sayılar **başlangıç değeridir ("ayarlanacak")**; his testinde değiştirilmesi serbesttir,
> ama kavramlar (kargo, yüzey, ragdoll, kombo) değişmez. Oyun kodu bu belgede yoktur.

---

## 1. Kimlik

| Alan | Değer |
|---|---|
| **Ad** | Sarsıntı Nakliyat |
| **id** (klasör) | `sarsinti-nakliyat` |
| **Tek cümle** | Yan görünüşlü, gerçek 2D fizikli bir nakliye sürüşü: yaylı süspansiyonlu aracınla bozuk yollarda, çamurda, buzda ve sallanan köprülerde kargonu devirmeden teslim et. |
| **tagline** (kart) | Kargonu devirme, kafanı da vurma! Çamurda, buzda, sallanan köprülerde yaylı süspansiyonla sür; yumurtadan piyanoya her yükü sağ salim teslim et. |
| **tags** | `Fizik`, `Araba`, `16 bölüm`, `Sonsuz mod` |
| **accent** | `#19b5a5` |
| **orientation** | `landscape` |
| **Karakter / dünya** | Sürücü **Fındık** (yuvarlak kasklı, tulumlu kurye) ve "Sarsıntı Nakliyat" adlı küçük aile şirketi. Rakipler, markalar, sloganlar özgündür; hiçbir mevcut oyundan öğe alınmaz. |

`games.js` kaydı (kapak `cover.webp` ayrı üretilecek):

```js
{
  id: 'sarsinti-nakliyat',
  title: 'Sarsıntı Nakliyat',
  tagline: 'Kargonu devirme, kafanı da vurma! Çamurda, buzda, sallanan köprülerde yaylı süspansiyonla sür; yumurtadan piyanoya her yükü sağ salim teslim et.',
  tags: ['Fizik', 'Araba', '16 bölüm', 'Sonsuz mod'],
  accent: '#19b5a5',
  orientation: 'landscape',
}
```

---

## 2. Çekirdek döngü ve "neden eğlenceli"

**Bölüm döngüsü (30–90 sn):** Araca yükle (otomatik) → bozuk araziden bitiş bayrağına sür → yolda kargonu, süspansiyonunu
ve ağırlık dengesini yönet → teslim et → puan/yıldız/kuruş → garajda yükselt → sıradaki bölüm ya da daha iyi yıldız için tekrar.

**Üst döngü:** kuruş kazan → araç aç / yükselt → daha zor biyomlara geç → daha yüksek yıldız için eski bölümlere dön.

**Neden eğlenceli**
1. **Kargo ikinci karakterdir.** Kasalar, karpuzlar, yumurta kolisi, süt bidonları, piyano gerçek fizik cisimleridir; frene
   basınca öne kayar, rampada havalanır, tümsekte sıçrar. Yolculuğu "sadece gitmek"ten "bir şeyi taşımaya" çevirir ve
   her bölümde farklı bir sürüş dili (yumuşak mı, hızlı mı?) dayatır.
2. **Okunabilir, hissedilir fizik.** Yaylı süspansiyon, ağırlık aktarımı (gazda burun kalkar, frende çöker), yüzeye bağlı
   çekiş (asfaltta yapışır, çamurda batar, buzda kayar). Oyuncu "neden böyle oldu"yu anlar → ustalaşma hissi.
3. **Abartılı ama fiziğe dayalı anlar.** Sallanan/kırılan köprü, tahterevalli, devrilen varil yığını, yuvarlanan kaya,
   peşinden gelen kar topu; kazada ragdoll sürücü ve kargo uçuşan yavaş çekim.
4. **Risk–ödül kombo.** Havada kalma, takla, tek teker (wheelie) ve "kargo havada" puanı çarpan getirir; ama kombo,
   iniş kötü olunca ya da kargo düşünce yanar. Güvenli sürmek de, cesur sürmek de çalışır.
5. **Tek parmakla öğrenilir, yıllarca öğrenilir.** İki düğme; derinlik fizikten gelir. Anında yeniden deneme (<0,5 sn) her hatayı "bir daha!"ya çevirir.

**Önceki oyunlardan farkı:** Uçan Roadster = tek rampadan fırlama + itici + iniş; Paldır Küldür = sapan + yıkım. Burada
oyuncu **sürekli yerde sürer**, hedef **yük taşımak**tır; itici yok, sapan yok, yıkım amaç değil.

---

## 3. Kontroller

### 3.1 Dokunmatik (yatay ekran, 2 düğme + duraklat)

```
┌──────────────────────────────────────────────────────┐
│ [II]                 HUD                    ( kuruş )│
│                                                      │
│                                                      │
│                                                      │
│ ┌────────┐                              ┌──────────┐ │
│ │  FREN  │ (sol alt)         (sağ alt)  │   GAZ    │ │
│ │  / ◀   │                              │    ▶     │ │
│ └────────┘                              └──────────┘ │
└──────────────────────────────────────────────────────┘
```

- **GAZ** (sağ alt, ekran genişliğinin ~%30'u, yükseklik ~%40): basılı tut = ileri sür.
- **FREN/GERİ** (sol alt, aynı boyut): basılı tut = fren; araç durduktan sonra **250 ms** daha basılı kalırsa geri vites.
- İki düğme aynı anda basılabilir (sol-gaz-fren tekniği: fren+gaz = motor freni, patinaj yönetimi; kamyonda "el freni" gibi davranır).
- Düğme hit-alanları görsel boyuttan büyüktür (min. 88×88 css px); parmak kaydığında düğme değiştirmez, basış bırakılana kadar o düğmedir. Çoklu dokunuş zorunlu. Tüm sayfada `touch-action:none`, çift dokunuş/yakınlaştırma kapalı.
- Duraklat: sağ üst küçük `II` (44×44 px). Yeniden dene: duraklatma ve başarısızlık ekranlarında; oyun içinde **ayrı düğme yok** (yanlış basış riski) — başarısızlıkta zaten otomatik teklif.

### 3.2 Klavye

| Eylem | Tuş |
|---|---|
| Gaz | `→` / `D` / `Boşluk` |
| Fren / geri | `←` / `A` |
| Yeniden dene | `R` |
| Duraklat | `Esc` / `P` |
| Müzik/ses aç-kapa | `M` |
| Menülerde | `↑↓←→` + `Enter`, `Esc` geri |

Ayrıca oyun kumandası (Gamepad API: sağ tetik gaz, sol tetik fren, Start duraklat) **P2**.

### 3.3 Yerde ve havada davranış

| Durum | GAZ | FREN/GERİ |
|---|---|---|
| **Yerde** | Arka (veya tüm) tekerlek motoru tork uygular; araç ileri gider, burun hafif kalkar (gerçek ağırlık aktarımı, fizik sonucu) | Tekerlekleri fren torkuyla yavaşlatır, durunca geri gider; burun çöker |
| **Havada (hiç teker yere değmiyor)** | Araca **geri takla torku** (burun yukarı, saat yönü tersi). Gerekçe: dönen tekerleğin tepkisi; tekerlek açısal momentumu aktarılır | **Ön takla torku** (burun aşağı); tekerlekler frenlenir |
| Yarım havada (1 teker değiyor) | Normal motor torku + hafif (%35) hava torku | Normal fren + hafif (%35) hava torku |

Havada **düğme bırakılırsa** dönüş doğal sönümle (açısal sönüm 0,35) yavaşlar; sistem otomatik düzeltme yapmaz — kontrol oyuncudadır.
İniş yardımı: araç ters (>150°) ve yere 1,2 m'den yakınsa **hafif** bir "kedi refleksi" tork (%20 hava torku) gözle görülmez biçimde iniş açısını yere paralele çeker; kapatılabilir (Ayarlar → "Yardımcı iniş"). Varsayılan **açık** (P0'da kritik değil, P1).

---

## 4. Fizik modeli

**Motor:** planck.js (Box2D). SI birimleri; yerçekimi **(0, −9,81) m/s²**. Sabit adım **1/120 s** (render 60 FPS, kare başına 2 adım),
`velocityIterations = 8`, `positionIterations = 3`. Dönüşüm: 1 m ≈ 32–56 css px (kamera yakınlaştırma; varsayılan görünüm ≈ 26 m genişlik).
Tekerlek gövdeleri `bullet = true`. Aynı anda ≤ **70 dinamik gövde** (bütçe: araç 6 + sürücü 3 + kargo ≤ 12 + dekor/engel ≤ 40).

**Zemin geometrisi:** Her bölüm bir yükseklik poliçizgisidir (**chain shape**, kenar ≤ 1,2 m, hayalet çarpışma yok). Segment başına `surface` etiketi (aşağıdaki tablo).
Köprü, tahterevalli, kütükler, kayalar, varillerin hepsi ayrı dinamik/kinematik gövde.

**Sürtünme karışımı:** Box2D varsayılanı `√(μ₁μ₂)` kullanılır **değil**; `preSolve` içinde
`friction = lastikGrip × yüzeyμ` olarak ezilir (tabloda verilen μ bu "etkin" değerdir). Yuvarlanma direnci (kum/çamur) tekerlek
`angularDamping` + gövdeye hız-orantılı sürükleme ile modellenir. Restitution: lastik 0,05; kargo 0,1–0,3 (karpuz 0,25).

### 4.1 Araç ortak yapısı

- **Şasi** gövde (kutu kompozit; tavan + kabin + kasa ayrı fikstürler, hepsi tek gövde). Kütle merkezi (CoM) fikstür yoğunluklarından gelir, ayrıca **alçak** tutulur (şasi alt plakasına ağır "motor bloğu" fikstürü).
- **Tekerlek** = daire gövde; `WheelJoint` (yay ekseni dikey) şasiye bağlı; `enableMotor`, `motorSpeed`, `maxMotorTorque`; `frequencyHz`, `dampingRatio`.
- **Sürücü Fındık:** gövde (kutu 0,35×0,55 m, 45 kg) + kafa (daire r=0,17 m, 5 kg). Gövde, koltuğa `RevoluteJoint` (sınır ±0,35 rad) + hafif yaylı `DistanceJoint` (1,5 Hz) ile bağlı; kafa gövdeye `RevoluteJoint` (sınır ±0,6 rad). Kafa-zemin teması kritik (bkz. §9). Koltuk bağları kırılınca **ragdoll**.
- **Kargo bölmesi:** kasa tabanı + önde/arkada alçak kenarlıklar (kargo kolayca *kayar/devrilir* ama kenarlık düşmeyi biraz geciktirir; **bağlama yükseltmesi** kenarlığı yükseltir). Kargo, araçla çarpışan normal dinamik gövdelerdir (bağlı değil).

### 4.2 Başlangıç değerleri (hepsi *ayarlanacak*)

| Parametre | Tosun (Pikap) | Paşa (Traktör+römork) | Zıpır (Bagi) | Koca (Kamyon) |
|---|---|---|---|---|
| Şasi kütlesi (kg) | 1100 | 1500 (+römork 300) | 600 | 3200 |
| Şasi boyutu (m) | 3,6 × 0,9 (kabin 1,4 yük.) | 2,8 × 1,0 (kabin yüksek) | 2,6 × 0,7 | 6,0 × 1,3 |
| Dingil mesafesi (m) | 2,5 | 2,2 (römork 2,6 uzakta) | 2,2 | 4,0 (+arka çift 1,1 arayla) |
| Tekerlek yarıçapı (m) | ön/arka 0,38 | ön 0,38 / arka **0,62** | 0,42 | 0,55 |
| Tekerlek kütlesi (kg) | 35 | ön 30 / arka 70 | 25 | 80 |
| Çekiş | Arkadan (RWD) | Arkadan (büyük teker) | **4×4** | Arka çift |
| Süspansiyon frekansı (Hz) | 2,2 | 1,6 | 3,2 | 1,4 |
| Sönüm oranı ζ | 0,55 | 0,70 | 0,35 (zıplak) | 0,80 |
| Yay yolculuğu (m, `lowerTranslation/upper`) | −0,12 / +0,12 | −0,10 / +0,10 | −0,22 / +0,22 | −0,10 / +0,12 |
| Motor maks. tork (N·m, tüm sürücü tekerleklerde toplam) | 1300 | 2600 | 1100 (iki tekerlek, her biri 550) | 4200 |
| Maks. teker hızı (rad/s) → araç hızı | 52 → ~20 m/s (72 km/s) | 18 → ~11 m/s | 62 → ~26 m/s | 27 → ~15 m/s |
| Fren torku (N·m) | 1800 | 2400 | 1200 | 4000 |
| Hava torku (N·m) / maks. açısal hız | 5500 / 7 rad/s | 6500 / 3 rad/s | 3200 / 9 rad/s | 12000 / 2,5 rad/s |
| Lastik tutuş çarpanı (`lastikGrip`) | 1,00 | 1,20 | 0,95 | 1,05 |
| Kargo kapasitesi (parça) | 6 | 10 (römorkta) | 3 | 10 |
| Aerodinamik sürükleme (½ρCdA, N·s²/m²) | 0,55 | 0,45 | 0,35 | 0,90 |

Hesap kontrolü (Tosun, asfalt): teker kuvveti = 1300/0,38 ≈ 3420 N → a ≈ 3420/1280 ≈ **2,7 m/s²**, 0→20 m/s ≈ 7,5 sn (başlangıç hızı hissi: tatlı ama ağır).
Tutuş sınırı = μ·N_arka ≈ 1,0·(~6500 N) = 6500 N > 3420 N ⇒ asfaltta patinaj yok; buzda 0,12·6500 ≈ 780 N ⇒ patinaj ve çaresizlik. (Hedeflenen his.)
Hava torku kontrolü: Eylemsizlik ≈ 1350 kg·m² ⇒ 5500/1350 ≈ 4 rad/s²; tam takla ≈ 1,8 sn (büyük atlayışlarda mümkün, küçük atlayışlarda zor ⇒ iyi risk/ödül).

### 4.3 Zemin türleri (etkin μ, yuvarlanma direnci, davranış)

| Yüzey | μ (etkin) | Yuvarlanma direnci (teker `angularDamping`) | Ek davranış |
|---|---|---|---|
| Asfalt | 1,00 | 0,10 | Kesin kavrama; fren mesafesi kısa |
| Toprak yol | 0,80 | 0,25 | Hafif toz |
| Çimen | 0,70 | 0,35 | Hafif yavaşlatır |
| Çakıl / taş | 0,75 | 0,30 | Titreşim (kamera mikro sarsıntı) |
| Kum | 0,60 | 1,20 | Hızla batan "yumuşak" his: v>10 m/s'de ek sürükleme −%25; ağır araçlar saplanır |
| Çamur | 0,55 | 1,60 | Düşük hızda tutunur ama batar; yüksek gazla tekerlek "kazır" (patinaj bayrağı), sıçrama partikülleri |
| Islak kaya / tahta | 0,50 | 0,15 | Sessiz kayma |
| Kar | 0,35 | 0,70 | İz bırakır |
| Buz | 0,12 | 0,05 | Neredeyse sürtünmesiz; yan kayma, frende bile uzun mesafe |
| Su (kıyı/göl) | — | Sürükleme 3,0 | Araç yüzmez; 1,5 sn suda kalırsa başarısızlık; kütükler/yüzen platformlar kaldırma kuvveti alır (P1) |

Yüzey, **tekerleğin teması** üzerinden okunur (teker başına ayrı). Patinaj göstergesi: `|teker çevresel hızı − zemin hızı| > 3 m/s` ⇒ `wheelspin` olayı, toz/çamur/kar partikülü, ses.

### 4.4 Kargo ve nesne kütleleri

| Nesne | Boyut (m) | Kütle (kg) | Dayanıklılık | Değer (kuruş) | Not |
|---|---|---|---|---|---|
| **Kasa** | 0,70 × 0,70 | 25 | Sağlam; sadece kaybolursa gider | 20 | İstiflenebilir |
| **Karpuz** | r = 0,20 | 6 | Çarpma hızı >9 m/s ⇒ patlar | 25 | Yuvarlanır, restitution 0,25 |
| **Yumurta kolisi** | 0,6 × 0,3 | 1,5 | 6 "yumurta can" — göreli çarpma >3,5 m/s her darbede 1 can (en fazla 2/darbe) | 15 + 10/yumurta | En hassas yük |
| **Süt bidonu** | 0,4 × 0,7 | 20 | Sağlam; devrilince yuvarlanır | 22 | Yüksek kütle merkezi ⇒ devrilmeye yatkın |
| **Piyano** | 1,5 × 1,1 | 180 | Çarpma >8 m/s ⇒ "kırık" (değer %50) | 150 | Ağırlık aktarımını bozar; süspansiyonu ezer (P1) |
| **Balya** | r = 0,45 | 40 | Sağlam | 18 | Yumuşak, restitution 0,05 |
| Yağ varili (engel) | r = 0,3 × 0,9 | 30 | — | — | Devrilen yığınlar |
| Kaya (tetikli) | r = 0,8–1,2 | 400–900 | — | — | Yuvarlanma tehlikesi |
| Kar topu (kovalayan) | r = 1,6 | 1500 | — | — | Arkadan gelir (4.2 bölümü) |
| Köprü tahtası | 1,0 × 0,2 | 30 | — | — | Halat bağlantıları, kırılma eşiği |
| Tahterevalli | 8,0 × 0,3 | 200 | — | — | Menteşe, ±0,45 rad sınır |

**Kargo kaybı:** parça, aracın 8 m gerisinde kalır, çukura/suya düşer ya da yerde 2 sn hareketsizken araçtan >4 m uzaktaysa "kayıp".
**Köprü/şalter kuralları:** halatlı köprü eklemleri `maxForce` eşiğini aşarsa kırılır (köprü bölümlerinde yalnızca belirli tahtalar).

### 4.5 Fiziği eğlenceli yapan bilinçli "hile"ler (kayıt altında)

- Kütle merkezi gerçekten daha alçaktır (takla yine mümkün ama ters dönmek "kolay" değil).
- Şasi–zemin sürtünmesi 0,4 (tavanın üstünde kaymak kolay ⇒ ters dönünce sıkışma az).
- Aerodinamik, fren ve tork "hissi" için hız arttıkça **eğri** (maks. hıza yaklaşırken tork lineer düşer).
- Hava torku gerçek eylemsizlikle uyumlu değil, kasten güçlü (kombo oyuncu kontrolünde).
- Kargoya **hafif** ek yer çekimi (×1,15) verilir: sıçramalar kısa sürer, kargo araçta kalır. Ayarlanacak.
- Kritik: tüm bu değerler `config.js` içinde tek yerde toplanır (programcıya not).

---

## 5. Araçlar

| # | Ad | Rol / his | Temel istatistikler (1–5) | Açılma |
|---|---|---|---|---|
| 1 | **Tosun** (pikap) | Dengeli, öğretici, sevimli. Yay yumuşak, kargo yatağı geniş | Hız 3, Çekiş 3, Denge 3, Kapasite 3, Hava 3 | Baştan açık |
| 2 | **Zıpır** (bagi) | Hafif, çevik, 4×4, çok zıplak ⇒ havada kombo ustası. Kargo az, kırılgan taşıma zor | Hız 5, Çekiş 4, Denge 2, Kapasite 1, Hava 5 | 12 yıldız + **1 100** kuruş |
| 3 | **Paşa** (traktör + römork) | Yavaş ama durdurulamaz; çamur/kum/tırmanış kralı; römork **eklemli** (jackknife, savrulma) | Hız 1, Çekiş 5, Denge 4, Kapasite 4, Hava 1 | 22 yıldız + **2 200** kuruş |
| 4 | **Koca** (kamyon) | Ağır, süspansiyon yumuşak; piyano ve çok kargo; küçük engelleri ezer, havada hantal | Hız 2, Çekiş 4, Denge 5, Kapasite 5, Hava 1 | 34 yıldız + **3 600** kuruş |

*Sıralama gerekçesi:* P0'da yalnızca **Tosun + Zıpır** (iki zıt karakter: dengeli vs. zıplak) vardır; Paşa/Koca P1.

**Silüet fikirleri** (okunabilirlik: bir bakışta ayırt edilir): Tosun = kaputlu, açık kasalı, yuvarlak far; Zıpır = tüp çerçeveli, açık, kocaman kabarık lastikli, tepede bayrak anteni; Paşa = büyük arka tekerlekli, egzoz borusu duman yapar, römorka çubuk bağlı; Koca = uzun burunlu, basık kabin, çift arka akslı.

**Renk özelleştirme (P2):** her araç için 4 boya (başarım ile açılır).

---

## 6. Oyun modları

| Mod | Açıklama | Öncelik |
|---|---|---|
| **Siparişler** (kampanya) | 4 bölge × 4 bölüm = 16 bölüm, yıldız ve kuruş | **P0** (8 bölüm), P1 (16) |
| **Uzun Yol** (sonsuz) | Parça havuzundan sürekli üretilen yol; kargo hep eklenir; amaç mesafe ve kargo değeri. Ölünce biter, rekor kaydedilir | **P1** |
| **Günlük Rota** | Tarihten türetilen tohumla herkese aynı Uzun Yol; yalnızca yerel rekor | P2 |
| **Deneme Alanı** | Serbest arazi; kargo/zemin/biyom seçip oyna, fizik oyuncağı | P2 |

Sonsuz yol üretimi: 40–80 m'lik "parça" (ör. tümsek dizisi, rampa+iniş, köprü, çamur kesiti) şablonları, ardışık zorluk; her 400 m'de biyom değişir; kargo her 150 m'de bir teslim noktası (kuruş) olur.

---

## 7. Bölgeler ve bölümler

Zorluk: 1 (çok kolay) – 5 (zor). Yıldız: ★1 hep "bitişe ulaş"; ★2 ve ★3 aşağıdaki koşullar.
Bölüm uzunluğu ≈ (hedef süre × ortalama hız); süreler 30–90 sn. **P0 = Bölge 1 + Bölge 2** (8 bölüm).
Bölgeler yıldızla açılır: Bölge 2 → **5★**, Bölge 3 → **14★**, Bölge 4 → **24★** (toplam 48★).
Bölümler sırayla açılır (önceki bölümden ≥1★). Her bölüm Tosun ile geçilebilir; yıldız hedefleri Tosun taban değerleri baz alınarak yazılmıştır (başka araç ek fark yaratır: ★3 için "aracın önerilen seviyesi" bölüm ekranında gösterilir).

### Bölge 1 — Elma Vadisi (zorluk 1–2; asfalt/toprak/çimen)

| # | Ad | Amaç / uzunluk | Öne çıkanlar | ★2 | ★3 | Zor. | Öğretir |
|---|---|---|---|---|---|---|---|
| 1-1 | **İlk Sipariş** | 3 kasayı çiftlikten pazara götür (320 m, ~35 sn) | Hafif tepeler, düz yol, 1 küçük rampa | 3 kasadan 3'ü teslim | ≤ 40 sn | 1 | Gaz/fren, süspansiyon, kargo kayması |
| 1-2 | **Karpuz Mevsimi** | 6 karpuzu teslim et (420 m, ~45 sn) | Tümsek dizisi, yuvarlanan karpuzlar, iki çukur | ≥5 karpuz | 6/6 + ≤ 55 sn | 1–2 | Ağırlık aktarımı, yumuşak fren |
| 1-3 | **Yumurta Seferi** | 1 yumurta kolisi (6 yumurta) + 2 kasa; dik inişler (500 m, ~55 sn) | Dik iniş, tahta tümsekler, kısa asfalt | ≥3 yumurta | 6/6 yumurta | 2 | Hassas sürüş; hız ↔ güvenlik |
| 1-4 | **Samanlık Sıçrayışı** | Rampalarla vadiyi aş, 4 balya + 2 kasa (600 m, ~60 sn) | 3 rampa, boşluklar, **havada kontrol** | Bir iniş + 1 takla | 2 taklalı kombo ≥ ×3 | 2 | Hava kontrolü, kombo |

### Bölge 2 — Kızıl Kanyon (zorluk 2–3; kum, taş, çakıl, tahta köprü)

| # | Ad | Amaç / uzunluk | Öne çıkanlar | ★2 | ★3 | Zor. | Öğretir |
|---|---|---|---|---|---|---|---|
| 2-1 | **Kum Geçidi** | 5 bidon (500 m, ~60 sn) | Kum tepeleri, yüksek yuvarlanma direnci, kumda kalma | Tümü teslim | ≤ 70 sn + hiç geri vites yok | 2 | Yüzey farkı, momentum, patinaj |
| 2-2 | **Sallanan Köprü** | 3 kasa + 2 karpuz; 36 m asma köprü (450 m, ~55 sn) | Halatlı köprü, bazı tahtalar zayıf, rüzgâr | Köprüden kargosuz kayıpsız | Köprüde 0 kargo kaybı **ve** köprü sağlam | 3 | Yavaş sürüş, dinamik yüzey |
| 2-3 | **Kaya Yağmuru** | 4 kasa, kovalamaca (600 m, ~60 sn) | Tetiklenen yuvarlanan kayalar, sığınaklar, yamaç | Kayaya çarpmadan | ≤ 55 sn | 3 | Zamanlama, kaçış |
| 2-4 | **Kanyon Atlayışı** | 5 kasa + 1 yumurta; geniş boşluk (700 m, ~75 sn) | Geniş atlama, ön sıra hız şartı, iniş rampası | İki boşluk, 4+ kargo | 1 takla + sağlam iniş + 5+ kargo | 3 | Hız kazanma, iniş açısı |

### Bölge 3 — Sisli Bataklık (zorluk 3–4; çamur, tahta iskele, su, tahterevalli) *(P1)*

| # | Ad | Amaç / uzunluk | Öne çıkanlar | ★2 | ★3 | Zor. | Öğretir |
|---|---|---|---|---|---|---|---|
| 3-1 | **Çamur Banyosu** | 6 kargo, çamur yolu (550 m, ~70 sn) | Derin çamur, kaçırılan gaz, çekiş | Takılmadan bitir | 70 sn altında + tümü teslim | 3 | Gaz modülasyonu, tekerlek kazıması |
| 3-2 | **Tahterevalli Tepesi** | 4 kasa + 2 bidon (500 m, ~60 sn) | Dengesiz tahterevalliler, dar tahtalar | Tümü teslim | Tahterevalliyi hiç yere değdirmeden | 4 | Ağırlık aktarımı, denge noktası |
| 3-3 | **Kütük Nehri** | 5 kargo; yüzen kütükler (480 m, ~65 sn) | Kaldırma kuvvetli kütükler, suya düşme | Suya düşmeden | Tümü teslim + ≤ 75 sn | 4 | Dinamik platform |
| 3-4 | **Balık Pazarı Acelesi** | 6 karton + varil yığını; **süre sınırı 60 sn** (600 m) | Devrilen varil dominoları, çamur, rampalar | Süre bitmeden | ≤ 45 sn | 4 | Baskı altında sürüş |

### Bölge 4 — Zirve Köyü (zorluk 4–5; kar, buz, yamaç, ağır yük) *(P1)*

| # | Ad | Amaç / uzunluk | Öne çıkanlar | ★2 | ★3 | Zor. | Öğretir |
|---|---|---|---|---|---|---|---|
| 4-1 | **Buz Pateni** | 5 kargo (500 m, ~60 sn) | Buz kıvrımları, düşük sürtünme, frenleme planı | Hepsi teslim | ≤ 60 sn, kazasız | 4 | Buz kontrolü |
| 4-2 | **Kar Topu Kaçışı** | 4 kasa; peşindeki dev kar topu (700 m, ~65 sn) | Arkadan yaklaşan 1500 kg kar topu, yamaç | Yakalanmadan | ≤ 55 sn + 4/4 kargo | 5 | Hız yönetimi |
| 4-3 | **Piyano Taşıma** | 1 piyano + 2 kasa (550 m, ~75 sn) | Piyano (180 kg) ağırlık aktarımı bozar, rampa, buz yaması | Piyano sağlam | Piyano + tüm kasalar sağlam | 5 | Ağır yük dinamiği |
| 4-4 | **Zirve Teslimatı** | Karışık yük; **bitirme bölümü** (900 m, ~90 sn) | Her şeyin birleşimi: buz, çamur, köprü, tahterevalli, rampa | Kargo kaybı ≤ 1 | Tümü teslim + ≥ ×4 kombo | 5 | Final |

**Zorluk eğrisi:** 1 – 1.5 – 2 – 2 | 2 – 3 – 3 – 3 | 3 – 4 – 4 – 4 | 4 – 5 – 5 – 5. Her bölgede yeni bir mekanik **ilk bölümde güvenle** öğretilir (bölge içinde ilk kez, tehlikesiz), sonra ikinci bölümde sınanır. Her bölge sonunda "mini final" (x-4) bölgede öğretilenin birleşimidir.

---

## 8. Puanlama, kombolar, ekonomi

### 8.1 Puan (bölüm sonu skoru)

| Kaynak | Puan |
|---|---|
| Mesafe | 1 puan / m |
| Teslim edilen kargo | kargo değeri (§4.4) × 10 |
| Sağlam bonus (hiç hasarsız tüm kargo) | +%25 |
| Süre bonusu | (hedef süre − süre) × 10 (≥ 0) |
| Havada kalma | 20 puan / sn (≥ 0,6 sn'lik atlayışlar) |
| Takla (360° tamamlanan) | 150 / takla (iniş başarılıysa) |
| Tek teker (wheelie, ≥ 1 sn) | 40 / sn |
| "Kargo havada" (araçla birlikte ≥ 0,8 sn havada ve tüm kargo araçla) | +100 |
| Kıl payı (yuvarlanan kaya/engel <0,6 m'den geçiş) | +60 |

### 8.2 Kombo

- Her puanlanan "hareket" **kombo sayacını** +1 yapar, **çarpan** = 1 + ⌊sayaç/2⌋ (maks. ×5).
- Kombo **3 sn** içinde yeni hareket gelmezse banka yazılır (puan × çarpan).
- Kombo **yanar** (puan kaybolur): kafa vuruşu/kaza, kargo kaybı, ters dönüp kalma, kötü iniş (şasi çarpması > 6 m/s).
- İniş **tamam** sayılır: ≥ 2 teker yere değip şasi tavanı yerde değilse.
- Kombo çarpanı **yalnızca atlayış/hareket puanlarına** uygulanır (kargo değeri sabit; kargoyu risk etmek için kombo kovalamaya gerek kalmaz).

### 8.3 Kuruş (para) ve ödüller

| Kaynak | Kuruş |
|---|---|
| Bölüm tamamlama (ilk kez / tekrar) | `taban` (bölüm tablosunda) / `taban × 0,5` |
| Her yıldız (ilk kazanış) | +40 / +80 / +150 (★1/★2/★3) |
| Puan → kuruş | skor ÷ 20 (üst sınır bölüm başına 300) |
| Yolda toplanan "madeni kuruş" | 5 kuruş / adet (bölüm başına 20–40 adet, nedenli yerleştirilir) |

`taban`: Bölge 1 = 60–90, Bölge 2 = 110–150, Bölge 3 = 170–220, Bölge 4 = 250–320.
Hedef gelir (**ayarlanacak**): ilk geçişte bölüm başına ~**250 kuruş** (iyi oyunda 400+).

### 8.4 Yükseltmeler (araç başına, **3 hat × 4 kademe**)

| Hat | Etki (kademe başına) |
|---|---|
| **Motor** | Maks. tork +%10, maks. hız +%3 |
| **Süspansiyon** | Frekans +%4, sönüm +%5, yay yolculuğu +%6 (daha yumuşak ve kontrollü) |
| **Lastik** | Grip çarpanı +0,05; kum/çamurda yuvarlanma direnci −%7 |

(Ek P1: **Bağlama** — kargo kenarlığı yüksekliği +0,08 m/kademe, kargo kaybı mesafesi +1 m.)

| Kademe | 1 | 2 | 3 | 4 | Hat toplamı |
|---|---|---|---|---|---|
| Maliyet (kuruş) | 100 | 180 | 300 | 480 | **1 060** |

Üç hat = 3 180 kuruş / araç. Kademeler yalnızca ilgili araca bağlıdır. Satış/geri alma yok; ancak **yükseltme sıfırlaması**
(Garaj'da ücretsiz) harcanan miktarı **%100** iade eder (cezasız deneme ⇒ adalet). Açılış fiyatları §5'te.

**Denge notu (progression):** Kampanya (16 bölüm, ilk geçiş) ≈ 4 000 kuruş + tekrar/yıldız ≈ 2 500 + Uzun Yol; tüm araçlar + yükseltmeler ≈ 16 300 kuruş ⇒ yaklaşık 3–4 saatlik oynanış. Oyun **kademe 0 araçla da tam yıldız** ile bitirilebilir (zorlayıcı); yükseltme oyuncuyu **ödüllendirir, kilidi açmaz**.
Hiçbir ödeme gerçek para/reklam içermez.

---

## 9. Başarısızlık koşulları ve yeniden deneme

| Koşul | Tanım | Ne olur |
|---|---|---|
| **Kafa vuruşu** | Sürücü kafası zemine/engele göreli hız > **6 m/s** ile çarparsa ya da kafa sıkışırsa (tavan ile zemin arasında > 0,3 sn) | Koltuk bağları kopar ⇒ **ragdoll** fırlama + yavaş çekim |
| **Ters kalma** | Araç ters (tavan yerde / > 120°) ve hız < 1 m/s, **2 sn** boyunca | "Devrildin!" ⇒ başarısız |
| **Kargo yetersiz** | Teslim edilebilir kargo < bölüm min. şartı | Bitiş bayrağında "Kargo yetmedi" ⇒ başarısız (ya da ★ kaybı) |
| **Uçurum/su** | Kill çizgisinin altı ya da suda 1,5 sn | Anında başarısız |
| **Süre** | Yalnızca süreli bölümlerde (3-4 vb.) | Süre dolunca başarısız |
| **Kovalamaca** | Kaya/kar topu aracı ezerse | Başarısız |

**Yeniden deneme akışı:** Başarısızlıkta 0,6 sn yavaş çekim/ragdoll izlenir, sonra altta **"TEKRAR DENE" (otomatik vurgulu)** + "Menü" düğmeleri;
herhangi bir dokunuş/`Enter`/`R` **<0,4 sn** içinde bölümü sıfırdan yükler (varlıklar önbellekte, bölüm yeniden kurulur, ekranda yükleme yok).
Bölümün başarısızlık sayacı sonuç ekranında tutulur (istatistik). Her başarısızlıkta mini ipucu (örn. "Frenle daha erken yavaşla"). P1: ortada **kontrol noktası** bayrağı (uzun bölümlerde yeniden doğma, yıldız değerlendirmesi geçerli kalır: kontrol noktasından başlamak ★3'ü engeller).

---

## 10. Ekran akışı ve HUD

```
Ana Menü ──► Siparişler ──► Bölge/Bölüm seçimi ──► (Bölüm ön ekranı: hedefler, araç) ──► OYUN
   │            │                                                              │   ▲
   │            └─► Uzun Yol (P1) ─────────────────────────────────────────────►│   │
   ├──► Garaj (araç seçimi, yükseltme, açma)                                   ▼   │
   ├──► Ayarlar                                                          Duraklat ──┘
   └──► « Oyunlar  (seçim ekranına döner)                                       │
                                            Sonuç ekranı ◄─────────────────────┘
                                         (Tekrar / Sonraki / Garaj / Menü)
```

- **Ana menü:** büyük logo/animasyonlu araç; *Oyna (Siparişler)*, *Uzun Yol* (P1), *Garaj*, *Ayarlar*, **sol üstte `‹ Oyunlar`**: `<a href="../../" data-hub-back>Oyunlar</a>` + `<script src="../../hub/back.js" defer></script>`; **yalnızca ana menüde görünür**, oyun sırasında HUD'u kapatmaz.
- **Bölüm seçimi:** 4 bölge sekmesi; bölüm kartı = ad, 3 yıldız, en iyi skor, kilit/yıldız şartı. Kaydırma kolay, parmakla.
- **Bölüm ön ekranı (panel):** kargo ikonları, ★ koşulları (okunaklı), seçili araç ve "Başla". 1 dokunuşla geç.
- **Garaj:** araç kaydırma (yan yana), istatistik çubukları, yükseltme (3 hat), satın al/aç; kuruş göstergesi; boya (P2).
- **Oyun içi HUD** (alt düğmeler hariç): 
  - Üst-orta: **İlerleme çubuğu** (araç + bayrak, kargo uyarıları) ve mesafe (m).
  - Üst-sol: **Kargo satırı** (her parça bir ikon; hasarlı = çatlak, kayıp = soluk; yumurta kolisi yumurta sayacı).
  - Üst-sağ: kuruş + duraklat düğmesi.
  - Orta-alt: **hız göstergesi** (küçük, km/s) ve **kombo** (çarpan + sayaç çubuğu, 3 sn'lik halka).
  - Süreli bölümlerde süre; kovalamaca bölümlerinde "tehlike" ok göstergesi.
  - Anlık ipucu metni (ilk bölümlerde, 1,5 sn).
- **Duraklat:** Devam, Yeniden Dene, Ayarlar (ses/müzik/titreşim), Menü. Oyun arka plana alınınca (visibilitychange) otomatik duraklat.
- **Sonuç ekranı:** yıldızlar sırayla dolar (tok ses), skor dökümü, kuruş sayacı (sayarak artar), "Tekrar", "Sonraki", "Garaj". Başarısızsa: nedeni ve kısa ipucu.
- **Ayarlar:** Ses efektleri, Müzik, Ekran sarsıntısı (kapalı/az/tam), Titreşim, Yardımcı iniş, Grafik kalitesi (Yüksek/Düşük), Dokunmatik düğme boyutu, İlerleme sıfırla (çift onay), Yedek kodu al/yükle (P2).

Tüm metinler Türkçe, `lang="tr"`, ek: "ç ğ ı ö ş ü İ" glifleri destekleyen sistem yazı tipi yığını (ör. `system-ui, "Trebuchet MS", sans-serif`; harici font dosyası yok, ağır başlıklar için Canvas ile çizilen kalın yuvarlak yazı).

---

## 11. "Juice" listesi

| Alan | Efekt |
|---|---|
| **Kamera** | Yumuşak takip (sönümlü yay, ~0,25 sn); hızla uzaklaşır (genişlik 24 → 32 m); **ileri bakış** (hız yönünde +%25 ekran); havada yukarı/aşağı bakış payı; iniş sonrası hafif "sıçrama" (yay); araç ekranın **sol üçte birinde**. Büyük atlayışlarda zoom-out |
| **Ekran sarsıntısı** | Çarpma hızı ile orantılı (0–10 px, 0,2 sn sönümlü); kum/çakılda mikro titreşim; ayarlardan kapatılabilir |
| **Yavaş çekim** | Kafa vuruşu/ragdoll 0,35× (1,0 sn); "kargo havada kurtarma" 0,6× (0,4 sn); bitişte "fotofiniş" 0,5× (0,5 sn); büyük iniş 0,7× |
| **Partiküller** | Toz (toprak/kum), çamur sıçraması, kar tozu, kıvılcım (metal-taş), duman (egzoz, Paşa), kargo parçaları (yumurta sarısı, karpuz suyu, kasa kıymığı), kuruş kıvılcımı |
| **Araç** | Süspansiyon yay animasyonu (görsel), ön/arka çökme, tekerlek dönüşü, kargo seken kasalar, sürücü başı ve kolları fizik ile sallanır |
| **Kargo geri bildirimi** | Hasar anında kısa kırmızı flaş + "-1 yumurta" metni; kargo kaybında HUD'da kapalı ikon + düşme sesi |
| **Kombo** | Büyük çarpan metni (×3!), yanışta duman efekti, kombo halkası |
| **Zemin** | Tekerlek izleri (kar/çamur), yüzey değişiminde kamera farkı (ses/parçacık) |
| **Dünya** | Rüzgâr, yaprak/toz parçacıkları, hareketli ağaç/ot (vektör sallanma), bataklık sisi, kanyonda güneş ışığı demetleri |
| **UI** | Yıldız çıtırtısı, kuruş sayma, düğme "pop" (80 ms), kart kaydırma ataleti |
| **Titreşim** | `navigator.vibrate`: çarpma 10–30 ms, ragdoll 60 ms (ayarlardan kapatılabilir) |

---

## 12. Sanat yönü

**Stil:** Canvas 2D vektör, **yumuşak "kâğıt oyuncak" görünüm**: kalın (2–3 px) koyu kontur, düz renk + tek tonda gölge,
hafif doku yok (performans), köşeleri yuvarlatılmış şekiller. Gölge: kısa, araç altı yumuşak ellipse. Parallax 3 katman
(uzak: yumuşak silüet, orta: ağaç/kaya, yakın: ot/çalı). Yazı tipi: sistem sans-serif, kalın.

**Biyom paletleri**

| Biyom | Gökyüzü (üst → alt) | Uzak | Orta | Zemin üstü / dolgu | Vurgu |
|---|---|---|---|---|---|
| **Elma Vadisi** | `#8fd3ff` → `#e3f6ff` | `#9ec7a0` | `#6fb06f` | `#5aa05a` / `#8b6a4a` | `#e8453c` (elma kırmızısı) |
| **Kızıl Kanyon** | `#ffcf8a` → `#ffefd0` | `#d98e6b` | `#b8603f` | `#d9a066` / `#9a5a3c` | `#2e86ab` (gökyüzü mavisi, tezat) |
| **Sisli Bataklık** | `#7fa89a` → `#c5d8cc` | `#6a8a82` | `#4b6b5a` | `#5a6b3a` / `#3b3a2a` | `#f0c83c` (fener sarısı) |
| **Zirve Köyü** | `#b7d7f2` → `#f4f9ff` | `#c9d6e6` | `#8fa5bf` | `#f3f8ff` / `#9fb3c8` | `#ff7a3c` (kırmızı kazak turuncusu) |

**Okunabilirlik kuralları**
1. Oyuncu araç ve **kargo** her zaman biyomdan **daha doygun** ve kontürlüdür; arka plan %30 daha soluk.
2. Zemin yüzeyinin üst çizgisi (kontur) **her zaman** koyu ve kalındır; yüzey türü zemin üstü doku/renkle ayırt edilir (kum: noktalı; çamur: koyu kahve parlak; buz: açık mavi parlak; kar: beyaz).
3. Tehlikeler (kaya, kar topu, zayıf tahta) **kırmızı/turuncu bir işaret** (ünlem, çatlak) taşır; çarpışma geometrisi görünürle aynıdır.
4. Düğmeler yarı saydam (%55), basınca dolu; HUD metni koyu kontur.
5. Renk körlüğü: kritik durumlar yalnızca renkle değil **ikon/şekil** ile de verilir.
6. Tüm sahneler 360×640 mantıksal yüksekliğine de sığar (küçük telefon).

**Araç silüetleri**: §5. Sürücü Fındık: yuvarlak sarı kask, büyük göz, turuncu tulum; ragdoll'da ifade değişir (şaşkın).
Kargo: kasa = açık ahşap + metal köşe, karpuz = çizgili yeşil/koyu, yumurta kolisi = krem + kırık yumurta işareti, bidon = mavi/gri, piyano = siyah + beyaz tuşlar, balya = sarı sarmal.

---

## 13. Ses ve müzik

**Teknik:** Web Audio API, **tamamı sentezlenir** (harici ses dosyası yok); ilk dokunuşta bağlam açılır; `visibilitychange`'de durur.

**Motor sesi** (RPM ↔ tekerlek/hız; yük ↔ ton/low-pass):

| Araç | Karakter |
|---|---|
| Tosun | Sıcak 4 silindir: testere + kare dalga karışımı, 60–180 Hz, hafif "pat-pat" boşta |
| Zıpır | Tiz, cıvıl cıvıl 2 zamanlı vızıltı: 120–420 Hz, hızlı yükselir, sesli vites geçişi hissi |
| Paşa | Derin, yavaş "tak-tak-tak" dizel: 35–90 Hz darbe, egzoz basıncı |
| Koca | Kalın, ağır; düşük gürleme 40–110 Hz + türbin hışırtısı |

**SFX listesi:** gaz/fren (motor yüküne göre), tekerlek patinajı (kum/çamur/kar/buz ayrı), süspansiyon çarpması (alt/üst limit), yüzey değişimi, tekerlek-yer teması (yüzeye göre), iniş (hıza göre 3 kademe), şasi çarpması, kargo darbesi (kasa/karpuz/yumurta/bidon/piyano), karpuz patlaması, yumurta çatlaması, kargo kaybı, köprü gıcırtısı/kopması, tahterevalli gıcırtısı, kaya yuvarlanması, su sıçraması, kuruş toplama, kombo artışı (yükselen nota), kombo yanışı, takla "vızz", tek teker, kafa vuruşu/ragdoll ("pof!"), yavaş çekimde ses perde düşümü, bayrak/teslim, yıldız kazanma, UI tıklama/geçiş.

**Müzik ruh hali** (kısa döngüler, 16–32 ölçü, sentez; menüde ayrı döngü):

| Biyom | Ruh hali | Tempo |
|---|---|---|
| Menü | Neşeli, sıcak (ukulele benzeri pluck) | 96 |
| Elma Vadisi | Hafif folk, akustik gitar benzeri, yaylanan ritim | 108 |
| Kızıl Kanyon | Western esintili, sıcak bas, hafif tremolo gitar | 100 |
| Sisli Bataklık | Gizemli, hafif blues; su damlası ve kurbağa ritmi | 88 |
| Zirve Köyü | Parlak çan/çelesta, tempo artışlı; heyecanlı | 116 |

Dinamik katman: oyun hızı arttıkça perküsyon katmanı açılır (iç dinamik müzik, P1).

---

## 14. Oyun olayları (olay adı → taşıdığı veri)

Tek bir `EventBus` (`emit(ad, veri)`, `on(ad, fn)`). Zaman (`t`) = bölüm süresi (sn). Hız m/s, açı rad, konum metre.

| Olay | Veri |
|---|---|
| `levelStart` | `{levelId, biome, vehicleId, cargo:[{type,count}], bestScore}` |
| `levelEnd` | `{result:'win'\|'fail', reason, score, stars, time, cargoDelivered, cargoLost, coins}` |
| `pause` / `resume` | `{}` |
| `throttle` | `{on:boolean}` |
| `brake` | `{on:boolean}` |
| `engine` | `{vehicleId, rpm:0..1, load:0..1, speed}` (her kare) |
| `wheelContact` | `{wheel:'front'\|'rear', surface, started:boolean}` |
| `surfaceChange` | `{wheel, from, to}` |
| `wheelspin` | `{wheel, surface, slip}` (patinaj sürerken ~10 Hz) |
| `suspension` | `{wheel, compression:0..1, bottomOut:boolean}` |
| `airborne` | `{startT}` |
| `land` | `{impactSpeed, tilt, wheels, clean:boolean, airTime}` |
| `flip` | `{count, direction:'back'\|'front', airTime}` |
| `wheelie` | `{duration}` |
| `bodyHit` | `{speed, part:'roof'\|'cab'\|'chassis', normal}` |
| `cargoHit` | `{id, type, speed, damage}` |
| `cargoDamage` | `{id, type, hpLeft}` |
| `cargoLost` | `{id, type, reason:'fell'\|'water'\|'broke'\|'left'}` |
| `cargoDelivered` | `{id, type, value, hpLeft}` |
| `comboChange` | `{count, multiplier, timeLeft}` |
| `comboBank` | `{points, multiplier}` |
| `comboBurn` | `{reason, lostPoints}` |
| `coin` | `{value, pos}` |
| `driverEject` | `{headSpeed, pos}` (ragdoll) |
| `crash` | `{reason, pos}` |
| `bridgeStress` / `bridgeBreak` | `{id, stress:0..1}` / `{id, pos}` |
| `hazardTrigger` | `{id, type:'rock'\|'snowball'\|'barrels', pos}` |
| `nearMiss` | `{id, distance}` |
| `checkpoint` | `{id, pos}` |
| `slowmo` | `{scale, duration, reason}` |
| `starEarned` | `{index:1..3}` |
| `purchase` / `upgrade` | `{item\|vehicleId+line, cost, level}` |
| `toast` | `{text, icon}` (HUD ipuçları) |

---

## 15. Kayıt verisi

**`localStorage` anahtarı:** `sarsinti.v1` (başka anahtarlara — `roadster-flip-save-v1…`, `paldirkuldur.v1` — dokunulmaz).
Yedekleme anahtarı yok (tek anahtar); bozuk JSON ise varsayılana dön, eski veriyi `sarsinti.v1.bak` altında sakla.

```json
{
  "v": 1,
  "coins": 0,
  "vehicle": "tosun",
  "vehicles": {
    "tosun": { "owned": true, "up": { "motor": 0, "suspansiyon": 0, "lastik": 0 } },
    "zipir": { "owned": false, "up": { "motor": 0, "suspansiyon": 0, "lastik": 0 } },
    "pasa":  { "owned": false, "up": { "motor": 0, "suspansiyon": 0, "lastik": 0 } },
    "koca":  { "owned": false, "up": { "motor": 0, "suspansiyon": 0, "lastik": 0 } }
  },
  "levels": {
    "1-1": { "stars": 3, "best": 1840, "bestTime": 31.4, "tries": 4 }
  },
  "endless": { "bestDistance": 0, "bestScore": 0, "runs": 0 },
  "stats": { "distance": 0, "flips": 0, "airTime": 0, "cargoDelivered": 0, "cargoLost": 0, "crashes": 0, "playTime": 0 },
  "settings": { "sfx": 1, "music": 0.7, "shake": 2, "haptics": true, "assistLanding": true, "quality": "high", "btnScale": 1 },
  "tutorial": { "seen": ["throttle", "brake", "air"] }
}
```

Kurallar: sürüm alanı `v`; yeni sürümde göç fonksiyonu; her yazma `try/catch`; bölüm sonunda ve garajda **debounce'lu** kaydet (≤1/sn).
"İlerleme sıfırla" yalnızca bu anahtarı siler.

---

## 16. Öncelik tablosu

| Alan | **P0** (tek başına bitmiş, eğlenceli oyun) | **P1** | **P2** |
|---|---|---|---|
| Fizik | planck.js, araç (WheelJoint), yüzey μ (asfalt, toprak, çimen, kum, taş), hava torku, sürücü + ragdoll, kargo (kasa, karpuz, yumurta, bidon, balya), kamera | Su/yüzdürme, yardımcı iniş, römork (Paşa), piyano, çamur/kar/buz, köprü kırılması, tahterevalli | Rüzgâr alanları, ek zemin türleri |
| Araç | **Tosun, Zıpır** (iki zıt karakter) | Paşa, Koca | Boya/özelleştirme |
| Bölüm | **8 bölüm** (Bölge 1 + 2: Elma Vadisi, Kızıl Kanyon), 3★, yıldız kilidi | +8 bölüm (Bölge 3 + 4) | Günlük Rota |
| Mod | Siparişler | Uzun Yol (sonsuz) | Deneme Alanı, Günlük Rota |
| Kontrol | Dokunmatik 2 düğme, klavye | Gamepad | Alternatif düğme yerleşimi |
| Ekonomi | Kuruş, 3 hat × 4 kademe, 2 araç açma, kayıt | Paşa/Koca açma, Bağlama yükseltmesi | Başarımlar |
| Kombo | Takla, havada kalma, tek teker, "kargo havada", yanma | Kıl payı, çarpan efektleri | Başarım rozetleri |
| Sanat | Vektör çizim, 2 biyom paleti, parallax 3 katman, araç ve kargo çizimleri | Bölge 3–4 | Boyalar, mevsimsel dekor |
| Ses | Sentez motor (Tosun, Zıpır), temel SFX seti, 2 müzik döngüsü | Paşa/Koca motoru, biyom müzikleri, dinamik müzik katmanları | — |
| Juice | Sarsıntı, partikül, yavaş çekim (ragdoll, bitiş), kamera ileri bakış | Kombo efektleri, zemin izleri | — |
| Arayüz | Ana menü + `‹ Oyunlar`, seçim, garaj, HUD, duraklat, sonuç, ayarlar | Bölüm ön ekranı ipuçları, kontrol noktası | Yedek kodu |
| Teknik | Çevrimdışı, göreli yollar, `localStorage` kaydı, 60 FPS, `games.js` kaydı, kapak, `npm run check` | Otomatik pilot botu ile test (`tools/` altında) | `manifest.webmanifest` (`start_url:"./"`, `scope:"../../"`) |

**P0 kabul ölçütü:** İlk oyun 5 dk içinde en az bir yıldız + bir yükseltme kazandırır; 8 bölüm Tosun ile tamamlanabilir; ★3 hedefleri Zıpır
ile ve ustalıkla ulaşılabilir; herhangi bir başarısızlıktan sonra yeniden deneme <0,5 sn; orta seviye telefonda 60 FPS (≤70 dinamik gövde).

**Test ekibine notlar:** (1) Her araç için "boş kasa" ve "dolu kasa" sürüş testi; (2) sürtünme tablosu için sabit eğim üzerinde kayma testi; (3) kafa vuruşu eşiğinin yanlış tetiklemediğini doğrula (normal iniş >5 m/s'de tetiklenmemeli); (4) kargo kaybı eşiği; (5) Safari iOS ve düşük bütçeli Android'de dokunmatik çoklu basış; (6) sekme gizlenince duraklatma; (7) kayıt bozulması.
