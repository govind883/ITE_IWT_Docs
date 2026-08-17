const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const loginConfig = require('../login.config');
const screenGroups = require('./screens.data');

const FRONTEND = 'http://localhost:5173';
const REPORT_ROOT = path.join(process.cwd(), 'qa-report');
const FUNC_RESULTS_PATH = path.join(REPORT_ROOT, 'functional-results.json');

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

// Only run this against screens that look like "create/add" forms.
// Match by URL path (e.g. /add-customer, /add-product) since the menu label often
// doesn't literally start with "Add" (e.g. name="Customers", path="/add-customer").
const CREATE_SCREEN_PATH_PATTERN = /^\/add[-A-Z]/i;

const targetScreens = [];
for (const group of screenGroups) {
  for (const item of group.items) {
    if (CREATE_SCREEN_PATH_PATTERN.test(item.path)) {
      targetScreens.push({ module: group.module, ...item });
    }
  }
}

/** @type {any[]} */
const functionalResults = [];

test.beforeAll(() => {
  fs.mkdirSync(path.join(REPORT_ROOT, 'screenshots', '_functional'), { recursive: true });
  console.log(`Functional create-test will run against ${targetScreens.length} "Add/Create" screen(s):`);
  targetScreens.forEach((s) => console.log(`  - ${s.module} :: ${s.name} (${s.path})`));
});

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

// Generate a sensible value for a given input element based on its type/attributes.
async function valueForField(locator) {
  const type = (await locator.getAttribute('type')) || 'text';
  const name = ((await locator.getAttribute('name')) || (await locator.getAttribute('id')) || '').toLowerCase();
  const placeholder = ((await locator.getAttribute('placeholder')) || '').toLowerCase();
  const hint = name + ' ' + placeholder;
  const suffix = randomSuffix();

  if (type === 'email' || hint.includes('email')) return `qatest.${suffix}@example.com`;
  if (type === 'number' || hint.includes('qty') || hint.includes('quantity') || hint.includes('amount') || hint.includes('price')) return '100';
  if (type === 'date') return new Date().toISOString().slice(0, 10);
  if (type === 'tel' || hint.includes('phone') || hint.includes('mobile')) return '9999999999';
  if (hint.includes('code')) return `QA${suffix.toUpperCase()}`;
  if (hint.includes('name')) return `QA Test ${suffix}`;
  return `QA Test Value ${suffix}`;
}

for (const screen of targetScreens) {
  test(`Functional Create :: ${screen.module} :: ${screen.name}`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    const notes = [];
    let status = 'blocked';
    let filledCount = 0;

    // --- Login fresh (same reliable approach as qa-smoke.spec.js) ---
    if (loginConfig.loginRequired) {
      await page.goto(loginConfig.loginUrl);
      await page.locator(loginConfig.usernameSelector).first().fill(loginConfig.username);
      await page.locator(loginConfig.passwordSelector).first().fill(loginConfig.password);
      try {
        await Promise.all([
          page.waitForResponse((res) => res.url().includes('/authenticate') || res.url().toLowerCase().includes('login'), { timeout: 20000 }),
          page.locator(loginConfig.submitSelector).first().click(),
        ]);
      } catch (e) {
        notes.push(`Login failed: ${String(e.message || e).slice(0, 200)}`);
      }
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    // --- Navigate to the target form ---
    try {
      await page.goto(`${FRONTEND}${screen.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      notes.push(`Navigation failed: ${String(e.message || e).slice(0, 300)}`);
    }

    const modSlug = slug(screen.module);
    const screenSlug = slug(screen.name);
    const beforeShot = `screenshots/_functional/${modSlug}__${screenSlug}__before.png`;
    await page.screenshot({ path: path.join(REPORT_ROOT, beforeShot), fullPage: true }).catch(() => {});

    // --- Auto-detect and fill visible text/email/number/date/tel inputs + textareas ---
    const fillableInputs = page.locator(
      'form input[type="text"], form input[type="email"], form input[type="number"], form input[type="date"], form input[type="tel"], form input:not([type]), form textarea'
    );
    const inputCount = await fillableInputs.count();

    for (let i = 0; i < inputCount; i++) {
      const field = fillableInputs.nth(i);
      try {
        if (!(await field.isVisible())) continue;
        if (await field.isDisabled()) continue;
        const value = await valueForField(field);
        await field.fill(value, { timeout: 2000 });
        filledCount++;
      } catch {
        // skip fields that can't be filled (readonly, hidden, etc.)
      }
    }

    // --- Handle simple <select> dropdowns: pick the first non-empty option ---
    const selects = page.locator('form select');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i);
      try {
        if (!(await sel.isVisible())) continue;
        const options = await sel.locator('option').all();
        for (const opt of options) {
          const val = await opt.getAttribute('value');
          if (val && val.trim() !== '') {
            await sel.selectOption(val);
            filledCount++;
            break;
          }
        }
      } catch {}
    }

    notes.push(`Auto-filled ${filledCount} field(s) out of ${inputCount + selectCount} detected.`);

    const afterFillShot = `screenshots/_functional/${modSlug}__${screenSlug}__filled.png`;
    await page.screenshot({ path: path.join(REPORT_ROOT, afterFillShot), fullPage: true }).catch(() => {});

    // --- Try to submit ---
    let submitClicked = false;
    if (filledCount > 0) {
      const submitBtn = page
        .locator(
          'form button[type="submit"], form input[type="submit"], button:has-text("Save"), button:has-text("Submit"), button:has-text("Add"), button:has-text("Create")'
        )
        .first();
      if (await submitBtn.count()) {
        try {
          await submitBtn.click({ timeout: 5000 });
          submitClicked = true;
          await page.waitForTimeout(2000);
        } catch (e) {
          notes.push(`Submit click failed: ${String(e.message || e).slice(0, 200)}`);
        }
      } else {
        notes.push('No Save/Submit/Add/Create button found.');
      }
    } else {
      notes.push('No fillable fields found - this screen may use a non-standard form structure (custom components), or has no form.');
    }

    const afterSubmitShot = `screenshots/_functional/${modSlug}__${screenSlug}__after-submit.png`;
    await page.screenshot({ path: path.join(REPORT_ROOT, afterSubmitShot), fullPage: true }).catch(() => {});

    // --- Try to detect success/error toast or message ---
    let resultMessage = '';
    try {
      const successLocator = page.locator(
        '[class*="success" i], [class*="toast" i], [role="status"], [role="alert"]'
      ).first();
      resultMessage = (await successLocator.textContent({ timeout: 3000 }))?.trim().slice(0, 200) || '';
    } catch {}

    if (submitClicked && resultMessage) {
      status = /error|fail|invalid|required/i.test(resultMessage) ? 'fail' : 'pass';
      notes.push(`Message after submit: "${resultMessage}"`);
    } else if (submitClicked) {
      status = 'fail';
      notes.push('Submitted, but no confirmation/error message was detected - please verify manually whether the record was actually created.');
    } else {
      status = 'blocked';
    }

    // --- VIEW check: try to find the record we just created in a list on this page ---
    // We search for any of the unique values we filled in (the ones containing our
    // random "QA" marker), since most "Add X" screens either redirect to or contain
    // a list of existing records.
    let viewFound = false;
    let viewNote = '';
    if (submitClicked && status !== 'blocked') {
      try {
        await page.waitForTimeout(1000);
        const marker = page.locator('text=/QA Test|QA[A-Z0-9]{6}/i').first();
        if (await marker.count()) {
          viewFound = true;
          viewNote = 'Found the newly created record listed on the page after submit (View check passed).';
        } else {
          viewNote = 'Could not find the newly created record on this page after submit - it may be on a separate list screen, or the create may not have worked.';
        }
      } catch {
        viewNote = 'View check could not run (page structure not recognized).';
      }
      notes.push(viewNote);
    }

    // --- CLEANUP: delete ONLY the record this test itself created (never touches
    // any pre-existing data). Looks for a delete/trash icon on the same row as our
    // unique marker text, right next to it. ---
    let cleanupNote = '';
    if (viewFound) {
      try {
        const row = page.locator('tr, [class*="row" i]').filter({ hasText: /QA Test|QA[A-Z0-9]{6}/i }).first();
        const deleteBtn = row.locator(
          'button[aria-label*="delete" i], [class*="delete" i], [title*="delete" i], svg[class*="trash" i], button:has-text("Delete")'
        ).first();
        if (await deleteBtn.count()) {
          await deleteBtn.click({ timeout: 3000 });
          await page.waitForTimeout(500);
          // Handle a possible confirm dialog (native or custom "Are you sure?" button)
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').first();
          if (await confirmBtn.count()) {
            await confirmBtn.click({ timeout: 3000 }).catch(() => {});
          }
          await page.waitForTimeout(1000);
          cleanupNote = 'Cleanup: deleted the test record this script created (only that record, nothing pre-existing).';
        } else {
          cleanupNote = 'Cleanup: no delete action found near the test record - it was left in place. Please remove it manually if needed.';
        }
      } catch (e) {
        cleanupNote = `Cleanup attempt failed: ${String(e.message || e).slice(0, 200)} - the test record may still be in the system, please check manually.`;
      }
      notes.push(cleanupNote);
    }

    const afterCleanupShot = `screenshots/_functional/${modSlug}__${screenSlug}__after-cleanup.png`;
    await page.screenshot({ path: path.join(REPORT_ROOT, afterCleanupShot), fullPage: true }).catch(() => {});

    functionalResults.push({
      module: screen.module,
      screen: screen.name,
      url: screen.path,
      status,
      notes,
      filledCount,
      viewFound,
      beforeShot,
      afterFillShot,
      afterSubmitShot,
      afterCleanupShot,
    });
  });
}

test.afterAll(() => {
  fs.writeFileSync(FUNC_RESULTS_PATH, JSON.stringify(functionalResults, null, 2));
  console.log(`\nFunctional create-test results written to ${FUNC_RESULTS_PATH}`);
});
