import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================================
   useBrainoVoice — website chat voice, deliberately NOT OpenAI Realtime audio.

   The chat page should sound like Braino, so this hook uses:
     1. Browser SpeechRecognition for listening.
     2. The normal Braino chat route for thinking.
     3. fish-audio-tts for speaking in Braino's actual voice.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

export type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type Options = {
  accessToken?: string;
  onTranscript: (text: string) => Promise<string>;
  onLog?: (scope: string, msg: string, data?: unknown) => void;
};

export function useBrainoVoice({ accessToken, onTranscript, onLog }: Options) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [active, setActive] = useState(false);
  const [userText, setUserText] = useState("");
  const [brainoText, setBrainoText] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const speechTokenRef = useRef(0);
  const fishAbortRef = useRef<AbortController | null>(null);
  const fishAudioRef = useRef<HTMLAudioElement | null>(null);
  const fishAudioUrlRef = useRef<string | null>(null);

  const log = useCallback((scope: string, msg: string, data?: unknown) => {
    onLog?.(scope, msg, data);
  }, [onLog]);

  const stopFishSpeech = useCallback(() => {
    speechTokenRef.current += 1;
    try { fishAbortRef.current?.abort(); } catch { /* ignore */ }
    fishAbortRef.current = null;
    if (fishAudioRef.current) {
      try { fishAudioRef.current.pause(); } catch { /* ignore */ }
      fishAudioRef.current.src = "";
      fishAudioRef.current = null;
    }
    if (fishAudioUrlRef.current) {
      try { URL.revokeObjectURL(fishAudioUrlRef.current); } catch { /* ignore */ }
      fishAudioUrlRef.current = null;
    }
  }, []);

  const stripForSpeech = useCallback((text: string) => (
    String(text || "")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
      .replace(/[*_`>#]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
  ), []);

  const speakWithFish = useCallback(async (text: string) => {
    const speakable = stripForSpeech(text);
    if (!speakable || !activeRef.current) return;

    stopFishSpeech();
    const token = speechTokenRef.current;
    const controller = new AbortController();
    fishAbortRef.current = controller;
    setStatus("speaking");
    log("voice", "speaking with fish");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
      };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/fish-audio-tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: speakable }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Braino voice failed (${res.status})`);
      }
      if (token !== speechTokenRef.current || !activeRef.current) return;

      const blob = await res.blob();
      if (token !== speechTokenRef.current || !activeRef.current) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      fishAudioUrlRef.current = url;
      fishAudioRef.current = audio;
      audio.volume = 1;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Braino voice playback failed."));
        audio.play().catch(reject);
      });
    } finally {
      if (fishAudioUrlRef.current) {
        try { URL.revokeObjectURL(fishAudioUrlRef.current); } catch { /* ignore */ }
        fishAudioUrlRef.current = null;
      }
      if (fishAudioRef.current) fishAudioRef.current = null;
      if (fishAbortRef.current === controller) fishAbortRef.current = null;
    }
  }, [accessToken, log, stopFishSpeech, stripForSpeech]);

  const startListening = useCallback(() => {
    if (!activeRef.current || processingRef.current) return;
    const Ctor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not supported in this browser.");
      setStatus("error");
      return;
    }

    try {
      stopRequestedRef.current = false;
      const recognition = new Ctor();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        if (!activeRef.current) return;
        setStatus("listening");
        log("voice", "listening");
      };
      recognition.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript || "";
          if (result?.isFinal) finalText += transcript;
          else interim += transcript;
        }
        const heard = (finalText || interim).trim();
        if (heard) setUserText(heard);
        if (finalText.trim()) {
          processingRef.current = true;
          stopRequestedRef.current = true;
          try { recognition.stop(); } catch { /* ignore */ }
          void (async () => {
            const clean = finalText.trim();
            setUserText(clean);
            setStatus("thinking");
            setBrainoText("");
            try {
              const reply = await onTranscript(clean);
              if (!activeRef.current) return;
              setBrainoText(reply);
              await speakWithFish(reply);
              if (activeRef.current) {
                processingRef.current = false;
                startListening();
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Braino voice failed.";
              setError(msg);
              setStatus("error");
              log("voice", "turn failed", msg);
              processingRef.current = false;
            }
          })();
        }
      };
      recognition.onerror = (event) => {
        const err = event.error || event.message || "Voice input failed.";
        if (/abort|stop|stopped/i.test(err)) {
          if (activeRef.current && !processingRef.current && !stopRequestedRef.current) {
            setStatus("listening");
            setTimeout(() => startListening(), 160);
          }
          return;
        }
        if (err === "no-speech" && activeRef.current && !processingRef.current) {
          setStatus("listening");
          return;
        }
        setError(err);
        setStatus("error");
        log("voice", "speech recognition error", err);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        if (!activeRef.current || processingRef.current || stopRequestedRef.current) return;
        setTimeout(() => startListening(), 160);
      };
      recognition.start();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Voice input failed.";
      setError(msg);
      setStatus("error");
      log("voice", "start failed", msg);
    }
  }, [log, onTranscript, speakWithFish]);

  const stop = useCallback(() => {
    activeRef.current = false;
    processingRef.current = false;
    stopRequestedRef.current = true;
    stopFishSpeech();
    try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setActive(false);
    setStatus("idle");
    setUserText("");
    setBrainoText("");
    setError("");
    log("voice", "stopped");
  }, [log, stopFishSpeech]);

  const start = useCallback(() => {
    if (!accessToken) {
      activeRef.current = true;
      setError("Sign in to talk to Braino.");
      setStatus("error");
      setActive(true);
      return;
    }
    stopFishSpeech();
    activeRef.current = true;
    processingRef.current = false;
    stopRequestedRef.current = false;
    setActive(true);
    setError("");
    setUserText("");
    setBrainoText("");
    setStatus("connecting");
    startListening();
  }, [accessToken, startListening, stopFishSpeech]);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { status, active, userText, brainoText, error, start, stop, toggle };
}
