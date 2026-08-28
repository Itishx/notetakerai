/* Prints a self-contained deck HTML to PDF at its own @page size.
 *
 *   node scripts/print-deck.mjs files/braino-pitch-v10.html public/braino-pitch-v10.pdf
 *
 * v9/v10 set `@page { size: 1280px 720px; margin: 0 }` and each slide is a
 * `.fit > .slide`, so Chromium paginates them correctly with no extra work.
 * The on-screen `.slide` box-shadow is dropped first: Chromium prints a soft
 * shadow as a flat grey slab that every non-Chrome viewer draws opaquely.
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const src = process.argv[2] || 'files/braino-pitch-v10.html';
const out = process.argv[3] || 'public/braino-pitch-v10.pdf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve(src), { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.addStyleTag({ content: '.slide { box-shadow: none !important; border-radius: 0 !important; }' });
const n = await p.evaluate(() => document.querySelectorAll('.fit > .slide').length);
await p.pdf({ path: out, width: '1280px', height: '720px', printBackground: true, pageRanges: `1-${n}` });
await b.close();

console.log(`${src} -> ${out}`);
console.log(`slides: ${n} | ${(fs.statSync(out).size / 1024 / 1024).toFixed(2)} MB | errors: ${errs.length ? errs : 'none'}`);
