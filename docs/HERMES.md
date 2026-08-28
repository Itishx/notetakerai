# Hermes, and what he is for

[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (MIT)
is a persistent agent daemon: its own memory across sessions, its own skills,
its own tools, and the patience to work a problem for minutes.

## Install it

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes model            # pick a provider and model
hermes -z "say hello"   # prove the one-shot works
```

Braino looks for the binary on every command and does nothing at all when it is
absent, so installing it mid-session is enough. `BRAINO_HERMES=0` turns the
whole path off. `BRAINO_HERMES_BIN=/path/to/hermes` points at a custom install.

## The split, and why it is not "easy here, hard there"

The obvious division is quick jobs for Braino and hard ones for Hermes. That
division is wrong, and shipping it would have made Braino worse.

**Braino has hands on this Mac.** He clicks, types, scrolls, opens apps, plays
music, reads files, and drives the browser you are already signed into.
**Hermes has none of that.** Sending "book the tickets on BookMyShow" to Hermes
hands it to an agent with no access to the session you are logged into, and it
fails in a way that reads as Braino refusing.

So the question is not how hard the job is. It is **whether the job needs your
screen**.

| | Braino | Hermes |
| --- | --- | --- |
| Anything on your screen or in an account you are signed into | yes | never |
| Clicking, typing, opening, playing, booking, messaging | yes | no |
| A quick answer | yes | no |
| Research across many sources, comparison, analysis | no | yes |
| Long reasoning, planning, substantial writing, code | no | yes |
| Something you will want remembered and built on later | no | yes |

When both apply, it is Braino: a job that needs the screen at any point cannot
be done by a worker without one. When the router is unsure, it is Braino.

## How a command reaches him

1. `runDelegate` handles its meta-commands, then the forced-brain handover.
2. **If, and only if, the binary exists**, HIL is asked who should do this job.
   No binary means no question, no network call, and no latency for anyone who
   has not opted in.
3. A `hermes` verdict must also carry a self-contained task, because Hermes
   cannot see the conversation. A handover with nothing to hand over falls back.
4. `hermes -z "<task>" --usage-file <tmp>` runs it. The CLI reference calls `-z`
   the purest one-shot: a prompt in, the final response text out, nothing else
   on stdout or stderr.
5. The answer is spoken and remembered in the chat history like any other.

**A job already escalated to the loop is never intercepted**, because that job
has hands in it by definition.

## When it fails

Every failure returns a value rather than throwing, and the caller carries on
down the cascade exactly as it would have. A delegated agent being down must
never be the reason a command disappears.

| Log line | Meaning |
| --- | --- |
| `hermes.route` | who was chosen, why, and how long deciding took |
| `hermes.start` | the self-contained task actually handed over |
| `hermes.done` | length, duration, model used, estimated cost |
| `hermes.failed` | `not_installed`, `timeout`, `bad_invocation`, `backend_failed`, `empty_answer` |

`bad_invocation` is exit code 2 and means **we** built the command line wrong,
not that Hermes is down. Worth telling apart when reading a log.

## What is not done

- **No `hermes serve`.** The daemon speaks JSON-RPC over WebSocket on
  `127.0.0.1:9119` and would let a job stream progress instead of arriving whole
  after a silence. The one-shot was the honest thing to build first.
- **Nothing has run against a real Hermes install**, because it is not installed
  on this machine yet. The bridge is covered by tests against the documented
  contract, which is not the same as having seen it work.
- **No shared memory.** Hermes remembers its own sessions; Braino remembers his.
  Neither can read the other's.
