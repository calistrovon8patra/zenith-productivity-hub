
export enum View {
  Today,
  ThisWeek,
  ThisMonth,
  Habits,
  Overview,
}

export interface Subtask {
  id: string;
  name: string;
  isCompleted: boolean;
}

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'every_week' | 'every_month';

export interface RepeatConfig {
  type: RepeatType;
  daysOfWeek?: number[]; // 0 for Sunday, 1 for Monday, etc.
  daysOfMonth?: number[];
}

export interface Task {
  id?: number;
  name: string;
  subtasks: Subtask[];
  isCompleted: boolean;
  completedAt?: string; // ISO date string
  timerMode: 'none' | 'stopwatch' | 'timer';
  timerDuration: number; // in seconds
  focusedTime: number; // in seconds
  repeatConfig: RepeatConfig;
  repeatGroupId?: string;
  createdAt: string; // ISO date string
  scope: 'today' | 'week' | 'month';
  date: string; // YYYY-MM-DD
}

export interface Habit {
  id?: number;
  name: string;
  type: 'binary' | 'countable';
  targetCount?: number;
  repeatConfig: RepeatConfig;
  group: string;
  createdAt: string; // ISO date string
}

export interface HabitEntry {
  id?: number;
  habitId: number;
  date: string; // YYYY-MM-DD
  isCompleted?: boolean;
  count?: number;
}

export interface FocusedSession {
  id?: number;
  taskId: number;
  date: string; // YYYY-MM-DD
  duration: number; // in seconds
}
