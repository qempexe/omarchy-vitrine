import QtQuick
import Quickshell
import Quickshell.Wayland
import Quickshell.Hyprland
import "../controls"
import "../js/Kinds.js" as Kinds

// Arrange: the widgets above everything, on a shaded desktop, to drag around.
// Drag to move (onto another screen too), drag the corner to resize, Shift for no
// grid. Arrows nudge the selected one, S sends it to the next screen, Delete removes
// it, D duplicates it, Tab picks the next, Esc is done.
Item {
    id: root

    visible: false

    property var svc: null
    readonly property var cfg: svc ? svc.cfg : null
    readonly property var ui: svc ? svc.ui : null

    // which screen gets the keyboard: the one Hyprland has in focus when Arrange opens
    property string keyScreen: ""
    Component.onCompleted: {
        try { root.keyScreen = Hyprland.focusedMonitor ? Hyprland.focusedMonitor.name : "" } catch (e) { root.keyScreen = "" }
    }

    function idsFor(screen) {
        var out = []
        if (!root.cfg || !screen) return out
        var ws = root.cfg.widgets
        for (var i = 0; i < ws.length; i++) if (root.svc.shows(ws[i], screen.name)) out.push(ws[i].id)
        return out
    }
    readonly property bool manyScreens: root.svc !== null && root.svc.screenList.length > 1
    function sendToNext(id) {
        var next = root.svc.nextScreenOf(id)
        var w = root.svc.widgetById(id)
        if (next !== "" && w && w.screen !== "*") root.svc.moveToScreen(id, next)
    }

    function sync(model, ids) {
        for (var i = 0; i < ids.length; i++) {
            if (i < model.count && model.get(i).wid === ids[i]) continue
            var found = -1
            for (var j = i + 1; j < model.count; j++) if (model.get(j).wid === ids[i]) { found = j; break }
            if (found >= 0) model.move(found, i, 1)
            else model.insert(i, { wid: ids[i] })
        }
        while (model.count > ids.length) model.remove(model.count - 1)
    }

    function nudge(dx, dy) {
        var w = root.svc.widgetById(root.svc.selected)
        if (!w) return
        root.svc.patchWidget(w.id, { x: Math.max(0, Math.min(1000, w.x + dx)), y: Math.max(0, Math.min(1000, w.y + dy)) })
    }
    // the settings open on the bar, under this overlay: so Arrange makes way first
    function openSettings() {
        root.svc.ui.settingsGroup = 1
        root.svc.arrange(false)
        root.svc.ui.tabRequested("settings", false)
    }
    function selectNext() {
        var ws = root.cfg.widgets
        if (ws.length === 0) return
        var i = root.svc.indexOf(root.svc.selected)
        root.svc.selected = ws[(i + 1) % ws.length].id
    }

    Variants {
        model: Quickshell.screens

        delegate: Component {
            PanelWindow {
                id: win
                required property var modelData
                readonly property bool isMain: root.svc !== null && modelData.name === root.svc.mainName
                readonly property bool keys: root.keyScreen === "" || root.svc.screenInfo(root.keyScreen) === null ? isMain : modelData.name === root.keyScreen
                readonly property var ids: root.idsFor(modelData)
                readonly property var info: root.svc ? root.svc.screenInfo(modelData.name) : null
                onIdsChanged: root.sync(rows, ids)
                Component.onCompleted: root.sync(rows, ids)

                screen: modelData
                visible: true
                anchors { top: true; bottom: true; left: true; right: true }
                color: "transparent"
                exclusionMode: ExclusionMode.Ignore
                WlrLayershell.layer: WlrLayer.Overlay
                WlrLayershell.namespace: "vitrine-arrange"
                WlrLayershell.keyboardFocus: keys ? WlrKeyboardFocus.Exclusive : WlrKeyboardFocus.None

                ListModel { id: rows }

                Item {
                    id: stage
                    anchors.fill: parent
                    focus: win.keys

                    Keys.onPressed: function(e) {
                        var big = (e.modifiers & Qt.ShiftModifier) ? 10 : 1
                        if (e.key === Qt.Key_Escape || e.key === Qt.Key_Return || e.key === Qt.Key_Enter) root.svc.arrange(false)
                        else if (e.key === Qt.Key_Delete || e.key === Qt.Key_Backspace) { if (root.svc.selected !== "") root.svc.removeWidget(root.svc.selected) }
                        else if (e.key === Qt.Key_Left) root.nudge(-big, 0)
                        else if (e.key === Qt.Key_Right) root.nudge(big, 0)
                        else if (e.key === Qt.Key_Up) root.nudge(0, -big)
                        else if (e.key === Qt.Key_Down) root.nudge(0, big)
                        else if (e.key === Qt.Key_D) { if (root.svc.selected !== "") root.svc.duplicateWidget(root.svc.selected) }
                        else if (e.key === Qt.Key_Tab) root.selectNext()
                        else if (e.key === Qt.Key_S) { if (root.svc.selected !== "") root.sendToNext(root.svc.selected) }
                        else return
                        e.accepted = true
                    }

                    // the shaded desktop, and the grid when snapping
                    Rectangle {
                        anchors.fill: parent
                        color: Qt.rgba(0, 0, 0, root.cfg ? root.cfg.arrangeDim / 100 : 0.45)
                    }
                    Canvas {
                        anchors.fill: parent
                        visible: root.cfg !== null && root.cfg.snap
                        readonly property int step: root.cfg ? root.cfg.grid : 20
                        readonly property color ink: root.ui ? root.ui.fg : "white"
                        onStepChanged: requestPaint()
                        onWidthChanged: requestPaint()
                        onHeightChanged: requestPaint()
                        onPaint: {
                            var ctx = getContext("2d")
                            ctx.reset()
                            ctx.fillStyle = Qt.rgba(ink.r, ink.g, ink.b, 0.10)
                            for (var x = step; x < width; x += step) ctx.fillRect(x, 0, 1, height)
                            for (var y = step; y < height; y += step) ctx.fillRect(0, y, width, 1)
                            ctx.fillStyle = Qt.rgba(ink.r, ink.g, ink.b, 0.22)
                            ctx.fillRect(Math.round(width / 2), 0, 1, height)
                            ctx.fillRect(0, Math.round(height / 2), width, 1)
                        }
                    }
                    MouseArea {      // a click on the desktop lets go of the selection
                        anchors.fill: parent
                        onClicked: root.svc.selected = ""
                    }

                    Repeater {
                        model: rows
                        delegate: Item {
                            id: slot
                            required property string wid
                            readonly property var w: root.svc ? root.svc.widgetById(wid) : null
                            readonly property bool picked: root.svc !== null && root.svc.selected === wid
                            anchors.fill: parent
                            z: root.svc ? root.svc.indexOf(wid) : 0

                            WidgetView {
                                id: view
                                svc: root.svc
                                w: slot.w
                                index: root.svc ? Math.max(0, root.svc.indexOf(slot.wid)) : 0
                                screenW: stage.width
                                screenH: stage.height
                                screenK: root.svc ? root.svc.scaleFor(stage.height) : 1
                                live: !(moveArea.pressed && moveArea.moved) && !sizer.pressed
                            }

                            // "→ DP-2" while it is being dragged onto another screen
                            Rectangle {
                                visible: moveArea.target !== "" && root.ui !== null
                                x: Math.max(4, Math.min(stage.width - width - 4, view.x + view.width / 2 - width / 2))
                                y: Math.max(4, Math.min(stage.height - height - 4, view.y + view.height / 2 - height / 2))
                                width: dropText.implicitWidth + 28; height: 34; radius: 17
                                color: root.ui ? root.ui.accent : "white"
                                z: 10
                                Txt { id: dropText; ui: root.ui; anchors.centerIn: parent; font.pixelSize: 14; font.weight: Font.DemiBold
                                      color: root.ui ? root.ui.accentText : "black"; text: "→ " + moveArea.target }
                            }
                            // the outline and the handle of the selected one
                            Rectangle {
                                x: view.x - 6; y: view.y - 6
                                width: view.width + 12; height: view.height + 12
                                radius: 6
                                color: "transparent"
                                border.width: slot.picked ? 2 : 1
                                border.color: slot.picked ? (root.ui ? root.ui.accent : "white") : Qt.rgba(1, 1, 1, moveArea.containsMouse ? 0.45 : 0.18)
                            }
                            MouseArea {
                                id: moveArea
                                x: view.x; y: view.y; width: view.width; height: view.height
                                hoverEnabled: true
                                cursorShape: pressed ? Qt.ClosedHandCursor : Qt.OpenHandCursor
                                property real grabX: 0
                                property real grabY: 0
                                property bool moved: false
                                // while the pointer is over another screen: that screen, and where the middle lands
                                property string target: ""
                                property real targetX: 0
                                property real targetY: 0
                                onPressed: function(m) {
                                    root.svc.selected = slot.wid
                                    grabX = m.x - view.width / 2
                                    grabY = m.y - view.height / 2
                                    moved = false
                                }
                                onPositionChanged: function(m) {
                                    if (!pressed) return
                                    moved = true
                                    var p = mapToItem(stage, m.x, m.y)
                                    var cx = p.x - grabX, cy = p.y - grabY
                                    // past this screen's edge: which screen is the pointer over?
                                    target = ""
                                    if (win.info && (p.x < 0 || p.y < 0 || p.x >= stage.width || p.y >= stage.height)) {
                                        var t = root.svc.screenAt(win.info.x + p.x, win.info.y + p.y)
                                        var to = t !== "" && t !== win.modelData.name ? root.svc.carry(win.modelData.name, t, cx, cy) : null
                                        if (to) { target = t; targetX = to.x; targetY = to.y }
                                    }
                                    if (root.cfg.snap && !(m.modifiers & Qt.ShiftModifier)) {
                                        var step = root.cfg.grid
                                        cx = Math.round((cx - view.width / 2) / step) * step + view.width / 2
                                        cy = Math.round((cy - view.height / 2) / step) * step + view.height / 2
                                    }
                                    view.dragX = Math.max(view.width / 2, Math.min(stage.width - view.width / 2, cx))
                                    view.dragY = Math.max(view.height / 2, Math.min(stage.height - view.height / 2, cy))
                                }
                                onReleased: {
                                    if (moved && target !== "") {
                                        root.svc.moveToScreen(slot.wid, target, targetX, targetY)
                                    } else if (moved && isFinite(view.dragX)) {
                                        root.svc.patchWidget(slot.wid, { x: Math.round(view.dragX / stage.width * 1000), y: Math.round(view.dragY / stage.height * 1000) })
                                    }
                                    view.dragX = NaN
                                    view.dragY = NaN
                                    moved = false
                                    target = ""
                                }
                                onDoubleClicked: { root.svc.selected = slot.wid; root.openSettings() }
                            }
                            Rectangle {     // the corner that resizes
                                visible: slot.picked
                                x: view.x + view.width - width / 2
                                y: view.y + view.height - height / 2
                                width: 16; height: 16; radius: 8
                                color: root.ui ? root.ui.accent : "white"
                                border.width: 2
                                border.color: "black"
                                MouseArea {
                                    id: sizer
                                    anchors.fill: parent
                                    anchors.margins: -6
                                    cursorShape: Qt.SizeFDiagCursor
                                    property real startH: 1
                                    property real startSize: 100
                                    property real startY: 0
                                    onPressed: function(m) {
                                        startH = view.height
                                        startSize = slot.w.size
                                        startY = mapToItem(stage, m.x, m.y).y
                                    }
                                    onPositionChanged: function(m) {
                                        if (!pressed) return
                                        var dy = mapToItem(stage, m.x, m.y).y - startY
                                        var k = Math.max(0.1, (startH + dy * 2) / startH)
                                        view.dragSize = Math.max(30, Math.min(900, Math.round(startSize * k / 5) * 5))
                                    }
                                    onReleased: {
                                        if (isFinite(view.dragSize)) root.svc.updateWidget(slot.wid, "size", view.dragSize)
                                        view.dragSize = NaN
                                    }
                                }
                            }
                            // its name, and what you can do with it
                            Row {
                                visible: slot.picked && root.ui !== null
                                x: Math.max(4, Math.min(stage.width - width - 4, view.x + view.width / 2 - width / 2))
                                y: view.y - height - 14 > 4 ? view.y - height - 14 : view.y + view.height + 14
                                spacing: 6
                                Rectangle {
                                    height: 26; width: nameText.implicitWidth + 18; radius: 13
                                    color: root.ui ? root.ui.panelColor : "black"
                                    Txt { id: nameText; ui: root.ui; anchors.centerIn: parent; font.pixelSize: 12
                                          text: slot.w ? (Kinds.kindOf(slot.w.kind).label + " · " + Kinds.styleOf(slot.w).label
                                                + (slot.w.screen === "*" ? " · on every screen" : "")
                                                + (root.svc.lost(slot.w) ? " · " + slot.w.screen + " is unplugged" : "")) : "" }
                                }
                                Btn { ui: root.ui; text: "Settings"; onClicked: root.openSettings() }
                                Btn {
                                    ui: root.ui
                                    visible: root.manyScreens && slot.w !== null && slot.w.screen !== "*"
                                    text: "To " + root.svc.nextScreenOf(slot.wid)
                                    onClicked: root.sendToNext(slot.wid)
                                }
                                Btn { ui: root.ui; text: "Duplicate"; onClicked: root.svc.duplicateWidget(slot.wid) }
                                Btn { ui: root.ui; text: "Delete"; kind: "danger"; onClicked: root.svc.removeWidget(slot.wid) }
                            }
                        }
                    }

                    // which screen this is, when there are several
                    Rectangle {
                        visible: root.manyScreens && root.ui !== null
                        x: 18
                        y: parent.height - height - 18
                        width: badge.implicitWidth + 26
                        height: 34
                        radius: 17
                        color: root.ui ? root.ui.panelColor : "black"
                        border.width: win.isMain ? 1.5 : 1
                        border.color: root.ui ? (win.isMain ? root.ui.accent : root.ui.tint(0.14)) : "white"
                        Txt {
                            id: badge
                            ui: root.ui
                            anchors.centerIn: parent
                            font.pixelSize: 13
                            text: (win.info ? win.info.label : win.modelData.name) + (win.isMain ? "  ·  main screen" : "")
                                  + "  ·  " + rows.count + (rows.count === 1 ? " widget" : " widgets")
                        }
                    }

                    // nothing here yet
                    Txt {
                        visible: rows.count === 0 && root.ui !== null
                        ui: root.ui
                        anchors.centerIn: parent
                        text: "No widgets on this screen. Add one from the bar at the top."
                        font.pixelSize: 16
                        opacity: 0.8
                    }

                    // the bar at the top
                    Rectangle {
                        visible: root.ui !== null
                        anchors.horizontalCenter: parent.horizontalCenter
                        y: 18
                        width: bar.implicitWidth + 24
                        height: bar.implicitHeight + 16
                        radius: 12
                        color: root.ui ? root.ui.panelColor : "black"
                        border.width: 1
                        border.color: root.ui ? root.ui.tint(0.14) : "white"
                        Column {
                            id: bar
                            anchors.centerIn: parent
                            spacing: 6
                            Row {
                                anchors.horizontalCenter: parent.horizontalCenter
                                spacing: 6
                                Txt { ui: root.ui; text: "Arrange"; font.pixelSize: 14; font.weight: Font.DemiBold; anchors.verticalCenter: parent.verticalCenter }
                                Item { width: 8; height: 1 }
                                Repeater {
                                    model: Kinds.list
                                    delegate: Btn {
                                        ui: root.ui
                                        text: "+ " + modelData.label
                                        enabled: root.cfg !== null && root.cfg.widgets.length < Kinds.MAX_WIDGETS
                                        onClicked: root.svc.addWidget(modelData.key, win.isMain ? "" : win.modelData.name, 500, 450)
                                    }
                                }
                                Item { width: 8; height: 1 }
                                Chip { ui: root.ui; label: "Snap"; on: root.cfg !== null && root.cfg.snap; onClicked: root.svc.setValue("snap", !root.cfg.snap) }
                                Btn { ui: root.ui; text: "Done"; kind: "primary"; onClicked: root.svc.arrange(false) }
                            }
                            Txt {
                                ui: root.ui
                                anchors.horizontalCenter: parent.horizontalCenter
                                text: "Drag to move" + (root.manyScreens ? ", onto another screen too" : "") + "  ·  the corner resizes  ·  Shift: no grid  ·  arrows nudge"
                                      + (root.manyScreens ? "  ·  S: next screen" : "") + "  ·  D duplicates  ·  Delete removes  ·  double click for settings  ·  Esc done"
                                font.pixelSize: 11
                                opacity: 0.6
                            }
                        }
                    }
                }
            }
        }
    }
}
