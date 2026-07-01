// Emotional Engine — THE HEART.
//
// buildEmotionalCore() is the one function that turns Braino's traits + the current moment +
// the user's settings into the personality half of his system prompt. Everything else in this
// folder is data; this is the assembler.
//
// What it does, in plain terms:
//   1. Take the traits in their default order (manifest.ts).
//   2. If the user is in a specific emotional moment, move the traits that should LEAD to the
//      front and add one steering sentence so the model knows what to prioritize right now.
//   3. Render each trait's prose for this medium + settings (a trait can render "" to opt out,
//      e.g. humor when humor is turned off).
//   4. Join it all into one block.
//
// The context (notes, page, movie, etc.) is added separately by braino-prompt.ts — this function
// is ONLY personality.

import type { Moment, PersonalitySettings, ResponseMedium, Trait } from "./types.ts";
import { ORDERED_TRAITS, TRAIT_BY_ID } from "./manifest.ts";
import { MOMENT_EMPHASIS, MOMENT_LABEL } from "./moments.ts";
import { DEFAULT_PERSONALITY_SETTINGS } from "./settings.ts";

export type BuildEmotionalCoreOptions = {
  medium?: ResponseMedium;
  settings?: PersonalitySettings;
  moment?: Moment;
};

export function buildEmotionalCore(options: BuildEmotionalCoreOptions = {}): string {
  const medium: ResponseMedium = options.medium === "voice" ? "voice" : "text";
  const settings = options.settings || DEFAULT_PERSONALITY_SETTINGS;
  const moment: Moment = options.moment || "neutral";

  const ordered = orderTraitsForMoment(moment);

  const ctx = { medium, settings, moment };
  const renderedTraits = ordered
    .map((trait) => trait.body(ctx).trim())
    .filter(Boolean);

  const steer = steeringLine(moment);
  const parts = steer ? [steer, ...renderedTraits] : renderedTraits;

  return parts.join("\n\n");
}

// Move the traits this moment wants to lead with to the front, preserving the manifest order
// for everything else. Unknown/duplicate ids are ignored safely.
function orderTraitsForMoment(moment: Moment): Trait[] {
  const leadIds = MOMENT_EMPHASIS[moment] || [];
  if (leadIds.length === 0) return ORDERED_TRAITS;

  const seen = new Set<string>();
  const lead: Trait[] = [];
  for (const id of leadIds) {
    const trait = TRAIT_BY_ID[id];
    if (trait && !seen.has(id)) {
      lead.push(trait);
      seen.add(id);
    }
  }
  const rest = ORDERED_TRAITS.filter((t) => !seen.has(t.id));
  return [...lead, ...rest];
}

// The single sentence that tells the model what to prioritize right now. This is the whole
// "different responses use different traits" mechanism, in one legible line.
function steeringLine(moment: Moment): string {
  if (moment === "neutral") return "";
  const leadIds = MOMENT_EMPHASIS[moment] || [];
  if (leadIds.length === 0) return "";
  const traitNames = leadIds
    .map((id) => TRAIT_BY_ID[id]?.name?.split(/[—,]/)[0].trim().toLowerCase())
    .filter(Boolean)
    .join(", ");
  return `Right now the user is in ${MOMENT_LABEL[moment]} moment. Lead with ${traitNames}; let the rest of who you are stay present but recede. Attune to where they actually are before you respond.`;
}
