// Milimetrik Park — bölümlerde ortak yerleşimler (otopark, sokak, kapalı otopark).

/** Açık hava otoparkı (ilk bölümlerin düzeni): üstte ve altta dik park sıraları, ortada geniş koridor. */
export function openLot(b, { topFill, bottomFill, stoppers = true, decor = 'trees', lamps = false, models }) {
  const W = b.L.w, H = b.L.h;
  b.rect('asphalt', 1.5, 2.0, W - 1.5, H - 2.4);
  b.curb(1.5, 2.0, W - 1.5, 2.0, -1);
  b.curb(1.5, H - 2.4, W - 1.5, H - 2.4, 1);
  b.curb(1.5, 2.0, 1.5, H - 2.4, 1);
  b.curb(W - 1.5, 2.0, W - 1.5, H - 2.4, -1);
  b.block(0, 0, W, 0.9, 'hedge');
  b.block(0, H - 1.0, W, H, 'hedge');
  b.block(0, 0, 0.6, H, 'hedge');
  b.block(W - 0.6, 0, W, H, 'hedge');
  const top = b.bays({ x: 4.25, y: 4.7, ang: -90, n: 11, stoppers });
  const bottom = b.bays({ x: 4.25, y: H - 2.6 - 2.5, ang: 90, n: 11, side: -1, stoppers });
  for (const i of topFill) b.fill(top[i], { models });
  for (const i of bottomFill) b.fill(bottom[i], { models });
  const midY = (7.2 + (H - 2.6 - 5)) / 2;
  b.arrow(9, midY, 0, { s: 0.9 }).arrow(W - 9, midY, 180, { s: 0.9 });
  if (decor === 'trees') {
    for (let x = 3; x < W; x += 6.5) b.decor('bush', x, 1.2, { r: 0.9 });
    b.tree(W - 0.9, H / 2, 2.4).tree(0.9, H / 2 + 3, 2.2);
  }
  if (lamps) for (let x = 6; x < W; x += 9) b.lamp(x, midY, { arm: 90, reach: 0.1, r: 9 });
  return { top, bottom, midY };
}

/**
 * Esnek otopark: üst sıra (burun kuzeye), koridor, alt sıra (burun güneye).
 * y0: üst kaldırım; dönüş: {top, bottom, aisleY, H}
 */
export function lot(b, o) {
  const W = b.L.w;
  const bw = o.bayW ?? 2.5, bl = o.bayL ?? 5, aisle = o.aisle ?? 6.5, y0 = o.y0 ?? 2.0, x0 = o.x0 ?? 3.5;
  const nTop = o.nTop ?? Math.floor((W - x0 - 1.5) / bw), nBot = o.nBot ?? nTop;
  const topBack = y0 + 0.2, topEnt = topBack + bl, botEnt = topEnt + aisle, botBack = botEnt + bl;
  const H = botBack + 0.2 + (o.bottomMargin ?? 2.4);
  const ground = o.ground || 'asphalt';
  b.rect(ground, 1.5, y0, W - 1.5, botBack + 0.2);
  if (!o.indoor) {
    b.curb(1.5, y0, W - 1.5, y0, -1).curb(1.5, botBack + 0.2, W - 1.5, botBack + 0.2, 1);
    b.curb(1.5, y0, 1.5, botBack + 0.2, 1).curb(W - 1.5, y0, W - 1.5, botBack + 0.2, -1);
    b.block(0, 0, W, Math.max(0.4, y0 - 1.1), 'hedge');
    b.block(0, botBack + 1.4, W, botBack + 2.0, 'hedge');
    b.block(0, 0, 0.6, botBack + 2, 'hedge').block(W - 0.6, 0, W, botBack + 2, 'hedge');
  }
  const top = o.noTop ? [] : b.bays({ x: x0 + bw / 2, y: topBack + bl / 2, ang: -90, n: nTop, w: bw, l: bl, stoppers: o.stoppers });
  const bottom = o.noBottom ? [] : b.bays({ x: x0 + bw / 2, y: botBack - bl / 2, ang: 90, n: nBot, w: bw, l: bl, side: -1, stoppers: o.stoppers });
  for (const i of o.topFill || []) b.fill(top[i], { models: o.models, facing: o.facing });
  for (const i of o.bottomFill || []) b.fill(bottom[i], { models: o.models, facing: o.facing });
  const aisleY = (topEnt + botEnt) / 2;
  return { top, bottom, aisleY, H, topEnt, botEnt, y0, botBack };
}

/** Otopark lambaları: üst ve alt kaldırım şeridinde (koridoru kapatmaz). */
export function lotLamps(b, r, xs, o = {}) {
  for (const x of xs) {
    b.lamp(x, r.y0 - 0.65, { arm: 90, reach: 1.1, r: o.r || 9 });
    if (!o.topOnly) b.lamp(x, r.botBack + 0.85, { arm: -90, reach: 1.1, r: o.r || 9 });
  }
}

/**
 * Sokak: kuzey kaldırımı y0'da, güney kaldırımı y0+width'te. Kenarlarda görünmez engel.
 * dönüş: {y0, y1}
 */
export function street(b, o) {
  const W = b.L.w, y0 = o.y0, y1 = o.y0 + o.width;
  const swN = o.sidewalkN ?? 2.2, swS = o.sidewalkS ?? 2.4;
  b.rect('sidewalk', 0, y0 - swN, W, y0).rect('asphalt', 0, y0, W, y1).rect('sidewalk', 0, y1, W, y1 + swS);
  if (o.slope) b.slope(0, y0 - swN, W, y1 + swS, o.slope.dir, o.slope.grade, 'asphalt');
  if (o.buildings !== false) {
    const bw = o.buildingW || 9;
    for (let x = 0, i = 0; x < W; x += bw, i++) b.block(x + 0.2, Math.max(0, y0 - swN - 6), Math.min(W, x + bw - 0.2), y0 - swN, 'building', { tone: (i + (o.tone || 0)) % 5 });
    for (let x = 0, i = 0; x < W; x += bw + 1.5, i++) b.block(x + 0.2, y1 + swS, Math.min(W, x + bw + 1.3), y1 + swS + 6, 'building', { tone: (i + 2 + (o.tone || 0)) % 5 });
  }
  if (o.curbN !== false) b.curb(0, y0, W, y0, -1);
  if (o.curbS !== false) b.curb(0, y1, W, y1, 1);
  b.wall(-0.3, y0, -0.3, y1, 0.3, { kind: 'barrier' }).wall(W + 0.3, y0, W + 0.3, y1, 0.3, { kind: 'barrier' });
  return { y0, y1 };
}

/** Kapalı otopark kabuğu: duvarlar ve zemin. */
export function garageShell(b, W, H) {
  b.rect('floor', 0.5, 0.5, W - 0.5, H - 0.5);
  b.block(0, 0, W, 0.5, 'wall').block(0, H - 0.5, W, H, 'wall').block(0, 0, 0.5, H, 'wall').block(W - 0.5, 0, W, H, 'wall');
}
