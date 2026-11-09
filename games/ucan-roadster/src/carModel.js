// Procedural low-poly electric roadster model (no external assets).
import * as THREE from 'three';

const WHEEL_X = 1.32;
const ARCH_Y = -0.34;

function bodyShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.06, -0.1);
  s.quadraticCurveTo(-2.08, -0.3, -1.95, -0.34);
  s.lineTo(-WHEEL_X - 0.48, ARCH_Y);
  s.absarc(-WHEEL_X, ARCH_Y, 0.48, Math.PI, 0, true);
  s.lineTo(WHEEL_X - 0.48, ARCH_Y);
  s.absarc(WHEEL_X, ARCH_Y, 0.48, Math.PI, 0, true);
  s.lineTo(1.98, -0.34);
  s.quadraticCurveTo(2.16, -0.3, 2.13, -0.1);
  s.quadraticCurveTo(2.1, 0.06, 1.86, 0.11);
  s.quadraticCurveTo(1.2, 0.2, 0.52, 0.27);
  s.lineTo(-0.95, 0.32);
  s.quadraticCurveTo(-1.6, 0.36, -1.95, 0.27);
  s.quadraticCurveTo(-2.1, 0.2, -2.06, -0.1);
  return s;
}

function cabinShape() {
  const s = new THREE.Shape();
  s.moveTo(0.62, 0.24);
  s.quadraticCurveTo(0.25, 0.42, -0.02, 0.6);
  s.quadraticCurveTo(-0.4, 0.66, -0.78, 0.62);
  s.quadraticCurveTo(-1.15, 0.52, -1.42, 0.3);
  s.lineTo(0.62, 0.24);
  return s;
}

export function createCarModel({ ghost = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const paint = ghost
    ? new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.28, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: 0xc4111f, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = ghost
    ? paint
    : new THREE.MeshPhysicalMaterial({ color: 0x0b1220, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.86, clearcoat: 1 });
  const black = ghost ? paint : new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.2 });

  const W = 1.62;
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape(), {
    depth: W,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.08,
    bevelSegments: 4,
    curveSegments: 18,
  });
  bodyGeo.translate(0, 0, -W / 2);
  const bodyMesh = new THREE.Mesh(bodyGeo, paint);
  bodyMesh.castShadow = !ghost;
  body.add(bodyMesh);

  const CW = 1.24;
  const cabGeo = new THREE.ExtrudeGeometry(cabinShape(), {
    depth: CW,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 14,
  });
  cabGeo.translate(0, 0, -CW / 2);
  const cab = new THREE.Mesh(cabGeo, glass);
  cab.castShadow = !ghost;
  body.add(cab);

  const parts = { root, body, wheels: [], flames: {}, materials: { paint, glass, black } };
  if (ghost) {
    for (const x of [WHEEL_X, -WHEEL_X]) {
      const wp = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.9, 16), paint);
      tire.rotation.x = Math.PI / 2;
      wp.add(tire);
      wp.position.set(x, -0.32, 0);
      body.add(wp);
      parts.wheels.push({ pivot: wp, spin: wp, baseX: x });
    }
    return parts;
  }

  // Lower black trim / diffuser / side skirt
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, W + 0.2), black);
  skirt.position.set(0, -0.32, 0);
  body.add(skirt);
  const diff = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, W - 0.1), black);
  diff.position.set(-1.98, -0.26, 0);
  body.add(diff);

  // Lights
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 2.2 });
  for (const z of [-0.62, 0.62]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.38), headMat);
    h.position.set(2.04, 0.02, z);
    h.rotation.z = -0.35;
    body.add(h);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff1020, emissive: 0xff0018, emissiveIntensity: 2.5 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, W + 0.1), tailMat);
  tail.position.set(-2.1, 0.13, 0);
  body.add(tail);
  parts.tailMat = tailMat;

  // Mirrors
  for (const z of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.14), paint);
    m.position.set(0.35, 0.33, z * (W / 2 + 0.16));
    body.add(m);
  }

  // Thruster nozzles (underbody) & RCS ports
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.25 });
  const nozzles = [];
  for (const x of [0.95, -0.95]) {
    for (const z of [-0.55, 0.55]) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.16, 12, 1, true), nozMat);
      n.position.set(x, -0.36, z);
      body.add(n);
      nozzles.push(n.position);
    }
  }

  // Flames (additive cones)
  const flameTex = makeFlameTexture();
  const flameOuter = new THREE.MeshBasicMaterial({ map: flameTex, color: 0xff9a3c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const flameInner = new THREE.MeshBasicMaterial({ map: flameTex, color: 0x9fd8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const coneGeo = new THREE.ConeGeometry(0.17, 1, 12, 1, true);
  coneGeo.rotateX(Math.PI); // tip down
  coneGeo.translate(0, -0.5, 0); // wide base at the nozzle (y=0), tip at y=-1
  const main = [];
  for (const p of nozzles) {
    const g = new THREE.Group();
    g.position.set(p.x, p.y - 0.08, p.z);
    const o = new THREE.Mesh(coneGeo, flameOuter);
    const i = new THREE.Mesh(coneGeo, flameInner);
    i.scale.set(0.5, 0.6, 0.5);
    g.add(o, i);
    g.visible = false;
    body.add(g);
    main.push(g);
  }
  parts.flames.main = main;

  const rcsMat = new THREE.MeshBasicMaterial({ map: flameTex, color: 0xcfe9ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rcsGeo = new THREE.ConeGeometry(0.1, 1, 10, 1, true);
  rcsGeo.rotateX(Math.PI);
  rcsGeo.translate(0, -0.5, 0);
  const mkRcs = (x, y, up) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    const m = new THREE.Mesh(rcsGeo, rcsMat);
    m.scale.set(1, 0.7, 1);
    g.add(m);
    if (up) g.rotation.z = Math.PI;
    g.visible = false;
    body.add(g);
    return g;
  };
  // rotL (nose up): front fires down, rear fires up. rotR: front up, rear down.
  parts.flames.rotL = [mkRcs(1.85, -0.3, false), mkRcs(-1.85, 0.32, true)];
  parts.flames.rotR = [mkRcs(1.75, 0.18, true), mkRcs(-1.9, -0.3, false)];

  const glow = new THREE.PointLight(0xff8a3a, 0, 9, 1.6);
  glow.position.set(0, -1.0, 0);
  body.add(glow);
  parts.glow = glow;

  // Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 0.95, roughness: 0.2 });
  const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 24);
  tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.235, 0.235, 0.3, 20);
  rimGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.42, 0.055, 0.04);
  for (const x of [WHEEL_X, -WHEEL_X]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, -0.32, 0);
    body.add(pivot);
    const spinners = [];
    for (const z of [-0.84, 0.84]) {
      const spin = new THREE.Group();
      spin.position.z = z;
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      spin.add(tire);
      const rim = new THREE.Mesh(rimGeo, black);
      spin.add(rim);
      for (let k = 0; k < 5; k++) {
        const sp = new THREE.Mesh(spokeGeo, rimMat);
        sp.rotation.z = (k / 5) * Math.PI;
        sp.position.z = z > 0 ? 0.13 : -0.13;
        spin.add(sp);
      }
      pivot.add(spin);
      spinners.push(spin);
    }
    parts.wheels.push({ pivot, spinners, baseX: x });
  }
  return parts;
}

function makeFlameTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 128);
  // bottom of the canvas (uv.y = 0) is the nozzle end of the cone
  grd.addColorStop(1, 'rgba(255,255,255,1)');
  grd.addColorStop(0.75, 'rgba(255,220,150,0.9)');
  grd.addColorStop(0.4, 'rgba(255,120,40,0.5)');
  grd.addColorStop(0, 'rgba(255,60,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
