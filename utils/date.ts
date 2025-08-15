// All functions operate on local time zone.
// Dates are handled as YYYY-MM-DD strings for DB consistency.

export const getTodayDateString = (): string => {
  const today = new Date();
  return dateToYYYYMMDD(today);
};

export const dateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const yyyymmddToDate = (dateString: string): Date => {
  return new Date(dateString + 'T00:00:00');
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust to Sunday
  return new Date(d.setDate(diff));
};

export const getWeekDays = (startDate: Date): Date[] => {
  const weekStart = getStartOfWeek(startDate);
  return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
};

export const getWeekRangeString = (date: Date): string => {
  const start = getStartOfWeek(date);
  const end = addDays(start, 6);
  const startMonth = start.toLocaleString('default', { month: 'short' });
  const endMonth = end.toLocaleString('default', { month: 'short' });

  if (startMonth === endMonth) {
    return `${start.getDate()} - ${end.getDate()} ${startMonth}`;
  }
  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
};

export const getMonthNameYear = (date: Date): string => {
  return `${date.toLocaleString('default', { month: 'long' })}, ${date.getFullYear()}`;
};

export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const formatFocusedTime = (seconds: number): string => {
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  }
  const hours = (seconds / 3600).toFixed(1);
  return `${hours} hr`;
};

// Generates dates for repeating tasks until the end of the current year.
export const generateRepetitionDates = (startDate: Date, config: import('../types').RepeatConfig): string[] => {
  const dates: string[] = [];
  const start = yyyymmddToDate(dateToYYYYMMDD(startDate));
  const endOfYear = new Date(start.getFullYear(), 11, 31);
  
  if (config.type === 'none') {
    return [];
  }

  // New, improved logic for monthly repeats that correctly handles short months
  if (config.type === 'monthly' && config.daysOfMonth && config.daysOfMonth.length > 0) {
    const sortedDays = [...config.daysOfMonth].sort((a, b) => a - b);
    const maxDayInConfig = sortedDays[sortedDays.length - 1];
    
    // Start iterating from the beginning of the month of the start date
    let currentMonthDate = new Date(start.getFullYear(), start.getMonth(), 1);

    while (currentMonthDate <= endOfYear) {
        const daysInMonth = getEndOfMonth(currentMonthDate).getDate();
        // Calculate adjustment for short months based on the largest day selected
        const adjustment = maxDayInConfig > daysInMonth ? maxDayInConfig - daysInMonth : 0;
        
        sortedDays.forEach(day => {
            const adjustedDay = day - adjustment;
            if (adjustedDay > 0) {
                const newDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), adjustedDay);
                // Only add valid dates that are on or after the original start date
                if (newDate >= start) {
                    dates.push(dateToYYYYMMDD(newDate));
                }
            }
        });

        // Move to the next month
        currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
    }
    return dates;
  }

  // Original logic for other repetition types
  let currentDate = new Date(start);
  while (currentDate <= endOfYear) {
    let shouldAdd = false;
    switch (config.type) {
      case 'daily':
        shouldAdd = true;
        break;
      case 'every_week':
        if (currentDate.getDay() === start.getDay()) {
          shouldAdd = true;
        }
        break;
      case 'every_month':
        if (currentDate.getDate() === start.getDate()) {
            shouldAdd = true;
        } else {
            // Handle cases where start date is > days in current month (e.g., 31st)
            const endOfCurrentMonth = getEndOfMonth(currentDate);
            if (start.getDate() > endOfCurrentMonth.getDate() && currentDate.getDate() === endOfCurrentMonth.getDate()) {
                shouldAdd = true;
            }
        }
        break;
      case 'weekly':
        if (config.daysOfWeek?.includes(currentDate.getDay())) {
          shouldAdd = true;
        }
        break;
      case 'monthly': // Fallback for empty daysOfMonth array
        if (config.daysOfMonth?.includes(currentDate.getDate())) {
          shouldAdd = true;
        }
        break;
    }

    if (shouldAdd) {
      dates.push(dateToYYYYMMDD(currentDate));
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
};