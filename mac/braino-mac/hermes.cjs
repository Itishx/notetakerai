/* The bridge to Hermes.
 *
 * Hermes (NousResearch/hermes-agent, MIT) is a persistent agent daemon with
 * its own memory, skills and tools. It is not a model and it is not a copy of
 * this loop: it keeps what it learns across sessions and will happily spend
 * minutes on one job.
 *
 * WHAT HE IS FOR, AFTER ONE CORRECTION.
 *
 * The first version of this file said Hermes had no hands and kept every job
 * that touched a browser here. That was wrong, and it was inferred rather than
 * checked: Hermes has twelve browser tools including vision, computer use that
 * clicks and types in the background without moving the cursor, and a real
 * profile mode that snapshots the user's own browser so it works signed in as
 * them. It can book the tickets, and without taking over the screen.
 *
 * So the division is what each is better at. Anything multi step in a browser
 * is his: booking, buying, forms, posting, research, long reasoning, code.
 * This machine stays with Braino: apps, playback, files, system settings,
 * dictation, meetings, quick answers, and the person themselves.
 *
 * The command surface is `hermes -z`, which the CLI reference calls the purest
 * one-shot: a prompt in, the final response text out, and nothing else on
 * stdout or stderr. Exit 0 is success, 1 is a backend failure, 2 is a usage
 * error, and those three want different handling. --usage-file gives us the
 * cost and the model actually used, which is the only way this stays honest
 * about what a delegated job spent.
 */

const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const HERMES_TIMEOUT_MS = 180000;
/* A refusal to answer is not an answer. If Hermes returns nothing usable we
   fall back rather than speak an empty sentence. */
const MIN_USEFUL_CHARS = 2;

function hermesEnabled(env) {
  const fromFile = env && typeof env === "object" ? env.BRAINO_HERMES : "";
  return String(fromFile || process.env.BRAINO_HERMES || "").trim() !== "0";
}

/* Is it actually installed? Asked once per call rather than cached, because the
   whole point is that the user can install it mid-session and have it work
   without restarting Braino. */
function hermesBinary() {
  const explicit = String(process.env.BRAINO_HERMES_BIN || "").trim();
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  const candidates = [
    path.join(os.homedir(), ".local", "bin", "hermes"),
    path.join(os.homedir(), ".hermes", "bin", "hermes"),
    "/opt/homebrew/bin/hermes",
    "/usr/local/bin/hermes",
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

/* Hand one job to Hermes and wait for the answer.
 *
 * Never throws. Every failure comes back as { ok: false, reason }, because the
 * caller's job on any failure is the same: quietly carry on with the cascade.
 * A delegated agent that is down must not be able to swallow a command. */
function runHermes(task, options = {}) {
  const prompt = String(task || "").trim();
  return new Promise((resolve) => {
    if (!prompt) return resolve({ ok: false, reason: "empty_task" });
    const bin = options.binary || hermesBinary();
    if (!bin) return resolve({ ok: false, reason: "not_installed" });

    /* Narration runs beside the job, from the agent log, starting at whatever
       the file already contained so an earlier run cannot bleed into this one. */
    const stopTail = typeof options.onProgress === "function"
      ? tailAgentLog(agentLogSize(), options.onProgress)
      : null;
    const done = (result) => { if (stopTail) stopTail(); resolve(result); };

    const usagePath = path.join(os.tmpdir(), `braino-hermes-${Date.now()}.json`);
    const args = ["-z", prompt, "--usage-file", usagePath];
    const startedAt = Date.now();

    execFile(bin, args, {
      timeout: Number(options.timeoutMs) || HERMES_TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
      killSignal: "SIGTERM",
    }, (error, stdout, stderr) => {
      const ms = Date.now() - startedAt;
      let usage = null;
      try {
        if (fs.existsSync(usagePath)) {
          usage = JSON.parse(fs.readFileSync(usagePath, "utf8"));
          fs.unlinkSync(usagePath);
        }
      } catch { /* the answer matters more than the receipt */ }

      const text = String(stdout || "").trim();
      if (error) {
        /* 2 is our bug, not theirs: we built the command line wrong. Worth
           telling apart from a backend that is simply down. */
        const code = typeof error.code === "number" ? error.code : null;
        const reason = error.killed ? "timeout" : code === 2 ? "bad_invocation" : "backend_failed";
        /* The usage file carries Hermes's own sentence about what went wrong,
           and it is far better than our guess: a first real run against the
           binary said "No inference provider configured. Run 'hermes model'..."
           while all we knew was exit code 1. Prefer his words to ours. */
        return done({
          ok: false, reason, code, ms, usage,
          detail: String(usage?.failure || stderr || error.message || "").slice(0, 400),
        });
      }
      if (text.length < MIN_USEFUL_CHARS) return done({ ok: false, reason: "empty_answer", ms, usage });
      return done({ ok: true, text, ms, usage });
    });
  });
}

/* Watching him work.
 *
 * `hermes -z` is silent until it is finished, by design: prompt in, final text
 * out, nothing else. That is exactly what we want for the answer and exactly
 * wrong for the notch, which would sit blank through a two minute job and make
 * Braino look asleep.
 *
 * `hermes chat` does print tool previews, but it prints them onto the same
 * stdout as the answer, with its own furniture mixed in ("Query:", "Goodbye"),
 * and it exits 0 even when the run failed. Parsing the answer back out of that
 * would be guesswork on top of a stream that lies about its exit code.
 *
 * So the answer comes from -z, and the narration comes from the agent log,
 * which is written as the run happens. We note where the file ends before
 * starting, and read only what is appended after that, so nothing from an
 * earlier run leaks into this one.
 *
 * The filter is deliberately loose. What a tool call looks like in this log
 * cannot be known until a real job has run, and a filter that is too strict
 * shows nothing at all, which is the failure we are trying to avoid. */
const NOISE = /plugin|registered|discovery|journal_mode|state\.db|deprecat|urllib3|httpx|asyncio/i;

function tailAgentLog(fromByte, onLine) {
  const file = path.join(os.homedir(), ".hermes", "logs", "agent.log");
  let at = fromByte;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    try {
      const size = fs.statSync(file).size;
      if (size > at) {
        const fd = fs.openSync(file, "r");
        const buf = Buffer.alloc(size - at);
        fs.readSync(fd, buf, 0, buf.length, at);
        fs.closeSync(fd);
        at = size;
        for (const raw of buf.toString("utf8").split("\n")) {
          const line = raw.trim();
          if (!line || NOISE.test(line)) continue;
          /* Drop the timestamp, level and logger name: "2026-08-28 23:28:08,238
             INFO hermes_cli.plugins: ..." is furniture, the sentence after the
             colon is the part a person would read. */
          const said = line.replace(/^\S+ \S+ [A-Z]+ [\w.]+: ?/, "").trim();
          if (said.length > 3) onLine(said.slice(0, 200));
        }
      }
    } catch { /* the log not existing is not a reason to fail a job */ }
    if (!stopped) timer = setTimeout(tick, 600);
  };
  let timer = setTimeout(tick, 600);
  return () => { stopped = true; clearTimeout(timer); };
}

function agentLogSize() {
  try { return fs.statSync(path.join(os.homedir(), ".hermes", "logs", "agent.log")).size; }
  catch { return 0; }
}

module.exports = { runHermes, hermesBinary, hermesEnabled, tailAgentLog, agentLogSize, HERMES_TIMEOUT_MS };
