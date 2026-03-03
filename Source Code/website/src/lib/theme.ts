/**
 * Standardized design tokens for the Traction.
 *
 * Import these constants instead of scattering raw Tailwind classes
 * throughout components. When you need to tweak a colour, border
 * radius, or shadow across the whole app, change it here once.
 */

/* ── Colour Palette (Tailwind class fragments) ─────────────────────── */

export const colors = {
  /* Text */
  textPrimary: "text-white",
  textSecondary: "text-slate-400",
  textMuted: "text-slate-500",
  textAccent: "text-blue-400",
  textDanger: "text-red-400",
  textSuccess: "text-green-400",
  textWarning: "text-amber-400",

  /* Backgrounds */
  bgPage: "bg-transparent",
  bgCard: "premium-glass",
  bgCardHeavy: "premium-glass-heavy",
  bgInput: "bg-black/20 backdrop-blur-sm",
  bgHover: "hover:bg-white/10",
  bgOverlay: "bg-black/50 backdrop-blur-sm",

  /* Borders */
  border: "border-white/10",
  borderSubtle: "border-white/5",
  borderInput: "border-slate-600",

  /* Accents (gradients & highlights) */
  accentGradient: "bg-gradient-to-r from-blue-600 to-indigo-600",
  accentGradientHover: "hover:from-blue-500 hover:to-indigo-500",
  accentShadow: "shadow-lg shadow-blue-500/20",
  accentShadowHover: "hover:shadow-blue-500/40",

  /* Status badges */
  statusApplied: "bg-blue-900/30 text-blue-300",
  statusSaved: "bg-purple-900/30 text-purple-300",
  statusInterviewing: "bg-slate-800 text-slate-300",
  statusOffer: "bg-green-900/30 text-green-300",
  statusRejected: "bg-red-900/30 text-red-300",

  /* Network status badges */
  networkHot: "bg-red-900/30 text-red-400",
  networkWarm: "bg-orange-900/30 text-orange-400",
  networkCold: "bg-blue-900/30 text-blue-400",
} as const;

/* ── Shared class strings ──────────────────────────────────────────── */

/** Primary CTA button */
export const btnPrimary = [
  "bg-gradient-to-r from-blue-600 to-indigo-600",
  "hover:from-blue-500 hover:to-indigo-500",
  "text-white font-bold text-sm",
  "rounded-2xl px-4 sm:px-6 py-2 sm:py-2.5",
  "shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40",
  "hover:-translate-y-0.5 active:translate-y-0",
  "transition-all backdrop-blur-sm",
].join(" ");

/** Ghost / secondary button */
export const btnGhost = [
  "text-slate-400 hover:text-white",
  "hover:bg-white/10 rounded-full p-2",
  "transition-colors",
].join(" ");

/** Standard form input */
export const inputBase = [
  "w-full px-3 py-2.5",
  "bg-slate-700 border border-slate-600 rounded-xl",
  "text-white placeholder-slate-500",
  "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500",
  "transition-colors text-sm",
].join(" ");

/** Glass search input */
export const inputSearch = [
  "w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm",
  "border border-white/10 rounded-2xl",
  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
  "bg-black/20 backdrop-blur-sm text-white placeholder-slate-400 font-medium shadow-inner",
].join(" ");

/** Glass card (the most common container) */
export const card = "premium-glass rounded-2xl sm:rounded-3xl shadow-xl";

/** Table header cell */
export const th = [
  "text-[10px] sm:text-[11px] font-bold text-slate-400",
  "uppercase tracking-widest",
].join(" ");

/** Section heading */
export const heading =
  "text-2xl sm:text-3xl font-bold text-white tracking-tight";

/** Sub-heading / description */
export const subheading = "text-slate-400 text-xs sm:text-sm font-medium";
