// Shared helpers for shots.js and render.js
const fs = require('fs');
const path = require('path');
const os = require('os');

// Everything installed by the setup skill lives here (node module, TTS venv, voices).
const UTH_HOME = process.env.UTH_HOME
  || path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'under-the-hood');

function requirePlaywright() {
  const local = path.join(UTH_HOME, 'node', 'node_modules', 'playwright-core');
  try { return require(local); } catch (e) { /* fall through */ }
  try { return require('playwright-core'); } catch (e) {
    throw new Error(`playwright-core not found in ${local}. Run the under-the-hood-setup skill.`);
  }
}

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), 'Library/Caches/ms-playwright'),
    path.join(os.homedir(), '.cache/ms-playwright'),
  ].filter(Boolean);
  for (const cache of caches) {
    if (!fs.existsSync(cache)) continue;
    const dirs = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
    for (const d of dirs) {
      for (const arch of ['chrome-mac-arm64', 'chrome-mac-x64', 'chrome-mac', 'chrome-linux64', 'chrome-linux']) {
        const cands = [
          path.join(cache, d, arch, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
          path.join(cache, d, arch, 'Chromium.app/Contents/MacOS/Chromium'),
          path.join(cache, d, arch, 'chrome'),
        ];
        for (const c of cands) if (fs.existsSync(c)) return c;
      }
    }
  }
  const system = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  for (const c of system) if (fs.existsSync(c)) return c;
  throw new Error('No Chrome found. Set CHROME_PATH or run the under-the-hood-setup skill.');
}

async function openPage(project) {
  const { chromium } = requirePlaywright();
  const browser = await chromium.launch({ executablePath: findChrome(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // Generic "Failed to load resource" console lines carry no URL, so report failed requests instead.
  // timeline.js is optional: it only exists once narration has been generated.
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('requestfailed', r => { if (!/\/timeline\.js$/.test(r.url())) errors.push(`failed to load ${r.url()}`); });
  await page.goto('file://' + path.join(path.resolve(project), 'index.html') + '?record');
  await page.waitForFunction(() => typeof window.__step === 'function', null, { timeout: 15000 })
    .catch(() => { throw new Error('page did not boot: ' + errors.join(' | ')); });
  return { browser, page, errors };
}

// `node lib.js chrome` prints the Chrome path, used by doctor.sh and install.sh.
if (require.main === module && process.argv[2] === 'chrome') {
  try { console.log(findChrome()); } catch (e) { console.error(e.message); process.exit(1); }
}

module.exports = { UTH_HOME, findChrome, openPage, requirePlaywright };
