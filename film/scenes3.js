// ======================================================================= fireball over the valley (59.85 – 97.7)
function fireScene(t, tl, o) {
  // o: {u (0..1 fire palette), fire:{...}, cam, actors, fliers, sunI, ash, cover}
  const env = Object.assign(palMix(o.palA || 'day', o.palB || 'fire', o.u), { sunAz: .05, sunEl: .32, sunI: o.sunI ?? Math.max(0, 1 - o.u * 1.6), cover: o.cover ?? .5, stars: 0, sunSize: .035, exposure: (o.exposure ?? .8) * .68, glowAmt: o.glow ?? o.u, ash: o.ash || 0, wave: 1.8, windK: .03 });
  const S = { t: tl, env, cam: o.cam, rays: .03 * (1 - o.u), fire: o.fire, ridges: [{ base: 60, amp: 130, freq: .0016, seed: 3, par: .2, haze: .85 }, { base: 20, amp: 95, freq: .0026, seed: 11, par: .5, haze: .7 }, { base: 6, amp: 55, freq: .004, seed: 21, par: 1, haze: .5 }],
    volcano: o.volcano ?? { x: 520, s: 1.1, lean: 1, glow: .9 }, fogK: .0055, rimAmt: o.rim ?? .9, rimDir: o.rimDir || [-1, -.5], reflect: 1.4 };
  S.trees = makeTrees(o.treeSeed || 7, 40, 34, 380, ['conifer', 'fern', 'cycad']);
  S.actors = o.actors; S.fliers = o.fliers || []; S.parts = o.parts || []; S.fgFronds = o.fg === false ? null : FRONDS; S.fgCol = [.001, .001, .001];
  return S;
}
const fkf = (l, a) => kf(l, a, smooth);
const HERD = (t, t0, spd, vx, head, off = 0) => herd([
  { k: 'brachio', x: -6 + off, z: 66, seed: 1, unit: 26, vx, head }, { k: 'brachio', x: 11 + off, z: 84, seed: 2, unit: 26, vx, head }, { k: 'brachio', x: -20 + off, z: 105, seed: 3, unit: 26, vx, head },
  { k: 'brachio', x: 23 + off, z: 132, seed: 4, unit: 26, vx, head }, { k: 'brachio', x: 2 + off, z: 170, seed: 5, unit: 26, vx, head }, { k: 'tri', x: -28 + off, z: 44, seed: 6, unit: 30, vx: vx * .7, water: false }].map(a => Object.assign(a, { spd })), t, t0);
function shotFire1(lc, t, l) { // sky is ripped open
  const u = smooth(0, 2.5, l);
  const fire = { az: fkf(l, [[0, -.62], [10.6, .12]]), el: fkf(l, [[0, .72], [10.6, .30]]), vaz: .055, vel: -.04, size: fkf(l, [[0, .016], [10.6, .05]]), I: fkf(l, [[0, 1.5], [10.6, 2.6]]), len: fkf(l, [[0, .3], [10.6, .75]]), w: 1.5 };
  const fl = [flier(1900, 260, -260, 20, .4, 21, 40), flier(2200, 330, -250, 10, .35, 22, 40), flier(2500, 220, -270, 24, .45, 23, 40), flier(2050, 400, -240, 0, .3, 24, 40)].map(f => Object.assign(f, { pos: (tt => { const x = f.pos0 = f.pos0 || null; return null; }) }));
  const fl2 = [[1900, 260, -260, 20, .42, 21], [2250, 330, -250, 10, .36, 22], [2500, 210, -270, 24, .48, 23], [2100, 420, -240, 0, .3, 24]].map(a => flier(a[0], a[1], a[2], a[3], a[4], a[5], 30));
  const S = fireScene(t, t, { u, fire, cam: { x: -2 + l * .25, z: l * .3, yaw: fkf(l, [[0, -.10], [10.6, .0]]), pitch: fkf(l, [[0, .22], [10.6, .19]]), h: 2.2 }, cover: .55, ash: smooth(4, 10.6, l) * .15, actors: HERD(t, 59.85, fkf(l, [[0, 1.5], [10.6, 2.6]]), fkf(l, [[0, .3], [4, -1.2]]), fkf(l, [[0, .8], [3, 1]])), fliers: fl2,
    parts: [{ n: 60, seed: 4, speed: [-30, -40], size: 6, alpha: .5 * smooth(2, 5, l), col: [1, .55, .2], tw: true }] });
  groundOf(lc, S);
  FX.shake = Math.max(FX.shake, 2 + smooth(0, 10, l) * 5); FX.bloom = .22;
}
function shotFire2(lc, t, l) { // running herd, horizon on fire
  const fire = { az: fkf(l, [[0, .22], [7.8, .05]]), el: fkf(l, [[0, .2], [7.8, .07]]), vaz: -.03, vel: -.05, size: fkf(l, [[0, .06], [7.8, .13]]), I: 3, len: .7, w: 1.6, glowK: 1.6 };
  const run = herd([{ k: 'brachio', x: 22, z: 48, seed: 31, unit: 26, vx: -6.5, head: .6 }, { k: 'brachio', x: 34, z: 62, seed: 32, unit: 26, vx: -6.2, head: .5 }, { k: 'brachio', x: 12, z: 78, seed: 33, unit: 26, vx: -6.8, head: .5 },
    { k: 'brachio', x: 44, z: 96, seed: 34, unit: 26, vx: -6.0, head: .4 }, { k: 'tri', x: 8, z: 36, seed: 35, unit: 30, vx: -7.4, water: true }].map(a => Object.assign(a, { spd: 3.3 })), t, 70.3);
  const S = fireScene(t, t, { u: 1, fire, cam: { x: -6, z: l * .4, yaw: -.02, pitch: .09, h: 1.3 }, cover: .6, ash: .25, exposure: .8, actors: run,
    fliers: [[1800, 200, -300, 10, .45, 41], [2100, 300, -290, 6, .38, 42], [2400, 160, -310, 14, .5, 43]].map(a => flier(a[0], a[1], a[2], a[3], a[4], a[5], 30)),
    parts: [{ n: 70, seed: 5, speed: [-90, -30], size: 7, alpha: .7, col: [1, .55, .2], tw: true }, { n: 60, seed: 8, speed: [-160, 40], size: 4, alpha: .55, col: [1, .8, .55] }], rimDir: [1, -.2] });
  S.rimAmt = 1; groundOf(lc, S);
  FX.shake = Math.max(FX.shake, 6 + smooth(0, 8, l) * 5); FX.bloom = .26;
}
function shotFire3(lc, t, l) { // T. rex roars
  const roar = Math.max(smooth(.6, 1.2, l) * (1 - smooth(3.2, 3.8, l)), smooth(4.6, 5.0, l) * (1 - smooth(6.6, 7.2, l)));
  const fire = { az: .3, el: fkf(l, [[0, .13], [7.7, .09]]), vaz: -.03, vel: -.05, size: fkf(l, [[0, .08], [7.7, .12]]), I: 3.4, len: .8, w: 1.6, glowK: 1.7 };
  const jit = roar * Math.sin(t * 40) * .06;
  const S = fireScene(t, t, { u: 1, fire, cam: { x: -1 + l * .1, z: l * .5, yaw: fkf(l, [[0, .05], [7.7, -.03]]), pitch: .14, h: 2.6 }, cover: .65, ash: .3, exposure: .78,
    actors: [{ k: 'trex', x: -1.8, z: 40, seed: 51, unit: 27, phase: 0.2, walk: .0, roar: clamp(roar + jit), s: 1, water: true }, { k: 'brachio', x: 22, z: 100, seed: 52, unit: 26, phase: t * .8, head: 1, flip: true }, { k: 'brachio', x: -30, z: 130, seed: 53, unit: 26, phase: t * .8, head: 1 }],
    fliers: [[-400, 230, 260, 10, .4, 61], [-650, 300, 250, 6, .34, 62]].map(a => flier(a[0], a[1], a[2], a[3], a[4], a[5], 30)),
    parts: [{ n: 90, seed: 6, speed: [-70, -50], size: 6, alpha: .8, col: [1, .55, .2], tw: true }, { n: 40, seed: 12, speed: [-30, 60], size: 5, alpha: .3, col: [.5, .45, .42], comp: 'source-over' }], rimDir: [1, -.15] });
  S.rimAmt = 1; groundOf(lc, S);
  FX.shake = Math.max(FX.shake, 5 + roar * 6); FX.bloom = .27;
}
function shotFire4(lc, t, l) { // sky bleaches, time slows, then freezes
  const tl = t < 93.9 ? t : 93.9 + (t - 93.9) * .03;
  const slow = t < 93.9 ? (t - 86) * .3 : (93.9 - 86) * .3 + (t - 93.9) * .01;
  const q = smooth(0, 11.7, l);
  const fire = { az: fkf(l, [[0, .05], [11.7, -.02]]), el: fkf(l, [[0, .17], [11.7, .11]]), vaz: -.02, vel: -.05, size: fkf(l, [[0, .11], [11.7, .30]]), I: fkf(l, [[0, 3.5], [11.7, 6]]), len: 1, w: 1.8, glowK: 2.2 };
  const S = fireScene(t, tl, { u: 1, palB: 'white', fire, cam: { x: 0 + l * .05, z: 6 + l * .06, yaw: 0, pitch: .12, h: 2.4 }, cover: .6, ash: .3 * (1 - q), exposure: fkf(l, [[0, .78], [11.7, .95]]),
    actors: herd([{ k: 'brachio', x: -8, z: 46, seed: 71, unit: 26, head: 1 }, { k: 'brachio', x: 12, z: 60, seed: 72, unit: 26, head: 1, flip: true }, { k: 'brachio', x: -26, z: 82, seed: 73, unit: 26, head: 1 }, { k: 'brachio', x: 30, z: 110, seed: 74, unit: 26, head: .9 }, { k: 'trex', x: 4, z: 34, seed: 75, unit: 27, walk: 0, roar: .0, phase: .2 }].map(a => Object.assign(a, { spd: .5 })), slow, 0),
    fliers: [], parts: [{ n: 120, seed: 7, speed: [-25, -35], size: 6, alpha: .9, col: [1, .6, .25], tw: true }], rimDir: [0, -.5] });
  S.u2 = q; groundOf(lc, S);
  // white-out toward the hit
  const wo = smooth(95.6, 97.65, t); if (wo > 0) { lc.fillStyle = `rgba(255,240,220,${wo * .55})`; lc.fillRect(0, 0, W, H); }
  FX.shake = Math.max(FX.shake, t < 93.9 ? 5 + q * 4 : 2.5); FX.bloom = .3 + q * .1;
}
SHOTS.push(
  { a: 59.85, b: 70.7, fn: shotFire1 },
  { a: 70.3, b: 78.6, fn: shotFire2, fin: .5 },
  { a: 78.3, b: 86.4, fn: shotFire3, fin: .5 },
  { a: 86.0, b: 97.72, fn: shotFire4, fin: .6 },
);
