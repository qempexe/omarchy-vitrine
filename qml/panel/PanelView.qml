import QtQuick
import QtQuick.Layouts
import "../controls"

// the whole panel: header, the settings, footer.
// used by both the docked popup and the popped out window
Item {
    id: view

    property var svc: null
    property bool shown: false
    readonly property var ui: svc ? svc.ui : null
    readonly property var cfg: svc ? svc.cfg : null
    clip: true

    // popped out there's no shortcut for esc, so handle it here
    Keys.onEscapePressed: function(e) {
        if (ui.popped) { ui.closeRequested(); e.accepted = true }
        else e.accepted = false
    }


    // background
    Rectangle {
        anchors.fill: parent
        radius: ui.r(3)
        color: ui.panelColor
    }
    Rectangle {   // optional accent wash (Panel tint, 0 by default)
        anchors.fill: parent
        radius: ui.r(3)
        visible: ui.tintPct > 0
        color: ui.accentTint(ui.tintPct / 100)
    }
    Rectangle {   // edge: a plain neutral line, or one color if "Window outline" is on
        anchors.fill: parent
        radius: ui.r(3)
        color: "transparent"
        visible: !ui.frameGradientOn
        border.width: 1
        border.color: ui.frameOn ? ui.frameColor : ui.tint(0.14)
        opacity: ui.frameOn ? 0.8 : 1
    }
    Canvas {      // edge in the theme's window border gradient, at its angle
        id: frameCanvas
        anchors.fill: parent
        visible: ui.frameGradientOn
        opacity: 0.85
        readonly property var stops: ui.borderColors
        readonly property real angle: ui.borderAngle
        readonly property real rad: ui.r(3)
        onStopsChanged: requestPaint()
        onAngleChanged: requestPaint()
        onRadChanged: requestPaint()
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
        onVisibleChanged: if (visible) requestPaint()
        onPaint: {
            const ctx = getContext("2d")
            ctx.reset()
            const n = stops.length
            if (!visible || n < 2 || width < 4 || height < 4) return
            const a = angle * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a)
            const half = (Math.abs(dx) * width + Math.abs(dy) * height) / 2
            const g = ctx.createLinearGradient(width / 2 - dx * half, height / 2 - dy * half, width / 2 + dx * half, height / 2 + dy * half)
            for (let i = 0; i < n; i++) g.addColorStop(i / (n - 1), stops[i])
            const r = Math.max(0, Math.min(rad, width / 2, height / 2)), x = 0.5, y = 0.5, w = width - 1, h = height - 1
            ctx.strokeStyle = g
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(x + r, y)
            ctx.arcTo(x + w, y, x + w, y + h, r)
            ctx.arcTo(x + w, y + h, x, y + h, r)
            ctx.arcTo(x, y + h, x, y, r)
            ctx.arcTo(x, y, x + w, y, r)
            ctx.closePath()
            ctx.stroke()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: ui.px(14)
        spacing: ui.px(12)

        // header
        Rectangle {
            Layout.fillWidth: true
            implicitHeight: headerRow.implicitHeight + ui.px(24)
            radius: ui.r(2.5)
            color: ui.tint(0.05)
            border.width: 1
            border.color: ui.tint(0.08)

            RowLayout {
                id: headerRow
                anchors.fill: parent
                anchors.margins: ui.px(12)
                spacing: ui.px(10)

                Rectangle {
                    Layout.alignment: Qt.AlignVCenter
                    implicitWidth: ui.px(30); implicitHeight: ui.px(30)
                    radius: ui.r(1.5)
                    color: ui.accentTint(0.18)
                    border.width: 1
                    border.color: ui.tint(0.08)
                    Image {   // the logo, light or dark to suit the panel
                        anchors.centerIn: parent
                        width: ui.px(24); height: width
                        source: Qt.resolvedUrl(ui.lightSurface ? "../../assets/logo-dark.png" : "../../assets/logo.png")
                        sourceSize.width: 96
                        sourceSize.height: 96
                        smooth: true
                        mipmap: true
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.minimumWidth: 0
                    Layout.alignment: Qt.AlignVCenter
                    spacing: 2
                    Txt {
                        ui: view.ui
                        Layout.fillWidth: true
                        text: "Vitrine"
                        font.pixelSize: ui.fs(13)
                        font.weight: Font.DemiBold
                        elide: Text.ElideRight
                    }
                    Txt {
                        ui: view.ui
                        Layout.fillWidth: true
                        font.pixelSize: ui.fs(11)
                        opacity: 0.6
                        elide: Text.ElideRight
                        text: !view.cfg ? "Starting…"
                            : !view.cfg.enabled ? "Hidden · your widgets are kept"
                            : view.cfg.widgets.length === 0 ? "No widgets yet · add one in Widgets"
                            : view.cfg.widgets.length + (view.cfg.widgets.length === 1 ? " widget" : " widgets") + " on the desktop"
                    }
                }

                Btn {
                    ui: view.ui
                    Layout.alignment: Qt.AlignVCenter
                    kind: view.cfg && view.cfg.enabled ? "primary" : "normal"
                    text: view.cfg && view.cfg.enabled ? "On" : "Off"
                    onClicked: view.svc.setValue("enabled", !view.cfg.enabled)
                }
                Btn {
                    ui: view.ui
                    Layout.alignment: Qt.AlignVCenter
                    text: "Arrange"
                    onClicked: { ui.closeRequested(); view.svc.arrange(true) }
                }
                Btn {
                    ui: view.ui
                    Layout.alignment: Qt.AlignVCenter
                    kind: settingsView.confirmReset ? "primary" : "normal"
                    text: settingsView.confirmReset ? "Really reset?" : "Reset all"
                    onClicked: settingsView.resetAll()
                }
                Btn {
                    ui: view.ui
                    Layout.alignment: Qt.AlignVCenter
                    text: ui.popped ? "Dock" : "Pop out"
                    onClicked: ui.popped ? ui.dockRequested() : ui.popOutRequested()
                }
                Btn { ui: view.ui; Layout.alignment: Qt.AlignVCenter; text: "×"; implicitWidth: ui.px(24); onClicked: ui.closeRequested() }
            }
        }

        // content
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumHeight: 0
            radius: ui.r(2.5)
            color: ui.tint(0.035)
            border.width: 1
            border.color: ui.tint(0.07)
            clip: true

            SettingsView {
                id: settingsView
                objectName: "settingsView"
                anchors.fill: parent
                anchors.margins: ui.px(10)
                svc: view.svc
            }
        }

        // footer
        RowLayout {
            Layout.fillWidth: true
            spacing: ui.px(8)

            Rectangle {
                implicitWidth: escLabel.implicitWidth + ui.px(12)
                implicitHeight: ui.px(18)
                radius: ui.r(1)
                color: ui.tint(0.08)
                Txt { id: escLabel; ui: view.ui; anchors.centerIn: parent; text: "Esc"; font.pixelSize: ui.fs(10); opacity: 0.75 }
            }
            Txt { ui: view.ui; text: "close"; font.pixelSize: ui.fs(10); opacity: 0.45 }

            Txt {
                ui: view.ui
                Layout.fillWidth: true
                elide: Text.ElideRight
                font.pixelSize: ui.fs(10)
                opacity: 0.45
                text: settingsView.changed === 0 ? "All defaults"
                    : settingsView.changed === 1 ? "1 setting changed" : settingsView.changed + " settings changed"
            }
            Txt { ui: view.ui; text: "Alt+← →  groups  ·  changes show right away"; font.pixelSize: ui.fs(10); opacity: 0.45 }
        }
    }
}
