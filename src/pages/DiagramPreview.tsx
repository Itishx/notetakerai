import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { MacTaskFilm } from "@/components/MacTaskFilm";
import { AosFlow, AosLayers, AosMac, AosMacFlow, AosMacLive, AosNested, AosOrbit } from "@/components/AosDiagrams";
import "./affective.css";
import "./affectiveos-page.css";
import "./affective-home.css";

/* /diagrams — four ways to draw AffectiveOS, side by side, to pick one for
   the homepage. A preview page, not linked anywhere. */
export default function DiagramPreview() {
  const { theme, toggle } = useAffTheme();
  const all = [
    { k: "H", name: "Live task, every step: Chrome, Google Flights, WhatsApp", el: <MacTaskFilm /> },
    { k: "G", name: "A live task, 18 seconds: flow, notch, hands, done", el: <AosMacLive /> },
    { k: "F", name: "MacBook Air: the flow on screen, with the hands at work", el: <AosMacFlow /> },
    { k: "E", name: "Mac orbit: AffectiveOS powering the Mac", el: <AosMac /> },
    { k: "A", name: "Layers", el: <AosLayers /> },
    { k: "B", name: "Orbit", el: <AosOrbit /> },
    { k: "C", name: "Flow: one request, left to right", el: <AosFlow /> },
    { k: "D", name: "Nested: each layer inside the one that holds it", el: <AosNested /> },
  ];
  return (
    <div className="aff" data-theme={theme} style={{ minHeight: "100vh", paddingBottom: 120 }}>
      <div className="aff-wrap" style={{ paddingTop: 48, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/">← Home</Link>
        <AffThemeToggle theme={theme} onToggle={toggle} />
      </div>
      {all.map((d) => (
        <section key={d.k} className="aff-wrap" style={{ paddingTop: 90 }}>
          <p className="ah-kicker">Option {d.k}</p>
          <h2 style={{ fontFamily: "var(--a-display)", fontWeight: 500, fontSize: 34, margin: "0 0 36px", color: "var(--a-ink)" }}>{d.name}</h2>
          <div className="is-in">{d.el}</div>
        </section>
      ))}
    </div>
  );
}
