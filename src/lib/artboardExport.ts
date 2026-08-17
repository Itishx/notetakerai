/* ============================================================================
   Artboard export — turning what is on screen into a file that matches it.

   Every InstaGraphics artboard is displayed smaller than it really is. The
   story frames are a true 1080 x 1920 box shrunk by `transform: scale(.39)`
   for the page; the carousel slides are a percentage of their viewport. That
   gap is where exports went wrong before: html-to-image was asked for a
   4320 x 5400 canvas while the node still laid out at its on-screen width, so
   the artwork landed in the top-left corner of a mostly empty PNG.

   The fix is the rule this module enforces everywhere: rasterise a node at its
   own layout size with the preview transform removed, and reach the target
   resolution with pixelRatio rather than by asking for a bigger box. Then
   normalise onto a canvas of exactly the requested dimensions, so a file that
   claims 1080 x 1920 is 1080 x 1920.
   ============================================================================ */

type HtmlToImage = typeof import("html-to-image");

let libPromise: Promise<HtmlToImage> | null = null;
const loadLib = () => (libPromise ??= import("html-to-image"));

export type ExportSize = { width: number; height: number };

/* Collecting embedded font CSS walks every stylesheet in the document, which is
   slow and throws on cross-origin sheets (the Google Fonts links). For a video
   that cost would be paid on every single frame, so it is collected once and
   handed to each frame afterwards. Failure is non-fatal: same-origin faces are
   what these artboards actually use. */
async function collectFontCss(node: HTMLElement): Promise<string> {
  try {
    const { getFontEmbedCSS } = await loadLib();
    return await getFontEmbedCSS(node);
  } catch {
    return "";
  }
}

/**
 * Rasterise a node to a canvas of exactly `size`.
 *
 * The node is measured with offsetWidth/offsetHeight, which is the untransformed
 * layout box, and the clone has its transform cleared so a preview `scale()`
 * never bakes itself into the output.
 */
export async function rasterizeNode(
  node: HTMLElement,
  size: ExportSize,
  options: { fontEmbedCSS?: string; cacheBust?: boolean } = {},
): Promise<HTMLCanvasElement> {
  const { toCanvas } = await loadLib();
  const naturalWidth = node.offsetWidth;
  const naturalHeight = node.offsetHeight;
  if (!naturalWidth || !naturalHeight) throw new Error("Artboard has no layout size yet");

  const source = await toCanvas(node, {
    width: naturalWidth,
    height: naturalHeight,
    // Scale up here, never by asking for a larger box: the layout stays the one
    // that was designed and reviewed on screen.
    pixelRatio: size.width / naturalWidth,
    cacheBust: options.cacheBust ?? false,
    fontEmbedCSS: options.fontEmbedCSS,
    backgroundColor: window.getComputedStyle(node).backgroundColor,
    style: { transform: "none", transformOrigin: "top left", margin: "0" },
  });

  // The pixelRatio maths can land a fraction of a pixel out on the minor axis,
  // so the result is copied onto a canvas of the exact advertised dimensions.
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.drawImage(source, 0, 0, size.width, size.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))), type);
  });
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function nodeToPngBlob(node: HTMLElement, size: ExportSize): Promise<Blob> {
  const fontEmbedCSS = await collectFontCss(node);
  const canvas = await rasterizeNode(node, size, { fontEmbedCSS, cacheBust: true });
  return canvasToBlob(canvas);
}

export async function downloadNodePng(node: HTMLElement, size: ExportSize, filename: string) {
  saveBlob(await nodeToPngBlob(node, size), filename);
}

/* ── Video ──────────────────────────────────────────────────────────────────
   These artboards animate through a React state machine on wall-clock timers
   plus CSS transitions, so there is no timeline to scrub. The only faithful
   capture is therefore a real-time one: replay the sequence, rasterise as fast
   as the DOM allows, and push each frame into a MediaRecorder.

   MediaRecorder stamps frames by wall clock, so a slow frame stretches nothing:
   the clip always runs at true speed, it simply carries fewer frames per second
   where the DOM was expensive. A 1080 x 1920 frame rasterises in roughly 65ms
   on a normal machine, which lands around 15fps. */

const VIDEO_TYPES = [
  { mime: "video/mp4;codecs=avc1", extension: "mp4" },
  { mime: "video/mp4", extension: "mp4" },
  { mime: "video/webm;codecs=vp9", extension: "webm" },
  { mime: "video/webm", extension: "webm" },
] as const;

/** What this browser can actually write. The extension always matches the real
    container: handing someone a .mp4 that is secretly WebM is worse than
    telling them it is WebM. */
export function supportedVideoType() {
  if (typeof MediaRecorder === "undefined") return null;
  return VIDEO_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate.mime)) ?? null;
}

export type VideoProgress = { elapsedMs: number; durationMs: number; frames: number };

export async function recordNodeVideo(
  node: HTMLElement,
  size: ExportSize,
  options: {
    durationMs: number;
    /** Restart the artboard's sequence so the clip opens on frame one. */
    onReplay?: () => void;
    onProgress?: (progress: VideoProgress) => void;
    /** Upper bound only. The real rate is whatever the DOM can sustain. */
    maxFps?: number;
  },
): Promise<{ blob: Blob; extension: string }> {
  const type = supportedVideoType();
  if (!type) throw new Error("This browser cannot record video");

  const fontEmbedCSS = await collectFontCss(node);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");

  // A zero-fps stream means every frame is one we asked for, so no duplicate
  // frames are recorded while a slow rasterise is in flight.
  const stream = canvas.captureStream(0);
  const [track] = stream.getVideoTracks() as Array<CanvasCaptureMediaStreamTrack>;
  const recorder = new MediaRecorder(stream, { mimeType: type.mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: type.mime }));
    recorder.onerror = () => reject(new Error("Recording failed"));
  });

  // Paint frame one before the recorder opens, otherwise the clip starts on a
  // blank canvas while the first rasterise is still running.
  options.onReplay?.();
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  context.drawImage(await rasterizeNode(node, size, { fontEmbedCSS }), 0, 0);

  recorder.start();
  const startedAt = performance.now();
  const minFrameMs = options.maxFps ? 1000 / options.maxFps : 0;
  let frames = 0;

  try {
    while (performance.now() - startedAt < options.durationMs) {
      const frameStartedAt = performance.now();
      context.drawImage(await rasterizeNode(node, size, { fontEmbedCSS }), 0, 0);
      track.requestFrame();
      frames += 1;
      options.onProgress?.({ elapsedMs: performance.now() - startedAt, durationMs: options.durationMs, frames });
      const spent = performance.now() - frameStartedAt;
      if (spent < minFrameMs) await new Promise((resolve) => window.setTimeout(resolve, minFrameMs - spent));
    }
  } finally {
    recorder.stop();
    stream.getTracks().forEach((streamTrack) => streamTrack.stop());
  }

  return { blob: await finished, extension: type.extension };
}

/* ── Replay registry ────────────────────────────────────────────────────────
   The export controls sit outside the artboard, because anything rendered
   inside it would be scaled to illegibility by the preview transform and would
   also appear in the exported file. Each artboard therefore publishes its own
   replay function here, keyed by the frame's element id, and the control finds
   it by that id. */

const replayHandlers = new Map<string, () => void>();

export function registerReplay(frameId: string, replay: () => void) {
  replayHandlers.set(frameId, replay);
  return () => {
    if (replayHandlers.get(frameId) === replay) replayHandlers.delete(frameId);
  };
}

export function triggerReplay(frameId: string) {
  replayHandlers.get(frameId)?.();
}
