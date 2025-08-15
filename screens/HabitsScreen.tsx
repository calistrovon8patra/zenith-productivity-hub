
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { Habit, HabitEntry } from '../types';
import HabitItem from '../components/HabitItem';
import { FAB } from '../components/FAB';
import HabitModal from '../components/modals/HabitModal';

const HabitsScreen: React.FC = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitEntries, setHabitEntries] = useState<Map<number, HabitEntry[]>>(new Map());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

    const fetchHabits = useCallback(async () => {
        const allHabits = await db.getAllHabits();
        setHabits(allHabits);
        const allEntries = new Map<number, HabitEntry[]>();
        for (const habit of allHabits) {
            if (habit.id) {
                const entries = await db.getHabitEntries(habit.id);
                allEntries.set(habit.id, entries);
            }
        }
        setHabitEntries(allEntries);
    }, []);

    useEffect(() => {
        fetchHabits();
    }, [fetchHabits]);

    const handleSave = () => {
        setIsModalOpen(false);
        setEditingHabit(null);
        fetchHabits();
    };

    const handleEdit = (habit: Habit) => {
        setEditingHabit(habit);
        setIsModalOpen(true);
    };

    const handleDelete = async (habitId: number) => {
        await db.deleteHabit(habitId);
        fetchHabits();
    };
    
    const handleEntryUpdate = async (habitId: number) => {
        if(habitId) {
             const entries = await db.getHabitEntries(habitId);
             setHabitEntries(prev => new Map(prev).set(habitId, entries));
        }
    }

    return (
        <div className="relative h-full">
            <h2 className="text-2xl font-bold mb-6">Habits</h2>
            <div className="space-y-4 pb-20">
                {habits.length > 0 ? habits.map(habit => (
                    <HabitItem 
                        key={habit.id} 
                        habit={habit}
                        entries={habitEntries.get(habit.id!) || []}
                        onEdit={handleEdit} 
                        onDelete={handleDelete}
                        onEntryUpdate={handleEntryUpdate}
                    />
                )) : <p className="text-slate-500 text-center py-8">No habits yet. Start tracking one!</p>}
            </div>

            <FAB onClick={() => { setEditingHabit(null); setIsModalOpen(true); }} />
            {isModalOpen && (
                <HabitModal
                    habit={editingHabit}
                    onClose={() => { setIsModalOpen(false); setEditingHabit(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default HabitsScreen;
