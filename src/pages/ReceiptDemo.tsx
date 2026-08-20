import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./receipt-demo.css";

/* ============================================================================
   ReceiptDemo — what paying for Braino looks like.

   The order card sits at the top, and when the payment lands a paper receipt
   feeds out of the slot underneath it like a thermal printer: top edge first,
   line by line, ending in a torn zigzag.

   Built to be filmed. Everything is oversized, centred and on a dark stage, so
   a screen recording of this crops straight to a reel without anything getting
   lost at the edges.
   ========================================================================== */

const PLANS = {
  pro: {
    key: "pro",
    name: "Braino Pro",
    cadence: "Annual subscription",
    lines: [{ label: "BRAINO PRO", sub: "Annual subscription", amount: 150 }],
    rate: 0.18,
  },
  distra: {
    key: "distra",
    name: "Braino Distra",
    cadence: "Annual subscription · founding",
    lines: [{ label: "BRAINO DISTRA", sub: "Annual, founding price", amount: 396 }],
    rate: 0.18,
  },
} as const;

type PlanKey = keyof typeof PLANS;
type Phase = "idle" | "paying" | "printing" | "done";

const money = (n: number) => `$${n.toFixed(2)}`;

/* Real barcodes have irregular bar widths; an even comb reads as a CSS pattern
   rather than a receipt. Seeded so it does not reshuffle on every render. */
function barcodeBars(seed: number, count: number) {
  let s = seed;
  const next = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  return Array.from({ length: count }, () => ({
    w: 1 + Math.floor(next() * 3),
    gap: 1 + Math.floor(next() * 2),
  }));
}

export default function ReceiptDemo() {
  const [plan, setPlan] = useState<PlanKey>("pro");
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  const p = PLANS[plan];
  const subtotal = p.lines.reduce((n, l) => n + l.amount, 0);
  const tax = Math.round(subtotal * p.rate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const bars = useMemo(() => barcodeBars(plan === "pro" ? 7 : 19, 44), [plan]);
  const order = plan === "pro" ? "ORD-2048" : "ORD-3311";

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);

  const run = useCallback(() => {
    clear();
    setPhase("paying");
    /* The pause before the paper moves is doing real work: a printer that
       responds instantly reads as a CSS transition, not a machine. */
    timers.current.push(window.setTimeout(() => setPhase("printing"), 900) as unknown as number);
    timers.current.push(window.setTimeout(() => setPhase("done"), 3600) as unknown as number);
  }, []);

  const reset = () => { clear(); setPhase("idle"); };
  const printing = phase === "printing" || phase === "done";

  return (
    <main className={`rc-stage is-${phase}`}>
      <header className="rc-top">
        <span className="rc-eyebrow">Checkout</span>
        <h1>Payment, but it prints.</h1>
      </header>

      <div className="rc-machine">
        {/* The order card. The receipt appears from its bottom lip. */}
        <section className="rc-card" aria-live="polite">
          <div className="rc-card-head">
            <span className="rc-mark" aria-hidden="true">
              <img src="/reactions/braino-happy.svg" alt="" />
            </span>
            <span className="rc-home">Home</span>
          </div>

          <div className="rc-card-body">
            <div>
              <b>{p.name}</b>
              <span>{p.cadence}</span>
            </div>
            <div className="rc-card-total">
              <span>Total</span>
              <b>{money(total)}</b>
            </div>
          </div>

          <div className="rc-status">
            <i className="rc-tick" aria-hidden="true" />
            <span>
              {phase === "idle" ? "Ready to pay"
                : phase === "paying" ? "Taking payment…"
                : phase === "printing" ? "Printing receipt…"
                : "Order complete"}
            </span>
          </div>

          <div className="rc-slot" aria-hidden="true" />
        </section>

        {/* The paper. Its wrapper's height is what animates, so the receipt is
            revealed from its top edge down — which is the direction a printer
            actually feeds. */}
        <div className={"rc-paper-wrap" + (printing ? " is-out" : "")}>
          <article className="rc-paper">
            <div className="rc-paper-mark" aria-hidden="true">
              <span><img src="/reactions/braino-happy.svg" alt="" /></span>
            </div>

            <div className="rc-rule" />

            {p.lines.map((l) => (
              <div className="rc-line" key={l.label}>
                <div>
                  <b>{l.label}</b>
                  <span>{l.sub}</span>
                </div>
                <em>{money(l.amount)}</em>
              </div>
            ))}

            <div className="rc-rule" />

            <div className="rc-row"><span>Subtotal</span><em>{money(subtotal)}</em></div>
            <div className="rc-row"><span>Tax</span><em>{money(tax)}</em></div>

            <div className="rc-rule" />

            <div className="rc-row is-total"><span>TOTAL PAID</span><em>{money(total)}</em></div>

            <div className="rc-rule" />

            <div className="rc-row is-meta"><span>Order</span><em>{order}</em></div>
            <div className="rc-row is-meta"><span>Paid with</span><em>Visa •••• 4242</em></div>
            <div className="rc-row is-meta"><span>Date</span><em>20 Aug 2026 · 14:32</em></div>

            <div className="rc-barcode" aria-hidden="true">
              {bars.map((b, i) => (
                <s key={i} style={{ width: b.w, marginRight: b.gap }} />
              ))}
            </div>
            <div className="rc-barcode-num" aria-hidden="true">{order.replace("-", " ")}</div>

            <p className="rc-thanks">Thank you. Braino is already awake.</p>

            <span className="rc-sheen" aria-hidden="true" />
          </article>
          <div className="rc-tear" aria-hidden="true" />
        </div>
      </div>

      <div className="rc-controls">
        <div className="rc-plans" role="group" aria-label="Plan">
          {(Object.keys(PLANS) as PlanKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className={k === plan ? "is-on" : undefined}
              onClick={() => { setPlan(k); reset(); }}
            >
              {PLANS[k].name}
            </button>
          ))}
        </div>

        {phase === "idle" || phase === "paying" ? (
          <button type="button" className="rc-pay" onClick={run} disabled={phase === "paying"}>
            {phase === "paying" ? "Processing…" : `Pay ${money(total)}`}
          </button>
        ) : (
          <button type="button" className="rc-pay is-ghost" onClick={reset}>Run it again</button>
        )}
      </div>
    </main>
  );
}
