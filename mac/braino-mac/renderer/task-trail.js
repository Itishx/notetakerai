/* The thinking trail: what he is doing, step by step, while he does it.
   A dark glass card that hangs under the notch for the length of a job. Each
   step gets a row (spinner, then a tick or a cross) and his thought under it,
   the way extended thinking reads: the newest thought open, older ones folded
   to one line. When the job ends it folds to "Done in 14s, 4 steps" and fades.
   Additive on purpose: the notch's one-line caption is untouched, this only
   listens to braino-mac:task-trail. Click-through, never in the way. */
(() => {
  const api = window.brainoMac;
  if (!api?.onTaskTrail) return;

  const card = document.createElement("div");
  card.id = "task-trail";
  card.innerHTML = `<div class="tt-head"><span class="tt-orb"></span><span class="tt-title"></span><span class="tt-time"></span></div><ol class="tt-steps"></ol><div class="tt-foot"></div>`;
  document.body.appendChild(card);
  const title = card.querySelector(".tt-title");
  const time = card.querySelector(".tt-time");
  const list = card.querySelector(".tt-steps");
  const foot = card.querySelector(".tt-foot");
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MAX_ROWS = 6;

  let startedAt = 0, clock = 0, hideTimer = 0, steps = 0, pendingThought = null;

  function place() {
    // Just under whatever the notch is showing right now, captions included.
    const pill = document.querySelector("#notch-face .nf-pill");
    const bottom = pill ? pill.getBoundingClientRect().bottom : 0;
    card.style.top = `${Math.max(44, bottom + 10)}px`;
  }
  function tick() {
    const s = Math.max(0, (Date.now() - startedAt) / 1000);
    time.textContent = s < 60 ? `${s.toFixed(0)}s` : `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, "0")}s`;
    place();
  }
  function lastRow() { return list.lastElementChild; }
  function fold() {
    // Only the newest thought stays open; everything above it is one line.
    [...list.children].slice(0, -1).forEach((li) => li.classList.add("folded"));
    while (list.children.length > MAX_ROWS) list.firstElementChild.remove();
  }
  function addRow(label) {
    const li = document.createElement("li");
    li.className = "tt-row run";
    li.innerHTML = `<span class="tt-dot"></span><div class="tt-body"><div class="tt-label">${esc(label)}</div></div>`;
    if (pendingThought) { attachThought(li, pendingThought); pendingThought = null; }
    list.appendChild(li);
    fold();
    return li;
  }
  function attachThought(li, t) {
    const body = li.querySelector(".tt-body");
    body.querySelector(".tt-thought")?.remove();
    const d = document.createElement("div");
    d.className = "tt-thought";
    d.innerHTML = `<span class="tt-for">Thought for ${(Math.max(0.1, (t.ms || 0) / 1000)).toFixed(1)}s</span>${esc(t.text)}`;
    body.appendChild(d);
  }

  function start(p) {
    clearTimeout(hideTimer);
    const resumed = p.resumed && card.classList.contains("show");
    if (!resumed) { list.innerHTML = ""; steps = 0; startedAt = Date.now(); }
    pendingThought = null;
    title.textContent = p.command || "Working";
    foot.textContent = "";
    card.classList.remove("done", "failed", "asked");
    card.classList.toggle("astra", p.brain === "astra");
    card.classList.add("show");
    clearInterval(clock); clock = setInterval(tick, 250); tick();
  }
  function end(p) {
    clearInterval(clock); tick();
    list.querySelectorAll(".tt-row.run").forEach((li) => { li.classList.remove("run"); li.classList.add(p.ok ? "ok" : "bad"); });
    const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const n = `${steps} step${steps === 1 ? "" : "s"}`;
    card.classList.add(p.asked ? "asked" : p.ok ? "done" : "failed");
    foot.textContent = p.asked ? `Waiting on you \u00b7 ${n}` : p.ok ? `Done in ${secs}s \u00b7 ${n}` : `Stopped after ${secs}s \u00b7 ${n}`;
    fold();
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => card.classList.remove("show"), p.asked ? 9000 : 4500);
  }

  api.onTaskTrail((p) => {
    try {
      if (!p || !p.kind) return;
      if (p.kind === "start") return start(p);
      if (!card.classList.contains("show")) return;
      if (p.kind === "thought") {
        card.classList.toggle("astra", p.brain === "astra");
        // A thought belongs to the step it leads to, which arrives next.
        pendingThought = { text: p.text, ms: p.ms };
        return;
      }
      if (p.kind === "step") { steps += 1; addRow(p.label || "Working"); return; }
      if (p.kind === "result") {
        const li = lastRow();
        if (li) { li.classList.remove("run"); li.classList.add(p.ok ? "ok" : "bad"); }
        return;
      }
      if (p.kind === "end") return end(p);
    } catch (_) {}
  });
})();
