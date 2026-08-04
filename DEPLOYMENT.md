# Complete Deployment Guide

## Prerequisites

- GitHub account (for version control)
- Vercel or Netlify account
- All HTML files in `public/` directory
- Git installed locally

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Prepare Your Repository

```bash
# Navigate to your project directory
cd /path/to/iwt-deployment

# Initialize Git (if not already done)
git init

# Create .gitignore
echo "node_modules/
.vercel/" > .gitignore

# Add all files
git add .

# Create initial commit
git commit -m "feat: Initial IWT documentation with iframes"

# Rename branch to main
git branch -M main
```

### Step 2: Push to GitHub

```bash
# Add remote (replace USERNAME/REPO-NAME)
git remote add origin https://github.com/USERNAME/REPO-NAME.git

# Push to GitHub
git push -u origin main
```

### Step 3: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Click "Continue with GitHub"
3. Authorize Vercel to access GitHub
4. Select your repository
5. Configure Project:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: `public`
   - **Root Directory**: (leave empty)
6. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts to link your GitHub account
```

### Step 4: Custom Domain (Optional)

1. In Vercel Dashboard → Settings
2. Add custom domain
3. Update DNS records with provider
4. Wait for SSL certificate (24-48 hours)

---

## Option 2: Deploy to Netlify

### Step 1: Prepare Your Repository

Same as Vercel steps 1-2 above.

### Step 2: Deploy to Netlify

#### Option A: Via Netlify UI (Easiest)

1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Select GitHub
4. Authorize Netlify with GitHub
5. Select your repository
6. Configure:
   - **Base directory**: (leave empty)
   - **Build command**: (leave empty)
   - **Publish directory**: `public`
7. Click "Deploy site"

#### Option B: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=public
```

### Step 3: Custom Domain (Optional)

1. In Netlify Dashboard → Site settings
2. Add custom domain
3. Update nameservers or DNS records
4. SSL auto-generated (free!)

---

## File Structure for Deployment

Ensure your repository looks like this:

```
iwt-ite-docs/                    # Your repo name
├── .git/                        # Git metadata (auto-created)
├── .gitignore                   # Ignore files
├── public/                      # All static files here
│   ├── index.html              # Main entry point
│   ├── test-cases.html
│   ├── overview.html
│   └── issues.html
├── vercel.json                  # Vercel config
├── package.json                 # Project info
├── README.md                    # This file
└── DEPLOYMENT.md               # Deployment guide
```

---

## Verify Everything Works

### Before Deployment (Local)

```bash
# Start local server
cd public
python3 -m http.server 8000

# Test in browser
# Visit: http://localhost:8000
# Click all links and iframes
# Check console for errors (F12)
```

### After Deployment

1. Visit your deployed URL
2. Test main page loads
3. Click all tabs/buttons
4. Test iframe pages load correctly
5. Check browser console for errors
6. Test on mobile (responsive design)

---

## Troubleshooting Deployment

### Problem: "No index.html found"
**Solution**: Make sure `index.html` is in the `public/` directory

### Problem: "Iframes not loading"
**Solution**: Check file paths in HTML
```html
<!-- Use relative paths only -->
<iframe src="./test-cases.html"></iframe>
```

### Problem: "404 on deployed site"
**Solution**: Check:
- File names are lowercase: `index.html` ✅ not `Index.html` ❌
- No spaces in filenames: `test-cases.html` ✅ not `test cases.html` ❌
- Relative paths: `./file.html` ✅ not `/file.html` ❌

### Problem: "Vercel still showing old version"
**Solution**: Clear cache
- Ctrl+Shift+Delete (Windows)
- Cmd+Shift+Delete (Mac)
- Then hard refresh: Ctrl+Shift+R

### Problem: "CORS error with iframes"
**Solution**: Not applicable for same-domain iframes. If error persists:
- Check browser console (F12)
- Verify files are in correct directory
- Try different browser

---

## Continuous Deployment (Auto-Update)

Both Vercel and Netlify support automatic deployment:

1. Push changes to GitHub
2. Vercel/Netlify automatically rebuilds
3. Site updates within 1-2 minutes
4. No manual deployment needed!

### Example Workflow:
```bash
# Make changes locally
echo "<!-- New comment -->" >> public/index.html

# Commit and push
git add public/index.html
git commit -m "docs: Update documentation"
git push origin main

# Vercel/Netlify automatically deploys!
```

---

## Performance Optimization

### Before Going Live

1. **Minify HTML** (optional):
   ```bash
   # Using minify
   npm install -g minify
   minify public/*.html
   ```

2. **Add Cache Headers** (already in vercel.json):
   - Static files cached for 1 hour
   - Reduces bandwidth usage

3. **Monitor Size**:
   ```bash
   du -sh public/  # Check total size
   ```

### SEO Improvements

Add to `index.html` `<head>`:
```html
<meta name="description" content="Complete IWT & ITE system documentation">
<meta name="keywords" content="IWT, ITE, ERP, documentation">
<meta name="author" content="Govind Birajdar">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## Support & Monitoring

### Monitor Deployment:
- **Vercel**: https://vercel.com/dashboard
- **Netlify**: https://app.netlify.com/

### Get Analytics:
- **Vercel Analytics**: Built-in (free tier)
- **Netlify Analytics**: $9/month or use external

### Update & Maintain:
```bash
# Regular updates
git pull origin main
# Make changes
git add .
git commit -m "Update documentation"
git push origin main
# Auto-deployed!
```

---

## Success Checklist

- ✅ All files in `public/` directory
- ✅ Using relative paths: `./filename.html`
- ✅ Lowercase filenames with hyphens
- ✅ GitHub repository created
- ✅ Vercel/Netlify account linked
- ✅ Build settings configured correctly
- ✅ Deployed successfully
- ✅ All pages loading
- ✅ Iframes working
- ✅ Responsive on mobile

**Your documentation is now live! 🚀**

---

**Last Updated**: August 3, 2026
