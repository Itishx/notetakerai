import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "./x-pitch-modal.css";

/* The pitch demo, on the page rather than in the notch.
 *
 * The first version of this put the writing inside the Mac notch, and on stage
 * that reads as nothing happening: a small strip of text nobody can see moves,
 * while the browser sits still. So the visible half moved here, to the surface
 * everyone in the room is already looking at.
 *
 * Braino writes the post in front of you, asks, and only publishes when a human
 * says yes. The publish is real. The approval is real. Everything before it is
 * theatre, deliberately: a model call in the middle of a pitch is a chance for
 * him to say something nobody has read.
 *
 * Open /x?pitch to run it, /x?pitch=rehearse to run everything except the
 * publish.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

/* Written here, not generated. In his voice, about the thing that just
   happened in the room. Edit this line and you have edited the demo. */
export const PITCH_POST = [
  "Just pitched Braino at Mesa.",
  "",
  "The problem is not building any more. Anyone can build now. The problem is that nobody sees it.",
  "",
  "So I built a co-founder who handles that part.",
  "",
  "He wrote this post and published it while I was still on stage.",
].join("\n");

type Phase = "writing" | "approve" | "posting" | "done" | "failed";

export default function XPitchModal({ rehearse, handle }: { rehearse: boolean; handle: string | null }) {
  const { user, session } = useAuth();
  const [phase, setPhase] = useState<Phase>("writing");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  /* He types it out. Word at a time, not character at a time: character typing
     at a readable speed takes half a minute for a post this long, and the room
     has sixty seconds in total. */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const words = PITCH_POST.split(/(\s+)/);
    let i = 0;
    const tick = window.setInterval(() => {
      i += 1;
      setTyped(words.slice(0, i).join(""));
      if (i >= words.length) {
        window.clearInterval(tick);
        window.setTimeout(() => setPhase("approve"), 500);
      }
    }, 85);
    return () => window.clearInterval(tick);
  }, []);

  const publish = useCallback(async () => {
    setPhase("posting");
    setError(null);

    if (rehearse) {
      /* Everything except the part that cannot be undone. */
      window.setTimeout(() => setPhase("done"), 1400);
      window.setTimeout(() => {
        window.location.href = handle ? `https://x.com/${handle}` : "https://x.com/home";
      }, 3000);
      return;
    }

    try {
      if (!user || !session?.access_token) throw new Error("Not signed in on this browser.");

      /* A queue item first, because publishing is an action on one. It carries
         the same policy checks as anything else he posts, which is the point:
         the demo is the real path, not a shortcut around it. */
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
        setPhase("done");
        /* Straight to the post itself. Landing on a profile and scrolling for
           it in front of a room is the same as not having posted it. */
        const url = handle
          ? `https://x.com/${handle}/status/${payload.xPostId}`
          : `https://x.com/i/web/status/${payload.xPostId}`;
        window.setTimeout(() => { window.location.href = url; }, 1600);
        return;
      }

      /* Held by policy is a real outcome, not an error, and it deserves the
         honest words rather than a red box. */
      if (payload?.blocked) throw new Error("His own policy held it back. Check Advanced Controls.");
      throw new Error(String(payload?.error || "X did not accept it."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not go through.");
      setPhase("failed");
    }
  }, [rehearse, user, session, handle]);

  return (
    <div className="xpm-scrim" role="dialog" aria-modal="true" aria-label="Braino is writing a post">
      <div className="xpm-card">
        <header className="xpm-head">
          <span className="xpm-dot" aria-hidden />
          <div>
            <b>Braino</b>
            <span>{handle ? `posting as @${handle}` : "posting to your account"}</span>
          </div>
          <span className={`xpm-state is-${phase}`}>
            {phase === "writing" ? "Writing"
              : phase === "approve" ? "Needs you"
              : phase === "posting" ? "Posting"
              : phase === "done" ? "Posted"
              : "Held"}
          </span>
        </header>

        <div className="xpm-post">
          {typed}
          {phase === "writing" && <span className="xpm-caret" aria-hidden />}
        </div>

        <footer className="xpm-foot">
          {phase === "writing" && <p className="xpm-note">He is writing it now.</p>}

          {phase === "approve" && (
            <>
              <p className="xpm-note">He will not post it until you say so.</p>
              <div className="xpm-actions">
                <button type="button" className="xpm-no" onClick={() => window.history.back()}>Not this</button>
                <button type="button" className="xpm-yes" onClick={publish} autoFocus>Yes, post it</button>
              </div>
            </>
          )}

          {phase === "posting" && (
            <p className="xpm-note xpm-working">
              <span className="xpm-dots" aria-hidden><i /><i /><i /></span>
              Posting it to X{rehearse ? " (rehearsal, nothing is going out)" : ""}
            </p>
          )}

          {phase === "done" && (
            <p className="xpm-note xpm-ok"><span className="xpm-tick" aria-hidden>✓</span> Posted. Taking you to it.</p>
          )}

          {phase === "failed" && (
            <>
              <p className="xpm-note xpm-bad">{error}</p>
              <div className="xpm-actions">
                <button type="button" className="xpm-yes" onClick={publish}>Try again</button>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
