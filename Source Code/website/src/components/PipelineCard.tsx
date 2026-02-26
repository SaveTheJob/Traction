import { Draggable } from "@hello-pangea/dnd";
import { Calendar, Edit2, Trash2 } from "lucide-react";
import type { Job } from "../context/JobContext";

interface PipelineCardProps {
  job: Job;
  index: number;
  openModal: (id: string) => void;
  handleDelete: (id: string) => void;
}

export default function PipelineCard({
  job,
  index,
  openModal,
  handleDelete,
}: PipelineCardProps) {
  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            group relative p-6 transition-all duration-300
            ${snapshot.isDragging
              ? "rotate-2 scale-105 z-50 shadow-2xl premium-glass-heavy ring-2 ring-white/50 dark:ring-white/20"
              : "premium-glass-heavy hover:-translate-y-1"
            }
          `}
          style={provided.draggableProps.style}
        >
          <div className="relative z-10 flex flex-col gap-4">
            {/* Header: Avatar and Title */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-white flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-inner border border-white/40 dark:border-white/10 backdrop-blur-md">
                {job.company.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight truncate">
                    {job.title}
                  </h4>
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border backdrop-blur-md shadow-sm ${job.priority === "High"
                      ? "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400"
                      : job.priority === "Medium"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                        : "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300"
                      }`}
                  >
                    {job.priority}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-semibold truncate max-w-[120px]" title={job.company}>
                    {job.company}
                  </span>
                  {job.location && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="truncate max-w-[80px]" title={job.location}>
                        {job.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer: Date & Actions */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                <div className="w-6 h-6 rounded-full bg-white/50 dark:bg-slate-800/50 shadow-inner flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                </div>
                {job.dateApplied}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openModal(job.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 bg-transparent hover:bg-slate-100 rounded-full transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 bg-transparent hover:bg-red-50 rounded-full transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
