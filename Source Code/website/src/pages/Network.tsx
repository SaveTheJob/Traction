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
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Professional Network
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
            Manage your referrals, recruiters, and coffee chats.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search names or companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button
            onClick={() => openNetworkModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Add Contact</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Company & Role
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Contacted
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNetwork.length > 0 ? (
                filteredNetwork.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {contact.name}
                          </div>
                          {contact.email && (
                            <button
                              onClick={(e) =>
                                handleCopyEmail(e, contact.email!)
                              }
                              className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5 hover:underline w-fit text-left bg-transparent border-none p-0 cursor-pointer"
                              title="Copy email to clipboard"
                            >
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </button>
                          )}
                          {contact.notes && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic line-clamp-1 border-l-2 border-blue-200 dark:border-blue-800 pl-2">
                              "{contact.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {contact.company}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {contact.role}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <NetworkStatusBadge status={contact.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {contact.lastContacted}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {contact.email && (
                          <button
                            onClick={(e) => handleCopyEmail(e, contact.email!)}
                            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors inline-flex border-none bg-transparent cursor-pointer"
                            title="Copy email to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openNetworkModal(contact.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors inline-flex"
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
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors inline-flex"
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
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">
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
