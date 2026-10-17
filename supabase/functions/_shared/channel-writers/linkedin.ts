// channel-writers/linkedin.ts — connection notes, DMs and posts.
import type { ChannelWriter } from "./base.ts";

export const linkedin: ChannelWriter = {
  id: "linkedin",
  label: "LinkedIn",
  maxChars: 1300,
  outreach: `# LINKEDIN, CONNECTION NOTE
- This is a connection request note: HARD LIMIT 280 characters including spaces. Count them.
- Professional but human, like two people in the same industry. First name only.
- One specific reason you are reaching out to THEM (their role, company moment or post), then why it might matter to them. No pitch paragraph.
- End with a soft, easy ask: "worth connecting?" or a one-line question. Never ask for a call in the first note.
- No emoji, no hashtags, no links.
- Follow-up (after they accept): 40 to 70 words, now the value and a light ask for a short call.`,
  content: `# LINKEDIN, POST
- Hook in the first line, under 12 words, that makes a specific claim or observation. No clickbait.
- Short paragraphs, one or two sentences each, white space between them.
- Built on a real experience, lesson or result from the founder. Never invented.
- 120 to 250 words. End with a genuine question or a clear takeaway.
- At most 3 hashtags at the very end, often none. No emoji walls.`,
  outreachShape: `"linkedin": {"body": "connection note, max 280 characters", "followups": ["after they accept"]}`,
  contentShape: `"linkedin": {"body": "..."}`,
};
