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
  | "Saved"
  | "Applied"
  | "Interviewing"
  | "Offer"
  | "Rejected";

export const FREE_PLAN_JOB_LIMIT = 50;

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
  /** Set when the job was saved from the Discover page */
  discoveryId?: string;
  fitScore?: number;
  /** ISO date of the last follow-up sent for an Applied job */
  followedUpAt?: string;
}

export type JobDataPayload = Omit<
  Job,
  "id" | "dateApplied" | "userId" | "createdAt"
>;

interface JobContextType {
  jobs: Job[];
  addJob: (job: JobDataPayload) => Promise<boolean>;
  /** Like addJob, but resolves to the new document id (or null on failure). */
  createJob: (job: JobDataPayload) => Promise<string | null>;
  updateJobStatus: (id: string, newStatus: Status) => void;
  updateJob: (id: string, jobData: JobDataPayload) => void;
  markFollowedUp: (id: string) => Promise<void>;
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
  const { user, userProfile, isAdmin } = useAuth();
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
        const data = document.data();
        // Jobs saved before the rename still carry the old "Wishlist" status
        if (data.status === "Wishlist") data.status = "Saved";
        jobsData.push({ id: document.id, ...data } as Job);
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

  const createJob = async (jobData: JobDataPayload): Promise<string | null> => {
    if (!user) return null;

    // The free-plan cap applies only to Free accounts; Pro and admins are unlimited.
    const isLimited = !isAdmin && userProfile?.plan !== "Pro";
    if (isLimited && jobs.length >= FREE_PLAN_JOB_LIMIT) {
      setLimitError(
        `You have reached the ${FREE_PLAN_JOB_LIMIT} application free limit! Please visit your Account settings to upgrade to Pro.`,
      );
      return null;
    }

    // Firestore rejects undefined values, so drop them before writing.
    const cleaned = Object.fromEntries(
      Object.entries(jobData).filter(([, v]) => v !== undefined),
    );

    const newJob = {
      ...cleaned,
      userId: effectiveUserId,
      dateApplied: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
      createdAt: serverTimestamp(),
    };
    try {
      const ref = await addDoc(collection(db, "jobs"), newJob);
      return ref.id;
    } catch (error) {
      console.error("Error adding document: ", error);
      return null;
    }
  };

  const addJob = async (jobData: JobDataPayload): Promise<boolean> => {
    return (await createJob(jobData)) !== null;
  };

  const updateJobStatus = async (id: string, newStatus: Status) => {
    if (!user) return;
    try {
      const jobRef = doc(db, "jobs", id);
      // Moving a saved job into Applied stamps the real apply date, which
      // starts its follow-up clock. Other moves leave the date alone.
      const current = jobs.find((j) => j.id === id);
      const extra =
        newStatus === "Applied" && current?.status === "Saved"
          ? {
              dateApplied: new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date()),
              followedUpAt: null,
            }
          : {};
      await updateDoc(jobRef, { status: newStatus, ...extra });
    } catch (error) {
      console.error("Error updating document status: ", error);
    }
  };

  const updateJob = async (id: string, jobData: JobDataPayload) => {
    if (!user) return;
    try {
      const jobRef = doc(db, "jobs", id);
      const cleaned = Object.fromEntries(
        Object.entries(jobData).filter(([, v]) => v !== undefined),
      );
      await updateDoc(jobRef, cleaned);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const markFollowedUp = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "jobs", id), {
        followedUpAt: new Date().toISOString().slice(0, 10),
      });
    } catch (error) {
      console.error("Error marking follow-up: ", error);
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
        createJob,
        updateJobStatus,
        updateJob,
        markFollowedUp,
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
