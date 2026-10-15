import type { Job, JobInput } from "../lib/db";

/** Every JobInput field, so an edit round-trips fields the form doesn't show. */
export type JobForm = JobInput & {
  location: string; url: string; notes: string; salary: string; description: string;
  deadlineAt: Date | null; fromDiscover: Job["fromDiscover"];
};

export const EMPTY_FORM: JobForm = {
  company: "", title: "", status: "applied", priority: "medium", location: "", url: "", notes: "",
  salary: "", description: "", deadlineAt: null, fromDiscover: null,
};

export function formFromJob(job: Job): JobForm {
  return {
    company: job.company, title: job.title, status: job.status, priority: job.priority,
    location: job.location, url: job.url, notes: job.notes, salary: job.salary,
    description: job.description, deadlineAt: job.deadlineAt, fromDiscover: job.fromDiscover,
  };
}
