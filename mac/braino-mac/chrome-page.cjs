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

const CHROME_APPS = ["Google Chrome", "Google Chrome Beta", "Google Chrome Canary", "Brave Browser"];
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
  const res = await runJs(READ_JS, app || "Google Chrome");
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
  return `(function(){var e=${target};if(!e)return 'BRAINO_GONE';
    e.scrollIntoView({block:'center'});e.click();
    return 'BRAINO_OK '+(e.innerText||e.value||'').trim().slice(0,60);})()`;
}

async function actOnChrome(idx, kind, value, app) {
  const res = await runJs(actionJs(idx, kind, value), app || "Google Chrome");
  if (!res.ok) return { ok: false, error: `${res.reason}: ${res.detail}` };
  if (res.out === "BRAINO_GONE") return { ok: false, error: "That element is no longer on the page." };
  if (res.out.startsWith("BRAINO_OK")) return { ok: true, did: res.out.slice(10) };
  return { ok: false, error: res.out.slice(0, 160) };
}

function isChromeApp(appName) {
  return CHROME_APPS.includes(String(appName || "").trim());
}

module.exports = { readChromePage, actOnChrome, isChromeApp, runJs, CHROME_APPS };
