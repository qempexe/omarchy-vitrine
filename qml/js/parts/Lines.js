.pragma library

// The edge of a card. One entry per tile in Lines, in the order the tiles show.
// To add one, see CONTRIBUTING.md.
//
// Lines follow the card's own shape, whatever it is: g.edge(inset) puts the outline
// on ctx, moved `inset` pixels inward, ready to stroke.
//
// entry fields:
//   key, label      the saved value and the name on the tile
//   about           one sentence for the settings hint
//   usesColor       false when it draws in the accent, not the line color
//   usesWidth       false when the Line width setting does nothing for it
//   glow            true when the card gets a soft glow around it
//   draw(g)         draws the line (see CONTRIBUTING.md for g)

function stroke(g, inset, width, style, dash) {
    const ctx = g.ctx;
    ctx.save();
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.lineJoin = "round";
    if (dash) { ctx.lineCap = dash.cap || "butt"; ctx.setLineDash(dash.pattern); ctx.lineDashOffset = dash.offset || 0; }
    g.edge(inset);
    ctx.stroke();
    // Qt's canvas keeps the dash through restore() and even reset(): clear it by hand
    if (dash) { ctx.setLineDash([]); ctx.lineDashOffset = 0; }
    ctx.restore();
}

function plain(g) {
    if (!g.p.line || g.lw <= 0) return;
    stroke(g, g.lw / 2, g.lw, g.lineStyle);
}

// a dashed edge: pattern in multiples of the line width
function dashes(pattern, cap) {
    return g => {
        if (!g.p.line) return;
        const w = g.lwN, out = [];
        for (let i = 0; i < pattern.length; i++) out.push(Math.max(0.1, pattern[i] * w));
        stroke(g, w / 2 + (cap === "round" ? 0.5 : 0), w, g.lineStyle, { pattern: out, cap });
    };
}

// a line that waves (or zigzags) along the card's own outline
function waves(sharp) {
    return g => {
        if (!g.p.line) return;
        const ctx = g.ctx, w = g.lwN;
        const amp = Math.max(1.2, Math.min(3, Math.min(g.L, g.T) / 30)), per = Math.max(6, amp * 4.5);
        const tr = g.trace(amp + w / 2 + 0.5);
        if (!(tr.len > 0)) return;
        const waves = Math.max(3, Math.round(tr.len / per)), step = sharp ? 0.5 : 1 / 8;
        ctx.save();
        ctx.strokeStyle = g.lineStyle; ctx.lineWidth = w; ctx.lineJoin = sharp ? "miter" : "round";
        ctx.beginPath();
        g.walkTrace(tr, tr.len / (waves / step), (x, y, tx, ty, nx, ny, i, n) => {
            const ph = i * step;
            const d = sharp ? (i % 2 === 0 ? -amp : amp) : Math.sin(ph * Math.PI * 2) * amp;
            if (i === 0) ctx.moveTo(x + nx * d, y + ny * d); else ctx.lineTo(x + nx * d, y + ny * d);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    };
}

var list = [
    { key: "none", label: "None", usesColor: false, usesWidth: false },
    { key: "solid", label: "Solid", draw: plain },
    { key: "double", label: "Double", about: "Double adds a thinner line inside.",
      draw(g) {
          if (!g.p.line) return;
          stroke(g, g.lwN / 2, g.lwN, g.lineStyle);
          stroke(g, g.lwN + 3.5, Math.max(0.8, g.lwN * 0.6), g.lineStyle);
      } },
    { key: "triple", label: "Triple", about: "Triple adds two.",
      draw(g) {
          if (!g.p.line) return;
          stroke(g, g.lwN / 2, g.lwN, g.lineStyle);
          stroke(g, g.lwN + 3, Math.max(0.7, g.lwN * 0.5), g.lineStyle);
          stroke(g, g.lwN + 6, Math.max(0.7, g.lwN * 0.5), g.lineStyle);
      } },
    { key: "inset", label: "Inset", about: "Inset runs a few pixels inside the edge.",
      draw(g) {
          if (!g.p.line) return;
          stroke(g, Math.max(5, Math.min(g.L, g.T) * 0.05), g.lwN, g.lineStyle);
      } },
    { key: "mat", label: "Mat", about: "Mat frames the inside with a light band, like a picture behind glass.",
      draw(g) {
          const band = Math.max(5, Math.min(g.L, g.T) * 0.06);
          stroke(g, band / 2, band, g.p.light || "rgba(255,255,255,0.18)");
          if (g.p.line) stroke(g, band + 0.5, 1, g.lineStyle);
      } },
    { key: "rail", label: "Rail", about: "Rail is a bar of the accent on one side, set below.", usesColor: false,
      draw(g) {
          const ctx = g.ctx, p = g.p;
          if (!p.mark) return;
          const t = Math.max(2, g.mw + 1), side = p.railSide || "bottom";
          ctx.save();
          g.edge(0);
          ctx.clip();
          ctx.fillStyle = g.markStyle;
          if (side === "bottom" || side === "both") ctx.fillRect(g.x0, g.y1 - t, g.L, t);
          if (side === "top" || side === "both") ctx.fillRect(g.x0, g.y0, g.L, t);
          if (side === "left") ctx.fillRect(g.x0, g.y0, t, g.T);
          if (side === "right") ctx.fillRect(g.x1 - t, g.y0, t, g.T);
          ctx.restore();
      } },
    { key: "glow", label: "Glow", about: "Glow shines softly around the card.", glow: true, draw: plain },
    { key: "neon", label: "Neon", about: "Neon is a bright tube with a halo.", glow: true,
      draw(g) {
          const c = g.p.mark || g.p.line;
          if (!c) return;
          stroke(g, 2, Math.max(2, g.lwN * 1.5), c);
          stroke(g, 2, Math.max(0.8, g.lwN * 0.5), "rgba(255,255,255,0.75)");
      }, usesColor: false },
    { key: "dashed", label: "Dashed", draw: dashes([4, 2.5]) },
    { key: "dotted", label: "Dotted", draw: dashes([0.01, 2.6], "round") },
    { key: "dashdot", label: "Dash and dot", draw: dashes([4, 2, 0.01, 2], "round") },
    { key: "wavy", label: "Wavy", about: "Wavy waves all the way round.", draw: waves(false) },
    { key: "sawtooth", label: "Sawtooth", about: "Sawtooth zigzags all the way round.", draw: waves(true) },
    { key: "stitched", label: "Stitched", about: "Stitched sews it a little way inside, like leather.",
      draw(g) {
          if (!g.p.line) return;
          const w = Math.max(1, g.lwN * 0.8);
          stroke(g, Math.max(4, Math.min(g.L, g.T) * 0.045), w, g.lineStyle, { pattern: [w * 3.5, w * 2.5] });
      } },
    { key: "rope", label: "Rope", about: "Rope twists all the way round.",
      draw(g) {
          if (!g.p.line) return;
          const w = Math.max(2.5, g.lwN * 2);
          stroke(g, w / 2, w, g.lineStyle, { pattern: [w * 0.9, w * 0.5] });
          stroke(g, w / 2, w * 0.45, g.p.dark || "rgba(0,0,0,0.4)", { pattern: [w * 0.3, w * 1.1], offset: w * 0.2 });
      } },
    { key: "chain", label: "Chain", about: "Chain links all the way round, one flat and one on its side.",
      draw(g) {
          if (!g.p.line) return;
          const ctx = g.ctx, lk = Math.max(5, g.lwN * 4), lh = Math.max(1.6, lk * 0.32);
          ctx.save();
          ctx.strokeStyle = g.lineStyle;
          ctx.lineWidth = Math.max(0.8, g.lwN * 0.7);
          g.along(lh + 1, lk * 0.82, (x, y, tx, ty, nx, ny, i) => {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(Math.atan2(ty, tx));
              ctx.beginPath();
              if (i % 2 === 0) ctx.ellipse(-lk / 2, -lh, lk, lh * 2);
              else { ctx.moveTo(-lk * 0.45, 0); ctx.lineTo(lk * 0.45, 0); }
              ctx.stroke();
              ctx.restore();
          });
          ctx.restore();
      } },
    { key: "beads", label: "Beads", about: "Beads string round the edge.",
      draw(g) {
          if (!g.p.line) return;
          const w = Math.max(2.4, g.lwN * 2.2);
          stroke(g, w / 2 + 1, w, g.lineStyle, { pattern: [0.01, w * 1.7], cap: "round" });
      } },
    { key: "ladder", label: "Ladder", about: "Ladder has rungs between two lines.",
      draw(g) {
          if (!g.p.line) return;
          const w = 1, gap = Math.max(4, g.lwN * 3);
          stroke(g, 0.5, w, g.lineStyle);
          stroke(g, gap + 0.5, w, g.lineStyle);
          stroke(g, gap / 2 + 0.5, gap, g.lineStyle, { pattern: [1, 3] });
      } },
    { key: "sketch", label: "Sketched", about: "Sketched looks drawn by hand, twice and not quite on top.",
      draw(g) {
          if (!g.p.line) return;
          const ctx = g.ctx;
          stroke(g, g.lwN / 2, g.lwN, g.lineStyle);
          ctx.save();
          ctx.translate(1.2, -0.8);
          ctx.globalAlpha = 0.6;
          stroke(g, g.lwN / 2 + 1, Math.max(0.6, g.lwN * 0.6), g.lineStyle);
          ctx.restore();
      } },
    { key: "gilded", label: "Gilded", about: "Gilded is a carved frame in your accent: a bright shine, a dark crease, and a thin inner line.",
      usesColor: false,
      draw(g) {
          const fc = g.p.frameColors;
          if (!fc || fc.length < 4) return;
          const w = Math.max(3, Math.min(g.L, g.T) * 0.035) + g.lwN;
          const ctx = g.ctx;
          const grad = ctx.createLinearGradient(g.x0, g.y0, g.x1, g.y1);
          grad.addColorStop(0, fc[0]); grad.addColorStop(0.35, fc[1]);
          grad.addColorStop(0.65, fc[2]); grad.addColorStop(1, fc[3]);
          stroke(g, w / 2, w, grad);
          stroke(g, w * 0.55, 1, "rgba(0,0,0,0.45)");
          stroke(g, w + 3, 1, fc[3]);
      } },
    { key: "glitch", label: "Glitch", about: "Glitch slips into cyan and magenta.",
      draw(g) {
          const ctx = g.ctx, w = g.lwN;
          ctx.save(); ctx.translate(-1.5, 0); stroke(g, w / 2, w, "rgba(0,230,255,0.75)"); ctx.restore();
          ctx.save(); ctx.translate(1.5, 0); stroke(g, w / 2, w, "rgba(255,40,170,0.75)"); ctx.restore();
          if (g.p.line) stroke(g, w / 2, Math.max(0.8, w * 0.6), g.lineStyle);
      } }
];

var byKey = {};
for (let i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
