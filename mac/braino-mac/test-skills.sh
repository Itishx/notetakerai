#!/bin/bash
# Braino Mac — skill test log reader.
# Run this alongside a live session. It tails the log and prints ONE clean
# line per command: what Braino heard, what he answered, whether it worked,
# how long it took, and the efficiency score — so every test is auditable
# without you narrating. Ctrl-C to stop.
#
#   ./mac/braino-mac/test-skills.sh          # live tail, formatted
#   ./mac/braino-mac/test-skills.sh replay   # replay today's commands
#   ./mac/braino-mac/test-skills.sh raw      # raw feature.executed lines

LOG="$HOME/Library/Logs/Braino Mac/braino-mac.log"
MODE="${1:-live}"

fmt() {
  python3 -c '
import sys, json, re
for line in sys.stdin:
    if "feature.executed" not in line and "_intent" not in line:
        continue
    m = re.search(r"\{.*\}", line)
    if not m:
        continue
    try:
        d = json.loads(m.group(0))
    except Exception:
        continue
    ev = d.get("event", "")
    ts = d.get("ts", "")[11:19]
    if ev == "feature.executed":
        ok = "OK " if d.get("ok") else "MISS"
        heard = (d.get("heard") or "")[:72]
        resp = (d.get("responded") or "")[:72]
        head = "\n[%s] %s  %s%%  %sms" % (ts, ok, d.get("efficiencyPct","?"), d.get("durationMs","?"))
        print(head)
        print("   heard : " + heard)
        print("   said  : " + resp)
    elif ev.endswith("_intent"):
        arg = {k: v for k, v in d.items() if k not in ("ts", "pid", "event")}
        print("   route : " + ev.replace("delegate.", "") + "  " + json.dumps(arg))
'
}

case "$MODE" in
  raw)
    grep "feature.executed" "$LOG" | tail -40 ;;
  replay)
    today=$(date -u +%Y-%m-%d)
    grep "$today" "$LOG" | fmt ;;
  *)
    echo "── Braino skill tester · live (Ctrl-C to stop) ──"
    echo "Speak commands one at a time; each shows heard → said → score below."
    tail -n 0 -f "$LOG" | fmt ;;
esac
