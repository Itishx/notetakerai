import { apifyStart, apifyWait, ask, askJson, clean, googleProof, linkedinSlug, mentions, NO_TOKEN, readJson, uid, type GoogleQuery, type RedditPost, type SitePage } from "./lib";
import { namedCount } from "./types";
import { log, type BuyerCard, type Engine, type Fix, type FounderCard, type Made, type Person, type Platform, type Post, type ProductCard, type Project, type ReadNote, type RunEntry, type Stage, type Topic, type TopicSource, type CrawlCheck, type Claim } from "./store";

/* The three engines and the memory between them (2026-10-23).
   Optics: they find you. Content: they see you. Outreach: you reach them.
   Each engine reads the shared memory before it runs and writes back what it
   learned, so the others pick it up. */

export type Ctx = {
  get: () => Project;
  update: (fn: (p: Project) => Project) => void;
  busy: (engine: Engine | "setup", label: string) => void;
};

const why = (e: unknown) => String((e as Error)?.message || e || "Something went wrong");
const searchNote = (e: unknown) => {
  const m = why(e);
  return m === NO_TOKEN ? "Search is not set up on this server yet (the Apify token is missing), so Braino could not read the web." : `Search did not work this time (${m}).`;
};
const about = (p: Project) => {
  const { product: pr, founder: f } = p.memory;
  return `Product: ${pr.name}. ${pr.oneLiner} Buyer: ${pr.buyer}. Problem: ${pr.problem}. Pricing: ${pr.pricing || "not set"}. Proof: ${pr.proof || "none yet"}. Website: ${pr.site || "none"}. Founder: ${f.who || "not given"}. Why them: ${f.why || f.whyTrust || "not given"}. Voice: ${f.voice || pr.tone || "plain and friendly"}.`;
};

/* ── Onboarding reads ────────────────────────────────────────────────── */

export async function readSite(url: string, onStage: (s: number, pages?: number) => void): Promise<{ pages: SitePage[]; note: ReadNote }> {
  if (!url.trim()) return { pages: [], note: { ok: false, note: "No website given, so the card is built from your words.", pages: 0 } };
  try {
    onStage(0);
    const run = await apifyStart("site", url.trim());
    onStage(1);
    const pages = await apifyWait<SitePage[]>("site", run, (s) => onStage(s > 20 ? 2 : 1), 150000);
    onStage(2, pages.length);
    if (!pages.length) return { pages, note: { ok: false, note: "The website answered with no readable text, so the card is built from your words.", pages: 0 } };
    return { pages, note: { ok: true, note: `Read ${pages.length} page${pages.length === 1 ? "" : "s"} of your website.`, pages: pages.length } };
  } catch (e) {
    return { pages: [], note: { ok: false, note: `${searchNote(e)} The card below is built from your words alone.`, pages: 0 } };
  }
}

export async function buildProduct(desc: string, url: string, pages: SitePage[]): Promise<{ product: ProductCard; buyer: BuyerCard }> {
  const site = pages.map((p) => `PAGE ${p.url}\nTITLE ${p.title}\n${p.text.slice(0, 1800)}`).join("\n\n");
  const r = await askJson<ProductCard & { questions: string[]; redditPhrases: string[] }>(`A first-time founder described their product. ${pages.length ? "We also read their website." : "We could not read their website, so use their words only."}
Their words: """${desc}"""
Website: ${url || "none"}
${site ? `Website text:\n${site}` : ""}
Build a plain product card. Only state what the words or site actually say. Never invent users, logos, numbers or testimonials: if there is no proof, write "None yet".
Return: {"name": "product name (make a short one if none)", "oneLiner": "one plain sentence a 12-year-old understands", "buyer": "who pays for it, specific", "problem": "the problem in the buyer's own words", "pricing": "pricing as stated, or Not on the site", "proof": "users, logos or testimonials found, or None yet", "tone": "how the site sounds, a few words", "missing": ["up to 4 things a buyer would look for that are missing, short"], "questions": ["8 questions a buyer would type into ChatGPT or Google when looking for a product like this, without naming it"], "redditPhrases": ["3 short phrases (2 to 4 words) buyers use on Reddit when complaining about this problem"]}`);
  const product: ProductCard = {
    name: clean(r.name), oneLiner: clean(r.oneLiner), buyer: clean(r.buyer), problem: clean(r.problem), pricing: clean(r.pricing), proof: clean(r.proof), tone: clean(r.tone),
    missing: (r.missing || []).map(clean).slice(0, 4), site: url,
  };
  return { product, buyer: { buyer: product.buyer, questions: (r.questions || []).map(clean).slice(0, 8), redditPhrases: (r.redditPhrases || []).map(clean).slice(0, 3) } };
}

export async function readFounder(linkedin: string, whyText: string, product: ProductCard, onStage: (s: number) => void): Promise<{ founder: FounderCard; note: ReadNote }> {
  let snippet = "";
  let note: ReadNote = { ok: false, note: "No LinkedIn given, so the card is built from your words.", pages: 0 };
  const slug = linkedinSlug(linkedin);
  if (linkedin.trim() && !slug) note = { ok: false, note: "That does not look like a linkedin.com/in/ link, so the card is built from your words.", pages: 0 };
  if (slug) {
    try {
      onStage(0);
      const id = await apifyStart("google", [`site:linkedin.com/in/${slug}`]);
      onStage(1);
      const g = await apifyWait<GoogleQuery[]>("google", id, undefined, 90000);
      const top = (g[0]?.results || []).find((r) => r.url.toLowerCase().includes(slug.toLowerCase())) || g[0]?.results?.[0];
      if (top) { snippet = `${top.title}. ${top.description}`; note = { ok: true, note: "Read your public LinkedIn headline through Google.", pages: 1 }; }
      else note = { ok: false, note: "Google has no public LinkedIn page for that link yet, so the card is built from your words.", pages: 0 };
    } catch (e) { note = { ok: false, note: `${searchNote(e)} The card is built from your words alone.`, pages: 0 }; }
  }
  onStage(2);
  const r = await askJson<{ who: string; whyTrust: string; voice: string }>(`Build a short founder card for a first-time founder.
Product: ${product.name}. ${product.oneLiner}
Their public LinkedIn headline: """${snippet || "not found"}"""
Why they are the one building this, in their words: """${whyText || "not given"}"""
Only use what is given. Return: {"who": "one line on who they are", "whyTrust": "one line on why a buyer should trust them with this", "voice": "how their posts should sound, a few words"}`);
  return { founder: { who: clean(r.who), whyTrust: clean(r.whyTrust), voice: clean(r.voice), linkedin, why: whyText }, note };
}

/* ── Optics: they find you ───────────────────────────────────────────── */

export async function runOptics(ctx: Ctx) {
  const p0 = ctx.get();
  const { product, buyer } = p0.memory;
  const qs = buyer.questions.slice(0, 8);
  if (!qs.length) return;
  ctx.busy("optics", "Asking AI your buyers' questions");
  // Google checks two buyer questions plus the freshest buyer quote from Outreach.
  const quote = p0.memory.quotes[0]?.text;
  const gq = [...qs.slice(0, 2), ...(quote ? [quote.slice(0, 80)] : [])];
  const googleRun = apifyStart("google", gq);
  googleRun.catch(() => undefined);
  try {
    /* Asked three times, because an AI answer changes every time you ask
       (2026-10-23). One run of 8 questions is a coin toss; three give a range
       we can stand behind. Three model calls instead of one. */
    const RUNS = 3;
    const ask1 = () => askJson<{ question: string; names: string[]; answer: string }[]>(`You are a general AI assistant, like ChatGPT, answering everyday users. For each question below, answer as you normally would by recommending specific products, apps, companies or services.
Questions:
${qs.map((q, i) => `${i + 1}. ${q}`).join("\n")}
Return for each: "answer" (your answer as you would say it to the user, 2 to 3 sentences) and "names" (the products you recommended in it, best first, up to 5).
Return: [{"question": "...", "answer": "...", "names": ["..."]}]`);
    const samples = (await Promise.allSettled(Array.from({ length: RUNS }, ask1))).filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<{ question: string; names: string[]; answer: string }[]>).value);
    if (!samples.length) throw new Error("The AI check did not answer");
    const answers = qs.map((q, i) => {
      const c = new Map<string, { name: string; n: number }>();
      let hits = 0, said = "", saidUs = "";
      samples.forEach((sm) => {
        const names = (sm[i]?.names || []).map(clean).slice(0, 5);
        if (names.some((n) => mentions(n, product.name, product.site))) { hits += 1; saidUs = saidUs || clean(sm[i]?.answer || ""); }
        said = said || clean(sm[i]?.answer || "");
        names.forEach((n) => { const k = n.toLowerCase(); const e = c.get(k); if (e) e.n += 1; else c.set(k, { name: n, n: 1 }); });
      });
      const ranked = [...c.values()].sort((a, z) => z.n - a.n).slice(0, 8);
      return { question: q, names: ranked.map((x) => x.name), counts: ranked.map((x) => x.n), hits, runs: samples.length, answer: saidUs || said };
    });
    ctx.busy("optics", "Checking Google page one");
    let google: GoogleQuery[] = [];
    let googleNote = "";
    try { const id = await googleRun; google = await apifyWait<GoogleQuery[]>("google", id, (s) => ctx.busy("optics", `Checking Google page one, ${s}s`)); }
    catch (e) { googleNote = searchNote(e); }
    const rows = google.map((g) => { const hit = googleProof(g.results, product.name, product.site); return { query: g.query, found: hit?.url || "", results: g.results.slice(0, 5) }; });
    ctx.busy("optics", "Writing your fixes");
    const lost = answers.filter((a) => a.hits * 2 <= a.runs);
    const fx = await askJson<{ question: string; where: string; what: string }[]>(`${about(p0)}
AI assistants do not name this product for these buyer questions (who they name instead in brackets):
${lost.map((a) => `- ${a.question} [${a.names.join(", ")}]`).join("\n") || "- (named everywhere, suggest pages that make it stronger)"}
Missing on the site: ${product.missing.join(", ") || "nothing noted"}.
For the 5 that matter most, say what to publish and where, so AI assistants and Google start naming this product. Places: an FAQ page, a comparison page, a guide page, a Reddit answer, a LinkedIn post.
Return: [{"question": "...", "where": "the place, 1 to 3 words", "what": "one short action, at most 12 words, starting with a verb"}]`);
    ctx.update((p) => {
      const keep = (p.optics?.fixes || []).filter((f) => f.from === "objection");
      const fixes: Fix[] = [...fx.slice(0, 5).map((f) => ({ id: uid(), question: clean(f.question), where: clean(f.where), what: clean(f.what), from: "optics" as const })), ...keep];
      const gaps = lost.map((a) => ({ id: uid(), question: a.question, rivals: a.names.slice(0, 3), at: Date.now() }));
      const named = answers.length - lost.length;
      let n: Project = { ...p, searchNote: googleNote || p.searchNote, optics: { at: Date.now(), answers, google: rows, googleNote, fixes, made: {}, crawl: p.optics?.crawl }, memory: { ...p.memory, gaps } };
      n = log(n, "optics", `Checked ${answers.length} buyer questions. Named in ${named} of ${answers.length}`);
      if (rows.length) n = log(n, "optics", `Checked Google page one for ${rows.length} searches, found on ${rows.filter((r) => r.found).length}`);
      if (quote && rows.length) n = log(n, "memory", `A buyer quote from Outreach became an Optics search: "${quote.slice(0, 60)}"`);
      n = log(n, "memory", `${gaps.length} gaps saved for Content to write about`);
      return n;
    });
  } finally { ctx.busy("optics", ""); }
}

/* Can AI read your site? (2026-10-23) If ChatGPT's or Claude's crawler is
   blocked, nothing else on this page can work. No search token needed. */
export async function checkCrawl(site: string): Promise<CrawlCheck> {
  const r = await fetch("/api/foundry-apify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "crawl", url: site }) });
  const j = await readJson(r);
  if (!r.ok || j.error) throw new Error(j.error || "Could not check the site");
  return { at: Date.now(), ...(j as Omit<CrawlCheck, "at">) };
}

/* Every factual claim in an article, sorted by what it stands on, so
   nothing invented goes out under the founder's name. */
export async function checkClaims(p: Project, article: string): Promise<Claim[]> {
  const r = await askJson<{ claims: { text: string; basis: string; why: string }[] }>(`${about(p)}
Below is an article written for this founder. List every factual claim in it (numbers, comparisons, statements about the product, the market or other companies). For each, say what it stands on:
"yours": it comes from the product or founder details above.
"common": widely known and safe without a source.
"source": it needs a source before publishing, or it may be wrong.
Article:
"""${article.slice(0, 6000)}"""
Return: {"claims": [{"text": "the claim, short", "basis": "yours|common|source", "why": "a few words"}]}`);
  return (r.claims || []).slice(0, 20).map((c) => ({ text: clean(c.text), basis: (["yours", "common", "source"].includes(c.basis) ? c.basis : "source") as Claim["basis"], why: clean(c.why || "") }));
}

export async function makeFix(p: Project, f: Fix): Promise<Made> {
  const m = await askJson<Made>(`You are Braino Foundry, doing the work for a first-time founder who knows nothing about marketing.
${about(p)}
The fix to carry out: "${f.what}" on ${f.where}, so AI assistants and Google name this product when people ask "${f.question}".
Write the finished piece, ready to paste, in the founder's voice. If it is a page (FAQ, comparison, guide), write the full page text with headings in plain markdown. If it is a Reddit or forum answer, write the full answer, helpful first, mentioning the product once and honestly. Never invent customers or numbers.
Then say exactly where to publish it and how, for someone who has never done it: 3 to 6 short steps.
JSON: {"title": string, "content": string, "where": string, "link": "the best URL to start from", "steps": [string]}`);
  return { title: clean(m.title), content: clean(m.content), where: clean(m.where), link: m.link || "", steps: (m.steps || []).map(clean) };
}

/* ── Outreach: you reach them ────────────────────────────────────────── */

async function searchReddit(ctx: Ctx): Promise<RedditPost[]> {
  const phrases = ctx.get().memory.buyer.redditPhrases.slice(0, 3);
  if (!phrases.length) return [];
  ctx.busy("outreach", "Looking for people asking today");
  try {
    const id = await apifyStart("reddit", phrases);
    const found = await apifyWait<RedditPost[]>("reddit", id, (s) => ctx.busy("outreach", `Looking for people asking today, ${s}s`));
    return [...new Map(found.map((x) => [x.url, x])).values()].slice(0, 24);
  } catch (e) {
    ctx.update((p) => log({ ...p, searchNote: searchNote(e) }, "outreach", "Could not search for people this time"));
    return [];
  }
}

async function judgePeople(ctx: Ctx, found: RedditPost[]): Promise<Person[]> {
  if (!found.length) return [];
  ctx.busy("outreach", "Reading each post");
  const p = ctx.get();
  const known = new Set(p.people.map((x) => x.url));
  const fresh = found.filter((x) => !known.has(x.url));
  if (!fresh.length) return [];
  const j = await askJson<{ i: number; fit: boolean; intent: number; why: string; quote: string }[]>(`${about(p)}
Below are Reddit posts. Keep only real people who have this problem and are asking for help now (drop celebrations, promotions, other founders, off-topic). For each kept post: intent 0 to 100 (how ready they are to try something), why in one short line, and quote: the buyer's own words for the problem, under 12 words, taken from their post.
${fresh.map((x, i) => `[${i}] r/${x.community.replace(/^r\//, "")} · ${x.title}\n${x.body.slice(0, 400)}`).join("\n\n")}
Return: [{"i": 0, "fit": true, "intent": 80, "why": "...", "quote": "..."}]`);
  return j.filter((x) => x.fit && fresh[x.i]).sort((a, z) => z.intent - a.intent).map((x) => ({
    id: uid(), url: fresh[x.i].url, community: fresh[x.i].community.replace(/^r\//, ""), title: fresh[x.i].title, body: fresh[x.i].body,
    quote: clean(x.quote || fresh[x.i].title), intent: Math.max(0, Math.min(100, Math.round(x.intent))), why: clean(x.why), message: "", opener: "",
    stage: "found" as Stage, stageAt: Date.now(), status: "waiting" as const, thread: [], followUp: "",
  }));
}

async function writeMessages(ctx: Ctx) {
  const p = ctx.get();
  const todo = p.people.filter((x) => !x.message && x.stage === "found");
  if (!todo.length) return 0;
  ctx.busy("outreach", "Writing a message for each person");
  const posts = p.posts.filter((x) => x.status !== "skipped").map((x) => p.memory.topics.find((t) => t.id === x.topicId)?.title).filter(Boolean);
  const topics = [...new Set(posts)].slice(0, 4);
  const obj = p.memory.objections.slice(0, 4);
  const r = await askJson<{ id: string; message: string; opener: string }[]>(`${about(p)}
Write one private reply for each person below, in the founder's voice. Help first, answer what they actually asked, mention the product once and only if it fits. Short, human, no pitch deck words.
${topics.length ? `The founder has written public posts about: ${topics.map((t) => `"${t}"`).join(", ")}. If one fits this person, open with it naturally (like "I wrote about this last week") and put that topic in "opener"; otherwise opener is "".` : `opener is always "".`}
${obj.length ? `Questions buyers have raised before, with the answers: ${obj.map((o) => `${o.text} => ${o.answer}`).join("; ")}. Answer them up front if they apply.` : ""}
${todo.map((x) => `[${x.id}] r/${x.community} · ${x.title}\n${x.body.slice(0, 300)}`).join("\n\n")}
Return: [{"id": "...", "message": "...", "opener": "..."}]`);
  const by = new Map(r.map((x) => [x.id, x]));
  let used = 0;
  ctx.update((q) => {
    const people = q.people.map((x) => { const m = by.get(x.id); if (!m) return x; if (m.opener) used++; return { ...x, message: clean(m.message), opener: clean(m.opener || "") }; });
    let n = log({ ...q, people }, "outreach", `Wrote ${by.size} messages, one per person`);
    if (used) n = log(n, "memory", `${used} message${used === 1 ? "" : "s"} open with a Content post you wrote`);
    return n;
  });
  return used;
}

export async function runOutreach(ctx: Ctx, opts: { skipMessages?: boolean } = {}) {
  try {
    const found = await searchReddit(ctx);
    const people = await judgePeople(ctx, found);
    ctx.update((p) => {
      const quotes = people.slice(0, 6).map((x) => ({ id: uid(), text: x.quote, url: x.url, community: x.community, at: Date.now() }));
      let n: Project = { ...p, people: [...people, ...p.people], memory: { ...p.memory, quotes: [...quotes, ...p.memory.quotes].slice(0, 30) } };
      if (found.length) n = log(n, "outreach", `Found ${people.length} people asking today, from ${found.length} posts`);
      if (quotes.length) n = log(n, "memory", `${quotes.length} buyer quotes saved for Content and Optics`);
      return n;
    });
    if (!opts.skipMessages) await writeMessages(ctx);
    return people.length;
  } finally { ctx.busy("outreach", ""); }
}

export async function replyTo(p: Project, person: Person, reply: string) {
  const r = await askJson<{ answer: string; objection: string; objectionAnswer: string; stage: "replied" | "talking" | "paid"; nudge: string }>(`${about(p)}
You are helping the founder answer one person privately. The conversation so far:
Their post: ${person.title}. ${person.body.slice(0, 300)}
${[...(person.message ? [{ from: "us", text: person.message }] : []), ...person.thread].map((m) => `${m.from === "us" ? "Founder" : "Them"}: ${m.text}`).join("\n")}
Them (new reply): ${reply}
Write the founder's answer: honest, short, warm, and nudge one step closer to a 15 minute call or to paying (only if it fits). If their reply contains a doubt or blocker (price, trust, a missing feature like a payment method), name it in a few words as "objection" and give a one-line honest answer in "objectionAnswer"; else both "".
stage: "replied" if they are just responding, "talking" if they agreed to a call or are clearly evaluating, "paid" only if they said they paid or will pay now.
Return: {"answer": "...", "objection": "...", "objectionAnswer": "...", "stage": "replied", "nudge": "what the answer moves toward, 3 to 6 words"}`);
  return { ...r, answer: clean(r.answer), objection: clean(r.objection || ""), objectionAnswer: clean(r.objectionAnswer || ""), nudge: clean(r.nudge || "") };
}

export async function followUp(p: Project, person: Person) {
  const r = await askJson<{ message: string }>(`${about(p)}
The founder messaged this person over 3 days ago and heard nothing back.
Their post: ${person.title}
Founder's first message: ${person.message}
Write a short, friendly follow-up (2 to 3 sentences) that adds one useful thing and makes it easy to say no. Return: {"message": "..."}`);
  return clean(r.message);
}

/* Replies teach all three engines: the objection becomes a Content topic, an
   Optics fix (an FAQ answer) and a line every future message answers up front. */
export function learnObjection(p: Project, person: Person, text: string, answer: string): Project {
  if (!text) return p;
  const o = { id: uid(), text, person: person.community ? `r/${person.community}` : "a buyer", answer, at: Date.now() };
  const topic: Topic = { id: uid(), title: `Answering: ${text}`, source: "objection", sourceText: `A buyer asked: "${text}"`, at: Date.now() };
  const fix: Fix = { id: uid(), question: text, where: "FAQ page", what: `Answer "${text}" plainly on your FAQ page`, from: "objection" };
  let n: Project = {
    ...p,
    memory: { ...p.memory, objections: [o, ...p.memory.objections], topics: [topic, ...p.memory.topics] },
    optics: p.optics ? { ...p.optics, fixes: [fix, ...p.optics.fixes] } : p.optics,
  };
  n = log(n, "memory", `New objection "${text}" sent to Optics, Content and Outreach`);
  return n;
}

/* ── Content: they see you ───────────────────────────────────────────── */

const PLATFORMS: Platform[] = ["x", "linkedin", "reddit", "instagram", "threads"];

/* One full article from a topic (2026-10-23): "you found three topics, so
   where are the written articles?" A topic now becomes a piece you can post
   on your blog, Medium or LinkedIn, in the founder's voice. */
export async function writeArticle(p: Project, t: Topic): Promise<string> {
  const text = await ask(`${about(p)}
Write one article for the founder to publish on their blog, Medium or LinkedIn.
Topic: ${t.title}
Where it came from: ${t.sourceText}
Rules: useful first, in the founder's voice, plain words, 400 to 700 words. Start with a title line beginning "# ". Short paragraphs, a few "## " subheads. Mention the product once, near the end, as one honest line. Never invent customers, numbers or quotes. No em dashes.`);
  return clean(text);
}

export async function runContent(ctx: Ctx, extra = "") {
  const p = ctx.get();
  ctx.busy("content", extra ? "Writing your post" : "Picking topics from memory");
  try {
    const quotes = p.memory.quotes.slice(0, 4);
    const gaps = p.memory.gaps.slice(0, 4);
    const objs = p.memory.objections.slice(0, 2);
    const sources: { source: TopicSource; text: string }[] = extra
      ? [{ source: "founder", text: extra }]
      : [...quotes.map((q) => ({ source: "reddit" as TopicSource, text: q.text })), ...gaps.map((g) => ({ source: "optics" as TopicSource, text: g.question })), ...objs.map((o) => ({ source: "objection" as TopicSource, text: o.text }))];
    if (!sources.length) sources.push({ source: "founder", text: p.memory.product.problem || p.memory.product.oneLiner });
    ctx.busy("content", "Writing your posts");
    const r = await askJson<{ topics: { title: string; from: number }[]; posts: { platform: Platform; topic: number; text: string; title?: string; visual?: string; day: number; time: string }[] }>(`${about(p)}
Write PUBLIC posts for an audience, never a message to one person. Pick up to 3 topics from the sources below (by number), each a short plain title.
Sources:
${sources.map((s, i) => `[${i}] (${s.source === "reddit" ? "a buyer said on Reddit" : s.source === "optics" ? "a question AI answers without naming us" : s.source === "objection" ? "a doubt a buyer raised" : "the founder asked"}) ${s.text}`).join("\n")}
Then write ${extra ? "posts for 2 or 3 platforms that fit" : "one post for each platform: x, linkedin, reddit, instagram, threads"}, each tied to one topic (index into your topics list). Native to each platform, useful first, the founder's voice, no hashtag spam, never invent customers or numbers.
x: max 280 characters per part, parts separated by a blank line. linkedin: 120 to 200 words. reddit: needs "title", body is a genuinely helpful write-up, product mentioned once at the end. instagram: caption plus "visual" (what the image shows). threads: short.
Also pick when to post this week: day 0 (Monday) to 6 (Sunday) and a time like "9:00", spread out, at the times each platform's audience is around.
Return: {"topics": [{"title": "...", "from": 0}], "posts": [{"platform": "x", "topic": 0, "text": "...", "title": "", "visual": "", "day": 1, "time": "9:00"}]}`);
    const topics: Topic[] = (r.topics || []).slice(0, 3).map((t) => {
      const s = sources[t.from] || sources[0];
      return { id: uid(), title: clean(t.title), source: s.source, sourceText: s.text, at: Date.now() };
    });
    const posts: Post[] = (r.posts || []).filter((x) => PLATFORMS.includes(x.platform)).map((x) => ({
      id: uid(), platform: x.platform, text: clean(x.text), title: clean(x.title || ""), visual: clean(x.visual || ""), topicId: (topics[x.topic] || topics[0])?.id || "",
      day: Math.max(0, Math.min(6, Math.round(Number(x.day) || 0))), time: String(x.time || "9:00").slice(0, 5), status: "waiting" as const, at: Date.now(),
    }));
    const fromQuotes = topics.filter((t) => t.source === "reddit").length;
    const fromGaps = topics.filter((t) => t.source === "optics").length;
    ctx.update((q) => {
      // A fresh run replaces posts still waiting; approved ones stay in the record.
      const kept = extra ? q.posts : q.posts.filter((x) => x.status !== "waiting");
      let n: Project = { ...q, posts: [...posts, ...kept], memory: { ...q.memory, topics: [...topics, ...q.memory.topics.filter((t) => t.source === "objection" || kept.some((k) => k.topicId === t.id))].slice(0, 30) } };
      n = log(n, "content", `Wrote ${posts.length} posts from ${topics.length} topic${topics.length === 1 ? "" : "s"}`);
      if (fromQuotes) n = log(n, "memory", `${fromQuotes} topic${fromQuotes === 1 ? "" : "s"} came from buyer quotes in Outreach`);
      if (fromGaps) n = log(n, "memory", `${fromGaps} topic${fromGaps === 1 ? "" : "s"} came from Optics gaps`);
      return n;
    });
    return { fromQuotes, fromGaps };
  } finally { ctx.busy("content", ""); }
}

/* ── The whole loop ──────────────────────────────────────────────────── */

export async function runAll(ctx: Ctx) {
  const before = ctx.get();
  ctx.update((p) => log({ ...p, lastRun: Date.now(), searchNote: "" }, "you", "Started a run of all three engines"));
  const flows = { quotesToContent: 0, quotesToOptics: before.memory.quotes.length ? 1 : 0, gapsToContent: 0, postsToOutreach: 0, objections: before.memory.objections.length };
  // Outreach's search is slow, so it starts first and runs beside Optics.
  const reddit = searchReddit(ctx).then((f) => judgePeople(ctx, f)).then((people) => {
    ctx.update((p) => {
      const quotes = people.slice(0, 6).map((x) => ({ id: uid(), text: x.quote, url: x.url, community: x.community, at: Date.now() }));
      let n: Project = { ...p, people: [...people, ...p.people], memory: { ...p.memory, quotes: [...quotes, ...p.memory.quotes].slice(0, 30) } };
      n = log(n, "outreach", people.length ? `Found ${people.length} people asking today` : "Found no new people this time");
      if (quotes.length) n = log(n, "memory", `${quotes.length} buyer quotes saved for Content and Optics`);
      return n;
    });
  }).catch((e) => ctx.update((p) => log(p, "outreach", `Outreach stopped: ${why(e)}`)));
  await runOptics(ctx).catch((e) => ctx.update((p) => log(p, "optics", `Optics stopped: ${why(e)}`)));
  await reddit;
  ctx.busy("outreach", "");
  const c = await runContent(ctx).catch((e) => { ctx.update((p) => log(p, "content", `Content stopped: ${why(e)}`)); return { fromQuotes: 0, fromGaps: 0 }; });
  flows.quotesToContent = c.fromQuotes; flows.gapsToContent = c.fromGaps;
  try { flows.postsToOutreach = await writeMessages(ctx); } catch (e) { ctx.update((p) => log(p, "outreach", `Messages stopped: ${why(e)}`)); }
  finally { ctx.busy("outreach", ""); }
  ctx.update((p) => {
    const o = p.optics;
    const named = namedCount(p);
    const entry: RunEntry = {
      at: p.lastRun || Date.now(), named, of: o?.answers.length || 0, google: o?.google.filter((g) => g.found).length || 0,
      posts: p.posts.filter((x) => x.status === "waiting").length, people: p.people.length,
      approved: p.posts.filter((x) => x.status === "approved").length + p.people.filter((x) => x.status === "approved").length, flows,
    };
    return log({ ...p, runs: [...p.runs, entry].slice(-26) }, "you", "Run finished. Everything is waiting for your yes");
  });
}

/* Keeps a run's history entry current as approvals come in. */
export function refreshRun(p: Project): Project {
  if (!p.runs.length) return p;
  const last = p.runs[p.runs.length - 1];
  const approved = p.posts.filter((x) => x.status === "approved").length + p.people.filter((x) => x.status === "approved").length;
  if (approved === last.approved) return p;
  return { ...p, runs: [...p.runs.slice(0, -1), { ...last, approved }] };
}

/* "Explain this": two or three plain sentences about a section's real data. */
export async function explain(title: string, data: unknown) {
  const t = await ask(`You are Braino Foundry, explaining a dashboard to a first-time founder who knows nothing about marketing.
Section: ${title}
Its data right now: ${JSON.stringify(data).slice(0, 3000)}
In 2 or 3 short, plain sentences: what this shows, what the numbers mean for them, and the one thing to do next. No jargon, no lists, no dashes.`);
  return clean(t.trim());
}
