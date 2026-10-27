import QtQuick
import Quickshell.Io

// Time zone offsets for world clocks: asks `date` how far each zone is from UTC
// right now, every ten minutes (so summer time comes in by itself). Only zones that
// exist in /usr/share/zoneinfo are asked about.
Item {
    id: root

    visible: false

    property var zones: []                 // the zones clocks use, like "Asia/Tokyo"
    property var offsets: ({})              // zone -> minutes east of UTC

    function offsetOf(zone) {
        if (typeof zone !== "string" || zone === "") return null
        const v = root.offsets[zone]
        return typeof v === "number" ? v : null
    }

    function valid(z) { return typeof z === "string" && /^[A-Za-z][A-Za-z0-9_+\-]{0,30}(\/[A-Za-z0-9_+\-]{1,30}){0,2}$/.test(z) }

    function ask() {
        const list = []
        for (let i = 0; i < root.zones.length; i++) if (root.valid(root.zones[i]) && list.indexOf(root.zones[i]) === -1) list.push(root.zones[i])
        if (list.length === 0) { root.offsets = ({}); return }
        if (proc.running) { again.restart(); return }
        proc.command = ["sh", "-c",
            "for z in \"$@\"; do if [ \"$z\" = UTC ] || [ -f \"/usr/share/zoneinfo/$z\" ]; then printf '%s %s\\n' \"$z\" \"$(TZ=\"$z\" date +%z)\"; fi; done",
            "sh"].concat(list)
        proc.running = true
    }

    onZonesChanged: Qt.callLater(root.ask)

    Process {
        id: proc
        stdout: StdioCollector {
            onStreamFinished: {
                const out = {}
                const lines = (text || "").split("\n")
                for (let i = 0; i < lines.length; i++) {
                    const m = /^(\S+) ([+-])([0-9]{2})([0-9]{2})$/.exec(lines[i].trim())
                    if (!m) continue
                    out[m[1]] = (m[2] === "-" ? -1 : 1) * (parseInt(m[3], 10) * 60 + parseInt(m[4], 10))
                }
                root.offsets = out
            }
        }
    }
    Timer { id: again; interval: 500; onTriggered: root.ask() }
    Timer { interval: 600000; repeat: true; running: root.zones.length > 0; onTriggered: root.ask() }
}
