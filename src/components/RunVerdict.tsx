import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import "./run-verdict.css";

/* ============================================================================
   RunVerdict — good, bad, and what Itish had to say, right under the answer.

   The rating already existed on /engine-log, but judging a run meant leaving
   the page and finding it again, which is exactly the friction that stops
   anyone from judging anything. The verdict belongs where the answer is, while
   the reason for it is still in your head.

   It writes to the same row the engines already logged, so a verdict left here
   and a verdict left on the log page are the same record.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

// engine-runs / braino-learning are creator-only, so they need the signed-in session.
async function authHeaderValue() {
  const { data } = await supabase.auth.getSession();
  return `Bearer ${data.session?.access_token ?? ""}`;
}

type Props = {
  /** One logged call. Use for a single-shot answer. */
  logId?: string | null;
  /** A whole loop run: every turn of it gets the same verdict. */
  runId?: string | null;
  /** Shown above the buttons, so it is obvious what is being judged. */
  label?: string;
};

export default function RunVerdict({ logId, runId, label = "Was this right?" }: Props) {
  const [rating, setRating] = useState<"good" | "bad" | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const target = runId || logId || "";
  // A new answer means a new thing to judge. Without this the previous verdict
  // would sit there looking like it belonged to the reply now on screen.
  useEffect(() => { setRating(null); setNote(""); setState("idle"); }, [target]);

  if (!target) return null;

  const save = async (nextRating: "good" | "bad" | null, nextNote: string) => {
    setState("saving");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/engine-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: await authHeaderValue() },
        body: JSON.stringify({
          ...(runId ? { runId } : { id: logId }),
          rating: nextRating,
          note: nextNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("saved");
    } catch (_) {
      setState("error");
    }
  };

  const pick = (next: "good" | "bad") => {
    const value = rating === next ? null : next;
    setRating(value);
    void save(value, note);
  };

  return (
    <div className="rv">
      <span className="rv-label">{label}</span>
      <button className={"rv-btn rv-good" + (rating === "good" ? " on" : "")} onClick={() => pick("good")}>
        Good
      </button>
      <button className={"rv-btn rv-bad" + (rating === "bad" ? " on" : "")} onClick={() => pick("bad")}>
        Bad
      </button>
      <input
        className="rv-note"
        value={note}
        placeholder={rating === "bad" ? "What was wrong with it?" : "Your remarks (optional)"}
        onChange={(e) => { setNote(e.target.value); setState("idle"); }}
        onKeyDown={(e) => { if (e.key === "Enter") void save(rating, note); }}
        onBlur={() => { if (note.trim() || rating) void save(rating, note); }}
      />
      <span className={"rv-state rv-" + state}>
        {state === "saving" ? "saving" : state === "saved" ? "saved" : state === "error" ? "did not save" : ""}
      </span>
    </div>
  );
}
