import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Markdown } from "@/components/BrainoMarkdown";
import "./braino-doc.css";

/* A document Braino wrote, laid over whatever you were doing.
 *
 * The same component is the page at /d/:slug and the overlay that opens from
 * the notch, because they are the same thing: he is a layer over your screen,
 * not a place you navigate to. `embedded` is the only difference, and it just
 * drops the dark scrim when the document is already the whole page.
 *
 * Reading is the default. Editing is a mode you enter, so a stray keystroke on
 * a shared link cannot rewrite the body. Comments are a separate table, which
 * is what lets someone with the link say something without being able to
 * change what it says.
 */

export type DocSource = { title: string; url: string; snippet?: string };

export type BrainoDoc = {
  id: string;
  slug: string;
  title: string;
  question: string | null;
  markdown: string;
  sources: DocSource[];
  questions_asked?: string[];
  is_public: boolean;
  created_at: string;
  user_id: string;
};

type DocComment = {
  id: string;
  body: string;
  author_name: string | null;
  resolved: boolean;
  created_at: string;
};

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

const host = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

export default function BrainoDocOverlay({
  doc,
  embedded = false,
  onClose,
}: {
  doc: BrainoDoc;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const mine = Boolean(user && user.id === doc.user_id);

  const [markdown, setMarkdown] = useState(doc.markdown);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc.markdown);
  const [isPublic, setIsPublic] = useState(doc.is_public);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [comments, setComments] = useState<DocComment[]>([]);
  const [note, setNote] = useState("");

  const say = useCallback((message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash((current) => (current === message ? null : current)), 2600);
  }, []);

  /* Escape closes it, the way every overlay on a Mac does. Not when it is the
     whole page, where there is nothing to close back to. */
  useEffect(() => {
    if (embedded || !onClose) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !editing) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [embedded, onClose, editing]);

  const loadComments = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("braino_doc_comments")
      .select("id, body, author_name, resolved, created_at")
      .eq("doc_id", doc.id)
      .order("created_at", { ascending: true });
    setComments((data as DocComment[]) || []);
  }, [doc.id]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  const save = useCallback(async () => {
    if (!mine) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("braino_docs")
      .update({ markdown: draft, edited_at: new Date().toISOString() })
      .eq("id", doc.id);
    setBusy(false);
    if (error) { say("That did not save."); return; }
    setMarkdown(draft);
    setEditing(false);
    say("Saved.");
  }, [mine, draft, doc.id, say]);

  const share = useCallback(async () => {
    const link = `${window.location.origin}/d/${doc.slug}`;
    /* Turning the link on and copying it are one action: a copied link that
       nobody else can open is the most annoying possible outcome. */
    if (mine && !isPublic) {
      setBusy(true);
      const { error } = await (supabase as any).from("braino_docs").update({ is_public: true }).eq("id", doc.id);
      setBusy(false);
      if (error) { say("Could not share it."); return; }
      setIsPublic(true);
    }
    try {
      await navigator.clipboard.writeText(link);
      say("Link copied.");
    } catch {
      say(link);
    }
  }, [mine, isPublic, doc.id, doc.slug, say]);

  const addComment = useCallback(async () => {
    const body = note.trim();
    if (!body) return;
    setBusy(true);
    const { error } = await (supabase as any).from("braino_doc_comments").insert({
      doc_id: doc.id,
      user_id: user?.id ?? null,
      author_name: (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Someone",
      body,
    });
    setBusy(false);
    if (error) { say("Comment did not go through."); return; }
    setNote("");
    await loadComments();
  }, [note, doc.id, user, loadComments, say]);

  const resolve = useCallback(async (id: string, resolved: boolean) => {
    if (!mine) return;
    await (supabase as any).from("braino_doc_comments").update({ resolved }).eq("id", id);
    await loadComments();
  }, [mine, loadComments]);

  const open = useMemo(() => comments.filter((c) => !c.resolved).length, [comments]);

  const sheet = (
    <div className="bd-sheet">
      <header className="bd-bar">
        <div className="bd-who">
          <span className="bd-dot" aria-hidden />
          <div>
            <b>Braino</b>{" "}
            <span>
              researched this{doc.created_at ? ` · ${when(doc.created_at)}` : ""}
              {doc.sources?.length ? ` · ${doc.sources.length} sources` : ""}
            </span>
          </div>
        </div>

        {flash && <span className="bd-flash">{flash}</span>}

        {mine && !editing && (
          <button type="button" className="bd-act" onClick={() => { setDraft(markdown); setEditing(true); }}>
            Edit
          </button>
        )}
        {mine && editing && (
          <>
            <button type="button" className="bd-act is-quiet" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="bd-act is-on" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        )}
        {!editing && (
          <button type="button" className={`bd-act${isPublic ? " is-on" : ""}`} onClick={share} disabled={busy}>
            {isPublic ? "Copy link" : "Share"}
          </button>
        )}
        {!embedded && onClose && (
          <button type="button" className="bd-act is-quiet" onClick={onClose} aria-label="Close">Close</button>
        )}
      </header>

      <div className="bd-body">
        <p className="bd-eyebrow">Brainotes</p>
        <h1 className="bd-title">{doc.title}</h1>
        {doc.question && <p className="bd-question">You asked: {doc.question}</p>}
        <hr className="bd-rule" />

        {editing ? (
          <textarea
            className="bd-edit"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck
            autoFocus
          />
        ) : (
          <div className="bd-prose"><Markdown text={markdown} /></div>
        )}

        {!editing && doc.sources?.length > 0 && (
          <section className="bd-sources">
            <h3>Where this came from</h3>
            <p>Every claim above should be reachable here. If it is not in this list, he did not read it.</p>
            {doc.sources.map((source) => (
              <a key={source.url} className="bd-src" href={source.url} target="_blank" rel="noreferrer">
                <b>{source.title}</b>
                <span>{host(source.url)}</span>
                {source.snippet && <em>{source.snippet}</em>}
              </a>
            ))}
          </section>
        )}

        {!editing && (
          <section className="bd-comments">
            <h3>Comments{open ? ` · ${open} open` : ""}</h3>
            {comments.map((comment) => (
              <div key={comment.id} className={`bd-comment${comment.resolved ? " is-resolved" : ""}`}>
                <div className="bd-comment-head">
                  <b>{comment.author_name || "Someone"}</b>
                  <time>{when(comment.created_at)}</time>
                  {mine && (
                    <button
                      type="button"
                      className="bd-act is-quiet"
                      onClick={() => resolve(comment.id, !comment.resolved)}
                    >
                      {comment.resolved ? "Reopen" : "Resolve"}
                    </button>
                  )}
                </div>
                <p>{comment.body}</p>
              </div>
            ))}
            <div className="bd-comment-box">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void addComment(); }}
                placeholder="Leave a note on this"
                aria-label="Leave a comment"
              />
              <button type="button" className="bd-act" onClick={addComment} disabled={busy || !note.trim()}>
                Comment
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );

  if (embedded) return <div className="bd-scrim">{sheet}</div>;
  return (
    <div className="bd-scrim" role="dialog" aria-modal="true" aria-label={doc.title}>
      {sheet}
    </div>
  );
}
