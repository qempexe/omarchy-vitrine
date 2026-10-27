.pragma library
.import "Util.js" as Util
.import "Check.js" as Check
.import "Kinds.js" as Kinds
.import "parts/Frames.js" as Frames
.import "parts/Surfaces.js" as Surfaces
.import "parts/Lines.js" as Lines
.import "parts/Ornaments.js" as Ornaments

// Every setting Vitrine has. The settings panel builds its tabs and rows from
// `groups`; resolve() at the bottom turns settings.json into a full, checked config.
//
//   kind: enum, int, bool, string, palette (3 colors), font, presets (ready made
//         looks), looks (your saved looks), widgets (the widgets on the desktop)
//   control: how an enum shows: seg (buttons), tiles (little pictures), scheme, chips
//   when: the row is greyed out unless these other settings have these values

var swatches = [
  "#141414", "#1d1510", "#1a1b26", "#282a36", "#2e3440", "#2d353b", "#1f1f28", "#3b2a1f",
  "#e0e0e0", "#eadbc8", "#ffffff", "#c0caf5", "#d8dee9", "#dcd7ba", "#f8f8f2", "#e0def4",
  "#d4a35a", "#c8925a", "#7aa2f7", "#cba6f7", "#a7c080", "#88c0d0", "#fabd2f", "#ff6a1f"
];

var LOOK_SLOTS = 20;
function emptyLooks() { const out = []; for (let i = 0; i < LOOK_SLOTS; i++) out.push(null); return out; }

function keysOf(mod) { return Kinds.keysOf(mod); }
function labelsOf(mod) { return Kinds.labelsOf(mod); }
function hintOf(intro, mod) { return Kinds.hintOf(intro, mod); }
// "a, b and c"
function andList(xs) { return xs.length < 2 ? xs.join("") : xs.slice(0, xs.length - 1).join(", ") + " and " + xs[xs.length - 1]; }
// the labels of some keys of a part, in order
function labelsFor(mod, keys) {
    const out = [];
    for (let i = 0; i < keys.length; i++) if (mod.byKey[keys[i]]) out.push(mod.byKey[keys[i]].label);
    return out;
}
function keysWith(mod, flag, value) {
    const out = [];
    for (let i = 0; i < mod.list.length; i++) if (mod.list[i][flag] === value) out.push(mod.list[i].key);
    return out;
}

// the fonts that come with Vitrine, as the name each file registers
var bundledFonts = ["Inter", "Playfair Display", "Cormorant Garamond", "Space Grotesk", "JetBrains Mono", "Bebas Neue", "UnifrakturMaguntia"];
var fontLabels = { "": "Theme font", "Inter": "Inter", "Playfair Display": "Playfair", "Cormorant Garamond": "Cormorant",
                   "Space Grotesk": "Space Grotesk", "JetBrains Mono": "JetBrains Mono", "Bebas Neue": "Bebas Neue",
                   "UnifrakturMaguntia": "Blackletter" };

// ---- the widgets of the ready made looks --------------------------------------------

function W(id, kind, style, x, y, size, extra) {
    const set = { style, x, y, size };
    if (extra) for (const k in extra) set[k] = extra[k];
    return Kinds.make(kind, id, set);
}

var defaultWidgets = [
    W("w1", "clock", "plain", 500, 220, 170),
    W("w2", "date", "line", 500, 325, 40)
];

var presets = [
  { key: "quiet", label: "Quiet", set: { frame: "none", font: "Inter", weight: 200, textEffect: "soft",
      widgets: [W("w1", "clock", "plain", 500, 220, 170), W("w2", "date", "line", 500, 325, 40)] } },
  { key: "salon", label: "Salon", set: { frame: "cartouche", surface: "velvet", lines: "gilded", ornaments: "rosettes",
      font: "Playfair Display", weight: 400, cardOpacity: 90, textEffect: "none", padding: 14,
      widgets: [W("w1", "clock", "ornate", 500, 330, 300, { seconds: true }), W("w2", "date", "letter", 500, 560, 80),
                W("w3", "text", "quote", 500, 700, 90, { mode: "quote", text: "Every day is a page you get to write — the desk" })] } },
  { key: "gazette", label: "Gazette", set: { frame: "none", font: "Playfair Display", weight: 400, textEffect: "soft",
      widgets: [W("w1", "clock", "editorial", 190, 240, 240), W("w2", "date", "letter", 190, 420, 80),
                W("w3", "text", "headline", 190, 540, 70, { text: "Morning edition", line2: "printed this morning" })] } },
  { key: "glass", label: "Glass", set: { frame: "rounded", surface: "frost", lines: "solid", border: "subtle", cardOpacity: 45,
      radius: 18, font: "Inter", weight: 300, shadow: "soft",
      widgets: [W("w1", "clock", "sidecar", 860, 130, 110, { seconds: true }), W("w2", "date", "month", 860, 375, 230),
                W("w3", "system", "rings", 860, 615, 110), W("w4", "media", "cover", 860, 800, 96, { idle: "show" })] } },
  { key: "console", label: "Console", set: { frame: "square", surface: "crt", lines: "solid", border: "accent", cardOpacity: 92,
      font: "JetBrains Mono", weight: 400, shadow: "glow",
      widgets: [W("w1", "clock", "lcd", 200, 160, 110, { seconds: true }), W("w2", "system", "readout", 200, 340, 150, { metrics: ["cpu", "mem", "disk", "temp", "up"] }),
                W("w3", "text", "terminal", 200, 490, 60, { text: "hello, world" }), W("w4", "date", "iso", 200, 590, 60)] } },
  { key: "bauhaus", label: "Bauhaus", set: { frame: "circle", surface: "filled", lines: "none", colorMode: "palette", font: "Space Grotesk",
      weight: 500, cardOpacity: 92, shadow: "soft",
      widgets: [W("w1", "clock", "bauhaus", 300, 330, 300, { seconds: true }), W("w2", "date", "stacked", 520, 330, 210, { card: "none" }),
                W("w3", "text", "headline", 410, 580, 80, { text: "Form follows function", card: "none" })] } },
  { key: "orbit", label: "Orbit", set: { frame: "circle", surface: "nebula", lines: "solid", border: "subtle", cardOpacity: 80,
      font: "Space Grotesk", weight: 300, shadow: "deep",
      widgets: [W("w1", "clock", "orbit", 500, 380, 340, { seconds: true }), W("w2", "date", "moon", 500, 680, 90, { card: "none" })] } },
  { key: "flip", label: "Flip", set: { frame: "rounded", surface: "filled", lines: "none", cardOpacity: 88, radius: 16,
      font: "Inter", weight: 500, shadow: "deep",
      widgets: [W("w1", "clock", "flip", 500, 290, 210), W("w2", "date", "week", 500, 490, 100)] } },
  { key: "nixie", label: "Nixie", set: { frame: "plaque", surface: "wood", lines: "double", border: "accent", cardOpacity: 95,
      font: "Inter", weight: 300, shadow: "deep", padding: 12,
      widgets: [W("w1", "clock", "nixie", 450, 300, 160, { seconds: true }), W("w2", "date", "tearoff", 810, 300, 180)] } },
  { key: "cathedral", label: "Cathedral", set: { frame: "ogee", surface: "stained", lines: "gilded", ornaments: "fleurons",
      font: "Cormorant Garamond", weight: 500, cardOpacity: 92, shadow: "deep", padding: 12,
      widgets: [W("w1", "clock", "roman", 500, 260, 170, { stretch: 70 }), W("w2", "text", "gothic", 500, 470, 90, { text: "Ora et labora", card: "none" }),
                W("w3", "date", "letter", 500, 580, 60, { card: "none" })] } },
  { key: "dashboard", label: "Dashboard", set: { frame: "rounded", surface: "filled", lines: "none", cardOpacity: 82, radius: 14,
      font: "Inter", weight: 400, shadow: "soft",
      widgets: [W("w1", "clock", "plain", 160, 115, 90), W("w2", "date", "month", 160, 340, 220), W("w3", "date", "progress", 160, 580, 120),
                W("w4", "system", "bars", 420, 135, 140, { metrics: ["cpu", "mem", "disk", "net"] }), W("w5", "media", "cover", 420, 330, 100, { idle: "show" }),
                W("w6", "system", "graphs", 420, 540, 110, { metrics: ["cpu", "net"] })] } },
  { key: "studio", label: "Studio", set: { frame: "ticket", surface: "leather", lines: "stitched", border: "accent", cardOpacity: 92,
      font: "Playfair Display", weight: 400, shadow: "deep",
      widgets: [W("w1", "media", "vinyl", 500, 470, 200, { idle: "show" }), W("w2", "clock", "sidecar", 500, 230, 110, { card: "none" })] } },
  { key: "corner", label: "Corner", set: { frame: "none", font: "Inter", weight: 300, textEffect: "soft",
      widgets: [W("w1", "clock", "stacked", 80, 820, 170), W("w2", "date", "stacked", 190, 820, 120)] } },
  { key: "words", label: "Words", set: { frame: "square", surface: "filled", lines: "inset", border: "subtle", cardOpacity: 90,
      font: "Space Grotesk", weight: 500, shadow: "soft",
      widgets: [W("w1", "clock", "grid", 500, 370, 380), W("w2", "clock", "rough", 500, 680, 80, { card: "none" })] } },
  { key: "countdown", label: "Countdown", set: { frame: "stamp", surface: "filled", lines: "dashed", border: "accent", cardOpacity: 92,
      font: "Inter", weight: 300, shadow: "soft",
      widgets: [W("w1", "text", "counter", 500, 320, 160, { mode: "countdown", text: "until the new year", when: "2027-01-01", unit: "auto" }),
                W("w2", "clock", "plain", 500, 510, 70, { card: "none" })] } },
  { key: "neon", label: "Neon", set: { frame: "pill", surface: "clear", lines: "neon", cardOpacity: 0, font: "Space Grotesk",
      weight: 300, textEffect: "glow", shadow: "none",
      widgets: [W("w1", "clock", "lcd", 500, 280, 130, { seconds: true }), W("w2", "date", "line", 500, 410, 44, { card: "none" })] } }
];
var presetByKey = {};
for (let pi = 0; pi < presets.length; pi++) presetByKey[presets[pi].key] = presets[pi];
function presetFor(key) {
    const p = presetByKey[Util.toText(key)];
    return p && typeof p === "object" && p.key === key ? p : null;
}

// ---- the settings -------------------------------------------------------------------

var groups = [
  {
    title: "Looks",
    items: [
      { key: "enabled", section: "Vitrine", label: "Widgets on the desktop", kind: "bool", fallback: true,
        hint: "Off clears the desktop, with all your widgets and settings kept." },
      { key: "preset", section: "Ready made", label: "Start from a look", kind: "presets",
        hint: "Sets the widgets, their cards, colors and type in one go. Change anything after, it's yours." },
      { key: "keepWidgets", section: "Ready made", label: "Keep my widgets", kind: "bool", fallback: false,
        hint: "On, a look only changes how your widgets look, not which ones there are or where." },
      { key: "savedLooks", section: "Yours", label: "Your looks", kind: "looks", fallback: emptyLooks(),
        hint: "Twenty places to keep the desktop as it is now, widgets and all." }
    ]
  },
  {
    title: "Widgets",
    items: [
      { key: "widgets", label: "On your desktop", kind: "widgets", fallback: defaultWidgets,
        hint: "Add widgets, pick one to change it, or arrange them on the desktop by hand." }
    ]
  },
  {
    title: "Shape",
    items: [
      { key: "frame", section: "Card", label: "Shape", kind: "enum", fallback: "none", control: "tiles",
        options: keysOf(Frames), labels: labelsOf(Frames), abouts: Kinds.aboutsOf(Frames),
        hint: hintOf("The card each widget sits on.", Frames) },
      { key: "pointing", section: "Card", label: "Pointing", kind: "enum", fallback: "right", control: "seg",
        options: ["right", "left", "both"], labels: { right: "Right", left: "Left", both: "Both ways" },
        hint: "Which way the shapes that point go (" + andList(labelsFor(Frames, keysWith(Frames, "pointing", true)))
              + "), and which way " + andList(labelsFor(Surfaces, keysWith(Surfaces, "leans", true))) + " lean.",
        when: [{ any: [{ key: "frame", is: keysWith(Frames, "pointing", true) }, { key: "surface", is: keysWith(Surfaces, "leans", true) }] }] },
      { key: "flatCorners", section: "Card", label: "Square corners", kind: "enum", fallback: "none", control: "seg",
        options: ["none", "top", "bottom"], labels: { none: "None", top: "On top", bottom: "At the bottom" },
        hint: "Keeps the corners on one side square, the other side stays round. Also for the ends that round their corners.",
        when: [{ key: "frame", is: keysWith(Frames, "flatCorners", true).concat(["tabbed", "drop", "bullet", "scroll", "leaf"]) }] },
      { key: "radius", section: "Size", label: "Roundness", kind: "int", fallback: 14, min: 0, max: 48, step: 2,
        hint: "For the shapes with round corners.", when: [{ key: "frame", not: ["none"] }] },
      { key: "padding", section: "Size", label: "Room inside", kind: "int", fallback: 12, min: 0, max: 30, step: 1,
        hint: "Space between the card's edge and the widget, as a part of the widget's size.", when: [{ key: "frame", not: ["none"] }] }
    ]
  },
  {
    title: "Surface",
    items: [
      { key: "surface", section: "Surface", label: "Surface", kind: "enum", fallback: "filled", control: "tiles",
        options: keysOf(Surfaces), labels: labelsOf(Surfaces), abouts: Kinds.aboutsOf(Surfaces),
        hint: hintOf("What the card is made of.", Surfaces), when: [{ key: "frame", not: ["none"] }] },
      { key: "cardOpacity", section: "Surface", label: "Card opacity", kind: "int", fallback: 80, min: 0, max: 100, step: 5,
        hint: "How much of the wallpaper shows through.", when: [{ key: "frame", not: ["none"] }] },
      { key: "fill", section: "Surface", label: "Fill", kind: "enum", fallback: "solid", control: "seg",
        options: ["solid", "gradient", "glass"], labels: { solid: "Solid", gradient: "Gradient", glass: "Glass" },
        hint: "Gradient fades into a second color, set below. Glass adds a shine along the top.",
        when: [{ key: "frame", not: ["none"] }, { key: "surface", not: keysWith(Surfaces, "noGradient", true) }] },
      { key: "gradientTo", section: "Surface", label: "Gradient into", kind: "enum", fallback: "accent", control: "seg",
        options: ["accent", "palette", "border", "lighter", "darker"],
        labels: { accent: "Accent", palette: "Next theme color", border: "Window border", lighter: "Lighter", darker: "Darker" },
        hint: "The color the gradient ends in.",
        when: [{ key: "frame", not: ["none"] }, { key: "fill", is: ["gradient"] }, { key: "surface", not: keysWith(Surfaces, "noGradient", true) }] },
      { key: "gradientDir", section: "Surface", label: "Gradient runs", kind: "enum", fallback: "corner", control: "seg",
        options: ["corner", "down"], labels: { corner: "Corner to corner", down: "Top to bottom" },
        hint: "Which way the card fades.",
        when: [{ key: "frame", not: ["none"] }, { key: "fill", is: ["gradient"] }, { key: "surface", not: keysWith(Surfaces, "noGradient", true) }] },
      { key: "pattern", section: "Surface", label: "Texture", kind: "enum", fallback: "none", control: "seg",
        options: ["none", "stripes", "dots", "grid"], labels: { none: "None", stripes: "Stripes", dots: "Dots", grid: "Grid" },
        hint: "A faint texture over the card.",
        when: [{ key: "frame", not: ["none"] }, { key: "surface", not: keysWith(Surfaces, "noTexture", true) }] },
      { key: "depth", section: "Surface", label: "Depth", kind: "enum", fallback: "flat", control: "seg",
        options: ["flat", "raised", "sunken"], labels: { flat: "Flat", raised: "Raised", sunken: "Sunken" },
        hint: "A light and a dark edge make the card stand out or sink in.",
        when: [{ key: "frame", not: ["none"] }, { key: "surface", not: keysWith(Surfaces, "noDepth", true) }] },
      { key: "shadow", section: "Shadow", label: "Shadow", kind: "enum", fallback: "soft", control: "tiles",
        options: ["none", "soft", "deep", "lifted", "glow"], labels: { none: "None", soft: "Soft", deep: "Deep", lifted: "Lifted", glow: "Glow" },
        hint: "Under the card. Glow shines in the accent instead.", when: [{ key: "frame", not: ["none"] }] }
    ]
  },
  {
    title: "Lines",
    items: [
      { key: "lines", section: "Edge", label: "Lines", kind: "enum", fallback: "solid", control: "tiles",
        options: keysOf(Lines), labels: labelsOf(Lines), abouts: Kinds.aboutsOf(Lines),
        hint: hintOf("The edge of the card. Lines follow the card's shape.", Lines), when: [{ key: "frame", not: ["none"] }] },
      { key: "border", section: "Color and width", label: "Line color", kind: "enum", fallback: "subtle", control: "seg",
        options: ["subtle", "text", "accent", "border"],
        labels: { subtle: "Subtle", text: "Text color", accent: "Accent", border: "Window border" },
        hint: "Window border draws the lines like your windows' border, with the same gradient and angle.",
        when: [{ key: "frame", not: ["none"] }, { key: "lines", not: keysWith(Lines, "usesColor", false) }] },
      { key: "railSide", section: "Color and width", label: "Rail on", kind: "enum", fallback: "bottom", control: "seg",
        options: ["bottom", "top", "both", "left", "right"],
        labels: { bottom: "Bottom", top: "Top", both: "Top and bottom", left: "Left", right: "Right" },
        hint: "Which side of the card the rail runs along. Line width sets how thick it is.",
        when: [{ key: "frame", not: ["none"] }, { key: "lines", is: ["rail"] }] },
      { key: "borderWidth", section: "Color and width", label: "Line width", kind: "int", fallback: 1, min: 1, max: 6, step: 1,
        hint: "In pixels.", when: [{ key: "frame", not: ["none"] }, { key: "lines", not: keysWith(Lines, "usesWidth", false) }] },
      { key: "outlineGradient", section: "Fade", label: "Gradient lines", kind: "bool", fallback: false,
        hint: "Fades the lines from their own color into a second one.",
        when: [{ key: "frame", not: ["none"] }, { key: "lines", not: ["none"] }] },
      { key: "outlineGradientTo", section: "Fade", label: "Fade into", kind: "enum", fallback: "lighter", control: "seg",
        options: ["lighter", "accent", "palette", "border"],
        labels: { lighter: "Lighter", accent: "Accent", palette: "Theme palette", border: "Window border" },
        hint: "The second color.", when: [{ key: "outlineGradient", is: ["true"] }] }
    ]
  },
  {
    title: "Ornaments",
    items: [
      { key: "ornaments", section: "Decoration", label: "Ornaments", kind: "enum", fallback: "none", control: "tiles",
        options: keysOf(Ornaments), labels: labelsOf(Ornaments), abouts: Kinds.aboutsOf(Ornaments),
        hint: hintOf("Decoration on the card, in the accent. Ornaments sit where the card's shape has its corners.", Ornaments),
        when: [{ key: "frame", not: ["none"] }] }
    ]
  },
  {
    title: "Type",
    items: [
      { key: "font", section: "Font", label: "Font", kind: "font", fallback: "Inter",
        options: [""].concat(bundledFonts), labels: fontLabels,
        hint: "The fonts here come with Vitrine. Theme font follows your Omarchy font. Search finds every font on your computer." },
      { key: "weight", section: "Font", label: "Weight", kind: "int", fallback: 300, min: 100, max: 900, step: 100,
        hint: "100 is hairline thin, 900 is black. Fonts without that weight use the nearest one." },
      { key: "textEffect", section: "On the wallpaper", label: "Text effect", kind: "enum", fallback: "soft", control: "tiles",
        options: ["none", "soft", "deep", "glow"], labels: { none: "None", soft: "Soft shadow", deep: "Deep shadow", glow: "Glow" },
        hint: "Helps widgets without a card read on any wallpaper. Glow shines in the accent." }
    ]
  },
  {
    title: "Colors",
    items: [
      { key: "colorMode", section: "Scheme", label: "Colors", kind: "enum", fallback: "theme", control: "scheme",
        options: ["theme", "palette", "borders", "custom", "monochrome"],
        labels: { theme: "Follow theme", palette: "Theme palette", borders: "Window borders", custom: "Custom", monochrome: "Monochrome" },
        hint: "Follow theme matches your Omarchy theme live. Theme palette gives every widget its own color from the theme. Window borders takes your windows' border colors and spreads them across the screen. Custom lets you choose them yourself. Monochrome uses no color at all." },
      { key: "customColors", section: "Scheme", label: "Custom colors", kind: "palette",
        fallback: { customBg: "#141414", customFg: "#e0e0e0", accentColor: "#ff6a1f" },
        targets: [{ key: "customBg", label: "Card" }, { key: "customFg", label: "Text" }, { key: "accentColor", label: "Accent" }],
        presets: swatches, hint: "The card, the text and the accent.", when: [{ key: "colorMode", is: ["custom"] }] },
      { key: "bareInk", section: "On the wallpaper", label: "Text without a card", kind: "enum", fallback: "theme", control: "seg",
        options: ["theme", "bar", "accent"], labels: { theme: "Theme text", bar: "Bar text", accent: "Accent" },
        hint: "The color of widgets that sit straight on the wallpaper." },
      { key: "opacity", section: "On the wallpaper", label: "Widget opacity", kind: "int", fallback: 100, min: 20, max: 100, step: 5,
        hint: "How strongly every widget shows. Each widget can be lighter still." }
    ]
  },
  {
    title: "Motion",
    items: [
      { key: "appear", section: "Appear", label: "Appearing", kind: "enum", fallback: "rise", control: "tiles",
        options: ["fade", "zoom", "rise", "drop", "slide", "pop", "unfold", "none"],
        labels: { fade: "Fade", zoom: "Zoom", rise: "Rise", drop: "Drop", slide: "Slide", pop: "Pop", unfold: "Unfold", none: "None" },
        hint: "How the widgets come in: when the shell starts, when you switch them on, and when a look changes them." },
      { key: "stagger", section: "Appear", label: "One after another", kind: "bool", fallback: true,
        hint: "Each widget comes in a moment after the one before." },
      { key: "speed", section: "Appear", label: "Speed", kind: "int", fallback: 420, min: 0, max: 1500, step: 20,
        hint: "Milliseconds. 0 turns every animation off." },
      { key: "sweep", section: "Clocks", label: "Sweeping second hands", kind: "bool", fallback: false,
        hint: "Second hands glide instead of ticking. Uses a little more power." },
      { key: "flipMotion", section: "Clocks", label: "Flip and roll", kind: "bool", fallback: true,
        hint: "Flip and Odometer animate as the digits change." }
    ]
  },
  {
    title: "Desktop",
    items: [
      { key: "visibility", section: "When", label: "Show widgets", kind: "enum", fallback: "always", control: "tiles",
        options: ["always", "empty", "nofull"], labels: { always: "Always", empty: "On empty workspaces", nofull: "Unless fullscreen" },
        hint: "They always sit behind your windows. On empty workspaces hides them while windows are open; Unless fullscreen hides them under a fullscreen window." },
      { key: "fadeTime", section: "When", label: "Fade", kind: "int", fallback: 300, min: 0, max: 1500, step: 50,
        hint: "Milliseconds the widgets take to hide and come back.", when: [{ key: "visibility", not: ["always"] }] },
      { key: "scale", section: "Size", label: "Everything's size", kind: "int", fallback: 100, min: 40, max: 250, step: 5, divisor: 100, decimals: 2,
        hint: "Makes every widget bigger or smaller at once, for a high resolution screen." },
      { key: "sizing", section: "Size", label: "Sizes follow", kind: "enum", fallback: "fixed", control: "seg",
        options: ["fixed", "screen"], labels: { fixed: "Pixels", screen: "Each screen's height" },
        hint: "Pixels keeps a widget the same size everywhere. Each screen's height grows it on a tall screen and shrinks it on a small one, so a widget shown on every screen looks the same on all of them." },

      { key: "mainScreen", section: "Screens", label: "Main screen", kind: "screen", fallback: "", allowAll: false, emptyLabel: "Automatic",
        hint: "Where widgets set to Main screen go. Automatic takes the first screen Hyprland lists." },
      { key: "lostScreen", section: "Screens", label: "When a screen is unplugged", kind: "enum", fallback: "main", control: "seg",
        options: ["main", "hide"], labels: { main: "Move its widgets to the main screen", hide: "Hide them until it's back" },
        hint: "Widgets keep their screen in their settings either way, and go back to it when you plug it in again." },
      { key: "snap", section: "Arrange", label: "Snap to a grid", kind: "bool", fallback: true,
        hint: "Widgets you drag in Arrange line up on a grid. Hold Shift to place freely." },
      { key: "grid", section: "Arrange", label: "Grid size", kind: "int", fallback: 20, min: 4, max: 80, step: 2,
        hint: "Pixels between the grid lines.", when: [{ key: "snap", is: ["true"] }] },
      { key: "arrangeDim", section: "Arrange", label: "Shade while arranging", kind: "int", fallback: 45, min: 0, max: 90, step: 5,
        hint: "How dark the desktop gets behind the widgets you arrange." }
    ]
  },
  {
    title: "Panel",
    items: [
      { key: "barButton", section: "Button", label: "Bar button", kind: "enum", fallback: "icon", control: "seg",
        options: ["icon", "text", "hidden"], labels: { icon: "Icon", text: "Text", hidden: "Hidden" },
        hint: "Hidden keeps Vitrine working with no button. Open the settings with omarchy-shell io.github.qempexe.vitrine settings." },
      { key: "barText", section: "Button", label: "Button text", kind: "string", fallback: "Vitrine", maxLength: 12,
        presets: ["Vitrine", "Desk", "Widgets"], hint: "Shown when the button shows text.", when: [{ key: "barButton", is: ["text"] }] },
      { key: "middleClick", section: "Button", label: "Middle click", kind: "enum", fallback: "toggle", control: "seg",
        options: ["toggle", "arrange", "none"], labels: { toggle: "Show / hide", arrange: "Arrange", none: "Nothing" },
        hint: "What a middle click on the button does." },
      { key: "rightClick", section: "Button", label: "Right click", kind: "enum", fallback: "arrange", control: "seg",
        options: ["arrange", "next", "none"], labels: { arrange: "Arrange", next: "Next look", none: "Nothing" },
        hint: "What a right click on the button does." },
      { key: "openAs", section: "Window", label: "Open as", kind: "enum", fallback: "panel", control: "tiles",
        options: ["panel", "window"], labels: { panel: "Bar panel", window: "Own window" },
        hint: "Where the button opens the settings. You can always pop it out or dock it back from the header." },
      { key: "windowWidth", section: "Window", label: "Panel width", kind: "int", fallback: 600, min: 480, max: 1100, step: 20,
        hint: "How wide the panel opens." },
      { key: "windowHeight", section: "Window", label: "Panel height", kind: "int", fallback: 700, min: 460, max: 1100, step: 20,
        hint: "How tall the panel opens." },
      { key: "density", section: "Look", label: "Spacing", kind: "enum", fallback: "comfortable", control: "tiles",
        options: ["compact", "comfortable", "spacious"], labels: { compact: "Compact", comfortable: "Comfortable", spacious: "Spacious" },
        hint: "How much air there is between things in this panel." },
      { key: "cornerRadius", section: "Look", label: "Panel roundness", kind: "int", fallback: 6, min: 0, max: 20, step: 2,
        hint: "0 is square, 20 is very round." },
      { key: "panelFrame", section: "Look", label: "Window outline", kind: "bool", fallback: false,
        hint: "Draw the panel edge in color instead of a plain neutral line." },
      { key: "panelFrameGradient", section: "Look", label: "Outline gradient", kind: "bool", fallback: true,
        hint: "When your theme's window border is a gradient, the panel outline runs through all its colors, at the same angle.",
        when: [{ key: "panelFrame", is: ["true"] }] },
      { key: "panelFrameColor", section: "Look", label: "Outline color", kind: "enum", fallback: "accent", control: "seg",
        options: ["accent", "first", "middle", "last"],
        labels: { accent: "Accent", first: "Border's first", middle: "Border's middle", last: "Border's last" },
        hint: "The one color of the outline when it isn't a gradient.", when: [{ key: "panelFrame", is: ["true"] }] },
      { key: "fontScale", section: "Look", label: "Text size", kind: "int", fallback: 100, min: 80, max: 150, step: 5, divisor: 100, decimals: 2,
        hint: "1 is normal, 1.25 is a quarter bigger." },
      { key: "surfaceTint", section: "Look", label: "Panel tint", kind: "int", fallback: 0, min: 0, max: 30, step: 1,
        hint: "How much of the accent color washes over the panel background." },
      { key: "panelOpacity", section: "Look", label: "Panel opacity", kind: "int", fallback: 96, min: 50, max: 100, step: 2,
        hint: "Background of this panel." }
    ]
  }
];

// a look brought colors along (Bauhaus' palette); kept so the next look can drop them
var hiddenItems = [
  { key: "presetColors", kind: "string", fallback: "", maxLength: 16 },
  { key: "lastLook", kind: "string", fallback: "", maxLength: 16 },
  { key: "undoLook", kind: "undo", fallback: null }
];

var colorKeys = {};
var defaults = {};
var itemByKey = {};
for (let g = 0; g < groups.length; g++) {
    const items = groups[g].items;
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (itemByKey[item.key]) console.warn("Vitrine: the setting " + item.key + " is in Schema.js twice");
        itemByKey[item.key] = item;
        if (item.kind === "presets") continue;
        if (item.kind === "palette") {
            for (let t = 0; t < item.targets.length; t++) {
                const ck = item.targets[t].key;
                defaults[ck] = item.fallback[ck];
                colorKeys[ck] = item.fallback[ck];
            }
        } else defaults[item.key] = item.fallback;
    }
}
for (let h = 0; h < hiddenItems.length; h++) {
    itemByKey[hiddenItems[h].key] = hiddenItems[h];
    defaults[hiddenItems[h].key] = hiddenItems[h].fallback;
}

// what a look is made of: everything but the panel's own settings, on/off and the saved looks
var lookKeys = [];
var lookGroups = ["Widgets", "Shape", "Surface", "Lines", "Ornaments", "Type", "Colors", "Motion", "Desktop"];
for (let lg = 0; lg < groups.length; lg++) {
    if (lookGroups.indexOf(groups[lg].title) === -1) continue;
    const its = groups[lg].items;
    for (let li = 0; li < its.length; li++) {
        if (its[li].kind === "palette") {
            for (let lt = 0; lt < its[li].targets.length; lt++) lookKeys.push(its[li].targets[lt].key);
        } else lookKeys.push(its[li].key);
    }
}

var settingKeys = [];
for (const name in defaults) settingKeys.push(name);
function isSetting(key) { return settingKeys.indexOf(key) !== -1; }

function itemFor(key) {
    const item = itemByKey[key];
    if (item && typeof item === "object" && item.key === key) return item;
    return null;
}

function validHex(s) { return Check.validHex(s); }

// one value, checked. Unknown keys give undefined
function clean(key, value) {
    if (typeof colorKeys[key] === "string") return Check.validHex(value) ? ("" + value).toLowerCase() : colorKeys[key];
    const item = itemFor(key);
    if (item === null) return undefined;
    if (item.kind === "widgets") return value === null || value === undefined ? copyWidgets(item.fallback) : Kinds.cleanList(value);
    if (item.kind === "looks") return cleanLooks(value);
    if (item.kind === "undo") return value && typeof value === "object" ? cleanLookAll(value) : null;
    if (item.kind === "font") return Check.value({ kind: "font", fallback: item.fallback }, value);
    return Check.value(item, value);
}

function copyWidgets(list) { return Kinds.cleanList(JSON.parse(JSON.stringify(list))); }

// only a look's keys, each checked: for saved looks, presets and imports
function cleanLook(obj) {
    const out = {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
    for (let i = 0; i < lookKeys.length; i++) {
        const k = lookKeys[i];
        const v = obj[k];
        if (v === undefined || typeof v === "function") continue;
        if (k !== "widgets" && v !== null && typeof v === "object") continue;
        out[k] = clean(k, v);
    }
    return out;
}
// a look with every key filled in (for the one step undo)
function cleanLookAll(obj) {
    const out = cleanLook(obj);
    for (let i = 0; i < lookKeys.length; i++) if (out[lookKeys[i]] === undefined) out[lookKeys[i]] = clean(lookKeys[i], undefined);
    return out;
}

function cleanLooks(value) {
    const out = [];
    for (let i = 0; i < LOOK_SLOTS; i++) {
        const v = Array.isArray(value) && i < value.length ? value[i] : null;
        const look = v ? cleanLook(v) : null;
        let any = false;
        for (const k in look) { any = true; break; }
        out.push(any ? look : null);
    }
    return out;
}

function parseLook(text) {
    if (typeof text !== "string" || text.length === 0 || text.length > 65536) return null;
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { return null; }
    const look = cleanLook(parsed);
    for (const k in look) return look;
    return null;
}

function lookOf(cfg) {
    const out = {};
    for (let i = 0; i < lookKeys.length; i++) {
        const k = lookKeys[i];
        out[k] = k === "widgets" ? JSON.parse(JSON.stringify(cfg[k])) : cfg[k];
    }
    return out;
}

function migrate(obj) { return obj; }

function resolve(saved) {
    if (!saved || typeof saved !== "object") saved = {};
    const result = {};
    for (const key in defaults) {
        let value = saved[key];
        if (typeof value === "function") value = undefined;
        result[key] = clean(key, value);
    }
    return result;
}
