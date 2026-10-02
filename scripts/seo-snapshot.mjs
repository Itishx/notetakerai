/* Reads the public pages the way a person sees them and saves their words to
 * scripts/seo-pages.json. The build (scripts/seo-pages.mjs) bakes those words
 * into each page's HTML, so link previews, search engines and AI readers that
 * never run JavaScript still get the real page, not an empty shell.
 *
 * Run it after changing a public page's copy:
 *   npm run build && npx vite preview --port 4719 &
 *   node scripts/seo-snapshot.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const BASE = process.env.SEO_BASE || "http://localhost:4719";
const OUT = new URL("./seo-pages.json", import.meta.url);
const ROUTES = ["/", "/affectiveos", "/braino", "/about", "/contact", "/privacy", "/terms"];

const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const out = {};

for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  // Scroll through once so sections that reveal on scroll are in the page.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  const blocks = await page.evaluate(() => {
    const seen = new Set();
    const list = [];
    const root = document.querySelector("main") || document.getElementById("root");
    // Headlines that animate word by word are separate boxes with no spaces
    // between them; the whole sentence lives in their aria-label.
    for (const lab of root.querySelectorAll("[aria-label]")) {
      const kids = [...lab.children];
      if (kids.length && kids.every((c) => c.getAttribute("aria-hidden") === "true")) lab.textContent = ` ${lab.getAttribute("aria-label")} `;
    }
    for (const el of root.querySelectorAll("h1,h2,h3,p,li")) {
      if (el.closest("nav,footer,[aria-hidden='true'],[role='img'],.vz")) continue;
      if (el.parentElement.closest("p,li")) continue;
      const text = el.innerText.replace(/\s+/g, " ").trim();
      if (text.length < 2 || seen.has(text)) continue;
      seen.add(text);
      list.push([el.tagName.toLowerCase(), text]);
    }
    return list;
  });
  const title = await page.title();
  const description = await page.evaluate(() => document.querySelector('meta[name="description"]')?.content || "");
  out[route] = { ...(old[route] || {}), title, pageDescription: description, blocks };
  console.log(route, title, blocks.length);
}

await browser.close();
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
