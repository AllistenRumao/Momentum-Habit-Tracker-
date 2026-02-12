import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* 
 * ═══════════════════════════════════════════════════════════════════
 * MOMENTUM HABIT TRACKER
 * A comprehensive, production-ready habit tracking application
 * ═══════════════════════════════════════════════════════════════════
 */

// UTILITIES & HELPERS
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
};

const motivationalQuotes = [
  "Success is the sum of small efforts repeated day in and day out, {name}!",
  "You don't have to be great to start, but you have to start to be great, {name}!",
  "The secret of getting ahead is getting started, {name}.",
  "Every accomplishment starts with the decision to try, {name}!",
  "Small daily improvements over time lead to stunning results, {name}!",
  "Your future is created by what you do today, {name}, not tomorrow.",
  "Don't watch the clock, {name}; do what it does. Keep going!",
  "The only way to do great work is to love what you do, {name}.",
  "Believe you can and you're halfway there, {name}!",
  "Progress, not perfection, {name}. Keep moving forward!",
];

// STORAGE MANAGER
class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'habitTracker_v2';
  }

  async loadData() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (error) {
      console.log('Loading fresh data');
    }
    return { users: [], currentUser: null, theme: 'dark' };
  }

  async saveData(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Save error:', error);
      return false;
    }
  }
}

const storage = new StorageManager();

// MAIN APP
export default function HabitTracker() {
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [selectedHabitForAnalytics, setSelectedHabitForAnalytics] = useState(null);

  useEffect(() => {
    const init = async () => {
      const data = await storage.loadData();
      setAppData(data);
      setTheme(data.theme || 'dark');
      
      if (data.currentUser) {
        const user = data.users.find(u => u.id === data.currentUser);
        if (user) setCurrentUser(user);
      }
      
      setLoading(false);
      
      if ('Notification' in window) {
        await Notification.requestPermission();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (appData && !loading) {
      storage.saveData(appData);
    }
  }, [appData, loading]);

  const signUp = async (name, email, password) => {
    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: generateId(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      habits: [],
      moods: {},
      reflections: {}
    };
    
    const updatedData = {
      ...appData,
      users: [...appData.users, newUser],
      currentUser: newUser.id
    };
    
    setAppData(updatedData);
    setCurrentUser(newUser);
    return true;
  };

  const signIn = async (email, password) => {
    const hashedPassword = await hashPassword(password);
    const user = appData.users.find(u => u.email === email && u.password === hashedPassword);
    
    if (user) {
      setAppData({ ...appData, currentUser: user.id });
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const signOut = () => {
    setAppData({ ...appData, currentUser: null });
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setAppData({ ...appData, theme: newTheme });
  };

  const addHabit = (habitData) => {
    const newHabit = {
      id: generateId(),
      ...habitData,
      createdAt: new Date().toISOString(),
      completions: {},
      currentStreak: 0,
      longestStreak: 0
    };
    
    updateCurrentUser({
      ...currentUser,
      habits: [...currentUser.habits, newHabit]
    });
    setShowAddHabit(false);
  };

  const updateHabit = (habitId, updates) => {
    updateCurrentUser({
      ...currentUser,
      habits: currentUser.habits.map(h => h.id === habitId ? { ...h, ...updates } : h)
    });
    setEditingHabit(null);
  };

  const deleteHabit = (habitId) => {
    updateCurrentUser({
      ...currentUser,
      habits: currentUser.habits.filter(h => h.id !== habitId)
    });
  };

  const toggleHabitCompletion = (habitId, date) => {
    const dateKey = getDateKey(date);
    const habit = currentUser.habits.find(h => h.id === habitId);
    if (!habit) return;
    
    const completions = { ...habit.completions };
    if (completions[dateKey]) {
      delete completions[dateKey];
    } else {
      completions[dateKey] = true;
    }
    
    const { currentStreak, longestStreak } = calculateStreaks(habit, completions, date);
    updateHabit(habitId, { completions, currentStreak, longestStreak });
  };

  const calculateStreaks = (habit, completions, referenceDate) => {
    const dates = Object.keys(completions).sort().reverse();
    if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    let currentStreak = 0;
    let longestStreak = 0;
    
    let checkDate = new Date(referenceDate || new Date());
    while (true) {
      const key = getDateKey(checkDate);
      if (completions[key]) {
        currentStreak++;
      } else {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
      if (currentStreak > 365) break;
    }
    
    const sortedDates = Object.keys(completions).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      let tempStreak = 1;
      for (let j = i + 1; j < sortedDates.length; j++) {
        const diff = getDaysDifference(sortedDates[j], sortedDates[j - 1]);
        if (diff === 1 || (habit.frequency === 'weekly' && diff <= 7)) {
          tempStreak++;
        } else {
          break;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }
    
    return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
  };

  const setMood = (date, mood) => {
    const dateKey = getDateKey(date);
    updateCurrentUser({
      ...currentUser,
      moods: { ...currentUser.moods, [dateKey]: mood }
    });
  };

  const setReflection = (date, text) => {
    const dateKey = getDateKey(date);
    updateCurrentUser({
      ...currentUser,
      reflections: { ...currentUser.reflections, [dateKey]: text }
    });
  };

  const updateCurrentUser = (updatedUser) => {
    setAppData({
      ...appData,
      users: appData.users.map(u => u.id === updatedUser.id ? updatedUser : u)
    });
    setCurrentUser(updatedUser);
  };

  const getHabitStats = (habit) => {
    const completions = Object.keys(habit.completions || {});
    const totalDays = getDaysDifference(new Date(), new Date(habit.createdAt));
    const completionRate = totalDays > 0 ? (completions.length / totalDays) * 100 : 0;
    
    return {
      totalCompletions: completions.length,
      completionRate: completionRate.toFixed(1),
      currentStreak: habit.currentStreak || 0,
      longestStreak: habit.longestStreak || 0
    };
  };

  const getMonthlyData = (habit, month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = getDateKey(date);
      data.push({
        day,
        completed: habit.completions && habit.completions[dateKey] ? 1 : 0,
        date: dateKey
      });
    }
    return data;
  };

  const getYearlyData = (habit, year) => {
    const data = [];
    for (let month = 0; month < 12; month++) {
      const monthData = getMonthlyData(habit, month, year);
      const completions = monthData.filter(d => d.completed).length;
      const total = monthData.length;
      
      data.push({
        month: new Date(year, month).toLocaleDateString('en-US', { month: 'short' }),
        completionRate: total > 0 ? (completions / total) * 100 : 0,
        completions
      });
    }
    return data;
  };

  const getDailyQuote = () => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quote = motivationalQuotes[dayOfYear % motivationalQuotes.length];
    return quote.replace('{name}', currentUser?.name || 'there');
  };

  const getBestHabit = () => {
    if (!currentUser || currentUser.habits.length === 0) return null;
    return currentUser.habits.reduce((best, habit) => {
      const stats = getHabitStats(habit);
      const bestStats = best ? getHabitStats(best) : { currentStreak: 0 };
      return stats.currentStreak > bestStats.currentStreak ? habit : best;
    }, null);
  };

  if (loading) {
    return <LoadingScreen theme={theme} />;
  }

  if (!currentUser) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div className={`app ${theme}`}>
      <Header 
        user={currentUser} 
        onSignOut={signOut} 
        theme={theme}
        toggleTheme={toggleTheme}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard
            user={currentUser}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            toggleHabitCompletion={toggleHabitCompletion}
            setMood={setMood}
            setReflection={setReflection}
            getDailyQuote={getDailyQuote}
            getBestHabit={getBestHabit}
            onAddHabit={() => setShowAddHabit(true)}
            onEditHabit={setEditingHabit}
            onDeleteHabit={deleteHabit}
          />
        )}
        
        {currentView === 'calendar' && (
          <CalendarView
            user={currentUser}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}
        
        {currentView === 'analytics' && (
          <AnalyticsView
            user={currentUser}
            getHabitStats={getHabitStats}
            getMonthlyData={getMonthlyData}
            getYearlyData={getYearlyData}
            selectedHabit={selectedHabitForAnalytics}
            setSelectedHabit={setSelectedHabitForAnalytics}
          />
        )}
        
        {currentView === 'habits' && (
          <HabitsManager
            user={currentUser}
            onAddHabit={() => setShowAddHabit(true)}
            onEditHabit={setEditingHabit}
            onDeleteHabit={deleteHabit}
            getHabitStats={getHabitStats}
          />
        )}
      </main>
      
      {showAddHabit && (
        <HabitModal onClose={() => setShowAddHabit(false)} onSave={addHabit} theme={theme} />
      )}
      
      {editingHabit && (
        <HabitModal habit={editingHabit} onClose={() => setEditingHabit(null)} onSave={(data) => updateHabit(editingHabit.id, data)} theme={theme} />
      )}
      
      <GlobalStyles theme={theme} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// IMMERSIVE AUTH SCREEN — Bioluminescent Deep Ocean
// ═══════════════════════════════════════════════════

function FloatingOrb({ x, y, size, duration, delay, color }) {
  return (
    <div
      className="floating-orb"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

function ParticleField() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    duration: Math.random() * 12 + 8,
    delay: Math.random() * -15,
    opacity: Math.random() * 0.5 + 0.2,
  }));

  return (
    <div className="particle-field">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function RippleEffect({ mousePos }) {
  return (
    <div
      className="ripple-glow"
      style={{
        left: `${mousePos.x}px`,
        top: `${mousePos.y}px`,
      }}
    />
  );
}

function AuthScreen({ onSignIn, onSignUp, theme, toggleTheme }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mousePos, setMousePos] = useState({ x: -999, y: -999 });
  const [showPassword, setShowPassword] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const containerRef = useRef(null);

  const orbs = [
    { x: 10, y: 20, size: 300, duration: 18, delay: 0,   color: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' },
    { x: 75, y: 10, size: 250, duration: 22, delay: -5,  color: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' },
    { x: 85, y: 65, size: 350, duration: 26, delay: -9,  color: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)' },
    { x: 5,  y: 75, size: 280, duration: 20, delay: -13, color: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)' },
    { x: 45, y: 85, size: 200, duration: 16, delay: -7,  color: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)' },
  ];

  const handleMouseMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isSignUp) {
        if (!formData.name || !formData.email || !formData.password) {
          setError('All fields are required');
          return;
        }
        setSubmitSuccess(true);
        setTimeout(() => onSignUp(formData.name, formData.email, formData.password), 600);
      } else {
        const success = await onSignIn(formData.email, formData.password);
        if (!success) {
          setError('Invalid email or password');
        } else {
          setSubmitSuccess(true);
        }
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div
      className={`auth-immersive auth-immersive--${theme} ${submitSuccess ? 'success-state' : ''}`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Deep background layers */}
      <div className="auth-bg-layer auth-bg-base" />
      <div className="auth-bg-layer auth-bg-nebula" />
      <div className="auth-bg-layer auth-bg-vignette" />

      {/* Floating orbs */}
      {orbs.map((orb, i) => <FloatingOrb key={i} {...orb} />)}

      {/* Particle field */}
      <ParticleField />

      {/* Mouse ripple */}
      <RippleEffect mousePos={mousePos} />

      {/* Horizontal drift lines */}
      <div className="drift-lines">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="drift-line" style={{ top: `${15 + i * 18}%`, animationDelay: `${i * 1.8}s` }} />
        ))}
      </div>

      {/* Theme toggle */}
      <button className="auth-theme-btn" onClick={toggleTheme} title="Toggle theme">
        <span>{theme === 'dark' ? '☀' : '☾'}</span>
      </button>

      {/* Central card */}
      <div className={`auth-card ${isSignUp ? 'auth-card--signup' : ''}`}>
        {/* Card glow ring */}
        <div className="card-glow-ring" />

        {/* Logo area */}
        <div className="auth-brand">
          <div className="brand-icon">
            <div className="brand-icon-inner">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="url(#brandGrad)" strokeWidth="2" />
                <path d="M8 20 L12 14 L16 18 L20 10 L24 16" stroke="url(#brandGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="brandGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a78bfa" />
                    <stop offset="1" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="brand-text">
            <h1 className="auth-logo">Momentum</h1>
            <p className="auth-tagline">
              {isSignUp ? 'Begin your journey today.' : 'Welcome back, keep going.'}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${!isSignUp ? 'auth-tab--active' : ''}`}
            onClick={() => !isSignUp ? null : switchMode()}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${isSignUp ? 'auth-tab--active' : ''}`}
            onClick={() => isSignUp ? null : switchMode()}
          >
            Create Account
          </button>
          <div className={`auth-tab-indicator ${isSignUp ? 'auth-tab-indicator--right' : ''}`} />
        </div>

        {/* Form */}
        <form className="auth-form-new" onSubmit={handleSubmit}>
          <div className={`form-fields ${isSignUp ? 'form-fields--three' : 'form-fields--two'}`}>

            {isSignUp && (
              <div className={`auth-field ${focusedField === 'name' ? 'auth-field--focused' : ''} ${formData.name ? 'auth-field--filled' : ''}`}>
                <div className="field-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Your name"
                  required={isSignUp}
                  autoComplete="name"
                />
                <label>Your Name</label>
                <div className="field-underline" />
              </div>
            )}

            <div className={`auth-field ${focusedField === 'email' ? 'auth-field--focused' : ''} ${formData.email ? 'auth-field--filled' : ''}`}>
              <div className="field-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
              <label>Email Address</label>
              <div className="field-underline" />
            </div>

            <div className={`auth-field ${focusedField === 'password' ? 'auth-field--focused' : ''} ${formData.password ? 'auth-field--filled' : ''}`}>
              <div className="field-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              <label>Password</label>
              <button
                type="button"
                className="field-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M1 7.5s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <line x1="2" y1="13" x2="13" y2="2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M1 7.5s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5z" stroke="currentColor" strokeWidth="1.4"/>
                    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                )}
              </button>
              <div className="field-underline" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-error">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#f87171" strokeWidth="1.5"/>
                <path d="M7 4v3.5" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7" cy="10" r="0.75" fill="#f87171"/>
              </svg>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className={`auth-submit ${loading ? 'auth-submit--loading' : ''} ${submitSuccess ? 'auth-submit--success' : ''}`}
            disabled={loading || submitSuccess}
          >
            <span className="submit-text">
              {submitSuccess ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  &nbsp;Welcome!
                </>
              ) : loading ? (
                <span className="submit-spinner" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </span>
            <div className="submit-shine" />
          </button>

          {/* Switch mode */}
          <button type="button" className="auth-switch" onClick={switchMode}>
            {isSignUp ? (
              <>Already have an account? <span>Sign in →</span></>
            ) : (
              <>New here? <span>Create a free account →</span></>
            )}
          </button>
        </form>

        {/* Bottom ambient line */}
        <div className="card-bottom-glow" />
      </div>

      {/* Decorative bottom text */}
      <div className="auth-footer">
        Build habits that last · Track progress that matters
      </div>

      <AuthStyles />
    </div>
  );
}

// ═══════════════════════════════════════════════
// AUTH PAGE STYLES (scoped)
// ═══════════════════════════════════════════════
function AuthStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

      .auth-immersive {
        min-height: 100vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
        padding: 2rem 1rem 4rem;
        cursor: default;
      }

      /* ── BACKGROUNDS ── */
      .auth-bg-layer { position: absolute; inset: 0; pointer-events: none; }

      /* DARK theme base */
      .auth-immersive--dark .auth-bg-base {
        background: radial-gradient(ellipse 120% 100% at 50% 0%,
          #0d0a1e 0%,
          #080614 35%,
          #060410 60%,
          #040210 100%
        );
        z-index: 0;
      }

      /* LIGHT theme base */
      .auth-immersive--light .auth-bg-base {
        background: radial-gradient(ellipse 120% 100% at 50% 0%,
          #f0eeff 0%,
          #e8e4ff 30%,
          #eef4ff 65%,
          #f5f0ff 100%
        );
        z-index: 0;
      }

      .auth-bg-base {
        background: radial-gradient(ellipse 120% 100% at 50% 0%,
          #0d0a1e 0%, #080614 35%, #060410 60%, #040210 100%
        );
        z-index: 0;
      }

      .auth-bg-nebula {
        background:
          radial-gradient(ellipse 80% 60% at 20% 30%, rgba(99,102,241,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 80% 70%, rgba(56,189,248,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 50% 90%, rgba(139,92,246,0.06) 0%, transparent 60%);
        z-index: 1;
        animation: nebulaPulse 12s ease-in-out infinite;
      }

      /* Light mode nebula — softer, pastel tones */
      .auth-immersive--light .auth-bg-nebula {
        background:
          radial-gradient(ellipse 80% 60% at 20% 30%, rgba(99,102,241,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 80% 70%, rgba(56,189,248,0.10) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 50% 90%, rgba(139,92,246,0.09) 0%, transparent 60%);
      }

      .auth-immersive--light .auth-bg-vignette {
        background: radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(220,215,255,0.5) 100%);
      }

      @keyframes nebulaPulse {
        0%, 100% { opacity: 0.8; transform: scale(1); }
        50%       { opacity: 1;   transform: scale(1.04); }
      }

      .auth-bg-vignette {
        background: radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(2,1,8,0.7) 100%);
        z-index: 2;
      }

      /* ── ORBS ── */
      .floating-orb {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        z-index: 3;
        animation: orbDrift linear infinite;
        filter: blur(1px);
        transform: translate(-50%, -50%);
      }

      @keyframes orbDrift {
        0%   { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
        25%  { transform: translate(calc(-50% + 30px), calc(-50% - 20px)) scale(1.05) rotate(90deg); }
        50%  { transform: translate(calc(-50% + 15px), calc(-50% + 25px)) scale(0.95) rotate(180deg); }
        75%  { transform: translate(calc(-50% - 20px), calc(-50% + 10px)) scale(1.03) rotate(270deg); }
        100% { transform: translate(-50%, -50%) scale(1) rotate(360deg); }
      }

      /* ── PARTICLES ── */
      .particle-field { position: absolute; inset: 0; z-index: 4; pointer-events: none; }

      .particle {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(167,139,250,0.8) 0%, rgba(99,102,241,0.3) 60%, transparent 100%);
        animation: particleFloat linear infinite;
        box-shadow: 0 0 6px rgba(167,139,250,0.4);
      }

      @keyframes particleFloat {
        0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
        10%  { opacity: 1; }
        50%  { transform: translateY(-120px) translateX(20px); }
        90%  { opacity: 0.6; }
        100% { transform: translateY(-240px) translateX(-10px); opacity: 0; }
      }

      /* ── DRIFT LINES ── */
      .drift-lines { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; }

      .drift-line {
        position: absolute;
        left: -100%;
        width: 40%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(99,102,241,0.12), rgba(167,139,250,0.08), transparent);
        animation: lineDrift 18s linear infinite;
      }

      @keyframes lineDrift {
        0%   { left: -40%; opacity: 0; }
        5%   { opacity: 1; }
        95%  { opacity: 0.5; }
        100% { left: 100%; opacity: 0; }
      }

      /* ── RIPPLE ── */
      .ripple-glow {
        position: absolute;
        width: 400px;
        height: 400px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
        transform: translate(-50%, -50%);
        pointer-events: none;
        z-index: 5;
        transition: left 0.15s ease-out, top 0.15s ease-out;
      }

      /* ── THEME BUTTON ── */
      .auth-theme-btn {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        width: 42px;
        height: 42px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(167,139,250,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 20;
        font-size: 1.1rem;
        color: rgba(167,139,250,0.7);
        transition: all 0.3s ease;
        backdrop-filter: blur(8px);
      }
      .auth-theme-btn:hover {
        background: rgba(99,102,241,0.12);
        border-color: rgba(167,139,250,0.5);
        color: #a78bfa;
        transform: rotate(20deg) scale(1.1);
      }

      /* ── CARD ── */
      .auth-card {
        position: relative;
        z-index: 10;
        width: 100%;
        max-width: 420px;
        padding: 2.5rem 2.5rem 2rem;
        background: rgba(13, 10, 30, 0.72);
        border: 1px solid rgba(167, 139, 250, 0.18);
        border-radius: 24px;
        backdrop-filter: blur(24px) saturate(1.4);
        box-shadow:
          0 0 0 1px rgba(99,102,241,0.06),
          0 20px 80px rgba(0,0,0,0.6),
          0 0 60px rgba(99,102,241,0.06),
          inset 0 1px 0 rgba(255,255,255,0.06);
        animation: cardReveal 0.9s cubic-bezier(0.16,1,0.3,1) both;
        transition: transform 0.4s ease, box-shadow 0.4s ease;
      }

      /* Light mode card */
      .auth-immersive--light .auth-card {
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(99, 102, 241, 0.2);
        box-shadow:
          0 0 0 1px rgba(99,102,241,0.08),
          0 20px 80px rgba(99,102,241,0.12),
          0 0 60px rgba(99,102,241,0.05),
          inset 0 1px 0 rgba(255,255,255,0.9);
      }

      .auth-immersive--light .auth-card:hover {
        box-shadow:
          0 0 0 1px rgba(99,102,241,0.15),
          0 25px 100px rgba(99,102,241,0.18),
          inset 0 1px 0 rgba(255,255,255,0.9);
      }

      .auth-card:hover {
        box-shadow:
          0 0 0 1px rgba(99,102,241,0.1),
          0 25px 100px rgba(0,0,0,0.65),
          0 0 80px rgba(99,102,241,0.09),
          inset 0 1px 0 rgba(255,255,255,0.07);
      }

      @keyframes cardReveal {
        from { opacity: 0; transform: translateY(28px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)    scale(1); }
      }

      .card-glow-ring {
        position: absolute;
        inset: -1px;
        border-radius: 25px;
        background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(56,189,248,0.1), rgba(167,139,250,0.15), rgba(56,189,248,0.08));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        padding: 1px;
        pointer-events: none;
        opacity: 0.6;
        animation: ringShimmer 6s ease-in-out infinite;
      }

      @keyframes ringShimmer {
        0%, 100% { opacity: 0.4; }
        50%       { opacity: 0.9; }
      }

      .card-bottom-glow {
        position: absolute;
        bottom: -20px;
        left: 10%;
        right: 10%;
        height: 40px;
        background: radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%);
        filter: blur(12px);
        pointer-events: none;
      }

      /* ── BRAND ── */
      .auth-brand {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        margin-bottom: 2rem;
        animation: slideDown 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both;
      }

      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-12px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .brand-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(56,189,248,0.15));
        border: 1px solid rgba(167,139,250,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
        animation: iconPulse 4s ease-in-out infinite;
      }

      @keyframes iconPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.2); }
        50%       { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
      }

      .brand-icon-inner { animation: iconSpin 20s linear infinite; }
      @keyframes iconSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      .auth-logo {
        font-family: 'Cormorant Garamond', serif;
        font-size: 1.85rem;
        font-weight: 600;
        background: linear-gradient(135deg, #c4b5fd 0%, #93c5fd 50%, #a78bfa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        letter-spacing: 0.02em;
        line-height: 1.1;
        margin: 0;
      }

      /* Light mode — darker gradient so it's readable on white */
      .auth-immersive--light .auth-logo {
        background: linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #4f46e5 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .auth-tagline {
        font-size: 0.78rem;
        color: rgba(148,163,184,0.7);
        letter-spacing: 0.03em;
        margin: 0.15rem 0 0;
        font-weight: 400;
        font-style: italic;
        font-family: 'Cormorant Garamond', serif;
      }

      .auth-immersive--light .auth-tagline { color: rgba(100,100,130,0.75); }

      /* ── TABS ── */
      .auth-tabs {
        display: flex;
        position: relative;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 12px;
        padding: 4px;
        margin-bottom: 1.8rem;
        animation: slideDown 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both;
      }

      .auth-immersive--light .auth-tabs {
        background: rgba(99,102,241,0.05);
        border: 1px solid rgba(99,102,241,0.15);
      }

      .auth-tab {
        flex: 1;
        padding: 0.55rem;
        background: none;
        border: none;
        border-radius: 9px;
        font-size: 0.85rem;
        font-weight: 500;
        color: rgba(148,163,184,0.6);
        cursor: pointer;
        position: relative;
        z-index: 2;
        transition: color 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        letter-spacing: 0.01em;
      }

      .auth-tab--active { color: #e2e8f0; }
      .auth-immersive--light .auth-tab--active { color: #1e1b4b; }
      .auth-immersive--light .auth-tab:not(.auth-tab--active) { color: rgba(99,102,241,0.5); }
      .auth-tab:not(.auth-tab--active):hover { color: rgba(148,163,184,0.9); }
      .auth-immersive--light .auth-tab:not(.auth-tab--active):hover { color: rgba(99,102,241,0.8); }

      .auth-tab-indicator {
        position: absolute;
        left: 4px;
        top: 4px;
        bottom: 4px;
        width: calc(50% - 4px);
        background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2));
        border: 1px solid rgba(167,139,250,0.25);
        border-radius: 9px;
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow: 0 2px 12px rgba(99,102,241,0.15);
      }

      .auth-immersive--light .auth-tab-indicator {
        background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1));
        border: 1px solid rgba(99,102,241,0.3);
        box-shadow: 0 2px 12px rgba(99,102,241,0.1);
      }

      .auth-tab-indicator--right { transform: translateX(100%); }

      /* ── FORM FIELDS ── */
      .auth-form-new {
        display: flex;
        flex-direction: column;
        gap: 0;
        animation: slideDown 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both;
      }

      .form-fields { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }

      .auth-field {
        position: relative;
        display: flex;
        align-items: center;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 13px;
        transition: all 0.3s ease;
        overflow: hidden;
        height: 58px;
      }

      .auth-immersive--light .auth-field {
        background: rgba(99,102,241,0.04);
        border: 1px solid rgba(99,102,241,0.15);
      }

      .auth-field::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 13px;
        background: linear-gradient(135deg, rgba(99,102,241,0.08), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .auth-field--focused {
        border-color: rgba(167,139,250,0.45);
        background: rgba(99,102,241,0.07);
        box-shadow: 0 0 0 3px rgba(99,102,241,0.1), 0 4px 20px rgba(99,102,241,0.08);
      }

      .auth-immersive--light .auth-field--focused {
        border-color: rgba(99,102,241,0.5);
        background: rgba(99,102,241,0.06);
        box-shadow: 0 0 0 3px rgba(99,102,241,0.12), 0 4px 20px rgba(99,102,241,0.06);
      }

      .auth-field--focused::before { opacity: 1; }

      .field-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        flex-shrink: 0;
        color: rgba(148,163,184,0.4);
        transition: color 0.3s ease;
        position: relative;
        z-index: 2;
        align-self: stretch;
        padding-top: 0;
      }

      .auth-field--focused .field-icon,
      .auth-field--filled .field-icon { color: #a78bfa; }

      .auth-immersive--light .auth-field--focused .field-icon,
      .auth-immersive--light .auth-field--filled .field-icon { color: #6366f1; }

      /* FIX: Input uses padding-top to clear the floating label space */
      .auth-field input {
        flex: 1;
        height: 100%;
        background: none;
        border: none;
        outline: none;
        font-size: 0.9rem;
        color: #e2e8f0;
        font-family: 'DM Sans', sans-serif;
        font-weight: 400;
        padding: 18px 0.5rem 0 0;
        position: relative;
        z-index: 2;
        letter-spacing: 0.01em;
        width: 0; /* forces flex shrink to work correctly */
        min-width: 0;
      }

      .auth-immersive--light .auth-field input { color: #1e1b4b; }

      .auth-field input::placeholder {
        color: transparent; /* Hide placeholder — label serves that role */
      }

      /* Show placeholder only when NOT focused and NOT filled (fallback) */
      .auth-field:not(.auth-field--focused):not(.auth-field--filled) input::placeholder {
        color: rgba(148,163,184,0.35);
      }

      /* FIX: Label always starts centered, lifts when focused or filled */
      .auth-field label {
        position: absolute;
        left: 44px;
        right: 44px; /* prevent overlap with eye button */
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.88rem;
        color: rgba(148,163,184,0.5);
        pointer-events: none;
        transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 3;
        font-family: 'DM Sans', sans-serif;
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .auth-immersive--light .auth-field label { color: rgba(99,102,241,0.5); }

      /* When focused OR filled: lift label to top */
      .auth-field--focused label,
      .auth-field--filled label {
        top: 10px;
        transform: translateY(0);
        font-size: 0.67rem;
        color: #a78bfa;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 600;
      }

      .auth-immersive--light .auth-field--focused label,
      .auth-immersive--light .auth-field--filled label { color: #6366f1; }

      .field-underline {
        position: absolute;
        bottom: 0;
        left: 10%;
        right: 10%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #a78bfa, transparent);
        transform: scaleX(0);
        transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
      }

      .auth-immersive--light .field-underline {
        background: linear-gradient(90deg, transparent, #6366f1, transparent);
      }

      .auth-field--focused .field-underline { transform: scaleX(1); }

      .field-eye-btn {
        background: none;
        border: none;
        padding: 0 14px 0 6px;
        height: 100%;
        color: rgba(148,163,184,0.35);
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: color 0.3s ease;
        position: relative;
        z-index: 3;
        flex-shrink: 0;
      }
      .field-eye-btn:hover { color: #a78bfa; }
      .auth-immersive--light .field-eye-btn { color: rgba(99,102,241,0.35); }
      .auth-immersive--light .field-eye-btn:hover { color: #6366f1; }

      /* ── ERROR ── */
      .auth-error {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 0.9rem;
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.2);
        border-radius: 10px;
        color: #fca5a5;
        font-size: 0.82rem;
        margin-bottom: 0.8rem;
        animation: errorShake 0.4s ease;
      }

      .auth-immersive--light .auth-error {
        background: rgba(239,68,68,0.06);
        color: #dc2626;
      }

      @keyframes errorShake {
        0%, 100% { transform: translateX(0); }
        20%  { transform: translateX(-5px); }
        40%  { transform: translateX(5px); }
        60%  { transform: translateX(-3px); }
        80%  { transform: translateX(3px); }
      }

      /* ── SUBMIT BUTTON ── */
      .auth-submit {
        position: relative;
        width: 100%;
        height: 52px;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%);
        border: none;
        border-radius: 13px;
        color: white;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.92rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        cursor: pointer;
        overflow: hidden;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(99,102,241,0.3), 0 1px 3px rgba(0,0,0,0.4);
        margin-bottom: 0.9rem;
      }

      .auth-submit:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(99,102,241,0.45), 0 2px 6px rgba(0,0,0,0.4);
        background: linear-gradient(135deg, #5a51e8 0%, #8b44f0 50%, #7275f4 100%);
      }

      .auth-submit:active:not(:disabled) { transform: translateY(0); }
      .auth-submit:disabled { cursor: not-allowed; opacity: 0.8; }

      .auth-submit--success {
        background: linear-gradient(135deg, #059669, #10b981) !important;
        box-shadow: 0 8px 30px rgba(16,185,129,0.35) !important;
        animation: successPop 0.4s cubic-bezier(0.34,1.56,0.64,1);
      }

      @keyframes successPop {
        0%   { transform: scale(0.96); }
        60%  { transform: scale(1.03); }
        100% { transform: scale(1); }
      }

      .submit-text {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }

      .submit-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spinnerRotate 0.8s linear infinite;
        display: inline-block;
      }

      @keyframes spinnerRotate { to { transform: rotate(360deg); } }

      .submit-shine {
        position: absolute;
        top: 0;
        left: -100%;
        width: 60%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        animation: shineSweep 3.5s ease-in-out infinite;
      }

      @keyframes shineSweep {
        0%   { left: -100%; }
        30%  { left: 150%; }
        100% { left: 150%; }
      }

      /* ── SWITCH ── */
      .auth-switch {
        background: none;
        border: none;
        width: 100%;
        text-align: center;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.82rem;
        color: rgba(148,163,184,0.5);
        cursor: pointer;
        padding: 0.3rem;
        transition: color 0.3s ease;
        letter-spacing: 0.01em;
      }
      .auth-immersive--light .auth-switch { color: rgba(99,102,241,0.5); }
      .auth-switch span {
        color: #a78bfa;
        font-weight: 500;
        transition: all 0.3s ease;
      }
      .auth-immersive--light .auth-switch span { color: #6366f1; }
      .auth-switch:hover { color: rgba(148,163,184,0.8); }
      .auth-immersive--light .auth-switch:hover { color: rgba(99,102,241,0.8); }
      .auth-switch:hover span { color: #c4b5fd; text-decoration: underline; }
      .auth-immersive--light .auth-switch:hover span { color: #4f46e5; }

      /* ── THEME BUTTON ── */
      .auth-theme-btn {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
        width: 42px;
        height: 42px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(167,139,250,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 20;
        font-size: 1.1rem;
        color: rgba(167,139,250,0.7);
        transition: all 0.3s ease;
        backdrop-filter: blur(8px);
      }
      .auth-immersive--light .auth-theme-btn {
        background: rgba(99,102,241,0.08);
        border: 1px solid rgba(99,102,241,0.25);
        color: rgba(99,102,241,0.8);
      }
      .auth-theme-btn:hover {
        background: rgba(99,102,241,0.12);
        border-color: rgba(167,139,250,0.5);
        color: #a78bfa;
        transform: rotate(20deg) scale(1.1);
      }
      .auth-immersive--light .auth-theme-btn:hover {
        background: rgba(99,102,241,0.15);
        border-color: rgba(99,102,241,0.5);
        color: #4f46e5;
      }

      /* ── FOOTER ── */
      .auth-footer {
        position: absolute;
        bottom: 1.5rem;
        left: 0;
        right: 0;
        text-align: center;
        font-family: 'Cormorant Garamond', serif;
        font-size: 0.78rem;
        color: rgba(148,163,184,0.25);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        z-index: 10;
        font-style: italic;
        animation: fadeUp 1s ease 0.5s both;
      }
      .auth-immersive--light .auth-footer { color: rgba(99,102,241,0.3); }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* ── SUCCESS STATE ── */
      .success-state .auth-card {
        animation: successGlow 0.6s ease forwards;
      }

      @keyframes successGlow {
        to {
          box-shadow:
            0 0 0 1px rgba(16,185,129,0.2),
            0 25px 100px rgba(0,0,0,0.65),
            0 0 80px rgba(16,185,129,0.15),
            inset 0 1px 0 rgba(255,255,255,0.07);
        }
      }

      /* ── RESPONSIVE ── */
      @media (max-width: 480px) {
        .auth-card { padding: 2rem 1.5rem 1.8rem; max-width: 100%; }
        .auth-logo { font-size: 1.6rem; }
      }
    `}</style>
  );
}

// COMPONENTS
function LoadingScreen({ theme }) {
  return (
    <div className={`app ${theme}`}>
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading your journey...</p>
      </div>
      <GlobalStyles theme={theme} />
    </div>
  );
}

function Header({ user, onSignOut, theme, toggleTheme, currentView, setCurrentView }) {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">✨ Momentum</h1>
        
        <nav className="nav">
          <button className={currentView === 'dashboard' ? 'active' : ''} onClick={() => setCurrentView('dashboard')}>Dashboard</button>
          <button className={currentView === 'habits' ? 'active' : ''} onClick={() => setCurrentView('habits')}>Habits</button>
          <button className={currentView === 'calendar' ? 'active' : ''} onClick={() => setCurrentView('calendar')}>Calendar</button>
          <button className={currentView === 'analytics' ? 'active' : ''} onClick={() => setCurrentView('analytics')}>Analytics</button>
        </nav>
        
        <div className="header-actions">
          <button className="theme-toggle-btn" onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          <div className="user-menu">
            <span className="user-name">{user.name}</span>
            <button className="sign-out-btn" onClick={onSignOut}>Sign Out</button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Dashboard({ user, selectedDate, setSelectedDate, toggleHabitCompletion, setMood, setReflection, getDailyQuote, getBestHabit, onAddHabit, onEditHabit, onDeleteHabit }) {
  const dateKey = getDateKey(selectedDate);
  const currentMood = user.moods?.[dateKey];
  const currentReflection = user.reflections?.[dateKey] || '';
  const [reflectionText, setReflectionText] = useState(currentReflection);
  const bestHabit = getBestHabit();
  
  const moods = [
    { emoji: '😄', label: 'Amazing', value: 5 },
    { emoji: '🙂', label: 'Good', value: 4 },
    { emoji: '😐', label: 'Okay', value: 3 },
    { emoji: '😕', label: 'Not Great', value: 2 },
    { emoji: '😢', label: 'Difficult', value: 1 }
  ];
  
  const todayHabits = user.habits.filter(habit => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') {
      const day = selectedDate.getDay();
      return habit.selectedDays?.includes(day);
    }
    return true;
  });
  
  const completedToday = todayHabits.filter(h => h.completions?.[dateKey]).length;
  const totalToday = todayHabits.length;
  const completionPercentage = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  return (
    <div className="dashboard">
      <div className="quote-section">
        <p className="quote">{getDailyQuote()}</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{completedToday}/{totalToday}</div>
            <div className="stat-label">Today's Progress</div>
          </div>
          <div className="progress-ring">
            <svg width="80" height="80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - completionPercentage / 100)}`} transform="rotate(-90 40 40)" className="progress-circle" />
            </svg>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{user.habits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0)}</div>
            <div className="stat-label">Longest Active Streak</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{user.habits.length}</div>
            <div className="stat-label">Active Habits</div>
          </div>
        </div>
        
        {bestHabit && (
          <div className="stat-card best-habit">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{bestHabit.name}</div>
              <div className="stat-label">Best Habit - {bestHabit.currentStreak} day streak!</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="dashboard-grid">
        <div className="habits-section">
          <div className="section-header">
            <h2>Today's Habits</h2>
            <button className="add-btn" onClick={onAddHabit}>+ Add Habit</button>
          </div>
          
          {todayHabits.length === 0 ? (
            <div className="empty-state">
              <p>No habits yet! Start building your routine.</p>
              <button className="cta-btn" onClick={onAddHabit}>Create Your First Habit</button>
            </div>
          ) : (
            <div className="habits-list">
              {todayHabits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  date={selectedDate}
                  onToggle={() => toggleHabitCompletion(habit.id, selectedDate)}
                  onEdit={() => onEditHabit(habit)}
                  onDelete={() => onDeleteHabit(habit.id)}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="mood-reflection-section">
          <div className="mood-tracker">
            <h3>How are you feeling today?</h3>
            <div className="mood-options">
              {moods.map(mood => (
                <button key={mood.value} className={`mood-btn ${currentMood === mood.value ? 'selected' : ''}`} onClick={() => setMood(selectedDate, mood.value)} title={mood.label}>
                  <span className="mood-emoji">{mood.emoji}</span>
                  <span className="mood-label">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="reflection-section">
            <h3>Daily Reflection</h3>
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              onBlur={() => setReflection(selectedDate, reflectionText)}
              placeholder="How was your day? What did you learn?"
              className="reflection-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HabitCard({ habit, date, onToggle, onEdit, onDelete }) {
  const dateKey = getDateKey(date);
  const isCompleted = habit.completions?.[dateKey];
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={`habit-card ${isCompleted ? 'completed' : ''}`}>
      <div className="habit-main" onClick={onToggle}>
        <div className="habit-checkbox">
          {isCompleted && <span className="checkmark">✓</span>}
        </div>
        
        <div className="habit-info">
          <h4 className="habit-name">{habit.name}</h4>
          <div className="habit-meta">
            <span className="habit-frequency">{habit.frequency === 'daily' ? 'Daily' : 'Weekly'}</span>
            {habit.currentStreak > 0 && (
              <span className="habit-streak">🔥 {habit.currentStreak} day streak</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="habit-actions">
        <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>⋯</button>
        {showMenu && (
          <div className="habit-menu">
            <button onClick={() => { onEdit(); setShowMenu(false); }}>Edit</button>
            <button onClick={() => { if (confirm('Delete this habit?')) onDelete(); setShowMenu(false); }} className="delete-btn">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function HabitModal({ habit, onClose, onSave, theme }) {
  const [formData, setFormData] = useState({
    name: habit?.name || '',
    description: habit?.description || '',
    frequency: habit?.frequency || 'daily',
    selectedDays: habit?.selectedDays || [],
    difficulty: habit?.difficulty || 'medium'
  });
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };
  
  const toggleDay = (day) => {
    const days = formData.selectedDays.includes(day)
      ? formData.selectedDays.filter(d => d !== day)
      : [...formData.selectedDays, day];
    setFormData({ ...formData, selectedDays: days });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{habit ? 'Edit Habit' : 'Create New Habit'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label>Habit Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Morning meditation" required />
          </div>
          
          <div className="form-field">
            <label>Description (optional)</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What does this habit mean to you?" rows="3" />
          </div>
          
          <div className="form-field">
            <label>Frequency</label>
            <select value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Specific Days</option>
            </select>
          </div>
          
          {formData.frequency === 'weekly' && (
            <div className="form-field">
              <label>Select Days</label>
              <div className="day-selector">
                {weekDays.map((day, index) => (
                  <button key={day} type="button" className={`day-btn ${formData.selectedDays.includes(index) ? 'selected' : ''}`} onClick={() => toggleDay(index)}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="form-field">
            <label>Difficulty</label>
            <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="save-btn">{habit ? 'Save Changes' : 'Create Habit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CalendarView({ user, selectedMonth, setSelectedMonth, selectedDate, setSelectedDate }) {
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const prevMonth = () => setSelectedMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setSelectedMonth(new Date(year, month + 1, 1));
  
  const getDayData = (day) => {
    const date = new Date(year, month, day);
    const dateKey = getDateKey(date);
    const completedHabits = user.habits.filter(h => h.completions?.[dateKey]).length;
    const totalHabits = user.habits.length;
    const mood = user.moods?.[dateKey];
    const hasReflection = user.reflections?.[dateKey];
    return { completedHabits, totalHabits, mood, hasReflection };
  };
  
  const renderCalendarDays = () => {
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const { completedHabits, totalHabits, mood, hasReflection } = getDayData(day);
      const date = new Date(year, month, day);
      const isToday = getDateKey(date) === getDateKey(new Date());
      const isSelected = getDateKey(date) === getDateKey(selectedDate);
      const completionRate = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;
      
      days.push(
        <div key={day} className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedDate(date)}>
          <div className="day-number">{day}</div>
          {totalHabits > 0 && <div className="day-progress" style={{ width: `${completionRate}%` }}></div>}
          <div className="day-indicators">
            {mood && <span className="mood-indicator">{['😢', '😕', '😐', '🙂', '😄'][mood - 1]}</span>}
            {hasReflection && <span className="reflection-indicator">📝</span>}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={prevMonth} className="nav-btn">←</button>
        <h2>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={nextMonth} className="nav-btn">→</button>
      </div>
      
      <div className="calendar-grid">
        <div className="weekday-header">Sun</div>
        <div className="weekday-header">Mon</div>
        <div className="weekday-header">Tue</div>
        <div className="weekday-header">Wed</div>
        <div className="weekday-header">Thu</div>
        <div className="weekday-header">Fri</div>
        <div className="weekday-header">Sat</div>
        {renderCalendarDays()}
      </div>
      
      <div className="legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'var(--accent)' }}></div>
          <span>Habit completion progress</span>
        </div>
        <div className="legend-item">
          <span>😄</span>
          <span>Daily mood</span>
        </div>
        <div className="legend-item">
          <span>📝</span>
          <span>Has reflection</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ user, getHabitStats, getMonthlyData, getYearlyData, selectedHabit, setSelectedHabit }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const habitToAnalyze = selectedHabit || user.habits[0];
  
  if (!habitToAnalyze) {
    return (
      <div className="analytics-empty">
        <h2>No habits to analyze yet</h2>
        <p>Create some habits to see your progress analytics!</p>
      </div>
    );
  }
  
  const stats = getHabitStats(habitToAnalyze);
  const monthlyData = getMonthlyData(habitToAnalyze, currentMonth, currentYear);
  const yearlyData = getYearlyData(habitToAnalyze, currentYear);

  return (
    <div className="analytics-view">
      <div className="analytics-header">
        <div>
          <h2>Analytics Dashboard</h2>
          <p>Track your progress and identify patterns</p>
        </div>
        
        <select value={habitToAnalyze.id} onChange={(e) => { const habit = user.habits.find(h => h.id === e.target.value); setSelectedHabit(habit); }} className="habit-select">
          {user.habits.map(habit => (
            <option key={habit.id} value={habit.id}>{habit.name}</option>
          ))}
        </select>
      </div>
      
      <div className="stats-overview">
        <div className="stat-box">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-number">{stats.totalCompletions}</div>
            <div className="stat-text">Total Completions</div>
          </div>
        </div>
        
        <div className="stat-box">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-number">{stats.completionRate}%</div>
            <div className="stat-text">Completion Rate</div>
          </div>
        </div>
        
        <div className="stat-box">
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <div className="stat-number">{stats.currentStreak}</div>
            <div className="stat-text">Current Streak</div>
          </div>
        </div>
        
        <div className="stat-box">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <div className="stat-number">{stats.longestStreak}</div>
            <div className="stat-text">Longest Streak</div>
          </div>
        </div>
      </div>
      
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Monthly Progress</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} />
              <Area type="monotone" dataKey="completed" stroke="var(--accent)" fillOpacity={1} fill="url(#colorCompleted)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h3>Yearly Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} />
              <Bar dataKey="completionRate" fill="var(--accent)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function HabitsManager({ user, onAddHabit, onEditHabit, onDeleteHabit, getHabitStats }) {
  return (
    <div className="habits-manager">
      <div className="manager-header">
        <div>
          <h2>Manage Your Habits</h2>
          <p>Edit, organize, and track all your habits</p>
        </div>
        <button className="add-habit-btn" onClick={onAddHabit}>+ Add New Habit</button>
      </div>
      
      {user.habits.length === 0 ? (
        <div className="empty-habits">
          <div className="empty-icon">📋</div>
          <h3>No habits yet</h3>
          <p>Start building better habits today!</p>
          <button className="create-first-btn" onClick={onAddHabit}>Create Your First Habit</button>
        </div>
      ) : (
        <div className="habits-grid">
          {user.habits.map(habit => {
            const stats = getHabitStats(habit);
            return (
              <div key={habit.id} className="habit-detail-card">
                <div className="habit-detail-header">
                  <h3>{habit.name}</h3>
                  <div className="habit-actions-menu">
                    <button onClick={() => onEditHabit(habit)} className="edit-icon">✏️</button>
                    <button onClick={() => { if (confirm(`Delete "${habit.name}"?`)) onDeleteHabit(habit.id); }} className="delete-icon">🗑️</button>
                  </div>
                </div>
                
                {habit.description && <p className="habit-description">{habit.description}</p>}
                
                <div className="habit-meta-info">
                  <span className="meta-badge">{habit.frequency === 'daily' ? 'Daily' : 'Weekly'}</span>
                  <span className="meta-badge difficulty">{habit.difficulty || 'medium'}</span>
                </div>
                
                <div className="habit-stats-grid">
                  <div className="mini-stat">
                    <div className="mini-stat-value">{stats.totalCompletions}</div>
                    <div className="mini-stat-label">Completions</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-value">{stats.completionRate}%</div>
                    <div className="mini-stat-label">Success Rate</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-value">{stats.currentStreak}</div>
                    <div className="mini-stat-label">Current Streak</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-value">{stats.longestStreak}</div>
                    <div className="mini-stat-label">Best Streak</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// GLOBAL STYLES
function GlobalStyles({ theme }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@400;500;600;700&display=swap');
      
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      .app {
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
        transition: all 0.3s ease;
        font-family: 'Outfit', -apple-system, sans-serif;
      }
      
      .app.dark {
        --bg: #0a0a0f;
        --bg-secondary: #13131a;
        --bg-tertiary: #1c1c26;
        --text: #e8e8f0;
        --text-secondary: #a0a0b8;
        --accent: #00d4ff;
        --accent-secondary: #ff006e;
        --success: #00ff87;
        --warning: #ffaa00;
        --border: #2a2a38;
        --shadow: rgba(0, 212, 255, 0.15);
      }
      
      .app.light {
        --bg: #fafbfd;
        --bg-secondary: #ffffff;
        --bg-tertiary: #f0f2f5;
        --text: #1a1a2e;
        --text-secondary: #666680;
        --accent: #0088ff;
        --accent-secondary: #e61e78;
        --success: #00cc6a;
        --warning: #ff8800;
        --border: #e0e2e8;
        --shadow: rgba(0, 136, 255, 0.1);
      }
      
      .loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 1.5rem; }
      .spinner { width: 50px; height: 50px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      
      .main-content { max-width: 1400px; margin: 0 auto; padding: 2rem; }
      
      .header { background: var(--bg-secondary); border-bottom: 2px solid var(--border); padding: 1.2rem 2rem; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); }
      .header-content { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
      .logo { font-size: 1.8rem; font-weight: 800; background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-family: 'Syne', sans-serif; }
      .nav { display: flex; gap: 0.5rem; flex: 1; justify-content: center; }
      .nav button { background: none; border: none; color: var(--text-secondary); padding: 0.7rem 1.5rem; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.3s ease; font-family: inherit; }
      .nav button:hover { background: var(--bg-tertiary); color: var(--text); }
      .nav button.active { background: var(--accent); color: white; }
      .header-actions { display: flex; align-items: center; gap: 1rem; }
      .theme-toggle-btn { background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 50%; width: 42px; height: 42px; font-size: 1.2rem; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; }
      .theme-toggle-btn:hover { transform: rotate(15deg); border-color: var(--accent); }
      .user-menu { display: flex; align-items: center; gap: 1rem; }
      .user-name { font-weight: 600; color: var(--text); }
      .sign-out-btn { background: var(--bg-tertiary); border: 2px solid var(--border); color: var(--text); padding: 0.6rem 1.2rem; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.3s ease; font-family: inherit; }
      .sign-out-btn:hover { border-color: var(--accent-secondary); color: var(--accent-secondary); }
      
      .dashboard { display: flex; flex-direction: column; gap: 2rem; }
      .quote-section { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); padding: 2.5rem; border-radius: 20px; text-align: center; animation: fadeIn 0.6s ease; }
      .quote { color: white; font-size: 1.4rem; font-weight: 600; line-height: 1.6; max-width: 800px; margin: 0 auto; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
      .stat-card { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; gap: 1rem; position: relative; transition: all 0.3s ease; animation: slideIn 0.6s ease; }
      .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px var(--shadow); border-color: var(--accent); }
      .stat-card.best-habit { background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 0, 110, 0.1)); border-color: var(--accent); }
      .stat-icon { font-size: 2.5rem; }
      .stat-content { flex: 1; }
      .stat-value { font-size: 2rem; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 0.3rem; }
      .stat-label { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; }
      .progress-ring { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); }
      .progress-circle { transition: stroke-dashoffset 0.6s ease; }
      .dashboard-grid { display: grid; grid-template-columns: 1fr 400px; gap: 2rem; }
      .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
      .section-header h2 { font-size: 1.8rem; font-weight: 800; }
      .add-btn { background: var(--accent); color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
      .add-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px var(--shadow); }
      .empty-state { background: var(--bg-secondary); border: 2px dashed var(--border); border-radius: 16px; padding: 3rem; text-align: center; }
      .empty-state p { color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 1.1rem; }
      .cta-btn { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
      .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--shadow); }
      .habits-list { display: flex; flex-direction: column; gap: 1rem; }
      .habit-card { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 14px; padding: 1.2rem; display: flex; align-items: center; justify-content: space-between; transition: all 0.3s ease; position: relative; animation: slideIn 0.4s ease; }
      .habit-card:hover { transform: translateX(4px); border-color: var(--accent); }
      .habit-card.completed { background: linear-gradient(135deg, rgba(0, 255, 135, 0.05), rgba(0, 212, 255, 0.05)); border-color: var(--success); }
      .habit-main { display: flex; align-items: center; gap: 1rem; flex: 1; cursor: pointer; }
      .habit-checkbox { width: 28px; height: 28px; border: 2px solid var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; background: var(--bg-tertiary); }
      .habit-card.completed .habit-checkbox { background: var(--success); border-color: var(--success); }
      .checkmark { color: white; font-weight: bold; font-size: 1.1rem; }
      .habit-info { flex: 1; }
      .habit-name { font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 0.3rem; }
      .habit-meta { display: flex; gap: 1rem; font-size: 0.85rem; }
      .habit-frequency { color: var(--text-secondary); background: var(--bg-tertiary); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 600; }
      .habit-streak { color: var(--warning); font-weight: 700; }
      .habit-actions { position: relative; }
      .menu-btn { background: none; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer; padding: 0.3rem 0.6rem; border-radius: 6px; transition: all 0.3s ease; }
      .menu-btn:hover { background: var(--bg-tertiary); color: var(--text); }
      .habit-menu { position: absolute; right: 0; top: 100%; margin-top: 0.5rem; background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 10px; padding: 0.5rem; box-shadow: 0 8px 24px var(--shadow); z-index: 10; min-width: 120px; }
      .habit-menu button { width: 100%; background: none; border: none; padding: 0.7rem 1rem; text-align: left; cursor: pointer; border-radius: 6px; color: var(--text); font-weight: 600; font-size: 0.9rem; transition: all 0.3s ease; font-family: inherit; }
      .habit-menu button:hover { background: var(--bg-tertiary); }
      .habit-menu button.delete-btn { color: var(--accent-secondary); }
      .habit-menu button.delete-btn:hover { background: rgba(255, 0, 110, 0.1); }
      .mood-reflection-section { display: flex; flex-direction: column; gap: 1.5rem; }
      .mood-tracker { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 16px; padding: 1.5rem; }
      .mood-tracker h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
      .mood-options { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; }
      .mood-btn { background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1rem 0.5rem; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
      .mood-btn:hover { transform: translateY(-2px); border-color: var(--accent); }
      .mood-btn.selected { background: var(--accent); border-color: var(--accent); transform: scale(1.05); }
      .mood-emoji { font-size: 1.8rem; }
      .mood-label { font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; }
      .mood-btn.selected .mood-label { color: white; }
      .reflection-section { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 16px; padding: 1.5rem; }
      .reflection-section h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
      .reflection-input { width: 100%; min-height: 150px; background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 12px; padding: 1rem; font-size: 0.95rem; color: var(--text); resize: vertical; font-family: inherit; transition: all 0.3s ease; }
      .reflection-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--shadow); }
      
      .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.3s ease; }
      .modal-content { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 20px; padding: 2rem; max-width: 550px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideUp 0.4s ease; }
      .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
      .modal-header h2 { font-size: 1.8rem; font-weight: 800; }
      .close-btn { background: none; border: none; font-size: 2rem; color: var(--text-secondary); cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.3s ease; }
      .close-btn:hover { background: var(--bg-tertiary); color: var(--text); }
      .modal-form { display: flex; flex-direction: column; gap: 1.5rem; }
      .form-field { display: flex; flex-direction: column; gap: 0.6rem; }
      .form-field label { font-weight: 700; font-size: 0.95rem; color: var(--text); }
      .form-field input, .form-field textarea, .form-field select { background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 10px; padding: 0.9rem 1.1rem; font-size: 1rem; color: var(--text); font-family: inherit; transition: all 0.3s ease; }
      .form-field input:focus, .form-field textarea:focus, .form-field select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px var(--shadow); }
      .day-selector { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; }
      .day-btn { background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 8px; padding: 0.7rem 0.3rem; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.3s ease; color: var(--text); font-family: inherit; }
      .day-btn:hover { border-color: var(--accent); }
      .day-btn.selected { background: var(--accent); border-color: var(--accent); color: white; }
      .modal-actions { display: flex; gap: 1rem; margin-top: 1rem; }
      .cancel-btn, .save-btn { flex: 1; padding: 1rem; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
      .cancel-btn { background: var(--bg-tertiary); border: 2px solid var(--border); color: var(--text); }
      .cancel-btn:hover { background: var(--bg); }
      .save-btn { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); border: none; color: white; }
      .save-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--shadow); }
      
      .calendar-view { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 20px; padding: 2rem; }
      .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
      .calendar-header h2 { font-size: 1.8rem; font-weight: 800; }
      .nav-btn { background: var(--bg-tertiary); border: 2px solid var(--border); border-radius: 10px; width: 44px; height: 44px; font-size: 1.3rem; cursor: pointer; transition: all 0.3s ease; color: var(--text); font-weight: 700; }
      .nav-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
      .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; }
      .weekday-header { text-align: center; font-weight: 700; color: var(--text-secondary); padding: 0.8rem; font-size: 0.9rem; }
      .calendar-day { aspect-ratio: 1; border: 2px solid var(--border); border-radius: 12px; padding: 0.5rem; cursor: pointer; transition: all 0.3s ease; position: relative; background: var(--bg-tertiary); display: flex; flex-direction: column; }
      .calendar-day.empty { background: transparent; border: none; cursor: default; }
      .calendar-day:hover:not(.empty) { transform: scale(1.05); border-color: var(--accent); box-shadow: 0 4px 16px var(--shadow); }
      .calendar-day.today { border-color: var(--accent); background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 0, 110, 0.1)); }
      .calendar-day.selected { background: var(--accent); border-color: var(--accent); }
      .calendar-day.selected .day-number { color: white; }
      .day-number { font-weight: 700; font-size: 1rem; color: var(--text); }
      .day-progress { height: 3px; background: var(--success); border-radius: 2px; margin-top: auto; margin-bottom: 0.3rem; transition: width 0.4s ease; }
      .day-indicators { display: flex; gap: 0.2rem; font-size: 0.8rem; }
      .legend { display: flex; gap: 2rem; margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--border); }
      .legend-item { display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem; }
      .legend-color { width: 20px; height: 20px; border-radius: 4px; }
      
      .analytics-view { display: flex; flex-direction: column; gap: 2rem; }
      .analytics-empty { text-align: center; padding: 4rem 2rem; }
      .analytics-empty h2 { font-size: 2rem; margin-bottom: 1rem; }
      .analytics-header { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
      .analytics-header h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.3rem; }
      .analytics-header p { color: var(--text-secondary); }
      .habit-select { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 10px; padding: 0.8rem 1.2rem; font-size: 1rem; color: var(--text); cursor: pointer; font-weight: 600; font-family: inherit; transition: all 0.3s ease; }
      .habit-select:focus { outline: none; border-color: var(--accent); }
      .stats-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
      .stat-box { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; gap: 1.2rem; transition: all 0.3s ease; }
      .stat-box:hover { transform: translateY(-4px); box-shadow: 0 12px 32px var(--shadow); border-color: var(--accent); }
      .stat-info { flex: 1; }
      .stat-number { font-size: 2.2rem; font-weight: 800; color: var(--text); line-height: 1; margin-bottom: 0.3rem; }
      .stat-text { font-size: 0.9rem; color: var(--text-secondary); font-weight: 600; }
      .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; }
      .chart-container { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 16px; padding: 1.5rem; }
      .chart-container h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text); }
      
      .habits-manager { display: flex; flex-direction: column; gap: 2rem; }
      .manager-header { display: flex; justify-content: space-between; align-items: center; }
      .manager-header h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.3rem; }
      .manager-header p { color: var(--text-secondary); }
      .add-habit-btn { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
      .add-habit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--shadow); }
      .empty-habits { background: var(--bg-secondary); border: 2px dashed var(--border); border-radius: 20px; padding: 4rem 2rem; text-align: center; }
      .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
      .empty-habits h3 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; }
      .empty-habits p { color: var(--text-secondary); margin-bottom: 2rem; }
      .create-first-btn { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); color: white; border: none; padding: 1rem 2rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; font-family: inherit; }
      .create-first-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px var(--shadow); }
      .habits-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
      .habit-detail-card { background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 16px; padding: 1.5rem; transition: all 0.3s ease; }
      .habit-detail-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px var(--shadow); border-color: var(--accent); }
      .habit-detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
      .habit-detail-header h3 { font-size: 1.3rem; font-weight: 800; flex: 1; }
      .habit-actions-menu { display: flex; gap: 0.5rem; }
      .habit-actions-menu button { background: var(--bg-tertiary); border: none; border-radius: 8px; width: 36px; height: 36px; cursor: pointer; transition: all 0.3s ease; font-size: 1.1rem; }
      .habit-actions-menu button:hover { transform: scale(1.1); }
      .edit-icon:hover { background: rgba(0, 212, 255, 0.2); }
      .delete-icon:hover { background: rgba(255, 0, 110, 0.2); }
      .habit-description { color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.5; }
      .habit-meta-info { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
      .meta-badge { background: var(--bg-tertiary); padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-transform: capitalize; }
      .habit-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
      .mini-stat { background: var(--bg-tertiary); border-radius: 10px; padding: 1rem; text-align: center; }
      .mini-stat-value { font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 0.3rem; }
      .mini-stat-label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; }
      
      @media (max-width: 1100px) { .dashboard-grid { grid-template-columns: 1fr; } }
      @media (max-width: 968px) { .header-content { flex-wrap: wrap; } .nav { order: 3; width: 100%; justify-content: flex-start; overflow-x: auto; } }
      @media (max-width: 768px) { .analytics-header { flex-direction: column; align-items: flex-start; } .charts-grid { grid-template-columns: 1fr; } .calendar-grid { gap: 0.3rem; } .calendar-day { padding: 0.3rem; } .day-number { font-size: 0.85rem; } .legend { flex-direction: column; gap: 0.8rem; } }
      @media (max-width: 600px) { .mood-options { grid-template-columns: repeat(3, 1fr); } .stat-value { font-size: 1.5rem; } }
      @media (max-width: 500px) { .header { padding: 1rem; } .header .logo { font-size: 1.5rem; } .user-name { display: none; } .main-content { padding: 1rem; } }
    `}</style>
  );
}
