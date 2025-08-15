import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { FocusedSession } from '../types';
import {
  getTodayDateString,
  getStartOfWeek,
  addDays,
  dateToYYYYMMDD,
  getStartOfMonth,
  getEndOfMonth,
  formatFocusedTime
} from '../utils/date';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

type OverviewData = {
  totalTime: number;
  chartData?: { day: string; time: number }[];
  avgTime?: number;
};

const OverviewCard: React.FC<{
  title: string;
  dateRange: string;
  data: OverviewData;
  onPrev: () => void;
  onNext: () => void;
  yAxisDomain?: [number | string, number | string];
  yAxisTicks?: any[];
  yAxisTickFormatter?: (value: any) => string;
}> = ({ title, dateRange, data, onPrev, onNext, yAxisDomain, yAxisTicks, yAxisTickFormatter }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center space-x-2">
          <button onClick={onPrev} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon /></button>
          <span className="text-sm text-slate-600 w-32 text-center">{dateRange}</span>
          <button onClick={onNext} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon /></button>
        </div>
      </div>
      <div className="text-center mb-4">
        <p className="text-sm text-slate-500">Total Time Focused</p>
        <p className="text-3xl font-bold text-blue-600">{formatFocusedTime(data.totalTime)}</p>
      </div>
      {data.chartData && (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis 
                domain={yAxisDomain}
                ticks={yAxisTicks}
                tickFormatter={yAxisTickFormatter || ((value) => `${value}m`)} 
                tick={{ fontSize: 12 }} 
              />
              <Tooltip formatter={(value: number) => [`${value} min`, 'Focused Time']} />
              <Bar dataKey="time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              {data.avgTime && <ReferenceLine y={data.avgTime} label={{ value: `Avg: ${Math.round(data.avgTime)}m`, position: 'insideTopRight', fill: '#64748b' }} stroke="#94a3b8" strokeDasharray="3 3" />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const OverviewScreen: React.FC = () => {
    const [dailyDate, setDailyDate] = useState(new Date());
    const [weeklyDate, setWeeklyDate] = useState(new Date());
    const [monthlyDate, setMonthlyDate] = useState(new Date());

    const [dailyData, setDailyData] = useState<OverviewData>({ totalTime: 0 });
    const [weeklyData, setWeeklyData] = useState<OverviewData>({ totalTime: 0, chartData: [], avgTime: 0 });
    const [monthlyData, setMonthlyData] = useState<OverviewData>({ totalTime: 0 });

    const fetchDailyData = useCallback(async () => {
        const dateStr = dateToYYYYMMDD(dailyDate);
        const sessions = await db.getFocusedSessionsByDateRange(dateStr, dateStr);
        const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
        setDailyData({ totalTime });
    }, [dailyDate]);

    const fetchWeeklyData = useCallback(async () => {
        const weekStart = getStartOfWeek(weeklyDate);
        const weekEnd = addDays(weekStart, 6);
        const sessions = await db.getFocusedSessionsByDateRange(dateToYYYYMMDD(weekStart), dateToYYYYMMDD(weekEnd));
        
        const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartData = days.map((day, index) => {
            const dayDateStr = dateToYYYYMMDD(addDays(weekStart, index));
            const daySessions = sessions.filter(s => s.date === dayDateStr);
            const timeInMinutes = Math.round(daySessions.reduce((sum, s) => sum + s.duration, 0) / 60);
            return { day, time: timeInMinutes };
        });

        const avgTime = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.time, 0) / chartData.length : 0;

        setWeeklyData({ totalTime, chartData, avgTime });
    }, [weeklyDate]);
    
    const fetchMonthlyData = useCallback(async () => {
        const monthStart = getStartOfMonth(monthlyDate);
        const monthEnd = getEndOfMonth(monthlyDate);
        const sessions = await db.getFocusedSessionsByDateRange(dateToYYYYMMDD(monthStart), dateToYYYYMMDD(monthEnd));
        const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
        setMonthlyData({ totalTime });
    }, [monthlyDate]);

    useEffect(() => { fetchDailyData(); }, [fetchDailyData]);
    useEffect(() => { fetchWeeklyData(); }, [fetchWeeklyData]);
    useEffect(() => { fetchMonthlyData(); }, [fetchMonthlyData]);
    
    const yAxisWeeklyTicks = Array.from({ length: 25 }, (_, i) => i * 30); // 0 to 720 (12h) in 30min steps
    const yAxisWeeklyTickFormatter = (value: number) => {
        const hours = value / 60;
        if (hours === 0) return '0h';
        return `${hours}h`;
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Overview</h2>
            <div className="space-y-6">
                <OverviewCard
                    title="Daily Overview"
                    dateRange={dailyDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                    data={dailyData}
                    onPrev={() => setDailyDate(d => addDays(d, -1))}
                    onNext={() => setDailyDate(d => addDays(d, 1))}
                />
                <OverviewCard
                    title="Weekly Overview"
                    dateRange={`${dateToYYYYMMDD(getStartOfWeek(weeklyDate))} to ${dateToYYYYMMDD(addDays(getStartOfWeek(weeklyDate), 6))}`}
                    data={weeklyData}
                    onPrev={() => setWeeklyDate(d => addDays(d, -7))}
                    onNext={() => setWeeklyDate(d => addDays(d, 7))}
                    yAxisDomain={[0, 720]}
                    yAxisTicks={yAxisWeeklyTicks}
                    yAxisTickFormatter={yAxisWeeklyTickFormatter}
                />
                <OverviewCard
                    title="Monthly Overview"
                    dateRange={monthlyDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    data={monthlyData}
                    onPrev={() => setMonthlyDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    onNext={() => setMonthlyDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                />
            </div>
        </div>
    );
};

export default OverviewScreen;