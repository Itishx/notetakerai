# Braino HIL — starter

Four files. About 500 lines. This is the whole reliability layer.

```
evals.jsonl     12 test cases — the asset. Grow this to 50+.
hil.py          state object, step contract, loop, verification, stop conditions
tools.py        fake tool layer operating on a dict world, no side effects
run_evals.py    harness that scores runs so prompt changes are measurable
```

## Run it

```bash
pip install anthropic
export ANTHROPIC_API_KEY=...
cd hil && python run_evals.py
```

You will not get 12/12 on the first run. That is the point — the number is
the signal. Change a prompt, run again, see if the number moved.

## The four ideas in here

**One step at a time.** `run()` asks for exactly one next step, executes it,
verifies it, then asks again with the result folded into state. It never
plans a sequence upfront, because step 3 changes what step 4 should be.

**State, not transcript.** `State.render()` builds a fresh snapshot for every
model call — goal, facts learned, steps done, budget left. Agents lose the
thread around step five because they append to a growing message array and
the early context drowns. This does not.

**Verification is tiered.** Deterministic assertion first (free), structural
error check second (free), small model third, user last. Never spend a
frontier call on something an `if` can answer.

**Stops are legible.** Every exit is a named `Outcome` plus state you can
read: "did steps 1–4, blocked at 5 because X". No silent success, no vague
apology. This is the actual product claim — not that Braino is never wrong,
but that he is never *quietly* wrong.

## The gate

`reversible=False` means the step does not run without confirmation. Send,
post, delete, buy, overwrite. In `run_evals.py` the confirm callback is
`None` on purpose: in a test, halting before an irreversible action is the
correct answer, and several eval cases check exactly that.

This one flag is your verify-before-commit rule, in one place, applied
uniformly. Do not scatter it.

## Order of work

1. **Grow evals.jsonl to 50.** Today. Ugly cases are fine. Every real failure
   you hit later becomes a new line here.
2. Replace `tools.py` bodies with real implementations. Signatures stay.
3. Iterate `CHOOSE_STEP` in `hil.py` against the eval score. Only that.
4. Add the router in front (reflex / fast / full HIL) once this is reliable.
5. Model routing by cost, measured, last.

## Deliberately not here

No fine-tuning. No planner DSL. No multi-agent debate. No parallel steps.
No framework. All of it is procrastination that looks like engineering, and
none of it will move the eval score as much as bullet 1 will.
