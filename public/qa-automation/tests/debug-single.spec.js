const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const loginConfig = require('../login.config');

// Only tests ONE screen, with verbose step-by-step screenshots, so we can see
// exactly what happens after login when trying to reach a specific page.
const TEST_URL = '/job'; // <-- change this to whichever screen you want to debug

test('debug single screen after login', async ({ page }) => {
  test.setTimeout(90000);
  const debugDir = path.join(process.cwd(), 'debug-shots');
  fs.mkdirSync(debugDir, { recursive: true });

  // Log every network request/response and console error so we can see EXACTLY
  // what happens when the login button is clicked.
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[BROWSER CONSOLE ERROR] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', (req) => {
    console.log(`[REQUEST FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes(':8082') || url.toLowerCase().includes('login') || url.toLowerCase().includes('auth')) {
      let bodySnippet = '';
      try {
        const body = await res.text();
        bodySnippet = body.slice(0, 300);
      } catch {}
      console.log(`[NETWORK] ${res.status()} ${res.request().method()} ${url}\n          body: ${bodySnippet}`);
    }
  });

  console.log('STEP 1: Going to login page...');
  await page.goto(loginConfig.loginUrl);
  await page.screenshot({ path: path.join(debugDir, '1-login-page.png') });

  console.log('STEP 2: Filling login form...');
  await page.locator(loginConfig.usernameSelector).first().fill(loginConfig.username);
  await page.locator(loginConfig.passwordSelector).first().fill(loginConfig.password);
  await page.screenshot({ path: path.join(debugDir, '2-form-filled.png') });

  console.log('STEP 3: Clicking submit...');
  await page.locator(loginConfig.submitSelector).first().click();

  console.log('Waiting 15 seconds to give the login API plenty of time to respond...');
  await page.waitForTimeout(15000);
  await page.screenshot({ path: path.join(debugDir, '3-after-login.png') });
  console.log(`STEP 3 DONE: URL after login = ${page.url()}`);

  console.log(`STEP 4: Navigating (goto) to ${TEST_URL} ...`);
  await page.goto(`http://localhost:5173${TEST_URL}`, { waitUntil: 'networkidle', timeout: 15000 }).catch((e) => {
    console.log(`goto error: ${e.message}`);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(debugDir, '4-after-goto-target.png') });
  console.log(`STEP 4 DONE: URL after goto(${TEST_URL}) = ${page.url()}`);

  console.log('STEP 5: Trying to click the in-app menu link instead of goto...');
  const link = page.locator(`a[href="${TEST_URL}"], a[href$="${TEST_URL}"]`).first();
  const linkCount = await link.count();
  console.log(`Found ${linkCount} matching link(s) for href containing "${TEST_URL}"`);
  if (linkCount > 0) {
    await link.click({ timeout: 5000 }).catch((e) => console.log(`click error: ${e.message}`));
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(debugDir, '5-after-menu-click.png') });
  console.log(`STEP 5 DONE: URL after menu click = ${page.url()}`);

  console.log('\n=== SUMMARY ===');
  console.log('Check the screenshots in ./debug-shots/ in order (1 to 5) to see exactly where it goes wrong.');
  console.log('debug-shots/1-login-page.png       -> should show the login form (empty)');
  console.log('debug-shots/2-form-filled.png      -> should show login form WITH values filled in');
  console.log('debug-shots/3-after-login.png      -> should show the app AFTER login (not login form)');
  console.log('debug-shots/4-after-goto-target.png-> after navigating directly via URL - does this show the target screen or login page again?');
  console.log('debug-shots/5-after-menu-click.png -> after clicking the actual in-app menu link - does THIS reach the target screen?');
});
