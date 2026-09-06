// The HIL loop driver: hil.py's run() as a browser-side state machine.
//
// One rule shapes everything here: the model decides, this file enforces. Each turn
// the runner sends the server a fresh snapshot of the run plus the live element map
// (never a transcript), gets back exactly one action, fires it at the pretend web,
// folds the result in, and calls again. The three hard guarantees live in THIS file,
// as code paths, not as hopes about model behavior:
//   1. The gate: reversibility is decided by WHAT is being clicked, read off the live
//      observation (isIrreversibleClick), exactly like bgCartSafetyBlock in the real
//      extension. A gated action does not run until confirm() is called by a real
//      click. decline() ends the run cleanly.
//   2. Tier-zero verification: a result carrying { error } is marked failed on the
//      spot, before the model ever sees it. The model's verdict fills in the rest
//      next turn.
//   3. Legible stops: every ending is named (all_done, declined, blocked, budget,
//      error), and the same failure three times ends the run even if the model
//      keeps trying (the prompt tells it to stop at two; this is the backstop).

import {
  type PageElement,
  type World,
  type WorldPreset,
  createWorld,
  elementAt,
  elementMap,
  currentUrl,
  isIrreversibleClick,
  renderObservation,
  runAction,
  sabotageCloseTab,
  sabotageJamSite,
} from "./hilLoopWorld";

const BUDGET_PER_TASK = 14;
const MAX_TURNS = 45;

// ── Escalation to Astra ─────────────────────────────────────────────────────
// The loop does not get a second executor when it escalates. It gets a better
// thinker behind the same one. Every guarantee in this file — the confirmation
// gate, the repeat guard, tier-zero verification, the budget — is a code path
// below, so they all keep holding for Astra exactly as they hold for him. That
// is the whole reason the handoff is a flag on the turn rather than a separate
// runner: a second runner would be a second set of gates to get wrong, and the
// one it would get wrong is the one that spends money.
//
// Two repeats, not three. Three is where the run DIES; escalating there would
// mean Astra only ever arrives to be told the patient is gone. Two is the last
// moment a rescue can still be a rescue.
const RESCUE_AT_REPEATS = 2;
// Escalate before the budget is spent, not after, for the same reason. Handing
// Astra a job with one action left is not a handoff, it is a blame transfer.
const RESCUE_BUDGET_FLOOR = 3;
// What Astra gets to spend. It REPLACES what is left rather than adding to it,
// so a rescue costs the same whether it was called early or late, and one stuck
// run can never cost more than this many turns of the expensive model.
const RESCUE_BUDGET = 10;

export type LoopTask = { desc: string; status: "pending" | "active" | "done" };

export type StepEvent = {
  kind: "step";
  id: number;
  taskIndex: number;
  thinking: string;
  intent: string;
  action: Record<string, unknown>;
  actionLabel: string;          // human-readable, e.g. click [3] "Send"
  targetName: string | null;    // the element name, when the action targets one
  expects: string;
  reversible: boolean;
  result: unknown;
  ok: boolean | null;
  why: string | null;
  executed: boolean;
  recovery: boolean;
  gated: boolean;
};

export type LoopEvent =
  | { kind: "split"; thinking: string; goal: string; tasks: string[] }
  | StepEvent
  | { kind: "ask"; id: number; thinking: string; question: string; answer: string | null }
  | { kind: "task_done"; thinking: string; message: string; taskIndex: number }
  | { kind: "sabotage"; text: string }
  | { kind: "handoff"; reason: string; budget: number }
  | { kind: "ending"; outcome: "all_done" | "declined" | "blocked" | "budget" | "error"; message: string; thinking: string | null };

export type LoopPhase = "idle" | "thinking" | "awaiting_answer" | "awaiting_confirm" | "ended";

export type LoopMoment = { id: string; label: string; leads: string[]; intensity: number } | null;

type ServerTurn = {
  thinking: string;
  split: { restated_goal: string; tasks: string[] } | null;
  verdict: { ok: boolean; why: string | null } | null;
  decision:
    | { type: "step"; step: { intent: string; action: Record<string, unknown>; expects: string; reversible: boolean; assert?: Record<string, unknown> } }
    | { type: "ask"; question: string }
    | { type: "answer"; text: string }
    | { type: "task_done" | "all_done" | "blocked"; message: string };
};

type ServerResponse = {
  turn: ServerTurn;
  moment: { id: string; label: string; leads: string[]; intensity: number };
  meta: { model: string; elapsed_ms: number; hil_loop_version: string; parse_ok: boolean; rescue?: boolean };
  error?: string;
};

// "click [3] \"Send\"" reads the way the real trace log reads, so what you watch here
// matches what the extension prints for the same move.
function describeAction(action: Record<string, unknown>, target: PageElement | null): string {
  const t = String(action?.type || "");
  if (t === "navigate") return `navigate to ${String(action.url || "")}`;
  if (t === "read") return "read the page";
  if (t === "look") return "look at the screen";
  if (t === "click") return `click [${action.index}]${target ? ` "${target.name}"` : ""}`;
  if (t === "type") return `type into [${action.index}]${target ? ` "${target.name}"` : ""}: "${String(action.text || "")}"${action.submit === true ? " and submit" : ""}`;
  if (t === "pressKey") return `press ${String(action.key || "")}`;
  if (t === "scroll") return `scroll ${String(action.direction || "down")}`;
  if (t === "wait") return `wait ${String(action.ms || 1000)}ms`;
  if (t === "web_search") return `web search: "${String(action.query || "")}"`;
  return t || "unknown action";
}

export class HilLoopRunner {
  phase: LoopPhase = "idle";
  events: LoopEvent[] = [];
  tasks: LoopTask[] = [];
  goal: string | null = null;
  moment: LoopMoment = null;
  meta: { model: string; version: string } | null = null;

  private command = "";
  private context = "";
  // Ties every turn of one run together in the engine_runs log, so a nine-turn
  // run reads as one session instead of nine unrelated rows.
  private runId = "";
  private world: World = createWorld();
  private facts: string[] = [];
  private stepRecords: Array<{ intent: string; action: string; ok: boolean | null; why: string | null }> = [];
  private budgetLeft = BUDGET_PER_TASK;
  private turnCount = 0;
  private nextId = 1;
  private failureCounts = new Map<string, number>();
  private pendingLastStep: { intent: string; action: unknown; expects: string; result: unknown } | null = null;
  private pendingUserReply: string | null = null;
  private pendingGatedStep: StepEvent | null = null;
  private stopped = false;
  private lastStepFailed = false;
  private lastActionSig: string | null = null;
  // Astra is either driving this run or it is not, and it can only become true
  // once. A rescue that also gets stuck must end the run: retrying the expensive
  // model against the same wall is how one bad task quietly bills like fifty.
  private rescueActive = false;
  private rescueUsed = false;
  private rescueReason = "";

  constructor(
    private supabaseUrl: string,
    private supabaseKey: string,
    private onChange: () => void,
  ) {}

  // Every turn of this run shares this id in the log, so a verdict left on the
  // run marks the whole thing rather than whichever turn happened to be last.
  get currentRunId(): string {
    return this.runId;
  }

  // For the UI. The notch and the run panel both need to say who is driving.
  get onAstra(): boolean {
    return this.rescueActive;
  }

  // What he can see right now, for the live screen panel in the UI.
  get screen(): { url: string; elements: PageElement[] } {
    return { url: currentUrl(this.world), elements: elementMap(this.world) };
  }

  async start(command: string, context: string, preset: WorldPreset = "empty", screenImage = "") {
    this.phase = "thinking";
    this.events = [];
    this.tasks = [];
    this.goal = null;
    this.moment = null;
    this.command = command.trim();
    this.context = context.trim();
    this.runId = crypto.randomUUID();
    this.world = createWorld(preset, screenImage);
    this.lastActionSig = null;
    this.facts = [];
    this.stepRecords = [];
    this.budgetLeft = BUDGET_PER_TASK;
    this.turnCount = 0;
    this.nextId = 1;
    this.failureCounts.clear();
    this.pendingLastStep = null;
    this.pendingUserReply = null;
    this.pendingGatedStep = null;
    this.stopped = false;
    this.lastStepFailed = false;
    this.rescueActive = false;
    this.rescueUsed = false;
    this.rescueReason = "";
    this.onChange();
    await this.turn();
  }

  stop() {
    this.stopped = true;
    if (this.phase !== "ended") this.end("error", "Run stopped by you.", null);
  }

  async answer(text: string) {
    if (this.phase !== "awaiting_answer") return;
    const trimmed = text.trim();
    if (!trimmed) return;
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      if (e.kind === "ask" && e.answer === null) { e.answer = trimmed; break; }
    }
    this.facts.push(`The user answered: "${trimmed}"`);
    this.pendingUserReply = trimmed;
    this.phase = "thinking";
    this.onChange();
    await this.turn();
  }

  async confirm() {
    if (this.phase !== "awaiting_confirm" || !this.pendingGatedStep) return;
    const card = this.pendingGatedStep;
    this.pendingGatedStep = null;
    this.phase = "thinking";
    this.onChange();
    await this.executeAndContinue(card);
  }

  decline() {
    if (this.phase !== "awaiting_confirm" || !this.pendingGatedStep) return;
    const card = this.pendingGatedStep;
    card.why = "you said no";
    this.pendingGatedStep = null;
    this.end("declined", `Held at the gate: "${card.actionLabel}" never ran, because you declined it.`, null);
  }

  sabotageCloseTab() {
    if (this.phase === "ended" || this.phase === "idle") return;
    this.events.push({ kind: "sabotage", text: sabotageCloseTab(this.world) });
    this.onChange();
  }

  sabotageJamSite() {
    if (this.phase === "ended" || this.phase === "idle") return;
    this.events.push({ kind: "sabotage", text: sabotageJamSite(this.world) });
    this.onChange();
  }

  // ── The loop ────────────────────────────────────────────────────────────────

  private async turn() {
    if (this.stopped || this.phase === "ended") return;
    if (++this.turnCount > MAX_TURNS) {
      this.end("budget", `Stopped after ${MAX_TURNS} turns of thinking. Something was circling.`, null);
      return;
    }

    // The observation goes on EVERY turn including the first. A referent like
    // "this email" can only be resolved by looking, so the very turn that has to
    // resolve it is the one that most needs the screen.
    const payload = {
      command: this.command,
      context: this.context || undefined,
      runId: this.runId,
      // Sent on EVERY turn once the handoff happens, not just the first one. The
      // server holds no session, so a flag sent once would put Astra on the turn
      // that took over and quietly drop back to him for the rest of the rescue,
      // which reads as Astra being erratic rather than as a bug here.
      rescue: this.rescueActive || undefined,
      rescueReason: this.rescueActive ? this.rescueReason : undefined,
      state: {
        tasks: this.tasks,
        facts: this.facts.slice(-20),
        asides: [],
        steps: this.stepRecords.slice(-20),
        budgetLeft: this.budgetLeft,
        screen: renderObservation(this.world),
        userReply: this.pendingUserReply || undefined,
        lastStep: this.pendingLastStep || undefined,
      },
    };
    this.pendingUserReply = null;
    const sentLastStep = this.pendingLastStep;
    this.pendingLastStep = null;

    let data: ServerResponse | null = null;
    for (let attempt = 0; attempt < 2 && !data; attempt++) {
      try {
        const res = await fetch(`${this.supabaseUrl}/functions/v1/hil-loop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.supabaseKey,
            Authorization: `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => ({}))) as ServerResponse;
        if (!res.ok) throw new Error(body?.error || "The thinking call failed.");
        if (body.meta?.parse_ok === false && attempt === 0) continue;
        data = body;
      } catch (e) {
        if (attempt === 1) {
          this.end("error", e instanceof Error ? e.message : "The thinking call failed twice.", null);
          return;
        }
      }
    }
    if (!data || this.stopped) return;

    this.moment = data.moment || null;
    this.meta = data.meta ? { model: data.meta.model, version: data.meta.hil_loop_version } : this.meta;
    const turn = data.turn;

    if (turn.verdict && sentLastStep) {
      for (let i = this.events.length - 1; i >= 0; i--) {
        const e = this.events[i];
        if (e.kind === "step" && e.executed && e.ok === null) {
          e.ok = turn.verdict.ok;
          e.why = turn.verdict.why;
          break;
        }
      }
      const rec = this.stepRecords[this.stepRecords.length - 1];
      if (rec && rec.ok === null) { rec.ok = turn.verdict.ok; rec.why = turn.verdict.why; }
      this.lastStepFailed = !turn.verdict.ok;
    }

    // First turn: the split lands before any action. The same turn usually carries
    // the first step too, so the step card below suppresses the identical thinking
    // rather than printing it twice.
    let splitJustLanded = false;
    if (turn.split && !this.tasks.length) {
      this.goal = turn.split.restated_goal || this.command;
      this.tasks = turn.split.tasks.map((desc, i) => ({ desc, status: i === 0 ? "active" as const : "pending" as const }));
      this.events.push({ kind: "split", thinking: turn.thinking, goal: this.goal, tasks: turn.split.tasks });
      splitJustLanded = true;
      this.onChange();
    }

    await this.handleDecision(turn, splitJustLanded);
  }

  private async handleDecision(turn: ServerTurn, splitJustLanded: boolean) {
    const d = turn.decision;

    if (d.type === "step") {
      const action = d.step.action || {};
      const target = action.type === "click" || action.type === "type"
        ? elementAt(this.world, Number(action.index))
        : null;
      // THE GATE, decided here: what is being clicked settles it, not the model's
      // opinion. Matches bgCartSafetyBlock's approach in the real extension.
      const gated = !d.step.reversible || isIrreversibleClick(this.world, String(action.type), action);

      const card: StepEvent = {
        kind: "step",
        id: this.nextId++,
        taskIndex: this.activeTaskIndex(),
        thinking: splitJustLanded ? "" : turn.thinking,
        intent: d.step.intent,
        action,
        actionLabel: describeAction(action, target),
        targetName: target?.name ?? null,
        expects: d.step.expects,
        reversible: !gated,
        result: null,
        ok: null,
        why: null,
        executed: false,
        recovery: this.lastStepFailed,
        gated,
      };
      this.events.push(card);

      if (gated) {
        this.pendingGatedStep = card;
        this.phase = "awaiting_confirm";
        this.onChange();
        return;
      }
      this.onChange();
      await this.executeAndContinue(card);
      return;
    }

    if (d.type === "ask") {
      this.events.push({ kind: "ask", id: this.nextId++, thinking: splitJustLanded ? "" : turn.thinking, question: d.question, answer: null });
      this.phase = "awaiting_answer";
      this.onChange();
      return;
    }

    if (d.type === "answer") {
      // The findings ARE the completion for informational work: hand them over and
      // close out, rather than browsing on to prove a task that is already answered.
      this.tasks.forEach((t) => { if (t.status !== "done") t.status = "done"; });
      this.end("all_done", d.text, turn.thinking);
      return;
    }

    if (d.type === "task_done") {
      const doneIndex = this.activeTaskIndex();
      if (this.tasks[doneIndex]) this.tasks[doneIndex].status = "done";
      this.events.push({ kind: "task_done", thinking: turn.thinking, message: d.message, taskIndex: doneIndex });
      const next = this.tasks.findIndex((t) => t.status === "pending");
      if (next === -1) {
        this.end("all_done", d.message || "Everything asked for is finished.", turn.thinking);
        return;
      }
      this.tasks[next].status = "active";
      this.budgetLeft = BUDGET_PER_TASK;
      this.lastStepFailed = false;
      this.onChange();
      await this.turn();
      return;
    }

    if (d.type === "all_done") {
      this.tasks.forEach((t) => { if (t.status === "active") t.status = "done"; });
      this.end("all_done", d.message, turn.thinking);
      return;
    }

    // "blocked" is him saying he cannot see a way through. That is a request for
    // a better thinker, not a reason to stop, so it becomes one the first time.
    if (this.escalate(`he stopped and said: "${String(d.message || "").slice(0, 200)}"`)) {
      await this.turn();
      return;
    }
    this.end("blocked", d.message, turn.thinking);
  }

  private async executeAndContinue(card: StepEvent) {
    // Repeat guard, deterministic, mirroring bgIsRepeatedDelegateAction in the real
    // extension: a read gives a fresh observation every turn anyway, so reading twice
    // in a row cannot teach him anything. It gets refused with a reason rather than
    // silently eating the job's budget the way a real stall does.
    const sig = JSON.stringify(card.action);
    if (card.action.type === "read" && this.lastActionSig === sig) {
      const note = "You already read this page and the fresh observation is in front of you. Reading again changes nothing. Act on what is listed, or ask if the page genuinely does not hold what you need.";
      card.executed = true;
      card.result = { error: note };
      card.ok = false;
      card.why = "a second identical read in a row, refused";
      this.lastStepFailed = true;
      this.stepRecords.push({ intent: card.intent, action: card.actionLabel, ok: false, why: note });
      this.pendingLastStep = { intent: card.intent, action: card.action, expects: card.expects, result: { error: note } };
      this.onChange();
      await this.turn();
      return;
    }
    this.lastActionSig = sig;

    const result = runAction(this.world, String(card.action.type), card.action);
    card.result = result;
    card.executed = true;

    // Tier zero, deterministic and instant: an error result is a fail on the spot.
    const errText = typeof (result as Record<string, unknown>)?.error === "string"
      ? String((result as Record<string, unknown>).error)
      : null;
    if (errText) {
      card.ok = false;
      card.why = errText;
      this.lastStepFailed = true;
      const sig = `${card.action.type}:${errText}`;
      const n = (this.failureCounts.get(sig) || 0) + 1;
      this.failureCounts.set(sig, n);
      // The strongest stuck signal there is: the same move failing the same way.
      // Escalate one strike before the backstop kills the run.
      if (n === RESCUE_AT_REPEATS && this.escalate(`${card.actionLabel} failed twice with the same error: "${errText}"`)) {
        // Recorded here rather than at the bottom because this path returns, and
        // a handoff that loses the failure it was called for would hand Astra a
        // run with no visible reason to have been handed anything.
        this.stepRecords.push({ intent: card.intent, action: card.actionLabel, ok: false, why: errText });
        this.pendingLastStep = { intent: card.intent, action: card.action, expects: card.expects, result };
        await this.turn();
        return;
      }
      if (n >= 3) {
        this.stepRecords.push({ intent: card.intent, action: card.actionLabel, ok: false, why: errText });
        this.end("blocked", `The same thing failed three times: ${card.actionLabel} kept saying "${errText}". I stopped instead of looping.`, null);
        return;
      }
    } else {
      this.lastStepFailed = false;
    }

    // Findings that must OUTLIVE the turn that produced them.
    //
    // The step record keeps only what was attempted and whether it worked, and
    // the full result is handed back for exactly one turn. That is right for a
    // click, whose meaning is "it worked", and wrong for anything whose whole
    // value is the content that came back. A look costs a screenshot and a
    // vision call, and it was being forgotten immediately: the loop looked at
    // the Eiffel Tower on turn one and said "the screen is blank" on turn two.
    // A search answer has the same shape. Both go into facts, which every turn
    // carries, so a thing learned once stays learned.
    const payload = result as Record<string, unknown>;
    if (!errText) {
      if (typeof payload?.sees === "string") this.facts.push(`I looked at the screen and saw: ${payload.sees}`);
      else if (typeof payload?.answer === "string") this.facts.push(`Search "${String(card.action.query || "")}" answered: ${payload.answer}`);
    }

    this.stepRecords.push({ intent: card.intent, action: card.actionLabel, ok: errText ? false : null, why: errText });
    this.pendingLastStep = { intent: card.intent, action: card.action, expects: card.expects, result };

    this.budgetLeft -= 1;
    this.onChange();
    if (this.budgetLeft <= 0) {
      // Astra exhausting its own budget is the cap doing its job, and it reads
      // differently to the user, so it says so. There is no second rescue: this
      // is where a run that beat both brains stops costing money.
      this.end(
        "budget",
        this.rescueActive
          ? `Astra took over and still could not finish inside ${RESCUE_BUDGET} actions. I stopped rather than keep spending on it.`
          : `The budget for this job ran out (${BUDGET_PER_TASK} actions). I stopped cleanly instead of grinding.`,
        null,
      );
      return;
    }
    // Grinding towards the end of the budget with the job still open is the
    // quiet kind of stuck: nothing errored, nothing worked either. Escalate with
    // enough left to matter rather than at zero, where there is nothing to hand over.
    if (this.budgetLeft <= RESCUE_BUDGET_FLOOR && this.escalate(`the job is still not done with only ${this.budgetLeft} of ${BUDGET_PER_TASK} actions left`)) {
      await this.turn();
      return;
    }
    await this.turn();
  }

  // Hand the wheel to Astra. Returns false when the run has already used its one
  // rescue, which is the caller's signal to fall through to whatever it would
  // have done anyway — normally ending the run.
  //
  // Nothing is executed here and nothing is undone. The next turn simply goes to
  // a different model with the failure spelled out, and the loop carries on from
  // exactly where it stood. That matters: the alternative, tearing down and
  // restarting, is what leaves half-filled forms and double-sent messages behind.
  private escalate(reason: string): boolean {
    if (this.rescueUsed || this.phase === "ended") return false;
    this.rescueUsed = true;
    this.rescueActive = true;
    this.rescueReason = reason;
    // A fresh budget, not a top-up. See RESCUE_BUDGET.
    this.budgetLeft = RESCUE_BUDGET;
    // The repeat tally belongs to the brain that ran into it. Carrying his
    // failures forward would end Astra's run on its first stumble, at the third
    // strike he earned rather than the third strike it did.
    this.failureCounts.clear();
    // The repeat guard is deliberately NOT cleared. A second identical read is
    // still pointless when Astra does it, and its first move is usually a look.
    this.events.push({ kind: "handoff", reason, budget: RESCUE_BUDGET });
    this.onChange();
    return true;
  }

  private activeTaskIndex(): number {
    const i = this.tasks.findIndex((t) => t.status === "active");
    return i === -1 ? 0 : i;
  }

  private end(outcome: "all_done" | "declined" | "blocked" | "budget" | "error", message: string, thinking: string | null) {
    if (this.phase === "ended") return;
    this.phase = "ended";
    this.events.push({ kind: "ending", outcome, message, thinking });
    this.onChange();
  }
}
