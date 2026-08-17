const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const screenGroups = require('./screens.data');
const loginConfig = require('../login.config');

const FRONTEND = 'http://localhost:5173';
const REPORT_ROOT = path.join(process.cwd(), 'qa-report');
const RESULTS_JSONL_PATH = path.join(REPORT_ROOT, 'results.jsonl');

function appendResult(obj) {
  fs.appendFileSync(RESULTS_JSONL_PATH, JSON.stringify(obj) + '\n');
}

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

test.beforeAll(() => {
  fs.mkdirSync(path.join(REPORT_ROOT, 'screenshots'), { recursive: true });
  fs.mkdirSync(path.join(REPORT_ROOT, 'videos'), { recursive: true });
  fs.mkdirSync(path.join(REPORT_ROOT, 'report'), { recursive: true });
  // Fresh results file for this run. Safe to reset here (unlike before) because this
  // whole file is now a SINGLE test covering all screens - not one test per screen -
  // so there's no risk of a mid-run worker restart wiping accumulated data.
  fs.writeFileSync(RESULTS_JSONL_PATH, '');
});

test('QA Smoke Test - All Screens (single session)', async ({ page }, testInfo) => {
  test.setTimeout(30 * 60 * 1000); // 30 minutes for the whole run

  // ---- Log in ONCE at the start ----
  if (loginConfig.loginRequired) {
    await page.goto(loginConfig.loginUrl);
    await page.locator(loginConfig.usernameSelector).first().fill(loginConfig.username);
    await page.locator(loginConfig.passwordSelector).first().fill(loginConfig.password);
    const [authResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/authenticate') || res.url().toLowerCase().includes('login'), { timeout: 30000 }),
      page.locator(loginConfig.submitSelector).first().click(),
    ]);
    if (!authResponse.ok()) {
      throw new Error(`Login API returned status ${authResponse.status()} - check credentials in login.config.js. Cannot continue without login.`);
    }
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    console.log(`Logged in successfully, starting screen-by-screen testing...`);
  }

  let passCount = 0, failCount = 0, blockedCount = 0;

  for (const group of screenGroups) {
    for (const screen of group.items) {
      await test.step(`${group.module} :: ${screen.name}`, async () => {
        const consoleErrors = [];
        const networkErrors = [];
        const notes = [];
        let status = 'pass';
        let loadFailed = false;
        let apiCallCount = 0;
        let pageTitle = '';
        let mainHeading = '';
        const startTime = Date.now();

        const onConsole = (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 400));
        };
        const onPageError = (err) => consoleErrors.push(String(err.message || err).slice(0, 400));
        const onResponse = (res) => {
          const st = res.status();
          if (res.url().includes('/api') || res.url().includes(':8082')) apiCallCount++;
          if (st >= 400) networkErrors.push(`${st} ${res.request().method()} ${res.url()}`);
        };
        const onRequestFailed = (req) => {
          networkErrors.push(`FAILED ${req.method()} ${req.url()} (${req.failure()?.errorText || 'unknown'})`);
        };

        page.on('console', onConsole);
        page.on('pageerror', onPageError);
        page.on('response', onResponse);
        page.on('requestfailed', onRequestFailed);

        try {
          try {
            await page.goto(`${FRONTEND}${screen.path}`, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(800);
          } catch (e) {
            loadFailed = true;
            notes.push(`Navigation/timeout error: ${String(e.message || e).slice(0, 400)}`);
          }

          const loadTimeMs = Date.now() - startTime;

          if (!loadFailed) {
            try { pageTitle = await page.title(); } catch {}
            try {
              const heading = page.locator('h1, h2, .page-title, [class*="title" i]').first();
              mainHeading = (await heading.textContent({ timeout: 2000 }))?.trim().slice(0, 120) || '';
            } catch {}
          }

          // Redirect check + recovery via in-app link click
          let redirected = false;
          if (!loadFailed) {
            const expectedPath = screen.path.split('?')[0];
            let actualPath = new URL(page.url()).pathname;

            if (actualPath.toLowerCase() !== expectedPath.toLowerCase()) {
              try {
                const navLink = page.locator(`a[href="${expectedPath}"], a[href$="${expectedPath}"]`).first();
                if (await navLink.count()) {
                  await navLink.click({ timeout: 3000 });
                  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
                  await page.waitForTimeout(800);
                  actualPath = new URL(page.url()).pathname;
                }
              } catch {}
            }

            if (actualPath.toLowerCase() !== expectedPath.toLowerCase()) {
              redirected = true;
              notes.push(`REDIRECTED: requested "${expectedPath}" but ended up on "${actualPath}" - this screen was NOT actually tested.`);
            }
          }

          const modSlug = slug(group.module);
          const screenSlug = slug(screen.name);
          const screenshotDir = path.join(REPORT_ROOT, 'screenshots', modSlug);
          fs.mkdirSync(screenshotDir, { recursive: true });
          const screenshotFile = `${screenSlug}.png`;
          const screenshotFull = path.join(screenshotDir, screenshotFile);

          let screenshotRel = null;
          if (!loadFailed && !redirected) {
            try {
              await page.screenshot({ path: screenshotFull, fullPage: true });
              screenshotRel = `screenshots/${modSlug}/${screenshotFile}`;
            } catch (e) {
              notes.push(`Screenshot capture failed: ${String(e.message || e).slice(0, 300)}`);
            }
          }

          if (loadFailed || redirected) {
            status = 'blocked';
          } else if (consoleErrors.length > 0 || networkErrors.length > 0) {
            status = 'fail';
          }

          if (status === 'pass') passCount++;
          else if (status === 'fail') failCount++;
          else blockedCount++;

          appendResult({
            module: group.module,
            screen: screen.name,
            url: screen.path,
            status,
            consoleErrors,
            networkErrors,
            notes,
            screenshot: screenshotRel,
            video: null, // one shared video for the whole run, not per-screen (see note below)
            pageTitle,
            mainHeading,
            loadTimeMs,
            apiCallCount,
          });
        } finally {
          page.off('console', onConsole);
          page.off('pageerror', onPageError);
          page.off('response', onResponse);
          page.off('requestfailed', onRequestFailed);
        }
      });
    }
  }

  console.log(`\nQA run complete: ${passCount + failCount + blockedCount} screens | ${passCount} pass | ${failCount} fail | ${blockedCount} blocked`);

  // Save the ONE video covering the whole run (all screens), since we used a single
  // shared session instead of a fresh context per screen (this is what makes it fast).
  try {
    const video = page.video();
    if (video) {
      const videoSrcPath = await video.path();
      const destPath = path.join(REPORT_ROOT, 'videos', 'full-run.webm');
      fs.mkdirSync(path.join(REPORT_ROOT, 'videos'), { recursive: true });
      fs.copyFileSync(videoSrcPath, destPath);
      console.log(`Full-run video saved to ${destPath}`);
    }
  } catch (e) {
    console.log(`Could not save full-run video: ${e.message}`);
  }
});
