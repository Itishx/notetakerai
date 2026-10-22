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

/* Everything visible you could act on, in the order a person would find it.
 *
 * Form boxes are never dropped (2026-10-23). The n8n signup page showed one
 * email box and a Continue button; the read kept only boxes with text in them,
 * an empty box has none, so to him the box did not exist and he clicked
 * Continue on an empty form for six steps. A box is now named the way a person
 * reads it (its label, its placeholder, its kind) and says what it holds and
 * whether it is greyed out. Shadow DOM and same-origin frames are read too:
 * embedded sign-in forms live there. What the page says is wrong (an alert,
 * "invalid email") comes along as "!" lines. */
const READ_JS = `(function(){
  try {
    var sel = 'a,button,input,select,textarea,[contenteditable="true"],[contenteditable=""],[role="button"],[role="link"],[role="tab"],[role="option"],[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],[role="combobox"],[role="textbox"],[onclick]';
    var all = [], notes = [];
    function walk(root, depth){
      if (depth > 4) return;
      try { root.querySelectorAll('[data-braino-idx]').forEach(function(e){ e.removeAttribute('data-braino-idx'); }); } catch(_){}
      var found = root.querySelectorAll(sel);
      for (var i = 0; i < found.length; i++) all.push(found[i]);
      var kids = root.querySelectorAll('*');
      for (var j = 0; j < kids.length; j++) {
        var k = kids[j];
        if (k.shadowRoot) walk(k.shadowRoot, depth + 1);
        if (k.tagName === 'IFRAME') { try { if (k.contentDocument) walk(k.contentDocument, depth + 1); } catch(_){} }
      }
      try { root.querySelectorAll('[role="alert"],[aria-live="assertive"],[aria-invalid="true"] ~ *,.error,.error-message,[class*="error"]').forEach(function(n){
        var x = (n.innerText || '').trim().replace(/\\s+/g,' ');
        if (x && x.length < 160 && notes.indexOf(x) < 0 && notes.length < 4) notes.push(x);
      }); } catch(_){}
    }
    walk(document, 0);
    function labelOf(e){
      var t = e.getAttribute('aria-label');
      if (!t && e.getAttribute('aria-labelledby')) { t = e.getAttribute('aria-labelledby').split(' ').map(function(id){ var l = (e.getRootNode().getElementById ? e.getRootNode().getElementById(id) : document.getElementById(id)); return l ? l.innerText : ''; }).join(' '); }
      if (!t && e.id) { try { var l = (e.getRootNode().querySelector ? e.getRootNode() : document).querySelector('label[for="' + CSS.escape(e.id) + '"]'); if (l) t = l.innerText; } catch(_){} }
      if (!t && e.closest) { var w = e.closest('label'); if (w) t = w.innerText; }
      if (!t) t = e.getAttribute('placeholder') || e.getAttribute('title') || e.getAttribute('name') || e.id || '';
      return t;
    }
    var out = [], n = 0, els = [];
    for (var i = 0; i < all.length && n < ${READ_CAP}; i++) {
      var e = all[i], r = e.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      var st = getComputedStyle(e);
      if (st.visibility === 'hidden' || st.display === 'none' || st.opacity === '0') continue;
      var tag = e.tagName.toLowerCase();
      var field = tag === 'input' || tag === 'textarea' || tag === 'select' || e.isContentEditable || /^(textbox|combobox|checkbox|radio|switch)$/.test(e.getAttribute('role') || '');
      if (tag === 'input' && /^(hidden)$/i.test(e.type)) continue;
      var kind = tag === 'input' ? 'input:' + (e.type || 'text') : (e.isContentEditable && tag !== 'input' ? 'textbox' : tag);
      var t;
      if (field) {
        t = labelOf(e) || ('the ' + (e.type || tag) + ' box');
      } else {
        t = e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('title') || '';
      }
      t = String(t).trim().replace(/\\s+/g, ' ');
      if (!t) continue;
      if (tag === 'select') t = t.slice(0, 50) + ' (choices: ' + [].map.call(e.options, function(o){ return o.text.trim(); }).filter(Boolean).slice(0, 12).join(', ').slice(0, 160) + ')';
      var flags = [];
      if (r.bottom <= 0 || r.top >= innerHeight) flags.push('offscreen');
      if (e.disabled || e.getAttribute('aria-disabled') === 'true') flags.push('disabled');
      if ((e.type === 'checkbox' || e.type === 'radio') ? e.checked : e.getAttribute('aria-checked') === 'true') flags.push('checked');
      if (document.activeElement === e) flags.push('focused');
      /* The red outline a person sees after a failed submit: the browser's own
         "please fill this in", only once the box has been touched or sent. */
      if (field && e.willValidate && e.validity && !e.validity.valid && (e.value || e.form && e.form.__brainoTried)) flags.push('invalid');
      e.setAttribute('data-braino-idx', String(n));
      els.push(e);
      var line = '[' + n + '] ' + kind + flags.map(function(f){ return ' (' + f + ')'; }).join('') + ' "' + t.slice(0, tag === 'select' ? 230 : 70) + '"';
      if (field && tag !== 'select' && e.type !== 'checkbox' && e.type !== 'radio') {
        var v = e.isContentEditable ? e.innerText : e.value;
        v = String(v || '').replace(/\\s+/g, ' ');
        line += e.type === 'password' ? (v ? ' = "(filled, ' + v.length + ' characters)"' : ' = ""') : ' = "' + v.slice(0, 60) + '"';
      } else if (tag === 'select' && e.selectedOptions && e.selectedOptions[0]) {
        line += ' = "' + e.selectedOptions[0].text.slice(0, 60) + '"';
      }
      out.push(line);
      n++;
    }
    /* The middle of the page, always offered last.
     *
     * Some editors have nothing to click. Google Docs draws its body on a
     * canvas: no contenteditable, no textbox role, no accessible region at all,
     * so the ONLY text field on the page is the title input. That is why a
     * whole document got typed into its own name. There was nothing else to aim
     * at. A person clicks the middle of the page and starts typing. */
    var cx = Math.round(innerWidth / 2), cy = Math.round(innerHeight / 2);
    var mid = document.elementFromPoint(cx, cy);
    if (mid && n < ${READ_CAP}) {
      mid.setAttribute('data-braino-idx', String(n));
      els.push(mid);
      out.push('[' + n + '] region "the page body, click here to put the cursor in it"');
      n++;
    }
    window.__brainoEls = els;
    /* What just appeared on the page, in words. After "Sign up" the page said
       "Sent." and he could not see it, because only things to click are
       listed; a person reads the new line at once. Lines new since the last
       read on this page, short ones only. */
    try {
      var lines = (document.body.innerText || '').split('\\n').map(function(x){ return x.trim(); }).filter(function(x){ return x && x.length < 160; });
      var prev = window.__brainoText;
      if (prev) {
        var seen = {}; prev.forEach(function(x){ seen[x] = 1; });
        var fresh = lines.filter(function(x){ return !seen[x]; }).slice(0, 5);
        fresh.forEach(function(x){ if (notes.indexOf(x) < 0) notes.push('NEW: ' + x); });
      }
      window.__brainoText = lines.slice(0, 2000);
    } catch(_){}
    notes.forEach(function(x){ out.push('! "' + x + '"'); });
    var head = document.title + ' :: ' + location.href;
    return head + '\\n' + out.join('\\n');
  } catch (err) { return 'BRAINO_ERR ' + err.message; }
})()`;

/* The element a read numbered, wherever it lives (shadow DOM, a frame). */
const FIND = (idx) => `((window.__brainoEls&&window.__brainoEls[${Number(idx)}])||document.querySelector('[data-braino-idx="${Number(idx)}"]'))`;

async function readChromePage(app) {
  const res = await runJs(READ_JS, chromeScriptName(app));
  if (!res.ok) return { ok: false, reason: res.reason, detail: res.detail, elements: [], text: "" };
  return parseRead(res.out);
}

/* The read's text, as elements. Shared with Braino's own browser. */
function parseRead(out) {
  out = String(out || "");
  if (out.startsWith("BRAINO_ERR")) return { ok: false, reason: "page_error", detail: out.slice(0, 200), elements: [], text: "" };
  const lines = out.split("\n");
  const [title, url] = String(lines.shift() || "").split(" :: ");
  const elements = lines.map((line) => {
    const m = /^\[(\d+)\] (\S+)((?: \([a-z]+\))*) "(.*?)"(?: = "(.*)")?$/.exec(line);
    return m ? { index: Number(m[1]), role: m[2], name: m[4], value: m[5], offscreen: m[3].includes("(offscreen)"), disabled: m[3].includes("(disabled)") } : null;
  }).filter(Boolean);
  const notes = lines.filter((line) => line.startsWith('! "')).map((line) => line.slice(3, -1));
  return { ok: true, title: title || "", url: url || "", elements, notes, text: [title, url, ...lines].join("\n") };
}

/* Act on what the read stamped, never on a fresh index. */
function actionJs(idx, kind, value) {
  const target = FIND(idx);
  if (kind === "type") {
    return `(function(){var e=${target};if(!e)return 'BRAINO_GONE';e.focus();
      var v=${JSON.stringify(String(value ?? ""))};
      /* A dropdown: pick the option whose words match, like a person reading
         the list, not a value only the page's code knows. */
      if(e.tagName==='SELECT'){var want=v.trim().toLowerCase(),hit=-1;
        for(var i=0;i<e.options.length;i++){var o=e.options[i],t=(o.text||'').trim().toLowerCase();
          if(t===want||(o.value||'').toLowerCase()===want){hit=i;break;}
          if(hit<0&&want&&t.indexOf(want)>=0)hit=i;}
        if(hit<0)return 'BRAINO_NO_OPTION No option matches "'+v+'". The choices are: '+[].map.call(e.options,function(o){return o.text.trim();}).join(', ');
        e.selectedIndex=hit;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
        return 'BRAINO_OK picked '+e.options[hit].text.trim();}
      var setter=Object.getOwnPropertyDescriptor(e.constructor.prototype,'value');
      if(setter&&setter.set){setter.set.call(e,v);}else{e.value=v;}
      e.dispatchEvent(new Event('input',{bubbles:true}));
      e.dispatchEvent(new Event('change',{bubbles:true}));
      /* What real typing also sends: a key coming up, and leaving the box. n8n
         kept Continue greyed out after a typed email until Tab (2026-10-23),
         because it checks the box on those, not on input. Focus stays put. */
      e.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:v.slice(-1)||'a'}));
      e.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
      /* The whole value, and whether it matches: a 60 character echo made a
         90 character address look cut off, and he retyped it six times (2026-10-15). */
      return 'BRAINO_OK '+((e.value===v)?'exact match, '+v.length+' characters: ':'differs, field now holds: ')+(e.value||'').slice(0,400);})()`;
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
  var e=${FIND(idx)};
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

/* Bring the browser to the front, and say whether it got there.
 *
 * A coordinate click lands on whatever is on TOP of the screen, not on the
 * window we read the page from. Testing this typed a sentence into the user's
 * Cursor chat because Chrome was behind it, and the same mistake is the likely
 * cause of an earlier "Braino messed up my cursor command". Clicking blind into
 * another app is the one failure here that can do real damage, so nothing is
 * clicked until the browser is confirmed frontmost. */
function frontAppName() {
  return new Promise((resolve) => {
    execFile("/usr/bin/osascript", ["-e", 'tell application "System Events" to name of first application process whose frontmost is true'],
      { timeout: 8000 }, (error, stdout) => resolve(error ? "" : String(stdout || "").trim()));
  });
}

async function focusChrome(app) {
  const target = chromeScriptName(app);
  await new Promise((resolve) => {
    execFile("/usr/bin/osascript", ["-e", `tell application ${JSON.stringify(target)} to activate`],
      { timeout: 8000 }, () => resolve());
  });
  for (let tries = 0; tries < 12; tries += 1) {
    const front = await frontAppName();
    if (front && (front === target || target.startsWith(front) || front.startsWith(target))) return { ok: true, front };
    await new Promise((r) => setTimeout(r, 150));
  }
  return { ok: false, front: await frontAppName() };
}

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

module.exports = { readChromePage, actOnChrome, chromePointFor, focusChrome, pageSignature, isChromeApp, chromeScriptName, runJs, CHROME_APPS, READ_JS, parseRead, actionJs, SIGNATURE_JS, FIND };
