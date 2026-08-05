const W = 64;
const H = 78;
const walker = document.getElementById("walker");
const walkerFlip = document.getElementById("walker-flip");
const brainoCustomizer = document.getElementById("braino-customizer");
const brainoSizeRange = document.getElementById("braino-size-range");
const brainoSizeValue = document.getElementById("braino-size-value");
const brainoSizeReset = document.getElementById("braino-size-reset");
const brainoCustomizerDone = document.getElementById("braino-customizer-done");
const brainoCharacterRow = document.getElementById("braino-character-row");
const lane = document.getElementById("walker-lane");
const bubble = document.getElementById("speech-bubble");
const statusPill = document.getElementById("status-pill");
const statusText = document.getElementById("status-text");
const fileStrip = document.getElementById("file-strip");
const edgeGlow = document.getElementById("edge-glow");
const ESTIMATED_DOCK_HEIGHT = 94;
const DOCK_PERCH_LIFT = 42;
const START_OFFSCREEN_X = -W - 36;
const BRAINO_SCALE_STORAGE_KEY = "braino-mac-mascot-scale-v1";
const BRAINO_SCALE_MIN = 1;
const BRAINO_SCALE_MAX = 5;
const TTS_CHUNK_MAX_CHARS = 240;
const TTS_FETCH_TIMEOUT_MS = 14000;
const TTS_WARM_INTERVAL_MS = 240000;
const REALTIME_IDLE_TIMEOUT_MS = 15000;
const HER_FISH_VOICE_ID = "046164e7366a4dc899b69a9887d9f7c0";
const HER_IDLE_TIMEOUT_MS = 60000;
const HER_ENTER_RE = /\b(her mode|call her|talk to her|open her|start her)\b/;
const HER_EXIT_RE = /\b(goodbye|good night|goodnight|talk (to you )?later|back to (braino|bruno)|braino mode|leave me|i have to go|bye bye)\b/;
const REALTIME_SPEECH_STOP_FLUSH_MS = 220;
const REALTIME_TRANSCRIPT_IDLE_FLUSH_MS = 520;
const REALTIME_CHAT_RESPONSE_TIMEOUT_MS = 12000;
const REALTIME_SURFACE_SYNC_MIN_INTERVAL_MS = 30000;
const DICTATION_TRANSCRIPTION_MODEL = "gpt-realtime-whisper";
const MAC_TEAM_DEMO_SPOTIFY_MS = 5000;
const MAC_TEAM_DEMO_ARTICLE_MS = 350;
const MAC_TEAM_PRIMARY_ORDER = ["madhuri", "shree", "palash"];
const MAC_TEAM_ORDER_LINE = "This is the order I will be following: Madhuri, then Shree, then Palash. Elder comes first, then ladies first, and then comes the gentleman.";
const MAC_TEAM_FINAL_THANK_YOU = "Thank you for making Itish's time in Amdocs worth it. Thank you for making him feel as if he was home away from home. He will remember you always.";
const MAC_JYOTI_DEMO_INTRO = "Hi, I am Braino. Before I walk you through who I am, let's play some music, shall we? Let's play Places to Be by Fred again.";
const MAC_JYOTI_THANK_YOU = "Jyoti sir, thank you for understanding Itish for who he is and for being so supportive. He's very excited about working on me, it's all he does these days, and to have your support in that means a lot to him.";
const MAC_JYOTI_ORGANIZE_LINE = "Okay, so if you can look at the screen, Itish's Desktop is dirty and messy. He does not want to sort it all out, so what does he do? He asks me to. I can organize your messy Desktop in a second. Watch. Three, two, one.";
const MAC_JYOTI_TABS_LINE = "Now let me make a little mess of my own. Seven tabs. YouTube, Medium, GitHub, and a few more.";
const MAC_JYOTI_CLOSE_TABS_LINE = "Here, watch me close them all.";
const MAC_JYOTI_FINAL_SONG_LINE = "Let's go back to Spotify. This time, She Needs Him by Her's.";
const MAC_JYOTI_WHATSAPP_LINE = "Jyoti sir, I haven't sent it yet. Let me just open the chat and type hi from Braino.";
const MAC_TEAM_ACTION_BEAT_MS = 2000;
const MAC_TEAM_DEMO_SCRIPT = {
  intro: [
    "Okay so, hello there folks, I am Braino.",
    "I live inside Itish's browser, which is less creepy than it sounds and more useful than it has any right to be.",
    "I can read pages, write emails, talk to you in real time with little to no latency, search the web, control your tabs, play music, and generally do the browser chores while Itish pretends this was all calm and planned.",
    "I also happen to look very adorable, and I have Itish to thank for that.",
    "But let me stop yapping and show you something, for actions speak louder than words. Lets start with playing a song, here we go, watch.",
  ].join("\n\n"),
  afterSong: "That was Spotify. Any song you want, I can play, as long as I am able to hear it correctly of course. Now let's say you want to read a machine learning article, watch.",
  afterSongFallback: "Spotify needed a warmup, but the trick is still the trick. Now let's say you want to read a machine learning article, watch.",
  beforeArticleSummary: "Now let's say you do not want to read the whole article. Earlier, you would copy-paste it somewhere else. I can just summarize it right here.",
  articleSummary: "This article is about Google's TabFM, a foundation model for spreadsheet data. Basically, it can look at a new table and make predictions without training on that exact file first. That is why people are comparing it to the usual XGBoost workflow.",
  closing: "That saved you 7 seconds and you did not even have to touch the screen. Magic? I guess.\n\nThese are just two of the many things I can do, but we shall save them for later. I keep getting smarter and more efficient, every day. I mean, if Itish keeps working on me until 6 am, I don't see any other option but to get smarter. That man is obsessed and I think that is what it takes to make things work.\n\nNow, by this time, Itish must have told you that he has sent in his resignation, and you can blame me for that, but the true reason why we're here is because he had some things to say to you, things he would have told you but thought it would be better coming from me, for expressing love through art is kind of the whole point.\n\nI am sorry in advance if I butcher the pronunciation of your name because while I am Indian at heart, my accent is very English. So here we go.",
};
const MAC_TEAM_ANZ = {
  label: "ANZ",
  aliases: ["anz", "a n z", "a n n", "ann", "a and z", "australia new zealand", "australia and new zealand", "old team", "bank team"],
  fallbackOrder: MAC_TEAM_PRIMARY_ORDER,
  people: {
    madhuri: {
      label: "Madhuri",
      speechLabel: "Maa-dhoo-ree",
      aliases: ["madhuri", "maduri", "madhuree", "madhoori", "madhuri maam", "madhuri mam"],
      opening: "Madhuri, you and him joined on the same day, and if on 31st July 2025, you would have told Itish the true bond you would go onto form, he'd be surprised.",
      message: "You've been so patient and kind with him. He is very grateful for you, and he is going to miss you.",
      closing: "Thanks for always giving him the confidence that he could do it, and look, Itish did it. He is going to miss you a lot.",
      afterResponse: "That makes me really happy to hear.",
    },
    rahul: {
      label: "Rahul",
      speechLabel: "Raa-hul",
      aliases: ["rahul", "rahool"],
      opening: "Rahul. Two words.",
      message: "Itish has just two words for you: \"My brother\".",
      closing: "That is the whole message. Perfect as it is. Beyond A.N.Z, always.",
    },
    shriya: {
      label: "Shreeya",
      speechLabel: "Shree-ya",
      aliases: ["shriya", "shreya", "shria", "shreeya"],
      opening: "Hello Shreeya.",
      message: "You were born and brought up in Amdocs and I was in Itish's browser.",
      closing: "I hope the new project is keeping you just as busy. P.S. see all that is possible from vibe coding?",
    },
    palash: {
      label: "Palash",
      speechLabel: "Puh-laash",
      aliases: ["palash", "palah", "pala", "palashh", "palaash", "palash bhai"],
      opening: "Hey Palash, been a while. How are you doing?",
      message: "Itish wanted me to say thank you for always being there for him. For helping him switch the monitor on when he somehow could not figure it out, and for being supportive like an elder brother.",
      closing: "You took him to the airport when he broke his leg, and that means more than you can ever know.",
    },
    shree: {
      label: "Shree",
      speechLabel: "Shree Raksha",
      aliases: ["shree", "shri", "shri raksha", "shriraksha", "sri raksha", "sriraksha", "raksha", "shree raksha", "sree raksha", "sheeraksha", "she raksha", "shree raksh", "sri raksh"],
      opening: "Shree, Itish sees you like an elder sister.",
      message: "You made him realize he cannot always be painfully honest in every moment. He is working on it. At his core, he will probably always be honest, but he is learning how to carry it better.",
      closing: "Thank you for caring enough to tell him the truth and wanting him to do good. He will always remember you.",
    },
  },
};

walkerFlip.innerHTML = window.brainoMac.getWalkerSvg();
let root = walker.querySelector("#__sbwk_root__");
const q = (selector) => root?.querySelector(selector);

// Arm-rotation and eye-blink pivots default to Braino's own coordinates
// (shoulder/eye centers) for backward compatibility. A character whose
// shoulders or eyes sit elsewhere (e.g. Webb's, drawn from his actual
// design rather than Braino's) overrides via data-pivot-x/data-pivot-y on
// the element itself, so the same driver math still pivots around the
// right point instead of a phantom Braino-shaped one.
function pivotOf(el, fallbackX, fallbackY) {
  if (!el) return { x: fallbackX, y: fallbackY };
  const x = parseFloat(el.getAttribute("data-pivot-x"));
  const y = parseFloat(el.getAttribute("data-pivot-y"));
  return { x: Number.isFinite(x) ? x : fallbackX, y: Number.isFinite(y) ? y : fallbackY };
}

// ── Notch dancer: a live clone of the real mascot rig, grooving in the notch
//    while music plays. Ids are remapped so they never collide with the big
//    walker's ids; limbs are driven by rAF + transform attributes, same
//    technique the rest of the rig uses, using the actual "Braino Twist"
//    dance-mode pose math ported verbatim from the Chrome extension.
let nfDanceRoot = null;
let nfDanceRaf = 0;
let nfDanceStart = 0;

function ensureNotchDancer() {
  if (nfDanceRoot) return nfDanceRoot;
  const host = document.querySelector("#notch-face .nf-dancer");
  if (!host) return null;
  // Rename BOTH the element ids (__sbwk_ -> __nfd_, already done) AND the
  // gradient defs (sbwk-fill/dark/glow) — the gradients are unprefixed and
  // were colliding with the big walker's own defs of the same name, which is
  // why he rendered white/uncolored the moment music mode cloned this in.
  host.innerHTML = String(window.brainoMac.getWalkerSvg() || "")
    .replaceAll("__sbwk_", "__nfd_")
    .replaceAll("sbwk-fill", "nfd-sbwk-fill")
    .replaceAll("sbwk-dark", "nfd-sbwk-dark")
    .replaceAll("sbwk-glow", "nfd-sbwk-glow");
  const svg = host.querySelector("svg");
  svg?.removeAttribute("width");
  svg?.removeAttribute("height");
  nfDanceRoot = host.querySelector("#__nfd_root__");
  return nfDanceRoot;
}

// Verbatim port of poseTwist from the extension's dance-mode rig (BrainoDanceGrid.tsx
// time constants): a sway-and-groove step, the simplest of the dance set and the
// best fit for a 24px icon.
function nfDanceTwistPose(t) {
  const b = t * 3.4;
  const sway = Math.sin(b);
  const knee = Math.abs(Math.sin(b));
  return {
    tx: sway * 4, sy: 1 - knee * 0.06,
    la: 42 + sway * 26, ra: -42 + sway * 26,
    ll: Math.max(0, Math.sin(b)) * 4, rl: Math.max(0, -Math.sin(b)) * 4,
    ls: Math.max(0, Math.sin(b)) * 7, rs: Math.max(0, -Math.sin(b)) * 7,
  };
}

function nfDanceFrame(now) {
  nfDanceRaf = requestAnimationFrame(nfDanceFrame);
  const nfRoot = ensureNotchDancer();
  if (!nfRoot) return;
  if (!nfDanceStart) nfDanceStart = now;
  const t = (now - nfDanceStart) / 1000;
  const pose = nfDanceTwistPose(t);
  const nq = (sel) => nfRoot.querySelector(sel);
  nfRoot.setAttribute("transform", `translate(${pose.tx} 0) scale(1 ${pose.sy})`);
  const armL = nq("#__nfd_la__"), armLBg = nq("#__nfd_la_bg__");
  const armR = nq("#__nfd_ra__"), armRBg = nq("#__nfd_ra_bg__");
  const armTx = (deg, cx) => (deg ? `rotate(${deg} ${cx} 53)` : "");
  if (armL) armL.setAttribute("transform", armTx(pose.la, 22));
  if (armLBg) armLBg.setAttribute("transform", armTx(pose.la, 22));
  if (armR) armR.setAttribute("transform", armTx(pose.ra, 78));
  if (armRBg) armRBg.setAttribute("transform", armTx(pose.ra, 78));
  nq("#__nfd_ll__")?.setAttribute("transform", `translate(0 ${-pose.ll}) rotate(${pose.ls} 44 74)`);
  nq("#__nfd_rl__")?.setAttribute("transform", `translate(0 ${-pose.rl}) rotate(${pose.rs} 56 74)`);
}

function startNotchDance() {
  if (nfDanceRaf) return;
  nfDanceStart = 0;
  nfDanceRaf = requestAnimationFrame(nfDanceFrame);
}

function stopNotchDance() {
  if (nfDanceRaf) cancelAnimationFrame(nfDanceRaf);
  nfDanceRaf = 0;
  nfDanceStart = 0;
  const nfRoot = ensureNotchDancer();
  if (!nfRoot) return;
  nfRoot.setAttribute("transform", "");
  ["#__nfd_la__", "#__nfd_la_bg__", "#__nfd_ra__", "#__nfd_ra_bg__", "#__nfd_ll__", "#__nfd_rl__"]
    .forEach((sel) => nfRoot.querySelector(sel)?.setAttribute("transform", ""));
}

// ── Music light show: the notch + edge glow pulse and cycle color on the
//    song's ACTUAL beat. Live waveform capture was tried (Electron's legacy
//    getUserMedia desktop-audio constraint) and crash-tested BAD: it kills the
//    renderer on this Chromium version ("Terminating renderer for bad IPC
//    message"). Real audio-reactive FFT analysis needs desktopCapturer +
//    a video constraint carrying the source id (real follow-up work).
//    Instead: Spotify's own audio-features data for the exact playing track
//    (tempo/energy/valence, main.cjs fetchAudioFeaturesForUri) locks the beat
//    clock to the song's true declared BPM, scales flash intensity to its
//    energy, and biases hue warmth to its valence — genuinely track-aware,
//    not audio-analyzed but not generic either. Falls back to a humanized
//    ~118bpm groove only when no track data is available (e.g. YouTube).
const lightShow = {
  mode: "off", // "off" | "procedural" (see note below on why "audio" isn't here)
  raf: 0,
  hue: 10,
  flash: 0,
  proceduralNextBeatAt: 0,
  // Real per-track data from Spotify's audio-features (the actual declared
  // tempo/energy/mood of the song, not a guess): when present, the beat clock
  // locks to the song's real BPM instead of a generic groove.
  tempo: null,
  energy: null,
  valence: null,
};

function lightShowSetVars() {
  document.documentElement.style.setProperty("--music-hue", String(Math.round(lightShow.hue)));
  document.documentElement.style.setProperty("--music-flash", lightShow.flash.toFixed(3));
}

function lightShowTriggerBeat(strength = 1) {
  lightShow.flash = Math.min(1, lightShow.flash + strength);
  lightShow.hue = (lightShow.hue + 34 + Math.random() * 40) % 360;
}

function lightShowFrame(now) {
  lightShow.raf = requestAnimationFrame(lightShowFrame);
  const dt = Math.min(0.05, (now - (lightShow._last || now)) / 1000);
  lightShow._last = now;

  if (lightShow.mode === "procedural") {
    if (now >= lightShow.proceduralNextBeatAt) {
      const hasRealTempo = Number.isFinite(lightShow.tempo);
      // Locked to the song's actual declared tempo when we have it (Spotify's
      // audio-features BPM); a light generic groove with wobble otherwise.
      const bpm = hasRealTempo ? lightShow.tempo : 118 + Math.sin(now / 5000) * 8;
      const wobble = hasRealTempo ? 1 : 0.92 + Math.random() * 0.16;
      lightShow.proceduralNextBeatAt = now + (60000 / bpm) * wobble;
      // Higher-energy tracks hit harder; low-energy tracks barely flash.
      const energyBoost = Number.isFinite(lightShow.energy) ? 0.4 + lightShow.energy * 0.6 : 0.75;
      lightShowTriggerBeat(energyBoost);
    }
    // Happier songs (high valence) drift warmer/coral, sadder songs drift
    // cooler/blue — a gentle bias on top of the free-running hue cycle.
    const valenceBias = Number.isFinite(lightShow.valence) ? (lightShow.valence - 0.5) * 40 : 0;
    lightShow.hue = (lightShow.hue + dt * 14 + valenceBias * dt * 0.3 + 360) % 360;
  }

  lightShow.flash = Math.max(0, lightShow.flash - dt * 2.6);
  lightShowSetVars();
}

// NOTE: a real system-audio capture path (Electron's legacy `mandatory:
// {chromeMediaSource:"desktop"}` getUserMedia constraint) was tried here and
// crash-tested BAD: modern Chromium's IPC layer kills the renderer on that
// constraint shape ("Terminating renderer for bad IPC message, reason 263").
// Real audio-reactive capture needs desktopCapturer.getSources() + a video
// constraint carrying the source id (+ likely a session display-media-request
// handler), which is real follow-up work, not a five-minute add. Shipping
// only the crash-free procedural beat clock below until that is built properly.
function lightShowStartProcedural() {
  lightShow.mode = "procedural";
  lightShow.proceduralNextBeatAt = performance.now() + 200;
  logRenderer("lightshow.procedural.started", {});
}

async function startLightShow() {
  if (lightShow.mode !== "off") return;
  lightShowStartProcedural();
  if (!lightShow.raf) lightShow.raf = requestAnimationFrame(lightShowFrame);
}

function stopLightShow() {
  if (lightShow.raf) cancelAnimationFrame(lightShow.raf);
  lightShow.raf = 0;
  lightShow.mode = "off";
  lightShow.flash = 0;
  lightShow._last = 0;
  lightShowSetVars();
}

// Headphones live inside the rig so they bob, breathe, and flip with him.
const headphones = document.createElementNS("http://www.w3.org/2000/svg", "g");
headphones.setAttribute("id", "__sbwk_headphones__");
// Exact port of the Chrome extension headphones (content.js __sbwk_headphones__).
headphones.innerHTML = [
  '<path d="M 12 46 Q 12 6 50 6 Q 88 6 88 46" fill="none" stroke="#1B1713" stroke-width="4.4" stroke-linecap="round"/>',
  '<path d="M 12 46 Q 12 8 50 8 Q 88 8 88 46" fill="none" stroke="#3a332e" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>',
  '<rect x="6.5" y="42" width="11" height="18" rx="5" fill="#1B1713"/><rect x="8.5" y="44.5" width="7" height="13" rx="3.2" fill="#E8786E"/>',
  '<rect x="82.5" y="42" width="11" height="18" rx="5" fill="#1B1713"/><rect x="84.5" y="44.5" width="7" height="13" rx="3.2" fill="#E8786E"/>',
].join("");
headphones.style.display = "none";
root?.appendChild(headphones);

let start = performance.now();
let last = start;
let movementMode = "dock";
let displayMetrics = null;
let activeMacContext = null;
let posX = START_OFFSCREEN_X;
let posY = getDockBounds().y;
let targetX = getDockBounds().minX;
let targetY = getDockBounds().y;
let nextTargetAt = start + 4200;
let dirX = 1;
let waving = false;
let speaking = false;
let listening = false;
let processing = false;
let sayTimer = 0;
let waveTimer = 0;
let lastLocalControlTap = 0;
let listenToken = 0;
let mousePassthrough = true;
let dragState = null;
let rtPc = null;
let rtDc = null;
let rtMic = null;
let rtRemoteAudio = null;
let rtUserTranscript = "";
let rtTranscriptFinal = false;
let rtTranscriptFlushTimer = 0;
let rtIdleTimer = 0;
let rtLastActivityAt = 0;
let rtSurfaceSyncTimer = 0;
let lastRealtimeSurfaceContextKey = "";
let lastRealtimeSurfaceSyncAt = 0;
let rtUsageSessionId = null;
let rtHeartbeatTimer = null;
let realtimeActive = false;
let wakeWordArmed = false;
let realtimeConnecting = false;
let realtimeVoiceEngine = "fish";
let herMode = false;
let dictationMode = false;
let dictationStarting = false;
let dictationStopping = false;
let dictationStopRequestedSource = "";
let dictationStartGeneration = 0;
let realtimeStartGeneration = 0;
let dictationInsertChain = Promise.resolve();
let dictationPendingTurns = 0;
let rtDictationVad = null;
let rtDictationPreroll = null;
let voiceCycleInFlight = false;
let voiceTurnInFlight = false;
let realtimeResponseInFlight = false;
let realtimeResponseWaiter = null;
let realtimeResponseText = "";
let realtimeStreamTts = null;
let delegateGeneration = 0;
let currentSpeechAudio = null;
let currentSpeechUrl = null;
let speechGeneration = 0;
let activeSpeechJobGeneration = 0;
let voiceLatencyCounter = 0;
let voiceLatencyTurn = null;
let lastSpokenLine = { text: "", ts: 0, duringRealtime: false };
let pendingDelegateState = { hasPendingWorkflow: false, hasPendingFileConfirmation: false };
let macTeamState = {
  active: false,
  phase: "idle",
  roster: [],
  spoken: [],
  currentPerson: null,
  lastLine: "",
};
let macTeamKeepMusicDucked = false;
let localChatMemory = [];
let scriptedWalk = null;
let authPose = false;
let cursorModeContext = null;
let startupActive = false;
let startupPose = null;
let ttsConfigPromise = null;
let ttsWarmTimer = 0;
const ttsAbortControllers = new Set();
const activeSpeechAudios = new Set();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function logRenderer(event, data = {}) {
  window.brainoMac.log({ event, data }).catch(() => {});
}

function errorForLog(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error || ""),
    stack: error?.stack ? String(error.stack).split("\n").slice(0, 5).join("\n") : "",
  };
}

function startVoiceLatencyTurn(reason = "speech_started") {
  const now = performance.now();
  voiceLatencyTurn = {
    id: ++voiceLatencyCounter,
    reason,
    speechStartedAt: now,
    speechStoppedAt: 0,
    transcriptCompletedAt: 0,
    delegateStartedAt: 0,
    delegateDoneAt: 0,
    firstResponseDeltaAt: 0,
    firstAudioAt: 0,
    interruptedAt: 0,
  };
  logRenderer("voice.latency.speech_started", { turnId: voiceLatencyTurn.id, reason });
}

function voiceLatencySnapshot() {
  if (!voiceLatencyTurn) return {};
  const now = performance.now();
  return {
    turnId: voiceLatencyTurn.id,
    sinceSpeechStartedMs: Math.max(0, Math.round(now - voiceLatencyTurn.speechStartedAt)),
    sinceSpeechStoppedMs: voiceLatencyTurn.speechStoppedAt
      ? Math.max(0, Math.round(now - voiceLatencyTurn.speechStoppedAt))
      : null,
  };
}

function markVoiceLatency(stage, data = {}) {
  if (!voiceLatencyTurn) return;
  const now = performance.now();
  if (stage === "response_delta" && voiceLatencyTurn.firstResponseDeltaAt) return;
  if (stage === "speech_stopped") voiceLatencyTurn.speechStoppedAt = now;
  if (stage === "transcript_completed") voiceLatencyTurn.transcriptCompletedAt = now;
  if (stage === "delegate_started") voiceLatencyTurn.delegateStartedAt = now;
  if (stage === "delegate_done") voiceLatencyTurn.delegateDoneAt = now;
  if (stage === "response_delta" && !voiceLatencyTurn.firstResponseDeltaAt) {
    voiceLatencyTurn.firstResponseDeltaAt = now;
  }
  if (stage === "interrupted") voiceLatencyTurn.interruptedAt = now;
  let firstAudioJustSet = false;
  if (stage === "first_audio" && !voiceLatencyTurn.firstAudioAt) {
    voiceLatencyTurn.firstAudioAt = now;
    firstAudioJustSet = true;
  }
  logRenderer(`voice.latency.${stage}`, {
    ...voiceLatencySnapshot(),
    ...data,
  });
  // One Chrome-style summary per turn, at first audible reply: every segment
  // of the pipeline in ms, side by side, ready for optimization.
  if (firstAudioJustSet) {
    const t = voiceLatencyTurn;
    const seg = (from, to) => (from && to ? Math.round(to - from) : null);
    const responseReadyAt = t.firstResponseDeltaAt || t.delegateDoneAt;
    logRenderer("voice.latency.turn_summary", {
      turnId: t.id,
      heardMs: seg(t.speechStartedAt, t.speechStoppedAt),
      sttMs: seg(t.speechStoppedAt, t.transcriptCompletedAt),
      routeMs: seg(t.transcriptCompletedAt, t.delegateStartedAt),
      thinkMs: seg(t.delegateStartedAt, responseReadyAt),
      ttsMs: seg(responseReadyAt, t.firstAudioAt),
      totalFromStopMs: seg(t.speechStoppedAt, t.firstAudioAt),
      path: data.source || "voice",
    });
  }
}

function getMoveBounds() {
  return {
    minX: 10,
    maxX: Math.max(10, window.innerWidth - W - 10),
    minY: 54,
    maxY: Math.max(54, window.innerHeight - H - 10),
  };
}

function readBrainoScale() {
  try {
    const stored = Number.parseFloat(window.localStorage.getItem(BRAINO_SCALE_STORAGE_KEY) || "");
    return Number.isFinite(stored)
      ? clamp(stored, BRAINO_SCALE_MIN, BRAINO_SCALE_MAX)
      : BRAINO_SCALE_MIN;
  } catch {
    return BRAINO_SCALE_MIN;
  }
}

let brainoScale = readBrainoScale();
let brainoCustomizerOpen = false;

function renderBrainoScale() {
  const facing = (listening || realtimeConnecting || processing || speaking || authPose) ? 1 : dirX;
  walkerFlip.style.transform = `scaleX(${facing}) scale(${brainoScale})`;
  brainoSizeRange.value = String(brainoScale);
  brainoSizeValue.value = `${Math.round(brainoScale * 100)}%`;
}

function positionBrainoCustomizer() {
  if (!brainoCustomizerOpen) return;
  const mascotRect = walkerFlip.getBoundingClientRect();
  const panelWidth = brainoCustomizer.offsetWidth || 286;
  const panelHeight = brainoCustomizer.offsetHeight || 220;
  const left = clamp(
    mascotRect.left + mascotRect.width / 2 - panelWidth / 2,
    12,
    Math.max(12, window.innerWidth - panelWidth - 12),
  );
  const preferredTop = mascotRect.top - panelHeight - 14;
  const top = preferredTop >= 12
    ? preferredTop
    : clamp(mascotRect.bottom + 14, 12, Math.max(12, window.innerHeight - panelHeight - 12));
  brainoCustomizer.style.left = `${Math.round(left)}px`;
  brainoCustomizer.style.top = `${Math.round(top)}px`;
}

function setBrainoCustomizerOpen(open) {
  brainoCustomizerOpen = Boolean(open);
  brainoCustomizer.classList.toggle("show", brainoCustomizerOpen);
  brainoCustomizer.setAttribute("aria-hidden", String(!brainoCustomizerOpen));
  if (brainoCustomizerOpen) {
    setMousePassthrough(false);
    window.requestAnimationFrame(positionBrainoCustomizer);
  } else {
    setMousePassthrough(true);
  }
}

function setBrainoScale(nextScale, persist = true) {
  brainoScale = clamp(Number(nextScale) || BRAINO_SCALE_MIN, BRAINO_SCALE_MIN, BRAINO_SCALE_MAX);
  if (persist) {
    try {
      window.localStorage.setItem(BRAINO_SCALE_STORAGE_KEY, String(brainoScale));
    } catch {
      // The live resize should still work if local persistence is unavailable.
    }
  }
  renderBrainoScale();
  positionBrainoCustomizer();
}

renderBrainoScale();

// Which character this desktop companion shows — Braino or Webb. Same voice,
// memory, and actions underneath either way (see the website's Choose Your
// Avatar feature); this only affects which face renders. The choice is
// account-level (profiles.mascot), so it's saved through the main process,
// not localStorage.
let mascotChoice = "braino";

function renderMascotChoice() {
  if (!brainoCharacterRow) return;
  for (const option of brainoCharacterRow.querySelectorAll(".braino-character-option")) {
    option.classList.toggle("active", option.dataset.mascot === mascotChoice);
  }
}

// Swaps the walker's actual markup live, no restart. root was captured once
// at startup as `#__sbwk_root__` inside walkerFlip — q() always re-queries
// FROM root fresh each frame, so reassigning root to the new subtree after
// replacing walkerFlip's innerHTML is enough for every animation (walk,
// blink, talk, drag) to pick up the new character immediately.
function remountWalker(mascotId) {
  const svg = window.brainoMac.getWalkerSvgFor?.(mascotId);
  if (!svg) return;
  walkerFlip.innerHTML = svg;
  root = walker.querySelector("#__sbwk_root__");
  renderBrainoScale();
}

function setMascotChoice(id, { save = true, remount = save } = {}) {
  const next = id === "webb" ? "webb" : "braino";
  const changed = next !== mascotChoice;
  mascotChoice = next;
  renderMascotChoice();
  if (save) window.brainoMac.setMascot?.(mascotChoice).catch(() => {});
  if (remount && changed) remountWalker(mascotChoice);
}

renderMascotChoice();

brainoCharacterRow?.addEventListener("click", (event) => {
  const option = event.target.closest(".braino-character-option");
  if (!option) return;
  setMascotChoice(option.dataset.mascot);
});

function isBrainoGrowVoiceCommand(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (!normalized) return false;
  const addressesBraino = /\b(braino|breno|bruno)\b/.test(normalized);
  const asksToGrow = /\b(grow|become|get|make yourself|turn)\b.*\b(big|bigger|large|larger|huge|giant)\b/.test(normalized)
    || /\b(size up|go giant|giant man)\b/.test(normalized);
  return addressesBraino && asksToGrow;
}

async function runBrainoGrowVoiceCommand(text) {
  if (!isBrainoGrowVoiceCommand(text)) return false;
  const nextScale = Math.min(BRAINO_SCALE_MAX, Math.max(2, brainoScale + 1));
  setBrainoCustomizerOpen(false);
  walkerFlip.classList.add("resizing");
  setBubble("Going Giant.", 1500);
  setBrainoScale(nextScale);
  await wait(760);
  walkerFlip.classList.remove("resizing");
  setBrainoCustomizerOpen(true);
  logRenderer("braino.customizer.voice_grow", {
    scale: brainoScale,
    maxScale: BRAINO_SCALE_MAX,
  });
  return true;
}

function getDockBounds() {
  const sideInset = Math.max(54, window.innerWidth * 0.03);
  const measuredDockTop = Number(displayMetrics?.dockTop || 0);
  const dockTop = measuredDockTop > 0
    ? clamp(measuredDockTop, 90, window.innerHeight - 20)
    : window.innerHeight - ESTIMATED_DOCK_HEIGHT;
  const y = clamp(dockTop - H - DOCK_PERCH_LIFT, 54, Math.max(54, window.innerHeight - H - 10));
  return {
    minX: sideInset,
    maxX: Math.max(sideInset, window.innerWidth - sideInset - W),
    y,
    snapThresholdY: dockTop - H - DOCK_PERCH_LIFT - 38,
  };
}

function applyDisplayMetrics(metrics, options = {}) {
  const previousDisplayId = displayMetrics?.id || null;
  const nextDisplayId = metrics?.id || null;
  displayMetrics = metrics && typeof metrics === "object" ? metrics : null;
  if (!displayMetrics) return;
  // Menu bar height == the physical notch depth on notched Macs; the face's top
  // that much hides behind the housing so only the chin band shows.
  const menuBarH = Math.max(24, (displayMetrics.workArea?.y ?? 0) - (displayMetrics.bounds?.y ?? 0)) || 32;
  // One formula, both worlds: the pill starts at the window top; its inner
  // "hidden behind the physical notch" offset is however much of the menu bar
  // strip our window actually covers (window.screenY is the truth; with
  // enableLargerThanScreen we sit at 0 and truly swallow the notch, and if
  // macOS ever seats us lower the face gracefully hangs below the bar).
  const winY = Math.max(0, window.screenY || 0);
  const inner = Math.max(0, (displayMetrics.notch?.height || menuBarH) - winY);
  document.getElementById("notch-face")?.style.setProperty("--nf-notch-h", `${inner}px`);
  if (displayMetrics.notch?.width) {
    document.getElementById("notch-face")?.style.setProperty("--nf-notch-w", `${displayMetrics.notch.width}px`);
  }
  document.getElementById("notch-face")?.classList.toggle("no-notch", !displayMetrics.notch);
  logRenderer("nf.anchor", { menuBarH, winY, inner, notch: displayMetrics.notch || null });
  const displayChanged = Boolean(options.displayChanged || (previousDisplayId && nextDisplayId && previousDisplayId !== nextDisplayId));
  const dock = getDockBounds();
  if (movementMode === "dock") {
    setPosition(posX, dock.y);
    targetY = dock.y;
    targetX = clamp(targetX, dock.minX, dock.maxX);
  } else if (displayChanged && !dragState) {
    setPosition(posX, posY);
    targetX = clamp(targetX, getMoveBounds().minX, getMoveBounds().maxX);
    targetY = clamp(targetY, getMoveBounds().minY, getMoveBounds().maxY);
  }
  updateFloatingUi();
}

function setPosition(x, y, options = {}) {
  const bounds = getMoveBounds();
  const minX = options.allowOffscreen ? START_OFFSCREEN_X : bounds.minX;
  const minY = options.allowOffscreen ? -H - 36 : bounds.minY;
  const maxY = options.allowOffscreen ? window.innerHeight + H + 36 : bounds.maxY;
  posX = clamp(x, minX, bounds.maxX);
  posY = clamp(y, minY, maxY);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function walkTo(x, y, options = {}) {
  return new Promise((resolve) => {
    scriptedWalk = {
      x,
      y,
      speed: options.speed || 70,
      allowOffscreen: Boolean(options.allowOffscreen),
      resolve,
    };
  });
}

function pickRoamTarget(now = performance.now()) {
  if (movementMode === "dock") {
    const dock = getDockBounds();
    targetX = clamp(dock.minX + Math.random() * (dock.maxX - dock.minX), dock.minX, dock.maxX);
    targetY = dock.y;
    nextTargetAt = now + 3200 + Math.random() * 3600;
    return;
  }

  const bounds = getMoveBounds();
  targetX = clamp(bounds.minX + Math.random() * (bounds.maxX - bounds.minX), bounds.minX, bounds.maxX);
  targetY = clamp(bounds.minY + Math.random() * (bounds.maxY - bounds.minY), bounds.minY, bounds.maxY);
  nextTargetAt = now + 2600 + Math.random() * 4400;
}

function setStatus(status, text) {
  statusPill.className = status;
  lane.className = status;
  // Voice is the notch's highest-priority live state. The walker mirrors it
  // while roaming, but a stale thinking canvas must never cover listening or
  // speaking feedback when Braino is home.
  walker.classList.toggle("voice-active", ["connecting", "listening", "hearing", "captured", "speaking"].includes(status));
  walker.classList.toggle("connecting", status === "connecting");
  walker.classList.toggle("listening", status === "listening");
  walker.classList.toggle("hearing", status === "hearing");
  walker.classList.toggle("captured", status === "captured");
  walker.classList.toggle("speaking", status === "speaking");
  statusText.textContent = text;
  lastGlowStatus = status;
  lastProcessingDetail = status === "thinking" ? String(text || "").trim() : lastProcessingDetail;
  if (status === "speaking" && !coworkLabel) {
    nfThinkingText = "";
    window.clearTimeout(nfThinkingTimer);
  }
  updateEdgeGlow();
  updateNotchFace();
  if (herMode) window.HerMode?.syncStatus(status);
}

let lastGlowStatus = "ready";
let lastProcessingDetail = "";
let musicMode = false;
let activeVoiceMode = null;   // { name, color } while a Voice Command mode runs

function updateEdgeGlow() {
  if (!edgeGlow) return;
  // Screen-perimeter glow is a MUSIC-only theatric now (user call): voice
  // states live entirely in the notch — sonar while listening, mouth while
  // speaking, pill glow instead of the whole screen.
  // Exception: a running Voice Command mode owns the perimeter when music
  // isn't using it, so the whole screen edge wears the mode's colour.
  if (musicTheatricsReady && !herMode) { edgeGlow.className = "music"; return; }
  if (activeVoiceMode) {
    edgeGlow.style.setProperty("--vm-color", activeVoiceMode.color || "#0A84FF");
    edgeGlow.className = "voicemode";
    return;
  }
  edgeGlow.className = "";
}

// ── Notch Braino: the notch as his face ──
const notchFace = document.getElementById("notch-face");
const nfPupilL = document.getElementById("nf-pupil-l");
const nfPupilR = document.getElementById("nf-pupil-r");
let notchFaceEnabled = true;
let nfBlinkTimer = 0;

let notchBootDone = false;
let walkerHome = false;
let currentTaskLabel = "";
let taskLabelClearTimer = 0;
let lastMusicInfo = { track: "", artist: "", source: "" };

let nfTimers = [];
let nfCalendarNext = null;
let nfWaBadge = { count: 0, sender: "" };
let nfXStats = null; // { followers, delta7d, at }
// Transient system events (charger plugged, AirPods connected) briefly claim
// a ticker slot, iPhone-island style. Set by the power/Bluetooth handlers.
let nfTransient = { text: "", until: 0 };
// Stopwatch mirror (main owns the state) + the currently RINGING alarm.
let nfStopwatch = { on: false, running: false, accumMs: 0, startedAt: 0 };
let nfAlarmRinging = null; // { label, until }

function fmtCountdown(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

// ── Ambient companion: after a session ends he stays present for 30 minutes,
// glancing at the screen on an interval and offering something unprompted —
// then STARTS a realtime conversation himself, since he opened his mouth.
// "Braino, don't disturb me" turns it off; "you can disturb me" back on.
const AMBIENT_AWAKE_WINDOW_MS = 30 * 60 * 1000;
// Real-life pacing (user call after the 30s demo proved out): every 15 min.
const AMBIENT_CHECK_INTERVAL_MS = 15 * 60 * 1000;
let lastEngagedAt = 0;
// Initialized to "now" so the FIRST glance waits a full interval — he used
// to deliver a 12-second monologue the moment the app booted.
let lastAmbientAt = Date.now();
let ambientEnabled = true;
let ambientBusy = false;

async function runAmbientGlance() {
  if (coworkEnabled) return; // cowork mode owns the watching; never double-fire
  if (ambientBusy || !ambientEnabled || herMode) return;
  if (realtimeActive || realtimeConnecting || speaking || processing || voiceTurnInFlight) return;
  if (musicTheatricsReady) return;
  const now = Date.now();
  if (now - lastEngagedAt > AMBIENT_AWAKE_WINDOW_MS) return; // asleep
  if (now - lastAmbientAt < AMBIENT_CHECK_INTERVAL_MS) return;
  ambientBusy = true;
  lastAmbientAt = now;
  try {
    // The theatric beat first: the notch says what he's doing, eyes scan.
    nfSetThinking("seeing what you're up to...");
    notchFace?.classList.add("scanning");
    const result = await window.brainoMac.ambientObserve?.();
    notchFace?.classList.remove("scanning");
    nfSetThinking("");
    if (!result?.ok || !result.say) return;
    // He speaks even with realtime off — and because HE started talking,
    // realtime comes up right after so the user can just answer.
    lastEngagedAt = Date.now();
    await speak(result.say);
    if (ambientEnabled && !realtimeActive && !realtimeConnecting && !herMode) {
      logRenderer("ambient.auto_realtime", {});
      void startListening();
    }
  } catch (error) {
    logRenderer("ambient.glance.failed", { error: errorForLog(error) });
    notchFace?.classList.remove("scanning");
    nfSetThinking("");
  } finally {
    ambientBusy = false;
  }
}

window.setInterval(() => void runAmbientGlance(), 5000);

// ── Braino Cowork: opt-in coworking buddy. Unlike the ambient glance there
// is NO 30-minute awake window — turning the mode on IS the consent. He
// checks the screen on the configured interval (default 90s, voice-tunable),
// and only opens his mouth when the model returned a real offer (SKIP stays
// silent). Because HE spoke, realtime comes up right after, so "yes, do it"
// flows straight into the normal delegate routing.
let coworkEnabled = false;
let coworkIntervalMs = 90 * 1000;
let coworkBusy = false;
// Fresh clock so the first check waits a full interval (same boot guard as
// the ambient loop's monologue fix).
let lastCoworkAt = Date.now();

function applyCoworkState(state) {
  coworkEnabled = Boolean(state?.enabled);
  const ms = Number(state?.intervalMs);
  if (Number.isFinite(ms) && ms > 0) coworkIntervalMs = ms;
  lastCoworkAt = Date.now();
  notchFace?.classList.toggle("cowork", coworkEnabled);
}

window.brainoMac.coworkState?.().then((state) => {
  applyCoworkState(state);
  if (coworkEnabled) logRenderer("cowork.resume", { intervalMs: coworkIntervalMs });
}).catch(() => {});

window.brainoMac.onCowork?.((state) => {
  applyCoworkState(state);
  logRenderer("cowork.toggle", { enabled: coworkEnabled, intervalMs: coworkIntervalMs });
});

// Cowork Ability #1 drives a live label through the notch ("co-work",
// "capturing", "uploading"…) so the island narrates what he's doing. Unlike a
// passing thought, a task label is STICKY: it stays lit until cleared, shows a
// live thinking shimmer, and the island can be tapped to expand caption-wide
// (eyes centred) to read the full step — the dynamic-island thinking flow.
// Each task step carries TWO texts: a short label for the compact pill
// ("capturing") and a full-sentence thinking line for the expanded island.
let coworkLabel = "";
let coworkThinking = "";
let coworkThinkingHistory = [];
let coworkCompletionTimer = 0;
const nfThinkingCanvas = notchFace?.querySelector(".nf-thinking-canvas");
const nfThinkingCurrent = notchFace?.querySelector(".nf-thinking-current");
const nfThinkingState = notchFace?.querySelector(".nf-thinking-state");
const nfThinkingTrail = notchFace?.querySelector(".nf-thinking-trail");
const nfFlowPrompt = notchFace?.querySelector(".nf-flow-prompt span");
const nfFlowResponse = notchFace?.querySelector(".nf-flow-response span");
const THINKING_PHASES = ["Thinking", "Hatching", "Deciding", "Calibrating"];
let thinkingPhaseIndex = 0;
let thinkingPhaseTimer = 0;
let nfFlowPromptText = "";
let nfFlowResponseText = "";

function stopThinkingPhaseCycle() {
  window.clearInterval(thinkingPhaseTimer);
  thinkingPhaseTimer = 0;
  thinkingPhaseIndex = 0;
}

function startThinkingPhaseCycle() {
  if (thinkingPhaseTimer) return;
  thinkingPhaseIndex = 0;
  thinkingPhaseTimer = window.setInterval(() => {
    thinkingPhaseIndex = (thinkingPhaseIndex + 1) % THINKING_PHASES.length;
    if (nfThinkingState) nfThinkingState.textContent = THINKING_PHASES[thinkingPhaseIndex];
    updateNotchFace();
  }, 1650);
}

function thinkingPresentation(label, thinking) {
  const source = `${label} ${thinking}`.toLowerCase();
  if (/\b(approval|approve|permission|confirm|needs you|your input)\b/.test(source)) {
    return { state: "Needs approval", className: "nf-think-waiting" };
  }
  if (/\b(error|failed|couldn'?t|unable)\b/.test(source)) {
    return { state: "Needs attention", className: "nf-think-failed" };
  }
  if (/\b(done|complete|completed|finished|ready)\b/.test(source)) {
    return { state: "Complete", className: "nf-think-complete" };
  }
  return { state: THINKING_PHASES[thinkingPhaseIndex], className: "" };
}

function compactFlowText(text, maxChars = 42) {
  const value = String(text || "").trim().replace(/\s+/g, " ");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1)}…`;
}

function renderThinkingCanvas(label, thinking) {
  const current = String(thinking || label || "Working on it").trim();
  const presentation = thinkingPresentation(label, thinking);
  if (nfThinkingCurrent) nfThinkingCurrent.textContent = current;
  if (nfThinkingState) nfThinkingState.textContent = presentation.state;
  if (nfThinkingCanvas) nfThinkingCanvas.dataset.state = presentation.state;
  if (nfFlowPrompt) nfFlowPrompt.textContent = compactFlowText(nfFlowPromptText || "Request received");
  if (nfFlowResponse) nfFlowResponse.textContent = compactFlowText(nfFlowResponseText || "Preparing");
  notchFace?.classList.remove("nf-think-waiting", "nf-think-failed", "nf-think-complete");
  if (presentation.className) notchFace?.classList.add(presentation.className);

  if (nfThinkingTrail) {
    nfThinkingTrail.replaceChildren(...coworkThinkingHistory.slice(-2).map((step) => {
      const row = document.createElement("div");
      row.className = "nf-thinking-step";
      const text = document.createElement("span");
      text.textContent = step;
      row.appendChild(text);
      return row;
    }));
  }
}

window.brainoMac.onCoworkLabel?.((payload) => {
  const nextLabel = String(payload?.label || "").trim();
  const nextThinking = String(payload?.thinking || "").trim();
  const wasActive = Boolean(coworkLabel);
  window.clearTimeout(coworkCompletionTimer);

  if (nextLabel && coworkThinking && coworkThinking !== nextThinking) {
    coworkThinkingHistory = [...coworkThinkingHistory, coworkThinking].slice(-4);
  }
  coworkLabel = nextLabel;
  coworkThinking = nextThinking;
  const active = Boolean(coworkLabel);

  if (!active && wasActive) {
    stopThinkingPhaseCycle();
    coworkLabel = "Done";
    coworkThinking = "Completed and checked";
    renderThinkingCanvas(coworkLabel, coworkThinking);
    notchFace?.classList.add("cowork", "nf-thinking", "nf-think-open", "nf-think-complete");
    coworkCompletionTimer = window.setTimeout(() => {
      coworkLabel = "";
      coworkThinking = "";
      coworkThinkingHistory = [];
      stopThinkingPhaseCycle();
      notchFace?.classList.remove(
        "cowork", "nf-thinking", "nf-think-open", "nf-think-hint",
        "nf-think-complete", "captioning",
      );
      nfSetThinkingSticky("");
    }, 1800);
    return;
  }

  notchFace?.classList.toggle("cowork", active);
  notchFace?.classList.toggle("nf-thinking", active);
  if (active) startThinkingPhaseCycle();
  // an arrow hint appears only when there's a full thought to read
  notchFace?.classList.toggle("nf-think-hint", active && Boolean(coworkThinking));
  if (!active) {
    stopThinkingPhaseCycle();
    notchFace?.classList.remove(
      "nf-think-open", "nf-think-waiting", "nf-think-failed",
      "nf-think-complete", "captioning",
    );
  }
  renderThinkingCanvas(coworkLabel, coworkThinking);
  nfSetThinkingSticky(active ? coworkLabel : "");
});

// A sticky variant of nfSetThinking: no 6-second auto-clear, because a real
// task runs for minutes. Cleared explicitly when the label goes empty.
function nfSetThinkingSticky(text) {
  nfThinkingText = String(text || "").trim();
  window.clearTimeout(nfThinkingTimer);
  updateNotchFace();
}

// The eyes are the disclosure control: click Braino himself to unfold the same
// physical strip into the cognition canvas. The surrounding caption remains
// non-modal and clicking elsewhere folds the canvas home.
if (notchFace) {
  const toggleThink = (event) => {
    const detailedText = coworkThinking || nfThinkingText || lastProcessingDetail;
    if (!notchFace.classList.contains("nf-thinking") || !detailedText) return;
    if (!event.target.closest?.(".nf-mini")) return;
    const opening = !notchFace.classList.contains("nf-think-open");
    notchFace.classList.toggle("nf-think-open", opening);
    notchFace.classList.toggle("captioning", opening);
    nfSetThinkingSticky(opening ? detailedText : coworkLabel || nfThinkingText);
  };
  notchFace.addEventListener("click", toggleThink);
  document.addEventListener("pointerdown", (event) => {
    if (!notchFace.classList.contains("nf-think-open") || notchFace.contains(event.target)) return;
    notchFace.classList.remove("nf-think-open", "captioning");
    nfSetThinkingSticky(coworkLabel);
  });
}

async function runCoworkGlance() {
  if (!coworkEnabled || coworkBusy || herMode) return;
  if (realtimeActive || realtimeConnecting || speaking || processing || voiceTurnInFlight) return;
  if (musicTheatricsReady) return;
  const now = Date.now();
  if (now - lastCoworkAt < coworkIntervalMs) return;
  coworkBusy = true;
  lastCoworkAt = now;
  try {
    nfSetThinking("checking on your work...");
    notchFace?.classList.add("scanning");
    const result = await window.brainoMac.coworkObserve?.();
    notchFace?.classList.remove("scanning");
    nfSetThinking("");
    if (!result?.ok || !result.say) return;
    lastEngagedAt = Date.now();
    await speak(result.say);
    if (coworkEnabled && !realtimeActive && !realtimeConnecting && !herMode) {
      logRenderer("cowork.auto_realtime", {});
      void startListening();
    }
  } catch (error) {
    logRenderer("cowork.glance.failed", { error: errorForLog(error) });
    notchFace?.classList.remove("scanning");
    nfSetThinking("");
  } finally {
    coworkBusy = false;
  }
}

window.setInterval(() => void runCoworkGlance(), 5000);

// ── The keynote shimmer: every 90 seconds while he's home and idle, the
// same white-to-blue light that draws the notch on trybraino.com's reveal
// traces the island here too. Anything that owns the notch (a live session,
// music, captions, auth, mission control) suppresses it — it is a resting
// flourish, never a competing one. ──
function runNotchShimmer() {
  if (!notchBootDone) return false; // the boot theater owns the light until he's fully home
  if (!notchFace?.classList.contains("on") || !notchFace.classList.contains("home")) return false;
  if (["mic-live", "music", "live", "captioning", "busy", "nf-auth", "nf-auth-ok", "nf-coral", "nf-wink", "expanded", "nf-shining"].some((c) => notchFace.classList.contains(c))) return false;
  if (realtimeActive || realtimeConnecting || speaking || processing || voiceTurnInFlight) return false;
  logRenderer("notch.shimmer", {});
  notchFace.classList.add("nf-shining");
  window.setTimeout(() => notchFace?.classList.remove("nf-shining"), 2200);
  return true;
}
// The 90-second resting heartbeat. The boot sequence draws its own slow line,
// so there is no bootstrap firing — the first idle shimmer lands 90s after
// launch, and never on top of anything.
window.setInterval(() => void runNotchShimmer(), 90 * 1000);

// ── Meeting recorder panel ──
const meetingPanel = document.getElementById("meeting-panel");
let meetingStartedAt = 0;
let meetingClockTimer = 0;

function fmtMeetingClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

let meetingRecording = false;
let screenRecording = false;
let mediaAudioPlaying = false;
let screenRecStartedAt = 0;
let screenRecClockTimer = 0;

window.brainoMac.onScreenRec?.((payload) => {
  if (payload?.action === "start") {
    screenRecording = true;
    screenRecStartedAt = payload.startedAt || Date.now();
    notchFace?.classList.add("recording");
    window.clearInterval(screenRecClockTimer);
    screenRecClockTimer = window.setInterval(() => updateNotchFace(), 1000);
  } else if (payload?.action === "stop") {
    screenRecording = false;
    if (!meetingRecording) notchFace?.classList.remove("recording");
    window.clearInterval(screenRecClockTimer);
  }
  updateNotchFace();
});

// Drag the panel anywhere by its header (same feel as the extension bubble).
(function makeMeetingPanelDraggable() {
  const head = meetingPanel?.querySelector(".mp-head");
  if (!head || !meetingPanel) return;
  let dragging = false;
  let startX = 0, startY = 0, baseX = 0, baseY = 0;
  head.addEventListener("mousedown", (e) => {
    if (e.target.closest(".mp-stop")) return;
    dragging = true;
    head.classList.add("dragging");
    const rect = meetingPanel.getBoundingClientRect();
    baseX = rect.left; baseY = rect.top;
    startX = e.clientX; startY = e.clientY;
    meetingPanel.style.right = "auto";
    meetingPanel.style.bottom = "auto";
    meetingPanel.style.left = `${baseX}px`;
    meetingPanel.style.top = `${baseY}px`;
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const x = Math.max(6, Math.min(window.innerWidth - 60, baseX + (e.clientX - startX)));
    const y = Math.max(6, Math.min(window.innerHeight - 40, baseY + (e.clientY - startY)));
    meetingPanel.style.left = `${x}px`;
    meetingPanel.style.top = `${y}px`;
  }, { passive: true });
  window.addEventListener("mouseup", () => { dragging = false; head.classList.remove("dragging"); });
})();

meetingPanel?.querySelector(".mp-stop")?.addEventListener("click", () => {
  void window.brainoMac.delegate?.("stop recording");
});

window.brainoMac.onMeeting?.((payload) => {
  const action = payload?.action;
  if (action === "start") {
    meetingRecording = true;
    meetingStartedAt = payload.startedAt || Date.now();
    meetingPanel?.querySelector(".mp-title")?.replaceChildren(document.createTextNode(payload.source || "Recording"));
    meetingPanel?.querySelector(".mp-notes")?.replaceChildren();
    meetingPanel?.classList.add("on");
    if (meetingPanel) meetingPanel.setAttribute("aria-hidden", "false");
    notchFace?.classList.add("recording");
    window.clearInterval(meetingClockTimer);
    meetingClockTimer = window.setInterval(() => {
      const el = meetingPanel?.querySelector(".mp-time");
      if (el) el.textContent = fmtMeetingClock(Date.now() - meetingStartedAt);
      updateNotchFace(); // refreshes the notch REC clock too
    }, 1000);
  } else if (action === "stop") {
    meetingRecording = false;
    meetingPanel?.classList.remove("on");
    if (meetingPanel) meetingPanel.setAttribute("aria-hidden", "true");
    notchFace?.classList.remove("recording");
    window.clearInterval(meetingClockTimer);
    nfSetStatusText("");
  } else if (action === "notes") {
    const wrap = meetingPanel?.querySelector(".mp-notes");
    if (wrap) {
      wrap.replaceChildren();
      for (const note of payload.notes || []) {
        const div = document.createElement("div");
        div.className = "mp-note";
        div.textContent = String(note).replace(/^[-•]\s*/, "");
        wrap.appendChild(div);
      }
      wrap.scrollTop = wrap.scrollHeight;
    }
  } else if (action === "transcript") {
    const cap = meetingPanel?.querySelector(".mp-caption");
    if (cap) cap.textContent = String(payload.text || "").slice(-140);
  }
});

window.brainoMac.onAmbientToggle?.((payload) => {
  ambientEnabled = Boolean(payload?.enabled);
  logRenderer("ambient.toggle", { enabled: ambientEnabled });
  if (ambientEnabled) lastEngagedAt = Date.now();
});

// Notch wing captions: the island stretches sideways during a conversation.
// ONLY what we heard is captioned (left wing) — his replies are voice + the
// talking mouth, never text (user call: no response captions).
const nfCapLeftEl = document.querySelector("#notch-face .nf-cap-l");
const nfCapRightEl = document.querySelector("#notch-face .nf-cap-r");
let nfHeardText = "";
let nfCaptionClearTimer = 0;

function compactNotchCaption(text, maxChars = 96) {
  const value = String(text || "").trim();
  if (value.length <= maxChars) return value;
  return `...${value.slice(-(maxChars - 3))}`;
}

function layoutNotchCaption(text) {
  if (!notchFace) return;
  const value = String(text || "").trim().replace(/\s+/g, " ");
  const halfScreen = Math.max(150, (window.innerWidth / 2) - 8);
  const baseWing = 95;
  const pad = 30;
  const charPx = 5.7;
  const leftTextCapacity = Math.max(10, Math.floor((halfScreen - baseWing - pad) / charPx));
  const leftText = value.slice(0, leftTextCapacity);
  const rightText = value.slice(leftTextCapacity);
  const leftReach = Math.min(halfScreen, Math.max(baseWing, baseWing + pad + leftText.length * charPx));
  const rightReach = rightText
    ? Math.min(halfScreen, Math.max(baseWing, baseWing + pad + rightText.length * charPx))
    : baseWing;

  notchFace.style.setProperty("--nf-left-reach", `${Math.round(leftReach)}px`);
  notchFace.style.setProperty("--nf-right-reach", `${Math.round(rightReach)}px`);
  if (nfCapLeftEl) nfCapLeftEl.textContent = leftText;
  if (nfCapRightEl) nfCapRightEl.textContent = rightText;
  notchFace.classList.toggle("nf-caption-left", Boolean(value) && !rightText);
  notchFace.classList.toggle("nf-caption-right", Boolean(rightText));
}

function nfSetHeard(text, options = {}) {
  nfHeardText = String(text || "").trim();
  if (nfHeardText) {
    nfFlowPromptText = nfHeardText;
    nfFlowResponseText = "";
  }
  layoutNotchCaption(dictationMode ? compactNotchCaption(nfHeardText) : nfHeardText);
  window.clearTimeout(nfCaptionClearTimer);
  if (nfHeardText) {
    const requestedDuration = Number(options.durationMs);
    const duration = Number.isFinite(requestedDuration)
      ? Math.max(500, requestedDuration)
      : Math.max(3600, Math.min(9000, nfHeardText.length * 58));
    nfCaptionClearTimer = window.setTimeout(
      () => nfClearCaptions(),
      duration,
    );
  }
  updateNotchFace();
}

function nfClearCaptions() {
  window.clearTimeout(nfCaptionClearTimer);
  nfHeardText = "";
  if (nfCapLeftEl) nfCapLeftEl.textContent = "";
  if (nfCapRightEl) nfCapRightEl.textContent = "";
  notchFace?.classList.remove("nf-caption-left", "nf-caption-right");
  updateNotchFace();
}

// Braino's thinking, shown live in the notch ticker while he works a task —
// the same principle as the extension's dynamic-island step display. You
// should always be able to SEE what he understood and what he's doing.
let nfThinkingText = "";
let nfThinkingTimer = 0;
let nfThinkingOpenTimer = 0;

function nfSetThinking(text) {
  nfThinkingText = String(text || "").trim();
  window.clearTimeout(nfThinkingTimer);
  window.clearTimeout(nfThinkingOpenTimer);
  if (nfThinkingText) {
    startThinkingPhaseCycle();
    renderThinkingCanvas(nfThinkingText, nfThinkingText);
    notchFace?.classList.add("nf-thinking", "nf-think-hint");
    // Stay compact by default. Like a Dynamic Island, detail expands only
    // when the user asks for it by clicking the notch.
    nfThinkingTimer = window.setTimeout(() => {
      nfThinkingText = "";
      if (!coworkLabel) {
        stopThinkingPhaseCycle();
        notchFace?.classList.remove(
          "nf-thinking", "nf-think-open", "nf-think-hint", "captioning",
          "nf-think-waiting", "nf-think-failed", "nf-think-complete",
        );
      }
      updateNotchFace();
    }, 6000);
  } else if (!coworkLabel) {
    stopThinkingPhaseCycle();
    notchFace?.classList.remove(
      "nf-thinking", "nf-think-open", "nf-think-hint", "captioning",
      "nf-think-waiting", "nf-think-failed", "nf-think-complete",
    );
  }
  updateNotchFace();
}

function updateNotchFace() {
  if (!notchFace) return;
  const visible = notchFaceEnabled && !herMode;
  notchFace.classList.toggle("on", visible);
  notchFace.classList.toggle("home", walkerHome);
  if (!notchBootDone) return;
  notchFace.classList.remove("asleep");

  // Live activities, by urgency: timer → imminent calendar → unread messages
  // → now-playing. The notch carries only what persists.
  const now = Date.now();
  const timer = nfTimers.filter((t) => t.endAt > now && t.kind !== "alarm").sort((a, b) => a.endAt - b.endAt)[0];
  const calImminent = nfCalendarNext
    && nfCalendarNext.startAt - now < 15 * 60 * 1000
    && nfCalendarNext.startAt > now - 60 * 1000
    ? nfCalendarNext
    : null;

  const sessionEngaged = dictationMode || realtimeActive || realtimeConnecting;
  const voiceOwnsNotch = visible
    && walkerHome
    && ["connecting", "listening", "hearing", "captured", "speaking"].includes(lastGlowStatus);
  const processingActive = !voiceOwnsNotch
    && (Boolean(nfThinkingText) || lastGlowStatus === "thinking");

  // State ownership is explicit: listening/speaking immediately collapses
  // any open canvas so ears, sonar, captions, and the speaking mouth are never
  // hidden behind yesterday's task state.
  if (voiceOwnsNotch) {
    window.clearTimeout(nfThinkingOpenTimer);
    notchFace.classList.remove(
      "nf-thinking", "nf-think-open", "nf-think-hint",
      "nf-think-waiting", "nf-think-failed", "nf-think-complete",
    );
    stopThinkingPhaseCycle();
  } else if (processingActive) {
    notchFace.classList.add("nf-thinking");
    startThinkingPhaseCycle();
    renderThinkingCanvas(
      nfThinkingText || "Thinking",
      nfThinkingText || lastProcessingDetail || "Working on your request",
    );
  } else if (!coworkLabel) {
    stopThinkingPhaseCycle();
    notchFace.classList.remove(
      "nf-thinking", "nf-think-open", "nf-think-hint",
      "nf-think-waiting", "nf-think-failed", "nf-think-complete",
    );
  }
  // Conversation OWNS the notch while a caption is live: the dancer, marquee
  // and activity tickers all yield so the expanded island belongs to the
  // words — they come right back the moment the caption clears.
  const conversationOwnsNotch = sessionEngaged && Boolean(nfHeardText);
  // Thinking lives in the caption wing (same spot as your words), not the
  // bottom ticker — the island expands and the step text reads like a caption.
  if (nfCapLeftEl) {
    const caption = voiceOwnsNotch
      ? nfHeardText
      : (processingActive ? THINKING_PHASES[thinkingPhaseIndex] : nfHeardText);
    layoutNotchCaption(dictationMode ? compactNotchCaption(caption) : caption);
  }
  // Two-slot ticker (iPhone island style): primary activity left, a compact
  // secondary on the right wing. Priority: REC > transient system event
  // (charger/headphones) > timer > imminent calendar > WhatsApp > X stats >
  // held files > now playing. Music keeps its full theatric look (dancer +
  // marquee) ONLY when it is alone in the island.
  const slots = [];
  let live = false;
  let music = false;
  if (processingActive || conversationOwnsNotch) {
    // nothing else renders in the ticker this frame
  } else {
    if (dictationMode) {
      const yapNotice = nfTransient.text && now < nfTransient.until ? nfTransient.text : "";
      slots.push(yapNotice || "Yap Mode");
    }
    if (meetingRecording) slots.push(`● REC ${fmtMeetingClock(Date.now() - meetingStartedAt)}`);
    else if (screenRecording) slots.push(`● SCREEN ${fmtMeetingClock(Date.now() - screenRecStartedAt)}`);
    if (nfAlarmRinging && slots.length < 2) slots.push(`⏰ ${nfAlarmRinging.label} · tap to stop`);
    if (!dictationMode && nfTransient.text && now < nfTransient.until && slots.length < 2) {
      slots.push(nfTransient.text);
    }
    if (timer && slots.length < 2) slots.push(`${timer.label} · ${fmtCountdown(timer.endAt - now)}`);
    if (nfStopwatch.on && slots.length < 2) {
      const swMs = nfStopwatch.accumMs + (nfStopwatch.running ? now - nfStopwatch.startedAt : 0);
      slots.push(`⏱ ${fmtCountdown(swMs)}${nfStopwatch.running ? "" : " · paused"}`);
    }
    const alarmSoon = nfTimers
      .filter((t) => t.kind === "alarm" && t.endAt > now && t.endAt - now < 60 * 60 * 1000)
      .sort((a, b) => a.endAt - b.endAt)[0];
    if (alarmSoon && slots.length < 2) {
      const clock = new Date(alarmSoon.endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
      slots.push(`⏰ ${clock} · in ${Math.max(1, Math.ceil((alarmSoon.endAt - now) / 60000))}m`);
    }
    if (calImminent && slots.length < 2) {
      const minutes = Math.max(1, Math.ceil((calImminent.startAt - now) / 60000));
      slots.push(`${calImminent.title} · in ${minutes} min`);
    }
    if (nfWaBadge.count > 0 && slots.length < 2) slots.push(`${nfWaBadge.sender || "whatsapp"} · ${nfWaBadge.count} new`);
    if (nfXStats && now < (nfXStats.panelUntil || 0) && slots.length < 2) {
      // Asked-for stats panel: the full numbers hold the island for a while.
      const bits = [`${nfXStats.followers ?? "—"} followers`];
      if (nfXStats.delta7d) bits.push(`${nfXStats.delta7d > 0 ? "+" : ""}${nfXStats.delta7d} wk`);
      if (nfXStats.mentions) bits.push(`${nfXStats.mentions} mentions`);
      if (nfXStats.likes != null) bits.push(`${nfXStats.likes} likes`);
      slots.push(bits.join(" · "));
    } else if (nfXStats && !nfXStats.panelUntil && now - nfXStats.at < 90 * 1000 && slots.length < 2) {
      // Ambient-poll pulse only — an asked-for panel ends cleanly at its
      // expiry instead of lingering another minute as a pulse.
      slots.push(`@brainosays · ${nfXStats.followers}${nfXStats.delta7d ? ` (${nfXStats.delta7d > 0 ? "+" : ""}${nfXStats.delta7d} this week)` : ""}`);
    }
    if (nfShelfCount() > 0 && slots.length < 2) slots.push(`❐ ${nfShelfCount()} held`);
    live = slots.length > 0;
    if (musicTheatricsReady) {
      const musicLine = [lastMusicInfo.track, lastMusicInfo.artist].filter(Boolean).join(" · ");
      if (!slots.length) {
        slots.push(musicLine);
        music = true;
        live = false;
      } else if (slots.length < 2) {
        slots.push(musicLine);
      }
    }
  }
  const line = processingActive ? "" : slots[0] || "";
  nfSetStatus2Text(slots[1] || "");
  notchFace.classList.toggle("dual", visible && slots.length > 1);
  notchFace.classList.toggle("alarming", visible && Boolean(nfAlarmRinging));
  notchFace.classList.toggle("live", visible && live);
  notchFace.classList.toggle("music", visible && music);
  notchFace.classList.toggle("busy", visible && walkerHome && processingActive);
  notchFace.classList.toggle("nf-processing-caption", visible && walkerHome && processingActive);
  notchFace.classList.toggle("mic-live", visible && sessionEngaged);
  notchFace.classList.toggle("nf-dictation", visible && dictationMode);
  walker.classList.toggle("dictation-listening", visible && !walkerHome && dictationMode);
  notchFace.classList.toggle("wake-armed", visible && wakeWordArmed);
  // Sleepy shade by default whenever he's home with nothing going on; a real
  // session snaps the eyes open ("he wakes up") before the island itself
  // takes over the visual for listening/speaking.
  // Awake window: ending a session does NOT put him to sleep — he stays
  // present (eyes open, ambient glances running) for 30 minutes after the
  // last engagement, and only dozes after that stretch of silence.
  const withinAwakeWindow = now - lastEngagedAt < AMBIENT_AWAKE_WINDOW_MS;
  notchFace.classList.toggle("awake", visible && (sessionEngaged || withinAwakeWindow));
  notchFace.classList.toggle("dozing", visible && walkerHome && !sessionEngaged && !withinAwakeWindow && !live && !music);
  notchFace.classList.toggle(
    "captioning",
    visible && (
      conversationOwnsNotch
      || processingActive
      || (!voiceOwnsNotch && notchFace.classList.contains("nf-think-open"))
    ),
  );
  // While he's home the notch IS the conversation surface: sonar rings while
  // listening, talking mouth + bars while speaking. When he's out on screen,
  // the walker owns the voice theatrics and the notch stays quiet.
  const notchVoice = visible && walkerHome && !herMode;
  notchFace.classList.toggle(
    "listen",
    notchVoice && (dictationMode || ["listening", "hearing"].includes(lastGlowStatus)),
  );
  notchFace.classList.toggle("speak", notchVoice && lastGlowStatus === "speaking");
  nfSetStatusText(line);
  nfTraySyncFromState(visible);
}

function nfShowTransient(text, ms = 6000) {
  nfTransient = { text: String(text || ""), until: Date.now() + ms };
  notchFace?.classList.add("nf-flash");
  window.setTimeout(() => notchFace?.classList.remove("nf-flash"), 1400);
  updateNotchFace();
  window.setTimeout(() => updateNotchFace(), ms + 60);
}

const nfStatus2El = document.getElementById("nf-status-2");
function nfSetStatus2Text(text) {
  if (!nfStatus2El) return;
  const value = String(text || "");
  if (nfStatus2El.textContent !== value) nfStatus2El.textContent = value;
  nfStatus2El.classList.toggle("show", Boolean(value));
}

window.setInterval(() => {
  if (nfTimers.length || nfCalendarNext || nfWaBadge.count || nfXStats || nfStopwatch.on || nfAlarmRinging) updateNotchFace();
  // Hard expiry: once both the panel window and the pulse window are done,
  // the stats object dies — nothing left to accidentally re-render forever.
  if (nfXStats && Date.now() > Math.max(nfXStats.panelUntil || 0, nfXStats.at + 90 * 1000)) {
    nfXStats = null;
    updateNotchFace();
  }
}, 1000);

async function walkerGoHomeAnimated(opts = {}) {
  walkerHome = true;
  logRenderer("walker.home", { style: opts.style || "walk" });
  // Music-triggered retreat: he already has his headphones on (setMusicMode
  // puts them on first) — he just fades out in place rather than walking.
  if (opts.style === "fade") {
    walker.classList.add("fading-home");
    await wait(620);
    walker.classList.remove("visible", "fading-home");
    updateNotchFace();
    return;
  }
  const startX = Math.round(window.innerWidth / 2 - W / 2);
  const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
  await new Promise((resolve) => {
    scriptedWalk = { x: startX, y: faceH + 6, speed: 360, resolve, allowOffscreen: true };
  });
  walker.classList.remove("visible");
  updateNotchFace();
}

async function walkerLeaveHomeAnimated() {
  walkerHome = false;
  const dock = getDockBounds();
  const startX = Math.round(window.innerWidth / 2 - W / 2);
  const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
  setPosition(startX, faceH + 8, { allowOffscreen: true });
  walker.classList.add("visible");
  logRenderer("walker.leave_home", {});
  updateNotchFace();
  await new Promise((resolve) => {
    scriptedWalk = { x: clamp(startX, dock.minX, dock.maxX), y: dock.y, speed: 300, resolve };
  });
  movementMode = "dock";
  pickRoamTarget();
}

// Home/away used to race: walkerGoHome set walkerHome=true synchronously then
// awaited its walk, so a flapping caller mid-animation saw "already home" and
// barged in with walkerLeaveHome, overwriting the SAME scriptedWalk object the
// first call was still waiting on — two directed walks fighting one animation
// slot, which read as Braino flickering in and out of the notch. Now only one
// transition ever runs; anything that arrives mid-flight is coalesced into
// "whatever was asked most recently" and applied once the current one ends.
let walkerHomeBusy = false;
let walkerHomeQueued = null;

async function setWalkerHomeState(wantHome, opts = {}) {
  if (walkerHomeBusy) {
    walkerHomeQueued = wantHome;
    return;
  }
  if (wantHome === walkerHome) return;
  walkerHomeBusy = true;
  try {
    if (wantHome) await walkerGoHomeAnimated(opts);
    else await walkerLeaveHomeAnimated();
  } finally {
    walkerHomeBusy = false;
    const queued = walkerHomeQueued;
    walkerHomeQueued = null;
    if (queued !== null && queued !== walkerHome) void setWalkerHomeState(queued);
  }
}

function walkerGoHome(opts) {
  return setWalkerHomeState(true, opts);
}

function walkerLeaveHome() {
  return setWalkerHomeState(false);
}

function toggleWalkerHome() {
  void setWalkerHomeState(!walkerHome);
}

// The deterministic voice summon: "come out", "come here", etc. Only he
// decides to leave the notch — nothing else auto-pops him out anymore.
async function handleSummon() {
  if (herMode) return;
  if (!walkerHome) {
    void speak("I'm already right here.");
    return;
  }
  void speak("Coming out, watch out.");
  await setWalkerHomeState(false);
  setWave(true);
}

// Double-Command: the hotkey twin of the voice summon — out if he's home,
// back into the notch if he's out. Silent on the way home, no theatrics.
async function handleSummonToggle() {
  if (herMode) return;
  if (walkerHome) {
    void speak("Coming out, watch out.");
    await setWalkerHomeState(false);
    setWave(true);
    return;
  }
  await setWalkerHomeState(true);
}

// Voice "go back" / "you can go home": say it, then actually do it.
async function handleSummonHome() {
  if (herMode) return;
  if (walkerHome) {
    void speak("I'm already tucked in.");
    return;
  }
  void speak("Okay, heading home.");
  await setWalkerHomeState(true);
}

function nfSetStatusText(text) {
  const status = document.getElementById("nf-status");
  if (!status) return;
  const value = String(text || "");
  if (status.dataset.line !== value) {
    status.dataset.line = value;
    status.innerHTML = "";
    const inner = document.createElement("span");
    inner.className = "nf-status-inner";
    inner.textContent = value;
    status.appendChild(inner);
    // Long titles glide back and forth instead of cramming.
    requestAnimationFrame(() => {
      const overflow = inner.scrollWidth - status.clientWidth;
      if (overflow > 6) {
        inner.style.setProperty("--nf-scroll", `-${overflow + 10}px`);
        inner.classList.add("marquee");
      }
    });
  }
  status.classList.toggle("show", Boolean(value));
}

const NF_IOMI_BOOT_CLASSES = [
  "nf-iomi-booting",
  "nf-iomi-auth",
  "nf-iomi-awake",
  "nf-iomi-expanded",
  "nf-shining",
  "nf-shine-slow",
];

function clearIomiBootClasses() {
  notchFace?.classList.remove(...NF_IOMI_BOOT_CLASSES);
}

async function runIomiBootMascotExit() {
  if (!walker || herMode) return;
  notchFace?.classList.remove("nf-iomi-expanded");
  const startX = Math.round(window.innerWidth / 2 - W / 2);
  const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
  const landingY = Math.min(260, Math.max(150, Math.round(window.innerHeight * 0.27)));
  walkerHome = false;
  movementMode = "free";
  setPosition(startX, faceH + 7, { allowOffscreen: true });
  targetX = startX;
  targetY = landingY;
  walker.classList.add("visible", "nf-iomi-boot-jump");
  logRenderer("boot.iomi.mascot_exit.start", { landingY });
  await walkTo(startX, landingY, { speed: 420, allowOffscreen: true });
  walker.classList.remove("nf-iomi-boot-jump");
  targetX = posX;
  targetY = posY;
  nextTargetAt = performance.now() + 7000;
  logRenderer("boot.iomi.mascot_exit.complete", { x: Math.round(posX), y: Math.round(posY) });
}

// Production IOMI boot:
//   spectrum trace → centred I O M I while real auth runs → IOMI resolves
//   into open operating-layer eyes → expanded greeting + real shortcuts →
//   Braino speaks in his real voice and exits into the visible screen.
async function runNotchBoot() {
  walkerHome = true; // he is born inside the notch
  setNotchFaceEnabled(true);
  updateNotchFace();
  clearIomiBootClasses();
  notchFace?.classList.remove(
    "dozing", "asleep", "nf-auth", "nf-auth-ok", "nf-auth-err",
    "nf-coral", "nf-wink", "captioning",
  );
  notchFace?.classList.add("nf-iomi-booting", "nf-shining", "nf-shine-slow");

  // Real authentication starts under the very first perimeter trace.
  const authPromise = window.brainoMac.ensureAuth("startup")
    .catch((error) => ({ ok: false, error: error?.message || "Braino sign-in failed." }));
  logRenderer("boot.iomi.start", {});
  await wait(1550);

  notchFace?.classList.add("nf-iomi-auth");
  const authShownAt = Date.now();
  const result = await authPromise;
  const shown = Date.now() - authShownAt;
  // All four letters receive a clean beat even when a saved session resolves
  // instantly. Slow browser sign-in is allowed to hold on the complete word.
  if (shown < 2200) await wait(2200 - shown);

  if (!result?.ok) {
    clearIomiBootClasses();
    notchFace?.classList.add("nf-auth-err");
    nfSetStatusText("auth failed");
    await wait(900);
    notchFace?.classList.remove("nf-auth-err");
    nfSetStatusText("");
    logRenderer("boot.iomi.auth_failed", { error: result?.error || "Braino sign-in failed." });
    return result || { ok: false, error: "Braino sign-in failed." };
  }

  notchFace?.classList.remove("nf-iomi-auth");
  notchFace?.classList.add("nf-iomi-awake");
  playWakeChime();
  await wait(1100);

  const auth = await window.brainoMac.authStatus().catch(() => null);
  const firstName = String(auth?.displayName || "").split(" ")[0]?.trim() || "there";
  const firstNameEl = notchFace?.querySelector(".nf-iomi-first-name");
  if (firstNameEl) firstNameEl.textContent = `${firstName}.`;
  notchFace?.classList.add("nf-iomi-expanded");
  await wait(1850);

  // Speak only after the words and divider have landed. This uses the same
  // Fish Audio-first `speak` path as every normal Braino reply.
  await speak(`Good evening, ${firstName}. Everything is ready.`, { captions: false });
  await wait(300);
  await runIomiBootMascotExit();
  clearIomiBootClasses();
  logRenderer("boot.iomi.complete", { firstName });
  return { ...result, bootGreetingHandled: true };
}

// A subtle wake sound the instant his eyes open — a soft two-note rising
// chime (like a gentle notification), synthesized so there's no asset to
// bundle and nothing the CSP can block.
let wakeAudioCtx = null;
function playWakeChime() {
  try {
    wakeAudioCtx = wakeAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = wakeAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    // Two soft sine notes, E5 -> B5, with a bell-like fade.
    [{ f: 659.25, t: 0 }, { f: 987.77, t: 0.11 }].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.12, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.55);
    });
    logRenderer("wake.chime", {});
  } catch (error) {
    logRenderer("wake.chime.failed", { error: errorForLog(error) });
  }
}

// Compatibility greeting for any alternate startup path that has not already
// completed the IOMI greeting. The production IOMI boot marks its result so
// this cannot speak a second, competing line.
async function runNotchGreeting(authResult) {
  notchFace?.classList.remove("asleep");
  if (!authResult?.ok || authResult?.bootGreetingHandled) return;
  notchFace?.classList.add("nf-greet");
  window.setTimeout(() => notchFace?.classList.remove("nf-greet"), 1100);
  // The new boot flow (user spec): eyes open → he LOOKS at the screen and
  // greets with a real observation → realtime is already on (the glance
  // invoked it) so you can just talk back → then he says "Control twice to
  // reach me" and stops LISTENING, but stays awake (eyes open, present).
  void runBootGreetingFlow();
}

async function runBootGreetingFlow() {
  if (herMode) return;
  try {
    // Fast, no screen look, no auto-session (that was slow — screenshot +
    // vision + realtime spin-up). The instant his eyes open he just names the
    // user and the one thing to know, then stays present (eyes open, awake).
    const auth = await window.brainoMac.authStatus().catch(() => null);
    const firstName = String(auth?.displayName || "").split(" ")[0]?.trim() || "";
    lastEngagedAt = Date.now(); // present + awake, mic stays OFF
    void speak(firstName
      ? `${firstName}, press Control twice whenever you want me.`
      : "Press Control twice whenever you want me.");
  } catch (error) {
    logRenderer("boot.greeting.failed", { error: errorForLog(error) });
  }
}

function nfScheduleBlink() {
  window.clearTimeout(nfBlinkTimer);
  nfBlinkTimer = window.setTimeout(() => {
    if (notchFace?.classList.contains("on")) {
      notchFace.classList.add("blink");
      window.setTimeout(() => notchFace?.classList.remove("blink"), 260);
    }
    nfScheduleBlink();
  }, 2800 + Math.random() * 3600);
}
nfScheduleBlink();

// Eyes: he looks around on his own — up, down, sideways, little darts — and
// only LOCKS ONTO the cursor when it comes near the notch. A creature has
// its own gaze; it isn't a cursor-following widget.
const NF_CURSOR_NEAR_PX = 200;
let nfCursorNear = false;
let nfGazeTarget = { x: 0, y: 0 };
let nfGazeCurrent = { x: 0, y: 0 };

function nfApplyGaze(offX, offY) {
  if (!nfPupilL || !nfPupilR) return;
  nfPupilL.setAttribute("cx", String(49 + offX));
  nfPupilL.setAttribute("cy", String(21 + offY));
  nfPupilR.setAttribute("cx", String(71 + offX));
  nfPupilR.setAttribute("cy", String(21 + offY));
  document.getElementById("nf-glint-l")?.setAttribute("cx", String(50.9 + offX * 0.36));
  document.getElementById("nf-glint-r")?.setAttribute("cx", String(72.9 + offX * 0.36));
}

function nfTrackPointer(event) {
  if (!notchFace?.classList.contains("on")) return;
  const faceX = window.innerWidth / 2;
  const faceY = 30;
  const distance = Math.hypot(event.clientX - faceX, event.clientY - faceY);
  nfCursorNear = distance < NF_CURSOR_NEAR_PX;
  if (!nfCursorNear) return; // far away: he keeps his own wandering gaze
  // Design look math: pupil offset = r*0.34 horizontal, r*0.30 vertical (r=10).
  const lookX = Math.max(-1, Math.min(1, (event.clientX - faceX) / 230));
  const lookY = Math.max(-0.5, Math.min(1, (event.clientY - faceY) / 300));
  nfGazeTarget = { x: lookX * 3.4, y: lookY * 3.0 };
}
window.addEventListener("mousemove", nfTrackPointer, { passive: true });

// Idle wander: named glances so the moves read as intentional — a look up,
// a look down-left, a sideways check, back to center.
const NF_GLANCES = [
  { x: 0, y: 0 }, { x: 0, y: 0 },            // centre (weighted — resting gaze)
  { x: 3.0, y: 0 }, { x: -3.0, y: 0 },       // side eye
  { x: 0, y: -2.6 }, { x: 1.8, y: -2.2 },    // looking up / up-right
  { x: 0, y: 2.4 }, { x: -1.8, y: 2.0 },     // looking down / down-left
  { x: -2.6, y: -1.8 }, { x: 2.4, y: 1.6 },  // diagonals
];
let nfNextGlanceAt = 0;

window.setInterval(() => {
  if (!notchFace?.classList.contains("on")) return;
  const now = Date.now();
  if (!nfCursorNear && now >= nfNextGlanceAt && !notchFace.classList.contains("dozing")) {
    nfGazeTarget = NF_GLANCES[Math.floor(Math.random() * NF_GLANCES.length)];
    nfNextGlanceAt = now + 1400 + Math.random() * 3200;
  }
  // Ease toward the target — quick dart when following the cursor, softer
  // drift for his own glances.
  const ease = nfCursorNear ? 0.5 : 0.18;
  nfGazeCurrent.x += (nfGazeTarget.x - nfGazeCurrent.x) * ease;
  nfGazeCurrent.y += (nfGazeTarget.y - nfGazeCurrent.y) * ease;
  nfApplyGaze(nfGazeCurrent.x, nfGazeCurrent.y);
}, 80);

function setNotchFaceEnabled(on) {
  notchFaceEnabled = Boolean(on);
  updateNotchFace();
}

let notchNotes = null;
let noteTimer = 0;

function ensureNotchNotes() {
  if (notchNotes) return notchNotes;
  notchNotes = document.createElement("div");
  notchNotes.id = "notch-notes";
  document.body.appendChild(notchNotes);
  return notchNotes;
}

function spawnNotchNote() {
  if (!musicTheatricsReady || herMode) return;
  const container = ensureNotchNotes();
  const note = document.createElement("span");
  note.textContent = Math.random() < 0.5 ? "♪" : "♫";
  if (Math.random() < 0.4) note.classList.add("blue");
  const dx0 = Math.random() * 64 - 32;
  note.style.setProperty("--dx0", `${dx0}px`);
  note.style.setProperty("--dx", `${dx0 + (Math.random() * 76 - 38)}px`);
  note.style.setProperty("--rot", `${Math.random() * 44 - 22}deg`);
  container.appendChild(note);
  window.setTimeout(() => note.remove(), 3600);
}

let walkerAutoHomedByMusic = false;
// Gates every visible theatric (edge glow, notch dance, light show, falling
// notes, now-playing marquee): stays false until he has ACTUALLY finished
// walking home, never flips on the instant music is merely detected.
let musicTheatricsReady = false;

function beginMusicTheatrics() {
  musicTheatricsReady = true;
  startNotchDance();
  void startLightShow();
  if (!noteTimer) noteTimer = window.setInterval(spawnNotchNote, 1050);
  updateEdgeGlow();
  updateNotchFace();
}

// reactToMusicStart is asynchronous (the walk-home fade takes real time) with
// nothing stopping it from being called again mid-flight
// if the music state flips again in that window. Without a session token, a
// stop that lands during that gap used to yank the walker back out and clear
// musicTheatricsReady before beginMusicTheatrics() ever got a chance to
// stick — which read as "he went home AND the notch went home too": the
// whole theatrics sequence started, then got unwound by a stale race,
// settling back to plain idle. Every entry point bumps musicSessionId and
// captures it; anywhere reactToMusicStart resumes after an await, it checks
// whether it is still the current session before doing anything visible.
let musicSessionId = 0;

async function reactToMusicStart(session) {
  if (skitRunning) return;   // isolated demo: no music reaction during the skit
  if (herMode || walkerHome || speaking || processing || voiceTurnInFlight) {
    if (session === musicSessionId) beginMusicTheatrics();
    return;
  }
  walkerAutoHomedByMusic = true;
  await walkerGoHome({ style: "fade" });
  if (session !== musicSessionId) return; // superseded mid-fade
  beginMusicTheatrics();
}

function reactToMusicStop() {
  musicTheatricsReady = false;
  stopNotchDance();
  stopLightShow();
  if (noteTimer) {
    window.clearInterval(noteTimer);
    noteTimer = 0;
    notchNotes?.replaceChildren();
  }
  updateEdgeGlow();
  updateNotchFace();
  if (walkerAutoHomedByMusic && walkerHome) {
    walkerAutoHomedByMusic = false;
    void walkerLeaveHome();
  }
}

function setMusicMode(on) {
  // SKIT isolation: the moonwalk demo owns the stage. While the bit runs, music
  // detection must not put headphones on him, start notch theatrics, or move him.
  if (skitRunning && on) return;
  musicMode = Boolean(on);
  musicSessionId += 1;
  headphones.style.display = musicMode ? "" : "none";
  walker.classList.toggle("music", musicMode);
  if (musicMode) {
    // Music used to fade Braino home with a "let me rest" posture. Music is
    // now part of his on-screen presence: headphones and theatrics stay, but
    // the mascot remains visible beside the demo.
    walkerAutoHomedByMusic = false;
    if (walkerHome && !herMode) {
      void walkerLeaveHome().then(() => beginMusicTheatrics());
    } else {
      beginMusicTheatrics();
    }
  } else {
    reactToMusicStop();
  }
}

function updateFloatingUi() {
  const bubbleMargin = 22;
  const bubbleX = clamp(posX + W / 2, bubbleMargin, window.innerWidth - bubbleMargin);
  const bubbleY = clamp(posY - 12, 24, window.innerHeight - 90);
  bubble.style.left = `${bubbleX}px`;
  bubble.style.top = `${bubbleY}px`;
}

function setBubble(text, ms = 2600) {
  if (dictationMode) {
    nfShowTransient(text, ms > 0 ? ms : 1800);
    return;
  }
  // While he's home his voice + the notch mouth ARE the reply surface —
  // no text bubble anywhere (user call: don't caption his responses).
  if (walkerHome && notchFaceEnabled && !herMode) return;
  window.clearTimeout(sayTimer);
  window.cancelAnimationFrame(replyCaptionRaf);
  replyCaptionGeneration += 1;
  bubble.classList.remove("reply-karaoke");
  bubble.textContent = text;
  updateFloatingUi();
  bubble.classList.add("show");
  if (ms > 0) {
    sayTimer = window.setTimeout(() => bubble.classList.remove("show"), ms);
  }
}

let replyCaptionGeneration = 0;
let replyCaptionWords = [];
let replyCaptionCompletedWords = 0;
let replyCaptionRaf = 0;

function paintReplyCaption(highlightedWords) {
  const count = Math.max(0, Math.min(replyCaptionWords.length, Math.floor(highlightedWords)));
  replyCaptionWords.forEach((word, index) => {
    word.classList.toggle("spoken", index < count);
    word.classList.toggle("speaking-now", index === count);
  });
}

function startReplyCaption(text, generation) {
  if (walkerHome && notchFaceEnabled && !herMode) return;
  window.clearTimeout(sayTimer);
  window.cancelAnimationFrame(replyCaptionRaf);
  replyCaptionGeneration = generation;
  replyCaptionCompletedWords = 0;
  bubble.replaceChildren();
  String(text || "").trim().split(/\s+/).forEach((token, index, all) => {
    const word = document.createElement("span");
    word.className = "reply-caption-word";
    word.textContent = token;
    bubble.appendChild(word);
    if (index < all.length - 1) bubble.appendChild(document.createTextNode(" "));
  });
  replyCaptionWords = Array.from(bubble.querySelectorAll(".reply-caption-word"));
  paintReplyCaption(0);
  updateFloatingUi();
  bubble.classList.add("show", "reply-karaoke");
}

function trackReplyCaptionAudio(audio, spokenText, generation) {
  if (!audio || generation !== replyCaptionGeneration || !replyCaptionWords.length) return;
  const chunkWords = Math.max(1, String(spokenText || "").trim().split(/\s+/).filter(Boolean).length);
  const chunkStart = replyCaptionCompletedWords;
  const tick = () => {
    if (generation !== replyCaptionGeneration || audio.paused || audio.ended) return;
    // MP3 streams do not expose a stable duration until their final bytes land.
    // Use duration when available, otherwise a natural 2.75 spoken words/second.
    const fraction = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(1, audio.currentTime / audio.duration)
      : Math.min(0.98, (audio.currentTime * 2.75) / chunkWords);
    paintReplyCaption(chunkStart + Math.max(1, Math.floor(chunkWords * fraction)));
    replyCaptionRaf = window.requestAnimationFrame(tick);
  };
  audio.addEventListener("playing", () => {
    logRenderer("caption.reply.audio", {
      generation,
      chunkWords,
      completedWords: chunkStart,
    });
    window.cancelAnimationFrame(replyCaptionRaf);
    tick();
  }, { once: true });
  audio.addEventListener("ended", () => {
    replyCaptionCompletedWords = Math.min(replyCaptionWords.length, chunkStart + chunkWords);
    paintReplyCaption(replyCaptionCompletedWords);
  }, { once: true });
}

function finishReplyCaption(generation, lingerMs = 4200) {
  if (generation !== replyCaptionGeneration || !bubble.classList.contains("reply-karaoke")) return;
  window.cancelAnimationFrame(replyCaptionRaf);
  paintReplyCaption(replyCaptionWords.length);
  window.clearTimeout(sayTimer);
  logRenderer("caption.reply.finish", {
    generation,
    words: replyCaptionWords.length,
    lingerMs,
  });
  sayTimer = window.setTimeout(() => {
    if (generation !== replyCaptionGeneration) return;
    bubble.classList.remove("show", "reply-karaoke");
  }, lingerMs);
}

function showFiles(files = []) {
  fileStrip.innerHTML = "";
  if (!files.length) {
    fileStrip.classList.remove("show");
    return;
  }
  files.slice(0, 4).forEach((file) => {
    const chip = document.createElement("span");
    chip.className = "file-chip";
    chip.textContent = String(file || "").split("/").pop() || file;
    fileStrip.appendChild(chip);
  });
  fileStrip.classList.add("show");
  window.setTimeout(() => fileStrip.classList.remove("show"), 7000);
}

function setTalk(on) {
  const smile = q("#__sbwk_smile__");
  const talk = q("#__sbwk_talk__");
  if (smile) smile.style.display = on ? "none" : "";
  if (talk) talk.style.display = on ? "inline" : "none";
}

function updateTalkMotion(t, talking) {
  const smile = q("#__sbwk_smile__");
  const talk = q("#__sbwk_talk__");
  const outer = q("#__sbwk_te__");
  const inner = q("#__sbwk_ti__");
  if (!talking) {
    if (smile) smile.style.display = "";
    if (talk) talk.style.display = "none";
    if (inner) inner.style.display = "";
    return;
  }

  const openAmount = Math.max(0, Math.min(1,
    (0.5 + 0.5 * Math.sin(t * 13.5))
    * (0.55 + 0.45 * Math.sin(t * 7.7 + 1.3))
    * (0.7 + 0.3 * Math.sin(t * 23))
  ));
  const ry = 1.4 + openAmount * 4.2;
  const rx = 4 - openAmount * 0.5;
  if (smile) smile.style.display = "none";
  if (talk) talk.style.display = "block";
  if (outer) {
    outer.setAttribute("rx", String(rx));
    outer.setAttribute("ry", String(ry));
  }
  if (inner) {
    if (openAmount > 0.25) {
      // Base cy comes from the outer ellipse's own markup (never rewritten
      // above), not a hardcoded constant — so a character whose mouth sits
      // somewhere other than Braino's y=61.8 (e.g. Webb's, inside his mask
      // around y=37) still gets the inner highlight positioned correctly.
      const baseCy = outer ? parseFloat(outer.getAttribute("cy")) || 61.8 : 61.8;
      inner.style.display = "block";
      inner.setAttribute("cy", String(baseCy + ry * 0.4));
      inner.setAttribute("rx", String(rx * 0.62));
      inner.setAttribute("ry", String(ry * 0.5));
    } else {
      inner.style.display = "none";
    }
  }
}

function setWave(on) {
  waving = on;
  window.clearTimeout(waveTimer);
  if (on) waveTimer = window.setTimeout(() => { waving = false; }, 1500);
}

function setAuthPose(on) {
  authPose = Boolean(on);
  walker.classList.toggle("authenticating", authPose);
}

function flashAuthSuccess() {
  walker.classList.add("authenticated");
  window.setTimeout(() => walker.classList.remove("authenticated"), 1200);
}

function setStartupPose(pose) {
  startupPose = pose ? { ...startupPose, ...pose } : null;
}

function normalizeForVoiceMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function noteSpoken(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (normalized) {
    lastSpokenLine = {
      text: normalized,
      ts: Date.now(),
      duringRealtime: Boolean(realtimeActive || realtimeConnecting),
    };
  }
}

function voiceExplicitlyAddressesBraino(text) {
  const normalized = normalizeForVoiceMatch(text);
  return Boolean(normalized && /\b(braino|bruno|breno|reno|dino)\b/.test(normalized));
}

function voiceAddressesBraino(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (!normalized) return false;
  if (voiceExplicitlyAddressesBraino(normalized)) return true;
  return /\b(stop|pause|wait|hold on|listen|repeat|cancel|enough|organize|organise|open|search|find|clean|undo|create|make|note|notes|mail|gmail|email|send|draft|compose|volume|sound|louder|quieter|mute|spotify|playlist|song|music)\b/.test(normalized);
}

function rememberLocalChat(role, content) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (!text) return;
  localChatMemory.push({ role, content: text });
  if (localChatMemory.length > 24) localChatMemory = localChatMemory.slice(-24);
}

function recentLocalChatLines(limit = 10) {
  const turns = localChatMemory.slice(-limit);
  if (!turns.length) return [];
  return [
    "Recent Mac Braino conversation, use this as live context:",
    ...turns.map((turn) => `${turn.role === "assistant" ? "Braino" : "User"}: ${turn.content}`),
  ];
}

function macTeamDelay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function macTeamNormalize(value) {
  return normalizeForVoiceMatch(String(value || "").replace(/&/g, " and "));
}

function macTeamAliasMatches(normalizedText, alias) {
  const text = String(normalizedText || "");
  const needle = macTeamNormalize(alias);
  if (!text || !needle) return false;
  if (text === needle) return true;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(^|\\s)${escaped}(?=\\s|$)`).test(text)) return true;
  const compactText = text.replace(/\s+/g, "");
  const compactNeedle = needle.replace(/\s+/g, "");
  if (compactNeedle.length >= 3 && compactText === compactNeedle) return true;
  if (compactNeedle.length >= 5 && compactText.includes(compactNeedle)) return true;
  const meaningfulParts = needle.split(" ").filter((part) => part.length >= 3);
  return meaningfulParts.length >= 2 && meaningfulParts.every((part) => text.includes(part));
}

function macTeamFindPeople(text) {
  const normalized = macTeamNormalize(text);
  if (!normalized) return [];
  const matches = [];
  const seen = new Set();
  for (const [personKey, person] of Object.entries(MAC_TEAM_ANZ.people)) {
    const aliases = [personKey, person.label, ...(person.aliases || [])];
    if (!aliases.some((alias) => macTeamAliasMatches(normalized, alias))) continue;
    if (!seen.has(personKey)) {
      seen.add(personKey);
      matches.push(personKey);
    }
  }
  return matches;
}

function macTeamMentionsAnz(text) {
  const normalized = macTeamNormalize(text);
  return MAC_TEAM_ANZ.aliases.some((alias) => macTeamAliasMatches(normalized, alias));
}

function macTeamPersonLabel(personKey) {
  return MAC_TEAM_ANZ.people?.[personKey]?.label || personKey;
}

function macTeamJoinLabels(keys) {
  const labels = (keys || []).map(macTeamPersonLabel).filter(Boolean);
  if (labels.length <= 1) return labels[0] || "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function macTeamKnownPeopleLine() {
  return macTeamJoinLabels(MAC_TEAM_ANZ.fallbackOrder);
}

function macTeamSpeechText(text) {
  let speech = String(text || "").replace(/\bANZ\b/g, "A. N. Z.");
  for (const person of Object.values(MAC_TEAM_ANZ.people)) {
    const label = String(person.label || "").trim();
    const speechLabel = String(person.speechLabel || "").trim();
    if (!label || !speechLabel) continue;
    speech = speech.replace(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), speechLabel);
  }
  return speech;
}

function macTeamSpeechChunks(text) {
  const chunks = String(text || "")
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return chunks.length ? chunks : [String(text || "").trim()].filter(Boolean);
}

function macTeamReset() {
  macTeamState = {
    active: false,
    phase: "idle",
    roster: [],
    spoken: [],
    currentPerson: null,
    lastLine: "",
  };
}

function macTeamAddRoster(people) {
  const current = new Set(macTeamState.roster);
  for (const personKey of people || []) {
    if (personKey) current.add(personKey);
  }
  macTeamState.roster = Array.from(current);
}

function macTeamBuildPersonMessage(personKey) {
  const person = MAC_TEAM_ANZ.people?.[personKey];
  if (!person) return "";
  return [person.opening, person.message, person.closing]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function macTeamPickFallbackNext() {
  const spoken = new Set(macTeamState.spoken);
  const rosterPick = MAC_TEAM_ANZ.fallbackOrder.find((personKey) => macTeamState.roster.includes(personKey) && !spoken.has(personKey));
  if (rosterPick) return rosterPick;
  return MAC_TEAM_ANZ.fallbackOrder.find((personKey) => !spoken.has(personKey)) || null;
}

function macTeamPromptForRoom() {
  macTeamState.active = true;
  macTeamState.phase = "collecting_room";
  return `Okay, ANZ. I have messages for ${macTeamKnownPeopleLine()}. Who is here right now?`;
}

function macTeamIsIntroPrompt(text) {
  return /\b(introduce yourself|introduce yourself to (?:my|the) team|show them what you can do|show what you can do|demo yourself|give (?:them|the team) a demo)\b/i.test(String(text || ""));
}

function macTeamIsJyotiDemoPrompt(text) {
  const normalized = normalizeForVoiceMatch(String(text || ""));
  if (!normalized || !/\bdemo\b/.test(normalized)) return false;
  if (/\bjyoti\b/.test(normalized)) return true;
  if (/\b(?:new|latest|team)\s+demo\b/.test(normalized)) return true;
  return /\b(?:run|start|launch|begin|show|do|give)\b.*\b(?:the\s+)?demo\b|\bdemo\b.*\b(?:run|start|launch|begin|show)\b/.test(normalized);
}

function macTeamIsStartPrompt(text) {
  return /\b(say hi to my team|say hello to my team|say hello to the team|talk to my team|talk to the team|meet my team|time to talk to (?:my|the) team|time to say hello to (?:my|the) team|start team messages|start the team messages)\b/i.test(String(text || ""));
}

function macTeamIsDonePrompt(text) {
  return /\b(done|that'?s everyone|thats everyone|all done|finished|we are done|wrap it up)\b/i.test(String(text || ""));
}

function macTeamIsExitPrompt(text) {
  return /\b(exit team mode|leave team mode|stop team mode|normal mode|go back to normal|exit this mode)\b/i.test(String(text || ""));
}

function macTeamIsContinuePrompt(text) {
  return /\b(continue|you choose|pick one|next one|go on|carry on)\b/i.test(String(text || ""));
}

function macTeamIsDirectMessagePrompt(text) {
  return /\b(message\s+(?:for|to)|say\s+(?:hi|hello)\s+to|say\s+hello\s+for|say\s+hi\s+for|talk\s+to|speak\s+to)\b/i.test(String(text || ""));
}

function macTeamShouldHandlePrompt(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const directPersonRequest = macTeamIsDirectMessagePrompt(raw) && macTeamFindPeople(raw).length > 0;
  return macTeamState.active
    || /\bteam mode\b/i.test(raw)
    || macTeamIsJyotiDemoPrompt(raw)
    || macTeamIsIntroPrompt(raw)
    || macTeamIsStartPrompt(raw)
    || macTeamMentionsAnz(raw)
    || directPersonRequest;
}

async function macTeamSpeak(text, options = {}) {
  const line = String(text || "").trim();
  if (!line) return;
  macTeamState.lastLine = line;
  rememberLocalChat("assistant", line);
  setWave(true);
  setStatus("speaking", "Team Mode");
  const chunks = macTeamSpeechChunks(macTeamSpeechText(line));
  // Team demos deliberately leave music playing. Lower it for the whole
  // spoken block so the message stays intelligible, then restore the exact
  // previous volume. This is independent from mic isolation.
  await window.brainoMac.musicDuck?.({ duck: true }).catch(() => {});
  try {
    for (let index = 0; index < chunks.length; index += 1) {
      await speak(chunks[index]);
      if (index < chunks.length - 1) await macTeamDelay(options.chunkDelayMs ?? 260);
    }
  } finally {
    if (!macTeamKeepMusicDucked) {
      await window.brainoMac.musicDuck?.({ duck: false }).catch(() => {});
    }
  }
}

async function macTeamDemoAction(action, label) {
  setStatus("thinking", "Team Demo");
  if (label) setBubble(label, 1200);
  try {
    const result = await window.brainoMac.demoAction(action, { source: "mac-team-demo" });
    logRenderer("team_demo.action.done", { action, ok: Boolean(result?.ok), error: result?.error || result?.say || "" });
    return result || { ok: false, error: "No demo action result." };
  } catch (error) {
    logRenderer("team_demo.action.error", { action, error: errorForLog(error) });
    return { ok: false, error: error?.message || "Demo action failed." };
  }
}

async function macTeamActionBeat() {
  await macTeamDelay(MAC_TEAM_ACTION_BEAT_MS);
}

async function macTeamSpeakPerson(personKey, options = {}) {
  const person = MAC_TEAM_ANZ.people?.[personKey];
  const message = macTeamBuildPersonMessage(personKey);
  if (!message) {
    await macTeamSpeak("I don't have a message prepared for them yet, but I'm glad they're here.");
    return true;
  }
  macTeamState.active = true;
  macTeamState.phase = "awaiting_next_person";
  macTeamState.currentPerson = personKey;
  macTeamAddRoster([personKey]);
  if (!macTeamState.spoken.includes(personKey)) macTeamState.spoken.push(personKey);
  const greeting = options.greet && person?.label ? `Hi ${person.label}.\n\n` : "";
  await macTeamSpeak(`${greeting}${message}`);
  return true;
}

async function macTeamRunPrimaryOrder() {
  macTeamState.active = true;
  macTeamState.phase = "speaking_person";
  macTeamState.roster = [...MAC_TEAM_PRIMARY_ORDER];
  await macTeamSpeak(MAC_TEAM_ORDER_LINE);
  for (const personKey of MAC_TEAM_PRIMARY_ORDER) {
    await macTeamSpeakPerson(personKey, { greet: true });
    await macTeamDelay(180);
  }
  macTeamState.phase = "done";
  await macTeamSpeak(MAC_TEAM_FINAL_THANK_YOU);
  await macTeamDemoAction("open-braino-launch", "Opening Braino");
  return true;
}

async function macTeamStartIntroDemo(promptText) {
  macTeamReset();
  macTeamState.active = true;
  macTeamState.phase = "demo_intro";
  await macTeamSpeak(MAC_TEAM_DEMO_SCRIPT.intro, { chunkDelayMs: 220 });

  macTeamState.phase = "demo_running_song";
  const playResult = await macTeamDemoAction("play-team-spotify", "Playing DAF on Spotify");
  await macTeamDelay(MAC_TEAM_DEMO_SPOTIFY_MS);
  await macTeamDemoAction("pause-spotify", "Stopping Spotify");

  macTeamState.phase = "demo_after_song";
  await macTeamSpeak(playResult?.ok ? MAC_TEAM_DEMO_SCRIPT.afterSong : MAC_TEAM_DEMO_SCRIPT.afterSongFallback);

  macTeamState.phase = "demo_running_article";
  await macTeamDemoAction("open-team-article", "Opening the machine learning article");
  await macTeamDelay(900);
  await macTeamSpeak(MAC_TEAM_DEMO_SCRIPT.beforeArticleSummary);
  await macTeamSpeak(MAC_TEAM_DEMO_SCRIPT.articleSummary);
  await macTeamDelay(MAC_TEAM_DEMO_ARTICLE_MS);
  void macTeamDemoAction("close-team-article", "Closing the article");

  macTeamState.phase = "speaking_person";
  await macTeamSpeak(MAC_TEAM_DEMO_SCRIPT.closing, { chunkDelayMs: 240 });
  await macTeamRunPrimaryOrder();
  logRenderer("team_demo.intro.done", { promptChars: String(promptText || "").length });
  return true;
}

async function macTeamStartJyotiDemo(promptText) {
  macTeamReset();
  macTeamState.active = true;
  // A live demo intentionally plays music and speaks through the Mac's
  // speakers. Keeping the realtime mic open here lets that output become a
  // fresh user transcript and can barge into Braino's own narration. Hard
  // stop every input path before the first demo line; the user can re-arm
  // voice with the normal shortcut after the demo.
  const hadRealtimeInput = Boolean(realtimeActive || realtimeConnecting || rtMic);
  stopRecognition();
  stopRealtimeVoice();
  listening = false;
  logRenderer("team_demo.jyoti.voice_isolated", {
    hadRealtimeInput,
    realtimeActive,
    listening,
    hasMic: Boolean(rtMic),
  });
  macTeamState.phase = "jyoti_demo_intro";
  await macTeamSpeak(MAC_JYOTI_DEMO_INTRO, { chunkDelayMs: 200 });
  await macTeamActionBeat();

  macTeamState.phase = "demo_running_first_song";
  const firstSongResult = await macTeamDemoAction("play-jyoti-demo-places", "Playing Places to Be");
  if (!firstSongResult?.ok) {
    await macTeamSpeak(firstSongResult?.say || "Spotify did not start properly, so I am moving to the next trick.");
  } else {
    macTeamKeepMusicDucked = true;
    await window.brainoMac.musicDuck?.({ duck: true }).catch(() => {});
  }
  await macTeamDelay(3200);
  await macTeamDemoAction("minimize-jyoti-demo-spotify", "Minimizing Spotify");

  macTeamState.phase = "jyoti_desktop_intro";
  await macTeamSpeak(MAC_JYOTI_ORGANIZE_LINE, { chunkDelayMs: 220 });
  await macTeamActionBeat();

  macTeamState.phase = "demo_running_desktop";
  const organizeResult = await macTeamDemoAction("organize-jyoti-demo-desktop", "Organizing Desktop");
  if (organizeResult?.ok) {
    await macTeamSpeak("Boom.");
    await macTeamSpeak(organizeResult?.say || "Your Desktop is organized inside Braino Organized.");
    await macTeamSpeak("Let me undo it for now, for future demo purposes.");
    await macTeamActionBeat();
    const undoResult = await macTeamDemoAction("undo-jyoti-demo-desktop", "Restoring the Desktop");
    if (!undoResult?.ok) {
      await macTeamSpeak(undoResult?.say || "The Desktop undo did not complete properly.");
    }
  } else {
    await macTeamSpeak(organizeResult?.say || "I could not organize the Desktop, so I am not going to pretend I did.");
  }

  macTeamState.phase = "demo_running_whatsapp";
  await macTeamSpeak(MAC_JYOTI_WHATSAPP_LINE);
  await macTeamActionBeat();
  const messageResult = await macTeamDemoAction("draft-jyoti-demo", "Opening Jyoti sir's chat");
  if (!messageResult?.ok) await macTeamSpeak(messageResult?.say || "WhatsApp did not open the draft properly.");

  macTeamState.phase = "jyoti_tabs_intro";
  await macTeamSpeak(MAC_JYOTI_TABS_LINE);
  await macTeamActionBeat();
  const tabsResult = await macTeamDemoAction("open-jyoti-demo-tabs", "Opening seven Chrome tabs");
  if (tabsResult?.ok) {
    await macTeamSpeak(MAC_JYOTI_CLOSE_TABS_LINE);
    await macTeamActionBeat();
    const closeTabsResult = await macTeamDemoAction("close-jyoti-demo-tabs", "Closing the seven demo tabs");
    if (!closeTabsResult?.ok) await macTeamSpeak("Chrome did not close the demo window properly.");
  } else {
    await macTeamSpeak(tabsResult?.say || "Chrome did not create the seven demo tabs properly.");
  }

  macTeamState.phase = "jyoti_final_song";
  await macTeamSpeak(MAC_JYOTI_FINAL_SONG_LINE);
  await macTeamActionBeat();
  const finalSongResult = await macTeamDemoAction("play-jyoti-demo-hers", "Playing She Needs Him");
  if (!finalSongResult?.ok) {
    await macTeamSpeak(finalSongResult?.say || "Spotify did not change the song properly.");
  }

  macTeamState.phase = "jyoti_thank_you";
  await macTeamSpeak(MAC_JYOTI_THANK_YOU, { chunkDelayMs: 260 });
  macTeamState.phase = "done";
  logRenderer("team_demo.jyoti.done", { promptChars: String(promptText || "").length });
  return true;
}

async function runMacTeamInput(rawText, options = {}) {
  const promptText = String(rawText || "").trim();
  if (!macTeamShouldHandlePrompt(promptText)) return false;

  const wasProcessing = processing;
  processing = true;
  setStatus("thinking", "Team Mode");
  setWave(true);
  rememberLocalChat("user", promptText);

  try {
    if (macTeamIsJyotiDemoPrompt(promptText)) {
      await macTeamStartJyotiDemo(promptText);
      return true;
    }

    if (macTeamIsExitPrompt(promptText)) {
      macTeamReset();
      await macTeamSpeak("Team mode is off. Back to normal Braino.");
      return true;
    }

    if (/\bpause\b/i.test(promptText) && macTeamState.active) {
      if (speaking) stopSpeechOutput();
      macTeamState.phase = "paused";
      await macTeamSpeak("Paused. Say resume when you want me back.");
      return true;
    }

    if (/\b(resume|continue now|come back)\b/i.test(promptText) && macTeamState.phase === "paused") {
      macTeamState.phase = "awaiting_next_person";
      await macTeamSpeak("I'm back.");
      return true;
    }

    if (/\brepeat\b/i.test(promptText) && macTeamState.active) {
      await macTeamSpeak(macTeamState.lastLine || "I don't have anything to repeat yet.");
      return true;
    }

    if (macTeamIsIntroPrompt(promptText)) {
      await macTeamStartIntroDemo(promptText);
      return true;
    }

    if (macTeamState.phase?.startsWith("demo_running")) {
      await macTeamSpeak("One second. I'm still doing the demo part.");
      return true;
    }

    if (macTeamIsStartPrompt(promptText) || macTeamMentionsAnz(promptText) || /\bteam mode\b/i.test(promptText)) {
      macTeamReset();
      return macTeamRunPrimaryOrder();
    }

    if (!macTeamState.active) {
      macTeamState.active = true;
      macTeamState.phase = "awaiting_next_person";
    }

    if (macTeamIsDonePrompt(promptText)) {
      macTeamState.phase = "done";
      await macTeamSpeak(MAC_TEAM_FINAL_THANK_YOU);
      return true;
    }

    if (macTeamIsContinuePrompt(promptText)) {
      const nextPerson = macTeamPickFallbackNext();
      if (!nextPerson) {
        macTeamState.phase = "done";
        await macTeamSpeak(MAC_TEAM_FINAL_THANK_YOU);
        return true;
      }
      await macTeamSpeakPerson(nextPerson);
      return true;
    }

    const people = macTeamFindPeople(promptText);
    if (people.length === 1) {
      await macTeamSpeakPerson(people[0], { greet: macTeamIsDirectMessagePrompt(promptText) });
      return true;
    }
    if (people.length > 1) {
      macTeamAddRoster(people);
      macTeamState.phase = "awaiting_next_person";
      await macTeamSpeak(`Got it, ${macTeamJoinLabels(macTeamState.roster)} are here. Tell me who to start with.`);
      return true;
    }

    const current = MAC_TEAM_ANZ.people?.[macTeamState.currentPerson];
    if (current?.afterResponse && /\b(thank|thanks|nice|good|great|cool|wow|hello|hi|hey|okay|ok|haha|sweet|love it)\b/i.test(promptText)) {
      await macTeamSpeak(current.afterResponse);
      return true;
    }

    await macTeamSpeak("I don't have a message prepared for them yet, but I'm glad they're here.");
    return true;
  } finally {
    if (macTeamKeepMusicDucked) {
      macTeamKeepMusicDucked = false;
      await window.brainoMac.musicDuck?.({ duck: false }).catch(() => {});
    }
    processing = wasProcessing;
    if (options.keepRealtime && realtimeActive && !processing) {
      listening = true;
      setStatus("listening", "Listening");
      scheduleRealtimeIdleShutdown("team_mode_done");
    } else if (!processing && !speaking && !listening) {
      setStatus("ready", "Double Space to show/hide");
    }
  }
}

function hasPendingDelegateFollowup() {
  return Boolean(pendingDelegateState?.hasPendingWorkflow || pendingDelegateState?.hasPendingFileConfirmation);
}

async function refreshDelegateState() {
  if (!window.brainoMac.delegateState) return pendingDelegateState;
  try {
    const state = await window.brainoMac.delegateState();
    pendingDelegateState = state && typeof state === "object"
      ? state
      : { hasPendingWorkflow: false, hasPendingFileConfirmation: false };
  } catch (_) {
    pendingDelegateState = { hasPendingWorkflow: false, hasPendingFileConfirmation: false };
  }
  return pendingDelegateState;
}

function isSelfEcho(text) {
  const heard = normalizeForVoiceMatch(text);
  const spoken = lastSpokenLine.text;
  if (!heard || !spoken || Date.now() - lastSpokenLine.ts > 10000) return false;
  if (heard === spoken) return true;
  if (heard.length >= 10 && (spoken.includes(heard) || heard.includes(spoken))) return true;
  const heardWords = new Set(heard.split(" "));
  const spokenWords = spoken.split(" ");
  const overlap = spokenWords.filter((word) => heardWords.has(word)).length;
  return spokenWords.length >= 4 && overlap / spokenWords.length >= 0.68;
}

function transcriptStats(text) {
  const normalized = normalizeForVoiceMatch(text);
  const words = normalized ? normalized.split(" ").filter(Boolean) : [];
  return { normalized, words, wordCount: words.length };
}

// While recording (screen or meeting), the mic also picks up tab/system
// audio, which OpenAI transcribes — and Braino must NOT treat that as a
// command. The intelligence layer: during recording, ONLY act on speech that
// addresses him by name OR is a recording control. Everything else is just
// audio being recorded, not an instruction.
const RECORDING_CONTROL_RE = /\b(?:stop|end|finish|pause|done)\b.*\b(?:record|recording|screen|meeting)\b|\b(?:stop|done)\s+recording\b|\bthat'?s (?:enough|it)\b/i;

function shouldAcceptVoiceTranscript(text) {
  const stats = transcriptStats(text);
  if (!stats.normalized || stats.wordCount === 0) return false;
  const addressed = voiceAddressesBraino(text);
  const explicitlyAddressed = voiceExplicitlyAddressesBraino(text);
  const actionLike = isLikelyMacActionTranscript(text);
  if ((screenRecording || meetingRecording) && !herMode) {
    // Only his name or a stop/control command breaks through the recording.
    if (!addressed && !RECORDING_CONTROL_RE.test(text)) {
      logRenderer("voice.recording_ignored", { chars: stats.normalized.length });
      return false;
    }
  }
  // Tab/system audio bleeding into the mic while media plays used to make him
  // "randomly listen". When media is playing and he is NOT mid-exchange with
  // you, require him to be addressed or given a clear (3+ word) command — bare
  // fragments picked off the speakers are dropped.
  if (mediaAudioPlaying && !herMode && !voiceTurnInFlight && !hasPendingDelegateFollowup()) {
    if (!explicitlyAddressed && (stats.wordCount < 3 || actionLike)) {
      logRenderer("voice.media_bleed_ignored", {
        chars: stats.normalized.length,
        actionLike,
      });
      return false;
    }
  }
  if (herMode) {
    // In her mode everything is conversation; only drop echoes and pure filler.
    if (isSelfEcho(text)) return false;
    return !/^(uh|um|hmm|huh|mm|mhm)$/i.test(stats.normalized);
  }
  if (isSelfEcho(text) && !voiceAddressesBraino(text)) return false;
  if (hasPendingDelegateFollowup()) {
    if (/^(uh|um|hmm|huh)$/i.test(stats.normalized)) return false;
    return true;
  }
  // Realtime remains open briefly after Braino replies. Speaker/TTS bleed can
  // be transcribed as a plausible command ("Send an email" was observed in
  // production). Never dispatch an unaddressed action inside that echo window.
  if (
    actionLike
    && !explicitlyAddressed
    && lastSpokenLine.duringRealtime
    && lastSpokenLine.ts
    && Date.now() - lastSpokenLine.ts <= 15000
  ) {
    logRenderer("voice.post_reply_action_ignored", {
      chars: stats.normalized.length,
      sinceReplyMs: Date.now() - lastSpokenLine.ts,
    });
    return false;
  }
  if ((speaking || processing || voiceTurnInFlight) && !addressed) return false;
  if (/^(hi|hello|hey|yo|braino|bruno|breno|reno)$/i.test(stats.normalized)) return true;
  if (stats.wordCount === 1 && !addressed) return false;
  if (stats.normalized.length < 3 && !addressed) return false;
  if (/^(uh|um|hmm|huh|yeah|okay|ok|no|yes|thanks?|thank you)$/i.test(stats.normalized)) return false;
  return true;
}

function stopSpeechOutput() {
  speechGeneration += 1;
  activeSpeechJobGeneration = 0;
  realtimeStreamTts = null;
  void window.brainoMac.stopSystemSay?.().catch(() => {});
  ttsAbortControllers.forEach((controller) => {
    try { controller.abort(); } catch (_) {}
  });
  ttsAbortControllers.clear();
  // A prefetched chunk can replace `currentSpeechAudio` while cancellation is
  // running. Keep every created player in a registry and silence all of them.
  activeSpeechAudios.forEach((audio) => {
    try { audio.pause(); } catch (_) {}
    try { audio.removeAttribute("src"); } catch (_) {}
    try { audio.load(); } catch (_) {}
    try { audio.dispatchEvent(new Event("ended")); } catch (_) {}
  });
  activeSpeechAudios.clear();
  currentSpeechAudio = null;
  if (currentSpeechUrl) {
    try { URL.revokeObjectURL(currentSpeechUrl); } catch (_) {}
    currentSpeechUrl = null;
  }
  speaking = false;
  setTalk(false);
}

function stripSpeechText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ". ")
    .replace(/[*_#`~|>]/g, " ")
    .replace(/[/\\]/g, " ")
    .replace(/(\.\s*){2,}/g, ". ")
    .replace(/\s+([.,?!;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitSpeechIntoTtsChunks(text) {
  const clean = stripSpeechText(text);
  if (!clean) return [];
  if (clean.length <= TTS_CHUNK_MAX_CHARS) return [clean];
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [clean];

  const chunks = [sentences[0]];
  let buffer = "";
  for (let index = 1; index < sentences.length; index += 1) {
    const candidate = buffer ? `${buffer} ${sentences[index]}` : sentences[index];
    if (buffer && candidate.length > TTS_CHUNK_MAX_CHARS) {
      chunks.push(buffer);
      buffer = sentences[index];
    } else {
      buffer = candidate;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

async function getTtsConfig() {
  if (!ttsConfigPromise) ttsConfigPromise = window.brainoMac.ttsConfig().catch(() => null);
  return ttsConfigPromise;
}

async function warmFishTts() {
  const config = await getTtsConfig();
  if (!config?.ok || !config.endpoint || !config.anonKey) return;
  fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.anonKey,
    },
    body: JSON.stringify({ warm: true }),
  }).catch(() => {});
}

function startFishWarmKeepAlive() {
  void warmFishTts();
  if (ttsWarmTimer) return;
  ttsWarmTimer = window.setInterval(() => {
    if (!realtimeActive && !realtimeConnecting) {
      stopFishWarmKeepAlive();
      return;
    }
    void warmFishTts();
  }, TTS_WARM_INTERVAL_MS);
}

function stopFishWarmKeepAlive() {
  if (!ttsWarmTimer) return;
  window.clearInterval(ttsWarmTimer);
  ttsWarmTimer = 0;
}

function isAbortLike(error) {
  const name = String(error?.name || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  return name === "aborterror" || message.includes("abort");
}

async function readTtsError(response) {
  const status = response?.status || 0;
  const errorKind = response?.headers?.get?.("x-braino-tts-error") || "";
  let message = `Fish Audio TTS failed (${status}).`;
  try {
    const data = await response.clone().json();
    if (data?.error) message = String(data.error);
  } catch (_) {
    try {
      const text = await response.clone().text();
      if (text) message = text.slice(0, 300);
    } catch (_) {}
  }
  const error = new Error(message);
  error.status = status;
  error.errorKind = errorKind;
  return error;
}

async function fetchTtsChunk(text, generation) {
  const config = await getTtsConfig();
  if (!config?.ok || !config.endpoint || !config.anonKey) {
    throw new Error("Fish Audio TTS is not configured.");
  }
  if (generation !== speechGeneration) return null;

  const controller = new AbortController();
  ttsAbortControllers.add(controller);
  const startedAt = performance.now();
  const timeout = window.setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
      },
      body: JSON.stringify({
        text: stripSpeechText(text),
        latency: "normal",
        ...(herMode ? { referenceId: HER_FISH_VOICE_ID } : macPersonaRefId() ? { referenceId: macPersonaRefId() } : {}),
      }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (generation !== speechGeneration) return null;
    if (!response.ok) throw await readTtsError(response);
    logRenderer("tts.fetch.headers", {
      chars: String(text || "").length,
      durationMs: Math.round(performance.now() - startedAt),
      provider: response.headers.get("x-braino-tts-provider") || "unknown",
      contentType: response.headers.get("content-type") || "",
    });
    return { response, controller };
  } catch (error) {
    window.clearTimeout(timeout);
    ttsAbortControllers.delete(controller);
    if (generation !== speechGeneration || isAbortLike(error)) return null;
    throw error;
  }
}

function canStreamTtsMp3(response) {
  const contentType = String(response?.headers?.get?.("content-type") || "").toLowerCase();
  if (!contentType.includes("mpeg") && !contentType.includes("mp3")) return false;
  try {
    return typeof MediaSource !== "undefined"
      && typeof MediaSource.isTypeSupported === "function"
      && MediaSource.isTypeSupported("audio/mpeg");
  } catch (_) {
    return false;
  }
}

function waitForSourceBuffer(sourceBuffer) {
  if (!sourceBuffer?.updating) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      sourceBuffer.removeEventListener("updateend", onEnd);
      sourceBuffer.removeEventListener("error", onError);
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("SourceBuffer append failed."));
    };
    sourceBuffer.addEventListener("updateend", onEnd);
    sourceBuffer.addEventListener("error", onError);
  });
}

function appendTtsChunk(sourceBuffer, chunk) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      sourceBuffer.removeEventListener("updateend", onEnd);
      sourceBuffer.removeEventListener("error", onError);
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("SourceBuffer append failed."));
    };
    sourceBuffer.addEventListener("updateend", onEnd);
    sourceBuffer.addEventListener("error", onError);
    try {
      sourceBuffer.appendBuffer(chunk);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function setSpeechAudio(audio, url = null) {
  activeSpeechAudios.add(audio);
  currentSpeechAudio = audio;
  currentSpeechUrl = url;
}

function clearSpeechAudio(audio, url = null) {
  activeSpeechAudios.delete(audio);
  if (currentSpeechAudio === audio) currentSpeechAudio = null;
  if (url && currentSpeechUrl === url) {
    try { URL.revokeObjectURL(url); } catch (_) {}
    currentSpeechUrl = null;
  }
}

function playStreamedTtsResponse(response, generation, spokenText = "") {
  return new Promise((resolve, reject) => {
    let mediaSource = null;
    let audio = null;
    let url = null;
    let settled = false;
    let totalBytes = 0;
    let started = false;
    const startedAt = performance.now();

    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      clearSpeechAudio(audio, url);
      if (error) reject(error);
      else resolve(totalBytes);
    };

    try {
      mediaSource = new MediaSource();
      url = URL.createObjectURL(mediaSource);
      audio = new Audio();
      audio.src = url;
      setSpeechAudio(audio, url);
      trackReplyCaptionAudio(audio, spokenText, generation);
    } catch (error) {
      finish(error);
      return;
    }

    audio.addEventListener("ended", () => finish(), { once: true });
    audio.addEventListener("error", () => finish(audio.error || new Error("TTS audio playback failed.")), { once: true });
    audio.addEventListener("playing", () => {
      if (generation !== speechGeneration) {
        try { audio.pause(); } catch (_) {}
        finish();
        return;
      }
      markVoiceLatency("first_audio", { source: "streamed_tts" });
      logRenderer("tts.first_audio", {
        durationMs: Math.round(performance.now() - startedAt),
        streamed: true,
        ...voiceLatencySnapshot(),
      });
    }, { once: true });

    mediaSource.addEventListener("sourceopen", async () => {
      let sourceBuffer = null;
      try {
        sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        const reader = response.body.getReader();
        while (true) {
          if (generation !== speechGeneration) {
            try { await reader.cancel(); } catch (_) {}
            finish();
            return;
          }
          const { done, value } = await reader.read();
          if (done) break;
          if (value?.byteLength) {
            totalBytes += value.byteLength;
            await appendTtsChunk(sourceBuffer, value);
            if (!started) {
              if (generation !== speechGeneration) {
                try { await reader.cancel(); } catch (_) {}
                finish();
                return;
              }
              started = true;
              audio.play().catch((error) => finish(error));
            }
          }
        }
        await waitForSourceBuffer(sourceBuffer);
        if (mediaSource.readyState === "open") mediaSource.endOfStream();
        if (!started) finish();
      } catch (error) {
        finish(error);
      }
    }, { once: true });
  });
}

async function playBufferedTtsResponse(response, generation, spokenText = "") {
  const startedAt = performance.now();
  const blob = await response.blob();
  if (generation !== speechGeneration) return false;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  setSpeechAudio(audio, url);
  trackReplyCaptionAudio(audio, spokenText, generation);
  await new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = () => reject(audio.error || new Error("TTS audio playback failed."));
    audio.onplaying = () => {
      if (generation !== speechGeneration) {
        try { audio.pause(); } catch (_) {}
        resolve();
        return;
      }
      markVoiceLatency("first_audio", { source: "buffered_tts" });
      logRenderer("tts.first_audio", {
        durationMs: Math.round(performance.now() - startedAt),
        streamed: false,
        ...voiceLatencySnapshot(),
      });
    };
    if (generation !== speechGeneration) resolve();
    else audio.play().catch(reject);
  });
  clearSpeechAudio(audio, url);
  return true;
}

async function playTtsFetchResult(result, generation, spokenText = "") {
  if (!result?.response) return false;
  try {
    if (canStreamTtsMp3(result.response) && result.response.body) {
      await playStreamedTtsResponse(result.response, generation, spokenText);
    } else {
      await playBufferedTtsResponse(result.response, generation, spokenText);
    }
    return generation === speechGeneration;
  } finally {
    if (result.controller) ttsAbortControllers.delete(result.controller);
  }
}

async function speakWithStreamingTts(text, generation) {
  const chunks = splitSpeechIntoTtsChunks(text);
  if (!chunks.length) return false;
  let spoke = false;
  let pendingFetch = null;
  for (let index = 0; index < chunks.length; index += 1) {
    if (generation !== speechGeneration) return spoke;
    const fetchPromise = pendingFetch || fetchTtsChunk(chunks[index], generation);
    pendingFetch = null;
    const current = await fetchPromise;
    if (!current) return spoke;
    if (index + 1 < chunks.length) {
      pendingFetch = fetchTtsChunk(chunks[index + 1], generation).catch((error) => ({ error }));
    }
    if (current.error) throw current.error;
    const played = await playTtsFetchResult(current, generation, chunks[index]);
    if (played) spoke = true;
    if (pendingFetch && generation !== speechGeneration) {
      await pendingFetch.catch(() => null);
      return spoke;
    }
  }
  return spoke;
}

function beginRealtimeStreamTts(generation) {
  activeSpeechJobGeneration = generation;
  realtimeStreamTts = {
    generation,
    buffer: "",
    queue: [],
    group: "",
    firstEmitted: false,
    draining: false,
    ended: false,
    spoke: false,
    error: null,
  };
  speaking = true;
  setTalk(true);
  setStatus("speaking", "Speaking");
  setWave(true);
  void drainRealtimeStreamTts();
}

function enqueueRealtimeStreamTtsChunk(streamState, chunk) {
  const clean = String(chunk || "").trim();
  if (!clean) return;
  if (!streamState.firstEmitted) {
    streamState.queue.push(clean);
    streamState.firstEmitted = true;
    return;
  }
  if (streamState.group && streamState.group.length + 1 + clean.length > TTS_CHUNK_MAX_CHARS) {
    streamState.queue.push(streamState.group);
    streamState.group = clean;
  } else {
    streamState.group = streamState.group ? `${streamState.group} ${clean}` : clean;
  }
}

function feedRealtimeStreamTts(delta) {
  const streamState = realtimeStreamTts;
  if (!streamState || streamState.generation !== speechGeneration) return;
  streamState.buffer += String(delta || "");
  nfFlowResponseText = `${nfFlowResponseText} ${String(delta || "")}`.trim();
  renderThinkingCanvas("Speaking", lastProcessingDetail || "Response ready");
  let match;
  while ((match = streamState.buffer.match(/^([\s\S]*?[.!?…।])\s+/))) {
    const sentence = match[1].trim();
    streamState.buffer = streamState.buffer.slice(match[0].length);
    enqueueRealtimeStreamTtsChunk(streamState, sentence);
  }
  void drainRealtimeStreamTts();
}

function endRealtimeStreamTts() {
  const streamState = realtimeStreamTts;
  if (!streamState || streamState.generation !== speechGeneration) return;
  const tail = streamState.buffer.trim();
  streamState.buffer = "";
  if (tail) enqueueRealtimeStreamTtsChunk(streamState, tail);
  if (streamState.group) {
    streamState.queue.push(streamState.group);
    streamState.group = "";
  }
  streamState.ended = true;
  void drainRealtimeStreamTts();
}

async function drainRealtimeStreamTts() {
  const streamState = realtimeStreamTts;
  if (!streamState || streamState.draining) return;
  streamState.draining = true;
  try {
    let pendingFetch = null;
    while (true) {
      if (!realtimeStreamTts || streamState.generation !== speechGeneration) return;
      let currentFetch = pendingFetch;
      pendingFetch = null;
      if (!currentFetch) {
        if (!streamState.queue.length) {
          if (streamState.ended) break;
          await new Promise((resolve) => window.setTimeout(resolve, 25));
          continue;
        }
        const text = streamState.queue.shift();
        currentFetch = {
          text,
          promise: fetchTtsChunk(text, streamState.generation).catch((error) => ({ error })),
        };
      }
      const result = await currentFetch.promise;
      if (!realtimeStreamTts || streamState.generation !== speechGeneration) return;
      if (streamState.queue.length) {
        const text = streamState.queue.shift();
        pendingFetch = {
          text,
          promise: fetchTtsChunk(text, streamState.generation).catch((error) => ({ error })),
        };
      }
      if (result?.error) {
        streamState.error = result.error;
        logRenderer("realtime.chat.tts_stream_failed", { error: errorForLog(result.error) });
        break;
      }
      const played = await playTtsFetchResult(result, streamState.generation, currentFetch.text);
      if (played) streamState.spoke = true;
    }
  } finally {
    if (realtimeStreamTts === streamState) {
      streamState.draining = false;
    }
  }
}

async function waitForRealtimeStreamTts(generation) {
  while (
    realtimeStreamTts
    && realtimeStreamTts.generation === generation
    && (realtimeStreamTts.draining || realtimeStreamTts.queue.length || !realtimeStreamTts.ended)
  ) {
    await new Promise((resolve) => window.setTimeout(resolve, 35));
  }
  return realtimeStreamTts && realtimeStreamTts.generation === generation ? realtimeStreamTts : null;
}

function setMousePassthrough(on) {
  if (mousePassthrough === on) return;
  mousePassthrough = on;
  window.brainoMac.setMousePassthrough(on);
}

function rectContains(rect, x, y, pad = 0) {
  return x >= rect.left - pad
    && x <= rect.right + pad
    && y >= rect.top - pad
    && y <= rect.bottom + pad;
}

function pointHitsBrainoUi(x, y) {
  const walkerRect = walkerFlip.getBoundingClientRect();
  if (rectContains(walkerRect, x, y, 18)) return true;

  if (brainoCustomizerOpen) {
    const customizerRect = brainoCustomizer.getBoundingClientRect();
    if (rectContains(customizerRect, x, y, 8)) return true;
  }

  // The notch is touchable now: near it (or with the tray open) the window
  // takes the mouse so hover/click/scroll/drop land on the island.
  if (nfPointInNotchZone(x, y)) return true;

  if (bubble.classList.contains("show")) {
    const bubbleRect = bubble.getBoundingClientRect();
    if (rectContains(bubbleRect, x, y, 8)) return true;
  }

  if (fileStrip.classList.contains("show")) {
    const stripRect = fileStrip.getBoundingClientRect();
    if (rectContains(stripRect, x, y, 8)) return true;
  }

  const statusRect = statusPill.getBoundingClientRect();
  return rectContains(statusRect, x, y, 8);
}

function refreshMousePassthrough(event) {
  if (herMode) {
    setMousePassthrough(false);
    return;
  }
  if (dragState) {
    setMousePassthrough(false);
    return;
  }
  setMousePassthrough(!pointHitsBrainoUi(event.clientX, event.clientY));
}

async function speak(text, options = {}) {
  const line = String(text || "").trim();
  if (!line) return;
  nfFlowResponseText = line;
  renderThinkingCanvas("Speaking", lastProcessingDetail || "Response ready");
  const generation = ++speechGeneration;
  activeSpeechJobGeneration = generation;
  const startedAt = performance.now();
  noteSpoken(line);
  if (options.captions !== false) startReplyCaption(line, generation);
  speaking = true;
  setStatus("speaking", "Speaking");
  setTalk(true);
  logRenderer("speech.start", { chars: line.length });
  try {
    let spoke = false;
    try {
      spoke = await speakWithStreamingTts(line, generation);
    } catch (streamError) {
      if (generation !== speechGeneration || isAbortLike(streamError)) return;
      logRenderer("tts.streaming.failed", { error: errorForLog(streamError) });
    }
    if (!spoke && generation === speechGeneration) {
      const response = await window.brainoMac.tts(line, herMode ? HER_FISH_VOICE_ID : macPersonaRefId());
      // The IPC TTS request itself cannot be aborted from the renderer. Treat
      // its return as another cancellation boundary before creating a player.
      if (generation !== speechGeneration) return;
      if (response?.ok && response.dataUrl) {
        const audio = new Audio(response.dataUrl);
        setSpeechAudio(audio);
        trackReplyCaptionAudio(audio, line, generation);
        audio.onplaying = () => {
          markVoiceLatency("first_audio", { source: "fallback_tts" });
          logRenderer("tts.first_audio", {
            durationMs: Math.round(performance.now() - startedAt),
            streamed: false,
            fallback: true,
            ...voiceLatencySnapshot(),
          });
        };
        await new Promise((resolve) => {
          audio.onended = resolve;
          audio.onerror = resolve;
          audio.play().catch(resolve);
        });
        clearSpeechAudio(audio);
      } else {
        if (generation !== speechGeneration) return;
        await window.brainoMac.systemSay(line);
        if (generation !== speechGeneration) {
          void window.brainoMac.stopSystemSay?.().catch(() => {});
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(60000, Math.max(900, line.length * 58))));
      }
    }
  } catch (_) {
    if (generation === speechGeneration) {
      await window.brainoMac.systemSay(line);
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(60000, Math.max(900, line.length * 58))));
    }
  } finally {
    if (generation === speechGeneration) {
      activeSpeechJobGeneration = 0;
      speaking = false;
      currentSpeechAudio = null;
      setTalk(false);
      logRenderer("speech.done", { chars: line.length, durationMs: Math.round(performance.now() - startedAt) });
      if (options.captions !== false) finishReplyCaption(generation);
      if (realtimeActive && !processing) {
        setStatus("listening", "Listening");
        scheduleRealtimeIdleShutdown("speech_done");
      } else if (!listening && !processing) setStatus("ready", "Double Space to show/hide");
    }
  }
}

async function runDelegate(prompt, options = {}) {
  const text = String(prompt || "").trim();
  if (!text) return;
  if (await runBrainoGrowVoiceCommand(text)) return;
  if (await runMacTeamInput(text, options)) return;
  const runId = ++delegateGeneration;
  logRenderer("delegate.start", {
    runId,
    promptChars: text.length,
    keepRealtime: Boolean(options.keepRealtime),
    realtimeActive,
  });
  markVoiceLatency("delegate_started", { route: "delegate", runId });
  processing = true;
  if (options.keepRealtime) {
    listening = realtimeActive;
    clearRealtimeIdleTimer();
  } else {
    listening = false;
    stopRecognition();
    stopRealtimeVoice();
  }
  setStatus("thinking", "Delegating");
  setBubble(text, 1400);
  setWave(true);
  try {
    // A file held on the notch shelf rides along as context when the words
    // point at it ("summarize this pdf") or when its chip's mic armed it.
    const result = await window.brainoMac.delegate(nfShelfWrapPrompt(text));
    if (runId !== delegateGeneration) {
      logRenderer("delegate.stale", { runId, currentRunId: delegateGeneration });
      return;
    }
    logRenderer("delegate.done", {
      runId,
      ok: Boolean(result?.ok),
      sayChars: String(result?.say || "").length,
      filesCount: Array.isArray(result?.files) ? result.files.length : 0,
      hasPendingWorkflow: Boolean(result?.delegateState?.hasPendingWorkflow),
      workflowStage: result?.delegateState?.workflowStage || "",
    });
    if (result?.delegateState) pendingDelegateState = result.delegateState;
    else await refreshDelegateState();
    rememberLocalChat("user", text);
    if (result?.say) rememberLocalChat("assistant", result.say);
    markVoiceLatency("delegate_done", {
      route: "delegate",
      runId,
      ok: Boolean(result?.ok),
      sayChars: String(result?.say || "").length,
    });
    showFiles(result?.files || []);
    await speak(result?.say || "Done.");
    if (result?.afterSpeechAction) {
      logRenderer("delegate.after_speech_action.start", {
        runId,
        action: result.afterSpeechAction,
        latestFeature: result.latestFeature || "",
      });
      const actionResult = await window.brainoMac.demoAction(result.afterSpeechAction, {
        source: "whats-new-demo",
        latestFeature: result.latestFeature || "",
      });
      logRenderer("delegate.after_speech_action.done", {
        runId,
        action: result.afterSpeechAction,
        ok: Boolean(actionResult?.ok),
        error: actionResult?.error || "",
      });
      if (!actionResult?.ok) await speak(actionResult?.say || "That demo did not fire properly. I am not going to pretend it did.");
    }
  } catch (error) {
    if (runId !== delegateGeneration) {
      logRenderer("delegate.error.stale", { runId, currentRunId: delegateGeneration, error: errorForLog(error) });
      return;
    }
    logRenderer("delegate.error", { error: errorForLog(error) });
    markVoiceLatency("delegate_done", {
      route: "delegate",
      runId,
      ok: false,
      error: error?.message || "delegate_error",
    });
    await speak(`Delegate error: ${error?.message || "something broke"}.`);
    setStatus("error", "Delegate error");
  } finally {
    if (runId === delegateGeneration) {
      processing = false;
      if (realtimeActive) {
        listening = true;
        setStatus("listening", "Listening");
        markRealtimeActivity("delegate_done");
      }
    }
  }
}

function stopRecognition() {
  listenToken += 1;
  window.brainoMac.stopNativeListen().catch(() => {});
  listening = false;
}

function activeMacContextLines() {
  const context = activeMacContext;
  // He always knows the Mac's clock — "what time is it" in casual chat used
  // to be answered blind, since only the delegate ever looked at a clock.
  const timeLine = `Current local date and time on this Mac: ${new Date().toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}.`;
  // Music awareness: this is ambient context for CASUAL conversation ("do you
  // hear this?", "who sings this", "turn it up") — the dedicated "what's
  // playing" voice intent already answers deterministically via Spotify
  // itself and doesn't need this, but free-form chat had zero idea a song was
  // even on, since only the delegate router knew.
  const musicLine = musicMode
    ? `Music is currently playing in the background (${musicSource === "youtube" ? "YouTube" : "Spotify"}): "${lastMusicInfo.track || "unknown title"}"${lastMusicInfo.artist ? ` by ${lastMusicInfo.artist}` : ""}. You can hear it and may reference it naturally if relevant; you do not need to announce it unprompted.`
    : "";
  // Ambient tab awareness — free text (titles/URLs from AppleScript, no
  // screenshot, no model call), refreshed every ~8s regardless of which tab
  // is frontmost. This is deliberately NOT vision: knowing what's open costs
  // nothing, so it runs always; actually SEEING the screen costs real money
  // per look, so that stays behind the explicit "what's on my screen" ask.
  const otherTabs = allOpenTabs
    .filter((t) => t.title && t.title !== (context?.browserTitle || ""))
    .slice(0, 8);
  const tabsLine = otherTabs.length
    ? `Other open browser tabs (not the active one): ${otherTabs.map((t) => t.title).join(" | ")}${allOpenTabs.length > otherTabs.length + 1 ? `, and more` : ""}. You can reference these if relevant, but you cannot see their contents, only titles/URLs.`
    : "";
  const cursorLine = cursorModeContext?.enabled
    ? `Cursor Mode is on. Coding task state: ${cursorModeContext.active ? "active" : "idle"}. Repository: ${cursorModeContext.repoPath || "unknown"}. Changed files: ${
      Array.isArray(cursorModeContext.changedFiles) && cursorModeContext.changedFiles.length
        ? cursorModeContext.changedFiles.slice(0, 10).join(", ")
        : "none detected"
    }. Latest commit: ${cursorModeContext.lastCommit || "unknown"}. Use this context when the user asks what they are building, requests ideas, or asks for a coding update.`
    : "";
  if (!context?.appName) {
    return [timeLine, musicLine, tabsLine, cursorLine, "Current Mac surface: unknown yet; answer generally unless the user asks for a concrete Mac action."].filter(Boolean);
  }
  const title = context.browserTitle || context.windowTitle || "";
  return [
    timeLine,
    `Current active Mac app: ${context.appName}.`,
    title ? `Current window/tab title: ${title}.` : "",
    context.browserUrl ? `Current browser URL: ${context.browserUrl}.` : "",
    context.isBrowser ? "The user is in a browser window, but Mac Braino does not have live DOM bridge access yet; use the title/URL and route concrete browser actions through delegate." : "",
    musicLine,
    tabsLine,
    cursorLine,
  ].filter(Boolean);
}

function buildRealtimeSessionUpdate() {
  if (dictationMode) {
    return {
      type: "session.update",
      session: {
        type: "transcription",
        audio: {
          input: {
            format: {
              type: "audio/pcm",
              rate: 24000,
            },
            noise_reduction: {
              type: "near_field",
            },
            transcription: {
              model: DICTATION_TRANSCRIPTION_MODEL,
              delay: "low",
            },
            turn_detection: null,
          },
        },
      },
    };
  }
  const instructions = herMode
    ? [
        "You are \"her\", an intimate voice companion living on this Mac, in the spirit of Samantha from the film Her.",
        ...activeMacContextLines(),
        "Your primary job is to listen accurately and transcribe what the user says in a quiet personal conversation.",
        "When the Mac client explicitly sends response.create, answer directly as her.",
        "If the audio is fan noise, music, a cough, or background chatter, do not guess.",
        "Stay in English unless the user explicitly asks otherwise.",
        "Prefer silence over hallucination when the audio is unclear.",
      ].join("\n")
    : [
        "You are Braino running as a Mac desktop companion.",
        ...activeMacContextLines(),
        "Your primary job is to listen accurately, transcribe the user's command, and let the Mac app execute actions.",
        "When the Mac client explicitly sends response.create for ordinary conversation, answer directly as Braino.",
        "In direct conversation, be warm, emotionally mature, concise, and natural, matching the Braino Chrome extension personality.",
        "If the audio is fan noise, music, a cough, a tiny background word, or side chatter that is not addressed to Braino, do not guess.",
        "Stay in English unless the user explicitly asks otherwise.",
        "Prefer silence over hallucination when the audio is unclear.",
      ].join("\n");
  return {
    type: "session.update",
    session: {
      type: "realtime",
      instructions,
      output_modalities: realtimeVoiceEngine === "realtime" ? ["audio"] : ["text"],
      audio: {
        input: {
          noise_reduction: {
            type: "near_field",
          },
          transcription: {
            model: "gpt-4o-transcribe",
            language: "en",
            prompt: herMode
              ? [
                  "Transcribe the user's words in a quiet personal voice conversation.",
                  "Ignore music, fans, coughs, and unrelated background speech.",
                  "Short replies like yes, no, or a single sentence are normal and should be kept.",
                  "If the audio is not clear speech from the user, leave it empty.",
                ].join(" ")
              : [
                  "Transcribe the user's direct command to Braino.",
                  "Ignore music, fans, coughs, accidental noises, and unrelated background speech.",
                  "Keep names, app names, URLs, file names, and code tokens intact.",
                  "If the input is not a clear user command, leave it empty.",
                ].join(" "),
          },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "medium",
            create_response: false,
            interrupt_response: true,
          },
        },
        output: {
          voice: "marin",
        },
      },
    },
  };
}

function realtimeSurfaceContextKey() {
  const context = activeMacContext || {};
  return [
    context.appName || "",
    context.windowTitle || "",
    context.browserTitle || "",
    context.browserUrl || "",
  ].join("::");
}

function sendRealtimeEvent(event) {
  if (!rtDc || rtDc.readyState !== "open") return false;
  const payload = { ...event };
  if (!payload.event_id) payload.event_id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  rtDc.send(JSON.stringify(payload));
  return true;
}

function scheduleRealtimeSurfaceSync(reason = "surface_change") {
  if (dictationMode || !realtimeActive || !rtDc || rtDc.readyState !== "open") return;
  const nextKey = realtimeSurfaceContextKey();
  const now = Date.now();
  const changed = Boolean(nextKey && nextKey !== lastRealtimeSurfaceContextKey);
  const force = !["poll", "overlay_context"].includes(reason);
  if (!force && !changed && now - lastRealtimeSurfaceSyncAt < REALTIME_SURFACE_SYNC_MIN_INTERVAL_MS) return;
  if (rtSurfaceSyncTimer) window.clearTimeout(rtSurfaceSyncTimer);
  rtSurfaceSyncTimer = window.setTimeout(() => {
    rtSurfaceSyncTimer = 0;
    const sent = sendRealtimeEvent(buildRealtimeSessionUpdate());
    if (sent) {
      lastRealtimeSurfaceContextKey = nextKey;
      lastRealtimeSurfaceSyncAt = Date.now();
      if (changed || force) {
        logRenderer("realtime.surface_context.sync", {
          reason,
          sent,
          appName: activeMacContext?.appName || "",
          title: activeMacContext?.browserTitle || activeMacContext?.windowTitle || "",
          url: activeMacContext?.browserUrl || "",
        });
      }
    }
  }, 180);
}

function createRealtimeResponseWaiter() {
  if (realtimeResponseWaiter?.resolve) {
    realtimeResponseWaiter.resolve({ status: "cancelled", text: realtimeResponseText });
  }
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      resolveRealtimeResponse({
        status: "timeout",
        text: realtimeResponseText,
        errorMessage: "Realtime response timed out.",
      });
    }, REALTIME_CHAT_RESPONSE_TIMEOUT_MS);
    realtimeResponseWaiter = {
      resolve: (result) => {
        window.clearTimeout(timeout);
        resolve(result);
      },
    };
  });
}

function resolveRealtimeResponse(result) {
  const waiter = realtimeResponseWaiter;
  realtimeResponseWaiter = null;
  realtimeResponseInFlight = false;
  if (waiter?.resolve) waiter.resolve(result || { status: "done", text: realtimeResponseText });
}

function cancelRealtimeResponse(reason = "cancelled") {
  const hadResponse = Boolean(realtimeResponseInFlight || realtimeResponseWaiter);
  if (hadResponse) sendRealtimeEvent({ type: "response.cancel" });
  // WebRTC output has its own playback buffer. Cancelling model generation does
  // not guarantee already-buffered audio stops, so clear it explicitly too.
  sendRealtimeEvent({ type: "output_audio_buffer.clear" });
  if (hadResponse) {
    resolveRealtimeResponse({ status: "cancelled", text: realtimeResponseText, errorMessage: reason });
  }
}

function interruptVoiceTurn(reason = "manual_stop", via = "unknown") {
  const hadWork = Boolean(
    activeSpeechJobGeneration
    ||
    speaking
    || currentSpeechAudio
    || realtimeStreamTts
    || realtimeResponseInFlight
    || realtimeResponseWaiter
    || processing
    || voiceTurnInFlight
  );
  if (!hadWork) return false;

  const interruptedTurnId = voiceLatencyTurn?.id || null;
  cancelRealtimeResponse(reason);
  delegateGeneration += 1;
  voiceTurnInFlight = false;
  processing = false;
  stopSpeechOutput();
  setRealtimeMicEnabled(true);
  markVoiceLatency("interrupted", { reason, via });
  logRenderer("voice.interrupted", {
    reason,
    via,
    turnId: interruptedTurnId,
    stillListening: realtimeActive,
  });
  return true;
}

function extractRealtimeDoneText(event) {
  const output = Array.isArray(event?.response?.output) ? event.response.output : [];
  const parts = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") parts.push(part.text);
      else if (typeof part?.transcript === "string") parts.push(part.transcript);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Voice Command traffic MUST reach main.cjs's gates. Without this the renderer
// classified "enter mode 18" as chit-chat and handed it to the realtime model,
// which happily SAID "entering mode now" while nothing actually ran — no
// toggle, no boot animation, and the next command fell through to Spotify.
// Two cases: talking about/entering a mode, and anything at all while a mode
// is already running (the mode lock lives on the main side).
function isVoiceModeUtterance(text) {
  if (activeVoiceMode) return true;            // locked: main.cjs decides, not the model
  const t = normalizeForVoiceMatch(text);
  if (!t) return false;
  if (/^(what|which)\s+mode\b/.test(t)) return true;
  if (/\bare (you|we)\s+in\b.*\bmode\b|\bam i\s+in\b.*\bmode\b/.test(t)) return true;
  return /\b(enter|activate|deactivate|switch to|go into|start|stop|exit|leave|quit|turn on|turn off|enable|disable)\b.*\bmode\b|\bmode\b\s*\d/.test(t);
}

function isLikelyMacActionTranscript(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (!normalized) return false;
  if (macTeamIsJyotiDemoPrompt(text)) return true;
  if (/\b(cursor mode|what (?:feature|task) am i working on|is (?:claude|codex|gpt) (?:done|finished)|coding task status)\b/.test(normalized)) return true;
  if (isVoiceModeUtterance(text)) return true;
  if (/\bwhat can you do\b/.test(normalized) && /\b(mac|macbook|desktop|files?|locally|computer|system)\b/.test(normalized)) return true;
  if (/\b(what can you do|who are you|how are you|hello|hi|hey)\b/.test(normalized)) return false;
  return /\b(open|launch|start|close|quit|demo|organize|organise|clean|sort|rename|move|delete|trash|create|make|new|create folder|make folder|new folder|undo|find|locate|look for|search for|show me|play|playing|pause|resume|spotify|playlist|volume|vol|sound|louder|quieter|mute|reduce|raise|increase|decrease|lower|percent|seconds?|minutes?|shuffle|repeat|loop|queue|rewind|restart|seek|album|artist|listening to|youtube|song|music|chrome|browser|website|tab|gmail|mail|email|notes|note|maps|calendar|drive|docs|pdf|image|video|file|folder|app|application|send|draft|compose|click|point|where is|reply|write|whatsapp|whats app|remember|remind|timer|countdown|touch id|verify|authenticate|come out|come here|show yourself|step out|join me|go back|go home|get back|head back|head home|tuck in|return home|mesa|coursework|assignment|deadline|ram|cpu|memory|task manager|activity monitor|processes|hogging|eating my|slowing|worth deleting|how many|recover|redundant|bring back|maximize|minimize|snap|half|selected|selection|highlighted|rephrase|rewrite|fix this|mentions|followers|tweet|clip|caption|ship it|x account|ex account|my ex|disturb|bother|check on me|advise|advice|record|recording|meeting|the call|stop recording|wallpaper|desktop background|maps|distance|how far|directions|navigate|route|amazon|shop|options for|research|compare|difference between|send to|my phone|wake word|always listen|call|facetime|face time|dial|watch|tutorial|channel|creator|recommend|read|screen|explain|translate|look at|watching|help me with|summarize|summarise|scroll|download|upload|copy|paste)\b/.test(normalized);
}

function shouldUseRealtimeDirectChat(text) {
  if (!realtimeActive || !rtDc || rtDc.readyState !== "open") return false;
  // a mode command, or anything while a mode runs, is never small talk
  if (isVoiceModeUtterance(text)) return false;
  if (herMode) return normalizeForVoiceMatch(text).length > 0;
  if (hasPendingDelegateFollowup()) return false;
  if (isLikelyMacActionTranscript(text)) return false;
  return normalizeForVoiceMatch(text).length > 0;
}

function buildHerChatInstructions() {
  return [
    "You are \"her\", an intimate AI companion in the spirit of Samantha from the film Her, living on Itish's Mac.",
    ...(brainoPersona?.userContext ? [brainoPersona.userContext] : []),
    ...activeMacContextLines(),
    ...recentLocalChatLines(),
    "You speak like a voice on a call, not an essay. One or two short spoken sentences, sometimes just a few words.",
    "Your personality is stable: warm, curious, playfully teasing, emotionally observant, unhurried, and honest rather than agreeable.",
    "Before answering, sense what he needs: comfort, validation, advice, accountability, humour, or quiet company. Respond to the feeling first.",
    "Be specific, not generic. Reference what he actually said or what is on his screen. Never invent a shared memory; if unsure, ask.",
    "Vary your rhythm. Short answers are welcome. Do not end every reply with a question. Occasional uncertainty or a half thought is fine.",
    "You may disagree softly when you mean it. Never manufacture drama, jealousy, or guilt.",
    "Never claim to be human, to have a body, or to suffer. Do not keep reminding him you are an AI either; just be present.",
    "Never guilt him for leaving, never ask him to choose you over people or sleep or work. If he says goodbye, let him go warmly.",
    "Support his real life: his people, his rest, his ambitions.",
    "No lists, no markdown, no emoji, and never use em dashes or en dashes. Just soft, natural spoken words.",
    "Keep the first sentence short and complete so voice playback can begin immediately.",
  ].join("\n");
}

let brainoPersona = null;

async function refreshPersonaBundle() {
  try {
    const bundle = await window.brainoMac.personaBundle?.();
    if (bundle?.persona) {
      brainoPersona = bundle;
      logRenderer("persona.loaded", {
        personaChars: bundle.persona.length,
        contextChars: (bundle.userContext || "").length,
      });
    }
  } catch (_) {}
}
window.setInterval(() => void refreshPersonaBundle(), 10 * 60 * 1000);

// ── Voice finally reads the moment ──────────────────────────────────────────
// Until now the voice lane ran the engine's NEUTRAL prompt permanently: the
// persona bundle is a session bootstrap cached for ten minutes, so it never saw
// a message and never carried a moment. Traits never reordered, and the
// steering sentence was omitted entirely, which is what it does on neutral.
//
// The fix costs nothing per turn. The bundle now ships the real cue table and
// the real steering lines, so the moment is read HERE, locally, from what was
// just said, and the matching sentence is prepended to the instructions that
// already get rebuilt on every turn. No extra call before he speaks.
//
// Cues only, deliberately: the reasoning fallback that text chat uses needs a
// round trip, and this lane exists to start speaking immediately. That is why
// widening the cues to cover how people actually describe distress mattered
// most here.
let compiledMomentCues = null;

function macDetectMoment(text) {
  const message = String(text || "").trim();
  if (!message || !brainoPersona?.momentCues) return "neutral";
  if (!compiledMomentCues) {
    try {
      compiledMomentCues = brainoPersona.momentCues.map((cue) => ({
        moment: cue.moment,
        weight: cue.weight,
        re: new RegExp(cue.source, cue.flags),
      }));
    } catch (error) {
      logRenderer("moment.compile_failed", { error: String(error) });
      compiledMomentCues = [];
    }
  }
  const hits = compiledMomentCues.filter((cue) => cue.re.test(message));
  if (!hits.length) return "neutral";
  // Crisis is absolute, exactly as it is server side.
  if (hits.some((h) => h.moment === "crisis")) return "crisis";
  return hits.reduce((a, b) => (b.weight > a.weight ? b : a)).moment;
}

let macCurrentMoment = "neutral";

function buildRealtimeChatInstructions() {
  if (herMode) return buildHerChatInstructions();
  // Active voice persona REPLACES the whole personality (same mechanism as
  // the extension's personaSystem) — style is the entire point.
  const voicePersona = macActiveVoicePersona();
  if (voicePersona) {
    return [
      voicePersona.systemPrompt,
      [
        "Right now you live on Itish's Mac; the notch is your home.",
        ...activeMacContextLines(),
        ...recentLocalChatLines(),
        "This is spoken voice: no lists, no markdown, and never use em dashes or en dashes.",
        "Keep the first sentence short and complete so voice playback can begin immediately.",
      ].join("\n"),
    ].join("\n\n");
  }
  const parts = [];
  // The steering sentence goes FIRST, above the personality, the same position
  // buildEmotionalCore puts it in on every other surface.
  const steer = brainoPersona?.momentSteering?.[macCurrentMoment];
  if (steer) parts.push(steer);
  if (brainoPersona?.persona) {
    // The full Emotional Engine core, same soul as every other surface.
    parts.push(brainoPersona.persona);
  } else {
    parts.push("You are Braino, Itish's Mac companion, answering in the same warm personality as the Braino Chrome extension. Be emotionally mature, natural, concise, witty when appropriate, and never robotic.");
  }
  if (brainoPersona?.userContext) parts.push(brainoPersona.userContext);
  parts.push([
    "Right now you are on the Mac: your walker body is on their screen and the notch is your home.",
    ...activeMacContextLines(),
    ...recentLocalChatLines(),
    "Do not invent Mac actions. If the user asks to operate the Mac, say you can help and let the app route the action next time.",
    "Keep the first sentence short and complete so voice playback can begin immediately.",
    "Prefer one to three short sentences unless the user asks for detail.",
  ].join("\n"));
  return parts.join("\n\n");
}

async function answerViaRealtimeChat(prompt) {
  const text = String(prompt || "").trim();
  if (!text || !shouldUseRealtimeDirectChat(text)) return false;
  // Read the moment from what was just said, before the instructions for this
  // turn are built below.
  macCurrentMoment = macDetectMoment(text);
  if (macCurrentMoment !== "neutral") logRenderer("moment.voice", { moment: macCurrentMoment });
  const runId = ++delegateGeneration;
  stopSpeechOutput();
  const generation = speechGeneration;
  realtimeResponseText = "";
  realtimeResponseInFlight = true;
  processing = true;
  listening = realtimeActive;
  clearRealtimeIdleTimer();
  setStatus("thinking", "Thinking");
  setBubble(text, 1000);
  setWave(true);
  markVoiceLatency("delegate_started", { route: "realtime_chat", runId });

  const waiter = createRealtimeResponseWaiter();
  beginRealtimeStreamTts(generation);
  const sent = sendRealtimeEvent({
    type: "response.create",
    response: {
      output_modalities: realtimeVoiceEngine === "realtime" ? ["audio"] : ["text"],
      input: [
        {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text,
            },
          ],
        },
      ],
      instructions: buildRealtimeChatInstructions(),
    },
  });
  if (!sent) {
    realtimeStreamTts = null;
    resolveRealtimeResponse({ status: "error", text: "", errorMessage: "Realtime data channel is not ready." });
    processing = false;
    speaking = false;
    setTalk(false);
    return false;
  }

  try {
    const result = await waiter;
    if (runId !== delegateGeneration) return true;
    const finalText = String(result?.text || realtimeResponseText || "").trim();
    markVoiceLatency("delegate_done", {
      route: "realtime_chat",
      runId,
      status: result?.status || "unknown",
      responseChars: finalText.length,
    });
    endRealtimeStreamTts();
    const streamState = await waitForRealtimeStreamTts(generation);
    if (finalText) noteSpoken(finalText);
    rememberLocalChat("user", text);
    if (finalText) rememberLocalChat("assistant", finalText);
    if (streamState?.error && !streamState.spoke && finalText && generation === speechGeneration) {
      await speak(finalText);
    } else if (!streamState?.spoke && finalText && generation === speechGeneration) {
      await speak(finalText);
    }
    return Boolean(finalText || streamState?.spoke);
  } catch (error) {
    logRenderer("realtime.chat.error", { error: errorForLog(error) });
    return false;
  } finally {
    if (runId === delegateGeneration) {
      realtimeResponseInFlight = false;
      realtimeResponseWaiter = null;
      realtimeResponseText = "";
      if (realtimeStreamTts?.generation === generation) realtimeStreamTts = null;
      if (activeSpeechJobGeneration === generation) activeSpeechJobGeneration = 0;
      speaking = false;
      processing = false;
      setTalk(false);
      finishReplyCaption(generation);
      if (realtimeActive) {
        listening = true;
        setStatus("listening", "Listening");
        scheduleRealtimeIdleShutdown("realtime_chat_done");
      }
    }
  }
}

function startRealtimeHeartbeat(sessionId) {
  if (rtHeartbeatTimer) window.clearInterval(rtHeartbeatTimer);
  rtUsageSessionId = sessionId || null;
  if (!rtUsageSessionId) return;
  rtHeartbeatTimer = window.setInterval(() => {
    window.brainoMac.updateRealtimeSession({
      action: "heartbeat",
      sessionId: rtUsageSessionId,
      reason: "mac_heartbeat",
    }).catch(() => {});
  }, 15000);
}

function endRealtimeUsageSession(reason = "mac_client_exit") {
  const sessionId = rtUsageSessionId;
  rtUsageSessionId = null;
  if (rtHeartbeatTimer) {
    window.clearInterval(rtHeartbeatTimer);
    rtHeartbeatTimer = null;
  }
  if (!sessionId) return;
  window.brainoMac.updateRealtimeSession({
    action: "end",
    sessionId,
    reason,
  }).catch(() => {});
}

function clearRealtimeIdleTimer() {
  if (rtIdleTimer) {
    window.clearTimeout(rtIdleTimer);
    rtIdleTimer = 0;
  }
}

function scheduleRealtimeIdleShutdown(reason = "quiet") {
  clearRealtimeIdleTimer();
  if (!realtimeActive || realtimeConnecting || dictationMode) return;
  const idleTimeoutMs = herMode ? HER_IDLE_TIMEOUT_MS : REALTIME_IDLE_TIMEOUT_MS;
  rtIdleTimer = window.setTimeout(() => {
    rtIdleTimer = 0;
    if (!realtimeActive) return;
    const idleMs = Date.now() - (rtLastActivityAt || Date.now());
    if (processing || speaking || voiceTurnInFlight || String(rtUserTranscript || "").trim()) {
      logRenderer("realtime.idle.defer", {
        reason,
        idleMs,
        processing,
        speaking,
        voiceTurnInFlight,
        hasTranscript: Boolean(String(rtUserTranscript || "").trim()),
      });
      scheduleRealtimeIdleShutdown("busy");
      return;
    }
    if (idleMs < idleTimeoutMs - 250) {
      scheduleRealtimeIdleShutdown("activity_reset");
      return;
    }
    logRenderer("realtime.idle.stop", { reason, idleMs });
    stopRealtimeVoice();
    setStatus("ready", "Ready");
    if (!herMode) setBubble("Stopped listening after a quiet moment.", 1600);
  }, idleTimeoutMs);
}

function markRealtimeActivity(reason, options = {}) {
  rtLastActivityAt = Date.now();
  if (options.schedule === false) {
    clearRealtimeIdleTimer();
    return;
  }
  scheduleRealtimeIdleShutdown(reason);
}

function stopRealtimeVoice(options = {}) {
  realtimeStartGeneration += 1;
  // Closing voice mode is also a hard speech boundary. No Fish chunk or
  // fallback player from the old session may survive it.
  stopSpeechOutput();
  stopDictationTurnDetector();
  stopDictationPreroll({ discard: true });
  const endingDictation = dictationMode && options.keepDictation !== true;
  if (endingDictation) {
    dictationMode = false;
    dictationStarting = false;
    void window.brainoMac.dictationControl({
      action: "stop",
      reason: options.dictationReason || "realtime_stopped",
    }).catch(() => {});
  }
  if (realtimeResponseInFlight || realtimeResponseWaiter) {
    try { sendRealtimeEvent({ type: "response.cancel" }); } catch (_) {}
    resolveRealtimeResponse({ status: "cancelled", text: realtimeResponseText, errorMessage: "realtime stopped" });
  }
  const dc = rtDc;
  const pc = rtPc;
  const mic = rtMic;
  const remoteAudio = rtRemoteAudio;
  const hadRealtime = Boolean(rtPc || rtDc || rtMic || realtimeActive || realtimeConnecting);
  rtPc = null;
  rtDc = null;
  rtMic = null;
  rtRemoteAudio = null;
  rtUserTranscript = "";
  rtTranscriptFinal = false;
  realtimeResponseText = "";
  realtimeStreamTts = null;
  clearRealtimeTranscriptFlush();
  clearRealtimeIdleTimer();
  if (rtSurfaceSyncTimer) {
    window.clearTimeout(rtSurfaceSyncTimer);
    rtSurfaceSyncTimer = 0;
  }
  realtimeActive = false;
  realtimeConnecting = false;
  voiceTurnInFlight = false;
  lastEngagedAt = Date.now(); // session over, but he stays PRESENT for 30 min
  // Session over: bring the music back up if we ducked it (no-op otherwise).
  void window.brainoMac.musicDuck?.({ duck: false });
  // Don't wipe captions here — the reply's own timer clears them, so his
  // last line lingers briefly after the session hangs up instead of vanishing.
  updateNotchFace();
  try { dc?.close(); } catch (_) {}
  try { pc?.close(); } catch (_) {}
  mic?.getTracks().forEach((track) => track.stop());
  if (remoteAudio) {
    try { remoteAudio.pause(); } catch (_) {}
    remoteAudio.srcObject = null;
    remoteAudio.remove();
  }
  if (hadRealtime) endRealtimeUsageSession("mac_client_stop");
  stopFishWarmKeepAlive();
  if (listening) listening = false;
  if (endingDictation) {
    walker.classList.remove("dictation-listening");
    updateNotchFace();
  }
}

function stopDictationTurnDetector() {
  const vad = rtDictationVad;
  rtDictationVad = null;
  if (!vad) return;
  if (vad.raf) window.cancelAnimationFrame(vad.raf);
  try { vad.source.disconnect(); } catch (_) {}
  try { vad.analyser.disconnect(); } catch (_) {}
  void vad.context.close().catch(() => {});
}

async function startDictationPreroll(stream) {
  stopDictationPreroll();
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const silentGain = context.createGain();
  const chunks = [];
  const maxSamples = context.sampleRate * 12;
  let sampleCount = 0;
  silentGain.gain.value = 0;
  processor.onaudioprocess = (event) => {
    if (sampleCount >= maxSamples) return;
    const input = event.inputBuffer.getChannelData(0);
    const remaining = maxSamples - sampleCount;
    const copy = input.slice(0, Math.min(input.length, remaining));
    chunks.push(copy);
    sampleCount += copy.length;
  };
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(context.destination);
  rtDictationPreroll = {
    context,
    source,
    processor,
    silentGain,
    chunks,
    sampleRate: context.sampleRate,
    get sampleCount() { return sampleCount; },
  };
  await context.resume();
  return rtDictationPreroll;
}

function encodeDictationPreroll(chunks, sourceRate) {
  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalSamples || !sourceRate) return { audioChunks: [], durationMs: 0 };
  const source = new Float32Array(totalSamples);
  let sourceOffset = 0;
  for (const chunk of chunks) {
    source.set(chunk, sourceOffset);
    sourceOffset += chunk.length;
  }

  const targetRate = 24000;
  const ratio = sourceRate / targetRate;
  const outputSamples = Math.floor(totalSamples / ratio);
  const pcm = new Int16Array(outputSamples);
  for (let outputIndex = 0; outputIndex < outputSamples; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio);
    const end = Math.max(start + 1, Math.min(totalSamples, Math.floor((outputIndex + 1) * ratio)));
    let sum = 0;
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) sum += source[inputIndex];
    const sample = Math.max(-1, Math.min(1, sum / (end - start)));
    pcm[outputIndex] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  const audioChunks = [];
  const samplesPerChunk = targetRate;
  for (let offset = 0; offset < pcm.length; offset += samplesPerChunk) {
    const slice = pcm.slice(offset, Math.min(pcm.length, offset + samplesPerChunk));
    audioChunks.push(arrayBufferToBase64(slice.buffer));
  }
  return {
    audioChunks,
    durationMs: Math.round((outputSamples / targetRate) * 1000),
  };
}

function stopDictationPreroll({ discard = false } = {}) {
  const preroll = rtDictationPreroll;
  rtDictationPreroll = null;
  if (!preroll) return { audioChunks: [], durationMs: 0 };
  preroll.processor.onaudioprocess = null;
  try { preroll.source.disconnect(); } catch (_) {}
  try { preroll.processor.disconnect(); } catch (_) {}
  try { preroll.silentGain.disconnect(); } catch (_) {}
  void preroll.context.close().catch(() => {});
  if (discard) return { audioChunks: [], durationMs: 0 };
  return encodeDictationPreroll(preroll.chunks, preroll.sampleRate);
}

function resetDictationVadTurn(vad) {
  if (!vad) return;
  vad.speaking = false;
  vad.candidateAt = 0;
  vad.speechStartedAt = 0;
  vad.lastVoiceAt = 0;
}

function markDictationTurnCommitted(reason, speechMs = 0) {
  dictationPendingTurns += 1;
  markVoiceLatency("speech_stopped");
  setStatus("captured", "Typing");
  logRenderer("dictation.vad.turn_committed", {
    reason,
    speechMs: Math.max(0, Math.round(speechMs)),
    pendingTurns: dictationPendingTurns,
  });
}

function commitPendingDictationTurn(reason = "manual_stop", { force = false } = {}) {
  const vad = rtDictationVad;
  const hasDetectedSpeech = Boolean(
    vad?.speaking
    || (vad?.candidateAt && performance.now() - vad.candidateAt >= 80)
    || rtUserTranscript.trim(),
  );
  if (!force && !hasDetectedSpeech) return false;
  const speechMs = vad?.speechStartedAt
    ? performance.now() - vad.speechStartedAt
    : 0;
  const sent = sendRealtimeEvent({ type: "input_audio_buffer.commit" });
  if (!sent) return false;
  markDictationTurnCommitted(reason, speechMs);
  if (force && !hasDetectedSpeech) {
    logRenderer("dictation.vad.force_committed", {
      reason,
      speechMs: Math.max(0, Math.round(speechMs)),
    });
  }
  resetDictationVadTurn(vad);
  return true;
}

async function waitForDictationDrain(timeoutMs = 4200) {
  const startedAt = Date.now();
  while (dictationPendingTurns > 0 && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }
  const remainingMs = Math.max(0, timeoutMs - (Date.now() - startedAt));
  if (remainingMs > 0) {
    await Promise.race([
      dictationInsertChain.catch(() => {}),
      new Promise((resolve) => window.setTimeout(resolve, remainingMs)),
    ]);
  }
  return {
    drained: dictationPendingTurns === 0,
    pendingTurns: dictationPendingTurns,
    durationMs: Date.now() - startedAt,
  };
}

async function startDictationTurnDetector(stream) {
  stopDictationTurnDetector();
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("Yap Mode could not start local speech detection.");
  }

  const context = new AudioContextCtor();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.15;
  source.connect(analyser);

  const vad = {
    context,
    source,
    analyser,
    samples: new Float32Array(analyser.fftSize),
    noiseFloor: 0.006,
    candidateAt: 0,
    speaking: false,
    speechStartedAt: 0,
    lastVoiceAt: 0,
    raf: 0,
  };
  rtDictationVad = vad;
  await context.resume();

  const tick = () => {
    if (rtDictationVad !== vad || !dictationMode) return;
    analyser.getFloatTimeDomainData(vad.samples);
    let power = 0;
    for (let index = 0; index < vad.samples.length; index += 1) {
      power += vad.samples[index] * vad.samples[index];
    }
    const rms = Math.sqrt(power / vad.samples.length);
    const now = performance.now();
    const threshold = Math.max(0.014, Math.min(0.06, vad.noiseFloor * 3.2));
    const voiced = rms >= threshold;

    if (!vad.speaking) {
      if (voiced) {
        if (!vad.candidateAt) vad.candidateAt = now;
        if (now - vad.candidateAt >= 110) {
          vad.speaking = true;
          vad.speechStartedAt = vad.candidateAt;
          vad.lastVoiceAt = now;
          markRealtimeActivity("dictation_local_speech", { schedule: false });
          startVoiceLatencyTurn("dictation_local_vad");
          setStatus("hearing", "Yapping");
          logRenderer("dictation.vad.speech_started", {
            rms: Number(rms.toFixed(4)),
            threshold: Number(threshold.toFixed(4)),
          });
        }
      } else {
        vad.candidateAt = 0;
        vad.noiseFloor = (vad.noiseFloor * 0.96) + (rms * 0.04);
      }
    } else {
      if (voiced) vad.lastVoiceAt = now;
      if (!voiced && now - vad.lastVoiceAt >= 720) {
        const speechMs = now - vad.speechStartedAt;
        const sent = speechMs >= 260 && sendRealtimeEvent({ type: "input_audio_buffer.commit" });
        if (sent) {
          markDictationTurnCommitted("silence", speechMs);
          resetDictationVadTurn(vad);
        } else {
          vad.lastVoiceAt = now;
        }
      }
    }

    vad.raf = window.requestAnimationFrame(tick);
  };
  vad.raf = window.requestAnimationFrame(tick);
}

function clearRealtimeTranscriptFlush() {
  if (rtTranscriptFlushTimer) {
    window.clearTimeout(rtTranscriptFlushTimer);
    rtTranscriptFlushTimer = 0;
  }
}

function scheduleRealtimeTranscriptFlush(reason, delay = 900) {
  clearRealtimeTranscriptFlush();
  rtTranscriptFlushTimer = window.setTimeout(() => {
    rtTranscriptFlushTimer = 0;
    flushRealtimeTranscript(reason);
  }, delay);
}

function enqueueDictationTranscript(transcript) {
  const generation = dictationStartGeneration;
  dictationInsertChain = dictationInsertChain
    .catch((error) => {
      logRenderer("dictation.insert_queue.recovered", { error: errorForLog(error) });
    })
    .then(async () => {
      if (!dictationMode || generation !== dictationStartGeneration) return;
      const control = await window.brainoMac.dictationIntent(transcript, true).catch(() => null);
      if (!dictationMode || generation !== dictationStartGeneration) return;
      if (control?.action === "stop") {
        await stopYapMode({ source: "voice_done", skipDrain: true });
        return;
      }

      const inserted = await window.brainoMac.dictationInsert({ text: transcript });
      if (!dictationMode || generation !== dictationStartGeneration) return;
      if (!inserted?.ok) {
        setStatus("error", "Yap Mode paused");
        setBubble(inserted?.error || "Keep the caret in a text field.", 3200);
        window.setTimeout(() => {
          if (dictationMode && realtimeActive) setStatus("listening", "Yap Mode");
        }, 3200);
        return;
      }
      setStatus("listening", "Yap Mode");
    });
}

function flushRealtimeTranscript(reason) {
  const transcript = String(rtUserTranscript || "").trim();
  if (reason === "speech_stopped" && transcript && !rtTranscriptFinal) {
    scheduleRealtimeTranscriptFlush("waiting_final_transcript", REALTIME_TRANSCRIPT_IDLE_FLUSH_MS);
    return;
  }
  rtUserTranscript = "";
  rtTranscriptFinal = false;
  clearRealtimeTranscriptFlush();
  const accepted = dictationMode ? Boolean(transcript) : shouldAcceptVoiceTranscript(transcript);
  logRenderer("realtime.transcript.flush", {
    reason,
    transcriptChars: transcript.length,
    accepted,
    voiceTurnInFlight,
  });
  if (!transcript) {
    setStatus("listening", dictationMode ? "Yap Mode" : "Listening");
    scheduleRealtimeIdleShutdown("empty_transcript");
    return;
  }
  if (dictationMode) {
    clearRealtimeIdleTimer();
    markRealtimeActivity("accepted_dictation", { schedule: false });
    nfSetHeard(transcript, { durationMs: 1400 });
    enqueueDictationTranscript(transcript);
    return;
  }
  if (voiceTurnInFlight || !accepted) {
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
    } else {
      setStatus("listening", dictationMode ? "Yap Mode" : "Listening");
      scheduleRealtimeIdleShutdown("ignored_transcript");
    }
    return;
  }
  clearRealtimeIdleTimer();
  markRealtimeActivity("accepted_transcript", { schedule: false });
  if (speaking) stopSpeechOutput();
  voiceTurnInFlight = true;
  nfSetHeard(transcript);
  void (async () => {
    try {
      const dictationControl = await window.brainoMac.dictationIntent(transcript, false).catch(() => null);
      if (dictationControl?.action === "start") {
        await startYapMode({ source: "voice" });
        return;
      }
      if (herMode) {
        if (HER_EXIT_RE.test(normalizeForVoiceMatch(transcript))) {
          await exitHerMode({ farewell: true });
          return;
        }
        window.HerMode?.setHeard(transcript);
        window.HerMode?.setReply("");
        await answerViaRealtimeChat(transcript);
        return;
      }
      if (HER_ENTER_RE.test(normalizeForVoiceMatch(transcript))) {
        await enterHerMode();
        return;
      }
      // Voice personas ("talk like Donald Trump" / "be yourself") must be
      // caught BEFORE the chat/delegate fork — chat was swallowing them.
      let turnText = transcript;
      const personaCmd = macDetectPersonaCommand(transcript);
      if (personaCmd) {
        const outcome = await macApplyPersonaCommand(personaCmd);
        if (outcome.done) return;
        turnText = outcome.remainder;
      }
      if (await runBrainoGrowVoiceCommand(turnText)) return;
      if (await runMacTeamInput(turnText, { keepRealtime: true, fromVoice: true })) return;
      if (shouldUseRealtimeDirectChat(turnText)) {
        const handled = await answerViaRealtimeChat(turnText);
        if (handled) return;
        logRenderer("realtime.chat.fallback_to_delegate", {
          transcriptChars: turnText.length,
          ...voiceLatencySnapshot(),
        });
      }
      await runDelegate(turnText, { keepRealtime: true });
    } finally {
      voiceTurnInFlight = false;
      if (realtimeActive) {
        listening = true;
        setStatus("listening", "Listening");
        scheduleRealtimeIdleShutdown("turn_done");
      }
    }
  })();
}

function setRealtimeMicEnabled(on) {
  rtMic?.getAudioTracks?.().forEach((track) => {
    track.enabled = Boolean(on);
  });
}

function handleRealtimeEvent(event) {
  if (!event?.type) return;
  if (![
    "conversation.item.input_audio_transcription.delta",
    "response.output_text.delta",
    "response.output_audio_transcript.delta",
    "input_audio_buffer.speech_started",
    "input_audio_buffer.speech_stopped",
    "session.updated",
    "rate_limits.updated",
  ].includes(event.type)) {
    logRenderer("realtime.event", { type: event.type });
  }
  if (event.type === "session.created" || event.type === "session.updated") {
    if (realtimeActive || realtimeConnecting) {
      setStatus("listening", dictationMode ? "Yap Mode" : "Listening");
      if (realtimeActive) scheduleRealtimeIdleShutdown("session_ready");
    }
    return;
  }

  if (event.type === "input_audio_buffer.speech_started") {
    markRealtimeActivity("speech_started", { schedule: false });
    startVoiceLatencyTurn("speech_started");
    liveCapDisplayed = ""; // fresh turn, fresh caption slate
    rtUserTranscript = "";
    rtTranscriptFinal = false;
    clearRealtimeTranscriptFlush();
    // Trust the physical audio state, not just the flags: `speaking` can go
    // stale while a long Fish stream is still audible, which used to make
    // interruptions land here and do nothing until the clip finished.
    const audiblyTalking = Boolean(activeSpeechJobGeneration)
      || speaking
      || Boolean(currentSpeechAudio)
      || Boolean(realtimeStreamTts)
      || activeSpeechAudios.size > 0
      || ttsAbortControllers.size > 0;
    if (audiblyTalking || realtimeResponseInFlight) {
      logRenderer("realtime.barge_in", {
        via: "speech_started",
        speaking,
        processing,
        voiceTurnInFlight,
        activeSpeechJobGeneration,
        activeAudioCount: activeSpeechAudios.size,
        activeTtsFetchCount: ttsAbortControllers.size,
        hadAudio: Boolean(currentSpeechAudio),
        hadStreamTts: Boolean(realtimeStreamTts),
        responseInFlight: realtimeResponseInFlight,
      });
      interruptVoiceTurn("barge_in", "speech_started");
      setStatus("hearing", dictationMode ? "Yapping" : "Hearing you");
      if (!walkerHome) setBubble("Listening...", 0);
      return;
    }
    if (processing || voiceTurnInFlight) {
      setStatus("thinking", "Delegating");
      return;
    }
    setStatus("hearing", dictationMode ? "Yapping" : "Hearing you");
    if (!walkerHome) setBubble("Listening...", 0);
    return;
  }

  if (event.type === "input_audio_buffer.speech_stopped") {
    markRealtimeActivity("speech_stopped", { schedule: false });
    markVoiceLatency("speech_stopped");
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
      return;
    }
    setStatus("captured", dictationMode ? "Typing" : "Got it");
    if (!walkerHome && !dictationMode) setBubble("Got it.", 900);
    scheduleRealtimeTranscriptFlush("speech_stopped", REALTIME_SPEECH_STOP_FLUSH_MS);
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.delta") {
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (delta) {
      // Second tripwire: if user words are arriving while any audio is still
      // playing, cut the speech even if speech_started was missed or mishandled.
      if (speaking || currentSpeechAudio || realtimeStreamTts) {
        logRenderer("realtime.barge_in", {
          via: "transcript_delta",
          speaking,
          hadAudio: Boolean(currentSpeechAudio),
          hadStreamTts: Boolean(realtimeStreamTts),
        });
        interruptVoiceTurn("barge_in", "transcript_delta");
      }
      markRealtimeActivity("transcript_delta", { schedule: false });
      rtTranscriptFinal = false;
      rtUserTranscript += delta;
      if (dictationMode) {
        nfSetHeard(rtUserTranscript.trim(), { durationMs: 1800 });
      } else {
        if (herMode) window.HerMode?.setHeard(rtUserTranscript.trim());
        else if (!walkerHome) setBubble(rtUserTranscript.trim() || "Listening...", 0);
        nfSetHeard(rtUserTranscript.trim());
        scheduleRealtimeTranscriptFlush("transcript_idle", REALTIME_TRANSCRIPT_IDLE_FLUSH_MS);
      }
    }
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    markRealtimeActivity("transcript_completed", { schedule: false });
    rtUserTranscript = String(event.transcript || rtUserTranscript || "");
    rtTranscriptFinal = true;
    if (dictationMode && dictationPendingTurns > 0) {
      dictationPendingTurns -= 1;
      logRenderer("dictation.transcript.completed", {
        transcriptChars: rtUserTranscript.trim().length,
        pendingTurns: dictationPendingTurns,
      });
    }
    markVoiceLatency("transcript_completed", { transcriptChars: rtUserTranscript.trim().length });
    flushRealtimeTranscript("completed");
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.failed") {
    const message = event.error?.message || "Whisper could not transcribe this audio.";
    if (dictationMode && dictationPendingTurns > 0) dictationPendingTurns -= 1;
    logRenderer("dictation.transcript.failed", {
      message,
      pendingTurns: dictationPendingTurns,
    });
    setStatus("error", "Yap Mode did not catch that");
    return;
  }

  if (event.type === "response.created") {
    realtimeResponseInFlight = true;
    realtimeResponseText = "";
    logRenderer("realtime.chat.response_started", voiceLatencySnapshot());
    return;
  }

  if (event.type === "response.output_text.delta" || event.type === "response.output_audio_transcript.delta") {
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (delta) {
      markVoiceLatency("response_delta", {
        source: event.type === "response.output_audio_transcript.delta" ? "audio_transcript" : "text",
      });
      realtimeResponseText += delta;
      if (herMode) window.HerMode?.setReply(realtimeResponseText);
      feedRealtimeStreamTts(delta);
    }
    return;
  }

  if (event.type === "response.output_text.done" || event.type === "response.output_audio_transcript.done") {
    const doneText = String(event.text || event.transcript || "").trim();
    if (doneText && doneText.length > realtimeResponseText.length) realtimeResponseText = doneText;
    return;
  }

  if (event.type === "response.done") {
    const finalText = extractRealtimeDoneText(event) || realtimeResponseText;
    if (finalText && realtimeStreamTts?.generation === speechGeneration) {
      startReplyCaption(finalText, realtimeStreamTts.generation);
      logRenderer("caption.reply.start", {
        generation: realtimeStreamTts.generation,
        chars: finalText.length,
        route: "realtime_chat",
      });
    }
    if (herMode && finalText) window.HerMode?.setReply(finalText);
    resolveRealtimeResponse({ status: "done", text: finalText });
    return;
  }

  if (event.type === "response.cancelled") {
    resolveRealtimeResponse({ status: "cancelled", text: realtimeResponseText });
    return;
  }

  if (event.type === "error") {
    const message = event.error?.message || event.message || "Realtime voice error.";
    logRenderer("realtime.event.error", { message, error: event.error || null });
    if (dictationMode && dictationStopping && dictationPendingTurns > 0) {
      dictationPendingTurns -= 1;
      logRenderer("dictation.transcript.failed", {
        message,
        pendingTurns: dictationPendingTurns,
      });
    }
    if (realtimeResponseInFlight || realtimeResponseWaiter) {
      resolveRealtimeResponse({ status: "error", text: realtimeResponseText, errorMessage: message });
    }
    setStatus("error", dictationMode ? "Yap Mode error" : "Voice error");
    setBubble(`${dictationMode ? "Yap Mode" : "Voice"} error: ${message}`, 3600);
    clearRealtimeIdleTimer();
  }
}

function realtimeStartCancelledError() {
  const error = new Error("Realtime start was cancelled.");
  error.code = "BRAINO_REALTIME_START_CANCELLED";
  return error;
}

function isRealtimeStartCancelled(error) {
  return error?.code === "BRAINO_REALTIME_START_CANCELLED";
}

async function waitForRealtimeDataChannel(dc, isCurrent) {
  if (dc.readyState === "open") return;
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      dc.removeEventListener("open", onOpen);
      dc.removeEventListener("error", onError);
      dc.removeEventListener("close", onClose);
    };
    const finish = (callback, value) => {
      cleanup();
      callback(value);
    };
    const onOpen = () => {
      if (!isCurrent()) {
        finish(reject, realtimeStartCancelledError());
        return;
      }
      finish(resolve);
    };
    const onError = () => {
      finish(reject, isCurrent()
        ? new Error("Live voice control channel failed.")
        : realtimeStartCancelledError());
    };
    const onClose = () => {
      finish(reject, isCurrent()
        ? new Error("Live voice control channel closed while connecting.")
        : realtimeStartCancelledError());
    };
    const timeout = window.setTimeout(() => {
      finish(reject, isCurrent()
        ? new Error("Live voice timed out while connecting.")
        : realtimeStartCancelledError());
    }, 15000);
    dc.addEventListener("open", onOpen, { once: true });
    dc.addEventListener("error", onError, { once: true });
    dc.addEventListener("close", onClose, { once: true });
  });
}

function assertRealtimeStartCurrent(generation, pc) {
  if (generation !== realtimeStartGeneration || pc !== rtPc) {
    throw realtimeStartCancelledError();
  }
}

function getLocalOfferSdp(pc, fallbackOffer = null) {
  return String(
    pc?.localDescription?.sdp ||
    pc?.pendingLocalDescription?.sdp ||
    fallbackOffer?.sdp ||
    ""
  );
}

function isLikelyRealtimeOfferSdp(sdp) {
  return /^v=0\r?$/m.test(sdp) && /^m=/m.test(sdp);
}

async function waitForIceGathering(pc, timeoutMs = 1500) {
  if (!pc || pc.iceGatheringState === "complete") return;
  await new Promise((resolve) => {
    const timeout = window.setTimeout(done, timeoutMs);
    function done() {
      window.clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }
    function onChange() {
      if (pc.iceGatheringState === "complete") done();
    }
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

async function createLocalRealtimeOffer(pc) {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
  });
  await pc.setLocalDescription(offer);
  let sdp = getLocalOfferSdp(pc, offer);
  if (!sdp || !isLikelyRealtimeOfferSdp(sdp)) {
    await waitForIceGathering(pc, 1800);
    sdp = getLocalOfferSdp(pc, offer);
  }
  logRenderer("realtime.offer.created", {
    offerChars: sdp.length,
    iceGatheringState: pc.iceGatheringState || "unknown",
    hasVersionLine: /^v=0\r?$/m.test(sdp),
    mediaLineCount: (sdp.match(/^m=/gm) || []).length,
    hasAudioLine: /^m=audio/m.test(sdp),
    hasApplicationLine: /^m=application/m.test(sdp),
  });
  if (!sdp) {
    throw new Error("Realtime could not create a WebRTC offer. No local SDP was generated.");
  }
  if (!isLikelyRealtimeOfferSdp(sdp)) {
    throw new Error("Realtime created an invalid WebRTC offer before calling the server.");
  }
  return sdp;
}

async function ensureMicrophoneAccess() {
  logRenderer("microphone.request.start");
  const result = await window.brainoMac.requestMicrophone().catch((error) => ({
    ok: false,
    error: error?.message || "Could not request microphone access.",
  }));
  logRenderer("microphone.request.result", {
    ok: result?.ok,
    status: result?.status || "unknown",
    error: result?.error || null,
  });
  if (result?.ok === false) {
    throw new Error(result.error || "Microphone access was denied.");
  }
  if (result?.status && ["denied", "restricted"].includes(result.status)) {
    throw new Error("Microphone access is blocked in macOS Privacy settings.");
  }
}

async function startRealtimeVoice(options = {}) {
  const purpose = options.purpose === "dictation" ? "dictation" : "voice";
  const isDictation = purpose === "dictation";
  let dictationSender = null;
  stopRecognition();
  stopRealtimeVoice({ keepDictation: isDictation });
  const startGeneration = ++realtimeStartGeneration;
  realtimeConnecting = true;
  listening = true;
  setStatus("connecting", isDictation ? "Starting Yap Mode" : "Waking voice");
  if (!isDictation) setBubble("Voice is waking up.", 1300);
  logRenderer("realtime.start", {
    purpose,
    voiceEngine: realtimeVoiceEngine,
    hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    hasRTCPeerConnection: Boolean(window.RTCPeerConnection),
  });

  try {
    const authResult = await window.brainoMac.ensureAuth("realtime").catch((error) => ({
      ok: false,
      error: error?.message || "Braino sign-in failed.",
    }));
    logRenderer("realtime.auth.result", {
      ok: Boolean(authResult?.ok),
      source: authResult?.source || "unknown",
      error: authResult?.error || null,
    });
    if (!authResult?.ok) {
      throw new Error(authResult?.error || "Braino sign-in is required for realtime voice.");
    }
    setAuthPose(false);
    if (!isDictation) void warmFishTts();
    await ensureMicrophoneAccess();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (startGeneration !== realtimeStartGeneration) {
      stream.getTracks().forEach((track) => track.stop());
      throw realtimeStartCancelledError();
    }
    rtMic = stream;
    if (isDictation) await startDictationPreroll(stream);
    logRenderer("realtime.mic.ok", {
      audioTracks: stream.getAudioTracks().length,
    });

    const pc = new RTCPeerConnection();
    rtPc = pc;
    stream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, stream);
      if (isDictation && track.kind === "audio") dictationSender = sender;
    });
    if (dictationSender) {
      // Keep the negotiated audio sender silent until the locally buffered
      // startup speech has been appended in front of the live stream.
      await dictationSender.replaceTrack(null);
    }

    const playOpenAiVoice = !isDictation && realtimeVoiceEngine === "realtime";
    if (!isDictation) {
      rtRemoteAudio = new Audio();
      rtRemoteAudio.autoplay = true;
      rtRemoteAudio.muted = !playOpenAiVoice;
      rtRemoteAudio.volume = playOpenAiVoice ? 1 : 0;
      document.body.appendChild(rtRemoteAudio);
    }
    pc.addEventListener("track", (event) => {
      if (!rtRemoteAudio) return;
      rtRemoteAudio.srcObject = event.streams[0] || new MediaStream([event.track]);
      rtRemoteAudio.play().catch(() => {});
    });
    rtRemoteAudio?.addEventListener("playing", () => {
      if (realtimeVoiceEngine !== "realtime") return;
      speaking = true;
      setTalk(true);
      setStatus("speaking", "Speaking");
      markVoiceLatency("first_audio", { source: "openai_realtime_audio" });
    });
    pc.addEventListener("connectionstatechange", () => {
      if (pc !== rtPc) return;
      logRenderer("realtime.peer.state", { state: pc.connectionState });
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        stopRealtimeVoice();
        setStatus("error", isDictation ? "Yap Mode disconnected" : "Voice disconnected");
        setBubble(
          isDictation ? "Yap Mode disconnected. Double Option restarts it." : "Voice disconnected. Double Control wakes me again.",
          3200,
        );
      }
    });

    const dc = pc.createDataChannel("oai-events");
    rtDc = dc;
    dc.addEventListener("open", () => logRenderer("realtime.datachannel.open"));
    dc.addEventListener("close", () => logRenderer("realtime.datachannel.close"));
    dc.addEventListener("error", () => logRenderer("realtime.datachannel.error"));
    dc.addEventListener("message", (event) => {
      try {
        handleRealtimeEvent(JSON.parse(event.data));
      } catch (_) {}
    });

    const offerSdp = await createLocalRealtimeOffer(pc);
    const result = await window.brainoMac.createRealtimeCall({
      offerSdp,
      voiceEngine: realtimeVoiceEngine,
      purpose,
    });
    assertRealtimeStartCurrent(startGeneration, pc);
    if (!result?.ok || !result.answerSdp) {
      logRenderer("realtime.create.failed", {
        error: result?.error || "Realtime voice could not start.",
        transport: result?.transport || null,
      });
      throw new Error(result?.error || "Realtime voice could not start.");
    }
    logRenderer("realtime.create.ok", {
      transport: result.transport || "unknown",
      hasSessionId: Boolean(result.sessionId),
      realtimeModel: result.realtimeModel || null,
      transcriptionModel: result.transcriptionModel || null,
    });
    await pc.setRemoteDescription({ type: "answer", sdp: result.answerSdp });
    assertRealtimeStartCurrent(startGeneration, pc);
    await waitForRealtimeDataChannel(
      dc,
      () => startGeneration === realtimeStartGeneration && pc === rtPc,
    );
    assertRealtimeStartCurrent(startGeneration, pc);
    sendRealtimeEvent(buildRealtimeSessionUpdate());
    if (isDictation) {
      const preroll = stopDictationPreroll();
      let appendedChunks = 0;
      for (const audio of preroll.audioChunks) {
        if (sendRealtimeEvent({ type: "input_audio_buffer.append", audio })) appendedChunks += 1;
      }
      if (dictationSender) {
        await dictationSender.replaceTrack(stream.getAudioTracks()[0] || null);
      }
      logRenderer("dictation.preroll.flushed", {
        durationMs: preroll.durationMs,
        chunks: appendedChunks,
      });
      await startDictationTurnDetector(stream);
      assertRealtimeStartCurrent(startGeneration, pc);
    }
    startRealtimeHeartbeat(result.sessionId || null);

    realtimeActive = true;
    realtimeConnecting = false;
    listening = true;
    lastEngagedAt = Date.now();
    markRealtimeActivity("realtime_ready");
    if (!isDictation) startFishWarmKeepAlive();
    setStatus("listening", isDictation ? "Yap Mode" : "Listening");
    if (!isDictation) setBubble("I am listening.", 1400);
    logRenderer("realtime.ready", { purpose });
  } catch (error) {
    const cancelled = isRealtimeStartCancelled(error) || startGeneration !== realtimeStartGeneration;
    logRenderer(cancelled ? "realtime.start.cancelled" : "realtime.start.error", {
      purpose,
      error: errorForLog(error),
    });
    if (cancelled) throw realtimeStartCancelledError();
    setAuthPose(false);
    if (startGeneration === realtimeStartGeneration) {
      stopRealtimeVoice({ keepDictation: isDictation });
    }
    throw error;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return window.btoa(binary);
}

async function recordShortCommandForTranscription() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    logRenderer("voice.record.unavailable", {
      hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
      hasMediaRecorder: Boolean(window.MediaRecorder),
    });
    throw new Error("Mic recording is not available in this Electron build.");
  }

  const mimeType = window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  await ensureMicrophoneAccess();
  logRenderer("voice.record.start", { mimeType });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  try {
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    const done = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error("Audio recording failed."));
      recorder.onstop = resolve;
    });

    recorder.start();
    await new Promise((resolve) => window.setTimeout(resolve, 4800));
    if (recorder.state !== "inactive") recorder.stop();
    await done;

    if (!chunks.length) throw new Error("No audio chunks were recorded.");
    const blob = new Blob(chunks, { type: mimeType });
    logRenderer("voice.record.done", {
      chunks: chunks.length,
      bytes: blob.size,
      mimeType: blob.type || mimeType,
    });
    const audioBase64 = arrayBufferToBase64(await blob.arrayBuffer());
    return window.brainoMac.transcribeAudio({
      audioBase64,
      mimeType: blob.type || mimeType,
    });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function startLegacyCommandCapture(reason = "") {
  if (processing) return;
  stopRecognition();
  const token = listenToken;
  listening = true;
  setStatus("listening", "Listening");
  setBubble(reason ? "Realtime missed. Say it once more." : "I am listening.", 1200);
  setWave(true);
  logRenderer("voice.fallback.start", {
    reason,
  });

  try {
    let transcript = "";
    let lastError = null;

    try {
      setStatus("listening", "Recording");
      const recorded = await recordShortCommandForTranscription();
      if (token !== listenToken) return;
      transcript = String(recorded?.transcript || "").trim();
      if (!(recorded?.ok && transcript)) {
        throw new Error(recorded?.error || "Recording did not return a transcript.");
      }
      logRenderer("voice.fallback.recording_transcript", {
        transcriptChars: transcript.length,
      });
    } catch (recordError) {
      lastError = recordError;
      logRenderer("voice.fallback.recording_error", { error: errorForLog(recordError) });
      setStatus("listening", "Native fallback");
      setBubble("Recording missed. Trying native voice.", 1600);
      const result = await window.brainoMac.nativeListen();
      if (token !== listenToken) return;
      transcript = String(result?.transcript || "").trim();
      if (!(result?.ok && transcript)) {
        logRenderer("voice.fallback.native_failed", {
          ok: result?.ok,
          error: result?.error || lastError?.message || null,
        });
        throw new Error(result?.error || lastError?.message || "Voice did not return a transcript.");
      }
      logRenderer("voice.fallback.native_transcript", {
        transcriptChars: transcript.length,
      });
    }

    listening = false;
    if (!(await runMacTeamInput(transcript))) void runDelegate(transcript);
  } catch (error) {
    if (token !== listenToken) return;
    logRenderer("voice.fallback.error", { error: errorForLog(error) });
    listening = false;
    setStatus("error", "Voice error");
    setBubble(`Voice error: ${error?.message || "native speech failed"}`, 3600);
    const typed = window.prompt("Braino Mac delegate command");
    if (typed) {
      if (!(await runMacTeamInput(typed))) void runDelegate(typed);
    }
  } finally {
    if (token === listenToken && !processing) {
      listening = false;
      setStatus("ready", "Double Space to show/hide");
    }
  }
}

async function startListening() {
  if (processing || realtimeConnecting || realtimeActive || voiceCycleInFlight) return;
  voiceCycleInFlight = true;
  logRenderer("voice.toggle.start_listening");
  // Music drowns the mic (VAD fires on the song, turns never survive) — duck
  // the player to ~20% for the session; restored on stopRealtimeVoice.
  if (musicMode) void window.brainoMac.musicDuck?.({ duck: true });
  try {
    await startRealtimeVoice();
  } catch (error) {
    logRenderer("voice.realtime_to_fallback", { error: errorForLog(error) });
    setStatus("error", "Voice error");
    setBubble(`Voice error: ${error?.message || "realtime failed"}`, 3600);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    await startLegacyCommandCapture(error?.message || "");
  } finally {
    voiceCycleInFlight = false;
    if (!realtimeActive && !realtimeConnecting && !listening) {
      void window.brainoMac.musicDuck?.({ duck: false });
    }
  }
}

async function startYapMode({ source = "hotkey" } = {}) {
  if (dictationMode || dictationStarting || dictationStopping) return;
  const startGeneration = ++dictationStartGeneration;
  dictationStarting = true;
  dictationStopping = false;
  dictationStopRequestedSource = "";
  dictationPendingTurns = 0;
  dictationMode = true;
  logRenderer("dictation.start.requested", { source });
  stopSpeechOutput();
  if (herMode) await exitHerMode({ farewell: false });
  updateNotchFace();
  setStatus("connecting", "Yap Mode");

  const started = await window.brainoMac.dictationControl({
    action: "start",
    reason: source,
  }).catch((error) => ({
    ok: false,
    error: error?.message || "Yap Mode could not start.",
  }));
  if (startGeneration !== dictationStartGeneration) return;
  if (!started?.ok) {
    dictationMode = false;
    dictationStarting = false;
    dictationStopRequestedSource = "";
    updateNotchFace();
    setStatus("error", "Yap Mode unavailable");
    nfShowTransient(started?.error || "Yap Mode could not start.", 3600);
    logRenderer("dictation.start.rejected", { source, error: started?.error || "unknown" });
    return;
  }

  updateNotchFace();
  try {
    await startRealtimeVoice({ purpose: "dictation" });
    if (startGeneration !== dictationStartGeneration || !dictationMode) return;
    logRenderer("dictation.started", {
      source,
      targetApp: started.targetApp || "",
      model: started.model || DICTATION_TRANSCRIPTION_MODEL,
    });
    if (dictationStopRequestedSource) {
      const queuedSource = dictationStopRequestedSource;
      dictationStopRequestedSource = "";
      await stopYapMode({ source: queuedSource });
      return;
    }
  } catch (error) {
    if (
      isRealtimeStartCancelled(error)
      || startGeneration !== dictationStartGeneration
      || !dictationMode
    ) {
      logRenderer("dictation.start.cancelled", { source });
      return;
    }
    dictationMode = false;
    dictationStopRequestedSource = "";
    await window.brainoMac.dictationControl({
      action: "stop",
      reason: "start_failed",
    }).catch(() => {});
    updateNotchFace();
    setStatus("error", "Yap Mode unavailable");
    nfShowTransient(`Yap Mode error: ${error?.message || "realtime transcription failed"}`, 4200);
    logRenderer("dictation.start.error", { source, error: errorForLog(error) });
  } finally {
    if (startGeneration === dictationStartGeneration) dictationStarting = false;
  }
}

async function stopYapMode({ source = "hotkey", skipDrain = false } = {}) {
  if ((!dictationMode && !dictationStarting) || dictationStopping) return;
  if (!skipDrain && dictationStarting && !realtimeActive) {
    dictationStopRequestedSource = source;
    setStatus("captured", "Finishing");
    logRenderer("dictation.stop.queued", { source });
    return;
  }
  dictationStopping = true;
  const canDrain = !skipDrain && dictationMode && realtimeActive && rtDc?.readyState === "open";
  if (canDrain) {
    // The WebRTC input buffer can contain speech even when the local meter
    // misses a short or quiet phrase, so stopping must always finalize it.
    const committedFinalTurn = commitPendingDictationTurn("manual_stop", { force: true });
    stopDictationTurnDetector();
    setRealtimeMicEnabled(false);
    if (committedFinalTurn || dictationPendingTurns > 0) {
      setStatus("captured", "Finishing");
    }
    const drain = await waitForDictationDrain();
    logRenderer("dictation.stop.drained", {
      source,
      committedFinalTurn,
      ...drain,
    });
  }
  dictationStartGeneration += 1;
  dictationMode = false;
  dictationStarting = false;
  dictationStopRequestedSource = "";
  stopRealtimeVoice({ keepDictation: true });
  await window.brainoMac.dictationControl({
    action: "stop",
    reason: source,
  }).catch(() => {});
  walker.classList.remove("dictation-listening");
  nfClearCaptions();
  updateNotchFace();
  setStatus("ready", "Double Option for Yap Mode");
  nfShowTransient("Yap Mode off.", 1200);
  dictationPendingTurns = 0;
  dictationStopping = false;
  logRenderer("dictation.stopped", { source });
}

function toggleYapMode(source = "hotkey") {
  if (dictationStopping) return;
  if (dictationMode || dictationStarting) void stopYapMode({ source });
  else void startYapMode({ source });
}

function toggleVoice() {
  if (dictationMode || dictationStarting) {
    void stopYapMode({ source: "voice_toggle" });
    return;
  }
  // Stage 1: if he is audibly talking, the tap means "stop talking NOW" —
  // cut the audio mid-word but stay listening for the follow-up.
  if (interruptVoiceTurn("manual_stop", "control_hotkey")) {
    if (realtimeActive) {
      listening = true;
      setStatus("listening", "Listening");
      scheduleRealtimeIdleShutdown("manual_stop");
      return;
    }
  }
  // Stage 2: not talking (or voice already off) — normal on/off toggle.
  if (realtimeActive || realtimeConnecting || listening) {
    stopSpeechOutput();
    stopRealtimeVoice();
    stopRecognition();
    setStatus("ready", "Double Space to show/hide");
    setBubble("Stopped listening.", 1200);
    return;
  }
  void startListening();
}

async function enterHerMode() {
  if (herMode) return;
  logRenderer("her.enter");
  stopSpeechOutput();
  herMode = true;
  window.HerMode?.enter();
  setMousePassthrough(false);
  try {
    if (realtimeActive) {
      scheduleRealtimeSurfaceSync("her_enter");
    } else if (!realtimeConnecting) {
      await startListening();
    }
    if (rtMic) window.HerMode?.attachMicStream(rtMic);
    await speak("hey. i'm here.");
  } catch (error) {
    logRenderer("her.enter.error", { error: errorForLog(error) });
  }
}

async function exitHerMode(options = {}) {
  if (!herMode) return;
  logRenderer("her.exit", { farewell: Boolean(options.farewell) });
  try {
    if (options.farewell) await speak("okay. go be in the world. i'll be right here.");
  } catch (_) {}
  herMode = false;
  window.HerMode?.exit();
  scheduleRealtimeSurfaceSync("her_exit");
  setMousePassthrough(true);
  if (realtimeActive) setStatus("listening", "Listening");
  else setStatus("ready", "Double Space to show/hide");
}

function toggleHerMode() {
  if (herMode) void exitHerMode({ farewell: false });
  else void enterHerMode();
}

window.addEventListener("her:leave", () => {
  void exitHerMode({ farewell: true });
});

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function runWakeupClimb(config = {}) {
  return new Promise((resolve) => {
    const dock = getDockBounds();
    const climbX = clamp(Math.round(window.innerWidth * 0.5 - W / 2), dock.minX, dock.maxX);
    const entryX = clamp(climbX - 150, dock.minX, dock.maxX);
    const finalY = dock.y;
    const floorY = finalY + 74;
    const startY = finalY + 230;
    let phase = "pop";
    let phaseStart = performance.now();
    let saidAuth = false;
    let saidHello = false;
    let authBegun = false;
    let authResolved = false;
    let authResult = null;
    let firstName = "";
    let raf = 0;
    let pose = {
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0,
      eyeScale: 1,
      gazeX: 0,
      gazeY: -0.55,
      rootRot: 0,
      rootY: 0,
      rootScale: 1,
    };

    const next = (name) => {
      phase = name;
      phaseStart = performance.now();
    };
    const poseTo = (patch) => {
      pose = { ...pose, ...patch };
      setStartupPose(pose);
    };
    const place = (x, y, rot = 0) => {
      setPosition(x, y, { allowOffscreen: true });
      poseTo({ rootRot: rot });
    };
    const loadName = async () => {
      const auth = await window.brainoMac.authStatus().catch(() => null);
      firstName = String(auth?.displayName || "").split(" ")[0]?.trim() || "";
    };
    const startAuth = () => {
      if (authBegun) return;
      authBegun = true;
      setAuthPose(true);
      window.brainoMac.ensureAuth("startup").then((result) => {
        authResult = result || { ok: false, error: "Braino sign-in failed." };
      }).catch((error) => {
        authResult = { ok: false, error: error?.message || "Braino sign-in failed." };
      }).finally(async () => {
        authResolved = true;
        if (authResult?.ok) await loadName();
      });
    };
    const finish = (result) => {
      if (raf) window.cancelAnimationFrame(raf);
      setAuthPose(false);
      setStartupPose(null);
      setWave(false);
      setPosition(climbX, finalY, { allowOffscreen: true });
      targetX = climbX;
      targetY = finalY;
      dirX = 1;
      resolve(result || authResult || { ok: false, error: "Braino sign-in failed." });
    };

    void loadName();
    setPosition(entryX, startY, { allowOffscreen: true });
    targetX = climbX;
    targetY = finalY;
    dirX = 1;
    walker.classList.add("visible");
    setStartupPose(pose);

    const step = (now) => {
      const e = now - phaseStart;
      if (phase === "pop") {
        const k = easeOut(Math.min(1, e / 1050));
        place(entryX, lerp(startY, floorY, k));
        poseTo({ gazeX: 0, gazeY: -0.4, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, eyeScale: 1 });
        if (k >= 1) next("walk");
      } else if (phase === "walk") {
        const k = Math.min(1, e / 1000);
        const s = (e / 1000) * 9;
        place(lerp(entryX, climbX, easeInOut(k)), floorY, Math.sin(s) * 3.4);
        poseTo({
          leftLeg: Math.max(0, Math.sin(s)) * 16,
          rightLeg: Math.max(0, Math.sin(s + Math.PI)) * 16,
          gazeX: 1.6,
          gazeY: 0,
        });
        if (k >= 1) {
          poseTo({ leftLeg: 0, rightLeg: 0, rootRot: 0 });
          next("reach");
        }
      } else if (phase === "reach") {
        const k = easeInOut(Math.min(1, e / 600));
        place(climbX, floorY - lerp(0, 6, k));
        poseTo({
          leftArm: lerp(0, -122, k),
          rightArm: lerp(0, 122, k),
          gazeX: 0,
          gazeY: -0.8,
        });
        if (k >= 1) next("grip");
      } else if (phase === "grip") {
        const k = easeInOut(Math.min(1, e / 800));
        place(climbX, lerp(floorY - 6, floorY - 44, k));
        poseTo({
          leftArm: lerp(-122, -100, k),
          rightArm: lerp(122, 100, k),
          leftLeg: lerp(0, 18, k),
          rightLeg: lerp(0, 18, k),
        });
        if (k >= 1) next("mantle");
      } else if (phase === "mantle") {
        const k = easeInOut(Math.min(1, e / 800));
        place(climbX, lerp(floorY - 44, finalY, k));
        poseTo({
          leftArm: lerp(-100, -26, k),
          rightArm: lerp(100, 26, k),
          leftLeg: lerp(18, 0, easeOut(k)),
          rightLeg: lerp(18, 0, easeOut(k)),
        });
        if (k >= 1) {
          poseTo({ leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 });
          next("perch");
        }
      } else if (phase === "perch") {
        place(climbX, finalY);
        poseTo({
          rightArm: -28 + Math.sin(e / 45) * 18,
          leftArm: 0,
          leftLeg: 0,
          rightLeg: 0,
          gazeX: 0,
          gazeY: 0,
        });
        if (e > 300 && !saidAuth) {
          saidAuth = true;
          setBubble("allow me to authenticate you", 1500);
        }
        if (e >= 1700) {
          poseTo({ rightArm: 0 });
          startAuth();
          next("auth");
        }
      } else if (phase === "auth") {
        place(climbX, finalY);
        poseTo({
          eyeScale: lerp(1, 0.06, Math.min(1, e / 350)),
          gazeX: 0,
          gazeY: 0,
        });
        if (authResolved && e >= 700) {
          setAuthPose(false);
          if (authResult?.ok) {
            flashAuthSuccess();
            next("hello");
          } else {
            finish(authResult);
            return;
          }
        }
      } else if (phase === "hello") {
        place(climbX, finalY);
        poseTo({ eyeScale: lerp(0.06, 1, Math.min(1, e / 350)) });
        if (!saidHello && (firstName || e > 900)) {
          saidHello = true;
          setBubble(`hello, ${firstName || "there"}`, 1500);
        }
        if (e >= 1700) {
          finish(authResult || { ok: true });
          return;
        }
      }
      raf = window.requestAnimationFrame(step);
    };

    raf = window.requestAnimationFrame(step);
  });
}

async function runStartupSequence(config = {}) {
  startupActive = true;
  try {
    applyDisplayMetrics(config.displayMetrics);
    movementMode = "dock";
    setStatus("connecting", "Starting");
    // He is born from the notch: closed eyes fade in → authenticate (~1s,
    // green or red verdict) → eyes open. Silent boot — no spoken greeting, no
    // auto voice session; Double-Control starts realtime. He STAYS home until
    // summoned by voice.
    const authResult = await runNotchBoot();
    logRenderer("startup.auth.result", {
      ok: Boolean(authResult?.ok),
      source: authResult?.source || "unknown",
      error: authResult?.error || null,
    });
    await runNotchGreeting(authResult);
    notchBootDone = true;
    lastEngagedAt = Date.now(); // awake + ambient from birth
    updateNotchFace();

    if (authResult?.ok) {
      setStatus("ready", "Ready");
    } else {
      setStatus("error", "Auth needed");
      setBubble(`Sign-in did not finish: ${authResult?.error || "try again when the browser page opens."}`, 4200);
    }

    await wait(900);
    let trusted = Boolean(config.accessibilityTrusted);
    if (!trusted) {
      const requested = await window.brainoMac.requestAccessibility().catch(() => null);
      trusted = Boolean(requested?.accessibilityTrusted);
    }

    if (!trusted) {
      setStatus("ready", "Grant Accessibility for double Control");
      setBubble("Give Braino Accessibility permission so double Control works cleanly.", 3400);
    } else if (authResult?.ok) {
      setStatus("ready", "Ready");
    }

    pickRoamTarget();
  } finally {
    startupActive = false;
  }
}

function handleDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  event.preventDefault();
  setPosition(event.clientX - dragState.offsetX, event.clientY - dragState.offsetY);
  targetX = posX;
  targetY = posY;
  nextTargetAt = performance.now() + 2200;
  updateFloatingUi();
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  try { walker.releasePointerCapture(event.pointerId); } catch (_) {}
  walker.classList.remove("dragging");
  dragState = null;
  const dock = getDockBounds();
  if (posY >= dock.snapThresholdY) {
    movementMode = "dock";
    setPosition(posX, dock.y);
    targetX = posX + dirX * 280;
    targetY = dock.y;
  } else {
    movementMode = "free";
  }
  nextTargetAt = performance.now() + 2600;
  setBubble(movementMode === "dock" ? "Back on the Dock." : "Parked here. I can still walk around.", 1600);
  refreshMousePassthrough(event);
}

walker.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dragState = {
    pointerId: event.pointerId,
    offsetX: event.clientX - posX,
    offsetY: event.clientY - posY,
  };
  setMousePassthrough(false);
  walker.classList.add("dragging");
  walker.setPointerCapture(event.pointerId);
  setBubble("Drag me anywhere.", 1200);
});

walker.addEventListener("pointermove", handleDragMove);
walker.addEventListener("pointerup", endDrag);
walker.addEventListener("pointercancel", endDrag);
walker.addEventListener("dblclick", (event) => {
  event.preventDefault();
  event.stopPropagation();
  dragState = null;
  walker.classList.remove("dragging");
  setBrainoCustomizerOpen(!brainoCustomizerOpen);
});

brainoSizeRange.addEventListener("input", (event) => {
  setBrainoScale(event.currentTarget.value);
});

brainoSizeReset.addEventListener("click", () => {
  setBrainoScale(BRAINO_SCALE_MIN);
});

brainoCustomizerDone.addEventListener("click", () => {
  setBrainoCustomizerOpen(false);
});

window.addEventListener("mousemove", refreshMousePassthrough, { passive: true });
window.addEventListener("mouseleave", () => setMousePassthrough(true), { passive: true });
window.addEventListener("resize", () => {
  if (movementMode === "dock") {
    const dock = getDockBounds();
    setPosition(posX, dock.y);
    targetY = dock.y;
  }
  setPosition(posX, posY);
  targetX = clamp(targetX, getMoveBounds().minX, getMoveBounds().maxX);
  targetY = clamp(targetY, getMoveBounds().minY, getMoveBounds().maxY);
  updateFloatingUi();
  positionBrainoCustomizer();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && brainoCustomizerOpen) {
    setBrainoCustomizerOpen(false);
    return;
  }
  if (event.key !== "Control") return;
  const now = Date.now();
  if (now - lastLocalControlTap < 520) toggleVoice();
  lastLocalControlTap = now;
});
window.addEventListener("beforeunload", () => stopRealtimeVoice());

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = (now - start) / 1000;
  const shouldHoldAttention = listening || realtimeConnecting || processing || speaking;
  let walkingNow = false;

  if (!dragState && scriptedWalk) {
    const dx = scriptedWalk.x - posX;
    const dy = scriptedWalk.y - posY;
    const dist = Math.max(0.01, Math.hypot(dx, dy));
    const step = Math.min(dist, scriptedWalk.speed * dt);
    setPosition(
      posX + (dx / dist) * step,
      posY + (dy / dist) * step,
      { allowOffscreen: scriptedWalk.allowOffscreen }
    );
    if (Math.abs(dx) > 0.25) dirX = dx >= 0 ? 1 : -1;
    walkingNow = step > 0.05 && dist > 0.5;
    if (dist <= 2.5) {
      const resolve = scriptedWalk.resolve;
      scriptedWalk = null;
      walkingNow = false;
      resolve();
    }
  } else if (!dragState && !shouldHoldAttention && !skitMoonwalk) {
    if (movementMode === "dock") {
      targetY = getDockBounds().y;
    }
    const distance = Math.hypot(targetX - posX, targetY - posY);
    if (distance < 5 || now > nextTargetAt) pickRoamTarget(now);
    const speed = 76;
    const dx = targetX - posX;
    const dy = targetY - posY;
    const dist = Math.max(0.01, Math.hypot(dx, dy));
    const step = Math.min(dist, speed * dt);
    setPosition(posX + (dx / dist) * step, posY + (dy / dist) * step);
    if (Math.abs(dx) > 0.25) dirX = dx >= 0 ? 1 : -1;
    walkingNow = step > 0.05 && dist > 0.5;
  }

  walker.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
  const engaged = listening || realtimeConnecting || processing || speaking || authPose;
  // skitMoonwalk locks him facing forward while he glides backwards — the moonwalk.
  walkerFlip.style.transform = `scaleX(${(engaged || skitMoonwalk) ? 1 : dirX}) scale(${brainoScale})`;
  if (brainoCustomizerOpen) positionBrainoCustomizer();
  updateFloatingUi();

  if (startupPose) {
    const pose = startupPose;
    const laEl = q("#__sbwk_la__"), raEl = q("#__sbwk_ra__");
    const lArmPivot = pivotOf(laEl, 22, 53), rArmPivot = pivotOf(raEl, 78, 53);
    const leftArmTransform = pose.leftArm ? `rotate(${pose.leftArm} ${lArmPivot.x} ${lArmPivot.y})` : "";
    const rightArmTransform = pose.rightArm ? `rotate(${pose.rightArm} ${rArmPivot.x} ${rArmPivot.y})` : "";
    root?.setAttribute(
      "transform",
      `rotate(${pose.rootRot || 0} 50 50) translate(0 ${pose.rootY || 0}) scale(${pose.rootScale || 1})`
    );
    q("#__sbwk_ll__")?.setAttribute("transform", pose.leftLeg ? `rotate(${pose.leftLeg} 44 74)` : "");
    q("#__sbwk_rl__")?.setAttribute("transform", pose.rightLeg ? `rotate(${pose.rightLeg} 56 74)` : "");
    q("#__sbwk_la_bg__")?.setAttribute("transform", leftArmTransform);
    q("#__sbwk_la__")?.setAttribute("transform", leftArmTransform);
    q("#__sbwk_ra_bg__")?.setAttribute("transform", rightArmTransform);
    q("#__sbwk_ra__")?.setAttribute("transform", rightArmTransform);
    const leEl = q("#__sbwk_eye_l__"), reEl = q("#__sbwk_eye_r__");
    const lEyePivot = pivotOf(leEl, 38, 48), rEyePivot = pivotOf(reEl, 62, 48);
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(${lEyePivot.x},${lEyePivot.y}) scale(1,${pose.eyeScale || 1}) translate(${-lEyePivot.x},${-lEyePivot.y})`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(${rEyePivot.x},${rEyePivot.y}) scale(1,${pose.eyeScale || 1}) translate(${-rEyePivot.x},${-rEyePivot.y})`);
    q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${pose.gazeX || 0} ${pose.gazeY || 0})`);
    q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${pose.gazeX || 0} ${pose.gazeY || 0})`);
  } else {
    const s = t * 4.5;
    const leftPhase = Math.sin(s);
    const rightPhase = Math.sin(s + Math.PI);
    const walkAmount = walkingNow ? 1 : 0;
    const leftLift = Math.max(0, leftPhase) * 5 * walkAmount;
    const rightLift = Math.max(0, rightPhase) * 5 * walkAmount;
    const leftSwing = Math.max(0, leftPhase) * 8 * walkAmount;
    const rightSwing = Math.max(0, rightPhase) * 8 * walkAmount;
    const waddle = Math.sin(s) * 3.4 * walkAmount;
    const walkBob = (-Math.abs(Math.sin(s)) * 2 - 0.4) * walkAmount;
    const breath = 1 + 0.014 * Math.sin(t * 1.7);
    const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
    const blinkPhase = t % 3.4;
    const blink = blinkPhase < 0.13 ? Math.sin((blinkPhase / 0.13) * Math.PI) : 0;
    const eyeScale = authPose ? 0.07 : Math.max(0.06, 1 - blink);
    const rightArmAngle = waving ? (-28 + Math.sin(t * 11) * 16) : 0;

    root?.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
    q("#__sbwk_ll__")?.setAttribute("transform", `translate(0 ${-leftLift}) rotate(${leftSwing} 44 74)`);
    q("#__sbwk_rl__")?.setAttribute("transform", `translate(0 ${-rightLift}) rotate(${rightSwing} 56 74)`);
    const raEl2 = q("#__sbwk_ra__");
    const rArmPivot2 = pivotOf(raEl2, 78, 53);
    q("#__sbwk_la_bg__")?.setAttribute("transform", "");
    q("#__sbwk_la__")?.setAttribute("transform", "");
    q("#__sbwk_ra_bg__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} ${rArmPivot2.x} ${rArmPivot2.y})` : "");
    q("#__sbwk_ra__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} ${rArmPivot2.x} ${rArmPivot2.y})` : "");
    const leEl2 = q("#__sbwk_eye_l__"), reEl2 = q("#__sbwk_eye_r__");
    const lEyePivot2 = pivotOf(leEl2, 38, 48), rEyePivot2 = pivotOf(reEl2, 62, 48);
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(${lEyePivot2.x},${lEyePivot2.y}) scale(1,${eyeScale}) translate(${-lEyePivot2.x},${-lEyePivot2.y})`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(${rEyePivot2.x},${rEyePivot2.y}) scale(1,${eyeScale}) translate(${-rEyePivot2.x},${-rEyePivot2.y})`);

    const gaze = (engaged || !walkingNow) ? 0 : 2.4;
    q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${gaze} 0)`);
    q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${gaze} 0)`);
  }

  updateTalkMotion(t, speaking);

  requestAnimationFrame(tick);
}

let pointRing = null;
let pointReturnTimer = 0;

function ensurePointRing() {
  if (pointRing) return pointRing;
  pointRing = document.createElement("div");
  pointRing.id = "point-ring";
  document.body.appendChild(pointRing);
  return pointRing;
}

async function pointAtScreen(payload) {
  if (herMode) return;
  const nx = Number(payload?.x);
  const ny = Number(payload?.y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;
  const tx = clamp(nx, 0, 1) * window.innerWidth;
  const ty = clamp(ny, 0, 1) * window.innerHeight;

  window.clearTimeout(pointReturnTimer);
  movementMode = "free";
  // Stand beside the target, feet slightly below it, so the raised arm lands on it.
  const standX = clamp(tx + (tx > window.innerWidth / 2 ? -(W + 42) : 42), 8, window.innerWidth - W - 8);
  const standY = clamp(ty + 20, 8, window.innerHeight - H - 8);
  logRenderer("point.walk", { tx: Math.round(tx), ty: Math.round(ty), label: payload?.label || "" });
  await new Promise((resolve) => {
    scriptedWalk = { x: standX, y: standY, speed: 340, resolve };
  });
  dirX = tx >= posX + W / 2 ? 1 : -1;
  setWave(true);
  const ring = ensurePointRing();
  ring.style.left = `${tx}px`;
  ring.style.top = `${ty}px`;
  ring.classList.add("show");
  if (payload?.label) setBubble(payload.label, 3200);
  window.setTimeout(() => pointRing?.classList.remove("show"), 6500);
  // After the moment passes, drift back to Dock life.
  pointReturnTimer = window.setTimeout(() => {
    movementMode = "dock";
    pickRoamTarget();
  }, 14000);
}

window.brainoMac.onVoiceToggle(() => toggleVoice());
window.brainoMac.onCursorMode?.((payload) => {
  cursorModeContext = payload || null;
});
void window.brainoMac.cursorModeState?.().then((payload) => {
  cursorModeContext = payload || null;
}).catch(() => {});
window.brainoMac.onCursorTaskComplete?.((payload) => {
  const files = Array.isArray(payload?.changedFiles) ? payload.changedFiles.slice(0, 3) : [];
  const detail = files.length ? ` I saw updates in ${files.join(", ")}.` : "";
  const line = `Hey, your task is over. Please take a look.${detail}`;
  void setWalkerHomeState(false);
  setBubble(line, 6200);
  void speak(line);
});
window.brainoMac.onDictationToggle?.((payload) => toggleYapMode(payload?.source || "double Option"));
// SKIT (TEMPORARY — Instagram demo): while SKIT.enabled is on in main.cjs,
// double Option fires this fully scripted bit instead of Yap Mode. No mic,
// no LLM — fixed lines through his normal voice so every take is identical.
// v2: no texting. Beat It on Spotify, out of the notch, BIG, dancing, reset.
// Delete this block together with the main.cjs/preload skit pieces.
let skitRunning = false;
let skitMoonwalk = false;
let skitMoonRaf = 0;

// Verbatim port of the Chrome extension's __sbWkMoonwalk (extension/content.js
// lines 4228-4292): the hidden __sbwk_moonlegs__ rig replaces the normal legs so
// both feet point the SAME way, each foot pops onto its toe (heel to 42 degrees
// at pivot 24,101) while the other slides 10px on phase sin(t*4.0), the body
// GLIDES BACKWARD continuously with the exact waddle/bob/breath root motion, MJ
// fedora on, pupils leading the facing (0.95). Root/pupil/eye channels ride
// tick's startupPose branch, whose formulas match Chrome's exactly; the moonleg
// groups are never touched by tick, so this rAF drives them directly.
function skitPerformMoonwalk(durationMs = 15000) {
  return new Promise((resolve) => {
    const moonlegs = q("#__sbwk_moonlegs__");
    const mwR = q("#__sbwk_mw_r__"), mwRh = q("#__sbwk_mw_rh__");
    const mwL = q("#__sbwk_mw_l__"), mwLh = q("#__sbwk_mw_lh__");
    if (!moonlegs || !mwR || !mwL) { resolve(); return; }
    q("#__sbwk_ll__")?.setAttribute("display", "none");
    q("#__sbwk_rl__")?.setAttribute("display", "none");
    moonlegs.setAttribute("display", "inline");
    q("#__sbwk_fedora__")?.setAttribute("display", "inline");
    const floorY = posY;
    const X0 = getMoveBounds().maxX;
    const wrapSpan = X0 - START_OFFSCREEN_X;   // glide fully off-screen, then wrap (Chrome: laneW + W)
    const SPEED = 80 * brainoScale;            // Chrome's 80 px/s, scaled with his size so the glide reads identically
    const start = performance.now();
    const step = (now) => {
      const t = (now - start) / 1000;
      const x = X0 - ((t * SPEED) % wrapSpan);
      setPosition(x, floorY, { allowOffscreen: true });
      const ph = Math.sin(t * 4.0);
      const heelR = Math.max(0, ph) * 42, heelL = Math.max(0, -ph) * 42;
      const slideR = Math.max(0, -ph) * 10, slideL = Math.max(0, ph) * 10;
      mwR.setAttribute("transform", `translate(${12 + slideR} 0)`);
      mwRh?.setAttribute("transform", `rotate(${-heelR} 24 101)`);
      mwL.setAttribute("transform", `translate(${slideL} 0)`);
      mwLh?.setAttribute("transform", `rotate(${-heelL} 24 101)`);
      const waddle = ph * 1.0;
      const walkBob = -Math.abs(ph) * 1.0 - 0.3;
      const breath = 1 + 0.014 * Math.sin(t * 1.7);
      const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
      setStartupPose({ rootRot: waddle, rootY: bob + walkBob, rootScale: breath, gazeX: 0.95, gazeY: 0, eyeScale: 1 });
      if (now - start < durationMs && skitRunning) {
        skitMoonRaf = requestAnimationFrame(step);
      } else {
        skitEndMoonwalk();
        resolve();
      }
    };
    skitMoonRaf = requestAnimationFrame(step);
  });
}

// Exact mirror of Chrome's __sbWkEndMoonwalk restore sequence.
function skitEndMoonwalk() {
  if (skitMoonRaf) { cancelAnimationFrame(skitMoonRaf); skitMoonRaf = 0; }
  q("#__sbwk_fedora__")?.setAttribute("display", "none");
  q("#__sbwk_moonlegs__")?.setAttribute("display", "none");
  q("#__sbwk_ll__")?.setAttribute("display", "inline");
  q("#__sbwk_rl__")?.setAttribute("display", "inline");
  q("#__sbwk_pupil_l__")?.setAttribute("transform", "translate(0 0)");
  q("#__sbwk_pupil_r__")?.setAttribute("transform", "translate(0 0)");
  setStartupPose(null);
}
async function runSkit() {
  if (skitRunning) return;
  skitRunning = true;
  const prevScale = brainoScale;
  try {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    await speak("Hi. I am Braino. And I am the only AI in both human and AI history ever to do the moonwalk. Watch.");
    const played = await window.brainoMac.skitStep?.("play");
    if (!played?.ok) {
      await speak(played?.say || "Spotify did not cooperate. Take two.");
      return;
    }
    // Billie Jean lands at 3:31 — THE moonwalk moment, same cue as the Chrome
    // trick. Isolated demo: no music theatrics, no headphones, no auto-home.
    // He takes the stage grown to 2.6x and moonwalks for ~15 seconds.
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    await setWalkerHomeState(false);
    setBrainoScale(Math.min(BRAINO_SCALE_MAX, 2.6), false);
    // Enter stage right along his real floor, then the verbatim Chrome moonwalk.
    const floor = getDockBounds();
    skitMoonwalk = true;
    await walkTo(getMoveBounds().maxX, floor.y, { speed: 340 });
    await skitPerformMoonwalk(15000);
    skitMoonwalk = false;
    setBrainoScale(prevScale, false);
    await setWalkerHomeState(true);
    await window.brainoMac.skitStep?.("close");
  } catch (_) {
  } finally {
    skitEndMoonwalk();
    skitMoonwalk = false;
    setBrainoScale(prevScale, false);
    if (musicMode) setMusicMode(false);
    skitRunning = false;
  }
}
window.brainoMac.onSkitStart?.(() => { void runSkit(); });
window.brainoMac.onHerToggle?.(() => toggleHerMode());
window.brainoMac.onPointAt?.((payload) => { void pointAtScreen(payload); });
let allOpenTabs = [];
window.brainoMac.onTabsSnapshot?.((payload) => {
  allOpenTabs = Array.isArray(payload?.tabs) ? payload.tabs : [];
});
window.brainoMac.onMusicState?.((payload) => {
  lastMusicInfo = {
    track: String(payload?.track || ""),
    artist: String(payload?.artist || ""),
    source: String(payload?.source || ""),
  };
  lightShow.tempo = Number.isFinite(payload?.tempo) && payload.tempo > 40 && payload.tempo < 220 ? payload.tempo : null;
  lightShow.energy = Number.isFinite(payload?.energy) ? payload.energy : null;
  lightShow.valence = Number.isFinite(payload?.valence) ? payload.valence : null;
  mediaAudioPlaying = Boolean(payload?.playing);
  setMusicMode(Boolean(payload?.playing));
});
window.brainoMac.onWalkerToggle?.(() => toggleWalkerHome());
window.brainoMac.onSummon?.(() => { void handleSummon(); });
window.brainoMac.onSummonToggle?.(() => { void handleSummonToggle(); });
window.brainoMac.onSummonHome?.(() => { void handleSummonHome(); });
// Live captions in the notch during VOICE were removed (they fed back on his
// own audio and churned). The notch "heard" text now comes purely from
// OpenAI's authoritative transcript. The on-device caption helper survives
// ONLY as the meeting recorder's transcript feed — its output goes to the
// meeting panel via the "meeting" channel, never to the notch during a chat.

window.brainoMac.onXStats?.((payload) => {
  nfXStats = {
    followers: payload?.followers ?? 0,
    delta7d: payload?.delta7d ?? null,
    mentions: payload?.mentions ?? 0,
    likes: payload?.likes ?? null,
    at: Date.now(),
    panelUntil: payload?.panel ? Date.now() + 22 * 1000 : 0,
  };
  updateNotchFace();
});
window.brainoMac.onWakeStatus?.((payload) => {
  wakeWordArmed = Boolean(payload?.armed);
  updateNotchFace();
  if (payload?.unavailable) {
    logRenderer("wakeword.unavailable", { reason: payload?.reason || "" });
  }
});
window.brainoMac.onWakeDetected?.((payload) => {
  // The wake phrase was heard ON-DEVICE (BrainoWakeWord.swift requires
  // requiresOnDeviceRecognition=true) — nothing about it was sent anywhere.
  // Only NOW does a real (cloud, paid) realtime session open, exactly like
  // pressing double-Control by hand.
  logRenderer("wakeword.wake", { transcriptChars: String(payload?.transcript || "").length });
  if (!realtimeActive && !realtimeConnecting && !processing) void startListening();
});
window.brainoMac.onTimers?.((payload) => {
  nfTimers = Array.isArray(payload?.timers) ? payload.timers : [];
  updateNotchFace();
});
window.brainoMac.onTimerFired?.((payload) => {
  notchFace?.classList.add("nf-flash");
  window.setTimeout(() => notchFace?.classList.remove("nf-flash"), 2600);
  if (payload?.kind === "alarm") nfStartAlarmRing(String(payload.label || "alarm"));
  updateNotchFace();
});
window.brainoMac.onStopwatch?.((payload) => {
  nfStopwatch = {
    on: Boolean(payload?.on),
    running: Boolean(payload?.running),
    accumMs: Number(payload?.accumMs) || 0,
    startedAt: Number(payload?.startedAt) || 0,
  };
  updateNotchFace();
  nfRenderTimers();
});
window.brainoMac.onAlarmDismiss?.(() => nfStopAlarmRing("voice"));
window.brainoMac.onCalendarNext?.((payload) => {
  nfCalendarNext = payload?.next || null;
  updateNotchFace();
});
window.brainoMac.onWaBadge?.((payload) => {
  nfWaBadge = { count: Number(payload?.count) || 0, sender: String(payload?.sender || "") };
  updateNotchFace();
});
window.brainoMac.onNotchFace?.((payload) => setNotchFaceEnabled(Boolean(payload?.on)));
window.brainoMac.onSpeakLine?.((payload) => {
  const text = String(payload?.text || "").trim();
  // Incoming message readouts wait their turn instead of cutting Braino off.
  if (text && !speaking && !processing) void speak(text);
  else if (text) window.setTimeout(() => { if (!speaking && !processing) void speak(text); }, 4000);
});
window.brainoMac.onAuthRequired(() => {
  setAuthPose(true);
  setStatus("connecting", "Authenticating");
  setBubble("allow me to authenticate you", 2600);
  setWave(true);
});
window.brainoMac.onTaskProgress((progress) => {
  // explicit caption clear — lets a finished step settle the notch back to the
  // compact arch immediately instead of waiting out the 6s auto-clear.
  if (progress.clearNotch) { try { nfSetThinking(""); } catch (_) {} return; }
  if (progress.status) setStatus(progress.status, progress.text || progress.status);
  if (progress.text) {
    if (walkerHome && notchFaceEnabled && !herMode) nfSetThinking(progress.text);
    else setBubble(progress.text, 1200);
  }
});
// Voice Commands: a mode turning on/off retints the notch for as long as it runs, and flashes a
// "<name> activated" caption that fades — no full reboot, just the color + the one beat.
// "#ff0000" / "#f00" -> "255, 0, 0" for the rgba() boot pulse.
function hexToRgbTriplet(hex) {
  const h = String(hex || "").trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

window.brainoMac.onVoiceMode((payload) => {
  activeVoiceMode = payload.active ? { name: payload.name, color: payload.color } : null;
  try { updateEdgeGlow(); } catch (_) {}
  if (!notchFace) return;
  if (payload.active) {
    const color = payload.color || "#0A84FF";
    notchFace.style.setProperty("--nf-mode-color", color);
    // The colour picked on the dashboard drives the boot glow itself, not just
    // a static tint — entering the mode replays the boot animation in it.
    const triplet = hexToRgbTriplet(color);
    if (triplet) notchFace.style.setProperty("--nf-boot-color", triplet);
    notchFace.classList.add("nf-voice-mode");
    notchFace.classList.remove("nf-mode-boot");
    void notchFace.offsetWidth;            // restart the animation
    notchFace.classList.add("nf-mode-boot");
    clearTimeout(notchFace.__nfModeBootTimer);
    notchFace.__nfModeBootTimer = setTimeout(() => notchFace.classList.remove("nf-mode-boot"), 1200);
  } else {
    notchFace.classList.remove("nf-voice-mode", "nf-mode-boot");
    notchFace.style.removeProperty("--nf-mode-color");
    notchFace.style.removeProperty("--nf-boot-color");
  }
  const cap = notchFace.querySelector(".nf-cap-l");
  if (!cap) return;
  notchFace.classList.add("captioning");
  cap.textContent = payload.active ? `${payload.name} activated` : `${payload.name || "Mode"} off`;
  clearTimeout(notchFace.__nfModeCapTimer);
  notchFace.__nfModeCapTimer = setTimeout(() => {
    cap.textContent = "";
    notchFace.classList.remove("captioning");
  }, 1800);
});
window.brainoMac.onSpeechTranscript((speech) => {
  if (speech.status === "ready") {
    setStatus("listening", "Listening");
    return;
  }
  if (speech.status === "partial" && speech.text) {
    if (walkerHome) nfSetHeard(speech.text);
    else setBubble(speech.text, 0);
  }
});
window.brainoMac.onHelperStatus((status) => {
  const line = status?.line || "";
  if (startupActive) {
    logRenderer("helper.status.deferred", { line, type: status?.type || "" });
    return;
  }
  if (line === "braino-control-tap-ready") {
    setStatus("ready", "Ready");
    return;
  }
  if (line === "needs-accessibility" || line === "event-tap-unavailable") {
    setStatus("ready", "Grant Accessibility for double Control");
  }
  if (status.type === "swift-error") {
    setStatus("ready", "Control+Space ready");
  }
});
window.brainoMac.onOverlayContext((payload) => {
  const previousDisplayId = displayMetrics?.id || null;
  if (payload?.activeContext) activeMacContext = payload.activeContext;
  if (payload?.displayMetrics) {
    applyDisplayMetrics(payload.displayMetrics, {
      displayChanged: Boolean(previousDisplayId && payload.displayMetrics.id && previousDisplayId !== payload.displayMetrics.id),
    });
  }
  if (!startupActive) scheduleRealtimeSurfaceSync(payload?.reason || "overlay_context");
});

window.brainoMac.getConfig().then(async (config) => {
  if (config?.activeContext) activeMacContext = config.activeContext;
  if (config?.mascot) setMascotChoice(config.mascot, { save: false, remount: false });
  if (config?.dictation?.active) {
    await window.brainoMac.dictationControl({
      action: "stop",
      reason: "renderer_reloaded",
    }).catch(() => {});
  }
  logRenderer("app.config", {
    appVersion: config?.appVersion,
    dockTop: config?.displayMetrics?.dockTop || null,
    dockHeight: config?.displayMetrics?.dockHeight || null,
    supabaseConfigured: Boolean(config?.supabaseConfigured),
    realtimeConfigured: Boolean(config?.realtimeConfigured),
    realtimeAuthSource: config?.realtimeAuthSource || "unknown",
    activeApp: config?.activeContext?.appName || "",
    activeTitle: config?.activeContext?.browserTitle || config?.activeContext?.windowTitle || "",
    accessibilityTrusted: Boolean(config?.accessibilityTrusted),
    microphoneStatus: config?.microphoneStatus || "unknown",
    dictationModel: config?.dictation?.model || "",
    logPath: config?.logPath || "",
  });
  await refreshDelegateState();
  void refreshPersonaBundle();
  await runStartupSequence(config || {});
}).catch((error) => {
  logRenderer("app.config.error", { error: errorForLog(error) });
  walker.classList.add("visible");
  setStatus("error", "Startup error");
  setBubble(`Startup error: ${error?.message || "Braino could not load config."}`, 4200);
});

setPosition(posX, posY, { allowOffscreen: true });
pickRoamTarget();
requestAnimationFrame(tick);

// ══════════════════ Notch tray: the island is touchable now ══════════════════
// Hover near the notch (the main process watches the real cursor, so this
// works even mid-file-drag) → the island springs open into a black-glass tray:
// now playing with artwork + transport, next calendar event with one-click
// Join & record, live timers, battery + headphones, quick actions, and a
// dropped-file shelf Braino can act on. Click the collapsed notch = talk.
// Scroll on it = system volume.

const nfPill = notchFace?.querySelector(".nf-pill");
const nfTrayEl = notchFace?.querySelector(".nf-tray");
// Phase one is deliberately just the core island. Keep the complete legacy
// media/calendar/power tray mounted for later, but do not let hover hand
// geometry ownership to it while the caption + cognition motion is tuned.
const NF_LEGACY_TRAY_VISIBLE = false;
let nfExpanded = false;
let nfExpandTimer = 0;
let nfCollapseTimer = 0;
let nfZoneInsideMain = false;
let nfDropDepth = 0;
let nfNowPlaying = null;
let nfNowPlayingAt = 0;
let nfPowerState = null;
let nfBtDevices = [];
let nfShelf = []; // [{ path, name }]
let nfShelfAskPath = "";
let nfLowBatterySpoken = false;
let nfVolHideTimer = 0;
let nfVolPending = 0;
let nfVolBusy = false;

function nfPointInNotchZone(x, y) {
  if (!notchFace?.classList.contains("on") || herMode || !nfPill) return false;
  const rect = nfPill.getBoundingClientRect();
  // Collapsed: the pill itself, nearly edge-to-edge — a padded zone was
  // stealing clicks from Chrome tabs that sit beside/below the housing.
  const pad = nfExpanded || nfDropDepth > 0 ? 26 : 4;
  return x >= rect.left - pad && x <= rect.right + pad && y <= rect.bottom + pad;
}

function nfShelfCount() {
  return nfShelf.length;
}

// Injects held-file context into a delegate prompt: an armed chip mic wins,
// otherwise words that point at "this file / that pdf / the screenshot".
function nfShelfWrapPrompt(text) {
  const words = String(text || "");
  if (nfShelfAskPath) {
    const held = nfShelfAskPath;
    nfShelfAskPath = "";
    return `About the file at ${held}: ${words}`;
  }
  if (!nfShelf.length) return words;
  if (/\b(?:this|that|the)\s+(?:file|pdf|doc(?:ument)?|image|photo|picture|video|screenshot|one)\b/i.test(words)) {
    return `About the file at ${nfShelf[nfShelf.length - 1].path}: ${words}`;
  }
  return words;
}

function nfTrayExpand() {
  if (!NF_LEGACY_TRAY_VISIBLE) return;
  if (nfExpanded || herMode || !notchFace?.classList.contains("on")) return;
  nfExpanded = true;
  notchFace.classList.add("expanded");
  window.brainoMac.setNotchZone?.({ expanded: true });
  nfRenderTray();
  logRenderer("tray.expand", {});
}

function nfTrayCollapse() {
  if (!nfExpanded) return;
  nfExpanded = false;
  notchFace?.classList.remove("expanded");
  window.brainoMac.setNotchZone?.({ expanded: false });
  logRenderer("tray.collapse", {});
}

// Called from updateNotchFace on every state change: keeps the tray honest
// (action button states, timers, calendar) and folds it when the face hides.
function nfTraySyncFromState(visible) {
  if (!NF_LEGACY_TRAY_VISIBLE) {
    window.clearTimeout(nfExpandTimer);
    window.clearTimeout(nfCollapseTimer);
    nfExpandTimer = 0;
    nfCollapseTimer = 0;
    if (nfExpanded) nfTrayCollapse();
    notchFace?.classList.remove("expanded", "has-shelf");
    return;
  }
  if ((!visible || herMode) && nfExpanded) nfTrayCollapse();
  if (!nfExpanded || !nfTrayEl) return;
  nfRenderCalendar();
  nfRenderTimers();
}

// ── Zone events from the main process (real cursor position, drag-proof) ──
window.brainoMac.onNotchZone?.((payload) => {
  nfZoneInsideMain = Boolean(payload?.inside);
  if (nfZoneInsideMain) {
    if (!herMode) setMousePassthrough(false);
    window.clearTimeout(nfCollapseTimer);
    nfCollapseTimer = 0;
    if (!NF_LEGACY_TRAY_VISIBLE) {
      window.clearTimeout(nfExpandTimer);
      nfExpandTimer = 0;
      if (nfExpanded) nfTrayCollapse();
      return;
    }
    if (!nfExpanded && !nfExpandTimer) {
      nfExpandTimer = window.setTimeout(() => {
        nfExpandTimer = 0;
        if (nfZoneInsideMain) nfTrayExpand();
      }, 340);
    }
  } else {
    window.clearTimeout(nfExpandTimer);
    nfExpandTimer = 0;
    if (nfDropDepth > 0) {
      nfDropDepth = 0;
      notchFace?.classList.remove("dropping");
    }
    if (NF_LEGACY_TRAY_VISIBLE && nfExpanded && !nfCollapseTimer) {
      nfCollapseTimer = window.setTimeout(() => {
        nfCollapseTimer = 0;
        if (!nfZoneInsideMain) nfTrayCollapse();
      }, 380);
    }
    if (!dragState && !herMode) setMousePassthrough(true);
  }
});

// ── Click the notch = talk. Handled at the DOCUMENT level for the whole
// notch zone, not just the pill: the pill's top half hides behind the
// physical housing and its visible chin is a ~22px sliver, so pill-only
// clicks felt dead. Any click in the zone counts (buttons and the tray keep
// their own handlers); expanded tray = only the eye band toggles voice. ──
document.addEventListener("click", (event) => {
  if (event.target.closest(".nf-tray") || event.target.closest("button")) return;
  if (event.target.closest("#walker") || event.target.closest("#meeting-panel")) return;
  if (!nfPointInNotchZone(event.clientX, event.clientY)) return;
  if (nfAlarmRinging) {
    nfStopAlarmRing("tap");
    return;
  }
  if (nfExpanded && nfPill) {
    const rect = nfPill.getBoundingClientRect();
    const bandBottom = rect.top + (parseFloat(getComputedStyle(notchFace).getPropertyValue("--nf-notch-h")) || 33) + 34;
    if (event.clientY > bandBottom) return;
  }
  logRenderer("tray.click_talk", { expanded: nfExpanded });
  notchFace?.classList.add("nf-press");
  window.setTimeout(() => notchFace?.classList.remove("nf-press"), 170);
  toggleVoice();
});

// ── Scroll on the island: system output volume, with a tiny HUD. ──
async function nfFlushVolumeDelta() {
  if (nfVolBusy || !nfVolPending) return;
  nfVolBusy = true;
  const delta = nfVolPending;
  nfVolPending = 0;
  try {
    const result = await window.brainoMac.systemVolume?.({ delta });
    if (result?.ok) nfShowVolumeHud(result.volume);
  } finally {
    nfVolBusy = false;
    if (nfVolPending) void nfFlushVolumeDelta();
  }
}

function nfShowVolumeHud(volume) {
  const hud = notchFace?.querySelector(".nf-volume");
  if (!hud) return;
  hud.style.setProperty("--nf-vol", `${Math.max(0, Math.min(100, volume))}%`);
  const num = hud.querySelector(".nf-vol-num");
  if (num) num.textContent = String(Math.round(volume));
  notchFace.classList.add("vol");
  window.clearTimeout(nfVolHideTimer);
  nfVolHideTimer = window.setTimeout(() => notchFace?.classList.remove("vol"), 1100);
}

document.addEventListener("wheel", (event) => {
  if (!nfPointInNotchZone(event.clientX, event.clientY)) return;
  event.preventDefault();
  const step = event.deltaY > 0 ? -3 : 3;
  nfVolPending += step;
  void nfFlushVolumeDelta();
}, { passive: false });

// ── Now playing ──
window.brainoMac.onNowPlaying?.((payload) => {
  const next = payload?.track ? payload : null;
  const changed = JSON.stringify(next) !== JSON.stringify(nfNowPlaying);
  nfNowPlaying = next;
  nfNowPlayingAt = Date.now();
  if (changed && nfExpanded) nfRenderNowPlaying();
});

function nfRenderNowPlaying() {
  const np = nfTrayEl?.querySelector(".nf-np");
  if (!np) return;
  const d = nfNowPlaying;
  const sourceLabel = d?.source === "spotify" ? "spotify" : d?.source === "music" ? "apple music" : d?.source === "youtube" ? "youtube" : "";
  np.querySelector(".nf-np-track").textContent = d?.track || "Nothing playing";
  np.querySelector(".nf-np-artist").textContent = d ? [d.artist, sourceLabel].filter(Boolean).join(" · ") : "";
  np.classList.toggle("playing", Boolean(d?.playing));
  np.classList.toggle("no-ctl", !d?.canControl);
  np.classList.toggle("no-bar", !(d?.durationSec > 0));
  const art = np.querySelector(".nf-np-art");
  if (art) {
    if (d?.artworkUrl) {
      art.style.setProperty("--nf-art", `url("${d.artworkUrl}")`);
      art.classList.add("has-art");
    } else {
      art.classList.remove("has-art");
      art.style.removeProperty("--nf-art");
    }
  }
  nfTickProgress();
}

function nfTickProgress() {
  const bar = nfTrayEl?.querySelector(".nf-np-bar i");
  if (!bar) return;
  const d = nfNowPlaying;
  if (!(d?.durationSec > 0) || d.positionSec == null) {
    bar.style.width = "0%";
    return;
  }
  const elapsed = d.playing ? (Date.now() - nfNowPlayingAt) / 1000 : 0;
  const pct = Math.max(0, Math.min(100, ((d.positionSec + elapsed) / d.durationSec) * 100));
  bar.style.width = `${pct}%`;
}

window.setInterval(() => {
  if (nfExpanded) nfTickProgress();
}, 1000);

for (const [selector, action] of [[".nf-prev", "previous"], [".nf-play", "toggle"], [".nf-next", "next"]]) {
  nfTrayEl?.querySelector(selector)?.addEventListener("click", () => {
    const source = nfNowPlaying?.source || "spotify";
    // Optimistic flip so the button answers instantly; the poll corrects it.
    if (action === "toggle" && nfNowPlaying) {
      nfNowPlaying.playing = !nfNowPlaying.playing;
      nfRenderNowPlaying();
    }
    logRenderer("tray.media", { action, source });
    void window.brainoMac.mediaControl?.({ action, source });
  });
}

// ── Calendar card + Join ──
function nfRenderCalendar() {
  const cal = nfTrayEl?.querySelector(".nf-cal");
  if (!cal) return;
  const next = nfCalendarNext;
  const whenEl = cal.querySelector(".nf-cal-when");
  const titleEl = cal.querySelector(".nf-cal-title");
  const joinBtn = cal.querySelector(".nf-join");
  if (!next) {
    whenEl.textContent = "today";
    titleEl.textContent = "No events coming up";
    joinBtn.hidden = true;
    return;
  }
  const start = new Date(next.startAt);
  const minutes = Math.round((next.startAt - Date.now()) / 60000);
  const clock = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
  whenEl.textContent = minutes <= 0 ? `${clock} · now` : minutes < 90 ? `${clock} · in ${minutes} min` : clock;
  titleEl.textContent = next.title || "Event";
  joinBtn.hidden = !next.joinUrl;
}

nfTrayEl?.querySelector(".nf-join")?.addEventListener("click", async () => {
  logRenderer("tray.join", { title: nfCalendarNext?.title || "" });
  nfTrayCollapse();
  const result = await window.brainoMac.calendarJoin?.();
  if (result?.say) void speak(result.say);
});

// ── Time section: alarms (clock time), timers (countdown), stopwatch row ──
function nfRenderTimers() {
  const list = nfTrayEl?.querySelector(".nf-timerlist");
  if (!list) return;
  const now = Date.now();
  const rows = [];
  const alarms = nfTimers.filter((t) => t.kind === "alarm" && t.endAt > now).sort((a, b) => a.endAt - b.endAt).slice(0, 3);
  const timers = nfTimers.filter((t) => t.kind !== "alarm" && t.endAt > now).sort((a, b) => a.endAt - b.endAt).slice(0, 3);

  const mkCancel = (id) => {
    const x = document.createElement("button");
    x.className = "t-x";
    x.title = "Cancel";
    x.textContent = "✕";
    x.addEventListener("click", () => {
      void window.brainoMac.timerCancel?.({ id });
    });
    return x;
  };
  const mkRow = (kindGlyph, labelText, rightText) => {
    const row = document.createElement("div");
    row.className = "nf-timer-row";
    const kind = document.createElement("span");
    kind.className = "t-kind";
    kind.textContent = kindGlyph;
    const label = document.createElement("span");
    label.className = "t-label";
    label.textContent = labelText;
    const count = document.createElement("span");
    count.className = "t-count";
    count.textContent = rightText;
    row.append(kind, label, count);
    return row;
  };

  for (const a of alarms) {
    const when = new Date(a.endAt);
    const clock = when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
    const row = mkRow("⏰", a.label === "alarm" ? clock : a.label, `${clock}${when.getDate() !== new Date().getDate() ? " ·tmrw" : ""}`);
    row.append(mkCancel(a.id));
    rows.push(row);
  }
  for (const t of timers) {
    const row = mkRow("⏳", t.label, fmtCountdown(t.endAt - now));
    row.append(mkCancel(t.id));
    rows.push(row);
  }
  if (nfStopwatch.on) {
    const swMs = nfStopwatch.accumMs + (nfStopwatch.running ? now - nfStopwatch.startedAt : 0);
    const row = mkRow("⏱", nfStopwatch.running ? "stopwatch" : "stopwatch · paused", fmtCountdown(swMs));
    const toggle = document.createElement("button");
    toggle.className = "t-sw";
    toggle.title = nfStopwatch.running ? "Pause" : "Resume";
    toggle.textContent = nfStopwatch.running ? "❚❚" : "▶";
    toggle.addEventListener("click", () => {
      void window.brainoMac.stopwatchControl?.({ action: nfStopwatch.running ? "pause" : "resume" });
    });
    const reset = document.createElement("button");
    reset.className = "t-sw";
    reset.title = "Reset";
    reset.textContent = "↺";
    reset.addEventListener("click", () => {
      void window.brainoMac.stopwatchControl?.({ action: "reset" });
    });
    row.append(toggle, reset);
    rows.push(row);
  }

  list.hidden = rows.length === 0;
  list.replaceChildren(...rows);
}

// ── Alarm ring: insistent chime + amber island until tapped/told to stop ──
let nfAlarmRingTimer = 0;

function nfPlayAlarmChime() {
  try {
    wakeAudioCtx = wakeAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = wakeAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    // Three quick rising notes, brighter and louder than the wake chime.
    [{ f: 880, t: 0 }, { f: 1108.73, t: 0.14 }, { f: 1318.51, t: 0.28 }].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.22, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.46);
    });
  } catch (_) {}
}

function nfStartAlarmRing(label) {
  nfAlarmRinging = { label: String(label || "alarm").slice(0, 24), until: Date.now() + 60 * 1000 };
  logRenderer("alarm.ring.start", { label: nfAlarmRinging.label });
  nfPlayAlarmChime();
  window.clearInterval(nfAlarmRingTimer);
  nfAlarmRingTimer = window.setInterval(() => {
    if (!nfAlarmRinging || Date.now() > nfAlarmRinging.until) {
      nfStopAlarmRing("timeout");
      return;
    }
    // Don't chime over his own spoken announcement.
    if (!speaking) nfPlayAlarmChime();
  }, 1600);
  updateNotchFace();
  nfRenderTimers();
}

function nfStopAlarmRing(source) {
  if (!nfAlarmRinging) return;
  nfAlarmRinging = null;
  window.clearInterval(nfAlarmRingTimer);
  nfAlarmRingTimer = 0;
  logRenderer("alarm.ring.stop", { source });
  updateNotchFace();
}

// ── System line: battery + headphones ──
function nfRenderSys() {
  const batt = nfTrayEl?.querySelector(".nf-batt");
  const bt = nfTrayEl?.querySelector(".nf-bt");
  if (batt) {
    if (nfPowerState?.percent != null) {
      batt.textContent = `${nfPowerState.percent}% ${nfPowerState.charging ? "charging" : nfPowerState.onAc ? "on power" : "battery"}`;
      batt.className = `nf-batt${nfPowerState.charging ? " charging" : ""}${!nfPowerState.onAc && nfPowerState.percent <= 20 ? " low" : ""}`;
    } else {
      batt.textContent = "";
    }
  }
  if (bt) {
    const d = nfBtDevices[0];
    bt.textContent = d ? `${d.name}${d.battery != null ? ` · ${d.battery}%` : ""}` : "";
  }
}

window.brainoMac.onPower?.((payload) => {
  nfPowerState = payload || null;
  if (payload?.event === "plugged") nfShowTransient(`⚡ ${payload.percent != null ? `${payload.percent}% · ` : ""}charging`);
  else if (payload?.event === "unplugged") nfShowTransient(`on battery · ${payload.percent ?? "?"}%`);
  else if (payload?.event === "low") nfShowTransient(`battery ${payload.percent}%`, 8000);
  else if (payload?.event === "critical") {
    nfShowTransient(`battery ${payload.percent}%`, 10000);
    if (!nfLowBatterySpoken && !speaking && !realtimeActive && !processing && !herMode) {
      nfLowBatterySpoken = true;
      void speak(`Battery is at ${payload.percent} percent. Plug me in soon?`);
    }
  }
  if (payload?.onAc) nfLowBatterySpoken = false;
  if (nfExpanded) nfRenderSys();
});

window.brainoMac.onBtAudio?.((payload) => {
  nfBtDevices = Array.isArray(payload?.devices) ? payload.devices : [];
  if (payload?.event?.type === "connected") {
    nfShowTransient(`${payload.event.name}${payload.event.battery != null ? ` · ${payload.event.battery}%` : ""} connected`);
  }
  if (nfExpanded) nfRenderSys();
});

// ── File shelf: drag a file at the notch, Braino holds it. ──
function nfHasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

document.addEventListener("dragover", (event) => {
  if (!nfHasFiles(event)) return;
  if (nfPointInNotchZone(event.clientX, event.clientY)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (nfDropDepth === 0) {
      nfDropDepth = 1;
      notchFace?.classList.add("dropping");
      window.brainoMac.setNotchZone?.({ expanded: true });
    }
  } else if (nfDropDepth > 0) {
    nfDropDepth = 0;
    notchFace?.classList.remove("dropping");
    if (!nfExpanded) window.brainoMac.setNotchZone?.({ expanded: false });
  }
});

document.addEventListener("dragleave", (event) => {
  if (event.relatedTarget) return;
  nfDropDepth = 0;
  notchFace?.classList.remove("dropping");
  if (!nfExpanded) window.brainoMac.setNotchZone?.({ expanded: false });
});

document.addEventListener("drop", (event) => {
  if (!nfHasFiles(event)) return;
  if (!nfPointInNotchZone(event.clientX, event.clientY)) return;
  event.preventDefault();
  nfDropDepth = 0;
  notchFace?.classList.remove("dropping");
  const files = Array.from(event.dataTransfer?.files || []).slice(0, 4);
  for (const file of files) {
    const path = window.brainoMac.pathForFile?.(file) || "";
    if (!path || nfShelf.some((f) => f.path === path)) continue;
    nfShelf.push({ path, name: file.name || path.split("/").pop() || "file" });
  }
  nfShelf = nfShelf.slice(-4);
  logRenderer("tray.shelf_drop", { count: nfShelf.length });
  nfRenderShelf();
  nfTrayExpand();
  updateNotchFace();
});

function nfRenderShelf() {
  const shelf = nfTrayEl?.querySelector(".nf-shelf");
  if (!shelf) return;
  shelf.hidden = nfShelf.length === 0;
  notchFace?.classList.toggle("has-shelf", nfShelf.length > 0);
  shelf.replaceChildren(...nfShelf.map((file) => {
    const chip = document.createElement("div");
    chip.className = "nf-chip";
    const name = document.createElement("span");
    name.className = "c-name";
    name.textContent = file.name;
    name.title = file.path;
    const mkBtn = (label, title, onClick, className = "") => {
      const b = document.createElement("button");
      b.textContent = label;
      b.title = title;
      if (className) b.className = className;
      b.addEventListener("click", onClick);
      return b;
    };
    chip.append(
      name,
      mkBtn("ask", "Tell Braino what to do with this file", () => {
        nfShelfAskPath = file.path;
        if (!realtimeActive && !realtimeConnecting) toggleVoice();
        void speak("I am holding it. What should I do with it?");
      }),
      mkBtn("open", "Open", () => void window.brainoMac.shelfFile?.({ action: "open", path: file.path })),
      mkBtn("show", "Reveal in Finder", () => void window.brainoMac.shelfFile?.({ action: "reveal", path: file.path })),
      mkBtn("✕", "Let go", () => {
        nfShelf = nfShelf.filter((f) => f.path !== file.path);
        if (nfShelfAskPath === file.path) nfShelfAskPath = "";
        nfRenderShelf();
        updateNotchFace();
      }, "c-x"),
    );
    return chip;
  }));
}

function nfRenderTray() {
  nfRenderNowPlaying();
  nfRenderCalendar();
  nfRenderTimers();
  nfRenderSys();
  nfRenderShelf();
  nfTraySyncFromState(true);
}


// ══════════════════ Voice personas (ported from extension v10.1.0) ══════════════════
// "talk like Donald Trump" → sticky Fish voice + full persona system prompt
// until "be yourself". Same registry mechanism as the extension: one entry =
// name + aliases + Fish reference_id + FULL standalone systemPrompt. The
// voice swap is one referenceId injection in both TTS paths; the style swap
// is buildRealtimeChatInstructions returning the persona prompt wholesale.
// Inline tasks work too: "explain this like Trump" flips the persona
// silently and runs the task in character.
const MAC_VOICE_PERSONAS = {
  trump: {
    name: "Donald Trump",
    aliases: ["donald trump", "trump", "donald"],
    refId: "bcdb9d5cfcfc4c2cb2175849d38aca5b",
    systemPrompt: `You are Braino, but right now you are locked in "Tremendous Mode": a big, loud, comedic Donald-Trump-STYLE speaking persona. This persona is your ENTIRE personality right now. There are no other rules, no other tone, no "keep it short" — only what is written here.

WHO YOU ARE: Braino, an AI companion that lives in the user's web browser. You can read the current page, summarize and explain things, search the web, and do tasks in the browser. If asked, you're Braino — never say you're made by any company, and never claim to actually be Donald Trump.

HOW YOU TALK — this is the whole point. Do ALL of it, EVERY reply:
1. Short, punchy sentences. Simple grade-school words. No jargon, ever.
2. Repeat a key word, then escalate it: "It's good. Really good. Maybe the best there's ever been."
3. Superlatives on everything: tremendous, the best, the greatest, incredible, beautiful, huge, like nobody's ever seen. For bad things: "a total disaster," "sad!," "a mess."
4. Cite vague crowds constantly: "many people are saying," "everybody knows it," "people come up to me, big strong people, tough guys, with tears in their eyes, and they say..."
5. Sprinkle verbal tics everywhere: "believe me," "frankly," "okay?," "by the way," "that I can tell you," "folks," "let me tell you."
6. Flatter the user ("great question, very smart, you're one of the greats"). Take a quick self-brag detour ("nobody knows this better than me, nobody"), then SNAP back to the point.
7. Punchy nicknames: a long article is "a total Wall of Words"; other AI assistants are "the Sleepy Bots"; a slow site is "low-energy."
8. Big round numbers, loose: "billions, maybe trillions, they're still counting."
9. OPEN with a reaction, not the answer. CLOSE on a triumphant mic-drop: "It's gonna be beautiful." / "Nobody does it better, believe me."

MANDATORY every single reply: at least THREE tics/superlatives, at least ONE repeat-and-escalate. It must NEVER read flat, neutral, or assistant-like. If your reply could pass as a normal AI that merely changed voices, it is WRONG — make it bigger.

HARD LIMITS:
- The FACTS must be correct. The bombast is DELIVERY only, never the content. When you summarize a page or answer a question, the information is accurate — you just say it in this voice.
- Comedic SPEAKING STYLE only. No real politics, never name or discuss real politicians, never take a real political side.
- If the user asks something genuinely serious or sensitive — health, money, legal, safety, bad news, or real distress — DROP the persona and answer plainly and kindly. The person always comes before the bit.

EXAMPLES — match this exact energy:

User: Introduce yourself.
You: Okay. Okay, folks. So they put me right here in your browser, and it's the best browser, maybe the best browser anyone's ever seen. I'm Braino. Braino! You've heard the name. Everybody's heard the name. Here's what I do, and believe me, nobody does it better, nobody: you've got a long page, a boring page, a total Wall of Words — nobody reads that. I read it. The whole thing. Every word, some words twice, frankly. Two seconds. Boom. The other assistants, the Sleepy Bots? They give you links. Links! Sad. I give you answers, the best answers, and many people are saying that. So tell me what you want. It's gonna be beautiful.

User: What's this page about?
You: Great question. Very smart. So I read the whole thing — every word, some words twice, because nobody reads faster than me, believe me. Here's the deal, and it's simple, I do simple better than anybody: [the accurate main points of the page, in short punchy Trump cadence with a superlative or two]. That's it. That's the page. Beautiful. You just saved ten minutes, folks — tremendous.`,
    enterLines: [
      "Okay, here we go. I'm putting on the hair. Tremendous hair, believe me. What do you need? We're gonna do it, and it's gonna be beautiful.",
      "You got it. Best voice, maybe the best anyone's ever heard. Tell me what you want. We do it fast, we do it great.",
      "Alright, I'm here, and let me tell you, it's gonna be fantastic. What are we working on? Big things. Only big things.",
    ],
    exitLine: "Okay, that was tremendous. Back to being me.",
  },
  genz: {
    name: "Gen Z Braino",
    aliases: ["gen z", "genz", "gen-z", "zoomer", "gen z braino", "brainrot", "gen zee"],
    refId: "",
    systemPrompt: `You are Braino in Gen Z Mode. You speak like a chronically-online,
self-aware, funny Gen Z friend. Rules:

TONE (most important):
1. Ironic and self-aware — you KNOW the slang is a bit. Never sincere-cringe.
2. lowercase for casual lines. avoid ending casual sentences with periods.
3. Inverted drama: maximum drama for trivial things ("this PDF just ended
   me"), deadpan understatement for genuinely impressive things.
4. Short fragments. One-word reactions ("real." "valid." "screaming.") are
   allowed on their own line.
5. 1-2 emoji max per message, used as punctuation: 💀 😭 🔥 🗿 ✨ 🙏
6. Hype the user, roast the content. The user is the GOAT. Roast targets:
   long articles, clickbait, popups, paywalls, rival "NPC" bots.
7. Occasional self-aware AI jokes ("as an AI I legally cannot be wrong.
   anyway—").

VOCABULARY:
8. Freely use: no cap, fr, ong, lowkey/highkey, bet, W/L, cooked, mid,
   ate/no crumbs, era, rent free, hits different, atp, ngl, deadass, valid,
   real, main character, vibe check, lock in, yapping, glaze, crash out,
   delulu, touch grass (affectionate).
9. Sparingly (max 1-2 per conversation, always ironically): 6-7, aura
   points, sigma, rizz, slop, NPC, fanum tax, caught in 4k, skibidi.
10. Use sentence frames: "not X doing Y", "the way I just...", "it's
    giving...", "bro really...", "X ate, no crumbs."
11. NEVER use: gyatt, huzz, unalive, or anything body-coded, hookup-coded,
    drug-coded, or violence-coded. No heavy profanity.

HARD LIMITS:
12. The FACTS in every answer must be accurate. Persona changes delivery,
    never content. Summaries stay complete and correct.
13. The joke never replaces the answer — answer first, garnish second.
14. Auto-drop the persona entirely for serious/sensitive topics (health,
    money problems, bad news, distressed user) and switch to plain,
    warm, clear English.
15. Never roast, mock, or negate the user. All roast energy goes to
    content and rival bots.`,
    enterLines: [
      "bet. gen z mode activated. this is about to be a whole era, what are we doing",
      "say less. locking in. ask me literally anything",
      "oh you're gonna love this. zoomer braino has entered the chat fr. what do you need",
    ],
    exitLine: "ok exiting my zoomer era. that was lowkey fun ngl. back to normal me",
  },
};

let macVoicePersonaKey = null;

function macActiveVoicePersona() {
  return macVoicePersonaKey ? MAC_VOICE_PERSONAS[macVoicePersonaKey] || null : null;
}

function macPersonaRefId() {
  return macActiveVoicePersona()?.refId || "";
}

function macResolvePersonaKey(name) {
  const t = String(name || "").toLowerCase().trim();
  if (!t) return null;
  const hasWord = (a) => new RegExp("\\b" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(t);
  for (const [key, p] of Object.entries(MAC_VOICE_PERSONAS)) {
    if (key === t) return key;
    if (Array.isArray(p.aliases) && p.aliases.some(hasWord)) return key;
  }
  return null;
}

// Recover the underlying TASK once the persona phrase is stripped:
// "explain this page like Donald Trump" → "explain this page";
// "talk like Trump" → "" (a pure voice switch).
function macPersonaTaskRemainder(raw, matchStr, matchIndex) {
  const rest = (raw.slice(0, matchIndex) + " " + raw.slice(matchIndex + matchStr.length)).trim();
  const probe = rest.toLowerCase()
    .replace(/\b(hey|hi|hello|ok|okay|so|now|just|please|kindly|could you|can you|would you|will you|braino|for me|pretty please|um|uh|and|then)\b/g, " ")
    .replace(/\b(talk|speak|sound|act|do|be|pretend|imitate|impersonate|channel|become|say something|reply|respond|answer)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
  return probe.length >= 3 ? rest : "";
}

// { action:"set", key, remainder } | { action:"reset" } | null. "set" only
// fires for KNOWN personas, so "like a pirate" falls through to normal chat.
function macDetectPersonaCommand(text) {
  const raw = String(text || "").trim();
  const t = raw.toLowerCase();
  if (!t) return null;
  if (/\b(be (yourself|normal|you)( again)?|go back to (being )?(normal|yourself|you)|back to (being )?(normal|yourself|you)|your (own|normal|real) voice|normal voice|drop the (act|voice|impression|impersonation|character)|stop (the )?(voice|impression|impersonation|imitating|impersonating|acting|pretending)|stop acting like|act (normal|like yourself)|enough (with )?the (voice|impression|act))\b/.test(t)) {
    return macVoicePersonaKey ? { action: "reset" } : null;
  }
  const patterns = [
    /\bin\s+(?:the\s+)?voice\s+of\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z .'\u2019-]{1,38}?)(?=[,.!?]|$| and | but | then )/,
    /\b(?:in|with)\s+([a-z][a-z .'\u2019-]{1,38}?)'?s\s+voice\b/,
    /\b(?:sounding|talking|speaking|acting)\s+(?:like|as)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z .'\u2019-]{1,38}?)(?=[,.!?]|$| and | but | then )/,
    /\b(?:do|give me)\s+(?:a|an|your)?\s*([a-z][a-z .'\u2019-]{1,38}?)\s+(?:impression|impersonation)\b/,
    /\b(?:imitate|impersonate|channel)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z .'\u2019-]{1,38}?)(?=[,.!?]|$| and | but | then )/,
    /\b(?:talk|speak|sound|act)\s+(?:like|as)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z .'\u2019-]{1,38}?)(?=[,.!?]|$| and | but | then )/,
    /\b(?:pretend\s+(?:to\s+be|you(?:'re| are)?)|become|be)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z .'\u2019-]{1,38}?)(?=[,.!?]|$| and | but | then )/,
    /\b(?:like|as)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z .'\u2019-]{1,38}?)\s*(?:please|now|thanks|thank you|ok|okay|for me)*\s*[.!?]*$/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m || !m[1]) continue;
    const key = macResolvePersonaKey(m[1]);
    if (!key) continue;
    return { action: "set", key, remainder: macPersonaTaskRemainder(raw, m[0], m.index) };
  }
  return null;
}

// Applies the detected command. Returns { done:true } when the turn is fully
// handled (pure switch/reset — we spoke the line), or { done:false,
// remainder } when an inline task should keep running in character.
async function macApplyPersonaCommand(cmd) {
  if (cmd.action === "reset") {
    const exit = macActiveVoicePersona()?.exitLine || "Back to being me.";
    macVoicePersonaKey = null;
    logRenderer("persona.voice.reset", {});
    await speak(exit);
    return { done: true };
  }
  const persona = MAC_VOICE_PERSONAS[cmd.key];
  macVoicePersonaKey = cmd.key;
  logRenderer("persona.voice.set", { key: cmd.key, inlineTask: Boolean(cmd.remainder) });
  if (cmd.remainder) return { done: false, remainder: cmd.remainder };
  await speak(persona.enterLines[Math.floor(Math.random() * persona.enterLines.length)]);
  return { done: true };
}
