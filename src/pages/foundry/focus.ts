/* Open a page already filtered (2026-10-24). Braino's notch and his voice set
   these before navigating; the page reads them once when it mounts and then
   forgets them, the same pattern as "foundry-focus-topic". */
export type Focus = {
  person?: string;
  stage?: string;
  platform?: string;
  approvals?: "todo" | "done";
  topic?: string;
};
const KEY: Record<keyof Focus, string> = {
  person: "foundry-focus-person",
  stage: "foundry-focus-stage",
  platform: "foundry-focus-platform",
  approvals: "foundry-focus-approvals",
  topic: "foundry-focus-topic",
};
export function setFocus(f: Focus) {
  try { (Object.keys(f) as (keyof Focus)[]).forEach((k) => { if (f[k]) sessionStorage.setItem(KEY[k], String(f[k])); }); } catch (_) { /* private */ }
}
export function takeFocus(k: keyof Focus): string {
  try { const v = sessionStorage.getItem(KEY[k]) || ""; sessionStorage.removeItem(KEY[k]); return v; } catch (_) { return ""; }
}
