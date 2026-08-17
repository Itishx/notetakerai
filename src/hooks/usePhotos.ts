/**
 * BrainoPhotos data layer: the library, the upload queue, and the storage meter.
 * `supabase as any` because photos is not in the generated types yet
 * (regenerate with `supabase gen types typescript` after the migration lands).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { derivePhoto, formatBytes } from "@/lib/photoPipeline";
import { photoKey, putObject, removeObjects, signUrls } from "@/lib/photoStorage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export interface Photo {
  id: string;
  user_id: string;
  sha256: string;
  filename: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  blur_data: string | null;
  orig_path: string;
  preview_path: string | null;
  thumb_path: string | null;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
}

export type UploadState = "waiting" | "reading" | "uploading" | "done" | "duplicate" | "error";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  state: UploadState;
  progress: number;
  error?: string;
}

/** Two files at a time. Enough to saturate a connection, few enough to keep the UI alive. */
const CONCURRENCY = 2;

export function usePhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const uploadingRef = useRef(false);

  /* ----- read ----- */

  const load = useCallback(async () => {
    if (!user) { setPhotos([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await db()
      .from("photos")
      .select("*")
      .eq("user_id", user.id)
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(2000);
    if (!error) setPhotos((data ?? []) as Photo[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  /** Sign every thumb in one batched call whenever the library changes. */
  useEffect(() => {
    const paths = photos.map((p) => p.thumb_path).filter((p): p is string => !!p);
    if (!paths.length) return;
    let cancelled = false;
    signUrls(paths)
      .then((map) => { if (!cancelled) setUrls((prev) => ({ ...prev, ...map })); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [photos]);

  /** Lightbox asks for the big one only when a photo is actually opened. */
  const resolvePreview = useCallback(async (photo: Photo) => {
    const path = photo.preview_path || photo.orig_path;
    const map = await signUrls([path]);
    if (map[path]) setUrls((prev) => ({ ...prev, ...map }));
    return map[path] ?? null;
  }, []);

  /* ----- write ----- */

  const runQueue = useCallback(
    async (files: File[]) => {
      if (!user) return;

      const items: UploadItem[] = files.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        name: file.name,
        size: file.size,
        state: "waiting",
        progress: 0,
      }));
      setUploads((prev) => [...prev, ...items]);

      const patch = (id: string, next: Partial<UploadItem>) =>
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...next } : u)));

      const fresh: Photo[] = [];
      let cursor = 0;

      const worker = async () => {
        while (cursor < files.length) {
          const index = cursor++;
          const file = files[index];
          const item = items[index];
          try {
            patch(item.id, { state: "reading", progress: 8 });
            const derived = await derivePhoto(file);

            // Content address means we can detect a re-upload before spending bandwidth.
            const { data: existing } = await db()
              .from("photos").select("id, deleted_at")
              .eq("user_id", user.id).eq("sha256", derived.sha256).maybeSingle();

            if (existing && !existing.deleted_at) {
              patch(item.id, { state: "duplicate", progress: 100 });
              continue;
            }

            patch(item.id, { state: "uploading", progress: 30 });
            const origExt = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
            const origPath = photoKey(user.id, derived.sha256, "orig", origExt);
            const previewPath = photoKey(user.id, derived.sha256, "preview", derived.previewExt);
            const thumbPath = photoKey(user.id, derived.sha256, "thumb", derived.thumbExt);

            // Thumb first: it is the smallest, so the grid can paint soonest.
            await putObject(thumbPath, derived.thumb, `image/${derived.thumbExt}`);
            patch(item.id, { progress: 50 });
            await putObject(previewPath, derived.preview, `image/${derived.previewExt}`);
            patch(item.id, { progress: 72 });
            await putObject(origPath, derived.original, file.type || "image/jpeg");
            patch(item.id, { progress: 92 });

            const row = {
              user_id: user.id,
              sha256: derived.sha256,
              filename: file.name,
              mime: file.type || "image/jpeg",
              bytes: file.size,
              width: derived.width,
              height: derived.height,
              taken_at: derived.takenAt ? derived.takenAt.toISOString() : null,
              blur_data: derived.blurData,
              orig_path: origPath,
              preview_path: previewPath,
              thumb_path: thumbPath,
              deleted_at: null,
            };

            // Upsert revives a previously trashed photo instead of colliding with it.
            const { data: saved, error } = await db()
              .from("photos").upsert(row, { onConflict: "user_id,sha256" }).select().single();
            if (error) throw error;

            fresh.push(saved as Photo);
            patch(item.id, { state: "done", progress: 100 });
          } catch (err) {
            patch(item.id, {
              state: "error",
              progress: 100,
              error: err instanceof Error ? err.message : "Upload failed",
            });
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

      if (fresh.length) {
        setPhotos((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]));
          fresh.forEach((p) => byId.set(p.id, p));
          return [...byId.values()].sort(sortByTaken);
        });
      }
      // Clear finished rows, keep failures on screen so they can be seen.
      setTimeout(() => setUploads((prev) => prev.filter((u) => u.state === "error")), 2500);
    },
    [user],
  );

  const upload = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
      if (!files.length || uploadingRef.current) return;
      uploadingRef.current = true;
      void runQueue(files).finally(() => { uploadingRef.current = false; });
    },
    [runQueue],
  );

  const toggleFavorite = useCallback(async (photo: Photo) => {
    const next = !photo.is_favorite;
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, is_favorite: next } : p)));
    const { error } = await db().from("photos").update({ is_favorite: next }).eq("id", photo.id);
    if (error) setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, is_favorite: !next } : p)));
  }, []);

  /** Soft delete. Bytes stay put so restore is instant and free. */
  const trash = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const stamp = new Date().toISOString();
    setPhotos((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, deleted_at: stamp } : p)));
    await db().from("photos").update({ deleted_at: stamp }).in("id", ids);
  }, []);

  const restore = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setPhotos((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, deleted_at: null } : p)));
    await db().from("photos").update({ deleted_at: null }).in("id", ids);
  }, []);

  /** The only path that actually reclaims storage. Objects go first, then the row. */
  const deleteForever = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const targets = photos.filter((p) => ids.includes(p.id));
    setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)));
    try {
      await removeObjects(targets.flatMap((p) => [p.orig_path, p.preview_path, p.thumb_path].filter(Boolean) as string[]));
    } catch { /* orphaned objects are recoverable, a stuck row is not */ }
    await db().from("photos").delete().in("id", ids);
  }, [photos]);

  const live = useMemo(() => photos.filter((p) => !p.deleted_at), [photos]);
  const trashed = useMemo(() => photos.filter((p) => p.deleted_at), [photos]);
  const bytesUsed = useMemo(() => live.reduce((sum, p) => sum + (p.bytes || 0), 0), [live]);

  return {
    photos: live, trashed, allPhotos: photos, urls, loading, uploads,
    upload, toggleFavorite, trash, restore, deleteForever, resolvePreview, reload: load,
    bytesUsed, bytesLabel: formatBytes(bytesUsed),
  };
}

function sortByTaken(a: Photo, b: Photo) {
  const at = new Date(a.taken_at || a.created_at).getTime();
  const bt = new Date(b.taken_at || b.created_at).getTime();
  return bt - at;
}

/** Group into the date headers that make a pile of files read as a timeline. */
export function groupByDay(photos: Photo[]) {
  const groups = new Map<string, { label: string; photos: Photo[] }>();
  for (const photo of photos) {
    const date = new Date(photo.taken_at || photo.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!groups.has(key)) groups.set(key, { label: dayLabel(date), photos: [] });
    groups.get(key)!.photos.push(photo);
  }
  return [...groups.values()];
}

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  const opts: Intl.DateTimeFormatOptions =
    date.getFullYear() === today.getFullYear()
      ? { weekday: "long", month: "long", day: "numeric" }
      : { month: "long", day: "numeric", year: "numeric" };
  return date.toLocaleDateString(undefined, opts);
}
