.pragma library
.import "../Draw.js" as D

// Clock faces. One entry per tile in a clock's Style, in the order the tiles show.
// To add one, see CONTRIBUTING.md.
//
// entry fields:
//   key, label      the saved value and the name on the tile
//   about           one sentence for the settings hint
//   aspect          width / height of the face, a number or function (o) for faces
//                   that grow when seconds show
//   seconds         false when the face never shows seconds (the setting is greyed out)
//   sweep           true when the face can sweep its second hand smoothly
//   animMs          how long the face animates after the time changes (Flip, Odometer)
//   draw(g)         draws the face in g.w x g.h (see CONTRIBUTING.md for g)

// ---- shared bits -------------------------------------------------------------------

function hh(g) {
    const h = g.o.h24 ? g.t.h : D.hour12(g.t.h);
    return g.o.lead ? D.pad2(h) : "" + h;
}
function mm(g) { return D.pad2(g.t.m); }
function ss(g) { return D.pad2(g.t.s); }
function ampm(g) { return g.o.h24 ? "" : (g.t.h < 12 ? "AM" : "PM"); }
// the colon dims every other second when Blink is on
function colonAlpha(g) { return g.o.blink && g.t.s % 2 === 1 ? 0.22 : 1; }
// where the digits' baseline goes to sit them in the middle of the height
function midBase(y, px) { return y + px * 0.355; }

// HH:MM(:SS) as pieces, so the colons can blink and take the accent
function pieces(g, sec) {
    const out = [hh(g), ":", mm(g)];
    if (sec) { out.push(":"); out.push(ss(g)); }
    return out;
}
function drawPieces(g, list, cx, y, px, weight, family, ink, colonInk, spacing) {
    const ctx = g.ctx;
    let total = 0;
    const widths = [];
    for (let i = 0; i < list.length; i++) {
        const w = D.width(ctx, list[i], px, weight, family, spacing);
        widths.push(w);
        total += w + (i < list.length - 1 ? px * (spacing || 0) : 0);
    }
    let x = cx - total / 2;
    for (let j = 0; j < list.length; j++) {
        const isColon = list[j] === ":";
        ctx.globalAlpha = isColon ? colonAlpha(g) : 1;
        D.text(ctx, list[j], x, y, { px, weight, family, align: "left", base: "alphabetic",
                                      color: isColon ? colonInk : ink, spacing });
        x += widths[j] + px * (spacing || 0);
    }
    ctx.globalAlpha = 1;
}

// the three hands of an analog clock: hour, minute, second turns (0 to 1)
function turns(g) {
    const t = g.t, sec = t.s + (g.sweep ? t.frac : 0);
    return { h: ((t.h % 12) + t.m / 60 + t.s / 3600) / 12, m: (t.m + sec / 60) / 60, s: sec / 60 };
}
function dial(g) { const r = Math.min(g.w, g.h) / 2; return { cx: g.w / 2, cy: g.h / 2, r }; }

// ---- the letter grid ---------------------------------------------------------------

var gridRows = ["ITXISZHALFQ", "TENQUARTERK", "TWENTYFIVEX", "MINUTESTOPW", "PASTRONESIX",
                "FOURFIVETWO", "THREEEIGHTX", "ELEVENSEVEN", "TWELVENINEQ", "TENSEOCLOCK"];
// [row, from, to] for each word
var gridWords = {
    it: [0, 0, 1], is: [0, 3, 4], half: [0, 6, 9], tenM: [1, 0, 2], quarter: [1, 3, 9], twenty: [2, 0, 5],
    fiveM: [2, 6, 9], minutes: [3, 0, 6], to: [3, 7, 8], past: [4, 0, 3], oclock: [9, 5, 10],
    h1: [4, 5, 7], h6: [4, 8, 10], h4: [5, 0, 3], h5: [5, 4, 7], h2: [5, 8, 10], h3: [6, 0, 4], h8: [6, 5, 9],
    h11: [7, 0, 5], h7: [7, 6, 10], h12: [8, 0, 5], h9: [8, 6, 9], h10: [9, 0, 2]
};
function gridLit(h, m) {
    const m5 = Math.floor(m / 5) * 5;
    const words = ["it", "is"];
    let hour = D.hour12(h);
    if (m5 > 30) hour = D.hour12(h + 1);
    if (m5 === 0) words.push("oclock");
    else if (m5 === 15 || m5 === 45) words.push("quarter");
    else if (m5 === 30) words.push("half");
    else {
        const k = m5 > 30 ? 60 - m5 : m5;
        if (k === 5) words.push("fiveM");
        if (k === 10) words.push("tenM");
        if (k === 20) words.push("twenty");
        if (k === 25) { words.push("twenty"); words.push("fiveM"); }
        words.push("minutes");
    }
    if (m5 !== 0) words.push(m5 > 30 ? "to" : "past");
    words.push("h" + hour);
    const lit = {};
    for (let i = 0; i < words.length; i++) {
        const w = gridWords[words[i]];
        for (let c = w[1]; c <= w[2]; c++) lit[w[0] * 11 + c] = true;
    }
    return lit;
}

// ---- the faces ---------------------------------------------------------------------

var list = [
    { key: "plain", label: "Plain", about: "Plain is the time and nothing else, as big as it fits.",
      aspect(o) { return o.seconds ? 3.5 : 2.5; }, sweep: false,
      draw(g) {
          const list = pieces(g, g.o.seconds), str = list.join("");
          const px = D.fit(g.ctx, str, g.w * 0.98, g.h / 0.74, g.weight, g.font, 0.0);
          drawPieces(g, list, g.w / 2, midBase(g.h / 2, px), px, g.weight, g.font, g.col("ink"), g.col("ink"), 0);
      } },
    { key: "stacked", label: "Stacked", about: "Stacked puts the minutes under the hours.", seconds: false,
      aspect: 1.0,
      draw(g) {
          const ctx = g.ctx, a = hh(g), b = mm(g);
          const px = Math.min(D.fit(ctx, "00", g.w * 0.98, 1000, g.weight, g.font), g.h * 0.96 / (0.73 * 2 + 0.12));
          const gap = px * 0.12;
          D.text(ctx, a, g.w / 2, g.h / 2 - gap / 2, { px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
          D.text(ctx, b, g.w / 2, g.h / 2 + gap / 2 + px * 0.73, { px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("accent") });
      } },
    { key: "sidecar", label: "Sidecar", about: "Sidecar keeps the seconds and AM or PM small beside the time.",
      aspect: 3.1,
      draw(g) {
          const ctx = g.ctx, list = pieces(g, false), str = list.join("");
          const side = g.w * 0.2;
          const px = Math.min(D.fit(ctx, str, g.w - side - g.h * 0.12, 1000, g.weight, g.font), g.h / 0.74);
          const tw = D.width(ctx, str, px, g.weight, g.font);
          const x0 = (g.w - tw - side) / 2;
          drawPieces(g, list, x0 + tw / 2, midBase(g.h / 2, px), px, g.weight, g.font, g.col("ink"), g.col("accent"), 0);
          const sx = x0 + tw + g.h * 0.12, top = g.h / 2 - px * 0.37;
          const small = px * 0.36;
          if (g.o.seconds) D.text(ctx, ss(g), sx, top + small * 0.74, { px: small, weight: g.weight, family: g.font, align: "left", base: "alphabetic", color: g.col("accent") });
          const under = g.o.h24 ? g.names.day(g.t.wd, true).toUpperCase() : ampm(g);
          D.text(ctx, under, sx, g.h / 2 + px * 0.36, { px: small * 0.62, weight: 600, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.55), spacing: 0.12 });
      } },
    { key: "editorial", label: "Editorial", about: "Editorial sets a huge hour beside the minutes and the day, like a magazine cover.",
      seconds: false, aspect: 1.75,
      draw(g) {
          const ctx = g.ctx, hour = hh(g);
          const big = Math.min(g.h / 0.74, D.fit(ctx, hour, g.w * 0.58, 1000, g.weight, g.font));
          const hw = D.width(ctx, hour, big, g.weight, g.font);
          D.text(ctx, hour, 0, midBase(g.h / 2, big), { px: big, weight: g.weight, family: g.font, align: "left", base: "alphabetic", color: g.col("ink") });
          const rx = hw + big * 0.08, room = g.w - rx;
          const mpx = Math.min(big * 0.45, D.fit(ctx, mm(g), room, 1000, g.weight, g.font));
          const top = g.h / 2 - big * 0.37;
          D.text(ctx, mm(g), rx, top + mpx * 0.74, { px: mpx, weight: g.weight, family: g.font, align: "left", base: "alphabetic", color: g.col("accent") });
          const day = g.names.day(g.t.wd, false), date = g.t.d + " " + g.names.month(g.t.mo, false);
          const lpx = Math.min(big * 0.13, D.fit(ctx, day.toUpperCase(), room, 1000, 600, g.font, 0.14));
          D.text(ctx, day.toUpperCase(), rx + 1, g.h / 2 + big * 0.12, { px: lpx, weight: 600, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.85), spacing: 0.14 });
          const dpx = Math.min(lpx * 0.95, D.fit(ctx, date, room - 2, 1000, 400, g.fonts.serif, 0, true));
          D.text(ctx, date, rx + 1, g.h / 2 + big * 0.12 + lpx * 1.5, { px: dpx, weight: 400, family: g.fonts.serif, italic: true, align: "left", base: "alphabetic", color: g.col("ink", 0.6) });
          ctx.fillStyle = g.col("accent", 0.8);
          const ruleY = (top + mpx * 0.74 + g.h / 2 + big * 0.12 - lpx * 0.74) / 2;
          ctx.fillRect(rx + 1, ruleY, Math.min(room * 0.6, mpx * 1.2), Math.max(1, big * 0.012));
      } },
    { key: "words", label: "In words", about: "In words spells the time out, to the minute.", seconds: false,
      aspect: 1.9,
      draw(g) {
          const ctx = g.ctx, w = D.timeWords(g.t.h, g.t.m);
          const lines = [w.lead, w.main, w.hour];
          let px2 = Math.min(g.h * 0.3, D.fit(ctx, w.main, g.w, 1000, g.weight, g.font));
          let px3 = Math.min(g.h * 0.38, D.fit(ctx, w.hour, g.w, 1000, Math.min(900, g.weight + 400), g.font));
          let px1 = px2 * 0.5;
          const total = px1 * 1.2 + px2 * 1.1 + px3 * 0.98;
          const scale = Math.min(1, g.h / total);
          px1 *= scale; px2 *= scale; px3 *= scale;
          let y = (g.h - total * scale) / 2;
          D.text(ctx, lines[0], 0, y + px1 * 1.02, { px: px1, weight: 500, family: g.fonts.serif, italic: true, align: "left", base: "alphabetic", color: g.col("accent") });
          y += px1 * 1.2;
          D.text(ctx, lines[1], 0, y + px2 * 0.82, { px: px2, weight: g.weight, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.8) });
          y += px2 * 1.1;
          D.text(ctx, lines[2], 0, y + px3 * 0.76, { px: px3, weight: Math.min(900, g.weight + 400), family: g.font, align: "left", base: "alphabetic", color: g.col("ink") });
      } },
    { key: "rough", label: "Roughly", about: "Roughly says it the way a person would: almost half past four.", seconds: false,
      aspect: 2.6,
      draw(g) {
          const ctx = g.ctx, phrase = D.roughWords(g.t.h, g.t.m);
          const words = phrase.split(" ");
          let best = 1;
          let bestDiff = 1e9;
          for (let i = 1; i < words.length; i++) {
              const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
              const diff = Math.abs(a.length - b.length);
              if (diff < bestDiff) { bestDiff = diff; best = i; }
          }
          let l1 = words.slice(0, best).join(" "), l2 = words.slice(best).join(" ");
          if (words.length < 3) { l1 = phrase; l2 = ""; }
          const fam = g.fonts.serif;
          const px = Math.min(g.h * (l2 ? 0.4 : 0.58), D.fit(ctx, l1.length > l2.length ? l1 : l2, g.w * 0.96, 1000, 400, fam, 0, true));
          const y = g.h / 2 - (l2 ? px * 0.55 : -px * 0.3);
          D.text(ctx, l1, g.w / 2, y, { px, weight: 400, family: fam, italic: true, base: "alphabetic", color: g.col("ink") });
          if (l2) D.text(ctx, l2, g.w / 2, y + px * 1.1, { px, weight: 400, family: fam, italic: true, base: "alphabetic", color: g.col("accent") });
      } },
    { key: "grid", label: "Letter grid", about: "Letter grid lights up the words in a square of letters. The dots count the minutes past each five.",
      seconds: false, aspect: 1.08,
      draw(g) {
          const ctx = g.ctx, lit = gridLit(g.t.h, g.t.m);
          const cell = Math.min(g.w / 11.4, g.h / 10.8);
          const x0 = (g.w - cell * 11) / 2, y0 = (g.h - cell * 10) / 2;
          const px = cell * 0.62;
          D.setFont(ctx, px, 500, g.font);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          for (let r = 0; r < 10; r++) {
              for (let c = 0; c < 11; c++) {
                  const on = lit[r * 11 + c] === true;
                  ctx.fillStyle = on ? g.col("ink") : g.col("ink", 0.11);
                  ctx.fillText(gridRows[r].charAt(c), x0 + c * cell + cell / 2, y0 + r * cell + cell / 2);
              }
          }
          const extra = g.t.m % 5;
          const corners = [[x0 - cell * 0.12, y0 - cell * 0.12], [x0 + cell * 11 + cell * 0.12, y0 - cell * 0.12],
                         [x0 + cell * 11 + cell * 0.12, y0 + cell * 10 + cell * 0.12], [x0 - cell * 0.12, y0 + cell * 10 + cell * 0.12]];
          for (let k = 0; k < 4; k++) {
              ctx.fillStyle = k < extra ? g.col("accent") : g.col("ink", 0.1);
              D.circle(ctx, corners[k][0], corners[k][1], Math.max(1.2, cell * 0.09));
              ctx.fill();
          }
      } },
    { key: "binary", label: "Binary", about: "Binary shows each digit as a column of lights, read from the bottom up: 1, 2, 4, 8.",
      aspect(o) { return o.seconds ? 1.75 : 1.2; },
      draw(g) {
          const ctx = g.ctx, h = g.o.h24 ? g.t.h : D.hour12(g.t.h);
          const digits = [Math.floor(h / 10), h % 10, Math.floor(g.t.m / 10), g.t.m % 10];
          const bits = [2, 4, 3, 4];
          if (g.o.seconds) { digits.push(Math.floor(g.t.s / 10)); digits.push(g.t.s % 10); bits.push(3); bits.push(4); }
          const groups = digits.length / 2, cols = digits.length;
          const cell = Math.min(g.w / (cols + (groups - 1) * 0.6 + 0.2), g.h / 5.1);
          let x = (g.w - (cols * cell + (groups - 1) * cell * 0.6)) / 2;
          const y0 = (g.h - cell * 5) / 2;
          for (let i = 0; i < cols; i++) {
              const cx = x + cell / 2;
              for (let b = 0; b < 4; b++) {
                  const cy = y0 + (3 - b) * cell + cell / 2;
                  if (b >= bits[i]) continue;
                  const on = (digits[i] >> b) & 1;
                  D.circle(ctx, cx, cy, cell * 0.34);
                  if (on) { ctx.fillStyle = i < 2 ? g.col("ink") : g.col("accent"); ctx.fill(); }
                  else { ctx.lineWidth = Math.max(1, cell * 0.05); ctx.strokeStyle = g.col("ink", 0.2); ctx.stroke(); }
              }
              D.text(ctx, "" + digits[i], cx, y0 + cell * 4.55, { px: cell * 0.42, weight: 500, family: g.font, color: g.col("ink", 0.45) });
              x += cell + (i % 2 === 1 ? cell * 0.6 : 0);
          }
      } },
    { key: "lcd", label: "LCD", about: "LCD draws digits from seven segments, with the unlit ones faintly there.",
      aspect(o) { return o.seconds ? 4.4 : 3.0; },
      draw(g) {
          const ctx = g.ctx;
          let str = hh(g) + mm(g) + (g.o.seconds ? ss(g) : "");
          if (str.length === 3 || str.length === 5) str = " " + str;
          const n = str.length, groups = n / 2, slant = 0.08;
          // in units of the digit height: digit 0.5, gap 0.16, colon room 0.34, plus the slant
          const units = n * 0.66 - 0.16 + (groups - 1) * 0.34 + slant;
          const dh = Math.min(g.h * 0.94, g.w / units), dw = dh * 0.5, t = dh * 0.1;
          let x = (g.w - units * dh) / 2;
          const y = (g.h - dh) / 2;
          for (let i = 0; i < n; i++) {
              D.seg7(ctx, str.charAt(i), x, y, dw, dh, t, g.col("ink"), g.col("ink", 0.07), slant);
              x += dw + dh * 0.16;
              if (i % 2 === 1 && i < n - 1) {
                  ctx.globalAlpha = colonAlpha(g);
                  ctx.fillStyle = g.col("accent");
                  const cx = x + dh * 0.17 - dh * 0.16 / 2;
                  ctx.fillRect(cx - t / 2 + dh * slant * 0.62, y + dh * 0.3, t, t);
                  ctx.fillRect(cx - t / 2 + dh * slant * 0.3, y + dh * 0.64, t, t);
                  ctx.globalAlpha = 1;
                  x += dh * 0.34;
              }
          }
      } },
    { key: "flip", label: "Flip", about: "Flip turns its cards over each minute.", animMs: 520,
      aspect(o) { return o.seconds ? 3.3 : 2.2; },
      draw(g) {
          const ctx = g.ctx;
          const now = [hh(g), mm(g)], was = [g.prevText(0), g.prevText(1)];
          if (g.o.seconds) { now.push(ss(g)); was.push(g.prevText(2)); }
          const n = now.length, gap = g.h * 0.08;
          const cw = Math.min((g.w - gap * (n - 1)) / n, g.h * 0.95), ch = g.h;
          const x = (g.w - (cw * n + gap * (n - 1))) / 2;
          const card = g.bg ? D.rgba(D.mix(g.c.bg, g.c.ink, 0.1), 1) : g.col("ink", 0.12);
          const r = Math.min(cw, ch) * 0.08;
          const a = D.ease(g.a);
          for (let i = 0; i < n; i++) {
              const cx = x + i * (cw + gap);
              const px = Math.min(ch * 0.78 / 0.74, D.fit(ctx, "00", cw * 0.86, 1000, g.weight, g.font));
              const base = midBase(ch / 2, px);
              const moving = was[i] !== now[i] && a < 1 && was[i] !== "";
              function half(txt, top, scale) {
                  ctx.save();
                  ctx.beginPath();
                  ctx.rect(cx, top ? 0 : ch / 2, cw, ch / 2);
                  ctx.clip();
                  if (scale !== 1) {
                      ctx.translate(0, ch / 2);
                      ctx.scale(1, Math.max(0.001, scale));
                      ctx.translate(0, -ch / 2);
                  }
                  ctx.fillStyle = card;
                  D.roundRect(ctx, cx, 0, cw, ch, r);
                  ctx.fill();
                  D.text(ctx, txt, cx + cw / 2, base, { px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
                  ctx.restore();
              }
              if (!moving) { half(now[i], true, 1); half(now[i], false, 1); }
              else if (a < 0.5) {
                  half(now[i], true, 1);           // the new top waits behind
                  half(was[i], false, 1);          // the old bottom stays
                  half(was[i], true, 1 - a * 2);   // the old top falls
              } else {
                  half(now[i], true, 1);
                  half(was[i], false, 1);
                  half(now[i], false, (a - 0.5) * 2);   // the new bottom swings down
              }
              ctx.fillStyle = g.bg ? g.col("bg", 0.9) : "rgba(0,0,0,0.45)";
              ctx.fillRect(cx, ch / 2 - Math.max(1, ch * 0.012), cw, Math.max(1.5, ch * 0.024));
          }
      } },
    { key: "matrix", label: "Dot matrix", about: "Dot matrix builds the digits out of little lights.",
      aspect(o) { return o.seconds ? 4.4 : 3.0; },
      draw(g) {
          const ctx = g.ctx, str = hh(g) + ":" + mm(g) + (g.o.seconds ? ":" + ss(g) : "");
          let cols = 0;
          for (let i = 0; i < str.length; i++) cols += D.dotCols(str.charAt(i)) + (i < str.length - 1 ? 1 : 0);
          const cell = Math.min(g.w / cols, g.h / 7);
          let x = (g.w - cell * cols) / 2;
          const y = (g.h - cell * 7) / 2;
          for (let j = 0; j < str.length; j++) {
              const ch = str.charAt(j);
              ctx.globalAlpha = ch === ":" ? colonAlpha(g) : 1;
              D.dotGlyph(ctx, ch, x, y, cell, ch === ":" ? g.col("accent") : g.col("ink"), g.col("ink", 0.06), true);
              ctx.globalAlpha = 1;
              x += (D.dotCols(ch) + 1) * cell;
          }
      } },
    { key: "nixie", label: "Nixie", about: "Nixie glows in glass tubes, the way the first digital clocks did.",
      aspect(o) { return o.seconds ? 3.6 : 2.4; },
      draw(g) {
          const ctx = g.ctx;
          let str = hh(g) + mm(g) + (g.o.seconds ? ss(g) : "");
          if (str.length % 2 === 1) str = "0" + str;
          const n = str.length, groups = n / 2;
          let tw = g.w / (n + (groups - 1) * 0.35);
          const th = Math.min(g.h, tw * 1.75);
          tw = th / 1.75;
          const total = tw * n + (groups - 1) * tw * 0.35;
          let x = (g.w - total) / 2;
          const y = (g.h - th) / 2;
          const glow = g.c.accent;
          for (let i = 0; i < n; i++) {
              // the glass
              const grad = ctx.createLinearGradient(x, 0, x + tw, 0);
              grad.addColorStop(0, "rgba(255,255,255,0.10)");
              grad.addColorStop(0.5, "rgba(255,255,255,0.02)");
              grad.addColorStop(1, "rgba(255,255,255,0.08)");
              D.roundRect(ctx, x + tw * 0.06, y, tw * 0.88, th, tw * 0.42);
              ctx.fillStyle = "rgba(10,6,4,0.55)";
              ctx.fill();
              ctx.fillStyle = grad;
              ctx.fill();
              ctx.lineWidth = Math.max(1, tw * 0.025);
              ctx.strokeStyle = g.col("ink", 0.22);
              ctx.stroke();
              // the mesh
              ctx.strokeStyle = D.rgba(glow, 0.07);
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              for (let mx = x + tw * 0.2; mx < x + tw * 0.82; mx += tw * 0.09) { ctx.moveTo(mx, y + th * 0.12); ctx.lineTo(mx, y + th * 0.88); }
              ctx.stroke();
              // the unlit digits behind, and the lit one
              const px = th * 0.72;
              ctx.globalAlpha = 0.07;
              D.text(ctx, "8", x + tw / 2, midBase(y + th / 2, px), { px, weight: 300, family: g.font, base: "alphabetic", color: D.rgba(glow, 1) });
              ctx.globalAlpha = 1;
              ctx.shadowColor = D.rgba(glow, 0.9);
              ctx.shadowBlur = th * 0.12;
              D.text(ctx, str.charAt(i), x + tw / 2, midBase(y + th / 2, px), { px, weight: 300, family: g.font, base: "alphabetic", color: D.rgba(D.mix(glow, [255, 240, 220], 0.35), 1) });
              ctx.shadowBlur = 0;
              ctx.shadowColor = "rgba(0,0,0,0)";
              x += tw + (i % 2 === 1 ? tw * 0.35 : 0);
              if (i % 2 === 1 && i < n - 1) {
                  ctx.globalAlpha = colonAlpha(g);
                  ctx.fillStyle = D.rgba(glow, 0.9);
                  D.circle(ctx, x - tw * 0.175, y + th * 0.38, tw * 0.05); ctx.fill();
                  D.circle(ctx, x - tw * 0.175, y + th * 0.62, tw * 0.05); ctx.fill();
                  ctx.globalAlpha = 1;
              }
          }
      } },
    { key: "odometer", label: "Odometer", about: "Odometer rolls each digit up into place.", animMs: 650,
      aspect(o) { return o.seconds ? 3.9 : 2.7; },
      draw(g) {
          const ctx = g.ctx;
          const now = hh(g) + mm(g) + (g.o.seconds ? ss(g) : "");
          let was = g.prevText(0) + g.prevText(1) + (g.o.seconds ? g.prevText(2) : "");
          if (was.length !== now.length) was = now;
          const n = now.length, groups = n / 2;
          let dw = g.w / (n + (groups - 1) * 0.4);
          const dh = Math.min(g.h, dw * 1.5);
          dw = dh / 1.5;
          const total = dw * n + (groups - 1) * dw * 0.4;
          let x = (g.w - total) / 2;
          const y = (g.h - dh) / 2;
          const a = D.easeOut(g.a), px = dh * 0.66;
          for (let i = 0; i < n; i++) {
              D.roundRect(ctx, x + dw * 0.05, y, dw * 0.9, dh, dw * 0.12);
              ctx.fillStyle = g.bg ? D.rgba(D.mix(g.c.bg, [0, 0, 0], 0.3), 1) : "rgba(0,0,0,0.35)";
              ctx.fill();
              ctx.save();
              D.roundRect(ctx, x + dw * 0.05, y, dw * 0.9, dh, dw * 0.12);
              ctx.clip();
              const moving = was.charAt(i) !== now.charAt(i) && a < 1;
              const off = moving ? (1 - a) * dh : 0;
              D.text(ctx, now.charAt(i), x + dw / 2, midBase(y + dh / 2, px) + off, { px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
              if (moving) D.text(ctx, was.charAt(i), x + dw / 2, midBase(y + dh / 2, px) + off - dh, { px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
              // shade at the top and the bottom, like a drum
              const sh = ctx.createLinearGradient(0, y, 0, y + dh);
              sh.addColorStop(0, "rgba(0,0,0,0.55)");
              sh.addColorStop(0.28, "rgba(0,0,0,0)");
              sh.addColorStop(0.72, "rgba(0,0,0,0)");
              sh.addColorStop(1, "rgba(0,0,0,0.55)");
              ctx.fillStyle = sh;
              ctx.fillRect(x, y, dw, dh);
              ctx.restore();
              x += dw + (i % 2 === 1 ? dw * 0.4 : 0);
          }
          ctx.fillStyle = g.col("accent", 0.85);
          ctx.fillRect((g.w - total) / 2, y + dh / 2 - 0.5, total, 1);
      } },
    { key: "roman", label: "Roman", about: "Roman writes the hour and the minute in Roman numerals, between two fine rules.",
      seconds: false, aspect: 3.4,
      draw(g) {
          const ctx = g.ctx, h = g.o.h24 ? g.t.h : D.hour12(g.t.h);
          const str = D.roman(h) + "  ·  " + (g.t.m === 0 ? "N" : D.roman(g.t.m));
          const fam = g.fonts.serif;
          const px = Math.min(g.h * 0.56, D.fit(ctx, str, g.w * 0.92, 1000, 500, fam, 0.12));
          D.text(ctx, str, g.w / 2, midBase(g.h / 2, px), { px, weight: 500, family: fam, base: "alphabetic", color: g.col("ink"), spacing: 0.12 });
          const tw = D.width(ctx, str, px, 500, fam, 0.12);
          ctx.fillStyle = g.col("accent", 0.8);
          const ry = [g.h / 2 - px * 0.62, g.h / 2 + px * 0.6];
          for (let i = 0; i < 2; i++) {
              ctx.fillRect((g.w - tw) / 2, ry[i], tw, Math.max(1, px * 0.025));
              ctx.save();
              ctx.translate(g.w / 2, ry[i]);
              ctx.rotate(Math.PI / 4);
              const k = Math.max(2, px * 0.07);
              ctx.fillRect(-k / 2, -k / 2, k, k);
              ctx.restore();
          }
      } },
    { key: "totem", label: "Totem", about: "Totem stacks the four digits in a column, for a narrow spot.", seconds: false,
      aspect: 0.4,
      draw(g) {
          const ctx = g.ctx;
          let str = hh(g) + mm(g);
          if (str.length === 3) str = "0" + str;
          const px = Math.min(g.w * 1.2, g.h / 4.6 / 0.74);
          const step = (g.h - px * 0.74) / 3.25;
          for (let i = 0; i < 4; i++) {
              const y = px * 0.74 + i * step + (i >= 2 ? step * 0.25 : 0);
              D.text(ctx, str.charAt(i), g.w / 2, y, { px, weight: g.weight, family: g.font, base: "alphabetic", color: i < 2 ? g.col("ink") : g.col("accent") });
          }
          ctx.fillStyle = g.col("ink", 0.4);
          D.circle(ctx, g.w / 2, px * 0.74 + step * 1.5 + step * 0.2, Math.max(1.5, px * 0.05));
          ctx.fill();
      } },
    { key: "bars", label: "Day bars", about: "Day bars fill up as the day, the hour and the minute go by.",
      aspect: 2.4,
      draw(g) {
          const ctx = g.ctx, t = g.t;
          const rows = [[t.h + t.m / 60, 24, D.pad2(t.h) + "h"], [t.m + t.s / 60, 60, D.pad2(t.m) + "m"]];
          if (g.o.seconds) rows.push([t.s + (g.sweep ? t.frac : 0), 60, D.pad2(t.s) + "s"]);
          const n = rows.length, rh = g.h / (n + (n - 1) * 0.35);
          const lpx = Math.min(rh * 0.8, D.fit(ctx, "00h", g.w * 0.22, 1000, g.weight, g.font));
          const lw = D.width(ctx, "00h", lpx, g.weight, g.font) + rh * 0.4;
          for (let i = 0; i < n; i++) {
              const y = i * rh * 1.35;
              D.text(ctx, rows[i][2], 0, y + rh / 2 + lpx * 0.36, { px: lpx, weight: g.weight, family: g.font, align: "left", base: "alphabetic", color: g.col("ink") });
              const bw = g.w - lw, bh = Math.max(3, rh * 0.32), by = y + (rh - bh) / 2;
              D.roundRect(ctx, lw, by, bw, bh, bh / 2);
              ctx.fillStyle = g.col("ink", 0.1);
              ctx.fill();
              D.roundRect(ctx, lw, by, Math.max(bh, bw * rows[i][0] / rows[i][1]), bh, bh / 2);
              ctx.fillStyle = i === 0 ? g.col("accent") : g.col("ink", 0.85 - i * 0.2);
              ctx.fill();
          }
      } },

    // analog
    { key: "classic", label: "Classic", about: "Classic is a round dial with numbers, minute marks and three hands.",
      aspect: 1, sweep: true,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.97, tu = turns(g);
          D.circle(ctx, cx, cy, r);
          ctx.lineWidth = Math.max(1, r * 0.018);
          ctx.strokeStyle = g.col("ink", 0.35);
          ctx.stroke();
          D.ticks(ctx, cx, cy, r * 0.94, 60, r * 0.04, Math.max(0.6, r * 0.008), g.col("ink", 0.5), 5);
          D.ticks(ctx, cx, cy, r * 0.94, 12, r * 0.09, Math.max(1.2, r * 0.022), g.col("ink"));
          for (let i = 1; i <= 12; i++) {
              const p = D.onDial(cx, cy, r * 0.71, i / 12);
              D.text(ctx, "" + i, p[0], p[1] + r * 0.05, { px: r * 0.15, weight: Math.max(300, g.weight), family: g.font, base: "alphabetic", color: g.col("ink") });
          }
          D.hand(ctx, cx, cy, tu.h, r * 0.5, r * 0.08, r * 0.065, r * 0.03, g.col("ink"));
          D.hand(ctx, cx, cy, tu.m, r * 0.78, r * 0.08, r * 0.045, r * 0.018, g.col("ink"));
          if (g.o.seconds) {
              D.hand(ctx, cx, cy, tu.s, r * 0.86, r * 0.18, r * 0.012, r * 0.012, g.col("accent"));
              ctx.fillStyle = g.col("accent");
              D.circle(ctx, cx, cy, r * 0.04); ctx.fill();
          } else {
              ctx.fillStyle = g.col("ink");
              D.circle(ctx, cx, cy, r * 0.035); ctx.fill();
          }
      } },
    { key: "minimal", label: "Minimal", about: "Minimal keeps four marks and slim hands.",
      aspect: 1, sweep: true,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.95, tu = turns(g);
          ctx.lineCap = "round";
          ctx.strokeStyle = g.col("ink", 0.6);
          ctx.lineWidth = Math.max(1.5, r * 0.03);
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
              const a = D.onDial(cx, cy, r, i / 4), b = D.onDial(cx, cy, r * 0.86, i / 4);
              ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
          }
          ctx.stroke();
          function line(turn, len, w, c) {
              const p = D.onDial(cx, cy, len, turn);
              ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round";
              ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.stroke();
          }
          line(tu.h, r * 0.5, Math.max(2, r * 0.05), g.col("ink"));
          line(tu.m, r * 0.8, Math.max(1.5, r * 0.03), g.col("ink"));
          if (g.o.seconds) line(tu.s, r * 0.84, Math.max(1, r * 0.01), g.col("accent"));
          ctx.fillStyle = g.col("accent");
          D.circle(ctx, cx, cy, Math.max(2, r * 0.045)); ctx.fill();
      } },
    { key: "ornate", label: "Ornate", about: "Ornate has Roman numerals, a beaded double ring and carved hands.",
      aspect: 1, sweep: true,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.97, tu = turns(g);
          D.circle(ctx, cx, cy, r);
          ctx.lineWidth = Math.max(1.5, r * 0.03); ctx.strokeStyle = g.col("accent", 0.9); ctx.stroke();
          D.circle(ctx, cx, cy, r * 0.9);
          ctx.lineWidth = Math.max(0.8, r * 0.008); ctx.strokeStyle = g.col("accent", 0.7); ctx.stroke();
          ctx.fillStyle = g.col("accent", 0.85);
          for (let b = 0; b < 60; b++) {
              const p = D.onDial(cx, cy, r * 0.95, b / 60);
              D.circle(ctx, p[0], p[1], b % 5 === 0 ? r * 0.018 : r * 0.008); ctx.fill();
          }
          const fam = g.fonts.serif;
          for (let i = 1; i <= 12; i++) {
              const q = D.onDial(cx, cy, r * 0.74, i / 12);
              ctx.save();
              ctx.translate(q[0], q[1]);
              ctx.rotate(i / 12 * Math.PI * 2);
              D.text(ctx, D.roman(i), 0, r * 0.045, { px: r * 0.12, weight: 500, family: fam, base: "alphabetic", color: g.col("ink") });
              ctx.restore();
          }
          // a hand with a spade at the end and a ring along it
          function carved(turn, len, w, c) {
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(turn * Math.PI * 2);
              ctx.fillStyle = c; ctx.strokeStyle = c;
              ctx.beginPath();
              ctx.moveTo(-w * 0.35, r * 0.06); ctx.lineTo(-w * 0.2, -len * 0.62); ctx.lineTo(w * 0.2, -len * 0.62); ctx.lineTo(w * 0.35, r * 0.06);
              ctx.closePath(); ctx.fill();
              ctx.beginPath();          // the spade
              ctx.moveTo(0, -len);
              ctx.quadraticCurveTo(w * 1.6, -len * 0.78, 0, -len * 0.62);
              ctx.quadraticCurveTo(-w * 1.6, -len * 0.78, 0, -len);
              ctx.fill();
              ctx.lineWidth = Math.max(0.8, w * 0.25);
              D.circle(ctx, 0, -len * 0.4, w * 0.75); ctx.stroke();
              ctx.restore();
          }
          carved(tu.h, r * 0.5, r * 0.07, g.col("ink"));
          carved(tu.m, r * 0.76, r * 0.05, g.col("ink"));
          if (g.o.seconds) D.hand(ctx, cx, cy, tu.s, r * 0.84, r * 0.14, r * 0.01, r * 0.01, g.col("accent"));
          ctx.fillStyle = g.col("accent");
          D.circle(ctx, cx, cy, r * 0.05); ctx.fill();
          ctx.fillStyle = g.col("ink");
          D.circle(ctx, cx, cy, r * 0.02); ctx.fill();
      } },
    { key: "orbit", label: "Orbit", about: "Orbit sends a dot round a ring for the hours, the minutes and the seconds.",
      aspect: 1, sweep: true,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r, tu = turns(g);
          const rings = [[r * 0.5, tu.h, r * 0.075, g.c.ink], [r * 0.72, tu.m, r * 0.055, g.c.ink], [r * 0.92, tu.s, r * 0.04, g.c.accent]];
          if (!g.o.seconds) rings.pop();
          for (let i = 0; i < rings.length; i++) {
              const rr = rings[i][0];
              D.circle(ctx, cx, cy, rr);
              ctx.lineWidth = Math.max(0.8, r * 0.008); ctx.strokeStyle = g.col("ink", 0.14); ctx.stroke();
              D.arc(ctx, cx, cy, rr, 0, rings[i][1], Math.max(1, r * 0.014), D.rgba(rings[i][3], 0.45), "round");
              const p = D.onDial(cx, cy, rr, rings[i][1]);
              ctx.fillStyle = D.rgba(rings[i][3], 1);
              D.circle(ctx, p[0], p[1], rings[i][2]); ctx.fill();
          }
          const t = hh(g) + ":" + mm(g);
          const px = D.fit(ctx, t, r * 0.62, r * 0.3, g.weight, g.font);
          D.text(ctx, t, cx, midBase(cy, px), { px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
      } },
    { key: "rings", label: "Rings", about: "Rings fill three arcs as the hours, minutes and seconds go round.",
      aspect: 1, sweep: true,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.95, tu = turns(g);
          const w = r * 0.1;
          const rings = [[r - w / 2, tu.s, g.col("accent"), g.o.seconds], [r - w * 1.7, tu.m, g.col("ink", 0.9), true], [r - w * 2.9, tu.h, g.col("ink", 0.55), true]];
          for (let i = 0; i < rings.length; i++) {
              if (!rings[i][3]) continue;
              D.arc(ctx, cx, cy, rings[i][0], 0, 1, w, g.col("ink", 0.08), "butt");
              D.arc(ctx, cx, cy, rings[i][0], 0, Math.max(0.002, rings[i][1]), w, rings[i][2], "round");
          }
          const t = hh(g) + ":" + mm(g);
          const px = D.fit(ctx, t, (r - w * 3.6) * 1.5, r * 0.36, g.weight, g.font);
          D.text(ctx, t, cx, midBase(cy, px), { px, weight: g.weight, family: g.font, base: "alphabetic", color: g.col("ink") });
      } },
    { key: "bauhaus", label: "Bauhaus", about: "Bauhaus tells the time with a disc, a triangle and a square.",
      aspect: 1, sweep: false,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.96, tu = turns(g);
          D.circle(ctx, cx, cy, r);
          ctx.fillStyle = g.col("ink", 0.07); ctx.fill();
          ctx.lineWidth = Math.max(1.5, r * 0.025); ctx.strokeStyle = g.col("ink", 0.85); ctx.stroke();
          const hp = D.onDial(cx, cy, r * 0.52, tu.h);
          ctx.fillStyle = g.col("accent");
          D.circle(ctx, hp[0], hp[1], r * 0.2); ctx.fill();
          ctx.save();                           // the minute triangle
          ctx.translate(cx, cy);
          ctx.rotate(tu.m * Math.PI * 2);
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.92); ctx.lineTo(r * 0.09, 0); ctx.lineTo(-r * 0.09, 0);
          ctx.closePath();
          ctx.fillStyle = g.col("ink"); ctx.fill();
          ctx.restore();
          if (g.o.seconds) {
              const sp = D.onDial(cx, cy, r * 0.82, tu.s);
              ctx.save(); ctx.translate(sp[0], sp[1]); ctx.rotate(tu.s * Math.PI * 2);
              ctx.fillStyle = g.col("accent2"); ctx.fillRect(-r * 0.045, -r * 0.045, r * 0.09, r * 0.09);
              ctx.restore();
          }
          ctx.fillStyle = g.bg ? g.col("bg") : g.col("ink");
          D.circle(ctx, cx, cy, r * 0.05); ctx.fill();
      } },
    { key: "pie", label: "Pie", about: "Pie fills a slice for the hours and rings round for the minutes.",
      aspect: 1,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.95, tu = turns(g);
          D.circle(ctx, cx, cy, r * 0.8);
          ctx.fillStyle = g.col("ink", 0.06); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r * 0.8, -Math.PI / 2, -Math.PI / 2 + tu.h * Math.PI * 2, false);
          ctx.closePath();
          ctx.fillStyle = g.col("accent", 0.55); ctx.fill();
          D.arc(ctx, cx, cy, r * 0.92, 0, 1, r * 0.06, g.col("ink", 0.1), "butt");
          D.arc(ctx, cx, cy, r * 0.92, 0, Math.max(0.003, tu.m), r * 0.06, g.col("ink"), "butt");
          const t = hh(g) + ":" + mm(g);
          const px = D.fit(ctx, t, r * 0.9, r * 0.32, Math.max(500, g.weight), g.font);
          D.text(ctx, t, cx, midBase(cy, px), { px, weight: Math.max(500, g.weight), family: g.font, base: "alphabetic", color: g.col("ink") });
      } },
    { key: "radar", label: "Radar", about: "Radar sweeps round once a minute and marks the hour and the minute as blips.",
      aspect: 1, sweep: true,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.96, tu = turns(g);
          ctx.strokeStyle = g.col("accent", 0.25);
          ctx.lineWidth = Math.max(0.7, r * 0.008);
          for (let k = 1; k <= 4; k++) { D.circle(ctx, cx, cy, r * k / 4); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
          const sweepTurn = g.o.seconds ? tu.s : tu.m;
          for (let i = 0; i < 24; i++) {          // the trail
              const a0 = sweepTurn - (i + 1) * 0.012, a1 = sweepTurn - i * 0.012;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.arc(cx, cy, r, -Math.PI / 2 + a0 * Math.PI * 2, -Math.PI / 2 + a1 * Math.PI * 2, false);
              ctx.closePath();
              ctx.fillStyle = g.col("accent", 0.3 * (1 - i / 24));
              ctx.fill();
          }
          const e = D.onDial(cx, cy, r, sweepTurn);
          ctx.strokeStyle = g.col("accent"); ctx.lineWidth = Math.max(1, r * 0.015);
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(e[0], e[1]); ctx.stroke();
          const blips = [[tu.h, r * 0.45, r * 0.06], [tu.m, r * 0.75, r * 0.045]];
          for (let b = 0; b < blips.length; b++) {
              const p = D.onDial(cx, cy, blips[b][1], blips[b][0]);
              ctx.fillStyle = g.col("ink");
              ctx.shadowColor = g.col("accent"); ctx.shadowBlur = r * 0.08;
              D.circle(ctx, p[0], p[1], blips[b][2]); ctx.fill();
              ctx.shadowBlur = 0; ctx.shadowColor = "rgba(0,0,0,0)";
          }
          const t = hh(g) + ":" + mm(g);
          D.text(ctx, t, cx, cy + r * 0.62, { px: r * 0.13, weight: 500, family: g.fonts.mono, base: "alphabetic", color: g.col("ink", 0.8) });
      } },
    { key: "daydial", label: "Day dial", about: "Day dial goes round once a day: noon at the top, midnight at the bottom, the night shaded.",
      aspect: 1, seconds: false,
      draw(g) {
          const ctx = g.ctx, d = dial(g), cx = d.cx, cy = d.cy, r = d.r * 0.96, t = g.t;
          const dayTurn = ((t.h + t.m / 60) / 24 + 0.5) % 1;     // noon at the top
          D.circle(ctx, cx, cy, r);
          ctx.fillStyle = g.col("ink", 0.05); ctx.fill();
          // the night, from 18:00 to 06:00
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, -Math.PI / 2 + 0.25 * Math.PI * 2, -Math.PI / 2 + 0.75 * Math.PI * 2, false);
          ctx.closePath();
          ctx.fillStyle = g.col("ink", 0.12); ctx.fill();
          ctx.lineWidth = Math.max(1, r * 0.018); ctx.strokeStyle = g.col("ink", 0.4);
          D.circle(ctx, cx, cy, r); ctx.stroke();
          D.ticks(ctx, cx, cy, r * 0.96, 24, r * 0.06, Math.max(0.8, r * 0.012), g.col("ink", 0.6));
          const labels = [["12", 0], ["18", 0.25], ["0", 0.5], ["6", 0.75]];
          for (let i = 0; i < 4; i++) {
              const p = D.onDial(cx, cy, r * 0.74, labels[i][1]);
              D.text(ctx, labels[i][0], p[0], p[1] + r * 0.045, { px: r * 0.13, weight: 500, family: g.font, base: "alphabetic", color: g.col("ink", 0.8) });
          }
          // the sun at the top of the day, a crescent at the bottom
          const sun = D.onDial(cx, cy, r * 0.42, 0);
          ctx.fillStyle = g.col("accent", 0.8);
          D.circle(ctx, sun[0], sun[1], r * 0.06); ctx.fill();
          const moon = D.onDial(cx, cy, r * 0.42, 0.5);
          D.circle(ctx, moon[0], moon[1], r * 0.06); ctx.fillStyle = g.col("ink", 0.6); ctx.fill();
          D.circle(ctx, moon[0] + r * 0.03, moon[1] - r * 0.02, r * 0.05); ctx.fillStyle = g.bg ? g.col("bg") : "rgba(20,20,20,0.85)"; ctx.fill();
          D.hand(ctx, cx, cy, dayTurn, r * 0.88, r * 0.1, r * 0.04, r * 0.01, g.col("accent"));
          ctx.fillStyle = g.col("accent");
          D.circle(ctx, cx, cy, r * 0.045); ctx.fill();
      } }
];

var byKey = {};
for (let i = 0; i < list.length; i++) byKey[list[i].key] = list[i];

// width / height of a face for these options
function aspectOf(key, o) {
    const f = byKey[key] || byKey.plain;
    return typeof f.aspect === "function" ? f.aspect(o || {}) : (f.aspect || 1);
}
