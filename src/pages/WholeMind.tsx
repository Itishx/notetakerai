import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoWholeMind from "@/components/BrainoWholeMind";
import "../styles/apple.css";
import "./human-intelligence.css";
// The .ewm-* panel rules and the --eil-* coral variables both live here. Moving
// Whole Mind off the Emotional Intelligence page left them behind, which is why
// "What he thinks" rendered unstyled next to everything else.
import "./visual-emotional-engine.css";

/* ============================================================================
   /whole-mind — both halves of Braino on one message.

   This used to be a tab on /emotional-intelligence, which was wrong twice over:
   half of what it shows is thinking, not feeling, and it invited judging the two
   layers together before either one is tuned. The layers are being sharpened
   separately right now, each against its own run log. This page is where they
   meet once they are both worth trusting, so it lives on its own, off the notch,
   until then.
   ============================================================================ */

export default function WholeMind() {
  return (
    // `eil` is required, not decorative: --eil-coral and friends are scoped to
    // it, and the feeling half is built out of them.
    <div className="apple hil eil" style={{ ["--ap-accent" as string]: "var(--ap-coral)" }}>
      <IomiNotch />

      <header className="apple-hero hil-hero">
        <p className="apple-eyebrow">Both layers, one message</p>
        <h1 className="apple-display">The whole <span className="tone">mind</span>.</h1>
        <p className="apple-subhead">
          One message goes to both halves at once. What he thinks on the left, what
          he says on the right. The two are tuned apart and judged together.
        </p>
      </header>

      <BrainoWholeMind />

      <section className="hil-read hil-end">
        <h2 className="hil-h2">Each half has its own room.</h2>
        <p className="hil-p">
          The mind is sharpened on Human Intelligence, where the loop has to finish a
          real job without breaking anything. The heart is sharpened on Emotional
          Intelligence, where every reply is checked against his own banned phrases.
          This page only means something once both of those hold up.
        </p>
        <div className="hil-cta-row">
          <Link className="hil-btn" to="/human-intelligence">Human Intelligence</Link>
          <Link className="hil-btn ghost" to="/emotional-intelligence">Emotional Intelligence</Link>
        </div>
        <p className="hil-foot">Braino &middot; built by one person &middot; trybraino.com</p>
      </section>
    </div>
  );
}
