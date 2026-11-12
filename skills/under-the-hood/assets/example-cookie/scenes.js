// Cookie explainer: "What actually happens when you type cookie into Google?"
// Reference project for the under-the-hood skill. Times below are DESIGN seconds; the engine
// stretches each scene to fit its narration clip.

defineScenes([
  { id:'title',  dur:2.8 },
  { id:'dns',    dur:4.2, n:1, cap:"First, find Google's address with DNS", sub:'On a first visit, the browser looks up the IP' },
  { id:'tls',    dur:3.6, n:2, cap:'Then open an encrypted connection', sub:'QUIC + TLS 1.3, simplified' },
  { id:'typing', dur:4.0, n:3, cap:'Every letter asks for suggestions', sub:'Each keystroke is a tiny request' },
  { id:'enter',  dur:3.6, n:4, cap:'Press Enter. Your query flies to Google', sub:'Your browser cookies ride along too' },
  { id:'fanout', dur:4.2, n:5, cap:'Thousands of machines search the index at once', sub:'Each one holds a slice of the web' },
  { id:'rank',   dur:3.6, n:6, cap:'Pages get ranked by relevance and quality', sub:'Hundreds of signals decide the order' },
  { id:'render', dur:4.0, n:7, cap:'Results fly back and your browser draws them', sub:'The reply can set new cookies too' },
  { id:'end',    dur:3.4 },
]);
const STEPS = ['DNS','Encrypt','Suggest','Request','Index','Rank','Render'];
const X0 = 1920;   // second "world" to the right, reached by panning the camera

function cookie(x, y, r, rot = 0) {
  if (r <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = '#d9a25e'; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, k = r * (1 + 0.035 * Math.sin(i * 5.3)); ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4a2c17';
  for (const [cx, cy, s] of [[-.38, -.28, .15], [.3, -.38, .12], [.06, .08, .14], [-.32, .36, .11], [.42, .28, .13], [.02, -.62, .08]]) {
    ctx.beginPath(); ctx.ellipse(cx * r, cy * r, s * r, s * r * .78, .6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- typing data ----------
const SUG = {
  c: ['calculator', 'calendar', 'chess'],
  co: ['coffee near me', 'color picker', 'converter'],
  coo: ['cooking games', 'cool facts', 'cooling tips'],
  cook: ['cookies', 'cooking recipes', 'cook time chart'],
  cooki: ['cookie recipe', 'cookies meaning', 'cookie dough'],
  cookie: ['cookie recipe', 'cookie dough', 'cookies in browser'],
};
const TYPE = [{ t: S.dns + 0.5, s: 'c', req: S.tls + 2.6 }];
'ookie'.split('').forEach((_, i) => { const tt = S.typing + 0.15 + i * 0.62; TYPE.push({ t: tt, s: 'cookie'.slice(0, i + 2), req: tt + 0.05 }); });
const typed = t => { let s = ''; for (const e of TYPE) if (t >= e.t) s = e.s; return s; };
const suggestFor = t => { let s = null; for (const e of TYPE) if (t >= e.req + 0.6) s = e.s; return s; };

// ---------- layout ----------
const BR = { x: 100, y: 170, w: 780, h: 600 };
const SV = { x: 1480, y: 370, w: 300, h: 260 };
const TY = 500;               // tunnel y
const QN = { x: X0 + 210, y: 580 };
const MG = { x: X0 + 1320, y: 560 };
const GX = X0 + 640, GY = 300;
const RP = { x: X0 + 1410, y: 250, w: 440, h: 520 };
const CANDS = [
  { t: 'Chocolate chip cookie recipe', s: .94 },
  { t: 'HTTP cookies, explained', s: .81 },
  { t: 'What is a cookie?', s: .72 },
  { t: 'Cookie dough safety tips', s: .56 },
  { t: 'An old forum thread', s: .30 },
];
const INIT_SLOT = [3, 1, 4, 0, 2]; // where each candidate starts before sorting
const RESULTS = [
  { u: 'bakery.example  >  recipes', t: 'Chocolate chip cookie recipe' },
  { u: 'dev.example  >  docs', t: 'HTTP cookies, explained' },
  { u: 'dictionary.example', t: 'What is a cookie?' },
];


// ---------- camera ----------
function camera(t) {
  let x = 0, z = 1;
  if (t >= S.fanout && t < S.render) { const p = prog(t, S.fanout, S.fanout + 1.1); x = 1920 * ease(p); z = 1 - .07 * Math.sin(Math.PI * p); }
  else if (t >= S.render) { const p = prog(t, S.render, S.render + 1.2); x = 1920 * (1 - ease(p)); z = 1 - .07 * Math.sin(Math.PI * p); }
  return { x, z };
}


// ---------- world A: browser, DNS, server ----------
function drawBrowser(t) {
  const p = prog(t, S.dns, S.dns + 0.8); if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(p * 2 - .4);
  ctx.fillStyle = 'rgba(31,29,26,.10)'; rr(BR.x + 6, BR.y + 10, BR.w, BR.h, 18); ctx.fill();
  ctx.fillStyle = C.paper; rr(BR.x, BR.y, BR.w, BR.h, 18); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; strokeReveal(BR.x, BR.y, BR.w, BR.h, 18, ease(p));
  const q = clamp(p * 1.8 - .8); if (q <= 0) { ctx.restore(); return; }
  ctx.globalAlpha = q;
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(BR.x, BR.y + 52); ctx.lineTo(BR.x + BR.w, BR.y + 52); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(BR.x + 30 + i * 24, BR.y + 26, 7, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = C.bg; rr(BR.x + 120, BR.y + 12, BR.w - 160, 28, 14); ctx.fill(); ctx.strokeStyle = C.faint; ctx.lineWidth = 2; ctx.stroke();
  const resMode = ease(prog(t, S.render + 2.0, S.render + 2.6));
  text(resMode > .5 ? 'google.com/search?q=cookie' : 'google.com', BR.x + 142, BR.y + 26, 16, { col: C.soft, align: 'left', mono: true });
  drawSearch(t, resMode);
  ctx.restore();
}

function drawSearch(t, m) {
  const cx = BR.x + BR.w / 2, cy = lerp(400, 262, m), bw = lerp(600, 660, m), bh = lerp(72, 56, m);
  const bx = cx - bw / 2, by = cy - bh / 2;
  if (m < 1) { ctx.save(); ctx.globalAlpha *= clamp(1 - m * 3); text('Search', cx, cy - 112, 56, { w: 300, col: C.soft }); ctx.restore(); }

  // dropdown
  const sKey = suggestFor(t);
  const firstSug = TYPE[0].req + .6;
  const dA = sKey ? prog(t, firstSug, firstSug + .2) * (1 - prog(t, S.enter + .3, S.enter + .6)) : 0;
  if (sKey && dA > 0) {
    ctx.save(); ctx.globalAlpha *= dA;
    ctx.fillStyle = C.paper; rr(bx, by + bh / 2, bw, bh / 2 + 3 * 54 + 22, 20); ctx.fill();
    ctx.strokeStyle = C.faint; ctx.lineWidth = 2.5; ctx.stroke();
    SUG[sKey].forEach((s, i) => {
      const ry = by + bh + 34 + i * 54;
      magnifier(bx + 40, ry, 20, C.faint);
      const pre = s.startsWith(sKey) ? sKey : '';
      font(26, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.ink;
      ctx.fillText(pre, bx + 72, ry); const pw = ctx.measureText(pre).width;
      font(26, 400); ctx.fillStyle = C.soft; ctx.fillText(s.slice(pre.length), bx + 72 + pw, ry);
    });
    ctx.restore();
  }

  // search box
  ctx.fillStyle = C.paper; rr(bx, by, bw, bh, bh / 2); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
  magnifier(bx + 36, cy, lerp(26, 22, m), C.soft);
  const s = typed(t);
  font(lerp(30, 24, m), 500); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(s, bx + 70, cy + 1);
  if (t < S.enter + .45 && Math.floor(t * 2.2) % 2 === 0) {
    const w = ctx.measureText(s).width; ctx.fillRect(bx + 72 + w, cy - 17, 2.5, 34);
  }

  // enter key
  const kp = prog(t, S.enter + .05, S.enter + .4), kOut = 1 - prog(t, S.enter + 1.2, S.enter + 1.6);
  if (kp > 0 && kOut > 0) {
    const press = bump(t, S.enter + .55, .15);
    ctx.save(); ctx.globalAlpha *= kOut; ctx.translate(BR.x + BR.w - 130, BR.y + BR.h - 70 + press * 6); ctx.scale(backOut(kp), backOut(kp));
    ctx.fillStyle = 'rgba(31,29,26,.18)'; rr(-75, -26 + 8 - press * 6, 150, 56, 12); ctx.fill();
    ctx.fillStyle = press > .3 ? '#e9e2d4' : C.paper; rr(-75, -30, 150, 56, 12); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
    text('enter  ↵', 0, -2, 22, { w: 600 });
    ctx.restore();
  }

  // results
  if (m > 0) {
    RESULTS.forEach((r, i) => {
      const ra = easeOut(prog(t, S.render + 2.3 + i * .28, S.render + 2.9 + i * .28)); if (ra <= 0) return;
      const x = BR.x + 70, y = 330 + i * 138 + (1 - ra) * 24;
      ctx.save(); ctx.globalAlpha *= ra;
      text(r.u, x, y, 17, { col: C.green, align: 'left', mono: true });
      text(r.t, x, y + 36, 28, { w: 650, col: C.blue, align: 'left' });
      ctx.fillStyle = C.faint;
      rr(x, y + 66, 560 * ra, 11, 5); ctx.fill(); rr(x, y + 88, 400 * ra, 11, 5); ctx.fill();
      ctx.restore();
    });
  }
}

function drawDNS(t) {
  const a = prog(t, S.dns + .7, S.dns + 1.1) * (1 - prog(t, S.tls, S.tls + .5)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const R = { x: 1110, y: 250, w: 260, h: 96 };
  const boxes = [{ y: 150, l: 'root  ( . )' }, { y: 262, l: '.com servers' }, { y: 374, l: 'google.com NS' }];
  // links
  ctx.strokeStyle = C.faint; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
  boxes.forEach(b => { ctx.beginPath(); ctx.moveTo(R.x + R.w, R.y + R.h / 2); ctx.lineTo(1580, b.y + 32); ctx.stroke(); });
  ctx.setLineDash([]);
  // resolver
  const rp = prog(t, S.dns + .7, S.dns + 1.2);
  ctx.fillStyle = C.paper; rr(R.x, R.y, R.w, R.h, 14); ctx.fill();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3; strokeReveal(R.x, R.y, R.w, R.h, 14, ease(rp));
  text('DNS resolver', R.x + R.w / 2, R.y + 38, 26, { w: 700 });
  text('the internet’s phone book', R.x + R.w / 2, R.y + 68, 16, { col: C.soft });
  // hierarchy
  boxes.forEach((b, i) => {
    const bp = prog(t, S.dns + .9 + i * .15, S.dns + 1.4 + i * .15);
    const h0 = S.dns + 1.75 + i * .4, hit = bump(t, h0 + .2, .14);
    ctx.fillStyle = hit > 0 ? `rgba(47,111,222,${.14 * hit})` : C.paper; rr(1580, b.y, 220, 64, 12); ctx.fill();
    ctx.strokeStyle = hit > 0 ? C.blue : C.ink; ctx.lineWidth = 3 + hit * 2; strokeReveal(1580, b.y, 220, 64, 12, ease(bp));
    ctx.save(); ctx.globalAlpha *= clamp(bp * 2 - 1); text(b.l, 1690, b.y + 32, 21, { w: 600, mono: true }); ctx.restore();
    const out = prog(t, h0, h0 + .2), back = prog(t, h0 + .2, h0 + .4);
    if (out > 0 && out < 1) dot(lerp(R.x + R.w, 1580, ease(out)), lerp(R.y + R.h / 2, b.y + 32, ease(out)), 8, C.blue);
    if (back > 0 && back < 1) dot(lerp(1580, R.x + R.w, ease(back)), lerp(b.y + 32, R.y + R.h / 2, ease(back)), 8, C.orange);
  });
  ctx.restore();
  // question + answer
  const qp = prog(t, S.dns + 1.0, S.dns + 1.75);
  if (qp > 0 && qp < 1) { const e = ease(qp); pill(lerp(960, 1110, e), lerp(430, 300, e) - Math.sin(e * Math.PI) * 40, 'google.com ?', C.blue, { size: 20, mono: true, alpha: fadeIO(qp) }); }
  const ap = prog(t, S.dns + 3.0, S.dns + 3.85);
  if (ap > 0 && ap < 1) { const e = ease(ap); pill(lerp(1240, 960, e), lerp(380, 440, e) + Math.sin(e * Math.PI) * 60, '142.250.80.46', C.orange, { size: 20, mono: true, sub: 'google.com', alpha: fadeIO(ap) }); }
}

function serverActivity(t) {
  let a = 0;
  for (const e of TYPE) a = Math.max(a, bump(t, e.req + .32, .18));
  a = Math.max(a, prog(t, S.enter + 1.55, S.enter + 1.75) * (1 - prog(t, S.enter + 2.6, S.enter + 3.0)));
  a = Math.max(a, bump(t, S.tls + 1.5, .25), bump(t, S.render + 1.0, .3));
  return a;
}
function drawServer(t) {
  const p = prog(t, S.tls, S.tls + .7); if (p <= 0) return;
  const act = serverActivity(t);
  if (act > 0) { ctx.fillStyle = `rgba(42,157,111,${.12 * act})`; rr(SV.x - 14 * act, SV.y - 14 * act, SV.w + 28 * act, SV.h + 28 * act, 18); ctx.fill(); }
  rack(SV.x, SV.y, SV.w, SV.h, { reveal: p, lit: act > .2 ? 1 : 0, units: 4, lw: 3.5 });
  ctx.save(); ctx.globalAlpha *= clamp(p * 2 - .8);
  text('Google front end', SV.x + SV.w / 2, SV.y + SV.h + 40, 26, { w: 700 });
  text('the nearest edge server', SV.x + SV.w / 2, SV.y + SV.h + 72, 18, { col: C.soft });
  ctx.restore();
  const f = prog(t, S.enter + 2.2, S.enter + 2.6) * (1 - prog(t, S.render, S.render + .4));
  if (f > 0) { ctx.save(); ctx.globalAlpha *= f; text('forwarding to a data center  →', SV.x + SV.w / 2, SV.y + SV.h + 112, 19, { w: 600, col: C.blue }); ctx.restore(); }
}

function drawTunnel(t) {
  const a = prog(t, S.tls + .4, S.tls + 1.0); if (a <= 0) return;
  const x1 = BR.x + BR.w, x2 = SV.x, mid = (x1 + x2) / 2;
  const solid = ease(prog(t, S.tls + 2.2, S.tls + 2.6));
  ctx.strokeStyle = C.soft; ctx.lineWidth = 2.5; ctx.setLineDash([10, 10]);
  ctx.save(); ctx.globalAlpha *= 1 - solid; lineP(x1, TY, x2, TY, ease(a)); ctx.restore(); ctx.setLineDash([]);
  if (solid > 0) {
    const hw = (x2 - x1) / 2 * solid;
    ctx.fillStyle = C.lgreen; ctx.fillRect(mid - hw, TY - 16, hw * 2, 32);
    ctx.strokeStyle = C.green; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(mid - hw, TY - 16); ctx.lineTo(mid + hw, TY - 16); ctx.moveTo(mid - hw, TY + 16); ctx.lineTo(mid + hw, TY + 16); ctx.stroke();
  }
  const lp = prog(t, S.tls + .6, S.tls + 1.0);
  if (lp > 0) {
    ctx.save(); ctx.translate(mid, TY - 92); ctx.scale(backOut(lp), backOut(lp));
    const closed = ease(prog(t, S.tls + 2.2, S.tls + 2.55));
    lock(0, 0, 64, closed, closed > .5 ? C.green : C.paper);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= solid; text('encrypted', mid, TY + 46, 19, { w: 600, col: C.green }); ctx.restore();
  }
}

function drawWorldAPackets(t) {
  const x1 = BR.x + BR.w + 70, x2 = SV.x - 70;
  // handshake
  const h1 = prog(t, S.tls + .8, S.tls + 1.5), h2 = prog(t, S.tls + 1.5, S.tls + 2.2);
  if (h1 > 0 && h1 < 1) pill(lerp(x1 + 50, x2 - 50, ease(h1)), TY, 'Hello + key share', C.blue, { size: 20, alpha: fadeIO(h1) });
  if (h2 > 0 && h2 < 1) pill(lerp(x2 - 50, x1 + 50, ease(h2)), TY, 'Hello + certificate', C.orange, { size: 20, alpha: fadeIO(h2) });
  // suggestion round trips
  for (const e of TYPE) {
    const o = prog(t, e.req, e.req + .3), b = prog(t, e.req + .3, e.req + .6);
    if (o > 0 && o < 1) pill(lerp(x1, x2, ease(o)), TY, 'q=' + e.s, C.blue, { size: 17, mono: true, alpha: fadeIO(o) });
    if (b > 0 && b < 1) dot(lerp(x2, x1, ease(b)), TY, 10, C.orange);
  }
  // the real request
  const g = prog(t, S.enter + .6, S.enter + 1.7);
  if (g > 0 && g < 1) {
    const sc = 1 - .4 * prog(g, .85, 1);
    pill(lerp(x1 + 120, x2 - 110, ease(g)), TY, 'GET /search?q=cookie', C.blue, { size: 22, mono: true, sub: 'Cookie: lang=en', icon: cookie, alpha: clamp(g * 8) * (1 - prog(g, .88, 1)), scale: sc });
  }
  // forward to data center (continues while the camera pans)
  const f = prog(t, S.enter + 2.3, S.fanout + 1.1);
  if (f > 0 && f < 1) pill(lerp(SV.x + SV.w + 20, QN.x - 40, ease(f)), lerp(TY, QN.y, ease(f)), 'q=cookie', C.blue, { size: 20, mono: true, icon: cookie, alpha: clamp(f * 10) * (1 - prog(f, .9, 1)) });
  // response
  const r = prog(t, S.render, S.render + 2.0);
  if (r > 0 && r < 1) {
    const e = easeOut(r);
    pill(lerp(MG.x, BR.x + BR.w + 120, e), lerp(MG.y, TY, clamp(e * 2)), '200 OK  HTML', C.orange, { size: 22, mono: true, sub: 'Set-Cookie: prefs=...', icon: cookie, alpha: clamp(r * 10) * (1 - prog(r, .9, 1)) });
  }
}

// ---------- world B: data center ----------
function rackPos(c, r) { return { x: GX + c * 104, y: GY + r * 124, w: 64, h: 84 }; }
function drawWorldB(t) {
  if (t < S.enter + 2) return;
  const dim = 1 - .55 * prog(t, S.rank, S.rank + .5);
  const lab = prog(t, S.fanout + .3, S.fanout + .8);
  ctx.save(); ctx.globalAlpha *= lab; text('Inside a Google data center', X0 + 960, 178, 30, { w: 700, col: C.soft }); ctx.restore();

  // index card
  const cp = prog(t, S.fanout + .45, S.fanout + 1.0);
  if (cp > 0) {
    const x = X0 + 60, y = 250, w = 470, h = 210;
    ctx.save(); ctx.globalAlpha *= clamp(cp * 2) * (0.45 + .55 * dim);
    ctx.fillStyle = C.paper; rr(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; strokeReveal(x, y, w, h, 16, ease(cp));
    text('Inverted index', x + 26, y + 38, 24, { w: 700, align: 'left' });
    text('word  →  pages that contain it', x + 26, y + 68, 16, { col: C.soft, align: 'left' });
    const rows = [{ k: 'cookie', d: ['#12', '#873', '#4091', '...'], hot: true }, { k: 'cake', d: ['#3', '#12', '#55', '...'] }];
    rows.forEach((row, ri) => {
      const ry = y + 118 + ri * 54;
      ctx.save(); if (!row.hot) ctx.globalAlpha *= .4;
      const hl = row.hot ? prog(t, S.fanout + 1.3, S.fanout + 1.6) : 0;
      if (hl > 0) { ctx.fillStyle = `rgba(224,114,47,${.16 * hl})`; rr(x + 14, ry - 22, w - 28, 44, 10); ctx.fill(); }
      text(row.k, x + 30, ry, 22, { w: 700, mono: true, align: 'left' });
      text('→', x + 140, ry, 22, { col: C.soft });
      row.d.forEach((d, i) => {
        const ca = row.hot ? easeOut(prog(t, S.fanout + 1.4 + i * .12, S.fanout + 1.7 + i * .12)) : 1;
        if (ca <= 0) return;
        ctx.save(); ctx.globalAlpha *= ca;
        const cx = x + 172 + i * 72;
        ctx.fillStyle = C.lblue; rr(cx, ry - 16, 62, 32, 8); ctx.fill();
        text(d, cx + 31, ry + 1, 16, { w: 600, mono: true, col: C.blue });
        ctx.restore();
      });
      ctx.restore();
    });
    ctx.restore();
  }

  // query node
  const qa = prog(t, S.fanout + .95, S.fanout + 1.35);
  if (qa > 0) {
    ctx.save(); ctx.translate(QN.x, QN.y); ctx.scale(backOut(qa), backOut(qa));
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.stroke();
    text('query', 0, -16, 16, { col: C.soft }); text('cookie', 0, 12, 22, { w: 700, mono: true });
    ctx.restore();
  }

  // shard grid
  const gl = prog(t, S.fanout + .4, S.fanout + .8);
  ctx.save(); ctx.globalAlpha *= gl * dim; text('Index shards, thousands in reality', GX + 292, GY - 38, 20, { col: C.soft }); ctx.restore();
  for (let c = 0; c < 6; c++) for (let r = 0; r < 4; r++) {
    const R = rackPos(c, r), idx = c * 4 + r;
    const lp = prog(t, S.fanout + 1.45 + idx * .012, S.fanout + 1.9 + idx * .012);
    ctx.save(); ctx.globalAlpha *= .35 * dim; ctx.strokeStyle = C.blue; ctx.lineWidth = 1.6;
    lineP(QN.x + 62, QN.y, R.x, R.y + R.h / 2, lp); ctx.restore();
  }
  for (let c = 0; c < 6; c++) for (let r = 0; r < 4; r++) {
    const R = rackPos(c, r), idx = c * 4 + r;
    const rev = prog(t, S.fanout + .35 + (c + r) * .05, S.fanout + .85 + (c + r) * .05);
    const tOut = S.fanout + 1.6 + c * .06 + r * .03;
    const lit = prog(t, tOut + .45, tOut + .65);
    ctx.save(); ctx.globalAlpha *= dim;
    rack(R.x, R.y, R.w, R.h, { reveal: rev, lit, units: 3, lw: 2.5 });
    ctx.restore();
    const o = prog(t, tOut, tOut + .45);
    if (o > 0 && o < 1) dot(lerp(QN.x + 62, R.x, ease(o)), lerp(QN.y, R.y + R.h / 2, ease(o)), 6, C.blue);
    const b = prog(t, S.fanout + 2.6 + c * .05 + r * .04, S.fanout + 3.1 + c * .05 + r * .04);
    if (b > 0 && b < 1) dot(lerp(R.x + R.w, MG.x - 50, ease(b)), lerp(R.y + R.h / 2, MG.y, ease(b)), 6, C.orange);
  }

  // merge node
  const ma = prog(t, S.fanout + 2.4, S.fanout + 2.8);
  if (ma > 0) {
    const pulse = bump(t, S.fanout + 3.4, .5);
    ctx.save(); ctx.translate(MG.x, MG.y); ctx.scale(backOut(ma) * (1 + .1 * pulse), backOut(ma) * (1 + .1 * pulse));
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.orange; ctx.lineWidth = 4; ctx.stroke();
    text('merge', 0, 1, 19, { w: 700 });
    ctx.restore();
  }

  // ranking panel
  const pp = prog(t, S.rank, S.rank + .5);
  if (pp > 0) {
    ctx.fillStyle = C.paper; ctx.save(); ctx.globalAlpha *= clamp(pp * 2); rr(RP.x, RP.y, RP.w, RP.h, 18); ctx.fill(); ctx.restore();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; strokeReveal(RP.x, RP.y, RP.w, RP.h, 18, ease(pp));
    ctx.save(); ctx.globalAlpha *= clamp(pp * 2 - .6);
    text('Ranking', RP.x + 26, RP.y + 42, 28, { w: 700, align: 'left' });
    let cx = RP.x + 26;
    ['relevance', 'quality', 'freshness'].forEach((s, i) => {
      const ca = easeOut(prog(t, S.rank + .5 + i * .15, S.rank + .8 + i * .15));
      font(16, 600); const w = ctx.measureText(s).width + 26;
      ctx.save(); ctx.globalAlpha *= ca;
      ctx.fillStyle = C.lblue; rr(cx, RP.y + 70, w, 30, 15); ctx.fill();
      text(s, cx + w / 2, RP.y + 86, 16, { w: 600, col: C.blue });
      ctx.restore(); cx += w + 10;
    });
    CANDS.forEach((cand, k) => {
      const grow = easeOut(prog(t, S.rank + .4 + INIT_SLOT[k] * .12, S.rank + 1.0 + INIT_SLOT[k] * .12));
      const sp = ease(prog(t, S.rank + 1.6 + k * .06, S.rank + 2.4 + k * .06));
      const slot = lerp(INIT_SLOT[k], k, sp);
      const y = RP.y + 140 + slot * 74;
      const top = k < 3 ? prog(t, S.rank + 2.6 + k * .12, S.rank + 2.85 + k * .12) : 0;
      ctx.save(); ctx.globalAlpha *= clamp(grow * 3);
      text(cand.t, RP.x + 26, y, 19, { w: 600, align: 'left', col: k >= 3 && sp > .5 ? C.soft : C.ink });
      ctx.fillStyle = C.bg; rr(RP.x + 26, y + 18, 340, 14, 7); ctx.fill();
      ctx.fillStyle = top > 0 ? C.green : C.blue; rr(RP.x + 26, y + 18, Math.max(1, 340 * cand.s * grow), 14, 7); ctx.fill();
      if (top > 0) {
        ctx.save(); ctx.translate(RP.x + RP.w - 40, y + 14); ctx.scale(backOut(top), backOut(top));
        ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-2, 6); ctx.lineTo(8, -6); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    });
    ctx.restore();
  }
}


boot({
  steps: STEPS,
  camera,
  drawWorld(t) { drawTunnel(t); drawDNS(t); drawServer(t); drawBrowser(t); drawWorldB(t); drawWorldAPackets(t); },
  title: { kicker: 'What actually happens when you', parts: [['type ', C.ink], ['\u201Ccookie\u201D', C.orange, true], [' into Google?', C.ink]], icon: cookie },
  end: { headline: 'All of that in a fraction of a second.', cta: 'Follow for more \u201Cwhat actually happens\u201D explainers', icon: cookie },
  music: { plucksFrom: S.dns, hatsFrom: S.enter, hatsTo: S.end },
  sfx(add) {
  add(.06, 'pop');
  add(S.dns - .15, 'whooshSoft');
  TYPE.forEach((e, i) => { add(e.t, 'key', i); add(e.req, 'blipUp'); if (e.req + .6 < S.enter + .3) add(e.req + .6, 'blipDown'); });
  add(S.dns + .7, 'boxIn'); add(S.dns + 1.0, 'whooshSmall');
  for (let i = 0; i < 3; i++) { const h0 = S.dns + 1.75 + i * .4; add(h0, 'hopOut', mtof(74 + i * 3)); add(h0 + .2, 'hopIn', mtof(74 + i * 3)); }
  add(S.dns + 3.0, 'whooshSmallRev'); add(S.dns + 3.85, 'pop');
  add(S.tls, 'thunk'); add(S.tls + .8, 'whooshSmall'); add(S.tls + 1.5, 'whooshSmallRev');
  add(S.tls + 2.25, 'click'); add(S.tls + 2.31, 'click'); add(S.tls + 2.4, 'chime', mtof(69));
  add(S.enter + .05, 'pop'); add(S.enter + .55, 'enterKey'); add(S.enter + .6, 'whoosh'); add(S.enter + 1.65, 'thunk'); add(S.enter + 2.3, 'whooshLong');
  add(S.fanout, 'whooshBig'); add(S.fanout + 1.0, 'pop');
  for (let c = 0; c < 6; c++) for (let r = 0; r < 4; r++) add(S.fanout + 2.05 + c * .06 + r * .03, 'tick', mtof(PENTA[(c + r * 2) % 6]));
  add(S.fanout + 3.35, 'popLow');
  add(S.rank, 'whooshSoft');
  for (let k = 0; k < 5; k++) add(S.rank + .4 + k * .12, 'tick', mtof(PENTA[k]));
  add(S.rank + 1.6, 'slide');
  [72, 76, 79].forEach((m, k) => add(S.rank + 2.6 + k * .12, 'chime', mtof(m)));
  add(S.render, 'whooshBig'); add(S.render + 1.95, 'pop');
  for (let i = 0; i < 3; i++) add(S.render + 2.3 + i * .28, 'tick', mtof(PENTA[i + 2]));
  add(S.end + .2, 'pop');
  [65, 69, 72, 76].forEach((m, k) => add(S.end + .45 + k * .07, 'chime', mtof(m)));
  },
});
