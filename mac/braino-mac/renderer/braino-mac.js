const W = 64;
const H = 78;
const walker = document.getElementById("walker");
const walkerFlip = document.getElementById("walker-flip");
const lane = document.getElementById("walker-lane");
const bubble = document.getElementById("speech-bubble");
const statusPill = document.getElementById("status-pill");
const statusText = document.getElementById("status-text");
const fileStrip = document.getElementById("file-strip");
const edgeGlow = document.getElementById("edge-glow");
const ESTIMATED_DOCK_HEIGHT = 94;
const DOCK_PERCH_LIFT = 42;
const START_OFFSCREEN_X = -W - 36;
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
const MAC_TEAM_DEMO_SPOTIFY_MS = 5000;
const MAC_TEAM_DEMO_ARTICLE_MS = 350;
const MAC_TEAM_PRIMARY_ORDER = ["madhuri", "shree", "palash"];
const MAC_TEAM_ORDER_LINE = "This is the order I will be following: Madhuri, then Shree, then Palash. Elder comes first, then ladies first, and then comes the gentleman.";
const MAC_TEAM_FINAL_THANK_YOU = "Thank you for making Itish's time in Amdocs worth it. Thank you for making him feel as if he was home away from home. He will remember you always.";
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
const root = walker.querySelector("#__sbwk_root__");
const q = (selector) => root?.querySelector(selector);

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
let realtimeConnecting = false;
let realtimeVoiceEngine = "fish";
let herMode = false;
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
let voiceLatencyCounter = 0;
let voiceLatencyTurn = null;
let lastSpokenLine = { text: "", ts: 0 };
let pendingDelegateState = { hasPendingWorkflow: false, hasPendingFileConfirmation: false };
let macTeamState = {
  active: false,
  phase: "idle",
  roster: [],
  spoken: [],
  currentPerson: null,
  lastLine: "",
};
let localChatMemory = [];
let scriptedWalk = null;
let authPose = false;
let startupActive = false;
let startupPose = null;
let ttsConfigPromise = null;
let ttsWarmTimer = 0;
const ttsAbortControllers = new Set();

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
    firstAudioAt: 0,
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
  if (stage === "speech_stopped") voiceLatencyTurn.speechStoppedAt = now;
  if (stage === "transcript_completed") voiceLatencyTurn.transcriptCompletedAt = now;
  if (stage === "delegate_started") voiceLatencyTurn.delegateStartedAt = now;
  if (stage === "delegate_done") voiceLatencyTurn.delegateDoneAt = now;
  if (stage === "first_audio" && !voiceLatencyTurn.firstAudioAt) voiceLatencyTurn.firstAudioAt = now;
  logRenderer(`voice.latency.${stage}`, {
    ...voiceLatencySnapshot(),
    ...data,
  });
}

function getMoveBounds() {
  return {
    minX: 10,
    maxX: Math.max(10, window.innerWidth - W - 10),
    minY: 54,
    maxY: Math.max(54, window.innerHeight - H - 10),
  };
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
  // The walker owns the voice theatrics again — the notch stays out of voice.
  walker.classList.toggle("voice-active", ["connecting", "listening", "hearing", "captured", "speaking"].includes(status));
  walker.classList.toggle("connecting", status === "connecting");
  walker.classList.toggle("listening", status === "listening");
  walker.classList.toggle("hearing", status === "hearing");
  walker.classList.toggle("captured", status === "captured");
  walker.classList.toggle("speaking", status === "speaking");
  statusText.textContent = text;
  lastGlowStatus = status;
  updateEdgeGlow();
  updateNotchFace();
  if (herMode) window.HerMode?.syncStatus(status);
}

let lastGlowStatus = "ready";
let musicMode = false;

function updateEdgeGlow() {
  if (!edgeGlow) return;
  const voiceState = herMode
    ? ""
    : ["listening", "hearing"].includes(lastGlowStatus)
      ? "listen"
      : lastGlowStatus === "speaking"
        ? "speak"
        : ["connecting", "thinking", "captured"].includes(lastGlowStatus)
          ? "think"
          : "";
  edgeGlow.className = voiceState || (musicMode && !herMode ? "music" : "");
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

function fmtCountdown(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m >= 60
    ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
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
  const timer = nfTimers.filter((t) => t.endAt > now).sort((a, b) => a.endAt - b.endAt)[0];
  const calImminent = nfCalendarNext
    && nfCalendarNext.startAt - now < 15 * 60 * 1000
    && nfCalendarNext.startAt > now - 60 * 1000
    ? nfCalendarNext
    : null;

  let line = "";
  let live = false;
  let music = false;
  if (timer) {
    line = `${timer.label} · ${fmtCountdown(timer.endAt - now)}`;
    live = true;
  } else if (calImminent) {
    const minutes = Math.max(1, Math.ceil((calImminent.startAt - now) / 60000));
    line = `${calImminent.title} · in ${minutes} min`;
    live = true;
  } else if (nfWaBadge.count > 0) {
    line = `${nfWaBadge.sender || "whatsapp"} · ${nfWaBadge.count} new`;
    live = true;
  } else if (musicMode) {
    line = [lastMusicInfo.track, lastMusicInfo.artist].filter(Boolean).join(" · ");
    music = true;
  }
  notchFace.classList.toggle("live", visible && live);
  notchFace.classList.toggle("music", visible && music);
  notchFace.classList.toggle("mic-live", visible && (realtimeActive || realtimeConnecting));
  nfSetStatusText(line);
}

window.setInterval(() => {
  if (nfTimers.length || nfCalendarNext || nfWaBadge.count) updateNotchFace();
}, 1000);

async function walkerGoHome() {
  if (walkerHome) return;
  walkerHome = true;
  const startX = Math.round(window.innerWidth / 2 - W / 2);
  const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
  logRenderer("walker.home", {});
  await new Promise((resolve) => {
    scriptedWalk = { x: startX, y: faceH + 6, speed: 360, resolve, allowOffscreen: true };
  });
  walker.classList.remove("visible");
  updateNotchFace();
}

async function walkerLeaveHome() {
  if (!walkerHome) return;
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

function toggleWalkerHome() {
  if (walkerHome) void walkerLeaveHome();
  else void walkerGoHome();
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

async function runNotchBoot() {
  walkerHome = true; // he is born inside the notch
  setNotchFaceEnabled(true);
  updateNotchFace();
  notchFace?.classList.add("asleep");
  // Act 1: darkness. Something is in there.
  await wait(700);
  // Act 2: the notch begins to glow — life stirring before a single word.
  notchFace?.classList.add("nf-wake");
  await wait(2000);
  notchFace?.classList.remove("nf-wake");
  // Act 3: the island extends and speaks its first word.
  notchFace?.classList.add("nf-auth");
  nfSetStatusText("authenticating");
  const authStarted = Date.now();
  let result;
  try {
    result = await window.brainoMac.ensureAuth("startup");
  } catch (error) {
    result = { ok: false, error: error?.message || "Braino sign-in failed." };
  }
  // Even an instant token gets a real authenticating beat.
  const elapsed = Date.now() - authStarted;
  if (elapsed < 2100) await wait(2100 - elapsed);
  notchFace?.classList.remove("nf-auth");
  notchFace?.classList.add(result?.ok ? "nf-auth-ok" : "nf-auth-err");
  nfSetStatusText(result?.ok ? "authenticated" : "auth failed");
  await wait(1200);
  notchFace?.classList.remove("nf-auth-ok", "nf-auth-err");
  nfSetStatusText("");
  if (result?.ok) {
    // Act 4: his eyes open.
    notchFace?.classList.remove("asleep");
    await wait(850);
  }
  return result || { ok: false, error: "Braino sign-in failed." };
}

async function runNotchDescent(authResult) {
  const dock = getDockBounds();
  const startX = Math.round(window.innerWidth / 2 - W / 2);
  const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
  walkerHome = false; // he steps out: notch eyes hand off to the walker
  updateNotchFace();
  walker.classList.add("visible");
  setPosition(startX, faceH + 42, { allowOffscreen: true });
  dirX = 1;
  const landingX = clamp(startX, dock.minX, dock.maxX);
  await new Promise((resolve) => {
    scriptedWalk = { x: landingX, y: dock.y, speed: 290, resolve };
  });
  targetX = landingX;
  targetY = dock.y;
  const auth = await window.brainoMac.authStatus().catch(() => null);
  const firstName = String(auth?.displayName || "").split(" ")[0]?.trim() || "";
  if (authResult?.ok) {
    setBubble(firstName ? `hello, ${firstName}.` : "hello.", 2400);
    setWave(true);
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

function nfTrackPointer(event) {
  if (!notchFace?.classList.contains("on") || !nfPupilL || !nfPupilR) return;
  // Design look math: pupil offset = r*0.34 horizontal, r*0.30 vertical (r=10).
  const faceX = window.innerWidth / 2;
  const faceY = 30;
  const lookX = Math.max(-1, Math.min(1, (event.clientX - faceX) / 230));
  const lookY = Math.max(-0.5, Math.min(1, (event.clientY - faceY) / 300));
  const offX = lookX * 3.4;
  const offY = lookY * 3.0;
  nfPupilL.setAttribute("cx", String(49 + offX));
  nfPupilL.setAttribute("cy", String(21 + offY));
  nfPupilR.setAttribute("cx", String(71 + offX));
  nfPupilR.setAttribute("cy", String(21 + offY));
  document.getElementById("nf-glint-l")?.setAttribute("cx", String(50.9 + offX * 0.36));
  document.getElementById("nf-glint-r")?.setAttribute("cx", String(72.9 + offX * 0.36));
}
window.addEventListener("mousemove", nfTrackPointer, { passive: true });

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
  if (!musicMode || herMode) return;
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

// When music starts he retreats into the notch first ("music's on, let me
// rest a bit"), and only once he is actually home do the dance + light show
// begin — never simultaneous with him roaming the screen.
async function reactToMusicStart() {
  if (herMode || walkerHome || speaking || processing || voiceTurnInFlight) {
    startNotchDance();
    void startLightShow();
    return;
  }
  walkerAutoHomedByMusic = true;
  try { await speak("Music's on. Let me rest for a bit."); } catch (_) {}
  await walkerGoHome();
  startNotchDance();
  void startLightShow();
}

function reactToMusicStop() {
  stopNotchDance();
  stopLightShow();
  if (walkerAutoHomedByMusic && walkerHome) {
    walkerAutoHomedByMusic = false;
    void walkerLeaveHome();
  }
}

function setMusicMode(on) {
  musicMode = Boolean(on);
  headphones.style.display = musicMode ? "" : "none";
  walker.classList.toggle("music", musicMode);
  if (musicMode) void reactToMusicStart();
  else reactToMusicStop();
  if (musicMode && !noteTimer) {
    noteTimer = window.setInterval(spawnNotchNote, 1050);
  } else if (!musicMode && noteTimer) {
    window.clearInterval(noteTimer);
    noteTimer = 0;
    notchNotes?.replaceChildren();
  }
  updateEdgeGlow();
  updateNotchFace();
}

function updateFloatingUi() {
  const bubbleMargin = 22;
  const bubbleX = clamp(posX + W / 2, bubbleMargin, window.innerWidth - bubbleMargin);
  const bubbleY = clamp(posY - 12, 24, window.innerHeight - 90);
  bubble.style.left = `${bubbleX}px`;
  bubble.style.top = `${bubbleY}px`;
}

function setBubble(text, ms = 2600) {
  window.clearTimeout(sayTimer);
  bubble.textContent = text;
  updateFloatingUi();
  bubble.classList.add("show");
  if (ms > 0) {
    sayTimer = window.setTimeout(() => bubble.classList.remove("show"), ms);
  }
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
      inner.style.display = "block";
      inner.setAttribute("cy", String(61.8 + ry * 0.4));
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
  if (normalized) lastSpokenLine = { text: normalized, ts: Date.now() };
}

function voiceAddressesBraino(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (!normalized) return false;
  if (/\b(braino|bruno|breno|reno|dino)\b/.test(normalized)) return true;
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
  for (let index = 0; index < chunks.length; index += 1) {
    await speak(chunks[index]);
    if (index < chunks.length - 1) await macTeamDelay(options.chunkDelayMs ?? 260);
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

async function runMacTeamInput(rawText, options = {}) {
  const promptText = String(rawText || "").trim();
  if (!macTeamShouldHandlePrompt(promptText)) return false;

  const wasProcessing = processing;
  processing = true;
  setStatus("thinking", "Team Mode");
  setWave(true);
  rememberLocalChat("user", promptText);

  try {
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

function shouldAcceptVoiceTranscript(text) {
  const stats = transcriptStats(text);
  if (!stats.normalized || stats.wordCount === 0) return false;
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
  if ((speaking || processing || voiceTurnInFlight) && !voiceAddressesBraino(text)) return false;
  if (/^(hi|hello|hey|yo|braino|bruno|breno|reno)$/i.test(stats.normalized)) return true;
  if (stats.wordCount === 1 && !voiceAddressesBraino(text)) return false;
  if (stats.normalized.length < 3 && !voiceAddressesBraino(text)) return false;
  if (/^(uh|um|hmm|huh|yeah|okay|ok|no|yes|thanks?|thank you)$/i.test(stats.normalized)) return false;
  return true;
}

function stopSpeechOutput() {
  speechGeneration += 1;
  realtimeStreamTts = null;
  ttsAbortControllers.forEach((controller) => {
    try { controller.abort(); } catch (_) {}
  });
  ttsAbortControllers.clear();
  if (currentSpeechAudio) {
    try { currentSpeechAudio.dispatchEvent(new Event("ended")); } catch (_) {}
    try { currentSpeechAudio.pause(); } catch (_) {}
    currentSpeechAudio.src = "";
    currentSpeechAudio = null;
  }
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
        ...(herMode ? { referenceId: HER_FISH_VOICE_ID } : {}),
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
  currentSpeechAudio = audio;
  currentSpeechUrl = url;
}

function clearSpeechAudio(audio, url = null) {
  if (currentSpeechAudio === audio) currentSpeechAudio = null;
  if (url && currentSpeechUrl === url) {
    try { URL.revokeObjectURL(url); } catch (_) {}
    currentSpeechUrl = null;
  }
}

function playStreamedTtsResponse(response, generation) {
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
    } catch (error) {
      finish(error);
      return;
    }

    audio.addEventListener("ended", () => finish(), { once: true });
    audio.addEventListener("error", () => finish(audio.error || new Error("TTS audio playback failed.")), { once: true });
    audio.addEventListener("playing", () => {
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

async function playBufferedTtsResponse(response, generation) {
  const startedAt = performance.now();
  const blob = await response.blob();
  if (generation !== speechGeneration) return false;
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  setSpeechAudio(audio, url);
  await new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = () => reject(audio.error || new Error("TTS audio playback failed."));
    audio.onplaying = () => {
      markVoiceLatency("first_audio", { source: "buffered_tts" });
      logRenderer("tts.first_audio", {
        durationMs: Math.round(performance.now() - startedAt),
        streamed: false,
        ...voiceLatencySnapshot(),
      });
    };
    audio.play().catch(reject);
  });
  clearSpeechAudio(audio, url);
  return true;
}

async function playTtsFetchResult(result, generation) {
  if (!result?.response) return false;
  try {
    if (canStreamTtsMp3(result.response) && result.response.body) {
      await playStreamedTtsResponse(result.response, generation);
    } else {
      await playBufferedTtsResponse(result.response, generation);
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
    const played = await playTtsFetchResult(current, generation);
    if (played) spoke = true;
    if (pendingFetch && generation !== speechGeneration) {
      await pendingFetch.catch(() => null);
      return spoke;
    }
  }
  return spoke;
}

function beginRealtimeStreamTts(generation) {
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
        currentFetch = fetchTtsChunk(streamState.queue.shift(), streamState.generation)
          .catch((error) => ({ error }));
      }
      const result = await currentFetch;
      if (!realtimeStreamTts || streamState.generation !== speechGeneration) return;
      if (streamState.queue.length) {
        pendingFetch = fetchTtsChunk(streamState.queue.shift(), streamState.generation)
          .catch((error) => ({ error }));
      }
      if (result?.error) {
        streamState.error = result.error;
        logRenderer("realtime.chat.tts_stream_failed", { error: errorForLog(result.error) });
        break;
      }
      const played = await playTtsFetchResult(result, streamState.generation);
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
  const walkerRect = walker.getBoundingClientRect();
  if (rectContains(walkerRect, x, y, 18)) return true;

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

async function speak(text) {
  const line = String(text || "").trim();
  if (!line) return;
  const generation = ++speechGeneration;
  const startedAt = performance.now();
  noteSpoken(line);
  setBubble(line, Math.max(2400, Math.min(7200, line.length * 58)));
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
      const response = await window.brainoMac.tts(line, herMode ? HER_FISH_VOICE_ID : "");
      if (response?.ok && response.dataUrl) {
        const audio = new Audio(response.dataUrl);
        setSpeechAudio(audio);
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
        if (currentSpeechAudio === audio) currentSpeechAudio = null;
      } else {
        await window.brainoMac.systemSay(line);
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(3600, Math.max(900, line.length * 42))));
      }
    }
  } catch (_) {
    if (generation === speechGeneration) {
      await window.brainoMac.systemSay(line);
      await new Promise((resolve) => window.setTimeout(resolve, Math.min(3600, Math.max(900, line.length * 42))));
    }
  } finally {
    if (generation === speechGeneration) {
      speaking = false;
      currentSpeechAudio = null;
      setTalk(false);
      logRenderer("speech.done", { chars: line.length, durationMs: Math.round(performance.now() - startedAt) });
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
    const result = await window.brainoMac.delegate(text);
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
  if (!context?.appName) {
    return ["Current Mac surface: unknown yet; answer generally unless the user asks for a concrete Mac action."];
  }
  const title = context.browserTitle || context.windowTitle || "";
  return [
    `Current active Mac app: ${context.appName}.`,
    title ? `Current window/tab title: ${title}.` : "",
    context.browserUrl ? `Current browser URL: ${context.browserUrl}.` : "",
    context.isBrowser ? "The user is in a browser window, but Mac Braino does not have live DOM bridge access yet; use the title/URL and route concrete browser actions through delegate." : "",
  ].filter(Boolean);
}

function buildRealtimeSessionUpdate() {
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
  if (!realtimeActive || !rtDc || rtDc.readyState !== "open") return;
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
  if (!realtimeResponseInFlight && !realtimeResponseWaiter) return;
  sendRealtimeEvent({ type: "response.cancel" });
  resolveRealtimeResponse({ status: "cancelled", text: realtimeResponseText, errorMessage: reason });
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

function isLikelyMacActionTranscript(text) {
  const normalized = normalizeForVoiceMatch(text);
  if (!normalized) return false;
  if (/\bwhat can you do\b/.test(normalized) && /\b(mac|macbook|desktop|files?|locally|computer|system)\b/.test(normalized)) return true;
  if (/\b(what can you do|who are you|how are you|hello|hi|hey)\b/.test(normalized)) return false;
  return /\b(open|launch|start|close|quit|organize|organise|clean|sort|rename|move|delete|trash|create|make|new|create folder|make folder|new folder|undo|find|locate|look for|search for|show me|play|playing|pause|resume|spotify|playlist|volume|vol|sound|louder|quieter|mute|reduce|raise|increase|decrease|lower|percent|seconds?|minutes?|shuffle|repeat|loop|queue|rewind|restart|seek|album|artist|listening to|youtube|song|music|chrome|browser|website|tab|gmail|mail|email|notes|note|maps|calendar|drive|docs|pdf|image|video|file|folder|app|application|send|draft|compose|click|point|where is|reply|write|whatsapp|whats app|remember|remind|timer|countdown|call|facetime|face time|dial|watch|tutorial|channel|creator|recommend|read|screen|explain|translate|look at|watching|help me with|summarize|summarise|scroll|download|upload|copy|paste)\b/.test(normalized);
}

function shouldUseRealtimeDirectChat(text) {
  if (!realtimeActive || !rtDc || rtDc.readyState !== "open") return false;
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

function buildRealtimeChatInstructions() {
  if (herMode) return buildHerChatInstructions();
  const parts = [];
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
      speaking = false;
      processing = false;
      setTalk(false);
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
  if (!realtimeActive || realtimeConnecting) return;
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

function stopRealtimeVoice() {
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

function flushRealtimeTranscript(reason) {
  const transcript = String(rtUserTranscript || "").trim();
  if (reason === "speech_stopped" && transcript && !rtTranscriptFinal) {
    scheduleRealtimeTranscriptFlush("waiting_final_transcript", REALTIME_TRANSCRIPT_IDLE_FLUSH_MS);
    return;
  }
  rtUserTranscript = "";
  rtTranscriptFinal = false;
  clearRealtimeTranscriptFlush();
  const accepted = shouldAcceptVoiceTranscript(transcript);
  logRenderer("realtime.transcript.flush", {
    reason,
    transcriptChars: transcript.length,
    accepted,
    voiceTurnInFlight,
  });
  if (!transcript) {
    setStatus("listening", "Listening");
    scheduleRealtimeIdleShutdown("empty_transcript");
    return;
  }
  if (voiceTurnInFlight || !accepted) {
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
    } else {
      setStatus("listening", "Listening");
      scheduleRealtimeIdleShutdown("ignored_transcript");
    }
    return;
  }
  clearRealtimeIdleTimer();
  markRealtimeActivity("accepted_transcript", { schedule: false });
  if (speaking) stopSpeechOutput();
  voiceTurnInFlight = true;
  void (async () => {
    try {
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
      if (await runMacTeamInput(transcript, { keepRealtime: true, fromVoice: true })) return;
      if (shouldUseRealtimeDirectChat(transcript)) {
        const handled = await answerViaRealtimeChat(transcript);
        if (handled) return;
        logRenderer("realtime.chat.fallback_to_delegate", {
          transcriptChars: transcript.length,
          ...voiceLatencySnapshot(),
        });
      }
      await runDelegate(transcript, { keepRealtime: true });
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
      setStatus("listening", "Listening");
      if (realtimeActive) scheduleRealtimeIdleShutdown("session_ready");
    }
    return;
  }

  if (event.type === "input_audio_buffer.speech_started") {
    markRealtimeActivity("speech_started", { schedule: false });
    startVoiceLatencyTurn("speech_started");
    rtUserTranscript = "";
    rtTranscriptFinal = false;
    clearRealtimeTranscriptFlush();
    // Trust the physical audio state, not just the flags: `speaking` can go
    // stale while a long Fish stream is still audible, which used to make
    // interruptions land here and do nothing until the clip finished.
    const audiblyTalking = speaking || Boolean(currentSpeechAudio) || Boolean(realtimeStreamTts);
    if (audiblyTalking || realtimeResponseInFlight) {
      logRenderer("realtime.barge_in", {
        via: "speech_started",
        speaking,
        processing,
        voiceTurnInFlight,
        hadAudio: Boolean(currentSpeechAudio),
        hadStreamTts: Boolean(realtimeStreamTts),
        responseInFlight: realtimeResponseInFlight,
      });
      cancelRealtimeResponse("barge_in");
      delegateGeneration += 1;
      voiceTurnInFlight = false;
      processing = false;
      stopSpeechOutput();
      setRealtimeMicEnabled(true);
      setStatus("hearing", "Hearing you");
      setBubble("Listening...", 0);
      return;
    }
    if (processing || voiceTurnInFlight) {
      setStatus("thinking", "Delegating");
      return;
    }
    setStatus("hearing", "Hearing you");
    setBubble("Listening...", 0);
    return;
  }

  if (event.type === "input_audio_buffer.speech_stopped") {
    markRealtimeActivity("speech_stopped", { schedule: false });
    markVoiceLatency("speech_stopped");
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
      return;
    }
    setStatus("captured", "Got it");
    setBubble("Got it.", 900);
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
        cancelRealtimeResponse("barge_in");
        delegateGeneration += 1;
        voiceTurnInFlight = false;
        processing = false;
        stopSpeechOutput();
        setRealtimeMicEnabled(true);
      }
      markRealtimeActivity("transcript_delta", { schedule: false });
      rtTranscriptFinal = false;
      rtUserTranscript += delta;
      if (herMode) window.HerMode?.setHeard(rtUserTranscript.trim());
      else setBubble(rtUserTranscript.trim() || "Listening...", 0);
      scheduleRealtimeTranscriptFlush("transcript_idle", REALTIME_TRANSCRIPT_IDLE_FLUSH_MS);
    }
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    markRealtimeActivity("transcript_completed", { schedule: false });
    rtUserTranscript = String(event.transcript || rtUserTranscript || "");
    rtTranscriptFinal = true;
    markVoiceLatency("transcript_completed", { transcriptChars: rtUserTranscript.trim().length });
    flushRealtimeTranscript("completed");
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
    if (realtimeResponseInFlight || realtimeResponseWaiter) {
      resolveRealtimeResponse({ status: "error", text: realtimeResponseText, errorMessage: message });
    }
    setStatus("error", "Voice error");
    setBubble(`Voice error: ${message}`, 3600);
    clearRealtimeIdleTimer();
  }
}

async function waitForRealtimeDataChannel(dc) {
  if (dc.readyState === "open") return;
  await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Live voice timed out while connecting.")), 15000);
    dc.addEventListener("open", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
    dc.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Live voice control channel failed."));
    }, { once: true });
  });
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

async function startRealtimeVoice() {
  stopRecognition();
  stopRealtimeVoice();
  realtimeConnecting = true;
  listening = true;
  setStatus("connecting", "Waking voice");
  setBubble("Voice is waking up.", 1300);
  logRenderer("realtime.start", {
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
    void warmFishTts();
    await ensureMicrophoneAccess();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    rtMic = stream;
    logRenderer("realtime.mic.ok", {
      audioTracks: stream.getAudioTracks().length,
    });

    const pc = new RTCPeerConnection();
    rtPc = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const playOpenAiVoice = realtimeVoiceEngine === "realtime";
    rtRemoteAudio = new Audio();
    rtRemoteAudio.autoplay = true;
    rtRemoteAudio.muted = !playOpenAiVoice;
    rtRemoteAudio.volume = playOpenAiVoice ? 1 : 0;
    document.body.appendChild(rtRemoteAudio);
    pc.addEventListener("track", (event) => {
      if (!rtRemoteAudio) return;
      rtRemoteAudio.srcObject = event.streams[0] || new MediaStream([event.track]);
      rtRemoteAudio.play().catch(() => {});
    });
    pc.addEventListener("connectionstatechange", () => {
      if (pc !== rtPc) return;
      logRenderer("realtime.peer.state", { state: pc.connectionState });
      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        stopRealtimeVoice();
        setStatus("error", "Voice disconnected");
        setBubble("Voice disconnected. Double Control wakes me again.", 3200);
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
    });
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
    await waitForRealtimeDataChannel(dc);
    sendRealtimeEvent(buildRealtimeSessionUpdate());
    startRealtimeHeartbeat(result.sessionId || null);

    realtimeActive = true;
    realtimeConnecting = false;
    listening = true;
    markRealtimeActivity("realtime_ready");
    startFishWarmKeepAlive();
    setStatus("listening", "Listening");
    setBubble("I am listening.", 1400);
    logRenderer("realtime.ready");
  } catch (error) {
    logRenderer("realtime.start.error", { error: errorForLog(error) });
    setAuthPose(false);
    stopRealtimeVoice();
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
  }
}

function toggleVoice() {
  // Stage 1: if he is audibly talking, the tap means "stop talking NOW" —
  // cut the audio mid-word but stay listening for the follow-up.
  if (speaking || currentSpeechAudio || realtimeStreamTts) {
    delegateGeneration += 1;
    voiceTurnInFlight = false;
    processing = false;
    cancelRealtimeResponse("manual_stop");
    stopSpeechOutput();
    logRenderer("voice.manual_stop", { stillListening: realtimeActive });
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
    // He is born from the notch: fill → authenticate (island pulse, green or
    // red verdict) → eyes open → step out and walk down to the Dock.
    const authResult = await runNotchBoot();
    logRenderer("startup.auth.result", {
      ok: Boolean(authResult?.ok),
      source: authResult?.source || "unknown",
      error: authResult?.error || null,
    });
    await runNotchDescent(authResult);
    notchBootDone = true;
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
});

window.addEventListener("keydown", (event) => {
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
  } else if (!dragState && !shouldHoldAttention) {
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
  walkerFlip.style.transform = `scaleX(${engaged ? 1 : dirX})`;
  updateFloatingUi();

  if (startupPose) {
    const pose = startupPose;
    const leftArmTransform = pose.leftArm ? `rotate(${pose.leftArm} 22 53)` : "";
    const rightArmTransform = pose.rightArm ? `rotate(${pose.rightArm} 78 53)` : "";
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
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${pose.eyeScale || 1}) translate(-38,-48)`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${pose.eyeScale || 1}) translate(-62,-48)`);
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
    q("#__sbwk_la_bg__")?.setAttribute("transform", "");
    q("#__sbwk_la__")?.setAttribute("transform", "");
    q("#__sbwk_ra_bg__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} 78 53)` : "");
    q("#__sbwk_ra__")?.setAttribute("transform", rightArmAngle ? `rotate(${rightArmAngle} 78 53)` : "");
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${eyeScale}) translate(-38,-48)`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${eyeScale}) translate(-62,-48)`);

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
window.brainoMac.onHerToggle?.(() => toggleHerMode());
window.brainoMac.onPointAt?.((payload) => { void pointAtScreen(payload); });
window.brainoMac.onMusicState?.((payload) => {
  lastMusicInfo = {
    track: String(payload?.track || ""),
    artist: String(payload?.artist || ""),
    source: String(payload?.source || ""),
  };
  lightShow.tempo = Number.isFinite(payload?.tempo) && payload.tempo > 40 && payload.tempo < 220 ? payload.tempo : null;
  lightShow.energy = Number.isFinite(payload?.energy) ? payload.energy : null;
  lightShow.valence = Number.isFinite(payload?.valence) ? payload.valence : null;
  setMusicMode(Boolean(payload?.playing));
});
window.brainoMac.onWalkerToggle?.(() => toggleWalkerHome());
window.brainoMac.onTimers?.((payload) => {
  nfTimers = Array.isArray(payload?.timers) ? payload.timers : [];
  updateNotchFace();
});
window.brainoMac.onTimerFired?.(() => {
  notchFace?.classList.add("nf-flash");
  window.setTimeout(() => notchFace?.classList.remove("nf-flash"), 2600);
  updateNotchFace();
});
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
  if (progress.status) setStatus(progress.status, progress.text || progress.status);
  if (progress.text) setBubble(progress.text, 1200);
});
window.brainoMac.onSpeechTranscript((speech) => {
  if (speech.status === "ready") {
    setStatus("listening", "Listening");
    return;
  }
  if (speech.status === "partial" && speech.text) {
    setBubble(speech.text, 0);
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
