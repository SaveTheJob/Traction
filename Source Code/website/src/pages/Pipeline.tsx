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
    color:
      "bg-gray-100/50 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/30",
  },
  {
    id: "Applied",
    label: "Applied",
    color:
      "bg-blue-50/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/30",
  },
  {
    id: "Interviewing",
    label: "Interviewing",
    color:
      "bg-purple-50/50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/30",
  },
  {
    id: "Offer",
    label: "Offer",
    color:
      "bg-green-50/50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200/50 dark:border-green-800/30",
  },
  {
    id: "Rejected",
    label: "Rejected",
    color:
      "bg-red-50/50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200/50 dark:border-red-800/30",
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
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            Pipeline
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base font-medium">
            Track your job applications across different stages.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72 group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-lg transition-opacity opacity-0 group-hover:opacity-100" />
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm border border-white/20 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner relative z-0 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl blur-sm" />
            <select
              value={filterPriority}
              onChange={(e) =>
                setFilterPriority(e.target.value as Priority | "All")
              }
              className="pl-10 pr-10 py-3 text-sm border border-white/20 dark:border-white/10 rounded-xl appearance-none bg-white/50 dark:bg-black/20 backdrop-blur-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer shadow-sm relative z-0 font-medium"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 shrink-0 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />{" "}
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
              className="flex-shrink-0 w-80 glass rounded-3xl border border-white/40 dark:border-white/5 flex flex-col h-full max-h-[calc(100vh-12rem)] shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-white/50 to-transparent dark:from-white/5">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {col.label}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-black shadow-sm flex items-center justify-center min-w-[1.5rem] border ${col.color}`}
                >
                  {filteredJobs.filter((j) => j.status === col.id).length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`p-3 flex-1 overflow-y-auto space-y-3 transition-colors scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent ${snapshot.isDraggingOver ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}`}
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
