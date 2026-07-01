import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================================
   useBrainoVoice — real-time voice for the website chat page, using the SAME
   backend as the extension:
     • openai-realtime-config  → the exact Braino system prompt (buildBrainoSystemPrompt)
     • openai-realtime-call     → WebRTC SDP proxy that opens an OpenAI Realtime session

   Flow (standard OpenAI Realtime WebRTC):
     mic → RTCPeerConnection → POST our SDP offer to openai-realtime-call → answer SDP
     → data channel "oai-events" → session.update (same instructions, audio out, semantic VAD)
     → Braino listens, transcribes, and talks back in real time.

   NOTE: the extension speaks via Fish Audio (realtime model muted to text). Here we use the
   realtime model's NATIVE audio output (voice set server-side, default "marin") for a working
   first version on the web; Fish-voice parity is a follow-up. Everything else (system prompt,
   semantic VAD, English STT lock) matches the extension. Needs a live mic + network to test.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

export type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

type Options = {
  accessToken?: string;
  /** Body for openai-realtime-config (notes / pageContext / languagePolicy) — same shape the extension sends. */
  buildConfigBody: () => Record<string, unknown>;
  onLog?: (scope: string, msg: string, data?: unknown) => void;
};

export function useBrainoVoice({ accessToken, buildConfigBody, onLog }: Options) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [active, setActive] = useState(false);
  const [userText, setUserText] = useState("");
  const [brainoText, setBrainoText] = useState("");
  const [error, setError] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const log = useCallback((scope: string, msg: string, data?: unknown) => {
    onLog?.(scope, msg, data);
  }, [onLog]);

  const stop = useCallback(() => {
    try { dcRef.current?.close(); } catch { /* ignore */ }
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()); } catch { /* ignore */ }
    try { pcRef.current?.close(); } catch { /* ignore */ }
    try { micRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    if (audioRef.current) { try { audioRef.current.srcObject = null; } catch { /* ignore */ } }
    pcRef.current = null;
    dcRef.current = null;
    micRef.current = null;
    setActive(false);
    setStatus("idle");
    setUserText("");
    setBrainoText("");
    log("voice", "stopped");
  }, [log]);

  const start = useCallback(async () => {
    if (pcRef.current) return;
    if (!accessToken) { setError("Sign in to talk to Braino."); setStatus("error"); setActive(true); return; }
    setError("");
    setActive(true);
    setStatus("connecting");
    log("voice", "starting");

    try {
      // 1) The exact Braino system prompt (same builder the extension + text chat use).
      const cfgRes = await fetch(`${SUPABASE_URL}/functions/v1/openai-realtime-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(buildConfigBody()),
      });
      const cfg = await cfgRes.json().catch(() => ({} as Record<string, unknown>));
      if (!cfgRes.ok) throw new Error((cfg as { error?: string })?.error || `Config failed (${cfgRes.status})`);
      const instructions = String((cfg as { instructions?: string })?.instructions || "");
      log("voice", "config ok", { promptChars: instructions.length });

      // 2) Mic.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;

      // 3) Peer connection + remote audio sink.
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const audioEl = audioRef.current || new Audio();
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => { if (e.streams[0]) audioEl.srcObject = e.streams[0]; };
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));

      // 4) Data channel — session config + events.
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onopen = () => {
        dc.send(JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            instructions,
            output_modalities: ["audio"],
            audio: {
              input: {
                transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
                // semantic_vad + create_response:true → Braino auto-answers when you stop talking.
                turn_detection: { type: "semantic_vad", eagerness: "auto", create_response: true, interrupt_response: true },
              },
            },
          },
        }));
        setStatus("listening");
        log("voice", "session configured");
      };
      dc.onmessage = (e) => {
        let ev: { type?: string; delta?: string; transcript?: string; error?: { message?: string } };
        try { ev = JSON.parse(e.data); } catch { return; }
        switch (ev.type) {
          case "input_audio_buffer.speech_started": setStatus("listening"); setUserText(""); break;
          case "input_audio_buffer.speech_stopped": setStatus("thinking"); break;
          case "conversation.item.input_audio_transcription.delta": if (ev.delta) setUserText((t) => t + ev.delta); break;
          case "conversation.item.input_audio_transcription.completed": if (ev.transcript) setUserText(ev.transcript); break;
          case "response.created": setStatus("speaking"); setBrainoText(""); break;
          case "response.output_text.delta": if (ev.delta) setBrainoText((t) => t + ev.delta); break;
          case "response.output_audio_transcript.delta": if (ev.delta) setBrainoText((t) => t + ev.delta); break;
          case "response.done": setStatus("listening"); break;
          case "error": setError(ev.error?.message || "Voice error."); log("voice", "server error", ev.error); break;
          default: break;
        }
      };

      // 5) Offer → backend proxy → answer.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const callRes = await fetch(`${SUPABASE_URL}/functions/v1/openai-realtime-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${accessToken}`,
          "X-Braino-Realtime-Model": "gpt-realtime-mini",
        },
        body: offer.sdp || "",
      });
      if (!callRes.ok) {
        const j = await callRes.json().catch(() => ({} as { error?: string }));
        throw new Error(j?.error || `Voice session failed (${callRes.status})`);
      }
      const answerSdp = await callRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      log("voice", "connected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Voice failed to start.";
      log("voice", "start failed", msg);
      setError(msg);
      setStatus("error");
      // tear down partial state but keep the error visible
      try { dcRef.current?.close(); } catch { /* ignore */ }
      try { pcRef.current?.close(); } catch { /* ignore */ }
      try { micRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      pcRef.current = null; dcRef.current = null; micRef.current = null;
    }
  }, [accessToken, buildConfigBody, log]);

  const toggle = useCallback(() => { if (pcRef.current) stop(); else void start(); }, [start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { status, active, userText, brainoText, error, start, stop, toggle };
}
