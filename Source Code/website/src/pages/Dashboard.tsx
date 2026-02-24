import { useState } from 'react';
import { FileText, Percent, UserCheck, Bell, ChevronRight, Building2, Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { useJobs } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { jobs, openModal, deleteJob } = useJobs();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');

    const totalApplications = jobs.length;
    const interviewingNumber = jobs.filter(j => j.status === 'Interviewing').length;
    const offerNumber = jobs.filter(j => j.status === 'Offer').length;

    // Calculate simple metrics derived from job state
    const interviewRate = totalApplications > 0 ? Math.round(((interviewingNumber + offerNumber) / totalApplications) * 100) : 0;
    const activeLeads = jobs.filter(j => j.status === 'Applied' || j.status === 'Interviewing').length;

    const metrics = [
        { label: 'Total Applications', value: totalApplications.toString(), icon: FileText, change: 'All time', trend: 'neutral' },
        { label: 'Interview Rate', value: `${interviewRate}%`, icon: Percent, change: 'Current conversion', trend: interviewRate > 10 ? 'up' : 'neutral' },
        { label: 'Active Leads', value: activeLeads.toString(), icon: UserCheck, change: 'In progress', trend: 'neutral' },
    ];

    const urgentActions = [
        { title: 'Follow up with active leads', description: 'Review your Applied & Interviewing applications', time: 'Ongoing', priority: 'high' }
    ];

    // Filter and sort jobs
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'All' || job.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    // Reverse so newest applies show first at the top
    const displayJobs = [...filteredJobs].reverse();

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to permanently delete this application? This cannot be undone.")) {
            deleteJob(id);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Interviewing': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Interviewing</span>;
            case 'Applied': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Applied</span>;
            case 'Offer': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Offer</span>;
            case 'Rejected': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
            default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'there';

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">Here is your application overview.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {user?.uid && (
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded border border-blue-100 flex-1 sm:flex-initial justify-between sm:justify-start">
                            <span className="text-[11px] text-blue-700 font-mono truncate max-w-[120px] sm:max-w-none" title={user.uid}>
                                ID: {user.uid}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(user.uid);
                                    alert("Account UID copied to clipboard!");
                                }}
                                className="text-[11px] bg-white text-blue-600 hover:text-blue-800 hover:bg-blue-100 font-medium px-2 py-0.5 rounded shadow-sm border border-blue-200 transition-colors cursor-pointer shrink-0"
                            >
                                Copy
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => openModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm cursor-pointer border border-transparent flex items-center gap-2 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Application</span>
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <metric.icon className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className={`text-sm font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-gray-500'}`}>
                                {metric.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 gap-y-8">
                {/* Recent Activity Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-900">Your Applications</h2>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-48">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-md appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                    <option value="All">All</option>
                                    <option value="Wishlist">Wishlist</option>
                                    <option value="Applied">Applied</option>
                                    <option value="Interviewing">Interviewing</option>
                                    <option value="Offer">Offer</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50/50">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company & Role</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {displayJobs.length > 0 ? displayJobs.map((activity, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200">
                                                        <Building2 className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {activity.link ? (
                                                                <a href={activity.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                                                                    {activity.company}
                                                                </a>
                                                            ) : (
                                                                activity.company
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{activity.title}{activity.location ? ` • ${activity.location}` : ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(activity.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-sm text-gray-900 font-medium">{activity.dateApplied}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openModal(activity.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors inline-flex" title="Edit">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(activity.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors inline-flex" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4}>
                                                <div className="text-center py-12">
                                                    <p className="text-gray-500">No applications found matching your criteria.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Urgent Actions Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 text-red-600">Urgent Actions</h2>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                        </h2>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="divide-y divide-gray-100 flex-1">
                            {urgentActions.map((action, idx) => (
                                <div key={idx} className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {action.title}
                                            </p>
                                            <p className="text-xs text-gray-500">{action.description}</p>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap ml-4">
                                            {action.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 w-full">
                                View Calendar <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
