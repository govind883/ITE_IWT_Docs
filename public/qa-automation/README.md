# QA Automation — Setup & Run

Ye folder poora ready hai. Isse apne project ke root mein copy karo (ya isi jagah rehne do), aur Claude Code se ya terminal se seedha chala do.

## 1. Servers chalu rakho
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8082`

## 2. Install
```bash
cd qa-automation
npm install
npx playwright install --with-deps chromium
```

## 3. Login setup (agar app login-protected hai)
`login.config.js` file kholo (root mein) aur ye 3 values apni app ke hisab se bharo:
```js
loginRequired: true,
loginUrl: "http://localhost:5173/login",
username: "apna-test-username",
password: "apna-password",
```
Selectors already common patterns try karte hain (email/username field, password field, login button). Agar login fail ho jaye (error dikhega "Login looks like it FAILED"), to browser mein login page kholo, us field pe right-click → Inspect karo, aur uska `name`/`id` attribute `login.config.js` mein selector ki jagah daal do.

Agar app login-protected NAHI hai, to bas `loginRequired: false` kar do — login step automatically skip ho jayega.

**Security note**: `login.config.js` mein password plain text mein hai — isse kisi git repo mein commit mat karna agar real credentials hain.

**Agar login pass ho jaye lekin baaki saari screens phir bhi login page hi dikhayein**: iska matlab app apna session token `sessionStorage` mein rakhta hai, `localStorage`/cookies mein nahi. Playwright ka session-reuse (`storageState`) sirf cookies + localStorage save karta hai — sessionStorage save nahi hota. Ye confirm karne ke liye: browser mein DevTools → Application tab → Session Storage vs Local Storage check karo login ke baad. Agar aisa hai to batana, isko handle karne ka alag tarika hai (har test se pehle login karna padega, jo slow hoga par kaam karega).

## 4. Run — smoke test only (page load, errors) — fast, no data created
```bash
npm run all
```
Ye do cheez karega:
1. `playwright test --project=chromium` — **ek hi baar login karke**, usi session mein sabhi ~69 screens ko ek-ek karke visit karega (fast — ~5-8 minute total), screenshot lega, console/network errors track karega
2. `generate-report.js` — final HTML report banayega

**Speed note**: pehle version har screen ke liye alag login karta tha (~25-45 sec/screen, 30-40 min total) — ab sirf ek baar login hota hai aur poori session reuse hoti hai, isliye bahut fast hai. Trade-off: video ab **har screen ki alag nahi**, balki **poore run ki ek hi continuous video** milegi (`qa-report/videos/full-run.webm`) — report ke top par uska link milega.

## 4b. Run — smoke test + functional Create/View/Delete test (poora, sab kuch ek sath)
```bash
npm run full
```
Ye smoke test (upar wala) chalane ke baad, "Add/Create" forms pe Create+View+Delete functional test bhi chalayega, aur ek hi final report mein dono ka data merge kar dega. **Isme real records temporarily create/delete hote hain — sirf TEST/DEV database pe chalao.**

## 7. (Optional) Sirf functional Create/View/Delete test chalana ho (smoke test ke bina)
```bash
npm run functional
npm run report
```
Har "Add ..." / "Create ..." screen pe:
1. Form ke fields **automatically detect** karke dummy data bharega
2. Save/Submit dabayega, success/error message check karega
3. **View check**: naya record list mein dikh raha hai ya nahi, verify karega
4. **Cleanup**: agar record mila, to **sirf usi record ko delete** karega (kabhi bhi existing/real data touch nahi karega)

Har screen ke 4 screenshots milenge (before, filled, after-submit, after-cleanup). Result final HTML report mein bhi jud jaayega (agar `npm run report` baad mein chalao).

**⚠️ RISK — zaroor padho:**
- Ye **asli records create karta hai** (thodi der ke liye) aapke database mein — sirf TEST/DEV database pe chalao, production pe kabhi nahi.
- Delete sirf apne khud ke banaye record ko target karta hai (unique "QA Test..." marker se pehchan kar) — lekin agar delete-button detect na ho paye, to test record **system mein reh sakta hai**, manually check/delete karna padega.
- Custom dropdown/autocomplete components (jo standard HTML `<select>` nahi hain) auto-fill nahi ho paayenge — aisi screens "blocked" ya partial-fill dikhengi.
- Active/Inactive status toggle ya Edit flow abhi is automation mein nahi hai (bahut app-specific hote hain) — agar chahiye to specific screens batao, alag se add kar sakte hain.
- Result: `qa-report/functional-results.json` aur screenshots `qa-report/screenshots/_functional/` mein milengi.

## 8. Result dekho
Report yaha milegi:
```
qa-report/report/QA-Test-Report.html
```
Isse seedha Chrome mein double-click karke kholo. Isme module-wise pass/fail/blocked count, screenshots (inline thumbnail, click to enlarge), aur video links sab honge.

## Folder structure (auto-generated after run)
```
qa-report/
  results.json
  screenshots/<module>/<screen>.png
  videos/<module>/<screen>.webm
  report/QA-Test-Report.html   <-- final document
```

## Notes
- Har screen "pass/fail/blocked" ho jaati hai automatically:
  - **blocked** = page load hi nahi hua (crash/timeout/404)
  - **fail** = page load hua lekin console error ya API 4xx/5xx mila
  - **pass** = sab clean
- Ek run stop nahi hota beech mein — koi screen crash bhi ho to baaki sab test hote rehte hain.
- `tests/screens.data.js` mein screens/URLs edit kar sakte ho agar routes change hon.
