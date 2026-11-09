// Oyun Salonu — oyunlardan oyun seçim ekranına dönüş yardımcısı.
//
// Kullanım (oyunun ana menüsünde):
//   <a href="../../" data-hub-back>Oyunlar</a>
//   <script src="../../hub/back.js" defer></script>
//
// Bağlantı bu dosya olmadan da normal bir link olarak çalışır. Bu betik yalnızca şunu ekler:
// oyuna oyun seçim ekranından gelindiyse yeni bir sayfa açmak yerine tarayıcı geçmişinde geri
// gider. Böylece telefonun "geri" hareketi tekrar oyuna dönmez, seçim ekranı kaldığı yerden açılır.
(function () {
  'use strict';

  function samePage(a, b) {
    var strip = function (p) { return p.replace(/index\.html?$/, ''); };
    return a.origin === b.origin && strip(a.pathname) === strip(b.pathname);
  }

  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a[data-hub-back]') : null;
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    try {
      var hub = new URL(link.getAttribute('href'), location.href);
      var ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && samePage(ref, hub) && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    } catch (err) {
      // URL ayrıştırılamazsa normal bağlantı davranışı devam eder.
    }
  });
})();
