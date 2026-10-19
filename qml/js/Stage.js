.pragma library
.import "Draw.js" as D

// Builds `g`, the one object every style in parts/ draws with, and the time parts
// it carries. Used by the widgets on the desktop and by the little tiles in the
// settings, so a style looks the same in both.

// the ISO week number: the week with the year's first Thursday is week 1
function isoWeek(y, mo, d) {
    var date = new Date(Date.UTC(y, mo, d));
    var dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    var firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((date - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}

// the parts of a moment, for a clock showing `offsetMin` minutes off UTC
// (null = the local time)
function timeParts(date, offsetMin) {
    var d = date;
    if (typeof offsetMin === "number" && isFinite(offsetMin))
        d = new Date(date.getTime() + (offsetMin + date.getTimezoneOffset()) * 60000);
    var y = d.getFullYear(), mo = d.getMonth(), day = d.getDate();
    var doy = Math.round((Date.UTC(y, mo, day) - Date.UTC(y, 0, 1)) / 86400000) + 1;
    var leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return {
        h: d.getHours(), m: d.getMinutes(), s: d.getSeconds(), ms: d.getMilliseconds(), frac: d.getMilliseconds() / 1000,
        y: y, mo: mo, d: day, wd: d.getDay(), doy: doy, week: isoWeek(y, mo, day),
        dim: new Date(y, mo + 1, 0).getDate(), diy: leap ? 366 : 365,
        stamp: d.getTime()
    };
}

// env: { t, prev, a, o, c: { ink, accent, accent2, bg } as [r, g, b], card (bool),
//        font, weight, fonts: { sans, serif, mono, display, script }, sweep,
//        names: { days, daysShort, months, monthsShort }, data, prevTexts }
function build(ctx, w, h, env) {
    var c = env.c;
    var names = env.names || {};
    return {
        ctx: ctx, w: w, h: h,
        t: env.t, prev: env.prev || env.t, a: typeof env.a === "number" ? env.a : 1,
        o: env.o || {}, data: env.data || {},
        c: c, bg: env.card === true,
        col: function (name, a) { return D.rgba(c[name] || c.ink, typeof a === "number" ? a : 1); },
        font: env.font || "sans-serif", weight: env.weight || 300,
        fonts: env.fonts || { sans: "sans-serif", serif: "serif", mono: "monospace", display: "sans-serif", script: "serif" },
        sweep: env.sweep === true,
        names: {
            day: function (i, short) { var l = short ? names.daysShort : names.days; return l && l[i] ? l[i] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]; },
            month: function (i, short) { var l = short ? names.monthsShort : names.months; return l && l[i] ? l[i] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]; }
        },
        // the text a part showed before the last change (Flip, Odometer): 0 hours, 1 minutes, 2 seconds
        prevText: function (i) { var p = env.prevTexts || []; return typeof p[i] === "string" ? p[i] : ""; },
        tick: env.tick || 0
    };
}
