/* The microphone (2026-10-29). Lives in an offscreen page so it keeps
   recording while you click around tabs. The mic permission was granted once
   on the welcome page, for the whole extension. */
let rec = null, stream = null, chunks = [], ctx = null, raf = 0, startedAt = 0;
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (!m || m.to !== "offscreen") return;
  if (m.t === "start") { start().then(() => reply({ ok: true })).catch((e) => reply({ ok: false, error: String(e && e.name || e) })); return true; }
  if (m.t === "stop") { stop(m.discard).then(reply); return true; }
});
async function start() {
  if (rec) return;
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const type = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
  rec = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 32000 });
  chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(250);
  startedAt = Date.now();
  // Voice level for the island's light, like the Mac's.
  ctx = new AudioContext();
  const an = ctx.createAnalyser(); an.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize);
  let last = 0;
  const tick = () => {
    an.getFloatTimeDomainData(buf);
    let s = 0; for (const x of buf) s += x * x;
    const v = Math.min(1, Math.sqrt(s / buf.length) * 6);
    const now = performance.now();
    if (now - last > 60) { last = now; chrome.runtime.sendMessage({ t: "level", v }).catch(() => {}); }
    raf = setTimeout(tick, 30);
  };
  tick();
}
function stop(discard) {
  return new Promise((resolve) => {
    if (!rec) { resolve({ ok: false }); return; }
    const r = rec; rec = null;
    clearTimeout(raf);
    r.onstop = async () => {
      try { stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      try { await ctx.close(); } catch (_) {}
      const ms = Date.now() - startedAt;
      if (discard) { resolve({ ok: true, discarded: true }); return; }
      const blob = new Blob(chunks, { type: "audio/webm" });
      const b = new Uint8Array(await blob.arrayBuffer());
      let bin = ""; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      resolve({ ok: true, audioBase64: btoa(bin), mimeType: "audio/webm", ms, bytes: b.length });
    };
    r.stop();
  });
}
