// channel-writers/base.ts — what every writer shares, and the shape of a writer.
//
// The channel writers are small, separate writers, one per platform, each with
// its own rules for two jobs: OUTREACH (a message to one person) and CONTENT
// (a post for an audience). The Outreach Engine uses the outreach side today;
// the Content Engine imports the same writers, so a founder sounds like the
// same person in a cold LinkedIn note and in their LinkedIn posts.
//
// A writer never decides facts. Facts come from the product report and the
// lead record; the voice comes from the founder's voice profile; the writer
// only knows how its platform is written.

export type Purpose = "outreach" | "content";
export type ChannelId = "email" | "linkedin" | "whatsapp" | "x" | "instagram" | "reddit";

export type ChannelWriter = {
  id: ChannelId;
  label: string;
  /* How this platform is written, for each job. Plain rules, read by the model. */
  outreach: string;
  content: string;
  /* What the model returns for one item, per job. Used in the JSON contract. */
  outreachShape: string;
  contentShape: string;
  /* Hard character ceilings, enforced after the model, not trusted to it. */
  maxChars: number;
  hasSubject?: boolean;
};

/* Rules no writer may break, on any platform. Lifted from the X writer
   (x-voice-prompt.ts), where they were learnt the hard way. */
export const UNIVERSAL_RULES = `# RULES ON EVERY PLATFORM
- Never invent a fact: no customers, numbers, results, launches, meetings or experiences that are not in what you were given. If a message would need one, write around it.
- Keep what happened separate from what it means. Never state an opinion as a fact.
- Never use em dashes or en dashes. Use commas, periods or a line break.
- No AI slop. Banned: "I hope this finds you well", "Here's the thing", "game changer", "delve", "unpack", "in today's world", "let that sink in", "revolutionize", "leverage", "synergy", "circle back", "touch base", "quick question" as an opener, rhetorical-question openers, and any sentence whose only job is to sound impressive.
- No flattery you could send to anyone ("love what you're building"). Specific or nothing.
- Respect the product's status. Never imply something is live if it is a waitlist or beta.
- Write as the founder, in first person, never as a brand or an assistant.`;

/* Turn a model's text into what the platform will actually accept. */
export function tidy(text: unknown, max: number) {
  let t = String(text ?? "").replace(/[—–]/g, ",").replace(/\r/g, "").trim();
  t = t.replace(/^\s*(?:day\s*\d+|follow[- ]?up\s*\d*|subject)\s*[:,.-]\s*/i, "");
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, "") : t;
}
