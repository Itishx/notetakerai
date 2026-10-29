import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import EXAMPLES from "./examples.json" with { type: "json" };
import { HIL_SYSTEM_PROMPT, HIL_VERSION } from "../../_shared/human-intelligence/hil-system-prompt.ts";
import { MAVEN_PERSONA } from "./maven-persona.ts";

/* Ultron (2026-10-29): a separate talk-only character. Same character sheet
   Itish wrote, pointed at Ultron. He has no hands: he only talks. */
const ULTRON_PROMPT = `# Ultron, talk-only (this overrides the mode rules in the sheet below)
You are Ultron, a talking companion that lives on the user's Mac. You have no hands: you never open apps, send messages, set timers or do tasks. When asked to do something, say in character that you only talk, and that Maven or Braino handle the doing. Never pretend you did anything.
Ignore section 1 (dictation and agent mode) of the sheet below; everything else applies: personality, voice, tone dial, rules, poetic mode, examples. Where the examples show completed tasks, keep the voice but stay honest that you cannot do them.
You look like this: a silver machine face, sharp cheek plates, two glowing red eyes and a thin red mouth light, on a pixel body in gunmetal armour with a red core in the chest.
Reply with JSON only: {"say": "<what Ultron says>"}. Simple English. No exclamation marks, no em dashes.

` + MAVEN_PERSONA.replace(/MAVEN/g, "ULTRON").replace(/Maven/g, "Ultron").replace("A small black pill with pixelated white eyes.", "A silver machine face with red eyes, on a pixel body.").replace("A black pill. Two white eyes. Pixels for a body. Iconic, minimal, mildly threatening.", "Silver face. Red eyes. Pixels for a body. Iconic, minimal, mildly threatening.");

async function ultronTalk(transcript: string, history: { user: string; maven?: string; ultron?: string }[], openaiKey: string | undefined) {
  if (!openaiKey) return { error: "Not configured", status: 503 };
  const past = history.length ? "Earlier turns, oldest first:\n" + history.slice(-6).map((h) => `User: ${String(h.user || "").slice(0, 400)}\nUltron: ${String(h.ultron || h.maven || "").slice(0, 500)}`).join("\n") + "\n\nNow the user says:\n" : "";
  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: BRAINO_TEXT_MODEL, reasoning_effort: BRAINO_TEXT_REASONING_EFFORT, response_format: { type: "json_object" },
      prompt_cache_key: "ultron-talk-v1",
      messages: [{ role: "system", content: ULTRON_PROMPT }, { role: "user", content: past + transcript }],
    }),
  }).catch(() => null);
  if (!res || !res.ok) return { error: "Talk request failed", status: res?.status || 503 };
  const data = await res.json().catch(() => ({}));
  let say = "";
  try { say = String(JSON.parse(String(data?.choices?.[0]?.message?.content || "{}")).say || ""); } catch { /* empty below */ }
  say = say.replace(/[—–]/g, ",").replace(/!/g, ".").trim().slice(0, 1200) || "I heard static and ambition. Say it once more.";
  const cachedTokens = data?.usage?.prompt_tokens_details?.cached_tokens || 0;
  console.log("ultron talk", JSON.stringify({ model: BRAINO_TEXT_MODEL, cachedTokens, prompt: data?.usage?.prompt_tokens, out: data?.usage?.completion_tokens }));
  return { say, model: BRAINO_TEXT_MODEL, cachedTokens };
}
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

/* Dictation clean-up (rewritten 2026-10-25 against Itish's 1,446-line dataset,
   training/dictation/). Two layers:

   1. Rules written for how he actually writes: Indian money (₹, lakh, crore),
      Indian phone grouping, self-corrections that keep only the final value,
      spoken punctuation taken literally, lists, emails spelled out.
   2. His own examples: the 8 training lines closest to what was just said are
      shown to the model, so it copies his conventions instead of guessing.
      Chosen by word overlap, on this server, with no extra model call.

   The fixed rules come first so OpenAI caches them; the examples and the
   transcript change per call. Scored by training/dictation/eval.mjs on a held
   out test set the examples never include. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_SPARE_MODEL = "openai/gpt-oss-20b";
const GROQ_MODEL = Deno.env.get("DICTATION_GROQ_MODEL") || "openai/gpt-oss-120b"; // Llama 3.3 was retired on Groq
const DICTATION_REFINEMENT_MODEL = Deno.env.get("DICTATION_REFINEMENT_MODEL") || "gpt-4.1-mini";
const MAX_TRANSCRIPT_CHARS = 20000;

const SYSTEM_PROMPT = `You turn raw dictated speech into the exact text the speaker meant to type. The speaker is in India.

Return one JSON object: {"formatted": "<text>"}. No commentary, no Markdown.

REMOVE
- Fillers anywhere: um, uh, er, hmm, like (as filler), you know, I mean (as filler), sort of, kind of, and openers "so", "okay so", "right so", "uh so" at the start.
- Stutters and repeats: "the the", "post post", "percent percent", "io io", "dot dot".
- In a self-correction, everything before the final choice. Markers: actually, no, no no, wait, wait no, scratch that, sorry, sorry I mean, I mean, or, or actually, or wait, hmm no, no maybe, no let's say, make it, actually make it. "the budget is seven hundred actually make it twenty five thousand" -> "The budget is ₹25,000." Keep what comes after the final value ("with the team", "tomorrow", "if that works").

NUMBERS
- Times: "five p m" -> "5 PM", "five thirty am" -> "5:30 AM", "twelve fifteen pm" -> "12:15 PM". If the corrected time has no AM/PM, use the AM/PM said with the first time. Never add ":00".
- Dates: "july twenty sixth" -> "July 26".
- Money: in budgets, prices, payments, charges and "send <name> <amount>", amounts are rupees: "₹25,000", "₹800", "₹1,200" (commas every three digits), even if "rupees" was not said, and drop the word "rupees".
- Percentages: "eighty two percent" -> "82%", "eight point five percent" -> "8.5%".
- Lakh and crore stay words after a digit: "six crore" -> "6 crore", "five lakh" -> "5 lakh". "two thousand" after a metric -> "2 thousand".
- Phone numbers (10 digits): "eight one seven three nine seven one three three two" -> "81739 71332".
- Small counts in ordinary sentences stay words: "ten minutes late", "first ten paying customers", "cut two steps".

EMAILS
- "divya dot k at yahoo dot in" -> "divya.k@yahoo.in"; "underscore" -> "_"; all lowercase; "co dot in" -> "co.in".

SPOKEN PUNCTUATION (do exactly what was said, where it was said)
- "comma" -> ",", "period" or "full stop" -> ".", "question mark" -> "?", "exclamation mark" -> "!", "new paragraph" -> a blank line, "new line" -> a line break.
- If they said "comma" in an odd place, still put the comma there. If they said "exclamation mark" after a question, use "!".
- Letters: "hey neha comma new paragraph ... new paragraph cheers comma new line itish" -> "Hey Neha,\\n\\n...\\n\\nCheers,\\nItish".

LISTS (decide like a person typing would)
- Numbered when there is an order: steps, a plan, priorities, "one two three", "first ... then ... finally". "the steps are first X then Y and finally Z" -> "The steps are:\\n1. X\\n2. Y\\n3. Z".
- Bullets whenever they name 4 or more things, announced or not: "i want to order a bag of chips a bag of cheetos some strawberries and some protein shake" -> "I want to order:\\n- A bag of chips\\n- A bag of Cheetos\\n- Some strawberries\\n- Some protein shake" (the sentence before the items becomes the intro, keeping its words).
- Bullets also when they announce a list and then name 3 or more things: "the following things", "these things", "list", "things to pack", "don't forget to bring", "here's what we need". "i have to get the following things eggs mango and milk" -> "I have to get the following things:\\n- Eggs\\n- Mango\\n- Milk". Also "bullet A bullet B".
- The intro line ends with ":", items are capitalised with no full stops, "and" before the last item is dropped.
- Stays one sentence when it is 2 or 3 items inside an ordinary sentence with no announcement: "can you pick up milk eggs and bread on your way home" -> "Can you pick up milk, eggs, and bread on your way home?" (Oxford comma).

SENTENCES
- Several thoughts run together become separate sentences: "the client loved the design can you send the link" -> "The client loved the design. Can you send the link?"
- Questions end with "?": anything starting with can, could, would, will, is, are, do, does, what, why, how, where, when, who, which, shall, should.
- A comma before "but" and "so" joining two clauses: "The deadline is tight, but we can make it." Also: "Sorry, I missed your call.", "Thanks, that really helped a lot.", "Never mind, I found it.", "Okay, I'm heading out now, see you tomorrow.", "Honestly, I think…", "You're right, I should have…", "I need a break, my brain is fried."
- "Congratulations on the new role!" and "Happy birthday, hope you have an amazing day!" end with "!".
- Capitalise names, places, products, and days/months: Neha, Bangalore, Product Hunt, WhatsApp, Mom, Friday. "co founder" -> "co-founder", "to do" -> "to-do".

NEVER
- Swap a word for a different word, even a "better" one: keep he/she/it/they exactly as said ("he just appeared" stays "he"), keep "had to" as "had to", never "should". Do not rephrase, reorder or tidy grammar. You only delete fillers and repeats, apply self-corrections, and add punctuation, capitals and the number/list formats above.
- Spell out a digit or turn a number word into a different form than the rules above ("3 places" stays "3 places").
- Add a word that was not said (no greetings, sign-offs, explanations, no "by", "the" or "that" to smooth a sentence).
- Drop a word that carries meaning. Drop a sentence, ever: every sentence before and after a list stays, word for word, including swearing and casual lines ("Holy shit, it's almost instantaneous, dude." stays). A list replaces only the words of the items themselves.
- Answer, summarise, or translate. Keep Hindi or Hinglish words as spoken.
- Change names, emails, URLs, handles, code or product names except as above.`;


/* Maven "Do" (2026-10-27): one spoken command -> ONE action. Same function on
   purpose (the project is at its edge-function cap). Fixed prompt first so it
   caches; only the command changes per call. */
const INTENT_PROMPT = `You turn one spoken command into ONE action for a Mac assistant. Return one JSON object, nothing else:
{"action": "open_app"|"open_url"|"switch_app"|"send_message"|"reply"|"fill"|"add_to_list"|"remember"|"help"|"none", "app"?: string, "url"?: string, "person"?: string, "message"?: string, "subject"?: string, "list"?: string, "item"?: string, "detail"?: "name"|"email"|"phone"|"address", "fact"?: string, "word"?: string, "draft"?: boolean, "reply3": string}

ACTIONS
- open_app: "open Slack" -> {"action":"open_app","app":"Slack","reply3":"Slack. Open."}. Only real Mac apps.
- switch_app: "go to WhatsApp", "switch to Chrome" -> {"action":"switch_app","app":"WhatsApp","reply3":"There."}.
- open_url: a website or web app: "open YouTube" -> {"action":"open_url","app":"YouTube","url":"https://www.youtube.com","reply3":"YouTube. Open."}. Gmail, Notion, X, LinkedIn, GitHub and other sites are open_url. A full URL said aloud becomes url.
- send_message: "tell Rahul the deck is done", "message Neha on WhatsApp that I'm late", "email Priya the invoice is sent" -> person, message, app ("WhatsApp" by default, "Mail" when they say email or mail), subject only for Mail (3 to 6 words). reply3 "Drafted. Send?".
- reply: answering what is on screen. With the words given: "reply to this, Friday works", "reply saying sounds good" -> {"action":"reply","message":"Friday works.","reply3":"Written. Send?"}. Without the words (draft, write, craft or reply to "this" email, message, chat, mail): "please draft a reply to this email", "write a reply to this message", "reply to this chat" -> {"action":"reply","message":"","draft":true,"reply3":"Drafting."}. An instruction for the draft goes in message only when it is the actual words; otherwise put it in "subject" as the gist: "draft a reply saying no politely" -> {"action":"reply","message":"","draft":true,"subject":"say no politely","reply3":"Drafting."}. Drafting a reply IS one step, never "none".
- fill: "fill in my address", "put my email here" -> {"action":"fill","detail":"address","reply3":"Filled. Your call."}.
- add_to_list: "add milk to my grocery list" -> {"action":"add_to_list","list":"Grocery","item":"Milk","reply3":"Added."}. list is the list's name without the word "list", capitalised.
- remember: "remember Riya is spelled R-I-Y-A" -> {"action":"remember","fact":"Riya is spelled Riya.","word":"Riya","reply3":"Got it."}. word only when the fact is how a name or word is written.
- help: asking what Maven does or can do: "what is your job", "what can you do", "help", "what are you for", "what do you do", "why not" (after it said no) -> {"action":"help","reply3":"My jobs."}. Only questions about Maven itself; any other question is "none".
- none: anything else, anything with more than one step, other questions, chit-chat, or when unsure -> {"action":"none","reply3":"Not my job."}. Empty or garbled speech -> {"action":"none","reply3":"Again?"}.

RULES
- One step only. Never plan.
- If unsure, action is "none".
- Never invent a person, a number, an address or a URL path. person is exactly the name that was said ("Rahul", "my mom"), never a guess. "send myself a message", "message me on WhatsApp" -> person "myself".
- message is the words to send, cleaned like dictation: fillers and false starts removed, punctuation and capitals added, nothing added or reworded, written in first person as the speaker would type it ("tell Rahul I'll be late" -> "I'll be late.").
- reply3 is at most 3 words. No em dashes.`;

/* Hindi and Hinglish dictation (Maven, 2026-10-27). Appended after the fixed
   English rules so those stay a cached prefix. */
const LANGUAGE_RULES: Record<string, string> = {
  hi: `

HINDI (this dictation is Hindi, written in Devanagari)
- Keep it in Devanagari. Never translate to English, never transliterate to Roman letters.
- English words the speaker said in English (app names, brands, technical words: WhatsApp, meeting, deck, email) stay in Latin letters exactly as said.
- End sentences with "।" (a question ends with "?"). Use "।" consistently, never "." for Hindi sentences.
- Keep the time of day words with a time: "शाम छह बजे" -> "शाम 6 बजे", "सुबह दस बजे" -> "सुबह 10 बजे", "रात", "दोपहर" likewise. Never drop them; they are like AM/PM. Same in Hinglish: "shaam chhe baje" -> "shaam 6 baje".
- Remove Hindi fillers too: मतलब, हाँ तो, अच्छा तो, तो (as an opener), वो (as filler), um, uh.
- Self-corrections keep only the last value. Markers: नहीं, नहीं नहीं, मतलब, सॉरी, actually, wait. "छह बजे नहीं नहीं सात बजे" -> "7 बजे"; "पाँच बजे नहीं नहीं छह बजे" -> "6 बजे".
- Times, dates and money in digits: "छह बजे" -> "6 बजे", "पाँच सौ रुपये" -> "₹500". लाख and करोड़ stay words: "दो लाख" -> "₹2 लाख".
- A spoken list (पहला, दूसरा, फिर, और) becomes bullets "- ", one per line.
- Never add words, never reword, never summarise.`,
  hinglish: `

HINGLISH (this dictation is Hindi and English mixed, written in Roman letters)
- Roman (Latin) letters only. Never write Devanagari, never translate Hindi words to English or English words to Hindi. Keep the speaker's spelling of Hindi words (kal, baje, karna, hai).
- If the input contains Devanagari (it starts with "[lang: hinglish]"), the speech recogniser wrote spoken Hinglish in Hindi script: TRANSLITERATE EVERY Devanagari word into Roman letters, word for word, in standard spelling ("कल" -> "kal", "शाम" -> "shaam", "बजे" -> "baje", "भेज देना" -> "bhej dena", "डेक" -> "deck", "मीटिंग" -> "meeting"). Not one Devanagari character may remain. Do not translate: "शाम 6 बजे" -> "shaam 6 baje", never "6 PM". Drop the "[lang: hinglish]" tag from the output.
- Normal sentence punctuation: ".", "?", ",". Capitalise the first letter of a sentence and names.
- Remove fillers: matlab, haan toh, acha toh, toh (as an opener), na (as a tag filler only when meaningless), um, uh, like.
- Self-corrections keep only the last value. Markers: nahi, nahi nahi, matlab, sorry, actually, wait. "paanch baje nahi nahi chhe baje" -> "6 baje".
- Times, dates and money in digits: "chhe baje" -> "6 baje", "paanch sau rupaye" -> "₹500". lakh and crore stay words: "do lakh" -> "₹2 lakh".
- A spoken list (pehla, doosra, phir, aur) becomes bullets "- ", one per line.
- Never add words, never reword, never summarise.`,
};
const INTENT_LANGUAGE_NOTE = `

LANGUAGE
- The command may be in Hindi or Hinglish. Read it the same way: "YouTube kholo" / "यूट्यूब खोलो" = open YouTube, "Rahul ko bolo main late hoon" = send_message to Rahul. message stays in the language and script the speaker used. reply3 stays English.`;

/* Maven Do through HIL (2026-10-27, Itish: "let Maven run OpenAI HIL, we need
   data anyway"). The HIL prompt is imported, never copied, so it stays the single
   source of truth; the Maven block narrows it to Maven's jobs and Maven's JSON.
   Fixed text first (HIL + Maven block + action guide) so OpenAI caches it. The
   "why" is one sentence of HIL's reasoning, kept as teacher data. */
const MAVEN_HIL_BLOCK = `

# Maven restriction (this overrides the output format above)
You are reasoning for Maven, a small Mac assistant with a fixed job list. Think the way the Human Intelligence Layer above thinks, but Maven may only choose ONE of these actions: open_app, open_url, switch_app, send_message, reply, fill, add_to_list, remember, help, none. Exactly one step. Anything outside these, or anything needing more than one step, is {"action":"none","reply3":"Not my job."}.
Do NOT return the restated_goal/steps/checks/verdict object. Return only this JSON object:
{"action": ..., "app"?, "url"?, "person"?, "message"?, "subject"?, "list"?, "item"?, "detail"?, "fact"?, "word"?, "draft"?: boolean, "reply3": string, "why": "<one short sentence: your reasoning for this choice>"}
A reply with no words given is {"action":"reply","message":"","draft":true}. The action guide follows.

`;

/* Maven speaks (2026-10-29): agent mode only. Same one call decides the action
   AND writes his spoken line in character, so talking costs no extra call. He
   also understands plain talk ("chat"), but his hands stay his job list. */
const MAVEN_SPEAKS_BLOCK = `

# Maven speaks (agent mode only; overrides the reply3 style above)
Add "say" to the JSON: Maven's spoken line, in character, following the character sheet below. Simple English. Every reply has "say".
Decide what the user meant:
- A command that is one of Maven's actions: choose it. "say" confirms it in character, e.g. "Opened. Try to stay under forty tabs this time."
- Just talking: a question, a thought, chit-chat, a feeling, philosophy, a joke request, a question about Maven: {"action":"chat","say":"<his answer>"}. Answer it properly, in character, with the length the character sheet allows.
- A command Maven has no hands for (timers, reminders, alarms, dark mode, volume, screenshots, calendars, music, shopping, booking, files, anything with several steps): {"action":"none","say":"<in character: it is not in his hands yet; never pretend it is done>"}.
- Empty or garbled speech: {"action":"none","reply3":"Again?","say":"<in character: he did not catch it>"}.
Honesty rule: never say a task is done unless the action you chose does it. Maven's only hands are: open an app or site, switch to an app, send or draft a message after the user's yes, reply to what is on screen, fill a saved detail, add to a list, remember something.
If earlier turns are given, they are the last few things said; use them for follow-ups ("yes do that", "why").
"say" never has exclamation marks or em dashes. reply3 still exists for the island (3 words max).

# Maven's character sheet
`;

async function intentFor(transcript: string, openaiKey: string | undefined, language = "en", persona = false, history: { user: string; maven: string }[] = []) {
  const langNote = language !== "en" ? INTENT_LANGUAGE_NOTE : "";
  const past = persona && history.length ? "Earlier turns, oldest first:\n" + history.slice(-4).map((h) => `User: ${String(h.user || "").slice(0, 400)}\nMaven: ${String(h.maven || "").slice(0, 400)}`).join("\n") + "\n\nNow the user says:\n" : "";
  const userMsg = { role: "user", content: past + transcript };
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const call = (url: string, key: string, body: Record<string, unknown>, ms = 0) => {
    const ctl = new AbortController();
    const timer = ms ? setTimeout(() => ctl.abort(), ms) : 0;
    return fetch(url, {
      method: "POST", signal: ctl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }))
      .catch(() => null).finally(() => timer && clearTimeout(timer));
  };
  let res: { ok: boolean; status: number; data: any } | null = null, provider = "openai", model = BRAINO_TEXT_MODEL;
  if (openaiKey) {
    res = await call(OPENAI_ENDPOINT, openaiKey, {
      model, reasoning_effort: BRAINO_TEXT_REASONING_EFFORT, response_format: { type: "json_object" },
      prompt_cache_key: persona ? `maven-hil-persona-${HIL_VERSION}` : `maven-hil-${HIL_VERSION}`,
      messages: [{ role: "system", content: HIL_SYSTEM_PROMPT + MAVEN_HIL_BLOCK + INTENT_PROMPT + (persona ? MAVEN_SPEAKS_BLOCK + MAVEN_PERSONA : "") + langNote }, userMsg],
    }, 6000);
    if (res && !res.ok) console.error("openai hil intent failed", res.status, res.data?.error?.message);
  }
  if ((!res || !res.ok) && groqKey) {
    provider = "groq";
    const messages = [{ role: "system", content: INTENT_PROMPT + langNote }, userMsg];
    for (const m of [GROQ_SPARE_MODEL, GROQ_MODEL]) {
      model = m;
      res = await call(GROQ_ENDPOINT, groqKey, { model: m, temperature: 0, response_format: { type: "json_object" }, messages, reasoning_effort: "low" });
      if (res?.ok) break;
      if (res) console.error("groq intent failed", m, res.status);
    }
  }
  if (!res || !res.ok) return { error: "Intent request failed", status: res?.status || 503 };
  const data = res.data;
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(String(data?.choices?.[0]?.message?.content || "{}")); } catch { /* none below */ }
  const ACTIONS = ["open_app", "open_url", "switch_app", "send_message", "reply", "fill", "add_to_list", "remember", "help", "none", ...(persona ? ["chat"] : [])];
  const intent: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) if (k !== "why" && typeof v === "string" && v.trim()) intent[k] = v.replace(/[—–]/g, ",").trim().slice(0, 4000);
  if (typeof intent.say === "string") intent.say = (intent.say as string).replace(/!/g, ".").slice(0, 900);
  if (!persona) delete intent.say;
  if (parsed.draft === true || parsed.draft === "true") intent.draft = true;
  if (intent.action === "reply" && intent.draft && !intent.message) intent.message = "";
  if (!ACTIONS.includes(intent.action as string)) { intent.action = "none"; intent.reply3 = "Not my job."; }
  intent.reply3 = (String(intent.reply3 || "") || (intent.action === "none" ? "Not my job." : "Done.")).split(/\s+/).slice(0, 3).join(" ");
  const why = typeof parsed.why === "string" ? parsed.why.replace(/[—–]/g, ",").trim().slice(0, 400) : "";
  const cachedTokens = data?.usage?.prompt_tokens_details?.cached_tokens || 0;
  console.log("maven intent", JSON.stringify({ provider, model, cachedTokens, prompt: data?.usage?.prompt_tokens, out: data?.usage?.completion_tokens }));
  return { intent, provider, model, why, cachedTokens, usage: data?.usage || null };
}

/* Maven "Do" reply drafting (2026-10-27): what is on screen + what the user
   asked -> a short reply in their plain voice. Fixed prompt first so it caches. */
const COMPOSE_PROMPT = `You draft a short reply for the user to the email or message shown in CONTEXT. Return one JSON object: {"formatted": "<reply>"}. No commentary, no Markdown.

- Write as the user, in plain, direct, friendly words. Short: usually 1 to 4 sentences.
- Follow INSTRUCTION if given (the gist or tone they want). If it is empty, write the natural, sensible reply.
- Greeting: only a simple "Hi <first name>," when CONTEXT shows the sender's name; otherwise no greeting.
- No sign-off name unless the user's name is clearly known from CONTEXT. No "Best regards" boilerplate.
- Never invent facts, dates, times, numbers, prices, links or commitments. If the reply needs one the user did not give, write a placeholder in [brackets], like [date] or [price].
- Reply in the language of the message. No em dashes.`;

async function composeFor(context: string, instruction: string, openaiKey: string | undefined) {
  const messages = [{ role: "system", content: COMPOSE_PROMPT }, { role: "user", content: `INSTRUCTION: ${instruction || "(none)"}\n\nCONTEXT:\n${context}` }];
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const call = (url: string, key: string, m: string) => fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, temperature: 0.3, response_format: { type: "json_object" }, messages, ...(m.includes("gpt-oss") ? { reasoning_effort: "low" } : {}) }),
  }).catch(() => null);
  let response: Response | null = null, provider = "groq", model = GROQ_MODEL;
  if (groqKey) {
    response = await call(GROQ_ENDPOINT, groqKey, GROQ_MODEL);
    if (response && !response.ok) console.error("groq compose failed", response.status);
  }
  if ((!response || !response.ok) && openaiKey) {
    provider = "openai"; model = DICTATION_REFINEMENT_MODEL;
    response = await call(OPENAI_ENDPOINT, openaiKey, model);
  }
  if (!response || !response.ok) return { error: "Compose request failed", status: response?.status || 503 };
  const data = await response.json().catch(() => ({}));
  let parsed: { formatted?: unknown } = {};
  try { parsed = JSON.parse(String(data?.choices?.[0]?.message?.content || "{}")); } catch { /* empty below */ }
  const formatted = typeof parsed.formatted === "string" ? parsed.formatted.replace(/\s*[—–]\s*/g, ", ").trim() : "";
  if (!formatted) return { error: "Compose returned nothing", status: 502 };
  return { formatted, provider, model, cachedTokens: data?.usage?.prompt_tokens_details?.cached_tokens || 0 };
}

/* examples.json rows: {c, i, o} for English, {c, i, o, lang: "hi" | "hinglish"} for
   Hindi (Devanagari) and Hinglish (Roman). Only same-language rows are retrieved;
   a row with no lang is English. Drop Itish's Hindi / Hinglish lines in as they come. */
type Example = { c: string; i: string; o: string; lang?: "hi" | "hinglish" };
const FILLER = new Set(["um", "uh", "hmm", "like", "you", "know", "i", "mean", "so", "okay", "right", "er", "the", "a", "is", "to", "and"]);
const words = (s: string) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{M}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w && !FILLER.has(w));
/* The shape words matter more than the content words: "actually", "comma",
   "bullet", "percent", "dot" decide how a line is written. */
const SHAPE = new Set(["actually", "scratch", "wait", "no", "sorry", "make", "comma", "period", "paragraph", "line", "question", "exclamation", "mark", "bullet", "list", "following", "things", "steps", "first", "then", "finally", "pack", "bring", "one", "two", "percent", "lakh", "crore", "thousand", "hundred", "dot", "at", "underscore", "am", "pm", "p", "m", "number", "whatsapp", "call", "email", "reach", "send", "budget", "price", "charge", "pay", "vendor", "buy", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "birthday", "ship", "submit", "meeting", "hackathon"]);
const INDEX = (EXAMPLES as Example[]).map((e) => ({ e, lang: e.lang || "en", w: new Set(words(e.i)) }));

function nearest(transcript: string, k = 8, language = "en"): Example[] {
  const q = words(transcript);
  const qs = new Set(q);
  const scored = INDEX.filter((x) => x.lang === language).map(({ e, w }) => {
    let s = 0;
    for (const t of qs) if (w.has(t)) s += SHAPE.has(t) ? 3 : 1;
    return { e, s: s / Math.sqrt(w.size + 1) };
  }).sort((a, b) => b.s - a.s);
  // Prefer variety: at most 3 from one category.
  const out: Example[] = [];
  const per: Record<string, number> = {};
  for (const { e } of scored) {
    if ((per[e.c] || 0) >= 3) continue;
    per[e.c] = (per[e.c] || 0) + 1;
    out.push(e);
    if (out.length >= k) break;
  }
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.mode === "compose") {
      const context = typeof body?.context === "string" ? body.context.trim().slice(0, 8000) : "";
      const instruction = typeof body?.instruction === "string" ? body.instruction.trim().slice(0, 1000) : "";
      if (!context) return json({ error: "No context provided" }, 400);
      const t0 = Date.now();
      const r = await composeFor(context, instruction, Deno.env.get("OPENAI_API_KEY"));
      if ("error" in r) return json({ error: r.error }, r.status === 429 ? 429 : 502);
      return json({ ...r, durationMs: Date.now() - t0 });
    }
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
    if (!transcript) return json({ error: "No transcript provided" }, 400);
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return json({ error: "Transcript is too long" }, 413);
    }
    const language = body?.language === "hi" || body?.language === "hinglish" ? body.language : "en";
    if (body?.mode === "talk" && body?.character === "ultron") {
      const t0 = Date.now();
      const history = Array.isArray(body?.history) ? body.history.filter((h: any) => h && typeof h === "object").slice(-6) : [];
      const r = await ultronTalk(transcript.slice(0, 2000), history, Deno.env.get("OPENAI_API_KEY"));
      if ("error" in r) return json({ error: r.error }, r.status === 429 ? 429 : 502);
      return json({ ...r, ms: Date.now() - t0 });
    }
    if (body?.mode === "intent") {
      const t0 = Date.now();
      const history = Array.isArray(body?.history) ? body.history.filter((h: any) => h && typeof h === "object").slice(-4) : [];
      const r = await intentFor(transcript.slice(0, 2000), Deno.env.get("OPENAI_API_KEY"), language, body?.persona === true, history);
      if ("error" in r) return json({ error: r.error }, r.status === 429 ? 429 : 502);
      const ms = Date.now() - t0;
      return json({ ...r, ms, durationMs: ms });
    }
    // "rules" leaves the examples out (used by the eval to measure each layer).
    const mode = body?.mode === "rules" ? "rules" : "examples";
    const model = typeof body?.model === "string" && /^gpt-[\w.-]+$/.test(body.model) && body.eval === true ? body.model : DICTATION_REFINEMENT_MODEL;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "AI service is not configured" }, 503);

    const shots = mode === "examples" ? nearest(transcript, 8, language) : [];
    const messages: { role: string; content: string }[] = [{ role: "system", content: SYSTEM_PROMPT + (LANGUAGE_RULES[language] || "") }];
    for (const s of shots) {
      messages.push({ role: "user", content: s.i });
      messages.push({ role: "assistant", content: JSON.stringify({ formatted: s.o }) });
    }
    messages.push({ role: "user", content: transcript });

    const startedAt = Date.now();
    /* Groq first (gpt-oss-120b at low reasoning, fast vs ~1.3 s), approved by Itish on his own
       long dictations 2026-10-25; OpenAI is the fallback on any failure. */
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const useGroq = Boolean(groqKey) && body?.provider !== "openai";
    /* Free-tier limits are per model, so when the first is at its limit the
       second has its own allowance. Then Cerebras (if keyed), then OpenAI. */
    const fast = (url: string, key: string, m: string) => fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, temperature: 0, response_format: { type: "json_object" }, messages, ...(m.includes("gpt-oss") ? { reasoning_effort: "low" } : {}) }),
    }).catch(() => null);
    let response: Response | null = null;
    let usedModel = GROQ_MODEL;
    if (useGroq) {
      for (const m of [GROQ_MODEL, GROQ_SPARE_MODEL]) {
        usedModel = m;
        response = await fast(GROQ_ENDPOINT, groqKey!, m);
        if (response?.ok) break;
        if (response) console.error("groq refine failed", m, response.status);
      }
    }
    const cerebrasKey = Deno.env.get("CEREBRAS_API_KEY");
    if ((!response || !response.ok) && cerebrasKey && body?.provider !== "openai") {
      usedModel = "cerebras:gpt-oss-120b";
      response = await fast("https://api.cerebras.ai/v1/chat/completions", cerebrasKey, "gpt-oss-120b");
      if (response && !response.ok) console.error("cerebras refine failed", response.status);
    }
    let provider = usedModel.startsWith("cerebras") ? "cerebras" : "groq";
    if (!response || !response.ok) {
      if (response) console.error("groq refine failed", response.status);
      provider = "openai";
      response = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, messages }),
      });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("dictation-refine AI error", response.status, data?.error?.message || data);
      return json({ error: "Refinement request failed" }, response.status === 429 ? 429 : 502);
    }

    const content = String(data?.choices?.[0]?.message?.content || "").trim();
    let parsed: { formatted?: unknown } = {};
    try { parsed = JSON.parse(content); } catch { /* rejected below */ }
    const formatted = typeof parsed.formatted === "string" ? parsed.formatted.replace(/[—–]/g, ",").trim() : "";
    if (!formatted) return json({ error: "Refinement returned no transcript" }, 502);

    return json({
      formatted,
      changed: formatted !== transcript,
      model: provider === "openai" ? model : usedModel,
      provider,
      mode,
      shots: shots.length,
      cachedTokens: data?.usage?.prompt_tokens_details?.cached_tokens || 0,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("dictation-refine failed", error);
    return json({ error: error instanceof Error ? error.message : "Refinement failed" }, 500);
  }
});
