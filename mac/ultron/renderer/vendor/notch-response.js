(function exposeBrainoNotchResponse(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BrainoNotchResponse = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  // The compact Mac surface visibly holds about two lines, or roughly one
  // hundred characters at 610px. The old 240-character boundary classified
  // medium replies as short and then the two-line CSS clamp hid their ending.
  const LONG_ANSWER_THRESHOLD = 100;

  function relativeWindowTop(screenY, displayBoundsY = 0) {
    const absoluteY = Number(screenY);
    const displayY = Number(displayBoundsY);
    if (!Number.isFinite(absoluteY)) return 0;
    return Math.max(0, absoluteY - (Number.isFinite(displayY) ? displayY : 0));
  }

  function normalizeNotchAnswer(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+([,.;:!?])/g, "$1")
      // Realtime audio transcripts occasionally join the next word directly
      // to sentence punctuation. Repair only unmistakable prose boundaries:
      // lowercase/digit sentence endings before uppercase text, and commas or
      // colons before letters. This leaves decimals, URLs, and U.S.-style
      // acronyms alone.
      .replace(/([a-z0-9][.!?]["'”’]?)(?=[A-Z])/g, "$1 ")
      .replace(/([,;:]["'”’]?)(?=[A-Za-z])/g, "$1 ")
      // Inline markdown is written for a page, not for a surface that speaks.
      // The model emits **bold** out of habit and the karaoke renderer paints
      // every token literally, so the asterisks showed up on screen as
      // asterisks. Strip the paired markers and keep the words.
      //
      // Anchored to a non-space character on each side so a lone "*" or a
      // multiplication sign survives, and applied AFTER the block splitter's
      // concerns: a leading "* " bullet is start-of-line and never matches a
      // pair, so list detection is untouched.
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "$1")
      .replace(/__(?=\S)([\s\S]*?\S)__/g, "$1")
      .replace(/(?<![*\w])\*(?=\S)([^*\n]*?\S)\*(?!\*)/g, "$1")
      .replace(/(?<![_\w])_(?=\S)([^_\n]*?\S)_(?!_)/g, "$1")
      .replace(/`{1,3}(?=\S)([\s\S]*?\S)`{1,3}/g, "$1")
      .trim();
  }

  function classifyNotchAnswer(text, options = {}) {
    const normalized = normalizeNotchAnswer(text);
    const threshold = Number.isFinite(options.threshold)
      ? Math.max(80, Number(options.threshold))
      : LONG_ANSWER_THRESHOLD;
    const isLong = Boolean(options.rich)
      || normalized.length >= threshold
      || normalized.includes("\n\n")
      || /^\s*(?:[-*+] |\d+[.)] )/m.test(normalized);
    return {
      kind: isLong ? "long" : "short",
      text: normalized,
      chars: normalized.length,
      words: normalized ? normalized.split(/\s+/).length : 0,
    };
  }

  function splitNotchAnswerBlocks(text) {
    const normalized = normalizeNotchAnswer(text);
    if (!normalized) return [];
    const blocks = [];
    const lines = normalized.split("\n");
    let paragraph = [];
    const flushParagraph = () => {
      const value = paragraph.join(" ").replace(/\s+/g, " ").trim();
      if (value) blocks.push({ type: "paragraph", text: value });
      paragraph = [];
    };

    lines.forEach((line) => {
      const value = line.trim();
      if (!value) {
        flushParagraph();
        return;
      }
      const heading = value.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
        return;
      }
      const bullet = value.match(/^[-*+]\s+(.+)$/);
      if (bullet) {
        flushParagraph();
        blocks.push({ type: "bullet", text: bullet[1].trim() });
        return;
      }
      const numbered = value.match(/^\d+[.)]\s+(.+)$/);
      if (numbered) {
        flushParagraph();
        blocks.push({ type: "number", text: numbered[1].trim() });
        return;
      }
      paragraph.push(value);
    });
    flushParagraph();
    return blocks;
  }

  function notchAnswerLingerMs(text, kind) {
    const chars = normalizeNotchAnswer(text).length;
    if (kind === "long") return Math.max(7000, Math.min(15000, 5600 + chars * 18));
    return Math.max(3600, Math.min(6200, 3200 + chars * 18));
  }

  function fitLongAnswerHeight(contentHeight, viewportHeight = 900) {
    // The reading surface is still the same design at every length, but its
    // shell follows the rendered copy. A one-line answer should not inherit a
    // 210px card just because a later sentence needs three lines.
    const minimum = 164;
    const maximum = Math.max(minimum, Number(viewportHeight) - 90);
    const measured = Number.isFinite(Number(contentHeight)) ? Number(contentHeight) : minimum;
    return Math.round(Math.max(minimum, Math.min(maximum, measured)));
  }

  function estimateLongAnswerHeight(text, viewportHeight = 900) {
    const normalized = normalizeNotchAnswer(text);
    const blocks = splitNotchAnswerBlocks(normalized);
    const estimated = 170 + Math.ceil(normalized.length / 68) * 26 + Math.max(0, blocks.length - 1) * 10;
    return fitLongAnswerHeight(estimated, viewportHeight);
  }

  return {
    LONG_ANSWER_THRESHOLD,
    classifyNotchAnswer,
    estimateLongAnswerHeight,
    fitLongAnswerHeight,
    normalizeNotchAnswer,
    notchAnswerLingerMs,
    relativeWindowTop,
    splitNotchAnswerBlocks,
  };
}));
