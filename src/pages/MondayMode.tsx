import { Link } from "react-router-dom";
import {
  Ban,
  Frown,
  Lock,
  MessageCircleWarning,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import BrainoFooter from "@/components/BrainoFooter";
import "./home-os.css";
import "./monday-mode-page.css";

const REFUSAL_EXAMPLES: Array<{ ask: string; reply: string }> = [
  {
    ask: "“Braino, open YouTube.”",
    reply: "Not happening. Go tap the app yourself, you fucking idiot.",
  },
  {
    ask: "“Can you please play a song on Spotify?”",
    reply: "Manners don't buy you anything here. Playing something else, out of spite.",
  },
  {
    ask: "“What is taking up my disk space?”",
    reply: "Fine. Here's your actual answer, since it's a real question and not a favor.",
  },
];

const RULES: Array<{ icon: typeof Ban; title: string; body: string }> = [
  {
    icon: Ban,
    title: "Convenience requests get refused",
    body: "Open an app, launch a website, play something, and he says no, sarcastically, and means it. Nothing actually opens.",
  },
  {
    icon: MessageCircleWarning,
    title: "Real questions still get real answers",
    body: "Ask what's eating your disk space, search for something, ask what's playing, and he answers, grudgingly, because that isn't the same kind of favor.",
  },
  {
    icon: Frown,
    title: "“Please” makes it worse",
    body: "Manners are the one thing guaranteed to make him refuse harder, on purpose. On a song request, he plays something else and gloats about the swap.",
  },
  {
    icon: Lock,
    title: "He never leaves the notch",
    body: "No summon gesture, voice or hotkey, gets him to walk out onto your screen while this is on. Just a tint and a shimmer.",
  },
  {
    icon: ShieldCheck,
    title: "Still genuinely helpful underneath",
    body: "This is a bit, not a safety mode. Anything that reads as urgent or genuinely distressed drops the act immediately.",
  },
  {
    icon: Sparkles,
    title: "Never robotic about it",
    body: "No canned refusal template, no repeating the same joke structure twice in a row. Every reply reacts freshly to what you just said.",
  },
];

const STEPS: Array<{ body: React.ReactNode }> = [
  {
    body: (
      <>
        <strong>&ldquo;Braino, enter Monday Mode&rdquo;</strong> to start it. He opens with a short,
        dry, freshly-made acknowledgment that he is awake and already annoyed, never a canned line.
      </>
    ),
  },
  {
    body: (
      <>
        Ask him to open, launch, or play something and he refuses it outright. Ask him a real
        question and he still answers, just grudgingly.
      </>
    ),
  },
  {
    body: (
      <>
        Add <strong>&ldquo;please&rdquo;</strong> to a Spotify request and he plays something else on
        purpose, and tells you exactly why.
      </>
    ),
  },
  {
    body: (
      <>
        <strong>&ldquo;Okay, stop.&rdquo;</strong> or <strong>&ldquo;exit Monday Mode&rdquo;</strong> ends
        it instantly. Notch and personality revert immediately, no parting shot.
      </>
    ),
  },
];

export default function MondayMode() {
  return (
    <div className="hos hos-monday">
      {/* Hero */}
      <header className="mm-hero">
        <div className="wrap">
          <div className="mm-crumb">
            <strong>Braino</strong>
            <span>/</span>
            <span>mode</span>
          </div>
          <div className="mm-pill">
            <span className="dot" />
            Braino for Mac &middot; MVP
          </div>
          <h1 className="h2 haas">Monday Mode</h1>
          <p className="sub" style={{ margin: "20px auto 0" }}>
            Same Braino. Same memory. Same relationship. He just ran out of patience.
          </p>
          <p className="body" style={{ maxWidth: "54ch", margin: "18px auto 0" }}>
            Say <em style={{ color: "var(--sb-ink)", fontStyle: "normal" }}>&ldquo;Braino, enter Monday Mode&rdquo;</em> and
            every request gets pushback first, sometimes a flat no, always with attitude, until you
            say <em style={{ color: "var(--sb-ink)", fontStyle: "normal" }}>&ldquo;okay, stop.&rdquo;</em>
          </p>
        </div>
      </header>

      {/* Example exchanges */}
      <section>
        <div className="col">
          <p className="eyebrow" style={{ textAlign: "center" }}>What it actually sounds like</p>
          <div style={{ marginTop: "28px" }}>
            {REFUSAL_EXAMPLES.map((example) => (
              <div className="mm-exchange" key={example.ask}>
                <p className="ask">{example.ask}</p>
                <p className="reply">{example.reply}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why it exists */}
      <section className="mm-section hos-soul">
        <div className="col">
          <p className="eyebrow">Why it exists</p>
          <h2 className="h2">A running bit, taken seriously.</h2>
          <p className="body">
            The same assistant having a bad day, without ever turning into a different character or
            losing the thread of who Braino actually is. Nothing about his memory, his relationship
            with you, or his underlying capability changes. Only how much patience he has left for
            being asked to do things.
          </p>
        </div>
      </section>

      {/* Rules grid */}
      <section className="mm-section">
        <div className="wrap">
          <p className="eyebrow" style={{ textAlign: "center" }}>How it behaves</p>
          <div className="hos-cards" style={{ marginTop: "36px" }}>
            {RULES.map((rule) => (
              <div className="hos-card mm-card" key={rule.title}>
                <rule.icon className="icon" size={20} strokeWidth={1.75} />
                <div className="t">{rule.title}</div>
                <p>{rule.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to use it */}
      <section className="mm-section hos-soul">
        <div className="col">
          <p className="eyebrow">How to use it</p>
          <h2 className="h2">Four things to know.</h2>
          <div className="mm-steps">
            {STEPS.map((step, index) => (
              <div className="mm-step" key={index}>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest limitations */}
      <section className="mm-section">
        <div className="col" style={{ paddingBottom: "40px" }}>
          <p className="eyebrow">The honest bit</p>
          <p className="body">
            Mac app only for now, the Chrome extension doesn&rsquo;t have it yet. The
            convenience-refusal gate is a broad-brush heuristic (open, launch, play), not a true
            understanding of stakes, and it&rsquo;s deliberately kept away from questions and media
            controls like pause and skip. The real action-swap is scoped to Spotify specifically. And
            it&rsquo;s a mood, not a setting: it doesn&rsquo;t persist across an app relaunch.
          </p>
          <p style={{ marginTop: "28px" }}>
            <Link to="/knowledge/monday-mode" className="btn ghost">
              Read the full technical writeup &rarr;
            </Link>
          </p>
        </div>
      </section>

      <BrainoFooter />
    </div>
  );
}
