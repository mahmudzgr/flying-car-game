// Save data (localStorage) + achievements.
const KEY = 'roadster-flip-save-v1';

export const ACHIEVEMENTS = [
  { id: 'first_land', icon: '🛬', name: 'İlk Temas', desc: 'İlk başarılı inişini yap.' },
  { id: 'first_flip', icon: '🔄', name: 'Takla Atan Araba', desc: 'Takla atıp güvenle in.' },
  { id: 'combo2', icon: '✌️', name: 'Çifte Kavrulmuş', desc: 'Tek atlayışta 2 takla at ve in.' },
  { id: 'combo3', icon: '🌀', name: 'Uzay Jimnastikçisi', desc: 'Tek atlayışta 3 takla at ve in.' },
  { id: 'combo5', icon: '🌪️', name: 'Kasırga', desc: 'Tek atlayışta 5 takla at ve in.' },
  { id: 'feather', icon: '🪶', name: 'Kuş Tüyü', desc: '1,0 m/s altında dokun.' },
  { id: 'bullseye', icon: '🎯', name: 'On İkiden', desc: 'Hedef merkezine 1 m yakın in.' },
  { id: 'miser', icon: '⛽', name: 'Yakıt Cimrisi', desc: '%75 ve üzeri yakıtla bitir.' },
  { id: 'pure', icon: '🪂', name: 'Saf Fizik', desc: 'Ana iticiyi hiç kullanmadan in. (İpucu: Kayak Atlayışı)' },
  { id: 'lastdrop', icon: '🫗', name: 'Son Damla', desc: '%5 altında yakıtla başarılı iniş.' },
  { id: 'catapult', icon: '🏹', name: 'Mancınık Ustası', desc: 'Rampa yükselirken fırla (güçlü rampa itişi).' },
  { id: 'speed', icon: '⚡', name: 'Işık Hızı', desc: 'Rampaya 160 km/sa üzerinde gir.' },
  { id: 'hang', icon: '🕊️', name: 'Uçan Araba', desc: 'Tek atlayışta 10 sn havada kal.' },
  { id: 'collector', icon: '⭐', name: 'Yıldız Avcısı', desc: 'Bir bölümde tüm yıldızları topla.' },
  { id: 'moon', icon: '🌙', name: 'Ay Yürüyüşü', desc: 'Ay Üssü bölümünü bitir.' },
  { id: 'mars', icon: '🔴', name: 'Kızıl Gezegen', desc: 'Mars bölümünü bitir.' },
  { id: 'sea', icon: '⚓', name: 'Kaptan', desc: 'Deniz platformuna in.' },
  { id: 'flips50', icon: '🎡', name: 'Takla Makinesi', desc: 'Toplam 50 takla at.' },
  { id: 'crash10', icon: '💥', name: 'Hurdacı', desc: '10 kez kaza yap. Olur böyle şeyler.' },
  { id: 'campaign', icon: '🏁', name: 'Görev Tamamlandı', desc: 'Tüm bölümleri bitir.' },
  { id: 'perfect', icon: '🏆', name: 'Mükemmeliyetçi', desc: 'Tüm bölümlerde 3 yıldız al.' },
  { id: 'score15k', icon: '💎', name: 'Rekortmen', desc: 'Tek bölümde 15.000 puan yap.' },
  { id: 'ski', icon: '⛷️', name: 'Uçan Kayakçı', desc: 'Kayak atlama yamacına güvenle in.' },
  { id: 'ice', icon: '🧊', name: 'Buz Pateni', desc: 'Buzlu Göl\'de kar setine çarpmadan dur.' },
  { id: 'titan', icon: '🪐', name: 'Metan Denizcisi', desc: 'Titan bölümünü bitir.' },
  { id: 'crane', icon: '🏗️', name: 'Vinç Operatörü', desc: 'Sallanan vinç platformuna in.' },
  { id: 'lift', icon: '🛗', name: 'Asansör Sörfü', desc: 'Hareket eden asansör platformuna in.' },
  { id: 'storm', icon: '⛈️', name: 'Fırtına Avcısı', desc: 'Fırtına bölümünü bitir.' },
  { id: 'endless5', icon: '♾️', name: 'Maratoncu', desc: 'Sonsuz modda üst üste 5 iniş yap.' },
  { id: 'endless10', icon: '🚀', name: 'Durdurulamaz', desc: 'Sonsuz modda üst üste 10 iniş yap.' },
  { id: 'painter', icon: '🎨', name: 'Boyacı', desc: 'Garajda aracının rengini değiştir.' },
];

// Garage paints, unlocked by total stars
export const PAINTS = [
  { id: 'red', name: 'Çok Katmanlı Kırmızı', color: 0xc4111f, stars: 0 },
  { id: 'white', name: 'İnci Beyazı', color: 0xe9ecef, stars: 6 },
  { id: 'black', name: 'Gece Siyahı', color: 0x15171c, stars: 12 },
  { id: 'blue', name: 'Derin Mavi', color: 0x1f4fb5, stars: 18 },
  { id: 'silver', name: 'Gümüş', color: 0x9aa3ad, stars: 24 },
  { id: 'green', name: 'Zümrüt', color: 0x0f7a4a, stars: 30 },
  { id: 'orange', name: 'Mars Turuncusu', color: 0xe8611a, stars: 36 },
  { id: 'purple', name: 'Neon Mor', color: 0x7a2bd6, stars: 42 },
  { id: 'gold', name: 'Altın', color: 0xd4a017, stars: 48 },
];

const defaults = () => ({
  levels: {}, // id -> {stars, best, objectives:[bool], ghost}
  achievements: {},
  stats: { flips: 0, crashes: 0, landings: 0, runs: 0, playTime: 0 },
  settings: { sound: true, music: true, vibration: true, assist: true, quality: 'auto', ghost: true, paint: 'red' },
  endless: { bestScore: 0, bestStreak: 0, runs: 0 },
});

export class Progress {
  constructor() {
    this.data = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const D = defaults();
        this.data = { ...D, ...d, stats: { ...D.stats, ...d.stats }, settings: { ...D.settings, ...d.settings }, endless: { ...D.endless, ...d.endless } };
      }
    } catch (e) {
      /* storage unavailable – play without saving */
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      /* ignore */
    }
  }

  level(id) {
    return this.data.levels[id] || { stars: 0, best: 0, objectives: [] };
  }

  isUnlocked(id, levels) {
    if (id === 1) return true;
    const idx = levels.findIndex((l) => l.id === id);
    const prev = levels[idx - 1];
    return prev && this.level(prev.id).stars > 0;
  }

  totalStars() {
    return Object.values(this.data.levels).reduce((a, l) => a + (l.stars || 0), 0);
  }

  unlock(id, out) {
    if (!this.data.achievements[id]) {
      this.data.achievements[id] = Date.now();
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (out && a) out.newAch.push(a);
      this.save();
    }
  }

  // Records a finished run; returns {newBest, newAch:[...]}
  recordRun(def, run, levels, { endless = false } = {}) {
    const r = run.result;
    const st = this.data.stats;
    st.runs++;
    if (!r.success) st.crashes++;
    const out = { newBest: false, newAch: [] };
    if (r.success && !endless) {
      st.landings++;
      st.flips += r.backflips + r.frontflips;
      const prev = this.level(def.id);
      const objectives = def.objectives.map((_, i) => !!(prev.objectives[i] || r.objectives[i]));
      const lv = {
        stars: objectives.filter(Boolean).length,
        best: Math.max(prev.best || 0, r.score),
        objectives,
        ghost: prev.ghost,
      };
      if (r.score > (prev.best || 0)) {
        out.newBest = (prev.best || 0) > 0;
        lv.ghost = run.record.slice();
      }
      this.data.levels[def.id] = lv;
    }
    if (r.success && endless) {
      st.landings++;
      st.flips += r.backflips + r.frontflips;
    }
    const unlock = (id) => this.unlock(id, out);
    if (r.success) {
      unlock('first_land');
      const n = r.backflips + r.frontflips;
      if (n >= 1) unlock('first_flip');
      if (r.maxCombo >= 2) unlock('combo2');
      if (r.maxCombo >= 3) unlock('combo3');
      if (r.maxCombo >= 5) unlock('combo5');
      if (r.impact < 1.0) unlock('feather');
      if (r.padDist <= 1) unlock('bullseye');
      if (r.fuel >= 75) unlock('miser');
      if (!r.usedMainThrust) unlock('pure');
      if (r.fuel < 5) unlock('lastdrop');
      if (r.launchKick > 0.12) unlock('catapult');
      if (r.airtime >= 10) unlock('hang');
      if (r.starsTotal > 0 && r.starsCollected >= r.starsTotal) unlock('collector');
      if (def.theme === 'moon') unlock('moon');
      if (def.theme === 'mars') unlock('mars');
      if (def.theme === 'sea' || def.theme === 'storm') unlock('sea');
      if (r.score >= 15000) unlock('score15k');
      if (def.pad.type === 'hill') unlock('ski');
      if ((def.pad.mu ?? 1) < 0.5) unlock('ice');
      if (def.theme === 'titan') unlock('titan');
      if (def.pad.motion && def.pad.motion.type === 'pendulum') unlock('crane');
      if (def.pad.motion && def.pad.motion.type === 'lift') unlock('lift');
      if (def.theme === 'storm' && !endless) unlock('storm');
    }
    if (r.launchSpeed * 3.6 >= 160) unlock('speed');
    if (st.flips >= 50) unlock('flips50');
    if (st.crashes >= 10) unlock('crash10');
    if (levels.every((l) => this.level(l.id).stars > 0)) unlock('campaign');
    if (levels.every((l) => this.level(l.id).stars >= 3)) unlock('perfect');
    this.save();
    return out;
  }

  // Endless mode bookkeeping; returns {newBest, newAch}
  recordEndless(streak, total) {
    const e = this.data.endless;
    const out = { newBest: total > e.bestScore && e.bestScore > 0, newAch: [] };
    e.runs++;
    e.bestScore = Math.max(e.bestScore, total);
    e.bestStreak = Math.max(e.bestStreak, streak);
    if (streak >= 5) this.unlock('endless5', out);
    if (streak >= 10) this.unlock('endless10', out);
    this.save();
    return out;
  }

  reset() {
    const settings = this.data.settings;
    this.data = defaults();
    this.data.settings = settings;
    this.save();
  }
}
