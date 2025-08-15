
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { Task } from '../types';
import { getTodayDateString, getWeekRangeString, addDays, getStartOfWeek, dateToYYYYMMDD } from '../utils/date';
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

const WeekScreen: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const weekStart = getStartOfWeek(currentDate);
    const weekEnd = addDays(weekStart, 6);
    const today = new Date();
    const isCurrentWeek = weekStart.getFullYear() === today.getFullYear() && 
                          weekStart.getMonth() === today.getMonth() &&
                          today.getDate() >= weekStart.getDate() && today.getDate() <= weekEnd.getDate();

    let timeProgress = 0;
    let daysLeft = 0;
    if (isCurrentWeek) {
        const dayOfWeek = today.getDay(); // Sunday is 0
        timeProgress = ((dayOfWeek + 1) / 7) * 100;
        daysLeft = 6 - dayOfWeek;
    }

    const fetchTasks = useCallback(async () => {
        const startStr = dateToYYYYMMDD(weekStart);
        const endStr = dateToYYYYMMDD(weekEnd);
        const weekTasks = await db.getTasksByDateRange(startStr, endStr);
        
        // Filter tasks that belong to the week scope
        const filteredTasks = weekTasks.filter(t => t.scope === 'week');
        
        const uniqueTasks = Array.from(new Map(filteredTasks.map(task => [task.repeatGroupId || task.id, task])).values());
        setTasks(uniqueTasks);

    }, [weekStart, weekEnd]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleWeekChange = (direction: 'prev' | 'next') => {
        setCurrentDate(addDays(currentDate, direction === 'prev' ? -7 : 7));
    };
    
    const handleTaskUpdate = () => {
        fetchTasks();
    };

    return (
        <div className="relative h-full">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => handleWeekChange('prev')} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
                <h2 className="font-semibold text-lg">{getWeekRangeString(currentDate)}</h2>
                <button onClick={() => handleWeekChange('next')} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon /></button>
            </div>
            
            {isCurrentWeek && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-600">Week Progress</p>
                        <p className="text-sm text-slate-500">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</p>
                    </div>
                    <ProgressBar progress={timeProgress} />
                </div>
            )}

            <h3 className="text-xl font-bold mb-4">Weekly Tasks</h3>
            <div className="space-y-3 pb-20">
                {tasks.length > 0 ? (
                    tasks.map(task => <TaskItem key={task.id} task={task} onUpdate={handleTaskUpdate} />)
                ) : (
                    <p className="text-slate-500 text-center py-8">No tasks for this week.</p>
                )}
            </div>

            <FAB onClick={() => setIsModalOpen(true)} />
            {isModalOpen && (
                <TaskModal
                    scope="week"
                    date={dateToYYYYMMDD(getStartOfWeek(new Date()))} // Start of current week for new tasks
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

export default WeekScreen;
