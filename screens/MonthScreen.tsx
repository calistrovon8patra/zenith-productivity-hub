
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { Task } from '../types';
import { getMonthNameYear, getStartOfMonth, getEndOfMonth, dateToYYYYMMDD } from '../utils/date';
import TaskItem from '../components/TaskItem';
import { FAB } from '../components/FAB';
import TaskModal from '../components/modals/TaskModal';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
    return (
        <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
    );
};

const MonthScreen: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const monthStart = getStartOfMonth(currentDate);
    const monthEnd = getEndOfMonth(currentDate);
    const today = new Date();
    const isCurrentMonth = monthStart.getFullYear() === today.getFullYear() && monthStart.getMonth() === today.getMonth();

    let timeProgress = 0;
    let daysLeft = 0;
    if (isCurrentMonth) {
        const totalDaysInMonth = monthEnd.getDate();
        const currentDayOfMonth = today.getDate();
        timeProgress = (currentDayOfMonth / totalDaysInMonth) * 100;
        daysLeft = totalDaysInMonth - currentDayOfMonth;
    }

    const fetchTasks = useCallback(async () => {
        const startStr = dateToYYYYMMDD(monthStart);
        const endStr = dateToYYYYMMDD(monthEnd);
        const monthTasks = await db.getTasksByDateRange(startStr, endStr);
        
        const filteredTasks = monthTasks.filter(t => t.scope === 'month');
        const uniqueTasks = Array.from(new Map(filteredTasks.map(task => [task.repeatGroupId || task.id, task])).values());
        setTasks(uniqueTasks);

    }, [monthStart, monthEnd]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'prev' ? -1 : 1), 1));
    };

    const handleTaskUpdate = () => {
        fetchTasks();
    };
    
    return (
        <div className="relative h-full">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => handleMonthChange('prev')} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                <h2 className="font-semibold text-lg">{getMonthNameYear(currentDate)}</h2>
                <button onClick={() => handleMonthChange('next')} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon /></button>
            </div>
            
            {isCurrentMonth && (
                <div className="mb-6">
                     <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-600">Month Progress</p>
                        <p className="text-sm text-slate-500">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</p>
                    </div>
                     <ProgressBar progress={timeProgress} />
                </div>
            )}

            <h3 className="text-xl font-bold mb-4">Monthly Tasks</h3>
            <div className="space-y-3 pb-20">
                 {tasks.length > 0 ? (
                    tasks.map(task => <TaskItem key={task.id} task={task} onUpdate={handleTaskUpdate} />)
                ) : (
                    <p className="text-slate-500 text-center py-8">No tasks for this month.</p>
                )}
            </div>

            <FAB onClick={() => setIsModalOpen(true)} />
            {isModalOpen && (
                <TaskModal
                    scope="month"
                    date={dateToYYYYMMDD(getStartOfMonth(new Date()))}
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

export default MonthScreen;
