// ---------------------------------------------------------------- utilities
const W = 1920, H = 1080;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const smoother = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const easeIO = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
// keyframe interpolation: kf(t,[[t0,v0],[t1,v1],...], easeFn)
function kf(t, k, ease = smoother) {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const a = k[i - 1], b = k[i];
      const u = ease === null ? (t - a[0]) / (b[0] - a[0]) : ease(0, 1, (t - a[0]) / (b[0] - a[0]));
      return Array.isArray(a[1]) ? mix3(a[1], b[1], u) : lerp(a[1], b[1], u);
    }
  }
  return k[k.length - 1][1];
}
// deterministic hash / noise
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
function hash2(a, b) { return hash(a * 12.9898 + b * 78.233); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); }
function fbm1(x, o = 4) { let a = .5, s = 0, f = 1; for (let i = 0; i < o; i++) { s += a * noise1(x * f + i * 17.3); f *= 2.03; a *= .5; } return s; }
function noise2(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hash2(ix, iy), hash2(ix + 1, iy), u), lerp(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), u), v); }
function rng(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
// linear-HDR colour -> css sRGB (matches the shaders' ACES + gamma)
function acesC(x) { x = Math.max(0, x * .9); return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)); }
function css(c, a = 1, k = 1) { const f = v => Math.round(255 * Math.pow(acesC(v * k), .4545)); return `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${a})`; }
function rgbaS(c, a = 1) { return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`; }

// ---------------------------------------------------------------- WebGL
const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
const gl = glc.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
const PROGS = {};
function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); return s; }
function initGL() {
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  for (const k of ['SKY', 'SPACE', 'CLOUDS', 'FIRE']) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, SH.VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, SH[k]));
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    PROGS[k] = { p, loc: {} };
  }
}
function runGL(name, u) {
  const P = PROGS[name]; gl.useProgram(P.p);
  const l = gl.getAttribLocation(P.p, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, W, H); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  u = Object.assign({ R: [W, H] }, u);
  for (const k in u) {
    let loc = P.loc[k]; if (loc === undefined) loc = P.loc[k] = gl.getUniformLocation(P.p, k);
    if (loc === null) continue;
    const v = u[k];
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2fv(loc, v); else if (v.length === 3) gl.uniform3fv(loc, v); else if (v.length === 4) gl.uniform4fv(loc, v);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return glc;
}
function mkCanvas(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---------------------------------------------------------------- shape helpers
function bez(p0, p1, p2, p3, t) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; }
function bezPts(p0, p1, p2, p3, n = 20) { const a = []; for (let i = 0; i <= n; i++) a.push(bez(p0, p1, p2, p3, i / n)); return a; }
// filled tapered tube along polyline; r = [r0, r1] or function(t)
function tube(c, pts, r0, r1, capEnd = true) {
  const n = pts.length; const L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
    const t = i / (n - 1); const r = typeof r0 === 'function' ? r0(t) : lerp(r0, r1, t);
    L.push([pts[i][0] - dy * r, pts[i][1] + dx * r]); Rr.push([pts[i][0] + dy * r, pts[i][1] - dx * r]);
  }
  c.beginPath(); c.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) c.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]);
  c.closePath(); c.fill();
  const rs = typeof r0 === 'function' ? r0(0) : r0, re = typeof r0 === 'function' ? r0(1) : r1;
  c.beginPath(); c.arc(pts[0][0], pts[0][1], rs, 0, 7); c.fill();
  if (capEnd) { c.beginPath(); c.arc(pts[n - 1][0], pts[n - 1][1], re, 0, 7); c.fill(); }
}
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); }
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); }
