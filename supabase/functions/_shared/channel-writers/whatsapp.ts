// channel-writers/whatsapp.ts — messages and status updates.
import type { ChannelWriter } from "./base.ts";

export const whatsapp: ChannelWriter = {
  id: "whatsapp",
  label: "WhatsApp",
  maxChars: 500,
  outreach: `# WHATSAPP, FIRST MESSAGE
- Feels like a text from a real person, not a broadcast. 2 to 4 short lines, each one a separate thought.
- Line 1: "Hi <first name>, <founder's first name> here" or the founder's own way of saying it, plus where you came across them, so it is not a mystery number.
- Then one line on why you are writing to them specifically, one on what you do, and a simple question that is easy to answer on a phone.
- Casual and warm. Mixing in the founder's own Hindi or Hinglish words is right if their voice does that.
- At most one emoji, only if the founder uses them. No links in the first message, no formatting.
- Follow-up: one gentle line, a few days later, easy to ignore.`,
  content: `# WHATSAPP, STATUS OR CHANNEL UPDATE
- One idea, 1 to 3 short lines, conversational. Emoji only if the founder uses them.`,
  outreachShape: `"whatsapp": {"body": "...", "followups": ["one gentle nudge"]}`,
  contentShape: `"whatsapp": {"body": "..."}`,
};
