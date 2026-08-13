/*!
 * Braino Embed — mounts the real Braino (mascot, voice, personality) on any
 * website. One script tag, one site_id. Personality/voice/memory all live
 * on Braino's own backend; this file is just the client.
 *
 * <script src="https://trybraino.com/embed/braino-embed.js"
 *         data-braino-site="YOUR_SITE_ID" async></script>
 *
 * Optional attributes on the same tag:
 *   data-position="bottom-left" | "bottom-right" (default: bottom-right)
 *   data-greeting="Custom opening line"
 *   data-voice="off"  (spoken replies are on by default)
 *
 * See skills/braino-embed/SKILL.md for the full integration playbook,
 * including how to give Braino real read access to this site's own data.
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
  if (!scriptTag) {
    console.error("[Braino Embed] could not find its own <script> tag");
    return;
  }

  var SITE_ID = scriptTag.getAttribute("data-braino-site");
  if (!SITE_ID) {
    console.error("[Braino Embed] data-braino-site is required, e.g. <script ... data-braino-site=\"...\">");
    return;
  }

  var SUPABASE_URL = scriptTag.getAttribute("data-supabase-url") || "https://suwhgaxxdizowbyjlljj.supabase.co";
  var SUPABASE_KEY = scriptTag.getAttribute("data-supabase-key") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";
  var SIDE = scriptTag.getAttribute("data-position") === "bottom-left" ? "left" : "right";
  var GREETING = scriptTag.getAttribute("data-greeting") || "Hey, I'm Braino. Ask me anything about this site.";
  var voiceOn = scriptTag.getAttribute("data-voice") !== "off";

  var CHAT_URL = SUPABASE_URL + "/functions/v1/embed-chat";
  var TTS_URL = SUPABASE_URL + "/functions/v1/fish-audio-tts";
  var IDLE_ART = "https://trybraino.com/reactions/braino-idle.svg";
  var TALK_ART = "https://trybraino.com/reactions/braino-happy.svg";

  var history = [];
  var greeted = false;
  var currentAudio = null;

  function el(tag, className) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    return e;
  }

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

  function injectStyles() {
    var css = [
      "#braino-embed-root, #braino-embed-root *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}",
      "#braino-embed-root{position:fixed;" + SIDE + ":20px;bottom:20px;z-index:2147483000;}",
      ".be-bubble{position:relative;width:60px;height:60px;border-radius:999px;background:#111318;box-shadow:0 8px 24px rgba(0,0,0,.25);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:9px;}",
      ".be-bubble img{width:100%;height:100%;object-fit:contain;}",
      ".be-badge{position:absolute;top:-1px;" + (SIDE === "left" ? "right" : "left") + ":-1px;background:#17c964;width:12px;height:12px;border-radius:999px;border:2px solid #fff;}",
      ".be-panel{position:absolute;bottom:74px;" + SIDE + ":0;width:340px;max-width:calc(100vw - 32px);height:480px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;}",
      ".be-panel.open{display:flex;}",
      ".be-head{padding:14px 16px;background:#111318;color:#fff;display:flex;align-items:center;gap:10px;flex-shrink:0;}",
      ".be-head img{width:28px;height:28px;}",
      ".be-head .be-title{font-weight:600;font-size:14px;line-height:1.2;}",
      ".be-head .be-sub{font-size:11px;opacity:.6;}",
      ".be-head-text{display:flex;flex-direction:column;}",
      ".be-mute{margin-left:auto;background:none;border:none;color:#fff;opacity:.75;cursor:pointer;font-size:15px;padding:4px;}",
      ".be-mute.off{opacity:.35;}",
      ".be-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f7f7f8;}",
      ".be-msg{max-width:85%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.45;white-space:pre-wrap;word-break:break-word;}",
      ".be-msg.user{align-self:flex-end;background:#111318;color:#fff;border-bottom-right-radius:4px;}",
      ".be-msg.bot{align-self:flex-start;background:#fff;color:#151515;border:1px solid #e6e6e9;border-bottom-left-radius:4px;}",
      ".be-msg.typing{opacity:.55;font-style:italic;}",
      ".be-input-row{display:flex;gap:6px;padding:10px;border-top:1px solid #eee;background:#fff;flex-shrink:0;}",
      ".be-input-row input{flex:1;min-width:0;border:1px solid #ddd;border-radius:10px;padding:9px 10px;font-size:13px;outline:none;}",
      ".be-input-row button{border:none;background:#111318;color:#fff;border-radius:10px;padding:0 12px;cursor:pointer;font-size:13px;}",
      ".be-input-row button.be-mic{background:#eee;color:#111;width:36px;padding:0;}",
      ".be-input-row button.be-mic.active{background:#d43f3f;color:#fff;}",
      ".be-foot{padding:6px 10px;text-align:center;font-size:10px;color:#999;background:#fff;flex-shrink:0;}",
      ".be-foot a{color:#999;}",
    ].join("");
    var style = el("style");
    style.setAttribute("data-braino-embed", "true");
    style.textContent = css;
    document.head.appendChild(style);
  }

  function addMessage(role, text) {
    var msgs = document.getElementById("be-msgs");
    var bubble = el("div", "be-msg " + (role === "user" ? "user" : "bot"));
    bubble.textContent = text;
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
    return bubble;
  }

  function setFace(talking) {
    var img = document.getElementById("be-bubble-img");
    if (img) img.src = talking ? TALK_ART : IDLE_ART;
    var headImg = document.getElementById("be-head-img");
    if (headImg) headImg.src = talking ? TALK_ART : IDLE_ART;
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
          setFace(true);
          audio.onended = function () { setFace(false); };
          audio.play().catch(function () { setFace(false); });
        })
        .catch(function () { /* voice is best-effort */ });
    } catch (_e) { /* voice is best-effort */ }
  }

  function sendMessage(text) {
    text = (text || "").trim();
    if (!text) return;
    addMessage("user", text);
    history.push({ role: "user", content: text });
    var typing = addMessage("bot", "…");
    typing.className += " typing";
    setFace(true);

    fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({
        site_id: SITE_ID,
        message: text,
        history: history.slice(-8),
        page_context: pageContext(),
      }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        typing.remove();
        setFace(false);
        if (!result.ok) {
          addMessage("bot", "I couldn't reach my backend just now (" + (result.data && result.data.error || "unknown error") + "). Try again in a moment.");
          return;
        }
        var reply = (result.data && result.data.reply) || "…";
        addMessage("bot", reply);
        history.push({ role: "assistant", content: reply });
        speak(reply);
      })
      .catch(function () {
        typing.remove();
        setFace(false);
        addMessage("bot", "I couldn't reach my backend just now. Try again in a moment.");
      });
  }

  function setupMic(micBtn, input) {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { micBtn.style.display = "none"; return; }
    var recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    var listening = false;

    recognition.onresult = function (event) {
      var transcript = event.results[0][0].transcript;
      input.value = transcript;
      sendMessage(transcript);
      input.value = "";
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

  function mount() {
    injectStyles();

    var root = el("div");
    root.id = "braino-embed-root";

    var bubble = el("button", "be-bubble");
    bubble.setAttribute("aria-label", "Open Braino");
    var bubbleImg = el("img"); bubbleImg.id = "be-bubble-img"; bubbleImg.src = IDLE_ART; bubbleImg.alt = "Braino";
    var badge = el("div", "be-badge");
    bubble.appendChild(bubbleImg);
    bubble.appendChild(badge);

    var panel = el("div", "be-panel");
    panel.id = "be-panel";

    var head = el("div", "be-head");
    var headImg = el("img"); headImg.id = "be-head-img"; headImg.src = IDLE_ART; headImg.alt = "Braino";
    var headText = el("div", "be-head-text");
    var title = el("div", "be-title"); title.textContent = "Braino";
    var sub = el("div", "be-sub"); sub.textContent = "always talks straight";
    headText.appendChild(title); headText.appendChild(sub);
    var muteBtn = el("button", "be-mute");
    muteBtn.textContent = voiceOn ? "\u{1F50A}" : "\u{1F507}";
    muteBtn.setAttribute("aria-label", "Toggle voice replies");
    muteBtn.addEventListener("click", function () {
      voiceOn = !voiceOn;
      muteBtn.className = "be-mute" + (voiceOn ? "" : " off");
      muteBtn.textContent = voiceOn ? "\u{1F50A}" : "\u{1F507}";
      if (!voiceOn && currentAudio) { currentAudio.pause(); }
    });
    head.appendChild(headImg); head.appendChild(headText); head.appendChild(muteBtn);

    var msgs = el("div", "be-msgs"); msgs.id = "be-msgs";

    var inputRow = el("div", "be-input-row");
    var input = el("input");
    input.type = "text";
    input.placeholder = "Ask Braino about this site…";
    var micBtn = el("button", "be-mic"); micBtn.textContent = "\u{1F3A4}"; micBtn.type = "button";
    var sendBtn = el("button"); sendBtn.textContent = "Send"; sendBtn.type = "button";
    inputRow.appendChild(input); inputRow.appendChild(micBtn); inputRow.appendChild(sendBtn);

    var foot = el("div", "be-foot");
    foot.innerHTML = 'Powered by <a href="https://trybraino.com" target="_blank" rel="noopener noreferrer">Braino</a>';

    panel.appendChild(head);
    panel.appendChild(msgs);
    panel.appendChild(inputRow);
    panel.appendChild(foot);

    root.appendChild(panel);
    root.appendChild(bubble);
    document.body.appendChild(root);

    bubble.addEventListener("click", function () {
      var isOpen = panel.classList.toggle("open");
      badge.style.display = isOpen ? "none" : "block";
      if (isOpen && !greeted) {
        greeted = true;
        addMessage("bot", GREETING);
      }
      if (isOpen) input.focus();
    });

    function submit() {
      var text = input.value;
      input.value = "";
      sendMessage(text);
    }
    sendBtn.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
    });

    setupMic(micBtn, input);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
