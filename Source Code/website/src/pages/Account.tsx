/* eslint-disable @typescript-eslint/no-explicit-any -- catch clauses and third-party config objects have no useful static type here */
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import { serverTimestamp, updateDoc } from "firebase/firestore";
import {
  Calendar,
  Database,
  Download,
  Edit2,
  FileText,
  KeyRound,
  LogOut,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { deleteAccountData, exportAccountData } from "../lib/accountData";
import { refs } from "../lib/db";
import { auth } from "../lib/firebase";

export default function Account() {
  const { user, account, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(account?.firstName || "");
  const [lastName, setLastName] = useState(account?.lastName || "");
  const [dob, setDob] = useState(account?.birthDate || "");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({
    type: "",
    text: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [dataError, setDataError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteError, setDeleteError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  // Password accounts re-enter their password; Google accounts confirm in a popup.
  const usesPassword = !!user?.providerData.some((p) => p.providerId === "password");

  // Sync state with account once it loads
  useEffect(() => {
    if (account) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
      setFirstName(account.firstName || "");
      setLastName(account.lastName || "");
      setDob(account.birthDate || "");
    }
  }, [account]);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    setDataError("");
    try {
      const blob = await exportAccountData(user.uid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `offerward-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setDataError("Could not export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const current = auth.currentUser;
    if (!current) return;
    setDeleting(true);
    setDeleteError("");
    let step: "reauth" | "data" | "user" = "reauth";
    try {
      // Re-authenticate first, so nothing is deleted unless deleteUser can succeed afterwards.
      // The popup opens before any other await, while the click still counts as a user gesture.
      if (usesPassword) {
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email ?? "", deletePassword));
      } else {
        await reauthenticateWithPopup(current, new GoogleAuthProvider());
      }
      step = "data";
      await deleteAccountData(current.uid, (n) => setDeleteProgress(n));
      step = "user";
      await deleteUser(current);
      navigate("/login?deleted=1", { replace: true });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (step === "reauth") {
        if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
          setDeleteError("Incorrect password. Nothing was deleted.");
        } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          setDeleteError("The Google sign-in window was closed. Nothing was deleted.");
        } else if (code === "auth/popup-blocked") {
          setDeleteError("Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.");
        } else if (code === "auth/user-mismatch") {
          setDeleteError("That Google account isn't the one signed in here. Nothing was deleted.");
        } else if (code === "auth/too-many-requests") {
          setDeleteError("Too many attempts. Please wait a bit and try again.");
        } else {
          setDeleteError("Could not confirm it's you. Nothing was deleted. Please try again.");
        }
      } else if (code === "auth/requires-recent-login") {
        setDeleteError("For your security, sign out and sign back in, then delete your account again. Your data has already been removed.");
      } else if (step === "user") {
        setDeleteError("Your data has been removed, but the sign-in could not be deleted. Please try again.");
      } else {
        setDeleteError("Something went wrong while deleting. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

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

    if (dob && dob > new Date().toISOString().slice(0, 10)) {
      setProfileMessage({
        type: "error",
        text: "Please enter a valid Date of Birth.",
      });
      return;
    }

    setIsUpdating(true);
    try {
      await updateDoc(refs.user(user.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: dob,
        updatedAt: serverTimestamp(),
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

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 max-w-[1700px] mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Profile Details &amp; Settings
        </h1>
        <p className="text-slate-300 mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium">
          Manage your profile and security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:items-stretch">
        {/* Profile & Security */}
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
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-slate-300 cursor-not-allowed"
                  value={user?.email || "No email attached"}
                />
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="First name"
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2.5 border rounded-2xl text-sm font-medium transition-all ${isEditingProfile ? "bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-blue-500/30 outline-none" : "bg-black/20 border-white/5 text-slate-300 cursor-not-allowed"}`}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Last name"
                      disabled={!isEditingProfile}
                      className={`w-full px-4 py-2.5 border rounded-2xl text-sm font-medium transition-all ${isEditingProfile ? "bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-blue-500/30 outline-none" : "bg-black/20 border-white/5 text-slate-300 cursor-not-allowed"}`}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    disabled={!isEditingProfile}
                    className={`w-full px-4 py-2.5 border rounded-2xl text-sm font-medium transition-all ${isEditingProfile ? "bg-black/20 border-white/5 text-white focus:ring-2 focus:ring-blue-500/30 outline-none" : "bg-black/20 border-white/5 text-slate-300 cursor-not-allowed"}`}
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
                        setFirstName(account?.firstName || "");
                        setLastName(account?.lastName || "");
                        setDob(account?.birthDate || "");
                      }}
                      className="px-5 bg-white/5 border border-white/10 text-slate-300 font-bold py-2.5 rounded-2xl hover:bg-white/20 transition-all text-xs tracking-wide active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>

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
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
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
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
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
              <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
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
              <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
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

        {/* Your data */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <div className="premium-glass rounded-2xl overflow-hidden shadow-xl border border-white/5">
            <div className="p-4 sm:p-5 border-b border-white/5 bg-black/10 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs sm:text-sm font-bold text-white">Your data</h2>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Download everything Offerward stores for you, or delete your account and all of its data permanently.
              </p>
              {dataError && (
                <div className="p-3 rounded-2xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500">
                  {dataError}
                </div>
              )}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-2.5 bg-white/5 border border-white/10 text-slate-200 font-bold rounded-2xl text-xs tracking-wide hover:bg-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? "Preparing..." : "Export my data"}
              </button>
              <button
                onClick={() => {
                  setShowDelete(true);
                  setDeleteConfirm("");
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 font-bold rounded-2xl text-xs tracking-wide hover:bg-red-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete my account
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md premium-glass rounded-2xl border border-white/10 shadow-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Delete your account?</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              This permanently deletes your profile, applications, contacts and Discover data. It cannot be undone.
              Type <span className="font-black text-white">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              disabled={deleting}
              placeholder="DELETE"
              className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-red-500/30 outline-none transition-all"
            />
            {usesPassword ? (
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={deleting}
                placeholder="Your password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-red-500/30 outline-none transition-all"
              />
            ) : (
              <p className="text-xs text-slate-300">You'll confirm with Google in a pop-up before anything is deleted.</p>
            )}
            {deleting && (
              <p className="text-xs font-bold text-slate-300">Deleting... {deleteProgress} items removed</p>
            )}
            {deleteError && (
              <div className="p-3 rounded-2xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== "DELETE" || (usesPassword && !deletePassword)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl text-xs tracking-wide transition-all active:scale-[0.98] disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete everything"}
              </button>
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="px-5 bg-white/5 border border-white/10 text-slate-300 font-bold py-2.5 rounded-2xl hover:bg-white/20 transition-all text-xs tracking-wide disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
