/**
 * Capture remaining screenshots: staff (extra), coach, kiosk, store, member
 */
import { chromium } from '@playwright/test';

const BASE = 'https://app.northsouth.com.ph';
const OUT = 'docs/screenshots';

const browser = await chromium.launch({ headless: true });

async function ss(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`  ✓ ${name}.png`);
}

async function login(page, email, password) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.focus('input[type="email"]');
  await page.keyboard.type(email);
  await page.focus('input[type="password"]');
  await page.keyboard.type(password);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  console.log('  landed:', page.url());
}

// ─── STAFF extra pages ─────────────────────────────────────
console.log('\n👤 Staff extra pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'staff@mygym.com', 'staff123');

  if (!page.url().includes('/login')) {
    await page.goto(BASE + '/staff/checkin', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await ss(page, 'v3-15-staff-checkin');

    await page.goto(BASE + '/admin/schedule', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await ss(page, 'v3-16-staff-schedule');
  } else {
    console.log('  ❌ staff login failed');
  }
  await page.close();
}

// ─── COACH ─────────────────────────────────────────────────
console.log('\n🥋 Coach pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'coach@northsouth.com.ph', 'Coach2024');

  if (!page.url().includes('/login')) {
    await ss(page, 'v3-17-coach-dashboard');

    // Try schedule link
    const schedLink = await page.$('a[href*="schedule"]');
    if (schedLink) {
      await schedLink.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await ss(page, 'v3-18-coach-schedule');
    } else {
      await page.goto(BASE + '/admin/schedule', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
      await ss(page, 'v3-18-coach-schedule');
    }
  } else {
    console.log('  ❌ coach login failed');
  }
  await page.close();
}

// ─── KIOSK (public URL, no login needed) ───────────────────
console.log('\n🖥️  Kiosk...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/kiosk', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  console.log('  url:', page.url());
  await ss(page, 'v3-19-kiosk-screen');
  await page.close();
}

// ─── STORE ─────────────────────────────────────────────────
console.log('\n🛒 Store role...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'store@northsouth.com.ph', 'Store2024');

  if (!page.url().includes('/login')) {
    await ss(page, 'v3-20-store-pos');

    const invTab = await page.$('button:has-text("Inventory"), [data-state] button:has-text("Inventory")');
    if (invTab) {
      await invTab.click();
      await page.waitForTimeout(800);
      await ss(page, 'v3-20b-store-inventory');
    }
  } else {
    console.log('  ❌ store login failed, using admin view');
    await login(page, 'admin@mygym.com', 'admin123');
    await page.goto(BASE + '/admin/shop', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await ss(page, 'v3-20-store-pos');
    const invTab = await page.$('button:has-text("Inventory")');
    if (invTab) {
      await invTab.click();
      await page.waitForTimeout(800);
      await ss(page, 'v3-20b-store-inventory');
    }
  }
  await page.close();
}

// ─── MEMBER ─────────────────────────────────────────────────
console.log('\n🏃 Member pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'step.salazar@yahoo.com', 'Ss771017_01');

  if (!page.url().includes('/login')) {
    await ss(page, 'v3-21-member-dashboard');

    // Try to find navigation links
    const links = await page.$$eval('nav a, aside a, [class*="sidebar"] a', els =>
      els.map(el => ({ href: el.href, text: el.textContent?.trim() }))
    );
    console.log('  member nav links:', JSON.stringify(links.slice(0, 10)));

    // Profile
    const profileLink = await page.$('a[href*="profile"]');
    if (profileLink) {
      await profileLink.click();
      await page.waitForTimeout(1000);
      await ss(page, 'v3-22-member-profile');
      await page.goBack();
    }

    // Schedule
    const schedLink = await page.$('a[href*="schedule"]');
    if (schedLink) {
      await schedLink.click();
      await page.waitForTimeout(1000);
      await ss(page, 'v3-23-member-schedule');
      await page.goBack();
    }

    // Athlete ID
    const idLink = await page.$('a[href*="athlete"], a[href*="id"]');
    if (idLink) {
      await idLink.click();
      await page.waitForTimeout(1000);
      await ss(page, 'v3-24-member-id');
      await page.goBack();
    }
  } else {
    console.log('  ❌ member login failed');
  }
  await page.close();
}

await browser.close();
console.log('\n✅ Done!');
