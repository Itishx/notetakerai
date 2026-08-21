import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import "../styles/apple.css";
import "./braino-code.css";

/* ============================================================================
   /code — Braino Code.

   You describe a website. He builds it. This page is what you look at in
   between, and it is deliberately not a stream of code: Braino narrates the
   build out loud, so the screen is something you glance at alongside him, not
   something you read instead of him. It holds decisions, not activity.

   Three beats:
     1. what you said        instant, free, no model involved
     2. how it should look   the palette, ~30s in, the part anyone can judge
     3. what he is writing   the sitemap, with real elapsed time

   Beat two is the one that earns the screen. Everybody has an opinion about
   colour, including people who cannot read a line of code, so it goes up while
   a correction is still cheap.

   Known gap: the correction at beat two starts a fresh build rather than
   steering the running one, because the page write has already begun by then.
   The fix is a spec approval gate between the two model calls, which is a
   product decision (it makes the build no longer hands-off) rather than a
   missing line of code.
   ============================================================================ */

const FUNCTION = "braino-code";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type SiteSpec = {
  name: string;
  tagline: string;
  mood: string;
  referenceRead: string | null;
  palette: Record<string, string>;
  fonts: { display: string; body: string };
  sections: { id: string; title: string; intent: string }[];
};

type Build = {
  id: string;
  brief: string;
  restated: string | null;
  spec: SiteSpec | null;
  status: "queued" | "designing" | "writing" | "editing" | "ready" | "failed";
  change_summary?: string | null;
  preview_url: string | null;
  error: string | null;
};

const EXAMPLES = [
  "build me a website which is very similar to Perfios, it's about a cybersecurity firm which is doing A to Z from analyzing to data collection to data verification to data distribution",
  "a one page site for a small architecture studio in Ahmedabad, four projects, very quiet",
  "landing page for a coffee subscription, warm and playful, monthly bags from one roaster",
];

// What Braino is doing, in the words he would use out loud. The wait only feels
// broken when nothing on screen accounts for it.
const STATUS_LINE: Record<Build["status"], string> = {
  queued: "Getting started",
  designing: "Reading the brief",
  writing: "Writing the page",
  editing: "Making that change",
  ready: "Done",
  failed: "That did not work",
};

// supabase-js reports any non-2xx as the same opaque sentence and hides the
// response body behind error.context. The function always answers with
// { error: "<the actual reason>" }, so dig it out: "Edge Function returned a
// non-2xx status code" is not something anyone can act on.
async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.text === "function") {
    try {
      const body = await context.clone().text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          const message = parsed?.error || parsed?.message || parsed?.msg;
          if (message) return `${message} (${context.status})`;
        } catch {
          return `${body.slice(0, 300)} (${context.status})`;
        }
      }
      return `The build service answered ${context.status}.`;
    } catch {
      /* fall through to the generic message below */
    }
  }
  return error instanceof Error ? error.message : "Could not start the build.";
}

function elapsedLabel(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export default function BrainoCode() {
  const [brief, setBrief] = useState("");
  const [build, setBuild] = useState<Build | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<"preview" | "code">("preview");
  const [html, setHtml] = useState<string | null>(null);
  const [htmlFor, setHtmlFor] = useState<string | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => { document.title = "Braino Code"; }, []);

  // /code?build=<id> reopens a build. A refresh mid-build otherwise loses the
  // only handle on it, since an anonymous build lives nowhere on this device.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("build");
    if (!wanted) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}?build=${wanted}`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (body?.build && !cancelled) {
          startedAt.current = Date.now();
          setBuild(body.build);
        }
      } catch {
        // Nothing to resume; the empty state is the right fallback.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // One ticking clock for the whole page. Real elapsed time is the honest
  // alternative to a progress bar we cannot actually fill: the page arrives in
  // one piece, so pretending to complete sections one by one would be a lie.
  const working = build
    ? build.status !== "ready" && build.status !== "failed"
    : false;

  useEffect(() => {
    if (!working) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [working]);

  // Follow the build by polling the function rather than the table. A build
  // started signed out has no owner, so RLS hides its row from a direct read;
  // the function hands back one build by id instead, which keeps knowing the
  // uuid as the only capability. Minutes-long build, so 2.5s is imperceptible.
  useEffect(() => {
    if (!build?.id || !working) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}?build=${build.id}`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        if (!res.ok || cancelled) return;
        const body = await res.json();
        if (body?.build && !cancelled) {
          setBuild((current) => (current ? { ...current, ...body.build } : body.build));
          if (body.build.status === "failed" && body.build.error) setError(body.build.error);
        }
      } catch {
        // A dropped poll is not worth surfacing; the next tick covers it.
      }
    };

    void poll();
    const id = window.setInterval(poll, 2500);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [build?.id, working]);

  // Pull the finished file down once and use the same string for both halves of
  // the toggle: srcdoc renders it, the code view prints it. Rendering from the
  // storage URL is not an option, because Storage serves every object as
  // text/plain under a "default-src 'none'; sandbox" CSP so nobody can host
  // pages on that domain. srcdoc sidesteps it entirely, and works precisely
  // because the generated site is self-contained: no CDN, no webfont, no
  // external image to go and fetch.
  useEffect(() => {
    // Keyed on the build id, not on "do we have any html". After an edit we are
    // deliberately still showing the previous page, so a plain null check would
    // never fetch the new one.
    if (build?.status !== "ready" || htmlFor === build.id) return;
    let cancelled = false;
    const id = build.id;
    (async () => {
      try {
        // Through the function rather than the storage URL: this one sets our
        // CORS headers, so the fetch is guaranteed to be allowed.
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION}?render=${id}`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        });
        if (!res.ok || cancelled) return;
        const text = await res.text();
        if (!cancelled) { setHtml(text); setHtmlFor(id); }
      } catch {
        // Leaves the stage on its holding state rather than blanking it.
      }
    })();
    return () => { cancelled = true; };
  }, [build?.status, build?.id, htmlFor]);

  const start = useCallback(async (text: string, parentBuildId?: string) => {
    const trimmed = text.trim();
    if (!trimmed || starting) return;
    setStarting(true);
    setError(null);
    if (!parentBuildId) { setHtml(null); setHtmlFor(null); }
    setView("preview");
    startedAt.current = Date.now();
    setNow(Date.now());

    try {
      const { data, error: fnError } = await supabase.functions.invoke(FUNCTION, {
        body: { brief: trimmed, parentBuildId: parentBuildId || null },
      });
      if (fnError) throw new Error(await readFunctionError(fnError));
      if (data?.error) throw new Error(data.error);
      if (!data?.buildId) throw new Error("Could not start the build.");

      setBuild({
        id: data.buildId,
        brief: trimmed,
        restated: null,
        spec: null,
        status: "queued",
        preview_url: null,
        error: null,
      });
      setBrief("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the build.");
    } finally {
      setStarting(false);
    }
  }, [starting]);

  const spec = build?.spec || null;
  const elapsed = useMemo(
    () => (startedAt.current ? elapsedLabel(now - startedAt.current) : ""),
    [now],
  );

  return (
    <div className="apple">
      <header className={`apple-hero left ac-blue${build ? " bc-small" : ""}`}>
        <p className="apple-eyebrow">Braino Code</p>
        <h1 className="apple-display">Say it.<br /><span className="tone">He builds it.</span></h1>
        <p className="apple-subhead">
          Describe the website the way you would to a friend. He reads any reference you
          name, decides how it should look, then writes the whole page.
        </p>
      </header>

      <div className={`bc-wrap${build ? " working" : ""}`}>
        {!build && (
          <div className="bc-ask">
            <div className="bc-field">
              <textarea
                className="bc-input"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="build me a website which is very similar to Perfios, it's about a cybersecurity firm..."
                aria-label="Describe the website you want"
              />
            </div>
            <div className="bc-row">
              <button className="bc-go" onClick={() => start(brief)} disabled={!brief.trim() || starting}>
                {starting ? "Starting" : "Build it"}
              </button>
              <span className="bc-note">Three to eight minutes. You can watch.</span>
            </div>
            <div className="bc-tries">
              {EXAMPLES.map((example) => (
                <button key={example} className="bc-try" onClick={() => setBrief(example)}>
                  {example.length > 70 ? `${example.slice(0, 70)}...` : example}
                </button>
              ))}
            </div>
            {error && <div className="bc-oops">{error}</div>}
          </div>
        )}

        {build && (
        <div className="bc-split">
          <div className="bc-beats">
            {/* Beat one. Instant, and no model was asked: your own words back,
                so a misheard brief is caught before it costs four minutes. */}
            <section className="bc-card">
              <div className="bc-head">
                <p className="bc-label">What you said</p>
                {working && <span className="bc-clock">{elapsed}</span>}
              </div>
              <p className="bc-said">{build.brief}</p>
            </section>

            {/* Beat two. The palette, while a correction is still cheap. */}
            {spec ? (
              <section className="bc-card">
                <p className="bc-label">How it should look</p>
                <h2 className="bc-title">{spec.name}</h2>
                <p className="bc-sub">{spec.tagline}</p>

                <div className="bc-swatches">
                  {Object.entries(spec.palette || {}).map(([key, value], index) => (
                    <div className="bc-swatch" key={key} style={{ animationDelay: `${index * 70}ms` }}>
                      <i style={{ background: value }} />
                      <b>{key}</b>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>

                <dl className="bc-facts">
                  <div className="bc-fact"><dt>Mood</dt><dd>{spec.mood}</dd></div>
                  <div className="bc-fact">
                    <dt>Type</dt>
                    <dd>{spec.fonts?.display} headings, {spec.fonts?.body} text</dd>
                  </div>
                  {spec.referenceRead && (
                    <div className="bc-fact"><dt>Reference</dt><dd>{spec.referenceRead}</dd></div>
                  )}
                </dl>
              </section>
            ) : (
              <section className="bc-card">
                <div className="bc-head">
                  <p className="bc-label">{STATUS_LINE[build.status]}</p>
                  <span className="bc-clock">{elapsed}</span>
                </div>
                <p className="bc-sub">
                  Deciding the colours, the type and the shape of the page before writing a word of it.
                </p>
              </section>
            )}

            {/* Beat three. The sitemap he is executing against. */}
            {spec?.sections?.length ? (
              <section className={`bc-card ${build.status === "writing" ? "bc-live" : ""}`}>
                <div className="bc-head">
                  <p className="bc-label">{build.status === "writing" ? "Writing" : "The page"}</p>
                  {working && <span className="bc-clock">{elapsed}</span>}
                </div>
                <ul className="bc-list">
                  {spec.sections.map((section) => (
                    <li className="bc-item" key={section.id}>
                      <span className="bc-bead" />
                      <div>
                        <h3>{section.title}</h3>
                        <p>{section.intent}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {build.status === "ready" && (
              <div className="bc-after">
                <div className="bc-field">
                  <textarea
                    className="bc-input"
                    style={{ minHeight: 64 }}
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                    placeholder="make it darker. add a section about the team."
                    aria-label="Change something about this site"
                  />
                </div>
                <div className="bc-row">
                  <button
                    className="bc-go"
                    onClick={() => start(brief, build.id)}
                    disabled={!brief.trim() || starting}
                  >
                    Change it
                  </button>
                  <span className="bc-note">He keeps everything else the same.</span>
                </div>
              </div>
            )}

            {build.status === "failed" && (
              <div className="bc-oops">
                {build.error || error || "That did not work."}
                <div className="bc-row" style={{ marginTop: 14 }}>
                  <button className="bc-go quiet" onClick={() => { setBuild(null); setError(null); }}>
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* The stage. The site itself, not a description of it. */}
          <div className="bc-stage">
            <div className="bc-bar">
              <div className="bc-seg" role="group" aria-label="Show the site or its code">
                <button aria-pressed={view === "preview"} onClick={() => setView("preview")}>
                  Preview
                </button>
                <button aria-pressed={view === "code"} onClick={() => setView("code")}>
                  Code
                </button>
              </div>
              {build.status === "ready" && (
                <div className="bc-row">
                  {/* Our own domain, not the storage URL: supabase.co refuses to
                      serve HTML as HTML, so a link there shows source. */}
                  <a
                    className="bc-go quiet"
                    href={`/site/${build.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open it
                  </a>
                  <button className="bc-go quiet" onClick={() => { setBuild(null); setError(null); setHtml(null); setHtmlFor(null); }}>
                    New
                  </button>
                </div>
              )}
            </div>

            <div className="bc-screen">
              {html && view === "preview" && (
                // srcdoc, not src: see the fetch effect above for why the
                // storage URL cannot render. No allow-same-origin, so the site
                // runs in an opaque origin and cannot reach back into this page.
                <iframe
                  srcDoc={html}
                  title={spec?.name || "The website"}
                  sandbox="allow-scripts"
                />
              )}
              {html && view === "code" && (
                <pre className="bc-code"><code>{html}</code></pre>
              )}
              {!html && (
                <div className="bc-holding">
                  <strong>
                    {build.status === "ready" ? "Fetching the page" : STATUS_LINE[build.status]}
                  </strong>
                  <p>
                    {build.status === "failed"
                      ? "Nothing to show for this one."
                      : "The site appears here the moment he finishes it."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
