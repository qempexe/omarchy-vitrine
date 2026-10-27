import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import "../controls"

// The About tab: the logo, the name and version, who made it, and where to find more
// plugins by the same author.
Item {
    id: root

    property var ui: null
    property string version: ""
    // the author's plugins, in one place. a fixed address, opened with xdg-open
    readonly property string moreUrl: "https://github.com/qempexe?tab=repositories&q=omarchy"

    // the version, read from the plugin's own manifest
    FileView {
        path: decodeURIComponent(Qt.resolvedUrl("../../manifest.json").toString().replace(/^file:\/\//, ""))
        onLoaded: {
            let v = ""
            try { v = String(JSON.parse(text()).version || "") } catch (e) { v = "" }
            root.version = /^[0-9A-Za-z.+-]{1,32}$/.test(v) ? v : ""
        }
    }

    ColumnLayout {
        anchors.centerIn: parent
        anchors.verticalCenterOffset: -ui.px(16)
        spacing: ui.px(6)

        Image {
            Layout.alignment: Qt.AlignHCenter
            Layout.preferredWidth: ui.px(96)
            Layout.preferredHeight: ui.px(96)
            // the light logo on a dark panel, the dark one on a light panel
            source: Qt.resolvedUrl(root.ui.lightSurface ? "../../assets/logo-dark.png" : "../../assets/logo.png")
            sourceSize.width: 192
            sourceSize.height: 192
            smooth: true
            mipmap: true
        }

        Txt {
            ui: root.ui
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: ui.px(8)
            text: "VITRINE"
            font.pixelSize: ui.fs(19)
            font.weight: Font.DemiBold
            font.letterSpacing: 4
        }

        Txt {
            ui: root.ui
            Layout.alignment: Qt.AlignHCenter
            visible: root.version !== ""
            text: "Version " + root.version
            color: ui.accentInk
            font.pixelSize: ui.fs(11)
            font.letterSpacing: 1.5
        }

        Row {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: ui.px(12)
            Txt { ui: root.ui; text: "made with "; opacity: 0.75; font.pixelSize: ui.fs(12) }
            Text {   // the system font: the panel's font draws the heart as an outline
                textFormat: Text.PlainText
                text: "♥"
                color: ui.accentInk
                font.pixelSize: ui.fs(13)
                anchors.verticalCenter: parent.verticalCenter
            }
            Txt { ui: root.ui; text: " by qempexe"; opacity: 0.75; font.pixelSize: ui.fs(12) }
        }

        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: ui.px(10)
            implicitWidth: moreText.implicitWidth + ui.px(28)
            implicitHeight: ui.px(30)
            radius: ui.r(1.5)
            color: moreArea.containsMouse ? ui.accentTint(0.22) : ui.tint(0.07)
            border.width: 1
            border.color: Qt.rgba(ui.accentInk.r, ui.accentInk.g, ui.accentInk.b, moreArea.containsMouse ? 0.8 : 0.35)
            Behavior on color { enabled: ui.animations; ColorAnimation { duration: 100 } }

            Txt {
                id: moreText
                ui: root.ui
                anchors.centerIn: parent
                text: "Check out my other plugins ↗"
                font.pixelSize: ui.fs(11)
            }
            MouseArea {
                id: moreArea
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: Quickshell.execDetached(["xdg-open", root.moreUrl])
            }
        }
    }
}
