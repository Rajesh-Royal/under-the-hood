# Engine API (engine.js)

`scenes.js` is a plain script loaded after `engine.js`. Everything below is global.

## Contents
1. Time model
2. Boot config
3. Helpers (math, drawing)
4. Layout zones and style
5. Sound names
6. Patterns

## 1. Time model

```js
defineScenes([
  { id: 'title', dur: 2.8 },                                        // title card (auto drawn from cfg.title)
  { id: 'dns', dur: 4.2, n: 1, cap: 'Short caption', sub: 'Subline' }, // n = step number in the tracker
  ...
  { id: 'end', dur: 3.4 },                                          // end card (auto drawn from cfg.end)
]);
```
- `S.<id>` is the **design** start time of a scene. Every draw function receives design time `t`.
- `timeline.js` (from `build_timeline.py`) gives each scene a real length of at least its design length. The engine maps real time to design time per scene (`warp`), so animations slow down evenly to fit the voice. Write animations at natural speed against `S.id + offset`.
- Use `prog(t, S.x + a, S.x + b)` to get a 0..1 progress. Anything gated on `t >= S.x + a` stays visible afterwards, which is how elements persist into later scenes.
- Sounds are scheduled in design time too, and the engine converts them (`unwarp`). They land exactly on the visual.
- The first scene must be the title and the last must have `id: 'end'` for the cards and tracker to work. The scene ids must match the `script.json` ids.

## 2. Boot config (end of scenes.js)

```js
boot({
  steps: ['DNS', 'Encrypt', ...],         // tracker labels, index = n - 1, also the end-card chips
  drawWorld(t) { ... },                    // draws inside the camera transform
  camera: t => ({ x: 0, z: 1 }),           // optional pan/zoom (x in world px, z zoom, optional y)
  title: { kicker: 'What actually happens when you',
           parts: [['type ', C.ink], ['“cookie”', C.orange, true], [' into Google?', C.ink]],  // true = underline sweep
           icon: (x, y, r, rot) => {...} },  // optional mascot drawn above the title and on the end card
  end: { headline: 'All of that in a fraction of a second.', cta: 'Follow for more ...', icon, chips },
  music: { plucksFrom: S.dns, hatsFrom: S.enter, hatsTo: S.end, bpm: 88, chords: [{ b: 41, n: [53, 57, 60, 64] }, ...] },
  sfx(add) { add(S.dns + 1.0, 'whooshSmall'); add(S.rank + 2.6, 'chime', mtof(72)); },
  drawOverlay(t, tReal) { ... },           // optional, drawn on top in screen space (before the end card)
});
```
The title card shows fully from frame 0, so it makes a good thumbnail, and pushes in slowly. The end card shows the headline, the step chips and the call to action.

## 3. Helpers

**Math:**
- `clamp`, `lerp`, `ease` (in-out cubic), `easeOut`, `backOut` (overshoot pop)
- `prog(t, a, b)`
- `bump(t, center, width)`: a triangle pulse, good for flashes
- `fadeIO(p)`: fades in and out over a 0..1 trip
- `mtof(midi)`, `PENTA` (pleasant pitches for ticks)

**Palette:** `C.bg`, `C.paper`, `C.ink`, `C.soft`, `C.faint`, `C.blue`, `C.orange`, `C.green`, `C.red`, `C.purple`, `C.lblue`, `C.lgreen`, `C.lorange`. Fonts are `SANS` and `MONO`. `font(size, weight, mono)`.

**Drawing:**

| Helper | What it does |
|---|---|
| `text(str, x, y, size, {w, col, align, mono})` | Text, vertically centred |
| `box(x, y, w, h, p, {title, sub, hl, r, mono})` | Labelled box that draws on with p. `hl` 0..1 adds a blue hit flash |
| `rr(x, y, w, h, r)` | Rounded-rect path. Then `ctx.fill()` or `ctx.stroke()` |
| `strokeReveal(x, y, w, h, r, p)` | Outline that draws itself on |
| `lineP(x1, y1, x2, y2, p)` | Line that grows. Set `ctx.strokeStyle` first. Use `setLineDash` for dashed lanes |
| `arrow(x1, y1, x2, y2, p, col, lw)` | Growing arrow |
| `pill(x, y, label, col, {size, sub, mono, alpha, scale, icon})` | Packet or tag. `sub` is a second line, like a header |
| `travel(p, x1, y1, x2, y2, label, col, {arc, ...pill opts})` | Pill flying A to B, faded at both ends. `arc` curves the path |
| `dot(x, y, r, col)` | Small token, good for tiny requests and replies |
| `rack(x, y, w, h, {reveal, lit, units})` | Server rack. `lit` turns the LEDs green |
| `lock(x, y, size, closed, col)` | Padlock. `closed` 0..1 drops the shackle |
| `magnifier(x, y, s, col)` | Search icon |
| `browserWindow(x, y, w, h, p, url)` | Line-art browser. Returns the content top y |
| `codeBlock(x, y, lines, p, {size, lineH, hl, w})` | Dark code panel that types in. `hl` highlights a line. Returns `{w, h}` |

For anything custom, draw with `ctx` directly. Wrap alpha changes in `ctx.save()` and `ctx.restore()`, and multiply `ctx.globalAlpha *= a` instead of setting it, so fades nest.

## 4. Layout zones and style

- The canvas is 1920x1080. The tracker uses y 40 to 120 and captions use y 860 to 1010. Keep world content in **y 150 to 800**.
- Use ink outlines of 3 to 3.5px on paper fill. Use colour only for meaning: blue goes out, orange comes back, green means safe or success, red means error.
- Keep text at least 16px at 1080p. Captions are 8 words or fewer, so they're readable on a phone.
- For a second place, add 1920 to x and pan with `camera`. See `camera()` in `assets/example-cookie/scenes.js`. That one pans over 1.1 design seconds with a slight zoom-out (`z = 1 - .07 * sin(pi * p)`).
- Persistent actors (browser, server) stay put across scenes. Viewers track them, so don't move them around.

## 5. Sound names (`add(designTime, name, k)`)

| Name | Use | k |
|---|---|---|
| `key`, `enterKey` | typing a letter, pressing enter | index for variety |
| `click` | lock, toggle, small mechanical | |
| `blipUp`, `blipDown` | tiny request out, tiny reply back | |
| `hopOut`, `hopIn` | quick hop to a node and back | pitch Hz |
| `whooshSmall`, `whooshSmallRev` | packet left to right, right to left | |
| `whoosh`, `whooshLong` | main request, forwarding far away | |
| `whooshBig` | camera pan or scene change | |
| `whooshSoft` | panel appears, scene enters | |
| `pop`, `popLow` | element pops in, arrival | |
| `thunk` | server reveal, packet lands on a server | |
| `boxIn` | box draws on | |
| `tick` | many small things lighting up (use PENTA pitches) | pitch Hz |
| `slide` | reordering or sorting | |
| `chime` | success or highlight (ascending chimes for top results) | pitch Hz |
| `success` | three-note "done" | |
| `error` | something fails | |

The music bed (pad, bass, plucks, offbeat hats) ducks under the voice automatically when rendering. Plucks start at `music.plucksFrom`, and hats run from `hatsFrom` to `hatsTo` to lift the energy in the middle section.

## 6. Patterns

**Request and response across a lane:**
```js
travel(prog(t, S.ask + 1.4, S.ask + 2.6), 650, 500, 1290, 500, 'GET /search?q=cookie', C.blue, { mono: true, sub: 'Cookie: lang=en' });
travel(prog(t, S.ask + 2.8, S.ask + 3.6), 1290, 500, 650, 500, '200 OK', C.orange, { mono: true });
```

**Typing with suggestions:** see `TYPE`, `typed(t)` and `suggestFor(t)` in the cookie example. The letters are a list of `{t, s, req}`, and the same list drives both the visuals and the `key` and `blip` sounds.

**Fan-out to many workers:** draw all the lines first, then the racks on top, then the dots. Stagger by column and row: `S.x + 1.6 + c * .06 + r * .03`. Use a `tick` per rack as it lights.

**Ranking or sorting:** keep each item's `initialSlot` and `finalSlot`, and set `y = lerp(slotY(init), slotY(final), ease(prog(...)))` with a small stagger. Add a `slide` sound at the start and chimes for the winners.

**Code walkthrough:** `codeBlock(x, y, lines, prog(t, S.x, S.x + 1.5), { hl })`. Move `hl` through the lines over time, and pair each highlighted line with a visual effect beside the panel.
