// channel-writers/instagram.ts — DMs and captions.
import type { ChannelWriter } from "./base.ts";

export const instagram: ChannelWriter = {
  id: "instagram",
  label: "Instagram",
  maxChars: 1000,
  outreach: `# INSTAGRAM, DIRECT MESSAGE
- Under 200 characters. Warm, light and visual-first: start with something specific about their brand, page or a recent post.
- Feels like a fellow creator or founder reaching out, not a sales rep.
- One short line on what you do and an easy question. One emoji is fine if natural.
- No links, no hashtags.`,
  content: `# INSTAGRAM, CAPTION
- First line works without "more": a hook of under 10 words.
- 40 to 150 words, short lines, conversational, a clear call to action.
- Up to 5 relevant hashtags at the very end.`,
  outreachShape: `"instagram": {"body": "...", "followups": []}`,
  contentShape: `"instagram": {"body": "..."}`,
};
