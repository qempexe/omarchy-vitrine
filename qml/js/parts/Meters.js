.pragma library
.import "../Draw.js" as D

// System styles. One entry per tile in a system widget's Style, in the order the
// tiles show. To add one, see CONTRIBUTING.md.
//
// g.data.meters is the list the widget shows, in the order you picked them:
//   [{ key, label, frac (0 to 1, or -1 when unknown), text ("37%"), detail ("5.9 / 16 GB"),
//      history [older ... newer fractions] }]
// entry fields: key, label, about, aspect (function (o, n) with n meters), draw(g).

function meters(g) { return g.data && g.data.meters ? g.data.meters : []; }
function safe(f) { return typeof f === "number" && f >= 0 ? Math.min(1, f) : 0; }
// a meter's color: the accent, turning to the second accent when it runs high
function tone(g, f) { return f > 0.85 ? g.col("accent2") : g.col("accent"); }

var list = [
    { key: "rings", label: "Rings", about: "Rings fill a circle for each reading.",
      aspect(o, n) { return Math.max(1, n) * 0.92; },
      draw(g) {
          const ctx = g.ctx, ms = meters(g), n = Math.max(1, ms.length), cw = g.w / n;
          const r = Math.min(cw * 0.42, g.h * 0.36);
          for (let i = 0; i < ms.length; i++) {
              const cx = cw * i + cw / 2, cy = g.h * 0.42, f = safe(ms[i].frac);
              D.arc(ctx, cx, cy, r, 0, 1, r * 0.16, g.col("ink", 0.1), "butt");
              if (ms[i].frac >= 0) D.arc(ctx, cx, cy, r, 0, Math.max(0.004, f), r * 0.16, tone(g, f), "round");
              const px = D.fit(ctx, ms[i].text, r * 1.3, r * 0.6, Math.max(400, g.weight), g.font);
              D.text(ctx, ms[i].text, cx, cy + px * 0.36, { px, weight: Math.max(400, g.weight), family: g.font, base: "alphabetic", color: g.col("ink") });
              const lpx = Math.min(g.h * 0.11, D.fit(ctx, ms[i].label.toUpperCase(), cw * 0.9, 1000, 600, g.font, 0.12));
              D.text(ctx, ms[i].label.toUpperCase(), cx, g.h * 0.95, { px: lpx, weight: 600, family: g.font, base: "alphabetic", color: g.col("ink", 0.6), spacing: 0.12 });
          }
      } },
    { key: "bars", label: "Bars", about: "Bars gives each reading a row with its name, a bar and the number.",
      aspect(o, n) { return 3.4 / Math.max(1, n * 0.42); },
      draw(g) {
          const ctx = g.ctx, ms = meters(g), n = Math.max(1, ms.length);
          const rh = g.h / (n + (n - 1) * 0.35), lpx = Math.min(rh * 0.55, g.w * 0.06);
          let lw = 0, vw = 0;
          for (let k = 0; k < ms.length; k++) {
              lw = Math.max(lw, D.width(ctx, ms[k].label, lpx, 500, g.font));
              vw = Math.max(vw, D.width(ctx, ms[k].text, lpx, 500, g.font));
          }
          lw += lpx * 0.8; vw += lpx * 0.6;
          for (let i = 0; i < ms.length; i++) {
              const y = i * rh * 1.35 + rh / 2, f = safe(ms[i].frac);
              D.text(ctx, ms[i].label, 0, y + lpx * 0.36, { px: lpx, weight: 500, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.75) });
              const bw = g.w - lw - vw, bh = Math.max(3, rh * 0.3);
              D.roundRect(ctx, lw, y - bh / 2, bw, bh, bh / 2);
              ctx.fillStyle = g.col("ink", 0.1); ctx.fill();
              if (ms[i].frac >= 0) {
                  D.roundRect(ctx, lw, y - bh / 2, Math.max(bh, bw * f), bh, bh / 2);
                  ctx.fillStyle = tone(g, f); ctx.fill();
              }
              D.text(ctx, ms[i].text, g.w, y + lpx * 0.36, { px: lpx, weight: 500, family: g.font, align: "right", base: "alphabetic", color: g.col("ink") });
          }
      } },
    { key: "readout", label: "Readout", about: "Readout prints the readings in a column, like a terminal.",
      aspect(o, n) { return 2.6 / Math.max(1, n * 0.32); },
      draw(g) {
          const ctx = g.ctx, ms = meters(g), n = Math.max(1, ms.length), fam = g.fonts.mono;
          const lines = [];
          for (let i = 0; i < ms.length; i++) lines.push([ms[i].label.toUpperCase(), ms[i].text + (ms[i].detail ? "  " + ms[i].detail : "")]);
          let longest = "";
          for (let j = 0; j < lines.length; j++) { const s = lines[j][0] + "      " + lines[j][1]; if (s.length > longest.length) longest = s; }
          const px = Math.min(g.h / (n * 1.45), D.fit(ctx, longest, g.w, 1000, 400, fam));
          let lw = 0;
          for (let k = 0; k < lines.length; k++) lw = Math.max(lw, D.width(ctx, lines[k][0], px, 400, fam));
          const y0 = (g.h - n * px * 1.45) / 2;
          for (let l = 0; l < lines.length; l++) {
              const y = y0 + l * px * 1.45 + px * 1.05;
              D.text(ctx, lines[l][0], 0, y, { px, weight: 600, family: fam, align: "left", base: "alphabetic", color: g.col("accent") });
              D.text(ctx, lines[l][1], lw + px * 1.5, y, { px, weight: 400, family: fam, align: "left", base: "alphabetic", color: g.col("ink") });
          }
      } },
    { key: "graphs", label: "Graphs", about: "Graphs draws the last minute of each reading as a line.",
      aspect(o, n) { return 3.0 / Math.max(1, n * 0.45); },
      draw(g) {
          const ctx = g.ctx, ms = meters(g), n = Math.max(1, ms.length);
          const rh = g.h / (n + (n - 1) * 0.25), lpx = Math.min(rh * 0.32, g.w * 0.05);
          for (let i = 0; i < ms.length; i++) {
              const y = i * rh * 1.25, hist = ms[i].history || [];
              const gx = 0, gw = g.w, gy = y + lpx * 1.4, gh = rh - lpx * 1.4;
              D.text(ctx, ms[i].label, 0, y + lpx, { px: lpx, weight: 600, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.7) });
              D.text(ctx, ms[i].text, g.w, y + lpx, { px: lpx, weight: 600, family: g.font, align: "right", base: "alphabetic", color: g.col("ink") });
              ctx.fillStyle = g.col("ink", 0.06);
              ctx.fillRect(gx, gy, gw, gh);
              if (hist.length < 2) continue;
              const step = gw / (hist.length - 1);
              ctx.beginPath();
              ctx.moveTo(gx, gy + gh);
              for (let k = 0; k < hist.length; k++) ctx.lineTo(gx + k * step, gy + gh - safe(hist[k]) * gh);
              ctx.lineTo(gx + gw, gy + gh);
              ctx.closePath();
              const fill = ctx.createLinearGradient(0, gy, 0, gy + gh);
              fill.addColorStop(0, g.col("accent", 0.45));
              fill.addColorStop(1, g.col("accent", 0.02));
              ctx.fillStyle = fill; ctx.fill();
              ctx.beginPath();
              for (let m = 0; m < hist.length; m++) {
                  const px = gx + m * step, py = gy + gh - safe(hist[m]) * gh;
                  if (m === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
              ctx.lineWidth = Math.max(1, gh * 0.03); ctx.strokeStyle = g.col("accent"); ctx.lineJoin = "round"; ctx.stroke();
          }
      } },
    { key: "dots", label: "Dots", about: "Dots lights ten dots per reading, like an old stereo.",
      aspect(o, n) { return 2.8 / Math.max(1, n * 0.36); },
      draw(g) {
          const ctx = g.ctx, ms = meters(g), n = Math.max(1, ms.length);
          const rh = g.h / (n + (n - 1) * 0.3), lpx = Math.min(rh * 0.5, g.w * 0.055);
          let lw = 0;
          for (let k = 0; k < ms.length; k++) lw = Math.max(lw, D.width(ctx, ms[k].label, lpx, 600, g.font, 0.08));
          lw += lpx;
          const cell = Math.min((g.w - lw) / 10, rh);
          for (let i = 0; i < ms.length; i++) {
              const y = i * rh * 1.3 + rh / 2, lit = Math.round(safe(ms[i].frac) * 10);
              D.text(ctx, ms[i].label, 0, y + lpx * 0.36, { px: lpx, weight: 600, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.75), spacing: 0.08 });
              for (let d = 0; d < 10; d++) {
                  ctx.fillStyle = d < lit ? (d >= 8 ? g.col("accent2") : g.col("accent")) : g.col("ink", 0.1);
                  D.roundRect(ctx, lw + d * cell + cell * 0.12, y - cell * 0.32, cell * 0.76, cell * 0.64, cell * 0.16);
                  ctx.fill();
              }
          }
      } },
    { key: "gauges", label: "Gauges", about: "Gauges swings a needle across a half dial for each reading.",
      aspect(o, n) { return Math.max(1, n) * 1.25; },
      draw(g) {
          const ctx = g.ctx, ms = meters(g), n = Math.max(1, ms.length), cw = g.w / n;
          const r = Math.min(cw * 0.44, g.h * 0.62);
          for (let i = 0; i < ms.length; i++) {
              const cx = cw * i + cw / 2, cy = g.h * 0.72, f = safe(ms[i].frac);
              ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 2, false);
              ctx.lineWidth = r * 0.12; ctx.strokeStyle = g.col("ink", 0.1); ctx.lineCap = "butt"; ctx.stroke();
              ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * f, false);
              ctx.strokeStyle = tone(g, f); ctx.stroke();
              for (let t = 0; t <= 10; t++) {
                  const a = Math.PI + Math.PI * t / 10;
                  ctx.beginPath();
                  ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
                  ctx.lineTo(cx + Math.cos(a) * r * (t % 5 === 0 ? 0.66 : 0.72), cy + Math.sin(a) * r * (t % 5 === 0 ? 0.66 : 0.72));
                  ctx.lineWidth = Math.max(0.8, r * 0.02); ctx.strokeStyle = g.col("ink", 0.5); ctx.stroke();
              }
              const na = Math.PI + Math.PI * f;
              ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * r * 0.86, cy + Math.sin(na) * r * 0.86);
              ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.strokeStyle = g.col("ink"); ctx.lineCap = "round"; ctx.stroke();
              ctx.fillStyle = g.col("ink"); D.circle(ctx, cx, cy, r * 0.07); ctx.fill();
              const px = Math.min(g.h * 0.16, r * 0.36);
              D.text(ctx, ms[i].label.toUpperCase() + "  " + ms[i].text, cx, cy + px * 1.35, { px: px * 0.8, weight: 600, family: g.font, base: "alphabetic", color: g.col("ink", 0.75), spacing: 0.06 });
          }
      } },
    { key: "big", label: "Big number", about: "Big number shows your first reading huge, the rest small beneath it.",
      aspect(o, n) { return 1.7; },
      draw(g) {
          const ctx = g.ctx, ms = meters(g);
          if (ms.length === 0) return;
          const main = ms[0];
          const px = Math.min(g.h * 0.55 / 0.74, D.fit(ctx, main.text, g.w * 0.95, 1000, g.weight, g.font));
          const lpx = Math.min(g.h * 0.1, D.fit(ctx, main.label.toUpperCase(), g.w, 1000, 600, g.font, 0.2));
          D.text(ctx, main.label.toUpperCase(), 0, lpx * 0.9, { px: lpx, weight: 600, family: g.font, align: "left", base: "alphabetic", color: g.col("accent"), spacing: 0.2 });
          D.text(ctx, main.text, 0, lpx * 1.4 + px * 0.76, { px, weight: g.weight, family: g.font, align: "left", base: "alphabetic", color: g.col("ink") });
          const rest = [];
          for (let i = 1; i < ms.length; i++) rest.push(ms[i].label + " " + ms[i].text);
          if (main.detail) rest.unshift(main.detail);
          const line = rest.join("   ·   ");
          if (line) {
              const spx = Math.min(g.h * 0.09, D.fit(ctx, line, g.w, 1000, 400, g.font));
              D.text(ctx, line, 0, g.h - spx * 0.3, { px: spx, weight: 400, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.65) });
          }
      } }
];

var byKey = {};
for (let i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
