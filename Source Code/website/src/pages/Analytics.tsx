import { useState } from 'react';
import { useJobs } from '../context/JobContext';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export default function Analytics() {
    const { jobs } = useJobs();
    const [timeFilter, setTimeFilter] = useState<'monthly' | 'weekly'>('monthly');

    // 1. Calculate Status Distribution (Funnel)
    const statusCounts = jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Helper to get week number
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `Week ${weekNo}, ${d.getUTCFullYear()}`;
    };

    // 2. Calculate Application velocity (Area chart)
    const timelineData = jobs.reduce((acc, job) => {
        const dStr = job.dateApplied; // "Oct 5, 2023" String
        const dateObj = new Date(dStr);

        let key = dStr;
        if (timeFilter === 'monthly') {
            const month = dateObj.toLocaleString('default', { month: 'short' });
            key = `${month} ${dateObj.getFullYear()}`;
        } else if (timeFilter === 'weekly') {
            key = getWeekNumber(dateObj);
        }

        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Sort timeline chronologically
    const sortedTimeline = Object.entries(timelineData)
        .sort(([keyA], [keyB]) => {
            if (timeFilter === 'monthly') {
                return new Date(keyA).getTime() - new Date(keyB).getTime();
            } else {
                // Approximate sort for "Week X, YYYY" string
                const yearA = parseInt(keyA.split(', ')[1]);
                const yearB = parseInt(keyB.split(', ')[1]);
                const weekA = parseInt(keyA.split(', ')[0].replace('Week ', ''));
                const weekB = parseInt(keyB.split(', ')[0].replace('Week ', ''));
                if (yearA !== yearB) return yearA - yearB;
                return weekA - weekB;
            }
        })
        .map(([name, applications]) => ({
            name,
            applications
        }));

    // 3. Simple high-level numbers for the funnel
    const totalJobs = jobs.length;
    const interviewing = jobs.filter(j => j.status === 'Interviewing').length;
    const offers = jobs.filter(j => j.status === 'Offer').length;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 h-full overflow-y-auto pb-24">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-500 mt-1 text-base">Visualize your job search momentum and conversion rates.</p>
            </div>

            {/* Massive Area Chart: Application Velocity */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Application Velocity</h2>
                        <p className="text-sm text-gray-500 mt-1">Number of applications submitted over time</p>
                    </div>
                    <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button
                            onClick={() => setTimeFilter('weekly')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'weekly' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => setTimeFilter('monthly')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Monthly
                        </button>
                    </div>
                </div>
                {sortedTimeline.length > 0 ? (
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sortedTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} dx={-10} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                                />
                                <Area type="monotone" dataKey="applications" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" activeDot={{ r: 8 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[400px] flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        Not enough data. Start adding applications!
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Distribution Pie Chart */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900">Pipeline Distribution</h2>
                        <p className="text-sm text-gray-500 mt-1">Current breakdown of all active and past applications</p>
                    </div>
                    {statusData.length > 0 ? (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {statusData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => [`${value} applications`, 'Count']}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            Not enough data to calculate distribution
                        </div>
                    )}
                </div>

                {/* Status Bar Chart (Alternative View) */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm flex flex-col justify-between">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-900">Conversion Funnel</h2>
                        <p className="text-sm text-gray-500 mt-1">Visualize your success rate from application to offer</p>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-6">
                        <div className="relative">
                            <div className="flex justify-between text-sm font-semibold mb-2">
                                <span className="text-gray-700">Total Applied</span>
                                <span className="text-gray-900">{totalJobs}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                <div className="bg-blue-500 h-4 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex justify-between text-sm font-semibold mb-2">
                                <span className="text-gray-700">Interviewing</span>
                                <span className="text-gray-900">{interviewing}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                <div className="bg-blue-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${totalJobs > 0 ? (interviewing / totalJobs) * 100 : 0}%` }}></div>
                            </div>
                            {totalJobs > 0 && <span className="absolute -right-12 top-8 text-xs font-bold text-blue-600">{Math.round((interviewing / totalJobs) * 100)}%</span>}
                        </div>

                        <div className="relative">
                            <div className="flex justify-between text-sm font-semibold mb-2">
                                <span className="text-gray-700">Offers</span>
                                <span className="text-gray-900">{offers}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                                <div className="bg-green-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${totalJobs > 0 ? (offers / totalJobs) * 100 : 0}%` }}></div>
                            </div>
                            {interviewing > 0 && <span className="absolute -right-12 top-8 text-xs font-bold text-green-600">{Math.round((offers / interviewing) * 100)}%</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
