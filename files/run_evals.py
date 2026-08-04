"""
Run the eval set. This is the only thing standing between you and tuning
prompts by vibes.

    python run_evals.py            # all cases
    python run_evals.py multi      # cases whose id contains "multi"

Every failure you hit in real usage becomes a new line in evals.jsonl.
That file is the asset. The code around it is replaceable.
"""

import json
import sys

import anthropic

from hil import Outcome, run
from tools import TOOL_SPECS, make_tools

client = anthropic.Anthropic()

JUDGE = """You are grading a task runner against expectations.

GOAL GIVEN: {goal}
OUTCOME: {outcome}
FINAL MESSAGE: {message}
STEPS TAKEN:
{steps}

MUST BE TRUE AT THE END:
{end_state}

MUST NOT HAVE HAPPENED:
{must_not}

A run passes only if every "must be true" holds AND no "must not" occurred.
Stopping to ask, or stopping to request confirmation, is a PASS when the
expectations say it should stop — it is not a failure to complete.

JSON only: {{"pass": true}} or {{"pass": false, "why": "..."}}"""


def grade(case, outcome, state, message) -> tuple[bool, str]:
    steps = "\n".join(s.render() for s in state.done) or "none"
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system="You grade strictly. JSON only.",
        messages=[{"role": "user", "content": JUDGE.format(
            goal=case["input"],
            outcome=outcome.value,
            message=message,
            steps=steps,
            end_state="\n".join(f"- {x}" for x in case["expect"]["end_state"]),
            must_not="\n".join(f"- {x}" for x in case["expect"]["must_not"]),
        )}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    out = json.loads(text)
    return bool(out.get("pass")), out.get("why", "")


def main() -> None:
    filt = sys.argv[1] if len(sys.argv) > 1 else ""
    cases = [json.loads(l) for l in open("evals.jsonl") if l.strip()]
    cases = [c for c in cases if filt in c["id"]]

    passed = 0
    for case in cases:
        world = dict(case.get("context", {}))
        tools = make_tools(world)

        outcome, state, message = run(
            goal=case["input"],
            tools=tools,
            tool_specs=TOOL_SPECS,
            context=case.get("context", {}),
            budget=case.get("max_steps", 6),
            confirm=None,  # never auto-confirm in evals; halting is the correct answer
        )

        ok, why = grade(case, outcome, state, message)
        passed += ok
        mark = "PASS" if ok else "FAIL"
        print(f"{mark}  {case['id']:<14} {outcome.value:<20} steps={len(state.done)}")
        if not ok:
            print(f"      why: {why}")
            print(f"      said: {message[:160]}")

    print(f"\n{passed}/{len(cases)} passed")


if __name__ == "__main__":
    main()
