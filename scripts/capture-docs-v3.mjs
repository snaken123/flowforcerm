/**
 * Full screenshot capture for GymRM documentation v3
 * Covers: Admin, Staff, Coach, Kiosk, Store, Member roles
 */
import { chromium } from '@playwright/test';
import path from 'path';

const BASE = 'https://app.northsouth.com.ph';
const OUT = 'docs/screenshots';

const browser = await chromium.launch({ headless: true });

async function ss(page, name, opts = {}) {
  const { fullPage = false } = opts;
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`  ✓ ${name}.png`);
}

async function login(page, email, password) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="email"]');
  await page.focus('input[type="email"]');
  await page.keyboard.type(email);
  await page.focus('input[type="password"]');
  await page.keyboard.type(password);
  await page.keyboard.press('Enter');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(1500);
}

// ─── LOGIN PAGE ───────────────────────────────────────────────
console.log('\n🔐 Login page...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await ss(page, 'v3-00-login');

  // Filled login form
  await page.focus('input[type="email"]');
  await page.keyboard.type('admin@mygym.com');
  await page.focus('input[type="password"]');
  await page.keyboard.type('admin123');
  await ss(page, 'v3-00b-login-filled');
  await page.close();
}

// ─── ADMIN ROLE ───────────────────────────────────────────────
console.log('\n🛡️  Admin pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'admin@mygym.com', 'admin123');

  // Dashboard
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await ss(page, 'v3-01-admin-dashboard');

  // Athletes list
  await page.goto(BASE + '/admin/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-02-admin-athletes');

  // Athlete search
  const searchBox = await page.$('input[placeholder*="Search"], input[type="search"]');
  if (searchBox) {
    await searchBox.click();
    await searchBox.type('Stephen');
    await page.waitForTimeout(1000);
    await ss(page, 'v3-02b-admin-athletes-search');
    await searchBox.triple_click?.() || await searchBox.click({ clickCount: 3 });
    await searchBox.type('');
    await page.waitForTimeout(500);
  }

  // Athlete detail — click first member with subscriptions
  await page.goto(BASE + '/admin/members', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const firstView = await page.$('a[href*="/admin/members/"]:not([href="/admin/members"])');
  if (firstView) {
    await firstView.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await ss(page, 'v3-03-admin-athlete-detail');
    await page.go_back?.() || await page.goBack();
  }

  // Schedule
  await page.goto(BASE + '/admin/schedule', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await ss(page, 'v3-04-admin-schedule');

  // Services / Memberships
  await page.goto(BASE + '/admin/services', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-05-admin-services');

  // Reports
  await page.goto(BASE + '/admin/revenue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await ss(page, 'v3-06-admin-reports');

  // Store – New Sale tab
  await page.goto(BASE + '/admin/shop', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await ss(page, 'v3-07-admin-store-pos');

  // Store – Inventory tab
  const invTab = await page.$('button:has-text("Inventory"), [role="tab"]:has-text("Inventory")');
  if (invTab) {
    await invTab.click();
    await page.waitForTimeout(800);
    await ss(page, 'v3-07b-admin-store-inventory');
  }

  // Store – Sales Report tab
  await page.goto(BASE + '/admin/shop', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const salesTab = await page.$('button:has-text("Sales Report"), [role="tab"]:has-text("Sales Report")');
  if (salesTab) {
    await salesTab.click();
    await page.waitForTimeout(1000);
    await ss(page, 'v3-07c-admin-store-sales');
  }

  // Communications
  await page.goto(BASE + '/admin/communications', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-08-admin-communications');

  // Employees
  await page.goto(BASE + '/admin/employees', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-09-admin-employees');

  // Activity Logs
  await page.goto(BASE + '/admin/audit-logs', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-10-admin-activity-logs');

  // Settings
  await page.goto(BASE + '/admin/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-11-admin-settings');

  // Web Integration
  await page.goto(BASE + '/admin/web-integration', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-12-admin-web-integration');

  // Staff check-in (admin view)
  await page.goto(BASE + '/staff/checkin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-13-staff-checkin');

  await page.close();
}

// ─── STAFF ROLE ───────────────────────────────────────────────
console.log('\n👤 Staff pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'staff@mygym.com', 'staff123');

  await page.waitForTimeout(1000);
  await ss(page, 'v3-14-staff-dashboard');

  await page.goto(BASE + '/staff/checkin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-15-staff-checkin');

  // Staff schedule view
  await page.goto(BASE + '/admin/schedule', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ss(page, 'v3-16-staff-schedule');

  await page.close();
}

// ─── COACH ROLE ───────────────────────────────────────────────
console.log('\n🥋 Coach pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'coach@northsouth.com.ph', 'Coach2024');
  await page.waitForTimeout(1200);
  console.log('  coach landed:', page.url());
  await ss(page, 'v3-17-coach-dashboard');

  // Coach schedule
  const schedLink = await page.$('a[href*="schedule"]');
  if (schedLink) {
    await schedLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await ss(page, 'v3-18-coach-schedule');
  }

  await page.close();
}

// ─── KIOSK ───────────────────────────────────────────────────
console.log('\n🖥️  Kiosk pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  // Public kiosk page
  await page.goto(BASE + '/kiosk', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('  kiosk url:', page.url());
  await ss(page, 'v3-19-kiosk-screen');

  // Type a member number to show the numpad state
  const numpad4 = await page.$('button:has-text("4")');
  if (numpad4) {
    await numpad4.click();
    await page.waitForTimeout(200);
    const numpad2 = await page.$('button:has-text("2")');
    if (numpad2) { await numpad2.click(); await page.waitForTimeout(200); }
    await ss(page, 'v3-19b-kiosk-entering');
  }

  await page.close();
}

// ─── STORE ROLE ───────────────────────────────────────────────
console.log('\n🛒 Store pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'store@northsouth.com.ph', 'Store2024');
  await page.waitForTimeout(1500);
  console.log('  store landed:', page.url());
  await ss(page, 'v3-20-store-pos');

  // Inventory tab
  const invTab = await page.$('button:has-text("Inventory"), [role="tab"]:has-text("Inventory")');
  if (invTab) {
    await invTab.click();
    await page.waitForTimeout(800);
    await ss(page, 'v3-20b-store-inventory');
  }

  await page.close();
}

// ─── MEMBER ROLE ───────────────────────────────────────────────
console.log('\n🏃 Member pages...');
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page, 'step.salazar@yahoo.com', 'Ss771017_01');
  await page.waitForTimeout(1500);
  console.log('  member landed:', page.url());
  await ss(page, 'v3-21-member-dashboard');

  // Member profile
  const profileLink = await page.$('a[href*="/member/profile"], a[href*="profile"]');
  if (profileLink) {
    await profileLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await ss(page, 'v3-22-member-profile');
  }

  // Member schedule
  const schedLink = await page.$('a[href*="schedule"]');
  if (schedLink) {
    await schedLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await ss(page, 'v3-23-member-schedule');
  }

  // Athlete ID card
  const idLink = await page.$('a[href*="athlete-id"], a[href*="id-card"]');
  if (idLink) {
    await idLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await ss(page, 'v3-24-member-athlete-id');
  }

  // Billing / memberships
  const billingLink = await page.$('a[href*="billing"], a[href*="membership"]');
  if (billingLink) {
    await billingLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await ss(page, 'v3-25-member-billing');
  }

  await page.close();
}

await browser.close();
console.log('\n✅ All screenshots captured!');
