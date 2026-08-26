import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "@/pages/social-artboard.css";

/* The shell every Instagram post in the studio is built on.
   Two rules the artboard obeys that the website does not:
   1. Every value inside a slide is a real pixel at 1080 x 1350, because the export
      renders the same node with the preview scale removed and a viewport unit would
      resize between what was approved and what lands in the ZIP.
   2. Nothing animates, so the PNG in the ZIP is the post rather than a frozen frame. */
export const SLIDE_W = 1080;
export const SLIDE_H = 1350;
const EXPORT_RATIO = 4; // 4320 x 5400

export const ACCENTS = { blue: "#2f6fed", coral: "#d9645b", violet: "#6b52c4", green: "#3a8f5f" } as const;
export const PANELS = { blue: "#e9f0fd", coral: "#fbeae8", violet: "#efeafa", green: "#e8f3ec" } as const;

export type SocialSlide = {
  key: string;
  /** Layout modifier(s) on the artboard, e.g. "is-pillar" or "is-close". */
  className?: string;
  accent?: string;
  /** Slide background. Left out, the artboard stays on Apple's off-white. */
  panel?: string;
  body: ReactNode;
};

type Props = {
  /** Filename stem for the exported PNGs and the ZIP. */
  file: string;
  /** The line in the artboard footer, left of trybraino.com. */
  label: string;
  slides: readonly SocialSlide[];
};

export default function SocialCarousel({ file, label, slides }: Props) {
  const [active, setActive] = useState(0);
  const [scale, setScale] = useState(0.4);
  const [state, setState] = useState<"idle" | "rendering" | "zipping" | "done" | "error">("idle");
  const holder = useRef<HTMLDivElement | null>(null);
  const nodes = useRef<Array<HTMLElement | null>>([]);

  const fit = useCallback(() => {
    const width = holder.current?.clientWidth ?? SLIDE_W;
    setScale(Math.min(1, width / SLIDE_W));
  }, []);

  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  const move = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);

  const downloadAll = async () => {
    if (state === "rendering" || state === "zipping") return;
    try {
      setState("rendering");
      const [{ toBlob }, { default: JSZip }] = await Promise.all([import("html-to-image"), import("jszip")]);
      const zip = new JSZip();
      for (let index = 0; index < slides.length; index += 1) {
        const node = nodes.current[index];
        if (!node) throw new Error(`Slide ${index + 1} is not ready`);
        const png = await toBlob(node, {
          width: SLIDE_W,
          height: SLIDE_H,
          pixelRatio: EXPORT_RATIO,
          cacheBust: true,
          backgroundColor: window.getComputedStyle(node).backgroundColor,
          style: { transform: "none", margin: "0" },
        });
        if (!png) throw new Error(`Could not render slide ${index + 1}`);
        zip.file(`${file}-${String(index + 1).padStart(2, "0")}-4k.png`, png);
      }
      setState("zipping");
      const archive = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${file}-4k.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState("done");
      window.setTimeout(() => setState("idle"), 2400);
    } catch (error) {
      console.error("Carousel export failed", error);
      setState("error");
    }
  };

  const button = state === "rendering" ? "Rendering 4K PNGs…" : state === "zipping" ? "Making ZIP…" : state === "done" ? "Downloaded" : state === "error" ? "Try download again" : "Download all · 4K PNG ZIP";
  const total = String(slides.length).padStart(2, "0");

  return (
    <div className="os-shell">
      <div className="os-holder" ref={holder}>
        <div className="os-viewport" style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}>
          <div className="os-stagescale" style={{ transform: `scale(${scale})` }}>
            <div className="os-track" style={{ transform: `translateX(${-active * SLIDE_W}px)` }}>
              {slides.map((slide, index) => (
                <article
                  key={slide.key}
                  ref={(node) => { nodes.current[index] = node; }}
                  className={`os-slide ${slide.className ?? ""}`}
                  style={{ "--acc": slide.accent, background: slide.panel } as CSSProperties}
                  aria-hidden={index !== active}
                >
                  <header><span className="os-brand"><i /> braino</span><span>{String(index + 1).padStart(2, "0")} / {total}</span></header>
                  {slide.body}
                  <footer><span>{label}</span><span>trybraino.com</span></footer>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="os-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous slide">←</button>
        <div>{slides.map((slide, index) => <button type="button" key={slide.key} className={index === active ? "is-active" : ""} onClick={() => setActive(index)} aria-label={`Open slide ${index + 1}`} />)}</div>
        <button type="button" onClick={() => move(1)} aria-label="Next slide">→</button>
      </div>

      <button className="os-download" type="button" onClick={downloadAll} disabled={state === "rendering" || state === "zipping"}>
        {button}<small>{slides.length} files · 4320 × 5400 each</small>
      </button>
    </div>
  );
}
