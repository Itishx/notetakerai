// What Laya sees around a sentence, built live from the same log events the
// training set was rebuilt from (~/.braino-laya/training/build_context.py).
// The two MUST produce the same line for the same moment: Laya v4 learned
// from that exact text, and a line shaped differently here is a sentence it
// has never seen. Change one, change both, and retrain.
//
// Pure: feed it events with observe(), ask it for a line with text().

const TEN_MIN = 10 * 60 * 1000;

function norm(t) {
  return String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function hostOf(url) {
  try { return url ? new URL(url).hostname.replace("www.", "") : ""; } catch (_) { return ""; }
}

function ago(ms) {
  const s = ms / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return "long ago";
}

function createLayaContext() {
  const st = { app: "", title: "", site: "", music: false, musicSrc: "", brainoLast: "", brainoT: 0,
    said: "", saidT: 0, before: { said: "", t: 0 }, task: false, waiting: false, namedT: 0 };

  /* The same events, the same effect, as build_context.py's replay. */
  function observe(event, p = {}, now = Date.now()) {
    switch (event) {
      case "desktop.context.changed":
        st.app = p.appName || st.app; st.title = p.windowTitle || ""; st.site = hostOf(p.browserUrl);
        break;
      case "delegate.intent.start":
        st.app = p.activeApp || st.app; st.title = p.activeTitle || st.title; st.site = hostOf(p.activeUrl) || st.site;
        st.before = { said: st.said, t: st.saidT };
        st.said = String(p.prompt || ""); st.saidT = now;
        break;
      case "music.state":
        st.music = Boolean(p.playing); st.musicSrc = p.source || "";
        break;
      case "voice.out":
        st.brainoLast = String(p.text || ""); st.brainoT = now;
        break;
      case "hil.loop.start":
        st.task = true;
        break;
      case "delegate.done":
        st.task = false; st.waiting = Boolean(p.hasPendingWorkflow);
        break;
      case "mac.workflow.pending":
        st.waiting = true;
        break;
      case "mac.workflow.released":
        st.waiting = false;
        break;
      case "named.awake":
      case "named.heard_on_device":
        st.namedT = now;
        break;
      default:
    }
  }

  /* The line for the sentence being routed right now. The sentence is the
     one delegate.intent.start just recorded (with "Braino" still in it, as in
     training), unless it is stale. */
  function text(fallbackSaid, now = Date.now()) {
    const said = st.said && now - st.saidT < 5000 ? st.said : String(fallbackSaid || "");
    const k = norm(said);
    const parts = [`Said: "${said.slice(0, 220)}"`];
    if (st.brainoLast && now - st.brainoT < TEN_MIN) {
      const q = st.brainoLast.trimEnd().endsWith("?") ? " (a question)" : "";
      parts.push(`Braino last said${q}, ${ago(now - st.brainoT)} ago: "${st.brainoLast.slice(0, 140)}"`);
    }
    const prev = st.said && norm(st.said) !== k ? { said: st.said, t: st.saidT } : st.before;
    if (prev.said && norm(prev.said) !== k && now - prev.t < TEN_MIN) {
      parts.push(`Before that you said, ${ago(now - prev.t)} ago: "${prev.said.slice(0, 120)}"`);
    }
    let screen = st.app || "";
    if (st.title) screen += ` · ${st.title.slice(0, 70)}`;
    if (st.site) screen += ` (${st.site})`;
    if (screen) parts.push(`Screen: ${screen}`);
    parts.push(st.music ? `Music: playing${st.musicSrc ? ` on ${st.musicSrc}` : ""}` : "Music: off");
    if (st.task) parts.push("A job is running");
    if (st.waiting) parts.push("Braino is waiting for an answer");
    const named = /\bbrain(?:o|elle)\b/i.test(said) || now - st.namedT < 8000;
    parts.push(named ? "Name heard: yes" : "Name heard: no");
    return parts.join(" | ");
  }

  return { observe, text, state: st };
}

module.exports = { createLayaContext, ago, hostOf };
