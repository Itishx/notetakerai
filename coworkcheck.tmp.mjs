import { chromium } from "playwright";
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
await pg.goto("http://localhost:8081/notch-teaser", { waitUntil: "networkidle" });
await pg.waitForTimeout(1200);
const seekTo = async (ms) => pg.evaluate((ms) => {
  const slider = document.querySelector(".nt-scrub");
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(slider, String(ms));
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}, ms);
const maxMs = await pg.evaluate(() => +document.querySelector(".nt-scrub")?.max || 33000);
console.log("max:", maxMs);
// find cowork window
for (let ms = maxMs - 8000; ms <= maxMs; ms += 200) {
  await seekTo(ms);
  await pg.waitForTimeout(40);
  const op = await pg.evaluate(() => +getComputedStyle(document.querySelector(".nt-cowork")).opacity);
  if (op > 0.3) console.log(ms, "cowork visible, op=", op);
}
const SCRATCH = process.env.SCRATCH;
