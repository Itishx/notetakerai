import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BrainoDocOverlay, { type BrainoDoc } from "@/components/BrainoDocOverlay";
import { listDocs, createNote, deleteDoc, preview, type DocSummary, type DocKind } from "@/lib/brainotes";
import "@/components/braino-doc.css";
import "./brainotes.css";

/* Brainotes — the shelf.
 *
 * Everything he wrote and everything you started, in one place, newest first.
 * Opening one does not navigate: the document comes up over the shelf, because
 * that is what he is. Closing it puts you back where you were, with your scroll
 * position intact, which is the whole difference between a layer and a page.
 */

const FILTERS: { id: "all" | DocKind; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "note", label: "Notes" },
  { id: "lecture", label: "Lectures" },
  { id: "research", label: "Research" },
];

const KIND_LABEL: Record<string, string> = {
  research: "Researched",
  lecture: "Lecture",
  note: "Note",
};

const dayLabel = (iso: string | null, fallback: string) => {
  const d = new Date(iso || fallback);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export default function BrainotesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [filter, setFilter] = useState<"all" | DocKind>("all");
  const [query, setQuery] = useState("");
  const [openDoc, setOpenDoc] = useState<BrainoDoc | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Brainotes"; }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setDocs(await listDocs(user.id));
    setState("ready");
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  /* The card carries only enough to draw itself. The body is fetched when you
     actually open one, so a shelf of two hundred notes is not two hundred
     documents in memory. */
  const open = useCallback(async (slug: string) => {
    const { data } = await (supabase as any)
      .from("braino_docs")
      .select("id, slug, title, question, overview, markdown, sources, questions_asked, word_count, is_public, created_at, user_id")
      .eq("slug", slug)
      .maybeSingle();
    if (data) setOpenDoc(data as BrainoDoc);
  }, []);

  const startNote = useCallback(async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const made = await createNote(user.id, { title: "Untitled note", kind: "note" });
      await load();
      await open(made.slug);
    } finally {
      setBusy(false);
    }
  }, [user, busy, load, open]);

  const remove = useCallback(async (doc: DocSummary) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    await deleteDoc(doc.id);
    await load();
  }, [load]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return docs.filter((doc) => {
      if (filter !== "all" && doc.kind !== filter) return false;
      if (!needle) return true;
      return `${doc.title} ${doc.subject || ""} ${doc.overview || ""}`.toLowerCase().includes(needle);
    });
  }, [docs, filter, query]);

  if (!loading && !user) {
    return (
      <div className="bn-page">
        <div className="bn-empty">
          <h1>Brainotes</h1>
          <p>Your notes, your lectures, and everything he researched. Sign in to open them.</p>
          <Link to="/auth" className="bn-btn is-solid">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bn-page">
      <header className="bn-top">
        <div className="bn-top-inner">
          <Link to="/" className="bn-mark"><i />braino</Link>
          <div className="bn-search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your notes"
              aria-label="Search your notes"
            />
          </div>
          <button type="button" className="bn-btn is-solid" onClick={startNote} disabled={busy}>
            {busy ? "Making it…" : "New note"}
          </button>
        </div>
      </header>

      <main className="bn-main">
        <div className="bn-head">
          <h1 className="bn-h1">Brainotes</h1>
          <p className="bn-lede">
            Class notes, lecture write-ups and everything he researched. One shelf, because they are
            the same thing: something written down that you can add to.
          </p>
          <div className="bn-filters">
            {FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`bn-tab${filter === tab.id ? " is-on" : ""}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
                <em>{tab.id === "all" ? docs.length : docs.filter((d) => d.kind === tab.id).length}</em>
              </button>
            ))}
          </div>
        </div>

        {state === "loading" && <div className="bn-empty"><p>Getting your shelf…</p></div>}

        {state === "ready" && shown.length === 0 && (
          <div className="bn-empty">
            <p>{query.trim() ? "Nothing here matches that." : "Nothing on the shelf yet."}</p>
            {!query.trim() && (
              <>
                <p className="bn-empty-note">
                  Start a note for today's class, or ask him to research something and the document
                  lands here on its own.
                </p>
                <button type="button" className="bn-btn is-solid" onClick={startNote}>Start a note</button>
              </>
            )}
          </div>
        )}

        <div className="bn-grid">
          {shown.map((doc) => (
            <article key={doc.id} className={`bn-card is-${doc.kind}`}>
              <button type="button" className="bn-card-open" onClick={() => open(doc.slug)}>
                <div className="bn-card-top">
                  <span className="bn-kind">{KIND_LABEL[doc.kind] || "Note"}</span>
                  <span className="bn-when">{dayLabel(doc.happened_on, doc.created_at)}</span>
                </div>
                <h2>{doc.title}</h2>
                {doc.subject && <p className="bn-subject">{doc.subject}</p>}
                <p className="bn-preview">{doc.overview || "Nothing written yet."}</p>
                <div className="bn-meta">
                  {doc.word_count ? <span>{doc.word_count.toLocaleString()} words</span> : <span>Empty</span>}
                  {doc.sources?.length ? <span>{doc.sources.length} sources</span> : null}
                  {doc.is_public && <span className="bn-shared">Shared</span>}
                </div>
              </button>
              <button
                type="button"
                className="bn-remove"
                onClick={() => remove(doc)}
                aria-label={`Delete ${doc.title}`}
                title="Delete"
              >
                ×
              </button>
            </article>
          ))}
        </div>
      </main>

      {openDoc && (
        <BrainoDocOverlay
          doc={openDoc}
          onClose={() => { setOpenDoc(null); void load(); }}
        />
      )}
    </div>
  );
}
