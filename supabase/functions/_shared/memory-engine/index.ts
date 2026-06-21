// Memory Engine — public surface. Import from here.

export type {
  Memory,
  MemoryCategory,
  MemoryOp,
  MemorySource,
  MemoryStatus,
  ExistingMemoryRef,
  TierLimits,
} from "./types.ts";

export { shouldCapture } from "./gate.ts";
export { buildExtractionPrompt, parseMemoryOps } from "./extract.ts";
export { applyMemoryOps } from "./store.ts";
export { selectRelevantMemories } from "./retrieve.ts";
export { renderMemoryBlock, MEMORY_CAPABILITY_NOTE } from "./render.ts";
export { captureFromConversation } from "./capture.ts";
export { getTierLimits, FREE_LIMITS, PREMIUM_LIMITS } from "./tiers.ts";
