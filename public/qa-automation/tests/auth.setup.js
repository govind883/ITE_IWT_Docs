const { test: setup } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const loginConfig = require('../login.config');

setup.setTimeout(60000); // give the login flow up to 60s total

const authFile = path.join(__dirname, '..', 'playwright', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  if (!loginConfig.loginRequired) {
    console.log('loginRequired is false in login.config.js - skipping login.');
    return;
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  console.log(`Logging in at ${loginConfig.loginUrl} ...`);
  await page.goto(loginConfig.loginUrl);

  await page.locator(loginConfig.usernameSelector).first().fill(loginConfig.username);
  await page.locator(loginConfig.passwordSelector).first().fill(loginConfig.password);

  // Wait for the actual login API response instead of guessing from the URL/UI -
  // this is what was unreliable before (the login API call can take a while).
  const [authResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/authenticate') || res.url().toLowerCase().includes('login'), { timeout: 30000 }),
    page.locator(loginConfig.submitSelector).first().click(),
  ]);

  console.log(`Login API responded with status ${authResponse.status()}`);
  if (!authResponse.ok()) {
    throw new Error(`Login API returned status ${authResponse.status()} - check credentials in login.config.js`);
  }

  // Give the app a few seconds to finish loading post-login data (menus, config, etc.)
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Always save a debug screenshot so we can visually confirm whether login actually worked
  const debugShot = path.join(__dirname, '..', 'login-debug.png');
  await page.screenshot({ path: debugShot, fullPage: true });
  console.log(`Debug screenshot saved to ${debugShot} - open it to confirm login actually worked.`);

  const currentUrl = page.url();
  const passwordFieldStillThere = await page.locator(loginConfig.passwordSelector).first().isVisible().catch(() => false);

  if (currentUrl.toLowerCase().includes(loginConfig.loginPageUrlMarker) || passwordFieldStillThere) {
    throw new Error(
      `Login looks like it FAILED - still on ${currentUrl} (password field visible: ${passwordFieldStillThere}). Check login-debug.png, and check login.config.js selectors/credentials.`
    );
  }

  console.log(`Login successful, landed on ${currentUrl}`);
  await page.context().storageState({ path: authFile });
});
