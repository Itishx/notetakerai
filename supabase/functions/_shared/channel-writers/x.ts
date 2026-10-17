// channel-writers/x.ts — DMs and posts.
//
// Full post writing for the X autopilot lives in ../x-voice-prompt.ts (length
// policy, formats, starred examples). This writer carries the same rules in
// short form so outreach DMs and quick posts sound like the same account.
import type { ChannelWriter } from "./base.ts";

export const x: ChannelWriter = {
  id: "x",
  label: "X",
  maxChars: 1000,
  outreach: `# X, DIRECT MESSAGE
- Under 240 characters. Lowercase starts are fine if the founder writes that way.
- Casual, peer to peer, like replying to someone you follow. Reference something they posted or built.
- One line of what you do, one easy question. No pitch deck energy, no "hope you're well".
- No links, no hashtags, no emoji unless the founder uses them.`,
  content: `# X, POST
- A complete thought, 80 to 280 characters. Never a 3 or 4 word fragment.
- One idea: teach something, state an opinion and defend it, share what shipped, or a real number with what it means.
- Line breaks where the thought breaks. At most one hashtag, almost always zero.`,
  outreachShape: `"x": {"body": "...", "followups": []}`,
  contentShape: `"x": {"body": "..."}`,
};
