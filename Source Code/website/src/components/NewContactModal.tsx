import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ContactStatus } from "../context/NetworkContext";
import { useNetwork } from "../context/NetworkContext";
import CustomSelect from "./CustomSelect";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={closeNetworkModal}
      ></div>

      <div className="relative bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] sm:max-h-[90vh] flex flex-col border border-slate-700">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700 bg-slate-800/50 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {editingContactId ? "Edit Contact" : "New Contact"}
          </h2>
          <button
            onClick={closeNetworkModal}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Name *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="e.g. Sarah Jenkins"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="sarah@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Company *
              </label>
              <input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="e.g. Google"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Role *
              </label>
              <input
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="Engineering Manager"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Status
              </label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as ContactStatus)}
                variant="solid"
                className="text-sm font-medium"
                options={[
                  { value: "Hot", label: "Hot" },
                  { value: "Warm", label: "Warm" },
                  { value: "Cold", label: "Cold" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Last Contacted
              </label>
              <input
                value={lastContacted}
                onChange={(e) => setLastContacted(e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="e.g. Today, 2 weeks ago"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none bg-slate-700 text-white placeholder-slate-500"
              placeholder="Met at a conference..."
            ></textarea>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 mt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={closeNetworkModal}
              className="px-4 py-2 text-sm font-bold text-slate-300 bg-slate-800 border border-slate-600 rounded-2xl hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl transition-all shadow-sm"
            >
              {editingContactId ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
