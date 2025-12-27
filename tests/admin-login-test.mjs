#!/usr/bin/env node
/**
 * Admin Portal Login Test
 * Verifies web login functionality using Puppeteer
 */

import puppeteer from 'puppeteer';

const ADMIN_PORTAL_URL = 'https://admin.afterdarksys.com/login';

const TEST_ACCOUNTS = [
  { email: 'admin@dnsscience.io', password: 'AfterCloudAdmin@420' },
  { email: 'rjc@dnsscience.io', password: 'RyCat@7704' },
  { email: 'rams@dnsscience.io', password: 'ButtCheeks@305' },
];

async function testLogin(browser, { email, password }) {
  const page = await browser.newPage();

  try {
    console.log(`\n🔐 Testing login for: ${email}`);

    // Navigate to login page
    await page.goto(ADMIN_PORTAL_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('  ✓ Loaded login page');

    // Take screenshot before login
    await page.screenshot({ path: `/tmp/login-before-${email.replace('@', '_')}.png` });

    // Wait for and fill email field
    await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 10000 });
    const emailInput = await page.$('input[type="email"], input[name="email"], #email');
    await emailInput.type(email);
    console.log('  ✓ Entered email');

    // Fill password field
    await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 5000 });
    const passwordInput = await page.$('input[type="password"], input[name="password"], #password');
    await passwordInput.type(password);
    console.log('  ✓ Entered password');

    // Click login button
    const loginButton = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    if (loginButton) {
      await loginButton.click();
      console.log('  ✓ Clicked login button');
    } else {
      // Try pressing Enter as fallback
      await passwordInput.press('Enter');
      console.log('  ✓ Pressed Enter to submit');
    }

    // Wait for navigation or response
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
      console.log('  ⚠ No navigation detected, checking page state...');
    });

    // Check current URL
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    // Take screenshot after login attempt
    await page.screenshot({ path: `/tmp/login-after-${email.replace('@', '_')}.png` });

    // Check for success indicators
    const pageContent = await page.content();
    const isLoginPage = currentUrl.includes('/login');
    const hasErrorMessage = pageContent.includes('error') || pageContent.includes('Invalid') || pageContent.includes('incorrect');
    const hasDashboard = pageContent.includes('Dashboard') || pageContent.includes('dashboard') || currentUrl.includes('/dashboard');

    if (!isLoginPage || hasDashboard) {
      console.log(`  ✅ SUCCESS: Login worked for ${email}`);
      return { email, success: true, redirectUrl: currentUrl };
    } else if (hasErrorMessage) {
      console.log(`  ❌ FAILED: Login error for ${email}`);
      return { email, success: false, error: 'Error message displayed' };
    } else {
      console.log(`  ⚠ UNCLEAR: Still on login page for ${email}`);
      return { email, success: false, error: 'Still on login page' };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    await page.screenshot({ path: `/tmp/login-error-${email.replace('@', '_')}.png` });
    return { email, success: false, error: error.message };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Admin Portal Login Verification Test              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${ADMIN_PORTAL_URL}`);
  console.log(`Testing ${TEST_ACCOUNTS.length} accounts...\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  for (const account of TEST_ACCOUNTS) {
    const result = await testLogin(browser, account);
    results.push(result);
  }

  await browser.close();

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(r => {
    const status = r.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${r.email}`);
    if (r.error) console.log(`       Error: ${r.error}`);
    if (r.redirectUrl) console.log(`       Redirected to: ${r.redirectUrl}`);
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  console.log('\nScreenshots saved to /tmp/login-*.png');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
