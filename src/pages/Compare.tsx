import { Link } from "react-router-dom";
import { Download, Zap, Camera, Clock, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const steps = {
  sidebrain: [
    { label: "Read DOM elements + page text", ms: "~20ms" },
    { label: "Action decision", ms: "~800ms" },
    { label: "Execute action (click / type / navigate)", ms: "~150ms" },
  ],
  claude: [
    { label: "Take full-page screenshot", ms: "~400ms" },
    { label: "Send screenshot to vision model", ms: "~2000ms" },
    { label: "Decide action from pixels", ms: "~600ms" },
    { label: "Execute action", ms: "~150ms" },
    { label: "Wait for render, repeat", ms: "~3000ms" },
  ],
};

const comparisons = [
  { label: "Step decision time", sb: "~1s", cl: "~6s", sbWins: true },
  { label: "Page understanding", sb: "DOM + text", cl: "Screenshot pixels", sbWins: true },
  { label: "Works on any site", sb: true, cl: true, sbWins: null },
  { label: "Available free", sb: true, cl: false, sbWins: true },
  { label: "Works from your phone", sb: true, cl: false, sbWins: true },
  { label: "Handles complex visual UIs", sb: false, cl: true, sbWins: null },
  { label: "Backed by Anthropic", sb: false, cl: true, sbWins: null },
  { label: "Built by a solo founder", sb: true, cl: false, sbWins: null },
];

export default function Compare() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="container mx-auto px-6 pt-40 pb-24 text-center max-w-3xl">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-6">
          SideBrain vs. Claude Computer Use
        </p>
        <h1 className="text-5xl md:text-6xl font-normal tracking-tight text-foreground leading-[1.15] mb-6">
          Same idea.<br />
          <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>Different speed.</em>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Claude Computer Use sees your browser like a camera — screenshot by screenshot.
          SideBrain reads it like a developer — DOM-first, no waiting for pixels to load.
          That difference compounds with every single step.
        </p>

      </section>

      {/* Speed comparison visual */}
      <section className="container mx-auto px-6 pb-24 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">

          {/* SideBrain */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-semibold text-foreground tracking-tight">SideBrain</span>
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">~1s / step</span>
            </div>
            <div className="flex flex-col gap-3">
              {steps.sidebrain.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-mono flex-shrink-0">{i + 1}</span>
                    <span className="text-sm text-foreground/80">{s.label}</span>
                  </div>
                  {s.ms && <span className="text-xs font-mono text-primary/60 flex-shrink-0">{s.ms}</span>}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-primary/10">
              <p className="text-xs text-muted-foreground/60">5-step task: <span className="text-foreground font-medium">~8–12 seconds</span></p>
            </div>
          </div>

          {/* Claude */}
          <div className="rounded-2xl border border-border/50 bg-card/40 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <span className="text-sm font-semibold text-foreground tracking-tight">Claude Computer Use</span>
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/50">~6s / step</span>
            </div>
            <div className="flex flex-col gap-3">
              {steps.claude.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] flex items-center justify-center font-mono flex-shrink-0">{i + 1}</span>
                    <span className="text-sm text-muted-foreground">{s.label}</span>
                  </div>
                  {s.ms && <span className="text-xs font-mono text-muted-foreground/40 flex-shrink-0">{s.ms}</span>}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-border/40">
              <p className="text-xs text-muted-foreground/60">5-step task: <span className="text-foreground font-medium">~30–40 seconds</span></p>
            </div>
          </div>
        </div>

        {/* Why */}
        <div className="mt-8 rounded-2xl border border-border/50 bg-card/30 p-8">
          <div className="flex items-start gap-4">
            <Camera className="w-5 h-5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Why screenshots are slow</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Claude Computer Use treats the browser like a human would — it can only see what's visible on screen. That's elegant, but it means every single step, even clicking a clearly-labelled button, costs a full screenshot round-trip to a vision model. 2–3 seconds. Every time. No exceptions.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 mt-6">
            <Zap className="w-5 h-5 text-primary/60 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Why reading the DOM is faster</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                SideBrain's content script reads the live DOM directly. Every button, input, and link comes back as structured text with selectors — not pixels. The model gets a clean element list and acts immediately. No screenshot. No vision model. No waiting for frames to render.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="container mx-auto px-6 pb-24 max-w-3xl">
        <h2 className="text-2xl font-normal text-foreground tracking-tight mb-8 text-center">How they compare</h2>
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-mono uppercase tracking-widest text-muted-foreground/40 px-6 py-3 border-b border-border/40 bg-muted/20">
            <span>Feature</span>
            <span className="text-center text-primary/60">SideBrain</span>
            <span className="text-center">Claude</span>
          </div>
          {comparisons.map((c, i) => (
            <div key={c.label} className={`grid grid-cols-3 items-center px-6 py-4 ${i < comparisons.length - 1 ? "border-b border-border/30" : ""}`}>
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className="flex justify-center">
                {typeof c.sb === "boolean"
                  ? c.sb ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/30" />
                  : <span className={`text-sm font-medium ${c.sbWins ? "text-primary" : "text-foreground"}`}>{c.sb}</span>
                }
              </span>
              <span className="flex justify-center">
                {typeof c.cl === "boolean"
                  ? c.cl ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground/30" />
                  : <span className="text-sm text-muted-foreground">{c.cl}</span>
                }
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/40 text-center mt-4">
          Claude Computer Use timings based on publicly documented behavior. SideBrain timings from internal testing.
        </p>

      </section>

      {/* Coincidence of ideas */}
      <section className="container mx-auto px-6 pb-24 max-w-3xl">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-16" />
        <h2 className="text-2xl font-normal text-foreground tracking-tight mb-6 text-center">A coincidence of ideas</h2>
        <div className="rounded-2xl border border-border/50 bg-card/30 p-8 md:p-10 space-y-5 text-sm text-muted-foreground leading-relaxed">
          <p>
            Yes — SideBrain and Claude Computer Use are solving the same problem. We know how that looks.
          </p>
          <p>
            SideBrain was built independently, from scratch, before Claude's browser agent was publicly known. Parallel discovery is as old as science itself. The telephone. Calculus. Natural selection.
          </p>
          <p>
            What matters now isn't who thought of it first. It's who executes best. And we think a smaller, faster, more accessible tool has a real place in the world alongside a well-funded research lab's flagship product.
          </p>
          <p className="text-foreground/80">
            We're not trying to beat Anthropic. We're trying to be useful to you, today, right now, in your browser.
          </p>
        </div>
      </section>

      {/* Founder quote */}
      <section className="container mx-auto px-6 pb-28 max-w-2xl text-center">
        <div className="rounded-2xl border border-border/50 bg-card/20 p-10 md:p-14">
          <p className="text-2xl md:text-3xl font-normal text-foreground leading-relaxed tracking-tight mb-6" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>
            "Who am I even up against? Anthropic. 😊"
          </p>
          <p className="text-sm text-muted-foreground">— Itish, Founder of SideBrain</p>
          <p className="text-xs text-muted-foreground/40 mt-2">Said while shipping at 2am. Meant it.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 pb-28 max-w-xl text-center">
        <p className="text-sm text-muted-foreground mb-6">
          Try it yourself. It's free, takes 60 seconds to install, and you'll feel the speed difference immediately.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90">
              <Download className="w-4 h-4 mr-2" />
              Get SideBrain free
            </Button>
          </Link>
          <Link to="/delegate">
            <Button variant="outline" className="rounded-full px-8">
              See Delegate <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
