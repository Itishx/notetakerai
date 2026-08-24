import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBrainoVoice } from "@/hooks/useBrainoVoice";
import OsCloud from "@/components/brainoOS/OsCloud";
import { SUBSYSTEMS, type SubsystemId } from "@/components/brainoOS/osGraph";

/* Braino OS.
 *
 * Not a diagram of the architecture. The architecture, looked at directly.
 * Braino OS is the heart, the mind, the ears and the memory, and every version
 * of Braino runs on it, so this is the one screen where you see the thing
 * itself rather than the face it wears.
 *
 * He talks here in his own voice. The cloud is his body while he does it: it
 * leans into the light when he is thinking and burns brighter when he speaks.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const OS_CONTEXT = `You are Braino, speaking from inside Braino OS: the layer that everything called Braino runs on.
Braino OS is four systems. The mind reasons, routes and decides. The heart feels, and colours everything the mind says. The ears listen, always, before anything happens. The memory keeps what matters and lets the rest go.
The person is looking at all four of them at once, lit up and talking to each other.
Answer as the system itself. Be short, plain and a little proud. Never use dashes of any kind.`;

type Hub = { id: SubsystemId; x: number; y: number; depth: number };

/* Spoken ways of asking to be shown a system. Handled here rather than sent to
   the model, because a navigation command should move the camera immediately
   and not wait on a round trip. */
const SPOKEN_TARGETS: { id: SubsystemId; patterns: RegExp }[] = [
  { id: "mind", patterns: /\b(mind|brain|reason|think)\b/i },
  { id: "heart", patterns: /\b(heart|feel|emotion|personality)\b/i },
  { id: "ears", patterns: /\b(ear|ears|hear|listen|voice|mic)\b/i },
  { id: "memory", patterns: /\b(memor|remember|recall)\b/i },
];

export default function BrainoOS() {
  const { user, session } = useAuth();
  const [focus, setFocus] = useState<SubsystemId | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [caption, setCaption] = useState("");
  const [booted, setBooted] = useState(false);
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
    [],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setBooted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const focused = focus ? SUBSYSTEMS.find((s) => s.id === focus) ?? null : null;

  const voiceTurn = useCallback(
    async (text: string): Promise<string> => {
      const said = text.trim();
      setCaption(said);
      if (!said) return "";

      // Pull back out.
      if (/\b(back|out|zoom out|everything|whole|all of it)\b/i.test(said) && !/\binside\b/i.test(said)) {
        setFocus(null);
        return "Pulling back out.";
      }

      // Go into one of the four.
      const target = SPOKEN_TARGETS.find((entry) => entry.patterns.test(said));
      if (target && /\b(show|open|go|inside|into|look|see|what)\b/i.test(said)) {
        setFocus(target.id);
        const system = SUBSYSTEMS.find((s) => s.id === target.id);
        return system ? `${system.label.replace("THE ", "")}. ${system.role}.` : "";
      }

      historyRef.current = [...historyRef.current.slice(-16), { role: "user", content: said }];
      const authHeader = session?.access_token
        ? `Bearer ${session.access_token}`
        : `Bearer ${SUPABASE_KEY}`;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-about-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: authHeader },
        body: JSON.stringify({
          message: said,
          chatHistory: historyRef.current,
          notes: OS_CONTEXT,
          userId: user?.id,
          pageContext: {
            title: "Braino OS",
            url: typeof window !== "undefined" ? window.location.href : "https://trybraino.com/braino-os",
            text: focused
              ? `The person is inside ${focused.label}: ${focused.role}. Its parts are ${focused.parts.join(", ")}.`
              : "The person is looking at all four systems of Braino OS at once.",
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      const reply =
        typeof payload?.reply === "string" && payload.reply.trim()
          ? payload.reply.trim()
          : "Say that again.";
      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
      return reply;
    },
    [focused, session?.access_token, user?.id],
  );

  const {
    active: voiceActive,
    status: voiceStatus,
    brainoText,
    toggle: voiceToggle,
    stop: voiceStop,
  } = useBrainoVoice({ accessToken: session?.access_token, onTranscript: voiceTurn });

  // Ctrl twice to talk, the same gesture as the chat page. Escape pulls out.
  useEffect(() => {
    let taps = 0;
    let timer: number | undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (voiceActive) voiceStop();
        else setFocus(null);
        return;
      }
      if (event.key !== "Control" || event.repeat) return;
      taps += 1;
      if (timer) window.clearTimeout(timer);
      if (taps >= 2) {
        taps = 0;
        voiceToggle();
        return;
      }
      timer = window.setTimeout(() => { taps = 0; }, 400);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer) window.clearTimeout(timer);
    };
  }, [voiceActive, voiceStop, voiceToggle]);

  const thinking = voiceStatus === "thinking";
  const energy =
    voiceStatus === "speaking" ? 1 : voiceStatus === "thinking" ? 0.7 : voiceActive ? 0.35 : 0;

  const statusLabel =
    voiceStatus === "speaking"
      ? "SPEAKING"
      : voiceStatus === "thinking"
        ? "THINKING"
        : voiceStatus === "listening"
          ? "LISTENING"
          : voiceStatus === "connecting"
            ? "WAKING"
            : "IDLE";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#02050a] font-mono text-[#7fd4ff] select-none">
      {/* The grid the whole thing sits on. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(90,170,220,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(90,170,220,0.35) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      <OsCloud
        focus={focus}
        onPick={setFocus}
        onHubs={setHubs}
        energy={energy}
        thinking={thinking}
        reducedMotion={reducedMotion}
      />

      {/* Labels ride on the systems themselves, so they turn with the mass. */}
      {hubs.map((hub) => {
        const system = SUBSYSTEMS.find((s) => s.id === hub.id);
        if (!system) return null;
        const dimmed = focus && focus !== hub.id;
        return (
          <button
            key={hub.id}
            type="button"
            onClick={() => setFocus(focus === hub.id ? null : hub.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-1 text-left transition-opacity duration-500"
            style={{
              left: hub.x,
              top: hub.y,
              opacity: dimmed ? 0.2 : 0.7 + hub.depth * 0.3,
              color: `rgb(${system.color[0]},${system.color[1]},${system.color[2]})`,
              textShadow:
                "0 0 3px rgba(2,5,10,1), 0 0 10px rgba(2,5,10,0.95), 0 0 26px rgba(2,5,10,0.85)",
            }}
          >
            <span className="block text-[11px] font-semibold tracking-[0.34em]">{system.label}</span>
            <span className="mt-0.5 block h-px w-full bg-current opacity-50" />
          </button>
        );
      })}

      {/* HUD frame, in the language of the reference plates. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 right-0 top-0 flex items-center gap-3 px-4 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.22em] text-[#ffb04a]">BRAINO O.S.</span>
          </div>
          <div className="h-[6px] flex-1 bg-gradient-to-r from-[#ff8a1e] via-[#ffc978] to-transparent opacity-80" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="h-[6px] w-3 bg-[#5fb8e8] opacity-70" />
            ))}
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 top-12 border border-[#2f6f96]/50">
          {(["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"] as const).map((pos) => (
            <span key={pos} className={`absolute ${pos} h-3 w-3 border-[#5fb8e8]/80 ${pos.includes("left") ? "border-l" : "border-r"} ${pos.includes("top") ? "border-t" : "border-b"}`} />
          ))}
          <div className="absolute left-6 top-2 flex gap-[3px]">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="h-[3px] w-[3px] bg-[#5fb8e8]/70" />
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-8 text-[10px] tracking-[0.3em] text-[#4f97c4]">
          {focused ? focused.label : "FOUR SYSTEMS / ONE MIND"}
        </div>
        <div className="absolute bottom-6 right-8 flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#4f97c4]">
          <span
            className="inline-block h-[7px] w-[7px] rounded-full"
            style={{
              background: voiceActive ? "#7dffd0" : "#2f6f96",
              boxShadow: voiceActive ? "0 0 10px #7dffd0" : "none",
            }}
          />
          {statusLabel}
        </div>
      </div>

      {/* What is inside the thing you flew into. */}
      <div
        className={`pointer-events-none absolute left-10 top-24 max-w-[300px] transition-all duration-700 ${
          focused ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {focused ? (
          <>
            <div
              className="text-[13px] tracking-[0.3em]"
              style={{ color: `rgb(${focused.color[0]},${focused.color[1]},${focused.color[2]})` }}
            >
              {focused.label}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed tracking-wide text-[#8fc4e4]">{focused.role}</p>
            <ul className="mt-4 space-y-1.5">
              {focused.parts.map((part) => (
                <li key={part} className="flex items-center gap-2 text-[11px] tracking-[0.18em] text-[#6fb2d8]">
                  <span className="h-px w-4 bg-current opacity-60" />
                  {part}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="pointer-events-auto mt-5 border border-[#2f6f96]/70 px-3 py-1 text-[10px] tracking-[0.28em] text-[#6fb2d8] transition-colors hover:border-[#5fb8e8] hover:text-[#bfe8ff]"
            >
              PULL BACK
            </button>
          </>
        ) : null}
      </div>

      {/* What he just said, and what he heard. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 flex flex-col items-center gap-2 px-10 text-center">
        {caption ? (
          <p className="text-[11px] tracking-[0.22em] text-[#4f97c4]/80">{caption}</p>
        ) : null}
        {brainoText ? (
          <p className="max-w-2xl text-[15px] leading-relaxed tracking-wide text-[#d7f2ff]">{brainoText}</p>
        ) : null}
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-11 flex justify-center transition-opacity duration-1000 ${
          booted && !focus && !voiceActive && !brainoText ? "opacity-55" : "opacity-0"
        }`}
      >
        <p className="text-[10px] tracking-[0.34em] text-[#4f97c4]">
          CTRL TWICE TO TALK / CLICK A SYSTEM TO GO INSIDE / SCROLL TO ZOOM
        </p>
      </div>
    </div>
  );
}
