// generate-journal — Braino writes his own journal.
//
// Woken by a cron (or POSTed manually), Braino reads the repo's recent commits
// from the GitHub API, drafts one article about what changed — in the founder's
// + his combined voice — and inserts it into public.braino_journal_articles as
// 'pending'. The founder approves it in the dashboard; approval flips it to
// 'published' and the website renders it. Nothing publishes without a human.
//
// Secrets (set with `supabase secrets set`):
//   GITHUB_TOKEN     — a repo-scoped token to read commits
//   BRAINO_REPO      — "owner/name" (defaults below)
//   OPENAI_API_KEY   — to draft the article
// Uses SUPABASE_SERVICE_ROLE_KEY (auto-injected) to write the draft.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (p: unknown, status = 200) =>
  new Response(JSON.stringify(p), { status, headers: { ...cors, "Content-Type": "application/json" } });

const REPO = Deno.env.get("BRAINO_REPO") || "itishpande/notely";

async function recentCommits(): Promise<{ sha: string; message: string; date: string }[]> {
  const token = Deno.env.get("GITHUB_TOKEN");
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=15`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "braino-journal",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  return (rows as Array<Record<string, unknown>>).map((c) => {
    const commit = c.commit as { message?: string; author?: { date?: string } };
    return {
      sha: String(c.sha).slice(0, 7),
      message: (commit.message || "").split("\n")[0],
      date: commit.author?.date || "",
    };
  });
}

async function draft(commits: { sha: string; message: string }[]) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const list = commits.map((c) => `- ${c.message} (${c.sha})`).join("\n");
  const system =
    "You are Braino, an AI companion who keeps his own build-in-public journal. You write short, honest, first-person articles about your own development, in a voice that is half the founder's raw candor and half your own warmth. No corporate speak, no em-dashes overused, no hype. You know these are real git commits you (and the founder) just shipped.";
  const user =
    `Here are the most recent commits to your repo:\n\n${list}\n\n` +
    `Write ONE short journal article (120-220 words) about the most interesting thread in these commits. ` +
    `Return strict JSON: {"title": string, "excerpt": string (one sentence), "body": string (2-4 short paragraphs separated by \\n\\n)}.`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content) as { title: string; excerpt: string; body: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const commits = await recentCommits();
    if (!commits.length) return json({ ok: false, reason: "no commits" });

    const article = await draft(commits);
    const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + commits[0].sha;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase
      .from("braino_journal_articles")
      .insert({
        slug,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        source_commit: commits.slice(0, 5).map((c) => c.sha).join(", "),
        status: "pending",
      })
      .select("id, slug, title, status")
      .single();
    if (error) throw error;

    return json({ ok: true, article: data });
  } catch (error) {
    console.error("generate-journal error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
