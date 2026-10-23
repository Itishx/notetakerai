import React, { useEffect, useMemo, useState } from "react";
import { classifyLaunch, writeListing } from "../engines";
import { copy } from "../lib";
import { log, type Launch } from "../store";
import type { PageProps } from "../types";
import { faviconOf, guessTags, PLACES, rankPlaces, type Place, type Tag } from "../launchPlaces";
import { Busy, Empty, Note, Section, SideSheet } from "./ui";

const APPROVAL: Record<Place["approval"], string> = { instant: "Goes up now", days: "Takes days", weeks: "Takes weeks" };
const STATUS: Record<Launch["status"], string> = { todo: "To do", submitted: "Submitted", live: "Live" };

function Block({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="fx-sheet-s">
      <small>{label}<button className="fx-link" onClick={() => void copy(text)}>Copy</button></small>
      <pre className="fx-piece">{text}</pre>
    </div>
  );
}

/* Step 4 of Be seen: places to launch, ranked for this product. */
export function LaunchPlaces({ p, up }: Pick<PageProps, "p" | "up">) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<Place | null>(null);
  const [writing, setWriting] = useState("");
  const [err, setErr] = useState("");
  const [linkFor, setLinkFor] = useState("");
  const [link, setLink] = useState("");
  const launches = p.launches || {};

  // One cheap classification per project, kept on the project.
  useEffect(() => {
    if (p.launchTags || !p.memory.product.name) return;
    let dead = false;
    classifyLaunch(p).then((tags) => { if (!dead) up((x) => ({ ...x, launchTags: tags.length ? tags : guessTags(x) })); }).catch(() => undefined);
    return () => { dead = true; };
  }, [p.id, p.launchTags, p.memory.product.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const tags = useMemo(() => Array.from(new Set([...(p.launchTags as Tag[] | undefined || []), ...guessTags(p)])), [p.launchTags, p.memory.product]); // eslint-disable-line react-hooks/exhaustive-deps
  const ranked = useMemo(() => rankPlaces(tags), [tags]);
  const best = ranked.slice(0, 18);
  const rows = all ? ranked : best;
  const vals = Object.values(launches);
  const submitted = vals.filter((l) => l.status !== "todo").length;
  const live = vals.filter((l) => l.status === "live").length;

  const set = (id: string, patch: Partial<Launch>) => up((x) => ({ ...x, launches: { ...(x.launches || {}), [id]: { status: "todo", ...(x.launches?.[id] || {}), ...patch, at: Date.now() } } }));

  async function write(pl: Place) {
    setOpen(pl); setErr("");
    if (launches[pl.id]?.listing) return;
    setWriting(pl.id);
    try {
      const listing = await writeListing(p, pl);
      up((x) => log({ ...x, launches: { ...(x.launches || {}), [pl.id]: { status: "todo", ...(x.launches?.[pl.id] || {}), listing, at: Date.now() } } }, "content", `Wrote a listing for ${pl.name}`));
    } catch (_) { setErr("Could not write it right now. Try again in a moment."); }
    finally { setWriting(""); }
  }
  function markLive(pl: Place) {
    const l = link.trim();
    up((x) => log({ ...x, launches: { ...(x.launches || {}), [pl.id]: { ...(x.launches?.[pl.id] || {}), status: "live", link: l || undefined, at: Date.now() } } }, "content", `Live on ${pl.name}`));
    setLinkFor(""); setLink("");
  }
  const listing = open ? launches[open.id]?.listing : undefined;

  return (
    <Section title="Launch places" explain={{ fitFor: tags, top: best.slice(0, 8).map((x) => x.name), submitted, live }}>
      <div className="fx-lp-bar"><b>{submitted} of {ranked.length} submitted, {live} live</b><span>Picked for: {tags.join(", ")}</span></div>
      {rows.length ? (
        <ul className="fx-lp">
          {rows.map((pl) => {
            const st = launches[pl.id]?.status || "todo";
            return (
              <li key={pl.id} className={st}>
                <div className="fx-lp-n">
                  <img src={faviconOf(pl.url)} alt="" width={16} height={16} loading="lazy" />
                  <a href={pl.url} target="_blank" rel="noopener noreferrer"><b>{pl.name}</b></a>
                  <span className={`fx-lp-st ${st}`}>{STATUS[st]}</span>
                </div>
                <p>{pl.note}</p>
                <div className="fx-lp-c">
                  <span className="fx-chip">{pl.cost}</span>
                  <span className="fx-chip">{APPROVAL[pl.approval]}</span>
                  <span className="fx-chip fx-lp-dots" title={`Strength ${pl.strength} of 3`}>{[1, 2, 3].map((i) => <i key={i} className={i <= pl.strength ? "on" : ""} />)}</span>
                </div>
                <div className="fx-lp-a">
                  <button className="fx-btn sm" disabled={writing === pl.id} onClick={() => void write(pl)}>{writing === pl.id ? "Writing" : launches[pl.id]?.listing ? "Open my listing" : "Write my listing"}</button>
                  {st === "todo" && <button className="fx-link" onClick={() => set(pl.id, { status: "submitted" })}>Mark submitted</button>}
                  {st !== "live" && <button className="fx-link" onClick={() => { setLinkFor(pl.id); setLink(""); }}>Mark live</button>}
                  {st === "live" && launches[pl.id]?.link && <a className="fx-link" href={launches[pl.id]?.link} target="_blank" rel="noopener noreferrer">See it</a>}
                  {st !== "todo" && <button className="fx-link" onClick={() => set(pl.id, { status: "todo" })}>Undo</button>}
                </div>
                {linkFor === pl.id && (
                  <form className="fx-lp-link" onSubmit={(e) => { e.preventDefault(); markLive(pl); }}>
                    <input autoFocus value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the link to your live listing" />
                    <button className="fx-btn sm">Save</button>
                    <button type="button" className="fx-link" onClick={() => setLinkFor("")}>Cancel</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      ) : <Empty title="No places yet">Finish your product card first.</Empty>}
      {ranked.length > best.length && <button className="fx-link" onClick={() => setAll((a) => !a)}>{all ? "Show the best picks only" : `Show all ${ranked.length}`}</button>}
      <p className="fx-small">Braino writes each listing, but you submit it yourself: these sites need your login, and some ask for captchas or payment. The list is picked by hand, so a site may have changed. {PLACES.length} places in all.</p>

      <SideSheet open={!!open} onClose={() => setOpen(null)} title={open ? `Your listing for ${open.name}` : ""}>
        {err && <Note tone="warn">{err}</Note>}
        {!listing && !err && <div className="fx-sheet-wait"><Busy text="Writing your listing" /></div>}
        {open && listing && (
          <>
            <Block label="Title" text={listing.title} />
            <Block label="Tagline" text={listing.tagline} />
            <Block label="Short description" text={listing.short} />
            <Block label="Long description" text={listing.long} />
            <Block label="Category" text={listing.category} />
            <Block label={open.id === "showhn" ? "Your first comment" : "Maker's first comment"} text={listing.firstComment} />
            <div className="fx-sheet-s"><small>What it asks for</small><b>{open.needs}</b></div>
            <div className="fx-sheet-s"><small>How</small><ol className="fx-steps">
              <li>Get the things it asks for ready.</li>
              <li>Open {open.name} and sign in or make an account.</li>
              <li>Paste each piece above into its box.</li>
              <li>Submit, then tap Mark submitted here.</li>
              <li>When it is up, tap Mark live and paste the link.</li>
            </ol></div>
            <footer className="fx-sheet-f">
              <button className="fx-btn" onClick={() => { void copy(listing.title || listing.tagline); window.open(open.url, "_blank", "noopener"); }}>Copy and open</button>
              <button className="fx-ghost" onClick={() => { up((x) => ({ ...x, launches: { ...(x.launches || {}), [open.id]: { ...(x.launches?.[open.id] || { status: "todo" }), listing: undefined, at: Date.now() } } })); void write(open); }}>Write it again</button>
            </footer>
          </>
        )}
      </SideSheet>
    </Section>
  );
}
