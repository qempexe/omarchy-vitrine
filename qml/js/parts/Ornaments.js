.pragma library

// Decoration on top of a card. One entry per tile in Ornaments, in the order the
// tiles show. To add one, see CONTRIBUTING.md.
//
// Ornaments sit on the card's spots, which follow its shape (a circle's corners are
// on the circle): g.spots.corners is [top left, top right, bottom right, bottom
// left] and g.spots.mids is [top, right, bottom, left], each { x, y, dx, dy } with
// dx, dy the way inward (-1, 0 or 1). g.s is a good size for one ornament, grown
// with the card but never huge.
//
// entry fields:
//   key, label      the saved value and the name on the tile
//   about           one sentence for the settings hint
//   draw(g)         draws it, in g.markStyle (the accent) unless it says otherwise

function each(list, fn) { for (var i = 0; i < list.length; i++) fn(list[i], i); }

function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2, false); ctx.fill(); }

// a small flower: n round petals around a center
function rosette(ctx, x, y, r, n, color, center) {
    ctx.fillStyle = color;
    for (var i = 0; i < n; i++) {
        var a = i * Math.PI * 2 / n;
        dot(ctx, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42);
    }
    ctx.fillStyle = center;
    dot(ctx, x, y, r * 0.3);
}

// a lily-like fleuron pointing the way (ux, uy)
function fleuron(ctx, x, y, s, ux, uy, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(uy, ux) - Math.PI / 2);
    ctx.fillStyle = color;
    ctx.beginPath();                 // the middle petal
    ctx.moveTo(0, -s * 1.2);
    ctx.quadraticCurveTo(s * 0.45, -s * 0.3, 0, s * 0.35);
    ctx.quadraticCurveTo(-s * 0.45, -s * 0.3, 0, -s * 1.2);
    ctx.fill();
    for (var side = -1; side <= 1; side += 2) {      // the two that curl out
        ctx.beginPath();
        ctx.moveTo(0, s * 0.2);
        ctx.quadraticCurveTo(side * s * 1.2, -s * 0.1, side * s * 0.95, -s * 0.8);
        ctx.quadraticCurveTo(side * s * 0.75, -s * 0.15, 0, s * 0.45);
        ctx.fill();
    }
    ctx.fillRect(-s * 0.5, s * 0.45, s, s * 0.18);   // the band
    ctx.restore();
}

var list = [
    { key: "none", label: "None" },
    { key: "studs", label: "Studs", about: "Studs sit in the corners.",
      draw: function (g) {
          var ctx = g.ctx;
          ctx.fillStyle = g.markStyle || g.tone;
          each(g.spots.corners, function (c) { dot(ctx, c.x, c.y, Math.max(1.6, g.s * 0.32)); });
      } },
    { key: "rivets", label: "Rivets", about: "Rivets run all the way round, a little inside.",
      draw: function (g) {
          var ctx = g.ctx, r = Math.max(1.2, g.s * 0.2);
          ctx.save();
          ctx.strokeStyle = g.markStyle || g.tone;
          ctx.lineWidth = r * 2;
          ctx.lineCap = "round";
          ctx.setLineDash([0.01, Math.max(7, g.s * 1.5)]);
          g.edge(g.s * 0.9);
          ctx.stroke();
          ctx.setLineDash([]);       // Qt's canvas keeps the dash through restore()
          ctx.restore();
      } },
    { key: "pearls", label: "Pearls", about: "Pearls string all the way round the edge, each with a shine.",
      draw: function (g) {
          var ctx = g.ctx, r = Math.max(1.6, g.s * 0.3);
          var color = g.markStyle || g.tone;
          g.along(r + 1.5, r * 2.6, function (x, y) {
              ctx.fillStyle = color;
              dot(ctx, x, y, r);
              ctx.fillStyle = "rgba(255,255,255,0.55)";
              dot(ctx, x - r * 0.35, y - r * 0.35, r * 0.32);
          });
      } },
    { key: "crosses", label: "Crosses", about: "Crosses sit in the corners.",
      draw: function (g) {
          var ctx = g.ctx, k = Math.max(2.5, g.s * 0.55), w = Math.max(1, g.s * 0.16);
          ctx.fillStyle = g.markStyle || g.tone;
          each(g.spots.corners, function (c) { ctx.fillRect(c.x - k, c.y - w / 2, k * 2, w); ctx.fillRect(c.x - w / 2, c.y - k, w, k * 2); });
      } },
    { key: "stars", label: "Stars", about: "Stars sparkle in the corners.",
      draw: function (g) {
          var ctx = g.ctx, k = Math.max(3, g.s * 0.7);
          ctx.fillStyle = g.markStyle || g.tone;
          each(g.spots.corners, function (c) {
              ctx.beginPath();
              for (var i = 0; i < 8; i++) {
                  var a = i * Math.PI / 4, rr = i % 2 === 0 ? k : k * 0.28;
                  var px = c.x + Math.cos(a) * rr, py = c.y + Math.sin(a) * rr;
                  if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
          });
      } },
    { key: "brackets", label: "Brackets", about: "Brackets mark the corners.",
      draw: function (g) {
          var ctx = g.ctx, arm = Math.max(6, g.s * 1.8), w = Math.max(1.5, g.mw);
          ctx.fillStyle = g.markStyle || g.tone;
          each(g.spots.corners, function (c) {
              var x = c.x - c.dx * g.s * 0.9, y = c.y - c.dy * g.s * 0.9;
              ctx.fillRect(c.dx > 0 ? x : x - arm, c.dy > 0 ? y : y - w, arm, w);
              ctx.fillRect(c.dx > 0 ? x : x - w, c.dy > 0 ? y : y - arm, w, arm);
          });
      } },
    { key: "rosettes", label: "Rosettes", about: "Rosettes bloom in the corners.",
      draw: function (g) {
          var ctx = g.ctx, center = g.p.fill || "rgba(0,0,0,0.5)";
          each(g.spots.corners, function (c) { rosette(ctx, c.x, c.y, Math.max(3, g.s * 0.75), 6, g.markStyle || g.tone, center); });
      } },
    { key: "diamonds", label: "Diamonds", about: "Diamonds sit in the corners and the middles of the long sides.",
      draw: function (g) {
          var ctx = g.ctx, k = Math.max(2.5, g.s * 0.55);
          ctx.fillStyle = g.markStyle || g.tone;
          function lozenge(c) {
              ctx.beginPath();
              ctx.moveTo(c.x, c.y - k); ctx.lineTo(c.x + k * 0.65, c.y); ctx.lineTo(c.x, c.y + k); ctx.lineTo(c.x - k * 0.65, c.y);
              ctx.closePath(); ctx.fill();
          }
          each(g.spots.corners, lozenge);
          if (g.L >= g.T) { lozenge(g.spots.mids[0]); lozenge(g.spots.mids[2]); }
          else { lozenge(g.spots.mids[1]); lozenge(g.spots.mids[3]); }
      } },
    { key: "fleurons", label: "Fleurons", about: "Fleurons crown the top and the bottom.",
      draw: function (g) {
          var t = g.spots.mids[0], b = g.spots.mids[2], k = Math.max(4, g.s * 1.1);
          fleuron(g.ctx, t.x, t.y + k * 0.3, k, 0, -1, g.markStyle || g.tone);
          fleuron(g.ctx, b.x, b.y - k * 0.3, k, 0, 1, g.markStyle || g.tone);
      } },
    { key: "filigree", label: "Filigree", about: "Filigree curls fine lines out of each corner.",
      draw: function (g) {
          var ctx = g.ctx, k = Math.max(8, g.s * 2.6);
          ctx.save();
          ctx.strokeStyle = g.markStyle || g.tone;
          ctx.lineWidth = Math.max(0.8, g.s * 0.12);
          ctx.lineCap = "round";
          each(g.spots.corners, function (c) {
              var x = c.x - c.dx * g.s * 0.6, y = c.y - c.dy * g.s * 0.6;
              for (var side = 0; side < 2; side++) {
                  var ax = side === 0 ? c.dx : 0, ay = side === 0 ? 0 : c.dy;
                  var bx = side === 0 ? 0 : c.dx, by = side === 0 ? c.dy : 0;
                  ctx.beginPath();
                  ctx.moveTo(x, y);
                  ctx.bezierCurveTo(x + ax * k * 0.6, y + ay * k * 0.6, x + ax * k + bx * k * 0.35, y + ay * k + by * k * 0.35,
                                    x + ax * k * 0.75 + bx * k * 0.3, y + ay * k * 0.75 + by * k * 0.3);
                  ctx.quadraticCurveTo(x + ax * k * 0.6 + bx * k * 0.15, y + ay * k * 0.6 + by * k * 0.15,
                                       x + ax * k * 0.68 + bx * k * 0.06, y + ay * k * 0.68 + by * k * 0.06);
                  ctx.stroke();
              }
              ctx.fillStyle = g.markStyle || g.tone;
              dot(ctx, x + c.dx * k * 0.22, y + c.dy * k * 0.22, Math.max(1, g.s * 0.2));
          });
          ctx.restore();
      } },
    { key: "flourish", label: "Flourish", about: "Flourish sweeps a pen stroke across the top and the bottom.",
      draw: function (g) {
          var ctx = g.ctx;
          ctx.save();
          ctx.strokeStyle = g.markStyle || g.tone;
          ctx.lineWidth = Math.max(0.8, g.s * 0.14);
          ctx.lineCap = "round";
          var half = Math.min(g.L * 0.22, g.s * 5);
          each([g.spots.mids[0], g.spots.mids[2]], function (m, i) {
              var d = i === 0 ? 1 : -1, y = m.y, k = g.s * 0.7;
              for (var side = -1; side <= 1; side += 2) {
                  ctx.beginPath();
                  ctx.moveTo(m.x, y);
                  ctx.bezierCurveTo(m.x + side * half * 0.4, y - d * k, m.x + side * half * 0.7, y + d * k,
                                    m.x + side * half, y);
                  ctx.stroke();
                  g.volute(m.x + side * half, y - d * k * 0.2, Math.max(2.5, k * 0.7), side, g.markStyle || g.tone);
              }
              ctx.fillStyle = g.markStyle || g.tone;
              dot(ctx, m.x, y, Math.max(1.2, g.s * 0.22));
          });
          ctx.restore();
      } },
    { key: "scrolls", label: "Scrolls", about: "Scrolls curl in the corners, like the top of an old column.",
      draw: function (g) {
          each(g.spots.corners, function (c) { g.volute(c.x, c.y, Math.max(3, g.s * 0.9), c.dx, g.markStyle || g.tone); });
      } },
    { key: "chevrons", label: "Chevrons", about: "Chevrons point out of the left and the right side.",
      draw: function (g) {
          var ctx = g.ctx, k = Math.max(3, g.s * 0.6);
          ctx.save();
          ctx.strokeStyle = g.markStyle || g.tone;
          ctx.lineWidth = Math.max(1.2, g.mw);
          ctx.lineJoin = "miter";
          each([g.spots.mids[1], g.spots.mids[3]], function (c) {
              var out = -c.dx || 1;                 // away from the middle
              for (var j = 0; j < 2; j++) {
                  var x = c.x + out * (j * k * 0.75 - k * 0.2);
                  ctx.beginPath();
                  ctx.moveTo(x - out * k * 0.5, c.y - k * 0.7);
                  ctx.lineTo(x + out * k * 0.2, c.y);
                  ctx.lineTo(x - out * k * 0.5, c.y + k * 0.7);
                  ctx.stroke();
              }
          });
          ctx.restore();
      } },
    { key: "fans", label: "Fans", about: "Fans open in the corners.",
      draw: function (g) {
          var ctx = g.ctx, k = Math.max(7, g.s * 2.2);
          ctx.save();
          ctx.strokeStyle = g.markStyle || g.tone;
          ctx.lineWidth = Math.max(0.7, g.s * 0.1);
          each(g.spots.corners, function (c) {
              var x = c.x - c.dx * g.s * 1.2, y = c.y - c.dy * g.s * 1.2;
              var a0 = Math.atan2(c.dy, 0) , a1 = Math.atan2(0, c.dx);
              var start = Math.min(a0, a1), end = Math.max(a0, a1);
              if (end - start > Math.PI) { var t = start; start = end; end = t + Math.PI * 2; }
              for (var ring = 1; ring <= 3; ring++) {
                  ctx.beginPath(); ctx.arc(x, y, k * ring / 3, start, end, false); ctx.stroke();
              }
              for (var ray = 0; ray <= 4; ray++) {
                  var a = start + (end - start) * ray / 4;
                  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); ctx.stroke();
              }
          });
          ctx.restore();
      } },
    { key: "deco", label: "Deco", about: "Deco steps three lines into each corner, the way the twenties did it.",
      draw: function (g) {
          var ctx = g.ctx, w = Math.max(1, g.s * 0.14), step = Math.max(2.5, g.s * 0.45), arm = Math.max(8, g.s * 2.4);
          ctx.fillStyle = g.markStyle || g.tone;
          each(g.spots.corners, function (c) {
              var x = c.x - c.dx * g.s * 1.1, y = c.y - c.dy * g.s * 1.1;
              for (var i = 0; i < 3; i++) {
                  var ox = x + c.dx * step * i, oy = y + c.dy * step * i, len = arm - step * i * 1.4;
                  ctx.fillRect(c.dx > 0 ? ox : ox - len, c.dy > 0 ? oy : oy - w, len, w);
                  ctx.fillRect(c.dx > 0 ? ox : ox - w, c.dy > 0 ? oy : oy - len, w, len);
              }
          });
      } },
    { key: "crown", label: "Crown", about: "Crown sets a little crown on the top edge.",
      draw: function (g) {
          var ctx = g.ctx, m = g.spots.mids[0], k = Math.max(4, g.s * 1.0), y = m.y - g.s * 1.1;
          ctx.fillStyle = g.markStyle || g.tone;
          ctx.beginPath();
          ctx.moveTo(m.x - k * 1.2, y + k * 0.5);
          ctx.lineTo(m.x - k * 1.2, y - k * 0.5);
          ctx.lineTo(m.x - k * 0.6, y);
          ctx.lineTo(m.x, y - k * 0.8);
          ctx.lineTo(m.x + k * 0.6, y);
          ctx.lineTo(m.x + k * 1.2, y - k * 0.5);
          ctx.lineTo(m.x + k * 1.2, y + k * 0.5);
          ctx.closePath();
          ctx.fill();
          each([-1.2, 0, 1.2], function (o, i) { dot(ctx, m.x + o * k, y - (i === 1 ? k * 0.8 : k * 0.5), Math.max(1, k * 0.16)); });
      } },
    { key: "laurels", label: "Laurels", about: "Laurels grow up both sides from the bottom.",
      draw: function (g) {
          var ctx = g.ctx, b = g.spots.mids[2];
          var rad = Math.min(g.L, g.T) * 0.5 - g.s * 1.4, cx = b.x, cy = b.y - rad;
          ctx.save();
          ctx.fillStyle = g.markStyle || g.tone;
          for (var side = -1; side <= 1; side += 2) {
              for (var i = 0; i < 7; i++) {
                  var a = Math.PI / 2 - side * (0.25 + i * 0.16);
                  var px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
                  ctx.save();
                  ctx.translate(px, py);
                  ctx.rotate(a + side * Math.PI * 0.55);
                  var lx = Math.max(2.5, g.s * 0.62), ly = Math.max(1.1, g.s * 0.26);
                  ctx.beginPath();
                  ctx.ellipse(-lx, -ly, lx * 2, ly * 2);    // Qt's ellipse takes the box around it
                  ctx.fill();
                  ctx.restore();
              }
          }
          ctx.restore();
      } }
];

var byKey = {};
for (var i = 0; i < list.length; i++) byKey[list[i].key] = list[i];
