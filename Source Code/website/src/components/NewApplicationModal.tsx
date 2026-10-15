import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useJobs } from "../context/JobContext";
import { jobsErrorMessage } from "../lib/errors";
import type { JobStatus, Priority } from "../lib/db";
import { JOB_STATUSES, JOB_STATUS_LABEL, PRIORITY_LABEL } from "../lib/db";
import CustomSelect from "./CustomSelect";
import type { JobForm } from "./jobForm";
import { EMPTY_FORM, formFromJob } from "./jobForm";

export default function NewApplicationModal() {
  const { jobs, isModalOpen, closeModal, createJob, updateJob, editingJobId } = useJobs();

  // The form is seeded once per open. Later snapshots (another tab, the
  // extension) must not overwrite what the user is typing, so the effect reads
  // the job list through a ref instead of depending on it.
  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const [form, setForm] = useState<JobForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof JobForm>(key: K, value: JobForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!isModalOpen) return;
    const jobToEdit = editingJobId ? jobsRef.current.find((j) => j.id === editingJobId) : undefined;
    setForm(jobToEdit ? formFromJob(jobToEdit) : EMPTY_FORM);
    setError("");
    setSaving(false);
  }, [isModalOpen, editingJobId]);

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // The rules reject empty names, so catch it here with a message.
    if (!form.company.trim() || !form.title.trim()) {
      setError("Company and job title are required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (editingJobId) {
        await updateJob(editingJobId, form);
        closeModal();
      } else if ((await createJob(form)) !== null) {
        closeModal();
      } else {
        setError(jobsErrorMessage(null));
      }
    } catch (err) {
      setError(jobsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = !!editingJobId;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm shadow-2xl">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] border border-slate-700">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white">
            {isEditing ? "Edit Application" : "New Application"}
          </h2>
          <button
            onClick={closeModal}
            className="p-1 text-slate-300 hover:text-slate-300 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
          <form
            id="global-add-job-form"
            className="space-y-4"
            onSubmit={handleSubmit}
          >
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">
                Company Name
              </label>
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                type="text"
                placeholder="e.g. Google"
                className="w-full px-3 py-2 border border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                type="text"
                placeholder="e.g. San Francisco, CA or Remote"
                className="w-full px-3 py-2 border border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">
                Job Title
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                type="text"
                placeholder="e.g. Software Engineer"
                className="w-full px-3 py-2 border border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">
                Job Link
              </label>
              <input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                type="url"
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">
                  Status
                </label>
                <CustomSelect
                  value={form.status}
                  onChange={(val) => set("status", val as JobStatus)}
                  variant="solid"
                  className="text-sm font-medium"
                  options={JOB_STATUSES.map((value) => ({ value, label: JOB_STATUS_LABEL[value] }))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">
                  Priority
                </label>
                <CustomSelect
                  value={form.priority}
                  onChange={(val) => set("priority", val as Priority)}
                  variant="solid"
                  className="text-sm font-medium"
                  options={(Object.keys(PRIORITY_LABEL) as Priority[]).map((value) => ({ value, label: PRIORITY_LABEL[value] }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Any details..."
                className="w-full px-3 py-2 border border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-slate-700 text-white placeholder-slate-500"
              ></textarea>
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-red-400">
                {error}
              </p>
            )}
          </form>
        </div>
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-700 flex items-center justify-end gap-3 bg-slate-800/50">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 text-sm font-bold text-slate-300 bg-slate-800 border border-slate-600 rounded-2xl hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="global-add-job-form"
            disabled={saving}
            className="disabled:opacity-60 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl transition-all shadow-sm cursor-pointer"
          >
            {isEditing ? "Save Changes" : "Save Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
