# Every Page Speaks for Itself

**Type:** Technical
**Platform:** Affective website
**Status:** Live
**Released:** October 2, 2026

## The simple version

When someone shares an Affective link, the preview now says Affective and describes that exact page. Before, every link on the site showed the same old card: "Braino : Your AI Browser Sidekick", written by "SideBrain", tagged "@Lovable". Search engines and AI tools that read a link also get the page's real words now, not an empty page.

## Why it exists

The site is one React app. Until JavaScript runs, every address sends the same blank HTML with one leftover title from the first version of the product. People who paste a link into WhatsApp, X, LinkedIn or an AI chat saw the wrong product. Investors reading the site with an AI tool saw nothing at all.

## How to use it

Nothing to do. Share any main page (home, AffectiveOS, Braino, About, App Store, Early access, Contact, Privacy, Terms) and the preview is right.

When you change a main page's words, refresh the saved copy:

```
npm run build && npx vite preview --port 4719 &
node scripts/seo-snapshot.mjs
```

## Honest limitations

- The baked-in words are a saved copy. If a page's copy changes and nobody runs the snapshot, previews and crawlers keep reading the old words until someone does.
- Only the nine main pages get their own preview. Every other address shows the general Affective card.
- All pages share one preview image, taken from the top of the home page.

## Technical shape

- `index.html` holds the default Affective title, description and share card.
- `scripts/seo-snapshot.mjs` opens each main page in a real browser and saves its headings and paragraphs to `scripts/seo-pages.json`.
- `scripts/seo-pages.mjs` runs after `vite build`. It writes `dist/<page>/index.html` for each main page with its own title, description, address and share card, and puts the saved words inside `#root`. React replaces them as soon as it starts; they only fade in if the app has not loaded after 4 seconds. It also writes `dist/app.html` (a plain shell for every other address) and `dist/sitemap.xml`.
- `vercel.json` sends each main page to its own file and everything else to `app.html`.
- The site's main address is `https://www.affctve.com` (set with `SITE_URL` if it ever changes).

## Product or design decisions

We chose a saved copy over full server rendering. Server rendering would mean rebuilding how the whole site runs two weeks before launch. The saved copy fixes what people actually see, and changes nothing about how the pages work.
