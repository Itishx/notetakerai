import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "./x-pitch-modal.css";

/* The pitch demo: a compose window that writes itself and posts itself.
 *
 * Shaped like the create-post box everyone already recognises, because the room
 * has to understand what they are looking at in one second with no explanation.
 * Braino writes into it, presses Post himself, and the button turns green.
 * Nobody touches the keyboard.
 *
 * The publish is real, through the same policy checks as any other post. The
 * writing is not: the words are fixed below, because a model call in the middle
 * of a pitch is a chance for him to say something nobody has read.
 *
 *   /x?pitch           the real thing, it posts
 *   /x?pitch=rehearse  everything except the posting
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

/* Eight lines, in his voice, about the pitch that just happened in the room. */
export const PITCH_POST = [
  "Just pitched Braino at Mesa.",
  "",
  "Building is not the hard part any more. Anyone can build now.",
  "",
  "Getting seen is the hard part, and every founder needs a co-founder for it.",
  "",
  "Most of us do not have one. So I built one.",
  "",
  "He watches what I ship and puts it out in my voice, every week.",
  "",
  "I did not write this post. He did, while I was still on stage.",
].join("\n");

type Phase = "writing" | "ready" | "pressing" | "posting" | "posted" | "failed";

/* Deliberate, readable pacing. The room has to be able to follow the words
   appearing, which is slower than a machine would type them. */
const TYPE_MS = 26;
const BEAT_BEFORE_PRESS = 900;
const PRESS_HOLD = 420;

export default function XPitchModal({ rehearse, handle }: { rehearse: boolean; handle: string | null }) {
  const { user, session } = useAuth();
  const [phase, setPhase] = useState<Phase>("writing");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const ranRef = useRef(false);
  const publishRef = useRef<() => void>(() => {});

  const publish = useCallback(async () => {
    setPhase("posting");
    setError(null);

    if (rehearse) {
      window.setTimeout(() => setPhase("posted"), 1500);
      window.setTimeout(() => {
        window.location.href = handle ? `https://x.com/${handle}` : "https://x.com/home";
      }, 4200);
      return;
    }

    try {
      if (!user || !session?.access_token) throw new Error("Not signed in on this browser.");

      const { data: row, error: insertError } = await (supabase as any)
        .from("x_queue_items")
        .insert({
          user_id: user.id,
          text: PITCH_POST,
          original_input: PITCH_POST,
          source: "authored",
          pillar: "building-braino",
          status: "approved",
          position: -999,
        })
        .select("id")
        .single();
      if (insertError || !row?.id) throw new Error(insertError?.message || "Could not queue the post.");

      const res = await fetch(`${SUPABASE_URL}/functions/v1/brainox-schedule`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ action: "publish_now", itemId: row.id }),
      });
      const payload = await res.json().catch(() => ({}));

      if (payload?.published && payload?.xPostId) {
        setPhase("posted");
        /* Straight to the post. Landing on a profile and scrolling for it in
           front of a room is the same as not having posted it. Long enough
           that the green lands and is read before the tab changes. */
        const url = handle
          ? `https://x.com/${handle}/status/${payload.xPostId}`
          : `https://x.com/i/web/status/${payload.xPostId}`;
        window.setTimeout(() => { window.location.href = url; }, 2600);
        return;
      }

      if (payload?.blocked) throw new Error("His own policy held it back. Check Advanced Controls.");
      throw new Error(String(payload?.error || "X did not accept it."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not go through.");
      setPhase("failed");
    }
  }, [rehearse, user, session, handle]);

  publishRef.current = () => { void publish(); };

  /* He types, then presses his own button. One effect start to finish, so the
     press cannot fire twice or land before the writing is done. */
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => { timers.push(window.setTimeout(resolve, ms)); });

    (async () => {
      for (let i = 1; i <= PITCH_POST.length; i += 1) {
        if (cancelled) return;
        setTyped(PITCH_POST.slice(0, i));
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        await wait(PITCH_POST[i - 1] === "\n" ? TYPE_MS * 4 : TYPE_MS);
      }
      if (cancelled) return;
      setPhase("ready");
      await wait(BEAT_BEFORE_PRESS);
      if (cancelled) return;
      setPhase("pressing");
      await wait(PRESS_HOLD);
      if (cancelled) return;
      publishRef.current();
    })();

    return () => { cancelled = true; timers.forEach(window.clearTimeout); };
  }, []);

  const buttonLabel =
    phase === "posted" ? "Posted" :
    phase === "posting" ? "Posting" :
    phase === "failed" ? "Try again" : "Post";

  return (
    <div className="xpm-scrim" role="dialog" aria-modal="true" aria-label="Braino is writing a post">
      <div className="xpm-card">
        <header className="xpm-head">
          <span className="xpm-title">Create a post</span>
        </header>

        <div className="xpm-who">
          <span className="xpm-avatar" aria-hidden>B</span>
          <div className="xpm-who-copy">
            <b>Braino</b>
            <span>{handle ? `posting as @${handle}` : "posting to your account"}</span>
          </div>
          <span className={`xpm-flag is-${phase}`}>
            {phase === "writing" ? "Writing" : phase === "posted" ? "Live" : phase === "failed" ? "Held" : "Ready"}
          </span>
        </div>

        <div className="xpm-post" ref={bodyRef}>
          {typed}
          {phase === "writing" && <span className="xpm-caret" aria-hidden />}
        </div>

        <footer className="xpm-foot">
          <span className="xpm-note">
            {phase === "writing" ? "Braino is writing this."
              : phase === "failed" ? error
              : phase === "posted" ? (rehearse ? "Rehearsal. Nothing went out." : "It is on X. Taking you to it.")
              : phase === "posting" ? "Sending it to X"
              : "He is about to post it himself."}
          </span>
          <button
            type="button"
            className={`xpm-post-btn is-${phase}`}
            onClick={() => { if (phase === "failed") void publish(); }}
            disabled={phase !== "failed"}
          >
            <span className="xpm-btn-label">{buttonLabel}</span>
            {phase === "posted" && <span className="xpm-btn-tick" aria-hidden>✓</span>}
          </button>
        </footer>
      </div>
    </div>
  );
}
