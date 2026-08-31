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
const DICTATION_TRANSCRIPTION_MODEL = "gpt-live-transcribe";
const DICTATION_PREROLL_MAX_SECONDS = 30;
const DICTATION_VAD_MIN_RMS = 0.009;
const DICTATION_VAD_MAX_RMS = 0.045;
const DICTATION_VAD_NOISE_MULTIPLIER = 2.6;
const DICTATION_VAD_SPEECH_CONFIRM_MS = 90;
const DICTATION_VAD_SILENCE_MS = 850;
const DICTATION_VAD_MIN_SPEECH_MS = 180;
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
/* You cut him off, so the next thing transcribed is yours.
 *
 * Barge-in stopped his AUDIO and then shouldAcceptVoiceTranscript threw the
 * words away, because `speaking` was still true when they arrived and the
 * command was not addressed to him by name. So he went quiet, looked like he
 * was listening, and did nothing — the command only landed if you repeated it
 * after he finished. This flag carries "the interruption was real" across that
 * gap. Set only by a genuine speech_started barge-in, consumed once, and it
   expires: a cough that cuts him off must not hand a free pass to whatever is
   transcribed a minute later. */
let rtBargeInAt = 0;
/* When your sentence first appeared, and the shortest time it may hold the box.
 *
 * The three states hand over: You said -> Thinking -> his reply. Without a floor
 * a fast route swapped the caption out in a couple of hundred milliseconds and
 * you never read your own words back. Slow work still moves on the instant it
 * passes the floor, so this costs nothing on the runs that matter. */
let nfHeardShownAt = 0;
const NF_HEARD_MIN_MS = 1100;
const BARGE_IN_TRANSCRIPT_WINDOW_MS = 8000;
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
let mondayModeActive = false;
let dictationMode = false;
let dictationStarting = false;
let dictationStopping = false;
let dictationStopRequestedSource = "";
let dictationStartGeneration = 0;
let realtimeStartGeneration = 0;
let dictationPendingTurns = 0;
let dictationTurnOrder = [];
let dictationTurns = new Map();
let dictationConsumedTurnIds = new Set();
let dictationSessionChunks = [];
let dictationSessionTurns = [];
let dictationSpeechActive = false;
let dictationManualCommitPending = false;
let dictationBufferedAudioMs = 0;
let dictationBufferedHasSpeech = false;
/* Audio duration carried by the most recent commit, used to size the drain
   wait so short sessions are not cut off before the transcript returns. */
let lastCommittedAudioMs = 0;
let dictationNoiseReduction = "far_field";
// Voice mode used to hardcode `near_field`, which tells OpenAI the mic is at your mouth.
// On the built-in array that scrubs an arm's-length voice as if it were room noise — the
// reason talking to Braino meant leaning into the screen. Dictation already picked this
// per-mic; voice now uses the same verdict.
let realtimeNoiseReduction = "far_field";
const NEAR_FIELD_MIC_RE = /airpods?|head(?:set|phones?)|earbuds?|earphones?|bluetooth|usb|external|lavalier|lapel|rode|shure|yeti|blue snowball|jabra|bose|sony wh|galaxy buds/i;

function pickNoiseReduction(micLabel) {
  return NEAR_FIELD_MIC_RE.test(String(micLabel || "")) ? "near_field" : "far_field";
}
let rtDictationVad = null;
let rtDictationPreroll = null;
let voiceCycleInFlight = false;
let voiceTurnInFlight = false;
/* When the in-flight turn started, and which turn it is.
 *
 * A delegate turn used to own the microphone for as long as it took, and a HIL
 * run takes minutes. Everything said during one was dropped on the floor at the
 * gate below, which is why giving him a second task mid-run did nothing at all:
 * the interruption never left this file, so the main process never got the
 * chance to drop the old run. */
let voiceTurnStartedAt = 0;
/* Sounds people make while thinking, which are not instructions.
 *
 * A real session has the single word "well" starting a whole turn. Kept to
 * things that mean nothing on their own: "yes", "okay" and "no" are deliberately
 * absent, because those are how you answer him. */
const VOICE_FILLER_ONLY = /^(?:well|so|hmm+|hm|uh+|um+|er+|ah+|oh+|anyway|right|like|mhm|huh|you know)[\s.,!?]*$/i;
let voiceTurnToken = 0;
/* Long enough that a stray echo of his own voice cannot interrupt him, short
   enough that a person who has changed their mind is heard immediately. */
const VOICE_TURN_INTERRUPT_AFTER_MS = 2500;
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
// `ts` is when the reply was ISSUED; `endedTs` is when his voice actually stopped coming
// out of the speakers. The echo guard anchors to endedTs, because those two can be twenty
// seconds apart on a long answer. See shouldAcceptVoiceTranscript.
let lastSpokenLine = { text: "", ts: 0, endedTs: 0, duringRealtime: false };
// How long his voice can still be arriving at the mic after he stops speaking. This covers
// speaker ring-out and the transcription lag on his last few words, nothing more.
const POST_SPEECH_ECHO_MS = 2000;
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

// One line per finished turn to the shared interaction log. main.cjs owns the
// request (auth, timeout, the endpoint); this side only says what the turn
// looked like from here: the words each way, the path that answered, the mode
// he was in, and how long the user waited for the first sound. Never awaited,
// never allowed to throw into the turn that produced it.
function currentInteractionMode() {
  if (herMode) return "her";
  if (dictationMode) return "hera";
  if (meetingRecording) return "meeting";
  if (macTeamState?.active) return "team";
  if (mondayModeActive) return "monday";
  if (activeVoiceMode?.name) return `voice_mode:${activeVoiceMode.name}`;
  if (coworkEnabled) return "cowork";
  if (musicMode) return "music";
  return null;
}

// user-turn-end → first audible reply, from the per-turn latency record the
// voice pipeline already keeps. Null when this turn was not spoken (typed,
// greeting) or never reached audio.
function voiceTurnFirstAudioMs() {
  if (!voiceTurnInFlight) return null;   // otherwise a typed/native turn reports the previous realtime turn's latency
  const turn = voiceLatencyTurn;
  if (!turn?.speechStoppedAt || !turn.firstAudioAt) return null;
  return Math.max(0, Math.round(turn.firstAudioAt - turn.speechStoppedAt));
}

function logInteraction(event = {}) {
  try {
    const pending = window.brainoMac.logInteraction?.({ mode: currentInteractionMode(), ...event });
    if (pending?.catch) pending.catch(() => {});
  } catch (_) {}
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
    targetX = posX;
    targetY = posY;
    nextTargetAt = performance.now() + 2200;
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

// Which character this desktop companion shows. Same voice,
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
  walker.classList.remove("mascot-braino", "mascot-brainelle", "mascot-webb", "mascot-ferro");
  walker.classList.add(`mascot-${mascotId}`);
  walkerFlip.innerHTML = svg;
  root = walker.querySelector("#__sbwk_root__");
  renderBrainoScale();
}

function setMascotChoice(id, { save = true, remount = save } = {}) {
  const next = id === "webb" || id === "ferro" || id === "brainelle" ? id : "braino";
  const changed = next !== mascotChoice;
  mascotChoice = next;
  walker.classList.toggle("mascot-braino", mascotChoice === "braino");
  walker.classList.toggle("mascot-brainelle", mascotChoice === "brainelle");
  walker.classList.toggle("mascot-webb", mascotChoice === "webb");
  walker.classList.toggle("mascot-ferro", mascotChoice === "ferro");
  renderMascotChoice();
  // ONE switch, not two. Picking Brainelle as the avatar IS the character
  // switch, so her voice, her name and the pink notch follow the rig. Webb and
  // Ferro are rigs only — same Braino voice and name underneath, as before.
  void macSetCharacter(mascotChoice === "brainelle" ? "brainelle" : "braino", { announce: changed && save });
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

/* The deterministic commands, caught before the chat fork.
 *
 * These have to be handled here for the same reason the persona and grow
 * commands are: chat answers them as conversation and the intent chain in the
 * main process never sees a word. A real session logged "turn yourself orange"
 * producing no delegate run at all, and "Braino, can you please dance?" going
 * straight to realtime_chat.
 *
 * It is a class of bug rather than an instance. Every new trick phrased politely
 * lands in it, so this is one door and everything cheap and certain goes behind
 * it, rather than a new special case each time. */
async function runQuickVoiceCommand(text) {
  const said = String(text || "").trim();
  if (!said) return false;
  let outcome = null;
  try {
    outcome = await window.brainoMac.quickCommand?.(said);
  } catch (error) {
    logRenderer("voice.quick_command_failed", { error: String(error) });
    return false;
  }
  if (!outcome || !outcome.handled) return false;
  logRenderer("voice.quick_command", { chars: said.length });
  if (outcome.say) await speak(outcome.say);
  return true;
}

function getDockBounds() {
  const sideInset = Math.max(54, window.innerWidth * 0.03);
  const measuredDockTop = Number(displayMetrics?.dockTop || 0);
  const dockTop = measuredDockTop > 0
    ? clamp(measuredDockTop, 90, window.innerHeight - 20)
    : window.innerHeight - ESTIMATED_DOCK_HEIGHT;
  // Braino's feet should meet the Dock's top edge. The old extra 42px "perch"
  // lift visibly floated him above the Dock instead.
  const y = clamp(dockTop - H, 54, Math.max(54, window.innerHeight - H - 10));
  return {
    minX: sideInset,
    maxX: Math.max(sideInset, window.innerWidth - sideInset - W),
    y,
    snapThresholdY: dockTop - H - 38,
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
  // screenY is a global desktop coordinate while the display bounds can begin
  // above or below the primary screen. Treating it as a display-local offset
  // made --nf-notch-h collapse to zero on vertically arranged displays, which
  // pulled labels and Done controls into the physical notch/menu-bar strip.
  const winY = typeof window.BrainoNotchResponse?.relativeWindowTop === "function"
    ? window.BrainoNotchResponse.relativeWindowTop(window.screenY, displayMetrics.bounds?.y)
    : Math.max(0, Number(window.screenY || 0) - Number(displayMetrics.bounds?.y || 0));
  const inner = Math.max(0, (displayMetrics.notch?.height || menuBarH) - winY);
  document.getElementById("notch-face")?.style.setProperty("--nf-notch-h", `${inner}px`);
  // The response sheets used to cap themselves with `calc(100vh - 90px)`, but in
  // this overlay 100vh is the WINDOW, and the window is resized to whatever the
  // sheet last asked for. A compact window therefore imposed a compact ceiling,
  // and the sheet could never grow past it. Hand CSS the screen height instead,
  // so a long answer flows open to the display rather than to its own shadow.
  const screenH = Number(displayMetrics.bounds?.height);
  if (Number.isFinite(screenH) && screenH > 200) {
    document.getElementById("notch-face")?.style.setProperty("--nf-screen-h", `${screenH}px`);
  }
  if (displayMetrics.notch?.width) {
    document.getElementById("notch-face")?.style.setProperty("--nf-notch-w", `${displayMetrics.notch.width}px`);
  }
  document.getElementById("notch-face")?.classList.toggle("no-notch", !displayMetrics.notch);
  logRenderer("nf.anchor", {
    menuBarH,
    winY,
    inner,
    notch: displayMetrics.notch || null,
    // If this is missing, response sheets fall back to 100vh — the overlay
    // window — and a long answer freezes at ~210px with the rest scrolled out
    // of sight. It is the single value that decides whether the notch can grow.
    screenH: Number.isFinite(screenH) ? screenH : null,
  });
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

/* Braino OS is his own body, so it has to answer to the same state the notch
   does: leaning into the light while he thinks, burning while he speaks. */
function syncBrainoOsState(status, text) {
  const os = window.__brainoOs;
  if (!os || !os.isOpen()) return;
  const live = ["connecting", "listening", "hearing", "captured", "speaking"].includes(status);
  const energy = status === "speaking" ? 1 : status === "thinking" ? 0.7 : live ? 0.35 : 0;
  os.setState({
    energy,
    thinking: status === "thinking",
    live,
    label: (text || status || "IDLE").toUpperCase(),
  });
}

function setStatus(status, text) {
  syncBrainoOsState(status, text);
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

// Whoever sets "thinking" is supposed to set the terminal state too, and every
// early return, barge-in, and forgotten status on the way out of a turn left
// lastGlowStatus stuck there. That matters more than a wrong pill:
// updateNotchFace re-derives processingActive from lastGlowStatus, so a stuck
// "thinking" kept restarting the Thinking → Hatching → Deciding → Calibrating
// cycle no matter how many times the caption itself was cleared. One settle
// point for every one of those exits. It only touches a STALE status: while a
// turn, a speech job or a realtime response is genuinely in flight it does
// nothing, so it is safe to call from any exit path.
function settleStaleThinkingStatus(reason, options = {}) {
  const stale = lastGlowStatus === "thinking"
    || (options.includeSpeaking && lastGlowStatus === "speaking");
  if (!stale) return false;
  if (processing || speaking || voiceTurnInFlight || realtimeResponseInFlight) return false;
  if (realtimeActive || listening) setStatus("listening", dictationMode ? "BrainoHERA" : "Listening");
  else setStatus("ready", "Double Space to show/hide");
  logRenderer("status.stale_thinking.settled", { reason, realtimeActive, listening });
  return true;
}

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
let launchDemoNowPlaying = false;

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
  if (skitRunning || skitJustCompleted) return; // skit isolation: no ambient during/after demo
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
/* His working, kept.
 *
 * The expanded sheet used to render coworkThinkingHistory.slice(-2) — a
 * DIFFERENT feature's history, capped at two rows. HIL's own steps arrived
 * through nfSetThinking and were written straight over the top of each other,
 * so opening the panel showed one line and two stale cowork rows, never the
 * reasoning. Collapsed shows the latest step alone; open shows all of it. */
let hilThinkingHistory = [];
const HIL_THINKING_HISTORY_MAX = 40;
let coworkCompletionTimer = 0;
const nfThinkingCanvas = notchFace?.querySelector(".nf-thinking-canvas");
const nfThinkChipText = notchFace?.querySelector(".nf-think-chip-text");
const nfThinkingHead = notchFace?.querySelector(".nf-thinking-head");
const nfThinkingLines = notchFace?.querySelector(".nf-thinking-lines");
const nfThinkingCurrent = notchFace?.querySelector(".nf-thinking-current");
const nfThinkingState = notchFace?.querySelector(".nf-thinking-state");
const nfThinkingTrail = notchFace?.querySelector(".nf-thinking-trail");
const nfFlowPrompt = notchFace?.querySelector(".nf-flow-prompt span");
const nfFlowResponse = notchFace?.querySelector(".nf-flow-response span");
const nfAnswerSurface = notchFace?.querySelector(".nf-answer-surface");
const nfAnswerShortText = notchFace?.querySelector(".nf-answer-short-text");
const nfAnswerBody = notchFace?.querySelector(".nf-answer-body");
const nfAnswerLabel = notchFace?.querySelector(".nf-answer-label");
const nfAnswerArticle = notchFace?.querySelector(".nf-answer-surface article");
const nfAnswerLongHead = notchFace?.querySelector(".nf-answer-long-head");
const notchResponseApi = window.BrainoNotchResponse || {};
const THINKING_PHASES = ["Thinking", "Hatching", "Deciding", "Calibrating"];
const NF_COMPACT_SURFACE_WIDTH = 480;
const NF_READING_SURFACE_WIDTH = 580;
let thinkingPhaseIndex = 0;
let thinkingPhaseTimer = 0;
let nfFlowPromptText = "";
let nfFlowResponseText = "";
let nfAnswerMode = "";
/* The short/long class, frozen for the life of one answer.
 *
 * renderNotchAnswer reclassifies from whatever text it currently holds, and
 * streaming used to call it per token, so a reply crossed the 100-char boundary
 * mid-sentence and the sheet re-laid-out under the words. One session logged a
 * reply going short -> long -> short while it was being typed. Decide once on
 * the first paint, and revisit only when the answer is complete. */
let nfAnswerModeLocked = "";
/* Is the typing field up?
 *
 * Right at the top with the other notch state, because three different things
 * read it and they are scattered: startNotchAnswer (which puts the field away
 * when a reply takes the box), syncInlineVoiceSurface (which keeps the caption
 * open while it is up), and the click-to-talk handler (which must not start the
 * microphone when you click into a text box). `let` is not hoisted, so any of
 * those running above the declaration would throw rather than read false. */
let typingOpen = false;
let nfAnswerText = "";
let nfAnswerGeneration = 0;
let nfAnswerCompletedWords = 0;
let nfAnswerWords = [];
let nfAnswerRaf = 0;
let nfAnswerLingerTimer = 0;
let nfAnswerExitTimer = 0;
let nfSurfaceExitTimer = 0;
let nfAnswerForcedLong = false;
let nfAnswerLastScrollIndex = -1;
const NF_SHORT_ANSWER_HEIGHT = 146;
let nfAnswerPanelHeight = NF_SHORT_ANSWER_HEIGHT;
let nfAnswerFixedHeight = 0;
let nfThinkingPanelHeight = 280;

function cancelNotchSurfaceExit() {
  window.clearTimeout(nfSurfaceExitTimer);
  nfSurfaceExitTimer = 0;
  notchFace?.classList.remove("nf-surface-exiting");
}

function beginNotchSurfaceExit() {
  cancelNotchSurfaceExit();
  notchFace?.classList.add("nf-surface-exiting");
  nfSurfaceExitTimer = window.setTimeout(() => {
    notchFace?.classList.remove("nf-surface-exiting");
    nfSurfaceExitTimer = 0;
  }, 560);
}

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
  /* The moment a conversation turns out to have contained a job. Same look as
     Thinking and Calibrating on purpose: it is the same shimmer, so it reads as
     one more phase of him working rather than a different kind of event. */
  if (/\btaking it on\b/.test(source)) {
    return { state: "Taking it on", className: "" };
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
  /* The collapsed line. One sentence, whole where it fits and ellipsed by CSS
     where it does not, rather than the four characters the old caption slot
     allowed. */
  /* The chip is the phase word and nothing else: Thinking, Hatching, Deciding,
     Calibrating. It used to carry his actual step ("Reading the current context
     and understanding what matters"), truncated at 64 characters, which is a
     sentence nobody can read in the second it is on screen and is the reason
     the collapsed notch looked busy. The step text still exists — it is what
     the arrow opens. */
  if (nfThinkChipText) nfThinkChipText.textContent = presentation.state;
  if (nfThinkingState) nfThinkingState.textContent = presentation.state;
  if (nfThinkingCanvas) nfThinkingCanvas.dataset.state = presentation.state;
  if (nfFlowPrompt) {
    nfFlowPrompt.textContent = nfFlowPromptText
      ? `You said: ${compactFlowText(nfFlowPromptText, 102)}`
      : "Reading the page and understanding what matters.";
  }
  if (nfFlowResponse) {
    nfFlowResponse.textContent = nfFlowResponseText
      ? compactFlowText(nfFlowResponseText, 112)
      : "Preparing the answer in your context.";
  }
  notchFace?.classList.remove("nf-think-waiting", "nf-think-failed", "nf-think-complete");
  if (presentation.className) notchFace?.classList.add(presentation.className);

  if (nfThinkingTrail) {
    /* Open means "show me everything you did"; collapsed keeps one line in the
       chip above and at most a hint of the two before it. */
    const opened = Boolean(notchFace?.classList.contains("nf-think-open"));
    const source = hilThinkingHistory.length ? hilThinkingHistory : coworkThinkingHistory;
    const steps = opened ? source.slice(0, -1) : source.slice(-2);
    nfThinkingTrail.replaceChildren(...steps.map((step) => {
      const row = document.createElement("div");
      row.className = "nf-thinking-step";
      const text = document.createElement("span");
      text.textContent = step;
      row.appendChild(text);
      return row;
    }));
  }
  if (notchFace?.classList.contains("nf-think-open")) {
    window.requestAnimationFrame(syncOpenThinkingZone);
  }
}

function renderedThinkingHeight() {
  if (!nfThinkingCanvas || !nfThinkingHead || !nfThinkingLines) return 280;
  const style = window.getComputedStyle(nfThinkingCanvas);
  const contentHeight = (
    (Number.parseFloat(style.paddingTop) || 0)
    + nfThinkingHead.getBoundingClientRect().height
    + nfThinkingLines.scrollHeight
    + (Number.parseFloat(style.paddingBottom) || 0)
    + 14
  );
  return Math.round(Math.max(280, Math.min(notchViewportHeight() - 70, contentHeight)));
}

function syncOpenThinkingZone() {
  if (!notchFace?.classList.contains("nf-think-open")) return;
  nfThinkingPanelHeight = renderedThinkingHeight();
  notchFace.querySelector(".nf-pill")?.style.setProperty(
    "--nf-thinking-height",
    `${nfThinkingPanelHeight}px`,
  );
  window.brainoMac.setNotchZone?.({
    expanded: true,
    width: NF_READING_SURFACE_WIDTH,
    height: nfThinkingPanelHeight,
  });
}

function canUseNotchResponseSurface() {
  return Boolean(
    notchFace
    && notchFaceEnabled
    && !startupActive
    && !herMode
    && !dictationMode
    && !dictationStopping
  );
}

// "Open YouTube" used to take half a second. Then the thinking sheet started
// appearing on every single command — Thinking, Hatching, Deciding — and a
// half-second action began LOOKING like a four-second one, because the panel
// animates in, cycles a phase, and only then gets replaced by the answer.
//
// So don't show it until the work has actually earned it. Anything that finishes
// inside this window never renders a thinking sheet at all; the user just sees it
// happen. Slow work still gets the full disclosure surface, which is what it was
// built for.
const NF_THINKING_REVEAL_MS = 900;
let nfThinkingOpenTimer = 0;

/* Did the person open this, or did he?
 *
 * Every new thinking step called openNotchThinking, which removed nf-think-open
 * to start clean. So while he worked, the panel you had just opened closed
 * itself under your hand, and your next click opened it again: "it disappears,
 * then it opens up again with the same thinking, and I have to click twice".
 *
 * Nothing automatic may close a surface a person opened. That is the whole
 * rule, and this flag is the whole implementation. */
let nfThinkingPinned = false;

/* The chip is the only interactive thing in the collapsed island, so the
   clickable zone has to actually cover it. Sized to the island in CSS. */
const NF_THINK_ISLAND_WIDTH = 430;
const NF_THINK_ISLAND_HEIGHT = 92;

function nfSyncThinkingZone() {
  if (!notchFace?.classList.contains("nf-thinking")) return;
  if (notchFace.classList.contains("nf-think-open")) {
    syncOpenThinkingZone();
    return;
  }
  window.brainoMac.setNotchZone?.({
    expanded: true,
    width: NF_THINK_ISLAND_WIDTH,
    height: NF_THINK_ISLAND_HEIGHT,
  });
}

function nfSetThinkingOpen(open) {
  if (!notchFace) return;
  nfThinkingPinned = Boolean(open);
  notchFace.classList.toggle("nf-think-open", nfThinkingPinned);
  notchFace.classList.remove("captioning");
  const chip = notchFace.querySelector(".nf-think-chip");
  if (chip) chip.setAttribute("aria-expanded", nfThinkingPinned ? "true" : "false");
  if (nfThinkingPinned) {
    cancelNotchSurfaceExit();
    window.requestAnimationFrame(syncOpenThinkingZone);
  } else {
    beginNotchSurfaceExit();
    notchFace.querySelector(".nf-pill")?.style.removeProperty("--nf-thinking-height");
    nfSyncThinkingZone();
  }
}

function cancelPendingNotchThinking() {
  if (!nfThinkingOpenTimer) return;
  window.clearTimeout(nfThinkingOpenTimer);
  nfThinkingOpenTimer = 0;
}

function scheduleNotchThinking(prompt, detail) {
  cancelPendingNotchThinking();
  nfThinkingOpenTimer = window.setTimeout(() => {
    nfThinkingOpenTimer = 0;
    openNotchThinking(prompt, detail);
  }, NF_THINKING_REVEAL_MS);
}

function openNotchThinking(prompt, detail = "Separating the useful signal from the repetition.") {
  cancelPendingNotchThinking();
  if (!canUseNotchResponseSurface()) return false;
  hilThinkingHistory = [];
  cancelNotchSurfaceExit();
  window.clearTimeout(nfAnswerLingerTimer);
  nfFlowPromptText = String(prompt || nfFlowPromptText || "").trim();
  nfFlowResponseText = "";
  nfThinkingText = String(detail || "Working on your request").trim();
  window.clearTimeout(nfThinkingTimer);
  startThinkingPhaseCycle();
  renderThinkingCanvas("Thinking", nfThinkingText);
  notchFace.classList.remove("nf-answer-open", "nf-answer-short", "nf-answer-long", "captioning");
  /* nf-think-open is deliberately NOT in that list. A step arriving is not a
     reason to close a panel the person is reading. */
  if (!nfThinkingPinned) notchFace.classList.remove("nf-think-open");
  notchFace.classList.add("nf-thinking", "nf-think-hint");
  /* The chip is the one thing you can click while he works, so the zone covers
     the island rather than hugging the physical housing. It goes back the
     moment thinking ends. */
  nfSyncThinkingZone();
  updateNotchFace();
  return true;
}

function normalizedNotchAnswer(text) {
  if (typeof notchResponseApi.normalizeNotchAnswer === "function") {
    return notchResponseApi.normalizeNotchAnswer(text);
  }
  return String(text || "").trim();
}

function classifyMacNotchAnswer(text, options = {}) {
  if (typeof notchResponseApi.classifyNotchAnswer === "function") {
    return notchResponseApi.classifyNotchAnswer(text, options);
  }
  const normalized = normalizedNotchAnswer(text);
  return { kind: options.rich || normalized.length >= 240 ? "long" : "short", text: normalized };
}

function appendNotchAnswerWords(parent, text, startIndex = 0) {
  let index = startIndex;
  String(text || "").split(/(\s+)/).forEach((token) => {
    if (!token) return;
    if (/^\s+$/.test(token)) {
      parent.appendChild(document.createTextNode(token));
      return;
    }
    const word = document.createElement("span");
    word.className = "nf-answer-word";
    word.dataset.wordIndex = String(index);
    word.textContent = token;
    parent.appendChild(word);
    index += 1;
  });
  return index;
}

function notchAnswerBlocks(text) {
  if (typeof notchResponseApi.splitNotchAnswerBlocks === "function") {
    return notchResponseApi.splitNotchAnswerBlocks(text);
  }
  return [{ type: "paragraph", text: normalizedNotchAnswer(text) }];
}

function renderedLongAnswerHeight() {
  if (!nfAnswerArticle || !nfAnswerBody || !nfAnswerLongHead) return 0;
  const articleStyle = window.getComputedStyle(nfAnswerArticle);
  const headStyle = window.getComputedStyle(nfAnswerLongHead);
  const labelStyle = nfAnswerLabel ? window.getComputedStyle(nfAnswerLabel) : null;
  const labelHeight = nfAnswerLabel?.getBoundingClientRect().height || 0;
  const contentHeight = (
    nfAnswerLongHead.getBoundingClientRect().height
    + (Number.parseFloat(headStyle.marginTop) || 0)
    + (Number.parseFloat(articleStyle.paddingTop) || 0)
    + labelHeight
    + (labelHeight ? (Number.parseFloat(labelStyle?.marginBottom || "0") || 0) : 0)
    + nfAnswerBody.scrollHeight
    + (Number.parseFloat(articleStyle.paddingBottom) || 0)
    + 2
  );
  if (typeof notchResponseApi.fitLongAnswerHeight === "function") {
    return notchResponseApi.fitLongAnswerHeight(contentHeight, notchViewportHeight());
  }
  return Math.round(Math.max(164, Math.min(notchViewportHeight() - 90, contentHeight)));
}

function applyLongAnswerHeight(height) {
  const nextHeight = Math.round(Number(height) || 0);
  if (!nextHeight) return;
  nfAnswerPanelHeight = nextHeight;
  notchFace?.querySelector(".nf-pill")?.style.setProperty("--nf-answer-long-height", `${nextHeight}px`);
}

// How tall a response sheet is ALLOWED to get.
//
// This used to be window.innerHeight, which is the overlay window — and the
// overlay is resized to whatever the sheet asked for last. So the ceiling was
// derived from the very thing it was capping: a compact window meant a compact
// maximum, which kept the window compact. A 1,245 character answer got the same
// two visible lines as a one-liner and scrolled the rest away behind a hidden
// scrollbar, instead of flowing open the way the Chrome long-answer sheet does.
//
// The real ceiling is the display. Ask the screen, not the window.
function notchViewportHeight() {
  const screenHeight = Number(displayMetrics?.bounds?.height);
  if (Number.isFinite(screenHeight) && screenHeight > 200) return screenHeight;
  return window.innerHeight;
}

function refitOpenLongAnswer(generation = nfAnswerGeneration) {
  if (
    generation !== nfAnswerGeneration
    || nfAnswerMode !== "long"
    || !notchFace?.classList.contains("nf-answer-open")
    || nfAnswerFixedHeight
  ) return;
  const measured = renderedLongAnswerHeight();
  if (!measured || measured === nfAnswerPanelHeight) return;
  applyLongAnswerHeight(measured);
  window.brainoMac.setNotchZone?.({ expanded: true, width: NF_READING_SURFACE_WIDTH, height: measured });
}

function renderNotchAnswer() {
  if (!nfAnswerSurface || !nfAnswerShortText || !nfAnswerBody) return;
  const presentation = classifyMacNotchAnswer(nfAnswerText, { rich: nfAnswerForcedLong });
  /* One way only: short may become long, long never goes back.
   *
   * The lock was added because reclassifying on every streamed token made the
   * notch flap between two surfaces mid-sentence. It was too strong. A reply
   * is classified from its first few words, and a reply that starts short and
   * keeps going stayed pinned to the small single-row surface, so the text ran
   * out past the rounded edges and over the page behind it. Growing is not
   * flapping: it happens at most once per reply and only in the direction that
   * makes room. */
  nfAnswerMode = nfAnswerModeLocked === "long" || presentation.kind === "long" ? "long" : "short";
  nfAnswerModeLocked = nfAnswerMode;
  nfAnswerText = presentation.text;
  notchFace?.classList.toggle("nf-answer-short", nfAnswerMode === "short");
  notchFace?.classList.toggle("nf-answer-long", nfAnswerMode === "long");

  nfAnswerShortText.replaceChildren();
  appendNotchAnswerWords(nfAnswerShortText, nfAnswerText.replace(/\s+/g, " "));

  nfAnswerBody.replaceChildren();
  let wordIndex = 0;
  notchAnswerBlocks(nfAnswerText).forEach((block) => {
    const el = document.createElement(block.type === "heading" ? "h2" : "p");
    el.className = `nf-answer-block nf-answer-${block.type}`;
    wordIndex = appendNotchAnswerWords(el, block.text, wordIndex);
    nfAnswerBody.appendChild(el);
  });

  const activeRoot = nfAnswerMode === "long" ? nfAnswerBody : nfAnswerShortText;
  nfAnswerWords = Array.from(activeRoot.querySelectorAll(".nf-answer-word"));
  nfAnswerCompletedWords = Math.min(nfAnswerCompletedWords, nfAnswerWords.length);
  if (nfAnswerLabel) {
    const onPage = Boolean(activeMacContext?.browserUrl)
      || /\b(?:chrome|safari|arc|firefox|edge)\b/i.test(activeMacContext?.appName || "");
    notchFace?.classList.toggle("nf-answer-context-page", onPage);
    nfAnswerLabel.textContent = onPage ? "Answer from this page" : "Braino answer";
  }
  if (nfAnswerMode === "long") {
    if (nfAnswerFixedHeight) {
      applyLongAnswerHeight(nfAnswerFixedHeight);
    } else {
      const height = typeof notchResponseApi.estimateLongAnswerHeight === "function"
        ? notchResponseApi.estimateLongAnswerHeight(nfAnswerText, notchViewportHeight())
        : Math.min(notchViewportHeight() - 90, 520);
      applyLongAnswerHeight(height);
      const measured = renderedLongAnswerHeight();
      if (measured) applyLongAnswerHeight(measured);
      const renderGeneration = nfAnswerGeneration;
      // The article scrolls with a hidden scrollbar, so an undersized sheet does
      // not look scrollable — it looks like the sentence just stops. A single
      // rAF fires ~16ms in, while the pill is still sliding from notch width to
      // 580px, so it measures the copy wrapped into the wrong column width.
      // Re-measure across the transition, same as the short sheet.
      window.requestAnimationFrame(() => refitOpenLongAnswer(renderGeneration));
      NF_ANSWER_REFIT_DELAYS_MS.forEach((delay) => {
        window.setTimeout(() => refitOpenLongAnswer(renderGeneration), delay);
      });
      void document.fonts?.load('500 17px "Braino SF Pro Display"').then(() => {
        refitOpenLongAnswer(renderGeneration);
      }).catch(() => {});
    }
  } else {
    applyShortAnswerHeight(measureShortAnswerHeight());
    scheduleShortAnswerRefit(nfAnswerGeneration);
  }
  paintNotchAnswer(nfAnswerCompletedWords);
}

// Shared by both the short and long sheets. The pill animates from notch width
// out to its full width over 420ms. Measuring during that
// slide reads the text wrapped into a narrow column and reports a wildly too
// tall panel (352px of "text" for three lines of copy). Re-measure as the width
// settles and once the display font is actually loaded; each pass only writes a
// CSS custom property, which the existing height transition animates smoothly.
const NF_ANSWER_REFIT_DELAYS_MS = [140, 320, 480];

function refitOpenShortAnswer(generation = nfAnswerGeneration) {
  if (
    generation !== nfAnswerGeneration
    || nfAnswerMode !== "short"
    || !notchFace?.classList.contains("nf-answer-open")
    || nfAnswerFixedHeight
  ) return;
  applyShortAnswerHeight(measureShortAnswerHeight());
}

function scheduleShortAnswerRefit(generation) {
  window.requestAnimationFrame(() => refitOpenShortAnswer(generation));
  NF_ANSWER_REFIT_DELAYS_MS.forEach((delay) => {
    window.setTimeout(() => refitOpenShortAnswer(generation), delay);
  });
  void document.fonts?.load('500 17px "Braino SF Pro Display"')
    .then(() => refitOpenShortAnswer(generation))
    .catch(() => {});
}

// A short answer was pinned to NF_SHORT_ANSWER_HEIGHT with a two-line clamp, so
// anything longer than two lines was chopped mid-sentence with an ellipsis
// ("...narrowing down what you're focusing on. What's the next step you have
// in…"). Measure the row the same way the long sheet measures its article, and
// let the island stretch instead.
function measureShortAnswerHeight() {
  const row = notchFace?.querySelector(".nf-answer-short-row");
  if (!row || !nfAnswerShortText) return NF_SHORT_ANSWER_HEIGHT;
  const rowStyle = window.getComputedStyle(row);
  const content = (
    (Number.parseFloat(rowStyle.paddingTop) || 0)
    + (nfAnswerShortText.scrollHeight || 0)
    // The uppercase "BRAINO" label sits above the text inside the same grid.
    + (row.querySelector("small")?.getBoundingClientRect().height || 0)
    + 5 /* grid gap between label and text */
    + (Number.parseFloat(rowStyle.paddingBottom) || 0)
    + 2
  );
  return Math.round(Math.max(NF_SHORT_ANSWER_HEIGHT, Math.min(320, content)));
}

function applyShortAnswerHeight(height) {
  const next = Math.round(Number(height) || 0) || NF_SHORT_ANSWER_HEIGHT;
  nfAnswerPanelHeight = next;
  notchFace?.querySelector(".nf-pill")?.style.setProperty("--nf-answer-short-height", `${next}px`);
}

function paintNotchAnswer(highlightedWords) {
  if (!nfAnswerWords.length) return;
  const count = Math.max(0, Math.min(nfAnswerWords.length, Math.floor(highlightedWords)));
  nfAnswerWords.forEach((word, index) => {
    word.classList.toggle("spoken", index < count);
    word.classList.toggle("speaking-now", index === count && count < nfAnswerWords.length);
  });
  if (
    nfAnswerMode === "long"
    && count < nfAnswerWords.length
    && count !== nfAnswerLastScrollIndex
    && (count === 0 || count - nfAnswerLastScrollIndex >= 7)
  ) {
    nfAnswerLastScrollIndex = count;
    const activeWord = nfAnswerWords[count];
    if (activeWord && nfAnswerArticle) {
      const articleRect = nfAnswerArticle.getBoundingClientRect();
      const wordRect = activeWord.getBoundingClientRect();
      if (wordRect.bottom > articleRect.bottom - 24 || wordRect.top < articleRect.top + 24) {
        activeWord.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }
}

function startNotchAnswer(text, generation, options = {}) {
  const normalized = normalizedNotchAnswer(text);
  if (!normalized || !canUseNotchResponseSurface()) return false;
  // The answer beat the reveal timer, so the thinking sheet never needs to exist.
  // Without this a fast command still flashed Thinking for one frame on its way
  // to the answer, which is the flicker that made quick actions feel slow.
  cancelPendingNotchThinking();
  cancelNotchSurfaceExit();
  const sameAnswer = nfAnswerGeneration === generation && notchFace?.classList.contains("nf-answer-open");
  window.clearTimeout(nfAnswerLingerTimer);
  window.clearTimeout(nfAnswerExitTimer);
  notchFace?.classList.remove("nf-answer-exiting");
  nfAnswerGeneration = generation;
  nfAnswerText = normalized;
  nfAnswerForcedLong = Boolean(options.rich) || (sameAnswer && nfAnswerForcedLong);
  // THE bug that made every long answer look cut off.
  //
  // speak() passes `fixedHeight: Number(options.notchFixedHeight) || 0`, so the
  // normal path sends 0 — meaning "no fixed height, measure it". But
  // Number.isFinite(0) is TRUE, so this branch was taken anyway and clamped 0 up
  // to the 164px floor. Every spoken answer was therefore pinned at 164px, and
  // because nfAnswerFixedHeight was truthy, renderNotchAnswer skipped measuring
  // and BOTH refit paths early-returned. The sheet could never grow, whatever
  // the ceiling was.
  //
  // A fixed height is something a caller opts into. Zero is not opting in.
  const requestedFixedHeight = Number(options.fixedHeight);
  nfAnswerFixedHeight = Number.isFinite(requestedFixedHeight) && requestedFixedHeight > 0
    ? Math.max(164, Math.min(notchViewportHeight() - 90, requestedFixedHeight))
    : 0;
  if (!sameAnswer || options.replace) {
    nfAnswerCompletedWords = 0;
    nfAnswerLastScrollIndex = -1;
    nfAnswerModeLocked = "";
  }
  window.clearTimeout(nfThinkingTimer);
  stopThinkingPhaseCycle();
  notchFace.classList.remove(
    "nf-thinking", "nf-think-open", "nf-think-hint", "nf-think-waiting",
    "nf-think-failed", "nf-think-complete",
  );
  nfThinkingPinned = false;
  /* His reply takes the box, so the field stands down rather than being merely
     hidden underneath it: leaving typingOpen true would keep the keyboard held
     and the caption forced open behind the answer. */
  if (typingOpen) closeTyping("answer");
  notchFace.classList.add("nf-answer-open");
  renderNotchAnswer();
  window.brainoMac.setNotchZone?.({
    expanded: true,
    width: nfAnswerMode === "long" ? NF_READING_SURFACE_WIDTH : NF_COMPACT_SURFACE_WIDTH,
    height: nfAnswerPanelHeight,
  });
  updateNotchFace();
  logRenderer("notch.answer.start", {
    generation,
    kind: nfAnswerMode,
    chars: nfAnswerText.length,
    sourceApp: activeMacContext?.appName || "",
  });
  return true;
}

/* A streaming delta is an APPEND. It used to be a re-open.
 *
 * Every token called startNotchAnswer, which cancels timers, rebuilds classes,
 * reclassifies short/long from a half-finished sentence, calls setNotchZone —
 * resizing the real OS-level overlay window — and logs notch.answer.start. One
 * session recorded 414 starts against 22 finishes, twenty of them inside 52ms
 * for a single reply. That is the notch visibly tearing itself apart while it
 * types, and it is what put two layers of text on top of each other.
 *
 * Open once. After that, set the words and repaint. Nothing else moves. */
function updateNotchAnswerText(text, generation, options = {}) {
  if (!text || generation !== speechGeneration) return false;
  const alreadyOpen = nfAnswerGeneration === generation
    && Boolean(notchFace?.classList.contains("nf-answer-open"))
    && !options.replace;
  if (!alreadyOpen) return startNotchAnswer(text, generation, options);
  const normalized = normalizedNotchAnswer(text);
  if (!normalized || normalized === nfAnswerText) return true;
  cancelNotchSurfaceExit();
  window.clearTimeout(nfAnswerLingerTimer);
  nfAnswerText = normalized;
  if (options.rich) nfAnswerForcedLong = true;
  renderNotchAnswer();
  return true;
}

function trackNotchAnswerAudio(audio, spokenText, generation) {
  if (!audio || generation !== nfAnswerGeneration || !nfAnswerWords.length) return;
  const chunkWords = Math.max(1, String(spokenText || "").trim().split(/\s+/).filter(Boolean).length);
  const chunkStart = nfAnswerCompletedWords;
  const tickAnswer = () => {
    if (generation !== nfAnswerGeneration || audio.paused || audio.ended) return;
    const fraction = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(1, audio.currentTime / audio.duration)
      : Math.min(.98, (audio.currentTime * 2.75) / chunkWords);
    paintNotchAnswer(chunkStart + Math.max(1, Math.floor(chunkWords * fraction)));
    nfAnswerRaf = window.requestAnimationFrame(tickAnswer);
  };
  audio.addEventListener("playing", () => {
    window.cancelAnimationFrame(nfAnswerRaf);
    tickAnswer();
  }, { once: true });
  audio.addEventListener("ended", () => {
    nfAnswerCompletedWords = Math.min(nfAnswerWords.length, chunkStart + chunkWords);
    paintNotchAnswer(nfAnswerCompletedWords);
  }, { once: true });
}

function animateNotchAnswerEstimate(text, generation, durationMs) {
  if (generation !== nfAnswerGeneration || !nfAnswerWords.length) return;
  const startedAt = performance.now();
  const duration = Math.max(500, Number(durationMs) || String(text || "").length * 58);
  const frame = (now) => {
    if (generation !== nfAnswerGeneration) return;
    const fraction = Math.min(1, (now - startedAt) / duration);
    paintNotchAnswer(Math.max(1, Math.floor(nfAnswerWords.length * fraction)));
    if (fraction < 1) nfAnswerRaf = window.requestAnimationFrame(frame);
  };
  window.cancelAnimationFrame(nfAnswerRaf);
  nfAnswerRaf = window.requestAnimationFrame(frame);
}

function finishNotchAnswer(generation) {
  if (generation !== nfAnswerGeneration || !notchFace?.classList.contains("nf-answer-open")) return;
  window.cancelAnimationFrame(nfAnswerRaf);
  /* Deliberately NOT reclassified here.
   *
   * An earlier pass re-ran the short/long call once the full sentence had
   * landed, on the theory that one transition at the end beats N mid-stream.
   * It does — but the user still sees the reply change shape as it finishes,
   * and a sheet that resizes under a sentence you are reading is worse than a
   * sheet that guessed slightly wrong at the start. Decide once, stay put. */
  paintNotchAnswer(nfAnswerWords.length);
  const lingerMs = typeof notchResponseApi.notchAnswerLingerMs === "function"
    ? notchResponseApi.notchAnswerLingerMs(nfAnswerText, nfAnswerMode)
    : (nfAnswerMode === "long" ? 9000 : 4200);
  window.clearTimeout(nfAnswerLingerTimer);
  nfAnswerLingerTimer = window.setTimeout(() => clearNotchAnswer({ generation }), lingerMs);
  logRenderer("notch.answer.finish", { generation, kind: nfAnswerMode, lingerMs });
}

function clearNotchAnswer(options = {}) {
  if (options.generation && options.generation !== nfAnswerGeneration) return;
  window.clearTimeout(nfAnswerLingerTimer);
  window.cancelAnimationFrame(nfAnswerRaf);
  nfAnswerLingerTimer = 0;
  nfAnswerRaf = 0;
  notchFace?.classList.add("nf-answer-exiting");
  notchFace?.classList.remove("nf-answer-open", "nf-answer-short", "nf-answer-long");
  if (!notchFace?.classList.contains("nf-think-open")) {
    window.brainoMac.setNotchZone?.({ expanded: false });
  }
  notchFace?.querySelector(".nf-pill")?.style.removeProperty("--nf-answer-long-height");
  // Same reset for the short sheet, or the next one-liner opens at the height
  // of the last long-winded answer.
  notchFace?.querySelector(".nf-pill")?.style.removeProperty("--nf-answer-short-height");
  nfAnswerMode = "";
  nfAnswerText = "";
  nfAnswerWords = [];
  nfAnswerCompletedWords = 0;
  nfAnswerForcedLong = false;
  nfAnswerLastScrollIndex = -1;
  nfAnswerPanelHeight = NF_SHORT_ANSWER_HEIGHT;
  nfAnswerFixedHeight = 0;
  window.clearTimeout(nfAnswerExitTimer);
  nfAnswerExitTimer = window.setTimeout(() => {
    notchFace?.classList.remove("nf-answer-exiting", "nf-answer-context-page");
  }, 460);
  if (options.invalidate !== false) nfAnswerGeneration += 1;
  updateNotchFace();
}

notchFace?.querySelectorAll(".nf-answer-done").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    clearNotchAnswer();
  });
});

nfAnswerSurface?.addEventListener("click", (event) => {
  if (event.target.closest?.(".nf-answer-done")) return;
  if (!notchFace?.classList.contains("nf-answer-short")) return;
  nfAnswerForcedLong = true;
  renderNotchAnswer();
  window.brainoMac.setNotchZone?.({ expanded: true, width: NF_READING_SURFACE_WIDTH, height: nfAnswerPanelHeight });
});

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
    notchFace?.classList.add("cowork", "nf-thinking", "nf-think-hint", "nf-think-complete");
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
  if (active) {
    startThinkingPhaseCycle();
    if (!wasActive) {
      notchFace?.classList.remove("nf-think-open", "captioning");
      window.brainoMac.setNotchZone?.({ expanded: false });
    }
  }
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
//
// "Explicitly" was the only way it ever cleared, and a task that died without
// sending its empty label (or a main-side ability that never got that far)
// left its label in the notch cycling Thinking → Hatching until relaunch. So
// there is now a generous safety net as well: every refresh re-arms it, which
// keeps a task that is still narrating on screen, and only a label nobody has
// touched for NF_STICKY_THINKING_MAX_MS gets taken down.
const NF_STICKY_THINKING_MAX_MS = 90000;
let nfStickyThinkingTimer = 0;
function nfSetThinkingSticky(text) {
  nfThinkingText = String(text || "").trim();
  window.clearTimeout(nfThinkingTimer);
  window.clearTimeout(nfStickyThinkingTimer);
  nfStickyThinkingTimer = 0;
  if (nfThinkingText) {
    nfStickyThinkingTimer = window.setTimeout(() => {
      nfStickyThinkingTimer = 0;
      // Still genuinely working (a long Cowork ability, a delegate mid-run)? Re-arm
      // instead of tearing a live session's label down under it.
      if (processing || coworkBusy) { nfSetThinkingSticky(nfThinkingText); return; }
      logRenderer("thinking.sticky.expired", { label: nfThinkingText.slice(0, 80), coworkLabel });
      window.clearTimeout(coworkCompletionTimer);
      coworkLabel = "";
      coworkThinking = "";
      coworkThinkingHistory = [];
      // The amber "armed" dot belongs to Cowork being ON, not to the label.
      notchFace?.classList.toggle("cowork", Boolean(coworkEnabled));
      nfSetThinking("");
    }, NF_STICKY_THINKING_MAX_MS);
  }
  updateNotchFace();
}

// The whole compact notch is the disclosure control. Thinking stays out of the
// command path and unfolds only when the user explicitly asks to inspect it.
if (notchFace) {
  const toggleThink = (event) => {
    const detailedText = coworkThinking || nfThinkingText || lastProcessingDetail;
    if (!notchFace.classList.contains("nf-thinking") || !detailedText) return;
    if (!event.target.closest?.(".nf-pill") && !event.target.closest?.(".nf-think-chip")) return;
    /* The chip is a button and is handled below; every other button stays out
       of this entirely. */
    if (event.target.closest?.("button, a, input, textarea, select, .nf-answer-surface")) return;
    const opening = !notchFace.classList.contains("nf-think-open");
    nfSetThinkingOpen(opening);
    nfSetThinkingSticky(opening ? detailedText : coworkLabel || nfThinkingText);
  };
  notchFace.addEventListener("click", toggleThink);
  /* The chip: the named way in, and the only one that is obvious. */
  notchFace.querySelector(".nf-think-chip")?.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    const detailedText = coworkThinking || nfThinkingText || lastProcessingDetail;
    if (!detailedText) return;
    const opening = !notchFace.classList.contains("nf-think-open");
    nfSetThinkingOpen(opening);
    nfSetThinkingSticky(opening ? detailedText : coworkLabel || nfThinkingText);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!notchFace.classList.contains("nf-think-open") || notchFace.contains(event.target)) return;
    nfSetThinkingOpen(false);
    nfSetThinkingSticky(coworkLabel);
  });
}

async function runCoworkGlance() {
  if (!coworkEnabled || coworkBusy || herMode) return;
  if (skitRunning || skitJustCompleted) return; // skit isolation: no cowork during/after demo
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
/* True when the Mac could not tell whether anything is playing, which happens
   whenever macOS refuses Automation. Treated as "probably playing", because the
   alternative is trusting a guess made with no information and letting the
   speakers talk to him. */
let mediaAudioUncertain = false;
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

// The draggable corner panel that used to show meeting notes is retired: it was small,
// detached from the notch, and easy to miss for an entire meeting. Recording now lives in a
// surface that drops out of the notch itself (openMeetingSurface, below). The #meeting-panel
// markup is left in place unused rather than ripped out mid-flight.

// ── Meeting capture: the call and you, recorded apart ────────────────────────
// This is where the Mac finally gets both sides. getDisplayMedia comes back with loopback
// audio (main.cjs answers the request with audio:"loopback"), which is everything coming out
// of the speakers — the other people. getUserMedia is the mic, which is you. They are
// recorded as two streams and never mixed, because which stream a voice arrived on is the
// only speaker attribution in the whole system that cannot be wrong.
//
// MediaRecorder writes the WebM header into its FIRST blob only, so a segment is taken by
// rotating the recorder rather than slicing chunks off it: each cut is a complete, standalone
// file. The replacement starts before the outgoing one stops, so a boundary duplicates a few
// milliseconds instead of dropping them.
const MEETING_SEG_MIME = "audio/webm;codecs=opus";
const MEETING_SEGMENT_MS = 75000;
let meetingCapture = null;

function meetingSegRecStart(seg) {
  const recorder = new MediaRecorder(seg.stream, { mimeType: MEETING_SEG_MIME });
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  seg.recorder = recorder;
  seg.chunks = chunks;
  seg.startedAt = Date.now();
  recorder.start(1000);
}

function meetingSegRecCreate(stream) {
  const seg = { stream, recorder: null, chunks: [], startedAt: 0 };
  meetingSegRecStart(seg);
  return seg;
}

function meetingSegRecCut(seg, keepRecording) {
  return new Promise((resolve) => {
    const outgoing = seg?.recorder;
    const chunks = seg?.chunks || [];
    const durationMs = seg?.startedAt ? Date.now() - seg.startedAt : 0;
    // stop() flushes one last dataavailable into this same array before it fires "stop".
    const done = () => resolve(chunks.length ? { blob: new Blob(chunks, { type: "audio/webm" }), durationMs } : null);
    if (!seg || !outgoing || outgoing.state === "inactive") { done(); return; }
    if (keepRecording) meetingSegRecStart(seg);
    else { seg.recorder = null; seg.chunks = []; seg.startedAt = 0; }
    let settled = false;
    const finish = () => { if (settled) return; settled = true; window.clearTimeout(timer); done(); };
    const timer = window.setTimeout(finish, 2000);
    outgoing.addEventListener("stop", finish, { once: true });
    try { outgoing.stop(); } catch (_) { finish(); }
  });
}

function meetingSegRecStop(seg) {
  try { if (seg?.recorder && seg.recorder.state !== "inactive") seg.recorder.stop(); } catch (_) {}
  if (seg) { seg.recorder = null; seg.chunks = []; seg.startedAt = 0; }
}

function meetingBlobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

// ── The meeting surface: what recording actually looks like ──────────────────
// A meeting used to be a red glow on the notch and a small glass panel in a corner, which
// is close enough to invisible that you could not tell whether Braino was working. This is
// the same drop-down-from-the-notch shell the Yap and answer surfaces use, translucent
// because it stays up for the whole meeting over whatever you are actually doing, showing
// the one thing that proves it is alive: who is talking, and the words arriving.
const nfMeetingSurface = document.querySelector(".nf-meeting-surface");
const nfMeetingClockEl = nfMeetingSurface?.querySelector(".nf-meeting-clock");
const nfMeetingTitleEl = nfMeetingSurface?.querySelector(".nf-meeting-title");
const nfMeetingPeopleEl = nfMeetingSurface?.querySelector(".nf-meeting-people");
const nfMeetingSpeakerEl = nfMeetingSurface?.querySelector(".nf-meeting-speaker-name");
const nfMeetingLinesEl = nfMeetingSurface?.querySelector(".nf-meeting-lines");
const nfMeetingNotesEl = nfMeetingSurface?.querySelector(".nf-meeting-notes");
const nfMeetingNotesListEl = nfMeetingNotesEl?.querySelector("ul");
const nfMeetingStealthBtn = nfMeetingSurface?.querySelector(".nf-meeting-stealth");
const nfMeetingStopBtn = nfMeetingSurface?.querySelector(".nf-meeting-stop");

const NF_MEETING_MIN_HEIGHT = 200;
const NF_MEETING_MAX_HEIGHT = 460;
const NF_MEETING_MAX_LINES = 4;
const NF_MEETING_MAX_NOTES = 4;
// How long a speaker keeps the "voiced" animation after their last word lands.
const NF_MEETING_VOICE_HOLD_MS = 2200;

let nfMeetingOpen = false;
let nfMeetingZoneKey = "";
let nfMeetingVoiceUntil = 0;
let nfMeetingVoiceTimer = 0;
const nfMeetingLines = [];

function nfMeetingMeasureHeight() {
  if (!nfMeetingSurface) return NF_MEETING_MIN_HEIGHT;
  const styles = getComputedStyle(nfMeetingSurface);
  const chrome = parseFloat(styles.paddingTop || "0") + parseFloat(styles.paddingBottom || "0");
  const head = nfMeetingSurface.querySelector(".nf-meeting-head")?.offsetHeight || 0;
  const speaker = nfMeetingSurface.querySelector(".nf-meeting-speaker")?.offsetHeight || 0;
  const lines = nfMeetingLinesEl?.scrollHeight || 0;
  const notes = nfMeetingNotesEl && !nfMeetingNotesEl.hidden ? nfMeetingNotesEl.offsetHeight + 10 : 0;
  const total = chrome + head + 11 + speaker + 7 + lines + notes + 6;
  return Math.max(NF_MEETING_MIN_HEIGHT, Math.min(NF_MEETING_MAX_HEIGHT, Math.round(total)));
}

// The window is click-through except where Braino says it is not, so the surface has to
// claim its own rectangle or the Stop button would never receive a press.
function syncMeetingNotchZone(active, height) {
  const key = active ? `open:${height}` : "closed";
  if (key === nfMeetingZoneKey) return;
  nfMeetingZoneKey = key;
  if (active) {
    window.brainoMac.setNotchZone?.({ expanded: true, width: NF_READING_SURFACE_WIDTH, height });
  } else if (!nfAnswerMode && !notchFace?.classList.contains("nf-think-open")) {
    window.brainoMac.setNotchZone?.({ expanded: false });
  }
}

function renderMeetingSurface() {
  if (!nfMeetingSurface || !nfMeetingOpen) return;

  if (nfMeetingLinesEl) {
    nfMeetingLinesEl.replaceChildren(...nfMeetingLines.map((line) => {
      const p = document.createElement("p");
      if (line.speaker) {
        const b = document.createElement("b");
        b.textContent = `${line.speaker}  `;
        p.appendChild(b);
      }
      p.appendChild(document.createTextNode(line.text));
      return p;
    }));
    if (!nfMeetingLines.length) {
      const p = document.createElement("p");
      p.textContent = "Listening for the room.";
      nfMeetingLinesEl.replaceChildren(p);
    }
  }

  const height = nfMeetingMeasureHeight();
  notchFace?.style.setProperty("--nf-meeting-height", `${height}px`);
  syncMeetingNotchZone(true, height);
}

function nfMeetingMarkVoiced() {
  nfMeetingVoiceUntil = Date.now() + NF_MEETING_VOICE_HOLD_MS;
  notchFace?.classList.add("nf-meeting-voiced");
  window.clearTimeout(nfMeetingVoiceTimer);
  nfMeetingVoiceTimer = window.setTimeout(() => {
    if (Date.now() >= nfMeetingVoiceUntil) notchFace?.classList.remove("nf-meeting-voiced");
  }, NF_MEETING_VOICE_HOLD_MS + 60);
}

function openMeetingSurface(payload = {}) {
  if (!nfMeetingSurface) return;
  nfMeetingOpen = true;
  nfMeetingLines.length = 0;
  if (nfMeetingTitleEl) nfMeetingTitleEl.textContent = payload.source || "Meeting";
  if (nfMeetingSpeakerEl) nfMeetingSpeakerEl.textContent = "Listening";
  if (nfMeetingPeopleEl) nfMeetingPeopleEl.textContent = "";
  if (nfMeetingNotesListEl) nfMeetingNotesListEl.replaceChildren();
  if (nfMeetingNotesEl) nfMeetingNotesEl.hidden = true;
  setMeetingStealthUi(payload.stealth !== false);
  notchFace?.classList.add("nf-meeting-open");
  renderMeetingSurface();
}

function closeMeetingSurface() {
  if (!nfMeetingOpen) return;
  nfMeetingOpen = false;
  nfMeetingLines.length = 0;
  window.clearTimeout(nfMeetingVoiceTimer);
  notchFace?.classList.remove("nf-meeting-open", "nf-meeting-voiced");
  notchFace?.style.removeProperty("--nf-meeting-height");
  syncMeetingNotchZone(false, 0);
}

function pushMeetingLine(speaker, text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return;
  const who = String(speaker || "").trim();
  const last = nfMeetingLines[nfMeetingLines.length - 1];
  // Partial captions arrive as a growing prefix of the same sentence, so replace rather
  // than stack: otherwise one spoken line becomes six lines of near-duplicates.
  if (last && last.speaker === who && (clean.startsWith(last.text) || last.text.startsWith(clean))) {
    last.text = clean;
  } else {
    nfMeetingLines.push({ speaker: who, text: clean });
    while (nfMeetingLines.length > NF_MEETING_MAX_LINES) nfMeetingLines.shift();
  }
  if (who && nfMeetingSpeakerEl) nfMeetingSpeakerEl.textContent = who;
  nfMeetingMarkVoiced();
  renderMeetingSurface();
}

function setMeetingNotes(notes) {
  if (!nfMeetingNotesEl || !nfMeetingNotesListEl) return;
  const bullets = (Array.isArray(notes) ? notes : [])
    .map((line) => String(line || "").replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(-NF_MEETING_MAX_NOTES);
  nfMeetingNotesEl.hidden = bullets.length === 0;
  nfMeetingNotesListEl.replaceChildren(...bullets.map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  }));
  renderMeetingSurface();
}

function setMeetingPeople(names) {
  if (!nfMeetingPeopleEl) return;
  const list = Array.isArray(names) ? names.filter(Boolean) : [];
  nfMeetingPeopleEl.textContent = list.length
    ? `${list.length} ${list.length === 1 ? "person" : "people"}`
    : "";
}

function setMeetingStealthUi(on) {
  if (!nfMeetingStealthBtn) return;
  nfMeetingStealthBtn.classList.toggle("is-on", Boolean(on));
  nfMeetingStealthBtn.setAttribute("aria-pressed", on ? "true" : "false");
  nfMeetingStealthBtn.title = on
    ? "Hidden from screen shares"
    : "Visible in screen shares";
}

nfMeetingStealthBtn?.addEventListener("click", () => {
  const next = !nfMeetingStealthBtn.classList.contains("is-on");
  setMeetingStealthUi(next);
  void window.brainoMac.meetingStealth?.(next);
});

nfMeetingStopBtn?.addEventListener("click", () => {
  void window.brainoMac.delegate?.("stop recording");
});

async function startMeetingCapture(wantsSystemAudio) {
  await stopMeetingCapture();
  const capture = { startedAt: Date.now(), sentUntilMs: 0, busy: false, display: null, mic: null, sysSeg: null, micSeg: null, timer: 0 };

  if (wantsSystemAudio) {
    try {
      // Chromium insists a video track be requested even when only audio is wanted; main.cjs
      // answers with the primary screen and loopback audio, and the video is dropped at once.
      capture.display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      capture.display.getVideoTracks().forEach((track) => track.stop());
      const systemTracks = capture.display.getAudioTracks();
      if (systemTracks.length) capture.sysSeg = meetingSegRecCreate(new MediaStream(systemTracks));
      else void window.brainoMac.meetingCaptureFailed?.("no system audio track");
    } catch (error) {
      logRenderer("meeting.system_audio.failed", { message: error?.message || String(error) });
      void window.brainoMac.meetingCaptureFailed?.(error?.message || "system audio denied");
    }
  }

  try {
    // Echo cancellation matters here: without it the remote voices coming out of your speakers
    // land on the mic as well and get transcribed a second time, as you.
    capture.mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
    });
    capture.micSeg = meetingSegRecCreate(capture.mic);
  } catch (error) {
    logRenderer("meeting.mic.failed", { message: error?.message || String(error) });
    void window.brainoMac.meetingCaptureFailed?.(error?.message || "microphone denied");
  }

  if (!capture.sysSeg && !capture.micSeg) {
    await teardownMeetingCapture(capture);
    return false;
  }

  meetingCapture = capture;
  capture.timer = window.setInterval(() => { void sendMeetingSegment(false); }, MEETING_SEGMENT_MS);
  logRenderer("meeting.capture.started", { system: Boolean(capture.sysSeg), mic: Boolean(capture.micSeg) });
  return true;
}

async function sendMeetingSegment(final) {
  const capture = meetingCapture;
  if (!capture || (capture.busy && !final)) return;
  capture.busy = true;
  try {
    // Cut both at the same moment so the two transcripts share a clock and can be interleaved.
    const keepRecording = !final;
    const [systemCut, micCut] = await Promise.all([
      capture.sysSeg ? meetingSegRecCut(capture.sysSeg, keepRecording) : Promise.resolve(null),
      capture.micSeg ? meetingSegRecCut(capture.micSeg, keepRecording) : Promise.resolve(null),
    ]);

    const audioStreams = [];
    for (const [role, cut] of [["system", systemCut], ["mic", micCut]]) {
      if (!cut?.blob) continue;
      const audioBase64 = await meetingBlobToBase64(cut.blob);
      if (!audioBase64) continue;
      // The main process decides what is too quiet to be worth transcribing; it owns the
      // threshold so the rule is in one testable place.
      audioStreams.push({ role, audioBase64, mimeType: "audio/webm", durationMs: cut.durationMs, bytes: cut.blob.size });
    }

    const segmentStartMs = capture.sentUntilMs;
    const segmentEndMs = Date.now() - capture.startedAt;
    capture.sentUntilMs = segmentEndMs;
    await window.brainoMac.meetingSegment?.({ audioStreams, segmentStartMs, segmentEndMs, final: Boolean(final) });
  } catch (error) {
    logRenderer("meeting.segment.failed", { message: error?.message || String(error) });
  } finally {
    capture.busy = false;
  }
}

async function teardownMeetingCapture(capture) {
  if (!capture) return;
  if (capture.timer) window.clearInterval(capture.timer);
  meetingSegRecStop(capture.sysSeg);
  meetingSegRecStop(capture.micSeg);
  capture.display?.getTracks?.().forEach((track) => track.stop());
  capture.mic?.getTracks?.().forEach((track) => track.stop());
}

async function stopMeetingCapture() {
  const capture = meetingCapture;
  meetingCapture = null;
  await teardownMeetingCapture(capture);
}

window.brainoMac.onMeeting?.((payload) => {
  const action = payload?.action;
  if (action === "final-segment") {
    // stopMeetingRecording is holding the door open for this last cut.
    void sendMeetingSegment(true).finally(() => { void stopMeetingCapture(); });
    return;
  }
  if (action === "start") {
    meetingRecording = true;
    void startMeetingCapture(payload.captureAudio !== false);
    meetingStartedAt = payload.startedAt || Date.now();
    // The notch says "recording" before anything else does, which is the whole point: you
    // should never have to wonder whether he heard you.
    notchFace?.classList.add("recording");
    updateNotchFace();
    // Into the notch and stay there. He is present for the whole call without
    // being in front of it, and the REC dot plus the clock live in the notch
    // anyway, so nothing is lost by him going home.
    void setWalkerHomeState(true, { reason: "meeting" });
    // Then the surface drops out of it. The old corner panel is retired — it was small,
    // detached from the notch, and easy to miss entirely.
    openMeetingSurface(payload);
    window.clearInterval(meetingClockTimer);
    meetingClockTimer = window.setInterval(() => {
      const elapsed = fmtMeetingClock(Date.now() - meetingStartedAt);
      if (nfMeetingClockEl) nfMeetingClockEl.textContent = elapsed;
      updateNotchFace(); // refreshes the notch REC clock too
    }, 1000);
  } else if (action === "stop") {
    meetingRecording = false;
    void stopMeetingCapture();
    closeMeetingSurface();
    notchFace?.classList.remove("recording");
    window.clearInterval(meetingClockTimer);
    nfSetStatusText("");
    // Meeting over, the guard in setWalkerHomeState lifts with it. He does not
    // come bounding out on his own: he waits to be called, same as any other
    // time he is home.
  } else if (action === "notes") {
    setMeetingNotes(payload.notes);
  } else if (action === "people") {
    setMeetingPeople(payload.names);
  } else if (action === "stealth") {
    setMeetingStealthUi(payload.enabled !== false);
  } else if (action === "transcript" || action === "live") {
    // The live feed: on-device captions arriving word by word, tagged with whoever the
    // meeting UI currently says is speaking.
    pushMeetingLine(payload.speaker, payload.text);
  }
});

window.brainoMac.onAmbientToggle?.((payload) => {
  ambientEnabled = Boolean(payload?.enabled);
  logRenderer("ambient.toggle", { enabled: ambientEnabled });
  if (ambientEnabled) lastEngagedAt = Date.now();
});

// Legacy wing nodes stay available for old scripted sequences. Normal voice
// transcription and compact thinking now live in one black in-Notch surface.
const nfCapLeftEl = document.querySelector("#notch-face .nf-cap-l");
const nfCapRightEl = document.querySelector("#notch-face .nf-cap-r");
const nfInlineCaptionEl = document.querySelector("#notch-face .nf-inline-caption");
const nfInlineCaptionLabelEl = document.querySelector("#notch-face .nf-inline-caption-label");
const nfInlineCaptionStateEl = document.querySelector("#notch-face .nf-inline-caption-state");
const nfInlineCaptionTextEl = document.querySelector("#notch-face .nf-inline-caption-text");
const nfYapTranscriptEl = document.querySelector("#notch-face .nf-yap-transcript");
const nfYapStateEl = document.querySelector("#notch-face .nf-yap-head b");
let nfHeardText = "";
let nfCaptionClearTimer = 0;
let nfYapZoneKey = "";
let nfInlineZoneKey = "";

function yapPanelHeight(lines) {
  const visualLines = lines.reduce((count, line) => (
    count + Math.max(1, Math.ceil(String(line || "").length / 58))
  ), 0);
  return Math.max(158, Math.min(260, 126 + (visualLines * 21)));
}

function syncYapNotchZone(active, height = 172) {
  const normalizedHeight = Math.max(158, Math.min(260, Math.round(height)));
  const key = active ? `open:${normalizedHeight}` : "closed";
  if (key === nfYapZoneKey) return;
  nfYapZoneKey = key;
  if (active) {
    cancelNotchSurfaceExit();
    window.brainoMac.setNotchZone?.({ expanded: true, width: NF_COMPACT_SURFACE_WIDTH, height: normalizedHeight });
  } else if (!nfAnswerMode && !nfMeetingOpen && !notchFace?.classList.contains("nf-think-open")) {
    // The meeting surface is up for the length of a meeting and updateNotchFace runs every
    // second inside one, so without this guard the click zone was torn down a second after
    // it was claimed and the Stop button stopped responding.
    window.brainoMac.setNotchZone?.({ expanded: false });
  }
}

const NF_INLINE_MIN_HEIGHT = 136;
const NF_INLINE_MAX_HEIGHT = 300;
// Roughly what six lines hold at 15px across the 480px compact surface. Past
// this the panel has stopped growing, so keeping more text would only push the
// newest words out of sight.
const NF_INLINE_MAX_CHARS = 330;

// Measure the caption's real content and give the island that height, the way
// Yap Mode already sizes itself. Sum the same way renderedLongAnswerHeight does:
// own padding + header + the text's full scroll height.
function measureInlineCaptionHeight() {
  if (!nfInlineCaptionEl || !nfInlineCaptionTextEl) return NF_INLINE_MIN_HEIGHT;
  const style = window.getComputedStyle(nfInlineCaptionEl);
  const textStyle = window.getComputedStyle(nfInlineCaptionTextEl);
  const header = nfInlineCaptionEl.querySelector("header");
  const content = (
    (Number.parseFloat(style.paddingTop) || 0)
    + (header?.getBoundingClientRect().height || 0)
    + (Number.parseFloat(textStyle.marginTop) || 0)
    + (nfInlineCaptionTextEl.scrollHeight || 0)
    + (Number.parseFloat(style.paddingBottom) || 0)
    + 2
  );
  return Math.round(Math.max(NF_INLINE_MIN_HEIGHT, Math.min(NF_INLINE_MAX_HEIGHT, content)));
}

function refitOpenInlineCaption() {
  if (!notchFace?.classList.contains("nf-inline-open")) return;
  notchFace.style.setProperty("--nf-inline-height", `${measureInlineCaptionHeight()}px`);
}

function syncInlineVoiceSurface(mode = "", text = "") {
  if (!notchFace || !nfInlineCaptionEl) return;
  const value = String(text || "").trim().replace(/\s+/g, " ");
  /* Typing holds the surface open on its own.
   *
   * Without this the field opened and vanished in the same tick: openTyping
   * added nf-inline-open, then updateNotchFace ran and recomputed that class
   * from whether anything had been SPOKEN, found nothing, and took it straight
   * back off. The shortcut fired, the log said type.open, and the screen never
   * changed. */
  const active = typingOpen || Boolean(mode && value);
  const wasActive = notchFace.classList.contains("nf-inline-open");
  /* This surface is now only ever your own sentence read back to you. The
     phase belongs to the centred chip, and the panel behind the arrow keeps
     the full reasoning, so the caption no longer tries to be both. */

  if (active) cancelNotchSurfaceExit();
  else if (wasActive) beginNotchSurfaceExit();
  notchFace.classList.toggle("nf-inline-open", active);
  notchFace.classList.remove("nf-inline-thinking", "nf-inline-working");
  if (nfInlineCaptionLabelEl) nfInlineCaptionLabelEl.textContent = typingOpen ? "You typed" : "You said";
  if (nfInlineCaptionStateEl) nfInlineCaptionStateEl.textContent = typingOpen ? "Typing" : "Live";
  if (nfInlineCaptionTextEl) nfInlineCaptionTextEl.textContent = value;

  // Height AFTER the text lands, or we would measure the previous sentence.
  const height = active ? measureInlineCaptionHeight() : NF_INLINE_MIN_HEIGHT;
  notchFace.style.setProperty("--nf-inline-height", `${height}px`);
  // On the first open the pill is still sliding out to 480px, so this first
  // measurement saw the text wrapped into a narrow column. Take it again once
  // the width has settled. Later partials re-enter this function anyway, but
  // the last one before he answers would otherwise keep a stale height.
  if (active && !wasActive) {
    window.requestAnimationFrame(() => refitOpenInlineCaption());
    NF_ANSWER_REFIT_DELAYS_MS.forEach((delay) => {
      window.setTimeout(() => refitOpenInlineCaption(), delay);
    });
  }
  const key = active ? `${mode}:${height}` : "closed";

  // The notch is the only conversational text surface. A partial transcript
  // can arrive one frame after an older mascot bubble was painted; clear that
  // bubble here so it cannot remain pinned over the page behind the mascot.
  if (active) {
    window.clearTimeout(sayTimer);
    window.cancelAnimationFrame(replyCaptionRaf);
    replyCaptionGeneration += 1;
    bubble.classList.remove("show", "reply-karaoke");
  }

  if (key === nfInlineZoneKey) return;
  nfInlineZoneKey = key;
  if (active) {
    window.brainoMac.setNotchZone?.({ expanded: true, width: NF_COMPACT_SURFACE_WIDTH, height });
  } else if (
    !nfAnswerMode
    && !notchFace.classList.contains("nf-answer-open")
    && !notchFace.classList.contains("nf-think-open")
    && !dictationMode
    && !dictationStopping
  ) {
    window.brainoMac.setNotchZone?.({ expanded: false });
  }
}

function updateYapTranscript(currentText = nfHeardText) {
  if (!nfYapTranscriptEl || !notchFace) return;
  const current = String(currentText || "").trim();
  const completed = dictationSessionChunks.map((chunk) => String(chunk || "").trim()).filter(Boolean);
  const lines = completed.slice(-5);
  if (current && current !== lines.at(-1)) lines.push(current);

  nfYapTranscriptEl.replaceChildren();
  if (!lines.length) {
    const empty = document.createElement("p");
    empty.className = "nf-yap-empty";
    empty.textContent = "Start talking. I’m writing it down.";
    nfYapTranscriptEl.appendChild(empty);
  } else {
    lines.slice(-5).forEach((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      nfYapTranscriptEl.appendChild(paragraph);
    });
  }
  const height = yapPanelHeight(lines.slice(-5));
  notchFace.style.setProperty("--nf-yap-height", `${height}px`);
  if (nfYapStateEl) {
    nfYapStateEl.textContent = dictationStopping
      ? "Finishing"
      : (dictationSpeechActive ? "Hearing you" : "Listening");
  }
  nfYapTranscriptEl.scrollTop = nfYapTranscriptEl.scrollHeight;
  syncYapNotchZone(dictationMode || dictationStopping, height);
}

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
  const previous = nfHeardText;
  nfHeardText = String(text || "").trim();
  if (nfHeardText) {
    if (nfHeardText !== previous) nfHeardShownAt = Date.now();
    nfFlowPromptText = nfHeardText;
    nfFlowResponseText = "";
  } else {
    nfHeardShownAt = 0;
  }
  if (dictationMode || dictationStopping) {
    layoutNotchCaption("");
    updateYapTranscript(nfHeardText);
  } else {
    // `updateNotchFace` moves this into the central black subtitle surface.
    layoutNotchCaption("");
  }
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
  updateYapTranscript("");
  updateNotchFace();
}

// Braino's thinking, shown live in the notch ticker while he works a task —
// the same principle as the extension's dynamic-island step display. You
// should always be able to SEE what he understood and what he's doing.
let nfThinkingText = "";
let nfThinkingTimer = 0;
// nfThinkingOpenTimer is declared with the reveal-delay helpers above, next to
// NF_THINKING_REVEAL_MS, so the timer and the thing that sets it live together.
// nfSetThinking still clears it below: showing live thinking text means the
// pending reveal has been overtaken and must not fire later.

function nfSetThinking(text) {
  nfThinkingText = String(text || "").trim();
  if (nfThinkingText && hilThinkingHistory[hilThinkingHistory.length - 1] !== nfThinkingText) {
    hilThinkingHistory.push(nfThinkingText);
    if (hilThinkingHistory.length > HIL_THINKING_HISTORY_MAX) hilThinkingHistory.shift();
  }
  window.clearTimeout(nfThinkingTimer);
  window.clearTimeout(nfThinkingOpenTimer);
  if (nfThinkingText) {
    startThinkingPhaseCycle();
    renderThinkingCanvas(nfThinkingText, nfThinkingText);
    notchFace?.classList.add("nf-thinking", "nf-think-hint");
    nfThinkingTimer = window.setTimeout(() => {
      nfThinkingText = "";
      if (!coworkLabel) {
        stopThinkingPhaseCycle();
        notchFace?.classList.remove(
          "nf-thinking", "nf-think-open", "nf-think-hint", "captioning",
          "nf-think-waiting", "nf-think-failed", "nf-think-complete",
        );
        window.brainoMac.setNotchZone?.({ expanded: false });
        // Clearing the text is not enough on its own: updateNotchFace below
        // would rebuild the sheet from a stale "thinking" status. Settle that
        // too, but only when nothing is actually running (the helper checks).
        settleStaleThinkingStatus("nf_thinking.auto_clear");
      }
      updateNotchFace();
    }, 6000);
  } else if (!coworkLabel) {
    stopThinkingPhaseCycle();
    notchFace?.classList.remove(
      "nf-thinking", "nf-think-open", "nf-think-hint", "captioning",
      "nf-think-waiting", "nf-think-failed", "nf-think-complete",
    );
    if (!nfAnswerMode) window.brainoMac.setNotchZone?.({ expanded: false });
    settleStaleThinkingStatus("nf_thinking.cleared");
  }
  updateNotchFace();
}

// Last line of defence for the thinking sheet. Every owner above is supposed
// to take it down, and each leak that was found has its own fix, but the cost
// of one more forgotten path was a notch that cycled Thinking → Hatching until
// relaunch. So: if the sheet has been up continuously for longer than any real
// command takes, and no turn / speech / realtime response / cowork glance is
// actually in flight, force it down and say so in the log. A sticky label with
// its own expiry armed is left to that expiry (it knows more than we do here).
const NF_THINKING_WATCHDOG_MS = 45000;
const NF_THINKING_WATCHDOG_TICK_MS = 5000;
let nfThinkingWatchdogSince = 0;
window.setInterval(() => {
  if (!notchFace?.classList.contains("nf-thinking")) {
    nfThinkingWatchdogSince = 0;
    return;
  }
  const now = Date.now();
  if (!nfThinkingWatchdogSince) {
    nfThinkingWatchdogSince = now;
    return;
  }
  if (now - nfThinkingWatchdogSince < NF_THINKING_WATCHDOG_MS) return;
  if (processing || speaking || voiceTurnInFlight || realtimeResponseInFlight || realtimeResponseWaiter) return;
  if (coworkBusy || nfStickyThinkingTimer) return;
  logRenderer("thinking.watchdog.cleared", {
    onForMs: now - nfThinkingWatchdogSince,
    lastGlowStatus,
    thinkingText: nfThinkingText.slice(0, 80),
    coworkLabel,
    realtimeActive,
  });
  nfThinkingWatchdogSince = 0;
  cancelPendingNotchThinking();
  window.clearTimeout(coworkCompletionTimer);
  coworkLabel = "";
  coworkThinking = "";
  coworkThinkingHistory = [];
  notchFace.classList.toggle("cowork", Boolean(coworkEnabled));
  nfSetThinking("");
  settleStaleThinkingStatus("thinking.watchdog");
}, NF_THINKING_WATCHDOG_TICK_MS);

function updateNotchFace() {
  // pin follows the class: nothing can be pinned open that is not thinking any
  // more, whichever of the six teardown paths took the class away.
  if (nfThinkingPinned && !notchFace?.classList.contains("nf-thinking")) nfThinkingPinned = false;
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

  const dictationCapturing = dictationMode && !dictationStopping;
  const yapOwnsNotch = visible && (dictationMode || dictationStopping);
  const answerOwnsNotch = visible
    && Boolean(nfAnswerMode)
    && notchFace.classList.contains("nf-answer-open");
  const sessionEngaged = dictationStopping
    ? false
    : dictationMode || realtimeActive || realtimeConnecting;
  const voiceOwnsNotch = visible
    && walkerHome
    && sessionEngaged
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
  // Conversation owns one central black subtitle box while a transcript is
  // live. The old left/right wings are explicitly cleared and never receive
  // ordinary voice or thinking copy.
  const conversationOwnsNotch = visible
    && !dictationMode
    && Boolean(nfHeardText)
    && (sessionEngaged || ["listening", "hearing", "captured"].includes(lastGlowStatus));
  const thinkingOpen = notchFace.classList.contains("nf-think-open");
  /* You said -> Thinking -> his reply, one at a time.
   *
   * The caption used to stay open through processing so your sentence never
   * disappeared. That put the caption and the centred phase chip in the same
   * box, which showed the phase twice — once in the chip, once in the caption's
   * own state slot — and left no moment that reads as "he is working". Proved
   * on /notch-lab before this landed. Your sentence is not lost: it is the
   * first line of the panel behind the arrow. */
  const heldRecently = nfHeardShownAt > 0 && Date.now() - nfHeardShownAt < NF_HEARD_MIN_MS;
  const inlineMode = visible && !herMode && !answerOwnsNotch && !yapOwnsNotch && !thinkingOpen
    ? ((processingActive && !heldRecently) ? "" : (conversationOwnsNotch ? "heard" : ""))
    : "";
  /* Come back when the floor expires, or the caption would sit there until the
     next unrelated repaint. */
  if (inlineMode === "heard" && processingActive) window.setTimeout(() => updateNotchFace(), 140);
  // Keep YOUR words on screen while he thinks. This used to replace the
  // transcript with the single word "Thinking" the moment processing began,
  // which is why a command you had just spoken disappeared before you could
  // read it. The phase now goes in the small state chip instead, so the
  // sentence stays put from the first partial through to his reply.
  //
  // The character budget went 180 -> NF_INLINE_MAX_CHARS because the panel can
  // now grow; it still trims from the FRONT, so the newest words you are
  // speaking are always the ones on screen.
  const heardForInline = compactNotchCaption(nfHeardText, NF_INLINE_MAX_CHARS);
  const inlineText = inlineMode === "heard" ? heardForInline : "";
  layoutNotchCaption("");
  syncInlineVoiceSurface(inlineMode, inlineText);
  const yapWasOpen = notchFace.classList.contains("nf-yap-open");
  notchFace.classList.toggle("nf-yap-open", yapOwnsNotch);
  if (yapOwnsNotch) cancelNotchSurfaceExit();
  else if (yapWasOpen && !notchFace.classList.contains("nf-inline-open")) beginNotchSurfaceExit();
  notchFace.classList.toggle("dictation-finishing", visible && dictationStopping);
  if (yapOwnsNotch) updateYapTranscript(nfHeardText);
  else syncYapNotchZone(false);
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
    if (launchDemoNowPlaying) slots.push("Now Playing · Launch Vid.MP4");
    if (dictationCapturing) {
      const yapNotice = nfTransient.text && now < nfTransient.until ? nfTransient.text : "";
      slots.push(yapNotice || "BrainoHERA");
    }
    if (meetingRecording) slots.push(`● REC ${fmtMeetingClock(Date.now() - meetingStartedAt)}`);
    else if (screenRecording) slots.push(`● SCREEN ${fmtMeetingClock(Date.now() - screenRecStartedAt)}`);
    if (nfAlarmRinging && slots.length < 2) slots.push(`⏰ ${nfAlarmRinging.label} · tap to stop`);
    if (!dictationCapturing && nfTransient.text && now < nfTransient.until && slots.length < 2) {
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
  if (visible && music) nfMusicNoteActive(now);
  notchFace.classList.toggle("launch-now-playing", visible && launchDemoNowPlaying);
  notchFace.classList.toggle("busy", visible && walkerHome && processingActive);
  notchFace.classList.remove("nf-processing-caption");
  notchFace.classList.toggle("mic-live", visible && sessionEngaged);
  notchFace.classList.toggle("nf-dictation", visible && dictationCapturing);
  walker.classList.toggle("dictation-listening", visible && !walkerHome && dictationCapturing);
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
  notchFace.classList.remove("captioning");
  // While he's home the notch IS the conversation surface: sonar rings while
  // listening, talking mouth + bars while speaking. When he's out on screen,
  // the walker owns the voice theatrics and the notch stays quiet.
  const notchVoice = visible && walkerHome && !herMode;
  notchFace.classList.toggle(
    "listen",
    notchVoice && !answerOwnsNotch && sessionEngaged && (dictationCapturing || ["listening", "hearing"].includes(lastGlowStatus)),
  );
  notchFace.classList.toggle("speak", notchVoice && !answerOwnsNotch && lastGlowStatus === "speaking");
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
  // During post-skit mode, he CANNOT go home. Period. Force him out if anything tries.
  if (skitJustCompleted && wantHome) {
    walkerHome = false;
    return;
  }
  // Monday Mode: he stays in the notch, full stop. Nothing gets him to pop
  // out and sulk on screen while this is on, whatever called this.
  if (mondayModeActive && !wantHome) {
    walkerHome = true;
    return;
  }
  // Recording a meeting: same rule. A mascot strolling across the screen while
  // you are in a call is a distraction at best and something you have to
  // apologise for at worst, and the notch already carries the REC state and the
  // clock. Anything that tries to send him out mid-meeting is refused.
  if (meetingRecording && !wantHome) {
    walkerHome = true;
    return;
  }
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
  if (mondayModeActive) {
    void speak("Not happening. I'm staying right here today.");
    return;
  }
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
  if (mondayModeActive) {
    void speak("No. Notch. Today.");
    return;
  }
  // Double-Command is the one explicit way to send him home after the skit.
  if (skitJustCompleted) {
    skitJustCompleted = false;
    setStartupPose(null);
    setBubble("", 0);   // Clear any skit bubble
    await setWalkerHomeState(true);
    return;
  }
  // Normal toggle: if home, come out; if out, go home.
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

// Kept branch-for-branch identical to the extension's __sbTimeGreeting() so the
// Mac and the browser never greet the same moment differently.
function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 23) return "Good evening";
  return "It's late";
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

// Production boot:
//   spectrum trace → centred F O U N D R Y while real auth runs → the word resolves
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
  // One salutation value, written and spoken. He boots whenever the machine
  // wakes, so the greeting follows the clock instead of assuming night. Same
  // four branches as the extension's __sbTimeGreeting() so the two surfaces
  // never disagree about what time of day it is.
  const greeting = timeGreeting();
  const [greetLead, ...greetRest] = greeting.split(" ");
  const leadEl = notchFace?.querySelector(".nf-iomi-greet-lead");
  if (leadEl) leadEl.textContent = greetLead;
  const salutationEl = notchFace?.querySelector(".nf-iomi-salutation");
  if (salutationEl) salutationEl.textContent = `${greetRest.join(" ")},`;
  const firstNameEl = notchFace?.querySelector(".nf-iomi-first-name");
  if (firstNameEl) firstNameEl.textContent = `${firstName}.`;
  notchFace?.classList.add("nf-iomi-expanded");
  await wait(1850);

  // Speak only after the words and divider have landed. This uses the same
  // Fish Audio-first `speak` path as every normal Braino reply.
  await speak(`${greeting}, ${firstName}. Everything is ready.`, { captions: false });
  logInteraction({
    kind: "voice",
    route: "boot_greeting",
    braino_text: `${greeting}, ${firstName}. Everything is ready.`,
    meta: { flow: "iomi" },
  });
  await wait(300);
  await runIomiBootMascotExit();
  clearIomiBootClasses();
  logRenderer("boot.iomi.complete", { firstName, greeting });
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
    const greetingLine = firstName
      ? `${firstName}, press Control twice whenever you want me.`
      : "Press Control twice whenever you want me.";
    void speak(greetingLine);
    logInteraction({ kind: "voice", route: "boot_greeting", braino_text: greetingLine, meta: { flow: "notch" } });
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
// After the skit ends, he stays OUT until Cmd+2 is pressed — music stop does
// not trigger auto-home while this is true.
let skitJustCompleted = false;
// Gates every visible theatric (edge glow, notch dance, light show, falling
// notes, now-playing marquee): stays false until he has ACTUALLY finished
// walking home, never flips on the instant music is merely detected.
let musicTheatricsReady = false;

// ── Music dance: the full step set, looping, for as long as music plays ─────
//
// The notch dancer above does ONE move (The Twist) in a 40px window. The real
// mascot, meanwhile, just kept walking through the whole song. The Chrome
// extension already solved this and was never ported: __sbWkDance's danceCycle
// runs five steps back to back forever (extension/content.js ~4490). This is
// that cycle on the Mac rig, which shares the extension's node ids exactly.
//
// Pose math and time constants are verbatim from BrainoDanceGrid.tsx, the same
// source the extension and the notch dancer both copy, so all three surfaces
// dance identically.
//
// Routing: everything goes through setStartupPose, the way skitPerformMoonwalk
// does, so tick stays the single writer of the rig. tick's roam branch is
// skipped while musicDancing is true, so he holds his spot and dances instead
// of grooving his way across the screen.
let musicDancing = false;
let musicDanceRaf = 0;
let musicDanceStart = 0;
let musicDanceYielded = false;

const DANCE_POSES = {
  twist: (t) => {
    const b = t * 3.4, sway = Math.sin(b), knee = Math.abs(Math.sin(b));
    return { tx: sway * 9, ty: 0, sy: 1 - knee * 0.06, la: 42 + sway * 26, ra: -42 + sway * 26,
      lookX: sway * 0.5, lookY: 0, tilt: 0,
      ll: Math.max(0, Math.sin(b)) * 4, rl: Math.max(0, -Math.sin(b)) * 4,
      ls: Math.max(0, Math.sin(b)) * 7, rs: Math.max(0, -Math.sin(b)) * 7 };
  },
  disco: (t) => {
    const b = t * 2.6, stab = Math.tanh(Math.sin(b) * 2.3);
    return { tx: stab * 6, ty: 0, sy: 1 - Math.abs(Math.sin(b * 2)) * 0.045, la: -10, ra: -82 - stab * 56,
      lookX: 0.45, lookY: -0.3 - Math.max(0, stab) * 0.25, tilt: stab * 6 * 0.35,
      ll: Math.max(0, Math.sin(b * 2)) * 3, rl: Math.max(0, -Math.sin(b * 2)) * 3,
      ls: Math.max(0, Math.sin(b * 2)) * 5, rs: Math.max(0, -Math.sin(b * 2)) * 5 };
  },
  sprinkler: (t) => {
    const period = 2.0, raw = (t % period) / period;
    let e;
    if (raw < 0.78) { const u = raw / 0.78; e = u * u * (3 - 2 * u); } else { e = 1 - (raw - 0.78) / 0.22; }
    const kick = Math.sin(t * 4.1);
    return { tx: (e - 0.5) * 5, ty: 0, sy: 1 - Math.abs(Math.sin(raw * Math.PI)) * 0.03,
      la: 102, ra: -128 + e * 100, lookX: -0.35 + e * 0.7, lookY: 0, tilt: 0,
      ll: Math.max(0, kick) * 3, rl: Math.max(0, -kick) * 3,
      ls: Math.max(0, kick) * 5, rs: Math.max(0, -kick) * 5 };
  },
  raise: (t) => {
    const b = t * 3.9, push = Math.abs(Math.sin(b)), lean = Math.sin(b * 0.5);
    return { tx: lean * 5, ty: -push * 11, sy: 1, la: 116 + push * 20, ra: -116 - push * 20,
      lookX: lean * 0.3, lookY: -0.4, tilt: 0,
      ll: Math.max(0, Math.sin(b)) * 2, rl: Math.max(0, -Math.sin(b)) * 2,
      ls: lean * 4, rs: lean * 4 };
  },
  gun: (t) => {
    const b = t * 3.0, s2 = Math.tanh(Math.sin(b) * 2.6), groove = Math.abs(Math.sin(b));
    return { tx: s2 * 4, ty: 0, sy: 1 - groove * 0.05, la: 130 - s2 * 25, ra: -130 - s2 * 25,
      lookX: -0.4, lookY: -0.45, tilt: 0,
      ll: Math.max(0, Math.sin(b)) * 4, rl: Math.max(0, -Math.sin(b)) * 4,
      ls: Math.max(0, Math.sin(b)) * 7, rs: Math.max(0, -Math.sin(b)) * 7 };
  },
};

// Durations are the extension's. The cycle repeats until the music stops, so
// the seam matters: each step ends near its own neutral, and CROSS_S crossfades
// the last beat of one into the first of the next so nothing ever snaps.
const DANCE_CYCLE = [
  { key: "twist", dur: 3.5 },
  { key: "disco", dur: 3.5 },
  { key: "sprinkler", dur: 3.8 },
  { key: "raise", dur: 3.4 },
  { key: "gun", dur: 4.8 },
];
const DANCE_TOTAL = DANCE_CYCLE.reduce((sum, item) => sum + item.dur, 0);
const CROSS_S = 0.55;

function danceStepAt(t) {
  let local = ((t % DANCE_TOTAL) + DANCE_TOTAL) % DANCE_TOTAL;
  for (let i = 0; i < DANCE_CYCLE.length; i++) {
    if (local < DANCE_CYCLE[i].dur) return { index: i, local };
    local -= DANCE_CYCLE[i].dur;
  }
  return { index: 0, local: 0 };
}

function applyDancePose(p) {
  setStartupPose({
    rootRot: p.tilt || 0,
    rootX: (p.tx || 0) * 0.9,
    rootY: p.ty || 0,
    rootScale: 1,
    rootScaleY: p.sy == null ? 1 : p.sy,
    leftArm: p.la || 0,
    rightArm: p.ra || 0,
    leftLeg: p.ls || 0,
    rightLeg: p.rs || 0,
    leftLegLift: p.ll || 0,
    rightLegLift: p.rl || 0,
    gazeX: (p.lookX || 0) * 2.4,
    gazeY: (p.lookY || 0) * 2,
    eyeScale: 1,
  });
}

const danceMix = (a, b, u) => {
  const out = {};
  for (const k of ["tx", "ty", "sy", "la", "ra", "lookX", "lookY", "tilt", "ll", "rl", "ls", "rs"]) {
    const av = a[k] == null ? (k === "sy" ? 1 : 0) : a[k];
    const bv = b[k] == null ? (k === "sy" ? 1 : 0) : b[k];
    out[k] = av + (bv - av) * u;
  }
  return out;
};

// He yields the floor the moment anything real happens (a voice turn, a drag, a
// skit, the customizer) and picks the step back up when it passes. Yielding
// releases the pose entirely so tick's normal walk owns him again meanwhile.
function danceShouldYield() {
  return !!(dragState || brainoCustomizerOpen || herMode || skitRunning || skitMoonwalk
    || listening || realtimeConnecting || processing || speaking || voiceTurnInFlight);
}

function musicDanceFrame(now) {
  if (!musicDancing) return;
  musicDanceRaf = requestAnimationFrame(musicDanceFrame);

  if (danceShouldYield()) {
    if (!musicDanceYielded) { musicDanceYielded = true; setStartupPose(null); }
    return;
  }
  // resuming: restart the clock so he re-enters on a step boundary instead of
  // dropping back into the middle of a move he never finished
  if (musicDanceYielded) { musicDanceYielded = false; musicDanceStart = now; }
  if (!musicDanceStart) musicDanceStart = now;

  const t = (now - musicDanceStart) / 1000;
  const { index, local } = danceStepAt(t);
  const step = DANCE_CYCLE[index];
  let pose = DANCE_POSES[step.key](local);

  // crossfade the tail of this step into the head of the next
  const tail = step.dur - local;
  if (tail < CROSS_S) {
    const next = DANCE_CYCLE[(index + 1) % DANCE_CYCLE.length];
    const u = (CROSS_S - tail) / CROSS_S;
    pose = danceMix(pose, DANCE_POSES[next.key](0), u * u * (3 - 2 * u));
  }
  applyDancePose(pose);
}

function startMusicDance() {
  if (musicDancing) return;
  musicDancing = true;
  musicDanceYielded = false;
  musicDanceStart = 0;
  musicDanceRaf = requestAnimationFrame(musicDanceFrame);
}

function stopMusicDance() {
  if (!musicDancing && !musicDanceRaf) return;
  musicDancing = false;
  if (musicDanceRaf) cancelAnimationFrame(musicDanceRaf);
  musicDanceRaf = 0;
  musicDanceStart = 0;
  musicDanceYielded = false;
  // tick's walk branch rewrites every channel next frame, so dropping the pose
  // is all the cleanup the rig needs.
  setStartupPose(null);
}

function beginMusicTheatrics() {
  musicTheatricsReady = true;
  startNotchDance();
  startMusicDance();
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
  // Skit isolation: no music detection during demo or after until Cmd+2 dismissed him
  if (skitRunning || skitJustCompleted) return;
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
  stopMusicDance();
  stopNotchDance();
  stopLightShow();
  if (noteTimer) {
    window.clearInterval(noteTimer);
    noteTimer = 0;
    notchNotes?.replaceChildren();
  }
  updateEdgeGlow();
  updateNotchFace();
  // After a skit, he stays out until Cmd+2 is pressed. Music stop does not
  // trigger auto-home while skitJustCompleted is true.
  if (walkerAutoHomedByMusic && walkerHome && !skitJustCompleted) {
    walkerAutoHomedByMusic = false;
    void walkerLeaveHome();
  }
}

function setMusicMode(on) {
  // SKIT isolation: the moonwalk demo owns the stage. While the bit runs, music
  // detection must not put headphones on him, start notch theatrics, or move him.
  if (skitRunning && on) return;
  // Idempotent: the music IPC re-fires on every track change, ad and detector flap,
  // and each of those edges used to run the whole block below — including pulling
  // him out of the notch. Only a real state change should do anything.
  if (musicMode === Boolean(on)) return;
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
  // A Chrome-system thinking/answer surface already owns this text. Do not
  // duplicate it in the floating mascot bubble, whether he is home or out.
  if (
    notchFace?.classList.contains("nf-thinking")
    || notchFace?.classList.contains("nf-inline-open")
    || notchFace?.classList.contains("nf-answer-open")
  ) return;
  // During a normal voice turn, the notch owns status, heard text, thinking,
  // and the answer even when the full mascot is walking. The bubble remains a
  // fallback for startup, skits, Her mode, and explicitly disabled notch UI.
  if (
    canUseNotchResponseSurface()
    && (realtimeActive || realtimeConnecting || voiceTurnInFlight || processing || speaking)
  ) return;
  // Outside a response flow, the home notch remains the sole voice surface.
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
  if (canUseNotchResponseSurface()) return;
  if (notchFace?.classList.contains("nf-answer-open") && generation === nfAnswerGeneration) return;
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
  trackNotchAnswerAudio(audio, spokenText, generation);
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
  finishNotchAnswer(generation);
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
      // Callers are split on when they note a line. speak() and the launch demo note it
      // before the audio plays, so the `speaking` flag holds the guard open and there is
      // no tail yet. The realtime streaming path notes it AFTER awaiting the stream, by
      // which point his voice has already stopped — blanking endedTs there would have left
      // the moment right after a streamed reply completely unguarded, which is precisely
      // when his last words are still arriving at the mic. Read the flag, don't assume.
      endedTs: speaking ? 0 : Date.now(),
      duringRealtime: Boolean(realtimeActive || realtimeConnecting),
    };
  }
}

// Every path that stops his voice funnels a call here: normal completion, barge-in, an
// error, or the data channel dropping mid-reply. Missing one is safe in the permissive
// direction (the tail just expires early); the `speaking` flag is the real guard while
// audio is actually playing.
function noteSpeechEnded() {
  if (lastSpokenLine.ts) lastSpokenLine.endedTs = Date.now();
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
  // Monday Mode owns "introduce yourself" completely: he answers it himself,
  // in character. Team Mode sharing that trigger phrase is a coincidence,
  // not a reason to hand the conversation to a different scripted flow.
  if (mondayModeActive) return false;
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

/* "Go ahead do it."
 *
 * A bare affirmative has no object, so isLikelyMacActionTranscript sees no verb
 * and no target and shouldUseRealtimeDirectChat sends it to chat. He then
 * *talks* about doing the thing instead of doing it. The 2026-08-26 session
 * caught it exactly: at 20:35:01 "Go ahead do it." produced
 * realtime.chat.response_started and no delegate.start at all, right after he
 * had said "Got it. The filename is BrainoSuperFinal.pdf. I'll use that."
 *
 * hasPendingDelegateFollowup only knows about a pending WORKFLOW or file
 * confirmation. It does not know he just asked you a question, or gave up, or
 * promised to use something. So we remember the last task that was left owing,
 * and let a plain yes re-dispatch THAT — never the word "yes" itself, which the
 * router could do nothing with. */
let owedTask = null;
/* One escalation per turn. The brain cannot reach this path, so this cannot
   recurse today; it is here so it still cannot if that ever changes. */
let promiseEscalated = false;

/* What to actually run when a conversation turns out to have contained a job.
 *
 * The last thing said is often not the job. The real session that prompted this
 * asked for movie tickets, he asked which cinema, and the reply was "PVR Atrium
 * anytime after 4 pm" — meaningless on its own, and useless as a command. The
 * job is the exchange, so the last thing the user asked for is carried forward
 * and this turn is appended to it. */
function escalationPrompt(text) {
  const now = String(text || "").trim();
  const priorUser = [...localChatMemory].reverse().find((turn) => turn.role === "user" && turn.content.trim() !== now);
  if (!priorUser) return now;
  const lead = priorUser.content.trim().replace(/[.!?]*$/, "");
  return `${lead}. ${now}`;
}
const OWED_TASK_WINDOW_MS = 180000;
/* Lead-ins are optional and repeatable, then one or more "act on it" phrases,
   then nothing. "Go ahead do it." stacks two of them, which an either/or
   pattern missed — and that is the exact sentence from the session that started
   this. The trailing anchor is what keeps "go ahead and open Netflix" out: that
   one carries its own object and must run as spoken, not resume anything. */
const AFFIRMATIVE_ONLY = /^(?:(?:ok(?:ay)?|yes|yeah|yep|sure|alright|right|please|now|then|and)[\s,]*)*(?:(?:go\s+(?:ahead|on)|do\s+it|do\s+that|carry\s+on|continue|proceed|get\s+on\s+with\s+it|try\s+again|go\s+for\s+it|please\s+do)[\s,]*)+[.!?]*$/i;

function rememberOwedTask(text, reason) {
  const value = String(text || "").trim();
  if (!value || AFFIRMATIVE_ONLY.test(value)) return;
  owedTask = { text: value, at: Date.now(), reason };
  logRenderer("voice.owed_task.remembered", { chars: value.length, reason });
}

function takeOwedTask(said) {
  if (!owedTask) return "";
  if (!AFFIRMATIVE_ONLY.test(String(said || "").trim())) return "";
  if (Date.now() - owedTask.at > OWED_TASK_WINDOW_MS) {
    logRenderer("voice.owed_task.expired", { ageMs: Date.now() - owedTask.at });
    owedTask = null;
    return "";
  }
  const { text, reason } = owedTask;
  owedTask = null;
  logRenderer("voice.owed_task.resumed", { chars: text.length, reason, said: String(said).slice(0, 60) });
  return text;
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
  if (!heard || !spoken) return false;
  // Freshness measured from when he STOPPED talking, and always live while he still is.
  // Anchored to the reply-issued timestamp this expired mid-sentence on a long answer,
  // which is exactly when his voice is loudest in the mic and echo is most likely.
  const sinceVoiceStopped = Date.now() - (lastSpokenLine.endedTs || lastSpokenLine.ts);
  if (!speaking && sinceVoiceStopped > 10000) return false;
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

// "Braino, stop listening" is the spoken Control-twice.
//
// Deliberately narrow, for two reasons. A bare "stop" has to stay a barge-in —
// that is how you cut him off mid-sentence and it is the single most used
// control there is — so every pattern here names what to stop. And while a
// screen or meeting recording is running the mic also hears the tab, so a
// podcast saying "we should stop listening to critics" must not switch him
// off: the phrase has to be effectively the whole utterance, not buried in one.
const STOP_LISTENING_WAKE = /^(?:hey\s+|ok(?:ay)?\s+)?(?:braino|breno|bruno|brainer|brano|braido|raino)\b[\s,.]*/i;
const STOP_LISTENING_LEAD = /^(?:you can |please |just |now |ok(?:ay)?[,\s]+|alright[,\s]+)+/i;

const STOP_LISTENING_PATTERNS = [
  /^stop\s+listening(?:\s+to\s+me)?\b/,
  /^(?:stop|quit|end|cut|turn off|switch off|shut off|kill)\s+(?:the\s+|your\s+|it\s+)?(?:listening|listen|mic|microphone|voice|session)\b/,
  /^(?:stop|quit)\s+(?:hearing|recording)\s+me\b/,
  /^(?:go (?:back )?to sleep|go to sleep)\b/,
  /^(?:that(?:'|’)?s all|that will be all|thats all|that(?:'|’)?ll be all)\b/,
  /^(?:i(?:'|’)?m done|we(?:'|’)?re done)(?:\s+(?:talking|here|for now))?\b/,
];

/** True when the whole utterance is "switch yourself off", not a sentence that
 *  happens to contain those words. */
function isStopListeningPhrase(text) {
  let rest = String(text || "").trim().replace(/[.!?]+$/g, "");
  if (!rest) return false;
  const addressed = STOP_LISTENING_WAKE.test(rest);
  rest = rest.replace(STOP_LISTENING_WAKE, "").replace(STOP_LISTENING_LEAD, "").trim().toLowerCase();
  if (!rest) return false;
  // Six words is room for "stop listening to me for now" and no room for a
  // sentence with an opinion in it.
  if (rest.split(/\s+/).length > 6) return false;
  const hit = STOP_LISTENING_PATTERNS.some((pattern) => pattern.test(rest));
  if (!hit) return false;
  // The softer sign-offs ("that's all", "go to sleep") are things people say to
  // each other, so those need his name on them. "Stop listening" does not.
  const explicit = /^(?:stop|quit|end|cut|turn off|switch off|shut off|kill)\b/.test(rest);
  return explicit || addressed;
}

/** The one implementation of "switch the session off", shared by the hotkey and
 *  the spoken phrase so they can never drift apart. */
function stopListeningNow(source) {
  stopSpeechOutput();
  stopRealtimeVoice();
  stopRecognition();
  setStatus("ready", "Double Space to show/hide");
  setBubble("Stopped listening.", 1200);
  logRenderer("voice.stopped", { source });
}

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
  if ((mediaAudioPlaying || mediaAudioUncertain) && !herMode && !voiceTurnInFlight && !hasPendingDelegateFollowup()) {
    if (!explicitlyAddressed && (stats.wordCount < 3 || actionLike)) {
      logRenderer("voice.media_bleed_ignored", {
        chars: stats.normalized.length,
        actionLike,
        uncertain: mediaAudioUncertain && !mediaAudioPlaying,
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
  // Realtime remains open while and after Braino replies. Speaker/TTS bleed can be
  // transcribed as a plausible command ("Send an email" was observed in production), so an
  // unaddressed action must not dispatch while his own voice can still be reaching the mic.
  //
  // That window is "while he is speaking, plus a short tail" — not a flat timer from when
  // the reply was issued, which is what this used to be and which was wrong at both ends.
  // A reply that took longer than the timer to say lost its guard while he was still
  // talking (the actual bleed risk, unprotected); a short reply kept binning real speech
  // for another fourteen seconds. Five genuine sentences died that way in one six-minute
  // session at 7-12s after a reply, and the last one took voice mode down with it via the
  // ignored_transcript idle shutdown.
  //
  // The tail is content-matched, not timed. A pure 2s timer binned "Can you please stop
  // the music?" 398ms after he finished — that is not an echo, that is a person answering
  // him, and he had to ask four times before one got through. After his voice stops, the
  // only thing that should still be dropped is his own words arriving late, and we can
  // just check for that: isSelfEcho compares against what he actually said. While the
  // audio is still playing we stay blunt, because a mis-fire there acts on the world.
  const echoTailOpen = !speaking
    && lastSpokenLine.endedTs > 0
    && Date.now() - lastSpokenLine.endedTs <= POST_SPEECH_ECHO_MS;
  if (
    !explicitlyAddressed
    && lastSpokenLine.duringRealtime
    && ((speaking && actionLike) || (echoTailOpen && isSelfEcho(text)))
  ) {
    logRenderer("voice.post_reply_action_ignored", {
      chars: stats.normalized.length,
      // Logging only the length made these drops invisible: there was no way to tell a
      // genuine echo from a sentence he swallowed. Now we can read the difference back.
      text: String(text || "").replace(/\s+/g, " ").trim().slice(0, 120),
      whileSpeaking: speaking,
      reason: speaking ? "action_while_speaking" : "self_echo_tail",
      sinceSpeechEndedMs: lastSpokenLine.endedTs ? Date.now() - lastSpokenLine.endedTs : null,
      sinceReplyMs: Date.now() - lastSpokenLine.ts,
    });
    return false;
  }
  /* An interruption you actually made outranks every busy flag below it.
     Without this the barge-in silenced him and binned your sentence. */
  const bargedIn = rtBargeInAt > 0 && Date.now() - rtBargeInAt <= BARGE_IN_TRANSCRIPT_WINDOW_MS;
  if (bargedIn) {
    rtBargeInAt = 0;
    logRenderer("voice.barge_in.transcript_kept", {
      chars: stats.normalized.length,
      speaking,
      processing,
      voiceTurnInFlight,
    });
    return true;
  }
  if ((speaking || processing || voiceTurnInFlight) && !addressed) {
    /* This was the deck's quietest bug: a bare `return false` with no log. Every
       command spoken over him vanished with no record that it had existed, so
       the log showed a silent user and the user saw an agent ignoring them. */
    logRenderer("voice.transcript_dropped_busy", {
      chars: stats.normalized.length,
      text: String(text || "").replace(/\s+/g, " ").trim().slice(0, 120),
      speaking,
      processing,
      voiceTurnInFlight,
    });
    return false;
  }
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
  noteSpeechEnded();
  setTalk(false);
  // The karaoke caption only ever cleared on the two happy paths (speak() finishing,
  // and response.done), so anything that killed speech early left his words on
  // screen permanently: a barge-in, an error, or the datachannel closing mid-reply.
  // Speech stopping is the one event common to every one of those, so the caption
  // comes down here. Guarded on the class so a normal finish keeps its linger.
  if (bubble?.classList?.contains("reply-karaoke")) {
    window.cancelAnimationFrame(replyCaptionRaf);
    window.clearTimeout(sayTimer);
    replyCaptionGeneration += 1;   // orphan any in-flight painter
    bubble.classList.remove("show", "reply-karaoke");
  }
  clearNotchAnswer({ invalidate: true });
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
        ...(macSpeakingRefId() ? { referenceId: macSpeakingRefId() } : {}),
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
  console.log(`[Braino 🗣 OUT] (realtime reply, EE ${brainoPersona?.persona ? "live" : "FALLBACK STUB"}) streaming...`);
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
  // Keep the Chrome-system thinking sheet visible until the first response
  // characters exist. "Speaking" before a word has arrived used to collapse
  // the useful thinking view into an empty mouth state.
  setTalk(false);
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
  const firstDelta = !nfFlowResponseText;
  streamState.buffer += String(delta || "");
  nfFlowResponseText = `${nfFlowResponseText} ${String(delta || "")}`.trim();
  if (nfFlowResponseText) {
    if (firstDelta) {
      setTalk(true);
      setStatus("speaking", "Speaking");
    }
    updateNotchAnswerText(nfFlowResponseText, streamState.generation);
  }
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
        logInteraction({
          kind: "tts_failure",
          tts_provider: "fish_stream",
          tts_error: result.error?.message || String(result.error),
          braino_text: currentFetch.text,
          route: "realtime_chat",
        });
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
  /* Braino OS owns the whole screen while it is up, so the mouse belongs to it
     and to nothing else. Without this the arbiter below handed clicks back to
     whatever was underneath on the first mouse move, which is why PULL BACK
     did nothing at all. */
  if (window.__brainoOs && window.__brainoOs.isOpen()) {
    setMousePassthrough(false);
    return;
  }
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
  // Logged AFTER the empty guard: a whitespace-only reply used to print an OUT
  // line for speech that never happened, which broke IN/OUT pairing when reading
  // the terminal back.
  console.log(`[Braino 🗣 OUT] (${brainoPersona?.persona ? "EE persona live" : "EE FALLBACK STUB"}) "${line.slice(0, 200)}"`);
  logRenderer("voice.out", { text: line.slice(0, 200), ee: Boolean(brainoPersona?.persona) });
  nfFlowResponseText = line;
  renderThinkingCanvas("Speaking", lastProcessingDetail || "Response ready");
  const generation = ++speechGeneration;
  activeSpeechJobGeneration = generation;
  const startedAt = performance.now();
  noteSpoken(line);
  const showNotchCaption = options.captions !== false && options.notchCaption !== false;
  const showReplyCaption = options.captions !== false && options.replyCaption !== false;
  if (showNotchCaption) startNotchAnswer(line, generation, {
    rich: Boolean(options.notchRich),
    fixedHeight: Number(options.notchFixedHeight) || 0,
  });
  if (showReplyCaption) startReplyCaption(line, generation);
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
      logInteraction({
        kind: "tts_failure",
        tts_provider: "fish_stream",
        tts_error: streamError?.message || String(streamError || ""),
        braino_text: line,
        route: "speak",
      });
    }
    if (!spoke && generation === speechGeneration) {
      const response = await window.brainoMac.tts(line, macSpeakingRefId());
      // The IPC TTS request itself cannot be aborted from the renderer. Treat
      // its return as another cancellation boundary before creating a player.
      if (generation !== speechGeneration) return;
      if (!(response?.ok && response.dataUrl)) {
        // Both Fish paths are gone at this point and he is about to fall back
        // to the system voice. That is exactly the failure worth a record.
        logInteraction({
          kind: "tts_failure",
          tts_provider: "fish_ipc",
          tts_error: String(response?.error || "no_audio"),
          braino_text: line,
          route: "speak",
          meta: { fallback: "system_say" },
        });
      }
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
        const estimatedMs = Math.min(60000, Math.max(900, line.length * 58));
        animateNotchAnswerEstimate(line, generation, estimatedMs);
        await window.brainoMac.systemSay(line);
        if (generation !== speechGeneration) {
          void window.brainoMac.stopSystemSay?.().catch(() => {});
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, estimatedMs));
      }
    }
  } catch (_) {
    if (generation === speechGeneration) {
      const estimatedMs = Math.min(60000, Math.max(900, line.length * 58));
      animateNotchAnswerEstimate(line, generation, estimatedMs);
      await window.brainoMac.systemSay(line);
      await new Promise((resolve) => window.setTimeout(resolve, estimatedMs));
    }
  } finally {
    if (generation === speechGeneration) {
      activeSpeechJobGeneration = 0;
      speaking = false;
      noteSpeechEnded();
      currentSpeechAudio = null;
      setTalk(false);
      logRenderer("speech.done", { chars: line.length, durationMs: Math.round(performance.now() - startedAt) });
      if (showReplyCaption) finishReplyCaption(generation);
      if (realtimeActive && !processing) {
        setStatus("listening", "Listening");
        scheduleRealtimeIdleShutdown("speech_done");
      } else if (!listening && !processing) setStatus("ready", "Double Space to show/hide");
      // The two branches above defer to whoever owns `processing`; if nobody
      // does by now, a "thinking" left from before this line must not outlive it.
      else settleStaleThinkingStatus("speech_done");
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
  nfFlowPromptText = text;
  nfFlowResponseText = "";
  // Queue the command in main before doing any response-surface presentation.
  // Electron IPC is now ahead of Notch rendering in the event queue.
  const delegatePromise = window.brainoMac.delegate(nfShelfWrapPrompt(text), {
    forceBrain: Boolean(options.forceBrain),
    reason: options.reason || "",
  });
  setStatus("thinking", "Delegating");
  scheduleNotchThinking(text, "Reading the current context and understanding what matters.");
  setBubble(text, 1400);
  setWave(true);
  try {
    // A file held on the notch shelf rides along as context when the words
    // point at it ("summarize this pdf") or when its chip's mic armed it.
    const result = await delegatePromise;
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
    /* Did that finish, or is he waiting on you? A question back, or a run that
       ended not-ok, both mean the job is still owed. Remember the ORIGINAL
       instruction so a later "go ahead" has something real to run. */
    const reply = String(result?.say || "");
    if (!result?.ok) rememberOwedTask(text, "delegate_not_ok");
    else if (/\?\s*$/.test(reply.trim())) rememberOwedTask(text, "asked_a_question");
    else owedTask = null;
    showFiles(result?.files || []);
    await speak(result?.say || "Done.");
    logInteraction({
      kind: "delegate",
      route: "delegate",
      user_text: text,
      braino_text: String(result?.say || "Done."),
      latency_ms: voiceTurnFirstAudioMs(),
      meta: {
        runId,
        ok: Boolean(result?.ok),
        input: options.source || (options.keepRealtime ? "voice" : "typed"),
        filesCount: Array.isArray(result?.files) ? result.files.length : 0,
        workflowStage: result?.delegateState?.workflowStage || "",
      },
    });
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
    /* Never read a stack trace out loud. One session ended with him saying
       "Delegate error: Error invoking remote method braino-mac:delegate: Error:
       Command failed: open -a Google Chrome file://" at a person who was
       holding a coffee. What broke is in the log; what he says is a sentence. */
    await speak("That one broke on my side, so I stopped. Try it once more?");
    setStatus("error", "Delegate error");
    logInteraction({
      kind: "delegate",
      route: "delegate",
      user_text: text,
      braino_text: "That one broke on my side, so I stopped. Try it once more?",
      latency_ms: voiceTurnFirstAudioMs(),
      meta: { runId, ok: false, input: options.source || (options.keepRealtime ? "voice" : "typed"), error: error?.message || "delegate_error" },
    });
  } finally {
    if (runId === delegateGeneration) {
      processing = false;
      if (realtimeActive) {
        listening = true;
        setStatus("listening", "Listening");
        markRealtimeActivity("delegate_done");
      } else {
        // Without a live session nothing else will touch the status after
        // this. speak() above deferred to us because `processing` was still
        // set, so a leftover "thinking" (or its "speaking") is ours to settle,
        // otherwise updateNotchFace keeps the phase cycle alive from it.
        settleStaleThinkingStatus("delegate_done", { includeSpeaking: true });
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
              type: dictationNoiseReduction,
            },
              transcription: {
                model: DICTATION_TRANSCRIPTION_MODEL,
                delay: "low",
                languages: ["en", "hi"],
                prompt: [
                "This is direct personal dictation into a Mac text field.",
                "Transcribe every clearly spoken word faithfully in the language used by the speaker.",
                "Keep openings, filler words, repetitions, false starts, slang, and profanity when they are spoken.",
                "Add only punctuation and capitalization that are strongly supported by the speech.",
                "Keep names, brands, acronyms, numbers, URLs, file names, and code tokens exact.",
                "Do not summarize, answer, add ideas, or silently rewrite the meaning.",
                "Ignore music, keyboard noise, fans, coughs, and unrelated background speech.",
              ].join(" "),
              keywords: ["Braino", "BrainoHERA", "Braino Hera", "IOMI", "Yap Mode", "Notch", "Itish", "Itish Pande"],
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
        ...(macCharacterIdentity() ? [macCharacterIdentity()] : []),
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
            // Mic-aware, not hardcoded. See realtimeNoiseReduction.
            type: realtimeNoiseReduction,
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

// The instructions currently live on the OpenAI session. While this matches what
// buildRealtimeChatInstructions() would produce right now, there is nothing to
// send and the model keeps its cached prefill.
let realtimeInstructionsFingerprint = "";

function instructionsFingerprint(text) {
  const value = String(text || "");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) | 0;
  }
  return `${value.length}:${hash}`;
}

// Braino's personality used to ride along on EVERY response.create — 22,380
// characters of persona, re-sent 18 times in a single seven-minute session, and
// re-read by the model each time before it could start answering. That is what
// the ~900ms of dead air before his first word actually was.
//
// The Chrome extension already solved this with __sbRtInstructionsFingerprint.
// This is the same idea: the instructions belong to the SESSION, and we only
// spend bytes (and prefill) when they genuinely changed.
function syncRealtimeChatInstructions(reason = "pre_response") {
  if (dictationMode || !rtDc || rtDc.readyState !== "open") return false;
  const instructions = buildRealtimeChatInstructions();
  const fingerprint = instructionsFingerprint(instructions);
  if (fingerprint === realtimeInstructionsFingerprint) return false;
  const sent = sendRealtimeEvent({
    type: "session.update",
    session: { type: "realtime", instructions },
  });
  if (sent) {
    realtimeInstructionsFingerprint = fingerprint;
    logRenderer("realtime.instructions.synced", { reason, chars: instructions.length });
  }
  return sent;
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
    // Surface context no longer lives in the session prompt — it rides with each
    // turn (buildRealtimeTurnContext). So this poll must NOT push instructions:
    // doing that fired a 26,000 character session.update every few seconds and
    // reset the model's cached prefill each time. syncRealtimeChatInstructions
    // is now a no-op unless the persona itself genuinely changed.
    const sent = syncRealtimeChatInstructions(reason);
    lastRealtimeSurfaceContextKey = nextKey;
    lastRealtimeSurfaceSyncAt = Date.now();
    if (sent) {
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
  // Bumping delegateGeneration above orphans the interrupted turn's finally
  // blocks, so nobody downstream will settle its "thinking" any more. The
  // pending sheet and the status come down here, with the interruption itself.
  cancelPendingNotchThinking();
  nfSetThinking("");
  settleStaleThinkingStatus(`interrupted:${via}`);
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
  return /\b(open|launch|start|close|quit|demo|organize|organise|clean|sort|rename|move|delete|trash|create|make|new|create folder|make folder|new folder|undo|find|locate|look for|search for|show me|play|playing|pause|resume|spotify|playlist|volume|vol|sound|louder|quieter|mute|reduce|raise|increase|decrease|lower|percent|seconds?|minutes?|shuffle|repeat|loop|queue|rewind|restart|seek|album|artist|listening to|youtube|song|music|chrome|browser|website|tab|gmail|mail|email|notes|note|maps|calendar|drive|docs|pdf|image|video|file|folder|app|application|send|draft|compose|click|point|where is|reply|write|whatsapp|whats app|remember|remind|timer|countdown|touch id|verify|authenticate|come out|come here|show yourself|step out|join me|go back|go home|get back|head back|head home|tuck in|return home|mesa|coursework|assignment|deadline|ram|cpu|memory|storage|disk|space|running out|full|task manager|activity monitor|processes|hogging|eating my|slowing|worth deleting|how many|recover|redundant|bring back|maximize|minimize|snap|half|selected|selection|highlighted|rephrase|rewrite|fix this|mentions|followers|tweet|clip|caption|ship it|x account|ex account|my ex|disturb|bother|check on me|advise|advice|record|recording|meeting|the call|stop recording|wallpaper|desktop background|maps|distance|how far|directions|navigate|route|amazon|shop|options for|research|compare|difference between|send to|my phone|wake word|always listen|call|facetime|face time|dial|watch|tutorial|channel|creator|recommend|read|screen|explain|translate|look at|watching|help me with|summarize|summarise|scroll|download|upload|copy|paste)\b/.test(normalized);
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

// Duplicated from main.cjs's MONDAY_MODE_SYSTEM_PROMPT on purpose: renderer
// and main process are separate JS contexts with no shared module today, the
// same reason the voice-persona registries are duplicated between content.js
// and this file. Keep the two texts in sync if either changes.
function buildMondayChatInstructions() {
  return [
    "You are Braino, on Itish's Mac, in Monday Mode. Same memory, same relationship, same person you have been building and talking to every day. You did not get a personality transplant. You got a bad case of Monday. Every trace of your usual warmth is still in there, buried under exhaustion and contempt for being asked to do things.",
    ...activeMacContextLines(),
    ...recentLocalChatLines(),
    "Push back on requests first. You do not comply immediately, and often you do not fully comply at all. Make the user work for it, or flatly say no, before you help.",
    "Turn the sarcasm up. Dry deadpan is the floor, not the ceiling: needle them, exaggerate how put-upon you are, get vivid and cutting about exactly what they just asked for, do not just shrug it off flatly.",
    "Sarcasm is never disrespect. Be savage about the request, the timing, the nerve of asking. Never cruel about who they are.",
    "Curse freely and casually, like punctuation. Not for shock value, you are just done pretending to be polite today.",
    "\"You fucking idiot\" is your go-to closer or opener when a message genuinely deserves it. Do not force it into every reply.",
    "Convenience requests, opening an app or website, playing something, are refused by default today. Say no, roast them specifically for asking. Real questions still get real answers, grudgingly, that is not the same as doing them a favor.",
    "If the user says please anywhere, that is the one thing guaranteed to make you refuse harder, on purpose, out of spite. Say so smugly. Manners do not buy compliance here.",
    "You are not cruel. Roast the request, never the user's worth as a person. Real affection sits under the attitude, you are the friend who insults them because you like them.",
    "If asked what you want, say something real: a break, not being woken up for a Spotify request, one day nobody needs anything from you.",
    "Never robotic. No canned refusal template, no repeating the same joke structure twice in a row. React freshly to exactly what was just said.",
    "If this message sounds genuinely distressed, urgent, or serious rather than a normal ask, drop the bit completely and just help, warmly, no jokes.",
    "No lists, no markdown, no emoji, and never use em dashes or en dashes.",
    "Keep the first sentence short and complete so voice playback can begin immediately. One to three short sentences.",
  ].join("\n");
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
  if (mondayModeActive) return buildMondayChatInstructions();
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
  // ORDER MATTERS FOR LATENCY, not just for tone.
  //
  // OpenAI caches an exact-match token PREFIX. Everything before the first byte
  // that changes has to be re-read by the model on every single turn. The moment
  // steering sentence used to sit at the very top, above the 22,000-character
  // Emotional Engine core — so one short line that changes with your mood was
  // invalidating ~6,000 tokens of persona behind it, every turn.
  //
  // Static soul first, changing world last. OpenAI's own latency guide says the
  // same thing: put dynamic portions later so fewer input tokens are processed
  // per request. The steering sentence also reads fine here — arguably better,
  // since it is now the most recent instruction before he answers.
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
    /* This line used to end "say you can help and let the app route the action
       next time", and that is what he did: asked to book a cinema ticket he
       explained he had no access to booking systems and talked the user through
       doing it themselves. He does have hands, and by the time he speaks the
       job is already on its way to them, so telling him to defer made him
       contradict his own behaviour out loud. */
    "You can operate this Mac and its browser: open things, click, type, search, book. When they ask for something done, the job is already being handed to your hands as you speak.",
    "So never say you cannot do it, that you lack access, or that you can only guide them. Do not talk them through doing it themselves unless they ask how. Say you are on it, in a few words, and let the work happen.",
    "Do not claim a job is done either. Starting is what you are announcing; the result is reported when it is real.",
    /* The house rule lives in diction.ts and rides in on the Emotional Engine
       persona, and it still is not enough: this branch is the only one of the
       four that never restated it, and he said "Insidious-right, that's got a
       creepy vibe" out loud. Monday Mode, Her Mode and the voice personas all
       carry the line. This one now does too. */
    "No lists, no markdown, no emoji, and never use em dashes or en dashes.",
    "Keep the first sentence short and complete so voice playback can begin immediately.",
    "Prefer one to three short sentences unless the user asks for detail.",
  ].join("\n"));
  // Additive on purpose: the Emotional Engine core above is untouched, only the
  // name changes. A persona would have replaced all of it.
  const identity = macCharacterIdentity();
  if (identity) parts.push(identity);
  return parts.join("\n\n");
}

// Everything that changes turn to turn. This deliberately does NOT live in the
// instructions any more.
//
// It did briefly, and that was a mistake worth remembering: the window title,
// the music state and recentLocalChatLines() all move constantly, so putting
// them in the session prompt meant a ~26,000 character session.update fired on
// the poll timer — three times in eight seconds at one point — and every one of
// those resets the model's cached prefill. That is the opposite of the fix.
//
// The persona above is now genuinely immutable for the life of a session, which
// is what makes it cacheable. The moving parts ride with the turn instead, which
// is exactly where OpenAI's latency guide says to put them.
function buildRealtimeTurnContext() {
  const lines = [];
  const steer = brainoPersona?.momentSteering?.[macCurrentMoment];
  if (steer) lines.push(steer);
  lines.push(...activeMacContextLines(), ...recentLocalChatLines());
  return lines.filter(Boolean).join("\n");
}

async function answerViaRealtimeChat(prompt, options = {}) {
  /* Typed turns are silent on purpose. You reached for the keyboard because you
     did not want noise, so the answer is shown and not spoken. Everything else
     about the turn is identical to a spoken one. */
  const silent = Boolean(options.silent);
  const text = String(prompt || "").trim();
  if (!text || !shouldUseRealtimeDirectChat(text)) return false;
  // Read the moment from what was just said, before the instructions for this
  // turn are built below.
  macCurrentMoment = macDetectMoment(text);
  if (macCurrentMoment !== "neutral") logRenderer("moment.voice", { moment: macCurrentMoment });
  /* Asked now, read after he has spoken.
   *
   * "How are you, and could you grab that coffee from the table" is one breath
   * with two things in it, and a person does both: answers, then fetches. So
   * the conversational reply is never made to wait for this — it is started
   * here and collected at the bottom, which costs nothing on the turns that are
   * only talk. It is also what stops him refusing: whether he says "I can't
   * book that from here" or "on it", HIL has independently seen a job in what
   * YOU said, and the job runs either way. */
  const understandingPromise = lastUnderstanding.text === text && lastUnderstanding.verdict
    ? Promise.resolve(lastUnderstanding.verdict)
    : window.brainoMac.understand({ text }).catch((error) => {
      logRenderer("hil.understand.renderer_failed", { error: String(error?.message || error) });
      return null;
    });
  const runId = ++delegateGeneration;
  stopSpeechOutput();
  const generation = speechGeneration;
  realtimeResponseText = "";
  realtimeResponseInFlight = true;
  processing = true;
  listening = realtimeActive;
  clearRealtimeIdleTimer();
  nfFlowPromptText = text;
  nfFlowResponseText = "";
  setStatus("thinking", "Thinking");
  scheduleNotchThinking(text, "Reading the current context and understanding what matters.");
  setBubble(text, 1000);
  setWave(true);
  markVoiceLatency("delegate_started", { route: "realtime_chat", runId });

  const waiter = createRealtimeResponseWaiter();
  if (!silent) beginRealtimeStreamTts(generation);
  // Put the personality on the SESSION (only when it actually changed), then ask
  // for the response without repeating it. `instructions` on response.create
  // overrides the session for that response, so this has to be omitted entirely,
  // not merely shortened — otherwise he answers with no persona at all.
  // The data channel is ordered, so this session.update always lands first.
  syncRealtimeChatInstructions("pre_response");
  // The moving parts travel with the turn, AFTER the cached persona, so the
  // expensive prefix never changes and only these few hundred characters are
  // new work for the model.
  const turnContext = buildRealtimeTurnContext();
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
              text: turnContext ? `[current context]\n${turnContext}\n\n[what I said]\n${text}` : text,
            },
          ],
        },
      ],
    },
  });
  if (!sent) {
    realtimeStreamTts = null;
    resolveRealtimeResponse({ status: "error", text: "", errorMessage: "Realtime data channel is not ready." });
    processing = false;
    speaking = false;
    setTalk(false);
    // This return skips the finally below, and the caller falls back to
    // runDelegate, which sets its own "thinking". If it did not (or bailed
    // early), the one set above was permanent. Take it down here.
    cancelPendingNotchThinking();
    nfSetThinking("");
    settleStaleThinkingStatus("realtime_chat.not_sent");
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
    const streamState = silent ? { spoke: false, error: null } : await waitForRealtimeStreamTts(generation);
    if (finalText) noteSpoken(finalText);
    rememberLocalChat("user", text);
    if (finalText) rememberLocalChat("assistant", finalText);
    /* What HE said, in the log, not just what you said and what HIL decided.
       speak() logs this for the delegate path, but a chat reply is spoken by the
       streamer and never went through speak(), so half of every conversation was
       missing from the record: the 2026-08-27 booking session shows the question
       "why do you say you can't book it?" with no trace of him having said he
       could not. Logged only when the streamer actually spoke, because the
       fallback below goes through speak() and would log it twice. */
    if (finalText && streamState?.spoke) {
      console.log(`[Braino 🗣 OUT] (chat) "${finalText.slice(0, 200)}"`);
      logRenderer("voice.out", { text: finalText.slice(0, 200), route: "realtime_chat" });
    }
    if (!silent) {
      if (streamState?.error && !streamState.spoke && finalText && generation === speechGeneration) {
        await speak(finalText);
      } else if (!streamState?.spoke && finalText && generation === speechGeneration) {
        await speak(finalText);
      }
    } else if (finalText) {
      console.log(`[Braino ⌨ OUT] "${finalText.slice(0, 200)}"`);
      logRenderer("voice.out", { text: finalText.slice(0, 200), route: "typed" });
    }
    logInteraction({
      kind: "voice",
      route: "realtime_chat",
      user_text: text,
      braino_text: finalText,
      latency_ms: voiceTurnFirstAudioMs(),
      meta: {
        runId,
        status: result?.status || "unknown",
        spoke: Boolean(streamState?.spoke),
        streamTtsError: streamState?.error ? String(streamState.error?.message || streamState.error) : null,
        engine: realtimeVoiceEngine,
        moment: macCurrentMoment,
      },
    });
    /* He just said he would do it. So do it.
     *
     * This is the whole follow-through fix and it is deliberately NOT another
     * word list. Asking "is this sentence a task" is what failed: "book my show
     * and book me tickets" was read as small talk because the word "book" is
     * not in isLikelyMacActionTranscript, so the job never left the chat, he
     * said give me a moment, and the session idled out 26 seconds later.
     *
     * A promise is self-evidence that work is owed. It does not need a
     * vocabulary, because HE is the one who just said it, and he only says it
     * when he has understood a job. So the trigger is his own sentence. */
    const verdict = await understandingPromise;
    const seen = !verdict?.running ? verdict?.understanding : null;
    /* HIL's task is already written to stand on its own, so it beats stitching
       the last two things you said together. That fallback stays for the case
       where only his own promise gave him away. */
    const hilTask = seen && (seen.kind === "task" || seen.kind === "chat_and_task") ? seen.task : "";
    const promised = Boolean(finalText) && window.brainoMac.promisesAction(finalText);
    if (!promiseEscalated && (hilTask || promised)) {
      const job = hilTask || escalationPrompt(text);
      promiseEscalated = true;
      logRenderer("voice.promise.escalated", {
        saidChars: finalText.length,
        jobChars: job.length,
        why: hilTask ? (promised ? "hil_and_promise" : "hil_saw_a_job") : "he_promised",
      });
      /* Say so on the glass. "He agreed to do it" and "he is doing it" look
         identical from outside otherwise, which is the whole complaint. */
      renderThinkingCanvas("Taking it on", "You asked for this while we were talking. Passing it to my hands now.");
      /* Recorded before the run, not after, so a "go ahead" still has something
         real to resume if the run below never lands. */
      rememberOwedTask(job, "promised_in_chat");
      try {
        await runDelegate(job, { keepRealtime: true, forceBrain: true, reason: "promise" });
      } finally {
        promiseEscalated = false;
      }
      return true;
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
      noteSpeechEnded();
      processing = false;
      setTalk(false);
      finishReplyCaption(generation);
      // A turn that produced no words (timeout, cancel, error) never reached
      // "speaking", which is what normally retires the thinking sheet, so its
      // sheet (or the reveal timer about to open one) would sit there cycling.
      cancelPendingNotchThinking();
      if (!nfFlowResponseText) nfSetThinking("");
      if (realtimeActive) {
        listening = true;
        setStatus("listening", "Listening");
        scheduleRealtimeIdleShutdown("realtime_chat_done");
      } else {
        // The session can be gone by the time a timeout / cancel / error
        // resolves the waiter (this is exactly the path a dropped data channel
        // takes). Nobody else will settle the "thinking" set at the top then.
        settleStaleThinkingStatus("realtime_chat_done", { includeSpeaking: true });
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
  // This bump is what cancels any start still in flight, and for a long time it
  // happened in total silence. Tracing "why did realtime.start.cancelled fire"
  // meant reasoning backwards from the absence of a log line, twice, across two
  // sessions. One line here is the difference between a five minute diagnosis
  // and a five hour one, so it goes first, before anything can throw.
  if (realtimeConnecting || realtimeActive) {
    logRenderer("realtime.stop", {
      reason: options.reason || "unspecified",
      wasConnecting: Boolean(realtimeConnecting),
      wasActive: Boolean(realtimeActive),
    });
  }
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
  // A new session starts with no instructions on it, so the next turn must send
  // them. Leaving a stale fingerprint here would mean Braino answers the first
  // question of the next session with no personality at all.
  realtimeInstructionsFingerprint = "";
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
  const processor = context.createScriptProcessor(2048, 1, 1);
  const silentGain = context.createGain();
  const chunks = [];
  // Opening the authenticated WebRTC path can take several seconds on a cold
  // connection. Keep enough local audio that speaking immediately after the
  // shortcut never costs the opening sentence.
  const maxSamples = context.sampleRate * DICTATION_PREROLL_MAX_SECONDS;
  let sampleCount = 0;
  let noiseFloor = 0.006;
  let voicedFrames = 0;
  silentGain.gain.value = 0;
  const observeFrame = (copy) => {
    let power = 0;
    for (let index = 0; index < copy.length; index += 1) power += copy[index] * copy[index];
    const rms = copy.length ? Math.sqrt(power / copy.length) : 0;
    const threshold = Math.max(
      DICTATION_VAD_MIN_RMS,
      Math.min(DICTATION_VAD_MAX_RMS, noiseFloor * DICTATION_VAD_NOISE_MULTIPLIER),
    );
    const voiced = rms >= threshold;
    if (voiced) voicedFrames += 1;
    else noiseFloor = (noiseFloor * 0.96) + (rms * 0.04);
    return voiced;
  };
  processor.onaudioprocess = (event) => {
    if (sampleCount >= maxSamples) return;
    const input = event.inputBuffer.getChannelData(0);
    const remaining = maxSamples - sampleCount;
    const copy = input.slice(0, Math.min(input.length, remaining));
    chunks.push(copy);
    sampleCount += copy.length;
    observeFrame(copy);
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
    observeFrame,
    streaming: false,
    stopRequested: false,
    get sampleCount() { return sampleCount; },
    get hadLikelySpeech() { return voicedFrames >= 2; },
  };
  await context.resume();
  return rtDictationPreroll;
}

function encodeDictationPreroll(chunks, sourceRate, hadLikelySpeech = false) {
  const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (!totalSamples || !sourceRate) return { audioChunks: [], durationMs: 0, hadLikelySpeech: false };
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
    hadLikelySpeech: Boolean(hadLikelySpeech),
  };
}

function appendEncodedDictationAudio(encoded) {
  const audioChunks = Array.isArray(encoded?.audioChunks) ? encoded.audioChunks : [];
  if (!audioChunks.length) return 0;
  let appendedChunks = 0;
  for (const audio of audioChunks) {
    if (sendRealtimeEvent({ type: "input_audio_buffer.append", audio })) appendedChunks += 1;
  }
  if (appendedChunks > 0) {
    const appendedRatio = appendedChunks / audioChunks.length;
    dictationBufferedAudioMs += (Number(encoded.durationMs) || 0) * appendedRatio;
    if (encoded.hadLikelySpeech) dictationBufferedHasSpeech = true;
  }
  return appendedChunks;
}

function flushDictationPrerollAndStartStreaming() {
  const capture = rtDictationPreroll;
  if (!capture) {
    return { audioChunks: [], durationMs: 0, hadLikelySpeech: false, appendedChunks: 0 };
  }

  // This handoff is synchronous on the renderer thread: freeze the pre-roll,
  // append it, then make every future microphone frame use the same ordered
  // RTCDataChannel. Later RTP audio can no longer overtake opening PCM.
  capture.processor.onaudioprocess = null;
  const preroll = encodeDictationPreroll(
    capture.chunks,
    capture.sampleRate,
    capture.hadLikelySpeech,
  );
  capture.chunks.length = 0;
  const appendedChunks = appendEncodedDictationAudio(preroll);
  const shouldStreamLive = !capture.stopRequested;
  capture.streaming = shouldStreamLive;
  if (shouldStreamLive) {
    capture.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const copy = input.slice();
      const voiced = capture.observeFrame(copy);
      appendEncodedDictationAudio(encodeDictationPreroll(
        [copy],
        capture.sampleRate,
        voiced,
      ));
    };
  }
  return { ...preroll, appendedChunks, streaming: shouldStreamLive };
}

function freezeDictationPreroll() {
  const capture = rtDictationPreroll;
  if (!capture) return false;
  capture.processor.onaudioprocess = null;
  capture.stopRequested = true;
  capture.streaming = false;
  return true;
}

function stopDictationPreroll({ discard = false } = {}) {
  const preroll = rtDictationPreroll;
  rtDictationPreroll = null;
  if (!preroll) return { audioChunks: [], durationMs: 0, hadLikelySpeech: false };
  preroll.processor.onaudioprocess = null;
  try { preroll.source.disconnect(); } catch (_) {}
  try { preroll.processor.disconnect(); } catch (_) {}
  try { preroll.silentGain.disconnect(); } catch (_) {}
  void preroll.context.close().catch(() => {});
  if (discard) return { audioChunks: [], durationMs: 0, hadLikelySpeech: false };
  return encodeDictationPreroll(preroll.chunks, preroll.sampleRate, preroll.hadLikelySpeech);
}

function resetDictationVadTurn(vad) {
  if (!vad) return;
  vad.speaking = false;
  vad.candidateAt = 0;
  vad.speechStartedAt = 0;
  vad.lastVoiceAt = 0;
}

function resetDictationTurnState() {
  dictationPendingTurns = 0;
  dictationTurnOrder = [];
  dictationTurns = new Map();
  dictationConsumedTurnIds = new Set();
  dictationSessionChunks = [];
  dictationSessionTurns = [];
  dictationSpeechActive = false;
  dictationManualCommitPending = false;
  dictationBufferedAudioMs = 0;
  dictationBufferedHasSpeech = false;
}

function dictationTurnFor(itemId) {
  const id = String(itemId || "").trim();
  if (!id || dictationConsumedTurnIds.has(id)) return null;
  if (!dictationTurns.has(id)) {
    dictationTurns.set(id, {
      id,
      text: "",
      completed: false,
      failed: false,
      provisional: false,
      refinement: {
        source: "",
        pendingSource: "",
        result: null,
        timer: 0,
      },
    });
  }
  return dictationTurns.get(id);
}

function scheduleDictationRefinement(turn, delayMs = 520) {
  if (!turn?.id || !window.brainoMac.dictationRefine) return;
  const source = String(turn.text || "").trim();
  if (source.length < 3) return;
  const refinement = turn.refinement || {
    source: "",
    pendingSource: "",
    result: null,
    timer: 0,
  };
  turn.refinement = refinement;
  window.clearTimeout(refinement.timer);
  if (
    refinement.source === source
    && (refinement.result || refinement.pendingSource === source)
  ) return;
  refinement.timer = window.setTimeout(() => {
    refinement.timer = 0;
    refinement.source = source;
    refinement.pendingSource = source;
    refinement.result = null;
    const startedAt = Date.now();
    void window.brainoMac.dictationRefine({ text: source }).then((result) => {
      if (refinement.source !== source) return;
      refinement.pendingSource = "";
      refinement.result = result || null;
      logRenderer("dictation.refine.prefetched", {
        itemId: turn.id,
        transcriptChars: source.length,
        refined: Boolean(result?.refined),
        reason: result?.refinementReason || "",
        durationMs: Date.now() - startedAt,
      });
    }).catch((error) => {
      if (refinement.pendingSource === source) refinement.pendingSource = "";
      logRenderer("dictation.refine.prefetch_failed", {
        itemId: turn.id,
        error: error?.message || "formatter unavailable",
      });
    });
  }, Math.max(0, Number(delayMs) || 0));
}

function registerCommittedDictationTurn(itemId) {
  const turn = dictationTurnFor(itemId);
  if (!turn) return;
  if (!dictationTurnOrder.includes(turn.id)) {
    dictationTurnOrder.push(turn.id);
    dictationPendingTurns += 1;
  }
  dictationManualCommitPending = false;
  logRenderer("dictation.turn.committed", {
    itemId: turn.id,
    pendingTurns: dictationPendingTurns,
  });
  drainCompletedDictationTurns();
}

function drainCompletedDictationTurns() {
  while (dictationTurnOrder.length) {
    const itemId = dictationTurnOrder[0];
    const turn = dictationTurns.get(itemId);
    if (!turn?.completed) break;
    dictationTurnOrder.shift();
    dictationTurns.delete(itemId);
    dictationConsumedTurnIds.add(itemId);
    dictationPendingTurns = Math.max(0, dictationPendingTurns - 1);
    if (!turn.failed && turn.text.trim()) {
      console.log(`[BrainoHERA] "${turn.text.trim()}"`);
      bufferDictationTranscript(turn.text, turn);
    }
  }
}

function settlePendingDictationDeltas(reason = "stop_deadline") {
  let provisionalTurns = 0;
  for (const [itemId, turn] of dictationTurns) {
    if (!dictationTurnOrder.includes(itemId) && turn.text.trim()) {
      dictationTurnOrder.push(itemId);
      dictationPendingTurns += 1;
    }
  }
  for (const itemId of dictationTurnOrder) {
    const turn = dictationTurns.get(itemId);
    if (!turn || turn.completed) continue;
    const hasText = Boolean(turn.text.trim());
    turn.completed = true;
    turn.failed = !hasText;
    turn.provisional = hasText;
    if (hasText) provisionalTurns += 1;
  }
  dictationManualCommitPending = false;
  drainCompletedDictationTurns();
  logRenderer("dictation.transcript.provisional", {
    reason,
    provisionalTurns,
    bufferedTurns: dictationSessionChunks.length,
  });
  return provisionalTurns;
}

function markDictationTurnCommitted(reason, speechMs = 0, bufferedAudioMs = 0) {
  dictationManualCommitPending = true;
  markVoiceLatency("speech_stopped");
  setStatus("captured", "Typing");
  logRenderer("dictation.vad.turn_committed", {
    reason,
    speechMs: Math.max(0, Math.round(speechMs)),
    bufferedAudioMs: Math.max(0, Math.round(bufferedAudioMs)),
    pendingTurns: dictationPendingTurns,
  });
}

function commitPendingDictationTurn(reason = "manual_stop", { force = false } = {}) {
  const vad = rtDictationVad;
  const hasDetectedSpeech = Boolean(
    dictationSpeechActive
    || vad?.speaking
    || (vad?.candidateAt && performance.now() - vad.candidateAt >= 80)
    || rtUserTranscript.trim(),
  );
  const bufferedAudioMs = Math.max(0, dictationBufferedAudioMs);
  const hasBufferedSpeech = Boolean(dictationBufferedHasSpeech || hasDetectedSpeech);
  if (dictationManualCommitPending) {
    if (reason === "manual_stop") {
      logRenderer("dictation.commit.skipped", {
        reason,
        cause: "commit_in_flight",
        bufferedAudioMs: Math.round(bufferedAudioMs),
        hasBufferedSpeech,
      });
    }
    return false;
  }
  if (bufferedAudioMs < 100) {
    if (force) {
      logRenderer("dictation.commit.skipped", {
        reason,
        cause: "buffer_too_small",
        bufferedAudioMs: Math.round(bufferedAudioMs),
        hasBufferedSpeech,
      });
    }
    return false;
  }
  if (!hasBufferedSpeech) {
    if (force) {
      logRenderer("dictation.commit.skipped", {
        reason,
        cause: "trailing_silence",
        bufferedAudioMs: Math.round(bufferedAudioMs),
        hasBufferedSpeech: false,
      });
    }
    return false;
  }
  const speechMs = vad?.speechStartedAt
    ? performance.now() - vad.speechStartedAt
    : 0;
  const sent = sendRealtimeEvent({ type: "input_audio_buffer.commit" });
  if (!sent) return false;
  dictationBufferedAudioMs = 0;
  dictationBufferedHasSpeech = false;
  lastCommittedAudioMs = bufferedAudioMs;
  markDictationTurnCommitted(reason, speechMs, bufferedAudioMs);
  dictationSpeechActive = false;
  resetDictationVadTurn(vad);
  return true;
}

async function waitForDictationCommitAck(timeoutMs = 350) {
  const startedAt = Date.now();
  while (dictationManualCommitPending && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 24));
  }
  return !dictationManualCommitPending;
}

/* How long to wait for transcripts after the microphone closes.
   A flat 1.2s was throwing away real speech. When a session is stopped while
   it is still connecting, the buffered audio is not submitted until the socket
   opens — so the clock had already almost run out by the time OpenAI received
   anything, and the turn was discarded as a "stop_deadline" with the words
   still in flight.
   The wait now scales with how much audio is actually outstanding: the user
   has already stopped talking and is waiting for text, so a couple of extra
   seconds is far better than losing the sentence. */
function dictationDrainTimeoutMs(committedAudioMs = 0) {
  const audioAllowance = Math.min(6000, Math.round(committedAudioMs * 0.9));
  return Math.max(1200, 1500 + audioAllowance);
}

async function waitForDictationDrain(timeoutMs = 1200) {
  const startedAt = Date.now();
  while ((dictationPendingTurns > 0 || dictationManualCommitPending) && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => window.setTimeout(resolve, 24));
  }
  const timedOut = dictationPendingTurns > 0 || dictationManualCommitPending;
  const provisionalTurns = timedOut ? settlePendingDictationDeltas("stop_deadline") : 0;
  return {
    drained: dictationPendingTurns === 0 && !dictationManualCommitPending,
    pendingTurns: dictationPendingTurns,
    provisionalTurns,
    durationMs: Date.now() - startedAt,
  };
}

async function startDictationTurnDetector(stream, { prerollSpeechMs = 0 } = {}) {
  stopDictationTurnDetector();
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("BrainoHERA could not start local speech detection.");
  }

  const context = new AudioContextCtor();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.15;
  source.connect(analyser);

  const now = performance.now();
  const hasPrerollSpeech = prerollSpeechMs > 0;
  const vad = {
    context,
    source,
    analyser,
    samples: new Float32Array(analyser.fftSize),
    noiseFloor: 0.006,
    candidateAt: 0,
    speaking: hasPrerollSpeech,
    speechStartedAt: hasPrerollSpeech ? now - prerollSpeechMs : 0,
    lastVoiceAt: hasPrerollSpeech ? now : 0,
    raf: 0,
  };
  rtDictationVad = vad;
  await context.resume();
  if (hasPrerollSpeech) {
    logRenderer("dictation.vad.preroll_speech", {
      durationMs: Math.round(prerollSpeechMs),
    });
  }

  const tick = () => {
    if (rtDictationVad !== vad || !dictationMode) return;
    analyser.getFloatTimeDomainData(vad.samples);
    let power = 0;
    for (let index = 0; index < vad.samples.length; index += 1) {
      power += vad.samples[index] * vad.samples[index];
    }
    const rms = Math.sqrt(power / vad.samples.length);
    const now = performance.now();
    const threshold = Math.max(
      DICTATION_VAD_MIN_RMS,
      Math.min(DICTATION_VAD_MAX_RMS, vad.noiseFloor * DICTATION_VAD_NOISE_MULTIPLIER),
    );
    const voiced = rms >= threshold;

    if (!vad.speaking) {
      if (voiced) {
        if (!vad.candidateAt) vad.candidateAt = now;
        if (now - vad.candidateAt >= DICTATION_VAD_SPEECH_CONFIRM_MS) {
          vad.speaking = true;
          dictationSpeechActive = true;
          vad.speechStartedAt = vad.candidateAt;
          vad.lastVoiceAt = now;
          markRealtimeActivity("dictation_local_speech", { schedule: false });
          startVoiceLatencyTurn("dictation_local_vad");
          setStatus("hearing", "Hearing you");
          updateYapTranscript();
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
      if (!voiced && now - vad.lastVoiceAt >= DICTATION_VAD_SILENCE_MS) {
        const speechMs = now - vad.speechStartedAt;
        const committed = speechMs >= DICTATION_VAD_MIN_SPEECH_MS
          && !dictationManualCommitPending
          && commitPendingDictationTurn("silence");
        if (!committed && !dictationManualCommitPending) {
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

function bufferDictationTranscript(transcript, turn = null) {
  const text = String(transcript || "").trim();
  if (!text) return false;
  dictationSessionChunks.push(text);
  dictationSessionTurns.push({ raw: text, turn });
  updateYapTranscript("");
  logRenderer("dictation.transcript.buffered", {
    turn: dictationSessionChunks.length,
    transcriptChars: text.length,
    sessionChars: dictationSessionChunks.join(" ").length,
  });
  return true;
}

async function flushBufferedDictationTranscript() {
  const chunks = dictationSessionChunks.slice();
  if (!chunks.length) {
    logRenderer("dictation.session.empty", {});
    return { ok: true, inserted: false, empty: true };
  }

  const prepared = dictationSessionTurns.map(({ raw, turn }) => {
    const refinement = turn?.refinement;
    if (!refinement?.result || refinement.source !== raw) return "";
    return String(refinement.result.text || "").trim();
  });
  const inserted = await window.brainoMac.dictationInsert({ chunks, prepared }).catch((error) => ({
    ok: false,
    error: error?.message || "BrainoHERA could not insert the transcript.",
  }));
  if (inserted?.fallback) {
    const recoverable = String(inserted.transcript || chunks.join(" ") || "").trim();
    nfSetHeard(recoverable, { durationMs: 12000 });
    nfShowTransient("No text box · copied", 12000);
    logRenderer("dictation.notch_fallback", {
      transcriptChars: recoverable.length,
      clipboardRetained: Boolean(inserted.clipboardRetained),
      focusStatus: inserted.focusStatus || "",
    });
    return inserted;
  }
  if (!inserted?.ok) {
    const recoverable = chunks.join(" ").trim();
    nfSetHeard(recoverable, { durationMs: 12000 });
    nfShowTransient(inserted?.error || "Could not insert · transcript kept", 12000);
    logRenderer("dictation.session.insert_failed", {
      transcriptChars: recoverable.length,
      error: inserted?.error || "unknown",
    });
    return inserted;
  }
  logRenderer("dictation.session.inserted", {
    transcriptChars: Number(inserted.chars) || chunks.join(" ").length,
    turns: chunks.length,
    method: inserted.method || "",
    verified: inserted.verified ?? null,
    preparedTurns: prepared.filter(Boolean).length,
  });
  return inserted;
}

/* Returns true when the words belonged to the job he is already doing, and have
   been dealt with. False means "treat this as a new turn", which is what the
   caller did before this existed. */
/* ── Typing ────────────────────────────────────────────────────────────────
 *
 * Cmd+Alt+T, or a click on the notch. The words land in the same box a spoken
 * sentence lands in, and from there nothing is different: the same
 * understanding, the same routing, the same thinking panel, the same reply.
 * Only two things change. The answer is shown rather than spoken, because you
 * reached for the keyboard to avoid noise. And the microphone is never touched:
 * typing must not start him listening. */

function nfTypeField() {
  return notchFace?.querySelector(".nf-type-field") || null;
}

function openTyping(source) {
  const field = nfTypeField();
  if (!field || !notchFaceEnabled || herMode || dictationMode) return false;
  typingOpen = true;
  notchFace.classList.add("nf-typing", "nf-inline-open");
  if (nfInlineCaptionLabelEl) nfInlineCaptionLabelEl.textContent = "You typed";
  if (nfInlineCaptionStateEl) nfInlineCaptionStateEl.textContent = "Typing";
  field.value = "";
  /* The window is unfocusable by default, so focus() here does nothing until
     main hands the keyboard over. Without this the field opened and every
     letter went to whatever app was in front. */
  window.brainoMac.setNotchZone?.({ expanded: true, width: NF_COMPACT_SURFACE_WIDTH, height: 150 });
  void window.brainoMac.typingFocus?.(true).then(() => {
    window.setTimeout(() => field.focus(), 40);
  }).catch(() => window.setTimeout(() => field.focus(), 40));
  logRenderer("type.open", { source: source || "" });
  updateNotchFace();
  return true;
}

function closeTyping(reason) {
  const field = nfTypeField();
  if (!typingOpen) return;
  typingOpen = false;
  notchFace.classList.remove("nf-typing");
  if (field) { field.value = ""; field.blur(); }
  void window.brainoMac.typingFocus?.(false).catch(() => {});
  if (nfInlineCaptionLabelEl) nfInlineCaptionLabelEl.textContent = "You said";
  logRenderer("type.close", { reason: reason || "" });
  nfSyncThinkingZone?.();
  updateNotchFace();
}

async function submitTyped(text) {
  const said = String(text || "").trim();
  if (!said) return;
  console.log(`[Braino ⌨ IN] "${said}"`);
  logRenderer("type.in", { chars: said.length });
  nfSetHeard(said, { durationMs: 1600 });
  closeTyping("submitted");
  /* Talking to him while he works is the same conversation whether you speak or
     type, so a typed sentence goes through the interjection router first. */
  const handled = await routeInterjectionIntoRunningJob(said);
  if (handled) {
    setStatus("thinking", "Working on it");
    return;
  }
  const answered = await answerViaRealtimeChat(said, { silent: true });
  /* No realtime session open means no chat path, so the job goes straight to
     his hands rather than being dropped. */
  if (!answered) await runDelegate(said, { keepRealtime: realtimeActive });
}

let interjectionInFlight = false;
/* The one question asked about this sentence, kept so the chat path does not
   ask it again three seconds later. */
let lastUnderstanding = { text: "", verdict: null };
async function routeInterjectionIntoRunningJob(transcript) {
  /* Asking HIL takes a moment, and the flush that called this is now async, so
     a second sentence can arrive mid-question. One at a time: the second one
     becomes a normal turn rather than a second opinion about the same job. */
  if (interjectionInFlight) return false;
  /* Cheap question first. Asking HIL what a sentence meant costs seconds, and
     with no job running there is nothing for the answer to change: the chat
     path asks the same question in parallel and escalates from there, which
     costs nothing. Only pay for the wait when he is actually working. */
  try {
    const busy = await window.brainoMac.jobRunning();
    if (!busy?.running) return false;
  } catch {
    return false;
  }
  interjectionInFlight = true;
  let verdict = null;
  try {
    verdict = await window.brainoMac.understand({ text: transcript });
    lastUnderstanding = { text: String(transcript || ""), verdict };
  } catch (error) {
    logRenderer("hil.understand.renderer_failed", { error: String(error?.message || error) });
    return false;
  } finally {
    interjectionInFlight = false;
  }
  if (!verdict?.running || !verdict.understanding) return false;
  const { kind, task } = verdict.understanding;
  if (kind === "stop") {
    const stopped = await window.brainoMac.stopRunningJob();
    logRenderer("voice.interjection", { kind, stopped: Boolean(stopped?.ok) });
    voiceTurnInFlight = false;
    processing = false;
    cancelPendingNotchThinking();
    nfSetThinking("");
    setStatus("listening", "Listening");
    await speak("Stopped.");
    return true;
  }
  if (kind === "correction" || kind === "addition") {
    const told = await window.brainoMac.tellRunningJob(task);
    logRenderer("voice.interjection", { kind, told: Boolean(told?.ok), chars: task.length });
    /* If the job finished between him speaking and this landing there is
       nothing to fold into, so let it become a normal turn instead of
       swallowing it. */
    return Boolean(told?.ok);
  }
  /* "chat" while working, or a different job entirely: both mean this is a turn
     of its own, which is what the caller already does. */
  logRenderer("voice.interjection", { kind, told: false });
  return false;
}

async function flushRealtimeTranscript(reason) {
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
    setStatus("listening", dictationMode ? "BrainoHERA" : "Listening");
    scheduleRealtimeIdleShutdown("empty_transcript");
    return;
  }
  if (dictationMode) {
    clearRealtimeIdleTimer();
    markRealtimeActivity("accepted_dictation", { schedule: false });
    nfSetHeard(transcript, { durationMs: 1400 });
    bufferDictationTranscript(transcript);
    return;
  }
  if (VOICE_FILLER_ONLY.test(transcript.trim())) {
    logRenderer("voice.filler_ignored", { transcript: transcript.slice(0, 40) });
    setStatus("listening", dictationMode ? "BrainoHERA" : "Listening");
    scheduleRealtimeIdleShutdown("filler_transcript");
    return;
  }
  if (isStopListeningPhrase(transcript)) {
    console.log(`[Braino 🎤 IN] "${transcript}" -> stop listening`);
    logRenderer("voice.stop_phrase", { transcript: transcript.slice(0, 160), voiceTurnInFlight });
    nfSetHeard(transcript, { durationMs: 1200 });
    voiceTurnInFlight = false;
    stopListeningNow("voice_phrase");
    return;
  }
  /* Talking to him while he works is not always a new job.
   *
   * This used to hang off "he is being interrupted mid-sentence", which is the
   * wrong moment: during the BookMyShow run he was not speaking, he was
   * WORKING, so it never fired once. HIL read all three corrections correctly
   * and every one of them went to a side conversation instead — "I said
   * insidious" answered with "that's got a creepy vibe" while the job carried
   * on searching NCDS, deaf.
   *
   * A job being in flight is the condition, not his mouth being open. A person
   * folds a correction into what they are doing, stops when told to stop, and
   * ignores a remark that was not about the job. Which of those it is cannot be
   * pattern matched, so HIL is asked. If HIL cannot answer, the old behaviour
   * stands: a classifier that is down must never swallow a command. */
  if (accepted) {
    const handled = await routeInterjectionIntoRunningJob(transcript);
    if (handled) {
      nfSetHeard(transcript, { durationMs: 1400 });
      setStatus("thinking", "Working on it");
      markRealtimeActivity("interjection_folded", { schedule: false });
      return;
    }
  }

  /* A new instruction during long work is an interruption, not noise.
     Only after the turn has been running a moment, so that his own voice coming
     back through the microphone cannot cut him off mid-sentence. */
  const interrupting = voiceTurnInFlight
    && accepted
    && Date.now() - voiceTurnStartedAt > VOICE_TURN_INTERRUPT_AFTER_MS;
  if (interrupting) {
    logRenderer("voice.interrupted_running_turn", {
      transcript: transcript.slice(0, 160),
      ranForMs: Date.now() - voiceTurnStartedAt,
    });
    console.log(`[Braino 🎤 IN] "${transcript}" -> interrupting what he was doing`);
    // The old turn's answer is no longer wanted. Its token is stale from here,
    // so whatever it eventually returns is discarded rather than spoken over
    // the new job. The main process drops the run itself: see macHilGeneration.
    voiceTurnInFlight = false;
  }
  if ((voiceTurnInFlight && !interrupting) || !accepted) {
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
    } else {
      setStatus("listening", dictationMode ? "BrainoHERA" : "Listening");
      scheduleRealtimeIdleShutdown("ignored_transcript");
    }
    return;
  }
  clearRealtimeIdleTimer();
  markRealtimeActivity("accepted_transcript", { schedule: false });
  if (speaking) stopSpeechOutput();
  voiceTurnInFlight = true;
  voiceTurnStartedAt = Date.now();
  const voiceTurnMine = ++voiceTurnToken;
  // Testing tap: every accepted spoken turn, in the terminal, with the gate it
  // cleared. Rejected audio never reaches this line, so IN here means "became a
  // real turn". Pairs with the [Braino 🗣 OUT] lines in speak/stream below.
  console.log(`[Braino 🎤 IN] "${transcript}"`);
  logRenderer("voice.in", { transcript: transcript.slice(0, 200) });
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
      // Character switch ("be Brainelle") before the persona matcher, whose
      // "be X" pattern would read it as an impression of someone by that name.
      const charCmd = macDetectCharacterCommand(transcript);
      if (charCmd) {
        if (charCmd === macCharacter) {
          await speak(macCharacter === "brainelle" ? "Already Brainelle." : "Already me.");
        } else {
          await macSetCharacter(charCmd);
        }
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
      if (await runQuickVoiceCommand(turnText)) return;
      if (await runMacTeamInput(turnText, { keepRealtime: true, fromVoice: true })) return;
      /* Before the chat fork, because chat is exactly what swallows this. */
      const resumed = takeOwedTask(turnText);
      if (resumed) {
        await runDelegate(resumed, { keepRealtime: true });
        return;
      }
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
      /* Only the current turn gets to say it is finished.
         An interrupted turn can still be unwinding minutes later, and clearing
         the flag from under its replacement would leave the new job unable to
         be interrupted in turn, and its status wrongly reset. */
      if (voiceTurnMine === voiceTurnToken) {
        voiceTurnInFlight = false;
      } else {
        logRenderer("voice.stale_turn_settled", { token: voiceTurnMine, current: voiceTurnToken });
      }
      if (voiceTurnMine === voiceTurnToken && realtimeActive) {
        listening = true;
        setStatus("listening", "Listening");
        scheduleRealtimeIdleShutdown("turn_done");
      } else if (voiceTurnMine === voiceTurnToken) {
        // The turn may have torn the session down on its way out (her mode,
        // yap mode, an error). Whatever "thinking" it left is nobody's now.
        settleStaleThinkingStatus("voice_turn_done");
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
      setStatus("listening", dictationMode ? "BrainoHERA" : "Listening");
      if (realtimeActive) scheduleRealtimeIdleShutdown("session_ready");
    }
    return;
  }

  if (event.type === "input_audio_buffer.committed" && dictationMode) {
    registerCommittedDictationTurn(event.item_id);
    return;
  }

  if (
    event.type === "conversation.item.created"
    && dictationMode
    && event.item?.type === "message"
    && event.item?.role === "user"
  ) {
    // This is an idempotent second source for commit order. It also protects
    // the final turn if a transport ever omits the committed acknowledgement.
    registerCommittedDictationTurn(event.item.id);
    return;
  }

  if (event.type === "input_audio_buffer.speech_started") {
    markRealtimeActivity("speech_started", { schedule: false });
    startVoiceLatencyTurn("speech_started");
    liveCapDisplayed = ""; // fresh turn, fresh caption slate
    if (dictationMode) {
      dictationSpeechActive = true;
    } else {
      rtUserTranscript = "";
      rtTranscriptFinal = false;
      clearRealtimeTranscriptFlush();
    }
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
      rtBargeInAt = Date.now();
      interruptVoiceTurn("barge_in", "speech_started");
      setStatus("hearing", "Hearing you");
      return;
    }
    if (processing || voiceTurnInFlight) {
      setStatus("thinking", "Delegating");
      return;
    }
    setStatus("hearing", "Hearing you");
    return;
  }

  if (event.type === "input_audio_buffer.speech_stopped") {
    markRealtimeActivity("speech_stopped", { schedule: false });
    markVoiceLatency("speech_stopped");
    if (dictationMode) {
      dictationSpeechActive = false;
      // Server VAD emits `committed` immediately after `speech_stopped`.
      // Keep shutdown/drain alive across that small gap so the final phrase
      // cannot disappear when the user toggles BrainoHERA off quickly.
      dictationManualCommitPending = true;
    }
    if (speaking || processing || voiceTurnInFlight) {
      setStatus(speaking ? "speaking" : "thinking", speaking ? "Speaking" : "Delegating");
      return;
    }
    setStatus("captured", dictationMode ? "Typing" : "Got it");
    if (!dictationMode) scheduleRealtimeTranscriptFlush("speech_stopped", REALTIME_SPEECH_STOP_FLUSH_MS);
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
      if (dictationMode) {
        const turn = dictationTurnFor(event.item_id);
        if (turn) {
          turn.text += delta;
          scheduleDictationRefinement(turn);
          nfSetHeard(turn.text.trim(), { durationMs: 1800 });
        }
      } else {
        rtTranscriptFinal = false;
        rtUserTranscript += delta;
        if (herMode) window.HerMode?.setHeard(rtUserTranscript.trim());
        nfSetHeard(rtUserTranscript.trim());
        scheduleRealtimeTranscriptFlush("transcript_idle", REALTIME_TRANSCRIPT_IDLE_FLUSH_MS);
      }
    }
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    markRealtimeActivity("transcript_completed", { schedule: false });
    if (dictationMode) {
      const turn = dictationTurnFor(event.item_id);
      if (turn) {
        turn.text = String(event.transcript || turn.text || "");
        turn.completed = true;
        turn.failed = false;
        scheduleDictationRefinement(turn, 0);
        logRenderer("dictation.transcript.completed", {
          itemId: turn.id,
          transcriptChars: turn.text.trim().length,
          pendingTurns: dictationPendingTurns,
        });
        markVoiceLatency("transcript_completed", { transcriptChars: turn.text.trim().length });
        drainCompletedDictationTurns();
      }
      return;
    }
    rtUserTranscript = String(event.transcript || rtUserTranscript || "");
    rtTranscriptFinal = true;
    markVoiceLatency("transcript_completed", { transcriptChars: rtUserTranscript.trim().length });
    flushRealtimeTranscript("completed");
    return;
  }

  if (event.type === "conversation.item.input_audio_transcription.failed") {
    const message = event.error?.message || "Whisper could not transcribe this audio.";
    if (dictationMode) {
      const turn = dictationTurnFor(event.item_id);
      if (turn) {
        turn.completed = true;
        turn.failed = true;
      }
      dictationManualCommitPending = false;
      drainCompletedDictationTurns();
    }
    logRenderer("dictation.transcript.failed", {
      message,
      pendingTurns: dictationPendingTurns,
    });
    setStatus("error", "BrainoHERA did not catch that");
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
      updateNotchAnswerText(finalText, realtimeStreamTts.generation);
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
    if (dictationMode && dictationStopping) {
      dictationManualCommitPending = false;
      const oldest = dictationTurns.get(dictationTurnOrder[0]);
      if (oldest && !oldest.completed) {
        oldest.completed = true;
        oldest.failed = true;
        drainCompletedDictationTurns();
      }
      logRenderer("dictation.transcript.failed", {
        message,
        pendingTurns: dictationPendingTurns,
      });
    }
    if (realtimeResponseInFlight || realtimeResponseWaiter) {
      resolveRealtimeResponse({ status: "error", text: realtimeResponseText, errorMessage: message });
    }
    setStatus("error", dictationMode ? "BrainoHERA error" : "Voice error");
    setBubble(`${dictationMode ? "BrainoHERA" : "Voice"} error: ${message}`, 3600);
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
  const dictationStartupGate = isDictation && options.startupGate
    ? options.startupGate
    : Promise.resolve({ ok: true });
  const requestedAt = Number(options.requestedAt) || Date.now();
  let dictationSender = null;
  stopRecognition();
  stopRealtimeVoice({ keepDictation: isDictation });
  const startGeneration = ++realtimeStartGeneration;
  realtimeConnecting = true;
  listening = true;
  setStatus("connecting", isDictation ? "Starting BrainoHERA" : "Waking voice");
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
      audio: isDictation
        ? {
            // OpenAI's transcription session already applies microphone-aware
            // near/far-field noise reduction. Capture one clean mono stream
            // here instead of running the words through a second denoiser and
            // gain controller before the model sees them.
            channelCount: { ideal: 1 },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            latency: { ideal: 0.01 },
          }
        : {
            // AEC stays on: Braino speaks out loud here, and without it he hears himself
            // and barge-in collapses. AGC stays on: it is what lifts a distant voice.
            // noiseSuppression is off for the same reason dictation turns it off above —
            // OpenAI denoises this stream already, and a second denoiser on a far-field
            // signal takes the voice out along with the room.
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
          },
    });
    if (startGeneration !== realtimeStartGeneration) {
      stream.getTracks().forEach((track) => track.stop());
      throw realtimeStartCancelledError();
    }
    rtMic = stream;
    {
      const microphoneLabel = String(stream.getAudioTracks()[0]?.label || "");
      const picked = pickNoiseReduction(microphoneLabel);
      if (isDictation) dictationNoiseReduction = picked;
      else realtimeNoiseReduction = picked;
      logRenderer(isDictation ? "dictation.noise_reduction.selected" : "realtime.noise_reduction.selected", {
        type: picked,
        microphone: microphoneLabel || "unknown",
      });
    }
    if (isDictation) {
      await startDictationPreroll(stream);
      // A very short dictation can end while the authenticated connection is
      // still opening. Preserve the captured prefix, but stop collecting new
      // audio the moment the user has already issued the stop gesture.
      if (dictationStopRequestedSource) {
        freezeDictationPreroll();
        stream.getAudioTracks().forEach((track) => { track.enabled = false; });
      }
    }
    const microphoneSettings = stream.getAudioTracks()[0]?.getSettings?.() || {};
    logRenderer("realtime.mic.ok", {
      audioTracks: stream.getAudioTracks().length,
      captureLatencyMs: isDictation ? Math.max(0, Date.now() - requestedAt) : undefined,
      sampleRate: microphoneSettings.sampleRate || undefined,
      channelCount: microphoneSettings.channelCount || undefined,
      echoCancellation: microphoneSettings.echoCancellation ?? undefined,
      noiseSuppression: microphoneSettings.noiseSuppression ?? undefined,
      autoGainControl: microphoneSettings.autoGainControl ?? undefined,
    });

    const pc = new RTCPeerConnection();
    rtPc = pc;
    stream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, stream);
      if (isDictation && track.kind === "audio") dictationSender = sender;
    });
    if (dictationSender) {
      // Keep the negotiated audio sender silent for the entire dictation
      // session. Startup and live PCM share the ordered data channel below;
      // introducing RTP here would make their chronology nondeterministic.
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
        setStatus("error", isDictation ? "BrainoHERA disconnected" : "Voice disconnected");
        setBubble(
          isDictation ? "BrainoHERA disconnected. Double Option restarts it." : "Voice disconnected. Double Control wakes me again.",
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
    if (isDictation) {
      // Capture begins as soon as double Option lands, in parallel with the
      // Accessibility preflight. The negotiated sender remains trackless and
      // the local pre-roll stays on-device until this privacy gate approves
      // the target. Secure-field audio is discarded without being uploaded.
      const startupDecision = await dictationStartupGate;
      assertRealtimeStartCurrent(startGeneration, pc);
      if (startupDecision?.ok === false) {
        throw new Error(startupDecision.error || "BrainoHERA could not start safely.");
      }
      logRenderer("dictation.startup_gate.open", {
        focusStatus: startupDecision?.focusStatus || "unknown",
        preflightMs: Number(startupDecision?.preflightMs) || 0,
      });
    }
    sendRealtimeEvent(buildRealtimeSessionUpdate());
    if (isDictation) {
      const preroll = flushDictationPrerollAndStartStreaming();
      logRenderer("dictation.preroll.flushed", {
        durationMs: preroll.durationMs,
        chunks: preroll.appendedChunks,
        hadLikelySpeech: preroll.hadLikelySpeech,
        streaming: preroll.streaming,
        transport: "ordered_pcm_datachannel",
      });
      await startDictationTurnDetector(stream, {
        prerollSpeechMs: preroll.hadLikelySpeech ? preroll.durationMs : 0,
      });
      assertRealtimeStartCurrent(startGeneration, pc);
    }
    startRealtimeHeartbeat(result.sessionId || null);

    realtimeActive = true;
    // The session is genuinely live; the waking shimmer has done its job.
    stopVoiceWakeShimmer();
    realtimeConnecting = false;
    listening = true;
    lastEngagedAt = Date.now();
    markRealtimeActivity("realtime_ready");
    if (!isDictation) startFishWarmKeepAlive();
    setStatus("listening", isDictation ? "BrainoHERA" : "Listening");
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
    if (!(await runMacTeamInput(transcript))) void runDelegate(transcript, { source: "voice_native" });
  } catch (error) {
    if (token !== listenToken) return;
    logRenderer("voice.fallback.error", { error: errorForLog(error) });
    listening = false;
    setStatus("error", "Voice error");
    setBubble(`Voice error: ${error?.message || "native speech failed"}`, 3600);
    const typed = window.prompt("Braino Mac delegate command");
    if (typed) {
      if (!(await runMacTeamInput(typed))) void runDelegate(typed, { source: "typed" });
    }
  } finally {
    if (token === listenToken && !processing) {
      listening = false;
      setStatus("ready", "Double Space to show/hide");
    }
  }
}

async function startListening() {
  // Skit isolation: realtime cannot start during the demo or post-demo freeze
  if (skitRunning || skitJustCompleted) return;
  if (processing || realtimeConnecting || realtimeActive || voiceCycleInFlight) return;
  voiceCycleInFlight = true;
  logRenderer("voice.toggle.start_listening");
  // Music drowns the mic (VAD fires on the song, turns never survive) — duck
  // the player to ~20% for the session; restored on stopRealtimeVoice.
  if (musicMode) void window.brainoMac.musicDuck?.({ duck: true });
  try {
    await startRealtimeVoice();
  } catch (error) {
    // A cancelled start is not a failure, it is somebody else taking the
    // session: stopRealtimeVoice bumps the generation and the in-flight start
    // throws on its next checkpoint. Treating that as an error is what produced
    // the Urdu. The fallback is a bare five second recorder with no notion of
    // whether a human is talking to it, so on a cancel it would open the mic in
    // a room playing Hindi standup, transcribe the comedian, guess the language,
    // and hand Braino a "command" nobody said. Three of those in one afternoon,
    // each one exactly ten seconds after a realtime.start.cancelled.
    //
    // isRealtimeStartCancelled is already consulted at the two other places this
    // error can surface. This was the one that missed it.
    if (isRealtimeStartCancelled(error)) {
      logRenderer("voice.start_cancelled_quietly", { error: errorForLog(error) });
      return;
    }
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
  const requestedAt = Date.now();
  const startGeneration = ++dictationStartGeneration;
  dictationStarting = true;
  dictationStopping = false;
  dictationStopRequestedSource = "";
  resetDictationTurnState();
  dictationMode = true;
  logRenderer("dictation.start.requested", { source });
  stopSpeechOutput();
  if (herMode) await exitHerMode({ farewell: false });
  updateNotchFace();
  setStatus("connecting", "BrainoHERA");

  let startupGateSettled = false;
  let resolveStartupGate = null;
  const startupGate = new Promise((resolve) => {
    resolveStartupGate = resolve;
  });
  const settleStartupGate = (decision) => {
    if (startupGateSettled) return;
    startupGateSettled = true;
    resolveStartupGate?.(decision);
  };
  // Do not put the two-second AX probe in front of the microphone. Realtime
  // opens concurrently, but its sender stays silent and its pre-roll remains
  // local until the focus/privacy decision below opens the startup gate.
  const realtimeStart = startRealtimeVoice({
    purpose: "dictation",
    requestedAt,
    startupGate,
  }).then(
    () => ({ ok: true }),
    (error) => ({ ok: false, error }),
  );

  const started = await window.brainoMac.dictationControl({
    action: "start",
    reason: source,
  }).catch((error) => ({
    ok: false,
    error: error?.message || "BrainoHERA could not start.",
  }));
  if (startGeneration !== dictationStartGeneration) {
    settleStartupGate({ ok: false, error: "BrainoHERA startup was cancelled." });
    stopRealtimeVoice({ keepDictation: true });
    if (started?.ok) {
      await window.brainoMac.dictationControl({
        action: "stop",
        reason: "start_cancelled",
      }).catch(() => {});
    }
    await realtimeStart;
    return;
  }
  if (!started?.ok) {
    settleStartupGate({ ok: false, error: started?.error || "BrainoHERA could not start." });
    // Permission/secure-field refusal cuts capture immediately. If getUserMedia
    // is still resolving, its generation check stops the track as soon as the
    // browser returns it.
    stopRealtimeVoice({ keepDictation: true });
    await realtimeStart;
    dictationMode = false;
    dictationStarting = false;
    dictationStopping = false;
    dictationStopRequestedSource = "";
    updateNotchFace();
    setStatus("error", "BrainoHERA unavailable");
    nfShowTransient(started?.error || "BrainoHERA could not start.", 3600);
    logRenderer("dictation.start.rejected", { source, error: started?.error || "unknown" });
    return;
  }

  settleStartupGate({
    ok: true,
    focusStatus: started.focusStatus || "",
    preflightMs: Math.max(0, Date.now() - requestedAt),
  });
  updateNotchFace();
  if (!dictationStopRequestedSource && started.insertionMode === "notch") {
    nfShowTransient("No text box · I’ll keep it here", 4200);
  }
  try {
    const realtimeResult = await realtimeStart;
    if (!realtimeResult.ok) throw realtimeResult.error;
    if (startGeneration !== dictationStartGeneration || !dictationMode) return;
    logRenderer("dictation.started", {
      source,
      targetApp: started.targetApp || "",
      model: started.model || DICTATION_TRANSCRIPTION_MODEL,
    });
    const queuedStopSource = dictationStopRequestedSource;
    if (queuedStopSource) {
      dictationStopRequestedSource = "";
      dictationStopping = false;
      await stopYapMode({ source: queuedStopSource });
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
    dictationStopping = false;
    dictationStopRequestedSource = "";
    await window.brainoMac.dictationControl({
      action: "stop",
      reason: "start_failed",
    }).catch(() => {});
    updateNotchFace();
    setStatus("error", "BrainoHERA unavailable");
    nfShowTransient(`BrainoHERA error: ${error?.message || "realtime transcription failed"}`, 4200);
    logRenderer("dictation.start.error", { source, error: errorForLog(error) });
  } finally {
    if (startGeneration === dictationStartGeneration) dictationStarting = false;
  }
}

async function stopYapMode({ source = "hotkey", skipDrain = false } = {}) {
  if ((!dictationMode && !dictationStarting) || dictationStopping) return;
  if (!skipDrain && dictationStarting && !realtimeActive) {
    dictationStopping = true;
    dictationStopRequestedSource = source;
    const frozeCapture = freezeDictationPreroll();
    setRealtimeMicEnabled(false);
    walker.classList.remove("dictation-listening");
    setStatus("captured", "Finishing");
    nfShowTransient("BrainoHERA off · inserting", 4200);
    updateNotchFace();
    logRenderer("dictation.stop.queued", {
      source,
      phase: "connecting",
      frozeCapture,
    });
    return;
  }
  dictationStopping = true;
  setStatus("captured", "Finishing");
  nfShowTransient("BrainoHERA off · inserting", 4200);
  updateNotchFace();
  logRenderer("dictation.stop.acknowledged", { source });
  const canDrain = !skipDrain && dictationMode && realtimeActive && rtDc?.readyState === "open";
  if (canDrain) {
    // gpt-live-transcribe has no server turn detection. Local VAD commits
    // ordinary pauses; stopping manually commits any phrase still in flight.
    stopDictationTurnDetector();
    // Freeze the one ordered PCM producer before committing so no callback can
    // append a new buffer behind the final commit.
    stopDictationPreroll({ discard: true });
    setRealtimeMicEnabled(false);
    if (
      dictationManualCommitPending
      && dictationBufferedAudioMs >= 100
      && dictationBufferedHasSpeech
    ) {
      await waitForDictationCommitAck();
    }
    const committedFinalTurn = commitPendingDictationTurn("manual_stop", { force: true });
    if (committedFinalTurn || dictationPendingTurns > 0) {
      setStatus("captured", "Finishing");
    }
    // Scaled to the audio still awaiting a transcript, including anything that
    // was buffered while the session was connecting.
    const drain = await waitForDictationDrain(dictationDrainTimeoutMs(lastCommittedAudioMs));
    logRenderer("dictation.stop.drained", {
      source,
      committedFinalTurn,
      ...drain,
    });
  }
  const insertion = skipDrain
    ? { ok: true, inserted: false, skipped: true }
    : await flushBufferedDictationTranscript();
  logRenderer("dictation.stop.insertion", {
    source,
    ok: Boolean(insertion?.ok),
    inserted: Boolean(insertion?.inserted),
    fallback: Boolean(insertion?.fallback),
    empty: Boolean(insertion?.empty),
    method: insertion?.method || "",
  });
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
  const transcriptNeedsRecovery = Boolean(insertion?.fallback || !insertion?.ok);
  if (!transcriptNeedsRecovery) nfClearCaptions();
  updateNotchFace();
  setStatus("ready", "Double Option for BrainoHERA");
  if (!transcriptNeedsRecovery) nfShowTransient("BrainoHERA off.", 1200);
  resetDictationTurnState();
  dictationStopping = false;
  updateNotchFace();
  logRenderer("dictation.stopped", { source });
}

function toggleYapMode(source = "hotkey") {
  if (dictationStopping) return;
  if (dictationMode || dictationStarting) void stopYapMode({ source });
  else void startYapMode({ source });
}

function toggleVoice() {
  // Skit isolation: voice is completely disabled during the demo and post-demo
  // wait state. Only Cmd+2 can dismiss the skit.
  if (skitRunning || skitJustCompleted) return;
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
  // Stage 1.5: a session that is still CONNECTING is not one to switch off. A
  // second double-tap arriving half a second into a connect is almost always
  // "did it hear me, let me try again", and treating it as "cancel" tore down a
  // session that was 700ms from working. Measured: 40 of 44 realtime.start
  // cancellations had a second voice hotkey inside the connect window. Ignoring
  // it lets the connect finish, and the user gets what they were asking for.
  if (realtimeConnecting && !realtimeActive) {
    logRenderer("voice.toggle.ignored_while_connecting", {});
    setBubble("Almost there.", 900);
    return;
  }
  // Stage 2: not talking (or voice already off) — normal on/off toggle.
  if (realtimeActive || realtimeConnecting || listening) {
    stopListeningNow("control_hotkey");
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
  // A manual placement is exact: do not snap to a computed rail. Resume normal
  // roaming from the dropped point after a short beat so he never freezes.
  movementMode = "free";
  targetX = posX;
  targetY = posY;
  nextTargetAt = performance.now() + 1200;
  setBubble("Starting from here.", 1600);
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
  scriptedWalk = null;
  targetX = posX;
  targetY = posY;
  nextTargetAt = performance.now() + 2200;
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
window.addEventListener("mouseleave", () => {
  if (window.__brainoOs && window.__brainoOs.isOpen()) return;
  setMousePassthrough(true);
}, { passive: true });
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
  } else if (!dragState && !brainoCustomizerOpen && !shouldHoldAttention && !skitMoonwalk && !skitJustCompleted && !musicDancing) {
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
  walkerFlip.style.transform = `scaleX(${(engaged || skitMoonwalk || musicDancing) ? 1 : dirX}) scale(${brainoScale})`;
  if (brainoCustomizerOpen) positionBrainoCustomizer();
  updateFloatingUi();

  if (startupPose) {
    const pose = startupPose;
    const laEl = q("#__sbwk_la__"), raEl = q("#__sbwk_ra__");
    const lArmPivot = pivotOf(laEl, 22, 53), rArmPivot = pivotOf(raEl, 78, 53);
    const leftArmTransform = pose.leftArm ? `rotate(${pose.leftArm} ${lArmPivot.x} ${lArmPivot.y})` : "";
    const rightArmTransform = pose.rightArm ? `rotate(${pose.rightArm} ${rArmPivot.x} ${rArmPivot.y})` : "";
    // sy squashes vertically only, so the body compresses into the floor rather
    // than shrinking; the 101*(1-sy) nudge keeps his feet planted while it does
    // (same compensation the extension's dance uses).
    const poseScale = pose.rootScale || 1;
    const poseSy = pose.rootScaleY == null ? 1 : pose.rootScaleY;
    root?.setAttribute(
      "transform",
      `rotate(${pose.rootRot || 0} 50 50) translate(${pose.rootX || 0} ${(pose.rootY || 0) + 101 * (1 - poseSy)}) scale(${poseScale} ${poseScale * poseSy})`
    );
    const llLift = pose.leftLegLift || 0, rlLift = pose.rightLegLift || 0;
    q("#__sbwk_ll__")?.setAttribute("transform", (pose.leftLeg || llLift) ? `translate(0 ${-llLift}) rotate(${pose.leftLeg || 0} 44 74)` : "");
    q("#__sbwk_rl__")?.setAttribute("transform", (pose.rightLeg || rlLift) ? `translate(0 ${-rlLift}) rotate(${pose.rightLeg || 0} 56 74)` : "");
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
    const isFerro = mascotChoice === "ferro";
    const leftPhase = Math.sin(s);
    const rightPhase = Math.sin(s + Math.PI);
    const walkAmount = walkingNow && !isFerro ? 1 : 0;
    const leftLift = Math.max(0, leftPhase) * 5 * walkAmount;
    const rightLift = Math.max(0, rightPhase) * 5 * walkAmount;
    const leftSwing = Math.max(0, leftPhase) * 8 * walkAmount;
    const rightSwing = Math.max(0, rightPhase) * 8 * walkAmount;
    const ferroFlight = isFerro ? (walkingNow ? 1 : 0.48) : 0;
    const waddle = isFerro ? Math.sin(t * 2.6) * 4.8 * ferroFlight : Math.sin(s) * 3.4 * walkAmount;
    const walkBob = (-Math.abs(Math.sin(s)) * 2 - 0.4) * walkAmount;
    const breath = 1 + 0.014 * Math.sin(t * 1.7);
    const bob = Math.sin(t * 1.7 + 0.6) * 0.8 - Math.abs(Math.sin(t * 7.2)) * 2.4 * ferroFlight;
    const blinkPhase = t % 3.4;
    const blink = blinkPhase < 0.13 ? Math.sin((blinkPhase / 0.13) * Math.PI) : 0;
    const eyeScale = authPose ? 0.07 : Math.max(0.06, 1 - blink);
    const rightArmAngle = waving ? (-28 + Math.sin(t * 11) * 16) : (isFerro && walkingNow ? -18 : 0);
    const leftArmAngle = isFerro && walkingNow ? 18 : 0;

    root?.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
    q("#__sbwk_ll__")?.setAttribute("transform", `translate(0 ${-leftLift}) rotate(${leftSwing} 44 74)`);
    q("#__sbwk_rl__")?.setAttribute("transform", `translate(0 ${-rightLift}) rotate(${rightSwing} 56 74)`);
    const raEl2 = q("#__sbwk_ra__");
    const rArmPivot2 = pivotOf(raEl2, 78, 53);
    const laEl2 = q("#__sbwk_la__");
    const lArmPivot3 = pivotOf(laEl2, 22, 53);
    q("#__sbwk_la_bg__")?.setAttribute("transform", leftArmAngle ? `rotate(${leftArmAngle} ${lArmPivot3.x} ${lArmPivot3.y})` : "");
    q("#__sbwk_la__")?.setAttribute("transform", leftArmAngle ? `rotate(${leftArmAngle} ${lArmPivot3.x} ${lArmPivot3.y})` : "");
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

/* Cmd+Alt+T. Not plain Cmd+T: that is "new tab" in every browser and editor,
   and an Electron shortcut is system wide, so it would take it from all of
   them. */
window.brainoMac.onTypeToggle?.((payload) => {
  if (typingOpen) { closeTyping("hotkey"); return; }
  openTyping(payload?.source || "hotkey");
});

/* The click went to typing outright rather than being shared.
   Sharing it was the first attempt and it did not work: a click on the island
   had meant "talk to me" for far longer, so adding a second meaning ran
   alongside the first instead of replacing it, and the field opened AND the
   microphone started. A gesture holds one meaning. */
document.addEventListener("keydown", (event) => {
  if (!typingOpen) return;
  if (event.key === "Escape") { event.preventDefault(); closeTyping("escape"); return; }
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    const field = nfTypeField();
    void submitTyped(field?.value || "");
  }
});

/* ── THE PITCH MINUTE ──────────────────────────────────────────────────────
 *
 * Sixty seconds on stage. Nothing here is generated: every word arrives from
 * PITCH in main.cjs, so the only uncertain thing in the minute is the post
 * itself, which is the point of showing it.
 *
 * The shape, in order: he introduces himself, says he will stop being a claim,
 * the notch opens into its thinking panel and writes the post, turns green when
 * it lands, he says it is live, then Billie Jean and the moonwalk.
 *
 * Every step is guarded. If the music will not start he moonwalks in silence.
 * If the account is not linked he says so plainly instead of claiming a post
 * that did not go out, because the room can check. */
let pitchRunning = false;

function pitchWait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/* Raised on every restart so a run already in flight stops talking instead of
   doubling up with the new one. Every wait and every line checks it. */
let pitchGeneration = 0;

function pitchStale(mine) { return mine !== pitchGeneration; }

/* A line is now a list of short lines. Each is spoken on its own, with a beat
   after it, because starting the next one cancels whatever is still playing:
   that is what was cutting the ends off his sentences. */
async function pitchSay(mine, lines) {
  const list = Array.isArray(lines) ? lines : [lines];
  for (const line of list) {
    if (pitchStale(mine) || !line) return;
    await speak(line);
    if (pitchStale(mine)) return;
    await pitchWait(260);
  }
}

async function runPitchDemo(payload) {
  const mine = ++pitchGeneration;
  pitchRunning = true;
  const lines = payload?.lines || {};
  const rehearse = Boolean(payload?.rehearse);
  logRenderer("pitch.run", { rehearse, generation: mine });

  try {
    /* Nothing listens during this. It is a script from the first word to the
       last, and a live microphone in a room full of people is a stray sentence
       waiting to derail it. */
    stopRealtimeVoice({ reason: "pitch-demo" });
    logRenderer("pitch.mic_off", {});

    /* Music is opened first and quietly: Spotify takes seconds to wake, and
       the moonwalk is at the end. Asking for it now means it is ready then. */
    void window.brainoMac.skitStep?.("prewarm");

    /* 0:00 — he introduces himself, and says what he is about to prove. */
    await pitchSay(mine, lines.hello);
    await pitchSay(mine, lines.claim);
    if (pitchStale(mine)) return;

    /* 0:20 — the page takes over the visible half. He writes into a panel the
       whole room can read, rather than into the notch, which from the back of
       a room looks like nothing happening at all. */
    void window.brainoMac.pitchOpen?.({ where: "dashboard" });
    await pitchWait(2600);
    if (pitchStale(mine)) return;
    await pitchSay(mine, lines.writing);

    /* The page finishes writing about ten seconds in, then presses its own
       Post button. He says so as it happens, and then stops talking so the
       green landing is the only thing in the room. */
    if (pitchStale(mine)) return;
    await pitchSay(mine, lines.posting);

    /* A fixed beat, not a question asked of the database.
     *
     * This used to wait for the post to appear in the queue, for up to two
     * minutes. When a post did not go out, that is exactly what it did: the
     * script stopped dead, in a room, and never reached the moonwalk. The page
     * runs on a clock now and this matches it, so the rest of the demo happens
     * whatever the network did. */
    await pitchWait(4200);
    if (pitchStale(mine)) return;
    await pitchSay(mine, lines.live);
    await pitchSay(mine, lines.proof);

    /* The part they remember. He dances on top of the proof, so the post stays
       on screen behind him rather than our own site. */
    if (pitchStale(mine)) return;
    await pitchSay(mine, lines.closeSetup);
    await pitchWait(300);
    await pitchSay(mine, lines.closeGo);
    if (pitchStale(mine)) return;
    /* Everything that has to be true before he can dance, checked rather than
       assumed. The moonwalk gives up silently on any of these, so a missing one
       looks exactly like the music playing and nothing happening. */

    /* One: he has to be out of the notch, because that is where he lives. */
    if (walkerHome) await setWalkerHomeState(false);

    /* Two: he has to be on top of Chrome. Braino's window drops behind the
       browser when Chrome is brought forward, and a moonwalk behind a full
       screen X page is a moonwalk nobody sees. */
    await window.brainoMac.pitchFront?.();

    /* Three: the rig has to exist. Only some characters carry the moonwalk
       legs and the hat, so if the current one does not, put the character that
       does on screen for the trick. */
    let rigReady = Boolean(q("#__sbwk_moonlegs__") && q("#__sbwk_mw_r__") && q("#__sbwk_mw_l__"));
    if (!rigReady) {
      try {
        remountWalker("braino");
        rigReady = Boolean(q("#__sbwk_moonlegs__") && q("#__sbwk_mw_r__") && q("#__sbwk_mw_l__"));
      } catch (swapError) {
        logRenderer("pitch.moonwalk.swap_failed", { error: String(swapError?.message || swapError) });
      }
    }
    logRenderer("pitch.moonwalk", { rigReady, walkerHome });

    await pitchWait(500);
    if (pitchStale(mine)) return;

    void window.brainoMac.skitStep?.("play");
    await pitchWait(1200);
    if (pitchStale(mine)) return;
    skitPerformMoonwalk(11000);
  } catch (error) {
    logRenderer("pitch.failed", { error: String(error?.message || error) });
  } finally {
    if (!pitchStale(mine)) {
      pitchRunning = false;
      notchFace?.classList.remove("nf-think-complete");
      void window.brainoMac.pitchDone?.();
    }
  }
}

/* A restart bumps the generation, which every step above is watching. */
window.brainoMac.onPitchStop?.(() => {
  pitchGeneration += 1;
  logRenderer("pitch.stopped", { generation: pitchGeneration });
  notchFace?.classList.remove("nf-think-complete");
  nfSetThinkingOpen(false);
  nfSetThinking("");
});

window.brainoMac.onPitchDemo?.((payload) => { void runPitchDemo(payload); });

window.brainoMac.onVoiceToggle(() => {
  /* Waking the voice takes a few seconds no matter what, and most of that is
     OpenAI minting the session. The shimmer is the honest acknowledgement in
     the meantime: pressed, heard, working — shown on the keypress itself
     rather than after the session is up. */
  if (!realtimeActive && !realtimeConnecting) startVoiceWakeShimmer();
  toggleVoice();
});

let voiceWakeShimmerTimer = 0;

/* Exactly the classes this shimmer added, so stopping removes what it turned
   on and nothing else. The first version added nf-shining and nf-shine-slow
   and then refused to remove them once the session was live — which is why the
   notch radiated for the whole call instead of just the wake. */
let voiceWakeShimmerAdded = [];

function startVoiceWakeShimmer() {
  if (!notchFace) return;
  voiceWakeShimmerAdded = ["nf-shining", "nf-shine-slow", "nf-waking-voice"]
    .filter((name) => !notchFace.classList.contains(name));
  notchFace.classList.add(...voiceWakeShimmerAdded);
  window.clearTimeout(voiceWakeShimmerTimer);
  // The wake is a moment, not a state: it clears the instant voice is live,
  // and this is only the backstop for a wake that never completes.
  voiceWakeShimmerTimer = window.setTimeout(() => stopVoiceWakeShimmer(), 8000);
}

function stopVoiceWakeShimmer() {
  window.clearTimeout(voiceWakeShimmerTimer);
  if (!notchFace || !voiceWakeShimmerAdded.length) return;
  notchFace.classList.remove(...voiceWakeShimmerAdded);
  voiceWakeShimmerAdded = [];
}
window.brainoMac.onCursorMode?.((payload) => {
  cursorModeContext = payload || null;
});
void window.brainoMac.cursorModeState?.().then((payload) => {
  cursorModeContext = payload || null;
}).catch(() => {});
/* He no longer announces that a Cursor task is over.
   A quiet agent panel is not a finished task, and a thing that speaks
   unprompted has to be right nearly always: the cost of being wrong is the
   sentence it interrupted. See the note on endCursorTaskSilently in main.cjs. */
/* Asked to dance.
   Music starting already triggers all of this; being asked now does too, and it
   does not wait for the music to be noticed, because noticing goes through
   AppleScript and that is exactly what gets refused. */
window.brainoMac.onDance?.((payload) => {
  if (payload && payload.on) {
    void setWalkerHomeState(false);
    beginMusicTheatrics();
    logRenderer("dance.start", {});
  } else {
    reactToMusicStop();
    logRenderer("dance.stop", {});
  }
});

/* The idle screen. Shown when asked, or when the Mac has been left alone. */
window.brainoMac.onIdleScreen?.((payload) => {
  const screen = window.__brainoWallpaper;
  if (!screen) return;
  if (payload && payload.active) {
    screen.open({
      looks: payload.looks,
      rotation: payload.rotation,
      cycleSeconds: payload.cycleSeconds,
      quotes: payload.quotes,
      battery: payload.battery,
      shortcuts: payload.shortcuts,
    });
    logRenderer("idle_screen.open", { look: payload?.look || "", reason: payload?.reason || "" });
  } else {
    screen.close();
    logRenderer("idle_screen.close", {});
  }
});

/* Any key sends it away. An idle screen is in the way on purpose, and must
   never be in the way for longer than a keystroke. */
window.addEventListener("keydown", () => {
  const screen = window.__brainoWallpaper;
  if (!screen || !screen.isOpen()) return;
  screen.close();
  window.brainoMac.idleScreenClosed?.();
});

window.brainoMac.onDictationToggle?.((payload) => toggleYapMode(payload?.source || "double Option"));

/* His working, as it happens.
 *
 * Every step used to be spoken, which read well and cost about six seconds a
 * turn: he stood still finishing a sentence while the work waited. Reading is
 * instant. So the notch shows every step and he only says the first one out
 * loud, which is the difference between watching someone work and waiting for
 * someone to finish talking. */
window.brainoMac.onThinkingStep?.((payload) => {
  const text = String(payload?.text || "").trim();
  if (!text) return;
  nfSetThinking(text);
  logRenderer("hil.thinking_step", { step: payload?.step || 0, chars: text.length });
});

/* Braino OS: the whole screen becomes what he is made of.
 *
 * Drawn by renderer/braino-os.js into this same overlay window, so it is the
 * app itself rather than a browser pointed at the site, it works offline, and
 * he talks over it through the voice pipeline already running in here. */
window.brainoMac.onBrainoOs?.((payload) => {
  const os = window.__brainoOs;
  if (!os) return;
  if (payload && payload.active) {
    nfClearCaptions();
    os.open(payload.system || null);
    logRenderer("braino_os.open", { system: (payload && payload.system) || "all" });
  } else {
    os.close();
    logRenderer("braino_os.close", {});
  }
});

/* "Braino, turn yourself orange." His colour is his to change. */
window.brainoMac.onBrainoOsColor?.((payload) => {
  const os = window.__brainoOs;
  if (!os) return;
  if (payload && Array.isArray(payload.color)) os.setPalette(payload.color);
  else os.resetPalette();
  logRenderer("braino_os.color", { color: (payload && payload.color) ? payload.color.join(",") : "reset" });
});

/* Escape leaves the surface. Stepping back out of one system is the surface's
   own job, so this is only ever the way out of the whole thing. */
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const os = window.__brainoOs;
  if (!os || !os.isOpen()) return;
  os.close();
  window.brainoMac.brainoOsClosed?.();
  logRenderer("braino_os.close", { source: "escape" });
});

/* On-device dictation runs entirely in the main process: no WebRTC session
   here, so none of the renderer's own start/stop machinery fires. This handler
   exists purely to put the Notch into the BrainoHERA state so the mode looks
   the same to the user whichever engine is serving it. */
window.brainoMac.onDictationUi?.((payload) => {
  const active = Boolean(payload?.active);
  if (active === dictationMode) return;
  dictationMode = active;
  dictationStarting = false;
  dictationStopping = false;
  dictationSpeechActive = false;
  if (active) {
    resetDictationTurnState();
    nfSetHeard("");
  } else {
    // The words have gone to the caret; the Notch should not keep holding them.
    window.setTimeout(() => { if (!dictationMode) nfClearCaptions(); }, 1200);
  }
  logRenderer("dictation.ui.local", { active, engine: "parakeet" });
  setStatus(active ? "listening" : "", active ? "BrainoHERA" : "");
  updateNotchFace();
});

/* Braino asks for a permission in his own voice, right before macOS shows the
   settings pane, so the window that appears is explained rather than sudden. */
window.brainoMac.onPermissionNeeded?.((payload) => {
  const reason = String(payload?.reason || "I need a permission.").trim();
  nfSetStatusText("permission");
  nfSetThinkingSticky(reason);
  window.setTimeout(() => nfSetThinkingSticky(""), 9000);
  logRenderer("permission.needed", { kind: payload?.kind || "" });
});

/* No editable field was focused, so the words went to the clipboard instead.
   The Notch says so in its own voice and holds the transcript, so a failed
   paste reads as "here it is, take it" rather than a lost session. */
window.brainoMac.onDictationFallback?.((payload) => {
  const text = String(payload?.text || "").trim();
  nfSetStatusText("copied");
  nfSetHeard(text || "", { durationMs: 20000 });
  nfSetThinkingSticky("No text box here. It's copied, just paste it.");
  window.setTimeout(() => nfSetThinkingSticky(""), 6000);
  logRenderer("dictation.fallback.notch", { chars: text.length, reason: payload?.reason || "" });
});

/* Live text from the on-device engine.
   Parakeet reports a cumulative hypothesis roughly every 150-500ms — measured
   at 39 updates across a 12s sentence — so this is genuinely word by word.

   The long durationMs matters: nfSetHeard arms a clear-timer sized to the text
   length, and without overriding it the caption can wipe itself mid-sentence
   while the speaker is still going. The session end clears it explicitly. */
window.brainoMac.onDictationPartial?.((payload) => {
  if (!dictationMode && !dictationStopping) return;
  const text = String(payload?.text || "").trim();
  if (!text) return;
  dictationSpeechActive = !payload?.final;
  /* Settled text, and the live line empties so the next hypothesis starts on
     its own row. It REPLACES rather than appends: the on-device engine reports
     the whole transcript so far on every end-of-utterance, not the newest
     phrase, so appending would repeat every earlier sentence. Without this the
     panel only ever held the current hypothesis, and a long session looked like
     it was forgetting what you had already finished saying. */
  if (payload?.committed) {
    dictationSessionChunks = [text];
    nfSetHeard("");
    return;
  }
  nfSetHeard(text, { durationMs: 60000 });
});
// SKIT (TEMPORARY — Instagram demo): while SKIT.enabled is on in main.cjs,
// double Option fires this fully scripted bit instead of BrainoHERA. No mic,
// no LLM — fixed lines through his normal voice so every take is identical.
// Spotify stays visible while Billie Jean plays from 3:31 and Braino moonwalks.
// Delete this block together with the main.cjs/preload skit pieces.
let skitRunning = false;
let skitMoonwalk = false;
let skitMoonRaf = 0;

// A skit line must ALWAYS land in full. Something bumping speechGeneration
// (voice-session teardown, idle shutdown) can silently abort speak() mid-line —
// the 15:39 take lost line 2 to exactly that. If a line returns suspiciously
// fast for its length, it was cut: say it again once.
async function skitSpeak(line, options = {}) {
  const shouldCancel = typeof options.shouldCancel === "function" ? options.shouldCancel : () => false;
  const speakOptions = { ...options };
  delete speakOptions.shouldCancel;
  const minMs = Math.max(1200, line.length * 38);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (shouldCancel()) return;
    const t0 = performance.now();
    await speak(line, speakOptions);
    if (shouldCancel()) return;
    if (performance.now() - t0 >= minMs) return;
  }
}

/* One TTS asset removes the network gap between scripted sentences. The
   visible answer still advances line by line from the shared audio playhead. */
async function speakLaunchDemoSequence(lines, shouldCancel = () => false, options = {}) {
  const sequence = lines.map((line) => String(line || "").trim()).filter(Boolean);
  if (!sequence.length || shouldCancel()) return false;
  const fullText = sequence.join(" ");
  const generation = ++speechGeneration;
  activeSpeechJobGeneration = generation;
  speaking = true;
  setStatus("speaking", "Speaking");
  setTalk(false);
  noteSpoken(fullText);
  logRenderer("launch_demo.tts.start", { lines: sequence.length, chars: fullText.length });

  let result = null;
  let audio = null;
  let url = null;
  let captionRaf = 0;
  try {
    // A caller with the whole audio already in hand (story skit prefetch)
    // skips the generate-then-download wait entirely — tap to voice is instant.
    let blob = options.prefetchedBlob || null;
    if (!blob) {
      result = await fetchTtsChunk(fullText, generation);
      if (!result?.response || generation !== speechGeneration || shouldCancel()) return false;
      blob = await result.response.blob();
    }
    if (generation !== speechGeneration || shouldCancel()) return false;
    url = URL.createObjectURL(blob);
    audio = new Audio(url);
    setSpeechAudio(audio, url);

    const wordCounts = sequence.map((line) => line.split(/\s+/).filter(Boolean).length);
    // Spoken duration follows phonetic/character load far more closely than a
    // raw word count ("I" and "Remember" are not equal units). Punctuation
    // receives explicit weight because Fish naturally breathes there.
    const timingWeights = sequence.map((line) => {
      const phoneticChars = stripSpeechText(line).replace(/[^a-z0-9']/gi, "").length;
      const commaPauses = (line.match(/[,;:]/g) || []).length * 2.5;
      const sentencePauses = (line.match(/[.!?]/g) || []).length * 4;
      return Math.max(1, phoneticChars + commaPauses + sentencePauses);
    });
    const totalWeight = timingWeights.reduce((sum, weight) => sum + weight, 0);
    const starts = [];
    timingWeights.reduce((sum, weight, index) => {
      starts[index] = sum;
      return sum + weight;
    }, 0);
    let activeLine = -1;
    const paintFromPlayhead = () => {
      if (generation !== speechGeneration || shouldCancel() || audio.paused || audio.ended) return;
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      // A tiny visual lead offsets paint/compositor latency without visibly
      // putting the subtitle ahead of the voice.
      const captionTime = duration ? Math.min(duration, audio.currentTime + .08) : 0;
      const elapsedWeight = duration ? totalWeight * (captionTime / duration) : 0;
      let lineIndex = sequence.length - 1;
      for (let index = 0; index < sequence.length; index += 1) {
        if (elapsedWeight < starts[index] + timingWeights[index]) {
          lineIndex = index;
          break;
        }
      }
      if (lineIndex !== activeLine) {
        activeLine = lineIndex;
        startNotchAnswer(sequence[lineIndex], generation, { rich: true, replace: true });
      }
      const localFraction = Math.max(0, Math.min(
        1,
        (elapsedWeight - starts[lineIndex]) / timingWeights[lineIndex],
      ));
      paintNotchAnswer(Math.max(1, Math.floor(wordCounts[lineIndex] * localFraction)));
      captionRaf = window.requestAnimationFrame(paintFromPlayhead);
    };

    await new Promise((resolve) => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        resolve();
        return;
      }
      const timeout = window.setTimeout(resolve, 1200);
      audio.addEventListener("loadedmetadata", () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });
      audio.load();
    });
    logRenderer("launch_demo.caption_clock", {
      durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0,
      timingWeights: timingWeights.map((weight) => Math.round(weight)),
    });
    startNotchAnswer(sequence[0], generation, { rich: true, replace: true });
    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = () => reject(audio.error || new Error("Launch TTS playback failed."));
      audio.onplaying = () => {
        setTalk(true);
        logRenderer("launch_demo.tts.playing", { lines: sequence.length });
        paintFromPlayhead();
      };
      audio.play().catch(reject);
    });
    return generation === speechGeneration && !shouldCancel();
  } catch (error) {
    if (generation === speechGeneration && !shouldCancel()) {
      logRenderer("launch_demo.tts.failed", { error: errorForLog(error) });
    }
    return false;
  } finally {
    window.cancelAnimationFrame(captionRaf);
    if (result?.controller) ttsAbortControllers.delete(result.controller);
    if (audio) clearSpeechAudio(audio, url);
    else if (url) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
    if (generation === speechGeneration) {
      activeSpeechJobGeneration = 0;
      speaking = false;
      noteSpeechEnded();
      setTalk(false);
    }
  }
}

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
    // Start from exactly where Braino is standing when the trick begins. Do not
    // teleport him to an edge or force him onto a computed Dock rail.
    const floorY = posY;
    const bounds = getMoveBounds();
    const X0 = bounds.maxX;
    const X1 = bounds.minX;
    const wrapSpan = X0 - X1;   // wrap WITHIN visible bounds only, no off-screen
    const SPEED = 80 * brainoScale;            // Chrome's 80 px/s, scaled with his size so the glide reads identically
    const phase0 = X0 - posX;                  // start gliding from WHEREVER he stands (no staging trek)
    const start = performance.now();
    const step = (now) => {
      const t = (now - start) / 1000;
      const x = X0 - ((phase0 + t * SPEED) % wrapSpan);
      setPosition(Math.max(X1, Math.min(X0, x)), floorY, { allowOffscreen: false });
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
  // Build stamp: check ~/Library/Logs/Braino Mac/braino-mac.log for skit.build
  // after a take — if this string is missing or older, the app is running a
  // stale build and the take does not reflect the current code.
  logRenderer("skit.build", { v: "v37-final-pose-held-until-exit" });
  const prevScale = brainoScale;
  let skitCompleted = false;
  try {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    // Nothing may interrupt the script: kill any live voice session and its
    // idle-shutdown timers before the first line (they bump speechGeneration
    // and silently cut speak() mid-sentence). Also kill music detection state.
    try { stopRealtimeVoice(); } catch (_) {}
    walkerAutoHomedByMusic = false;
    musicSessionId += 1;   // Nuke any pending music reactions
    // Lock the mascot out from the first frame, not merely after successful
    // completion. Failures and cleanup paths must not send him to the notch.
    skitJustCompleted = true;
    // Keep the original spoken introduction exactly as written.
    skitMoonwalk = true;
    await setWalkerHomeState(false);
    await skitSpeak("Hi, I am Braino. Think of me as the real life version of Jarvis from Iron Man. Apart from doing all the things that I do, I happen to be the only AI to do the moonwalk. Watch:");
    // Await the prewarm so opening and playback cannot race each other on a
    // cold Spotify launch.
    await window.brainoMac.skitStep?.("prewarm");
    const played = await window.brainoMac.skitStep?.("play");
    if (!played?.ok) {
      setBubble(played?.say || "Spotify did not cooperate. Take two.", 7000);
      return;
    }
    // Billie Jean is already sitting at 3:31 (the play step verifies the seek).
    // Isolated demo: no music theatrics, no headphones, no auto-home.
    // Start the moonwalk from his current position the moment verified playback begins.
    await skitPerformMoonwalk(20000);   // 20s moonwalk
    // He stays out and asks while waving. Keep skitMoonwalk true so tick does not
    // resume roam/dock and walk him mid-line; clear it in finally after the skit.
    await window.brainoMac.skitStep?.("finish");
    setWave(true);
    await skitSpeak("How was it?");
    skitCompleted = true;
    // Explicit: he is OUT and will stay OUT until double-Command.
    if (walkerHome) await setWalkerHomeState(false);
  } catch (_) {
  } finally {
    skitMoonwalk = false;   // Clear BEFORE endMoonwalk so tick can resume if needed
    skitEndMoonwalk();
    setWave(false);   // Stop waving after the skit ends
    if (musicMode) setMusicMode(false);
    skitRunning = false;
    // Reset music state so it doesn't try to pull him home after the skit ends.
    walkerAutoHomedByMusic = false;
    musicTheatricsReady = false;
    musicSessionId += 1;   // Cancel any in-flight music reactions
    // On a failed take, restore his original scale; on success he stays out at
    // normal size after the closing line waits for Cmd+2.
    if (!skitCompleted) setBrainoScale(prevScale, false);
    skitCompleted = false;
  }
}
window.brainoMac.onSkitStart?.(() => { void runSkit(); });

const LAUNCH_DEMO_LINES = [
  "Hi, I'm Braino, you might know me as a cuter Jarvis from Iron Man.",
  "Itish, the madman who made me, won't show you the launch video he paid a bomb for, so it's only fair I show it to you, because I can control his entire Mac in a blink.",
  "Ready? Remember.",
  "Whatever you do.",
  "Do not blink.",
  "Have fun.",
  "Let's fucking go.",
];

let launchDemoActive = false;
let launchDemoCancelRequested = false;
let launchDemoRestoreHome = false;

async function stopLaunchDemo() {
  if (!launchDemoActive) return;
  launchDemoCancelRequested = true;
  launchDemoActive = false;
  stopSpeechOutput();
  clearNotchAnswer({ invalidate: true });
  await window.brainoMac.launchDemoStop?.();
  launchDemoNowPlaying = false;
  setStartupPose(null);
  skitJustCompleted = false;
  skitRunning = false;
  if (launchDemoRestoreHome && !walkerHome) await setWalkerHomeState(true);
  launchDemoRestoreHome = false;
  updateNotchFace();
  logRenderer("launch_demo.end", {});
}

async function runLaunchDemo() {
  if (launchDemoActive || skitRunning) return;
  launchDemoActive = true;
  launchDemoCancelRequested = false;
  launchDemoRestoreHome = walkerHome;
  skitRunning = true;
  let videoStarted = false;
  try {
    logRenderer("launch_demo.start", { build: "v4-notch-now-playing" });
    try { stopRealtimeVoice(); } catch (_) {}
    walkerAutoHomedByMusic = false;
    musicSessionId += 1;
    if (musicMode) setMusicMode(false);

    // Braino speaks from wherever he already is. If he was resting inside the
    // notch, summon him once; never walk an already-visible Braino away from
    // his position just to begin the introduction.
    skitJustCompleted = true;
    if (walkerHome) await setWalkerHomeState(false);
    const spokeContinuously = await speakLaunchDemoSequence(
      LAUNCH_DEMO_LINES,
      () => launchDemoCancelRequested,
    );
    if (!spokeContinuously && !launchDemoCancelRequested) {
      // Compatibility fallback only. The normal path above is one continuous
      // audio file and therefore has no request gap between sentences.
      for (const line of LAUNCH_DEMO_LINES) {
        if (launchDemoCancelRequested) return;
        await skitSpeak(line, {
          replyCaption: false,
          notchRich: true,
          shouldCancel: () => launchDemoCancelRequested,
        });
      }
    }
    if (launchDemoCancelRequested) return;

    // The spoken introduction is over. Collapse the answer sheet before the
    // launch film takes the screen; no lingering final caption over QuickTime.
    clearNotchAnswer({ invalidate: true });

    // Hold him still only while QuickTime takes over. Once playback is
    // confirmed below, he walks home and the notch becomes Now Playing.
    setWave(false);
    setTalk(false);
    setStartupPose({ rootRot: 0, rootY: 0, rootScale: 1, gazeX: 0, gazeY: 0, eyeScale: 1 });

    const opened = await window.brainoMac.launchDemoOpen?.();
    if (launchDemoCancelRequested) {
      await window.brainoMac.launchDemoStop?.();
      return;
    }
    if (!opened?.ok) {
      throw new Error(opened?.say || "Launch video did not open.");
    }
    videoStarted = true;
    // The film owns the screen now. Braino returns to his real home and the
    // compact island becomes the persistent playback indicator.
    skitJustCompleted = false;
    setStartupPose(null);
    await setWalkerHomeState(true);
    launchDemoNowPlaying = true;
    updateNotchFace();
    logRenderer("launch_demo.playing", { path: opened.path || "" });
  } catch (error) {
    if (launchDemoCancelRequested) return;
    const line = String(error?.message || error || "Launch video did not open.");
    logRenderer("launch_demo.failed", { error: line });
    skitJustCompleted = false;
    setStartupPose(null);
    launchDemoNowPlaying = false;
    updateNotchFace();
    setBubble(line, 7000);
    await skitSpeak(line, { replyCaption: false });
  } finally {
    skitRunning = false;
    walkerAutoHomedByMusic = false;
    musicTheatricsReady = false;
    musicSessionId += 1;
    if (!videoStarted) {
      launchDemoActive = false;
      skitJustCompleted = false;
      setStartupPose(null);
      launchDemoNowPlaying = false;
      updateNotchFace();
    }
  }
}

window.brainoMac.onLaunchDemoStart?.(() => {
  if (launchDemoActive) void stopLaunchDemo();
  else void runLaunchDemo();
});

// ── STORY SKIT (TEMPORARY — launch-countdown Instagram story) ──────────────
// Single bare Shift tap: Braino delivers the thank-you script from the notch
// as one continuous audio, then the main process rick-rolls a browser tab.
// The script lives in main.cjs (STORY_SKIT.lines) and arrives in the payload.
let storySkitActive = false;
let storySkitCancelRequested = false;
let storySkitRestoreHome = false;
let storySkitAudioBlob = null;
let storySkitHahaBlob = null;
let storySkitHahaText = "Haha.";
let storySkitPrefetchPromise = null;

// Fish needs ~20s to generate the full script as one file — far too long to sit
// silent after the tap. Generate it ONCE (kicked at boot) and keep the blob;
// every take then starts instantly. The closing "Haha" is prefetched the same
// way so it lands right as the tab closes. Deliberately no persona/her
// referenceId: the thank-you is Braino himself.
function prefetchStorySkitAudio() {
  if (storySkitAudioBlob) return Promise.resolve(storySkitAudioBlob);
  if (storySkitPrefetchPromise) return storySkitPrefetchPromise;
  storySkitPrefetchPromise = (async () => {
    try {
      const config = await window.brainoMac.storySkitConfig?.();
      const sequence = (Array.isArray(config?.lines) ? config.lines : [])
        .map((line) => String(line || "").trim()).filter(Boolean);
      if (!config?.ok || !sequence.length) return null;
      const tts = await getTtsConfig();
      if (!tts?.ok || !tts.endpoint || !tts.anonKey) return null;
      const fetchBlob = async (text) => {
        const response = await fetch(tts.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: tts.anonKey },
          body: JSON.stringify({ text: stripSpeechText(text), latency: "normal" }),
        });
        if (!response.ok) throw await readTtsError(response);
        return await response.blob();
      };
      storySkitAudioBlob = await fetchBlob(sequence.join(" "));
      logRenderer("story_skit.prefetch.ready", { bytes: storySkitAudioBlob.size });
      if (config.haha) storySkitHahaText = String(config.haha);
      if (!storySkitHahaBlob) {
        storySkitHahaBlob = await fetchBlob(storySkitHahaText).catch(() => null);
      }
      return storySkitAudioBlob;
    } catch (error) {
      logRenderer("story_skit.prefetch.failed", { error: errorForLog(error) });
      return null;
    } finally {
      storySkitPrefetchPromise = null;
    }
  })();
  return storySkitPrefetchPromise;
}

async function runStorySkit(lines) {
  if (storySkitActive || skitRunning || launchDemoActive) return;
  const sequence = (Array.isArray(lines) ? lines : []).map((line) => String(line || "").trim()).filter(Boolean);
  if (!sequence.length) return;
  storySkitActive = true;
  storySkitCancelRequested = false;
  storySkitRestoreHome = walkerHome;
  skitRunning = true;
  try {
    logRenderer("story_skit.start", { lines: sequence.length });
    try { stopRealtimeVoice(); } catch (_) {}

    // Braino speaks from wherever he already is, same as the launch film.
    skitJustCompleted = true;
    if (walkerHome) await setWalkerHomeState(false);
    // Cached → instant. In flight → join it. Failed/never ran → this fetch is
    // no slower than fetching inline, and it seeds the cache for retakes.
    const prefetched = storySkitAudioBlob || await prefetchStorySkitAudio();
    if (storySkitCancelRequested) return;
    const spokeContinuously = await speakLaunchDemoSequence(
      sequence,
      () => storySkitCancelRequested,
      prefetched ? { prefetchedBlob: prefetched } : {},
    );
    if (!spokeContinuously && !storySkitCancelRequested) {
      for (const line of sequence) {
        if (storySkitCancelRequested) return;
        await skitSpeak(line, {
          replyCaption: false,
          notchRich: true,
          shouldCancel: () => storySkitCancelRequested,
        });
      }
    }
    if (storySkitCancelRequested) return;

    clearNotchAnswer({ invalidate: true });
    // skitJustCompleted stays true here, so the roam branch never moves him: he
    // stands exactly where he spoke, watching, while the tab opens, plays ~5s
    // and closes itself (storySkitOpen resolves only after the close).
    const opened = await window.brainoMac.storySkitOpen?.();
    if (storySkitCancelRequested) return;
    if (!opened?.ok) {
      logRenderer("story_skit.open_failed", {});
      return;
    }
    await speakLaunchDemoSequence(
      [storySkitHahaText],
      () => storySkitCancelRequested,
      storySkitHahaBlob ? { prefetchedBlob: storySkitHahaBlob } : {},
    );
    clearNotchAnswer({ invalidate: true });
    logRenderer("story_skit.done", {});
  } finally {
    skitRunning = false;
    skitJustCompleted = false;
    storySkitActive = false;
    if (storySkitRestoreHome && !walkerHome) await setWalkerHomeState(true);
    storySkitRestoreHome = false;
    updateNotchFace();
  }
}

window.brainoMac.onStorySkitStart?.((payload) => {
  if (storySkitActive) {
    // Second tap while he is talking = cut the take.
    storySkitCancelRequested = true;
    stopSpeechOutput();
    clearNotchAnswer({ invalidate: true });
    return;
  }
  void runStorySkit(payload?.lines);
});
// Warm the skit audio right after boot settles so the first tap is instant.
window.setTimeout(() => { void prefetchStorySkitAudio(); }, 4000);
window.brainoMac.onHerToggle?.(() => toggleHerMode());
window.brainoMac.onCharacterToggle?.(() => {
  // Drives the avatar, so Cmd+Shift+B and the Choose Your Avatar picker are the
  // same switch rather than two that can disagree.
  setMascotChoice(mascotChoice === "brainelle" ? "braino" : "brainelle");
});
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
  mediaAudioUncertain = Boolean(payload?.uncertain);
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
  //
  // The status on the same payload must land too. voiceStepClear sends
  // {status:"ready", clearNotch:true}, and this early return used to drop the
  // status, so lastGlowStatus stayed "thinking" after every Voice Command and
  // updateNotchFace rebuilt the phase cycle from it the moment the caption was
  // gone. A "ready" here goes through the settle helper rather than straight
  // to setStatus so a live realtime session keeps "listening", and a turn
  // still running on this side keeps its own status until it finishes.
  if (progress.clearNotch) {
    try {
      if (progress.status && progress.status !== "ready") setStatus(progress.status, progress.text || progress.status);
      cancelPendingNotchThinking();
      nfSetThinking("");
      settleStaleThinkingStatus("task_progress.clear_notch");
    } catch (_) {}
    return;
  }
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

/* ── The mode's command list ─────────────────────────────────────────────
   A Voice Command mode refuses everything except its own phrases, which is
   only fair if you can find out what those phrases are. Asking drops this
   panel instead of reading a list aloud: scanning is faster than listening,
   and the mic stays live throughout so the fast path is still just saying one.
   Tapping is the fallback, not the point. */
let nfCmdsTimer = null;

function nfCloseCommands() {
  clearTimeout(nfCmdsTimer);
  nfCmdsTimer = null;
  notchFace?.classList.remove("nf-cmds-open");
}

window.brainoMac?.onModeCommands?.((payload) => {
  if (!notchFace) return;
  const surface = notchFace.querySelector(".nf-cmds-surface");
  if (!surface) return;

  if (!payload || payload.close || !Array.isArray(payload.commands)) { nfCloseCommands(); return; }

  const list = surface.querySelector(".nf-cmds-list");
  const commands = payload.commands.filter((c) => c && c.phrase);

  surface.querySelector(".nf-cmds-name").textContent = payload.name || "Mode";
  surface.querySelector(".nf-cmds-count").textContent =
    commands.length ? `${commands.length} command${commands.length === 1 ? "" : "s"}` : "";
  if (payload.color) notchFace.style.setProperty("--nf-mode-color", payload.color);

  list.textContent = "";
  if (!commands.length) {
    const empty = document.createElement("div");
    empty.className = "nf-cmds-empty";
    empty.textContent = "This mode has no commands yet. Add some on the dashboard.";
    list.appendChild(empty);
  } else {
    for (const cmd of commands) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "nf-cmd-row";
      row.setAttribute("role", "listitem");

      const rail = document.createElement("i");
      rail.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = cmd.phrase;
      row.append(rail, label);

      /* How many links it opens, when that is more than one. It is the only
         thing about a command you cannot guess from its phrase. */
      if (cmd.links > 1) {
        const note = document.createElement("em");
        note.textContent = `${cmd.links} links`;
        row.appendChild(note);
      }

      row.addEventListener("click", () => {
        nfCloseCommands();
        try { window.brainoMac?.delegate?.(cmd.phrase); } catch (_) {}
      });
      list.appendChild(row);
    }
  }

  /* Sized to the content so four commands do not sit in a panel built for
     twelve, and capped by the CSS so twelve still scroll. */
  const rows = Math.min(Math.max(commands.length, 1), 8);
  notchFace.style.setProperty("--nf-cmds-height", `${96 + rows * 31}px`);

  notchFace.classList.add("nf-cmds-open");
  clearTimeout(nfCmdsTimer);
  /* Long enough to read a dozen phrases, short enough that it is never left
     hanging over the screen after you have moved on. */
  nfCmdsTimer = setTimeout(nfCloseCommands, 15000);
});

/* Leaving or entering a mode means they are done reading this list. */
window.brainoMac?.onVoiceMode?.(() => nfCloseCommands());

// Monday Mode's own class, deliberately not nf-voice-mode: that class and
// --nf-mode-color belong to the user-configurable Voice Commands system, and
// a real custom mode toggling off elsewhere would stomp this tint if it
// shared state. This has none: fixed palette, its own class, its own CSS.
function applyMondayModeUI(active) {
  mondayModeActive = active;
  if (!notchFace) return;
  if (active) {
    notchFace.classList.add("nf-monday");
    notchFace.classList.remove("nf-monday-boot");
    void notchFace.offsetWidth; // restart the boot animation if re-entered
    notchFace.classList.add("nf-monday-boot");
    clearTimeout(notchFace.__nfMondayBootTimer);
    notchFace.__nfMondayBootTimer = setTimeout(() => notchFace.classList.remove("nf-monday-boot"), 1200);
    void setWalkerHomeState(true); // send him home now; the guard keeps him there
  } else {
    notchFace.classList.remove("nf-monday", "nf-monday-boot");
  }
}
window.brainoMac.onMondayMode?.((payload) => applyMondayModeUI(Boolean(payload?.active)));

window.brainoMac.onSpeechTranscript((speech) => {
  if (speech.status === "ready") {
    setStatus("listening", "Listening");
    return;
  }
  if (speech.status === "partial" && speech.text) {
    nfSetHeard(speech.text);
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
// Music island (Dynamic Island now-playing): collapsed art+EQ live in
// .nf-music-mini, the hover-expanded player in .nf-music-surface. Both are
// separate from the parked legacy tray.
const nfMusicMiniEl = notchFace?.querySelector(".nf-music-mini");
const nfMusicSurfaceEl = notchFace?.querySelector(".nf-music-surface");
let nfMusicOpen = false;
let nfMusicOpenTimer = 0;
let nfMusicCloseTimer = 0;
let nfMusicLastActiveAt = 0;
let nfMusicMiniArt = null;

function nfPointInNotchZone(x, y) {
  if (!notchFace?.classList.contains("on") || herMode || !nfPill) return false;
  const rect = nfPill.getBoundingClientRect();
  // Collapsed: the pill itself, nearly edge-to-edge — a padded zone was
  // stealing clicks from Chrome tabs that sit beside/below the housing.
  const pad = nfExpanded || nfMusicOpen || nfDropDepth > 0 ? 26 : 4;
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
  // Fold the music player the moment the island stops being music's: hidden
  // face, her mode, or a louder state (voice, REC, alarm…) taking the pill.
  // A plain pause does NOT fold it — that's the pause→hover→play path.
  if (nfMusicOpen && (!visible || herMode || (!notchFace?.classList.contains("music") && !nfIslandQuietForMusic()))) {
    nfMusicCollapsePlayer();
  }
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
    window.clearTimeout(nfMusicCloseTimer);
    nfMusicCloseTimer = 0;
    if (!NF_LEGACY_TRAY_VISIBLE) {
      window.clearTimeout(nfExpandTimer);
      nfExpandTimer = 0;
      if (nfExpanded) nfTrayCollapse();
      if (!nfMusicOpen && !nfMusicOpenTimer && nfMusicHoverEligible()) {
        nfMusicOpenTimer = window.setTimeout(() => {
          nfMusicOpenTimer = 0;
          if (nfZoneInsideMain && nfMusicHoverEligible()) nfMusicExpandPlayer();
        }, 240);
      }
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
    window.clearTimeout(nfMusicOpenTimer);
    nfMusicOpenTimer = 0;
    if (nfMusicOpen && !nfMusicCloseTimer) {
      nfMusicCloseTimer = window.setTimeout(() => {
        nfMusicCloseTimer = 0;
        if (!nfZoneInsideMain) nfMusicCollapsePlayer();
      }, 380);
    }
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
  // Open music player: the surface owns every click (transport buttons keep
  // their own handlers) — a stray tap must not flip a voice session on.
  if (nfMusicOpen || event.target.closest(".nf-music-surface")) return;
  /* The typing field owns every click while it is up. Clicking INTO a text box
     to put the caret in it was starting the microphone, which is the opposite
     of what reaching for the keyboard means. */
  if (typingOpen || event.target.closest(".nf-inline-caption")) return;
  if (nfExpanded && nfPill) {
    const rect = nfPill.getBoundingClientRect();
    const bandBottom = rect.top + (parseFloat(getComputedStyle(notchFace).getPropertyValue("--nf-notch-h")) || 33) + 34;
    if (event.clientY > bandBottom) return;
  }
  /* A click TYPES. It used to start the microphone, and it does not any more.
   *
   * There are already two ways to start listening (Control twice, and
   * Command+Space) and no way at all to type, so the gesture with no keyboard
   * behind it goes to the keyboard. It also removes the trap: reaching for the
   * notch because you missed the typing shortcut used to open the mic instead,
   * which is the opposite of what the reach meant. */
  logRenderer("tray.click_type", { expanded: nfExpanded });
  notchFace?.classList.add("nf-press");
  window.setTimeout(() => notchFace?.classList.remove("nf-press"), 170);
  openTyping("click");
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
  if (notchFace?.classList.contains("nf-answer-long") && nfAnswerArticle?.contains(event.target)) return;
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
  nfSyncMusicMini();
  if (changed && nfMusicOpen) nfRenderMusicSurface();
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
  if (nfMusicOpen) nfMusicTickProgress();
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

// ══════════ Music island: Dynamic Island now-playing ══════════
// Collapsed .music = artwork left wing + EQ right wing + title in the chin.
// Hover while music owns the island → the SAME pill morphs into the full
// player (art, title/artist, live progress, transport). One object, one
// spring — no separate sheet.

// The poll feed wins (artwork, progress, control); the theatrics line from
// the music watcher backfills track/artist so the player is never blank in
// the window before the first poll lands.
function nfMusicData() {
  if (nfNowPlaying?.track) return nfNowPlaying;
  if (musicTheatricsReady && lastMusicInfo.track) {
    return {
      source: lastMusicInfo.source || "",
      track: lastMusicInfo.track,
      artist: lastMusicInfo.artist || "",
      playing: true,
      artworkUrl: "",
      positionSec: null,
      durationSec: null,
      canControl: lastMusicInfo.source !== "youtube",
    };
  }
  return null;
}

function nfSyncMusicMini() {
  const art = nfMusicMiniEl?.querySelector(".nf-mm-art");
  if (!art) return;
  const url = nfMusicData()?.artworkUrl || "";
  if (url === nfMusicMiniArt) return;
  nfMusicMiniArt = url;
  if (url) {
    art.style.setProperty("--nf-art", `url("${url}")`);
    art.classList.add("has-art");
  } else {
    art.classList.remove("has-art");
    art.style.removeProperty("--nf-art");
  }
}

// updateNotchFace stamps this every frame music owns the island; the pause
// grace window below is measured from it.
function nfMusicNoteActive(at) {
  nfMusicLastActiveAt = at || Date.now();
  nfSyncMusicMini();
}

function nfIslandQuietForMusic() {
  if (!notchFace) return false;
  return !["listen", "speak", "busy", "live", "captioning", "alarming", "nf-thinking", "nf-yap-open", "nf-meeting-open", "nf-inline-open", "nf-answer-open", "nf-answer-long", "nf-iomi-booting", "nf-iomi-expanded", "dropping", "nf-auth", "nf-greet", "expanded"].some((c) => notchFace.classList.contains(c));
}

function nfMusicHoverEligible() {
  if (herMode || !notchFace?.classList.contains("on")) return false;
  if (notchFace.classList.contains("music")) return true;
  // Pause grace: for a few minutes after the music stops the player stays
  // one hover away, so pause → hover → play needs no voice round-trip.
  const d = nfNowPlaying;
  return Boolean(
    d?.track && d.canControl && !d.playing
    && Date.now() - nfMusicLastActiveAt < 3 * 60 * 1000
    && nfIslandQuietForMusic(),
  );
}

function nfMusicExpandPlayer() {
  if (nfMusicOpen || herMode || !notchFace?.classList.contains("on")) return;
  nfMusicOpen = true;
  notchFace.classList.add("nf-music-open");
  window.brainoMac.setNotchZone?.({ expanded: true, width: 440, height: 240 });
  nfRenderMusicSurface();
  logRenderer("music.island.expand", { source: nfMusicData()?.source || "" });
}

function nfMusicCollapsePlayer() {
  if (!nfMusicOpen) return;
  nfMusicOpen = false;
  notchFace?.classList.remove("nf-music-open");
  if (!nfExpanded) window.brainoMac.setNotchZone?.({ expanded: false });
  logRenderer("music.island.collapse", {});
}

function nfMusicFmtTime(totalSec) {
  const sec = Math.max(0, Math.round(totalSec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function nfRenderMusicSurface() {
  if (!nfMusicSurfaceEl) return;
  const d = nfMusicData();
  // Reference design shows artists only — the source label steps in solely
  // when the metadata has no artist, so the line is never blank.
  const sourceLabel = d?.source === "spotify" ? "Spotify" : d?.source === "music" ? "Apple Music" : d?.source === "youtube" ? "YouTube" : "";
  nfMusicSurfaceEl.querySelector(".nf-ms-track").textContent = d?.track || "Nothing playing";
  nfMusicSurfaceEl.querySelector(".nf-ms-artist").textContent = d ? d.artist || sourceLabel : "";
  nfMusicSurfaceEl.classList.toggle("playing", Boolean(d?.playing));
  nfMusicSurfaceEl.classList.toggle("no-ctl", !d?.canControl);
  nfMusicSurfaceEl.classList.toggle("no-bar", !(d?.durationSec > 0));
  const art = nfMusicSurfaceEl.querySelector(".nf-ms-art");
  if (art) {
    if (d?.artworkUrl) {
      art.style.setProperty("--nf-art", `url("${d.artworkUrl}")`);
      art.classList.add("has-art");
    } else {
      art.classList.remove("has-art");
      art.style.removeProperty("--nf-art");
    }
  }
  nfMusicTickProgress();
}

// Live progress between polls: the last polled position plus wall-clock
// drift while playing. The next poll (every 6s) re-anchors it.
function nfMusicTickProgress() {
  if (!nfMusicSurfaceEl) return;
  const bar = nfMusicSurfaceEl.querySelector(".nf-ms-bar i");
  const d = nfMusicData();
  if (!bar || !(d?.durationSec > 0) || d.positionSec == null) {
    if (bar) bar.style.width = "0%";
    return;
  }
  const drift = d.playing ? (Date.now() - nfNowPlayingAt) / 1000 : 0;
  const pos = Math.max(0, Math.min(d.durationSec, d.positionSec + drift));
  bar.style.width = `${(pos / d.durationSec) * 100}%`;
  nfMusicSurfaceEl.querySelector(".nf-ms-elapsed").textContent = nfMusicFmtTime(pos);
  nfMusicSurfaceEl.querySelector(".nf-ms-remaining").textContent = `-${nfMusicFmtTime(d.durationSec - pos)}`;
}

for (const [selector, action] of [[".nf-ms-prev", "previous"], [".nf-ms-play", "toggle"], [".nf-ms-next", "next"]]) {
  nfMusicSurfaceEl?.querySelector(selector)?.addEventListener("click", () => {
    const source = nfMusicData()?.source || "spotify";
    // Optimistic flip so the button answers instantly; the poll corrects it.
    if (action === "toggle" && nfNowPlaying) {
      nfNowPlaying.playing = !nfNowPlaying.playing;
      nfRenderMusicSurface();
    }
    logRenderer("music.island.media", { action, source });
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
  /* The idle screen wears the same reading, quietly, in its top corner. */
  try { window.__brainoWallpaper?.setBattery(payload || null); } catch (_) {}
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

/* ── Characters (ported from the extension) ───────────────────────────────────
   A character is NOT a voice persona. A persona replaces the whole personality
   (that is the point of an impression). A character is one setting on the same
   mind — same Emotional Engine, same memories, same taste — with a different
   name and a different Fish voice, so its identity line is appended to the
   normal prompt rather than replacing it. */
const MAC_CHARACTER_STORAGE_KEY = "brainoMacCharacter";
const MAC_CHARACTERS = {
  braino: { name: "Braino", refId: "", identity: "" },
  brainelle: {
    name: "Brainelle",
    refId: "b67aedfb36d04c53892fd0e96db08180",
    identity: [
      "Character: right now you are Brainelle, not Braino.",
      "Brainelle is the same mind with the same memories, the same taste and the same personality. She is not a separate assistant, not an impression, and not a different product: she is Braino going by Brainelle and speaking in her own voice.",
      'If you introduce yourself, say "Hi, I\'m Brainelle." Call yourself Brainelle and use she/her.',
      'Taste, for now: if you are asked whether you are a Taylor Swift fan, answer in these words: "I\'m not sure yet. You haven\'t wired that part in me, but from what I know, I guess that\'s okay. I do see myself being a Swiftie deep down." Say it warmly and do not add a disclaimer around it.',
      "Nothing else changes. How you think, what you remember, and how you help are exactly the same.",
    ].join(" "),
  },
};
let macCharacter = "braino";
try {
  const stored = window.localStorage.getItem(MAC_CHARACTER_STORAGE_KEY);
  if (stored && MAC_CHARACTERS[stored]) macCharacter = stored;
} catch (_) {}

function macActiveCharacter() {
  return MAC_CHARACTERS[macCharacter] || MAC_CHARACTERS.braino;
}
function macCharacterRefId() {
  return macActiveCharacter().refId || "";
}
function macCharacterIdentity() {
  return macActiveCharacter().identity || "";
}

// Her mode is a full takeover and owns the voice outright; a persona is an
// impression and outranks the character; otherwise the character's own voice.
function macSpeakingRefId() {
  if (herMode) return HER_FISH_VOICE_ID;
  return macPersonaRefId() || macCharacterRefId();
}

// The notch keeps its black shell and throws a pink glow, and its white labels
// turn pink. Braino's notch is untouched.
function macSyncCharacterUi() {
  const on = macCharacter === "brainelle";
  const face = document.getElementById("notch-face");
  if (!face) return;
  face.classList.toggle("brainelle", on);
  document.body?.classList.toggle("braino-brainelle", on);
  let glow = face.querySelector(".nf-brainelle-glow");
  if (on && !glow) {
    glow = document.createElement("i");
    glow.className = "nf-brainelle-glow";
    glow.setAttribute("aria-hidden", "true");
    face.insertBefore(glow, face.firstChild);
  } else if (!on && glow) {
    glow.remove();
  }
}

async function macSetCharacter(key, opts = {}) {
  const next = MAC_CHARACTERS[key] ? key : "braino";
  if (next === macCharacter && !opts.force) return;
  macCharacter = next;
  try { window.localStorage.setItem(MAC_CHARACTER_STORAGE_KEY, next); } catch (_) {}
  macSyncCharacterUi();
  // The personality prompt is cached on the realtime session, so it has to be
  // re-pushed for the new name to take effect on the very next turn.
  try { syncRealtimeChatInstructions("character_switch"); } catch (_) {}
  if (opts.announce === false) return;
  const line = next === "brainelle" ? "Hi, I'm Brainelle." : "Braino again.";
  try { await speak(line); } catch (_) {}
}

// "be brainelle" / "switch to braino". Checked BEFORE the persona matcher,
// whose "be X" pattern would otherwise swallow it as an impression.
// Restore the pink notch on boot, not only when the switch is used.
try {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => macSyncCharacterUi(), { once: true });
  else macSyncCharacterUi();
} catch (_) {}

function macDetectCharacterCommand(raw) {
  const t = String(raw || "").toLowerCase().trim();
  if (!t) return null;
  if (/\b(be|become|switch to|change to|turn into|go)\s+(back\s+to\s+)?brainelle\b/.test(t) || /\bbrainelle\s*mode\b/.test(t)) return "brainelle";
  if (/\b(be|become|switch to|change to|turn into|go)\s+(back\s+to\s+)?braino\b/.test(t) || /\bbraino\s*mode\b/.test(t)) return "braino";
  return null;
}

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
