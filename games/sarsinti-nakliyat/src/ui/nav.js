// Ekran yığını + klavye/yön tuşu gezinmesi (↑↓←→ Enter Esc). Sahip: Arayüz.
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]';

const visible = (el) => {
  if (el.closest('[hidden], [inert]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

export function createNav(host) {
  const screens = new Map();
  let stack = []; // [{name, ret}]
  const api = {
    register(name, scr) { screens.set(name, scr); scr.el.hidden = true; scr.el.dataset.screen = name; host.appendChild(scr.el); },
    get stack() { return stack.map((s) => s.name); },
    get active() { return stack.length > 0; },
    top() { return stack.length ? screens.get(stack[stack.length - 1].name) : null; },
    topName() { return stack.length ? stack[stack.length - 1].name : null; },
    /** Yığını baştan kurar. names: ['home','garage'] */
    set(names, params = {}) {
      const prevTop = api.topName();
      stack = names.map((name) => ({ name, ret: null }));
      names.forEach((n, i) => screens.get(n)?.enter?.(i === names.length - 1 ? params : {}));
      api.apply(prevTop !== api.topName());
    },
    push(name, params = {}) {
      if (stack.length) { const a = document.activeElement; stack[stack.length - 1].ret = a && a.dataset ? { el: a, key: a.dataset.key ?? null } : null; }
      stack.push({ name, ret: null });
      screens.get(name)?.enter?.(params);
      api.apply(true);
    },
    back() {
      if (stack.length <= 1) return false;
      stack.pop();
      const cur = stack[stack.length - 1];
      screens.get(cur.name)?.enter?.({ resume: true });
      api.apply(false);
      const r = cur.ret;
      const target = r && (r.el.isConnected && visible(r.el) ? r.el : r.key ? screens.get(cur.name)?.el.querySelector(`[data-key="${CSS.escape(r.key)}"]:not([disabled])`) : null);
      if (target) target.focus({ preventScroll: true }); else api.focusDefault();
      return true;
    },
    apply(focus = true) {
      const names = stack.map((s) => s.name);
      const top = names[names.length - 1];
      const topScr = screens.get(top);
      const under = topScr?.modal && names.length > 1 ? names[names.length - 2] : null;
      for (const [n, scr] of screens) {
        const show = n === top || n === under;
        scr.el.hidden = !show;
        if (show && n === under) { scr.el.setAttribute('inert', ''); scr.el.classList.add('under'); }
        else { scr.el.removeAttribute('inert'); scr.el.classList.remove('under'); }
      }
      if (focus) api.focusDefault();
    },
    focusDefault() {
      const scr = api.top(); if (!scr) return;
      const el = scr.el.querySelector('[data-autofocus]:not([disabled])') ?? [...scr.el.querySelectorAll(FOCUSABLE)].find(visible);
      el?.focus({ preventScroll: true });
    },
    /** Yeniden çizimden sonra odak kaybolmasın: data-key ile geri bul. */
    render(el, html) {
      const key = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.key : null;
      el.innerHTML = html;
      if (key) { const n = el.querySelector(`[data-key="${CSS.escape(key)}"]:not([disabled])`); if (n) n.focus({ preventScroll: true }); else if (!el.hidden) api.focusDefault(); }
    },
    /** Yön tuşu: en yakın odaklanabilir elemana geç. */
    move(dir) {
      const scr = api.top(); if (!scr) return;
      const list = [...scr.el.querySelectorAll(FOCUSABLE)].filter(visible);
      const cur = document.activeElement && scr.el.contains(document.activeElement) ? document.activeElement : null;
      if (!cur) { list[0]?.focus(); return; }
      const c = cur.getBoundingClientRect();
      const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      let best = null, bestScore = Infinity;
      for (const el of list) {
        if (el === cur) continue;
        const r = el.getBoundingClientRect();
        const ex = r.left + r.width / 2, ey = r.top + r.height / 2;
        const dx = ex - cx, dy = ey - cy;
        let main, cross;
        if (dir === 'right') { main = r.left - c.right; if (dx <= 1) continue; cross = Math.abs(dy); }
        else if (dir === 'left') { main = c.left - r.right; if (dx >= -1) continue; cross = Math.abs(dy); }
        else if (dir === 'down') { main = r.top - c.bottom; if (dy <= 1) continue; cross = Math.abs(dx); }
        else { main = c.top - r.bottom; if (dy >= -1) continue; cross = Math.abs(dx); }
        const score = Math.max(0, main) + cross * 2.2 + (main < 0 ? 40 : 0);
        if (score < bestScore) { bestScore = score; best = el; }
      }
      best?.focus();
    },
  };
  return api;
}
