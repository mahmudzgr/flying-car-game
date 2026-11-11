// Uzun Yol (sonsuz mod) akış yöneticisi: önde zemin üretir, fizik zincir parçalarını kurar/atar, nesneleri yakınlaşınca
// kurar, geride kalanı yok eder, teslim noktalarını ve biyom değişimini yürütür. DOM yok. Sözleşme: docs/MIMARI.md §14.
// createSim() içinden çağrılır; sim durumuna `ctx` üzerinden erişir.
import * as pl from '../../vendor/planck.mjs';
import { CAT, CARGO_LOSS, ENDLESS, SCORING, SIM } from '../config.js';
import { biomeAt, difficultyAt } from '../data/endless.js';

const V = pl.Vec2;

/**
 * @param {object} ctx  {gen, world, ground, terr, tracked, objects, coins, cargo, props, S, emit, cfg, vehicleId,
 *   buildObject(o), loadCargo(list, moving), cargoValue(c), lose(c, reason), carPos():{x,y}, st():staticSnap,
 *   setKillY(y), setFinish(x), bounds(): void}
 */
export function createEndless(ctx) {
  const { gen, world, ground, terr, tracked, objects, coins, cargo, props, S, emit } = ctx;
  const E = {
    segs: [],                 // üretilmiş parçalar {x0,x1,objects,spawned,...}
    pads: [],                 // sıradaki teslim noktaları [{x}]
    groundSegs: [],           // fizik zincir parçaları [{fix, xEnd}]
    physB: 0,                 // fiziğe çevrilmiş son düğümün MUTLAK indeksi
    biomes: [{ x0: 0, biome: 'elma' }],
    biome: 'elma',
    deliveries: 0, pay: 0, deliveredValue: 0, deliveredItems: 0, loaded: 0, cargoPts: 0,
    lastDeliveryX: 0, lostMark: 0, coinsDirty: false, lastGoneCheck: false,
  };

  // ---- fizik zinciri: hayalet köşeli parçalar (parçalar arası pürüzsüz) ----
  function buildPhysics() {
    const last = terr.base + terr.xs.length - 1;        // mutlak son düğüm
    const lb = E.physB - terr.base, le = last - 1 - terr.base;   // yerel: son kenarı (ileride kullanılacak) sonraki parçaya bırak
    if (le - lb < 1) return;
    const verts = [];
    for (let i = lb; i <= le; i++) verts.push(V(terr.xs[i], terr.ys[i]));
    const chain = pl.Chain(verts, false);
    if (lb > 0) chain.setPrevVertex(V(terr.xs[lb - 1], terr.ys[lb - 1]));
    chain.setNextVertex(V(terr.xs[le + 1], terr.ys[le + 1]));
    const fix = ground.createFixture(chain, {
      friction: 1, restitution: 0, filterCategoryBits: CAT.ground, filterMaskBits: 0xffff,
      userData: { k: 'ground', surf: terr.surf.slice(lb, le) },
    });
    E.groundSegs.push({ fix, xEnd: terr.xs[le] });
    E.physB = last - 1;
  }

  function onTerrainChanged(ev) {
    const st = ctx.st();
    if (st) {
      st.terrainRev = (st.terrainRev ?? 0) + 1;
      if (ev) emit(ev.name, { ...ev.data, rev: st.terrainRev });
      st.bounds.minX = terr.xs[0]; st.bounds.maxX = terr.xs[terr.xs.length - 1]; st.bounds.minY = terr.minY;
      let mx = -Infinity; for (const y of terr.ys) if (y > mx) mx = y;
      st.bounds.maxY = mx;
    }
    ctx.setKillY(terr.minY - SIM.killDepth);
  }

  function generateOne() {
    const seg = gen.next(terr.endX);
    const a = terr.append(seg.pieces);
    seg.x0 = a.x0; seg.x1 = a.x1; seg.spawned = false;
    E.segs.push(seg);
    if (seg.kind === 'pad') E.pads.push({ x: seg.x0 + seg.deliveryAt, y: 0 });
    if (seg.biomeChanged) E.biomes.push({ x0: seg.x0, biome: seg.biome });
    buildPhysics();
    return seg;
  }

  function fill(carX) {
    let n = 0; const lastEnd = terr.endX;
    while (terr.endX < carX + ENDLESS.genAhead && n++ < 8) generateOne();
    if (n) { onTerrainChanged({ name: 'terrainExtended', data: { from: lastEnd, to: terr.endX } }); refreshFinish(); }
  }

  function refreshFinish() {
    const nx = E.pads[0]?.x ?? 1e9;
    ctx.setFinish(nx);
  }

  function spawnPending(carX) {
    for (const seg of E.segs) {
      if (seg.spawned || seg.x0 > carX + ENDLESS.spawnAhead) continue;
      seg.spawned = true;
      for (const o of seg.objects) ctx.buildObject({ ...o, x: seg.x0 + o.x });
      if (seg.objects.some((o) => o.type === 'coins')) E.coinsDirty = true;
    }
  }

  function removeTracked(dead) {
    for (let i = tracked.length - 1; i >= 0; i--) if (dead.has(tracked[i].body)) tracked.splice(i, 1);
  }

  function cull(carX) {
    const cullX = carX - ENDLESS.keepBehind;
    // zemin fizik parçaları
    while (E.groundSegs.length && E.groundSegs[0].xEnd < cullX) ground.destroyFixture(E.groundSegs.shift().fix);
    // parça kayıtları
    while (E.segs.length && E.segs[0].x1 < cullX && E.segs[0].spawned) E.segs.shift();
    // nesneler
    const dead = new Set();
    for (let i = objects.length - 1; i >= 0; i--) {
      const ob = objects[i];
      if (ob.body.getPosition().x < cullX) { dead.add(ob.body); objects.splice(i, 1); }
    }
    props.cull(cullX);
    // kuruşlar
    let n = 0;
    for (let i = coins.length - 1; i >= 0; i--) if (coins[i].x < cullX) { coins.splice(i, 1); n++; }
    if (n) E.coinsDirty = true;
    // kargo: teslim edilen/kaybedilen gövdeler
    for (let i = cargo.length - 1; i >= 0; i--) {
      const c = cargo[i];
      if (c.state === 'onboard') continue;
      const gone = S.t - (c.t1 ?? 0) > (c.state === 'delivered' ? ENDLESS.deliveredLinger : ENDLESS.lostLinger) || c.body.getPosition().x < cullX;
      if (gone) { dead.add(c.body); cargo.splice(i, 1); }
    }
    for (const b of dead) world.destroyBody(b);
    if (dead.size) removeTracked(dead);
    // görsel zemin dizisi (yerinde kırpılır)
    const trimTo = carX - ENDLESS.trimBehind;
    if (terr.xs[0] < trimTo - 40) { if (terr.trim(trimTo)) onTerrainChanged({ name: 'terrainTrimmed', data: { to: terr.xs[0] } }); }
    // eski biyom kayıtları
    while (E.biomes.length > 3 && E.biomes[1].x0 < cullX) E.biomes.shift();
    while (E.pads.length && E.pads[0].x < cullX && E.pads.length > 1) E.pads.shift();
  }

  function biomeTick(carX) {
    let cur = E.biomes[0].biome;
    for (const b of E.biomes) if (b.x0 <= carX) cur = b.biome;
    if (cur !== E.biome) {
      E.biome = cur;
      const st = ctx.st(); if (st) st.biome = cur;
      emit('biomeChange', { biome: cur, x: carX });
    }
  }

  // ---- teslim ----
  function deliver(car) {
    const x = ctx.finishX();
    let n = 0, value = 0, intact = true;
    for (const c of cargo) {
      if (c.state !== 'onboard') continue;
      const cp = c.body.getPosition();
      if (Math.hypot(cp.x - car.x, cp.y - car.y) <= CARGO_LOSS.deliverRadius) {
        const v = ctx.cargoValue(c);
        c.state = 'delivered'; c.t1 = S.t;
        if (c.hp !== c.hpMax) intact = false;
        for (let f = c.body.getFixtureList(); f; f = f.getNext()) f.setFilterData({ groupIndex: 0, categoryBits: CAT.cargo, maskBits: CAT.ground });
        value += v; n++;
        emit('cargoDelivered', { id: c.id, type: c.type, value: v, hpLeft: c.hp });
      } else ctx.lose(c, 'left');
    }
    if (S.stats.cargoLost > E.lostMark) intact = false;
    E.lostMark = S.stats.cargoLost;
    const pay = Math.round(value * ENDLESS.payFactor);
    E.deliveries++; E.pay += pay; E.deliveredValue += value; E.deliveredItems += n;
    E.cargoPts += Math.round(value * SCORING.cargoMult * (intact && n ? 1 + SCORING.intactBonus : 1));
    E.lastDeliveryX = x;
    emit('delivery', { index: E.deliveries, x, count: n, value, pay, total: E.pay, intact: intact && n > 0, distance: Math.max(0, car.x - terr.startX) });
    emit('toast', { text: n ? `Teslim edildi! +${pay} kuruş` : 'Teslim noktası: kargo yok', icon: 'cargo' });
    E.pads.shift();
    refreshFinish();
    // yeni yük
    const made = ctx.loadCargo(gen.loadFor(E.deliveries, { capacity: ctx.cfg.capacity, vehicleId: ctx.vehicleId }), true);
    E.loaded += made.length;
    E.lastGoneCheck = false;
  }

  function onboard() { let n = 0; for (const c of cargo) if (c.state === 'onboard') n++; return n; }

  // ---- ilk kurulum ----
  E.loaded = cargo.length;
  const startSeg = { ...gen.start, x0: terr.startX, x1: terr.endX, spawned: false };
  E.segs.push(startSeg);
  buildPhysics();
  fill(ctx.spawnX);
  spawnPending(ctx.spawnX);

  return {
    state: E,
    /** Her adım (world.step'ten sonra, canlıyken). Döner: null | {fail: sebep, pos}. */
    update(car) {
      if (car.x >= ctx.finishX()) deliver(car);
      if (S.steps % ENDLESS.tickEvery === 0) {
        fill(car.x); spawnPending(car.x); cull(car.x); biomeTick(car.x);
      }
      // son kargo gitti → kısa süre sonra bitiş
      if (!S.pendingFail && E.deliveries * 0 + onboard() === 0) {
        if (!E.goneAt) E.goneAt = S.t;
        if (S.t - E.goneAt >= ENDLESS.goneDelay) return { fail: 'cargoGone', pos: { x: car.x, y: car.y } };
      } else E.goneAt = 0;
      return null;
    },
    /** 'levelEnd' yükü. */
    result(reason, score, car) {
      const dist = Math.max(0, car.x - terr.startX);
      return {
        result: 'end', mode: 'endless', seed: gen.seed, reason, score: score + Math.round(dist * SCORING.perMeter) + E.cargoPts, stars: 0,
        time: S.t, distance: dist, cargoDelivered: E.deliveredItems, cargoLost: S.stats.cargoLost, cargoTotal: E.loaded,
        coins: S.pickups, pickups: S.pickups, deliveries: E.deliveries, pay: E.pay, deliveredValue: E.deliveredValue,
        biome: E.biome, difficulty: difficultyAt(dist), usedCheckpoint: false, maxMultiplier: S.stats.maxMult, flips: S.stats.flips, intact: false,
      };
    },
    /** snapshot.endless (yeniden kullanılan nesne). */
    fillSnapshot(out, car, carriedValue) {
      const dist = Math.max(0, car.x - terr.startX), nx = ctx.finishX();
      out.seed = gen.seed; out.distance = dist; out.nextX = nx; out.toNext = Math.max(0, nx - car.x);
      out.leg = Math.max(0, Math.min(1, (car.x - E.lastDeliveryX) / Math.max(1, nx - E.lastDeliveryX)));
      out.deliveries = E.deliveries; out.pay = E.pay; out.carried = Math.round(carriedValue * ENDLESS.payFactor);
      out.biome = E.biome; out.difficulty = difficultyAt(dist); out.nextBiome = biomeAt(Math.floor(dist / ENDLESS.biomeLen + 1) * ENDLESS.biomeLen);
      out.nextBiomeX = (Math.floor(dist / ENDLESS.biomeLen) + 1) * ENDLESS.biomeLen;
      out.cargoPts = E.cargoPts; out.loaded = E.loaded; out.deliveredItems = E.deliveredItems;
      return out;
    },
    consumeCoinsDirty() { const d = E.coinsDirty; E.coinsDirty = false; return d; },
    groundSegCount: () => E.groundSegs.length,
  };
}
