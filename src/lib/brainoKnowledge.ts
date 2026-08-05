export type KnowledgeCategory =
  | "Mode"
  | "Feature"
  | "Product"
  | "Design decision"
  | "Product philosophy"
  | "Technical";

export type KnowledgeEntry = {
  slug: string;
  title: string;
  category: KnowledgeCategory;
  date: string;
  dateLabel: string;
  description: string;
  status: "Live" | "MVP" | "Exploring";
  platform: string;
  number: string;
};

export const KNOWLEDGE_ENTRIES: readonly KnowledgeEntry[] = [
  {
    slug: "moonwalk-ecosystem-teaser",
    title: "Moonwalk Ecosystem Teaser",
    category: "Design decision",
    date: "2026-08-05",
    dateLabel: "August 5, 2026",
    description:
      "The ecosystem film's exact kinetic language, reduced to one moonwalk promise and one oversized trybraino.com.",
    status: "MVP",
    platform: "Braino website",
    number: "018",
  },
  {
    slug: "mac-moonwalk-party-trick",
    title: "Mac Moonwalk Party Trick",
    category: "Feature",
    date: "2026-08-05",
    dateLabel: "August 5, 2026",
    description:
      "After Braino's introduction, Double Option opens Spotify, cues Billie Jean at 3:31, and sends him moonwalking immediately along the bottom Mac Dock.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "017",
  },
  {
    slug: "product-overview-homepage",
    title: "Product Overview Homepage Refresh",
    category: "Design decision",
    date: "2026-08-04",
    dateLabel: "August 4, 2026",
    description:
      "How Braino's hidden main page replaced product history with the living character, then added Hera, Studio, engine links, honest pricing, and a clearer close.",
    status: "Exploring",
    platform: "Braino website",
    number: "016",
  },
  {
    slug: "how-braino-talks",
    title: "How Braino Talks",
    category: "Feature",
    date: "2026-08-02",
    dateLabel: "August 2, 2026",
    description:
      "Why he never asks \"what's on your mind?\", how his charm scales down to nothing at a funeral, and the code that checks every reply against the phrases he is banned from saying.",
    status: "MVP",
    platform: "Braino everywhere",
    number: "015",
  },
  {
    slug: "hil-version-1",
    title: "HIL Version 1: The Loop",
    category: "Technical",
    date: "2026-08-01",
    dateLabel: "August 1, 2026",
    description:
      "Braino splits a command into jobs, works one small step at a time against a pretend world, checks every step, and stops dead before anything irreversible.",
    status: "MVP",
    platform: "Braino website",
    number: "014",
  },
  {
    slug: "browser-notch-presence",
    title: "Browser Notch Presence",
    category: "Design decision",
    date: "2026-07-31",
    dateLabel: "July 31, 2026",
    description:
      "Why the Chrome extension gets one calm notch, while Braino appears only to listen, point, recover, and celebrate.",
    status: "Exploring",
    platform: "Braino Chrome extension",
    number: "013",
  },
  {
    slug: "choose-your-avatar",
    title: "Choose Your Avatar",
    category: "Feature",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "How one Braino OS underneath lets you pick which character shows up — Braino, or Webb, an original web-slinger.",
    status: "MVP",
    platform: "Braino website",
    number: "012",
  },
  {
    slug: "braino-thronglets",
    title: "Braino Thronglets",
    category: "Product",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "How five autonomous versions of the same Braino mascot begin to feel like one tiny digital civilization.",
    status: "Exploring",
    platform: "Braino website",
    number: "011",
  },
  {
    slug: "iomi-boot-identity",
    title: "IOMI Boot Identity",
    category: "Design decision",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "How Braino Mac boots through a living gold-coral-blue trace, real authentication, IOMI, an awake-eye handoff, and Braino's spoken entrance.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "010",
  },
  {
    slug: "voice-command-echo-guard",
    title: "Voice Command Echo Guard",
    category: "Technical",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "How Braino stops music and his own spoken replies from turning into unintended Mac commands.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "009",
  },
  {
    slug: "jyoti-sir-team-demo",
    title: "Jyoti Sir Team Demo",
    category: "Feature",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "A personal cross-app demo spanning quiet Spotify playback, temporary Desktop organization with undo, WhatsApp, and safe Chrome tab cleanup.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "008",
  },
  {
    slug: "whats-new-live-demos",
    title: "What’s New Live Demos",
    category: "Feature",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "How Braino understands natural questions about what changed, explains his newest feature, then performs it live.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "007",
  },
  {
    slug: "mascot-reply-captions",
    title: "Mascot Reply Captions",
    category: "Feature",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "How Braino's on-screen reply stays visible and highlights each word as his voice reaches it.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "006",
  },
  {
    slug: "music-segment-loops",
    title: "Music Segment Loops",
    category: "Feature",
    date: "2026-07-30",
    dateLabel: "July 30, 2026",
    description:
      "How Braino understands spoken timestamps and repeats the exact part of a song you love across Spotify, YouTube Music, and Apple Music.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "005",
  },
  {
    slug: "expanded-thinking-canvas",
    title: "Expanded Thinking Canvas",
    category: "Feature",
    date: "2026-07-29",
    dateLabel: "July 29, 2026",
    description:
      "How Braino's Mac notch now unfolds sideways to show calm, useful progress without exposing private reasoning or becoming another window.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "004",
  },
  {
    slug: "braino-ecosystem",
    title: "The Braino Ecosystem",
    category: "Product philosophy",
    date: "2026-07-29",
    dateLabel: "July 29, 2026",
    description:
      "How one character became several surfaces, plus the short film where Braino escapes the tab and reveals the ecosystem around Braino OS.",
    status: "Exploring",
    platform: "Everywhere Braino lives",
    number: "003",
  },
  {
    slug: "waitlist-navigation",
    title: "The Waitlist Chapter Rail",
    category: "Design decision",
    date: "2026-07-29",
    dateLabel: "July 29, 2026",
    description:
      "Why the Waitlist now owns the homepage, every other route redirects there, the hero introduces Braino visually, and the story ends with the playable Braino footer.",
    status: "Live",
    platform: "Braino website",
    number: "002",
  },
  {
    slug: "mac-cursor-mode",
    title: "Mac Cursor Mode",
    category: "Mode",
    date: "2026-07-29",
    dateLabel: "July 29, 2026",
    description:
      "Braino watches the work happening in your repository, keeps the current feature in context, and calls you back when the task looks finished.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "001",
  },
];

export function getKnowledgeEntry(slug: string) {
  return KNOWLEDGE_ENTRIES.find((entry) => entry.slug === slug);
}
