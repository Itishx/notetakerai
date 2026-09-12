/* One Instagram post: "Braino tumhara bhai hai".
 *
 * The whole graphic is a horizon. He rises into frame from the bottom edge the
 * way a sun sits on the sea — full width, cropped through, only the dome and
 * the eyes above the line. Nothing else is on the page, because a rising sun
 * with a caption over it does not need a logo, a footer or a gradient.
 *
 * Scale is doing the work. At this size the brain stops reading as a mascot and
 * starts reading as a landscape, which is the only reason the joke lands warm
 * rather than cute: you meet him at the size of a horizon, and then he is
 * called your brother.
 *
 * 1080 x 1350, exported at 4320 x 5400 like every other post here.
 */

import { useRef, useState } from "react";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import "./bhai-post.css";

const LINES = ["Kaam hamara AI hai", "Braino tumhara bhai hai"];
const ASIDE = "(aur Itish tumhara president)";

export default function BhaiPost() {
  const frame = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    const node = frame.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const { toBlob } = await import("html-to-image");
      // Same 4K ratio the rest of the posts export at.
      const pixelRatio = 4320 / node.getBoundingClientRect().width;
      const png = await toBlob(node, { pixelRatio, cacheBust: true, style: { transform: "none" } });
      if (!png) throw new Error("PNG render failed");
      const url = URL.createObjectURL(png);
      const a = document.createElement("a");
      a.href = url;
      a.download = "braino-bhai-hai-4k.png";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bp-page">
      <div className="bp-frame" ref={frame}>
        <div className="bp-words">
          {LINES.map((l) => <p className="bp-line" key={l}>{l}</p>)}
          {/* Smaller, italic, and a step lighter. It is an aside, and an aside
              set at the same weight as the line above it is just a third line. */}
          <p className="bp-aside">{ASIDE}</p>
        </div>

        {/* The horizon. He is scaled far past the frame and pushed down, so the
            bottom edge crops him below the eyes — the art is never cut by hand,
            the frame does it, which keeps the proportions honest at any size. */}
        <div className="bp-horizon" aria-hidden="true">
          <div
            className="bp-braino"
            dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }}
          />
        </div>
      </div>

      <div className="bp-tools">
        <button className="bp-btn" onClick={download} disabled={busy}>
          {busy ? "Rendering…" : "Download 4K PNG"}
        </button>
        <p className="bp-note">1080 × 1350, exported at 4320 × 5400.</p>
      </div>
    </div>
  );
}
