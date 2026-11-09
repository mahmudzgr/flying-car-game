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
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', reset);
  return {
    read() {
      const on = (n) => virt[n] || KEYS[n].some((k) => down.has(k));
      return { throttle: on('throttle') ? 1 : 0, brake: on('brake') ? 1 : 0 };
    },
    setVirtual(name, on) { virt[name] = !!on; },
    onAction(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset,
    destroy() { target.removeEventListener('keydown', onKeyDown); target.removeEventListener('keyup', onKeyUp); target.removeEventListener('blur', reset); listeners.clear(); },
  };
}
