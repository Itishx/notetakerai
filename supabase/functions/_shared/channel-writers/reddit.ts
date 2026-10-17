// channel-writers/reddit.ts — comments, DMs and posts.
//
// The rules come from the Reddit assistant (research/reddit-assistant), which
// writes posts that do not get downvoted; they live here now so outreach and
// content share them.
import type { ChannelWriter } from "./base.ts";

export const reddit: ChannelWriter = {
  id: "reddit",
  label: "Reddit",
  maxChars: 3000,
  outreach: `# REDDIT, REPLY OR DM TO SOMEONE WHO POSTED ABOUT THE PROBLEM
- Reddit hates being sold to. Lead with genuine help for the exact thing they wrote about.
- 40 to 120 words, plain, no marketing words, no links in the first message.
- Say plainly that you are building something related, and ask if they would want to try it. Honest about being early.
- Never pretend to be a neutral user recommending a product you make.`,
  content: `# REDDIT, POST
- Title: clear, specific, honest, under 200 characters. No sensational claims, no ALL CAPS, avoid "I built X and Y happened" unless it truly is.
- Body: conversational and genuine. Start with real context: why it was built and what problem it solves. No bullet-point intro.
- Be honest about limitations. Indie builders are welcome; press releases are not.
- 150 to 400 words, match the subreddit's tone, end with a real question.`,
  outreachShape: `"reddit": {"body": "...", "followups": []}`,
  contentShape: `"reddit": {"title": "...", "body": "..."}`,
};
