/**
 * export-presentation.mjs
 * Exports docs/presentation.html → docs/GymRM-Presentation.pdf + .pptx
 *
 * Usage: node scripts/export-presentation.mjs
 */

import { chromium } from '@playwright/test';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SRC_HTML = path.join(ROOT, 'docs', 'presentation.html');
const SLIDES_DIR = path.join(ROOT, 'docs', 'slides');
const OUT_PDF = path.join(ROOT, 'docs', 'GymRM-Presentation-v2.pdf');
const OUT_PPTX = path.join(ROOT, 'docs', 'GymRM-Presentation-v2.pptx');

// 16:9 — matches most projectors and screens
const SLIDE_W = 1280;
const SLIDE_H = 720;

// TOTAL is determined from the live DOM after page load (see below)

fs.mkdirSync(SLIDES_DIR, { recursive: true });

// ── Step 1: Screenshot every slide ─────────────────────────────────────────
console.log('📸  Capturing slides...');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: SLIDE_W, height: SLIDE_H });

const fileUrl = 'file:///' + SRC_HTML.replace(/\\/g, '/');
await page.goto(fileUrl, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Count actual slide elements from the DOM (.slide matches only the slide containers)
const TOTAL = await page.evaluate(() => document.querySelectorAll('.slide').length);
console.log(`Found ${TOTAL} slides.\n`);

// Inject export-mode CSS: hide nav + scroll chrome, re-center content
await page.addStyleTag({ content: `
  .nav-bar, .scroll-hint { display: none !important; }
  .slide {
    overflow: hidden !important;
    padding: 36px 52px !important;
    justify-content: center !important;
  }
` });

const slidePaths = [];
for (let i = 0; i < TOTAL; i++) {
  await page.evaluate((n) => { if (typeof goTo === 'function') goTo(n); }, i);
  await page.waitForTimeout(600);

  const imgPath = path.join(SLIDES_DIR, `slide-${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({ path: imgPath, clip: { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H } });
  slidePaths.push(imgPath);
  console.log(`  ✓ Slide ${i + 1}/${TOTAL}`);
}

await browser.close();
console.log();

// ── Step 2: Build PPTX ──────────────────────────────────────────────────────
console.log('📊  Building PPTX...');
const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');
const pptx = new PptxGenJS();

// Standard widescreen 16:9 (inches)
pptx.defineLayout({ name: 'WIDESCREEN', width: 13.33, height: 7.5 });
pptx.layout = 'WIDESCREEN';
pptx.title = 'FlowForceRM GymRM – Product Overview';
pptx.subject = 'GymRM v3.0';
pptx.author = 'FlowForceRM';

for (let i = 0; i < slidePaths.length; i++) {
  const imgData = fs.readFileSync(slidePaths[i]).toString('base64');
  const slide = pptx.addSlide();
  slide.addImage({
    data: `image/png;base64,${imgData}`,
    x: 0, y: 0, w: '100%', h: '100%',
  });
}

await pptx.writeFile({ fileName: OUT_PPTX });
const pptxSizeKB = Math.round(fs.statSync(OUT_PPTX).size / 1024);
console.log(`  ✓ ${path.basename(OUT_PPTX)} (${pptxSizeKB} KB)\n`);

// ── Step 3: Build PDF ───────────────────────────────────────────────────────
console.log('📄  Building PDF...');

// Build a print-optimised HTML with all slide images, one per page
const pages = slidePaths.map((p) => {
  const b64 = fs.readFileSync(p).toString('base64');
  return `<div class="page"><img src="data:image/png;base64,${b64}" width="${SLIDE_W}" height="${SLIDE_H}"></div>`;
}).join('\n');

const printHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: ${SLIDE_W}px ${SLIDE_H}px; margin: 0; }
  html, body { width: ${SLIDE_W}px; background: #000; }
  .page {
    width: ${SLIDE_W}px;
    height: ${SLIDE_H}px;
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: avoid; }
  .page img { width: ${SLIDE_W}px; height: ${SLIDE_H}px; display: block; }
</style>
</head>
<body>${pages}</body>
</html>`;

// Write temp file (data URIs make page.setContent slow for 20 images)
const tmpPath = path.join(ROOT, 'docs', '_tmp_print.html');
fs.writeFileSync(tmpPath, printHtml, 'utf8');

const pdfBrowser = await chromium.launch({ headless: true });
const pdfPage = await pdfBrowser.newPage();
await pdfPage.goto('file:///' + tmpPath.replace(/\\/g, '/'), { waitUntil: 'networkidle', timeout: 60000 });
await pdfPage.waitForTimeout(500);

await pdfPage.pdf({
  path: OUT_PDF,
  width: `${SLIDE_W}px`,
  height: `${SLIDE_H}px`,
  printBackground: true,
  pageRanges: '',
});
await pdfBrowser.close();

fs.unlinkSync(tmpPath);

const pdfSizeKB = Math.round(fs.statSync(OUT_PDF).size / 1024);
console.log(`  ✓ ${path.basename(OUT_PDF)} (${pdfSizeKB} KB)\n`);

console.log('✅  Export complete!');
console.log(`   PPTX → ${OUT_PPTX}`);
console.log(`   PDF  → ${OUT_PDF}`);
