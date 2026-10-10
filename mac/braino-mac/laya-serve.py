# Laya, kept warm: sorts one sentence into chat / one_tool / multi_step / ask /
# ignore in about 35ms, on this Mac, with no network.
#
# main.cjs starts this with ~/.braino-laya/bin/python and asks it over
# 127.0.0.1 before routing. The model is the one trained on Braino's own
# commands (~/.braino-laya/models/braino-kind). If this is not running, Braino
# routes exactly as he did before.
#
# usage: python laya-serve.py <model dir> <port>
import json, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading
import laya

model_dir, port = sys.argv[1], int(sys.argv[2])
meta = json.load(open(f"{model_dir}/braino_question.json"))
question = meta["question"]
Q = {"kind": {"type": "choice", "instructions": question["ins"], "criteria": question["crit"]}}
# v6 and later also name the job ("open", "media", "message"...): decider stage 2.
AQ = {"action": {"type": "choice", "instructions": meta["action_question"]["ins"], "criteria": meta["action_question"]["crit"]}} if "action_question" in meta else None
agent = laya.Agent(model_dir, device="mps")
agent.predict("warm up", Q)
lock = threading.Lock()  # one model, one sentence at a time


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
            text = str(body.get("text", "")).strip()[:900]  # v4 reads the context line too
            t = time.perf_counter()
            with lock:
                # only="action": just the job name, asked separately so the kind
                # (the decision Braino waits on) comes back in one pass.
                if body.get("only") == "action" and AQ:
                    b = agent.predict(text, AQ)["answers"]["action"]
                    a = None
                else:
                    a = agent.predict(text, Q)["answers"]["kind"]
                    b = agent.predict(text, AQ)["answers"]["action"] if AQ and body.get("action") else None
            out = {"ms": round((time.perf_counter() - t) * 1000)}
            if a: out.update(kind=a["choice"], confidence=round(float(a.get("confidence", 0)), 3))
            if b: out.update(action=b["choice"], actionConfidence=round(float(b.get("confidence", 0)), 3))
            data, code = json.dumps(out).encode(), 200
        except Exception as error:  # a bad request never takes the server down
            data, code = json.dumps({"error": str(error)[:200]}).encode(), 500
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        data = json.dumps({"ok": True, "actions": bool(AQ), "model": model_dir, "serve": 2}).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


# The GPU sleeps when nothing asks for a while, and the first sentence after
# that took 214 to 336ms instead of ~40. A tiny sort every 20 seconds keeps it
# awake; it is one short sentence, and it waits its turn behind real ones.
def keep_warm():
    while True:
        time.sleep(20)
        with lock:
            agent.predict("hi", Q)


threading.Thread(target=keep_warm, daemon=True).start()
print(f"laya ready on {port}", flush=True)
ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
