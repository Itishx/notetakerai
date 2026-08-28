/* The bridge to Hermes.
 *
 * Hermes (NousResearch/hermes-agent, MIT) is a persistent agent daemon with
 * its own memory, skills and tools. It is not a model and it is not a copy of
 * this loop: it keeps what it learns across sessions and will happily spend
 * minutes on one job.
 *
 * WHY IT IS NOT SIMPLY "the hard half".
 *
 * The obvious split is easy here, hard there. That split is wrong and it would
 * make Braino worse. This loop drives THIS Mac and THIS screen: the browser the
 * user is already signed into, their windows, their files. Hermes has none of
 * that. Sending "book the tickets on BookMyShow" to Hermes hands it to an agent
 * with no access to the session where the user is logged in, and it fails in a
 * way that looks like Braino refusing.
 *
 * So the split is by KIND:
 *
 *   Braino keeps  anything that touches this screen or this machine. Clicking,
 *                 typing, opening, playback, files, and quick answers.
 *   Hermes gets   work that needs no screen but needs depth or time. Research
 *                 across many sources, long reasoning, drafting, code, and
 *                 anything worth remembering between sessions.
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
        return resolve({
          ok: false, reason, code, ms, usage,
          detail: String(usage?.failure || stderr || error.message || "").slice(0, 400),
        });
      }
      if (text.length < MIN_USEFUL_CHARS) return resolve({ ok: false, reason: "empty_answer", ms, usage });
      return resolve({ ok: true, text, ms, usage });
    });
  });
}

module.exports = { runHermes, hermesBinary, hermesEnabled, HERMES_TIMEOUT_MS };
