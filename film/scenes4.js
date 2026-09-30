// ======================================================================= extra 2D pieces
function lightning(c, x0, y0, x1, y1, seed, a) {
  const pts = [[x0, y0]]; const n = 22; const r = rng(seed);
  for (let i = 1; i <= n; i++) { const k = i / n; pts.push([lerp(x0, x1, k) + (r() - .5) * 120 * Math.sin(k * 3), lerp(y0, y1, k) + (r() - .5) * 20]); }
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
  for (const [w, al, col] of [[14, .25, '255,150,90'], [5, .6, '255,220,190'], [2, 1, '255,255,255']]) { c.strokeStyle = `rgba(${col},${al * a})`; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.stroke(); }
  for (let b = 0; b < 3; b++) { const s = 6 + Math.floor(r() * 12), p = pts[s]; c.lineWidth = 2; c.strokeStyle = `rgba(255,230,210,${.6 * a})`; c.beginPath(); c.moveTo(p[0], p[1]); let x = p[0], y = p[1]; for (let i = 0; i < 6; i++) { x += (r() - .3) * 70; y += 30 + r() * 40; c.lineTo(x, y); } c.stroke(); }
  c.restore();
}
function boltFlash(c, t, times, hy) { // returns flash amount and draws bolt
  let f = 0; times.forEach((tt, i) => { const d = t - tt; if (d >= 0 && d < .5) { const a = d < .08 ? 1 : d < .16 ? .3 : d < .24 ? .8 * (1 - (d - .16) / .08) + .1 : Math.max(0, .15 * (1 - (d - .24) / .26)); f = Math.max(f, a); const r = rng(i * 7 + 3); lightning(c, 300 + r() * 1300, -20, 300 + r() * 1300, hy - 40, i * 11 + 5, a); } });
  return f;
}
function waveWall(c, t, h, hy) {
  const base = hy + 30, top = x => base - h * (.82 + .18 * fbm1(x * .003 + t * .35)) - h * .06 * Math.sin(x * .011 + t * 1.3);
  const bot = hy + 34 + (H - hy) * smooth(50, 420, h); const pth = () => { c.beginPath(); c.moveTo(-10, bot); for (let x = -10; x <= W + 10; x += 8) c.lineTo(x, top(x)); c.lineTo(W + 10, bot); c.closePath(); };
  const g = c.createLinearGradient(0, base - h, 0, bot); g.addColorStop(0, 'rgb(6,14,20)'); g.addColorStop(.35, 'rgb(8,26,34)'); g.addColorStop(.6, 'rgb(3,10,14)'); g.addColorStop(1, `rgba(3,10,14,${1 - smooth(500, 900, h)})`);
  c.fillStyle = g; pth(); c.fill();
  // flowing streaks
  c.save(); pth(); c.clip(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) { const yy = lerp(base - h, H, hash(i * 1.3)), xx = ((hash(i * 2.7) * W * 1.4 + t * (40 + 90 * hash(i)) * (yy / H + .3)) % (W * 1.4)) - W * .2, len = 100 + 380 * hash(i * 3.9); if (yy < top(xx) + 8) continue; const gr = c.createLinearGradient(xx, 0, xx + len, 0); gr.addColorStop(0, 'rgba(120,190,200,0)'); gr.addColorStop(.5, `rgba(120,190,200,${.05 + .12 * hash(i)})`); gr.addColorStop(1, 'rgba(120,190,200,0)'); c.fillStyle = gr; c.fillRect(xx, yy, len, 2 + 3 * hash(i + 5)); }
  c.restore();
  c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(220,235,240,0)`; c.lineWidth = 6; c.beginPath(); for (let x = -10; x <= W + 10; x += 12) { const y = bot + 4 * Math.sin(x * .03 + t * 3); x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); c.restore();
  // rim + foam
  c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,140,60,.55)'; c.lineWidth = 4; c.shadowColor = 'rgba(255,120,40,.9)'; c.shadowBlur = 18; c.beginPath(); for (let x = -10; x <= W + 10; x += 8) x < 0 ? c.moveTo(x, top(x)) : c.lineTo(x, top(x)); c.stroke(); c.shadowBlur = 0;
  for (let i = 0; i < 260; i++) { const x = hash(i * 1.9) * W, yy = top(x) + (hash(i * 4.1) - .3) * 40 - ((t * (30 + 50 * hash(i)) + hash(i) * 200) % 90); const r = 3 + 16 * hash(i * 6.3) * Math.min(1, h / 400); const gr = c.createRadialGradient(x, yy, 0, x, yy, r); gr.addColorStop(0, `rgba(235,245,250,${.35 * hash(i * 2.2)})`); gr.addColorStop(1, 'rgba(235,245,250,0)'); c.fillStyle = gr; c.fillRect(x - r, yy - r, r * 2, r * 2); }
  c.restore();
}
function skeleton(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round';
  c.lineWidth = 9; c.beginPath(); c.moveTo(-330, -6); c.bezierCurveTo(-200, -34, -60, -70, 40, -70); c.bezierCurveTo(140, -70, 230, -30, 300, -20); c.stroke();
  c.lineWidth = 6; for (let i = 0; i < 9; i++) { const rx = -40 + i * 26, ry = -66 + Math.abs(i - 4) * 3; c.beginPath(); c.moveTo(rx, ry); c.bezierCurveTo(rx + 12, ry - 8 - (4 - Math.abs(i - 4)) * 14, rx + 26, ry - 6, rx + 30, ry + 34); c.stroke(); }
  c.beginPath(); c.ellipse(340, -16, 34, 15, .1, 0, 7); c.fill(); c.lineWidth = 5; c.beginPath(); c.moveTo(-330, -6); c.lineTo(-420, 4); c.stroke(); c.restore();
}
function seedling(c, x, y, g, sc, light) {
  const p = smooth(0, 2.6, g), leaf = smooth(1.4, 3.4, g);
  const h = 210 * sc * p; const sway = Math.sin(g * 1.3) * 4;
  const stem = bezPts([x, y], [x + 6, y - h * .4], [x - 8 + sway, y - h * .75], [x + 14 + sway, y - h], 20);
  c.save(); c.lineCap = 'round';
  // soft light pool
  const gg = c.createRadialGradient(x, y - h * .6, 0, x, y - h * .6, 260 * sc); gg.addColorStop(0, `rgba(160,255,120,${.28 * p * light})`); gg.addColorStop(1, 'rgba(120,255,90,0)'); c.globalCompositeOperation = 'lighter'; c.fillStyle = gg; c.fillRect(x - 260 * sc, y - h * .6 - 260 * sc, 520 * sc, 520 * sc); c.globalCompositeOperation = 'source-over';
  c.strokeStyle = '#3f8f2a'; c.lineWidth = 9 * sc; strokePartial(c, stem, 1);
  c.strokeStyle = '#8fe066'; c.lineWidth = 3 * sc; strokePartial(c, stem.map(q => [q[0] - 2 * sc, q[1]]), 1);
  const tip = stem[stem.length - 1];
  for (const [f, d] of [[.62, -1], [.85, 1]]) {
    const b = stem[Math.floor(f * 20)]; const L = 120 * sc * leaf * (f > .7 ? .85 : 1), a = d * (.9 - leaf * .35);
    c.save(); c.translate(b[0], b[1]); c.rotate(-Math.PI / 2 + a * 1.2 + (d > 0 ? .15 : -.15) * Math.sin(g * 1.5)); c.fillStyle = '#4fae35';
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(L * .25, -L * .28, L * .75, -L * .26, L, 0); c.bezierCurveTo(L * .75, L * .22, L * .25, L * .2, 0, 0); c.fill();
    c.strokeStyle = '#a5f07c'; c.lineWidth = 2 * sc; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * .95, 0); c.stroke(); c.restore();
  }
  c.restore();
}
function mammal(c, x, y, s, t, a) {
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = a; c.fillStyle = '#0b0906';
  const bob = Math.sin(t * 2.2) * 2;
  ell(c, 0, -22 + bob, 44, 22, -.05); ell(c, 44, -27 + bob, 20, 14, .2); tube(c, [[62, -27 + bob], [92, -22 + bob]], 6, 2); ell(c, 40, -42 + bob, 6, 8, -.3); ell(c, 50, -43 + bob, 6, 8, .2);
  tube(c, bezPts([-40, -20], [-90, -10], [-120, -30 + Math.sin(t) * 6], [-160, -18], 12), 6, 1.5);
  for (const lx of [-22, 18]) tube(c, [[lx, -8], [lx + 4, 0]], 7, 4);
  c.fillStyle = 'rgba(255,220,160,.9)'; c.beginPath(); c.arc(48, -31 + bob, 2.2, 0, 7); c.fill();
  c.restore(); c.globalAlpha = 1;
}
// ======================================================================= SHOT: impact, shockwave and fire wall (97.65 – 103.9)
function shotImpact(lc, t, l) {
  const fire = { az: 0, el: .028, vaz: 0, vel: -.03, size: .36, I: 8, len: 1.2, w: 2, glowK: 3 };
  const st = 93.9 + 0 * t;
  const S = fireScene(t, t, { u: 1, palB: 'white', fire, cam: { x: 0, z: 6.7, yaw: 0, pitch: .12, h: 2.4 }, cover: .6, ash: 0, exposure: fkf(l, [[0, 1.0], [1.4, .8], [6, .5]]),
    actors: herd([{ k: 'brachio', x: -8, z: 46, seed: 71, unit: 26, head: 1 }, { k: 'brachio', x: 12, z: 60, seed: 72, unit: 26, head: 1, flip: true }, { k: 'brachio', x: -26, z: 82, seed: 73, unit: 26, head: 1 }, { k: 'brachio', x: 30, z: 110, seed: 74, unit: 26, head: .9 }, { k: 'trex', x: 4, z: 34, seed: 75, unit: 27, walk: 0, roar: .0, phase: .2 }].map(a => Object.assign(a, { spd: .5, head: .9 + Math.min(.1, l * .3) })), 4.3, 0),
    parts: [{ n: 160, seed: 21, speed: [-140, -100], size: 7, alpha: .9, col: [1, .6, .2], tw: true }, { n: 90, seed: 22, speed: [-300, 20], size: 4, alpha: .5, col: [1, .8, .5] }], rimDir: [0, -.5], glow: 1 });
  S.env.glowAmt = 1.2; S.env.ash = smooth(.5, 5, l) * .3; groundOf(lc, S);
  const hy = horizonY(S);
  // shock rings from the horizon
  lc.save(); lc.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) { const ll = l - k * .22; if (ll <= 0) continue; const r = ll * 2100, a = Math.exp(-ll * 1.1) * (1 - k * .3); const gg = lc.createRadialGradient(W / 2, hy, Math.max(0, r - 90), W / 2, hy, r + 40); gg.addColorStop(0, 'rgba(255,200,140,0)'); gg.addColorStop(.7, `rgba(255,230,190,${.5 * a})`); gg.addColorStop(1, 'rgba(255,200,140,0)'); lc.fillStyle = gg; lc.fillRect(0, 0, W, H); }
  lc.restore();
  // fire wall rolling in
  const pr = smooth(.9, 6, l);
  const fw = runGL('FIRE', { T: t, prog: pr, heatMul: 1.15, base: lerp(1 - hy / H - .02, -.35, pr), hgt: lerp(.10, 2.0, pr * pr) + .08, fscale: lerp(8, 2.2, pr), alphaMul: smooth(.6, 1.6, l), mode: 0 });
  lc.drawImage(fw, 0, 0);
  if (l > 4.3) { const sm = runGL('FIRE', { T: t + 9, prog: pr, heatMul: .5, base: -.4, hgt: 2.6, fscale: 2.4, alphaMul: smooth(4.3, 6.1, l), mode: 1 }); lc.drawImage(sm, 0, 0); }
  FX.flash = Math.max(FX.flash, 1.6 * Math.exp(-l * 2.4)); FX.shake = Math.max(FX.shake, 46 * Math.exp(-l * .55) + 4); FX.bloom = .32; FX.ca = 1;
}
// ======================================================================= SHOT: the sea rises (103.4 – 108.3)
function shotSea(lc, t, l) {
  const u = smooth(0, 4.4, l);
  const env = Object.assign(palMix('fire', 'ash', u), { sunAz: 0, sunEl: .1, sunI: 0, cover: .8, stars: 0, exposure: .55, glowAmt: .8 * (1 - u), ash: .55 + u * .3, wave: 3.5, windK: .05 });
  const S = { t, env, cam: { x: 0, z: 0, yaw: 0, pitch: .09, h: 2.0 }, ridges: [{ base: 40, amp: 110, freq: .002, seed: 3, par: .3, haze: .8 }, { base: 8, amp: 60, freq: .004, seed: 21, par: 1, haze: .6 }], fogK: .006, volcano: { x: 300, s: 1.1, lean: 1, glow: 1 } };
  S.trees = makeTrees(91, 26, 34, 300, ['dead', 'dead', 'conifer']); S.actors = []; S.parts = [{ n: 140, seed: 31, speed: [-40, 70], size: 5, alpha: .5, col: [.55, .5, .46], comp: 'source-over' }, { n: 60, seed: 32, speed: [-60, -50], size: 5, alpha: .7, col: [1, .5, .18], tw: true }];
  groundOf(lc, S);
  const hy = horizonY(S);
  const h = kf(l, [[0, 24], [1.2, 60], [3, 300], [4.2, 760], [5, 1500]], easeIn === null ? smooth : (a, b, x) => smooth(a, b, x));
  waveWall(lc, t, h, hy);
  const f = boltFlash(lc, t, [104.6, 106.15], hy); if (f > 0) { lc.fillStyle = `rgba(210,225,255,${f * .35})`; lc.fillRect(0, 0, W, H); }
  FX.shake = Math.max(FX.shake, 8 + u * 22); FX.bloom = .2;
  if (l > 4.1) { lc.fillStyle = `rgba(2,6,8,${smooth(4.1, 4.9, l)})`; lc.fillRect(0, 0, W, H); }
}
// ======================================================================= SHOT: the sun goes out (107.8 – 113.6)
function shotSun(lc, t, l) {
  const cyc = 1.08, ph = (l / cyc) % 1;
  const sI = kf(l, [[0, 1], [1.08, .85], [2.2, .55], [3.2, .35], [4.2, .16], [5.0, .04], [5.5, 0]], smooth);
  const elev = Math.sin(Math.PI * ph);
  const env = Object.assign(palMix('dusk', 'ash', smooth(0, 4, l)), { sunAz: -1.05 + 2.1 * ph, sunEl: .02 + .5 * elev, sunI: sI * (.4 + .6 * Math.pow(elev, .5)), cover: .85, stars: 0, sunSize: .04, exposure: (.42 + .5 * Math.pow(elev, .8) * sI) * (1 - smooth(4.4, 5.8, l) * .6), ash: .35 + smooth(0, 5, l) * .5, glowAmt: .25 * (1 - smooth(0, 4, l)), wave: .5, windK: .08 });
  const S = { t, env, cam: { x: 0, z: 0, yaw: fkf(l, [[0, -.05], [5.8, .06]]), pitch: .10, h: 1.6 }, ridges: [{ base: 40, amp: 110, freq: .002, seed: 3, par: .3, haze: .85 }, { base: 8, amp: 60, freq: .004, seed: 21, par: 1, haze: .7 }], fogK: .007, volcano: { x: 1500, s: 1, lean: -1, glow: .8 }, rays: .05, groundCol: [.004, .004, .004] };
  S.trees = makeTrees(93, 30, 34, 300, ['dead', 'dead', 'dead', 'conifer']); S.actors = [];
  S.parts = [{ n: 220, seed: 41, speed: [-30, 60], size: 5, alpha: .55, col: [.62, .58, .54], comp: 'source-over' }, { n: 40, seed: 42, speed: [-20, -35], size: 4, alpha: .55, col: [1, .5, .15], tw: true }];
  groundOf(lc, S);
  const hy = horizonY(S); const col = 'rgb(4,4,4)';
  const p = proj(S, 0, 0, 60); skeleton(lc, W * .28 - S.cam.yaw * 900, hy + 90, 1.05, col); skeleton(lc, W * .72 - S.cam.yaw * 900, hy + 46, .55, col);
  const f = boltFlash(lc, t, [110.3], hy); if (f > 0) { lc.fillStyle = `rgba(200,210,255,${f * .3})`; lc.fillRect(0, 0, W, H); }
  FX.shake = Math.max(FX.shake, 3); FX.bloom = .22;
}
// ======================================================================= SHOT: one hundred lights (113.0 – 118.9)
function shotLights(lc, t, l) {
  lc.fillStyle = '#020204'; lc.fillRect(0, 0, W, H);
  const bg = lc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900); bg.addColorStop(0, 'rgba(40,26,20,.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); lc.fillStyle = bg; lc.fillRect(0, 0, W, H);
  const zoom = 1 + l * .012; lc.save(); lc.translate(W / 2, H / 2); lc.scale(zoom, zoom); lc.translate(-W / 2, -H / 2);
  const sp = 78, x0 = W / 2 - sp * 4.5, y0 = H / 2 - sp * 4.5;
  const hues = [[120, 255, 140], [255, 205, 110], [110, 220, 255], [255, 130, 120], [190, 150, 255]];
  const order = []; for (let i = 0; i < 100; i++) order.push(i); const rr = rng(77); for (let i = 99; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  lc.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 100; i++) {
    const cx = x0 + (i % 10) * sp, cy = y0 + Math.floor(i / 10) * sp; const rank = order.indexOf(i);
    const c = hues[(i * 7 + Math.floor(i / 10) * 3) % 5];
    const appear = smooth(0, .9, l - (i % 10 + Math.floor(i / 10)) * .045);
    let alive = 1, flick = 1;
    if (rank < 75) { const tDie = 1.15 + (rank / 75) * 3.3; const d = l - tDie; if (d > 0) { flick = d < .45 ? (.5 + .5 * Math.sin(d * 60)) * (1 - d / .45) : 0; alive = 0; } }
    const surv = rank >= 75 ? smooth(4.2, 5.6, l) : 0;
    const pulse = rank >= 75 ? 1 + .25 * Math.sin(t * 3 + i) * surv : 1;
    let a = appear * (alive ? 1 : flick) * pulse;
    const rad = 34 * (1 + surv * .5) * (rank >= 75 ? 1 : 1);
    if (a > .01) { const gg = lc.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.6); gg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${.55 * a})`); gg.addColorStop(.25, `rgba(${c[0]},${c[1]},${c[2]},${.18 * a})`); gg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); lc.fillStyle = gg; lc.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2); lc.fillStyle = `rgba(255,255,255,${.95 * a})`; lc.beginPath(); lc.arc(cx, cy, 6.5 * (1 + surv * .3), 0, 7); lc.fill(); }
    if (!alive || a < .01) { lc.fillStyle = `rgba(90,60,50,${.55 * appear * (rank < 75 ? smooth(0, .8, l - (1.15 + rank / 75 * 3.3)) : 0)})`; lc.beginPath(); lc.arc(cx, cy, 2.4, 0, 7); lc.fill(); }
  }
  lc.restore();
  lc.save(); lc.globalCompositeOperation = 'source-over';
  FX.bloom = .4; lc.restore();
  // drifting ash
  drawParticles(lc, { t }, { n: 70, seed: 51, speed: [-10, 25], size: 4, alpha: .25, col: [.7, .62, .55], comp: 'lighter' });
}
// ======================================================================= SHOT: green shoot (118.6 – 123.6)
function shotRenew(lc, t, l) {
  const u = smooth(0, 4.2, l); const up = smoother(3.4, 5.0, l);
  const env = Object.assign(palMix('ash', 'fresh', u), { sunAz: .35, sunEl: lerp(.0, .16, u), sunI: smooth(.4, 3.6, l), cover: lerp(.85, .4, u), stars: 0, sunSize: .035, exposure: lerp(.5, .95, u), ash: (1 - u) * .8, glowAmt: 0, wave: .6, windK: .02 });
  const S = { t, env, cam: { x: 0, z: 0, yaw: -.02, pitch: .10 + up * 1.25, h: 0.9 }, rays: .06 * u, ridges: [{ base: 50, amp: 110, freq: .002, seed: 3, par: .3, haze: .85 }, { base: 8, amp: 60, freq: .004, seed: 21, par: 1, haze: .7 }], fogK: .006, volcano: { x: 1550, s: .8, lean: -1 }, groundCol: [.006, .006, .005] };
  S.trees = makeTrees(97, 24, 34, 260, ['dead', 'dead', 'conifer', 'fern']); S.actors = []; S.parts = [{ n: 60, seed: 61, speed: [-6, 22], size: 4, alpha: .3 * (1 - u), col: [.62, .58, .54], comp: 'source-over' }, { n: 40, seed: 62, speed: [5, -8], size: 5, alpha: .5 * u, col: [1, .95, .7], tw: true }];
  groundOf(lc, S);
  const hy = horizonY(S);
  if (up < .95) {
    // scorched foreground bank
    const gr = lc.createLinearGradient(0, H * .8, 0, H); gr.addColorStop(0, 'rgba(6,5,4,0)'); gr.addColorStop(.4, 'rgba(6,5,4,1)'); gr.addColorStop(1, 'rgba(3,3,2,1)'); lc.fillStyle = gr;
    lc.beginPath(); lc.moveTo(0, H); lc.lineTo(0, H * .86); for (let x = 0; x <= W; x += 20) lc.lineTo(x, H * .86 + 22 * fbm1(x * .006 + 3) - 16 + (up * 900)); lc.lineTo(W, H); lc.fill();
    seedling(lc, W * .5, H * .88 + up * 900, l - .5, 1.5, 1);
    mammal(lc, W * .8, H * .93 + up * 900, 1.15, t, smooth(1.9, 2.6, l));
  }
  if (up > .05) { const c = runGL('CLOUDS', { T: t, prog: (t - 121.9) * .45, dirn: 1, tint: [1.1, .9, .7], tintD: [.5, .45, .55] }); lc.globalAlpha = smooth(.05, .7, up) * (1 - smooth(.94, 1, up)); lc.drawImage(c, 0, 0); lc.globalAlpha = 1; }
  FX.bloom = .22;
}
// ======================================================================= SHOT: our planet (123.0 – 125.9)
function shotFinal(lc, t, l) {
  const er = kf(l, [[0, .5], [2.9, .68]], smooth);
  const u = { T: t, eArc: [0, -.02, er], eRot: 2.7 + l * .05, eTilt: .35, cities: smooth(.1, 1.4, l), eSpin: 1, L: [-.85, .35, .18], ast: [9, 9, .0001, 1], astRot: 0, heat: 0, mdir: [1, 0], starAmt: 1, exposure: 1.0, drift: l * .4, bowGlow: 0, shakeUV: [0, 0] };
  lc.drawImage(runGL('SPACE', u), 0, 0); FX.bloom = .3;
}
SHOTS.push(
  { a: 97.65, b: 104.0, fn: shotImpact },
  { a: 103.4, b: 108.4, fn: shotSea, fin: .9 },
  { a: 107.8, b: 113.7, fn: shotSun, fin: .6 },
  { a: 113.0, b: 119.0, fn: shotLights, fin: 1.0 },
  { a: 118.6, b: 123.9, fn: shotRenew, fin: 1.0 },
  { a: 123.0, b: 126.0, fn: shotFinal, fin: 1.2 },
);
