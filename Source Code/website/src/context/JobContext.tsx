import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export type Priority = 'High' | 'Medium' | 'Low';
export type Status = 'Wishlist' | 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';

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
    userId?: string;
    createdAt?: any;
}

export type JobDataPayload = Omit<Job, 'id' | 'dateApplied' | 'userId' | 'createdAt'>;

interface JobContextType {
    jobs: Job[];
    addJob: (job: JobDataPayload) => void;
    updateJobStatus: (id: string, newStatus: Status) => void;
    updateJob: (id: string, jobData: JobDataPayload) => void;
    deleteJob: (id: string) => void;
    isModalOpen: boolean;
    editingJobId: string | null;
    openModal: (jobId?: string) => void;
    closeModal: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJobId, setEditingJobId] = useState<string | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);

    useEffect(() => {
        if (!user) {
            setJobs([]);
            return;
        }

        const q = query(collection(db, 'jobs'), where('userId', '==', user.uid));
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
    }, [user]);

    const addJob = async (jobData: JobDataPayload) => {
        if (!user) return;

        if (jobs.length >= 50) {
            alert("You have reached the 50 application free limit! Please visit your Account settings to upgrade to Pro for $5/mo.");
            return;
        }

        const newJob = {
            ...jobData,
            userId: user.uid,
            dateApplied: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()),
            createdAt: serverTimestamp()
        };
        try {
            await addDoc(collection(db, 'jobs'), newJob);
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    };

    const updateJobStatus = async (id: string, newStatus: Status) => {
        if (!user) return;
        try {
            const jobRef = doc(db, 'jobs', id);
            await updateDoc(jobRef, { status: newStatus });
        } catch (error) {
            console.error("Error updating document status: ", error);
        }
    };

    const updateJob = async (id: string, jobData: JobDataPayload) => {
        if (!user) return;
        try {
            const jobRef = doc(db, 'jobs', id);
            await updateDoc(jobRef, jobData);
        } catch (error) {
            console.error("Error updating document: ", error);
        }
    };

    const deleteJob = async (id: string) => {
        if (!user) return;
        try {
            const jobRef = doc(db, 'jobs', id);
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

    return (
        <JobContext.Provider value={{ jobs, addJob, updateJobStatus, updateJob, deleteJob, isModalOpen, editingJobId, openModal, closeModal }}>
            {children}
        </JobContext.Provider>
    );
}

export function useJobs() {
    const context = useContext(JobContext);
    if (context === undefined) {
        throw new Error('useJobs must be used within a JobProvider');
    }
    return context;
}
