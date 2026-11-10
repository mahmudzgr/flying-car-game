// Türkçe metinler: başarısızlık nedenleri, ipuçları, adlar. Sahip: Arayüz.
export const FAIL = {
  headHit: {
    title: 'Kafa vuruşu!',
    lines: ['Fındık\'ın kaskı bugün de görev başında... ama yetmedi.', 'Kafa yere değdi, yerçekimi bu turu aldı.', 'Kask "ben uyarmıştım" diyor.'],
    tips: ['Havadayken burnu iniş eğimine paralel tut.', 'Büyük inişlerden önce gazı bırak, tekerleklerin yere değmesine izin ver.'],
  },
  flipped: {
    title: 'Devrildin!',
    lines: ['Tekerlekler gökyüzüne selam verdi.', 'Araba sırtüstü yatıp mola vermeye karar verdi.', 'Ters dönmüş kaplumbağa gibisin, Fındık.'],
    tips: ['Dik rampalarda gazı kıs; havada gaz burnu kaldırır, fren indirir.', 'Yan yatmaya başlayınca gazı bırakıp dengeni bekle.'],
  },
  fell: {
    title: 'Uçuruma uçtun!',
    lines: ['Uçurum seni çağırdı, sen de nazik davranıp gittin.', 'Kargo ve sen: ikiniz de serbest düşüştesiniz.', 'Çukur "hoş geldin" dedi.'],
    tips: ['Boşluktan önce hız kazan, havada burnu hafif yukarıda tut.', 'Çukurun kenarında tereddüt etme: ya tam gaz ya da hiç.'],
  },
  timeout: {
    title: 'Süre doldu!',
    lines: ['Müşteri kapıda bekliyor, sen yoldasın.', 'Kargo bayatladı, müşteri çayı soğudu.', 'Saat tik tak, sen tak tak.'],
    tips: ['Gereksiz frenden kaçın; inişlerde hızı biriktir.', 'Düz yolda gazı sonuna kadar bas.'],
  },
  cargoShort: {
    title: 'Kargo yetmedi!',
    lines: ['Müşteri boş kasaya bakakaldı.', 'Yükün yarısı yolda kaldı, makbuz kesilemez.', 'Teslimat noktasında "bu kadar mı?" sesleri yankılandı.'],
    tips: ['Frene erken bas, yükün öne kaymasına izin verme.', 'Tümseklerde gazı bırak; kargo havalanmasın.'],
  },
  cargoGone: {
    title: 'Kargon bitti!',
    lines: ['Kasa yok, karpuz yok; elinde sadece direksiyon kaldı.', 'Yük yolda dağıldı, müşteri "bir şey gelmedi" diyor.'],
    tips: ['Tümseklerde gazı bırak, ani frenden kaçın.', 'Teslimat bayrağına yaklaşırken yükünü sağlam tut.'],
  },
  stuck: {
    title: 'Saplandın!',
    lines: ['Beş saniyedir yerinde sayıyorsun; araba "emekli oldum" dedi.', 'Tekerlekler dönüyor, dünya dönmüyor.', 'Park etmek için güzel yer, ama teslimat yarım kaldı.'],
    tips: ['Geri vites için ← tuşunu (ya da FREN düğmesini) basılı tut, sonra yeniden hızlan.', 'Kumda ve çamurda gazı yumuşak ver; tekerlek kazımasın.'],
  },
  water: {
    title: 'Suya düştün!',
    lines: ['Araba yüzmeyi denedi, kargo sonradan haber verecek.', 'Su soğuktu, kask ıslandı, moral bozuldu.'],
    tips: ['Suya girmeden önce kütük ve platformları kullan.', 'Su kenarında hızı koru ama sürücü kafasını unutma.'],
  },
  chased: {
    title: 'Yakalandın!',
    lines: ['Arkandaki dev bir tur bindirdi.', 'Kaçamadın; kaya "ben de teslimat yapayım" dedi.', 'Kar topu bu sefer daha hızlıydı.'],
    tips: ['Tehlike okunu izle ve gazı hiç bırakma.', 'Engelleri ezmek yerine yavaşlamadan yan çizgiyi tut.'],
  },
  crash: {
    title: 'Kaza!',
    lines: ['Sigorta "yine mi?" diyor.', 'Bu iş böyle olmadı, bir daha deneyelim.'],
    tips: ['Yavaş ve düzgün sürmek de bir taktiktir.'],
  },
};
export const failInfo = (reason, n = 0) => {
  const f = FAIL[reason] ?? FAIL.crash;
  return { title: f.title, line: f.lines[n % f.lines.length], tip: f.tips[n % f.tips.length] };
};

export const WIN_TITLES = ['', 'Teslim edildi!', 'Güzel iş!', 'Usta kurye!'];
export const CARGO_NAMES = { crate: 'Kasa', watermelon: 'Karpuz', eggs: 'Yumurta kolisi', milk: 'Süt bidonu', piano: 'Piyano', bale: 'Balya' };
export const CARGO_PLURAL = { crate: 'kasa', watermelon: 'karpuz', eggs: 'yumurta kolisi', milk: 'süt bidonu', piano: 'piyano', bale: 'balya' };
export const STAT_NAMES = { speed: 'Hız', traction: 'Çekiş', balance: 'Denge', capacity: 'Kapasite', air: 'Hava' };
export const LINE_NAMES = { motor: 'Motor', suspansiyon: 'Süspansiyon', lastik: 'Lastik' };
export const LINE_HINT = {
  motor: 'Daha çok tork, biraz daha yüksek hız',
  suspansiyon: 'Daha yumuşak, kontrollü yay',
  lastik: 'Daha iyi tutuş, kumda az batar',
};
export const BIOME_NAMES = { elma: 'Elma Vadisi', kanyon: 'Kızıl Kanyon', bataklik: 'Sisli Bataklık', zirve: 'Zirve Köyü' };
const DIFF_NAMES = ['Çok kolay', 'Çok kolay', 'Kolay', 'Orta', 'Zor', 'Çok zor'];
export const diffName = (d) => DIFF_NAMES[Math.max(1, Math.min(5, Math.round(d ?? 1)))];

export const fmtTime = (t) => {
  if (t == null || !isFinite(t) || t <= 0) return '--';
  const m = Math.floor(t / 60), s = t - m * 60;
  return m ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)} sn`;
};
export const fmtClock = (t) => {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t * 10) % 10);
  return `${m}:${String(s).padStart(2, '0')}.${d}`;
};
export const fmtNum = (n) => Math.round(n).toLocaleString('tr-TR');
