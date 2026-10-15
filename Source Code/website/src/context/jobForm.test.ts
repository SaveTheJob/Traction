import { describe, expect, it } from "vitest";
import { EMPTY_FORM, formFromJob } from "../components/jobForm";
import type { Job } from "../lib/db";

const deadline = new Date("2026-11-01T00:00:00Z");
const job = {
  id: "j1", company: "Acme", title: "Intern", location: "", url: "https://a.com", status: "applied",
  priority: "high", notes: "n", salary: "$30/hr", deadlineAt: deadline, description: "Build things",
} as unknown as Job;

describe("job form", () => {
  it("prefills from a job", () => {
    expect(formFromJob(job)).toMatchObject({
      company: "Acme", status: "applied", priority: "high", url: "https://a.com", salary: "$30/hr",
    });
  });
  it("carries the fields the form doesn't show (salary, deadline, description)", () => {
    expect(formFromJob(job)).toMatchObject({ salary: "$30/hr", deadlineAt: deadline, description: "Build things" });
  });
  it("defaults for new jobs: location optional, status applied", () => {
    expect(EMPTY_FORM).toMatchObject({ location: "", status: "applied", priority: "medium" });
  });
});
