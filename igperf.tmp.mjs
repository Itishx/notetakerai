import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:4173/instagraphics', { waitUntil: 'networkidle' });
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const mod = await import('/assets/' + (performance.getEntriesByType('resource').map(e=>e.name).find(n=>/html-to-image/.test(n))||'').split('/assets/')[1] || '');
  return 'skip';
}).catch(()=> 'skip');
// measure via the page's own bundle: use a dynamic import of the installed module path
const timings = await p.evaluate(async () => {
  const el = document.querySelector('#ig-iomi-boot');
  if (!el) return { error: 'no frame' };
  const rect = el.getBoundingClientRect();
  // html-to-image is bundled; pull it from the same chunk the page already loaded
  const htmlToImage = await import('https://esm.sh/html-to-image@1.11.13');
  const t = [];
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    await htmlToImage.toCanvas(el, { pixelRatio: 1, skipFonts: true, cacheBust: false });
    t.push(Math.round(performance.now() - t0));
  }
  return { natural: [el.offsetWidth, el.offsetHeight], onscreen: [Math.round(rect.width), Math.round(rect.height)], ms: t };
});
console.log(JSON.stringify(timings));
console.log('MediaRecorder mp4 support:', await p.evaluate(() => ({
  mp4avc: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1'),
  mp4: MediaRecorder.isTypeSupported('video/mp4'),
  webm9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
  webcodecs: typeof VideoEncoder !== 'undefined',
})));
await b.close();
