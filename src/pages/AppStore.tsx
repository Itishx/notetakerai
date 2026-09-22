import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_FILENAME, EXTENSION_VERSION } from "@/lib/extensionDownload";
import "./affective.css";
import "./app-store.css";

/* ============================================================================
   /apps — where you get Braino, and everything he comes with.

   The shape of the page is the shape of the product: Braino is the download,
   and the apps are places inside him rather than things beside him. So he sits
   at the top in one wide cell with his builds in it, and the shelf underneath
   holds what comes with him. Nothing on the shelf is its own download, and the
   page never offers one, because the moment it does the hierarchy is a lie.

   An app here is a place he stands. The notch is a place. The right edge is a
   place. The caret is a place. Same Braino, same memory, three postures.

   It rides affective.css rather than inventing a second look, because the
   shelf belongs to the company page: same paper, same hairlines, same rule
   that cells share edges instead of floating apart. A grid with gutters would
   say these are separate downloads. They are not. They are one thing, standing
   in different places.
   ============================================================================ */

type State = "running" | "mac" | "open";

const APPS: {
  name: string;
  where: string;
  art: "notch" | "edge" | "caret" | "empty";
  line: string;
  does: string[];
  how: string;
  inside: string;
  state: State;
  honest?: string;
}[] = [
  {
    name: "Live Transcript",
    where: "The notch",
    art: "notch",
    line: "Everything said in the room turns into text along the top of the screen while it is still being said.",
    does: [
      "Runs for a full lecture without falling behind.",
      "Drops audio it cannot keep up with rather than queueing it, which is why it survives the back half of an hour.",
      "The text is his to keep, so what was said in the room is in his memory afterwards.",
    ],
    how: "Cmd + Shift + E",
    inside: "Comes with Braino for Mac",
    state: "mac",
  },
  {
    name: "Countdown",
    where: "The right edge",
    art: "edge",
    line: "A sliver of him leans in past the edge of the screen. Click him and the time left springs out of his side.",
    does: [
      "Sits on top of everything and takes a click only on the sliver itself, so it can stay open all day.",
      "Closes itself after seven seconds and goes back to being a sliver.",
      "No window, no card, no ground. Glass and numbers.",
    ],
    how: "npm run widget",
    inside: "Runs from the repo",
    state: "running",
    honest:
      "It counts, and that is all it does. It cannot read his memory yet, so it does not know what is on today. Wiring it to the layer is the next thing, and until then this is a clock in his coat.",
  },
  {
    name: "Yap",
    where: "Wherever the caret is",
    art: "caret",
    line: "Talk, and the words land in whatever you were typing into. Nothing opens and nothing is in the way.",
    does: [
      "System wide, so it works in the app you are already in.",
      "Transcription only. He is listening, not answering.",
      "Held on a double tap of Option, so the mic is not live the rest of the day.",
    ],
    how: "Option twice",
    inside: "Comes with Braino for Mac",
    state: "mac",
  },
  {
    name: "",
    where: "",
    art: "empty",
    line: "",
    does: [],
    how: "",
    inside: "",
    state: "open",
  },
];

/* The same Mac, three times, with one part of it lit. Drawn rather than
   screenshotted: the point of the row is the position on the screen, and a
   screenshot would put the app's own interface in front of that. */
function Screen({ art }: { art: "notch" | "edge" | "caret" | "empty" | "all" }) {
  return (
    <svg className="ast-screen" viewBox="0 0 160 100" role="img" aria-hidden="true">
      <rect x="6" y="6" width="148" height="80" rx="6" className="ast-screen-body" />
      <rect x="62" y="86" width="36" height="4" rx="2" className="ast-screen-foot" />
      {art === "notch" && (
        <>
          <rect x="52" y="6" width="56" height="10" rx="5" className="ast-lit" />
          <rect x="60" y="10" width="26" height="2" rx="1" className="ast-lit-ink" />
          <rect x="90" y="10" width="11" height="2" rx="1" className="ast-lit-ink" />
        </>
      )}
      {art === "edge" && (
        <>
          <rect x="147" y="36" width="7" height="22" rx="3.5" className="ast-lit" />
          <rect x="112" y="41" width="31" height="12" rx="3" className="ast-lit-soft" />
          <rect x="116" y="45" width="23" height="3" rx="1.5" className="ast-lit-ink" />
        </>
      )}
      {art === "all" && (
        <>
          <rect x="52" y="6" width="56" height="10" rx="5" className="ast-lit" />
          <rect x="147" y="36" width="7" height="22" rx="3.5" className="ast-lit" />
          <rect x="30" y="46" width="46" height="2.5" rx="1.25" className="ast-lit-ink" />
          <rect x="79" y="43" width="2" height="10" rx="1" className="ast-lit" />
        </>
      )}
      {art === "caret" && (
        <>
          <rect x="30" y="38" width="46" height="2.5" rx="1.25" className="ast-lit-ink" />
          <rect x="30" y="46" width="62" height="2.5" rx="1.25" className="ast-lit-ink" />
          <rect x="94" y="43" width="2" height="12" rx="1" className="ast-lit" />
        </>
      )}
    </svg>
  );
}

const LABEL: Record<State, string> = {
  running: "Running",
  mac: "In the Mac app",
  open: "",
};

function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal");
    if (!els?.length) return;
    // Visible at rest if the observer never runs, so the page never ships empty.
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return root;
}

export default function AppStore() {
  const root = useReveal();

  return (
    <div className="aff ast" ref={root}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/braino">Braino</Link>
            <a href="#shelf">Apps</a>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      {/* ── The claim ──────────────────────────────────────────────────────
          The page is a store, so the first thing it does is say what the
          thing on sale is. It is one thing. */}
      <header className="ast-head">
        <div className="aff-wrap">
          <div className="aff-reveal">
            <p className="ast-kicker">Braino</p>
            <h1 className="ast-h1">
              One download.
              <b>The apps are already inside it.</b>
            </h1>
            <p className="ast-lede">
              Braino is the app. What this page calls apps are the places he stands once he is
              installed: the notch at the top of the screen, the right edge, the cursor you are
              typing at. There is nothing separate to fetch for any of them.
            </p>
          </div>
        </div>
      </header>

      {/* ── Him, and the two builds of him ────────────────────────────────
          One wide cell above the shelf, in the same hairline system, because
          the shape of the page has to be the shape of the product: he is the
          download and the shelf is what is inside him. */}
      <section className="ast-get">
        <div className="aff-wrap">
          <article className="ast-parent aff-reveal">
            <div className="ast-parent-art">
              <Screen art="all" />
              <p>Three of those places, lit at once. All of them are him.</p>
            </div>
            <div className="ast-parent-body">
              <p className="ast-where">The app</p>
              <h2>Braino</h2>
              <p className="ast-line">
                He watches the screen, hears the room, does things on the machine, and keeps what
                happened. Everything below is a posture he takes while doing it.
              </p>

              <div className="ast-builds">
                <div className="ast-build">
                  <div>
                    <h3>Braino for Chrome</h3>
                    <p>
                      The browser half. A developer build, loaded unpacked from
                      chrome://extensions rather than from the Web Store.
                    </p>
                  </div>
                  <div className="ast-build-act">
                    <a
                      className="ast-dl"
                      href={EXTENSION_DOWNLOAD_URL}
                      download={EXTENSION_DOWNLOAD_FILENAME}
                    >
                      Download
                    </a>
                    <span className="ast-ver">v{EXTENSION_VERSION}</span>
                  </div>
                </div>

                <div className="ast-build">
                  <div>
                    <h3>Braino for Mac</h3>
                    <p>
                      The one the shelf below lives in. Not downloadable yet: it goes out to early
                      access first, and the apps arrive with it rather than after it.
                    </p>
                  </div>
                  <div className="ast-build-act">
                    <Link className="ast-dl is-soft" to="/waitlist">
                      Early access
                    </Link>
                    <span className="ast-ver">Pre release</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ── The shelf ──────────────────────────────────────────────────────
          No gutters. Cells share hairlines with their neighbours, because a
          gap would argue these are unrelated downloads and the page is
          arguing the opposite. */}
      <section className="ast-shelf" id="shelf">
        <div className="aff-wrap">
          <div className="ast-shelf-head aff-reveal">
            <h2>What comes with him</h2>
            <p>Three places he can stand. None of them is a separate download.</p>
          </div>
          <div className="ast-grid aff-reveal">
            {APPS.map((a, i) =>
              a.art === "empty" ? (
                <article className="ast-cell ast-cell-open" key="open">
                  <div className="ast-open-in">
                    <h3>What gets on this shelf</h3>
                    <p>Two questions, and both have to be yes.</p>
                    <ol>
                      <li>Is it better because of what the layer already knows about you?</li>
                      <li>Does it put something back into the layer?</li>
                    </ol>
                    <p className="ast-open-note">
                      A photo editor answers no twice. It is somebody else&rsquo;s good idea. This is
                      the only filter, and it is the reason this shelf will stay short for a while.
                    </p>
                  </div>
                </article>
              ) : (
                <article className="ast-cell" key={a.name} style={{ ["--n" as string]: i }}>
                  <div className="ast-cell-art">
                    <Screen art={a.art} />
                  </div>
                  <div className="ast-cell-body">
                    <div className="ast-cell-top">
                      <span className="ast-where">{a.where}</span>
                      <span className={"ast-state is-" + a.state}>{LABEL[a.state]}</span>
                    </div>
                    <h3>{a.name}</h3>
                    <p className="ast-line">{a.line}</p>
                    <ul>
                      {a.does.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    {a.honest && <p className="ast-honest">{a.honest}</p>}
                    <p className="ast-how">
                      <span>{a.inside}</span>
                      <code>{a.how}</code>
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── The honest footing ─────────────────────────────────────────────── */}
      <section className="ast-note">
        <div className="aff-wrap">
          <div className="aff-reveal">
            <p>
              Braino is pre release. The Chrome build above is real and the Mac build is not out
              yet, which is why the shelf says where each app lives rather than offering you three
              things to install. It was never three things.
            </p>
            <Link to="/waitlist" className="ast-cta">
              Get early access
            </Link>
          </div>
        </div>
      </section>

      <footer className="aff-foot">
        <img
          className="aff-foot-art"
          src="/affective-footer.jpg"
          alt=""
          width={1983}
          height={793}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
        <div className="aff-foot-in">
          <div className="aff-wrap">
            <div className="aff-foot-grid">
              <div className="aff-foot-brand">
                <strong className="aff-mark">
                  <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
                </strong>
                <p>
                  We build AffectiveOS, a continuity layer for the Mac you already own: the part
                  that understands you, does things for you, and remembers both.
                </p>
                <p className="aff-foot-where">Bengaluru.</p>
              </div>
              <nav className="aff-foot-col aff-tree" aria-label="Products">
                <h4>Products</h4>
                <ul>
                  <li><Link to="/braino">Braino</Link></li>
                  <li><Link to="/foundry">Braino Foundry</Link></li>
                </ul>
              </nav>
              <nav className="aff-foot-col aff-tree aff-tree-on" aria-label="For institutions">
                <h4>For institutions</h4>
                <ul>
                  <li><Link to="/contact">Braino for Mesa School of Business</Link></li>
                </ul>
              </nav>
              <nav className="aff-foot-col">
                <h4>Company</h4>
                <Link to="/apps">Apps</Link>
                <Link to="/waitlist">Early access</Link>
                <Link to="/contact">Contact</Link>
              </nav>
            </div>
            <p className="aff-foot-rule">
              Every app on this page is something that runs today. Where one cannot do a thing yet,
              its own cell says so.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
