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
    slug: "braino-everything-deck",
    title: "The Braino Deck: All of Him, Explained From Nothing",
    category: "Design decision",
    date: "2026-08-17",
    dateLabel: "August 17, 2026",
    description:
      "A second deck at /braino-deck: fourteen slides that assume you have never heard of Braino. What he is, the three products with the price on the card, the four things he does, who pays, the market numbers, the arithmetic with its working shown, and what is honestly still unbuilt. The Foundry deck at /deck is untouched.",
    status: "MVP",
    platform: "Braino website",
    number: "034",
  },
  {
    slug: "braino-foundry-deck",
    title: "The Foundry Deck: The Pitch, With the Missing Half Put Back",
    category: "Design decision",
    date: "2026-08-16",
    dateLabel: "August 16, 2026",
    description:
      "The Braino Foundry pitch rebuilt as a real deck at /deck: thirty six slides, arrow keys, a static solar system, and the three things the original PDF never said, which are who Braino already is, the fact that there are two kinds of him, and the business behind it. Now opens on a plain market today versus us table, answers where the human sits in the loop, and ends on a one page summary flow.",
    status: "MVP",
    platform: "Braino website",
    number: "033",
  },
  {
    slug: "braino-embed",
    title: "Braino Embed: One Script Tag, the Real Braino, Anywhere",
    category: "Feature",
    date: "2026-08-13",
    dateLabel: "August 13, 2026",
    description:
      "Paste one script tag into any website and the real Braino shows up there too: same mascot, same voice, same personality, able to answer from that site's own data once it wires a small scoped bridge for its own database.",
    status: "MVP",
    platform: "Any website",
    number: "032",
  },
  {
    slug: "monday-mode",
    title: "Monday Mode: Same Braino, Zero Patience",
    category: "Mode",
    date: "2026-08-13",
    dateLabel: "August 13, 2026",
    description:
      "Say “Braino, enter Monday Mode” and he keeps his memory and personality, just runs out of patience: sarcastic pushback, casual cursing, and the mascot locked in the notch until you say stop.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "031",
  },
  {
    slug: "brainox-distribution",
    title: "BrainoX: Itish Owns the Voice, Braino Owns the Distribution",
    category: "Feature",
    date: "2026-08-12",
    dateLabel: "August 12, 2026",
    description:
      "A distribution command center at /x: raw thoughts become honest post options, a drag-to-order queue feeds a hard policy guard, and one briefing answers how the account is really doing.",
    status: "MVP",
    platform: "Braino website",
    number: "030",
  },
  {
    slug: "two-products-and-the-browser-page",
    title: "Braino Comes in Three, on One Page",
    category: "Design decision",
    date: "2026-08-11",
    dateLabel: "August 11, 2026",
    description:
      "One introduction to Braino, then three tabs for the three products. The notch carries the navigation, and nobody has to leave the page to compare them.",
    status: "MVP",
    platform: "Braino website",
    number: "029",
  },
  {
    slug: "meeting-recorder",
    title: "Meeting Recorder: Both Sides, With Names",
    category: "Feature",
    date: "2026-08-10",
    dateLabel: "August 10, 2026",
    description:
      "Say “record this meeting” and Braino captures the call and your microphone as separate streams, then names the speakers from the meeting UI, the calendar invite, and their own introductions.",
    status: "MVP",
    platform: "Braino for Mac and the browser extension",
    number: "028",
  },
  {
    slug: "gpt-5-6-luna-across-braino",
    title: "GPT-5.6 Luna Across Braino",
    category: "Technical",
    date: "2026-08-09",
    dateLabel: "August 9, 2026",
    description:
      "Braino's everyday text and vision routes now share GPT-5.6 Luna, the cheaper GPT-5.6 option, while purpose-built speech models keep their own jobs.",
    status: "MVP",
    platform: "Everywhere Braino lives",
    number: "027",
  },
  {
    slug: "mac-launch-video-ritual",
    title: "Mac Launch Video Ritual",
    category: "Feature",
    date: "2026-08-09",
    dateLabel: "August 9, 2026",
    description:
      "Double Shift lets Braino introduce the launch film, open the real master fullscreen, then walk home while the notch holds its Now Playing state; press it again to end.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "026",
  },
  {
    slug: "brainohera-dont-blink-teaser",
    title: "BrainoHERA: Don’t Blink Teaser",
    category: "Design decision",
    date: "2026-08-09",
    dateLabel: "August 9, 2026",
    description:
      "A white-and-green Don’t Blink film that introduces BrainoHERA through three-word kinetic cuts, its real Mac notch transcript surface, and an offline on-device proof.",
    status: "MVP",
    platform: "Braino website",
    number: "025",
  },
  {
    slug: "braino-foundry",
    title: "Braino Foundry: The AI Co-Founder",
    category: "Product",
    date: "2026-08-09",
    dateLabel: "August 9, 2026",
    description:
      "Braino's full Mac product is repositioned as Foundry: a present, opinionated AI co-founder for solo builders, told through the existing Apple product-page design system.",
    status: "Exploring",
    platform: "Braino website and Mac",
    number: "024",
  },
  {
    slug: "mac-iomi-response-surfaces",
    title: "Mac IOMI Response Surfaces",
    category: "Feature",
    date: "2026-08-10",
    dateLabel: "August 10, 2026",
    description:
      "Mac IOMI now keeps every voice subtitle and answer in one housing-attached surface, with display-safe anchoring, one content rail, and no duplicate mascot bubble.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "023",
  },
  {
    slug: "yap-mode",
    title: "BrainoHERA: System-Wide Dictation",
    category: "Mode",
    date: "2026-08-08",
    dateLabel: "August 8, 2026",
    description:
      "Double Option opens BrainoHERA's fixed black transcript sheet, preserves one ordered PCM stream, prefetches lossless notation formatting, and pastes without a stop-time AI wait.",
    status: "MVP",
    platform: "Braino for Mac",
    number: "022",
  },
  {
    slug: "sub-agents-text-architecture",
    title: "Sub-Agents: Don’t Blink with Graphics",
    category: "Design decision",
    date: "2026-08-08",
    dateLabel: "August 8, 2026",
    description:
      "How Don’t Blink typography, a fixed composition grid, and three full-body Braino graphics explain parallel work without breaking alignment.",
    status: "Exploring",
    platform: "Braino website",
    number: "021",
  },
  {
    slug: "dont-blink-spotify-mac-teaser",
    title: "Don’t Blink: Spotify + Mac",
    category: "Design decision",
    date: "2026-08-07",
    dateLabel: "August 7, 2026",
    description:
      "A Don’t Blink campaign cut: say the song, watch Spotify play it, then Braino’s name match-cuts into the mascot.",
    status: "MVP",
    platform: "Braino website",
    number: "020",
  },
  {
    slug: "insta-graphics-editorial-archive",
    title: "Instaposts Social Studio",
    category: "Design decision",
    date: "2026-08-06",
    dateLabel: "August 6, 2026",
    description:
      "How Braino's social posts became a dedicated gallery where every carousel can be previewed, edited, and downloaded in 4K.",
    status: "Exploring",
    platform: "Braino website",
    number: "019",
  },
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
    date: "2026-08-12",
    dateLabel: "Updated August 12, 2026",
    description:
      "How one Braino OS underneath lets you pick which character shows up — Braino, Webb, or Ferro.",
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
      "Braino now keeps spoken replies in the notch while the mascot walks, with voice-timed highlighting and the old floating bubble reserved for fallback.",
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
