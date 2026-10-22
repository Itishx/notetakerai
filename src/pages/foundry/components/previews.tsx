import React, { useState } from "react";
import { enc } from "../lib";
import type { Platform, Post } from "../store";

/* Posts shown the way each platform shows them. */

export const PLATFORM_LABEL: Record<Platform, string> = { x: "X", linkedin: "LinkedIn", reddit: "Reddit", instagram: "Instagram", threads: "Threads" };

export function composeUrl(p: Post) {
  if (p.platform === "x") return `https://x.com/intent/tweet?text=${enc(p.text.split(/\n\s*\n/)[0].slice(0, 280))}`;
  if (p.platform === "linkedin") return `https://www.linkedin.com/feed/?shareActive=true&text=${enc(p.text)}`;
  if (p.platform === "reddit") return `https://www.reddit.com/submit?type=TEXT&title=${enc(p.title || "")}&text=${enc(p.text)}`;
  if (p.platform === "threads") return `https://www.threads.net/intent/post?text=${enc(p.text)}`;
  return "https://www.instagram.com/";
}
export const fullText = (p: Post) => (p.platform === "reddit" ? `${p.title}\n\n${p.text}` : p.platform === "instagram" && p.visual ? `${p.text}\n\n[Image: ${p.visual}]` : p.text);

const Ico = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" className="pv-ico" aria-hidden="true"><path d={d} /></svg>;
const I = {
  reply: "M4 5h16v11H9l-5 4z", repost: "M7 7h11l-3-3M17 17H6l3 3M18 7v5M6 17v-5", like: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z", share: "M12 15V4M8 8l4-4 4 4M5 13v6h14v-6",
};

export function PostPreview({ post, name }: { post: Post; name: string }) {
  const [more, setMore] = useState(false);
  const initials = ((name || "B").match(/[A-Z0-9]/g) || [name.charAt(0) || "B"]).slice(0, 2).join("").toUpperCase();
  const handle = (name || "you").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "you";
  const text = post.text;
  if (post.platform === "x") return (
    <div className="pv pv-x">
      <span className="pv-av">{initials}</span>
      <div className="pv-main">
        <div className="pv-who"><b>{name}</b><span>@{handle} · now</span></div>
        {text.split(/\n\s*\n/).map((t, i) => <p key={i} className={i ? "pv-thread" : ""}>{t}</p>)}
        <div className="pv-acts"><Ico d={I.reply} /><Ico d={I.repost} /><Ico d={I.like} /><Ico d={I.share} /></div>
      </div>
    </div>
  );
  if (post.platform === "linkedin") {
    const long = text.length > 260 && !more;
    return (
      <div className="pv pv-li">
        <div className="pv-head"><span className="pv-av">{initials}</span><div><b>{name}</b><span>Founder · now</span></div></div>
        <p>{long ? text.slice(0, 260).replace(/\s+\S*$/, "") : text}{long && <>... <button className="pv-more" onClick={() => setMore(true)}>see more</button></>}</p>
        <div className="pv-acts li"><span><Ico d={I.like} />Like</span><span><Ico d={I.reply} />Comment</span><span><Ico d={I.repost} />Repost</span></div>
      </div>
    );
  }
  if (post.platform === "reddit") return (
    <div className="pv pv-rd">
      <div className="pv-vote"><Ico d="M12 5l7 8h-4v6H9v-6H5z" /><b>1</b><Ico d="M12 19l7-8h-4V5H9v6H5z" /></div>
      <div className="pv-main"><small><b>r/your-community</b> · u/{handle}</small><h4>{post.title}</h4><p>{more || text.length < 360 ? text : <>{text.slice(0, 360).replace(/\s+\S*$/, "")}... <button className="pv-more" onClick={() => setMore(true)}>read more</button></>}</p></div>
    </div>
  );
  return (
    <div className={`pv pv-sq ${post.platform}`}>
      <div className="pv-head"><span className="pv-av sm">{initials}</span><b>{handle}</b></div>
      {post.platform === "instagram" && <div className="pv-tile"><span>{initials}</span><p>{post.visual || "Your image"}</p></div>}
      <p className="pv-cap">{text}</p>
      <div className="pv-acts"><Ico d={I.like} /><Ico d={I.reply} /><Ico d={I.repost} /><Ico d={I.share} /></div>
    </div>
  );
}
