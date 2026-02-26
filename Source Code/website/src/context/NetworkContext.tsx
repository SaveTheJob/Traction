import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export type ContactStatus = 'Warm' | 'Cold' | 'Hot';

export interface Contact {
    id: string;
    name: string;
    role: string;
    company: string;
    email: string;
    lastContacted: string;
    status: ContactStatus;
    notes?: string;
    userId?: string;
    createdAt?: any;
}

export type ContactDataPayload = Omit<Contact, 'id' | 'userId' | 'createdAt'>;

interface NetworkContextType {
    contacts: Contact[];
    addContact: (contact: ContactDataPayload) => void;
    updateContact: (id: string, contactData: ContactDataPayload) => void;
    deleteContact: (id: string) => void;
    isNetworkModalOpen: boolean;
    editingContactId: string | null;
    openNetworkModal: (contactId?: string) => void;
    closeNetworkModal: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
    const { user, isAdmin, impersonatedUser } = useAuth();
    const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);

    const effectiveUserId = (isAdmin && impersonatedUser) ? impersonatedUser.uid : user?.uid;

    useEffect(() => {
        if (!effectiveUserId) {
            setContacts([]);
            return;
        }

        const q = query(collection(db, 'contacts'), where('userId', '==', effectiveUserId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const contactsData: Contact[] = [];
            snapshot.forEach((document) => {
                contactsData.push({ id: document.id, ...document.data() } as Contact);
            });
            // Sort by creation time if available, putting newest at the top
            contactsData.sort((a, b) => {
                if (!a.createdAt || !b.createdAt) return 0;
                return b.createdAt.toMillis() - a.createdAt.toMillis();
            });
            setContacts(contactsData);
        });

        return unsubscribe;
    }, [effectiveUserId]);

    const addContact = async (contactData: ContactDataPayload) => {
        if (!user) return;
        const newContact = {
            ...contactData,
            userId: effectiveUserId,
            createdAt: serverTimestamp()
        };
        try {
            await addDoc(collection(db, 'contacts'), newContact);
        } catch (error) {
            console.error("Error adding contact: ", error);
        }
    };

    const updateContact = async (id: string, contactData: ContactDataPayload) => {
        if (!user) return;
        try {
            const contactRef = doc(db, 'contacts', id);
            await updateDoc(contactRef, contactData);
        } catch (error) {
            console.error("Error updating contact: ", error);
        }
    };

    const deleteContact = async (id: string) => {
        if (!user) return;
        try {
            const contactRef = doc(db, 'contacts', id);
            await deleteDoc(contactRef);
        } catch (error) {
            console.error("Error deleting contact: ", error);
        }
    };

    const openNetworkModal = (contactId?: string) => {
        setEditingContactId(contactId || null);
        setIsNetworkModalOpen(true);
    };

    const closeNetworkModal = () => {
        setIsNetworkModalOpen(false);
        setTimeout(() => setEditingContactId(null), 200);
    };

    return (
        <NetworkContext.Provider value={{ contacts, addContact, updateContact, deleteContact, isNetworkModalOpen, editingContactId, openNetworkModal, closeNetworkModal }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}
