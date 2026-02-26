import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import PipelineCard from "../components/PipelineCard";
import type { Priority, Status } from "../context/JobContext";
import { useJobs } from "../context/JobContext";

const COLUMNS: { id: Status; label: string; color: string }[] = [
  {
    id: "Wishlist",
    label: "Wishlist",
    color: "premium-glass-heavy text-slate-700 dark:text-slate-300",
  },
  {
    id: "Applied",
    label: "Applied",
    color: "premium-glass-heavy text-blue-700 dark:text-blue-300",
  },
  {
    id: "Interviewing",
    label: "Interviewing",
    color: "premium-glass-heavy text-purple-700 dark:text-purple-300",
  },
  {
    id: "Offer",
    label: "Offer",
    color: "premium-glass-heavy text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "Rejected",
    label: "Rejected",
    color: "premium-glass-heavy text-red-700 dark:text-red-300",
  },
];

export default function Pipeline() {
  const { jobs, updateJobStatus, openModal, deleteJob } = useJobs();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    updateJobStatus(draggableId, destination.droppableId as Status);
  };

  const handleDelete = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this application? This cannot be undone.",
      )
    ) {
      deleteJob(id);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority =
      filterPriority === "All" || job.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="p-4 md:p-8 h-full flex flex-col max-w-[1700px] mx-auto overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 flex-shrink-0 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Pipeline Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">
            Manage and track your active opportunities.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700/50 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <select
              value={filterPriority}
              onChange={(e) =>
                setFilterPriority(e.target.value as Priority | "All")
              }
              className="pl-11 pr-10 py-2.5 text-sm border border-slate-200 dark:border-slate-700/50 rounded-full appearance-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 cursor-pointer shadow-sm font-medium transition-all"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          <button
            onClick={() => openModal()}
            className="premium-glass-heavy hover:bg-white/80 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-2 shrink-0 group"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />{" "}
            <span className="hidden sm:inline">New Application</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6 items-start h-full px-1">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="flex-shrink-0 w-80 premium-glass rounded-[2rem] flex flex-col h-full max-h-[calc(100vh-12rem)] shadow-xl overflow-hidden"
            >
              <div className="px-6 py-5 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] flex items-center gap-2 tracking-wide">
                  {col.label}
                </h3>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center justify-center min-w-[1.75rem] border ${col.color}`}
                >
                  {filteredJobs.filter((j) => j.status === col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`p-4 pt-1 flex-1 overflow-y-auto space-y-4 transition-colors scrollbar-hide ${snapshot.isDraggingOver ? "bg-white/30 dark:bg-black/20 rounded-b-[2rem]" : ""}`}
                  >
                    {filteredJobs
                      .filter((j) => j.status === col.id)
                      .map((job, index) => (
                        <PipelineCard
                          key={job.id}
                          job={job}
                          index={index}
                          openModal={openModal}
                          handleDelete={handleDelete}
                        />
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
