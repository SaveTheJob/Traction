/* eslint-disable react-refresh/only-export-components -- context file intentionally exports its provider and consumer hook together */
import { addDoc, deleteDoc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ToastMessage } from "../components/Toast";
import ToastContainer from "../components/Toast";
import { useEffectiveUserId } from "../hooks/useEffectiveUserId";
import type { Contact, ContactInput } from "../lib/db";
import { contactFromDoc, contactUpdate, newContactDoc, refs } from "../lib/db";

interface NetworkContextType {
  contacts: Contact[];
  /** Throws on failure so the caller can show the error next to the form. */
  addContact: (input: ContactInput) => Promise<void>;
  /** Throws on failure so the caller can show the error next to the form. */
  updateContact: (id: string, input: ContactInput) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  isNetworkModalOpen: boolean;
  editingContactId: string | null;
  openNetworkModal: (contactId?: string) => void;
  closeNetworkModal: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const uid = useEffectiveUserId();
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Callbacks read the latest list without re-subscribing on every snapshot.
  const contactsRef = useRef<Contact[]>([]);
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  const toastError = useCallback((message: string) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type: "error" }]);
  }, []);

  useEffect(() => {
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
      setContacts([]);
      return;
    }
    return onSnapshot(
      query(refs.contacts(uid), orderBy("createdAt", "desc")),
      (snap) => setContacts(snap.docs.map((d) => contactFromDoc(d.id, d.data()))),
      (e) => console.error("Error listening to contacts: ", e),
    );
  }, [uid]);

  const addContact = async (input: ContactInput) => {
    if (!uid) return;
    try {
      await addDoc(refs.contacts(uid), newContactDoc(input));
    } catch (e) {
      console.error("Error adding contact: ", e);
      throw e;
    }
  };

  const updateContact = async (id: string, input: ContactInput) => {
    if (!uid) return;
    const current = contactsRef.current.find((c) => c.id === id);
    if (!current) throw new Error("Contact not found");
    try {
      await updateDoc(refs.contact(uid, id), contactUpdate(current, input));
    } catch (e) {
      console.error("Error updating contact: ", e);
      throw e;
    }
  };

  const deleteContact = async (id: string) => {
    if (!uid) return;
    try {
      await deleteDoc(refs.contact(uid, id));
    } catch (e) {
      console.error("Error deleting contact: ", e);
      toastError("Couldn't delete. Try again.");
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
    <NetworkContext.Provider
      value={{
        contacts,
        addContact,
        updateContact,
        deleteContact,
        isNetworkModalOpen,
        editingContactId,
        openNetworkModal,
        closeNetworkModal,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
