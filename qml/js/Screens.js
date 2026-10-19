.pragma library

// Which screen a widget goes on. A widget's screen is "" (the main screen), "*" (every
// screen, each with its own copy) or a screen's name. names: the screens plugged in now,
// in order. list: the same screens as { name, x, y, w, h } in the layout of all screens.

// the main screen: the one picked, while it's plugged in, else the first
function mainOf(pick, names) {
    if (pick !== "" && names.indexOf(pick) !== -1) return pick;
    return names.length > 0 ? names[0] : "";
}

// where w shows right now: a screen's name, "*" for every screen, "" for nowhere.
// lostMode: "main" puts a widget whose screen is unplugged on the main screen, "hide" hides it
function placeOf(w, names, main, lostMode) {
    if (!w) return "";
    if (w.screen === "*") return "*";
    if (w.screen === "" || w.screen === undefined) return main;
    if (names.indexOf(w.screen) !== -1) return w.screen;
    return lostMode === "main" ? main : "";
}
function shows(w, name, names, main, lostMode) {
    var p = placeOf(w, names, main, lostMode);
    return p === "*" || (p !== "" && p === name);
}
function lost(w, names) {
    return !!w && w.screen !== "" && w.screen !== "*" && names.indexOf(w.screen) === -1;
}

// the screen after the one w is on
function nextOf(w, names, main) {
    if (!w || names.length < 2) return "";
    var here = w.screen === "*" || w.screen === "" || names.indexOf(w.screen) === -1 ? main : w.screen;
    var i = names.indexOf(here);
    return names[(i + 1) % names.length];
}

// the screen under a point in the layout of all screens, or ""
function at(list, gx, gy) {
    for (var i = 0; i < list.length; i++) {
        var s = list[i];
        if (gx >= s.x && gx < s.x + s.w && gy >= s.y && gy < s.y + s.h) return s.name;
    }
    return "";
}

// a widget's middle at (lx, ly) on screen `from` lands where on screen `to`, in thousandths
function carry(from, to, lx, ly) {
    var x = (from.x + lx - to.x) / to.w * 1000, y = (from.y + ly - to.y) / to.h * 1000;
    return { x: Math.max(0, Math.min(1000, Math.round(x))), y: Math.max(0, Math.min(1000, Math.round(y))) };
}

// how much widgets grow on a screen this tall when sizes follow each screen's height
function scaleFor(sizing, height) {
    if (sizing !== "screen") return 1;
    var h = typeof height === "number" && isFinite(height) && height > 0 ? height : 1080;
    return Math.max(0.3, Math.min(4, h / 1080));
}

// what a widget's screen is saved as when it moves to `name`: the main screen is
// saved as "" so it follows the main screen, every screen stays every screen
function savedAs(w, name, main) {
    if (w && w.screen === "*") return "*";
    return name === main ? "" : name;
}
