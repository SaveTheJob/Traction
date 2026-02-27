import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Fingerprint, Loader2, Lock, Mail, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
export default function Login() {
  const { loginAsLocalAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUid, setAdminUid] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in all fields");
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Incorrect email or password");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Please enter your email to reset your password");
      return;
    }
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");

    // Verify specific credentials provided by USER
    if (adminUid === "admin" && adminPassword === "admin") {
      loginAsLocalAdmin();
      navigate("/admin");
    } else {
      setAdminError("Invalid Admin Credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="w-full max-w-md space-y-6 sm:space-y-8 premium-glass-heavy p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-2xl relative z-10 border-t border-white/5">
        <div className="text-center">
          <Logo className="h-12 sm:h-16 justify-center mb-4 sm:mb-6" />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-400">
            Track your job applications with{" "}
            <span className="text-blue-400 font-bold">Traction</span>
          </p>
        </div>

        <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 px-4 py-3 border border-white/10 rounded-2xl shadow-lg bg-black/20 text-[15px] font-black text-slate-200 hover:bg-black/40 focus:outline-none transition-all duration-300 disabled:opacity-50 active:scale-[0.98] group"
          >
            <div className="bg-white p-1 rounded-lg shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <span className="group-hover:translate-x-0.5 transition-transform">
              Sign in with Google
            </span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="premium-glass px-4 py-1.5 rounded-full text-slate-500 font-black uppercase tracking-widest text-[10px]">
                Or email
              </span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-4 text-xs font-bold text-red-600 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-start gap-2 animate-in fade-in zoom-in">
                <span>{error}</span>
              </div>
            )}
            {resetSent && (
              <div className="p-4 text-xs font-bold text-green-600 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-start gap-2 animate-in fade-in zoom-in">
                <span>Password reset email sent! Check your inbox.</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Email address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-[15px] font-medium transition-all shadow-inner"
                    placeholder="Enter Email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-[15px] font-medium transition-all shadow-inner"
                    placeholder="Enter Password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/20 rounded cursor-pointer accent-blue-600"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-xs font-bold text-slate-400 cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              <div className="text-xs">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="font-black text-blue-600 hover:text-blue-500 cursor-pointer outline-none hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs font-bold text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-black text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* Admin Panel Entry Point */}
      <div className="absolute bottom-6 right-6 z-20">
        <button
          onClick={() => setShowAdminLogin(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-all active:scale-95 group"
        >
          <ShieldCheck className="w-3.5 h-3.5 group-hover:animate-pulse" />
          Admin Panel
        </button>
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm premium-glass-heavy p-8 rounded-3xl shadow-2xl border border-white/20 relative animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => {
                setShowAdminLogin(false);
                setAdminError("");
                setAdminUid("");
                setAdminPassword("");
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                System Access
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                Administrative Verification Required
              </p>
            </div>

            <form onSubmit={handleAdminAuth} className="space-y-4">
              {adminError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-widest text-center animate-shake">
                  {adminError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                    Admin ID
                  </label>
                  <div className="relative group">
                    <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      value={adminUid}
                      onChange={(e) => setAdminUid(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/5 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400"
                      placeholder="ENTER ID..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                    Passkey
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-black/20 border border-white/5 rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400"
                      placeholder="ENTER PASSCODE..."
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
              >
                Verify System Access
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
