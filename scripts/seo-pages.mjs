/* Runs after `vite build`. The site is one React app, so every address used to
 * send the same empty HTML with one title. Link previews, search engines and AI
 * readers that do not run JavaScript saw only that.
 *
 * For each public page this writes dist/<page>/index.html with the page's own
 * title, description, share card and address, plus the page's real words
 * (from scripts/seo-pages.json, refreshed by scripts/seo-snapshot.mjs). React
 * replaces those words the moment it starts; people never see them unless the
 * app fails to load. Every other address gets dist/app.html, a plain shell.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE = (process.env.SITE_URL || "https://www.affctve.com").replace(/\/$/, "");
const IMAGE = `${SITE}/og-affective.jpg`;
const words = JSON.parse(readFileSync(new URL("./seo-pages.json", import.meta.url), "utf8"));

const PAGES = {
  "/": {
    title: "Affective",
    description: "Meet Braino. He lives in your Mac's notch and does what you say in the apps you already use. Made by Affective, running on AffectiveOS.",
  },
  "/affectiveos": {
    title: "Introducing AffectiveOS · Affective",
    description: "AffectiveOS is a voice-first operating system for the Mac. It sees your screen, hears you, talks back, acts in your apps and remembers you.",
  },
  "/braino": {
    title: "Braino · Affective",
    description: "Braino is a companion who lives in your Mac's notch. Talk to him like a person and he does the job in your apps, then remembers you. In private beta.",
  },
  "/about": {
    title: "About · Affective",
    description: "We believe the future of computing is voice-first. Affective is a product company in Bengaluru building it for the Mac you already own.",
  },
  "/apps": {
    title: "App Store · Affective",
    description: "Everything Affective builds runs on AffectiveOS. Braino, our companion for the Mac, is in private beta.",
  },
  "/waitlist": {
    title: "Early access · Affective",
    description: "Braino is in private beta. Leave your email and we will let you in as soon as there is a seat.",
  },
  "/contact": {
    title: "Contact · Affective",
    description: "We are a small, independent team. We read every message and reply fast.",
  },
  "/privacy": { title: "Privacy · Affective", description: "How Affective and Braino handle your data." },
  "/terms": { title: "Terms · Affective", description: "The terms for using Affective and Braino." },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const shell = readFileSync("dist/index.html", "utf8");
const setMeta = (html, attr, key, value) =>
  html.replace(new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`), `<meta ${attr}="${key}" content="${esc(value)}" />`);

function pageHtml(route, { title, description }) {
  const url = SITE + (route === "/" ? "/" : route);
  let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = html.replace(/content="[^"]*og-affective\.jpg"/g, `content="${IMAGE}"`);
  html = html.replace("</head>", `  <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n${STYLE}  </head>`);

  const blocks = (words[route]?.blocks || []).slice(0, 90);
  let sawH1 = false;
  const body = blocks.map(([tag, text]) => {
    if (tag === "h1") { if (sawH1) tag = "h2"; sawH1 = true; }
    return tag === "li" ? `<p>${esc(text)}</p>` : `<${tag}>${esc(text)}</${tag}>`;
  }).join("\n");
  const nav = Object.keys(PAGES).map((r) => `<a href="${r}">${esc(PAGES[r].title.split(" · ")[0])}</a>`).join(" · ");
  const snapshot = `<div class="seo-page">\n${sawH1 ? "" : `<h1>${esc(title.split(" · ")[0])}</h1>\n`}${body}\n<nav>${nav}</nav>\n</div>`;
  return html.replace('<div id="root"></div>', `<div id="root">${snapshot}</div>`);
}

/* Hidden while the app loads; shown only if it has not started after 4s. */
const STYLE = `    <style>.seo-page{opacity:0;animation:seo-show .3s 4s forwards;max-width:720px;margin:0 auto;padding:48px 20px;font:17px/1.6 Georgia,serif;color:#1d1b17;background:#f4f2ed}.seo-page nav{margin-top:40px;font-size:15px}@keyframes seo-show{to{opacity:1}}</style>\n`;

writeFileSync("dist/app.html", shell);
for (const [route, meta] of Object.entries(PAGES)) {
  const file = route === "/" ? "dist/index.html" : `dist${route}/index.html`;
  if (route !== "/") mkdirSync(`dist${route}`, { recursive: true });
  writeFileSync(file, pageHtml(route, meta));
}

const today = new Date().toISOString().slice(0, 10);
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(PAGES).map((r) => `  <url><loc>${SITE}${r}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
console.log(`seo-pages: ${Object.keys(PAGES).length} pages for ${SITE}`);
