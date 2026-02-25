import { useState } from "react";
import ApplicationVelocityChart from "../components/ApplicationVelocityChart";
import ConversionFunnel from "../components/ConversionFunnel";
import PipelineDistributionChart from "../components/PipelineDistributionChart";
import { useJobs } from "../context/JobContext";

export default function Analytics() {
  const { jobs } = useJobs();
  const [timeFilter, setTimeFilter] = useState<"monthly" | "weekly">("monthly");

  // 1. Calculate Status Distribution (Funnel)
  const statusCounts = jobs.reduce(
    (acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Helper to get week number
  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `Week ${weekNo}, ${d.getUTCFullYear()}`;
  };

  // 2. Calculate Application velocity (Area chart)
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

  // 3. Simple high-level numbers for the funnel
  const totalJobs = jobs.length;
  const interviewing = jobs.filter((j) => j.status === "Interviewing").length;
  const offers = jobs.filter((j) => j.status === "Offer").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 h-full overflow-y-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-base">
          Visualize your job search momentum and conversion rates.
        </p>
      </div>

      {/* Massive Area Chart: Application Velocity */}
      <ApplicationVelocityChart
        data={sortedTimeline}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution Pie Chart */}
        <PipelineDistributionChart data={statusData} />

        {/* Status Bar Chart (Alternative View) */}
        <ConversionFunnel
          totalJobs={totalJobs}
          interviewing={interviewing}
          offers={offers}
        />
      </div>
    </div>
  );
}
