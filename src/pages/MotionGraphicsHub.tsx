import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import SiteFooter from "@/components/SiteFooter";
import { BrainoTVProvider, BrainoTVScreen, useBrainoTV } from "@/components/BrainoTV";
import "./home-os.css";
import "./journal.css";
import "./notch-teaser.css";

/* ============================================================================
   /motion-graphics — every kinetic-typography film, one place, blog-style
   (same shell as /journal: header + a plain vertical list of entries). Most
   entries play right here on Braino TV; the Motion Editor opens full-page
   instead (it needs the room for the script panel + canvas side by side).
   ============================================================================ */

type TeaserEntry =
  | { id: string; title: string; date: string; tag: string; dek: string; src: string; to?: undefined }
  | { id: string; title: string; date: string; tag: string; dek: string; to: string; src?: undefined };

const TEASERS: TeaserEntry[] = [
  {
    id: "dont-blink", title: "Don't Blink.", src: "/dontblink?embed=1", date: "July 2026", tag: "film",
    dek: "The flagship film — Braino, the notch, and everything he can do.",
  },
  {
    id: "braino-split", title: "Motion Editor", to: "/braino-split", date: "July 2026", tag: "editor",
    dek: "Paste any script, select a chunk, apply a match cut — the tool the films above are built with. Opens with \"Braino Split\" loaded as an example.",
  },
  {
    id: "braino-os", title: "Braino OS", src: "/braino-os?embed=1", date: "July 2026", tag: "film",
    dek: "Why Braino OS exists: the heart that feels, the mind that knows.",
  },
  {
    id: "aware", title: "Aware", src: "/aware?embed=1", date: "July 2026", tag: "film",
    dek: "An early look at the Emotional Engine, set to its own track.",
  },
];

function TeaserList() {
  const { play, nowPlaying } = useBrainoTV();
  return (
    <main className="jr-wrap">
      {TEASERS.map((t) => t.to ? (
        <Link key={t.id} to={t.to} className="jr-entry">
          <div className="jr-meta"><span>{t.date}</span><span className="jr-tag">{t.tag}</span></div>
          <div className="jr-entry-title">{t.title}</div>
          <p>{t.dek}</p>
          <span className="qa-link">Open editor →</span>
        </Link>
      ) : (
        <button
          key={t.id}
          type="button"
          className={"jr-entry" + (nowPlaying?.src === t.src ? " on" : "")}
          onClick={() => play(t.src, t.title)}
        >
          <div className="jr-meta"><span>{t.date}</span><span className="jr-tag">{t.tag}</span></div>
          <div className="jr-entry-title">{t.title}</div>
          <p>{t.dek}</p>
          <span className="qa-link">{nowPlaying?.src === t.src ? "Playing on Braino TV ↑" : "Watch →"}</span>
        </button>
      ))}
    </main>
  );
}

export default function MotionGraphicsHub() {
  return (
    <BrainoTVProvider>
      <div className="hos jr">
        <IomiNotch />
        <header className="jr-head">
          <div className="jr-wrap">
            <div className="eyebrow">the films · one place</div>
            <h1 className="jr-title">Motion Graphics<span className="fork-dot">.</span></h1>
            <p className="jr-dek">Every kinetic-typography film we've made. Pick one — it plays right here, on Braino TV.</p>
          </div>
        </header>
        <div className="jr-wrap">
          <div className="btv-hub-screen">
            <BrainoTVScreen />
          </div>
        </div>
        <TeaserList />
        <SiteFooter />
      </div>
    </BrainoTVProvider>
  );
}
