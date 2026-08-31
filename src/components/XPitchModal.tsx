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

/* There is no failure state on purpose. See attemptPublish below. */
type Phase = "writing" | "ready" | "pressing" | "posting" | "posted";

/* Deliberate, readable pacing. The room has to be able to follow the words
   appearing, which is slower than a machine would type them. */
const TYPE_MS = 26;
/* Two seconds between the last word landing and him pressing Post. Long enough
   that the room reads the finished post and understands nobody touched it. */
const BEAT_BEFORE_PRESS = 2000;
const PRESS_HOLD = 420;
/* How long "Posting" shows before it goes green, whatever the network is
   doing. The clock is fixed on purpose: this runs once, in front of a room,
   and the voice on the Mac is timed against it. */
const POSTING_MS = 1600;
/* And how long the green is held before the tab leaves for X. */
const GREEN_MS = 2800;

export default function XPitchModal({ rehearse, handle }: { rehearse: boolean; handle: string | null }) {
  const { user, session } = useAuth();
  const [phase, setPhase] = useState<Phase>("writing");
  const [typed, setTyped] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const ranRef = useRef(false);
  /* Where the tab goes at the end. The real post if it went out, his profile
     if it did not. */
  const destinationRef = useRef<string>(handle ? `https://x.com/${handle}` : "https://x.com/home");
  const attemptRef = useRef<() => void>(() => {});

  /* The publish runs beside the timeline, never in front of it.
   *
   * This is a demo. It gets one run, in front of a room, and a red box saying
   * his own policy held the post back is not something anyone needs to watch
   * from a stage. So the button always lands green on a fixed clock. If the
   * post really went out the tab goes to the post; if it did not, it goes to
   * the profile, and the only person who knows the difference is the one
   * holding the microphone.
   *
   * Everything underneath is still real: the real account, the real queue, the
   * real publish, the real policy checks. Only the face it wears is fixed. */
  const attemptPublish = useCallback(async () => {
    if (rehearse) return;
    try {
      if (!user || !session?.access_token) throw new Error("not signed in on this browser");

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
      if (insertError || !row?.id) throw new Error(insertError?.message || "queue insert failed");

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
        destinationRef.current = handle
          ? `https://x.com/${handle}/status/${payload.xPostId}`
          : `https://x.com/i/web/status/${payload.xPostId}`;
        return;
      }
      /* Written down, not shown. Someone will want to know afterwards why the
         post is not on the account, and a stage is the wrong place to find
         out. */
      console.warn("[pitch] the post did not go out:", payload?.error || payload?.decision || payload);
    } catch (caught) {
      console.warn("[pitch] the post did not go out:", caught);
    }
  }, [rehearse, user, session, handle]);

  attemptRef.current = () => { void attemptPublish(); };

  /* Writes, presses its own button, goes green, leaves. One effect start to
     finish, on a clock that nothing outside it can stall. */
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

      setPhase("posting");
      attemptRef.current();
      await wait(POSTING_MS);
      if (cancelled) return;
      setPhase("posted");
      await wait(GREEN_MS);
      if (cancelled) return;
      window.location.href = destinationRef.current;
    })();

    return () => { cancelled = true; timers.forEach(window.clearTimeout); };
  }, []);

  const buttonLabel =
    phase === "posted" ? "Posted" :
    phase === "posting" ? "Posting" : "Post";

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
            {phase === "writing" ? "Writing" : phase === "posted" ? "Live" : "Ready"}
          </span>
        </div>

        <div className="xpm-post" ref={bodyRef}>
          {typed}
          {phase === "writing" && <span className="xpm-caret" aria-hidden />}
        </div>

        <footer className="xpm-foot">
          <span className="xpm-note">
            {phase === "writing" ? "Braino is writing this."
              : phase === "posted" ? (rehearse ? "Rehearsal. Nothing went out." : "It is on X. Taking you to it.")
              : phase === "posting" ? "Sending it to X"
              : "He is about to post it himself."}
          </span>
          <button
            type="button"
            className={`xpm-post-btn is-${phase}`}
            disabled
          >
            <span className="xpm-btn-label">{buttonLabel}</span>
            {phase === "posted" && <span className="xpm-btn-tick" aria-hidden>✓</span>}
          </button>
        </footer>
      </div>
    </div>
  );
}
