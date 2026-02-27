import {
  AlertTriangle,
  Calendar,
  Check,
  CreditCard,
  Crown,
  Edit2,
  FileText,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobContext";

export default function Account() {
  const { user, userProfile, updatePassword, signOut } = useAuth();
  const { jobs } = useJobs();

  const [firstName, setFirstName] = useState(userProfile?.firstName || "");
  const [lastName, setLastName] = useState(userProfile?.lastName || "");
  const [dob, setDob] = useState(userProfile?.dob || "");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({
    type: "",
    text: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Sync state with userProfile once it loads
  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || "");
      setLastName(userProfile.lastName || "");
      setDob(userProfile.dob || "");
    }
  }, [userProfile]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Password should be at least 6 characters.",
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updatePassword(newPassword);
      setPasswordMessage({
        type: "success",
        text: "Password updated successfully!",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error?.code === "auth/requires-recent-login") {
        setPasswordMessage({
          type: "error",
          text: "Please sign out and sign back in to update your password for security purposes.",
        });
      } else {
        setPasswordMessage({
          type: "error",
          text: error.message || "Failed to update password.",
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        firstName,
        lastName,
        dob,
      });
      setProfileMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
      setIsEditingProfile(false);
    } catch (error: any) {
      setProfileMessage({
        type: "error",
        text: error.message || "Failed to update profile.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isOverLimit = jobs.length >= 50;

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 max-w-[1700px] mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Profile Details &amp; Settings
        </h1>
        <p className="text-slate-400 mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium">
          Manage your profile, security, and plan preferences.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:items-stretch">
        {/* Left — Profile & Security */}
        <div className="lg:col-span-3 flex flex-col h-full">
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border border-white/5 flex-1">
            <div className="p-4 sm:p-5 border-b border-white/5 bg-black/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs sm:text-sm font-bold text-white">
                  Profile Information
                </h2>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => {
                    setIsEditingProfile(true);
                    setProfileMessage({ type: "", text: "" });
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {profileMessage.text && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold ${profileMessage.type === "error" ? "bg-red-500/10 border border-red-500/20 text-red-500" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"}`}
                >
                  {profileMessage.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-slate-400 cursor-not-allowed"
                  value={user?.email || "No email attached"}
                />
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="First name"
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2.5 border rounded-2xl text-sm font-medium transition-all ${isEditingProfile ? "bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-blue-500/30 outline-none" : "bg-black/20 border-white/5 text-slate-400 cursor-not-allowed"}`}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Last name"
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2.5 border rounded-2xl text-sm font-medium transition-all ${isEditingProfile ? "bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-blue-500/30 outline-none" : "bg-black/20 border-white/5 text-slate-400 cursor-not-allowed"}`}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    disabled={!isEditingProfile}
                    className={`w-full px-4 py-2.5 border rounded-2xl text-sm font-medium transition-all ${isEditingProfile ? "bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-blue-500/30 outline-none" : "bg-black/20 border-white/5 text-slate-400 cursor-not-allowed"}`}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                {isEditingProfile && (
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-2xl hover:shadow-lg transition-all text-xs tracking-wide active:scale-[0.98] shadow-lg shadow-blue-500/20"
                    >
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setFirstName(userProfile?.firstName || "");
                        setLastName(userProfile?.lastName || "");
                        setDob(userProfile?.dob || "");
                      }}
                      className="px-5 bg-white/5 border border-white/10 text-slate-400 font-bold py-2.5 rounded-2xl hover:bg-white/20 transition-all text-xs tracking-wide active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Password */}
            <div className="border-t border-white/5">
              <div className="p-4 sm:p-5 bg-black/10 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs sm:text-sm font-bold text-white">
                  Change Password
                </h2>
              </div>
              <form
                onSubmit={handleUpdatePassword}
                className="p-4 sm:p-5 pt-0 space-y-4"
              >
                {passwordMessage.text && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-bold ${passwordMessage.type === "error" ? "bg-red-500/10 border border-red-500/20 text-red-500" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"}`}
                  >
                    {passwordMessage.text}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                    placeholder="Min. 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                    placeholder="Re-enter password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdating || !newPassword || !confirmPassword}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-2xl hover:shadow-lg transition-all text-xs tracking-wide active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-40"
                >
                  {isUpdating ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="premium-glass rounded-2xl p-4 shadow-lg border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white">Legal</h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                Privacy policy and terms of service.
              </p>
              <Link
                to="/privacy-policy"
                className="w-full py-2 bg-white/5 border border-white/10 text-slate-300 font-bold rounded-2xl text-[11px] tracking-wide text-center block hover:bg-white/20 transition-all active:scale-[0.98]"
              >
                Privacy Policy
              </Link>
            </div>

            <div className="premium-glass rounded-2xl p-4 shadow-lg border border-white/5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <LogOut className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-bold text-white">Sign Out</h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                End your current session securely.
              </p>
              <button
                onClick={signOut}
                className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-2xl text-[11px] tracking-wide hover:bg-red-500/20 transition-all active:scale-[0.98] mt-auto"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Right — Plans & Pricing */}
        <div className="lg:col-span-2 flex">
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border border-white/5 h-full w-full">
            <div className="p-5 border-b border-white/5 bg-black/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-bold text-white">
                  Plans & Pricing
                </h2>
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                  userProfile?.plan === "Pro"
                    ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                    : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                }`}
              >
                {userProfile?.plan === "Pro" ? "👑 Pro Plan" : "Free Plan"}
              </span>
            </div>
            <div className="p-5 space-y-5">
              {/* Usage */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    Usage
                  </span>
                  <span
                    className={`text-[11px] font-black ${isOverLimit ? "text-red-500" : "text-slate-400"}`}
                  >
                    {jobs.length}/50
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${isOverLimit ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
                    style={{
                      width: `${Math.min((jobs.length / 50) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {isOverLimit && (
                <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-500">
                    Limit reached. Upgrade to continue.
                  </p>
                </div>
              )}

              {/* Free Plan */}
              <div
                className={`rounded-2xl p-4 border transition-all ${
                  userProfile?.plan !== "Pro"
                    ? "border-blue-500/30 bg-blue-500/5"
                    : "border-white/5 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wide">
                      Free
                    </h3>
                    <p className="text-xl font-black text-white">
                      $0
                      <span className="text-[10px] font-bold text-slate-400">
                        /mo
                      </span>
                    </p>
                  </div>
                  {userProfile?.plan !== "Pro" && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">
                      Current
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {[
                    "50 applications",
                    "Basic analytics",
                    "Pipeline tools",
                    "25 contacts",
                    "CSV export",
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check
                        className="w-3 h-3 text-emerald-400 shrink-0"
                        strokeWidth={3}
                      />
                      <span className="text-[11px] font-medium text-slate-400">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Plan */}
              <div
                className={`rounded-2xl p-4 border transition-all relative overflow-hidden ${
                  userProfile?.plan === "Pro"
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-purple-500/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"
                }`}
              >
                {userProfile?.plan !== "Pro" && (
                  <div className="absolute top-3 right-3">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2 h-2" /> Popular
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-purple-300" /> Pro
                    </h3>
                    <p className="text-xl font-black text-white">
                      $5
                      <span className="text-[10px] font-bold text-slate-400">
                        /mo
                      </span>
                    </p>
                  </div>
                  {userProfile?.plan === "Pro" && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full border border-purple-500/20">
                      Current
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 mb-4">
                  {[
                    "Unlimited apps",
                    "Advanced analytics",
                    "Priority tools",
                    "Unlimited contacts",
                    "CSV & PDF export",
                    "Priority support",
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check
                        className="w-3 h-3 text-purple-300 shrink-0"
                        strokeWidth={3}
                      />
                      <span className="text-[11px] font-medium text-slate-400">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
                {userProfile?.plan === "Pro" ? (
                  <div className="w-full py-2 text-center rounded-lg text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20">
                    Active Plan
                  </div>
                ) : (
                  <button className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-[11px] tracking-wide transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap">
                    <Zap className="w-3.5 h-3.5 shrink-0" /> Upgrade to Pro
                  </button>
                )}
              </div>

              <p className="text-[10px] text-center font-medium text-slate-300">
                ✨ Pro plan is{" "}
                <span className="text-purple-300 font-bold">
                  free for all priority users
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
