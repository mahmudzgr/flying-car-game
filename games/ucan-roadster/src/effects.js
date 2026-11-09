// Lightweight CPU particle system rendered as a single THREE.Points per blend mode.
import * as THREE from 'three';

let sharedTex = null;
function dotTexture() {
  if (sharedTex) return sharedTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  sharedTex = new THREE.CanvasTexture(c);
  return sharedTex;
}

export class Particles {
  constructor(max = 1200, additive = false) {
    this.max = max;
    this.count = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.c0 = new Float32Array(max * 3);
    this.c1 = new Float32Array(max * 3);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grav = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', this.colAttr);
    geo.setAttribute('aSize', this.sizeAttr);
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: dotTexture() }, scale: { value: 600 } },
      vertexShader: `
        attribute vec4 aColor; attribute float aSize; varying vec4 vColor; uniform float scale;
        void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = aSize * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform sampler2D map; varying vec4 vColor;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vColor.rgb, vColor.a * t.a); }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
  }

  setScale(s) {
    this.points.material.uniforms.scale.value = s;
  }

  // o: {x,y,z, vx,vy,vz, life, size0,size1, color0:[r,g,b], color1, alpha, drag, gravity}
  emit(o) {
    let i = this.count;
    if (i >= this.max) {
      i = Math.floor(Math.random() * this.max);
    } else {
      this.count++;
    }
    this.pos[i * 3] = o.x;
    this.pos[i * 3 + 1] = o.y;
    this.pos[i * 3 + 2] = o.z || 0;
    this.vel[i * 3] = o.vx || 0;
    this.vel[i * 3 + 1] = o.vy || 0;
    this.vel[i * 3 + 2] = o.vz || 0;
    this.life[i] = 0;
    this.maxLife[i] = o.life || 1;
    const c0 = o.color0 || [1, 1, 1];
    const c1 = o.color1 || c0;
    this.c0.set(c0, i * 3);
    this.c1.set(c1, i * 3);
    this.s0[i] = o.size0 ?? 1;
    this.s1[i] = o.size1 ?? this.s0[i];
    this.a0[i] = o.alpha ?? 1;
    this.drag[i] = o.drag ?? 0;
    this.grav[i] = o.gravity ?? 0;
  }

  update(dt) {
    let n = this.count;
    for (let i = 0; i < n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        // swap-remove
        n--;
        this.copy(n, i);
        i--;
        continue;
      }
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= k;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const u = this.life[i] / this.maxLife[i];
      for (let c = 0; c < 3; c++) this.col[i * 4 + c] = this.c0[i * 3 + c] + (this.c1[i * 3 + c] - this.c0[i * 3 + c]) * u;
      const fade = u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9;
      this.col[i * 4 + 3] = this.a0[i] * fade;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * u;
    }
    this.count = n;
    this.points.geometry.setDrawRange(0, n);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
  }

  copy(from, to) {
    if (from === to) return;
    for (let c = 0; c < 3; c++) {
      this.pos[to * 3 + c] = this.pos[from * 3 + c];
      this.vel[to * 3 + c] = this.vel[from * 3 + c];
      this.c0[to * 3 + c] = this.c0[from * 3 + c];
      this.c1[to * 3 + c] = this.c1[from * 3 + c];
    }
    for (let c = 0; c < 4; c++) this.col[to * 4 + c] = this.col[from * 4 + c];
    this.life[to] = this.life[from];
    this.maxLife[to] = this.maxLife[from];
    this.size[to] = this.size[from];
    this.s0[to] = this.s0[from];
    this.s1[to] = this.s1[from];
    this.a0[to] = this.a0[from];
    this.drag[to] = this.drag[from];
    this.grav[to] = this.grav[from];
  }

  clear() {
    this.count = 0;
    this.points.geometry.setDrawRange(0, 0);
  }
}
