
import React, { useState, useEffect, useCallback } from 'react';
import { View, Task, Habit, HabitEntry, FocusedSession } from './types';
import { Sidebar } from './components/Sidebar';
import TodayScreen from './screens/TodayScreen';
import WeekScreen from './screens/WeekScreen';
import MonthScreen from './screens/MonthScreen';
import HabitsScreen from './screens/HabitsScreen';
import OverviewScreen from './screens/OverviewScreen';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Today);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await db.init();
        setIsDbReady(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    };
    initDb();
  }, []);

  const renderView = () => {
    if (!isDbReady) {
      return <div className="flex items-center justify-center h-full">Loading...</div>;
    }
    switch (currentView) {
      case View.Today:
        return <TodayScreen />;
      case View.ThisWeek:
        return <WeekScreen />;
      case View.ThisMonth:
        return <MonthScreen />;
      case View.Habits:
        return <HabitsScreen />;
      case View.Overview:
        return <OverviewScreen />;
      default:
        return <TodayScreen />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
