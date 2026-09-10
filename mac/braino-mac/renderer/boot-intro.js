"use strict";

/* Braino's boot screen, and the handoff into the notch.
 *
 * Two jobs used to be one. The notch boot was saying both "the app is starting"
 * and "he is waking up", and those are different sentences that belong to
 * different moments. This takes the first one: black screen, the character, a
 * bar. Machine coming alive, nobody home yet. The notch boot keeps the second,
 * which is what it was always better at.
 *
 * The last beat is the whole point. He does not dissolve and reappear in the
 * menu bar, he FLIES there: the same element, one continuous transform, ending
 * at the real measured position of the notch on this display. That is the shot
 * that says the big one you just met and the small one who lives up there are
 * the same person, and it is why this runs inside the dock window instead of a
 * window of its own.
 *
 * The bar is driven by real milestones from startup(), never by a timer. It has
 * a readable floor so a warm start does not flash, and it will happily sit at
 * 70% for as long as a cold sign-in actually takes.
 */

(function () {
  const MIN_VISIBLE_MS = 1500;   // a boot screen that flashes reads as a glitch
  const LINE_HOLD_MS = 2500;     // long enough to read nine words, first run only

  let root = null;
  let mascotEl = null;
  let fillEl = null;
  let barEl = null;
  let lineEl = null;
  let shownAt = 0;
  let armed = false;

  function el(id) { return document.getElementById(id); }

  function mount() {
    root = el("boot-intro");
    if (!root) return false;
    mascotEl = root.querySelector(".bi-mascot");
    fillEl = root.querySelector(".bi-fill");
    barEl = root.querySelector(".bi-bar");
    lineEl = root.querySelector(".bi-line");
    return Boolean(mascotEl && fillEl && barEl);
  }

  /* His actual character, not a stand-in: the preload already resolved which
     mascot this user picked, so the boot screen shows the one they will see
     for the rest of the day. */
  function paintMascot() {
    try {
      const svg = window.brainoMac?.getWalkerSvg?.();
      if (svg && typeof svg === "string") { mascotEl.innerHTML = svg; return; }
    } catch (_) { /* fall through to the dot */ }
    /* No markup available. A plain coral dot is a poor Braino but an honest
       one, and it is better than an empty black screen while he boots. */
    mascotEl.innerHTML =
      '<svg viewBox="0 0 100 100" width="100%" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="34" fill="#E8786E"/></svg>';
  }

  function show(opts) {
    if (!mount()) return false;
    paintMascot();
    root.hidden = false;
    root.classList.remove("bi-out");
    fillEl.style.width = "0%";
    shownAt = Date.now();
    armed = true;
    if (opts && opts.firstRun) root.dataset.firstRun = "1";
    return true;
  }

  /* Called by startup() as real work lands. Never decreases: a bar that goes
     backwards is worse than a bar that pauses. */
  let lastPct = 0;
  function progress(pct) {
    if (!armed || !fillEl) return;
    const next = Math.max(lastPct, Math.min(0.97, Number(pct) || 0));
    lastPct = next;
    fillEl.style.width = (next * 100).toFixed(1) + "%";
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* Where the notch actually is, in this window's coordinates. Measured rather
     than assumed, because the notch face moves with the active display and a
     hardcoded target sends him to the wrong screen on an external monitor. */
  function flightToNotch() {
    const fallback = { dx: 0, dy: -window.innerHeight * 0.42, scale: 0.12 };
    try {
      const notch = el("notch-face");
      if (!notch) return fallback;
      const n = notch.getBoundingClientRect();
      const m = mascotEl.getBoundingClientRect();
      if (!n.width || !m.width) return fallback;
      return {
        dx: (n.left + n.width / 2) - (m.left + m.width / 2),
        dy: (n.top + n.height / 2) - (m.top + m.height / 2),
        /* Land a little smaller than the notch itself, so he reads as going
           INTO it rather than landing on top of it. */
        scale: Math.max(0.06, (n.height * 0.55) / m.height),
      };
    } catch (_) {
      return fallback;
    }
  }

  async function finish(opts) {
    if (!armed || !root) return;
    armed = false;
    const firstRun = Boolean(opts && opts.firstRun);

    // Complete the bar honestly, then let it settle before anything moves.
    lastPct = 1;
    if (fillEl) fillEl.style.width = "100%";
    const elapsed = Date.now() - shownAt;
    if (elapsed < MIN_VISIBLE_MS) await wait(MIN_VISIBLE_MS - elapsed);
    await wait(360);

    barEl?.classList.add("bi-bar-out");

    /* First run earns one sentence. Every run after this, he has already
       introduced himself and repeating it would be the app talking to itself. */
    if (firstRun && lineEl) {
      lineEl.classList.add("bi-line-in");
      await wait(LINE_HOLD_MS);
      lineEl.classList.remove("bi-line-in");
      lineEl.classList.add("bi-line-out");
      await wait(300);
    }

    // Home.
    const f = flightToNotch();
    mascotEl.style.setProperty("--bi-dx", f.dx.toFixed(1) + "px");
    mascotEl.style.setProperty("--bi-dy", f.dy.toFixed(1) + "px");
    mascotEl.style.setProperty("--bi-scale", f.scale.toFixed(3));
    mascotEl.classList.add("bi-fly");

    /* The black lifts while he is still travelling, not after. Waiting for him
       to land first makes two beats out of one move, and the desktop coming
       back underneath him is most of why the flight reads as arriving
       somewhere real. */
    await wait(340);
    root.classList.add("bi-out");
    await wait(640);
    root.hidden = true;
  }

  /* If startup throws before finish(), the screen must not stay black forever.
     Anything that leaves a user staring at a black display is worse than a
     boot screen that ends early. */
  function abort() {
    if (!root) return;
    armed = false;
    root.classList.add("bi-out");
    setTimeout(() => { if (root) root.hidden = true; }, 640);
  }

  window.__brainoBootIntro = { show, progress, finish, abort };
})();
