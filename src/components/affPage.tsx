/* The homepage's grammar, shared (2026-10-07): words that light up as you
   scroll, sections that rise in, a picture that opens to the page, the nav and
   the footer. The home page and the Braino page are built from the same
   pieces, so they cannot drift into two looks. */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle } from "@/components/AffTheme";

/* Words as lit boxes. `*word*` is set in the Didone. */
export function Lit({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span className="ah-lit" aria-label={text.replace(/\*/g, "")}>
      {words.map((w, i) => {
        const didone = /^\*.*\*[.,]?$/.test(w);
        const clean = w.replace(/\*/g, "");
        return (
          <span key={`${w}-${i}`} aria-hidden="true" className={"ah-w" + (didone ? " ah-d" : "")}>{clean}{i < words.length - 1 ? " " : ""}</span>
        );
      })}
    </span>
  );
}

/* Lights the words of every [data-lit] block as it crosses the screen. `deps`
   re-reads the blocks when the page swaps content (the Braino / Foundry tabs). */
export function useLitWords(deps: unknown[] = []) {
  useEffect(() => {
    const blocks = [...document.querySelectorAll<HTMLElement>("[data-lit]")];
    if (!blocks.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const apply = () => {
      frame = 0;
      for (const block of blocks) {
        const words = [...block.querySelectorAll<HTMLElement>(".ah-w")];
        if (still.matches) { words.forEach((w) => w.classList.add("on")); continue; }
        const r = block.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.88 - r.top) / (r.height * 0.5 + window.innerHeight * 0.5)));
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle("on", i < lit));
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(apply); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* The hero picture marked data-grow opens from the measure to the page over
   the first screen of scrolling. Flat under 900px and for reduced motion. */
export function useGrowHero() {
  useEffect(() => {
    const grows = [...document.querySelectorAll<HTMLElement>("[data-grow]")];
    if (!grows.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const apply = () => {
      frame = 0;
      const narrow = window.innerWidth < 900;
      for (const el of grows) {
        const p = Math.min(1, Math.max(0, window.scrollY / Math.max(220, window.innerHeight * 0.55)));
        el.style.setProperty("--grow", narrow || still.matches ? "1" : p.toFixed(3));
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(apply); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}

/* Sections rise in as they arrive. Visible at rest if the observer never runs. */
export function useAffReveal(deps: unknown[] = []) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal:not(.is-in), .bf-reveal:not(.is-in)");
    if (!els?.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return root;
}

export function AffNav({ theme, onToggle, links }: { theme: string; onToggle: () => void; links?: Array<[string, string]> }) {
  const items = links || [["Braino", "/braino"], ["AffectiveOS", "/affectiveos"], ["About", "/about"]];
  return (
    <nav className="aff-nav">
      <div className="aff-nav-in">
        <Link to="/" className="aff-logo" aria-label="Affective">
          <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
        </Link>
        <div className="aff-nav-links">
          {items.map(([label, to]) => to.startsWith("#") ? <a key={to} href={to}>{label}</a> : <Link key={to} to={to}>{label}</Link>)}
          <Link to="/braino#early-access" className="aff-nav-go">Early access</Link>
          <AffThemeToggle theme={theme as "light" | "dark"} onToggle={onToggle} />
        </div>
      </div>
    </nav>
  );
}

export function AffFooter() {
  return (
    <footer className="aff-foot">
      <img className="aff-foot-art" src="/affective-footer.jpg" alt="" width={1983} height={793} loading="lazy" decoding="async" aria-hidden="true" />
      <div className="aff-foot-in">
        <div className="aff-wrap">
          <div className="aff-foot-grid">
            <div className="aff-foot-brand">
              <strong className="aff-mark"><img src="/affective-logo.png" alt="Affective" width={1000} height={207} /></strong>
              <p>Building tech that makes life more affective.</p>
              <p className="aff-foot-where">Bengaluru.</p>
            </div>
            <nav className="aff-foot-col aff-tree" aria-label="Braino">
              <h4><Link to="/braino">Braino</Link></h4>
              <ul>
                <li><Link to="/braino">For everyone</Link></li>
                <li><Link to="/braino?model=foundry">Braino Foundry</Link></li>
                <li><Link to="/braino#early-access">Early access</Link></li>
              </ul>
            </nav>
            <nav className="aff-foot-col">
              <h4>Company</h4>
              <Link to="/affectiveos">AffectiveOS</Link>
              <Link to="/labs">Labs</Link>
              <Link to="/contact">Contact</Link>
            </nav>
          </div>
          <p className="aff-foot-rule">Everything on this page is built and running in our private beta. Nothing here is a roadmap.</p>
        </div>
      </div>
    </footer>
  );
}
