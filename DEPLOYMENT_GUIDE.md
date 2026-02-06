# Quick Deployment Guide

## Option 1: Vercel (Recommended - Easiest)

Vercel is the easiest and fastest way to deploy your React app.

### Steps:

1. **Create a Vercel account** at [vercel.com](https://vercel.com)

2. **Install Vercel CLI** (optional, you can also use the web interface):
   ```bash
   npm install -g vercel
   ```

3. **Deploy via CLI**:
   ```bash
   cd momentum-habit-tracker
   vercel
   ```
   
   Or **Deploy via Web**:
   - Push your code to GitHub
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Click "Deploy"

4. Done! Your app will be live at a Vercel URL

**Deployment time: ~2 minutes**

---

## Option 2: Netlify (Also Very Easy)

### Steps:

1. **Build your project**:
   ```bash
   cd momentum-habit-tracker
   npm install
   npm run build
   ```

2. **Drag and Drop**:
   - Go to [app.netlify.com/drop](https://app.netlify.com/drop)
   - Drag the `dist` folder onto the page
   - Done!

Or use **Netlify CLI**:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Deployment time: ~3 minutes**

---

## Option 3: GitHub Pages (Free, Simple)

### Steps:

1. **Update package.json** - Add these lines:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/momentum-habit-tracker",
   ```

2. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy script** to package.json:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**:
   - Go to your repository settings
   - Scroll to "Pages"
   - Select `gh-pages` branch
   - Save

**Deployment time: ~5 minutes**

---

## Option 4: Firebase Hosting

### Steps:

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and initialize**:
   ```bash
   firebase login
   firebase init hosting
   ```
   
   During setup:
   - Select "Use an existing project" or create new
   - Set public directory to: `dist`
   - Configure as single-page app: `Yes`
   - Set up automatic builds: `No`

3. **Build and deploy**:
   ```bash
   npm run build
   firebase deploy
   ```

**Deployment time: ~5 minutes**

---

## Option 5: Railway

### Steps:

1. **Create account** at [railway.app](https://railway.app)

2. **Create new project** from GitHub repo

3. **Add build settings**:
   - Build command: `npm run build`
   - Start command: `npm run preview`
   - Add environment variable: `PORT=3000`

4. Deploy automatically on push

**Deployment time: ~4 minutes**

---

## Testing Your Deployment

After deployment, test these features:

1. ✅ Sign up with a new account
2. ✅ Create a habit
3. ✅ Mark a habit complete
4. ✅ Switch between tabs (Dashboard, Calendar, Analytics)
5. ✅ Toggle dark/light mode
6. ✅ Refresh the page (data should persist)

---

## Troubleshooting

### Build Fails
- Make sure you ran `npm install` first
- Check Node.js version: `node --version` (should be 16+)
- Delete `node_modules` and run `npm install` again

### Page Shows Blank
- Check browser console for errors (F12)
- Make sure the build output is in `dist` folder
- Verify `index.html` is in the correct location

### Data Not Persisting
- Check if browser allows localStorage
- Try a different browser
- Check for browser extensions blocking storage

---

## Recommended: Vercel

For the easiest experience, we recommend **Vercel**:
- Automatic deployments
- Free SSL certificate
- Great performance
- Custom domains supported
- Zero configuration needed

Simply run `vercel` in your project directory and follow the prompts!
