import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArrowRight, User, Calendar } from "lucide-react";

export default function Onboarding() {
    const { user, userProfile } = useAuth();
    const [firstName, setFirstName] = useState(userProfile?.firstName || "");
    const [lastName, setLastName] = useState(userProfile?.lastName || "");
    const [dob, setDob] = useState(userProfile?.dob || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!firstName || !lastName || !dob) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                firstName,
                lastName,
                dob,
                onboardingCompleted: true,
            });
            // Small delay for animation satisfaction
            setTimeout(() => {
                window.location.href = "/";
            }, 500);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to save profile. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans"
            style={{
                backgroundImage: "url('/wallpapers/default.jpeg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundAttachment: "fixed",
            }}
        >
            {/* Decorative Blur Backgrounds */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 -right-4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />

            {/* Container - Using premium-glass utility directly */}
            <div className="w-full max-w-xl premium-glass rounded-[2rem] p-8 md:p-10 shadow-2xl relative z-10 border border-white/40 dark:border-white/10">
                <div className="text-center mb-8">
                    {/* Header - Exact Dashboard Specs */}
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                        Welcome to Traction
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.25em] opacity-80">
                        Account Activation: Profile Setup
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 opacity-70">
                                First Name
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter First Name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 opacity-70">
                                Last Name
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter Last Name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1 opacity-70">
                            Date of Birth
                        </label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
                            <input
                                type="date"
                                required
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-sm text-slate-900 dark:text-white color-scheme-dark shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`
                                relative w-full group overflow-visible
                                ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                            `}
                        >
                            {/* 3D Button - Matching Dashboard Primary Action Feel */}
                            <div className="absolute inset-0 bg-slate-800 dark:bg-slate-700 rounded-2xl translate-y-1.5 shadow-lg" />
                            <div className={`
                                relative px-8 py-4 bg-slate-950 dark:bg-white
                                rounded-2xl text-white dark:text-slate-900 font-black text-[11px] uppercase tracking-[0.2em]
                                flex items-center justify-center gap-3 transition-all duration-200
                                group-hover:-translate-y-1 group-active:translate-y-1 border border-white/20 dark:border-slate-200
                            `}>
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Continue to Dashboard
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                                    </>
                                )}
                            </div>
                        </button>
                    </div>
                </form>

                {/* Footer Disclaimer - Subtle like Dashboard secondary text */}
                <div className="mt-8 flex items-center justify-center gap-2 opacity-40 grayscale hover:grayscale-0 transition-all">
                    <span className="text-[10px]">🔒</span>
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Your data is encrypted and securely stored.
                    </p>
                </div>
            </div>
        </div>
    );
}
