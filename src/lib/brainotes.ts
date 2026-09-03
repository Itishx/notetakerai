import { supabase } from "@/integrations/supabase/client";

/* Brainotes: one shelf.
 *
 * A research document he wrote and a page of class notes you started are the
 * same object — a title, a body, things he found, things you added. They differ
 * by kind and nothing else, which is what makes "open it and add your own"
 * work without two editors and two ideas of what a document is.
 */

export type DocKind = "research" | "note" | "lecture";

export type DocSummary = {
  id: string;
  slug: string;
  title: string;
  overview: string | null;
  kind: DocKind;
  subject: string | null;
  happened_on: string | null;
  word_count: number | null;
  sources: { url: string }[];
  is_public: boolean;
  created_at: string;
};

export const IMAGE_BUCKET = "braino-doc-images";

/* Short and readable, because the link gets sent to people and sometimes read
   out loud. Collisions are handled by the unique index, not by hope. */
export function newSlug() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function listDocs(userId: string): Promise<DocSummary[]> {
  const { data } = await (supabase as any)
    .from("braino_docs")
    .select("id, slug, title, overview, kind, subject, happened_on, word_count, sources, is_public, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as DocSummary[]) || [];
}

export async function createNote(userId: string, fields: {
  title?: string;
  subject?: string | null;
  kind?: DocKind;
  markdown?: string;
}) {
  const slug = newSlug();
  const { data, error } = await (supabase as any)
    .from("braino_docs")
    .insert({
      user_id: userId,
      slug,
      title: fields.title?.trim() || "Untitled note",
      subject: fields.subject?.trim() || null,
      kind: fields.kind || "note",
      markdown: fields.markdown || "",
      happened_on: new Date().toISOString().slice(0, 10),
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string; slug: string };
}

export async function deleteDoc(id: string) {
  const { error } = await (supabase as any).from("braino_docs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* Photograph of a slide, a whiteboard, a page of a textbook.
 *
 * Stored under the owner's folder and served from a public bucket, because a
 * note is meant to be shared as a link and a signed URL would expire while the
 * note was still being read. */
export async function uploadDocImage(userId: string, file: File) {
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/* What a card shows when there is no overview: the first real sentence of the
   body, with the markdown taken off. */
export function preview(markdown: string, max = 150) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*\s]+/gm, " ")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}
