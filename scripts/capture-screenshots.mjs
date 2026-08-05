/**
 * GymRM Screenshot Capture Script
 * Captures screenshots of all key pages for each role and saves to docs/screenshots/
 * Run: node scripts/capture-screenshots.mjs
 */
import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'https://flowforcerm.com';
const OUT_DIR = path.resolve('docs/screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const ACCOUNTS = {
  admin:  { email: 'admin@mygym.com',                password: 'admin123' },
  staff:  { email: 'staff@mygym.com',                password: 'staff123' },
  member: { email: 'snaken123@gmail.com',             password: 'Ss771017_01' },
  store:  { email: 'store@flowforcerm.com',         password: 'Store2024' },
  kiosk:  { email: 'kiosk@flowforcerm.com',         password: 'Kiosk123' },
};

async function ss(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${name}.png`);
}

async function login(page, role) {
  const { email, password } = ACCOUNTS[role];
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  console.log(`  Logged in as ${role}`);
}

async function logout(page) {
  // Navigate to login to force session clear
  await page.goto(`${BASE_URL}/api/auth/signout`, { waitUntil: 'networkidle' });
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
}

async function waitAndSS(page, url, name, waitFor) {
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 20000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  await ss(page, name);
}

const browser = await chromium.launch({ headless: true });

// ── Login page ─────────────────────────────────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await ss(page, '00-login');
  await page.close();
}

// ── ADMIN role ─────────────────────────────────────────────────────────────
{
  console.log('\n── Admin screenshots ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'admin');

  await waitAndSS(page, '/dashboard', '01-admin-dashboard', '[class*="dashboard"]');
  await waitAndSS(page, '/admin/members', '02-admin-athletes-list', 'table, [class*="athlete"]');

  // Member detail — find first member
  await page.goto(`${BASE_URL}/admin/members`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const firstMemberLink = await page.$('a[href*="/admin/members/"]');
  if (firstMemberLink) {
    await firstMemberLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await ss(page, '03-admin-member-detail');
  }

  await waitAndSS(page, '/admin/subscriptions', '04-admin-subscriptions', 'table, [class*="subscription"]');
  await waitAndSS(page, '/admin/schedule', '05-admin-schedule', '[class*="calendar"], [class*="schedule"]');
  await waitAndSS(page, '/checkin', '06-admin-checkin', 'input, [class*="checkin"]');
  await waitAndSS(page, '/admin/memberships', '07-admin-memberships', '[class*="service"], h1, h2');
  await waitAndSS(page, '/admin/reports', '08-admin-reports', '[class*="report"], h1, h2');
  await waitAndSS(page, '/admin/store', '09-admin-store', '[class*="store"], [class*="product"]');
  await waitAndSS(page, '/admin/inventory', '10-admin-inventory', 'table, [class*="inventory"]');
  await waitAndSS(page, '/admin/employees', '11-admin-employees', 'table, [class*="employee"]');
  await waitAndSS(page, '/admin/communications', '12-admin-communications', '[class*="communication"], h1, h2');
  await waitAndSS(page, '/admin/logs', '13-admin-activity-logs', 'table, [class*="log"]');
  await waitAndSS(page, '/admin/settings', '14-admin-settings', '[class*="setting"], h1, h2');
  await waitAndSS(page, '/admin/web-integration', '15-admin-web-integration', '[class*="integration"], h1, h2');

  await logout(page);
  await page.close();
}

// ── STAFF role ─────────────────────────────────────────────────────────────
{
  console.log('\n── Staff screenshots ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'staff');

  await waitAndSS(page, '/dashboard', '16-staff-dashboard', '[class*="dashboard"]');
  await waitAndSS(page, '/checkin', '17-staff-checkin', 'input, [class*="checkin"]');

  await logout(page);
  await page.close();
}

// ── STORE role ──────────────────────────────────────────────────────────────
{
  console.log('\n── Store screenshots ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'store');
  await page.waitForTimeout(1200);
  await ss(page, '18-store-pos');
  await logout(page);
  await page.close();
}

// ── KIOSK role ──────────────────────────────────────────────────────────────
{
  console.log('\n── Kiosk screenshots ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  try {
    const { email, password } = ACCOUNTS.kiosk;
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await ss(page, '19-kiosk-checkin');
  } catch (e) {
    console.log('  Kiosk login skipped:', e.message.split('\n')[0]);
  }
  await page.close();
}

// ── MEMBER role ─────────────────────────────────────────────────────────────
{
  console.log('\n── Member screenshots ──');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'member');

  await page.waitForTimeout(1000);
  await ss(page, '20-member-dashboard');
  await waitAndSS(page, '/athlete-id', '21-member-athlete-id', '[class*="qr"], [class*="athlete"]');
  await waitAndSS(page, '/schedule', '22-member-schedule', '[class*="schedule"], [class*="calendar"]');
  await waitAndSS(page, '/billing', '23-member-billing', '[class*="billing"], [class*="subscription"]');

  await page.close();
}

await browser.close();
console.log(`\n✅ All screenshots saved to ${OUT_DIR}`);
