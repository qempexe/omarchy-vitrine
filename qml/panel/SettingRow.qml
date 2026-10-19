import QtQuick
import "../js/Util.js" as Util
import QtQuick.Layouts
import "../controls"

// one setting row: label + hint, value + reset arrow, control below.
// enum controls: tiles | seg | chips | scheme (seg/chips picked by count if empty)
// also: palette, int (slider), bool (switch), string, color, multi (several chips,
// in the order picked), screen (a screen by name), font (a font, with search)
Item {
    id: root

    property var ui: null
    property var svc: null             // for the screens and fonts, and the style tiles
    property var context: null         // the widget these settings belong to
    property string settingKey: ""
    property string label: ""
    property string hint: ""
    property string kind: "string"
    property string control: ""
    property var options: []
    property var labels: ({})
    property var presets: []
    property var abouts: ({})          // tiles: a sentence for each option, the picked one shows
    readonly property string fullHint: {
        var extra = abouts && typeof abouts[str(current)] === "string" ? abouts[str(current)] : ""
        return hint + (hint !== "" && extra !== "" ? " " : "") + extra
    }
    property var value: null

    // show a choice immediately, don't wait for the round trip through the store
    property var optimistic: undefined
    readonly property var current: optimistic !== undefined ? optimistic : value
    onValueChanged: optimistic = undefined
    function commit(v) { optimistic = v; edited(v) }
    property var defaultValue: null
    property real min: 0
    property real max: 100
    property real step: 1
    property real divisor: 1
    property int decimals: 0
    property bool dimmed: false
    property int maxLength: 2048       // longest text this row accepts
    property bool locked: false        // shown, but has no effect right now and ignores input
    property bool allowAll: true       // screen: offer "Every screen"
    property string emptyLabel: "Main screen"   // screen: what "" is called

    signal edited(var v)

    // settings are already numbers; this only keeps odd values from becoming NaN
    function num(v) { return typeof v === "number" ? v : (typeof v === "string" && /^-?[0-9]{1,15}(\.[0-9]+)?$/.test(v) ? parseFloat(v) : 0) }
    function str(v) { return Util.toText(v) }
    function same(a, b) { return str(a) === str(b) }
    function labelFor(opt) { return typeof labels[opt] === "string" ? labels[opt] : Util.toText(opt) }
    function show(v) {
        var n = num(v) / divisor
        return isFinite(n) ? "" + parseFloat(n.toFixed(decimals)) : "?"
    }
    function nudge(dir) {
        var cur = num(current)
        var v = Math.max(min, Math.min(max, cur + dir * step))
        if (v !== cur) commit(v)
    }
    function validHex(s) { return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) }
    function rad(k) { return ui.r(k) }

    readonly property string mode: kind !== "enum" ? ""
        : (control !== "" ? control : (options.length <= 5 ? "seg" : "chips"))
    readonly property bool boolValue: current === true || current === "true"
    readonly property bool atDefault: kind === "palette" || kind === "multi"
        ? JSON.stringify(current) === JSON.stringify(defaultValue) : same(current, defaultValue)
    readonly property var picks: kind === "multi" && Array.isArray(current) ? current : []
    function toggleMulti(opt) {
        var list = root.picks.slice(), i = list.indexOf(opt)
        if (i >= 0) { if (list.length > 1) list.splice(i, 1) } else list.push(opt)
        root.commit(list)
    }
    property var targets: []          // palette: [{ key, label }]
    property int target: 0
    readonly property string targetKey: targets.length > 0 ? targets[Math.min(target, targets.length - 1)].key : ""
    function colorOf(k) { return current && typeof current[k] === "string" ? current[k] : "#000000" }
    readonly property real span: Math.max(1e-9, max - min)
    readonly property real frac: Math.max(0, Math.min(1, (num(current) - min) / span))
    readonly property real defFrac: Math.max(0, Math.min(1, (num(defaultValue) - min) / span))

    implicitWidth: 400
    implicitHeight: col.implicitHeight
    opacity: (dimmed || locked) ? 0.4 : 1.0
    enabled: !locked
    Behavior on opacity { enabled: ui.animations; NumberAnimation { duration: 140 } }

    ColumnLayout {
        id: col
        anchors.left: parent.left
        anchors.right: parent.right
        spacing: ui.px(10)

        RowLayout {
            Layout.fillWidth: true
            spacing: ui.px(10)

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Txt {
                    ui: root.ui
                    Layout.fillWidth: true
                    text: root.label
                    font.pixelSize: ui.fs(13)
                    font.weight: Font.DemiBold
                }
                Txt {
                    ui: root.ui
                    Layout.fillWidth: true
                    visible: root.fullHint !== ""
                    text: root.fullHint
                    font.pixelSize: ui.fs(10)
                    opacity: 0.55
                    wrapMode: Text.Wrap
                }
            }

            // - value +
            RowLayout {
                visible: root.kind === "int"
                spacing: ui.px(6)
                Btn { ui: root.ui; text: "\u2212"; implicitWidth: ui.px(28); implicitHeight: ui.px(28); onClicked: root.nudge(-1) }
                Txt {
                    ui: root.ui
                    Layout.minimumWidth: ui.px(38)
                    horizontalAlignment: Text.AlignHCenter
                    text: root.show(root.current)
                    font.pixelSize: ui.fs(12)
                    font.weight: Font.DemiBold
                }
                Btn { ui: root.ui; text: "+"; implicitWidth: ui.px(28); implicitHeight: ui.px(28); onClicked: root.nudge(1) }
            }

            // reset arrow, only when changed
            Rectangle {
                visible: !root.atDefault
                implicitWidth: ui.px(24); implicitHeight: ui.px(24)
                radius: root.rad(0.5)
                color: ui.tint(resetArea.containsMouse ? 0.18 : 0.08)
                Txt { ui: root.ui; anchors.centerIn: parent; text: "\u21BA"; font.pixelSize: ui.fs(12) }
                MouseArea {
                    id: resetArea
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.kind === "palette" ? root.edited({ reset: true }) : root.commit(root.defaultValue)
                }
            }

            // switch
            Sw {
                Layout.alignment: Qt.AlignVCenter
                visible: root.kind === "bool"
                k: ui.densityF
                animate: ui.animations
                ink: ui.fg; accent: ui.accent; knob: ui.accentText
                on: root.boolValue
                onFlipped: root.commit(!root.boolValue)
            }
        }

        // tiles
        GridLayout {
            Layout.fillWidth: true
            visible: root.mode === "tiles"
            // even rows for short lists, five across for long ones
            columns: {
                var n = root.options.length
                if (n <= 5) return Math.max(1, n)
                if (n % 5 === 0) return 5
                if (n <= 12 && n % 4 === 0) return 4
                if (n <= 9 && n % 3 === 0) return 3
                return 5
            }
            columnSpacing: ui.px(10)
            rowSpacing: ui.px(10)

            Repeater {
                model: root.mode === "tiles" ? root.options : []
                delegate: Rectangle {
                    id: tile
                    readonly property bool on: root.same(root.current, modelData)
                    Layout.fillWidth: true
                    Layout.preferredWidth: 1
                    Layout.preferredHeight: ui.px(84)
                    radius: root.rad(1.4)
                    color: on ? ui.accentTint(0.16) : ui.tint(tArea.containsMouse ? 0.09 : 0.04)
                    border.width: on ? 1.5 : 1
                    border.color: on ? ui.accent : ui.tint(0.08)
                    Behavior on color { enabled: ui.animations; ColorAnimation { duration: 100 } }

                    TileArt {
                        ui: root.ui
                        svc: root.svc
                        context: root.context
                        key: root.settingKey
                        opt: Util.toText(modelData)
                        on: tile.on
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: ui.px(12)
                    }
                    Txt {
                        ui: root.ui
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        anchors.bottomMargin: ui.px(9)
                        width: parent.width - ui.px(12)
                        horizontalAlignment: Text.AlignHCenter
                        elide: Text.ElideRight
                        text: root.labelFor(modelData)
                        font.pixelSize: ui.fs(10)
                        font.weight: tile.on ? Font.DemiBold : Font.Normal
                        opacity: tile.on ? 1.0 : 0.75
                    }
                    MouseArea {
                        id: tArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.commit(modelData)
                    }
                }
            }
        }

        // color modes (a tiny bar in each)
        GridLayout {
            Layout.fillWidth: true
            visible: root.mode === "scheme"
            columns: Math.max(1, Math.min(5, root.options.length))
            columnSpacing: ui.px(8)
            rowSpacing: ui.px(8)

            Repeater {
                model: root.mode === "scheme" ? root.options : []
                delegate: Rectangle {
                    id: stile
                    readonly property string opt: Util.toText(modelData)
                    readonly property bool on: root.same(root.current, modelData)
                    readonly property var sc: root.ui.schemeColors(modelData)
                    Layout.fillWidth: true
                    Layout.preferredWidth: 1
                    Layout.preferredHeight: ui.px(76)
                    radius: root.rad(1.4)
                    color: on ? ui.accentTint(0.16) : ui.tint(scArea.containsMouse ? 0.09 : 0.04)
                    border.width: on ? 1.5 : 1
                    border.color: on ? ui.accent : ui.tint(0.08)
                    Behavior on color { enabled: ui.animations; ColorAnimation { duration: 100 } }

                    Item {   // a tiny bar in that scheme: three islands on a desktop
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: ui.px(9)
                        width: parent.width - ui.px(18)
                        height: ui.px(32)
                        Rectangle { anchors.fill: parent; radius: 4; color: ui.tint(0.06) }
                        Repeater {
                            model: [[0.06, 0.26], [0.38, 0.24], [0.70, 0.24]]
                            delegate: Rectangle {
                                x: parent.width * modelData[0]
                                y: 4
                                width: parent.width * modelData[1]
                                height: 12
                                radius: 6
                                color: stile.sc.bg
                                border.width: 1
                                border.color: Qt.rgba(stile.sc.fg.r, stile.sc.fg.g, stile.sc.fg.b, 0.2)
                                Rectangle {
                                    anchors.centerIn: parent
                                    width: index === 1 && !stile.sc.acs ? parent.width * 0.5 : 5
                                    height: index === 1 && !stile.sc.acs ? 2 : 5
                                    radius: 2
                                    color: stile.sc.acs ? stile.sc.acs[index]
                                         : (index === 1 ? Qt.rgba(stile.sc.fg.r, stile.sc.fg.g, stile.sc.fg.b, 0.7) : stile.sc.ac)
                                }
                            }
                        }
                    }
                    Txt {
                        ui: root.ui
                        anchors.horizontalCenter: parent.horizontalCenter
                        anchors.bottom: parent.bottom
                        anchors.bottomMargin: ui.px(7)
                        width: parent.width - ui.px(8)
                        horizontalAlignment: Text.AlignHCenter
                        elide: Text.ElideRight
                        text: root.labelFor(modelData)
                        font.pixelSize: ui.fs(10)
                        font.weight: stile.on ? Font.DemiBold : Font.Normal
                        opacity: stile.on ? 1.0 : 0.75
                    }
                    MouseArea {
                        id: scArea
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.commit(modelData)
                    }
                }
            }
        }

        // palette: pick bg / text / accent, then swatch or hex
        ColumnLayout {
            Layout.fillWidth: true
            visible: root.kind === "palette"
            spacing: ui.px(10)

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: ui.px(34)
                radius: root.rad(1.4)
                color: ui.tint(0.05)
                border.width: 1
                border.color: ui.tint(0.08)
                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 3
                    spacing: 2
                    Repeater {
                        model: root.kind === "palette" ? root.targets : []
                        delegate: Rectangle {
                            id: tg
                            readonly property bool on: index === root.target
                            Layout.fillWidth: true
                            Layout.preferredWidth: 1
                            Layout.fillHeight: true
                            radius: root.rad(1.1)
                            color: on ? ui.accent : (tgArea.containsMouse ? ui.tint(0.08) : "transparent")
                            Row {
                                anchors.centerIn: parent
                                spacing: ui.px(6)
                                Rectangle {
                                    anchors.verticalCenter: parent.verticalCenter
                                    width: ui.px(11); height: width; radius: width / 2
                                    color: root.colorOf(modelData.key)
                                    border.width: 1
                                    border.color: tg.on ? ui.accentText : ui.tint(0.35)
                                }
                                Txt {
                                    ui: root.ui
                                    text: modelData.label
                                    color: tg.on ? ui.accentText : ui.fg
                                    font.pixelSize: ui.fs(11)
                                    font.weight: tg.on ? Font.DemiBold : Font.Normal
                                }
                            }
                            MouseArea {
                                id: tgArea
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.target = index
                            }
                        }
                    }
                }
            }

            GridLayout {
                Layout.fillWidth: true
                columns: 8
                columnSpacing: ui.px(8)
                rowSpacing: ui.px(8)
                Repeater {
                    model: root.kind === "palette" ? root.presets : []
                    delegate: Rectangle {
                        readonly property bool on: root.colorOf(root.targetKey).toLowerCase() === Util.toText(modelData).toLowerCase()
                        Layout.alignment: Qt.AlignHCenter
                        implicitWidth: ui.px(24); implicitHeight: implicitWidth
                        radius: width / 2
                        color: modelData
                        border.width: on ? 2 : 1
                        border.color: on ? ui.accent : ui.tint(0.25)
                        scale: swArea.containsMouse ? 1.12 : 1.0
                        Behavior on scale { enabled: ui.animations; NumberAnimation { duration: 90 } }
                        MouseArea {
                            id: swArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.edited({ key: root.targetKey, value: Util.toText(modelData).toLowerCase() })
                        }
                    }
                }
            }

            RowLayout {
                spacing: ui.px(8)
                Rectangle {
                    implicitWidth: ui.px(28); implicitHeight: implicitWidth
                    radius: root.rad(1)
                    color: root.colorOf(root.targetKey)
                    border.width: 1
                    border.color: ui.tint(0.25)
                }
                Rectangle {
                    implicitWidth: ui.px(120)
                    implicitHeight: ui.px(28)
                    radius: root.rad(1)
                    color: ui.tint(0.05)
                    border.width: 1
                    border.color: hexBox.activeFocus ? ui.tint(0.28) : ui.tint(0.08)
                    TextBox {
                        id: hexBox
                        ui: root.ui
                        anchors.fill: parent
                        anchors.leftMargin: ui.px(9)
                        anchors.rightMargin: ui.px(9)
                        maximumLength: 7
                        text: root.colorOf(root.targetKey)
                        onEditingFinished: {
                            if (root.validHex(text) && text.toLowerCase() !== root.colorOf(root.targetKey).toLowerCase())
                                root.edited({ key: root.targetKey, value: text.toLowerCase() })
                            else text = root.colorOf(root.targetKey)
                        }
                        Keys.onEscapePressed: { text = root.colorOf(root.targetKey); focus = false }
                        Connections {
                            target: root
                            function onTargetKeyChanged() { hexBox.text = root.colorOf(root.targetKey) }
                            function onCurrentChanged() { hexBox.text = root.colorOf(root.targetKey) }
                        }
                    }
                }
                Txt { ui: root.ui; text: "hex"; font.pixelSize: ui.fs(10); opacity: 0.45 }
            }
        }

        // segmented
        Rectangle {
            Layout.fillWidth: true
            visible: root.mode === "seg"
            implicitHeight: ui.px(38)
            radius: root.rad(1.4)
            color: ui.tint(0.05)
            border.width: 1
            border.color: ui.tint(0.08)

            RowLayout {
                anchors.fill: parent
                anchors.margins: 3
                spacing: 2

                Repeater {
                    model: root.mode === "seg" ? root.options : []
                    delegate: Rectangle {
                        readonly property bool on: root.same(root.current, modelData)
                        Layout.fillWidth: true
                        Layout.preferredWidth: 1
                        Layout.fillHeight: true
                        radius: root.rad(1.1)
                        color: on ? ui.accent : (sArea.containsMouse ? ui.tint(0.08) : "transparent")
                        Behavior on color { enabled: ui.animations; ColorAnimation { duration: 90 } }
                        Txt {
                            ui: root.ui
                            anchors.centerIn: parent
                            width: parent.width - ui.px(8)
                            horizontalAlignment: Text.AlignHCenter
                            elide: Text.ElideRight
                            text: root.labelFor(modelData)
                            color: parent.on ? ui.accentText : ui.fg
                            font.pixelSize: ui.fs(11)
                            font.weight: parent.on ? Font.DemiBold : Font.Normal
                        }
                        MouseArea {
                            id: sArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.commit(modelData)
                        }
                    }
                }
            }
        }

        // chips
        Flow {
            Layout.fillWidth: true
            visible: root.mode === "chips"
            spacing: ui.px(6)
            Repeater {
                model: root.mode === "chips" ? root.options : []
                delegate: Chip {
                    ui: root.ui
                    label: root.labelFor(modelData)
                    on: root.same(root.current, modelData)
                    onClicked: root.commit(modelData)
                }
            }
        }

        // several picks, numbered in the order they show
        Flow {
            Layout.fillWidth: true
            visible: root.kind === "multi"
            spacing: ui.px(6)
            Repeater {
                model: root.kind === "multi" ? root.options : []
                delegate: Chip {
                    ui: root.ui
                    readonly property int at: root.picks.indexOf(modelData)
                    label: root.labelFor(modelData) + (at >= 0 ? "  " + (at + 1) : "")
                    on: at >= 0
                    onClicked: root.toggleMulti(modelData)
                }
            }
        }

        // a screen: the main one, all of them, or one by name
        Flow {
            Layout.fillWidth: true
            visible: root.kind === "screen"
            spacing: ui.px(6)
            Repeater {
                model: {
                    if (root.kind !== "screen") return []
                    var main = root.svc ? root.svc.mainName : ""
                    var out = [{ v: "", l: root.emptyLabel + (main !== "" && root.allowAll ? " (" + main + ")" : "") }]
                    if (root.allowAll) out.push({ v: "*", l: "Every screen" })
                    var list = root.svc ? root.svc.screenList : []
                    var names = []
                    for (var i = 0; i < list.length; i++) if (list[i].name) { names.push(list[i].name); out.push({ v: list[i].name, l: list[i].label }) }
                    var cur = root.str(root.current)
                    if (cur !== "" && cur !== "*" && names.indexOf(cur) === -1) out.push({ v: cur, l: cur + " (not connected)" })
                    return out
                }
                delegate: Chip {
                    ui: root.ui
                    label: modelData.l
                    on: root.str(root.current) === modelData.v
                    onClicked: root.commit(modelData.v)
                }
            }
        }

        // a font: the ones that come along, each in itself, and a search for the rest
        ColumnLayout {
            Layout.fillWidth: true
            visible: root.kind === "font"
            spacing: ui.px(8)
            Flow {
                Layout.fillWidth: true
                spacing: ui.px(6)
                Repeater {
                    model: {
                        if (root.kind !== "font") return []
                        var out = root.options.slice()
                        var cur = root.str(root.current)
                        if (out.indexOf(cur) === -1) out.push(cur)
                        return out
                    }
                    delegate: Rectangle {
                        readonly property bool on: root.same(root.current, modelData)
                        implicitWidth: fname.implicitWidth + ui.px(18)
                        implicitHeight: ui.px(30)
                        radius: root.rad(1.5)
                        color: on ? ui.accentTint(0.22) : ui.tint(fArea.containsMouse ? 0.12 : 0.06)
                        border.width: 1
                        border.color: on ? ui.accent : ui.tint(0.10)
                        Text {
                            id: fname
                            anchors.centerIn: parent
                            textFormat: Text.PlainText
                            text: typeof root.labels[modelData] === "string" ? root.labels[modelData] : modelData
                            font.family: modelData === "" ? ui.fontName : modelData
                            font.pixelSize: ui.fs(13)
                            color: parent.on ? ui.onText(ui.accent) : ui.fg
                        }
                        MouseArea { id: fArea; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.commit(modelData) }
                    }
                }
            }
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: ui.px(30)
                radius: root.rad(1.4)
                color: ui.tint(0.05)
                border.width: 1
                border.color: fontSearch.activeFocus ? ui.tint(0.28) : ui.tint(0.08)
                Txt {
                    ui: root.ui
                    anchors.left: parent.left
                    anchors.leftMargin: ui.px(10)
                    anchors.verticalCenter: parent.verticalCenter
                    visible: fontSearch.text === "" && !fontSearch.activeFocus
                    text: "Search the fonts on your computer"
                    font.pixelSize: ui.fs(11)
                    opacity: 0.4
                }
                TextBox {
                    id: fontSearch
                    ui: root.ui
                    anchors.fill: parent
                    anchors.leftMargin: ui.px(10)
                    anchors.rightMargin: ui.px(10)
                    maximumLength: 40
                    onActiveFocusChanged: if (activeFocus && root.svc) root.svc.loadSystemFonts()
                }
            }
            Flow {
                Layout.fillWidth: true
                visible: fontSearch.text.trim() !== ""
                spacing: ui.px(6)
                Repeater {
                    model: {
                        var q = fontSearch.text.trim().toLowerCase()
                        if (q === "" || !root.svc) return []
                        var out = [], all = root.svc.systemFonts
                        for (var i = 0; i < all.length && out.length < 24; i++) if (all[i].toLowerCase().indexOf(q) !== -1) out.push(all[i])
                        return out
                    }
                    delegate: Rectangle {
                        readonly property bool on: root.same(root.current, modelData)
                        implicitWidth: sname.implicitWidth + ui.px(18)
                        implicitHeight: ui.px(28)
                        radius: root.rad(1.5)
                        color: on ? ui.accentTint(0.22) : ui.tint(sArea2.containsMouse ? 0.12 : 0.06)
                        border.width: 1
                        border.color: on ? ui.accent : ui.tint(0.10)
                        Text { id: sname; anchors.centerIn: parent; textFormat: Text.PlainText; text: modelData; font.family: modelData; font.pixelSize: ui.fs(12); color: ui.fg }
                        MouseArea { id: sArea2; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.commit(modelData) }
                    }
                }
            }
        }

        // slider
        ColumnLayout {
            Layout.fillWidth: true
            visible: root.kind === "int"
            spacing: ui.px(2)

            Item {
                id: track
                Layout.fillWidth: true
                implicitHeight: ui.px(24)

                Rectangle {
                    anchors.verticalCenter: parent.verticalCenter
                    width: parent.width; height: 6; radius: 3
                    color: ui.tint(0.12)
                }
                Rectangle {
                    anchors.verticalCenter: parent.verticalCenter
                    width: parent.width * root.frac; height: 6; radius: 3
                    color: ui.accent
                }
                Rectangle {   // notch at the default
                    anchors.verticalCenter: parent.verticalCenter
                    x: parent.width * root.defFrac - 1
                    width: 2; height: 12
                    color: ui.tint(0.45)
                }
                Rectangle {
                    anchors.verticalCenter: parent.verticalCenter
                    x: Math.max(0, Math.min(parent.width - width, parent.width * root.frac - width / 2))
                    width: ui.px(16); height: width; radius: width / 2
                    color: ui.accent
                    border.width: 2
                    border.color: ui.surface
                }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    function apply(mx) {
                        var f = Math.max(0, Math.min(1, mx / width))
                        var raw = root.min + f * root.span
                        var snapped = root.min + Math.round((raw - root.min) / root.step) * root.step
                        snapped = Math.max(root.min, Math.min(root.max, snapped))
                        if (snapped !== root.num(root.current)) root.commit(snapped)
                    }
                    onPressed: function(m) { apply(m.x) }
                    onPositionChanged: function(m) { if (pressed) apply(m.x) }
                }
            }
            RowLayout {
                Layout.fillWidth: true
                Txt { ui: root.ui; text: root.show(root.min); font.pixelSize: ui.fs(9); opacity: 0.5 }
                Item { Layout.fillWidth: true }
                Txt { ui: root.ui; text: root.show(root.max); font.pixelSize: ui.fs(9); opacity: 0.5 }
            }
        }

        // text field
        Rectangle {
            Layout.fillWidth: true
            visible: root.kind === "string" || root.kind === "color"
            implicitHeight: ui.px(34)
            radius: root.rad(1.4)
            color: ui.tint(0.05)
            border.width: 1
            border.color: field.activeFocus ? ui.tint(0.28) : ui.tint(0.08)
            clip: true

            TextBox {
                id: field
                ui: root.ui
                anchors.fill: parent
                anchors.leftMargin: ui.px(12)
                anchors.rightMargin: ui.px(12)
                text: root.str(root.current)
                maximumLength: root.maxLength
                onEditingFinished: {
                    if (root.kind === "color" && !root.validHex(text)) { text = root.str(root.current); return }
                    if (text !== root.str(root.current)) root.commit(text)
                }
                Keys.onEscapePressed: { text = root.str(root.current); focus = false }
                Connections {
                    target: root
                    function onCurrentChanged() { field.text = root.str(root.current) }
                }
            }
        }

        // presets
        Flow {
            Layout.fillWidth: true
            visible: root.kind === "string" && root.presets.length > 0
            spacing: ui.px(6)
            Repeater {
                model: root.kind === "string" ? root.presets : []
                delegate: Chip {
                    ui: root.ui
                    label: Util.toText(modelData).trim() === "" ? "(none)" : Util.toText(modelData)
                    on: root.same(root.current, modelData)
                    onClicked: root.commit(modelData)
                }
            }
        }

        // swatches
        Flow {
            Layout.fillWidth: true
            visible: root.kind === "color"
            spacing: ui.px(10)
            Repeater {
                model: root.kind === "color" ? root.presets : []
                delegate: Rectangle {
                    readonly property bool on: root.same(root.current, modelData)
                    width: ui.px(28); height: width; radius: width / 2
                    color: modelData
                    border.width: on ? 2 : 1
                    border.color: on ? ui.fg : ui.tint(0.25)
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.commit(modelData)
                    }
                }
            }
        }
    }
}
