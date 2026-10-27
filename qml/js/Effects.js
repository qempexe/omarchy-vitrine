.pragma library

// How a widget comes in. t: 0 = in place, 1 = not there yet. dist: how far it travels.
// returns { opacity, scale, yScale, dx, dy }
function state(effect, t, dist) {
    const c = Math.max(0, Math.min(1, t));
    const s = { opacity: 1, scale: 1, yScale: 1, dx: 0, dy: 0 };
    if (effect === "none") return s;
    if (effect === "fade") s.opacity = 1 - c;
    else if (effect === "zoom") { s.scale = 1 - 0.12 * c; s.opacity = 1 - c; }
    else if (effect === "rise") { s.dy = c * dist; s.opacity = 1 - c; }
    else if (effect === "drop") { s.dy = -c * dist; s.opacity = 1 - c; }
    else if (effect === "slide") { s.dx = -c * dist; s.opacity = 1 - c; }
    else if (effect === "pop") { s.scale = 1 - 0.4 * t; s.opacity = 1 - c; }
    else if (effect === "unfold") { s.yScale = Math.max(0.01, 1 - c); s.opacity = 1 - 0.5 * c; }
    return s;
}

// effects that overshoot a little on the way in
function springy(effect) { return effect === "pop"; }
