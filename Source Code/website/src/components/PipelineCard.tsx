import { Draggable } from "@hello-pangea/dnd";
import { Building2, Calendar, Edit2, Trash2 } from "lucide-react";
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
            group relative p-5 rounded-2xl transition-all duration-300
            ${
              snapshot.isDragging
                ? "rotate-3 scale-105 z-50 shadow-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-blue-500/50"
                : "bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border-white/20 dark:border-white/5 hover:-translate-y-1 hover:shadow-lg card-3d"
            }
            border shadow-sm
          `}
          style={provided.draggableProps.style}
        >
          {/* Decorative Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent rounded-2xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between mb-3 gap-3">
            <div className="icon-3d-container w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-white/50 dark:border-white/10 shadow-inner flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate pr-2">
                {job.title}
              </h4>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span
                  className="font-medium truncate max-w-[120px]"
                  title={job.company}
                >
                  {job.company}
                </span>
                {job.location && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span
                      className="truncate max-w-[80px]"
                      title={job.location}
                    >
                      {job.location}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div
              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                job.priority === "High"
                  ? "bg-red-100/80 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                  : job.priority === "Medium"
                    ? "bg-amber-100/80 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                    : "bg-gray-100/80 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700"
              }`}
            >
              {job.priority}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between mt-4 pl-1">
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openModal(job.id)}
                className="p-1.5 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="Edit Application"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(job.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="Delete Application"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Applied {job.dateApplied}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
