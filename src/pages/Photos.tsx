/**
 * BrainoPhotos MVP1.
 *
 * A photo library that behaves the way people expect one to: drop files, see a
 * timeline, open one full screen, arrow through them. The engineering that matters
 * is not on this page, it is in photoPipeline (derivatives) and photoStorage
 * (batched signing). This file is the surface.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check, ChevronLeft, ChevronRight, Download, Heart, Image as ImageIcon,
  Loader2, RotateCcw, Search, Star, Trash2, Upload, X,
} from "lucide-react";
import { usePhotoIdentity } from "@/hooks/usePhotoIdentity";
import { usePhotos, groupByDay, type Photo } from "@/hooks/usePhotos";
import { fetchOriginal } from "@/lib/photoStorage";
import { formatBytes } from "@/lib/photoPipeline";
import "./photos.css";

/** Free tier. The number the storage meter measures against. */
const QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

type View = "all" | "favorites" | "trash";

export default function Photos() {
  const { user, state: identity, blocked, isAnonymous } = usePhotoIdentity();
  const lib = usePhotos();
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  /* ----- what the grid is showing right now ----- */

  const visible = useMemo(() => {
    const base =
      view === "trash" ? lib.trashed
      : view === "favorites" ? lib.photos.filter((p) => p.is_favorite)
      : lib.photos;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => {
      const when = new Date(p.taken_at || p.created_at);
      const haystack = `${p.filename} ${when.toLocaleDateString(undefined, { month: "long", year: "numeric", weekday: "long" })} ${when.getFullYear()}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [view, query, lib.photos, lib.trashed]);

  const days = useMemo(() => groupByDay(visible), [visible]);

  // A photo that leaves the current view must not stay selected.
  useEffect(() => {
    setSelected((prev) => {
      if (!prev.size) return prev;
      const ids = new Set(visible.map((p) => p.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visible]);

  /* ----- input ----- */

  const onFiles = useCallback((files: FileList | File[] | null) => {
    if (files && files.length) lib.upload(files);
  }, [lib]);

  useEffect(() => {
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragDepth.current++; setDragging(true);
    };
    const leave = () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault(); dragDepth.current = 0; setDragging(false);
      onFiles(e.dataTransfer?.files ?? null);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [onFiles]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectDay = useCallback((dayPhotos: Photo[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = dayPhotos.every((p) => next.has(p.id));
      dayPhotos.forEach((p) => (allOn ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  }, []);

  const openPhoto = useCallback((photo: Photo) => {
    const i = visible.findIndex((p) => p.id === photo.id);
    if (i >= 0) setOpenIndex(i);
  }, [visible]);

  /* ----- render ----- */

  if (identity === "resolving") {
    return <div className="bp"><div className="bp-empty"><Loader2 size={22} className="animate-spin" /></div></div>;
  }

  // Only reachable if anonymous sign-in is switched off for the project. Say what
  // to flip rather than pretending the library is empty.
  if (identity === "blocked" || !user) {
    return (
      <div className="bp">
        <div className="bp-empty">
          <div className="bp-empty-inner">
            <div className="bp-empty-ring"><ImageIcon size={31} /></div>
            <h2>Braino Photos</h2>
            <p>
              This library could not start a session. Enable anonymous sign-ins for the project,
              or sign in with your Braino account to continue.
            </p>
            {blocked && <p style={{ fontSize: 12.5, opacity: 0.6, marginTop: -12 }}>{blocked}</p>}
            <Link to="/auth" className="bp-btn bp-btn-primary" style={{ textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  const usedPct = Math.min(100, (lib.bytesUsed / QUOTA_BYTES) * 100);
  const selectedList = [...selected];

  return (
    <div className="bp">
      <input
        ref={fileInput} type="file" accept="image/*,.heic,.heif" multiple hidden
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />

      <header className="bp-top">
        <div className="bp-brand">
          <span className="bp-mark"><ImageIcon size={14} /></span>
          <b>Braino</b><span>Photos</span>
        </div>

        <div className="bp-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, month, or year"
          />
        </div>

        <div className="bp-actions">
          <button className="bp-btn bp-btn-primary" onClick={() => fileInput.current?.click()}>
            <Upload size={15} /> Upload
          </button>
        </div>
      </header>

      <div className="bp-body">
        <nav className="bp-rail">
          <RailButton icon={<ImageIcon size={17} />} label="Photos" count={lib.photos.length} on={view === "all"} onClick={() => setView("all")} />
          <RailButton icon={<Star size={17} />} label="Favorites" count={lib.photos.filter((p) => p.is_favorite).length} on={view === "favorites"} onClick={() => setView("favorites")} />
          <RailButton icon={<Trash2 size={17} />} label="Trash" count={lib.trashed.length} on={view === "trash"} onClick={() => setView("trash")} />

          <div className="bp-meter">
            <div className="bp-meter-top">
              <span>{lib.bytesLabel} used</span>
              <span>{formatBytes(QUOTA_BYTES)}</span>
            </div>
            <div className="bp-meter-bar"><div className="bp-meter-fill" style={{ width: `${usedPct}%` }} /></div>
            <p className="bp-meter-note">
              {lib.photos.length} photo{lib.photos.length === 1 ? "" : "s"}. Originals kept untouched.
              {isAnonymous && <> This library lives on this browser. <Link to="/auth" className="bp-meter-link">Sign in</Link> to keep it.</>}
            </p>
          </div>
        </nav>

        <main className="bp-main">
          {selectedList.length > 0 && (
            <div className="bp-selbar">
              <button className="bp-lb-icon" onClick={() => setSelected(new Set())} aria-label="Clear selection"><X size={17} /></button>
              <strong>{selectedList.length} selected</strong>
              <div className="bp-actions">
                {view === "trash" ? (
                  <>
                    <button className="bp-btn" onClick={() => { lib.restore(selectedList); setSelected(new Set()); }}>
                      <RotateCcw size={15} /> Restore
                    </button>
                    <button
                      className="bp-btn bp-btn-danger"
                      onClick={() => {
                        if (confirm(`Permanently delete ${selectedList.length} photo(s)? This cannot be undone.`)) {
                          lib.deleteForever(selectedList); setSelected(new Set());
                        }
                      }}
                    >
                      <Trash2 size={15} /> Delete forever
                    </button>
                  </>
                ) : (
                  <button className="bp-btn bp-btn-danger" onClick={() => { lib.trash(selectedList); setSelected(new Set()); }}>
                    <Trash2 size={15} /> Move to trash
                  </button>
                )}
              </div>
            </div>
          )}

          {lib.loading ? (
            <div className="bp-empty"><Loader2 size={22} className="animate-spin" /></div>
          ) : !visible.length ? (
            <EmptyState view={view} query={query} onUpload={() => fileInput.current?.click()} />
          ) : (
            days.map((day) => (
              <section className="bp-day" key={day.label}>
                <h2 className="bp-day-head">
                  {day.label} <em>{day.photos.length}</em>
                  <button className="bp-day-pick" onClick={() => selectDay(day.photos)}>Select all</button>
                </h2>
                <div className="bp-grid">
                  {day.photos.map((photo) => (
                    <Tile
                      key={photo.id}
                      photo={photo}
                      url={photo.thumb_path ? lib.urls[photo.thumb_path] : undefined}
                      selected={selected.has(photo.id)}
                      anySelected={selectedList.length > 0}
                      onOpen={() => openPhoto(photo)}
                      onToggle={() => toggleSelect(photo.id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>

      {dragging && (
        <div className="bp-drop">
          <div>Drop to add to your library<small>JPEG, PNG, WebP, GIF, AVIF</small></div>
        </div>
      )}

      {lib.uploads.length > 0 && <UploadTray uploads={lib.uploads} />}

      {openIndex !== null && visible[openIndex] && (
        <Lightbox
          photos={visible}
          index={openIndex}
          setIndex={setOpenIndex}
          resolvePreview={lib.resolvePreview}
          onFavorite={lib.toggleFavorite}
          onTrash={(photo) => { lib.trash([photo.id]); setOpenIndex(null); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RailButton({ icon, label, count, on, onClick }: {
  icon: React.ReactNode; label: string; count: number; on: boolean; onClick: () => void;
}) {
  return (
    <button className={on ? "on" : ""} onClick={onClick}>
      {icon} {label} <span className="bp-rail-count">{count || ""}</span>
    </button>
  );
}

/** blur_data is inline in the row, so it paints on first frame. The thumb fades over it. */
function Tile({ photo, url, selected, anySelected, onOpen, onToggle }: {
  photo: Photo; url?: string; selected: boolean; anySelected: boolean;
  onOpen: () => void; onToggle: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`bp-tile${selected ? " sel" : ""}`}
      role="button" tabIndex={0}
      onClick={() => (anySelected ? onToggle() : onOpen())}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (anySelected) onToggle(); else onOpen(); } }}
    >
      {photo.blur_data && <img className="bp-tile-blur" src={photo.blur_data} alt="" aria-hidden />}
      {url && (
        <img
          className={`bp-tile-real${loaded ? " in" : ""}`}
          src={url} alt={photo.filename} loading="lazy" decoding="async"
          onLoad={() => setLoaded(true)}
        />
      )}
      <span
        className={`bp-check${selected ? " on" : ""}`}
        role="checkbox" aria-checked={selected} aria-label="Select photo" tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {selected && <Check size={13} strokeWidth={3} />}
      </span>
      {photo.is_favorite && <Heart className="bp-fav-dot" size={14} fill="currentColor" />}
    </div>
  );
}

function EmptyState({ view, query, onUpload }: { view: View; query: string; onUpload: () => void }) {
  if (query) {
    return (
      <div className="bp-empty"><div className="bp-empty-inner">
        <div className="bp-empty-ring"><Search size={29} /></div>
        <h2>Nothing matched</h2>
        <p>No photos for "{query}". Try a month, a year, or part of a filename.</p>
      </div></div>
    );
  }
  if (view === "trash") {
    return (
      <div className="bp-empty"><div className="bp-empty-inner">
        <div className="bp-empty-ring"><Trash2 size={29} /></div>
        <h2>Trash is empty</h2>
        <p>Photos you remove land here first. Nothing is deleted until you say so.</p>
      </div></div>
    );
  }
  if (view === "favorites") {
    return (
      <div className="bp-empty"><div className="bp-empty-inner">
        <div className="bp-empty-ring"><Star size={29} /></div>
        <h2>No favorites yet</h2>
        <p>Open any photo and press F to keep it here.</p>
      </div></div>
    );
  }
  return (
    <div className="bp-empty"><div className="bp-empty-inner">
      <div className="bp-empty-ring"><ImageIcon size={31} /></div>
      <h2>Your library starts here</h2>
      <p>Drop photos anywhere on this page. Braino reads the date each one was taken and builds the timeline for you.</p>
      <button className="bp-btn bp-btn-primary" onClick={onUpload}><Upload size={15} /> Choose photos</button>
    </div></div>
  );
}

function UploadTray({ uploads }: { uploads: ReturnType<typeof usePhotos>["uploads"] }) {
  const done = uploads.filter((u) => u.state === "done" || u.state === "duplicate").length;
  const busy = uploads.some((u) => u.state === "reading" || u.state === "uploading" || u.state === "waiting");
  return (
    <div className="bp-tray">
      <div className="bp-tray-head">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="bp-ok" />}
        {busy ? `Uploading ${done + 1} of ${uploads.length}` : `${done} of ${uploads.length} added`}
      </div>
      <div className="bp-tray-list">
        {uploads.map((u) => (
          <div className="bp-tray-row" key={u.id}>
            <span className="bp-tray-name" title={u.error || u.name}>{u.name}</span>
            {u.state === "error" ? <span className="bp-tray-state bp-err">Failed</span>
              : u.state === "duplicate" ? <span className="bp-tray-state bp-dup">Already here</span>
              : u.state === "done" ? <Check size={13} className="bp-ok" />
              : <span className="bp-tray-bar"><span className="bp-tray-fill" style={{ width: `${u.progress}%` }} /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Lightbox({ photos, index, setIndex, resolvePreview, onFavorite, onTrash }: {
  photos: Photo[]; index: number; setIndex: (i: number | null) => void;
  resolvePreview: (p: Photo) => Promise<string | null>;
  onFavorite: (p: Photo) => void; onTrash: (p: Photo) => void;
}) {
  const photo = photos[index];
  const [src, setSrc] = useState<string | null>(null);

  // Load the current preview, then quietly warm the neighbours so arrowing is instant.
  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    resolvePreview(photo).then((url) => { if (!cancelled) setSrc(url); });
    [photos[index - 1], photos[index + 1]].forEach((n) => { if (n) void resolvePreview(n); });
    return () => { cancelled = true; };
  }, [photo, index, photos, resolvePreview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      else if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      else if (e.key === "ArrowRight" && index < photos.length - 1) setIndex(index + 1);
      else if (e.key.toLowerCase() === "f") onFavorite(photo);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, photo, setIndex, onFavorite]);

  const download = async () => {
    try {
      const blob = await fetchOriginal(photo.orig_path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = photo.filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { /* signed download can fail offline; the lightbox stays usable */ }
  };

  const when = new Date(photo.taken_at || photo.created_at);

  return (
    <div className="bp-lb" role="dialog" aria-modal="true">
      <div className="bp-lb-top">
        <button className="bp-lb-icon" onClick={() => setIndex(null)} aria-label="Close"><X size={18} /></button>
        <div className="bp-lb-meta">
          {photo.filename}
          <small>
            {when.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
            {" · "}{when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            {photo.width ? ` · ${photo.width}×${photo.height}` : ""} · {formatBytes(photo.bytes)}
          </small>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className={`bp-lb-icon${photo.is_favorite ? " fav" : ""}`} onClick={() => onFavorite(photo)} aria-label="Favorite">
            <Heart size={17} fill={photo.is_favorite ? "currentColor" : "none"} />
          </button>
          <button className="bp-lb-icon" onClick={download} aria-label="Download original"><Download size={17} /></button>
          <button className="bp-lb-icon" onClick={() => onTrash(photo)} aria-label="Move to trash"><Trash2 size={17} /></button>
        </div>
      </div>

      <div className="bp-lb-stage">
        {src ? <img src={src} alt={photo.filename} />
          : photo.blur_data ? <img src={photo.blur_data} alt="" style={{ filter: "blur(22px)", maxHeight: "70vh" }} />
          : <span className="bp-lb-spin"><Loader2 size={22} className="animate-spin" /></span>}
      </div>

      {index > 0 && <button className="bp-lb-nav prev" onClick={() => setIndex(index - 1)} aria-label="Previous"><ChevronLeft size={22} /></button>}
      {index < photos.length - 1 && <button className="bp-lb-nav next" onClick={() => setIndex(index + 1)} aria-label="Next"><ChevronRight size={22} /></button>}
    </div>
  );
}
