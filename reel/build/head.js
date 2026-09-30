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
