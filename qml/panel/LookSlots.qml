import QtQuick
import QtQuick.Layouts
import "../controls"
import "../js/Schema.js" as Schema

// "Your looks": twenty places to keep the desktop as it is now and bring it back later.
// Empty places stay out of the way until "Show all" is on
ColumnLayout {
    id: root

    property var svc: null
    readonly property var ui: svc ? svc.ui : null
    property string label: ""
    property string hint: ""
    spacing: ui.px(10)

    readonly property var looks: svc ? svc.cfg.savedLooks : []
    readonly property int used: {
        let n = 0
        for (let i = 0; i < root.looks.length; i++) if (root.looks[i]) n++
        return n
    }
    readonly property int firstFree: {
        for (let i = 0; i < Schema.LOOK_SLOTS; i++) if (!root.looks[i]) return i
        return -1
    }
    property bool showAll: false
    property int justSaved: -1
    Timer { id: savedTimer; interval: 1400; onTriggered: root.justSaved = -1 }

    function describe(look) {
        if (!look) return "Empty"
        const parts = []
        const n = look.widgets ? look.widgets.length : 0
        parts.push(n + (n === 1 ? " widget" : " widgets"))
        // what the cards are, in the same words as the settings
        function named(key, value, skip) {
            if (value === undefined || skip.indexOf(value) !== -1) return
            const it = Schema.itemFor(key)
            if (it && it.labels && it.labels[value]) parts.push(it.labels[value].toLowerCase())
        }
        named("frame", look.frame, [])
        if (look.frame !== "none") {
            named("surface", look.surface, ["filled"])
            named("lines", look.lines, ["solid", "none"])
            named("ornaments", look.ornaments, ["none"])
        }
        return parts.join(" \u00b7 ")
    }

    Txt { ui: root.ui; text: root.label; font.pixelSize: ui.fs(12); font.weight: Font.DemiBold }
    Txt {
        ui: root.ui
        Layout.fillWidth: true
        visible: root.hint !== ""
        text: root.hint
        wrapMode: Text.WordWrap
        font.pixelSize: ui.fs(10)
        opacity: 0.55
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: ui.px(8)
        Btn {
            ui: root.ui
            kind: "primary"
            enabled: root.firstFree >= 0
            text: root.firstFree >= 0 ? "Save in a free place" : "All places taken"
            onClicked: {
                const i = root.svc.saveFreeLook()
                if (i >= 0) { root.justSaved = i; savedTimer.restart() }
            }
        }
        Txt {
            ui: root.ui
            Layout.fillWidth: true
            text: root.used + " of " + Schema.LOOK_SLOTS + " used"
            font.pixelSize: ui.fs(10)
            opacity: 0.55
        }
        Chip { ui: root.ui; label: "Show all"; on: root.showAll; onClicked: root.showAll = !root.showAll }
    }

    GridLayout {
        Layout.fillWidth: true
        columns: 2
        columnSpacing: ui.px(8)
        rowSpacing: ui.px(8)

        Repeater {
            model: Schema.LOOK_SLOTS
            delegate: Rectangle {
                id: card
                required property int index
                readonly property var look: root.looks[index] || null
                // saved ones, the one just saved, and everything when Show all is on
                visible: root.showAll || card.look !== null || root.justSaved === index
                Layout.fillWidth: true
                Layout.preferredWidth: 1
                implicitHeight: col.implicitHeight + ui.px(16)
                radius: ui.r(1.4)
                color: ui.tint(0.04)
                border.width: 1
                border.color: root.justSaved === index ? ui.accentInk : ui.tint(0.08)

                ColumnLayout {
                    id: col
                    anchors.fill: parent
                    anchors.margins: ui.px(8)
                    spacing: ui.px(6)
                    RowLayout {
                        Layout.fillWidth: true
                        Txt { ui: root.ui; text: "Look " + (card.index + 1); font.pixelSize: ui.fs(11); font.weight: Font.DemiBold }
                        Txt {
                            ui: root.ui
                            Layout.fillWidth: true
                            horizontalAlignment: Text.AlignRight
                            elide: Text.ElideRight
                            text: root.justSaved === card.index ? "Saved" : root.describe(card.look)
                            font.pixelSize: ui.fs(10)
                            opacity: card.look ? 0.7 : 0.4
                        }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: ui.px(6)
                        Btn {
                            ui: root.ui
                            Layout.fillWidth: true
                            text: card.look ? "Save over" : "Save"
                            onClicked: { root.svc.saveLook(card.index); root.justSaved = card.index; savedTimer.restart() }
                        }
                        Btn {
                            ui: root.ui
                            Layout.fillWidth: true
                            kind: card.look ? "primary" : "normal"
                            enabled: card.look !== null
                            text: "Use"
                            onClicked: root.svc.loadLook(card.index)
                        }
                        Btn {
                            ui: root.ui
                            enabled: card.look !== null
                            text: "×"
                            implicitWidth: ui.px(24)
                            onClicked: root.svc.clearLook(card.index)
                        }
                    }
                }
            }
        }
    }
}
