/**
 * cowork-design.cjs — Braino Cowork Ability #1: "look at this and ask Claude
 * Design to make a better version."
 *
 * The whole thing is a DETERMINISTIC step machine. The intelligence layer
 * (classifyIntentLLM in main.cjs) decides IF this runs — a vague ask like
 * "help me design something better for the website" routes here — but once it
 * runs, every step is fixed and every transition is gated on a VISION CHECK
 * (a screenshot Braino actually looks at) instead of a blind timer. Nothing
 * about the target UI is hardcoded to coordinates; Braino sees the screen and
 * acts, the same way a person would.
 *
 * Flow (each step vision-verified before advancing):
 *   1. SEE      — screenshot the current screen, confirm it's a website.
 *   2. CAPTURE  — scroll top→bottom, screenshot each viewport, save the run to
 *                 ~/Desktop/Braino Cowork/<stamp>/ as page-01.png, page-02...
 *   3. OPEN     — open Claude Design, screenshot, confirm we actually landed.
 *   4. CONTEXT  — read how many chats / files are already there (vision).
 *   5. UPLOAD   — attach the saved screenshots.
 *   6. PROMPT   — Braino writes the design brief himself, types it, sends.
 *   7. TRACK    — poll Claude's replies and narrate progress (cowork loop).
 *
 * This module owns NO IPC and NO globals of its own — main.cjs injects the
 * primitives it already has (screenshot, osascript, chrome, vision, notch
 * label, logging) so there is one source of truth for each capability.
 */

// The design surface Braino hands off to. Override with BRAINO_CLAUDE_DESIGN_URL
// env var. Default is a placeholder — set this to the REAL Claude Design URL.
const CLAUDE_DESIGN_URL = process.env.BRAINO_CLAUDE_DESIGN_URL || "https://claude.ai/new";

/**
 * @param {object} io  primitives injected from main.cjs:
 *   captureFile(destPath)         -> {ok}         screencapture -x to a real file
 *   captureB64()                  -> {ok,base64}  downscaled shot for vision
 *   vision(question, base64)      -> {ok,say}     GPT vision, one-line answer
 *   key(keyCode, mods?)           -> Promise      osascript key press
 *   type(text)                    -> Promise      osascript keystroke
 *   openChromeUrl(url)            -> Promise      focus/open a Chrome tab
 *   activate(appName)             -> Promise      bring an app to the front
 *   notch(label)                  -> void         set the island's cowork label
 *   say(line)                     -> Promise      speak + narrate
 *   log(event, data?)             -> void         logMac passthrough
 *   homeDir, path, fs, wait
 */
function makeDesignCowork(io) {
  const { path, fs, wait } = io;

  const runDir = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const dir = path.join(io.homeDir, "Desktop", "Braino Cowork", stamp);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };

  // A vision gate: ask Braino a yes/no about the current screen; retry a few
  // times before giving up, so a slow page load never fails the whole run.
  async function confirm(question, tries = 3) {
    for (let i = 0; i < tries; i++) {
      const shot = await io.captureB64();
      if (shot.ok) {
        const verdict = await io.vision(`${question} Answer only YES or NO.`, shot.base64);
        if (verdict.ok && /\byes\b/i.test(verdict.say)) return true;
      }
      await wait(1200);
    }
    return false;
  }

  async function readCount(question) {
    const shot = await io.captureB64();
    if (!shot.ok) return "";
    const v = await io.vision(question, shot.base64);
    return v.ok ? v.say.trim() : "";
  }

  return async function runDesignCowork(raw) {
    io.notch("co-work", "You asked me to get Claude Design to make a better version of what you are looking at. Let me start.");
    io.log("cowork.design.start", { raw });

    // The target is whatever browser was in front when he was asked. We lock
    // onto it and re-focus it before every keystroke, so scrolls always land
    // on the website and never on WhatsApp / Cursor / Spotify as focus drifts.
    const target = (io.frontApp && io.frontApp()) || "Google Chrome";
    const focus = async () => { await io.activate(target); await wait(350); };

    // 1 — SEE. Is the user actually on a website worth redesigning?
    await io.say("Let me look at what you're working on.");
    await focus();
    const onSite = await confirm("Is this screen a website or web page open in a browser (not a chat app, editor, or music player)?");
    if (!onSite) {
      io.notch("");
      return { ok: false, say: "I don't see a website on screen right now. Open the site you want redesigned, bring it to the front, then ask me again." };
    }

    // 2 — CAPTURE. Scroll the whole page, saving each viewport to the run dir.
    const dir = runDir();
    io.notch("capturing", "I am scrolling through your website from the top, grabbing a screenshot of every section so Claude can see the whole thing, not just what fits on one screen.");
    await io.say("Scrolling through the whole thing and grabbing shots.");
    await focus();
    await io.key(126, "command"); // Cmd+Up: jump to top
    await wait(800);
    const shots = [];
    const MAX_PAGES = 12;
    for (let i = 0; i < MAX_PAGES; i++) {
      await focus(); // keep the website frontmost for the screenshot + scroll
      const dest = path.join(dir, `page-${String(i + 1).padStart(2, "0")}.png`);
      const cap = await io.captureFile(dest);
      if (cap.ok) { shots.push(dest); io.log("cowork.design.page", { index: i + 1 }); }
      await io.key(121); // Page Down
      await wait(950);
      // stop once we've reached the bottom (vision-checked from page 3 on)
      if (i >= 2 && await confirm("Is this the very bottom of the page, with no more content below to scroll to?", 1)) break;
    }
    io.log("cowork.design.captured", { count: shots.length, dir });
    if (!shots.length) {
      io.notch("");
      return { ok: false, say: "I couldn't capture the page. Check Screen Recording permission for Braino and try again." };
    }

    // 3 — OPEN Claude Design, and verify we actually got there.
    io.notch("opening", "I have saved all the shots. Now I am opening Claude Design in your browser so I can hand them over.");
    await io.say(`Got ${shots.length} shots. Opening Claude Design.`);
    await io.openChromeUrl(CLAUDE_DESIGN_URL);
    await io.activate(target); // the design tab lives in the same browser
    await wait(2600);
    const landed = await confirm("Is this Claude (claude.ai), a chat or design surface, now open and ready for input?");
    if (!landed) {
      io.notch("");
      return { ok: false, say: `I saved the ${shots.length} screenshots to your Desktop under Braino Cowork, but I couldn't confirm Claude Design opened. Take it from here?`, files: shots };
    }

    // 4 — CONTEXT. Read what's already in there (chats / files), for the log.
    const chats = await readCount("Roughly how many past chats are listed in the sidebar? Reply with just a number or 'none'.");
    io.log("cowork.design.context", { chats });

    // 5 — UPLOAD the saved screenshots. The whole run folder is attached at
    // once via the native Open panel (Go-to-Folder → select all), so he never
    // has to click each file. Verified by vision afterwards.
    io.notch("uploading", "I am clicking the attach button and pulling in the whole folder of screenshots I just took, all at once.");
    await io.say(`Attaching the ${shots.length} screenshots.`);
    let uploaded = false;
    if (io.attachFiles) {
      uploaded = await io.attachFiles(dir, shots);
      await wait(2200);
      // verify the thumbnails actually landed in the composer
      uploaded = await confirm("Are there image attachments or file thumbnails now showing in the message input, ready to send?", 2);
    }
    if (!uploaded) {
      io.log("cowork.design.upload_unconfirmed", {});
      await io.say("I couldn't confirm the upload attached. The shots are on your Desktop under Braino Cowork if you want to drag them in.");
    }

    // 6 — PROMPT. Braino writes the brief himself from what he saw.
    io.notch("writing", "Now I am writing the design brief myself, from what I actually saw on your site: what is weak, and what a stronger version should feel like.");
    const brief = await composeBrief(io, shots[0]);
    await io.activate(target);
    await wait(300);
    await io.type(brief);
    await wait(500);
    await io.key(36); // Return: send
    io.log("cowork.design.sent", { briefChars: brief.length });

    // 7 — TRACK. Watch Claude's reply as a cowork loop, narrate when it's done.
    io.notch("watching", "Sent. I am keeping an eye on what Claude comes back with, and I will tell you the moment there is a first pass.");
    await io.say("Sent. I'll keep an eye on what Claude comes back with.");
    let settled = false;
    for (let i = 0; i < 20; i++) {
      await wait(4000);
      const done = await confirm("Has Claude finished a full reply (it is idle, not mid-generating)?", 1);
      if (done) { settled = true; break; }
    }
    io.notch("co-work", "");
    return {
      ok: true,
      say: settled
        ? "Claude Design has a first pass back. Want me to tell you what it changed, or send a follow-up?"
        : "Claude's still working on it. I'll let you know when it lands.",
      files: shots,
    };
  };

  // Braino's own design brief, grounded in the first screenshot he took.
  async function composeBrief(io, firstShot) {
    const b64 = await io.fileToB64(firstShot);
    const q = [
      "You are Braino, briefing Claude Design on your human's behalf. You are looking at a screenshot of their current website.",
      "Write a short, direct design brief (3 to 5 sentences) asking for a stronger version: name what's weak in the current design, and what a better version should feel like. First person, warm, no preamble, no markdown.",
    ].join("\n");
    const v = await io.vision(q, b64);
    return v.ok && v.say
      ? v.say.trim()
      : "Here are screenshots of a website I'd like redesigned. Please propose a cleaner, more confident version: better type hierarchy, more considered spacing, and a stronger visual point of view. Keep the content, lift the craft.";
  }
}

module.exports = { makeDesignCowork, CLAUDE_DESIGN_URL };
