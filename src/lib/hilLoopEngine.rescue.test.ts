import { describe, expect, it, vi, afterEach } from "vitest";
import { HilLoopRunner } from "./hilLoopEngine";

/* The escalation to Astra, tested where it actually decides.
 *
 * Every guard here is about money or about acting twice, and both are the kind
 * of bug you only find in production and only after it has already happened. So
 * they are pinned as behaviour, not as intentions in a comment:
 *   - a run escalates once, never twice, however many walls it hits;
 *   - the flag is sent on EVERY turn of a rescue, not just the one that started
 *     it, because the server keeps no session;
 *   - Astra's budget is a ceiling, and running into it ends the run rather than
 *     handing back to him for another lap.
 */

type Decision = Record<string, unknown>;

function turnBody(decision: Decision, split: unknown = null) {
  return {
    turn: { thinking: "t", split, verdict: null, decision },
    moment: { id: "neutral", label: "Neutral", leads: [], intensity: 1 },
    meta: { model: "test", elapsed_ms: 1, hil_loop_version: "test", parse_ok: true },
  };
}

/* Returns the bodies the runner posted, so what was SENT can be asserted rather
   than only what came back. The rescue flag lives in the request. */
function mockServer(bodies: unknown[]) {
  const sent: any[] = [];
  let i = 0;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: any) => {
    sent.push(JSON.parse(init.body));
    const body = bodies[Math.min(i, bodies.length - 1)];
    i += 1;
    return { ok: true, json: async () => body } as any;
  }));
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

describe("handing off to Astra", () => {
  it("escalates when he gives up, and says so once", async () => {
    const sent = mockServer([
      turnBody({ type: "blocked", message: "I cannot see a way in." }),
      turnBody({ type: "all_done", message: "Astra finished it." }),
    ]);
    const runner = new HilLoopRunner("http://x", "k", () => {});
    await runner.start("do the thing", "");

    const handoffs = runner.events.filter((e) => e.kind === "handoff");
    expect(handoffs).toHaveLength(1);
    expect(runner.onAstra).toBe(true);
    // He asked for help; the run did not die at the wall.
    expect(runner.events.some((e) => e.kind === "ending" && e.outcome === "blocked")).toBe(false);

    // Turn one is his, every turn after the handoff is Astra's.
    expect(sent[0].rescue).toBeUndefined();
    expect(sent[1].rescue).toBe(true);
    expect(String(sent[1].rescueReason)).toContain("cannot see a way in");
  });

  it("never escalates twice, however many walls it hits", async () => {
    const sent = mockServer([turnBody({ type: "blocked", message: "stuck again" })]);
    const runner = new HilLoopRunner("http://x", "k", () => {});
    await runner.start("do the thing", "");

    expect(runner.events.filter((e) => e.kind === "handoff")).toHaveLength(1);
    // Astra hit the same wall, so the run ends rather than buying a third brain.
    expect(runner.events.some((e) => e.kind === "ending" && e.outcome === "blocked")).toBe(true);
    // Exactly two calls: his turn, then Astra's one attempt.
    expect(sent).toHaveLength(2);
  });

  it("does not offer a handoff when Astra is already driving", async () => {
    // The mode where Astra thinks on every turn. A run that gets stuck here has
    // nothing better to be handed to, and dressing that up as a rescue would be
    // a gold card promising a brain that is already on the job.
    const astraTurn = (decision: Decision) => {
      const b = turnBody(decision) as any;
      b.meta.brain = "astra";
      b.meta.model = "gpt-6-astra";
      return b;
    };
    mockServer([astraTurn({ type: "blocked", message: "no way in" })]);
    const runner = new HilLoopRunner("http://x", "k", () => {});
    await runner.start("do the thing", "");

    expect(runner.events.filter((e) => e.kind === "handoff")).toHaveLength(0);
    // It still reads as Astra, it just was not handed over.
    expect(runner.onAstra).toBe(true);
    expect(runner.handedOff).toBe(false);
    // And a wall still ends the run rather than looping for a rescue that cannot come.
    expect(runner.events.some((e) => e.kind === "ending" && e.outcome === "blocked")).toBe(true);
  });

  it("sends the flag on every turn of a rescue, not just the first", async () => {
    const sent = mockServer([
      turnBody({ type: "blocked", message: "no way in" }),
      turnBody({ type: "ask", question: "which one?" }),
    ]);
    const runner = new HilLoopRunner("http://x", "k", () => {});
    await runner.start("do the thing", "");
    await runner.answer("that one");

    const rescued = sent.filter((b) => b.rescue === true);
    // The turn that took over, and the turn after the user replied.
    expect(rescued.length).toBeGreaterThanOrEqual(2);
    expect(sent.slice(1).every((b) => b.rescue === true)).toBe(true);
  });
});
