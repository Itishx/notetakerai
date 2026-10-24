/* Type to Braino: Enter sends it to the notch as a typed turn (answered
   there, never out loud), Esc or clicking away closes it, ↑ brings back the
   last thing you sent. */
(() => {
  const api = window.brainoMac || {};
  const bar = document.getElementById("bar");
  const box = document.getElementById("say");
  let last = "";
  try { last = localStorage.getItem("braino-type-bar-last") || ""; } catch (_) {}

  const focus = () => { box.focus(); box.select(); };
  window.addEventListener("focus", focus);
  api.onTypeBarShown?.(() => { bar.classList.remove("sent"); box.value = ""; bar.classList.remove("typing"); focus(); });

  box.addEventListener("input", () => bar.classList.toggle("typing", Boolean(box.value.trim())));
  box.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); api.typeBarClose?.(); }
    if (e.key === "ArrowUp" && !box.value && last) { e.preventDefault(); box.value = last; bar.classList.add("typing"); }
  });
  bar.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = box.value.trim();
    if (!text) return;
    last = text;
    try { localStorage.setItem("braino-type-bar-last", text); } catch (_) {}
    bar.classList.remove("typing");
    bar.classList.add("sent");
    // The glow runs round once, then it goes; the notch takes it from here.
    setTimeout(() => api.typeBarSend?.(text), 160);
  });
  focus();
})();
