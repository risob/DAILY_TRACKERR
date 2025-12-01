import { useState, useEffect, useMemo } from 'react';
// DEPENDENCIES: npm install firebase recharts lucide-react

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { 
  Check, ChevronLeft, ChevronRight, LayoutDashboard, 
  Sun, Moon, Activity, Brain, DollarSign, Trophy, Book, Flame, 
  Cloud, LogIn, Settings, Plus, Trash2,
  PenTool, Coffee, Music, Smile, Heart, Zap
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ------------------------------------------------------------------
// ⚠️ PASTE YOUR FIREBASE KEYS HERE AGAIN ⚠️
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDOZ61L3Js0Ax4WU6jVf8gqJECPVVDkRok",
  authDomain: "habit-tracker-80016.firebaseapp.com",
  projectId: "habit-tracker-80016",
  storageBucket: "habit-tracker-80016.firebasestorage.app",
  messagingSenderId: "363703002736",
  appId: "1:363703002736:web:d70656f5e104dfce3236b5",
  measurementId: "G-C8SZJ703Z4"
};

// Initialize Firebase safely
const app = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// --- ICONS & CONFIG ---
const ICON_MAP: any = {
  sun: Sun, moon: Moon, activity: Activity, check: Check, brain: Brain,
  dollar: DollarSign, trophy: Trophy, book: Book, layout: LayoutDashboard,
  flame: Flame, pen: PenTool, coffee: Coffee, music: Music, smile: Smile,
  heart: Heart, zap: Zap
};

const DEFAULT_HABITS = [
  { id: 'h1', label: 'Wake at 6:00 AM', icon: 'sun', category: 'Health' },
  { id: 'h2', label: 'Sleep at 10:00 PM', icon: 'moon', category: 'Health' },
  { id: 'h3', label: 'Exercise 30mins', icon: 'activity', category: 'Health' },
  { id: 'h4', label: '1hr before bed (No Screen)', icon: 'check', category: 'Wellness' },
  { id: 'h5', label: '5hrs deep work', icon: 'brain', category: 'Productivity' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// --- UTILITY FUNCTIONS ---
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr: any) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const getDaysInMonth = (year: any, month: any) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: any, month: any) => new Date(year, month, 1).getDay();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [dashboardId, setDashboardId] = useState('');
  const [tempId, setTempId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [viewDate, setViewDate] = useState(new Date());
  
  // Data State
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [history, setHistory] = useState<any>({});
  const [configError, setConfigError] = useState(false);

  // New Habit Form State
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('zap');
  // Removed unused category setter
  const [newHabitCategory] = useState('General'); 

  // 1. Check Config & Initialize Auth
  useEffect(() => {
    if (!app || !auth) {
      setConfigError(true);
      return;
    }
    // Fixed: Cast auth to 'any'
    signInAnonymously(auth as any).catch((error) => console.error("Auth Error:", error));
    const unsubscribe = onAuthStateChanged(auth as any, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Load Dashboard ID
  useEffect(() => {
    const savedId = localStorage.getItem('myDashboardId');
    if (savedId) setDashboardId(savedId);
  }, []);

  // 3. Sync with Firebase
  useEffect(() => {
    if (!user || !dashboardId || !db) return;
    const docRef = doc(db, 'trackers', dashboardId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHistory(data.history || {});
        if (data.habitDefinitions && data.habitDefinitions.length > 0) {
          setHabits(data.habitDefinitions);
        }
      } else {
        setDoc(docRef, { 
          history: {}, 
          habitDefinitions: DEFAULT_HABITS 
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, [user, dashboardId]);

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (tempId.trim().length > 3) {
      const cleanId = tempId.trim().toLowerCase().replace(/\s+/g, '-');
      localStorage.setItem('myDashboardId', cleanId);
      setDashboardId(cleanId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('myDashboardId');
    setDashboardId('');
    setTempId('');
    setHistory({});
    setHabits(DEFAULT_HABITS);
  };

  const toggleHabit = async (habitId: any) => {
    if (!user || !dashboardId || !db) return;
    const currentCompleted = history[selectedDate] || [];
    const isCompleted = currentCompleted.includes(habitId);
    
    let newCompleted;
    if (isCompleted) {
      newCompleted = currentCompleted.filter((id: any) => id !== habitId);
    } else {
      newCompleted = [...currentCompleted, habitId];
    }

    const newHistory = { ...history, [selectedDate]: newCompleted };
    setHistory(newHistory);
    await setDoc(doc(db, 'trackers', dashboardId), { history: newHistory }, { merge: true });
  };

  const addHabit = async (e: any) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit = {
      id: `h-${Date.now()}`,
      label: newHabitName,
      icon: newHabitIcon,
      category: newHabitCategory
    };

    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);
    setNewHabitName('');
    if (dashboardId && db) {
      await setDoc(doc(db, 'trackers', dashboardId), { habitDefinitions: updatedHabits }, { merge: true });
    }
  };

  const deleteHabit = async (habitId: any) => {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    const updatedHabits = habits.filter(h => h.id !== habitId);
    setHabits(updatedHabits);
    if (dashboardId && db) {
      await setDoc(doc(db, 'trackers', dashboardId), { habitDefinitions: updatedHabits }, { merge: true });
    }
  };

  const todayProgress = useMemo(() => {
    if (habits.length === 0) return 0;
    const completedCount = (history[selectedDate] || []).length;
    return Math.round((completedCount / habits.length) * 100);
  }, [history, selectedDate, habits]);

  const getCompletionForDate = (dateStr: any) => {
    if (habits.length === 0) return 0;
    const completedCount = (history[dateStr] || []).length;
    return Math.round((completedCount / habits.length) * 100);
  };

  const renderAnalytics = () => {
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      chartData.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        score: getCompletionForDate(dateStr)
      });
    }

    const habitStats = habits.map(habit => {
      let count = 0;
      const daysToCheck = 30;
      for (let i = 0; i < daysToCheck; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if ((history[dateStr] || []).includes(habit.id)) {
          count++;
        }
      }
      return { ...habit, count, percentage: Math.round((count / daysToCheck) * 100) };
    }).sort((a, b) => b.count - a.count);

    let strongest: any[], weakest: any[];
    if (habitStats.length <= 10) {
      const mid = Math.ceil(habitStats.length / 2);
      strongest = habitStats.slice(0, mid);
      weakest = habitStats.slice(mid);
    } else {
      strongest = habitStats.slice(0, 5);
      weakest = habitStats.slice(habitStats.length - 5);
    }

    return (
      <div className="space-y-8 w-full animate-in fade-in duration-500">
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <Activity className="mr-2 text-blue-500" /> 
            30 Day Performance
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} unit="%" />
                <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={4} dot={{r: 0}} activeDot={{r: 8, fill: '#2563eb', strokeWidth: 4, stroke: '#fff'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 text-green-600 flex items-center">
              <Trophy className="mr-2" size={20} /> Strongest Habits
            </h3>
            <div className="space-y-5">
              {strongest.map((stat, i) => (
                <div key={stat.id} className="flex items-center">
                  <span className="w-6 text-slate-300 text-sm font-bold">#{i+1}</span>
                  <div className="flex-1 ml-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-slate-700">{stat.label}</span>
                      <span className="text-sm font-bold text-green-600">{stat.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stat.percentage}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {habitStats.length === 0 && <div className="text-slate-400 text-sm">No data yet</div>}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 text-orange-500 flex items-center">
              <Flame className="mr-2" size={20} /> Needs Focus
            </h3>
            <div className="space-y-5">
              {/* Fixed: Removed the unused 'i' variable from the map function */}
              {weakest.map((stat) => (
                <div key={stat.id} className="flex items-center">
                   <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-slate-700">{stat.label}</span>
                      <span className="text-sm font-bold text-orange-400">{stat.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-orange-400 h-2.5 rounded-full" style={{ width: `${stat.percentage}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {habitStats.length === 0 && <div className="text-slate-400 text-sm">Add more habits to see breakdown</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
          <Plus className="mr-2 text-blue-600" /> Add New Habit
        </h2>
        <form onSubmit={addHabit} className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="e.g. Morning Run, Sketching..." 
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
          />
          <select 
            className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={newHabitIcon}
            onChange={(e) => setNewHabitIcon(e.target.value)}
          >
            {Object.keys(ICON_MAP).map(key => (
              <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)} Icon</option>
            ))}
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
            Add Habit
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Your Habits List</h2>
        <div className="space-y-3">
          {habits.map((habit) => {
             const IconComp = ICON_MAP[habit.icon] || Activity;
             return (
              <div key={habit.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <IconComp size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-700">{habit.label}</div>
                    <div className="text-xs text-slate-400 capitalize">{habit.icon} • {habit.category || 'General'}</div>
                  </div>
                </div>
                <button 
                  onClick={() => deleteHabit(habit.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
             );
          })}
          {habits.length === 0 && (
            <div className="text-center py-10 text-slate-400">No habits yet. Add one above!</div>
          )}
        </div>
      </div>
    </div>
  );

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-red-50 text-red-800">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-4">Firebase Keys Missing!</h1>
          <p>You pasted the new code, but you forgot to put your keys back.</p>
          <p className="mt-4 text-sm bg-white p-4 rounded-lg border border-red-200 text-left">
            1. Scroll to lines 20-27 in the code.<br/>
            2. Delete the placeholder text.<br/>
            3. Paste your config from Firebase Console.<br/>
            4. Click 'Save' or 'Commit'.
          </p>
        </div>
      </div>
    );
  }

  if (!dashboardId) {
    return (
      <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-center p-6 text-center w-full">
         <style>{`html, body, #root { width: 100%; height: 100%; background-color: #e2e8f0; }`}</style>
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <Cloud size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Sync Your Habits</h1>
          <p className="text-slate-500 mb-8">Enter your Dashboard ID to access your tracker.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="e.g. alex-2025" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" value={tempId} onChange={(e) => setTempId(e.target.value)} autoFocus />
            <button type="submit" disabled={tempId.length < 4} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-blue-200 transition-all">
              <span>Access Dashboard</span>
              <ChevronRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`html, body, #root { width: 100%; height: 100%; background-color: #e2e8f0; overflow-x: hidden; display: block !important; max-width: none !important; }`}</style>
      <div className="min-h-screen w-full bg-slate-200 font-sans text-slate-900 pb-10">
        <nav className="bg-white border-b border-slate-200 w-full sticky top-0 z-50 shadow-sm">
          <div className="w-full px-8 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Check size={24} strokeWidth={3} />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 hidden sm:block">Focus<span className="text-blue-600">Tracker</span></h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {dashboardId && <div className="hidden md:flex items-center px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500"><div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>{dashboardId}</div>}
              
              <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
                <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Analytics</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Settings size={18} />
                </button>
              </div>
              
              {dashboardId && <button onClick={handleLogout} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><LogIn size={20} /></button>}
            </div>
          </div>
        </nav>

        <main className="w-full px-8 py-10">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start w-full animate-in fade-in duration-500">
              {/* Left Sidebar */}
              <div className="xl:col-span-4 space-y-6 w-full">
                <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
                  <h3 className="text-slate-500 font-bold text-xs mb-4 uppercase tracking-widest z-10 relative">Daily Progress</h3>
                  <div className="flex items-end justify-between mb-4 z-10 relative">
                    <span className="text-5xl font-black text-slate-800">{todayProgress}%</span>
                    <span className="text-sm font-medium text-slate-400 mb-2">{(history[selectedDate] || []).length}/{habits.length} Done</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 p-1">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${todayProgress}%` }}></div>
                  </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronLeft size={20} /></button>
                    <h3 className="font-bold text-slate-700 text-lg">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</h3>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"><ChevronRight size={20} /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-center mb-2">
                    {WEEKDAYS.map(d => <div key={d} className="text-xs font-bold text-slate-300 uppercase">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array(getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth())).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                    {Array(getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth())).fill(null).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const progress = getCompletionForDate(dateStr);
                      const isSelected = selectedDate === dateStr;
                      let bgClass = "bg-white text-slate-600 hover:bg-slate-50";
                      if (progress > 0) bgClass = "bg-blue-50 text-blue-600";
                      if (progress >= 50) bgClass = "bg-blue-100 text-blue-700 font-medium";
                      if (progress === 100) bgClass = "bg-blue-500 text-white shadow-md shadow-blue-200";
                      
                      return (
                        <button key={day} onClick={() => setSelectedDate(dateStr)} className={`aspect-square rounded-xl flex items-center justify-center text-sm transition-all duration-200 ${isSelected ? 'ring-2 ring-slate-800 ring-offset-2 scale-105 font-bold z-10' : ''} ${bgClass}`}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column (Habits) */}
              <div className="xl:col-span-8 w-full">
                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 min-h-[600px]">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">My Habits</h2>
                      <p className="text-slate-400 font-medium mt-1">{formatDate(selectedDate)}</p>
                    </div>
                    {selectedDate === getTodayString() && <span className="px-4 py-2 bg-green-100 text-green-700 text-xs font-bold rounded-full shadow-sm tracking-wide">TODAY</span>}
                  </div>
                  
                  {habits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Cloud size={48} className="mb-4 text-slate-300" />
                      <p>No habits found.</p>
                      <button onClick={() => setActiveTab('settings')} className="mt-4 text-blue-600 font-bold hover:underline">Create your first habit</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {habits.map((habit) => {
                        const isCompleted = (history[selectedDate] || []).includes(habit.id);
                        const IconComp = ICON_MAP[habit.icon] || Activity;
                        return (
                          <div key={habit.id} onClick={() => toggleHabit(habit.id)} className={`group flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative overflow-hidden ${isCompleted ? 'bg-blue-50/50 border-blue-500 shadow-inner' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-1'}`}>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-4 transition-all duration-300 ${isCompleted ? 'bg-blue-500 border-blue-500 scale-110' : 'border-slate-200 group-hover:border-blue-300'}`}>
                              {isCompleted && <Check size={16} className="text-white" />}
                            </div>
                            <div className="flex-1 z-10">
                              <div className={`font-bold text-base ${isCompleted ? 'text-slate-800' : 'text-slate-600'}`}>{habit.label}</div>
                              <div className="text-xs text-slate-400 mt-0.5 font-medium">{habit.category || 'General'}</div>
                            </div>
                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 ${isCompleted ? 'opacity-100' : ''}`}>
                              <IconComp size={20} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>
    </>
  );
}