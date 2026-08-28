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

## The split, and the correction that produced it

The first version of this integration was built on "Hermes has no hands", and
that was **wrong**. It was inferred from a README that did not mention them
rather than checked. Hermes has:

- **twelve browser tools**, including `browser_vision` (screenshot plus AI)
- **computer use** via `cua-driver`, clicking and typing in the background
  without moving your cursor or switching Spaces
- **`browser.use_real_profile`**, which snapshots your actual browser profile,
  cookies and logins included, and drives the snapshot while your live profile
  stays untouched

So he can book the tickets, signed in as you, without taking over your screen.
The division is therefore what each is genuinely better at, not who has hands.

| | Braino | Hermes |
| --- | --- | --- |
| Booking, buying, ordering, checking out | no | **yes** |
| Forms, signing up, applying, submitting | no | **yes** |
| Posting or sending through a website | no | **yes** |
| Research, comparison, long reasoning, code | no | **yes** |
| Apps, windows, playback, files, screenshots | **yes** | no |
| System settings, calls, texts, dictation, meetings | **yes** | no |
| Quick answers, and anything about Braino himself | **yes** | no |
| The approval gate | **yes** | never |

When the router is unsure, it is Braino. Cost is never a routing reason: you
approve before anything is paid for, so the router decides on what the job *is*.

## Watching him work

Two things, because a job that takes two minutes must not look like Braino
having gone quiet.

**A visible browser.** `browser.headed: true` in `~/.hermes/config.yaml` gives a
real Chromium window you can watch, and it stays open between turns so you can
step in for a sign-in challenge or a CAPTCHA and keep the login warm.

**The notch narrates.** `hermes -z` is silent until it finishes, and `hermes
chat` prints previews onto the same stdout as the answer with its own furniture
mixed in, then exits 0 even when the run failed. So the answer comes from `-z`
and the narration is tailed from `~/.hermes/logs/agent.log`, reading only what
is appended after the run starts. Each line goes into the same thinking panel
Braino uses for his own steps.

The log filter is deliberately loose, because what a tool call looks like in
that file cannot be known until a real job has run, and a filter that is too
strict shows nothing at all.

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
- **No job has completed yet.** Hermes v0.20.6 is installed and the failure path
  is verified against the real binary, but nothing has run end to end because no
  inference provider is configured. The narration filter in particular is
  guesswork until a real job writes real lines.
- **No shared memory.** Hermes remembers its own sessions; Braino remembers his.
  Neither can read the other's.
