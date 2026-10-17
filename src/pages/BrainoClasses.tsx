import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoStatic from "@/components/BrainoStatic";
import ClassThemeToggle, { useCoralTheme } from "@/components/ClassThemeToggle";
import "./braino-classes.css";

/* ============================================================================
   / — Braino comes in two classes. The front door: not one product
   page, a map of two: Iomi (the OS) and Telos (the browser agent). All three read as "coming soon" here —
   this page's job is to make the split legible, not to sell any one of them
   yet.
   ============================================================================ */

const CLASSES = [
  {
    to: "/iomi",
    tag: "Coming soon",
    name: "Braino Iomi",
    cls: "The OS class",
    dek: "He stops being an app you open and becomes the layer you talk to.",
    featured: false,
  },
  {
    to: "/telos",
    tag: "Coming soon",
    name: "Braino Telos",
    cls: "The agent class",
    dek: "Say what you want done. He drives the browser to get there.",
    featured: false,
  },
] as const;

export default function BrainoClasses() {
  const [coral, setCoral] = useCoralTheme();
  return (
    <div className={`bos${coral ? " coral-theme" : ""}`}>
      <ClassThemeToggle coral={coral} onToggle={() => setCoral((v) => !v)} />
      <IomiNotch />

      <header className="bos-hero quote">
        <div className="bos-wrap">
          <div className="bos-hero-split">
            <div className="bos-hero-copy">
              <div className="bos-pill"><i />Braino comes in two classes</div>
              <h1 className="bos-qtitle">
                He&rsquo;s not one product anymore. <em>He&rsquo;s two different reasons to open your laptop.</em>
              </h1>
              <p className="bos-qsub">
                One brain, split into the jobs it was actually doing: a layer to live in, and an agent
                to hand things off to.
              </p>
            </div>
            <div className="bos-art"><BrainoStatic className="bos-orb" /></div>
          </div>
        </div>
      </header>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-wrap">
          <div className="bos-eyebrow">The three classes</div>
          <h2 className="bos-h2">Pick the one<br /><em>that's actually for you.</em></h2>
          <div className="bos-classes">
            {CLASSES.map((c) => (
              <Link key={c.to} to={c.to} className={`bos-class${c.featured ? " featured" : ""}`}>
                <div className="bos-class-tag">{c.tag}</div>
                <h3 className="bos-class-name">{c.name}</h3>
                <div className="bos-class-class">{c.cls}</div>
                <p className="bos-class-dek">{c.dek}</p>
                <div className="bos-class-go">Meet him →</div>
              </Link>
            ))}
          </div>
          <div className="bos-band">
            <div className="bos-band-tile" style={{ ["--accent" as string]: "#e8786e" }}><BrainoStatic className="bos-orb" /></div>
            <div className="bos-band-tile" style={{ ["--accent" as string]: "#8ab4f8" }}><BrainoStatic className="bos-orb" /></div>
            <div className="bos-band-tile" style={{ ["--accent" as string]: "#f3a24a" }}><BrainoStatic className="bos-orb" /></div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">Why split him up</div>
          <div className="bos-card">
            <p className="bos-quote">
              &ldquo;One product was starting to mean three different jobs. Splitting them means
              each one can actually be great at its job, instead of fine at all three.&rdquo;
            </p>
            <div className="bos-attrib">Itish &middot; founder &middot; still building</div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-cta">
        <div className="bos-narrow">
          <h2 className="bos-h2">Two classes.<br /><em>One brain.</em></h2>
          <p className="bos-lede" style={{ margin: "26px auto 0" }}>
            Get on the list and we&rsquo;ll tell you the second he&rsquo;s ready to talk.
          </p>
          <div className="bos-cta-row">
            <Link className="bos-btn" to="/braino">Meet Braino</Link>
            <Link className="bos-btn ghost" to="/auth">Get notified</Link>
          </div>
        </div>
        <div className="bos-foot">Braino &middot; built by one person &middot; trybraino.com</div>
      </section>
    </div>
  );
}
