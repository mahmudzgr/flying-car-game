// Milimetrik Park — dokunmatik kontroller: direksiyon simidi (ya da kaydırma), analog pedallar, vites kolu.
// Her öğe kendi pointerId'sini yakalar; çoklu dokunuşla aynı anda direksiyon + pedal + vites kullanılabilir.

const WHEEL_SVG = `
<svg viewBox="-100 -100 200 200" aria-hidden="true">
  <defs>
    <radialGradient id="wg" cx="0" cy="-20" r="120" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3a414b"/><stop offset="1" stop-color="#14181d"/>
    </radialGradient>
  </defs>
  <circle r="92" fill="none" stroke="#0c0f13" stroke-width="20"/>
  <circle r="92" fill="none" stroke="url(#wg)" stroke-width="15"/>
  <circle r="92" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="15" stroke-dasharray="3 6"/>
  <path d="M-84 6 L-30 14 L-22 34 L22 34 L30 14 L84 6" fill="none" stroke="#1d2229" stroke-width="16" stroke-linejoin="round"/>
  <path d="M0 34 L0 84" stroke="#1d2229" stroke-width="18"/>
  <circle r="30" fill="#232931" stroke="#0c0f13" stroke-width="3"/>
  <circle r="12" fill="#2f7bff" opacity=".9"/>
  <rect x="-5" y="-101" width="10" height="20" rx="3" fill="#ffd23f"/>
</svg>`;

export function createControls(root, input) {
  const wrap = document.createElement('div');
  wrap.className = 'controls';
  wrap.innerHTML = `
    <div class="steer-zone">
      <div class="wheel" data-wheel>${WHEEL_SVG}</div>
      <div class="slider" data-slider hidden><div class="slider-track"><span class="slider-mid"></span></div><div class="slider-knob"></div><small>Sürükle: direksiyon</small></div>
    </div>
    <div class="drive-zone">
      <div class="gears" data-gears role="group" aria-label="Vites">
        <button type="button" data-g="P" aria-label="Park">P</button>
        <button type="button" data-g="R" aria-label="Geri">R</button>
        <button type="button" data-g="N" aria-label="Boş">N</button>
        <button type="button" data-g="D" aria-label="İleri">D</button>
      </div>
      <div class="pedal brake" data-pedal="brake" aria-label="Fren"><i class="fill"></i><b>FREN</b></div>
      <div class="pedal gas" data-pedal="gas" aria-label="Gaz"><i class="fill"></i><b>GAZ</b></div>
    </div>`;
  root.appendChild(wrap);

  const wheel = wrap.querySelector('[data-wheel]');
  const wheelSvg = wheel.querySelector('svg');
  const slider = wrap.querySelector('[data-slider]');
  const gearBtns = [...wrap.querySelectorAll('[data-g]')];
  const pedals = { brake: wrap.querySelector('[data-pedal="brake"]'), gas: wrap.querySelector('[data-pedal="gas"]') };
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  wrap.classList.toggle('faint', fine);

  let mode = 'wheel', lock = 360;
  let held = false, rot = 0, lastAng = 0, wheelId = null;
  let sliderId = null, sx0 = 0, ss0 = 0;
  let currentSteer = 0;

  const haptic = (ms) => { if (navigator.vibrate && root.dataset.haptics !== '0') { try { navigator.vibrate(ms); } catch { /* yoksay */ } } };
  const wake = () => wrap.classList.remove('faint');

  // ---------------- simit
  function angleOf(e) {
    const r = wheel.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return { a: Math.atan2(e.clientY - cy, e.clientX - cx), d: Math.hypot(e.clientX - cx, e.clientY - cy) / (r.width / 2) };
  }
  wheel.addEventListener('pointerdown', (e) => {
    e.preventDefault(); wake();
    try { wheel.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    wheelId = e.pointerId;
    held = true;
    rot = currentSteer * lock;
    lastAng = angleOf(e).a;
    input.setVirtual('steerAbs', rot / lock);
    wheel.classList.add('on');
  });
  wheel.addEventListener('pointermove', (e) => {
    if (e.pointerId !== wheelId) return;
    const { a, d } = angleOf(e);
    let da = a - lastAng;
    if (da > Math.PI) da -= Math.PI * 2; else if (da < -Math.PI) da += Math.PI * 2;
    lastAng = a;
    if (d < 0.18) return;                       // merkezde açı kararsız
    rot = Math.max(-lock, Math.min(lock, rot + (da * 180) / Math.PI));
    input.setVirtual('steerAbs', rot / lock);
  });
  const wheelUp = (e) => {
    if (e.pointerId !== wheelId) return;
    wheelId = null; held = false;
    input.setVirtual('steerAbs', null);
    wheel.classList.remove('on');
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) wheel.addEventListener(ev, wheelUp);

  // ---------------- kaydırma
  slider.addEventListener('pointerdown', (e) => {
    e.preventDefault(); wake();
    try { slider.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    sliderId = e.pointerId; held = true;
    sx0 = e.clientX; ss0 = currentSteer;
    input.setVirtual('steerAbs', ss0);
    slider.classList.add('on');
  });
  slider.addEventListener('pointermove', (e) => {
    if (e.pointerId !== sliderId) return;
    const w = slider.getBoundingClientRect().width * 0.42;
    input.setVirtual('steerAbs', Math.max(-1, Math.min(1, ss0 + (e.clientX - sx0) / w)));
  });
  const sliderUp = (e) => {
    if (e.pointerId !== sliderId) return;
    sliderId = null; held = false;
    input.setVirtual('steerAbs', null);
    slider.classList.remove('on');
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) slider.addEventListener(ev, sliderUp);

  // ---------------- pedallar (dikey konum = basınç)
  for (const [name, el] of Object.entries(pedals)) {
    let id = null;
    const set = (e) => {
      const r = el.getBoundingClientRect();
      // parmak ne kadar yukarıdaysa o kadar sert; alt yarı ince ayar bölgesi (kademeli eğri)
      const pos = Math.max(0.08, Math.min(1, (r.bottom - e.clientY) / r.height));
      input.setVirtual(name, Math.pow(pos, 1.35));
      el.style.setProperty('--p', pos.toFixed(3));
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); wake();
      try { el.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
      id = e.pointerId; el.classList.add('on'); set(e); haptic(5);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
    const up = (e) => { if (e.pointerId !== id) return; id = null; el.classList.remove('on'); input.setVirtual(name, 0); el.style.setProperty('--p', '0'); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, up);
  }

  // ---------------- vites
  for (const b of gearBtns) {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); wake(); input.requestGear(b.dataset.g); haptic(12); });
    b.addEventListener('click', (e) => e.preventDefault());
  }

  wrap.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const ev of ['touchstart', 'touchmove']) wrap.addEventListener(ev, (e) => { if (e.target.closest('.wheel, .slider, .pedal, .gears')) e.preventDefault(); }, { passive: false });
  const onKey = (e) => { if (fine && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) wrap.classList.add('faint'); };
  window.addEventListener('keydown', onKey);

  function releaseAll() {
    wheelId = null; sliderId = null; held = false;
    input.setVirtual('steerAbs', null); input.setVirtual('gas', 0); input.setVirtual('brake', 0);
    for (const el of Object.values(pedals)) { el.classList.remove('on'); el.style.setProperty('--p', '0'); }
    wheel.classList.remove('on'); slider.classList.remove('on');
  }
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  let lastGear = '', lastHint = false;
  return {
    el: wrap,
    setMode(m, lk) {
      mode = m === 'slider' ? 'slider' : 'wheel';
      lock = lk || 360;
      wheel.hidden = mode !== 'wheel';
      slider.hidden = mode !== 'slider';
    },
    show(on) { wrap.hidden = !on; if (!on) releaseAll(); },
    releaseAll,
    /** Her kare: araç durumunu görsellere yansıt. */
    update(car, parkHint) {
      currentSteer = car.steer;
      const disp = held && mode === 'wheel' ? rot : car.steer * lock;
      wheelSvg.style.transform = `rotate(${disp.toFixed(1)}deg)`;
      if (mode === 'slider') slider.style.setProperty('--s', car.steer.toFixed(3));
      if (car.gear !== lastGear) {
        for (const b of gearBtns) b.classList.toggle('sel', b.dataset.g === car.gear);
        lastGear = car.gear;
      }
      if (parkHint !== lastHint) { gearBtns[0].classList.toggle('hint', parkHint); lastHint = parkHint; }
    },
  };
}
