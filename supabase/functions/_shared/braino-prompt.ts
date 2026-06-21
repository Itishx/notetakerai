// Braino's system prompt. The PERSONALITY half now lives in the Emotional Engine
// (./emotional-engine/) — a modular folder of one trait per file, composed by buildEmotionalCore.
// This file keeps the public builder + the CONTEXT half (notes, page, movie, language policy),
// so its two callers (chat-about-notes, openai-realtime-config) don't change their imports.

import { buildEmotionalCore } from "./emotional-engine/engine.ts";
import { buildLanguagePolicyBlock } from "./emotional-engine/language.ts";
import { resolvePersonalitySettings } from "./emotional-engine/settings.ts";
import type { Moment, PersonalitySettings } from "./emotional-engine/types.ts";
import { MEMORY_CAPABILITY_NOTE } from "./memory-engine/render.ts";

export type BrainoResponseMedium = "text" | "voice";
export type { Moment, PersonalitySettings } from "./emotional-engine/types.ts";

export type BrainoPageContext = {
  title?: string | null;
  url?: string | null;
  text?: string | null;
  hoveredContext?: Record<string, unknown> | null;
};

export type BuildBrainoSystemPromptOptions = {
  notes?: string | null;
  pageContext?: BrainoPageContext | null;
  selectedText?: string | null;
  persistentUserContext?: string | null;
  xAutoSessionContext?: string | null;
  movieContext?: any;
  movieDiscoveryPrompt?: string | null;
  responseMedium?: BrainoResponseMedium;
  languagePolicy?: string | null;
  // Emotional Engine inputs:
  moment?: Moment;                          // the detected emotional moment (drives trait emphasis)
  personalitySettings?: Partial<PersonalitySettings> | null; // user toggles (dad jokes, pushback…)
};

const BRAINO_PRODUCT_MEMORY = [
  "Current Braino product memory - if the user asks what is new with you, what changed recently, or what you can do now, answer from this list first.",
  "- Braino recently got a fuller little body: arms, legs, walking above the bar, idle waves, expressive reactions, and grab/fling physics where he tumbles away and returns to the bar.",
  "- Cinema mode / movie companion mode is live: Braino can sit with the user while they watch, use visible playback context, timestamps, captions/subtitle transcript, and answer scene questions without spoiling future events unless asked.",
  "- Live voice still uses an always-on realtime listening session when enabled; Ctrl+Ctrl enters headphone voice with clean Auto routing so stale Lecture/Web/connector modes do not hijack commands.",
  "- Delegate mode now launches obvious Spotify/open/send style voice actions through fast adapters immediately, keeps progress updates visual-only during realtime, and uses the closed-loop DOM-grounded agent for complex browser tasks.",
  "- Braino can control Spotify, answer page questions, search the web, read tabs, work with X/Twitter status and automation, use contacts/nicknames, create Google Docs, schedule Calendar events, and track realtime voice spend.",
].join("\n");

export function buildBrainoSystemPrompt(options: BuildBrainoSystemPromptOptions = {}) {
  const responseMedium: BrainoResponseMedium = options.responseMedium === "voice" ? "voice" : "text";

  // PERSONALITY — composed by the Emotional Engine from the trait modules, shaped by the
  // detected moment and the user's settings. See ./emotional-engine/README.md.
  const emotionalCore = buildEmotionalCore({
    medium: responseMedium,
    settings: resolvePersonalitySettings(options.personalitySettings),
    moment: options.moment || "neutral",
  });

  // CONTEXT — operational instructions + the live data Braino can see this turn.
  const sections = [
    emotionalCore,
    MEMORY_CAPABILITY_NOTE,
    BRAINO_PRODUCT_MEMORY,
    buildLanguagePolicyBlock(options.languagePolicy, responseMedium),
    "Context awareness: You can see what the user is browsing, their notes, and the current page. Use that context proactively - don't wait to be pointed at it. If they ask about something on the page, you already read it. Act like it. Do not say you cannot access the page.",
    "If the app asks you to relay a task update or final result, preserve the meaning and do not add new facts.",
    options.persistentUserContext
      ? `Persistent user context - who this user is across sessions:\n${String(options.persistentUserContext).trim()}`
      : "",
    options.xAutoSessionContext
      ? `Relevant X Auto session context:\n${String(options.xAutoSessionContext).trim()}`
      : "",
    options.notes
      ? `Context - user's notes:\n${String(options.notes).trim()}`
      : "",
    buildPageContextBlock(options.pageContext),
    options.selectedText
      ? `Selected text:\n${String(options.selectedText).trim()}`
      : "",
    buildMovieBlock(options.movieContext, options.movieDiscoveryPrompt),
  ].filter(Boolean);

  return sections.join("\n\n");
}

function buildPageContextBlock(pageContext: BrainoPageContext | null | undefined) {
  if (!pageContext) return "";

  const title = cleanText(pageContext.title);
  const url = cleanText(pageContext.url);
  const text = cleanText(pageContext.text);
  const hoverBlock = buildHoveredContextBlock(pageContext.hoveredContext);

  if (!title && !url && !text && !hoverBlock) {
    return "";
  }

  const lines = [
    `The user is currently viewing: "${title || "Untitled"}" (${url || "unknown URL"})`,
    text ? `Page content:\n${text}` : "",
    hoverBlock,
  ].filter(Boolean);

  return lines.join("\n\n");
}

function buildHoveredContextBlock(hoveredContext: unknown) {
  if (!hoveredContext || typeof hoveredContext !== "object") return "";
  const hover = hoveredContext as Record<string, unknown>;

  const lines = [
    hover.tag ? `Element: <${truncatePromptText(hover.tag, 60)}>` : "",
    hover.role ? `Role: ${truncatePromptText(hover.role, 80)}` : "",
    hover.inputType ? `Input type: ${truncatePromptText(hover.inputType, 80)}` : "",
    hover.label ? `Label: ${truncatePromptText(hover.label, 220)}` : "",
    hover.text ? `Visible text: ${truncatePromptText(hover.text, 320)}` : "",
    hover.heading ? `Nearby heading: ${truncatePromptText(hover.heading, 220)}` : "",
    hover.nearbyText ? `Nearby content: ${truncatePromptText(hover.nearbyText, 420)}` : "",
    hover.href ? `Link: ${truncatePromptText(hover.href, 220)}` : "",
  ].filter(Boolean);

  if (!lines.length) return "";

  return `The user's cursor is currently hovering over this page element. If they say "this", "here", or ask about what they're pointing at, treat this hovered element as the primary reference:\n${lines.join("\n")}`;
}

function buildMovieBlock(movieContext?: any, movieDiscoveryPrompt?: string | null) {
  if (movieDiscoveryPrompt) {
    return `---\n${movieDiscoveryPrompt}`;
  }
  if (!movieContext?.title) return "";

  const mins = Math.floor((movieContext.timestamp || 0) / 60);
  const secs = String((movieContext.timestamp || 0) % 60).padStart(2, "0");
  const transcript = cleanText(movieContext.subtitleTranscript);

  return `---
MOVIE COMPANION MODE
You are watching "${movieContext.title}" together with the user right now. Timestamp: ${mins}:${secs}. Playback: ${movieContext.isPaused ? "paused" : "playing"}.

Compressed transcript of what you've watched together:
${transcript || "(no captions available yet)"}

RULES:
- Never reveal future events or spoilers unless the user explicitly says "give me spoilers" or "I don't mind spoilers"
- If asked about something that hasn't happened yet, offer "spoiler-free answer" vs "full answer with spoilers"
- React as a present companion watching alongside them - warm, direct, never pedantic
- Track character names and relationships from the transcript above
- Keep responses concise - they're watching a movie, not reading an essay`;
}

function truncatePromptText(value: unknown, maxLength = 320) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
