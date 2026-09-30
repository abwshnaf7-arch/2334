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

