/* The notch bench.
 *
 * The Mac notch has a dozen states that differ only by a class name, and every
 * one of them has at some point looked fine in the CSS and wrong on the glass:
 * a thinking line cut down to the word "READ", a panel that closed itself under
 * your hand. Reading the stylesheet does not catch those. A screenshot does.
 *
 * This loads the real markup and the real stylesheet with the renderer's own
 * script stripped, since that needs the preload bridge, and then drives the
 * classes by hand, which is exactly what the app does.
 *
 * Usage:
 *   OUT_DIR=/tmp/shots SHOTS='[{"name":"chip","classes":["nf-thinking"],"text":"..."}]' \
 *     node tests/tools/notch-bench.mjs
 */
/* A bench for the Mac notch.
 *
 * The renderer's own script needs the preload bridge, so it is stripped: this
 * loads the real markup and the real stylesheet and then drives the classes by
 * hand, which is exactly what the app does. Screenshots beat reasoning about
 * CSS, and the notch has three states that only differ by class. */
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../mac/braino-mac/renderer");
const OUT = process.env.OUT_DIR || path.resolve(ROOT, "../../../test-results/notch");
mkdirSync(OUT, { recursive: true });

let html = readFileSync(path.join(ROOT, "index.html"), "utf8");
html = html.replace(/<script[^>]*><\/script>/g, "").replace(/<script[\s\S]*?<\/script>/g, "");
html = html.replace("</head>", `<style>
  html,body { background:#2a2a2e; }
  #__bench { position:fixed; inset:0; background:linear-gradient(160deg,#3a3f4b,#22242a); z-index:-1; }
</style></head><body><div id="__bench"></div>`.replace("<body>", ""));
writeFileSync(path.join(ROOT, "__bench.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1470, height: 500 }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
await page.goto("file://" + path.join(ROOT, "__bench.html"));
await page.waitForTimeout(400);

const shots = JSON.parse(process.env.SHOTS || "[]");
for (const shot of shots) {
  await page.evaluate(({ classes, text, state, height }) => {
    const face = document.getElementById("notch-face");
    if (!face) throw new Error("no notch-face");
    face.className = "";
    face.classList.add("on", ...classes);
    const set = (sel, value) => { const el = face.querySelector(sel); if (el && value != null) el.textContent = value; };
    set(".nf-thinking-current", text);
    set(".nf-thinking-state", state || "Thinking");
    const chip = face.querySelector(".nf-think-chip-text");
    if (chip) chip.textContent = text;
    const pill = face.querySelector(".nf-pill");
    if (pill && height) pill.style.setProperty("--nf-thinking-height", height + "px");
  }, shot);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: path.join(OUT, shot.name + ".png"), clip: { x: 300, y: 0, width: 900, height: shot.clipH || 200 } });
  console.log("shot", shot.name);
}
await browser.close();
