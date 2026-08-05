import { chromium } from '@playwright/test';
const BASE = 'https://app.northsouth.com.ph';
const browser = await chromium.launch({ headless: true });

async function ss(page, name) {
  await page.screenshot({ path: `docs/screenshots/${name}.png` });
  console.log(`  ✓ ${name}.png  (${page.url()})`);
}

async function go(page, path, name, wait) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20000 });
  if (wait) await page.waitForSelector(wait, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  await ss(page, name);
}

// ── Admin: fix wrong paths ─────────────────────────────────────────────
{
  console.log('\n── Admin (correct paths) ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'admin@mygym.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
  console.log('  logged in');

  await go(page, '/staff/checkin',         '06-admin-checkin',      'input');
  await go(page, '/admin/services',        '07-admin-services',     'h1, h2');
  await go(page, '/admin/classes',         '07b-admin-classes',     'h1, h2');
  await go(page, '/admin/shop',            '09-admin-store',        'h1, [class*="shop"]');
  await page.close();
}

// ── Store ──────────────────────────────────────────────────────────────
{
  console.log('\n── Store ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'store@northsouth.com.ph');
  await page.fill('input[type="password"]', 'Store2024');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log('  store url:', page.url());
  await ss(page, '18-store-pos');
  await page.close();
}

// ── Staff ──────────────────────────────────────────────────────────────
{
  console.log('\n── Staff (correct check-in path) ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'staff@mygym.com');
  await page.fill('input[type="password"]', 'staff123');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
  await go(page, '/staff/checkin', '17-staff-checkin', 'input');
  await page.close();
}

// ── Kiosk ─────────────────────────────────────────────────────────────
{
  console.log('\n── Kiosk ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'kiosk@northsouth.com.ph');
  await page.fill('input[type="password"]', 'Kiosk123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log('  kiosk url:', page.url());
  await ss(page, '19-kiosk-checkin');
  await page.close();
}

await browser.close();
console.log('\n✅ Done');
