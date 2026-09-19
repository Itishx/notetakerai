/* The matching rules, loaded from the file that actually runs them.
 *
 * procedures.ts is a Deno module and its decisions about what counts as "the
 * same job" are the whole of recall. Anything on the node side that needs those
 * rules — the harvest script, its tests — must use the same ones, because a
 * second copy does not fail loudly when it drifts: routes quietly stop being
 * credited, or start being offered for jobs they were never about.
 *
 * So no copy. The pure section is read out of the real file and imported. The
 * only TypeScript in that section is three function signatures, stripped here.
 * If someone adds a typed construct to it that this cannot handle, the import
 * throws on the next test run, which is the correct way to find out.
 */
import { readFileSync } from "node:fs";

const SOURCE = new URL(
  "../../supabase/functions/_shared/human-intelligence/procedures.ts",
  import.meta.url,
);

const FROM = "const STOPWORDS";
const TO = "const MATCH_AT";

export async function loadPureRules() {
  const source = readFileSync(SOURCE, "utf8");
  const start = source.indexOf(FROM);
  const end = source.indexOf(TO);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `procedures.ts no longer has a "${FROM}" ... "${TO}" section. ` +
      "The matching rules moved; update scripts/lib/hil-pure.mjs rather than copying them.",
    );
  }
  const js = source.slice(start, end).replace(/:\s*(?:string|number|boolean)(\[\])?/g, "");
  return import(`data:text/javascript,${encodeURIComponent(js)}`);
}

/* The threshold lives in procedures.ts too, and is read rather than repeated for
   the same reason as everything else in this file. */
export function matchThreshold() {
  const source = readFileSync(SOURCE, "utf8");
  const found = source.match(/const MATCH_AT = ([\d.]+);/);
  if (!found) throw new Error("MATCH_AT is gone from procedures.ts");
  return Number(found[1]);
}
