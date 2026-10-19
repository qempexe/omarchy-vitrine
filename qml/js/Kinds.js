.pragma library
.import "Util.js" as Util
.import "Check.js" as Check
.import "parts/Faces.js" as Faces
.import "parts/Dates.js" as Dates
.import "parts/Meters.js" as Meters
.import "parts/Media.js" as Media
.import "parts/Notes.js" as Notes

// The kinds of widget you can put on the desktop, what each one is drawn with
// (a catalog in parts/) and the settings every placed widget keeps for itself.
// To add a style to a kind, add it to that kind's catalog. To add a kind, see
// CONTRIBUTING.md.

var MAX_WIDGETS = 24;

// a list's keys and labels, for the Style tiles
function keysOf(mod) { var out = []; for (var i = 0; i < mod.list.length; i++) out.push(mod.list[i].key); return out; }
function labelsOf(mod) { var out = {}; for (var i = 0; i < mod.list.length; i++) out[mod.list[i].key] = mod.list[i].label; return out; }
// the hint above a row of tiles: a short intro; the picked tile's own sentence is
// added by the row itself (see aboutsOf)
function hintOf(intro, mod) { return intro; }
function aboutsOf(mod) {
    var out = {};
    for (var i = 0; i < mod.list.length; i++) if (mod.list[i].about) out[mod.list[i].key] = mod.list[i].about;
    return out;
}

var metricKeys = ["cpu", "mem", "disk", "bat", "temp", "net", "load", "up", "swap"];
var metricLabels = { cpu: "CPU", mem: "Memory", disk: "Disk", bat: "Battery", temp: "Heat", net: "Network",
                     load: "Load", up: "Uptime", swap: "Swap" };

// settings every widget has
function common(mod, intro, styleFallback, size) {
    return [
      { key: "style", section: "Style", label: "Style", kind: "enum", fallback: styleFallback, control: "tiles",
        options: keysOf(mod), labels: labelsOf(mod), abouts: aboutsOf(mod), hint: hintOf(intro, mod) },
      { key: "size", section: "Place", label: "Size", kind: "int", fallback: size, min: 30, max: 900, step: 10,
        hint: "How tall it is, in pixels. Drag its corner in Arrange to change it by hand." },
      { key: "stretch", section: "Place", label: "Width", kind: "int", fallback: 100, min: 50, max: 300, step: 5,
        hint: "Wider or narrower than the style's own shape, in percent." },
      { key: "x", section: "Place", label: "Across", kind: "int", fallback: 500, min: 0, max: 1000, step: 10, divisor: 10, decimals: 0,
        hint: "Where its middle is, from the left edge (0) to the right (100)." },
      { key: "y", section: "Place", label: "Down", kind: "int", fallback: 300, min: 0, max: 1000, step: 10, divisor: 10, decimals: 0,
        hint: "Where its middle is, from the top (0) to the bottom (100)." },
      { key: "screen", section: "Place", label: "Show on", kind: "screen", fallback: "", allowAll: true, emptyLabel: "Main screen",
        hint: "Your main screen, every screen (each with its own copy in the same place), or one screen. In Arrange you can also drag it to another screen." },
      { key: "card", section: "Look", label: "Card", kind: "enum", fallback: "auto", control: "seg",
        options: ["auto", "none"], labels: { auto: "Like the Card tab", none: "No card" },
        hint: "No card leaves just this widget's ink on the wallpaper, whatever the Card tab says." },
      { key: "accent", section: "Look", label: "Accent", kind: "enum", fallback: "auto", control: "chips",
        options: ["auto", "1", "2", "3", "4", "5", "6"],
        labels: { auto: "From Colors", "1": "Palette 1", "2": "Palette 2", "3": "Palette 3", "4": "Palette 4", "5": "Palette 5", "6": "Palette 6" },
        hint: "From Colors follows the Colors tab. A palette color takes one of your theme's own colors for this widget." },
      { key: "opacity", section: "Look", label: "Opacity", kind: "int", fallback: 100, min: 15, max: 100, step: 5,
        hint: "How strongly this widget shows." },
      { key: "caption", section: "Look", label: "Caption", kind: "string", fallback: "", maxLength: 40,
        hint: "A small line under the widget, like a city's name under its clock." }
    ];
}

var zones = ["", "UTC", "Europe/London", "Europe/Brussels", "Europe/Bucharest", "America/New_York",
             "America/Los_Angeles", "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney"];

var list = [
    { key: "clock", label: "Clock", about: "The time, in any of the faces.", styles: Faces, size: 150,
      items: common(Faces, "How it tells the time.", "plain", 150).concat([
        { key: "h24", section: "Time", label: "24 hours", kind: "bool", fallback: true,
          hint: "Off counts to 12 and shows AM and PM where the face has room." },
        { key: "seconds", section: "Time", label: "Seconds", kind: "bool", fallback: false,
          hint: "Faces that have no place for them leave them out." },
        { key: "lead", section: "Time", label: "Leading zero", kind: "bool", fallback: true,
          hint: "09:05 instead of 9:05." },
        { key: "blink", section: "Time", label: "Blink the colon", kind: "bool", fallback: false,
          hint: "The colon fades every other second." },
        { key: "zone", section: "Time", label: "Time zone", kind: "string", fallback: "", maxLength: 48, presets: zones,
          hint: "Empty is your own time. A zone like Asia/Tokyo makes a world clock; put the city in Caption." }
      ]) },
    { key: "date", label: "Date", about: "The date, a calendar, the year or the moon.", styles: Dates, size: 90,
      items: common(Dates, "How it shows the date.", "line", 90).concat([
        { key: "monday", section: "Calendar", label: "Weeks start on Monday", kind: "bool", fallback: true,
          hint: "Off starts them on Sunday." }
      ]) },
    { key: "system", label: "System", about: "How busy your computer is: processor, memory, disk, battery and more.", styles: Meters, size: 140,
      items: common(Meters, "How it shows the readings.", "rings", 140).concat([
        { key: "metrics", section: "Readings", label: "Show", kind: "multi", fallback: ["cpu", "mem", "disk"],
          options: metricKeys, labels: metricLabels,
          hint: "Pick what to show, in the order you click them. Battery and Heat show only where the computer has them." },
        { key: "every", section: "Readings", label: "Update every", kind: "int", fallback: 2, min: 1, max: 30, step: 1,
          hint: "Seconds between readings." },
        { key: "fahrenheit", section: "Readings", label: "Fahrenheit", kind: "bool", fallback: false,
          hint: "Heat in °F instead of °C." },
        { key: "path", section: "Readings", label: "Disk", kind: "string", fallback: "/", maxLength: 120,
          presets: ["/", "/home"], hint: "The folder whose disk Disk measures." }
      ]) },
    { key: "media", label: "Now playing", about: "What is playing, from any music or video app.", styles: Media, size: 110,
      items: common(Media, "How it shows the music.", "cover", 110).concat([
        { key: "idle", section: "Music", label: "When nothing plays", kind: "enum", fallback: "hide", control: "seg",
          options: ["hide", "show"], labels: { hide: "Hide it", show: "Say so" },
          hint: "Hide it keeps the desktop clear until something plays." },
        { key: "player", section: "Music", label: "Only from", kind: "string", fallback: "", maxLength: 40,
          presets: ["", "spotify", "firefox", "chromium", "mpv"],
          hint: "Empty follows whatever is playing. A name keeps it to that app." }
      ]) },
    { key: "text", label: "Text", about: "Your own words: a note, quotes, a greeting or a countdown.", styles: Notes, size: 100,
      items: common(Notes, "How it sets the text.", "plain", 100).concat([
        { key: "mode", section: "Text", label: "Shows", kind: "enum", fallback: "note", control: "tiles",
          options: ["note", "quote", "greeting", "countdown", "since"],
          labels: { note: "A note", quote: "Quotes", greeting: "A greeting", countdown: "A countdown", since: "Time since" },
          hint: "A note is your text. Quotes takes a new one each day from the ones you write, split by |. A greeting changes with the time of day. A countdown counts down to a date; Time since counts up from one." },
        { key: "text", section: "Text", label: "Text", kind: "string", fallback: "Make something beautiful today.", maxLength: 400,
          hint: "The note, your quotes (split by |, an author after —), what a countdown is for, or a line under a greeting." },
        { key: "line2", section: "Text", label: "Small line", kind: "string", fallback: "", maxLength: 60,
          hint: "A smaller line: the author of a note, or the name a greeting says." },
        { key: "when", section: "Countdown", label: "Date", kind: "string", fallback: "", maxLength: 16,
          presets: [], hint: "YYYY-MM-DD, with a time if you like: 2027-05-15 21:00.",
          when: [{ key: "mode", is: ["countdown", "since"] }] },
        { key: "unit", section: "Countdown", label: "Count in", kind: "enum", fallback: "auto", control: "seg",
          options: ["auto", "days", "hours", "full"], labels: { auto: "Best fit", days: "Days", hours: "Hours", full: "Days, hours, minutes" },
          hint: "Best fit uses days, then hours, then minutes as it gets close.",
          when: [{ key: "mode", is: ["countdown", "since"] }] },
        { key: "done", section: "Countdown", label: "When it's here", kind: "string", fallback: "It's here!", maxLength: 60,
          hint: "What a countdown says once the date has come.", when: [{ key: "mode", is: ["countdown"] }] }
      ]) }
];

var byKey = {};
for (var i = 0; i < list.length; i++) {
    var k = list[i];
    k.itemByKey = {};
    for (var j = 0; j < k.items.length; j++) k.itemByKey[k.items[j].key] = k.items[j];
    byKey[k.key] = k;
}

function kindOf(key) {
    var k = byKey[Util.toText(key)];
    return k && typeof k === "object" && k.key === key ? k : null;
}

// a new widget of a kind, with every setting at its default
function make(kindKey, id, set) {
    var k = kindOf(kindKey);
    if (!k) return null;
    var w = { id: id, kind: k.key };
    for (var i = 0; i < k.items.length; i++) {
        var it = k.items[i];
        w[it.key] = Array.isArray(it.fallback) ? it.fallback.slice() : it.fallback;
    }
    if (set) for (var key in set) if (k.itemByKey[key]) w[key] = Check.value(k.itemByKey[key], set[key]);
    return w;
}

// one widget from settings.json, every setting checked; null if it isn't one
function clean(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    var k = kindOf(obj.kind);
    if (!k) return null;
    var id = Util.toText(obj.id);
    if (!/^w[0-9]{1,6}$/.test(id)) return null;
    var w = { id: id, kind: k.key };
    for (var i = 0; i < k.items.length; i++) {
        var it = k.items[i];
        var v = obj[it.key];
        if (typeof v === "function") v = undefined;
        w[it.key] = Check.value(it, v);
    }
    return w;
}
function cleanList(value) {
    var out = [], seen = {};
    // a real array, or a list handed over from outside (it has a length and numbered items)
    if (!value || typeof value !== "object" || typeof value.length !== "number") return out;
    for (var i = 0; i < value.length && out.length < MAX_WIDGETS; i++) {
        var w = clean(value[i]);
        if (w && !seen[w.id]) { seen[w.id] = true; out.push(w); }
    }
    return out;
}

// the next free id for a list of widgets
function nextId(widgets) {
    var n = 0;
    for (var i = 0; i < widgets.length; i++) {
        var m = /^w([0-9]+)$/.exec(widgets[i].id);
        if (m) n = Math.max(n, parseInt(m[1], 10));
    }
    return "w" + (n + 1);
}

// the style entry a widget draws with
function styleOf(w) {
    var k = kindOf(w.kind);
    if (!k) return null;
    return k.styles.byKey[w.style] || k.styles.list[0];
}

// width / height of a widget's box
function aspectOf(w) {
    var s = styleOf(w);
    if (!s) return 1;
    var n = w.kind === "system" && w.metrics ? Math.max(1, w.metrics.length) : 1;
    var a = typeof s.aspect === "function" ? s.aspect(w, n) : (s.aspect || 1);
    return Math.max(0.2, a * (w.stretch || 100) / 100);
}

// ---- what a text widget says ---------------------------------------------------------

// "2027-05-15" or "2027-05-15 21:00" -> a Date, or null
function parseWhen(s) {
    var m = /^\s*([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:[ T]([0-9]{1,2}):([0-9]{2}))?\s*$/.exec(Util.toText(s));
    if (!m) return null;
    var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10),
                     m[4] ? parseInt(m[4], 10) : 0, m[5] ? parseInt(m[5], 10) : 0);
    return isNaN(d.getTime()) ? null : d;
}

function greeting(h) {
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    if (h < 22) return "Good evening";
    return "Good night";
}

// w: a text widget, now: a Date, doy: the day of the year (for the quote of the day)
function noteData(w, now, doy) {
    var mode = w.mode || "note";
    if (mode === "greeting") {
        var name = (w.line2 || "").trim();
        return { mode: mode, main: greeting(now.getHours()) + (name ? ", " + name : ""), sub: (w.text || "").trim(), big: "", unit: "" };
    }
    if (mode === "quote") {
        var all = (w.text || "").split("|"), quotes = [];
        for (var i = 0; i < all.length; i++) if (all[i].trim() !== "") quotes.push(all[i].trim());
        if (quotes.length === 0) return { mode: mode, main: "", sub: "", big: "", unit: "" };
        var q = quotes[(doy || 0) % quotes.length];
        var by = /^(.*?)\s+[—–-]\s+([^—–-]+)$/.exec(q);
        return { mode: mode, main: by ? by[1] : q, sub: by ? by[2] : (w.line2 || ""), big: "", unit: "" };
    }
    if (mode === "countdown" || mode === "since") {
        var target = parseWhen(w.when);
        if (!target) return { mode: mode, main: "Set a date for this countdown in its settings", sub: "", big: "", unit: "" };
        var ms = mode === "countdown" ? target.getTime() - now.getTime() : now.getTime() - target.getTime();
        if (ms <= 0) return { mode: mode, main: mode === "countdown" ? (w.done || "It's here!") : "Not yet", sub: w.line2 || "", big: "", unit: "" };
        var mins = Math.floor(ms / 60000), hours = Math.floor(mins / 60), days = Math.floor(hours / 24);
        var unit = w.unit || "auto", big, u;
        if (unit === "full") { big = days + "d " + (hours % 24) + "h " + (mins % 60) + "m"; u = ""; }
        else if (unit === "days" || (unit === "auto" && days >= 2)) { big = "" + days; u = days === 1 ? "day" : "days"; }
        else if (unit === "hours" || (unit === "auto" && hours >= 2)) { big = "" + hours; u = hours === 1 ? "hour" : "hours"; }
        else { big = "" + mins; u = mins === 1 ? "minute" : "minutes"; }
        var label = (w.text || "").trim();
        return { mode: mode, main: label, sub: w.line2 || "", big: big, unit: u };
    }
    return { mode: "note", main: w.text || "", sub: w.line2 || "", big: "", unit: "" };
}
