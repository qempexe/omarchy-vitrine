import QtQuick
import Quickshell.Io
import Quickshell.Services.UPower
import "../js/Sys.js" as Sys

// Readings for the system widgets, only while one is on the desktop. The processor,
// memory and network have no change signal, so a few /proc files are read again
// every few seconds (read in place, nothing is started). The battery comes from
// UPower, which says when it changes. The disk is asked about once a minute.
Item {
    id: root

    visible: false

    property bool active: false
    property int interval: 2               // seconds
    property var diskPaths: ["/"]
    property bool wantsDisk: false
    property bool wantsTemp: false

    property var state: ({ cur: null, d: {}, disks: {}, hist: {}, netPeak: 0 })
    property int serial: 0
    property var prev: null

    function metersFor(w) { return Sys.meters(root.state, w.metrics || [], w) }

    // ---- the files --------------------------------------------------------------------

    function textOf(fv) { try { var t = fv.text(); return typeof t === "string" ? t : "" } catch (e) { return "" } }
    FileView { id: fStat; path: root.active ? "/proc/stat" : ""; printErrors: false }
    FileView { id: fMem; path: root.active ? "/proc/meminfo" : ""; printErrors: false }
    FileView { id: fUp; path: root.active ? "/proc/uptime" : ""; printErrors: false }
    FileView { id: fLoad; path: root.active ? "/proc/loadavg" : ""; printErrors: false }
    FileView { id: fNet; path: root.active ? "/proc/net/dev" : ""; printErrors: false }
    FileView { id: fTemp; path: root.active && root.wantsTemp ? root.tempFile : ""; printErrors: false }

    function read() {
        if (!root.active) return
        fStat.reload(); fMem.reload(); fUp.reload(); fLoad.reload(); fNet.reload()
        if (fTemp.path !== "") fTemp.reload()
        settle.restart()
    }
    // the files come back on their own time: put them together a moment later
    Timer {
        id: settle
        interval: 60
        onTriggered: {
            var text = "@@stat\n" + root.textOf(fStat) + "\n@@meminfo\n" + root.textOf(fMem) + "\n@@uptime\n" + root.textOf(fUp)
                     + "\n@@loadavg\n" + root.textOf(fLoad) + "\n@@netdev\n" + root.textOf(fNet)
                     + (fTemp.path !== "" ? "\n@@temp\n" + root.textOf(fTemp) : "")
            var cur = Sys.parse(text, Date.now())
            // the battery, from UPower
            var dev = null
            try { dev = UPower.displayDevice } catch (e) { dev = null }
            if (dev && dev.isPresent) {
                cur.bat = Math.round((dev.percentage || 0) * 100)
                cur.batStatus = dev.state === UPowerDeviceState.Charging ? "Charging"
                              : (dev.state === UPowerDeviceState.FullyCharged ? "Full" : "Discharging")
            }
            var d = Sys.delta(root.prev, cur)
            root.prev = cur
            var h = root.state.hist || {}
            var peak = Math.max((root.state.netPeak || 0) * 0.98, isFinite(d.netRate) ? d.netRate : 0)
            root.state = {
                cur: cur, d: d, disks: root.state.disks, netPeak: peak,
                hist: {
                    cpu: Sys.push(h.cpu, d.cpu, 30),
                    mem: Sys.push(h.mem, cur.memTotal > 0 ? (cur.memTotal - cur.memAvail) / cur.memTotal : NaN, 30),
                    net: Sys.push(h.net, isFinite(d.netRate) ? Math.min(1, d.netRate / Math.max(peak, 65536)) : NaN, 30),
                    temp: Sys.push(h.temp, isFinite(cur.temp) ? Math.max(0, Math.min(1, (cur.temp - 25) / 75)) : NaN, 30)
                }
            }
            root.serial++
        }
    }
    Timer {
        interval: Math.max(1, root.interval) * 1000
        repeat: true
        running: root.active
        onTriggered: root.read()
    }
    onActiveChanged: if (active) { root.read(); soon.restart(); if (root.wantsTemp && !root.tempFound) findTemp.running = true; root.readDisks() }
    // the processor and the network are measured between two readings: take the
    // second one soon, so they don't wait a whole interval to show
    Timer { id: soon; interval: 600; onTriggered: root.read() }
    onWantsTempChanged: if (wantsTemp && active && !root.tempFound && !findTemp.running) findTemp.running = true

    // the battery changed: show it now
    Connections {
        target: root.active ? UPower.displayDevice : null
        ignoreUnknownSignals: true
        function onPercentageChanged() { root.read() }
        function onStateChanged() { root.read() }
    }

    // ---- the CPU's temperature sensor, looked for once --------------------------------

    property string tempFile: ""
    property bool tempFound: false
    Process {
        id: findTemp
        command: ["sh", "-c",
            "for h in /sys/class/hwmon/hwmon*; do n=$(cat \"$h/name\" 2>/dev/null); case \"$n\" in coretemp|k10temp|zenpower|cpu_thermal|acpitz) [ -r \"$h/temp1_input\" ] && echo \"$h/temp1_input\" && exit 0;; esac; done; " +
            "for z in /sys/class/thermal/thermal_zone*; do t=$(cat \"$z/type\" 2>/dev/null); case \"$t\" in x86_pkg_temp|cpu*|soc*|acpitz) echo \"$z/temp\"; exit 0;; esac; done"]
        stdout: StdioCollector {
            onStreamFinished: {
                var p = (text || "").trim()
                if (/^\/sys\/[A-Za-z0-9_\/.:-]+$/.test(p)) root.tempFile = p
                root.tempFound = true
            }
        }
    }

    // ---- disks, once a minute ------------------------------------------------------------

    function readDisks() {
        if (!root.active || !root.wantsDisk || dfProc.running) return
        var paths = []
        for (var i = 0; i < root.diskPaths.length; i++) {
            var p = root.diskPaths[i]
            if (typeof p === "string" && /^\/[^\u0000\n]{0,200}$/.test(p) && paths.indexOf(p) === -1) paths.push(p)
        }
        if (paths.length === 0) return
        dfProc.paths = paths
        dfProc.command = ["sh", "-c", "for p in \"$@\"; do echo \"@@$p\"; df -P -B1 -- \"$p\" 2>/dev/null; done", "sh"].concat(paths)
        dfProc.running = true
    }
    Process {
        id: dfProc
        property var paths: []
        stdout: StdioCollector {
            onStreamFinished: {
                var parts = (text || "").split("@@")
                var disks = {}
                for (var i = 0; i < parts.length; i++) {
                    var nl = parts[i].indexOf("\n")
                    if (nl < 0) continue
                    var path = parts[i].slice(0, nl)
                    if (dfProc.paths.indexOf(path) === -1) continue
                    var r = Sys.parseDf(parts[i].slice(nl + 1))
                    if (r) disks[path] = r
                }
                root.state = { cur: root.state.cur, d: root.state.d, disks: disks, hist: root.state.hist, netPeak: root.state.netPeak }
                root.serial++
            }
        }
    }
    Timer {
        interval: 60000
        repeat: true
        running: root.active && root.wantsDisk
        onTriggered: root.readDisks()
    }
    onDiskPathsChanged: root.readDisks()
    onWantsDiskChanged: root.readDisks()
}
