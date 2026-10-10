"use strict";

/* What is running on this Mac's localhost (2026-10-03).
 *
 * "Open my localhost link in a new tab" came back as "Chrome has no tabs open".
 * Braino had no idea a dev server was running, let alone which project it was
 * for. A person sitting next to you would just know: the Affective site is on
 * 8080, Meltique is on 3000. So this reads the listening ports, keeps the ones
 * a developer started (node, python, ruby, bun, deno, php), and names each by
 * its project folder.
 *
 * Pure parsing below, so it is tested without lsof. */

const DEV_COMMANDS = /^(?:node|python\d*(?:\.\d+)?|ruby|bun|deno|php|java)$/i;

/* `lsof -nP -iTCP -sTCP:LISTEN -F pcn` → [{ pid, command, port }] */
function parseListeners(stdout) {
  const out = [];
  let pid = 0;
  let command = "";
  for (const line of String(stdout || "").split("\n")) {
    const tag = line[0];
    const value = line.slice(1);
    if (tag === "p") pid = Number(value);
    else if (tag === "c") command = value;
    else if (tag === "n") {
      const m = value.match(/^(\*|127\.0\.0\.1|\[::1?\]|localhost|0\.0\.0\.0):(\d+)$/);
      if (m && pid) out.push({ pid, command, port: Number(m[2]), localOnly: m[1] !== "*" && m[1] !== "0.0.0.0" });
    }
  }
  const seen = new Set();
  return out.filter((row) => {
    const key = `${row.pid}:${row.port}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* What kind of server, from its command line. */
function frameworkOf(cmd) {
  const c = String(cmd || "");
  if (/\bvite\b/.test(c)) return "Vite";
  if (/next-server|\bnext\b/.test(c)) return "Next.js";
  if (/react-scripts/.test(c)) return "Create React App";
  if (/\bastro\b/.test(c)) return "Astro";
  if (/\bnuxt\b/.test(c)) return "Nuxt";
  if (/\bremix\b/.test(c)) return "Remix";
  if (/http\.server|SimpleHTTPServer/.test(c)) return "Python server";
  if (/\bflask\b|\buvicorn\b|\bgunicorn\b|\bdjango|manage\.py/.test(c)) return "Python app";
  if (/\brails\b|\bpuma\b/.test(c)) return "Rails";
  return "";
}

/* Keep what a person started for work; drop Braino's own helpers and system
   services. `self` is Braino's own root and process ids. */
function devServersFrom(listeners, details, self = {}) {
  const ownPids = new Set(self.pids || []);
  const ownPorts = new Set(self.ports || []);
  const rows = [];
  for (const l of listeners) {
    if (!DEV_COMMANDS.test(l.command)) continue;
    if (ownPids.has(l.pid) || ownPorts.has(l.port)) continue;
    const d = details[l.pid] || {};
    const cwd = String(d.cwd || "");
    if (!cwd || /\/(?:private\/)?tmp\//.test(cwd) || /\/\.braino-laya\b/.test(String(d.cmd || ""))) continue;
    const folder = cwd.split("/").filter(Boolean).pop() || "";
    const project = self.root && cwd === self.root ? (self.rootLabel || folder) : folder;
    rows.push({ port: l.port, url: `http://localhost:${l.port}`, project, folder, cwd, framework: frameworkOf(d.cmd), pid: l.pid });
  }
  return rows.sort((a, b) => a.port - b.port);
}

/* One line for his context: what he can open without asking. */
function describeDevServers(servers) {
  if (!servers?.length) return "";
  return `Local dev servers running on this Mac: ${servers.map((s) => `${s.url} (${[s.framework, s.project].filter(Boolean).join(", ")})`).join("; ")}.`;
}

/* "the localhost link", "my local site", "the dev server", "localhost 8080". */
function asksForLocalhost(raw) {
  const t = String(raw || "").toLowerCase();
  if (!/\b(?:local\s*host|dev\s+server|development\s+server|local\s+(?:site|server|link|build|version))\b/.test(t)) return null;
  if (/\b(?:kill|stop|restart|close|shut)\b/.test(t)) return null;
  const port = t.match(/\b(?:port\s+|:|local\s*host\s*)(\d{4,5})\b/);
  return { port: port ? Number(port[1]) : 0 };
}

/* Which server is meant. A port wins; then a project named in the sentence;
   then the one you were last looking at in the browser; then the only one.
   Otherwise null, and he asks. */
function pickDevServer(servers, raw, recentUrls = []) {
  if (!servers?.length) return { none: true };
  const ask = asksForLocalhost(raw) || { port: 0 };
  if (ask.port) {
    const hit = servers.find((s) => s.port === ask.port);
    return hit ? { server: hit, why: "port" } : { none: true, port: ask.port };
  }
  const said = String(raw || "").toLowerCase();
  const named = servers.filter((s) => [s.project, s.folder].some((n) => n && n.length > 2 && said.includes(String(n).toLowerCase())));
  if (named.length === 1) return { server: named[0], why: "named" };
  for (const url of recentUrls) {
    const m = String(url || "").match(/^https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
    const hit = m && servers.find((s) => s.port === Number(m[1]));
    if (hit) return { server: hit, why: "recent" };
  }
  if (servers.length === 1) return { server: servers[0], why: "only" };
  return { choose: servers };
}

module.exports = { parseListeners, frameworkOf, devServersFrom, describeDevServers, asksForLocalhost, pickDevServer };
