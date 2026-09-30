// Canvas motion-graphics timeline (Premiere-like). No text: everything is shown visually.
const SEGS = [
  { k: 's', l: 120, seed: 1 }, { k: 'g', l: 62 }, { k: 's', l: 150, seed: 2 }, { k: 'r', l: 110, seed: 2 }, { k: 'g', l: 52 },
  { k: 's', l: 170, seed: 3 }, { k: 'g', l: 72 }, { k: 's', l: 130, seed: 4 }, { k: 'r', l: 90, seed: 4 }, { k: 'g', l: 56 }, { k: 's', l: 160, seed: 5 },
];
function rnd(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
const WAVE = {};
function waveFor(seed, n) {
  const key = seed + ':' + n; if (WAVE[key]) return WAVE[key];
  const r = rnd(seed * 17), a = []; let env = 0.5;
  for (let i = 0; i < n; i++) { if (i % 6 === 0) env = 0.25 + r() * 0.75; a.push(env * (0.45 + 0.55 * r())); }
  return (WAVE[key] = a);
}
const ez = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

function makeTimeline(parent, W, H, style) {
  const cv = document.createElement('canvas');
  cv.width = W * 2; cv.height = H * 2;
  Object.assign(cv.style, { position: 'absolute', width: W + 'px', height: H + 'px', ...style });
  parent.appendChild(cv);
  const ctx = cv.getContext('2d');
  // state: cuts(0..1) sil(0..1) rep(0..1) flagS flagR caps(0..1) play(0..1 or -1) razor(0..1 or -1) clean(0..1) sel(0..1) pulse
  function draw(st) {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pad = 26, hdr = 54, lx = pad + 44, rx = W - pad;
    const rr = (x, y, w, h, r, fill, stroke) => { ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, w), h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };
    rr(0, 0, W, H, 26, '#14161a', '#2b2e35');
    // ruler
    ctx.fillStyle = '#23262c'; ctx.fillRect(lx, 22, rx - lx, 2);
    for (let i = 0; i < 24; i++) { ctx.fillStyle = '#3a3e46'; ctx.fillRect(lx + (rx - lx) * i / 23, 22, 2, i % 4 === 0 ? 14 : 7); }
    const yV2 = hdr + 10, hV2 = 62, yV1 = yV2 + hV2 + 14, hV1 = 84, yA = yV1 + hV1 + 14, hA = H - yA - 24;
    [[yV2, hV2, 'V2'], [yV1, hV1, 'V1'], [yA, hA, 'A1']].forEach(([y, h, n]) => {
      rr(lx, y, rx - lx, h, 10, '#1b1e23');
      rr(pad, y, 36, h, 8, '#22262d'); ctx.fillStyle = '#7f8792'; ctx.font = '700 22px Cairo'; ctx.textAlign = 'center'; ctx.fillText(n, pad + 18, y + h / 2 + 8);
    });
    // layout
    const total = SEGS.reduce((a, s) => a + s.l, 0), sc = (rx - lx - 40) / total;
    let gi = 0, ri = 0; const pos = []; let x = lx + 12;
    SEGS.forEach((s, i) => {
      let f = 1;
      if (s.k === 'g') { f = 1 - ez((st.sil || 0) * 3 - gi * 0.55); gi++; }
      if (s.k === 'r') { f = 1 - ez((st.rep || 0) * 2.2 - ri * 0.9); ri++; }
      const w = s.l * sc * f;
      pos.push({ x, w, s, i, f });
      x += w + (f > 0.02 ? (st.cuts > 0 ? 3 : 0) : 0);
    });
    const endX = x;
    const cutP = st.cuts || 0;
    // V1 + A1
    if (cutP < 1) rr(pos[0].x, yV1, endX - pos[0].x - 1, hV1, 8, '#4d86d6');
    pos.forEach(p => {
      const { s } = p; if (p.w < 1) return;
      const idx = p.i / (SEGS.length - 1);
      const split = cutP * (SEGS.length + 1) > p.i + 0.5;
      const isSil = s.k === 'g', isRep = s.k === 'r';
      if (isSil) {
        const fl = st.flagS || 0;
        if (split) rr(p.x, yV1, p.w, hV1, 8, '#2f333a');
        if (fl > 0.05) { rr(p.x, yV1, p.w, hV1, 8, `rgba(229,51,75,${(0.3 + 0.3 * (0.5 + 0.5 * Math.sin((st.pulse || 0) * 9))) * Math.min(1, fl * 2)})`); }
        ctx.fillStyle = 'rgba(229,51,75,.55)'; ctx.fillRect(p.x, yA + hA / 2 - 1, p.w, 2);
        if (fl > 0.05 && p.f > 0.4) { ctx.font = '38px "Noto Color Emoji"'; ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, fl * 2); ctx.fillText('🔇', p.x + p.w / 2, yV1 - 16); ctx.globalAlpha = 1; }
        return;
      }
      const col = isRep ? '#e0753a' : '#4d86d6';
      const glow = isRep ? (st.flagR || 0) : 0;
      if (glow > 0.05) { ctx.shadowColor = '#ff7a3a'; ctx.shadowBlur = 30 * glow * (0.6 + 0.4 * Math.sin((st.pulse || 0) * 9)); }
      if (split) { rr(p.x, yV1, p.w, hV1, 8, isRep && glow > 0.05 ? '#e0753a' : col); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(p.x + 10, yV1 + 12, Math.min(46, p.w - 20), 10); }
      else if (isRep && glow > 0.05) { rr(p.x, yV1, p.w, hV1, 8, `rgba(224,117,58,${0.6 * glow})`); }
      ctx.shadowBlur = 0;
      if (isRep && glow > 0.05 && p.f > 0.4) { ctx.font = '38px "Noto Color Emoji"'; ctx.textAlign = 'center'; ctx.globalAlpha = glow; ctx.fillText('🔁', p.x + p.w / 2, yV1 - 16); ctx.globalAlpha = 1; }
      // audio bars
      const nb = Math.max(1, Math.floor(p.w / 5)), wv = waveFor(s.seed, Math.floor(s.l * sc / 5));
      ctx.fillStyle = isRep ? '#ffb27a' : '#8fc1ff';
      for (let b = 0; b < nb; b++) { const a = wv[Math.min(wv.length - 1, Math.floor(b * wv.length / nb))]; const bh = a * (hA - 12); ctx.fillRect(p.x + b * 5 + 1, yA + hA / 2 - bh / 2, 3, bh); }
    });
    // markers (flags only, nothing cut)
    if (st.markers > 0) {
      const cols = ['#4dd4ac', '#ff5a70', '#ffd200', '#4da3ff'];
      pos.forEach((p, i) => { if (i % 2 === 1 || i === 0) return; const mx = p.x; ctx.globalAlpha = st.markers; ctx.fillStyle = cols[i % 4]; ctx.fillRect(mx - 1.5, 28, 3, 34); ctx.beginPath(); ctx.moveTo(mx, 28); ctx.lineTo(mx + 26, 38); ctx.lineTo(mx, 48); ctx.fill(); ctx.globalAlpha = 1; });
    }
    // captions on V2
    const capN = st.caps || 0;
    if (capN > 0) {
      let c = 0;
      pos.forEach(p => {
        if (p.s.k === 'g' || p.w < 6) return;
        const parts = Math.max(2, Math.round(p.w / 46));
        for (let j = 0; j < parts; j++) {
          const k = c++ / 14; if (k > capN * 1.2) continue;
          const a = cl(capN * 1.2 - k);
          const bw = p.w / parts - 4, bx = p.x + j * (p.w / parts) + 2;
          ctx.globalAlpha = a; rr(bx, yV2 + 8, bw * (0.4 + 0.6 * a), hV2 - 16, 8, '#ff4fa3');
          ctx.fillStyle = '#ffd200'; ctx.fillRect(bx + 6, yV2 + 14, 16, 8); ctx.globalAlpha = 1;
        }
      });
    }
    // selection outline (clip selected)
    if (st.sel > 0) { const p0 = pos[0], p1 = pos[pos.length - 1]; ctx.strokeStyle = `rgba(255,210,0,${st.sel})`; ctx.lineWidth = 5; ctx.strokeRect(p0.x - 3, yV1 - 3, endX - p0.x + 6, hV1 + 6); }
    // razor sweep
    if (st.razor >= 0 && st.razor <= 1) {
      const rx0 = lx + 12 + st.razor * (endX - lx - 12);
      ctx.fillStyle = '#FFD200'; ctx.fillRect(rx0 - 2, hdr - 8, 4, H - hdr - 6);
      ctx.font = '54px "Noto Color Emoji"'; ctx.textAlign = 'center'; ctx.fillText('✂️', rx0, hdr - 12);
    }
    // playhead
    if (st.play >= 0) {
      const px = lx + 12 + st.play * (endX - lx - 12);
      ctx.fillStyle = '#4da3ff'; ctx.fillRect(px - 1.5, 30, 3, H - 40);
      ctx.beginPath(); ctx.moveTo(px - 10, 24); ctx.lineTo(px + 10, 24); ctx.lineTo(px, 40); ctx.fill();
    }
    // clean sheen
    if (st.clean > 0) {
      const sx = lx + (rx - lx) * ez(st.clean);
      const g = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
      g.addColorStop(0, 'rgba(255,210,0,0)'); g.addColorStop(.5, `rgba(255,236,120,${0.55 * Math.sin(Math.min(1, st.clean) * Math.PI)})`); g.addColorStop(1, 'rgba(255,210,0,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 120, hdr - 10, 240, H - hdr);
    }
    return { endX, lx, rx, yV1, yV2, yA, pos };
  }
  return { cv, draw, W, H };
}
