/* The four jobs inside Distra.
 *
 * It used to be six. Eight founder interviews on 22 August said otherwise: we
 * overlaid what their weeks actually contain and kept only what repeated.
 * Inbound calling came up zero times out of eight and is gone. Research is a
 * feed into Content rather than a box of its own, and Glue is the spine the
 * other three run on.
 *
 * Shared between the homepage and the Foundry page on purpose: two copies of
 * this list would drift the first time one of them changed.
 *
 * `state` is not decoration. Only Content is partly running, and a site that
 * implies otherwise is the one thing worse than a slow roadmap. Anything not
 * shipped says so, in the copy, on the page.
 */

export type EngineState = "Running" | "Next" | "Planned";

export type DistraEngine = {
  n: string;
  name: string;
  job: string;
  detail: string;
  state: EngineState;
};

export const DISTRA_ENGINES: DistraEngine[] = [
  {
    n: "01",
    name: "Content",
    job: "Post everywhere, in your voice",
    detail:
      "He learns how you write from two hundred of your own posts, reads what you shipped that week, and puts it out on every platform that matters. A listener watches your keywords all day and hands him the conversations worth joining, so he never starts from a blank page. Seven of the eight founders we sat down with named this as the thing hurting most.",
    state: "Running",
  },
  {
    n: "02",
    name: "Optics",
    job: "Get named when people ask an AI",
    detail:
      "Someone asks ChatGPT for a tool like yours and it names a competitor. He asks those questions himself every week, checks whether the answer says you, works out which page is missing, and ships the fix back through Content. Every founder we asked wanted this once it was explained. Citations churn about a quarter every month, so it is never done once.",
    state: "Next",
  },
  {
    n: "03",
    name: "Outbound",
    job: "Find the right people and write to them",
    detail:
      "Picked because they actually fit, with a message written from what they are doing rather than a template with their first name dropped in. He drafts. He has never sent anything on his own and he never will.",
    state: "Planned",
  },
  {
    n: "04",
    name: "Glue",
    job: "Make the other three talk, and hold the approval inbox",
    detail:
      "What the listener hears becomes what Content posts. What Optics finds missing becomes next week's post. Everything lands in one inbox where you approve, edit or bin it, out loud or with a tap. Three tools that do not know about each other is the actual problem, and this is the part nobody sells.",
    state: "Next",
  },
];
