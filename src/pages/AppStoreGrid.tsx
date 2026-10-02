import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import { BrainoMascot } from "@/components/BrainoMascot";
import { AppLogo } from "@/components/AppLogo";
import "./affective.css";
import "./affectiveos-page.css";
import "./store-grid.css";

/* /apps-new — an experiment (2026-10-02): the App Store as one centred
   headline, filter pills and a grid of app cards, in the Affective theme.
   Two kinds of card: Braino and his models (ours), and the apps Braino works
   in today. Only what really works is listed. */

type Card = { name: string; line: string; meta: string; cat: "Braino" | "Messaging" | "Email" | "Calendar" | "Media" | "Browser" | "Files"; icon: ReactNode; to?: string };

const CARDS: Card[] = [
  { name: "Braino", line: "Talk to your Mac. He does the job and remembers you.", meta: "Private beta · Mac and Chrome", cat: "Braino", icon: <BrainoMascot size={52} />, to: "/braino" },
  { name: "Braino Foundry", line: "Gets your startup seen: posts, replies and intros.", meta: "Model · Mac", cat: "Braino", icon: <BrainoMascot variant="foundry" size={52} />, to: "/braino?model=foundry" },
  { name: "WhatsApp", line: "Send a message or a link to the right person in a second.", meta: "Works with Braino · macOS", cat: "Messaging", icon: <AppLogo name="WhatsApp" /> },
  { name: "Mail", line: "Read, draft and reply to email in your voice.", meta: "Works with Braino · macOS", cat: "Email", icon: <AppLogo name="Mail" /> },
  { name: "Calendar", line: "What is on today, and what is due this week.", meta: "Works with Braino · macOS", cat: "Calendar", icon: <AppLogo name="Calendar" /> },
  { name: "Spotify", line: "Play, pause and skip, or find the song you mean.", meta: "Works with Braino · macOS", cat: "Media", icon: <AppLogo name="Spotify" /> },
  { name: "Chrome", line: "Open, read and act on the page you are looking at.", meta: "Works with Braino · Chrome", cat: "Browser", icon: <AppLogo name="Chrome" /> },
  { name: "Finder", line: "Find the file you saw last week, open it or send it.", meta: "Works with Braino · macOS", cat: "Files", icon: <AppLogo name="Finder" /> },
];

const CATS = ["All", "Braino", "Messaging", "Email", "Calendar", "Media", "Browser", "Files"] as const;

export default function AppStoreGrid() {
  const { theme, toggle } = useAffTheme();
  useNotchNav();
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");

  useEffect(() => {
    document.title = "App Store · Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  const shown = cat === "All" ? CARDS : CARDS.filter((c) => c.cat === cat);
  const count = (c: (typeof CATS)[number]) => (c === "All" ? CARDS.length : CARDS.filter((x) => x.cat === c).length);

  return (
    <div className="aff ao sg-page" data-theme={theme}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/affectiveos">AffectiveOS</Link>
            <Link to="/about">About</Link>
            <Link to="/apps">App Store</Link>
            <Link to="/braino#early-access" className="aff-nav-go">Early access</Link>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      <header className="sg-head">
        <h1>Everything that runs on AffectiveOS</h1>
        <p>Braino and his models, and the apps he already works in. Connect the apps you live in, then just say what you want done.</p>
      </header>

      <div className="sg-tabs" role="tablist" aria-label="Filter">
        {CATS.map((c) => (
          <button key={c} role="tab" aria-selected={c === cat} className={c === cat ? "on" : ""} onClick={() => setCat(c)}>
            {c}<span>{count(c)}</span>
          </button>
        ))}
      </div>

      <div className="sg-grid">
        {shown.map((c) => {
          const body = (
            <>
              <span className="sg-icon">{c.icon}</span>
              <h3>{c.name}</h3>
              <p>{c.line}</p>
              <small>{c.meta}</small>
            </>
          );
          return c.to
            ? <Link key={c.name} to={c.to} className="sg-card is-ours">{body}</Link>
            : <article key={c.name} className="sg-card">{body}</article>;
        })}
      </div>

      <footer className="ao-foot">
        <span>Every app here runs on AffectiveOS.</span>
        <span><Link to="/">Home</Link><Link to="/affectiveos">AffectiveOS</Link><Link to="/about">About</Link></span>
      </footer>
    </div>
  );
}
