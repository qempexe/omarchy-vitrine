.pragma library
.import "../Draw.js" as D

// Text styles: notes, quotes, greetings and countdowns. One entry per tile in a text
// widget's Style, in the order the tiles show. To add one, see CONTRIBUTING.md.
//
// g.data: { main (the text), sub (a smaller line: the author, the date, ...),
//           big (a number for countdowns, else ""), unit ("days", ...), mode }
// entry fields: key, label, about, aspect, draw(g).

// text broken into lines no wider than maxW
function wrap(ctx, str, maxW, px, weight, family, italic, spacing) {
    const words = ("" + str).split(/\s+/);
    const lines = [];
    let line = "";
    for (let i = 0; i < words.length; i++) {
        if (words[i] === "") continue;
        const test = line ? line + " " + words[i] : words[i];
        if (line && D.width(ctx, test, px, weight, family, spacing, italic) > maxW) { lines.push(line); line = words[i]; }
        else line = test;
    }
    if (line) lines.push(line);
    return lines;
}
// the biggest size at which the text fits in w x h, in at most maxLines lines
function fitBlock(ctx, str, w, h, maxLines, weight, family, italic, lead, spacing) {
    let px = h;
    for (let k = 0; k < 40; k++) {
        const lines = wrap(ctx, str, w, px, weight, family, italic, spacing);
        let widest = 0;
        for (let i = 0; i < lines.length; i++) widest = Math.max(widest, D.width(ctx, lines[i], px, weight, family, spacing, italic));
        if (lines.length <= maxLines && lines.length * px * lead <= h && widest <= w) return { px, lines };
        px *= 0.9;
    }
    return { px, lines: wrap(ctx, str, w, px, weight, family, italic, spacing) };
}
function block(g, b, cx, cy, lead, o) {
    const top = cy - (b.lines.length * b.px * lead) / 2;
    for (let i = 0; i < b.lines.length; i++)
        D.text(g.ctx, b.lines[i], cx, top + (i + 0.78) * b.px * lead, {
            px: b.px, weight: o.weight, family: o.family, italic: o.italic, align: o.align || "center",
            base: "alphabetic", color: o.color, spacing: o.spacing });
}
function textOf(g) { return g.data.big ? g.data.big + " " + (g.data.unit || "") + (g.data.main ? " " + g.data.main : "") : (g.data.main || ""); }

var list = [
    { key: "plain", label: "Plain", about: "Plain sets your text in your font, the smaller line under it.", aspect: 3.2,
      draw(g) {
          const subH = g.data.sub ? g.h * 0.2 : 0;
          const b = fitBlock(g.ctx, textOf(g), g.w, g.h - subH, 3, g.weight, g.font, false, 1.15);
          block(g, b, g.w / 2, (g.h - subH) / 2, 1.15, { weight: g.weight, family: g.font, color: g.col("ink") });
          if (subH) D.text(g.ctx, g.data.sub, g.w / 2, g.h - subH * 0.3, { px: subH * 0.62, weight: 500, family: g.font, base: "alphabetic", color: g.col("accent") });
      } },
    { key: "quote", label: "Quote", about: "Quote sets it in italics between big quote marks, with the author under it.", aspect: 2.6,
      draw(g) {
          const ctx = g.ctx, fam = g.fonts.serif;
          const markPx = g.h * 0.5;
          D.text(ctx, "“", g.h * 0.05, markPx * 0.82, { px: markPx, weight: 700, family: fam, align: "left", base: "alphabetic", color: g.col("accent", 0.6) });
          const subH = g.data.sub ? g.h * 0.18 : 0;
          const left = g.h * 0.3;
          const b = fitBlock(ctx, g.data.main || "", g.w - left, g.h - subH, 4, 400, fam, true, 1.2);
          block(g, b, left, (g.h - subH) / 2, 1.2, { weight: 400, family: fam, italic: true, align: "left", color: g.col("ink") });
          if (subH) D.text(ctx, "— " + g.data.sub, g.w, g.h - subH * 0.25, { px: subH * 0.6, weight: 600, family: g.font, align: "right", base: "alphabetic", color: g.col("accent"), spacing: 0.08 });
      } },
    { key: "headline", label: "Headline", about: "Headline shouts it in tall capitals.", aspect: 3.8,
      draw(g) {
          const fam = g.fonts.display, subH = g.data.sub ? g.h * 0.18 : 0;
          const b = fitBlock(g.ctx, textOf(g).toUpperCase(), g.w, g.h - subH, 2, 400, fam, false, 0.98, 0.04);
          block(g, b, g.w / 2, (g.h - subH) / 2 + b.px * 0.04, 0.98, { weight: 400, family: fam, color: g.col("ink"), spacing: 0.04 });
          if (subH) D.text(g.ctx, g.data.sub.toUpperCase(), g.w / 2, g.h - subH * 0.2, { px: subH * 0.58, weight: 600, family: g.font, base: "alphabetic", color: g.col("accent"), spacing: 0.3 });
      } },
    { key: "terminal", label: "Terminal", about: "Terminal types it after a prompt, with a blinking cursor.", aspect: 4.2,
      draw(g) {
          const ctx = g.ctx, fam = g.fonts.mono, line = "> " + textOf(g);
          const subH = g.data.sub ? g.h * 0.24 : 0;
          const b = fitBlock(ctx, line + "█", g.w, g.h - subH, 2, 400, fam, false, 1.2);
          const top = (g.h - subH - b.lines.length * b.px * 1.2) / 2;
          for (let i = 0; i < b.lines.length; i++) {
              const l = b.lines[i], last = i === b.lines.length - 1;
              const shown = last ? l.replace("█", "") : l;
              D.text(ctx, shown, 0, top + (i + 0.8) * b.px * 1.2, { px: b.px, weight: 400, family: fam, align: "left", base: "alphabetic", color: i === 0 ? g.col("ink") : g.col("ink") });
              if (i === 0) D.text(ctx, ">", 0, top + 0.8 * b.px * 1.2, { px: b.px, weight: 700, family: fam, align: "left", base: "alphabetic", color: g.col("accent") });
              if (last && (g.t.s % 2 === 0)) {
                  const cw = D.width(ctx, shown, b.px, 400, fam);
                  ctx.fillStyle = g.col("accent", 0.85);
                  ctx.fillRect(cw + b.px * 0.08, top + i * b.px * 1.2 + b.px * 0.2, b.px * 0.55, b.px * 0.85);
              }
          }
          if (subH) D.text(ctx, "# " + g.data.sub, 0, g.h - subH * 0.25, { px: subH * 0.6, weight: 400, family: fam, align: "left", base: "alphabetic", color: g.col("ink", 0.5) });
      } },
    { key: "banner", label: "Banner", about: "Banner spaces it out in capitals between two rules.", aspect: 5,
      draw(g) {
          const ctx = g.ctx, str = textOf(g).toUpperCase(), subH = g.data.sub ? g.h * 0.24 : 0;
          const px = Math.min((g.h - subH) * 0.6, D.fit(ctx, str, g.w * 0.7, 1000, 600, g.font, 0.25));
          const cy = (g.h - subH) / 2 + px * 0.36;
          D.text(ctx, str, g.w / 2, cy, { px, weight: 600, family: g.font, base: "alphabetic", color: g.col("ink"), spacing: 0.25 });
          const tw = D.width(ctx, str, px, 600, g.font, 0.25), ry = cy - px * 0.36;
          ctx.fillStyle = g.col("accent", 0.8);
          const gap = px * 0.8, lw = (g.w - tw) / 2 - gap;
          if (lw > 4) {
              ctx.fillRect(0, ry, lw, Math.max(1, px * 0.05));
              ctx.fillRect(g.w - lw, ry, lw, Math.max(1, px * 0.05));
              D.circle(ctx, lw, ry, Math.max(1.5, px * 0.08)); ctx.fill();
              D.circle(ctx, g.w - lw, ry, Math.max(1.5, px * 0.08)); ctx.fill();
          }
          if (subH) D.text(ctx, g.data.sub, g.w / 2, g.h - subH * 0.2, { px: subH * 0.55, weight: 400, family: g.fonts.serif, italic: true, base: "alphabetic", color: g.col("ink", 0.7) });
      } },
    { key: "counter", label: "Counter", about: "Counter makes the number huge, for countdowns, with what it counts beside it.", aspect: 2.4,
      draw(g) {
          const ctx = g.ctx, d = g.data;
          const big = d.big || "", unit = (d.unit || "").toUpperCase(), label = d.main || "";
          if (!big) {   // nothing to count: just the text, big
              const b = fitBlock(ctx, label, g.w, g.h, 2, g.weight, g.font, false, 1.05);
              block(g, b, g.w / 2, g.h / 2, 1.05, { weight: g.weight, family: g.font, color: g.col("ink") });
              return;
          }
          const px = Math.min(g.h / 0.74 * 0.9, D.fit(ctx, big, g.w * 0.6, 1000, g.weight, g.font));
          const bw = D.width(ctx, big, px, g.weight, g.font);
          D.text(ctx, big, 0, g.h / 2 + px * 0.36, { px, weight: g.weight, family: g.font, align: "left", base: "alphabetic", color: g.col("ink") });
          const x = bw + px * 0.12, room = g.w - x;
          const upx = Math.min(px * 0.26, D.fit(ctx, unit, room, 1000, 700, g.font, 0.14));
          D.text(ctx, unit, x, g.h / 2 - px * 0.36 + upx * 0.9, { px: upx, weight: 700, family: g.font, align: "left", base: "alphabetic", color: g.col("accent"), spacing: 0.14 });
          const lb = fitBlock(ctx, label, room, px * 0.5, 2, 400, g.fonts.serif, true, 1.15);
          const top = g.h / 2 - px * 0.36 + upx * 1.4;
          for (let i = 0; i < lb.lines.length; i++)
              D.text(ctx, lb.lines[i], x, top + (i + 0.8) * lb.px * 1.15, { px: lb.px, weight: 400, family: g.fonts.serif, italic: true, align: "left", base: "alphabetic", color: g.col("ink", 0.75) });
          if (d.sub) D.text(ctx, d.sub, x, g.h / 2 + px * 0.36, { px: Math.min(upx * 0.85, g.h * 0.08), weight: 500, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.5) });
      } },
    { key: "gothic", label: "Blackletter", about: "Blackletter writes it in an old gothic hand.", aspect: 3.2,
      draw(g) {
          const fam = g.fonts.script, subH = g.data.sub ? g.h * 0.2 : 0;
          const b = fitBlock(g.ctx, textOf(g), g.w, g.h - subH, 3, 400, fam, false, 1.15);
          block(g, b, g.w / 2, (g.h - subH) / 2, 1.15, { weight: 400, family: fam, color: g.col("ink") });
          if (subH) D.text(g.ctx, g.data.sub, g.w / 2, g.h - subH * 0.25, { px: subH * 0.6, weight: 400, family: g.fonts.serif, italic: true, base: "alphabetic", color: g.col("accent") });
      } }
];

var byKey = {};
for (let i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
