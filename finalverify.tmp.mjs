import { chromium } from "playwright";
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));
await pg.goto("http://localhost:8081/notch-teaser", { waitUntil: "networkidle" });
await pg.waitForTimeout(1500);
console.log("errors:", errs);
const maxMs = await pg.evaluate(() => +document.querySelector(".nt-scrub")?.max || 33000);
console.log("max:", maxMs);
const seekTo = async (ms) => pg.evaluate((ms) => {
  const slider = document.querySelector(".nt-scrub");
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(slider, String(ms));
  slider.dispatchEvent(new Event("input", { bubbles: true }));
}, ms);
for (let ms = 0; ms <= maxMs; ms += 250) { await seekTo(ms); await pg.waitForTimeout(8); }
console.log("scrub errors:", errs);
await b.close();
