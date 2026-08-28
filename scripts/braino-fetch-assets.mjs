#!/usr/bin/env node
/* braino-fetch-assets — Braino goes and gets the pictures himself.
 *
 *   node scripts/braino-fetch-assets.mjs --out public/logos LinkedIn OpenAI ZoomInfo
 *   node scripts/braino-fetch-assets.mjs --out ~/Desktop/refs --kind photo "golden retriever"
 *
 * This is the worker behind the `fetch_assets` HIL tool. It is deliberately NOT
 * a list of logos: it takes whatever the user names, finds it, downloads it, and
 * leaves a folder someone can actually use.
 *
 * Sources are tried in order of how likely they are to be the RIGHT file rather
 * than merely a file, because a wrong logo is worse than a missing one:
 *
 *   1. simple-icons — the official brand path, exact and monochrome. Best when
 *      it has the brand, but its owners pull marks on trademark request, which
 *      is exactly why LinkedIn and OpenAI are absent and this script exists.
 *   2. Wikimedia Commons — real SVG uploads with a licence attached. Broad, and
 *      the API lets us demand `filetype:svg`, so we get vectors not screenshots.
 *   3. Openverse — CC-licensed photos, for when the ask is not a logo at all.
 *
 * Nothing is invented. If every source misses, the name is reported as a miss
 * and the folder simply does not get that file. Silently substituting a
 * near-match is how a deck ends up shipping a competitor's logo.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const UA = 'Braino/1.0 (asset-fetch; +https://trybraino.com)';

/* ── args ─────────────────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const names = [];
  let out = '';                // empty = derive a folder from the request
  let kind = 'any';            // any | logo | photo — 'any' tries every source
  let topic = '';
  let limit = 1;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out = argv[++i];
    else if (a === '--kind') kind = argv[++i];
    else if (a === '--topic') topic = argv[++i];
    else if (a === '--limit') limit = Math.max(1, Number(argv[++i]) || 1);
    else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
    else names.push(a);
  }
  return { names, out: out.replace(/^~/, os.homedir()), kind, topic, limit };
}

function usage() {
  console.log(`braino-fetch-assets — find and download named assets into one folder

  --out <dir>     where to put them   (default: a new folder named for the request)
  --topic <name>  name that folder     (default: taken from what you asked for)
  --kind <k>      any | logo | photo   (default: any)
  --limit <n>     candidates per name  (default: 1)

Takes names to search for, or URLs to download directly, or both.

  node scripts/braino-fetch-assets.mjs LinkedIn OpenAI ZoomInfo
  node scripts/braino-fetch-assets.mjs --out public/logos LinkedIn OpenAI
  node scripts/braino-fetch-assets.mjs --topic "moodboard" https://ex.com/a.png "kyoto in autumn"`);
}

/** "Apollo.io" and "Google Reviews" both have to become safe, guessable files. */
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40) || 'asset';

/* `"Apollo.io sales software|apollo"` searches the long, unambiguous name and
 * saves the short one. Brand names collide constantly — a bare "Apollo" is a
 * Greek god, a spacecraft and a GraphQL company before it is a sales tool — and
 * no ranking heuristic can guess which one a deck meant. */
function splitAsk(raw) {
  const [query, as] = String(raw).split('|');
  const q = query.trim();
  if (as) return { query: q, name: as.trim() };
  // A URL's own basename is a better filename than the slugged URL, which comes
  // out as httpsuploadwikimediaorg... and tells nobody anything.
  if (/^https?:\/\//i.test(q)) {
    try {
      const base = decodeURIComponent(new URL(q).pathname.split('/').filter(Boolean).pop() || '');
      const stem = base.replace(/\.[a-z0-9]{1,8}$/i, '');
      if (stem) return { query: q, name: stem };
    } catch { /* fall through to the slugged URL */ }
  }
  return { query: q, name: q };
}

/* ── source 0: the user gave us the address ───────────────────────────────
   If it is a URL there is nothing to find, so no search runs and no ranking
   heuristic gets a chance to be wrong. */

const isUrl = (s) => /^https?:\/\//i.test(String(s).trim());

async function fromUrl(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const mime = (res.headers.get('content-type') || '').split(';')[0].trim();
  const fromPath = path.extname(new URL(url).pathname).replace('.', '');
  const ext = fromPath || (mime.split('/')[1] || 'bin').replace('svg+xml', 'svg');
  return {
    source: 'url', ext, licence: 'as provided by the source', credit: url,
    pageUrl: url, buffer: Buffer.from(await res.arrayBuffer()),
  };
}

/* ── source 1: simple-icons, when the brand is in it ──────────────────────── */

async function fromSimpleIcons(name) {
  let si;
  try { si = await import('simple-icons'); } catch { return null; }
  const want = slug(name);
  const icons = Object.values(si.default ?? si).filter((i) => i && i.title && i.path);
  const hit = icons.find((i) => slug(i.title) === want);
  if (!hit) return null;
  return {
    source: 'simple-icons',
    ext: 'svg',
    licence: 'CC0 1.0',
    credit: hit.title,
    body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>${hit.title}</title><path fill="#${hit.hex}" d="${hit.path}"/></svg>`,
  };
}

/* ── source 2: Wikimedia Commons ──────────────────────────────────────────── */

async function fromCommons(name, kind) {
  const q = kind === 'photo' ? name : `${name} logo`;
  const filter = kind === 'photo' ? '' : ' filetype:svg';
  const url = 'https://commons.wikimedia.org/w/api.php'
    + '?action=query&format=json&origin=*&generator=search'
    + `&gsrsearch=${encodeURIComponent(q + filter)}&gsrlimit=8&gsrnamespace=6`
    + '&prop=imageinfo&iiprop=url|mime|size|extmetadata';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const pages = Object.values((await res.json())?.query?.pages || {});
  if (!pages.length) return null;

  // Prefer a vector, then the plainest title — "LinkedIn Logo 2013.svg" beats
  // "LinkedIn Logo (with ®).svg" for a slide, and both beat an unrelated file
  // that merely matched the word.
  const wanted = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
  const scored = pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii?.url) return null;
      const title = String(p.title).replace(/^File:/, '');
      const bare = title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!bare.includes(wanted)) return null;        // reject "close enough"
      let score = 0;
      if (ii.mime === 'image/svg+xml') score += 100;
      score -= title.length / 10;
      if (/\(|\)|®|™/.test(title)) score -= 6;
      return { p, ii, title, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;

  const best = scored[0];
  const bin = await fetch(best.ii.url, { headers: { 'User-Agent': UA } });
  if (!bin.ok) return null;
  const meta = best.p.imageinfo[0].extmetadata || {};
  return {
    source: 'wikimedia',
    ext: (best.ii.mime === 'image/svg+xml' ? 'svg' : path.extname(best.ii.url).replace('.', '') || 'png'),
    licence: String(meta.LicenseShortName?.value || 'see Commons page').replace(/<[^>]+>/g, ''),
    credit: best.title,
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(best.p.title)}`,
    buffer: Buffer.from(await bin.arrayBuffer()),
  };
}

/* ── source 3: Openverse, for photos rather than marks ────────────────────── */

async function fromOpenverse(name) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(name)}&page_size=5&license_type=all-cc`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const hit = (await res.json())?.results?.[0];
  if (!hit?.url) return null;
  const bin = await fetch(hit.url, { headers: { 'User-Agent': UA } });
  if (!bin.ok) return null;
  return {
    source: 'openverse',
    ext: (hit.filetype || path.extname(hit.url).replace('.', '') || 'jpg'),
    licence: `${hit.license || 'cc'} ${hit.license_version || ''}`.trim(),
    credit: hit.creator || hit.title || name,
    pageUrl: hit.foreign_landing_url,
    buffer: Buffer.from(await bin.arrayBuffer()),
  };
}

/* ── run ──────────────────────────────────────────────────────────────────── */

async function fetchOne(name, kind) {
  if (isUrl(name)) return fromUrl(name);
  // Openverse is deliberately NOT in the logo chain. It is a CC *photo*
  // library, so asking it for "Apollo.io" returns a photograph of something
  // called Apollo and saves it as your logo. Reporting a miss is correct; the
  // whole point of this tool is that it does not substitute.
  const chain = kind === 'photo'
    ? [fromOpenverse, (n) => fromCommons(n, 'photo')]
    : kind === 'any'
      ? [fromSimpleIcons, (n) => fromCommons(n, 'logo'), fromOpenverse]
      : [fromSimpleIcons, (n) => fromCommons(n, 'logo')];
  for (const step of chain) {
    try {
      const hit = await step(name, kind);
      if (hit) return hit;
    } catch { /* try the next source rather than failing the whole run */ }
  }
  return null;
}

const { names, out, kind, topic, limit } = parseArgs(process.argv.slice(2));
if (!names.length) { usage(); process.exit(1); }

/* ── where it lands ────────────────────────────────────────────────────────
   "Download this for me" should never end with files scattered in a home
   directory. With no --out, Braino names a folder after what was asked for and
   puts everything inside it. */
const FAMILY = {
  images: ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'heic', 'ico', 'bmp', 'tiff'],
  video: ['mp4', 'mov', 'webm', 'mkv', 'avi'],
  audio: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'],
  docs: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'md'],
};
const familyOf = (ext) =>
  Object.entries(FAMILY).find(([, list]) => list.includes(String(ext).toLowerCase()))?.[0] || 'other';

function folderName() {
  if (topic) return slug(topic).slice(0, 40) || 'assets';
  const first = splitAsk(names[0]).name;
  const label = isUrl(first) ? 'downloads' : first;
  return names.length > 1
    ? `${slug(label)}-and-${names.length - 1}-more`.slice(0, 48)
    : slug(label);
}

const root = out || path.join(os.homedir(), 'Downloads', 'Braino', folderName());
fs.mkdirSync(root, { recursive: true });
const got = [];
const missed = [];

for (const raw of names) {
  const { query, name } = splitAsk(raw);
  const hit = await fetchOne(query, kind);
  if (!hit) { missed.push(name); console.log(`  ✗ ${name}`); continue; }
  const file = path.join(root, `${slug(name)}.${hit.ext}`);
  fs.writeFileSync(file, hit.buffer ?? Buffer.from(hit.body, 'utf8'));
  hit.family = familyOf(hit.ext);
  got.push({ name, query, file, ...hit, buffer: undefined, body: undefined });
  console.log(`  ✓ ${name.padEnd(16)} ${hit.source.padEnd(13)} ${path.basename(file)}`);
}

// A folder of logos with no record of where they came from is a licensing
// problem waiting to happen, so the manifest ships next to the files.
// Sort into subfolders only when the haul is actually mixed. Six logos do not
// need an images/ folder; six logos plus a PDF and a video do.
const families = [...new Set(got.map((g) => g.family))];
if (families.length > 1) {
  for (const g of got) {
    const dir = path.join(root, g.family);
    fs.mkdirSync(dir, { recursive: true });
    const moved = path.join(dir, path.basename(g.file));
    fs.renameSync(g.file, moved);
    g.file = moved;
  }
  console.log(`\n  sorted into ${families.join(', ')}`);
}

if (got.length) {
  fs.writeFileSync(path.join(root, 'SOURCES.json'),
    JSON.stringify({ fetchedFor: names, kind, folder: root, assets: got }, null, 2) + '\n');
}

console.log(`\n${got.length} saved to ${root}${missed.length ? ` · ${missed.length} not found: ${missed.join(', ')}` : ''}`);
if (missed.length) console.log('Not found means not found — nothing was substituted. Supply those by hand.');
process.exit(0);
