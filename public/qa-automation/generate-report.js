const fs = require('fs');
const path = require('path');

const REPORT_ROOT = path.join(process.cwd(), 'qa-report');
const resultsJsonlPath = path.join(REPORT_ROOT, 'results.jsonl');
const outDir = path.join(REPORT_ROOT, 'report');
fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(resultsJsonlPath)) {
  console.error(`No results found at ${resultsJsonlPath}. Run "npx playwright test" first.`);
  process.exit(1);
}

const results = fs
  .readFileSync(resultsJsonlPath, 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const total = results.length;
const pass = results.filter((r) => r.status === 'pass').length;
const fail = results.filter((r) => r.status === 'fail').length;
const blocked = results.filter((r) => r.status === 'blocked').length;
const passPct = total ? ((pass / total) * 100).toFixed(1) : '0';

const byModule = {};
for (const r of results) {
  if (!byModule[r.module]) byModule[r.module] = [];
  byModule[r.module].push(r);
}

function esc(s) {
  return String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function statusBadge(status) {
  const colors = { pass: '#0a7d2b', fail: '#c62828', blocked: '#e07b00' };
  const labels = { pass: 'PASS', fail: 'FAIL', blocked: 'BLOCKED' };
  return `<span class="badge" style="background:${colors[status]};">${labels[status]}</span>`;
}

function priorityFor(moduleName) {
  return moduleName === 'Admin Center' || moduleName === 'Assembly Lab' ? 'Medium' : 'High';
}

let tcCounter = 0;
let quickRows = '';
let detailCards = '';
let moduleNavLinks = '';

for (const [moduleName, items] of Object.entries(byModule)) {
  const mp = items.filter((i) => i.status === 'pass').length;
  const mf = items.filter((i) => i.status === 'fail').length;
  const mb = items.filter((i) => i.status === 'blocked').length;
  const anchor = moduleName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  moduleNavLinks += `<a href="#${anchor}" class="nav-pill">${esc(moduleName)} <span class="nav-count">${items.length}</span></a>`;

  let moduleQuickRows = '';
  let moduleCards = '';

  for (const r of items) {
    tcCounter += 1;
    const tcId = `TC-${String(tcCounter).padStart(3, '0')}`;
    const priority = priorityFor(moduleName);
    const errLines = [...r.consoleErrors, ...r.networkErrors, ...r.notes];

    const screenshotBlock = r.screenshot
      ? `<a href="../${r.screenshot}" target="_blank"><img src="../${r.screenshot}" class="thumb"/></a>`
      : `<span class="muted">No screenshot captured</span>`;
    const videoBlock = r.video
      ? `<a href="../${r.video}" target="_blank" class="video-link">&#9654; Watch video recording</a>`
      : `<span class="muted">No video captured</span>`;

    moduleQuickRows += `<tr>
      <td><a href="#${tcId}">${tcId}</a></td>
      <td>${esc(r.screen)}</td>
      <td><code>${esc(r.url)}</code></td>
      <td>${priority}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`;

    const title =
      r.status === 'pass'
        ? `Verify "${esc(r.screen)}" screen loads correctly and functions without errors`
        : r.status === 'blocked'
        ? `Verify "${esc(r.screen)}" screen is reachable and loads`
        : `Verify "${esc(r.screen)}" screen loads without errors`;

    const expected = `The "${esc(r.screen)}" screen (<code>${esc(r.url)}</code>) loads fully, displays its content/heading correctly, and makes no failing API calls or JavaScript errors.`;

    let actual, actualClass;
    if (r.status === 'pass') {
      actual = `Screen loaded successfully in ${((r.loadTimeMs || 0) / 1000).toFixed(1)}s. Page title: "${esc(r.pageTitle) || 'n/a'}". Heading detected: "${esc(r.mainHeading) || 'n/a'}". ${r.apiCallCount ?? 0} backend API call(s) made, all returned successfully. No console errors.`;
      actualClass = 'ok';
    } else if (r.status === 'blocked') {
      actual = `Screen could NOT be verified. ${errLines.map(esc).join(' ') || 'Navigation did not reach the expected screen.'}`;
      actualClass = 'bad';
    } else {
      actual = `Screen loaded but the following issue(s) were detected:<br>&bull; ${errLines.map(esc).join('<br>&bull; ')}`;
      actualClass = 'bad';
    }

    moduleCards += `
    <div class="tc-card ${r.status}" id="${tcId}">
      <div class="tc-head">
        <div class="tc-id">${tcId}</div>
        <div class="tc-title">${title}</div>
        ${statusBadge(r.status)}
      </div>
      <div class="tc-meta">
        <span><strong>Module:</strong> ${esc(moduleName)}</span>
        <span><strong>Priority:</strong> ${priority}</span>
        <span><strong>Precondition:</strong> User is logged in</span>
        <span><strong>Test Data / URL:</strong> <code>${esc(r.url)}</code></span>
      </div>
      <div class="tc-body">
        <div class="tc-col">
          <h4>Test Steps</h4>
          <ol class="steps">
            <li>Log in to the application</li>
            <li>Navigate to <code>${esc(r.url)}</code> (${esc(r.screen)})</li>
            <li>Verify the page loads fully without crashing or showing a blank screen</li>
            <li>Verify the page heading/content matches "${esc(r.screen)}"</li>
            <li>Verify no JavaScript console errors are thrown</li>
            <li>Verify all backend API calls return a success status (no 4xx/5xx errors)</li>
          </ol>
        </div>
        <div class="tc-col">
          <h4>Expected Result</h4>
          <p>${expected}</p>
          <h4>Actual Result</h4>
          <p class="actual ${actualClass}">${actual}</p>
        </div>
        <div class="tc-col tc-evidence">
          <h4>Evidence</h4>
          ${screenshotBlock}
          <div style="margin-top:8px;">${videoBlock}</div>
        </div>
      </div>
    </div>`;
  }

  quickRows += `<tr class="module-row"><td colspan="5">${esc(moduleName)} — ${mp} pass / ${mf} fail / ${mb} blocked (${items.length} total)</td></tr>${moduleQuickRows}`;

  detailCards += `
  <section id="${anchor}">
    <h2>${esc(moduleName)} <span class="module-summary">(${mp} pass / ${mf} fail / ${mb} blocked — ${items.length} total)</span></h2>
    ${moduleCards}
  </section>`;
}

const worstModule = Object.entries(byModule)
  .map(([name, items]) => ({ name, failCount: items.filter((i) => i.status !== 'pass').length }))
  .sort((a, b) => b.failCount - a.failCount)[0];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>QA Test Case Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin:0; padding:32px 40px 80px; background:#f4f5f7; color:#1a1a1a; }
  h1 { margin:0 0 4px; font-size:26px; }
  .meta { color:#666; font-size:13px; margin-bottom:24px; }
  .summary { display:flex; gap:14px; margin:20px 0 28px; flex-wrap:wrap; }
  .card { background:#fff; border-radius:10px; padding:16px 22px; box-shadow:0 1px 3px rgba(0,0,0,.08); min-width:110px; }
  .card .num { font-size:26px; font-weight:700; }
  .card.pass .num { color:#0a7d2b; }
  .card.fail .num { color:#c62828; }
  .card.blocked .num { color:#e07b00; }
  .card .label { font-size:12px; color:#666; margin-top:2px; }
  .highlight { background:#fff8e6; border:1px solid #f0d98a; border-radius:8px; padding:12px 18px; margin-bottom:28px; font-size:14px; }
  .nav { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:28px; position:sticky; top:0; background:#f4f5f7; padding:10px 0; z-index:5; }
  .nav-pill { background:#fff; border:1px solid #e2e2e2; border-radius:20px; padding:6px 14px; font-size:13px; text-decoration:none; color:#333; }
  .nav-count { color:#999; font-size:11px; }
  code { background:#f0f0f0; padding:2px 6px; border-radius:4px; font-size:12px; }
  .badge { color:#fff; padding:3px 12px; border-radius:12px; font-size:11px; font-weight:700; letter-spacing:.03em; }

  .quick-table-wrap { background:#fff; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,.06); margin-bottom:44px; overflow:hidden; }
  .quick-table-wrap h3 { padding:16px 18px 0; margin:0; font-size:15px; }
  table { width:100%; border-collapse:collapse; }
  th, td { padding:8px 14px; border-bottom:1px solid #eee; text-align:left; vertical-align:top; font-size:13px; }
  th { background:#fafafa; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#666; }
  .module-row td { background:#f0f3f7; font-weight:600; font-size:12px; color:#444; }
  td a { color:#1a5fb4; text-decoration:none; }

  h2 { margin-top:8px; border-bottom:2px solid #e8e8e8; padding-bottom:8px; font-size:19px; }
  .module-summary { font-size:13px; font-weight:400; color:#666; }
  .tc-card { background:#fff; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,.07); margin:16px 0; padding:18px 20px; border-left:5px solid #ccc; scroll-margin-top:60px; }
  .tc-card.pass { border-left-color:#0a7d2b; }
  .tc-card.fail { border-left-color:#c62828; }
  .tc-card.blocked { border-left-color:#e07b00; }
  .tc-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:10px; }
  .tc-id { font-weight:700; color:#555; font-size:13px; }
  .tc-title { font-weight:600; font-size:15px; flex:1; }
  .tc-meta { display:flex; gap:20px; flex-wrap:wrap; font-size:12px; color:#555; margin-bottom:14px; padding-bottom:10px; border-bottom:1px dashed #eee; }
  .tc-body { display:grid; grid-template-columns:1.3fr 1.3fr 0.9fr; gap:20px; }
  .tc-col h4 { margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#888; }
  .tc-col p { margin:0 0 10px; font-size:13px; line-height:1.55; }
  .steps { margin:0; padding-left:18px; font-size:13px; line-height:1.7; }
  .actual.ok { color:#0a7d2b; }
  .actual.bad { color:#c62828; }
  .tc-evidence .thumb { width:100%; max-width:180px; border:1px solid #ddd; border-radius:4px; display:block; }
  .video-link { color:#1a5fb4; text-decoration:none; font-weight:600; font-size:12px; }
  .muted { color:#999; font-size:12px; }
  section { scroll-margin-top:60px; }
  @media (max-width: 900px) { .tc-body { grid-template-columns:1fr; } }
</style>
</head>
<body>
  <h1>QA Test Case Report</h1>
  <div class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Frontend: http://localhost:5173 &nbsp;|&nbsp; Backend: http://localhost:8082</div>

  <div class="summary">
    <div class="card"><div class="num">${total}</div><div class="label">Total Test Cases</div></div>
    <div class="card pass"><div class="num">${pass}</div><div class="label">Pass</div></div>
    <div class="card fail"><div class="num">${fail}</div><div class="label">Fail</div></div>
    <div class="card blocked"><div class="num">${blocked}</div><div class="label">Blocked</div></div>
    <div class="card"><div class="num">${passPct}%</div><div class="label">Pass Rate</div></div>
  </div>

  ${worstModule && worstModule.failCount > 0 ? `<div class="highlight">Most issues found in: <strong>${esc(worstModule.name)}</strong> (${worstModule.failCount} test case${worstModule.failCount > 1 ? 's' : ''} not passing)</div>` : ''}

  ${fs.existsSync(path.join(REPORT_ROOT, 'videos', 'full-run.webm')) ? `<div class="highlight">🎥 <a href="../videos/full-run.webm" target="_blank"><strong>Watch the full test-run video recording</strong></a> (covers every screen in one continuous session)</div>` : ''}

  <div class="nav">${moduleNavLinks}</div>

  <div class="quick-table-wrap">
    <h3>Quick Summary — All Test Cases</h3>
    <table>
      <thead><tr><th>TC ID</th><th>Screen</th><th>URL</th><th>Priority</th><th>Status</th></tr></thead>
      <tbody>${quickRows}</tbody>
    </table>
  </div>

  ${detailCards}

  ${(() => {
    const funcPath = path.join(REPORT_ROOT, 'functional-results.json');
    if (!fs.existsSync(funcPath)) return '';
    let funcResults;
    try {
      funcResults = JSON.parse(fs.readFileSync(funcPath, 'utf-8'));
    } catch {
      return '';
    }
    if (!funcResults.length) return '';

    const fp = funcResults.filter((r) => r.status === 'pass').length;
    const ff = funcResults.filter((r) => r.status === 'fail').length;
    const fb = funcResults.filter((r) => r.status === 'blocked').length;

    const cards = funcResults
      .map((r, idx) => {
        const fid = `FC-${String(idx + 1).padStart(3, '0')}`;
        const shots = [r.beforeShot, r.afterFillShot, r.afterSubmitShot, r.afterCleanupShot]
          .filter(Boolean)
          .map((s, i) => `<a href="../${s}" target="_blank"><img src="../${s}" class="thumb" style="margin-right:6px;" title="${['Before', 'Filled', 'After Submit', 'After Cleanup'][i]}"/></a>`)
          .join('');
        return `
        <div class="tc-card ${r.status}" id="${fid}">
          <div class="tc-head">
            <div class="tc-id">${fid}</div>
            <div class="tc-title">Functional: Create record via "${esc(r.screen)}" (${esc(r.module)})</div>
            ${statusBadge(r.status)}
          </div>
          <div class="tc-meta">
            <span><strong>URL:</strong> <code>${esc(r.url)}</code></span>
            <span><strong>Fields auto-filled:</strong> ${r.filledCount}</span>
            <span><strong>Record found in list after create:</strong> ${r.viewFound ? 'Yes' : 'No'}</span>
          </div>
          <div class="tc-body">
            <div class="tc-col" style="grid-column: span 2;">
              <h4>Steps performed</h4>
              <ol class="steps">
                <li>Log in, navigate to the form</li>
                <li>Auto-detect and fill all visible fields with generated test data</li>
                <li>Click Save/Submit/Add/Create</li>
                <li>Check for a success/error message</li>
                <li>Check whether the new record appears in a list on the page (View check)</li>
                <li>If found, delete only that test record (cleanup) - never touches pre-existing data</li>
              </ol>
              <h4>Result / Notes</h4>
              <p class="actual ${r.status === 'pass' ? 'ok' : 'bad'}">${r.notes.map(esc).join('<br>')}</p>
            </div>
            <div class="tc-col tc-evidence">
              <h4>Evidence (before → filled → after submit → after cleanup)</h4>
              ${shots || '<span class="muted">No screenshots</span>'}
            </div>
          </div>
        </div>`;
      })
      .join('\n');

    return `
    <section id="functional-tests">
      <h2>Functional "Create" Tests <span class="module-summary">(${fp} pass / ${ff} fail / ${fb} blocked — ${funcResults.length} total)</span></h2>
      <p class="muted">These tests auto-filled and submitted "Add/Create" forms with generated test data, then attempted to clean up (delete) only the records they created themselves.</p>
      ${cards}
    </section>`;
  })()}
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'QA-Test-Report.html'), html);
console.log(`Report written to ${path.join(outDir, 'QA-Test-Report.html')}`);
console.log(`Total: ${total} | Pass: ${pass} | Fail: ${fail} | Blocked: ${blocked} | Pass rate: ${passPct}%`);
