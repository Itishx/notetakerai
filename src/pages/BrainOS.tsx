import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./brainos.css";

/* ============================================================================
   /brainos — BrainOS "IOMI".

   The repositioning: Braino stops being an assistant you open and becomes the
   layer you talk to. Named the way macOS names itself — the OS, then the
   release. BrainOS. IOMI.

   Apple-keynote grammar throughout: black canvas, SF Pro Display, one idea per
   viewport, and nothing decorative. The only gradient in the entire page is the
   wordmark, which is the point of the page.

   The notch IS the navigation. It sits where the hardware notch sits, and it
   expands into a dynamic island holding the site — the same mechanic the Mac
   app uses, so the site demonstrates the product by being it.
   ============================================================================ */

const NAV = [
  { to: "/", label: "Home", note: "the assistant" },
  { to: "/dontblink", label: "Don't Blink", note: "the film" },
  { to: "/journal", label: "Journal", note: "built in public" },
  { to: "/dashboard", label: "Dashboard", note: "your controls" },
  { to: "/founder-letter", label: "Founder letter", note: "why" },
  { to: "/premium", label: "Get BrainOS", note: "install" },
];

/* Real capabilities, taken from the Mac app's own capability sheet rather than
   invented for the page. If it is listed here, it ships. */
const CAPS: { title: string; items: string[] }[] = [
  {
    title: "Your machine",
    items: [
      "Organize the desktop by type, date or project",
      "Create, rename, move and delete folders",
      "Find any file by name, type or content",
      "Open files, PDFs, images, videos, folders",
      "Undo every file action he takes",
    ],
  },
  {
    title: "Your apps",
    items: [
      "Open and close any Mac app by name",
      "Write notes straight into Apple Notes",
      "Draft and send mail, resolving contacts",
      "Play, pause, skip and queue on Spotify",
      "Fall back to the website when there is no app",
    ],
  },
  {
    title: "Your browser",
    items: [
      "Hand a task to the Chrome extension mid-sentence",
      "Open a site, search it, read it back",
      "Summarize the page you are looking at",
      "Fill a form, click through a flow",
      "Open a private window when you ask for one",
    ],
  },
  {
    title: "Your screen",
    items: [
      "Know which app and window you are in",
      "Read what is visible and explain it",
      "Watch a task and tell you when it changes",
      "See you through the camera when invited",
      "Point at the thing he is talking about",
    ],
  },
  {
    title: "Your voice",
    items: [
      "Wake on your voice, not a keyboard",
      "Interrupt him mid-sentence, he stops",
      "Speak in a voice you choose",
      "Answer in the language you asked in",
      "Stay quiet when you are dictating elsewhere",
    ],
  },
  {
    title: "Your words",
    items: [
      "Voice commands you define, opening what you name",
      "Modes that change what he listens for",
      "Memory that survives the conversation",
      "A personality written as behaviour, not a prompt",
      "Everything reversible, nothing silent",
    ],
  },
];

function NotchNavIsland() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="bos-notch-dock">
      <div
        ref={ref}
        className={`bos-notch${open ? " open" : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
      >
        <div className="bos-notch-bar">
          <span className="bos-notch-eyes"><i className="bos-notch-eye" /><i className="bos-notch-eye" /></span>
          <span>{open ? "BrainOS" : "IOMI"}</span>
        </div>
        <div className="bos-notch-panel" onClick={(e) => e.stopPropagation()}>
          <div className="bos-notch-label">Go anywhere</div>
          <div className="bos-notch-grid">
            {NAV.map((n) => (
              <Link key={n.to} className="bos-notch-link" to={n.to} onClick={() => setOpen(false)}>
                {n.label}<span>{n.note}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrainOS() {
  return (
    <div className="bos">
      <NotchNavIsland />

      <header className="bos-hero">
        <div className="bos-blink">Don&apos;t Blink</div>
        <h1 className="bos-wordmark">BrainOS</h1>
        <div className="bos-version">I O M I</div>
        <p className="bos-hero-dek">
          He started as a brain in your browser. He grew into the layer you talk to.
          This is the release where you stop touching the machine.
        </p>
      </header>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">The directive</div>
          <h2 className="bos-h2">Say it once.<br /><em>Then don&apos;t touch anything.</em></h2>
          <p className="bos-lede">
            Every operating system before this one asked you to find the thing, open the thing, click
            the thing. BrainOS removes the finding, the opening and the clicking. You say what you
            want. It is already happening.
          </p>
          <p className="bos-lede">
            He lives in the notch, so he is never a window you manage. He wakes on your voice, so he
            is never an app you launch. And he hands work between your Mac and your browser without
            telling you which one did it, because you should not have to care.
          </p>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-wrap">
          <div className="bos-eyebrow">What he actually does</div>
          <h2 className="bos-h2">Everything you were<br /><em>going to do yourself.</em></h2>
          <div className="bos-caps">
            {CAPS.map((c) => (
              <div className="bos-cap" key={c.title}>
                <h3>{c.title}</h3>
                <ul>{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-stat">
        <div className="bos-wrap">
          <div className="bos-stat-v">One</div>
          <div className="bos-stat-l">
            person built this. No team, no office, no funding.<br />
            A solo founder at home, shipping an operating system.
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">From the founder</div>
          <p className="bos-quote">
            &ldquo;I built this so I would not have to touch my MacBook. That was the whole
            ambition. Then it got good enough that I stopped believing a guy sitting at home
            made it.&rdquo;
          </p>
          <div className="bos-attrib">Itish &middot; built alone &middot; still building</div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">The honest pitch</div>
          <h2 className="bos-h2">Peak laziness.<br /><em>Embrace it.</em></h2>
          <p className="bos-lede">
            There is a polite way to describe an assistant that opens your tabs, sorts your desktop,
            answers your mail and plays your music before you have finished the sentence. We are not
            going to use it. This is for people who would rather say it than do it, and who are done
            pretending that is a character flaw.
          </p>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-cta">
        <div className="bos-narrow">
          <h2 className="bos-h2">BrainOS <em>IOMI</em></h2>
          <p className="bos-lede" style={{ margin: "26px auto 0" }}>
            Free to start. On your Mac, in your browser, in the notch.
          </p>
          <div className="bos-cta-row">
            <Link className="bos-btn" to="/premium">Get BrainOS</Link>
            <Link className="bos-btn ghost" to="/dontblink">Watch the film</Link>
          </div>
        </div>
        <div className="bos-foot">Braino &middot; built by one person &middot; trybraino.com</div>
      </section>
    </div>
  );
}
