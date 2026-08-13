/*!
 * Braino Embed — mounts the real Braino (full walking mascot, voice, chat)
 * on any website. One script tag, one site_id. Personality/voice/memory all
 * live on Braino's own backend; this file is just the client.
 *
 * <script src="https://trybraino.com/embed/braino-embed.js"
 *         data-braino-site="YOUR_SITE_ID" async></script>
 *
 * Optional attributes: data-position="bottom-left"|"bottom-right",
 * data-greeting="...", data-voice="off".
 *
 * Walker SVG + walk-cycle ported from src/components/brainoWalkerSvg.ts and
 * BrainoWalker.tsx (the homepage's mascot). Chat card styling ported from
 * docs/braino-design.md section 7 ("Mascot Chat Widget" — the canonical
 * dark-glass card/pill spec). See skills/braino-embed/SKILL.md.
 */
(function () {
  "use strict";

  function findScriptTag() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("braino-embed.js") !== -1) return scripts[i];
    }
    return null;
  }

  var scriptTag = findScriptTag();
  if (!scriptTag) { console.error("[Braino Embed] could not find its own <script> tag"); return; }

  var SITE_ID = scriptTag.getAttribute("data-braino-site");
  if (!SITE_ID) { console.error("[Braino Embed] data-braino-site is required"); return; }

  var SUPABASE_URL = scriptTag.getAttribute("data-supabase-url") || "https://suwhgaxxdizowbyjlljj.supabase.co";
  var SUPABASE_KEY = scriptTag.getAttribute("data-supabase-key") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";
  var SIDE = scriptTag.getAttribute("data-position") === "bottom-left" ? "left" : "right";
  var GREETING = scriptTag.getAttribute("data-greeting") || "Hey, I'm Braino. Ask me anything about this site.";
  var voiceOn = scriptTag.getAttribute("data-voice") !== "off";

  var CHAT_URL = SUPABASE_URL + "/functions/v1/embed-chat";
  var TTS_URL = SUPABASE_URL + "/functions/v1/fish-audio-tts";

  // ───────────────────────── the real walker SVG (verbatim port) ─────────
  var SHOE = '<path d="M 45 74 L 42.5 87" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/><path d="M 45 74 L 42.5 87" fill="none" stroke="url(#sbwk-fill)" stroke-width="5.5" stroke-linecap="round"/><path d="M 47.5 89 C 47.5 87 44.5 86.4 42 87.4 C 36 89.2 29.6 90.6 25.2 94.2 C 22.2 96.7 21.8 99.4 25 100.8 C 27 101.6 31 101.6 35 101.6 L 45.6 101.6 C 47.1 101.6 47.8 100.6 47.5 99.1 Z" fill="white" stroke="rgba(176,86,78,.42)" stroke-width="0.9" stroke-linejoin="round"/><path d="M 23 98.6 Q 21.2 101.2 25.6 101.5 L 45.6 101.5 Q 47.8 101.3 47.4 98.9 Q 34.5 100.1 23 98.6 Z" fill="#F6E2DC" stroke="rgba(176,86,78,.42)" stroke-width="0.8" stroke-linejoin="round"/><g fill="none" stroke="#C9544A" stroke-width="0.85" stroke-linecap="round" opacity="0.7"><path d="M 29.5 90 Q 36 88.5 43 89.2"/><path d="M 32 92.7 Q 37.5 91.7 43 92.2" opacity="0.6"/></g><ellipse cx="30" cy="92.4" rx="3" ry="1.4" fill="#fff" opacity="0.6" transform="rotate(-12 30 92.4)"/>';
  var BODY = "M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 68 80.5 60 79.5 50 79 C 40 79.5 32 80.5 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z";
  // Hand: a small mitten (palm + thumb + knuckle creases), fixed at the end of an
  // arm stroke — verbatim from brainoWalkerSvg.ts, this is what "the arms" actually
  // are (a stroke line is just the sleeve; this is what reads as a hand).
  function HAND(tx, ty) {
    return '<g transform="translate(' + tx + ' ' + ty + ')" stroke="rgba(176,86,78,.42)" stroke-width="0.7">' +
      '<circle cx="' + (tx < 50 ? 5 : -5) + '" cy="-1.4" r="3" fill="white"/><circle cx="0" cy="0.6" r="7" fill="white"/>' +
      '<g fill="none" stroke="#C9544A" stroke-width="0.8" stroke-linecap="round" opacity="0.55"><path d="M -2.9 3 Q -2.7 5.4 -1.7 6.8"/><path d="M 0.2 3.6 Q 0.2 5.8 0.2 7.2"/><path d="M 2.9 3 Q 2.7 5.4 1.7 6.8"/></g>' +
      '<path d="M -5 -5 Q 0 -3.2 5 -5" fill="none" stroke="#C9544A" stroke-width="1.1" stroke-linecap="round"/></g>';
  }
  var WALKER_SVG = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -34 116 142" width="64" height="78" overflow="visible" style="display:block">' +
    '<defs><linearGradient id="sbwk-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6A8A2"/><stop offset="0.55" stop-color="#E8786E"/><stop offset="1" stop-color="#C9544A"/></linearGradient>' +
    '<radialGradient id="sbwk-glow" cx="35%" cy="30%" r="50%"><stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/><stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/></radialGradient></defs>' +
    '<g id="__sbwk_root__">' +
    '<g id="__sbwk_ll__">' + SHOE + '</g>' +
    '<g id="__sbwk_rl__"><g transform="translate(100,0) scale(-1,1)">' + SHOE + '</g></g>' +
    '<g id="__sbwk_la_bg__"><path d="M 23 53 Q 11 52 8 59" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g>' +
    '<g id="__sbwk_ra_bg__"><path d="M 77 53 Q 89 52 92 59" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/></g>' +
    '<path d="' + BODY + '" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/>' +
    '<g id="__sbwk_la__"><path d="M 23 53 Q 11 52 8 59" fill="none" stroke="url(#sbwk-fill)" stroke-width="6" stroke-linecap="round"/>' + HAND(7, 64) + '</g>' +
    '<g id="__sbwk_ra__"><path d="M 77 53 Q 89 52 92 59" fill="none" stroke="url(#sbwk-fill)" stroke-width="6" stroke-linecap="round"/>' + HAND(93, 64) + '</g>' +
    '<path d="' + BODY + '" fill="url(#sbwk-fill)"/><path d="' + BODY + '" fill="url(#sbwk-glow)"/>' +
    '<path d="M 50 8 Q 49 30 50 50 Q 50.5 60 50 65" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/>' +
    '<path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/>' +
    '<path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/>' +
    '<path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/>' +
    '<path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/>' +
    '<g id="__sbwk_eye_l__"><circle cx="38" cy="48" r="6.5" fill="white"/><g id="__sbwk_pupil_l__"><circle cx="38" cy="48" r="3.2" fill="#1B1713"/><circle cx="39" cy="46.6" r="1.1" fill="white"/></g></g>' +
    '<g id="__sbwk_eye_r__"><circle cx="62" cy="48" r="6.5" fill="white"/><g id="__sbwk_pupil_r__"><circle cx="62" cy="48" r="3.2" fill="#1B1713"/><circle cx="63" cy="46.6" r="1.1" fill="white"/></g></g>' +
    '<ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/><ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>' +
    '<g id="__sbwk_mouth__"><path id="__sbwk_smile__" d="M 43.5 60 Q 50 67.5 56.5 60" fill="none" stroke="#1B1713" stroke-width="1.9" stroke-linecap="round"/>' +
    '<ellipse id="__sbwk_talk__" cx="50" cy="61.8" rx="3.5" ry="1.4" fill="#8A2F28" style="display:none"/></g>' +
    '</g></svg>');

  var ICON_MIC = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8.5" y1="22" x2="15.5" y2="22"/></svg>';
  var ICON_SPEAKER_ON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9" fill="currentColor" stroke="none"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_SPEAKER_OFF = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 9 3 15 8 15 13 20 13 4 8 9 3 9" fill="currentColor" stroke="none"/><line x1="16.5" y1="9" x2="22.5" y2="15"/><line x1="22.5" y1="9" x2="16.5" y2="15"/></svg>';

  var W = 64;
  var laneEl, walkerEl, rootG, sayEl;
  var posX = 40, dirX = 1;
  var waving = false;
  var speaking = false, talkFlipTimer = null;
  var mouseX = -1, mouseY = -1, mouseAt = 0;
  var start = 0, last = 0, raf = 0;
  var history = [];
  var greeted = false;
  var currentAudio = null;
  var panelOpen = false;

  function el(tag, className) { var e = document.createElement(tag); if (className) e.className = className; return e; }
  function q(sel) { return rootG ? rootG.querySelector(sel) : null; }
  function viewportMaxX() { return Math.max(40, window.innerWidth - W - 6); }

  function pageContext() {
    var text = "";
    try {
      var clone = document.body.cloneNode(true);
      var kill = clone.querySelectorAll("script, style, noscript, #braino-embed-root");
      for (var i = 0; i < kill.length; i++) kill[i].remove();
      text = (clone.innerText || "").replace(/\s+/g, " ").trim().slice(0, 4000);
    } catch (_e) { /* best effort */ }
    return { title: document.title || "", url: location.href, text: text };
  }

  // ───────────────────────── walk-cycle tick (ported from BrainoWalker.tsx) ─
  function tick(now) {
    if (!last) last = now;
    if (!start) start = now;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var t = (now - start) / 1000;

    var x = posX + dirX * 60 * dt;
    var maxX = viewportMaxX();
    if (x >= maxX) { x = maxX; dirX = -1; } else if (x <= 6) { x = 6; dirX = 1; }
    posX = x;
    walkerEl.style.transform = "translateX(" + posX + "px)";
    var flip = walkerEl.querySelector("#__sbwk_flip__");
    if (flip) flip.style.transform = "scaleX(" + dirX + ")";

    var s = t * 4.5;
    var Lp = Math.sin(s), Rp = Math.sin(s + Math.PI);
    var ll = Math.max(0, Lp) * 5, rl = Math.max(0, Rp) * 5;
    var ls = Math.max(0, Lp) * 8, rs = Math.max(0, Rp) * 8;
    var waddle = Math.sin(s) * 3.4;
    var walkBob = -Math.abs(Math.sin(s)) * 2 - 0.4;
    var breath = 1 + 0.014 * Math.sin(t * 1.7);
    var bob = Math.sin(t * 1.7 + 0.6) * 0.8;
    var bp = t % 3.4;
    var blink = bp < 0.13 ? Math.sin((bp / 0.13) * Math.PI) : 0;
    var eyeSy = Math.max(0.06, 1 - blink);
    var rightAngle = waving ? (-28 + Math.sin(t * 11) * 16) : 0;

    if (rootG) rootG.setAttribute("transform", "rotate(" + waddle + " 50 50) translate(0 " + (bob + walkBob) + ") scale(" + breath + ")");
    var legL = q("#__sbwk_ll__"), legR = q("#__sbwk_rl__");
    if (legL) legL.setAttribute("transform", "translate(0 " + (-ll) + ") rotate(" + ls + " 44 74)");
    if (legR) legR.setAttribute("transform", "translate(0 " + (-rl) + ") rotate(" + rs + " 56 74)");
    var raBg = q("#__sbwk_ra_bg__"), raFg = q("#__sbwk_ra__");
    var raTx = rightAngle ? ("rotate(" + rightAngle + " 78 53)") : "";
    if (raBg) raBg.setAttribute("transform", raTx);
    if (raFg) raFg.setAttribute("transform", raTx);

    var eyeL = q("#__sbwk_eye_l__"), eyeR = q("#__sbwk_eye_r__");
    if (eyeL) eyeL.setAttribute("transform", "translate(38,48) scale(1," + eyeSy + ") translate(-38,-48)");
    if (eyeR) eyeR.setAttribute("transform", "translate(62,48) scale(1," + eyeSy + ") translate(-62,-48)");

    var pupL = q("#__sbwk_pupil_l__"), pupR = q("#__sbwk_pupil_r__");
    var gx = 2.4, gy = 0;
    if (now - mouseAt < 2500 && mouseX >= 0) {
      var r = walkerEl.getBoundingClientRect();
      var ex = r.left + r.width * 0.5, ey = r.top + r.height * 0.42;
      var dx = mouseX - ex, dy = mouseY - ey;
      var dist = Math.hypot(dx, dy) || 1;
      var mf = Math.min(dist / 220, 1);
      gx = (dx / dist) * 2.4 * mf * (dirX < 0 ? -1 : 1);
      gy = (dy / dist) * 1.8 * mf;
    }
    if (pupL) pupL.setAttribute("transform", "translate(" + gx + " " + gy + ")");
    if (pupR) pupR.setAttribute("transform", "translate(" + gx + " " + gy + ")");

    raf = requestAnimationFrame(tick);
  }

  function wave() {
    waving = true;
    setTimeout(function () { waving = false; }, 1300);
  }

  function say(text) {
    if (!sayEl) return;
    sayEl.textContent = text;
    sayEl.style.opacity = "1";
    sayEl.style.transform = "translateX(-50%) translateY(0) scale(1)";
    clearTimeout(sayEl._t);
    sayEl._t = setTimeout(function () {
      sayEl.style.opacity = "0";
      sayEl.style.transform = "translateX(-50%) translateY(4px) scale(0.94)";
    }, 2200);
  }

  function setSpeaking(on) {
    speaking = on;
    clearInterval(talkFlipTimer);
    var smile = q("#__sbwk_smile__"), talk = q("#__sbwk_talk__");
    if (!on) {
      if (smile) smile.style.display = "";
      if (talk) talk.style.display = "none";
      return;
    }
    var open = false;
    talkFlipTimer = setInterval(function () {
      open = !open;
      if (smile) smile.style.display = open ? "none" : "";
      if (talk) talk.style.display = open ? "" : "none";
    }, 130);
  }

  // ───────────────────────── styles (docs/braino-design.md §7, verbatim) ──
  function injectStyles() {
    var css = [
      "#braino-embed-root,#braino-embed-root *{box-sizing:border-box;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      "#braino-embed-lane{position:fixed;left:0;bottom:0;width:100vw;height:112px;pointer-events:none;z-index:2147483000;}",
      "#braino-embed-walker{position:absolute;bottom:14px;width:64px;pointer-events:auto;cursor:pointer;touch-action:none;user-select:none;will-change:transform;}",
      "#braino-embed-walker .be-shadow{position:absolute;left:50%;bottom:-4px;width:42px;height:8px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side, rgba(120,60,40,.26), transparent 78%);}",
      "#be-say{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%) translateY(4px) scale(0.94);background:rgba(18,14,10,0.88);color:#fff;font-size:12px;font-weight:600;padding:6px 11px;border-radius:12px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s ease,transform .2s ease;box-shadow:0 8px 22px rgba(0,0,0,.3);}",
      "#braino-embed-card{position:fixed;" + SIDE + ":20px;bottom:128px;width:360px;max-width:calc(100vw - 32px);max-height:min(72vh,560px);border-radius:22px;background:rgba(18,14,10,0.78);border:1px solid rgba(255,255,255,0.14);box-shadow:0 40px 100px rgba(0,0,0,0.45),0 8px 24px rgba(0,0,0,0.22);backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);color:#fff;display:none;flex-direction:column;overflow:hidden;z-index:2147483001;}",
      "#braino-embed-card.open{display:flex;animation:brainoCardIn .3s cubic-bezier(.175,.885,.32,1.275);}",
      "@keyframes brainoCardIn{from{opacity:0;transform:translateY(10px) scale(.97);}to{opacity:1;transform:translateY(0) scale(1);}}",
      ".be-head{display:flex;align-items:center;gap:8px;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;}",
      ".be-head .be-name{font-weight:600;font-size:13.5px;color:rgba(255,255,255,.95);}",
      ".be-head .be-sub{font-size:10.5px;color:rgba(255,255,255,.4);}",
      ".be-mute{margin-left:auto;background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.75);width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;}",
      ".be-mute.off{opacity:.4;}",
      "#be-msgs{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px;min-height:80px;}",
      ".be-msg-user{align-self:flex-end;max-width:85%;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);border-radius:14px;padding:9px 14px;font-size:13px;color:rgba(255,255,255,0.88);white-space:pre-wrap;word-break:break-word;}",
      ".be-msg-bot{align-self:flex-start;max-width:92%;font-size:14.5px;line-height:1.72;color:rgba(255,255,255,0.92);white-space:pre-wrap;word-break:break-word;}",
      ".be-typing{display:flex;gap:4px;padding:4px 0;}",
      ".be-typing span{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5);animation:brainoDot 1.1s infinite;}",
      ".be-typing span:nth-child(2){animation-delay:.2s;}.be-typing span:nth-child(3){animation-delay:.4s;}",
      "@keyframes brainoDot{0%,60%,100%{transform:translateY(0);opacity:.35;}30%{transform:translateY(-5px);opacity:1;}}",
      ".be-foot{font-family:'JetBrains Mono',ui-monospace,'SF Mono',Consolas,monospace;font-size:9.5px;color:rgba(255,255,255,0.28);letter-spacing:.02em;padding:0 16px 10px;flex-shrink:0;}",
      ".be-pillwrap{padding:0 12px 12px;flex-shrink:0;}",
      ".be-pill{display:flex;align-items:center;gap:6px;background:rgba(18,14,10,0.82);border-radius:100px;padding:7px 7px 7px 16px;border:1px solid rgba(255,255,255,0.16);box-shadow:0 8px 28px rgba(0,0,0,0.35),0 2px 8px rgba(0,0,0,0.18);}",
      ".be-pill input{flex:1;min-width:0;background:none;border:none;outline:none;font-size:14px;color:rgba(255,255,255,0.88);letter-spacing:-0.01em;}",
      ".be-pill input::placeholder{color:rgba(255,255,255,0.35);}",
      ".be-mic{width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:rgba(255,255,255,.75);cursor:pointer;font-size:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}",
      ".be-mic.active{background:#d43f3f;color:#fff;}",
      ".be-send{width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.3);transition:background .15s ease,color .15s ease;}",
      ".be-send.ready{background:#E8786E;color:#fff;}",
    ].join("");
    var style = el("style");
    style.setAttribute("data-braino-embed", "true");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ───────────────────────── chat backend calls ───────────────────────────
  function addMessage(role, text) {
    var msgs = document.getElementById("be-msgs");
    var bubble = el("div", role === "user" ? "be-msg-user" : "be-msg-bot");
    bubble.textContent = text;
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
    return bubble;
  }

  function addTyping() {
    var msgs = document.getElementById("be-msgs");
    var wrap = el("div", "be-typing");
    wrap.innerHTML = "<span></span><span></span><span></span>";
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    return wrap;
  }

  function speak(text) {
    if (!voiceOn) return;
    try {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      fetch(TTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ text: text.slice(0, 2000), latency: "normal" }),
      })
        .then(function (res) { return res.ok ? res.blob() : null; })
        .then(function (blob) {
          if (!blob) return;
          var url = URL.createObjectURL(blob);
          var audio = new Audio(url);
          currentAudio = audio;
          setSpeaking(true);
          audio.onended = function () { setSpeaking(false); };
          audio.play().catch(function () { setSpeaking(false); });
        })
        .catch(function () {});
    } catch (_e) {}
  }

  function sendMessage(text) {
    text = (text || "").trim();
    if (!text) return;
    addMessage("user", text);
    history.push({ role: "user", content: text });
    var typing = addTyping();

    fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ site_id: SITE_ID, message: text, history: history.slice(-8), page_context: pageContext() }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        typing.remove();
        if (!result.ok) {
          addMessage("bot", "I couldn't reach my backend just now. Try again in a moment.");
          return;
        }
        var reply = (result.data && result.data.reply) || "…";
        addMessage("bot", reply);
        history.push({ role: "assistant", content: reply });
        speak(reply);
      })
      .catch(function () {
        typing.remove();
        addMessage("bot", "I couldn't reach my backend just now. Try again in a moment.");
      });
  }

  function setupMic(micBtn, input, sendBtn) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { micBtn.style.display = "none"; return; }
    var recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    var listening = false;
    recognition.onresult = function (event) {
      var transcript = event.results[0][0].transcript;
      sendMessage(transcript);
      input.value = "";
      sendBtn.className = "be-send";
    };
    recognition.onerror = function () { listening = false; micBtn.classList.remove("active"); };
    recognition.onend = function () { listening = false; micBtn.classList.remove("active"); };
    micBtn.addEventListener("click", function () {
      if (listening) { recognition.stop(); return; }
      listening = true;
      micBtn.classList.add("active");
      try { recognition.start(); } catch (_e) { listening = false; micBtn.classList.remove("active"); }
    });
  }

  // ───────────────────────── mount ─────────────────────────────────────
  function togglePanel(open) {
    var card = document.getElementById("braino-embed-card");
    panelOpen = open != null ? open : !panelOpen;
    card.className = panelOpen ? "open" : "";
    if (panelOpen && !greeted) { greeted = true; addMessage("bot", GREETING); }
    if (panelOpen) document.getElementById("be-input").focus();
  }

  function mount() {
    injectStyles();

    laneEl = el("div"); laneEl.id = "braino-embed-lane";
    walkerEl = el("div"); walkerEl.id = "braino-embed-walker";
    walkerEl.innerHTML = '<div id="__sbwk_flip__" style="transform-origin:center;display:block">' + WALKER_SVG + '</div><div class="be-shadow"></div>';
    sayEl = el("div"); sayEl.id = "be-say";
    walkerEl.appendChild(sayEl);
    rootG = walkerEl.querySelector("#__sbwk_root__");
    laneEl.appendChild(walkerEl);
    document.body.appendChild(laneEl);

    var card = el("div"); card.id = "braino-embed-card";
    var head = el("div", "be-head");
    head.innerHTML = '<span class="be-name">Braino</span><span class="be-sub">&nbsp;&middot; always talks straight</span>';
    var muteBtn = el("button", "be-mute");
    muteBtn.innerHTML = voiceOn ? ICON_SPEAKER_ON : ICON_SPEAKER_OFF;
    muteBtn.addEventListener("click", function () {
      voiceOn = !voiceOn;
      muteBtn.className = "be-mute" + (voiceOn ? "" : " off");
      muteBtn.innerHTML = voiceOn ? ICON_SPEAKER_ON : ICON_SPEAKER_OFF;
      if (!voiceOn && currentAudio) currentAudio.pause();
    });
    head.appendChild(muteBtn);

    var msgs = el("div"); msgs.id = "be-msgs";

    var pillWrap = el("div", "be-pillwrap");
    var pill = el("div", "be-pill");
    var input = el("input"); input.id = "be-input"; input.type = "text"; input.placeholder = "What's on your mind?";
    var micBtn = el("button", "be-mic"); micBtn.type = "button"; micBtn.innerHTML = ICON_MIC;
    var sendBtn = el("button", "be-send"); sendBtn.type = "button";
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="6 11 12 5 18 11"/></svg>';
    pill.appendChild(input); pill.appendChild(micBtn); pill.appendChild(sendBtn);
    pillWrap.appendChild(pill);

    var foot = el("div", "be-foot");
    foot.textContent = "Ask about this page · Powered by Braino";

    card.appendChild(head);
    card.appendChild(msgs);
    card.appendChild(pillWrap);
    card.appendChild(foot);
    document.body.appendChild(card);

    input.addEventListener("input", function () { sendBtn.className = "be-send" + (input.value.trim() ? " ready" : ""); });
    function submit() {
      var text = input.value;
      if (!text.trim()) return;
      input.value = ""; sendBtn.className = "be-send";
      sendMessage(text);
    }
    sendBtn.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    setupMic(micBtn, input, sendBtn);

    walkerEl.addEventListener("click", function () {
      wave();
      togglePanel();
    });

    document.addEventListener("mousemove", function (e) { mouseX = e.clientX; mouseY = e.clientY; mouseAt = performance.now(); });
    window.addEventListener("resize", function () { posX = Math.max(6, Math.min(posX, viewportMaxX())); });

    posX = Math.min(Math.max(40, window.innerWidth * 0.5), viewportMaxX());
    raf = requestAnimationFrame(tick);

    setTimeout(function () { if (!panelOpen) { wave(); say("Hey \u{1F44B} chat with me"); } }, 1800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
