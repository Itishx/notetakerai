"""
Braino HIL — the reliability loop.

One logical step at a time. Replan after every step. Never fail silently.

The whole thing is ~250 lines. That is deliberate. If this file grows past
400, something belongs in tools.py or a prompt file instead.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

import anthropic

client = anthropic.Anthropic()

FAST_MODEL = "claude-haiku-4-5-20251001"
SMART_MODEL = "claude-sonnet-4-6"


# ---------------------------------------------------------------------------
# 1. The step contract. Everything the loop does obeys this shape.
# ---------------------------------------------------------------------------

@dataclass
class Step:
    intent: str                     # why, in one plain sentence
    tool: str                       # which tool
    args: dict                      # tool arguments
    expects: str                    # postcondition in plain language
    assertion: str | None = None    # optional deterministic check, python expr over `result`
    reversible: bool = True         # False => must be confirmed before running

    result: Any = None
    ok: bool | None = None
    why_not: str | None = None

    def render(self) -> str:
        status = "ok" if self.ok else ("FAILED: " + (self.why_not or "")) if self.ok is False else "pending"
        return f"- {self.intent} [{self.tool}] -> {status}"


class Outcome(str, Enum):
    COMPLETE = "complete"
    NEEDS_INFO = "needs_info"                  # missing information, ask one question
    NEEDS_CONFIRMATION = "needs_confirmation"  # irreversible action waiting on user
    BLOCKED = "blocked"                        # something broke, we know what
    BUDGET = "budget_exhausted"


# ---------------------------------------------------------------------------
# 2. The state object. NOT a message array. This is the fix for losing the
#    thread on step five: every model call gets a fresh rendered snapshot,
#    never an ever-growing transcript.
# ---------------------------------------------------------------------------

@dataclass
class State:
    goal: str
    context: dict = field(default_factory=dict)
    facts: list[str] = field(default_factory=list)
    done: list[Step] = field(default_factory=list)
    open_question: str | None = None
    blocker: str | None = None
    pending: Step | None = None
    budget: int = 6

    def render(self) -> str:
        parts = [f"GOAL: {self.goal}"]
        if self.context:
            parts.append("CONTEXT:\n" + json.dumps(self.context, indent=2))
        if self.facts:
            parts.append("LEARNED SO FAR:\n" + "\n".join(f"- {f}" for f in self.facts))
        if self.done:
            parts.append("STEPS COMPLETED:\n" + "\n".join(s.render() for s in self.done))
        else:
            parts.append("STEPS COMPLETED: none yet")
        parts.append(f"STEPS REMAINING IN BUDGET: {self.budget - len(self.done)}")
        return "\n\n".join(parts)

    def failure_signature(self) -> list[str]:
        return [f"{s.tool}:{s.why_not}" for s in self.done if s.ok is False]


# ---------------------------------------------------------------------------
# 3. Prompts, kept small and separate so each can be tested on its own.
# ---------------------------------------------------------------------------

CHOOSE_STEP = """You are the planning core of a task runner.

You will be given the current state. Choose exactly ONE next step. Not a plan,
not a sequence — one step. You will be called again after it runs, with the
result included, and you can decide then.

Respond with a single JSON object, no prose, no code fences:

{"action": "step", "intent": "...", "tool": "...", "args": {...},
 "expects": "...", "assertion": null, "reversible": true}

or {"action": "done", "answer": "..."}
or {"action": "ask", "question": "..."}

Rules:
- "ask" only when a wrong guess would be expensive or irreversible, and only
  ever one question. If you can guess safely, guess and say so in intent.
- reversible=false for anything that sends, posts, deletes, buys, overwrites,
  or is otherwise visible outside this machine. When in doubt, false.
- "assertion" is an optional Python expression over the variable `result`
  that must evaluate True, e.g. "result['status'] == 200". Prefer one when
  a cheap deterministic check exists.
- If a precondition for the goal is absent, do not invent it. Use "ask", or
  "done" with an answer explaining what is missing.

TOOLS AVAILABLE:
{tools}
"""

VERIFY_STEP = """A step just ran. Decide whether its postcondition actually holds.

STEP INTENT: {intent}
EXPECTED: {expects}
RESULT: {result}

Answer with JSON only: {{"ok": true}} or {{"ok": false, "why": "..."}}
Be strict. An empty result, an error payload, or a plausible-looking but
unrelated result is not a pass."""


def _json_call(model: str, system: str, user: str) -> dict:
    resp = client.messages.create(
        model=model,
        max_tokens=1000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


# ---------------------------------------------------------------------------
# 4. Verification, three tiers, cheapest first.
# ---------------------------------------------------------------------------

def verify(step: Step) -> tuple[bool, str | None]:
    # Tier 0 — deterministic. Free. Always try this first.
    if step.assertion:
        try:
            if eval(step.assertion, {"__builtins__": {}}, {"result": step.result}):
                return True, None
            return False, f"assertion failed: {step.assertion}"
        except Exception as e:
            return False, f"assertion errored: {e}"

    # Tier 0.5 — obvious structural failures, still free.
    if step.result is None:
        return False, "tool returned nothing"
    if isinstance(step.result, dict) and step.result.get("error"):
        return False, str(step.result["error"])

    # Tier 1 — small model judges the postcondition.
    out = _json_call(
        FAST_MODEL,
        "You verify postconditions. JSON only.",
        VERIFY_STEP.format(intent=step.intent, expects=step.expects,
                           result=json.dumps(step.result, default=str)[:2000]),
    )
    return bool(out.get("ok")), out.get("why")

    # Tier 2 — ask the user — is the caller's job, triggered by BLOCKED.


# ---------------------------------------------------------------------------
# 5. The loop.
# ---------------------------------------------------------------------------

def run(
    goal: str,
    tools: dict[str, Callable[..., Any]],
    tool_specs: str,
    context: dict | None = None,
    budget: int = 6,
    confirm: Callable[[Step], bool] | None = None,
) -> tuple[Outcome, State, str]:
    state = State(goal=goal, context=context or {}, budget=budget)

    while True:
        if state.blocker:
            return Outcome.BLOCKED, state, state.blocker
        if len(state.done) >= state.budget:
            return Outcome.BUDGET, state, f"stopped after {state.budget} steps"

        decision = _json_call(
            SMART_MODEL,
            CHOOSE_STEP.format(tools=tool_specs),
            state.render(),
        )

        if decision["action"] == "done":
            return Outcome.COMPLETE, state, decision["answer"]

        if decision["action"] == "ask":
            state.open_question = decision["question"]
            return Outcome.NEEDS_INFO, state, decision["question"]

        step = Step(
            intent=decision["intent"],
            tool=decision["tool"],
            args=decision.get("args", {}),
            expects=decision["expects"],
            assertion=decision.get("assertion"),
            reversible=decision.get("reversible", False),
        )

        # The gate. Irreversible work never runs on the model's say-so alone.
        if not step.reversible:
            if confirm is None:
                state.pending = step
                return Outcome.NEEDS_CONFIRMATION, state, f"about to: {step.intent}"
            if not confirm(step):
                return Outcome.COMPLETE, state, "user declined the action"

        # Execute.
        try:
            step.result = tools[step.tool](**step.args)
        except KeyError:
            step.result = {"error": f"no such tool: {step.tool}"}
        except Exception as e:
            step.result = {"error": f"{type(e).__name__}: {e}"}

        step.ok, step.why_not = verify(step)
        state.done.append(step)

        if step.ok:
            state.facts.append(f"{step.intent} -> {json.dumps(step.result, default=str)[:400]}")
        else:
            # Same failure twice means we are not learning. Stop, legibly.
            sig = f"{step.tool}:{step.why_not}"
            if state.failure_signature().count(sig) >= 2:
                state.blocker = (
                    f"stopped at step {len(state.done)}: {step.intent} — {step.why_not}"
                )
