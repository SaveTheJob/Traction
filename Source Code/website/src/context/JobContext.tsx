import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useEffectiveUserId } from "../hooks/useEffectiveUserId";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

export type Priority = "High" | "Medium" | "Low";
export type Status =
  | "Wishlist"
  | "Applied"
  | "Interviewing"
  | "Offer"
  | "Rejected";

export interface JobDocument {
  id: string;
  name: string;
  url: string;
  path: string;
  uploadedAt: string;
}

export interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  link?: string;
  dateApplied: string;
  priority: Priority;
  status: Status;
  notes?: string;
  documents?: JobDocument[];
  userId?: string;
  createdAt?: import("firebase/firestore").Timestamp | null;
}

export type JobDataPayload = Omit<
  Job,
  "id" | "dateApplied" | "userId" | "createdAt"
>;

interface JobContextType {
  jobs: Job[];
  addJob: (job: JobDataPayload) => Promise<boolean>;
  updateJobStatus: (id: string, newStatus: Status) => void;
  updateJob: (id: string, jobData: JobDataPayload) => void;
  deleteJob: (id: string) => void;
  isModalOpen: boolean;
  editingJobId: string | null;
  openModal: (jobId?: string) => void;
  closeModal: () => void;
  isVaultOpen: boolean;
  vaultJobId: string | null;
  openVault: (jobId: string) => void;
  closeVault: () => void;
  limitError: string;
  clearLimitError: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultJobId, setVaultJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [limitError, setLimitError] = useState("");

  const clearLimitError = () => setLimitError("");

  useEffect(() => {
    if (!effectiveUserId) {
      setJobs([]);
      return;
    }

    const q = query(
      collection(db, "jobs"),
      where("userId", "==", effectiveUserId),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData: Job[] = [];
      snapshot.forEach((document) => {
        jobsData.push({ id: document.id, ...document.data() } as Job);
      });
      // Sort by creation time if available, putting newest at the end
      jobsData.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.toMillis() - b.createdAt.toMillis();
      });
      setJobs(jobsData);
    });

    return unsubscribe;
  }, [effectiveUserId]);

  const addJob = async (jobData: JobDataPayload): Promise<boolean> => {
    if (!user) return false;

    if (jobs.length >= 50) {
      setLimitError(
        "You have reached the 50 application free limit! Please visit your Account settings to upgrade to Pro.",
      );
      return false;
    }

    const newJob = {
      ...jobData,
      userId: effectiveUserId,
      dateApplied: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
      createdAt: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, "jobs"), newJob);
      return true;
    } catch (error) {
      console.error("Error adding document: ", error);
      return false;
    }
  };

  const updateJobStatus = async (id: string, newStatus: Status) => {
    if (!user) return;
    try {
      const jobRef = doc(db, "jobs", id);
      await updateDoc(jobRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating document status: ", error);
    }
  };

  const updateJob = async (id: string, jobData: JobDataPayload) => {
    if (!user) return;
    try {
      const jobRef = doc(db, "jobs", id);
      await updateDoc(jobRef, jobData);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const deleteJob = async (id: string) => {
    if (!user) return;
    try {
      const jobRef = doc(db, "jobs", id);
      await deleteDoc(jobRef);
    } catch (error) {
      console.error("Error deleting document: ", error);
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

  const openVault = (jobId: string) => {
    setVaultJobId(jobId);
    setIsVaultOpen(true);
  };

  const closeVault = () => {
    setIsVaultOpen(false);
    setTimeout(() => setVaultJobId(null), 200);
  };

  return (
    <JobContext.Provider
      value={{
        jobs,
        addJob,
        updateJobStatus,
        updateJob,
        deleteJob,
        isModalOpen,
        editingJobId,
        openModal,
        closeModal,
        isVaultOpen,
        vaultJobId,
        openVault,
        closeVault,
        limitError,
        clearLimitError,
      }}
    >
      {children}
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
