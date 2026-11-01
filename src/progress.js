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

const BACKUP_KEY = KEY + '-yedek'; // rolling safety copy in the same browser
const SAVE_VERSION = 2;

const defaults = () => ({
  version: SAVE_VERSION,
  levels: {}, // id -> {stars, best, objectives:[bool], ghost}
  achievements: {},
  stats: { flips: 0, crashes: 0, landings: 0, runs: 0, playTime: 0 },
  settings: { sound: true, music: true, vibration: true, assist: true, quality: 'auto', ghost: true, paint: 'red' },
  endless: { bestScore: 0, bestStreak: 0, runs: 0 },
});

// Older saves simply lack the newer fields: fill them in, never drop what is already there.
function normalize(d) {
  const D = defaults();
  const out = { ...D, ...d };
  out.levels = d && typeof d.levels === 'object' && d.levels ? d.levels : {};
  out.achievements = d && typeof d.achievements === 'object' && d.achievements ? d.achievements : {};
  out.stats = { ...D.stats, ...(d && d.stats) };
  out.settings = { ...D.settings, ...(d && d.settings) };
  out.endless = { ...D.endless, ...(d && d.endless) };
  out.version = SAVE_VERSION;
  return out;
}

function parseSave(raw) {
  try {
    const d = JSON.parse(raw);
    return d && typeof d === 'object' && typeof d.levels === 'object' ? d : null;
  } catch (e) {
    return null;
  }
}

const VALID_ACH = () => new Set(ACHIEVEMENTS.map((a) => a.id));

export class Progress {
  constructor() {
    this.data = defaults();
    this.storageOk = true;
    this.recovered = null; // 'backup' when the main save was unreadable and the safety copy was used
    let raw = null;
    let backup = null;
    try {
      raw = localStorage.getItem(KEY);
      backup = localStorage.getItem(BACKUP_KEY);
    } catch (e) {
      this.storageOk = false; // storage blocked – play without saving
      return;
    }
    const main = raw ? parseSave(raw) : null;
    if (main) {
      this.data = normalize(main);
      return;
    }
    if (raw) {
      // unreadable save: keep the original text untouched under another key instead of overwriting it
      try {
        localStorage.setItem(`${KEY}-bozuk-${Date.now()}`, raw);
      } catch (e) {
        /* ignore */
      }
    }
    const b = backup ? parseSave(backup) : null;
    if (b) {
      this.data = normalize(b);
      this.recovered = 'backup';
      this.save();
    }
  }

  save() {
    if (!this.storageOk) return false;
    const write = () => {
      const json = JSON.stringify(this.data);
      localStorage.setItem(KEY, json);
      const now = Date.now();
      if (!this.lastBackup || now - this.lastBackup > 5 * 60 * 1000) {
        try {
          localStorage.setItem(BACKUP_KEY, json);
          this.lastBackup = now;
        } catch (e) {
          /* the main save matters more than the safety copy */
        }
      }
    };
    try {
      write();
      return true;
    } catch (e) {
      // storage full: free the safety copy, then the replay ghosts (the least important data), and retry
      try {
        localStorage.removeItem(BACKUP_KEY);
        write();
        return true;
      } catch (e2) {
        for (const l of Object.values(this.data.levels)) delete l.ghost;
        try {
          write();
          return true;
        } catch (e3) {
          return false;
        }
      }
    }
  }

  // Portable backup code (ghost replays left out to keep it short).
  exportCode() {
    const levels = {};
    for (const [id, l] of Object.entries(this.data.levels)) {
      levels[id] = { s: l.stars || 0, b: Math.round(l.best || 0), o: (l.objectives || []).map((x) => (x ? 1 : 0)) };
    }
    const payload = { v: 1, levels, ach: this.data.achievements, stats: this.data.stats, endless: this.data.endless, paint: this.data.settings.paint };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return 'UR1-' + btoa(bin);
  }

  // Merges a backup code into the current progress. Never removes anything: keeps the better of both.
  importCode(code) {
    const m = String(code || '').replace(/\s+/g, '').match(/^UR1-([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('Kod tanınmadı. "UR1-" ile başlayan kodun tamamını yapıştır.');
    let p;
    try {
      const bin = atob(m[1]);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      p = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw new Error('Kod eksik ya da bozuk görünüyor. Tamamını kopyaladığından emin ol.');
    }
    if (!p || p.v !== 1 || typeof p.levels !== 'object' || !p.levels) throw new Error('Bu kod Uçan Roadster yedeği değil.');
    const res = { levels: 0, stars: 0, ach: 0 };
    const before = this.totalStars();
    for (const [id, l] of Object.entries(p.levels)) {
      if (!/^\d{1,3}$/.test(id) || !l || typeof l !== 'object') continue;
      const cur = this.data.levels[id] || { stars: 0, best: 0, objectives: [] };
      const io = Array.isArray(l.o) ? l.o : [];
      const n = Math.max(io.length, (cur.objectives || []).length);
      const objectives = [];
      for (let i = 0; i < n; i++) objectives.push(!!((cur.objectives || [])[i] || io[i]));
      const merged = {
        stars: Math.max(cur.stars || 0, objectives.filter(Boolean).length, Math.min(3, Number(l.s) || 0)),
        best: Math.max(cur.best || 0, Number(l.b) || 0),
        objectives,
        ghost: cur.ghost,
      };
      if (merged.stars !== (cur.stars || 0) || merged.best !== (cur.best || 0)) res.levels++;
      this.data.levels[id] = merged;
    }
    const valid = VALID_ACH();
    for (const [id, ts] of Object.entries(p.ach || {})) {
      if (!valid.has(id)) continue;
      if (!this.data.achievements[id]) {
        this.data.achievements[id] = Number(ts) || Date.now();
        res.ach++;
      }
    }
    for (const k of Object.keys(this.data.stats)) {
      const v = Number(p.stats && p.stats[k]);
      if (Number.isFinite(v)) this.data.stats[k] = Math.max(this.data.stats[k] || 0, v);
    }
    for (const k of Object.keys(this.data.endless)) {
      const v = Number(p.endless && p.endless[k]);
      if (Number.isFinite(v)) this.data.endless[k] = Math.max(this.data.endless[k] || 0, v);
    }
    if (this.data.settings.paint === 'red' && typeof p.paint === 'string' && PAINTS.some((x) => x.id === p.paint)) this.data.settings.paint = p.paint;
    res.stars = this.totalStars() - before;
    this.lastBackup = 0;
    this.save();
    return res;
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
    this.lastBackup = 0;
    this.save();
  }
}
