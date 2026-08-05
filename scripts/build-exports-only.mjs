import { chromium } from '@playwright/test';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const ROOT = 'C:/Code/gym-crm';
const SLIDES_DIR = ROOT + '/docs/slides';
const OUT_PPTX = ROOT + '/docs/GymRM-Presentation-v3.pptx';
const OUT_PDF  = ROOT + '/docs/GymRM-Presentation-v3.pdf';
const SLIDE_W = 1280, SLIDE_H = 720;

const slidePaths = Array.from({ length: 20 }, (_, i) =>
  path.join(SLIDES_DIR, 'slide-' + String(i + 1).padStart(2, '0') + '.png')
);

console.log('📊  Building PPTX...');
const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'WIDESCREEN', width: 13.33, height: 7.5 });
pptx.layout = 'WIDESCREEN';
pptx.title = 'NorthSouth GymRM – Product Overview';
for (const p of slidePaths) {
  const imgData = fs.readFileSync(p).toString('base64');
  const slide = pptx.addSlide();
  slide.addImage({ data: 'image/png;base64,' + imgData, x: 0, y: 0, w: '100%', h: '100%' });
}
await pptx.writeFile({ fileName: OUT_PPTX });
console.log('  ✓', path.basename(OUT_PPTX));

console.log('📄  Building PDF...');
const pages = slidePaths.map(p => {
  const b64 = fs.readFileSync(p).toString('base64');
  return `<div class="page"><img src="data:image/png;base64,${b64}" width="${SLIDE_W}" height="${SLIDE_H}"></div>`;
}).join('\n');

const printHtml = `<!DOCTYPE html><html><head><style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:${SLIDE_W}px ${SLIDE_H}px;margin:0}
html,body{width:${SLIDE_W}px;background:#000}
.page{width:${SLIDE_W}px;height:${SLIDE_H}px;page-break-after:always;overflow:hidden}
.page:last-child{page-break-after:avoid}
.page img{width:${SLIDE_W}px;height:${SLIDE_H}px;display:block}
</style></head><body>${pages}</body></html>`;

const tmpPath = ROOT + '/docs/_tmp_print.html';
fs.writeFileSync(tmpPath, printHtml, 'utf8');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('file:///' + tmpPath.replace(/\\/g, '/'), { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(500);
await page.pdf({ path: OUT_PDF, width: `${SLIDE_W}px`, height: `${SLIDE_H}px`, printBackground: true });
await browser.close();
fs.unlinkSync(tmpPath);
console.log('  ✓', path.basename(OUT_PDF));
console.log('✅  Done.');
