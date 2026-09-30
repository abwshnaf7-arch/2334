/* Deterministic motion-graphics renderer: everything is a pure function of time t (seconds).
   window.renderFrame(t) draws one frame; driver.js screenshots it frame by frame. */
const NS = 'http://www.w3.org/2000/svg';
const DURATION = 29.63;
const Y = '#FFD21F', Yd = '#F5A800', Yl = '#FFE97A', Yp = '#FFF1B8', K = '#151515', K2 = '#2B2B2B', W = '#FFFFFF', GR = '#E6DFC4';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const E = {
  lin: x => x,
  o3: x => 1 - Math.pow(1 - x, 3),
  o5: x => 1 - Math.pow(1 - x, 5),
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  expo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  back2: x => { const c1 = 2.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  elastic: x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -9 * x) * Math.sin((x * 9 - .75) * (2 * Math.PI / 3)) + 1,
};
const p = (t, s, d, f = E.o3) => f(clamp((t - s) / d));
const mix = (a, b, k) => a + (b - a) * k;
const mk = (parent, markup = '') => { const g = document.createElementNS(NS, 'g'); g.innerHTML = markup; parent.appendChild(g); return g; };
function T(g, o) {
  const x = o.x || 0, y = o.y || 0, r = o.r || 0, s = o.s == null ? 1 : o.s;
  const sx = o.sx == null ? s : o.sx, sy = o.sy == null ? s : o.sy, op = o.o == null ? 1 : o.o;
  g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`);
  g.style.opacity = op; g.style.display = (op <= .002 || (sx === 0 && sy === 0)) ? 'none' : '';
}
/* generic pop-in: scale 0 -> s with overshoot, returns {s,o} */
const popS = (t, st, d = .55, f = E.back) => { const k = p(t, st, d, f); return { s: k, o: clamp((t - st) / .08) }; };
const starPath = (n, R, r, rot = -90) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (rot + i * 180 / n) * Math.PI / 180, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1); } return d + 'Z'; };
const HEART = 'M0,-32 C0,-88 -100,-88 -100,-18 C-100,38 -22,72 0,102 C22,72 100,38 100,-18 C100,-88 0,-88 0,-32Z';
const SPARK = 'M0,-100 Q9,-9 100,0 Q9,9 0,100 Q-9,9 -100,0 Q-9,-9 0,-100Z';
const heart = (fill, stroke = K, sw = 0) => `<path d="${HEART}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const spark = (fill) => `<path d="${SPARK}" fill="${fill}"/>`;
const plus = (fill) => `<rect x="-42" y="-11" width="84" height="22" rx="9" fill="${fill}"/><rect x="-11" y="-42" width="22" height="84" rx="9" fill="${fill}"/>`;
const star5 = (fill, R = 100, stroke = 'none', sw = 0) => `<path d="${starPath(5, R, R * .42)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;

/* ---------- decorations (twinkling plus / sparkle / dots) ---------- */
function deco(root, list) {
  const items = list.map(([x, y, kind, size, ph, col], i) => {
    const g = mk(root, kind === 'plus' ? plus(col || K) : kind === 'dot' ? `<circle r="42" fill="${col || Y}"/>` : kind === 'ring' ? `<circle r="38" fill="none" stroke="${col || K}" stroke-width="12"/>` : spark(col || Y));
    return { g, x, y, size: size / 100, ph, kind, i };
  });
  return (lt, t) => items.forEach(it => {
    const k = p(lt, .3 + it.i * .09, .5, E.back);
    const tw = .82 + .22 * Math.sin(t * 3.2 + it.ph);
    T(it.g, { x: it.x, y: it.y + Math.sin(t * 1.6 + it.ph) * 7, s: it.size * k * tw, r: it.kind === 'plus' || it.kind === 'spark' ? Math.sin(t + it.ph) * 14 + (it.kind === 'plus' ? 0 : 0) : 0, o: clamp(k * 4) });
  });
}

/* ---------- title banner (same idea as the reference: slab + offset shadow + plus marks) ---------- */
function banner(root, text) {
  const g = mk(root, '');
  const sh = mk(g, `<rect x="-390" y="-85" width="780" height="170" fill="${K}"/>`);
  const main = mk(g, `<rect x="-390" y="-85" width="780" height="170" fill="url(#banG)"/><rect x="-390" y="-85" width="780" height="60" fill="#fff" opacity=".22"/><rect x="-372" y="-67" width="744" height="134" fill="none" stroke="${K}" stroke-opacity=".18" stroke-width="3"/>`);
  const clipG = mk(g, ''); clipG.setAttribute('clip-path', 'url(#bannerClip)');
  const txtG = mk(clipG, `<text x="0" y="33" text-anchor="middle" font-size="96" fill="${K}" direction="rtl">${text}</text>`);
  const tn = txtG.querySelector('text');
  const plusses = [[-410, -105], [410, -105], [-410, 105], [410, 105]].map(([x, y]) => mk(g, plus(K)));
  let fitted = false;
  return (lt) => {
    if (!fitted) { const w = tn.getComputedTextLength(); if (w > 690) tn.setAttribute('font-size', (96 * 690 / w).toFixed(1)); fitted = true; }
    const a = p(lt, .10, .62, E.expo), b = p(lt, .20, .62, E.expo);
    const pv = 390;                                     // scale about the right edge (RTL reveal)
    main.setAttribute('transform', `translate(${pv} 0) scale(${Math.max(a, .0001)} 1) translate(${-pv} 0)`);
    sh.setAttribute('transform', `translate(${-18 * b} ${18 * b}) translate(${pv} 0) scale(${Math.max(b, .0001)} 1) translate(${-pv} 0)`);
    sh.style.opacity = b > 0 ? 1 : 0; main.style.opacity = a > 0 ? 1 : 0;
    const ty = mix(120, 0, p(lt, .38, .55, E.expo)); txtG.setAttribute('transform', `translate(0 ${ty.toFixed(2)})`);
    const fl = 1 + .05 * Math.sin(lt * 4);
    plusses.forEach((pg, i) => { const k = p(lt, .35 + i * .07, .5, E.back2); T(pg, { x: [-410, 410, -410, 410][i], y: [-105, -105, 105, 105][i], s: .38 * k * (i % 2 ? fl : 2 - fl), r: 45 * Math.sin(lt * 2 + i), o: clamp(k * 5) }); });
    T(g, { x: 540, y: 265 + Math.sin(lt * 2.2) * 4 });
  };
}

/* ---------- scene factory ---------- */
function scene(root, t0, t1, text, build) {
  const g = mk(root, ''); g.style.display = 'none';
  const inner = mk(g, '');
  const ban = banner(inner, text);
  const ill = mk(inner, '');
  const upd = build(ill, g);
  return { t0, t1, g, inner, ban, upd, ill };
}
const groundShadow = (parent, y, w = 320) => mk(parent, `<ellipse cx="0" cy="${y}" rx="${w}" ry="26" fill="${K}" opacity=".14"/>`);

/* =====================================================================
   SCENES
   ===================================================================== */
const scenes = [];
function initScenes() {
  const root = $('#scenes');
  const add = (t0, t1, text, build) => scenes.push(scene(root, t0, t1, text, build));

  /* ---- S1 : thanks from the heart + brand badge ---- */
  add(0, 3.9, 'شكراً من القلب', (ill) => {
    const dec = deco(ill, [[-400, -380, 'spark', 44, 0, K], [410, -330, 'plus', 30, 1, K], [-430, 120, 'plus', 26, 2, Yd], [420, 260, 'spark', 38, 3, Yd], [-330, 420, 'dot', 14, 4, Yd], [350, -60, 'dot', 12, 5, K]]);
    const c = mk(ill, ''); T(c, { y: 0 });
    const glow = mk(c, `<circle r="260" fill="${Yl}" opacity=".55"/>`);
    const r1 = mk(c, `<circle r="335" fill="none" stroke="${K}" stroke-opacity=".4" stroke-width="6" stroke-dasharray="2 24" stroke-linecap="round"/>`);
    const r2 = mk(c, `<circle r="288" fill="none" stroke="${Yd}" stroke-width="7" stroke-dasharray="70 34 12 34" stroke-linecap="round"/>`);
    const badge = mk(c, `<circle r="222" fill="${K}"/><circle r="206" fill="#FFF6CC"/><circle r="190" fill="none" stroke="${Y}" stroke-width="8"/><image href="assets/logo.png" x="-190" y="-215" width="380" height="438"/>`);
    const flash = mk(c, `<circle r="218" fill="none" stroke="${K}" stroke-width="14"/>`);
    const hb = mk(c, heart(Y, K, 12));
    const hearts = Array.from({ length: 9 }, (_, i) => ({ g: mk(c, heart(i % 2 ? Y : K, K, 0)), i }));
    return (lt, t) => {
      dec(lt, t);
      const a = popS(lt, .25, .7, E.back); T(glow, { s: a.s, o: a.o * .9 });
      T(r1, { s: a.s, r: t * 10, o: a.o }); T(r2, { s: a.s, r: -t * 16, o: a.o });
      // heart: big and beating, then flies to the corner while the badge appears
      const hin = popS(lt, .4, .7, E.back2), fly = p(lt, 2.45, .7, E.expo);
      const beat = 1 + .07 * Math.sin(lt * 9) * (1 - fly);
      T(hb, { x: mix(0, 175, fly), y: mix(0, -230, fly), s: mix(1.85, .62, fly) * hin.s * beat, r: mix(0, 14, fly) + Math.sin(lt * 3) * 3, o: hin.o });
      const bp = popS(lt, 2.6, .8, E.back2); T(badge, { s: bp.s, r: mix(-40, 0, p(lt, 2.6, .9, E.expo)), o: bp.o });
      const fk = p(lt, 2.65, .7, E.o3); T(flash, { s: 1 + fk * .8, o: (1 - fk) * (lt > 2.6 ? 1 : 0) });
      hearts.forEach(h => { const st = .9 + h.i * .33, k = (lt - st) / 2.4; if (k < 0 || k > 1) { T(h.g, { o: 0 }); return; }
        const x = (rnd(h.i + 3) - .5) * 600, s = (.16 + rnd(h.i + 9) * .14) * Math.min(1, k * 6);
        T(h.g, { x: x + Math.sin(k * 7 + h.i) * 26, y: 300 - k * 720, s, r: Math.sin(k * 5 + h.i) * 18, o: Math.min(1, (1 - k) * 2.5) * .9 }); });
    };
  });

  /* ---- S2 : medal = "all the support" ---- */
  add(3.9, 5.9, 'على كل الدعم', (ill) => {
    const dec = deco(ill, [[-390, -300, 'plus', 30, 0, K], [400, -250, 'spark', 46, 1, Y], [-420, 150, 'spark', 36, 2, Yd], [410, 210, 'plus', 26, 3, K], [-300, -430, 'dot', 12, 4, Yd], [330, 420, 'dot', 14, 5, K]]);
    groundShadow(ill, 430, 260);
    const ribL = mk(ill, `<path d="M-120 100 L-200 420 L-120 370 L-70 440 L-20 130Z" fill="${K}"/>`);
    const ribR = mk(ill, `<path d="M120 100 L200 420 L120 370 L70 440 L20 130Z" fill="${Yd}"/>`);
    const med = mk(ill, `<path d="${starPath(28, 262, 238)}" fill="${Y}"/><circle r="205" fill="${K}"/><circle r="178" fill="none" stroke="${Y}" stroke-width="8" stroke-dasharray="4 18" stroke-linecap="round"/>`);
    const st = mk(med, star5(Y, 115, Yd, 0));
    const shine = mk(ill, `<clipPath id="mc"><circle r="205"/></clipPath><g clip-path="url(#mc)"><rect id="sh" x="-40" y="-300" width="70" height="600" fill="#fff" opacity=".22" transform="rotate(25)"/></g>`);
    const orb = Array.from({ length: 6 }, (_, i) => mk(ill, star5(i % 2 ? K : Y, 26)));
    const up = [0, 1, 2].map(i => mk(ill, `<circle r="44" fill="${K}"/><path d="M0 18 L0 -18 M-16 -2 L0 -20 L16 -2" stroke="${Y}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`));
    return (lt, t) => {
      dec(lt, t);
      const m = popS(lt, .2, .75, E.back2); T(med, { y: -60, s: m.s, r: mix(-50, 0, p(lt, .2, .9, E.expo)), o: m.o });
      T(ribL, { y: -60 + mix(-200, 0, p(lt, .45, .6, E.expo)), o: clamp((lt - .45) * 6) }); T(ribR, { y: -60 + mix(-200, 0, p(lt, .55, .6, E.expo)), o: clamp((lt - .55) * 6) });
      T(st, { s: 1 + .06 * Math.sin(t * 6), r: Math.sin(t * 2) * 6 });
      const sp = p(lt, .9, .7, E.io); $('#sh', shine).setAttribute('x', mix(-360, 360, sp));
      shine.style.opacity = m.o; shine.setAttribute('transform', 'translate(0 -60)');
      orb.forEach((o, i) => { const a = t * 1.3 + i * Math.PI / 3, k = p(lt, .7 + i * .08, .5, E.back); T(o, { x: Math.cos(a) * 330 * k, y: -60 + Math.sin(a) * 330 * k, s: k * (1 + .2 * Math.sin(t * 5 + i)), r: t * 60, o: clamp(k * 4) }); });
      up.forEach((u, i) => { const st0 = 1.05 + i * .18, k = (lt - st0) / 1.2; if (k < 0 || k > 1) { T(u, { o: 0 }); return; }
        T(u, { x: [-300, 0, 300][i] + Math.sin(k * 6) * 12, y: 360 - k * 330, s: Math.min(1, k * 6) * .9, o: Math.min(1, (1 - k) * 3) }); });
    };
  });

  /* ---- S3 : exhibition booth, "before & during" ---- */
  add(5.9, 8.0, 'قبل المعرض وخلاله', (ill) => {
    const dec = deco(ill, [[-400, -330, 'spark', 40, 0, K], [410, -300, 'plus', 30, 1, K], [420, 70, 'spark', 34, 2, Yd], [-430, 40, 'plus', 26, 3, Yd]]);
    groundShadow(ill, 232, 380);
    const plat = mk(ill, `<rect x="-380" y="170" width="760" height="56" rx="22" fill="${K2}"/><rect x="-380" y="170" width="760" height="14" rx="7" fill="${Y}"/>`);
    const wall = mk(ill, `<rect x="-330" y="-240" width="660" height="410" fill="${Yp}"/><circle cx="-150" cy="-40" r="120" fill="${Y}"/><rect x="40" y="-160" width="210" height="64" rx="16" fill="${K}"/><rect x="40" y="-70" width="150" height="26" rx="13" fill="${Yd}"/><rect x="40" y="-22" width="190" height="26" rx="13" fill="${GR}"/><path d="M-235 120 L-150 10 L-95 80 L-50 30 L0 120Z" fill="${K2}" opacity=".9"/>`);
    let st = ''; for (let i = 0; i < 8; i++) { const x = -360 + i * 90, col = i % 2 ? K : Y; st += `<rect x="${x}" y="-250" width="90" height="62" fill="${col}"/><circle cx="${x + 45}" cy="-188" r="45" fill="${col}"/>`; }
    const awn = mk(ill, st);
    const sign = mk(ill, `<rect x="-215" y="-345" width="430" height="92" rx="22" fill="${K}"/><text y="-272" text-anchor="middle" font-size="68" fill="${Y}" direction="rtl">المعرض</text>`);
    const counter = mk(ill, `<rect x="-215" y="44" width="430" height="126" fill="${K2}"/><rect x="-235" y="24" width="470" height="30" rx="10" fill="${Y}"/><rect x="-150" y="84" width="300" height="20" rx="10" fill="${Y}" opacity=".9"/>`);
    const roll = mk(ill, `<rect x="-320" y="-150" width="92" height="300" rx="10" fill="${W}"/><rect x="-320" y="-150" width="92" height="110" rx="10" fill="${Y}"/><circle cx="-274" cy="-96" r="26" fill="${K}"/><rect x="-332" y="140" width="116" height="16" rx="8" fill="${K}"/>`);
    const flag = mk(ill, `<rect x="326" y="-200" width="10" height="370" fill="${K}"/><path d="M336 -200 L430 -170 L336 -132Z" fill="${Y}"/>`);
    const pills = [['خلال', -170], ['قبل', 170]].map(([tx, x]) => ({ g: mk(ill, `<rect x="-130" y="-46" width="260" height="92" rx="46" fill="${W}" stroke="${K}" stroke-width="8"/><text y="26" text-anchor="middle" font-size="64" fill="${K}" direction="rtl">${tx}</text>`), x, tx }));
    const arrow = mk(ill, `<path d="M120 0 H-120 M-92 -28 L-122 0 L-92 28" stroke="${K}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    const fills = pills.map(pl => { const f = mk(pl.g, `<rect x="-130" y="-46" width="260" height="92" rx="46" fill="${K}"/><text y="26" text-anchor="middle" font-size="64" fill="${Y}" direction="rtl">${pl.tx}</text>`); return f; });
    return (lt, t) => {
      dec(lt, t);
      T(plat, { sx: p(lt, .1, .55, E.expo), sy: 1, y: 0, o: 1 });
      T(wall, { y: 170, sx: 1, sy: p(lt, .2, .6, E.expo)}); wall.setAttribute('transform', `translate(0 170) scale(1 ${Math.max(p(lt, .2, .6, E.expo), .0001)}) translate(0 -170)`);
      T(awn, { y: mix(-300, 0, p(lt, .35, .75, E.back)), o: clamp((lt - .35) * 8) });
      const s = popS(lt, .6, .55, E.back); T(sign, { y: -300, s: s.s, o: s.o }); sign.setAttribute('transform', `translate(0 -299) scale(${s.s}) translate(0 299)`);
      T(counter, { x: mix(-300, 0, p(lt, .45, .6, E.expo)), o: clamp((lt - .45) * 8) });
      T(roll, { y: mix(120, 0, p(lt, .55, .6, E.back)), o: clamp((lt - .55) * 8) });
      T(flag, { y: mix(300, 0, p(lt, .6, .6, E.expo)), o: clamp((lt - .6) * 8) });
      flag.lastChild.setAttribute('transform', `skewY(${Math.sin(t * 7) * 6})`);
      pills.forEach((pl, i) => { const k = popS(lt, .8 + i * .12, .55, E.back); T(pl.g, { x: pl.x, y: 360, s: k.s, o: k.o }); const on = p(lt, [.25, 1.05][i] + .1, .25, E.o3); T(fills[i], { s: 1, o: on }); });
      T(arrow, { y: 360, x: 0, s: p(lt, 1.0, .4, E.back), o: clamp((lt - 1) * 8) });
    };
  });

  /* ---- S4 : rating card, "really good experience" ---- */
  add(8.0, 12.3, 'تجربة ممتازة', (ill) => {
    const dec = deco(ill, [[-400, -330, 'plus', 30, 0, K], [410, -350, 'spark', 46, 1, Y], [-430, 120, 'spark', 38, 2, Yd], [430, 280, 'plus', 28, 3, K], [-380, 420, 'dot', 14, 4, Yd], [380, -120, 'dot', 12, 5, K]]);
    groundShadow(ill, 450, 300);
    const card = mk(ill, `<rect x="-300" y="-150" width="640" height="560" rx="44" fill="${K}"/><rect x="-320" y="-130" width="640" height="560" rx="44" fill="${W}"/><rect x="-320" y="-130" width="640" height="116" rx="44" fill="${Yp}"/><rect x="-320" y="-60" width="640" height="46" fill="${Yp}"/>`);
    const face = mk(ill, `<circle r="112" fill="${K}"/><circle r="100" fill="${Y}"/><ellipse cx="-36" cy="-18" rx="13" ry="20" fill="${K}"/><ellipse cx="36" cy="-18" rx="13" ry="20" fill="${K}"/><path id="mouth" d="M-50 28 Q0 28 50 28" stroke="${K}" stroke-width="13" fill="none" stroke-linecap="round"/><ellipse cx="-66" cy="22" rx="16" ry="9" fill="${Yd}" opacity=".6"/><ellipse cx="66" cy="22" rx="16" ry="9" fill="${Yd}" opacity=".6"/>`);
    const stars = Array.from({ length: 5 }, (_, i) => ({ g: mk(ill, `<g>${star5(GR, 58)}</g>`), i, f: null }));
    stars.forEach(s => { s.f = mk(s.g, star5(Y, 58, K, 6)); });
    const bars = [0, 1, 2].map(i => mk(ill, `<rect x="-250" y="${210 + i * 62}" width="500" height="26" rx="13" fill="${GR}"/><rect id="b${i}" x="-250" y="${210 + i * 62}" width="500" height="26" rx="13" fill="${i === 1 ? K : Y}"/>`));
    const bursts = Array.from({ length: 10 }, (_, i) => mk(ill, spark(i % 2 ? K : Y)));
    return (lt, t) => {
      dec(lt, t);
      const c = popS(lt, .15, .6, E.back); T(card, { y: 0, s: c.s, o: c.o }); card.setAttribute('transform', `translate(0 100) scale(${c.s}) translate(0 -100)`);
      const fc = popS(lt, .35, .7, E.back2); T(face, { y: -150, s: fc.s * (1 + .03 * Math.sin(t * 4)), r: Math.sin(t * 2.2) * 4, o: fc.o });
      const sm = p(lt, .7, .6, E.back); $('#mouth', face).setAttribute('d', `M-52 24 Q0 ${24 + sm * 62} 52 24`);
      const pulse = [3.4, 3.7, 3.98].reduce((a, s) => a + (lt > s ? Math.exp(-(lt - s) * 7) * Math.sin((lt - s) * 25) : 0), 0);
      stars.forEach((s, i) => { const k = popS(lt, .75 + i * .1, .5, E.back2); T(s.g, { x: (i - 2) * 118, y: 90, s: k.s * (1 + .22 * Math.max(0, pulse)), r: (1 - k.s) * -90 + pulse * 6, o: k.o });
        const f = popS(lt, 1.3 + i * .42, .4, E.back2); T(s.f, { s: f.s, o: f.o }); });
      bars.forEach((b, i) => { const k = p(lt, 2.0 + i * .3, 1.0, E.expo), w = [500, 460, 490][i] * k; const r = $('#b' + i, b); r.setAttribute('width', Math.max(w, 26 * k)); T(b, { o: clamp((lt - 1.9) * 6) }); });
      bursts.forEach((b, i) => { const base = [3.4, 3.7, 3.98][i % 3], k = (lt - base) / .8; if (k < 0 || k > 1) { T(b, { o: 0 }); return; }
        const a = (i / 10) * Math.PI * 2 + i, d = 140 + k * 250; T(b, { x: Math.cos(a) * d * 1.15, y: 90 + Math.sin(a) * d, s: .28 * (1 - k * .5), r: k * 160, o: 1 - k }); });
    };
  });

  /* ---- S5 : social media team (phone + megaphone) ---- */
  add(12.3, 15.4, 'فريق السوشيال ميديا', (ill) => {
    const dec = deco(ill, [[-380, -420, 'plus', 28, 0, K], [420, -440, 'spark', 40, 1, Yd], [-440, 360, 'spark', 34, 2, K]]);
    groundShadow(ill, 450, 330);
    const phone = mk(ill, `<rect x="-215" y="-410" width="430" height="830" rx="64" fill="${K2}"/><rect x="-196" y="-391" width="392" height="792" rx="50" fill="${Yp}"/><clipPath id="pcl"><rect x="-196" y="-391" width="392" height="792" rx="50"/></clipPath><rect x="-90" y="-391" width="180" height="40" rx="20" fill="${K2}"/>`);
    const feed = mk(phone, ''); feed.setAttribute('clip-path', 'url(#pcl)');
    const feedIn = mk(feed, '');
    for (let i = 0; i < 4; i++) { const y = -300 + i * 330; feedIn.appendChild(mk(feedIn, `<rect x="-168" y="${y}" width="336" height="290" rx="22" fill="${W}"/><circle cx="-130" cy="${y + 32}" r="18" fill="${i % 2 ? K : Y}"/><rect x="-96" y="${y + 20}" width="120" height="12" rx="6" fill="${GR}"/><rect x="-150" y="${y + 66}" width="300" height="146" rx="14" fill="${i % 2 ? Y : Yl}"/><path d="M-150 ${y + 212} L-70 ${y + 120} L-20 ${y + 180} L40 ${y + 100} L150 ${y + 212}Z" fill="${i % 2 ? K : Yd}" opacity=".8"/><circle cx="90" cy="${y + 105}" r="16" fill="${W}"/><path d="${HEART}" transform="translate(-134 ${y + 246}) scale(.15)" fill="${K}"/><rect x="-100" y="${y + 240}" width="90" height="10" rx="5" fill="${GR}"/>`)); }
    const mega = mk(ill, `<g transform="rotate(-10)"><rect x="-58" y="40" width="44" height="120" rx="16" fill="${K}" transform="rotate(-18 -36 40)"/><path d="M-110 -52 L80 -150 L80 150 L-110 52Z" fill="${Y}"/><path d="M-110 -52 L80 -150 L80 -60 L-110 -10Z" fill="#fff" opacity=".25"/><rect x="-142" y="-62" width="38" height="124" rx="16" fill="${K}"/><ellipse cx="80" cy="0" rx="36" ry="150" fill="${Yd}"/><ellipse cx="86" cy="0" rx="20" ry="118" fill="${K}"/></g>`);
    const waves = [0, 1, 2].map(i => mk(ill, `<path d="M0 -62 Q46 0 0 62" stroke="${K}" stroke-width="12" fill="none" stroke-linecap="round"/>`));
    const icon = (g) => `<circle r="56" fill="${K}"/>${g}`;
    const bub = [
      [icon(`<path d="${HEART}" transform="scale(.3)" fill="${Y}"/>`), 380, -250],
      [icon(`<path d="M-24 -20 H24 Q32 -20 32 -12 V12 Q32 20 24 20 H4 L-14 36 V20 H-24 Q-32 20 -32 12 V-12 Q-32 -20 -24 -20Z" fill="${Y}"/>`), 410, 10],
      [icon(`<path d="M-14 -24 L26 0 L-14 24Z" fill="${Y}" stroke="${Y}" stroke-width="6" stroke-linejoin="round"/>`), 350, 270],
      [icon(`<path d="M0 -26 Q22 -26 22 -2 V12 L30 22 H-30 L-22 12 V-2 Q-22 -26 0 -26Z" fill="${Y}"/><circle cy="30" r="7" fill="${Y}"/>`), -330, -300],
      [icon(`<path d="M0 -26 L8 -8 L28 -6 L13 8 L17 28 L0 18 L-17 28 L-13 8 L-28 -6 L-8 -8Z" fill="${Y}"/>`), -400, 300],
    ].map(([m, x, y]) => ({ g: mk(ill, m), x, y }));
    return (lt, t) => {
      dec(lt, t);
      const ph = popS(lt, .15, .7, E.back); T(phone, { x: 60, y: 10, s: ph.s, o: ph.o });
      feedIn.setAttribute('transform', `translate(0 ${-((lt * 120) % 330) - 0})`);
      const mg = popS(lt, .45, .7, E.back2); T(mega, { x: -290, y: 150, s: mg.s * (1 + .03 * Math.sin(t * 8)), r: mix(-40, 0, p(lt, .45, .8, E.expo)), o: mg.o });
      waves.forEach((w, i) => { const k = ((lt * 1.3 + i * .33) % 1); T(w, { x: -110 + k * 120 + i * 18, y: 75, s: .6 + k * .9, o: lt > .9 ? (1 - k) : 0 }); });
      bub.forEach((b, i) => { const k = popS(lt, .8 + i * .14, .55, E.back2); T(b.g, { x: b.x + Math.sin(t * 2 + i) * 6, y: b.y + Math.sin(t * 2.4 + i * 1.7) * 12, s: k.s * .92, r: Math.sin(t * 2 + i) * 6, o: k.o }); });
    };
  });

  /* ---- S6 : designers (monitor, artboard, pen tool) ---- */
  add(15.4, 17.2, 'فريق التصميم', (ill) => {
    const dec = deco(ill, [[-400, -330, 'spark', 40, 0, K], [420, -300, 'plus', 30, 1, K], [-430, 250, 'plus', 26, 2, Yd], [430, 300, 'spark', 34, 3, Yd]]);
    groundShadow(ill, 440, 330);
    const mon = mk(ill, `<rect x="-60" y="240" width="120" height="150" fill="${K2}"/><rect x="-170" y="380" width="340" height="44" rx="22" fill="${K}"/><rect x="-340" y="-240" width="680" height="490" rx="34" fill="${K2}"/><rect x="-316" y="-216" width="632" height="402" rx="14" fill="${Yp}"/><circle cy="218" r="10" fill="${Y}"/>`);
    const tool = mk(mon, [0, 1, 2, 3].map(i => `<rect x="-300" y="${-190 + i * 62}" width="44" height="44" rx="10" fill="${i === 1 ? K : W}"/>`).join('') + `<path d="M-286 -110 L-270 -72 L-262 -90 L-244 -98Z" fill="${Y}"/>`);
    const art = mk(mon, `<rect x="-200" y="-190" width="340" height="340" rx="10" fill="${K}" opacity=".18" transform="translate(10 10)"/><rect x="-200" y="-190" width="340" height="340" rx="10" fill="${W}"/>`);
    const s1 = mk(mon, `<circle r="74" fill="${Y}"/>`), s2 = mk(mon, star5(K, 70)), s3 = mk(mon, `<rect x="-58" y="-40" width="116" height="80" rx="18" fill="${Yd}"/>`);
    const pen = mk(mon, `<path id="pp" d="M-170 100 C-110 -130 -20 140 40 -70 S110 10 120 -40" stroke="${K}" stroke-width="9" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`);
    const anch = [[-170, 100], [40, -70], [120, -40]].map(([x, y]) => mk(mon, `<rect x="-11" y="-11" width="22" height="22" fill="${W}" stroke="${K}" stroke-width="6"/>`));
    const sw = [Y, K, Yd, W].map((c, i) => mk(mon, `<circle r="23" fill="${c}" stroke="${K}" stroke-width="5"/>`));
    const cur = mk(mon, `<path d="M0 0 L0 44 L12 33 L22 54 L32 49 L22 29 L38 27Z" fill="${K}" stroke="${W}" stroke-width="4" stroke-linejoin="round"/>`);
    const ppath = $('#pp', mon); const L = ppath.getTotalLength();
    return (lt, t) => {
      dec(lt, t);
      const m = popS(lt, .1, .6, E.back); T(mon, { y: -60, s: m.s, o: m.o });
      T(tool, { o: clamp((lt - .4) * 6) });
      T(art, { o: clamp((lt - .35) * 6) });
      const a = popS(lt, .55, .5, E.back2), b = popS(lt, .7, .5, E.back2), c = popS(lt, .85, .5, E.back2);
      T(s1, { x: -95, y: -95, s: a.s, o: a.o }); T(s2, { x: 75, y: -96, s: b.s, r: t * 30, o: b.o }); T(s3, { x: 0, y: 105, s: c.s, o: c.o });
      const d = p(lt, .7, .95, E.io); ppath.setAttribute('stroke-dashoffset', (1 - d).toFixed(4)); pen.style.opacity = lt > .68 ? 1 : 0;
      anch.forEach((an, i) => { const k = popS(lt, .8 + i * .3, .3, E.back); T(an, { x: [-170, 40, 120][i], y: [100, -70, -40][i], s: k.s, o: k.o }); });
      sw.forEach((s, i) => { const k = popS(lt, .6 + i * .1, .45, E.back2); T(s, { x: 226, y: -150 + i * 62, s: k.s, o: k.o }); });
      const pt = ppath.getPointAtLength(L * Math.min(d, 1)); const cm = lt < 1.65 ? 1 : 0; T(cur, { x: pt.x + 6 + (lt >= 1.65 ? 130 : 0), y: pt.y + 6, s: 1, o: p(lt, .6, .2) });
    };
  });

  /* ---- S7 : three posters ---- */
  add(17.2, 19.6, 'تصاميم رائعة', (ill) => {
    const dec = deco(ill, [[-420, -350, 'plus', 30, 0, K], [420, -380, 'spark', 44, 1, Y], [-430, 330, 'spark', 36, 2, Yd], [430, 330, 'plus', 28, 3, K], [0, 450, 'dot', 12, 4, Yd]]);
    groundShadow(ill, 400, 400);
    const card = (inner) => `<rect x="-120" y="-175" width="280" height="390" rx="22" fill="${K}" transform="translate(-14 14)" opacity=".92"/><rect x="-135" y="-190" width="280" height="390" rx="22" fill="${W}"/>${inner}`;
    const P = [
      mk(ill, card(`<rect x="-135" y="-190" width="280" height="390" rx="22" fill="${Y}"/><circle cx="5" cy="-60" r="86" fill="${K}"/><path d="${starPath(5, 52, 22)}" transform="translate(5 -60)" fill="${Y}"/><rect x="-100" y="64" width="210" height="22" rx="11" fill="${K}"/><rect x="-100" y="104" width="150" height="18" rx="9" fill="${K}" opacity=".6"/><rect x="-100" y="146" width="90" height="30" rx="15" fill="${W}"/>`)),
      mk(ill, card(`<rect x="-135" y="-190" width="280" height="390" rx="22" fill="${K}"/><path d="${starPath(5, 100, 42)}" transform="translate(5 -40)" fill="${Y}"/><rect x="-100" y="90" width="210" height="22" rx="11" fill="${Y}"/><rect x="-100" y="130" width="150" height="18" rx="9" fill="${W}" opacity=".7"/><circle cx="-80" cy="-150" r="10" fill="${Y}"/><circle cx="-50" cy="-150" r="10" fill="${W}"/>`)),
      mk(ill, card(`<rect x="-135" y="-190" width="280" height="210" rx="22" fill="${Yl}"/><rect x="-135" y="-40" width="280" height="60" fill="${Yl}"/><path d="M-135 20 L-40 -90 L20 -10 L80 -80 L145 20Z" fill="${K}"/><circle cx="85" cy="-130" r="30" fill="${Y}"/><rect x="-100" y="60" width="210" height="22" rx="11" fill="${K}"/><rect x="-100" y="102" width="210" height="14" rx="7" fill="${GR}"/><rect x="-100" y="130" width="160" height="14" rx="7" fill="${GR}"/><rect x="-100" y="162" width="100" height="26" rx="13" fill="${Y}"/>`)),
    ];
    const wow = mk(ill, `<circle r="74" fill="${K}"/><path d="${HEART}" transform="scale(.46)" fill="${Y}"/>`);
    const cfs = Array.from({ length: 12 }, (_, i) => mk(ill, `<rect x="-14" y="-7" width="28" height="14" rx="4" fill="${[Y, K, Yd][i % 3]}"/>`));
    return (lt, t) => {
      dec(lt, t);
      const cfg = [[-270, 50, -10, 1, .15], [270, 50, 10, 1, .3], [0, -10, 0, 1.14, .0]];
      [2, 0, 1].forEach((pi, n) => { /* order of entrance: centre first */ });
      P.forEach((g, i) => { const [x, y, r, s, st] = [[-275, 70, -11, .92, .28], [275, 70, 11, .92, .4], [0, -20, 0, 1.08, .12]][i];
        const k = p(lt, st, .8, E.back), ex = p(lt, st, .8, E.expo);
        T(g, { x: x * ex, y: mix(700, y, ex) + Math.sin(t * 1.8 + i) * 8, s: s * k, r: mix(i === 0 ? -80 : i === 1 ? 80 : 0, r, ex), o: clamp((lt - st) * 8) }); });
      const w = popS(lt, .95, .6, E.back2); T(wow, { x: 130, y: -300, s: w.s * (1 + .08 * Math.sin(t * 7)), r: Math.sin(t * 3) * 10, o: w.o });
      cfs.forEach((c, i) => { const st = 1.0 + (i % 6) * .05, k = (lt - st) / 1.3; if (k < 0 || k > 1) { T(c, { o: 0 }); return; }
        const a = -Math.PI / 2 + (rnd(i + 1) - .5) * 2.4, d = 120 + rnd(i + 5) * 420 * E.o3(k); T(c, { x: 130 + Math.cos(a) * d, y: -300 + Math.sin(a) * d + k * k * 260, r: k * 500 * (rnd(i) - .4), o: 1 - k * k }); });
    };
  });

  /* ---- S8 : roll-up banner + flyers ---- */
  add(19.6, 22.4, 'رول أب وفلايرز', (ill) => {
    const dec = deco(ill, [[-400, -380, 'spark', 40, 0, K], [420, -370, 'plus', 30, 1, K], [-430, 120, 'plus', 26, 2, Yd], [430, 400, 'spark', 34, 3, Yd]]);
    groundShadow(ill, 440, 380);
    const base = mk(ill, `<rect x="-200" y="376" width="400" height="56" rx="26" fill="${K}"/><rect x="-200" y="376" width="400" height="14" rx="7" fill="${Y}"/>`);
    const panel = mk(ill, `<rect x="-130" y="-380" width="290" height="770" fill="${K}" transform="translate(-14 14)"/><rect x="-144" y="-394" width="290" height="770" fill="${W}"/><rect x="-144" y="-394" width="290" height="300" fill="${Y}"/><circle cx="1" cy="-250" r="82" fill="${K}"/><path d="${starPath(5, 52, 22)}" transform="translate(1 -250)" fill="${Y}"/><rect x="-104" y="-56" width="210" height="26" rx="13" fill="${K}"/><rect x="-104" y="-4" width="160" height="18" rx="9" fill="${GR}"/><rect x="-104" y="32" width="190" height="18" rx="9" fill="${GR}"/><path d="M-144 376 V150 L-40 70 L30 140 L100 40 L146 100 V376Z" fill="${Yl}"/><path d="M-144 376 V230 L-60 170 L20 250 L146 160 V376Z" fill="${K2}"/><rect x="-96" y="290" width="190" height="40" rx="20" fill="${Y}"/>`);
    const cap = mk(ill, `<rect x="-160" y="-420" width="320" height="34" rx="16" fill="${K}"/>`);
    const fl = [[250, 230, 13, 0], [330, 120, 3, 1], [270, -10, -9, 2]].map(([x, y, r, i]) =>
      ({ g: mk(ill, `<rect x="-95" y="-135" width="210" height="290" rx="16" fill="${K}" transform="translate(-10 10)"/><rect x="-105" y="-145" width="210" height="290" rx="16" fill="${W}"/><rect x="-105" y="-145" width="210" height="120" rx="16" fill="${i % 2 ? K : Y}"/><rect x="-105" y="-70" width="210" height="45" fill="${i % 2 ? K : Y}"/><path d="${starPath(5, 34, 14)}" transform="translate(0 -84)" fill="${i % 2 ? Y : K}"/><rect x="-74" y="8" width="148" height="16" rx="8" fill="${K}"/><rect x="-74" y="40" width="110" height="12" rx="6" fill="${GR}"/><rect x="-74" y="66" width="130" height="12" rx="6" fill="${GR}"/><rect x="-74" y="98" width="70" height="26" rx="13" fill="${Y}"/>`), x, y, r, i }));
    return (lt, t) => {
      dec(lt, t);
      T(base, { sx: p(lt, .1, .5, E.expo), sy: 1 });
      const rise = p(lt, .3, .85, E.expo);
      panel.setAttribute('transform', `translate(0 376) scale(1 ${Math.max(rise, .0001)}) translate(0 -376)`);
      T(cap, { y: mix(376, 0, rise), o: clamp((lt - .3) * 8) });
      fl.forEach((f, n) => { const st = 1.2 + n * .4, ex = p(lt, st, .85, E.expo), k = p(lt, st, .8, E.back);
        T(f.g, { x: mix(900, f.x, ex) + Math.sin(t * 1.7 + n) * 4, y: mix(f.y - 420, f.y, ex) + Math.sin(t * 2 + n) * 7, s: .9 * clamp(k, 0, 1.08), r: mix(f.r + 150, f.r, ex), o: clamp((lt - st) * 10) }); });
    };
  });

  /* ---- S9 : big check mark ---- */
  add(22.4, 24.4, 'كل شيء رائع', (ill) => {
    const dec = deco(ill, [[-410, -330, 'plus', 30, 0, K], [420, -300, 'spark', 46, 1, Y], [-430, 280, 'spark', 38, 2, Yd], [420, 340, 'plus', 28, 3, K], [-330, 440, 'dot', 14, 4, Yd]]);
    groundShadow(ill, 420, 280);
    const ring = mk(ill, `<circle r="320" fill="none" stroke="${K}" stroke-opacity=".4" stroke-width="6" stroke-dasharray="2 24" stroke-linecap="round"/>`);
    const halo = mk(ill, `<circle r="262" fill="${Y}"/>`);
    const disc = mk(ill, `<circle r="222" fill="${K}"/><circle r="196" fill="none" stroke="${Y}" stroke-width="7"/>`);
    const chk = mk(ill, `<path id="ck" d="M-98 6 L-28 78 L104 -72" stroke="${Y}" stroke-width="64" fill="none" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`);
    const pulse = mk(ill, `<circle r="262" fill="none" stroke="${Y}" stroke-width="12"/>`);
    const sts = Array.from({ length: 5 }, (_, i) => mk(ill, star5(i % 2 ? K : Y, 34)));
    const cfs = Array.from({ length: 22 }, (_, i) => mk(ill, `<rect x="-14" y="-7" width="28" height="14" rx="4" fill="${[Y, K, Yd, W][i % 4]}" stroke="${K}" stroke-width="${i % 4 === 3 ? 3 : 0}"/>`));
    return (lt, t) => {
      dec(lt, t);
      const h = popS(lt, .15, .7, E.back2); T(halo, { s: h.s, o: h.o }); T(disc, { s: h.s * .999, r: mix(-60, 0, p(lt, .15, .8, E.expo)), o: h.o }); T(ring, { s: h.s, r: t * 12, o: h.o });
      const d = p(lt, .6, .55, E.io); $('#ck', chk).setAttribute('stroke-dashoffset', (1 - d).toFixed(4));
      const bump = lt > 1.1 ? 1 + .05 * Math.exp(-(lt - 1.1) * 6) * Math.sin((lt - 1.1) * 22) : 1; T(chk, { s: bump });
      const pk = (lt - 1.15) / .8; T(pulse, { s: 1 + clamp(pk) * .55, o: pk < 0 || pk > 1 ? 0 : 1 - pk });
      sts.forEach((s, i) => { const a = t * 1.1 + i * Math.PI * 2 / 5, k = popS(lt, .9 + i * .08, .5, E.back); T(s, { x: Math.cos(a) * 320 * k.s, y: Math.sin(a) * 320 * k.s, s: k.s, r: t * 70, o: k.o }); });
      cfs.forEach((c, i) => { const st = 1.1 + rnd(i + 2) * .25, k = (lt - st) / 1.6; if (k < 0 || k > 1) { T(c, { o: 0 }); return; }
        const a = (i / 22) * Math.PI * 2, d2 = 160 + rnd(i + 4) * 340 * E.o3(clamp(k * 1.4)); T(c, { x: Math.cos(a) * d2, y: Math.sin(a) * d2 + k * k * 220, r: k * 640 * (rnd(i) + .3), o: 1 - k * k }); });
    };
  });

  /* ---- S10 : gift = "thank you all" ---- */
  add(24.4, 26.4, 'شكراً لكم', (ill) => {
    const dec = deco(ill, [[-400, -330, 'spark', 40, 0, K], [410, -330, 'plus', 30, 1, K], [-430, 240, 'plus', 26, 2, Yd], [430, 240, 'spark', 36, 3, Yd]]);
    groundShadow(ill, 380, 280);
    const box = mk(ill, `<rect x="-190" y="-10" width="380" height="390" rx="22" fill="${Y}"/><rect x="-190" y="-10" width="120" height="390" rx="22" fill="${Yd}" opacity=".45"/><rect x="-42" y="-10" width="84" height="390" fill="${K}"/>`);
    const lid = mk(ill, `<rect x="-230" y="-120" width="460" height="120" rx="24" fill="${Yd}"/><rect x="-42" y="-120" width="84" height="120" fill="${K}"/><ellipse cx="-70" cy="-150" rx="74" ry="44" fill="${K}" transform="rotate(-24 -70 -150)"/><ellipse cx="70" cy="-150" rx="74" ry="44" fill="${K}" transform="rotate(24 70 -150)"/><circle cy="-130" r="26" fill="${K2}"/>`);
    const fly = Array.from({ length: 9 }, (_, i) => mk(ill, i % 3 === 0 ? star5(K, 60) : i % 3 === 1 ? heart(Y, K, 10) : spark(Y)));
    return (lt, t) => {
      dec(lt, t);
      const b = popS(lt, .1, .6, E.back2); T(box, { y: mix(120, 0, p(lt, .1, .6, E.back)), s: b.s, o: b.o });
      const hop = lt < .8 ? 0 : p(lt, .8, .5, E.back2);
      const shake = lt > .55 && lt < .8 ? Math.sin(lt * 90) * 3 : 0;
      T(lid, { x: shake, y: mix(130, 0, p(lt, .1, .6, E.back)) - hop * 200, r: hop * -24 + shake, s: b.s, o: b.o });
      fly.forEach((f, i) => { const st = .85 + i * .035, k = (lt - st) / 1.0; if (k < 0 || k > 1) { T(f, { o: 0 }); return; }
        const a = -Math.PI / 2 + (i / 8 - .5) * 2.6, d = 340 * E.o3(k) + 40; T(f, { x: Math.cos(a) * d * 1.1, y: -150 + Math.sin(a) * d + k * k * 120, s: (.3 + rnd(i) * .18) * (1 - k * .3), r: k * 200 * (rnd(i + 3) - .5), o: Math.min(1, (1 - k) * 3) }); });
    };
  });

  /* ---- S11 : end card ---- */
  add(26.4, DURATION + .5, 'شكراً جزيلاً', (ill) => {
    const dec = deco(ill, [[-410, -340, 'plus', 30, 0, K], [420, -330, 'spark', 46, 1, Y], [-430, 260, 'spark', 38, 2, Yd], [425, 300, 'plus', 28, 3, K], [-350, 430, 'dot', 14, 4, Yd], [360, 440, 'dot', 12, 5, K], [-440, -60, 'dot', 12, 6, Y]]);
    const rip = [0, 1, 2].map(i => mk(ill, `<circle r="230" fill="none" stroke="${i % 2 ? K : Yd}" stroke-width="8"/>`));
    const c = mk(ill, '');
    const glow = mk(c, `<circle r="262" fill="${Yl}" opacity=".6"/>`);
    const orbit = mk(c, `<circle r="330" fill="none" stroke="${K}" stroke-opacity=".4" stroke-width="6" stroke-dasharray="2 24" stroke-linecap="round"/>`);
    const badge = mk(c, `<circle r="222" fill="${K}"/><circle r="206" fill="#FFF6CC"/><circle r="190" fill="none" stroke="${Y}" stroke-width="8"/><image href="assets/logo.png" x="-190" y="-215" width="380" height="438"/>`);
    const hs = [[-250, -230, .34], [270, -260, .44], [300, 250, .3], [-290, 260, .4]].map(([x, y, s], i) => ({ g: mk(c, heart(i % 2 ? K : Y, K, i % 2 ? 0 : 9)), x, y, s }));
    const sts = Array.from({ length: 6 }, (_, i) => mk(c, star5(i % 2 ? K : Yd, 30)));
    return (lt, t) => {
      dec(lt, t);
      rip.forEach((r, i) => { const k = ((lt * .55 + i / 3) % 1); T(r, { s: .9 + k * 1.05, o: lt > .4 ? (1 - k) * .8 : 0 }); });
      const a = popS(lt, .2, .8, E.back), b = popS(lt, .3, .85, E.back2);
      T(glow, { s: a.s * (1 + .03 * Math.sin(t * 3)), o: a.o }); T(orbit, { s: a.s, r: t * 9, o: a.o });
      T(badge, { s: b.s * (1 + .025 * Math.sin(t * 3.2)), r: mix(-60, 0, p(lt, .3, .9, E.expo)), o: b.o });
      hs.forEach((h, i) => { const k = popS(lt, .7 + i * .13, .6, E.back2); T(h.g, { x: h.x + Math.sin(t * 2 + i) * 10, y: h.y + Math.sin(t * 2.5 + i * 2) * 14, s: h.s * k.s * (1 + .08 * Math.sin(t * 6 + i)), r: Math.sin(t * 2.4 + i) * 12, o: k.o }); });
      sts.forEach((s, i) => { const k = popS(lt, 1.0 + i * .1, .5, E.back), ang = t * .9 + i * Math.PI / 3; T(s, { x: Math.cos(ang) * 330 * k.s, y: Math.sin(ang) * 330 * k.s, s: k.s * (1 + .2 * Math.sin(t * 4 + i)), r: t * 60, o: k.o }); });
      T(c, { y: Math.sin(t * 1.6) * 8 });
    };
  });
}

/* ---------- background: soft gradient, bokeh, clouds, floating marks ---------- */
let bgParts = [];
function initBg() {
  const bg = $('#bg');
  const cloud = mk(bg, `<g opacity=".9"><path d="M-60 1560 C 60 1420 220 1450 300 1520 C 380 1440 560 1430 640 1530 C 730 1450 900 1460 980 1540 C 1040 1500 1100 1520 1140 1560 L1140 1700 L-60 1700Z" fill="url(#cloudG)"/></g>`);
  const cloud2 = mk(bg, `<path d="M-60 1610 C 80 1520 260 1540 360 1600 C 470 1530 640 1530 720 1610 C 820 1540 990 1550 1140 1630 L1140 1760 L-60 1760Z" fill="#fff" opacity=".9"/>`);
  bgParts.push({ g: cloud, kind: 'cloud', a: 14, sp: .25, ph: 0 }, { g: cloud2, kind: 'cloud', a: -10, sp: .21, ph: 2 });
  for (let i = 0; i < 9; i++) { const g = mk(bg, `<circle r="${70 + rnd(i) * 90}" fill="url(#bokeh)"/>`); bgParts.push({ g, kind: 'bokeh', x: rnd(i + 20) * 1080, y: 380 + rnd(i + 40) * 1150, sp: .12 + rnd(i + 60) * .2, ph: rnd(i + 80) * 6 }); }
  for (let i = 0; i < 6; i++) { const g = mk(bg, i % 2 ? plus(Yd) : `<circle r="16" fill="${K}"/>`); bgParts.push({ g, kind: 'mark', x: 60 + rnd(i + 120) * 960, y: 480 + rnd(i + 140) * 1000, s: .16 + rnd(i) * .1, sp: .4 + rnd(i + 3) * .3, ph: rnd(i + 5) * 6, odd: i % 2 }); }
  // soft curved dotted path like the reference world-map orbit
  bgParts.push({ g: mk(bg, `<path d="M-40 1200 C 260 900 520 1380 1120 880" fill="none" stroke="${K}" stroke-opacity=".12" stroke-width="5" stroke-dasharray="2 22" stroke-linecap="round"/>`), kind: 'curve' });
  const hud = $('#hud');
  bgParts.hud = mk(hud, `<rect x="0" y="1906" width="1080" height="14" fill="${K}" opacity=".12"/><rect id="pb" x="0" y="1906" width="0" height="14" fill="${K}"/><rect id="pb2" x="0" y="1906" width="0" height="14" fill="${Y}"/>`);
}
function updateBg(t) {
  bgParts.forEach(b => {
    if (b.kind === 'cloud') T(b.g, { x: Math.sin(t * b.sp + b.ph) * b.a, y: Math.sin(t * .6 + b.ph) * 6 });
    else if (b.kind === 'bokeh') T(b.g, { x: b.x + Math.sin(t * b.sp + b.ph) * 60, y: b.y - ((t * 14 * (b.sp * 4) + b.ph * 90) % 240) * .3, s: 1 + .12 * Math.sin(t * .8 + b.ph), o: .55 });
    else if (b.kind === 'mark') T(b.g, { x: b.x + Math.sin(t * b.sp + b.ph) * 30, y: b.y + Math.cos(t * b.sp * 1.3 + b.ph) * 40, s: b.s * (.8 + .3 * Math.sin(t * 2.5 + b.ph)) * (b.odd ? 1 : 1.3), r: t * 20, o: .55 });
  });
  const pb = $('#pb'), pb2 = $('#pb2'); const w = 1080 * clamp(t / DURATION); pb.setAttribute('width', w); pb2.setAttribute('width', Math.max(0, w - 14)); pb2.setAttribute('x', 0);
}

/* =====================================================================
   TRANSITIONS  (After-Effects style: shape-morph reveals, radial clock wipe, liquid, halftone dots,
   blinds, whip-pan with motion blur, zoom-through with speed lines, slanted slit, confetti sparks)
   Two families:
     R = "reveal": the incoming scene is clipped by an animated shape on top of the outgoing scene
     C = "cover": animated shapes cover the screen, the scenes swap at the midpoint, shapes uncover
   ===================================================================== */
const LEAD = .2, TW = .8, HARD_CUTS = true;   // true = plain cuts, no transitions
const SH = {
  circle: th => 1,
  flower: th => .72 + .28 * Math.cos(6 * th),
  star: th => { const f = Math.abs((((th / (Math.PI / 5)) % 2) + 2) % 2 - 1); return .4 + .6 * f; },
  squircle: th => { const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)); return 1 / Math.pow(Math.pow(c, 4) + Math.pow(s, 4), .25) / 1.19; },
};
(function heartTable() {
  const B = 180, tab = new Array(B).fill(0);
  for (let i = 0; i < 6000; i++) {
    const t = i / 6000 * 2 * Math.PI, x = 16 * Math.pow(Math.sin(t), 3), y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const th = Math.atan2(y, x), r = Math.hypot(x, y), b = Math.floor(((th + Math.PI) / (2 * Math.PI)) * B) % B; if (r > tab[b]) tab[b] = r;
  }
  const mx = Math.max(...tab); for (let b = 0; b < B; b++) tab[b] /= mx;
  SH.heart = th => { const a = (((th + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), f = a / (2 * Math.PI) * B, i = Math.floor(f) % B, k = f - Math.floor(f); return mix(tab[i], tab[(i + 1) % B], k); };
})();
const morphFn = (list, w) => { const i = Math.min(list.length - 2, Math.floor(w)), k = E.io(clamp(w - i)), A = SH[list[i]], Bf = SH[list[i + 1]]; return th => mix(A(th), Bf(th), k); };
function blobPath(fn, cx, cy, sc, rot, N = 150) {
  let d = ''; for (let i = 0; i < N; i++) { const th = i / N * 2 * Math.PI, r = fn(th - rot) * sc; d += (i ? 'L' : 'M') + (cx + Math.cos(th) * r).toFixed(1) + ' ' + (cy + Math.sin(th) * r).toFixed(1); }
  return d + 'Z';
}
const io5 = x => x < .5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2;
const ioExpo = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
const dist4 = (cx, cy) => Math.max(Math.hypot(cx, cy), Math.hypot(1080 - cx, cy), Math.hypot(cx, 1920 - cy), Math.hypot(1080 - cx, 1920 - cy));
const setInner = (sc, s, dx = 0, dy = 0) => sc.inner.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) translate(540 960) scale(${s.toFixed(4)}) translate(-540 -960)`);
const blur = (sc, id, sx, sy) => { if (sx < .3 && sy < .3) { sc.g.removeAttribute('filter'); return; } $('#' + id + 'g').setAttribute('stdDeviation', `${sx.toFixed(1)} ${sy.toFixed(1)}`); sc.g.setAttribute('filter', `url(#${id})`); };
const attrs = (e, at) => { for (const k in at) e.setAttribute(k, at[k]); };

const TR = [
  { k: 'blob', C: 0, o: [540, 1030], list: ['flower', 'circle'], rot: 1.3 },          // logo badge opens as a morphing flower portal
  { k: 'dots', C: 1 },                                                                   // halftone dots
  { k: 'push', C: 0 },                                                                   // whip-pan with motion blur + colour streaks
  { k: 'pie', C: 0, o: [540, 1000] },                                                    // radial clock wipe
  { k: 'blinds', C: 1 },                                                                 // blinds
  { k: 'zoom', C: 0 },                                                                   // zoom-through + speed lines
  { k: 'slit', C: 0 },                                                                   // slanted slit opening
  { k: 'blob', C: 0, o: [540, 1000], list: ['star', 'squircle', 'circle'], rot: 1.7 },   // star -> squircle -> circle morph
  { k: 'liquid', C: 1 },                                                                 // liquid wave
  { k: 'blob', C: 0, o: [540, 1010], list: ['heart', 'circle'], rot: 0, sparks: 1 },     // heart morph + confetti
];

function initTrans() {
  const tr = $('#trans'), defs = $('#stage defs');
  TR.forEach((c, i) => {
    c.T = scenes[i + 1].t0;
    c.ts = c.C ? c.T - LEAD - TW / 2 : c.T - LEAD;
    c.g = mk(tr, ''); c.g.style.display = 'none';
    const ns = (tag, at = {}, par = c.g) => { const e = document.createElementNS(NS, tag); attrs(e, at); par.appendChild(e); return e; };
    if (c.k === 'blob' || c.k === 'pie' || c.k === 'slit') { const cp = ns('clipPath', { id: 'ck' + i }, defs); c.clip = ns('path', {}, cp); }
    if (c.k === 'blob') {
      c.kA = ns('path', { fill: 'none', stroke: K, 'stroke-width': 30, 'stroke-linejoin': 'round' });
      c.yA = ns('path', { fill: 'none', stroke: Y, 'stroke-width': 16, 'stroke-linejoin': 'round' });
      c.kB = ns('path', { fill: 'none', stroke: K, 'stroke-width': 6, 'stroke-linejoin': 'round' });
      c.sp = Array.from({ length: c.sparks ? 18 : 10 }, (_, j) => mk(c.g, j % 3 === 0 ? star5(K, 60) : j % 3 === 1 ? spark(Y) : heart(Y, K, 10)));
    }
    if (c.k === 'pie') {
      c.ln = [0, 1, 2, 3].map(j => ({ k: ns('line', { stroke: K, 'stroke-width': 40 - j * 8, 'stroke-linecap': 'round' }), y: ns('line', { stroke: Y, 'stroke-width': 24 - j * 5, 'stroke-linecap': 'round' }) }));
      c.hub = mk(c.g, `<circle r="58" fill="${K}"/><circle r="36" fill="${Y}"/>`);
    }
    if (c.k === 'slit') { c.bK = ns('polygon', { fill: K }); c.bY = ns('polygon', { fill: Y }); c.bK2 = ns('polygon', { fill: K }); c.bY2 = ns('polygon', { fill: Y }); }
    if (c.k === 'dots') {
      c.cols = 6; c.rows = 11; c.cell = 180; c.dots = [];
      for (let r = 0; r < c.rows; r++) for (let q = 0; q < c.cols; q++) c.dots.push({ r, q, K: ns('circle', { fill: K }), Y: ns('circle', { fill: Y }), K2: ns('circle', { fill: K }) });
    }
    if (c.k === 'blinds') { c.n = 8; c.sl = Array.from({ length: c.n }, (_, j) => ({ r: ns('rect', { x: -20, width: 1120, fill: j % 2 ? K : Y }), s: ns('rect', { x: -20, width: 1120, fill: j % 2 ? Y : K }) })); }
    if (c.k === 'zoom') {
      c.lines = Array.from({ length: 34 }, (_, j) => ns('line', { stroke: j % 2 ? K : Y, 'stroke-linecap': 'round', 'stroke-width': 6 + (j % 3) * 5 }));
      c.flash = ns('circle', { r: 10, fill: Y, cx: 540, cy: 960 });
    }
    if (c.k === 'push') { c.pY = ns('polygon', { fill: Y }); c.pK = ns('polygon', { fill: K }); c.pY2 = ns('polygon', { fill: Yd }); }
    if (c.k === 'liquid') c.lay = [Yd, Y, K].map(col => ns('path', { fill: col }));
  });
  // visibility window of each scene (incoming starts LEAD before its cue so its entrance plays under the transition)
  scenes.forEach((s, i) => {
    s.vs = i === 0 ? -1 : s.t0 - LEAD;
    const nx = TR[i]; s.ve = nx ? (nx.C ? nx.ts + TW / 2 : nx.ts + TW) : 1e9;
    s.lead = i === 0 ? 0 : LEAD;
    if (HARD_CUTS) { s.vs = i === 0 ? -1 : s.t0; s.ve = scenes[i + 1] ? scenes[i + 1].t0 : 1e9; s.lead = 0; }
  });
}

function applyTrans(c, i, t) {
  const u = (t - c.ts) / TW, A = scenes[i], B = scenes[i + 1];
  if (u <= 0 || u >= 1) { c.g.style.display = 'none'; return; }
  c.g.style.display = '';
  if (c.k === 'blob') {
    const [cx, cy] = c.o, e = E.io(u), Rc = dist4(cx, cy) * 1.06, sc = Rc * Math.pow(e, 1.15) + 4, w = clamp(u / .8) * (c.list.length - 1);
    const fn = morphFn(c.list, w), rot = c.rot * u * 2.2, d = blobPath(fn, cx, cy, sc, rot);
    c.clip.setAttribute('d', d); B.g.setAttribute('clip-path', `url(#ck${i})`);
    c.kA.setAttribute('d', d); c.yA.setAttribute('d', blobPath(fn, cx, cy, sc * .955, rot)); c.kB.setAttribute('d', blobPath(fn, cx, cy, sc * .91, rot));
    setInner(A, mix(1, .9, e)); setInner(B, mix(1.1, 1, E.o3(u)));
    const fade = clamp((u - .05) * 6) * clamp((.95 - u) * 6);
    c.sp.forEach((g, j) => { const th = j / c.sp.length * 2 * Math.PI + j * .31, r = fn(th - rot) * sc + 30 + 70 * rnd(j + 9) * Math.sin(u * 3);
      T(g, { x: cx + Math.cos(th) * r, y: cy + Math.sin(th) * r, s: (.22 + rnd(j) * .22) * fade, r: u * 500 * (rnd(j + 2) - .5), o: fade }); });
  } else if (c.k === 'pie') {
    const [cx, cy] = c.o, e = E.io(u), ph = e * 2 * Math.PI, a0 = -Math.PI / 2, Rr = 2600;
    const d = ph >= 2 * Math.PI - .001 ? 'M-200 -200H1300V2200H-200Z' : `M${cx} ${cy}L${cx + Rr * Math.cos(a0)} ${cy + Rr * Math.sin(a0)}A${Rr} ${Rr} 0 ${ph > Math.PI ? 1 : 0} 1 ${cx + Rr * Math.cos(a0 + ph)} ${cy + Rr * Math.sin(a0 + ph)}Z`;
    c.clip.setAttribute('d', d); B.g.setAttribute('clip-path', `url(#ck${i})`);
    c.ln.forEach((l, j) => { const a = a0 + Math.max(0, ph - j * .09), op = (1 - j * .28) * (ph > .02 ? 1 : 0);
      [l.k, l.y].forEach(el => attrs(el, { x1: cx, y1: cy, x2: cx + Rr * Math.cos(a), y2: cy + Rr * Math.sin(a), opacity: op })); });
    T(c.hub, { x: cx, y: cy, s: 1 + .25 * Math.sin(u * Math.PI), o: clamp(u * 12) * clamp((1 - u) * 12) });
    setInner(A, mix(1, .93, e)); setInner(B, mix(1.08, 1, E.o3(u)));
  } else if (c.k === 'slit') {
    const sk = 200, hwOf = lag => 1000 * Math.min(1, E.back(clamp((u - lag) * 1.05))) + 4, hw = hwOf(0);
    c.clip.setAttribute('d', `M${540 - hw + sk} -60L${540 + hw + sk} -60L${540 + hw - sk} 1980L${540 - hw - sk} 1980Z`); B.g.setAttribute('clip-path', `url(#ck${i})`);
    const edge = (sgn, el, w, lag) => { const h2 = hwOf(lag), xt = 540 + sgn * h2 + (sgn > 0 ? sk : -sk) * 0 + sk, xb = 540 + sgn * h2 - sk;
      el.setAttribute('points', `${xt},-60 ${xt + sgn * w},-60 ${xb + sgn * w},1980 ${xb},1980`); };
    edge(1, c.bY, 130, .03); edge(1, c.bK, 46, 0); edge(-1, c.bY2, 130, .03); edge(-1, c.bK2, 46, 0);
    setInner(A, mix(1, .92, E.io(u))); setInner(B, mix(1.06, 1, E.o3(u)));
  } else if (c.k === 'push') {
    const e = ioExpo(u), dx = 1080 * e, bl = 90 * Math.sin(Math.PI * u), sk = 120;
    setInner(A, 1, dx, 0); setInner(B, 1, dx - 1080, 0); blur(A, 'fbA', bl, 0); blur(B, 'fbB', bl, 0);
    const pg = (el, off, w) => el.setAttribute('points', `${dx + off + sk},-60 ${dx + off + w + sk},-60 ${dx + off + w - sk},1980 ${dx + off - sk},1980`);
    const fade = Math.sin(Math.PI * u);
    [c.pY, c.pK, c.pY2].forEach(el => el.style.opacity = clamp(fade * 3));
    pg(c.pY2, -210 * fade - 40, 120); pg(c.pY, -90 * fade - 10, 110); pg(c.pK, -20, 46);
  } else if (c.k === 'zoom') {
    const e = io5(clamp(u * 1.05)), a = Math.sin(Math.PI * clamp((u - .1) / .8));
    setInner(A, 1 + 2.6 * e); A.g.style.opacity = clamp(1 - (u - .15) * 2.6); blur(A, 'fbA', 26 * e, 26 * e);
    setInner(B, mix(.38, 1, E.o5(u))); B.g.style.opacity = clamp((u - .12) * 3); blur(B, 'fbB', 22 * (1 - E.o3(u)), 22 * (1 - E.o3(u)));
    c.lines.forEach((l, j) => { const th = j / c.lines.length * 2 * Math.PI + rnd(j) * .1, r0 = 120 + 160 * rnd(j + 4) + 900 * E.io(u), len = (200 + 700 * rnd(j + 8)) * a;
      attrs(l, { x1: 540 + Math.cos(th) * r0, y1: 960 + Math.sin(th) * r0, x2: 540 + Math.cos(th) * (r0 + len), y2: 960 + Math.sin(th) * (r0 + len), opacity: a * .95 }); });
    attrs(c.flash, { r: 80 + 700 * a * a, opacity: .55 * Math.pow(a, 3) });
  } else if (c.k === 'dots') {
    const n = c.cols + c.rows - 2;
    c.dots.forEach(d => { const nrm = (d.q + d.r) / n, cover = clamp((u - nrm * .26) / .24), unc = clamp((u - .5 - (1 - nrm) * .26) / .24);
      const s = Math.max(0, E.back(cover) * (1 - E.io(unc))), rr = 142 * s, x = d.q * c.cell + c.cell / 2, y = d.r * c.cell + c.cell / 2;
      attrs(d.K, { cx: x, cy: y, r: rr }); attrs(d.Y, { cx: x, cy: y, r: rr * .72 }); attrs(d.K2, { cx: x, cy: y, r: rr * .3 }); });
  } else if (c.k === 'blinds') {
    const h = 240;
    c.sl.forEach((s, j) => { const cover = E.io(clamp((u - j * .038) / .22)), unc = E.io(clamp((u - .5 - (c.n - 1 - j) * .038) / .22));
      const y0 = j * h - 2, bottom = y0 + (h + 4) * cover, top = y0 + (h + 4) * unc, hh = Math.max(0, bottom - top);
      attrs(s.r, { y: top, height: hh }); attrs(s.s, { y: top + hh * .66, height: hh * .34 }); });
  } else if (c.k === 'liquid') {
    const lag = [0, .05, .1];
    c.lay.forEach((el, j) => { const cov = E.io(clamp((u - lag[j]) / .38)), unc = E.io(clamp((u - .5 - lag[j]) / .38));
      const top = 2040 - 2400 * cov, bot = 2040 - 2400 * unc; let d = '', dB = '';
      for (let x = -40; x <= 1120; x += 20) { const w = 70 * Math.sin(x * .009 + t * 7 + j) + 40 * Math.sin(x * .017 - t * 5 + j * 2); d += (d ? 'L' : 'M') + x + ' ' + (top + w).toFixed(1); }
      for (let x = 1120; x >= -40; x -= 20) { const w = 70 * Math.sin(x * .009 + t * 7 + j + 1) + 40 * Math.sin(x * .017 - t * 5 + j * 2 + 1); dB += 'L' + x + ' ' + (bot + w * (unc > 0 ? 1 : 0)).toFixed(1); }
      el.setAttribute('d', d + dB + 'Z'); });
  }
}
function updateTrans(t) {
  scenes.forEach(s => { s.g.removeAttribute('clip-path'); s.g.removeAttribute('filter'); s.g.style.opacity = 1; s.inner.removeAttribute('transform'); });
  if (!HARD_CUTS) TR.forEach((c, i) => applyTrans(c, i, t));
}

/* ---------- main ---------- */
function renderFrame(t) {
  updateBg(t);
  scenes.forEach(s => {
    const on = t >= s.vs && t < s.ve;
    s.g.style.display = on ? '' : 'none';
    if (on) { const lt = t - s.t0 + s.lead; s.ban(lt); s.upd(lt, t); T(s.ill, { x: 540, y: 1030 + (1 - p(lt, .05, .5, E.o3)) * 30, s: 1.1 }); }
  });
  updateTrans(t);
}
window.renderFrame = renderFrame;
window.DURATION = DURATION;
window.ready = (async () => {
  try { await Promise.all([document.fonts.load('900 60px Cairo', 'شكراً'), document.fonts.load('900 60px Cairo', 'Y&V')]); await document.fonts.ready; } catch (e) { }
  try { const im = new Image(); im.src = 'assets/logo.png'; await im.decode(); } catch (e) { }
  initBg(); initScenes(); initTrans(); renderFrame(0);
  return true;
})();
