"use strict";
/* Maven onboarding: one step per screen. Talks to main only through window.onboarding. */
const api = window.onboarding;
const STEPS = ["welcome", "permissions", "mic", "language", "shortcut", "place", "practice", "done"];
const $ = (id) => document.getElementById(id);
let current = -1;
let leaveStep = null;
// One listener each for the whole window, routed to the current step
// (before, every visit to the shortcut step added another listener).
let onChord = null, onKeys = null, onPlaced = null;
api.onChord(() => { if (onChord) onChord(); });
api.onKeys((p) => { if (onKeys) onKeys(p); });
api.onPlaced((p) => { if (onPlaced) onPlaced(p); });

// Maven in the Welcome screen blinks like he does on screen.
(function blink() {
  const c = document.getElementById("welcome-capsule");
  setTimeout(() => { if (c) { c.classList.add("blink"); setTimeout(() => c.classList.remove("blink"), 120); } blink(); }, 2600 + Math.random() * 3400);
})();

const dots = document.querySelector(".dots");
STEPS.forEach(() => dots.appendChild(document.createElement("i")));

async function go(index) {
  if (leaveStep) { try { leaveStep(); } catch (_) {} leaveStep = null; }
  // Skip permissions when both are already granted.
  if (STEPS[index] === "permissions") {
    const p = await api.perms();
    if (p.accessibility && p.microphone) index += 1;
  }
  current = index;
  const name = STEPS[index];
  document.querySelectorAll("section").forEach((s) => s.classList.toggle("on", s.dataset.step === name));
  [...dots.children].forEach((d, i) => d.classList.toggle("on", i === index));
  api.step(name);
  const enter = ENTER[name];
  if (enter) leaveStep = enter() || null;
}
/* TODO(sign-in): when Maven has accounts, a "Sign in" step goes here, right after Welcome. */

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-go]");
  if (b) go(current + 1);
});
$("finish").addEventListener("click", () => api.finish());

const ENTER = {
  language() {
    const cards = [...document.querySelectorAll("[data-lang]")];
    const mark = (l) => cards.forEach((c) => c.classList.toggle("active", c.dataset.lang === l));
    api.getLanguage().then((l) => mark(l || "en")).catch(() => {});
    const onPick = (e) => { const l = e.currentTarget.dataset.lang; mark(l); api.setLanguage(l); };
    cards.forEach((c) => c.addEventListener("click", onPick));
    return () => cards.forEach((c) => c.removeEventListener("click", onPick));
  },
  permissions() {
    const order = ["accessibility", "microphone"];
    const tick = async () => {
      const p = await api.perms();
      const next = order.find((k) => !p[k]);
      for (const k of order) {
        const card = $("perm-" + k);
        card.classList.toggle("granted", Boolean(p[k]));
        card.classList.toggle("active", k === next);
      }
      $("perms-continue").classList.toggle("hidden", Boolean(next));
    };
    const buttons = document.querySelectorAll("[data-request]");
    const onReq = async (e) => { await api.request(e.currentTarget.dataset.request); tick(); };
    buttons.forEach((b) => b.addEventListener("click", onReq));
    tick();
    const t = setInterval(tick, 1000);
    return () => { clearInterval(t); buttons.forEach((b) => b.removeEventListener("click", onReq)); };
  },

  mic() {
    let stream = null, ctx = null, raf = 0, heard = 0, done = false, stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        const loop = () => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0; for (const v of buf) sum += v * v;
          const level = Math.min(1, Math.sqrt(Math.sqrt(sum / buf.length) * 3)); // same curve as the recorder
          $("meter-fill").style.width = Math.round(level * 100) + "%";
          heard = level > 0.32 ? heard + 1 : Math.max(0, heard - 1);
          if (!done && heard > 12) {
            done = true;
            $("mic-status").textContent = "✓ Heard you.";
            $("mic-continue").classList.remove("hidden");
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (_) {
        $("mic-status").textContent = "Can't open the mic. Check System Settings, Privacy, Microphone.";
        $("mic-continue").classList.remove("hidden");
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (ctx) ctx.close().catch(() => {});
    };
  },

  shortcut() {
    // The chord comes from main's key watcher (the native one), not from this window.
    // Until the watcher says its event tap is on, presses cannot arrive: say so.
    let done = false, ready = false;
    const status = $("key-status");
    const paint = (r) => {
      ready = Boolean(r && r.ready);
      if (done) return;
      status.textContent = ready ? "Try it now: press Control and Option together."
        : r && r.accessibility === false ? "Maven needs Accessibility for the shortcut. Turn it on in System Settings."
        : "Getting the shortcut ready…";
    };
    api.keys().then(paint).catch(() => {});
    const poll = setInterval(() => { if (!ready) api.keys().then(paint).catch(() => {}); }, 1000);
    onKeys = paint;
    onChord = () => {
      if (done) return;
      done = true;
      document.querySelectorAll("section[data-step=shortcut] kbd").forEach((k) => k.classList.add("pressed"));
      status.textContent = "✓ That's it.";
      $("key-continue").classList.remove("hidden");
    };
    return () => { clearInterval(poll); onChord = null; onKeys = null; };
  },

  place() {
    $("place-status").textContent = "He's at the bottom right of your screen now.";
    onPlaced = ({ spot } = {}) => {
      const where = { "bottom-left": "bottom left", "bottom-centre": "bottom centre", "bottom-right": "bottom right" }[spot] || "there";
      $("place-status").textContent = `✓ Got it. He stays at the ${where}.`;
    };
    return () => { onPlaced = null; };
  },

  practice() {
    const tasks = [
      "Press ⌃⌥, say: “I'll be there at five thirty, see you soon.” Press ⌃⌥ again.",
      "Now try a list: “I need eggs milk bread and coffee.”",
    ];
    let i = 0;
    const box = $("practice-box");
    const show = () => {
      $("practice-prompt").textContent = tasks[i];
      box.value = "";
      box.focus();
    };
    const onInput = () => {
      if (!box.value.trim()) return;
      clearTimeout(onInput.t);
      // A paste lands all at once; wait a beat so typing by hand doesn't count halfway.
      onInput.t = setTimeout(() => {
        if (!box.value.trim()) return;
        if (i === 0) { i = 1; $("practice-status").textContent = "✓ Good."; setTimeout(show, 900); }
        else { $("practice-status").textContent = "Nice."; $("practice-continue").classList.remove("hidden"); box.removeEventListener("input", onInput); }
      }, 600);
    };
    box.addEventListener("input", onInput);
    show();
    return () => box.removeEventListener("input", onInput);
  },
};

go(0);
