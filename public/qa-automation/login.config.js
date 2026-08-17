// ============================================================
// APNI APP KE HISAB SE YE VALUES BADLO
// ============================================================
module.exports = {
  // Agar app login-protected NAHI hai to ye false kar do — tab login step skip ho jayega
  loginRequired: true,

  // ============================================================
  // FIELD/ATTRIBUTE VALIDATION CHECK (optional, off by default)
  // ============================================================
  // true karne par: har screen pe agar koi form/submit button mila,
  // to script khali form submit karne ki koshish karega aur validation
  // errors capture karega.
  // RISK: agar kisi form ke saare fields optional hain, to ye
  // asli DUMMY RECORD create kar sakta hai aapke database mein
  // (khali Product, khali Supplier, waghera). Sirf tab ON karo jab
  // aap ek TEST/DEV database pe kaam kar rahe ho, production pe NAHI.
  enableValidationCheck: false,

  // Login page ka full URL
  loginUrl: "http://localhost:5173/login",

  // Aapke test/dev account ka username ya email
  username: "NaveenITETest",

  // Password
  password: "Naveen@123",

  // Username/email input field ka selector.
  // Default kai common patterns try karta hai — agar login fail ho to
  // browser mein login page kholo, right-click -> Inspect us field pe,
  // aur uska "name" ya "id" attribute yaha daal do, jaise: 'input[name="email"]'
  usernameSelector:
    'input[type="email"], input[name="email"], input[name="username"], input[id*="email" i], input[id*="user" i], input[placeholder*="mail" i], input[placeholder*="user" i]',

  // Password field ka selector (usually ye default hi kaam kar jayega)
  passwordSelector: 'input[type="password"]',

  // Login/Submit button ka selector
  submitSelector:
    'button[type="submit"], button:has-text("Login"), button:has-text("Log in"), button:has-text("Sign in")',

  // Login ke baad URL mein ye text NAHI hona chahiye (isse pata chalta hai login successful hua)
  loginPageUrlMarker: "login",
};
