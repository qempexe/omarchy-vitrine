.pragma library

// anything -> text, without trusting what it is
function toText(value) {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return "" + value;
    return "";
}
