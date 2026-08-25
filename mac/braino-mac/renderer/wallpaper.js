"use strict";

/* The idle screen, on the Mac.
 *
 * The same design as /wallpaper on the site, kept deliberately identical so the
 * bench and the real thing never drift. It draws into the transparent
 * full-display window the notch already owns, so it needs no second window and
 * costs nothing while it is hidden.
 *
 * It appears two ways: you ask for it (Shift twice), or you walk away and the
 * Mac goes quiet for a while. Any key or click sends it away again.
 */

(function () {
  const LOOKS = [
    {
      id: "aurora",
      background:
        "radial-gradient(120% 90% at 18% 12%, #cfe0f5 0%, transparent 58%)," +
        "radial-gradient(100% 80% at 82% 24%, #f3dbe6 0%, transparent 55%)," +
        "radial-gradient(120% 100% at 62% 96%, #d9e8dd 0%, transparent 60%)," +
        "linear-gradient(168deg, #f6f4f0 0%, #eae6e1 100%)",
      ink: "rgba(28,26,24,0.92)",
      inkSoft: "rgba(28,26,24,0.52)",
      glass: "rgba(255,255,255,0.42)",
      glassBorder: "rgba(255,255,255,0.7)",
      grain: 0.05,
      vignette: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(40,36,32,0.12) 100%)",
    },
    {
      id: "dusk",
      background:
        "radial-gradient(90% 70% at 50% 96%, #6b5d7a 0%, transparent 62%)," +
        "radial-gradient(70% 50% at 74% 16%, #3b4b6b 0%, transparent 60%)," +
        "linear-gradient(178deg, #10131f 0%, #1c1b2a 52%, #2b2436 100%)",
      ink: "rgba(255,252,248,0.95)",
      inkSoft: "rgba(255,252,248,0.58)",
      glass: "rgba(255,255,255,0.12)",
      glassBorder: "rgba(255,255,255,0.22)",
      grain: 0.08,
      vignette: "radial-gradient(110% 85% at 50% 45%, transparent 50%, rgba(0,0,0,0.45) 100%)",
    },
    {
      id: "paper",
      background:
        "radial-gradient(140% 100% at 50% 0%, #fffdf9 0%, transparent 70%)," +
        "linear-gradient(180deg, #f7f4ee 0%, #efeae1 100%)",
      ink: "rgba(24,22,20,0.9)",
      inkSoft: "rgba(24,22,20,0.42)",
      glass: "rgba(255,255,255,0.55)",
      glassBorder: "rgba(30,26,22,0.08)",
      grain: 0.06,
      vignette: "radial-gradient(120% 95% at 50% 50%, transparent 62%, rgba(60,52,44,0.1) 100%)",
    },
    {
      id: "coral",
      background:
        "radial-gradient(110% 80% at 26% 8%, #ffd0c4 0%, transparent 58%)," +
        "radial-gradient(90% 70% at 84% 84%, #c9544a 0%, transparent 62%)," +
        "linear-gradient(170deg, #f6a8a2 0%, #e8786e 52%, #b64a42 100%)",
      ink: "rgba(255,250,246,0.96)",
      inkSoft: "rgba(255,250,246,0.62)",
      glass: "rgba(255,255,255,0.2)",
      glassBorder: "rgba(255,255,255,0.34)",
      grain: 0.07,
      vignette: "radial-gradient(115% 90% at 50% 46%, transparent 52%, rgba(90,28,22,0.34) 100%)",
    },
    {
      id: "mind",
      background:
        "radial-gradient(80% 60% at 50% 48%, #10314a 0%, transparent 66%)," +
        "linear-gradient(180deg, #02050a 0%, #050d16 100%)",
      ink: "rgba(226,247,255,0.95)",
      inkSoft: "rgba(180,214,236,0.55)",
      glass: "rgba(120,200,255,0.1)",
      glassBorder: "rgba(150,220,255,0.24)",
      grain: 0.09,
      vignette: "radial-gradient(110% 85% at 50% 48%, transparent 46%, rgba(0,0,0,0.6) 100%)",
    },
  ];

  const ACTION_ICONS = {
    speak: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
    ask: "M4 5h16v11H8l-4 4V5Z",
    play: "M8 5.5v13l11-6.5-11-6.5Z",
    os: "M12 3.5c2 0 3 1.4 3 2.8 1.7.2 3 1.6 3 3.4 0 1-.4 1.9-1 2.5.6.6 1 1.5 1 2.5 0 1.9-1.6 3.4-3.5 3.4-.6 1.3-1.9 2-3.5 2s-2.9-.7-3.5-2C5.6 18.1 4 16.6 4 14.7c0-1 .4-1.9 1-2.5-.6-.6-1-1.5-1-2.5 0-1.8 1.3-3.2 3-3.4 0-1.4 1-2.8 3-2.8Z",
  };

  const DEFAULT_SHORTCUTS = [
    { id: "speak", label: "Speak", kind: "action", action: "speak" },
    { id: "ask", label: "Ask", kind: "action", action: "ask" },
    { id: "play", label: "Play", kind: "action", action: "play" },
    { id: "os", label: "Braino OS", kind: "action", action: "os" },
  ];

  let root = null;
  let lookEls = [];
  let grainEl = null;
  let vignetteEl = null;
  let dateEl = null;
  let timeEl = null;
  let meridiemEl = null;
  let actionsEl = null;
  let clockTimer = 0;
  let lookTimer = 0;
  let open = false;
  let lookIndex = 0;
  let cycle = true;
  let shortcuts = DEFAULT_SHORTCUTS;

/* Long enough to be a picture rather than a slideshow, short enough that you
   see a second one before you look away. The cross-fade takes 1.1s of it. */
  const LOOK_EVERY_MS = 10000;

  function el(tag, className, parent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function build() {
    root = el("div", "bwp-root");
    root.setAttribute("aria-hidden", "true");
    lookEls = LOOKS.map((look) => {
      const node = el("div", "bwp-look", root);
      node.style.background = look.background;
      return node;
    });
    grainEl = el("div", "bwp-grain", root);
    vignetteEl = el("div", "bwp-vignette", root);

    const face = el("div", "bwp-face", root);
    dateEl = el("p", "bwp-date", face);
    const clock = el("div", "bwp-clock", face);
    timeEl = el("span", "bwp-time", clock);
    meridiemEl = el("span", "bwp-meridiem", clock);
    actionsEl = el("div", "bwp-actions", face);

    const hint = el("div", "bwp-hint", root);
    hint.textContent = "SHIFT TWICE TO LEAVE";

    /* Anything at all sends it away, which is what an idle screen is: it is in
       the way on purpose, and must never be in the way for long. */
    root.addEventListener("click", (event) => {
      if (event.target.closest(".bwp-action")) return;
      api.close();
      try { window.brainoMac && window.brainoMac.idleScreenClosed(); } catch (_) {}
    });

    document.body.appendChild(root);
  }

  /* Only the look. Called on open and again on every turn of the cycle, so it
     must never touch the row itself: rebuilding those buttons every ten seconds
     would refetch each favicon and flash the whole row. */
  function paintLook() {
    const look = LOOKS[lookIndex];
    lookEls.forEach((node, i) => node.classList.toggle("is-on", i === lookIndex));
    grainEl.style.opacity = String(look.grain);
    vignetteEl.style.background = look.vignette;
    dateEl.style.color = look.inkSoft;
    timeEl.parentElement.style.color = look.ink;
    meridiemEl.style.color = look.inkSoft;
    document.querySelectorAll(".bwp-hint").forEach((node) => { node.style.color = look.inkSoft; });
    styleActions(look);
  }

  function styleActions(look) {
    actionsEl.querySelectorAll(".bwp-action").forEach((button) => {
      button.style.background = look.glass;
      button.style.border = "1px solid " + look.glassBorder;
      button.style.color = look.ink;
    });
  }

  function renderActions() {
    actionsEl.innerHTML = "";
    for (const shortcut of shortcuts) {
      const button = el("button", "bwp-action", actionsEl);
      button.type = "button";
      button.title = shortcut.label || "";

      const icon = shortcut.action ? ACTION_ICONS[shortcut.action] : "";
      if (icon) {
        button.innerHTML =
          '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
          'stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="' + icon + '"/></svg>';
      } else if (shortcut.emoji) {
        const span = el("span", "bwp-emoji", button);
        span.textContent = shortcut.emoji;
      } else if (shortcut.url) {
        /* A site's own icon says what it is faster than a label can. */
        const img = document.createElement("img");
        try {
          const host = new URL(/^https?:\/\//i.test(shortcut.url) ? shortcut.url : "https://" + shortcut.url).hostname;
          img.src = "https://www.google.com/s2/favicons?domain=" + host + "&sz=128";
        } catch (_) { img.src = ""; }
        img.alt = "";
        button.appendChild(img);
      } else {
        const span = el("span", "bwp-letter", button);
        span.textContent = (shortcut.label || "?").slice(0, 1).toUpperCase();
      }

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        try { window.brainoMac && window.brainoMac.idleScreenAction(shortcut); } catch (_) {}
      });
    }
  }

  function tick() {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
    timeEl.textContent = now
      .toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/\s?[AP]M$/i, "");
    meridiemEl.textContent = now.getHours() >= 12 ? "PM" : "AM";
  }

  /* Five looks were drawn and only one of them can be up. So they take turns. */
  function startCycle() {
    if (lookTimer) window.clearInterval(lookTimer);
    lookTimer = 0;
    if (!cycle || LOOKS.length < 2) return;
    lookTimer = window.setInterval(() => {
      lookIndex = (lookIndex + 1) % LOOKS.length;
      paintLook();
    }, LOOK_EVERY_MS);
  }

  const api = {
    open(options) {
      if (!root) build();
      if (options && options.look) {
        const found = LOOKS.findIndex((entry) => entry.id === options.look);
        if (found >= 0) lookIndex = found;
      }
      if (options && typeof options.cycle === "boolean") cycle = options.cycle;
      if (options && Array.isArray(options.shortcuts) && options.shortcuts.length) {
        shortcuts = options.shortcuts;
      }
      open = true;
      renderActions();
      paintLook();
      tick();
      if (!clockTimer) clockTimer = window.setInterval(tick, 1000);
      startCycle();
      root.classList.add("is-open");
      try { window.brainoMac && window.brainoMac.setMousePassthrough(false); } catch (_) {}
      return true;
    },
    close() {
      if (!root) return false;
      open = false;
      root.classList.remove("is-open");
      if (clockTimer) { window.clearInterval(clockTimer); clockTimer = 0; }
      if (lookTimer) { window.clearInterval(lookTimer); lookTimer = 0; }
      try { window.brainoMac && window.brainoMac.setMousePassthrough(true); } catch (_) {}
      return true;
    },
    isOpen() { return open; },
    setLook(id) {
      const found = LOOKS.findIndex((entry) => entry.id === id);
      if (found < 0) return false;
      lookIndex = found;
      if (root) paintLook();
      /* Asking for a look restarts the clock rather than being overwritten a
         second later by a turn that was already halfway through. */
      if (open) startCycle();
      return true;
    },
    setCycle(on) {
      cycle = Boolean(on);
      if (open) startCycle();
      return cycle;
    },
  };

  window.__brainoWallpaper = api;
})();
