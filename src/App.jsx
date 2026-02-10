import React, { useState, useEffect } from 'react';
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

function AuthScreen({ onSignIn, onSignUp, theme, toggleTheme }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        await onSignUp(formData.name, formData.email, formData.password);
      } else {
        const success = await onSignIn(formData.email, formData.password);
        if (!success) setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="logo">✨ Momentum</h1>
          <p className="tagline">Build habits that last. Track progress that matters.</p>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label>Your Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter your name" required={isSignUp} />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="your@email.com" required />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" required />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          
          <button type="button" className="switch-mode" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </form>
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
      
      .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        gap: 1.5rem;
      }
      
      .spinner {
        width: 50px;
        height: 50px;
        border: 3px solid var(--border);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      
      .main-content { max-width: 1400px; margin: 0 auto; padding: 2rem; }
      
      .auth-screen {
       .auth-layout {
  display: grid;
  grid-template-columns: 1fr 450px;
  width: 100%;
  max-width: 1100px;
  background: var(--bg-secondary);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 30px 80px var(--shadow);
  animation: slideUp 0.6s ease;
}

.auth-left {
  background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
  color: white;
  padding: 4rem 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-left h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.auth-left p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.auth-features {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-weight: 600;
}

.auth-card {
  padding: 3rem;
  background: var(--bg-secondary);
}

.auth-card .auth-header {
  margin-bottom: 2rem;
}

.auth-card h2 {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 0.3rem;
}

.auth-card p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

      }
      
      .theme-toggle {
        position: absolute;
        top: 2rem;
        right: 2rem;
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 50%;
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .theme-toggle:hover { transform: rotate(15deg) scale(1.1); border-color: var(--accent); }
      
      .auth-container {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 24px;
        padding: 3rem;
        max-width: 450px;
        width: 100%;
        box-shadow: 0 20px 60px var(--shadow);
        animation: slideUp 0.6s ease;
      }
      
      .auth-header { text-align: center; margin-bottom: 2.5rem; }
      
      .logo {
        font-size: 3rem;
        font-weight: 800;
        background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 0.5rem;
        font-family: 'Syne', sans-serif;
      }
      
      .tagline { color: var(--text-secondary); font-size: 0.95rem; }
      
      .auth-form { display: flex; flex-direction: column; gap: 1.5rem; }
      
      .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
      .form-group label { font-weight: 600; font-size: 0.9rem; color: var(--text); }
      .form-group input {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: 0.9rem 1.2rem;
        font-size: 1rem;
        color: var(--text);
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .form-group input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 4px var(--shadow);
      }
      
      .error-message {
        background: rgba(255, 0, 110, 0.1);
        color: var(--accent-secondary);
        padding: 0.8rem;
        border-radius: 8px;
        font-size: 0.9rem;
        border: 1px solid var(--accent-secondary);
      }
      
      .submit-btn {
        background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
        color: white;
        border: none;
        border-radius: 12px;
        padding: 1rem;
        font-size: 1.05rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 0.5rem;
        font-family: inherit;
      }
      .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px var(--shadow);
      }
      .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      
      .switch-mode {
        background: none;
        border: none;
        color: var(--accent);
        cursor: pointer;
        font-size: 0.9rem;
        padding: 0.5rem;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .switch-mode:hover { color: var(--accent-secondary); }
      
      .header {
        background: var(--bg-secondary);
        border-bottom: 2px solid var(--border);
        padding: 1.2rem 2rem;
        position: sticky;
        top: 0;
        z-index: 100;
        backdrop-filter: blur(10px);
      }
      
      .header-content {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2rem;
      }
      
      .header .logo { font-size: 1.8rem; }
      
      .nav { display: flex; gap: 0.5rem; flex: 1; justify-content: center; }
      .nav button {
        background: none;
        border: none;
        color: var(--text-secondary);
        padding: 0.7rem 1.5rem;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .nav button:hover { background: var(--bg-tertiary); color: var(--text); }
      .nav button.active { background: var(--accent); color: white; }
      
      .header-actions { display: flex; align-items: center; gap: 1rem; }
      
      .theme-toggle-btn {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 50%;
        width: 42px;
        height: 42px;
        font-size: 1.2rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .theme-toggle-btn:hover { transform: rotate(15deg); border-color: var(--accent); }
      
      .user-menu { display: flex; align-items: center; gap: 1rem; }
      .user-name { font-weight: 600; color: var(--text); }
      
      .sign-out-btn {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        color: var(--text);
        padding: 0.6rem 1.2rem;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .sign-out-btn:hover { border-color: var(--accent-secondary); color: var(--accent-secondary); }
      
      .dashboard { display: flex; flex-direction: column; gap: 2rem; }
      
      .quote-section {
        background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
        padding: 2.5rem;
        border-radius: 20px;
        text-align: center;
        animation: fadeIn 0.6s ease;
      }
      .quote {
        color: white;
        font-size: 1.4rem;
        font-weight: 600;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }
      
      .stat-card {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        position: relative;
        transition: all 0.3s ease;
        animation: slideIn 0.6s ease;
      }
      .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px var(--shadow);
        border-color: var(--accent);
      }
      .stat-card.best-habit {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 0, 110, 0.1));
        border-color: var(--accent);
      }
      
      .stat-icon { font-size: 2.5rem; }
      .stat-content { flex: 1; }
      .stat-value {
        font-size: 2rem;
        font-weight: 800;
        color: var(--text);
        line-height: 1;
        margin-bottom: 0.3rem;
      }
      .stat-label { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; }
      
      .progress-ring {
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%);
      }
      .progress-circle { transition: stroke-dashoffset 0.6s ease; }
      
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 2rem;
      }
      
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .section-header h2 { font-size: 1.8rem; font-weight: 800; }
      
      .add-btn {
        background: var(--accent);
        color: white;
        border: none;
        padding: 0.7rem 1.5rem;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .add-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px var(--shadow);
      }
      
      .empty-state {
        background: var(--bg-secondary);
        border: 2px dashed var(--border);
        border-radius: 16px;
        padding: 3rem;
        text-align: center;
      }
      .empty-state p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
      }
      
      .cta-btn {
        background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .cta-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px var(--shadow);
      }
      
      .habits-list { display: flex; flex-direction: column; gap: 1rem; }
      
      .habit-card {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 14px;
        padding: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.3s ease;
        position: relative;
        animation: slideIn 0.4s ease;
      }
      .habit-card:hover { transform: translateX(4px); border-color: var(--accent); }
      .habit-card.completed {
        background: linear-gradient(135deg, rgba(0, 255, 135, 0.05), rgba(0, 212, 255, 0.05));
        border-color: var(--success);
      }
      
      .habit-main { display: flex; align-items: center; gap: 1rem; flex: 1; cursor: pointer; }
      
      .habit-checkbox {
        width: 28px;
        height: 28px;
        border: 2px solid var(--border);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        background: var(--bg-tertiary);
      }
      .habit-card.completed .habit-checkbox {
        background: var(--success);
        border-color: var(--success);
      }
      .checkmark { color: white; font-weight: bold; font-size: 1.1rem; }
      
      .habit-info { flex: 1; }
      .habit-name { font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 0.3rem; }
      .habit-meta { display: flex; gap: 1rem; font-size: 0.85rem; }
      .habit-frequency {
        color: var(--text-secondary);
        background: var(--bg-tertiary);
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        font-weight: 600;
      }
      .habit-streak { color: var(--warning); font-weight: 700; }
      
      .habit-actions { position: relative; }
      .menu-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.3rem 0.6rem;
        border-radius: 6px;
        transition: all 0.3s ease;
      }
      .menu-btn:hover { background: var(--bg-tertiary); color: var(--text); }
      
      .habit-menu {
        position: absolute;
        right: 0;
        top: 100%;
        margin-top: 0.5rem;
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 10px;
        padding: 0.5rem;
        box-shadow: 0 8px 24px var(--shadow);
        z-index: 10;
        min-width: 120px;
      }
      .habit-menu button {
        width: 100%;
        background: none;
        border: none;
        padding: 0.7rem 1rem;
        text-align: left;
        cursor: pointer;
        border-radius: 6px;
        color: var(--text);
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .habit-menu button:hover { background: var(--bg-tertiary); }
      .habit-menu button.delete-btn { color: var(--accent-secondary); }
      .habit-menu button.delete-btn:hover { background: rgba(255, 0, 110, 0.1); }
      
      .mood-reflection-section { display: flex; flex-direction: column; gap: 1.5rem; }
      
      .mood-tracker {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
      }
      .mood-tracker h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
      
      .mood-options { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; }
      
      .mood-btn {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: 1rem 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
      }
      .mood-btn:hover { transform: translateY(-2px); border-color: var(--accent); }
      .mood-btn.selected {
        background: var(--accent);
        border-color: var(--accent);
        transform: scale(1.05);
      }
      .mood-emoji { font-size: 1.8rem; }
      .mood-label { font-size: 0.7rem; color: var(--text-secondary); font-weight: 600; }
      .mood-btn.selected .mood-label { color: white; }
      
      .reflection-section {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
      }
      .reflection-section h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; }
      
      .reflection-input {
        width: 100%;
        min-height: 150px;
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: 1rem;
        font-size: 0.95rem;
        color: var(--text);
        resize: vertical;
        font-family: inherit;
        transition: all 0.3s ease;
      }
      .reflection-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 4px var(--shadow);
      }
      
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
        animation: fadeIn 0.3s ease;
      }
      
      .modal-content {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 20px;
        padding: 2rem;
        max-width: 550px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.4s ease;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
      }
      .modal-header h2 { font-size: 1.8rem; font-weight: 800; }
      
      .close-btn {
        background: none;
        border: none;
        font-size: 2rem;
        color: var(--text-secondary);
        cursor: pointer;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
      .close-btn:hover { background: var(--bg-tertiary); color: var(--text); }
      
      .modal-form { display: flex; flex-direction: column; gap: 1.5rem; }
      
      .form-field { display: flex; flex-direction: column; gap: 0.6rem; }
      .form-field label { font-weight: 700; font-size: 0.95rem; color: var(--text); }
      .form-field input,
      .form-field textarea,
      .form-field select {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 10px;
        padding: 0.9rem 1.1rem;
        font-size: 1rem;
        color: var(--text);
        font-family: inherit;
        transition: all 0.3s ease;
      }
      .form-field input:focus,
      .form-field textarea:focus,
      .form-field select:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 4px var(--shadow);
      }
      
      .day-selector { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; }
      
      .day-btn {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 8px;
        padding: 0.7rem 0.3rem;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text);
        font-family: inherit;
      }
      .day-btn:hover { border-color: var(--accent); }
      .day-btn.selected {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
      }
      
      .modal-actions { display: flex; gap: 1rem; margin-top: 1rem; }
      
      .cancel-btn,
      .save-btn {
        flex: 1;
        padding: 1rem;
        border-radius: 10px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      
      .cancel-btn {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        color: var(--text);
      }
      .cancel-btn:hover { background: var(--bg); }
      
      .save-btn {
        background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
        border: none;
        color: white;
      }
      .save-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px var(--shadow);
      }
      
      .calendar-view {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 20px;
        padding: 2rem;
      }
      
      .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
      }
      .calendar-header h2 { font-size: 1.8rem; font-weight: 800; }
      
      .nav-btn {
        background: var(--bg-tertiary);
        border: 2px solid var(--border);
        border-radius: 10px;
        width: 44px;
        height: 44px;
        font-size: 1.3rem;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text);
        font-weight: 700;
      }
      .nav-btn:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
      }
      
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.5rem;
      }
      
      .weekday-header {
        text-align: center;
        font-weight: 700;
        color: var(--text-secondary);
        padding: 0.8rem;
        font-size: 0.9rem;
      }
      
      .calendar-day {
        aspect-ratio: 1;
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: 0.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        background: var(--bg-tertiary);
        display: flex;
        flex-direction: column;
      }
      .calendar-day.empty {
        background: transparent;
        border: none;
        cursor: default;
      }
      .calendar-day:hover:not(.empty) {
        transform: scale(1.05);
        border-color: var(--accent);
        box-shadow: 0 4px 16px var(--shadow);
      }
      .calendar-day.today {
        border-color: var(--accent);
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(255, 0, 110, 0.1));
      }
      .calendar-day.selected {
        background: var(--accent);
        border-color: var(--accent);
      }
      .calendar-day.selected .day-number { color: white; }
      
      .day-number { font-weight: 700; font-size: 1rem; color: var(--text); }
      
      .day-progress {
        height: 3px;
        background: var(--success);
        border-radius: 2px;
        margin-top: auto;
        margin-bottom: 0.3rem;
        transition: width 0.4s ease;
      }
      
      .day-indicators { display: flex; gap: 0.2rem; font-size: 0.8rem; }
      
      .legend {
        display: flex;
        gap: 2rem;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 2px solid var(--border);
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
      .legend-color { width: 20px; height: 20px; border-radius: 4px; }
      
      .analytics-view { display: flex; flex-direction: column; gap: 2rem; }
      .analytics-empty { text-align: center; padding: 4rem 2rem; }
      .analytics-empty h2 { font-size: 2rem; margin-bottom: 1rem; }
      
      .analytics-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
      }
      .analytics-header h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.3rem; }
      .analytics-header p { color: var(--text-secondary); }
      
      .habit-select {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 10px;
        padding: 0.8rem 1.2rem;
        font-size: 1rem;
        color: var(--text);
        cursor: pointer;
        font-weight: 600;
        font-family: inherit;
        transition: all 0.3s ease;
      }
      .habit-select:focus { outline: none; border-color: var(--accent); }
      
      .stats-overview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
      }
      
      .stat-box {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1.2rem;
        transition: all 0.3s ease;
      }
      .stat-box:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px var(--shadow);
        border-color: var(--accent);
      }
      
      .stat-info { flex: 1; }
      .stat-number {
        font-size: 2.2rem;
        font-weight: 800;
        color: var(--text);
        line-height: 1;
        margin-bottom: 0.3rem;
      }
      .stat-text { font-size: 0.9rem; color: var(--text-secondary); font-weight: 600; }
      
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 2rem;
      }
      
      .chart-container {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
      }
      .chart-container h3 {
        font-size: 1.2rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        color: var(--text);
      }
      
      .habits-manager { display: flex; flex-direction: column; gap: 2rem; }
      
      .manager-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .manager-header h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.3rem; }
      .manager-header p { color: var(--text-secondary); }
      
      .add-habit-btn {
        background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .add-habit-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px var(--shadow);
      }
      
      .empty-habits {
        background: var(--bg-secondary);
        border: 2px dashed var(--border);
        border-radius: 20px;
        padding: 4rem 2rem;
        text-align: center;
      }
      .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
      .empty-habits h3 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; }
      .empty-habits p { color: var(--text-secondary); margin-bottom: 2rem; }
      
      .create-first-btn {
        background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .create-first-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px var(--shadow);
      }
      
      .habits-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.5rem;
      }
      
      .habit-detail-card {
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 1.5rem;
        transition: all 0.3s ease;
      }
      .habit-detail-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px var(--shadow);
        border-color: var(--accent);
      }
      
      .habit-detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
      }
      .habit-detail-header h3 { font-size: 1.3rem; font-weight: 800; flex: 1; }
      
      .habit-actions-menu { display: flex; gap: 0.5rem; }
      .habit-actions-menu button {
        background: var(--bg-tertiary);
        border: none;
        border-radius: 8px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1.1rem;
      }
      .habit-actions-menu button:hover { transform: scale(1.1); }
      .edit-icon:hover { background: rgba(0, 212, 255, 0.2); }
      .delete-icon:hover { background: rgba(255, 0, 110, 0.2); }
      
      .habit-description {
        color: var(--text-secondary);
        font-size: 0.95rem;
        margin-bottom: 1rem;
        line-height: 1.5;
      }
      
      .habit-meta-info { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
      .meta-badge {
        background: var(--bg-tertiary);
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: capitalize;
      }
      
      .habit-stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }
      
      .mini-stat {
        background: var(--bg-tertiary);
        border-radius: 10px;
        padding: 1rem;
        text-align: center;
      }
      .mini-stat-value {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--text);
        margin-bottom: 0.3rem;
      }
      .mini-stat-label {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 600;
      }
      
      @media (max-width: 1100px) {
        .dashboard-grid { grid-template-columns: 1fr; }
      }
      
      @media (max-width: 968px) {
        .header-content { flex-wrap: wrap; }
        .nav { order: 3; width: 100%; justify-content: flex-start; overflow-x: auto; }
      }
      
      @media (max-width: 768px) {
        .analytics-header { flex-direction: column; align-items: flex-start; }
        .charts-grid { grid-template-columns: 1fr; }
        .calendar-grid { gap: 0.3rem; }
        .calendar-day { padding: 0.3rem; }
        .day-number { font-size: 0.85rem; }
        .legend { flex-direction: column; gap: 0.8rem; }
      }
      
      @media (max-width: 600px) {
        .mood-options { grid-template-columns: repeat(3, 1fr); }
        .stat-value { font-size: 1.5rem; }
      }
      
      @media (max-width: 500px) {
        .header { padding: 1rem; }
        .header .logo { font-size: 1.5rem; }
        .user-name { display: none; }
        .main-content { padding: 1rem; }
        .auth-container { padding: 2rem; }
      }
      @media (max-width: 900px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }

  .auth-left {
    display: none;
  }
}

    `}</style>
  );
}
