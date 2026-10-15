/* eslint-disable react-refresh/only-export-components -- context file intentionally exports its provider and consumer hook together */
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ToastMessage } from "../components/Toast";
import ToastContainer from "../components/Toast";
import { useEffectiveUserId } from "../hooks/useEffectiveUserId";
import type { Job, JobInput, JobSource, JobStatus } from "../lib/db";
import { jobFromDoc, jobStatusChange, jobUpdate, newJobDoc, refs } from "../lib/db";
import { jobsErrorMessage } from "../lib/errors";

interface JobContextType {
  jobs: Job[];
  /** Resolves to the new document id, or null on failure (a toast explains). */
  createJob: (input: JobInput, source?: JobSource) => Promise<string | null>;
  /** Throws on failure so the caller can show the error next to the form. */
  updateJob: (id: string, input: JobInput) => Promise<void>;
  updateJobStatus: (id: string, status: JobStatus) => Promise<void>;
  markFollowedUp: (id: string) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  isModalOpen: boolean;
  editingJobId: string | null;
  openModal: (jobId?: string) => void;
  closeModal: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const uid = useEffectiveUserId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Callbacks read the latest list without re-subscribing on every snapshot.
  const jobsRef = useRef<Job[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const toastError = useCallback((message: string) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type: "error" }]);
  }, []);

  useEffect(() => {
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
      setJobs([]);
      return;
    }
    return onSnapshot(
      query(refs.jobs(uid), orderBy("createdAt", "asc")),
      (snap) => setJobs(snap.docs.map((d) => jobFromDoc(d.id, d.data()))),
      (e) => console.error("Error listening to jobs: ", e),
    );
  }, [uid]);

  const createJob = async (input: JobInput, source?: JobSource): Promise<string | null> => {
    if (!uid) return null;
    try {
      const ref = await addDoc(refs.jobs(uid), newJobDoc(input, source ?? "manual"));
      return ref.id;
    } catch (e) {
      console.error("Error adding job: ", e);
      toastError(jobsErrorMessage(e));
      return null;
    }
  };

  const updateJob = async (id: string, input: JobInput) => {
    if (!uid) return;
    const current = jobsRef.current.find((j) => j.id === id);
    if (!current) throw new Error("Job not found");
    try {
      await updateDoc(refs.job(uid, id), jobUpdate(current, input));
    } catch (e) {
      console.error("Error updating job: ", e);
      throw e;
    }
  };

  const updateJobStatus = async (id: string, status: JobStatus) => {
    if (!uid) return;
    const current = jobsRef.current.find((j) => j.id === id);
    const update = current && jobStatusChange(current, status);
    if (!update) return;
    try {
      await updateDoc(refs.job(uid, id), update);
    } catch (e) {
      console.error("Error updating job status: ", e);
      toastError(jobsErrorMessage(e));
    }
  };

  const markFollowedUp = async (id: string) => {
    if (!uid) return;
    try {
      await updateDoc(refs.job(uid, id), { followedUpAt: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Error marking follow-up: ", e);
      toastError(jobsErrorMessage(e));
    }
  };

  const deleteJob = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(refs.job(uid, id));
    } catch (e) {
      console.error("Error deleting job: ", e);
      toastError("Couldn't delete. Try again.");
    }
  };

  const openModal = (jobId?: string) => {
    setEditingJobId(jobId || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingJobId(null), 200); // clear after animation
  };

  return (
    <JobContext.Provider
      value={{
        jobs, createJob, updateJob, updateJobStatus, markFollowedUp, deleteJob,
        isModalOpen, editingJobId, openModal, closeModal,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </JobContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error("useJobs must be used within a JobProvider");
  }
  return context;
}
