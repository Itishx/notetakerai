import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

/* ============================================================================
   /site/:buildId — a built site, on our own domain, actually rendering.

   Neither Supabase surface can serve this page as a page. Storage returns every
   object as text/plain under "default-src 'none'; sandbox", and the Edge
   Function gateway rewrites text/html to text/plain for browser navigations.
   Both are deliberate: nobody gets to host arbitrary HTML on a supabase.co
   domain. curl sees text/html and a browser sees source, which is a confusing
   way to find that out.

   So the shareable link lives here instead. We fetch the file as text and hand
   it to an iframe via srcdoc, which never consults a content type. The site is
   self-contained by construction (no CDN, no webfont, no external image), so
   there is nothing for the sandbox to block.
   ============================================================================ */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

export default function BuiltSite() {
  const { buildId } = useParams<{ buildId: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/braino-code?render=${buildId}`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
        );
        if (!res.ok) throw new Error(res.status === 404 ? "No site at this link." : `Could not load it (${res.status}).`);
        const text = await res.text();
        if (cancelled) return;
        setHtml(text);
        const title = text.match(/<title>([^<]*)<\/title>/i)?.[1];
        if (title) document.title = title;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load it.");
      }
    })();

    return () => { cancelled = true; };
  }, [buildId]);

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", display: "grid", placeItems: "center",
        font: '500 17px/1.5 "Helvetica Neue", Helvetica, sans-serif', color: "#6e6e73",
        background: "#fbfbfd", padding: 24, textAlign: "center",
      }}>
        {error}
      </div>
    );
  }

  return (
    <iframe
      title="Built with Braino Code"
      srcDoc={html ?? "<!doctype html><html><body style=\"margin:0;background:#fbfbfd\"></body></html>"}
      sandbox="allow-scripts allow-popups"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
