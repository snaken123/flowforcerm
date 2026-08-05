import { chromium } from '@playwright/test';
const BASE = 'https://app.northsouth.com.ph';
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
console.log('landed:', page.url());

// Dashboard — correct URL is /dashboard
await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await ss(page, 'v3-01-admin-dashboard');

// Reports
await page.goto(BASE + '/admin/revenue', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await ss(page, 'v3-06-admin-reports');

// Activity Logs
await page.goto(BASE + '/admin/audit-logs', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await ss(page, 'v3-10-admin-activity-logs');

// Staff check-in (admin)
await page.goto(BASE + '/staff/checkin', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await ss(page, 'v3-13-staff-checkin');

// Athlete detail — get first member link
await page.goto(BASE + '/admin/members', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const memberLink = await page.$('a[href*="/admin/members/"]:not([href="/admin/members"])');
if (memberLink) {
  await memberLink.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await ss(page, 'v3-03-admin-athlete-detail');
}

await browser.close();
console.log('Done!');
