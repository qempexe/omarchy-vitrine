.pragma library
.import "../Trace.js" as Trace

// The shape of the card behind a widget. One entry per tile in Shape, in the
// order the tiles show. To add one, see CONTRIBUTING.md.
//
// entry fields:
//   key, label     the saved value and the name on the tile
//   about          one sentence for the settings hint
//   path(ctx, x, y, w, h, r, o)
//                  puts the outline on ctx as one closed path (beginPath and
//                  closePath included). r is the Roundness setting in pixels.
//                  o: { dir, flat } from the Pointing and Square corners settings
//                  (dir "right" | "left" | "both", flat "none" | "top" | "bottom")
//   pointing       true when the Pointing setting changes it
//   flatCorners    true when the Square corners setting changes it
//   sides(w, h, o) optional: extra room in pixels inside the left and the right side,
//                  for shapes whose ends come in deeper than `inner` can say
//   minRoom        ends only: at least this share of endDepth(h) inside each side
//   afterFill(g)   optional drawing right after the fill (Folded corner's flaps)
//   onTop(g)       optional drawing on top of everything (Scroll's curls)
//   inner          optional { l, t, r, b }: extra room inside on each side, as a part
//                  of the card's size, so the widget stays clear of curves and points
//   noCard         true for the bare look: no card is drawn at all
//   round          true when the card is a circle: the widget is kept square
//   spots(x, y, w, h, s)
//                  optional: where ornaments sit, for shapes whose corners aren't the
//                  box's corners. Returns { corners: [tl, tr, br, bl], mids: [top,
//                  right, bottom, left] }, each { x, y, dx, dy }: the point and which
//                  way is inward (-1, 0 or 1 on each axis). s is the ornament size.
//                  Without it the corners of the box are used, s in from each side

// a rectangle with round corners. flat: "top" or "bottom" keeps those corners square
function rounded(ctx, x, y, w, h, r, flat) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const rt = flat === "top" ? 0 : r, rb = flat === "bottom" ? 0 : r;
    ctx.beginPath();
    ctx.moveTo(x + rt, y);
    ctx.lineTo(x + w - rt, y);
    if (rt > 0) ctx.arcTo(x + w, y, x + w, y + rt, rt);
    ctx.lineTo(x + w, y + h - rb);
    if (rb > 0) ctx.arcTo(x + w, y + h, x + w - rb, y + h, rb);
    ctx.lineTo(x + rb, y + h);
    if (rb > 0) ctx.arcTo(x, y + h, x, y + h - rb, rb);
    ctx.lineTo(x, y + rt);
    if (rt > 0) ctx.arcTo(x, y, x + rt, y, rt);
    ctx.closePath();
}
function flatOf(o) { return o && (o.flat === "top" || o.flat === "bottom") ? o.flat : "none"; }

// a bead of a scalloped or stamped edge, from (ax, ay) to (bx, by), bulging out (1)
// or in (-1). The outside is to the left of the walking direction
function bump(ctx, ax, ay, bx, by, out) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dy / len, ny = -dx / len;
    const k = len * 0.62 * out;
    ctx.quadraticCurveTo(mx + nx * k, my + ny * k, bx, by);
}
// a whole side made of bumps
function bumps(ctx, ax, ay, bx, by, size, out) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy);
    const n = Math.max(2, Math.round(len / size));
    for (let i = 0; i < n; i++)
        bump(ctx, ax + dx * i / n, ay + dy * i / n, ax + dx * (i + 1) / n, ay + dy * (i + 1) / n, out);
}

// spots on an ellipse filling the box: the four corners at 45 degrees
function ellipseSpots(x, y, w, h, s) {
    const cx = x + w / 2, cy = y + h / 2, rx = w / 2 - s * 1.2, ry = h / 2 - s * 1.2, k = Math.SQRT1_2;
    return {
        corners: [{ x: cx - rx * k, y: cy - ry * k, dx: 1, dy: 1 }, { x: cx + rx * k, y: cy - ry * k, dx: -1, dy: 1 },
                  { x: cx + rx * k, y: cy + ry * k, dx: -1, dy: -1 }, { x: cx - rx * k, y: cy + ry * k, dx: 1, dy: -1 }],
        mids: [{ x: cx, y: cy - ry, dx: 0, dy: 1 }, { x: cx + rx, y: cy, dx: -1, dy: 0 },
               { x: cx, y: cy + ry, dx: 0, dy: -1 }, { x: cx - rx, y: cy, dx: 1, dy: 0 }]
    };
}
// the box's spots, then some of them moved
function boxSpots(x, y, w, h, s) {
    const i = s * 1.6;
    return {
        corners: [{ x: x + i, y: y + i, dx: 1, dy: 1 }, { x: x + w - i, y: y + i, dx: -1, dy: 1 },
                  { x: x + w - i, y: y + h - i, dx: -1, dy: -1 }, { x: x + i, y: y + h - i, dx: 1, dy: -1 }],
        mids: [{ x: x + w / 2, y: y + i, dx: 0, dy: 1 }, { x: x + w - i, y: y + h / 2, dx: -1, dy: 0 },
               { x: x + w / 2, y: y + h - i, dx: 0, dy: -1 }, { x: x + i, y: y + h / 2, dx: 1, dy: 0 }]
    };
}

var list = [
    { key: "none", label: "No card", about: "No card leaves the widget on your wallpaper, like ink on the desktop.", noCard: true,
      path(ctx, x, y, w, h, r) { rounded(ctx, x, y, w, h, r); } },
    { key: "rounded", label: "Rounded", flatCorners: true,
      path(ctx, x, y, w, h, r, o) { rounded(ctx, x, y, w, h, r, flatOf(o)); } },
    { key: "square", label: "Square",
      path(ctx, x, y, w, h, r) { rounded(ctx, x, y, w, h, 0); } },
    { key: "pill", label: "Pill", inner: { l: 0.08, r: 0.08, t: 0, b: 0 }, flatCorners: true,
      spots(x, y, w, h, s) { const o = boxSpots(x, y, w, h, s), k = Math.min(w, h) * 0.3; o.corners[0].x += k; o.corners[1].x -= k; o.corners[2].x -= k; o.corners[3].x += k; o.mids[1].x -= k * 0.5; o.mids[3].x += k * 0.5; return o; },
      path(ctx, x, y, w, h, r, o) { rounded(ctx, x, y, w, h, Math.min(w, h) / 2, flatOf(o)); } },
    { key: "cut", label: "Cut corners", about: "Cut corners are clipped at an angle.",
      path(ctx, x, y, w, h, r) {
          let c = Math.max(4, Math.min(w, h) * 0.16, r);
          c = Math.min(c, w / 3, h / 3);
          ctx.beginPath();
          ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c);
          ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h);
          ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c);
          ctx.closePath();
      } },
    { key: "ticket", label: "Ticket", about: "Ticket has its corners bitten out.",
      spots(x, y, w, h, s) { const o = boxSpots(x, y, w, h, s), c = Math.min(Math.max(6, Math.min(w, h) * 0.14), w / 3, h / 3); for (let i = 0; i < 4; i++) { o.corners[i].x += o.corners[i].dx * c * 0.6; o.corners[i].y += o.corners[i].dy * c * 0.6; } return o; },
      path(ctx, x, y, w, h, r) {
          const c = Math.min(Math.max(6, Math.min(w, h) * 0.14, r), w / 3, h / 3);
          ctx.beginPath();
          ctx.moveTo(x + c, y);
          ctx.lineTo(x + w - c, y);
          ctx.arc(x + w, y, c, Math.PI, Math.PI / 2, true);
          ctx.lineTo(x + w, y + h - c);
          ctx.arc(x + w, y + h, c, -Math.PI / 2, -Math.PI, true);
          ctx.lineTo(x + c, y + h);
          ctx.arc(x, y + h, c, 0, -Math.PI / 2, true);
          ctx.lineTo(x, y + c);
          ctx.arc(x, y, c, Math.PI / 2, 0, true);
          ctx.closePath();
      } },
    { key: "stamp", label: "Stamp", about: "Stamp has a perforated edge, like a postage stamp.",
      spots(x, y, w, h, s) { return boxSpots(x + s * 0.5, y + s * 0.5, w - s, h - s, s); },
      path(ctx, x, y, w, h, r) {
          const s = Math.max(5, Math.min(w, h) / 12);
          ctx.beginPath();
          ctx.moveTo(x, y);
          bumps(ctx, x, y, x + w, y, s, -1);
          bumps(ctx, x + w, y, x + w, y + h, s, -1);
          bumps(ctx, x + w, y + h, x, y + h, s, -1);
          bumps(ctx, x, y + h, x, y, s, -1);
          ctx.closePath();
      } },
    { key: "cloud", label: "Scalloped", about: "Scalloped has a beaded edge all the way round.",
      inner: { l: 0.03, r: 0.03, t: 0.03, b: 0.03 },
      spots(x, y, w, h, s) { return boxSpots(x + s * 0.8, y + s * 0.8, w - s * 1.6, h - s * 1.6, s); },
      path(ctx, x, y, w, h, r) {
          const s = Math.max(6, Math.min(w, h) / 7), m = s * 0.35;
          ctx.beginPath();
          ctx.moveTo(x + m, y + m);
          bumps(ctx, x + m, y + m, x + w - m, y + m, s, 1);
          bumps(ctx, x + w - m, y + m, x + w - m, y + h - m, s, 1);
          bumps(ctx, x + w - m, y + h - m, x + m, y + h - m, s, 1);
          bumps(ctx, x + m, y + h - m, x + m, y + m, s, 1);
          ctx.closePath();
      } },
    { key: "arch", label: "Arch", about: "Arch rounds the top, like a window or a mirror.",
      inner: { l: 0, r: 0, t: 0.16, b: 0 },
      spots(x, y, w, h, s) { const o = boxSpots(x, y, w, h, s), a = Math.min(w / 2, h * 0.6), k = Math.SQRT1_2; o.corners[0].x = x + w / 2 - (w / 2 - s * 1.6) * k; o.corners[0].y = y + a - (a - s * 1.6) * k; o.corners[1].x = x + w / 2 + (w / 2 - s * 1.6) * k; o.corners[1].y = o.corners[0].y; return o; },
      path(ctx, x, y, w, h, r) {
          // an elliptical arch, as high as half the width but never more than 60% of the card
          const a = Math.min(w / 2, h * 0.6), rb = Math.max(0, Math.min(r, w / 4, h / 4)), k = 0.5523;
          ctx.beginPath();
          ctx.moveTo(x, y + h - rb);
          ctx.lineTo(x, y + a);
          ctx.bezierCurveTo(x, y + a - a * k, x + w / 2 - w / 2 * k, y, x + w / 2, y);
          ctx.bezierCurveTo(x + w / 2 + w / 2 * k, y, x + w, y + a - a * k, x + w, y + a);
          ctx.lineTo(x + w, y + h - rb);
          if (rb > 0) ctx.arcTo(x + w, y + h, x + w - rb, y + h, rb);
          ctx.lineTo(x + rb, y + h);
          if (rb > 0) ctx.arcTo(x, y + h, x, y + h - rb, rb);
          ctx.closePath();
      } },
    { key: "ogee", label: "Ogee", about: "Ogee rises to an onion point, like a palace window.",
      inner: { l: 0, r: 0, t: 0.22, b: 0 },
      spots(x, y, w, h, s) { const o = boxSpots(x, y, w, h, s), top = Math.min(h * 0.42, w * 0.7); o.corners[0].y = y + top + s; o.corners[1].y = y + top + s; o.mids[0].y = y + top * 0.55 + s; return o; },
      path(ctx, x, y, w, h, r) {
          const top = Math.min(h * 0.42, w * 0.7), cx = x + w / 2;
          ctx.beginPath();
          ctx.moveTo(x, y + h);
          ctx.lineTo(x, y + top);
          ctx.bezierCurveTo(x, y + top * 0.35, cx - w * 0.06, y + top * 0.55, cx, y);
          ctx.bezierCurveTo(cx + w * 0.06, y + top * 0.55, x + w, y + top * 0.35, x + w, y + top);
          ctx.lineTo(x + w, y + h);
          ctx.closePath();
      } },
    { key: "cartouche", label: "Cartouche", about: "Cartouche curls in at the corners and swells at the sides, the old framed label.",
      inner: { l: 0.06, r: 0.06, t: 0.06, b: 0.06 },
      spots(x, y, w, h, s) { const o = boxSpots(x, y, w, h, s), c = Math.min(w, h) * 0.16; for (let i = 0; i < 4; i++) { o.corners[i].x += o.corners[i].dx * c * 0.75; o.corners[i].y += o.corners[i].dy * c * 0.75; } return o; },
      path(ctx, x, y, w, h, r) {
          const c = Math.min(w, h) * 0.16, s = Math.min(w, h) * 0.07;
          const x1 = x + w, y1 = y + h, cx = x + w / 2, cy = y + h / 2;
          ctx.beginPath();
          ctx.moveTo(x + c, y);
          ctx.quadraticCurveTo(cx, y - s, x1 - c, y);
          ctx.quadraticCurveTo(x1 - c, y + c, x1, y + c);
          ctx.quadraticCurveTo(x1 + s, cy, x1, y1 - c);
          ctx.quadraticCurveTo(x1 - c, y1 - c, x1 - c, y1);
          ctx.quadraticCurveTo(cx, y1 + s, x + c, y1);
          ctx.quadraticCurveTo(x + c, y1 - c, x, y1 - c);
          ctx.quadraticCurveTo(x - s, cy, x, y + c);
          ctx.quadraticCurveTo(x + c, y + c, x + c, y);
          ctx.closePath();
      } },
    { key: "plaque", label: "Plaque", about: "Plaque steps in at the corners, like an engraved brass plate.",
      path(ctx, x, y, w, h, r) {
          const c = Math.min(Math.max(5, Math.min(w, h) * 0.1), w / 4, h / 4), d = c / 2;
          ctx.beginPath();
          ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y);
          ctx.lineTo(x + w - c, y + d); ctx.lineTo(x + w - d, y + d); ctx.lineTo(x + w - d, y + c); ctx.lineTo(x + w, y + c);
          ctx.lineTo(x + w, y + h - c);
          ctx.lineTo(x + w - d, y + h - c); ctx.lineTo(x + w - d, y + h - d); ctx.lineTo(x + w - c, y + h - d); ctx.lineTo(x + w - c, y + h);
          ctx.lineTo(x + c, y + h);
          ctx.lineTo(x + c, y + h - d); ctx.lineTo(x + d, y + h - d); ctx.lineTo(x + d, y + h - c); ctx.lineTo(x, y + h - c);
          ctx.lineTo(x, y + c);
          ctx.lineTo(x + d, y + c); ctx.lineTo(x + d, y + d); ctx.lineTo(x + c, y + d);
          ctx.closePath();
      } },
    { key: "crest", label: "Crest", about: "Crest ends in a point at the bottom, like a shield.",
      inner: { l: 0.04, r: 0.04, t: 0, b: 0.2 },
      spots(x, y, w, h, s) { const o = boxSpots(x, y, w, h, s), bottom = Math.min(h * 0.35, w * 0.6); o.corners[2].y = y + h - bottom; o.corners[3].y = y + h - bottom; o.mids[2].y = y + h - s * 3.2; return o; },
      path(ctx, x, y, w, h, r) {
          const rt = Math.max(0, Math.min(r, w / 4, h / 4)), bottom = Math.min(h * 0.35, w * 0.6);
          ctx.beginPath();
          ctx.moveTo(x + rt, y);
          ctx.lineTo(x + w - rt, y);
          if (rt > 0) ctx.arcTo(x + w, y, x + w, y + rt, rt);
          ctx.lineTo(x + w, y + h - bottom);
          ctx.quadraticCurveTo(x + w, y + h - bottom * 0.25, x + w / 2, y + h);
          ctx.quadraticCurveTo(x, y + h - bottom * 0.25, x, y + h - bottom);
          ctx.lineTo(x, y + rt);
          if (rt > 0) ctx.arcTo(x, y, x + rt, y, rt);
          ctx.closePath();
      } },
    { key: "hexagon", label: "Hexagon", about: "Hexagon comes to a point on the left and the right.",
      inner: { l: 0.1, r: 0.1, t: 0, b: 0 },
      spots(x, y, w, h, s) { const o = boxSpots(x, y, w, h, s), c = Math.min(h * 0.45, w / 4); o.corners[0].x += c * 0.6; o.corners[1].x -= c * 0.6; o.corners[2].x -= c * 0.6; o.corners[3].x += c * 0.6; o.mids[1].x -= c * 0.3; o.mids[3].x += c * 0.3; return o; },
      path(ctx, x, y, w, h, r) {
          const c = Math.min(h * 0.45, w / 4);
          ctx.beginPath();
          ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + h / 2);
          ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h / 2);
          ctx.closePath();
      } },
    { key: "tab", label: "Folder", about: "Folder has a tab on its top edge.",
      inner: { l: 0, r: 0, t: 0.12, b: 0 },
      spots(x, y, w, h, s) { const t = Math.min(h * 0.14, 22), o = boxSpots(x, y + t, w, h - t, s); return o; },
      path(ctx, x, y, w, h, r) {
          const t = Math.min(h * 0.14, 22), tw = Math.min(w * 0.42, Math.max(40, w * 0.3)), rr = Math.max(0, Math.min(r, t, w / 4));
          ctx.beginPath();
          ctx.moveTo(x, y + h - rr);
          ctx.lineTo(x, y + rr);
          if (rr > 0) ctx.arcTo(x, y, x + rr, y, rr);
          ctx.lineTo(x + tw - t, y);
          ctx.quadraticCurveTo(x + tw - t * 0.3, y, x + tw, y + t);
          ctx.lineTo(x + w - rr, y + t);
          if (rr > 0) ctx.arcTo(x + w, y + t, x + w, y + t + rr, rr);
          ctx.lineTo(x + w, y + h - rr);
          if (rr > 0) ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
          ctx.lineTo(x + rr, y + h);
          if (rr > 0) ctx.arcTo(x, y + h, x, y + h - rr, rr);
          ctx.closePath();
      } },
    { key: "polaroid", label: "Instant photo", about: "Instant photo leaves a wide border at the bottom.",
      inner: { l: 0, r: 0, t: 0, b: 0.16 },
      path(ctx, x, y, w, h, r) { rounded(ctx, x, y, w, h, Math.min(r, 3)); } },
    { key: "oval", label: "Oval", inner: { l: 0.13, r: 0.13, t: 0.12, b: 0.12 },
      spots: ellipseSpots,
      path(ctx, x, y, w, h, r) {
          const k = 0.5523, rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
          ctx.beginPath();
          ctx.moveTo(cx + rx, cy);
          ctx.bezierCurveTo(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry);
          ctx.bezierCurveTo(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy);
          ctx.bezierCurveTo(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry);
          ctx.bezierCurveTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy);
          ctx.closePath();
      } },
    { key: "circle", label: "Circle", about: "Circle keeps the widget square, so it suits round clocks.", round: true,
      inner: { l: 0.12, r: 0.12, t: 0.12, b: 0.12 },
      spots(x, y, w, h, s) { const d = Math.min(w, h); return ellipseSpots(x + (w - d) / 2, y + (h - d) / 2, d, d, s); },
      path(ctx, x, y, w, h, r) {
          const d = Math.min(w, h);
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, d / 2, 0, Math.PI * 2, false);
          ctx.closePath();
      } }
];

// ---- ends: shapes made from a kind of end on the left and the right ---------------------
//
// An end is a list of points written for the LEFT side of the card, measured inward
// from it: u = how far in, v = 0 at the top and h at the bottom, walked from the
// bottom up. The right side uses the same kind of list, mirrored. Between two points
// the link is a straight line (null), a round corner at a point ({ arc: [u, v], r })
// or a curve pulled toward a point ({ q: [u, v] }).

// how deep an end may come in on a card h tall: a share of its height, never huge
function endDepth(h) { return Math.min(h * 0.42, 64); }

// a form leaning one way: "Top" or "Bottom" is the side of the end that is pulled in
function leaning(base, side, dir) {
    const left = side === "L";
    if (dir === "both") return base + "Bottom";
    if (dir === "left") return base + (left ? "Bottom" : "Top");
    return base + (left ? "Top" : "Bottom");
}
// one form at the end it points to, another at the other end
function pointed(front, back, side, dir) {
    if (dir === "both") return front;
    if (dir === "left") return side === "L" ? front : back;
    return side === "L" ? back : front;
}
function sizes(T, L) {
    return { s: Math.min(T * 0.5, L / 3), c: Math.min(T / 3, L / 4), big: Math.min(T / 2, L / 2), m: T / 2 };
}

var forms = {
    round(T, L, rt, rb) {
        const pts = [], links = [];
        if (rb > 0) { pts.push([rb, T]); pts.push([0, T - rb]); links.push({ arc: [0, T], r: rb }); }
        else pts.push([0, T]);
        if (rt > 0) { links.push(null); pts.push([0, rt]); pts.push([rt, 0]); links.push({ arc: [0, 0], r: rt }); }
        else { links.push(null); pts.push([0, 0]); }
        return { pts, links };
    },
    roundBoth(T, L) { const k = sizes(T, L); return forms.round(T, L, k.big, k.big); },
    square(T) { return { pts: [[0, T], [0, 0]], links: [null] }; },
    insetTop(T, L) { const k = sizes(T, L); return { pts: [[0, T], [k.s, 0]], links: [null] }; },
    insetBottom(T, L) { const k = sizes(T, L); return { pts: [[k.s, T], [0, 0]], links: [null] }; },
    point(T, L) { const k = sizes(T, L); return { pts: [[k.s, T], [0, k.m], [k.s, 0]], links: [null, null] }; },
    notch(T, L) { const k = sizes(T, L); return { pts: [[0, T], [k.s, k.m], [0, 0]], links: [null, null] }; },
    bite(T) { return { pts: [[0, T], [0, 0]], links: [{ q: [T * 0.45, T / 2] }] }; },
    stepTop(T, L) {
        const k = sizes(T, L);
        return { pts: [[0, T], [0, k.m], [k.s * 0.6, k.m], [k.s * 0.6, 0]], links: [null, null, null] };
    },
    stepBottom(T, L) {
        const k = sizes(T, L);
        return { pts: [[k.s * 0.6, T], [k.s * 0.6, k.m], [0, k.m], [0, 0]], links: [null, null, null] };
    },
    roundTop(T, L) {
        const big = sizes(T, L).big;
        return { pts: [[0, T], [0, big], [big, 0]], links: [null, { arc: [0, 0], r: big }] };
    },
    roundBottom(T, L) {
        const big = sizes(T, L).big;
        return { pts: [[big, T], [0, T - big], [0, 0]], links: [{ arc: [0, T], r: big }, null] };
    },
    zigzag(T, L) {
        const z = Math.min(T * 0.3, L / 6), m = T / 2;
        return { pts: [[0, T], [z, T * 0.75], [0, m], [z, T * 0.25], [0, 0]], links: [null, null, null, null] };
    },
    scallop(T, L) {
        const w = Math.min(T * 0.35, L / 6);
        return { pts: [[0, T], [0, T / 2], [0, 0]], links: [{ q: [w, T * 0.75] }, { q: [w, T * 0.25] }] };
    },
    bulge(T, L) {
        const bl = Math.min(T * 0.3, L / 6);
        return { pts: [[bl, T], [bl, 0]], links: [{ q: [-bl, T / 2] }] };
    },
    puzzle(T, L) {
        const n = Math.min(T * 0.2, L / 8), kb = n * 1.7, m = T / 2;
        return { pts: [[kb, T], [kb, m + n * 0.55], [0, m], [kb, m - n * 0.55], [kb, 0]],
                 links: [null, { q: [kb * 0.05, m + n * 1.9] }, { q: [kb * 0.05, m - n * 1.9] }, null] };
    },
    brace(T, L) {
        const bb = Math.min(T * 0.42, L / 5), m = T / 2;
        return { pts: [[bb, T], [bb * 0.4, m + bb * 0.55], [0, m], [bb * 0.4, m - bb * 0.55], [bb, 0]],
                 links: [{ q: [bb * 0.4, T] }, null, null, { q: [bb * 0.4, 0] }] };
    },
    wave(T, L) {
        const wv = Math.min(T * 0.7, L / 4), m = T / 2;
        return { pts: [[0, T], [wv / 2, m], [wv, 0]], links: [{ q: [0, m] }, { q: [wv, m] }] };
    },
    castle(T, L) {
        const cn = Math.min(T * 0.28, L / 6), ch = T * 0.2, m = T / 2;
        return { pts: [[0, T], [0, m + ch], [cn, m + ch], [cn, m - ch], [0, m - ch], [0, 0]],
                 links: [null, null, null, null, null] };
    },
    dome(T, L) {
        const od = Math.min(T * 0.85, L / 4), m = T / 2;
        return { pts: [[od, T], [od * 0.18, T * 0.64], [0, m], [od * 0.18, T * 0.36], [od, 0]],
                 links: [{ q: [-od * 0.3, T * 0.96] }, { q: [od * 0.32, T * 0.56] }, { q: [od * 0.32, T * 0.44] }, { q: [-od * 0.3, T * 0.04] }] };
    },
    corbelTop(T, L) {
        const cbt = Math.min(T * 0.7, L / 4);
        return { pts: [[0, T], [0, T * 0.58], [cbt * 0.45, T * 0.3], [cbt, 0]],
                 links: [null, { q: [0, T * 0.3] }, { q: [cbt * 0.45, 0] }] };
    },
    corbelBottom(T, L) {
        const cbb = Math.min(T * 0.7, L / 4);
        return { pts: [[cbb, T], [cbb * 0.45, T * 0.7], [0, T * 0.42], [0, 0]],
                 links: [{ q: [cbb * 0.45, T] }, { q: [0, T * 0.7] }, null] };
    },
    carved(T, L) {
        const ck = Math.min(T * 0.32, L / 5);
        return { pts: [[ck, T], [0, T - ck], [0, ck], [ck, 0]], links: [{ q: [ck, T - ck] }, null, { q: [ck, ck] }] };
    },
    fleur(T, L) {
        const fb = Math.min(T * 0.55, L / 5), m = T / 2;
        return { pts: [[fb, T], [fb, T * 0.68], [0, m], [fb, T * 0.32], [fb, 0]],
                 links: [{ q: [fb * 0.35, T * 0.98] }, { q: [fb * 0.2, T * 0.72] }, { q: [fb * 0.2, T * 0.28] }, { q: [fb * 0.35, T * 0.02] }] };
    },
    needle(T, L) {
        const nd = Math.min(T * 0.6, L / 5), nw = Math.max(1, T * 0.06), m = T / 2;
        return { pts: [[nd, T], [nd, m + nw * 2], [0, m], [nd, m - nw * 2], [nd, 0]], links: [null, null, null, null] };
    },
    puff(T, L) {
        const cb = Math.min(T * 0.3, L / 8), m = T / 2;
        return { pts: [[cb, T], [cb, T * 0.66], [cb, T * 0.34], [cb, 0]],
                 links: [{ q: [-cb * 0.9, T * 0.83] }, { q: [-cb * 1.3, m] }, { q: [-cb * 0.9, T * 0.17] }] };
    },
    ogive(T, L) {
        const og = Math.min(T * 0.9, L / 4), m = T / 2;
        return { pts: [[og, T], [0, m], [og, 0]], links: [{ q: [og * 0.45, T] }, { q: [og * 0.45, 0] }] };
    },
    foldTop(T, L) {
        const ft = Math.min(T * 0.45, L / 4);
        return { pts: [[0, T], [0, ft], [ft, 0]], links: [null, null] };
    },
    foldBottom(T, L) {
        const fb = Math.min(T * 0.45, L / 4);
        return { pts: [[fb, T], [0, T - fb], [0, 0]], links: [null, null] };
    },
    teeth(T, L) {
        const td = Math.min(T * 0.22, L / 8), tq = T / 5;
        return { pts: [[0, T], [0, T - tq], [td, T - tq], [td, T - 2 * tq], [0, T - 2 * tq], [0, 2 * tq],
                       [td, 2 * tq], [td, tq], [0, tq], [0, 0]],
                 links: [null, null, null, null, null, null, null, null, null] };
    },
    swoopTop(T, L) {
        const sw = Math.min(T * 1.1, L / 3);
        return { pts: [[0, T], [sw, 0]], links: [{ q: [0, 0] }] };
    },
    swoopBottom(T, L) {
        const sb = Math.min(T * 1.1, L / 3);
        return { pts: [[sb, T], [0, 0]], links: [{ q: [0, T] }] };
    }
};

// the deepest any point of an end comes in
function deepest(f) {
    let d = 0;
    for (let i = 0; i < f.pts.length; i++) d = Math.max(d, f.pts[i][0]);
    for (let j = 0; j < f.links.length; j++) if (f.links[j] && f.links[j].q) d = Math.max(d, f.links[j].q[0]);
    return d;
}
// both ends of a card of kind `e`, already shrunk so they never come in deeper than
// endDepth(h): { a, b, k } with k the shrink to apply across
function endsOf(e, w, h, r, o) {
    const dir = o && (o.dir === "left" || o.dir === "both") ? o.dir : "right";
    const flat = flatOf(o);
    const rr = Math.max(0, Math.min(r, h / 2, w / 2));
    const rt = flat === "top" ? 0 : rr, rb = flat === "bottom" ? 0 : rr;
    const a = (forms[e.form("L", dir)] || forms.square)(h, w, rt, rb);
    const b = (forms[e.form("R", dir)] || forms.square)(h, w, rt, rb);
    const deep = Math.max(deepest(a), deepest(b));
    const k = deep > 0 && e.keepSize !== true ? Math.min(1, endDepth(h) / deep) : 1;
    return { a, b, k };
}
function endLink(ctx, how, mapX, y0, k, p) {
    const x = mapX(p[0]), y = y0 + p[1];
    if (how && how.arc) ctx.arcTo(mapX(how.arc[0]), y0 + how.arc[1], x, y, how.r * k);
    else if (how && how.q) ctx.quadraticCurveTo(mapX(how.q[0]), y0 + how.q[1], x, y);
    else ctx.lineTo(x, y);
}
function endPath(e) {
    return (ctx, x, y, w, h, r, o) => {
        const E = endsOf(e, w, h, r, o), a = E.a, b = E.b, k = E.k, x1 = x + w;
        function px(u) { return x + u * k; }
        function qx(u) { return x1 - u * k; }
        ctx.beginPath();
        ctx.moveTo(px(a.pts[0][0]), y + a.pts[0][1]);
        for (let i = 1; i < a.pts.length; i++) endLink(ctx, a.links[i - 1], px, y, k, a.pts[i]);
        const n = b.pts.length;
        ctx.lineTo(qx(b.pts[n - 1][0]), y + b.pts[n - 1][1]);
        for (let j = n - 2; j >= 0; j--) endLink(ctx, b.links[j], qx, y, k, b.pts[j]);
        ctx.closePath();
    };
}
// how far in an end is at height v (straight lines between its points, curves left out)
function uAt(f, v) {
    let best = 0, found = false;
    for (let i = 0; i < f.pts.length - 1; i++) {
        const p = f.pts[i], q = f.pts[i + 1];
        const lo = Math.min(p[1], q[1]), hi = Math.max(p[1], q[1]);
        if (v < lo || v > hi) continue;
        const t = hi > lo ? (v - p[1]) / (q[1] - p[1]) : 0;
        const u = p[0] + (q[0] - p[0]) * t;
        best = found ? Math.max(best, u) : u;
        found = true;
    }
    return Math.max(0, best);
}
// ornaments move in past the ends
function endSpots(e) {
    return (x, y, w, h, s, o) => {
        const E = endsOf(e, w, h, 0, o), i = s * 1.6;
        const lt = uAt(E.a, i) * E.k, lb = uAt(E.a, h - i) * E.k, lm = uAt(E.a, h / 2) * E.k;
        const rt = uAt(E.b, i) * E.k, rb = uAt(E.b, h - i) * E.k, rm = uAt(E.b, h / 2) * E.k;
        const o2 = boxSpots(x, y, w, h, s);
        o2.corners[0].x += lt; o2.corners[1].x -= rt; o2.corners[2].x -= rb; o2.corners[3].x += lb;
        o2.mids[1].x -= rm; o2.mids[3].x += lm;
        return o2;
    };
}

// the folded-over corners of Folded corner: a darker triangle with a light crease
function flaps(g) {
    const ctx = g.ctx, p = g.p, x0 = g.x0, y0 = g.y0, L = g.L, T = g.T;
    const e = byKey.folded, E = endsOf(e, L, T, 0, { dir: g.dir });
    const dark = p.dark || "rgba(0,0,0,0.3)", light = p.light || "rgba(255,255,255,0.2)";
    const f = Math.min(T * 0.45, L / 4) * E.k;
    const x1 = x0 + L, y1 = y0 + T;
    const names = [e.form("L", g.dir), e.form("R", g.dir)];
    for (let i = 0; i < 2; i++) {
        if (names[i] !== "foldTop" && names[i] !== "foldBottom") continue;
        const left = i === 0, cx = left ? x0 : x1, sx = left ? 1 : -1;
        const top = names[i] === "foldTop", cy = top ? y0 : y1, sy = top ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(cx, cy + sy * f); ctx.lineTo(cx + sx * f, cy); ctx.lineTo(cx + sx * f, cy + sy * f);
        ctx.closePath();
        ctx.fillStyle = dark; ctx.fill();
        ctx.strokeStyle = light; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy + sy * f); ctx.lineTo(cx + sx * f, cy); ctx.stroke();
    }
}
// a curl inside each end, like the scroll at the top of an old column
function curls(g) {
    const p = g.p, T = g.T, d = endDepth(T);
    const color = p.frameColors && p.frameColors.length === 4 && g.lines === "gilded" ? p.frameColors[1] : (p.mark || "");
    if (!color || g.L <= d * 2) return;
    g.volute(g.x0 + d * 0.5, g.y0 + T / 2, d * 0.34, 1, color);
    g.volute(g.x1 - d * 0.5, g.y0 + T / 2, d * 0.34, -1, color);
}

function fixed(name) { return () => name; }

// room inside each side for the widget: how far in the outline is, at worst, across
// the rows the widget covers. Measured on the outline itself, so a knob, a notch or a
// step is always cleared, and remembered for each size
var roomCache = {};
var roomCount = 0;
function measured(e) {
    return (w, h, o) => {
        const dir = o && o.dir ? o.dir : "right", flat = flatOf(o);
        const key = e.key + "|" + Math.round(w) + "|" + Math.round(h) + "|" + dir + "|" + flat;
        if (roomCache[key] !== undefined) return roomCache[key];
        const tr = Trace.trace(c => { e.path(c, 0, 0, w, h, 0, { dir, flat }); });
        const pts = tr.pts;
        let worst = 0;
        for (let r = 0; r <= 16; r++) {
            const v = h * (0.1 + 0.8 * r / 16);
            let left = 0;
            let right = 0;
            const ins = [];
            for (let j = 0; j < pts.length; j++) {
                const a2 = pts[j], b2 = pts[(j + 1) % pts.length];
                if ((a2[1] <= v && b2[1] > v) || (b2[1] <= v && a2[1] > v)) ins.push(a2[0] + (b2[0] - a2[0]) * (v - a2[1]) / (b2[1] - a2[1]));
            }
            ins.sort((m, n) => m - n);
            if (ins.length >= 2) {
                // the widget sits in the span that holds the middle
                for (let k = 0; k + 1 < ins.length; k += 2) {
                    if (ins[k] <= w / 2 && ins[k + 1] >= w / 2) { left = ins[k]; right = w - ins[k + 1]; }
                }
            }
            worst = Math.max(worst, left, right);
        }
        const out = Math.max(worst > 0 ? worst + 2 : 0, e.minRoom ? endDepth(h) * e.minRoom : 0);
        if (++roomCount > 400) { roomCache = {}; roomCount = 0; }
        roomCache[key] = out;
        return out;
    };
}
var ended = [
    { key: "slant", label: "Slanted", about: "Slanted leans its sides, like a parallelogram.", pointing: true,
      form(side, dir) { return leaning("inset", side, dir); } },
    { key: "arrow", label: "Arrows", about: "Arrows points one way, or both.", pointing: true,
      form(side, dir) { return pointed("point", "notch", side, dir); } },
    { key: "ribbon", label: "Ribbon", about: "Ribbon has a notch cut into each end.", form: fixed("notch") },
    { key: "bite", label: "Scooped", about: "Scooped hollows out each end.", form: fixed("bite") },
    { key: "leaf", label: "Leaf", about: "Leaf rounds two opposite corners and keeps the others sharp.", pointing: true,
      form(side, dir) {
          if (dir === "both") return "roundBoth";
          if (dir === "left") return side === "L" ? "roundBottom" : "roundTop";
          return side === "L" ? "roundTop" : "roundBottom";
      } },
    { key: "stepped", label: "Stepped", about: "Stepped steps in halfway down.", pointing: true,
      form(side, dir) { return leaning("step", side, dir); } },
    { key: "tabbed", label: "Tab", about: "Tab rounds the end it points to and keeps the other square.", pointing: true,
      form(side, dir) { return pointed("roundBoth", "square", side, dir); } },
    { key: "drop", label: "Drop", about: "Drop points one way and is round at the back.", pointing: true,
      form(side, dir) { return pointed("point", "roundBoth", side, dir); } },
    { key: "swoop", label: "Sail", about: "Sail sweeps one corner across the whole height.", pointing: true,
      form(side, dir) { return leaning("swoop", side, dir); } },
    { key: "bullet", label: "Bullet", about: "Bullet has a curved point in front and a round back.", pointing: true,
      form(side, dir) { return pointed("ogive", "roundBoth", side, dir); } },
    { key: "folded", label: "Folded corner", about: "Folded corner turns a corner over, like a page.", pointing: true,
      form(side, dir) { return dir === "both" ? "foldTop" : pointed("foldTop", "square", side, dir); },
      afterFill: flaps },
    { key: "zigzag", label: "Zigzag", about: "Zigzag cuts each end in a zigzag.", form: fixed("zigzag") },
    { key: "scallop", label: "Scalloped ends", about: "Scalloped ends have two round bites on each side.", form: fixed("scallop") },
    { key: "bulge", label: "Bulging", about: "Bulging swells out at each end.", form: fixed("bulge") },
    { key: "wave", label: "Wave", about: "Wave runs a soft S down each end.", form: fixed("wave") },
    { key: "brace", label: "Braces", about: "Braces puts the card between curly brackets.", form: fixed("brace") },
    { key: "castle", label: "Battlement", about: "Battlement cuts a square notch in each end.", form: fixed("castle") },
    { key: "teeth", label: "Teeth", about: "Teeth gives each end three square teeth.", form: fixed("teeth") },
    { key: "puzzle", label: "Puzzle", about: "Puzzle has a knob on each end, like a puzzle piece.", form: fixed("puzzle") },
    { key: "needle", label: "Needle", about: "Needle shoots a thin spike out of each end.", form: fixed("needle") },
    { key: "puff", label: "Cloud", about: "Cloud puffs out three soft bumps at each end.", form: fixed("puff") },
    { key: "carved", label: "Carved corners", about: "Carved corners scoop the corners in, like an old picture frame.", form: fixed("carved") },
    { key: "fleur", label: "Fleur", about: "Fleur ends in a lily: a pointed petal between two round ones.", form: fixed("fleur") },
    { key: "scroll", label: "Scroll", about: "Scroll curls a volute inside each round end.", form: fixed("roundBoth"), onTop: curls, minRoom: 1.0 },
    { key: "dome", label: "Onion dome", about: "Onion dome swells into a bulb with a sharp tip, on its side.", form: fixed("dome") },
    { key: "corbel", label: "Corbel", about: "Corbel steps two rounds in toward one side, like a carved molding.", pointing: true,
      form(side, dir) { return leaning("corbel", side, dir); } }
];
for (let ei = 0; ei < ended.length; ei++) {
    const en = ended[ei];
    en.path = endPath(en);
    en.spots = endSpots(en);
    en.sides = measured(en);
    list.push(en);
}

var byKey = {};
for (let i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
