import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter } from "@/components/affPage";
import { CHANGELOG, type ChangeEntry } from "@/lib/changelog-data";
import "./affective.css";
import "./affective-home.css";
import "./changelog.css";

/* ============================================================================
   /changelog: everything that changed, from SideBrain to today (2026-10-13).

   In the AffectiveOS look (paper, serif claims, hairlines). The entries live
   in src/lib/changelog-data.ts, written from the git history in plain words:
   what changed, for the person using it. Newest first, by month, with a
   filter by product and by kind, and a search.
   ============================================================================ */

const CHAPTERS = [
  { when: "31 March 2026", h: "The spark", p: "A blank page and one question: what if your computer could actually think with you?" },
  { when: "April", h: "LectureSnap, then SideBrain", p: "A Chrome side panel that summarised, answered and took notes. Useful, and completely soulless." },
  { when: "May", h: "Braino is born", p: "A face, a name and a feeling. Not software you open, someone who is there." },
  { when: "June and July", h: "He learns to do things", p: "A voice, a memory, a heart, and hands that work in your real browser." },
  { when: "August", h: "He moves to the Mac", p: "Braino leaves the browser behind and lives in your Mac's notch." },
  { when: "September and October", h: "Ready to meet you", p: "Smarter, faster, and honest about your data. The road to launch." },
];

const KINDS = ["New", "Improved", "Fixed"] as const;
const monthOf = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const dayOf = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function Changelog() {
  const { theme, toggle } = useAffTheme();
  const [product, setProduct] = useState("All");
  const [kind, setKind] = useState<string>("All");
  const [q, setQ] = useState("");
  useEffect(() => { document.title = "What's new · Braino"; }, []);

  // Braino Foundry is hidden across the site for now (2026-10-13), so its entries wait here too.
  const entries = useMemo(() => CHANGELOG.filter((e) => e.product !== "Braino Foundry").sort((a, b) => b.date.localeCompare(a.date)), []);
  const products = useMemo(() => ["All", ...Array.from(new Set(entries.map((e) => e.product)))], [entries]);
  const shown = entries.filter((e) =>
    (product === "All" || e.product === product) &&
    (kind === "All" || e.kind === kind) &&
    (!q || `${e.title} ${e.body} ${e.version}`.toLowerCase().includes(q.toLowerCase())));

  const months: [string, ChangeEntry[]][] = [];
  for (const e of shown) {
    const m = monthOf(e.date);
    const last = months[months.length - 1];
    if (last && last[0] === m) last[1].push(e); else months.push([m, [e]]);
  }
  const versions = new Set(entries.map((e) => e.version).filter(Boolean)).size;
  const first = entries[entries.length - 1]?.date;
  const days = first ? Math.round((Date.now() - new Date(first).getTime()) / 864e5) : 0;

  return (
    <div className="aff cl" data-theme={theme}>
      <AffNav theme={theme} onToggle={toggle} />

      <header className="cl-hero">
        <div className="aff-wrap">
          <p className="ah-kicker">Changelog</p>
          <h1 className="aff-h1">Everything new, <em>from day one.</em></h1>
          <p className="cl-lede">Every version and every feature, from the first side panel to the Braino in your notch. Written for people, not engineers.</p>
          <dl className="cl-stats">
            <div><dt>Releases</dt><dd>{entries.length}</dd></div>
            <div><dt>Versions</dt><dd>{versions}</dd></div>
            <div><dt>Days of building</dt><dd>{days}</dd></div>
          </dl>
        </div>
      </header>

      <section className="cl-story">
        <div className="aff-wrap">
          <p className="ah-kicker">The story so far</p>
          <ol className="cl-chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.h}><span>{String(i + 1).padStart(2, "0")} · {c.when}</span><h3>{c.h}</h3><p>{c.p}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cl-log">
        <div className="aff-wrap">
          <div className="cl-bar">
            <div className="cl-chips" role="group" aria-label="Product">
              {products.map((p) => <button key={p} type="button" className={p === product ? "on" : ""} onClick={() => setProduct(p)}>{p}</button>)}
            </div>
            <div className="cl-chips cl-kinds" role="group" aria-label="Kind">
              {["All", ...KINDS].map((k) => <button key={k} type="button" className={(k === kind ? "on " : "") + "k-" + k.toLowerCase()} onClick={() => setKind(k)}>{k}</button>)}
            </div>
            <input className="cl-search" type="search" placeholder="Search, e.g. WhatsApp or 9.2" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {months.length === 0 && <p className="cl-none">Nothing matches that. Try another word.</p>}
          {months.map(([m, list]) => (
            <div key={m} className="cl-month">
              <h2 className="cl-month-h">{m}<small>{list.length} {list.length === 1 ? "change" : "changes"}</small></h2>
              <ol className="cl-list">
                {list.map((e, i) => (
                  <li key={e.date + e.title + i} className="cl-item">
                    <div className="cl-when">
                      <time>{dayOf(e.date)}</time>
                      {e.version && <span className="cl-ver">v{e.version.replace(/^v/i, "")}</span>}
                    </div>
                    <div className="cl-what">
                      <div className="cl-tags"><span className={"cl-kind k-" + e.kind.toLowerCase()}>{e.kind}</span><span className="cl-prod">{e.product}</span></div>
                      <h3>{e.title}</h3>
                      <p>{e.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          <p className="cl-more">Want the deeper story behind a feature? It is in the <Link to="/knowledge">Knowledge Base</Link>.</p>
        </div>
      </section>
      <AffFooter />
    </div>
  );
}
