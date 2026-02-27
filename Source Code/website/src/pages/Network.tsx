import {
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  Mail,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import NetworkStatusBadge from "../components/NetworkStatusBadge";
import type { ToastMessage } from "../components/Toast";
import ToastContainer from "../components/Toast";
import { useNetwork } from "../context/NetworkContext";

export default function Network() {
  const { contacts, deleteContact, openNetworkModal } = useNetwork();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastMessage["type"] = "success") => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleCopyEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    addToast("Email copied to clipboard!", "success");
  };

  const filteredNetwork = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const [sortKey, setSortKey] = useState<
    "name" | "company" | "status" | "lastContacted" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const contactStatusOrder: Record<string, number> = {
    Hot: 0,
    Warm: 1,
    Cold: 2,
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedNetwork = (() => {
    if (!sortKey) return filteredNetwork;
    return [...filteredNetwork].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "company") {
        cmp = a.company.localeCompare(b.company);
      } else if (sortKey === "status") {
        cmp =
          (contactStatusOrder[a.status] ?? 99) -
          (contactStatusOrder[b.status] ?? 99);
      } else if (sortKey === "lastContacted") {
        cmp =
          new Date(a.lastContacted).getTime() -
          new Date(b.lastContacted).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 max-w-[1700px] mx-auto space-y-6 sm:space-y-8 h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Professional Network
          </h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm font-medium">
            Manage your referrals, recruiters, and coffee chats.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-black/20 backdrop-blur-sm text-white placeholder-slate-400 font-medium shadow-inner"
            />
          </div>
          <button
            onClick={() => openNetworkModal()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Add Contact</span>
          </button>
        </div>
      </div>

      <div className="premium-glass rounded-2xl sm:rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5 bg-black/40">
                <th
                  onClick={() => toggleSort("name")}
                  className="px-4 sm:px-6 py-3 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent cursor-pointer select-none hover:text-slate-200 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Contact
                    {sortKey === "name" ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 opacity-0" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("company")}
                  className="px-4 sm:px-6 py-3 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent hidden sm:table-cell cursor-pointer select-none hover:text-slate-200 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Company & Role
                    {sortKey === "company" ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 opacity-0" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  className="px-4 sm:px-6 py-3 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent cursor-pointer select-none hover:text-slate-200 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Status
                    {sortKey === "status" ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 opacity-0" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => toggleSort("lastContacted")}
                  className="px-4 sm:px-6 py-3 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-transparent hidden lg:table-cell cursor-pointer select-none hover:text-slate-200 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Last Contact
                    {sortKey === "lastContacted" ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 opacity-0" />
                    )}
                  </span>
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right bg-transparent">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedNetwork.length > 0 ? (
                sortedNetwork.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-white/5 transition-all duration-300 group relative border-b border-white/5 last:border-0"
                  >
                    <td className="px-4 sm:px-6 py-3 sm:py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="icon-3d-container w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-800 border border-white/10 shadow-lg flex items-center justify-center text-blue-400 font-black text-sm sm:text-base group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors text-[13px] sm:text-[15px] truncate">
                            {contact.name}
                          </div>
                          {/* Show company inline on mobile since column is hidden */}
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate sm:hidden">
                            {contact.company} • {contact.role}
                          </div>
                          {contact.email && (
                            <button
                              onClick={(e) =>
                                handleCopyEmail(e, contact.email!)
                              }
                              className="text-xs text-blue-400 flex items-center gap-1.5 mt-1 hover:underline w-fit text-left bg-transparent border-none p-0 cursor-pointer font-medium"
                              title="Copy email to clipboard"
                            >
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </button>
                          )}
                          {contact.notes && (
                            <div className="text-[10px] text-slate-400 mt-1.5 italic line-clamp-1 border-l-2 border-blue-400/30 pl-2 opacity-80 group-hover:opacity-100 transition-opacity font-medium">
                              {contact.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-5 whitespace-nowrap hidden sm:table-cell">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-100 mb-0.5 truncate max-w-[160px]">
                          {contact.company}
                        </span>
                        <span className="text-xs font-medium text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-full w-fit border border-slate-700/50 truncate max-w-[140px]">
                          {contact.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-5 whitespace-nowrap">
                      <div className="scale-95 origin-left group-hover:scale-100 transition-transform">
                        <NetworkStatusBadge status={contact.status} />
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-5 whitespace-nowrap hidden lg:table-cell">
                      <p className="text-sm text-slate-300 font-mono">
                        {contact.lastContacted}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 transition-all duration-300">
                        {contact.email && (
                          <button
                            onClick={(e) => handleCopyEmail(e, contact.email!)}
                            className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-full transition-all inline-flex bg-transparent cursor-pointer border-none"
                            title="Copy email to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openNetworkModal(contact.id)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-full transition-all inline-flex hover:shadow-sm"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDeleteId(contact.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-full transition-all inline-flex hover:shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="text-center py-20 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-medium">
                        No contacts found. Add someone to your network!
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) {
            deleteContact(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
