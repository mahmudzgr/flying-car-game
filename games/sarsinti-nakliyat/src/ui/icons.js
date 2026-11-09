// Arayüz simgeleri: satır içi SVG metinleri (dış dosya yok). Sahip: Arayüz.
const INK = '#2a2230';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const star = (on = true, cls = '') =>
  `<svg class="ico star ${on ? 'on' : 'off'} ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z" fill="${on ? '#ffc83d' : 'rgba(42,34,48,.12)'}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
export const stars = (n, total = 3) => Array.from({ length: total }, (_, i) => star(i < n)).join('');

export const coin = (cls = '') => `<svg class="ico coin ${cls}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#ffc83d" stroke="${INK}" stroke-width="2"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#e39a00" stroke-width="1.8"/><path d="M9.5 8.2l1.2-.9" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;
export const lock = (cls = '') => `<svg class="ico lock ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 10.5V8a4.5 4.5 0 019 0v2.5" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="10.5" rx="3" fill="#c9bfae" stroke="${INK}" stroke-width="2"/><circle cx="12" cy="15.5" r="1.7" fill="${INK}"/></svg>`;
export const check = (cls = '') => `<svg class="ico check ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const cross = (cls = '') => `<svg class="ico cross ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>`;
export const pauseIcon = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4.5" width="4.6" height="15" rx="1.6" fill="${INK}"/><rect x="13.9" y="4.5" width="4.6" height="15" rx="1.6" fill="${INK}"/></svg>`;
export const fullscreenIcon = (on) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${on ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const arrowRight = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const arrowLeft = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H6M11.5 5.5L5 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const flag = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V3" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M6.5 4h12l-3 4.2 3 4.2h-12z" fill="#e8453c" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;
export const clock = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="#fff" stroke="${INK}" stroke-width="2.2"/><path d="M12 8.5V13l3 2M9.5 2.8h5" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
export const bolt = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="#ffc83d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;
export const bulb = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6.5 6.5 0 00-3.6 11.9c.7.5 1.1 1.2 1.1 2V18h5v-1.1c0-.8.4-1.5 1.1-2A6.5 6.5 0 0012 3z" fill="#ffc83d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M9.8 21h4.4" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/></svg>`;
export const gear = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.6a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8z" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M10.4 3h3.2l.5 2.3 1.6.7 2-1.3 2.2 2.2-1.3 2 .7 1.6 2.3.5v3.2l-2.3.5-.7 1.6 1.3 2-2.2 2.2-2-1.3-1.6.7-.5 2.3h-3.2l-.5-2.3-1.6-.7-2 1.3-2.2-2.2 1.3-2-.7-1.6L3 13.6v-3.2l2.3-.5.7-1.6-1.3-2 2.2-2.2 2 1.3 1.6-.7z" fill="#c9bfae" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="#fff" stroke="${INK}" stroke-width="2"/></svg>`;

/** Kargo simgesi. state: ok | dmg | lost | done */
export function cargoIcon(type, state = 'ok') {
  const s = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
  let body;
  switch (type) {
    case 'watermelon': body = `<circle cx="16" cy="17" r="11" fill="#4caf50" ${s}/><path d="M9 9.5c3 4 3 11 0 15M16 6.5v21M23 9.5c-3 4-3 11 0 15" fill="none" stroke="#256b2e" stroke-width="2.4" stroke-linecap="round"/>`; break;
    case 'eggs': body = `<rect x="3" y="12" width="26" height="14" rx="4" fill="#f7ecd0" ${s}/><ellipse cx="10" cy="11" rx="3.6" ry="4.6" fill="#fff" ${s}/><ellipse cx="17.5" cy="10" rx="3.6" ry="4.6" fill="#fff" ${s}/><ellipse cx="24" cy="11.5" rx="3.4" ry="4.4" fill="#fff" ${s}/>`; break;
    case 'milk': body = `<rect x="8" y="9" width="16" height="19" rx="4" fill="#9fb3c8" ${s}/><rect x="10" y="4" width="12" height="6" rx="2.4" fill="#c9d6e6" ${s}/><path d="M8 15h16M8 21h16" stroke="${INK}" stroke-width="1.6" opacity=".55"/>`; break;
    case 'piano': body = `<rect x="2.5" y="6" width="27" height="20" rx="3.5" fill="#3a3340" ${s}/><rect x="5" y="14" width="22" height="9" rx="1.4" fill="#fff" stroke="${INK}" stroke-width="1.4"/><path d="M9.5 14v9M14 14v9M18.5 14v9M23 14v9" stroke="${INK}" stroke-width="1.3"/><path d="M8 14v5M12.5 14v5M20.5 14v5M25 14v5" stroke="${INK}" stroke-width="2.6"/>`; break;
    case 'bale': body = `<circle cx="16" cy="16" r="12" fill="#f0c54a" ${s}/><path d="M16 16m0 0c0-2 3-2 3 0s-4 4-7 1-1-8 4-8 9 6 6 11" fill="none" stroke="#b8861a" stroke-width="2" stroke-linecap="round"/>`; break;
    default: body = `<rect x="4" y="5" width="24" height="23" rx="3.5" fill="#d9a066" ${s}/><path d="M4 11h24M4 22h24M7 11l18 11M25 11L7 22" stroke="#8a5a2c" stroke-width="2" fill="none"/>`;
  }
  const extra = state === 'dmg' ? `<path d="M14 4l-3 8 5 3-4 9" fill="none" stroke="#e8453c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
    : state === 'lost' ? `<path d="M6 6l20 20M26 6L6 26" stroke="#e8453c" stroke-width="3.6" stroke-linecap="round"/>`
      : state === 'done' ? `<circle cx="25" cy="25" r="7" fill="#19b5a5" stroke="${INK}" stroke-width="2"/><path d="M21.6 25.2l2.6 2.6 4.4-5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  return `<svg class="ico cargo ${state}" viewBox="0 0 32 32" aria-hidden="true">${body}${extra}</svg>`;
}

/** İpucu (toast) simgeleri. */
export function hintIcon(name) {
  if (name === 'throttle') return arrowRight();
  if (name === 'brake') return arrowLeft();
  if (name === 'cargo') return cargoIcon('crate');
  if (name === 'bolt' || name === 'air') return bolt();
  if (name === 'flag') return flag();
  return bulb();
}

const W = (cx, cy, r, extra = '') => `<g class="wh" ${extra}><circle cx="${cx}" cy="${cy}" r="${r}" fill="#3a3340" stroke="${INK}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r * 0.48}" fill="#c9bfae" stroke="${INK}" stroke-width="2.4"/><path d="M${cx} ${cy - r * 0.48}V${cy + r * 0.48}M${cx - r * 0.48} ${cy}H${cx + r * 0.48}" stroke="${INK}" stroke-width="1.6"/></g>`;
const SK = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

/** Araç çizimleri (160×84, sağa bakar). */
export function vehicleArt(id, locked = false) {
  let g;
  if (id === 'zipir') {
    g = `<path d="M26 60h92l8-10h12l-2 18H26z" fill="#ff8a3c" ${SK}/>
      <path d="M44 50V24h44l10 26M66 50V24" fill="none" ${SK}/><path d="M44 24h44" stroke="#e8453c" stroke-width="6" stroke-linecap="round"/>
      <circle cx="74" cy="39" r="7" fill="#ffc83d" ${SK}/><rect x="64" y="45" width="20" height="8" rx="3" fill="#ff5a2c" ${SK}/>
      <path d="M118 50l16-4" ${SK} fill="none"/><path d="M96 24V12l12 4-12 4" fill="#19b5a5" ${SK}/>
      ${W(40, 62, 17)}${W(118, 62, 17)}`;
  } else if (id === 'pasa') {
    g = `<rect x="4" y="38" width="62" height="24" rx="4" fill="#d9a066" ${SK}/><path d="M12 38v-8M30 38v-8M48 38v-8" ${SK} fill="none"/>
      <path d="M66 52h14" ${SK} fill="none"/>
      <path d="M82 60V34h22l8 12v14z" fill="#5aa05a" ${SK}/><rect x="86" y="38" width="16" height="12" rx="2" fill="#bfe6ff" ${SK}/>
      <path d="M112 54h30v8H112z" fill="#5aa05a" ${SK}/><path d="M138 54V40h6v14" fill="#7a7080" ${SK}/>
      ${W(34, 64, 12)}${W(96, 56, 22)}${W(138, 68, 10)}`;
  } else if (id === 'koca') {
    g = `<rect x="4" y="22" width="84" height="38" rx="4" fill="#e8453c" ${SK}/><path d="M16 22v38M44 22v38M72 22v38" stroke="${INK}" stroke-width="2" opacity=".35"/>
      <path d="M92 60V30h26l14 18v12z" fill="#ffc83d" ${SK}/><path d="M100 34h14l8 10h-22z" fill="#bfe6ff" ${SK}/>
      <rect x="4" y="60" width="132" height="8" rx="3" fill="#7a7080" ${SK}/>
      ${W(24, 70, 12)}${W(52, 70, 12)}${W(112, 70, 12)}`;
  } else {
    g = `<rect x="8" y="34" width="70" height="26" rx="5" fill="#fff8ea" ${SK}/><path d="M8 34l6-10h58l6 10M26 34v-10M44 34v-10M62 34v-10" fill="none" ${SK}/>
      <rect x="14" y="40" width="24" height="18" rx="3" fill="#d9a066" ${SK}/><rect x="42" y="46" width="20" height="12" rx="3" fill="#d9a066" ${SK}/>
      <path d="M78 62V40q0-6 6-6h22q5 0 9 5l9 12h12q5 0 5 5v6z" fill="#19b5a5" ${SK}/>
      <path d="M88 40h16l8 10H88z" fill="#bfe6ff" ${SK}/><circle cx="106" cy="30" r="0" />
      <circle cx="148" cy="55" r="3.6" fill="#ffc83d" ${SK}/>
      ${W(38, 64, 14)}${W(118, 64, 14)}`;
  }
  return `<svg class="vart ${locked ? 'locked' : ''}" viewBox="0 0 160 84" aria-hidden="true"><ellipse cx="80" cy="79" rx="64" ry="4" fill="rgba(42,34,48,.22)"/>${g}</svg>`;
}
