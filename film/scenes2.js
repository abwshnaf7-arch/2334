// ======================================================================= helpers for 2D graphics
function strokePartial(c, pts, frac) {
  if (frac <= 0) return; const n = pts.length - 1; const f = clamp(frac) * n; const i = Math.floor(f);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k <= Math.min(i, n); k++) c.lineTo(pts[k][0], pts[k][1]);
  if (i < n) { const a = pts[i], b = pts[i + 1], r = f - i; c.lineTo(lerp(a[0], b[0], r), lerp(a[1], b[1], r)); }
  c.stroke();
}
function glowLine(c, col, w, fn) { c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.globalCompositeOperation = 'lighter'; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 16; c.lineWidth = w; fn(); c.shadowBlur = 0; c.lineWidth = w * .45; c.strokeStyle = 'rgba(255,255,255,.85)'; fn(); c.restore(); }
const everest = (bx, by, hgt, wid) => { const p = [[0, 0], [.10, -.20], [.17, -.24], [.25, -.46], [.33, -.44], [.40, -.68], [.46, -.71], [.52, -.98], [.57, -1], [.60, -.93], [.66, -.83], [.71, -.86], [.80, -.60], [.86, -.52], [.92, -.24], [1, 0]]; return p.map(q => [bx + q[0] * wid, by + q[1] * hgt]); };
function scaleGraphic(c, g, ax, ay, r) {
  // g = seconds since start of graphic.  asteroid ring, diameter arrow, Everest comparison
  const amber = 'rgba(255,196,110,.95)', cy = 'rgba(120,225,255,.9)';
  const p1 = smooth(0, 1.1, g), p2 = smooth(.7, 2.2, g), p3 = smooth(1.6, 3.2, g), p4 = smooth(2.6, 3.8, g);
  const out = 1 - smooth(6.4, 7.2, g);
  c.save(); c.globalAlpha = out;
  // ring
  const rr = r * 1.22;
  glowLine(c, amber, 2.2, () => { for (let i = 0; i < 24; i++) { const a0 = g * .25 + i / 24 * Math.PI * 2, a1 = a0 + Math.PI * 2 / 24 * .55; if (i / 24 > p1) break; c.beginPath(); c.arc(ax, ay, rr, a0, a1); c.stroke(); } });
  // corner ticks
  glowLine(c, amber, 2, () => { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const x0 = ax + Math.cos(a) * rr * 1.06, y0 = ay + Math.sin(a) * rr * 1.06, x1 = ax + Math.cos(a) * rr * 1.16, y1 = ay + Math.sin(a) * rr * 1.16; c.beginPath(); c.moveTo(x0, y0); c.lineTo(lerp(x0, x1, p1), lerp(y0, y1, p1)); c.stroke(); } });
  // diameter arrow (bottom)
  const yA = ay + rr + 46;
  glowLine(c, amber, 2.4, () => {
    c.beginPath(); c.moveTo(ax, yA); c.lineTo(ax - r * p2, yA); c.stroke(); c.beginPath(); c.moveTo(ax, yA); c.lineTo(ax + r * p2, yA); c.stroke();
    if (p2 > .98) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(ax + s * r, yA - 16); c.lineTo(ax + s * r, yA + 16); c.stroke(); c.beginPath(); c.moveTo(ax + s * r, yA); c.lineTo(ax + s * (r - 22), yA - 9); c.moveTo(ax + s * r, yA); c.lineTo(ax + s * (r - 22), yA + 9); c.stroke(); }
    // guide verticals
    c.setLineDash([5, 8]); c.globalAlpha = .5 * out; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(ax + s * r, ay + r * .2); c.lineTo(ax + s * r, yA - 20 * p2); c.stroke(); } c.setLineDash([]);
  });
  // Everest (left) on the same baseline, compared to asteroid top edge
  const baseY = ay + r, hE = 2 * r * .885, wE = hE * 1.25, bx = ax - r * 3.3;
  const pts = everest(bx, baseY, hE, wE);
  glowLine(c, cy, 2.2, () => { strokePartial(c, pts, p3); });
  glowLine(c, cy, 1.6, () => { c.beginPath(); c.moveTo(bx - 60, baseY); c.lineTo(bx - 60 + (wE + 120) * p3, baseY); c.stroke(); });
  // height guides
  if (p4 > 0) {
    const peak = pts[12] || pts[10];
    glowLine(c, amber, 1.6, () => {
      c.setLineDash([9, 8]); c.globalAlpha = out * .9;
      c.beginPath(); c.moveTo(ax - r * 1.05, ay - r); c.lineTo(lerp(ax - r * 1.05, bx + wE * .55, p4), ay - r); c.stroke();  // asteroid top line reaching Everest
      c.setLineDash([]); c.globalAlpha = out;
      // Everest height arrow
      const xa = bx + wE * .55 + 0; const yTop = baseY - hE;
      c.beginPath(); c.moveTo(xa, baseY); c.lineTo(xa, lerp(baseY, yTop, p4)); c.stroke();
      if (p4 > .95) { c.beginPath(); c.moveTo(xa - 12, yTop); c.lineTo(xa + 12, yTop); c.stroke(); }
    });
    // vertical bracket for 10 km at asteroid's left
    const xb = ax - rr - 40;
    glowLine(c, amber, 2.4, () => { c.beginPath(); c.moveTo(xb, ay); c.lineTo(xb, lerp(ay, ay - r, p4)); c.moveTo(xb, ay); c.lineTo(xb, lerp(ay, ay + r, p4)); c.stroke(); if (p4 > .95) { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(xb - 14, ay + s * r); c.lineTo(xb + 14, ay + s * r); c.stroke(); } } });
  }
  // tiny skyscraper for scale
  if (p4 > .3) glowLine(c, 'rgba(255,255,255,.8)', 1.8, () => { const x = bx + wE + 60, h = 2 * r * .083; c.beginPath(); c.moveTo(x, baseY); c.lineTo(x, baseY - h * smooth(.3, 1, p4)); c.stroke(); c.beginPath(); c.moveTo(x + 8, baseY); c.lineTo(x + 8, baseY - h * .6 * smooth(.3, 1, p4)); c.stroke(); });
  c.restore();
}
function speedLines(c, t, amt, dirx, diry, seed) {
  if (amt < .01) return; c.save(); c.globalCompositeOperation = 'lighter';
  const nx = -diry, ny = dirx;
  for (let i = 0; i < 90; i++) {
    const r1 = hash(i * 1.7 + seed), r2 = hash(i * 3.3 + seed), r3 = hash(i * 5.9 + seed);
    const off = (r1 - .5) * 2400, pos = ((r2 + t * (.5 + r3) * (.6 + amt * 2)) % 1) * 3400 - 1300;
    const cx = W / 2 + nx * off + dirx * pos, cy = H / 2 + ny * off + diry * pos, len = (80 + 520 * r3) * amt;
    const g = c.createLinearGradient(cx, cy, cx - dirx * len, cy - diry * len); g.addColorStop(0, `rgba(190,215,255,${.55 * amt * r3})`); g.addColorStop(1, 'rgba(190,215,255,0)');
    c.strokeStyle = g; c.lineWidth = 1 + r3 * 1.8; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - dirx * len, cy - diry * len); c.stroke();
  }
  c.restore();
}
function plasmaTrail(c, ax, ay, dirx, diry, len, w, heat, t) {
  if (heat < .01) return; c.save(); c.globalCompositeOperation = 'lighter';
  const bx = ax - dirx * len, by = ay - diry * len;
  for (let k = 0; k < 3; k++) {
    const ww = w * (1.6 - k * .5), g = c.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, k === 2 ? `rgba(255,245,225,${.95 * heat})` : k === 1 ? `rgba(255,190,90,${.6 * heat})` : `rgba(255,90,20,${.35 * heat})`); g.addColorStop(.35, k === 2 ? `rgba(255,190,110,${.4 * heat})` : `rgba(255,90,20,${.28 * heat})`); g.addColorStop(1, 'rgba(255,60,10,0)');
    c.strokeStyle = g; c.lineCap = 'round'; c.lineWidth = ww;
    c.beginPath(); c.moveTo(ax, ay);
    const n = 24; for (let i = 1; i <= n; i++) { const s = i / n, wob = Math.sin(s * 14 - t * 20 + k) * ww * .15 * s + (noise1(s * 8 + t * 6 + k * 3) - .5) * ww * .4 * s; c.lineTo(ax - dirx * len * s - diry * wob, ay - diry * len * s + dirx * wob); }
    c.stroke();
  }
  // sparks
  for (let i = 0; i < 46; i++) { const s = (hash(i * 3.1) + t * (.7 + hash(i)) * 1.5) % 1, off = (hash(i * 7.7) - .5) * w * 2.4 * (0.3 + s); const x = ax - dirx * len * s * .9 - diry * off, y = ay - diry * len * s * .9 + dirx * off; const a = (1 - s) * heat; const g = c.createRadialGradient(x, y, 0, x, y, 6); g.addColorStop(0, `rgba(255,${180 + 60 * (1 - s) | 0},90,${a})`); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.fillRect(x - 6, y - 6, 12, 12); }
  c.restore();
}
// ======================================================================= SHOT: space – the asteroid emerges (38.2 – 50.8)
function shotSpace1(lc, t, l) {
  const ar = kf(l, [[0, .0018], [4, .005], [7, .028], [9.4, .10], [12.6, .24]], smooth), ax = kf(l, [[0, .86], [6, .55], [12.6, .19]], smooth), ay = kf(l, [[0, .32], [6, .25], [12.6, .08]], smooth);
  const u = { T: t, eArc: [-.45 - l * .008, -1.32, 1.12], eRot: 1.1 + l * .02, eTilt: .35, cities: 0, eSpin: 1, L: [.95, .32, .25], ast: [ax, ay, ar, 3.7], astRot: l * .28, heat: 0, mdir: [-1, -.2], starAmt: 1, exposure: 1.0, drift: l * .6, bowGlow: 1.5, shakeUV: [0, 0] };
  lc.drawImage(runGL('SPACE', u), 0, 0);
  const g = l - 4.9;
  if (g > 0) scaleGraphic(lc, g, W / 2 + ax * H, H / 2 - ay * H, ar * H);
  // fade in from the cloud rush
  FX.bloom = .22;
}
// ======================================================================= SHOT: speed – the fall (50.2 – 60.0)
function shotSpeed(lc, t, l) {
  const s = l / 7.95; const P0 = [.9, .58], P1 = [-.06, -.015]; const d = [P1[0] - P0[0], P1[1] - P0[1]]; const dl = Math.hypot(d[0], d[1]); const dir = [d[0] / dl, d[1] / dl];
  const e = s < 1 ? Math.pow(s, 1.9) : 1 + (s - 1) * 2.4; // accelerating, then plunging
  let ax = P0[0] + d[0] * e, ay = P0[1] + d[1] * e;
  const ar = kf(l, [[0, .08], [7.95, .062], [9.7, .04]], smooth);
  const heat = kf(l, [[0, 0], [6.4, 0], [7.5, .45], [8.1, 1], [9.8, 1]], smooth);
  const shk = smooth(4, 9.6, l);
  const u = { T: t, eArc: [-.1, -1.74, 1.72], eRot: 2.1, eTilt: .3, cities: 0, eSpin: 1, L: [.55, .75, .35], ast: [ax, ay, ar, 3.7], astRot: l * .9, heat, mdir: [dir[0], dir[1]], starAmt: 1, exposure: .55, drift: l * 2.5, bowGlow: 2, shakeUV: [0, 0] };
  lc.drawImage(runGL('SPACE', u), 0, 0);
  const apx = W / 2 + ax * H, apy = H / 2 - ay * H, dx = dir[0], dy = -dir[1];
  // targeting reticle / trajectory
  const reticle = smooth(1, 2, l) * (1 - smooth(7.6, 8.1, l));
  if (reticle > 0) {
    const cxp = W / 2 + P1[0] * H, cyp = H / 2 - P1[1] * H;
    glowLine(lc, 'rgba(255,196,110,.9)', 2, () => { lc.globalAlpha = reticle; lc.setLineDash([12, 12]); lc.lineDashOffset = -t * 40; lc.beginPath(); lc.moveTo(apx, apy); lc.lineTo(cxp, cyp); lc.stroke(); lc.setLineDash([]); const rr = 46 + Math.sin(t * 6) * 4; lc.beginPath(); lc.arc(cxp, cyp, rr, 0, 7); lc.stroke(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; lc.beginPath(); lc.moveTo(cxp + Math.cos(a) * (rr + 8), cyp + Math.sin(a) * (rr + 8)); lc.lineTo(cxp + Math.cos(a) * (rr + 28), cyp + Math.sin(a) * (rr + 28)); lc.stroke(); } lc.globalAlpha = 1; });
  }
  speedLines(lc, t, smooth(.5, 5.5, l) * .9, dx, dy, 3);
  plasmaTrail(lc, apx, apy, dx, dy, 120 + heat * 1100, ar * H * 1.15, heat, t);
  // atmosphere ignition at contact
  const ig = smooth(7.9, 8.3, l) * (1 - smooth(8.3, 11, l) * .0);
  if (ig > 0) {
    const cxp = W / 2 + P1[0] * H, cyp = H / 2 - P1[1] * H; lc.save(); lc.globalCompositeOperation = 'lighter';
    const rr = 200 + (l - 7.95) * 700; const gg = lc.createRadialGradient(cxp, cyp, 0, cxp, cyp, rr); gg.addColorStop(0, `rgba(255,235,200,${.9 * Math.exp(-(l - 7.95) * .9)})`); gg.addColorStop(.3, `rgba(255,150,60,${.5 * ig})`); gg.addColorStop(1, 'rgba(255,80,20,0)'); lc.fillStyle = gg; lc.fillRect(0, 0, W, H);
    // shock ring along limb
    lc.strokeStyle = `rgba(255,220,170,${.7 * Math.exp(-(l - 7.95) * .9)})`; lc.lineWidth = 3; lc.beginPath(); lc.ellipse(cxp, cyp, (l - 7.95) * 620, (l - 7.95) * 180, -.12, 0, 7); lc.stroke();
    lc.restore();
  }
  FX.shake = Math.max(FX.shake, shk * 12); FX.bloom = .3;
  if (l > 7.95 && l < 8.35) FX.flash = Math.max(FX.flash, .55 * (1 - (l - 7.95) / .4));
}
SHOTS.push(
  { a: 38.2, b: 50.8, fn: shotSpace1, fin: 1.2 },
  { a: 50.2, b: 60.0, fn: shotSpeed, fin: .5 },
);
