/* Renders /pitchdeck to public/braino-pitchdeck.pdf.
 *
 *   npm run dev            # the deck must be served somewhere
 *   npm run pdf:pitchdeck  # then this
 *
 * It screenshots each slide off the live page rather than printing the route,
 * because the deck is a position:fixed scroll container and print CSS collapses
 * it to a single page. Screenshots also guarantee the PDF matches what is on
 * screen. Set DECK_URL if the dev server is not on 5199.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const IDS = ['cover','who','companion','said','engines','market','competition','model','projections','close'];
const W = 1440, H = 900;                       // 16:10, the shape the deck is designed at
const OUT = process.argv[2] || 'public/braino-pitchdeck.pdf';
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'ptpdf-'));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
const URL = process.env.DECK_URL || 'http://localhost:5199/pitchdeck';
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

// Hide the on-screen chrome: a printed page has no rail, progress bar or exit link.
await p.addStyleTag({ content: `
  .dk-rail, .dk-progress, .dk-bar-exit, .dk-cover-hint { display: none !important; }
  .dk-rev { opacity: 1 !important; transform: none !important; }
` });

const files = [];
for (const [i, id] of IDS.entries()) {
  await p.evaluate(s => document.getElementById(`slide-${s}`)?.scrollIntoView({ behavior: 'instant', block: 'start' }), id);
  await p.waitForTimeout(900);
  const f = path.join(tmp, `${String(i + 1).padStart(2, '0')}.png`);
  await p.screenshot({ path: f, clip: { x: 0, y: 0, width: W, height: H } });
  files.push(f);
}
await p.close();

// Assemble: one image per page, at the exact page size, no margins.
const pages = files.map(f =>
  `<div class="pg"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"></div>`
).join('\n');
const html = `<!doctype html><meta charset="utf-8"><style>
  @page { size: ${W}px ${H}px; margin: 0; }
  html,body { margin:0; padding:0; background:#fff; }
  .pg { width:${W}px; height:${H}px; overflow:hidden; page-break-after:always; break-after:page; }
  .pg:last-child { page-break-after:auto; break-after:auto; }
  .pg img { width:${W}px; height:${H}px; display:block; }
</style>${pages}`;
const htmlFile = path.join(tmp, 'deck.html');
fs.writeFileSync(htmlFile, html);

const p2 = await b.newPage();
await p2.goto('file://' + htmlFile, { waitUntil: 'load' });
await p2.pdf({ path: OUT, width: `${W}px`, height: `${H}px`, printBackground: true, pageRanges: `1-${IDS.length}` });
await b.close();

console.log('errors:', errs.length ? errs : 'none');
console.log('wrote', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + ' MB');
fs.rmSync(tmp, { recursive: true, force: true });
