import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Markdown } from "@/components/BrainoMarkdown";
import { uploadDocImage } from "@/lib/brainotes";
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
  overview?: string | null;
  markdown: string;
  sources: DocSource[];
  questions_asked?: string[];
  word_count?: number | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
};

const THEME_KEY = "braino.doc.theme";

/* Follows the system by default and remembers a deliberate choice. Reading is
   the whole job here, so the one setting that matters is the one that decides
   whether it hurts to look at. */
function useDocTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* private mode */ }
    return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  /* The page behind the sheet has to follow, or a dark document sits in a pale
     frame. Stamped on the root so the page, the scrim and anything else can
     read it without being handed the state. */
  useEffect(() => {
    document.documentElement.dataset.bdTheme = theme;
    return () => { delete document.documentElement.dataset.bdTheme; };
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
      return next;
    });
  }, []);
  return { theme, toggle };
}

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

/* One mark per site he read, not per citation: eleven links to the same paper
   is one source as far as a reader glancing at this is concerned. */
function bubblesFrom(sources: DocSource[]) {
  const seen = new Map<string, { domain: string; url: string }>();
  for (const source of sources) {
    const domain = host(source.url);
    if (!domain || seen.has(domain)) continue;
    seen.set(domain, { domain, url: source.url });
  }
  return [...seen.values()];
}

/* DuckDuckGo rather than Google's favicon service: same job, and it does not
   hand every reader of a shared document to an ad network. */
const faviconFor = (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

const countWords = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

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
  const { theme, toggle } = useDocTheme();

  const [markdown, setMarkdown] = useState(doc.markdown);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc.markdown);
  const [isPublic, setIsPublic] = useState(doc.is_public);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const [comments, setComments] = useState<DocComment[]>([]);
  const [note, setNote] = useState("");
  const editRef = useRef<HTMLTextAreaElement | null>(null);

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

  /* A photograph of a slide, dropped straight where the cursor is.
   *
   * In a lecture theatre the picture arrives before the words do: you shoot the
   * slide, then write underneath it. So paste and drop both work, the upload
   * happens while you keep typing, and the markdown lands at the caret rather
   * than at the end of the document. */
  const insertImage = useCallback(async (file: File) => {
    if (!mine || !user) return;
    const field = editRef.current;
    const at = field ? field.selectionStart : draft.length;
    const placeholder = `\n![uploading ${file.name}…]()\n`;
    setDraft((current) => current.slice(0, at) + placeholder + current.slice(at));
    setBusy(true);
    try {
      const url = await uploadDocImage(user.id, file);
      const markdownImage = `\n![](${url})\n`;
      setDraft((current) => current.replace(placeholder, markdownImage));
      say("Image added.");
    } catch (error) {
      /* Take the placeholder back out. A note reading "uploading…" forever is
         worse than a note with no picture in it. */
      setDraft((current) => current.replace(placeholder, ""));
      say(error instanceof Error ? error.message : "That image did not upload.");
    } finally {
      setBusy(false);
    }
  }, [mine, user, draft.length, say]);

  const onPasteOrDrop = useCallback((files: FileList | null) => {
    const images = [...(files || [])].filter((file) => file.type.startsWith("image/"));
    for (const image of images) void insertImage(image);
    return images.length > 0;
  }, [insertImage]);

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
  const bubbles = useMemo(() => bubblesFrom(doc.sources || []), [doc.sources]);
  /* The stored count is what he wrote; recount only if an edit changed it. */
  const words = useMemo(
    () => (markdown === doc.markdown && doc.word_count ? doc.word_count : countWords(markdown)),
    [markdown, doc.markdown, doc.word_count],
  );

  const sheet = (
    <div className={`bd-sheet${theme === "dark" ? " is-dark" : ""}`}>
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

        <button
          type="button"
          className="bd-act is-quiet"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}
          title={theme === "dark" ? "Light" : "Dark"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>

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

        {!editing && doc.overview && (
          <div className="bd-overview">
            <b>In short</b>
            {doc.overview}
          </div>
        )}

        {!editing && (
          <>
            <div className="bd-stats">
              <span className="bd-stat"><b>{words.toLocaleString()}</b> words</span>
              {bubbles.length > 0 && <span className="bd-stat"><b>{bubbles.length}</b> {bubbles.length === 1 ? "site" : "sites"} read</span>}
              {doc.sources?.length > 0 && <span className="bd-stat"><b>{doc.sources.length}</b> sources</span>}
              {doc.questions_asked?.length ? (
                <span className="bd-stat"><b>{doc.questions_asked.length}</b> lines of enquiry</span>
              ) : null}
            </div>

            {bubbles.length > 0 && (
              <div className="bd-bubbles">
                {bubbles.slice(0, 14).map((bubble) => (
                  <a key={bubble.domain} className="bd-bubble" href={bubble.url} target="_blank" rel="noreferrer" title={bubble.domain}>
                    <img
                      src={faviconFor(bubble.domain)}
                      alt=""
                      loading="lazy"
                      onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    {bubble.domain}
                  </a>
                ))}
                {bubbles.length > 14 && <span className="bd-bubble-more">and {bubbles.length - 14} more</span>}
              </div>
            )}
          </>
        )}

        <hr className="bd-rule" />

        {editing ? (
          <>
            <div className="bd-edit-tools">
              <label className="bd-act">
                Add image
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(event) => { onPasteOrDrop(event.target.files); event.target.value = ""; }}
                />
              </label>
              <span className="bd-edit-hint">Markdown. Paste or drop a photo of the slide straight in.</span>
            </div>
            <textarea
              ref={editRef}
              className="bd-edit"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onPaste={(event) => { if (onPasteOrDrop(event.clipboardData?.files ?? null)) event.preventDefault(); }}
              onDrop={(event) => { if (onPasteOrDrop(event.dataTransfer?.files ?? null)) event.preventDefault(); }}
              onDragOver={(event) => event.preventDefault()}
              spellCheck
              autoFocus
            />
          </>
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
