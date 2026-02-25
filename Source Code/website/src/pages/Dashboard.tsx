import {
  Building2,
  Edit2,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobContext";

import MetricsGrid from "../components/MetricsGrid";
import StatusBadge from "../components/StatusBadge";
import UrgentActions from "../components/UrgentActions";

export default function Dashboard() {
  const { jobs, openModal, deleteJob } = useJobs();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const totalApplications = jobs.length;
  const interviewingNumber = jobs.filter(
    (j) => j.status === "Interviewing",
  ).length;
  const offerNumber = jobs.filter((j) => j.status === "Offer").length;

  // Calculate simple metrics derived from job state
  const interviewCount = interviewingNumber + offerNumber;
  const activeLeads = jobs.filter(
    (j) => j.status === "Applied" || j.status === "Interviewing",
  ).length;

  const metrics = [
    {
      label: "Total Applications",
      value: totalApplications.toString(),
      icon: FileText,
      change: "All time",
      trend: "neutral", // You can calculate real trends if you have historical data
    },
    {
      label: "Interviews",
      value: interviewCount.toString(),
      icon: UserCheck,
      change: "Lined up",
      trend: "neutral",
    },
    {
      label: "Active Leads",
      value: activeLeads.toString(),
      icon: UserCheck,
      change: "In progress",
      trend: "neutral",
    },
  ];

  const urgentActions = [
    {
      title: "Follow up with active leads",
      description: "Review your Applied & Interviewing applications",
      time: "Ongoing",
      priority: "high",
    },
  ];

  // Filter and sort jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Reverse so newest applies show first at the top
  const displayJobs = [...filteredJobs].reverse();

  const handleDelete = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this application? This cannot be undone.",
      )
    ) {
      deleteJob(id);
    }
  };

  const firstName = user?.displayName
    ? user.displayName.split(" ")[0]
    : "there";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
            Here is your application overview.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm cursor-pointer border border-transparent flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">New Application</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <MetricsGrid metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 gap-y-6 md:gap-y-8 pb-12">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Your Applications
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-9 pr-8 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
          <div className="card-3d rounded-3xl overflow-visible shadow-2xl transition-all hover:shadow-3xl transform hover:-translate-y-1 duration-500">
            <div className="overflow-x-auto rounded-3xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200/40 dark:border-white/5 bg-gray-50/30 dark:bg-black/20 backdrop-blur-md">
                    <th className="px-8 py-5 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-8">
                      Company & Role
                    </th>
                    <th className="px-6 py-5 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-5 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Applied
                    </th>
                    <th className="px-8 py-5 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right pr-8">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50 dark:divide-white/5">
                  {displayJobs.length > 0 ? (
                    displayJobs.map((activity, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-white/40 dark:hover:bg-white/5 transition-all duration-300 group relative"
                      >
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl icon-3d-container bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                              <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                                {activity.link ? (
                                  <a
                                    href={activity.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                                  >
                                    {activity.company}
                                  </a>
                                ) : (
                                  activity.company
                                )}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {activity.title}
                                {activity.location
                                  ? ` • ${activity.location}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={activity.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900 dark:text-gray-300 font-medium">
                            {activity.dateApplied}
                          </p>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-right pr-8">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                            <button
                              onClick={() => openModal(activity.id)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(activity.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        <div className="text-center py-24 glass rounded-3xl m-4 border-dashed border-2 border-gray-300 dark:border-gray-700">
                          <p className="text-xl font-bold text-gray-400 dark:text-gray-600 animate-pulse">
                            No applications found... yet.
                          </p>
                          <p className="text-sm text-gray-400 dark:text-gray-600 mt-2">
                            Time to start your job hunt!
                          </p>
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
        <UrgentActions actions={urgentActions} />
      </div>
    </div>
  );
}
