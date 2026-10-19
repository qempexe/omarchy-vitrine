import QtQuick

// all text goes through here, plain text only
Text {
    property var ui: null

    textFormat: Text.PlainText
    color: ui ? ui.fg : "white"
    font.family: ui ? ui.fontName : ""
    font.pixelSize: ui ? ui.fs(11) : 11
}
