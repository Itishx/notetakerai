import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./affective.css";
import "./app-store.css";

/* ============================================================================
   /apps — the front of the store.

   This page sells nothing and explains nothing. It is a shelf of everything
   Affective makes, and its only job is to get you into the right product page,
   the way the front of the App Store does: one thing featured because it is
   the one you can actually have, then everything else in a grid with its state
   written on it.

   The thing it must not do is talk about Braino. Braino is one cell here. What
   he comes with lives on his own page, one level down, because a store front
   that opens on one product's feature list has told the visitor there is only
   one product before they have looked.
   ============================================================================ */

type State = "out" | "soon" | "idea";

const STATE: Record<State, string> = {
  out: "Available",
  soon: "Pre release",
  idea: "Not built",
};

const PRODUCTS: {
  key: string;
  name: string;
  kind: string;
  line: string;
  state: State;
  to: string;
  accent: string;
  mark: string;
  external?: boolean;
}[] = [
  {
    key: "foundry",
    name: "Braino Foundry",
    kind: "A model of Braino",
    line: "The same character, pointed at the part of a company nobody else does: getting the thing you built seen.",
    state: "soon",
    to: "/foundry",
    accent: "var(--a-foundry)",
    mark: "F",
  },
  {
    key: "mesa",
    name: "Braino for Mesa",
    kind: "For institutions",
    line: "One school's timetable, attendance and deadlines inside him. Bought, not downloaded.",
    state: "soon",
    to: "/contact",
    accent: "#2f6fed",
    mark: "M",
  },
  {
    key: "hera",
    name: "HERA",
    kind: "Dictation",
    line: "Words at the cursor that know your names because he has heard them. Lives inside Braino for Mac today, not yet its own thing.",
    state: "soon",
    to: "/brainohera",
    accent: "var(--a-hera)",
    mark: "H",
  },
  {
    key: "photos",
    name: "Photos",
    kind: "Pictures",
    line: "Your library, read rather than filed. On the web while the rest of it is being built.",
    state: "soon",
    to: "/photos",
    accent: "var(--a-photos)",
    mark: "P",
  },
  {
    key: "browser",
    name: "The browser",
    kind: "Browser",
    line: "A window that already knows your sites. Decided and written down, and not a line of it exists.",
    state: "idea",
    to: "/browser",
    accent: "var(--a-browser)",
    mark: "B",
  },
];

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
            <Link to="/apps">Apps</Link>
            <Link to="/braino">Braino</Link>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      <header className="ast-head">
        <div className="aff-wrap">
          <div className="aff-reveal">
            <p className="ast-kicker">Affective apps</p>
            <h1 className="ast-h1">
              Everything we make,
              <b>and one layer under all of it.</b>
            </h1>
            <p className="ast-lede">
              Each of these is a different way into the same memory of your machine. That is the
              only reason they are in one place: a photo app and a dictation app from the same
              company are two downloads, and these are one thing wearing different faces.
            </p>
          </div>
        </div>
      </header>

      {/* ── Featured ───────────────────────────────────────────────────────
          One card, because exactly one of these is a thing you can have, and
          a store front that features four things you cannot get is a brochure. */}
      <section className="ast-feat-wrap">
        <div className="aff-wrap">
          <Link to="/apps/braino" className="ast-feat aff-reveal">
            <div className="ast-feat-art">
              <img src="/braino-standing.svg" alt="" width={64} height={78} aria-hidden="true" />
            </div>
            <div className="ast-feat-body">
              <p className="ast-feat-kicker">Featured</p>
              <h2>Braino</h2>
              <p className="ast-feat-line">
                The one that is built. He sees the screen, hears the room, does things on the
                machine, and remembers all of it.
              </p>
              <span className="ast-feat-go">
                Open Braino<i aria-hidden="true">→</i>
              </span>
            </div>
            <div className="ast-feat-meta">
              <span className="ast-state is-out">Available</span>
              <span>Assistant</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Everything else ───────────────────────────────────────────────── */}
      <section className="ast-shelf" id="all">
        <div className="aff-wrap">
          <div className="ast-shelf-head aff-reveal">
            <h2>All apps</h2>
            <p>Every cell says what state it is actually in.</p>
          </div>
          <div className="ast-rows aff-reveal">
            {PRODUCTS.map((p) => (
              <Link className="ast-row" to={p.to} key={p.key} style={{ ["--acc" as string]: p.accent }}>
                <span className="ast-tile" aria-hidden="true">{p.mark}</span>
                <span className="ast-row-main">
                  <span className="ast-row-top">
                    <strong>{p.name}</strong>
                    <em>{p.kind}</em>
                  </span>
                  <span className="ast-row-line">{p.line}</span>
                </span>
                <span className={"ast-state is-" + p.state}>{STATE[p.state]}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why they are in one store ─────────────────────────────────────── */}
      <section className="ast-note">
        <div className="aff-wrap">
          <div className="aff-reveal">
            <h2 className="ast-note-h">What gets on this shelf</h2>
            <p>
              Two questions, and both have to be yes. Does it get better because of what the layer
              already knows about you, and does it put something back in. A photo editor answers no
              twice, which makes it somebody else&rsquo;s good idea. That is the only filter, and it
              is why this list is short and will stay short.
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
                  <li><Link to="/apps/braino">Braino</Link></li>
                  <li><Link to="/foundry">Braino Foundry</Link></li>
                  <li><Link to="/apps">All apps</Link></li>
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
                <Link to="/waitlist">Early access</Link>
                <Link to="/contact">Contact</Link>
              </nav>
            </div>
            <p className="aff-foot-rule">
              Nothing on this page is a roadmap. Where a product is not built, its own row says
              so.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
