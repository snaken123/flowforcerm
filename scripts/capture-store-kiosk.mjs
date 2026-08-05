import { chromium } from '@playwright/test';
import fs from 'fs';
const BASE = 'https://flowforcerm.com';
const browser = await chromium.launch({ headless: true });

async function loginTyped(page, email, password) {
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  // Use dispatchEvent to properly trigger React state
  await page.focus('input[type="email"]');
  await page.keyboard.type(email);
  await page.focus('input[type="password"]');
  await page.keyboard.type(password);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4000);
  console.log('  landed:', page.url());
}

// Store
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginTyped(page, 'store@flowforcerm.com', 'Store2024');
  await page.screenshot({ path: 'docs/screenshots/18-store-pos.png', fullPage: false });
  console.log('  ✓ 18-store-pos.png');
  // Also capture inventory tab
  const invTab = await page.$('text=Inventory');
  if (invTab) {
    await invTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'docs/screenshots/10-admin-inventory.png', fullPage: false });
    console.log('  ✓ 10-admin-inventory.png');
  }
  // Sales report tab
  const salesTab = await page.$('text=Sales Report');
  if (salesTab) {
    await salesTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'docs/screenshots/08b-store-sales-report.png', fullPage: false });
    console.log('  ✓ 08b-store-sales-report.png');
  }
  await page.close();
}

// Kiosk — navigate directly to /kiosk
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginTyped(page, 'kiosk@flowforcerm.com', 'Kiosk123');
  await page.screenshot({ path: 'docs/screenshots/19-kiosk-checkin.png', fullPage: false });
  console.log('  ✓ 19-kiosk-checkin.png  url:', page.url());
  await page.close();
}

// Admin: capture the shop page too for completeness
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginTyped(page, 'admin@mygym.com', 'admin123');
  await page.goto(BASE + '/admin/shop', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/screenshots/09-admin-store.png', fullPage: false });
  console.log('  ✓ 09-admin-store.png');

  // Also member detail with subscriptions visible
  await page.goto(BASE + '/admin/members', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);
  // Click into Stephen Salazar who has 4 active subscriptions
  const link = await page.$('a[href*="/admin/members/"]');
  if (link) {
    await link.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'docs/screenshots/03-admin-member-detail.png', fullPage: false });
    console.log('  ✓ 03-admin-member-detail.png (refreshed)');
  }
  await page.close();
}

await browser.close();
console.log('\n✅ Done');
