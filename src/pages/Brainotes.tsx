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
 * NOTES is empty on purpose. The shelf is built and waiting for real ones; a
 * library that opens with invented notes is a mockup pretending to be a
 * library, and the empty state has to be good anyway because every new label
 * starts there.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

type Note = {
  id: string;
  label: string;
  title: string;
  summary: string;
  author: string;
  minutes: number;
  updated: string;
};

/* Filled as notes arrive. Shaped now so adding one is only ever a row. */
const NOTES: Note[] = [];

export default function Brainotes() {
  const [labelId, setLabelId] = useState(LABELS[0].id);
  const label = LABELS.find((l) => l.id === labelId) || LABELS[0];
  const notes = useMemo(() => NOTES.filter((n) => n.label === labelId), [labelId]);

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
                <article className="bn-note">
                  <h3>{n.title}</h3>
                  <p className="bn-note-sum">{n.summary}</p>
                  <p className="bn-note-meta">
                    <span>{n.author}</span>
                    <i aria-hidden="true">·</i>
                    <span>{n.minutes} min</span>
                    <i aria-hidden="true">·</i>
                    <span>{n.updated}</span>
                  </p>
                </article>
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
