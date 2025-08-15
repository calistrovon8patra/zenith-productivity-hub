import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Habit, HabitEntry, RepeatConfig } from '../types';
import { db } from '../services/db';
import { ChevronLeftIcon, ChevronRightIcon, FlameIcon, MoreVerticalIcon, RepeatIcon } from './icons';
import { getTodayDateString, yyyymmddToDate, dateToYYYYMMDD, addDays } from '../utils/date';

const CountGridPopup: React.FC<{
    targetCount: number;
    initialCount: number;
    onSave: (count: number) => void;
    onClose: () => void;
}> = ({ targetCount, initialCount, onSave, onClose }) => {
    const [selectedCount, setSelectedCount] = useState(initialCount);
    const popupRef = useRef<HTMLDivElement>(null);

    const handleBoxClick = (count: number) => {
        if (count === selectedCount) {
            setSelectedCount(count - 1);
        } else {
            setSelectedCount(count);
        }
    };
    
    const handleSave = () => {
        onSave(selectedCount);
    };
    
    const handleClear = () => {
        setSelectedCount(0);
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    return (
        <div ref={popupRef} className="bg-white shadow-lg rounded-lg p-2 w-auto max-w-xs mt-1">
            <div 
                className={`grid gap-1`} 
                style={{ gridTemplateColumns: `repeat(${Math.min(targetCount, 5)}, 1fr)`}}>
                {Array.from({ length: targetCount }, (_, i) => {
                    const count = i + 1;
                    const isSelected = count <= selectedCount;
                    return (
                        <button 
                            key={count} 
                            onClick={() => handleBoxClick(count)}
                            className={`h-6 w-6 rounded ${isSelected ? 'bg-blue-500' : 'bg-slate-200'} transition-colors hover:ring-2 hover:ring-blue-400`}
                            aria-label={`Set count to ${count}`}
                        />
                    );
                })}
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
                <button onClick={handleClear} className="p-2 rounded text-sm bg-slate-200 hover:bg-slate-300">Clear</button>
                <button onClick={handleSave} className="p-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700">Save</button>
            </div>
        </div>
    );
};


const isDateTrackable = (date: Date, repeatConfig: RepeatConfig): boolean => {
    switch (repeatConfig.type) {
        case 'daily': return true;
        case 'weekly': return repeatConfig.daysOfWeek?.includes(date.getDay()) ?? false;
        case 'monthly': return repeatConfig.daysOfMonth?.includes(date.getDate()) ?? false;
        default: return false;
    }
};

const HabitCalendar: React.FC<{
    habit: Habit;
    entries: HabitEntry[];
    currentMonth: Date;
    onEntryUpdate: (habitId: number) => void;
}> = ({ habit, entries, currentMonth, onEntryUpdate }) => {
    const [popupState, setPopupState] = useState<{ date: string; target: HTMLElement } | null>(null);
    const habitCreationDate = useMemo(() => {
        const d = new Date(habit.createdAt);
        d.setHours(0, 0, 0, 0);
        return d;
    }, [habit.createdAt]);
    const calendarRef = useRef<HTMLDivElement>(null);

    const handleDateClick = (date: Date, e: React.MouseEvent) => {
        const dateStr = dateToYYYYMMDD(date);
        const targetElement = e.currentTarget as HTMLElement;

        if (date > new Date() || date < habitCreationDate) return;

        if (habit.type === 'binary') {
            const existingEntry = entries.find(en => en.date === dateStr);
            const newEntry: HabitEntry = {
                habitId: habit.id!,
                date: dateStr,
                isCompleted: !existingEntry?.isCompleted
            };
            db.addOrUpdateHabitEntry(newEntry).then(() => onEntryUpdate(habit.id!));
        } else {
            if(popupState?.date === dateStr) {
                setPopupState(null); // Close if already open for this date
            } else {
                setPopupState({ date: dateStr, target: targetElement });
            }
        }
    };
    
    const handleCountSave = (count: number) => {
        if(popupState){
            const newEntry: HabitEntry = { habitId: habit.id!, date: popupState.date, count };
            db.addOrUpdateHabitEntry(newEntry).then(() => onEntryUpdate(habit.id!));
            setPopupState(null);
        }
    };

    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startingDay = firstDayOfMonth.getDay(); // 0 = Sunday

    const calendarDays = Array.from({ length: startingDay }, () => null)
        .concat(Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)));
        
    const getPopupPosition = () => {
        if (!popupState || !calendarRef.current) return {};
        const targetRect = popupState.target.getBoundingClientRect();
        const containerRect = calendarRef.current.getBoundingClientRect();
        return {
            left: `${targetRect.left - containerRect.left + targetRect.width / 2}px`,
            top: `${targetRect.bottom - containerRect.top}px`,
        };
    };

    return (
        <div className="mt-2 relative" ref={calendarRef}>
            <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`}></div>;
                    const dateStr = dateToYYYYMMDD(day);
                    const entry = entries.find(e => e.date === dateStr);
                    const trackable = isDateTrackable(day, habit.repeatConfig);
                    const isFuture = day > new Date();
                    const isBeforeCreation = day < habitCreationDate;
                    const isClickable = trackable && !isFuture && !isBeforeCreation;

                    let bgClass = "bg-slate-100";
                    if (isClickable) {
                        bgClass = "bg-slate-200 cursor-pointer hover:bg-slate-300";
                    }

                    return (
                        <div key={dateStr} onClick={(e) => isClickable && handleDateClick(day, e)} className={`relative h-8 w-8 text-xs rounded-full flex items-center justify-center ${bgClass}`}>
                            <span>{day.getDate()}</span>
                            {habit.type === 'binary' && entry?.isCompleted && <div className="absolute bottom-1 h-1 w-1 bg-black rounded-full"></div>}
                            {habit.type === 'countable' && entry?.count !== undefined && (
                                <span className={`absolute -top-1 -right-1 text-white text-[10px] rounded-full px-1 ${entry.count >= (habit.targetCount || 1) ? 'bg-green-500' : 'bg-orange-500'}`}>
                                    {entry.count}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            {popupState && habit.type === 'countable' && (
                 <div className="absolute z-20" style={{ ...getPopupPosition(), transform: 'translateX(-50%)' }}>
                     <CountGridPopup 
                        targetCount={habit.targetCount || 1}
                        initialCount={entries.find(e => e.date === popupState.date)?.count || 0}
                        onClose={() => setPopupState(null)} 
                        onSave={handleCountSave} 
                    />
                 </div>
            )}
        </div>
    );
};

const HabitItem: React.FC<{
    habit: Habit;
    entries: HabitEntry[];
    onEdit: (habit: Habit) => void;
    onDelete: (id: number) => void;
    onEntryUpdate: (habitId: number) => void;
}> = ({ habit, entries, onEdit, onDelete, onEntryUpdate }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const startDate = new Date(habit.createdAt);
        startDate.setHours(0,0,0,0);
        let totalInstances = 0;
        let doneInstances = 0;
        
        const calcStartDate = startDate > today ? today : startDate;

        for (let d = new Date(calcStartDate); d <= today; d.setDate(d.getDate() + 1)) {
            if (isDateTrackable(d, habit.repeatConfig)){
                totalInstances++;
                const entry = entries.find(e => e.date === dateToYYYYMMDD(d));
                const isDone = habit.type === 'binary' ? entry?.isCompleted : (entry?.count || 0) >= (habit.targetCount || 1);
                if (isDone) doneInstances++;
            }
        }
        
        let currentStreak = 0;
        
        const sortedDoneEntries = entries
            .filter(e => {
                const isDone = habit.type === 'binary' ? e.isCompleted : (e.count || 0) >= (habit.targetCount || 1);
                const entryDate = yyyymmddToDate(e.date);
                entryDate.setHours(0,0,0,0);
                return isDone && entryDate >= startDate;
            })
            .sort((a,b) => b.date.localeCompare(a.date));

        if(sortedDoneEntries.length > 0) {
            let lastDoneDate = yyyymmddToDate(sortedDoneEntries[0].date);
            const diffDays = Math.round((today.getTime() - lastDoneDate.getTime()) / (1000 * 3600 * 24));
            
            let isBroken = false;
            let expectedDate = new Date(today);
            if (diffDays > 0) {
                 for(let i = 0; i < diffDays; i++) {
                     if (isDateTrackable(expectedDate, habit.repeatConfig)) {
                         isBroken = true;
                         break;
                     }
                     expectedDate = addDays(expectedDate, -1);
                 }
            }
           
            if(!isBroken) {
                currentStreak = 1;
                let streakCheckDate = lastDoneDate;
                for(let i = 1; i < sortedDoneEntries.length; i++){
                    const entryDate = yyyymmddToDate(sortedDoneEntries[i].date);
                    let expectedPrev = addDays(streakCheckDate, -1);
                    while(expectedPrev >= entryDate) {
                        if(isDateTrackable(expectedPrev, habit.repeatConfig)) {
                             if(expectedPrev.getTime() !== entryDate.getTime()) {
                                 isBroken = true; // Found a trackable day that was missed.
                             }
                             break;
                        }
                        expectedPrev = addDays(expectedPrev, -1);
                    }
                    if(isBroken) break;

                    currentStreak++;
                    streakCheckDate = entryDate;
                }
            }
        }
        const activeDaysValue = Math.round((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
        return {
            totalInstances,
            doneInstances,
            streak: currentStreak,
            activeDays: activeDaysValue < 1 ? 1 : activeDaysValue
        };
    }, [habit, entries]);

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (direction === 'prev' ? -1 : 1), 1);
        if (direction === 'next' && newMonth > new Date()) return;
        setCurrentMonth(newMonth);
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold">{habit.name}</h4>
                    <p className="text-sm text-slate-500">{habit.group}</p>
                </div>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(p => !p)} className="p-1 text-slate-500 hover:text-slate-800"><MoreVerticalIcon /></button>
                     {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10">
                            <button onClick={() => { onEdit(habit); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Edit</button>
                            <button onClick={() => { onDelete(habit.id!); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100">Delete</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-600 mt-2">
                <span>{stats.doneInstances}/{stats.totalInstances}</span>
                <span className="flex items-center"><FlameIcon /> {stats.streak}</span>
                <span>Active: {stats.activeDays}d</span>
                <span><RepeatIcon className="h-4 w-4 inline-block"/></span>
            </div>
            <div className="flex justify-between items-center mt-4">
                 <button onClick={() => handleMonthChange('prev')} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                <h5 className="font-medium text-sm">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h5>
                <button onClick={() => handleMonthChange('next')} className="p-2 rounded-full hover:bg-slate-100" disabled={new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1) > new Date()}><ChevronRightIcon /></button>
            </div>
            <HabitCalendar habit={habit} entries={entries} currentMonth={currentMonth} onEntryUpdate={onEntryUpdate} />
        </div>
    );
};

export default HabitItem;