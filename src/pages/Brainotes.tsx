/* Brainotes — a shared, public library of notes.
 *
 * The name is the whole idea and it needs no sentence explaining it: BRAINOTES
 * is "Braino" and "notes" sharing one "no", so the wordmark sets that hinge in
 * the accent and lets the reader find both words themselves. A tagline that
 * says "Braino + notes!" would be explaining a joke.
 *
 * Notes are grouped by LABEL rather than by author or date, because the label
 * is what somebody is actually looking for — they arrive wanting the Forge
 * shelf, not wanting "recent uploads". Labels are therefore the navigation, not
 * a filter bolted onto a feed.
 *
 * NOTES currently holds DEMO rows so the layout can be judged with weight on
 * it. They are invented, names included, and must be replaced before this is
 * shown to anyone outside the team — a public library with made-up authors is a
 * lie about who wrote what. The empty state below still matters regardless,
 * because every new shelf opens on it.
 */

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/apple.css";
import "./brainotes.css";

type Label = {
  id: string;
  name: string;
  blurb: string;
  accent: "coral" | "blue" | "green" | "violet" | "amber";
  open: boolean;
};

const LABELS: Label[] = [
  {
    id: "forge",
    name: "Forge",
    blurb: "Building things, and what it costs to.",
    accent: "coral",
    open: true,
  },
];

/* Blocks rather than a markdown string. A library page has to render other
   people's writing safely, and parsing markdown into HTML is the shortest road
   to putting somebody's <script> on a public page. A closed set of block kinds
   can only ever produce the elements it knows about. */
type Block =
  | { p: string }
  | { h: string }
  | { quote: string }
  | { list: string[] };

type Note = {
  id: string;
  slug: string;            // the URL, so a note can be sent to someone
  label: string;
  title: string;
  summary: string;
  author: string;
  minutes: number;
  updated: string;
  body: Block[];
};

/* DEMO CONTENT — placeholders so the shelf can be judged with weight on it.
   Every one of these is invented, names included. Replace the array wholesale
   when the real Forge notes arrive; do not ship this list to anyone outside the
   team, because a public library with made-up authors on it is a lie about who
   wrote what. */
const NOTES: Note[] = [
  {
    id: "f1",
    slug: "eight-interviews-zero-cards",
    label: "forge",
    title: "Eight interviews. Eight yeses. Zero cards.",
    summary: "Everyone had the problem and described it unprompted. Nobody reached for a wallet. What we changed after, and the question we should have asked in interview one.",
    author: "Itish Pande",
    minutes: 9,
    updated: "Sept 2026",
    body: [
      {"p": "Eight people sat down with us. Eight of them described the problem before we finished asking about it, which we took as the strongest signal we had. It was not a signal about anything except how common the problem is."},
      {"h": "What we actually heard"},
      {"p": "Every interview had the same shape. Ten minutes of real frustration, specific and unprompted. Then a question about price, and a pause, and a sentence that began with the word \u201cHonestly\u201d."},
      {"quote": "Honestly I would probably just keep doing it the annoying way."},
      {"p": "We wrote that down eight times and read it as politeness. It was not politeness. It was the answer."},
      {"h": "The question we should have opened with"},
      {"p": "Not \u201cwould you use this\u201d. Not \u201cwould you pay for this\u201d, which people answer about a hypothetical version of themselves who is more organised than they are. The question is what they are paying for today to avoid the problem, and if the answer is nothing, the interview is already over."},
      {"list": ["Pain does not imply budget. It implies a workaround they have already made peace with.", "A yes about a product you have not built is a yes about your description, not your product.", "The only interview that counts is the one where money moves."]},
      {"p": "We changed the script after the eighth. The next round was shorter, worse to sit through, and far more useful."},
    ],
  },
  {
    id: "f2",
    slug: "the-demo-broke-on-stage",
    label: "forge",
    title: "The demo broke on stage. Twice.",
    summary: "A live failure in front of the room, the actual root cause, and why rehearsing the happy path is how you guarantee it.",
    author: "Itish Pande",
    minutes: 6,
    updated: "Aug 2026",
    body: [
      {"p": "It failed in the first thirty seconds, recovered, and failed again on the closing beat. Both times on the one thing we had run more than anything else."},
      {"h": "What went wrong"},
      {"p": "The room wifi was on a captive portal. Every rehearsal had been on our own network, so the first request had never once had to survive a redirect it did not expect. It did not."},
      {"p": "The second failure was ours entirely. The recovery path we had written for the first failure assumed the session was still open. It was not, and nothing said so."},
      {"h": "The part worth keeping"},
      {"p": "Rehearsing the happy path is not practice. It is a way of becoming confident about the one sequence of events that will not happen. We now rehearse with the network off, with permissions revoked, and with a cold machine."},
      {"quote": "If the demo has never failed in rehearsal, it has not been rehearsed."},
    ],
  },
  {
    id: "f3",
    slug: "deleting-three-weeks",
    label: "forge",
    title: "Deleting three weeks of work in one afternoon",
    summary: "Team mode was finished, tested and shipped. It made the product worse. Notes on how we decided, and how long it took to admit it.",
    author: "Bhaskar M",
    minutes: 11,
    updated: "Aug 2026",
    body: [
      {"p": "It worked. That was the problem. A broken feature gets removed in an hour; a finished one gets defended for a month."},
      {"h": "How we knew"},
      {"p": "Nobody used it, which we explained away twice. Then people started using the product less overall, and the only thing that had changed was that every screen now had a second mode on it."},
      {"list": ["Three weeks of work is a cost you have already paid. It is not a reason.", "\u201cWe can always remove it later\u201d is how it never gets removed.", "The question is not whether it is good. It is whether the product is better with it than without."]},
      {"h": "How long it took"},
      {"p": "Nine days between the first person saying it out loud and the commit. Most of that was not analysis. It was working up to it."},
    ],
  },
  {
    id: "f4",
    slug: "cannot-price-what-you-cannot-name",
    label: "forge",
    title: "You cannot price what you cannot name",
    summary: "Three months of pricing pages that all failed for the same reason. The fix was not a number.",
    author: "Ananya Rao",
    minutes: 7,
    updated: "Jul 2026",
    body: [
      {"p": "Four pricing pages in three months. We changed the numbers, the tiers, the order of the columns, and the word on the button. None of it moved."},
      {"h": "The actual problem"},
      {"p": "People could not say what they were buying. When somebody cannot finish the sentence \u201cI pay for the thing that \u2026\u201d, no number is going to feel right, because there is nothing for it to be the price of."},
      {"quote": "It is like \u2026 an assistant? But also notes? I am not sure what I am picking between."},
      {"p": "That sentence killed four pricing pages and we read it as confusion about the tiers."},
      {"h": "What changed"},
      {"p": "We stopped editing the page and wrote one line describing what he does. The pricing page after that was the simplest of the five and the first that worked."},
    ],
  },
  {
    id: "f5",
    slug: "mentor-feedback-is-a-spec-change",
    label: "forge",
    title: "Mentor feedback is a spec change, not an opinion",
    summary: "How we started treating reviews as requirements, and what stopped going in circles once we did.",
    author: "Itish Pande",
    minutes: 4,
    updated: "Jul 2026",
    body: [
      {"p": "For a while we treated review sessions as input to consider. The result was that every session reopened the previous one, and the deck went sideways for six weeks."},
      {"h": "The change"},
      {"p": "Feedback now leaves the room as a written change, with a line number and an owner, or it does not leave the room at all. If we disagree we argue in the session, not afterwards by quietly not doing it."},
      {"list": ["Write it down in the room, in their words, not yours.", "Disagree immediately or accept it fully. Nodding and relitigating later is the expensive option.", "One owner per change, or it belongs to nobody."]},
      {"p": "Six weeks of circling stopped the week we started doing this."},
    ],
  },
  {
    id: "f6",
    slug: "two-months-of-decks",
    label: "forge",
    title: "Two months of decks before one line of code",
    summary: "What the delay actually bought, what it cost, and the honest split between the two.",
    author: "Dev Patel",
    minutes: 8,
    updated: "Jun 2026",
    body: [
      {"p": "Two months of positioning, decks and conversations before anything was built. It is easy to tell this as a cautionary tale and easy to tell it as wisdom. It was some of both."},
      {"h": "What it bought"},
      {"p": "We deleted three product ideas on paper that would each have cost a month in code. That is genuinely cheaper, and nobody talks about the features that never got built because the deck killed them."},
      {"h": "What it cost"},
      {"p": "Two months of answers from people reacting to a description rather than a thing. Those answers were warmer and less true, and we built the first version to please them."},
      {"quote": "A deck gets you opinions. A build gets you behaviour."},
      {"p": "The honest split: about three weeks of it was worth doing."},
    ],
  },
];


/* The reader.
 *
 * On its own URL rather than a panel or an expanding row, because a public
 * library whose notes cannot be sent to somebody is not public in any way that
 * matters. /brainotes/<slug> is the note.
 *
 * Set narrow and large. The measure is about 62 characters because that is
 * where prose stops being work to read, and everything else on the page is
 * removed rather than styled — there is no sidebar, no related list, no share
 * row. Somebody came here to read one thing. */
function Reader({ note }: { note: Note }) {
  const label = LABELS.find((l) => l.id === note.label) || LABELS[0];
  const others = NOTES.filter((n) => n.label === note.label && n.id !== note.id).slice(0, 3);

  return (
    <main className={`apple bn bn-read ac-${label.accent}`}>
      <div className="bn-read-inner">
        <Link className="bn-back" to="/brainotes">
          <span aria-hidden="true">&larr;</span> {label.name}
        </Link>

        <header className="bn-read-head">
          <h1>{note.title}</h1>
          <p className="bn-read-meta">
            <span>{note.author}</span>
            <i aria-hidden="true">·</i>
            <span>{note.minutes} min</span>
            <i aria-hidden="true">·</i>
            <span>{note.updated}</span>
          </p>
        </header>

        <article className="bn-body">
          {note.body.map((block, i) => {
            if ("h" in block) return <h2 key={i}>{block.h}</h2>;
            if ("quote" in block) return <blockquote key={i}>{block.quote}</blockquote>;
            if ("list" in block) {
              return (
                <ul key={i}>
                  {block.list.map((item, n) => <li key={n}>{item}</li>)}
                </ul>
              );
            }
            return <p key={i}>{block.p}</p>;
          })}
        </article>

        {others.length > 0 && (
          <nav className="bn-more" aria-label="More on this shelf">
            <h2>More on {label.name}</h2>
            <ul>
              {others.map((n) => (
                <li key={n.id}>
                  <Link to={`/brainotes/${n.slug}`}>
                    <span className="bn-more-title">{n.title}</span>
                    <span className="bn-more-meta">{n.author} · {n.minutes} min</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </main>
  );
}

/* A link somebody was sent that no longer resolves should offer the shelf, not
   a dead end. */
function NotFound() {
  return (
    <main className="apple bn bn-read ac-coral">
      <div className="bn-read-inner bn-missing">
        <h1>That note is not here.</h1>
        <p>It may have been renamed, or never made it onto the shelf.</p>
        <Link className="bn-primary" to="/brainotes">Back to the library</Link>
      </div>
    </main>
  );
}

export default function Brainotes() {
  const { slug } = useParams();
  const [labelId, setLabelId] = useState(LABELS[0].id);
  const label = LABELS.find((l) => l.id === labelId) || LABELS[0];
  const notes = useMemo(() => NOTES.filter((n) => n.label === labelId), [labelId]);

  if (slug) {
    const note = NOTES.find((n) => n.slug === slug);
    return note ? <Reader note={note} /> : <NotFound />;
  }

  return (
    <main className={`apple bn ac-${label.accent}`}>
      <header className="bn-hero">
        <p className="apple-eyebrow">A public library</p>

        {/* The hinge, set rather than explained. */}
        <h1 className="bn-mark" aria-label="Brainotes">
          <span>Brai</span><em>no</em><span>tes</span>
        </h1>

        <p className="bn-lede">
          Notes people actually wrote, kept where other people can read them.
          Shelved by subject, open to anyone, free to take.
        </p>
      </header>

      {/* ── The shelves ─────────────────────────────────────────────────── */}
      <section className="bn-shelves" aria-label="Shelves">
        <div className="bn-shelf-row">
          {LABELS.map((l) => (
            <button
              key={l.id}
              className={"bn-shelf" + (l.id === labelId ? " is-on" : "")}
              onClick={() => setLabelId(l.id)}
              aria-pressed={l.id === labelId}
            >
              <span className="bn-shelf-name">{l.name}</span>
              <span className="bn-shelf-blurb">{l.blurb}</span>
              <span className="bn-shelf-count">
                {NOTES.filter((n) => n.label === l.id).length || "—"}
              </span>
            </button>
          ))}

          {/* Honest about the shape of the thing: one shelf today, room built
              for the rest. An empty row of greyed placeholders would promise
              subjects nobody has chosen yet. */}
          <div className="bn-shelf is-next" aria-hidden="true">
            <span className="bn-shelf-name">More shelves</span>
            <span className="bn-shelf-blurb">Opened as the notes arrive.</span>
          </div>
        </div>
      </section>

      {/* ── The shelf itself ────────────────────────────────────────────── */}
      <section className="bn-stack" aria-live="polite">
        <div className="bn-stack-head">
          <h2 className="bn-stack-title">{label.name}</h2>
          <p className="bn-stack-blurb">{label.blurb}</p>
        </div>

        {notes.length > 0 ? (
          <ul className="bn-notes">
            {notes.map((n) => (
              <li key={n.id}>
                <Link className="bn-note" to={`/brainotes/${n.slug}`}>
                  <h3>{n.title}</h3>
                  <p className="bn-note-sum">{n.summary}</p>
                  <p className="bn-note-meta">
                    <span>{n.author}</span>
                    <i aria-hidden="true">·</i>
                    <span>{n.minutes} min</span>
                    <i aria-hidden="true">·</i>
                    <span>{n.updated}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          /* Every shelf starts here, so this screen matters more than it looks
             like it does. It says what the shelf is FOR rather than apologising
             for being empty. */
          <div className="bn-empty">
            <p className="bn-empty-lead">Nothing on this shelf yet.</p>
            <p className="bn-empty-sub">
              {label.name} is for {label.blurb.charAt(0).toLowerCase() + label.blurb.slice(1)}{" "}
              The first notes are being written up now.
            </p>
          </div>
        )}
      </section>

      {/* ── Adding yours ────────────────────────────────────────────────── */}
      <section className="bn-give">
        <div className="bn-give-inner">
          <h2 className="bn-give-title">Put yours on the shelf.</h2>
          <p className="bn-give-sub">
            Anything you have written and would hand to someone learning the same
            thing. It keeps your name on it.
          </p>
          <div className="bn-give-actions">
            <button className="bn-primary" type="button">Add a note</button>
            <Link className="bn-secondary" to="/">What Braino is</Link>
          </div>
          <p className="bn-give-fine">
            Read as it is written on the web today. The Mac app comes after, and
            the shelf is the same one.
          </p>
        </div>
      </section>
    </main>
  );
}
