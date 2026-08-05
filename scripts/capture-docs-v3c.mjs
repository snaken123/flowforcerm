/**
 * Fix: recapture 3 blank admin pages + kiosk
 */
import { chromium } from '@playwright/test';

const BASE = 'https://flowforcerm.com';
const OUT = 'docs/screenshots';

const browser = await chromium.launch({ headless: true });

async function ss(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`  ✓ ${name}.png`);
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

// ─── Fix blank admin pages ────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAdmin(page);

  // Dashboard — wait for stats cards to render
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // Wait for any number to appear (stat cards)
  await page.waitForSelector('[class*="card"], [class*="stat"], h2, h3', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await ss(page, 'v3-01-admin-dashboard');

  // Reports — wait for revenue numbers
  await page.goto(BASE + '/admin/revenue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.waitForSelector('table, [class*="card"], h2', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await ss(page, 'v3-06-admin-reports');

  // Activity Logs — wait for table rows
  await page.goto(BASE + '/admin/audit-logs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.waitForSelector('table, [class*="log"], [class*="activity"]', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await ss(page, 'v3-10-admin-activity-logs');

  await page.close();
}

// ─── Kiosk — with correct credentials ────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // Login as kiosk
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]');
  await page.focus('input[type="email"]');
  await page.keyboard.type('kiosk@flowforcerm.com');
  await page.focus('input[type="password"]');
  await page.keyboard.type('Kiosk2024');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  console.log('  kiosk landed:', page.url());

  if (!page.url().includes('/login')) {
    await page.waitForTimeout(1000);
    await ss(page, 'v3-19-kiosk-screen');
  } else {
    // Try public /kiosk route
    await page.goto(BASE + '/kiosk', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('  /kiosk url:', page.url());
    await ss(page, 'v3-19-kiosk-screen');
  }

  await page.close();
}

// ─── Member pages ─────────────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]');
  await page.focus('input[type="email"]');
  await page.keyboard.type('step.salazar@yahoo.com');
  await page.focus('input[type="password"]');
  await page.keyboard.type('Ss771017_01');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  console.log('  member landed:', page.url());

  if (!page.url().includes('/login')) {
    await ss(page, 'v3-21-member-dashboard');

    // Get all nav links
    const navLinks = await page.$$eval('a[href]', els =>
      els.filter(e => e.href.includes(location.hostname))
         .map(e => ({ href: e.href, text: e.textContent?.trim().slice(0, 40) }))
         .filter(e => e.text)
    );
    console.log('  member nav links:', JSON.stringify(navLinks.slice(0, 15)));

    for (const { href, text } of navLinks.slice(0, 10)) {
      if (href.includes('profile')) {
        await page.goto(href, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await ss(page, 'v3-22-member-profile');
      } else if (href.includes('schedule')) {
        await page.goto(href, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await ss(page, 'v3-23-member-schedule');
      } else if (href.includes('athlete') || href.includes('id')) {
        await page.goto(href, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await ss(page, 'v3-24-member-id');
      } else if (href.includes('billing') || href.includes('membership')) {
        await page.goto(href, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await ss(page, 'v3-25-member-billing');
      }
    }
  } else {
    console.log('  ❌ member login failed');
  }
  await page.close();
}

await browser.close();
console.log('\n✅ Done!');
