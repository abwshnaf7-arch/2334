// usage: node render.js --still 3.2,10,25 --out stills   |   node render.js --all --workers 4
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const root = __dirname;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--disable-gpu', '--font-render-hinting=none'] });
  const mkPage = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.error('PAGEERR', e.message));
    p.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
    await p.goto(url); await p.evaluate(() => window.init());
    return p;
  };
  const out = arg('out', 'frames'); fs.mkdirSync(path.join(root, out), { recursive: true });
  const fps = 30;
  if (arg('still')) {
    const p = await mkPage();
    for (const t of String(arg('still')).split(',').map(Number)) {
      await p.evaluate(t => window.setT(t), t);
      await p.screenshot({ path: path.join(root, out, `t_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 88 });
    }
  } else {
    const p0 = await mkPage(); const dur = await p0.evaluate(() => window.DUR); await p0.context().close();
    const n = Math.floor(dur * fps), workers = +arg('workers', 4);
    console.log('frames', n);
    let next = 0, done = 0;
    const work = async () => {
      const p = await mkPage();
      for (;;) {
        const i = next++; if (i >= n) break;
        const f = path.join(root, out, String(i).padStart(5, '0') + '.jpg');
        if (!fs.existsSync(f)) {
          await p.evaluate(t => window.setT(t), i / fps);
          await p.screenshot({ path: f, type: 'jpeg', quality: 90 });
        }
        if (++done % 100 === 0) console.log(done + '/' + n);
      }
    };
    await Promise.all(Array.from({ length: workers }, work));
  }
  await browser.close(); server.close();
})();
