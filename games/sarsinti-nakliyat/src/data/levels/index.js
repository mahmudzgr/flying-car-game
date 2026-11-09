// Bölüm kayıt defteri. Yeni bölüm: dosyayı ekle, buraya import et ve CAMPAIGN dizisine sırayla yaz.
import l11 from './1-1.js';
import l12 from './1-2.js';
import l13 from './1-3.js';
import l14 from './1-4.js';
import l21 from './2-1.js';
import l22 from './2-2.js';
import l23 from './2-3.js';
import l24 from './2-4.js';
import devTrack from './test-track.js';

/** Kampanya sırası (Siparişler). Bölge/sıra bilgisi bölüm nesnesindedir. */
export const CAMPAIGN = [l11, l12, l13, l14, l21, l22, l23, l24];
/** Yalnızca geliştirme (bot ve dev sayfaları). */
export const DEV_LEVELS = [devTrack];
export const LEVELS = Object.fromEntries([...CAMPAIGN, ...DEV_LEVELS].map((l) => [l.id, l]));
export const getLevel = (id) => LEVELS[id];
