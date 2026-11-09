// Dokunmatik GAZ/FREN düğmeleri (TASARIM §3.1). Sahip: Arayüz.
// - Her basış kendi pointerId'sini yakalar (setPointerCapture): çoklu dokunuş, kaydırınca düğme değişmez.
// - Vuruş alanı (.pad) görünür yüzeyden (.face) büyüktür; en az 88×88 css px.
// - Basış sürdükçe input.setVirtual(...) true; bırakma/iptal/odak kaybı/sekme gizlenmesinde false.
import { arrowRight, arrowLeft } from './icons.js';

export function createTouchControls(root, input) {
  const wrap = document.createElement('div');
  wrap.className = 'touch';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <button class="pad pad-brake" data-pad="brake" tabindex="-1" aria-label="Fren ve geri"><span class="face">${arrowLeft()}<b>FREN</b><small>geri</small></span></button>
    <button class="pad pad-gas" data-pad="throttle" tabindex="-1" aria-label="Gaz"><span class="face">${arrowRight()}<b>GAZ</b></span></button>`;
  root.appendChild(wrap);
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  wrap.classList.toggle('faint', fine);          // masaüstü: klavye varsa pedallar soluk kalır

  const active = new Map();                      // pointerId -> pad adı
  const count = (name) => { let c = 0; for (const n of active.values()) if (n === name) c++; return c; };
  const set = (name, on) => {
    input.setVirtual(name, on);
    wrap.querySelector(`[data-pad="${name}"]`)?.classList.toggle('on', on);
  };
  const release = (id) => {
    const name = active.get(id); if (!name) return;
    active.delete(id);
    if (!count(name)) set(name, false);
  };
  const releaseAll = () => { active.clear(); set('throttle', false); set('brake', false); };

  wrap.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-pad]'); if (!b) return;
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    wrap.classList.remove('faint');              // dokunma/fare kullanıldı → tam görünür
    active.set(e.pointerId, b.dataset.pad); set(b.dataset.pad, true);
    if (e.pointerType === 'touch' && navigator.vibrate && root.dataset.haptics !== '0') { try { navigator.vibrate(6); } catch { /* yoksay */ } }
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) wrap.addEventListener(ev, (e) => release(e.pointerId));
  wrap.addEventListener('contextmenu', (e) => e.preventDefault());
  wrap.addEventListener('mousedown', (e) => e.preventDefault());   // odak düğmeye geçip Boşluk tuşunu yutmasın
  for (const ev of ['touchstart', 'touchmove']) wrap.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  const onHide = () => { if (document.hidden) releaseAll(); };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', onHide);
  // klavye kullanılıyorsa pedallar soluk
  const onKey = (e) => { if (fine && !active.size && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) wrap.classList.add('faint'); };
  window.addEventListener('keydown', onKey);

  return {
    show(on) { wrap.hidden = !on; if (!on) releaseAll(); },
    setScale(v) { wrap.style.setProperty('--pad-scale', String(v)); },
    releaseAll,
    destroy() { releaseAll(); window.removeEventListener('blur', releaseAll); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('keydown', onKey); wrap.remove(); },
  };
}
