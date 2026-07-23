// her-mode.js — the "her" takeover layer: stage DOM, presence engine wiring, captions.
// Voice, transcription, chat, and TTS all ride the existing Braino pipeline in braino-mac.js;
// this file only owns the look. Communication back to braino-mac.js uses the "her:leave" event.
(function () {
  const STATE_DESC = {
    idle: "at rest. a slow warm breath, waiting with you",
    listening: "leaning in. her light draws bright and open to take you in",
    thinking: "turning it over. a cooler shimmer as she considers",
    speaking: "answering. the membrane ripples with her voice",
    close: "closest. the warmest, fullest bloom, held near",
  };

  let stage = null;
  let engine = null;
  let heardEl = null;
  let replyEl = null;
  let promptEl = null;
  let stateEl = null;
  let state = "idle";
  let micAnalyser = null;
  let micData = null;
  let levelRaf = 0;

  function buildStage() {
    stage = document.createElement("section");
    stage.id = "her-stage";
    stage.innerHTML = [
      '<canvas class="her-field"></canvas>',
      '<div class="her-grain"></div>',
      '<header class="her-top">',
      '  <span class="her-wordmark">her<span class="dot">.</span></span>',
      '  <span class="her-topright">',
      '    <span class="her-statecap">idle</span>',
      '    <button class="her-leave" type="button">leave quietly</button>',
      "  </span>",
      "</header>",
      '<div class="her-caption">',
      '  <div class="her-heard"></div>',
      '  <div class="her-reply"></div>',
      '  <div class="her-prompt"></div>',
      "</div>",
      '<div class="her-hint">she is listening. say goodbye to leave, or press cmd shift h</div>',
    ].join("\n");
    document.body.appendChild(stage);
    heardEl = stage.querySelector(".her-heard");
    replyEl = stage.querySelector(".her-reply");
    promptEl = stage.querySelector(".her-prompt");
    stateEl = stage.querySelector(".her-statecap");
    stage.querySelector(".her-leave").addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("her:leave"));
    });
  }

  function levelLoop() {
    levelRaf = requestAnimationFrame(levelLoop);
    if (!engine) return;
    if (state === "speaking") {
      const t = performance.now() / 1000;
      engine.setLevel(Math.min(1, 0.35 + 0.35 * Math.abs(Math.sin(t * 6.5)) + 0.15 * Math.abs(Math.sin(t * 17))));
      return;
    }
    if (state === "listening" && micAnalyser && micData) {
      micAnalyser.getByteTimeDomainData(micData);
      let sum = 0;
      for (let i = 0; i < micData.length; i++) {
        const v = (micData[i] - 128) / 128;
        sum += v * v;
      }
      engine.setLevel(Math.min(1, Math.sqrt(sum / micData.length) * 3.2));
      return;
    }
    engine.setLevel(0);
  }

  const HerMode = {
    active: false,

    enter() {
      if (this.active) return;
      this.active = true;
      if (!stage) buildStage();
      state = "idle";
      heardEl.textContent = "";
      replyEl.textContent = "";
      promptEl.textContent = STATE_DESC.idle;
      stateEl.textContent = "idle";
      document.body.classList.add("her-active");
      stage.classList.add("on");
      requestAnimationFrame(() => stage.classList.add("visible"));
      if (!engine) engine = new window.HerPresence(stage.querySelector(".her-field"));
      if (!levelRaf) levelLoop();
    },

    exit() {
      if (!this.active) return;
      this.active = false;
      document.body.classList.remove("her-active");
      if (stage) {
        stage.classList.remove("visible");
        window.setTimeout(() => {
          if (!this.active && stage) stage.classList.remove("on");
        }, 950);
      }
      if (levelRaf) {
        cancelAnimationFrame(levelRaf);
        levelRaf = 0;
      }
      this.detachMicStream();
    },

    setState(next) {
      if (!stage || !STATE_DESC[next]) return;
      state = next;
      stateEl.textContent = next;
      if (!heardEl.textContent && !replyEl.textContent) promptEl.textContent = STATE_DESC[next];
      if (engine) engine.setState(next);
    },

    // Map Braino status-pill states onto her presence states.
    syncStatus(status) {
      const map = {
        connecting: "thinking",
        listening: "listening",
        hearing: "listening",
        captured: "thinking",
        thinking: "thinking",
        speaking: "speaking",
        done: "close",
        ready: "idle",
        error: "idle",
      };
      this.setState(map[status] || "idle");
    },

    setHeard(text) {
      if (!stage) return;
      heardEl.textContent = String(text || "").trim();
      if (heardEl.textContent) promptEl.textContent = "";
    },

    setReply(text) {
      if (!stage) return;
      replyEl.textContent = String(text || "").trim();
      if (replyEl.textContent) promptEl.textContent = "";
    },

    clearCaptions() {
      if (!stage) return;
      heardEl.textContent = "";
      replyEl.textContent = "";
      promptEl.textContent = STATE_DESC[state] || "";
    },

    attachMicStream(stream) {
      this.detachMicStream();
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        micAnalyser = analyser;
        micData = new Uint8Array(analyser.frequencyBinCount);
        this._micCtx = ctx;
      } catch (_) {
        micAnalyser = null;
        micData = null;
      }
    },

    detachMicStream() {
      micAnalyser = null;
      micData = null;
      if (this._micCtx && this._micCtx.state !== "closed") {
        try { this._micCtx.close(); } catch (_) {}
      }
      this._micCtx = null;
    },
  };

  window.HerMode = HerMode;
})();
