import React, { useState } from 'react';
import { Habit, RepeatConfig, RepeatType } from '../../types';
import { db } from '../../services/db';

const HabitModal: React.FC<{
    habit?: Habit | null;
    onClose: () => void;
    onSave: () => void;
}> = ({ habit, onClose, onSave }) => {
    const [name, setName] = useState(habit?.name || '');
    const [type, setType] = useState<'binary' | 'countable'>(habit?.type || 'binary');
    const [targetCount, setTargetCount] = useState<string>(habit?.targetCount?.toString() || '');
    const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>(habit?.repeatConfig || { type: 'daily' });
    const [group, setGroup] = useState(habit?.group || '');

    const handleRepeatTypeChange = (type: RepeatType) => {
        if(type === 'weekly'){
             setRepeatConfig({ type, daysOfWeek: [] });
        } else if(type === 'monthly') {
             setRepeatConfig({ type, daysOfMonth: [] });
        } else {
             setRepeatConfig({ type });
        }
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

        const finalTargetCount = Math.max(1, parseInt(targetCount, 10) || 1);

        if (habit && habit.id) {
            // Logic for updating an existing habit
            const habitData: Habit = {
                id: habit.id,
                name,
                type,
                targetCount: type === 'countable' ? finalTargetCount : undefined,
                repeatConfig,
                group,
                createdAt: habit.createdAt, // Preserve original creation date
            };
            await db.updateHabit(habitData);
        } else {
            // Logic for creating a new habit
            const newHabitData: Omit<Habit, 'id'> = {
                name,
                type,
                repeatConfig,
                group,
                createdAt: new Date().toISOString(),
                ...(type === 'countable' && { targetCount: finalTargetCount }),
            };
            await db.addHabit(newHabitData as Habit);
        }
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{habit ? 'Edit Habit' : 'Create Habit'}</h2>
                
                <div className="space-y-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Habit Name" className="w-full p-2 border rounded"/>
                    <input type="text" value={group} onChange={e => setGroup(e.target.value)} placeholder="Group (optional)" className="w-full p-2 border rounded"/>
                    
                    <div>
                        <label className="font-semibold text-sm">Type</label>
                        <div className="flex gap-2 mt-1">
                             <button onClick={() => setType('binary')} className={`flex-1 p-2 rounded ${type === 'binary' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>Binary (Done/Not Done)</button>
                             <button onClick={() => setType('countable')} className={`flex-1 p-2 rounded ${type === 'countable' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>Countable</button>
                        </div>
                        {type === 'countable' && (
                             <input type="number" value={targetCount} onChange={e => setTargetCount(e.target.value)} min="1" placeholder="Target Count" className="w-full p-2 border rounded mt-2"/>
                        )}
                    </div>

                    <div>
                        <label className="font-semibold text-sm">Repetition</label>
                        <select value={repeatConfig.type} onChange={e => handleRepeatTypeChange(e.target.value as RepeatType)} className="w-full p-2 border rounded mt-1">
                           <option value="daily">Daily</option>
                           <option value="weekly">Weekly</option>
                           <option value="monthly">Monthly</option>
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
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-slate-200 hover:bg-slate-300">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
                </div>
            </div>
        </div>
    );
};

export default HabitModal;