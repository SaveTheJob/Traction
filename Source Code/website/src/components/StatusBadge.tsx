import type { JobStatus } from "../lib/db";
import { JOB_STATUS_LABEL } from "../lib/db";

interface StatusBadgeProps {
  status: JobStatus;
}

const STYLE: Record<JobStatus, string> = {
  interviewing: "bg-blue-900/30 text-blue-300",
  applied: "bg-slate-800 text-slate-300",
  offer: "bg-green-900/30 text-green-300",
  rejected: "bg-red-900/30 text-red-300",
  saved: "bg-purple-900/30 text-purple-300",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STYLE[status]}`}>
      {JOB_STATUS_LABEL[status]}
    </span>
  );
}
