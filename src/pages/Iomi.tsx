import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoStatic from "@/components/BrainoStatic";
import ClassThemeToggle, { useCoralTheme, CORAL_ACCENT } from "@/components/ClassThemeToggle";
import "./braino-classes.css";

/* ============================================================================
   /iomi — Braino Iomi, the OS class (formerly /brainos). Second of the three
   to open. Same repositioning as before: Braino stops being an assistant you
   open and becomes the layer you talk to — named the way an OS names itself,
   the OS, then the release. IOMI is not an acronym we're unpacking.
   ============================================================================ */

const CAPS: { title: string; items: string[] }[] = [
  {
    title: "Your machine",
    items: [
      "Organize the desktop by type, date or project",
      "Create, rename, move and delete folders",
      "Find any file by name, type or content",
      "Open files, PDFs, images, videos, folders",
      "Undo every file action he takes",
    ],
  },
  {
    title: "Your apps",
    items: [
      "Open and close any Mac app by name",
      "Write notes straight into Apple Notes",
      "Draft and send mail, resolving contacts",
      "Play, pause, skip and queue on Spotify",
      "Fall back to the website when there is no app",
    ],
  },
  {
    title: "Your screen",
    items: [
      "Know which app and window you are in",
      "Read what is visible and explain it",
      "Watch a task and tell you when it changes",
      "See you through the camera when invited",
      "Point at the thing he is talking about",
    ],
  },
];

const ACCENT = "#8ab4f8";

export default function Iomi() {
  const [coral, setCoral] = useCoralTheme();
  return (
    <div className={`bos${coral ? " coral-theme" : ""}`} style={{ ["--accent" as string]: coral ? CORAL_ACCENT : ACCENT }}>
      <ClassThemeToggle coral={coral} onToggle={() => setCoral((v) => !v)} />
      <IomiNotch variant="iomi" />

      <header className="bos-hero quote">
        <div className="bos-wrap">
          <div className="bos-hero-split">
            <div className="bos-hero-copy">
              <div className="bos-pill"><i />Braino Iomi &middot; the OS class</div>
              <h1 className="bos-qtitle">
                Say it once. <em>Then don&rsquo;t touch anything.</em>
              </h1>
              <p className="bos-qsub">
                He started as a brain in your browser. He grew into the layer you talk to. This is
                the release where you stop touching the machine.
              </p>
              <div className="bos-soon"><i />Coming soon</div>
            </div>
            <div className="bos-art"><BrainoStatic className="bos-orb" /></div>
          </div>
        </div>
      </header>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-narrow">
          <div className="bos-eyebrow">The directive</div>
          <h2 className="bos-h2">Every OS before this<br /><em>asked you to click.</em></h2>
          <p className="bos-lede">
            Find the thing, open the thing, click the thing. Iomi removes the finding, the opening
            and the clicking. You say what you want. It is already happening.
          </p>
          <p className="bos-lede">
            He lives in the notch, so he is never a window you manage. He wakes on your voice, so he
            is never an app you launch.
          </p>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-sec">
        <div className="bos-wrap">
          <div className="bos-eyebrow">What he actually does</div>
          <h2 className="bos-h2">Everything you were<br /><em>going to do yourself.</em></h2>
          <div className="bos-caps">
            {CAPS.map((c) => (
              <div className="bos-cap" key={c.title}>
                <h3>{c.title}</h3>
                <ul>{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
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
              &ldquo;I built this so I would not have to touch my MacBook. That was the whole
              ambition. Then it got good enough that I stopped believing a guy sitting at home
              made it.&rdquo;
            </p>
            <div className="bos-attrib">Itish &middot; built alone &middot; still building</div>
          </div>
        </div>
      </section>

      <hr className="bos-rule" />

      <section className="bos-cta">
        <div className="bos-narrow">
          <h2 className="bos-h2">Braino <em>Iomi</em></h2>
          <p className="bos-lede" style={{ margin: "26px auto 0" }}>
            The OS class. On your Mac, in your browser, in the notch &mdash; coming after Saburi.
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
