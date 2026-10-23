import type { Person, Post, Project, Stage } from "./foundry/store";

/* A sample Braino Foundry project for the /foundry landing page shots
   (2026-10-23): RentOnTime, rent reminders for PG owners. Static, never saved. */

const now = Date.UTC(2026, 9, 23, 9, 0);
const H = 3600_000;

const person = (id: string, platform: Person["platform"], community: string, title: string, body: string, intent: number, why: string, message: string, stage: Stage = "found"): Person => ({
  id, url: "#", platform, community, title, body, quote: title, intent, why, message, opener: "",
  stage, stageAt: now - 3 * H, status: "waiting", thread: [], followUp: "",
});

export const SAMPLE_PEOPLE: Person[] = [
  person("p1", "reddit", "IndianStartups", "Running 3 PGs and half my weekend goes to chasing rent on WhatsApp. Any app for this?", "40 tenants across 3 buildings. I keep a notebook and still forget who paid. Tried a spreadsheet, nobody updates it.", 86, "Owns PGs and asks for a tool by name. Close to buying.",
    "Same problem got us building RentOnTime. It sends tenants a polite reminder on the 1st and a nudge on the 5th, so you stop being the bad guy. Happy to set it up for your 3 PGs, free for a month."),
  person("p2", "linkedin", "Arjun Mehta, PG owner, Pune", "Collecting rent from 60 students every month is a full time job nobody pays you for.", "Every month the same 10 people pay late and I have to call each one.", 72, "Feels the pain every month, and talks about it in public.",
    "Arjun, this hit home. We built RentOnTime for exactly those 10 people: automatic UPI reminders, and a list of who paid. Want me to set it up for your PG this month?"),
];

const post = (id: string, platform: Post["platform"], day: number, time: string, text: string, status: Post["status"] = "waiting", title?: string): Post => ({ id, platform, day, time, text, title, topicId: "t1", status, at: now });

export const SAMPLE_POSTS: Post[] = [
  post("s1", "linkedin", 1, "9:00", "We asked 40 PG owners what the worst part of the job is.\n\nNot repairs. Not food complaints. Chasing rent.\n\nOne owner in Pune spends every first weekend of the month calling the same 10 tenants. Another keeps a notebook and still forgets who paid.\n\nSo we built RentOnTime. A polite reminder on the 1st, a nudge on the 5th, and a list of who paid. You stop being the bad guy.\n\nIf you run a PG, I would love to hear how you collect rent today.", "approved"),
  post("s2", "x", 0, "8:30", "Chasing rent is the worst job in running a PG. Nobody signs up for it.", "approved"),
  post("s3", "reddit", 2, "19:00", "How I stopped chasing rent across 3 PGs", "waiting", "How I stopped chasing rent across 3 PGs"),
  post("s4", "x", 4, "12:00", "A tenant thanked us for the reminder. First time that has ever happened."),
  post("s5", "linkedin", 3, "9:30", "The best rent apps for PG owners, compared."),
];

export const SAMPLE: Project = {
  id: "sample", name: "RentOnTime", created: now - 2 * H, updated: now, onboarded: true,
  draft: { desc: "Rent reminders for PG owners", url: "rentontime.in", linkedin: "", why: "" },
  siteRead: { ok: true, note: "Read 4 pages", pages: 4 }, linkedinRead: null,
  memory: {
    product: { name: "RentOnTime", oneLiner: "Rent reminders for PG owners", buyer: "PG owners in India", problem: "Chasing rent every month", pricing: "Rs 499 a month", proof: "", tone: "Warm, plain", missing: [], site: "rentontime.in" },
    founder: { name: "Riya", who: "Founder", whyTrust: "Ran a PG for 4 years", voice: "Warm, plain", linkedin: "", why: "" },
    buyer: { buyer: "PG owners", questions: [], redditPhrases: [] },
    quotes: [], gaps: [], topics: [{ id: "t1", title: "Chasing rent", source: "reddit", sourceText: "", at: now }], objections: [],
    activity: [
      { id: "a1", at: now - 60_000, who: "outreach", text: "Found 23 people on Reddit, X, LinkedIn and Quora" },
      { id: "a2", at: now - 90_000, who: "optics", text: "Asked AI 8 buyer questions. NoBroker named in 5" },
      { id: "a3", at: now - 100_000, who: "memory", text: "Saved 6 buyer quotes for Content" },
    ],
  },
  optics: {
    at: now, google: [], googleNote: "", fixes: [], made: {},
    answers: [
      { question: "Best app to collect rent from PG tenants", names: ["NoBroker", "RentOk", "RentOnTime"], hits: 1, runs: 3 },
      { question: "How do I remind tenants to pay rent on time", names: ["NoBroker", "MyGate"], hits: 0, runs: 3 },
      { question: "PG management software India", names: ["RentOk", "Stanza", "NoBroker"], hits: 0, runs: 3 },
      { question: "Automatic UPI rent reminders", names: ["RentOk"], hits: 2, runs: 3 },
    ],
  },
  posts: SAMPLE_POSTS, people: SAMPLE_PEOPLE, runs: [], lastRun: now, autopilot: true, searchNote: "",
  launchTags: ["b2c", "india"],
};
