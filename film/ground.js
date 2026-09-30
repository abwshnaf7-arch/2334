// Ground-level world engine: sky/water (GL) + ridges, banks, trees, creatures, fx (2D). Everything is a function of the spec.
const FOVZ = 1.15, FH = FOVZ * H;
const PAL = {
  night:  { zen: [.003, .005, .016], hor: [.02, .03, .07], sun: [.4, .5, 1], cL: [.05, .07, .14], cD: [.01, .015, .04] },
  dawn:   { zen: [.03, .08, .26], hor: [1.05, .40, .13], sun: [1.9, .85, .38], cL: [1.35, .55, .25], cD: [.10, .08, .18] },
  morning:{ zen: [.06, .18, .5], hor: [.95, .66, .46], sun: [1.9, 1.25, .75], cL: [1.2, .95, .8], cD: [.25, .27, .4] },
  day:    { zen: [.05, .22, .6], hor: [.62, .77, .95], sun: [2, 1.6, 1.2], cL: [1.35, 1.32, 1.3], cD: [.38, .44, .58] },
  warn:   { zen: [.07, .10, .22], hor: [1.0, .62, .36], sun: [2, 1.3, .7], cL: [1.1, .8, .55], cD: [.25, .2, .3], glow: [0, 0, 0] },
  fire:   { zen: [.035, .012, .008], hor: [.85, .24, .05], sun: [2, 1.2, .6], cL: [1.1, .38, .1], cD: [.05, .018, .012], glow: [.45, .13, .03] },
  white:  { zen: [.35, .16, .08], hor: [1.5, .8, .35], sun: [3, 2.5, 2], cL: [1.6, .9, .45], cD: [.4, .16, .07], glow: [.9, .5, .2] },
  ash:    { zen: [.025, .024, .027], hor: [.16, .125, .10], sun: [.7, .3, .12], cL: [.20, .16, .13], cD: [.03, .028, .03], glow: [.15, .05, .02] },
  dusk:   { zen: [.02, .03, .08], hor: [.45, .2, .13], sun: [1.2, .45, .2], cL: [.5, .28, .22], cD: [.05, .05, .09], glow: [.1, .03, .01] },
  fresh:  { zen: [.06, .2, .55], hor: [1.05, .7, .42], sun: [2, 1.25, .65], cL: [1.25, .95, .72], cD: [.27, .3, .42], glow: [0, 0, 0] },
};
function palMix(a, b, u) { const A = PAL[a], B = PAL[b], o = {}; for (const k of ['zen', 'hor', 'sun', 'cL', 'cD']) o[k] = mix3(A[k], B[k], u); o.glow = mix3(A.glow || [0, 0, 0], B.glow || [0, 0, 0], u); return o; }

// world-direction -> screen
function dirToScreen(S, D) {
  const cy = Math.cos(S.cam.yaw), sy = Math.sin(S.cam.yaw), cp = Math.cos(S.cam.pitch), sp = Math.sin(S.cam.pitch);
  const cx = D[0] * cy - D[2] * sy, cz = D[0] * sy + D[2] * cy;
  const ay = D[1] * cp - cz * sp, az = D[1] * sp + cz * cp;
  if (az <= .01) return null;
  return [W / 2 + cx / az * FH, H / 2 - ay / az * FH, az];
}
const sph = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
const horizonY = S => H / 2 + FH * Math.tan(S.cam.pitch);
function proj(S, wx, wy, wz) {
  const x0 = wx - S.cam.x, z0 = wz - S.cam.z; const cy = Math.cos(S.cam.yaw), sy = Math.sin(S.cam.yaw);
  const x = x0 * cy - z0 * sy, z = x0 * sy + z0 * cy; if (z < 1) return null;
  return [W / 2 + FH * x / z, horizonY(S) + FH * (S.cam.h - wy) / z, FH / z];
}
function skyUniforms(S) {
  const e = S.env, sd = sph(e.sunAz, e.sunEl); S.sunDir = sd;
  const u = {
    T: S.t, pitch: S.cam.pitch, yaw: S.cam.yaw, fovZ: FOVZ, cZen: e.zen, cHor: e.hor, cSun: e.sun, cGlow: e.glow || [0, 0, 0], cCloudL: e.cL, cCloudD: e.cD,
    sunDir: sd, sunSize: e.sunSize ?? .028, sunI: e.sunI ?? 1, cover: e.cover ?? .5, wind: S.t * (e.windK ?? .012) + (e.windOff || 0), starAmt: e.stars || 0, glowAmt: e.glowAmt || 0,
    ash: e.ash || 0, dark: e.dark ?? 1, water: 1, waveAmp: e.wave ?? 1.5, camH: S.cam.h, exposure: e.exposure ?? 1, flash: S.flash || 0,
    fbDir: [0, 1, 0], fbTrail: [1, 1, 0], fbSize: .01, fbI: 0, trailLen: .3, trailW: 1.4,
  };
  if (S.fire) {
    const f = S.fire; const d = sph(f.az, f.el); const tr = sph(f.az - f.vaz, f.el - f.vel);
    u.fbDir = d; u.fbTrail = tr; u.fbSize = f.size; u.fbI = f.I; u.trailLen = f.len; u.trailW = f.w ?? 1.4;
  }
  return u;
}
// ridge silhouettes
function ridgePath(ctx, S, base, amp, freq, seed, par, y0) {
  const off = S.cam.x * par + S.cam.yaw * 900;
  ctx.beginPath(); ctx.moveTo(-10, y0);
  for (let x = -10; x <= W + 10; x += 6) {
    const xx = (x + off) * freq;
    const hgt = base + amp * (fbm1(xx + seed, 5) - .35) * (1 + .6 * Math.sin(xx * .3 + seed));
    ctx.lineTo(x, y0 - hgt);
  }
  ctx.lineTo(W + 10, y0); ctx.closePath();
}
function drawRidges(ctx, S, mirror) {
  const hy = horizonY(S), e = S.env;
  const layers = S.ridges || [];
  for (const L of layers) {
    ctx.save();
    if (mirror) { ctx.translate(0, 2 * hy); ctx.scale(1, -1); }
    ridgePath(ctx, S, L.base * (S.ridgeScale || 1), L.amp, L.freq, L.seed, L.par, hy + 1);
    const c = mix3(S.ground, e.hor, L.haze);
    ctx.fillStyle = css(c.map(v => v), 1); ctx.fill();
    ctx.restore();
  }
}
function drawVolcano(ctx, S) {
  const v = S.volcano; if (!v) return;
  const hy = horizonY(S); const x = v.x - S.cam.yaw * 900 - S.cam.x * .3, s = v.s || 1;
  ctx.save(); ctx.translate(x, hy + 2);
  const c = mix3(S.ground, S.env.hor, .5);
  ctx.fillStyle = css(c, 1);
  ctx.beginPath(); ctx.moveTo(-330 * s, 0); ctx.bezierCurveTo(-180 * s, -20 * s, -90 * s, -150 * s, -46 * s, -205 * s); ctx.lineTo(-18 * s, -214 * s); ctx.lineTo(20 * s, -208 * s);
  ctx.lineTo(50 * s, -200 * s); ctx.bezierCurveTo(100 * s, -140 * s, 190 * s, -30 * s, 340 * s, 0); ctx.closePath(); ctx.fill();
  // smoke plume
  const t = S.t; const n = 26;
  for (let i = 0; i < n; i++) {
    const k = i / n, ph = (k + t * .012) % 1, yy = -210 * s - ph * 420 * s, xx = 6 * s + Math.sin(ph * 5 + i) * 24 * s + ph * 160 * s * (v.lean ?? 1);
    const r = (18 + ph * 90) * s, a = (1 - ph) * .5;
    const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
    const pc = mix3(S.env.hor, [.1, .1, .12], .45 + ph * .4);
    g.addColorStop(0, css(pc, a)); g.addColorStop(1, css(pc, 0)); ctx.fillStyle = g; ctx.fillRect(xx - r, yy - r, 2 * r, 2 * r);
  }
  if (v.glow) { const g = ctx.createRadialGradient(6 * s, -205 * s, 0, 6 * s, -205 * s, 90 * s); g.addColorStop(0, `rgba(255,140,40,${v.glow})`); g.addColorStop(1, 'rgba(255,90,10,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(-100 * s, -300 * s, 200 * s, 200 * s); }
  ctx.restore();
}
// ---- flora
function drawFrond(c, len, curl, droop, leaf, wid, sway) {
  // frond: arched spine with leaflets. drawn from origin outward.
  const pts = []; const N = len > 300 ? 34 : 18;
  for (let i = 0; i <= N; i++) { const t = i / N; const a = curl * t + sway * t * t; pts.push([Math.cos(-a) * t * len * .9 * (1 - t * .1) + t * t * 0, -Math.sin(a) * t * len * .55 + t * t * t * droop * len]); }
  c.lineWidth = wid * 1.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= N; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
  if (leaf > 0) {
    c.lineWidth = wid * (len > 300 ? .9 : .55);
    c.beginPath();
    for (let i = 2; i < N; i++) {
      const p = pts[i], q = pts[i + 1]; let dx = q[0] - p[0], dy = q[1] - p[1]; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const t = i / N; const L = leaf * Math.sin(Math.PI * Math.min(1, t * 1.05)) * len * .17 + 2;
      c.moveTo(p[0], p[1]); c.lineTo(p[0] + (-dy * .9 + dx * .5) * L, p[1] + (dx * .9 + dy * .5) * L + L * .25);
      c.moveTo(p[0], p[1]); c.lineTo(p[0] + (dy * .9 + dx * .5) * L, p[1] + (-dx * .9 + dy * .5) * L + L * .25);
    }
    c.stroke();
  }
}
function drawTreeFern(c, s, seed, time, detail) {
  c.save(); c.scale(s, s);
  const sw = Math.sin(time * .8 + seed * 5) * .06;
  tube(c, bezPts([0, 0], [8, -80], [-6, -160], [sw * 200, -230], 10), 9, 6);
  c.translate(sw * 200, -232); c.lineJoin = 'round';
  const nf = 11;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + seed; const cs = Math.cos(a);
    c.save(); c.scale(cs >= 0 ? 1 : -1, 1); const foreshort = Math.abs(cs) * .8 + .2;
    c.rotate(Math.sin(a) * .5);
    drawFrond(c, 150 * (.6 + .4 * foreshort), .9, .55 + .15 * Math.sin(a), detail ? 1 : 0, 3.2, sw * 4);
    c.restore();
  }
  c.restore();
}
function drawConifer(c, s, seed, time) {
  c.save(); c.scale(s, s); const sw = Math.sin(time * .6 + seed * 7) * 2.5;
  const th = 260 + 160 * hash(seed);
  c.beginPath(); c.moveTo(-9, 0); c.lineTo(-4 + sw * .5, -th); c.lineTo(4 + sw * .5, -th); c.lineTo(9, 0); c.closePath(); c.fill();
  const tiers = 9 + Math.floor(hash(seed + 3) * 4);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1); const y = -th * (.42 + .56 * t); const r = (95 - 70 * t) * (.8 + .4 * hash(seed + i));
    const x0 = sw * t;
    c.beginPath(); c.moveTo(x0 - r, y + 26); c.quadraticCurveTo(x0 - r * .45, y - 4, x0, y - 14); c.quadraticCurveTo(x0 + r * .45, y - 4, x0 + r, y + 26);
    c.quadraticCurveTo(x0, y + 8, x0 - r, y + 26); c.fill();
  }
  c.restore();
}
function drawCycad(c, s, seed, time) {
  c.save(); c.scale(s, s); tube(c, [[0, 0], [2, -46]], 15, 11);
  c.translate(0, -46); const sw = Math.sin(time * .9 + seed * 5) * .05;
  for (let i = 0; i < 14; i++) { const a = -Math.PI * .95 + i / 13 * Math.PI * .9; c.save(); c.rotate(a + Math.PI * .5 + sw); c.scale(1, 1); drawFrond(c, 120, .55, .5, 1, 2.5, sw * 2); c.restore(); }
  c.restore();
}
function drawDead(c, s, seed) {
  c.save(); c.scale(s, s); c.lineCap = 'round';
  const h = 200 + 140 * hash(seed); c.lineWidth = 12; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10 * (hash(seed + 1) - .5), -h * .5, 3, -h); c.stroke();
  for (let i = 0; i < 7; i++) { const y = -h * (.35 + .11 * i), d = (i % 2 ? 1 : -1), L = 70 + 60 * hash(seed + i); c.lineWidth = 7 - i * .6; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(d * L * .5, y - L * .3, d * L, y - L * .55); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(d * L * .6, y - L * .34); c.lineTo(d * L * .8, y - L * .8); c.stroke(); }
  c.restore();
}
// shores
const shoreL = z => -24 - 9 * Math.sin(z * .021 + 1) - z * .06;
const shoreR = z => 30 + 11 * Math.sin(z * .017) + z * .05;
function drawBank(ctx, S, side) {
  const pts = [];
  for (let z = 6; z <= 700; z *= 1.045) { const x = side < 0 ? shoreL(z) : shoreR(z); const p = proj(S, x, .0, z + S.cam.z); if (p) pts.push([p[0], p[1], z]); }
  if (!pts.length) return;
  // far -> near
  const far = pts[pts.length - 1];
  ctx.beginPath(); ctx.moveTo(side < 0 ? -200 : W + 200, far[1] - 1);
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1]);
  const near = pts[0]; ctx.lineTo(near[0] + (side < 0 ? -700 : 700), near[1] + 400); ctx.lineTo(side < 0 ? -200 : W + 200, H + 300); ctx.closePath();
  const g = ctx.createLinearGradient(0, horizonY(S), 0, H);
  g.addColorStop(0, css(mix3(S.ground, S.env.hor, .55), 1)); g.addColorStop(.25, css(mix3(S.ground, S.env.hor, .18), 1)); g.addColorStop(1, css(S.groundNear || S.ground, 1));
  ctx.fillStyle = g; ctx.fill();
  // bank rim (wet edge glint)
  if (S.env.sunI > .05) { ctx.strokeStyle = css(S.env.sun, .18 * (S.env.sunI)); ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke(); }
}
function fogAt(S, z) { return 1 - Math.exp(-z * (S.fogK ?? .0075)); }

// particles (dust, pollen, embers, ash) – pure function of t
function drawParticles(ctx, S, spec) {
  const n = spec.n, t = S.t; ctx.save(); ctx.globalCompositeOperation = spec.comp || 'lighter';
  for (let i = 0; i < n; i++) {
    const r1 = hash(i * 3.1 + spec.seed), r2 = hash(i * 7.7 + spec.seed), r3 = hash(i * 5.3 + spec.seed), r4 = hash(i * 11.9 + spec.seed);
    const sp = spec.speed;
    let x = ((r1 * W + t * sp[0] * (.5 + r3) + Math.sin(t * .7 + r4 * 9) * 30) % (W + 100) + W + 100) % (W + 100) - 50;
    let y = ((r2 * H + t * sp[1] * (.5 + r4) + Math.cos(t * .9 + r1 * 9) * 20) % (H + 100) + H + 100) % (H + 100) - 50;
    const sz = spec.size * (.4 + r4 * 1.2) * (spec.pulse ? (.6 + .4 * Math.sin(t * 3 + r1 * 20)) : 1);
    const a = spec.alpha * (.3 + .7 * r3) * (spec.tw ? (.5 + .5 * Math.sin(t * 2 + r2 * 30)) : 1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, sz);
    g.addColorStop(0, rgbaS(spec.col, a)); g.addColorStop(1, rgbaS(spec.col, 0)); ctx.fillStyle = g; ctx.fillRect(x - sz, y - sz, sz * 2, sz * 2);
  }
  ctx.restore();
}
function drawSunFx(ctx, S) {
  const e = S.env; if ((e.sunI ?? 1) < .02) return; const p = dirToScreen(S, S.sunDir); if (!p) return;
  const [sx, sy] = p; const vis = (S.sunVis ?? 1) * e.sunI; if (vis < .02) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // god rays
  const nR = 46, R0 = 60, RL = 1900;
  for (let i = 0; i < nR; i++) {
    const a = (i / nR) * Math.PI * 2 + hash(i) * .1, w = .014 + .03 * hash(i + 4);
    const amp = (S.rays ?? .05) * vis * (.35 + .65 * noise1(i * 1.7 + S.t * .25)) * (sy > H * .9 ? 0 : 1);
    const g = ctx.createRadialGradient(sx, sy, R0, sx, sy, RL); g.addColorStop(0, css(e.sun, amp * .5, .6)); g.addColorStop(1, css(e.sun, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - w) * RL, sy + Math.sin(a - w) * RL); ctx.lineTo(sx + Math.cos(a + w) * RL, sy + Math.sin(a + w) * RL); ctx.closePath(); ctx.fill();
  }
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 520 * (S.sunGlowK ?? 1)); g.addColorStop(0, css(e.sun, .30 * vis, .3)); g.addColorStop(.25, css(e.sun, .08 * vis, .3)); g.addColorStop(1, css(e.sun, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // anamorphic streak
  if (S.streak ?? 1) { const gs = ctx.createLinearGradient(sx - 900, 0, sx + 900, 0); gs.addColorStop(0, css(e.sun, 0)); gs.addColorStop(.5, css(e.sun, .22 * vis, .4)); gs.addColorStop(1, css(e.sun, 0)); ctx.fillStyle = gs; ctx.fillRect(sx - 900, sy - 2.5, 1800, 5); }
  // lens ghosts
  for (let i = 1; i <= 4; i++) { const k = i * .42 - .3; const gx = lerp(sx, W - sx, k), gy = lerp(sy, H - sy, k), r = 26 + i * 22; const gg = ctx.createRadialGradient(gx, gy, r * .5, gx, gy, r); gg.addColorStop(0, css(e.sun, 0)); gg.addColorStop(.8, css(e.sun, .05 * vis, .5)); gg.addColorStop(1, css(e.sun, 0)); ctx.fillStyle = gg; ctx.fillRect(gx - r, gy - r, 2 * r, 2 * r); }
  ctx.restore();
}
function drawFireGlowOnScene(ctx, S) {
  // warm light from fireball onto silhouettes' facing sides (screen overlay)
  if (!S.fire) return; const p = dirToScreen(S, sph(S.fire.az, S.fire.el)); if (!p) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = 900 * S.fire.I * (S.fire.glowK ?? 1); const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
  g.addColorStop(0, `rgba(255,170,80,${.28 * Math.min(1, S.fire.I)})`); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ---- main ground renderer
function renderGround(ctx, S) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // ground colour derived from environment
  const e = S.env; const amb = mix3(e.zen, e.hor, .3);
  S.ground = S.groundCol || [amb[0] * .022 + .001, amb[1] * .026 + .002, amb[2] * .02 + .002];
  S.groundNear = S.groundNearCol || [S.ground[0] * .5, S.ground[1] * .5, S.ground[2] * .45];
  ctx.drawImage(runGL('SKY', skyUniforms(S)), 0, 0);
  const hy = horizonY(S);
  drawSunFx(ctx, S);
  drawVolcano(ctx, S);
  drawRidges(ctx, S, false);
  // reflection of ridges in water
  ctx.save(); ctx.beginPath(); ctx.rect(0, hy, W, H - hy); ctx.clip(); ctx.globalAlpha = .34; drawRidges(ctx, S, true); ctx.restore();
  drawBank(ctx, S, -1); drawBank(ctx, S, 1);
  // gather drawables
  const items = [];
  const cz = S.cam.z;
  for (const tr of (S.trees || [])) {
    const wz = tr.z; const p = proj(S, tr.x + (tr.x < 0 ? 0 : 0), .3, wz); if (!p) continue;
    items.push({ z: wz - cz, draw: () => {
      const p = proj(S, tr.x, .3, wz); if (!p) return; const fg = fogAt(S, wz - cz);
      const c = mix3(S.ground, e.hor, fg * .85); ctx.fillStyle = css(c, 1); ctx.strokeStyle = css(c, 1);
      ctx.save(); ctx.translate(p[0], p[1]); const sc = p[2] / 26 * tr.s;
      if (tr.k === 'dead') drawDead(ctx, sc, tr.seed); else if (tr.k === 'conifer') drawConifer(ctx, sc, tr.seed, S.t); else if (tr.k === 'fern') drawTreeFern(ctx, sc, tr.seed, S.t, sc > .55); else drawCycad(ctx, sc * 1.4, tr.seed, S.t);
      ctx.restore();
    } });
  }
  for (const a of (S.actors || [])) {
    const wz = a.z; const p0 = proj(S, a.x, 0, wz); if (!p0) continue;
    items.push({ z: wz - cz, draw: () => {
      const p = proj(S, a.x, 0, wz); if (!p) return; const zz = wz - cz; const sc = p[2] / (a.unit || 30) * (a.s || 1);
      const fg = fogAt(S, zz);
      const hc = e.hor.map(v => Math.min(v, .55)); const base = mix3(S.ground, hc, fg * .38).map(v => v * (a.dark ?? 1));
      const top = mix3(base, hc, .12);
      const common = { phase: a.phase ?? (S.t * (a.spd ?? 1.6) + a.seed * 5), time: S.t, seed: a.seed, walk: a.walk ?? 1, head: a.head, roar: a.roar, crest: 1,
        colour: css(base, 1), top: css(top, 1), rim: (S.rimAmt ?? .8) * clamp(1 - fg * 1.3), rimCol: css(mix3(e.sun, S.fire ? [2, .9, .35] : e.sun, S.fire ? .6 : 0), 1, .8), rimDir: S.rimDir || [1, -.4], fog: 0, fogCol: css(e.hor, 1) };
      if (a.water !== false) drawCreature(ctx, a.k, Object.assign({}, common, { x: p[0], y: p[1] + 2, s: sc, flip: a.flip, flipY: true, alpha: .24 * (S.reflect ?? 1), rim: 0, colour: css(mix3(base, e.hor, .3), 1), top: css(mix3(base, e.hor, .4), 1) }));
      drawCreature(ctx, a.k, Object.assign({}, common, { x: p[0], y: p[1], s: sc, flip: a.flip }));
      // water ripples at feet
      if (a.water !== false) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = css(e.hor, .22 * (1 - fg), .8); ctx.lineWidth = Math.max(1, sc * 2.4);
        for (let k = 0; k < 2; k++) { const ph = (S.t * .5 + k * .5 + a.seed) % 1; ctx.beginPath(); ctx.ellipse(p[0] + (a.flip ? -1 : 1) * 10 * sc, p[1] + 4 * sc, (60 + ph * 190) * sc, (7 + ph * 26) * sc, 0, 0, 7); ctx.globalAlpha = (1 - ph) * .8; ctx.stroke(); } ctx.restore(); }
    } });
  }
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.draw();
  // fireball light spill
  drawFireGlowOnScene(ctx, S);
  // sky creatures (screen-space paths, drawn over bank, under foreground)
  for (const f of (S.fliers || [])) {
    const p = f.pos(S.t); if (!p) continue;
    const c = mix3(S.ground, e.hor, .15 + (f.haze ?? .3));
    drawCreature(ctx, 'ptero', { x: p[0], y: p[1], s: f.s, flip: p[2] < 0, time: S.t + f.off, seed: f.seed, crest: 1, phase: 0, colour: css(c, 1), top: css(c, 1), rim: .7, rimCol: css(e.sun, 1, .8), rimDir: [1, -.5], fog: 0, alpha: f.a ?? 1 });
  }
  // foreground fronds
  if (S.fgFronds) {
    const c = S.fgCol || [.004, .006, .004]; ctx.strokeStyle = css(c, 1); ctx.fillStyle = css(c, 1);
    for (const f of S.fgFronds) {
      ctx.save(); ctx.translate(f.x + Math.sin(S.t * .6 + f.seed) * 6 - S.cam.x * (f.par ?? 12), f.y); ctx.rotate(f.rot + Math.sin(S.t * .5 + f.seed * 3) * .025);
      if (f.flip) ctx.scale(-1, 1); drawFrond(ctx, f.len, f.curl ?? 1.0, f.droop ?? .6, 1, f.wid ?? 6, Math.sin(S.t * .7 + f.seed) * .12); ctx.restore();
    }
  }
  if (S.parts) for (const p of S.parts) drawParticles(ctx, S, p);
}
// standard tree scatter (deterministic)
function makeTrees(seed, n, zmin, zmax, kinds) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const z = zmin * Math.pow(zmax / zmin, r()); const side = r() < .5 ? -1 : 1;
    const shore = side < 0 ? shoreL(z) : shoreR(z);
    out.push({ z, x: shore + side * (2 + r() * 55 * (z / 150 + .3)), s: .75 + r() * .7, seed: r() * 100, k: kinds[Math.floor(r() * kinds.length)] });
  }
  return out;
}
