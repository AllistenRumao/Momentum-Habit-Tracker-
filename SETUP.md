# Setup Instructions

## Quick Start (2 minutes)

1. **Open your terminal** and navigate to the project folder:
   ```bash
   cd momentum-habit-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and go to: `http://localhost:3000`

That's it! The app should now be running.

---

## What You Need

Before starting, make sure you have:

- **Node.js** (version 16 or higher)
  - Check: `node --version`
  - Download: [nodejs.org](https://nodejs.org)

- **npm** (comes with Node.js)
  - Check: `npm --version`

---

## Step-by-Step Setup

### 1. Install Node.js

If you don't have Node.js installed:

**Windows/Mac:**
- Go to [nodejs.org](https://nodejs.org)
- Download the LTS (Long Term Support) version
- Run the installer

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

### 2. Navigate to Project

Open your terminal/command prompt and go to the project folder:

```bash
cd path/to/momentum-habit-tracker
```

### 3. Install Dependencies

This downloads all the required packages:

```bash
npm install
```

This will take 1-2 minutes and create a `node_modules` folder.

### 4. Run the Development Server

Start the app in development mode:

```bash
npm run dev
```

You should see output like:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 5. Open in Browser

Open your web browser and visit:
```
http://localhost:3000
```

---

## Available Commands

After installation, you can use these commands:

### Development
```bash
npm run dev
```
Starts development server with hot-reload at `http://localhost:3000`

### Build for Production
```bash
npm run build
```
Creates optimized production files in `dist/` folder

### Preview Production Build
```bash
npm run preview
```
Preview the production build locally

---

## Project Structure

```
momentum-habit-tracker/
│
├── public/              # Static files
│   ├── index.html
│   └── favicon.svg
│
├── src/                 # Source code
│   ├── App.jsx          # Main application
│   └── main.jsx         # Entry point
│
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Build configuration
├── README.md            # Documentation
└── DEPLOYMENT_GUIDE.md  # Deployment instructions
```

---

## Troubleshooting

### Issue: `npm: command not found`
**Solution:** Install Node.js (it includes npm)

### Issue: `EACCES` permission error
**Solution:** 
```bash
sudo npm install
```
Or fix npm permissions: [docs.npmjs.com/resolving-eacces-permissions-errors](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

### Issue: Port 3000 already in use
**Solution:** Either:
- Kill the process using port 3000, or
- Edit `vite.config.js` to use a different port:
  ```js
  server: {
    port: 3001  // Change to any available port
  }
  ```

### Issue: Blank page or errors
**Solution:**
1. Check browser console (F12) for errors
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again
4. Clear browser cache and reload

### Issue: Build fails
**Solution:**
1. Make sure Node.js version is 16+: `node --version`
2. Delete `node_modules/` and `dist/` folders
3. Run `npm install` again
4. Run `npm run build`

---

## First Time Using the App

1. **Sign Up**: Create an account with name, email, and password
2. **Add Habits**: Click "Manage Habits" → "Add New Habit"
3. **Track Progress**: Click habits on the dashboard to mark them complete
4. **View Analytics**: Check the "Analytics" tab for detailed stats
5. **Check Calendar**: See your monthly progress in the "Calendar" tab

---

## Next Steps

Once you have the app running locally:

1. ✅ Test all features
2. ✅ Customize habits for your needs
3. ✅ Read `DEPLOYMENT_GUIDE.md` to deploy online
4. ✅ Share with friends!

---

## Need Help?

- **Check the README.md** for general information
- **Check DEPLOYMENT_GUIDE.md** for deployment options
- **Browser Console**: Press F12 to see error messages
- **Node.js Issues**: Visit [nodejs.org](https://nodejs.org)

---

Happy habit tracking! 🚀
