// Milimetrik Park — giriş: klavye, oyun kolu ve dokunmatik (ui/controls.js setVirtual ile besler).
// Çıktı (her kare): {throttle, brake, lever, handbrake, steerAbs, steerDir, gear, park}
//  - lever: sürüş kolu (-1 geri … +1 ileri), yalnızca 'lever' şemasında
//  - steerAbs: mutlak direksiyon hedefi (-1..1) ya da null (bırakıldı → araç kendini toplar)
//  - steerDir: klavye yön tuşu (-1, 0, 1); tutulan süreye göre hızlanır (vehicle.js)

const GEAR_KEYS = { KeyQ: 'R', KeyE: 'D', KeyN: 'N' };
const ACTION_KEYS = { KeyR: 'retry', Escape: 'pause', KeyC: 'camera', KeyM: 'mute', KeyG: 'guides', Enter: 'confirm', Minus: 'zoomOut', NumpadSubtract: 'zoomOut', Equal: 'zoomIn', NumpadAdd: 'zoomIn', KeyH: 'help' };
const DRIVE_KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'ShiftLeft', 'ShiftRight'];

export function createInput(target = window) {
  const keys = new Set();
  const virt = { gas: 0, brake: 0, lever: 0, steerAbs: null, map: false };
  const kb = { throttle: 0, brake: 0, lever: 0, held: 0 };
  const gearQueue = [];
  let parkReq = false;
  const listeners = new Set();
  const pad = { connected: false, gas: 0, brake: 0, steer: 0, hb: false, map: false, prev: [] };
  const state = { device: 'keyboard', map: false, scheme: 'lever' };

  const emit = (a, v) => { for (const fn of listeners) fn(a, v); };

  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    state.device = 'keyboard';
    if (DRIVE_KEYS.includes(e.code)) { keys.add(e.code); e.preventDefault(); }
    if (e.repeat) return;
    if (e.code === 'KeyP') { parkReq = true; e.preventDefault(); return; }
    if (GEAR_KEYS[e.code]) { gearQueue.push(GEAR_KEYS[e.code]); e.preventDefault(); return; }
    const a = ACTION_KEYS[e.code];
    if (a) { emit(a); if (a !== 'confirm') e.preventDefault(); }
  };
  const onKeyUp = (e) => { keys.delete(e.code); };
  const reset = () => { keys.clear(); kb.throttle = 0; kb.brake = 0; kb.lever = 0; virt.gas = 0; virt.brake = 0; virt.lever = 0; virt.steerAbs = null; virt.map = false; parkReq = false; };
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', reset);

  function pollPad() {
    let gp = null;
    try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) { gp = g; break; } } catch { gp = null; }
    pad.connected = !!gp;
    if (!gp) return;
    const val = (i) => { const b = gp.buttons[i]; return b ? (typeof b === 'number' ? b : b.value ?? (b.pressed ? 1 : 0)) : 0; };
    const pressed = (i) => val(i) > 0.5;
    const edge = (i) => pressed(i) && !pad.prev[i];
    const ax = gp.axes?.[0] ?? 0;
    pad.steer = Math.abs(ax) < 0.06 ? 0 : (ax - Math.sign(ax) * 0.06) / 0.94;
    pad.gas = val(7); pad.brake = val(6);
    pad.hb = pressed(2);
    pad.map = pressed(1);
    if (edge(5)) gearQueue.push('D');
    if (edge(4)) gearQueue.push('R');
    if (edge(3)) parkReq = true;
    if (edge(9)) emit('pause');
    if (edge(8)) emit('retry');
    if (edge(0)) emit('confirm');
    if (pad.gas > 0.05 || pad.brake > 0.05 || Math.abs(ax) > 0.2) state.device = 'pad';
    for (let i = 0; i < gp.buttons.length; i++) pad.prev[i] = pressed(i);
  }

  const out = { throttle: 0, brake: 0, lever: 0, handbrake: false, steerAbs: null, steerDir: 0, gear: null, park: false, autoCenter: true };

  return {
    state,
    /** Her karede bir kez. */
    read(dt) {
      pollPad();
      const has = (...c) => c.some((k) => keys.has(k));
      const up = has('KeyW', 'ArrowUp'), dn = has('KeyS', 'ArrowDown'), slow = has('ShiftLeft', 'ShiftRight');
      // pedal şeması
      kb.throttle = up ? Math.min(1, kb.throttle + dt * 1.5) : Math.max(0, kb.throttle - dt * 7);
      kb.brake = dn ? Math.min(1, kb.brake + dt * 3.2) : Math.max(0, kb.brake - dt * 9);
      // kol şeması: basınca yavaş başla, basılı tutunca hızlan; Shift: hassas sürünme
      const want = up && !dn ? 1 : dn && !up ? -1 : 0;
      if (want) {
        kb.held = Math.sign(kb.lever) === want ? kb.held + dt : 0;
        const mag = slow ? 0.24 : Math.min(1, 0.32 + kb.held * 0.42);
        kb.lever = want * mag;
      } else { kb.lever = 0; kb.held = 0; }
      const left = has('KeyA', 'ArrowLeft'), right = has('KeyD', 'ArrowRight');
      let steerAbs = virt.steerAbs;
      if (steerAbs == null && pad.connected && state.device === 'pad') steerAbs = pad.steer;
      state.map = virt.map || keys.has('Tab') || pad.map;
      const padLever = (pad.gas || 0) - (pad.brake || 0);
      out.throttle = Math.max(kb.throttle, virt.gas, pad.gas || 0);
      out.brake = Math.max(kb.brake, virt.brake, pad.brake || 0);
      out.lever = Math.abs(virt.lever) > 0.01 ? virt.lever : Math.abs(kb.lever) > 0 ? kb.lever : padLever;
      out.handbrake = keys.has('Space') || pad.hb;
      out.steerAbs = steerAbs;
      out.steerDir = steerAbs == null ? (right ? 1 : 0) - (left ? 1 : 0) : 0;
      out.gear = gearQueue.shift() || null;
      out.park = parkReq; parkReq = false;
      return out;
    },
    /** Dokunmatik: pedal (0..1), kol (-1..1), direksiyon (-1..1 | null), harita. */
    setVirtual(name, v) { virt[name] = v; if (name !== 'map' && v) state.device = 'touch'; },
    requestGear(g) { gearQueue.push(g); },
    requestPark() { parkReq = true; },
    onAction(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    clearGears() { gearQueue.length = 0; parkReq = false; },
    reset,
  };
}
