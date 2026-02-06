# Momentum Habit Tracker

A comprehensive, production-ready habit tracking application built with React. Track your habits, build streaks, analyze your progress, and stay motivated!

## Features

- 📊 **Dashboard** - Overview of your daily habits and progress
- 📅 **Calendar View** - Visual monthly habit tracking with heatmap
- 📈 **Analytics** - Detailed statistics and charts for each habit
- ⚙️ **Habit Management** - Create, edit, and delete habits with customization
- 🌙 **Dark/Light Mode** - Toggle between themes
- 😊 **Mood Tracking** - Track your daily mood
- 📝 **Daily Reflections** - Write reflections for each day
- 👤 **Multi-User Support** - Sign up and manage multiple accounts
- 🔔 **Notifications** - Get reminders for your habits (browser notifications)
- 💾 **Local Storage** - All data stored securely in your browser

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd momentum-habit-tracker
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit `http://localhost:3000`

## Build for Production

To create a production build:

```bash
npm run build
```

The optimized files will be in the `dist` folder.

To preview the production build:

```bash
npm run preview
```

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

### Deploy to Netlify

1. Build the project:
   ```bash
   npm run build
   ```

2. Drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

Or use Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Deploy to GitHub Pages

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json`:
   ```json
   "homepage": "https://yourusername.github.io/momentum-habit-tracker",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

### Deploy to Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login and initialize:
   ```bash
   firebase login
   firebase init hosting
   ```

3. Set public directory to `dist`

4. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

## Usage

### First Time Setup

1. Click "Sign Up" to create an account
2. Enter your name, email, and password
3. Start creating habits!

### Creating a Habit

1. Go to "Manage Habits" tab
2. Click "Add New Habit"
3. Fill in:
   - Habit name
   - Description
   - Category (Health, Productivity, Fitness, etc.)
   - Frequency (Daily or Weekly)
   - Icon

### Tracking Habits

1. From the Dashboard, click on any habit to mark it complete for today
2. View your progress in the Calendar tab
3. Check detailed analytics in the Analytics tab

## Technologies Used

- **React 18** - UI library
- **Vite** - Build tool and development server
- **Recharts** - Data visualization
- **LocalStorage** - Data persistence
- **Web Crypto API** - Password hashing

## Project Structure

```
momentum-habit-tracker/
├── public/
│   ├── index.html
│   └── favicon.svg
├── src/
│   ├── App.jsx          # Main application component
│   └── main.jsx         # Entry point
├── package.json
├── vite.config.js
└── README.md
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Data Storage

All data is stored locally in your browser using LocalStorage. No data is sent to any server. To backup your data, you can export it from the browser's developer tools.

## Contributing

Feel free to fork this project and submit pull requests for any improvements!

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter any issues, please check the browser console for error messages.

---

Built with ❤️ using React and Vite
