import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* Braino Foundry voice (2026-10-24). Push to talk, the way the Mac does it:
   hold Control, talk, let go.

   Ears: when you are signed in, the same OpenAI Realtime session the Mac and
   the extension use (openai-realtime-call, text only, transcription locked to
   English with gpt-4o-transcribe). While you hold the key, the browser's own
   recogniser shows your words live in the notch; when you let go the
   Realtime buffer is committed and its transcript is the one he acts on.
   Signed out, openai-realtime-call says "Sign in required", so the browser
   recogniser alone is used.

   Mouth: fish-audio-tts, which streams Fish's MP3 straight through. It is
   played through MediaSource so he starts talking on the first chunk; where
   MediaSource cannot take MP3 (iPhone Safari) the clip is played whole.

   Barge in: pressing Control while he talks cuts him off at once. */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

export type FoundryVoiceStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

type SRLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SRWindow = Window & { SpeechRecognition?: new () => SRLike; webkitSpeechRecognition?: new () => SRLike };

type Rt = { pc: RTCPeerConnection; dc: RTCDataChannel; stream: MediaStream; idle: number };

/* The Realtime session is kept warm between presses and closed after two quiet minutes. */
const RT_IDLE_MS = 2 * 60 * 1000;

export function useFoundryVoice(onTranscript: (text: string) => Promise<string>) {
  const [status, setStatus] = useState<FoundryVoiceStatus>("idle");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [engine, setEngine] = useState<"realtime" | "browser" | "">("");

  const statusRef = useRef<FoundryVoiceStatus>("idle");
  const set = (s: FoundryVoiceStatus) => { statusRef.current = s; setStatus(s); };
  const turnRef = useRef(0);
  const srRef = useRef<SRLike | null>(null);
  const srFinal = useRef("");
  const srLive = useRef("");
  const rtRef = useRef<Rt | null>(null);
  const rtConnecting = useRef<Promise<Rt | null> | null>(null);
  const rtWaiter = useRef<((t: string) => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  /* ── Mouth ─────────────────────────────────────────────────────────── */
  const hush = useCallback(() => {
    try { abortRef.current?.abort(); } catch (_) { /* ignore */ }
    abortRef.current = null;
    const a = audioRef.current;
    if (a) { try { a.pause(); } catch (_) { /* ignore */ } const u = a.src; a.removeAttribute("src"); a.load(); if (u.startsWith("blob:")) URL.revokeObjectURL(u); }
    audioRef.current = null;
  }, []);

  const speak = useCallback(async (text: string, turn: number) => {
    const words = String(text || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`>#]+/g, "").replace(/\s+/g, " ").trim();
    if (!words) return;
    hush();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/fish-audio-tts`, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ text: words }), signal: ctl.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Braino voice failed (${res.status})`);
    if (turn !== turnRef.current) return;
    const type = res.headers.get("Content-Type") || "audio/mpeg";
    const audio = new Audio();
    audioRef.current = audio;
    audio.addEventListener("playing", () => { if (turn === turnRef.current) set("speaking"); });
    const done = new Promise<void>((resolve) => { audio.onended = () => resolve(); audio.onerror = () => resolve(); ctl.signal.addEventListener("abort", () => resolve()); });

    const MS = (window as Window & { MediaSource?: typeof MediaSource }).MediaSource;
    if (MS && MS.isTypeSupported(type)) {
      const ms = new MS();
      audio.src = URL.createObjectURL(ms);
      void audio.play().catch(() => undefined);
      ms.addEventListener("sourceopen", async () => {
        try {
          const sb = ms.addSourceBuffer(type);
          const reader = res.body!.getReader();
          const append = (chunk: Uint8Array) => new Promise<void>((r) => { sb.addEventListener("updateend", () => r(), { once: true }); sb.appendBuffer(chunk); });
          for (;;) {
            const { value, done: end } = await reader.read();
            if (end || ctl.signal.aborted) break;
            if (value?.length) await append(value);
          }
          if (ms.readyState === "open") ms.endOfStream();
        } catch (_) { try { if (ms.readyState === "open") ms.endOfStream(); } catch (__) { /* ignore */ } }
      }, { once: true });
    } else {
      const blob = await res.blob();
      if (turn !== turnRef.current) return;
      audio.src = URL.createObjectURL(blob);
      await audio.play().catch(() => undefined);
    }
    await done;
  }, [hush]);

  /* ── Ears: OpenAI Realtime, same call the Mac makes ────────────────── */
  const closeRt = useCallback(() => {
    const rt = rtRef.current;
    rtRef.current = null;
    if (!rt) return;
    window.clearTimeout(rt.idle);
    try { rt.dc.close(); } catch (_) { /* ignore */ }
    try { rt.pc.close(); } catch (_) { /* ignore */ }
    rt.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const connectRt = useCallback(async (): Promise<Rt | null> => {
    if (rtRef.current) return rtRef.current;
    if (rtConnecting.current) return rtConnecting.current;
    rtConnecting.current = (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || !window.RTCPeerConnection) return null;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const pc = new RTCPeerConnection();
      stream.getTracks().forEach((t) => { t.enabled = false; pc.addTrack(t, stream); });
      const dc = pc.createDataChannel("oai-events");
      dc.addEventListener("message", (e) => {
        try {
          const ev = JSON.parse(e.data);
          if (ev.type === "conversation.item.input_audio_transcription.completed") { rtWaiter.current?.(String(ev.transcript || "")); rtWaiter.current = null; }
          if (ev.type === "conversation.item.input_audio_transcription.failed") { rtWaiter.current?.(""); rtWaiter.current = null; }
        } catch (_) { /* ignore */ }
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const r = await fetch(`${SUPABASE_URL}/functions/v1/openai-realtime-call`, {
        method: "POST",
        headers: { "Content-Type": "application/sdp", apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "X-Braino-Realtime-Model": "gpt-realtime-mini" },
        body: offer.sdp || "",
      });
      if (!r.ok) { pc.close(); stream.getTracks().forEach((t) => t.stop()); return null; }
      await pc.setRemoteDescription({ type: "answer", sdp: await r.text() });
      await new Promise<void>((res, rej) => { if (dc.readyState === "open") res(); else { dc.addEventListener("open", () => res(), { once: true }); window.setTimeout(() => rej(new Error("timeout")), 6000); } });
      // Push to talk: no server turn detection, nothing is answered by the session itself.
      dc.send(JSON.stringify({ type: "session.update", session: { type: "realtime", audio: { input: { turn_detection: null } } } }));
      pc.addEventListener("connectionstatechange", () => { if (["failed", "disconnected", "closed"].includes(pc.connectionState)) closeRt(); });
      const rt: Rt = { pc, dc, stream, idle: 0 };
      rtRef.current = rt;
      return rt;
    })().catch(() => null).finally(() => { rtConnecting.current = null; });
    return rtConnecting.current;
  }, [closeRt]);

  const rtSend = (ev: object) => { const rt = rtRef.current; if (rt && rt.dc.readyState === "open") { rt.dc.send(JSON.stringify(ev)); return true; } return false; };

  /* ── Press and release ─────────────────────────────────────────────── */
  const begin = useCallback(() => {
    if (statusRef.current === "listening") return;
    turnRef.current += 1;
    hush(); // barge in
    setError(""); setHeard(""); setReply("");
    srFinal.current = ""; srLive.current = "";
    set("listening");

    const Ctor = (window as SRWindow).SpeechRecognition || (window as SRWindow).webkitSpeechRecognition;
    if (Ctor) {
      try {
        const sr = new Ctor();
        sr.lang = "en-US"; sr.continuous = true; sr.interimResults = true;
        sr.onresult = (e) => {
          let fin = "", live = "";
          for (let i = 0; i < e.results.length; i += 1) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else live += r[0].transcript; }
          srFinal.current = fin.trim(); srLive.current = `${fin} ${live}`.trim();
          if (statusRef.current === "listening") setHeard(srLive.current);
        };
        sr.onerror = (e) => { if (e.error === "not-allowed") { setError("I need the microphone. Allow it in the address bar."); } };
        sr.onend = () => { srRef.current = null; };
        sr.start();
        srRef.current = sr;
      } catch (_) { /* the Realtime ears may still work */ }
    }
    void connectRt().then((rt) => {
      if (!rt) { setEngine(Ctor ? "browser" : ""); return; }
      setEngine("realtime");
      window.clearTimeout(rt.idle);
      rtSend({ type: "input_audio_buffer.clear" });
      if (statusRef.current === "listening") rt.stream.getTracks().forEach((t) => { t.enabled = true; });
    });
  }, [connectRt, hush]);

  const cancel = useCallback(() => {
    turnRef.current += 1;
    try { srRef.current?.abort(); } catch (_) { /* ignore */ }
    rtRef.current?.stream.getTracks().forEach((t) => { t.enabled = false; });
    rtSend({ type: "input_audio_buffer.clear" });
    hush();
    setHeard(""); set("idle");
  }, [hush]);

  const end = useCallback(async () => {
    if (statusRef.current !== "listening") return;
    const turn = turnRef.current;
    set("thinking");
    try { srRef.current?.stop(); } catch (_) { /* ignore */ }
    const rt = rtRef.current;
    let text = "";
    if (rt) {
      // Let the last syllable reach the server before the buffer is committed.
      await new Promise((r) => window.setTimeout(r, 180));
      rt.stream.getTracks().forEach((t) => { t.enabled = false; });
      text = await new Promise<string>((resolve) => {
        rtWaiter.current = resolve;
        if (!rtSend({ type: "input_audio_buffer.commit" })) resolve("");
        window.setTimeout(() => resolve(""), 4000);
      });
      rt.idle = window.setTimeout(closeRt, RT_IDLE_MS);
    }
    if (!text.trim()) {
      await new Promise((r) => window.setTimeout(r, 250)); // the browser recogniser's last word
      text = srFinal.current || srLive.current;
    }
    text = text.trim();
    if (turn !== turnRef.current) return;
    if (!text) { set("idle"); setHeard(""); return; }
    setHeard(text);
    try {
      const say = await cbRef.current(text);
      if (turn !== turnRef.current) return;
      setReply(say);
      await speak(say, turn);
      if (turn === turnRef.current) set("idle");
    } catch (e) {
      if (turn !== turnRef.current) return;
      setError(e instanceof Error && /abort/i.test(e.message) ? "" : "I couldn't say that out loud just now.");
      set("idle");
    }
  }, [closeRt, speak]);

  const stop = useCallback(() => { cancel(); setReply(""); }, [cancel]);

  useEffect(() => () => { hush(); closeRt(); try { srRef.current?.abort(); } catch (_) { /* ignore */ } }, [hush, closeRt]);

  return { status, heard, reply, error, engine, begin, end, cancel, stop, listening: status === "listening" };
}
