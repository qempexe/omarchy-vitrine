.pragma library
.import "Util.js" as Util

// Checks one value against a setting's description. Anything odd gives the
// fallback back, so a hand-edited settings.json can never break anything.
//   kind: enum | int | bool | string | multi (a list of options) | screen (a screen's name)

function parseNum(value) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^-?[0-9]{1,15}(\.[0-9]+)?$/.test(value)) return parseFloat(value);
    return NaN;
}

function validHex(s) {
    return typeof s === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);
}

// plain text: no control characters and no < >, and not longer than allowed
function cleanText(value, maxLength) {
    var text = Util.toText(value).replace(/[\u0000-\u001f\u007f<>]/g, "");
    return maxLength ? text.slice(0, maxLength) : text;
}

function value(item, v) {
    if (v === null || v === undefined) return item.fallback;
    if (item.kind === "enum") {
        var t = Util.toText(v);
        return item.options.indexOf(t) !== -1 ? t : item.fallback;
    }
    if (item.kind === "int") {
        var n = parseNum(v);
        if (!isFinite(n)) return item.fallback;
        n = Math.round(n);
        return Math.max(item.min, Math.min(item.max, n));
    }
    if (item.kind === "bool") {
        if (v === true || v === "true") return true;
        if (v === false || v === "false") return false;
        return item.fallback;
    }
    if (item.kind === "multi") {
        if (!Array.isArray(v)) return item.fallback.slice();
        var out = [];
        for (var i = 0; i < v.length && i < 32; i++) {
            var o = Util.toText(v[i]);
            if (item.options.indexOf(o) !== -1 && out.indexOf(o) === -1) out.push(o);
        }
        return out.length > 0 || item.allowEmpty ? out : item.fallback.slice();
    }
    if (item.kind === "color") return validHex(v) ? ("" + v).toLowerCase() : item.fallback;
    if (item.kind === "screen") {
        // "" is the main screen, "*" every screen, anything else a screen's name
        var s = cleanText(v, 64);
        if (s === "*" && item.allowAll === false) return item.fallback;
        return /^[A-Za-z0-9_.\-*:]{0,64}$/.test(s) ? s : item.fallback;
    }
    if (item.kind === "font") {
        var f = cleanText(v, 80);
        return /^[A-Za-z0-9 _.\-]{0,80}$/.test(f) ? f : item.fallback;
    }
    return cleanText(v, item.maxLength || 200);
}
