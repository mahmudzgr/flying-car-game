// Dokunmatik GAZ/FREN düğmeleri (TASARIM §3.1). Sahip: Arayüz. Basış sürdükçe input.setVirtual(...) çağrılır.
// Çoklu dokunuş: her düğme kendi pointerId'sini yakalar (setPointerCapture); parmak kayarsa düğme değişmez.
export function createTouchControls(root, input) {
  const wrap = document.createElement('div');
  wrap.className = 'touch';
  wrap.innerHTML = '<button class="pad pad-brake" data-pad="brake" aria-label="Fren">FREN</button><button class="pad pad-gas" data-pad="throttle" aria-label="Gaz">GAZ</button>';
  root.appendChild(wrap);
  const active = new Map(); // pointerId -> pad adı
  const set = (name, on) => { input.setVirtual(name, on); wrap.querySelector(`[data-pad="${name}"]`)?.classList.toggle('on', on); };
  const count = (name) => [...active.values()].filter((n) => n === name).length;
  wrap.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-pad]'); if (!b) return;
    e.preventDefault(); b.setPointerCapture(e.pointerId);
    active.set(e.pointerId, b.dataset.pad); set(b.dataset.pad, true);
  });
  const up = (e) => {
    const n = active.get(e.pointerId); if (!n) return;
    active.delete(e.pointerId); if (!count(n)) set(n, false);
  };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('contextmenu', (e) => e.preventDefault());
  return {
    show(on) { wrap.hidden = !on; if (!on) { active.clear(); set('throttle', false); set('brake', false); } },
    destroy() { wrap.remove(); },
  };
}
