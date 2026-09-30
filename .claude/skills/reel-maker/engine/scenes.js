// Deterministic frame renderer: window.setT(t) draws the whole reel at time t (seconds).
const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const eo3 = x => 1 - Math.pow(1 - clamp(x), 3);
const eoB = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const prog = (t, a, d) => clamp((t - a) / d);
const stage = document.getElementById('stage');
let TL = null, P = [], DUR = 65.2;
const pending = [];

function mk(tag, cls, parent, html, st) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (st) Object.assign(e.style, st);
  (parent || stage).appendChild(e);
  return e;
}
function setImg(img, src) {
  if (img._src === src) return;
  img._src = src; img.src = src;
  pending.push(img.decode().catch(() => {}));
}
const T = i => P[i].t0;           // start of phrase i
const TE = i => P[i].t1;
const place = (e, x, y, w, h) => Object.assign(e.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
const vis = (e, v) => { e.style.opacity = v; e.style.display = v <= 0.001 ? 'none' : 'block'; };
// pop-in: scale + fade from time a
function pop(e, t, a, d = 0.45, dy = 0) {
  const p = eoB(prog(t, a, d)), o = clamp(prog(t, a, 0.15));
  e.style.opacity = o; e.style.display = o <= 0 ? 'none' : '';
  e.style.transform = `translateY(${(1 - p) * dy}px) scale(${0.6 + 0.4 * p})`;
}
function slideIn(e, t, a, dx = 500, d = 0.5) {
  const p = eo3(prog(t, a, d));
  e.style.opacity = clamp(prog(t, a, 0.2)); e.style.display = e.style.opacity <= 0 ? 'none' : '';
  e.style.transform = `translateX(${(1 - p) * dx}px)`;
}

// ---------- geometry of the real UI panel (source image 1040x1500) ----------
const PN = { x: 82, y: 250, s: 0.88 };
const ux = v => PN.x + v * PN.s, uy = v => PN.y + v * PN.s;

// ---------- background ----------
const bg = mk('div', 'layer', stage);
bg.style.background = 'radial-gradient(900px 700px at 20% 15%,rgba(255,210,0,.12),transparent 60%),radial-gradient(800px 800px at 85% 75%,rgba(255,170,0,.10),transparent 60%),#090A0C';
const grid = mk('div', 'layer', stage);
grid.style.backgroundImage = 'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)';
grid.style.backgroundSize = '90px 90px';

// ---------- scenes ----------
const scenes = [];
function scene(a, b, build, upd) {
  const el = mk('div', 'layer', stage);
  const s = { el, a, b, upd, st: build(el) };
  scenes.push(s); return s;
}
function cursorEl(parent) {
  const c = mk('div', '', parent, '<svg width="70" height="70" viewBox="0 0 24 24"><path d="M3 2l7 19 3-8 8-3z" fill="#fff" stroke="#000" stroke-width="1.5"/></svg>', { position: 'absolute', zIndex: 50 });
  return c;
}
function moveCursor(c, t, tc, x, y, fx = -200, fy = 300) {
  // moves from (x+fx,y+fy) to (x,y) finishing at tc; visible tc-0.8..tc+0.9
  const p = eo3(prog(t, tc - 0.8, 0.8));
  const cx = x + fx * (1 - p), cy = y + fy * (1 - p);
  c.style.left = cx + 'px'; c.style.top = cy + 'px';
  const o = clamp(prog(t, tc - 0.85, 0.15)) * (1 - clamp(prog(t, tc + 0.6, 0.3)));
  c.style.opacity = o; c.style.display = o <= 0 ? 'none' : '';
  c.style.transform = `scale(${t > tc && t < tc + 0.18 ? 0.85 : 1})`;
}
function rippleSet(parent, n = 2) { return Array.from({ length: n }, () => mk('div', 'ripple', parent)); }
function doRipple(rs, t, tc, x, y) {
  rs.forEach((r, i) => {
    const p = prog(t, tc + i * 0.18, 0.7);
    r.style.left = x + 'px'; r.style.top = y + 'px';
    const s = 1 + p * 6;
    r.style.transform = `translate(-50%,-50%) scale(${s})`;
    r.style.opacity = p <= 0 || p >= 1 ? 0 : 1 - p;
  });
}
function ring(parent) { return mk('div', 'ring', parent); }
function setRing(r, t, a, b, x, y, w, h, pulse = true) {
  const o = clamp(prog(t, a, 0.2)) * (1 - clamp(prog(t, b, 0.25)));
  r.style.opacity = o; r.style.display = o <= 0 ? 'none' : '';
  const k = pulse ? 1 + 0.03 * Math.sin(t * 9) : 1;
  place(r, x - w / 2 * k, y - h / 2 * k, w * k, h * k);
}


// ---- 3D neural sphere with a glass "AI" orb (canvas) ----
const ORB_PTS = (() => { const n = 78, a = []; for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), th = i * 2.399963; a.push([Math.cos(th) * r, y, Math.sin(th) * r]); } return a; })();
function drawAIOrb(c, t, on, grow) {
  const cx = 540, cy = 520, g = eoB(grow), R = 400 * g, orbR = 215 * g, ry = t * 0.5, rx = 0.42;
  const pr = ORB_PTS.map(p => {
    const x1 = p[0] * Math.cos(ry) + p[2] * Math.sin(ry), z1 = -p[0] * Math.sin(ry) + p[2] * Math.cos(ry);
    const y2 = p[1] * Math.cos(rx) - z1 * Math.sin(rx), z2 = p[1] * Math.sin(rx) + z1 * Math.cos(rx);
    const k = 1200 / (1200 + z2 * R);
    return { x: cx + x1 * R * k, y: cy + y2 * R * k * 0.9, z: z2, k };
  });
  c.save(); c.globalAlpha = on;
  // ambient glow
  const bgG = c.createRadialGradient(cx, cy, 20, cx, cy, 560);
  bgG.addColorStop(0, 'rgba(255,190,0,.30)'); bgG.addColorStop(1, 'rgba(255,190,0,0)'); c.fillStyle = bgG; c.fillRect(0, 0, 1080, 1200);
  const links = front => {
    for (let i = 0; i < pr.length; i++) for (let j = i + 1; j < pr.length; j++) {
      const A = pr[i], B = pr[j]; if ((A.z <= 0) !== front || (B.z <= 0) !== front) continue;
      const d = Math.hypot(ORB_PTS[i][0] - ORB_PTS[j][0], ORB_PTS[i][1] - ORB_PTS[j][1], ORB_PTS[i][2] - ORB_PTS[j][2]);
      if (d > 0.6) continue;
      const pulse = 0.55 + 0.45 * Math.sin(t * 5 + i * 1.7);
      c.strokeStyle = `rgba(255,${front ? 214 : 170},${front ? 60 : 0},${(1 - d / 0.6) * (front ? 0.95 : 0.35) * pulse})`;
      c.lineWidth = (front ? 3 : 1.6) * (0.6 + 0.4 * (A.k + B.k) / 2 * 1.0);
      c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
    }
  };
  const nodes = front => pr.forEach((p, i) => {
    if ((p.z <= 0) !== front) return;
    const r = (front ? 8.5 : 5) * p.k * (1 + 0.25 * Math.sin(t * 6 + i));
    const ng = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.6);
    ng.addColorStop(0, front ? '#fff7c2' : 'rgba(255,200,60,.8)'); ng.addColorStop(0.35, front ? '#FFD200' : 'rgba(255,190,0,.5)'); ng.addColorStop(1, 'rgba(255,190,0,0)');
    c.fillStyle = ng; c.beginPath(); c.arc(p.x, p.y, r * 2.6, 0, 7); c.fill();
  });
  links(false); nodes(false);
  // glass orb
  c.save();
  c.beginPath(); c.arc(cx, cy, orbR, 0, 7); c.fillStyle = '#08090b'; c.fill();
  const body = c.createRadialGradient(cx - orbR * .35, cy - orbR * .4, orbR * .05, cx, cy, orbR);
  body.addColorStop(0, 'rgba(255,214,90,.55)'); body.addColorStop(0.45, 'rgba(255,170,0,.16)'); body.addColorStop(1, 'rgba(255,140,0,.02)');
  c.fillStyle = body; c.fill();
  const rim = c.createRadialGradient(cx, cy, orbR * .8, cx, cy, orbR);
  rim.addColorStop(0, 'rgba(255,210,0,0)'); rim.addColorStop(1, 'rgba(255,210,0,.85)'); c.fillStyle = rim; c.fill();
  c.lineWidth = 6; c.strokeStyle = '#FFD200'; c.shadowColor = '#FFB800'; c.shadowBlur = 50; c.stroke(); c.shadowBlur = 0;
  // specular highlight + lower bounce light
  c.save(); c.translate(cx - orbR * .38, cy - orbR * .5); c.rotate(-0.6);
  const sp = c.createRadialGradient(0, 0, 0, 0, 0, orbR * .38); sp.addColorStop(0, 'rgba(255,255,255,.75)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
  c.scale(1, 0.45); c.fillStyle = sp; c.beginPath(); c.arc(0, 0, orbR * .38, 0, 7); c.fill(); c.restore();
  c.beginPath(); c.arc(cx, cy, orbR * .93, 0.25 * Math.PI, 0.75 * Math.PI); c.strokeStyle = 'rgba(255,220,120,.35)'; c.lineWidth = 8; c.stroke();
  c.restore();
  // extruded 3D "AI" text, perfectly centered (measured)
  c.save(); c.font = `900 ${Math.round(190 * g)}px Cairo`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.direction = 'ltr';
  const m = c.measureText('AI'), asc = m.actualBoundingBoxAscent, ty = cy + asc / 2;
  for (let d = 16; d >= 1; d--) { c.fillStyle = `rgb(${90 + d * 2},${60 + d},0)`; c.fillText('AI', cx + d * 0.55, ty + d * 0.85); }
  const tg = c.createLinearGradient(0, ty - asc, 0, ty); tg.addColorStop(0, '#fff8d0'); tg.addColorStop(0.5, '#FFD200'); tg.addColorStop(1, '#ffa800');
  c.shadowColor = 'rgba(255,200,0,.9)'; c.shadowBlur = 40; c.fillStyle = tg; c.fillText('AI', cx, ty); c.shadowBlur = 0; c.restore();
  links(true); nodes(true);
  // tilted orbit rings with a travelling light
  [[0.5, 0.30, 1], [-0.55, 0.26, -1]].forEach(([tilt, sq, dir]) => {
    c.save(); c.translate(cx, cy); c.rotate(tilt + t * 0.12 * dir); c.scale(1, sq);
    c.beginPath(); c.arc(0, 0, R * 0.98, 0, 7); c.strokeStyle = 'rgba(255,210,0,.5)'; c.lineWidth = 4 / sq * 0.4; c.stroke();
    const a = t * 1.6 * dir; c.beginPath(); c.arc(Math.cos(a) * R * .98, Math.sin(a) * R * .98, 16 / Math.sqrt(sq) * .5, 0, 7);
    c.fillStyle = '#fff'; c.shadowColor = '#FFD200'; c.shadowBlur = 40; c.fill(); c.restore();
  });
  // shockwave rings
  for (let i = 0; i < 3; i++) { const p = ((t * 0.6) + i / 3) % 1; c.beginPath(); c.arc(cx, cy, orbR * (1 + p * 1.5), 0, 7); c.strokeStyle = `rgba(255,210,0,${(1 - p) * 0.35})`; c.lineWidth = 4; c.stroke(); }
  c.restore();
}
// ================= helper visuals =================
const show = (e, v) => { e.style.opacity = v; e.style.display = v <= 0.001 ? 'none' : 'block'; };
const lerp = (a, b, k) => a + (b - a) * k;
function svgEl(html, parent, st) { const d = mk('div', '', parent, html, { position: 'absolute', ...st }); return d; }
function bigEmoji(parent, ch, x, y, size, extra) { return mk('div', '', parent, ch, { position: 'absolute', left: x + 'px', top: y + 'px', fontSize: size + 'px', lineHeight: 1, transform: 'translate(-50%,-50%)', textAlign: 'center', ...extra }); }
function setXf(e, x, y, s = 1, r = 0) { e.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`; }

// one hero per beat: visibility window with clean fade in/out
const beat = (t, a, b, f = 0.25) => Math.min(prog(t, a, f), 1 - prog(t, b - f, f));

// ================= S1  HOOK : ONE hero = the timeline being cut by hand, then the 2026 calendar =================
scene(0, 6.3, el => {
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '640px' });
  const cal = mk('div', '', el, '', { position: 'absolute', left: '190px', top: '560px', width: '700px', height: '760px', borderRadius: '44px', background: '#f5f5f7', boxShadow: '0 40px 120px rgba(0,0,0,.7)', overflow: 'hidden', transformOrigin: '50% 0' });
  cal.innerHTML = '<div style="height:160px;background:#e5334b"></div><div style="position:absolute;left:0;right:0;top:200px;text-align:center;font-size:290px;font-weight:900;color:#15161a;direction:ltr;line-height:1.1">2026</div>' +
    '<svg width="700" height="760" style="position:absolute;left:0;top:0"><line class="x1" x1="120" y1="230" x2="580" y2="690" stroke="#e5334b" stroke-width="46" stroke-linecap="round" stroke-dasharray="700" stroke-dashoffset="700"/><line class="x2" x1="580" y1="230" x2="120" y2="690" stroke="#e5334b" stroke-width="46" stroke-linecap="round" stroke-dasharray="700" stroke-dashoffset="700"/></svg>';
  return { tl, cal };
}, (t, s) => {
  const { tl, cal } = s.st;
  const razor = prog(t, 0.5, 2.6);
  tl.draw({ cuts: razor, razor: razor < 1 ? razor : -1, flagS: prog(t, 1.5, .5), flagR: prog(t, 2.0, .5), caps: prog(t, 1.6, 1.5), pulse: t, play: -1 });
  const v = beat(t, 0.05, 3.45, 0.3);
  tl.cv.style.opacity = v; tl.cv.style.display = v <= 0.001 ? 'none' : 'block';
  tl.cv.style.transform = `scale(${1 + 0.05 * prog(t, 0, 3.4)})`;
  const f = eoB(prog(t, 3.5, 0.6));
  cal.style.opacity = prog(t, 3.45, 0.2); cal.style.display = cal.style.opacity <= 0 ? 'none' : 'block';
  cal.style.transform = `perspective(1400px) rotateX(${(1 - f) * -90}deg) rotate(-4deg) scale(${0.9 + 0.1 * f})`;
  cal.querySelector('.x1').style.strokeDashoffset = 700 * (1 - eo3(prog(t, 4.3, 0.25)));
  cal.querySelector('.x2').style.strokeDashoffset = 700 * (1 - eo3(prog(t, 4.5, 0.25)));
});

// ================= S2  PROBLEM : REC -> the timeline (hero) -> giant clock -> stuck export =================
scene(6.0, 14.7, el => {
  const sky = mk('canvas', '', el, null, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' });
  sky.width = 540; sky.height = 960;
  const rec = mk('div', '', el, '', { position: 'absolute', left: '190px', top: '560px', width: '700px', height: '700px' });
  rec.innerHTML = ['top:0;left:0;border-width:10px 0 0 10px', 'top:0;right:0;border-width:10px 10px 0 0', 'bottom:0;left:0;border-width:0 0 10px 10px', 'bottom:0;right:0;border-width:0 10px 10px 0'].map(c => `<div style="position:absolute;width:120px;height:120px;border:solid #fff;${c}"></div>`).join('') +
    '<div style="position:absolute;left:40px;top:40px;display:flex;align-items:center;gap:18px;font-size:60px;font-weight:900;direction:ltr"><span class="dot" style="width:40px;height:40px;border-radius:50%;background:#ff2d55"></span>REC</div>' +
    '<div class="tc" style="position:absolute;left:0;right:0;top:300px;text-align:center;font-size:120px;font-weight:900;direction:ltr;font-variant-numeric:tabular-nums">00:00:00</div>';
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '640px' });
  const clock = mk('div', '', el, '', { position: 'absolute', left: '240px', top: '560px', width: '600px', height: '600px' });
  clock.innerHTML = '<svg width="600" height="600" viewBox="-125 -125 250 250"><circle r="118" fill="#101216" stroke="#FFD200" stroke-width="6"/>' + Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-98" x2="0" y2="-108" stroke="#fff" stroke-width="4" transform="rotate(${i * 30})"/>`).join('') + '<line class="hm" x1="0" y1="0" x2="0" y2="-74" stroke="#fff" stroke-width="7" stroke-linecap="round"/><line class="hh" x1="0" y1="0" x2="0" y2="-52" stroke="#FFD200" stroke-width="9" stroke-linecap="round"/><circle r="8" fill="#FFD200"/></svg>';
  const phone = mk('div', '', el, '', { position: 'absolute', left: '320px', top: '520px', width: '440px', height: '720px', borderRadius: '64px', background: '#0c0d10', border: '8px solid #2b2e35', boxShadow: '0 30px 80px rgba(0,0,0,.7)' });
  phone.innerHTML = '<svg width="424" height="704" viewBox="0 0 424 704"><circle cx="212" cy="300" r="120" fill="none" stroke="#2b2e35" stroke-width="28"/><circle class="ring" cx="212" cy="300" r="120" fill="none" stroke="#FFD200" stroke-width="28" stroke-linecap="round" stroke-dasharray="754" stroke-dashoffset="660" transform="rotate(-90 212 300)"/><rect x="72" y="520" width="280" height="80" rx="40" fill="#2b2e35"/><text x="212" y="330" fill="#ff5a70" font-size="110" text-anchor="middle" font-family="Noto Color Emoji">⚠️</text></svg>';
  return { sky, rec, tl, clock, phone };
}, (t, s) => {
  const { sky, rec, tl, clock, phone } = s.st;
  // time passes: sky goes from dusk to night (no objects, just mood)
  const c = sky.getContext('2d'), k = clamp((t - 6) / 8.4);
  const g = c.createLinearGradient(0, 0, 0, 960);
  const mix = (a, b) => a.map((v, i) => Math.round(lerp(v, b[i], k)));
  g.addColorStop(0, `rgb(${mix([64, 42, 14], [8, 10, 30])})`); g.addColorStop(1, `rgb(${mix([18, 14, 10], [9, 10, 12])})`);
  c.fillStyle = g; c.fillRect(0, 0, 540, 960);
  const r = rnd(7); c.fillStyle = '#fff';
  for (let i = 0; i < 50; i++) { const x = r() * 540, y = r() * 960; c.globalAlpha = k * 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + i)); c.fillRect(x, y, 2, 2); }
  c.globalAlpha = 1;
  // beat 1: REC
  const v1 = beat(t, T(2) - 0.15, T(3) - 0.05); show(rec, v1);
  rec.querySelector('.dot').style.opacity = Math.sin(t * 10) > 0 ? 1 : 0.2;
  const sec = Math.floor(Math.max(0, t - T(2)) * 40); rec.querySelector('.tc').textContent = `00:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  rec.style.transform = `scale(${0.9 + 0.1 * eo3(prog(t, T(2) - 0.15, 0.5))})`;
  // beat 2-4: ONE timeline, silences -> repeats -> captions (keeps the same hero)
  const v2 = beat(t, T(3) - 0.05, T(6) - 0.1);
  tl.draw({ cuts: prog(t, T(3) + 0.1, 1.9), razor: (t > T(3) + 0.1 && t < T(3) + 2.0) ? prog(t, T(3) + 0.1, 1.9) : -1, flagS: prog(t, T(3) + 0.5, .5), sil: prog(t, T(3) + 1.5, 1.4), flagR: prog(t, T(4), .4), rep: prog(t, T(4) + 0.5, 1.0), caps: prog(t, T(5), 3.0) * 0.9, pulse: t, play: -1 });
  tl.cv.style.opacity = v2; tl.cv.style.display = v2 <= 0.001 ? 'none' : 'block';
  tl.cv.style.transform = `scale(${0.96 + 0.06 * prog(t, T(3), T(6) - T(3))})`;
  // beat 5: giant clock
  const v5 = beat(t, T(6) - 0.05, T(7) - 0.05); show(clock, v5);
  const hrs = (t - T(6)) * 500 + 40;
  clock.querySelector('.hm').setAttribute('transform', `rotate(${hrs * 12})`); clock.querySelector('.hh').setAttribute('transform', `rotate(${hrs})`);
  clock.style.transform = `scale(${0.85 + 0.15 * eo3(prog(t, T(6) - 0.05, 0.5))})`;
  // beat 6: stuck export
  const v6 = prog(t, T(7) - 0.05, 0.3); show(phone, v6);
  phone.style.transform = `scale(${0.9 + 0.1 * eoB(prog(t, T(7) - 0.05, 0.5))}) rotate(${Math.sin(t * 20) * 1.0 * v6}deg)`;
  phone.querySelector('.ring').setAttribute('stroke-dashoffset', 660 - 18 * Math.sin(t * 3));
});

// ================= S3  SOLUTION : orb -> duck -> Pr + duck -> the wand cleans the timeline (one hero at a time) =================
scene(14.4, 20.2, el => {
  const net = mk('canvas', '', el, null, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1200px' }); net.width = 1080; net.height = 1200;
  const glow = mk('div', '', el, '', { position: 'absolute', left: '240px', top: '210px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,210,0,.5),transparent 65%)' });
  const duck = mk('img', '', el, null, { position: 'absolute', left: '320px', top: '290px', width: '440px', height: '440px', objectFit: 'contain' }); setImg(duck, 'assets/custom_duck.png');
  const ring1 = mk('div', '', el, '', { position: 'absolute', left: '280px', top: '250px', width: '520px', height: '520px', borderRadius: '50%', border: '8px solid #FFD200' });
  const name = mk('div', 'txt', el, 'Happy Duck AI', { top: '790px', fontSize: '116px', direction: 'ltr' });
  const row = mk('div', '', el, '', { position: 'absolute', left: '0', top: '640px', width: '1080px', height: '300px' });
  const pr = mk('div', '', row, 'Pr', { position: 'absolute', left: '110px', top: '20px', width: '260px', height: '260px', borderRadius: '60px', background: '#2c1f6b', border: '10px solid #9999ff', color: '#b3b3ff', fontSize: '160px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'ltr' });
  const plus = mk('div', '', row, '+', { position: 'absolute', left: '400px', top: '20px', width: '280px', textAlign: 'center', fontSize: '200px', fontWeight: '900', color: '#FFD200', lineHeight: '1.3' });
  const duck2 = mk('img', '', row, null, { position: 'absolute', left: '710px', top: '10px', width: '260px', height: '280px', objectFit: 'contain' }); setImg(duck2, 'assets/custom_duck.png');
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '640px' });
  const wand = bigEmoji(el, '🪄', 0, 0, 170);
  return { net, glow, duck, ring1, name, row, pr, plus, duck2, tl, wand };
}, (t, s) => {
  const { net, glow, duck, ring1, name, row, pr, plus, duck2, tl, wand } = s.st;
  const c = net.getContext('2d'); c.clearRect(0, 0, 1080, 1200);
  const on = beat(t, T(8) - 0.1, T(9) - 0.0, 0.3);
  if (on > 0) drawAIOrb(c, t, on, prog(t, T(8) - 0.1, 0.7));
  // duck + name
  const vd = beat(t, T(9) - 0.05, T(10) - 0.05, 0.3);
  const gp = eoB(prog(t, T(9) - 0.05, 0.6)); glow.style.opacity = clamp(gp) * vd; glow.style.transform = `scale(${0.5 + 0.6 * gp})`; glow.style.display = vd <= 0.001 ? 'none' : 'block';
  duck.style.opacity = vd; duck.style.display = vd <= 0.001 ? 'none' : 'block'; duck.style.transform = `scale(${0.6 + 0.4 * eoB(prog(t, T(9) - 0.05, 0.6))}) translateY(${Math.sin(t * 3) * 10}px)`;
  const rp = prog(t, T(9) - 0.05, 0.7); ring1.style.opacity = rp > 0 && rp < 1 ? 1 - rp : 0; ring1.style.transform = `scale(${1 + rp * 0.7})`;
  name.style.opacity = vd * prog(t, T(9) + 0.1, 0.3); name.style.display = vd <= 0.001 ? 'none' : 'block';
  // Pr + duck
  const vr = beat(t, T(10) - 0.05, T(11) - 0.1, 0.3); show(row, vr);
  const pa = eoB(prog(t, T(10) - 0.05, .5)), pb = eoB(prog(t, T(10) + 0.2, .5)), pc = eoB(prog(t, T(10) + 0.35, .5));
  pr.style.transform = `translateX(${(1 - pa) * -300}px) scale(${0.6 + 0.4 * pa})`; plus.style.transform = `scale(${pb})`; duck2.style.transform = `translateX(${(1 - pc) * 300}px) scale(${0.6 + 0.4 * pc})`;
  // the wand cleans the messy timeline
  const vt = beat(t, T(11) - 0.15, 20.3, 0.3), cln = prog(t, T(11) + 0.35, 1.3);
  tl.draw({ cuts: 1, flagS: 1 - prog(t, T(11) + 0.6, .4), flagR: 1 - prog(t, T(11) + 0.7, .4), sil: prog(t, T(11) + 0.6, 1.0), rep: prog(t, T(11) + 0.7, 1.0), clean: cln, pulse: t, play: -1, caps: 0 });
  tl.cv.style.opacity = vt; tl.cv.style.display = vt <= 0.001 ? 'none' : 'block';
  show(wand, prog(t, T(11) + 0.3, .25) * (1 - prog(t, T(11) + 1.7, .3)));
  setXf(wand, 90 + eo3(cln) * 880, 620 - Math.sin(cln * 3.14) * 60, 1, -25 + Math.sin(t * 20) * 10);
});

// ================= S4  SMART CUT =================
scene(19.8, 42.0, el => {
  const zb = mk('div', 'layer', el);
  const pan = mk('div', 'panel', zb, null, { left: PN.x + 'px', top: PN.y + 'px', width: (1040 * PN.s) + 'px', height: (1500 * PN.s) + 'px' });
  const imgs = {};
  ['01_smartcut_empty', '02_smartcut_waveform', '05_smartcut_progress'].forEach(n => { const im = mk('img', '', pan); setImg(im, `assets/ui_${n}.png`); imgs[n] = im; });
  const r1 = ring(zb), r2 = ring(zb), r3 = ring(zb);
  const cur = cursorEl(zb), rp = rippleSet(zb);
  const drag = bigEmoji(zb, '↕️', 0, 0, 130);
  // pick clip (real-looking timeline)
  const seld = mk('div', '', el, '', { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px', background: 'rgba(9,10,12,.7)' });
  const tls = makeTimeline(el, 980, 560, { left: '50px', top: '470px' });
  const cur2 = cursorEl(el);
  // word-boundary diagram (visual only)
  const dg = mk('div', '', el, '', { position: 'absolute', left: '50px', top: '300px', width: '980px', height: '1200px', background: '#111317', border: '3px solid rgba(255,210,0,.4)', borderRadius: '40px', boxShadow: '0 30px 90px rgba(0,0,0,.7)' });
  const words = [[80, 130], [240, 110], [380, 210], [620, 120], [770, 150]];
  const lane = (top, iconHtml) => { let h = `<div style="position:absolute;left:0;top:${top - 30}px;width:980px;height:400px"></div>`; words.forEach(w => { h += `<div style="position:absolute;left:${w[0]}px;top:${top + 90}px;width:${w[1]}px;height:170px;border-radius:16px;background:repeating-linear-gradient(90deg,#00e676 0 10px,#00b85c 10px 14px)"></div>`; }); return h + `<div style="position:absolute;left:40px;top:${top - 10}px">${iconHtml}</div>`; };
  dg.innerHTML = lane(60, '<img src="assets/custom_duck.png" style="width:110px;height:110px;object-fit:contain">') + lane(650, '<span style="font-size:96px;color:#9499A1;font-weight:900">〰️</span>');
  const cutsB = [[220], [365], [600], [755]].map(c => mk('div', '', dg, '', { position: 'absolute', left: (c[0] - 4) + 'px', top: '130px', width: '8px', height: '240px', background: '#00e676', borderRadius: '4px', boxShadow: '0 0 24px #00e676' }));
  const cutsA = [[145], [485], [845]].map(c => mk('div', '', dg, '', { position: 'absolute', left: (c[0] - 4) + 'px', top: '720px', width: '8px', height: '240px', background: '#E5334B', borderRadius: '4px', boxShadow: '0 0 24px #E5334B' }));
  const sci = bigEmoji(dg, '✂️', 0, 0, 100);
  const okB = bigEmoji(dg, '✅', 860, 130, 120); const noA = bigEmoji(dg, '❌', 860, 720, 120);
  // cleaning timeline + before/after bars
  const tlc = makeTimeline(el, 980, 560, { left: '50px', top: '420px' });
  const bars = mk('div', '', el, '', { position: 'absolute', left: '90px', top: '1050px', width: '900px', height: '300px' });
  bars.innerHTML = '<div style="position:absolute;left:0;top:20px;width:900px;height:70px;border-radius:35px;background:#3a3e46"></div><div class="b2" style="position:absolute;left:0;top:130px;width:900px;height:70px;border-radius:35px;background:linear-gradient(90deg,#FFD200,#ffa800);box-shadow:0 0 50px rgba(255,210,0,.4)"></div>';
  // markers vs real cuts
  const mA = makeTimeline(el, 980, 330, { left: '50px', top: '470px' }), mB = makeTimeline(el, 980, 330, { left: '50px', top: '940px' });
  const xA = bigEmoji(el, '❌', 540, 390, 150), vB = bigEmoji(el, '✅', 540, 880, 150);
  return { zb, pan, imgs, r1, r2, r3, cur, rp, drag, seld, tls, cur2, dg, cutsA, cutsB, sci, okB, noA, tlc, bars, mA, mB, xA, vB };
}, (t, s) => {
  const S = s.st, a = 19.8;
  const tSel0 = T(13) - 0.1, tSel1 = T(14) - 0.1;
  const tDiag0 = T(18) - 0.25, tDiag1 = T(21) - 0.2, tGfx1 = T(24) - 0.15;
  const panelVis = 1 - clamp(prog(t, tDiag0, 0.3));
  const selOn = prog(t, tSel0, 0.25) * (1 - prog(t, tSel1, 0.25));
  show(S.zb, panelVis * (1 - 0.7 * selOn));
  const enter = eo3(prog(t, a, 0.6));
  let z = 1, ox = 540, oy = 960;
  const z1 = eo3(prog(t, T(14) - 0.2, 0.6)) * (1 - eo3(prog(t, T(15) - 0.05, 0.4)));
  const z2 = eo3(prog(t, T(15), 0.6)) * (1 - eo3(prog(t, T(17) - 0.05, 0.4)));
  const z3 = eo3(prog(t, T(17) - 0.3, 0.6));
  if (z1 > 0) { ox = ux(520); oy = uy(780); z = 1 + 0.12 * z1; }
  if (z2 > 0 && z1 <= 0.001) { ox = ux(520); oy = uy(760); z = 1 + 0.1 * z2; }
  if (z3 > 0 && z2 <= 0.001) { ox = ux(520); oy = uy(1252); z = 1 + 0.12 * z3; }
  S.zb.style.transformOrigin = `${ox}px ${oy}px`;
  S.zb.style.transform = `translateY(${(1 - enter) * 200}px) scale(${z})`;
  show(S.imgs['01_smartcut_empty'], 1);
  show(S.imgs['02_smartcut_waveform'], eo3(prog(t, T(15), 0.35)));
  show(S.imgs['05_smartcut_progress'], eo3(prog(t, T(17) + 1.0, 0.3)));
  setRing(S.r1, t, T(12) + 0.1, T(13) - 0.05, ux(120), uy(210), 190 * PN.s, 130 * PN.s);
  setRing(S.r2, t, T(16), T(17) - 0.1, ux(520), uy(760), 930 * PN.s, 90 * PN.s);
  setRing(S.r3, t, T(17) - 0.25, T(17) + 1.3, ux(520), uy(1252), 915 * PN.s, 110 * PN.s);
  moveCursor(S.cur, t, T(14) + 0.35, ux(520), uy(780), 300, 400);
  doRipple(S.rp, t, T(14) + 0.35, ux(520), uy(780));
  const c2 = T(17) + 0.3;
  if (t > T(17) - 0.3) { moveCursor(S.cur, t, c2, ux(520), uy(1252), 250, 300); doRipple(S.rp, t, c2, ux(520), uy(1252)); }
  // drag arrows on the yellow line
  const dr = prog(t, T(16) + 0.1, .3) * (1 - prog(t, T(17) - 0.15, .3)); show(S.drag, dr); setXf(S.drag, ux(980), uy(760) + Math.sin(t * 8) * 28, 1);
  // select clip on the timeline
  show(S.seld, selOn);
  S.tls.draw({ cuts: 0, sel: prog(t, T(13) + 0.7, .2), play: -1, pulse: t, razor: -1 });
  S.tls.cv.style.opacity = selOn; S.tls.cv.style.display = selOn <= 0.001 ? 'none' : 'block';
  S.tls.cv.style.transform = `translateY(${(1 - eo3(prog(t, tSel0, 0.4))) * 80}px)`;
  moveCursor(S.cur2, t, T(13) + 0.65, 520, 690, -300, 260); S.cur2.style.opacity *= selOn > 0 ? 1 : 0;
  // diagram
  const dgOn = prog(t, tDiag0, 0.35) * (1 - prog(t, tDiag1, 0.3));
  show(S.dg, dgOn); S.dg.style.transform = `translateY(${(1 - eo3(prog(t, tDiag0, 0.5))) * 160}px)`;
  const pB = prog(t, T(18) + 0.1, 1.7), pA = prog(t, T(19) + 0.1, 1.5);
  const sweep = t < T(19) ? pB : pA; const lx = 60 + sweep * 800;
  S.sci.style.opacity = (t > T(18) && t < T(20)) ? 1 : 0; setXf(S.sci, lx, (t < T(19) ? 110 : 700) + 60, 1, Math.sin(t * 20) * 6);
  S.cutsB.forEach((c, i) => { const x = [220, 365, 600, 755][i]; const on = clamp((pB * 800 + 60 - x) / 12); c.style.opacity = on; c.style.transform = `scaleY(${eo3(on)})`; });
  S.cutsA.forEach((c, i) => { const x = [145, 485, 845][i]; const on = clamp((pA * 800 + 60 - x) / 12); c.style.opacity = on; c.style.transform = `scaleY(${eo3(on)})`; });
  pop(S.okB, t, T(18) + 1.5, .4); pop(S.noA, t, T(19) + 1.3, .4);
  // cleaning timeline
  const gOn = prog(t, tDiag1 + 0.05, 0.35) * (1 - prog(t, tGfx1, 0.3));
  const rz = t > T(21) - 0.2 && t < T(21) + 0.8 ? prog(t, T(21) - 0.2, 1.0) : -1;
  const info = S.tlc.draw({ cuts: prog(t, T(21) - 0.2, 1.0), razor: rz, flagS: prog(t, T(21) + 0.7, .3) * (1 - prog(t, T(21) + 1.2, .3)), sil: prog(t, T(21) + 1.2, 1.4), flagR: prog(t, T(22) + 0.1, .3) * (1 - prog(t, T(22) + 1.0, .3)), rep: prog(t, T(22) + 1.0, 1.3), clean: prog(t, T(23), 1.6), play: prog(t, T(23) + 0.9, 1.7), pulse: t });
  S.tlc.cv.style.opacity = gOn; S.tlc.cv.style.display = gOn <= 0.001 ? 'none' : 'block';
  S.tlc.cv.style.transform = `translateY(${(1 - eo3(prog(t, tDiag1 + .05, 0.5))) * 120}px)`;
  show(S.bars, gOn);
  const ratio = (info.endX - info.lx) / (info.rx - info.lx - 12); S.bars.querySelector('.b2').style.width = (900 * clamp(ratio * 1.1, 0.35, 1)) + 'px';
  // markers vs real cuts
  const mOn = prog(t, tGfx1 + 0.05, 0.3);
  S.mA.draw({ cuts: 0, markers: prog(t, T(24) + 0.1, .5), flagS: 0, pulse: t, play: -1 });
  S.mB.draw({ cuts: 1, sil: 1, rep: 1, pulse: t, play: -1, clean: 0 });
  S.mA.cv.style.opacity = mOn; S.mB.cv.style.opacity = prog(t, T(24) + 0.55, 0.3) * mOn;
  S.mA.cv.style.display = S.mA.cv.style.opacity <= 0 ? 'none' : 'block'; S.mB.cv.style.display = S.mB.cv.style.opacity <= 0 ? 'none' : 'block';
  pop(S.xA, t, T(25) - 0.1, .45); pop(S.vB, t, T(24) + 0.6, .45);
  S.xA.style.transform += ' translate(-50%,-50%)'; S.vB.style.transform += ' translate(-50%,-50%)';
});

// ================= S5  CAPTIONS =================
scene(41.7, 54.7, el => {
  const zb = mk('div', 'layer', el);
  const pan = mk('div', 'panel', zb, null, { left: PN.x + 'px', top: PN.y + 'px', width: (1040 * PN.s) + 'px', height: (1500 * PN.s) + 'px' });
  const i6 = mk('img', '', pan), i7 = mk('img', '', pan);
  setImg(i6, 'assets/ui_06_caption_templates.png'); setImg(i7, 'assets/ui_07_caption_generating.png');
  const r1 = ring(zb), r2 = ring(zb), cur = cursorEl(zb), rp = rippleSet(zb);
  // cloud transcription
  const cl = mk('div', '', el, '', { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' });
  const cloud = bigEmoji(cl, '☁️', 540, 480, 420);
  const sp = mk('div', '', cl, '✨', { position: 'absolute', left: '420px', top: '400px', fontSize: '140px', textAlign: 'center', width: '240px' });
  const bars = Array.from({ length: 22 }, (_, i) => mk('div', '', cl, '', { position: 'absolute', left: (90 + i * 42) + 'px', width: '24px', borderRadius: '12px', background: '#8fc1ff' }));
  const dots = Array.from({ length: 14 }, () => mk('div', '', cl, '', { position: 'absolute', width: '26px', height: '26px', borderRadius: '50%', background: '#FFD200', boxShadow: '0 0 30px #FFD200' }));
  const flyW = ['لسه', 'بتقص', 'السكتات', 'وبتكتب', 'الكابشن'].map((w, i) => mk('div', '', cl, w, { position: 'absolute', padding: '8px 30px', borderRadius: '20px', background: '#ff4fa3', color: '#fff', fontSize: '64px', fontWeight: '900', whiteSpace: 'nowrap', direction: 'rtl' }));
  // karaoke phone
  const ph = mk('div', '', el, '', { position: 'absolute', left: '250px', top: '190px', width: '580px', height: '1000px', borderRadius: '70px', background: 'linear-gradient(180deg,#3b1d5a,#14071f)', border: '8px solid #2b2e35', boxShadow: '0 40px 120px rgba(0,0,0,.7),0 0 120px rgba(255,79,163,.25)', overflow: 'hidden' });
  ph.innerHTML = '<svg width="564" height="984" viewBox="0 0 564 984" style="position:absolute;left:0;top:0"><circle cx="282" cy="360" r="120" fill="#e9b48c"/><path d="M110 700 Q120 520 282 500 Q444 520 454 700 L454 984 L110 984Z" fill="#1b1b22"/><path d="M170 330 Q180 210 282 210 Q384 210 394 330 Q340 270 282 270 Q224 270 170 330Z" fill="#2a1a12"/></svg>';
  const kw = mk('div', '', ph, '', { position: 'absolute', left: '0', top: '690px', width: '564px', textAlign: 'center', direction: 'rtl' });
  const kwW = ['الكابشن', 'بيتحرك', 'كلمة', 'بكلمة'].map(w => mk('span', 'cw', kw, w, { fontSize: '62px', margin: '0 6px' }));
  const tlk = makeTimeline(el, 980, 560, { left: '50px', top: '1230px', transform: 'scale(.9)', transformOrigin: '50% 0' });
  // dialects
  const dial = mk('div', '', el, '', { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' });
  const mic = bigEmoji(dial, '🎙️', 540, 760, 250);
  const arcs = [0, 1, 2].map(i => mk('div', '', dial, '', { position: 'absolute', left: '540px', top: '760px', width: '300px', height: '300px', border: '8px solid #FFD200', borderRadius: '50%', transform: 'translate(-50%,-50%)' }));
  const bub = [['إزيك', '🇪🇬', 260, 360, '#ff4fa3'], ['شلونك', '🇸🇦', 790, 420, '#00c2ff'], ['كيفك', '🇸🇾', 280, 1110, '#7cf29c'], ['لاباس', '🇲🇦', 790, 1070, '#ffb02e']].map((b, i) => mk('div', '', dial, `<span style="font-size:70px">${b[1]}</span> ${b[0]}`, { position: 'absolute', left: b[2] + 'px', top: b[3] + 'px', padding: '22px 44px', borderRadius: '60px', background: b[4], color: '#111', fontSize: '76px', fontWeight: '900', whiteSpace: 'nowrap', transform: 'translate(-50%,-50%)', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }));
  // edit a word
  const ed = mk('div', '', el, '', { position: 'absolute', left: '90px', top: '520px', width: '900px', height: '620px', borderRadius: '40px', background: '#14161a', border: '4px solid #FFD200', boxShadow: '0 30px 100px rgba(0,0,0,.7)' });
  ed.innerHTML = '<div style="position:absolute;left:40px;right:40px;top:50px;height:80px;border-radius:16px;background:#22262d"></div><div class="rowm" style="position:absolute;left:40px;right:40px;top:170px;height:110px;border-radius:20px;background:#22262d;border:3px solid #ff5a70;display:flex;align-items:center;justify-content:center;direction:rtl;font-size:72px;font-weight:900"><span>كلمة</span>&nbsp;<span class="wd" style="border-bottom:8px wavy #ff5a70;padding:0 6px">الكابيشن</span></div><div style="position:absolute;left:40px;right:40px;top:320px;height:80px;border-radius:16px;background:#22262d"></div><div style="position:absolute;left:40px;right:40px;top:440px;height:80px;border-radius:16px;background:#22262d"></div>';
  const cur3 = cursorEl(ed); const rp3 = rippleSet(ed); const ok3 = bigEmoji(ed, '✅', 800, 100, 110);
  return { zb, i6, i7, r1, r2, cur, rp, cl, cloud, sp, bars, dots, flyW, ph, kwW, tlk, dial, mic, arcs, bub, ed, cur3, rp3, ok3 };
}, (t, s) => {
  const S = s.st, a = 41.7;
  const tPan1 = T(28) + 0.45;
  const panOn = 1 - prog(t, tPan1, 0.25);
  show(S.zb, panOn);
  const enter = eo3(prog(t, a, 0.6));
  const z1 = eo3(prog(t, T(27) - 0.1, 0.6)) * (1 - eo3(prog(t, T(28) - 0.05, 0.3)));
  let z = 1, ox = 540, oy = 960;
  if (z1 > 0) { ox = ux(742); oy = uy(1226); z = 1 + 0.12 * z1; }
  S.zb.style.transformOrigin = `${ox}px ${oy}px`; S.zb.style.transform = `translateY(${(1 - enter) * 200}px) scale(${z})`;
  show(S.i7, eo3(prog(t, T(28) - 0.05, 0.3)));
  setRing(S.r1, t, T(26) + 0.1, T(27) + 0.05, ux(242), uy(760), 250 * PN.s, 210 * PN.s);
  setRing(S.r2, t, T(27) - 0.05, T(28), ux(742), uy(1226), 440 * PN.s, 92 * PN.s);
  moveCursor(S.cur, t, T(27) + 0.45, ux(742), uy(1226), 300, 260);
  doRipple(S.rp, t, T(27) + 0.45, ux(742), uy(1226));
  // cloud: audio up -> AI cloud -> words fall onto the caption track
  const t0 = T(28) + 0.55, t1 = T(29) - 0.15;
  const cOn = prog(t, t0, 0.35) * (1 - prog(t, t1, 0.3)); show(S.cl, cOn);
  S.cloud.style.transform = `translate(-50%,-50%) scale(${1 + 0.05 * Math.sin(t * 6)})`;
  S.sp.style.transform = `scale(${1 + 0.2 * Math.sin(t * 9)}) rotate(${t * 40}deg)`;
  S.bars.forEach((b, i) => {
    const h = 50 + 90 * Math.abs(Math.sin(t * 7 + i * 0.7));
    b.style.height = h + 'px'; b.style.top = (1290 - h / 2) + 'px'; b.style.left = (90 + i * 42) + 'px'; b.style.opacity = 0.95; b.style.transform = 'none';
  });
  S.dots.forEach((d, i) => {
    const st = t0 + 0.1 + i * 0.08, p = prog(t, st, 0.85), x0 = 90 + ((i * 7) % 22) * 42 + 12;
    d.style.left = (lerp(x0, 540, eo3(p)) - 13) + 'px'; d.style.top = (lerp(1290, 560, eo3(p)) - Math.sin(p * 3.14) * 120 - 13) + 'px';
    d.style.opacity = p > 0 && p < 1 ? 1 : 0;
  });
  S.flyW.forEach((w, i) => {
    const st = t0 + 0.75 + i * 0.22, p = eo3(prog(t, st, 0.7));
    const tx = [780, 540, 300, 660, 420][i], ty = i < 3 ? 1000 : 1150;
    w.style.left = lerp(540, tx, p) + 'px'; w.style.top = lerp(520, ty + 20, p) + 'px';
    w.style.opacity = clamp(prog(t, st, 0.15)); w.style.transform = `translate(-50%,-50%) scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * 20}deg)`;
  });
  // karaoke phone + nested timeline
  const k0 = T(29) - 0.15, kOn = prog(t, k0, 0.4) * (1 - prog(t, T(31) - 0.1, 0.3));
  show(S.ph, kOn); S.ph.style.transform = `translateY(${(1 - eo3(prog(t, k0, .5))) * 200}px)`;
  const kk = Math.floor(Math.max(0, t - T(29)) / 0.42) % 4; S.kwW.forEach((w, i) => w.classList.toggle('on', i === kk));
  S.tlk.draw({ cuts: 1, sil: 1, rep: 1, caps: 1, pulse: t, play: clamp((t - k0) / 4.5), clean: 0 });
  S.tlk.cv.style.opacity = kOn; S.tlk.cv.style.display = kOn <= 0.001 ? 'none' : 'block';
  // dialects
  const d0 = T(31) - 0.1, dOn = prog(t, d0, 0.3) * (1 - prog(t, T(32) - 0.15, 0.3)); show(S.dial, dOn);
  setXf(S.mic, 0, Math.sin(t * 5) * 6);
  S.arcs.forEach((ar, i) => { const p = ((t - d0) * 0.9 + i / 3) % 1; ar.style.transform = `translate(-50%,-50%) scale(${1 + p * 3})`; ar.style.opacity = (1 - p) * 0.8; });
  S.bub.forEach((b, i) => { const p = eoB(prog(t, d0 + 0.15 + i * 0.14, 0.4)); b.style.opacity = clamp(p); b.style.transform = `translate(-50%,-50%) scale(${0.5 + 0.5 * p})`; });
  // fix a word
  const e0 = T(32) - 0.05, eOn = prog(t, e0, 0.3); show(S.ed, eOn); S.ed.style.transform = `translateY(${(1 - eo3(prog(t, e0, .5))) * 160}px)`;
  const wd = S.ed.querySelector('.wd'), row = S.ed.querySelector('.rowm');
  const fixed = t > T(33) + 0.55;
  wd.textContent = fixed ? 'الكابشن' : 'الكابيشن'; wd.style.borderBottom = fixed ? 'none' : '8px wavy #ff5a70'; wd.style.background = fixed ? '#FFD200' : 'transparent'; wd.style.color = fixed ? '#111' : '#fff'; wd.style.borderRadius = '14px';
  row.style.borderColor = fixed ? '#00e676' : '#ff5a70';
  moveCursor(S.cur3, t, T(33) + 0.35, 360, 235, -300, 250); doRipple(S.rp3, t, T(33) + 0.35, 360, 235);
  pop(S.ok3, t, T(33) + 0.7, .4);
});

// ================= S6  CTA : browser (hero) -> bio link (hero) -> "AI works, you direct" (hero) =================
scene(54.4, 65.3, el => {
  const glow = mk('div', '', el, '', { position: 'absolute', left: '280px', top: '100px', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,210,0,.45),transparent 65%)' });
  const duck = mk('img', '', el, null, { position: 'absolute', left: '380px', top: '200px', width: '320px', height: '320px', objectFit: 'contain' }); setImg(duck, 'assets/custom_duck.png');
  const confetti = mk('canvas', '', el, null, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' }); confetti.width = 540; confetti.height = 960;
  const br = mk('div', '', el, '', { position: 'absolute', left: '90px', top: '660px', width: '900px', height: '520px', borderRadius: '36px', background: '#14161a', border: '4px solid #2b2e35', boxShadow: '0 40px 120px rgba(0,0,0,.7)', overflow: 'hidden' });
  br.innerHTML = '<div style="height:96px;background:#1c1f24;display:flex;align-items:center;padding:0 26px;gap:16px"><span style="width:22px;height:22px;border-radius:50%;background:#ff5f57"></span><span style="width:22px;height:22px;border-radius:50%;background:#febc2e"></span><span style="width:22px;height:22px;border-radius:50%;background:#28c840"></span><div style="flex:1;margin-left:16px;height:56px;border-radius:28px;background:#0d0e11;border:2px solid #FFD200;display:flex;align-items:center;padding:0 26px;font-size:40px;font-weight:800;direction:ltr;color:#fff"><span class="ty"></span><span class="cr" style="width:4px;height:36px;background:#FFD200;margin-left:4px"></span></div></div>' +
    '<div style="position:absolute;left:0;right:0;top:130px;text-align:center"><img src="assets/custom_duck.png" style="width:150px;height:150px;object-fit:contain"></div>' +
    '<div class="btn" style="position:absolute;left:150px;right:150px;top:330px;height:120px;border-radius:60px;background:linear-gradient(90deg,#FFD200,#ffa800);display:flex;align-items:center;justify-content:center;gap:22px;font-size:66px;font-weight:900;color:#111;box-shadow:0 0 70px rgba(255,210,0,.5)"><span>⬇️</span><span>🎁</span></div>';
  const cur = cursorEl(el); const rp = rippleSet(el);
  const bio = mk('div', '', el, '<span style="font-size:130px">🔗</span><span>Bio</span>', { position: 'absolute', left: '240px', top: '760px', width: '600px', height: '240px', borderRadius: '120px', background: '#FFD200', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', fontSize: '130px', fontWeight: '900', direction: 'ltr', boxShadow: '0 0 90px rgba(255,210,0,.5)' });
  const arrow = bigEmoji(el, '👆', 540, 1120, 170);
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '560px' });
  const boss = bigEmoji(el, '🎬', 300, 1290, 200); const cup = bigEmoji(el, '☕', 780, 1290, 200); const crown = bigEmoji(el, '👑', 780, 1170, 120);
  return { glow, duck, confetti, br, cur, rp, bio, arrow, tl, boss, cup, crown };
}, (t, s) => {
  const S = s.st;
  const vtop = 1 - prog(t, T(37) - 0.2, 0.3);
  const g = eoB(prog(t, 54.6, 0.6)); S.glow.style.opacity = clamp(g) * vtop; S.glow.style.transform = `scale(${0.7 + 0.3 * g})`;
  pop(S.duck, t, 54.6, 0.6, 0); S.duck.style.transform += ` translateY(${Math.sin(t * 3) * 10}px)`; S.duck.style.opacity *= vtop;
  const c = S.confetti.getContext('2d'); c.clearRect(0, 0, 540, 960); const cp = prog(t, T(34) - 0.1, 2.0);
  if (cp > 0 && cp < 1) { const r = rnd(5); for (let i = 0; i < 50; i++) { const a = r() * 6.283, v = 120 + r() * 300, x = 270 + Math.cos(a) * v * cp, y = 130 + Math.sin(a) * v * cp + 260 * cp * cp; c.fillStyle = ['#FFD200', '#ff4fa3', '#00c2ff', '#7cf29c'][i % 4]; c.globalAlpha = 1 - cp; c.fillRect(x, y, 8, 14); } c.globalAlpha = 1; }
  // beat A: browser + download
  const vb = beat(t, T(34) - 0.05, T(35) - 0.05, 0.3); show(S.br, vb);
  S.br.style.transform = `translateY(${(1 - eo3(prog(t, T(34) - 0.05, 0.5))) * 160}px)`;
  const url = 'happyduckai.com', n = Math.floor(clamp((t - (T(34) + 0.5)) / 1.4) * url.length);
  S.br.querySelector('.ty').textContent = url.slice(0, n); S.br.querySelector('.cr').style.opacity = Math.sin(t * 12) > 0 ? 1 : 0;
  const clickT = T(35) - 0.45; moveCursor(S.cur, t, clickT, 540, 660 + 390, 300, 300); S.cur.style.opacity *= vb > 0 ? 1 : 0;
  S.br.querySelector('.btn').style.transform = `scale(${t > clickT && t < clickT + 0.2 ? 0.94 : 1})`;
  doRipple(S.rp, t, clickT, 540, 1050);
  // beat B: bio link
  const vl = beat(t, T(35) - 0.0, T(37) - 0.2, 0.3); show(S.bio, vl); S.bio.style.transform = `scale(${0.7 + 0.3 * eoB(prog(t, T(35), 0.5))})`;
  show(S.arrow, vl * prog(t, T(35) + 0.3, .3)); setXf(S.arrow, 0, Math.sin(t * 8) * 18);
  // beat C: AI works, you direct
  const vf = prog(t, T(37) - 0.1, 0.4);
  S.tl.draw({ cuts: 1, sil: (t * 0.35) % 1.4, rep: (t * 0.35) % 1.4 - 0.2, caps: 1, pulse: t, play: (t * 0.25) % 1, clean: (t * 0.35) % 1.4 - 0.2 });
  S.tl.cv.style.opacity = vf; S.tl.cv.style.display = vf <= 0.001 ? 'none' : 'block';
  pop(S.boss, t, T(37) + 0.3, .5); S.boss.style.transform += ' translate(-50%,-50%)';
  pop(S.cup, t, T(38) - 0.2, .5); S.cup.style.transform += ' translate(-50%,-50%)';
  pop(S.crown, t, T(38) + 0.5, .5); S.crown.style.transform += ` translate(-50%,-50%) translateY(${Math.sin(t * 5) * 8}px)`;
});
// ---------- header (logo) ----------
const head = mk('div', '', stage, '', { position: 'absolute', left: '0', top: '34px', width: '1080px', height: '90px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', direction: 'ltr' });
const hl = mk('img', '', head, null, { width: '84px', height: '84px', objectFit: 'contain' }); setImg(hl, 'assets/custom_duck.png');
mk('div', '', head, 'Happy Duck AI', { fontSize: '50px', fontWeight: '900', color: '#FFD200' });

// ---------- wipe transitions ----------
const wipe = mk('div', '', stage, '', { position: 'absolute', left: '-300px', top: '-200px', width: '420px', height: '2400px', background: 'linear-gradient(90deg,transparent,#FFD200,transparent)', transform: 'skewX(-14deg)', opacity: 0, zIndex: 90 });

// ---------- karaoke captions ----------
const capEl = mk('div', '', stage); capEl.id = 'cap';
let GROUPS = [];
function mergeEn(t) { const o = []; t.forEach(w => { if (/^[A-Za-z]/.test(w) && o.length && /^[A-Za-z]/.test(o[o.length - 1]) && !/\./.test(w + o[o.length - 1])) o[o.length - 1] += ' ' + w; else o.push(w); }); return o; }
function buildCaptions() {
  const words = [];
  P.forEach(p => {
    const toks = mergeEn(p.text.replace(/[،.]/g, '').split(/\s+/).filter(Boolean));
    const wts = toks.map(w => Math.max(2, w.length));
    const sum = wts.reduce((a, b) => a + b, 0);
    let c = p.t0;
    toks.forEach((w, i) => { const d = (p.t1 - p.t0) * wts[i] / sum; words.push({ w, t0: c, t1: c + d, en: /[A-Za-z]/.test(w) }); c += d; });
  });
  GROUPS = [];
  let k = 0;
  P.forEach(p => {
    const toks = mergeEn(p.text.replace(/[،.]/g, '').split(/\s+/).filter(Boolean));
    const n = toks.length, ng = Math.ceil(n / 3);
    let idx = 0;
    for (let g = 0; g < ng; g++) {
      const sz = Math.round((n - idx) / (ng - g));
      const ws = words.slice(k + idx, k + idx + sz);
      GROUPS.push({ words: ws, t0: ws[0].t0, t1: ws[ws.length - 1].t1 });
      idx += sz;
    }
    k += n;
  });
  GROUPS.forEach((g, i) => { g.end = i + 1 < GROUPS.length ? Math.min(g.t1 + 0.25, GROUPS[i + 1].t0) : g.t1 + 0.3; });
}
let lastKey = '';
function drawCaps(t) {
  let gi = -1;
  for (let i = 0; i < GROUPS.length; i++) if (t >= GROUPS[i].t0 - 0.04 && t < GROUPS[i].end) { gi = i; break; }
  if (gi < 0) { if (lastKey !== 'x') { capEl.innerHTML = ''; lastKey = 'x'; } return; }
  const g = GROUPS[gi];
  let act = 0; g.words.forEach((w, i) => { if (t >= w.t0) act = i; });
  const key = gi + ':' + act;
  if (key !== lastKey) {
    capEl.innerHTML = '<span class="wrap" style="display:inline-block;white-space:nowrap;direction:rtl">' + g.words.map((w, i) => `<span class="cw${i === act ? ' on' : ''}${w.en ? ' en' : ''}">${w.w}</span>`).join('') + '</span>';
    const wr = capEl.firstChild; const sc = Math.min(1, 1000 / wr.offsetWidth); wr.style.transform = `scale(${sc})`;
    lastKey = key;
  }
  const p = eoB(prog(t, g.t0 - 0.04, 0.18));
  capEl.style.transform = `translateY(${(1 - p) * 30}px) scale(${0.92 + 0.08 * p})`;
}

// ---------- master ----------
const BOUNDS = [6.0, 14.4, 19.8, 41.7, 54.4];
window.setT = async function (t) {
  pending.length = 0;
  grid.style.transform = `translate(${(t * 18) % 90}px,${(t * 12) % 90}px)`;
  scenes.forEach(s => {
    const fi = prog(t, s.a, 0.3), fo = 1 - prog(t, s.b - 0.3, 0.3);
    const o = Math.min(fi, fo);
    const on = t >= s.a - 0.01 && t <= s.b + 0.01;
    s.el.style.display = on ? 'block' : 'none';
    if (!on) return;
    s.el.style.opacity = o;
    s.upd(t, s);
  });
  // header visible from solution onward
  const hv = prog(t, 14.6, 0.4); head.style.opacity = hv; head.style.display = hv <= 0 ? 'none' : 'flex';
  // wipe at scene boundaries
  let wo = 0, wx = -400;
  BOUNDS.forEach(b => { const p = prog(t, b - 0.05, 0.42); if (p > 0 && p < 1) { wo = Math.sin(p * Math.PI); wx = -420 + p * 1600; } });
  wipe.style.opacity = 0; wipe.style.left = wx + 'px';
  drawCaps(t);
  await Promise.all(pending);
  await document.fonts.ready;
};
window.init = async function () {
  TL = await (await fetch('assets/timeline.json')).json();
  P = TL.phrases; DUR = TL.dur + 1.6;
  buildCaptions();
  await document.fonts.ready;
  window.DUR = DUR;
  return DUR;
};
