// services/timerService.ts

const STORAGE_KEY = 'activeTimers';

export interface TimerState {
    startTime: number; // Timestamp when the timer last started/resumed
    mode: 'timer' | 'stopwatch';
    initialDuration: number; // For timer mode, in seconds
    accumulated: number; // Seconds accumulated from previous runs before the current start time
}

type ActiveTimers = Record<string, TimerState>;

function getActiveTimers(): ActiveTimers {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Could not parse active timers from localStorage", e);
        return {};
    }
}

function setActiveTimers(timers: ActiveTimers) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    // Dispatch a storage event so other tabs can sync
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

export const timerService = {
    startTimer(taskId: number, mode: 'timer' | 'stopwatch', initialDuration: number, accumulated: number): void {
        const timers = getActiveTimers();
        timers[taskId] = {
            startTime: Date.now(),
            mode,
            initialDuration,
            accumulated,
        };
        setActiveTimers(timers);
    },

    pauseTimer(taskId: number): { elapsed: number } {
        const timers = getActiveTimers();
        const timerState = timers[taskId];
        if (!timerState) return { elapsed: 0 };

        const elapsed = (Date.now() - timerState.startTime) / 1000;
        delete timers[taskId];
        setActiveTimers(timers);
        return { elapsed };
    },

    getTimerState(taskId: number): TimerState | null {
        const timers = getActiveTimers();
        return timers[taskId] || null;
    },
};
