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
let wakeWordArmed = false;
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
    logRenderer("voice.latency.turn_summary", {
      turnId: t.id,
      captionFirstMs: seg(t.speechStartedAt, t.captionFirstAt),
      sttMs: seg(t.speechStoppedAt, t.transcriptCompletedAt),
      routeMs: seg(t.transcriptCompletedAt, t.delegateStartedAt),
      thinkMs: seg(t.delegateStartedAt, t.delegateDoneAt),
      ttsMs: seg(t.delegateDoneAt, t.firstAudioAt),
      totalFromStopMs: seg(t.speechStoppedAt, t.firstAudioAt),
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
  // Screen-perimeter glow is a MUSIC-only theatric now (user call): voice
  // states live entirely in the notch — sonar while listening, mouth while
  // speaking, pill glow instead of the whole screen.
  edgeGlow.className = musicTheatricsReady && !herMode ? "music" : "";
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
window.brainoMac.onCoworkLabel?.((payload) => {
  coworkLabel = String(payload?.label || "");
  coworkThinking = String(payload?.thinking || "");
  const active = Boolean(coworkLabel);
  notchFace?.classList.toggle("cowork", active);
  notchFace?.classList.toggle("nf-thinking", active);
  // an arrow hint appears only when there's a full thought to read
  notchFace?.classList.toggle("nf-think-hint", active && Boolean(coworkThinking));
  if (!active) { notchFace?.classList.remove("nf-think-open"); }
  // compact pill shows the short label; the expanded wing shows the sentence
  nfSetThinkingSticky(active && !notchFace?.classList.contains("nf-think-open") ? coworkLabel : coworkThinking);
});

// A sticky variant of nfSetThinking: no 6-second auto-clear, because a real
// task runs for minutes. Cleared explicitly when the label goes empty.
function nfSetThinkingSticky(text) {
  nfThinkingText = String(text || "").trim();
  window.clearTimeout(nfThinkingTimer);
  updateNotchFace();
}

// HOVER the thinking island → it shifts open caption-wide and shows the full
// sentence of what he's doing; leave → it shifts back to the short label.
// Eyes stay centred the whole time (the .captioning geometry). The arrow hint
// (nf-think-hint) tells you it's hoverable.
if (notchFace) {
  const openThink = () => {
    if (!notchFace.classList.contains("nf-thinking") || !coworkThinking) return;
    notchFace.classList.add("nf-think-open", "captioning");
    nfSetThinkingSticky(coworkThinking);
  };
  const closeThink = () => {
    if (!notchFace.classList.contains("nf-think-open")) return;
    notchFace.classList.remove("nf-think-open", "captioning");
    nfSetThinkingSticky(coworkLabel);
  };
  notchFace.addEventListener("mouseenter", openThink);
  notchFace.addEventListener("mouseleave", closeThink);
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
let nfHeardText = "";
let nfCaptionClearTimer = 0;

function nfSetHeard(text) {
  nfHeardText = String(text || "").trim();
  if (nfCapLeftEl) nfCapLeftEl.textContent = nfHeardText;
  window.clearTimeout(nfCaptionClearTimer);
  if (nfHeardText) {
    nfCaptionClearTimer = window.setTimeout(
      () => nfClearCaptions(),
      Math.max(3600, Math.min(9000, nfHeardText.length * 58)),
    );
  }
  updateNotchFace();
}

function nfClearCaptions() {
  window.clearTimeout(nfCaptionClearTimer);
  nfHeardText = "";
  if (nfCapLeftEl) nfCapLeftEl.textContent = "";
  updateNotchFace();
}

// Braino's thinking, shown live in the notch ticker while he works a task —
// the same principle as the extension's dynamic-island step display. You
// should always be able to SEE what he understood and what he's doing.
let nfThinkingText = "";
let nfThinkingTimer = 0;

function nfSetThinking(text) {
  nfThinkingText = String(text || "").trim();
  window.clearTimeout(nfThinkingTimer);
  if (nfThinkingText) {
    nfThinkingTimer = window.setTimeout(() => {
      nfThinkingText = "";
      updateNotchFace();
    }, 6000);
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
  const timer = nfTimers.filter((t) => t.endAt > now).sort((a, b) => a.endAt - b.endAt)[0];
  const calImminent = nfCalendarNext
    && nfCalendarNext.startAt - now < 15 * 60 * 1000
    && nfCalendarNext.startAt > now - 60 * 1000
    ? nfCalendarNext
    : null;

  const sessionEngaged = realtimeActive || realtimeConnecting;
  // Conversation OWNS the notch while a caption is live: the dancer, marquee
  // and activity tickers all yield so the expanded island belongs to the
  // words — they come right back the moment the caption clears.
  const conversationOwnsNotch = sessionEngaged && Boolean(nfHeardText);
  // Thinking lives in the caption wing (same spot as your words), not the
  // bottom ticker — the island expands and the step text reads like a caption.
  if (nfCapLeftEl) nfCapLeftEl.textContent = nfThinkingText || nfHeardText;
  // Two-slot ticker (iPhone island style): primary activity left, a compact
  // secondary on the right wing. Priority: REC > transient system event
  // (charger/headphones) > timer > imminent calendar > WhatsApp > X stats >
  // held files > now playing. Music keeps its full theatric look (dancer +
  // marquee) ONLY when it is alone in the island.
  const slots = [];
  let live = false;
  let music = false;
  if (nfThinkingText || conversationOwnsNotch) {
    // nothing else renders in the ticker this frame
  } else {
    if (meetingRecording) slots.push(`● REC ${fmtMeetingClock(Date.now() - meetingStartedAt)}`);
    else if (screenRecording) slots.push(`● SCREEN ${fmtMeetingClock(Date.now() - screenRecStartedAt)}`);
    if (nfTransient.text && now < nfTransient.until && slots.length < 2) slots.push(nfTransient.text);
    if (timer && slots.length < 2) slots.push(`${timer.label} · ${fmtCountdown(timer.endAt - now)}`);
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
  const line = slots[0] || "";
  nfSetStatus2Text(slots[1] || "");
  notchFace.classList.toggle("dual", visible && slots.length > 1);
  notchFace.classList.toggle("live", visible && live);
  notchFace.classList.toggle("music", visible && music);
  notchFace.classList.toggle("busy", visible && walkerHome && Boolean(nfThinkingText));
  notchFace.classList.toggle("mic-live", visible && sessionEngaged);
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
  notchFace.classList.toggle("captioning", visible && (conversationOwnsNotch || Boolean(nfThinkingText)));
  // While he's home the notch IS the conversation surface: sonar rings while
  // listening, talking mouth + bars while speaking. When he's out on screen,
  // the walker owns the voice theatrics and the notch stays quiet.
  const notchVoice = visible && walkerHome && !herMode;
  notchFace.classList.toggle("listen", notchVoice && ["listening", "hearing"].includes(lastGlowStatus));
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
  if (nfTimers.length || nfCalendarNext || nfWaBadge.count || nfXStats) updateNotchFace();
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

// Boot beats, per spec: open eyes pop up -> they close -> "authenticating"
// with the island glowing -> verdict glows green and the eyes open with it.
// Boot beats — VERBATIM the trybraino.com /founder-letter reveal (user call:
// "the wake-up sequence has to be the same as the website"):
//   eyes form CLOSED in the dark → a slow light draws the island's outline
//   while auth runs underneath → the coral wave floods through him → green
//   verdict, eyes open with the glow → the island spreads caption-wide, he
//   winks, and the wing types "how you doing?" → he stays.
async function runNotchBoot() {
  walkerHome = true; // he is born inside the notch
  setNotchFaceEnabled(true);
  updateNotchFace();
  // Beat 1: his eyes form in the dark, closed (dozing lids, same as the site).
  notchFace?.classList.add("dozing");
  // Auth starts NOW but stays invisible — the theater sequence must match the
  // site exactly: line first, authentication after.
  const authPromise = window.brainoMac.ensureAuth("startup")
    .catch((error) => ({ ok: false, error: error?.message || "Braino sign-in failed." }));
  await wait(900);
  // Beat 2: the very slow line outlines the notch. Nothing else on stage.
  notchFace?.classList.add("nf-shining", "nf-shine-slow");
  await wait(2700);
  notchFace?.classList.remove("nf-shining", "nf-shine-slow");
  // Beat 3: NOW the authenticating pulse, for at least a beat.
  notchFace?.classList.add("nf-auth");
  nfSetStatusText("authenticating");
  const authShownAt = Date.now();
  const result = await authPromise;
  const shown = Date.now() - authShownAt;
  if (shown < 1100) await wait(1100 - shown);
  notchFace?.classList.remove("nf-auth");
  nfSetStatusText("");
  if (!result?.ok) {
    notchFace?.classList.add("nf-auth-err");
    nfSetStatusText("auth failed");
    await wait(900);
    notchFace?.classList.remove("nf-auth-err", "dozing");
    nfSetStatusText("");
    return result || { ok: false, error: "Braino sign-in failed." };
  }
  // Beat 3: the coral wave — his true colors flood through the island.
  notchFace?.classList.add("nf-coral");
  await wait(760);
  notchFace?.classList.remove("nf-coral");
  // Beat 4: green verdict — his eyes open WITH the glow. No status text; the
  // face is the verdict.
  notchFace?.classList.add("nf-auth-ok");
  notchFace?.classList.remove("dozing", "asleep");
  playWakeChime();
  await wait(700);
  notchFace?.classList.remove("nf-auth-ok");
  // Beat 5: the island spreads like it does for captions, he winks, and the
  // wing types his hello.
  notchFace?.classList.add("captioning", "nf-wink");
  const bootCap = notchFace?.querySelector(".nf-cap-l");
  if (bootCap) {
    const line = "how you doing?";
    for (let i = 1; i <= line.length; i++) {
      bootCap.textContent = line.slice(0, i);
      await wait(55);
    }
    await wait(1500);
    bootCap.textContent = "";
  } else {
    await wait(1800);
  }
  notchFace?.classList.remove("captioning", "nf-wink");
  return result;
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

// Beat 3, and the LAST boot beat now: eyes open, a bright greeting glow, and
// he speaks from the notch — asking how the user is doing, and explaining the
// one deterministic way to bring him out ("say come out"). He does NOT pop
// out automatically anymore: popping out only ever happens when explicitly
// asked (handleSummon) or during a deliberate flourish (the music dance can
// announce itself and emerge). This keeps his physical appearance meaningful
// instead of incidental, and sidesteps any hotkey conflict entirely since the
// summon is voice-only, never bound to double-Control.
// Kept simple on purpose (user call): boot is silent — no spoken greeting, no
// auto-started session. Double-Control is the one and only way in and out of
// realtime. The eyes opening after auth IS the greeting.
async function runNotchGreeting(authResult) {
  notchFace?.classList.remove("asleep");
  if (!authResult?.ok) return;
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

// reactToMusicStart is asynchronous (a spoken line, then a fade — a couple of
// real seconds) with nothing stopping it from being called again mid-flight
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
  if (herMode || walkerHome || speaking || processing || voiceTurnInFlight) {
    if (session === musicSessionId) beginMusicTheatrics();
    return;
  }
  walkerAutoHomedByMusic = true;
  try { await speak("Music's on. Let me rest for a bit."); } catch (_) {}
  if (session !== musicSessionId) return; // superseded mid-speech
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
  musicMode = Boolean(on);
  musicSessionId += 1;
  const session = musicSessionId;
  headphones.style.display = musicMode ? "" : "none";
  walker.classList.toggle("music", musicMode);
  if (musicMode) void reactToMusicStart(session);
  else reactToMusicStop();
}

function updateFloatingUi() {
  const bubbleMargin = 22;
  const bubbleX = clamp(posX + W / 2, bubbleMargin, window.innerWidth - bubbleMargin);
  const bubbleY = clamp(posY - 12, 24, window.innerHeight - 90);
  bubble.style.left = `${bubbleX}px`;
  bubble.style.top = `${bubbleY}px`;
}

function setBubble(text, ms = 2600) {
  // While he's home his voice + the notch mouth ARE the reply surface —
  // no text bubble anywhere (user call: don't caption his responses).
  if (walkerHome && notchFaceEnabled && !herMode) return;
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

// While recording (screen or meeting), the mic also picks up tab/system
// audio, which OpenAI transcribes — and Braino must NOT treat that as a
// command. The intelligence layer: during recording, ONLY act on speech that
// addresses him by name OR is a recording control. Everything else is just
// audio being recorded, not an instruction.
const RECORDING_CONTROL_RE = /\b(?:stop|end|finish|pause|done)\b.*\b(?:record|recording|screen|meeting)\b|\b(?:stop|done)\s+recording\b|\bthat'?s (?:enough|it)\b/i;

function shouldAcceptVoiceTranscript(text) {
  const stats = transcriptStats(text);
  if (!stats.normalized || stats.wordCount === 0) return false;
  if ((screenRecording || meetingRecording) && !herMode) {
    // Only his name or a stop/control command breaks through the recording.
    if (!voiceAddressesBraino(text) && !RECORDING_CONTROL_RE.test(text)) {
      logRenderer("voice.recording_ignored", { chars: stats.normalized.length });
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
      const response = await window.brainoMac.tts(line, herMode ? HER_FISH_VOICE_ID : macPersonaRefId());
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
  if (!context?.appName) {
    return [musicLine, tabsLine, "Current Mac surface: unknown yet; answer generally unless the user asks for a concrete Mac action."].filter(Boolean);
  }
  const title = context.browserTitle || context.windowTitle || "";
  return [
    `Current active Mac app: ${context.appName}.`,
    title ? `Current window/tab title: ${title}.` : "",
    context.browserUrl ? `Current browser URL: ${context.browserUrl}.` : "",
    context.isBrowser ? "The user is in a browser window, but Mac Braino does not have live DOM bridge access yet; use the title/URL and route concrete browser actions through delegate." : "",
    musicLine,
    tabsLine,
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
  return /\b(open|launch|start|close|quit|organize|organise|clean|sort|rename|move|delete|trash|create|make|new|create folder|make folder|new folder|undo|find|locate|look for|search for|show me|play|playing|pause|resume|spotify|playlist|volume|vol|sound|louder|quieter|mute|reduce|raise|increase|decrease|lower|percent|seconds?|minutes?|shuffle|repeat|loop|queue|rewind|restart|seek|album|artist|listening to|youtube|song|music|chrome|browser|website|tab|gmail|mail|email|notes|note|maps|calendar|drive|docs|pdf|image|video|file|folder|app|application|send|draft|compose|click|point|where is|reply|write|whatsapp|whats app|remember|remind|timer|countdown|touch id|verify|authenticate|come out|come here|show yourself|step out|join me|go back|go home|get back|head back|head home|tuck in|return home|mesa|coursework|assignment|deadline|ram|cpu|memory|task manager|activity monitor|processes|hogging|eating my|slowing|worth deleting|how many|recover|redundant|bring back|maximize|minimize|snap|half|selected|selection|highlighted|rephrase|rewrite|fix this|mentions|followers|tweet|clip|caption|ship it|x account|ex account|my ex|disturb|bother|check on me|advise|advice|record|recording|meeting|the call|stop recording|wallpaper|desktop background|maps|distance|how far|directions|navigate|route|amazon|shop|options for|research|compare|difference between|send to|my phone|wake word|always listen|call|facetime|face time|dial|watch|tutorial|channel|creator|recommend|read|screen|explain|translate|look at|watching|help me with|summarize|summarise|scroll|download|upload|copy|paste)\b/.test(normalized);
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
  nfSetHeard(transcript);
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
      // Voice personas ("talk like Donald Trump" / "be yourself") must be
      // caught BEFORE the chat/delegate fork — chat was swallowing them.
      let turnText = transcript;
      const personaCmd = macDetectPersonaCommand(transcript);
      if (personaCmd) {
        const outcome = await macApplyPersonaCommand(personaCmd);
        if (outcome.done) return;
        turnText = outcome.remainder;
      }
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
      setStatus("listening", "Listening");
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
      if (!walkerHome) setBubble("Listening...", 0);
      return;
    }
    if (processing || voiceTurnInFlight) {
      setStatus("thinking", "Delegating");
      return;
    }
    setStatus("hearing", "Hearing you");
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
    setStatus("captured", "Got it");
    if (!walkerHome) setBubble("Got it.", 900);
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
      else if (!walkerHome) setBubble(rtUserTranscript.trim() || "Listening...", 0);
      nfSetHeard(rtUserTranscript.trim());
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
    lastEngagedAt = Date.now();
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
  if (progress.text) {
    if (walkerHome && notchFaceEnabled && !herMode) nfSetThinking(progress.text);
    else setBubble(progress.text, 1200);
  }
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

// ══════════════════ Notch tray: the island is touchable now ══════════════════
// Hover near the notch (the main process watches the real cursor, so this
// works even mid-file-drag) → the island springs open into a black-glass tray:
// now playing with artwork + transport, next calendar event with one-click
// Join & record, live timers, battery + headphones, quick actions, and a
// dropped-file shelf Braino can act on. Click the collapsed notch = talk.
// Scroll on it = system volume.

const nfPill = notchFace?.querySelector(".nf-pill");
const nfTrayEl = notchFace?.querySelector(".nf-tray");
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
  const pad = nfExpanded || nfDropDepth > 0 ? 26 : 18;
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
    if (!nfExpanded && !nfExpandTimer) {
      nfExpandTimer = window.setTimeout(() => {
        nfExpandTimer = 0;
        if (nfZoneInsideMain) nfTrayExpand();
      }, 170);
    }
  } else {
    window.clearTimeout(nfExpandTimer);
    nfExpandTimer = 0;
    if (nfDropDepth > 0) {
      nfDropDepth = 0;
      notchFace?.classList.remove("dropping");
    }
    if (nfExpanded && !nfCollapseTimer) {
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

// ── Timers ──
function nfRenderTimers() {
  const list = nfTrayEl?.querySelector(".nf-timerlist");
  if (!list) return;
  const now = Date.now();
  const active = nfTimers.filter((t) => t.endAt > now).sort((a, b) => a.endAt - b.endAt).slice(0, 3);
  list.hidden = active.length === 0;
  list.replaceChildren(...active.map((t) => {
    const row = document.createElement("div");
    row.className = "nf-timer-row";
    const label = document.createElement("span");
    label.textContent = t.label;
    const count = document.createElement("span");
    count.className = "t-count";
    count.textContent = fmtCountdown(t.endAt - now);
    const x = document.createElement("button");
    x.title = "Clear reminders";
    x.textContent = "✕";
    x.addEventListener("click", () => {
      void window.brainoMac.delegate?.("cancel my reminders");
    });
    row.append(label, count, x);
    return row;
  }));
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
