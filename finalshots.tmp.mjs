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
const SCRATCH = process.env.SCRATCH;
// find vision mascot moment
for (let ms = 13000; ms <= 18000; ms += 100) {
  await seekTo(ms);
  await pg.waitForTimeout(15);
  const op = await pg.evaluate(() => +getComputedStyle(document.querySelector(".nt-vision-mascot")).opacity);
  if (op > 0.7) { await pg.screenshot({ path: `${SCRATCH}/visfix-${ms}.png` }); console.log(ms, "vision mascot"); break; }
}
// find absolutely moment
for (let ms = 18000; ms <= 33000; ms += 150) {
  await seekTo(ms);
  await pg.waitForTimeout(15);
  const op = await pg.evaluate(() => +getComputedStyle(document.querySelector(".nt-absolutely")).opacity);
  if (op > 0.7) { await pg.screenshot({ path: `${SCRATCH}/abs-${ms}.png` }); console.log(ms, "absolutely"); break; }
}
await b.close();
