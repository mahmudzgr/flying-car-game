// Giriş: klavye + sanal (dokunmatik/ekran düğmeleri). Sim'e {throttle, brake} (0..1) verir.
// Sahip: Çekirdek. Dokunmatik düğmeler ui/touch.js'te çizilir ve setVirtual() ile besler.
const KEYS = {
  throttle: ['ArrowRight', 'KeyD', 'Space'],
  brake: ['ArrowLeft', 'KeyA'],
};
const ACTIONS = { KeyR: 'retry', Escape: 'pause', KeyP: 'pause', KeyM: 'mute', Enter: 'confirm' };

/**
 * @param {EventTarget} [target=window]
 * @returns {{read():{throttle:number,brake:number}, setVirtual(name:'throttle'|'brake', on:boolean):void,
 *   onAction(fn:(action:'retry'|'pause'|'mute'|'confirm')=>void):()=>void, reset():void, destroy():void}}
 */
export function createInput(target = window) {
  const down = new Set();
  const virt = { throttle: false, brake: false };
  const listeners = new Set();
  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (KEYS.throttle.includes(e.code) || KEYS.brake.includes(e.code)) { down.add(e.code); e.preventDefault(); return; }
    const a = ACTIONS[e.code];
    if (a && !e.repeat) for (const fn of listeners) fn(a);
  };
  const onKeyUp = (e) => down.delete(e.code);
  const reset = () => { down.clear(); virt.throttle = virt.brake = false; };
  // Gamepad: sağ tetik (buton 7) gaz, sol tetik (buton 6) fren, Start (buton 9) duraklat. A (0) onay. Yoklama read() içinde.
  const pad = { throttle: false, brake: false, start: false, a: false };
  const pollPad = () => {
    pad.throttle = pad.brake = false;
    let gp = null;
    try { const l = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) { gp = g; break; } } catch { gp = null; }
    if (!gp) { pad.start = pad.a = false; return; }
    const val = (i) => { const b = gp.buttons[i]; return b ? (typeof b === 'number' ? b : b.value ?? (b.pressed ? 1 : 0)) : 0; };
    const ax = gp.axes?.[0] ?? 0;
    pad.throttle = val(7) > 0.3;
    pad.brake = val(6) > 0.3 || ax < -0.6;
    if (ax > 0.6) pad.throttle = true;
    const st = !!gp.buttons[9]?.pressed, a = !!gp.buttons[0]?.pressed;
    if (st && !pad.start) for (const fn of listeners) fn('pause');
    if (a && !pad.a) for (const fn of listeners) fn('confirm');
    pad.start = st; pad.a = a;
  };
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', reset);
  return {
    /** Gamepad yoklaması (main.js her karede çağırır; duraklatmada da Start ile devam). */
    poll: pollPad,
    read() {
      pollPad();
      const on = (n) => virt[n] || pad[n] || KEYS[n].some((k) => down.has(k));
      return { throttle: on('throttle') ? 1 : 0, brake: on('brake') ? 1 : 0 };
    },
    setVirtual(name, on) { virt[name] = !!on; },
    onAction(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset,
    destroy() { target.removeEventListener('keydown', onKeyDown); target.removeEventListener('keyup', onKeyUp); target.removeEventListener('blur', reset); listeners.clear(); },
  };
}
