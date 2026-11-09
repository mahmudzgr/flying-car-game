// Ara değerleme: sim snapshot'ındaki {x,y,a,px,py,pa} pozlarını alfa ile karıştırır.
// Sahip: Grafik (başlangıç sürümü Çekirdek'ten). Yeniden kullanılan `out` nesnesi — her karede aynı nesne döner.
const L = (p, c, a) => p + (c - p) * a;
function pose(src, alpha, dst) {
  dst = dst ?? {};
  Object.assign(dst, src);
  dst.x = L(src.px, src.x, alpha); dst.y = L(src.py, src.y, alpha); dst.a = L(src.pa, src.a, alpha);
  return dst;
}
/** @returns snapshot ile aynı şekilli, pozları ara değerlenmiş nesne (art/ fonksiyonlarına doğrudan verilir). */
export function interpolateSnapshot(snap, alpha, out = {}) {
  out.t = snap.t; out.run = snap.run; out.combo = snap.combo; out.timeScale = snap.timeScale; out.score = snap.score;
  out.coins = snap.coins; out.cargoSummary = snap.cargoSummary;
  const v = snap.vehicle;
  out.vehicle = pose(v, alpha, out.vehicle);
  out.vehicle.wheels = v.wheels.map((w, i) => pose(w, alpha, out.vehicle.wheels?.[i]));
  const d = snap.driver;
  out.driver = { state: d.state, torso: pose(d.torso, alpha, out.driver?.torso), head: pose(d.head, alpha, out.driver?.head) };
  out.cargo = snap.cargo.map((c, i) => pose(c, alpha, out.cargo?.[i]));
  out.objects = snap.objects.map((o, i) => pose(o, alpha, out.objects?.[i]));
  return out;
}
