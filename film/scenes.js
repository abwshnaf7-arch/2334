// ======================================================================= timeline
// audio anchors (seconds, from waveform analysis of the supplied voice-over)
const AN = { L1: 0.2, L1e: 9.3, L2: 10.5, L3: 34.8, L4: 50.4, LOUD: 58.15, LOUD2: 59.85, POST: 93.9, WORD1: 95.2, HIT: 97.7, WAVE: 99.8, SEA: 103.5, SUN: 107.9, LIFE: 113.2, NEW: 118.85, US: 123.2, END: 125.9 };
let FX;

function compose(t, fx) {
  FX = fx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let li = 0;
  for (const sh of SHOTS) {
    if (t < sh.a || t >= sh.b) continue;
    const al = sh.fin ? smooth(sh.a, sh.a + sh.fin, t) : 1; if (al <= 0) continue;
    const lc = [LAc, LBc][li++ % 2]; lc.setTransform(1, 0, 0, 1, 0, 0); lc.globalAlpha = 1; lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, W, H);
    sh.fn(lc, t, t - sh.a);
    ctx.globalAlpha = al; ctx.drawImage(lc.canvas, 0, 0); ctx.globalAlpha = 1;
  }
  fx.fade = Math.min(smooth(0, 1.6, t), 1 - smooth(TOTAL - 1.1, TOTAL, t));
}
const groundOf = (lc, S) => renderGround(lc, S);
// ---------- reusable actors
function herd(specs, t, t0) { return specs.map(a => Object.assign({}, a, { x: a.x + (a.vx || 0) * (t - t0), phase: (t - t0) * (a.spd || 1.5) + a.seed * 5 })); }
function flier(x0, y0, vx, vy, s, seed, wob = 30) { return { s, seed, off: seed * 3, pos: t => { const x = x0 + vx * t + Math.sin(t * .7 + seed) * 10, y = y0 + vy * t + Math.sin(t * 1.1 + seed * 4) * wob; return [x, y, vx]; } }; }
function fgFrondSet(seed, side) { const r = rng(seed), o = []; for (let i = 0; i < 5; i++) o.push({ x: side < 0 ? -40 + r() * 260 : W + 40 - r() * 260, y: H + 30 + r() * 30, rot: side < 0 ? -1.15 + r() * .9 : Math.PI + 1.15 - r() * .9 + 0, len: 520 + r() * 320, curl: .95, droop: .5 + r() * .3, wid: 7, seed: r() * 50, flip: false, par: 10 }); return o; }
function fgFronds2() { // frond arcs from bottom corners (manually oriented)
  const o = []; const r = rng(3);
  for (let i = 0; i < 4; i++) o.push({ x: -30 + i * 55, y: H + 40, rot: -1.25 + i * .28, len: 560 + r() * 200, curl: 1.1, droop: .55, wid: 8, seed: r() * 40 });
  for (let i = 0; i < 4; i++) o.push({ x: W + 30 - i * 55, y: H + 40, rot: -Math.PI + 1.25 - i * .28, len: 560 + r() * 200, curl: 1.1, droop: .55, wid: 8, seed: r() * 40 + 40, flip: false });
  return o;
}
const FRONDS = fgFronds2();

// ======================================================================= SHOT: space dive (0 – 9.8)
function shotDive(lc, t, l) {
  const lnr = kf(l, [[0, Math.log(.42)], [3.2, Math.log(.75)], [5.4, Math.log(2.4)], [7.4, Math.log(12)], [9.0, Math.log(50)]], smooth);
  const er = Math.exp(lnr), k = smooth(0, 8.5, l);
  const u = { T: t, eArc: [lerp(.2, 0, k), -er * .93 + .62 * (1 - k), er], eRot: .6 + l * .07, eTilt: .42, cities: 0, eSpin: 1, L: [.8, .28, .55], ast: [9, 9, .0001, 1], astRot: 0, heat: 0, mdir: [1, 0], starAmt: 1, exposure: lerp(1.05, .55, smooth(4, 8, l)), drift: l * .35, bowGlow: 0, shakeUV: [0, 0] };
  lc.drawImage(runGL('SPACE', u), 0, 0);
  // rush of clouds at the end
  const a = smooth(6.6, 9.0, l);
  if (a > 0) {
    const g = runGL('CLOUDS', { T: t, prog: l * .32, dirn: 1, tint: [1.25, .95, .7], tintD: [.55, .45, .55] });
    lc.globalAlpha = a; lc.drawImage(g, 0, 0); lc.globalAlpha = 1;
    lc.fillStyle = `rgba(255,214,170,${smooth(8.4, 9.6, l) * .85})`; lc.fillRect(0, 0, W, H);
  }
  FX.bloom = .2;
}
// ======================================================================= SHOT: dawn herd (9.2 – 21.8)
function shotDawn(lc, t, l) {
  const g = t - 9.2;
  const env = Object.assign(palMix('dawn', 'morning', smooth(0, 13, g)), { sunAz: .30, sunEl: lerp(.035, .16, smooth(0, 13, g)), sunI: 1, cover: .40, stars: 0, sunSize: .03, exposure: .9 });
  const S = { t, env, cam: { x: -4 + g * .26, z: g * .35, yaw: -.03 + g * .0009, pitch: .05, h: 2.4 }, rays: .06,
    ridges: [{ base: 60, amp: 130, freq: .0016, seed: 3, par: .2, haze: .93 }, { base: 22, amp: 95, freq: .0026, seed: 11, par: .5, haze: .82 }, { base: 6, amp: 55, freq: .004, seed: 21, par: 1, haze: .66 }],
    volcano: { x: 470, s: 1.15, lean: 1, glow: .5 }, fogK: .0062 };
  S.trees = makeTrees(7, 46, 40, 420, ['conifer', 'fern', 'cycad']);
  S.actors = herd([
    { k: 'brachio', x: -7, z: 74, seed: 1, spd: 1.55, unit: 26, vx: .5 }, { k: 'brachio', x: 10, z: 92, seed: 2, spd: 1.45, unit: 26, vx: .5, head: .8 }, { k: 'brachio', x: -19, z: 118, seed: 3, spd: 1.6, unit: 26, vx: .5 },
    { k: 'brachio', x: 21, z: 150, seed: 4, spd: 1.5, unit: 26, vx: .5, head: .2 }, { k: 'brachio', x: 3, z: 190, seed: 5, spd: 1.5, unit: 26, vx: .5 }], t, 9.2);
  S.fliers = [flier(-300, 250, 120, -8, .32, 1), flier(-500, 290, 118, -6, .26, 2), flier(-700, 230, 122, -4, .3, 3), flier(-350, 330, 110, -10, .22, 4)];
  S.fgFronds = FRONDS; S.fgCol = [.002, .003, .002];
  S.parts = [{ n: 55, seed: 1, speed: [10, -6], size: 5, alpha: .5, col: [1, .8, .5], tw: true }];
  groundOf(lc, S);
}
// ======================================================================= SHOT: morning close-up, sun & pterosaurs (21.2 – 29.8)
function shotMorning(lc, t, l) {
  const g = t - 21.2;
  const env = Object.assign(palMix('morning', 'day', smooth(0, 8, g)), { sunAz: .04, sunEl: .33, sunI: 1, cover: .35, stars: 0, sunSize: .035, exposure: .85 });
  const S = { t, env, cam: { x: 6 - g * .45, z: g * .3, yaw: .02 - g * .002, pitch: .15 + g * .004, h: 1.6 }, rays: .07, sunGlowK: 1.2,
    ridges: [{ base: 70, amp: 140, freq: .0014, seed: 41, par: .2, haze: .9 }, { base: 28, amp: 100, freq: .0024, seed: 51, par: .5, haze: .78 }],
    volcano: { x: 1520, s: .9, lean: -1 }, fogK: .006 };
  S.trees = makeTrees(19, 40, 30, 300, ['conifer', 'fern', 'cycad']);
  S.actors = herd([
    { k: 'brachio', x: 4, z: 42, seed: 7, spd: 1.35, unit: 26, vx: .3, head: 1 }, { k: 'brachio', x: 20, z: 60, seed: 8, spd: 1.4, unit: 26, vx: .3, head: .7 },
    { k: 'brachio', x: -14, z: 88, seed: 9, spd: 1.3, unit: 26, vx: .3 },
    { k: 'tri', x: -22, z: 36, seed: 10, spd: 1.2, unit: 30, vx: .15, flip: false, water: false }, { k: 'tri', x: -30, z: 46, seed: 11, spd: 1.3, unit: 30, vx: .15, water: false }], t, 21.2);
  S.fliers = [flier(-200, 180, 150, 4, .5, 5, 20), flier(-320, 200, 147, 2, .4, 6, 20), flier(-460, 150, 152, 6, .45, 7, 20), flier(-100, 260, 140, 0, .3, 8, 20), flier(-560, 230, 150, 5, .35, 9)];
  S.fgFronds = FRONDS; S.fgCol = [.002, .003, .002];
  S.parts = [{ n: 70, seed: 3, speed: [8, -10], size: 6, alpha: .45, col: [1, .95, .7], tw: true }];
  groundOf(lc, S);
}
// ======================================================================= SHOT: calm day, then tilt up to the sky (29.2 – 39.2)
function shotLookUp(lc, t, l) {
  const g = t - 29.2;
  const up = smoother(5.2, 9.2, g); // tilts 34.4 -> 38.4
  const dayEnv = palMix('day', 'day', 0);
  const zen = mix3(dayEnv.zen, [.001, .002, .008], smooth(0, 1, up * 1.2)), hor = mix3(dayEnv.hor, [.10, .18, .4], up * .8);
  const env = Object.assign({}, dayEnv, { zen, hor, sunAz: .5, sunEl: .48, sunI: 1 - up, cover: .38 - up * .1, stars: smooth(.25, .95, up), sunSize: .035, exposure: .85, cL: mix3(dayEnv.cL, [.3, .35, .55], up), cD: mix3(dayEnv.cD, [.06, .08, .15], up) });
  const S = { t, env, cam: { x: -2 + g * .2, z: g * .3, yaw: .0 + g * .003, pitch: .10 + up * 1.35, h: 2.2 }, rays: .03,
    ridges: [{ base: 60, amp: 120, freq: .0016, seed: 61, par: .2, haze: .85 }, { base: 20, amp: 90, freq: .0026, seed: 71, par: .5, haze: .72 }], volcano: { x: 1400, s: 1, lean: -1 }, fogK: .006, sunVis: 1 - up };
  S.trees = makeTrees(29, 44, 36, 380, ['conifer', 'fern', 'cycad']);
  const heads = 1;
  S.actors = herd([
    { k: 'brachio', x: -8, z: 66, seed: 12, spd: 1.4, unit: 26, vx: .3, head: 1 }, { k: 'brachio', x: 9, z: 80, seed: 13, spd: 1.45, unit: 26, vx: .3, head: 1 }, { k: 'brachio', x: -22, z: 110, seed: 14, spd: 1.4, unit: 26, vx: .3, head: 1 },
    { k: 'tri', x: 16, z: 40, seed: 15, spd: 1.2, unit: 30, water: false, flip: true, vx: -.1 }], t, 29.2).map(a => Object.assign(a, { head: lerp(a.head ?? .5, 1, up) }));
  S.fliers = [flier(-100, 300, 60, -30, .3, 13), flier(-260, 260, 65, -34, .26, 14)];
  S.fgFronds = FRONDS.map(f => Object.assign({}, f, { y: f.y + up * 1400 })); S.fgCol = [.002, .003, .002];
  S.parts = [{ n: 30, seed: 9, speed: [6, -8], size: 5, alpha: .35, col: [1, .95, .8], tw: true }];
  groundOf(lc, S);
  // rush through the clouds up into space
  const a = smooth(7.6, 9.2, g) * (1 - smooth(9.4, 10, g));
  if (a > 0) { const c = runGL('CLOUDS', { T: t, prog: (t - 36.8) * .4, dirn: 1, tint: [.75, .82, 1], tintD: [.15, .2, .35] }); lc.globalAlpha = a; lc.drawImage(c, 0, 0); lc.globalAlpha = 1; }
}
const SHOTS = [
  { a: 0, b: 9.8, fn: shotDive },
  { a: 9.2, b: 21.8, fn: shotDawn, fin: .9 },
  { a: 21.2, b: 29.8, fn: shotMorning, fin: .9 },
  { a: 29.2, b: 39.2, fn: shotLookUp, fin: .9 },
];
