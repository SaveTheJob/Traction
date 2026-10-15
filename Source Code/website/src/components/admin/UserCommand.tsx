/* eslint-disable @typescript-eslint/no-explicit-any -- catch clauses and third-party config objects have no useful static type here */
import {
  collection,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Edit2, Fingerprint, LogIn, Save, Search, User, X } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { recordAdminLog } from "../../lib/adminLogger";
import { type Account, type AccountStatus, accountFromDoc, refs } from "../../lib/db";
import { db } from "../../lib/firebase";

const UserCommand: React.FC = () => {
  const { impersonateUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDOB, setSearchDOB] = useState("");
  const [searchLastName, setSearchLastName] = useState("");
  const [searchMode, setSearchMode] = useState<"email" | "name">("email");
  const [targetUser, setTargetUser] = useState<Account | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<AccountStatus>("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setTargetUser(null);
    setIsEditing(false);

    try {
      if (searchMode === "email") {
        const queryStr = searchQuery.trim();
        const q = query(
          collection(db, "users"),
          where("email", "==", queryStr),
          limit(1),
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const d = querySnapshot.docs[0];
          setTargetUser(accountFromDoc(d.id, d.data()));
        } else {
          // Not an email on file: try it as a UID.
          const userDoc = queryStr.includes("/") ? null : await getDoc(refs.user(queryStr));
          if (userDoc?.exists()) {
            setTargetUser(accountFromDoc(userDoc.id, userDoc.data()));
          } else {
            setError("No user found with this email address or UID.");
          }
        }
      } else {
        const q = query(
          collection(db, "users"),
          where("firstName", "==", searchQuery.trim()),
          where("lastName", "==", searchLastName.trim()),
          where("birthDate", "==", searchDOB),
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const d = querySnapshot.docs[0];
          setTargetUser(accountFromDoc(d.id, d.data()));
        } else {
          setError("No user found matching these details.");
        }
      }
    } catch (err: any) {
      setError("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!targetUser) return;
    setLoading(true);
    try {
      // Rules allow admins to change exactly status + updatedAt.
      await updateDoc(refs.user(targetUser.uid), {
        status: editStatus,
        updatedAt: serverTimestamp(),
      });
      if (editStatus !== targetUser.status) {
        recordAdminLog("STATUS_CHANGE", `${targetUser.uid}:${editStatus}`);
      }
      setTargetUser({ ...targetUser, status: editStatus });
      setIsEditing(false);
      setMessage("Status updated.");
    } catch (err: any) {
      recordAdminLog("STATUS_CHANGE", `${targetUser.uid}:${editStatus}`, "error");
      setError("Update failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="premium-glass rounded-3xl overflow-hidden shadow-2xl border border-white/5">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-blue-500" />
              Search User
            </h2>
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setSearchMode("email")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === "email" ? "bg-slate-800 shadow-sm text-blue-600" : "text-slate-300"}`}
              >
                Email
              </button>
              <button
                onClick={() => setSearchMode("name")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === "name" ? "bg-slate-800 shadow-sm text-blue-600" : "text-slate-300"}`}
              >
                Name
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {searchMode === "email" ? (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="text"
                  placeholder="user@example.com or UID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-2xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-300"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="John"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Doe"
                      value={searchLastName}
                      onChange={(e) => setSearchLastName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={searchDOB}
                    onChange={(e) => setSearchDOB(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-40"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />{" "}
                  Search Users
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400">
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {targetUser ? (
          <div className="premium-glass rounded-3xl shadow-2xl border border-white/5 overflow-hidden bg-black/20 min-h-[500px]">
            <div className="p-8 border-b border-white/5 bg-black/30 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                    {targetUser.firstName} {targetUser.lastName}
                  </h3>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    {targetUser.email}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-3 bg-slate-500 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        impersonateUser(targetUser);
                        navigate("/");
                      }}
                      className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 px-6 font-black text-xs uppercase tracking-widest"
                    >
                      <LogIn className="w-4 h-4" /> Impersonate
                    </button>
                    <button
                      onClick={() => {
                        setEditStatus(targetUser.status);
                        setIsEditing(true);
                      }}
                      className="p-3 bg-blue-600 text-white rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 px-6 font-black text-xs uppercase tracking-widest"
                    >
                      <Edit2 className="w-4 h-4" /> EDIT
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="p-10 grid grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Access Status
                  </label>
                  <div className="premium-glass p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase tracking-widest ${targetUser.status === "suspended" ? "text-rose-500" : "text-emerald-500"}`}
                    >
                      {targetUser.status}
                    </span>
                    {isEditing && (
                      <select
                        value={editStatus}
                        onChange={(e) =>
                          setEditStatus(e.target.value as AccountStatus)
                        }
                        className="bg-black/40 border border-white/20 rounded-xl px-2 py-1 text-[10px] font-black uppercase outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Subject Metadata
                  </label>
                  <div className="premium-glass p-6 rounded-2xl border border-white/5 space-y-4">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      UID:{" "}
                      <span className="text-xs font-mono font-bold text-white ml-2 opacity-80">
                        {targetUser.uid}
                      </span>
                    </p>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      SYNCED:{" "}
                      <span className="text-xs font-bold text-white ml-2 uppercase opacity-80">
                        {targetUser.createdAt
                          ? targetUser.createdAt.toLocaleDateString()
                          : "LEGACY"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="premium-glass rounded-3xl shadow-xl border border-white/5 flex flex-col items-center justify-center min-h-[500px] text-center p-10 bg-black/10">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-slate-700" />
            </div>
            <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">
              Monitor Standby
            </h3>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-2 max-w-xs leading-relaxed">
              Probe for a subject profile to initiate administrative sync.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCommand;
