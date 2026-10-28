/* Maven for Chrome, in the page (2026-10-29).
   - Shows the island (the Mac app's own files) in a frame at the bottom right.
   - Hotkeys, same feel as the Mac: Control+Option writes, Control+Command
     (or fn+Control where Chrome sees fn) does. Press to start, press to stop.
   - Puts the words where your cursor was, and fills forms. */
(() => {
  if (window.top !== window || window.__mavenLoaded) return;
  window.__mavenLoaded = true;

  const W = 560, H = 320;
  let frame = null, ready = false, queue = [], rects = [], over = false, asking = false, busy = false;
  let lastFocus = null;

  function mount() {
    if (frame) return;
    frame = document.createElement("iframe");
    frame.src = chrome.runtime.getURL("island.html");
    frame.setAttribute("aria-label", "Maven");
    frame.setAttribute("allowtransparency", "true");
    Object.assign(frame.style, {
      position: "fixed", right: "0", bottom: "0", width: W + "px", height: H + "px", border: "0",
      background: "transparent", colorScheme: "normal", zIndex: "2147483647", pointerEvents: "none",
    });
    (document.body || document.documentElement).appendChild(frame);
  }
  function down(type, payload) {
    if (!frame) mount();
    if (!ready) { queue.push([type, payload]); return; }
    frame.contentWindow.postMessage({ __maven: "down", type, payload }, "*");
  }
  function setOver(v) {
    over = v;
    if (frame) frame.style.pointerEvents = v || asking ? "auto" : "none";
  }

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!frame || e.source !== frame.contentWindow || !m || m.__maven !== "up") return;
    if (m.type === "ready") { ready = true; for (const [t, p] of queue.splice(0)) down(t, p); return; }
    if (m.type === "rects") { rects = m.payload || []; return; }
    if (m.type === "hover") { if (!m.payload) setOver(false); return; }
    if (m.type === "action") { send({ t: "island-action", action: m.payload }); return; }
    if (m.type === "card") { send({ t: "card", a: m.payload }); return; }
  });

  // Click-through except over the pill, the card and the note.
  document.addEventListener("mousemove", (e) => {
    if (!frame || over) return;
    const fr = frame.getBoundingClientRect();
    const x = e.clientX - fr.left, y = e.clientY - fr.top;
    if (rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)) setOver(true);
  }, { passive: true });

  function send(msg) { try { chrome.runtime.sendMessage(msg).catch?.(() => {}); } catch (_) {} }

  /* ---------- hotkeys ---------- */
  let fnDown = false;
  function editable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") return !/^(button|submit|checkbox|radio|file|image|reset|range|color|hidden)$/i.test(el.type || "");
    return false;
  }
  function deepActive() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }
  function toggle(mode) {
    const el = deepActive();
    if (el && el !== frame) lastFocus = el;
    send({ t: "toggle", mode });
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Fn" || e.key === "Function") fnDown = true;
    if (asking && !e.repeat) {
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); down("cardkey", "enter"); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); down("cardkey", "esc"); return; }
    }
    if (e.key === "Escape" && busy) { send({ t: "island-action", action: "cancel" }); return; }
    if (e.repeat) return;
    const mod = e.key === "Control" || e.key === "Alt" || e.key === "Meta" || e.key === "Fn";
    if (!mod) return;
    const write = e.ctrlKey && e.altKey && !e.metaKey && !e.shiftKey;
    const doIt = e.ctrlKey && !e.altKey && !e.shiftKey && (e.metaKey || fnDown);
    if (write) { e.preventDefault(); toggle("write"); }
    else if (doIt) { e.preventDefault(); toggle("do"); }
  }, true);
  window.addEventListener("keyup", (e) => { if (e.key === "Fn" || e.key === "Function") fnDown = false; }, true);
  window.addEventListener("blur", () => { fnDown = false; });

  /* ---------- writing at the cursor ---------- */
  function insertText(text) {
    let el = lastFocus && lastFocus.isConnected ? lastFocus : deepActive();
    if (!editable(el)) return false;
    try { el.focus({ preventScroll: true }); } catch (_) {}
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? el.value.length;
      try {
        el.setRangeText(text, s, e, "end");
      } catch (_) {
        // Some inputs (email, number) have no selection API: append.
        const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
        d && d.set ? d.set.call(el, el.value + text) : (el.value += text);
      }
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    // Rich editors (Gmail, Slack, WhatsApp Web, Docs comments) take insertText like typing.
    return document.execCommand("insertText", false, text);
  }
  function copyText(text) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.documentElement.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove();
    if (lastFocus && lastFocus.isConnected) try { lastFocus.focus({ preventScroll: true }); } catch (_) {}
    return ok;
  }

  /* ---------- fill this form: the Mac app's matcher, run right here ---------- */
  function fieldLabel(e) {
    let lab = "";
    if (e.id) { const l = document.querySelector('label[for="' + CSS.escape(e.id) + '"]'); if (l) lab = l.innerText; }
    if (!lab) { const l = e.closest("label"); if (l) lab = l.innerText; }
    if (!lab && e.getAttribute("aria-labelledby")) lab = e.getAttribute("aria-labelledby").split(" ").map((id) => document.getElementById(id)?.innerText || "").join(" ");
    if (!lab) lab = e.getAttribute("aria-label") || "";
    if (!lab) { const q = e.closest("[role=listitem],[data-params],fieldset,.form-group"); const h = q && q.querySelector("[role=heading],legend,label"); if (h) lab = h.innerText; }
    return lab.trim().slice(0, 90);
  }
  function fieldKind(f) {
    const h = `${f.ac} ${f.name} ${f.id} ${f.label} ${f.ph}`.toLowerCase();
    if (f.type === "email" || /email|e-mail|ईमेल/.test(h)) return "email";
    if (f.type === "tel" || /\btel\b|phone|mobile|contact (no|number)|whatsapp|फ़ोन|मोबाइल/.test(h)) return "phone";
    if (/given-name|first.?name|fname/.test(h)) return "first";
    if (/family-name|last.?name|surname|lname/.test(h)) return "last";
    if (/(user|company|business|file|org|team|project|nick).?name/.test(h)) return "";
    if (/\bname\b|full.?name|नाम/.test(h)) return "name";
    if (/street-address|address-line1|address|street|पता/.test(h)) return "address";
    return "";
  }
  function fillForm(d) {
    const skip = /^(hidden|submit|button|checkbox|radio|file|password|image|reset|range|color)$/i;
    const els = [...document.querySelectorAll("input,textarea")].filter((e) => {
      if (skip.test(e.type || "") || e.disabled || e.readOnly) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
    if (!els.length) return { fields: 0, filled: 0 };
    const parts = String(d.name || "").trim().split(/\s+/);
    const values = { name: d.name, email: d.email, phone: d.phone, address: d.address, first: parts[0] || "", last: parts.length > 1 ? parts.slice(1).join(" ") : "" };
    let filled = 0;
    for (const e of els) {
      if (String(e.value || "").trim()) continue;
      const k = fieldKind({ ac: e.autocomplete || "", name: e.name || "", id: e.id || "", label: fieldLabel(e), ph: e.placeholder || "", type: (e.type || "").toLowerCase() });
      const v = k && String(values[k] || "").trim();
      if (!v) continue;
      const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), "value");
      e.focus(); desc && desc.set ? desc.set.call(e, v) : (e.value = v);
      e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); e.blur();
      filled++;
    }
    return { fields: els.length, filled };
  }

  /* ---------- from the background ---------- */
  chrome.runtime.onMessage.addListener((m, _s, reply) => {
    if (!m || !m.t) return;
    if (m.t === "state") {
      const st = m.payload?.state;
      asking = st === "ask";
      busy = st === "listening" || st === "thinking" || st === "think";
      if (asking) setOver(true); else if (!over) setOver(false);
      down("state", m.payload);
    }
    else if (m.t === "level") down("level", m.payload);
    else if (m.t === "insert") { const ok = insertText(m.text); if (!ok) copyText(m.text); reply({ ok }); return; }
    else if (m.t === "copy") { reply({ ok: copyText(m.text) }); return; }
    else if (m.t === "fill") { reply(fillForm(m.details || {})); return; }
    else if (m.t === "editable") { const el = lastFocus && lastFocus.isConnected ? lastFocus : deepActive(); reply({ ok: editable(el) }); return; }
  });

  mount();
  send({ t: "hello" });
})();
