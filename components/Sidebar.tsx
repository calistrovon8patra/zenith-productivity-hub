
import React from 'react';
import { View } from '../types';
import { CalendarIcon, CalendarDaysIcon, TargetIcon, BarChartIcon } from './icons';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  view: View;
  currentView: View;
  onClick: (view: View) => void;
}> = ({ icon, label, view, currentView, onClick }) => {
  const isActive = view === currentView;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
        isActive ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
      }`}
      aria-label={label}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <nav className="flex flex-col items-center w-24 bg-white border-r border-slate-200 p-4 space-y-6">
      <div className="text-blue-600 font-bold text-xl">Z</div>
      <div className="flex flex-col space-y-4">
        <NavItem icon={<CalendarIcon />} label="Today" view={View.Today} currentView={currentView} onClick={setCurrentView} />
        <NavItem icon={<CalendarDaysIcon />} label="Week" view={View.ThisWeek} currentView={currentView} onClick={setCurrentView} />
        <NavItem icon={<CalendarDaysIcon />} label="Month" view={View.ThisMonth} currentView={currentView} onClick={setCurrentView} />
        <NavItem icon={<TargetIcon />} label="Habits" view={View.Habits} currentView={currentView} onClick={setCurrentView} />
        <NavItem icon={<BarChartIcon />} label="Overview" view={View.Overview} currentView={currentView} onClick={setCurrentView} />
      </div>
    </nav>
  );
};
