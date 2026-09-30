// Usage: node driver.js --still <t> <out.png> | node driver.js --frames <from> <to> <outdir>   (30 fps)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || 'playwright-core');
const FPS = 30;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
(async () => {
  await new Promise(ok => srv.listen(0, ok));
  const port = srv.address().port;
  const exe = process.env.CHROME || '/opt/pw-browsers/chromium';
  const b = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--font-render-hinting=none'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => console.error('PAGEERR', e.message));
  pg.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await pg.goto(`http://127.0.0.1:${port}/`);
  await pg.evaluate(() => window.ready);
  const a = process.argv;
  if (a[2] === '--still') { const ts = a[3].split(','); for (const t of ts) { await pg.evaluate(t => renderFrame(t), +t); await pg.screenshot({ path: a[4].replace('%t', t), type: 'png' }); } }
  else if (a[2] === '--frames') {
    const [f0, f1, dir] = [+a[3], +a[4], a[5]]; fs.mkdirSync(dir, { recursive: true });
    for (let i = f0; i < f1; i++) { const fn = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`); if (fs.existsSync(fn)) continue;
      await pg.evaluate(t => renderFrame(t), i / FPS); await pg.screenshot({ path: fn, type: 'jpeg', quality: 93 }); }
  }
  await b.close(); srv.close();
})();
