import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import "./affective.css";
import "./affectiveos-page.css";
import "./aff-figures.css";
import "./early-access.css";

/* ============================================================================
   /waitlist — Early access (2026-09-30). Replaces the old tabbed waitlist.
   Same article style as /affectiveos: a serif opening, one hairline box to
   pick what you want and leave an email, then what happens after. Signups
   go to the same waitlist-signup function with the picks as categories.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

const PICKS = [
  { id: "braino", name: "Braino", who: "For everyone", line: "Talk to your Mac and it does the job." },
  { id: "foundry", name: "Braino Foundry", who: "For founders", line: "Gets your startup seen: posts, replies and intros." },
  { id: "mesa", name: "Braino for Schools", who: "For institutions", line: "Timetable, attendance and deadlines inside him." },
];

const NEXT = [
  { h: "You are on the list", p: "Right away. One email to say so, nothing else." },
  { h: "We send you an invite", p: "In small batches, so every new person gets looked after." },
  { h: "You talk to your Mac", p: "Install Braino, say hello, and give him his first job." },
];

type State = "idle" | "loading" | "done" | "existing" | "error" | "pick";

export default function EarlyAccess() {
  const { theme, toggle } = useAffTheme();
  useNotchNav();
  const [picked, setPicked] = useState<Set<string>>(new Set(["braino"]));
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    document.title = "Early access · Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  const toggleOne = (id: string) => {
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    if (state === "pick") setState("idle");
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "loading") return;
    if (!email.trim().includes("@")) { setState("error"); return; }
    if (picked.size === 0) { setState("pick"); return; }
    setState("loading");
    const categories = Array.from(picked);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: email.trim(), categories, context: `early-access:${categories.join(",")}` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      setState(data.error === "already_on_waitlist" ? "existing" : "done");
    } catch {
      setState("error");
    }
  };

  const finished = state === "done" || state === "existing";

  return (
    <div className="aff ao ea-page" data-theme={theme}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/affectiveos">AffectiveOS</Link>
            <Link to="/about">About</Link>
            <Link to="/apps">App Store</Link>
            <Link to="/waitlist" className="aff-nav-go">Early access</Link>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      <article className="ao-col">
        <p className="ao-date">Early access · Private beta</p>
        <h1 className="ao-title">Be one of the first to talk to your Mac.</h1>
        <p>
          Braino is in private beta. We let people in a few at a time, so we can watch how it goes
          and fix what does not. Leave your email and we will write when it is your turn.
        </p>
      </article>

      <div className="ao-wide">
        <form className="ea-box" onSubmit={submit}>
          {finished ? (
            <div className="ea-done" role="status">
              <span className="ea-check" aria-hidden="true" />
              <div>
                <h2>{state === "done" ? "You are on the list." : "You are already with us."}</h2>
                <p>We will write when it is your turn. Nothing else in between.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="ea-k">What do you want to try?</p>
              <div className="ea-picks">
                {PICKS.map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <button type="button" key={p.id} className={"ea-pick" + (on ? " on" : "")} aria-pressed={on} onClick={() => toggleOne(p.id)}>
                      <span className="ea-tick" aria-hidden="true" />
                      <small>{p.who}</small>
                      <b>{p.name}</b>
                      <span className="ea-line">{p.line}</span>
                    </button>
                  );
                })}
              </div>
              <label className="ea-k" htmlFor="ea-email">Your email</label>
              <div className="ea-row">
                <input
                  id="ea-email" type="email" value={email} required autoComplete="email" placeholder="you@somewhere.com"
                  onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
                />
                <button type="submit" className="ea-go" disabled={state === "loading"}>
                  {state === "loading" ? "Joining…" : "Get early access"}
                </button>
              </div>
              {state === "error" && <p className="ea-msg" role="alert">That did not go through. Check the email and try once more.</p>}
              {state === "pick" && <p className="ea-msg" role="alert">Pick at least one above, so we know what to write to you about.</p>}
            </>
          )}
        </form>
      </div>

      <article className="ao-col">
        <h2>What happens next</h2>
      </article>
      <div className="ao-wide">
        <ol className="ea-next">
          {NEXT.map((n, i) => (
            <li key={n.h}><span>{i + 1}</span><h3>{n.h}</h3><p>{n.p}</p></li>
          ))}
        </ol>
      </div>

      <article className="ao-col">
        <p className="ea-small">
          Braino runs on a Mac and in Chrome. We only use your email to send you the invite and the
          occasional note about what is new. <Link to="/about">Read who we are</Link>.
        </p>
        <div style={{ height: "clamp(70px, 9vw, 110px)" }} />
      </article>

      <footer className="ao-foot">
        <span>Affective · Private beta</span>
        <span><Link to="/">Home</Link><Link to="/affectiveos">AffectiveOS</Link><Link to="/about">About</Link></span>
      </footer>
    </div>
  );
}
