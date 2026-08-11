import { useEffect, useRef, useState } from "react";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { Braino, BrainoDefs, useTime } from "@/components/BrainoChar";
import { ChromeSystemPrototype } from "./InstaGraphics";
import "./insta-posts.css";

type Slide = {
  kicker: string; headline: string; body: string; accent: string;
  visual: "braino" | "screen" | "words" | "eyes" | "orbit" | "capabilities" | "forms" | "hero" | "face" | "chrome-loop" | "capability-table" | "research" | "lecture" | "browser-actions" | "email" | "maps-calendar" | "voice-close";
  background?: string; textColor?: string; align?: "left" | "center";
  image?: string; imageX?: number; imageY?: number; imageScale?: number;
  chapter?: string; layout?: "default" | "copy-top"; footer?: string;
};
type Post = { id: string; title: string; note: string; slides: Slide[] };

// This key is intentionally permanent. Visual and layout releases must migrate
// around the user's draft instead of changing the key and replacing their copy.
const INSTAPOSTS_DRAFT_KEY = "braino-instaposts-draft";
const LEGACY_DRAFT_KEYS = ["braino-instaposts-v11", "braino-instaposts-v10"];
const POST_TWO_REDESIGN_KEY = "braino-instaposts-post-two-redesign-v1";

const STARTER_POSTS: Post[] = [
  {
    id: "meet-braino-browser", title: "Meet Braino for the browser", note: "Who he is, what he does, and why he feels nothing like another chatbot.",
    slides: [
      { kicker: "Yes, the one from Iron Man.", headline: "We made Jarvis\nfrom Iron Man\ncome to life.", body: "He’s an AI, designed to feel like your best friend—a presence that understands the page, speaks in his own voice, and helps without taking over.", accent: "#df685f", visual: "hero", chapter: "Meet Braino" },
      { kicker: "So, who is Braino?", headline: "He’s an AI.\nBut he feels like a friend.", body: "Awake to what you’re doing. Full of personality. Quietly brilliant when you need him.", accent: "#df685f", visual: "forms", chapter: "The character" },
      { kicker: "What can he do?", headline: "Tell him what you need.\nHe gets to work.", body: "Understand the page. Find the answer. Record the lecture. Do the clicking. Finish the job.", accent: "#3974e8", visual: "capabilities", chapter: "The work" },
      { kicker: "No awkward recap", headline: "He sees what you see.\nSo you can just ask.", body: "No screenshots. No copying and pasting. No explaining which page you mean. Braino starts with what is already on your screen and gets straight to the useful part.", accent: "#df685f", visual: "chrome-loop", chapter: "The context" },
      { kicker: "Braino for the browser", headline: "Speak.\nWatch it happen.", body: "On any page. In any tab. On every platform.", accent: "#df685f", visual: "orbit", chapter: "Try Braino", footer: "trybraino.com" },
    ],
  },
  {
    id: "braino-does-the-work", title: "What Braino can actually do", note: "Seven honest pages about the work Braino can do today.",
    slides: [
      { kicker: "A lot, actually", headline: "What can\nBraino do?", body: "Not someday. These are the things Braino can help you do right now.", accent: "#df685f", visual: "capability-table", chapter: "The overview" },
      { kicker: "Start with the screen", headline: "He understands\nwhat you’re looking at.", body: "Ask about the page, search the web, check fresh sources, or turn something long into the useful part.", accent: "#3974e8", visual: "research", chapter: "Read + research" },
      { kicker: "Stay in the moment", headline: "You listen.\nHe takes the notes.", body: "Braino records lectures and meetings, keeps the useful parts, and turns them into notes you can return to.", accent: "#765ac7", visual: "lecture", chapter: "Lectures + meetings" },
      { kicker: "More than an answer", headline: "He does\nthe clicking too.", body: "Braino can navigate, scroll, click, type, and work through supported browser steps while you stay in control.", accent: "#3f9565", visual: "browser-actions", chapter: "Browser actions" },
      { kicker: "Inbox, handled", headline: "A thoughtful reply.\nUnder five seconds.", body: "Braino reads the email, drafts the response, and sends it when you approve.", accent: "#df685f", visual: "email", chapter: "Email" },
      { kicker: "Plans that leave the tab", headline: "Calendar sorted.\nDirections on your phone.", body: "Create or move an event, add the Meet link and reminder, then send the best Maps result straight to your phone.", accent: "#b8842a", visual: "maps-calendar", chapter: "Calendar + Maps" },
      { kicker: "No command language", headline: "Say what you need.\nWatch it happen.", body: "Braino listens, works through it, and talks back in his own voice.", accent: "#df685f", visual: "voice-close", chapter: "Just ask", footer: "trybraino.com" },
    ],
  },
  {
    id: "meet-iomi", title: "Meet IOMI", note: "The Mac companion, from wake-up to everyday work.",
    slides: [
      { kicker: "Braino IOMI", headline: "A brain\nin your notch.", body: "Always close. Never another window to manage.", accent: "#d7ad58", visual: "eyes" },
      { kicker: "Wake him", headline: "One shortcut.\nThen speak.", body: "Braino listens when invited and disappears when the work is done.", accent: "#df685f", visual: "screen" },
      { kicker: "He can see", headline: "Context,\nwithout the recap.", body: "The page and app in front of you become part of the conversation.", accent: "#3974e8", visual: "orbit" },
      { kicker: "He can act", headline: "Across your\nwhole Mac.", body: "Files, browser, music, messages, and the space between them.", accent: "#3f9565", visual: "words" },
      { kicker: "IOMI", headline: "Your Mac.\nMore alive.", body: "Meet Braino for Mac at trybraino.com.", accent: "#d7ad58", visual: "braino" },
    ],
  },
  {
    id: "why-braino-feels-different", title: "Why Braino feels different", note: "The emotional intelligence story in five direct pages.",
    slides: [
      { kicker: "The missing layer", headline: "Smart is not\nthe same as human.", body: "Most AI understands the request and completely misses the moment.", accent: "#765ac7", visual: "eyes" },
      { kicker: "Braino notices", headline: "The words.\nAnd the weight.", body: "Tone, timing, and context change how he meets you.", accent: "#df685f", visual: "words" },
      { kicker: "When it is heavy", headline: "No jokes.\nNo performance.", body: "He knows when charm should scale all the way down to zero.", accent: "#697080", visual: "screen" },
      { kicker: "When it is not", headline: "A little chaos\nis allowed.", body: "Because a useful companion can still have a pulse.", accent: "#b8842a", visual: "braino" },
      { kicker: "Emotional Engine", headline: "Intelligence\nwith a heartbeat.", body: "Built into every Braino. trybraino.com", accent: "#765ac7", visual: "orbit" },
    ],
  },
];

function CharacterCardMotion({ motion }: { motion: "walking" | "moonwalk" }) {
  const time = useTime();
  const travel = motion === "walking" ? Math.sin(time * .72) * 12 : Math.sin(time * .58) * 14;
  return <div className={`ip-character-motion is-${motion}`} style={{ transform: `translateX(${travel}px)` }} aria-hidden="true">
    <Braino size={62} legs gloves idle walk={motion === "walking"} moonwalk={motion === "moonwalk"} accessory={motion === "moonwalk" ? "fedora" : "none"} expr={motion === "moonwalk" ? "mischief" : "happy"} lookX={motion === "walking" ? .45 : 0} />
  </div>;
}

function HeadlineLine({ line }: { line: string }) {
  const parts = line.split(/(Iron Man)/gi);
  return <>{parts.map((part, index) => /^iron man$/i.test(part) ? <em className="ip-iron-man-shimmer" key={`${part}-${index}`}>{part}</em> : part)}</>;
}

function PostSlide({ slide, index, total, nodeRef, onImagePointerDown }: { slide: Slide; index: number; total: number; nodeRef?: (node: HTMLElement | null) => void; onImagePointerDown?: (event: React.PointerEvent<HTMLImageElement>) => void }) {
  return <article ref={nodeRef} className={`ip-slide visual-${slide.visual} align-${slide.align ?? "left"} layout-${slide.layout ?? "default"}${slide.footer ? " has-footer" : ""}`} style={{ "--ip-accent": slide.accent, background: slide.background ?? "#fbfbfd", color: slide.textColor ?? "#191817" } as React.CSSProperties}>
    <header><span>{slide.chapter ?? "The story"} · {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></header>
    <div className="ip-slide-visual">
      {slide.image && <img className="ip-user-image" src={slide.image} alt="" onPointerDown={onImagePointerDown} style={{ left: `${slide.imageX ?? 50}%`, top: `${slide.imageY ?? 50}%`, transform: `translate(-50%,-50%) scale(${slide.imageScale ?? 1})` }} />}
      {!slide.image && slide.visual === "braino" && <div className="ip-slide-braino" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />}
      {!slide.image && slide.visual === "screen" && <div className="ip-slide-screen"><span><i /><i /><i /></span><div className="ip-screen-page"><i /><i /><i /></div><div className="ip-screen-braino"><b>braino</b><span>{index === 0 ? "I’m here. What are we doing?" : "I already have the page."}</span><em><i /><i /><i /></em></div><strong>Ask Braino <i>↑</i></strong></div>}
      {!slide.image && slide.visual === "words" && <div className="ip-slide-words"><span>Read it</span><span>Understand it</span><span>Do it</span></div>}
      {!slide.image && slide.visual === "eyes" && <div className="ip-slide-eyes"><i /><i /></div>}
      {!slide.image && slide.visual === "orbit" && <div className="ip-slide-orbit"><i /><i /><div dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /></div>}
      {!slide.image && slide.visual === "capabilities" && <div className="ip-product-capabilities">
        <div className="ip-pc-grid">
          <article className="dark"><h4>He does the work.</h4><p>Complex questions, whole tasks—solved. You just say what you want.</p></article>
          <article><div className="ip-pc-files"><i>Lecture.pdf</i><i>Summarize this</i><i>Notes.md</i></div><h4>Summarizes anything</h4><p>A 4,000-word page becomes four lines.</p></article>
          <article><div className="ip-pc-command">“Braino, book that flight.”</div><h4>Hand off tasks</h4><p>Say it in plain words. He does the clicking.</p></article>
          <article className="dark"><div className="ip-pc-answer"><i>Answer · 4 lines</i><i>Real sources · 3</i><i>Zero tab-hopping</i></div><h4>Ask about anything</h4><p>Fresh answers, real sources, on any page.</p></article>
        </div>
        <div className="ip-pc-marquee"><div>{["Book a table, a flight, or a ride", "Turn a lecture into clean notes", "Organize your whole desktop", "Shop and check out for you", "Draft and send your messages", "Find any file in a second", "Book a table, a flight, or a ride", "Turn a lecture into clean notes", "Organize your whole desktop", "Shop and check out for you", "Draft and send your messages", "Find any file in a second"].map((item, itemIndex) => <span className={itemIndex % 2 === 0 ? "dark" : ""} key={`${item}-${itemIndex}`}>{item}</span>)}</div></div>
      </div>}
      {!slide.image && slide.visual === "forms" && <div className="ip-braino-forms"><BrainoDefs /><span><img src="/reactions/braino-happy.svg" alt="" /><em>01 / Face</em><strong>The expression.</strong></span><span className="has-walker"><b dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /><em>02 / Standing</em><strong>The companion.</strong></span><span className="has-walker is-walking"><CharacterCardMotion motion="walking" /><em>03 / Walking</em><strong>He enters the work.</strong></span><span><img src="/reactions/braino-celebrating.svg" alt="" /><em>04 / Dancing</em><strong>Joy has choreography.</strong></span><span className="has-walker is-moonwalking"><CharacterCardMotion motion="moonwalk" /><em>05 / Moonwalk</em><strong>Of course he moonwalks.</strong></span><span><img src="/reactions/braino-laughing.svg" alt="" /><em>06 / Reactions</em><strong>One Braino. Many moods.</strong></span></div>}
      {!slide.image && slide.visual === "hero" && <div className="ip-braino-hero"><div className="companion"><BrainoDefs /><Braino size={210} legs gloves idle={false} arm="wave" expr="happy" /></div><div className="ip-braino-subtitle"><i />hey shawty</div></div>}
      {!slide.image && slide.visual === "face" && <div className="ip-braino-face"><img src="/reactions/braino-happy.svg" alt="Braino smiling" /><i /><i /></div>}
      {!slide.image && slide.visual === "chrome-loop" && <div className="ip-real-chrome-loop"><ChromeSystemPrototype socialLoop /></div>}
      {!slide.image && slide.visual === "capability-table" && <div className="ip-capability-table">{["Understands the page", "Searches with sources", "Summarises anything", "Records lectures", "Works through websites", "Replies to email", "Runs your calendar", "Sends Maps to phone", "Talks in his own voice"].map((item, itemIndex) => <span className={itemIndex % 2 ? "dark" : ""} key={item}><i>{String(itemIndex + 1).padStart(2, "0")}</i><b>{item}</b></span>)}</div>}
      {!slide.image && slide.visual === "research" && <div className="ip-research-visual"><div className="ip-research-page"><i /><i /><i /><i /></div><div className="ip-research-answer"><small>Answer</small><strong>The useful part, in four lines.</strong><span>3 fresh sources</span></div></div>}
      {!slide.image && slide.visual === "lecture" && <div className="ip-lecture-visual"><div className="ip-lecture-wave">{Array.from({ length: 24 }, (_, barIndex) => <i style={{ "--bar": barIndex } as React.CSSProperties} key={barIndex} />)}</div><div className="ip-lecture-notes"><span>Lecture notes</span><b>01</b><p>The central idea</p><b>02</b><p>What to remember</p></div><small>Recording · 42:18</small></div>}
      {!slide.image && slide.visual === "browser-actions" && <div className="ip-actions-visual"><div className="ip-actions-browser"><header><i /><i /><i /></header><span className="ip-action-cursor">↖</span><button>Continue</button><input readOnly value="Braino is typing…" /><div className="ip-action-steps"><i>Navigate</i><i>Scroll</i><i>Click</i><i>Type</i></div></div></div>}
      {!slide.image && slide.visual === "email" && <div className="ip-email-visual"><div className="ip-email-incoming"><small>From · Aditi</small><strong>Can we move tomorrow’s review?</strong></div><div className="ip-email-reply"><small>Reply ready</small><p>Tomorrow works. I’ve moved our review and kept the same Meet link.</p><button>Approve + send</button></div><span>4.2 seconds</span></div>}
      {!slide.image && slide.visual === "maps-calendar" && <div className="ip-handoff-visual"><div className="ip-calendar-card"><small>Calendar</small><b>Product review</b><span>Tomorrow · 11:00</span><i>Meet link added</i></div><div className="ip-map-card"><small>Maps</small><div><i /><i /><i /></div><b>Best route found</b><span>Sent to your phone →</span></div></div>}
      {!slide.image && slide.visual === "voice-close" && <div className="ip-voice-visual"><div dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /><span>{Array.from({ length: 11 }, (_, waveIndex) => <i style={{ "--wave": waveIndex } as React.CSSProperties} key={waveIndex} />)}</span><strong>Listening</strong></div>}
    </div>
    <div className="ip-slide-copy"><p>{slide.kicker}</p><h3>{slide.headline.split("\n").map((line, lineIndex, lines) => <span key={`${line}-${lineIndex}`}><HeadlineLine line={line} />{lineIndex < lines.length - 1 && <br />}</span>)}</h3><strong>{slide.body}</strong></div>
    {slide.footer && <footer><span>Meet him on the web</span><span>{slide.footer}</span></footer>}
  </article>;
}

export default function InstaPosts() {
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem(INSTAPOSTS_DRAFT_KEY)
        ?? LEGACY_DRAFT_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
      const parsed: Post[] = saved ? JSON.parse(saved) : STARTER_POSTS;
      if (!localStorage.getItem(POST_TWO_REDESIGN_KEY)) {
        const redesigned = STARTER_POSTS.find((post) => post.id === "braino-does-the-work");
        localStorage.setItem(POST_TWO_REDESIGN_KEY, "done");
        return parsed.map((post) => post.id === "braino-does-the-work" && redesigned ? redesigned : post);
      }
      return parsed;
    } catch { return STARTER_POSTS; }
  });
  const [openPost, setOpenPost] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [videoExporting, setVideoExporting] = useState(false);
  const [videoExportStatus, setVideoExportStatus] = useState("");
  const [exportEpoch, setExportEpoch] = useState(0);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; imageX: number; imageY: number } | null>(null);
  const selected = openPost === null ? null : posts[openPost];

  useEffect(() => {
    if (openPost === null) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenPost(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [openPost]);

  useEffect(() => {
    try { localStorage.setItem(INSTAPOSTS_DRAFT_KEY, JSON.stringify(posts)); } catch { /* Large uploaded images can exceed browser draft storage. */ }
  }, [posts]);

  useEffect(() => {
    if (openPost === null) return;
    setActiveSlide(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [openPost]);

  const goToSlide = (index: number) => {
    if (!selected) return;
    const next = (index + selected.slides.length) % selected.slides.length;
    setActiveSlide(next);
    trackRef.current?.scrollTo({ left: next * trackRef.current.clientWidth, behavior: "smooth" });
  };

  const syncScrolledSlide = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth || !selected) return;
    setActiveSlide(Math.max(0, Math.min(selected.slides.length - 1, Math.round(track.scrollLeft / track.clientWidth))));
  };

  const updateSlide = (field: keyof Pick<Slide, "kicker" | "headline" | "body">, value: string) => {
    if (openPost === null) return;
    setPosts((current) => current.map((post, postIndex) => postIndex !== openPost ? post : { ...post, slides: post.slides.map((slide, slideIndex) => slideIndex === activeSlide ? { ...slide, [field]: value } : slide) }));
  };

  const patchSlide = (patch: Partial<Slide>) => {
    if (openPost === null) return;
    setPosts((current) => current.map((post, postIndex) => postIndex !== openPost ? post : { ...post, slides: post.slides.map((slide, slideIndex) => slideIndex === activeSlide ? { ...slide, ...patch } : slide) }));
  };

  const uploadImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patchSlide({ image: String(reader.result), imageX: 50, imageY: 50, imageScale: 1 });
    reader.readAsDataURL(file);
  };

  const startImageDrag = (event: React.PointerEvent<HTMLImageElement>) => {
    const slide = selected?.slides[activeSlide];
    if (!slide?.image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, imageX: slide.imageX ?? 50, imageY: slide.imageY ?? 50 };
    const move = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      const visual = event.currentTarget.parentElement;
      if (!drag || !visual) return;
      patchSlide({ imageX: Math.max(0, Math.min(100, drag.imageX + ((moveEvent.clientX - drag.startX) / visual.clientWidth) * 100)), imageY: Math.max(0, Math.min(100, drag.imageY + ((moveEvent.clientY - drag.startY) / visual.clientHeight) * 100)) });
    };
    const stop = () => { dragRef.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", stop);
  };

  const duplicateSlide = () => {
    if (openPost === null || !selected) return;
    setPosts((current) => current.map((post, postIndex) => postIndex !== openPost ? post : { ...post, slides: [...post.slides.slice(0, activeSlide + 1), { ...post.slides[activeSlide] }, ...post.slides.slice(activeSlide + 1)] }));
    window.setTimeout(() => goToSlide(activeSlide + 1));
  };

  const deleteSlide = () => {
    if (openPost === null || !selected || selected.slides.length <= 1) return;
    setPosts((current) => current.map((post, postIndex) => postIndex !== openPost ? post : { ...post, slides: post.slides.filter((_, index) => index !== activeSlide) }));
    goToSlide(Math.max(0, activeSlide - 1));
  };

  const moveSlide = (direction: number) => {
    if (openPost === null || !selected) return;
    const target = activeSlide + direction;
    if (target < 0 || target >= selected.slides.length) return;
    setPosts((current) => current.map((post, postIndex) => {
      if (postIndex !== openPost) return post;
      const slides = [...post.slides]; [slides[activeSlide], slides[target]] = [slides[target], slides[activeSlide]]; return { ...post, slides };
    }));
    window.setTimeout(() => goToSlide(target));
  };

  const downloadPost = async () => {
    if (!selected || exporting) return;
    setExporting(true);
    try {
      const [{ toBlob }, { default: JSZip }] = await Promise.all([import("html-to-image"), import("jszip")]);
      const zip = new JSZip();
      for (let index = 0; index < selected.slides.length; index += 1) {
        const node = slideRefs.current[index];
        if (!node) throw new Error(`Slide ${index + 1} is not ready`);
        const pixelRatio = 4320 / node.getBoundingClientRect().width;
        const png = await toBlob(node, { pixelRatio, cacheBust: true, style: { transform: "none" } });
        if (!png) throw new Error("PNG render failed");
        zip.file(`${selected.id}-${String(index + 1).padStart(2, "0")}-4k.png`, png);
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${selected.id}-4k.zip`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally { setExporting(false); }
  };

  const downloadPostVideos = async () => {
    if (!selected || videoExporting) return;
    const mimeType = ["video/mp4;codecs=avc1.42E01E", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      window.alert("This browser cannot encode MP4 directly. Open Instaposts in the latest Chrome or Safari and try again.");
      return;
    }
    setVideoExporting(true);
    try {
      const [{ toCanvas }, { default: JSZip }] = await Promise.all([import("html-to-image"), import("jszip")]);
      const zip = new JSZip();
      for (let index = 0; index < selected.slides.length; index += 1) {
        setVideoExportStatus(`Recording slide ${index + 1} / ${selected.slides.length}`);
        setExportEpoch((value) => value + 1);
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        const node = slideRefs.current[index];
        if (!node) throw new Error(`Slide ${index + 1} is not ready`);
        node.getAnimations({ subtree: true }).forEach((animation) => { animation.currentTime = 0; animation.play(); });
        const canvas = document.createElement("canvas");
        canvas.width = 1080; canvas.height = 1350;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Video canvas is unavailable");
        const stream = canvas.captureStream(30);
        const chunks: BlobPart[] = [];
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16_000_000 });
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        const stopped = new Promise<Blob>((resolve, reject) => {
          recorder.onerror = () => reject(new Error("MP4 recording failed"));
          recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
        });
        recorder.start(500);
        const startedAt = performance.now();
        while (performance.now() - startedAt < 12_000) {
          const frame = await toCanvas(node, { pixelRatio: 1080 / node.getBoundingClientRect().width, cacheBust: false, style: { transform: "none" } });
          context.drawImage(frame, 0, 0, 1080, 1350);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        recorder.stop();
        const video = await stopped;
        stream.getTracks().forEach((track) => track.stop());
        zip.file(`${selected.id}-${String(index + 1).padStart(2, "0")}-1080x1350.mp4`, video, { compression: "STORE" });
      }
      setVideoExportStatus("Packing MP4 ZIP…");
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `${selected.id}-animated-mp4.zip`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("[Instaposts] MP4 export failed", error);
      window.alert(error instanceof Error ? error.message : "MP4 export failed");
    } finally {
      setVideoExporting(false);
      setVideoExportStatus("");
    }
  };

  return <main className="ip-page">
    <nav className="ip-nav"><a href="#top"><i /> braino</a><span>Instaposts</span><small>{posts.length} posts · {posts.reduce((sum, post) => sum + post.slides.length, 0)} slides</small></nav>
    <header className="ip-hero" id="top"><p>Social studio</p><h1>Every post.<br /><em>Ready to shape.</em></h1><div><p>Hover to peek through a carousel. Open it to review every slide, edit the words, and download the complete post in 4K.</p><span>1080 × 1350 · 4:5</span></div></header>
    <section className="ip-gallery" aria-label="Instagram post gallery">
      {posts.map((post, postIndex) => <button className="ip-post-card" type="button" key={post.id} onClick={() => { setOpenPost(postIndex); setActiveSlide(0); }}>
        <div className="ip-card-preview">{post.slides.slice(0, 3).map((slide, index) => <div className="ip-card-sheet" style={{ "--sheet-accent": slide.accent } as React.CSSProperties} key={slide.headline}><span>{String(index + 1).padStart(2, "0")}</span><b>{slide.headline.split("\n")[0]}</b></div>)}<span className="ip-hover-instruction">Hover preview · click to open</span></div>
        <div className="ip-card-copy"><span>Post {String(postIndex + 1).padStart(2, "0")} · {post.slides.length} slides</span><h2>{post.title}</h2><p>{post.note}</p><strong>Open post →</strong></div>
      </button>)}
    </section>
    {selected && <div className="ip-modal" role="dialog" aria-modal="true" aria-label={`Editing ${selected.title}`}>
      <button className="ip-modal-backdrop" type="button" onClick={() => setOpenPost(null)} aria-label="Close post" />
      <section className="ip-workspace">
        <header><div><span>Post {String((openPost ?? 0) + 1).padStart(2, "0")}</span><h2>{selected.title}</h2></div><button type="button" onClick={() => setOpenPost(null)}>Close ×</button></header>
        <div className="ip-workspace-grid">
          <div className="ip-editor-preview"><div className="ip-editor-track" ref={trackRef} onScroll={syncScrolledSlide}>{selected.slides.map((slide, index) => <PostSlide slide={slide} index={index} total={selected.slides.length} key={`${index}-${exportEpoch}`} nodeRef={(node) => { slideRefs.current[index] = node; }} onImagePointerDown={index === activeSlide ? startImageDrag : undefined} />)}</div><div className="ip-slide-nav"><button type="button" onClick={() => goToSlide(activeSlide - 1)}>←</button><span>{activeSlide + 1} / {selected.slides.length} · scroll</span><button type="button" onClick={() => goToSlide(activeSlide + 1)}>→</button></div></div>
          <aside className="ip-edit-panel">
            <div className="ip-panel-head"><span>Edit slide {activeSlide + 1}</span><div><button type="button" onClick={() => moveSlide(-1)} title="Move slide left">←</button><button type="button" onClick={() => moveSlide(1)} title="Move slide right">→</button><button type="button" onClick={duplicateSlide}>Duplicate</button><button type="button" onClick={deleteSlide}>Delete</button></div></div>
            <label>Kicker<input value={selected.slides[activeSlide].kicker} onChange={(event) => updateSlide("kicker", event.target.value)} /></label>
            <label>Headline<textarea value={selected.slides[activeSlide].headline} onChange={(event) => updateSlide("headline", event.target.value)} /></label>
            <label>Description<textarea value={selected.slides[activeSlide].body} onChange={(event) => updateSlide("body", event.target.value)} /></label>
            <div className="ip-control-row"><label>Accent<input type="color" value={selected.slides[activeSlide].accent} onChange={(event) => patchSlide({ accent: event.target.value })} /></label><label>Background<input type="color" value={selected.slides[activeSlide].background ?? "#fbfbfd"} onChange={(event) => patchSlide({ background: event.target.value })} /></label><label>Text<input type="color" value={selected.slides[activeSlide].textColor ?? "#191817"} onChange={(event) => patchSlide({ textColor: event.target.value })} /></label></div>
            <div className="ip-align-row"><button type="button" className={(selected.slides[activeSlide].align ?? "left") === "left" ? "active" : ""} onClick={() => patchSlide({ align: "left" })}>Left aligned</button><button type="button" className={selected.slides[activeSlide].align === "center" ? "active" : ""} onClick={() => patchSlide({ align: "center" })}>Centred</button></div>
            <label className="ip-upload">Photo<input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} /><span>{selected.slides[activeSlide].image ? "Replace photo" : "Choose photo"}</span></label>
            {selected.slides[activeSlide].image && <div className="ip-image-controls"><label>Photo size<input type="range" min="0.5" max="3" step="0.05" value={selected.slides[activeSlide].imageScale ?? 1} onChange={(event) => patchSlide({ imageScale: Number(event.target.value) })} /></label><small>Drag the photo directly on the canvas to position it.</small><button type="button" onClick={() => patchSlide({ image: undefined })}>Remove photo</button></div>}
            <small>Draft changes are saved in this browser automatically.</small>
            <button className="ip-download ip-download-video" type="button" onClick={downloadPostVideos} disabled={videoExporting || exporting}>{videoExporting ? videoExportStatus : "Download animated · MP4 ZIP"}<i>1080 × 1350 · 12 seconds each</i></button>
            <button className="ip-download" type="button" onClick={downloadPost} disabled={exporting}>{exporting ? "Rendering static 4K files…" : "Download static · 4K PNG ZIP"}<i>PNG freezes animated slides</i></button>
          </aside>
        </div>
      </section>
    </div>}
  </main>;
}
