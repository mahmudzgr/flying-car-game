// 2D rigid-body physics for the flying roadster.
// Pure JS (no rendering deps) so it can be unit-tested / auto-tuned in Node.
//
// Coordinate system: x → right (direction of travel), y → up, angles CCW (rad).
// Units: metres, seconds, kilograms, newtons.

export const TAU = Math.PI * 2;
export const G_EARTH = 9.81;

export const CAR_SPEC = {
  mass: 1650,
  // Box approximation of a 4.2 m × 1.2 m body, +10 % for mass at the ends (battery, motors).
  inertia: (1650 * (4.2 * 4.2 + 1.2 * 1.2)) / 12 * 1.1,
  wheelRadius: 0.36,
  // Suspension mount points relative to the centre of mass.
  wheels: [
    { x: 1.32, y: -0.1 },
    { x: -1.32, y: -0.1 },
  ],
  restLen: 0.36, // max suspension travel
  springK: 60000, // N/m per wheel
  damperC: 6500, // N·s/m per wheel
  bumpStop: 0.04, // m of travel left when the bump stop engages
  bumpK: 900000,
  mu: 1.05, // tyre–asphalt friction coefficient
  maxDriveForce: 15500, // N (all-wheel drive, traction limited anyway)
  power: 650000, // W
  brakeForce: 17000, // N
  reverseForce: 5500, // N
  rollC: 14, // N per (m/s) rolling resistance per wheel
  cdA: 0.31 * 1.85, // drag coefficient × frontal area (m²)
  angularDrag: 0.25, // 1/s (air damping of rotation)
  // Cold-gas thruster package
  rotAccel: 8.5, // rad/s² from the pitch thrusters
  thrustFuel: 15, // % per second for the main (lift) thrusters
  rotFuel: 3.5, // % per second for each pitch thruster
  // Body collision hull (local coords). fatal = roof/glass; touching ground there means a crash.
  hull: [
    { x: 2.05, y: -0.36, fatal: false, name: 'ön tampon' },
    { x: 2.08, y: -0.02, fatal: false, name: 'burun' },
    { x: 1.0, y: 0.2, fatal: false, name: 'kaput' },
    { x: -0.05, y: 0.62, fatal: true, name: 'cam' },
    { x: -0.7, y: 0.62, fatal: true, name: 'tavan' },
    { x: -1.55, y: 0.33, fatal: false, name: 'bagaj' },
    { x: -2.08, y: 0.18, fatal: false, name: 'kuyruk' },
    { x: -2.05, y: -0.34, fatal: false, name: 'arka tampon' },
    { x: 0.0, y: -0.42, fatal: false, name: 'alt gövde' },
  ],
  hullK: 320000,
  hullC: 16000,
  hullMu: 0.55,
  hullImpactLimit: 7.5, // m/s normal impact speed that wrecks the body
};

// Thrust acceleration (m/s²) for a given gravity: always enough to hover with margin.
export function thrustAccelFor(g) {
  return 1.75 * g + 3.2;
}

// ---------------------------------------------------------------------------
// World: kinematic polygon bodies (ground, ramp, pads...)
// ---------------------------------------------------------------------------

export class Body {
  constructor({ id, tag, points, origin = { x: 0, y: 0 }, motion = null, data = {} }) {
    this.id = id;
    this.tag = tag; // 'ground' | 'ramp' | 'pad' | 'hazard' | 'wall'
    this.local = points; // CCW polygon, local coords
    this.origin = origin; // world position of local (0,0) at rest
    this.motion = motion; // (t) => {dx, dy, angle}
    this.data = data;
    this.n = points.length;
    this.world = new Float64Array(this.n * 2);
    this.state = { ox: origin.x, oy: origin.y, angle: 0, vx: 0, vy: 0, w: 0 };
    this.bbox = { x0: 0, y0: 0, x1: 0, y1: 0 };
    this.update(0, true);
  }

  update(t, force = false) {
    if (!this.motion && !force) return;
    const st = this.state;
    if (this.motion) {
      const h = 1e-3;
      const m0 = this.motion(t - h);
      const m = this.motion(t);
      const m1 = this.motion(t + h);
      st.ox = this.origin.x + m.dx;
      st.oy = this.origin.y + m.dy;
      st.angle = m.angle;
      st.vx = (m1.dx - m0.dx) / (2 * h);
      st.vy = (m1.dy - m0.dy) / (2 * h);
      st.w = (m1.angle - m0.angle) / (2 * h);
    }
    const c = Math.cos(st.angle);
    const s = Math.sin(st.angle);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < this.n; i++) {
      const p = this.local[i];
      const wx = st.ox + c * p[0] - s * p[1];
      const wy = st.oy + s * p[0] + c * p[1];
      this.world[i * 2] = wx;
      this.world[i * 2 + 1] = wy;
      if (wx < x0) x0 = wx;
      if (wx > x1) x1 = wx;
      if (wy < y0) y0 = wy;
      if (wy > y1) y1 = wy;
    }
    this.bbox.x0 = x0; this.bbox.y0 = y0; this.bbox.x1 = x1; this.bbox.y1 = y1;
  }

  velocityAt(px, py, out) {
    const st = this.state;
    out.x = st.vx - st.w * (py - st.oy);
    out.y = st.vy + st.w * (px - st.ox);
    return out;
  }
}

export class World {
  constructor({ bodies, gravity = G_EARTH, airDensity = 1.225, wind = null }) {
    this.bodies = bodies;
    this.gravity = gravity;
    this.airDensity = airDensity;
    this.wind = wind || (() => 0);
    this.time = 0;
    this._v = { x: 0, y: 0 };
  }

  update(t) {
    this.time = t;
    for (const b of this.bodies) b.update(t);
  }

  // Nearest front-facing hit of a ray against all polygon edges.
  raycast(ox, oy, dx, dy, maxLen) {
    let best = null;
    let bestS = maxLen;
    const rx0 = Math.min(ox, ox + dx * maxLen) - 0.01;
    const rx1 = Math.max(ox, ox + dx * maxLen) + 0.01;
    const ry0 = Math.min(oy, oy + dy * maxLen) - 0.01;
    const ry1 = Math.max(oy, oy + dy * maxLen) + 0.01;
    for (const b of this.bodies) {
      const bb = b.bbox;
      if (bb.x1 < rx0 || bb.x0 > rx1 || bb.y1 < ry0 || bb.y0 > ry1) continue;
      const w = b.world;
      const n = b.n;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ax = w[i * 2], ay = w[i * 2 + 1];
        const ex = w[j * 2] - ax, ey = w[j * 2 + 1] - ay;
        // outward normal for CCW polygon: (ey, -ex)
        if (ey * dx - ex * dy >= 0) continue; // back-facing
        const denom = dx * ey - dy * ex;
        if (Math.abs(denom) < 1e-12) continue;
        const wx = ax - ox, wy = ay - oy;
        const s = (wx * ey - wy * ex) / denom;
        if (s < 0 || s > bestS) continue;
        const u = (wx * dy - wy * dx) / denom;
        if (u < 0 || u > 1) continue;
        bestS = s;
        const len = Math.hypot(ex, ey);
        best = { dist: s, x: ox + dx * s, y: oy + dy * s, nx: ey / len, ny: -ex / len, body: b };
      }
    }
    if (best) {
      const v = best.body.velocityAt(best.x, best.y, this._v);
      best.vx = v.x;
      best.vy = v.y;
    }
    return best;
  }

  // If (px,py) is inside a solid, returns penetration depth + outward normal of nearest edge.
  pointQuery(px, py) {
    let result = null;
    for (const b of this.bodies) {
      const bb = b.bbox;
      if (px < bb.x0 || px > bb.x1 || py < bb.y0 || py > bb.y1) continue;
      const w = b.world;
      const n = b.n;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = w[i * 2], yi = w[i * 2 + 1], xj = w[j * 2], yj = w[j * 2 + 1];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) continue;
      let bestD = Infinity, bnx = 0, bny = 1;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ax = w[i * 2], ay = w[i * 2 + 1];
        const ex = w[j * 2] - ax, ey = w[j * 2 + 1] - ay;
        const len2 = ex * ex + ey * ey;
        let u = ((px - ax) * ex + (py - ay) * ey) / len2;
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const cx = ax + ex * u - px, cy = ay + ey * u - py;
        const d = Math.hypot(cx, cy);
        if (d < bestD) {
          bestD = d;
          const len = Math.sqrt(len2);
          bnx = ey / len;
          bny = -ex / len;
        }
      }
      if (!result || bestD < result.depth) {
        result = { depth: bestD, nx: bnx, ny: bny, body: b };
      }
    }
    if (result) {
      const v = result.body.velocityAt(px, py, this._v);
      result.vx = v.x;
      result.vy = v.y;
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------

export class Car {
  constructor(world, x, y, angle = 0, spec = CAR_SPEC) {
    this.world = world;
    this.spec = spec;
    this.x = x;
    this.y = y;
    this.a = angle;
    this.vx = 0;
    this.vy = 0;
    this.w = 0;
    this.fuel = 100;
    this.thrustAccel = thrustAccelFor(world.gravity);
    this.input = { gas: false, brake: false, thrust: false, rotL: false, rotR: false };
    this.active = { thrust: 0, rotL: 0, rotR: 0 }; // what actually fired (after fuel check)
    this.crashed = false;
    this.crashReason = '';
    this.wheels = spec.wheels.map((w) => ({
      mx: w.x,
      my: w.y,
      contact: false,
      tag: null,
      body: null,
      susLen: spec.restLen,
      compRate: 0,
      spin: 0,
      spinRate: 0,
      load: 0,
      slip: 0,
    }));
    this.hullContact = false;
    this.hullTags = new Set();
    this.maxImpact = 0; // max wheel/hull normal impact speed during the last step
    this.hullWasInside = spec.hull.map(() => false);
    this.lastHullImpact = 0;
    this.gForce = 1;
    this.noReverse = false; // auto-brake after landing must not reverse
    this.bodyImpactFatal = true; // the game disables this while driving on the runway / ramp
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  get grounded() {
    return this.wheels.some((w) => w.contact) || this.hullContact;
  }

  get wheelsDown() {
    let n = 0;
    for (const w of this.wheels) if (w.contact) n++;
    return n;
  }

  crash(reason) {
    if (this.crashed) return;
    this.crashed = true;
    this.crashReason = reason;
  }

  step(dt) {
    const S = this.spec;
    const W = this.world;
    const m = S.mass;
    const I = S.inertia;
    const g = W.gravity;
    const inp = this.crashed ? { gas: false, brake: false, thrust: false, rotL: false, rotR: false } : this.input;

    const ca = Math.cos(this.a);
    const sa = Math.sin(this.a);
    let fx = 0;
    let fy = -m * g;
    let torque = 0;
    this.maxImpact = 0;

    const applyAt = (px, py, Fx, Fy) => {
      fx += Fx;
      fy += Fy;
      torque += (px - this.x) * Fy - (py - this.y) * Fx;
    };

    // --- Aerodynamic drag (relative to wind) ---
    const rho = W.airDensity;
    const windX = W.wind(W.time);
    const rvx = this.vx - windX;
    const rvy = this.vy;
    const rv = Math.hypot(rvx, rvy);
    const k = 0.5 * rho * S.cdA;
    fx -= k * rvx * rv;
    fy -= k * rvy * rv;
    torque -= this.w * I * S.angularDrag * Math.min(1, rho / 1.225 + 0.05);

    // --- Thrusters ---
    this.active.thrust = 0;
    this.active.rotL = 0;
    this.active.rotR = 0;
    if (this.fuel > 0) {
      let use = 0;
      if (inp.thrust) {
        const F = m * this.thrustAccel;
        fx += -sa * F;
        fy += ca * F;
        this.active.thrust = 1;
        use += S.thrustFuel;
      }
      if (inp.rotL && !inp.rotR) {
        torque += I * S.rotAccel;
        this.active.rotL = 1;
        use += S.rotFuel;
      } else if (inp.rotR && !inp.rotL) {
        torque -= I * S.rotAccel;
        this.active.rotR = 1;
        use += S.rotFuel;
      }
      this.fuel = Math.max(0, this.fuel - use * dt);
    }

    // --- Wheels: ray-cast suspension + tyre forces ---
    const downX = sa;
    const downY = -ca;
    const rayLen = S.restLen + S.wheelRadius;
    let grounded = 0;
    for (const wh of this.wheels) {
      const mxw = this.x + ca * wh.mx - sa * wh.my;
      const myw = this.y + sa * wh.mx + ca * wh.my;
      const hit = W.raycast(mxw, myw, downX, downY, rayLen);
      if (!hit) {
        wh.contact = false;
        wh.tag = null;
        wh.body = null;
        wh.load = 0;
        wh.susLen += (S.restLen - wh.susLen) * Math.min(1, dt * 20);
        wh.compRate = 0;
        // free spinning wheel: motor spins it up in the air, otherwise slows down
        if (inp.gas) wh.spinRate += 60 * dt;
        else if (inp.brake) wh.spinRate *= Math.exp(-dt * 8);
        else wh.spinRate *= Math.exp(-dt * 0.4);
        wh.spin += wh.spinRate * dt;
        continue;
      }
      grounded++;
      const susLen = Math.max(0, hit.dist - S.wheelRadius);
      const comp = S.restLen - susLen;
      // velocity of the mount point relative to the surface it touches
      const vmx = this.vx - this.w * (myw - this.y) - hit.vx;
      const vmy = this.vy + this.w * (mxw - this.x) - hit.vy;
      const compRate = vmx * downX + vmy * downY; // >0 when compressing
      // Only count as an impact on the first frame of contact or while bottoming out.
      if (!wh.contact) this.maxImpact = Math.max(this.maxImpact, -(vmx * hit.nx + vmy * hit.ny));
      let Fs = S.springK * comp + S.damperC * compRate;
      if (susLen < S.bumpStop) {
        Fs += S.bumpK * (S.bumpStop - susLen) + S.damperC * 3 * Math.max(0, compRate);
        this.maxImpact = Math.max(this.maxImpact, compRate);
      }
      if (Fs < 0) Fs = 0;
      wh.contact = true;
      wh.tag = hit.body.tag;
      wh.body = hit.body;
      wh.susLen = susLen;
      wh.compRate = compRate;
      wh.load = Fs;
      wh.hx = hit.x;
      wh.hy = hit.y;
      wh.nx = hit.nx;
      wh.ny = hit.ny;
      wh.vmx = vmx;
      wh.vmy = vmy;
    }

    // tyre longitudinal forces
    const vForward = this.vx * ca + this.vy * sa;
    for (const wh of this.wheels) {
      if (!wh.contact) continue;
      const N = wh.load;
      const tx = wh.ny;
      const ty = -wh.nx; // tangent pointing "forward" along the surface
      const vt = wh.vmx * tx + wh.vmy * ty;
      let Ft = 0;
      const perWheel = 1 / Math.max(1, grounded);
      if (inp.gas) {
        const vabs = Math.max(4, Math.abs(vt));
        Ft += Math.min(S.maxDriveForce, S.power / vabs) * perWheel;
      } else if (inp.brake) {
        if (vForward > 1.0 || this.noReverse) {
          Ft -= S.brakeForce * perWheel * Math.max(-1, Math.min(1, vt / 0.5));
        } else {
          Ft -= S.reverseForce * perWheel;
          if (vt < -12) Ft = 0; // reverse speed limit
        }
      } else if (Math.abs(vt) < 1.5) {
        // parking-style hold at very low speeds (prevents creeping)
        Ft -= vt * 2500 * perWheel;
      }
      Ft -= vt * S.rollC;
      const maxF = S.mu * N;
      wh.slip = Math.abs(Ft) > maxF ? 1 : 0;
      if (Ft > maxF) Ft = maxF;
      else if (Ft < -maxF) Ft = -maxF;
      applyAt(wh.hx, wh.hy, wh.nx * N + tx * Ft, wh.ny * N + ty * Ft);
      // wheel visual spin
      const roll = vt / S.wheelRadius;
      if (wh.slip && inp.gas) wh.spinRate += (roll + 25 - wh.spinRate) * Math.min(1, dt * 10);
      else wh.spinRate = roll;
      wh.spin += wh.spinRate * dt;
    }

    // --- Body hull penalty contacts ---
    this.hullContact = false;
    this.hullTags.clear();
    for (let i = 0; i < S.hull.length; i++) {
      const hp = S.hull[i];
      const px = this.x + ca * hp.x - sa * hp.y;
      const py = this.y + sa * hp.x + ca * hp.y;
      const q = W.pointQuery(px, py);
      if (!q || q.depth > 1.6) {
        this.hullWasInside[i] = false;
        continue;
      }
      this.hullContact = true;
      this.hullTags.add(q.body.tag);
      const rvx2 = this.vx - this.w * (py - this.y) - q.vx;
      const rvy2 = this.vy + this.w * (px - this.x) - q.vy;
      const vn = rvx2 * q.nx + rvy2 * q.ny;
      if (!this.hullWasInside[i]) {
        const impact = -vn;
        this.lastHullImpact = Math.max(this.lastHullImpact, impact);
        if (hp.fatal) this.crash('Araç ters döndü!');
        else if (impact > S.hullImpactLimit && this.bodyImpactFatal) this.crash(`Gövde çarptı (${hp.name})`);
        if (q.body.tag === 'hazard') this.crash(q.body.data.hazardText || 'Düştün!');
      }
      this.hullWasInside[i] = true;
      let Fn = S.hullK * q.depth - S.hullC * vn;
      if (Fn < 0) Fn = 0;
      const tx = q.ny, ty = -q.nx;
      const vt = rvx2 * tx + rvy2 * ty;
      let Ft = -vt * 8000;
      const maxF = S.hullMu * Fn;
      if (Ft > maxF) Ft = maxF;
      else if (Ft < -maxF) Ft = -maxF;
      applyAt(px, py, q.nx * Fn + tx * Ft, q.ny * Fn + ty * Ft);
    }
    for (const wh of this.wheels) {
      if (wh.contact && wh.tag === 'hazard') this.crash(wh.body.data.hazardText || 'Düştün!');
    }

    // --- Integrate (semi-implicit Euler) ---
    const ax = fx / m;
    const ay = fy / m;
    this.gForce = Math.hypot(ax, ay + g) / G_EARTH;
    this.vx += ax * dt;
    this.vy += ay * dt;
    this.w += (torque / I) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.a += this.w * dt;
  }

  // World-space transform helper
  toWorld(lx, ly) {
    const ca = Math.cos(this.a);
    const sa = Math.sin(this.a);
    return { x: this.x + ca * lx - sa * ly, y: this.y + sa * lx + ca * ly };
  }
}

// Ballistic prediction (gravity + drag, no thrust) used for the trajectory assist.
export function predictTrajectory(world, x, y, vx, vy, maxT = 8, dt = 1 / 30, cdA = CAR_SPEC.cdA, mass = CAR_SPEC.mass) {
  const pts = [{ x, y }];
  const k = (0.5 * world.airDensity * cdA) / mass;
  let t = world.time;
  let hit = null;
  for (let i = 0; i < maxT / dt; i++) {
    const wx = world.wind(t);
    const rvx = vx - wx;
    const rv = Math.hypot(rvx, vy);
    vx += (-k * rvx * rv) * dt;
    vy += (-world.gravity - k * vy * rv) * dt;
    const nx = x + vx * dt;
    const ny = y + vy * dt;
    const len = Math.hypot(nx - x, ny - y);
    if (len > 1e-6) {
      const h = world.raycast(x, y, (nx - x) / len, (ny - y) / len, len + 0.75);
      if (h) {
        hit = { x: h.x, y: h.y, tag: h.body.tag, body: h.body, vx, vy };
        pts.push({ x: h.x, y: h.y });
        break;
      }
    }
    x = nx;
    y = ny;
    t += dt;
    pts.push({ x, y });
  }
  return { pts, hit };
}

// Rest height of the centre of mass above flat ground (static suspension sag).
export function restHeight(g = G_EARTH, spec = CAR_SPEC) {
  const sag = (spec.mass * g) / (spec.wheels.length * spec.springK);
  return -spec.wheels[0].y + (spec.restLen - sag) + spec.wheelRadius;
}
