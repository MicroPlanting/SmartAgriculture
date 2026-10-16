// Lightweight firefly environment: ~34 glowing dots on one canvas, 30 fps cap, paused when the tab is hidden.
// Reduced motion: a single static frame. Alert mood tints the particles coral.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let mood = "calm";
export const fx = { setMood(m) { mood = m; } };
const cv = document.createElement("canvas"); cv.id = "fx"; cv.setAttribute("aria-hidden", "true"); document.body.prepend(cv);
const c = cv.getContext("2d");
function sprite(rgb) { const s = document.createElement("canvas"); s.width = s.height = 32; const g = s.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(.25, `rgba(${rgb},.45)`); r.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return s; }
const SP = { mint: sprite("110,231,183"), sun: sprite("244,201,107"), red: sprite("255,93,104") };
let W, H, P = [], last = 0, raf = 0, t0 = performance.now();
function build() {
  const d = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0);
  const n = W < 760 ? 16 : 34; P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 5 + Math.random() * 9, sp: .3 + Math.random() * .6, ph: Math.random() * 6.28, up: 4 + Math.random() * 8, warm: Math.random() < .25 }));
  if (reduce) draw(0);
}
function draw(t) {
  c.clearRect(0, 0, W, H);
  for (const p of P) {
    const a = .18 + .32 * (.5 + .5 * Math.sin(t * p.sp * 2 + p.ph));
    c.globalAlpha = a; c.drawImage(mood === "alert" && p.warm ? SP.red : p.warm ? SP.sun : mood === "alert" ? SP.red : SP.mint, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  c.globalAlpha = 1;
}
function loop(now) {
  raf = requestAnimationFrame(loop); if (now - last < 33) return; const dt = Math.min((now - last) / 1000, .1); last = now; const t = (now - t0) / 1000;
  for (const p of P) { p.x += Math.sin(t * p.sp + p.ph) * 10 * dt; p.y -= p.up * dt; if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; } }
  draw(t);
}
const start = () => { if (!reduce && !raf) raf = requestAnimationFrame(loop); }, stop = () => { cancelAnimationFrame(raf); raf = 0; };
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });
document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
build(); start();
