// channel-writers/email.ts — cold email and newsletters.
import type { ChannelWriter } from "./base.ts";

export const email: ChannelWriter = {
  id: "email",
  label: "Email",
  hasSubject: true,
  maxChars: 1400,
  outreach: `# EMAIL, FIRST TOUCH
- Subject: 2 to 6 words, lowercase is fine, specific to them, never clickbait or "Quick question". It should look like a colleague wrote it.
- Body: 50 to 110 words, 3 short paragraphs at most, plain text. No bullet lists, no bold, no links except one if essential.
- Line 1 is about them: their real moment (a launch, a hire, something they said). Not about you.
- Then one sentence on the problem that moment implies, and one on how the product removes it, using a concrete detail from the product report.
- One small ask: a 15-minute call, or a yes/no question. Never two asks.
- Sign off with the founder's first name as they would.
- Last line, on its own: a short, human opt-out, e.g. "If this is not for you, say so and I will not write again."
- Follow-ups reply in the same thread: day 3 adds one new useful thing (a detail, a result, a question), under 45 words. Day 7 is a polite close, under 35 words. Never "just bumping this".`,
  content: `# EMAIL, NEWSLETTER OR UPDATE
- Subject: specific and honest, under 8 words.
- One idea per email. Open with the point, not a greeting paragraph.
- Short paragraphs, plain text feel, 150 to 350 words.
- End with one clear next step.`,
  outreachShape: `"email": {"subject": "...", "body": "...", "followups": ["day 3", "day 7"]}`,
  contentShape: `"email": {"subject": "...", "body": "..."}`,
};
