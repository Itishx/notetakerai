const BOOKMARKLET_SCRIPT_PATH = "/sidebrain-bookmarklet.js";

function getOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function buildBookmarkletHref(origin = getOrigin()) {
  const scriptUrl = `${origin}${BOOKMARKLET_SCRIPT_PATH}`;
  return `javascript:(()=>{const d=document;const w=window;const id='__sidebrain_bookmarklet_loader';if(w.SideBrainBookmarklet&&typeof w.SideBrainBookmarklet.toggle==='function'){w.SideBrainBookmarklet.toggle(true);return;}if(d.getElementById(id)){return;}const s=d.createElement('script');s.id=id;s.src='${scriptUrl}?v=1';s.async=true;(d.body||d.documentElement).appendChild(s);})();`;
}

export function getBookmarkletScriptUrl(origin = getOrigin()) {
  return `${origin}${BOOKMARKLET_SCRIPT_PATH}`;
}
