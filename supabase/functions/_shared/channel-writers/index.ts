// channel-writers/index.ts — the library's front door.
//
// import { buildWriterSystem, WRITERS, outreachChannels } from "../_shared/channel-writers/index.ts";
//
// One writer per platform, each called separately so each platform's rules
// are the whole of its instructions, not one paragraph among five. Used by:
//   - outreach/outreach-engine (purpose "outreach")
//   - the Content Engine (purpose "content"), when it is built
import { UNIVERSAL_RULES, type ChannelId, type ChannelWriter, type Purpose, tidy } from "./base.ts";
import { voiceBlock, type VoiceProfile } from "./voice.ts";
import { email } from "./email.ts";
import { linkedin } from "./linkedin.ts";
import { whatsapp } from "./whatsapp.ts";
import { x } from "./x.ts";
import { instagram } from "./instagram.ts";
import { reddit } from "./reddit.ts";

export { tidy, UNIVERSAL_RULES } from "./base.ts";
export type { ChannelId, ChannelWriter, Purpose } from "./base.ts";
export { VOICE_EXTRACT_SYSTEM, voiceBlock } from "./voice.ts";
export type { VoiceProfile } from "./voice.ts";

export const WRITERS: Record<ChannelId, ChannelWriter> = { email, linkedin, whatsapp, x, instagram, reddit };
export const outreachChannels: ChannelId[] = ["email", "linkedin", "whatsapp", "x", "instagram"];

/* The whole system prompt for one platform and one job. The voice block and
   the platform rules are the variable parts; the order is fixed so the
   cacheable prefix stays the same across calls for the same platform. */
export function buildWriterSystem(channel: ChannelId, purpose: Purpose, opts: { voice?: VoiceProfile | null; selfDescribed?: string } = {}) {
  const w = WRITERS[channel];
  const shape = purpose === "outreach" ? w.outreachShape : w.contentShape;
  const job = purpose === "outreach"
    ? `You write first-touch outreach on ${w.label} for a founder: one message per person, as if they wrote each one by hand to that person alone.`
    : `You write ${w.label} posts for a founder, in their voice, for their audience.`;
  return [
    `# YOUR JOB\n${job}\nYou write for ${w.label} only, and it must read as native to ${w.label}: a message that would work on another platform is wrong here.`,
    purpose === "outreach" ? w.outreach : w.content,
    UNIVERSAL_RULES,
    voiceBlock(opts.voice, opts.selfDescribed),
    purpose === "outreach"
      ? `# RETURN\nJSON only: {"drafts": [{"id": "lead id", ${shape}}]}\nOne entry per person you were given, using their id.`
      : `# RETURN\nJSON only: {"posts": [{${shape}}]}`,
  ].join("\n\n");
}

/* Pull one platform's message out of a model reply and make it fit. */
export function readDraft(channel: ChannelId, d: any) {
  const w = WRITERS[channel];
  const v = d?.[channel] || d || {};
  const body = tidy(v.body, w.maxChars);
  if (!body) return null;
  return {
    subject: w.hasSubject ? tidy(v.subject, 120) : "",
    body: channel === "linkedin" ? tidy(body, 300) : body,
    followups: (Array.isArray(v.followups) ? v.followups : []).slice(0, 2).map((f: unknown) => tidy(f, 600)).filter(Boolean),
  };
}
