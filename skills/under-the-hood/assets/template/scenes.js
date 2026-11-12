// Starter scenes. Replace with your topic. Read references/engine-api.md for every helper.
// Times are DESIGN seconds inside each scene. The engine stretches scenes to fit narration,
// so write animations at a natural pace and let the voice decide the final length.

defineScenes([
  { id: 'title', dur: 2.8 },
  { id: 'ask',   dur: 4.0, n: 1, cap: 'Your app sends the message', sub: 'One small request over the network' },
  { id: 'reply', dur: 4.0, n: 2, cap: 'The server saves it and replies', sub: 'A tiny "got it" comes back' },
  { id: 'end',   dur: 3.4 },
]);
const STEPS = ['Send', 'Reply'];

// layout (1920x1080 world, keep y 150..800 clear of the tracker and captions)
const PHONE = { x: 260, y: 300, w: 300, h: 420 };
const SERVER = { x: 1380, y: 330, w: 300, h: 260 };
const LANE = 500;  // y where packets travel

function bubbleIcon(x, y, r) {  // tiny chat bubble used on the title card, end card and packets
  if (r <= 0) return;
  ctx.fillStyle = C.blue; ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1.5, r * .08);
  rr(x - r, y - r * .75, r * 2, r * 1.4, r * .4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r * .4, y + r * .62); ctx.lineTo(x - r * .7, y + r); ctx.lineTo(x - r * .05, y + r * .62); ctx.fill();
}

function drawWorld(t) {
  // phone (appears with the first step and stays)
  const pp = prog(t, S.ask, S.ask + .7);
  box(PHONE.x, PHONE.y, PHONE.w, PHONE.h, pp, { title: 'Your app', sub: 'hello!', r: 36 });
  // server
  const sp = prog(t, S.ask + .4, S.ask + 1.1);
  rack(SERVER.x, SERVER.y, SERVER.w, SERVER.h, { reveal: sp, lit: bump(t, S.ask + 2.6, .4) + bump(t, S.reply + .4, .5) });
  if (sp > 0) { ctx.save(); ctx.globalAlpha *= sp; text('Server', SERVER.x + SERVER.w / 2, SERVER.y + SERVER.h + 40, 26, { w: 700 }); ctx.restore(); }
  // dashed lane
  ctx.save(); ctx.globalAlpha *= sp; ctx.strokeStyle = C.faint; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
  lineP(PHONE.x + PHONE.w, LANE, SERVER.x, LANE, ease(prog(t, S.ask + .8, S.ask + 1.4))); ctx.restore();
  // request packet
  travel(prog(t, S.ask + 1.4, S.ask + 2.6), PHONE.x + PHONE.w + 90, LANE, SERVER.x - 90, LANE, 'POST /messages', C.blue, { mono: true, sub: 'text: "hello!"', arc: 40, icon: bubbleIcon });
  // saved badge + reply
  const ok = prog(t, S.reply + .3, S.reply + .7);
  if (ok > 0) { ctx.save(); ctx.globalAlpha *= ok; pill(SERVER.x + SERVER.w / 2, SERVER.y - 50, 'saved', C.green, { size: 20, scale: backOut(ok) }); ctx.restore(); }
  travel(prog(t, S.reply + 1.0, S.reply + 2.2), SERVER.x - 90, LANE, PHONE.x + PHONE.w + 90, LANE, '201 Created', C.orange, { mono: true, arc: -40 });
  const tick = prog(t, S.reply + 2.2, S.reply + 2.6);
  if (tick > 0) { ctx.save(); ctx.globalAlpha *= tick; text('✓ delivered', PHONE.x + PHONE.w / 2, PHONE.y + PHONE.h - 50, 24, { w: 700, col: C.green }); ctx.restore(); }
}

boot({
  steps: STEPS,
  drawWorld,
  title: { kicker: 'What actually happens when you', parts: [['hit ', C.ink], ['send', C.blue, true], ['?', C.ink]], icon: bubbleIcon },
  end: { headline: 'One message, two tiny trips.', cta: 'Follow for more “what actually happens” explainers', icon: bubbleIcon },
  music: { plucksFrom: S.ask, hatsFrom: S.reply },
  sfx(add) {
    add(.06, 'pop');
    add(S.ask - .15, 'whooshSoft');
    add(S.ask + .4, 'thunk');
    add(S.ask + 1.4, 'whoosh');
    add(S.ask + 2.6, 'click');
    add(S.reply + .3, 'success');
    add(S.reply + 1.0, 'whooshSmallRev');
    add(S.reply + 2.2, 'chime', mtof(76));
    add(S.end + .2, 'pop');
    [65, 69, 72, 76].forEach((m, k) => add(S.end + .45 + k * .07, 'chime', mtof(m)));
  },
});
