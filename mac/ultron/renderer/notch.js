/* Ultron in the notch (2026-10-29). Talks the way Braino Mac talks:
   - one fn+Control opens a live voice line (OpenAI Realtime over WebRTC, the
     session minted by the same openai-realtime-call function Braino uses,
     semantic VAD with create_response off, like braino-mac.js startRealtimeVoice)
   - every pause is a turn: the transcript goes to main, his brain answers there
   - echo cancellation on the mic, so he doesn't hear himself; talk over him and
     he stops (input_audio_buffer.speech_started = barge-in, like Braino)
   - press again, or 3 quiet minutes (Braino's REALTIME_IDLE_TIMEOUT_MS), to end
   - his reply reveals in the notch; short/long uses Braino's own
     notch-response.cjs (vendor/notch-response.js). */
(() => {
  const nf = document.getElementById("nf");
  const wordsEl = nf.querySelector(".nf-words");
  const heardEl = nf.querySelector(".nf-heard");
  const mouth = nf.querySelector(".nf-mouth");
  const NR = window.BrainoNotchResponse;
  const IDLE_MS = 180000;

  let view = "idle", talking = false, level = 0;
  function setView(v, extra) {
    view = v;
    nf.className = v + (extra ? " " + extra : "");
  }
  window.ultron.onMetrics(({ notchH }) => nf.style.setProperty("--nf-notch-h", `${notchH}px`));

  /* ---------- level: drives the radiate and the sonar ---------- */
  function setLevel(v) { level = level * 0.6 + Math.max(0, Math.min(1, v)) * 0.4; nf.style.setProperty("--lv", level.toFixed(3)); }
  window.ultron.onLevel((v) => setLevel(Number(v) || 0)); // fallback recorder's level

  /* ---------- speaking: words reveal in the notch while his voice plays ---------- */
  let voice = null, saying = "", revealTimer = 0, foldTimer = 0, voiceCfg = null;
  // Wake the voice server so his first word doesn't wait on a cold start (Braino warms the same way).
  function warmVoice() { if (voiceCfg && window.AffectiveVoice) { (voice || AffectiveVoice.create(voiceCfg)).warm(); } }
  function layoutAnswer(text) {
    const norm = NR ? NR.normalizeNotchAnswer(text) : text;
    const long = norm.length > (NR ? NR.LONG_ANSWER_THRESHOLD : 100);
    // height follows the copy: chars per line at each width, 21px a line, room for the face on top
    const perLine = long ? 62 : 50, lines = Math.max(1, Math.ceil(norm.length / perLine));
    const notchH = parseFloat(getComputedStyle(nf).getPropertyValue("--nf-notch-h")) || 33;
    nf.style.setProperty("--ah", `${Math.min(380, Math.round(notchH + 36 + lines * 21.5 + 18))}px`);
    return { norm, long };
  }
  function reveal(text, msPerWord) {
    clearInterval(revealTimer);
    wordsEl.replaceChildren();
    const spans = String(text).split(/(\s+)/).map((w) => { const s = document.createElement("span"); s.textContent = w; wordsEl.append(s); return s; });
    let i = 0;
    revealTimer = setInterval(() => {
      while (i < spans.length && !spans[i].textContent.trim()) spans[i++].classList.add("in");
      if (i < spans.length) spans[i++].classList.add("in"); else clearInterval(revealTimer);
    }, msPerWord);
  }
  function foldLater(ms) {
    clearTimeout(foldTimer);
    foldTimer = setTimeout(() => { if (view === "answer") setView(liveOn ? "listen" : "idle"); }, ms);
  }
  let mouthRaf = 0;
  function mouthLoop(t) {
    const v = talking ? 0.35 + 0.65 * Math.abs(Math.sin(t / 95) * Math.sin(t / 260 + 1)) : 0;
    mouth.style.setProperty("--m", `${(1.4 + 4.5 * v).toFixed(2)}px`);
    mouthRaf = talking ? requestAnimationFrame(mouthLoop) : 0;
  }
  async function speak(text, cfg) {
    clearTimeout(foldTimer);
    saying = text;
    const { norm, long } = layoutAnswer(text);
    const pace = () => { const n = saying.split(/\s+/).length; return Math.max(110, Math.min(330, (saying.length * 62) / Math.max(1, n))); };
    const linger = () => (NR ? NR.notchAnswerLingerMs?.(norm) : 0) || 3500 + norm.length * 25;
    if (!window.AffectiveVoice) { setView("answer", long ? "long" : ""); reveal(norm, 70); foldLater(linger()); return; }
    if (!voice) voice = AffectiveVoice.create({
      ...cfg,
      // reads `saying` (the current line), never a captured old one
      onStart: () => { talking = true; setView("speak", nf.dataset.long ? "long" : ""); reveal(saying, pace()); if (!mouthRaf) mouthRaf = requestAnimationFrame(mouthLoop); window.ultron.spoke("start"); },
      onEnd: () => { talking = false; warmVoice(); if (view === "speak") { setView("answer", nf.dataset.long ? "long" : ""); foldLater(linger()); } window.ultron.spoke("end"); markActive(); },
    });
    nf.dataset.long = long ? "1" : "";
    voice.set(cfg);
    saying = norm;
    const ok = await voice.speak(norm);
    if (!ok && !talking && saying === norm && view === "think") { setView("answer", long ? "long" : ""); reveal(norm, 70); foldLater(linger()); }
  }
  function hush() { if (voice) voice.stop(); talking = false; }

  /* ---------- the live voice line (Braino's realtime, Ultron's ears) ---------- */
  let pc = null, dc = null, stream = null, actx = null, meterRaf = 0, idleTimer = 0, liveOn = false, opening = false;
  function markActive() { clearTimeout(idleTimer); if (liveOn) idleTimer = setTimeout(() => closeLive("idle"), IDLE_MS); }
  async function openLive() {
    if (liveOn || opening) return;
    opening = true; setView("listen");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      pc = new RTCPeerConnection();
      stream.getAudioTracks().forEach((tr) => pc.addTrack(tr, stream));
      dc = pc.createDataChannel("oai-events");
      dc.onopen = () => {
        // Braino's turn settings: every pause is a turn, but HE answers, not the model.
        dc.send(JSON.stringify({ type: "session.update", session: { type: "realtime", output_modalities: ["text"], audio: { input: { noise_reduction: { type: "far_field" }, turn_detection: { type: "semantic_vad", eagerness: "medium", create_response: false, interrupt_response: true } } } } }));
      };
      dc.onmessage = (e) => { try { onEvent(JSON.parse(e.data)); } catch (_) {} };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const r = await window.ultron.realtimeCall(offer.sdp);
      if (!r?.ok) throw new Error(r?.error || "realtime failed");
      await pc.setRemoteDescription({ type: "answer", sdp: r.sdp });
      // "disconnected" is a blip WebRTC recovers from on its own; only a dead line ends the session
      pc.onconnectionstatechange = () => { window.ultron.live(liveOn, `pc:${pc?.connectionState}`); if (["failed", "closed"].includes(pc?.connectionState)) closeLive(pc?.connectionState); };
      startMeter();
      liveOn = true; opening = false; window.ultron.live(true, "open"); markActive(); warmVoice();
    } catch (err) {
      opening = false; teardown(); setView("idle");
      window.ultron.fallback(String(err?.message || err)); // press-talk-press takes this press
    }
  }
  function startMeter() {
    try {
      actx = new AudioContext(); const an = actx.createAnalyser(); an.fftSize = 512;
      actx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => { an.getByteTimeDomainData(buf); let sum = 0; for (const b of buf) { const x = (b - 128) / 128; sum += x * x; } setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 5)); meterRaf = requestAnimationFrame(tick); };
      tick();
    } catch (_) {}
  }
  function teardown() {
    cancelAnimationFrame(meterRaf); meterRaf = 0;
    try { dc && dc.close(); } catch (_) {} try { pc && pc.close(); } catch (_) {}
    try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (_) {} try { actx && actx.close(); } catch (_) {}
    pc = dc = stream = actx = null;
  }
  function closeLive(why) {
    if (!liveOn && !opening) return;
    clearTimeout(idleTimer); teardown(); liveOn = false; opening = false; window.ultron.live(false, why);
    if (view === "listen") setView("idle");
    setLevel(0);
  }
  function onEvent(ev) {
    switch (ev.type) {
      case "input_audio_buffer.speech_started":
        // barge-in: you talk, he stops, the notch goes back to listening
        markActive();
        if (talking) hush();
        clearTimeout(foldTimer);
        setView("listen");
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const said = String(ev.transcript || "").trim();
        markActive();
        if (!said || /^[\s.,!?…-]*$/.test(said)) { if (view === "listen") setView("listen"); break; }
        heardEl.textContent = `“${said}”`;
        setView("think");
        window.ultron.turn(said);
        break;
      }
      case "input_audio_buffer.speech_stopped":
      case "input_audio_buffer.committed":
        window.ultron.live(liveOn, ev.type);
        break;
      case "error":
        window.ultron.live(liveOn, `error:${ev.error?.code || ""} ${ev.error?.message || ""}`.slice(0, 200));
        break;
    }
  }
  window.ultron.onPress(() => {
    if (liveOn || opening) { hush(); closeLive("press"); setView("idle"); }
    else void openLive();
  });

  /* ---------- states from main ---------- */
  window.ultron.onState((p) => {
    if (!p) return;
    if (p.state === "listening") { hush(); setView("listen"); return; }          // fallback recorder
    if (p.state === "thinking") { if (p.heard) heardEl.textContent = `“${p.heard}”`; setView("think"); return; }
    if (p.voice) voiceCfg = p.voice;
    if (p.state === "say") { void speak(String(p.text || ""), p.voice || {}); return; }
    if (!liveOn) setView("idle");
  });
})();
