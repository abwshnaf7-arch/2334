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

// ================= helper visuals =================
const show = (e, v) => { e.style.opacity = v; e.style.display = v <= 0.001 ? 'none' : 'block'; };
const lerp = (a, b, k) => a + (b - a) * k;
function svgEl(html, parent, st) { const d = mk('div', '', parent, html, { position: 'absolute', ...st }); return d; }
function bigEmoji(parent, ch, x, y, size, extra) { return mk('div', '', parent, ch, { position: 'absolute', left: x + 'px', top: y + 'px', fontSize: size + 'px', lineHeight: 1, transform: 'translate(-50%,-50%)', textAlign: 'center', ...extra }); }
function setXf(e, x, y, s = 1, r = 0) { e.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`; }

// ================= S1  HOOK : tedious manual cutting, then "2026" =================
scene(0, 6.3, el => {
  const glow = mk('div', 'layer', el, '', { background: 'radial-gradient(700px 500px at 50% 45%,rgba(255,210,0,.10),transparent 70%)' });
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '600px' });
  const scis = bigEmoji(el, '✂️', 540, 380, 250);
  const zoom = mk('div', '', el, '', { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' });
  // manual caption typing row
  const typ = mk('div', '', el, '', { position: 'absolute', left: '90px', top: '1260px', width: '900px', height: '150px', borderRadius: '30px', background: '#14161a', border: '3px solid #2b2e35' });
  const chips = Array.from({ length: 7 }, (_, i) => mk('div', '', typ, '', { position: 'absolute', right: (24 + i * 116) + 'px', top: '34px', width: '100px', height: '82px', borderRadius: '16px', background: '#ff4fa3' }));
  const cur = mk('div', '', typ, '', { position: 'absolute', top: '30px', width: '6px', height: '90px', background: '#fff' });
  const kb = bigEmoji(el, '⌨️', 900, 1180, 110);
  // calendar
  const cal = mk('div', '', el, '', { position: 'absolute', left: '190px', top: '560px', width: '700px', height: '760px', borderRadius: '44px', background: '#f5f5f7', boxShadow: '0 40px 120px rgba(0,0,0,.7)', overflow: 'hidden', transformOrigin: '50% 0' });
  cal.innerHTML = '<div style="height:160px;background:#e5334b"></div><div style="position:absolute;left:0;right:0;top:170px;text-align:center;font-size:290px;font-weight:900;color:#15161a;direction:ltr;line-height:1.1">2026</div>' +
    '<svg width="700" height="760" style="position:absolute;left:0;top:0"><line class="x1" x1="120" y1="230" x2="580" y2="690" stroke="#e5334b" stroke-width="46" stroke-linecap="round" stroke-dasharray="700" stroke-dashoffset="700"/><line class="x2" x1="580" y1="230" x2="120" y2="690" stroke="#e5334b" stroke-width="46" stroke-linecap="round" stroke-dasharray="700" stroke-dashoffset="700"/></svg>';
  return { tl, scis, chips, cur, typ, kb, cal };
}, (t, s) => {
  const { tl, scis, chips, cur, typ, kb, cal } = s.st;
  const A = 1 - prog(t, 3.25, 0.4);
  const razor = prog(t, 0.45, 2.7);
  tl.draw({ cuts: razor, razor: razor < 1 ? razor : -1, flagS: prog(t, 1.4, .5), flagR: prog(t, 1.9, .5), pulse: t, caps: 0, play: -1 });
  const base = t < 3.25 ? 1 : 0;
  tl.cv.style.opacity = A; tl.cv.style.filter = t > 3.0 ? `grayscale(1) blur(${prog(t, 3.0, .4) * 8}px)` : 'none';
  show(scis, A * clamp(prog(t, .1, .3))); setXf(scis, 0, 0, 1 + 0.06 * Math.sin(t * 16), Math.sin(t * 14) * 12);
  show(typ, A * prog(t, 1.2, .4)); show(kb, A * prog(t, 1.2, .3)); setXf(kb, 0, Math.abs(Math.sin(t * 12)) * -14);
  const n = Math.floor(prog(t, 1.4, 1.8) * 7);
  chips.forEach((c, i) => { c.style.opacity = i < n ? 1 : 0; c.style.transform = `scale(${i < n ? 1 : 0.6})`; });
  cur.style.right = (24 + n * 116 - 6) + 'px'; cur.style.opacity = Math.sin(t * 12) > 0 ? 1 : 0.15;
  // calendar flip + big X
  const f = eoB(prog(t, 3.35, 0.6));
  cal.style.opacity = prog(t, 3.3, 0.2); cal.style.display = cal.style.opacity <= 0 ? 'none' : 'block';
  cal.style.transform = `perspective(1400px) rotateX(${(1 - f) * -90}deg) rotate(-4deg) scale(${0.9 + 0.1 * f}) translateX(${Math.sin(t * 40) * 6 * (1 - prog(t, 4.9, .3)) * prog(t, 4.2, .05)}px)`;
  cal.querySelector('.x1').style.strokeDashoffset = 700 * (1 - eo3(prog(t, 4.25, 0.25)));
  cal.querySelector('.x2').style.strokeDashoffset = 700 * (1 - eo3(prog(t, 4.45, 0.25)));
});

// ================= S2  PROBLEM : time drain =================
scene(6.0, 14.7, el => {
  const sky = mk('canvas', '', el, null, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' });
  sky.width = 540; sky.height = 960;
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '470px' });
  const rec = mk('div', '', el, '<span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:#ff2d55;margin-left:14px;vertical-align:middle" class="dot"></span>REC', { position: 'absolute', left: '70px', top: '210px', fontSize: '54px', fontWeight: '900', padding: '10px 34px', borderRadius: '40px', background: 'rgba(0,0,0,.6)', border: '3px solid #ff2d55', direction: 'ltr' });
  const clock = mk('div', '', el, '', { position: 'absolute', left: '760px', top: '150px', width: '250px', height: '250px' });
  clock.innerHTML = '<svg width="250" height="250" viewBox="-125 -125 250 250"><circle r="118" fill="#101216" stroke="#FFD200" stroke-width="8"/>' + Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-98" x2="0" y2="-108" stroke="#fff" stroke-width="5" transform="rotate(${i * 30})"/>`).join('') + '<line class="hm" x1="0" y1="0" x2="0" y2="-64" stroke="#fff" stroke-width="9" stroke-linecap="round"/><line class="hh" x1="0" y1="0" x2="0" y2="-88" stroke="#FFD200" stroke-width="6" stroke-linecap="round"/><circle r="9" fill="#FFD200"/></svg>';
  const hp = bigEmoji(el, '🎧', 200, 1200, 140); const kb = bigEmoji(el, '⌨️', 880, 1200, 130); const hg = bigEmoji(el, '⏳', 540, 1200, 150);
  const phone = mk('div', '', el, '', { position: 'absolute', left: '380px', top: '1110px', width: '320px', height: '470px', borderRadius: '48px', background: '#0c0d10', border: '6px solid #2b2e35', boxShadow: '0 30px 80px rgba(0,0,0,.7)' });
  phone.innerHTML = '<svg width="308" height="458" viewBox="0 0 308 458"><circle cx="154" cy="190" r="86" fill="none" stroke="#2b2e35" stroke-width="22"/><circle class="ring" cx="154" cy="190" r="86" fill="none" stroke="#FFD200" stroke-width="22" stroke-linecap="round" stroke-dasharray="540" stroke-dashoffset="475" transform="rotate(-90 154 190)"/><rect x="54" y="340" width="200" height="60" rx="30" fill="#2b2e35"/><text x="154" y="120" fill="#ff5a70" font-size="60" text-anchor="middle" font-family="Noto Color Emoji">⚠️</text></svg>';
  return { sky, tl, rec, clock, hp, kb, hg, phone };
}, (t, s) => {
  const { sky, tl, rec, clock, hp, kb, hg, phone } = s.st;
  // sky (day -> night)
  const c = sky.getContext('2d'), k = clamp((t - 6) / 8.4);
  const g = c.createLinearGradient(0, 0, 0, 960);
  const mix = (a, b) => a.map((v, i) => Math.round(lerp(v, b[i], k)));
  const top = mix([70, 46, 16], [8, 10, 32]), bot = mix([20, 16, 12], [9, 10, 12]);
  g.addColorStop(0, `rgb(${top})`); g.addColorStop(1, `rgb(${bot})`); c.fillStyle = g; c.fillRect(0, 0, 540, 960);
  const r = rnd(7); c.fillStyle = '#fff';
  for (let i = 0; i < 70; i++) { const x = r() * 540, y = r() * 420, a = k * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))); c.globalAlpha = a; c.fillRect(x, y, 2, 2); }
  c.globalAlpha = 1;
  const ang = -0.2 + k * 3.3, cx = 270 + Math.cos(ang) * 220, cy = 240 - Math.sin(ang) * 210;
  c.beginPath(); c.arc(cx, cy, 34, 0, 7); c.fillStyle = k < 0.55 ? '#ffb02e' : '#e8eefc'; c.shadowColor = k < 0.55 ? '#ffb02e' : '#aac'; c.shadowBlur = 40; c.fill(); c.shadowBlur = 0;
  // clock spins faster and faster
  const hrs = (t - 6) * (60 + (t - 6) * 14);
  clock.querySelector('.hm').setAttribute('transform', `rotate(${hrs * 12})`); clock.querySelector('.hh').setAttribute('transform', `rotate(${hrs})`);
  show(clock, prog(t, 6.6, .4));
  // rec
  const ro = (1 - prog(t, 7.3, .3)) * prog(t, 6.1, .2); show(rec, ro); rec.querySelector('.dot').style.opacity = Math.sin(t * 10) > 0 ? 1 : 0.2;
  // timeline story
  const tlIn = eo3(prog(t, T(2) - 0.1, .5)); tl.cv.style.opacity = tlIn; tl.cv.style.transform = `translateY(${(1 - tlIn) * 120}px)`;
  const st = { cuts: prog(t, T(3) + 0.1, 1.9), razor: (t > T(3) + 0.1 && t < T(3) + 2.0) ? prog(t, T(3) + 0.1, 1.9) : -1, flagS: prog(t, T(3) + 0.6, .5), sil: prog(t, T(3) + 1.3, 1.6) * 0.7, flagR: prog(t, T(4), .4), rep: prog(t, T(4) + 0.5, 1.0), caps: prog(t, T(5), 3.2) * 0.9, pulse: t, play: t < T(3) + 2.2 ? prog(t, T(2), 3.2) : -1 };
  tl.draw(st);
  show(hp, prog(t, T(3) - 0.05, .3) * (1 - prog(t, T(4), .3))); setXf(hp, 0, Math.sin(t * 6) * 8);
  show(kb, prog(t, T(5) - 0.05, .3) * (1 - prog(t, T(6) - 0.2, .3))); setXf(kb, 0, Math.abs(Math.sin(t * 13)) * -12);
  show(hg, prog(t, T(6) - 0.1, .3) * (1 - prog(t, T(7) - 0.05, .3))); setXf(hg, 0, 0, 1, (t * 180) % 360 > 180 ? 180 : 0);
  const po = eo3(prog(t, T(7) - 0.05, .5)); show(phone, po); phone.style.transform = `translateY(${(1 - po) * 260}px) rotate(${Math.sin(t * 20) * 1.2 * po}deg)`;
  phone.querySelector('.ring').setAttribute('stroke-dashoffset', 475 - 20 * Math.sin(t * 3));
  tl.cv.style.filter = `saturate(${1 - 0.5 * prog(t, T(6), 1)})`;
});

// ================= S3  SOLUTION : AI wakes up, the mess is cleaned =================
scene(14.4, 20.2, el => {
  const net = mk('canvas', '', el, null, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1200px' }); net.width = 1080; net.height = 1200;
  const glow = mk('div', '', el, '', { position: 'absolute', left: '240px', top: '210px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,210,0,.5),transparent 65%)' });
  const ai = mk('div', '', el, 'AI', { position: 'absolute', left: '340px', top: '330px', width: '400px', height: '400px', borderRadius: '50%', border: '10px solid #FFD200', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '210px', fontWeight: '900', color: '#FFD200', textShadow: '0 0 60px rgba(255,210,0,.8)', boxShadow: '0 0 90px rgba(255,210,0,.5),inset 0 0 60px rgba(255,210,0,.25)', background: 'rgba(9,10,12,.7)' });
  const duck = mk('img', '', el, null, { position: 'absolute', left: '320px', top: '290px', width: '440px', height: '440px', objectFit: 'contain' }); setImg(duck, 'assets/custom_duck.png');
  const ring1 = mk('div', '', el, '', { position: 'absolute', left: '280px', top: '250px', width: '520px', height: '520px', borderRadius: '50%', border: '8px solid #FFD200' });
  const name = mk('div', 'txt', el, 'Happy Duck AI', { top: '790px', fontSize: '116px', direction: 'ltr' });
  const row = mk('div', '', el, '', { position: 'absolute', left: '0', top: '950px', width: '1080px', height: '130px' });
  const pr = mk('div', '', row, 'Pr', { position: 'absolute', left: '300px', top: '0', width: '130px', height: '130px', borderRadius: '30px', background: '#2c1f6b', border: '6px solid #9999ff', color: '#b3b3ff', fontSize: '80px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'ltr' });
  const plus = mk('div', '', row, '+', { position: 'absolute', left: '470px', top: '0', width: '140px', textAlign: 'center', fontSize: '110px', fontWeight: '900', color: '#FFD200', lineHeight: '1.1' });
  const duck2 = mk('img', '', row, null, { position: 'absolute', left: '650px', top: '0', width: '130px', height: '130px', objectFit: 'contain' }); setImg(duck2, 'assets/custom_duck.png');
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '1080px', transformOrigin: '50% 0' });
  const wand = bigEmoji(el, '🪄', 0, 0, 150);
  return { net, glow, ai, duck, ring1, name, row, pr, plus, duck2, tl, wand };
}, (t, s) => {
  const { net, glow, ai, duck, ring1, name, row, pr, plus, duck2, tl, wand } = s.st;
  // neural net
  const c = net.getContext('2d'); c.clearRect(0, 0, 1080, 1200);
  const on = prog(t, T(8) - 0.1, 0.5) * (1 - prog(t, T(9) - 0.1, 0.35));
  if (on > 0) {
    const r = rnd(11), N = 26, pts = [];
    for (let i = 0; i < N; i++) { const a = i / N * 6.283 + r() * .5, rad = 200 + r() * 250; pts.push([540 + Math.cos(a + t * 0.6) * rad, 520 + Math.sin(a + t * 0.6) * rad * 0.8]); }
    c.globalAlpha = on; c.lineWidth = 3;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (d < 330) { c.strokeStyle = `rgba(255,210,0,${0.5 * (1 - d / 330) * (0.5 + 0.5 * Math.sin(t * 6 + i))})`; c.beginPath(); c.moveTo(...pts[i]); c.lineTo(...pts[j]); c.stroke(); } }
    pts.forEach((p, i) => { c.fillStyle = '#FFD200'; c.shadowColor = '#FFD200'; c.shadowBlur = 20; c.beginPath(); c.arc(p[0], p[1], 8 + 4 * Math.sin(t * 8 + i), 0, 7); c.fill(); });
    c.shadowBlur = 0; c.globalAlpha = 1;
  }
  const ap = eoB(prog(t, T(8), .6)) * (1 - prog(t, T(9) - 0.1, .3)); show(ai, ap); ai.style.transform = `scale(${0.4 + 0.6 * eoB(prog(t, T(8), .6))})`;
  const gp = eoB(prog(t, T(9) - 0.05, .6)); glow.style.opacity = clamp(gp); glow.style.transform = `scale(${0.5 + 0.6 * gp + 0.04 * Math.sin(t * 4)})`;
  pop(duck, t, T(9) - 0.05, 0.6, 0); duck.style.transform += ` translateY(${Math.sin(t * 3) * 10}px)`;
  const rp = prog(t, T(9) - 0.05, 0.7); ring1.style.opacity = rp > 0 && rp < 1 ? 1 - rp : 0; ring1.style.transform = `scale(${1 + rp * 0.7})`;
  pop(name, t, T(9) + 0.05, 0.5, 40);
  show(row, 1); const pa = eoB(prog(t, T(10) - 0.05, .5));
  pr.style.opacity = clamp(pa); pr.style.transform = `translateX(${(1 - pa) * -300}px) scale(${0.6 + 0.4 * pa})`;
  const pb = eoB(prog(t, T(10) + 0.15, .5)); plus.style.opacity = clamp(pb); plus.style.transform = `scale(${pb})`;
  const pc = eoB(prog(t, T(10) + 0.3, .5)); duck2.style.opacity = clamp(pc); duck2.style.transform = `translateX(${(1 - pc) * 300}px) scale(${0.6 + 0.4 * pc})`;
  // messy timeline -> clean by the wand
  const cln = prog(t, T(11) - 0.2, 1.4);
  tl.draw({ cuts: 1, flagS: (1 - prog(t, T(11) + 0.2, .4)), flagR: (1 - prog(t, T(11) + 0.3, .4)), sil: prog(t, T(11) + 0.2, 1.1), rep: prog(t, T(11) + 0.3, 1.1), clean: cln, pulse: t, play: -1, caps: 0 });
  const tin = eo3(prog(t, T(10), .5)); tl.cv.style.opacity = tin; tl.cv.style.transform = `translateY(${(1 - tin) * 100}px) scale(.92)`;
  show(wand, prog(t, T(11) - 0.3, .3) * (1 - prog(t, T(11) + 1.3, .3)));
  setXf(wand, 90 + eo3(cln) * 880, 1120 - Math.sin(cln * 3.14) * 60, 1, -25 + Math.sin(t * 20) * 10);
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
  bars.innerHTML = '<div style="position:absolute;left:0;top:20px;width:900px;height:70px;border-radius:35px;background:#3a3e46"></div><div class="b2" style="position:absolute;left:0;top:130px;width:900px;height:70px;border-radius:35px;background:linear-gradient(90deg,#FFD200,#ffa800);box-shadow:0 0 50px rgba(255,210,0,.4)"></div><div style="position:absolute;left:0;top:225px;font-size:90px">⏱️</div>';
  const face = bigEmoji(el, '😮‍💨', 800, 1440, 130);
  // markers vs real cuts
  const mA = makeTimeline(el, 980, 330, { left: '50px', top: '470px' }), mB = makeTimeline(el, 980, 330, { left: '50px', top: '940px' });
  const xA = bigEmoji(el, '❌', 540, 390, 150), vB = bigEmoji(el, '✅', 540, 880, 150);
  return { zb, pan, imgs, r1, r2, r3, cur, rp, drag, seld, tls, cur2, dg, cutsA, cutsB, sci, okB, noA, tlc, bars, face, mA, mB, xA, vB };
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
  show(S.face, prog(t, T(23) + 1.6, .3) * gOn); setXf(S.face, 0, Math.sin(t * 5) * 6);
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
  const flyW = ['لسه', 'بتقص', 'السكتات', 'وبتكتب', 'الكابشن'].map((w, i) => mk('div', '', cl, w, { position: 'absolute', padding: '8px 30px', borderRadius: '20px', background: '#ff4fa3', color: '#fff', fontSize: '64px', fontWeight: '900', whiteSpace: 'nowrap', direction: 'rtl' }));
  const tlm = makeTimeline(cl, 980, 560, { left: '50px', top: '1010px' });
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
  return { zb, i6, i7, r1, r2, cur, rp, cl, cloud, sp, bars, flyW, tlm, ph, kwW, tlk, dial, mic, arcs, bub, ed, cur3, rp3, ok3 };
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
    const up = prog(t, t0 + 0.1 + i * 0.012, 0.9), h = 60 + 80 * Math.abs(Math.sin(t * 7 + i));
    b.style.height = h + 'px'; b.style.top = lerp(1800 - h, 760, eo3(up)) + 'px'; b.style.opacity = (1 - up) * 0.95 + 0.0; b.style.transform = `scaleX(${1 - up * 0.7})`;
    b.style.left = lerp(90 + i * 42, 540 - 10, eo3(up)) + 'px';
  });
  S.flyW.forEach((w, i) => {
    const st = t0 + 0.75 + i * 0.22, p = eo3(prog(t, st, 0.7));
    const tx = 800 - i * 190, ty = 1080;
    w.style.left = lerp(540, tx, p) + 'px'; w.style.top = lerp(520, ty + 20, p) + 'px';
    w.style.opacity = clamp(prog(t, st, 0.15)); w.style.transform = `translate(-50%,-50%) scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * 20}deg)`;
  });
  S.tlm.draw({ cuts: 1, sil: 1, rep: 1, caps: prog(t, t0 + 1.0, 1.3), pulse: t, play: -1 });
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

// ================= S6  CTA =================
scene(54.4, 65.3, el => {
  const glow = mk('div', '', el, '', { position: 'absolute', left: '220px', top: '90px', width: '640px', height: '640px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,210,0,.45),transparent 65%)' });
  const duck = mk('img', '', el, null, { position: 'absolute', left: '360px', top: '170px', width: '360px', height: '360px', objectFit: 'contain' }); setImg(duck, 'assets/custom_duck.png');
  const confetti = mk('canvas', '', el, null, { position: 'absolute', left: '0', top: '0', width: '1080px', height: '1920px' }); confetti.width = 540; confetti.height = 960;
  const br = mk('div', '', el, '', { position: 'absolute', left: '90px', top: '620px', width: '900px', height: '520px', borderRadius: '36px', background: '#14161a', border: '4px solid #2b2e35', boxShadow: '0 40px 120px rgba(0,0,0,.7)', overflow: 'hidden' });
  br.innerHTML = '<div style="height:96px;background:#1c1f24;display:flex;align-items:center;padding:0 26px;gap:16px"><span style="width:22px;height:22px;border-radius:50%;background:#ff5f57"></span><span style="width:22px;height:22px;border-radius:50%;background:#febc2e"></span><span style="width:22px;height:22px;border-radius:50%;background:#28c840"></span><div style="flex:1;margin-left:16px;height:56px;border-radius:28px;background:#0d0e11;border:2px solid #FFD200;display:flex;align-items:center;padding:0 26px;font-size:40px;font-weight:800;direction:ltr;color:#fff"><span class="ty"></span><span class="cr" style="width:4px;height:36px;background:#FFD200;margin-left:4px"></span></div></div>' +
    '<div style="position:absolute;left:0;right:0;top:130px;text-align:center"><img src="assets/custom_duck.png" style="width:150px;height:150px;object-fit:contain"></div>' +
    '<div class="btn" style="position:absolute;left:150px;right:150px;top:330px;height:120px;border-radius:60px;background:linear-gradient(90deg,#FFD200,#ffa800);display:flex;align-items:center;justify-content:center;gap:22px;font-size:66px;font-weight:900;color:#111;box-shadow:0 0 70px rgba(255,210,0,.5)"><span>⬇️</span><span>🎁</span></div>';
  const cur = cursorEl(el); const rp = rippleSet(el);
  const bio = mk('div', '', el, '', { position: 'absolute', left: '0', top: '1200px', width: '1080px', height: '220px' });
  bio.innerHTML = '<div style="position:absolute;left:290px;top:60px;width:500px;height:110px;border-radius:55px;background:#FFD200;color:#111;display:flex;align-items:center;justify-content:center;gap:16px;font-size:60px;font-weight:900;direction:ltr">🔗 <span>Bio</span></div>';
  const arrow = bigEmoji(el, '👆', 540, 1400, 120);
  const tl = makeTimeline(el, 980, 560, { left: '50px', top: '1130px', transform: 'scale(.62)', transformOrigin: '50% 0' });
  const boss = bigEmoji(el, '🎬', 300, 1010, 200); const cup = bigEmoji(el, '☕', 780, 1010, 200); const crown = bigEmoji(el, '👑', 780, 890, 120);
  return { glow, duck, confetti, br, cur, rp, bio, arrow, tl, boss, cup, crown };
}, (t, s) => {
  const S = s.st;
  const g = eoB(prog(t, 54.6, 0.6)); S.glow.style.opacity = clamp(g); S.glow.style.transform = `scale(${0.7 + 0.3 * g + 0.04 * Math.sin(t * 4)})`;
  pop(S.duck, t, 54.6, 0.6, 0); S.duck.style.transform += ` translateY(${Math.sin(t * 3) * 10}px)`;
  // confetti burst at T(34)
  const c = S.confetti.getContext('2d'); c.clearRect(0, 0, 540, 960); const cp = prog(t, T(34) - 0.1, 2.2);
  if (cp > 0 && cp < 1) { const r = rnd(5); for (let i = 0; i < 60; i++) { const a = r() * 6.283, v = 120 + r() * 300, x = 270 + Math.cos(a) * v * cp, y = 130 + Math.sin(a) * v * cp + 260 * cp * cp; c.fillStyle = ['#FFD200', '#ff4fa3', '#00c2ff', '#7cf29c'][i % 4]; c.globalAlpha = 1 - cp; c.fillRect(x, y, 8, 14); } c.globalAlpha = 1; }
  // browser typing + download click
  const bo = eo3(prog(t, T(34) - 0.05, 0.5)); show(S.br, bo * (1 - prog(t, T(37) - 0.15, .3))); S.br.style.transform = `translateY(${(1 - bo) * 200}px)`;
  const url = 'happyduckai.com', n = Math.floor(clamp((t - (T(34) + 0.6)) / 1.6) * url.length);
  S.br.querySelector('.ty').textContent = url.slice(0, n); S.br.querySelector('.cr').style.opacity = Math.sin(t * 12) > 0 ? 1 : 0;
  const clickT = T(36) + 0.6; moveCursor(S.cur, t, clickT, 540, 620 + 390, 300, 300);
  const press = t > clickT && t < clickT + 0.2 ? 0.94 : 1; S.br.querySelector('.btn').style.transform = `scale(${press})`;
  doRipple(S.rp, t, clickT, 540, 1010);
  const bi = eoB(prog(t, T(35) - 0.05, 0.5)); show(S.bio, bi * (1 - prog(t, T(37) - 0.15, .3))); S.bio.style.transform = `scale(${0.7 + 0.3 * bi})`;
  show(S.arrow, prog(t, T(35) + 0.2, .3) * (1 - prog(t, T(37) - 0.15, .3))); setXf(S.arrow, 0, Math.sin(t * 8) * 18);
  // final: the AI works, you direct
  const fin = eo3(prog(t, T(37) - 0.1, 0.5));
  S.tl.draw({ cuts: 1, flagS: 0, flagR: 0, sil: (t * 0.35) % 1.4, rep: (t * 0.35) % 1.4 - 0.2, caps: 1, pulse: t, play: (t * 0.25) % 1, clean: (t * 0.35) % 1.4 - 0.2 });
  S.tl.cv.style.opacity = fin; S.tl.cv.style.display = fin <= 0.001 ? 'none' : 'block';
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
  wipe.style.opacity = wo * 0.85; wipe.style.left = wx + 'px';
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
