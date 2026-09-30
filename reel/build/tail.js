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
