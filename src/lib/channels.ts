// The channel registry. One place that knows every distribution surface, so the
// hub, the footer and the dashboard all stay in step as Reddit and Instagram
// land. Adding a channel is an entry here plus a token block in
// src/pages/channel-theme.css.

export type ChannelStatus = "live" | "building" | "next";

export type Channel = {
  id: string;
  name: string;
  /** The public explainer. */
  about: string;
  /** The app surface, null while a channel is still only a plan. */
  app: string | null;
  setup: string | null;
  /** Hex used for the hub card. Matches the .ch-* token block. */
  accent: string;
  ink: string;
  surface: string;
  status: ChannelStatus;
  line: string;
  /** Stated plainly on the hub, because a channel that quietly cannot do
      something is worse than one that says so. */
  can: string[];
  cannot: string[];
};

export const CHANNELS: Channel[] = [
  {
    id: "x", name: "X", about: "/braino-for-x", app: "/x", setup: "/x/setup",
    accent: "#c7ced8", ink: "#e7e9ea", surface: "#000000", status: "live",
    line: "He reads 200 of your posts, learns how you write, drafts from what you shipped, and posts at your hours.",
    can: ["Learns your voice from your own history", "Writes and publishes", "Picks the hour", "Verifies it landed", "Engagement and follower tracking"],
    cannot: ["Impressions and follower attribution", "Reply hunting, not built yet"],
  },
  {
    id: "linkedin", name: "LinkedIn", about: "/braino-for-linkedin", app: "/linkedin", setup: "/linkedin/setup",
    accent: "#0a66c2", ink: "#1b1f23", surface: "#f4f2ee", status: "live",
    line: "Writes for LinkedIn's room rather than cross-posting, publishes to your profile, and drafts the comments that actually grow you.",
    can: ["Writes and publishes to your profile", "Drafts comments on other people's posts", "Topics, rhythm and quiet hours", "Refuses out loud"],
    cannot: ["Any analytics, needs partner access", "Auto-commenting, needs partner access", "Carousels, no API can post them", "Company pages"],
  },
  {
    id: "reddit", name: "Reddit", about: null, app: null, setup: null,
    accent: "#ff4500", ink: "#e6e6e6", surface: "#0b0b0b", status: "next",
    line: "The highest intent density on the internet. People ask for products by name, in the present tense.",
    can: ["Publishing already works through the browser delegate", "Listening is the real prize"],
    cannot: ["Never a broadcast channel. One target per campaign, hard gated", "Commercial data use needs a contract with Reddit"],
  },
  {
    id: "instagram", name: "Instagram", about: null, app: null, setup: null,
    accent: "#e1306c", ink: "#f5f5f5", surface: "#121212", status: "next",
    line: "Reels cut from what you already shipped, without an editor being opened.",
    can: ["Reels and carousels through the official Graph API"],
    cannot: ["Needs a Business account, a Facebook Page, app review and business verification"],
  },
];

export const LIVE_CHANNELS = CHANNELS.filter((c) => c.status === "live");
