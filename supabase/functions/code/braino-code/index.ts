// Braino Code: "build me a website like X" -> a real page, opened in a tab.
//
// The request returns in about a second with a build id. The actual work runs
// on after the response, writing its progress into the code_builds row, and
// /code watches that row over realtime. That shape exists because the build
// takes minutes and nobody is going to hold an HTTP connection open that long.
//
//   queued -> designing -> writing -> ready
//
// Each transition is a beat on the wait screen, which is why the row is
// updated at the boundaries rather than only at the end.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { BRAINO_TEXT_MODEL } from "../../_shared/openai-models.ts";
import {
  applyEdits,
  buildEditPrompt,
  buildHtmlPrompt,
  buildSpecPrompt,
  cleanHtml,
  parseEditPlan,
  parseSpec,
  type SiteSpec,
} from "../../_shared/site-design.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const BUCKET = "braino-code";

declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void } | undefined;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function compactText(value: string, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) throw new Error("Supabase service credentials are not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Auth is optional: trying the thing should not require an account. A signed-in
// caller gets their build attributed and readable over realtime; an anonymous
// one gets a build owned by nobody, which only the GET below can read back.
async function optionalUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return null;

  const url = Deno.env.get("SUPABASE_URL") || "";
  // This project does not always get SUPABASE_ANON_KEY injected; the shared
  // Spotify helper carries the same fallback for the same reason.
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    || "";
  if (!url || !anonKey) return null;

  try {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await client.auth.getUser();
    return user || null;
  } catch {
    // A stale or malformed token is not a reason to refuse the build, it just
    // means the build is anonymous. The rate limit below still applies.
    return null;
  }
}

// The endpoint is public and every call spends real model tokens, so the ceiling
// is on the thing that can actually be abused. Signed-in builds are attributable
// and are not counted here.
const ANON_BUILDS_PER_HOUR = 10;

async function anonymousQuotaExceeded(db: ReturnType<typeof serviceClient>) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("code_builds")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .gte("created_at", since);
  return (count ?? 0) >= ANON_BUILDS_PER_HOUR;
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const chunks: string[] = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") continue;
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content?.text === "string" && content.text.trim()) {
        chunks.push(content.text.trim());
      }
    }
  }
  return chunks.join("\n\n").trim();
}

async function callOpenAi({
  prompt,
  effort,
  maxOutputTokens,
  webSearch,
}: {
  prompt: string;
  effort: "none" | "low" | "medium" | "high";
  maxOutputTokens: number;
  webSearch?: boolean;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const body: Record<string, unknown> = {
    model: BRAINO_TEXT_MODEL,
    input: prompt,
    max_output_tokens: maxOutputTokens,
    reasoning: { effort },
  };
  // Only the spec stage searches. The build stage has everything it needs in the
  // spec, and giving it search only tempts it to wander mid-page.
  if (webSearch) body.tools = [{ type: "web_search" }];

  const doFetch = () => fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let res = await doFetch();
  let raw = await res.text();
  // Same fail-open web-research uses: if the model rejects the reasoning knob,
  // drop it and retry rather than losing the whole build over a parameter.
  if (!res.ok && /reasoning/i.test(raw)) {
    delete body.reasoning;
    res = await doFetch();
    raw = await res.text();
  }

  let data: any = {};
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = { raw }; }
  }
  if (!res.ok) {
    const detail = compactText(String(data?.error?.message || raw || ""), 400) || `status ${res.status}`;
    throw new Error(`OpenAI failed: ${detail}`);
  }

  const text = extractOutputText(data);
  if (!text) throw new Error("OpenAI returned an empty response.");
  return { text, totalTokens: Number(data?.usage?.total_tokens) || 0 };
}

async function loadParent(db: ReturnType<typeof serviceClient>, parentId: string, userId: string | null) {
  // Signed in, the parent must be yours. Signed out there is no owner to match,
  // so knowing the uuid is the capability, same as reading a build back.
  let query = db
    .from("code_builds")
    .select("spec, html_path")
    .eq("id", parentId);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query.maybeSingle();
  if (!data) return { spec: null as SiteSpec | null, html: null as string | null };

  let html: string | null = null;
  if (data.html_path) {
    const { data: file } = await db.storage.from(BUCKET).download(data.html_path);
    if (file) html = await file.text();
  }
  return { spec: (data.spec as SiteSpec) || null, html };
}

async function publish(
  db: ReturnType<typeof serviceClient>,
  buildId: string,
  html: string,
) {
  const path = `builds/${buildId}/index.html`;
  const { error } = await db.storage.from(BUCKET).upload(
    path,
    new Blob([html], { type: "text/html" }),
    { contentType: "text/html", upsert: true },
  );
  if (error) throw new Error(`Could not publish the page: ${error.message}`);
  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: pub?.publicUrl || null };
}

/** The fast path. Changes an existing page in place instead of rebuilding it.
 *  Returns false when the change is too structural to be done by replacement,
 *  in which case the caller falls back to a full build. */
async function runEdit({
  db,
  buildId,
  instruction,
  parentHtml,
  parentSpec,
  startedAt,
}: {
  db: ReturnType<typeof serviceClient>;
  buildId: string;
  instruction: string;
  parentHtml: string;
  parentSpec: SiteSpec | null;
  startedAt: number;
}): Promise<boolean> {
  await db.from("code_builds").update({ status: "editing", spec: parentSpec }).eq("id", buildId);

  // Small output, no web search, low effort: this is a lookup-and-swap, not a
  // design decision. That is the whole reason it comes back in seconds.
  const call = await callOpenAi({
    prompt: buildEditPrompt(parentHtml, instruction, parentSpec),
    effort: "low",
    maxOutputTokens: 6000,
    webSearch: false,
  });

  const plan = parseEditPlan(call.text);
  if (plan.mode === "rebuild") {
    console.log("[braino-code] edit declined, rebuilding:", plan.why);
    return false;
  }

  // A refused edit is a signal, not a failure: it means the model was guessing
  // about where the change went, and a rebuild is the honest answer.
  let edited: string;
  try {
    edited = applyEdits(parentHtml, plan.edits).html;
  } catch (error) {
    console.log("[braino-code] edits did not apply cleanly:", (error as Error).message);
    return false;
  }

  if (!/<\/html>/i.test(edited)) return false;

  const { path, url } = await publish(db, buildId, edited);

  await db.from("code_builds").update({
    status: "ready",
    html_path: path,
    preview_url: url,
    change_summary: String(plan.summary || "").slice(0, 200) || "Changed.",
    spec: plan.palette && parentSpec
      ? { ...parentSpec, palette: { ...parentSpec.palette, ...plan.palette } }
      : parentSpec,
    model: BRAINO_TEXT_MODEL,
    total_tokens: call.totalTokens,
    elapsed_ms: Date.now() - startedAt,
  }).eq("id", buildId);

  return true;
}

async function runBuild({
  buildId,
  userId,
  brief,
  parentBuildId,
}: {
  buildId: string;
  userId: string | null;
  brief: string;
  parentBuildId: string | null;
}) {
  const db = serviceClient();
  const startedAt = Date.now();
  let tokens = 0;

  const fail = async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[braino-code] build failed", buildId, message);
    await db.from("code_builds")
      .update({ status: "failed", error: compactText(message, 400), elapsed_ms: Date.now() - startedAt })
      .eq("id", buildId);
  };

  try {
    const parent = parentBuildId ? await loadParent(db, parentBuildId, userId) : { spec: null, html: null };

    // Change the page in place when we can. "Make it red" should not regenerate
    // a design system and rewrite eleven hundred lines to move one hex code.
    // Falls through to a full build when the change is structural, or when the
    // replacements did not apply cleanly enough to trust.
    if (parent.html) {
      const changed = await runEdit({
        db,
        buildId,
        instruction: brief,
        parentHtml: parent.html,
        parentSpec: parent.spec,
        startedAt,
      });
      if (changed) return;
    }

    // Beat one and two. The restatement lands with the spec rather than in its
    // own call: one round trip is quicker to the palette, and the palette is
    // the thing worth steering early.
    await db.from("code_builds").update({ status: "designing" }).eq("id", buildId);

    const specCall = await callOpenAi({
      prompt: buildSpecPrompt(brief, parent.spec),
      effort: "medium",
      maxOutputTokens: 4000,
      webSearch: true,
    });
    tokens += specCall.totalTokens;
    const spec = parseSpec(specCall.text);

    await db.from("code_builds").update({
      status: "writing",
      spec,
      restated: `${spec.name}. ${spec.tagline}`,
    }).eq("id", buildId);

    // Beat three. A six section page runs long, so the ceiling is generous:
    // truncating here costs the whole build, not just the last section.
    const htmlCall = await callOpenAi({
      prompt: buildHtmlPrompt(spec, brief, parent.html),
      effort: "high",
      maxOutputTokens: 32000,
      webSearch: false,
    });
    tokens += htmlCall.totalTokens;
    const html = cleanHtml(htmlCall.text);
    if (!/<\/html>/i.test(html)) {
      throw new Error("The page came back unfinished. Try again, or narrow the brief.");
    }

    const { path, url } = await publish(db, buildId, html);

    await db.from("code_builds").update({
      status: "ready",
      html_path: path,
      preview_url: url,
      model: BRAINO_TEXT_MODEL,
      total_tokens: tokens,
      elapsed_ms: Date.now() - startedAt,
    }).eq("id", buildId);
  } catch (error) {
    await fail(error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const db = serviceClient();

    const url = new URL(req.url);

    // Serve the built page as real HTML.
    //
    // Supabase Storage deliberately serves every uploaded file as text/plain
    // with nosniff and a "default-src 'none'; sandbox" CSP, so nobody can host
    // arbitrary pages on the storage domain. Correct of them, and it means the
    // public storage URL shows the source as text instead of rendering. This
    // endpoint reads the same object back and returns it with the right
    // content type, which is what "Open it" and any shared link point at.
    const render = url.searchParams.get("render");
    if (render) {
      const { data: row } = await db
        .from("code_builds")
        .select("html_path")
        .eq("id", render)
        .maybeSingle();
      if (!row?.html_path) return json({ error: "No such build." }, 404);

      const { data: file } = await db.storage.from(BUCKET).download(row.html_path);
      if (!file) return json({ error: "That page is missing." }, 404);

      return new Response(await file.text(), {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // Read one build back by id. This is how an anonymous caller follows its own
    // build: RLS hides the row from direct table reads, so the uuid is the only
    // key. Only the fields the wait screen renders are returned.
    const wanted = url.searchParams.get("build");
    if (req.method === "GET" || wanted) {
      if (!wanted) return json({ error: "Which build?" }, 400);
      const { data: row } = await db
        .from("code_builds")
        .select("id, brief, restated, spec, status, change_summary, preview_url, error, created_at")
        .eq("id", wanted)
        .maybeSingle();
      if (!row) return json({ error: "No such build." }, 404);
      return json({ build: row });
    }

    const user = await optionalUser(req);
    const payload = await req.json().catch(() => ({}));
    const brief = compactText(String(payload?.brief || ""), 2000);
    const parentBuildId = payload?.parentBuildId ? String(payload.parentBuildId) : null;

    if (!brief) return json({ error: "Tell me what to build." }, 400);

    if (!user && await anonymousQuotaExceeded(db)) {
      return json(
        { error: "Too many builds from signed out visitors in the last hour. Sign in to keep going." },
        429,
      );
    }

    const { data: build, error } = await db
      .from("code_builds")
      .insert({ user_id: user?.id ?? null, brief, parent_build_id: parentBuildId, status: "queued" })
      .select("id")
      .single();
    if (error || !build) throw new Error(error?.message || "Could not start the build.");

    // Hand the id back straight away so /code can subscribe before the first
    // status change lands, then keep working after the response has gone.
    const work = runBuild({ buildId: build.id, userId: user?.id ?? null, brief, parentBuildId });
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(work);
    } else {
      void work;
    }

    return json({ buildId: build.id }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected backend error";
    console.error("[braino-code] start failed", message);
    const status = /not signed in/i.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});
