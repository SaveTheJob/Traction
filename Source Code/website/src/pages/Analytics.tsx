import { format } from "date-fns";
import { useState } from "react";
import ApplicationVelocityChart from "../components/ApplicationVelocityChart";
import ConversionFunnel from "../components/ConversionFunnel";
import PipelineDistributionChart from "../components/PipelineDistributionChart";
import { useJobs } from "../context/JobContext";
import type { JobStatus } from "../lib/db";
import { JOB_STATUS_LABEL } from "../lib/db";
import { getWeekNumber } from "../utils/date";

export default function Analytics() {
  const { jobs } = useJobs();
  const [timeFilter, setTimeFilter] = useState<"monthly" | "weekly">("monthly");

  // Funnel data
  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name: JOB_STATUS_LABEL[name as JobStatus] ?? name, value }))
    .sort((a, b) => b.value - a.value);

  // Application volume over time; jobs with no date at all are skipped.
  const timelineData = jobs.reduce(
    (acc, job) => {
      const d = job.appliedAt ?? job.createdAt;
      if (!d) return acc;
      const key = timeFilter === "monthly" ? format(d, "MMM yyyy") : getWeekNumber(d);
      const prev = acc.get(key);
      // `start` orders buckets chronologically: first day of the month, or the date itself for weeks.
      const start = timeFilter === "monthly" ? new Date(d.getFullYear(), d.getMonth(), 1).getTime() : d.getTime();
      acc.set(key, { applications: (prev?.applications ?? 0) + 1, start: Math.min(prev?.start ?? start, start) });
      return acc;
    },
    new Map<string, { applications: number; start: number }>(),
  );

  const sortedTimeline = [...timelineData.entries()]
    .sort(([, x], [, y]) => x.start - y.start)
    .map(([name, { applications }]) => ({ name, applications }));

  // High-level stats for the funnel header
  const totalJobs = jobs.length;
  const interviewing = jobs.filter((j) => j.status === "interviewing").length;
  const offers = jobs.filter((j) => j.status === "offer").length;

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 max-w-[1700px] mx-auto space-y-6 sm:space-y-8 h-full overflow-y-auto pb-24">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Analytics Overview
        </h1>
        <p className="text-white mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium">
          Visualize your job search momentum and conversion rates.
        </p>
      </div>
      {/* Massive Area Chart: Application Velocity */}{" "}
      <ApplicationVelocityChart
        data={sortedTimeline}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Status Distribution Pie Chart */}
        <PipelineDistributionChart data={statusData} />

        {/* Conversion Funnel */}
        <ConversionFunnel
          totalJobs={totalJobs}
          saved={jobs.filter((j) => j.status === "saved").length}
          interviewing={interviewing}
          offers={offers}
        />
      </div>
    </div>
  );
}
