/* The six jobs inside Distra.
 *
 * Distribution is not one job, it is six, and until now the site described only
 * the first of them. A founder reading "he posts for you" has no idea the other
 * five exist, which is the whole argument for buying a conductor rather than
 * another posting tool.
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
      "He learns how you write from two hundred of your own posts, reads what you shipped that week, and puts it out on every platform that matters. You are not writing seven versions of the same thing again.",
    state: "Running",
  },
  {
    n: "02",
    name: "Optics",
    job: "Get recommended by the AI people ask",
    detail:
      "When someone asks ChatGPT for a tool like yours, it names a competitor and not you. He watches for that, works out which page is missing, and tells you the one fix that changes the answer. Most tools measure this. He acts on it.",
    state: "Next",
  },
  {
    n: "03",
    name: "Outbound",
    job: "Find the right people and reach them",
    detail:
      "Twenty five a day, picked because they actually fit, with a message written from what they are doing rather than a template with their first name in it.",
    state: "Planned",
  },
  {
    n: "04",
    name: "Inbound",
    job: "Answer, qualify, book",
    detail:
      "Somebody lands on your site at midnight with a question. He answers it, works out whether they are real, and puts the meeting in your calendar before you wake up.",
    state: "Planned",
  },
  {
    n: "05",
    name: "Research",
    job: "Listen for people describing your problem",
    detail:
      "Reddit and the forums, all day, for someone saying the exact thing your product fixes. Those are the warmest leads there are, and they expire in about an hour.",
    state: "Planned",
  },
  {
    n: "06",
    name: "Glue",
    job: "Make the other five talk",
    detail:
      "What Research hears becomes what Content posts. Who Outbound reached shows up when Inbound answers. Five tools that do not know about each other is the actual problem, and this is the part nobody sells.",
    state: "Planned",
  },
];
