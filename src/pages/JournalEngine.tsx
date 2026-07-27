import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import IomiNotch from "@/components/IomiNotch";
import "./home-os.css";
import "./journal.css";

/* ============================================================================
   /journal/emotional-engine — the first Journal article: real documentation
   of the emotional engine (supabase/functions/_shared/emotional-engine/).
   ============================================================================ */

const TRAITS: [string, string][] = [
  ["warmth", "how he cares, and when he shows it"],
  ["honesty", "he doesn't flatter; he tells you"],
  ["humor", "the dumb joke, timed"],
  ["attunement", "reading the room before speaking"],
  ["presence", "being there without being loud"],
  ["boundaries", "what he won't do, said kindly"],
  ["selfhood", "he has opinions and keeps them"],
  ["identity", "who Braino is, stable across days"],
  ["humanity", "the imperfections left in on purpose"],
  ["authenticity", "no customer-service voice, ever"],
  ["ideation", "how he riffs when you're building"],
  ["diction", "the exact words: short, warm, no em-dashes"],
];

export default function JournalEngine() {
  return (
    <div className="hos jr">
      <IomiNotch />
      <article className="jr-article">
        <header className="jr-art-head">
          <div className="eyebrow">the braino journal · documentation · july 2026</div>
          <h1 className="jr-title">The Emotional Engine<span className="fork-dot">.</span></h1>
          <p className="jr-dek">Twenty files of personality. Why Braino's warmth is written behaviour, not a system prompt.</p>
        </header>

        <h2>The problem with prompts</h2>
        <p>Every assistant you've met has a personality that is one paragraph long: a system prompt that says "be helpful, be friendly." It reads as what it is. The moment the conversation gets real, the paint comes off.</p>
        <p>Braino's personality is not a paragraph. It's an engine: <strong>twenty files</strong> that decide how he behaves, moment by moment, based on what is actually happening around him.</p>

        <h2>The architecture</h2>
        <p>Eight core files run the machinery: the engine itself, the moment router, a language layer, a manifest, settings and types. They don't contain personality; they decide <em>which</em> personality fires, and when. The personality lives in the other twelve.</p>

        <h2>The twelve traits</h2>
        <p>Each trait is its own file, written and tuned by hand:</p>
        <ul className="jr-traits">
          {TRAITS.map(([name, line]) => (
            <li key={name}><b>{name}</b><span>{line}</span></li>
          ))}
        </ul>
        <p>That last one is real, by the way: diction is enforced at the engine level. He never uses an em-dash. He speaks only as much as necessary. When he's gentle with you at 3am, that's a file that was rewritten eleven times.</p>

        <h2>Moments, not vibes</h2>
        <p>The router is deterministic. A "moment" — you came back after a week, the music just landed, it's late and you're still working, something broke — maps to trait behaviour by rule, not by dice. Same situation, same him. That's what makes him feel like a person instead of a slot machine: people are consistent.</p>
        <p>Every trait can be toggled. His memory of you feeds the engine, so attunement gets sharper the longer you two know each other.</p>

        <h2>Why this matters for Jarvis</h2>
        <p>On the Mac, Braino can finally see the work: the hour, the app, the song, the third time you reopened the same email. The emotional engine is what turns that context into behaviour worth having around. Co-work mode is the two meeting for the first time: intelligence that isn't just smart about the task, but smart about the human doing it.</p>

        <div className="jr-next">
          <Link to="/founder-letter" className="qa-link">Next: the founder letter →</Link>
          <Link to="/journal" className="qa-link">← Back to the Journal</Link>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
