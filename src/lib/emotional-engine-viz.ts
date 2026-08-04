// The website's view of the Emotional Engine. NOT a copy of it any more.
//
// This file used to be a hand-maintained duplicate of the engine's trait list, moment
// map, steering sentence, and ordering function, with a header comment asking whoever
// edited the backend to remember to update it here too. That is a promise to remember
// something forever, and it was already drifting (a third copy also lives in the
// journal page). Now it re-exports the REAL engine, so the page cannot show a
// personality Braino does not actually have.
//
// The same cross-boundary import is used by /human-intelligence for the HIL prompt,
// so this pattern is proven with this Vite config. Every page that renders these is
// lazily loaded, so the trait prose never lands in the landing-page bundle.
//
// What is genuinely local below: MOMENT_CUES and MOMENT_ORDER. Those are display-only
// (plain-English examples of the regex cues, and a picker order). They have no backend
// equivalent to drift from.

import {
  ORDERED_TRAITS as ENGINE_TRAITS,
  TRAIT_BY_ID as ENGINE_TRAIT_BY_ID,
} from "../../supabase/functions/_shared/emotional-engine/manifest.ts";
import {
  MOMENT_EMPHASIS as ENGINE_MOMENT_EMPHASIS,
  MOMENT_LABEL as ENGINE_MOMENT_LABEL,
} from "../../supabase/functions/_shared/emotional-engine/moments.ts";
import {
  orderTraitsForMoment as engineOrderTraits,
  steeringLine as engineSteeringLine,
} from "../../supabase/functions/_shared/emotional-engine/engine.ts";
import type { Moment, Trait } from "../../supabase/functions/_shared/emotional-engine/types.ts";

export type { Moment };
// Kept as a name because three components import it. It IS the engine's Trait now.
export type VizTrait = Trait;

export const ORDERED_TRAITS: Trait[] = ENGINE_TRAITS;
export const TRAIT_BY_ID: Record<string, Trait> = ENGINE_TRAIT_BY_ID;
export const MOMENT_EMPHASIS: Record<Moment, string[]> = ENGINE_MOMENT_EMPHASIS;
export const MOMENT_LABEL: Record<Moment, string> = ENGINE_MOMENT_LABEL;

// The engine takes (moment, traits); the page has always called these with just the
// moment. These shims keep every existing call site working while the logic itself
// now runs the engine's real implementation instead of a copy of it.
export function orderTraitsForMoment(moment: Moment): Trait[] {
  return engineOrderTraits(moment, ENGINE_TRAITS);
}

export function steeringLine(moment: Moment): string {
  return engineSteeringLine(moment, ENGINE_TRAITS);
}

// Display only: the plain-English version of the word cues in moments.ts, for showing
// a reader what kind of phrasing trips each moment. The real matching is the regexes.
export const MOMENT_CUES: Record<Moment, string[]> = {
  neutral: [],
  crisis: ["“I want to die”", "“can't go on”", "“no reason to live”"],
  grief: ["“passed away”", "“lost my dad”", "“funeral”"],
  heartbreak: ["“we broke up”", "“she left me”", "“got ghosted”"],
  venting: ["“I just need to vent”", "“nobody gets it”", "“everything sucks”"],
  anxiety: ["“can't breathe”", "“panic attack”", "“spiralling”"],
  celebration: ["“we shipped it”", "“got the job”", "“best day”"],
  conflict: ["“be brutally honest”", "“am I wrong”", "“don't sugarcoat”"],
  banter: ["“lol”", "“roast me”", "“just messing around”"],
  focused_task: ["“fix this bug”", "“write me a function”", "“tl;dr”"],
  building: ["“what should I build next”", "“ideate with me”", "“what's new in you”"],
};

export const MOMENT_ORDER: Moment[] = [
  "neutral", "crisis", "grief", "heartbreak", "venting", "anxiety",
  "celebration", "conflict", "banter", "focused_task", "building",
];
