// Screenshot frames to check the animation before rendering.
// Usage: node shots.js <project>                 -> middle of every scene
//        node shots.js <project> 3.5 12 40.2     -> specific real-time seconds
// Each run writes to a NEW folder <project>/.shots/<timestamp>/ (nothing is deleted).
const path = require('path');
const fs = require('fs');
const { openPage } = require('./lib');

(async () => {
  const [project, ...rest] = process.argv.slice(2);
  if (!project) throw new Error('usage: node shots.js <project> [seconds...]');
  const { browser, page, errors } = await openPage(project);
  const dur = await page.evaluate(() => window.__duration);
  const scenes = await page.evaluate(() => (window.__scenes ? window.__scenes() : []));
  const times = rest.length ? rest.map(Number).map(t => ({ id: 't', t })) : scenes.map(s => ({ id: s.id, t: s.mid }));
  const dir = path.join(path.resolve(project), '.shots', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  for (const { id, t } of times) {
    await page.evaluate(t => window.__seek(t), t);
    const f = path.join(dir, `${t.toFixed(1).padStart(5, '0')}-${id}.png`);
    await page.locator('#c').screenshot({ path: f, scale: 'css' });
    console.log(f);
  }
  await browser.close();
  console.log(`duration ${dur.toFixed(2)}s, scenes: ${scenes.map(s => `${s.id}@${s.start.toFixed(1)}`).join(' ')}`);
  if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(2); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
