// Procedural dinosaur silhouettes (facing +x, feet at y=0, up = -y). All poses are pure functions of phase/params.
const SPR = mkCanvas(1500, 1100), SPRc = SPR.getContext('2d');
const SPR2 = mkCanvas(1500, 1100), SPR2c = SPR2.getContext('2d');

function brachioShape(c, o) {
  const ph = o.phase, hu = o.head ?? .5, sw = Math.sin(o.time * .7 + o.seed * 3) * 14;
  const legs = [[118, 0], [62, Math.PI], [-98, Math.PI * .5], [-146, Math.PI * 1.5]];
  const hipY = -215;
  for (let i = 0; i < 4; i++) {
    const [hx, off] = legs[i]; const p = ph + off; const len = i < 2 ? 232 : 205;
    const fx = hx + Math.sin(p) * 46, lift = Math.max(0, Math.cos(p)) * 22 * (o.walk ?? 1);
    const fy = 0 - lift; const kx = (hx + fx) / 2 + 12, ky = (hipY + fy) / 2;
    tube(c, [[hx, hipY], [kx, ky], [fx, fy - 8]], 44, 25);
    ell(c, fx + 10, fy - 6, 38, 15);
  }
  c.save(); c.translate(0, -262); c.rotate(-.11); ell(c, 0, 0, 205, 104); c.restore();
  const N0 = [150, -312], N1 = [235, -395], N2 = [255 + sw * .4, -540 - 60 * hu], N3 = [330 + sw, -590 - 150 * hu];
  tube(c, bezPts(N0, N1, N2, N3, 26), 62, 17);
  const hx = N3[0], hy = N3[1];
  c.save(); c.translate(hx, hy); c.rotate(.28 + (hu - .5) * .3); ell(c, 22, 0, 52, 23); ell(c, 62, 6, 20, 15); c.restore();
  const T0 = [-175, -278], T1 = [-330, -262], T2 = [-470, -190 + sw * .5], T3 = [-660, -130 + sw * 1.4];
  tube(c, bezPts(T0, T1, T2, T3, 26), 70, 3);
}
function triShape(c, o) {
  const ph = o.phase;
  for (let i = 0; i < 4; i++) {
    const hx = i < 2 ? 105 - i * 26 : -105 - (i - 2) * 26, p = ph + (i % 2) * Math.PI + (i > 1 ? Math.PI : 0);
    const fx = hx + Math.sin(p) * 26, lift = Math.max(0, Math.cos(p)) * 14 * (o.walk ?? 1);
    tube(c, [[hx, -105], [(hx + fx) / 2 + 6, -60], [fx, -lift - 4]], 34, 22); ell(c, fx + 8, -lift - 5, 30, 12);
  }
  c.save(); c.translate(0, -150); c.rotate(-.04); ell(c, 0, 0, 185, 95); c.restore();
  tube(c, bezPts([-150, -170], [-260, -150], [-320, -110], [-400, -60], 12), 48, 3);
  // head + frill + horns
  c.save(); c.translate(210, -160 + (o.head ?? 0) * 0); c.rotate(.15);
  ell(c, 0, 0, 62, 44); ell(c, 62, 10, 44, 28); // skull & snout
  poly(c, [[70, 24], [112, 30], [96, 46], [64, 44]]);
  // frill
  c.save(); c.translate(-38, -30); c.rotate(-.5); ell(c, 0, 0, 75, 108); c.restore();
  for (let k = 0; k < 9; k++) { const a = -2.6 + k * .28; poly(c, [[-38 + Math.cos(a - .1) * 100, -30 + Math.sin(a - .1) * 118], [-38 + Math.cos(a) * 130, -30 + Math.sin(a) * 146], [-38 + Math.cos(a + .1) * 100, -30 + Math.sin(a + .1) * 118]]); }
  poly(c, [[38, -30], [150, -132], [62, -14]]); poly(c, [[10, -34], [104, -170], [40, -18]]);
  poly(c, [[88, -6], [124, -46], [104, 8]]);
  c.restore();
}
function trexShape(c, o) {
  const ph = o.phase, roar = o.roar ?? 0, wk = o.walk ?? 1;
  const legs = [[-28, 0], [8, Math.PI]];
  for (const [hx, off] of legs) {
    const p = ph + off, s = Math.sin(p), lift = Math.max(0, Math.cos(p)) * 34 * wk;
    const hip = [hx, -318], knee = [hx + 96 + s * 30 * wk, -205], ank = [hx - 6 + s * 62 * wk, -88 - lift], foot = [hx + 52 + s * 62 * wk, -lift];
    tube(c, [hip, knee], 62, 40); tube(c, [knee, ank], 38, 20); tube(c, [ank, foot], 22, 15);
    poly(c, [[foot[0] - 6, foot[1] - 18], [foot[0] + 70, foot[1] - 2], [foot[0] + 60, foot[1] + 4], [foot[0] - 10, foot[1] + 4]]);
  }
  c.save(); c.translate(0, -345); c.rotate(-.22); ell(c, 0, 0, 205, 112); c.restore();
  const tb = Math.sin(o.time * .9) * 8;
  tube(c, bezPts([-170, -335], [-330, -395], [-500, -360 + tb], [-700, -300 + tb * 2], 24), 76, 3);
  const h0 = [140, -415], h1 = [190, -470 - roar * 25], h2 = [225, -500 - roar * 35];
  tube(c, [h0, h1, h2], 78, 56);
  c.save(); c.translate(h2[0] + 8, h2[1]); c.rotate(-.05 - roar * .22);
  poly(c, [[-40, -50], [40, -62], [150, -46], [178, -18], [170, 6], [40, 22], [-40, 34]]); // upper skull
  c.restore();
  c.save(); c.translate(h2[0] + 6, h2[1] + 22); c.rotate(.08 + roar * .55);
  poly(c, [[-30, 0], [150, -6], [168, 8], [140, 26], [-20, 40]]); // lower jaw
  c.restore();
  tube(c, [[150, -370], [190, -320], [222, -318]], 17, 8);
}
function ptero(c, o) {
  const f = Math.sin(o.time * 4.2 + o.seed * 9); const ang = f * .75;
  ell(c, 0, 0, 34, 10, -.1);
  poly(c, [[26, -3], [110, -10 - o.crest * 6], [26, 5]]); // crest / beak
  poly(c, [[-30, 0], [-58, 6], [-30, 6]]);
  for (const sd of [-1, 1]) {
    const el = [-6 + sd * 20, -30 * Math.sin(ang) * 1.2], tip = [-30 + sd * 150, -110 * Math.sin(ang) - 8 * Math.abs(ang)];
    const trail = [[-30 + sd * 96, -30 * Math.sin(ang) + 18], [-40 + sd * 40, 24]];
    c.beginPath(); c.moveTo(-10, -3); c.quadraticCurveTo(el[0], el[1] - 14, tip[0], tip[1]); c.quadraticCurveTo(trail[0][0] + sd * 40, trail[0][1], trail[1][0], trail[1][1]); c.closePath(); c.fill();
  }
}
// composite a creature with lighting and rim onto target ctx.  o: {x,y,s,flip,colour,rim,rimDir,fog,fogCol,alpha,kind,...}
function drawCreature(ctx, kind, o) {
  const S = SPRc, S2 = SPR2c; const cx = 740, cy = 1020;
  S.setTransform(1, 0, 0, 1, 0, 0); S.globalCompositeOperation = 'source-over'; S.clearRect(0, 0, 1500, 1100);
  S.setTransform(1, 0, 0, 1, cx, cy); S.fillStyle = '#000';
  const fn = { brachio: brachioShape, tri: triShape, trex: trexShape, ptero }[kind]; fn(S, o);
  S.setTransform(1, 0, 0, 1, 0, 0);
  // body tone: vertical gradient from lit top to dark bottom
  S.globalCompositeOperation = 'source-atop';
  const g = S.createLinearGradient(0, cy - 700, 0, cy);
  g.addColorStop(0, o.top || o.colour); g.addColorStop(1, o.colour);
  S.fillStyle = g; S.fillRect(0, 0, 1500, 1100);
  // rim light (silhouette minus silhouette shifted away from the light)
  if (o.rim > 0.01) {
    S2.setTransform(1, 0, 0, 1, 0, 0); S2.globalCompositeOperation = 'source-over'; S2.clearRect(0, 0, 1500, 1100);
    S2.drawImage(SPR, 0, 0);
    S2.globalCompositeOperation = 'destination-out';
    const dx = -(o.rimDir?.[0] ?? 1) * 7, dy = -(o.rimDir?.[1] ?? -.5) * 7;
    S2.drawImage(SPR, dx, dy);
    S2.globalCompositeOperation = 'source-atop'; S2.fillStyle = o.rimCol || '#ffd9a0'; S2.globalAlpha = 1; S2.fillRect(0, 0, 1500, 1100);
    S.globalCompositeOperation = 'source-over'; S.globalAlpha = clamp(o.rim); S.drawImage(SPR2, 0, 0); S.globalAlpha = 1;
  }
  // haze / fog tint toward horizon colour
  if (o.fog > 0.005) { S.globalCompositeOperation = 'source-atop'; S.globalAlpha = o.fog; S.fillStyle = o.fogCol; S.fillRect(0, 0, 1500, 1100); S.globalAlpha = 1; }
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale((o.flip ? -1 : 1) * o.s, (o.flipY ? -1 : 1) * o.s); ctx.globalAlpha = o.alpha ?? 1;
  ctx.drawImage(SPR, -cx, -cy); ctx.restore(); ctx.globalAlpha = 1;
}
