import QtQuick
import QtQuick.Layouts
import "../controls"
import "../js/Kinds.js" as Kinds
import "../js/Util.js" as Util

// The Widgets tab: what is on the desktop, a way to add more, and the settings of
// the one you pick. Every widget keeps its own settings; the other tabs set how
// all of them look.
ColumnLayout {
    id: root

    property var svc: null
    readonly property var ui: svc ? svc.ui : null
    readonly property var widgets: svc ? svc.cfg.widgets : []
    readonly property var picked: svc ? svc.widgetById(svc.selected) : null
    readonly property var pickedKind: picked ? Kinds.kindOf(picked.kind) : null
    spacing: ui.px(12)

    // pick the first one when nothing is picked
    onWidgetsChanged: if (svc && !picked && widgets.length > 0) svc.selected = widgets[0].id
    Component.onCompleted: if (svc && !picked && widgets.length > 0) svc.selected = widgets[0].id

    function where(w) {
        let s = w.screen === "" ? "Main screen" + (svc && svc.screenList.length > 1 ? " (" + svc.mainName + ")" : "")
              : (w.screen === "*" ? "Every screen" : w.screen)
        if (svc && svc.lost(w)) s += svc.cfg.lostScreen === "main" ? " (unplugged, on the main screen for now)" : " (unplugged, hidden for now)"
        return s + " · " + Math.round(w.x / 10) + "% across, " + Math.round(w.y / 10) + "% down"
    }

    // a row is greyed out unless the widget's other settings fit (same rules as the tabs)
    function fails(w, c) {
        if (c.any) { for (let j = 0; j < c.any.length; j++) if (!fails(w, c.any[j])) return false; return true }
        const v = Util.toText(w[c.key])
        if (c.is && c.is.indexOf(v) < 0) return true
        if (c.not && c.not.indexOf(v) >= 0) return true
        return false
    }
    function dimmed(w, item) {
        if (item.key === "seconds" && w.kind === "clock") {
            const st = Kinds.styleOf(w)
            if (st && st.seconds === false) return true
        }
        if (!item.when) return false
        for (let i = 0; i < item.when.length; i++) if (fails(w, item.when[i])) return true
        return false
    }

    // ---- adding, arranging ------------------------------------------------------------

    RowLayout {
        Layout.fillWidth: true
        spacing: ui.px(8)
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 3
            Txt { ui: root.ui; text: "On your desktop"; font.pixelSize: ui.fs(13); font.weight: Font.DemiBold }
            Txt {
                ui: root.ui
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                text: root.widgets.length === 0 ? "Nothing yet. Add a widget below."
                    : root.widgets.length + " of " + Kinds.MAX_WIDGETS + ". Pick one to change it. Arrange lets you drag them on the desktop itself."
                font.pixelSize: ui.fs(10)
                opacity: 0.55
            }
        }
        Btn { ui: root.ui; kind: "primary"; text: "Arrange on the desktop"; onClicked: { root.ui.closeRequested(); root.svc.arrange(true) } }
    }

    Flow {
        Layout.fillWidth: true
        spacing: ui.px(6)
        Txt { ui: root.ui; text: "Add"; font.pixelSize: ui.fs(11); opacity: 0.6; height: ui.px(24); verticalAlignment: Text.AlignVCenter; rightPadding: ui.px(4) }
        Repeater {
            model: Kinds.list
            delegate: Btn {
                ui: root.ui
                text: "+ " + modelData.label
                enabled: root.widgets.length < Kinds.MAX_WIDGETS
                onClicked: root.svc.addWidget(modelData.key)
            }
        }
    }

    // ---- the widgets ------------------------------------------------------------------

    Repeater {
        model: root.widgets
        delegate: Rectangle {
            id: row
            required property var modelData
            required property int index
            readonly property bool on: root.svc.selected === modelData.id
            readonly property var kind: Kinds.kindOf(modelData.kind)
            Layout.fillWidth: true
            implicitHeight: ui.px(56)
            radius: ui.r(1.4)
            color: on ? ui.accentTint(0.14) : ui.tint(rowArea.containsMouse ? 0.08 : 0.04)
            border.width: on ? 1.5 : 1
            border.color: on ? ui.accent : ui.tint(0.08)

            MouseArea { id: rowArea; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor; onClicked: root.svc.selected = row.modelData.id }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: ui.px(8)
                anchors.rightMargin: ui.px(8)
                spacing: ui.px(10)
                TileArt {
                    ui: root.ui
                    svc: root.svc
                    key: "style"
                    opt: row.modelData.style
                    context: row.modelData
                    on: row.on
                    Layout.alignment: Qt.AlignVCenter
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Txt {
                        ui: root.ui
                        Layout.fillWidth: true
                        elide: Text.ElideRight
                        text: row.kind.label + " · " + Kinds.styleOf(row.modelData).label + (row.modelData.caption ? " · " + row.modelData.caption : "")
                        font.pixelSize: ui.fs(12)
                        font.weight: Font.DemiBold
                    }
                    Txt { ui: root.ui; Layout.fillWidth: true; elide: Text.ElideRight; text: root.where(row.modelData); font.pixelSize: ui.fs(10); opacity: 0.55 }
                }
                Btn { ui: root.ui; text: "↑"; implicitWidth: ui.px(26); enabled: row.index < root.widgets.length - 1; onClicked: root.svc.moveWidget(row.modelData.id, 1) }
                Btn { ui: root.ui; text: "↓"; implicitWidth: ui.px(26); enabled: row.index > 0; onClicked: root.svc.moveWidget(row.modelData.id, -1) }
                Btn { ui: root.ui; text: "Duplicate"; enabled: root.widgets.length < Kinds.MAX_WIDGETS; onClicked: root.svc.duplicateWidget(row.modelData.id) }
                Btn { ui: root.ui; text: "×"; kind: "danger"; implicitWidth: ui.px(26); onClicked: root.svc.removeWidget(row.modelData.id) }
            }
        }
    }

    // ---- the settings of the picked one ------------------------------------------------

    Txt {
        visible: root.picked !== null
        Layout.fillWidth: true
        Layout.topMargin: ui.px(12)
        ui: root.ui
        text: root.pickedKind ? (root.pickedKind.label + " settings").toUpperCase() : ""
        font.pixelSize: ui.fs(10)
        font.weight: Font.DemiBold
        font.letterSpacing: 1.5
        color: ui.accent
    }

    Repeater {
        model: root.pickedKind ? root.pickedKind.items : []
        delegate: ColumnLayout {
            id: box
            required property var modelData
            required property int index
            Layout.fillWidth: true
            spacing: 0
            readonly property var prevItem: index > 0 ? root.pickedKind.items[index - 1] : null
            readonly property bool newSection: !prevItem || prevItem.section !== modelData.section

            Txt {
                visible: box.newSection && box.index > 0
                Layout.fillWidth: true
                Layout.topMargin: ui.px(14)
                ui: root.ui
                text: (box.modelData.section || "").toUpperCase()
                font.pixelSize: ui.fs(9)
                font.weight: Font.DemiBold
                font.letterSpacing: 1.4
                opacity: 0.55
            }
            Rectangle { visible: !box.newSection; Layout.fillWidth: true; implicitHeight: 1; color: ui.tint(0.07) }
            SettingRow {
                Layout.fillWidth: true
                Layout.topMargin: ui.px(12)
                Layout.bottomMargin: ui.px(12)
                ui: root.ui
                svc: root.svc
                context: root.picked
                settingKey: box.modelData.key
                label: box.modelData.label
                hint: box.modelData.hint || ""
                kind: box.modelData.kind
                control: box.modelData.control || ""
                options: box.modelData.options || []
                allowAll: box.modelData.allowAll !== false
                emptyLabel: box.modelData.emptyLabel || "Main screen"
                labels: box.modelData.labels || ({})
                abouts: box.modelData.abouts || ({})
                presets: box.modelData.presets || []
                maxLength: box.modelData.maxLength !== undefined ? box.modelData.maxLength : 2048
                min: box.modelData.min !== undefined ? box.modelData.min : 0
                max: box.modelData.max !== undefined ? box.modelData.max : 100
                step: box.modelData.step !== undefined ? box.modelData.step : 1
                divisor: box.modelData.divisor !== undefined ? box.modelData.divisor : 1
                decimals: box.modelData.decimals !== undefined ? box.modelData.decimals : 0
                defaultValue: box.modelData.fallback
                dimmed: root.picked ? root.dimmed(root.picked, box.modelData) : false
                value: root.picked ? root.picked[box.modelData.key] : box.modelData.fallback
                onEdited: function(v) { if (root.picked) root.svc.updateWidget(root.picked.id, box.modelData.key, v) }
            }
        }
    }
}
