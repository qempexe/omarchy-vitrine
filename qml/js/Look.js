.pragma library
.import "Theme.js" as Theme
.import "Card.js" as Card
.import "Kinds.js" as Kinds
.import "parts/Frames.js" as Frames
.import "parts/Surfaces.js" as Surfaces
.import "parts/Lines.js" as Lines

// How each widget looks: its colors, its card and its box, from the settings and the
// theme. Colors are [r, g, b] from 0 to 255.
//
// th: { fg, barText, accent, urgent, bg } as [r, g, b], palette and borders as lists
//     of "#rrggbb", borderAngle

function hex3(h) {
    if (typeof h !== "string" || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) return [0, 0, 0];
    if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}
function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function grey(l) { const v = Math.round(l * 255); return [v, v, v]; }
function contrast(c) { return lum(c) > 0.5 ? [20, 20, 20] : [245, 245, 245]; }
function css(c, a) {
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (typeof a === "number" ? Math.max(0, Math.min(1, a)) : 1) + ")";
}
// readable on bg: c itself, or black or white when it isn't
function readable(c, bg) { return Math.abs(lum(c) - lum(bg)) >= 0.35 ? c : contrast(bg); }

// does this widget get a card?
function hasCard(cfg, w) {
    const f = Frames.byKey[cfg.frame] || Frames.byKey.none;
    return !f.noCard && w.card !== "none";
}

// the colors of widget w, the index-th on the desktop, with its middle at xFrac across the screen
function colorsFor(cfg, th, w, index, xFrac) {
    const mode = cfg.colorMode;
    const pal = th.palette && th.palette.length ? th.palette : [];
    const bor = th.borders && th.borders.length ? th.borders : [];
    let bg = th.bg, fg = th.fg, accent = th.accent, accent2 = th.urgent;
    if (mode === "custom") {
        bg = hex3(cfg.customBg); fg = hex3(cfg.customFg); accent = hex3(cfg.accentColor);
        accent2 = mix(accent, fg, 0.45);
    } else if (mode === "monochrome") {
        bg = grey(lum(th.bg)); fg = contrast(bg); accent = fg; accent2 = mix(fg, bg, 0.4);
    } else if (mode === "palette" && pal.length > 0) {
        accent = hex3(pal[index % pal.length]); accent2 = hex3(pal[(index + 1) % pal.length]);
    } else if (mode === "borders" && bor.length > 0) {
        accent = hex3(Theme.sample(bor, xFrac)); accent2 = hex3(Theme.sample(bor, 1 - xFrac));
    }
    // a widget can take one of the theme's palette colors for itself
    if (w && w.accent && w.accent !== "auto" && mode !== "monochrome" && pal.length > 0) {
        const k = parseInt(w.accent, 10) - 1;
        if (k >= 0) { accent = hex3(pal[k % pal.length]); accent2 = hex3(pal[(k + 1) % pal.length]); }
    }
    const card = w ? hasCard(cfg, w) : false;
    let ink;
    if (card) ink = readable(fg, bg);
    else if (mode === "monochrome") ink = fg;
    // the text color (yours in Custom), the bar's, or the accent (yours in Custom)
    else ink = cfg.bareInk === "bar" ? th.barText : (cfg.bareInk === "accent" ? accent : fg);
    return { ink, accent, accent2, bg, card };
}

// the line color(s) of a card, from the Line color setting
function lineColors(cfg, th, colors) {
    const c = colors;
    let one;
    if (cfg.border === "text") one = css(c.ink, 0.8);
    else if (cfg.border === "accent") one = css(c.accent, 0.9);
    else if (cfg.border === "border" && th.borders && th.borders.length > 0) return { line: th.borders[0], grad: th.borders.slice(), angle: th.borderAngle || 0 };
    else one = css(c.ink, 0.2);
    if (!cfg.outlineGradient) return { line: one, grad: [], angle: 0 };
    let to;
    if (cfg.outlineGradientTo === "accent") to = css(c.accent, 0.95);
    else if (cfg.outlineGradientTo === "palette" && th.palette && th.palette.length) to = th.palette[(th.palette.length > 1 ? 1 : 0)];
    else if (cfg.outlineGradientTo === "border" && th.borders && th.borders.length) to = th.borders[th.borders.length - 1];
    else to = css(mix(c.ink, [255, 255, 255], 0.6), 0.9);
    return { line: one, grad: [one, to], angle: 0 };
}

// the box of a widget in pixels: { w, h } of the whole thing, the content inside it, the caption's height
// k: how much this screen grows widgets (Sizes follow each screen's height), 1 if not given
function boxOf(cfg, w, k) {
    const scale = (cfg.scale || 100) / 100 * (typeof k === "number" && k > 0 ? k : 1);
    const ch = Math.max(16, w.size * scale), cw = ch * Kinds.aspectOf(w);
    const capH = w.caption ? Math.max(10, ch * 0.16) : 0;
    const card = hasCard(cfg, w);
    const f = Frames.byKey[cfg.frame] || Frames.byKey.rounded;
    const pad = card ? ch * (cfg.padding || 0) / 100 : 0;
    const inn = card && f.inner ? f.inner : { l: 0, r: 0, t: 0, b: 0 };
    let bh = (ch + capH + 2 * pad) / Math.max(0.3, 1 - (inn.t || 0) - (inn.b || 0));
    const o = { dir: cfg.pointing, flat: cfg.flatCorners };
    const side = card && f.sides ? f.sides(cw + 2 * pad + bh * 0.8, bh, o) : 0;
    let bw = (cw + 2 * pad + 2 * side) / Math.max(0.3, 1 - (inn.l || 0) - (inn.r || 0));
    if (card && f.round) { const d = Math.max(bw, bh); bw = d; bh = d; }
    const inside = card ? Card.contentBox(cfg.frame, bw, bh, pad, o) : { x: 0, y: 0, w: bw, h: bh };
    // the content keeps its own shape inside a bigger box (circles)
    const cx = inside.x + (inside.w - cw) / 2, cy = inside.y + (inside.h - ch - capH) / 2;
    return { w: bw, h: bh, content: { x: cx, y: cy, w: cw, h: ch }, captionH: capH, pad, card };
}

// the shadow under a card (or under bare ink): { color, blur (0..1), y } or null
function shadowOf(cfg, colors) {
    if (colors.card) {
        const lineGlow = (Lines.byKey[cfg.lines] || {}).glow === true;
        const s = cfg.shadow;
        if (s === "glow" || (lineGlow && s === "none")) return { color: css(colors.accent, 0.75), blur: 0.9, y: 0 };
        if (s === "soft") return { color: "rgba(0,0,0,0.42)", blur: 0.55, y: 4 };
        if (s === "deep") return { color: "rgba(0,0,0,0.7)", blur: 1.0, y: 10 };
        if (s === "lifted") return { color: "rgba(0,0,0,0.5)", blur: 0.85, y: 18 };
        return null;
    }
    const e = cfg.textEffect;
    if (e === "soft") return { color: "rgba(0,0,0,0.55)", blur: 0.45, y: 2 };
    if (e === "deep") return { color: "rgba(0,0,0,0.85)", blur: 0.8, y: 4 };
    if (e === "glow") return { color: css(colors.accent, 0.85), blur: 0.75, y: 0 };
    return null;
}

// the color a gradient fill ends in, from the Gradient into setting
function gradientEnd(cfg, th, c) {
    const to = cfg.gradientTo;
    if (to === "palette" && th.palette && th.palette.length) return mix(c.bg, hex3(th.palette[th.palette.length > 1 ? 1 : 0]), 0.5);
    if (to === "border" && th.borders && th.borders.length) return mix(c.bg, hex3(th.borders[th.borders.length - 1]), 0.5);
    if (to === "lighter") return mix(c.bg, [255, 255, 255], 0.22);
    if (to === "darker") return mix(c.bg, [0, 0, 0], 0.4);
    return mix(c.bg, c.accent, 0.35);
}

// what Card.paint needs for this widget's card
function cardParams(cfg, th, colors, width, height, margin) {
    const c = colors, lc = lineColors(cfg, th, colors);
    const S = Surfaces.byKey[cfg.surface] || Surfaces.byKey.filled;
    let alpha = (cfg.cardOpacity || 0) / 100 * (typeof S.fill === "number" ? S.fill : 1);
    if (S.noFill) alpha = 0;
    const fill = css(c.bg, alpha);
    const light = lum(c.bg) > 0.5;
    const Ln = Lines.byKey[cfg.lines] || Lines.byKey.none;
    const lw = cfg.lines === "none" ? 0 : (cfg.borderWidth || 1);
    return {
        width, height, margin,
        frame: cfg.frame, r: cfg.radius, surface: cfg.surface, lines: cfg.lines, ornament: cfg.ornaments,
        pointing: cfg.pointing, flat: cfg.flatCorners, railSide: cfg.railSide, gradAcross: cfg.gradientDir === "down",
        fill,
        fill2: cfg.fill === "gradient" && S.noGradient !== true ? css(gradientEnd(cfg, th, c), alpha) : "",
        glass: cfg.fill === "glass" && S.noGradient !== true,
        line: Ln.usesColor === false ? css(c.accent, 0.9) : lc.line, lineWidth: lw,
        lineGrad: lc.grad, lineAngle: lc.angle, markGrad: [],
        mark: css(c.accent, 0.95), markWidth: Math.max(1, cfg.borderWidth || 1),
        pattern: cfg.pattern === "none" ? "" : cfg.pattern, patternColor: css(c.ink, 0.06),
        depth: cfg.depth === "flat" ? "" : cfg.depth,
        light: light ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.14)",
        dark: light ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.4)",
        frost: css(light ? [255, 255, 255] : mix(c.bg, [255, 255, 255], 0.35), light ? 0.55 : 0.3),
        key: css(light ? mix(c.bg, [0, 0, 0], 0.4) : mix(c.bg, c.accent, 0.55), Math.max(alpha, 0.6)),
        second: css(mix(c.bg, c.accent, 0.28), alpha), splitColor: css(mix(c.bg, c.accent, 0.5), alpha),
        head: css(mix(c.bg, c.accent, 0.7), Math.max(alpha, 0.85)),
        frameColors: [css(mix(c.accent, [255, 255, 255], 0.55)), css(c.accent), css(mix(c.accent, [0, 0, 0], 0.45)), css(mix(c.accent, [255, 255, 255], 0.3))],
        velvetSheen: css(mix(c.bg, light ? [255, 255, 255] : c.accent, light ? 0.35 : 0.3), alpha),
        metal: [css(mix(c.bg, [255, 255, 255], light ? 0.5 : 0.22), alpha), css(c.bg, alpha),
                css(mix(c.bg, [0, 0, 0], light ? 0.12 : 0.3), alpha), css(mix(c.bg, [255, 255, 255], light ? 0.25 : 0.1), alpha)],
        shadow: S.ownShadow ? "rgba(0,0,0,0.8)" : "", shadowBlur: S.ownShadow ? 14 : 0
    };
}
