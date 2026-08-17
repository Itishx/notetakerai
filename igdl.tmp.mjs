import { chromium } from '@playwright/test';
const OUT = '/private/tmp/claude-501/-Users-itishpande-Desktop-notely-notetakerai/187bfff6-068b-4d48-ab0a-4cf8e0d2d7fe/scratchpad';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4173/instagraphics', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
// screenshot the on-screen slide for comparison
await p.locator('.ig-social-slide.is-active').screenshot({ path: `${OUT}/ig-onscreen.png` });
const dlp = p.waitForEvent('download', { timeout: 120000 });
await p.locator('.ig-download-all').click();
const dl = await dlp;
await dl.saveAs(`${OUT}/ig.zip`);
console.log('saved zip');
await b.close();
