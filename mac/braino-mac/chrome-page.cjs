/* Reading the page Braino is actually looking at.
 *
 * The accessibility tree was never going to work for the web. Chrome exposes
 * its own furniture through it and almost nothing of the page, so a run against
 * BookMyShow was handed browser chrome and a note that content was hidden, and
 * reasoned perfectly on top of nothing: it scrolled five times hunting a "Book
 * tickets" button that was in the middle of the screen.
 *
 * Chrome will run JavaScript for us instead, through the same AppleScript door
 * Braino already uses to list tabs, provided "Allow JavaScript from Apple
 * Events" is on. That is worth more than it sounds:
 *
 *   - it is the REAL page, the DOM, not a summary of it
 *   - it is the user's OWN tab, already signed in, so no profile copying, no
 *     second browser, and no Chrome 136 remote-debugging consent sheet
 *   - they can watch it happen in the window they were already looking at
 *
 * Elements are stamped with data-braino-idx during the read and acted on by
 * that stamp afterwards. Indexes into a fresh querySelectorAll would drift the
 * moment the page moved, and clicking the wrong thing on a checkout page is the
 * one mistake worth engineering against.
 */

const { execFile } = require("node:child_process");

/* Two different names for the same browser, and both are needed.
 *
 * The accessibility helper reports the front app as "Chrome". AppleScript will
 * only answer to "Google Chrome". Matching one against the other is why the
 * page reading never fired once in a real session: isChromeApp("Chrome") was
 * false, so every observation silently fell back to the accessibility tree and
 * a whole Notion run was done blind.
 *
 * Left is what the Mac calls it, right is what AppleScript needs. */
const CHROME_APPS = {
  "Chrome": "Google Chrome",
  "Google Chrome": "Google Chrome",
  "Chrome Beta": "Google Chrome Beta",
  "Google Chrome Beta": "Google Chrome Beta",
  "Chrome Canary": "Google Chrome Canary",
  "Google Chrome Canary": "Google Chrome Canary",
  "Brave": "Brave Browser",
  "Brave Browser": "Brave Browser",
  "Chromium": "Chromium",
};
const READ_CAP = 120;

function runJs(js, app = "Google Chrome", timeoutMs = 15000) {
  const script = `tell application ${JSON.stringify(app)} to execute front window's active tab javascript ${JSON.stringify(js)}`;
  return new Promise((resolve) => {
    execFile("/usr/bin/osascript", ["-e", script], { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = String(stderr || error.message || "");
          /* -2741 is our own quoting, not their setting. Telling these apart
             matters: one is a bug, the other is a checkbox the user must tick. */
          const reason = /Allow JavaScript from Apple Events|not allowed|-1743/i.test(detail)
            ? "javascript_not_allowed"
            : /Application isn.t running|-600/i.test(detail) ? "chrome_not_running"
            : /-2741|syntax error/i.test(detail) ? "bad_script"
            : "failed";
          return resolve({ ok: false, reason, detail: detail.slice(0, 300) });
        }
        resolve({ ok: true, out: String(stdout || "").trim() });
      });
  });
}

/* Everything visible you could act on, in the order a person would find it. */
const READ_JS = `(function(){
  try {
    document.querySelectorAll('[data-braino-idx]').forEach(function(e){ e.removeAttribute('data-braino-idx'); });
    var sel = 'a,button,input,select,textarea,[role="button"],[role="link"],[role="tab"],[role="option"],[onclick]';
    var els = document.querySelectorAll(sel), out = [], n = 0;
    for (var i = 0; i < els.length && n < ${READ_CAP}; i++) {
      var e = els[i], r = e.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      var st = getComputedStyle(e);
      if (st.visibility === 'hidden' || st.display === 'none' || st.opacity === '0') continue;
      var t = (e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ');
      if (!t) continue;
      var onScreen = r.bottom > 0 && r.top < innerHeight;
      e.setAttribute('data-braino-idx', String(n));
      out.push('[' + n + '] ' + e.tagName.toLowerCase() + (onScreen ? '' : ' (offscreen)') + ' "' + t.slice(0, 70) + '"');
      n++;
    }
    var head = document.title + ' :: ' + location.href;
    return head + '\\n' + out.join('\\n');
  } catch (err) { return 'BRAINO_ERR ' + err.message; }
})()`;

async function readChromePage(app) {
  const res = await runJs(READ_JS, chromeScriptName(app));
  if (!res.ok) return { ok: false, reason: res.reason, detail: res.detail, elements: [], text: "" };
  if (res.out.startsWith("BRAINO_ERR")) return { ok: false, reason: "page_error", detail: res.out.slice(0, 200), elements: [], text: "" };
  const lines = res.out.split("\n");
  const [title, url] = String(lines.shift() || "").split(" :: ");
  const elements = lines.map((line) => {
    const m = /^\[(\d+)\] (\S+)(?: \(offscreen\))? "(.*)"$/.exec(line);
    return m ? { index: Number(m[1]), role: m[2], name: m[3], offscreen: line.includes("(offscreen)") } : null;
  }).filter(Boolean);
  return { ok: true, title: title || "", url: url || "", elements, text: [title, url, ...lines].join("\n") };
}

/* Act on what the read stamped, never on a fresh index. */
function actionJs(idx, kind, value) {
  const target = `document.querySelector('[data-braino-idx="' + ${JSON.stringify(String(idx))} + '"]')`;
  if (kind === "type") {
    return `(function(){var e=${target};if(!e)return 'BRAINO_GONE';e.focus();
      var v=${JSON.stringify(String(value ?? ""))};
      var setter=Object.getOwnPropertyDescriptor(e.constructor.prototype,'value');
      if(setter&&setter.set){setter.set.call(e,v);}else{e.value=v;}
      e.dispatchEvent(new Event('input',{bubbles:true}));
      e.dispatchEvent(new Event('change',{bubbles:true}));
      return 'BRAINO_OK '+(e.value||'').slice(0,60);})()`;
  }
  if (kind === "press") {
    return `(function(){var e=${target}||document.activeElement;if(!e)return 'BRAINO_GONE';
      var k=${JSON.stringify(String(value || "Enter"))};
      ['keydown','keypress','keyup'].forEach(function(t){
        e.dispatchEvent(new KeyboardEvent(t,{key:k,code:k,bubbles:true}));});
      if(k==='Enter'&&e.form)e.form.requestSubmit&&e.form.requestSubmit();
      return 'BRAINO_OK '+k;})()`;
  }
  /* A real press, not element.click().
   *
   * element.click() is a synthetic shortcut, and serious web apps ignore it:
   * they listen for the sequence a mouse actually produces. Google Docs was
   * clicked on "Blank document" four times, reported success four times, and
   * never opened a document. He was not blind and he was not stupid. He was
   * given a hand that does not press.
   *
   * The whole sequence goes out, and on the nearest thing above the element
   * that looks clickable, because these tiles are usually a plain div with the
   * handler sitting on an ancestor. */
  return `(function(){
    var e=${target};if(!e)return 'BRAINO_GONE';
    e.scrollIntoView({block:'center'});
    var t=e.closest('a,button,[role="button"],[role="link"],[onclick],[jsaction]')||e;
    var r=t.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
    var o={bubbles:true,cancelable:true,composed:true,view:window,clientX:x,clientY:y,button:0,buttons:1};
    try{ t.focus({preventScroll:true}); }catch(_){}
    ['pointerover','pointerenter','pointerdown','mousedown','pointerup','mouseup','click'].forEach(function(type){
      var Ctor = type.indexOf('pointer')===0 && window.PointerEvent ? PointerEvent : MouseEvent;
      var init = Ctor===PointerEvent ? Object.assign({pointerId:1,pointerType:'mouse',isPrimary:true},o) : o;
      if(type==='pointerup'||type==='mouseup'||type==='click') init=Object.assign({},init,{buttons:0});
      t.dispatchEvent(new Ctor(type,init));
    });
    return 'BRAINO_OK '+(t.innerText||t.value||t.getAttribute('aria-label')||'').trim().slice(0,60);
  })()`;
}

/* Where an element actually is on the screen.
 *
 * The DOM gives viewport coordinates; a real mouse needs screen ones. The gap
 * between them is the browser's own chrome, which outerHeight minus
 * innerHeight measures without having to know anything about toolbars. */
const POINT_JS = (idx) => `(function(){
  var e=document.querySelector('[data-braino-idx="${idx}"]');
  if(!e) return 'BRAINO_GONE';
  e.scrollIntoView({block:'center'});
  var r=e.getBoundingClientRect();
  if(!r.width||!r.height) return 'BRAINO_GONE';
  var chromeH = window.outerHeight - window.innerHeight;
  var x = Math.round(window.screenX + r.left + r.width/2);
  var y = Math.round(window.screenY + chromeH + r.top + r.height/2);
  var label=(e.innerText||e.value||e.getAttribute('aria-label')||'').trim().slice(0,60);
  return x+','+y+'|'+label;
})()`;

/* What the page looks like right now, cheaply. Address, how much text, how many
   nodes: enough to tell "the click did something" from "the click did nothing",
   and nothing like enough to be a fingerprint. */
const SIGNATURE_JS = "location.href + '|' + document.body.innerText.length + '|' + document.querySelectorAll('*').length";

/* Where the element is, in screen points a real mouse can be sent to. */
async function chromePointFor(idx, app) {
  const res = await runJs(POINT_JS(idx), chromeScriptName(app));
  if (!res.ok) return { ok: false, error: `${res.reason}: ${res.detail}` };
  if (res.out === "BRAINO_GONE") return { ok: false, error: "That element is no longer on the page." };
  const [coords, label] = String(res.out).split("|");
  const [x, y] = coords.split(",").map((n) => Number(n));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, error: "Could not place that element on screen." };
  return { ok: true, x, y, label: label || "" };
}

/* A cheap before/after fingerprint, so "it did nothing" is detectable. */
async function pageSignature(app) {
  const r = await runJs(SIGNATURE_JS, chromeScriptName(app));
  return r.ok ? r.out : null;
}

async function actOnChrome(idx, kind, value, app) {
  const target = chromeScriptName(app);
  /* Success used to mean "the call did not throw", which is how four dead
     clicks were reported as four good ones. Sample before, act, wait, sample
     again: if the page did not move, say so, so he tries something else
     instead of repeating a lie. */
  const before = kind === "click" ? await runJs(SIGNATURE_JS, target) : null;
  const res = await runJs(actionJs(idx, kind, value), target);
  if (!res.ok) return { ok: false, error: `${res.reason}: ${res.detail}` };
  if (res.out === "BRAINO_GONE") return { ok: false, error: "That element is no longer on the page." };
  if (res.out.startsWith("BRAINO_OK")) {
    const did = res.out.slice(10);
    if (kind !== "click" || !before?.ok) return { ok: true, did };
    await new Promise((r) => setTimeout(r, 800));
    const after = await runJs(SIGNATURE_JS, target);
    if (after.ok && after.out && after.out === before.out) {
      return { ok: false, moved: false, error: `I pressed "${did}" and nothing on the page changed.` };
    }
    return { ok: true, did, moved: true };
  }
  return { ok: false, error: res.out.slice(0, 160) };
}

function isChromeApp(appName) {
  return Boolean(CHROME_APPS[String(appName || "").trim()]);
}

/* What AppleScript has to be told to talk to it. */
function chromeScriptName(appName) {
  return CHROME_APPS[String(appName || "").trim()] || "Google Chrome";
}

module.exports = { readChromePage, actOnChrome, chromePointFor, pageSignature, isChromeApp, chromeScriptName, runJs, CHROME_APPS };
