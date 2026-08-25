"use strict";

/* The idle screen, on the Mac.
 *
 * The same design as /wallpaper on the site, drawn from the same look file
 * (`shared/wallpaperLooks.json`), which the main process reads and hands over
 * on open. Nothing about a look is written twice, so the bench and the real
 * thing cannot drift.
 *
 * It draws into the transparent full-display window the notch already owns, so
 * it needs no second window and costs nothing while it is hidden. It appears
 * two ways: you ask for it (Shift twice), or you walk away and the Mac goes
 * quiet for a while. Any key or click sends it away again.
 */

(function () {
  const ACTION_ICONS = {
    speak: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
    ask: "M4 5h16v11H8l-4 4V5Z",
    play: "M8 5.5v13l11-6.5-11-6.5Z",
    os: "M12 3.5c2 0 3 1.4 3 2.8 1.7.2 3 1.6 3 3.4 0 1-.4 1.9-1 2.5.6.6 1 1.5 1 2.5 0 1.9-1.6 3.4-3.5 3.4-.6 1.3-1.9 2-3.5 2s-2.9-.7-3.5-2C5.6 18.1 4 16.6 4 14.7c0-1 .4-1.9 1-2.5-.6-.6-1-1.5-1-2.5 0-1.8 1.3-3.2 3-3.4 0-1.4 1-2.8 3-2.8Z",
  };

  /* Enough to keep the clock on screen if the look file ever fails to read.
     Everything real comes from the main process. */
  const BARE_LOOK = {
    id: "bare",
    background: "linear-gradient(180deg, #08080a 0%, #101014 100%)",
    ink: "rgba(250,246,240,0.94)",
    inkSoft: "rgba(250,246,240,0.45)",
    glass: "rgba(255,255,255,0.08)",
    glassBorder: "rgba(255,255,255,0.18)",
    grain: 0.08,
    vignette: "radial-gradient(110% 85% at 50% 48%, transparent 46%, rgba(0,0,0,0.6) 100%)",
    clockFont: '"Instrument Serif", Georgia, serif',
    clockItalic: false,
    clockWeight: 400,
    clockTracking: "-0.022em",
    quote: "",
  };

  let root = null;
  let lookEls = [];
  let grainEl = null;
  let vignetteEl = null;
  let signatureEl = null;
  let dateEl = null;
  let timeEl = null;
  let clockEl = null;
  let meridiemEl = null;
  let quoteEl = null;
  let actionsEl = null;
  let wordmarkEl = null;
  let batteryEl = null;
  let batteryFillEl = null;
  let batteryTextEl = null;
  let batteryBoltEl = null;
  let batteryShellEl = null;
  let batteryCapEl = null;

  let clockTimer = 0;
  let lookTimer = 0;
  let open = false;

  let looks = [BARE_LOOK];
  let rotation = ["bare"];
  let lookIndex = 0;
  let cycleMs = 10000;
  let showQuotes = true;
  let shortcuts = [];
  let battery = null;

  function el(tag, className, parent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function currentLook() {
    const id = rotation[lookIndex] || rotation[0];
    return looks.find((entry) => entry.id === id) || looks[0] || BARE_LOOK;
  }

  function build() {
    root = el("div", "bwp-root");
    root.setAttribute("aria-hidden", "true");
    grainEl = el("div", "bwp-grain", root);
    vignetteEl = el("div", "bwp-vignette", root);

    batteryEl = el("div", "bwp-battery", root);
    batteryTextEl = el("span", "bwp-batt-pct", batteryEl);
    const glyph = el("span", "bwp-batt-glyph", batteryEl);
    batteryShellEl = el("span", "bwp-batt-shell", glyph);
    batteryFillEl = el("span", "bwp-batt-fill", batteryShellEl);
    batteryCapEl = el("span", "bwp-batt-cap", glyph);
    batteryBoltEl = el("span", "bwp-batt-bolt", glyph);
    batteryBoltEl.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="15" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg>';

    const face = el("div", "bwp-face", root);
    signatureEl = el("p", "bwp-signature", face);
    signatureEl.textContent = "Braino OS";
    dateEl = el("p", "bwp-date", face);
    clockEl = el("div", "bwp-clock", face);
    timeEl = el("span", "bwp-time", clockEl);
    meridiemEl = el("span", "bwp-meridiem", clockEl);
    quoteEl = el("p", "bwp-quote", face);
    actionsEl = el("div", "bwp-actions", face);

    /* Signed, quietly. Apple never puts a word on a wallpaper and they are
       right, so this is as small as a signature on a print. */
    wordmarkEl = el("p", "bwp-wordmark", root);
    wordmarkEl.textContent = "Braino OS";

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

  /* One layer per look so a change cross-fades instead of cutting. Rebuilt only
     when the set itself changes, never on a turn of the rotation. */
  function buildLookLayers() {
    lookEls.forEach((node) => node.remove());
    lookEls = looks.map((look) => {
      const node = document.createElement("div");
      node.className = "bwp-look";
      node.style.background = look.background;
      root.insertBefore(node, grainEl);
      return node;
    });
  }

  /* Only the look. Called on open and again on every turn of the rotation, so
     it must never touch the row itself: rebuilding those buttons every few
     seconds would refetch each favicon and flash the whole row. */
  function paintLook() {
    const look = currentLook();
    lookEls.forEach((node, i) => node.classList.toggle("is-on", Boolean(looks[i]) && looks[i].id === look.id));
    grainEl.style.opacity = String(look.grain);
    vignetteEl.style.background = look.vignette;

    dateEl.style.color = look.inkSoft;
    clockEl.style.color = look.ink;
    timeEl.style.fontFamily = look.clockFont;
    timeEl.style.fontStyle = look.clockItalic ? "italic" : "normal";
    timeEl.style.fontWeight = String(look.clockWeight || 400);
    timeEl.style.letterSpacing = look.clockTracking || "-0.022em";
    meridiemEl.style.color = look.inkSoft;

    /* One look does not wear the wordmark. It is the wordmark. */
    root.classList.toggle("is-signature", Boolean(look.signature));
    signatureEl.style.color = look.ink;
    wordmarkEl.style.color = look.inkSoft;

    const quote = showQuotes ? String(look.quote || "") : "";
    quoteEl.textContent = quote;
    quoteEl.style.color = look.inkSoft;
    quoteEl.hidden = !quote;

    paintBattery(look);
    styleActions(look);
  }

  function styleActions(look) {
    actionsEl.querySelectorAll(".bwp-action").forEach((button) => {
      button.style.background = look.glass;
      button.style.border = "1px solid " + look.glassBorder;
      button.style.color = look.ink;
    });
  }

  /* Small, quiet, and only ever three things: it is filling, it is emptying, or
     it wants you. Anything more belongs in the menu bar. */
  function paintBattery(look) {
    if (!batteryEl) return;
    if (!battery || typeof battery.percent !== "number") {
      batteryEl.hidden = true;
      return;
    }
    const charging = Boolean(battery.charging || battery.onAc);
    const low = !charging && (battery.percent <= 20 || battery.needsAttention);
    const tint = charging ? "#5ad07f" : low ? "#f0a03c" : look.inkSoft;
    batteryEl.hidden = false;
    batteryEl.style.color = charging || low ? tint : look.inkSoft;
    batteryTextEl.textContent = battery.percent + "%";
    batteryShellEl.style.borderColor = look.inkSoft;
    batteryCapEl.style.background = look.inkSoft;
    batteryFillEl.style.width = Math.max(4, Math.round((battery.percent / 100) * 21)) + "px";
    batteryFillEl.style.background = tint;
    batteryBoltEl.style.display = charging ? "block" : "none";
    batteryBoltEl.style.fill = tint;
    batteryEl.title = battery.needsAttention
      ? "Battery wants looking at"
      : charging ? "Charging" : "On battery";
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

  /* Eleven looks were drawn and only one of them can be up. So they take turns,
     unless you asked for one and meant it. */
  function startCycle() {
    if (lookTimer) window.clearInterval(lookTimer);
    lookTimer = 0;
    if (rotation.length < 2) return;
    lookTimer = window.setInterval(() => {
      lookIndex = (lookIndex + 1) % rotation.length;
      paintLook();
    }, cycleMs);
  }

  const api = {
    open(options) {
      if (!root) build();
      const payload = options || {};

      if (Array.isArray(payload.looks) && payload.looks.length) {
        const sameSet = looks.length === payload.looks.length
          && looks.every((look, i) => look.id === payload.looks[i].id);
        looks = payload.looks;
        if (!sameSet || !lookEls.length) buildLookLayers();
      } else if (!lookEls.length) {
        buildLookLayers();
      }

      const ids = looks.map((look) => look.id);
      const asked = Array.isArray(payload.rotation) ? payload.rotation.filter((id) => ids.includes(id)) : [];
      rotation = asked.length ? asked : ids;
      lookIndex = 0;

      if (Number.isFinite(payload.cycleSeconds)) cycleMs = Math.max(3000, payload.cycleSeconds * 1000);
      if (typeof payload.quotes === "boolean") showQuotes = payload.quotes;
      if (payload.battery) battery = payload.battery;
      if (Array.isArray(payload.shortcuts) && payload.shortcuts.length) shortcuts = payload.shortcuts;

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
    /* The machine's own battery, pushed in whenever it changes. */
    setBattery(next) {
      battery = next || null;
      if (root && open) paintBattery(currentLook());
      return true;
    },
    setLook(id) {
      const found = rotation.indexOf(id);
      if (found < 0) return false;
      lookIndex = found;
      if (root) paintLook();
      /* Asking for a look restarts the clock rather than being overwritten a
         second later by a turn that was already halfway through. */
      if (open) startCycle();
      return true;
    },
  };

  window.__brainoWallpaper = api;
})();
