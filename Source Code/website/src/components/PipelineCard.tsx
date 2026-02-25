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
        return "bg-red-50 text-red-700 border-red-200";
      case "Medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Low":
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group ${snapshot.isDragging ? "shadow-lg ring-2 ring-blue-500 ring-opacity-50 rotate-2" : ""}`}
          style={provided.draggableProps.style}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                {...provided.dragHandleProps}
                className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors hidden group-hover:block -ml-2"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:border-blue-100 transition-colors">
                <Building2 className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal(job.id)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors hidden group-hover:block"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(job.id)}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors hidden group-hover:block"
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
          <h4 className="font-bold text-gray-900 text-sm">{job.title}</h4>
          {job.link ? (
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline text-sm mt-0.5 max-w-[220px] truncate block"
              title={`${job.company}${job.location ? ` • ${job.location}` : ""}`}
            >
              {job.company}
              {job.location ? ` • ${job.location}` : ""}
            </a>
          ) : (
            <p
              className="text-gray-500 text-sm mt-0.5 max-w-[220px] truncate"
              title={`${job.company}${job.location ? ` • ${job.location}` : ""}`}
            >
              {job.company}
              {job.location ? ` • ${job.location}` : ""}
            </p>
          )}

          {job.notes && (
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 italic line-clamp-2">
              "{job.notes}"
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
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
