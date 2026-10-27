.pragma library
.import "../Draw.js" as D

// Now playing styles. One entry per tile in a media widget's Style, in the order the
// tiles show. To add one, see CONTRIBUTING.md.
//
// g.data: { has (something is playing or paused), title, artist, album, art (the
//           cover's url once it has loaded, else ""), pos and len in seconds,
//           playing, player (the app's name) }
// entry fields: key, label, about, aspect, draw(g).

function clock(s) {
    s = Math.max(0, Math.floor(s || 0));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h > 0 ? h + ":" + D.pad2(m) : "" + m) + ":" + D.pad2(r);
}
function frac(d) { return d.len > 0 ? Math.max(0, Math.min(1, d.pos / d.len)) : 0; }
function titleOf(d) { return d.has ? (d.title || "Unknown track") : "Nothing playing"; }
function artistOf(d) { return d.has ? (d.artist || d.player || "") : ""; }

// the cover in a square, or a note when there is none
function cover(g, x, y, s, r) {
    const ctx = g.ctx, d = g.data;
    ctx.save();
    D.roundRect(ctx, x, y, s, s, r);
    ctx.clip();
    if (d.art) ctx.drawImage(d.art, x, y, s, s);
    else {
        ctx.fillStyle = g.col("ink", 0.1);
        ctx.fillRect(x, y, s, s);
        D.text(ctx, "♪", x + s / 2, y + s * 0.66, { px: s * 0.5, weight: 400, family: g.font, base: "alphabetic", color: g.col("ink", 0.45) });
    }
    ctx.restore();
}
function bar(g, x, y, w, h) {
    const ctx = g.ctx;
    D.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = g.col("ink", 0.12); ctx.fill();
    if (g.data.len > 0) {
        D.roundRect(ctx, x, y, Math.max(h, w * frac(g.data)), h, h / 2);
        ctx.fillStyle = g.col("accent"); ctx.fill();
    }
}
// text cut to a width, with an ellipsis
function cut(ctx, str, maxW, px, weight, family, italic) {
    if (D.width(ctx, str, px, weight, family, 0, italic) <= maxW) return str;
    let lo = 0, hi = str.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (D.width(ctx, str.slice(0, mid) + "…", px, weight, family, 0, italic) <= maxW) lo = mid; else hi = mid - 1;
    }
    return str.slice(0, lo) + "…";
}

var list = [
    { key: "cover", label: "Cover", about: "Cover puts the album art beside the title, the artist and how far along it is.", aspect: 3.2,
      draw(g) {
          const ctx = g.ctx, d = g.data, s = g.h;
          cover(g, 0, 0, s, s * 0.1);
          const x = s + g.h * 0.16, room = g.w - x;
          const tpx = g.h * 0.2, apx = g.h * 0.15;
          D.text(ctx, cut(ctx, titleOf(d), room, tpx, 650, g.font), x, g.h * 0.32, { px: tpx, weight: 650, family: g.font, align: "left", base: "alphabetic", color: g.col("ink") });
          D.text(ctx, cut(ctx, artistOf(d), room, apx, 400, g.font), x, g.h * 0.55, { px: apx, weight: 400, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.65) });
          if (!d.has) return;
          bar(g, x, g.h * 0.72, room, Math.max(3, g.h * 0.05));
          const tm = clock(d.pos) + (d.len > 0 ? " / " + clock(d.len) : "");
          D.text(ctx, tm + (d.playing ? "" : "   ‖"), x, g.h * 0.97, { px: g.h * 0.11, weight: 500, family: g.font, align: "left", base: "alphabetic", color: g.col("ink", 0.55) });
      } },
    { key: "album", label: "Album", about: "Album shows the cover big, the title and artist under it.", aspect: 0.78,
      draw(g) {
          const ctx = g.ctx, d = g.data, s = Math.min(g.w, g.h * 0.74);
          cover(g, (g.w - s) / 2, 0, s, s * 0.05);
          const tpx = Math.min(g.h * 0.075, g.w * 0.09), apx = tpx * 0.78;
          D.text(ctx, cut(ctx, titleOf(d), g.w, tpx, 650, g.font), g.w / 2, s + tpx * 1.45, { px: tpx, weight: 650, family: g.font, base: "alphabetic", color: g.col("ink") });
          D.text(ctx, cut(ctx, artistOf(d), g.w, apx, 400, g.font), g.w / 2, s + tpx * 1.45 + apx * 1.45, { px: apx, weight: 400, family: g.font, base: "alphabetic", color: g.col("ink", 0.65) });
          if (d.has) bar(g, (g.w - s) / 2, g.h - Math.max(3, g.h * 0.02) - 1, s, Math.max(3, g.h * 0.02));
      } },
    { key: "line", label: "One line", about: "One line fits the title and the artist on a single line, with a hairline of progress.", aspect: 7,
      draw(g) {
          const ctx = g.ctx, d = g.data;
          let str = "♪  " + titleOf(d) + (artistOf(d) ? "  ·  " + artistOf(d) : "");
          let px = Math.min(g.h * 0.55, D.fit(ctx, str, g.w, 1000, 450, g.font));
          if (px < g.h * 0.3) { px = g.h * 0.3; str = cut(ctx, str, g.w, px, 450, g.font); }
          D.text(ctx, str, g.w / 2, g.h * 0.55, { px, weight: 450, family: g.font, base: "alphabetic", color: g.col("ink") });
          if (d.has && d.len > 0) bar(g, g.w * 0.2, g.h * 0.82, g.w * 0.6, Math.max(2, g.h * 0.06));
      } },
    { key: "vinyl", label: "Vinyl", about: "Vinyl spins a record with the cover as its label while the music plays.", aspect: 2.6,
      draw(g) {
          const ctx = g.ctx, d = g.data, r = g.h / 2, cx = r, cy = r;
          D.circle(ctx, cx, cy, r);
          ctx.fillStyle = "rgba(12,10,10,0.96)"; ctx.fill();
          ctx.lineWidth = 0.6;
          for (let k = 0; k < 9; k++) {
              D.circle(ctx, cx, cy, r * (0.48 + k * 0.055));
              ctx.strokeStyle = "rgba(255,255,255," + (0.035 + (k % 3 === 0 ? 0.04 : 0)) + ")"; ctx.stroke();
          }
          // the shine, turning with the record
          const spin = d.playing ? (d.pos || 0) * Math.PI / 9 : 0;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(spin);
          const sh = ctx.createLinearGradient(-r, -r, r, r);
          sh.addColorStop(0.35, "rgba(255,255,255,0)");
          sh.addColorStop(0.5, "rgba(255,255,255,0.09)");
          sh.addColorStop(0.65, "rgba(255,255,255,0)");
          D.circle(ctx, 0, 0, r); ctx.fillStyle = sh; ctx.fill();
          D.circle(ctx, 0, 0, r * 0.4); ctx.clip();
          if (d.art) ctx.drawImage(d.art, -r * 0.4, -r * 0.4, r * 0.8, r * 0.8);
          else { ctx.fillStyle = g.col("accent"); ctx.fillRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8); }
          ctx.restore();
          D.circle(ctx, cx, cy, r * 0.04); ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fill();
          const x = r * 2 + g.h * 0.18, room = g.w - x;
          const tpx = g.h * 0.17, apx = g.h * 0.13;
          D.text(ctx, cut(ctx, titleOf(d), room, tpx, 400, g.fonts.serif, true), x, g.h * 0.42, { px: tpx, weight: 400, family: g.fonts.serif, italic: true, align: "left", base: "alphabetic", color: g.col("ink") });
          D.text(ctx, cut(ctx, artistOf(d).toUpperCase(), room, apx * 0.8, 600, g.font), x, g.h * 0.62, { px: apx * 0.8, weight: 600, family: g.font, align: "left", base: "alphabetic", color: g.col("accent"), spacing: 0.1 });
          if (d.has && d.len > 0) bar(g, x, g.h * 0.76, room * 0.8, Math.max(2, g.h * 0.03));
      } },
    { key: "marquee", label: "Big title", about: "Big title sets the song's name large, the artist under it.", aspect: 3.6,
      draw(g) {
          const ctx = g.ctx, d = g.data, fam = g.fonts.serif;
          let t = titleOf(d);
          let px = Math.min(g.h * 0.5, D.fit(ctx, t, g.w, 1000, 500, fam));
          if (px < g.h * 0.28) { px = g.h * 0.28; t = cut(ctx, t, g.w, px, 500, fam); }
          D.text(ctx, t, 0, g.h * 0.5, { px, weight: 500, family: fam, align: "left", base: "alphabetic", color: g.col("ink") });
          const a = artistOf(d);
          if (a) D.text(ctx, cut(ctx, a, g.w * 0.7, g.h * 0.16, 400, g.font), 0, g.h * 0.5 + g.h * 0.24, { px: g.h * 0.16, weight: 400, family: g.font, align: "left", base: "alphabetic", color: g.col("accent") });
          if (d.has && d.len > 0) {
              ctx.fillStyle = g.col("ink", 0.15); ctx.fillRect(0, g.h * 0.92, g.w, Math.max(1, g.h * 0.015));
              ctx.fillStyle = g.col("accent"); ctx.fillRect(0, g.h * 0.92, g.w * frac(d), Math.max(1, g.h * 0.015));
          }
      } }
];

var byKey = {};
for (let i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
