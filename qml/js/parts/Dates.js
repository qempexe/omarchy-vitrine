.pragma library
.import "../Draw.js" as D

// Date and calendar styles. One entry per tile in a date widget's Style, in the
// order the tiles show. To add one, see CONTRIBUTING.md.
//
// entry fields: key, label, about, aspect (a number or function (o)), draw(g).
// g.t holds the date (y, mo, d, wd, doy, week, dim, diy), g.o the widget's options
// (o.monday: weeks start on Monday), g.names.day(i, short) / g.names.month(i, short).

function weekdayIndex(g, i) { return g.o.monday ? (i + 1) % 7 : i; }   // i-th column -> day of the week
function columnOf(g, wd) { return g.o.monday ? (wd + 6) % 7 : wd; }      // day of the week -> column

// the moon's age in days (0 = new) and the share of it lit
var SYNODIC = 29.530588853;
function moonAge(ms) {
    var ref = Date.UTC(2000, 0, 6, 18, 14);              // a new moon
    var days = (ms - ref) / 86400000;
    var age = days % SYNODIC;
    return age < 0 ? age + SYNODIC : age;
}
function moonName(age) {
    var p = age / SYNODIC;
    if (p < 0.034 || p > 0.966) return "New moon";
    if (p < 0.216) return "Waxing crescent";
    if (p < 0.284) return "First quarter";
    if (p < 0.466) return "Waxing gibbous";
    if (p < 0.534) return "Full moon";
    if (p < 0.716) return "Waning gibbous";
    if (p < 0.784) return "Last quarter";
    return "Waning crescent";
}
// the moon at (cx, cy), lit as it is `age` days after the new moon
function drawMoon(ctx, cx, cy, r, age, lit, dark) {
    var p = age / SYNODIC, k = Math.cos(p * Math.PI * 2);
    D.circle(ctx, cx, cy, r);
    ctx.fillStyle = dark; ctx.fill();
    ctx.save();
    D.circle(ctx, cx, cy, r);
    ctx.clip();
    ctx.beginPath();                                      // the lit half: right while waxing
    if (p < 0.5) ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    else ctx.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fillStyle = lit; ctx.fill();
    var ew = Math.abs(k) * r;                             // the line between day and night
    ctx.beginPath();
    ctx.ellipse(cx - ew, cy - r, ew * 2, r * 2);
    ctx.fillStyle = k > 0 ? dark : lit;
    ctx.fill();
    ctx.restore();
}

var list = [
    { key: "line", label: "One line", about: "One line writes the day and the date.", aspect: 5.2,
      draw: function (g) {
          var str = g.names.day(g.t.wd, false) + ", " + g.t.d + " " + g.names.month(g.t.mo, false);
          var px = Math.min(g.h * 0.72, D.fit(g.ctx, str, g.w * 0.98, 1000, g.weight, g.font));
          D.text(g.ctx, str, g.w / 2, g.h / 2 + px * 0.33, { px: px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
      } },
    { key: "stacked", label: "Stacked", about: "Stacked sets a big day of the month between the weekday and the month.", aspect: 0.9,
      draw: function (g) {
          var ctx = g.ctx;
          var day = g.names.day(g.t.wd, false).toUpperCase(), mon = g.names.month(g.t.mo, false) + " " + g.t.y;
          var big = Math.min(g.h * 0.56 / 0.74, D.fit(ctx, "" + (g.t.d < 10 ? "00" : g.t.d), g.w, 1000, g.weight, g.font));
          var spx = Math.min(g.h * 0.13, D.fit(ctx, day, g.w, 1000, 600, g.font, 0.18));
          var mpx = Math.min(g.h * 0.12, D.fit(ctx, mon, g.w, 1000, 400, g.fonts.serif, 0, true));
          var total = spx * 1.2 + big * 0.74 + mpx * 1.5;
          var y = (g.h - total) / 2;
          D.text(ctx, day, g.w / 2, y + spx * 0.8, { px: spx, weight: 600, family: g.font, base: "alphabetic", color: g.col("accent"), spacing: 0.18 });
          y += spx * 1.2 + big * 0.74 + big * 0.06;
          D.text(ctx, "" + g.t.d, g.w / 2, y, { px: big, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
          D.text(ctx, mon, g.w / 2, y + mpx * 1.35, { px: mpx, weight: 400, family: g.fonts.serif, italic: true, base: "alphabetic", color: g.col("ink", 0.7) });
      } },
    { key: "tearoff", label: "Tear-off", about: "Tear-off is a calendar page: the month on a colored band, the day big under it.", aspect: 0.82,
      draw: function (g) {
          var ctx = g.ctx, w = g.w, h = g.h, r = Math.min(w, h) * 0.06;
          var band = h * 0.26;
          D.roundRect(ctx, 0, h * 0.05, w, h * 0.95, r);
          ctx.fillStyle = g.col("ink", 0.92); ctx.fill();
          ctx.save();
          D.roundRect(ctx, 0, h * 0.05, w, h * 0.95, r);
          ctx.clip();
          ctx.fillStyle = g.col("accent");
          ctx.fillRect(0, h * 0.05, w, band);
          ctx.restore();
          var paper = g.bg ? g.col("bg") : "rgba(20,16,12,1)";
          var mon = g.names.month(g.t.mo, false).toUpperCase();
          var mpx = Math.min(band * 0.5, D.fit(ctx, mon, w * 0.8, 1000, 700, g.font, 0.16));
          D.text(ctx, mon, w / 2, h * 0.05 + band / 2 + mpx * 0.36, { px: mpx, weight: 700, family: g.font, base: "alphabetic", color: paper, spacing: 0.16 });
          var big = Math.min((h * 0.95 - band) * 0.62 / 0.74, D.fit(ctx, "00", w * 0.78, 1000, 700, g.font));
          D.text(ctx, "" + g.t.d, w / 2, h * 0.05 + band + (h * 0.95 - band) * 0.62, { px: big, weight: 700, family: g.font, base: "alphabetic", color: paper });
          var day = g.names.day(g.t.wd, false);
          var dpx = Math.min(h * 0.09, D.fit(ctx, day, w * 0.8, 1000, 400, g.fonts.serif, 0, true));
          D.text(ctx, day, w / 2, h * 0.93, { px: dpx, weight: 400, family: g.fonts.serif, italic: true, base: "alphabetic", color: paper });
          ctx.fillStyle = g.col("ink", 0.75);          // the two rings it hangs from
          for (var i = 0; i < 2; i++) {
              var rx = w * (i === 0 ? 0.3 : 0.7);
              D.roundRect(ctx, rx - w * 0.025, 0, w * 0.05, h * 0.12, w * 0.025);
              ctx.fill();
          }
      } },
    { key: "letter", label: "Letter", about: "Letter writes it out the old way: Friday, the sixteenth of October.", aspect: 2.6,
      draw: function (g) {
          var ctx = g.ctx, day = g.names.day(g.t.wd, false);
          var rest = "the " + D.ordinalWord(g.t.d) + " of " + g.names.month(g.t.mo, false);
          var fam = g.fonts.serif;
          var px = Math.min(g.h * 0.5, D.fit(ctx, day, g.w, 1000, 500, fam, 0, true));
          var px2 = Math.min(px * 0.42, D.fit(ctx, rest, g.w, 1000, 400, fam, 0.02));
          var total = px * 0.9 + px2 * 1.6;
          var y = (g.h - total) / 2 + px * 0.82;
          D.text(ctx, day, g.w / 2, y, { px: px, weight: 500, family: fam, italic: true, base: "alphabetic", color: g.col("ink") });
          D.text(ctx, rest, g.w / 2, y + px2 * 1.55, { px: px2, weight: 400, family: fam, base: "alphabetic", color: g.col("accent"), spacing: 0.02 });
      } },
    { key: "iso", label: "ISO", about: "ISO is the date as numbers, with the week and the day of the year under it.", aspect: 3.4,
      draw: function (g) {
          var ctx = g.ctx, str = g.t.y + "-" + D.pad2(g.t.mo + 1) + "-" + D.pad2(g.t.d);
          var sub = "W" + D.pad2(g.t.week) + "  ·  D" + g.t.doy + "  ·  " + g.names.day(g.t.wd, true).toUpperCase();
          var fam = g.fonts.mono;
          var px = Math.min(g.h * 0.55, D.fit(ctx, str, g.w, 1000, 400, fam));
          var spx = Math.min(px * 0.36, D.fit(ctx, sub, g.w, 1000, 400, fam, 0.08));
          var y = (g.h - px * 0.74 - spx * 1.8) / 2 + px * 0.74;
          D.text(ctx, str, g.w / 2, y, { px: px, weight: 400, family: fam, base: "alphabetic", color: g.col("ink") });
          D.text(ctx, sub, g.w / 2, y + spx * 1.8, { px: spx, weight: 400, family: fam, base: "alphabetic", color: g.col("accent"), spacing: 0.08 });
      } },
    { key: "week", label: "Week", about: "Week shows the seven days of this week, today marked.", aspect: 3.2,
      draw: function (g) {
          var ctx = g.ctx, cw = g.w / 7;
          var todayCol = columnOf(g, g.t.wd);
          var lpx = Math.min(g.h * 0.24, cw * 0.36), npx = Math.min(g.h * 0.36, cw * 0.48);
          for (var i = 0; i < 7; i++) {
              var wd = weekdayIndex(g, i), x = i * cw + cw / 2;
              var day = new Date(g.t.y, g.t.mo, g.t.d + (i - todayCol));
              var today = i === todayCol;
              if (today) {
                  D.roundRect(ctx, x - cw * 0.42, g.h * 0.04, cw * 0.84, g.h * 0.92, cw * 0.2);
                  ctx.fillStyle = g.col("accent"); ctx.fill();
              }
              var ink = today ? (g.bg ? g.col("bg") : "rgba(16,12,10,1)") : g.col("ink", wd === 0 || wd === 6 ? 0.5 : 0.85);
              D.text(ctx, g.names.day(wd, true).charAt(0).toUpperCase() + g.names.day(wd, true).slice(1, 2), x, g.h * 0.36, { px: lpx, weight: 600, family: g.font, base: "alphabetic", color: ink });
              D.text(ctx, "" + day.getDate(), x, g.h * 0.36 + npx * 1.25, { px: npx, weight: today ? 700 : g.weight, family: g.font, base: "alphabetic", color: ink });
          }
      } },
    { key: "month", label: "Month", about: "Month is this month's calendar, today circled.", aspect: 1.12,
      draw: function (g) {
          var ctx = g.ctx, t = g.t;
          var head = g.names.month(t.mo, false) + " " + t.y;
          var hpx = Math.min(g.h * 0.1, D.fit(ctx, head, g.w, 1000, 600, g.font));
          D.text(ctx, head, 0, hpx * 0.85, { px: hpx, weight: 600, family: g.font, align: "left", base: "alphabetic", color: g.col("ink") });
          var first = new Date(t.y, t.mo, 1).getDay();
          var startCol = columnOf(g, first);
          var rows = Math.ceil((startCol + t.dim) / 7);
          var top = hpx * 1.6, cw = g.w / 7, ch = (g.h - top) / (rows + 1);
          var px = Math.min(ch * 0.5, cw * 0.42);
          for (var c = 0; c < 7; c++) {
              var wd = weekdayIndex(g, c);
              D.text(ctx, g.names.day(wd, true).charAt(0).toUpperCase(), c * cw + cw / 2, top + ch * 0.6, { px: px * 0.85, weight: 600, family: g.font, base: "alphabetic", color: g.col("accent", 0.85) });
          }
          for (var d = 1; d <= t.dim; d++) {
              var idx = startCol + d - 1, col = idx % 7, row = Math.floor(idx / 7) + 1;
              var x = col * cw + cw / 2, y = top + row * ch + ch / 2;
              var wdd = weekdayIndex(g, col), today = d === t.d;
              if (today) {
                  ctx.fillStyle = g.col("accent");
                  D.circle(ctx, x, y, Math.min(cw, ch) * 0.44); ctx.fill();
              }
              D.text(ctx, "" + d, x, y + px * 0.36, { px: px, weight: today ? 700 : g.weight + 100, family: g.font, base: "alphabetic",
                  color: today ? (g.bg ? g.col("bg") : "rgba(16,12,10,1)") : g.col("ink", wdd === 0 || wdd === 6 ? 0.45 : 0.9) });
          }
      } },
    { key: "year", label: "Year dots", about: "Year dots is the whole year, a row of dots for each month: the days gone are filled in.", aspect: 2.5,
      draw: function (g) {
          var ctx = g.ctx, t = g.t;
          var lw = g.w * 0.07, cell = Math.min((g.w - lw) / 31, g.h / 12.6);
          var x0 = (g.w - lw - cell * 31) / 2 + lw, y0 = (g.h - cell * 12) / 2;
          for (var m = 0; m < 12; m++) {
              var dim = new Date(t.y, m + 1, 0).getDate();
              D.text(ctx, g.names.month(m, true).charAt(0).toUpperCase(), x0 - lw * 0.6, y0 + m * cell + cell / 2 + cell * 0.25,
                     { px: cell * 0.7, weight: 600, family: g.font, base: "alphabetic", color: g.col("ink", m === t.mo ? 1 : 0.45) });
              for (var d = 1; d <= dim; d++) {
                  var past = m < t.mo || (m === t.mo && d < t.d), today = m === t.mo && d === t.d;
                  ctx.fillStyle = today ? g.col("accent") : (past ? g.col("ink", 0.7) : g.col("ink", 0.12));
                  D.circle(ctx, x0 + (d - 1) * cell + cell / 2, y0 + m * cell + cell / 2, cell * (today ? 0.42 : 0.3));
                  ctx.fill();
              }
          }
      } },
    { key: "progress", label: "Progress", about: "Progress shows how far through the year, the month, the week and the day you are.", aspect: 2.1,
      draw: function (g) {
          var ctx = g.ctx, t = g.t;
          var dayF = (t.h + t.m / 60) / 24;
          var rows = [["Year", (t.doy - 1 + dayF) / t.diy], ["Month", (t.d - 1 + dayF) / t.dim],
                      ["Week", (columnOf(g, t.wd) + dayF) / 7], ["Day", dayF]];
          var rh = g.h / 4.3, lpx = Math.min(rh * 0.42, g.w * 0.07);
          var lw = D.width(ctx, "Month", lpx, 500, g.font) + lpx, vw = D.width(ctx, "100%", lpx, 500, g.font) + lpx * 0.6;
          for (var i = 0; i < 4; i++) {
              var y = i * rh * 1.1 + rh / 2;
              D.text(ctx, rows[i][0], 0, y + lpx * 0.36, { px: lpx, weight: 500, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.8) });
              var bw = g.w - lw - vw, bh = Math.max(3, rh * 0.22);
              D.roundRect(ctx, lw, y - bh / 2, bw, bh, bh / 2);
              ctx.fillStyle = g.col("ink", 0.1); ctx.fill();
              D.roundRect(ctx, lw, y - bh / 2, Math.max(bh, bw * rows[i][1]), bh, bh / 2);
              ctx.fillStyle = i === 0 ? g.col("accent") : g.col("ink", 0.8 - i * 0.12); ctx.fill();
              D.text(ctx, Math.floor(rows[i][1] * 100) + "%", g.w, y + lpx * 0.36, { px: lpx, weight: 500, family: g.font, align: "right", base: "alphabetic", color: g.col("ink") });
          }
      } },
    { key: "moon", label: "Moon", about: "Moon shows tonight's moon, lit the way it is, with the date beside it.", aspect: 2.4,
      draw: function (g) {
          var ctx = g.ctx, age = moonAge(g.t.stamp || Date.now());
          var r = Math.min(g.h * 0.46, g.w * 0.2);
          drawMoon(ctx, r + g.h * 0.04, g.h / 2, r, age, g.col("ink", 0.92), g.col("ink", 0.1));
          var x = r * 2 + g.h * 0.2, room = g.w - x;
          var name = moonName(age), date = g.names.day(g.t.wd, false) + " " + g.t.d + " " + g.names.month(g.t.mo, true);
          var px = Math.min(g.h * 0.24, D.fit(ctx, name, room, 1000, 400, g.fonts.serif, 0, true));
          var px2 = Math.min(px * 0.6, D.fit(ctx, date, room, 1000, 500, g.font, 0.06));
          D.text(ctx, name, x, g.h / 2 - px * 0.05, { px: px, weight: 400, family: g.fonts.serif, italic: true, align: "left", base: "alphabetic", color: g.col("ink") });
          D.text(ctx, date, x, g.h / 2 + px2 * 1.5, { px: px2, weight: 500, family: g.font, align: "left", base: "alphabetic", color: g.col("accent"), spacing: 0.06 });
      } }
];

var byKey = {};
for (var i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
