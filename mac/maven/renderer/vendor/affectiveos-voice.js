/* AffectiveOS voice (2026-10-29): one character voice, reusable by any
   Affective character. Lifted from Braino Mac (renderer/braino-mac.js), the
   text helpers copied verbatim, the playback reduced to the parts any
   character needs. Give it a voice id; it speaks through the same
   fish-audio-tts edge function Braino uses.

   const voice = AffectiveVoice.create({ endpoint, anonKey, referenceId, onStart, onEnd });
   voice.speak("YouTube. Open."); voice.stop(); voice.warm();

   Canonical copy: mac/shared/affectiveos-voice.js. Apps keep a synced copy
   (npm run voice:sync), because a packaged app can only load its own files. */
(function (root) {
  "use strict";
  const TTS_CHUNK_MAX_CHARS = 240;
  const TTS_FETCH_TIMEOUT_MS = 14000;

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

  function create(cfg) {
    const c = Object.assign({ latency: "normal" }, cfg || {});
    let generation = 0;
    const controllers = new Set();
    const audios = new Set();

    async function fetchChunk(text, gen) {
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(c.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: c.anonKey, Authorization: `Bearer ${c.anonKey}` },
          body: JSON.stringify({ text, latency: c.latency, ...(c.referenceId ? { referenceId: c.referenceId } : {}) }),
          signal: controller.signal,
        });
        if (gen !== generation) return null;
        if (!res.ok) throw new Error(`tts ${res.status} ${res.headers.get("x-braino-tts-error") || ""}`.trim());
        return URL.createObjectURL(await res.blob());
      } finally { clearTimeout(timeout); controllers.delete(controller); }
    }
    function play(url, gen) {
      return new Promise((resolve) => {
        if (gen !== generation) { URL.revokeObjectURL(url); resolve(); return; }
        const audio = new Audio(url);
        audios.add(audio);
        const done = () => { audios.delete(audio); URL.revokeObjectURL(url); resolve(); };
        audio.onended = done; audio.onerror = done; audio.onpause = () => { if (gen !== generation) done(); };
        try { c.onAudio && c.onAudio(audio); } catch (_) {}
        audio.play().catch(done);
      });
    }
    /* Speaks text, sentence by sentence; the next piece is fetched while this one plays. */
    async function speak(text) {
      stop();
      const gen = ++generation;
      const chunks = splitSpeechIntoTtsChunks(text);
      if (!chunks.length || !c.endpoint || !c.anonKey) return false;
      let started = false;
      try {
        let next = fetchChunk(chunks[0], gen);
        for (let i = 0; i < chunks.length; i++) {
          const url = await next;
          if (!url || gen !== generation) return false;
          next = i + 1 < chunks.length ? fetchChunk(chunks[i + 1], gen) : null;
          if (!started) { started = true; try { c.onStart && c.onStart(); } catch (_) {} }
          await play(url, gen);
        }
        return true;
      } catch (error) {
        try { c.onError && c.onError(error); } catch (_) {}
        return false;
      } finally {
        if (gen === generation && started) { try { c.onEnd && c.onEnd(); } catch (_) {} }
      }
    }
    /* Barge-in: everything in flight stops, nothing late can start. */
    function stop() {
      generation += 1;
      for (const ctl of controllers) { try { ctl.abort(); } catch (_) {} }
      controllers.clear();
      const had = audios.size > 0;
      for (const a of audios) { try { a.pause(); a.src = ""; } catch (_) {} }
      audios.clear();
      if (had) { try { c.onEnd && c.onEnd(); } catch (_) {} }
    }
    /* Wakes the voice server so the first line is quick. */
    function warm() {
      if (!c.endpoint || !c.anonKey) return;
      fetch(c.endpoint, { method: "POST", headers: { "Content-Type": "application/json", apikey: c.anonKey }, body: JSON.stringify({ warm: true, ...(c.referenceId ? { referenceId: c.referenceId } : {}) }) }).catch(() => {});
    }
    return { speak, stop, warm, set: (k) => Object.assign(c, k) };
  }

  const api = { create, stripSpeechText, speakableAmounts, splitSpeechIntoTtsChunks };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AffectiveVoice = api;
})(typeof window !== "undefined" ? window : globalThis);
