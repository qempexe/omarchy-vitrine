import QtQuick
import "../js/Schema.js" as Schema

// theme + spacing + panel state for the panel and the popped out window (`ui.*`).
// own item so the names can't clash with the shell's types
Item {
    id: root

    visible: false

    property var store: null
    property var cfg: null           // resolved settings (Schema.resolve)

    property bool popped: false      // the panel lives in its own window
    property string tabName: "settings"
    property int settingsGroup: 0

    signal popOutRequested()
    signal dockRequested()
    signal closeRequested()
    signal tabRequested(string name, bool toggle)   // from ipc, one bar button answers
    property var host: null                         // bar button used last

    readonly property var cfgSafe: cfg ? cfg : Schema.defaults

    // small separate values so delegates only update when theirs changes
    readonly property real densityF: cfgSafe.density === "compact" ? 0.85 : (cfgSafe.density === "spacious" ? 1.2 : 1.0)
    readonly property real fontPct: cfgSafe.fontScale
    readonly property real tintPct: cfgSafe.surfaceTint
    readonly property bool frameOn: cfgSafe.panelFrame === true
    readonly property real opacityF: cfgSafe.panelOpacity / 100
    readonly property real radius: cfgSafe.cornerRadius
    readonly property int speed: cfgSafe.speed

    // bar colors from the shell theme
    property color barFg: "white"
    property color barBg: "#121217"
    property color themeAccent: "transparent"
    property color themeUrgent: "#e06c75"
    property string fontName: ""
    property var themePalette: []            // the theme's own colors, for "Theme palette"
    property var borderColors: []            // the theme's window border colors, for "Window borders"
    property real borderAngle: 0             // and the angle of their gradient

    // the panel outline: the window border's gradient, or one color from it, or the accent
    readonly property bool frameGradientOn: frameOn && cfgSafe.panelFrameGradient !== false && borderColors.length > 1
    readonly property color frameColor: {
        const n = borderColors.length
        const pick = cfgSafe.panelFrameColor
        if (n === 0 || pick === "accent" || !pick) return accent
        if (pick === "first") return Qt.color(borderColors[0])
        if (pick === "last") return Qt.color(borderColors[n - 1])
        return Qt.color(borderColors[Math.floor((n - 1) / 2)])
    }

    function lumOf(c) { return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }
    // black or white, whatever reads better on c
    function contrast(c) {
        return lumOf(c) > 0.5 ? Qt.rgba(0.08, 0.08, 0.08, 1) : Qt.rgba(0.96, 0.96, 0.96, 1)
    }
    function grey(l) { return Qt.rgba(l, l, l, 1) }

    readonly property string colorMode: cfgSafe.colorMode
    readonly property bool mono: colorMode === "monochrome"
    readonly property bool custom: colorMode === "custom"
    readonly property color barSurface: Qt.rgba(barBg.r, barBg.g, barBg.b, 1)
    function hexOr(v, fallback) { return Qt.color(Schema.validHex(v) ? v : fallback) }
    // mono: grey surface at the bar's brightness. custom: your own colors
    readonly property color surface: custom ? hexOr(cfgSafe.customBg, "#141414")
        : mono ? grey(lumOf(barSurface)) : barSurface
    readonly property bool lightSurface: lumOf(surface) > 0.5
    // text must be readable on the surface, else fall back to black/white
    readonly property color wantFg: custom ? hexOr(cfgSafe.customFg, "#e0e0e0") : barFg
    readonly property color fg: mono ? contrast(surface)
        : (Math.abs(lumOf(wantFg) - lumOf(surface)) >= 0.35 ? wantFg : contrast(surface))
    readonly property bool hasThemeAccent: themeAccent.a > 0
    readonly property color themeAc: hasThemeAccent ? Qt.rgba(themeAccent.r, themeAccent.g, themeAccent.b, 1) : barFg
    readonly property color accent: custom ? hexOr(cfgSafe.accentColor, "#ff6a1f")
        : mono ? fg : themeAc

    // colors for the scheme tiles
    function schemeColors(name) {
        if (name === "custom")
            return { bg: hexOr(cfgSafe.customBg, "#141414"), fg: hexOr(cfgSafe.customFg, "#e0e0e0"), ac: hexOr(cfgSafe.accentColor, "#ff6a1f") }
        if (name === "monochrome") {
            const g = grey(lumOf(barSurface))
            return { bg: g, fg: contrast(g), ac: contrast(g) }
        }
        if (name === "borders" && borderColors.length > 0)
            return { bg: barSurface, fg: barFg, ac: themeAc,
                     acs: [Qt.color(borderColors[0]), Qt.color(borderColors[Math.floor((borderColors.length - 1) / 2)]), Qt.color(borderColors[borderColors.length - 1])] }
        if (name === "palette" && themePalette.length > 0)
            return { bg: barSurface, fg: barFg, ac: themeAc,
                     acs: [Qt.color(themePalette[0]), Qt.color(themePalette[1 % themePalette.length]), Qt.color(themePalette[2 % themePalette.length])] }
        return { bg: barSurface, fg: barFg, ac: themeAc }
    }

    readonly property color accentText: contrast(accent)
    readonly property color urgent: mono ? fg : Qt.rgba(themeUrgent.r, themeUrgent.g, themeUrgent.b, 1)
    readonly property color bad: mono ? fg
        : (lightSurface ? Qt.rgba(0.74, 0.16, 0.26, 1) : Qt.rgba(0.97, 0.46, 0.56, 1))
    readonly property color good: mono ? fg
        : (lightSurface ? Qt.rgba(0.16, 0.52, 0.30, 1) : Qt.rgba(0.56, 0.86, 0.58, 1))

    readonly property bool animations: cfgSafe.speed > 0

    function tint(a) { return Qt.rgba(fg.r, fg.g, fg.b, a) }
    function accentTint(a) { return Qt.rgba(accent.r, accent.g, accent.b, a) }
    // text color on an "on" chip (c at 22% over the surface)
    function onFill(c) {
        return Qt.rgba(surface.r * 0.78 + c.r * 0.22, surface.g * 0.78 + c.g * 0.22,
                       surface.b * 0.78 + c.b * 0.22, 1)
    }
    function onText(c) { return contrast(onFill(c)) }
    // panel bg with opacity
    readonly property color panelColor: Qt.rgba(surface.r, surface.g, surface.b, opacityF)

    // radius = roundness setting * k
    function r(k) { return Math.min(24, Math.round(radius * k)) }
    readonly property real baseScale: 0.82
    function fs(n) { return Math.max(7, Math.round(n * fontPct / 100 * baseScale)) }
    function px(n) { return Math.round(n * densityF) }
}
