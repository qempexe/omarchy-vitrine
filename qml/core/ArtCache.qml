import QtQuick
import Quickshell
import "../js/Art.js" as Art

// The covers the now playing widgets show, made safe first: each player's cover address
// becomes a small, clean PNG in ~/.cache/omarchy-vitrine/covers (see js/Art.js), and
// fileFor() hands back its file:// address once it is ready. One cover is made at a
// time; the others asked for meanwhile wait their turn (the newest few). The newest
// covers are kept, older ones removed.
Item {
    id: root

    visible: false

    readonly property string cacheDir: (Quickshell.env("XDG_CACHE_HOME") || Quickshell.env("HOME") + "/.cache") + "/omarchy-vitrine"
    readonly property string coverDir: cacheDir + "/covers"
    readonly property string incomingDir: cacheDir + "/incoming"

    property var done: ({})                    // name -> true, covers ready
    property var order: []                     // names, oldest first
    property var failed: ({})                  // name -> true, not tried again this session
    property bool ready: false
    property string working: ""                // the address being made
    property var queue: []                     // addresses waiting, oldest first
    readonly property int queueMax: 8

    // the clean cover for a player's address, or "" while there is none (yet)
    function fileFor(u) {
        if (!u) return ""
        const n = Art.nameOf(u)
        return root.done[n] === true ? "file://" + root.coverDir + "/" + n + ".png" : ""
    }

    function ask(u) {
        const p = Art.parse(u)
        if (!p) return
        const n = Art.nameOf(u)
        if (done[n] || failed[n] || u === working || queue.indexOf(u) !== -1) return
        if (!ready || working !== "") { queue = queue.concat([u]).slice(-queueMax); return }
        start(u)
    }

    function start(u) {
        const n = Art.nameOf(u), p = Art.parse(u)
        working = u
        if (p.web) {
            const argv = Art.curlArgs(u, incomingDir + "/" + n + ".img")
            if (!argv) { fail(n); return }
            fetcher.start(argv)
        } else {
            thumb(p.file, n)
        }
    }
    function thumb(src, n) {
        const argv = Art.thumbArgs(src, coverDir + "/" + n + ".png")
        if (!argv) { fail(n); return }
        thumber.start(argv)
    }
    function finish(n, ok) {
        if (ok) {
            const d = Object.assign({}, done)
            d[n] = true
            let o = order.filter((x) => x !== n).concat([n])
            const gone = o.length > Art.KEEP ? o.slice(0, o.length - Art.KEEP) : []
            o = o.slice(gone.length)
            for (const g of gone) delete d[g]
            done = d
            order = o
            if (gone.length > 0) remove(gone.map((g) => coverDir + "/" + g + ".png"))
        } else {
            failed[n] = true
        }
        working = ""
        next()
    }
    function fail(n) { finish(n, false) }
    function next() {
        if (queue.length === 0) return
        const u = queue[0]
        queue = queue.slice(1)
        Qt.callLater(ask, u)
    }

    property var toRemove: []
    function remove(paths) {
        toRemove = toRemove.concat(paths)
        if (!cleaner.running && toRemove.length > 0) {
            const batch = toRemove.slice(0, 200)
            toRemove = toRemove.slice(200)
            cleaner.start(["rm", "-f", "--"].concat(batch))
        }
    }

    // at start: nothing from last time is trusted, the folders start empty
    Component.onCompleted: reset.start(["rm", "-rf", "--", root.incomingDir, root.coverDir])
    Run {
        id: reset
        seconds: 20
        maxOut: 4096
        onDone: function(code, out, err) { mkdir.start(["mkdir", "-p", "-m", "700", "--", root.coverDir, root.incomingDir]) }
    }
    Run {
        id: mkdir
        seconds: 10
        maxOut: 4096
        onDone: function(code, out, err) { root.ready = code === 0; if (root.ready) root.next() }
    }
    Run {
        id: fetcher
        seconds: 20
        maxOut: 4096
        onDone: function(code, out, err) {
            const n = Art.nameOf(root.working)
            if (code !== 0) { root.remove([root.incomingDir + "/" + n + ".img"]); root.fail(n); return }
            Qt.callLater(root.thumb, root.incomingDir + "/" + n + ".img", n)
        }
    }
    Run {
        id: thumber
        seconds: 20
        maxOut: 16384
        environment: ({ VIPS_BLOCK_UNTRUSTED: "1", VIPS_CONCURRENCY: "1", MALLOC_ARENA_MAX: "2" })
        onDone: function(code, out, err) {
            const n = Art.nameOf(root.working)
            root.remove([root.incomingDir + "/" + n + ".img"])
            if (code !== 0) root.remove([root.coverDir + "/" + n + ".png"])
            root.finish(n, code === 0)
        }
    }
    Run {
        id: cleaner
        seconds: 20
        maxOut: 4096
        onDone: function(code, out, err) { Qt.callLater(root.remove, []) }
    }
}
