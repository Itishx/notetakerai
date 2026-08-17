/**
 * BrainoPhotos storage adapter.
 *
 * The whole app talks to this file and nothing else knows where bytes live.
 * MVP1 runs on Supabase Storage because it is already wired to our auth and RLS.
 * Moving to Cloudflare R2 later is a rewrite of THIS FILE ONLY: swap putObject for
 * a presigned PUT and signUrls for a public custom-domain URL (R2 egress is free,
 * so signUrls collapses to a string template).
 */
import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "braino-photos";

/** Signed URLs are cached in-memory so a re-render never re-signs the same key. */
const urlCache = new Map<string, { url: string; expires: number }>();
const SIGN_TTL = 60 * 60; // 1 hour
const SIGN_SAFETY = 5 * 60 * 1000; // re-sign 5 min before expiry

export function photoKey(userId: string, sha256: string, variant: "orig" | "preview" | "thumb", ext: string) {
  // <user>/<shard>/<sha>/<variant>.<ext> — the leading segment is what storage RLS checks.
  return `${userId}/${sha256.slice(0, 2)}/${sha256}/${variant}.${ext}`;
}

export async function putObject(path: string, body: Blob, contentType: string) {
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, body, {
    contentType,
    cacheControl: "31536000", // a content-addressed key never changes, cache it for a year
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function removeObjects(paths: string[]) {
  const live = paths.filter(Boolean);
  if (!live.length) return;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(live);
  if (error) throw error;
}

/**
 * Batch-sign. One network call for a whole page of thumbnails instead of N calls.
 * This is the difference between a grid that paints instantly and one that crawls.
 */
export async function signUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];

  for (const path of paths) {
    if (!path) continue;
    const hit = urlCache.get(path);
    if (hit && hit.expires - SIGN_SAFETY > now) out[path] = hit.url;
    else if (!missing.includes(path)) missing.push(path);
  }
  if (!missing.length) return out;

  // createSignedUrls caps out on very large batches, so chunk it.
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(chunk, SIGN_TTL);
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.signedUrl || !row.path) continue;
      urlCache.set(row.path, { url: row.signedUrl, expires: now + SIGN_TTL * 1000 });
      out[row.path] = row.signedUrl;
    }
  }
  return out;
}

export async function signOne(path: string): Promise<string | null> {
  if (!path) return null;
  const map = await signUrls([path]);
  return map[path] ?? null;
}

/** Download the untouched original. Used by the download button in the lightbox. */
export async function fetchOriginal(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path);
  if (error) throw error;
  return data;
}
