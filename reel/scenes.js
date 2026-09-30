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

// ===== S1  HOOK =====
scene(0, 6.3, el => {
  const bgI = mk('img', '', el, null, { position: 'absolute', left: '-900px', top: '0', height: '1920px', filter: 'blur(14px) brightness(.3)' });
  const sc = mk('div', '', el, '✂️', { position: 'absolute', left: '0', top: '330px', width: '1080px', textAlign: 'center', fontSize: '230px' });
  const L = [
    mk('div', 'txt', el, 'لسه <span style="color:#FFD200">بتقص السكتات</span>؟', { top: '700px', fontSize: '92px' }),
    mk('div', 'txt', el, 'وبتكتب <span style="color:#FFD200">الكابشن</span>', { top: '880px', fontSize: '92px' }),
    mk('div', 'txt', el, '<span style="color:#FFD200">كلمة كلمة</span>؟', { top: '1050px', fontSize: '140px' }),
  ];
  const yr = mk('div', 'txt', el, '2026', { top: '720px', fontSize: '430px', color: '#FFD200', direction: 'ltr', textShadow: '0 0 90px rgba(255,210,0,.55)' });
  const no = mk('div', '', el, '❌ مبقاش ينفع', { position: 'absolute', left: '140px', top: '1260px', width: '800px', textAlign: 'center', padding: '26px 0', background: '#E5334B', borderRadius: '28px', fontSize: '90px', fontWeight: '900', transform: 'rotate(-4deg)' });
  return { bgI, sc, L, yr, no };
}, (t, s) => {
  const { bgI, sc, L, yr, no } = s.st;
  setImg(bgI, `clips/cut_demo/${String(Math.min(617, 1 + Math.floor((8 + t * 0.9) * 30))).padStart(4, '0')}.jpg`);
  const A = 1 - prog(t, 3.3, 0.35);
  L.forEach((e, i) => { pop(e, t, [0.45, 1.3, 2.2][i], 0.45, 60); e.style.opacity *= A * 0.9 + 0.0; if (A < 0.01) e.style.display = 'none'; });
  sc.style.transform = `rotate(${Math.sin(t * 14) * 14 * A}deg) scale(${1 + 0.05 * Math.sin(t * 6)})`; sc.style.opacity = A;
  pop(yr, t, 3.4, 0.5, 0); yr.style.transform += ' rotate(-5deg)';
  pop(no, t, 4.3, 0.45, 0); no.style.transform += ' rotate(-4deg)';
});

// ===== S2  PROBLEM =====
scene(6.0, 14.7, el => {
  const bgI = mk('img', '', el, null, { position: 'absolute', left: '-900px', top: '0', height: '1920px', filter: 'blur(12px) brightness(.28)' });
  const items = [
    ['🎬', 'بتصوّر الفيديو'], ['👂', 'ساعات بتسمع وتقص السكتات'], ['🔁', 'بتشيل الجمل اللي اتعادت'], ['📝', 'وتكتب الكابشن كلمة كلمة'],
  ].map((it, i) => mk('div', 'chip', el, `<span style="font-size:68px">${it[0]}</span><span>${it[1]}</span>`, { left: '90px', width: '900px', top: (330 + i * 185) + 'px', justifyContent: 'flex-start' }));
  const clock = mk('div', '', el, '', { position: 'absolute', left: '90px', top: '1090px', width: '900px', textAlign: 'center' });
  clock.innerHTML = '<div style="font-size:40px;color:#9499A1;font-weight:700">الوقت اللي راح</div><div class="clk" style="font-size:190px;font-weight:900;color:#E5334B;direction:ltr;font-variant-numeric:tabular-nums;line-height:1.1;text-shadow:0 0 60px rgba(229,51,75,.4)">00:00:00</div>';
  const bar = mk('div', '', el, '<div style="font-size:42px;font-weight:800;margin-bottom:14px">تصدير الريل ⏳</div><div style="height:46px;border-radius:23px;background:#222;overflow:hidden"><div class="fill" style="height:100%;width:12%;background:linear-gradient(90deg,#FFD200,#ffa800)"></div></div><div class="lab" style="margin-top:16px;font-size:54px;font-weight:900;color:#E5334B">لسه ما نزلش</div>', { position: 'absolute', left: '90px', top: '1120px', width: '900px', textAlign: 'center' });
  return { bgI, items, clock, bar };
}, (t, s) => {
  const { bgI, items, clock, bar } = s.st;
  setImg(bgI, `clips/caption_demo/${String(Math.min(610, 1 + Math.floor((3 + (t - 6) * 0.6) * 30))).padStart(4, '0')}.jpg`);
  items.forEach((e, i) => slideIn(e, t, T(2 + i) - 0.1, 500));
  const hide = prog(t, T(6) - 0.1, 0.25);
  items.forEach(e => { e.style.opacity *= 1 - 0.0; });
  const c0 = T(3);
  const secs = Math.floor(Math.max(0, t - c0) * 3100) % 86400;
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0'), mm = String(Math.floor(secs / 60) % 60).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
  clock.querySelector('.clk').textContent = `${hh}:${mm}:${ss}`;
  const co = clamp(prog(t, c0, 0.3)) * (1 - prog(t, T(7) - 0.1, 0.25));
  clock.style.opacity = co; clock.style.display = co <= 0 ? 'none' : '';
  const bo = prog(t, T(7) - 0.05, 0.3);
  bar.style.opacity = bo; bar.style.display = bo <= 0 ? 'none' : '';
  bar.querySelector('.fill').style.width = (12 + 0.6 * Math.sin(t * 5)) + '%';
});

// ===== S3  SOLUTION =====
scene(14.4, 20.2, el => {
  const a = mk('div', 'txt', el, 'الحل بقى في', { top: '300px', fontSize: '76px', color: '#9499A1', fontWeight: '700' });
  const b = mk('div', 'txt', el, 'الذكاء الاصطناعي', { top: '390px', fontSize: '134px', color: '#FFD200', textShadow: '0 0 80px rgba(255,210,0,.5)' });
  const glow = mk('div', '', el, '', { position: 'absolute', left: '240px', top: '620px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,210,0,.45),transparent 65%)' });
  const duck = mk('img', '', el, null, { position: 'absolute', left: '290px', top: '670px', width: '500px', height: '500px', objectFit: 'contain' });
  setImg(duck, 'assets/custom_duck.png');
  const name = mk('div', 'txt', el, 'Happy Duck AI', { top: '1210px', fontSize: '112px', direction: 'ltr', color: '#fff' });
  const pr = mk('div', 'chip', el, '<span style="background:#2c1f6b;color:#9999ff;font-weight:900;padding:6px 16px;border-radius:10px;font-size:46px;border:3px solid #9999ff">Pr</span><span>إضافة لبريمير برو</span>', { left: '200px', width: '680px', top: '1360px', justifyContent: 'center' });
  const ok = mk('div', 'txt', el, '✅ قص  ✅ تنقية  ✅ كابشن', { top: '1490px', fontSize: '62px', color: '#fff' });
  return { a, b, glow, duck, name, pr, ok };
}, (t, s) => {
  const { a, b, glow, duck, name, pr, ok } = s.st;
  pop(a, t, T(8) - 0.05, 0.4, 40); pop(b, t, T(8) + 0.25, 0.5, 40);
  const g = eoB(prog(t, T(9) - 0.05, 0.6));
  glow.style.opacity = clamp(g); glow.style.transform = `scale(${0.6 + 0.6 * g + 0.04 * Math.sin(t * 4)})`;
  pop(duck, t, T(9) - 0.05, 0.6, 0); duck.style.transform += ` translateY(${Math.sin(t * 3) * 10}px)`;
  pop(name, t, T(9) + 0.1, 0.5, 40); pop(pr, t, T(10), 0.45, 40); pop(ok, t, T(11) + 0.1, 0.5, 40);
});

// ===== S4  SMART CUT (real UI) =====
function uiScene(a, b, build, upd) { return scene(a, b, build, upd); }
scene(19.8, 42.0, el => {
  const zb = mk('div', 'layer', el);
  const pan = mk('div', 'panel', zb, null, { left: PN.x + 'px', top: PN.y + 'px', width: (1040 * PN.s) + 'px', height: (1500 * PN.s) + 'px' });
  const imgs = {};
  ['01_smartcut_empty', '02_smartcut_waveform', '05_smartcut_progress'].forEach(n => {
    const im = mk('img', '', pan); setImg(im, `assets/ui_${n}.png`); imgs[n] = im;
  });
  const r1 = ring(zb), r2 = ring(zb), r3 = ring(zb);
  const cur = cursorEl(zb), rp = rippleSet(zb);
  const tag = mk('div', '', el, '١ &nbsp;التقطيع الذكي', { position: 'absolute', left: '0', top: '132px', width: '1080px', textAlign: 'center', fontSize: '56px', fontWeight: '900', color: '#FFD200' });
  // "select clip" mini timeline card
  const sel = mk('div', '', el, '', { position: 'absolute', left: '90px', top: '520px', width: '900px', height: '420px', background: '#15171b', border: '3px solid #2d3036', borderRadius: '28px', boxShadow: '0 30px 80px rgba(0,0,0,.7)' });
  sel.innerHTML = '<div style="position:absolute;left:30px;top:22px;font-size:38px;color:#9499A1;font-weight:700">Premiere Pro · Timeline</div>' +
    '<div style="position:absolute;left:30px;top:100px;width:840px;height:90px;background:#1c1f24;border-radius:10px"></div>' +
    '<div class="clip" style="position:absolute;left:70px;top:106px;width:720px;height:78px;background:#4d86d6;border-radius:8px;border:4px solid #4d86d6;display:flex;align-items:center;padding:0 20px;font-weight:800;font-size:34px">VID_0424.mp4</div>' +
    '<div style="position:absolute;left:30px;top:220px;width:840px;height:90px;background:#1c1f24;border-radius:10px"></div>' +
    '<div style="position:absolute;left:70px;top:226px;width:720px;height:78px;background:#3b9a78;border-radius:8px;opacity:.85"></div>';
  const selc = cursorEl(sel);
  const selBadge = mk('div', 'pill', el, 'وحدد الكليب', { top: '980px' });
  // word-boundary diagram
  const dg = mk('div', '', el, '', { position: 'absolute', left: '60px', top: '260px', width: '960px', height: '1290px', background: '#111317', border: '3px solid rgba(255,210,0,.4)', borderRadius: '36px', boxShadow: '0 30px 90px rgba(0,0,0,.7)' });
  const words = [[60, 140], [230, 120], [380, 210], [620, 120], [770, 170]];
  function row(top, title, cls) {
    let h = `<div style="position:absolute;right:40px;top:${top}px;font-size:54px;font-weight:900">${title}</div>`;
    words.forEach(w => { h += `<div style="position:absolute;left:${w[0] + 20}px;top:${top + 140}px;width:${w[1]}px;height:150px;border-radius:14px;background:repeating-linear-gradient(90deg,#00e676 0 10px,#00b85c 10px 14px);opacity:.95"></div>`; });
    return h + `<div class="${cls}"></div>`;
  }
  dg.innerHTML = row(50, 'Happy Duck AI: على حدود الكلمات', 'rowB') + row(700, 'قص بالموجة الصوتية بس', 'rowA');
  const cutsA = [[60 + 75, 1], [380 + 105 + 20, 1], [770 + 85 + 20, 1]].map(c => mk('div', '', dg, '', { position: 'absolute', left: (c[0] + 20 - 4) + 'px', top: '810px', width: '8px', height: '190px', background: '#E5334B', borderRadius: '4px', boxShadow: '0 0 24px #E5334B' }));
  const gapX = [220, 370, 600, 740].map(x => x + 20 + 10);
  const cutsB = gapX.map(x => mk('div', '', dg, '', { position: 'absolute', left: (x - 4) + 'px', top: '160px', width: '8px', height: '190px', background: '#00e676', borderRadius: '4px', boxShadow: '0 0 24px #00e676' }));
  const badA = mk('div', '', dg, '❌ كلمة اتقطعت في نصها', { position: 'absolute', left: '0', top: '1050px', width: '960px', textAlign: 'center', fontSize: '50px', fontWeight: '900', color: '#ff5a70' });
  const badB = mk('div', '', dg, '✅ ولا كلمة اتقطعت', { position: 'absolute', left: '0', top: '400px', width: '960px', textAlign: 'center', fontSize: '58px', fontWeight: '900', color: '#00e676' });
  // timeline closing graphic
  const tg = mk('div', '', el, '', { position: 'absolute', left: '60px', top: '250px', width: '960px', height: '780px', background: '#111317', border: '3px solid rgba(255,210,0,.4)', borderRadius: '36px', boxShadow: '0 30px 90px rgba(0,0,0,.7)', overflow: 'hidden' });
  const blocks = [
    { w: 170, c: '#4d86d6', k: 'ok' }, { w: 90, c: '#555', k: 'gap' }, { w: 150, c: '#4d86d6', k: 'ok' },
    { w: 130, c: '#d65d5d', k: 'rep' }, { w: 70, c: '#555', k: 'gap' }, { w: 190, c: '#4d86d6', k: 'ok' },
  ].map(b => ({ ...b, el: mk('div', '', tg, b.k === 'gap' ? '' : '', { position: 'absolute', top: '330px', height: '150px', width: b.w + 'px', borderRadius: '10px', background: b.k === 'gap' ? 'repeating-linear-gradient(45deg,#3a1d22 0 10px,#6a2a33 10px 20px)' : b.c }) }));
  const tl1 = mk('div', '', tg, 'التايم لاين', { position: 'absolute', right: '40px', top: '40px', fontSize: '50px', fontWeight: '900' });
  const lab = mk('div', '', tg, '', { position: 'absolute', left: '0', top: '560px', width: '960px', textAlign: 'center', fontSize: '62px', fontWeight: '900', color: '#FFD200' });
  const foot = mk('img', '', el, null, { position: 'absolute', left: '60px', top: '1070px', width: '960px', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,.7)', border: '3px solid #2d3036' });
  // stamp
  const st1 = mk('div', 'txt', el, '✂️ قص حقيقي', { top: '560px', fontSize: '124px', color: '#00e676', textShadow: '0 0 70px rgba(0,230,118,.4)' });
  const st2 = mk('div', 'txt', el, '<span style="position:relative">علامات<span class="strk" style="position:absolute;left:-10px;right:-10px;top:52%;height:14px;background:#E5334B;border-radius:7px;transform-origin:right;transform:scaleX(0)"></span></span>', { top: '800px', fontSize: '130px', color: '#9499A1' });
  return { zb, pan, imgs, r1, r2, r3, cur, rp, tag, sel, selc, selBadge, dg, cutsA, cutsB, badA, badB, tg, blocks, lab, foot, st1, st2, words };
}, (t, s) => {
  const S = s.st;
  const a = 19.8;
  const show = (e, v) => { e.style.opacity = v; e.style.display = v <= 0.001 ? 'none' : 'block'; };
  // phase windows
  const tSel0 = T(13) - 0.1, tSel1 = T(14) - 0.1;
  const tDiag0 = T(18) - 0.25, tDiag1 = T(21) - 0.2;
  const tGfx0 = T(21) - 0.2, tGfx1 = T(24) - 0.15;
  const tStamp0 = T(24) - 0.15;
  const panelVis = 1 - clamp(prog(t, tDiag0, 0.3)) ;
  const selOn = prog(t, tSel0, 0.25) * (1 - prog(t, tSel1, 0.25));
  const panDim = 1 - 0.65 * selOn;
  show(S.zb, panelVis * panDim);
  // panel slide-up enter
  const enter = eo3(prog(t, a, 0.6));
  // zoom
  let z = 1, ox = 540, oy = 960;
  const z1 = eo3(prog(t, T(14) - 0.2, 0.6)) * (1 - eo3(prog(t, T(15) - 0.05, 0.4)));
  const z2 = eo3(prog(t, T(15), 0.6)) * (1 - eo3(prog(t, T(17) - 0.05, 0.4)));
  const z3 = eo3(prog(t, T(17) - 0.3, 0.6));
  if (z1 > 0) { ox = ux(520); oy = uy(780); z = 1 + 0.12 * z1; }
  if (z2 > 0 && z1 <= 0.001) { ox = ux(520); oy = uy(760); z = 1 + 0.1 * z2; }
  if (z3 > 0 && z2 <= 0.001) { ox = ux(520); oy = uy(1252); z = 1 + 0.12 * z3; }
  S.zb.style.transformOrigin = `${ox}px ${oy}px`;
  S.zb.style.transform = `translateY(${(1 - enter) * 200}px) scale(${z})`;
  // image crossfade
  show(S.imgs['01_smartcut_empty'], 1);
  show(S.imgs['02_smartcut_waveform'], eo3(prog(t, T(15), 0.35)));
  show(S.imgs['05_smartcut_progress'], eo3(prog(t, T(17) + 1.0, 0.3)));
  // rings / clicks
  setRing(S.r1, t, T(12) + 0.1, T(13) - 0.05, ux(120), uy(210), 190 * PN.s, 130 * PN.s);
  setRing(S.r2, t, T(16), T(17) - 0.1, ux(520), uy(760), 930 * PN.s, 90 * PN.s);
  setRing(S.r3, t, T(17) - 0.25, T(17) + 1.3, ux(520), uy(1252), 915 * PN.s, 110 * PN.s);
  moveCursor(S.cur, t, T(14) + 0.35, ux(520), uy(780), 300, 400);
  const c2 = T(17) + 0.3;
  const curPos = t < T(16) ? null : null;
  doRipple(S.rp, t, T(14) + 0.35, ux(520), uy(780));
  // second click (Cut & Clean) reuses cursor: draw a second one via ripple only
  if (t > T(17) - 0.3) { moveCursor(S.cur, t, c2, ux(520), uy(1252), 250, 300); doRipple(S.rp, t, c2, ux(520), uy(1252)); }
  // tag
  show(S.tag, clamp(prog(t, a + 0.2, 0.3)) * (1 - prog(t, tStamp0 + 0.1, 0.3)));
  // select clip card
  S.sel.style.opacity = selOn; S.sel.style.display = selOn <= 0.001 ? 'none' : 'block';
  S.sel.style.transform = `translateY(${(1 - eo3(prog(t, tSel0, 0.4))) * 60}px)`;
  S.sel.querySelector('.clip').style.boxShadow = `0 0 0 ${prog(t, T(13) + 0.6, 0.15) * 6}px #FFD200`;
  moveCursor(S.selc, t, T(13) + 0.6, 420, 145, -300, 160);
  const bo = selOn; S.selBadge.style.opacity = bo; S.selBadge.style.display = bo <= 0.001 ? 'none' : 'block';
  // diagram
  const dgOn = prog(t, tDiag0, 0.35) * (1 - prog(t, tDiag1, 0.3));
  show(S.dg, dgOn); S.dg.style.transform = `translateY(${(1 - eo3(prog(t, tDiag0, 0.5))) * 160}px)`;
  S.cutsB.forEach((c, i) => { c.style.opacity = prog(t, T(18) + 0.3 + i * 0.25, 0.2); c.style.transform = `scaleY(${eo3(prog(t, T(18) + 0.3 + i * 0.25, 0.25))})`; });
  S.badB.style.opacity = prog(t, T(18) + 1.7, 0.3);
  S.cutsA.forEach((c, i) => { c.style.opacity = prog(t, T(19) + i * 0.2, 0.2); c.style.transform = `scaleY(${eo3(prog(t, T(19) + i * 0.2, 0.25))})`; });
  S.badA.style.opacity = prog(t, T(19) + 0.7, 0.3);
  // timeline closing graphic
  const tgOn = prog(t, tGfx0, 0.35) * (1 - prog(t, tGfx1, 0.3));
  show(S.tg, tgOn); S.tg.style.transform = `translateY(${(1 - eo3(prog(t, tGfx0, 0.5))) * 160}px)`;
  const close1 = eo3(prog(t, T(23) + 0.15, 0.7));
  // compute positions: blocks removed progressively
  const rm = [0, prog(t, T(21) + 0.5, 0.3), 0, prog(t, T(22) + 0.45, 0.3), prog(t, T(21) + 0.5, 0.3), 0];
  const flash = [0, 1 - prog(t, T(21) + 0.4, 0.4), 0, 1 - prog(t, T(22) + 0.35, 0.4), 0, 0];
  let x = 60;
  S.blocks.forEach((b, i) => {
    const gapPhase = b.k === 'gap';
    const repPhase = b.k === 'rep';
    const w = b.w * (1 - (gapPhase || repPhase ? rm[i] : 0));
    b.el.style.left = x + 'px'; b.el.style.width = Math.max(0, w) + 'px';
    b.el.style.opacity = (gapPhase || repPhase) ? (1 - rm[i]) : 1;
    if (repPhase) b.el.style.boxShadow = `0 0 ${30 * (1 - rm[i])}px #ff3b55`;
    x += w + 6;
  });
  S.lab.textContent = t < T(22) ? '✂️ السكتات' : t < T(23) ? '🔁 الجمل المتكررة' : '⇄ الفراغات اتقفلت لوحدها';
  // real footage card under graphic
  const fr = Math.min(617, 1 + Math.floor((8 + Math.max(0, t - tGfx0) * 0.7) * 30));
  setImg(S.foot, `clips/cut_demo/${String(fr).padStart(4, '0')}.jpg`);
  show(S.foot, tgOn); S.foot.style.transform = `translateY(${(1 - eo3(prog(t, tGfx0 + 0.1, 0.5))) * 260}px)`;
  // stamp
  pop(S.st1, t, tStamp0 + 0.05, 0.5, 0);
  pop(S.st2, t, T(25) - 0.2, 0.45, 0);
  S.st2.querySelector('.strk').style.transform = `scaleX(${eo3(prog(t, T(25) + 0.15, 0.3))})`;
  S.st1.style.opacity *= 1;
});

// ===== S5  CAPTIONS =====
scene(41.7, 54.7, el => {
  const zb = mk('div', 'layer', el);
  const pan = mk('div', 'panel', zb, null, { left: PN.x + 'px', top: PN.y + 'px', width: (1040 * PN.s) + 'px', height: (1500 * PN.s) + 'px' });
  const i6 = mk('img', '', pan), i7 = mk('img', '', pan);
  setImg(i6, 'assets/ui_06_caption_templates.png'); setImg(i7, 'assets/ui_07_caption_generating.png');
  const r1 = ring(zb), r2 = ring(zb), cur = cursorEl(zb), rp = rippleSet(zb);
  const tag = mk('div', '', el, '٢ &nbsp;الكابشن', { position: 'absolute', left: '0', top: '132px', width: '1080px', textAlign: 'center', fontSize: '56px', fontWeight: '900', color: '#FFD200' });
  const cloud = mk('div', 'chip', el, '☁️ <b>تفريغ سحابي</b> بالذكاء الاصطناعي', { left: '100px', width: '880px', top: '1440px', justifyContent: 'center' });
  const tlc = mk('img', '', el, null, { position: 'absolute', left: '40px', top: '300px', width: '1000px', borderRadius: '26px', border: '3px solid #2d3036', boxShadow: '0 30px 90px rgba(0,0,0,.7)' });
  const nest = mk('div', 'pill', el, 'Nested Sequence جوه بريمير', { top: '880px' });
  const kar = mk('div', '', el, '', { position: 'absolute', left: '0', top: '1060px', width: '1080px', textAlign: 'center', direction: 'rtl' });
  const karW = ['الكابشن', 'بينزل', 'كلمة', 'بكلمة'].map(w => mk('span', 'cw', kar, w, { fontSize: '66px' }));
  const badges = ['🇪🇬 مصري', '🇸🇦 خليجي', '🇸🇾 شامي', '🇲🇦 مغاربي', '🇬🇧 English'].map((w, i) => mk('div', 'chip', el, w, { left: (i % 2 === 0 ? 70 : 560) + 'px', width: '450px', top: (760 + Math.floor(i / 2) * 170) + 'px', justifyContent: 'center' }));
  const dh = mk('div', 'txt', el, 'مصمم <span style="color:#FFD200">للعربي</span>', { top: '420px', fontSize: '140px' });
  const ed = mk('img', '', el, null, { position: 'absolute', left: '40px', top: '330px', width: '1000px', borderRadius: '26px', border: '4px solid #FFD200', boxShadow: '0 30px 90px rgba(0,0,0,.7)' });
  const edc = mk('div', 'chip', el, '✏️ <b>عدّل أي كلمة</b> بضغطة', { left: '140px', width: '800px', top: '1340px', justifyContent: 'center' });
  return { zb, i6, i7, r1, r2, cur, rp, tag, cloud, tlc, nest, kar, karW, badges, dh, ed, edc };
}, (t, s) => {
  const S = s.st, a = 41.7;
  const show = (e, v) => { e.style.opacity = v; e.style.display = v <= 0.001 ? 'none' : 'block'; };
  const tPan1 = T(29) - 0.15;            // panel leaves
  const tTl0 = T(29) - 0.15, tTl1 = T(31) - 0.1;
  const tBd0 = T(31) - 0.1, tBd1 = T(32) + 0.05 + 0.6;
  const tEd0 = T(32) + 0.4;
  const panOn = 1 - prog(t, tPan1, 0.3);
  show(S.zb, panOn);
  const enter = eo3(prog(t, a, 0.6));
  const z1 = eo3(prog(t, T(27) - 0.1, 0.6)) * (1 - eo3(prog(t, T(28) - 0.05, 0.3)));
  const z2 = eo3(prog(t, T(28), 0.5));
  let z = 1, ox = 540, oy = 960;
  if (z1 > 0) { ox = ux(742); oy = uy(1226); z = 1 + 0.12 * z1; }
  if (z2 > 0 && z1 <= 0.001) { ox = ux(520); oy = uy(900); z = 1 + 0.1 * z2; }
  S.zb.style.transformOrigin = `${ox}px ${oy}px`;
  S.zb.style.transform = `translateY(${(1 - enter) * 200}px) scale(${z})`;
  show(S.i7, eo3(prog(t, T(28) - 0.05, 0.3)));
  setRing(S.r1, t, T(26) + 0.1, T(27) + 0.05, ux(242), uy(760), 250 * PN.s, 210 * PN.s);
  setRing(S.r2, t, T(27) - 0.05, T(28), ux(742), uy(1226), 440 * PN.s, 92 * PN.s);
  moveCursor(S.cur, t, T(27) + 0.45, ux(742), uy(1226), 300, 260);
  doRipple(S.rp, t, T(27) + 0.45, ux(742), uy(1226));
  show(S.tag, clamp(prog(t, a + 0.2, 0.3)) * (1 - prog(t, tEd0 - 0.1, 0.3)));
  const cl = prog(t, T(28) + 0.1, 0.3) * (1 - prog(t, tPan1, 0.25));
  show(S.cloud, cl);
  // nested timeline + karaoke demo
  const tlo = prog(t, tTl0, 0.35) * (1 - prog(t, tTl1, 0.3));
  setImg(S.tlc, `clips/caption_demo/${String(Math.min(610, 1 + Math.floor((2 + Math.max(0, t - tTl0) * 1.1) * 30))).padStart(4, '0')}.jpg`);
  show(S.tlc, tlo); S.tlc.style.transform = `translateY(${(1 - eo3(prog(t, tTl0, 0.5))) * 160}px)`;
  show(S.nest, prog(t, T(29) + 0.25, 0.3) * (1 - prog(t, tTl1, 0.3)));
  show(S.kar, prog(t, T(30) - 0.15, 0.3) * (1 - prog(t, tTl1, 0.3)));
  const k = Math.floor(Math.max(0, t - T(30)) / 0.33) % 4;
  S.karW.forEach((w, i) => w.classList.toggle('on', i === k));
  // dialect badges
  const bo = prog(t, tBd0, 0.25) * (1 - prog(t, tEd0 - 0.05, 0.25));
  show(S.dh, bo); S.dh.style.transform = `scale(${0.9 + 0.1 * eo3(prog(t, tBd0, 0.4))})`;
  S.badges.forEach((b, i) => { const p = eoB(prog(t, tBd0 + 0.15 + i * 0.12, 0.35)); b.style.opacity = clamp(p) * (1 - prog(t, tEd0 - 0.05, 0.25)); b.style.display = b.style.opacity <= 0.001 ? 'none' : 'block'; b.style.transform = `scale(${0.6 + 0.4 * p})`; });
  // editor / preview footage
  const eo = prog(t, tEd0, 0.35);
  setImg(S.ed, `clips/caption_crop/${String(Math.min(202, 1 + Math.floor(Math.max(0, t - tEd0) * 0.8 * 30))).padStart(4, '0')}.jpg`);
  show(S.ed, eo); S.ed.style.transform = `translateY(${(1 - eo3(prog(t, tEd0, 0.5))) * 180}px)`;
  show(S.edc, prog(t, T(33) - 0.1, 0.3));
});

// ===== S6  CTA =====
scene(54.4, 65.3, el => {
  const glow = mk('div', '', el, '', { position: 'absolute', left: '220px', top: '260px', width: '640px', height: '640px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,210,0,.45),transparent 65%)' });
  const duck = mk('img', '', el, null, { position: 'absolute', left: '340px', top: '350px', width: '400px', height: '400px', objectFit: 'contain' });
  setImg(duck, 'assets/custom_duck.png');
  const h1 = mk('div', 'txt', el, 'جرّبها <span style="color:#FFD200">مجاناً</span>', { top: '800px', fontSize: '140px' });
  const bio = mk('div', 'pill', el, '🔗 الرابط في البايو', { top: '1000px', fontSize: '54px', padding: '18px 46px' });
  const url = mk('div', '', el, 'happyduckai.com', { position: 'absolute', left: '110px', width: '860px', top: '1120px', textAlign: 'center', padding: '22px 0', borderRadius: '30px', background: '#111317', border: '4px solid #FFD200', fontSize: '80px', lineHeight: '1.2', fontWeight: '900', direction: 'ltr', boxShadow: '0 0 70px rgba(255,210,0,.35)' });
  const l1 = mk('div', 'txt', el, 'خلّي الذكاء الاصطناعي <span style="color:#FFD200">يمنتج</span>', { top: '1330px', fontSize: '58px', fontWeight: '800' });
  const l2 = mk('div', 'txt', el, 'وإنت خليك <span style="color:#FFD200">المدير</span> 👑', { top: '1420px', fontSize: '84px' });
  return { glow, duck, h1, bio, url, l1, l2 };
}, (t, s) => {
  const { glow, duck, h1, bio, url, l1, l2 } = s.st;
  const g = eoB(prog(t, 54.6, 0.6));
  glow.style.opacity = clamp(g); glow.style.transform = `scale(${0.7 + 0.3 * g + 0.04 * Math.sin(t * 4)})`;
  pop(duck, t, 54.6, 0.6, 0); duck.style.transform += ` translateY(${Math.sin(t * 3) * 10}px)`;
  pop(h1, t, T(34) - 0.05, 0.5, 40); pop(bio, t, T(35) - 0.05, 0.45, 40);
  pop(url, t, T(36) - 0.05, 0.5, 40);
  pop(l1, t, T(37) - 0.05, 0.45, 40); pop(l2, t, T(38) - 0.1, 0.5, 40);
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
