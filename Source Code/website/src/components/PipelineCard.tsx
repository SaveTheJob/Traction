import { Draggable } from "@hello-pangea/dnd";
import { Briefcase, Calendar, Edit2, MapPin, Trash2 } from "lucide-react";
import type { Job } from "../context/JobContext";

interface PipelineCardProps {
  job: Job;
  index: number;
  openModal: (id: string) => void;
  handleDelete: (id: string) => void;
}

const priorityMeta: Record<string, { border: string; badge: string; glow: string; text: string }> = {
  High: { border: "border-red-500", badge: "bg-red-500/20 text-red-400", glow: "shadow-red-500/10", text: "HIGH" },
  Medium: { border: "border-amber-400", badge: "bg-amber-400/20 text-amber-300", glow: "shadow-amber-400/10", text: "MED" },
  Low: { border: "border-blue-400", badge: "bg-blue-400/20 text-blue-300", glow: "shadow-blue-400/10", text: "LOW" },
};

export default function PipelineCard({ job, index, openModal, handleDelete }: PipelineCardProps) {
  const pm = priorityMeta[job.priority ?? "Low"] ?? priorityMeta.Low;
  const initial = job.company.charAt(0).toUpperCase();

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={`
            group relative flex gap-0 rounded-2xl overflow-hidden
            transition-all duration-200 cursor-grab active:cursor-grabbing
            ${snapshot.isDragging
              ? `rotate-1 scale-[1.03] z-50 shadow-2xl ${pm.glow}`
              : `hover:-translate-y-1 shadow-lg hover:shadow-xl ${pm.glow}`
            }
          `}
        >
          {/* Left priority bar */}
          <div className={`w-1 flex-shrink-0 ${pm.border} border-l-4`} />

          {/* Card body */}
          <div className="flex-1 bg-[#1a2236]/90 backdrop-blur-md border border-white/8 border-l-0 rounded-r-2xl p-4 flex flex-col gap-3">

            {/* Top row: avatar + company + priority */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-[14px] leading-tight truncate">{job.company}</p>
                  <p className="text-[12px] text-slate-400 truncate mt-0.5">{job.title}</p>
                </div>
              </div>
              {/* Priority badge */}
              <span className={`text-[10px] font-extrabold tracking-widest px-2 py-0.5 rounded-md flex-shrink-0 ${pm.badge}`}>
                {pm.text}
              </span>
            </div>

            {/* Info chips row */}
            <div className="flex items-center gap-2 flex-wrap">
              {job.dateApplied && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 rounded-full px-2.5 py-1 border border-white/8">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  {job.dateApplied}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-white/5 rounded-full px-2.5 py-1 border border-white/8 truncate max-w-[120px]">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {job.location}
                </span>
              )}
              {!job.dateApplied && !job.location && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-white/5 rounded-full px-2.5 py-1 border border-white/8">
                  <Briefcase className="w-3 h-3 flex-shrink-0" />
                  No details yet
                </span>
              )}
            </div>

            {/* Actions row — visible on hover */}
            <div className="flex items-center justify-end gap-1 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 -mt-1">
              <button
                onClick={() => openModal(job.id)}
                className="p-1 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                title="Edit"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(job.id)}
                className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
