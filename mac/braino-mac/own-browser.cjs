"use strict";
/* Braino's own browser (2026-10-05).
 *
 * Driving the user's Chrome goes through AppleScript and a real mouse: every
 * action is a round trip of one to two seconds, a click lands on whatever app
 * is in front, and there is no way to know a page has finished loading. Jobs
 * he does FOR you (book, order, find the cheapest) run here instead: a window
 * inside the Braino app, hidden unless you ask to see it, where he reads the
 * page with the same reader the loop already uses and acts from inside it.
 * Clicks and typing are sent as real input events, so sites that ignore
 * synthetic clicks still take them. Its logins are its own and are kept. */

const { READ_JS, parseRead, actionJs, SIGNATURE_JS } = require("./chrome-page.cjs");

const PARTITION = "persist:braino-browser";
const LOAD_CAP_MS = 15000;

/* The element's centre in the window, after scrolling it into view. */
const VIEW_POINT_JS = (idx) => `(function(){
  var e=document.querySelector('[data-braino-idx="${String(Number(idx))}"]');
  if(!e) return 'BRAINO_GONE';
  e.scrollIntoView({block:'center'});
  var t=e.closest('a,button,[role="button"],[role="link"],[onclick],[jsaction]')||e;
  var r=t.getBoundingClientRect();
  if(!r.width||!r.height) return 'BRAINO_GONE';
  var label=(t.innerText||t.value||t.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,60);
  return Math.round(r.left+r.width/2)+','+Math.round(r.top+r.height/2)+'|'+label;
})()`;

const FOCUS_JS = (idx) => `(function(){
  var e=document.querySelector('[data-braino-idx="${String(Number(idx))}"]');
  if(!e) return 'BRAINO_GONE';
  e.scrollIntoView({block:'center'});
  e.focus();
  if (typeof e.select === 'function') { try { e.select(); } catch (_) {} }
  else if (e.isContentEditable) { var s=getSelection(), rg=document.createRange(); rg.selectNodeContents(e); s.removeAllRanges(); s.addRange(rg); }
  return 'BRAINO_OK '+(e.getAttribute('aria-label')||e.getAttribute('placeholder')||e.name||'').slice(0,60);
})()`;

const KEY_CODES = { Enter: "Return", Return: "Return", Tab: "Tab", Escape: "Escape", Backspace: "Backspace", ArrowDown: "Down", ArrowUp: "Up", ArrowLeft: "Left", ArrowRight: "Right", Space: "Space", PageDown: "PageDown", PageUp: "PageUp" };

function createOwnBrowser({ BrowserWindow, session, log = () => {} }) {
  let win = null;
  let loading = false;

  function ensure() {
    if (win && !win.isDestroyed()) return win;
    win = new BrowserWindow({
      width: 1280, height: 860, show: false, title: "Braino",
      backgroundColor: "#ffffff",
      webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
    });
    // A plain Chrome user agent: the Electron one gets some sites to refuse.
    const ua = win.webContents.getUserAgent().replace(/\s*Electron\/\S+/, "").replace(/\s*braino[-\w]*\/\S+/i, "");
    win.webContents.setUserAgent(ua);
    session.fromPartition(PARTITION).setUserAgent(ua);
    win.webContents.on("did-start-loading", () => { loading = true; });
    win.webContents.on("did-stop-loading", () => { loading = false; });
    // Pop-ups open in the same window, so there is only ever one page.
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/i.test(url)) win.loadURL(url).catch(() => {}); return { action: "deny" }; });
    win.on("close", (e) => { if (!win.__quitting) { e.preventDefault(); win.hide(); } });
    win.on("closed", () => { win = null; });
    return win;
  }

  /* Until the page stops loading, then a short beat for scripts to paint. */
  async function settle(capMs = LOAD_CAP_MS) {
    const started = Date.now();
    while (loading && Date.now() - started < capMs) await new Promise((r) => setTimeout(r, 80));
    await new Promise((r) => setTimeout(r, 250));
  }

  async function js(code) {
    const w = ensure();
    try { return { ok: true, out: String(await w.webContents.executeJavaScript(code, true) ?? "") }; }
    catch (error) { return { ok: false, error: String(error?.message || error) }; }
  }

  async function open(url) {
    const w = ensure();
    const started = Date.now();
    try { await w.loadURL(String(url)); } catch (error) {
      // ERR_ABORTED is a redirect taking over; the page still arrives.
      if (!/ERR_ABORTED/.test(String(error?.message || error))) return { ok: false, error: String(error?.message || error).slice(0, 160) };
    }
    await settle();
    log("own_browser.open", { url: String(url).slice(0, 120), ms: Date.now() - started });
    return { ok: true, url: w.webContents.getURL() };
  }

  async function read() {
    const started = Date.now();
    await settle(4000);
    const res = await js(READ_JS);
    if (!res.ok) return { ok: false, reason: "page_error", detail: res.error, elements: [], text: "" };
    const page = parseRead(res.out);
    log("own_browser.read", { elements: page.elements?.length || 0, ms: Date.now() - started });
    return page;
  }

  async function signature() { const r = await js(SIGNATURE_JS); return r.ok ? r.out : null; }

  async function click(idx) {
    const w = ensure();
    const at = await js(VIEW_POINT_JS(idx));
    if (!at.ok) return { ok: false, error: at.error };
    if (at.out === "BRAINO_GONE") return { ok: false, error: "That element is no longer on the page." };
    const [xy, label] = at.out.split("|");
    const [x, y] = xy.split(",").map(Number);
    const before = await signature();
    const wc = w.webContents;
    wc.sendInputEvent({ type: "mouseMove", x, y });
    wc.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
    wc.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
    await new Promise((r) => setTimeout(r, 350));
    await settle();
    const after = await signature();
    if (before && after && before === after) {
      // Some handlers only listen for the DOM sequence: the old hand, once.
      const fallback = await js(actionJs(idx, "click"));
      await settle();
      const again = await signature();
      if (!fallback.ok || (again && again === before)) return { ok: false, moved: false, error: `I pressed "${label}" and nothing on the page changed.` };
    }
    return { ok: true, did: label || "", moved: true };
  }

  async function type(idx, text, submit = false) {
    const w = ensure();
    const focused = await js(FOCUS_JS(idx));
    if (!focused.ok) return { ok: false, error: focused.error };
    if (focused.out === "BRAINO_GONE") return { ok: false, error: "That element is no longer on the page." };
    await w.webContents.insertText(String(text ?? ""));
    if (submit) { await new Promise((r) => setTimeout(r, 150)); await press("Enter"); }
    else await new Promise((r) => setTimeout(r, 200));
    return { ok: true, did: focused.out.slice(10) };
  }

  async function typeFocused(text, submit = false) {
    const w = ensure();
    await w.webContents.insertText(String(text ?? ""));
    if (submit) await press("Enter");
    return { ok: true };
  }

  async function press(key = "Enter") {
    const w = ensure();
    const keyCode = KEY_CODES[key] || String(key);
    w.webContents.sendInputEvent({ type: "keyDown", keyCode });
    // Enter submits a form only when its character arrives too.
    if (keyCode === "Return") w.webContents.sendInputEvent({ type: "char", keyCode: "\r" });
    else if (keyCode.length === 1) w.webContents.sendInputEvent({ type: "char", keyCode });
    w.webContents.sendInputEvent({ type: "keyUp", keyCode });
    await new Promise((r) => setTimeout(r, 200));
    await settle();
    return { ok: true, did: key };
  }

  async function scroll(dy = 600) {
    const w = ensure();
    const [width, height] = w.getContentSize();
    w.webContents.sendInputEvent({ type: "mouseWheel", x: Math.round(width / 2), y: Math.round(height / 2), deltaX: 0, deltaY: -Number(dy) });
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true };
  }

  async function screenshotBase64() {
    const w = ensure();
    const img = await w.webContents.capturePage();
    return img.resize({ width: Math.min(1280, img.getSize().width) }).toJPEG(75).toString("base64");
  }

  function url() { return win && !win.isDestroyed() ? win.webContents.getURL() : ""; }
  function show() { const w = ensure(); w.show(); w.focus(); return { ok: true }; }
  // On screen without taking the keyboard: you can watch while you keep typing.
  function reveal() { const w = ensure(); if (!w.isVisible()) w.showInactive(); return { ok: true }; }
  function hide() { if (win && !win.isDestroyed()) win.hide(); return { ok: true }; }
  function visible() { return Boolean(win && !win.isDestroyed() && win.isVisible()); }
  function destroy() { if (win && !win.isDestroyed()) { win.__quitting = true; win.destroy(); } win = null; }

  /* A script in the page, for the loop's exec_js: same answer shape as runJs. */
  async function run(code) {
    await settle(4000);
    const r = await js(code);
    return r.ok ? { ok: true, out: r.out } : { ok: false, reason: "page_error", detail: r.error };
  }

  return { open, read, click, type, typeFocused, press, scroll, screenshotBase64, url, show, reveal, hide, visible, destroy, signature, run };
}

/* Jobs he does FOR you on the web, not pages you want to look at yourself.
   "Book", "order", "find me the cheapest" go to his browser; "open", "show me",
   "play" stay in yours. */
const DO_FOR_ME = /\b(?:book|order|buy|purchase|reserve|check ?out|fill (?:out|in)|apply for|sign me up|register me|find (?:me )?(?:the )?(?:\d+|two|three|four|five|cheapest|best|top|lowest)|compare|get me (?:a |the )?(?:quote|price|tickets?)|tickets? (?:for|to))\b/i;
const SEE_IT_MYSELF = /\b(?:show me|open (?:it|this|that) for me|let me see|i want to see|pull up|on my screen|in my (?:chrome|browser))\b/i;
function wantsOwnBrowser(command) {
  const t = String(command || "");
  return DO_FOR_ME.test(t) && !SEE_IT_MYSELF.test(t);
}

module.exports = { createOwnBrowser, wantsOwnBrowser, PARTITION, VIEW_POINT_JS, FOCUS_JS };
