// Three.js presentation layer: builds a 2.5D diorama from the 2D physics level.
import * as THREE from 'three';
import { createCarModel } from './carModel.js';
import { Particles } from './effects.js';
import { predictTrajectory } from './physics.js';

const Z_FRONT = 8;
const Z_BACK = -90;

// `dust`: colour of what the wheels / thrusters kick up from natural ground (never the grass colour).
export const THEMES = {
  earth: { skyTop: 0x2f7fd0, skyBot: 0xcfe9ff, fog: 0xcfe6fa, fogFar: 520, top: 0x5f9e3a, wall: 0x7a5b3c, cap: 0x5a3f27, deco: 'trees', mountains: 0x8aa4bf, clouds: true, sun: 1.0, hemi: [0xd8ecff, 0x50603a], road: true, dust: [0.66, 0.58, 0.47] },
  valley: { skyTop: 0x4a86c0, skyBot: 0xdfe9ef, fog: 0xd4e0e8, fogFar: 460, top: 0x4f8a35, wall: 0x6d6255, cap: 0x4c4033, deco: 'pines', mountains: 0x7f93a6, clouds: true, sun: 0.9, hemi: [0xe0eef8, 0x4a5a3a], road: true, dust: [0.64, 0.58, 0.5] },
  canyon: { skyTop: 0x3c8fd6, skyBot: 0xf3dcb4, fog: 0xf0d8b0, fogFar: 520, top: 0xc98a4c, wall: 0xa85d30, cap: 0x8a4a26, deco: 'mesas', mountains: 0xc7835a, clouds: false, sun: 1.15, hemi: [0xfff0dd, 0x8a5a3a], road: true, dust: [0.86, 0.67, 0.47] },
  city: { skyTop: 0x141a45, skyBot: 0xf0875a, fog: 0x7a5a78, fogFar: 600, top: 0x555b66, wall: 0x2b3140, cap: 0x2b3140, deco: 'city', mountains: null, clouds: false, sun: 0.55, hemi: [0xffc7a8, 0x30304a], road: true, windows: true, night: true, dust: [0.62, 0.62, 0.64] },
  moon: { skyTop: 0x000005, skyBot: 0x0b0d16, fog: 0x0b0d16, fogFar: 900, top: 0xa3a3a3, wall: 0x6e6e6e, cap: 0x4f4f4f, deco: 'moon', mountains: 0x3a3a3e, clouds: false, sun: 1.4, hemi: [0x9fa6b8, 0x202020], road: true, stars: true, space: true, dust: [0.64, 0.64, 0.66] },
  mars: { skyTop: 0xc58a5a, skyBot: 0xf2cfa4, fog: 0xe6b88c, fogFar: 480, top: 0xb4552c, wall: 0x8a3c1c, cap: 0x6b2a12, deco: 'mars', mountains: 0xa0583a, clouds: false, sun: 1.0, hemi: [0xffd9b8, 0x6b3020], road: true, dust: [0.8, 0.47, 0.3] },
  sea: { skyTop: 0x2c86d6, skyBot: 0xd4ecff, fog: 0xcfe4f5, fogFar: 700, top: 0x8a6a48, wall: 0x5b4632, cap: 0x4a3828, deco: 'sea', mountains: 0x7aa0b8, clouds: true, sun: 1.05, hemi: [0xd8ecff, 0x2a5a7a], road: true, pier: true, dust: [0.78, 0.76, 0.72] },
  sunset: { skyTop: 0x2a1850, skyBot: 0xff8a45, fog: 0xc0705a, fogFar: 520, top: 0x7a5236, wall: 0x52301e, cap: 0x3a2014, deco: 'mesas', mountains: 0x5a2e3a, clouds: false, sun: 0.85, hemi: [0xffb27a, 0x3a2030], road: true, dust: [0.62, 0.5, 0.4] },
  snow: { skyTop: 0x3f86d9, skyBot: 0xe4f1ff, fog: 0xe8f1fa, fogFar: 520, top: 0xf2f6fa, wall: 0x8a919c, cap: 0x6a707a, deco: 'snow', mountains: 0xe6eef7, clouds: true, sun: 1.1, hemi: [0xeaf4ff, 0x9aa8b8], road: true, dust: [0.97, 0.98, 1.0], snowfall: 0.35 },
  frost: { skyTop: 0x27406e, skyBot: 0xf5c7a0, fog: 0xdfc3b8, fogFar: 520, top: 0xeef3f8, wall: 0x7b8594, cap: 0x5f6876, deco: 'snow', mountains: 0xb9c3d3, clouds: true, sun: 0.85, hemi: [0xffe0c8, 0x8090a8], road: true, dust: [0.95, 0.97, 1.0], snowfall: 0.6 },
  titan: { skyTop: 0x8a5a22, skyBot: 0xd9a35b, fog: 0xc28d4c, fogFar: 300, top: 0x6b4a2a, wall: 0x4a321c, cap: 0x3a2414, deco: 'titan', mountains: 0x7a5530, clouds: false, sun: 0.55, hemi: [0xffc98a, 0x3a2810], road: true, dust: [0.56, 0.43, 0.29] },
  site: { skyTop: 0x2c3e74, skyBot: 0xffb070, fog: 0xc89a8a, fogFar: 600, top: 0x5a5f66, wall: 0x3a3f4a, cap: 0x2e333d, deco: 'site', mountains: null, clouds: true, sun: 0.8, hemi: [0xffd2b0, 0x3a3a4a], road: true, windows: true, dust: [0.68, 0.64, 0.58] },
  neon: { skyTop: 0x05031a, skyBot: 0x3a1450, fog: 0x2a1440, fogFar: 520, top: 0x2a2a35, wall: 0x16141f, cap: 0x16141f, deco: 'neon', mountains: null, clouds: false, sun: 0.35, hemi: [0xb48cff, 0x201030], road: true, windows: true, neonWindows: true, night: true, dust: [0.55, 0.55, 0.62] },
  storm: { skyTop: 0x161c24, skyBot: 0x46525e, fog: 0x3a444e, fogFar: 380, top: 0x6a5a48, wall: 0x4a3c2e, cap: 0x3a2e22, deco: 'sea', mountains: 0x3e4a56, clouds: true, darkClouds: true, sun: 0.45, hemi: [0x9fb0c4, 0x1e2a36], road: true, pier: true, rain: true, lightning: true, dust: [0.72, 0.74, 0.76] },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const TEX = {};
function grainTex() {
  if (TEX.grain) return TEX.grain;
  TEX.grain = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let i = 0; i < 900; i++) {
      const v = 200 + Math.floor(r() * 55);
      g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.4})`;
      const s = 2 + r() * 14;
      g.beginPath();
      g.ellipse(r() * w, r() * h, s, s * (0.4 + r() * 0.6), r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 4000; i++) {
      const v = 150 + Math.floor(r() * 100);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  });
  return TEX.grain;
}

function roadTex() {
  if (TEX.road) return TEX.road;
  TEX.road = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#2b2d31';
    g.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 3000; i++) {
      const v = 40 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${v},${v},${v + 4})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.fillStyle = '#e8e8e8';
    g.fillRect(0, 8, w, 6);
    g.fillRect(0, h - 14, w, 6);
    g.fillStyle = '#f2c230';
    for (let x = 0; x < w; x += 128) g.fillRect(x + 20, h / 2 - 3, 70, 6);
  });
  return TEX.road;
}

function stripeTex() {
  if (TEX.stripe) return TEX.stripe;
  TEX.stripe = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f2b705';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1a1a';
    for (let i = -2; i < 4; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64 + 32, 0);
      g.lineTo(i * 64 + 32 + 128, h);
      g.lineTo(i * 64 + 128, h);
      g.fill();
    }
  });
  return TEX.stripe;
}

function rampTopTex() {
  if (TEX.rampTop) return TEX.rampTop;
  TEX.rampTop = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3d44';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4a4e56';
    g.lineWidth = 3;
    for (let i = 0; i < w; i += 16) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, h);
      g.stroke();
    }
    g.fillStyle = '#ffd23a';
    for (let y = 40; y < h; y += 128) {
      g.beginPath();
      g.moveTo(60, y);
      g.lineTo(128, y + 60);
      g.lineTo(196, y);
      g.lineTo(196, y + 26);
      g.lineTo(128, y + 86);
      g.lineTo(60, y + 26);
      g.fill();
    }
  });
  return TEX.rampTop;
}

function padTex(len) {
  return canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#30343b';
    g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 4000; i++) {
      const v = 45 + Math.floor(r() * 30);
      g.fillStyle = `rgb(${v},${v},${v + 5})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    // edge hazard stripes
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = (x / 32) % 2 ? '#1a1a1a' : '#f2b705';
      g.fillRect(x, 0, 32, 14);
      g.fillRect(x, h - 14, 32, 14);
    }
    // distance ticks every 2 m
    g.fillStyle = 'rgba(255,255,255,0.55)';
    const ppm = w / len;
    for (let m = 0; m <= len; m += 2) {
      const x = m * ppm;
      g.fillRect(x - 1, 18, 2, m % 10 === 0 ? 30 : 14);
      g.fillRect(x - 1, h - 18 - (m % 10 === 0 ? 30 : 14), 2, m % 10 === 0 ? 30 : 14);
    }
    // target rings (ellipses since the deck is stretched)
    const cx = w / 2, cy = h / 2;
    const ring = (rm, col, lw) => {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      g.ellipse(cx, cy, rm * ppm, Math.min(h / 2 - 20, rm * ppm * 1.0) * (h / w) * (w / len) / (h / 10), 0, 0, Math.PI * 2);
      g.stroke();
    };
    const sy = (h / 10) / ppm; // deck is 10 m wide
    g.save();
    g.translate(cx, cy);
    g.scale(1, sy);
    for (const [rm, col] of [[8, '#ffffff'], [5, '#ffd23a'], [2.5, '#ff4b4b'], [1, '#ffffff']]) {
      g.strokeStyle = col;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(0, 0, rm * ppm, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
    void ring;
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.font = 'bold 64px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.translate(cx, cy);
    g.scale(1, sy);
    g.fillText('H', 0, 4);
    g.restore();
  }, false);
}

function windowsTex(neon = false) {
  const key = neon ? 'windowsNeon' : 'windows';
  if (TEX[key]) return TEX[key];
  const neonCols = ['#ff3fd2', '#38e8ff', '#9b5cff', '#ff7a3d'];
  TEX[key] = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = neon ? '#120f1e' : '#262c3a';
    g.fillRect(0, 0, w, h);
    const r = rng(neon ? 15 : 5);
    for (let y = 8; y < h; y += 32) {
      for (let x = 6; x < w; x += 24) {
        const lit = r() < (neon ? 0.35 : 0.45);
        const v = lit ? 255 : 80 + r() * 40;
        if (lit) g.fillStyle = neon ? neonCols[Math.floor(r() * neonCols.length)] : `rgb(255,${200 + r() * 40},${120 + r() * 60})`;
        else g.fillStyle = `rgb(${v * 0.35},${v * 0.4},${v * 0.55})`;
        g.fillRect(x, y, 14, 18);
      }
    }
  });
  return TEX[key];
}

// steel truss (cranes, lift shaft)
function latticeTex() {
  if (TEX.lattice) return TEX.lattice;
  TEX.lattice = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#f2b705';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(3, 3);
    g.lineTo(w - 3, h - 3);
    g.moveTo(w - 3, 3);
    g.lineTo(3, h - 3);
    g.stroke();
  });
  return TEX.lattice;
}

function iceTex(len) {
  return canvasTex(1024, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#dff0fb');
    grd.addColorStop(0.5, '#c7e3f6');
    grd.addColorStop(1, '#e8f5fd');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const r = rng(31);
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      // cracks
      let x = r() * w, y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 60;
        y += (r() - 0.5) * 30;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    // rink-style markings: blue lines + red target
    const ppm = w / len;
    g.fillStyle = 'rgba(40,90,200,0.55)';
    for (let m = 0; m <= len; m += 10) g.fillRect(m * ppm - 2, 0, 4, h);
    const sy = (h / 10) / ppm;
    g.save();
    g.translate(w / 2, h / 2);
    g.scale(1, sy);
    for (const [rm, col] of [[6, 'rgba(220,40,40,0.7)'], [3, 'rgba(220,40,40,0.7)'], [1, 'rgba(40,90,200,0.8)']]) {
      g.strokeStyle = col;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(0, 0, rm * ppm, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }, false);
}

function lavaTex() {
  if (TEX.lava) return TEX.lava;
  TEX.lava = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ff5a00';
    g.fillRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 160; i++) {
      const s = 6 + r() * 30;
      g.fillStyle = r() < 0.5 ? 'rgba(120,10,0,0.6)' : 'rgba(255,220,80,0.55)';
      g.beginPath();
      g.ellipse(r() * w, r() * h, s, s * 0.6, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
  return TEX.lava;
}

function makeStarGeo() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1.0;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2 });
  g.center();
  return g;
}

// Colour faces of an extruded polygon by orientation: top / wall / front cap.
function colorize(geo, topC, wallC, capC, flip = false) {
  geo.computeVertexNormals();
  const n = geo.attributes.normal;
  const cols = new Float32Array(n.count * 3);
  const a = new THREE.Color(topC), b = new THREE.Color(wallC), c = new THREE.Color(capC);
  for (let i = 0; i < n.count; i++) {
    const ny = n.getY(i), nz = n.getZ(i);
    let col = b;
    if (Math.abs(nz) > 0.5) col = c;
    else if (ny * (flip ? -1 : 1) > 0.55) col = a;
    cols[i * 3] = col.r;
    cols[i * 3 + 1] = col.g;
    cols[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}

function extrudePoly(points, z0, z1) {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p[0], p[1])));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, z0);
  return geo;
}

function setBetween(mesh, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}

export class GameScene {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 2500);
    this.camPos = new THREE.Vector3(0, 5, 30);
    this.camLook = new THREE.Vector3(0, 0, 0);
    this.shakeAmt = 0;
    this.quality = quality;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.shadow.camera.left = -36;
    this.sun.shadow.camera.right = 36;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun, this.sun.target);

    // Sky dome
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(-0.5, 0.5, 0.6).normalize() }, sunStr: { value: 1 } },
      vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform float sunStr; varying vec3 vW;
        void main(){ float h = clamp(vW.y*1.4+0.12,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.75));
          float s = max(dot(normalize(vW), sunDir),0.0); c += vec3(1.0,0.85,0.6)*pow(s,64.0)*1.4*sunStr + vec3(1.0,0.7,0.4)*pow(s,6.0)*0.18*sunStr;
          gl_FragColor = vec4(c,1.0); }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // Car
    this.car = createCarModel();
    this.scene.add(this.car.root);
    this.ghost = createCarModel({ ghost: true });
    this.ghost.root.visible = false;
    this.scene.add(this.ghost.root);

    // Particles
    this.fx = new Particles(1500, true);
    this.smoke = new Particles(1500, false);
    this.scene.add(this.fx.points, this.smoke.points);

    // Trajectory assist
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3));
    this.trajLine = new THREE.Line(tg, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.9, gapSize: 0.7, transparent: true, opacity: 0.85, depthWrite: false }));
    this.trajLine.frustumCulled = false;
    this.trajLine.renderOrder = 5;
    this.scene.add(this.trajLine);
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.4, 32), new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.renderOrder = 5;
    this.scene.add(this.marker);

    this.levelGroup = null;
    this.tmpV = new THREE.Vector3();
    this.time = 0;
    this.setQuality(quality);
  }

  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(Math.min(dpr, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1));
    const shadows = q !== 'low';
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sun.castShadow = shadows;
    const size = q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep a similar horizontal field of view in portrait
    const hfov = 62;
    const vfov = (2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / this.camera.aspect) * 180) / Math.PI;
    this.camera.fov = Math.min(80, Math.max(38, vfov));
    this.camera.updateProjectionMatrix();
    const scale = h * this.renderer.getPixelRatio() * 0.5 / Math.tan((this.camera.fov * Math.PI) / 360);
    this.fx.setScale(scale);
    this.smoke.setScale(scale);
  }

  disposeLevel() {
    if (!this.levelGroup) return;
    this.scene.remove(this.levelGroup);
    this.levelGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (m.map && !Object.values(TEX).includes(m.map)) m.map.dispose();
          m.dispose();
        }
      }
    });
    this.levelGroup = null;
  }

  load(run, { ghost = null } = {}) {
    if (this.levelGroup && this.L && this.L.def === run.L.def) {
      // same level: keep the geometry, just reset dynamic state (fast restart)
      this.L = run.L;
      run.collectibles.forEach((c, i) => {
        const g = this.collMeshes[i];
        g.visible = true;
        g.position.set(c.x, c.y, 0);
      });
      this.resetDynamic(run, ghost);
      return;
    }
    this.disposeLevel();
    const L = run.L;
    const def = L.def;
    const th = THEMES[def.theme] || THEMES.earth;
    this.theme = th;
    this.L = L;
    const G = (this.levelGroup = new THREE.Group());
    this.scene.add(G);
    const r = rng((typeof def.id === 'number' ? def.id : def.seed || 7) * 977 + 13);
    this.flags = null;
    this.cables = null;
    this.precip = null;
    this.lightning = th.lightning ? { t: 3 + Math.random() * 4, flash: 0 } : null;

    // Sky, fog, lights
    this.skyMat.uniforms.top.value.set(th.skyTop);
    this.skyMat.uniforms.bottom.value.set(th.skyBot);
    this.skyMat.uniforms.sunStr.value = th.space ? 0.6 : th.night ? 0.6 : 1;
    this.scene.fog = new THREE.Fog(th.fog, 120, th.fogFar);
    this.hemi.color.set(th.hemi[0]);
    // bounce light from below: mostly neutral (road), only a hint of the theme colour
    this.hemi.groundColor.set(th.hemi[1]).lerp(new THREE.Color(0x4a4a4c), 0.7);
    this.hemi.intensity = th.space ? 0.35 : 0.9;
    this.baseHemi = this.hemi.intensity;
    this.baseSkyTop = new THREE.Color(th.skyTop);
    this.baseSkyBot = new THREE.Color(th.skyBot);
    this.sun.intensity = 2.4 * th.sun;
    this.sun.color.set(th.night ? 0xffb38a : th.space ? 0xffffff : 0xfff2e0);
    this.renderer.toneMappingExposure = th.night ? 1.05 : 1.0;
    this.buildEnvironment(th);

    const grain = grainTex();
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: 0.95, metalness: 0.0 });
    grain.repeat.set(0.08, 0.08);
    const wtex = windowsTex(!!th.neonWindows);
    const windowMat = th.windows ? new THREE.MeshStandardMaterial({ color: 0xffffff, map: wtex, emissive: 0xffffff, emissiveMap: wtex, emissiveIntensity: th.neonWindows ? 1.1 : 0.7, roughness: 0.6 }) : null;
    if (windowMat) windowMat.map.repeat.set(0.05, 0.05);

    this.dynamic = [];
    for (const b of L.world.bodies) {
      const tag = b.tag;
      const kind = b.data.kind;
      if (tag === 'ramp') continue;
      if (tag === 'pad') continue;
      if (tag === 'hazard') {
        this.buildHazard(G, b, th, r);
        continue;
      }
      let z0 = Z_BACK, z1 = Z_FRONT;
      if (kind === 'pillar') { z0 = -5; z1 = 4; }
      if (kind === 'bank') { z0 = Z_BACK; z1 = Z_FRONT; }
      if (th.windows && kind !== 'pillar' && kind !== 'wall') { z0 = -26; z1 = 7; }
      const geo = extrudePoly(b.local, z0, z1);
      colorize(geo, kind === 'pillar' ? th.wall : th.top, kind === 'bank' ? th.top : th.wall, kind === 'bank' ? 0xd6e2ee : th.cap);
      const mesh = new THREE.Mesh(geo, terrainMat);
      if (kind === 'pillar' && th.neonWindows) {
        // neon tower instead of a rock pillar
        mesh.material = windowMat;
      }
      if (th.windows && kind !== 'pillar' && kind !== 'wall') {
        // building facade with lit windows (slightly below the roof edge)
        const facade = new THREE.Mesh(extrudePoly(b.local.map(([x, y]) => [x, y > L.bottom ? y - 0.6 : y]), z0 + 0.01, z1 + 0.05), windowMat);
        facade.receiveShadow = true;
        G.add(facade);
      }
      mesh.position.set(b.state.ox, b.state.oy, 0);
      mesh.receiveShadow = true;
      mesh.castShadow = kind === 'pillar';
      G.add(mesh);
      // road strip on the runway / runoff
      if (th.road && (kind === 'runway' || kind === 'runoff')) {
        const x0 = Math.min(...b.local.map((p) => p[0]));
        const x1 = Math.max(...b.local.map((p) => p[0]));
        const y1 = Math.max(...b.local.map((p) => p[1]));
        const len = x1 - x0;
        const rt = roadTex().clone();
        rt.needsUpdate = true;
        rt.repeat.set(len / 16, 1);
        const road = new THREE.Mesh(new THREE.PlaneGeometry(len, 7), new THREE.MeshStandardMaterial({ map: rt, roughness: th.pier ? 0.9 : 0.75, color: th.pier ? 0xa58a6a : 0xffffff }));
        road.rotation.x = -Math.PI / 2;
        road.position.set(x0 + len / 2, y1 + 0.02, 0);
        road.receiveShadow = true;
        G.add(road);
      }
    }

    this.buildRamp(G, L);
    this.buildPad(G, L, th);
    this.buildDecor(G, L, th, r);
    this.buildCollectibles(G, run);
    if (def.wind) this.buildFlags(G, L, r);
    if (th.rain) this.buildPrecip(G, 'rain', 1400);
    else if (th.snowfall) this.buildPrecip(G, 'snow', Math.round(1600 * th.snowfall));

    this.resetDynamic(run, ghost);
  }

  resetDynamic(run, ghost) {
    this.ghostData = ghost;
    this.ghost.root.visible = !!ghost;
    this.car.materials.paint.color.set(this.paintColor ?? 0xc4111f);
    this.car.root.visible = true;
    this.fx.clear();
    this.smoke.clear();
    this.trajLine.visible = false;
    this.marker.visible = false;
    this.shakeAmt = 0;
    this.burnT = 0;
    this.camInit = false;
    this.updateCar(run, 0);
  }

  buildEnvironment(th) {
    // Reflection environment from the sky colours
    const pm = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const m = this.sky.clone();
    m.material = this.skyMat;
    envScene.add(m);
    // The car always sits on asphalt / a deck, so its chrome and paint should reflect a neutral grey
    // ground (a grass-green ground here tinted the rims and the underside green).
    const envGround = new THREE.Color(0x4c4f54).lerp(new THREE.Color(th.top), 0.08);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: envGround }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -20;
    envScene.add(ground);
    if (this.envRT) this.envRT.dispose();
    this.envRT = pm.fromScene(envScene, 0.02);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = th.night ? 0.6 : 1.0;
    pm.dispose();
    ground.geometry.dispose();
    ground.material.dispose();
  }

  buildHazard(G, b, th, r) {
    const hz = b.data.hazard;
    const top = Math.max(...b.local.map((p) => p[1]));
    const x0 = Math.min(...b.local.map((p) => p[0]));
    const x1 = Math.max(...b.local.map((p) => p[0]));
    const floorCol = { water: 0x4a5a5a, sea: 0x2a4a5a, lava: 0x3a1a10, rocks: th.wall, street: 0x2a2c30, void: 0x111114, methane: 0x2a1c0e, icewater: 0x2a3a4a }[hz] ?? th.wall;
    const gapLen = this.L.pad.x0 - this.L.canyonStart;
    const geo = extrudePoly(b.local, Z_BACK, Z_FRONT);
    colorize(geo, floorCol, th.wall, th.cap);
    const floor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), roughness: 1 }));
    floor.receiveShadow = true;
    G.add(floor);
    this.water = null;
    this.lava = null;
    if (hz === 'water' || hz === 'sea' || hz === 'methane' || hz === 'icewater') {
      const wide = hz === 'sea';
      const w = wide ? 3000 : x1 - x0;
      const d = wide ? 1400 : Z_FRONT - Z_BACK;
      const geoW = new THREE.PlaneGeometry(w, d, wide ? 120 : 80, wide ? 40 : 24);
      geoW.rotateX(-Math.PI / 2);
      const liquid = { water: 0x2b86b8, sea: th.rain ? 0x1d4a66 : 0x1d6fa5, methane: 0x3a2610, icewater: 0x1f4a6e }[hz];
      const mat = new THREE.MeshStandardMaterial({ color: liquid, roughness: hz === 'methane' ? 0.05 : 0.12, metalness: hz === 'methane' ? 0.6 : 0.35, transparent: true, opacity: hz === 'methane' ? 0.95 : 0.9, flatShading: true });
      const water = new THREE.Mesh(geoW, mat);
      water.position.set(wide ? (x0 + 400) : (x0 + x1) / 2, top + (wide ? 0.0 : 0.2), wide ? Z_FRONT + 10 - d / 2 : (Z_FRONT + Z_BACK) / 2);
      water.receiveShadow = true;
      G.add(water);
      this.water = { mesh: water, base: Float32Array.from(geoW.attributes.position.array), amp: wide ? (th.rain ? 0.7 : 0.35) : hz === 'methane' ? 0.06 : 0.12 };
      if (hz === 'icewater') {
        // floating ice floes
        const floeMat = new THREE.MeshStandardMaterial({ color: 0xe8f4fc, roughness: 0.3, flatShading: true });
        for (let i = 0; i < 16; i++) {
          const f = new THREE.Mesh(new THREE.CylinderGeometry(1 + r() * 2.5, 1.4 + r() * 2.5, 0.5, 6), floeMat);
          f.position.set(this.L.canyonStart + 4 + r() * Math.max(4, gapLen - 8), top + 0.25, -4 - r() * 60);
          f.rotation.y = r() * 3;
          G.add(f);
        }
      }
    } else if (hz === 'lava') {
      const lt = lavaTex().clone();
      lt.needsUpdate = true;
      lt.repeat.set((x1 - x0) / 30, (Z_FRONT - Z_BACK) / 30);
      const lava = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, Z_FRONT - Z_BACK), new THREE.MeshStandardMaterial({ color: 0x220800, emissive: 0xffffff, emissiveMap: lt, emissiveIntensity: 1.6 }));
      lava.rotation.x = -Math.PI / 2;
      lava.position.set((x0 + x1) / 2, top + 0.3, (Z_FRONT + Z_BACK) / 2);
      G.add(lava);
      this.lava = lt;
      const pl = new THREE.PointLight(0xff5a1a, 900, 120, 1.5);
      pl.position.set(this.L.canyonStart + gapLen / 2, top + 10, 5);
      G.add(pl);
    } else if (hz === 'rocks' || hz === 'void') {
      const rockMat = new THREE.MeshStandardMaterial({ color: th.wall, roughness: 1, flatShading: true });
      const gx0 = this.L.canyonStart, gx1 = this.L.pad.x0;
      for (let i = 0; i < 26; i++) {
        const s = 1 + r() * 3.5;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
        m.position.set(gx0 + r() * (gx1 - gx0), top + s * 0.4, Z_BACK * 0.5 * r());
        m.rotation.set(r() * 3, r() * 3, r() * 3);
        m.castShadow = true;
        G.add(m);
      }
    } else if (hz === 'street') {
      const rt = roadTex().clone();
      rt.needsUpdate = true;
      rt.repeat.set((x1 - x0) / 16, 1);
      const st = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 12), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.8 }));
      st.rotation.x = -Math.PI / 2;
      st.position.set((x0 + x1) / 2, top + 0.05, -10);
      G.add(st);
      const cols = [0xffd23a, 0x3a7bd5, 0xeeeeee, 0x2ecc71, 0xe74c3c];
      for (let i = 0; i < 18; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 1.8), new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.5 }));
        c.position.set(this.L.canyonStart + r() * gapLen, top + 0.7, -7 - (i % 2) * 5);
        G.add(c);
      }
    }
  }

  buildRamp(G, L) {
    const prof = L.rampProfile;
    const group = new THREE.Group();
    group.position.set(L.rampX, L.groundY, 0);
    const geo = extrudePoly(prof.pts, -2.7, 2.7);
    const st = stripeTex().clone();
    st.needsUpdate = true;
    st.repeat.set(0.35, 0.35);
    const top = rampTopTex().clone();
    top.needsUpdate = true;
    top.repeat.set(0.2, 0.2);
    const mesh = new THREE.Mesh(geo, [
      new THREE.MeshStandardMaterial({ map: st, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: top, roughness: 0.7, metalness: 0.3 }),
    ]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6.2, 20), new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 0.8, roughness: 0.3 }));
    hub.rotation.x = Math.PI / 2;
    group.add(hub);
    // lip lights
    const lipLights = [];
    for (const z of [-2.5, 2.5]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 3 }));
      l.position.set(prof.lip[0], prof.lip[1] + 0.12, z);
      group.add(l);
      lipLights.push(l);
    }
    G.add(group);
    // hydraulic pistons
    const cylMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.7, roughness: 0.35 });
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xe0e5ea, metalness: 1, roughness: 0.15 });
    const pistons = [];
    for (const z of [-1.8, 1.8]) {
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1, 12), cylMat);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 10), rodMat);
      outer.castShadow = rod.castShadow = true;
      G.add(outer, rod);
      pistons.push({ outer, rod, z });
    }
    // base plate
    const base = new THREE.Mesh(new THREE.BoxGeometry(prof.lip[0] + 2, 0.3, 6.4), new THREE.MeshStandardMaterial({ color: 0x555a60, roughness: 0.8 }));
    base.position.set(L.rampX + prof.lip[0] / 2, L.groundY - 0.1, 0);
    base.receiveShadow = true;
    G.add(base);
    this.rampG = { group, pistons, lipLights, anchorX: L.rampX + prof.lip[0] * 0.55, attach: [prof.top[Math.floor(prof.top.length * 0.78)][0], prof.top[Math.floor(prof.top.length * 0.78)][1] - 0.5] };
  }

  buildPad(G, L, th) {
    const b = L.pad.body;
    const len = L.pad.len;
    const d = b.data;
    const group = new THREE.Group();
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 2 });
    this.padG = { group, lightMat, beacon: null };
    G.add(group);
    if (d.hill) {
      this.buildHill(group, b, th);
      return;
    }
    const moving = d.moving; // 'barge' | 'pendulum' | 'lift' | undefined
    let geo;
    if (moving === 'barge') {
      geo = extrudePoly(b.local, -5.5, 5.5);
      colorize(geo, 0x6b7380, 0x8a2a2a, 0x7a2424);
    } else if (moving === 'pendulum' || moving === 'lift') {
      geo = extrudePoly(b.local, -5.4, 5.4);
      if (moving === 'lift') colorize(geo, 0x3a3f4a, 0x2a2438, 0x221d30);
      else colorize(geo, 0x50565e, 0xd9a520, 0xc8941a);
    } else if (d.ice) {
      geo = extrudePoly(b.local, Z_BACK, Z_FRONT);
      colorize(geo, 0xdcecf8, 0x9fb8cc, 0x86a2ba);
    } else {
      const z0 = th.windows ? -26 : -9;
      geo = extrudePoly(b.local, z0, th.windows ? 7 : 5);
      colorize(geo, 0x3a3f47, th.windows ? th.wall : 0x6a6e75, th.windows ? th.cap : 0x55595f);
    }
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), roughness: d.ice ? 0.2 : 0.8, metalness: d.ice ? 0.05 : 0.2 }));
    mesh.receiveShadow = true;
    mesh.castShadow = !!moving;
    group.add(mesh);
    if (th.windows && !moving) {
      const wt = windowsTex(!!th.neonWindows);
      const facade = new THREE.Mesh(extrudePoly(b.local.map(([x, y]) => [x, y > -0.5 ? -0.6 : y]), -26 + 0.01, 7.05), new THREE.MeshStandardMaterial({ color: 0xffffff, map: wt, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: th.neonWindows ? 1.1 : 0.7 }));
      group.add(facade);
    }
    const deckW = moving ? 10.6 : 10;
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(len, deckW), new THREE.MeshStandardMaterial({ map: d.ice ? iceTex(len) : padTex(len), roughness: d.ice ? 0.08 : 0.6, metalness: 0.1 }));
    deck.rotation.x = -Math.PI / 2;
    deck.position.set(0, 0.03, 0);
    deck.receiveShadow = true;
    group.add(deck);
    if (moving === 'lift') lightMat.color.set(0xff4fd8), lightMat.emissive.set(0xff2fd0);
    for (let x = -len / 2; x <= len / 2 + 0.01; x += len / 8) {
      for (const z of [-5.2, 5.2]) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), lightMat);
        l.position.set(x, 0.17, z);
        group.add(l);
      }
    }
    if (moving !== 'pendulum') {
      // beacon mast at the far end
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 8), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
      mast.position.set(len / 2 - 1, 3, -6);
      group.add(mast);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff4040, emissive: 0xff2020, emissiveIntensity: 3 }));
      beacon.position.set(len / 2 - 1, 6.2, -6);
      group.add(beacon);
      this.padG.beacon = beacon;
    }
    if (moving === 'pendulum') this.buildCrane(G, L);
    if (moving === 'lift') this.buildLiftShaft(G, L);
  }

  // Ski-jump landing hill: snow slope with distance lines and the red K line (target).
  buildHill(group, b, th) {
    const d = b.data;
    const geo = extrudePoly(b.local, Z_BACK, Z_FRONT);
    colorize(geo, 0xf4f8fc, 0xc9d6e2, 0x9fb0c2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grainTex(), roughness: 0.9 }));
    mesh.receiveShadow = true;
    group.add(mesh);
    const surf = (x) => {
      const P = b.local;
      for (let i = 0; i < P.length; i++) {
        const a = P[i], c = P[(i + 1) % P.length];
        if (c[0] < a[0] && x <= a[0] && x >= c[0]) {
          const u = (x - c[0]) / (a[0] - c[0] || 1);
          return { y: c[1] + (a[1] - c[1]) * u, ang: Math.atan2(a[1] - c[1], a[0] - c[0]) };
        }
      }
      return { y: 0, ang: 0 };
    };
    const mk = (x, color, w) => {
      const sfc = surf(x);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 9.5), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      m.position.set(x, sfc.y + 0.04, -0.5);
      m.rotation.z = sfc.ang;
      group.add(m);
    };
    for (let x = Math.ceil(d.zoneX0 / 5) * 5; x <= d.zoneX1; x += 5) {
      if (Math.abs(x) < 0.01) continue;
      mk(x, x % 10 === 0 ? 0x1f4fb5 : 0x7aa6e8, x % 10 === 0 ? 0.35 : 0.2);
    }
    mk(d.zoneX0, 0x2ecc71, 0.45); // start of the landing zone
    mk(0, 0xe8202f, 0.7); // K point
    // K flags
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xe8202f, side: THREE.DoubleSide });
    const k = surf(0);
    for (const z of [-6, 5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 6), poleMat);
      pole.position.set(0, k.y + 2, z);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), flagMat);
      flag.position.set(0.8, k.y + 3.4, z);
      group.add(pole, flag);
    }
    // blue boards along the landing zone (behind the slope)
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x1f4fb5, roughness: 0.7 });
    for (let x = d.zoneX0; x < d.zoneX1; x += 6) {
      const sfc = surf(x);
      const bd = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.9, 0.15), boardMat);
      bd.position.set(x + 3 * Math.cos(sfc.ang), sfc.y + 0.45 + 3 * Math.sin(sfc.ang), -7);
      bd.rotation.z = sfc.ang;
      group.add(bd);
    }
  }

  buildCrane(G, L) {
    const b = L.pad.body;
    const H = b.data.pivotH;
    const px = b.origin.x, py = b.origin.y + H;
    const latMat = (rx, ry) => {
      const t = latticeTex().clone();
      t.needsUpdate = true;
      t.repeat.set(rx, ry);
      return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3 });
    };
    const tz = -22;
    const towerH = py + 5 - L.bottom;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.6, towerH, 2.6), latMat(1, towerH / 2.6));
    tower.position.set(px, L.bottom + towerH / 2, tz);
    const jibLen = -tz + 5;
    const jib = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, jibLen), latMat(jibLen / 1.6, 1));
    jib.position.set(px, py + 3, tz + jibLen / 2);
    const cjib = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 12), latMat(12 / 1.6, 1));
    cjib.position.set(px, py + 3, tz - 6);
    const weight = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3), new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.9 }));
    weight.position.set(px, py + 1.6, tz - 10);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 2.4), new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.6 }));
    cab.position.set(px + 2.4, py + 1.4, tz + 1);
    const steel = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.6, roughness: 0.4 });
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), steel);
    trolley.position.set(px, py + 1.9, 0);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xf2b705 }));
    hook.position.set(px, py, 0);
    const warn = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 3 }));
    warn.position.set(px, py + 4.2, 0.5);
    G.add(tower, jib, cjib, weight, cab, trolley, hook, warn);
    const len = L.pad.len;
    this.cables = {
      anchorsWorld: [[px, py + 1.6, 0], [px, py, 0]],
      hook: [px, py, 0],
      corners: [[-len / 2 + 2, 4.6], [len / 2 - 2, 4.6], [-len / 2 + 2, -4.6], [len / 2 - 2, -4.6]],
      fromHook: true,
    };
    this.makeCableLines(G, 5);
  }

  buildLiftShaft(G, L) {
    const b = L.pad.body;
    const amp = L.def.pad.motion.amp;
    const len = L.pad.len;
    const topY = b.origin.y + amp + 12;
    const h = topY - L.bottom;
    const latMat = new THREE.MeshStandardMaterial({ color: 0x8a7cff, map: (() => { const t = latticeTex().clone(); t.needsUpdate = true; t.repeat.set(1, h / 1.6); return t; })(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, emissive: 0x2a1060, emissiveIntensity: 0.5 });
    const neonA = new THREE.MeshStandardMaterial({ color: 0x38e8ff, emissive: 0x38e8ff, emissiveIntensity: 2.5 });
    const neonB = new THREE.MeshStandardMaterial({ color: 0xff3fd2, emissive: 0xff3fd2, emissiveIntensity: 2.5 });
    const anchors = [];
    for (const sx of [-1, 1]) {
      const x = b.origin.x + sx * (len / 2 + 1.4);
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 1.6), latMat);
      col.position.set(x, L.bottom + h / 2, -6.5);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), sx < 0 ? neonA : neonB);
      strip.position.set(x, L.bottom + h / 2, -5.6);
      G.add(col, strip);
      anchors.push([b.origin.x + sx * (len / 2 - 3), topY - 0.8, -6]);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(len + 5, 1.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x2a2438, metalness: 0.5, roughness: 0.4 }));
    beam.position.set(b.origin.x, topY, -6.5);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(len * 0.6, 0.35, 0.2), neonB);
    sign.position.set(b.origin.x, topY + 1.1, -5.9);
    G.add(beam, sign);
    this.cables = {
      anchorsWorld: anchors,
      corners: [[-len / 2 + 3, -4.6], [len / 2 - 3, -4.6]],
      fromHook: false,
    };
    this.makeCableLines(G, 2);
  }

  makeCableLines(G, n) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
    lines.frustumCulled = false;
    G.add(lines);
    this.cables.lines = lines;
  }

  updateCables() {
    const cb = this.cables;
    if (!cb || !cb.lines) return;
    const st = this.L.pad.body.state;
    const c = Math.cos(st.angle), s = Math.sin(st.angle);
    const arr = cb.lines.geometry.attributes.position.array;
    let k = 0;
    const put = (x, y, z) => {
      arr[k++] = x;
      arr[k++] = y;
      arr[k++] = z;
    };
    if (cb.fromHook) {
      // trolley → hook, then hook → the four deck corners
      put(...cb.anchorsWorld[0]);
      put(...cb.hook);
      for (const [lx, z] of cb.corners) {
        put(...cb.hook);
        put(st.ox + c * lx, st.oy + s * lx + 0.1, z);
      }
    } else {
      cb.corners.forEach(([lx, z], i) => {
        put(...cb.anchorsWorld[i]);
        put(st.ox + c * lx, st.oy + s * lx + 0.1, z);
      });
    }
    cb.lines.geometry.attributes.position.needsUpdate = true;
  }

  // Rain streaks or snowflakes that follow the camera.
  buildPrecip(G, type, n) {
    const pos = new Float32Array(n * (type === 'rain' ? 6 : 3));
    const seeds = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      seeds[i * 3] = (Math.random() - 0.5) * 140;
      seeds[i * 3 + 1] = (Math.random() - 0.5) * 90;
      seeds[i * 3 + 2] = -45 + Math.random() * 70;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    let mesh;
    if (type === 'rain') {
      mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.4, depthWrite: false }));
    } else {
      const flake = canvasTex(32, 32, (g) => {
        const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 32, 32);
      }, false);
      mesh = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, map: flake, transparent: true, depthWrite: false, opacity: 0.9 }));
    }
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    G.add(mesh);
    this.precip = { type, mesh, n, seeds, fall: 0, drift: 0 };
  }

  updatePrecip(dt) {
    const P = this.precip;
    if (!P) return;
    const wind = this.L.world.wind(this.L.world.time);
    const rain = P.type === 'rain';
    P.fall += dt * (rain ? 30 : 2.2);
    P.drift += dt * (wind * (rain ? 0.9 : 0.6) + (rain ? 0 : 0.6));
    const cx = this.camLook.x, cy = this.camLook.y;
    const arr = P.mesh.geometry.attributes.position.array;
    const W = 140, Hh = 90;
    const wrap = (v, size) => ((v % size) + size * 1.5) % size - size / 2;
    for (let i = 0; i < P.n; i++) {
      const sx = P.seeds[i * 3], sy = P.seeds[i * 3 + 1], sz = P.seeds[i * 3 + 2];
      const wob = rain ? 0 : Math.sin(this.time * 1.3 + i) * 0.6;
      const x = cx + wrap(sx + P.drift + wob - cx, W);
      const y = cy + wrap(sy - P.fall * (rain ? 1 : 0.6 + (i % 5) * 0.12) - cy, Hh);
      if (rain) {
        arr[i * 6] = x;
        arr[i * 6 + 1] = y;
        arr[i * 6 + 2] = sz;
        arr[i * 6 + 3] = x - wind * 0.035;
        arr[i * 6 + 4] = y + 1.3;
        arr[i * 6 + 5] = sz;
      } else {
        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = sz;
      }
    }
    P.mesh.geometry.attributes.position.needsUpdate = true;
  }

  updateLightning(dt) {
    const Lg = this.lightning;
    if (!Lg) return;
    Lg.t -= dt;
    if (Lg.t <= 0) {
      Lg.t = 4 + Math.random() * 7;
      Lg.flash = 0.45;
      if (this.onThunder) this.onThunder(0.25 + Math.random() * 1.2);
    }
    let k = 0;
    if (Lg.flash > 0) {
      Lg.flash -= dt;
      const u = Lg.flash;
      k = (u > 0.3 ? 1 : u > 0.2 ? 0.2 : u > 0.1 ? 0.8 : 0.3) * Math.max(0, u / 0.45);
    }
    this.hemi.intensity = this.baseHemi + k * 3.5;
    this.skyMat.uniforms.top.value.copy(this.baseSkyTop).lerp(new THREE.Color(0xc8d4ff), k * 0.6);
    this.skyMat.uniforms.bottom.value.copy(this.baseSkyBot).lerp(new THREE.Color(0xe8eeff), k * 0.6);
  }

  setPaint(color) {
    this.paintColor = color;
    this.car.materials.paint.color.set(color);
  }

  buildDecor(G, L, th, r) {
    const x0 = -140, x1 = L.endX + 120;
    const groundTop = (x) => {
      // surface height of static ground at x (for placing props), or null over gaps
      const hit = L.world.raycast(x, 2000, 0, -1, 4000);
      if (!hit) return null;
      const b = hit.body;
      if (b.motion || b.tag === 'hazard' || b.tag === 'ramp' || b.data.kind === 'pillar' || b.data.kind === 'wall') return null;
      if (b.tag === 'pad' && !b.data.hill) return null; // no trees on landing pads / the frozen lake
      return hit.y;
    };
    // far ground plane so the sky never shows below the horizon behind the diorama
    if (!th.pier) {
      const farY = th.windows ? L.bottom - 0.2 : Math.min(L.groundY, L.pad.y) - 1.5;
      const farCol = new THREE.Color(th.windows ? 0x22262e : th.top).multiplyScalar(th.windows ? 1 : 0.8);
      const far = new THREE.Mesh(new THREE.PlaneGeometry(4000, 1600), new THREE.MeshStandardMaterial({ color: farCol, roughness: 1 }));
      far.rotation.x = -Math.PI / 2;
      far.position.set(L.rampX, farY, Z_BACK - 800 + 0.5);
      G.add(far);
    }
    // distant mountains / mesas
    if (th.mountains) {
      const mMat = new THREE.MeshStandardMaterial({ color: th.mountains, roughness: 1, flatShading: true });
      for (let i = 0; i < 26; i++) {
        const x = x0 - 200 + (i / 26) * (x1 - x0 + 500) + r() * 30;
        const z = -320 - r() * 320;
        let m;
        if (th.deco === 'titan') {
          const w = 40 + r() * 70;
          m = new THREE.Mesh(new THREE.SphereGeometry(w, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mMat);
          m.scale.y = 0.35 + r() * 0.3;
          m.position.set(x, L.groundY - 20, z);
        } else if (th.deco === 'mesas' || th.deco === 'mars') {
          const w = 25 + r() * 50, h = 25 + r() * 60;
          m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.8, w, h, 7), mMat);
          m.position.set(x, L.groundY - 20 + h / 2, z);
        } else {
          const h = th.space ? 30 + r() * 70 : 60 + r() * 140;
          m = new THREE.Mesh(new THREE.ConeGeometry(h * (0.7 + r() * 0.4), h, 6 + Math.floor(r() * 3)), mMat);
          m.position.set(x, L.groundY - 25 + h / 2, z);
        }
        m.rotation.y = r() * 3;
        G.add(m);
      }
    }
    // clouds
    if (th.clouds) {
      const cMat = new THREE.MeshStandardMaterial({ color: th.darkClouds ? 0x59636e : 0xffffff, roughness: 1, emissive: th.darkClouds ? 0x101418 : 0xffffff, emissiveIntensity: th.darkClouds ? 0.2 : 0.25, flatShading: true });
      for (let i = 0; i < 18; i++) {
        const c = new THREE.Group();
        const n = 3 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
          const s = 6 + r() * 10;
          const p = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), cMat);
          p.position.set(k * 9 - n * 4.5, r() * 5, r() * 6);
          p.scale.y = 0.6;
          c.add(p);
        }
        c.position.set(x0 + r() * (x1 - x0 + 200), th.darkClouds ? 45 + r() * 30 : 70 + r() * 70, -200 - r() * 250);
        if (th.darkClouds) c.scale.set(2.2, 1.4, 1.6);
        G.add(c);
      }
    }
    // trees
    if (th.deco === 'trees' || th.deco === 'pines' || th.deco === 'sea') {
      const n = th.deco === 'sea' ? 0 : 260;
      const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2, 6);
      const leafGeo = th.deco === 'pines' ? new THREE.ConeGeometry(2.2, 7, 7) : new THREE.IcosahedronGeometry(2.6, 0);
      const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b4a2b }), n);
      const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: th.deco === 'pines' ? 0x2f5a2c : 0x3f7a2c, flatShading: true }), n);
      const mtx = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const col = new THREE.Color();
      let k = 0;
      for (let tries = 0; k < n && tries < n * 4; tries++) {
        const x = x0 + r() * (x1 - x0);
        const y = groundTop(x);
        if (y === null) continue;
        const z = -26 - r() * 90;
        const s = 0.6 + r() * 0.7;
        mtx.compose(new THREE.Vector3(x, y + 1 * s, z), q, new THREE.Vector3(s, s, s));
        trunks.setMatrixAt(k, mtx);
        mtx.compose(new THREE.Vector3(x, y + (th.deco === 'pines' ? 5 : 4) * s, z), q, new THREE.Vector3(s, s * (0.9 + r() * 0.4), s));
        leaves.setMatrixAt(k, mtx);
        col.setHSL(0.27 + r() * 0.08, 0.45, 0.28 + r() * 0.12);
        leaves.setColorAt(k, col);
        k++;
      }
      trunks.count = leaves.count = k;
      trunks.castShadow = leaves.castShadow = true;
      G.add(trunks, leaves);
    }
    // snowy pines
    if (th.deco === 'snow') {
      const n = 220;
      const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2, 6);
      const leafGeo = new THREE.ConeGeometry(2.2, 7, 7);
      const capGeo = new THREE.ConeGeometry(1.5, 3.2, 7);
      const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5a4030 }), n);
      const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0x24452e, flatShading: true }), n);
      const caps = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xf4f8fc, flatShading: true }), n);
      const mtx = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      let k = 0;
      for (let tries = 0; k < n && tries < n * 4; tries++) {
        const x = x0 + r() * (x1 - x0);
        const y = groundTop(x);
        if (y === null) continue;
        const z = -36 - r() * 90;
        const sc = 0.6 + r() * 0.8;
        mtx.compose(new THREE.Vector3(x, y + sc, z), q, new THREE.Vector3(sc, sc, sc));
        trunks.setMatrixAt(k, mtx);
        mtx.compose(new THREE.Vector3(x, y + 5 * sc, z), q, new THREE.Vector3(sc, sc, sc));
        leaves.setMatrixAt(k, mtx);
        mtx.compose(new THREE.Vector3(x, y + 7.4 * sc, z), q, new THREE.Vector3(sc, sc, sc));
        caps.setMatrixAt(k, mtx);
        k++;
      }
      trunks.count = leaves.count = caps.count = k;
      trunks.castShadow = leaves.castShadow = true;
      G.add(trunks, leaves, caps);
    }
    if (th.deco === 'titan') {
      // rounded water-ice boulders
      const bMat = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.9 });
      for (let i = 0; i < 70; i++) {
        const x = x0 + r() * (x1 - x0);
        const y = groundTop(x);
        if (y === null) continue;
        const sc = 0.6 + r() * 2.4;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(sc, 1), bMat);
        m.position.set(x, y + sc * 0.35, -8 - r() * 70);
        m.scale.y = 0.55;
        m.castShadow = true;
        G.add(m);
      }
    }
    // cacti / rocks for desert-like themes
    if (th.deco === 'mesas' || th.deco === 'mars' || th.deco === 'moon') {
      const rockMat = new THREE.MeshStandardMaterial({ color: th.wall, roughness: 1, flatShading: true });
      for (let i = 0; i < 90; i++) {
        const x = x0 + r() * (x1 - x0);
        const y = groundTop(x);
        if (y === null) continue;
        const s = 0.5 + r() * 2.2;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
        m.position.set(x, y + s * 0.3, -8 - r() * 70);
        m.scale.y = 0.6;
        m.castShadow = true;
        G.add(m);
      }
    }
    if (th.deco === 'moon') {
      // craters
      const cMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 });
      for (let i = 0; i < 40; i++) {
        const x = x0 + r() * (x1 - x0);
        const y = groundTop(x);
        if (y === null) continue;
        const s = 1.5 + r() * 5;
        const m = new THREE.Mesh(new THREE.TorusGeometry(s, s * 0.22, 6, 18), cMat);
        m.rotation.x = Math.PI / 2;
        m.scale.z = 0.4;
        m.position.set(x, y + 0.05, -10 - r() * 70);
        G.add(m);
      }
      // the Earth in the sky
      const et = canvasTex(256, 128, (g, w, h) => {
        g.fillStyle = '#1f5fbf';
        g.fillRect(0, 0, w, h);
        const rr = rng(21);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = rr() < 0.6 ? '#3f8f3a' : '#c8a86a';
          g.beginPath();
          g.ellipse(rr() * w, 20 + rr() * (h - 40), 8 + rr() * 26, 6 + rr() * 16, rr() * 3, 0, Math.PI * 2);
          g.fill();
        }
        for (let i = 0; i < 60; i++) {
          g.fillStyle = 'rgba(255,255,255,0.6)';
          g.beginPath();
          g.ellipse(rr() * w, rr() * h, 10 + rr() * 30, 2 + rr() * 4, 0, 0, Math.PI * 2);
          g.fill();
        }
      }, false);
      const earth = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 20), new THREE.MeshStandardMaterial({ map: et, emissive: 0x112244, emissiveIntensity: 0.4, roughness: 0.8, fog: false }));
      earth.position.set(L.pad.cx - 150, 260, -900);
      G.add(earth);
    }
    if (th.stars || th.night) {
      const n = th.stars ? 2500 : 600;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const u = r() * Math.PI * 2, v = 0.05 + r() * 0.95;
        const R = 1500;
        pos[i * 3] = Math.cos(u) * Math.sqrt(1 - v * v) * R;
        pos[i * 3 + 1] = v * R * (th.stars ? 1 : 0.9) + (th.stars ? -200 : 100);
        pos[i * 3 + 2] = Math.sin(u) * Math.sqrt(1 - v * v) * R;
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: th.stars ? 2.2 : 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: th.stars ? 0.95 : 0.6 }));
      stars.renderOrder = -9;
      this.starfield = stars;
      G.add(stars);
    } else this.starfield = null;
    if (th.deco === 'city' || th.deco === 'site' || th.deco === 'neon') {
      // skyline
      const wt = windowsTex(!!th.neonWindows);
      const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wt, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: th.neonWindows ? 1.0 : 0.6, roughness: 0.7 });
      for (let i = 0; i < 55; i++) {
        const w = 16 + r() * 26, h = 40 + r() * 120, d = 14 + r() * 26;
        const g = new THREE.BoxGeometry(w, h, d);
        const uv = g.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w, uv.getY(k) * h);
        const m = new THREE.Mesh(g, bMat);
        m.position.set(x0 - 100 + r() * (x1 - x0 + 300), L.groundY - 60 + h / 2, -170 - r() * 360);
        G.add(m);
        if (th.deco === 'neon' && r() < 0.5) {
          // neon sign on the facade
          const cols = [0xff3fd2, 0x38e8ff, 0x9b5cff, 0xffd23a];
          const c = cols[Math.floor(r() * cols.length)];
          const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 2 + r() * 3, 0.5), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2.2 }));
          sign.position.set(m.position.x, m.position.y + h * (0.1 + r() * 0.3), m.position.z + d / 2 + 0.4);
          G.add(sign);
        }
      }
      if (th.deco === 'site') {
        // background tower cranes
        for (let i = 0; i < 4; i++) {
          const t = latticeTex().clone();
          t.needsUpdate = true;
          const h = 70 + r() * 40;
          t.repeat.set(1, h / 3);
          const lm = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
          const cx = x0 + r() * (x1 - x0 + 200), cz = -120 - r() * 160;
          const tower = new THREE.Mesh(new THREE.BoxGeometry(3, h, 3), lm);
          tower.position.set(cx, L.groundY - 50 + h / 2, cz);
          const t2 = latticeTex().clone();
          t2.needsUpdate = true;
          t2.repeat.set(20, 1);
          const jib = new THREE.Mesh(new THREE.BoxGeometry(60, 2, 2), new THREE.MeshStandardMaterial({ map: t2, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
          jib.position.set(cx + 15, L.groundY - 50 + h, cz);
          G.add(tower, jib);
        }
      }
    }
    if (th.deco === 'sea') {
      const iMat = new THREE.MeshStandardMaterial({ color: 0x4f7a3a, flatShading: true, roughness: 1 });
      for (let i = 0; i < 8; i++) {
        const h = 20 + r() * 50;
        const m = new THREE.Mesh(new THREE.ConeGeometry(h * 1.6, h, 7), iMat);
        m.position.set(x0 + r() * (x1 - x0 + 400), -2 + h / 2 - 8, -260 - r() * 300);
        G.add(m);
      }
      // pier pylons under the runway
      const pMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
      for (let x = -110; x < L.canyonStart; x += 9) {
        for (const z of [-6, 6]) {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 8), pMat);
          p.position.set(x, L.groundY - 7, z);
          G.add(p);
        }
      }
    }
  }

  buildCollectibles(G, run) {
    const starGeo = makeStarGeo();
    const starMat = new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0xffb300, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3 });
    const fuelMat = new THREE.MeshStandardMaterial({ color: 0x38e07b, emissive: 0x1fbf5f, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.35 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.3 });
    this.collMeshes = run.collectibles.map((c) => {
      const g = new THREE.Group();
      if (c.type === 'star') {
        const m = new THREE.Mesh(starGeo, starMat);
        m.scale.setScalar(1.1);
        g.add(m);
      } else {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.5, 16), fuelMat);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 10), capMat);
        cap.position.y = 0.95;
        g.add(body, cap);
        g.rotation.z = 0.3;
      }
      g.position.set(c.x, c.y, 0);
      G.add(g);
      return g;
    });
  }

  buildFlags(G, L, r) {
    this.flags = [];
    const mat = new THREE.MeshStandardMaterial({ color: 0xff5a2a, side: THREE.DoubleSide, roughness: 0.8 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const xs = [L.rampX - 60, L.rampX - 20, L.canyonStart - 3];
    if (!L.pad.body.motion && !L.pad.hill) xs.push(L.pad.x0 + 2, L.pad.x1 - 4);
    for (const x of xs) {
      const top = x < L.canyonStart + 5 ? L.groundY : L.pad.y;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 7, 6), poleMat);
      pole.position.set(x, top + 3.5, -5);
      G.add(pole);
      const geo = new THREE.PlaneGeometry(3, 1.2, 10, 2);
      geo.translate(1.5, 0, 0);
      const flag = new THREE.Mesh(geo, mat);
      flag.position.set(x, top + 6.4, -5);
      G.add(flag);
      this.flags.push({ flag, base: Float32Array.from(geo.attributes.position.array) });
    }
    void r;
  }

  // ---------------------------------------------------------------------------
  updateCar(run, dt) {
    const c = run.car;
    const m = this.car;
    m.root.position.set(c.x, c.y, 0);
    m.root.rotation.z = c.a;
    for (let i = 0; i < 2; i++) {
      const w = c.wheels[i];
      const wm = m.wheels[i];
      wm.pivot.position.y = -0.1 - w.susLen;
      for (const s of wm.spinners) s.rotation.z = -w.spin;
    }
    const ac = c.active;
    const fl = (0.8 + Math.random() * 0.4);
    m.flames.main.forEach((g) => {
      g.visible = !!ac.thrust;
      g.scale.set(1, (1.1 + Math.random() * 0.6) * fl, 1);
    });
    m.flames.rotL.forEach((g) => { g.visible = !!ac.rotL; g.scale.y = 0.6 + Math.random() * 0.4; });
    m.flames.rotR.forEach((g) => { g.visible = !!ac.rotR; g.scale.y = 0.6 + Math.random() * 0.4; });
    m.glow.intensity = ac.thrust ? 30 * fl : 0;
    m.tailMat.emissiveIntensity = c.input.brake ? 6 : 2.2;
    void dt;
  }

  update(dt, run, view) {
    this.time += dt;
    const L = this.L;
    const c = run.car;
    this.updateCar(run, dt);

    // ramp
    const rs = L.ramp.state;
    this.rampG.group.rotation.z = rs.angle;
    const ca = Math.cos(rs.angle), sa = Math.sin(rs.angle);
    const [ax, ay] = this.rampG.attach;
    const att = new THREE.Vector3(L.rampX + ca * ax - sa * ay, L.groundY + sa * ax + ca * ay, 0);
    for (const p of this.rampG.pistons) {
      const a = new THREE.Vector3(this.rampG.anchorX, L.groundY - 0.3, p.z);
      const b = att.clone();
      b.z = p.z;
      const mid = a.clone().lerp(b, 0.5);
      setBetween(p.outer, a, mid.clone().lerp(b, 0.1));
      setBetween(p.rod, mid, b);
    }
    const blink = Math.sin(this.time * 8) > 0;
    for (const l of this.rampG.lipLights) l.material.emissiveIntensity = blink ? 4 : 0.3;

    // pad
    const ps = L.pad.body.state;
    this.padG.group.position.set(ps.ox, ps.oy, 0);
    this.padG.group.rotation.z = ps.angle;
    this.padG.lightMat.emissiveIntensity = 1.2 + Math.sin(this.time * 4) * 0.9;
    if (this.padG.beacon) this.padG.beacon.material.emissiveIntensity = Math.sin(this.time * 6) > 0.3 ? 4 : 0.2;

    // collectibles
    run.collectibles.forEach((col, i) => {
      const g = this.collMeshes[i];
      if (col.taken) {
        if (g.visible) {
          g.visible = false;
          // quick sparkle (no lingering cloud around the car)
          if (col.type === 'star') this.burst(col.x, col.y, [1, 0.85, 0.3], 40, 9);
          else this.burst(col.x, col.y, [0.75, 0.95, 1.0], 26, 12, 0.4);
        }
        return;
      }
      g.rotation.y += dt * 2.5;
      g.position.y = col.y + Math.sin(this.time * 2 + i) * 0.25;
    });

    // water / lava animation
    if (this.water) {
      const pos = this.water.mesh.geometry.attributes.position;
      const base = this.water.base;
      const t = this.time;
      const A = this.water.amp;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        pos.array[i * 3 + 1] = Math.sin(x * 0.12 + t * 1.6) * A + Math.sin(z * 0.17 + t * 1.1 + x * 0.05) * A * 0.8;
      }
      pos.needsUpdate = true;
      this.water.mesh.geometry.computeVertexNormals();
    }
    if (this.lava) this.lava.offset.x = this.time * 0.01;
    if (this.flags) {
      const wind = L.world.wind(L.world.time);
      const dir = Math.sign(wind) || 1;
      for (const f of this.flags) {
        f.flag.scale.x = dir;
        const pos = f.flag.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = f.base[i * 3];
          pos.array[i * 3 + 2] = Math.sin(x * 2.2 - this.time * (4 + Math.abs(wind) * 0.6)) * 0.12 * x;
          pos.array[i * 3 + 1] = f.base[i * 3 + 1] - x * Math.max(0, 0.45 - Math.abs(wind) * 0.04);
        }
        pos.needsUpdate = true;
      }
    }

    this.updateCables();
    this.updatePrecip(dt);
    this.updateLightning(dt);
    this.emitEffects(dt, run);
    this.fx.update(dt);
    this.smoke.update(dt);

    // trajectory assist
    const showTraj = view.assist && (run.phase === 'air' || run.phase === 'touchdown') && !c.crashed;
    if (showTraj) {
      const pred = predictTrajectory(L.world, c.x, c.y - 0.6, c.vx, c.vy, 10, 1 / 30);
      const arr = this.trajLine.geometry.attributes.position.array;
      const n = Math.min(400, pred.pts.length);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = pred.pts[i].x;
        arr[i * 3 + 1] = pred.pts[i].y;
        arr[i * 3 + 2] = 0.5;
      }
      this.trajLine.geometry.setDrawRange(0, n);
      this.trajLine.geometry.attributes.position.needsUpdate = true;
      this.trajLine.computeLineDistances();
      this.trajLine.visible = n > 2;
      if (pred.hit) {
        this.marker.visible = true;
        this.marker.position.set(pred.hit.x, pred.hit.y + 0.08, 0);
        const good = pred.hit.tag === 'pad';
        this.marker.material.color.set(good ? 0x44ff88 : 0xff4444);
        this.trajLine.material.color.set(good ? 0xb8ffd0 : 0xffc0c0);
        this.marker.scale.setScalar(1 + Math.sin(this.time * 8) * 0.12);
        this.predHit = pred.hit;
      } else {
        this.marker.visible = false;
        this.predHit = null;
      }
    } else {
      this.trajLine.visible = false;
      this.marker.visible = false;
      this.predHit = null;
    }

    // ghost
    if (this.ghostData && this.ghostData.length >= 3) {
      const fi = run.time * 30;
      const i0 = Math.min(Math.floor(fi), this.ghostData.length / 3 - 1);
      const i1 = Math.min(i0 + 1, this.ghostData.length / 3 - 1);
      const u = fi - Math.floor(fi);
      const g = this.ghostData;
      const gx = g[i0 * 3] + (g[i1 * 3] - g[i0 * 3]) * u;
      const gy = g[i0 * 3 + 1] + (g[i1 * 3 + 1] - g[i0 * 3 + 1]) * u;
      const gaa = g[i0 * 3 + 2] + (g[i1 * 3 + 2] - g[i0 * 3 + 2]) * u;
      this.ghost.root.visible = view.ghost && view.playing;
      this.ghost.root.position.set(gx, gy, -2.2);
      this.ghost.root.rotation.z = gaa;
    }

    if (this.starfield) this.starfield.position.copy(this.camera.position);
    this.sky.position.copy(this.camera.position);
    this.updateCamera(dt, run, view);

    // keep the sun's shadow frustum around the car
    this.sun.position.set(c.x - 30, c.y + 60, 45);
    this.sun.target.position.set(c.x + 6, c.y, 0);
    this.sun.target.updateMatrixWorld();
  }

  emitEffects(dt, run) {
    const c = run.car;
    const ca = Math.cos(c.a), sa = Math.sin(c.a);
    const toW = (lx, ly) => [c.x + ca * lx - sa * ly, c.y + sa * lx + ca * ly];
    const upx = -sa, upy = ca;
    if (c.active.thrust) {
      for (let k = 0; k < 6; k++) {
        const lx = (k % 2 ? 0.95 : -0.95);
        const [x, y] = toW(lx, -0.6);
        const sp = 18 + Math.random() * 10;
        this.fx.emit({
          x, y, z: (Math.random() - 0.5) * 1.3,
          vx: c.vx * 0.6 - upx * sp + (Math.random() - 0.5) * 3, vy: c.vy * 0.6 - upy * sp + (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3,
          life: 0.22 + Math.random() * 0.12, size0: 0.9, size1: 2.2,
          color0: [1, 0.85, 0.55], color1: [1, 0.25, 0.05], alpha: 0.9, drag: 3,
        });
      }
      for (let k = 0; k < 2; k++) {
        const [x, y] = toW((Math.random() - 0.5) * 2, -0.9);
        this.smoke.emit({
          x, y, z: (Math.random() - 0.5) * 1.5,
          vx: c.vx * 0.3 - upx * 9 + (Math.random() - 0.5) * 4, vy: c.vy * 0.3 - upy * 9 + Math.random() * 2, vz: (Math.random() - 0.5) * 4,
          life: 1.2 + Math.random() * 0.8, size0: 1.2, size1: 5,
          color0: [0.85, 0.85, 0.88], color1: [0.7, 0.7, 0.72], alpha: 0.35, drag: 1.5, gravity: -1,
        });
      }
      // ground blast when close to a surface: the colour/amount depends on what is below
      const hit = this.L.world.raycast(c.x, c.y, -upx, -upy, 12);
      if (hit) {
        const sd = this.surfaceDust(hit.body);
        const splash = sd.spray ? 1 : 0;
        for (let k = 0; k < 3; k++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          this.smoke.emit({
            x: hit.x, y: hit.y + 0.3, z: (Math.random() - 0.5) * 3,
            vx: dir * (8 + Math.random() * 8), vy: 1 + Math.random() * 2 + splash * (3 + Math.random() * 4), vz: (Math.random() - 0.5) * 6,
            life: 0.9, size0: 1.5, size1: 4.5, color0: sd.c, alpha: Math.min(0.55, sd.a * 1.6) * (1 - hit.dist / 12), drag: 2, gravity: splash * 6,
          });
        }
      }
    }
    const rcs = (lx, ly, dirSign) => {
      const [x, y] = toW(lx, ly);
      this.smoke.emit({
        x, y, z: (Math.random() - 0.5) * 1.2,
        vx: c.vx + upx * dirSign * 9 + (Math.random() - 0.5) * 2, vy: c.vy + upy * dirSign * 9 + (Math.random() - 0.5) * 2,
        life: 0.35, size0: 0.4, size1: 1.6, color0: [0.95, 0.97, 1], alpha: 0.6, drag: 4,
      });
    };
    if (c.active.rotL) { rcs(1.85, -0.4, -1); rcs(-1.85, 0.4, 1); }
    if (c.active.rotR) { rcs(1.75, 0.3, 1); rcs(-1.9, -0.4, -1); }

    // tyre dust / snow spray, coloured by the surface under each wheel (asphalt barely dusts)
    const sp = Math.abs(c.vx);
    for (const w of c.wheels) {
      if (!w.contact) continue;
      const sd = this.surfaceDust(w.body);
      if (sp > 6 && Math.random() < Math.min(1, (sp / 30) * sd.rate)) {
        this.smoke.emit({
          x: w.hx - 0.4, y: w.hy + 0.2, z: (Math.random() < 0.5 ? -0.85 : 0.85),
          vx: c.vx * 0.2 - 2, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 2,
          life: 0.8, size0: 0.6, size1: 2.4, color0: sd.c, alpha: sd.a, drag: 2,
        });
      }
      if (w.slip && c.input.gas) {
        this.smoke.emit({ x: w.hx, y: w.hy + 0.3, z: 0.85, vx: -3, vy: 1.5, life: 1, size0: 1, size1: 3, color0: [0.85, 0.85, 0.85], alpha: 0.35, drag: 1.5 });
      }
    }

    // after a crash: fire + smoke from the wreck
    if (c.crashed && this.burnT < 4) {
      this.burnT += dt;
      const [x, y] = toW(0.6, 0.2);
      this.fx.emit({ x, y, z: (Math.random() - 0.5), vx: c.vx * 0.3 + (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, life: 0.6, size0: 1.6, size1: 0.5, color0: [1, 0.7, 0.2], color1: [1, 0.2, 0], alpha: 0.9, drag: 1 });
      this.smoke.emit({ x, y: y + 0.5, z: (Math.random() - 0.5), vx: c.vx * 0.2 + (Math.random() - 0.5) * 2, vy: 3 + Math.random() * 2, life: 2.5, size0: 1.5, size1: 6, color0: [0.15, 0.15, 0.15], color1: [0.3, 0.3, 0.3], alpha: 0.6, drag: 0.8 });
    }
  }

  // What a wheel or thruster kicks up from a surface: {c: rgb, a: alpha, rate, spray}
  surfaceDust(body) {
    const th = this.theme;
    if (!body) return { c: th.dust, a: 0.25, rate: 1 };
    const d = body.data || {};
    if (body.tag === 'hazard') {
      const hz = d.hazard;
      if (hz === 'water' || hz === 'sea' || hz === 'icewater') return { c: [0.9, 0.95, 1.0], a: 0.45, rate: 1.4, spray: true };
      if (hz === 'methane') return { c: [0.62, 0.5, 0.34], a: 0.4, rate: 1.2, spray: true };
      if (hz === 'lava') return { c: [0.22, 0.2, 0.19], a: 0.5, rate: 1 };
      return { c: th.dust, a: 0.3, rate: 1 };
    }
    if (body.tag === 'pad') {
      if (d.hill) return { c: [0.97, 0.98, 1.0], a: 0.55, rate: 1.6 };
      if (d.ice) return { c: [0.88, 0.94, 1.0], a: 0.4, rate: 1.2 };
      return { c: [0.74, 0.74, 0.76], a: 0.16, rate: 0.6 };
    }
    if (body.tag === 'ramp') return { c: [0.74, 0.74, 0.74], a: 0.1, rate: 0.4 };
    if ((d.kind === 'runway' || d.kind === 'runoff') && th.road) {
      if (th.snowfall) return { c: [0.95, 0.97, 1.0], a: 0.3, rate: 0.9 }; // snowy road
      return { c: [0.76, 0.76, 0.75], a: 0.08, rate: 0.5 }; // asphalt: only a faint haze
    }
    return { c: th.dust, a: 0.28, rate: 1 };
  }

  burst(x, y, color, n = 30, speed = 8, life = 0.8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.fx.emit({ x, y, z: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: (Math.random() - 0.5) * s, life: life * (0.75 + Math.random() * 0.5), size0: 0.8, size1: 0.1, color0: color, alpha: 1, drag: 2 });
    }
  }

  explosion(x, y) {
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 16;
      this.fx.emit({ x, y, z: (Math.random() - 0.5) * 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 4, vz: (Math.random() - 0.5) * s, life: 0.5 + Math.random() * 0.6, size0: 2.5, size1: 0.4, color0: [1, 0.9, 0.5], color1: [1, 0.2, 0], alpha: 1, drag: 2.5 });
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 6;
      this.smoke.emit({ x, y, z: (Math.random() - 0.5) * 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 3, vz: (Math.random() - 0.5) * s, life: 2 + Math.random(), size0: 2, size1: 8, color0: [0.2, 0.2, 0.2], color1: [0.45, 0.45, 0.45], alpha: 0.7, drag: 1.2, gravity: -0.5 });
    }
    for (let i = 0; i < 30; i++) {
      this.fx.emit({ x, y, z: 0, vx: (Math.random() - 0.5) * 30, vy: Math.random() * 20, vz: (Math.random() - 0.5) * 20, life: 1.2, size0: 0.3, size1: 0.2, color0: [1, 0.8, 0.4], alpha: 1, drag: 0.5, gravity: 9.8 });
    }
    this.car.materials.paint.color.set(0x2a1a1a);
    this.burnT = 0;
  }

  landingPuff(run) {
    const c = run.car;
    const w = c.wheels.find((x) => x.contact);
    const sd = this.surfaceDust(w ? w.body : null);
    const a = Math.max(0.2, Math.min(0.55, sd.a * 1.6));
    for (let i = 0; i < 40; i++) {
      const dir = i % 2 ? 1 : -1;
      this.smoke.emit({ x: c.x + dir * Math.random() * 2, y: c.y - 0.6, z: (Math.random() - 0.5) * 3, vx: dir * (3 + Math.random() * 7) + c.vx * 0.3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 6, life: 1.2, size0: 1, size1: 4, color0: sd.c, alpha: a, drag: 2 });
    }
  }

  shake(a) {
    this.shakeAmt = Math.max(this.shakeAmt, a);
  }

  updateCamera(dt, run, view) {
    const c = run.car;
    const L = this.L;
    const cam = this.camera;
    let fx, fy, dist;
    if (view.intro) {
      // fly-over from the pad back to the car
      const u = view.intro;
      const e = u * u * (3 - 2 * u);
      fx = L.pad.body.state.ox + (c.x + 8 - L.pad.body.state.ox) * e;
      fy = L.pad.y + 2 + (c.y + 1 - L.pad.y - 2) * e;
      dist = 70 - 40 * e;
    } else {
      const speed = Math.hypot(c.vx, c.vy);
      fx = c.x + c.vx * 0.35 + 6;
      fy = c.y + c.vy * 0.12 + 1.5;
      dist = 24 + Math.min(30, speed * 0.45);
      const airborne = run.phase === 'air' || run.phase === 'touchdown';
      if (airborne) {
        // frame both the car and the landing pad, but never lose the car
        const tanV = Math.tan((cam.fov * Math.PI) / 360);
        const tanH = tanV * cam.aspect;
        const px = L.pad.body.state.ox;
        const py = L.pad.y;
        let minX = c.x - 8, maxX = c.x + 8, minY = c.y - 5, maxY = c.y + 5;
        if (px - c.x > -15 && px - c.x < 260) {
          minX = Math.min(minX, px - 10);
          maxX = Math.max(maxX, px + 10);
          minY = Math.min(minY, py - 2);
          maxY = Math.max(maxY, py + 4);
        }
        const need = Math.max((maxX - minX) / 2 / tanH, (maxY - minY) / 2 / tanV) * 1.12;
        dist = Math.min(105, Math.max(dist, need));
        fx = (minX + maxX) / 2;
        fy = (minY + maxY) / 2;
        const hw = dist * tanH * 0.55;
        const hh = dist * tanV * 0.42;
        fx = Math.max(c.x - hw, Math.min(c.x + hw, fx));
        fy = Math.max(c.y - hh, Math.min(c.y + hh, fy));
      }
      if (run.phase === 'landed' || run.phase === 'complete') dist = 22;
      if (run.car.crashed) dist = 30;
    }
    const target = this.tmpV.set(fx, fy, 0);
    if (!this.camInit) {
      this.camLook.copy(target);
      this.camDist = dist;
      this.camInit = true;
    }
    const k = 1 - Math.exp(-dt * (view.intro ? 10 : 3.2));
    this.camLook.lerp(target, k);
    this.camDist += (dist - this.camDist) * (1 - Math.exp(-dt * 1.6));
    const d = this.camDist;
    cam.position.set(this.camLook.x - d * 0.1, this.camLook.y + 1.6 + d * 0.07, d);
    if (this.shakeAmt > 0.01) {
      cam.position.x += (Math.random() - 0.5) * this.shakeAmt;
      cam.position.y += (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt *= Math.exp(-dt * 6);
    }
    cam.lookAt(this.camLook.x, this.camLook.y, 0);
  }

  project(x, y, z = 0) {
    const v = this.tmpV.set(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, behind: v.z > 1 };
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
