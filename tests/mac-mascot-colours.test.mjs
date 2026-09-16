import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const boot = read("mac/braino-mac/renderer/boot-intro.js");
const onboarding = read("mac/braino-mac/renderer/onboarding.js");
const renderer = read("mac/braino-mac/renderer/braino-mac.js");

const uniqueGradients = Function(
  `${boot.match(/function uniqueGradients\(svg, tag\) \{[\s\S]*?\n  \}/)[0]}; return uniqueGradients;`,
)();
const art = (file, name) =>
  Function(`${read(`src/components/${file}`).replace(`export const ${name}`, `const ${name}`)}\nreturn ${name};`)();

const MASCOTS = {
  braino: art("brainoWalkerSvg.ts", "BRAINO_WALKER_SVG"),
  brainelle: art("brainelleWalkerSvg.ts", "BRAINELLE_WALKER_SVG"),
  webb: art("webbWalkerSvg.ts", "WEBB_WALKER_SVG"),
  ferro: art("ferroWalkerSvg.ts", "FERRO_WALKER_SVG"),
};

/* Every copy of a mascot must paint with its own names.
 *
 * A fill of url(#x) resolves to the first element in the document with that
 * id. The boot screen and the onboarding mascot sit above the real walker and
 * are hidden once they are done, and a hidden paint server paints nothing — so
 * any name a copy shares with the real mascot strips the real one's colour.
 * The rename used to cover only Braino's three gradients, and Brainelle's hair
 * went white and her dress went black and white the day she was picked. */
for (const [name, svg] of Object.entries(MASCOTS)) {
  test(`${name}: a copy shares no paint names with the real one`, () => {
    const defined = [...svg.matchAll(/(?:^|\s)id="([^"]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith("__"));
    const copy = uniqueGradients(svg, "boot");
    for (const id of new Set(defined)) {
      assert.ok(!copy.includes(`id="${id}"`), `${name}: id "${id}" survived the rename`);
      assert.ok(!copy.includes(`url(#${id})`), `${name}: a fill still points at "${id}"`);
      assert.ok(!copy.includes(`href="#${id}"`), `${name}: an href still points at "${id}"`);
    }
  });
}

test("brainelle's hair and dress are among the renamed names", () => {
  const copy = uniqueGradients(MASCOTS.brainelle, "boot");
  for (const id of ["blwk-hair", "blwk-hair-deep", "blwk-silk", "blwk-pink", "blwk-cloth"]) {
    assert.ok(copy.includes(`id="${id}--boot"`), `${id} not renamed`);
  }
});

test("the rig's element hooks are left alone", () => {
  const copy = uniqueGradients(MASCOTS.brainelle, "boot");
  assert.ok(copy.includes('id="__sbwk_root__"'));
  assert.ok(copy.includes('id="__sbwk_eye_l__"'));
});

test("every place that copies the mascot uses the rename", () => {
  assert.match(boot, /mascotEl\.innerHTML = uniqueGradients\(svg, "boot"\)/);
  assert.match(onboarding, /__brainoUniqueGradients\?\.\(svg, "onb"\)/);
  const dancer = renderer.match(/function ensureNotchDancer\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(dancer, /__brainoUniqueGradients\(dancerSvg, "nfd"\)/);
  assert.match(dancer, /replaceAll\("__sbwk_", "__nfd_"\)/);
});
