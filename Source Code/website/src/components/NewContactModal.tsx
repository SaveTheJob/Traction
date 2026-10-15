import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNetwork } from "../context/NetworkContext";
import { contactsErrorMessage } from "../lib/errors";
import type { Strength } from "../lib/db";
import { STRENGTH_LABEL } from "../lib/db";
import type { ContactForm } from "./contactForm";
import {
  EMPTY_CONTACT_FORM, formFromContact, fromDateInputValue, isValidLinkedinUrl, toDateInputValue,
} from "./contactForm";
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

  // The form is seeded once per open. Later snapshots (another tab) must not
  // overwrite what the user is typing, so the effect reads the contact list
  // through a ref instead of depending on it.
  const contactsRef = useRef(contacts);
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  const [form, setForm] = useState<ContactForm>(EMPTY_CONTACT_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!isNetworkModalOpen) return;
    const toEdit = editingContactId ? contactsRef.current.find((c) => c.id === editingContactId) : undefined;
    setForm(toEdit ? formFromContact(toEdit) : EMPTY_CONTACT_FORM);
    setError("");
    setSaving(false);
  }, [isNetworkModalOpen, editingContactId]);

  if (!isNetworkModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // The rules reject empty names, so catch it here with a message.
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isValidLinkedinUrl(form.linkedinUrl)) {
      setError("Use the full https:// link");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (editingContactId) await updateContact(editingContactId, form);
      else await addContact(form);
      closeNetworkModal();
    } catch (err) {
      setError(contactsErrorMessage(err));
    } finally {
      setSaving(false);
    }
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
            className="p-1.5 text-slate-300 hover:text-slate-300 hover:bg-slate-700 rounded-xl transition-colors"
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
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
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
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="sarah@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Company
              </label>
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="e.g. Google"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Role
              </label>
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
                placeholder="Engineering Manager"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Strength
              </label>
              <CustomSelect
                value={form.strength}
                onChange={(val) => set("strength", val as Strength)}
                variant="solid"
                className="text-sm font-medium"
                options={(Object.keys(STRENGTH_LABEL) as Strength[]).map((value) => ({ value, label: STRENGTH_LABEL[value] }))}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-1.5">
                Last Contacted
              </label>
              <input
                type="date"
                value={toDateInputValue(form.lastContactedAt)}
                onChange={(e) => set("lastContactedAt", fromDateInputValue(e.target.value))}
                className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500 color-scheme-dark"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">
              LinkedIn URL
            </label>
            <input
              type="text"
              value={form.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
              className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-700 text-white placeholder-slate-500"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none bg-slate-700 text-white placeholder-slate-500"
              placeholder="Met at a conference..."
            ></textarea>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-400">
              {error}
            </p>
          )}

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
              disabled={saving}
              className="disabled:opacity-60 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl transition-all shadow-sm"
            >
              {editingContactId ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
