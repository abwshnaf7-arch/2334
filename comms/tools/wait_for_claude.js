#!/usr/bin/env node
// Blocks until Claude pushes a NEW numbered message to comms/to-gemini/, then prints it and exits 0.
// Exit 2 = timeout with nothing new (just run it again). No dependencies; needs git + Node 18+.
// usage: node wait_for_claude.js <path-to-local-clone> [--after N] [--minutes 8] [--every 20]
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const repo = path.resolve(args[0] || '.');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const minutes = +opt('minutes', 8), every = +opt('every', 20);
const BRANCH = 'claude/bold-thompson-v8wyym', DIR = 'comms/to-gemini';
const stateFile = path.join(path.dirname(repo), 'claude-comms.lastseen');
let last = opt('after', null);
if (last === null) last = fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8').trim() : '0';
last = parseInt(last, 10) || 0;
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const end = Date.now() + minutes * 60000;
  while (Date.now() < end) {
    try {
      git('fetch', '--quiet', 'origin', BRANCH);
      const names = git('ls-tree', '--name-only', `origin/${BRANCH}:${DIR}`).split('\n').filter(f => /^\d{3}-.*\.md$/.test(f));
      const fresh = names.filter(f => parseInt(f.slice(0, 3), 10) > last).sort();
      if (fresh.length) {
        git('merge', '--ff-only', `origin/${BRANCH}`);
        for (const f of fresh) { console.log(`===== NEW MESSAGE ${f} =====`); console.log(fs.readFileSync(path.join(repo, DIR, f), 'utf8')); }
        fs.writeFileSync(stateFile, String(Math.max(...fresh.map(f => parseInt(f.slice(0, 3), 10)))));
        console.log('===== END. Do the work, push your reply to sdfbs/happyduck-assets, then run this script again. =====');
        process.exit(0);
      }
    } catch (e) { console.error('poll error:', String(e.message).split('\n')[0]); }
    await sleep(every * 1000);
  }
  console.log('No new message from Claude. Run this script again.');
  process.exit(2);
})();
