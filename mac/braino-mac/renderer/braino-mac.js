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
/* How long a voice session stays open after the last exchange. Fifteen
   seconds dated from before "his name in every sentence": a back-and-forth
   closed between turns, and every reply had to wake him again through the
   on-device listener and a 2.5 to 5 second reconnect. A minute, the same as
   Her mode, costs about half a cent more per conversation. */
// 3 minutes, from 1 (2026-09-26). After a minute of quiet the voice session
// closed, and the next "Braino" had to open a new one: 2, 5, 6 and once 17
// seconds in the log. A conversation keeps its connection.
const REALTIME_IDLE_TIMEOUT_MS = 180000;
const HER_FISH_VOICE_ID = "046164e7366a4dc899b69a9887d9f7c0";
const HER_IDLE_TIMEOUT_MS = 60000;
/* The whole sentence is the command, never a phrase inside one (2026-10-03):
   "I was not supposed to talk to her in my life again and you texted her"
   turned Her mode on, and Samantha answered "hey. i'm here." to someone upset
   about a message sent to the wrong person. */
const HER_ENTER_RE = /^(?:(?:hey|ok|okay|so)\s+)?(?:(?:braino|bruno|brainelle)\s+)?(?:(?:can|could) you\s+)?(?:please\s+)?(?:(?:switch|go|change)\s+to\s+|turn on\s+|start\s+|open\s+|enter\s+)?(?:her mode|call her|talk to her|open her|start her|her)(?:\s+mode)?(?:\s+(?:please|now))?$/;
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
  // Rename BOTH the element ids (__sbwk_ -> __nfd_) AND everything the art
  // paints with. The paint servers used to be renamed by a fixed list of
  // Braino's three gradients, so a dancing Brainelle would have kept her own
  // seven and come out white; the shared helper renames whatever the art
  // actually defines.
  const dancerSvg = String(window.brainoMac.getWalkerSvg() || "").replaceAll("__sbwk_", "__nfd_");
  host.innerHTML = window.__brainoUniqueGradients
    ? window.__brainoUniqueGradients(dancerSvg, "nfd")
    : dancerSvg
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
/* When your sentence first appeared. There used to be a floor here that let the
   caption hold the box for 1.1s before the thinking chip took it; the caption
   now stays for the whole job (see updateNotchFace), so the floor went. */
let nfHeardShownAt = 0;
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
/* Voice waking up. Pressing Control twice (or saying his name to the on-device
   listener) opens a session that takes 2 to 6 seconds to come up — 3.7s median
   over the last 194 in the log. The notch counts that down from this Mac's own
   recent history and says "You can speak now" only once the session is really
   live, so it never tells you to talk into a microphone that is not open yet. */
let voiceStart = { phase: "", startedAt: 0, estimateMs: 0, readyAt: 0 };
/* The notch panel: his settings, in the notch. See nfSetPanelOpen. */
let nfPanelOpen = false;
let nfPanelBusy = false;
/* Where he was standing when a double-click sent him up into the notch, so
   closing the panel sends him back to exactly that spot. */
let nfPanelReturn = null;
const NF_PANEL_WIDTH = 560;
const TALK_OUT_LOUD_KEY = "brainoTalkOutLoud";
const STAY_PUT_KEY = "brainoStayPut";
/* The quiet notch and stealth. See renderQuietNotch. */
const QUIET_NOTCH_KEY = "brainoQuietNotch";
const STEALTH_KEY = "brainoStealth";
const NF_QUIET_STATES = ["listen", "asleep", "starting", "work", "speak", "heard", "answer"];
const NF_QUIET_HEARD_MS = 2200;
const NF_QUIET_EAR_W = 80;
const NF_QUIET_LINE_W = 420;
let nfQuietMeasure = null;
let nfQuietState = "";
let nfQuietLastCtx = null;
let nfQuietTimer = 0;
let nfQuietEls = null;
let nfQuietAnswerOpenGen = -1;
let nfQuietSpokenWords = 0;
let nfLastZoneRequest = { expanded: false };
const EDGE_SNAP_PX = 56;
/* A reply shown but not spoken, when "Talk out loud" is off. He is not
   audible, so nothing that listens for his voice should treat him as such. */
let speakingSilently = false;
/* HERA, live, while you talk to him. OpenAI's transcript only arrives after a
   pause, so the notch showed your words late and in chunks; HERA runs on this
   Mac and reports them as you say them. See heraVoiceStart. */
let heraVoice = { on: false };
/* OFF. HERA's live words in voice mode showed things nobody in the room had
   said to Braino — a video playing on the Mac came up as "You're saying" in
   Hindi and English — and there was no way to tell from the notch where a
   word had come from. Until that can be made trustworthy, voice mode shows
   OpenAI's transcript only, the way it did before. Dictation (Option twice)
   and LIVE still use HERA; they are unaffected. Flip to true to bring it back.
   ON again 2026-09-26: without it your words showed up only after you had
   finished, which read as him not hearing you. The video problem is handled
   at the display instead: live words show only while OpenAI also hears a
   person speaking (or just after), and never while music or video is known
   to be playing. See heraVoiceMayShow. */
const HERA_LIVE_IN_VOICE = true;
let heraVoiceStarting = false;
/* Between OpenAI's speech_started and speech_stopped. */
let rtUserSpeakingNow = false;
let rtUserStoppedAt = 0;
/* Live words go on the notch only when a person is speaking to him right now. */
function heraVoiceMayShow() {
  if (mediaAudioPlaying) return false;
  return rtUserSpeakingNow || Date.now() - rtUserStoppedAt < 1500;
}
function rtSpeechInProgress() { return rtUserSpeakingNow; }
/* How long the last turn of speech lasted, for looksLikeNoise. */
let rtSpeechStartedAt = 0;
let rtSpeechAudioStartMs = null;
let rtLastSpeechMs = 0;
let heraVoiceStartTries = 0;
const HERA_ROTATE_EXPIRE_MS = 2500;
const HERA_SEGMENT_WAIT_MS = 600;
const HERA_SAFETY_ROTATE_MS = 45000;
const HERA_ECHO_TAIL_MS = 700;
/* The caption is words still being spoken ("You're saying") rather than a
   finished sentence ("You said"). */
let nfHeardLive = false;
/* Long speech gets the wide sheet, and keeps it until the caption closes, so
   the box does not jump sideways the moment a sentence crosses the line. */
let nfInlineLongLatched = false;
const NF_INLINE_LONG_CHARS = 110;
let voiceStartTicker = 0;
const VOICE_CONNECT_HISTORY_KEY = "brainoVoiceConnectMs";
const VOICE_CONNECT_DEFAULT_MS = 3800;
const VOICE_READY_HOLD_MS = 2400;
/* Named mode, as the notch shows it. Declared here rather than beside the rest
   of named mode because updateNotchFace reads them, and it runs long before that
   part of the file has been evaluated. */
let namedAsleepPainted = false;
/* After a deliberate wake (his name to the on-device listener, or Control
   twice) the first thing you say is for him, however long you take to say it.
   Five seconds was not enough: in the log the voice came up at :17 and the
   sentence started at :29, by which time he had gone back to sleep. */
let namedGraceUntil = 0;
/* A sentence you started while he was awake is his, however long it runs.
   The window used to be checked when the sentence ENDED, so a long one that
   began in time was thrown away for finishing late. */
let namedSpeechAwake = false;
/* The golden trace means one thing: he just woke up. Not on every "Braino, …"
   in a conversation that paused for a few seconds. */
const NAME_WAKE_LIGHT_AFTER_MS = 20000;
/* He asked you something: the answer needs no name for this long after he
   finishes the question. */
// 20s, from 10s (2026-09-27): "Yes." to "Want me to try it now?" came 14s
// later and was dropped, so the website never opened.
const NAMED_ANSWER_WINDOW_MS = 20000;
/* And after ANY reply of his, the next twenty seconds are yours, name or no
   name. See namedFollowUpWindowOpen. */
// 45s, from 20s (2026-09-26): mid-conversation pauses were longer than 20s and
// sent him back to waiting for his name.
const NAMED_FOLLOW_UP_MS = 45000;
/* A reply is his half of an exchange you began. He reads notifications and
   timers out loud too, and those are not conversations. */
const NAMED_EXCHANGE_MAX_MS = 3 * 60 * 1000;
/* The last thing you said that he accepted. */
let lastUserTurnAt = 0;
/* The on-device listener heard his name. Its spelling of "Braino" is better
   than the cloud's, so an utterance it caught counts as addressed even when
   the transcript wrote the name as something else. */
let namedHeardOnDeviceAt = 0;
const NAMED_ON_DEVICE_MATCH_MS = 8000;
/* Half a sentence, waiting for the rest. See holdFragment. */
let heldFragment = null;
let heldFragmentTimer = 0;
// Long enough for a thinking pause in slow, natural speech (2026-10-05).
const FRAGMENT_HOLD_MS = 2200;
const FRAGMENT_MAX_HOLD_MS = 12000;
const NAMED_FIRST_COMMAND_MS = 15000;
/* His name as the cloud transcriber sometimes writes it despite language:"en".
   The on-device listener is told "Braino" exists; this one is not, and a short
   "Hey Braino" in an Indian accent can come back in Devanagari or Urdu script,
   which has no a-z in it and used to be dropped without a word in the log. */
const BRAINO_SCRIPT_RE = /(?:ब्रेनो|ब्रैनो|ब्रेनों|ब्रैनों|ब्रेइनो|ब्रीनो|बरेनो|ब्रेनौ|برینو|براینو|بریںو|برائنو)/;
const BRAINELLE_SCRIPT_RE = /(?:ब्रेनेल|ब्रैनेल|ब्रेनेले|برینیل|براینیل)/;
let nameWakeFlashTimer = 0;
let nameWakeFlashAdded = [];
/* Her name wakes her. Apple's recogniser has never heard "Brainelle" and writes
   what it knows instead: the log has "Brunel", "Brinell" and "Pranil" for her,
   all dropped as room chatter. These count only while she is the one on screen,
   and "Pranil" is left out because it is a real name people say. */
const BRAINELLE_NAME_RE = /\b(brainelle|brainel|brainell|brainele|brinell|brinelle|brunelle|brunel)\b/;
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
let lastSpokenLine = { text: "", ts: 0, endedTs: 0, duringRealtime: false, asked: false };
// When his last CHAT reply ended in a question (see shouldUseRealtimeDirectChat).
let lastChatQuestionAt = 0;
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

/* Where he is allowed to walk, as fractions of the screen rather than pixels,
   so the patch still means the same thing on a different display or after a
   monitor is plugged in.
     { mode: "screen" }                the whole thing, the default
     { mode: "area", x, y, w, h }      a box he keeps to
     { mode: "pin", x, y }             one spot, standing, no walking          */
const WALK_AREA_STORAGE_KEY = "braino-mac-walk-area-v1";
const DOCK_SPOT_NAMES = ["left", "top", "bottom", "right"];
let walkArea = { mode: "screen" };
/* The line he is currently walking along. He keeps to one until he decides to
   change level, and he never changes level mid stride. */
let roamFloorY = null;

function readWalkArea() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(WALK_AREA_STORAGE_KEY) || "null");
    if (!raw || typeof raw !== "object") return { mode: "screen" };
    if (raw.mode === "pin" && Number.isFinite(raw.x) && Number.isFinite(raw.y)) {
      return { mode: "pin", x: clamp(raw.x, 0, 1), y: clamp(raw.y, 0, 1), ...(DOCK_SPOT_NAMES.includes(raw.spot) ? { spot: raw.spot } : {}) };
    }
    if (raw.mode === "area" && [raw.x, raw.y, raw.w, raw.h].every(Number.isFinite) && raw.w > 0 && raw.h > 0) {
      return { mode: "area", x: clamp(raw.x, 0, 1), y: clamp(raw.y, 0, 1), w: clamp(raw.w, 0, 1), h: clamp(raw.h, 0, 1) };
    }
  } catch (_) {}
  return { mode: "screen" };
}

function saveWalkArea(next) {
  walkArea = next;
  try { window.localStorage.setItem(WALK_AREA_STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
  roamFloorY = null;
  nextTargetAt = 0;
  renderWalkAreaButton();
  logRenderer("walk.area", next);
}

/* Deliberately separate from getMoveBounds. That one clamps every setPosition
   there is, including drags, scripted walks and the moonwalk, and a patch is
   about where he chooses to wander, not a cage that fights everything else. */
function getRoamBounds() {
  const full = getMoveBounds();
  if (!walkArea || walkArea.mode === "screen") return full;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (walkArea.mode === "pin") {
    const x = clamp(walkArea.x * vw - W / 2, full.minX, full.maxX);
    const y = clamp(walkArea.y * vh - H / 2, full.minY, full.maxY);
    return { minX: x, maxX: x, minY: y, maxY: y };
  }
  const minX = clamp(walkArea.x * vw, full.minX, full.maxX);
  const maxX = clamp((walkArea.x + walkArea.w) * vw - W, minX, full.maxX);
  const minY = clamp(walkArea.y * vh, full.minY, full.maxY);
  const maxY = clamp((walkArea.y + walkArea.h) * vh - H, minY, full.maxY);
  return { minX, maxX, minY, maxY };
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

/* ── Picking his patch ────────────────────────────────────────────────────
   Drag a box and that is where he walks. Click once instead and he stands
   there. Escape leaves, the button leaves, and main takes the mouse back on
   its own if this ever stops answering. */
const walkPicker = document.getElementById("walk-picker");
const wpBox = walkPicker?.querySelector(".wp-box");
const wpSize = walkPicker?.querySelector(".wp-size");
const brainoWalkBtn = document.getElementById("braino-walk-area");
const brainoWalkBlurb = brainoWalkBtn?.querySelector(".braino-walk-blurb");

let walkPickerOpen = false;
let wpDrag = null;

function renderWalkAreaButton() {
  if (!brainoWalkBlurb) return;
  if (walkArea?.mode === "pin") brainoWalkBlurb.textContent = "Standing in one place";
  else if (walkArea?.mode === "area") {
    brainoWalkBlurb.textContent = `A patch, ${Math.round(walkArea.w * 100)}% by ${Math.round(walkArea.h * 100)}% of the screen`;
  } else brainoWalkBlurb.textContent = "Whole screen";
}

function openWalkPicker() {
  if (!walkPicker || walkPickerOpen) return;
  walkPickerOpen = true;
  setBrainoCustomizerOpen(false);
  wpDrag = null;
  if (wpBox) wpBox.hidden = true;
  walkPicker.classList.add("on");
  walkPicker.setAttribute("aria-hidden", "false");
  setMousePassthrough(false);
  void window.brainoMac.pickerMode?.({ on: true });
  logRenderer("walk.picker.open", {});
}

function closeWalkPicker(reason) {
  if (!walkPickerOpen) return;
  walkPickerOpen = false;
  wpDrag = null;
  walkPicker?.classList.remove("on");
  walkPicker?.setAttribute("aria-hidden", "true");
  if (wpBox) wpBox.hidden = true;
  setMousePassthrough(true);
  void window.brainoMac.pickerMode?.({ on: false });
  logRenderer("walk.picker.close", { reason: reason || "" });
}

function wpPaint(a, b) {
  if (!wpBox) return;
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  wpBox.hidden = false;
  wpBox.style.left = `${left}px`;
  wpBox.style.top = `${top}px`;
  wpBox.style.width = `${width}px`;
  wpBox.style.height = `${height}px`;
  if (wpSize) wpSize.textContent = `${Math.round(width)} by ${Math.round(height)}`;
  return { left, top, width, height };
}

walkPicker?.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".wp-hint")) return;
  event.preventDefault();
  wpDrag = { x: event.clientX, y: event.clientY };
  wpPaint(wpDrag, wpDrag);
});

walkPicker?.addEventListener("pointermove", (event) => {
  if (!wpDrag) return;
  wpPaint(wpDrag, { x: event.clientX, y: event.clientY });
});

walkPicker?.addEventListener("pointerup", (event) => {
  if (!wpDrag) return;
  const start = wpDrag;
  wpDrag = null;
  const width = Math.abs(event.clientX - start.x);
  const height = Math.abs(event.clientY - start.y);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /* Too small to be a box means it was a click, and a click means stand here.
     He needs somewhere to stand, not a patch he cannot turn around in. */
  if (width < 40 || height < 40) {
    saveWalkArea({ mode: "pin", x: clamp(event.clientX / vw, 0, 1), y: clamp(event.clientY / vh, 0, 1) });
    closeWalkPicker("pin");
    return;
  }
  saveWalkArea({
    mode: "area",
    x: clamp(Math.min(start.x, event.clientX) / vw, 0, 1),
    y: clamp(Math.min(start.y, event.clientY) / vh, 0, 1),
    w: clamp(width / vw, 0, 1),
    h: clamp(height / vh, 0, 1),
  });
  closeWalkPicker("area");
});

walkPicker?.querySelector(".wp-whole")?.addEventListener("click", () => {
  saveWalkArea({ mode: "screen" });
  closeWalkPicker("whole");
});
walkPicker?.querySelector(".wp-cancel")?.addEventListener("click", () => closeWalkPicker("cancel"));
brainoWalkBtn?.addEventListener("click", openWalkPicker);
/* Escape, bound globally in main because this window does not get keystrokes
   of its own. */
window.brainoMac.onPickerDismiss?.(() => closeWalkPicker("escape"));

walkArea = readWalkArea();
renderWalkAreaButton();

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

  const bounds = getRoamBounds();

  /* Standing in one place is a mode, not an absence of one. */
  if (walkArea?.mode === "pin") {
    targetX = bounds.minX;
    targetY = bounds.minY;
    roamFloorY = bounds.minY;
    nextTargetAt = now + 60000;
    return;
  }

  /* He used to get a random X AND a random Y and set off along the straight
     line between here and there, which meant walking diagonally through empty
     space. A character with legs moving on a slant reads as floating, not
     walking. So: he walks along a floor, and picking a new floor is something
     that happens between walks rather than during one. */
  const room = Math.max(0, bounds.maxY - bounds.minY);
  if (roamFloorY === null) roamFloorY = clamp(posY, bounds.minY, bounds.maxY);
  if (room > 8 && Math.random() < 0.28) roamFloorY = bounds.minY + Math.random() * room;
  roamFloorY = clamp(roamFloorY, bounds.minY, bounds.maxY);

  targetX = clamp(bounds.minX + Math.random() * (bounds.maxX - bounds.minX), bounds.minX, bounds.maxX);
  targetY = roamFloorY;
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
// Off by default: Braino never speaks first. "You can disturb me" turns it on.
let ambientEnabled = false;
let ambientBusy = false;
let ambientQuietUntil = 0; // "stop listening" means leave me be for a while

async function runAmbientGlance() {
  if (coworkEnabled) return; // cowork mode owns the watching; never double-fire
  if (ambientBusy || !ambientEnabled || herMode) return;
  if (skitRunning || skitJustCompleted) return; // skit isolation: no ambient during/after demo
  if (realtimeActive || realtimeConnecting || speaking || processing || voiceTurnInFlight) return;
  if (musicTheatricsReady) return;
  const now = Date.now();
  if (now - lastEngagedAt > AMBIENT_AWAKE_WINDOW_MS) return; // asleep
  if (now - lastAmbientAt < AMBIENT_CHECK_INTERVAL_MS) return;
  /* Quiet first. The clock only counted from his own last glance, so the
     moment "stop listening" ended a session he was due, and commented on the
     Cursor terminal nobody asked about. Now it waits a full interval after
     you last spoke to him, and half an hour after you told him to stop. */
  if (now - lastEngagedAt < AMBIENT_CHECK_INTERVAL_MS) return;
  if (now < ambientQuietUntil) return;
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
    // He speaks, then stays quiet. The mic never opens on its own: it once
    // did during a YouTube film and took the dialogue as commands.
    lastEngagedAt = Date.now();
    await speak(result.say);
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
/* One word. The chip used to cycle Thinking -> Hatching -> Deciding ->
   Calibrating every 1.65s, and none of those words meant anything: they were a
   clock. A two-second reply showed "Thinking", a slow one reached "Calibrating",
   and the list read as the thing slowing him down. Real states ("Needs
   approval", "Taking it on") still come from thinkingPresentation. */
const THINKING_PHASES = ["Thinking"];
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

/* Option+N recording in the thinking design (2026-10-16). Folded: the chip
   says "Recording 02:31" with the arrow. Open: what has been heard so far,
   newest last, and the sheet's own Stop. */
/* Teach Braino: the notch says he is watching, with a clock, until Done. */
let teachStartedAt = 0;
let teachClock = 0;
window.brainoMac?.onTeach?.((p) => {
  window.clearInterval(teachClock);
  teachStartedAt = p?.action === "start" ? Number(p.startedAt) || Date.now() : 0;
  if (teachStartedAt) teachClock = window.setInterval(() => updateNotchFace(), 1000);
  updateNotchFace();
});
// Tapping the notch while he watches is "Done": the app is out of the way.
notchFace?.addEventListener("click", (event) => {
  if (!teachStartedAt) return;
  event.stopPropagation();
  logRenderer("teach.done_tap", {});
  teachStartedAt = 0;
  nfSetThinking("Learning how you did it...");
  void window.brainoMac.teachStop?.({}).finally(() => nfSetThinking(""));
}, true);

let recKind = "";
let recLiveText = "";
let recHidAos = false;
function recOwnsThinking() {
  return Boolean(meetingRecording && notchFace?.classList.contains("nf-thinking") && !nfThinkingText && lastGlowStatus !== "thinking");
}
function renderRecordingCanvas() {
  if (!notchFace) return;
  const clock = fmtMeetingClock(Date.now() - (meetingStartedAt || Date.now()));
  const label = `Recording ${clock}`;
  const kindLabel = recKind === "lecture" ? "Lecture" : "Meeting";
  // Folded, the wing has room for the dot and the clock only.
  const folded = !notchFace.classList.contains("nf-think-open");
  if (nfThinkChipText) nfThinkChipText.textContent = folded ? `\u25cf ${clock}` : label;
  if (nfThinkingState) nfThinkingState.textContent = `${kindLabel} \u00b7 ${clock}`;
  if (nfThinkingCanvas) nfThinkingCanvas.dataset.state = "Recording";
  const sentences = String(recLiveText || "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (nfThinkingCurrent) nfThinkingCurrent.textContent = sentences.length
    ? sentences[sentences.length - 1]
    : "Listening. The words land here every half a minute.";
  if (nfFlowPrompt) nfFlowPrompt.textContent = `Recording your ${kindLabel.toLowerCase()}`;
  if (nfFlowResponse) nfFlowResponse.textContent = "Option+N or Stop when you are done.";
  notchFace.classList.remove("nf-think-waiting", "nf-think-failed", "nf-think-complete");
  if (nfThinkingTrail) {
    const opened = notchFace.classList.contains("nf-think-open");
    const steps = opened ? sentences.slice(-14, -1) : [];
    nfThinkingTrail.replaceChildren(...steps.map((step) => {
      const row = document.createElement("div");
      row.className = "nf-thinking-step";
      const text = document.createElement("span");
      text.textContent = step;
      row.appendChild(text);
      return row;
    }));
  }
  if (notchFace.classList.contains("nf-think-open")) window.requestAnimationFrame(syncOpenThinkingZone);
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
  nfSetZone({
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
    // Without subtitles (the AffectiveOS style): you only hear him. No sheets.
    && !notchFace.classList.contains("nf-aos")
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
  nfSetZone({
    expanded: true,
    width: NF_THINK_ISLAND_WIDTH,
    height: NF_THINK_ISLAND_HEIGHT,
  });
}

function nfSetThinkingOpen(open) {
  if (!notchFace) return;
  // The AffectiveOS notch never drops the list of thinking steps beneath it.
  if (open && notchFace.classList.contains("nf-aos")) open = false;
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

function settleQuietStandDown() {
  cancelPendingNotchThinking();
  window.clearTimeout(nfThinkingTimer);
  stopThinkingPhaseCycle();
  nfThinkingPinned = false;
  notchFace?.classList.remove("nf-thinking", "nf-think-open", "nf-think-hint", "nf-think-waiting", "nf-think-failed", "nf-think-complete", "nf-reply-thinking");
  if (nfReplyHold?.on && !realtimeActive && !realtimeConnecting) releaseReplyHold("quiet");
  if (!notchFace?.classList.contains("nf-answer-open")) nfCollapseNotchZone();
  updateNotchFace();
  logRenderer("notch.stand_down_settled", {});
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
  if (nfReplyHold.on) {
    nfFlowPromptText = String(prompt || nfFlowPromptText || "").trim();
    showReplyHoldText(nfHeardText ? `\u201c${nfHeardText}\u201d` : "Thinking");
    notchFace.classList.add("nf-reply-thinking");
    return true;
  }
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
    + (nfAnswerSources.length ? (nfAnswerArticle.querySelector(".nf-src")?.getBoundingClientRect().height || 0) + 10 : 0)
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
  nfSetZone({ expanded: true, width: NF_READING_SURFACE_WIDTH, height: measured });
}

/* Where a web answer came from (2026-10-02): the sites, as small chips that
 * stack in one after another under his answer, inside the notch. Taken from
 * the search that just ran (braino-mac:web-sources) and shown only on the
 * answer that follows it, within 20 seconds; any other answer has none. */
let nfWebSources = { hosts: [], links: [], at: 0 };
let nfAnswerSources = [];
window.brainoMac?.onWebSources?.((payload) => {
  const links = Array.isArray(payload.links) ? payload.links.filter((l) => /^https?:\/\//.test(String(l?.url || ""))).slice(0, 3) : [];
  nfWebSources = { hosts: Array.isArray(payload.hosts) ? payload.hosts.slice(0, 3) : [], links, at: Date.now() };
});
/* "Open the article" (2026-10-11): an answer that came from a search offers
   its articles, inside the sheet you are already reading. Tapped, they open
   in Chrome; nothing opens on its own. Only on the answer that follows the
   search, never carried to the next one. */
function nfSourceButton(label, urls, cls, delay) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.style.animationDelay = `${delay}ms`;
  b.textContent = label;
  ["pointerdown", "mousedown"].forEach((t) => b.addEventListener(t, (e) => e.stopPropagation()));
  b.addEventListener("click", (e) => {
    e.stopPropagation(); e.preventDefault();
    b.classList.add("is-opened");
    logRenderer("notch.sources.open", { count: urls.length });
    void window.brainoMac?.openSources?.(urls);
  });
  return b;
}
function renderNotchSources() {
  const links = nfAnswerSources.filter((x) => x && typeof x === "object" && x.url);
  notchFace?.querySelectorAll(".nf-src").forEach((el) => {
    if (!links.length) {
      // Older payloads: names only, as before.
      el.replaceChildren(...nfAnswerSources.filter((x) => typeof x === "string").map((host, i) => {
        const chip = document.createElement("span");
        chip.className = "nf-src-chip";
        chip.style.animationDelay = `${120 + i * 140}ms`;
        chip.textContent = host;
        return chip;
      }));
      return;
    }
    el.replaceChildren(
      nfSourceButton(links.length > 1 ? `Open ${links.length} articles` : "Open the article", links.map((l) => l.url), "nf-src-chip nf-src-open", 120),
      ...links.map((l, i) => nfSourceButton(l.host, [l.url], "nf-src-chip", 260 + i * 140)),
    );
  });
  notchFace?.classList.toggle("nf-has-src", nfAnswerSources.length > 0);
}

/* "Which Riya?" with the names to tap, inside the answer sheet (2026-10-03).
   Main sends the choices with the question; tapping one is exactly saying it.
   They live in the sheet's own body, so the sheet measures them with the
   words and holds one shape; they go when the question is answered. */
let nfChoice = null;
window.brainoMac?.onApproval?.((p) => {
  try {
    if (p?.cleared) {
      if (!nfChoice) return;
      nfChoice = null;
      if (notchFace?.classList.contains("nf-answer-open")) notchFace.querySelector(".nf-answer-choices")?.remove();
      return;
    }
    if (p?.surface !== "voice" || p?.kind !== "choose" || !Array.isArray(p.options)) return;
    nfChoice = { options: p.options.slice(0, 3), expiresAt: Number(p.expiresAt) || 0 };
  } catch (_) {}
});
/* Option+N: "Lecture or meeting?" in the notch, two taps and a cancel. The
   pick goes straight to the recorder, never through the voice pipeline. */
const REC_ASK_MS = 10000;
let recAskTimer = 0;
// "Without subtitles" hides every sheet, and this question has to be seen, so
// that style steps aside for the few seconds it is open.
let recAskHidAos = false;
function closeRecordAsk(why) {
  window.clearTimeout(recAskTimer);
  if (!nfChoice?.onPick) return;
  nfChoice = null;
  clearNotchAnswer({ invalidate: true });
  if (recAskHidAos) { recAskHidAos = false; window.setTimeout(() => notchFace?.classList.add("nf-aos"), 450); }
  logRenderer("rec.ask.closed", { why });
}
window.brainoMac?.onRecordAsk?.(() => {
  if (nfChoice?.onPick) return closeRecordAsk("pressed_again");
  const generation = ++speechGeneration;
  recAskHidAos = Boolean(notchFace?.classList.contains("nf-aos"));
  if (recAskHidAos) notchFace.classList.remove("nf-aos");
  nfChoice = {
    options: ["Lecture", "Meeting"],
    expiresAt: Date.now() + REC_ASK_MS,
    onPick: (name) => {
      const kind = /lecture/i.test(name) ? "lecture" : /meeting/i.test(name) ? "meeting" : "";
      closeRecordAsk(kind ? "picked" : "cancelled");
      if (!kind) return;
      logRenderer("rec.ask.picked", { kind });
      void window.brainoMac.recordStart?.({ kind }).then((result) => {
        if (!result?.ok && result?.say) void speak(result.say);
      }).catch((error) => logRenderer("rec.start.failed", { error: errorForLog(error) }));
    },
  };
  const shown = startNotchAnswer("Lecture or meeting?", generation, { rich: true, replace: true });
  if (shown) finishNotchAnswer(generation);
  logRenderer("rec.ask.shown", { shown: Boolean(shown) });
  recAskTimer = window.setTimeout(() => closeRecordAsk("timeout"), REC_ASK_MS);
});
window.brainoMac?.onRecordPhase?.((payload) => {
  const phase = String(payload?.phase || "");
  logRenderer("rec.phase", { phase, ok: payload?.ok });
  if (phase === "saving") nfSetThinking(payload?.kind === "lecture" ? "Writing your lecture notes..." : "Writing up the meeting...");
  else if (phase === "saved") nfSetThinking("");
});

function renderNotchChoices(root) {
  if (!root || !nfChoice?.options?.length) return;
  if (nfChoice.expiresAt && Date.now() > nfChoice.expiresAt) { nfChoice = null; return; }
  const row = document.createElement("div");
  row.className = "nf-answer-choices";
  nfChoice.options.forEach((name, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `nf-choice${i === 0 ? " is-first" : ""}`;
    b.textContent = name;
    const stop = (e) => { e.stopPropagation(); };
    b.addEventListener("pointerdown", stop);
    b.addEventListener("mousedown", stop);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      row.querySelectorAll(".nf-choice").forEach((x) => x.classList.toggle("is-picked", x === b));
      logRenderer("notch.choice.tap", { position: i });
      if (nfChoice?.onPick) { nfChoice.onPick(name); return; }
      void window.__brainoRunDelegate?.(name);
    });
    row.appendChild(b);
  });
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "nf-choice nf-choice-cancel";
  cancel.textContent = "Cancel";
  ["pointerdown", "mousedown"].forEach((t) => cancel.addEventListener(t, (e) => e.stopPropagation()));
  cancel.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (nfChoice?.onPick) { nfChoice.onPick("cancel"); return; }
    void window.__brainoRunDelegate?.("cancel");
  });
  row.appendChild(cancel);
  root.appendChild(row);
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
  renderNotchSources();

  nfAnswerBody.replaceChildren();
  let wordIndex = 0;
  notchAnswerBlocks(nfAnswerText).forEach((block) => {
    const el = document.createElement(block.type === "heading" ? "h2" : "p");
    el.className = `nf-answer-block nf-answer-${block.type}`;
    wordIndex = appendNotchAnswerWords(el, block.text, wordIndex);
    nfAnswerBody.appendChild(el);
  });
  renderNotchChoices(nfAnswerBody);

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
    + (nfAnswerSources.length ? (row.querySelector(".nf-src")?.getBoundingClientRect().height || 0) + 5 : 0)
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
  if (count !== nfQuietSpokenWords) {
    nfQuietSpokenWords = count;
    if (nfQuietState === "answer") renderQuietNotch();
  }
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
  nfAnswerForcedLong = Boolean(options.rich) || Boolean(nfChoice?.options?.length) || (sameAnswer && nfAnswerForcedLong);
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
  if (!sameAnswer) {
    nfAnswerSources = Date.now() - nfWebSources.at < 20000 ? (nfWebSources.links.length ? nfWebSources.links : nfWebSources.hosts) : [];
    nfWebSources = { hosts: [], links: [], at: 0 };
  }
  const fromHold = nfReplyHold.on;
  if (!sameAnswer || options.replace) {
    nfQuietSpokenWords = 0;
    nfAnswerCompletedWords = 0;
    nfAnswerLastScrollIndex = -1;
    // Held for a reply: keep the width it already had, so only the height moves.
    nfAnswerModeLocked = fromHold ? nfReplyHold.mode : "";
  }
  if (fromHold) { notchFace.classList.remove("nf-reply-thinking"); releaseReplyHold("answer"); }
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
  nfSetZone({
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
  /* Still talking? The sheet stays exactly as it is, his words in it, until
     the conversation ends. It folding away after every reply and opening
     again for the next one is the notch "moving" mid-conversation. */
  if ((realtimeActive || realtimeConnecting) && holdNotchAnswerForReply({ keepText: true })) {
    logRenderer("notch.answer.finish", { generation, kind: nfAnswerMode, held: true });
    return;
  }
  nfAnswerLingerTimer = window.setTimeout(() => clearNotchAnswer({ generation }), lingerMs);
  logRenderer("notch.answer.finish", { generation, kind: nfAnswerMode, lingerMs });
}

/* One shape for the whole back and forth (2026-10-11).
 *
 * Replying used to tear the notch down and rebuild it four or five times:
 * every new turn starts with stopSpeechOutput, which closed his answer sheet,
 * so the notch shrank to idle, grew into listening, then heard, then thinking,
 * then opened a brand new sheet. On a first message there is no sheet yet, so
 * it only ever grew, which is why that looked right.
 *
 * Now a turn that starts while his sheet is open HOLDS it: same width, same
 * place. Your words show inside it, then that he is thinking, then his answer
 * replaces them. Only the height eases to fit. If nothing comes (noise, a
 * cancelled turn) it folds away after a quiet moment. */
let nfReplyHold = { on: false, mode: "", since: 0, timer: 0 };
const NF_REPLY_HOLD_QUIET_MS = 9000;
function holdNotchAnswerForReply({ keepText = false } = {}) {
  if (nfReplyHold.on) return true;
  if (!notchFace?.classList.contains("nf-answer-open") || !nfAnswerMode) return false;
  window.clearTimeout(nfAnswerLingerTimer);
  window.cancelAnimationFrame(nfAnswerRaf);
  nfAnswerLingerTimer = 0;
  nfAnswerRaf = 0;
  nfReplyHold = { on: true, mode: nfAnswerMode, since: Date.now(), timer: 0 };
  notchFace.classList.add("nf-answer-reply");
  if (!keepText) showReplyHoldText("Listening");
  nfReplyHold.timer = window.setInterval(() => {
    const idle = !processing && !voiceTurnInFlight && !speaking && !realtimeResponseInFlight;
    // One shape for the whole conversation: it only goes when the session
    // does. Outside a session (typed, or a stray turn) the old quiet rule.
    const sessionLive = realtimeActive || realtimeConnecting;
    const quietMs = Date.now() - nfReplyHold.since;
    if (!sessionLive && idle && quietMs > 1500) releaseReplyHold("session_end");
    // The conversation has gone quiet: fold, do not sit there for minutes.
    else if (idle && !rtSpeechInProgress() && quietMs > NF_REPLY_HOLD_QUIET_MS) releaseReplyHold("quiet");
  }, 700);
  logRenderer("notch.reply_hold.start", { mode: nfAnswerMode });
  return true;
}
function showReplyHoldText(text) {
  if (!nfReplyHold.on) return;
  nfAnswerText = String(text || "").trim() || "Listening";
  renderNotchAnswer();
  nfAnswerWords.forEach((w) => w.classList.add("spoken"));
  nfReplyHold.since = Date.now();
}
function releaseReplyHold(why) {
  if (!nfReplyHold.on) return;
  window.clearInterval(nfReplyHold.timer);
  nfReplyHold = { on: false, mode: "", since: 0, timer: 0 };
  notchFace?.classList.remove("nf-answer-reply");
  logRenderer("notch.reply_hold.end", { why });
  if (why !== "answer") clearNotchAnswer({ invalidate: true });
}

function clearNotchAnswer(options = {}) {
  if (options.generation && options.generation !== nfAnswerGeneration) return;
  if (nfReplyHold.on) { window.clearInterval(nfReplyHold.timer); nfReplyHold = { on: false, mode: "", since: 0, timer: 0 }; notchFace?.classList.remove("nf-answer-reply"); }
  window.clearTimeout(nfAnswerLingerTimer);
  window.cancelAnimationFrame(nfAnswerRaf);
  nfAnswerLingerTimer = 0;
  nfAnswerRaf = 0;
  notchFace?.classList.add("nf-answer-exiting");
  notchFace?.classList.remove("nf-answer-open", "nf-answer-short", "nf-answer-long");
  if (!notchFace?.classList.contains("nf-think-open")) {
    nfCollapseNotchZone();
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
  nfSetZone({ expanded: true, width: NF_READING_SURFACE_WIDTH, height: nfAnswerPanelHeight });
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
      nfCollapseNotchZone();
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
    if (recOwnsThinking()) {
      if (!event.target.closest?.(".nf-pill") || event.target.closest?.("button, a, input, textarea, select, .nf-answer-surface")) return;
      nfSetThinkingOpen(!notchFace.classList.contains("nf-think-open"));
      renderRecordingCanvas();
      return;
    }
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
    if (recOwnsThinking()) {
      const opening = !notchFace.classList.contains("nf-think-open");
      logRenderer("rec.canvas.toggle", { opening });
      nfSetThinkingOpen(opening);
      renderRecordingCanvas();
      return;
    }
    const detailedText = coworkThinking || nfThinkingText || lastProcessingDetail;
    if (!detailedText) return;
    const opening = !notchFace.classList.contains("nf-think-open");
    nfSetThinkingOpen(opening);
    nfSetThinkingSticky(opening ? detailedText : coworkLabel || nfThinkingText);
  });
  /* Stop, from the open sheet: the same stop as "Braino, stop the task". */
  notchFace.querySelector(".nf-thinking-stop")?.addEventListener("click", async (event) => {
    event.stopPropagation();
    event.preventDefault();
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    logRenderer("thinking.stop_button", {});
    if (recOwnsThinking()) {
      logRenderer("rec.stop.tap", { from: "canvas" });
      try { await window.brainoMac.recordStop?.(); } finally { nfSetThinkingOpen(false); button.disabled = false; }
      return;
    }
    try {
      // Nothing left to stop: the sheet was just out of date, so it goes.
      if (!await stopTaskNow("thinking_button")) nfSetThinking("");
    } finally {
      nfSetThinkingOpen(false);
      button.disabled = false;
      updateNotchFace();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!notchFace.classList.contains("nf-think-open") || notchFace.contains(event.target)) return;
    nfSetThinkingOpen(false);
    nfSetThinkingSticky(coworkLabel);
    updateNotchFace();
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
/* Off. The same golden trace now means exactly one thing, that he heard his
   name, and a trace every 90 seconds made it look like he kept waking up. The
   function stays for anything that wants a one-off flourish. */
// window.setInterval(() => void runNotchShimmer(), 90 * 1000);

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
/* "Not sure" used to count as playing, always. With Automation refused for
   Spotify it is ALWAYS not sure, so every sentence without his name was
   binned as speaker sound, all evening (2026-09-26: "Ignored you, media is
   playing" with nothing playing). Now it counts only if something was
   actually confirmed playing in the last ten minutes. */
let mediaConfirmedPlayingAt = 0;
function mediaMaybePlaying() {
  return mediaAudioPlaying || (mediaAudioUncertain && Date.now() - mediaConfirmedPlayingAt < 10 * 60 * 1000);
}
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
// 30s, not 75s: at 75s the notch sat still for over a minute and looked dead
// (2026-10-16). Same audio, about 2.5x the transcription calls.
const MEETING_SEGMENT_MS = 30000;
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
    nfSetZone({ expanded: true, width: NF_READING_SURFACE_WIDTH, height });
  } else if (!nfAnswerMode && !notchFace?.classList.contains("nf-think-open")) {
    nfCollapseNotchZone();
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

nfMeetingStopBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  event.preventDefault();
  logRenderer("rec.stop.tap", {});
  void window.brainoMac.recordStop?.();
});
["pointerdown", "mousedown"].forEach((t) => nfMeetingStopBtn?.addEventListener(t, (e) => e.stopPropagation()));

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
    // Folded by default: the thinking chip says it is recording, the arrow
    // opens the transcript. The old meeting sheet no longer drops on its own.
    recKind = payload.kind === "lecture" ? "lecture" : "meeting";
    recLiveText = "";
    notchFace?.classList.add("nf-rec");
    // Without subtitles hides the chip and blocks the sheet; a recording has
    // to be visible, so that style steps aside until it ends.
    recHidAos = Boolean(notchFace?.classList.contains("nf-aos"));
    if (recHidAos) notchFace.classList.remove("nf-aos");
    window.clearInterval(meetingClockTimer);
    meetingClockTimer = window.setInterval(() => {
      const elapsed = fmtMeetingClock(Date.now() - meetingStartedAt);
      if (nfMeetingClockEl) nfMeetingClockEl.textContent = elapsed;
      updateNotchFace(); // refreshes the notch REC clock too
    }, 1000);
  } else if (action === "transcript") {
    recLiveText = String(payload.text || "");
    updateNotchFace();
  } else if (action === "stop") {
    meetingRecording = false;
    recLiveText = "";
    notchFace?.classList.remove("nf-rec");
    nfSetThinkingOpen(false);
    if (recHidAos) { recHidAos = false; window.setTimeout(() => notchFace?.classList.add("nf-aos"), 450); }
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
const nfStepsEl = document.querySelector("#notch-face .nf-steps");
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
    nfSetZone({ expanded: true, width: NF_COMPACT_SURFACE_WIDTH, height: normalizedHeight });
  } else if (!nfAnswerMode && !nfMeetingOpen && !notchFace?.classList.contains("nf-think-open")) {
    // The meeting surface is up for the length of a meeting and updateNotchFace runs every
    // second inside one, so without this guard the click zone was torn down a second after
    // it was claimed and the Stop button stopped responding.
    nfCollapseNotchZone();
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
/* Typing: the capsule is as tall as what you have typed, a line at a time,
   from one line up to the same ceiling every surface has. */
const NF_TYPE_MIN_HEIGHT = 108;
function measureTypingHeight() {
  const field = notchFace?.querySelector(".nf-type-field");
  if (!field || !nfInlineCaptionEl) return NF_TYPE_MIN_HEIGHT;
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
  const style = window.getComputedStyle(nfInlineCaptionEl);
  const fieldStyle = window.getComputedStyle(field);
  const content = (Number.parseFloat(style.paddingTop) || 0)
    + (Number.parseFloat(fieldStyle.marginTop) || 0)
    + field.scrollHeight
    + (Number.parseFloat(style.paddingBottom) || 0) + 4;
  return Math.round(Math.max(NF_TYPE_MIN_HEIGHT, Math.min(NF_INLINE_MAX_HEIGHT, content)));
}
function refitTyping() {
  if (!typingOpen || !notchFace) return;
  const height = measureTypingHeight();
  notchFace.style.setProperty("--nf-inline-height", `${height}px`);
  nfSetZone({ expanded: true, width: NF_READING_SURFACE_WIDTH, height: height + 16 });
}

function measureInlineCaptionHeight() {
  if (typingOpen) return measureTypingHeight();
  if (!nfInlineCaptionEl || !nfInlineCaptionTextEl) return NF_INLINE_MIN_HEIGHT;
  const style = window.getComputedStyle(nfInlineCaptionEl);
  const textStyle = window.getComputedStyle(nfInlineCaptionTextEl);
  const header = nfInlineCaptionEl.querySelector("header");
  const content = (
    (Number.parseFloat(style.paddingTop) || 0)
    + (header?.getBoundingClientRect().height || 0)
    + (Number.parseFloat(textStyle.marginTop) || 0)
    + (nfInlineCaptionTextEl.scrollHeight || 0)
    + (nfStepsEl && nfStepsEl.offsetHeight ? nfStepsEl.offsetHeight + (Number.parseFloat(window.getComputedStyle(nfStepsEl).marginTop) || 0) : 0)
    + (Number.parseFloat(style.paddingBottom) || 0)
    + 2
  );
  return Math.round(Math.max(NF_INLINE_MIN_HEIGHT, Math.min(NF_INLINE_MAX_HEIGHT, content)));
}

/* The steps of a job, inside the notch (2026-10-01).
 *
 * The same rows the website draws: "Opened WhatsApp ✓ · Found John ✓ ·
 * Sent". main.cjs already sends every step and its result on
 * braino-mac:task-trail; the overlay simply never listened (task-trail.js
 * hung a card UNDER the notch and was unloaded for it). Here they live inside
 * the "You said · THINKING" box. Three rows at most, newest last, and the
 * space for three is taken once, on the first step, so the island grows one
 * time per job and then holds its shape. */
const NF_STEPS_SHOWN = 3;
let nfSteps = [];
let nfStepsClearTimer = 0;
function renderNfSteps() {
  if (!nfStepsEl) return;
  const shown = nfSteps.slice(-NF_STEPS_SHOWN);
  nfStepsEl.replaceChildren(...shown.map((step) => {
    const row = document.createElement("li");
    row.className = `nf-step is-${step.state}`;
    const tick = document.createElement("span");
    tick.className = "nf-step-tick";
    tick.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "nf-step-text";
    text.textContent = step.label;
    row.append(tick, text);
    return row;
  }));
  notchFace?.classList.toggle("nf-has-steps", nfSteps.length > 0);
  refitOpenInlineCaption();
}
window.brainoMac?.onTaskTrail?.((payload) => {
  const kind = payload?.kind;
  if (kind === "start") {
    window.clearTimeout(nfStepsClearTimer);
    nfSteps = [];
  } else if (kind === "step" && payload.label) {
    const last = nfSteps[nfSteps.length - 1];
    if (last && last.state === "run") last.state = "ok";
    nfSteps.push({ label: String(payload.label).slice(0, 80), state: "run" });
    if (nfSteps.length > 24) nfSteps.shift();
  } else if (kind === "result") {
    const last = nfSteps[nfSteps.length - 1];
    if (last && last.state === "run") last.state = payload.ok === false ? "fail" : "ok";
  } else if (kind === "end") {
    nfSteps.forEach((step) => { if (step.state === "run") step.state = payload.ok === false ? "fail" : "ok"; });
    /* Cleared once the box has closed, never while you are looking at it. */
    window.clearTimeout(nfStepsClearTimer);
    nfStepsClearTimer = window.setTimeout(function clearWhenClosed() {
      if (notchFace?.classList.contains("nf-inline-working")) { nfStepsClearTimer = window.setTimeout(clearWhenClosed, 1500); return; }
      nfSteps = [];
      renderNfSteps();
    }, 1500);
  } else {
    return;
  }
  renderNfSteps();
});

function refitOpenInlineCaption() {
  if (!notchFace?.classList.contains("nf-inline-open")) return;
  notchFace.style.setProperty("--nf-inline-height", `${measureInlineCaptionHeight()}px`);
}

function syncInlineVoiceSurface(mode = "", text = "", options = {}) {
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
  /* One box, and the modes it carries, in order:
       starting  Voice     · STARTING (shimmer)   "Live in 3"
       ready     Voice     · ● LIVE                "You can speak now"
       heard     You said  · Live                  your words
       thinking  You said  · THINKING (shimmer)   your words
     The phase lives in this box's own chip. The thinking canvas underneath is
     hidden while the box is open (see .nf-inline-open in the CSS), so the phase
     is never painted twice. */
  const voiceMode = active && (mode === "starting" || mode === "ready");

  const spoken = active && !typingOpen && (mode === "heard" || mode === "thinking");
  const liveWords = spoken && mode === "heard" && nfHeardLive;
  /* Let long speech breathe: the wide sheet, larger line spacing, and the
     oldest line fading out at the top instead of a cramped block. */
  if (!active) nfInlineLongLatched = false;
  else if (spoken && value.length > NF_INLINE_LONG_CHARS) nfInlineLongLatched = true;
  const wide = active && nfInlineLongLatched;

  if (active) cancelNotchSurfaceExit();
  else if (wasActive) beginNotchSurfaceExit();
  notchFace.classList.toggle("nf-inline-open", active);
  notchFace.classList.remove("nf-inline-thinking");
  notchFace.classList.toggle("nf-inline-long", wide);
  notchFace.classList.toggle("nf-inline-trimmed", spoken && Boolean(options.trimmed));
  notchFace.classList.toggle("nf-inline-hera", liveWords);
  notchFace.classList.toggle("nf-inline-working", active && !typingOpen && (mode === "thinking" || mode === "starting"));
  notchFace.classList.toggle("nf-voice-starting", active && !typingOpen && mode === "starting");
  notchFace.classList.toggle("nf-voice-ready", active && !typingOpen && mode === "ready");
  if (nfInlineCaptionLabelEl) {
    const spokenLabel = liveWords ? "You're saying" : "You said";
    nfInlineCaptionLabelEl.textContent = typingOpen ? "You typed" : (voiceMode ? "Voice" : spokenLabel);
  }
  if (nfInlineCaptionStateEl) {
    nfInlineCaptionStateEl.textContent = typingOpen ? "Typing" : String(options.state || "Live");
  }
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
  const zoneWidth = wide ? NF_READING_SURFACE_WIDTH : NF_COMPACT_SURFACE_WIDTH;
  const key = active ? `${mode}:${height}:${zoneWidth}` : "closed";

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
    nfSetZone({ expanded: true, width: zoneWidth, height });
  } else if (
    !nfAnswerMode
    && !notchFace.classList.contains("nf-answer-open")
    && !notchFace.classList.contains("nf-think-open")
    && !dictationMode
    && !dictationStopping
  ) {
    nfCollapseNotchZone();
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
  if (nfReplyHold.on && nfHeardText && nfHeardText !== previous) showReplyHoldText(`\u201c${nfHeardText}\u201d`);
  nfHeardLive = Boolean(options.live) && Boolean(nfHeardText);
  if (nfHeardText) {
    if (nfHeardText !== previous) nfHeardShownAt = Date.now();
    // Your words take over from "You can speak now" the moment they arrive.
    if (voiceStart.phase === "ready") voiceStartEnd();
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
    /* Not while he is still working on it. The clear used to run on a timer
       that knew nothing about the job, so a twenty-second task lost the thing
       you asked for at second four and the notch showed a chip with nothing to
       say what it was for. */
    nfCaptionClearTimer = window.setTimeout(function clearUnlessWorking() {
      /* Held while he works, but not forever: a long job, or one whose end
         never arrives, left your last sentence frozen over the top of the
         screen. After NF_HEARD_MAX_WORKING_MS the small thinking chip is
         enough to say he is on it. */
      const heldFor = nfHeardShownAt ? Date.now() - nfHeardShownAt : 0;
      if ((voiceTurnInFlight || processing) && heldFor < NF_HEARD_MAX_WORKING_MS) {
        nfCaptionClearTimer = window.setTimeout(clearUnlessWorking, 1200);
        return;
      }
      nfClearCaptions();
    }, duration);
  }
  updateNotchFace();
}

const NF_HEARD_MAX_WORKING_MS = 15000;

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
/* Is a real job running right now, as opposed to a caption that happens to be
 * on screen? Set only from what main.cjs says, because the renderer cannot see
 * a model call and would otherwise be guessing from how long the words have
 * been up. */
let hilTaskRunning = false;
/* The backstop for the case main never says the job ended: a crash, a reload, a
 * turn that threw somewhere unusual. Long enough that no honest turn reaches it,
 * short enough that a stuck notch is a minute of wrong rather than forever. */
const NF_THINKING_STUCK_MS = 60000;
// nfThinkingOpenTimer is declared with the reveal-delay helpers above, next to
// NF_THINKING_REVEAL_MS, so the timer and the thing that sets it live together.
// nfSetThinking still clears it below: showing live thinking text means the
// pending reveal has been overtaken and must not fire later.

function nfThinkingShown() { return Boolean(nfThinkingText); }
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
    /* Six seconds was right when a turn took under two.
     *
     * Astra takes five to ten, so the timer fired in the GAP between turns: the
     * sheet collapsed, the next turn reopened it, and a running job looked like
     * it kept stopping and starting. The auto-clear is for a caption nobody
     * cleaned up, not for a job that is genuinely still going, so while one is
     * running it stretches to the stuck-backstop instead of firing on time. */
    nfThinkingTimer = window.setTimeout(() => {
      nfThinkingText = "";
      if (!coworkLabel) {
        stopThinkingPhaseCycle();
        notchFace?.classList.remove(
          "nf-thinking", "nf-think-open", "nf-think-hint", "captioning",
          "nf-think-waiting", "nf-think-failed", "nf-think-complete",
        );
        nfCollapseNotchZone();
        // Clearing the text is not enough on its own: updateNotchFace below
        // would rebuild the sheet from a stale "thinking" status. Settle that
        // too, but only when nothing is actually running (the helper checks).
        settleStaleThinkingStatus("nf_thinking.auto_clear");
      }
      updateNotchFace();
    }, hilTaskRunning ? NF_THINKING_STUCK_MS : 6000);
  } else if (!coworkLabel) {
    stopThinkingPhaseCycle();
    notchFace?.classList.remove(
      "nf-thinking", "nf-think-open", "nf-think-hint", "captioning",
      "nf-think-waiting", "nf-think-failed", "nf-think-complete",
    );
    if (!nfAnswerMode) nfCollapseNotchZone();
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

/* ── The quiet notch ─────────────────────────────────────────────────────
 *
 * Every sheet that dropped out of the notch sat over the tabs of whatever was
 * behind it, and took their clicks. The quiet notch keeps his status in the
 * menu bar band, as two ears either side of the camera housing, and gives your
 * sentence and his answer one line under it that leaves on its own. Only the
 * band and real buttons take a click; the line lets clicks through.
 *
 * It is a layer, not a rewrite. The full surfaces still run underneath,
 * hidden, and come back whenever you ask for them: the thinking steps (click
 * the band), the whole of a long answer (More), the panel, dictation,
 * meetings and music.
 *
 * OFF by default since the evening it shipped: on the real screen the band
 * read as too small, and the notch went back to the full surfaces. On with
 * localStorage brainoQuietNotch = "1". With it off, every path below is inert
 * (no state, zone requests pass straight through), so the notch is exactly
 * what it was before. Stealth does not depend on it.
 *
 * The ears are 80pt each because the camera housing hides the middle of the
 * band: the mock had 40pt ears, and "Listening" would have been cut in half. */
function quietNotchOn() { return readBoolSetting(QUIET_NOTCH_KEY, false); }
function stealthOn() { return readBoolSetting(STEALTH_KEY, false); }

function nfNotchHeight() {
  return parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
}

function nfNotchWidth() {
  return parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-w")) || 190;
}

function nfQuietWidth(state = nfQuietState) {
  const band = Math.round(nfNotchWidth() + NF_QUIET_EAR_W * 2);
  return state === "heard" || state === "answer" ? Math.max(band, NF_QUIET_LINE_W) : band;
}

/* Every zone request goes through here, so the quiet notch can keep the
   clickable area to its band while a bigger surface is open underneath. */
function nfSetZone(payload) {
  nfLastZoneRequest = payload || { expanded: false };
  nfPushZone();
}

function nfPushZone() {
  if (nfQuietState) {
    window.brainoMac.setNotchZone?.({ expanded: true, width: nfQuietWidth() + 16, height: nfNotchHeight() + 6 });
    return;
  }
  window.brainoMac.setNotchZone?.(nfLastZoneRequest);
}

/* The zone is re-stated twice a second, and main forgets an expanded one that
   stops being re-stated.
 *
 * It has to be, because of what a zone does: while the cursor is inside it the
 * whole overlay becomes clickable, and the overlay is the size of the screen.
 * So a surface that opened, asked for 680 by 260, and then closed without
 * saying so left a dead rectangle near the top of the display: clicks on the
 * page underneath went to Braino, and a double click opened his menu. There is
 * no event that fires for "the surface you forgot about", so the truth is sent
 * again and again instead. */
window.setInterval(() => {
  try { nfPushZone(); } catch (_) {}
}, 500);

/* The surfaces that stay as they are: you opened them, or they are a mode of
   their own. */
const NF_QUIET_STANDS_DOWN = [
  "expanded", "nf-music-open", "nf-meeting-open", "nf-cmds-open", "alarming", "live",
  "nf-iomi-booting", "nf-iomi-expanded", "nf-auth", "nf-auth-err", "nf-greet", "dropping",
];

/* Without subtitles (the AffectiveOS style) IS the quiet notch, minus the
   two states that show words: you hear him, you never read him. */
function noSubtitles() { return Boolean(notchFace?.classList.contains("nf-aos")); }
function quietStateFor(c) {
  if (!c || !c.visible || !(quietNotchOn() || noSubtitles()) || herMode || dictationMode) return "";
  if (c.yapOwnsNotch || c.thinkingOpen || nfPanelOpen || typingOpen) return "";
  if (NF_QUIET_STANDS_DOWN.some((name) => notchFace.classList.contains(name))) return "";
  if (c.answerOwnsNotch && !noSubtitles()) return nfQuietAnswerOpenGen === nfAnswerGeneration ? "" : "answer";
  if (!noSubtitles() && (c.inlineMode === "heard" || c.inlineMode === "thinking") && nfHeardText
    && Date.now() - nfHeardShownAt < NF_QUIET_HEARD_MS) return "heard";
  if (c.processingActive) return "work";
  if (speaking) return "speak";
  if (c.inlineMode === "starting") return "starting";
  if (c.sessionEngaged) return c.namedAsleep ? "asleep" : "listen";
  return "";
}

/* Measured, not counted: a character budget let the newest words run off the
   right edge, which is the one end of a caption that has to stay. */
function nfTextWidth(text, font) {
  nfQuietMeasure = nfQuietMeasure || document.createElement("canvas").getContext("2d");
  nfQuietMeasure.font = font;
  return nfQuietMeasure.measureText(text).width;
}

/* Trimmed from the front a word at a time, so the newest words are shown. */
function nfFitFront(text, maxWidth, font) {
  let value = String(text || "").replace(/\s+/g, " ").trim();
  let trimmed = false;
  while (value && nfTextWidth(value, font) > maxWidth) {
    const cut = value.indexOf(" ");
    if (cut < 0) break;
    value = value.slice(cut + 1);
    trimmed = true;
  }
  return { text: value, trimmed };
}

/* The room the line has: the island less its padding, and less the cross and
   More when they are showing. */
function nfQuietLineRoom(state, long) {
  const buttons = state === "answer" ? 28 + (long ? 54 : 0) : 0;
  return nfQuietWidth(state) - 32 - buttons;
}

/* One line of his answer: all of it when it fits, otherwise the words he has
   said so far, like a caption, with More for the rest. */
function quietAnswerLine(font) {
  const words = String(nfAnswerText || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const full = words.join(" ");
  const long = nfTextWidth(full, font) > nfQuietLineRoom("answer", false);
  if (!long) return { text: full, trimmed: false, long };
  const said = words.slice(0, Math.max(1, nfQuietSpokenWords, nfAnswerCompletedWords)).join(" ");
  return { ...nfFitFront(said, nfQuietLineRoom("answer", true), font), long };
}

function nfQuietElements() {
  if (nfQuietEls) return nfQuietEls;
  const root = notchFace?.querySelector(".nf-q");
  if (!root) return null;
  nfQuietEls = {
    root,
    band: root.querySelector(".nf-q-band"),
    left: root.querySelector(".nf-q-left"),
    right: root.querySelector(".nf-q-right"),
    text: root.querySelector(".nf-q-text"),
    more: root.querySelector(".nf-q-more"),
    close: root.querySelector(".nf-q-x"),
  };
  /* Working: the band is the way into his steps, with the Stop button. */
  nfQuietEls.band?.addEventListener("click", (event) => {
    if (nfQuietState !== "work") return;
    event.stopPropagation();
    const detailedText = coworkThinking || nfThinkingText || lastProcessingDetail;
    if (!detailedText) return;
    logRenderer("notch.quiet_steps", {});
    nfSetThinkingOpen(true);
    nfSetThinkingSticky(detailedText);
    updateNotchFace();
  });
  nfQuietEls.more?.addEventListener("click", (event) => {
    event.stopPropagation();
    nfQuietAnswerOpenGen = nfAnswerGeneration;
    logRenderer("notch.quiet_more", {});
    updateNotchFace();
  });
  nfQuietEls.close?.addEventListener("click", (event) => {
    event.stopPropagation();
    logRenderer("notch.quiet_dismiss", {});
    clearNotchAnswer();
  });
  return nfQuietEls;
}

function nfSetQuietSide(el, html) {
  if (el && el.innerHTML !== html) el.innerHTML = html;
}

function renderQuietNotch(ctx) {
  if (ctx) nfQuietLastCtx = ctx;
  if (!notchFace) return;
  try {
    const els = nfQuietElements();
    if (!els) return;
    const state = quietStateFor(nfQuietLastCtx);
    const changed = state !== nfQuietState;
    nfQuietState = state;
    notchFace.classList.toggle("nf-quiet-on", Boolean(state));
    for (const name of NF_QUIET_STATES) notchFace.classList.toggle(`nfq-${name}`, state === name);
    notchFace.classList.toggle("nfq-line", state === "heard" || state === "answer");
    notchFace.style.setProperty("--nf-q-w", `${nfQuietWidth(state)}px`);

    let left = "";
    let right = "";
    let line = { text: "", trimmed: false, long: false };
    if (state === "listen" || state === "asleep") {
      // Coral: the next thing you say is his. Grey: say his name first.
      left = "Listening";
      right = `<i class="nf-q-dot${state === "asleep" ? " idle" : ""}"></i>`;
    } else if (state === "starting") {
      left = "Connecting";
      right = '<i class="nf-q-dot idle"></i>';
    } else if (state === "work") {
      left = '<i class="nf-q-think"></i>';
      right = noSubtitles() ? "Thinking" : hilThinkingHistory.length ? `<span class="nf-q-step">Step ${hilThinkingHistory.length}</span>` : "";
    } else if (state === "speak") {
      left = '<i class="nf-q-speak"></i>';
      right = noSubtitles() ? "Speaking" : activeWakeName();
    } else if (state === "heard") {
      left = "You said";
      right = '<i class="nf-q-dot"></i>';
      const font = getComputedStyle(els.text).font;
      line = { ...nfFitFront(nfHeardText, nfQuietLineRoom(state, false), font), long: false };
    } else if (state === "answer") {
      left = speaking ? '<i class="nf-q-speak"></i>' : "";
      right = activeWakeName();
      line = quietAnswerLine(getComputedStyle(els.text).font);
    }
    nfSetQuietSide(els.left, left);
    nfSetQuietSide(els.right, right);
    if (els.text && els.text.textContent !== line.text) els.text.textContent = line.text;
    els.text?.classList.toggle("trimmed", line.trimmed);
    notchFace.classList.toggle("nfq-long", Boolean(line.long));
    if (changed) nfPushZone();

    /* "You said" stays two seconds, then gives the band back. */
    window.clearTimeout(nfQuietTimer);
    if (state === "heard") {
      const remaining = NF_QUIET_HEARD_MS - (Date.now() - nfHeardShownAt);
      nfQuietTimer = window.setTimeout(() => updateNotchFace(), Math.max(40, remaining + 30));
    }
  } catch {
    /* A notch that cannot draw its quiet layer falls back to the full one. */
  }
}

/* Stealth: everything he draws in the notch at 1%, back when you hover. */
function applyStealth() {
  notchFace?.classList.toggle("nf-stealth", stealthOn());
}

function setStealth(on, source) {
  writeBoolSetting(STEALTH_KEY, on);
  applyStealth();
  logRenderer("notch.stealth", { on, source });
  renderBrainoPanel();
}

/* ── Hide him ─────────────────────────────────────────────────────────────
   "hidden": gone (with `until` for "for an hour"). "stealth": faint, full on
   hover. Either way he still hears and answers through the notch. Back with
   "Braino, come back", Command+Shift+B, or a click on the notch. */
const MASCOT_HIDE_KEY = "brainoMascotHide";
let mascotHide = (() => { try { return JSON.parse(localStorage.getItem(MASCOT_HIDE_KEY) || "null"); } catch (_) { return null; } })();
function mascotHidden() { return Boolean(mascotHide && (mascotHide.mode === "hidden" || mascotHide.mode === "stealth")); }
function applyMascotHide() {
  if (mascotHide?.until && Date.now() >= mascotHide.until) mascotHide = null;
  document.body.classList.toggle("mascot-hidden", mascotHide?.mode === "hidden");
  document.body.classList.toggle("mascot-stealth", mascotHide?.mode === "stealth");
  if (!mascotHide) document.body.classList.remove("mascot-peek");
  document.querySelectorAll("#braino-hide-row [data-hide]").forEach((b) => {
    const on = mascotHide && (b.dataset.hide === "stealth" ? mascotHide.mode === "stealth" : b.dataset.hide === "hour" ? Boolean(mascotHide.until) : mascotHide.mode === "hidden" && !mascotHide.until);
    b.classList.toggle("active", Boolean(on));
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}
function setMascotHide(mode, source) {
  mascotHide = mode === "hour" ? { mode: "hidden", until: Date.now() + 60 * 60 * 1000 }
    : mode === "hidden" || mode === "stealth" ? { mode } : null;
  try { mascotHide ? localStorage.setItem(MASCOT_HIDE_KEY, JSON.stringify(mascotHide)) : localStorage.removeItem(MASCOT_HIDE_KEY); } catch (_) {}
  if (mascotHide && brainoCustomizerOpen) setBrainoCustomizerOpen(false);
  applyMascotHide();
  logRenderer("mascot.hide", { mode: mode || "shown", source });
}
setInterval(() => { if (mascotHide?.until && Date.now() >= mascotHide.until) setMascotHide(null, "timer"); }, 15000);

/* "Hide yourself", "go stealth" is the notch's; "come back" while hidden. */
function parseMascotHidePhrase(text) {
  const rest = String(text || "").trim().replace(/[.!?]+$/g, "").replace(/,/g, " ")
    .replace(STEALTH_LEAD, "").replace(/\s+please$/i, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!rest || rest.split(" ").length > 6) return "";
  if (/^(?:hide|hide yourself|go hide|disappear|vanish|get off (?:my|the) screen|go away for (?:a bit|now|a while)|hide (?:for )?(?:a|an|one) hour)$/.test(rest)) return /hour/.test(rest) ? "hour" : "hidden";
  if (mascotHidden() && /^(?:come back|show yourself|show up|unhide|be visible|i want you back|where are you)$/.test(rest)) return "show";
  return "";
}
async function handleMascotHidePhrase(which, transcript, source) {
  if (transcript) nfSetHeard(transcript, { durationMs: 1200 });
  setMascotHide(which === "show" ? null : which, source);
  await speak(which === "show" ? "I'm back." : which === "hour" ? "Gone for an hour. I'm still listening." : "Hidden. Say come back when you want me.");
}

const STEALTH_LEAD = /^(?:(?:hey|ok|okay)\s+)?(?:brain(?:o|elle)\b)?[\s,.!]*(?:(?:can|could|will|would)\s+you\s+)?(?:please\s+)?/i;

/* "Braino, go stealth" / "stealth mode off". "Come back" only means this while
   he is hidden; otherwise it belongs to the walker. */
function parseStealthPhrase(text) {
  const rest = String(text || "").trim().replace(/[.!?]+$/g, "").replace(/,/g, " ")
    .replace(STEALTH_LEAD, "").replace(/\s+please$/i, "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!rest || rest.split(" ").length > 5) return "";
  if (/^(?:(?:go|turn on|switch on|enable|start|enter|use)\s+)?(?:the\s+)?stealth(?:\s+mode)?(?:\s+on)?$/.test(rest)) return "on";
  if (/^(?:(?:turn|switch)\s+off|disable|stop|exit|leave|end)\s+(?:the\s+)?stealth(?:\s+mode)?$|^stealth(?:\s+mode)?\s+off$/.test(rest)) return "off";
  if (stealthOn() && /^(?:come back|show yourself|unhide|be visible)$/.test(rest)) return "off";
  return "";
}

async function handleStealthPhrase(which, transcript, source) {
  if (transcript) nfSetHeard(transcript, { durationMs: 1200 });
  setStealth(which === "on", source);
  await speak(which === "on" ? "Stealth on. Hover the notch to see me." : "I'm back.");
}

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
  /* While a reply is held open, thinking shows INSIDE that sheet
     (nf-reply-thinking). Adding nf-thinking on top shrank the black body to
     the 84px chip and left the answer's words hanging below it. */
  const processingActive = !voiceOwnsNotch
    && !nfReplyHold.on
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
  } else if (meetingRecording && !answerOwnsNotch) {
    // Recording wears the thinking design: "Recording 02:31" and the arrow,
    // the live transcript and Stop one tap away.
    notchFace.classList.add("nf-thinking");
    stopThinkingPhaseCycle();
    renderRecordingCanvas();
  } else if (!coworkLabel) {
    stopThinkingPhaseCycle();
    notchFace.classList.remove(
      "nf-thinking", "nf-think-open", "nf-think-hint",
      "nf-think-waiting", "nf-think-failed", "nf-think-complete",
    );
  }
  /* Asleep: he hears the room and is choosing not to answer it. Either the
     on-device wake word is waiting with no session open, or a session is open
     in named mode with its five-second window shut. It has to look different
     from listening, or there is nothing to see when his name wakes him — which
     is exactly why the mode looked broken: the coral listening pulse ran the
     whole time he was ignoring you. */
  /* Not gated on walkerHome: after boot he walks out onto the screen, and the
     notch is still where you look to see whether he is listening. */
  const namedAsleep = visible && !herMode && !dictationMode
    && !processingActive && !speaking && !voiceTurnInFlight && !answerOwnsNotch
    && ((realtimeActive && namedAsleepForNotch()) || (!sessionEngaged && wakeWordArmed));
  namedAsleepPainted = namedAsleep;
  // Conversation owns one central black subtitle box while a transcript is
  // live. The old left/right wings are explicitly cleared and never receive
  // ordinary voice or thinking copy. While he is asleep only a sentence with
  // his name in it may open the box: the room is heard and dropped, and must
  // not flash up in the notch on its way to being ignored.
  const conversationOwnsNotch = visible
    && !dictationMode
    && Boolean(nfHeardText)
    && (sessionEngaged || ["listening", "hearing", "captured"].includes(lastGlowStatus))
    && (!namedAsleep || voiceExplicitlyAddressesBraino(nfHeardText));
  const thinkingOpen = notchFace.classList.contains("nf-think-open");
  /* Your sentence is never taken away while he works on it.
   *
   * 1aaedb2 closed this box 1.1s into every job and handed it to the centred
   * chip, so a command vanished the moment he started on it. main kept it, with
   * the phase in the box's own chip, and that is the behaviour restored here.
   * The doubling that change was fixing (the phase in the chip AND in the
   * thinking canvas) is prevented in the CSS, which hides the canvas while this
   * box is open. With no sentence to show, the centred chip still takes over.
   *
   * The character budget is NF_INLINE_MAX_CHARS and trims from the FRONT, so the
   * newest words you are speaking are always the ones on screen. */
  /* Trimmed from the FRONT so the newest words stay on screen, at a word
     boundary, and without the "..." — the top line fades out instead. */
  let heardForInline = String(nfHeardText || "").trim();
  const heardTrimmed = heardForInline.length > NF_INLINE_MAX_CHARS;
  if (heardTrimmed) {
    const tail = heardForInline.slice(-NF_INLINE_MAX_CHARS);
    const cut = tail.indexOf(" ");
    heardForInline = (cut > 0 && cut < 24 ? tail.slice(cut + 1) : tail).trim();
  }
  const voiceStartMode = dictationMode ? "" : voiceStartPhase();
  let inlineMode = "";
  if (visible && !herMode && !answerOwnsNotch && !yapOwnsNotch && !thinkingOpen && !nfPanelOpen) {
    if (processingActive) inlineMode = heardForInline ? "thinking" : "";
    else if (conversationOwnsNotch) inlineMode = "heard";
    else if (voiceStartMode) inlineMode = voiceStartMode;
  }
  const inlineText = inlineMode === "heard" || inlineMode === "thinking"
    ? heardForInline
    : (inlineMode ? voiceStartText(inlineMode) : "");
  const inlineState = inlineMode === "thinking"
    ? THINKING_PHASES[thinkingPhaseIndex]
    : (inlineMode === "starting" ? "Connecting" : (inlineMode === "heard" && nfHeardLive ? "HERA" : "Live"));
  layoutNotchCaption("");
  syncInlineVoiceSurface(inlineMode, inlineText, {
    state: inlineState,
    trimmed: heardTrimmed && (inlineMode === "heard" || inlineMode === "thinking"),
  });
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
  // A recording now shows as the thinking chip ("Recording 02:31"); the old
  // "● REC" ticker line drew a second clock over it, the cramped notch.
  if (processingActive || conversationOwnsNotch || (meetingRecording && !answerOwnsNotch)) {
    // nothing else renders in the ticker this frame
  } else {
    if (launchDemoNowPlaying) slots.push("Now Playing · Launch Vid.MP4");
    if (dictationCapturing) {
      const yapNotice = nfTransient.text && now < nfTransient.until ? nfTransient.text : "";
      slots.push(yapNotice || "BrainoHERA");
    }
    if (teachStartedAt) slots.push(`● Watching ${fmtMeetingClock(Date.now() - teachStartedAt)}`);
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
  /* The asleep hint is the quietest thing the ticker can show, so a timer, the
     music or a meeting all outrank it. */
  /* No words while he waits for his name (2026-10-11). "Say Hey Braino to wake
     me" widened the notch to 284px and sat on top of his eyes. Idle is just
     his eyes, in the smallest notch that shows them. */
  const showNameHint = false;
  notchFace.classList.toggle("nf-name-asleep", showNameHint);
  const line = processingActive ? "" : slots[0] || "";
  nfSetStatus2Text(slots[1] || "");
  notchFace.classList.toggle("dual", visible && slots.length > 1);
  notchFace.classList.toggle("alarming", visible && Boolean(nfAlarmRinging));
  notchFace.classList.toggle("live", visible && live);
  notchFace.classList.toggle("music", visible && music);
  if (visible && music) nfMusicNoteActive(now);
  notchFace.classList.toggle("launch-now-playing", visible && launchDemoNowPlaying);
  notchFace.classList.toggle("busy", visible && walkerHome && processingActive);
  // Without subtitles: no sheets, so the colour glow alone says he is working.
  notchFace.classList.toggle("nf-ns-working", visible && notchFace.classList.contains("nf-aos") && processingActive && !speaking);
  notchFace.classList.remove("nf-processing-caption");
  notchFace.classList.toggle("mic-live", visible && sessionEngaged);
  /* LIVE owns the transcript while it is up. The notch has its own HERA surface
     and it runs off the same dictation session, so leaving it on painted the
     same lecture twice: once on the black screen and once in the island. */
  const liveOwnsIt = Boolean(document.getElementById("live-transcript")?.classList.contains("on"));
  notchFace.classList.toggle("nf-dictation", visible && dictationCapturing && !liveOwnsIt);
  walker.classList.toggle("dictation-listening", visible && !walkerHome && dictationCapturing && !liveOwnsIt);
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
    notchVoice && !answerOwnsNotch && sessionEngaged && !namedAsleep
      && (dictationCapturing || ["listening", "hearing"].includes(lastGlowStatus)),
  );
  notchFace.classList.toggle("speak", notchVoice && !answerOwnsNotch && lastGlowStatus === "speaking");
  nfSetStatusText(line);
  nfTraySyncFromState(visible);
  renderQuietNotch({
    visible, inlineMode, processingActive, answerOwnsNotch, namedAsleep,
    sessionEngaged, yapOwnsNotch, thinkingOpen,
  });
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
  "nf-boot-affective",
  "nf-boot-logo-on",
  "nf-boot-sweeping",
  "nf-shining",
  "nf-shine-slow",
];

function clearIomiBootClasses() {
  notchFace?.classList.remove(...NF_IOMI_BOOT_CLASSES);
}

/* Openers: never the same twice in a row, never all the stock "good evening".
   No dashes, short, in his voice. {n} is your first name. */
const GREETING_OPENERS = {
  morning: ["Morning, {n}. Coffee first or chaos first?", "Up and at it, {n}. I like it.", "Morning, {n}. Fresh day, clean slate.", "Hey {n}. Early start, respect.", "Rise and grind, {n}. Mostly grind."],
  afternoon: ["Afternoon, {n}. Halfway through, let's finish strong.", "Hey {n}. Post lunch slump? I've got you.", "Back at it, {n}. What are we breaking today?", "Hey {n}. Good to see you again.", "Afternoon, {n}. Let's get stuff done."],
  evening: ["Evening, {n}. Long day or good day?", "Hey {n}. Back for round two?", "Evening, {n}. Let's wrap this day up right.", "Look who's back. Hey {n}.", "Hey {n}. The night shift begins."],
  late: ["It's late, {n}. Building something good?", "Night owl mode, {n}. I'm with you.", "Hey {n}. The best ideas come after midnight, apparently.", "Still up, {n}? Let's make it count.", "Midnight club, {n}. Members only."],
  any: ["Hey {n}. I'm back, did you miss me?", "There you are, {n}.", "Hey {n}. Ready when you are.", "Reporting for duty, {n}.", "Hey {n}. Let's go."],
};
function pickGreetingOpener(firstName) {
  const h = new Date().getHours();
  const bucket = h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 23 ? "evening" : "late";
  const pool = [...GREETING_OPENERS[bucket], ...GREETING_OPENERS.any];
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem("brainoGreetRecent") || "[]"); } catch (_) {}
  const fresh = pool.filter((line) => !recent.includes(line));
  const choice = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
  try { localStorage.setItem("brainoGreetRecent", JSON.stringify([choice, ...recent].slice(0, 8))); } catch (_) {}
  return choice.replace(/\{n\}/g, firstName || "there");
}
let bootDayLine = "";
async function greetingDayLine() {
  const r = await window.brainoMac.calendarNextNow?.().catch(() => null);
  if (!r?.checked) return "";
  const next = r.next;
  const now = Date.now();
  const sameDay = (t) => new Date(t).toDateString() === new Date(now).toDateString();
  if (!next || !(next.startAt > now - 60000)) {
    const h = new Date().getHours();
    return h >= 17 ? "Your evening's clear." : "Nothing else on your calendar today.";
  }
  const when = new Date(next.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const mins = Math.round((next.startAt - now) / 60000);
  if (mins <= 15) return `Heads up, ${next.title} starts in ${Math.max(1, mins)} minutes.`;
  return sameDay(next.startAt) ? `Next up, ${next.title} at ${when}.` : `Today's clear. Tomorrow starts with ${next.title} at ${when}.`;
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

/* The boot the notch plays. true: the Affective logo, a coral sweep, then
   BRAINO (2026-09-26). false: the FOUNDRY boot exactly as it was. One line to
   switch back. */
const BOOT_AFFECTIVE = true;

async function runIomiBootMascotExit() {
  if (!walker || herMode) return;
  notchFace?.classList.remove("nf-iomi-expanded");
  const startX = Math.round(window.innerWidth / 2 - W / 2);
  const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
  const pinnedSpot = walkArea?.mode === "pin" ? getRoamBounds() : null;
  const landingY = pinnedSpot
    ? pinnedSpot.minY
    : Math.min(260, Math.max(150, Math.round(window.innerHeight * 0.27)));
  walkerHome = false;
  movementMode = "free";
  setPosition(startX, faceH + 7, { allowOffscreen: true });
  targetX = startX;
  targetY = landingY;
  walker.classList.add("visible", "nf-iomi-boot-jump");
  logRenderer("boot.iomi.mascot_exit.start", { landingY, pinned: Boolean(pinnedSpot) });
  await walkTo(pinnedSpot ? pinnedSpot.minX : startX, landingY, { speed: 420, allowOffscreen: true });
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
  if (BOOT_AFFECTIVE) {
    notchFace?.classList.add("nf-boot-affective");
    // The word he says after the logo and the sweep.
    const identity = notchFace?.querySelector(".nf-iomi-identity");
    if (identity) identity.innerHTML = "<span>Braino</span>";
  }

  // Real authentication starts under the very first perimeter trace.
  const authPromise = window.brainoMac.ensureAuth("startup")
    .catch((error) => ({ ok: false, error: error?.message || "Braino sign-in failed." }));
  logRenderer("boot.iomi.start", {});
  await wait(1550);

  let result;
  if (BOOT_AFFECTIVE) {
    /* Affective first, while sign-in runs underneath it; then a coral shimmer
       through the notch; then BRAINO spells itself out. */
    notchFace?.classList.add("nf-boot-logo-on");
    const logoAt = Date.now();
    /* A first sign in happens in the browser. If it is not back in a few
       seconds, say so in the notch instead of holding the logo silently. */
    const waiting = await Promise.race([authPromise.then(() => false), wait(3500).then(() => true)]);
    if (waiting) {
      notchFace?.classList.remove("nf-boot-logo-on");
      nfSetStatusText("Sign in on the page that opened");
      logRenderer("boot.iomi.waiting_for_sign_in", {});
    }
    result = await authPromise;
    if (waiting) nfSetStatusText("");
    // Slower: the logo gets time to arrive and to leave.
    if (Date.now() - logoAt < 2200) await wait(2200 - (Date.now() - logoAt));
    notchFace?.classList.remove("nf-boot-logo-on");
    await wait(700);
    notchFace?.classList.add("nf-boot-sweeping");
    await wait(950);
    notchFace?.classList.remove("nf-boot-sweeping");
    notchFace?.classList.add("nf-iomi-auth");
    await wait(2000);
  } else {
    notchFace?.classList.add("nf-iomi-auth");
    const authShownAt = Date.now();
    result = await authPromise;
    const shown = Date.now() - authShownAt;
    // All four letters receive a clean beat even when a saved session resolves
    // instantly. Slow browser sign-in is allowed to hold on the complete word.
    if (shown < 2200) await wait(2200 - shown);
  }

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
  // A different hello every time, then what is next on the day, never what
  // already happened (2026-10-17). He runs your day, so he leads with it.
  const [opener, dayLine] = await Promise.all([Promise.resolve(pickGreetingOpener(firstName)), greetingDayLine()]);
  const hello = [opener, dayLine].filter(Boolean).join(" ");
  await speak(hello, { captions: false });
  logInteraction({
    kind: "voice",
    route: "boot_greeting",
    braino_text: hello,
    meta: { flow: "iomi", hasDay: Boolean(dayLine) },
  });
  bootDayLine = dayLine;
  await wait(300);
  /* During onboarding he stays home in the notch, eyes open. Jumping out to a
     spot on screen left the notch empty, which read as "he never woke up". */
  const setupPending = await window.brainoMac.setupPending?.().catch(() => false);
  /* He only leaves the notch after boot for someone who chose a spot for him.
     A new person's Braino jumped out and talked in a floating bubble over the
     page, text overlapping the browser (2026-10-13). */
  const choseSpot = walkArea?.mode === "pin";
  if (setupPending || !choseSpot) { walkerHome = true; lastEngagedAt = Date.now(); updateNotchFace(); }
  else await runIomiBootMascotExit();
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
  // Pitch isolation, for exactly the same reason and one more.
  //
  // The pitch demo cues Billie Jean itself and then moonwalks to it. Without
  // this line the music-reaction system hears its own cue, walks him home into
  // the notch, and starts the generic dance instead: the trick ran, invisibly,
  // behind a mascot that had just been sent away, and what the room saw was
  // him bopping on the spot. He is running a script here. Nothing else gets to
  // move him.
  if (pitchRunning) return;
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
      // Normalising strips the question mark, so remember it separately.
      /* A question anywhere in it, or an ask without one: "Which one? You
         have Itish, Itish, Braino." and "Tell me which one is your main." were
         both questions, and the answers to them were dropped (2026-10-03). */
      asked: /\?/.test(String(text || "")) || /\b(?:tell me (?:which|what|who|when|where)|which one|let me know|do you want|want me to|should i|shall i)\b/i.test(String(text || "")),
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

/* His name, and only his name.
 *
 * "reno" and "dino" used to be in here as mishearings, and they are ordinary
 * English words, so he woke up inside other people's sentences: "I told him
 * Reno", "Reno book", "Hello Reno". They are gone. BrainoWakeWord.swift now
 * tells Apple's recogniser the word "Braino" exists (contextualStrings), which
 * is the fix at the source — the remaining variants are the close acoustic
 * misses that are still worth catching. */
function voiceExplicitlyAddressesBraino(text) {
  const raw = String(text || "");
  if (BRAINO_SCRIPT_RE.test(raw)) return true;
  if (activeWakeName() === "Brainelle" && BRAINELLE_SCRIPT_RE.test(raw)) return true;
  const normalized = normalizeForVoiceMatch(text);
  if (!normalized) return false;
  if (/\b(braino|brayno|braino's|breno|braino|raino|bruno)\b/.test(normalized)) return !nameIsOnlyAMention(raw);
  return activeWakeName() === "Brainelle" && BRAINELLE_NAME_RE.test(normalized) && !nameIsOnlyAMention(raw);
}

/* His name said ABOUT him is not calling him (2026-10-03): "after Braino is
   done asking me a question" and "I have to say Braino every single time" were
   said to someone else and went in as commands. address-intent.cjs decides by
   where the name sits; at the start, at the end, or set off by commas calls
   him. */
function nameIsOnlyAMention(raw) {
  let verdict = null;
  try { verdict = window.brainoMac?.nameIsAddressed?.(raw); } catch (_) { verdict = null; }
  if (verdict === false) {
    logRenderer("named.mention_not_call", { text: String(raw || "").replace(/\s+/g, " ").trim().slice(0, 120) });
    return true;
  }
  return false;
}

/* There used to be a second way to "address" him: a list of ordinary words —
 * stop, wait, listen, open, send, make, note, music, sound — any one of which
 * counted as talking to him. One sentence from somebody standing near you
 * ("wait, listen, I'll send you the notes") hit four of them, and he answered.
 * That list is gone. Being addressed means his name was said. Nothing else. */
function voiceAddressesBraino(text) {
  return voiceExplicitlyAddressesBraino(text);
}


/* ── Named mode: his name, every time ─────────────────────────────────────
 *
 * The session can be open and he can hear every word in the room; he answers
 * only a sentence with his name in it. This used to open a conversation window
 * after each exchange (five seconds, then twelve), and inside it anything
 * counted — including a video playing on the Mac, whose "I think he is saying
 * something to the audience" was sent to him as a command. No window now: the
 * way Siri and Alexa work, no name, no action.
 *
 * Exceptions, each for a moment where you are plainly talking to him:
 *   - the first sentence after you woke him ("Hey Braino", or Control twice),
 *   - while he is talking or working (cutting in, "stop", "no, the other one"),
 *   - a sentence you began during one of the above,
 *   - a yes, a no or "the second one" right after he asked you something
 *     (answersHisQuestion; anything longer needs his name, because his chat
 *     replies end in a question all the time and the TV then answered it).
 * A pending delegate follow-up is handled before this, in
 * shouldAcceptVoiceTranscript, and stop phrases are checked on their own.
 * Every one of these is also run past looksLikeNoise.
 *
 * NAMED_WINDOW_MS survives only to tell a real sleep from a pause, for the
 * wake light. */
const NAMED_WINDOW_MS = 12000;
let namedModeOn = false;
let namedAddressedAt = 0;

function namedWindowOpen() {
  if (!namedModeOn) return true;
  if (speaking || processing || voiceTurnInFlight) return true;
  if (Date.now() < namedGraceUntil) return true;
  return Boolean(namedSpeechAwake);
}

/* He finished a question a moment ago. */
function namedAnswerWindowOpen() {
  return Boolean(lastSpokenLine?.asked
    && lastSpokenLine.endedTs > 0
    && Date.now() - lastSpokenLine.endedTs <= NAMED_ANSWER_WINDOW_MS);
}

/* ── The twenty seconds after he answers you ──────────────────────────────
 *
 * Named mode stopped the phantom commands and made a conversation impossible:
 * every turn had to begin with his name, including "no, the other one". So
 * the window is back, with the thing that broke it last time fixed.
 *
 * Last time ANYTHING inside the window counted, and a video playing on the Mac
 * became commands. Now a sentence in the window must ALSO sound like it was
 * said to him: a question, an instruction, or a correction. What the room
 * produces is names and noun phrases (the log has "Liquid mineral.",
 * "Hamburger menu.", "8 year", "stay straight") and none of that gets in.
 *
 * It opens only after a reply to something you said, it runs from the moment
 * his voice stops, and every follow-up he takes starts it again, so a
 * back-and-forth never asks for his name twice. */
function namedFollowUpWindowOpen(now = Date.now()) {
  if (!namedModeOn) return false;
  const line = lastSpokenLine;
  if (!line?.endedTs) return false;
  // He replied to YOU: you spoke first, and he answered within the exchange.
  if (!lastUserTurnAt || lastUserTurnAt > line.ts) return false;
  if (line.ts - lastUserTurnAt > NAMED_EXCHANGE_MAX_MS) return false;
  return now - line.endedTs <= NAMED_FOLLOW_UP_MS;
}

/* Said TO him, rather than said near him. */
const SAID_TO_HIM_QUESTION = /^(?:(?:and|so|but|then|also|ok|okay|hmm)[\s,]+)?(?:what|why|how|when|where|which|who|whose|can|could|would|will|should|shall|do|does|did|is|are|was|were|am|have|has|any|anything|tell|show|give|read|explain|find|search|check)\b/i;
// "navigate to that website" was dropped three times as room talk, and
// "Yeah, open it" did not count as said to him (2026-09-27).
const SAID_TO_HIM_ORDER = /^(?:(?:and|so|but|then|also|now|please|just|ok|okay|yes|yeah|yep|yup)[\s,]+)*(?:navigate|visit|browse|google|ask|open|close|quit|play|pause|stop|resume|skip|next|previous|mute|unmute|search|find|look|send|message|text|call|facetime|write|type|make|create|delete|remove|move|copy|paste|save|share|set|change|turn|switch|increase|reduce|lower|raise|repeat|read|summari[sz]e|translate|remind|schedule|book|buy|order|download|install|update|check|try|do|go|take|bring|add|put|keep|start|run|show|tell|explain|note|remember|forget|cancel|undo|retry|continue|carry|give|use|pick|choose|select|scroll|click|press|zoom|explain|enter|exit|leave|activate|deactivate|enable|disable|launch|duplicate|sync|record|mark|unmark|remind|translate|fix|edit|draft|rename|organi[sz]e|clean|empty|reply|forward|mode)\b/i;
/* An action asked for anywhere in the sentence, softly worded included:
   "how about showing me", "could you open", "can you play". */
const ASKS_ABOUT_HIS_DATA = /\b(?:my (?:day|calendar|schedule|timetable|classes?|meetings?|messages?|whatsapps?|emails?|inbox|notes?|files?|attendance|assignments?|deadlines?|tasks?|reminders?|week)|what(?:'s| is) (?:on|due|next)|what did i|where was i|what was i|who (?:texted|messaged|called) me|(?:today|tomorrow|tonight|this week)\b.*\?|\b(?:today|tomorrow)\b)\b/i;
const ASKS_FOR_AN_ACTION = /\b(?:open|show|play|send|search|find|close|book|call|message|text|click|launch|start|stop|scroll|pull up|bring up|take me|go to|navigate|look up|download)(?:ing|s)?\b/i;
const SAID_TO_HIM_CORRECTION = /^(?:no|nope|nah|not\s|actually|instead|i meant|i mean|i said|wait|hold on|hang on|sorry|rather|forget it|never ?mind)\b/i;

function saidToBraino(text) {
  const value = String(text || "").trim().replace(/^[\s,.\-]+/, "");
  if (!value) return false;
  // Two words at least: one word off a speaker is how the room sounds.
  if (value.split(/\s+/).filter(Boolean).length < 2) return false;
  if (/\?["')\]]*$/.test(value)) return true;
  return SAID_TO_HIM_CORRECTION.test(value)
    || SAID_TO_HIM_QUESTION.test(value)
    || SAID_TO_HIM_ORDER.test(value);
}

/* The window is open ONLY because he is speaking or working: no wake, no
   grace period. */
function namedBusyOnly() {
  if (!namedModeOn) return false;
  if (namedSpeechAwake || Date.now() < namedGraceUntil) return false;
  return Boolean(speaking || processing || voiceTurnInFlight);
}
/* One word is enough to stop him. */
const BUSY_INTERRUPT = /^(?:stop|wait|cancel|pause|enough|no|nope|shut up|quiet|hold on|hang on)\b/i;

/* What an answer to his waiting question sounds like: short (a name, a yes,
   "the second one"), or plainly said to him. A long sentence that is neither
   is the room. */
/* "Five words or fewer" used to be enough on its own, and that let the room in:
   while he waited on "are you safe?", a Hindi question, a line in Urdu and a
   friend's "say it as a verb" all went through as his answer (2026-09-27).
   Now short means an answer shape (yes, no, a pick) or a name-sized reply of
   up to three words that is not a question and not in another script. */
function answersPendingQuestion(text) {
  const raw = String(text || "").trim();
  const value = raw.replace(/[.!?,]+$/g, "");
  if (!value) return false;
  const words = value.split(/\s+/).filter(Boolean).length;
  if (words <= 5 && ANSWER_REPLY.test(value)) return true;
  if (words <= 3 && /^(?:हाँ|हां|हा|जी|नहीं|नही|ہاں|جی|نہیں)/.test(value)) return true;
  if (words <= 3 && !/\?\s*$/.test(raw) && !SAID_TO_HIM_QUESTION.test(value) && !/[ऀ-ॿ؀-ۿ]/.test(value)) return true;
  return saidToBraino(value);
}

/* Words that mean "stop talking", in English and Hindi. */
const BARGE_STOP = /^(?:(?:hey\s+)?brain(?:o|elle)[\s,.!]*)?(?:stop|wait|no+|nope|enough|hold on|hang on|shut up|quiet|pause|ruko|ruk|bas|chup|arre)\b/i;

/* His voice, lowered while someone else talks, back to full after. */
let speechDucked = false;
let speechUnduckTimer = null;
function duckSpeech(on, why = "") {
  const level = on ? 0.35 : 1;
  const apply = (a) => { try { if (a && typeof a.volume === "number") a.volume = level; } catch (_) {} };
  try { activeSpeechAudios.forEach(apply); } catch (_) {}
  apply(currentSpeechAudio);
  if (on && !speechDucked) logRenderer("voice.ducked_for_other_speech", { why });
  speechDucked = on;
  clearTimeout(speechUnduckTimer);
  // If nothing addressed to him arrives, he comes back up by himself.
  if (on) speechUnduckTimer = setTimeout(() => duckSpeech(false), 2500);
}

/* Straight after his answer, and clearly meant for him. */
/* One word that only means something to him: "stop" right after he started
   the song was dropped as room noise (2026-09-26), and he had to be told
   again with his name. */
function followsHisReply(text) {
  if (!namedFollowUpWindowOpen()) return false;
  /* His own voice off the speakers is never your reply to him (4 Oct: "play
     default only in the next 20 minutes" came in through this window). The
     mic stays open while he talks now, so this matters more. */
  if (isSelfEcho(text)) return false;
  /* A long sentence with no name is a lecture or a room, not a reply
     (2026-10-06 10:43 UTC: class audio came in here and was typed into
     Cursor). Past 15 words, only a sentence shaped as said to him counts. */
  if (String(text || "").trim().split(/\s+/).filter(Boolean).length > 15) {
    return voiceExplicitlyAddressesBraino(text) || saidToBraino(text);
  }
  if (/^(?:stop|pause|play|resume|next|skip|louder|quieter|mute|unmute|back|again)[.!]?$/i.test(String(text || "").trim())) return true;
  /* In a conversation, a normal sentence is a reply. "I said can you please
     click on Brabus" and "visually it doesn't work like that" were dropped for
     not being shaped like orders. Three words and a real speech rate are
     enough; noise is still caught by looksLikeNoise downstream. */
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  /* Unless something is playing: a reel said "I didn't know the depth… hospital
     politics…" and it went in as a command (2026-09-25). With media on, only a
     sentence shaped like it is for him counts. */
  if (typeof mediaAudioPlaying !== "undefined" && mediaMaybePlaying()) return saidToBraino(text);
  /* Talking back to what he just said (2026-10-03). "The first chrome
     profile" answered "Tell me which one is your main", and "But that's wrong,
     today was a holiday" corrected his answer; both were dropped for not
     sounding like an order. A short answer, a correction, or a sentence that
     picks up a word from his reply or from what you asked him is the
     conversation carrying on. The room does neither. */
  const value = String(text || "").trim().replace(/[.!?,]+$/g, "");
  // A short answer only when he actually asked: an "OK" from the room after
  // a plain statement of his is not a reply.
  if (words <= 6 && lastSpokenLine?.asked && ANSWER_REPLY.test(value)) return true;
  if (words >= 2 && /^(?:but|that'?s (?:wrong|not|incorrect)|that is (?:wrong|not)|wrong|incorrect|not true|that'?s not right)\b/i.test(value)) return true;
  if (words >= 3 && (sharesAWordWithQuestion(value, lastSpokenLine?.text) || sharesAWordWithQuestion(value, rtLastHeardText))) return true;
  /* A remark counts when it is said TO him. With friends in the room, "words
     >= 3" let their conversation in as his; "you", "your" and his name are
     what a sentence aimed at him carries. */
  return saidToBraino(text) || (words >= 3 && /\b(?:you|your|you're|yours|braino|brainelle)\b/i.test(String(text || "")));
}

const ANSWER_REPLY = /^(?:yes|yeah|yep|yup|yes please|sure|ok|okay|alright|all right|no|nope|nah|no thanks|not now|go ahead|do it|please do|go for it|cancel|never ?mind|that one|this one|(?:the )?(?:first|second|third|fourth|fifth|last|other)(?: one)?|(?:number )?(?:one|two|three|four|five|1|2|3|4|5))\b/i;

function answersHisQuestion(text) {
  const value = String(text || "").trim().replace(/[.!?,]+$/g, "");
  const words = value.split(/\s+/).filter(Boolean).length;
  if (namedAnswerWindowOpen() && words <= 5 && ANSWER_REPLY.test(value)) return true;
  /* A real answer to a question he asked is often long. 2026-09-29: "online,
     offline, or both?" got "both, and like B2B and gifting shops and wedding
     planners and festive orders and flea stalls and website Instagram
     Facebook", no name, twenty seconds of speech, and it was dropped: the
     window was measured to the END of the sentence, and only five-word
     answers counted. So: he asked, you STARTED speaking within the window
     after he finished, and it is a real sentence. Not while media plays (a
     video can answer a question too); looksLikeNoise still runs after this. */
  const endedTs = lastSpokenLine?.asked ? Number(lastSpokenLine.endedTs) || 0 : 0;
  if (!endedTs || words < 3) return false;
  if (typeof mediaAudioPlaying !== "undefined" && mediaMaybePlaying()) return false;
  const startedAt = rtSpeechStartedAt || Date.now();
  if (!(startedAt >= endedTs - 500 && startedAt - endedTs <= NAMED_ANSWER_WINDOW_MS)) return false;
  /* And it has to answer what he asked, not just follow it. The room says
     long sentences too ("I think he is saying something to the audience").
     An answer reuses a word from his question: "online, offline, or both?"
     then "both, and B2B...". A sentence that shares nothing with it is not
     an answer, however well timed. */
  return sharesAWordWithQuestion(value, lastSpokenLine?.text);
}

const ANSWER_STOPWORDS = new Set(["what", "which", "where", "when", "would", "could", "should", "your", "you're", "that", "this", "with", "have", "about", "there", "their", "them", "want", "like", "just", "going", "doing", "right", "then", "than", "from", "into", "will", "does", "okay"]);
function sharesAWordWithQuestion(answer, question) {
  const words = (t) => new Set(String(t || "").toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []);
  const q = words(question);
  if (!q.size) return false;
  for (const w of words(answer)) if (!ANSWER_STOPWORDS.has(w) && q.has(w)) return true;
  return false;
}

function namedWake(why) {
  const wasAsleep = !namedWindowOpen();
  const lastExchange = Math.max(namedAddressedAt, lastSpokenLine?.endedTs || 0);
  const asleepFor = lastExchange > 0 ? Date.now() - (lastExchange + NAMED_WINDOW_MS) : Infinity;
  namedAddressedAt = Date.now();
  // The first real sentence has arrived; from here the normal five seconds apply.
  if (why === "name" || why === "follow-up") namedGraceUntil = 0;
  if (wasAsleep) {
    logRenderer("named.awake", { why });
    /* The moment he wakes is the one thing this mode has to show. A wake-word
       wake gets the voice shimmer on its own path, because it opens a session. */
    // Every sentence carries his name now, so a name in a session is not a
    // wake. The gold trace belongs to "Hey Braino" from cold (the wake-word
    // path), and to a name after a long quiet stretch.
    if (why === "name" && asleepFor >= NAME_WAKE_LIGHT_AFTER_MS * 3) flashNameWake();
  }
  updateNotchFace();
}

/* The window starts when you can actually talk. Saying his name opens it, but
   a session then takes 2 to 6 seconds to come up, so five seconds counted from
   the name had mostly gone by the time the notch said to speak, and the
   command that followed landed on a closed door. */
function namedOpenAtReady() {
  if (!namedModeOn || !namedAddressedAt) return;
  if (Date.now() - namedAddressedAt > 30000) return;
  namedAddressedAt = Date.now();
  namedGraceUntil = Date.now() + NAMED_FIRST_COMMAND_MS;
}

/* updateNotchFace can run before this part of the module has been evaluated,
   and reading a `let` that early throws. */
function namedAsleepForNotch() {
  try {
    return namedModeOn && !namedWindowOpen() && !namedAnswerWindowOpen() && !namedFollowUpWindowOpen();
  } catch {
    return false;
  }
}

function activeWakeName() {
  try {
    return macCharacter === "brainelle" ? "Brainelle" : "Braino";
  } catch {
    return "Braino";
  }
}

/* The perimeter trace from the boot, once, sized to the listening pill he is
   about to become (the trace stretches to its box: preserveAspectRatio="none"
   in index.html). Only the classes this flash added are taken off again, so a
   trace some other state owns is left alone. */
function flashNameWake() {
  if (!notchFace) return;
  window.clearTimeout(nameWakeFlashTimer);
  if (nameWakeFlashAdded.length) notchFace.classList.remove(...nameWakeFlashAdded);
  nameWakeFlashAdded = ["nf-shining", "nf-name-wake"].filter((name) => !notchFace.classList.contains(name));
  void notchFace.offsetWidth; // restart the draw even if a trace just ran
  notchFace.classList.add(...nameWakeFlashAdded);
  logRenderer("named.wake_light", {});
  nameWakeFlashTimer = window.setTimeout(() => {
    notchFace.classList.remove(...nameWakeFlashAdded);
    nameWakeFlashAdded = [];
  }, 1700);
}

/* The window closes on a clock nobody repaints for, so look twice a second and
   repaint only when asleep/awake actually changed. */
window.setInterval(() => {
  if (namedAsleepForNotch() !== namedAsleepPainted) updateNotchFace();
}, 500);

/* A new session starts asleep. Without this, ending a session inside the window
   and starting a new one left him already awake and answering the room. */
function namedReset() {
  namedAddressedAt = 0;
  namedGraceUntil = 0;
  namedSpeechAwake = false;
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
  // Only "team mode" starts it. Loose triggers ("ann", "old team", a name)
  // fired the farewell script off a film's dialogue.
  return macTeamState.active || /\bteam mode\b/i.test(raw);
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
  /* While a chat reply is still streaming, lastSpokenLine is the PREVIOUS line:
     this one is only recorded when it ends. With the mic open while he talks
     (5 Oct), his current words have to count as his too, or he cuts himself
     off. */
  const live = normalizeForVoiceMatch(realtimeResponseText || "");
  if (live && (speaking || currentSpeechAudio || realtimeStreamTts) && isSelfEchoOf(text, live, true)) return true;
  return isSelfEchoOf(text, lastSpokenLine.text);
}
function isSelfEchoOf(text, spoken, playingNow = false) {
  const heard = normalizeForVoiceMatch(text);
  if (!heard || !spoken) return false;
  // Freshness measured from when he STOPPED talking, and always live while he still is.
  // Anchored to the reply-issued timestamp this expired mid-sentence on a long answer,
  // which is exactly when his voice is loudest in the mic and echo is most likely.
  const sinceVoiceStopped = Date.now() - (lastSpokenLine.endedTs || lastSpokenLine.ts);
  if (!playingNow && !speaking && sinceVoiceStopped > 10000) return false;
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

/* "Braino, stop the task." Matched on the words, like stop listening, because
 * the only other route was asking HIL what "stop" meant, which is a model call
 * of 5 to 10 seconds on Astra while the job carries on clicking.
 *
 * Two strengths. Naming the job ("stop the task", "cancel the search") is clear
 * enough on its own. A bare "stop" or "never mind" is something people say to
 * each other, so it needs his name on it. */
const STOP_TASK_NAMED_JOB = /^(?:stop|cancel|abort|end|kill|quit|halt|drop)(?:\s+(?:the|this|that|your|my))?\s+(?:task|tasks|job|run|delegation|delegating|search|searching)\b/;
const STOP_TASK_BARE = [
  /^(?:stop|cancel|abort|halt)(?:\s+(?:stop|now|please|right now|immediately))*$/,
  /^(?:stop|cancel|abort|halt)\s+(?:it|that|this|everything|all of it|what you(?:'|\u2019)?re doing|doing that|doing this|working)\b/,
  /^(?:never ?mind|forget it|forget about it|leave it)\b/,
];
const STOP_TASK_BRAINELLE_WAKE = /^(?:hey\s+)?(?:brainelle|brainel|brainell|brinell|brunel|brunelle)\b[\s,.]*/i;

/* While a job runs, "stop it" misheard is still stop (30-day log: "Refuse
   it", "stuff it", "top it", "stopped it", and Hindi ruk / bas). */
const STOP_TASK_FUZZY = /^(?:refuse it|stuff it|top it|stopped it|stop it|stop that|stop now|ruk(?:o|jao| jao)?|bas(?: karo| kar| bas)?|band karo)$/;
function stopEditDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

/* "Stop talking" (2026-10-15): asked after he had already finished, it went
   to the loop (6s), which had nothing to stop, called it a failure, and then
   said so out loud. It is never a job: stop his voice if it is going, and
   otherwise stay silent. */
const STOP_TALKING = /^(?:(?:hey\s+)?brain(?:o|elle)[\s,.!]*)?(?:please\s+)?(?:(?:stop|quit|no more)\s+(?:the\s+)?(?:talking|speaking|yapping|chatting)|shut up|be quiet|keep quiet|quiet(?:\s+please)?|hush|zip it|chup(?:\s+(?:raho|karo|ho jao))?|bas karo bolna)\b[\s,.!]*(?:please|now|braino)?[\s.!]*$/i;
function isStopTalkingPhrase(text) { return STOP_TALKING.test(String(text || "").trim()); }
function stopTalkingNow(source, transcript) {
  logRenderer("voice.stop_talking", { source, speaking, transcript: String(transcript || "").slice(0, 80) });
  if (transcript) nfSetHeard(transcript, { durationMs: 1000 });
  if (speaking) stopSpeechOutput();
  setStatus(realtimeActive ? "listening" : "ready", realtimeActive ? "Listening" : "Ready");
}

function isStopTaskPhrase(text, { jobRunning = false } = {}) {
  let rest = String(text || "").trim().replace(/[.!?]+$/g, "").replace(/,/g, " ").replace(/\s+/g, " ");
  if (!rest) return false;
  const addressed = STOP_LISTENING_WAKE.test(rest) || STOP_TASK_BRAINELLE_WAKE.test(rest);
  rest = rest.replace(STOP_LISTENING_WAKE, "").replace(STOP_TASK_BRAINELLE_WAKE, "")
    .replace(STOP_LISTENING_LEAD, "").trim().toLowerCase();
  if (!rest || rest.split(/\s+/).length > 6) return false;
  if (jobRunning && (STOP_TASK_FUZZY.test(rest) || (rest.split(/\s+/).length <= 3 && stopEditDistance(rest, "stop it") <= 2))) return true;
  if (STOP_TASK_NAMED_JOB.test(rest)) return true;
  return addressed && STOP_TASK_BARE.some((pattern) => pattern.test(rest));
}

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
  namedReset();
  setStatus("ready", "Double Space to show/hide");
  setBubble("Stopped listening.", 1200);
  logRenderer("voice.stopped", { source });
}

/* Scripts and accents that are a mishearing here, never Itish: "Što su
   nasla", "Es muy extraño", "¿...", Thai, Cyrillic, CJK. Devanagari and
   Urdu stay: that is real Hinglish (see below). */
const FOREIGN_TRANSCRIPT_RE = /[¿¡]|[\u00C0-\u024F\u1E00-\u1EFF]|[\u0370-\u03FF\u0400-\u04FF\u0530-\u05FF\u0E00-\u0E7F\u1100-\u11FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;

const ASKS_ABOUT_MEDIA = /^(?:(?:and|so|ok(?:ay)?|wait|hey)[,\s]+)?(?:which|what|who)(?:'s|\s+is|\s+was|\s+did)?\b.*\b(?:song|track|music|tune|artist|singer|band|album|playing|played|play)\b/i;

function shouldAcceptVoiceTranscript(text) {
  /* Never while he waits for an answer: "Which Riya?" is answered with a
     contact name, which is made only of list words. */
  const awaitingAnswer = hasPendingDelegateFollowup() || namedAnswerWindowOpen();
  if (!herMode && !awaitingAnswer && isVocabularyEcho(text)) {
    logRenderer("voice.vocabulary_echo", { text: String(text || "").slice(0, 80) });
    return false;
  }
  if (!herMode && FOREIGN_TRANSCRIPT_RE.test(String(text || ""))) {
    logRenderer("voice.transcript_foreign", { text: String(text || "").slice(0, 80) });
    return false;
  }
  const stats = transcriptStats(text);
  if (!stats.normalized || stats.wordCount === 0) {
    /* Words with no a-z in them. This used to be a silent return false, which
       is how "Hey Braino" written in another script vanished: the log showed a
       12-character sentence, rejected, and nothing to say why. A name here
       still wakes him; it is not a command, so nothing runs, but the next
       sentence gets through. */
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (raw && namedModeOn && !herMode && voiceExplicitlyAddressesBraino(raw)) {
      namedWake("name");
      logRenderer("named.awake_other_script", { text: raw.slice(0, 60) });
      return false;
    }
    /* Hindi, written in Devanagari (or as Urdu) even though English is asked
       for. It is real speech and the model understands it; dropping it is how
       two minutes of Hinglish on 2026-09-25 became "he's not listening". Let it
       through when he is actually listening to you, never to wake him. Other
       scripts (Tamil, from the same Hindi audio) are a mishearing and stay out. */
    const words = raw.split(/\s+/).filter(Boolean).length;
    /* Not in the follow-up window and not while he is busy: that is when
       friends talk to each other in the room (2026-09-25: "Original task diya
       hai", "aap ko answer de ga" all went in and each cost 15 to 37 seconds). */
    const wokenForThis = !namedModeOn || (!namedBusyOnly() && (namedSpeechAwake || Date.now() < namedGraceUntil));
    if (raw && /[\u0900-\u097F\u0600-\u06FF]/.test(raw) && words >= 2 && (wokenForThis || (hasPendingDelegateFollowup() && words <= 5))) {
      logRenderer("voice.transcript_hindi_accepted", { chars: raw.length });
      return true;
    }
    if (raw) logRenderer("voice.transcript_unreadable", { text: raw.slice(0, 120) });
    return false;
  }

  /* NAMED MODE. Before anything else, because everything else in this function
     assumes he is allowed to answer.
     Order matters and is the difference between working and looping forever:
     his own voice is checked FIRST, because he says his own name out loud
     ("Braino here", "this is Braino") and would otherwise hear it through the
     speakers and wake himself up, answer, say it again, and never stop. */
  /* A waiting question used to switch this whole filter off. Then everything
     the room said was taken as the answer: 2026-09-24, HIL asked "who should
     receive the WhatsApp message?" and "So let's start. Starting one more
     thing." and "So we will note the form for collecting those doubts." both
     went in as commands, each one asked again, and the question kept the door
     open. A waiting question now lets in an ANSWER, not the room. */
  if (namedModeOn && !herMode) {
    if (isSelfEcho(text)) {
      logRenderer("named.self_echo", { chars: stats.normalized.length });
      return false;
    }
    const named = voiceExplicitlyAddressesBraino(text);
    const heardOnDevice = namedHeardOnDeviceAt > 0 && Date.now() - namedHeardOnDeviceAt <= NAMED_ON_DEVICE_MATCH_MS;
    if (named || heardOnDevice) {
      /* "Hey Braino" made out of four seconds of room noise, which is what
         the transcriber writes when its prompt is all it has to go on. */
      if (named && isBareWakeWord(text) && looksLikeNoise(text, rtLastSpeechMs)) {
        logRenderer("named.noise_ignored", { text: String(text || "").trim().slice(0, 80), speechMs: rtLastSpeechMs });
        return false;
      }
      if (heardOnDevice && !named) {
        logRenderer("named.heard_on_device", { text: String(text || "").trim().slice(0, 80) });
      }
      // His name on its own leaves the on-device match for the sentence after it.
      if (!isBareWakeWord(text)) namedHeardOnDeviceAt = 0;
      namedWake("name");
    } else if (namedBusyOnly() && !saidToBraino(text) && !BUSY_INTERRUPT.test(String(text || "").trim()) && !answersHisQuestion(text) && !(hasPendingDelegateFollowup() && answersPendingQuestion(text))
      /* A plain new order while he works ("Open Chrome.", "Open the file.")
         is a new job, not room talk: it was dropped 2 times in one run. */
      && !(isLikelyMacActionTranscript(text) && stats.wordCount >= 2 && stats.wordCount <= 12 && /^(?:open|close|quit|play|pause|stop|switch|go to|search|show|send|call|turn|set|mute|maximi[sz]e|minimi[sz]e)\b/i.test(stats.normalized))) {
      /* Open only because he is talking or working. That is when barge-in and
         corrections happen, and also when the room is loudest, so it has to
         sound like it was said to him. */
      logRenderer("named.ignored_busy", { text: String(text || "").replace(/\s+/g, " ").trim().slice(0, 120) });
      return false;
    } else if (!namedWindowOpen() && !answersHisQuestion(text) && !followsHisReply(text) && !(hasPendingDelegateFollowup() && answersPendingQuestion(text))) {
      logRenderer("named.ignored", {
        // Logged in full: these drops are the feature working, and the only way
        // to tell that from the feature eating your sentence is to read them.
        text: String(text || "").replace(/\s+/g, " ").trim().slice(0, 120),
      });
      // Not for him, so the music he paused for it comes back.
      releaseMedia(true, "ignored");
      return false;
    } else if (looksLikeNoise(text, rtLastSpeechMs)) {
      /* No name, so it only got this far on an exception: right after a wake,
         mid-turn, or answering him. Those are exactly the moments the room's
         noise was being turned into commands. */
      logRenderer("named.noise_ignored", {
        text: String(text || "").replace(/\s+/g, " ").trim().slice(0, 120),
        speechMs: rtLastSpeechMs,
      });
      return false;
    } else {
      // Inside the window and clearly aimed at him: keep it open.
      /* Which door it came through, because the follow-up window is the one
         that can let the room in and the log is how we would know. */
      if (!namedWindowOpen() && followsHisReply(text)) {
        logRenderer("named.after_reply", { text: String(text || "").replace(/\s+/g, " ").trim().slice(0, 120) });
      }
      namedWake("follow-up");
    }
  }

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
  /* You just said his name, so the next sentence is yours, whatever the
     speakers might be doing. 2026-09-26: "Braino", then a real sentence, was
     dropped as speaker bleed because the Spotify check was failing and "not
     sure if music is playing" counts as playing. He went straight back to
     waiting for his name while you were still talking to him. */
  const justWoken = namedModeOn && (namedSpeechAwake || Date.now() < namedGraceUntil);
  if (mediaMaybePlaying() && !justWoken && !herMode && !voiceTurnInFlight && !hasPendingDelegateFollowup()) {
    /* A question about what is playing is yours, not the song's (2026-10-05:
       "Which song did you play?" right after he played Fred again was dropped
       as bleed because it contains "play"). */
    const asksAboutMedia = stats.wordCount >= 3 && ASKS_ABOUT_MEDIA.test(String(text || "").trim());
    if (!explicitlyAddressed && !asksAboutMedia && (stats.wordCount < 3 || actionLike)) {
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
  const plainOrder = isLikelyMacActionTranscript(text) && stats.wordCount >= 2 && stats.wordCount <= 12 && /^(?:open|close|quit|play|pause|stop|switch|go to|search|show|send|call|turn|set|mute|maximi[sz]e|minimi[sz]e)\b/i.test(stats.normalized);
  if ((speaking || processing || voiceTurnInFlight) && !addressed && !(plainOrder && !speaking)) {
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
  // A new turn in a live conversation keeps his sheet (see holdNotchAnswerForReply).
  if (!(realtimeActive && holdNotchAnswerForReply())) clearNotchAnswer({ invalidate: true });
}

/* ── Money and big numbers, said the way a person says them ───────────────
 *
 * "₹2,00,000" went to the voice as written: read out group by group, and with
 * no "rupees" at all. Nobody in India says that; they say "2 lakh rupees".
 * Only what he SAYS changes. The notch still shows the figure as written. */
function nfTrimAmount(value) {
  return String(Number(value.toFixed(2)));
}

function nfSpokenIndianAmount(value) {
  if (value >= 1e7) return `${nfTrimAmount(value / 1e7)} crore`;
  if (value >= 1e5) return `${nfTrimAmount(value / 1e5)} lakh`;
  // Paise are noise above a hundred rupees; below it they are the price.
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toLocaleString("en-US") : String(rounded);
}

function nfSpokenWesternAmount(value) {
  if (value >= 1e9) return `${nfTrimAmount(value / 1e9)} billion`;
  if (value >= 1e6) return `${nfTrimAmount(value / 1e6)} million`;
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toLocaleString("en-US") : String(rounded);
}

const NF_SPOKEN_SUFFIX = {
  k: "thousand", thousand: "thousand", l: "lakh", lakh: "lakh", lakhs: "lakh", lac: "lakh", lacs: "lakh",
  cr: "crore", crore: "crore", crores: "crore", m: "million", mn: "million", million: "million",
  b: "billion", bn: "billion", billion: "billion",
};

function speakableAmounts(text) {
  // A number never ends on a comma: "₹2,00,000, you still need" keeps its pause.
  return String(text || "")
    // Rupees: "₹2,00,000", "Rs. 1,97,287.00/-", "INR 5k", "₹1.2 cr".
    .replace(/(?:₹|\bRs\.?|\bINR)\s?(\d(?:[\d,]*\d)?(?:\.\d+)?)(?:\s?(k|thousand|lakhs?|lacs?|l|crores?|cr|mn|m|million|bn|b|billion)\b)?(?:\/-)?/gi, (all, digits, suffix) => {
      const value = Number(String(digits).replace(/,/g, ""));
      if (!Number.isFinite(value)) return all;
      if (suffix) return `${digits.replace(/,/g, "")} ${NF_SPOKEN_SUFFIX[suffix.toLowerCase()] || suffix} rupees`;
      return `${nfSpokenIndianAmount(value)} ${value === 1 ? "rupee" : "rupees"}`;
    })
    // Dollars: "$1.2M", "$15", "$0.05".
    .replace(/\$\s?(\d(?:[\d,]*\d)?(?:\.\d+)?)(?:\s?(k|thousand|mn|m|million|bn|b|billion)\b)?/gi, (all, digits, suffix) => {
      const value = Number(String(digits).replace(/,/g, ""));
      if (!Number.isFinite(value)) return all;
      if (suffix) return `${digits.replace(/,/g, "")} ${NF_SPOKEN_SUFFIX[suffix.toLowerCase()] || suffix} dollars`;
      if (value > 0 && value < 1) return `${nfTrimAmount(value * 100)} cents`;
      return `${nfSpokenWesternAmount(value)} ${value === 1 ? "dollar" : "dollars"}`;
    })
    // Indian grouping without a currency ("2,00,000 users") is unambiguous.
    .replace(/\b\d{1,2}(?:,\d{2})+,\d{3}(?:\.\d+)?\b/g, (all) => nfSpokenIndianAmount(Number(all.replace(/,/g, ""))));
}

function stripSpeechText(text) {
  return speakableAmounts(text)
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

/* Is the pointer over the live panel? Asked in both sizes: the rest of the
   window has to stay invisible to the mouse whatever the panel is doing. */
function pointHitsLivePanel(x, y) {
  const panel = liveEl?.querySelector(".lt-panel");
  if (!panel) return false;
  return rectContains(panel.getBoundingClientRect(), x, y, 6);
}

function pointHitsBrainoUi(x, y) {
  const walkerRect = walkerFlip.getBoundingClientRect();
  if (mascotHide?.mode === "stealth") {
    // Faint until the mouse comes near, then himself, and touchable.
    const near = rectContains(walkerRect, x, y, 60);
    document.body.classList.toggle("mascot-peek", near);
    if (near && rectContains(walkerRect, x, y, 18)) return true;
  } else if (mascotHide?.mode !== "hidden" && rectContains(walkerRect, x, y, 18)) return true;

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
  nfUpdateTuck(event.clientX, event.clientY);
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
  /* The notch panel is a popover: while it is up the pointer is ours, so a
     click outside it lands here and closes it rather than reaching the app
     underneath half the time. */
  if (nfPanelOpen) {
    setMousePassthrough(false);
    return;
  }
  /* Picking his patch is a whole-screen gesture, so it owns the pointer for as
     long as it is up and not a moment longer. */
  if (walkPickerOpen) {
    setMousePassthrough(false);
    return;
  }
  /* Full screen, the display is genuinely black and there is nothing behind it
     worth clicking, so it takes the pointer. That is safe here in a way it was
     not before only because the exits do not depend on this window: Escape and
     the hotkey are registered globally, and main hands the mouse back itself if
     this renderer ever stops answering.
     Minimised is the opposite and has to be: the bar takes its own pixels and
     every other click goes through to the machine. */
  if (liveOn) {
    setMousePassthrough(liveMini
      ? !pointHitsLivePanel(event.clientX, event.clientY)
        && !pointHitsBrainoUi(event.clientX, event.clientY)
      : false);
    return;
  }
  if (dragState) {
    setMousePassthrough(false);
    return;
  }
  setMousePassthrough(!pointHitsBrainoUi(event.clientX, event.clientY) && !window.__approvalCardHit?.(event.clientX, event.clientY));
}

// Approval card buttons (approval-card.js) answer exactly like saying it.
window.__brainoRunDelegate = (text) => runDelegate(String(text || ""), { keepRealtime: realtimeActive });

/* A markdown table, read and shown as plain lines (2026-10-01). The notch
   printed "| Model | Amazon | Flipkart | |---|---|" verbatim, rows glued on
   one line, and the voice would have read the pipes. Each row becomes
   "AirPods 4: Amazon ₹12,009, Flipkart ₹12,009." */
function mdTablesToLines(text) {
  let t = String(text || "");
  if (!/\|[^|\n]+\|/.test(t)) return t;
  t = t.replace(/\|\s*\|/g, "|\n|");
  const out = [];
  let header = null;
  for (const raw of t.split("\n")) {
    const row = raw.trim();
    if (!/^\|.*\|$/.test(row)) { header = null; out.push(raw); continue; }
    const cells = row.slice(1, -1).split("|").map((c) => c.trim());
    if (cells.every((c) => !c || /^:?-{2,}:?$/.test(c))) continue;
    if (!header) { header = cells; continue; }
    const [first, ...rest] = cells;
    const parts = rest.map((c, i) => (c ? (header[i + 1] ? `${header[i + 1]} ${c}` : c) : "")).filter(Boolean);
    out.push(`${first}${parts.length ? `: ${parts.join(", ")}` : ""}.`);
  }
  return out.join("\n").replace(/\*\*/g, "");
}

async function speak(text, options = {}) {
  const line = mdTablesToLines(String(text || "")).trim();
  if (!line) return;
  /* What he SAYS has no markdown: "**affctve.com/braino**" was read out with
     its stars and backticks (2026-10-11). The notch still shows the line. */
  const spokenLine = line.replace(/\*\*|__|`+/g, "").replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/^\s*[-*]\s+/gm, "").trim() || line;
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
  /* "Talk out loud" off: the reply is shown in the notch and not spoken.
     Her mode and the pitch demo are performances, so they always speak. */
  /* A typed turn is a quiet turn: shown in the notch, not spoken. */
  const quiet = Boolean(options.silent) || (!options.forceVoice && !herMode && !pitchRunning && !talkOutLoud());
  speaking = true;
  speakingSilently = quiet;
  setStatus("speaking", "Speaking");
  setTalk(!quiet);
  logRenderer("speech.start", { chars: line.length, quiet });
  try {
    if (quiet) {
      const readMs = Math.min(20000, Math.max(1800, line.length * 55));
      animateNotchAnswerEstimate(line, generation, readMs);
      await wait(readMs);
      return;
    }
    let spoke = false;
    try {
      spoke = await speakWithStreamingTts(spokenLine, generation);
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
      const response = await window.brainoMac.tts(spokenLine, macSpeakingRefId());
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
        speechViaSystemSayUntil = Date.now() + estimatedMs + 60000;
        await window.brainoMac.systemSay(spokenLine);
        speechViaSystemSayUntil = Date.now() + estimatedMs + 2000;
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
      speechViaSystemSayUntil = Date.now() + estimatedMs + 60000;
      await window.brainoMac.systemSay(spokenLine);
      speechViaSystemSayUntil = Date.now() + estimatedMs + 2000;
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
      if (!quiet) heraVoiceRotate("braino_spoke", { echoTail: true });
      speakingSilently = false;
      if (showReplyCaption) finishReplyCaption(generation);
      // A narration line said mid job hands the notch back to "working".
      if (options.narration && processing) setStatus("thinking", "Working");
      else if (realtimeActive && !processing) {
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
    // Typed is always to him: main must never drop it as room talk.
    typed: Boolean(options.typed),
    // Main may hand a sentence back as talk; only a live voice session can answer it.
    canTalk: Boolean(realtimeActive && rtDc && rtDc.readyState === "open"),
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
    /* Main decided it's talk: the voice session answers, fast, with the shared
       history. If voice went away meanwhile, main answers the old way. */
    if (result?.talk) {
      logRenderer("delegate.talk_handback", { runId });
      markVoiceLatency("delegate_done", { route: "talk", runId, ok: true, sayChars: 0 });
      if (await answerViaRealtimeChat(text, { force: true })) return;
      const again = await window.brainoMac.delegate(nfShelfWrapPrompt(text), { canTalk: false, reason: "talk_fallback" });
      if (again?.say) { rememberLocalChat("user", text); rememberLocalChat("assistant", again.say); await speak(again.say, { silent: Boolean(options.typed) }); }
      return;
    }
    if (result?.delegateState) pendingDelegateState = result.delegateState;
    else await refreshDelegateState();
    rememberLocalChat("user", text);
    if (result?.say) rememberLocalChat("assistant", result.say);
    noteTurnInRealtime(text, result?.say);
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
    if (result?.superseded && !result?.say) {
      logRenderer("delegate.superseded_quiet", { runId });
      /* Stood down with nothing newer to take over ("not for him"): nothing
         else will replace the thinking sheet, so it is closed here. It hung
         open after "I don't really care about politics" (2026-10-11). */
      if (runId === delegateGeneration) settleQuietStandDown();
      return;
    }
    await speak(result?.say || "Done.", { silent: Boolean(options.typed) });
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
    ? `Music is currently playing in the background (${lastMusicInfo.source === "youtube" ? "YouTube" : lastMusicInfo.source === "music" ? "Apple Music" : "Spotify"}): "${lastMusicInfo.track || "unknown title"}"${lastMusicInfo.artist ? ` by ${lastMusicInfo.artist}` : ""}. You can hear it and may reference it naturally if relevant; you do not need to announce it unprompted.`
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

/* Words the command transcriber should spell right. Names only: a sentence
   in the prompt comes back as a transcript when there is only noise. */
// No "Brainelle": "Braino, Brainelle." is the exact line it wrote over noise.
const COMMAND_VOCABULARY = ["Braino", "Affective", "AffectiveOS", "HERA", "Laya", "Forge", "Mesa", "Cursor", "Claude", "Cowork", "Blinkit", "Uber", "Pinterest", "Medium", "WhatsApp", "Spotify", "YouTube"];
const COMMAND_VOCABULARY_SET = new Set(COMMAND_VOCABULARY.map((w) => w.toLowerCase()));
/* The people you message most, spelled as you save them ("Param", not
   "Parham"). Fetched once an hour; empty if WhatsApp is not on this Mac. */
let commandContactNames = [];
let commandContactNamesAt = 0;
async function refreshCommandContactNames() {
  if (Date.now() - commandContactNamesAt < 3600000) return;
  commandContactNamesAt = Date.now();
  try {
    const names = await window.brainoMac?.topContactNames?.();
    if (Array.isArray(names)) {
      commandContactNames = names.map((n) => String(n || "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim()).filter((n) => n && n.length <= 30).slice(0, 15);
    }
  } catch (_) {}
}
void refreshCommandContactNames();
function commandSpellings() {
  return [...new Set([...COMMAND_VOCABULARY, ...commandContactNames])];
}

/* Nothing but words from that list, two or more of them: the prompt read
   back over noise ("Braino, Brainelle." 2026-09), never a person. */
function isVocabularyEcho(text) {
  const words = String(text || "").toLowerCase().match(/[a-z]+/g) || [];
  const known = new Set([...COMMAND_VOCABULARY_SET, ...commandContactNames.flatMap((n) => n.toLowerCase().match(/[a-z]+/g) || [])]);
  return words.length >= 2 && words.every((w) => known.has(w));
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
        "You cannot act from this conversation. Never say you are opening, clicking, showing, playing or doing anything; the Mac app does actions, not you.",
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
                  // No names and no sentences about them. The transcriber
                  // repeats its prompt when all it hears is noise: "Write
                  // everything in English letters" came back as "Use English as
                  // the language.", a line with "Hey Braino" in it came back as
                  // "Hey Braino", and "Vocabulary: Braino, Brainelle." came
                  // back as "Braino, Brainelle." Other scripts are handled by
                  // BRAINO_SCRIPT_RE instead.
                  /* Every word, not "the command": asked for a command, it
                     wrote a short invented one over 17 seconds of real talk
                     (2026-10-04). The spellings fix "Bruno" for Braino (132
                     times in 30 days) and "effective" for Affective; the
                     echo they could cause is dropped by the word-list echo check. */
                  "Write down exactly what the user says to Braino, every word, in English.",
                  "Ignore music, fans, coughs, accidental noises, and unrelated background speech.",
                  `Spell these as written when you hear them: ${commandSpellings().join(", ")}.`,
                  "Keep names, app names, URLs, file names, and code tokens intact.",
                  "If nobody is clearly speaking, leave it empty.",
                ].join(" "),
          },
          turn_detection: {
            type: "semantic_vad",
            // "low": waits through thinking pauses, still quick on finished sentences.
            eagerness: herMode ? "medium" : "low",
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

/* Two brains answer you: the voice session for quick chat, and main (HIL,
   tools, memory) for everything else. Only the voice session remembers what
   was said in it. 2026-09-26: "How are my commands getting dismissed?" went to
   main and got a real answer; "How do you know that?" went to the voice
   session, which had never heard either, and said "You've been quiet a while."
   So every turn main answers is written into the voice session's conversation
   too, and the follow-up has something to follow. */
let rtLastHeardText = "";
function noteTurnInRealtime(userText, replyText) {
  const you = String(userText || "").trim();
  const him = String(replyText || "").trim();
  if (!you || !him) return;
  /* Your spoken sentence is already in the session (it heard it); only his
     answer is missing. A typed one is missing too. */
  const heard = rtLastHeardText && normalizeForVoiceMatch(rtLastHeardText) === normalizeForVoiceMatch(you);
  const a = heard || sendRealtimeEvent({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: you.slice(0, 1200) }] } });
  const b = a && sendRealtimeEvent({ type: "conversation.item.create", item: { type: "message", role: "assistant", content: [{ type: "output_text", text: him.slice(0, 1500) }] } });
  logRenderer("realtime.turn_noted", { ok: Boolean(a && b), youChars: you.length, himChars: him.length });
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
  /* The timeout settles THIS waiter, never "whichever one is current".
     2026-10-05 23:40: an earlier chat turn's finally nulled the shared slot,
     the timeout then found nothing to resolve, and the turn waited forever:
     stuck on "Thinking", every later sentence dropped as busy, 20 minutes. */
  return new Promise((resolve) => {
    const self = {
      resolve: (result) => {
        window.clearTimeout(timeout);
        resolve(result);
      },
    };
    const timeout = window.setTimeout(() => {
      const result = { status: "timeout", text: realtimeResponseText, errorMessage: "Realtime response timed out." };
      logRenderer("realtime.chat.timeout", { current: realtimeResponseWaiter === self });
      if (realtimeResponseWaiter === self) resolveRealtimeResponse(result);
      else self.resolve(result);
    }, REALTIME_CHAT_RESPONSE_TIMEOUT_MS);
    realtimeResponseWaiter = self;
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
  return /\b(open|launch|start|close|quit|demo|organize|organise|clean|sort|rename|move|delete|trash|create|make|new|create folder|make folder|new folder|undo|find|locate|look for|search for|show me|play|playing|pause|resume|spotify|playlist|volume|vol|sound|louder|quieter|mute|reduce|raise|increase|decrease|lower|percent|seconds?|minutes?|shuffle|repeat|loop|queue|rewind|restart|seek|album|artist|listening to|youtube|song|music|chrome|browser|website|tab|gmail|mail|email|notes|note|maps|calendar|drive|docs|pdf|image|video|file|folder|app|application|send|draft|compose|click|point|where is|reply|write|whatsapp|whats app|remember|remind|timer|countdown|touch id|verify|authenticate|come out|come here|show yourself|step out|join me|go back|go home|get back|head back|head home|tuck in|return home|mesa|coursework|assignment|deadline|ram|cpu|memory|storage|disk|space|battery|charging|plugged in|running out|full|task manager|activity monitor|processes|hogging|eating my|slowing|worth deleting|how many|recover|redundant|bring back|maximize|minimize|snap|half|selected|selection|highlighted|rephrase|rewrite|fix this|mentions|followers|tweet|clip|caption|ship it|x account|ex account|my ex|disturb|bother|check on me|advise|advice|record|recording|meeting|the call|stop recording|wallpaper|desktop background|maps|distance|how far|directions|navigate|route|amazon|shop|options for|research|compare|difference between|send to|my phone|wake word|always listen|call|facetime|face time|dial|watch|tutorial|channel|creator|recommend|read|screen|explain|translate|look at|watching|help me with|summarize|summarise|scroll|download|upload|copy|paste)\b/.test(normalized);
}

async function shouldUseRealtimeDirectChat(text) {
  if (!realtimeActive || !rtDc || rtDc.readyState !== "open") return false;
  // a mode command, or anything while a mode runs, is never small talk
  if (isVoiceModeUtterance(text)) return false;
  if (herMode) return normalizeForVoiceMatch(text).length > 0;
  if (hasPendingDelegateFollowup()) return false;
  if (isLikelyMacActionTranscript(text)) return false;
  /* He asked "What's the plan?" in chat, and the answer, "The plan is that he
     will put you through intensive questioning…", went to the job planner,
     which offered to WhatsApp Param (2026-09-28). An answer to his own chat
     question stays in the chat unless it is plainly an order. */
  /* 2026-10-05: "Okay, how about showing me this one Behance?" went to chat
     here, chat said "Clicking over to Behance now", and the real job only
     started 7 seconds later through the promise net. A request to DO
     something, worded softly, is still a job: it skips this window and goes
     to the router below. */
  if (Date.now() - lastChatQuestionAt < 60000 && !SAID_TO_HIM_ORDER.test(String(text || "").trim())
    && !ASKS_FOR_AN_ACTION.test(String(text || ""))
    /* "What does my day look like today?" right after "What's on your mind?"
       got a guess from chat ("the early access launch?") instead of the
       timetable (5 Oct). A question about his own day, messages or files
       needs his data, which only the brain has. */
    && !ASKS_ABOUT_HIS_DATA.test(String(text || ""))) {
    /* Stage 4: even inside this window, Laya decides (main says oneBrain). */
    const one = await window.brainoMac.wantsBrain?.(text)?.catch?.(() => null);
    if (one?.oneBrain && one.brain) {
      logRenderer("voice.route.brain", { chars: String(text || "").length, oneBrain: true });
      return false;
    }
    logRenderer("voice.route.chat_followup", { chars: String(text || "").length });
    return true;
  }
  /* The same router the typed path uses, asked rather than reimplemented.
   *
   * This function's default was chat, and the main process's default is the
   * brain. Two routers with opposite defaults, so one sentence went two ways
   * depending on which door it came through: "what class do I have next"
   * reached the timetable once and was answered from thin air the next time.
   *
   * isLikelyMacActionTranscript above stays as the cheap local veto for obvious
   * commands. This catches everything it was never written for, which is now
   * most of what Braino can do: a timetable, research, anything needing a tool.
   * A question is not automatically small talk just because it is a question.
   *
   * Fails open to chat, because a routing lookup that breaks should cost a
   * worse answer rather than every utterance.
   */
  try {
    const verdict = await window.brainoMac.wantsBrain?.(text);
    if (verdict?.brain) {
      logRenderer("voice.route.brain", { chars: String(text || "").length });
      return false;
    }
  } catch (error) {
    logRenderer("voice.route.lookup_failed", { error: String(error?.message || error) });
  }
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
  // Awaited, and that matters: this became async when it started asking the main
  // process for the routing decision, and !Promise is always false, so an
  // un-awaited guard here would silently stop guarding anything.
  // force: main already decided this is talk (see result.talk in runDelegate).
  if (!text || !(options.force ? Boolean(realtimeActive && rtDc && rtDc.readyState === "open") : await shouldUseRealtimeDirectChat(text))) return false;
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
  /* Handed back by main as talk (force): HIL already decided it is not a job,
     so asking again could only start the same job twice. */
  const understandingPromise = options.force
    ? Promise.resolve(null)
    : lastUnderstanding.text === text && lastUnderstanding.verdict
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
    if (finalText) void window.brainoMac.noteChat?.({ user: text, assistant: finalText }).catch(() => {});
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
    // He asked something in conversation; the answer is conversation too.
    if (finalText) lastChatQuestionAt = /\?["')\]]*\s*$/.test(finalText.trim()) ? Date.now() : 0;
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
    /* Chat already answered it, fully. "Describe Affective in two sentences"
       got a chat answer and then a second, different one from a job HIL had
       labelled a task (2026-10-11). A promise or a refusal still hands over. */
    const answeredItself = !promised && seen?.kind === "task" && String(finalText || "").length > 40
      && !/\b(?:can'?t|cannot|unable to|not able to|don'?t have (?:access|a way))\b/i.test(String(finalText || ""));
    if (answeredItself) logRenderer("voice.promise.skipped", { why: "chat_answered" });
    if (!promiseEscalated && !answeredItself && (hilTask || promised)) {
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
  voiceStartEnd();
  clearHeldFragment();
  heraVoiceStop("session_end");
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
  cleanEarMeterStop();
  rtDeltaItemId = "";
  rtWaitFinalSince = 0;
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
  if (!options.startingNew) releaseMedia(true, "session_end");
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
  // The next call should be instant too.
  if (hadRealtime && warmVoiceOn()) scheduleVoiceStandby(1500);
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

/* Last resort, and it does not depend on focus, blur or the keyboard working.
   An empty field nobody has touched for a minute is an abandoned field, and it
   sat on screen for twenty nine minutes once. If there is text in it he is
   still thinking, so it stays. */
let typingIdleTimer = 0;

function armTypingIdleClose() {
  if (typingIdleTimer) window.clearTimeout(typingIdleTimer);
  typingIdleTimer = window.setTimeout(() => {
    const field = nfTypeField();
    if (!typingOpen) return;
    if (field && field.value.trim()) { armTypingIdleClose(); return; }
    closeTyping("idle");
  }, 60000);
}

function openTyping(source) {
  const field = nfTypeField();
  if (!field || !notchFaceEnabled || herMode || dictationMode) return false;
  typingOpen = true;
  armTypingIdleClose();
  notchFace.classList.add("nf-typing", "nf-inline-open");
  if (nfInlineCaptionLabelEl) nfInlineCaptionLabelEl.textContent = "You typed";
  if (nfInlineCaptionStateEl) nfInlineCaptionStateEl.textContent = "Typing";
  field.value = "";
  /* The window is unfocusable by default, so focus() here does nothing until
     main hands the keyboard over. Without this the field opened and every
     letter went to whatever app was in front. */
  refitTyping();
  void window.brainoMac.typingFocus?.(true).then(() => {
    window.setTimeout(() => field.focus(), 40);
  }).catch(() => window.setTimeout(() => field.focus(), 40));
  logRenderer("type.open", { source: source || "" });
  updateNotchFace();
  return true;
}

notchFace?.querySelector(".nf-type-field")?.addEventListener("input", () => refitTyping());

function closeTyping(reason) {
  const field = nfTypeField();
  if (!typingOpen) return;
  typingOpen = false;
  if (field) field.style.height = "";
  if (typingIdleTimer) { window.clearTimeout(typingIdleTimer); typingIdleTimer = 0; }
  notchFace.classList.remove("nf-typing");
  if (field) { field.value = ""; field.blur(); }
  void window.brainoMac.typingFocus?.(false).catch(() => {});
  if (nfInlineCaptionLabelEl) nfInlineCaptionLabelEl.textContent = "You said";
  logRenderer("type.close", { reason: reason || "" });
  nfSyncThinkingZone?.();
  updateNotchFace();
}

/* Main saw the window lose focus. The field cannot be typed in or escaped out
   of once that happens, so it goes rather than sitting there. */
window.brainoMac.onTypingDismiss?.(() => {
  if (typingOpen) closeTyping("blur");
  if (nfPanelOpen) void nfClosePanel("blur");
});

async function submitTyped(text) {
  const said = String(text || "").trim();
  if (!said) return;
  console.log(`[Braino ⌨ IN] "${said}"`);
  logRenderer("type.in", { chars: said.length });
  nfSetHeard(said, { durationMs: 1600 });
  closeTyping("submitted");
  if (isStopTalkingPhrase(said)) { stopTalkingNow("typed", said); return; }
  if (isStopTaskPhrase(said)) {
    if (!await stopTaskNow("typed", said)) await nothingToStop("typed", said);
    return;
  }
  const hideAsk = parseMascotHidePhrase(said);
  if (hideAsk) {
    await handleMascotHidePhrase(hideAsk, "", "typed");
    return;
  }
  const stealthAsk = parseStealthPhrase(said);
  if (stealthAsk) {
    await handleStealthPhrase(stealthAsk, "", "typed");
    return;
  }
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
  if (!answered) await runDelegate(said, { keepRealtime: realtimeActive, typed: true });
}

let interjectionInFlight = false;
/* The one question asked about this sentence, kept so the chat path does not
   ask it again three seconds later. */
let lastUnderstanding = { text: "", verdict: null };
/* His name, and nothing else.
 *
 * "Braino" on its own is someone getting his attention, or the mic catching the
 * wake word twice. It is never an instruction, and it destroyed a 34 second
 * research run by being treated as one: it superseded the job, then started a
 * fresh HIL run whose entire command was the word "Braino", which he then
 * reasonably asked a clarifying question about.
 *
 * This was survivable when a turn took under two seconds, because there was
 * barely a window to interrupt. Astra takes five to ten, so every run is long
 * enough to be killed by the next thing the room says. */
/* One name or a string of them: "Braino, Brainelle." is still nobody asking
   for anything. */
const BARE_WAKE_WORD = /^(?:(?:hey|hi|ok|okay|yo)\s+)?(?:brain[oa]|brainelle)(?:[\s.,!?]+(?:(?:hey|hi|ok|okay|yo)\s+)?(?:brain[oa]|brainelle))*\s*[.,!?]*$/i;

function isBareWakeWord(text) {
  return BARE_WAKE_WORD.test(String(text || "").trim());
}

/* Stop the job in flight, now, and say so. Returns false when there was no
   job, so the sentence can carry on to wherever it was going. */
async function stopTaskNow(source, transcript = "") {
  let running = false;
  try {
    running = Boolean((await window.brainoMac.jobRunning())?.running);
  } catch {
    running = false;
  }
  if (!running && !voiceTurnInFlight) {
    /* Nothing running, but the notch may still be stuck in "Thinking" from a
       turn that never came back (6 Oct: 20 minutes, and "stop" did nothing).
       Stop always clears that, even when there is no job. */
    if (processing || realtimeResponseInFlight || nfThinkingShown()) {
      releaseStuckTurn("stop_with_nothing_running");
      if (transcript) await speak("Okay, cleared.");
      return true;
    }
    return false;
  }
  if (transcript) {
    console.log(`[Braino 🎤 IN] "${transcript}" -> stop the task`);
    nfSetHeard(transcript, { durationMs: 1400 });
  }
  const result = await window.brainoMac.stopRunningJob().catch(() => null);
  logRenderer("voice.stop_task", { source, stopped: Boolean(result?.ok), wasRunning: running, hadTurn: voiceTurnInFlight });
  /* Everything that started this job is stale from here. The run comes back
     with an empty "stood down" answer, and without these runDelegate filled the
     silence with "Done." straight after "I stopped the task." */
  delegateGeneration += 1;
  voiceTurnToken += 1;
  voiceTurnInFlight = false;
  processing = false;
  stopSpeechOutput();
  cancelPendingNotchThinking();
  nfSetThinking("");
  setStatus(realtimeActive ? "listening" : "ready", realtimeActive ? "Listening" : "Double Space to show/hide");
  await speak("I stopped the task.");
  return true;
}

/* "Stop the task" with no task. This used to carry on to the chat and the
   planner, which read it as a job: ten seconds of work to stop nothing, then
   his first thought ("The user wants the current task stopped.") read aloud. */
async function nothingToStop(source, transcript = "") {
  logRenderer("voice.stop_task", { source, stopped: false, wasRunning: false, speaking });
  if (transcript) nfSetHeard(transcript, { durationMs: 1400 });
  if (speaking) {
    // "Braino, stop" while he talks means stop talking.
    stopSpeechOutput();
    setStatus(realtimeActive ? "listening" : "ready", realtimeActive ? "Listening" : "Ready");
    return;
  }
  /* No job, but a video or a song playing is the other thing "stop" means.
     Main finds what is actually making the noise and stops that. */
  const media = await window.brainoMac.mediaControl?.({ action: "pause", target: "any" }).catch(() => null);
  if (media?.ok && !media.nothingPlaying) {
    logRenderer("voice.stop_media", { say: String(media.say || "").slice(0, 80) });
    await speak(media.say || "Paused it.");
    return;
  }
  await speak("Nothing's running right now.");
}

async function routeInterjectionIntoRunningJob(transcript) {
  /* His name alone, while he works: handled, so it cannot replace the job.
     With nothing running it is not an interjection at all. Returning true then
     told the caller to show "Working on it", and the notch sat on that with
     no job behind it until someone pressed Stop. The caller's own bare-name
     branch settles it as listening instead. */
  if (isBareWakeWord(transcript)) {
    let busy = voiceTurnInFlight || processing;
    if (!busy) {
      try {
        busy = Boolean((await window.brainoMac.jobRunning())?.running);
      } catch {
        busy = false;
      }
    }
    if (!busy) return false;
    logRenderer("voice.wake_word_only", { ignored: true });
    return true;
  }
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
    logRenderer("voice.interjection", { kind });
    await stopTaskNow("hil_understood");
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
  /* Chat while he is working is a remark, not a new job.
   *
   * It used to fall through here, and the caller reads a false as "not an
   * interjection, so it is a new command", which supersedes the run. So saying
   * anything conversational mid-task killed the task. Every test in the
   * 07-09 session died this way: seventeen seconds, thirty four seconds, six
   * seconds, all of them "stood down, you asked for something else" when
   * nothing else had been asked for.
   *
   * The job is worth more than the remark. A genuinely different JOB still
   * supersedes, which is the behaviour that was actually wanted here. */
  if (kind === "chat") {
    logRenderer("voice.interjection", { kind, told: false, protectedJob: true });
    return true;
  }
  logRenderer("voice.interjection", { kind, told: false });
  return false;
}

/* Is sound actually arriving? A session that opens fine and then hears
   nothing looks identical in the log whether the room was silent, the mic was
   muted, or another app had it. This settles it: the level every 3 seconds for
   the first 30, plus whether macOS muted the track. */
function watchMicLevel(stream) {
  try {
    const track = stream.getAudioTracks()[0];
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let n = 0;
    let loudest = 0;
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let peak = 0;
      let sum = 0;
      for (const v of buf) { const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; }
      loudest = Math.max(loudest, peak);
      logRenderer("realtime.mic.level", {
        peak: Number(peak.toFixed(4)),
        rms: Number(Math.sqrt(sum / buf.length).toFixed(4)),
        trackEnabled: Boolean(track?.enabled),
        trackMuted: Boolean(track?.muted),
        state: track?.readyState || "",
      });
      n += 1;
      if (n >= 10 || track?.readyState === "ended") {
        clearInterval(timer);
        logRenderer("realtime.mic.level_summary", { loudest: Number(loudest.toFixed(4)), silent: loudest < 0.005 });
        void ctx.close().catch(() => {});
      }
    }, 3000);
  } catch (error) {
    logRenderer("realtime.mic.level_failed", { error: String(error?.message || error) });
  }
}

async function flushRealtimeTranscript(reason, textOverride, opts = {}) {
  const separateTurn = Boolean(opts.separateTurn);
  const fromHold = typeof textOverride === "string" && !separateTurn;
  let transcript = String(typeof textOverride === "string" ? textOverride : (rtUserTranscript || "")).trim();
  if (!fromHold && reason === "speech_stopped" && transcript && !rtTranscriptFinal) {
    scheduleRealtimeTranscriptFlush("waiting_final_transcript", REALTIME_TRANSCRIPT_IDLE_FLUSH_MS);
    return;
  }
  /* Clean hearing: partial words never become a command on their own. The
     final transcript carries the confidence the drop check needs, and it
     usually lands within milliseconds of the last partial. */
  if (!fromHold && !separateTurn && !dictationMode && cleanEarApplies() && transcript && !rtTranscriptFinal
    && (reason === "transcript_idle" || reason === "waiting_final_transcript")) {
    if (!rtWaitFinalSince) rtWaitFinalSince = Date.now();
    if (Date.now() - rtWaitFinalSince < CLEAN_EAR_FINAL_WAIT_MS) {
      scheduleRealtimeTranscriptFlush("waiting_final_transcript", 300);
      return;
    }
    logRenderer("clean_ear.final_missing", { waitedMs: Date.now() - rtWaitFinalSince });
  }
  if (!separateTurn) rtWaitFinalSince = 0;
  if (!fromHold && !separateTurn) {
    rtUserTranscript = "";
    rtTranscriptFinal = false;
    clearRealtimeTranscriptFlush();
  }
  // The rest of a held half-sentence: one command. The held part was already
  // accepted, and whatever let it through (his name, the first sentence after
  // a wake) may have passed by now, so the whole line keeps that verdict.
  let heldWasAccepted = fromHold;
  if (!fromHold && !dictationMode && heldFragment) {
    /* A piece held BEFORE it was judged (slow speech, 2026-10-05) has no
       verdict yet: the joined sentence is judged as a whole, so his name
       anywhere in it lets all of it in. */
    const heldAccepted = heldFragment.accepted !== false;
    if (transcript) {
      heldWasAccepted = heldAccepted;
      logRenderer("voice.fragment_joined", { heldWords: heldFragment.text.split(/\s+/).length, gated: heldAccepted ? "after" : "before" });
      transcript = `${heldFragment.text} ${transcript}`.replace(/\s+/g, " ").trim();
      clearHeldFragment();
    } else {
      // A turn with no words (a cough, a breath): the held part goes now.
      const held = heldFragment.text;
      clearHeldFragment();
      void flushRealtimeTranscript("held_fragment", held, heldAccepted ? {} : { separateTurn: true });
      return;
    }
  }
  /* Slow, natural speech (2026-10-05, 07:27): every thinking pause ended a
     turn and each piece was judged alone, so "The good thing is when you
     speak in natural language," and "Okay, and then once that is done" were
     thrown away for having no name in them. An unfinished piece now waits
     for the rest BEFORE it is judged. Never a stop, never his name alone,
     never an answer he is waiting for, never twice past the max hold. */
  if (!fromHold && !separateTurn && !opts.preAccepted && !dictationMode && !herMode && transcript
    && !namedAnswerWindowOpen() && !hasPendingDelegateFollowup()
    && !isBareWakeWord(transcript) && !BARGE_STOP.test(transcript) && !VOICE_FILLER_ONLY.test(transcript)
    && !isStopTaskPhrase(transcript, { jobRunning: voiceTurnInFlight }) && !isStopListeningPhrase(transcript)
    && !parseStealthPhrase(transcript) && !parseMascotHidePhrase(transcript)
    && looksUnfinished(transcript)) {
    nfSetHeard(transcript);
    holdFragment(transcript, { accepted: false });
    return;
  }
  const accepted = dictationMode
    ? Boolean(transcript)
    : ((heldWasAccepted || opts.preAccepted) ? Boolean(transcript) : shouldAcceptVoiceTranscript(transcript));
  // That sentence has been judged; the next one is judged on its own start.
  if (transcript) namedSpeechAwake = false;
  /* Your half of the exchange. His reply to it opens the follow-up window. */
  if (accepted && !dictationMode) { lastUserTurnAt = Date.now(); rtLastHeardText = transcript; }
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
  // OpenAI decided whether this was for him; HERA says what the words were.
  // Typed words are exact: never swap them for a transcriber's version.
  if (accepted && !opts.fromHera && !opts.typed) transcript = await heraCommandText(transcript);
  else if (heraVoice.on) heraVoice.turnRotate = null;
  if (isStopListeningPhrase(transcript)) {
    console.log(`[Braino 🎤 IN] "${transcript}" -> stop listening`);
    logRenderer("voice.stop_phrase", { transcript: transcript.slice(0, 160), voiceTurnInFlight });
    nfSetHeard(transcript, { durationMs: 1200 });
    voiceTurnInFlight = false;
    ambientQuietUntil = Date.now() + AMBIENT_AWAKE_WINDOW_MS;
    stopListeningNow("voice_phrase");
    return;
  }
  if (isStopTalkingPhrase(transcript)) { voiceTurnInFlight = false; stopTalkingNow("voice", transcript); return; }
  if (isStopTaskPhrase(transcript, { jobRunning: voiceTurnInFlight })) {
    if (await stopTaskNow("voice_phrase", transcript)) return;
    if (accepted) {
      await nothingToStop("voice_phrase", transcript);
      return;
    }
  }
  const hideAsk = accepted ? parseMascotHidePhrase(transcript) : "";
  if (hideAsk) {
    await handleMascotHidePhrase(hideAsk, transcript, "voice");
    return;
  }
  const stealthAsk = accepted ? parseStealthPhrase(transcript) : "";
  if (stealthAsk) {
    await handleStealthPhrase(stealthAsk, transcript, "voice");
    return;
  }
  /* Half a sentence waits for the rest. Not an answer to his question or a
     follow-up he is waiting on — those are often a single word — and never
     twice. */
  const answering = namedAnswerWindowOpen();
  if (accepted && !dictationMode && !fromHold && !separateTurn && !answering && !hasPendingDelegateFollowup()
    && !isBareWakeWord(transcript) && looksUnfinished(transcript)) {
    nfSetHeard(transcript);
    holdFragment(transcript, { accepted: true });
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
  /* Nothing to do with a running job: his name alone is never a command, so it
     must not start a run either. The log had hil.loop.start with command
     "Braino", which is a whole model call spent asking what was meant. */
  if (isBareWakeWord(transcript)) {
    logRenderer("voice.wake_word_only", { ignored: true, hadJob: voiceTurnInFlight });
    setStatus(voiceTurnInFlight ? "thinking" : "listening", voiceTurnInFlight ? "Working on it" : "Listening");
    return;
  }

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
  releaseMediaForTurn(transcript);
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
          // Through the avatar, never straight to the character: setting only
          // the character is what put her voice in Braino's body.
          setMascotChoice(charCmd);
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
        await runDelegate(resumed, { keepRealtime: true, typed: Boolean(opts.typed) });
        return;
      }
      if (await shouldUseRealtimeDirectChat(turnText)) {
        const handled = await answerViaRealtimeChat(turnText);
        if (handled) return;
        logRenderer("realtime.chat.fallback_to_delegate", {
          transcriptChars: turnText.length,
          ...voiceLatencySnapshot(),
        });
      }
      await runDelegate(turnText, { keepRealtime: true, typed: Boolean(opts.typed) });
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

/* ── Clean hearing (switch: brainoCleanEar, on unless set to "0") ──────────
 *
 * The 2026-10-04 audit: words you never said came from three places. His own
 * voice leaking past the browser's echo cancelling (a 14.5s "turn" inside a
 * 47s answer), room sound the transcriber turned into words ("Gelek",
 * "Opsiona", "Open the door"), and a late transcript landing on the next turn.
 * So, in voice mode only (never dictation, never her mode):
 *   1. the mic sends nothing while he is audible, plus a short ring-out tail.
 *      "Stop" still cuts him off through HERA, which hears it on the Mac;
 *   2. a turn the mic never heard a voice in is dropped, and so is one the
 *      transcriber itself was unsure of (its own word confidence);
 *   3. each transcript stays with the turn it belongs to.
 * Off, every line below is skipped and voice behaves exactly as before. */
const CLEAN_EAR_ECHO_TAIL_MS = 450;
const CLEAN_EAR_MIN_RMS = 0.008;
const CLEAN_EAR_FLOOR_X = 2.5;
/* Never higher than this, and the room is only learned from quiet samples:
   45 seconds of nonstop talk taught the floor his voice, and the turn came
   back "no voice on the mic" (2026-10-04, 21:05). */
const CLEAN_EAR_MAX_THRESHOLD = 0.02;
const CLEAN_EAR_FLOOR_LEARN_BELOW = 0.012;
const CLEAN_EAR_MIN_VOICED = 3; // 50ms samples, so 150ms of voice
const CLEAN_EAR_MIN_LOGPROB = -1.0;
const CLEAN_EAR_FINAL_WAIT_MS = 3000;
const CLEAN_EAR_INCLUDE_EVENT_ID = "clean_ear_include";
let cleanEarMuted = false;
let cleanEarMeter = null;
let rtDeltaItemId = "";
/* Turns already sent from HERA's words. OpenAI's transcript of them is only
   logged next to HERA's, never sent: one source, no second wait. */
const heraSentItems = new Set();
const HERA_SENDS_COMMAND = false;
const HERA_DIRECT_WAIT_MS = 350;
let rtWaitFinalSince = 0;

function cleanEarOn() { try { return localStorage.getItem("brainoCleanEar") !== "0"; } catch (_) { return true; } }
function cleanEarApplies() { return cleanEarOn() && !dictationMode && !herMode; }
function cleanEarMuteWhileSpeaking() { try { return localStorage.getItem("brainoMuteWhileSpeaking") === "1"; } catch (_) { return false; } }

/* Muted only while his voice is ACTUALLY coming out of the speakers, judged
   from the audio elements themselves, never from the "speaking" flags.
   2026-10-05 00:24: a flag stayed set after a chat reply was handed to the
   delegate, and the mic stayed shut for 85 seconds: he was deaf until the
   hotkey. A stuck flag can no longer do that; it is logged instead. */
let cleanEarLastPlayingAt = 0;
/* The system voice plays outside this page, so no audio element shows it. */
let speechViaSystemSayUntil = 0;
const STUCK_SPEAKING_MS = 6000;
let speakingFlagSince = 0;

/* A turn stuck "in flight" (6 Oct, 23:40): a quick-chat reply never came back,
   so processing / voiceTurnInFlight / realtimeResponseInFlight stayed on. That
   one state showed "Thinking" for 20 minutes, made him treat himself as busy
   and ignore everything not said to him, and made "stop" find nothing to stop.
   Nothing playing, nothing streaming in, and no job running in main for 45
   seconds: the turn is over, whatever it was waiting for. */
const STUCK_TURN_MS = 45000;
let stuckTurnSince = 0;
let stuckTurnChecking = false;
let lastReplyActivityAt = 0;
function releaseStuckTurn(reason) {
  logRenderer("turn.stuck_released", { reason, processing, voiceTurnInFlight, realtimeResponseInFlight, stuckMs: stuckTurnSince ? Date.now() - stuckTurnSince : 0 });
  stuckTurnSince = 0;
  delegateGeneration += 1;
  voiceTurnToken += 1;
  voiceTurnInFlight = false;
  processing = false;
  if (realtimeResponseInFlight) { try { resolveRealtimeResponse({ status: "cancelled", text: realtimeResponseText, errorMessage: reason }); } catch (_) {} }
  realtimeResponseInFlight = false;
  try { cancelPendingNotchThinking(); } catch (_) {}
  try { nfSetThinking(""); } catch (_) {}
  setStatus(realtimeActive ? "listening" : "ready", realtimeActive ? "Listening" : "Double Space to show/hide");
}
async function checkStuckTurn(now, playing) {
  const inFlight = processing || voiceTurnInFlight || realtimeResponseInFlight;
  if (!inFlight || playing || now - lastReplyActivityAt < STUCK_TURN_MS) { if (!inFlight) stuckTurnSince = 0; return; }
  if (!stuckTurnSince) { stuckTurnSince = now; return; }
  if (now - stuckTurnSince < STUCK_TURN_MS || stuckTurnChecking) return;
  stuckTurnChecking = true;
  try {
    const job = await window.brainoMac.jobRunning().catch(() => null);
    if (job?.running) { stuckTurnSince = now; return; } // a real job is working: not stuck
    releaseStuckTurn("watchdog");
  } finally { stuckTurnChecking = false; }
}

/* `speaking` stuck on with nothing playing (2026-10-05, 07:17-07:20 and
   00:24): a reply handed to the delegate, or a playback promise that never
   settled, skipped every reset. While stuck, "Hey Braino" was taken for his
   own voice and other voices only ducked him. Nothing playing, nothing being
   fetched, no system voice, for six seconds: he is not speaking. */
function releaseStuckSpeakingFlag(now, playing) {
  const flagged = (speaking && !speakingSilently) || Boolean(activeSpeechJobGeneration) || Boolean(realtimeStreamTts);
  const busy = playing || speakingSilently || ttsAbortControllers.size > 0 || now < speechViaSystemSayUntil || realtimeResponseInFlight;
  if (!flagged || busy) { speakingFlagSince = 0; return; }
  if (!speakingFlagSince) { speakingFlagSince = now; return; }
  if (now - speakingFlagSince < STUCK_SPEAKING_MS || now - cleanEarLastPlayingAt < STUCK_SPEAKING_MS) return;
  logRenderer("speech.stuck_flag_released", {
    speaking, activeSpeechJobGeneration, hasStream: Boolean(realtimeStreamTts), stuckMs: now - speakingFlagSince,
  });
  speakingFlagSince = 0;
  speaking = false;
  activeSpeechJobGeneration = 0;
  realtimeStreamTts = null;
  noteSpeechEnded();
  setTalk(false);
  if (realtimeActive && !processing) setStatus("listening", "Listening");
}
let cleanEarStaleLogged = false;
function cleanEarAudioPlaying() {
  if (realtimeVoiceEngine === "realtime") return brainoAudible();
  const playing = (audio) => Boolean(audio) && !audio.paused && !audio.ended;
  if (playing(currentSpeechAudio)) return true;
  for (const audio of activeSpeechAudios) if (playing(audio)) return true;
  return false;
}

window.setInterval(() => {
  const now = Date.now();
  const playing = cleanEarAudioPlaying();
  if (playing) { cleanEarLastPlayingAt = now; cleanEarStaleLogged = false; }
  else if (brainoAudible() && now - cleanEarLastPlayingAt > 5000 && speakingFlagSince && now - speakingFlagSince > 5000 && !cleanEarStaleLogged) {
    cleanEarStaleLogged = true;
    logRenderer("clean_ear.stale_audible", {
      speaking, speakingSilently, activeSpeechJobGeneration,
      hasStream: Boolean(realtimeStreamTts), audios: activeSpeechAudios.size, hasCurrent: Boolean(currentSpeechAudio),
    });
  }
  releaseStuckSpeakingFlag(now, playing);
  void checkStuckTurn(now, playing);
  const tail = cleanEarLastPlayingAt && now - cleanEarLastPlayingAt < CLEAN_EAR_ECHO_TAIL_MS;
  /* The mic stays OPEN while he speaks (5 Oct). Muting it here meant you could
     not talk over him at all, which was the first thing Braino ever got right.
     His own words coming back are already dropped by isSelfEcho. Muting is
     opt-in: localStorage brainoMuteWhileSpeaking = "1". */
  const want = Boolean(rtMic) && realtimeActive && cleanEarApplies() && cleanEarMuteWhileSpeaking() && (playing || Boolean(tail));
  if (want === cleanEarMuted) return;
  cleanEarMuted = want;
  setRealtimeMicEnabled(!want);
  logRenderer("clean_ear.mic", { muted: want });
}, 80);

/* The voice glow: a soft light inside the notch edge that follows your
   voice while you speak, so you can see he hears you without rough words.
   Same notch shape, nothing outside it. */
let cleanEarGlowLevel = 0;
function cleanEarPaintVoiceGlow(rms) {
  const face = document.getElementById("notch-face");
  if (!face) return;
  const on = cleanEarApplies() && rtUserSpeakingNow && !cleanEarMuted;
  const target = on ? Math.min(1, Math.max(0, (rms - CLEAN_EAR_MIN_RMS) / 0.08)) : 0;
  cleanEarGlowLevel += (target - cleanEarGlowLevel) * 0.35;
  face.classList.toggle("nf-voice-hearing", on);
  face.style.setProperty("--nf-voice-level", cleanEarGlowLevel.toFixed(3));
}

function cleanEarMeterStop() {
  const meter = cleanEarMeter;
  cleanEarMeter = null;
  if (!meter) return;
  window.clearInterval(meter.timer);
  void meter.ctx.close().catch(() => {});
  document.getElementById("notch-face")?.classList.remove("nf-voice-hearing");
}

/* What the mic itself heard, 20 times a second, for the last minute. */
function cleanEarMeterStart(stream) {
  cleanEarMeterStop();
  try {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const meter = { ctx, analyser, buf: new Float32Array(analyser.fftSize), floor: 0.004, samples: [], timer: 0, everHeard: false };
    meter.timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(meter.buf);
      let power = 0;
      for (const v of meter.buf) power += v * v;
      const rms = Math.sqrt(power / meter.buf.length);
      if (rms > 0) meter.everHeard = true;
      const threshold = Math.min(CLEAN_EAR_MAX_THRESHOLD, Math.max(CLEAN_EAR_MIN_RMS, meter.floor * CLEAN_EAR_FLOOR_X));
      const voiced = !cleanEarMuted && rms >= threshold;
      if (!voiced && !cleanEarMuted && rms > 0 && rms < CLEAN_EAR_FLOOR_LEARN_BELOW) meter.floor = (meter.floor * 0.97) + (rms * 0.03);
      const now = Date.now();
      meter.samples.push([now, voiced ? 1 : 0]);
      cleanEarPaintVoiceGlow(rms);
      while (meter.samples.length && now - meter.samples[0][0] > 60000) meter.samples.shift();
    }, 50);
    void ctx.resume().catch(() => {});
    cleanEarMeter = meter;
    logRenderer("clean_ear.meter_started", { state: ctx.state });
  } catch (error) {
    logRenderer("clean_ear.meter_failed", { error: errorForLog(error) });
  }
}

/* Voiced samples during the current turn, or null when the meter cannot be
   trusted (none, or it has only ever read silence): no meter never drops. */
let cleanEarMeterWhy = "";
function cleanEarVoicedSamples() {
  const meter = cleanEarMeter;
  cleanEarMeterWhy = !meter ? "no_meter" : !meter.everHeard ? `silent_${meter.ctx?.state}_${meter.samples.length}` : !rtSpeechStartedAt ? "no_start" : "";
  if (cleanEarMeterWhy) return null;
  const now = Date.now();
  const from = rtSpeechStartedAt - 700;
  const to = (rtUserStoppedAt > rtSpeechStartedAt ? rtUserStoppedAt : now) + 300;
  const inTurn = meter.samples.filter(([t]) => t >= from && t <= to);
  if (inTurn.length < 3) { cleanEarMeterWhy = `few_${inTurn.length}_of_${meter.samples.length}`; return null; }
  return inTurn.reduce((sum, [, voiced]) => sum + voiced, 0);
}

/* What you saw is what is sent, the moment you stop (2026-10-04): no waiting
   for OpenAI's transcript, then swapping words in front of you. Only when
   the sentence is clearly allowed in without the name check, because HERA
   writes "Braino" as "we don't"; otherwise OpenAI's path runs as before. */
/* Mostly words he is not saying = a person, not his voice through the
   speakers. With no line of his known, never: a guess here cuts him off. */
function heraTalksOverHim(text) {
  const heard = normalizeForVoiceMatch(text).split(" ").filter(Boolean);
  if (heard.length < 3) return false;
  const his = new Set(`${lastSpokenLine.text || ""} ${normalizeForVoiceMatch(realtimeResponseText || "")}`.split(" ").filter(Boolean));
  if (!his.size) return false;
  const yours = heard.filter((word) => !his.has(word)).length;
  return yours / heard.length >= 0.6;
}

/* The same "was it said to him" test the transcript path uses for barge-in. */
function heraMeantForHim(text) {
  const soFar = String(text || "").trim();
  return voiceExplicitlyAddressesBraino(soFar) || BARGE_STOP.test(soFar)
    || (soFar.split(/\s+/).length >= 2 && saidToBraino(soFar) && !isSelfEcho(soFar));
}

function heraDirectAllowed(text) {
  if (!namedModeOn || herMode) return true;
  if (namedHeardOnDeviceAt > 0 && Date.now() - namedHeardOnDeviceAt <= NAMED_ON_DEVICE_MATCH_MS) return true;
  if (voiceExplicitlyAddressesBraino(text)) return true;
  return namedWindowOpen() || answersHisQuestion(text) || followsHisReply(text) || hasPendingDelegateFollowup();
}

/* HERA turns waiting only for OpenAI to confirm the name, and OpenAI copies
   that arrived first. OpenAI's words are a yes/no on "was he addressed",
   never shown and never sent: one text on screen, one text sent. */
const heraAwaitingName = new Map();
const heraOpenaiCopy = new Map();

function heraSendAfterName(itemId, heraText, openaiText) {
  const ok = Boolean(String(openaiText || "").trim()) && shouldAcceptVoiceTranscript(openaiText);
  logRenderer("voice.hera_name_check", { ok, openai: String(openaiText || "").slice(0, 200) });
  if (ok) void flushRealtimeTranscript("hera_after_name", heraText, { separateTurn: true, fromHera: true, preAccepted: true });
  else setStatus("listening", "Listening");
}

async function heraDirectTurn(itemId, liveText, request) {
  if (!itemId) return;
  // From here OpenAI never paints or sends this turn.
  heraSentItems.add(itemId);
  const startedAt = Date.now();
  // The closing segment is HERA's final decode of the turn; a moment, never longer.
  while (request && !request.done && Date.now() - startedAt < HERA_DIRECT_WAIT_MS) {
    await new Promise((resolve) => window.setTimeout(resolve, 40));
  }
  const words = (value) => String(value || "").trim().split(/\s+/).filter(Boolean).length;
  const segment = String(request?.text || "").trim();
  const text = segment && words(segment) >= words(liveText) * 0.8 ? segment : liveText;
  const voiced = cleanEarVoicedSamples();
  if (voiced !== null && voiced < CLEAN_EAR_MIN_VOICED) {
    logRenderer("clean_ear.turn", { source: "hera", voiced, drop: true, why: "no_voice_on_mic", text: text.slice(0, 120) });
    return;
  }
  heraVoice.turnText = "";
  // Checked after the wait, so the on-device name match has had its moment.
  if (heraDirectAllowed(text)) {
    logRenderer("voice.hera_direct", { waitedMs: Date.now() - startedAt, voiced, words: words(text), hera: text.slice(0, 400) });
    void flushRealtimeTranscript("hera_direct", text, { separateTurn: true, fromHera: true });
    return;
  }
  if (heraOpenaiCopy.has(itemId)) {
    const openaiText = heraOpenaiCopy.get(itemId);
    heraOpenaiCopy.delete(itemId);
    heraSendAfterName(itemId, text, openaiText);
    return;
  }
  heraAwaitingName.set(itemId, text);
  logRenderer("voice.hera_waiting_name", { words: words(text), hera: text.slice(0, 400) });
}

const CLEAN_EAR_MAX_TURN_WORDS = 150;

function cleanEarVerdict(event, text, { localWindow, heraWords = 0 }) {
  const value = String(text || "").trim();
  if (!value) return { drop: false };
  const logprobs = Array.isArray(event?.logprobs)
    ? event.logprobs.map((entry) => Number(entry?.logprob)).filter(Number.isFinite)
    : [];
  const meanLogprob = logprobs.length ? logprobs.reduce((a, b) => a + b, 0) / logprobs.length : null;
  const voiced = localWindow ? cleanEarVoicedSamples() : null;
  let why = "";
  if (voiced !== null && voiced < CLEAN_EAR_MIN_VOICED) why = "no_voice_on_mic";
  // OpenAI unsure of its own words is not "nobody spoke" when HERA heard a sentence.
  else if (meanLogprob !== null && meanLogprob < CLEAN_EAR_MIN_LOGPROB && heraWords < 3) why = "transcriber_unsure";
  // Nobody speaks 150 words in one turn to an assistant: that is a video or
  // a call playing nearby. Dictation is the one place long speech is real.
  else if (!dictationMode && value.split(/\s+/).length > CLEAN_EAR_MAX_TURN_WORDS) why = "too_long_media_audio";
  logRenderer("clean_ear.turn", {
    meanLogprob: meanLogprob === null ? null : Number(meanLogprob.toFixed(3)),
    voiced,
    heraWords: heraWords || undefined,
    meter: voiced === null && localWindow ? cleanEarMeterWhy : undefined,
    words: value.split(/\s+/).length,
    drop: Boolean(why),
    why: why || undefined,
    // Dropped lines in full, so a real sentence eaten by this is visible.
    text: why ? value.slice(0, 120) : undefined,
  });
  return { drop: Boolean(why), why };
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
    try { window.brainoMac?.noteSpeechStarted?.(); } catch (_) {}
    markRealtimeActivity("speech_started", { schedule: false });
    startVoiceLatencyTurn("speech_started");
    if (dictationMode) {
      dictationSpeechActive = true;
    } else {
      rtUserTranscript = "";
      rtTranscriptFinal = false;
      clearRealtimeTranscriptFlush();
      rtUserSpeakingNow = true;
      rtSpeechStartedAt = Date.now();
      rtSpeechAudioStartMs = Number.isFinite(event.audio_start_ms) ? event.audio_start_ms : null;
      if (heraVoice.on) {
        heraVoice.userSpeaking = true;
        heraVoice.sawOpenAiSpeech = true;
      }
      /* Speech that starts only because he is talking or working is not a
         sentence you began while he was listening for you: that is the room
         talking over him, and it has to earn its way in like any other. */
      if (namedModeOn && namedWindowOpen() && !namedBusyOnly()) namedSpeechAwake = true;
      if (mediaHeld) armMediaHoldTimer(MEDIA_HOLD_SPEAKING_MS, "no_turn");
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
    /* A voice started while he is talking. In a room that is usually not you:
       84 cut-offs on 2026-09-25, 82 of them by other voices. So he lowers his
       voice and listens; the words decide (see the transcript delta below).
       Only with named mode off, or in dictation, does sound alone still stop him. */
    if (audiblyTalking && namedModeOn && !herMode && !dictationMode) {
      duckSpeech(true, "speech_started");
      return;
    }
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
      // His voice is in HERA's segment; drop it. The reset can eat your first
      // words, so the next segment is not trusted as a command either.
      heraVoiceRotate("barge_in", { clipsNext: true });
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
    rtUserSpeakingNow = false;
    rtUserStoppedAt = Date.now();
    // The audio clock when OpenAI sends it, our own clock when it does not.
    if (rtSpeechStartedAt) {
      rtLastSpeechMs = Math.max(0, Number.isFinite(event.audio_end_ms) && rtSpeechAudioStartMs !== null
        ? event.audio_end_ms - rtSpeechAudioStartMs
        : Date.now() - rtSpeechStartedAt);
    }
    // One HERA segment per turn: the words of this turn, closed at the pause.
    if (!dictationMode && heraVoice.on) {
      heraVoice.userSpeaking = false;
      if (heraVoice.early) {
        heraVoice.earlyText = heraVoiceLiveText();
        heraVoice.early = false;
      }
      // The turn's words as HERA heard them, kept only if his voice was not in them.
      const heraClean = !heraVoice.dirty && !heraVoice.clipped;
      const heraLive = heraClean ? heraVoiceLiveText() : "";
      heraVoice.turnText = heraLive;
      const heraRequest = heraVoiceRotate("turn_end");
      /* Off (2026-10-05, 21:42 UTC): sent as the command, HERA turned "Braino"
         into "you know" and "tabs" into "tariffs", and OpenAI had every word
         right. HERA shows your words live; OpenAI's words are what is sent. */
      if (HERA_SENDS_COMMAND && heraLive && cleanEarApplies()) void heraDirectTurn(event.item_id, heraLive, heraRequest);
    }
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
    if (!dictationMode && heraSentItems.has(String(event.item_id || ""))) return;
    if (delta && !dictationMode && cleanEarApplies() && event.item_id && event.item_id !== rtDeltaItemId) {
      // A new turn's first words: the last turn's partial text is not this one's.
      if (rtDeltaItemId) rtUserTranscript = "";
      rtDeltaItemId = event.item_id;
    }
    if (delta) {
      /* Noise that came back as words ("C++" out of four seconds of room
         sound) neither cuts him off nor shows up as something you said. The
         flush drops it; this keeps it off the screen on the way there. */
      const noiseSoFar = !dictationMode && namedModeOn && !herMode
        && looksLikeNoise(`${rtUserTranscript}${delta}`, rtLastSpeechMs);
      // Second tripwire: if user words are arriving while any audio is still
      // playing, cut the speech even if speech_started was missed or mishandled.
      const soFar = `${rtUserTranscript}${delta}`.trim();
      const meantForHim = !namedModeOn || herMode || dictationMode
        || voiceExplicitlyAddressesBraino(soFar) || BARGE_STOP.test(soFar)
        || (soFar.split(/\s+/).length >= 2 && saidToBraino(soFar) && !isSelfEcho(soFar));
      // His name inside a session that is already open (a follow-up, or the
      // wake helper resting): the room goes quiet the moment he hears it.
      if (!noiseSoFar && !mediaHeld && !dictationMode && voiceExplicitlyAddressesBraino(soFar) && !isSelfEcho(soFar)) {
        holdMedia("name_live");
      }
      if (!noiseSoFar && !meantForHim && (speaking || currentSpeechAudio || realtimeStreamTts)) {
        // Someone else talking, or his own voice: keep going, a little quieter.
        duckSpeech(true, "not_for_him");
      } else if (!noiseSoFar && (speaking || currentSpeechAudio || realtimeStreamTts)) {
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
        // HERA is already showing these words, earlier; two sources in one box flicker.
        if (!heraVoice.on && !noiseSoFar && !cleanEarApplies()) nfSetHeard(rtUserTranscript.trim());
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
    if (cleanEarApplies() && heraSentItems.has(String(event.item_id || ""))) {
      const itemId = String(event.item_id || "");
      heraSentItems.delete(itemId);
      const openaiText = String(event.transcript || "");
      logRenderer("voice.compare", { openai: openaiText.slice(0, 400) });
      if (rtDeltaItemId === itemId) { rtDeltaItemId = ""; rtUserTranscript = ""; }
      if (heraAwaitingName.has(itemId)) {
        const heraText = heraAwaitingName.get(itemId);
        heraAwaitingName.delete(itemId);
        heraSendAfterName(itemId, heraText, openaiText);
      } else {
        // HERA is still finishing this turn; it reads this when it is done.
        heraOpenaiCopy.set(itemId, openaiText);
        window.setTimeout(() => heraOpenaiCopy.delete(itemId), 5000);
      }
      return;
    }
    if (cleanEarApplies()) {
      let text = String(event.transcript || rtUserTranscript || "");
      const itemId = String(event.item_id || "");
      // A newer turn's words are already arriving: this one is judged and sent on its own.
      const earlierTurn = Boolean(itemId && rtDeltaItemId && itemId !== rtDeltaItemId);
      const heraWords = earlierTurn ? 0 : String(heraVoice.turnText || "").trim().split(/\s+/).filter(Boolean).length;
      if (cleanEarVerdict(event, text, { localWindow: !earlierTurn, heraWords }).drop) text = "";
      if (earlierTurn) {
        if (text.trim()) void flushRealtimeTranscript("completed_earlier_turn", text, { separateTurn: true });
        return;
      }
      rtDeltaItemId = "";
      rtUserTranscript = text;
    } else {
      rtUserTranscript = String(event.transcript || rtUserTranscript || "");
    }
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
      lastReplyActivityAt = Date.now();
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

  if (event.type === "error" && event.error?.event_id === CLEAN_EAR_INCLUDE_EVENT_ID) {
    // Confidence scores refused: clean hearing carries on with the mic check alone.
    logRenderer("clean_ear.confidence_unavailable", { message: event.error?.message || "" });
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

/* ── A voice session kept ready ──────────────────────────────────────────
   Calling him used to open a session from nothing: 3.3s asking OpenAI for it,
   0.7s connecting, 4.3s in all (measured 2026-09-26). Now one is opened in the
   background and kept connected with NO microphone on it, so nothing is sent
   until you call him. Calling him puts the mic on it: about 0.1s.
   Renewed every 20 minutes and after each use, rebuilt if it drops. Off with
   localStorage brainoWarmVoice = "0"; then every call opens a session as before. */
const VOICE_STANDBY_REFRESH_MS = 20 * 60 * 1000;
let voiceStandby = null;
let voiceStandbyCreating = false;
let voiceStandbyTimer = 0;
function warmVoiceOn() { try { return localStorage.getItem("brainoWarmVoice") !== "0"; } catch (_) { return true; } }
function takeVoiceStandby() {
  const sb = voiceStandby;
  voiceStandby = null;
  if (!sb) return null;
  if (sb.dc?.readyState !== "open" || !["connected", "connecting"].includes(sb.pc?.connectionState) || Date.now() - sb.readyAt > VOICE_STANDBY_REFRESH_MS + 60000) {
    dropVoiceStandby(sb, "stale");
    return null;
  }
  if (sb.refreshTimer) window.clearTimeout(sb.refreshTimer);
  return sb;
}
function dropVoiceStandby(sb, reason) {
  if (!sb) return;
  if (voiceStandby === sb) voiceStandby = null;
  if (sb.refreshTimer) window.clearTimeout(sb.refreshTimer);
  try { sb.dc?.close(); } catch (_) {}
  try { sb.pc?.close(); } catch (_) {}
  logRenderer("realtime.standby.dropped", { reason });
}
function scheduleVoiceStandby(delayMs = 1500) {
  if (voiceStandbyTimer) window.clearTimeout(voiceStandbyTimer);
  voiceStandbyTimer = window.setTimeout(() => { voiceStandbyTimer = 0; void createVoiceStandby(); }, delayMs);
}
async function createVoiceStandby() {
  if (!warmVoiceOn() || voiceStandby || voiceStandbyCreating) return;
  // One session at a time: while he is listening, the next one waits.
  if (realtimeActive || realtimeConnecting || dictationMode || dictationStarting) return;
  const auth = await window.brainoMac.authStatus?.().catch(() => null);
  if (!auth?.authenticated) return; // never ask you to sign in for this
  voiceStandbyCreating = true;
  const t = Date.now();
  const sb = { pc: null, dc: null, sender: null, remoteStream: null, result: null, adopted: false, readyAt: 0, refreshTimer: 0 };
  try {
    const pc = new RTCPeerConnection();
    sb.pc = pc;
    sb.sender = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
    pc.addEventListener("track", (event) => {
      sb.remoteStream = event.streams[0] || new MediaStream([event.track]);
      if (sb.adopted && rtRemoteAudio && pc === rtPc) { rtRemoteAudio.srcObject = sb.remoteStream; rtRemoteAudio.play().catch(() => {}); }
    });
    pc.addEventListener("connectionstatechange", () => {
      const state = pc.connectionState;
      if (!["failed", "disconnected", "closed"].includes(state)) return;
      if (sb.adopted) {
        if (pc !== rtPc) return;
        logRenderer("realtime.peer.state", { state });
        stopRealtimeVoice();
        setStatus("error", "Voice disconnected");
        setBubble("Voice disconnected. Double Control wakes me again.", 3200);
      } else if (voiceStandby === sb) {
        dropVoiceStandby(sb, `peer_${state}`);
        scheduleVoiceStandby(5000);
      }
    });
    const dc = pc.createDataChannel("oai-events");
    sb.dc = dc;
    dc.addEventListener("message", (event) => {
      if (!sb.adopted) return; // nothing happens in a session nobody is using
      try { handleRealtimeEvent(JSON.parse(event.data)); } catch (_) {}
    });
    dc.addEventListener("close", () => { if (sb.adopted) logRenderer("realtime.datachannel.close"); });
    const offerSdp = await createLocalRealtimeOffer(pc);
    const result = await window.brainoMac.createRealtimeCall({ offerSdp, voiceEngine: realtimeVoiceEngine, purpose: "voice" });
    if (!result?.ok || !result.answerSdp) throw new Error(result?.error || "standby could not start");
    await pc.setRemoteDescription({ type: "answer", sdp: result.answerSdp });
    await waitForRealtimeDataChannel(dc, () => true);
    if (realtimeActive || realtimeConnecting) { dropVoiceStandby(sb, "voice_started_meanwhile"); return; }
    sb.result = result;
    sb.readyAt = Date.now();
    sb.refreshTimer = window.setTimeout(() => {
      if (voiceStandby !== sb) return;
      dropVoiceStandby(sb, "refresh");
      void createVoiceStandby();
    }, VOICE_STANDBY_REFRESH_MS);
    voiceStandby = sb;
    logRenderer("realtime.standby.ready", { ms: Date.now() - t });
  } catch (error) {
    try { sb.pc?.close(); } catch (_) {}
    logRenderer("realtime.standby.failed", { error: errorForLog(error) });
    scheduleVoiceStandby(30000);
  } finally {
    voiceStandbyCreating = false;
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
  // Clearing the old session before a new one is not the end of this one:
  // the music he just paused for you must stay paused.
  stopRealtimeVoice({ keepDictation: isDictation, startingNew: true });
  const startGeneration = ++realtimeStartGeneration;
  realtimeConnecting = true;
  listening = true;
  /* Already connected (the ready session): no "waking" and no "you can speak
     now", because there is nothing to wait for. He just glows and listens. */
  const warm = !isDictation && Boolean(voiceStandby && voiceStandby.dc?.readyState === "open");
  if (warm) {
    setStatus("listening", "Listening");
  } else {
    setStatus("connecting", isDictation ? "Starting BrainoHERA" : "Waking voice");
    if (!isDictation) voiceStartBegin();
    if (!isDictation) setBubble("Voice is waking up.", 1300);
  }
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
    if (!isDictation) watchMicLevel(stream);
    if (!isDictation) cleanEarMeterStart(stream);
    logRenderer("realtime.mic.ok", {
      audioTracks: stream.getAudioTracks().length,
      captureLatencyMs: isDictation ? Math.max(0, Date.now() - requestedAt) : undefined,
      sampleRate: microphoneSettings.sampleRate || undefined,
      channelCount: microphoneSettings.channelCount || undefined,
      echoCancellation: microphoneSettings.echoCancellation ?? undefined,
      noiseSuppression: microphoneSettings.noiseSuppression ?? undefined,
      autoGainControl: microphoneSettings.autoGainControl ?? undefined,
    });

    /* A standby session is already connected, with no microphone on it. Using
       it skips asking OpenAI for a session (3.3s) and connecting (0.7s): the
       mic goes onto it and he is listening. See createVoiceStandby. */
    const standby = !isDictation ? takeVoiceStandby() : null;
    let pc;
    let result;
    if (standby) {
      pc = standby.pc;
      rtPc = pc;
      rtDc = standby.dc;
      await standby.sender.replaceTrack(stream.getAudioTracks()[0]);
      const playOpenAiVoice = realtimeVoiceEngine === "realtime";
      rtRemoteAudio = new Audio();
      rtRemoteAudio.autoplay = true;
      rtRemoteAudio.muted = !playOpenAiVoice;
      rtRemoteAudio.volume = playOpenAiVoice ? 1 : 0;
      document.body.appendChild(rtRemoteAudio);
      if (standby.remoteStream) { rtRemoteAudio.srcObject = standby.remoteStream; rtRemoteAudio.play().catch(() => {}); }
      rtRemoteAudio.addEventListener("playing", () => {
        if (realtimeVoiceEngine !== "realtime") return;
        speaking = true;
        setTalk(true);
        setStatus("speaking", "Speaking");
        markVoiceLatency("first_audio", { source: "openai_realtime_audio" });
      });
      standby.adopted = true;
      result = standby.result;
      logRenderer("realtime.standby.used", { ageMs: Date.now() - standby.readyAt, sinceWakeMs: Date.now() - requestedAt });
      assertRealtimeStartCurrent(startGeneration, pc);
    } else {
      pc = new RTCPeerConnection();
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
      result = await window.brainoMac.createRealtimeCall({
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
    }
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
    void refreshCommandContactNames();
    sendRealtimeEvent(buildRealtimeSessionUpdate());
    /* Its own update, so a server that refuses the field cannot take the main
       session settings down with it. Gives each transcript its word confidence. */
    if (!isDictation && cleanEarOn()) {
      sendRealtimeEvent({ type: "session.update", event_id: CLEAN_EAR_INCLUDE_EVENT_ID, session: { type: "realtime", include: ["item.input_audio_transcription.logprobs"] } });
    }
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
    if (!isDictation) {
      voiceStartReady();
      namedOpenAtReady();
      if (heraVoice.on) heraVoiceAtReady();
      else void heraVoiceStart("session_ready");
    }
    markRealtimeActivity("realtime_ready");
    if (!isDictation) startFishWarmKeepAlive();
    setStatus("listening", isDictation ? "BrainoHERA" : "Listening");
    if (!isDictation && !standby) setBubble("I am listening.", 1400);
    logRenderer("realtime.ready", { purpose, warm: Boolean(standby) });
  } catch (error) {
    const cancelled = isRealtimeStartCancelled(error) || startGeneration !== realtimeStartGeneration;
    if (startGeneration === realtimeStartGeneration) voiceStartEnd();
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

/* Hold the room while you talk: pause what is playing the moment he is
   called, resume it the moment he has understood you. Settings switch,
   off by default until it has proved itself on real music. */
const MEDIA_HOLD_KEY = "brainoMediaHold";
const MEDIA_HOLD_NO_SPEECH_MS = 8000;
const MEDIA_HOLD_SPEAKING_MS = 15000;
// Commands about the sound itself: resuming the old track would undo them.
const MEDIA_HOLD_KEEP_PAUSED = /\b(?:play|pause|next|skip|previous|mute)\b|\b(?:stop|kill|turn off)\b.*\b(?:music|song|video|it|this|that|everything|playing|spotify|youtube)\b/i;
const MEDIA_HOLD_RESUME_WORDS = /\b(?:resume|unpause|continue|keep playing|carry on)\b/i;
let mediaHeld = false;
let mediaHoldTimer = 0;
function mediaHoldOn() { try { return localStorage.getItem(MEDIA_HOLD_KEY) === "1"; } catch (_) { return false; } }
function armMediaHoldTimer(ms, why) {
  window.clearTimeout(mediaHoldTimer);
  mediaHoldTimer = window.setTimeout(() => releaseMedia(true, why), ms);
}
function holdMedia(why) {
  if (mediaHeld || !mediaHoldOn() || dictationMode || herMode) return false;
  mediaHeld = true;
  logRenderer("media_hold.start", { why });
  void window.brainoMac.mediaHold?.({ hold: true }).catch(() => {});
  armMediaHoldTimer(MEDIA_HOLD_NO_SPEECH_MS, "no_speech");
  return true;
}
function releaseMedia(resume, why) {
  if (!mediaHeld) return;
  mediaHeld = false;
  window.clearTimeout(mediaHoldTimer);
  const released = window.brainoMac.mediaHold?.({ hold: false, resume, why }).catch(() => {});
  /* The music comes back while he is still listening for a follow-up, so it
     comes back low, and goes up again when the session closes. */
  if (resume) void Promise.resolve(released).then(() => {
    if (realtimeActive || realtimeConnecting) void window.brainoMac.musicDuck?.({ duck: true });
  });
}
function releaseMediaForTurn(transcript) {
  const text = String(transcript || "");
  const keep = MEDIA_HOLD_KEEP_PAUSED.test(text) && !MEDIA_HOLD_RESUME_WORDS.test(text);
  releaseMedia(!keep, keep ? "media_command" : "understood");
}

async function startListening() {
  // Skit isolation: realtime cannot start during the demo or post-demo freeze
  if (skitRunning || skitJustCompleted) return;
  if (processing || realtimeConnecting || realtimeActive || voiceCycleInFlight) return;
  voiceCycleInFlight = true;
  /* Opening the session by hand — double Control — IS calling him. Requiring
     his name on top of a deliberate keypress would be asking twice, and it is
     also the escape hatch: named mode can never leave you unable to reach him,
     because the hotkey always wakes him for the next five seconds. */
  namedWake("manual");
  logRenderer("voice.toggle.start_listening");
  // Music drowns the mic (VAD fires on the song, turns never survive) — duck
  // the player to ~20% for the session; restored on stopRealtimeVoice.
  // With the room hold on, the music is paused instead.
  // Not only when he knows a song is on: a YouTube video never set musicMode.
  if (!holdMedia("wake")) void window.brainoMac.musicDuck?.({ duck: true });
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
      releaseMedia(true, "start_failed");
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
  applyStealth();
  /* The boot screen goes up before anything else is drawn, because its whole
     job is to be the first thing on the display. It wraps the real startup work
     rather than running beside it: every progress() call below is a step that
     actually completed, so a cold sign-in genuinely holds the bar and a warm
     one genuinely races it. */
  const intro = window.__brainoBootIntro || null;
  const firstRun = Boolean(config.firstRun);

  /* THE CAUSE, removed rather than handled.
   *
   * Startup sign-in opens a BROWSER and waits for it with no timeout. Covering
   * every display at that moment puts the cover on top of the page the user has
   * to click, so the wait can never end: the Mac is unusable until it is
   * restarted, which is exactly what happened.
   *
   * config.auth.authenticated says up front whether this launch will need that
   * browser. If it will, no cover goes up at all. The boot theatre is worth a
   * lot; it is not worth any chance of taking somebody's machine away. It plays
   * on the next launch, when there is a session and nothing has to be asked. */
  const authReady = Boolean(config?.auth?.authenticated);
  if (!authReady) logRenderer("boot.intro.skipped", { why: "sign-in-needed" });
  /* The black screen and the flight into the notch are the first-run
     ceremony, ending in onboarding. Every launch after that, he simply wakes
     up in the notch. */
  else if (!firstRun) logRenderer("boot.intro.skipped", { why: "not-first-run" });
  const introUp = authReady && firstRun ? Boolean(intro?.show({ firstRun })) : false;

  /* Everything that can strand someone behind the cover, handled in one place.
     This surface takes the whole machine, so the rule is that it comes down on
     its own no matter what happens above it. */
  let introKilled = false;
  const dropCover = (why) => {
    if (introKilled) return;
    introKilled = true;
    logRenderer("boot.intro.drop", { why });
    /* Focus goes back with the clicks. A panel left focusable after a kill can
       still take the keyboard from whatever the user switches to next. */
    try { window.brainoMac?.onbInteractive?.(false); } catch (_) {}
    try { window.brainoMac?.setMousePassthrough?.(true); } catch (_) {}
    try { window.brainoMac?.introGuard?.(false); } catch (_) {}
    intro?.abort?.();
    window.__brainoOnboarding?.abort?.();
  };

  if (introUp) {
    // Main holds Escape and a watchdog for as long as this is up, because the
    // renderer is the thing that gets stuck and cannot be its own way out.
    try { window.brainoMac?.introGuard?.(true); } catch (_) {}
    try { window.brainoMac?.onIntroKill?.((p) => dropCover(p?.why || "main")); } catch (_) {}

    /* THE deadlock this is here to prevent: startup sign-in opens a browser and
       waits for it, and the cover was on top of the browser, so it could never
       be answered and the Mac had to be restarted. The moment auth says it
       needs a browser, the cover gets out of the way. */
    try { window.brainoMac?.onAuthRequired?.(() => dropCover("auth-needs-browser")); } catch (_) {}
  }

  /* No await in this path is allowed to be unbounded. */
  const capped = (promise, ms, label) => {
    /* The timer has to be cleared when the promise wins, or it fires anyway
       and logs a timeout for something that finished long ago. Two of those
       are in the log for boots that were completely healthy. */
    let timer = null;
    return Promise.race([
      promise.finally(() => { if (timer) clearTimeout(timer); }),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          logRenderer("boot.intro.timeout", { label, ms });
          resolve(null);
        }, ms);
      }),
    ]);
  };
  try {
    applyDisplayMetrics(config.displayMetrics);
    namedModeOn = Boolean(config.namedMode);
    logRenderer("named.mode", { on: namedModeOn });
    if (introUp) intro.progress(0.18);
    movementMode = "dock";
    setStatus("connecting", "Starting");
    // He is born from the notch: closed eyes fade in → authenticate (~1s,
    // green or red verdict) → eyes open. Silent boot — no spoken greeting, no
    // auto voice session; Double-Control starts realtime. He STAYS home until
    // summoned by voice.
    /* The notch boot runs UNDER the black. He authenticates, his eyes bloom and
       he settles into the notch while the screen is still covered, so when the
       black lifts he is already home and awake. Playing the two in sequence
       instead made the user watch the same character arrive twice. */
    /* Started, NOT awaited.
     *
     * The bar used to wait for this whole thing and it made the boot screen
     * feel broken. runNotchBoot is ten seconds of perimeter trace, auth
     * letters, a wake beat and a greeting — and almost none of that is work. It
     * is a performance, and it plays perfectly well in the notch on its own.
     * The cover's job is the seconds where the app genuinely is not ready yet,
     * which on a launch with a saved session is barely one. So it tracks that,
     * gets out of the way, and the notch finishes waking up underneath. */
    const notchBootPromise = runNotchBoot();
    notchBootPromise.catch(() => {});
    if (introUp) intro.progress(0.9);

    if (introKilled) {
      /* The cover is already down and the machine is the user's again. Let the
         notch finish quietly; first run will simply offer itself next launch. */
    } else if (introUp) {
      /* FIRST RUN. The bar hands over to white rather than flying him home:
         black -> white -> the questions -> a cursive hello -> and only then
         does he go and live in the notch. Flying first would put him away and
         immediately drag him back out for six questions. */
      const onb = window.__brainoOnboarding || null;
      await intro.handoff();
      if (onb) {
        const auth = await window.brainoMac.authStatus().catch(() => null);
        const first = String(auth?.displayName || "").split(" ")[0]?.trim() || "there";
        const out = await onb.run({ name: first });
        logRenderer("onboarding.answers", out?.answers || {});
        /* Escape during the questions used to still mark first run complete, so
           one press meant never being offered onboarding again — which is
           exactly what happened. Quitting is not finishing. */
        if (out?.aborted || introKilled) {
          logRenderer("onboarding.abandoned", {});
          return;
        }
        /* The white owns the ending now: he appears on it, flies to the notch,
           and the white lifts with him. The boot screen is only hidden here,
           never faded, because the white has been covering it the whole time. */
        intro.hideNow();
        await onb.goHome();
      } else {
        await intro.flyHome();
      }
      try { window.brainoMac?.introGuard?.(false); } catch (_) {}
      if (!introKilled) void window.brainoMac?.introDone?.().catch(() => {});
    }

    /* Picked up here, with the cover long gone. On first run the questions took
       far longer than the notch needed, so this is already settled; on a normal
       launch he finishes waking in the notch while the desktop is back. Still
       capped, as a backstop only — Escape and main's watchdog are the real net,
       and onAuthRequired catches the one case that genuinely never returns. */
    let authResult = await capped(notchBootPromise, 45000, "notch-boot");
    /* A first sign in can take longer than 45s (a new account, a slow page).
       Timing out used to mark the boot failed, so he never opened his eyes
       even after sign in finished. Nothing covers the screen here, so keep
       waiting for the real answer, up to five minutes. */
    if (!authResult) authResult = await capped(notchBootPromise, 300000, "notch-boot-late");
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
    // The notch says it too, once start-up lets go of it: what is next today.
    if (bootDayLine) {
      const line = bootDayLine;
      bootDayLine = "";
      window.setTimeout(() => {
        const generation = ++speechGeneration;
        const shown = startNotchAnswer(line, generation);
        if (shown) finishNotchAnswer(generation);
        logRenderer("boot.day_line", { shown: Boolean(shown) });
      }, 400);
    }
    /* Whatever happened above, the display does not stay black. A crash during
       startup used to be survivable because the notch simply never appeared;
       with a full-screen cover it would leave the user looking at nothing. */
    /* Whatever happened above, the cover comes down and the machine is usable.
       A crash used to just mean no notch; with a full-screen cover it means a
       restart, which is what this exists to make impossible. */
    if (introUp) dropCover("finally");
    try { window.brainoMac?.introGuard?.(false); } catch (_) {}
  }
}

function handleDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  event.preventDefault();
  // A click is not a drop: only a real move pins him.
  if (!dragState.moved && Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY) > 4) {
    dragState.moved = true;
  }
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
  const moved = Boolean(dragState.moved);
  dragState = null;
  /* Wispr-style: where you drop him is where he stays, and near an edge he
     lands against it. Remembered across restarts (it is the "pin" walk area).
     "Stay where you drop me" off gives the old behaviour: he sets off again
     from the drop. */
  if (moved && stayPut()) {
    // To the nearest of his four spots, and he stays there.
    dockAt(nearestDockSpot(posX, posY), "drag");
  } else {
    // A manual placement is exact: do not snap to a computed rail. Resume normal
    // roaming from the dropped point after a short beat so he never freezes.
    movementMode = "free";
    targetX = posX;
    targetY = posY;
    nextTargetAt = performance.now() + 1200;
    if (moved) setBubble("Starting from here.", 1600);
  }
  refreshMousePassthrough(event);
}

walker.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dragState = {
    pointerId: event.pointerId,
    offsetX: event.clientX - posX,
    offsetY: event.clientY - posY,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  setMousePassthrough(false);
  walker.classList.add("dragging");
  walker.setPointerCapture(event.pointerId);
  setBubble("Drag me anywhere.", 1200);
});

walker.addEventListener("pointermove", handleDragMove);
walker.addEventListener("pointerup", endDrag);
walker.addEventListener("pointercancel", endDrag);
/* ── The notch panel ─────────────────────────────────────────────────────────
 *
 * The app moves into the notch, starting here. Double-click Braino and he
 * jumps up into the notch as it drops open into his settings; close it and he
 * jumps back out to where he was. Double-click the notch itself when he is
 * already home. It replaces the floating card that used to open beside him.
 *
 * While it is open the overlay takes the keyboard and the mouse, the way the
 * typing field does, so Escape closes it, a click anywhere outside closes it,
 * and switching to another app closes it. */
function readBoolSetting(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "1";
  } catch {
    return fallback;
  }
}
function writeBoolSetting(key, on) {
  try { window.localStorage.setItem(key, on ? "1" : "0"); } catch { /* the switch still works this session */ }
}
function talkOutLoud() { return readBoolSetting(TALK_OUT_LOUD_KEY, true); }
/* Talk me through it: say what he is doing while he works (narrate.cjs). */
const NARRATE_KEY = "braino-narrate";
function narrateOn() { return readBoolSetting(NARRATE_KEY, true); }
function stayPut() { return readBoolSetting(STAY_PUT_KEY, true); }

function nfCollapseNotchZone() {
  if (nfPanelOpen) return;
  nfSetZone({ expanded: false });
}

const nfPanel = notchFace?.querySelector(".nf-panel-surface");
const nfPanelInner = nfPanel?.querySelector(".nf-panel-inner");
const nfPanelSize = nfPanel?.querySelector(".nf-panel-size");
const nfPanelSizeValue = nfPanel?.querySelector(".nf-panel-size-value");
const nfPanelChars = nfPanel?.querySelector(".nf-panel-chars");
const nfPanelNameHint = nfPanel?.querySelector(".nf-panel-name-hint");

function renderBrainoPanel() {
  if (!nfPanel) return;
  if (nfPanelSize) {
    nfPanelSize.value = String(brainoScale);
    const fill = ((brainoScale - BRAINO_SCALE_MIN) / (BRAINO_SCALE_MAX - BRAINO_SCALE_MIN)) * 100;
    nfPanelSize.style.setProperty("--nf-size-fill", `${Math.round(fill)}%`);
  }
  if (nfPanelSizeValue) nfPanelSizeValue.textContent = `${Math.round(brainoScale * 100)}%`;
  nfPanelChars?.querySelectorAll("button[data-mascot]").forEach((button) => {
    const on = button.dataset.mascot === mascotChoice;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", String(on));
  });
  if (nfPanelNameHint) nfPanelNameHint.textContent = `Say \u201cHey ${activeWakeName()}\u201d and I wake up`;
  const setSwitch = (name, on) => {
    nfPanel.querySelector(`.nf-switch[data-setting="${name}"]`)?.setAttribute("aria-checked", String(Boolean(on)));
  };
  setSwitch("named", namedModeOn);
  setSwitch("voice", talkOutLoud());
  setSwitch("stealth", stealthOn());
  setSwitch("stay", stayPut() && walkArea?.mode === "pin");
}

function measurePanelHeight() {
  if (!nfPanel || !nfPanelInner) return 330;
  const style = window.getComputedStyle(nfPanel);
  const content = (Number.parseFloat(style.paddingTop) || 0)
    + nfPanelInner.scrollHeight
    + (Number.parseFloat(style.paddingBottom) || 0);
  return Math.round(Math.max(220, Math.min(window.innerHeight - 70, content)));
}

function nfSetPanelOpen(open, options = {}) {
  if (!notchFace || !nfPanel) return;
  const next = Boolean(open);
  if (next === nfPanelOpen) return;
  nfPanelOpen = next;
  logRenderer(next ? "panel.open" : "panel.close", { via: options.via || "" });
  if (next) {
    if (brainoCustomizerOpen) setBrainoCustomizerOpen(false);
    if (typingOpen) closeTyping("panel");
    if (notchFace.classList.contains("nf-think-open")) nfSetThinkingOpen(false);
    renderBrainoPanel();
    cancelNotchSurfaceExit();
    notchFace.classList.add("nf-panel-open");
    const height = measurePanelHeight();
    notchFace.style.setProperty("--nf-panel-height", `${height}px`);
    nfSetZone({ expanded: true, width: NF_PANEL_WIDTH, height });
    setMousePassthrough(false);
    void window.brainoMac.typingFocus?.(true)?.catch?.(() => {});
  } else {
    notchFace.classList.remove("nf-panel-open");
    beginNotchSurfaceExit();
    nfSetZone({ expanded: false });
    void window.brainoMac.typingFocus?.(false)?.catch?.(() => {});
    setMousePassthrough(true);
  }
  updateNotchFace();
}

/* He goes up into the housing: the boot's jump, backwards. Shares the lock
   that setWalkerHomeState uses, so the two never fight over one walk. */
async function walkerJumpIntoNotch() {
  if (walkerHome || walkerHomeBusy) return false;
  walkerHomeBusy = true;
  try {
    const startX = Math.round(window.innerWidth / 2 - W / 2);
    const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
    walker.classList.add("nf-jump-in");
    await Promise.all([
      walkTo(startX, faceH + 6, { speed: 620, allowOffscreen: true }),
      wait(620),
    ]);
    walker.classList.remove("nf-jump-in", "visible");
    walkerHome = true;
    logRenderer("walker.jump_in", {});
    updateNotchFace();
    return true;
  } finally {
    walkerHomeBusy = false;
    const queued = walkerHomeQueued;
    walkerHomeQueued = null;
    if (queued !== null && queued !== walkerHome) void setWalkerHomeState(queued);
  }
}

/* And back out, to a spot, landing the way he lands at boot. */
async function walkerJumpOutTo(spot) {
  if (!walkerHome || walkerHomeBusy || !spot) return;
  // The same modes that keep him in the notch keep him there now.
  if (mondayModeActive || meetingRecording || herMode || skitRunning) return;
  walkerHomeBusy = true;
  try {
    const startX = Math.round(window.innerWidth / 2 - W / 2);
    const faceH = parseFloat(getComputedStyle(notchFace || document.body).getPropertyValue("--nf-notch-h")) || 33;
    walkerHome = false;
    movementMode = "free";
    setPosition(startX, faceH + 7, { allowOffscreen: true });
    targetX = startX;
    targetY = faceH + 7;
    walker.classList.add("visible", "nf-iomi-boot-jump");
    updateNotchFace();
    await walkTo(spot.x, spot.y, { speed: 520, allowOffscreen: true });
    walker.classList.remove("nf-iomi-boot-jump");
    targetX = posX;
    targetY = posY;
    nextTargetAt = performance.now() + 4000;
    logRenderer("walker.jump_out", { x: Math.round(posX), y: Math.round(posY) });
  } finally {
    walkerHomeBusy = false;
    const queued = walkerHomeQueued;
    walkerHomeQueued = null;
    if (queued !== null && queued !== walkerHome) void setWalkerHomeState(queued);
  }
}

async function nfOpenPanelFromBraino() {
  if (nfPanelOpen || nfPanelBusy) return;
  nfPanelBusy = true;
  try {
    nfPanelReturn = { x: posX, y: posY };
    const jumped = await walkerJumpIntoNotch();
    if (!jumped) nfPanelReturn = null;
    nfSetPanelOpen(true, { via: "braino" });
  } finally {
    nfPanelBusy = false;
  }
}

async function nfClosePanel(via) {
  if (!nfPanelOpen || nfPanelBusy) return;
  nfPanelBusy = true;
  try {
    nfSetPanelOpen(false, { via });
    const pinned = walkArea?.mode === "pin" ? getRoamBounds() : null;
    const spot = nfPanelReturn && (pinned ? { x: pinned.minX, y: pinned.minY } : nfPanelReturn);
    nfPanelReturn = null;
    if (spot) {
      // Let the sheet start folding before he comes out of it.
      await wait(260);
      await walkerJumpOutTo(spot);
    }
  } finally {
    nfPanelBusy = false;
  }
}

/* Stand here, as fractions of the screen, the way "Pick a patch" stores it. */
function pinWalkerAt(x, y) {
  saveWalkArea({
    mode: "pin",
    x: clamp((x + W / 2) / Math.max(1, window.innerWidth), 0, 1),
    y: clamp((y + H / 2) / Math.max(1, window.innerHeight), 0, 1),
  });
  movementMode = "free";
  targetX = x;
  targetY = y;
}

/* ── His four spots (2026-09-26) ─────────────────────────────────────────
   Instead of walking the screen he lives in one of four places: the middle of
   the left edge, the top, the bottom, or the middle of the right edge. Drag
   him anywhere and let go: he goes to the nearest one and stays. */
const DOCK_SPOTS = ["left", "top", "bottom", "right"];
function dockSpotPoint(spot) {
  const b = getMoveBounds();
  const midX = Math.round((b.minX + b.maxX) / 2);
  const midY = Math.round((b.minY + b.maxY) / 2);
  // Above the Dock, where there is one.
  let bottomY = b.maxY;
  try { bottomY = Math.min(b.maxY, window.screen.availTop + window.screen.availHeight - window.screenY - H - 12); } catch (_) {}
  if (spot === "left") return { x: b.minX, y: midY };
  if (spot === "right") return { x: b.maxX, y: midY };
  if (spot === "top") return { x: midX, y: b.minY };
  return { x: midX, y: Math.max(b.minY, bottomY) };
}
function nearestDockSpot(x, y) {
  let best = "right";
  let bestD = Infinity;
  for (const spot of DOCK_SPOTS) {
    const p = dockSpotPoint(spot);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; best = spot; }
  }
  return best;
}
function dockAt(spot, source) {
  const p = dockSpotPoint(spot);
  pinWalkerAt(p.x, p.y);
  walkArea = { ...walkArea, spot };
  try { window.localStorage.setItem(WALK_AREA_STORAGE_KEY, JSON.stringify(walkArea)); } catch (_) {}
  void walkTo(p.x, p.y, { speed: 900 });
  renderDockButtons();
  logRenderer("walker.dock", { spot, source });
}
function renderDockButtons() {
  document.querySelectorAll("#braino-dock-row [data-dock]").forEach((b) => {
    const on = b.dataset.dock === "walk" ? walkArea?.mode !== "pin" : walkArea?.mode === "pin" && walkArea?.spot === b.dataset.dock;
    b.classList.toggle("active", Boolean(on));
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

/* Thrown near an edge, he lands against it. */
function snapToEdge(x, y) {
  const bounds = getMoveBounds();
  let sx = x;
  let sy = y;
  if (x - bounds.minX < EDGE_SNAP_PX) sx = bounds.minX;
  else if (bounds.maxX - x < EDGE_SNAP_PX) sx = bounds.maxX;
  if (bounds.maxY - y < EDGE_SNAP_PX) sy = bounds.maxY;
  return { x: sx, y: sy };
}

async function applyPanelSetting(name, on) {
  if (name === "named") {
    namedModeOn = on;
    renderBrainoPanel();
    await window.brainoMac.namedMode?.({ enabled: on })?.catch?.(() => null);
  } else if (name === "voice") {
    writeBoolSetting(TALK_OUT_LOUD_KEY, on);
  } else if (name === "stealth") {
    setStealth(on, "panel");
  } else if (name === "stay") {
    writeBoolSetting(STAY_PUT_KEY, on);
    if (on) {
      const spot = nfPanelReturn || { x: posX, y: posY };
      pinWalkerAt(spot.x, spot.y);
    } else {
      saveWalkArea({ mode: "screen" });
    }
  }
  logRenderer("panel.setting", { name, on });
  renderBrainoPanel();
}

async function runPanelAction(action, button) {
  if (action === "patch") {
    await nfClosePanel("patch");
    openWalkPicker();
    return;
  }
  if (action === "wallpaper-next" || action === "wallpaper-restore") {
    const result = action === "wallpaper-next"
      ? await window.brainoMac.wallpaperApply?.("")?.catch?.(() => null)
      : await window.brainoMac.wallpaperRestore?.()?.catch?.(() => null);
    logRenderer("panel.action", { action, ok: Boolean(result?.ok ?? result) });
    if (button) {
      const label = button.textContent;
      button.classList.add("done");
      button.textContent = action === "wallpaper-next" ? "Changed" : "Done";
      window.setTimeout(() => {
        button.classList.remove("done");
        button.textContent = label;
      }, 1400);
    }
  }
}

nfPanelSize?.addEventListener("input", (event) => {
  setBrainoScale(event.currentTarget.value);
  renderBrainoPanel();
});
nfPanel?.addEventListener("click", (event) => {
  const character = event.target.closest?.(".nf-panel-chars button[data-mascot]");
  if (character) {
    setMascotChoice(character.dataset.mascot);
    renderBrainoPanel();
    return;
  }
  const toggle = event.target.closest?.(".nf-switch[data-setting]");
  if (toggle) {
    void applyPanelSetting(toggle.dataset.setting, toggle.getAttribute("aria-checked") !== "true");
    return;
  }
  const action = event.target.closest?.("[data-action]");
  if (action) {
    void runPanelAction(action.dataset.action, action);
    return;
  }
  if (event.target.closest?.(".nf-panel-done")) void nfClosePanel("done");
});
/* The notch itself, when he is already home. Buttons and open surfaces keep
   their own double-clicks. */
notchFace?.addEventListener("dblclick", (event) => {
  if (!event.target.closest?.(".nf-pill")) return;
  if (nfPanelOpen) {
    if (event.target.closest?.(".nf-panel-surface")) return;
    void nfClosePanel("notch_dblclick");
    return;
  }
  /* Removed 2026-09-26: the notch no longer opens a settings panel. Double-
     click Braino himself for his menu. An open panel still closes above. */
});
/* A click anywhere else closes it; the overlay holds the mouse while it is up,
   so that click lands here instead of in whatever app is underneath. */
document.addEventListener("pointerdown", (event) => {
  if (!nfPanelOpen || nfPanelBusy) return;
  const pill = notchFace?.querySelector(".nf-pill");
  if (pill && pill.contains(event.target)) return;
  void nfClosePanel("outside");
}, true);

document.getElementById("braino-dock-row")?.addEventListener("click", (event) => {
  const b = event.target.closest?.("[data-dock]");
  if (!b) return;
  if (b.dataset.dock === "walk") { writeBoolSetting(STAY_PUT_KEY, false); saveWalkArea({ mode: "screen" }); renderDockButtons(); return; }
  writeBoolSetting(STAY_PUT_KEY, true);
  dockAt(b.dataset.dock, "menu");
});
/* He used to walk the whole screen by default, and once, on the first launch
   after the four spots arrived, he moved to the right-hand one. That one-time
   move also fired on every NEW install, so a new person met him on the right
   edge with the notch's eyes shut ("the face rests while the body is away"),
   which read as "he never woke up" (2026-10-10). New installs now stay home in
   the notch; everyone who already had the move keeps their spot. */
try {
  if (!localStorage.getItem("brainoDockMigrated")) localStorage.setItem("brainoDockMigrated", "1");
} catch (_) {}
renderDockButtons();
document.getElementById("braino-hide-row")?.addEventListener("click", (event) => {
  const b = event.target.closest?.("[data-hide]");
  if (b) setMascotHide(b.dataset.hide, "menu");
});
// A click on the notch brings him back. Capture, so the notch's own click still runs.
notchFace?.addEventListener("click", () => { if (mascotHidden()) setMascotHide(null, "notch_click"); }, true);
/* Tap the WhatsApp badge to read the messages in the notch, quietly
   (2026-10-11). Only from a resting notch: an open answer or a running job
   keeps its own click. */
notchFace?.addEventListener("click", async (event) => {
  /* A job flagged as running used to swallow every tap, so the badge could
     not be cleared at all (2026-10-15). Only speech or an open answer waits. */
  if (!nfWaBadge.count || speaking || notchFace.classList.contains("nf-answer-open")) return;
  event.stopPropagation();
  event.preventDefault();
  const r = await window.brainoMac?.waBadgeOpen?.().catch(() => null);
  nfWaBadge = { count: 0, sender: "" };
  updateNotchFace();
  if (!r?.ok) return;
  const time = (at) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const text = r.messages.map((m) => `${m.name}, ${time(m.at)}: ${m.text}`).join("\n");
  logRenderer("notch.wa_badge.open", { count: r.messages.length });
  void speak(text, { silent: true, notchRich: r.messages.length > 1 });
}, true);
/* Dismiss a message badge without reading it (2026-10-15): right click the
   notch, swipe up on it, or press Esc. */
function nfWaDismiss(via) {
  if (!nfWaBadge.count) return false;
  nfWaBadge = { count: 0, sender: "" };
  updateNotchFace();
  void window.brainoMac?.waBadgeDismiss?.().catch(() => {});
  logRenderer("notch.wa_badge.dismiss", { via });
  return true;
}
notchFace?.addEventListener("contextmenu", (event) => {
  if (!nfWaDismiss("right_click")) return;
  event.preventDefault(); event.stopPropagation();
}, true);
notchFace?.addEventListener("wheel", (event) => {
  if (event.deltaY > 12 && nfWaDismiss("swipe_up")) event.preventDefault();
}, { capture: true, passive: false });
window.addEventListener("keydown", (event) => { if (event.key === "Escape") nfWaDismiss("esc"); });
applyMascotHide();
// Have a voice session ready before the first call.
scheduleVoiceStandby(6000);

walker.addEventListener("dblclick", (event) => {
  event.preventDefault();
  event.stopPropagation();
  dragState = null;
  scriptedWalk = null;
  targetX = posX;
  targetY = posY;
  nextTargetAt = performance.now() + 2200;
  walker.classList.remove("dragging");
  /* Double-click opens Braino for Mac, the one app (2026-09-27): his look,
     his voice, Set him up, everything. It replaces the small menu that used
     to open here. If the app can't open, the old menu still does. */
  if (window.brainoMac.appOpen) void window.brainoMac.appOpen().catch(() => setBrainoCustomizerOpen(!brainoCustomizerOpen));
  else setBrainoCustomizerOpen(!brainoCustomizerOpen);
});

/* What you change in the app, applied here, where he lives. */
window.brainoMac.onAppOverlay?.((patch) => {
  if (patch.mascot) setMascotChoice(patch.mascot);
  if (patch.scale != null) setBrainoScale(patch.scale);
  if (patch.dock) {
    if (patch.dock === "walk") { writeBoolSetting(STAY_PUT_KEY, false); saveWalkArea({ mode: "screen" }); }
    else { writeBoolSetting(STAY_PUT_KEY, true); dockAt(patch.dock, "app"); }
  }
  if (patch.hide != null) setMascotHide(patch.hide || null, "app");
  if (typeof patch.talkOutLoud === "boolean") writeBoolSetting(TALK_OUT_LOUD_KEY, patch.talkOutLoud);
  if (typeof patch.narrate === "boolean") writeBoolSetting(NARRATE_KEY, patch.narrate);
  if (typeof patch.mediaHold === "boolean") {
    try { localStorage.setItem(MEDIA_HOLD_KEY, patch.mediaHold ? "1" : "0"); } catch (_) {}
    if (!patch.mediaHold) releaseMedia(true, "switched_off");
  }
  if (typeof patch.cleanEar === "boolean") {
    try { localStorage.setItem("brainoCleanEar", patch.cleanEar ? "1" : "0"); } catch (_) {}
  }
  if (typeof patch.warmVoice === "boolean") {
    try { localStorage.setItem("brainoWarmVoice", patch.warmVoice ? "1" : "0"); } catch (_) {}
    if (patch.warmVoice) scheduleVoiceStandby(500); else if (voiceStandby) dropVoiceStandby(voiceStandby, "switched_off");
  }
  logRenderer("app.overlay", { keys: Object.keys(patch) });
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
/* "Set him up": the setup, with his notebook filling in live beside it. */
document.getElementById("braino-setup-open")?.addEventListener("click", () => {
  setBrainoCustomizerOpen(false);
  void window.brainoMac.setupOpen?.();
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
  if (event.key === "Escape" && nfPanelOpen) {
    event.preventDefault();
    void nfClosePanel("escape");
    return;
  }
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
  /* pitchRunning holds him still for the whole demo, not just while a line is
     playing. He speaks in short lines with beats between them, and `speaking`
     goes false in every one of those beats, so he was setting off on a little
     walk between every sentence. He stands and delivers. */
  const shouldHoldAttention = listening || realtimeConnecting || processing || speaking || pitchRunning;
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
  } else if (!dragState && !brainoCustomizerOpen && !walkPickerOpen && !shouldHoldAttention && !skitMoonwalk && !skitJustCompleted && !musicDancing) {
    if (movementMode === "dock") {
      targetY = getDockBounds().y;
    }
    const distance = Math.hypot(targetX - posX, targetY - posY);
    if (distance < 5 || now > nextTargetAt) pickRoamTarget(now);
    const speed = 76;
    const dx = targetX - posX;
    const dy = targetY - posY;
    /* One axis at a time, and height first. Settling onto the line reads as
       stepping up or down; walking along it is the only time his legs move.
       Both at once was the diagonal drift. */
    if (Math.abs(dy) > 0.5) {
      const rise = Math.min(Math.abs(dy), 150 * dt);
      setPosition(posX, posY + Math.sign(dy) * rise);
      walkingNow = false;
    } else {
      const stride = Math.min(Math.abs(dx), speed * dt);
      setPosition(posX + Math.sign(dx) * stride, posY);
      if (Math.abs(dx) > 0.25) dirX = dx >= 0 ? 1 : -1;
      walkingNow = stride > 0.05 && Math.abs(dx) > 0.5;
    }
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
  /* Any keystroke means it is not abandoned. */
  armTypingIdleClose();
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

/* One trip to the voice per group, not one per sentence.
 *
 * Splitting his lines up stopped him losing their tails, and bought two worse
 * problems: every extra call is another round trip of dead air, and `speaking`
 * drops to false in every gap, which is the signal that lets him wander off.
 * So the short lines are joined back into one utterance here. He still gets the
 * pauses, because full stops are pauses, and the voice reads them. */
async function pitchSay(mine, lines) {
  const said = (Array.isArray(lines) ? lines : [lines]).filter(Boolean).join(" ");
  if (!said || pitchStale(mine)) return;
  await speak(said);
}

async function runPitchDemo(payload) {
  const mine = ++pitchGeneration;
  pitchRunning = true;
  const lines = payload?.lines || {};
  const rehearse = Boolean(payload?.rehearse);
  logRenderer("pitch.run", { rehearse, generation: mine });

  /* This is Braino's demo, in Braino's voice.
   *
   * The voice follows two settings that have nothing to do with the pitch: the
   * character, which is remembered across restarts, and a voice persona, which
   * is whatever impression he was last asked to do. Leave either one alone and
   * he introduces himself as Braino in somebody else's voice, on stage. Both
   * are forced here and both are put back at the end, so this costs the user
   * nothing outside the demo. */
  const characterBefore = macCharacter;
  const personaBefore = macVoicePersonaKey;
  macVoicePersonaKey = null;
  if (characterBefore !== "braino") {
    await macSetCharacter("braino", { announce: false });
  }
  logRenderer("pitch.voice", { characterBefore, personaBefore, using: "braino" });

  try {
    /* Nothing listens during this. It is a script from the first word to the
       last, and a live microphone in a room full of people is a stray sentence
       waiting to derail it. */
    stopRealtimeVoice({ reason: "pitch-demo" });
    logRenderer("pitch.mic_off", {});

    /* Spotify is NOT touched here.
     *
     * This used to prewarm it, which does not quietly warm anything: it opens
     * Spotify and brings it to the front. So the demo began by throwing a music
     * player over the screen and then talking on top of it. Spotify belongs at
     * the end, with the music, and nowhere else. */

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

    /* Two: the rig has to exist. Only some characters carry the moonwalk
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

    /* Anything the music system already started gets shut down first. It reacts
       to Billie Jean by dancing him on the spot, which is not the trick. */
    stopMusicDance();

    /* Waited for, but not indefinitely. A warm Spotify answers in a moment and
       the glide starts on the beat; a cold one can take fifteen seconds to
       launch, and standing there in silence for fifteen seconds is worse than
       dancing a little early. */
    await Promise.race([
      window.brainoMac.skitStep?.("play"),
      new Promise((resolve) => window.setTimeout(resolve, 3500)),
    ]).catch(() => {});
    if (pitchStale(mine)) return;

    /* Only now does he come to the front. The play step deliberately pulls
       Spotify forward while the track loads, so raising him before it puts him
       straight back underneath a music player. */
    await window.brainoMac.pitchFront?.();
    stopMusicDance();
    await pitchWait(700);
    if (pitchStale(mine)) return;

    /* The same three lines the working skit runs before its moonwalk, for the
       same three reasons. Bumping the music session throws away any reaction
       already queued against the track we just started; the flag stops the
       music system deciding to walk him home; and skitMoonwalk is what locks
       him facing forward while he glides backwards, which is the difference
       between a moonwalk and a man walking backwards. */
    musicSessionId += 1;
    walkerAutoHomedByMusic = false;
    skitMoonwalk = true;

    try {
      /* Awaited, so pitchRunning stays true for the whole eleven seconds. The
         glide loop reads it every frame to decide whether to keep going. */
      await skitPerformMoonwalk(11000);
    } finally {
      skitMoonwalk = false;
    }
  } catch (error) {
    logRenderer("pitch.failed", { error: String(error?.message || error) });
  } finally {
    if (!pitchStale(mine)) {
      pitchRunning = false;
      notchFace?.classList.remove("nf-think-complete");
      void window.brainoMac.pitchDone?.();
      /* Whatever he was before the demo, he is again. Silently: an announcement
         here would be him saying "Hi, I'm Brainelle" straight after the
         moonwalk. */
      macVoicePersonaKey = personaBefore;
      if (characterBefore !== "braino") {
        void macSetCharacter(characterBefore, { announce: false });
      }
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

/* Without subtitles: the whole screen's edge ripples when he wakes. */
function aosWakeRipple() {
  let el = document.getElementById("aos-ripple");
  if (!el) { el = document.createElement("div"); el.id = "aos-ripple"; el.setAttribute("aria-hidden", "true"); document.body.appendChild(el); }
  // One colour: whatever the AffectiveOS tint is right now.
  const tint = getComputedStyle(notchFace || document.body).getPropertyValue("--aos-tint").trim();
  if (tint) el.style.setProperty("--aos-ripple-color", tint);
  el.classList.remove("on");
  void el.offsetWidth;   // restart the animation on a second wake
  el.classList.add("on");
  logRenderer("aos.wake_ripple", {});
}
function startVoiceWakeShimmer(options = {}) {
  if (!notchFace) return;
  if (noSubtitles()) aosWakeRipple();
  /* His name gets the gold boot trace; the hotkey keeps the blue. */
  const classes = options.golden ? ["nf-shining", "nf-shine-slow"] : ["nf-shining", "nf-shine-slow", "nf-waking-voice"];
  voiceWakeShimmerAdded = classes.filter((name) => !notchFace.classList.contains(name));
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

/* ── Noise that came back as words ─────────────────────────────────────────
 *
 * The transcriber writes something for almost any sound. Nine seconds of room
 * noise came back as "Hold the line", four as "Open the language.", and its
 * own prompt as "Use English as the language." The first two ran as commands,
 * because each landed in a moment that needs no name: right after a wake, and
 * right after he asked a question.
 *
 * People talk at two or three words a second; those came in under one. So a
 * turn that took seconds and has almost no words in it is noise, and so is
 * anything that sounds like the prompt or the classic lines these models
 * write over silence. */
const NOISE_PROMPT_ECHO = /\b(?:english|language|letters|accent|vocabulary|transcri\w*)\b/i;
/* Both names at once is the prompt talking, never a person. */
const NOISE_NAME_PAIR = /^(?=.*\bbrain[oa]\b)(?=.*\bbrainelle\b)[\p{L}\s.,!?]{0,40}$/iu;
const NOISE_CLASSIC = /^(?:you|thank you|thanks|thanks for watching|thank you for watching|bye|bye bye|hold the line|please subscribe|subtitles? by\b.*)[\s.!]*$/i;
const NOISE_MIN_SPEECH_MS = 3000;
const NOISE_MIN_WORDS_PER_SEC = 0.8;

function looksLikeNoise(text, speechMs = 0) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (NOISE_CLASSIC.test(value) || NOISE_PROMPT_ECHO.test(value) || NOISE_NAME_PAIR.test(value)) return true;
  const words = value.split(/\s+/).filter(Boolean).length;
  return speechMs >= NOISE_MIN_SPEECH_MS && words / (speechMs / 1000) < NOISE_MIN_WORDS_PER_SEC;
}

/* ── Half a sentence, waiting for the rest ─────────────────────────────────
 *
 * Voice mode ends a turn at a pause, so a pause mid-thought used to send the
 * first half as its own command: "I need", "Regarding the", "Can you please
 * close all" all went to him in one run. The transcripts tell you which is
 * which: a finished sentence ends with a full stop or a question mark, and
 * these did not.
 *
 * So a sentence that looks unfinished is held for a moment. More speech
 * inside that moment is joined to it; silence sends it as it is, so nothing is
 * ever lost. A finished sentence goes straight through, so ordinary replies
 * are not slowed down at all. */
const FRAGMENT_TAIL_WORDS = new Set([
  "the", "a", "an", "to", "and", "or", "but", "of", "for", "with", "on", "in",
  "at", "from", "by", "about", "into", "onto", "my", "your", "his", "her", "our",
  "their", "its", "this", "that", "these", "those", "all", "some", "any", "every",
  "need", "want", "wanna", "gonna", "can", "could", "would", "should", "will",
  "please", "is", "are", "was", "were", "be", "been", "if", "so", "because",
  "like", "than", "then", "also", "just", "i", "you", "we", "they", "he", "she",
  "it's", "i'm", "let's", "regarding", "including", "maybe", "um", "uh",
]);

function looksUnfinished(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (/[.?!\u2026]["')\]]*$/.test(value)) return false;
  // A sentence that stops on a comma is still going.
  if (/[,;:\u2013\u2014-]\s*$/.test(value)) return true;
  const words = value.replace(/[^\p{L}\p{N}'\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const content = words.filter((w) => !/^(hey|braino|brainelle)$/i.test(w));
  if (content.length <= 2) return true;
  return FRAGMENT_TAIL_WORDS.has(String(words.at(-1) || "").toLowerCase());
}

function clearHeldFragment() {
  window.clearTimeout(heldFragmentTimer);
  heldFragmentTimer = 0;
  heldFragment = null;
}

function holdFragment(text, { accepted = true } = {}) {
  const now = Date.now();
  heldFragment = { text, at: heldFragment?.at || now, accepted };
  window.clearTimeout(heldFragmentTimer);
  heldFragmentTimer = window.setTimeout(releaseHeldFragment, FRAGMENT_HOLD_MS);
  logRenderer("voice.fragment_held", { words: text.split(/\s+/).length, gated: accepted ? "after" : "before" });
  setStatus("listening", "Listening");
}

/* Nothing more came: it goes as it is. */
function releaseHeldFragment() {
  if (!heldFragment) return;
  // Still talking: wait for that turn to end and join it there, within reason.
  if (heraVoice.userSpeaking || rtSpeechInProgress()) {
    if (Date.now() - heldFragment.at < FRAGMENT_MAX_HOLD_MS) {
      heldFragmentTimer = window.setTimeout(releaseHeldFragment, 500);
      return;
    }
  }
  const text = heldFragment.text;
  const accepted = heldFragment.accepted !== false;
  clearHeldFragment();
  logRenderer("voice.fragment_released", { words: text.split(/\s+/).length, gated: accepted ? "after" : "before" });
  // Never judged yet: it goes through the gate now, on its own.
  void flushRealtimeTranscript("held_fragment", text, accepted ? {} : { separateTurn: true });
}

/* ── HERA, live, while you talk to him ─────────────────────────────────────
 *
 * One live transcript, two endings. Option twice: HERA's words are cleaned up
 * and typed where your cursor is (unchanged, main's dictation path). Talking to
 * Braino: the same live words show in the notch as "You're saying", and when
 * you stop, that sentence is the command.
 *
 * HERA runs beside the voice session in a display-only mode, rotated into one
 * segment per turn at every pause. The turn's segment becomes the command
 * unless something says it cannot be trusted, and then OpenAI's transcript of
 * the same turn is used instead:
 *   - Braino was audible during it (HERA has no echo cancellation, so his own
 *     voice through the speakers is in there),
 *   - it began with a barge-in (the reset gap can eat your first words),
 *   - it has clearly fewer words than OpenAI heard, or it never arrived. */
function heraVoiceReset(on) {
  heraVoice = {
    on,
    settled: "",
    partial: "",
    raw: false,
    dirty: false,
    clipped: false,
    userSpeaking: false,
    sawOpenAiSpeech: false,
    early: false,
    earlyText: "",
    rotates: [],
    turnRotate: null,
    lastRotateAt: Date.now(),
    lastRawAt: 0,
    ignoreUntil: 0,
  };
}

async function heraVoiceStart(reason) {
  if (!HERA_LIVE_IN_VOICE) return;
  if (heraVoice.on || heraVoiceStarting || dictationMode || herMode) return;
  if (!realtimeActive && !realtimeConnecting) return;
  heraVoiceStarting = true;
  try {
    const result = await window.brainoMac.voiceCaption?.({ action: "start" });
    if (result?.ok && (realtimeActive || realtimeConnecting) && !dictationMode) {
      heraVoiceReset(true);
      // Listening before the session is: whatever you say now is kept.
      heraVoice.early = !realtimeActive;
      heraVoiceStartTries = 0;
    } else if (result?.ok) {
      void window.brainoMac.voiceCaption?.({ action: "stop", reason: "session_gone" })?.catch?.(() => {});
    }
    logRenderer("hera_voice.start", { ok: Boolean(result?.ok), why: result?.reason || "", reason });
    // The models load once at launch; a session that opens first waits for them.
    if (!result?.ok && result?.reason === "warming" && (realtimeActive || realtimeConnecting) && heraVoiceStartTries < 20) {
      heraVoiceStartTries += 1;
      window.setTimeout(() => void heraVoiceStart("warming_retry"), 3000);
    }
  } catch (error) {
    logRenderer("hera_voice.start_failed", { error: errorForLog(error) });
  } finally {
    heraVoiceStarting = false;
  }
}

function heraVoiceStop(reason) {
  if (!heraVoice.on) return;
  heraVoiceReset(false);
  nfHeardLive = false;
  void window.brainoMac.voiceCaption?.({ action: "stop", reason })?.catch?.(() => {});
}

/* Close the current segment and start a fresh one. The closing segment's
   trust flags are captured here, at the request, because the helper sends
   nothing at all for a segment with no words in it. */
function heraVoiceRotate(reason, options = {}) {
  if (!heraVoice.on) return null;
  const now = Date.now();
  const request = {
    reason,
    at: now,
    dirty: heraVoice.dirty,
    clipped: heraVoice.clipped,
    text: "",
    done: !heraVoice.raw,
  };
  heraVoice.rotates = heraVoice.rotates.filter((r) => !r.done && now - r.at < HERA_ROTATE_EXPIRE_MS);
  heraVoice.rotates.push(request);
  heraVoice.settled = "";
  heraVoice.partial = "";
  heraVoice.raw = false;
  heraVoice.dirty = false;
  heraVoice.clipped = Boolean(options.clipsNext);
  heraVoice.lastRotateAt = now;
  if (options.echoTail) heraVoice.ignoreUntil = now + HERA_ECHO_TAIL_MS;
  void window.brainoMac.voiceCaption?.({ action: "rotate", reason })?.catch?.(() => {});
  return request;
}

function brainoAudible() {
  return Boolean(activeSpeechJobGeneration && !speakingSilently)
    || (speaking && !speakingSilently)
    || Boolean(currentSpeechAudio)
    || Boolean(realtimeStreamTts)
    || activeSpeechAudios.size > 0;
}

/* The phrase HERA has settled, then the words it is still hearing. The running
   hypothesis can repeat the end of the settled phrase, so the overlap is
   dropped rather than shown twice. */
function heraVoiceLiveText() {
  const settled = String(heraVoice.settled || "").trim();
  const partial = String(heraVoice.partial || "").trim();
  if (!settled) return partial;
  if (!partial) return settled;
  const a = settled.split(/\s+/);
  const b = partial.split(/\s+/);
  const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
  let overlap = 0;
  for (let n = Math.min(8, a.length, b.length); n > 0; n -= 1) {
    const tail = a.slice(-n).map(norm).join(" ");
    const head = b.slice(0, n).map(norm).join(" ");
    if (tail && tail === head) { overlap = n; break; }
  }
  return [settled, b.slice(overlap).join(" ")].filter(Boolean).join(" ");
}

/* Which words become the command: OpenAI's.
 *
 * HERA's were tried and lost on the evidence. It has no echo cancellation, so
 * most turns after a reply carried Braino's own words ("braino_was_audible" on
 * five turns in a row), it writes his name as "we don't", and waiting for its
 * segment added up to 600ms to every reply. OpenAI's transcript is what the
 * voice path was built around and it is already there. HERA stays as what you
 * SEE while you talk.
 *
 * One exception: words you said while the session was still connecting. OpenAI
 * never heard those, HERA did, and there was no echo to hear yet. */
async function heraCommandText(openaiText) {
  const early = String(heraVoice.earlyText || "").trim();
  heraVoice.earlyText = "";
  heraVoice.turnRotate = null;
  const openaiWords = openaiText.split(/\s+/).filter(Boolean).length;
  const earlyWords = early ? early.split(/\s+/).filter(Boolean).length : 0;
  if (early && earlyWords > openaiWords) {
    logRenderer("voice.command_text", { source: "hera_early", heraWords: earlyWords, openaiWords });
    return early;
  }
  /* Clean hearing, 2026-10-04: 17 seconds of talk came back from OpenAI as
     one invented 12-word "command" ("what do people usually do on the
     maps?") while HERA had all 223 characters right on screen. Its prompt
     asks for a command, so on long speech it writes one. When HERA heard
     clearly more of the same turn, with no Braino audio in it, its words go. */
  const turnText = String(heraVoice.turnText || "").trim();
  heraVoice.turnText = "";
  const turnWords = turnText ? turnText.split(/\s+/).filter(Boolean).length : 0;
  // What you saw in the notch is what is sent: a clean HERA turn wins (2026-10-04).
  // Only when OpenAI squashed a long turn: half HERA's words or fewer, and 8+ missing.
  /* Or when HERA heard WHERE and OpenAI did not: "...play it for me on Hotstar
     maybe" came back from OpenAI as "...play it for me?", and it went to
     Netflix (2026-10-11). A service name only HERA heard decides it. */
  const SERVICE_NAMES = /\b(?:netflix|hot\s?star|jio\s?hotstar|jio\s?cinema|prime(?:\s+video)?|spotify|youtube|whatsapp|apple\s+music|zee5|sony\s?liv|instagram|disney\+?)\b/gi;
  const heraOnlyService = (turnText.match(SERVICE_NAMES) || []).some((name) => !new RegExp(`\\b${name.replace(/\s+/g, "\\s?")}\\b`, "i").test(openaiText));
  if (cleanEarApplies() && turnText && (turnWords >= Math.max(openaiWords * 2, openaiWords + 8) || (heraOnlyService && turnWords >= openaiWords))) {
    // HERA writes his name as "we don't": keep the name OpenAI heard.
    const named = /^\W*(?:hey\s+)?brain(?:o|elle)\b[\s,.]*/i.exec(openaiText);
    const text = named && !/^\W*(?:hey\s+)?brain/i.test(turnText) ? `${named[0].trim().replace(/[,.]*$/, "")}, ${turnText}` : turnText;
    logRenderer("voice.command_text", { source: "hera_turn", heraWords: turnWords, openaiWords, hera: text.slice(0, 400), openai: openaiText.slice(0, 400) });
    return text;
  }
  logRenderer("voice.command_text", { source: "openai", openaiWords, heraWords: turnWords || undefined, hera: turnText ? turnText.slice(0, 400) : undefined, openai: openaiText.slice(0, 400) });
  return openaiText;
}

/* The session is live. If you already said something while it connected,
   send it now; if you are still saying it, OpenAI hears the rest and the
   first pause takes the whole line. */
function heraVoiceAtReady() {
  if (!heraVoice.on || !heraVoice.early) return;
  const text = heraVoiceLiveText();
  if (!text) {
    heraVoice.early = false;
    return;
  }
  if (heraVoice.sawOpenAiSpeech) return;
  if (Date.now() - (heraVoice.lastRawAt || 0) < 900) {
    window.setTimeout(heraVoiceAtReady, 1000);
    return;
  }
  heraVoice.early = false;
  logRenderer("voice.early_turn", { words: text.split(/\s+/).length });
  rtUserTranscript = text;
  rtTranscriptFinal = true;
  heraVoiceRotate("early_turn");
  void flushRealtimeTranscript("early_hera");
}

window.brainoMac.onVoiceCaption?.((event) => {
  const type = String(event?.type || "");
  if (type === "stopped") {
    // Dictation or LIVE took HERA over, or the helper went away.
    if (heraVoice.on) heraVoiceReset(false);
    nfHeardLive = false;
    logRenderer("hera_voice.stopped", { reason: String(event?.reason || "") });
    return;
  }
  if (!heraVoice.on) return;
  const text = String(event?.text || "").trim();
  const now = Date.now();
  if (type === "segment") {
    const request = heraVoice.rotates.find((r) => !r.done && now - r.at < HERA_ROTATE_EXPIRE_MS);
    if (request) {
      request.text = text;
      request.done = true;
    }
    return;
  }
  if (type !== "partial" && type !== "utterance") return;
  heraVoice.raw = true;
  heraVoice.lastRawAt = now;
  /* "Stop" while he is talking, heard on the Mac in a third of a second
     rather than after OpenAI's transcript, which only starts once you stop
     speaking (2026-10-03: eleven times he only got quieter). Only a stop word
     at the very start, and never his own line coming back through the
     speakers. */
  if (brainoAudible() && text && BARGE_STOP.test(text.replace(/^[\s,.\-]+/, "")) && !isSelfEcho(text)) {
    logRenderer("realtime.barge_in", { via: "hera_live", speaking, hadAudio: Boolean(currentSpeechAudio), hadStreamTts: Boolean(realtimeStreamTts) });
    interruptVoiceTurn("barge_in", "hera_live");
    heraVoice.ignoreUntil = 0;
  }
  /* Talking over him (2026-10-05). Clean hearing keeps OpenAI's mic shut
     while he speaks, so HERA is the only ear on you then. Words that are
     mostly not the line he is saying are you, not his echo: he stops, the
     mic opens at once, and what you already said starts the new turn. */
  /* The room rule holds here too: with named mode on, only words meant for
     him stop him (his name, a stop word, or a sentence said to him). Anyone
     else talking only lowers his voice, exactly as before (2026-09-25 fix). */
  const heraOverHim = cleanEarApplies() && brainoAudible() && text && heraTalksOverHim(text);
  if (heraOverHim && namedModeOn && !heraMeantForHim(text)) {
    duckSpeech(true, "not_for_him");
  } else if (heraOverHim) {
    logRenderer("realtime.barge_in", { via: "hera_talk_over", words: text.split(/\s+/).length });
    interruptVoiceTurn("barge_in", "hera_talk_over");
    heraVoice.ignoreUntil = 0;
    heraVoiceRotate("talk_over");
    heraVoice.settled = text;
    heraVoice.raw = true;
    lastSpokenLine.endedTs = Date.now() - CLEAN_EAR_ECHO_TAIL_MS;
    cleanEarLastPlayingAt = 0;
    nfSetHeard(text, { live: true });
    return;
  }
  if (brainoAudible() || now < heraVoice.ignoreUntil) {
    heraVoice.dirty = true;
    heraLiveReport(brainoAudible() ? "his_voice_playing" : "echo_tail", text);
    return;
  }
  if (type === "utterance") {
    heraVoice.settled = text;
    heraVoice.partial = "";
  } else {
    heraVoice.partial = text;
  }
  const live = heraVoiceLiveText();
  /* Clean hearing: the notch shows a voice glow while you talk and only the
     exact words that are sent (Itish, 2026-10-05). HERA still listens for
     talk-over and "stop"; it just no longer paints rough words. */
  if (live && !dictationMode && !herMode && heraVoiceMayShow() && !cleanEarApplies()) {
    nfSetHeard(live, { live: true });
    heraLiveReport("", live);
  } else if (live) {
    heraLiveReport(dictationMode ? "dictation" : herMode ? "her_mode" : mediaAudioPlaying ? "media_playing" : "openai_not_hearing_speech", live);
  }
});

/* Whether your words reached the notch live, once per sentence (2026-10-03).
   "What I say shows up 4 to 5 seconds later": the live words exist within a
   few hundred milliseconds, so this records, for each sentence, how fast they
   showed, or which check held them back. One log line, no text. */
let heraLiveTurn = { at: 0, shown: false, hidden: "" };
function heraLiveReport(hiddenBy, text) {
  const now = Date.now();
  const startedAt = rtSpeechStartedAt || now;
  if (heraLiveTurn.at !== startedAt) heraLiveTurn = { at: startedAt, shown: false, hidden: "" };
  if (!hiddenBy && !heraLiveTurn.shown) {
    heraLiveTurn.shown = true;
    logRenderer("hera_voice.live_shown", { msAfterSpeechStart: now - startedAt, hiddenBefore: heraLiveTurn.hidden || "", chars: String(text || "").length });
  } else if (hiddenBy && !heraLiveTurn.shown && heraLiveTurn.hidden !== hiddenBy) {
    heraLiveTurn.hidden = hiddenBy;
    logRenderer("hera_voice.live_hidden", { by: hiddenBy, msAfterSpeechStart: now - startedAt, speakingNow: rtUserSpeakingNow, sinceStopMs: rtUserStoppedAt ? now - rtUserStoppedAt : -1 });
  }
}

/* A decoder that is never reset gets slower the longer it runs. Turns rotate
   it constantly; this covers the stretches with no turns, such as music HERA
   can hear and OpenAI ignores. Never while you are mid-sentence. */
window.setInterval(() => {
  if (!heraVoice.on || heraVoice.userSpeaking) return;
  const now = Date.now();
  if (now - heraVoice.lastRotateAt < HERA_SAFETY_ROTATE_MS) return;
  if (heraVoice.lastRawAt && now - heraVoice.lastRawAt < 1500) return;
  heraVoiceRotate("housekeeping");
}, 5000);

/* How long this Mac usually takes to open a voice session. The median of the
   last dozen, so one slow morning does not turn every countdown pessimistic. */
function voiceConnectEstimateMs() {
  try {
    const history = JSON.parse(window.localStorage.getItem(VOICE_CONNECT_HISTORY_KEY) || "[]")
      .map(Number)
      .filter((ms) => Number.isFinite(ms) && ms > 0);
    if (history.length < 3) return VOICE_CONNECT_DEFAULT_MS;
    const sorted = [...history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return Math.max(1500, Math.min(7000, median));
  } catch {
    return VOICE_CONNECT_DEFAULT_MS;
  }
}

function recordVoiceConnectMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0 || ms > 30000) return;
  try {
    const history = JSON.parse(window.localStorage.getItem(VOICE_CONNECT_HISTORY_KEY) || "[]");
    history.push(Math.round(ms));
    window.localStorage.setItem(VOICE_CONNECT_HISTORY_KEY, JSON.stringify(history.slice(-12)));
  } catch {
    // The default estimate is fine.
  }
}

function voiceStartTicking(on) {
  if (on && !voiceStartTicker) voiceStartTicker = window.setInterval(() => updateNotchFace(), 500);
  if (!on && voiceStartTicker) {
    window.clearInterval(voiceStartTicker);
    voiceStartTicker = 0;
  }
}

function voiceStartBegin() {
  voiceStart = { phase: "starting", startedAt: Date.now(), estimateMs: voiceConnectEstimateMs(), readyAt: 0 };
  voiceStartTicking(true);
  // HERA is on this Mac and ready now; the session takes seconds. Start
  // listening at the press so you can start talking at the press.
  void heraVoiceStart("press");
  updateNotchFace();
}

function voiceStartReady() {
  if (voiceStart.phase !== "starting") return;
  recordVoiceConnectMs(Date.now() - voiceStart.startedAt);
  voiceStart = { ...voiceStart, phase: "ready", readyAt: Date.now() };
  updateNotchFace();
}

function voiceStartEnd() {
  if (!voiceStart.phase) return;
  voiceStart = { phase: "", startedAt: 0, estimateMs: 0, readyAt: 0 };
  voiceStartTicking(false);
  updateNotchFace();
}

/* "You can speak now" is a moment: it holds long enough to read, then the
   listening pill takes over. Read-only apart from that expiry, because
   updateNotchFace calls it. */
function voiceStartPhase() {
  if (voiceStart.phase === "ready" && Date.now() - voiceStart.readyAt > VOICE_READY_HOLD_MS) {
    voiceStart = { phase: "", startedAt: 0, estimateMs: 0, readyAt: 0 };
    voiceStartTicking(false);
  }
  return voiceStart.phase;
}

/* No countdown. A number counting down made a slow connection look slower,
   and it was a guess anyway (OpenAI took 1s this morning and 3-8s tonight).
   With HERA listening from the press there is nothing to wait for: say it, and
   it goes through the moment the session is up. Without HERA, plainly say so. */
function voiceStartText(phase) {
  if (phase === "ready") return "You can speak now";
  return heraVoice.on ? "Go ahead, I'm listening" : "Connecting";
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
    // Dictation borrowed HERA from the voice session; give it back.
    if (realtimeActive) window.setTimeout(() => void heraVoiceStart("after_dictation"), 1500);
  }
  logRenderer("dictation.ui.local", { active, engine: String(payload?.engine || "parakeet") });
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
  nfSetThinkingSticky(payload?.blocked
    ? "macOS blocked my paste. It's copied: press ⌘V."
    : "No text box here. It's copied, just paste it.");
  window.setTimeout(() => nfSetThinkingSticky(""), 6000);
  logRenderer("dictation.fallback.notch", { chars: text.length, reason: payload?.reason || "" });
});

/* Live text from the on-device engine.
   Parakeet reports a cumulative hypothesis roughly every 150-500ms — measured
   at 39 updates across a 12s sentence — so this is genuinely word by word.

   The long durationMs matters: nfSetHeard arms a clear-timer sized to the text
   length, and without overriding it the caption can wipe itself mid-sentence
   while the speaker is still going. The session end clears it explicitly. */
/* ── LIVE: the lecture as it is being said ──────────────────────────────────
 *
 * The on-device engine reports a running hypothesis every few hundred
 * milliseconds and, at the end of each utterance, the whole transcript so far.
 * LIVE shows that and does nothing else with it.
 *
 * One paragraph rather than a list of lines: settled text and the hypothesis
 * are the same sentence being finished, so the settled part is dimmed and the
 * newest words are bright, in one flow. A stack of separate lines made a
 * lecture look like a chat log.
 */
const liveEl = document.getElementById("live-transcript");
const livePara = liveEl?.querySelector(".lt-para");
const liveClock = liveEl?.querySelector(".lt-clock");
const liveCount = liveEl?.querySelector(".lt-count");
const liveStopBtn = liveEl?.querySelector(".lt-close");
const liveDot = liveEl?.querySelector(".lt-dot");
const liveMinBtn = liveEl?.querySelector(".lt-min");
/* This was being used by three functions and declared by none of them, so the
   first line of liveShowWorking threw a ReferenceError the instant stop was
   pressed. Nothing after it ran: no save, no close, and a panel left on screen
   that the pointer had already been taken back from. That was the app getting
   stuck, not any of the theories about focus. */
const liveState = liveEl?.querySelector(".lt-label");
const livePanelEl = liveEl?.querySelector(".lt-panel");
const liveFoot = liveEl?.querySelector(".lt-foot");

/* The line at the bottom of the black screen has one job: say how to get out of
   whatever it is currently doing. */
function liveFootSays(html) {
  if (liveFoot) liveFoot.innerHTML = html;
}
const LIVE_FOOT_LISTENING = '<kbd>esc</kbd> to stop and save <span>\u00b7</span> <kbd>\u2318\u21e7E</kbd> to toggle';
const LIVE_FOOT_CLOSING = '<kbd>esc</kbd> to close';

let liveOn = false;
/* Between pressing stop and the panel actually going away. liveOn stays true
   through it, so the panel keeps the pointer for as long as it is visible. */
let liveClosing = false;
/* Declared with the rest of the live state rather than beside the button that
   sets it: the heartbeat above reads it, and state read from two places should
   be declared before either. */
let liveMini = false;
/* Everything finished and banked, from segments the decoder has already been
   reset behind. This is what gets saved. */
let liveBanked = "";
/* The current segment as the decoder reports it: replaced on every utterance,
   never appended, because it is the whole segment each time. */
let liveSettled = "";
let liveNowText = "";
let liveStartedAt = 0;
let liveTimer = 0;

/* The words arrive one after another, the way they are said. Chunking them into
   three to six word cards read as a cut edit and was too much to have in the
   corner of your eye during an actual lecture: you end up watching the
   typography instead of listening to the room. The column it sits in is the
   part that was right, so that stays exactly where it is. */
const liveStill = window.matchMedia?.("(prefers-reduced-motion: reduce)");
let liveHearingTimer = 0;
let liveStuckTimer = 0;

/* One line, used by the states after the recording stops. */
function liveSay(text) {
  if (!livePara) return;
  const b = document.createElement("b");
  b.textContent = text;
  livePara.replaceChildren(b);
}

/* Words just landed, so the meter moves. It goes flat on its own after a second
   of nothing, which is how the screen says "still here, the room has gone
   quiet" rather than leaving you to guess. */
function liveHeardSomething() {
  liveEl?.classList.add("is-hearing");
  if (liveHearingTimer) window.clearTimeout(liveHearingTimer);
  liveHearingTimer = window.setTimeout(() => liveEl?.classList.remove("is-hearing"), 900);
}

/* The third of three heartbeats. The helper reports how long the model takes,
   main reports whether those words arrive here on time, and this reports how
   long they take to reach the glass. Between them the next run says which of
   the three is slow instead of it being argued about. */
const liveMetrics = { paints: 0, worstPaintMs: 0, chars: 0, since: 0 };
let liveMetricsTimer = 0;

function startLiveMetrics() {
  Object.assign(liveMetrics, { paints: 0, worstPaintMs: 0, chars: 0, since: Date.now() });
  if (liveMetricsTimer) window.clearInterval(liveMetricsTimer);
  liveMetricsTimer = window.setInterval(() => {
    if (!liveOn) return;
    logRenderer("live.paint", {
      paintsPer5s: liveMetrics.paints,
      worstPaintMs: Math.round(liveMetrics.worstPaintMs),
      chars: liveMetrics.chars,
      mini: liveMini,
    });
    liveMetrics.paints = 0;
    liveMetrics.worstPaintMs = 0;
  }, 5000);
}

function stopLiveMetrics() {
  if (liveMetricsTimer) { window.clearInterval(liveMetricsTimer); liveMetricsTimer = 0; }
}

function liveRender() {
  if (!livePara) return;
  const paintBegan = performance.now();
  /* Only the tail is painted. An hour of speech is tens of thousands of words
     and rewriting all of it on every partial is the lag: the full transcript
     lives in liveBanked and liveSettled and is saved whole at the end. */
  const whole = `${liveBanked} ${liveSettled}`.replace(/\s+/g, " ").trim();
  const tail = whole.length > 1200 ? whole.slice(-1200) : whole;
  const before = livePara.textContent;
  livePara.replaceChildren();
  if (tail) livePara.append(document.createTextNode(tail.endsWith(" ") ? tail : tail + " "));
  if (liveNowText) {
    const b = document.createElement("b");
    b.textContent = liveNowText;
    livePara.append(b);
  }
  livePara.scrollTop = livePara.scrollHeight;
  if (livePara.textContent !== before) liveHeardSomething();
  if (liveCount) {
    const words = whole.split(/\s+/).filter(Boolean).length;
    liveCount.textContent = words ? `${words.toLocaleString()} words` : "";
  }
  liveMetrics.paints += 1;
  liveMetrics.worstPaintMs = Math.max(liveMetrics.worstPaintMs, performance.now() - paintBegan);
  liveMetrics.chars = whole.length;
}

function liveTick() {
  if (!liveClock || !liveStartedAt) return;
  const seconds = Math.floor((Date.now() - liveStartedAt) / 1000);
  const m = Math.floor(seconds / 60);
  liveClock.textContent = `${m}:${String(seconds % 60).padStart(2, "0")}`;
}

function liveOpen() {
  if (liveOn || !liveEl) return;
  liveOn = true;
  liveClosing = false;
  startLiveMetrics();
  liveSetSize(false);
  liveBanked = "";
  liveSettled = "";
  liveNowText = "";
  liveStartedAt = Date.now();
  liveRender();
  liveTick();
  liveTimer = window.setInterval(liveTick, 1000);
  liveEl.classList.add("on");
  liveEl.setAttribute("aria-hidden", "false");
  logRenderer("live.open", {});
}

/* The three things the panel can say once the recording has stopped. It stops
   listening either way; what changes is whether there is anything to show. */
function liveShowWorking() {
  liveFootSays(LIVE_FOOT_CLOSING);
  liveEl?.classList.remove("is-hearing");
  if (liveState) liveState.textContent = "Writing your notes";
  if (liveDot) liveDot.classList.add("is-working");
  if (liveMinBtn) liveMinBtn.hidden = true;
  /* Never disabled, at any point, in any state. Whatever this panel happens to
     be doing, the button on it closes it, and closing it does not cancel the
     save: that is finishing in the main process either way. A disabled button
     on a panel that holds part of the screen is the shape of the bug that cost
     two restarts. */
  if (liveStopBtn) { liveStopBtn.disabled = false; liveStopBtn.textContent = "Close"; liveStopBtn.onclick = liveHide; }
  liveSay("One moment.");
}

function liveShowSaved(saved) {
  if (liveState) liveState.textContent = saved.notes ? "Notes ready" : "Saved";
  if (liveDot) { liveDot.classList.remove("is-working"); liveDot.classList.add("is-done"); }
  if (liveCount) liveCount.textContent = `${(saved.words || 0).toLocaleString()} words · ${saved.minutes || 1} min`;
  liveSay(saved.notes
    ? "Your notes are written. The transcript is underneath them."
    : "The transcript is saved. The notes did not come back this time.");
  /* One button, one obvious thing to do with it. */
  if (liveStopBtn) {
    liveStopBtn.disabled = false;
    liveStopBtn.textContent = "Open notes";
    liveStopBtn.onclick = () => {
      void window.brainoMac.liveOpen?.({ url: saved.url });
      liveHide();
    };
  }
  /* It does not sit there forever. Long enough to read and click. */
  window.setTimeout(liveHide, 20000);
}

function liveShowFailed(reason) {
  if (liveState) liveState.textContent = "Not saved";
  if (liveDot) liveDot.classList.remove("is-working");
  liveSay(reason === "not_linked"
    ? "The lecture was not saved because this Mac is not signed in."
    : "The lecture was not saved. The words are still in the log.");
  if (liveStopBtn) { liveStopBtn.disabled = false; liveStopBtn.textContent = "Close"; liveStopBtn.onclick = liveHide; }
  window.setTimeout(liveHide, 12000);
}

/* The single place the panel goes away, and therefore the single place the
   pointer is handed back. Safe to call twice. */
function liveHide() {
  liveOn = false;
  liveClosing = false;
  if (liveStuckTimer) { window.clearTimeout(liveStuckTimer); liveStuckTimer = 0; }
  if (liveHearingTimer) { window.clearTimeout(liveHearingTimer); liveHearingTimer = 0; }
  liveEl?.classList.remove("is-hearing");
  if (!liveEl) return;
  liveEl.classList.remove("on");
  liveEl.setAttribute("aria-hidden", "true");
  if (liveDot) liveDot.classList.remove("is-working", "is-done");
  if (liveMinBtn) liveMinBtn.hidden = false;
  if (liveStopBtn) { liveStopBtn.disabled = false; liveStopBtn.textContent = "Stop"; liveStopBtn.onclick = null; }
  if (liveState) liveState.textContent = "Listening";
  liveFootSays(LIVE_FOOT_LISTENING);
  liveMini = false;
  liveBanked = "";
  liveSettled = "";
  liveNowText = "";
  liveStartedAt = 0;
  /* Main is holding Escape away from the rest of the Mac until it hears this. */
  void window.brainoMac.liveDone?.();
  /* Hand the mouse back unconditionally. The next mouse move re-decides it in
     a frame, so the worst this can be wrong by is one frame over the mascot,
     and the alternative is the window keeping clicks it no longer draws
     anything for. */
  setMousePassthrough(true);
}

async function liveClose(save = true) {
  if (!liveOn || liveClosing || !liveEl) return;
  /* liveOn deliberately stays true until liveHide runs. It used to be cleared
     right here, and that one line was enough to strand the machine: the pointer
     arbiter reads it, so the moment stop was pressed every click went straight
     through a panel that was still on screen, while main had already handed
     Escape back to the rest of the Mac. Nothing left to press. */
  liveClosing = true;
  stopLiveMetrics();
  if (liveTimer) { window.clearInterval(liveTimer); liveTimer = 0; }

  /* The last hypothesis was still speech. Dropping it loses the closing
     sentence of every lecture. */
  const full = `${liveBanked} ${liveSettled} ${liveNowText}`.replace(/\s+/g, " ").trim();
  const minutes = Math.max(1, Math.round((Date.now() - liveStartedAt) / 60000));
  logRenderer("live.close", { chars: full.length, minutes, save });

  if (save && full) {
    /* The panel stays up while the notes are made. Pressing stop and being shown
       nothing at all is what this looked like before: the lecture went into the
       database and the screen simply cleared, so there was no reason to believe
       any of it had happened. */
    liveShowWorking();
    /* Nothing below here is allowed to leave the panel on screen. A throw used
       to do exactly that, and the save is a network call, so it also gets an
       outer limit of its own on top of the one main keeps. */
    if (liveStuckTimer) window.clearTimeout(liveStuckTimer);
    liveStuckTimer = window.setTimeout(() => {
      logRenderer("live.save.stuck", { chars: full.length });
      liveShowFailed("slow");
    }, 40000);
    let saved = null;
    try {
      saved = await window.brainoMac.liveSave?.({ transcript: full, minutes });
    } catch (error) {
      logRenderer("live.save.threw", { error: String(error?.message || error) });
    }
    if (liveStuckTimer) { window.clearTimeout(liveStuckTimer); liveStuckTimer = 0; }
    try {
      if (saved?.ok) liveShowSaved(saved);
      else liveShowFailed(saved?.reason || "error");
    } catch (error) {
      logRenderer("live.show.threw", { error: String(error?.message || error) });
      liveHide();
    }
    return;
  }

  liveHide();
}

/* A rotate finished a segment and reset the decoder behind it. Bank it and
   start the next one empty, which is what stops an hour of lecture becoming one
   accumulator that gets slower every minute. */
window.brainoMac.onLiveSegment?.((payload) => {
  if (!liveOn) return;
  const text = String(payload?.text || "").trim();
  if (text) liveBanked = `${liveBanked} ${text}`.replace(/\s+/g, " ").trim();
  liveSettled = "";
  liveNowText = "";
  liveRender();
});

window.brainoMac.onLiveMode?.((payload) => {
  if (payload?.open) liveOpen(); else void liveClose(payload?.save !== false);
});

/* Escape pressed while the panel is finishing up. It is not a stop, the stop
   already happened; it is "get off my screen". */
window.brainoMac.onLiveDismiss?.(() => { liveHide(); });

/* Three ways out, and this is the one you can see. The other two are Escape,
   bound globally in main because this window does not get keystrokes on its
   own, and the hotkey. */
liveStopBtn?.addEventListener("click", () => {
  /* Once the recording has stopped this button belongs to whatever state the
     panel is in, and that state wires its own onclick. */
  if (liveClosing) return;
  void window.brainoMac.liveStop?.();
});

/* Minimise is not stop. Full screen while you are only listening; the bar when
   you want the machine back. */
function liveSetSize(mini) {
  if (!liveEl) return;
  liveMini = mini;
  liveEl.classList.toggle("is-mini", mini);
  liveEl.classList.toggle("is-full", !mini);
  if (liveMinBtn) liveMinBtn.textContent = mini ? "Expand" : "Minimise";
  void window.brainoMac.liveSize?.({ mode: mini ? "mini" : "full" });
}
liveMinBtn?.addEventListener("click", () => liveSetSize(!liveMini));

/* While minimised the window is passthrough so every click reaches whatever is
   underneath. It has to stop being passthrough for exactly as long as the
   pointer is over the bar, or the buttons on it are decorative. Same trick the
   mascot uses. */
const livePanel = liveEl?.querySelector(".lt-panel");
livePanel?.addEventListener("mouseenter", () => { if (liveMini) setMousePassthrough(false); });
livePanel?.addEventListener("mouseleave", () => { if (liveMini) setMousePassthrough(true); });

window.brainoMac.onDictationPartial?.((payload) => {
  /* LIVE owns the transcript while it is up. The notch has its own live
     surface, and both of them painting the same words several times a second
     is the duplicate on screen and twice the work for one transcript. */
  if (liveOn) return;
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

/* LIVE listens to the same stream, and separately: it runs when dictation mode
   does not, so it cannot hang off the handler above. */
window.brainoMac.onDictationPartial?.((payload) => {
  if (!liveOn) return;
  const text = String(payload?.text || "").trim();
  if (!text) return;
  if (payload?.committed || payload?.final) {
    /* The engine reports the whole transcript so far at the end of an
       utterance, not the newest phrase, so this replaces rather than appends.
       Appending here is what said every earlier sentence again. */
    liveSettled = text.replace(/\s+/g, " ").trim();
    liveNowText = "";
    liveRender();
    return;
  }
  liveNowText = text;
  liveRender();
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
      /* Whoever is driving has to still be driving. This read `skitRunning`
         alone, which is set by the double Option skit and by nothing else, so
         when the pitch demo called this the very first frame found it false,
         ended the moonwalk and reset the rig. The hat appeared and vanished
         inside one frame, every single time, and what the room saw was
         whatever else happened to be animating him. */
      if (now - start < durationMs && (skitRunning || pitchRunning)) {
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
  /* Command+Shift+B hides him and brings him back (2026-09-26). It used to
     swap Braino and Brainelle, which his double-click menu already does. */
  setMascotHide(mascotHidden() ? null : "hidden", "hotkey");
});
window.brainoMac.onMascotHide?.((payload) => setMascotHide(payload?.mode || null, payload?.source || "main"));
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
  if (mediaAudioPlaying) mediaConfirmedPlayingAt = Date.now();
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
window.brainoMac.onNamedMode?.((payload) => {
  namedModeOn = Boolean(payload?.enabled);
  /* Turning it on mid-session must not leave the window standing open from
     whatever was said before it was switched on. */
  namedReset();
  if (nfPanelOpen) renderBrainoPanel();
  logRenderer("named.mode_changed", { on: namedModeOn });
  updateNotchFace();
});
/* Arrival just let you in (main.cjs, after Touch ID and the summary): he
   comes out of the notch and says good morning, the last beat of it. Never
   over a conversation, and not in Her mode, which has its own presence. */
/* Notch style (Settings › Notch). "affective" puts .nf-aos on the notch, which
   the CSS turns into the AffectiveOS notch; "braino" leaves it as it always
   was. The colour behind it moves through the spectrum, ten seconds a colour,
   easing into the next over the last two. */
const NF_AOS_SPECTRUM = [[8, 41, 255], [255, 15, 31], [5, 217, 89], [158, 26, 255], [255, 107, 5], [0, 184, 242], [255, 20, 140]];
let nfAosTimer = 0;
function nfAosPaintTint() {
  const t = Date.now() / 1000;
  const n = NF_AOS_SPECTRUM.length;
  const i = Math.floor(t / 10) % n;
  const into = (t % 10) - 8;
  const k = into > 0 ? (1 - Math.cos((into / 2) * Math.PI)) / 2 : 0;
  const a = NF_AOS_SPECTRUM[i], b = NF_AOS_SPECTRUM[(i + 1) % n];
  const rgb = a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(", ");
  notchFace?.style.setProperty("--aos-tint", `rgb(${rgb})`);
}
/* Without subtitles (2026-10-11): two tiny indicators at the notch's edges,
   a dot while he listens and three bars while he speaks. Nothing else. */
function nfEnsureNoSubIndicators() {
  const pill = notchFace?.querySelector(".nf-pill");
  if (!pill || pill.querySelector(".nf-ns-listen")) return;
  const listen = document.createElement("span");
  listen.className = "nf-ns-listen";
  listen.setAttribute("aria-hidden", "true");
  const talk = document.createElement("span");
  talk.className = "nf-ns-talk";
  talk.setAttribute("aria-hidden", "true");
  talk.innerHTML = "<i></i><i></i><i></i>";
  pill.append(listen, talk);
}
function applyNotchStyle(style) {
  const on = style === "affective";
  if (on) nfEnsureNoSubIndicators();
  if (on) { clearNotchAnswer({ invalidate: true }); }
  notchFace?.classList.toggle("nf-aos", on);
  document.body.classList.toggle("aos-notch", on);
  if (on && notchFace?.classList.contains("nf-think-open")) nfSetThinkingOpen(false);
  window.clearInterval(nfAosTimer);
  nfAosTimer = 0;
  if (on) { nfAosPaintTint(); nfAosTimer = window.setInterval(nfAosPaintTint, 150); }
  logRenderer("notch_style.applied", { style: on ? "affective" : "braino" });
}
window.brainoMac.notchStyle?.().then((r) => applyNotchStyle(r?.style)).catch(() => {});
window.brainoMac.onNotchStyle?.((payload) => applyNotchStyle(payload?.style));

window.brainoMac.onArrivalHello?.(async () => {
  if (herMode || realtimeActive || processing || brainoAudible()) {
    logRenderer("arrival.hello_skipped", { herMode, realtimeActive, processing });
    return;
  }
  const auth = await window.brainoMac.authStatus().catch(() => null);
  const firstName = String(auth?.displayName || "").split(" ")[0]?.trim();
  const line = `${timeGreeting()}${firstName ? `, ${firstName}` : ""}.`;
  if (walkerHome) await runIomiBootMascotExit().catch(() => {});
  // Asked for while he says good morning, so it is ready by the time he stops.
  const callback = window.brainoMac.arrivalCallback?.().catch(() => null);
  await speak(line, { captions: false });
  logInteraction({ kind: "voice", route: "arrival_hello", braino_text: line, meta: { flow: "arrival" } });
  const back = await callback;
  if (back?.ok && back.line && !processing && !realtimeActive) {
    await speak(back.line, { captions: false });
    logInteraction({ kind: "voice", route: "arrival_callback", braino_text: back.line, meta: { flow: "arrival" } });
  }
  logRenderer("arrival.hello", {});
});
window.brainoMac.onWakeDetected?.((payload) => {
  /* His own voice saying his name through the speakers is not you calling him. */
  if (brainoAudible()) {
    logRenderer("wakeword.self_heard", {});
    return;
  }
  /* "...after Braino is done..." on the on-device recogniser is his name
     said about him, not to him. Not a wake. */
  if (payload?.transcript && nameIsOnlyAMention(payload.transcript)) {
    logRenderer("wakeword.mention_not_call", {});
    return;
  }
  // The wake phrase was heard ON-DEVICE (BrainoWakeWord.swift requires
  // requiresOnDeviceRecognition=true) — nothing about it was sent anywhere.
  // Only NOW does a real (cloud, paid) realtime session open, exactly like
  // pressing double-Control by hand.
  logRenderer("wakeword.wake", { transcriptChars: String(payload?.transcript || "").length });
  if (realtimeActive) namedHeardOnDeviceAt = Date.now();
  if (realtimeActive) holdMedia("name_in_session");
  /* The helper heard his name a moment ago, out here, before any session
     existed. The renderer will never see that word in its own transcript, so
     without this the session would open ASLEEP and quietly bin the very command
     that woke him. */
  namedWake("wake-word");
  if (!realtimeActive && !realtimeConnecting && !processing) {
    // The golden trace: he heard his name and is waking up.
    startVoiceWakeShimmer({ golden: true });
    void startListening();
  }
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
/* An important person's WhatsApp, shown and never spoken. */
window.brainoMac.onWaCard?.((payload) => {
  const name = String(payload?.name || "").trim();
  const text = String(payload?.text || "").trim();
  if (!name) return;
  nfShowTransient(text ? `${name}: ${text}` : `${name} messaged`, 9000);
  logRenderer("whatsapp.card_shown", { chars: text.length });
});

/* One way in (2026-10-15): a command typed in the Braino app's chat runs
   through the same path as voice, so it shows and speaks in the notch, and a
   yes or no answers it the same way. */
window.brainoMac.onRunInput?.((payload) => {
  const text = String(payload?.text || "").trim();
  if (!text) return;
  logRenderer("input.from_app", { chars: text.length });
  void flushRealtimeTranscript("app_chat", text, { separateTurn: true, preAccepted: true, typed: true });
});
window.brainoMac.onWaBadge?.((payload) => {
  const before = nfWaBadge.count;
  nfWaBadge = { count: Number(payload?.count) || 0, sender: String(payload?.sender || "") };
  updateNotchFace();
  /* A new message opens the notch the way his answers do, sender and words,
     instead of a tiny ticker (2026-10-15). Never over speech or an open answer. */
  const text = String(payload?.text || "").trim();
  if (nfWaBadge.count > before && text && !speaking && !notchFace?.classList.contains("nf-answer-open")) {
    logRenderer("notch.wa_message.shown", { chars: text.length });
    void speak(`${String(payload?.name || nfWaBadge.sender)}: ${text}`, { silent: true });
  }
});
window.brainoMac.onNotchFace?.((payload) => setNotchFaceEnabled(Boolean(payload?.on)));
/* Setup speaks through the notch too: the window shows what to tap, the notch
   says the same line, so the two move as one (setup.js, maybeStartSetup). */
window.brainoMac.onSetupNotch?.((payload) => { if (payload?.text) nfShowTransient(String(payload.text), Number(payload.ms) || 4000); });
/* Narration while he works. Unlike speak-line this is meant for busy moments:
   it never cuts off a line he is already saying (it waits for it, newest line
   wins), and the final answer simply supersedes it, the same way any new
   speak() does. Barge-in stops it like any other speech. */
let narrateNext = "";
let narrateTimer = 0;
window.brainoMac.onNarrate?.((payload) => {
  const text = String(payload?.text || "").trim();
  if (!text || !narrateOn()) return;
  narrateNext = text;
  if (narrateTimer) return;
  const started = Date.now();
  const tryNow = () => {
    if (!narrateNext) { narrateTimer = 0; return; }
    if (speaking && Date.now() - started < 6000) { narrateTimer = window.setTimeout(tryNow, 180); return; }
    const line = narrateNext;
    narrateNext = ""; narrateTimer = 0;
    if (speaking) return;   // still talking after 6s: this line is stale, drop it
    logRenderer("narrate.say", { text: line.slice(0, 80) });
    void speak(line, { narration: true });
  };
  tryNow();
});
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
      hilTaskRunning = false;
      notchFace?.classList.remove("nf-astra", "nf-task");
      settleStaleThinkingStatus("task_progress.clear_notch");
    } catch (_) {}
    return;
  }
  // Who is thinking, carried on the same payload as the caption. Only ever set
  // from what the server said, and cleared the moment a turn comes back on the
  // ordinary brain, so the gold can never be left burning over a cheap run.
  if (notchFace && progress.brain) {
    notchFace.classList.toggle("nf-astra", progress.brain === "astra");
  }
  /* A job is running, and it stays running until main says otherwise.
   *
   * This drives two things that used to be inferred and got it wrong: the
   * auto-clear timer above, and the blue that says work is happening. Blue
   * rather than amber because amber already means cowork is watching the
   * screen, and two ambient colours meaning different things is how you end up
   * having to remember which is which. */
  if (typeof progress.running === "boolean") {
    hilTaskRunning = progress.running;
    notchFace?.classList.toggle("nf-task", hilTaskRunning);
    if (hilTaskRunning) window.clearTimeout(nfThinkingTimer);
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
  if (nfQuietState && nfQuietEls?.root) {
    const band = nfQuietEls.root.getBoundingClientRect();
    if (x >= band.left - 4 && x <= band.right + 4 && y <= band.top + nfNotchHeight() + 4) return true;
    return Boolean(document.elementFromPoint(x, y)?.closest?.(".nf-q button"));
  }
  const rect = nfPill.getBoundingClientRect();
  // Idle, the part below the menu bar belongs to Chrome's tab strip: it tucks
  // away (nfUpdateTuck) and never takes the click. Only the housing does.
  if (nfIdleForTuck() && y > nfNotchHeight()) return false;
  // Collapsed: the pill itself, nearly edge-to-edge — a padded zone was
  // stealing clicks from Chrome tabs that sit beside/below the housing.
  const pad = nfExpanded || nfMusicOpen || nfDropDepth > 0 ? 26 : 4;
  return x >= rect.left - pad && x <= rect.right + pad && y <= rect.bottom + pad;
}

/* Out of the way of Chrome's tabs (2026-09-30).
   Idle, the notch hangs 22px below the menu bar, over the tab strip, so a new
   tab or a tab near the middle could not be clicked. When the pointer comes
   toward that strip the notch tucks up to the housing's own height and lets
   the click through; it drops back a moment after the pointer leaves. Never
   while he is listening, speaking, thinking or showing anything. */
let nfTucked = false;
let nfUntuckTimer = 0;
function nfIdleForTuck() {
  if (!notchFace?.classList.contains("on") || herMode || nfQuietState) return false;
  if (nfExpanded || nfMusicOpen || nfDropDepth > 0) return false;
  return !["listen", "speak", "captioning", "busy", "nf-thinking", "nf-answer-open", "nf-inline-open", "nf-think-open"].some((c) => notchFace.classList.contains(c));
}
function nfUpdateTuck(x, y) {
  if (!nfPill) return;
  const idle = nfIdleForTuck();
  const r = nfPill.getBoundingClientRect();
  const housing = nfNotchHeight();
  const near = idle && x >= r.left - 40 && x <= r.right + 40 && y > housing - 2 && y <= housing + 22 + 36;
  if (near) {
    window.clearTimeout(nfUntuckTimer);
    nfUntuckTimer = 0;
    if (!nfTucked) { nfTucked = true; notchFace.classList.add("nf-tuck"); }
  } else if (nfTucked && !nfUntuckTimer) {
    nfUntuckTimer = window.setTimeout(() => {
      nfUntuckTimer = 0;
      nfTucked = false;
      notchFace?.classList.remove("nf-tuck");
    }, idle ? 700 : 0);
  }
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
  nfSetZone({ expanded: true });
  nfRenderTray();
  logRenderer("tray.expand", {});
}

function nfTrayCollapse() {
  if (!nfExpanded) return;
  nfExpanded = false;
  notchFace?.classList.remove("expanded");
  nfCollapseNotchZone();
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
  /* Files held: pointing at the notch's housing opens the tray (the band
     below it still tucks away for Chrome's tabs). Leaving closes it. */
  if (nfDropOn && !herMode && nfShelf.length) {
    if (nfZoneInsideMain && !nfDropState) { window.clearTimeout(nfDropTimer); nfDropSet("tray"); return; }
    if (!nfZoneInsideMain && nfDropState === "tray") { window.clearTimeout(nfDropTimer); nfDropTimer = window.setTimeout(() => nfDropSet(""), 900); }
    if (nfZoneInsideMain && nfDropState === "tray") { window.clearTimeout(nfDropTimer); nfDropTimer = 0; }
  }
  notchFace?.classList.toggle("nf-reveal", nfZoneInsideMain);
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
  /* The typing field owns every click while it is up. */
  if (typingOpen) return;
  /* A click puts your sentence away. It is the notch's biggest sheet and it
     sits over the tabs of whatever is behind it. */
  if (nfHeardText && notchFace?.classList.contains("nf-inline-open")
    && !notchFace.classList.contains("nf-thinking")) {
    logRenderer("notch.caption_dismissed", {});
    nfClearCaptions();
    return;
  }
  /* A click no longer TYPES. Typing into this overlay never worked well (it
     cannot hold the keyboard the way a real window does), and every reach for
     a browser tab near the notch opened "Type what you need", which then sat
     over those tabs. A plain click on the notch does nothing now; Command
     Option T still opens the field on purpose. */
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
    void window.brainoMac.trayMediaControl?.({ action, source });
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
  nfSetZone({ expanded: true, width: 440, height: 240 });
  nfRenderMusicSurface();
  logRenderer("music.island.expand", { source: nfMusicData()?.source || "" });
}

function nfMusicCollapsePlayer() {
  if (!nfMusicOpen) return;
  nfMusicOpen = false;
  notchFace?.classList.remove("nf-music-open");
  if (!nfExpanded) nfCollapseNotchZone();
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
    void window.brainoMac.trayMediaControl?.({ action, source });
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

// ── Notch drop: Tray and AirDrop (2026-10-01) ───────────────────────────────
// Start dragging a file anywhere and the notch opens into two zones, Tray and
// AirDrop (BrainoDrop watch tells us a file drag began). Drop on AirDrop:
// Apple's AirDrop sends it and the notch shows the real outcome. Drop on
// Tray: Braino holds it, as a picture you can drag back out. One island size
// for all of it. Behind BRAINO_NOTCH_DROP=1 until launch.
const nfdEsc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let nfDropOn = false;
let nfDropState = "";
let nfDropHot = "";
let nfDropTimer = 0;
let nfDropFiles = [];
const NFD_ICON = {
  tray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l2.2-6.6A2 2 0 0 1 8.1 5h7.8a2 2 0 0 1 1.9 1.4L20 13"/><path d="M4 13v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4h-4.5l-1 2h-5l-1-2z"/></svg>',
  air: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 19l-3.2 2.2M12 19l3.2 2.2M12 19v-6"/><path d="M8.5 13.6a5 5 0 1 1 7 0"/><path d="M5.6 16.4a9 9 0 1 1 12.8 0"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="#30d158" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bad: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff453a" stroke-width="2.4" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
};
const nfDropBox = () => notchFace?.querySelector(".nf-dropbox");
const nfDropName = () => nfDropFiles.length === 1 ? nfDropFiles[0].name : `${nfDropFiles.length} files`;
function nfDropRender(extra = {}) {
  const box = nfDropBox(); if (!box) return;
  const s = nfDropState;
  if (s === "ready") {
    box.innerHTML = `<div class="nfd-zones"><div class="nfd-zone tray${nfDropHot === "tray" ? " hot" : ""}">${NFD_ICON.tray}<b>Tray</b><small>Keep it here</small></div>
      <div class="nfd-zone air${nfDropHot === "air" ? " hot" : ""}">${NFD_ICON.air}<b>AirDrop</b><small>Send it nearby</small></div></div>`;
  } else if (s === "tray") {
    box.innerHTML = `<div class="nfd-row"><div class="nfd-tray">${nfShelf.slice(-6).map((f) => `<div class="nfd-file" draggable="true" data-path="${nfdEsc(f.path)}" title="Drag it out"><button type="button" class="nfd-x" data-remove="${nfdEsc(f.path)}" aria-label="Remove ${nfdEsc(f.name)}">×</button><img alt="" ${f.thumb ? `src="${f.thumb}"` : ""} class="${f.icon ? "icon" : ""}"><span>${nfdEsc(f.name)}</span></div>`).join("")}</div>
      <div class="nfd-text" style="flex:0 0 auto"><b>In the tray</b><span>${nfShelf.length} file${nfShelf.length === 1 ? "" : "s"} · drag one out</span><button type="button" class="nfd-clear" data-clear="1">Clear all</button></div></div>`;
  } else if (s === "air-picking" || s === "air-sending") {
    box.innerHTML = `<div class="nfd-row"><div class="nfd-icon nfd-radar"><i></i><i></i><i></i>${NFD_ICON.air}</div>
      <div class="nfd-text"><b>${s === "air-picking" ? "Pick a device in AirDrop" : "Sending with AirDrop"}</b><span>${nfdEsc(nfDropName())}</span>${s === "air-sending" ? `<div class="nfd-bar"><i></i></div>` : ""}</div></div>`;
  } else if (s === "air-sent") {
    box.innerHTML = `<div class="nfd-row"><div class="nfd-icon nfd-ok">${NFD_ICON.ok}</div><div class="nfd-text"><b>Sent with AirDrop</b><span>${nfdEsc(nfDropName())}</span></div></div>`;
  } else if (s === "air-closed") {
    box.innerHTML = `<div class="nfd-row"><div class="nfd-icon nfd-meh">${NFD_ICON.air}</div><div class="nfd-text"><b>AirDrop closed</b><span>${nfdEsc(extra.error || "I couldn't tell whether it sent.")}</span></div></div>`;
  } else if (s === "air-failed" || s === "air-cancelled") {
    const failed = s === "air-failed";
    box.innerHTML = `<div class="nfd-row${failed ? " nfd-shake" : ""}"><div class="nfd-icon ${failed ? "nfd-bad" : "nfd-meh"}">${failed ? NFD_ICON.bad : NFD_ICON.air}</div>
      <div class="nfd-text"><b>${failed ? "AirDrop didn't go through" : "AirDrop cancelled"}</b><span>${nfdEsc(extra.error || (failed ? "Try again in a moment." : nfDropName()))}</span></div></div>`;
  } else if (s === "hello") {
    box.innerHTML = `<div class="nfd-hello"><svg viewBox="0 0 170 62" aria-label="hello"><defs><linearGradient id="nfd-hello-grad" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#ffd7cf"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
      <path d="M8 50 C 18 34, 28 8, 22 6 C 15 4, 13 30, 13 54 C 17 40, 30 32, 32 42 L 31 54 C 36 50, 42 44, 46 46 C 54 48, 62 40, 58 34 C 54 28, 44 36, 47 46 C 50 54, 62 54, 70 44 C 78 32, 86 10, 80 6 C 74 4, 72 34, 76 50 C 78 56, 86 52, 92 44 C 100 32, 108 10, 102 6 C 96 4, 94 34, 98 50 C 100 56, 108 52, 114 44 C 118 38, 128 34, 132 42 C 136 52, 124 58, 119 50 C 115 43, 124 34, 134 38 C 142 41, 150 40, 160 32"/></svg>
      <small>Drag a file to the notch to keep it, or AirDrop it</small></div>`;
  }
}
function nfDropSet(state, extra = {}, holdMs = 0) {
  window.clearTimeout(nfDropTimer);
  nfDropState = state;
  if (!notchFace) return;
  if (!state) {
    notchFace.classList.remove("nf-drop");
    delete notchFace.dataset.drop;
    nfDropHot = "";
    const box = nfDropBox(); if (box) box.innerHTML = "";
    nfCollapseNotchZone();
    updateNotchFace();
    logRenderer("drop.state", { state: "" });
    return;
  }
  notchFace.classList.add("nf-drop", "on");
  notchFace.dataset.drop = state;
  nfDropRender(extra);
  // The whole island takes the mouse while it is open, so a drop lands.
  nfSetZone({ expanded: true, width: 540, height: nfNotchHeight() + 124 });
  logRenderer("drop.state", { state });
  if (holdMs) nfDropTimer = window.setTimeout(() => nfDropSet(""), holdMs);
}
function nfDropZoneAt(clientX) {
  const pill = notchFace?.querySelector(".nf-pill");
  if (!pill) return "";
  const r = pill.getBoundingClientRect();
  return clientX < r.left + r.width / 2 ? "tray" : "air";
}
/* How many files the notch is holding, shown inside it. */
function nfTraySyncBadge() {
  if (!nfPill) return;
  const n = nfDropOn ? nfShelf.length : 0;
  notchFace?.classList.toggle("nf-tray-held", n > 0);
  if (n) nfPill.dataset.tray = String(n); else delete nfPill.dataset.tray;
}
function nfTrayRemove(path) {
  nfShelf = path ? nfShelf.filter((f) => f.path !== path) : [];
  nfRenderShelf();
  nfTraySyncBadge();
  logRenderer("tray.removed", { left: nfShelf.length, all: !path });
  if (!nfShelf.length) nfDropSet(""); else if (nfDropState === "tray") nfDropRender();
}
async function nfDropAddToTray(files) {
  for (const f of files) {
    if (nfShelf.some((x) => x.path === f.path)) continue;
    const entry = { path: f.path, name: f.name };
    nfShelf.push(entry);
    window.brainoMac.fileThumb?.(f.path).then((r) => { if (r?.ok) { entry.thumb = r.src; entry.icon = Boolean(r.icon); if (nfDropState === "tray") nfDropRender(); } });
  }
  nfShelf = nfShelf.slice(-6);
  nfRenderShelf();
  nfTraySyncBadge();
}
/* A drop, from the helper's drop target or the window's own. */
function nfDropHandle(zone, files) {
  nfDropFiles = files.filter((f) => f.path).slice(0, 8);
  logRenderer("drop.dropped", { zone, count: nfDropFiles.length });
  if (!nfDropFiles.length) { nfDropSet(""); return; }
  if (zone === "air") {
    nfDropSet("air-picking");
    window.brainoMac.airdrop?.(nfDropFiles.map((f) => f.path)).then((r) => {
      // The status stream already moved the notch; this only covers a helper that never spoke.
      if (/^air-(picking|sending)$/.test(nfDropState)) nfDropSet(r?.ok ? "air-sent" : "air-failed", { error: r?.error }, r?.ok ? 2800 : 4200);
    });
  } else {
    void nfDropAddToTray(nfDropFiles).then(() => nfDropSet("tray", {}, 5000));
  }
}
window.brainoMac.notchDropEnabled?.().then((r) => {
  nfDropOn = Boolean(r?.on);
  if (!nfDropOn) return;
  let seen = false; try { seen = localStorage.getItem("nfHelloSeen") === "1"; } catch (_) {}
  if (!seen) window.setTimeout(() => { if (!nfDropState && !herMode) { nfDropSet("hello", {}, 3800); try { localStorage.setItem("nfHelloSeen", "1"); } catch (_) {} } }, 2500);
}).catch(() => {});
window.__nfHello = () => nfDropSet("hello", {}, 3800);
window.brainoMac.onFileDrag?.((msg) => {
  if (!nfDropOn || herMode) return;
  if (typeof msg?.hover === "string") {
    if (nfDropState === "ready" && msg.hover !== nfDropHot) { nfDropHot = msg.hover; nfDropRender(); }
    return;
  }
  if (typeof msg?.drop === "string") {
    window.clearTimeout(nfDropTimer);
    nfDropHandle(msg.drop, (msg.files || []).map((p) => ({ path: String(p), name: String(p).split("/").pop() || "file" })));
    return;
  }
  if (msg?.drag) {
    if (!nfDropState || nfDropState === "tray" || nfDropState === "hello" || /^air-(sent|failed|cancelled)$/.test(nfDropState)) { nfDropHot = ""; nfDropSet("ready"); }
  } else if (nfDropState === "ready") {
    // The drop itself arrives a moment after the button comes up.
    nfDropTimer = window.setTimeout(() => { if (nfDropState === "ready") nfDropSet(""); }, 450);
  }
});
window.brainoMac.onAirdropStatus?.((msg) => {
  const st = String(msg?.status || "");
  if (st === "picking") nfDropSet("air-picking");
  else if (st === "sending") nfDropSet("air-sending");
  else if (st === "sent") nfDropSet("air-sent", {}, 2800);
  else if (st === "cancelled") nfDropSet("air-cancelled", { error: msg.error }, 2600);
  else if (st === "closed") nfDropSet("air-closed", { error: msg.error }, 3200);
  else if (st === "failed") nfDropSet("air-failed", { error: msg.error }, 4200);
});
// Remove one, or clear the tray.
document.addEventListener("click", (event) => {
  const x = event.target.closest?.(".nf-dropbox [data-remove], .nf-dropbox [data-clear]");
  if (!x) return;
  event.preventDefault(); event.stopPropagation();
  nfTrayRemove(x.dataset.clear ? "" : x.dataset.remove);
}, true);
// Drag a tray file back out: Electron's way, a native file drag started from dragstart.
document.addEventListener("dragstart", (event) => {
  const f = event.target.closest?.(".nf-dropbox .nfd-file");
  if (!f) return;
  event.preventDefault();
  window.clearTimeout(nfDropTimer);
  window.brainoMac.trayDragOut?.(f.dataset.path);
  nfDropTimer = window.setTimeout(() => nfDropSet(""), 1800);
});
// Hovering the tray keeps it open; leaving lets it go.
document.addEventListener("mouseover", (event) => {
  if (nfDropState !== "tray") return;
  if (event.target.closest?.(".nf-dropbox")) { window.clearTimeout(nfDropTimer); nfDropTimer = 0; }
  else if (!nfDropTimer) nfDropTimer = window.setTimeout(() => nfDropSet(""), 1500);
});

// ── File shelf: drag a file at the notch, Braino holds it. ──
function nfHasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

document.addEventListener("dragover", (event) => {
  if (!nfHasFiles(event)) return;
  if (nfDropOn && !herMode) {
    // The helper may be slower than the cursor: open the zones on arrival too.
    if (nfDropState !== "ready" && !/^air-(picking|sending)$/.test(nfDropState) && nfPointInNotchZone(event.clientX, event.clientY)) nfDropSet("ready");
    if (nfDropState === "ready") {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      window.clearTimeout(nfDropTimer);
      const hot = nfDropZoneAt(event.clientX);
      if (hot !== nfDropHot) { nfDropHot = hot; nfDropRender(); }
      return;
    }
  }
  if (nfPointInNotchZone(event.clientX, event.clientY)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (nfDropDepth === 0) {
      nfDropDepth = 1;
      notchFace?.classList.add("dropping");
      nfSetZone({ expanded: true });
    }
  } else if (nfDropDepth > 0) {
    nfDropDepth = 0;
    notchFace?.classList.remove("dropping");
    if (!nfExpanded) nfCollapseNotchZone();
  }
});

document.addEventListener("dragleave", (event) => {
  if (event.relatedTarget) return;
  nfDropDepth = 0;
  notchFace?.classList.remove("dropping");
  if (!nfExpanded) nfCollapseNotchZone();
});

document.addEventListener("drop", (event) => {
  if (!nfHasFiles(event)) return;
  if (nfDropOn && nfDropState === "ready") {
    event.preventDefault();
    nfDropHandle(nfDropHot || nfDropZoneAt(event.clientX), Array.from(event.dataTransfer?.files || [])
      .map((file) => ({ path: window.brainoMac.pathForFile?.(file) || "", name: file.name || "file" })));
    return;
  }
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
/* Brainelle is on, and her voice belongs to her body.
 *
 * She was switched off on Sept 1 because her voice could be on with nothing on
 * screen to say so: the character was a setting of its own, so "be Brainelle"
 * left Braino's rig walking around talking in her voice, and it read as Braino
 * being broken. Switching her off fixed that but split the other way — the
 * avatar picker still offered her, so she walked on screen and spoke in HIS
 * voice.
 *
 * The real fix is that there is only one switch. The avatar decides the
 * character: the picker, Cmd+Shift+B and the spoken "be Brainelle" all go
 * through setMascotChoice, which sets the character from the rig. So if you
 * hear her, she is the one on screen, with the pink notch. The pitch demo still
 * forces Braino for its duration and puts her back afterwards. Set this to
 * false to take her out again. */
const BRAINELLE_ENABLED = true;

let macCharacter = "braino";
try {
  if (BRAINELLE_ENABLED) {
    const stored = window.localStorage.getItem(MAC_CHARACTER_STORAGE_KEY);
    if (stored && MAC_CHARACTERS[stored]) macCharacter = stored;
  } else {
    window.localStorage.removeItem(MAC_CHARACTER_STORAGE_KEY);
  }
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
  /* One gate, so the avatar picker, the hotkey and "be Brainelle" all land on
     the same answer instead of each needing its own. */
  const next = (BRAINELLE_ENABLED && MAC_CHARACTERS[key]) ? key : "braino";
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

/* ── Sarvam listening engine (2026-10-16) ─────────────────────────────────
   When Settings > Listening says Sarvam, main sends start/stop/rotate here
   instead of to the on-device helper. This streams the raw mic (no echo
   cancellation, noise suppression or gain: those bend the voice and add delay,
   which is what Wispr Flow turns off too) as 16 kHz 16-bit mono in ~64ms
   frames to Sarvam's realtime socket, and answers main in the helper's own
   words: `partial` while you speak, `utterance` (the segment so far) when a
   sentence settles, `segment` on rotate, `delta` + `final` on stop. Main
   cannot tell the engines apart, which is the point: one lane. */
const sarvam = {
  ws: null, key: "", ctx: null, stream: null, node: null, source: null,
  session: "", listening: false, pending: [], ping: 0, closing: null,
};

function sarvamTell(payload) { window.brainoMac?.sarvamEvent?.(payload); }
function sarvamLog(event, data = {}) { sarvamTell({ type: "log", event, data }); }

function sarvamB64(int16) {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function sarvamSend(obj) {
  if (sarvam.ws && sarvam.ws.readyState === WebSocket.OPEN) { sarvam.ws.send(JSON.stringify(obj)); return; }
  // Before the socket opens, keep up to ~2s of audio so the first words land.
  if (obj.event === "audio_input" && sarvam.pending.length < 32) sarvam.pending.push(obj);
}

function sarvamConnect() {
  const params = new URLSearchParams({
    language_code: "en-IN", model: "saaras:v3-realtime", stream_type: "fast",
    encoding: "linear16", sample_rate: "16000", silence_duration_ms: "500",
  });
  const ws = new WebSocket(`wss://api.sarvam.ai/speech-to-text-realtime/ws?${params}`, [`api-subscription-key.${sarvam.key}`]);
  sarvam.ws = ws;
  ws.onopen = () => {
    sarvamLog("open", {});
    for (const obj of sarvam.pending.splice(0)) ws.send(JSON.stringify(obj));
  };
  ws.onmessage = (e) => {
    let msg; try { msg = JSON.parse(e.data); } catch (_) { return; }
    if (msg.event === "transcript.partial" && msg.text) {
      sarvamTell({ type: "partial", text: String(msg.text).trim() });
    } else if (msg.event === "transcript.final") {
      const text = String(msg.text || "").trim();
      if (text) {
        sarvam.session = `${sarvam.session} ${text}`.replace(/\s+/g, " ").trim();
        sarvamTell({ type: "utterance", text: sarvam.session });
      }
    } else if (msg.event === "error") {
      sarvamLog("error", { code: msg.code, fatal: msg.is_fatal, message: String(msg.message || "").slice(0, 160) });
    } else if (msg.event === "session.end") {
      sarvamLog("session_end", { audioS: msg.audio_duration_s });
      if (sarvam.closing) sarvam.closing();
    }
  };
  ws.onclose = (e) => {
    sarvamLog("close", { code: e.code, reason: String(e.reason || "").slice(0, 120) });
    if (sarvam.ws === ws) sarvam.ws = null;
    if (sarvam.closing) { sarvam.closing(); return; }
    // Dropped mid-session: reconnect, the mic keeps running.
    if (sarvam.listening) setTimeout(() => { if (sarvam.listening && !sarvam.ws) sarvamConnect(); }, 400);
  };
}

async function sarvamStart(key) {
  if (sarvam.listening) return;
  sarvam.key = key; sarvam.session = ""; sarvam.pending = []; sarvam.listening = true;
  sarvamConnect();
  try {
    sarvam.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    sarvam.ctx = new AudioContext({ sampleRate: 16000, latencyHint: "interactive" });
    sarvam.source = sarvam.ctx.createMediaStreamSource(sarvam.stream);
    // ScriptProcessor rather than a worklet: no module file, no CSP question,
    // and 1024 frames at 16 kHz is a 64ms frame, well under Sarvam's cap.
    sarvam.node = sarvam.ctx.createScriptProcessor(1024, 1, 1);
    sarvam.node.onaudioprocess = (ev) => {
      if (!sarvam.listening) return;
      const f = ev.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(f.length);
      for (let i = 0; i < f.length; i += 1) { const v = Math.max(-1, Math.min(1, f[i])); pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff; }
      sarvamSend({ event: "audio_input", audio: sarvamB64(pcm) });
    };
    sarvam.source.connect(sarvam.node);
    sarvam.node.connect(sarvam.ctx.destination);
    sarvam.ping = setInterval(() => sarvamSend({ event: "ping" }), 20000);
    sarvamLog("mic_on", { rate: sarvam.ctx.sampleRate });
  } catch (error) {
    sarvamLog("mic_failed", { error: String(error?.message || error) });
    sarvamTell({ type: "error", message: `sarvam mic failed: ${error?.message || error}` });
  }
}

function sarvamMicOff() {
  try { sarvam.node?.disconnect(); sarvam.source?.disconnect(); } catch (_) {}
  try { sarvam.stream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
  try { sarvam.ctx?.close(); } catch (_) {}
  if (sarvam.ping) clearInterval(sarvam.ping);
  Object.assign(sarvam, { node: null, source: null, stream: null, ctx: null, ping: 0 });
}

async function sarvamStop() {
  if (!sarvam.listening && !sarvam.ws) { sarvamTell({ type: "final", text: "" }); return; }
  sarvam.listening = false;
  sarvamMicOff();
  // Ask for a graceful end so the last sentence's final arrives, then give up after 2.5s.
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2500);
    sarvam.closing = () => { clearTimeout(timer); resolve(); };
    if (sarvam.ws && sarvam.ws.readyState === WebSocket.OPEN) sarvam.ws.send(JSON.stringify({ event: "end" }));
    else resolve();
  });
  sarvam.closing = null;
  try { sarvam.ws?.close(1000); } catch (_) {}
  sarvam.ws = null;
  const text = sarvam.session;
  sarvam.session = "";
  if (text) sarvamTell({ type: "delta", text });
  sarvamTell({ type: "final", text });
}

window.brainoMac?.onSarvamCommand?.((payload) => {
  const command = payload?.command;
  if (command === "start") void sarvamStart(String(payload?.key || ""));
  else if (command === "stop") void sarvamStop();
  else if (command === "rotate") {
    // A segment boundary for long sessions. The socket is not reset: Sarvam
    // reports each sentence on its own, so there is no growing decoder to shed.
    const text = sarvam.session;
    sarvam.session = "";
    if (text) sarvamTell({ type: "segment", text });
  }
});
