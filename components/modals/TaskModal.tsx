
import React, { useState } from 'react';
import { Task, Subtask, RepeatConfig, RepeatType } from '../../types';
import { db } from '../../services/db';
import { generateRepetitionDates, yyyymmddToDate } from '../../utils/date';
import { v4 as uuidv4 } from 'uuid';
import { Trash2Icon } from '../icons';

const TaskModal: React.FC<{
  task?: Task | null;
  onClose: () => void;
  onSave: () => void;
  scope: 'today' | 'week' | 'month';
  date: string; // The initial date for task creation
}> = ({ task, onClose, onSave, scope, date }) => {
    const [name, setName] = useState(task?.name || '');
    const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
    const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>(task?.repeatConfig || { type: 'none' });
    const [timerMode, setTimerMode] = useState<'none' | 'stopwatch' | 'timer'>(task?.timerMode || 'none');
    const [timerDuration, setTimerDuration] = useState(task?.timerDuration ? task.timerDuration / 60 : 30); // in minutes

    const handleSubtaskChange = (index: number, value: string) => {
        const newSubtasks = [...subtasks];
        newSubtasks[index].name = value;
        setSubtasks(newSubtasks);
    };

    const addSubtask = () => {
        setSubtasks([...subtasks, { id: uuidv4(), name: '', isCompleted: false }]);
    };

    const removeSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };
    
    const handleRepeatTypeChange = (type: RepeatType) => {
        const newConfig: RepeatConfig = { type };
        if(type === 'weekly'){
             newConfig.daysOfWeek = [];
        } else if(type === 'monthly') {
             newConfig.daysOfMonth = [];
        }
        setRepeatConfig(newConfig);
    };
    
    const toggleWeekDay = (day: number) => {
        const currentDays = repeatConfig.daysOfWeek || [];
        const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day];
        setRepeatConfig({ ...repeatConfig, daysOfWeek: newDays });
    };

    const toggleMonthDay = (day: number) => {
        const currentDays = repeatConfig.daysOfMonth || [];
        const newDays = currentDays.includes(day) ? currentDays.filter(d => d !== day) : [...currentDays, day];
        setRepeatConfig({ ...repeatConfig, daysOfMonth: newDays });
    };

    const handleSubmit = async () => {
        if (!name) return;

        const baseTask: Omit<Task, 'id' | 'date'> = {
            name,
            subtasks,
            isCompleted: false,
            timerMode,
            timerDuration: timerMode === 'timer' ? timerDuration * 60 : 0,
            focusedTime: 0,
            repeatConfig,
            createdAt: task?.createdAt || new Date().toISOString(),
            scope,
        };
        
        if(task && task.id) { // Editing existing task
             if(task.repeatGroupId) { // Editing a repeating task
                 const relatedTasks = await db.getTasksByRepeatGroupId(task.repeatGroupId);
                 const updates: Task[] = relatedTasks.map(t => ({
                     ...t,
                     ...baseTask,
                     repeatConfig, // ensure repeatConfig is updated for all
                 }));
                 for (const t of updates) {
                     if(!t.isCompleted) await db.updateTask(t);
                 }
             } else { // Editing a single task
                const updatedTask: Task = { ...task, ...baseTask };
                await db.updateTask(updatedTask);
             }
        } else { // Creating new task
            if(repeatConfig.type !== 'none') {
                const repeatGroupId = uuidv4();
                const dates = generateRepetitionDates(yyyymmddToDate(date), repeatConfig);
                const newTasks: Task[] = dates.map(d => ({...baseTask, date: d, repeatGroupId}));
                if (newTasks.length > 0) {
                   await db.addTasks(newTasks);
                }
            } else {
                 const newTask: Task = { ...baseTask, date };
                 await db.addTask(newTask);
            }
        }
        
        onSave();
    };

    const handleDelete = async () => {
        if (!task || !task.id) return;
         if(task.repeatGroupId) {
            const relatedTasks = await db.getTasksByRepeatGroupId(task.repeatGroupId);
            for(const t of relatedTasks) {
                if(t.id && !t.isCompleted) await db.deleteTask(t.id);
            }
        } else {
            await db.deleteTask(task.id);
        }
        onSave();
    };
    
    const getRepeatOptions = (): { value: RepeatType, label: string }[] => {
        switch (scope) {
            case 'today':
                return [
                    { value: 'none', label: 'None' },
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                ];
            case 'week':
                return [
                    { value: 'none', label: 'None' },
                    { value: 'every_week', label: 'Repeat Weekly' },
                ];
            case 'month':
                return [
                    { value: 'none', label: 'None' },
                    { value: 'every_month', label: 'Repeat Monthly' },
                ];
            default:
                return [{ value: 'none', label: 'None' }];
        }
    };
    
    const repeatOptions = getRepeatOptions();


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{task ? 'Edit Task' : 'Create Task'}</h2>
                
                <div className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Task Name" className="w-full p-2 border rounded"/>
                    
                    <div>
                        <label className="font-semibold text-sm">Subtasks</label>
                        {subtasks.map((st, i) => (
                            <div key={i} className="flex items-center gap-2 mt-1">
                                <input type="text" value={st.name} onChange={e => handleSubtaskChange(i, e.target.value)} className="w-full p-2 border rounded" placeholder={`Subtask ${i+1}`} />
                                <button onClick={() => removeSubtask(i)} className="text-red-500 p-1"><Trash2Icon/></button>
                            </div>
                        ))}
                        <button onClick={addSubtask} className="text-blue-600 text-sm mt-2">+ Add Subtask</button>
                    </div>

                    <div>
                        <label className="font-semibold text-sm">Repetition</label>
                        <select value={repeatConfig.type} onChange={e => handleRepeatTypeChange(e.target.value as RepeatType)} className="w-full p-2 border rounded mt-1">
                            {repeatOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                         {repeatConfig.type === 'weekly' && (
                            <div className="flex justify-between mt-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                    <button key={i} onClick={() => toggleWeekDay(i)} className={`h-8 w-8 rounded-full text-xs ${repeatConfig.daysOfWeek?.includes(i) ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>{day}</button>
                                ))}
                            </div>
                        )}
                        {repeatConfig.type === 'monthly' && (
                             <div className="grid grid-cols-7 gap-1 mt-2">
                                {Array.from({length: 31}, (_, i) => i+1).map(day => (
                                    <button key={day} onClick={() => toggleMonthDay(day)} className={`h-8 w-8 rounded-full text-xs ${repeatConfig.daysOfMonth?.includes(day) ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>{day}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="font-semibold text-sm">Timer</label>
                        <select value={timerMode} onChange={e => setTimerMode(e.target.value as any)} className="w-full p-2 border rounded mt-1">
                            <option value="none">None</option>
                            <option value="stopwatch">Stopwatch</option>
                            <option value="timer">Timer</option>
                        </select>
                        {timerMode === 'timer' && (
                            <input type="number" value={timerDuration} onChange={e => setTimerDuration(parseInt(e.target.value))} placeholder="Duration (min)" className="w-full p-2 border rounded mt-2"/>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    {task && <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>}
                    <button onClick={onClose} className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;
