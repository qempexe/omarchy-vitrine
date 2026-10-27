import QtQuick
import Quickshell.Hyprland

// Is the screen busy enough to hide the widgets? Follows Hyprland, which says when
// windows open, close, move or go fullscreen; nothing is polled.
//   mode: "always" (never hide) | "empty" (hide while windows are open) | "nofull" (hide under fullscreen)
Item {
    id: root

    visible: false

    property var screen: null
    property string mode: "always"

    readonly property var monitor: {
        if (root.mode === "always" || !root.screen) return null
        try { return Hyprland.monitorFor(root.screen) } catch (e) { return null }
    }
    readonly property var workspace: root.monitor ? root.monitor.activeWorkspace : null

    readonly property bool hide: {
        const ws = root.workspace
        if (!ws) return false
        try {
            if (root.mode === "nofull") return ws.hasFullscreen === true
            if (root.mode === "empty") return ws.toplevels && ws.toplevels.values ? ws.toplevels.values.length > 0 : false
        } catch (e) { }
        return false
    }

    // the workspace lists don't follow fullscreen by themselves
    Connections {
        target: root.mode === "always" ? null : Hyprland
        ignoreUnknownSignals: true
        function onRawEvent(event) {
            const name = event ? "" + event.name : ""
            if (name === "fullscreen") try { Hyprland.refreshWorkspaces() } catch (e) { }
        }
    }
}
