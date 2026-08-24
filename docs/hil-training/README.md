# HIL training log

One file per round of tuning the Human Intelligence Layer, newest last.

A round is only worth writing down if it came from watching him work. Every
entry here starts from a real session log, not from an idea about how he ought
to behave. The commands people actually said, and what he actually did with
them, are the eval set.

- `HIL_LOOP_VERSION` lives in
  `supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts` and is the
  version of the *thinking*.
- The rounds here are the version of the *harness*: what he can see, what he can
  do with his hands, when he is allowed to stop.

Both matter. A perfect prompt inside a harness that lies to it produces exactly
what round one found: a brain that thinks correctly and looks stupid.

## Rounds

| Round | Date | Loop version | Came from |
| --- | --- | --- | --- |
| [001](./001-first-real-session.md) | 2026-08-25 | 2.5.0 | First live Mac session, ~20 minutes of real commands |

## How to run a round

1. Use him for real, out loud, for twenty minutes. Do not curate the commands.
2. Keep the log: `~/Library/Logs/Braino Mac/braino-mac.log`.
3. Write down what he did wrong **and what he did right**, from the log, quoting
   his own thinking lines.
4. Separate two piles: the thinking was wrong, or the harness lied to him. They
   have completely different fixes and confusing them wastes a round.
5. Fix, add the failing commands to that round's eval list, and note what is
   still open.
