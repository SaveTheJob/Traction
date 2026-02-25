import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ContactStatus } from "../context/NetworkContext";
import { useNetwork } from "../context/NetworkContext";

export default function NewContactModal() {
  const {
    isNetworkModalOpen,
    closeNetworkModal,
    addContact,
    updateContact,
    editingContactId,
    contacts,
  } = useNetwork();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [lastContacted, setLastContacted] = useState("Today");
  const [status, setStatus] = useState<ContactStatus>("Warm");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isNetworkModalOpen && editingContactId) {
      const contactToEdit = contacts.find((c) => c.id === editingContactId);
      if (contactToEdit) {
        setName(contactToEdit.name);
        setCompany(contactToEdit.company);
        setRole(contactToEdit.role);
        setEmail(contactToEdit.email);
        setLastContacted(contactToEdit.lastContacted);
        setStatus(contactToEdit.status);
        setNotes(contactToEdit.notes || "");
      }
    } else if (isNetworkModalOpen) {
      // Reset form for new contact
      setName("");
      setCompany("");
      setRole("");
      setEmail("");
      setLastContacted("Today");
      setStatus("Warm");
      setNotes("");
    }
  }, [isNetworkModalOpen, editingContactId, contacts]);

  if (!isNetworkModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      company,
      role,
      email,
      lastContacted,
      status,
      notes,
    };

    if (editingContactId) {
      updateContact(editingContactId, payload);
    } else {
      addContact(payload);
    }

    closeNetworkModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={closeNetworkModal}
      ></div>

      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingContactId ? "Edit Contact" : "New Contact"}
          </h2>
          <button
            onClick={closeNetworkModal}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-1.5">
                Name *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="e.g. Sarah Jenkins"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="sarah@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-1.5">
                Company *
              </label>
              <input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="e.g. Google"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-1.5">
                Role *
              </label>
              <input
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Engineering Manager"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContactStatus)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-1.5">
                Last Contacted
              </label>
              <input
                value={lastContacted}
                onChange={(e) => setLastContacted(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="e.g. Today, 2 weeks ago"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-300 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Met at a conference..."
            ></textarea>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 mt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={closeNetworkModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              {editingContactId ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
