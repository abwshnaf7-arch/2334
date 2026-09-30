/**
 * Happy Duck AI - CEP Extension Screen Capture Tool
 * Connects to live Premiere Pro CEP via Chrome DevTools Protocol (port 8889).
 * Usage:
 *   node capture_panel.js --lang en --out ../
 *   node capture_panel.js --lang ar --out ../ar
 *   node capture_panel.js --lang all
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function getDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8889/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          if (!list || !list.length) return reject(new Error('No CEP debugger target found on port 8889'));
          resolve(list[0].webSocketDebuggerUrl);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        }
      } catch(e) {}
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalInPage(ws, expr) {
  const res = await sendCDP(ws, 'Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });
  return res.result ? res.result.value : null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function generateRealisticWaveSnapshot() {
  const hopSec = 0.05;
  const totalSec = 16;
  const numBuckets = Math.floor(totalSec / hopSec);
  const db = [];
  const speechMask = [];
  for (let i = 0; i < numBuckets; i++) {
    const t = i * hopSec;
    const isSpeech = (t >= 1.2 && t <= 4.0) || (t >= 5.2 && t <= 9.0) || (t >= 10.5 && t <= 14.8);
    if (isSpeech) {
      const val = -19 + Math.sin(i * 0.35) * 7 + (Math.random() * 3 - 1.5);
      db.push(Math.round(val * 10) / 10);
      speechMask.push(1);
    } else {
      const val = -48 + (Math.random() * 5 - 2.5);
      db.push(Math.round(val * 10) / 10);
      speechMask.push(0);
    }
  }
  return {
    db, speechMask, hopSec, clipOffset: 0, audioDur: totalSec, mainDb: -28, vadOk: true, zoom: 1, viewStart: 0
  };
}

async function captureLang(ws, lang, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`\n=== Starting Captures for Language: [${lang.toUpperCase()}] -> ${outDir} ===`);

  // 1. Switch language in live CEP
  await evalInPage(ws, `(async () => {
    localStorage.setItem('hd_lang', '${lang}');
    if (typeof setLanguage === 'function') {
      await setLanguage('${lang}');
    }
  })()`);
  await sleep(600);

  const waveSnap = generateRealisticWaveSnapshot();
  const isAr = lang === 'ar';

  // ──────────────────────────────────────────────
  // 1. ui_01_smartcut_empty
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_01_smartcut_empty.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="smartcut"]').click();
    if (window.HDWaveform) window.HDWaveform.clear();
    const empty = document.getElementById('hd-wave-empty');
    if (empty) {
      empty.style.display = 'flex';
      const sp = empty.querySelector('span');
      if (sp) sp.textContent = '${isAr ? "حدد كليب من التايم لاين للبدء" : "Select a clip from the timeline to start"}';
    }
    const cta = document.getElementById('hd-wave-analyze');
    if (cta) cta.classList.remove('hidden');
    const cutBtn = document.getElementById('scan-mark-btn');
    if (cutBtn) cutBtn.style.display = 'none';
    const repOptions = document.getElementById('rep-options');
    if (repOptions) repOptions.classList.add('hidden');
    const silOptions = document.getElementById('sil-options');
    if (silOptions) silOptions.classList.add('hidden');
    const progBox = document.getElementById('smartcut-progress-box');
    if (progBox) progBox.classList.add('hidden');
  })()`);
  await sleep(500);
  await takeScreenshot(ws, path.join(outDir, 'ui_01_smartcut_empty.png'));

  // ──────────────────────────────────────────────
  // 2. ui_02_smartcut_waveform
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_02_smartcut_waveform.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="smartcut"]').click();
    const empty = document.getElementById('hd-wave-empty');
    if (empty) empty.style.display = 'none';
    const cta = document.getElementById('hd-wave-analyze');
    if (cta) cta.classList.add('hidden');
    const cutBtn = document.getElementById('scan-mark-btn');
    if (cutBtn) {
      cutBtn.style.display = 'flex';
      cutBtn.classList.remove('hidden');
    }
    if (window.HDWaveform) {
      window.HDWaveform.loadSnapshot(${JSON.stringify(waveSnap)});
      window.HDWaveform.setThreshold(-28);
    }
  })()`);
  await sleep(600);
  await takeScreenshot(ws, path.join(outDir, 'ui_02_smartcut_waveform.png'));

  // ──────────────────────────────────────────────
  // 3. ui_03_smartcut_repetition_mode
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_03_smartcut_repetition_mode.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="smartcut"]').click();
    const cutBtn = document.getElementById('scan-mark-btn');
    if (cutBtn) { cutBtn.style.display = 'flex'; cutBtn.classList.remove('hidden'); }
    const repBtn = document.querySelector('[data-mode="repetition"]');
    if (repBtn) repBtn.click();
    const repOptions = document.getElementById('rep-options');
    if (repOptions) repOptions.classList.remove('hidden');
    const silOptions = document.getElementById('sil-options');
    if (silOptions) silOptions.classList.add('hidden');
  })()`);
  await sleep(500);
  await takeScreenshot(ws, path.join(outDir, 'ui_03_smartcut_repetition_mode.png'));

  // ──────────────────────────────────────────────
  // 4. ui_04_smartcut_silence_mode
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_04_smartcut_silence_mode.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="smartcut"]').click();
    const silBtn = document.querySelector('[data-mode="silence"]');
    if (silBtn) silBtn.click();
    const silOptions = document.getElementById('sil-options');
    if (silOptions) silOptions.classList.remove('hidden');
    const repOptions = document.getElementById('rep-options');
    if (repOptions) repOptions.classList.add('hidden');
  })()`);
  await sleep(500);
  await takeScreenshot(ws, path.join(outDir, 'ui_04_smartcut_silence_mode.png'));

  // ──────────────────────────────────────────────
  // 5. ui_05_smartcut_progress
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_05_smartcut_progress.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="smartcut"]').click();
    const cutBtn = document.getElementById('scan-mark-btn');
    if (cutBtn) cutBtn.style.display = 'none';
    const repOptions = document.getElementById('rep-options');
    if (repOptions) repOptions.classList.add('hidden');
    const silOptions = document.getElementById('sil-options');
    if (silOptions) silOptions.classList.add('hidden');
    const progBox = document.getElementById('smartcut-progress-box');
    if (progBox) {
      progBox.classList.remove('hidden');
      progBox.style.display = 'block';
      const pct = progBox.querySelector('.sc-prog-pct');
      if (pct) pct.textContent = '58%';
      const fill = progBox.querySelector('.sc-prog-fill');
      if (fill) fill.style.width = '58%';
      const stage = progBox.querySelector('.sc-prog-stage');
      if (stage) stage.textContent = '${isAr ? "تحليل الذكاء الاصطناعي وجاري قص السكتات..." : "AI Speech Analysis & Silence Cutting..."}';
      const detail = progBox.querySelector('.sc-prog-detail');
      if (detail) detail.textContent = '${isAr ? "تم رصد 14 سكتة و3 تكرارات" : "Detected 14 silences & 3 repeated takes"}';
    }
  })()`);
  await sleep(500);
  await takeScreenshot(ws, path.join(outDir, 'ui_05_smartcut_progress.png'));

  // Clean up smartcut progress
  await evalInPage(ws, `(() => {
    const progBox = document.getElementById('smartcut-progress-box');
    if (progBox) progBox.classList.add('hidden');
  })()`);

  // ──────────────────────────────────────────────
  // 6. ui_06_caption_templates
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_06_caption_templates.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="captions"]').click();
    const gallery = document.getElementById('caption-templates-gallery');
    if (gallery) gallery.classList.remove('hidden');
    const prog = document.getElementById('captions-progress-box');
    if (prog) prog.classList.add('hidden');
    const editBtn = document.getElementById('edit-captions-btn');
    if (editBtn) editBtn.classList.add('hidden');
  })()`);
  await sleep(600);
  await takeScreenshot(ws, path.join(outDir, 'ui_06_caption_templates.png'));

  // ──────────────────────────────────────────────
  // 7. ui_07_caption_generating
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_07_caption_generating.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="captions"]').click();
    const prog = document.getElementById('captions-progress-box');
    if (prog) {
      prog.classList.remove('hidden');
      prog.style.display = 'block';
      const pct = prog.querySelector('.cap-prog-pct');
      if (pct) pct.textContent = '74%';
      const fill = prog.querySelector('.cap-prog-fill');
      if (fill) fill.style.width = '74%';
      const txt = prog.querySelector('.cap-prog-text');
      if (txt) txt.textContent = '${isAr ? "تفريغ سحابي بالذكاء الاصطناعي وجاري توليد الكابشن..." : "Cloud AI Transcription & Generating Captions..."}';
    }
  })()`);
  await sleep(500);
  await takeScreenshot(ws, path.join(outDir, 'ui_07_caption_generating.png'));

  // ──────────────────────────────────────────────
  // 8. ui_08_caption_done_edit_button
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_08_caption_done_edit_button.png...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="captions"]').click();
    const prog = document.getElementById('captions-progress-box');
    if (prog) prog.classList.add('hidden');
    const editBtn = document.getElementById('edit-captions-btn');
    if (editBtn) {
      editBtn.classList.remove('hidden');
      editBtn.style.display = 'flex';
    }
    const createBtn = document.getElementById('create-captions-btn');
    if (createBtn) createBtn.classList.remove('hidden');
  })()`);
  await sleep(500);
  await takeScreenshot(ws, path.join(outDir, 'ui_08_caption_done_edit_button.png'));

  // ──────────────────────────────────────────────
  // 9. ui_09_caption_editor (FIXED WITH .active OVERLAY)
  // ──────────────────────────────────────────────
  console.log('Capturing: ui_09_caption_editor.png (Fixed Visible Modal)...');
  await evalInPage(ws, `(() => {
    const modal = document.getElementById('cap-edit-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('active');
      modal.style.display = 'flex';
      modal.style.opacity = '1';

      const title = document.getElementById('cap-edit-title');
      if (title) title.textContent = '${isAr ? "تعديل كابشن التايم لاين — فيديو الإعلان" : "Edit Timeline Captions — Video Reel"}';

      const refreshBtn = document.getElementById('cap-edit-refresh-btn');
      if (refreshBtn) refreshBtn.textContent = '${isAr ? "🔄 سحب الكابشن" : "🔄 Pull Captions"}';

      const listEl = document.getElementById('cap-edit-list');
      if (listEl) {
        listEl.innerHTML = \`
          <div class="cap-review-item active" style="display:flex;align-items:center;gap:10px;padding:10px;background:#1a1d24;border-radius:8px;margin-bottom:8px;border:1px solid #ffd400;">
            <span class="cap-review-time" style="font-size:12px;color:#ffd400;font-family:monospace;min-width:70px;">00:00.19</span>
            <input class="cap-review-input" type="text" value="${isAr ? "لسه بتقص السكتات وبتكتب الكابشن؟" : "Still cutting silences and typing captions?"}" style="flex:1;background:#0d0f14;border:1px solid #333a4d;color:#fff;padding:8px;border-radius:6px;font-size:13px;font-family:'Cairo','Inter';" />
            <button class="cap-review-del" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:15px;padding:0 6px;">✕</button>
          </div>
          <div class="cap-review-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:#161922;border-radius:8px;margin-bottom:8px;border:1px solid #2d3343;">
            <span class="cap-review-time" style="font-size:12px;color:#94a3b8;font-family:monospace;min-width:70px;">00:03.09</span>
            <input class="cap-review-input" type="text" value="${isAr ? "الكلام ده مبقاش ينفع في 2026." : "That workflow belongs in the past in 2026."}" style="flex:1;background:#0d0f14;border:1px solid #333a4d;color:#fff;padding:8px;border-radius:6px;font-size:13px;font-family:'Cairo','Inter';" />
            <button class="cap-review-del" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:15px;padding:0 6px;">✕</button>
          </div>
          <div class="cap-review-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:#161922;border-radius:8px;margin-bottom:8px;border:1px solid #2d3343;">
            <span class="cap-review-time" style="font-size:12px;color:#94a3b8;font-family:monospace;min-width:70px;">00:06.96</span>
            <input class="cap-review-input" type="text" value="${isAr ? "Happy Duck AI إضافة بتعمل الشغل المتعب ده بدالك." : "Happy Duck AI does the hard work for you."}" style="flex:1;background:#0d0f14;border:1px solid #333a4d;color:#fff;padding:8px;border-radius:6px;font-size:13px;font-family:'Cairo','Inter';" />
            <button class="cap-review-del" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:15px;padding:0 6px;">✕</button>
          </div>
          <div class="cap-review-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:#161922;border-radius:8px;margin-bottom:8px;border:1px solid #2d3343;">
            <span class="cap-review-time" style="font-size:12px;color:#94a3b8;font-family:monospace;min-width:70px;">00:11.36</span>
            <input class="cap-review-input" type="text" value="${isAr ? "قص ذكي على حدود الكلمات الحقيقية." : "Smart cuts on real word boundaries."}" style="flex:1;background:#0d0f14;border:1px solid #333a4d;color:#fff;padding:8px;border-radius:6px;font-size:13px;font-family:'Cairo','Inter';" />
            <button class="cap-review-del" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:15px;padding:0 6px;">✕</button>
          </div>
        \`;
      }
      const applyBtn = document.getElementById('cap-edit-apply');
      if (applyBtn) applyBtn.textContent = '${isAr ? "تطبيق التعديلات" : "Apply Changes"}';
      const cancelBtn = document.getElementById('cap-edit-cancel');
      if (cancelBtn) cancelBtn.textContent = '${isAr ? "إلغاء" : "Cancel"}';
    }
  })()`);
  await sleep(700);
  await takeScreenshot(ws, path.join(outDir, 'ui_09_caption_editor.png'));

  // Close modal
  await evalInPage(ws, `(() => {
    const modal = document.getElementById('cap-edit-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  })()`);
  await sleep(300);
}

async function takeScreenshot(ws, outPath) {
  const shot = await sendCDP(ws, 'Page.captureScreenshot', {
    format: 'png',
    fromSurface: true
  });
  const buf = Buffer.from(shot.data, 'base64');
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const args = process.argv.slice(2);
  const langArg = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'all';

  const wsUrl = await getDebuggerUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  // Set device override: 520x750 @ 2x (1040x1500 spacious high-res)
  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: 520,
    height: 750,
    deviceScaleFactor: 2,
    mobile: false
  });

  const baseDir = path.resolve(__dirname, '..');

  if (langArg === 'en' || langArg === 'all') {
    await captureLang(ws, 'en', baseDir);
  }
  if (langArg === 'ar' || langArg === 'all') {
    await captureLang(ws, 'ar', path.join(baseDir, 'ar'));
  }

  // Restore English default
  await evalInPage(ws, `(async () => {
    localStorage.setItem('hd_lang', 'en');
    if (typeof setLanguage === 'function') await setLanguage('en');
  })()`);

  ws.close();
  console.log('\n[SUCCESS] All panel captures completed!');
}

main().catch(err => {
  console.error('CAPTURE ERROR:', err);
  process.exit(1);
});
