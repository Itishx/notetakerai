import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoStatic from "@/components/BrainoStatic";
import ClassThemeToggle, { useCoralTheme, CORAL_ACCENT } from "@/components/ClassThemeToggle";
import "./braino-classes.css";

/* ============================================================================
   /telos — Braino Telos, the agent class (formerly /browser, before it gets
   reframed under the three-class positioning). Telos: the end a thing is
   aimed at. This is the doing class — say the outcome, he drives the
   browser to get there.
   ============================================================================ */

const ACTS: { num: string; name: string; h: string; body: string }[] = [
  { num: "I", name: "Chat with Page", h: "Read anything. Understand everything.",
    body: "Highlight anything, or just ask. He reads the live DOM, not a screenshot, so the answer is about what's literally in front of you." },
  { num: "II", name: "Record & Capture", h: "Listen once. Remember forever.",
    body: "One tap turns a two-hour lecture or a messy video into clean, structured notes, headings and all." },
  { num: "III", name: "Meetings", h: "Every meeting. Perfectly captured.",
    body: "He sits in on the call, captures every word, and writes the recap the moment it ends." },
  { num: "IV", name: "Delegate Tasks", h: "Say what you want. Watch it happen.",
    body: "Describe the outcome. He drives the browser to get there, clicking, typing, navigating, about a second per step." },
];

const ACCENT = "#f3a24a";

export default function Telos() {
  const [coral, setCoral] = useCoralTheme();
  return (
    <div className={`bos${coral ? " coral-theme" : ""}`} style={{ ["--accent" as string]: coral ? CORAL_ACCENT : ACCENT }}>
      <ClassThemeToggle coral={coral} onToggle={() => setCoral((v) => !v)} />
      <IomiNotch />

      <header className="bos-hero quote">
        <div className="bos-wrap">
          <div className="bos-hero-split">
            <div className="bos-hero-copy">
              <div className="bos-pill"><i />Braino Telos &middot; the agent class</div>
              <h1 className="bos-qtitle">
                Say the outcome. <em>He drives the browser to get there.</em>
              </h1>
              <p className="bos-qsub">
                Telos: the end a thing is aimed at. This is the class that does the clicking, so
                you don&rsquo;t have to describe the steps &mdash; just the result.
              </p>
              <div className="bos-soon"><i />Coming soon</div>
            </div>
            <div className="bos-art"><BrainoStatic className="bos-orb" /></div>
          </div>
        </div>
      </header>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-wrap">
          <div className="bos-eyebrow">What he does, every day</div>
          <h2 className="bos-h2">Four acts,<br /><em>on every tab.</em></h2>
          <div className="bos-caps">
            {ACTS.map((a) => (
              <div className="bos-cap" key={a.num}>
                <h3>{a.num} &middot; {a.name}</h3>
                <ul><li>{a.h}</li></ul>
                <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.7, color: "var(--ink-2)", fontWeight: 500 }}>{a.body}</p>
              </div>
            ))}
          </div>
          <div className="bos-band">
            <div className="bos-band-tile"><BrainoStatic className="bos-orb" /></div>
            <div className="bos-band-tile"><BrainoStatic className="bos-orb" /></div>
            <div className="bos-band-tile"><BrainoStatic className="bos-orb" /></div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">From the founder</div>
          <div className="bos-card">
            <p className="bos-quote">
              &ldquo;This is where he grew up &mdash; three months of tuition in a Chrome
              extension. Telos is that lesson, aimed at an actual outcome instead of a
              click.&rdquo;
            </p>
            <div className="bos-attrib">Itish &middot; built alone &middot; still building</div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-cta">
        <div className="bos-narrow">
          <h2 className="bos-h2">Braino <em>Telos</em></h2>
          <p className="bos-lede" style={{ margin: "26px auto 0" }}>
            The agent class. On your browser, on your behalf &mdash; coming after Saburi and Iomi.
          </p>
          <div className="bos-cta-row">
            <Link className="bos-btn" to="/auth">Get notified</Link>
            <Link className="bos-btn ghost" to="/">See all three classes</Link>
          </div>
        </div>
        <div className="bos-foot">Braino &middot; built by one person &middot; trybraino.com</div>
      </section>
    </div>
  );
}
