import { Link } from "react-router-dom";
import { CHANNELS } from "@/lib/channels";
import "../styles/apple.css";
import "./channels.css";

/* /channels — the home of distribution.
   Every surface in one place, each carrying its own colour so you know where
   you are before you read the label, and each stating plainly what it cannot
   do. A channel that quietly lacks a capability is worse than one that says so. */

const STATUS_LABEL: Record<string, string> = { live: "Live", building: "Building", next: "Next" };

export default function Channels() {
  return (
    <div className="apple ch-hub">
      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Distribution</span>
          <div className="an-links">
            <Link to="/distra">The plan</Link>
            <Link to="/dashboard" className="apple-cta">Dashboard</Link>
          </div>
        </div>
      </nav>

      <header className="chh-wrap chh-hero">
        <p className="chh-kicker">Distra · engine two</p>
        <h1 className="chh-h1">Every place your work<br /><span className="tone">has to show up.</span></h1>
        <p className="chh-lede">
          One character, one memory, one voice, running each platform the way that platform
          actually works. Pick a channel.
        </p>
      </header>

      <div className="chh-wrap chh-grid">
        {CHANNELS.map((c) => {
          const ready = Boolean(c.app);
          const Card = (
            <>
              <div className="chh-top" style={{ background: c.surface, color: c.ink }}>
                <span className="chh-dot" style={{ background: c.accent }} />
                <b>{c.name}</b>
                <em className={"chh-status is-" + c.status}>{STATUS_LABEL[c.status]}</em>
              </div>
              <div className="chh-body">
                <p className="chh-line">{c.line}</p>
                <div className="chh-caps">
                  <div>
                    <span>He can</span>
                    <ul>{c.can.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                  <div className="is-not">
                    <span>He cannot</span>
                    <ul>{c.cannot.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                </div>
                <div className="chh-actions">
                  {ready ? (
                    <>
                      <Link to={c.app!} className="chh-btn" style={{ background: c.accent, color: c.id === "x" ? "#0f1419" : "#fff" }}>Open dashboard</Link>
                      {c.about && <Link to={c.about} className="chh-btn is-quiet">What it does</Link>}
                    </>
                  ) : (
                    <span className="chh-soon">Planned. See <Link to="/distra">the Distra plan</Link>.</span>
                  )}
                </div>
              </div>
            </>
          );
          return <article key={c.id} className={"chh-card" + (ready ? "" : " is-soon")}>{Card}</article>;
        })}
      </div>

      <section className="chh-wrap chh-note">
        <p>
          Twenty-two surfaces are mapped in the <Link to="/distra">Distra plan</Link>, ordered by
          proof rather than ambition. Each one gets a real adapter, not a wrapper around somebody
          else's posting API, because the gates are the product.
        </p>
      </section>

      <footer className="apple-foot">
        Distra is engine two of Braino Foundry. Nothing here is a shipped product; trybraino.com is
        a waitlist and Distra's first customer is Braino.
      </footer>
    </div>
  );
}
