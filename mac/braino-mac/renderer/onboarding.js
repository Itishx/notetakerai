"use strict";

/* First run, the white half: the questions, and the hello at the end.
 *
 * The boot screen is his — black, his colour, his character. The moment the bar
 * finishes the ground turns white, because that change is what says the machine
 * has stopped starting and a conversation has started. Apple makes the same
 * turn between booting and Setup Assistant.
 *
 * STEPS is deliberately a plain array. The shape of the run is the thing that
 * had to be built; which six things he says while you walk through it is a
 * content decision, and this is where to make it without touching the machine
 * underneath.
 *
 * Two rules the steps obey. Nothing is typed — every answer is a tap, because a
 * text field on first run is where people quit. And he earns each question by
 * doing something first, so the permission ask arrives after he has shown what
 * he does with it, never before.
 */

(function () {
  /* ── The content. This is the part to double down on. ─────────────────── */
  const STEPS = [
    {
      id: "name",
      kicker: "Hello",
      title: "You're {name}, right?",
      sub: "Pulled from your Mac account. I would rather check than ask.",
      choices: ["That's me", "Not quite"],
      capture: "nameConfirmed",
    },
    {
      id: "persona",
      kicker: "Step 1",
      title: "What kind of days do I run?",
      sub: "It changes what I watch for and what I bring you first.",
      choices: ["Student", "Founder", "Engineer", "Designer", "Writer", "Corporate", "Something else"],
      capture: "persona",
    },
    {
      id: "meetings",
      kicker: "Step 2",
      title: "I sit in your meetings. Nobody sees me.",
      sub: "No bot joins the call. No recording banner. I hear what your Mac hears and write it up after.",
      show: "meeting",
      choices: ["Good"],
    },
    {
      id: "time",
      kicker: "Step 3",
      title: "Here's where your week goes.",
      sub: "Rough, from what these do for people already using them.",
      show: "time",
      choices: ["Alright, go on"],
    },
    {
      id: "permissions",
      kicker: "Step 4",
      title: "Now I'll need your calendar.",
      sub: "Calendar, Reminders and Contacts. One ask, and it never leaves this Mac.",
      choices: ["Allow", "Not now"],
      capture: "permissions",
      native: "calendar",
    },
    {
      id: "voice",
      kicker: "Step 5",
      title: "Hold Control twice and just talk.",
      sub: "That's the whole thing. No button to find.",
      choices: ["Got it"],
    },
    {
      id: "always",
      kicker: "Step 6",
      title: "Or I can just be here.",
      sub: "Say my name and I answer. I ignore everything else in the room, and nothing leaves this Mac until I hear it. Your call.",
      show: "always",
      /* The quiet option is deliberately first and worded as a real choice
         rather than a decline. A microphone question where one answer reads as
         the sensible one is not a question. */
      choices: ["Only when I press Control twice", "Yes, listen for my name"],
      capture: "alwaysOn",
      native: "namedMode",
    },
  ];

  const SHOWS = {
    /* The picture argues the thing the sentence claims: he is in the call, and
       the call has no idea. The missing recording badge is the whole point. */
    meeting: () => `
      <div class="onbm-show">
        <div class="onbm-show-bar"><i></i><i></i><i></i><em>Weekly sync · 4 people</em></div>
        <div class="onbm-show-body">
          <div class="onbm-faces"><span></span><span></span><span></span><span></span></div>
          <span class="onbm-invisible">No bot in the room</span>
          <div class="onbm-note"><b>Braino</b> You said you'd send the deck by Thursday.</div>
        </div>
      </div>`,
    always: () => `
      <div class="onbm-show">
        <div class="onbm-show-bar"><i></i><i></i><i></i><em>Someone talking near you</em></div>
        <div class="onbm-show-body">
          <div class="onbm-note onbm-quiet">"Wait, listen, I'll send you the notes."</div>
          <span class="onbm-invisible">He says nothing</span>
          <div class="onbm-note"><b>"Braino,</b> what's my day?"</div>
          <div class="onbm-note"><b>Braino</b> Standup at 11, then you're clear.</div>
        </div>
      </div>`,
    time: () => `
      <div class="onbm-saves">
        <div class="onbm-save"><b>3h / week</b><span>Meeting notes you no longer write up</span></div>
        <div class="onbm-save"><b>40m / day</b><span>Inbox and follow-ups, sorted before you open them</span></div>
        <div class="onbm-save"><b>25m / day</b><span>Looking for a file, a link, a thing you saw once</span></div>
        <div class="onbm-save"><b>Every morning</b><span>Your day, read to you before you ask</span></div>
      </div>`,
  };

  /* A cursive hello, drawn rather than typed. One continuous stroke: the h with
     its ascender loop, e, two looped l's, and the o with its exit flourish. */
  const HELLO_PATH =
    "M 62 220 C 64 176, 74 108, 90 62 C 98 38, 74 30, 70 58 C 66 88, 78 168, 82 220 C 84 176, 98 148, 120 150 C 142 152, 146 190, 140 220 C 138 231, 150 234, 160 226 C 172 218, 186 190, 196 168 C 206 150, 184 146, 174 164 C 164 182, 174 220, 196 223 C 210 226, 222 218, 230 208 C 246 180, 258 112, 270 64 C 278 40, 254 32, 250 60 C 246 90, 258 168, 262 220 C 264 232, 278 235, 288 226 C 304 180, 316 112, 328 64 C 336 40, 312 32, 308 60 C 304 90, 316 168, 320 220 C 322 232, 336 235, 346 225 C 356 214, 366 196, 378 186 C 394 172, 416 180, 420 200 C 424 220, 408 234, 390 230 C 372 226, 366 206, 374 192 C 384 176, 408 174, 418 188 C 426 199, 428 214, 422 224";
    "C 439 226, 431 207, 437 188 C 445 165, 470 157, 489 168 C 505 177, 510 198, 503 213";

  let root = null, stage = null, dotsEl = null, helloEl = null;
  let idx = 0;
  let aborted = false;
  let releaseStep = null;   // resolves whatever click the run is waiting on
  const answers = {};

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function render(step, name) {
    const title = String(step.title).replace("{name}", esc(name || "there"));
    const show = step.show && SHOWS[step.show] ? SHOWS[step.show]() : "";
    return `
      <div class="onbm-step is-live" data-step="${esc(step.id)}">
        <p class="onbm-kicker">${esc(step.kicker)}</p>
        <h2 class="onbm-h">${title}</h2>
        <p class="onbm-sub">${esc(step.sub)}</p>
        ${show}
        <div class="onbm-choices">
          ${step.choices.map((c, i) => `<button type="button" class="onbm-choice" data-i="${i}">${esc(c)}</button>`).join("")}
        </div>
      </div>`;
  }

  function paintDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = STEPS.map((_, i) => `<i class="${i <= idx ? "is-on" : ""}"></i>`).join("");
  }

  async function step(name) {
    const s = STEPS[idx];
    stage.innerHTML = render(s, name);
    paintDots();

    /* Each answer is a heartbeat: the cover is allowed to stay up because
       somebody is visibly still using it. Stop answering and the watchdog in
       main takes it down on its own. */
    try { window.brainoMac?.introGuard?.(true, 120000); } catch (_) {}

    const pick = await new Promise((resolve) => {
      /* Held so an abort can release it. Without this the run stayed parked on
         a click that was never coming, and startup never finished even after
         the cover was gone. */
      releaseStep = () => resolve(-1);
      stage.querySelectorAll(".onbm-choice").forEach((btn) => {
        btn.addEventListener("click", () => {
          btn.classList.add("is-on");
          /* A beat between the tap and the turn. Advancing on the same frame
             makes the click feel unacknowledged even though it worked. */
          setTimeout(() => resolve(Number(btn.dataset.i)), 190);
        }, { once: true });
      });
    });
    releaseStep = null;
    if (aborted || pick < 0) return null;

    if (s.capture) answers[s.capture] = s.choices[pick];

    /* The native prompts fire from the step that asked for them, so the macOS
       dialog lands while the sentence explaining it is still on screen. */
    if (s.native === "namedMode") {
      /* Only the second choice turns it on, and this is the one place in
         onboarding that changes a setting rather than just recording an answer,
         so it is written through immediately rather than at the end — a person
         who quits here has still had their answer respected. */
      const on = pick === 1;
      try {
        await Promise.race([
          window.brainoMac?.namedMode?.({ enabled: on }) ?? Promise.resolve(),
          new Promise((r) => setTimeout(r, 8000)),
        ]);
      } catch (_) {}
    }

    if (s.native === "calendar" && pick === 0) {
      /* Capped: a macOS prompt the user never answers is still a prompt that
         never returns, and the cover is on screen while it waits. */
      try {
        await Promise.race([
          window.brainoMac?.permissionAsk?.("calendar") ?? Promise.resolve(),
          new Promise((r) => setTimeout(r, 20000)),
        ]);
      } catch (_) {}
    }

    idx += 1;
    if (idx < STEPS.length) return step(name);
    return null;
  }

  async function hello() {
    if (!helloEl) return;
    const path = helloEl.querySelector("path");
    if (path) {
      /* Measured, never hardcoded: a dash offset guessed at authoring time is
         wrong the first time anyone edits the letterforms. */
      const len = Math.ceil(path.getTotalLength());
      helloEl.style.setProperty("--len", len);
      path.style.setProperty("--len", len);
    }
    helloEl.classList.add("is-on");
    await wait(60);
    if (aborted) return;
    helloEl.querySelector("svg")?.classList.add("is-writing");
    for (let i = 0; i < 31 && !aborted; i++) await wait(100);
  }

  /* Runs the whole white half and resolves when he is ready to go home. */
  async function run(opts) {
    root = document.getElementById("onb-mac");
    if (!root) return { skipped: true };
    stage = root.querySelector(".onbm-stage");
    dotsEl = root.querySelector(".onbm-dots");
    helloEl = document.getElementById("onb-hello");

    // The window forwards every click by default, so nothing here is tappable
    // until this is turned off. It goes back on before the notch takes over.
    try { window.brainoMac?.setMousePassthrough?.(false); } catch (_) {}

    root.hidden = false;
    // one frame, so the transition has a start value to move from
    await wait(30);
    root.classList.add("onb-in");
    await wait(760);

    try {
      await step(String(opts?.name || "there"));
      /* An abort means somebody wants their Mac back, so the run ENDS here.
         Playing the hello anyway kept the cover on screen for three more
         seconds after the thing that was meant to take it down. */
      if (aborted) return { aborted: true, answers };
      stage.innerHTML = "";
      dotsEl.innerHTML = "";
      await hello();
    } catch (error) {
      try { window.brainoMac?.log?.("onboarding.failed", { error: String(error?.message || error) }); } catch (_) {}
    }

    try { window.brainoMac?.setMousePassthrough?.(true); } catch (_) {}
    return { answers };
  }

  /* The ending: he appears on the white, flies to the notch, and the white goes
     with him. One move, and the desktop is what is underneath. */
  async function goHome() {
    const mascot = root?.querySelector(".onbm-mascot");
    if (!mascot) return dismiss();

    helloEl?.classList.remove("is-on");
    await wait(560);

    try {
      const svg = window.brainoMac?.getWalkerSvg?.();
      // Own gradient namespace, or he inherits the boot screen's — which is
      // hidden by now, and a hidden paint server paints nothing.
      if (svg) mascot.innerHTML = window.__brainoUniqueGradients?.(svg, "onb") || svg;
    } catch (_) { /* he can arrive as nothing rather than not at all */ }
    mascot.classList.add("is-in");
    await wait(760);

    // Measured, because the notch moves with the active display.
    let dx = 0, dy = -window.innerHeight * 0.42, scale = 0.12;
    try {
      const n = document.getElementById("notch-face")?.getBoundingClientRect();
      const m = mascot.getBoundingClientRect();
      if (n?.width && m.width) {
        dx = (n.left + n.width / 2) - (m.left + m.width / 2);
        dy = (n.top + n.height / 2) - (m.top + m.height / 2);
        scale = Math.max(0.06, (n.height * 0.55) / m.height);
      }
    } catch (_) {}
    mascot.style.setProperty("--onbm-dx", dx.toFixed(1) + "px");
    mascot.style.setProperty("--onbm-dy", dy.toFixed(1) + "px");
    mascot.style.setProperty("--onbm-scale", scale.toFixed(3));
    mascot.classList.remove("is-in");
    mascot.classList.add("is-fly");

    /* The white lifts while he is still travelling. Waiting for him to land
       makes two beats out of one move. */
    await wait(300);
    await dismiss();
  }

  /* Lifts the white and leaves the desktop showing, so the flight into the
     notch happens over the real machine rather than over a white card. */
  async function dismiss() {
    if (!root) return;
    root.classList.add("onb-out");
    await wait(620);
    root.hidden = true;
  }

  function abort() {
    aborted = true;
    try { releaseStep?.(); } catch (_) {}
    try { window.brainoMac?.setMousePassthrough?.(true); } catch (_) {}
    if (!root) return;
    /* Hidden outright rather than faded. An abort is someone wanting their Mac
       back, and a 600ms fade is 600ms of still not having it. */
    root.classList.remove("onb-in");
    root.hidden = true;
  }

  window.__brainoOnboarding = { run, goHome, dismiss, abort, HELLO_PATH, STEPS };
})();
