.pragma library
.import "parts/Frames.js" as Frames
.import "parts/Surfaces.js" as Surfaces
.import "parts/Lines.js" as Lines
.import "parts/Ornaments.js" as Ornaments
.import "Trace.js" as Trace

// Paints the card behind one widget on a Canvas: the shape from parts/Frames.js,
// filled the way a surface from parts/Surfaces.js fills it, then the lines and the
// ornaments. Each part draws through `g` (see CONTRIBUTING.md).
//
// p: {
//   width, height     the canvas
//   margin            room around the card for shadows and ornaments
//   frame             a key from parts/Frames.js
//   r                 roundness in pixels
//   pointing, flat    the Pointing and Square corners settings, for the shapes that use them
//   surface, lines, ornament   keys from parts/
//   fill, fill2       css colors, fill2 for a gradient ("" = none); gradAcross runs it
//                     from the top down instead of corner to corner
//   glass             a bright line along the top
//   line, lineWidth   line color and width (0 = no line)
//   mark, markWidth   the accent, for ornaments and rails
//   lineGrad, markGrad, lineAngle   lines in several colors at an angle
//   pattern, patternColor           "stripes" | "dots" | "grid" | ""
//   depth, light, dark              "raised" | "sunken" | ""
//   shadow, shadowBlur              only for surfaces that cast their own shadow
//   and the colors some surfaces want: frost, key, second, splitColor, head,
//   frameColors, velvetSheen, metal
// }

function num(v, fallback) {
    return typeof v === "number" && isFinite(v) ? v : fallback;
}

function hash(k, seed) {
    var v = Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
}

function volute(ctx, cx, cy, rmax, side, color) {
    if (!color || rmax < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.9, rmax / 6);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    var turns = 2.25 * Math.PI * 2, steps = 48;
    for (var i = 0; i <= steps; i++) {
        var t = i / steps, a = t * turns, rr = rmax * (1 - t * 0.85);
        var px = cx + side * Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
}

function angled(ctx, x0, y0, L, T, angle, colors) {
    var a = num(angle, 0) * Math.PI / 180;
    var dx = Math.cos(a), dy = Math.sin(a);
    var half = (Math.abs(dx) * L + Math.abs(dy) * T) / 2;
    var cx = x0 + L / 2, cy = y0 + T / 2;
    var g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
    for (var i = 0; i < colors.length; i++) g.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), colors[i]);
    return g;
}

function texture(ctx, kind, color, x0, y0, L, T) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    var step = 6;
    if (kind === "stripes") {
        ctx.beginPath();
        for (var x = x0 - T; x < x0 + L; x += step) { ctx.moveTo(x, y0 + T); ctx.lineTo(x + T, y0); }
        ctx.stroke();
    } else if (kind === "dots") {
        for (var dx = x0 + 3; dx < x0 + L; dx += step)
            for (var dy = y0 + 3; dy < y0 + T; dy += step) ctx.fillRect(dx, dy, 1, 1);
    } else if (kind === "grid") {
        for (var gx = x0 + step; gx < x0 + L; gx += step) ctx.fillRect(gx, y0, 1, T);
        for (var gy = y0 + step; gy < y0 + T; gy += step) ctx.fillRect(x0, gy, L, 1);
    }
}

// the box the widget draws in, inside a card of w x h (with `pad` pixels of room)
function contentBox(frameKey, w, h, pad, o) {
    var f = Frames.byKey[frameKey] || Frames.byKey.rounded;
    var inn = f.inner || {};
    var side = f.sides ? num(f.sides(w, h, o), 0) : 0;
    var l = pad + num(inn.l, 0) * w + side, rr = pad + num(inn.r, 0) * w + side;
    var t = pad + num(inn.t, 0) * h, b = pad + num(inn.b, 0) * h;
    return { x: l, y: t, w: Math.max(1, w - l - rr), h: Math.max(1, h - t - b) };
}

function paint(ctx, p) {
    var W = num(p.width, 0), H = num(p.height, 0);
    if (!p.keep) ctx.reset();
    // reset() leaves the line dash as it was: start clean
    if (ctx.setLineDash) ctx.setLineDash([]);
    if (W <= 0 || H <= 0) return;
    ctx.save();
    if (p.keep) ctx.translate(num(p.ox, 0), num(p.oy, 0));
    draw(ctx, p, W, H);
    ctx.restore();
}

function draw(ctx, p, W, H) {
    var m = num(p.margin, 0);
    var x0 = m, y0 = m, L = W - 2 * m, T = H - 2 * m;
    if (L < 2 || T < 2) return;
    var F = Frames.byKey[p.frame] || Frames.byKey.rounded;
    if (F.noCard) return;
    if (F.round) {                    // a circle stays round inside any box
        var d = Math.min(L, T);
        x0 += (L - d) / 2; y0 += (T - d) / 2; L = d; T = d;
    }
    var r = Math.max(0, num(p.r, 0));
    var x1 = x0 + L, y1 = y0 + T;
    var surface = p.surface || "filled", lines = p.lines || "none", orn = p.ornament || "none";
    var S = Surfaces.byKey[surface] || Surfaces.byKey.filled;
    var Ln = Lines.byKey[lines] || Lines.byKey.none;
    var O = Ornaments.byKey[orn] || Ornaments.byKey.none;
    var ink = p.mark || p.line || "";

    var o = { dir: p.pointing === "left" || p.pointing === "both" ? p.pointing : "right",
              flat: p.flat === "top" || p.flat === "bottom" ? p.flat : "none" };
    function outline(x, y, l, t, rr) { F.path(ctx, x, y, l, t, rr, o); }
    // a good size for one ornament: grows with the card, never huge
    var s = Math.max(4, Math.min(12, Math.min(L, T) * 0.06));

    var g = {
        ctx: ctx, p: p, vertical: false,
        x0: x0, y0: y0, x1: x1, y1: y1, L: L, T: T, r: r,
        ends: "rounded", edge: "", flat: "", dir: o.dir, inner: "end",
        surface: surface, lines: lines, orn: orn, ink: ink,
        seed: Math.round(L) % 97 + Math.round(T),
        tone: ink || "rgba(255,255,255,0.4)",
        num: num, hash: hash,
        outline: function (x, y, l, t, rr) { outline(x, y, l, t, rr); },
        volute: function (cx, cy, rmax, side, color) { volute(ctx, cx, cy, rmax, side, color); },
        texture: function (kind, color, x, y, l, t) { texture(ctx, kind, color, x, y, l, t); },
        // the card's outline moved `inset` pixels inward, for lines
        edge: function (inset) {
            var d = num(inset, 0);
            outline(x0 + d, y0 + d, Math.max(1, L - 2 * d), Math.max(1, T - 2 * d), Math.max(0, r - d));
        },
        // the outline moved `inset` pixels inward as points, and a walk round it at
        // points about `step` apart (see Trace.js)
        trace: function (inset) {
            var d = num(inset, 0);
            return Trace.trace(function (c) { F.path(c, x0 + d, y0 + d, Math.max(1, L - 2 * d), Math.max(1, T - 2 * d), Math.max(0, r - d), o); });
        },
        along: function (inset, step, fn) { return Trace.walk(g.trace(inset), step, fn); },
        walkTrace: function (tr, step, fn) { return Trace.walk(tr, step, fn); },
        s: s,
        spots: F.spots ? F.spots(x0, y0, L, T, s, o) : Frames.boxSpots(x0, y0, L, T, s)
    };

    if (S.base) {
        S.base(g);
        y0 = g.y0; T = g.T; y1 = g.y1;
    }

    if (S.noFill !== true) {
        if (S.ownShadow === true && num(p.shadowBlur, 0) > 0 && p.shadow) {
            ctx.shadowBlur = p.shadowBlur;
            ctx.shadowColor = p.shadow;
            ctx.shadowOffsetY = Math.min(8, T * 0.04);
        }
        var style = p.fill || "rgba(0,0,0,0)";
        if (p.fill2) {
            var grad = p.gradAcross ? ctx.createLinearGradient(x0, y0, x0, y1) : ctx.createLinearGradient(x0, y0, x1, y1);
            grad.addColorStop(0, p.fill);
            grad.addColorStop(p.gradAcross ? 0.12 : 0.4, p.fill);
            grad.addColorStop(1, p.fill2);
            style = grad;
        }
        if (S.fillStyle) style = S.fillStyle(g, style);
        ctx.fillStyle = style;
        outline(x0, y0, L, T, r);
        ctx.fill();
        if (S.afterFill) S.afterFill(g);
        if (F.afterFill) F.afterFill(g);
        ctx.shadowBlur = 0;
        ctx.shadowColor = "rgba(0,0,0,0)";
        ctx.shadowOffsetY = 0;

        if (S.inside) {
            ctx.save();
            outline(x0, y0, L, T, r);
            ctx.clip();
            S.inside(g);
            ctx.restore();
        }
        if (S.outside) S.outside(g);

        var inside = (p.pattern && p.patternColor) || (p.depth === "raised" || p.depth === "sunken");
        if (inside) {
            ctx.save();
            outline(x0, y0, L, T, r);
            ctx.clip();
            if (p.pattern && p.patternColor) texture(ctx, p.pattern, p.patternColor, x0, y0, L, T);
            if ((p.depth === "raised" || p.depth === "sunken") && p.light && p.dark) {
                var top = p.depth === "raised" ? p.light : p.dark;
                var bottom = p.depth === "raised" ? p.dark : p.light;
                ctx.lineWidth = 2;
                ctx.strokeStyle = top;
                outline(x0 + 1, y0 + 1, L - 2, T - 2, r);
                ctx.save();
                ctx.beginPath(); ctx.rect(x0, y0, L, T / 2); ctx.clip();
                outline(x0 + 1, y0 + 1, L - 2, T - 2, r);
                ctx.stroke();
                ctx.restore();
                ctx.save();
                ctx.beginPath(); ctx.rect(x0, y0 + T / 2, L, T / 2); ctx.clip();
                ctx.strokeStyle = bottom;
                outline(x0 + 1, y0 + 1, L - 2, T - 2, r);
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        if (p.glass) {
            ctx.save();
            outline(x0, y0, L, T, r);
            ctx.clip();
            var gl = ctx.createLinearGradient(x0, y0, x0, y0 + T * 0.5);
            gl.addColorStop(0, p.glassColor || "rgba(255,255,255,0.16)");
            gl.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = gl;
            ctx.fillRect(x0, y0, L, T * 0.5);
            ctx.restore();
        }
    }

    var lw = num(p.lineWidth, 0);
    g.lw = lw;
    g.lwN = Math.max(1, lw);
    g.lineStyle = p.lineGrad && p.lineGrad.length > 1 ? angled(ctx, x0, y0, L, T, p.lineAngle, p.lineGrad) : p.line;
    g.side0 = x0 + Math.max(r * 0.8, Math.min(T, L) * 0.12);
    g.side1 = x1 - Math.max(r * 0.8, Math.min(T, L) * 0.12);
    g.mw = Math.max(1, num(p.markWidth, 2));
    g.markStyle = p.markGrad && p.markGrad.length > 1 ? angled(ctx, x0, y0, L, T, p.lineAngle, p.markGrad) : p.mark;
    if (Ln.draw) Ln.draw(g);
    if (O.draw) O.draw(g);
    if (F.onTop) F.onTop(g);
}
