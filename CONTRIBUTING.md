# Adding a face, a style, a card, a surface, a line or an ornament

Everything Vitrine draws is one entry in a list, in its own file:

```
qml/js/parts/
├── Faces.js       clock faces (Plain, Flip, Nixie, Ornate, ...)
├── Dates.js       date and calendar styles (One line, Tear-off, Month, Moon, ...)
├── Meters.js      system styles (Rings, Bars, Gauges, ...)
├── Media.js       now playing styles (Cover, Vinyl, ...)
├── Notes.js       text styles (Quote, Headline, Terminal, ...)
├── Frames.js      the shapes of cards (Rounded, Arch, Cartouche, ...)
├── Surfaces.js    what a card is made of (Frost, Marble, Stained glass, ...)
├── Lines.js       the edge of a card (Solid, Rope, Gilded, ...)
└── Ornaments.js   decoration on a card (Studs, Fleurons, Laurels, ...)
```

Add your entry to the `list` in the right file and that's it. The settings tile,
its picture, the saved value, the hint and the drawing all come from the entry:
a style's tile is drawn by the style itself, with sample data. You don't touch
the panel, the settings or the desktop.

The order of `list` is the order of the tiles. Add new ones at the end, so the
tiles people know stay where they are.

## Steps

1. Add the entry (templates below).
2. Run the tests: `node tests/test_vitrine.js`. They check every entry: a
   unique key, a short label, no unknown or mistyped fields, and that it draws
   at many sizes, at odd times (midnight, a leap day, New Year's Eve), with
   seconds on and off and with odd data, with no bad numbers.
3. Try it: copy the plugin to `~/.config/omarchy/plugins/io.github.qempexe.vitrine`
   (it reloads by itself when its files change), pick your tile, and look at it
   on a dark and a light theme, with and without a card, small and big.
4. If the README counts them ("Twenty-five faces", "44 shapes", "one of 22 edge lines"), update the number.

## Rules

- `key` is what gets saved in people's settings: one camelCase word that never
  changes once released. A label can change; a key can't.
- `label` is the name on the tile, at most 14 characters.
- `about` is one short sentence. It shows under the tiles while your tile is the
  one picked. Leave it out if the label says it all.
- Draw with the colors you are given (`g.col(...)`, below), never colors of your
  own except black or white with some alpha for shine and shade, so it follows
  every theme and the light ones too.
- Use the fonts you are given: `g.font` (the one picked in Type), or
  `g.fonts.serif`, `.mono`, `.display`, `.script` when your style needs that kind.
- Keep it cheap: a style is drawn again each time what it shows changes (once a
  minute for most clocks). A few hundred path calls is fine; a loop over pixels
  is not.
- No randomness: the same moment always looks the same.
- ES6 JavaScript: `const` and `let`, and arrow functions for callbacks. The names a
  `.pragma library` file shares at its top level stay `var` (and `function`), because
  that is how QML sees them. No `String()`, `Number()` or `Object.` calls.

## A style: `g`

Every style draws one widget through `g` (built in `js/Stage.js`), in a box from
`(0, 0)` to `(g.w, g.h)`. The box has the style's own `aspect` (width / height),
stretched by the widget's Width setting.

| field | what it is |
| --- | --- |
| `ctx` | the Canvas 2D context |
| `w`, `h` | the box |
| `t` | the moment: `h m s ms frac y mo d wd doy week dim diy stamp` (`mo` from 0, `wd` 0 = Sunday, `frac` the part of the second) |
| `prev`, `a` | Flip-like faces: `a` goes from 0 to 1 after the time changes; `prevText(i)` is what hours (0), minutes (1) or seconds (2) said before |
| `o` | the widget's own settings: `o.seconds`, `o.h24`, `o.lead`, `o.blink`, `o.monday`, `o.metrics`, ... |
| `data` | what the kind brings (below) |
| `col(name, alpha)` | a color as css: `"ink"` (text), `"accent"`, `"accent2"`, `"bg"` (the card) |
| `c` | the same colors as `[r, g, b]`, for `D.mix` |
| `bg` | true when the widget sits on a card |
| `font`, `weight`, `fonts` | the font picked, its weight (100 to 900), and the others |
| `sweep` | true when a second hand should glide (use `t.frac`) |
| `names.day(i, short)`, `names.month(i, short)` | in the user's language |

What `data` holds:

| kind | `data` |
| --- | --- |
| clock, date | nothing: it's all in `t` |
| system | `meters`: `[{ key, label, frac (0 to 1, or -1), text, detail, history }]` |
| media | `{ has, title, artist, album, art (a url once loaded, else ""), pos, len, playing, player }` |
| text | `{ main, sub, big, unit, mode }` |

`js/Draw.js` (imported as `D`) has the tools the styles share: `D.text(ctx, str,
x, y, { px, weight, family, italic, align, base, color, spacing })`,
`D.fit(ctx, str, maxW, maxPx, weight, family)` for the biggest size that fits,
`D.width`, `D.roundRect`, `D.circle`, `D.arc` (0 = the top, 1 = all the way
round), `D.hand`, `D.ticks`, `D.onDial`, `D.seg7` (seven segment digits),
`D.dotGlyph` (5 x 7 dots), `D.pad2`, `D.hour12`, `D.roman`, `D.ordinal`,
`D.ordinalWord`, `D.timeWords`, `D.roughWords`, `D.mix`, `D.rgba`, `D.ease`.

A clock face, in `Faces.js`:

```js
{ key: "ledger", label: "Ledger", about: "Ledger writes the time like a sum in an old account book.",
  aspect: 2.8, seconds: false,
  draw(g) {
      const ctx = g.ctx, str = hh(g) + ":" + mm(g);
      const px = D.fit(ctx, str, g.w * 0.9, g.h * 0.7 / 0.74, 400, g.fonts.serif);
      D.text(ctx, str, g.w / 2, g.h / 2 + px * 0.33, { px, weight: 400, family: g.fonts.serif, base: "alphabetic", color: g.col("ink") });
      ctx.fillStyle = g.col("accent");
      ctx.fillRect(g.w * 0.08, g.h * 0.86, g.w * 0.84, Math.max(1, g.h * 0.015));
      ctx.fillRect(g.w * 0.08, g.h * 0.9, g.w * 0.84, Math.max(1, g.h * 0.015));
  } },
```

`hh(g)`, `mm(g)` and `ss(g)` at the top of `Faces.js` give the hours (12 or 24,
with or without the zero, as the widget says), the minutes and the seconds.

The entry fields of a style:

| field | |
| --- | --- |
| `aspect` | width / height. A number, or `function (o, n)` when it depends on the options (`o.seconds`) or, for system styles, on how many readings there are (`n`) |
| `seconds: false` | clocks: the face never shows seconds (the setting is greyed out) |
| `sweep: true` | clocks: the second hand can glide |
| `animMs: 500` | clocks: animate for this long after the time changes (`g.a` goes 0 to 1) |

Date, system, media and text styles are the same, in their own file, with
`aspect` and `draw`.

## A card: `Frames.js`

A card's shape is one closed path:

```js
{ key: "lozenge", label: "Lozenge", about: "Lozenge is a diamond on its side.",
  inner: { l: 0.18, r: 0.18, t: 0.12, b: 0.12 },
  path(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2);
      ctx.closePath();
  } },
```

| field | |
| --- | --- |
| `path(ctx, x, y, w, h, r, o)` | the outline, `beginPath` to `closePath`. `r` is the Roundness setting in pixels, `o` is `{ dir, flat }` from Pointing and Square corners |
| `inner` | extra room inside on each side, as a part of the card's size, so the widget stays clear of points and curves |
| `round: true` | the card stays square, for circles |
| `noCard: true` | no card at all (No card) |
| `pointing: true`, `flatCorners: true` | the Pointing or the Square corners setting changes it, so the setting shows |
| `sides(w, h)` | extra room in pixels inside the left and the right side, for ends that come in deep |
| `afterFill(g)`, `onTop(g)` | drawing right after the fill, or on top of everything (Folded corner's flaps, Scroll's curls) |
| `spots(x, y, w, h, s)` | where ornaments sit, when the shape's corners aren't the box's: `{ corners: [tl, tr, br, bl], mids: [top, right, bottom, left] }`, each `{ x, y, dx, dy }` with `dx`, `dy` the way inward (-1, 0 or 1). `boxSpots` and `ellipseSpots` at the top of the file do most of the work |

Lines follow your path by themselves, and ornaments sit on your spots.

### A shape from its ends

Most shapes only differ at their left and right ends. Those are written as one end,
in `forms` further down the file: a list of points for the LEFT end, measured inward
from it (`u` how far in, `v` from 0 at the top to `h` at the bottom, walked from
the bottom up), with a link between each two points: `null` for a straight line,
`{ q: [u, v] }` for a curve pulled toward a point, `{ arc: [u, v], r }` for a round
corner. The right end is the same list, mirrored. Then the shape is one entry in
`ended`:

```js
// a form: a deep V cut into the end
vee(T, L) { const d = Math.min(T * 0.6, L / 4); return { pts: [[0, T], [d, T / 2], [0, 0]], links: [null, null] }; },

// and the shape that uses it on both sides
{ key: "vee", label: "Vee", about: "Vee cuts a deep V into each end.", form: fixed("vee"), sides: room(0.7) },
```

`form(side, dir)` picks the form for each side (`"L"` or `"R"`) and the Pointing
setting (`"right"`, `"left"`, `"both"`): `leaning(...)` and `pointed(...)` do the
usual ones, with `pointing: true`. Ends never come in deeper than `endDepth(h)`,
so they suit a short date line and a tall calendar alike, and their spots move in
past them by themselves.

## A surface, a line, an ornament: `g` for cards

Cards are painted by `js/Card.js`, through a `g` of their own:

| field | what it is |
| --- | --- |
| `dir` | the Pointing setting, for surfaces with `leans: true` |
| `ctx`, `p` | the context, and everything the card was given (`p.fill`, `p.line`, `p.mark` the accent, `p.light`, `p.dark`, `p.frameColors`, `p.velvetSheen`, ...) |
| `x0`, `y0`, `x1`, `y1`, `L`, `T`, `r` | the card's box, its width and height, its roundness |
| `outline(x, y, w, h, r)` | puts the card's shape on `ctx`, at any box |
| `edge(inset)` | the card's shape moved `inset` pixels inward, ready to stroke |
| `along(inset, step, fn)` | walks round that shape: `fn(x, y, tx, ty, nx, ny, i, n)` at `n` points about `step` apart, with the way it runs and the way inward (Wavy, Chain, Pearls) |
| `trace(inset)`, `walkTrace(tr, step, fn)` | the same in two steps, when you need the length first (`tr.len`) |
| `lw`, `lwN`, `lineStyle` | the line width (0 = off), at least 1, the line color or gradient |
| `mw`, `markStyle`, `tone` | the accent's width and color; `tone` is always a usable color |
| `spots`, `s` | where ornaments go (above), and a good size for one |
| `hash(k, seed)`, `seed` | a steady pseudo random number from 0 to 1 |
| `volute(cx, cy, size, side, color)`, `texture(...)` | an old style curl; stripes, dots or a grid |

A surface, in `Surfaces.js` (all hooks optional; with none it's a plain fill):

```js
{ key: "linen", label: "Linen", about: "Linen has a fine weave.",
  inside(g) {      // clipped to the card, after the fill
      const ctx = g.ctx;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = g.x0; x < g.x1; x += 3) { ctx.moveTo(x, g.y0); ctx.lineTo(x, g.y1); }
      for (let y = g.y0; y < g.y1; y += 3) { ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); }
      ctx.stroke();
  } },
```

The hooks run in this order: `base(g)` (may move `y0`, `T`, `y1`), `fillStyle(g,
style)` (returns what the card is filled with), `afterFill(g)`, `inside(g)`
(clipped), `outside(g)`. The flags: `fill` (0 to 1), `solid: false`, `noFill`,
`noGradient`, `noTexture`, `noDepth`, `ownShadow`.

A line, in `Lines.js`:

```js
{ key: "dashes", label: "Long dashes",
  draw(g) {
      if (!g.p.line) return;
      const ctx = g.ctx;
      ctx.save();
      ctx.lineWidth = g.lwN; ctx.strokeStyle = g.lineStyle;
      ctx.setLineDash([g.lwN * 8, g.lwN * 4]);
      g.edge(g.lwN / 2);
      ctx.stroke();
      ctx.restore();
  } },
```

Flags: `usesColor: false` (it draws in the accent: the line color setting greys
out), `usesWidth: false`, `glow: true` (the card glows in the accent).

An ornament, in `Ornaments.js`:

```js
{ key: "pins", label: "Pins", about: "Pins hold the card up at its two top corners.",
  draw(g) {
      const ctx = g.ctx, c = g.spots.corners;
      ctx.fillStyle = g.markStyle || g.tone;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(c[i].x, c[i].y, g.s * 0.45, 0, Math.PI * 2); ctx.fill(); }
  } },
```

Note Qt's `ctx.ellipse(x, y, w, h)` takes the box around the ellipse, not the
browser's center and radii.

## A new kind of widget

A kind (clock, date, system, media, text) is a bit more than one entry, because
it brings its own data:

1. Make its catalog of styles in `qml/js/parts/`, like `Notes.js`.
2. Add it to `list` in `qml/js/Kinds.js`: a key, a label, the catalog, a size,
   and its settings (`common(...)` gives every kind the same place and look
   settings; add your own after it).
3. Give its styles their `g.data` in `dataFor()` in `qml/desk/WidgetView.qml`,
   and say when it has to be painted again in `stamp` there. If it needs
   reading from the computer, put that in `qml/core/`, start it only while such a
   widget is on the desktop (see `systemWidgets` in `Service.qml`), and prefer
   signals and file watches to timers.
4. Add sample data for its tiles in `qml/panel/TileArt.qml`, and for the tests
   in `dataFor()` in `tests/test_vitrine.js`.

## Tests

```bash
node tests/test_vitrine.js
```

They need nothing but node. If a test names your entry, it tells you what is
wrong with it.
