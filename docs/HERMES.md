# Hermes, and what he is for

[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (MIT)
is a persistent agent daemon: its own memory across sessions, its own skills,
its own tools, and the patience to work a problem for minutes.

## Install it

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

Then point it at a provider. **The provider name is not what you would guess**:
the registry calls OpenAI `openai-api`, and `openai` is rejected outright with
"Unknown provider". A vendor-prefixed model slug like `openai/gpt-5` is also
refused unless the provider is an aggregator such as OpenRouter, so the slug
must be bare. `hermes doctor` diagnoses both, and is worth running first.

```bash
hermes config set model.provider openai-api
hermes config set model.default  gpt-5
hermes config set model.base_url https://api.openai.com/v1
echo 'OPENAI_API_KEY=sk-...' >> ~/.hermes/.env   # chmod 600
hermes -z "say hello"                            # prove the one-shot works
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

**A visible browser, driving a copy of your profile.** Two settings, and the
second one is not optional:

```yaml
browser:
  headed: true             # a real Chromium window you can watch
  use_real_profile: true   # signed in as you
```

Without `use_real_profile`, the agent browses in a clean throwaway profile that
is logged into nothing, and to reach your accounts it tries to attach to your
live Chrome instead. **Chrome 136+ blocks remote-debugging the default profile
directory**, so that ends with Hermes opening `chrome://inspect` and asking you
to enable a system permission it cannot click. A real booking run died exactly
there after 99 seconds.

With it on, Hermes copies your active profile (cookies, logins, preferences)
into a snapshot under `~/.hermes/browser-profile/` and drives that with its own
Chromium. Your live profile is never opened, so there is no lock fight and no
`chrome://inspect`. Auth is re-synced from your real profile on each fresh
session, so a login you do yourself shows up in the agent's next run. Turning
the toggle off deletes the snapshot.

The headed window also stays open between turns, so you can step in for a
sign-in challenge or a CAPTCHA and keep the login warm.

**The notch narrates, from two sources, because neither is enough alone.**

`hermes -z` is silent until it finishes, and `hermes chat` prints previews onto
the same stdout as the answer with its own furniture mixed in, then exits 0 even
when the run failed. So the answer comes from `-z`.

For narration, the agent log is tailed from wherever it already ended, so an
earlier run cannot bleed in. **But a quiet job writes nothing to it.** Measured
against the real binary: a nine second run grew `agent.log` by exactly **0
bytes** and left `~/.hermes/sessions` empty. The burst that made this look
workable came from `hermes chat`, which is a different code path.

So a heartbeat carries the floor: what he is working on, and how long he has
been at it, every five seconds. The notch is never blank and never claims a step
that did not happen. When a job does use tools the tailed lines appear as well.

For browser jobs the visible Chromium window is the real narration anyway.

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
- **Tool-level narration is unproven.** The heartbeat works. Whether a browser
  job writes usable lines to `agent.log` has not been seen, because the only
  jobs run so far were quiet ones that wrote nothing at all.
- **`hermes serve` is still the proper answer.** The daemon speaks JSON-RPC over
  WebSocket on `127.0.0.1:9119` and would give real structured progress instead
  of a heartbeat. Worth doing if the heartbeat proves too thin.
- **No shared memory.** Hermes remembers its own sessions; Braino remembers his.
  Neither can read the other's.
