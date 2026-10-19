import QtQuick
import Quickshell.Services.Mpris

// What is playing, for the now playing widgets: from any app that speaks MPRIS
// (Spotify, browsers, mpv, ...). Nothing is read while no such widget is on the desktop.
Item {
    id: root

    visible: false

    property bool active: false
    property int serial: 0                 // goes up whenever something shown changes

    readonly property var players: active && Mpris.players ? Mpris.players.values : []

    function isPlaying(p) {
        try {
            if (p.isPlaying !== undefined) return p.isPlaying === true
            return p.playbackState === MprisPlaybackState.Playing
        } catch (e) { return false }
    }
    function nameOf(p) {
        try { return ((p.identity || "") + " " + (p.desktopEntry || "")).toLowerCase() } catch (e) { return "" }
    }

    // the player a widget follows: the one playing (of the app it is kept to, if any)
    function pick(filter) {
        var f = (typeof filter === "string" ? filter : "").trim().toLowerCase()
        var best = null
        for (var i = 0; i < root.players.length; i++) {
            var p = root.players[i]
            if (!p) continue
            if (f !== "" && root.nameOf(p).indexOf(f) === -1) continue
            var hasTrack = false
            try { hasTrack = !!(p.trackTitle || p.trackArtist) } catch (e) { }
            if (!hasTrack) continue
            if (root.isPlaying(p)) return p
            if (!best) best = p
        }
        return best
    }

    function dataFor(filter) {
        var p = root.pick(filter)
        if (!p) return { has: false, title: "", artist: "", album: "", artUrl: "", pos: 0, len: 0, playing: false, player: "" }
        var out = { has: true, title: "", artist: "", album: "", artUrl: "", pos: 0, len: 0, playing: root.isPlaying(p), player: "" }
        try { out.title = p.trackTitle || "" } catch (e) { }
        try { out.artist = p.trackArtist || "" } catch (e) { }
        try { out.album = p.trackAlbum || "" } catch (e) { }
        try { out.artUrl = p.trackArtUrl || "" } catch (e) { }
        try { out.pos = p.positionSupported === false ? 0 : (p.position || 0) } catch (e) { }
        try { out.len = p.lengthSupported === false ? 0 : (p.length || 0) } catch (e) { }
        try { out.player = p.identity || "" } catch (e) { }
        return out
    }

    readonly property bool anyPlaying: {
        for (var i = 0; i < root.players.length; i++) if (root.players[i] && root.isPlaying(root.players[i])) return true
        return false
    }

    // the position only moves when asked for, so ask once a second while music plays
    Timer {
        interval: 1000
        repeat: true
        running: root.active && root.anyPlaying
        onTriggered: {
            for (var i = 0; i < root.players.length; i++) {
                var p = root.players[i]
                try { if (p && root.isPlaying(p) && typeof p.positionChanged === "function") p.positionChanged() } catch (e) { }
            }
            root.serial++
        }
    }

    // a new track, a pause: show it straight away
    Repeater {
        model: root.players
        delegate: Item {
            required property var modelData
            Connections {
                target: modelData
                ignoreUnknownSignals: true
                function onTrackTitleChanged() { root.serial++ }
                function onTrackArtistChanged() { root.serial++ }
                function onTrackArtUrlChanged() { root.serial++ }
                function onPlaybackStateChanged() { root.serial++ }
                function onIsPlayingChanged() { root.serial++ }
            }
        }
    }
    onPlayersChanged: root.serial++
}
