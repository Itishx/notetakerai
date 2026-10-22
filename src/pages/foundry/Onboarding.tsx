import React, { useEffect, useRef, useState } from "react";
import { BrainoMascot } from "@/components/BrainoMascot";
import { buildProduct, readFounder, readSite } from "./engines";
import { hostOf } from "./lib";
import type { BuyerCard, FounderCard, ProductCard, Project } from "./store";
import { log } from "./store";
import { Field, ListField, Note } from "./components/ui";

/* Onboarding: three steps, full screen, one question at a time.
   1 your product, 2 you, 3 your buyer. Then Start Braino Foundry. */

type Step = "product" | "readingSite" | "productCard" | "founder" | "readingFounder" | "founderCard" | "buyer";
const ORDER: Step[] = ["product", "readingSite", "productCard", "founder", "readingFounder", "founderCard", "buyer"];
const PART: Record<Step, 0 | 1 | 2> = { product: 0, readingSite: 0, productCard: 0, founder: 1, readingFounder: 1, founderCard: 1, buyer: 2 };

function firstStep(p: Project): Step {
  if (!p.memory.product.name) return "product";
  if (!p.memory.founder.who && !p.memory.founder.why) return p.draft.linkedin || p.draft.why ? "founder" : "productCard";
  return "buyer";
}

function Reading({ stages, at, elapsed, pages }: { stages: string[]; at: number; elapsed: number; pages: string[] }) {
  return (
    <div className="fo-read">
      <div className="fo-orb" aria-hidden="true">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" className="t" />
          <circle cx="100" cy="100" r="80" className="v" style={{ strokeDasharray: `${((at + 0.5) / stages.length) * 502} 502` }} transform="rotate(-90 100 100)" />
        </svg>
        <BrainoMascot variant="foundry" size={64} talking />
      </div>
      <ol className="fo-stages">
        {stages.map((s, i) => (
          <li key={s} className={i < at ? "done" : i === at ? "live" : ""}>
            <i>{i < at ? <svg viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg> : null}</i>
            <span>{s}</span>
            {i === at && <small>{elapsed}s</small>}
          </li>
        ))}
      </ol>
      {pages.length > 0 && <div className="fo-pages">{pages.map((p, i) => <span key={i} style={{ animationDelay: `${i * 90}ms` }}>{p}</span>)}</div>}
      <p className="fo-quiet">Reading a website takes about a minute. You can leave this tab open and wait.</p>
    </div>
  );
}

export default function Onboarding({ project, update, onStart, theme }: { project: Project; update: (fn: (p: Project) => Project) => void; onStart: () => void; theme: string }) {
  const [step, setStep] = useState<Step>(() => firstStep(project));
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const tick = useRef<number>();
  const d = project.draft;
  const m = project.memory;
  const setDraft = (k: keyof Project["draft"], v: string) => update((p) => ({ ...p, draft: { ...p.draft, [k]: v } }));
  const setProduct = (k: keyof ProductCard, v: string | string[]) => update((p) => ({ ...p, memory: { ...p.memory, product: { ...p.memory.product, [k]: v } } }));
  const setFounder = (k: keyof FounderCard, v: string) => update((p) => ({ ...p, memory: { ...p.memory, founder: { ...p.memory.founder, [k]: v } } }));
  const setBuyer = (k: keyof BuyerCard, v: string | string[]) => update((p) => ({ ...p, memory: { ...p.memory, buyer: { ...p.memory.buyer, [k]: v } } }));

  const clock = (on: boolean) => {
    window.clearInterval(tick.current);
    setElapsed(0);
    if (on) { const s = Date.now(); tick.current = window.setInterval(() => setElapsed(Math.round((Date.now() - s) / 1000)), 1000); }
  };
  useEffect(() => () => window.clearInterval(tick.current), []);
  const at = (s: number) => { setStage(s); clock(true); };

  async function goSite() {
    if (!d.desc.trim()) return;
    setErr(""); setPages([]); setStep("readingSite"); at(0);
    const r = await readSite(d.url, (s, n) => { at(s); if (n) setPages(Array.from({ length: n }, (_, i) => `Page ${i + 1}`)); });
    setPages(r.pages.map((p) => p.title || hostOf(p.url) || "Page"));
    at(3);
    try {
      const { product, buyer } = await buildProduct(d.desc, d.url, r.pages);
      update((p) => log({ ...p, name: product.name || p.name, siteRead: r.note, memory: { ...p.memory, product, buyer: p.memory.buyer.questions.length ? p.memory.buyer : buyer } }, "memory", r.note.ok ? `Read ${r.note.pages} pages of your website and wrote your product card` : "Wrote your product card from your words"));
      setStep("productCard");
    } catch (e) { setErr(String((e as Error).message || e)); setStep("product"); }
    finally { clock(false); }
  }
  async function goFounder() {
    setErr(""); setStep("readingFounder"); at(0);
    try {
      const r = await readFounder(d.linkedin, d.why, m.product, (s) => at(s));
      update((p) => log({ ...p, linkedinRead: r.note, memory: { ...p.memory, founder: r.founder } }, "memory", r.note.ok ? "Read your LinkedIn and wrote your founder card" : "Wrote your founder card from your words"));
      setStep("founderCard");
    } catch (e) { setErr(String((e as Error).message || e)); setStep("founder"); }
    finally { clock(false); }
  }

  const part = PART[step];
  const back = () => setStep(ORDER[Math.max(0, ORDER.indexOf(step) - (step === "founder" || step === "buyer" ? 1 : 2))]);

  return (
    <div className="fo" data-theme={theme}>
      <header className="fo-top">
        <span className="fo-brand"><BrainoMascot variant="foundry" size={22} />Braino Foundry</span>
        <ol className="fo-steps" aria-label="Setup steps">
          {["Your product", "You", "Your buyer"].map((s, i) => <li key={s} className={i < part ? "done" : i === part ? "on" : ""}><i>{i + 1}</i>{s}</li>)}
        </ol>
      </header>

      <main className="fo-main">
        {step === "product" && (
          <section className="fo-card">
            <span className="fo-eyebrow">Step 1 of 3</span>
            <h1>What are you building?</h1>
            <p className="fo-sub">In your own words. Jargon is fine. Add your website and Braino reads it too.</p>
            <Field label="What it is" multiline value={d.desc} onChange={(v) => setDraft("desc", v)} placeholder="An app that reminds PG tenants to pay and collects rent on UPI" />
            <Field label="Website" value={d.url} onChange={(v) => setDraft("url", v)} placeholder="yourproduct.com (optional)" hint="Braino reads up to 5 pages of it to learn your pricing, proof and tone. Nothing is changed on your site." />
            {err && <Note tone="warn">{err}</Note>}
            <footer className="fo-acts"><span /><button className="fx-btn lg" disabled={!d.desc.trim()} onClick={goSite}>{d.url.trim() ? "Read my website" : "Continue"}</button></footer>
          </section>
        )}

        {step === "readingSite" && (
          <section className="fo-card center">
            <span className="fo-eyebrow">{d.url ? `Reading ${hostOf(d.url, d.url)}` : "Reading what you wrote"}</span>
            <h1>Getting to know your product</h1>
            <Reading stages={["Opening your website", "Reading up to 5 pages", "Understanding what you sell", "Writing your product card"]} at={stage} elapsed={elapsed} pages={pages} />
          </section>
        )}

        {step === "productCard" && (
          <section className="fo-card">
            <span className="fo-eyebrow">Step 1 of 3 · Your product card</span>
            <h1>Is this right?</h1>
            <p className="fo-sub">Braino uses this card for everything it writes. Fix anything that is off.</p>
            {project.siteRead && !project.siteRead.ok && <Note>{project.siteRead.note}</Note>}
            {project.siteRead?.ok && <Note>{project.siteRead.note}</Note>}
            <div className="fo-grid">
              <Field label="Name" value={m.product.name} onChange={(v) => { setProduct("name", v); update((p) => ({ ...p, name: v || p.name })); }} />
              <Field label="Pricing" value={m.product.pricing} onChange={(v) => setProduct("pricing", v)} />
            </div>
            <Field label="In one line" multiline value={m.product.oneLiner} onChange={(v) => setProduct("oneLiner", v)} />
            <div className="fo-grid">
              <Field label="Who buys it" value={m.product.buyer} onChange={(v) => setProduct("buyer", v)} />
              <Field label="Tone" value={m.product.tone} onChange={(v) => setProduct("tone", v)} />
            </div>
            <Field label="The problem, in their words" multiline value={m.product.problem} onChange={(v) => setProduct("problem", v)} />
            <Field label="Proof" value={m.product.proof} onChange={(v) => setProduct("proof", v)} hint="Users, logos or testimonials. Braino never invents these. If you have none yet, leave it." />
            {m.product.missing.length > 0 && (
              <div className="fo-missing"><span>What buyers look for and could not find</span><ul>{m.product.missing.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            )}
            <footer className="fo-acts"><button className="fx-ghost" onClick={() => setStep("product")}>Back</button><button className="fx-btn lg" onClick={() => setStep("founder")}>Looks right</button></footer>
          </section>
        )}

        {step === "founder" && (
          <section className="fo-card">
            <span className="fo-eyebrow">Step 2 of 3</span>
            <h1>Who is building it?</h1>
            <p className="fo-sub">People buy from people. This makes the posts and messages sound like you.</p>
            <Field label="Your LinkedIn" value={d.linkedin} onChange={(v) => setDraft("linkedin", v)} placeholder="linkedin.com/in/yourname (optional)" hint="Braino reads your public headline through Google. It never logs in to LinkedIn." />
            <Field label="Why are you the one building this?" multiline value={d.why} onChange={(v) => setDraft("why", v)} placeholder="I ran a PG for 3 years and chased rent every month" />
            {err && <Note tone="warn">{err}</Note>}
            <footer className="fo-acts"><button className="fx-ghost" onClick={back}>Back</button><button className="fx-btn lg" onClick={goFounder}>{d.linkedin.trim() ? "Read my LinkedIn" : "Continue"}</button></footer>
          </section>
        )}

        {step === "readingFounder" && (
          <section className="fo-card center">
            <span className="fo-eyebrow">Reading about you</span>
            <h1>Getting to know you</h1>
            <Reading stages={["Finding your LinkedIn on Google", "Reading your headline", "Writing your founder card"]} at={stage} elapsed={elapsed} pages={[]} />
          </section>
        )}

        {step === "founderCard" && (
          <section className="fo-card">
            <span className="fo-eyebrow">Step 2 of 3 · Your founder card</span>
            <h1>Is this you?</h1>
            {project.linkedinRead && <Note>{project.linkedinRead.note}</Note>}
            <Field label="Who you are" value={m.founder.who} onChange={(v) => setFounder("who", v)} />
            <Field label="Why a buyer should trust you" multiline value={m.founder.whyTrust} onChange={(v) => setFounder("whyTrust", v)} />
            <Field label="How you sound" value={m.founder.voice} onChange={(v) => setFounder("voice", v)} hint="Every post and message is written in this voice." />
            <footer className="fo-acts"><button className="fx-ghost" onClick={() => setStep("founder")}>Back</button><button className="fx-btn lg" onClick={() => setStep("buyer")}>That is me</button></footer>
          </section>
        )}

        {step === "buyer" && (
          <section className="fo-card">
            <span className="fo-eyebrow">Step 3 of 3</span>
            <h1>Your buyer</h1>
            <p className="fo-sub">Optics checks these questions on Google and AI. Outreach looks for these phrases on Reddit.</p>
            <Field label="Who they are" value={m.buyer.buyer} onChange={(v) => setBuyer("buyer", v)} />
            <ListField label="8 questions they ask" items={m.buyer.questions} onChange={(v) => setBuyer("questions", v.slice(0, 8))} placeholder="Add a question" hint="Written the way a buyer types into ChatGPT or Google, without your name in it." />
            <ListField label="What they say on Reddit" items={m.buyer.redditPhrases} onChange={(v) => setBuyer("redditPhrases", v.slice(0, 3))} placeholder="Add a phrase" hint="2 to 4 words people use when they complain about this problem. Up to 3." />
            <footer className="fo-acts">
              <button className="fx-ghost" onClick={() => setStep("founderCard")}>Back</button>
              <button className="fx-btn lg" disabled={!m.buyer.questions.filter(Boolean).length} onClick={() => {
                update((p) => ({ ...p, onboarded: true, memory: { ...p.memory, buyer: { ...p.memory.buyer, questions: p.memory.buyer.questions.filter(Boolean), redditPhrases: p.memory.buyer.redditPhrases.filter(Boolean) } } }));
                onStart();
              }}>Start Braino Foundry</button>
            </footer>
            <p className="fo-quiet">The first run takes about two minutes. Nothing goes out without your yes.</p>
          </section>
        )}
      </main>
    </div>
  );
}
