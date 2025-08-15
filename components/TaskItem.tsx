import React, { useState, useEffect, useCallback } from 'react';
import { Task, Subtask } from '../types';
import { db } from '../services/db';
import { timerService, TimerState } from '../services/timerService';
import { ChevronDownIcon, MoreVerticalIcon, PlayIcon, PauseIcon, SaveIcon, RepeatIcon } from './icons';
import TaskModal from './modals/TaskModal';
import { getTodayDateString } from '../utils/date';

interface TimerProps {
  task: Task;
  onPause: (focusedTimeChunk: number) => void;
  onSave: (focusedTimeChunk: number) => void;
}

const Timer: React.FC<TimerProps> = ({ task, onPause, onSave }) => {
    const [time, setTime] = useState(() => Date.now());

    // Effect for cross-tab synchronization
    useEffect(() => {
        const handleStorage = () => setTime(Date.now());
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const timerState = timerService.getTimerState(task.id!);
    const isActive = !!timerState;

    // Effect for the 1-second tick when active
    useEffect(() => {
        if (!isActive) return;
        const intervalId = setInterval(() => setTime(Date.now()), 1000);
        return () => clearInterval(intervalId);
    }, [isActive]);
    
    let displayTimeSeconds: number;
    if (isActive) {
        const elapsedSinceStart = (time - timerState.startTime) / 1000;
        const totalElapsed = timerState.accumulated + elapsedSinceStart;
        if (task.timerMode === 'timer') {
            displayTimeSeconds = Math.max(0, timerState.initialDuration - totalElapsed);
        } else { // stopwatch
            displayTimeSeconds = totalElapsed;
        }
    } else {
        displayTimeSeconds = task.timerMode === 'timer' ? task.timerDuration : task.focusedTime;
    }

    // Effect for auto-saving when a timer countdown finishes
    useEffect(() => {
        if (isActive && task.timerMode === 'timer' && displayTimeSeconds <= 0) {
            const { elapsed } = timerService.pauseTimer(task.id!);
            onSave(elapsed);
        }
    }, [isActive, task.id, task.timerMode, displayTimeSeconds, onSave]);

    const formatDisplayTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handlePlayPause = () => {
        if (isActive) {
            const { elapsed } = timerService.pauseTimer(task.id!);
            onPause(elapsed);
        } else {
            if (task.timerMode !== 'none') {
                const accumulatedValue = task.timerMode === 'stopwatch' ? task.focusedTime : 0;
                timerService.startTimer(task.id!, task.timerMode, task.timerDuration, accumulatedValue);
                setTime(Date.now()); // Force immediate re-render to reflect the change
            }
        }
    };

    const handleManualSave = () => {
        let elapsed = 0;
        if (isActive) {
            elapsed = timerService.pauseTimer(task.id!).elapsed;
        }
        onSave(elapsed);
    };
    
    return (
        <div className="bg-slate-100 p-2 rounded-lg text-center w-28">
            <p className="font-mono text-xl font-semibold">{formatDisplayTime(displayTimeSeconds)}</p>
            <div className="flex justify-center space-x-2 mt-1">
                <button onClick={handlePlayPause} className="p-1 text-slate-600 hover:text-slate-900">
                    {isActive ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button onClick={handleManualSave} className="p-1 text-slate-600 hover:text-slate-900">
                    <SaveIcon />
                </button>
            </div>
        </div>
    );
};

const TaskItem: React.FC<{ task: Task; onUpdate: () => void; }> = ({ task, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const handleToggleComplete = async () => {
        const updatedTask = { ...task, isCompleted: !task.isCompleted, completedAt: !task.isCompleted ? new Date().toISOString() : undefined };
        await db.updateTask(updatedTask);
        onUpdate();
    };

    const handleSubtaskToggle = async (subtaskId: string) => {
        const updatedSubtasks = task.subtasks.map(st =>
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
        );
        const isTaskNowCompleted = updatedSubtasks.every(st => st.isCompleted);
        const updatedTask = { ...task, subtasks: updatedSubtasks, isCompleted: isTaskNowCompleted, completedAt: isTaskNowCompleted ? new Date().toISOString() : undefined };
        await db.updateTask(updatedTask);
        onUpdate();
    };

    const handleTimerPause = async (focusedTimeChunk: number) => {
        // This function is called on pause. It accumulates time for pause/resume and logs the chunk.
        if (focusedTimeChunk >= 0) {
            const newTotalFocusedTime = task.focusedTime + focusedTimeChunk;

            if ((task.scope === 'week' || task.scope === 'month') && task.repeatGroupId) {
                const relatedTasks = await db.getTasksByRepeatGroupId(task.repeatGroupId);
                for (const t of relatedTasks) {
                    await db.updateTask({ ...t, focusedTime: newTotalFocusedTime });
                }
            } else {
                const updatedTask = { ...task, focusedTime: newTotalFocusedTime };
                await db.updateTask(updatedTask);
            }

            if (focusedTimeChunk > 1) { // Log only meaningful sessions
               await db.logFocusedSession({taskId: task.id!, date: getTodayDateString(), duration: focusedTimeChunk});
            }
        }
        onUpdate();
    };

    const handleTimerSaveAndReset = async (finalChunk: number) => {
        // This function is called on save. It logs the final time chunk and resets the accumulator.
        if (finalChunk > 1) {
            await db.logFocusedSession({taskId: task.id!, date: getTodayDateString(), duration: finalChunk});
        }

        const newFocusedTime = 0; // Reset accumulator
        if ((task.scope === 'week' || task.scope === 'month') && task.repeatGroupId) {
            const relatedTasks = await db.getTasksByRepeatGroupId(task.repeatGroupId);
            for (const t of relatedTasks) {
                await db.updateTask({ ...t, focusedTime: newFocusedTime });
            }
        } else {
            const updatedTask = { ...task, focusedTime: newFocusedTime };
            await db.updateTask(updatedTask);
        }
        onUpdate();
    };
    
    const handleDelete = async () => {
        if(task.id) {
           timerService.pauseTimer(task.id); // Ensure timer is cleared if task is deleted
        }
        if(task.repeatGroupId) {
            const relatedTasks = await db.getTasksByRepeatGroupId(task.repeatGroupId);
            for(const t of relatedTasks) {
                if(t.id && !t.isCompleted) await db.deleteTask(t.id);
            }
        } else if (task.id) {
            await db.deleteTask(task.id);
        }
        setIsMenuOpen(false);
        onUpdate();
    };
    
    const getRepeatSymbol = () => {
        if(!task.repeatConfig || task.repeatConfig.type === 'none') return null;
        const type = task.repeatConfig.type;
        let letter = '';
        if(type === 'daily' || type === 'every_week' || type === 'every_month') letter = 'D';
        if(type === 'weekly') letter = 'W';
        if(type === 'monthly') letter = 'M';
        if (type === 'every_week') letter = 'W';
        if (type === 'every_month') letter = 'M';
        return <div className="flex items-center gap-1">
            <RepeatIcon /> {letter && <span className="text-xs font-bold text-slate-500">{letter}</span>}
        </div>
    };
    
    return (
        <>
            <div className={`bg-white p-4 rounded-xl shadow-sm transition-all duration-300 ${task.isCompleted ? 'opacity-60' : ''}`}>
                <div className="flex items-start space-x-4">
                    <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={handleToggleComplete}
                        className="mt-1 h-5 w-5 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                        <p className={`font-medium ${task.isCompleted ? 'line-through text-slate-500' : ''}`}>{task.name}</p>
                         {task.subtasks.length > 0 && (
                            <button onClick={() => setIsExpanded(!isExpanded)} className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                                {task.subtasks.filter(st => st.isCompleted).length}/{task.subtasks.length} subtasks <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                            </button>
                        )}
                    </div>
                    {task.timerMode !== 'none' && task.id && <Timer task={task} onPause={handleTimerPause} onSave={handleTimerSaveAndReset} />}
                    <div className="relative">
                        <button onClick={() => setIsMenuOpen(p => !p)} className="p-1 text-slate-500 hover:text-slate-800"><MoreVerticalIcon /></button>
                         <div className="text-right mt-2">{getRepeatSymbol()}</div>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10">
                                <button onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Edit</button>
                                <button onClick={handleDelete} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100">Delete</button>
                            </div>
                        )}
                    </div>
                </div>
                 {isExpanded && task.subtasks.length > 0 && (
                    <div className="pl-9 mt-3 space-y-2">
                        {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={subtask.isCompleted}
                                    onChange={() => handleSubtaskToggle(subtask.id)}
                                    className="h-4 w-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`${subtask.isCompleted ? 'line-through text-slate-500' : ''}`}>{subtask.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {isModalOpen && <TaskModal task={task} onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); onUpdate(); }} scope={task.scope} date={task.date} />}
        </>
    );
};

export default TaskItem;