import {
  AlertTriangle,
  CreditCard,
  Database,
  FileText,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobContext";
import { seedDemoData } from "../lib/seedData";

export default function Account() {
  const { user, updatePassword } = useAuth();
  const { jobs } = useJobs();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSeedData = async () => {
    if (!user) return;
    if (!window.confirm("This will add demo data to your account. Continue?"))
      return;

    setIsSeeding(true);
    try {
      await seedDemoData(user.uid);
      setMessage({ type: "success", text: "Demo data added successfully!" });
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Failed to add demo data." });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password should be at least 6 characters.",
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updatePassword(newPassword);
      setMessage({ type: "success", text: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      // Provide a user friendly error for recent-login requirement
      if (error?.code === "auth/requires-recent-login") {
        setMessage({
          type: "error",
          text: "Please sign out and sign back in to update your password for security purposes.",
        });
      } else {
        setMessage({
          type: "error",
          text: error.message || "Failed to update password.",
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const isOverLimit = jobs.length >= 50;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Account Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base font-medium">
          Manage your profile, security, and subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Information */}
        <div className="space-y-6">
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border-t border-white/20 dark:border-white/5 relative">
            <div className="p-5 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-black/20 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-slate-900 dark:text-white tracking-wide">
                Profile Information
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 px-1">
                  Email Address
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-4 py-2.5 bg-white/30 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 cursor-not-allowed text-sm font-medium"
                  value={user?.email || "No email attached"}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between px-1">
                  <span>User ID (UID)</span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-blue-500/20">For Extension Link</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 px-4 py-2.5 bg-white/30 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 cursor-text text-xs font-mono shadow-inner"
                    value={user?.uid || ""}
                  />
                  <button
                    onClick={() => {
                      if (user?.uid) navigator.clipboard.writeText(user.uid);
                      alert("UID copied to clipboard!");
                    }}
                    className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl transition-all text-xs font-black shadow-lg shadow-blue-500/10 active:scale-95 cursor-pointer"
                  >
                    COPY
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Billing & Usage */}
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border-t border-white/20 dark:border-white/5 relative">
            <div className="p-5 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-black/20 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-slate-900 dark:text-white tracking-wide">
                Billing & Usage
              </h2>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-end mb-3 px-1">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Applications
                </span>
                <span
                  className={`text-xs font-black ${isOverLimit ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {jobs.length} / 50
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-3 mb-5 overflow-hidden shadow-inner">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${isOverLimit ? "bg-red-500" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
                  style={{
                    width: `${Math.min((jobs.length / 50) * 100, 100)}%`,
                  }}
                ></div>
              </div>

              {isOverLimit ? (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">
                    You have reached the free limit. Upgrade to Pro to continue
                    tracking jobs.
                  </p>
                </div>
              ) : (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 leading-relaxed px-1">
                  You can track up to 50 applications for free. After that, it's
                  just $5/month for unlimited active tracking!
                </p>
              )}

              <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-3 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-lg">
                Upgrade to Pro for $5/mo
              </button>
            </div>
          </div>

          {/* Demo Data */}
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border-t border-white/20 dark:border-white/5 relative">
            <div className="p-5 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-black/20 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="font-bold text-slate-900 dark:text-white tracking-wide">
                Demo Data
              </h2>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 px-1 leading-relaxed">
                Populate your account with sample jobs and contacts for
                demonstration purposes.
              </p>
              <button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="w-full bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-300 font-black py-3 rounded-xl hover:bg-white/20 transition-all text-xs uppercase tracking-widest disabled:opacity-50 active:scale-95 shadow-sm"
              >
                {isSeeding ? "Adding Data..." : "Load Demo Data"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Security */}
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border-t border-white/20 dark:border-white/5 relative h-fit">
            <div className="p-5 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-black/20 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-slate-900 dark:text-white tracking-wide">
                Change Password
              </h2>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-5 space-y-4">
              {message.text && (
                <div
                  className={`p-3 rounded-md text-sm ${message.type === "error" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800" : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800"}`}
                >
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-white/30 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium transition-all"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="w-full px-4 py-2.5 bg-white/30 dark:bg-black/30 border border-white/20 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium transition-all"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating || !newPassword || !confirmPassword}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-3 rounded-xl hover:shadow-lg transition-all text-xs uppercase tracking-widest mt-4 active:scale-95 shadow-lg"
              >
                {isUpdating ? "UPDATING..." : "UPDATE PASSWORD"}
              </button>
            </form>
          </div>

          {/* Legal */}
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border-t border-white/20 dark:border-white/5 relative h-fit">
            <div className="p-5 border-b border-white/10 dark:border-white/5 bg-white/20 dark:bg-black/20 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-slate-900 dark:text-white tracking-wide">
                Legal
              </h2>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-5 px-1 leading-relaxed">
                View our privacy policy and terms of service.
              </p>
              <Link
                to="/privacy-policy"
                className="w-full bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 text-slate-700 dark:text-slate-300 font-black py-3 rounded-xl hover:bg-white/20 transition-all text-xs uppercase tracking-widest text-center block shadow-sm"
              >
                PRIVACY POLICY
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
