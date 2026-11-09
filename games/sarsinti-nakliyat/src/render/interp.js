// Ara değerleme: snapshot'taki {x,y,a,px,py,pa} pozlarını alfa ile karıştırır. Sahip: Grafik.
// Yeniden kullanılan `out` nesnesi — kare başına tahsis yok (diziler yerinde doldurulur).
const L = (p, c, a) => p + (c - p) * a;
function pose(src, alpha, dst) {
  if (!dst) dst = {};
  const keep = dst.wheels;
  Object.assign(dst, src);
  if (keep) dst.wheels = keep; else if ('wheels' in dst) delete dst.wheels;
  dst.x = L(src.px, src.x, alpha); dst.y = L(src.py, src.y, alpha); dst.a = L(src.pa, src.a, alpha);
  return dst;
}
function poseList(srcArr, alpha, dstArr) {
  const n = srcArr.length;
  for (let i = 0; i < n; i++) dstArr[i] = pose(srcArr[i], alpha, dstArr[i]);
  dstArr.length = n;
  return dstArr;
}
/** @returns snapshot ile aynı şekilli, pozları ara değerlenmiş nesne (art/ fonksiyonlarına doğrudan verilir). */
export function interpolateSnapshot(snap, alpha, out = {}) {
  out.t = snap.t; out.run = snap.run; out.combo = snap.combo; out.timeScale = snap.timeScale; out.score = snap.score;
  out.coins = snap.coins; out.cargoSummary = snap.cargoSummary;
  const v = snap.vehicle;
  const ov = out.vehicle = pose(v, alpha, out.vehicle);
  ov.wheels = poseList(v.wheels, alpha, ov.wheels ?? []);
  if (v.trailer && v.trailer.px !== undefined) ov.trailer = out._tr = pose(v.trailer, alpha, out._tr);
  if (v.trailerWheels) ov.trailerWheels = out._trw = poseList(v.trailerWheels, alpha, out._trw ?? []);
  const d = snap.driver;
  const od = out.driver ?? (out.driver = { state: d.state, torso: null, head: null });
  od.state = d.state; od.torso = pose(d.torso, alpha, od.torso); od.head = pose(d.head, alpha, od.head);
  out.cargo = poseList(snap.cargo, alpha, out.cargo ?? []);
  out.objects = poseList(snap.objects, alpha, out.objects ?? []);
  return out;
}
