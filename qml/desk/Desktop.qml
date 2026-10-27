import QtQuick
import Quickshell
import Quickshell.Wayland

// The widgets on the desktop: one window per screen on the bottom layer, behind every
// window and in front of the wallpaper. It takes no clicks (an empty input region),
// so the desktop under it works as before.
Item {
    id: root

    visible: false

    property var svc: null
    readonly property var cfg: svc ? svc.cfg : null

    // the ids of the widgets on a screen, in drawing order (the service decides which
    // screen a widget is on, unplugged screens included)
    function idsFor(screen) {
        const out = []
        if (!root.cfg || !screen) return out
        const ws = root.cfg.widgets
        for (let i = 0; i < ws.length; i++) if (root.svc.shows(ws[i], screen.name)) out.push(ws[i].id)
        return out
    }
    // brings a ListModel of { wid } in line with ids, moving rows rather than making
    // them again, so a widget is only built when it is added
    function sync(model, ids) {
        for (let i = 0; i < ids.length; i++) {
            if (i < model.count && model.get(i).wid === ids[i]) continue
            let found = -1
            for (let j = i + 1; j < model.count; j++) if (model.get(j).wid === ids[i]) { found = j; break }
            if (found >= 0) model.move(found, i, 1)
            else model.insert(i, { wid: ids[i] })
        }
        while (model.count > ids.length) model.remove(model.count - 1)
    }

    Variants {
        model: Quickshell.screens

        delegate: Component {
            PanelWindow {
                id: win
                required property var modelData
                readonly property var ids: root.idsFor(modelData)
                onIdsChanged: root.sync(rows, ids)
                Component.onCompleted: root.sync(rows, ids)

                screen: modelData
                visible: root.cfg !== null && root.cfg.enabled && !root.svc.arranging && ids.length > 0
                anchors { top: true; bottom: true; left: true; right: true }
                color: "transparent"
                exclusionMode: ExclusionMode.Ignore
                mask: Region {}
                WlrLayershell.layer: WlrLayer.Bottom
                WlrLayershell.namespace: "vitrine"
                WlrLayershell.keyboardFocus: WlrKeyboardFocus.None

                ListModel { id: rows }

                // hide while windows are open, if asked to
                Busy { id: busy; screen: win.modelData; mode: root.cfg ? root.cfg.visibility : "always" }

                Item {
                    id: stage
                    anchors.fill: parent
                    opacity: busy.hide ? 0 : 1
                    Behavior on opacity { NumberAnimation { duration: root.cfg ? root.cfg.fadeTime : 300; easing.type: Easing.InOutQuad } }

                    Repeater {
                        model: rows
                        delegate: WidgetView {
                            required property string wid
                            svc: root.svc
                            w: root.svc ? root.svc.widgetById(wid) : null
                            index: root.svc ? Math.max(0, root.svc.indexOf(wid)) : 0
                            screenW: stage.width
                            screenH: stage.height
                            screenK: root.svc ? root.svc.scaleFor(stage.height) : 1
                            z: index
                        }
                    }
                }
            }
        }
    }
}
