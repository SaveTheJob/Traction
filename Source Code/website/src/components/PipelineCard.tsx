import { Draggable } from "@hello-pangea/dnd";
import { Building2, Calendar, Edit2, GripVertical, Trash2 } from "lucide-react";
import type { Job, Priority } from "../context/JobContext";

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
  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case "High":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "Medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800";
      case "Low":
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group ${snapshot.isDragging ? "shadow-lg ring-2 ring-blue-500 ring-opacity-50 rotate-2" : ""}`}
          style={provided.draggableProps.style}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                {...provided.dragHandleProps}
                className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing transition-colors hidden group-hover:block -ml-2"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="w-10 h-10 rounded bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center flex-shrink-0 group-hover:border-blue-100 dark:group-hover:border-blue-800 transition-colors">
                <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal(job.id)}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors hidden group-hover:block"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(job.id)}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors hidden group-hover:block"
                title="Force Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(job.priority)}`}
              >
                {job.priority}
              </span>
            </div>
          </div>
          <h4 className="font-bold text-gray-900 dark:text-white text-sm">
            {job.title}
          </h4>
          {job.link ? (
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm mt-0.5 max-w-[220px] truncate block"
              title={`${job.company}${job.location ? ` • ${job.location}` : ""}`}
            >
              {job.company}
              {job.location ? ` • ${job.location}` : ""}
            </a>
          ) : (
            <p
              className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 max-w-[220px] truncate"
              title={`${job.company}${job.location ? ` • ${job.location}` : ""}`}
            >
              {job.company}
              {job.location ? ` • ${job.location}` : ""}
            </p>
          )}

          {job.notes && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-600 italic line-clamp-2">
              "{job.notes}"
            </div>
          )}

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
