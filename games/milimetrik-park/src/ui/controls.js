// Milimetrik Park — dokunmatik kontroller.
// Sol: direksiyon simidi (ya da kaydırma). Sağ, şemaya göre:
//  - 'lever' (sürüş kolu): yaylı dikey kol — yukarı it ileri, aşağı çek geri; ortadan uzaklık gaz miktarı;
//    bırakınca ortaya döner ve araç frenle durur. Yanında ayrı P (park) düğmesi.
//  - 'pedals': P R N D vites, FREN ve GAZ pedalları (parmak ne kadar yukarıdaysa o kadar sert).
// Her öğe kendi pointerId'sini yakalar; çoklu dokunuşla direksiyon + kol aynı anda kullanılır.

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
    <div class="drive-zone pedals-ui" data-pedals>
      <div class="gears" data-gears role="group" aria-label="Vites">
        <button type="button" data-g="P" aria-label="Park">P</button>
        <button type="button" data-g="R" aria-label="Geri">R</button>
        <button type="button" data-g="N" aria-label="Boş">N</button>
        <button type="button" data-g="D" aria-label="İleri">D</button>
      </div>
      <div class="pedal brake" data-pedal="brake" aria-label="Fren"><i class="fill"></i><b>FREN</b></div>
      <div class="pedal gas" data-pedal="gas" aria-label="Gaz"><i class="fill"></i><b>GAZ</b></div>
    </div>
    <div class="drive-zone lever-ui" data-lever-ui hidden>
      <button type="button" class="pbtn" data-park aria-label="Park et (P)">P</button>
      <div class="lever" data-lever aria-label="Sürüş kolu: yukarı ileri, aşağı geri">
        <span class="lv-lab up">İLERİ</span><span class="lv-lab down">GERİ</span>
        <i class="lv-fill"></i><i class="lv-mid"></i>
        <span class="lv-knob"><b data-lvg>P</b></span>
      </div>
    </div>`;
  root.appendChild(wrap);

  const wheel = wrap.querySelector('[data-wheel]');
  const wheelSvg = wheel.querySelector('svg');
  const slider = wrap.querySelector('[data-slider]');
  const gearBtns = [...wrap.querySelectorAll('[data-g]')];
  const pedals = { brake: wrap.querySelector('[data-pedal="brake"]'), gas: wrap.querySelector('[data-pedal="gas"]') };
  const pedalUi = wrap.querySelector('[data-pedals]');
  const leverUi = wrap.querySelector('[data-lever-ui]');
  const lever = wrap.querySelector('[data-lever]');
  const leverGear = wrap.querySelector('[data-lvg]');
  const parkBtn = wrap.querySelector('[data-park]');
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  wrap.classList.toggle('faint', fine);

  let mode = 'wheel', lock = 360, scheme = 'lever';
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
    wheelId = e.pointerId; held = true;
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
    if (d < 0.18) return;
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

  // ---------------- sürüş kolu (yaylı)
  let leverId = null, leverV = 0, lastZone = 0;
  const setLever = (v) => {
    leverV = v;
    lever.style.setProperty('--v', v.toFixed(3));
    lever.classList.toggle('fwd', v > 0.06); lever.classList.toggle('rev', v < -0.06);
    input.setVirtual('lever', v);
    const zone = v > 0.06 ? 1 : v < -0.06 ? -1 : 0;
    if (zone !== lastZone) { haptic(8); lastZone = zone; }
  };
  const leverFromEvent = (e) => {
    const r = lever.getBoundingClientRect();
    const mid = r.top + r.height / 2, half = r.height / 2 - 26;
    return Math.max(-1, Math.min(1, (mid - e.clientY) / half));
  };
  let grabOff = 0;
  lever.addEventListener('pointerdown', (e) => {
    e.preventDefault(); wake();
    try { lever.setPointerCapture(e.pointerId); } catch { /* yoksay */ }
    leverId = e.pointerId;
    lever.classList.add('on');
    // dokunulan yer topuzun üstüyse kayma olmasın; değilse doğrudan oraya git
    const v = leverFromEvent(e);
    grabOff = Math.abs(v - leverV) < 0.25 ? leverV - v : 0;
    setLever(Math.max(-1, Math.min(1, v + grabOff)));
  });
  lever.addEventListener('pointermove', (e) => { if (e.pointerId === leverId) setLever(Math.max(-1, Math.min(1, leverFromEvent(e) + grabOff))); });
  const leverUp = (e) => {
    if (e.pointerId !== leverId) return;
    leverId = null;
    lever.classList.remove('on');
    setLever(0);
  };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) lever.addEventListener(ev, leverUp);
  parkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); wake(); input.requestPark(); haptic(15); });

  // ---------------- pedallar
  for (const [name, el] of Object.entries(pedals)) {
    let id = null;
    const set = (e) => {
      const r = el.getBoundingClientRect();
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

  for (const b of gearBtns) {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); wake(); if (b.dataset.g === 'P') input.requestPark(); else input.requestGear(b.dataset.g); haptic(12); });
    b.addEventListener('click', (e) => e.preventDefault());
  }

  wrap.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const ev of ['touchstart', 'touchmove']) wrap.addEventListener(ev, (e) => { if (e.target.closest('.wheel, .slider, .pedal, .gears, .lever, .pbtn')) e.preventDefault(); }, { passive: false });
  const onKey = (e) => { if (fine && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) wrap.classList.add('faint'); };
  window.addEventListener('keydown', onKey);

  function releaseAll() {
    wheelId = null; sliderId = null; leverId = null; held = false;
    input.setVirtual('steerAbs', null); input.setVirtual('gas', 0); input.setVirtual('brake', 0);
    setLever(0);
    for (const el of Object.values(pedals)) { el.classList.remove('on'); el.style.setProperty('--p', '0'); }
    wheel.classList.remove('on'); slider.classList.remove('on'); lever.classList.remove('on');
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
    setScheme(s) {
      scheme = s === 'pedals' ? 'pedals' : 'lever';
      pedalUi.hidden = scheme !== 'pedals';
      leverUi.hidden = scheme !== 'lever';
      releaseAll();
    },
    show(on) { wrap.hidden = !on; if (!on) releaseAll(); },
    releaseAll,
    /** Her kare: araç durumunu görsellere yansıt. */
    update(car, parkHint, hold) {
      currentSteer = car.steer;
      const disp = held && mode === 'wheel' ? rot : car.steer * lock;
      wheelSvg.style.transform = `rotate(${disp.toFixed(1)}deg)`;
      if (mode === 'slider') slider.style.setProperty('--s', car.steer.toFixed(3));
      if (car.gear !== lastGear) {
        for (const b of gearBtns) b.classList.toggle('sel', b.dataset.g === car.gear);
        leverGear.textContent = car.gear;
        leverUi.dataset.g = car.gear;
        lastGear = car.gear;
      }
      const hint = !!parkHint;
      if (hint !== lastHint) { gearBtns[0].classList.toggle('hint', hint); parkBtn.classList.toggle('hint', hint); lastHint = hint; }
      pedalUi.classList.toggle('hold', !!hold);
    },
  };
}
