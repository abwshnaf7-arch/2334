const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const LA = mkCanvas(), LB = mkCanvas(); const LAc = LA.getContext('2d'), LBc = LB.getContext('2d');
const BLOOM1 = mkCanvas(480, 270), B1c = BLOOM1.getContext('2d'), BLOOM2 = mkCanvas(240, 135), B2c = BLOOM2.getContext('2d'), BLOOM3 = mkCanvas(480, 270), B3c = BLOOM3.getContext('2d');
const GRAIN = mkCanvas(512, 512); { const g = GRAIN.getContext('2d'), id = g.createImageData(512, 512); const r = rng(5); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); }
const VIG = mkCanvas(W, H); { const g = VIG.getContext('2d'); const gr = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
const TOTAL = 125.9;

function render(t) {
  const fx = { shake: 0, bloom: .17, bloomTh: 1, grade: null, fade: 1, flash: 0, ca: 0, vig: 1, letter: 0 };
  compose(t, fx);
  post(t, fx);
}
function post(t, fx) {
  // shake as final transform: snapshot then redraw offset
  if (fx.shake > .01) {
    const ox = (noise1(t * 23) - .5) * 2 * fx.shake, oy = (noise1(t * 29 + 9) - .5) * 2 * fx.shake;
    LBc.setTransform(1, 0, 0, 1, 0, 0); LBc.drawImage(cv, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(LB, ox, oy, W, H);
  }
  // bloom
  B1c.filter = 'none'; B1c.clearRect(0, 0, 480, 270); B1c.drawImage(cv, 0, 0, 480, 270);
  B3c.filter = `brightness(.7) contrast(3) saturate(.7) blur(3px)`; B3c.clearRect(0, 0, 480, 270); B3c.drawImage(BLOOM1, 0, 0);
  B2c.filter = 'blur(6px)'; B2c.clearRect(0, 0, 240, 135); B2c.drawImage(BLOOM3, 0, 0, 240, 135);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fx.bloom; ctx.drawImage(BLOOM2, 0, 0, W, H); ctx.globalAlpha = fx.bloom * .7; ctx.drawImage(BLOOM3, 0, 0, W, H); ctx.restore();
  // chromatic aberration (cheap: offset red/blue copies)
  if (fx.ca > .01) {
    LBc.setTransform(1, 0, 0, 1, 0, 0); LBc.globalCompositeOperation = 'source-over'; LBc.drawImage(cv, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5; ctx.fillStyle = 'rgba(0,255,255,1)';
    ctx.restore();
  }
  // vignette + grain
  ctx.save(); ctx.globalAlpha = fx.vig; ctx.drawImage(VIG, 0, 0); ctx.restore();
  const fr = Math.floor(t * 30);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .13;
  const gx = Math.floor(hash(fr) * 512), gy = Math.floor(hash(fr + 99) * 512);
  ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.translate(-gx, -gy); ctx.fillRect(gx, gy, W, H); ctx.restore();
  if (fx.flash > 0) { ctx.fillStyle = `rgba(255,248,235,${clamp(fx.flash)})`; ctx.fillRect(0, 0, W, H); }
  if (fx.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fx.fade})`; ctx.fillRect(0, 0, W, H); }
}
initGL();
window.READY = true;
