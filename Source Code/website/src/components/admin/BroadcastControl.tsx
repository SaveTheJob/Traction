/* eslint-disable @typescript-eslint/no-explicit-any -- catch clauses and third-party config objects have no useful static type here */
import { addDoc, serverTimestamp } from "firebase/firestore";
import { AlertTriangle, Radio, Send } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { recordAdminLog } from "../../lib/adminLogger";
import { refs, type NoticeType } from "../../lib/db";

const BroadcastControl: React.FC = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [targetUid, setTargetUid] = useState("");
  const [type, setType] = useState<NoticeType>("info");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const target = targetUid.trim();
      if (target) {
        await addDoc(refs.notifications(target), {
          message: message.trim(),
          type,
          read: false,
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(refs.broadcasts(), {
          message: message.trim(),
          type,
          createdBy: user?.uid,
          createdAt: serverTimestamp(),
        });
      }

      recordAdminLog(
        targetUid.trim() ? "DIRECT_BROADCAST" : "GLOBAL_BROADCAST",
        targetUid.trim() || "all",
      );

      setStatus("Transmission Successful");
      setMessage("");
      setTargetUid("");
      setTimeout(() => setStatus(""), 3000);
    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 premium-glass rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-blue-400" />
                </div>
                Broadcast Message
              </h3>
              <p className="text-xs text-slate-300 mt-1 ml-[42px] font-medium">
                Send notifications to all users or a specific account
              </p>
            </div>
            {status && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-in fade-in zoom-in">
                ✓ {status}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Message
            </label>
            <textarea
              placeholder="Type your broadcast message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all h-32 resize-none placeholder:text-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Target
              </label>
              <input
                type="text"
                placeholder="All users (leave empty for global)"
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value)}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-2xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Priority
              </label>
              <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                {(
                  [
                    {
                      key: "info",
                      label: "Info",
                      color: "text-blue-400",
                      activeBg: "bg-blue-500/10 border-blue-500/20",
                    },
                    {
                      key: "warning",
                      label: "Warning",
                      color: "text-amber-400",
                      activeBg: "bg-amber-500/10 border-amber-500/20",
                    },
                    {
                      key: "success",
                      label: "Success",
                      color: "text-emerald-400",
                      activeBg: "bg-emerald-500/10 border-emerald-500/20",
                    },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setType(p.key)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      type === p.key
                        ? `${p.activeBg} ${p.color} shadow-sm border`
                        : "text-slate-300 hover:text-slate-300 border border-transparent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleBroadcast}
            disabled={loading || !message.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2.5 group disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
            {loading ? "Sending..." : "Send Broadcast"}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="premium-glass p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Guidelines
          </h4>
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Global broadcasts are delivered to{" "}
                <strong className="text-slate-200">all active users</strong>{" "}
                immediately.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                To target a specific user, enter their{" "}
                <strong className="text-slate-200">UID</strong>{" "}
                in the Target field.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Use <strong className="text-slate-200">Warning</strong>{" "}
                priority sparingly — it marks the notice as needing attention.
              </p>
            </div>
          </div>
        </div>

        <div className="premium-glass p-6 rounded-3xl border border-white/5 shadow-xl space-y-3">
          <h4 className="text-sm font-bold text-white">Priority Levels</h4>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-300">
                <strong>Info</strong> — General updates and announcements
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300">
                <strong>Warning</strong> — Important notices requiring attention
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">
                <strong>Success</strong> — Good news and completed work
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastControl;
