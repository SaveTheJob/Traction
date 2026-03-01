import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Priority, Status } from "../context/JobContext";
import { useJobs } from "../context/JobContext";
import CustomSelect from "./CustomSelect";

export default function NewApplicationModal() {
  const {
    jobs,
    isModalOpen,
    closeModal,
    addJob,
    updateJob,
    editingJobId,
    limitError,
    clearLimitError,
  } = useJobs();

  // Form state
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<Status>("Applied");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isModalOpen && editingJobId) {
      const jobToEdit = jobs.find((j) => j.id === editingJobId);
      if (jobToEdit) {
        setCompany(jobToEdit.company);
        setTitle(jobToEdit.title);
        setLocation(jobToEdit.location || "");
        setLink(jobToEdit.link || "");
        setStatus(jobToEdit.status);
        setPriority(jobToEdit.priority);
        setNotes(jobToEdit.notes || "");
      }
    } else if (isModalOpen && !editingJobId) {
      setCompany("");
      setTitle("");
      setLocation("");
      setLink("");
      setStatus("Applied");
      setPriority("Medium");
      setNotes("");
    }
    if (isModalOpen) clearLimitError();
  }, [isModalOpen, editingJobId, jobs, clearLimitError]);

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !title || !location) return;

    const jobData = { company, title, location, link, status, priority, notes };
    if (editingJobId) {
      updateJob(editingJobId, jobData);
      closeModal();
    } else {
      const success = await addJob(jobData);
      if (success) closeModal();
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
          {limitError && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-800 text-red-300 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {limitError}
            </div>
          )}
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
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
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
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                value={link}
                onChange={(e) => setLink(e.target.value)}
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
                  value={status}
                  onChange={(val) => setStatus(val as Status)}
                  variant="solid"
                  className="text-sm font-medium"
                  options={[
                    { value: "Wishlist", label: "Saved" },
                    { value: "Applied", label: "Applied" },
                    { value: "Interviewing", label: "Interviewing" },
                    { value: "Offer", label: "Offer" },
                    { value: "Rejected", label: "Rejected" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1">
                  Priority
                </label>
                <CustomSelect
                  value={priority}
                  onChange={(val) => setPriority(val as Priority)}
                  variant="solid"
                  className="text-sm font-medium"
                  options={[
                    { value: "High", label: "High" },
                    { value: "Medium", label: "Medium" },
                    { value: "Low", label: "Low" },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any details..."
                className="w-full px-3 py-2 border border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-slate-700 text-white placeholder-slate-500"
              ></textarea>
            </div>
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
            className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl transition-all shadow-sm cursor-pointer"
          >
            {isEditing ? "Save Changes" : "Save Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
