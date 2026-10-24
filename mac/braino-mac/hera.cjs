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
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
  rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 });
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(1000);
  startedAt = Date.now();
  return "ok";
};
window.heraStop = () => new Promise((resolve) => {
  if (!rec) return resolve({ error: "not recording" });
  rec.onstop = async () => {
    clearInterval(levelTimer); levelTimer = 0;
    coolMic();
    const blob = new Blob(chunks, { type: rec.mimeType });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    resolve({ audioBase64: btoa(bin), mimeType: rec.mimeType.split(";")[0], ms: Date.now() - startedAt, bytes: buf.length });
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
    });
    /* From a real file, not a data: URL. Chromium hides navigator.mediaDevices
       on data: pages (not a secure context), so the recorder could never open
       the mic and every session fell back to the on-device engine (2026-10-25). */
    const file = path.join(os.tmpdir(), "braino-hera-recorder.html");
    fs.writeFileSync(file, RECORDER_HTML);
    await win.loadFile(file);
    return win;
  }

  async function start() {
    if (recording) return { ok: false, error: "already recording" };
    try {
      const w = await ensure();
      await w.webContents.executeJavaScript("window.heraStart()", true);
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
      log("hera.cloud.recorded", { ms: out?.ms || 0, bytes: out?.bytes || 0 });
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
