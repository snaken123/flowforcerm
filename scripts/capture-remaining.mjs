import { chromium } from '@playwright/test';
const BASE_URL = 'https://flowforcerm.com';
const browser = await chromium.launch({ headless: true });

async function ss(page, name) {
  await page.screenshot({ path: `docs/screenshots/${name}.png` });
  console.log(`  ✓ ${name}.png`);
}

// Kiosk
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE_URL + '/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'kiosk@flowforcerm.com');
  await page.fill('input[type="password"]', 'Kiosk123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  console.log('  kiosk url:', page.url());
  await ss(page, '19-kiosk-checkin');
  await page.close();
}

// Member
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE_URL + '/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'snaken123@gmail.com');
  await page.fill('input[type="password"]', 'Ss771017_01');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log('  member url:', page.url());
  await ss(page, '20-member-dashboard');

  for (const [path, name] of [
    ['/athlete-id', '21-member-athlete-id'],
    ['/schedule',   '22-member-schedule'],
    ['/billing',    '23-member-billing'],
  ]) {
    await page.goto(BASE_URL + path, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await ss(page, name);
  }
  await page.close();
}

await browser.close();
console.log('\n✅ Done');
