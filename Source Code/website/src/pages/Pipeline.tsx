import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Filter, Plus, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import CustomSelect from "../components/CustomSelect";
import PipelineCard from "../components/PipelineCard";
import type { Priority, Status } from "../context/JobContext";
import { useJobs } from "../context/JobContext";

const COLUMNS: { id: Status; label: string; color: string }[] = [
  {
    id: "Wishlist",
    label: "Saved",
    color: "premium-glass-heavy text-slate-300",
  },
  {
    id: "Applied",
    label: "Applied",
    color: "premium-glass-heavy text-blue-300",
  },
  {
    id: "Interviewing",
    label: "Interviewing",
    color: "premium-glass-heavy text-purple-300",
  },
  {
    id: "Offer",
    label: "Offer",
    color: "premium-glass-heavy text-emerald-300",
  },
  {
    id: "Rejected",
    label: "Rejected",
    color: "premium-glass-heavy text-red-300",
  },
];

export default function Pipeline() {
  const { jobs, updateJobStatus, openModal, deleteJob } = useJobs();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      updateJobStatus(draggableId, destination.droppableId as Status);
    },
    [updateJobStatus],
  );

  const handleDelete = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (confirmDeleteId) {
      deleteJob(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, deleteJob]);

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesSearch =
          job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority =
          filterPriority === "All" || job.priority === filterPriority;
        return matchesSearch && matchesPriority;
      }),
    [jobs, searchQuery, filterPriority],
  );

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 h-full flex flex-col max-w-[1700px] mx-auto overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 sm:mb-6 lg:mb-8 flex-shrink-0 gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Pipeline Overview
          </h1>
          <p className="text-white mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium">
            Manage and track your active opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="w-4 h-4 text-slate-300 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 text-sm border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white/10 backdrop-blur-sm text-white placeholder-slate-200 font-medium shadow-inner"
            />
          </div>
          <CustomSelect
            value={filterPriority}
            onChange={(val) => setFilterPriority(val as Priority | "All")}
            icon={<Filter className="w-4 h-4" />}
            variant="glass"
            options={[
              { value: "All", label: "All Priorities" },
              { value: "High", label: "High Priority" },
              { value: "Medium", label: "Medium Priority" },
              { value: "Low", label: "Low Priority" },
            ]}
            className="w-40 sm:w-44 text-sm font-medium"
          />
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 px-4 sm:px-6 py-2.5 rounded-2xl font-bold text-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">New Application</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 sm:gap-6 overflow-x-auto pb-4 sm:pb-6 items-start h-full px-1 scrollbar-theme">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="flex-shrink-0 w-[16.5rem] sm:w-72 lg:w-80 rounded-3xl flex flex-col h-full max-h-[calc(100vh-14rem)] sm:max-h-[calc(100vh-12rem)] shadow-xl premium-glass-heavy"
            >
              <div className="px-4 sm:px-6 py-3 sm:py-5 flex items-center justify-between rounded-t-3xl">
                <h3 className="font-bold text-slate-100 text-[15px] flex items-center gap-2 tracking-wide">
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
                    className={`p-4 pt-1 pr-2 pb-2 flex-1 overflow-y-auto space-y-3 transition-all duration-200 ease-out scrollbar-theme rounded-b-3xl ${
                      snapshot.isDraggingOver
                        ? "bg-blue-400/5 ring-2 ring-inset ring-blue-400/15"
                        : ""
                    }`}
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

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Application"
        message="Are you sure you want to permanently delete this application? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
