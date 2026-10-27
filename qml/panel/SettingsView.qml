import QtQuick
import QtQuick.Layouts
import "../js/Schema.js" as Schema
import "../js/Util.js" as Util
import "../controls"

// settings tab: one tab per group in Schema.js, rows underneath
Item {
    id: root

    property var svc: null
    readonly property var ui: svc ? svc.ui : null
    property bool confirmReset: false

    readonly property int group: ui ? Math.max(0, Math.min(Schema.groups.length - 1, ui.settingsGroup)) : 0

    function val(key) {
        const it = Schema.itemByKey[key]
        if (it && it.kind === "palette") {
            const o = {}
            for (let i = 0; i < it.targets.length; i++) o[it.targets[i].key] = val(it.targets[i].key)
            return o
        }
        return svc && svc.cfg && svc.cfg[key] !== undefined ? svc.cfg[key] : Schema.defaults[key]
    }

    function same(item) {
        const v = val(item.key)
        return item.kind === "palette" || item.kind === "widgets" ? JSON.stringify(v) === JSON.stringify(item.fallback) : Util.toText(v) === Util.toText(item.fallback)
    }

    // popped out, the window manager decides the size, so lock these two
    function offHere(item) {
        return ui.popped === true && (item.key === "windowWidth" || item.key === "windowHeight")
    }

    // a row is greyed out when the settings it depends on don't fit:
    //   { key, is: [...] }   only for these values,   { key, not: [...] }   never for these,
    //   { any: [ ... ] }     when at least one of these fits
    function fails(c) {
        if (c.any) {
            for (let j = 0; j < c.any.length; j++) if (!fails(c.any[j])) return false
            return true
        }
        const v = Util.toText(val(c.key))
        if (c.is && c.is.indexOf(v) < 0) return true
        if (c.not && c.not.indexOf(v) >= 0) return true
        return false
    }
    function dimmed(item) {
        if (!item.when) return false
        for (let i = 0; i < item.when.length; i++) if (fails(item.when[i])) return true
        return false
    }

    // ---- search and "changed only" --------------------------------------------------------

    property string query: ""
    // a search set from outside shows up in the box too
    onQueryChanged: if (search.text !== query) search.text = query
    property bool changedOnly: false
    readonly property bool filtering: query.trim() !== "" || changedOnly

    // does a row match the search? label, hint, section, tab and option names all count
    function matches(item, title, q) {
        if (q === "") return true
        const hay = [item.label || "", item.hint || "", item.section || "", title]
        if (item.labels) for (const k in item.labels) if (typeof item.labels[k] === "string") hay.push(item.labels[k])
        return hay.join(" ").toLowerCase().indexOf(q) !== -1
    }

    // the rows to show, each with the heading that goes above it (or "")
    readonly property var rows: {
        const out = []
        const q = root.query.trim().toLowerCase()
        let last = ""
        for (let g = 0; g < Schema.groups.length; g++) {
            if (!root.filtering && g !== root.group) continue
            const items = Schema.groups[g].items
            for (let i = 0; i < items.length; i++) {
                const it = items[i]
                if (root.changedOnly && (it.kind === "presets" || it.kind === "looks" || it.kind === "widgets" || root.same(it))) continue
                if (!root.matches(it, Schema.groups[g].title, q)) continue
                const heading = root.filtering ? Schema.groups[g].title + (it.section ? "  ›  " + it.section : "") : (it.section || "")
                out.push({ item: it, heading: heading !== last ? heading : "" })
                last = heading
            }
        }
        return out
    }

    function labelOf(item) { return item.label }
    function hintOf(item) { return item.hint || "" }
    function targetsOf(item) { return item.targets || [] }

    // count of changed settings (footer)
    readonly property int changed: {
        let n = 0
        for (let g = 0; g < Schema.groups.length; g++) {
            const items = Schema.groups[g].items
            for (let i = 0; i < items.length; i++)
                if (items[i].kind !== "presets" && items[i].kind !== "looks" && items[i].kind !== "widgets" && !same(items[i])) n++
        }
        return n
    }

    function resetAll() {
        if (!root.confirmReset) { root.confirmReset = true; confirmTimer.restart(); return }
        root.confirmReset = false
        if (svc) svc.resetAll()
    }
    Timer { id: confirmTimer; interval: 2500; onTriggered: root.confirmReset = false }

    ColumnLayout {
        anchors.fill: parent
        spacing: ui.px(10)

        // search, and a switch to see only what you changed
        RowLayout {
            Layout.fillWidth: true
            spacing: ui.px(8)
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: ui.px(28)
                radius: ui.r(1.4)
                color: ui.tint(0.05)
                border.width: 1
                border.color: search.activeFocus ? ui.accent : ui.tint(0.10)
                Txt {
                    ui: root.ui
                    anchors.left: parent.left
                    anchors.leftMargin: ui.px(10)
                    anchors.verticalCenter: parent.verticalCenter
                    visible: search.text === "" && !search.activeFocus
                    text: "Search every setting"
                    font.pixelSize: ui.fs(11)
                    opacity: 0.4
                }
                TextBox {
                    id: search
                    ui: root.ui
                    anchors.fill: parent
                    anchors.leftMargin: ui.px(10)
                    anchors.rightMargin: ui.px(26)
                    maximumLength: 40
                    onTextChanged: { root.query = text; flick.contentY = 0 }
                }
                Txt {
                    ui: root.ui
                    visible: search.text !== ""
                    anchors.right: parent.right
                    anchors.rightMargin: ui.px(9)
                    anchors.verticalCenter: parent.verticalCenter
                    text: "×"
                    font.pixelSize: ui.fs(13)
                    opacity: clearArea.containsMouse ? 0.9 : 0.5
                    MouseArea {
                        id: clearArea
                        anchors.fill: parent
                        anchors.margins: -6
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: search.text = ""
                    }
                }
            }
            Chip {
                ui: root.ui
                label: "Changed only"
                on: root.changedOnly
                onClicked: { root.changedOnly = !root.changedOnly; flick.contentY = 0 }
            }
        }

        // group tabs (hidden while searching: the results come from every tab)
        Item {
            visible: !root.filtering
            Layout.fillWidth: true
            implicitHeight: ui.px(32)

            Rectangle {
                anchors.left: parent.left
                anchors.right: parent.right
                anchors.bottom: parent.bottom
                height: 1
                color: ui.tint(0.10)
            }

            RowLayout {
                anchors.fill: parent
                spacing: 0

                Repeater {
                    model: Schema.groups
                    delegate: Item {
                        readonly property bool on: index === root.group
                        // each tab as wide as its name, the spare room shared out
                        Layout.fillWidth: true
                        Layout.preferredWidth: tabLabel.implicitWidth + ui.px(8)
                        Layout.fillHeight: true

                        Txt {
                            id: tabLabel
                            ui: root.ui
                            anchors.centerIn: parent
                            anchors.verticalCenterOffset: -1
                            text: modelData.title
                            opacity: parent.on ? 1.0 : (tabArea.containsMouse ? 0.8 : 0.5)
                            font.pixelSize: ui.fs(Schema.groups.length > 8 ? 11 : 12)
                            font.weight: parent.on ? Font.DemiBold : Font.Normal
                        }
                        Rectangle {
                            visible: parent.on
                            anchors.left: parent.left
                            anchors.right: parent.right
                            anchors.bottom: parent.bottom
                            height: 2
                            radius: 1
                            color: ui.accent
                        }
                        MouseArea {
                            id: tabArea
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: { root.ui.settingsGroup = index; flick.contentY = 0 }
                        }
                    }
                }
            }
        }

        // rows
        Flickable {
            id: flick
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentWidth: width
            contentHeight: card.implicitHeight + ui.px(4)
            clip: true
            boundsBehavior: Flickable.StopAtBounds

            Item {
                id: card
                width: flick.width
                implicitHeight: rowsCol.implicitHeight + ui.px(12)

                ColumnLayout {
                    id: rowsCol
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.leftMargin: ui.px(16)
                    anchors.rightMargin: ui.px(16)
                    anchors.topMargin: ui.px(6)
                    spacing: 0

                    Repeater {
                        model: root.rows
                        delegate: ColumnLayout {
                            id: rowBox
                            required property var modelData
                            required property int index
                            readonly property var row: modelData.item
                            Layout.fillWidth: true
                            spacing: 0

                            // a section heading when a new section starts
                            Txt {
                                visible: rowBox.modelData.heading !== ""
                                Layout.fillWidth: true
                                Layout.topMargin: rowBox.index > 0 ? ui.px(18) : ui.px(2)
                                Layout.bottomMargin: ui.px(2)
                                ui: root.ui
                                text: rowBox.modelData.heading.toUpperCase()
                                font.pixelSize: ui.fs(10)
                                font.weight: Font.DemiBold
                                font.letterSpacing: 1.5
                                color: ui.accent
                                elide: Text.ElideRight
                            }
                            Rectangle {
                                visible: rowBox.index > 0 && rowBox.modelData.heading === ""
                                Layout.fillWidth: true
                                implicitHeight: 1
                                color: ui.tint(0.07)
                            }
                            PresetGrid {
                                visible: rowBox.row.kind === "presets"
                                Layout.fillWidth: true
                                Layout.topMargin: ui.px(14)
                                Layout.bottomMargin: ui.px(14)
                                svc: root.svc
                                label: rowBox.row.label
                                hint: rowBox.row.hint || ""
                            }
                            WidgetsEditor {
                                visible: rowBox.row.kind === "widgets"
                                Layout.fillWidth: true
                                Layout.topMargin: ui.px(14)
                                Layout.bottomMargin: ui.px(14)
                                svc: root.svc
                            }
                            LookSlots {
                                visible: rowBox.row.kind === "looks"
                                Layout.fillWidth: true
                                Layout.topMargin: ui.px(14)
                                Layout.bottomMargin: ui.px(14)
                                svc: root.svc
                                label: rowBox.row.label
                                hint: rowBox.row.hint || ""
                            }
                            SettingRow {
                                visible: rowBox.row.kind !== "presets" && rowBox.row.kind !== "looks" && rowBox.row.kind !== "widgets"
                                svc: root.svc
                                Layout.fillWidth: true
                                Layout.topMargin: ui.px(14)
                                Layout.bottomMargin: ui.px(14)
                                ui: root.ui
                                settingKey: rowBox.row.key
                                label: root.labelOf(rowBox.row)
                                hint: root.offHere(rowBox.row)
                                    ? "Popped out, the window manager sizes the window."
                                    : root.hintOf(rowBox.row)
                                kind: rowBox.row.kind
                                control: rowBox.row.control || ""
                                options: rowBox.row.options || []
                                allowAll: rowBox.row.allowAll !== false
                                emptyLabel: rowBox.row.emptyLabel || "Main screen"
                                labels: rowBox.row.labels || ({})
                                abouts: rowBox.row.abouts || ({})
                                presets: rowBox.row.presets || []
                                maxLength: rowBox.row.maxLength !== undefined ? rowBox.row.maxLength : 2048
                                min: rowBox.row.min !== undefined ? rowBox.row.min : 0
                                max: rowBox.row.max !== undefined ? rowBox.row.max : 100
                                step: rowBox.row.step !== undefined ? rowBox.row.step : 1
                                divisor: rowBox.row.divisor !== undefined ? rowBox.row.divisor : 1
                                decimals: rowBox.row.decimals !== undefined ? rowBox.row.decimals : 0
                                defaultValue: rowBox.row.fallback
                                dimmed: root.dimmed(rowBox.row)
                                locked: root.offHere(rowBox.row)
                                value: root.val(rowBox.row.key)
                                targets: root.targetsOf(rowBox.row)
                                onEdited: function(v) {
                                    if (root.offHere(rowBox.row) || !root.svc) return
                                    if (rowBox.row.kind === "palette") {
                                        if (v && v.reset) {
                                            for (let i = 0; i < rowBox.row.targets.length; i++) {
                                                const k = rowBox.row.targets[i].key
                                                root.svc.setValue(k, rowBox.row.fallback[k])
                                            }
                                        } else if (v && v.key) root.svc.setValue(v.key, v.value)
                                        return
                                    }
                                    root.svc.setValue(rowBox.row.key, v)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
