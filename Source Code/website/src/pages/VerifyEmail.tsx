/* eslint-disable @typescript-eslint/no-explicit-any -- catch clauses and third-party config objects have no useful static type here */
import { sendEmailVerification } from "firebase/auth";
import { Loader2, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { APP_URL } from "../lib/app";
import { auth } from "../lib/firebase";

export default function VerifyEmail() {
  const { user, needsVerification, refreshUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Already verified (or signed in with Google): nothing to do here.
  if (user && !needsVerification) return <Navigate to="/" replace />;

  const handleVerified = async () => {
    setChecking(true);
    setNotYet(false);
    try {
      await refreshUser();
      if (auth.currentUser?.emailVerified) navigate("/", { replace: true });
      else setNotYet(true);
    } catch {
      setMessage("Could not check right now. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setMessage("");
    try {
      await sendEmailVerification(auth.currentUser, { url: APP_URL });
      setMessage("Email sent.");
    } catch (err: any) {
      setMessage(err?.code === "auth/too-many-requests" ? "Too many requests. Please wait a bit." : "Could not send the email. Please try again.");
    }
    setCooldown(60);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="w-full max-w-md premium-glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-10 shadow-xl relative z-10 text-center space-y-6">
        <Logo className="h-12 sm:h-16 justify-center" />
        <div className="space-y-3">
          <MailCheck className="w-10 h-10 text-blue-400 mx-auto" />
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Check your inbox</h2>
          <p className="text-sm font-medium text-slate-300">
            We sent a link to <span className="font-bold text-white">{user?.email}</span>. Open it, then come back here.
          </p>
        </div>

        {notYet && (
          <div className="p-3 rounded-2xl text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            Not verified yet
          </div>
        )}
        {message && <p className="text-xs font-bold text-slate-300">{message}</p>}

        <div className="space-y-3">
          <button
            onClick={handleVerified}
            disabled={checking}
            className="w-full flex justify-center py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : "I've verified"}
          </button>
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="w-full py-3 bg-white/5 border border-white/10 text-slate-200 font-bold rounded-2xl text-sm hover:bg-white/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
          </button>
          <button
            onClick={signOut}
            className="w-full py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
