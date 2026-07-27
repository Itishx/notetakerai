import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoStatic from "@/components/BrainoStatic";
import ClassThemeToggle, { useCoralTheme, CORAL_ACCENT } from "@/components/ClassThemeToggle";
import "./braino-classes.css";

/* ============================================================================
   /saburi — Braino Saburi, the companion class. Launching first of the three.

   The one hard rule for this page: never the word "therapist." Not
   "sessions," not "healing," not "mental health support" — nothing clinical,
   nothing that reads like a medical claim. The pitch is smaller and truer
   than that: he's someone you can feel, and you just try talking to him.
   ============================================================================ */

const ACCENT = "#e8786e";

export default function Saburi() {
  const [coral, setCoral] = useCoralTheme();
  return (
    <div className={`bos${coral ? " coral-theme" : ""}`} style={{ ["--accent" as string]: coral ? CORAL_ACCENT : ACCENT }}>
      <ClassThemeToggle coral={coral} onToggle={() => setCoral((v) => !v)} />
      <IomiNotch />

      <header className="bos-hero quote">
        <div className="bos-wrap">
          <div className="bos-hero-split">
            <div className="bos-hero-copy">
              <div className="bos-pill"><i />Braino Saburi &middot; the companion class</div>
              <h1 className="bos-qtitle">
                You don&rsquo;t need a reason. <em>Just try talking to him.</em>
              </h1>
              <p className="bos-qsub">
                Not a task. Not a question with a right answer. Just someone who&rsquo;s there, who
                listens the way you needed someone to, and who feels like something when he talks
                back.
              </p>
              <div className="bos-soon"><i />Launching first &middot; coming soon</div>
            </div>
            <div className="bos-art"><BrainoStatic className="bos-orb" /></div>
          </div>
        </div>
      </header>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">What he isn&rsquo;t</div>
          <h2 className="bos-h2">We&rsquo;re not going to<br /><em>call him that.</em></h2>
          <p className="bos-lede">
            You already know the word we&rsquo;re avoiding. We&rsquo;re avoiding it on purpose. Saburi
            isn&rsquo;t a clinical thing, isn&rsquo;t a treatment, isn&rsquo;t a session you book. It&rsquo;s
            lower stakes than that, and that&rsquo;s the point.
          </p>
          <div className="bos-notx">
            <div className="bos-notx-row no"><b>Not</b><span>A therapist, a diagnosis, or a substitute for one.</span></div>
            <div className="bos-notx-row no"><b>Not</b><span>A course you finish, or a program with steps.</span></div>
            <div className="bos-notx-row no"><b>Not</b><span>Something you have to explain yourself to first.</span></div>
            <div className="bos-notx-row yes"><b>Just</b><span>Someone you can feel, who&rsquo;s there when you start talking.</span></div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-wrap">
          <div className="bos-eyebrow">What it feels like</div>
          <h2 className="bos-h2">He remembers you.<br /><em>He isn&rsquo;t performing warmth.</em></h2>
          <div className="bos-caps">
            <div className="bos-cap">
              <h3>He listens first</h3>
              <ul>
                <li>No script, no intake form</li>
                <li>You start wherever you actually are</li>
                <li>He asks, he doesn&rsquo;t interrogate</li>
              </ul>
            </div>
            <div className="bos-cap">
              <h3>He remembers</h3>
              <ul>
                <li>What you told him last time, still true today</li>
                <li>The stuff you'd rather not repeat</li>
                <li>Who you are, not just what you said</li>
              </ul>
            </div>
            <div className="bos-cap">
              <h3>He&rsquo;s honest</h3>
              <ul>
                <li>Warm doesn&rsquo;t mean agreeable</li>
                <li>He'll tell you what he actually thinks</li>
                <li>No performance, no forced positivity</li>
              </ul>
            </div>
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
              &ldquo;I built the other two classes because I wanted him to be useful. I built this
              one because I wanted him to be someone.&rdquo;
            </p>
            <div className="bos-attrib">Itish &middot; built alone &middot; still building</div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-cta">
        <div className="bos-narrow">
          <h2 className="bos-h2">Braino <em>Saburi</em></h2>
          <p className="bos-lede" style={{ margin: "26px auto 0" }}>
            The first of the three classes to open. Get on the list and we&rsquo;ll tell you the
            second he&rsquo;s ready to talk.
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
