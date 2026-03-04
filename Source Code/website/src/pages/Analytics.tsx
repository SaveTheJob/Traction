import { useState } from "react";
import ApplicationVelocityChart from "../components/ApplicationVelocityChart";
import ConversionFunnel from "../components/ConversionFunnel";
import PipelineDistributionChart from "../components/PipelineDistributionChart";
import { useJobs } from "../context/JobContext";
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

  const statusLabelMap: Record<string, string> = { Wishlist: "Saved" };

  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name: statusLabelMap[name] || name, value }))
    .sort((a, b) => b.value - a.value);

  // Application volume over time
  const timelineData = jobs.reduce(
    (acc, job) => {
      const dStr = job.dateApplied; // "Oct 5, 2023" String
      const dateObj = new Date(dStr);

      let key = dStr;
      if (timeFilter === "monthly") {
        const month = dateObj.toLocaleString("default", { month: "short" });
        key = `${month} ${dateObj.getFullYear()}`;
      } else if (timeFilter === "weekly") {
        key = getWeekNumber(dateObj);
      }

      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Sort timeline chronologically
  const sortedTimeline = Object.entries(timelineData)
    .sort(([keyA], [keyB]) => {
      if (timeFilter === "monthly") {
        return new Date(keyA).getTime() - new Date(keyB).getTime();
      } else {
        // Approximate sort for "Week X, YYYY" string
        const yearA = parseInt(keyA.split(", ")[1]);
        const yearB = parseInt(keyB.split(", ")[1]);
        const weekA = parseInt(keyA.split(", ")[0].replace("Week ", ""));
        const weekB = parseInt(keyB.split(", ")[0].replace("Week ", ""));
        if (yearA !== yearB) return yearA - yearB;
        return weekA - weekB;
      }
    })
    .map(([name, applications]) => ({
      name,
      applications,
    }));

  // High-level stats for the funnel header
  const totalJobs = jobs.length;
  const interviewing = jobs.filter((j) => j.status === "Interviewing").length;
  const offers = jobs.filter((j) => j.status === "Offer").length;

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
          saved={jobs.filter((j) => j.status === "Wishlist").length}
          interviewing={interviewing}
          offers={offers}
        />
      </div>
    </div>
  );
}
