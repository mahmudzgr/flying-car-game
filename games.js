// Oyun Salonu — oyun listesi.
//
// Ana ekrandaki (index.html) oyun kartları bu listeden oluşturulur; sıra, kartların sırasıdır.
// Yeni oyun eklemek için:
//   1. games/<id>/ klasörünü oluştur: içinde index.html ve kapak görseli (cover.webp) olsun.
//   2. Aşağıya bir kayıt ekle.
//   3. `npm run check` ile kontrol et.
// Ayrıntılar: README.md → "Yeni oyun ekleme".
//
// Alanlar:
//   id           games/ altındaki klasör adı: küçük harf, rakam ve tire (ör. 'uzay-macerasi')
//   title        Kartta görünen oyun adı
//   tagline      Bir-iki cümlelik tanıtım
//   tags         2-5 kısa etiket
//   accent       Kartın vurgu rengi (#rrggbb)
//   orientation  'landscape' (yatay), 'portrait' (dikey) veya 'any' (fark etmez)
//   cover        İsteğe bağlı; varsayılan 'cover.webp' (oyun klasörüne göre yol)

export const GAMES = [
  {
    id: 'ucan-roadster',
    title: 'Uçan Roadster',
    tagline: 'Elektrikli roadster ile dönen rampadan fırla, havada takla at, iticilerle platforma güvenle kon.',
    tags: ['Fizik', '2.5D', '16 bölüm', 'Sonsuz mod'],
    accent: '#ff6a3d',
    orientation: 'landscape',
  },
  {
    id: 'paldir-kuldur',
    title: 'Paldır Küldür',
    tagline: 'Sapanla gülle fırlat, kuleleri yık, jöleleri patlat. Altı farklı gülle, dört dünya.',
    tags: ['Fizik', 'Yıkım', '40 bölüm', 'Oyun Alanı'],
    accent: '#ffb43a',
    orientation: 'landscape',
  },
  {
    id: 'sarsinti-nakliyat',
    title: 'Sarsıntı Nakliyat',
    tagline: 'Kargonu devirme, kafanı da vurma! Çamurda, buzda, sallanan köprülerde yaylı süspansiyonla sür; yumurtadan piyanoya her yükü sağ salim teslim et.',
    tags: ['Fizik', 'Araba', 'Kargo', '16 bölüm'],
    accent: '#19b5a5',
    orientation: 'landscape',
  },
];
