import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";

type SkillStatus = "Working" | "Needs refinement" | "Planned";

type SkillRow = {
  name: string;
  type: "Skill" | "Integration" | "Ops page";
  status: SkillStatus;
  path?: string;
  canDo: string[];
  notes: string;
  next: string;
};

const statusClass: Record<SkillStatus, string> = {
  Working: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Needs refinement": "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Planned: "border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const rows: SkillRow[] = [
  {
    name: "LinkedIn Jobs",
    type: "Skill",
    status: "Working",
    path: "skills/linkedin-jobs/SKILL.md",
    canDo: [
      "Search LinkedIn Jobs by role and location.",
      "Open and inspect 3-5 jobs.",
      "Return job links, descriptions, requirements, and fit recommendations.",
    ],
    notes: "Surprisingly useful already. Main risk is LinkedIn UI/login changes.",
    next: "Keep improving result formatting and make sure it never stops after one job when more are available.",
  },
  {
    name: "X Growth + Posting",
    type: "Skill",
    status: "Working",
    path: "skills/x-growth-posting/SKILL.md",
    canDo: [
      "Read X status and follower changes.",
      "Offer to create a post after status checks.",
      "Draft in saved X tone, then post or schedule only after approval.",
    ],
    notes: "Good product loop because it turns account insight into action.",
    next: "QA voice/text parity and make the draft modal feel smoother.",
  },
  {
    name: "Google Maps",
    type: "Skill",
    status: "Needs refinement",
    path: "skills/google-maps/SKILL.md",
    canDo: [
      "Open Google Maps visibly for places, directions, and distance checks.",
      "Recommend places from visible Maps results.",
      "Ask whether to send the best pick to the phone.",
    ],
    notes: "Useful only if it becomes an outing planner, not just a Maps search wrapper.",
    next: "Add Resend email handoff and combine Maps with menu/budget sources for better recommendations.",
  },
  {
    name: "Google Calendar",
    type: "Skill",
    status: "Working",
    path: "skills/google-calendar/SKILL.md",
    canDo: [
      "Schedule, reschedule, cancel, forward, and list Calendar events.",
      "Create Google Meet links and 15-minute reminders by default.",
      "Open Meet at start time and hand off into Meeting & Call mode.",
    ],
    notes: "OAuth, Calendar actions, reminders, and Meet handoff are now wired through the real backend flow.",
    next: "Keep QA focused on watch renewal edge cases and any natural-language parsing misses.",
  },
  {
    name: "Realtime Costs Memory",
    type: "Skill",
    status: "Working",
    path: "skills/realtime-costs/SKILL.md",
    canDo: [
      "Answer exact realtime spend for the current or most recent session.",
      "Report today's cost and the last 7 days with concrete dates.",
      "Name the biggest cost driver and the priciest recent session.",
    ],
    notes: "This turns the ops logs into something Braino can actually speak back on demand.",
    next: "Keep polishing phrasing so voice-mode receipts feel instant and natural.",
  },
  {
    name: "Realtime Costs",
    type: "Ops page",
    status: "Working",
    path: "/realtime-costs",
    canDo: [
      "Log headphone-mode voice turns.",
      "Show transcripts, replies, token usage, and estimated cost.",
      "Warn if OpenAI audio output tokens appear when external TTS is selected.",
    ],
    notes: "Important for keeping GPT Realtime cost under control.",
    next: "Use this data before switching models or tuning voice behavior further.",
  },
  {
    name: "Voice Stack",
    type: "Integration",
    status: "Needs refinement",
    canDo: [
      "Use OpenAI Realtime for listening, VAD, transcription, and routing.",
      "Use Fish Audio as the main spoken voice.",
      "Track session cost logs and realtime voice usage.",
    ],
    notes: "Architecture is better now, but still needs careful QA because voice bugs are very visible.",
    next: "Keep external TTS as the only Braino voice and verify no duplicate speakers.",
  },
  {
    name: "Maps Phone Handoff",
    type: "Integration",
    status: "Planned",
    canDo: [
      "Send a selected Maps result to the user's phone.",
      "Include place name, reason, ETA, and a Google Maps button.",
      "Start with email via Resend before SMS/push.",
    ],
    notes: "This is what will make the Maps skill feel practical instead of decorative.",
    next: "Build a small authenticated Resend endpoint and store the user's preferred phone/email target.",
  },
];

const counts = rows.reduce(
  (acc, row) => {
    acc[row.status] += 1;
    return acc;
  },
  { Working: 0, "Needs refinement": 0, Planned: 0 } as Record<SkillStatus, number>,
);

export default function SkillsTracker() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="container mx-auto max-w-6xl px-6 pb-20 pt-32">
        <section className="mb-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Braino skills tracker
          </p>
          <h1
            className="max-w-3xl text-4xl font-normal leading-tight tracking-tight md:text-5xl"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            One simple place to track what Braino can do.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            A lightweight inventory of the skills and integration surfaces we have built, their current status,
            and what needs to happen next.
          </p>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-3">
          {(["Working", "Needs refinement", "Planned"] as SkillStatus[]).map((status) => (
            <div key={status} className="rounded-2xl border border-border bg-card/50 p-5">
              <div className="text-sm text-muted-foreground">{status}</div>
              <div className="mt-2 text-3xl font-semibold">{counts[status]}</div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card/40">
          <div className="hidden grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:grid">
            <div className="col-span-4">Skill / integration</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Can do</div>
            <div className="col-span-3">Next refinement</div>
          </div>

          {rows.map((row) => (
            <article key={row.name} className="grid grid-cols-1 gap-4 border-b border-border px-5 py-5 last:border-b-0 md:grid-cols-12">
              <div className="md:col-span-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{row.name}</h2>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{row.type}</span>
                </div>
                {row.path ? (
                  row.path.startsWith("/") ? (
                    <Link to={row.path} className="mt-2 inline-block text-xs text-primary hover:underline">
                      {row.path}
                    </Link>
                  ) : (
                    <div className="mt-2 font-mono text-xs text-muted-foreground">{row.path}</div>
                  )
                ) : null}
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{row.notes}</p>
              </div>

              <div className="md:col-span-2">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[row.status]}`}>
                  {row.status}
                </span>
              </div>

              <div className="md:col-span-3">
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {row.canDo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="text-sm leading-6 text-muted-foreground md:col-span-3">
                {row.next}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
