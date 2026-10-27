import QtQuick
import QtQuick.Effects
import "../js/Kinds.js" as Kinds
import "../js/Look.js" as Look
import "../js/Card.js" as Card
import "../js/Stage.js" as Stage
import "../js/Effects.js" as Effects
import "../js/Draw.js" as D

// One widget: its card (painted only when the look changes) and what it shows
// (painted when that changes: a minute, a second, a new reading).
Item {
    id: root

    property var svc: null
    property var w: null                   // the widget's settings
    property int index: 0                  // its place among the widgets
    property real screenW: 1920
    property real screenH: 1080
    property real screenK: 1               // how much this screen grows widgets (Desktop › Sizes follow)
    property bool live: true               // false keeps it still (Arrange while dragging)
    property real dragX: NaN               // where Arrange holds it while you drag, in pixels
    property real dragY: NaN
    property real dragSize: NaN

    readonly property var cfg: svc ? svc.cfg : null
    readonly property var kind: w ? Kinds.kindOf(w.kind) : null
    readonly property var style: w ? Kinds.styleOf(w) : null
    readonly property var shown: {
        if (!w) return null
        if (isFinite(root.dragSize)) { const c = JSON.parse(JSON.stringify(w)); c.size = root.dragSize; return c }
        return w
    }
    readonly property var colors: cfg && shown ? Look.colorsFor(cfg, svc.theme, shown, index, shown.x / 1000) : null
    readonly property var box: cfg && shown ? Look.boxOf(cfg, shown, screenK) : ({ w: 10, h: 10, content: { x: 0, y: 0, w: 10, h: 10 }, captionH: 0, card: false })

    width: box.w
    height: box.h
    // its middle sits where the widget says, kept on the screen
    readonly property real cx: isFinite(dragX) ? dragX : (shown ? shown.x / 1000 * screenW : 0)
    readonly property real cy: isFinite(dragY) ? dragY : (shown ? shown.y / 1000 * screenH : 0)
    x: Math.max(0, Math.min(screenW - width, cx - width / 2))
    y: Math.max(0, Math.min(screenH - height, cy - height / 2))

    // ---- coming in ------------------------------------------------------------------

    property real enter: 0                 // 1 = not there yet, 0 = in place
    readonly property var fx: Effects.state(cfg ? cfg.appear : "none", enter, Math.min(60, height * 0.25))
    opacity: (cfg ? cfg.opacity / 100 : 1) * (w ? w.opacity / 100 : 1) * fx.opacity
    transform: [
        Scale { origin.x: root.width / 2; origin.y: root.height / 2; xScale: root.fx.scale; yScale: root.fx.scale * root.fx.yScale },
        Translate { x: root.fx.dx; y: root.fx.dy }
    ]
    NumberAnimation {
        id: enterAnim
        target: root
        property: "enter"
        from: 1
        to: 0
        duration: root.cfg ? Math.max(1, root.cfg.speed) : 400
        easing.type: root.cfg && Effects.springy(root.cfg.appear) ? Easing.OutBack : Easing.OutCubic
    }
    Timer {
        id: enterDelay
        interval: root.cfg && root.cfg.stagger ? Math.min(root.index, 12) * 70 : 0
        onTriggered: {
            if (!root.cfg || root.cfg.speed <= 0 || root.cfg.appear === "none") root.enter = 0
            else enterAnim.restart()
        }
    }
    // never left half way: whatever happens, the widget is in place a moment later
    Timer {
        id: enterSafety
        interval: 1200 + Math.min(root.index, 12) * 70 + (root.cfg ? root.cfg.speed : 0)
        onTriggered: { enterAnim.stop(); root.enter = 0 }
    }
    function comeIn() {
        if (!root.cfg || root.cfg.speed <= 0 || root.cfg.appear === "none") { enterAnim.stop(); root.enter = 0; return }
        root.enter = 1
        enterDelay.restart()
        enterSafety.restart()
    }
    readonly property int serial: svc ? svc.appearSerial : 0
    onSerialChanged: comeIn()
    Component.onCompleted: {
        comeIn()
        // a widget made while music plays has its cover from the start
        if (root.rawArt !== "" && root.svc) root.svc.covers.ask(root.rawArt)
        root.takeArt()
    }

    // ---- the card -------------------------------------------------------------------

    readonly property real margin: Math.max(14, Math.min(box.w, box.h) * 0.08)
    readonly property var shadow: colors ? Look.shadowOf(cfg, colors) : null
    readonly property string cardKey: !cfg || !colors || !box.card ? "" : JSON.stringify([
        cfg.frame, cfg.surface, cfg.lines, cfg.ornaments, cfg.cardOpacity, cfg.fill, cfg.pattern, cfg.depth, cfg.radius,
        cfg.border, cfg.borderWidth, cfg.outlineGradient, cfg.outlineGradientTo, colors.bg, colors.accent, colors.ink,
        cfg.pointing, cfg.flatCorners, cfg.railSide, cfg.gradientTo, cfg.gradientDir, svc.themePalette,
        Math.round(box.w), Math.round(box.h), svc.borderColors, svc.borderAngle])

    Canvas {
        id: card
        visible: root.box.card
        x: -root.margin
        y: -root.margin
        width: root.box.w + root.margin * 2
        height: root.box.h + root.margin * 2
        readonly property string key: root.cardKey
        onKeyChanged: requestPaint()
        // a canvas that turns visible or changes size has to be painted again
        onVisibleChanged: if (visible) requestPaint()
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        onPaint: {
            const ctx = getContext("2d")
            ctx.reset()
            if (root.cardKey === "") return
            Card.paint(ctx, Look.cardParams(root.cfg, root.svc.theme, root.colors, width, height, root.margin))
        }
        layer.enabled: root.box.card && root.shadow !== null
        layer.effect: MultiEffect {
            shadowEnabled: true
            blurMax: 48
            shadowBlur: root.shadow ? root.shadow.blur : 0
            shadowColor: root.shadow ? root.shadow.color : "transparent"
            shadowVerticalOffset: root.shadow ? root.shadow.y : 0
            autoPaddingEnabled: true
        }
    }

    // ---- what it shows ------------------------------------------------------------------

    readonly property var c: box.content
    readonly property var now: svc ? svc.now : new Date()
    readonly property var zoneOffset: w && w.kind === "clock" && w.zone !== "" && svc ? svc.zones.offsetOf(w.zone) : null
    readonly property var t: Stage.timeParts(root.now, root.zoneOffset)
    readonly property bool sweeping: !!(style && style.sweep && cfg && cfg.sweep && w && w.seconds && root.live && root.visible && root.opacity > 0)
    readonly property bool showsSeconds: !!(w && w.kind === "clock" && (w.seconds || w.blink) && style && style.seconds !== false)

    // the clock's digits as they show now: hours, minutes, seconds
    function texts(t) {
        if (!w || w.kind !== "clock") return []
        const h = w.h24 ? t.h : D.hour12(t.h)
        return [w.lead ? D.pad2(h) : "" + h, D.pad2(t.m), D.pad2(t.s)]
    }

    // what the widget is showing: when this changes, it is painted again
    readonly property string stamp: {
        if (!w || !style) return ""
        const tt = root.t
        if (w.kind === "clock") return tt.y + "-" + tt.doy + " " + tt.h + ":" + tt.m + (root.showsSeconds ? ":" + tt.s : "")
        if (w.kind === "system") return "s" + (svc ? svc.system.serial : 0)
        if (w.kind === "media") return "m" + (svc ? svc.media.serial : 0) + (art.ready ? "a" : "")
        if (w.kind === "text" && w.style === "terminal") return "" + tt.h + tt.m + tt.s
        return tt.y + "-" + tt.doy + " " + tt.h + ":" + tt.m
    }
    // everything else that changes how it is drawn
    readonly property string lookKey: !cfg || !colors || !w ? "" : JSON.stringify([w, colors, cfg.font, cfg.weight, svc.fontsReady, Math.round(c.w), Math.round(c.h)])

    // Flip and Odometer animate from the digits they showed before
    property var prevTexts: []
    property var lastTexts: []
    property real anim: 1
    NumberAnimation { id: flipAnim; target: root; property: "anim"; from: 0; to: 1; duration: root.style && root.style.animMs ? root.style.animMs : 400 }
    onStampChanged: {
        const now = root.texts(root.t)
        if (root.style && root.style.animMs && root.cfg && root.cfg.flipMotion && root.cfg.speed > 0
                && root.lastTexts.length > 0 && JSON.stringify(now) !== JSON.stringify(root.lastTexts)) {
            root.prevTexts = root.lastTexts
            flipAnim.restart()
        }
        root.lastTexts = now
        content.requestPaint()
    }
    onLookKeyChanged: content.requestPaint()
    onAnimChanged: content.requestPaint()

    // the music's cover: never the player's file or address itself, but the small, clean
    // copy the cover cache makes of it (core/ArtCache.qml), loaded into the canvas before
    // it is drawn. the canvas keeps a picture until it is unloaded: the one before goes
    QtObject {
        id: art
        property string url: ""
        property bool ready: false
    }
    readonly property var mediaNow: w && w.kind === "media" && svc ? (svc.media.serial, svc.media.dataFor(w.player)) : null
    readonly property string rawArt: mediaNow && mediaNow.artUrl ? String(mediaNow.artUrl) : ""
    onRawArtChanged: if (rawArt !== "" && svc) svc.covers.ask(rawArt)
    readonly property string cleanArt: svc ? (svc.covers.done, svc.covers.fileFor(rawArt)) : ""
    onCleanArtChanged: takeArt()
    function takeArt() {
        const u = root.cleanArt
        if (u === art.url) return
        if (art.url !== "") content.unloadImage(art.url)
        art.url = u
        art.ready = false
        if (u !== "") content.loadImage(u)
    }


    // nothing playing and the widget hides then
    readonly property bool idleHidden: !!(w && w.kind === "media" && w.idle === "hide" && root.mediaNow && !root.mediaNow.has && root.live)
    visible: !idleHidden

    function dataFor(t) {
        if (!w) return {}
        if (w.kind === "system") return { meters: svc ? svc.system.metersFor(w) : [] }
        if (w.kind === "media") {
            const m = root.mediaNow || { has: false }
            return { has: m.has, title: m.title, artist: m.artist, album: m.album, art: art.ready ? art.url : "",
                     pos: m.pos, len: m.len, playing: m.playing, player: m.player }
        }
        if (w.kind === "text") return Kinds.noteData(w, root.now, t.doy)
        return {}
    }

    readonly property var names: ({
        days: [0, 1, 2, 3, 4, 5, 6].map(function(i) { return Qt.locale().dayName(i, Locale.LongFormat) }),
        daysShort: [0, 1, 2, 3, 4, 5, 6].map(function(i) { return Qt.locale().dayName(i, Locale.ShortFormat) }),
        months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function(i) { return Qt.locale().monthName(i, Locale.LongFormat) }),
        monthsShort: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function(i) { return Qt.locale().monthName(i, Locale.ShortFormat) })
    })

    Item {
        id: inkLayer
        x: root.c.x
        y: root.c.y
        width: root.c.w
        height: root.c.h + root.box.captionH

        Canvas {
            id: content
            anchors.fill: parent
            onImageLoaded: { art.ready = art.url !== "" && isImageLoaded(art.url); requestPaint() }
            onWidthChanged: requestPaint()
            onHeightChanged: requestPaint()
            onVisibleChanged: if (visible) requestPaint()
            onPaint: {
                const ctx = getContext("2d")
                ctx.reset()
                if (!root.style || !root.colors || !root.svc) return
                const t = root.sweeping ? Stage.timeParts(new Date(), root.zoneOffset) : root.t
                const g = Stage.build(ctx, root.c.w, root.c.h, {
                    t: t, a: root.anim, o: root.w, c: root.colors, card: root.box.card,
                    font: root.svc.mainFont, weight: root.cfg.weight, fonts: root.svc.fonts,
                    sweep: root.sweeping, names: root.names, data: root.dataFor(t), prevTexts: root.prevTexts
                })
                ctx.save()
                try { root.style.draw(g) } catch (e) { console.warn("Vitrine: " + root.w.kind + " " + root.w.style + ": " + e) }
                ctx.restore()
                if (root.box.captionH > 0) {
                    const px = root.box.captionH * 0.7
                    D.text(ctx, root.w.caption, width / 2, height - root.box.captionH * 0.22,
                           { px: px, weight: 500, family: root.svc.mainFont, base: "alphabetic", color: g.col("ink", 0.7), spacing: 0.06 })
                }
            }
        }

        layer.enabled: !root.box.card && root.shadow !== null
        layer.effect: MultiEffect {
            shadowEnabled: true
            blurMax: 32
            shadowBlur: root.shadow ? root.shadow.blur : 0
            shadowColor: root.shadow ? root.shadow.color : "transparent"
            shadowVerticalOffset: root.shadow ? root.shadow.y : 0
            autoPaddingEnabled: true
        }
    }

    // a smooth second hand: painted about 30 times a second, only while it sweeps
    Timer {
        interval: 33
        repeat: true
        running: root.sweeping
        onTriggered: content.requestPaint()
    }
}
