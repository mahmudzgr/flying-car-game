// Bölüm kayıt defteri. Yeni bölüm: dosyayı ekle, buraya import et ve CAMPAIGN dizisine sırayla yaz.
import l11 from './1-1.js';
import devTrack from './test-track.js';

/** Kampanya sırası (Siparişler). Bölge/sıra bilgisi bölüm nesnesindedir. */
export const CAMPAIGN = [l11];
/** Yalnızca geliştirme (bot ve dev sayfaları). */
export const DEV_LEVELS = [devTrack];
export const LEVELS = Object.fromEntries([...CAMPAIGN, ...DEV_LEVELS].map((l) => [l.id, l]));
export const getLevel = (id) => LEVELS[id];
