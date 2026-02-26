import { Copy, Edit2, Mail, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import NetworkStatusBadge from "../components/NetworkStatusBadge";
import { useNetwork } from "../context/NetworkContext";

export default function Network() {
  const { contacts, deleteContact, openNetworkModal } = useNetwork();
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopyEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    alert("Email copied to clipboard!");
  };

  const filteredNetwork = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-8 h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
            Professional Network
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base font-medium">
            Manage your referrals, recruiters, and coffee chats.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72 group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-lg transition-opacity opacity-0 group-hover:opacity-100" />
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
            <input
              type="text"
              placeholder="Search names or companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm border border-white/20 dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner relative z-0 transition-all"
            />
          </div>
          <button
            onClick={() => openNetworkModal()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 shrink-0 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Add Contact</span>
          </button>
        </div>
      </div>

      <div className="premium-glass rounded-3xl border border-white/30 dark:border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 dark:border-white/5 bg-white/40 dark:bg-black/40">
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-transparent">
                  Contact
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-transparent">
                  Company & Role
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-transparent">
                  Status
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-transparent">
                  Last Contact
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right bg-transparent">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-white/5">
              {filteredNetwork.length > 0 ? (
                filteredNetwork.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-300 group relative border-b border-white/5 dark:border-white/5 last:border-0"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="icon-3d-container w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-white/50 dark:border-white/10 shadow-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-base group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-[15px]">
                            {contact.name}
                          </div>
                          {contact.email && (
                            <button
                              onClick={(e) =>
                                handleCopyEmail(e, contact.email!)
                              }
                              className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1.5 mt-1 hover:underline w-fit text-left bg-transparent border-none p-0 cursor-pointer font-medium"
                              title="Copy email to clipboard"
                            >
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </button>
                          )}
                          {contact.notes && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 italic line-clamp-1 border-l-2 border-blue-400/30 pl-2 opacity-80 group-hover:opacity-100 transition-opacity font-medium">
                              {contact.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-0.5">
                          {contact.company}
                        </span>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full w-fit border border-gray-200/50 dark:border-gray-700/50">
                          {contact.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="scale-95 origin-left group-hover:scale-100 transition-transform">
                        <NetworkStatusBadge status={contact.status} />
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                        {contact.lastContacted}
                      </p>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        {contact.email && (
                          <button
                            onClick={(e) => handleCopyEmail(e, contact.email!)}
                            className="p-2 text-slate-400 hover:text-green-500 dark:hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-all inline-flex bg-transparent cursor-pointer border-none"
                            title="Copy email to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openNetworkModal(contact.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all inline-flex hover:shadow-sm"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to delete this contact?",
                              )
                            ) {
                              deleteContact(contact.id);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all inline-flex hover:shadow-sm"
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
                      <div className="w-16 h-16 mb-4 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                        <Search className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">
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
    </div>
  );
}
