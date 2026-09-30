// node render.js [--workers 3] [--out D:\\frames] [--gpu] [--start 0] [--end 3778]
// Renders frames in parallel (resumable: existing frames are skipped), then muxes with assets/mix.wav into film.mp4
const { spawn, spawnSync } = require('child_process'); const path = require('path'); const fs = require('fs');
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const workers = +opt('workers', 3), out = path.resolve(opt('out', 'frames')), start = +opt('start', 0), end = +opt('end', 3778), gpu = a.includes('--gpu');
const env = Object.assign({}, process.env, gpu ? { GPU: '1' } : {});
fs.mkdirSync(out, { recursive: true });
let done = 0;
for (let k = 0; k < workers; k++) {
  const p = spawn(process.execPath, [path.join(__dirname, 'driver.js'), out, String(start), String(end), '30', String(workers), String(k)], { env, stdio: 'inherit' });
  p.on('exit', code => { if (code) { console.error('worker', k, 'failed', code); process.exit(1); } if (++done === workers) mux(); });
}
function mux() {
  const n = fs.readdirSync(out).filter(f => f.endsWith('.jpg')).length; console.log('frames:', n);
  if (n < end - start) { console.error('missing frames, run again to resume'); process.exit(1); }
  const r = spawnSync('ffmpeg', ['-y', '-framerate', '30', '-i', path.join(out, 'f%05d.jpg'), '-i', path.join(__dirname, 'assets', 'mix.wav'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', path.join(__dirname, 'film.mp4')], { stdio: 'inherit' });
  console.log(r.status === 0 ? 'DONE -> film/film.mp4' : 'ffmpeg failed');
}
