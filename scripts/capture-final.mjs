import { chromium } from '@playwright/test';
const BASE = 'https://flowforcerm.com';
const browser = await chromium.launch({ headless: true });

async function loginAdmin(page) {
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type="email"]');
  await page.focus('input[type="email"]');
  await page.keyboard.type('admin@mygym.com');
  await page.focus('input[type="password"]');
  await page.keyboard.type('admin123');
  await page.keyboard.press('Enter');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
}

async function ss(page, name) {
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });
  console.log(`  ✓ ${name}.png`);
}

// Capture inventory tab and kiosk page
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAdmin(page);

  // Store → Inventory tab
  await page.goto(BASE + '/admin/shop', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);
  const invTab = await page.$('text=Inventory');
  if (invTab) {
    await invTab.click();
    await page.waitForTimeout(1000);
    await ss(page, '10-admin-inventory');
  }

  // Store → Sales Report tab
  await page.goto(BASE + '/admin/shop', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);
  const salesTab = await page.$('text=Sales Report');
  if (salesTab) {
    await salesTab.click();
    await page.waitForTimeout(1000);
    await ss(page, '10b-admin-sales-report');
  }

  // Kiosk page (public, no login needed)
  await page.goto(BASE + '/kiosk', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1200);
  await ss(page, '19-kiosk-checkin');
  console.log('    kiosk url:', page.url());

  // attendance/kiosk
  await page.goto(BASE + '/attendance/kiosk', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1200);
  await ss(page, '19b-attendance-kiosk');
  console.log('    attendance/kiosk url:', page.url());

  // Member detail with a search to find member with subscriptions
  await page.goto(BASE + '/admin/members', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);
  // Search for stephen who has 4 subscriptions
  const searchBox = await page.$('input[placeholder*="Search"], input[type="search"]');
  if (searchBox) {
    await searchBox.click();
    await searchBox.type('Stephen');
    await page.waitForTimeout(1200);
    await ss(page, '02b-admin-athletes-search');
  }

  await page.close();
}

await browser.close();
console.log('\n✅ Done');
