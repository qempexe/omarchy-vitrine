// node tests/test_vitrine.js
const fs = require("fs"), path = require("path"), assert = require("assert")

// loads the plugin's JavaScript files the way QML does: .pragma and .import lines
// out, the files a file imports handed to it by name
const cache = {}
function load(file) {
  if (cache[file]) return cache[file]
  const src = fs.readFileSync(path.join(__dirname, "../qml/js", file), "utf8")
  const names = [], deps = []
  src.replace(/^\.import "([^"]+)" as (\w+)$/mg, (m, f, n) => { names.push(n); deps.push(load(path.join(path.dirname(file), f))) })
  const body = src.replace(".pragma library", "").replace(/^\.import .*$/mg, "")
  const exported = [...new Set([...body.matchAll(/^(?:function|var) (\w+)/mg)].map(m => m[1]))]
  const mod = new Function("console", ...names, body + "; return {" + exported.join(",") + "};")(console, ...deps)
  cache[file] = mod
  return mod
}
const Schema = load("Schema.js"), Kinds = load("Kinds.js"), Look = load("Look.js"), Card = load("Card.js")
const Stage = load("Stage.js"), Sys = load("Sys.js"), Check = load("Check.js"), Draw = load("Draw.js"), Screens = load("Screens.js"), Trace = load("Trace.js")
const Parts = {
  Frames: load("parts/Frames.js"), Surfaces: load("parts/Surfaces.js"), Lines: load("parts/Lines.js"),
  Ornaments: load("parts/Ornaments.js"), Faces: load("parts/Faces.js"), Dates: load("parts/Dates.js"),
  Meters: load("parts/Meters.js"), Media: load("parts/Media.js"), Notes: load("parts/Notes.js")
}

let n = 0
function t(name, fn) { fn(); n++; console.log("  ok   " + name) }

// a canvas that only records calls, and refuses bad numbers
function fakeCtx() {
  const calls = []
  const rec = name => (...a) => { for (const v of a) if (typeof v === "number" && !isFinite(v)) throw new Error(name + " got " + v); calls.push(name) }
  const grad = () => ({ addColorStop: rec("stop") })
  const ctx = { calls, createLinearGradient: (...a) => { rec("linear")(...a); return grad() }, createRadialGradient: (...a) => { rec("radial")(...a); return grad() },
                measureText: s => ({ width: ("" + s).length * 7 }), setLineDash: rec("dash") }
  for (const k of ["reset", "save", "restore", "translate", "transform", "rotate", "scale", "beginPath", "moveTo", "lineTo", "arcTo", "arc", "rect",
                   "quadraticCurveTo", "bezierCurveTo", "ellipse", "closePath", "fill", "stroke", "clip", "fillRect", "fillText", "drawImage"]) ctx[k] = rec(k)
  return ctx
}

// ---- the catalogs -------------------------------------------------------------------

const FIELDS = {
  Frames: { label: "string", about: "string", path: "function", inner: "object", noCard: "boolean", round: "boolean", spots: "function",
            pointing: "boolean", flatCorners: "boolean", sides: "function", afterFill: "function", onTop: "function", form: "function", minRoom: "number" },
  Surfaces: { label: "string", about: "string", fill: "number", solid: "boolean", noFill: "boolean", noGradient: "boolean",
              noTexture: "boolean", noDepth: "boolean", leans: "boolean", ownShadow: "boolean",
              base: "function", fillStyle: "function", afterFill: "function", inside: "function", outside: "function" },
  Lines: { label: "string", about: "string", usesColor: "boolean", usesWidth: "boolean", glow: "boolean", draw: "function" },
  Ornaments: { label: "string", about: "string", draw: "function" },
  Faces: { label: "string", about: "string", aspect: "number|function", seconds: "boolean", sweep: "boolean", animMs: "number", draw: "function" },
  Dates: { label: "string", about: "string", aspect: "number|function", draw: "function" },
  Meters: { label: "string", about: "string", aspect: "number|function", draw: "function" },
  Media: { label: "string", about: "string", aspect: "number|function", draw: "function" },
  Notes: { label: "string", about: "string", aspect: "number|function", draw: "function" }
}
for (const kind in Parts) t("every entry in parts/" + kind + ".js is well formed", () => {
  const m = Parts[kind], seen = new Set()
  assert.ok(Array.isArray(m.list) && m.list.length > 0, kind + ": list is empty")
  for (const e of m.list) {
    const at = kind + " entry " + JSON.stringify(e.key)
    assert.ok(typeof e.key === "string" && /^[a-z][A-Za-z0-9]*$/.test(e.key), at + ": key should be a short camelCase word")
    assert.ok(!seen.has(e.key), at + ": key used twice"); seen.add(e.key)
    assert.ok(typeof e.label === "string" && e.label.length > 0 && e.label.length <= 14, at + ": label missing or longer than 14")
    for (const f in e) {
      if (f === "key") continue
      assert.ok(f in FIELDS[kind], at + ": unknown field " + f + " (a typo, or a field nothing reads)")
      assert.ok(FIELDS[kind][f].split("|").includes(typeof e[f]), at + ": " + f + " should be a " + FIELDS[kind][f])
    }
    if (kind !== "Lines" && kind !== "Ornaments" && kind !== "Surfaces" && kind !== "Frames") assert.strictEqual(typeof e.draw, "function", at + ": needs draw")
    assert.strictEqual(m.byKey[e.key], e, at + ": missing from byKey")
  }
})
t("lines and ornaments start with a none that draws nothing", () => {
  for (const k of ["Lines", "Ornaments"]) {
    assert.strictEqual(Parts[k].list[0].key, "none")
    assert.ok(!Parts[k].list[0].draw)
    for (const e of Parts[k].list.slice(1)) assert.ok(e.draw, k + " " + e.key + " needs draw")
  }
})

// ---- every style draws, at many sizes, with odd options too ------------------------------

const COLORS = { ink: [234, 219, 200], accent: [200, 146, 90], accent2: [122, 162, 247], bg: [29, 21, 16] }
const FONTS = { sans: "Inter", serif: "Playfair Display", mono: "JetBrains Mono", display: "Bebas Neue", script: "UnifrakturMaguntia" }
const MOMENTS = [new Date(2026, 9, 16, 10, 8, 37), new Date(2026, 0, 1, 0, 0, 0), new Date(2028, 1, 29, 23, 59, 59), new Date(2026, 11, 31, 12, 30, 0)]
const METERS = [{ key: "cpu", label: "CPU", frac: 0.4, text: "40%", detail: "", history: [0.1, 0.5, 0.9] },
                { key: "bat", label: "Battery", frac: -1, text: "none", detail: "", history: [] },
                { key: "net", label: "Network", frac: 1, text: "9 MB/s", detail: "x", history: [] }]
function dataFor(kind, w, t, i) {
  if (kind === "system") return { meters: METERS.slice(0, 1 + (i % 3)) }
  if (kind === "media") return i % 2 ? { has: false } : { has: true, title: "A very long title that goes on and on", artist: "Someone", art: i % 4 ? "" : "file:///a.png", pos: 30, len: i % 3 ? 200 : 0, playing: true }
  if (kind === "text") return Kinds.noteData(Object.assign({}, w, { mode: ["note", "quote", "greeting", "countdown", "since"][i % 5], text: i % 7 ? "Words | More words — Me" : "", when: "2027-01-01 10:00" }), MOMENTS[i % MOMENTS.length], t.doy)
  return {}
}
for (const kind of Kinds.list) t("every " + kind.key + " style draws without bad numbers", () => {
  let i = 0
  for (const st of kind.styles.list) {
    for (const [w, h] of [[300, 120], [40, 40], [900, 260], [1, 1]]) {
      for (const sec of [false, true]) {
        const ctx = fakeCtx(), at = MOMENTS[i % MOMENTS.length]
        const wgt = Kinds.make(kind.key, "w1", { style: st.key, seconds: sec, h24: i % 2 === 0, blink: true })
        const t = Stage.timeParts(at, i % 3 === 0 ? 540 : null)
        const g = Stage.build(ctx, w, h, { t, a: (i % 4) / 3, o: wgt, c: COLORS, card: i % 2 === 1, font: "Inter", weight: 100 + (i % 9) * 100,
                                         fonts: FONTS, sweep: sec, data: dataFor(kind.key, wgt, t, i), prevTexts: ["09", "59", "58"] })
        st.draw(g)
        const empty = kind.key === "text" && !g.data.main && !g.data.big
        assert.ok(ctx.calls.length > 0 || w < 2 || empty, kind.key + " " + st.key + " drew nothing")
        i++
      }
    }
    const a = Kinds.aspectOf(Kinds.make(kind.key, "w1", { style: st.key }))
    assert.ok(a > 0.1 && a < 12, kind.key + " " + st.key + " aspect " + a)
  }
})

// ---- cards: every frame with every surface, line and ornament ---------------------------

t("every card draws, every frame with every surface, line and ornament", () => {
  const cfg = Schema.resolve({})
  const th = { fg: [234, 219, 200], barText: [234, 219, 200], accent: [200, 146, 90], urgent: [210, 120, 80], bg: [29, 21, 16], palette: ["#ff0000", "#00ff00"], borders: ["#1ee9d6", "#fe4fb6"], borderAngle: 45 }
  let k = 0
  for (const f of Parts.Frames.list) for (const s of Parts.Surfaces.list) {
    const l = Parts.Lines.list[k % Parts.Lines.list.length].key, o = Parts.Ornaments.list[k % Parts.Ornaments.list.length].key
    const c = Object.assign({}, cfg, { frame: f.key, surface: s.key, lines: l, ornaments: o, fill: ["solid", "gradient", "glass"][k % 3],
                                       pattern: ["none", "stripes", "dots", "grid"][k % 4], depth: ["flat", "raised", "sunken"][k % 3],
                                       border: ["subtle", "text", "accent", "border"][k % 4], outlineGradient: k % 2 === 0 })
    const colors = Look.colorsFor(c, th, { card: "auto" }, k, 0.3)
    for (const [w, h] of [[260, 140], [60, 300], [24, 24]]) Card.paint(fakeCtx(), Look.cardParams(c, th, colors, w, h, 12))
    k++
  }
  for (const f of Parts.Frames.list) {
    const sp = f.spots ? f.spots(0, 0, 200, 120, 8) : Parts.Frames.boxSpots(0, 0, 200, 120, 8)
    assert.ok(sp.corners.length === 4 && sp.mids.length === 4, f.key + ": spots need 4 corners and 4 middles")
    for (const p of sp.corners.concat(sp.mids)) assert.ok(isFinite(p.x) && isFinite(p.y) && [-1, 0, 1].includes(p.dx) && [-1, 0, 1].includes(p.dy), f.key)
  }
})

t("every line and ornament follows every shape, pointing every way", () => {
  const cfg = Schema.resolve({})
  const th = { fg: [234, 219, 200], barText: [234, 219, 200], accent: [200, 146, 90], urgent: [210, 120, 80], bg: [29, 21, 16], palette: ["#ff0000"], borders: ["#1ee9d6"], borderAngle: 0 }
  const dirs = ["right", "left", "both"], flats = ["none", "top", "bottom"]
  let k = 0
  for (const f of Parts.Frames.list) {
    for (const l of Parts.Lines.list) {
      const o = Parts.Ornaments.list[k % Parts.Ornaments.list.length].key
      const c = Object.assign({}, cfg, { frame: f.key, surface: "filled", lines: l.key, ornaments: o, pointing: dirs[k % 3], flatCorners: flats[k % 3],
                                         railSide: ["bottom", "top", "both", "left", "right"][k % 5], fill: "gradient", gradientTo: ["accent", "palette", "border", "lighter", "darker"][k % 5],
                                         gradientDir: k % 2 ? "down" : "corner" })
      const colors = Look.colorsFor(c, th, { card: "auto" }, k, 0.3)
      for (const [w, h] of [[260, 140], [90, 300], [24, 24]]) {
        const ctx = fakeCtx()
        Card.paint(ctx, Look.cardParams(c, th, colors, w, h, 12))
        if (!f.noCard && w > 30 && l.key !== "none") assert.ok(ctx.calls.filter(n => n === "stroke" || n === "fillRect" || n === "fill").length > 1, f.key + " + " + l.key + " drew no line")
      }
      k++
    }
    for (const o of Parts.Ornaments.list) {
      const c = Object.assign({}, cfg, { frame: f.key, ornaments: o.key, pointing: dirs[k++ % 3] })
      Card.paint(fakeCtx(), Look.cardParams(c, th, Look.colorsFor(c, th, { card: "auto" }, 0, 0.5), 220, 120, 12))
    }
  }
})
t("outlines trace into closed rings, and the widget fits inside every shape", () => {
  for (const f of Parts.Frames.list) for (const dir of ["right", "left", "both"]) {
    const tr = Trace.trace(c => f.path(c, 10, 10, 300, 120, 14, { dir, flat: "none" }))
    assert.ok(tr.pts.length >= 4 && tr.len > 300, f.key + " " + dir + ": traced " + tr.pts.length + " points, " + tr.len)
    for (const p of tr.pts) assert.ok(p[0] >= 10 - 40 && p[0] <= 310 + 40 && p[1] >= 10 - 40 && p[1] <= 130 + 40, f.key + ": point far outside " + p)
    let n = 0
    Trace.walk(tr, 10, (x, y, tx, ty, nx, ny) => { n++; assert.ok(isFinite(x + y + tx + ty + nx + ny)) })
    assert.ok(n >= 3, f.key)
    // inward points into the card: one step in from the top middle is lower down
    const cfg = Schema.resolve({ frame: f.key })
    const box = Look.boxOf(cfg, Kinds.make("date", "w1"))
    assert.ok(box.content.w > 0 && box.content.h > 0 && box.w >= box.content.w && box.h >= box.content.h, f.key + " box")
  }
  const ring = Trace.trace(c => { c.beginPath(); c.arc(50, 50, 40, 0, Math.PI * 2, false); c.closePath() })
  assert.ok(Math.abs(ring.len - 2 * Math.PI * 40) < 2, "circle length " + ring.len)
  const rr = Trace.trace(c => Parts.Frames.byKey.rounded.path(c, 0, 0, 100, 50, 10, {}))
  assert.ok(Math.abs(rr.len - (2 * 80 + 2 * 30 + 2 * Math.PI * 10)) < 2, "rounded length " + rr.len)
  let inward = null
  Trace.walk(Trace.trace(c => Parts.Frames.byKey.square.path(c, 0, 0, 100, 50, 0, {})), 5, (x, y, tx, ty, nx, ny) => { if (inward === null && y === 0 && x > 20) inward = ny })
  assert.strictEqual(inward, 1, "inward on the top edge points down")
})

// ---- settings -----------------------------------------------------------------------

t("every setting key is used once, and defaults resolve", () => {
  const seen = new Set()
  for (const g of Schema.groups) for (const it of g.items) { assert.ok(!seen.has(it.key), it.key + " twice"); seen.add(it.key) }
  const c = Schema.resolve({})
  for (const k of Schema.settingKeys) assert.ok(k in c, k)
  assert.ok(c.widgets.length >= 1)
})
t("odd values in settings.json fall back instead of breaking", () => {
  const c = Schema.resolve({ frame: "nope", weight: "x", widgets: [{ id: "w1", kind: "clock", size: -5, x: "<b>" }, { id: "bad", kind: "clock" },
                                                                   { id: "w2", kind: "virus" }, null, 7, { id: "w1", kind: "date" }],
                            savedLooks: "no", customBg: "red", __proto__: { enabled: false } })
  assert.strictEqual(c.frame, "none"); assert.strictEqual(c.weight, 300); assert.strictEqual(c.customBg, "#141414")
  assert.strictEqual(c.widgets.length, 1); assert.strictEqual(c.widgets[0].size, 30); assert.strictEqual(c.widgets[0].x, 500)
  assert.strictEqual(c.savedLooks.length, Schema.LOOK_SLOTS)
  const many = []; for (let i = 0; i < 50; i++) many.push({ id: "w" + (i + 1), kind: "text" })
  assert.strictEqual(Schema.resolve({ widgets: many }).widgets.length, Kinds.MAX_WIDGETS)
  assert.strictEqual(Check.value({ kind: "screen", fallback: "" }, "HDMI-A-1"), "HDMI-A-1")
  assert.strictEqual(Check.value({ kind: "screen", fallback: "" }, "a b; rm"), "")
  assert.strictEqual(Check.value({ kind: "font", fallback: "Inter" }, "Fira Code"), "Fira Code")
  assert.strictEqual(Check.value({ kind: "font", fallback: "Inter" }, "x'); evil"), "Inter")
})
t("every ready made look only sets real settings to values they accept", () => {
  assert.strictEqual(Schema.presets.length, 16)
  for (const p of Schema.presets) {
    for (const k in p.set) assert.ok(Schema.isSetting(k), p.key + " " + k)
    const look = Schema.cleanLook(p.set)
    for (const k in p.set) if (k !== "widgets") assert.deepStrictEqual(look[k], p.set[k], p.key + " " + k)
    assert.strictEqual(look.widgets.length, p.set.widgets.length, p.key + " lost a widget")
    for (const w of look.widgets) {
      const b = Look.boxOf(Object.assign(Schema.resolve({}), look), w)
      assert.ok(b.w > 10 && b.h > 10, p.key + " " + w.id)
    }
  }
})
t("a look round trips through export and import", () => {
  const c = Schema.resolve({ frame: "ogee", widgets: [Kinds.make("clock", "w3", { style: "nixie", zone: "Asia/Tokyo" })] })
  const back = Schema.parseLook(JSON.stringify(Schema.lookOf(c)))
  assert.strictEqual(back.frame, "ogee"); assert.strictEqual(back.widgets[0].zone, "Asia/Tokyo")
  assert.ok(!("panelOpacity" in back) && !("enabled" in back))
  assert.strictEqual(Schema.parseLook("{nope"), null); assert.strictEqual(Schema.parseLook("[]"), null)
})

// ---- the bits in between --------------------------------------------------------------

t("time parts, weeks and zones", () => {
  const a = Stage.timeParts(new Date(2026, 9, 16, 16, 7, 5))
  assert.strictEqual(a.week, 42); assert.strictEqual(a.doy, 289); assert.strictEqual(a.dim, 31)
  assert.strictEqual(Stage.timeParts(new Date(2021, 0, 3)).week, 53)
  assert.strictEqual(Stage.timeParts(new Date(2027, 0, 4)).week, 1)
  const utc = new Date(Date.UTC(2026, 9, 16, 12, 0)), tokyo = Stage.timeParts(utc, 540)
  assert.strictEqual(tokyo.h, 21)
})
t("words for the time", () => {
  assert.strictEqual(Draw.roughWords(16, 28), "almost half past four")
  assert.strictEqual(Draw.roughWords(11, 59), "almost twelve o'clock")
  assert.deepStrictEqual(Draw.timeWords(16, 45), { lead: "It's", main: "quarter to", hour: "five" })
  assert.strictEqual(Draw.ordinalWord(22), "twenty-second"); assert.strictEqual(Draw.roman(1987), "MCMLXXXVII")
})
t("what text widgets say", () => {
  const now = new Date(2026, 9, 16, 16, 7)
  assert.strictEqual(Kinds.noteData({ mode: "countdown", when: "2027-01-01", text: "until", unit: "auto" }, now, 1).big, "76")
  assert.strictEqual(Kinds.noteData({ mode: "countdown", when: "2026-10-17 16:07", unit: "auto" }, now, 1).unit, "hours")
  assert.strictEqual(Kinds.noteData({ mode: "countdown", when: "2020-01-01", done: "Done" }, now, 1).main, "Done")
  assert.strictEqual(Kinds.noteData({ mode: "countdown", when: "soon" }, now, 1).big, "")
  assert.strictEqual(Kinds.noteData({ mode: "since", when: "2026-10-01", unit: "full" }, now, 1).big, "15d 16h 7m")
  assert.strictEqual(Kinds.noteData({ mode: "greeting", line2: "Ana" }, new Date(2026, 1, 1, 8), 1).main, "Good morning, Ana")
  const q = Kinds.noteData({ mode: "quote", text: "One — A | Two - B" }, now, 3)
  assert.deepStrictEqual([q.main, q.sub], ["Two", "B"])
})
t("system readings from /proc", () => {
  const a = Sys.parse("@@stat\ncpu 100 0 100 800 0 0 0 0\ncpu0 1\ncpu1 1\n@@meminfo\nMemTotal: 1000 kB\nMemAvailable: 250 kB\n@@uptime\n90061.5 1\n@@netdev\n lo: 5 0 0 0 0 0 0 0 5\neth0: 1000 0 0 0 0 0 0 0 500\n@@temp\n54000", 0)
  const b = Sys.parse("@@stat\ncpu 200 0 200 900 0 0 0 0\n@@meminfo\nMemTotal: 1000 kB\nMemAvailable: 250 kB\n@@netdev\neth0: 3048 0 0 0 0 0 0 0 1524", 1000)
  const d = Sys.delta(a, b)
  assert.ok(Math.abs(d.cpu - 2 / 3) < 1e-9); assert.strictEqual(d.netRate, 3072)
  const m = Sys.meters({ cur: a, d, disks: { "/": { used: 5, total: 10 } }, hist: {} }, ["mem", "temp", "up", "disk", "bat"], { path: "/" })
  assert.deepStrictEqual(m.map(x => x.text), ["75%", "54°C", "1d 1h", "50%", "none"])
  assert.strictEqual(Sys.parse("garbage", 0).memTotal, 0)
  assert.deepStrictEqual(Sys.parseDf("Filesystem 1-blocks Used\n/dev/x 200 50 150 25% /"), { used: 50, total: 200 })
})
t("colors follow the scheme, and stay readable on cards", () => {
  const cfg = Schema.resolve({ frame: "rounded" })
  const th = { fg: [20, 20, 20], barText: [20, 20, 20], accent: [200, 146, 90], urgent: [1, 2, 3], bg: [25, 25, 25], palette: ["#ff0000", "#00ff00", "#0000ff"], borders: ["#000000", "#ffffff"] }
  assert.deepStrictEqual(Look.colorsFor(cfg, th, { card: "auto" }, 0, 0.5).ink, [245, 245, 245])
  assert.deepStrictEqual(Look.colorsFor(Object.assign({}, cfg, { colorMode: "palette" }), th, { card: "auto" }, 4, 0.5).accent, [0, 255, 0])
  assert.deepStrictEqual(Look.colorsFor(Object.assign({}, cfg, { colorMode: "borders" }), th, { card: "auto" }, 0, 0).accent, [0, 0, 0])
  assert.deepStrictEqual(Look.colorsFor(cfg, th, { card: "auto", accent: "3" }, 0, 0).accent, [0, 0, 255])
  assert.strictEqual(Look.colorsFor(cfg, th, { card: "none" }, 0, 0).card, false)
})
t("widgets on more than one screen", () => {
  const names = ["DP-1", "HDMI-A-1"]
  const list = [{ name: "DP-1", x: 0, y: 0, w: 2560, h: 1440 }, { name: "HDMI-A-1", x: 2560, y: 200, w: 1920, h: 1080 }]
  assert.strictEqual(Screens.mainOf("", names), "DP-1")
  assert.strictEqual(Screens.mainOf("HDMI-A-1", names), "HDMI-A-1")
  assert.strictEqual(Screens.mainOf("eDP-1", names), "DP-1")          // picked, but unplugged
  assert.strictEqual(Screens.mainOf("", []), "")
  const main = "DP-1"
  assert.strictEqual(Screens.placeOf({ screen: "" }, names, main, "main"), "DP-1")
  assert.strictEqual(Screens.placeOf({ screen: "*" }, names, main, "main"), "*")
  assert.strictEqual(Screens.placeOf({ screen: "HDMI-A-1" }, names, main, "main"), "HDMI-A-1")
  assert.strictEqual(Screens.placeOf({ screen: "eDP-1" }, names, main, "main"), "DP-1")
  assert.strictEqual(Screens.placeOf({ screen: "eDP-1" }, names, main, "hide"), "")
  assert.ok(Screens.shows({ screen: "*" }, "HDMI-A-1", names, main, "main"))
  assert.ok(!Screens.shows({ screen: "" }, "HDMI-A-1", names, main, "main"))
  assert.ok(!Screens.shows({ screen: "eDP-1" }, "DP-1", names, main, "hide"))
  assert.ok(Screens.lost({ screen: "eDP-1" }, names) && !Screens.lost({ screen: "*" }, names) && !Screens.lost({ screen: "" }, names))
  assert.strictEqual(Screens.nextOf({ screen: "" }, names, main), "HDMI-A-1")
  assert.strictEqual(Screens.nextOf({ screen: "HDMI-A-1" }, names, main), "DP-1")
  assert.strictEqual(Screens.nextOf({ screen: "" }, ["DP-1"], main), "")
  assert.strictEqual(Screens.at(list, 3000, 600), "HDMI-A-1")
  assert.strictEqual(Screens.at(list, 3000, 100), "")                  // above the second screen
  assert.deepStrictEqual(Screens.carry(list[0], list[1], 2560 + 960, 200 + 540), { x: 500, y: 500 })
  assert.deepStrictEqual(Screens.carry(list[0], list[1], 9999, -50), { x: 1000, y: 0 })
  assert.strictEqual(Screens.savedAs({ screen: "HDMI-A-1" }, "DP-1", main), "")
  assert.strictEqual(Screens.savedAs({ screen: "" }, "HDMI-A-1", main), "HDMI-A-1")
  assert.strictEqual(Screens.savedAs({ screen: "*" }, "HDMI-A-1", main), "*")
  assert.strictEqual(Screens.scaleFor("fixed", 2160), 1)
  assert.strictEqual(Screens.scaleFor("screen", 2160), 2)
  assert.strictEqual(Screens.scaleFor("screen", NaN), 1)
  const w = Kinds.make("clock", "w1"), cfg = Schema.resolve({ frame: "rounded" })
  const a = Look.boxOf(cfg, w), b = Look.boxOf(cfg, w, 2)
  assert.ok(Math.abs(b.w - 2 * a.w) < 1e-6 && Math.abs(b.h - 2 * a.h) < 1e-6)
  assert.strictEqual(Check.value({ kind: "screen", fallback: "", allowAll: false }, "*"), "")
  assert.strictEqual(Check.value({ kind: "screen", fallback: "" }, "*"), "*")
  const c = Schema.resolve({ mainScreen: "*", sizing: "huge", lostScreen: "hide" })
  assert.strictEqual(c.mainScreen, ""); assert.strictEqual(c.sizing, "fixed"); assert.strictEqual(c.lostScreen, "hide")
})
t("covers are fetched with a cap and shrunk in a capped process before they are shown", () => {
  const Art = load("Art.js")
  const same = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m)
  same(Art.parse("https://i.scdn.co/image/ab67"), { web: "https://i.scdn.co/image/ab67" })
  same(Art.parse("file:///tmp/firefox-mpris/cover%201.png"), { file: "/tmp/firefox-mpris/cover 1.png" })
  assert.strictEqual(Art.parse("data:image/png;base64,AAAA"), null)
  assert.strictEqual(Art.parse("file:///tmp/a[x]"), null)
  assert.strictEqual(Art.parse("file:///tmp/../etc/passwd"), null)
  assert.strictEqual(Art.parse("https://x/" + "a".repeat(3000)), null)
  const n = Art.nameOf("https://i.scdn.co/image/ab67")
  assert.ok(Art.isName(n))
  const c = Art.curlArgs("https://i.scdn.co/image/ab67", "/c/incoming/" + n + ".img")
  assert.strictEqual(c[c.indexOf("--max-filesize") + 1], String(8 * 1048576))
  assert.strictEqual(Art.curlArgs("file:///tmp/x.png", "/c/incoming/" + n + ".img"), null)
  const th = Art.thumbArgs("/c/incoming/" + n + ".img", "/c/covers/" + n + ".png")
  assert.strictEqual(th[0], "prlimit")
  assert.strictEqual(th[th.length - 1], "/c/covers/" + n + ".png[keep=none]")
  // the widget only ever loads the cache's copy, never the player's address
  const view = fs.readFileSync(path.join(__dirname, "../qml/desk/WidgetView.qml"), "utf8")
  assert.ok(!/loadImage\([^)]*artUrl/.test(view) && /covers\.fileFor\(/.test(view))
  assert.ok(/environment: \(\{ VIPS_BLOCK_UNTRUSTED: "1", VIPS_CONCURRENCY: "1"/.test(fs.readFileSync(path.join(__dirname, "../qml/core/ArtCache.qml"), "utf8")))
})
t("manifest", () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, "../manifest.json"), "utf8"))
  assert.strictEqual(m.id, "io.github.qempexe.vitrine"); assert.strictEqual(m.version, "1.0.0")
  for (const k in m.entryPoints) assert.ok(fs.existsSync(path.join(__dirname, "..", m.entryPoints[k])), k)
  for (const f of ["Inter", "PlayfairDisplay", "CormorantGaramond", "SpaceGrotesk", "JetBrainsMono", "BebasNeue", "UnifrakturMaguntia"])
    assert.ok(fs.existsSync(path.join(__dirname, "../fonts", f + ".ttf")), f)
})

console.log("\nALL OK (" + n + ")")
