import { Task, Habit, HabitEntry, FocusedSession } from '../types';

const DB_NAME = 'ZenithDB';
const DB_VERSION = 1;

class DatabaseService {
  private db: IDBDatabase | null = null;

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject("Error opening database");
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
          taskStore.createIndex('date', 'date', { unique: false });
          taskStore.createIndex('repeatGroupId', 'repeatGroupId', { unique: false });
        }
        if (!db.objectStoreNames.contains('habits')) {
          db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('habitEntries')) {
          const entryStore = db.createObjectStore('habitEntries', { keyPath: 'id', autoIncrement: true });
          entryStore.createIndex('habitId_date', ['habitId', 'date'], { unique: true });
          entryStore.createIndex('habitId', 'habitId', { unique: false });
        }
        if (!db.objectStoreNames.contains('focusedSessions')) {
           const sessionStore = db.createObjectStore('focusedSessions', { keyPath: 'id', autoIncrement: true });
           sessionStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!this.db) throw new Error("Database not initialized");
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }
  
  // Generic request handler
  private handleRequest<T,>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  // Task operations
  async addTask(task: Task): Promise<number> {
    const store = this.getStore('tasks', 'readwrite');
    // For auto-incrementing keys, the key path property ('id') must not be on the object.
    const { id, ...taskToAdd } = task;
    return this.handleRequest<number>(store.add(taskToAdd));
  }
  
  async addTasks(tasks: Task[]): Promise<void> {
     if (!this.db) throw new Error("Database not initialized");
     const transaction = this.db.transaction('tasks', 'readwrite');
     const store = transaction.objectStore('tasks');
     tasks.forEach(task => {
        // For auto-incrementing keys, the key path property ('id') must not be on the object.
        const { id, ...taskToAdd } = task;
        store.add(taskToAdd);
     });
     return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
     });
  }

  async getTasksByDate(date: string): Promise<Task[]> {
    const store = this.getStore('tasks', 'readonly');
    const index = store.index('date');
    return this.handleRequest<Task[]>(index.getAll(IDBKeyRange.only(date)));
  }
  
  async getTasksByDateRange(startDate: string, endDate: string): Promise<Task[]> {
    const store = this.getStore('tasks', 'readonly');
    const index = store.index('date');
    return this.handleRequest<Task[]>(index.getAll(IDBKeyRange.bound(startDate, endDate)));
  }

  async updateTask(task: Task): Promise<number> {
    const store = this.getStore('tasks', 'readwrite');
    return this.handleRequest<number>(store.put(task));
  }

  async deleteTask(id: number): Promise<void> {
    const store = this.getStore('tasks', 'readwrite');
    return this.handleRequest<void>(store.delete(id));
  }
  
  async getTasksByRepeatGroupId(groupId: string): Promise<Task[]> {
      const store = this.getStore('tasks', 'readonly');
      const index = store.index('repeatGroupId');
      return this.handleRequest<Task[]>(index.getAll(groupId));
  }

  // Habit operations
  async addHabit(habit: Habit): Promise<number> {
      const store = this.getStore('habits', 'readwrite');
      // For auto-incrementing keys, the key path property ('id') must not be on the object.
      const { id, ...habitToAdd } = habit;
      return this.handleRequest<number>(store.add(habitToAdd));
  }

  async getAllHabits(): Promise<Habit[]> {
      const store = this.getStore('habits', 'readonly');
      return this.handleRequest<Habit[]>(store.getAll());
  }

  async updateHabit(habit: Habit): Promise<number> {
      const store = this.getStore('habits', 'readwrite');
      return this.handleRequest<number>(store.put(habit));
  }
  
  async deleteHabit(id: number): Promise<void> {
      const store = this.getStore('habits', 'readwrite');
      await this.handleRequest<void>(store.delete(id));

      // Also delete associated entries
      if (!this.db) throw new Error("Database not initialized");
      const entryTx = this.db.transaction('habitEntries', 'readwrite');
      const entryStore = entryTx.objectStore('habitEntries');
      const entryIndex = entryStore.index('habitId');
      const request = entryIndex.openCursor(IDBKeyRange.only(id));
      request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
              cursor.delete();
              cursor.continue();
          }
      };
  }

  // Habit Entry operations
  async addOrUpdateHabitEntry(entry: HabitEntry): Promise<number> {
      const store = this.getStore('habitEntries', 'readwrite');
      const index = store.index('habitId_date');
      const existing = await this.handleRequest<HabitEntry | undefined>(index.get([entry.habitId, entry.date]));
      if(existing && existing.id) {
          entry.id = existing.id;
      }
      return this.handleRequest<number>(store.put(entry));
  }

  async getHabitEntries(habitId: number): Promise<HabitEntry[]> {
      const store = this.getStore('habitEntries', 'readonly');
      const index = store.index('habitId');
      return this.handleRequest<HabitEntry[]>(index.getAll(habitId));
  }
  
  // Focused Session operations
  async logFocusedSession(session: FocusedSession): Promise<number> {
    const store = this.getStore('focusedSessions', 'readwrite');
    // For auto-incrementing keys, the key path property ('id') must not be on the object.
    const { id, ...sessionToAdd } = session;
    return this.handleRequest<number>(store.add(sessionToAdd));
  }
  
  async getFocusedSessionsByDateRange(startDate: string, endDate: string): Promise<FocusedSession[]> {
    const store = this.getStore('focusedSessions', 'readonly');
    const index = store.index('date');
    return this.handleRequest<FocusedSession[]>(index.getAll(IDBKeyRange.bound(startDate, endDate)));
  }
}

export const db = new DatabaseService();