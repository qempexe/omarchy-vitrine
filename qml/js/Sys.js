.pragma library

// Reading the computer: what one `cat` of /proc and /sys files gives, parsed, and
// turned into the meters a system widget shows. Nothing here runs anything.

// the reader prints each file after a line "@@name"
function sections(text) {
    const out = {};
    let cur = "";
    const lines = typeof text === "string" ? text.split("\n") : [];
    for (let i = 0; i < lines.length && i < 4000; i++) {
        const l = lines[i];
        if (l.indexOf("@@") === 0) { cur = l.slice(2).trim(); out[cur] = []; continue; }
        if (cur) out[cur].push(l);
    }
    return out;
}

function num(s) { const n = parseFloat(s); return isFinite(n) ? n : NaN; }

// one reading: raw numbers, not yet compared with the last one
function parse(text, now) {
    const s = sections(text), r = { time: now || 0 };
    const stat = s.stat || [];
    r.cpus = 0;
    for (let i = 0; i < stat.length; i++) {
        const p = stat[i].trim().split(/\s+/);
        if (p[0] === "cpu") {
            let total = 0;
            for (let j = 1; j < p.length && j <= 8; j++) total += num(p[j]) || 0;
            r.cpuTotal = total;
            r.cpuIdle = (num(p[4]) || 0) + (num(p[5]) || 0);
        } else if (/^cpu[0-9]+$/.test(p[0])) r.cpus++;
    }
    const mem = {};
    const mi = s.meminfo || [];
    for (let k = 0; k < mi.length; k++) {
        const m = /^(\w+):\s+([0-9]+)/.exec(mi[k]);
        if (m) mem[m[1]] = parseInt(m[2], 10) * 1024;
    }
    r.memTotal = mem.MemTotal || 0;
    r.memAvail = mem.MemAvailable !== undefined ? mem.MemAvailable : (mem.MemFree || 0);
    r.swapTotal = mem.SwapTotal || 0;
    r.swapFree = mem.SwapFree || 0;
    r.uptime = s.uptime && s.uptime[0] ? num(s.uptime[0].split(" ")[0]) : NaN;
    r.load = s.loadavg && s.loadavg[0] ? num(s.loadavg[0].split(" ")[0]) : NaN;
    let rx = 0, tx = 0;
    const nd = s.netdev || [];
    for (let n = 0; n < nd.length; n++) {
        const nm = /^\s*([^:\s]+):\s*(.*)$/.exec(nd[n]);
        if (!nm || nm[1] === "lo") continue;
        const f = nm[2].trim().split(/\s+/);
        rx += num(f[0]) || 0;
        tx += num(f[8]) || 0;
    }
    r.rx = rx; r.tx = tx;
    r.bat = s.battery && s.battery[0] !== undefined && s.battery[0].trim() !== "" ? num(s.battery[0]) : NaN;
    r.batStatus = s.batstatus && s.batstatus[0] ? s.batstatus[0].trim() : "";
    const t = s.temp && s.temp[0] ? num(s.temp[0]) : NaN;
    r.temp = isFinite(t) ? (t > 1000 ? t / 1000 : t) : NaN;
    return r;
}

// df -P -B1 output for one folder -> { used, total }
function parseDf(text) {
    const lines = typeof text === "string" ? text.trim().split("\n") : [];
    if (lines.length < 2) return null;
    const f = lines[lines.length - 1].trim().split(/\s+/);
    const total = num(f[1]), used = num(f[2]);
    return isFinite(total) && isFinite(used) && total > 0 ? { used, total } : null;
}

function gb(bytes) {
    const g = bytes / 1073741824;
    return g >= 100 ? Math.round(g) + "" : (g >= 10 ? g.toFixed(0) : g.toFixed(1));
}
function rate(bps) {
    if (!isFinite(bps) || bps < 0) bps = 0;
    if (bps >= 1048576) return (bps / 1048576).toFixed(bps >= 10485760 ? 0 : 1) + " MB/s";
    if (bps >= 1024) return Math.round(bps / 1024) + " KB/s";
    return Math.round(bps) + " B/s";
}
function span(sec) {
    if (!isFinite(sec)) return "—";
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
}

// what changed since the last reading: { cpu, netRate } (cpu 0..1, net bytes/s)
function delta(prev, cur) {
    const out = { cpu: NaN, netRate: NaN, down: NaN, upRate: NaN };
    if (!prev || !cur) return out;
    const dt = cur.cpuTotal - prev.cpuTotal, di = cur.cpuIdle - prev.cpuIdle;
    if (dt > 0) out.cpu = Math.max(0, Math.min(1, 1 - di / dt));
    const secs = (cur.time - prev.time) / 1000;
    if (secs > 0.2) {
        out.down = Math.max(0, (cur.rx - prev.rx) / secs);
        out.upRate = Math.max(0, (cur.tx - prev.tx) / secs);
        out.netRate = out.down + out.upRate;
    }
    return out;
}

var labels = { cpu: "CPU", mem: "Memory", disk: "Disk", bat: "Battery", temp: "Heat", net: "Network",
               load: "Load", up: "Uptime", swap: "Swap" };

// the meters for one widget: st is the latest state { cur, d, disks: { path: { used, total } },
// hist: { cpu: [], mem: [], net: [], temp: [] }, netPeak }
function meters(st, keys, o) {
    const out = [], cur = st && st.cur ? st.cur : null, d = st && st.d ? st.d : {};
    if (!cur || !keys) return out;
    const hist = st.hist || {};
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i], m = { key: k, label: labels[k] || k, frac: -1, text: "—", detail: "", history: [] };
        if (k === "cpu") {
            if (isFinite(d.cpu)) { m.frac = d.cpu; m.text = Math.round(d.cpu * 100) + "%"; }
            m.history = hist.cpu || [];
        } else if (k === "mem" && cur.memTotal > 0) {
            const used = cur.memTotal - cur.memAvail;
            m.frac = used / cur.memTotal; m.text = Math.round(m.frac * 100) + "%";
            m.detail = gb(used) + " / " + gb(cur.memTotal) + " GB";
            m.history = hist.mem || [];
        } else if (k === "swap") {
            if (cur.swapTotal > 0) {
                const su = cur.swapTotal - cur.swapFree;
                m.frac = su / cur.swapTotal; m.text = Math.round(m.frac * 100) + "%";
                m.detail = gb(su) + " / " + gb(cur.swapTotal) + " GB";
            } else m.text = "off";
        } else if (k === "disk") {
            const dk = st.disks ? st.disks[o && o.path ? o.path : "/"] : null;
            if (dk) { m.frac = dk.used / dk.total; m.text = Math.round(m.frac * 100) + "%"; m.detail = gb(dk.used) + " / " + gb(dk.total) + " GB"; }
        } else if (k === "bat") {
            if (isFinite(cur.bat)) {
                m.frac = Math.max(0, Math.min(1, cur.bat / 100)); m.text = Math.round(cur.bat) + "%";
                m.detail = cur.batStatus === "Charging" ? "charging" : (cur.batStatus === "Full" ? "full" : (cur.batStatus ? "on battery" : ""));
            } else m.text = "none";
        } else if (k === "temp") {
            if (isFinite(cur.temp)) {
                m.frac = Math.max(0, Math.min(1, (cur.temp - 25) / 75));
                m.text = o && o.fahrenheit ? Math.round(cur.temp * 9 / 5 + 32) + "°F" : Math.round(cur.temp) + "°C";
            }
            m.history = hist.temp || [];
        } else if (k === "net") {
            if (isFinite(d.netRate)) {
                const peak = Math.max(st.netPeak || 0, 65536);
                m.frac = Math.min(1, d.netRate / peak); m.text = rate(d.netRate);
                m.detail = "↓ " + rate(d.down) + "  ↑ " + rate(d.upRate);
            }
            m.history = hist.net || [];
        } else if (k === "load") {
            if (isFinite(cur.load)) { m.frac = Math.min(1, cur.load / Math.max(1, cur.cpus)); m.text = cur.load.toFixed(2); }
        } else if (k === "up") {
            m.text = span(cur.uptime);
            if (isFinite(cur.uptime)) m.frac = (cur.uptime % 86400) / 86400;
        }
        out.push(m);
    }
    return out;
}

// a history kept to n values
function push(list, v, n) {
    const out = (list || []).slice(Math.max(0, (list || []).length - n + 1));
    out.push(isFinite(v) ? v : 0);
    return out;
}
