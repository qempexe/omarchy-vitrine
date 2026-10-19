.pragma library

// Reading colors out of the current Omarchy theme. Only #rrggbb values and a number
// for the angle are taken from the files; nothing in them is run.

// colors.toml: color1 … color6 and their bright versions, in that order, each once
function parsePalette(text) {
    var found = {};
    if (typeof text === "string" && text.length <= 65536) {
        var lines = text.split("\n");
        for (var i = 0; i < lines.length; i++) {
            var m = /^\s*(color[0-9]{1,2})\s*=\s*["']?(#[0-9a-fA-F]{6})["']?\s*$/.exec(lines[i]);
            if (m) found[m[1]] = m[2].toLowerCase();
        }
    }
    var order = ["color1", "color2", "color3", "color4", "color5", "color6",
                 "color9", "color10", "color11", "color12", "color13", "color14"];
    var out = [];
    for (var j = 0; j < order.length; j++) {
        var c = found[order[j]];
        if (typeof c === "string" && out.indexOf(c) === -1) out.push(c);
    }
    return out;
}

// The active window border, often a gradient:
//   hyprland.lua:   local active_border_color = { colors = { "rgba(1ee9d6ee)", "rgba(fe4fb6ee)" }, angle = 45 }
//   hyprland.conf:  col.active_border = rgba(33ccffee) rgba(00ff99ee) 45deg
// -> { colors: ["#1ee9d6", "#fe4fb6"], angle: 45 }, or no colors when there's none
function parseBorder(text) {
    var out = { colors: [], angle: 0 };
    if (typeof text !== "string" || text.length > 65536) return out;
    var lines = text.split("\n");
    for (var i = 0; i < lines.length && i < 400; i++) {
        var line = lines[i];
        // the active border, not the inactive one
        if (!/(^|[^a-z])active_border/.test(line)) continue;
        var re = /rgba?\(\s*([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\s*\)/g;
        var m;
        while ((m = re.exec(line)) !== null && out.colors.length < 6) out.colors.push("#" + m[1].toLowerCase());
        var ang = /angle\s*=\s*(-?[0-9]{1,3})/.exec(line) || /(-?[0-9]{1,3})\s*deg/.exec(line);
        if (ang) out.angle = parseFloat(ang[1]);
        if (out.colors.length > 0) break;
    }
    return out;
}

// a color along a gradient: t from 0 to 1
function sample(colors, t) {
    if (!colors || colors.length === 0) return "";
    if (colors.length === 1) return colors[0];
    var x = Math.max(0, Math.min(1, t)) * (colors.length - 1);
    var i = Math.min(colors.length - 2, Math.floor(x));
    var f = x - i;
    var a = hex(colors[i]), b = hex(colors[i + 1]);
    function h2(n) { var s = Math.round(n).toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + h2(a[0] + (b[0] - a[0]) * f) + h2(a[1] + (b[1] - a[1]) * f) + h2(a[2] + (b[2] - a[2]) * f);
}
function hex(c) {
    return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
}
