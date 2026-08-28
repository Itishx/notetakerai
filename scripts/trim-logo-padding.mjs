#!/usr/bin/env node
/* trim-logo-padding — crop the dead space off a downloaded logo.
 *
 *   node scripts/trim-logo-padding.mjs public/logos/zoominfo.webp ...
 *   node scripts/trim-logo-padding.mjs public/logos            # whole folder
 *
 * Brand kits ship logos centred in a large square with generous margins. That is
 * correct for a press page and useless for an 11px chip: the mark ends up a
 * couple of pixels tall inside a box that is mostly nothing. ZoomInfo's file is
 * 680x680 with a wordmark occupying about a fifth of the height, which is why it
 * looked blank on the slide.
 *
 * There is no image library in this project and adding one for a crop would be
 * silly, so the work happens in the browser that is already here for
 * screenshots: draw to a canvas, walk the pixels for the real bounding box, crop,
 * re-encode as PNG. Alpha and white are both treated as background, because half
 * these files are transparent and half are on a white plate.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const MIME = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

const args = process.argv.slice(2);
if (!args.length) { console.log('usage: trim-logo-padding.mjs <file|folder> [...]'); process.exit(1); }

const files = args.flatMap((a) =>
  fs.existsSync(a) && fs.statSync(a).isDirectory()
    ? fs.readdirSync(a).map((f) => path.join(a, f))
    : [a],
).filter((f) => MIME[path.extname(f).slice(1).toLowerCase()]);

if (!files.length) { console.log('no raster images found'); process.exit(0); }

const browser = await chromium.launch();
const page = await browser.newPage();

for (const file of files) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const uri = `data:${MIME[ext]};base64,${fs.readFileSync(file).toString('base64')}`;

  const out = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);

    // Background is anything transparent or near-white. Everything else is ink.
    const isInk = (i) => {
      const a = data[i + 3];
      if (a < 24) return false;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      return !(r > 244 && g > 244 && b > 244);
    };
    let top = c.height, left = c.width, right = -1, bottom = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (!isInk((y * c.width + x) * 4)) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < 0) return null;                       // nothing but background

    // A couple of pixels back, so the mark is not shaved at the edge.
    const pad = 2;
    left = Math.max(0, left - pad); top = Math.max(0, top - pad);
    right = Math.min(c.width - 1, right + pad); bottom = Math.min(c.height - 1, bottom + pad);
    const w = right - left + 1, h = bottom - top + 1;
    if (w === c.width && h === c.height) return { unchanged: true, w, h };

    const o = document.createElement('canvas');
    o.width = w; o.height = h;
    o.getContext('2d').drawImage(c, left, top, w, h, 0, 0, w, h);
    return { dataUrl: o.toDataURL('image/png'), w, h, was: [c.width, c.height] };
  }, uri);

  const name = path.basename(file);
  if (!out) { console.log(`  ! ${name.padEnd(22)} looks empty, left alone`); continue; }
  if (out.unchanged) { console.log(`  = ${name.padEnd(22)} already tight (${out.w}x${out.h})`); continue; }

  // Always land as .png: the crop is re-encoded, so keeping a .webp name would lie.
  const target = file.replace(/\.[a-z0-9]+$/i, '.png');
  fs.writeFileSync(target, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
  if (target !== file) fs.unlinkSync(file);
  console.log(`  ✓ ${name.padEnd(22)} ${out.was[0]}x${out.was[1]} -> ${out.w}x${out.h}  (ratio ${(out.w / out.h).toFixed(2)})`);
}

await browser.close();
