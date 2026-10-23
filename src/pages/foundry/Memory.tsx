import React from "react";
import { fmtDay } from "./lib";
import { FounderIdentity } from "./components/founderPhoto";
import type { BuyerCard, FounderCard, ProductCard } from "./store";
import { whereOf } from "./store";
import type { PageProps } from "./types";
import { SOURCE_LABEL } from "./Content";
import { Empty, Field, ListField, Note, Section } from "./components/ui";

export default function Memory({ p, up }: PageProps) {
  const m = p.memory;
  const setProduct = (k: keyof ProductCard, v: string) => up((q) => ({ ...q, name: k === "name" ? v || q.name : q.name, memory: { ...q.memory, product: { ...q.memory.product, [k]: v } } }));
  const setFounder = (k: keyof FounderCard, v: string) => up((q) => ({ ...q, memory: { ...q.memory, founder: { ...q.memory.founder, [k]: v } } }));
  const setBuyer = (k: keyof BuyerCard, v: string | string[]) => up((q) => ({ ...q, memory: { ...q.memory, buyer: { ...q.memory.buyer, [k]: v } } }));

  return (
    <div className="fx-page">
      <header className="fx-head">
        <div className="fx-head-t">
          <span className="fx-eyebrow">Shared memory</span>
          <h1>Product and founder</h1>
          <p>What all three engines know. Change anything here and the next run uses it.</p>
        </div>
      </header>
      {(p.siteRead && !p.siteRead.ok) && <Note>{p.siteRead.note}</Note>}

      <div className="fx-grid2">
        <Section title="Product card" explain={m.product}>
          <div className="fx-form">
            <Field label="Name" value={m.product.name} onChange={(v) => setProduct("name", v)} />
            <Field label="In one line" multiline value={m.product.oneLiner} onChange={(v) => setProduct("oneLiner", v)} />
            <Field label="Who buys it" value={m.product.buyer} onChange={(v) => setProduct("buyer", v)} />
            <Field label="The problem" multiline value={m.product.problem} onChange={(v) => setProduct("problem", v)} />
            <Field label="Pricing" value={m.product.pricing} onChange={(v) => setProduct("pricing", v)} />
            <Field label="Proof" value={m.product.proof} onChange={(v) => setProduct("proof", v)} hint="Braino never invents users or testimonials. Only what you put here gets used." />
            <Field label="Tone" value={m.product.tone} onChange={(v) => setProduct("tone", v)} />
            <Field label="Website" value={m.product.site} onChange={(v) => setProduct("site", v)} />
          </div>
        </Section>
        <div className="fx-stack">
          <Section title="Founder card" explain={m.founder}>
            <div className="fx-form">
              <FounderIdentity f={m.founder} set={(k, v) => setFounder(k, v)} />
              <Field label="Who you are" value={m.founder.who} onChange={(v) => setFounder("who", v)} />
              <Field label="Why trust you" multiline value={m.founder.whyTrust} onChange={(v) => setFounder("whyTrust", v)} />
              <Field label="How you sound" value={m.founder.voice} onChange={(v) => setFounder("voice", v)} />
              <Field label="LinkedIn" value={m.founder.linkedin} onChange={(v) => setFounder("linkedin", v)} />
            </div>
          </Section>
          <Section title="Buyer" explain={m.buyer}>
            <div className="fx-form">
              <Field label="Who they are" value={m.buyer.buyer} onChange={(v) => setBuyer("buyer", v)} />
              <ListField label="Their questions" items={m.buyer.questions} onChange={(v) => setBuyer("questions", v.slice(0, 8))} placeholder="Add a question" hint="Optics checks up to 8." />
              <ListField label="Phrases buyers use online" items={m.buyer.redditPhrases} onChange={(v) => setBuyer("redditPhrases", v.slice(0, 3))} placeholder="Add a phrase" hint="Outreach searches up to 3." />
            </div>
          </Section>
        </div>
      </div>

      <div className="fx-grid2">
        <Section title="Buyer quotes" hint="Words real buyers used, saved by Outreach. Content turns them into topics, and Optics searches the newest one on Google." explain={m.quotes.slice(0, 8).map((q) => q.text)}>
          {m.quotes.length ? <ul className="fx-mem">{m.quotes.slice(0, 10).map((q) => <li key={q.id}>"{q.text}"<small><a href={q.url} target="_blank" rel="noopener noreferrer">{whereOf(q)}</a> · {fmtDay(q.at)}</small></li>)}</ul> : <Empty title="No quotes yet">Outreach saves them when it finds people.</Empty>}
        </Section>
        <Section title="Gaps" hint="Buyer questions where AI names someone else. Saved by Optics, written about by Content." explain={m.gaps.map((g) => g.question)}>
          {m.gaps.length ? <ul className="fx-mem">{m.gaps.map((g) => <li key={g.id}>{g.question}<small>Named instead: {g.rivals.join(", ") || "no one"}</small></li>)}</ul> : <Empty title="No gaps">Optics saves these after it checks.</Empty>}
        </Section>
        <Section title="Objections" hint="Doubts buyers raised in replies. Each one becomes an FAQ fix in Optics, a topic in Content, and something every new message answers up front." explain={m.objections.map((o) => o.text)}>
          {m.objections.length ? <ul className="fx-mem">{m.objections.map((o) => <li key={o.id}>"{o.text}"<small>{o.answer} · {o.person}</small></li>)}</ul> : <Empty title="No objections yet">Paste a reply on Reach people and any doubt in it lands here.</Empty>}
        </Section>
        <Section title="Topics" explain={m.topics.slice(0, 8).map((t) => t.title)}>
          {m.topics.length ? <ul className="fx-mem">{m.topics.slice(0, 10).map((t) => <li key={t.id}>{t.title}<small>{SOURCE_LABEL[t.source]}</small></li>)}</ul> : <Empty title="No topics yet">Content picks them from quotes, gaps and objections.</Empty>}
        </Section>
      </div>
    </div>
  );
}
