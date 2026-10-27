import QtQuick
import "../js/Card.js" as Card
import "../js/Look.js" as Look
import "../js/Kinds.js" as Kinds
import "../js/Stage.js" as Stage
import "../js/Draw.js" as D

// The little picture on a settings tile. A style tile draws the style itself, with
// sample data, so any style added to parts/ gets its tile for free.
Item {
    id: root

    property var ui: null
    property var svc: null
    property string key: ""
    property string opt: ""
    property bool on: false
    property var context: null             // the widget whose settings these are, for its styles

    width: 72
    height: 44

    readonly property color ink: on ? ui.accentInk : ui.tint(0.55)
    readonly property color soft: on ? ui.accentTint(0.40) : ui.tint(0.20)

    function rgb(c) { return [c.r * 255, c.g * 255, c.b * 255] }

    // sample readings for the style tiles
    readonly property var sampleMeters: [
        { key: "cpu", label: "CPU", frac: 0.37, text: "37%", detail: "", history: [0.2, 0.3, 0.25, 0.5, 0.4, 0.6, 0.35, 0.45, 0.37] },
        { key: "mem", label: "Memory", frac: 0.58, text: "58%", detail: "9.3 / 16 GB", history: [0.5, 0.52, 0.55, 0.56, 0.58] },
        { key: "disk", label: "Disk", frac: 0.71, text: "71%", detail: "362 / 512 GB", history: [] }
    ]
    readonly property var sampleMedia: ({ has: true, title: "Night Drive", artist: "The Glass Cases", album: "", art: "",
                                         pos: 84, len: 213, playing: true, player: "" })

    Canvas {
        id: cv
        anchors.centerIn: parent
        width: 68
        height: 40
        readonly property string sig: root.key + "|" + root.opt + "|" + root.on + "|" + root.ink + "|" + root.soft
            + "|" + (root.context ? root.context.kind : "") + "|" + (root.svc ? root.svc.fontsReady : false)
            + "|" + (root.svc ? root.svc.cfg.pointing + root.svc.cfg.flatCorners + root.svc.cfg.railSide : "")
        onSigChanged: requestPaint()
        Component.onCompleted: requestPaint()
        onPaint: {
            const ctx = getContext("2d")
            ctx.reset()
            if (!root.ui) return
            const ink = root.rgb(root.ink), soft = root.rgb(root.soft)
            const bg = root.rgb(root.ui.surface)
            const k = root.key, o = root.opt
            function cardWith(set) {
                const cfg = { frame: "rounded", surface: "filled", lines: "solid", ornaments: "none", cardOpacity: 100, radius: 6,
                            fill: "solid", pattern: "none", depth: "flat", border: "accent", borderWidth: 1, outlineGradient: false }
                for (const s in set) cfg[s] = set[s]
                const colors = { ink: ink, accent: ink, accent2: ink, bg: Look.mix(bg, soft, 0.5), card: true }
                const p = Look.cardParams(cfg, { borders: [], palette: [] }, colors, width, height, 4)
                if (set.lines === "none" || k === "surface") p.lineWidth = 0
                Card.paint(ctx, p)
            }
            const now = root.svc ? root.svc.cfg : ({})
            if (k === "frame") { if (o === "none") { dashes(); return } cardWith({ frame: o, lines: "solid", pointing: now.pointing, flatCorners: now.flatCorners }); return }
            if (k === "surface") { cardWith({ surface: o, lines: "none" }); return }
            if (k === "lines") { cardWith({ lines: o, cardOpacity: 30, railSide: now.railSide }); return }
            if (k === "ornaments") { cardWith({ ornaments: o, lines: "solid", border: "subtle" }); return }
            if (k === "shadow") {
                const sh = { none: [0, 0, 0], soft: [8, 3, 0.45], deep: [14, 6, 0.75], lifted: [12, 9, 0.5], glow: [12, 0, 0.9] }[o] || [0, 0, 0]
                ctx.shadowBlur = sh[0]; ctx.shadowOffsetY = sh[1]
                ctx.shadowColor = o === "glow" ? D.rgba(ink, 0.9) : "rgba(0,0,0," + sh[2] + ")"
                D.roundRect(ctx, 14, 6, 40, 24, 5)
                ctx.fillStyle = D.rgba(Look.mix(bg, soft, 0.5), 1)
                ctx.fill()
                return
            }
            if (k === "textEffect") {
                const e = { none: [0, 0, 0], soft: [4, 2, 0.6], deep: [8, 3, 0.9], glow: [9, 0, 1] }[o] || [0, 0, 0]
                ctx.shadowBlur = e[0]; ctx.shadowOffsetY = e[1]
                ctx.shadowColor = o === "glow" ? D.rgba(ink, 1) : "rgba(0,0,0," + e[2] + ")"
                D.text(ctx, "10:08", width / 2, height / 2 + 8, { px: 22, weight: 300, family: root.svc ? root.svc.fonts.sans : "", base: "alphabetic", color: D.rgba(root.rgb(root.ui.fg), 1) })
                return
            }
            if (k === "appear") {
                const shift = { rise: [0, 7], drop: [0, -7], slide: [-9, 0] }[o] || [0, 0]
                const sc = o === "zoom" ? 0.8 : (o === "pop" ? 0.65 : 1)
                ctx.globalAlpha = 0.3
                ctx.fillStyle = D.rgba(soft, 1)
                if (o !== "none" && o !== "fade") { D.roundRect(ctx, 20 + shift[0] + 14 * (1 - sc), 10 + shift[1] + 10 * (1 - sc), 28 * sc, 20 * (o === "unfold" ? 0.3 : sc), 4); ctx.fill() }
                ctx.globalAlpha = o === "fade" ? 0.55 : 1
                D.roundRect(ctx, 20, 10, 28, 20, 4); ctx.fillStyle = D.rgba(ink, 1); ctx.fill()
                ctx.globalAlpha = 1
                return
            }
            if (k === "visibility") {
                ctx.fillStyle = D.rgba(soft, 0.5); D.roundRect(ctx, 6, 4, 56, 32, 3); ctx.fill()
                if (o !== "always") { ctx.fillStyle = D.rgba(soft, 1); D.roundRect(ctx, o === "nofull" ? 6 : 26, 8, o === "nofull" ? 56 : 32, o === "nofull" ? 28 : 22, 2); ctx.fill() }
                ctx.fillStyle = D.rgba(ink, o === "always" ? 1 : 0.35)
                D.text(ctx, "10:08", 22, 26, { px: 11, weight: 500, family: root.svc ? root.svc.fonts.sans : "", base: "alphabetic", color: D.rgba(ink, o === "always" ? 1 : 0.35) })
                return
            }
            if (k === "mode") {
                const glyph = { note: "Aa", quote: "“ ”", greeting: "Hi!", countdown: "12d", since: "+3d" }[o] || ""
                D.text(ctx, glyph, width / 2, height / 2 + 8, { px: 22, weight: 500, family: root.svc ? root.svc.fonts.serif : "", base: "alphabetic", color: D.rgba(ink, 1) })
                return
            }
            if (k === "openAs" || k === "density") { other(); return }
            if (k === "style" && root.context) { style(); return }

            function dashes() {
                ctx.fillStyle = D.rgba(ink, 0.7)
                D.text(ctx, "10:08", width / 2, height / 2 + 8, { px: 22, weight: 200, family: root.svc ? root.svc.fonts.sans : "", base: "alphabetic", color: D.rgba(ink, 0.9) })
            }
            function other() {
                if (k === "density") {
                    const gap = o === "compact" ? 2 : (o === "spacious" ? 9 : 5)
                    for (let i = 0; i < 4; i++) { ctx.fillStyle = D.rgba(ink, 1); ctx.fillRect(width / 2 - (4 * 9 + 3 * gap) / 2 + i * (9 + gap), 19, 9, 2) }
                } else {
                    ctx.fillStyle = D.rgba(soft, 1); ctx.fillRect(4, 2, 60, 5)
                    ctx.fillStyle = D.rgba(ink, 1)
                    if (o === "panel") ctx.fillRect(10, 8, 28, 22); else ctx.fillRect(20, 12, 28, 22)
                }
            }
            function style() {
                const w = root.context
                const kind = Kinds.kindOf(w.kind)
                const entry = kind ? kind.styles.byKey[o] : null
                if (!entry) return
                const probe = JSON.parse(JSON.stringify(w)); probe.style = o; probe.stretch = 100
                const asp = Kinds.aspectOf(probe)
                let bw = width, bh = height
                if (asp > bw / bh) bh = bw / asp; else bw = bh * asp
                ctx.save()
                ctx.translate((width - bw) / 2, (height - bh) / 2)
                const t = Stage.timeParts(new Date(2026, 9, 16, 10, 8, 37))
                let data = {}
                if (w.kind === "system") data = { meters: root.sampleMeters.slice(0, Math.max(1, Math.min(3, (w.metrics || []).length))) }
                else if (w.kind === "media") data = root.sampleMedia
                else if (w.kind === "text") data = Kinds.noteData(w, new Date(), t.doy)
                const g = Stage.build(ctx, bw, bh, {
                    t: t, a: 1, o: probe, c: { ink: ink, accent: root.on ? ink : root.rgb(root.ui.accent), accent2: ink, bg: bg }, card: false,
                    font: root.svc ? root.svc.mainFont : "", weight: root.svc ? root.svc.cfg.weight : 300,
                    fonts: root.svc ? root.svc.fonts : undefined, sweep: false, data: data, prevTexts: []
                })
                try { entry.draw(g) } catch (e) { }
                ctx.restore()
            }
        }
    }
}
