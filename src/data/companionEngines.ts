/* The three jobs inside the companion.
 *
 * Deliberately the same shape as `distraEngines.ts`, because the whole point of
 * the homepage is that the two halves of Braino read as one thing seen twice:
 * the companion runs your day, Foundry runs your distribution, and each does it
 * with three engines. Two lists of different shapes is what made the free half
 * read as a browser extension and the paid half read as a product.
 *
 * They are not peers. Habits is the goal; focus keeps you at it and routines
 * clear the time to get to it. The section footer says so — presenting three
 * equals invites the reader to ask why they share an app.
 *
 * Website voice, not deck voice. The pitch deck argues with retention figures
 * and a market size; a person reading this page wants to know what happens on
 * their Tuesday. Same facts, told as their experience rather than as evidence.
 *
 * `state` is not decoration, same rule as Distra: nothing here is shipped as a
 * packaged job yet, and the page says so rather than implying otherwise. The
 * pieces underneath (the screen watching, the voice, the agent) are real; the
 * three jobs built on top of them are not, and those are different claims.
 */

import type { EngineState } from "./distraEngines";

export type CompanionEngine = {
  n: string;
  name: string;
  job: string;
  detail: string;
  state: EngineState;
};

export const COMPANION_ENGINES: CompanionEngine[] = [
  {
    n: "01",
    name: "Habits",
    job: "The things you said you would do, actually done",
    detail:
      "You tell him once, out loud, what you already do and what you want to start. That conversation is the setup. He turns it into something you can look at, breaks it into days and weeks, and lets you move any of it around. Then at night you just say how it went and he fills it in while you talk. You have quit three of these apps already, and it was never because you stopped caring. It was the typing.",
    state: "Next",
  },
  {
    n: "02",
    name: "Focus",
    job: "Stay in the thing you sat down to do",
    detail:
      "Notifications off, your music on, a clock you can see. He is watching the same screen you are, so when you have been somewhere else for twenty minutes he mentions it once and offers to clear it. He does not lock you out of anything. Every other focus app is blunt because it has no idea what you were trying to do. He knows, because you told him this morning.",
    state: "Next",
  },
  {
    n: "03",
    name: "Routines",
    job: "The boring half of your morning, gone",
    detail:
      "The same four tabs, the same inbox sweep, the same fifteen minutes you have spent every morning for a year. He notices it before you have thought to ask, offers to take it, and then it is his. He never starts one on his own, and he only asks the once.",
    state: "Planned",
  },
];
