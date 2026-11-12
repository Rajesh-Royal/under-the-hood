// Explainer video engine. Shared by every project, so edit scenes.js instead of this file.
// Load order in index.html: timeline.js (optional, generated), engine.js, scenes.js.
// scenes.js calls defineScenes([...]) first, then boot({...}) at the end.

// ---------- canvas + palette ----------
const W = 1920, H = 1080;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const C = { bg: '#f5f0e6', paper: '#fffdf8', ink: '#1f1d1a', soft: '#6f685d', faint: '#d6cdbd',
            blue: '#2f6fde', orange: '#e0722f', green: '#2a9d6f', red: '#d64545', purple: '#7b5cd6',
            lgreen: 'rgba(42,157,111,.16)', lblue: 'rgba(47,111,222,.12)', lorange: 'rgba(224,114,47,.16)' };
const SANS = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MONO = '"SF Mono", Menlo, Monaco, monospace';
const font = (sz, w = 400, mono = false) => { ctx.font = `${w} ${sz}px ${mono ? MONO : SANS}`; };

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const backOut = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const prog = (t, a, b) => clamp((t - a) / (b - a));          // 0..1 progress of t between a and b
const bump = (t, c, w) => Math.max(0, 1 - Math.abs(t - c) / w); // triangle pulse around c
const fadeIO = p => clamp(p * 8) * clamp((1 - p) * 8);          // fade in and out over a 0..1 trip

// ---------- drawing primitives ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function strokeReveal(x, y, w, h, r, p) {             // outline that draws itself on as p goes 0..1
  if (p <= 0) return;
  const L = 2 * (w + h);
  if (p < 1) ctx.setLineDash([L * p, L]);
  rr(x, y, w, h, r); ctx.stroke(); ctx.setLineDash([]);
}
function lineP(x1, y1, x2, y2, p) {                    // line that grows from (x1,y1)
  if (p <= 0) return;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, p), lerp(y1, y2, p)); ctx.stroke();
}
function text(s, x, y, sz, { w = 400, col = C.ink, align = 'center', mono = false } = {}) {
  font(sz, w, mono); ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
}
function box(x, y, w, h, p, { title = '', sub = '', fill = C.paper, stroke = C.ink, lw = 3, r = 14, hl = 0, mono = false } = {}) {
  // labelled box that draws on with p, hl 0..1 tints it blue (use bump() for a hit flash)
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(p * 2);
  ctx.fillStyle = fill; rr(x, y, w, h, r); ctx.fill();
  if (hl > 0) { ctx.fillStyle = `rgba(47,111,222,${.14 * hl})`; rr(x, y, w, h, r); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = hl > 0 ? C.blue : stroke; ctx.lineWidth = lw + hl * 2; strokeReveal(x, y, w, h, r, ease(p));
  const q = clamp(p * 2 - 1); if (q <= 0) return;
  ctx.save(); ctx.globalAlpha *= q;
  if (title) text(title, x + w / 2, y + h / 2 - (sub ? 14 : 0), Math.min(26, h * .32), { w: 700, mono });
  if (sub) text(sub, x + w / 2, y + h / 2 + 18, 16, { col: C.soft });
  ctx.restore();
}
function pill(x, y, label, col, o = {}) {
  // a moving "packet". o: { size, sub, mono, alpha, scale, icon(x,y,r,rot) }
  const sz = o.size || 22, a = o.alpha ?? 1, sc = o.scale ?? 1;
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(sc, sc);
  font(sz, 700, o.mono); const tw = ctx.measureText(label).width;
  let sw = 0; if (o.sub) { font(sz * .7, 500, o.mono); sw = ctx.measureText(o.sub).width; }
  const iw = o.icon ? sz * 1.35 : 0;
  const pw = Math.max(tw, sw) + iw + sz * 1.4, ph = o.sub ? sz * 2.6 : sz * 1.8, r = Math.min(ph / 2, 22);
  ctx.fillStyle = 'rgba(31,29,26,.14)'; rr(-pw / 2 + 3, -ph / 2 + 6, pw, ph, r); ctx.fill();
  ctx.fillStyle = col; rr(-pw / 2, -ph / 2, pw, ph, r); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
  const tx = -pw / 2 + sz * .7 + iw;
  if (o.icon) o.icon(-pw / 2 + sz * .7 + sz * .5, 0, sz * .55, 0.4);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  font(sz, 700, o.mono); ctx.fillText(label, tx, o.sub ? -sz * .48 : 1);
  if (o.sub) { font(sz * .7, 500, o.mono); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(o.sub, tx, sz * .62); }
  ctx.restore();
}
function travel(p, x1, y1, x2, y2, label, col, o = {}) {
  // pill flying from A to B while p goes 0..1, arc lifts the path into a curve
  if (p <= 0 || p >= 1) return;
  const e = ease(p), arc = o.arc || 0;
  pill(lerp(x1, x2, e), lerp(y1, y2, e) - Math.sin(e * Math.PI) * arc, label, col, { alpha: fadeIO(p), ...o });
}
function dot(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); }
function arrow(x1, y1, x2, y2, p = 1, col = C.soft, lw = 3) {
  if (p <= 0) return;
  const x = lerp(x1, x2, p), y = lerp(y1, y2, p), a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y);
  ctx.moveTo(x, y); ctx.lineTo(x - 14 * Math.cos(a - .5), y - 14 * Math.sin(a - .5));
  ctx.moveTo(x, y); ctx.lineTo(x - 14 * Math.cos(a + .5), y - 14 * Math.sin(a + .5)); ctx.stroke();
}
function magnifier(x, y, s, col = C.soft) {
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, s * .16);
  ctx.beginPath(); ctx.arc(x - s * .12, y - s * .12, s * .42, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + s * .18, y + s * .18); ctx.lineTo(x + s * .5, y + s * .5); ctx.stroke();
}
function lock(x, y, s, closed, col) {                  // padlock, closed 0..1 drops the shackle
  ctx.save(); ctx.translate(x, y);
  const lift = (1 - closed) * s * .28;
  ctx.strokeStyle = C.ink; ctx.lineWidth = s * .1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-s * .26, -s * .05 - lift); ctx.lineTo(-s * .26, -s * .3 - lift);
  ctx.arc(0, -s * .3 - lift, s * .26, Math.PI, 0); ctx.lineTo(s * .26, -s * .05 - lift * (closed < 1 ? 1.6 : 1)); ctx.stroke();
  ctx.fillStyle = col; rr(-s * .4, -s * .08, s * .8, s * .62, s * .12); ctx.fill(); ctx.lineWidth = s * .08; ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, s * .16, s * .07, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-s * .03, s * .18, s * .06, s * .16);
  ctx.restore();
}
function rack(x, y, w, h, { reveal = 1, lit = 0, units = 4, lw = 3 } = {}) {   // server rack, lit 0..1 turns LEDs green
  if (reveal <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(reveal * 1.5);
  ctx.fillStyle = C.paper; rr(x, y, w, h, 8); ctx.fill();
  if (lit > 0) { ctx.fillStyle = `rgba(42,157,111,${.18 * lit})`; rr(x, y, w, h, 8); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = C.ink; ctx.lineWidth = lw; strokeReveal(x, y, w, h, 8, ease(reveal));
  const q = clamp(reveal * 2 - 1); if (q <= 0) return;
  ctx.save(); ctx.globalAlpha *= q;
  const pad = w * .1, uh = (h - pad * 2) / units;
  for (let i = 0; i < units; i++) {
    const uy = y + pad + i * uh;
    ctx.strokeStyle = C.ink; ctx.lineWidth = lw * .55; rr(x + pad, uy + uh * .12, w - pad * 2, uh * .76, 4); ctx.stroke();
    ctx.strokeStyle = C.faint; ctx.lineWidth = lw * .5;
    for (let v = 0; v < 3; v++) { const vx = x + pad * 1.9 + v * w * .07; ctx.beginPath(); ctx.moveTo(vx, uy + uh * .3); ctx.lineTo(vx, uy + uh * .7); ctx.stroke(); }
    const on = lit > 0 && ((i * 7 + Math.floor(lit * 9)) % 3 !== 0 || lit >= 1);
    ctx.fillStyle = on ? C.green : C.faint;
    ctx.beginPath(); ctx.arc(x + w - pad * 2.2, uy + uh * .5, Math.max(2.5, w * .035), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function browserWindow(x, y, w, h, p, url = '') {      // line-art browser frame, returns content top y
  if (p <= 0) return y + 52;
  ctx.save();
  ctx.globalAlpha = clamp(p * 2 - .4);
  ctx.fillStyle = 'rgba(31,29,26,.10)'; rr(x + 6, y + 10, w, h, 18); ctx.fill();
  ctx.fillStyle = C.paper; rr(x, y, w, h, 18); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; strokeReveal(x, y, w, h, 18, ease(p));
  const q = clamp(p * 1.8 - .8);
  if (q > 0) {
    ctx.globalAlpha = q;
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y + 52); ctx.lineTo(x + w, y + 52); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 30 + i * 24, y + 26, 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = C.bg; rr(x + 120, y + 12, w - 160, 28, 14); ctx.fill(); ctx.strokeStyle = C.faint; ctx.lineWidth = 2; ctx.stroke();
    text(url, x + 142, y + 26, 16, { col: C.soft, align: 'left', mono: true });
  }
  ctx.restore();
  return y + 52;
}
function codeBlock(x, y, lines, p, { size = 24, lineH = 38, hl = -1, w = 0 } = {}) {
  // code panel that types itself in. lines: array of strings. hl: index of highlighted line
  const n = lines.length, chars = lines.reduce((s, l) => s + l.length, 0);
  const width = w || Math.max(...lines.map(l => l.length)) * size * .62 + 60, height = n * lineH + 40;
  ctx.fillStyle = '#23211d'; rr(x, y, width, height, 14); ctx.fill();
  let budget = Math.floor(chars * clamp(p));
  lines.forEach((l, i) => {
    const ly = y + 20 + lineH * (i + .5);
    if (i === hl) { ctx.fillStyle = 'rgba(47,111,222,.35)'; ctx.fillRect(x + 8, ly - lineH / 2, width - 16, lineH); }
    const show = l.slice(0, Math.max(0, budget)); budget -= l.length;
    text(show, x + 30, ly, size, { col: '#f5f0e6', align: 'left', mono: true });
  });
  return { w: width, h: height };
}

// ---------- timeline ----------
// Design durations live in scenes.js. timeline.js (from narration) stretches each scene so the
// animation fits its voice clip, and warp() maps real time back to design time.
let SCENES = [], S = {}, DUR = 0, DESIGN_DUR = 0;
const TL = window.TIMELINE || null;
function defineScenes(list) {
  SCENES = list; S = {}; let acc = 0, racc = 0;
  for (const s of SCENES) { s.start = acc; S[s.id] = acc; acc += s.dur; }
  for (const s of SCENES) {
    const v = TL && TL.scenes[s.id];
    s.rdur = v ? Math.max(s.dur, v.dur) : s.dur;
    s.lead = v ? v.lead : 0;
    s.rstart = racc; racc += s.rdur;
  }
  DESIGN_DUR = acc; DUR = racc;
}
function warp(t) {
  for (let i = SCENES.length - 1; i >= 0; i--) { const s = SCENES[i]; if (t >= s.rstart) return s.start + Math.min(s.dur, (t - s.rstart) * s.dur / s.rdur); }
  return 0;
}
function unwarp(td) {
  for (let i = SCENES.length - 1; i >= 0; i--) { const s = SCENES[i]; if (td >= s.start) return s.rstart + Math.min(s.rdur, (td - s.start) * s.rdur / s.dur); }
  return 0;
}
function sceneAt(t) { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return SCENES[i]; return SCENES[0]; }
function sceneAtReal(t) { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].rstart) return SCENES[i]; return SCENES[0]; }

// ---------- overlays ----------
let CFG = {};
function drawGrid(cam) {
  ctx.fillStyle = 'rgba(31,29,26,.09)';
  const sp = 48, x0 = Math.floor((cam.x - 300) / sp) * sp;
  for (let x = x0; x < cam.x + W + 300; x += sp) for (let y = -120; y < H + 120; y += sp) ctx.fillRect(x - 1.5, y + 22, 3, 3);
}
function drawTitle(t) {
  const T0 = CFG.title; if (!T0 || !SCENES[1]) return;
  const next = SCENES[1].start;
  const out = 1 - prog(t, next - .1, next + .4); if (out <= 0) return;
  ctx.save(); ctx.globalAlpha = out;
  const z = 1 + .04 * ease(prog(t, 0, next));          // slow push-in, frame 0 is already a full title card (good thumbnail)
  ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-960, -540);
  if (T0.icon) T0.icon(960, 330 + Math.sin(t * 2.6) * 6, 78 * (1 + .07 * bump(t, .12, .2)), -.3 + t * .35);
  text(T0.kicker || '', 960, 500, 54, { w: 500, col: C.soft });
  font(92, 800);
  const full = T0.parts.map(p => p[0]).join('');
  let x = 960 - ctx.measureText(full).width / 2, hx = 0, hw = 0, hc = C.orange;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const [str, col, underline] of T0.parts) {
    const w = ctx.measureText(str).width;
    if (underline) { hx = x; hw = w; hc = col || C.orange; }
    ctx.fillStyle = col || C.ink; ctx.fillText(str, x, 610); x += w;
  }
  const u = ease(prog(t, .25, 1.2));
  if (hw && u > 0) { ctx.strokeStyle = hc; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx + 18, 668); ctx.lineTo(hx + 18 + (hw - 36) * u, 668); ctx.stroke(); }
  ctx.restore();
}
function drawTracker(t) {
  const steps = CFG.steps || []; if (!steps.length || !SCENES[1]) return;
  const endS = S.end ?? DESIGN_DUR;
  const a = prog(t, SCENES[1].start + .2, SCENES[1].start + .7) * (1 - prog(t, endS, endS + .4)); if (a <= 0) return;
  const sc = sceneAt(t), cur = sc.n || 0, y = 74, gap = Math.min(150, 1300 / steps.length), x0 = 960 - gap * (steps.length - 1) / 2;
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = C.faint; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + gap * (steps.length - 1), y); ctx.stroke();
  steps.forEach((s, i) => {
    const x = x0 + i * gap, n = i + 1;
    if (n < cur) { dot(x, y, 12, C.ink); }
    else if (n === cur) {
      const k = prog(t, sc.start, sc.start + .4);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.globalAlpha = a * (1 - k); ctx.beginPath(); ctx.arc(x, y, 14 + 18 * k, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = a;
      dot(x, y, 15, C.blue);
    } else { ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = C.faint; ctx.lineWidth = 3; ctx.stroke(); }
    text(s, x, y + 36, 18, { w: n === cur ? 700 : 500, col: n === cur ? C.ink : C.soft });
  });
  ctx.restore();
}
function drawCaption(tReal) {
  const sc = sceneAtReal(tReal); if (!sc.cap) return;
  const l = tReal - sc.rstart;
  const a = easeOut(prog(l, 0, .35)) * (1 - prog(l, sc.rdur - .3, sc.rdur)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 14);
  font(50, 750); const tw = ctx.measureText(sc.cap).width;
  const badge = sc.n ? 86 : 0, total = badge + tw, x0 = 960 - total / 2, y = 930;
  ctx.fillStyle = 'rgba(245,240,230,.88)'; rr(x0 - 30, y - 50, total + 60, sc.sub ? 150 : 100, 24); ctx.fill();
  if (sc.n) { dot(x0 + 32, y, 30, C.blue); text(String(sc.n), x0 + 32, y + 1, 30, { w: 800, col: '#fff' }); }
  text(sc.cap, x0 + badge, y + 2, 50, { w: 750, align: 'left' });
  if (sc.sub) text(sc.sub, 960, y + 64, 26, { col: C.soft });
  ctx.restore();
}
function drawEnd(t) {
  const E0 = CFG.end; if (!E0 || S.end === undefined) return;
  const p = prog(t, S.end, S.end + .6); if (p <= 0) return;
  ctx.fillStyle = `rgba(245,240,230,${p})`; ctx.fillRect(0, 0, W, H);
  if (E0.icon) E0.icon(960, 320, 70 * backOut(prog(t, S.end + .2, S.end + .8)), t * .35);
  const a = easeOut(prog(t, S.end + .4, S.end + .9));
  ctx.save(); ctx.globalAlpha = a; text(E0.headline, 960, 490 + (1 - a) * 16, 70, { w: 800 }); ctx.restore();
  const chips = E0.chips || CFG.steps || [];
  font(22, 600);
  const widths = chips.map(s => ctx.measureText(s).width + 40), gap = 46;
  let x = 960 - (widths.reduce((s, w) => s + w, 0) + gap * (chips.length - 1)) / 2;
  chips.forEach((s, i) => {
    const ca = easeOut(prog(t, S.end + .9 + i * .1, S.end + 1.2 + i * .1));
    ctx.save(); ctx.globalAlpha = ca;
    ctx.fillStyle = C.paper; rr(x, 610 + (1 - ca) * 12, widths[i], 48, 24); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
    text(s, x + widths[i] / 2, 635 + (1 - ca) * 12, 22, { w: 600 });
    if (i < chips.length - 1) text('→', x + widths[i] + gap / 2, 635, 24, { col: C.soft });
    ctx.restore();
    x += widths[i] + gap;
  });
  const fa = easeOut(prog(t, S.end + 1.8, S.end + 2.3));
  if (E0.cta && fa > 0) { ctx.save(); ctx.globalAlpha = fa; text(E0.cta, 960, 770 + (1 - fa) * 10, 28, { w: 500, col: C.soft }); ctx.restore(); }
}

// ---------- frame ----------
function render(tReal) {
  tReal = clamp(tReal, 0, DUR);
  const t = warp(tReal);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const cam = CFG.camera ? CFG.camera(t) : { x: 0, z: 1 };
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-W / 2 - cam.x, -H / 2 - (cam.y || 0));
  drawGrid(cam);
  CFG.drawWorld(t);
  ctx.restore();
  drawTitle(t);
  drawTracker(t);
  drawCaption(tReal);
  if (CFG.drawOverlay) CFG.drawOverlay(t, tReal);
  drawEnd(t);
}

// ---------- sound (offline, timed through the same timeline as the visuals) ----------
// Note: Chrome's offline audio is not bit-identical run to run (tiny phase differences). Timing is exact.
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [72, 74, 76, 79, 81, 84];
function rng(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function noiseBuffer(ac, secs, seed) {
  const r = rng(seed), b = ac.createBuffer(1, Math.floor(ac.sampleRate * secs), ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  return b;
}
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
function tone(ac, out, t, { f = 660, f2 = 0, type = 'sine', g = .1, a = .004, d = .12, pan = 0 } = {}) {
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d * .6);
  const gn = ac.createGain(); env(gn, t, a, g, d);
  const p = ac.createStereoPanner(); p.pan.value = pan;
  o.connect(gn).connect(p).connect(out); o.start(t); o.stop(t + a + d + .05);
}
function noise(ac, out, nb, t, { type = 'bandpass', f = 1200, f2 = 0, q = 1, g = .1, a = .01, d = .2, pan = 0, pan2 = null, off = 0 } = {}) {
  const src = ac.createBufferSource(); src.buffer = nb;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  const gn = ac.createGain(); env(gn, t, a, g, d);
  const p = ac.createStereoPanner(); p.pan.setValueAtTime(pan, t); if (pan2 !== null) p.pan.linearRampToValueAtTime(pan2, t + a + d);
  src.connect(fl).connect(gn).connect(p).connect(out); src.start(t, off % 1.5); src.stop(t + a + d + .05);
}
// Sound library. In scenes.js: sfx(add) { add(designTime, 'name', k) }. k is a pitch in Hz for hop*/tick/chime, an index for key.
const SFX_NAMES = ['key', 'enterKey', 'click', 'blipUp', 'blipDown', 'hopOut', 'hopIn', 'whooshSmall', 'whooshSmallRev', 'whoosh',
  'whooshLong', 'whooshBig', 'whooshSoft', 'pop', 'popLow', 'thunk', 'boxIn', 'tick', 'slide', 'chime', 'error', 'success'];
function sfx(ac, out, nb, name, t, k = 0) {
  const N = o => noise(ac, out, nb, t, { off: (t * 7.31) % 1.4, ...o }), T = o => tone(ac, out, t, o);
  switch (name) {
    case 'key': N({ type: 'highpass', f: 2600, q: .7, g: .11, a: .002, d: .035, pan: -.35 }); T({ f: 1650 + (k % 3) * 150, g: .02, a: .001, d: .03, pan: -.35 }); break;
    case 'enterKey': N({ type: 'bandpass', f: 1300, q: .8, g: .18, a: .002, d: .07, pan: -.35 }); T({ f: 190, f2: 120, g: .12, a: .002, d: .09, pan: -.35 }); break;
    case 'click': N({ type: 'highpass', f: 3200, q: .7, g: .12, a: .001, d: .03 }); T({ f: 2300, g: .025, a: .001, d: .02 }); break;
    case 'blipUp': T({ f: 880, f2: 1320, g: .045, a: .004, d: .08, pan: .25 }); break;
    case 'blipDown': T({ f: 1180, f2: 780, g: .035, a: .004, d: .09, pan: -.25 }); break;
    case 'hopOut': T({ f: k || 590, f2: (k || 590) * 1.25, g: .04, a: .003, d: .07, pan: .45 }); break;
    case 'hopIn': T({ f: (k || 590) * 1.25, f2: k || 590, g: .035, a: .003, d: .08, pan: .25 }); break;
    case 'whooshSmall': N({ f: 700, f2: 2600, q: 1.4, g: .11, a: .18, d: .35, pan: -.5, pan2: .5 }); break;
    case 'whooshSmallRev': N({ f: 2400, f2: 700, q: 1.4, g: .11, a: .18, d: .35, pan: .5, pan2: -.5 }); break;
    case 'whoosh': N({ f: 500, f2: 3000, q: 1.1, g: .15, a: .3, d: .6, pan: -.6, pan2: .6 }); break;
    case 'whooshLong': N({ f: 600, f2: 2200, q: 1, g: .1, a: .5, d: 1, pan: 0, pan2: .9 }); break;
    case 'whooshBig': N({ type: 'lowpass', f: 300, f2: 2600, q: .8, g: .26, a: .7, d: 1.1, pan: .5, pan2: -.5 }); break;
    case 'whooshSoft': N({ f: 900, f2: 1900, q: .9, g: .06, a: .25, d: .45 }); break;
    case 'pop': T({ f: 900, f2: 520, g: .09, a: .003, d: .12 }); break;
    case 'popLow': T({ f: 420, f2: 260, g: .12, a: .003, d: .16 }); break;
    case 'thunk': T({ f: 130, f2: 62, g: .22, a: .004, d: .28 }); N({ type: 'lowpass', f: 500, g: .06, a: .002, d: .08 }); break;
    case 'boxIn': T({ f: 620, f2: 760, g: .035, a: .01, d: .12 }); break;
    case 'tick': T({ f: k || 880, g: .03, a: .002, d: .1, type: 'triangle', pan: ((k || 880) % 7) / 7 - .5 }); break;
    case 'slide': N({ f: 400, f2: 1700, q: 2, g: .07, a: .3, d: .5 }); break;
    case 'chime': { const f = k || 880; T({ f, g: .055, a: .004, d: 1.4 }); T({ f: f * 2.01, g: .02, a: .004, d: .9 }); T({ f: f * 3.02, g: .009, a: .003, d: .5 }); break; }
    case 'error': T({ f: 220, g: .1, a: .005, d: .18, type: 'square' }); T({ f: 207, g: .08, a: .005, d: .25, type: 'square' }); break;
    case 'success': [0, .08, .16].forEach((dt, i) => tone(ac, out, t + dt, { f: mtof([72, 76, 79][i]), g: .05, a: .004, d: .5 })); break;
    default: console.warn('unknown sfx', name);
  }
}
async function renderSfx(ac) {
  const nb = noiseBuffer(ac, 2, 7), bus = ac.createGain(); bus.connect(ac.destination);
  const E = [];
  if (CFG.sfx) CFG.sfx((td, name, k = 0) => E.push([unwarp(td), name, k]));
  for (const [t, name, k] of E) sfx(ac, bus, nb, name, t, k);
  return ac.startRendering();
}
async function renderMusic(ac, dur) {
  // warm lo-fi bed. CFG.music: { bpm, chords:[{b, n:[midi...]}], plucksFrom, hatsFrom, hatsTo } (design times)
  const M = CFG.music || {};
  const out = ac.createGain();
  out.gain.setValueAtTime(0, 0); out.gain.linearRampToValueAtTime(1, 2.2);
  out.gain.setValueAtTime(1, Math.max(2.3, dur - 3)); out.gain.linearRampToValueAtTime(0, dur);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
  out.connect(lp).connect(ac.destination);
  const nb = noiseBuffer(ac, 2, 11), r = rng(5);
  const beat = 60 / (M.bpm || 88), bar = beat * 4;
  const CH = M.chords || [{ b: 41, n: [53, 57, 60, 64] }, { b: 45, n: [52, 55, 57, 60] }, { b: 38, n: [53, 57, 60, 62] }, { b: 46, n: [53, 57, 58, 62] }];
  const plucksFrom = unwarp(M.plucksFrom ?? (SCENES[1] ? SCENES[1].start : 0)) - .1;
  const hatsFrom = M.hatsFrom === undefined ? Infinity : unwarp(M.hatsFrom), hatsTo = unwarp(M.hatsTo ?? (S.end ?? DESIGN_DUR));
  for (let i = 0; i * bar < dur; i++) {
    const t0 = i * bar, c = CH[i % CH.length];
    for (const m of c.n) for (const det of [-6, 6]) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.02, t0 + .9);
      g.gain.setValueAtTime(.02, t0 + bar - .2); g.gain.linearRampToValueAtTime(0, t0 + bar + .9);
      o.connect(f).connect(g).connect(out); o.start(t0); o.stop(t0 + bar + 1);
    }
    const bo = ac.createOscillator(); bo.type = 'sine'; bo.frequency.value = mtof(c.b);
    const bg = ac.createGain(); bg.gain.setValueAtTime(0, t0); bg.gain.linearRampToValueAtTime(.09, t0 + .03);
    bg.gain.exponentialRampToValueAtTime(.03, t0 + bar * .9); bg.gain.linearRampToValueAtTime(0, t0 + bar);
    bo.connect(bg).connect(out); bo.start(t0); bo.stop(t0 + bar + .05);
    const pat = [0, 2, 1, 3, 2, 1, 3, 2];
    for (let s8 = 0; s8 < 8; s8++) {
      const t = t0 + s8 * beat / 2, skip = r() < .3;
      if (t >= plucksFrom && !skip && t < dur - 1) tone(ac, out, t, { f: mtof(c.n[pat[s8] % c.n.length] + 12), g: .028, a: .005, d: .45, type: 'triangle', pan: s8 % 2 ? .3 : -.3 });
      if (s8 % 2 === 1 && t >= hatsFrom && t < hatsTo) noise(ac, out, nb, t, { type: 'highpass', f: 7500, g: .016, a: .002, d: .035, off: s8 * .13 });
    }
  }
  return ac.startRendering();
}
function wavB64(buf) {
  const n = buf.length, sr = buf.sampleRate, L = buf.getChannelData(0), Rc = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const ws = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true);
  v.setUint16(32, 4, true); v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, clamp(L[i], -1, 1) * 32767, true); v.setInt16(o + 2, clamp(Rc[i], -1, 1) * 32767, true); }
  const bytes = new Uint8Array(ab); let str = '';
  for (let i = 0; i < bytes.length; i += 0x8000) str += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(str);
}

// ---------- boot: preview player or deterministic record mode ----------
function boot(cfg) {
  CFG = cfg;
  if (!SCENES.length) throw new Error('call defineScenes([...]) before boot()');
  const REC = location.search.includes('record');
  const audio = (!REC && TL && TL.audio) ? new Audio(TL.audio) : null;
  let T = 0, playing = !REC && !audio, last = null;
  window.__duration = DUR;
  window.__scenes = () => SCENES.map(s => ({ id: s.id, start: s.rstart, dur: s.rdur, mid: s.rstart + s.rdur / 2 }));
  window.__timeline = () => SCENES.filter(s => TL && TL.scenes[s.id]).map(s => ({ id: s.id, at: s.rstart + s.lead, clip: TL.scenes[s.id].clip }));
  window.__seek = t => { T = t; render(T); };
  window.__step = dt => { T += dt; render(T); };
  window.__renderAudio = async () => {
    const sr = 48000, N = Math.ceil(DUR * sr);
    const music = await renderMusic(new OfflineAudioContext(2, N, sr), DUR);
    const fx = await renderSfx(new OfflineAudioContext(2, N, sr));
    return { music: wavB64(music), sfx: wavB64(fx) };
  };
  if (REC) { document.body.classList.add('rec'); render(0); return; }

  const playBtn = document.getElementById('play'), scrub = document.getElementById('scrub'), timeEl = document.getElementById('time');
  const chapters = document.getElementById('chapters');
  scrub.max = DUR;
  const steps = cfg.steps || [];
  SCENES.forEach(s => {
    const b = document.createElement('button');
    b.textContent = s.n ? `${s.n}. ${steps[s.n - 1] || s.id}` : (s.id === 'title' ? 'Title' : s.id === 'end' ? 'End' : s.id);
    b.onclick = () => seek(s.rstart + .01);
    b.dataset.id = s.id; chapters.appendChild(b);
  });
  function seek(t) { T = clamp(t, 0, DUR); if (audio) audio.currentTime = Math.min(T, audio.duration || T); }
  const setPlay = v => {
    playing = v; playBtn.textContent = v ? 'Pause' : 'Play';
    if (audio) { if (v) { audio.currentTime = T; audio.play().catch(() => {}); } else audio.pause(); }
  };
  if (audio) { playBtn.textContent = 'Play with sound'; document.querySelector('.hint').textContent = 'Press play to hear the narration. Space to play or pause. Arrows skip 2 seconds.'; }
  playBtn.onclick = () => setPlay(!playing);
  document.getElementById('restart').onclick = () => { seek(0); setPlay(true); };
  scrub.oninput = () => seek(+scrub.value);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); setPlay(!playing); }
    if (e.code === 'ArrowRight') seek(T + 2);
    if (e.code === 'ArrowLeft') seek(T - 2);
  });
  let hold = 0;
  function loop(ts) {
    const dt = last == null ? 0 : Math.min(.1, (ts - last) / 1000); last = ts;
    if (playing) {
      if (T >= DUR) { hold += dt; if (hold > 1.5) { hold = 0; seek(0); if (audio) audio.play().catch(() => {}); } }
      else if (audio && !audio.paused && !audio.ended) T = Math.min(DUR, audio.currentTime);
      else T = Math.min(DUR, T + dt);
    }
    render(T);
    scrub.value = T;
    timeEl.textContent = `${T.toFixed(1)} / ${DUR.toFixed(1)}s`;
    const cur = sceneAtReal(T).id;
    for (const b of chapters.children) b.classList.toggle('on', b.dataset.id === cur);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
