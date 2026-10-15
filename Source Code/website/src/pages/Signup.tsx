/* eslint-disable @typescript-eslint/no-explicit-any -- catch clauses and third-party config objects have no useful static type here */
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import Logo from "../components/Logo";
import { APP_NAME, APP_URL } from "../lib/app";
import { auth } from "../lib/firebase";
export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      return setError("Please fill in all fields");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }
    setError("");
    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user, { url: APP_URL });
      navigate("/verify-email");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -left-4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="w-full max-w-md space-y-6 sm:space-y-8 premium-glass p-5 sm:p-6 lg:p-10 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between h-full z-10">
        <div className="text-center">
          <Logo className="h-12 sm:h-16 justify-center mb-4 sm:mb-6" />
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Get Started
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Create your{" "}
            <span className="text-blue-400 font-bold">{APP_NAME}</span> account
            today
          </p>
        </div>

        <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
          <GoogleAuthButton
            label="Sign up with Google"
            disabled={loading}
            onError={setError}
            setLoading={setLoading}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="premium-glass px-4 py-1.5 rounded-full text-slate-300 font-black uppercase tracking-widest text-[10px]">
                Or email
              </span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSignup}>
            {error && (
              <div className="p-4 text-xs font-bold text-red-600 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-start gap-2 animate-in fade-in zoom-in">
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2 px-1">
                  Email address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Mail className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-[15px] font-medium transition-all shadow-inner"
                    placeholder="Email Address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2 px-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-[15px] font-medium transition-all shadow-inner"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-2 px-1">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                    <Lock className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-12 py-3.5 bg-black/20 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none text-[15px] font-medium transition-all shadow-inner"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-6"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs font-bold text-slate-300">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-black text-blue-300 hover:text-white underline underline-offset-2 decoration-blue-500/50 hover:decoration-white transition-all ml-1"
            >
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
