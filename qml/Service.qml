import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Commons as Commons
import "js/Screens.js" as Screens
import "js/Schema.js" as Schema
import "js/Kinds.js" as Kinds
import "js/Util.js" as Util
import "js/Theme.js" as Theme
import "js/Look.js" as Look
import "core"

// The always-loaded part: settings, colors, the readings, the desktop widgets and ipc.
Item {
    id: root

    visible: false

    property var shell: null
    property var manifest: null

    readonly property string pluginId: "io.github.qempexe.vitrine"

    // ---- settings -------------------------------------------------------------------

    SettingsStore { id: settingsStore }
    property alias store: settingsStore
    readonly property var cfg: Schema.resolve(settingsStore.values)
    readonly property var widgets: cfg.widgets

    function setValue(key, value) {
        const v = Schema.clean(key, value)
        if (v === undefined) return
        if (key === "colorMode" && root.cfg.presetColors !== "") settingsStore.setMany({ colorMode: v, presetColors: "" })
        else settingsStore.set(key, v)
        if (key === "enabled" && v === true) root.replay()
    }

    UiState {
        id: ux
        store: settingsStore
        cfg: root.cfg
        barFg: Commons.Color.bar.text
        barBg: Commons.Color.bar.background
        themeAccent: Commons.Color.accent
        themeUrgent: Commons.Color.urgent
        fontName: Style.font.family
        themePalette: root.themePalette
        borderColors: root.borderColors
        borderAngle: root.borderAngle
    }
    property alias ui: ux

    // the widget the panel is showing the settings of
    property string selected: ""
    readonly property var screenNames: {
        const out = []
        for (let i = 0; i < Quickshell.screens.length; i++) out.push(Quickshell.screens[i].name)
        return out
    }

    // ---- screens -----------------------------------------------------------------------
    //
    // A widget's screen is "" (the main screen), "*" (every screen, each with its own
    // copy) or a screen's name. Screens come and go as you plug them in: a widget whose
    // screen is gone moves to the main screen (or hides, as Desktop › Screens says),
    // and goes back as soon as its screen does.

    function num(v, f) { return typeof v === "number" && isFinite(v) ? v : f }
    // name, a label with the model, and where it sits in the layout of all screens
    readonly property var screenList: {
        const out = []
        for (let i = 0; i < Quickshell.screens.length; i++) {
            const s = Quickshell.screens[i]
            let model = ""
            try { model = s.model || "" } catch (e) { model = "" }
            out.push({ name: s.name, label: s.name + (model ? " \u00b7 " + model : ""),
                       x: root.num(s.x, root.num(s.virtualX, 0)), y: root.num(s.y, root.num(s.virtualY, 0)),
                       w: root.num(s.width, 1920), h: root.num(s.height, 1080) })
        }
        return out
    }
    function screenInfo(name) {
        for (let i = 0; i < root.screenList.length; i++) if (root.screenList[i].name === name) return root.screenList[i]
        return null
    }
    readonly property string mainName: Screens.mainOf(root.cfg.mainScreen, root.screenNames)
    // the screen a widget is on right now, "*" for every screen, "" when it's hidden
    function placeOf(w) { return Screens.placeOf(w, root.screenNames, root.mainName, root.cfg.lostScreen) }
    // does widget w show on the screen called name?
    function shows(w, name) { return Screens.shows(w, name, root.screenNames, root.mainName, root.cfg.lostScreen) }
    // is its screen unplugged?
    function lost(w) { return Screens.lost(w, root.screenNames) }
    // how much widgets grow on this screen when sizes follow each screen's height
    function scaleFor(height) { return Screens.scaleFor(root.cfg.sizing, height) }

    // a widget onto another screen, at x, y (thousandths) there. Widgets on every
    // screen stay on every screen; the main screen is saved as "" so it follows it
    function moveToScreen(id, name, x, y) {
        const w = root.widgetById(id)
        if (!w || root.screenNames.indexOf(name) === -1) return false
        const set = {}
        if (w.screen !== "*") set.screen = Screens.savedAs(w, name, root.mainName)
        if (typeof x === "number") set.x = Math.max(0, Math.min(1000, Math.round(x)))
        if (typeof y === "number") set.y = Math.max(0, Math.min(1000, Math.round(y)))
        return root.patchWidget(id, set)
    }
    // the screen after the one it's on (for a button and a key in Arrange)
    function nextScreenOf(id) { return Screens.nextOf(root.widgetById(id), root.screenNames, root.mainName) }
    // which screen a point in the layout of all screens is on, or ""
    function screenAt(gx, gy) { return Screens.at(root.screenList, gx, gy) }
    // a widget's middle at (lx, ly) on screen `from` lands where on screen `to`
    function carry(from, to, lx, ly) {
        const a = root.screenInfo(from), b = root.screenInfo(to)
        return a && b ? Screens.carry(a, b, lx, ly) : null
    }

    // ---- the theme, as the widgets use it ----------------------------------------------

    function rgb(c) { return [c.r * 255, c.g * 255, c.b * 255] }
    readonly property var theme: ({
        fg: root.rgb(Commons.Color.foreground), barText: root.rgb(Commons.Color.bar.text),
        accent: root.rgb(Commons.Color.accent), urgent: root.rgb(Commons.Color.urgent),
        bg: root.rgb(Commons.Color.background),
        palette: root.themePalette, borders: root.borderColors, borderAngle: root.borderAngle
    })

    // the theme's colors.toml: color1 ... color6 and their bright versions
    property var themePalette: []
    FileView {
        id: paletteFile
        path: Commons.Color.currentThemePath ? Commons.Color.currentThemePath + "/colors.toml" : ""
        watchChanges: true
        onFileChanged: reload()
        onLoaded: root.themePalette = Theme.parsePalette(root.fileText(paletteFile))
        onLoadFailed: { root.themePalette = []; root.retryTheme() }
    }
    property var luaBorder: ({ colors: [], angle: 0 })
    property var confBorder: ({ colors: [], angle: 0 })
    property bool luaMissing: false
    readonly property var borderColors: luaBorder.colors.length > 0 ? luaBorder.colors : confBorder.colors
    readonly property real borderAngle: luaBorder.colors.length > 0 ? luaBorder.angle : confBorder.angle
    function fileText(fv) {
        try { const t = typeof fv.text === "function" ? fv.text() : fv.text; return typeof t === "string" ? t : "" } catch (e) { return "" }
    }
    FileView {
        id: borderLua
        path: Commons.Color.currentThemePath ? Commons.Color.currentThemePath + "/hyprland.lua" : ""
        watchChanges: true
        onFileChanged: reload()
        onLoaded: { root.luaMissing = false; root.luaBorder = Theme.parseBorder(root.fileText(borderLua)) }
        onLoadFailed: { root.luaBorder = ({ colors: [], angle: 0 }); root.luaMissing = true }
    }
    FileView {
        id: borderConf
        path: Commons.Color.currentThemePath && root.luaMissing ? Commons.Color.currentThemePath + "/hyprland.conf" : ""
        watchChanges: true
        onFileChanged: reload()
        onPathChanged: if (path === "") root.confBorder = ({ colors: [], angle: 0 })
        onLoaded: root.confBorder = Theme.parseBorder(root.fileText(borderConf))
        onLoadFailed: root.confBorder = ({ colors: [], angle: 0 })
    }
    // a theme switch swaps the folder out for a moment: read again shortly after
    property int themeTries: 0
    function retryTheme() { if (root.themeTries < 3) { root.themeTries++; themeRetry.restart() } }
    Timer {
        id: themeRetry
        interval: 800
        onTriggered: { paletteFile.reload(); borderLua.reload(); borderConf.reload() }
    }
    Connections {
        target: Commons.Color
        ignoreUnknownSignals: true
        function onAccentChanged() { root.themeTries = 0; themeRetry.restart() }
        function onBackgroundChanged() { root.themeTries = 0; themeRetry.restart() }
    }

    // ---- fonts ------------------------------------------------------------------------

    FontLoader { id: fInter; source: Qt.resolvedUrl("../fonts/Inter.ttf") }
    FontLoader { id: fPlayfair; source: Qt.resolvedUrl("../fonts/PlayfairDisplay.ttf") }
    FontLoader { id: fCormorant; source: Qt.resolvedUrl("../fonts/CormorantGaramond.ttf") }
    FontLoader { id: fGrotesk; source: Qt.resolvedUrl("../fonts/SpaceGrotesk.ttf") }
    FontLoader { id: fMono; source: Qt.resolvedUrl("../fonts/JetBrainsMono.ttf") }
    FontLoader { id: fBebas; source: Qt.resolvedUrl("../fonts/BebasNeue.ttf") }
    FontLoader { id: fFraktur; source: Qt.resolvedUrl("../fonts/UnifrakturMaguntia.ttf") }
    readonly property bool fontsReady: [fInter, fPlayfair, fCormorant, fGrotesk, fMono, fBebas, fFraktur]
        .every(function(f) { return f.status !== FontLoader.Loading })
    function nameOr(f, fallback) { return f.status === FontLoader.Ready && f.name ? f.name : fallback }
    readonly property string mainFont: root.cfg.font === "" ? Style.font.family : root.cfg.font
    readonly property var fonts: ({
        sans: root.nameOr(fInter, "sans-serif"),
        serif: root.cfg.font === "Cormorant Garamond" ? root.nameOr(fCormorant, "serif") : root.nameOr(fPlayfair, "serif"),
        mono: root.nameOr(fMono, "monospace"),
        display: root.nameOr(fBebas, "sans-serif"),
        script: root.nameOr(fFraktur, "serif")
    })

    // every font on the computer, for the font search (read once, when asked)
    property var systemFonts: []
    function loadSystemFonts() { if (root.systemFonts.length === 0 && !fontProc.running) fontProc.running = true }
    Process {
        id: fontProc
        command: ["fc-list", ":", "family"]
        stdout: StdioCollector {
            onStreamFinished: {
                const seen = {}, out = []
                const lines = (text || "").split("\n")
                for (let i = 0; i < lines.length && out.length < 3000; i++) {
                    const name = lines[i].split(",")[0].trim()
                    if (name && /^[A-Za-z0-9 _.\-]{1,80}$/.test(name) && !seen[name]) { seen[name] = true; out.push(name) }
                }
                out.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
                root.systemFonts = out
            }
        }
    }

    // ---- the time and the readings -----------------------------------------------------

    property var now: new Date()
    // ticks on the second, so clocks change exactly when the second does
    Timer {
        id: tick
        interval: 1000
        repeat: true
        running: true
        triggeredOnStart: true
        onTriggered: {
            root.now = new Date()
            const ms = root.now.getMilliseconds()
            tick.interval = Math.max(200, 1000 - ms + 5)
        }
    }

    function kindsShown(kind) {
        if (!root.cfg.enabled) return []
        const out = []
        for (let i = 0; i < root.widgets.length; i++) if (root.widgets[i].kind === kind) out.push(root.widgets[i])
        return out
    }
    readonly property var systemWidgets: kindsShown("system")
    readonly property var mediaWidgets: kindsShown("media")
    readonly property var clockWidgets: kindsShown("clock")

    SystemData {
        id: sys
        active: root.systemWidgets.length > 0
        interval: {
            let n = 30
            for (let i = 0; i < root.systemWidgets.length; i++) n = Math.min(n, root.systemWidgets[i].every)
            return n
        }
        diskPaths: {
            const out = []
            for (let i = 0; i < root.systemWidgets.length; i++) if (out.indexOf(root.systemWidgets[i].path) === -1) out.push(root.systemWidgets[i].path)
            return out.length > 0 ? out : ["/"]
        }
        wantsDisk: root.metricShown("disk")
        wantsTemp: root.metricShown("temp")
    }
    function metricShown(key) {
        for (let i = 0; i < root.systemWidgets.length; i++) if (root.systemWidgets[i].metrics.indexOf(key) !== -1) return true
        return false
    }
    property alias system: sys

    MediaData { id: media; active: root.mediaWidgets.length > 0 }
    property alias media: media

    Zones {
        id: zones
        zones: {
            const out = []
            for (let i = 0; i < root.clockWidgets.length; i++) if (root.clockWidgets[i].zone !== "") out.push(root.clockWidgets[i].zone)
            return out
        }
    }
    property alias zones: zones

    // ---- widgets ----------------------------------------------------------------------

    function widgetById(id) {
        for (let i = 0; i < root.widgets.length; i++) if (root.widgets[i].id === id) return root.widgets[i]
        return null
    }
    function indexOf(id) {
        for (let i = 0; i < root.widgets.length; i++) if (root.widgets[i].id === id) return i
        return -1
    }
    function copyList() { return JSON.parse(JSON.stringify(root.widgets)) }

    // change some of one widget's settings
    function patchWidget(id, set) {
        const list = root.copyList(), i = root.indexOf(id)
        if (i < 0) return false
        for (const k in set) list[i][k] = set[k]
        root.setValue("widgets", list)
        return true
    }
    function updateWidget(id, key, value) { const s = {}; s[key] = value; return root.patchWidget(id, s) }

    // a new widget, in the middle of the screen (or at x, y in thousandths)
    function addWidget(kind, screenName, x, y) {
        if (root.widgets.length >= Kinds.MAX_WIDGETS) return ""
        const list = root.copyList()
        const id = Kinds.nextId(list)
        const set = { x: typeof x === "number" ? x : 500, y: typeof y === "number" ? y : 450 }
        if (typeof screenName === "string") set.screen = screenName
        const w = Kinds.make(kind, id, set)
        if (!w) return ""
        list.push(w)
        root.setValue("widgets", list)
        root.selected = id
        return id
    }
    function duplicateWidget(id) {
        const w = root.widgetById(id)
        if (!w || root.widgets.length >= Kinds.MAX_WIDGETS) return ""
        const list = root.copyList()
        const copy = JSON.parse(JSON.stringify(w))
        copy.id = Kinds.nextId(list)
        copy.x = Math.min(1000, w.x + 30); copy.y = Math.min(1000, w.y + 30)
        list.push(copy)
        root.setValue("widgets", list)
        root.selected = copy.id
        return copy.id
    }
    function removeWidget(id) {
        const list = root.copyList(), i = root.indexOf(id)
        if (i < 0) return false
        list.splice(i, 1)
        root.setValue("widgets", list)
        if (root.selected === id) root.selected = ""
        return true
    }
    // up the list = drawn later = on top
    function moveWidget(id, step) {
        const list = root.copyList(), i = root.indexOf(id), j = i + step
        if (i < 0 || j < 0 || j >= list.length) return false
        const t = list[i]; list[i] = list[j]; list[j] = t
        root.setValue("widgets", list)
        return true
    }

    // ---- looks ------------------------------------------------------------------------

    // every widget comes in again (startup, on, a new look)
    property int appearSerial: 0
    function replay() { root.appearSerial++ }

    function resetAll() {
        const next = {}
        for (const k in Schema.defaults) next[k] = Schema.defaults[k]
        next.savedLooks = root.cfg.savedLooks
        settingsStore.resetAll(next)
        root.replay()
    }

    // a look starts from the defaults, so nothing from the last one lingers;
    // the panel's own settings stay, and so do your widgets when Keep my widgets is on
    function applyPreset(key) {
        const p = Schema.presetFor(Util.toText(key))
        if (!p) return false
        const keepWidgets = root.cfg.keepWidgets === true
        const look = {}
        for (let i = 0; i < Schema.lookKeys.length; i++) {
            const k = Schema.lookKeys[i]
            look[k] = k === "widgets" ? (keepWidgets ? root.cfg.widgets : Schema.defaults.widgets) : Schema.defaults[k]
        }
        // colors you chose yourself stay yours
        const keepColors = ["colorMode", "customBg", "customFg", "accentColor"]
        for (let c = 0; c < keepColors.length; c++) look[keepColors[c]] = root.cfg[keepColors[c]]
        if (root.cfg.presetColors !== "" && look.colorMode === root.cfg.presetColors) look.colorMode = "theme"
        const set = Schema.cleanLook(p.set)
        for (const s in set) {
            if (s === "widgets" && keepWidgets) continue
            look[s] = set[s]
        }
        look.presetColors = set.colorMode !== undefined ? set.colorMode : ""
        look.undoLook = Schema.lookOf(root.cfg)
        look.lastLook = p.key
        look.enabled = true
        settingsStore.setMany(look)
        root.selected = ""
        root.replay()
        return true
    }
    function nextLook() {
        let i = -1
        for (let k = 0; k < Schema.presets.length; k++) if (Schema.presets[k].key === root.cfg.lastLook) i = k
        root.applyPreset(Schema.presets[(i + 1) % Schema.presets.length].key)
    }
    readonly property bool canUndo: root.cfg.undoLook !== null
    function undoLook() {
        if (!root.cfg.undoLook) return false
        const look = Schema.cleanLookAll(root.cfg.undoLook)
        look.undoLook = null
        look.lastLook = ""
        settingsStore.setMany(look)
        root.replay()
        return true
    }

    function slotOk(i) { return typeof i === "number" && i >= 0 && i < Schema.LOOK_SLOTS && Math.round(i) === i }
    function saveLook(i) {
        if (!slotOk(i)) return false
        const looks = root.cfg.savedLooks.slice()
        looks[i] = Schema.lookOf(root.cfg)
        root.setValue("savedLooks", looks)
        return true
    }
    function freeLook() {
        for (let i = 0; i < Schema.LOOK_SLOTS; i++) if (!root.cfg.savedLooks[i]) return i
        return -1
    }
    function saveFreeLook() { const i = root.freeLook(); return i >= 0 && root.saveLook(i) ? i : -1 }
    function loadLook(i) {
        if (!slotOk(i) || !root.cfg.savedLooks[i]) return false
        const look = Schema.cleanLook(root.cfg.savedLooks[i])
        look.undoLook = Schema.lookOf(root.cfg)
        look.enabled = true
        settingsStore.setMany(look)
        root.replay()
        return true
    }
    function clearLook(i) {
        if (!slotOk(i)) return false
        const looks = root.cfg.savedLooks.slice()
        looks[i] = null
        root.setValue("savedLooks", looks)
        return true
    }
    function exportLook() { return JSON.stringify(Schema.lookOf(root.cfg)) }
    function importLook(text) {
        const look = Schema.parseLook(text)
        if (!look) return false
        settingsStore.setMany(look)
        root.replay()
        return true
    }

    // ---- arranging ----------------------------------------------------------------------

    property bool arranging: false
    function arrange(on) {
        root.arranging = on === undefined ? !root.arranging : on === true
        if (root.arranging && !root.cfg.enabled) root.setValue("enabled", true)
    }

    // ---- the desktop ------------------------------------------------------------------

    Component.onCompleted: Qt.callLater(root.replay)

    Loader {
        active: true
        source: "desk/Desktop.qml"
        onLoaded: item.svc = root
        onStatusChanged: if (status === Loader.Error) console.warn("Vitrine: the desktop widgets could not load")
    }
    Loader {
        active: root.arranging
        source: "desk/Arrange.qml"
        onLoaded: item.svc = root
        onStatusChanged: if (status === Loader.Error) { console.warn("Vitrine: Arrange could not load"); root.arranging = false }
    }

    // ---- ipc: omarchy-shell io.github.qempexe.vitrine <function> ---------------------------

    IpcHandler {
        target: root.pluginId

        function settings(): string { root.ui.tabRequested("settings", true); return "ok" }
        function toggle(): string { root.setValue("enabled", !root.cfg.enabled); return root.cfg.enabled ? "on" : "off" }
        function show(): string { root.setValue("enabled", true); return "on" }
        function hide(): string { root.setValue("enabled", false); return "off" }
        function arrange(): string { root.arrange(); return root.arranging ? "arranging" : "done" }
        function add(kind: string): string { const id = root.addWidget(kind); return id !== "" ? "added " + id : "kinds: clock date system media text" }
        function look(name: string): string { return root.applyPreset(name) ? name : "unknown look" }
        function next(): string { root.nextLook(); return root.cfg.lastLook }
        function undo(): string { return root.undoLook() ? "ok" : "nothing to undo" }
        function save(slot: int): string { return root.saveLook(slot - 1) ? "saved in " + slot : "places are 1 to " + Schema.LOOK_SLOTS }
        function saveNew(): string { const i = root.saveFreeLook(); return i >= 0 ? "saved in " + (i + 1) : "all " + Schema.LOOK_SLOTS + " places are taken" }
        function load(slot: int): string { return root.loadLook(slot - 1) ? "loaded " + slot : "nothing saved there" }
        function exportLook(): string { return root.exportLook() }
        function importLook(json: string): string { return root.importLook(json) ? "ok" : "not a Vitrine look" }
        function screens(): string { return JSON.stringify({ main: root.mainName, screens: root.screenList }) }
        function addOn(kind: string, screen: string): string {
            if (screen !== "" && screen !== "*" && root.screenNames.indexOf(screen) === -1) return "no screen called " + screen
            const id = root.addWidget(kind, screen === root.mainName ? "" : screen)
            return id !== "" ? "added " + id : "kinds: clock date system media text"
        }
        function moveTo(id: string, screen: string): string {
            if (screen === "*" || screen === "") return root.updateWidget(id, "screen", screen) ? "ok" : "no widget " + id
            return root.moveToScreen(id, screen) ? "ok" : "no widget " + id + " or no screen " + screen
        }
        function status(): string {
            return JSON.stringify({ enabled: root.cfg.enabled, widgets: root.widgets.length, look: root.cfg.lastLook, arranging: root.arranging })
        }
    }
}
