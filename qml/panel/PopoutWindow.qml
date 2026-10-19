import QtQuick
import Quickshell

// the settings as a normal window. title is "Vitrine" so you can add window rules
FloatingWindow {
    id: win

    property var svc: null
    readonly property var ui: svc ? svc.ui : null

    title: "Vitrine"
    visible: false
    color: "transparent"
    implicitWidth: ui ? ui.cfgSafe.windowWidth : 520
    implicitHeight: ui ? ui.cfgSafe.windowHeight : 640

    Loader {
        anchors.fill: parent
        active: win.svc !== null
        sourceComponent: Component { PanelView { svc: win.svc; shown: win.visible; focus: true } }
    }
}
