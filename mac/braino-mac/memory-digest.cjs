// AffectiveOS memory, steps 2 and 3 on the Mac: turning a raw hour into the
// text the digest reads, and turning a question into the candidates recall
// reads. Pure, so both are testable without Electron or a network.

function hm(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function host(url) {
  try { return new URL(String(url)).hostname.replace(/^www\./, ""); } catch (_) { return ""; }
}

/* One hour, compact. Focus runs are merged, screen text is capped per screen
   and in total, and every section keeps the names someone would search for. */
function compactHour(rows, { start, end, whatsappTexts = [], claudeLines = [] } = {}) {
  const inHour = rows.filter((r) => {
    const t = Date.parse(r.t);
    return t >= start && t < end;
  });
  const out = [];

  const focus = inHour.filter((r) => r.kind === "focus");
  if (focus.length) {
    out.push("IN FRONT");
    for (let i = 0; i < focus.length; i++) {
      const r = focus[i];
      const from = Date.parse(r.t);
      const next = focus[i + 1] ? Date.parse(focus[i + 1].t) : Math.min(end, Date.now());
      const mins = Math.max(0, Math.round((next - from) / 60000));
      if (mins < 1 && focus.length > 25) continue; // flicker, when the hour is busy
      const where = [r.app, r.title, host(r.url)].filter(Boolean).join(" · ");
      out.push(`${hm(from)} ${mins}m ${where}`);
    }
  }

  const screens = inHour.filter((r) => r.kind === "screen");
  if (screens.length) {
    out.push("", "ON SCREEN");
    let budget = 12000;
    for (const r of screens) {
      if (budget <= 0) break;
      const body = (r.lines || []).join(" | ").slice(0, Math.min(900, budget));
      budget -= body.length;
      out.push(`${hm(Date.parse(r.t))} ${[r.app, r.title].filter(Boolean).join(" · ")}: ${body}`);
    }
  }

  const tabs = inHour.filter((r) => r.kind === "tabs").pop();
  if (tabs?.tabs?.length) {
    out.push("", `OPEN TABS (${tabs.count})`);
    for (const t of tabs.tabs.slice(0, 30)) out.push(`- ${t.title || ""} (${host(t.url)})`);
  }

  const playing = inHour.filter((r) => r.kind === "playing");
  if (playing.length) {
    out.push("", "PLAYED");
    for (const r of playing) out.push(`${hm(Date.parse(r.t))} ${r.track}${r.artist ? ` by ${r.artist}` : ""} (${r.source})`);
  }

  const talk = inHour.filter((r) => r.kind === "conversation");
  if (talk.length) {
    out.push("", "WITH BRAINO");
    for (const r of talk.slice(-40)) {
      out.push(`${hm(Date.parse(r.t))} ${r.you ? `You: ${String(r.you).slice(0, 300)}` : ""}${r.braino ? ` / Braino: ${String(r.braino).slice(0, 300)}` : ""}`);
    }
  }

  const wa = inHour.filter((r) => r.kind === "whatsapp" && !r.group);
  if (wa.length) {
    const counts = new Map();
    for (const r of wa) counts.set(r.from, (counts.get(r.from) || 0) + 1);
    out.push("", "WHATSAPP", [...counts.entries()].map(([n, c]) => `${n}${c > 1 ? ` x${c}` : ""}`).join(", "));
    for (const m of whatsappTexts.slice(0, 20)) out.push(`${hm(m.at)} ${m.name} (important): ${String(m.text).slice(0, 240)}`);
  }

  if (claudeLines.length) {
    out.push("", "WITH CLAUDE");
    let budget = 6000;
    for (const line of claudeLines) {
      if (budget <= 0) break;
      const s = String(line).slice(0, Math.min(400, budget));
      budget -= s.length;
      out.push(s);
    }
  }

  return { text: out.join("\n"), rows: inHour.length };
}

/* Claude Code writes one JSON object per line. The human and assistant text in
   a time window, short, so the digest knows what was worked on. */
function claudeLinesInWindow(jsonl, { start, end }) {
  const lines = [];
  for (const raw of String(jsonl || "").split("\n")) {
    if (!raw) continue;
    let o;
    try { o = JSON.parse(raw); } catch (_) { continue; }
    const t = Date.parse(o.timestamp || "");
    if (!Number.isFinite(t) || t < start || t >= end) continue;
    const role = o.type === "user" ? "You" : o.type === "assistant" ? "Claude" : "";
    if (!role) continue;
    const content = o.message?.content;
    const text = typeof content === "string"
      ? content
      : Array.isArray(content) ? content.filter((c) => c?.type === "text").map((c) => c.text).join(" ") : "";
    const clean = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length < 3) continue;
    lines.push(`${hm(t)} ${role}: ${clean.slice(0, 300)}`);
  }
  return lines;
}

/* Everything the memory holds for a window, as numbered candidates. Pages are
   grouped by site and title so an hour on one site is one line, with when it
   started and ended; screens add what the page said. */
function recallCandidates(rows, { from, to, max = 80 } = {}) {
  const inWin = rows.filter((r) => {
    const t = Date.parse(r.t);
    return t >= from && t <= to;
  });
  const groups = new Map();
  const add = (key, base, t, extra) => {
    const g = groups.get(key) || { ...base, first: t, last: t, extra: new Set() };
    g.first = Math.min(g.first, t);
    g.last = Math.max(g.last, t);
    if (extra) g.extra.add(extra);
    groups.set(key, g);
  };
  for (const r of inWin) {
    const t = Date.parse(r.t);
    if (r.kind === "focus") {
      const h = host(r.url);
      add(`page|${h || r.app}|${r.title || ""}`, { type: h ? "page" : "app", app: r.app, title: r.title || "", url: r.url || "", site: h }, t);
    } else if (r.kind === "screen") {
      const h = host(r.url);
      add(`page|${h || r.app}|${r.title || ""}`, { type: h ? "page" : "app", app: r.app, title: r.title || "", url: r.url || "", site: h }, t, (r.lines || []).slice(0, 12).join(" | ").slice(0, 300));
    } else if (r.kind === "tabs") {
      for (const tab of r.tabs || []) {
        const h = host(tab.url);
        if (h) add(`tab|${h}|${tab.title || ""}`, { type: "open tab", app: "Chrome", title: tab.title || "", url: tab.url || "", site: h }, t);
      }
    } else if (r.kind === "playing") {
      add(`play|${r.track}`, { type: "played", title: `${r.track}${r.artist ? ` by ${r.artist}` : ""}`, url: r.link || "", site: r.source }, t);
    } else if (r.kind === "whatsapp" && !r.group) {
      add(`wa|${r.from}`, { type: "whatsapp from", title: r.from, url: "", site: "WhatsApp" }, t);
    } else if (r.kind === "conversation" && r.you) {
      add(`said|${t}`, { type: "said to Braino", title: String(r.you).slice(0, 160), url: "", site: "" }, t);
    }
  }
  const list = [...groups.values()].sort((a, b) => a.first - b.first);
  // Pages you were actually on beat tabs that were only open.
  const ranked = list.filter((g) => g.type !== "open tab").concat(list.filter((g) => g.type === "open tab")).slice(0, max);
  ranked.sort((a, b) => a.first - b.first);
  return ranked.map((g, i) => ({
    n: i + 1,
    ...g,
    extra: [...g.extra].slice(0, 2),
    line: `${i + 1}. ${new Date(g.first).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}${g.last - g.first > 90000 ? ` to ${new Date(g.last).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""} · ${g.type} · ${[g.site, g.title].filter(Boolean).join(" · ")}${g.extra.size ? ` · page said: ${[...g.extra][0]}` : ""}`,
  }));
}

module.exports = { compactHour, claudeLinesInWindow, recallCandidates, host };
