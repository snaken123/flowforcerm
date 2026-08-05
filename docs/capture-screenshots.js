/**
 * NorthSouth GymRM – Screenshot capture script
 * Uses system Chrome with existing user profile (has Vercel auth cookies).
 * Run: node docs/capture-screenshots.js
 */

const { chromium } = require('playwright');
const path = require('path');
const os = require('os');

const BASE = 'http://localhost:3000';
const OUT  = path.join(__dirname, 'screenshots');

const CREDS = {
  admin: { email: 'admin@mygym.com',         password: 'admin123'  },
  coach: { email: 'coach@northsouth.com.ph', password: 'Coach2024' },
};

async function login(page, creds) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('#password', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.fill('#email', creds.email);
  await page.fill('#password', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(800);
}

async function shot(page, filename) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, filename), fullPage: false });
  console.log(`  ✓ ${filename}`);
}

async function run() {
  console.log('\n📸 Desktop screenshots (1280×800)...');
  const browser = await chromium.launch({ headless: true });
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const page = await desktopCtx.newPage();

  // Login page (before login)
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('button[type="submit"]');
  await shot(page, '01-login-desktop.png');

  // Admin pages
  await login(page, CREDS.admin);
  await shot(page, '02-admin-dashboard.png');

  await page.goto(`${BASE}/admin/members`);
  await page.waitForTimeout(1500);
  await shot(page, '03-admin-athletes.png');

  // Try to open first athlete profile
  try {
    const viewBtn = page.locator('text=View').first();
    await viewBtn.click({ timeout: 3000 });
    await page.waitForTimeout(1200);
    await shot(page, '03b-athlete-profile.png');
    await page.goBack();
    await page.waitForTimeout(800);
  } catch { console.log('  ⚠ No View button found'); }

  await page.goto(`${BASE}/admin/schedule`);
  await page.waitForTimeout(1500);
  try { await page.click('button:has-text("Week")', { timeout: 3000 }); await page.waitForTimeout(800); } catch {}
  await shot(page, '04-admin-schedule.png');

  await page.goto(`${BASE}/admin/reports`);
  await page.waitForTimeout(1800);
  await shot(page, '05-admin-reports.png');

  await page.goto(`${BASE}/admin/services`);
  await page.waitForTimeout(1200);
  await shot(page, '06-admin-memberships.png');

  await page.goto(`${BASE}/admin/settings`);
  await page.waitForTimeout(1000);
  await shot(page, '07-admin-settings.png');

  // Coach pages
  await login(page, CREDS.coach);
  await shot(page, '08-coach-dashboard.png');

  await page.goto(`${BASE}/admin/schedule`);
  await page.waitForTimeout(1500);
  try { await page.click('button:has-text("Week")', { timeout: 3000 }); await page.waitForTimeout(800); } catch {}
  await shot(page, '08b-coach-schedule.png');

  // Kiosk (as admin)
  await login(page, CREDS.admin);
  await page.goto(`${BASE}/kiosk`);
  await page.waitForTimeout(1500);
  await shot(page, '09-kiosk-desktop.png');

  await desktopCtx.close();

  // ── MOBILE ──────────────────────────────────────────
  console.log('\n📱 Mobile screenshots (390×844)...');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const mPage = await mobileCtx.newPage();

  await mPage.goto(`${BASE}/login`);
  await mPage.waitForSelector('button[type="submit"]');
  await shot(mPage, '01-login-mobile.png');

  await login(mPage, CREDS.admin);
  await shot(mPage, '02-admin-dashboard-mobile.png');

  await mPage.goto(`${BASE}/admin/members`);
  await mPage.waitForTimeout(1500);
  await shot(mPage, '03-admin-athletes-mobile.png');

  await mPage.goto(`${BASE}/admin/schedule`);
  await mPage.waitForTimeout(1500);
  await shot(mPage, '04-admin-schedule-mobile.png');

  await login(mPage, CREDS.coach);
  await shot(mPage, '08-coach-dashboard-mobile.png');

  await mobileCtx.close();
  await browser.close();

  console.log('\n✅ Done! Screenshots saved to docs/screenshots/\n');
}

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
