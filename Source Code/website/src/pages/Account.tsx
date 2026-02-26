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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Account Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Manage your profile, security, and subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Information */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Profile Information
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 cursor-not-allowed text-sm"
                  value={user?.email || "No email attached"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span>User ID (UID)</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">For Extension Link</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md text-gray-500 dark:text-gray-400 cursor-text text-sm font-mono"
                    value={user?.uid || ""}
                  />
                  <button
                    onClick={() => {
                      if (user?.uid) navigator.clipboard.writeText(user.uid);
                      alert("UID copied to clipboard!");
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-md transition-colors text-sm font-medium"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Billing & Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Billing & Usage
              </h2>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Free Tier Usage
                </span>
                <span
                  className={`text-xs font-bold ${isOverLimit ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {jobs.length} / 50
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${isOverLimit ? "bg-red-600 dark:bg-red-500" : "bg-blue-600 dark:bg-blue-500"}`}
                  style={{
                    width: `${Math.min((jobs.length / 50) * 100, 100)}%`,
                  }}
                ></div>
              </div>

              {isOverLimit ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-3 rounded-md flex items-start gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-300">
                    You have reached the free limit. Upgrade to Pro to continue
                    tracking jobs.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  You can track up to 50 applications for free. After that, it's
                  just $5/month for unlimited active tracking!
                </p>
              )}

              <button className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-medium py-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm flex items-center justify-center gap-2">
                Upgrade to Pro for $5/mo
              </button>
            </div>
          </div>

          {/* Demo Data */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Demo Data
              </h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Populate your account with sample jobs and contacts for
                demonstration purposes.
              </p>
              <button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="w-full bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-400 font-medium py-2 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSeeding ? "Adding Data..." : "Load Demo Data"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Security */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm h-fit">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 dark:placeholder-gray-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating || !newPassword || !confirmPassword}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-4"
              >
                {isUpdating ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Legal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm h-fit">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Legal
              </h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                View our privacy policy and terms of service.
              </p>
              <Link
                to="/privacy-policy"
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm flex items-center justify-center gap-2"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
