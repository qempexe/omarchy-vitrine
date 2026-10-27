.pragma library

// Small drawing tools shared by every style in parts/. A style draws on a Canvas
// through `g` (see CONTRIBUTING.md) and can use any of these.

// ---- colors ------------------------------------------------------------------------

// a css color from [r, g, b] (0 to 255) and an alpha
function rgba(c, a) {
    if (!c || c.length < 3) return "rgba(0,0,0,0)";
    const al = typeof a === "number" ? Math.max(0, Math.min(1, a)) : 1;
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + al + ")";
}
// c mixed toward d by t (0 = c, 1 = d)
function mix(c, d, t) {
    return [c[0] + (d[0] - c[0]) * t, c[1] + (d[1] - c[1]) * t, c[2] + (d[2] - c[2]) * t];
}

// ---- numbers and words --------------------------------------------------------------

function pad2(n) { n = Math.floor(n); return n < 10 ? "0" + n : "" + n; }
function hour12(h) { const x = h % 12; return x === 0 ? 12 : x; }

var ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
            "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
var tens = ["", "", "twenty", "thirty", "forty", "fifty"];
function numberWord(n) {
    n = Math.floor(n);
    if (n < 20) return ones[n];
    if (n < 60) return tens[Math.floor(n / 10)] + (n % 10 ? "-" + ones[n % 10] : "");
    return "" + n;
}
var ordinalWords = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
                    "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth",
                    "eighteenth", "nineteenth", "twentieth"];
function ordinalWord(n) {
    if (n <= 20) return ordinalWords[n];
    if (n === 30) return "thirtieth";
    const t = n < 30 ? "twenty" : "thirty";
    return t + "-" + ordinalWords[n % 10];
}
function ordinal(n) {
    const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] || "th");
    return n + s;
}
function roman(n) {
    const v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const r = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
    let out = "";
    n = Math.floor(n);
    if (n <= 0) return "N";
    for (let i = 0; i < v.length; i++) while (n >= v[i]) { out += r[i]; n -= v[i]; }
    return out;
}

// the time in words, to the minute: ["twenty-two", "past", "four"] style parts
// { lead: "It's", main: "twenty past", hour: "four" }
function timeWords(h, m) {
    const hourNow = hour12(h), hourNext = hour12(h + 1);
    if (m === 0) return { lead: "It's", main: numberWord(hourNow), hour: "o'clock" };
    if (m === 15) return { lead: "It's", main: "quarter past", hour: numberWord(hourNow) };
    if (m === 30) return { lead: "It's", main: "half past", hour: numberWord(hourNow) };
    if (m === 45) return { lead: "It's", main: "quarter to", hour: numberWord(hourNext) };
    if (m < 30) return { lead: "It's", main: numberWord(m) + (m === 1 ? " minute" : "") + " past", hour: numberWord(hourNow) };
    const left = 60 - m;
    return { lead: "It's", main: numberWord(left) + (left === 1 ? " minute" : "") + " to", hour: numberWord(hourNext) };
}

// roughly, in words, to the nearest five minutes: "almost half past four"
function roughWords(h, m) {
    let five = Math.round(m / 5) * 5;
    const diff = m - five;
    const hedge = diff < 0 ? "almost " : (diff > 0 ? "just after " : "");
    if (five === 60) { five = 0; h += 1; }
    const hourNow = numberWord(hour12(h)), hourNext = numberWord(hour12(h + 1));
    let main;
    if (five === 0) main = hourNow + " o'clock";
    else if (five === 15) main = "a quarter past " + hourNow;
    else if (five === 30) main = "half past " + hourNow;
    else if (five === 45) main = "a quarter to " + hourNext;
    else if (five < 30) main = numberWord(five) + " past " + hourNow;
    else main = numberWord(60 - five) + " to " + hourNext;
    return hedge + main;
}

// ---- text ----------------------------------------------------------------------------

function fontString(px, weight, family, italic) {
    return (italic ? "italic " : "") + Math.round(weight || 400) + " " + Math.max(1, Math.round(px)) + "px '" + (family || "sans-serif") + "'";
}
function setFont(ctx, px, weight, family, italic) { ctx.font = fontString(px, weight, family, italic); }

// width of text at px, with extra spacing between letters (as a part of px)
function width(ctx, str, px, weight, family, spacing, italic) {
    setFont(ctx, px, weight, family, italic);
    let w = ctx.measureText(str).width;
    if (spacing) w += Math.max(0, str.length - 1) * spacing * px;
    return w;
}

// the biggest size (up to maxPx) at which text fits in maxW
function fit(ctx, str, maxW, maxPx, weight, family, spacing, italic) {
    if (!str) return maxPx;
    const w = width(ctx, str, 100, weight, family, spacing, italic);
    if (w <= 0) return maxPx;
    return Math.max(4, Math.min(maxPx, 100 * maxW / w));
}

// text at x, y. o: { px, weight, family, italic, align: "left" | "center" | "right",
// base: "middle" | "alphabetic" | "top" | "bottom", color, spacing (part of px) }
function text(ctx, str, x, y, o) {
    o = o || {};
    const px = o.px || 16;
    setFont(ctx, px, o.weight, o.family, o.italic);
    ctx.fillStyle = o.color || "white";
    ctx.textBaseline = o.base || "middle";
    const sp = (o.spacing || 0) * px;
    if (!sp) {
        ctx.textAlign = o.align || "center";
        ctx.fillText(str, x, y);
        return;
    }
    // letter by letter, for spacing
    const total = ctx.measureText(str).width + Math.max(0, str.length - 1) * sp;
    let cx = o.align === "right" ? x - total : (o.align === "left" ? x : x - total / 2);
    ctx.textAlign = "left";
    for (let i = 0; i < str.length; i++) {
        const ch = str.charAt(i);
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + sp;
    }
}

// ---- shapes --------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2, false); }

// an arc from a to b (0 = top, 1 = all the way round, clockwise)
function arc(ctx, cx, cy, r, a, b, width, color, cap) {
    if (b - a <= 0) return;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2 + a * Math.PI * 2, -Math.PI / 2 + b * Math.PI * 2, false);
    ctx.lineWidth = width;
    ctx.lineCap = cap || "round";
    ctx.strokeStyle = color;
    ctx.stroke();
}

// a point on a dial: turn 0 = 12 o'clock, 1 = all the way round
function onDial(cx, cy, r, turn) {
    const a = turn * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

// a clock hand: from `tail` behind the center to `len` out, `w` wide at the root,
// `tip` wide at the end
function hand(ctx, cx, cy, turn, len, tail, w, tip, color) {
    const a = turn * Math.PI * 2 - Math.PI / 2;
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    ctx.beginPath();
    ctx.moveTo(cx - ux * tail + nx * w / 2, cy - uy * tail + ny * w / 2);
    ctx.lineTo(cx + ux * len + nx * tip / 2, cy + uy * len + ny * tip / 2);
    ctx.lineTo(cx + ux * len - nx * tip / 2, cy + uy * len - ny * tip / 2);
    ctx.lineTo(cx - ux * tail - nx * w / 2, cy - uy * tail - ny * w / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

// n marks round a dial, from r - len to r
function ticks(ctx, cx, cy, r, n, len, w, color, skipEvery) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        if (skipEvery && i % skipEvery === 0) continue;
        const a = onDial(cx, cy, r, i / n), b = onDial(cx, cy, r - len, i / n);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
}

// ---- digits made of parts ---------------------------------------------------------------

//   a
// f   b
//   g
// e   c
//   d
var segs = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
             "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "" };
// one seven-segment digit in a w x h box; segments that are off are drawn in `off`
function seg7(ctx, ch, x, y, w, h, t, on, off, slant) {
    const lit = segs[ch] !== undefined ? segs[ch] : "";
    const all = "abcdefg";
    const hh = h / 2, k = slant || 0;
    function sk(px, py) { return [px + (h - (py - y)) * k, py]; }
    function piece(name) {
        const g = t * 0.5;
        let pts;
        if (name === "a") pts = [[x + g, y], [x + w - g, y], [x + w - t, y + t], [x + t, y + t]];
        else if (name === "d") pts = [[x + t, y + h - t], [x + w - t, y + h - t], [x + w - g, y + h], [x + g, y + h]];
        else if (name === "g") pts = [[x + t, y + hh - t / 2], [x + w - t, y + hh - t / 2], [x + w - g, y + hh], [x + w - t, y + hh + t / 2], [x + t, y + hh + t / 2], [x + g, y + hh]];
        else if (name === "f") pts = [[x, y + g], [x + t, y + t], [x + t, y + hh - t / 2], [x, y + hh - g / 2]];
        else if (name === "b") pts = [[x + w, y + g], [x + w, y + hh - g / 2], [x + w - t, y + hh - t / 2], [x + w - t, y + t]];
        else if (name === "e") pts = [[x, y + hh + g / 2], [x + t, y + hh + t / 2], [x + t, y + h - t], [x, y + h - g]];
        else pts = [[x + w, y + hh + g / 2], [x + w, y + h - g], [x + w - t, y + h - t], [x + w - t, y + hh + t / 2]];
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const p = sk(pts[i][0], pts[i][1]);
            if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        }
        ctx.closePath();
        ctx.fill();
    }
    for (let i = 0; i < all.length; i++) {
        const n = all.charAt(i), isOn = lit.indexOf(n) !== -1;
        if (!isOn && !off) continue;
        ctx.fillStyle = isOn ? on : off;
        piece(n);
    }
}

// 5 x 7 dot glyphs, a row of five bits each, top to bottom
var dots5x7 = {
    "0": [14, 17, 19, 21, 25, 17, 14], "1": [4, 12, 4, 4, 4, 4, 14], "2": [14, 17, 1, 2, 4, 8, 31],
    "3": [31, 2, 4, 2, 1, 17, 14], "4": [2, 6, 10, 18, 31, 2, 2], "5": [31, 16, 30, 1, 1, 17, 14],
    "6": [6, 8, 16, 30, 17, 17, 14], "7": [31, 1, 2, 4, 8, 8, 8], "8": [14, 17, 17, 14, 17, 17, 14],
    "9": [14, 17, 17, 15, 1, 2, 12], ":": [0, 12, 12, 0, 12, 12, 0], " ": [0, 0, 0, 0, 0, 0, 0],
    "-": [0, 0, 0, 31, 0, 0, 0]
};
// one glyph, each dot `cell` apart; dots that are off are drawn in `off`
function dotGlyph(ctx, ch, x, y, cell, on, off, round) {
    const rows = dots5x7[ch] || dots5x7[" "];
    const cols = ch === ":" ? [1, 2] : [0, 1, 2, 3, 4];
    for (let r = 0; r < 7; r++) {
        for (let ci = 0; ci < cols.length; ci++) {
            const c = cols[ci];
            const isOn = (rows[r] >> (4 - c)) & 1;
            if (!isOn && !off) continue;
            ctx.fillStyle = isOn ? on : off;
            const px = x + (ch === ":" ? ci : c) * cell + cell / 2, py = y + r * cell + cell / 2;
            if (round !== false) { circle(ctx, px, py, cell * 0.38); ctx.fill(); }
            else ctx.fillRect(px - cell * 0.4, py - cell * 0.4, cell * 0.8, cell * 0.8);
        }
    }
}
// how many dot columns a glyph takes
function dotCols(ch) { return ch === ":" ? 2 : 5; }

// ---- motion --------------------------------------------------------------------------

function ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOut(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }
