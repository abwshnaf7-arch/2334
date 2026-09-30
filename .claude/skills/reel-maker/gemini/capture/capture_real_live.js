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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Generate realistic speech waveform snapshot
function generateRealisticWaveSnapshot() {
  const hopSec = 0.05;
  const totalSec = 16;
  const numBuckets = Math.floor(totalSec / hopSec);
  const db = [];
  const speechMask = [];

  for (let i = 0; i < numBuckets; i++) {
    const t = i * hopSec;
    // Speech bursts around 1.2-4.0s, 5.2-9.0s, 10.5-14.8s
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
    db,
    speechMask,
    hopSec,
    clipOffset: 0,
    audioDur: totalSec,
    mainDb: -28,
    vadOk: true,
    zoom: 1,
    viewStart: 0
  };
}

async function captureState(ws, filename) {
  const shot = await sendCDP(ws, 'Page.captureScreenshot', {
    format: 'png',
    fromSurface: true
  });
  const buf = Buffer.from(shot.data, 'base64');
  const outFile = path.join(__dirname, filename);
  fs.writeFileSync(outFile, buf);
  console.log(`[SPACIOUS CAPTURE] Saved ${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log('Connecting to live Adobe Premiere Pro CEP extension...');
  const wsUrl = await getDebuggerUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  // Set device override to SPACIOUS dimensions: 520 x 750 @ 2x (output 1040 x 1500)
  const PANEL_WIDTH = 520;
  const PANEL_HEIGHT = 750;
  await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    deviceScaleFactor: 2,
    mobile: false
  });

  // Ensure English language is active
  await evalInPage(ws, `(async () => {
    if (typeof setLanguage === 'function') {
      await setLanguage('en');
    }
    localStorage.setItem('hd_lang', 'en');
  })()`);
  await sleep(600);

  const waveSnap = generateRealisticWaveSnapshot();

  // ──────────────────────────────────────────────
  // 1. ui_01_smartcut_empty.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 1: SmartCut Empty (Spacious English)...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="smartcut"]').click();
    if (window.HDWaveform) window.HDWaveform.clear();
    const empty = document.getElementById('hd-wave-empty');
    if (empty) {
      empty.style.display = 'flex';
      const sp = empty.querySelector('span');
      if (sp) sp.textContent = 'Select a clip from the timeline to start';
    }
    const cta = document.getElementById('hd-wave-analyze');
    if (cta) cta.classList.remove('hidden');
    const cutBtn = document.getElementById('scan-mark-btn');
    if (cutBtn) {
      const txt = cutBtn.querySelector('.btn-text');
      if (txt) txt.textContent = 'Cut & Clean';
    }
  })()`);
  await sleep(600);
  await captureState(ws, 'ui_01_smartcut_empty.png');

  // ──────────────────────────────────────────────
  // 2. ui_02_smartcut_waveform.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 2: SmartCut Waveform (Spacious)...');
  await evalInPage(ws, `((snap) => {
    document.querySelector('[data-tab="smartcut"]').click();
    if (window.HDWaveform) {
      window.HDWaveform.restore(snap);
    }
    const cta = document.getElementById('hd-wave-analyze');
    if (cta) cta.classList.add('hidden');
  })(${JSON.stringify(waveSnap)})`);
  await sleep(600);
  await captureState(ws, 'ui_02_smartcut_waveform.png');

  // ──────────────────────────────────────────────
  // 3. ui_03_smartcut_repetition_mode.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 3: SmartCut Repetition Mode...');
  await evalInPage(ws, `((snap) => {
    document.querySelector('[data-tab="smartcut"]').click();
    if (window.HDWaveform) window.HDWaveform.restore(snap);
    const bRep = document.getElementById('mode-btn-repetition');
    const bSil = document.getElementById('mode-btn-silence');
    if (bRep) bRep.classList.add('active');
    if (bSil) bSil.classList.remove('active');
    localStorage.setItem('hd_cutting_mode', 'repetition');
  })(${JSON.stringify(waveSnap)})`);
  await sleep(500);
  await captureState(ws, 'ui_03_smartcut_repetition_mode.png');

  // ──────────────────────────────────────────────
  // 4. ui_04_smartcut_silence_mode.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 4: SmartCut Silence Mode with Sliders...');
  await evalInPage(ws, `((snap) => {
    document.querySelector('[data-tab="smartcut"]').click();
    if (window.HDWaveform) window.HDWaveform.restore(snap);
    const bRep = document.getElementById('mode-btn-repetition');
    const bSil = document.getElementById('mode-btn-silence');
    if (bSil) bSil.classList.add('active');
    if (bRep) bRep.classList.remove('active');
    localStorage.setItem('hd_cutting_mode', 'silence');
  })(${JSON.stringify(waveSnap)})`);
  await sleep(500);
  await captureState(ws, 'ui_04_smartcut_silence_mode.png');

  // ──────────────────────────────────────────────
  // 5. ui_05_smartcut_progress.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 5: SmartCut In-Canvas Progress...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="smartcut"]').click();
    if (window.HDWaveform) {
      window.HDWaveform.showLoading('Analyzing audio speech patterns...');
    }
  })()`);
  await sleep(600);
  await captureState(ws, 'ui_05_smartcut_progress.png');

  // ──────────────────────────────────────────────
  // 6. ui_06_caption_templates.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 6: Captions Templates Gallery (Spacious)...');
  await evalInPage(ws, `(() => {
    if (window.HDWaveform) window.HDWaveform.hideLoading();
    const capTab = document.querySelector('[data-tab="captions"]');
    if (capTab) capTab.click();
    const prog = document.getElementById('captions-progress');
    if (prog) prog.classList.add('hidden');
    const modal = document.getElementById('cap-edit-modal');
    if (modal) modal.classList.add('hidden');
  })()`);
  await sleep(800);
  await captureState(ws, 'ui_06_caption_templates.png');

  // ──────────────────────────────────────────────
  // 7. ui_07_caption_generating.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 7: Captions Generating Progress Bar...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="captions"]').click();
    const prog = document.getElementById('captions-progress');
    if (prog) {
      prog.classList.remove('hidden');
      const txt = document.getElementById('captions-progress-text');
      if (txt) txt.textContent = 'Converting speech to text...';
      const pct = document.getElementById('captions-progress-percent');
      if (pct) pct.textContent = '58%';
      const bar = prog.querySelector('.progress-bar-fill');
      if (bar) bar.style.width = '58%';
    }
  })()`);
  await sleep(600);
  await captureState(ws, 'ui_07_caption_generating.png');

  // ──────────────────────────────────────────────
  // 8. ui_08_caption_done_edit_button.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 8: Captions Done with Edit Button...');
  await evalInPage(ws, `(() => {
    document.querySelector('[data-tab="captions"]').click();
    const prog = document.getElementById('captions-progress');
    if (prog) prog.classList.add('hidden');
    const syncBtn = document.getElementById('sync-caption-style-btn');
    if (syncBtn) {
      syncBtn.classList.remove('hidden');
      syncBtn.style.display = 'block';
    }
    if (typeof showToast === 'function') {
      showToast('Captions generated successfully! 🦆', 'success');
    }
  })()`);
  await sleep(600);
  await captureState(ws, 'ui_08_caption_done_edit_button.png');

  // ──────────────────────────────────────────────
  // 9. ui_09_caption_editor.png
  // ──────────────────────────────────────────────
  console.log('Preparing State 9: Real Caption Editor Modal (Spacious English)...');
  await evalInPage(ws, `(() => {
    const modal = document.getElementById('cap-edit-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      const title = document.getElementById('cap-edit-title');
      if (title) title.textContent = 'Timeline Caption Editor';

      const refreshBtn = document.getElementById('cap-edit-refresh-btn');
      if (refreshBtn) refreshBtn.textContent = '🔄 Pull Captions';

      const listEl = document.getElementById('cap-edit-list');
      if (listEl) {
        listEl.innerHTML = \`
          <div class="cap-review-item active" style="display:flex;align-items:center;gap:10px;padding:10px;background:#1a1d24;border-radius:8px;margin-bottom:8px;border:1px solid #ffd400;">
            <span class="cap-review-time" style="font-size:12px;color:#ffd400;font-family:monospace;min-width:70px;">00:01.20</span>
            <input class="cap-review-input" type="text" value="Welcome to Happy Duck AI" style="flex:1;background:#0d0f14;border:1px solid #333a4d;color:#fff;padding:8px;border-radius:6px;font-size:13px;font-family:'Inter';" />
            <button class="cap-review-del" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:15px;padding:0 6px;">✕</button>
          </div>
          <div class="cap-review-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:#161922;border-radius:8px;margin-bottom:8px;border:1px solid #2d3343;">
            <span class="cap-review-time" style="font-size:12px;color:#94a3b8;font-family:monospace;min-width:70px;">00:03.45</span>
            <input class="cap-review-input" type="text" value="Fastest intelligent editing assistant for Premiere" style="flex:1;background:#0d0f14;border:1px solid #333a4d;color:#fff;padding:8px;border-radius:6px;font-size:13px;font-family:'Inter';" />
            <button class="cap-review-del" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:15px;padding:0 6px;">✕</button>
          </div>
          <div class="cap-review-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:#161922;border-radius:8px;margin-bottom:8px;border:1px solid #2d3343;">
            <span class="cap-review-time" style="font-size:12px;color:#94a3b8;font-family:monospace;min-width:70px;">00:06.10</span>
            <input class="cap-review-input" type="text" value="Save hours of manual editing in one single click" style="flex:1;background:#0d0f14;border:1px solid #333a4d;color:#fff;padding:8px;border-radius:6px;font-size:13px;font-family:'Inter';" />
            <button class="cap-review-del" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:15px;padding:0 6px;">✕</button>
          </div>
        \`;
      }

      const applyBtn = document.getElementById('cap-edit-apply');
      if (applyBtn) applyBtn.textContent = 'Apply Changes';

      const cancelBtn = document.getElementById('cap-edit-cancel');
      if (cancelBtn) {
        const span = cancelBtn.querySelector('span:last-child');
        if (span) span.textContent = 'Cancel';
      }
    }
  })()`);
  await sleep(700);
  await captureState(ws, 'ui_09_caption_editor.png');

  // Reset editor modal
  await evalInPage(ws, `(() => {
    const modal = document.getElementById('cap-edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  })()`);

  console.log('ALL 9 SPACIOUS REAL SCREENSHOTS CAPTURED!');
  ws.close();
}

main().catch(err => {
  console.error('CAPTURE ERROR:', err);
  process.exit(1);
});
