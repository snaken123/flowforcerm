import { chromium } from '@playwright/test';
const BASE = 'https://flowforcerm.com';
const OUT = 'docs/screenshots';
const browser = await chromium.launch({ headless: true });

async function ss(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}.png`);
}

async function loginAdmin(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]');
  await page.focus('input[type="email"]');
  await page.keyboard.type('admin@mygym.com');
  await page.focus('input[type="password"]');
  await page.keyboard.type('admin123');
  await page.keyboard.press('Enter');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(2000);
}

const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await loginAdmin(page);

const pages = [
  ['/admin/reports',       'v3-06-admin-reports'],
  ['/admin/logs',          'v3-10-admin-activity-logs'],
  ['/admin/email',         'v3-08b-admin-email'],
  ['/admin/classes',       'v3-05b-admin-classes'],
  ['/admin/subscriptions', 'v3-05c-admin-subscriptions'],
];

for (const [path, name] of pages) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await ss(page, name);
}

await browser.close();
console.log('Done!');
