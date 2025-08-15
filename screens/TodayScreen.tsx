
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { Task } from '../types';
import { getTodayDateString, getWeekDays, dateToYYYYMMDD, addDays, yyyymmddToDate } from '../utils/date';
import TaskItem from '../components/TaskItem';
import { FAB } from '../components/FAB';
import TaskModal from '../components/modals/TaskModal';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';

const CalendarHeader: React.FC<{
    selectedDate: string;
    onDateSelect: (date: string) => void;
    currentWeekStart: Date;
    onWeekChange: (direction: 'prev' | 'next') => void;
}> = ({ selectedDate, onDateSelect, currentWeekStart, onWeekChange }) => {
    const weekDays = getWeekDays(currentWeekStart);
    const today = getTodayDateString();

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => onWeekChange('prev')} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                <h2 className="font-semibold text-lg">{currentWeekStart.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => onWeekChange('next')} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon /></button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
                {weekDays.map(day => {
                    const dateStr = dateToYYYYMMDD(day);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === today;
                    return (
                        <div key={dateStr} onClick={() => onDateSelect(dateStr)} className="cursor-pointer">
                            <p className="text-xs text-slate-500">{day.toLocaleDateString('default', { weekday: 'short' })}</p>
                            <div className={`mt-1 mx-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-blue-100'} ${isToday && !isSelected ? 'ring-2 ring-blue-300' : ''}`}>
                                {day.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TodayScreen: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTasks = useCallback(async () => {
        const tasksForDay = await db.getTasksByDate(selectedDate);
        setTasks(tasksForDay);
    }, [selectedDate]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    const handleDateSelect = (date: string) => {
        setSelectedDate(date);
    };

    const handleWeekChange = (direction: 'prev' | 'next') => {
        const newWeekStart = addDays(currentWeekStart, direction === 'prev' ? -7 : 7);
        setCurrentWeekStart(newWeekStart);
    };

    const handleTaskUpdate = () => {
        fetchTasks();
    };

    return (
        <div className="relative h-full">
            <CalendarHeader
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                currentWeekStart={currentWeekStart}
                onWeekChange={handleWeekChange}
            />
            <h3 className="text-xl font-bold mb-4">Tasks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long'})}</h3>
            <div className="space-y-3 pb-20">
                {tasks.length > 0 ? (
                    tasks.map(task => <TaskItem key={task.id} task={task} onUpdate={handleTaskUpdate} />)
                ) : (
                    <p className="text-slate-500 text-center py-8">No tasks for this day. Add one!</p>
                )}
            </div>

            <FAB onClick={() => setIsModalOpen(true)} />
            {isModalOpen && (
                <TaskModal
                    scope="today"
                    date={selectedDate}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => {
                        setIsModalOpen(false);
                        fetchTasks();
                    }}
                />
            )}
        </div>
    );
};

export default TodayScreen;

