// Render a project to MP4: voice + ducked music + synced SFX, 1080p30, -16 LUFS.
// Usage: node render.js <project> [--out name.mp4] [--audio-only] [--silent] [--music-db -12] [--sfx-db 1]
// Writes audio stems to <project>/audio/, renders video to <name>.partial.mp4, and only renames it
// over the final file after ffprobe confirms the full duration. An interrupted run never
// replaces a good video.
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { openPage } = require('./lib');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const project = path.resolve(argv[0] || '');
const FPS = 30;

(async () => {
  if (!argv[0] || !fs.existsSync(path.join(project, 'index.html'))) throw new Error('usage: node render.js <project-dir>');
  const name = opt('--out', path.basename(project) + '.mp4');
  const OUT = path.join(project, name), PARTIAL = OUT.replace(/\.mp4$/, '.partial.mp4');
  const AUD = path.join(project, 'audio'); fs.mkdirSync(AUD, { recursive: true });
  const VOICE = path.join(AUD, 'voice-stem.wav'), MUSIC = path.join(AUD, 'music-stem.wav'), SFX = path.join(AUD, 'sfx-stem.wav'), MIX = path.join(AUD, 'mix.wav');
  const silent = argv.includes('--silent');

  const { browser, page, errors } = await openPage(project);
  const DUR = await page.evaluate(() => window.__duration);
  const tl = await page.evaluate(() => window.__timeline());
  console.log(`duration ${DUR.toFixed(2)}s, ${tl.length} voice clips`);

  if (!silent) {
    // 1) voice stem: clips at their scene positions (silence if there is no narration yet)
    if (tl.length) {
      const args = ['-v', 'error', '-y'];
      tl.forEach(c => args.push('-i', path.join(project, c.clip)));
      const chains = tl.map((c, i) => `[${i}]aresample=48000,adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`);
      const mix = tl.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${tl.length}:normalize=0,apad,atrim=0:${DUR},pan=stereo|c0=c0|c1=c0[out]`;
      execFileSync('ffmpeg', [...args, '-filter_complex', [...chains, mix].join(';'), '-map', '[out]', '-c:a', 'pcm_s16le', VOICE]);
    } else {
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(DUR), VOICE]);
    }
    // 2) music + sfx rendered by the page, timed from the same timeline as the frames
    const st = await page.evaluate(() => window.__renderAudio());
    fs.writeFileSync(MUSIC, Buffer.from(st.music, 'base64'));
    fs.writeFileSync(SFX, Buffer.from(st.sfx, 'base64'));
    // 3) mix: music ducks under the voice, limiter, loudness for social platforms
    const MV = opt('--music-db', '-12'), FXV = opt('--sfx-db', '1');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', VOICE, '-i', MUSIC, '-i', SFX, '-filter_complex',
      `[0]asplit=2[v][key];[1]volume=${MV}dB[m];[m][key]sidechaincompress=threshold=0.02:ratio=6:attack=40:release=450[md];` +
      `[2]volume=${FXV}dB[fx];[v][md][fx]amix=inputs=3:normalize=0,alimiter=limit=0.9,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]`,
      '-map', '[out]', '-c:a', 'pcm_s16le', MIX]);
    console.log('audio mix:', MIX);
  }
  if (argv.includes('--audio-only')) { await browser.close(); return; }

  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  if (!silent) ffArgs.push('-i', MIX);
  ffArgs.push('-vf', `fade=t=out:st=${(DUR - 0.8).toFixed(2)}:d=0.8:color=0xf5f0e6`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (silent) ffArgs.push('-an'); else ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  ffArgs.push(PARTIAL);
  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(FPS * DUR);
  for (let i = 0; i < total; i++) {
    const data = await page.evaluate(dt => { window.__step(dt); return document.getElementById('c').toDataURL('image/jpeg', 0.94); }, 1 / FPS);
    if (!ff.stdin.write(Buffer.from(data.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  await browser.close();
  if (code !== 0) throw new Error(`ffmpeg exited ${code}, kept ${PARTIAL}`);
  const got = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', PARTIAL]).toString());
  if (Math.abs(got - DUR) > 0.2) throw new Error(`render incomplete: ${got}s of ${DUR.toFixed(2)}s, kept ${PARTIAL}`);
  fs.renameSync(PARTIAL, OUT);
  console.log(`done ${OUT} (${got.toFixed(2)}s)`);
  if (errors.length) console.error('PAGE ERRORS during render:\n' + errors.join('\n'));
})().catch(e => { console.error(e.message || e); process.exit(1); });
