/* Swaps `<span class="lg is-slot" data-logo="slug">Name</span>` placeholders in a
 * deck HTML for the real mark, using whatever is in public/logos/<slug>.svg.
 *
 *   node scripts/inline-deck-logos.mjs files/braino-pitch-v10.html
 *
 * The deck has to travel as a single file, so the SVG is inlined rather than
 * linked. Marks we could generate are already inline; this is for the ones
 * whose owners pulled them from the open icon set (LinkedIn, OpenAI) and the
 * ones it never had (Apollo.io, ZoomInfo, Capterra, Google Business).
 */
import fs from 'fs';
import path from 'path';

const file = process.argv[2] || 'files/braino-pitch-v10.html';
const dir = 'public/logos';

/* A mark can arrive as a vector or as a bitmap, and both have to end up inside
 * the single HTML file. SVG is inlined as markup so it inherits currentColor and
 * stays sharp; anything else becomes a data: URI <img>. Extension is looked up
 * rather than assumed — several of these are WebP wearing a .png. */
const RASTER = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };
function findAsset(slug) {
  for (const ext of ['svg', 'png', 'webp', 'jpg', 'jpeg', 'gif']) {
    const p = path.join(dir, `${slug}.${ext}`);
    if (fs.existsSync(p)) return { p, ext };
  }
  return null;
}
let html = fs.readFileSync(file, 'utf8');
let filled = 0;
const missing = [];

html = html.replace(
  /<span class="lg is-slot" data-logo="([a-z0-9-]+)">([^<]*)<\/span>/g,
  (whole, slug, label) => {
    const found = findAsset(slug);
    if (!found) { missing.push(slug); return whole; }
    const { p, ext } = found;
    if (ext !== 'svg') {
      const uri = `data:${RASTER[ext]};base64,${fs.readFileSync(p).toString('base64')}`;
      filled++;
      return `<span class="lg"><img src="${uri}" alt="" aria-hidden="true">${label}</span>`;
    }
    // Keep only the inner markup; the chip supplies its own 11px box.
    const svg = fs.readFileSync(p, 'utf8')
      .replace(/<\?xml[^>]*\?>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<svg([^>]*)>/, (_, attrs) => {
        const vb = /viewBox="([^"]+)"/.exec(attrs)?.[1] || '0 0 24 24';
        return `<svg viewBox="${vb}" aria-hidden="true">`;
      })
      .trim();
    filled++;
    return `<span class="lg">${svg}${label}</span>`;
  },
);

fs.writeFileSync(file, html);
console.log(`inlined ${filled} logo(s) into ${file}`);
if (missing.length) console.log('still missing (drop into public/logos/):', [...new Set(missing)].join(', '));
