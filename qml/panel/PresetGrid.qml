import QtQuick
import QtQuick.Layouts
import "../js/Schema.js" as Schema
import "../js/Look.js" as Look
import "../js/Card.js" as Card
import "../js/Kinds.js" as Kinds
import "../controls"

// "Start from a look": a tile per ready made look, each a little desktop with that
// look's widgets where it puts them, drawn on its own cards. One click sets it all.
ColumnLayout {
    id: root

    property var svc: null
    readonly property var ui: svc ? svc.ui : null
    property string label: ""
    property string hint: ""
    spacing: ui.px(10)

    RowLayout {
        Layout.fillWidth: true
        Txt { ui: root.ui; Layout.fillWidth: true; text: root.label; font.pixelSize: ui.fs(12); font.weight: Font.DemiBold }
        Btn {
            ui: root.ui
            visible: root.svc !== null && root.svc.canUndo
            text: "Undo the last look"
            onClicked: root.svc.undoLook()
        }
    }
    Txt {
        ui: root.ui
        Layout.fillWidth: true
        visible: root.hint !== ""
        text: root.hint
        wrapMode: Text.WordWrap
        font.pixelSize: ui.fs(10)
        opacity: 0.55
    }

    GridLayout {
        Layout.fillWidth: true
        columns: 4
        columnSpacing: ui.px(8)
        rowSpacing: ui.px(8)

        Repeater {
            model: Schema.presets
            delegate: Rectangle {
                id: tile
                required property var modelData
                readonly property bool on: root.svc !== null && root.svc.cfg.lastLook === modelData.key
                Layout.fillWidth: true
                Layout.preferredWidth: 1
                Layout.preferredHeight: ui.px(78)
                radius: ui.r(1.4)
                color: on ? ui.accentTint(0.16) : ui.tint(area.containsMouse ? 0.09 : 0.04)
                border.width: on ? 1.5 : 1
                border.color: on ? ui.accentInk : ui.tint(0.08)

                Canvas {
                    id: art
                    anchors.horizontalCenter: parent.horizontalCenter
                    y: ui.px(7)
                    width: 88
                    height: 50
                    readonly property color bgc: root.ui ? root.ui.surface : "black"
                    readonly property color ac: root.ui ? root.ui.accent : "white"
                    readonly property color fg: root.ui ? root.ui.fg : "white"
                    onBgcChanged: requestPaint()
                    onAcChanged: requestPaint()
                    Component.onCompleted: requestPaint()
                    onPaint: {
                        const ctx = getContext("2d")
                        ctx.reset()
                        if (!root.svc) return
                        // the screen
                        ctx.fillStyle = Qt.rgba(fg.r, fg.g, fg.b, 0.06)
                        ctx.fillRect(0, 0, width, height)
                        const cfg = Schema.resolve(tile.modelData.set)
                        const th = root.svc.theme
                        const k = width / 1920
                        for (let i = 0; i < cfg.widgets.length; i++) {
                            const w = cfg.widgets[i]
                            const colors = Look.colorsFor(cfg, th, w, i, w.x / 1000)
                            const box = Look.boxOf(cfg, w)
                            const bw = Math.max(4, box.w * k), bh = Math.max(3, box.h * k)
                            const x = Math.max(0, Math.min(width - bw, w.x / 1000 * width - bw / 2))
                            const y = Math.max(0, Math.min(height - bh, w.y / 1000 * height - bh / 2))
                            if (box.card) {
                                const p = Look.cardParams(cfg, th, colors, bw + 2, bh + 2, 1)
                                p.keep = true; p.ox = x - 1; p.oy = y - 1
                                p.r = Math.max(0, cfg.radius * k)
                                p.lineWidth = p.lineWidth > 0 ? 0.6 : 0
                                p.ornament = "none"
                                Card.paint(ctx, p)
                            }
                            // the ink: a bar the size of what the widget shows
                            const c = box.content
                            ctx.fillStyle = Look.css(colors.ink, 0.85)
                            const lh = Math.max(1, c.h * k * 0.45)
                            ctx.fillRect(x + c.x * k + c.w * k * 0.1, y + c.y * k + (c.h * k - lh) / 2, Math.max(2, c.w * k * 0.8), lh)
                            ctx.fillStyle = Look.css(colors.accent, 0.9)
                            ctx.fillRect(x + c.x * k + c.w * k * 0.1, y + c.y * k + (c.h * k + lh) / 2 + 0.5, Math.max(1, c.w * k * 0.3), Math.max(0.6, lh * 0.25))
                        }
                    }
                }
                Txt {
                    ui: root.ui
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: ui.px(6)
                    text: tile.modelData.label
                    font.pixelSize: ui.fs(10)
                    font.weight: tile.on ? Font.DemiBold : Font.Normal
                    opacity: tile.on ? 1 : 0.75
                }
                MouseArea {
                    id: area
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.svc.applyPreset(tile.modelData.key)
                }
            }
        }
    }
}
