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

const PARTITION = "braino-hera"; // in memory only: nothing about a recording is kept on disk

const RECORDER_HTML = `<!doctype html><meta charset="utf-8"><script>
let rec = null, chunks = [], stream = null, startedAt = 0;
window.heraStart = async () => {
  chunks = [];
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
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
    try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
    const blob = new Blob(chunks, { type: rec.mimeType });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    resolve({ audioBase64: btoa(bin), mimeType: rec.mimeType.split(";")[0], ms: Date.now() - startedAt, bytes: buf.length });
    rec = null; chunks = [];
  };
  rec.stop();
});
</script>`;

function createHera({ BrowserWindow, session, log = () => {} }) {
  let win = null;
  let recording = false;

  async function ensure() {
    if (win && !win.isDestroyed()) return win;
    const ses = session.fromPartition(PARTITION);
    ses.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "media"));
    win = new BrowserWindow({ show: false, width: 200, height: 100, webPreferences: { partition: PARTITION, sandbox: true, contextIsolation: true, backgroundThrottling: false } });
    win.on("closed", () => { win = null; recording = false; });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(RECORDER_HTML)}`);
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
