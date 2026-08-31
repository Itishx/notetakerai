import { useEffect, useRef, useState } from "react";
import "./x-pitch-modal.css";

/* The pitch demo: a compose window that writes itself and posts itself.
 *
 * Shaped like the create-post box everyone already recognises, because the room
 * has to understand what they are looking at in one second with no explanation.
 * Braino writes into it, presses Post himself, and the button turns green.
 * Nobody touches the keyboard.
 *
 * Both halves are fixed, deliberately. The words are written below rather than
 * generated, because a model call in the middle of a pitch is a chance for him
 * to say something nobody has read. And the post is already live on the
 * account, so the ending lands on a real post instead of on whatever a publish
 * call managed in that moment.
 *
 *   /x?pitch           runs it
 *   /x?pitch=rehearse  identical, and there is nothing left to keep out of it
 */

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

/* The post this demo ends on. It is already live on the account, published the
 * night before, so the room lands on a real post with a real timestamp and real
 * replies rather than on whatever a publish call managed in that moment.
 *
 * This is why nothing here posts any more. It used to queue and publish for
 * real, which now means posting the same words a second time in front of an
 * audience: a duplicate on the account and two identical posts on the profile
 * we are about to open. The publish path is deliberately gone. The words on
 * screen and the words on X are the same words, and the only thing this page
 * does is show them being written and then take you to them. */
const PITCH_POST_URL = "https://x.com/creatishhh/status/2094538802429898850";

/* rehearse is still accepted so ?pitch=rehearse keeps working from the Mac, but
   there is nothing left for it to hold back: nothing here publishes any more,
   so a rehearsal and the real run are the same thing. */
export default function XPitchModal({ handle }: { rehearse?: boolean; handle: string | null }) {
  const [phase, setPhase] = useState<Phase>("writing");
  const [typed, setTyped] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const ranRef = useRef(false);

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
      await wait(POSTING_MS);
      if (cancelled) return;
      setPhase("posted");
      await wait(GREEN_MS);
      if (cancelled) return;
      window.location.href = PITCH_POST_URL;
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
              : phase === "posted" ? "It is on X. Taking you to it."
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
