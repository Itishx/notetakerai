"use strict";
/* BrainoHERA, cloud dictation (6 Oct 2026).
 *
 * The on-device transcriber decoded every chunk live, on the same chip as the
 * always-listening voice transcriber and Laya. On a busy Mac a chunk took up to
 * 4.9s, 13 queued up, and 2m15s of speech came out as 333 characters. HERA now
 * does what Wispr Flow does: it only RECORDS while you talk, then sends the
 * whole recording once and gets every word back in a second or two.
 *
 * Its own module so it can move into AffectiveOS's ear as-is. One interface:
 *   const hera = createHera({ BrowserWindow, session, log })
 *   await hera.start()            -> { ok }
 *   const { audioBase64, mimeType, ms } = await hera.stop()
 * Transcribing, tidying and typing are the caller's (they are shared with the
 * rest of the app); this module owns the microphone and nothing else. */

const fs = require("fs");
const os = require("os");
const path = require("path");
const PARTITION = "braino-hera"; // in memory only: nothing about a recording is kept on disk

const RECORDER_HTML = `<!doctype html><meta charset="utf-8"><script>
let rec = null, chunks = [], stream = null, startedAt = 0, ctx = null, analyser = null, levelTimer = 0, coolTimer = 0;
/* 2026-10-25, the Wispr Flow way: the raw microphone (no echo cancellation,
   noise suppression or auto gain: they clip the first syllable and bend the
   voice), opened at once, and kept warm for a minute after each session so
   the next one starts instantly. The level drives the orb. */
async function warmMic() {
  if (coolTimer) { clearTimeout(coolTimer); coolTimer = 0; }
  if (stream && stream.getTracks().every((t) => t.readyState === "live")) return;
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
  try {
    ctx = new AudioContext();
    // A window nobody clicked starts its audio paused, and a paused meter reads silence.
    try { await ctx.resume(); } catch (_) {}
    analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
  } catch (_) { analyser = null; }
}
function coolMic() {
  if (coolTimer) clearTimeout(coolTimer);
  coolTimer = setTimeout(() => {
    try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
    try { ctx && ctx.close(); } catch (_) {}
    stream = null; ctx = null; analyser = null; coolTimer = 0;
  }, 60000);
}
/* Streaming transcription (2026-10-25). Audio goes to OpenAI's realtime
   transcriber as it is spoken; every pause of ~0.55s commits that stretch, so
   it is transcribed while you keep talking. On release only the last stretch
   is left. The MediaRecorder keeps running as the backup. */
let ws = null, wsReady = false, pending = [], proc = null, srcNode = null;
let dropped = 0, failedItems = 0, errors = 0, noiseFloor = 0.01;
let order = [], texts = {}, spokeSinceCommit = false, speechMs = 0, silentMs = 0, streamFailed = false;
function b64(int16) { const u = new Uint8Array(int16.buffer); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function send(o) { if (ws && wsReady) ws.send(JSON.stringify(o)); else if (o.type === "input_audio_buffer.append" && pending.length < 3000) pending.push(o); else if (o.type === "input_audio_buffer.commit") pending.push(o); else dropped++; }
function commit() { if (!spokeSinceCommit) return; spokeSinceCommit = false; speechMs = 0; send({ type: "input_audio_buffer.commit" }); }
/* Capture starts with the mic; the socket attaches when its key arrives,
   and everything said before that is sent first from the buffer. */
let gotSecret = false;
window.heraStream = (secret) => {
  gotSecret = true;
  if (!secret) { streamFailed = true; return "no-secret"; }
  connect(secret);
  return "ok";
};
const STREAM_URLS = ["wss://api.openai.com/v1/realtime?intent=transcription", "wss://api.openai.com/v1/realtime"];
function connect(secret, attempt = 0) {
  let confirmed = false;
  try {
    ws = new WebSocket(STREAM_URLS[attempt], ["realtime", "openai-insecure-api-key." + secret]);
  } catch (_) { streamFailed = true; return; }
  // Buffered audio is sent only after the server confirms the session.
  ws.onopen = () => { wsReady = false; };
  ws.onerror = () => {};
  ws.onclose = () => {
    wsReady = false;
    if (!confirmed && attempt + 1 < STREAM_URLS.length) { connect(secret, attempt + 1); return; }
    if (!confirmed) streamFailed = true;
  };
  ws.onmessage = (e) => {
    let m; try { m = JSON.parse(e.data); } catch (_) { return; }
    if (!confirmed && /session\.(created|updated)$/.test(String(m.type || ""))) {
      confirmed = true; wsReady = true;
      for (const o of pending.splice(0)) ws.send(JSON.stringify(o));
      return;
    }
    if (m.type === "input_audio_buffer.committed" && m.item_id && !order.includes(m.item_id)) order.push(m.item_id);
    else if (m.type === "conversation.item.input_audio_transcription.completed") { texts[m.item_id] = String(m.transcript || ""); if (!order.includes(m.item_id)) order.push(m.item_id); }
    else if (m.type === "conversation.item.input_audio_transcription.failed") { failedItems++; console.log("hera-stream-error:item failed " + String(m.error && m.error.message || "").slice(0, 120)); }
    else if (m.type === "error") {
      const msg = String(m.error && m.error.message || "");
      // An empty commit after a pause is harmless; anything else makes the stream untrusted.
      if (!/buffer too small|buffer is empty/i.test(msg)) errors++;
      console.log("hera-stream-error:" + msg.slice(0, 160));
    }
  };
}
function startStream() {
  order = []; texts = {}; pending = []; dropped = 0; failedItems = 0; errors = 0; wsReady = false; streamFailed = false; spokeSinceCommit = false; speechMs = 0; silentMs = 0; gotSecret = false;
  if (!ctx) { streamFailed = true; return; }
  srcNode = ctx.createMediaStreamSource(stream);
  proc = ctx.createScriptProcessor(2048, 1, 1);
  const ratio = ctx.sampleRate / 24000;
  proc.onaudioprocess = (ev) => {
    const f = ev.inputBuffer.getChannelData(0);
    const n = Math.floor(f.length / ratio), out = new Int16Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, f[Math.floor(i * ratio)])); out[i] = v < 0 ? v * 0x8000 : v * 0x7fff; sum += v * v; }
    send({ type: "input_audio_buffer.append", audio: b64(out) });
    // The raw mic has room noise, so "quiet" is measured against this room's own floor.
    const rms = Math.sqrt(sum / Math.max(1, n));
    noiseFloor = rms < noiseFloor ? noiseFloor * 0.9 + rms * 0.1 : noiseFloor * 0.998 + rms * 0.002;
    const ms = f.length / ctx.sampleRate * 1000, loud = rms > Math.max(0.006, noiseFloor * 2.5);
    if (loud) { spokeSinceCommit = true; speechMs += ms; silentMs = 0; }
    else { silentMs += ms; if (spokeSinceCommit && speechMs > 400 && silentMs > 400) commit(); }
  };
  srcNode.connect(proc); proc.connect(ctx.destination);
}
async function finishStream() {
  try { proc && proc.disconnect(); srcNode && srcNode.disconnect(); } catch (_) {}
  proc = null; srcNode = null;
  // The key may still be on its way: give it a moment, the audio is buffered.
  const keyBy = Date.now() + 1500;
  while (!gotSecret && Date.now() < keyBy) await new Promise((r) => setTimeout(r, 30));
  if (!ws || streamFailed) { try { ws && ws.close(); } catch (_) {} ws = null; return null; }
  commit();
  // Wait for every committed stretch to come back, briefly.
  const until = Date.now() + 4000;
  while (Date.now() < until) {
    const waiting = order.length === 0 ? (wsReady || pending.length) : order.some((id) => !(id in texts));
    if (!waiting) break;
    await new Promise((r) => setTimeout(r, 40));
  }
  const done = order.length > 0 && order.every((id) => id in texts) && !dropped && !failedItems && !errors && !pending.length;
  console.log("hera-stream-stat:" + JSON.stringify({ items: order.length, completed: order.filter((id) => id in texts).length, dropped, failedItems, errors, pending: pending.length }));
  const text = order.map((id) => texts[id] || "").join(" ").replace(/\\s+/g, " ").trim();
  try { ws.close(); } catch (_) {}
  ws = null;
  return done && text ? text : null;
}
window.heraStart = async () => {
  chunks = [];
  await warmMic();
  try { if (ctx && ctx.state !== "running") await ctx.resume(); } catch (_) {}
  if (analyser) {
    const buf = new Uint8Array(analyser.fftSize);
    clearInterval(levelTimer);
    levelTimer = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      console.log("hera-level:" + Math.min(1, Math.sqrt(sum / buf.length) * 6).toFixed(3));
    }, 60);
  }
  startStream();
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
  rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 });
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(1000);
  startedAt = Date.now();
  return "ok";
};
window.heraStop = () => new Promise((resolve) => {
  if (!rec) return resolve({ error: "not recording" });
  const streamTextP = finishStream();
  rec.onstop = async () => {
    clearInterval(levelTimer); levelTimer = 0;
    const streamText = await streamTextP;
    coolMic();
    const blob = new Blob(chunks, { type: rec.mimeType });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    resolve({ audioBase64: btoa(bin), mimeType: rec.mimeType.split(";")[0], ms: Date.now() - startedAt, bytes: buf.length, streamText: streamText || "", streamed: streamText != null });
    rec = null; chunks = [];
  };
  rec.stop();
});
</script>`;

function createHera({ BrowserWindow, session, log = () => {}, onLevel = () => {} }) {
  let win = null;
  let recording = false;

  async function ensure() {
    if (win && !win.isDestroyed()) return win;
    const ses = session.fromPartition(PARTITION);
    ses.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "media"));
    win = new BrowserWindow({ show: false, width: 200, height: 100, webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, backgroundThrottling: false, autoplayPolicy: "no-user-gesture-required" } });
    win.on("closed", () => { win = null; recording = false; });
    // The recorder page reports its level through the console: cheap, and it needs no bridge.
    win.webContents.on("console-message", (...args) => {
      const msg = typeof args[0] === "object" && args[0] && "message" in args[0] ? args[0].message : args[2];
      if (typeof msg === "string" && msg.startsWith("hera-level:")) onLevel(Number(msg.slice(11)) || 0);
      else if (typeof msg === "string" && msg.startsWith("hera-stream-error:")) log("hera.stream.error", { message: msg.slice(18) });
      else if (typeof msg === "string" && msg.startsWith("hera-stream-stat:")) { try { log("hera.stream.stat", JSON.parse(msg.slice(17))); } catch (_) {} }
    });
    /* From a real file, not a data: URL. Chromium hides navigator.mediaDevices
       on data: pages (not a secure context), so the recorder could never open
       the mic and every session fell back to the on-device engine (2026-10-25). */
    const file = path.join(os.tmpdir(), "braino-hera-recorder.html");
    fs.writeFileSync(file, RECORDER_HTML);
    await win.loadFile(file);
    return win;
  }

  async function start(options = {}) {
    if (recording) return { ok: false, error: "already recording" };
    try {
      const w = await ensure();
      await w.webContents.executeJavaScript("window.heraStart()", true);
      // The streaming key attaches whenever it arrives; audio waits in a buffer.
      if (options.secret) {
        Promise.resolve(options.secret).then((secret) => {
          if (win && !win.isDestroyed()) win.webContents.executeJavaScript(`window.heraStream(${JSON.stringify(String(secret || ""))})`, true).catch(() => {});
        }).catch(() => { if (win && !win.isDestroyed()) win.webContents.executeJavaScript("window.heraStream('')", true).catch(() => {}); });
      }
      recording = true;
      log("hera.cloud.recording", {});
      return { ok: true };
    } catch (error) {
      log("hera.cloud.start_failed", { error: String(error?.message || error) });
      return { ok: false, error: String(error?.message || error) };
    }
  }

  async function stop() {
    if (!recording || !win || win.isDestroyed()) return { error: "not recording" };
    recording = false;
    try {
      const out = await win.webContents.executeJavaScript("window.heraStop()", true);
      log("hera.cloud.recorded", { ms: out?.ms || 0, bytes: out?.bytes || 0, streamed: Boolean(out?.streamed), streamChars: (out?.streamText || "").length });
      return out || { error: "no audio" };
    } catch (error) {
      return { error: String(error?.message || error) };
    }
  }

  function isRecording() { return recording; }
  function destroy() { if (win && !win.isDestroyed()) win.destroy(); win = null; recording = false; }

  return { start, stop, isRecording, destroy };
}

module.exports = { createHera };
