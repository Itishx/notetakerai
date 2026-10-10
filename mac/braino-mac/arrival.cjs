// Arrival: the notch greets you when you come back to the Mac.
//
// Looking for you → Touch ID → "Morning, Itish." → what came in while you
// were away, summarised in the notch → Braino comes out and says good morning.
// It runs right after macOS unlocks (Apple lets no one replace the lock
// screen). The camera only checks that someone is there; Touch ID is the
// check that it is you, so nothing personal shows before it passes.
//
// Pure rules here, so they are testable; main.cjs owns the window and the
// camera, Touch ID, WhatsApp and file calls.

const AWAY_MS = 30 * 60 * 1000;
const MAX_ROWS = 4;

function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* Show on the first unlock of the day, or after being away long enough to
   count as coming back. Never twice inside the away window. */
function shouldArrive({ now, lockedAt = 0, lastArrivalAt = 0, disabled = false } = {}) {
  if (disabled || !Number.isFinite(now)) return false;
  if (!lastArrivalAt || dayKey(lastArrivalAt) !== dayKey(now)) return true;
  if (now - lastArrivalAt < AWAY_MS) return false;
  return Boolean(lockedAt) && now - lockedAt >= AWAY_MS;
}

function partOfDay(hour) {
  if (hour < 5) return "Late one";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function clean(text) {
  return String(text || "").replace(/[–—]/g, ",").replace(/\s+/g, " ").trim();
}

function clip(text, max = 52) {
  const t = clean(text);
  return t.length > max ? `${t.slice(0, max - 3).replace(/[\s,]+\S*$/, "")}...` : t;
}

function greetingTitle({ name = "", hour = new Date().getHours() } = {}) {
  const first = clean(name).split(" ")[0];
  return `${partOfDay(hour)}${first ? `, ${first}` : ""}.`;
}

/* What is waiting, as a few short rows: WhatsApp while you were away first
   (people beat calendars), then the next class, then what is due. Only real
   facts; an empty list is honest, an invented one is not. */
function summaryRows({ whatsapp = [], classesToday = [], dueSoon = [] } = {}) {
  const rows = [];
  const people = whatsapp.filter((w) => w && w.name && Number(w.count) > 0);
  if (people.length) {
    const total = people.reduce((n, w) => n + Number(w.count), 0);
    const [top, ...rest] = people;
    const text = rest.length
      ? `${clip(top.name, 20)} and ${rest.length} other${rest.length > 1 ? "s" : ""} messaged, ${total} new`
      : `${clip(top.name, 24)} sent ${total} message${total > 1 ? "s" : ""}`;
    rows.push({ kind: "whatsapp", text });
  }
  const nextClass = classesToday.find((c) => c && c.title);
  if (nextClass) rows.push({ kind: "class", text: clip(`${nextClass.title}${nextClass.at ? ` at ${nextClass.at}` : ""}`) });
  for (const d of dueSoon.filter((x) => x && x.title).slice(0, 2)) {
    rows.push({ kind: "due", text: clip(`${d.title}, due ${clean(d.when) || "soon"}`) });
  }
  return rows.slice(0, MAX_ROWS);
}

/* The line under the greeting, which sums the rows up in words. */
function summaryLead(rows) {
  if (!rows.length) return "Nothing waiting. Clean start.";
  if (rows.length === 1) return "One thing waiting for you.";
  return `${rows.length} things waiting for you.`;
}

module.exports = { AWAY_MS, MAX_ROWS, shouldArrive, greetingTitle, summaryRows, summaryLead, dayKey };
