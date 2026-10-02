import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BrainoMascot } from "@/components/BrainoMascot";
import { MacTaskFilm } from "@/components/MacTaskFilm";
import "@/pages/store-ao.css";
import "@/pages/store-mag.css";

/* Braino, the same block on the homepage and the App Store (2026-10-02):
   one hairline grid, end to end. Top: his name, the mascot, what he does and
   a Mac screen with his notch doing it. Bottom row of the same grid: the three
   models, each with its own dressed mascot. */
const DOES = [
  { h: "Sits through your meetings", label: "Meeting notes", line: "Notes saved. Three decisions, two tasks for you." },
  { h: "Clears your inbox", label: "Draft ready", line: "Reply to Priya written. Send it?" },
  { h: "Fills the form", label: "Filling the form", line: "Name, college, phone filled. Essay left for you." },
  { h: "Sends it to the right person", label: "Sent", line: "Sent the deck to John on WhatsApp." },
];

const MODELS = [
  { variant: "braino" as const, name: "Braino", who: "For everyone", line: "The whole of him, on your Mac and in Chrome.", where: "Mac and Chrome", to: "/braino", get: "Get", acc: "var(--a-braino, #d9645b)" },
  { variant: "foundry" as const, name: "Braino Foundry", who: "For founders", line: "Gets your startup seen: posts, replies and intros.", where: "Mac", to: "/braino?model=foundry", get: "View", acc: "#b5832a" },
];

export function BrainoShowcase({ kicker = "Featured · Private beta", doorsOnly = false }: { kicker?: string; doorsOnly?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setI((i + 1) % DOES.length), 3600);
    return () => window.clearTimeout(t);
  }, [i]);
  const d = DOES[i];
  return (
    <div className="bs">
      <section className="mg2-hero">
        <div className="mg2-hero-say">
          <p className="mg-k">{kicker}</p>
          <div className="mg2-name">
            <h2>Braino</h2>
            <BrainoMascot size={104} />
          </div>
          <p className="mg2-lead">A companion who lives in your Mac's notch. Tell him what you want and he does it, in the apps you already use, and remembers you.</p>
          <ul className="bs-does">
            {DOES.map((x, n) => (
              <li key={x.h} className={n === i ? "on" : ""}>
                <button type="button" onMouseEnter={() => setI(n)} onFocus={() => setI(n)} onClick={() => setI(n)}>{x.h}</button>
              </li>
            ))}
          </ul>
          <div className="mg-app mg2-app">
            <span className="mg-icon" aria-hidden="true"><img src="/braino-standing.svg" alt="" width={104} height={127} /></span>
            <div className="mg-app-say"><b>Braino</b><span>For everyone · Mac and Chrome</span></div>
            <Link to="/braino#early-access" className="st-get">Get</Link>
          </div>
        </div>
        <div className="mg2-hero-screen mg2-mac"><MacTaskFilm /></div>
      </section>
      <div className={"mg2-grid bs-grid" + (doorsOnly ? " bs-doors" : "")}>
        {(doorsOnly ? MODELS.filter((m) => m.variant !== "braino") : MODELS).map((m) => (
          <article className="mg2-card" key={m.name} style={{ ["--acc" as string]: m.acc }}>
            <BrainoMascot variant={m.variant} size={64} className="mg2-him" />
            <p className="mg-k">{m.who}</p>
            <h3>{m.name}</h3>
            <p className="mg-p">{m.line}</p>
            <div className="mg-app">
              <span className="mg-icon" aria-hidden="true"><img src="/braino-standing.svg" alt="" width={104} height={127} /></span>
              <div className="mg-app-say"><b>{m.name}</b><span>{m.where}</span></div>
              <Link to={m.to} className={m.get === "Get" ? "st-get" : "st-link"}>{m.get}</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
