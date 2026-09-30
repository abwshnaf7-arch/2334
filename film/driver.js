// usage: node driver.js <outdir> <startFrame> <endFrame> [fps] | node driver.js --still t out.png
let chromium; try { ({ chromium } = require('playwright-core')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
(async () => {
  const args = process.argv.slice(2);
  // GPU=1 -> real GPU through ANGLE/D3D11 (Windows) using the installed Chrome; default -> software (SwiftShader)
  const gpu = process.env.GPU === '1';
  const b = await chromium.launch(gpu
    ? { channel: process.env.CHROME_CHANNEL || 'chrome', args: ['--use-angle=' + (process.env.ANGLE || 'd3d11'), '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-web-security'] }
    : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-web-security'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => { console.error('PAGEERR', e.message); process.exit(1); });
  p.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await p.goto('file://' + path.resolve(__dirname, 'index.html'));
  await p.waitForFunction('window.READY===true', null, { timeout: 60000 });
  if (args[0] === '--still') {
    for (let i = 1; i < args.length; i += 2) {
      const t = parseFloat(args[i]); const d = await p.evaluate(t => { render(t); return document.getElementById('cv').toDataURL('image/jpeg', .92); }, t);
      fs.writeFileSync(args[i + 1], Buffer.from(d.split(',')[1], 'base64'));
    }
  } else {
    const [out, a0, bb] = [args[0], +args[1], +args[2]]; const fps = +(args[3] || 30); const stride = +(args[4] || 1), a = a0 + +(args[5] || 0); fs.mkdirSync(out, { recursive: true });
    const t0 = Date.now();
    for (let f = a; f < bb; f += stride) {
      const fn = path.join(out, 'f' + String(f).padStart(5, '0') + '.jpg'); if (fs.existsSync(fn)) continue; // resume
      const d = await p.evaluate(t => { render(t); return document.getElementById('cv').toDataURL('image/jpeg', .93); }, f / fps);
      fs.writeFileSync(path.join(out, 'f' + String(f).padStart(5, '0') + '.jpg'), Buffer.from(d.split(',')[1], 'base64'));
      if (((f - a) / stride) % 25 === 0) console.log(`frame ${f}/${bb} ${((Date.now() - t0) / 1000 / ((f - a) / stride + 1)).toFixed(2)}s/f`);
    }
  }
  await b.close();
})();
