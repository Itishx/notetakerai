import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Circle, Loader2 } from "lucide-react";
import "./waitlist.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type ProductId = "braino" | "macos" | "hera";
type SubmitState = "idle" | "loading" | "done" | "existing" | "error";

const PRODUCTS: Array<{
  id: ProductId;
  number: string;
  name: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "braino",
    number: "01",
    name: "Braino",
    eyebrow: "For the browser",
    description: "A companion for the web. He reads the page you are on, understands what you are doing, talks in his own voice, and helps without asking you to move your work into another window.",
  },
  {
    id: "macos",
    number: "02",
    name: "Braino for macOS",
    eyebrow: "The computer",
    description: "Braino leaves the browser and lives at the level of the Mac: apps, files, mail, music, meetings and whatever is on your screen. Voice-first, glanceable, and built to feel present.",
  },
  {
    id: "hera",
    number: "03",
    name: "Braino Hera",
    eyebrow: "Voice writing",
    description: "Speak naturally and Hera turns your thoughts into clean, polished writing wherever you type. Yap Mode, rebuilt as a fast system-wide voice-writing companion.",
  },
];

function useReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = ref.current?.querySelectorAll<HTMLElement>(".wl-reveal");
    if (!elements?.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in");
      }),
      { threshold: 0.12 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function Waitlist() {
  const pageRef = useReveal();
  const [selected, setSelected] = useState<Set<ProductId>>(new Set(PRODUCTS.map((product) => product.id)));
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const toggleProduct = (product: ProductId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(product)) {
        if (next.size > 1) next.delete(product);
      } else {
        next.add(product);
      }
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.includes("@") || selected.size === 0 || submitState === "loading") {
      setSubmitState("error");
      return;
    }
    setSubmitState("loading");

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({
          email: email.trim(),
          context: `editorial-waitlist:${Array.from(selected).join(",")}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      setSubmitState(data.error === "already_on_waitlist" ? "existing" : "done");
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <main className="wl-page" ref={pageRef}>
      <nav className="wl-nav">
        <a href="#top" className="wl-mark" aria-label="Braino waitlist home">B</a>
        <span>Braino · The waitlist</span>
        <a href="#join">Join <ArrowDown size={13} aria-hidden="true" /></a>
      </nav>

      <header className="wl-hero" id="top">
        <div className="wl-hero-copy wl-reveal">
          <p className="wl-label">Braino · The waitlist</p>
          <h1>Three ways to meet <em>Braino.</em></h1>
          <p className="wl-dek">Braino began in the browser. Now we are carefully exploring what he becomes across the Mac and wherever you write. This is the honest, unfinished map.</p>
        </div>
      </header>

      <article className="wl-article">
        <section className="wl-chapter wl-reveal" id="braino">
          <div className="wl-chapter-number">01 / The browser</div>
          <h2>Braino for the browser.</h2>
          <p className="wl-large">The Braino you can meet today: a companion who lives beside whatever you are doing on the web.</p>
          <p>Most AI waits inside a box. Braino reads the page you are already on, explains it, searches with you, remembers what matters, records a lecture, and helps turn intent into action without making you leave the work.</p>
          <p>The useful part is not that he can answer. Plenty of things can answer. The bet is that software becomes more useful when it has continuity, character, and enough context to understand what kind of help the moment actually needs.</p>

          <div className="wl-feature-card">
            <div className="wl-feature-card-top">
              <span className="wl-feature-icon" aria-hidden="true">B</span>
              <span>On this page</span>
              <i>Browser</i>
            </div>
            <h3>Ask the page. Then act on it.</h3>
            <p>Read, explain, write, remember, record, navigate and delegate—inside the browser tab where the thought began.</p>
            <div className="wl-feature-command">
              <span>Control ×2</span>
              <strong>“Braino, what am I looking at?”</strong>
            </div>
          </div>

          <figure className="wl-media-card wl-launch-image">
            <img src="/braino-waitlist-forest.png" alt="Braino for the browser launch artwork" />
            <figcaption><span>Braino for the browser</span><span>Launch artwork</span></figcaption>
          </figure>

          <figure className="wl-media-card wl-launch-video">
            <video controls playsInline preload="metadata" poster="/braino-waitlist-forest.png">
              <source src="/Braino_Final.MP4" type="video/mp4" />
              Your browser does not support embedded video.
            </video>
            <figcaption><span>Watch the launch film</span><span>Braino for the browser</span></figcaption>
          </figure>
        </section>

        <section className="wl-chapter wl-reveal" id="macos">
          <div className="wl-chapter-number">02 / The Mac</div>
          <h2>Braino for macOS.</h2>
          <p className="wl-large">The browser taught Braino how people move through the web. The Mac teaches him how people move through an entire day.</p>
          <p>On macOS, Braino lives in the notch and wakes by voice. He can work across apps, files, folders, mail, music and meetings. He sees the active work, understands where your attention is, and stays close without occupying the whole screen.</p>
          <p>This version runs on Braino OS: the reasoning, personality, context and controls that turn separate capabilities into one coherent presence.</p>

          <figure className="wl-media-card wl-mac-teaser">
            <div className="wl-mac-frame">
              <div className="wl-mac-menubar"><span>● ● ●</span><b>Braino</b><span>9:41</span></div>
              <div className="wl-mac-notch"><span /><span /></div>
              <p>“Open the file we were working on.”</p>
            </div>
            <figcaption><span>A first look at Braino for macOS</span><span>Teaser</span></figcaption>
          </figure>

          <div className="wl-status"><span /><b>In active development</b><i>macOS · voice-first · system-wide</i></div>
        </section>

        <section className="wl-chapter wl-reveal" id="braino-os">
          <div className="wl-chapter-number">03 / The operating layer</div>
          <h2>Braino OS.</h2>
          <p className="wl-large">Not another app. The intelligence underneath every place Braino lives.</p>
          <p>Braino OS is the shared reasoning, memory, personality, context and control layer beneath Braino for the browser and Braino for macOS. It is what lets the same character understand the work, decide how to help, and carry continuity from one surface to another.</p>
          <p>The browser is one body. The Mac is another. Braino OS is the mind that makes both of them feel like Braino.</p>

          <div className="wl-os-map" aria-label="Braino OS system map">
            <div>
              <span>Input</span>
              <strong>Voice · Screen · Context</strong>
            </div>
            <div className="wl-os-core">
              <span>Core</span>
              <strong>Braino OS</strong>
              <p>Reasoning, memory, personality and control.</p>
            </div>
            <div>
              <span>Surfaces</span>
              <strong>Browser · macOS · Hera</strong>
            </div>
          </div>

          <div className="wl-status"><span /><b>In active development</b><i>One Braino · many surfaces</i></div>
        </section>

        <section className="wl-chapter wl-reveal" id="hera">
          <div className="wl-chapter-number">04 / Hera</div>
          <h2>Braino Hera.</h2>
          <p className="wl-large">Live dictation: speak it out, and it gets transcribed where you are already typing.</p>
          <p>Hera is an experiment in system-wide voice writing. It does more than convert sound into words: it notices the context around you and shapes the rough thought without sanding away your meaning, rhythm or voice. Think Wispr Flow, but on steroids—and with Braino inside it.</p>
          <div className="wl-versions">
            <div><span>01</span><h3>Speak.</h3><p>Talk the way you actually think—pauses, corrections, unfinished sentences and all.</p></div>
            <div><span>02</span><h3>Understand.</h3><p>Hera detects the context around the field, app and thought instead of transcribing in a vacuum.</p></div>
            <div><span>03</span><h3>Write.</h3><p>The finished thought appears in messages, mail, documents and forms while still sounding like you.</p></div>
          </div>
          <div className="wl-experiment-note">
            <span>Tentative</span>
            <div>
              <strong>Currently in development. Could change. Could be cancelled.</strong>
              <p>No one knows exactly what the final app mode is yet. That uncertainty is part of why it is here as a teaser, not a promise.</p>
            </div>
          </div>
        </section>
      </article>

      <section className="wl-join" id="join">
        <div className="wl-join-head wl-reveal">
          <p className="wl-label">The waitlist</p>
          <h2>Choose where you want to meet Braino.</h2>
          <p>Pick one, two, or all three. One email. No launch theatre—just the honest signal that you want to hear when the work is ready.</p>
        </div>

        <div className="wl-picker wl-reveal">
          {PRODUCTS.map((product) => {
            const active = selected.has(product.id);
            return (
              <button
                type="button"
                className={active ? "selected" : ""}
                key={product.id}
                onClick={() => toggleProduct(product.id)}
                aria-pressed={active}
              >
                <span className="wl-pick-top"><i>{product.number}</i>{active ? <Check /> : <Circle />}</span>
                <small>{product.eyebrow}</small>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
              </button>
            );
          })}
        </div>

        <form className="wl-form wl-reveal" onSubmit={submit}>
          {submitState === "done" || submitState === "existing" ? (
            <div className="wl-success">
              <Check aria-hidden="true" />
              <div>
                <strong>{submitState === "done" ? "You’re on the list." : "You’re already with us."}</strong>
                <span>We’ll write when there is something worth opening.</span>
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="waitlist-email">Your email</label>
              <div>
                <input
                  id="waitlist-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (submitState === "error") setSubmitState("idle");
                  }}
                  placeholder="you@somewhere.com"
                  autoComplete="email"
                  required
                />
                <button type="submit" disabled={submitState === "loading"}>
                  {submitState === "loading" ? <Loader2 className="wl-spin" /> : <>Join the waitlist <ArrowUpRight /></>}
                </button>
              </div>
              {submitState === "error" && <p role="alert">That didn’t go through. Check the email and try once more.</p>}
            </>
          )}
        </form>
      </section>

      <footer className="wl-footer">
        <span>Braino · built by one person</span>
        <a href="#top">Back to top <ArrowUpRight /></a>
      </footer>
    </main>
  );
}
