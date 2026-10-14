import { doc, updateDoc } from "firebase/firestore";
import { AlertTriangle, ArrowRight, Calendar, Compass, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { PRESETS } from "../lib/discover";
import { db } from "../lib/firebase";
import { formatDobInput, isValidDob } from "../utils/dob";

export default function Onboarding() {
  const { user, userProfile } = useAuth();
  const { backgroundConfig } = useTheme();
  const [firstName, setFirstName] = useState(userProfile?.firstName || "");
  const [lastName, setLastName] = useState(userProfile?.lastName || "");
  const [dob, setDob] = useState(userProfile?.dob || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  // Step 2 is optional: pick a Discover preset or skip to the dashboard.
  const [step, setStep] = useState<"profile" | "discover">("profile");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!firstName || !lastName || !dob) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (!isValidDob(dob)) {
      setFormError("Please enter a valid Date of Birth (MM/DD/YYYY).");
      return;
    }
    setFormError("");

    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        firstName,
        lastName,
        dob,
        onboardingCompleted: true,
      });
      setStep("discover");
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setFormError("Failed to save profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDob(formatDobInput(e.target.value));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans"
      style={{
        backgroundImage:
          backgroundConfig.type === "image"
            ? `url('${backgroundConfig.value}')`
            : undefined,
        backgroundColor:
          backgroundConfig.type === "color"
            ? backgroundConfig.value
            : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Decorative blurs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="w-full max-w-2xl premium-glass rounded-2xl overflow-hidden shadow-2xl relative z-10 border border-white/5 disabled:opacity-50">
        <div className="p-5 sm:p-6 border-b border-white/5 bg-black/40 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Profile Setup
            </h1>
            <p className="text-slate-300 mt-1 text-xs font-medium">
              Welcome to SaveTheJob. Let's get your account activated.
            </p>
          </div>
        </div>

        {step === "discover" ? (
          <div className="p-5 sm:p-6 bg-black/10 backdrop-blur-md space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-300" />
                Set up Discover (optional)
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Discover finds internships and new-grad roles that fit you, twice a day. Pick a starting point; you can
                fine-tune it next.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  // Full reload so the app picks up the completed profile
                  onClick={() => (window.location.href = `/discover/settings?preset=${p.id}`)}
                  className="text-left rounded-2xl p-4 border bg-black/20 border-white/5 hover:bg-white/5 transition-all"
                >
                  <p className="text-sm font-bold text-white">{p.label}</p>
                  <p className="text-xs text-slate-300 mt-1">{p.description}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="w-full text-sm font-bold text-slate-200 hover:text-white py-3 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              Skip for now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
        <div className="p-5 sm:p-6 bg-black/10 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {formError && (
              <div className="p-3 rounded-2xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    First Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Last Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date of Birth
                </label>
                <input
                  type="text"
                  required
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  value={dob}
                  onChange={handleDobChange}
                  className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all color-scheme-dark"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 opacity-100 transition-all pb-1">
                <span className="text-[10px]">🔒</span>
                <p className="text-[9px] font-bold text-white uppercase tracking-widest">
                  Your data is encrypted and securely stored.
                </p>
              </div>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}
