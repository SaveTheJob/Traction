/**
 * Discover: roles found and scored by the Offerward collector.
 *
 * The collector (Source Code/collector, runs on a server on a timer) writes one
 * `discover/feed` doc holding every card for this user. The user's marks live in
 * `discover/triage`. This page lets the user triage the cards: save to the
 * pipeline, open the posting, or dismiss.
 * It also surfaces "Applied" jobs that are due a follow-up.
 */

import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  BellRing,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Ban,
  Compass,
  ExternalLink,
  EyeOff,
  Info,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import type { ToastMessage } from "../components/Toast";
import ToastContainer from "../components/Toast";
import { useJobs } from "../context/JobContext";
import { useDiscoverFeed, useDiscoverSettings, useSystemDiscover, useTriage } from "../hooks/useDiscover";
import type { Job, Priority } from "../lib/db";
import type { CardStatus, CardView, Track } from "../lib/discover";
import { REFRESH_TIMES, cardView, literalMatcher, locationMatcher } from "../lib/discover";

const PAGE_SIZE = 40;
const FOLLOW_UP_DAYS = 7;

// ── Helpers ─────────────────────────────────────────────────────────────────

function ago(at?: Date | null): string {
  if (!at) return "";
  try {
    return formatDistanceToNowStrict(at, { addSuffix: true });
  } catch {
    return "";
  }
}

function scoreStyle(score: number): string {
  if (score >= 80) return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
  if (score >= 70) return "bg-blue-500/20 text-blue-300 border-blue-400/30";
  return "bg-white/10 text-slate-200 border-white/15";
}

function priorityFor(score: number): Priority {
  if (score >= 80) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function daysSince(appliedAt: Date | null): number | null {
  if (!appliedAt) return null;
  return Math.floor((Date.now() - appliedAt.getTime()) / 86_400_000);
}

/** A top-tier match for the role families or keywords the user picked. */
function isFocus(d: CardView): boolean {
  return d.tier === "core";
}

// ── Small pieces ────────────────────────────────────────────────────────────

function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] text-slate-200 bg-white/5 rounded-full px-2.5 py-1 border border-white/10 ${className}`}
    >
      {children}
    </span>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all ${
        on
          ? "bg-blue-500/25 border-blue-400/40 text-white"
          : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
      }`}
    >
      {on && <Check className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

const INFO_BADGE = "bg-sky-500/15 text-sky-200 border-sky-400/25";

/** Work-authorization badges. For users who need sponsorship they're warnings; for
 * everyone else they're informational notes and sponsorship-only badges are hidden. */
function FlagBadges({ d, sponsorMode }: { d: CardView; sponsorMode: boolean }) {
  const badges: { label: string; cls: string; icon: React.ReactNode }[] = [];
  if (d.flags.citizen)
    badges.push({
      label: sponsorMode ? "Citizenship / clearance" : "Mentions citizenship / clearance",
      cls: sponsorMode ? "bg-red-500/20 text-red-300 border-red-400/30" : INFO_BADGE,
      icon: sponsorMode ? <ShieldAlert className="w-3 h-3" /> : <Info className="w-3 h-3" />,
    });
  if (d.flags.exportControl && !d.flags.citizen)
    badges.push({
      label: "Export control",
      cls: sponsorMode ? "bg-amber-500/20 text-amber-200 border-amber-400/30" : INFO_BADGE,
      icon: sponsorMode ? <AlertTriangle className="w-3 h-3" /> : <Info className="w-3 h-3" />,
    });
  if (sponsorMode && d.flags.noSponsor && !d.flags.citizen)
    badges.push({
      label: "No sponsorship",
      cls: "bg-amber-500/20 text-amber-200 border-amber-400/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    });
  if (sponsorMode && d.flags.sponsorFriendly)
    badges.push({
      label: "Sponsor-friendly",
      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      icon: <ShieldCheck className="w-3 h-3" />,
    });
  if (sponsorMode && !d.flags.screened && badges.length === 0)
    badges.push({
      label: "Not screened",
      cls: "bg-white/5 text-slate-300 border-white/10",
      icon: <Clock className="w-3 h-3" />,
    });
  return (
    <>
      {badges.map((b) => (
        <span
          key={b.label}
          title={d.snippets.join("\n\n") || undefined}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 border ${b.cls}`}
        >
          {b.icon}
          {b.label}
        </span>
      ))}
    </>
  );
}

function RoleCard({
  d,
  isNew,
  sponsorMode,
  onSave,
  onDismiss,
  onRestore,
  onHideCompany,
  busy,
}: {
  d: CardView;
  isNew: boolean;
  sponsorMode: boolean;
  onSave: (d: CardView) => void;
  onDismiss: (d: CardView) => void;
  onRestore: (d: CardView) => void;
  /** Absent when the viewer can't edit the settings (admin viewing as a user) */
  onHideCompany?: (d: CardView) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reasons = open ? d.reasons : d.reasons.slice(0, 3);
  const posted = ago(d.postedAt);

  return (
    <div className="premium-glass border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${scoreStyle(d.score)}`}
          title="Fit score (0 to 100)"
        >
          <span className="text-lg font-extrabold leading-none">{d.score}</span>
          <span className="text-[9px] font-bold tracking-widest opacity-80">FIT</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white text-[15px] leading-tight truncate">{d.company}</p>
            {isNew && d.status === "new" && (
              <span className="text-[10px] font-extrabold tracking-widest px-1.5 py-0.5 rounded-md bg-blue-500/30 text-blue-200">
                NEW
              </span>
            )}
            {d.closed && (
              <span className="text-[10px] font-extrabold tracking-widest px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300">
                CLOSED
              </span>
            )}
          </div>
          <p className="text-[13px] text-slate-200 mt-0.5 leading-snug">{d.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {d.location && (
          <Chip className="max-w-full">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[220px]">{d.location}</span>
          </Chip>
        )}
        {posted && (
          <Chip>
            <Clock className="w-3 h-3" />
            {posted}
          </Chip>
        )}
        {d.terms.slice(0, 2).map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
        <FlagBadges d={d} sponsorMode={sponsorMode} />
      </div>

      <ul className="text-[12px] text-slate-300 space-y-1">
        {reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="text-slate-500">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {(d.reasons.length > 3 || d.snippets.length > 0 || d.gradWindow) && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="self-start text-[12px] font-semibold text-blue-300 hover:text-blue-200 flex items-center gap-1"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? "Less" : "Details"}
        </button>
      )}
      {open && (d.snippets.length > 0 || d.gradWindow) && (
        <div className="text-[12px] text-slate-300 bg-black/20 rounded-xl p-3 space-y-2 border border-white/5">
          {d.snippets.map((s) => (
            <p key={s} className="italic">"{s}"</p>
          ))}
          {d.gradWindow && (
            <p>
              <span className="font-semibold text-slate-200">Graduation timing: </span>
              {d.gradWindow}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 mt-auto">
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open posting
        </a>
        {d.status === "new" && (
          <>
            <button
              disabled={busy}
              onClick={() => onSave(d)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all disabled:opacity-50"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Save to pipeline
            </button>
            {onHideCompany && (
              <button
                disabled={busy}
                onClick={() => onHideCompany(d)}
                className="ml-auto p-2 rounded-xl text-slate-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                title={`Hide all roles from ${d.company}`}
                aria-label={`Hide all roles from ${d.company}`}
              >
                <Ban className="w-4 h-4" />
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => onDismiss(d)}
              className={`${onHideCompany ? "" : "ml-auto "}p-2 rounded-xl text-slate-300 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50`}
              title="Not interested"
              aria-label="Not interested"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </>
        )}
        {d.status === "saved" && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <BookmarkCheck className="w-4 h-4" />
            In your pipeline
          </span>
        )}
        {d.status === "dismissed" && (
          <button
            disabled={busy}
            onClick={() => onRestore(d)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function Discover() {
  const { uid, settings: profile, loading: profileLoading, canEdit, save: saveProfile } = useDiscoverSettings();
  const { feed, loading: feedLoading } = useDiscoverFeed();
  const { triage, setStatus: setTriage } = useTriage();
  const { inviteOnly } = useSystemDiscover();
  const { jobs, createJob, markFollowedUp, openModal } = useJobs();

  const [track, setTrack] = useState<Track>("intern");
  const [view, setView] = useState<CardStatus>("new");
  const [search, setSearch] = useState("");
  const [hideRedFlags, setHideRedFlags] = useState(true);
  const [locOnly, setLocOnly] = useState(false);
  const [focusOnly, setFocusOnly] = useState(false);
  const [sort, setSort] = useState<"fit" | "newest">("fit");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // "New since last visit": read once on mount, store now when leaving.
  const visitKey = `discover_last_visit_${uid || "guest"}`;
  const [lastVisit] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(visitKey) || 0);
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(visitKey, String(Date.now()));
      } catch {
        /* storage unavailable */
      }
    };
  }, [visitKey]);

  const addToast = useCallback((message: string, type: ToastMessage["type"] = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const items = useMemo(() => (feed?.cards ?? []).map((c) => cardView(c, triage)), [feed, triage]);
  const loaded = !feedLoading;

  // Reset paging when filters change
  // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
  useEffect(() => setLimit(PAGE_SIZE), [track, view, search, hideRedFlags, locOnly, focusOnly, sort]);

  const isNewSinceVisit = useCallback(
    (d: CardView) => !!d.firstSeenAt && d.firstSeenAt.getTime() > lastVisit,
    [lastVisit],
  );

  const followUps = useMemo(
    () =>
      jobs
        .filter((j: Job) => j.status === "applied" && !j.followedUpAt)
        .map((j) => ({ job: j, days: daysSince(j.appliedAt) }))
        .filter((x): x is { job: Job; days: number } => x.days !== null && x.days >= FOLLOW_UP_DAYS)
        .sort((a, b) => b.days - a.days),
    [jobs],
  );

  const sponsorMode = profile?.needsSponsorship ?? false;
  const inMyLocations = useMemo(() => locationMatcher(profile?.locations.preferred ?? []), [profile]);
  // Cards from a company hidden since the last refresh disappear right away.
  const hiddenRx = useMemo(() => literalMatcher(profile?.companies.hidden ?? []), [profile]);
  const visible = useMemo(
    () => items.filter((d) => !hiddenRx || d.status === "saved" || !hiddenRx.test(d.company)),
    [items, hiddenRx],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = visible.filter((d) => {
      if (d.track !== track) return false;
      if (d.status !== view) return false;
      if (sponsorMode && hideRedFlags && view === "new") {
        if (d.flags?.citizen) return false;
        if (d.track === "newgrad" && d.flags?.noSponsor) return false;
      }
      if (locOnly && !inMyLocations(d.location || "")) return false;
      if (focusOnly && !isFocus(d)) return false;
      if (s && !`${d.company} ${d.title} ${d.location}`.toLowerCase().includes(s)) return false;
      return true;
    });
    list.sort((a, b) =>
      sort === "fit"
        ? b.score - a.score || (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0)
        : (b.postedAt?.getTime() ?? b.firstSeenAt?.getTime() ?? 0) -
          (a.postedAt?.getTime() ?? a.firstSeenAt?.getTime() ?? 0),
    );
    return list;
  }, [visible, track, view, search, sponsorMode, hideRedFlags, locOnly, inMyLocations, focusOnly, sort]);

  const stats = useMemo(() => {
    const live = visible.filter((d) => !d.closed && d.status === "new");
    const ok = (d: CardView) => !sponsorMode || !d.flags?.citizen;
    return {
      newSinceVisit: live.filter(isNewSinceVisit).length,
      highFit: live.filter((d) => d.score >= 80 && ok(d)).length,
      inLocations: live.filter((d) => inMyLocations(d.location || "") && ok(d)).length,
      saved: visible.filter((d) => d.status === "saved").length,
    };
  }, [visible, isNewSinceVisit, sponsorMode, inMyLocations]);

  const counts = useMemo(() => {
    const c: Record<Track, number> = { intern: 0, newgrad: 0 };
    for (const d of visible) if (!d.closed && d.status === "new") c[d.track]++;
    return c;
  }, [visible]);

  // Actions
  const handleSave = async (d: CardView) => {
    setBusyId(d.roleKey);
    try {
      // A job already linked to this role means an earlier save got as far
      // as creating it; reuse it instead of adding a duplicate.
      const existing = jobs.find((j) => j.fromDiscover?.roleKey === d.roleKey);
      if (existing) {
        await setTriage(d.roleKey, { status: "saved", jobId: existing.id });
        addToast(`Saved ${d.company} to your pipeline`);
        return;
      }
      const notes = [
        `Fit ${Math.round(d.score)}/100 (Discover)`,
        ...d.reasons.map((r) => `- ${r}`),
        ...(d.snippets.length ? ["", "Posting says:", ...d.snippets.map((s) => `"${s}"`)] : []),
      ].join("\n");
      const jobId = await createJob({
        company: d.company,
        title: d.title,
        location: d.location,
        url: d.url,
        priority: priorityFor(d.score),
        status: "saved",
        notes,
        fromDiscover: { roleKey: d.roleKey.slice(0, 64), fitScore: Math.round(d.score) },
      }, "discover");
      if (!jobId) return;
      await setTriage(d.roleKey, { status: "saved", jobId });
      addToast(`Saved ${d.company} to your pipeline`);
    } catch (e) {
      console.error(e);
      addToast("Couldn't save that role. Try again.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (d: CardView) => {
    setBusyId(d.roleKey);
    try {
      await setTriage(d.roleKey, { status: "dismissed" });
    } catch (e) {
      console.error(e);
      addToast("Couldn't dismiss that role.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (d: CardView) => {
    setBusyId(d.roleKey);
    try {
      await setTriage(d.roleKey, null);
    } catch (e) {
      console.error(e);
      addToast("Couldn't restore that role.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleHideCompany = async (d: CardView) => {
    if (!profile) return;
    const hidden = profile.companies.hidden;
    if (hidden.some((c) => c.toLowerCase() === d.company.toLowerCase())) return;
    if (hidden.length >= 100) {
      addToast("You've hidden 100 companies. Remove some in Tune matches first.", "warning");
      return;
    }
    setBusyId(d.roleKey);
    try {
      await saveProfile({ ...profile, companies: { ...profile.companies, hidden: [...hidden, d.company] } });
      addToast(`Hid ${d.company}. Undo it in Tune matches.`);
    } catch (e) {
      console.error(e);
      addToast("Couldn't hide that company.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const lastRun = ago(feed?.refreshedAt);
  const capped = !!feed && feed.cap > 0 && feed.totalMatches > feed.cap;

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 h-full flex flex-col max-w-[1700px] mx-auto overflow-y-auto scrollbar-theme">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Compass className="w-7 h-7" />
            Discover
          </h1>
          <p className="text-white mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium">
            Roles matched to your profile and screened for work-authorization requirements.
          </p>
          <p className="text-slate-300 mt-1 text-xs">
            {lastRun
              ? `Last refreshed ${lastRun}.`
              : "Waiting for the first collector run."}
            {!!feed?.failedSources && (
              <span className="text-amber-300">
                {" "}
                {feed.failedSources} source(s) failed last run.
              </span>
            )}
          </p>
        </div>
        <Link
          to="/discover/settings"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Tune matches
        </Link>
      </div>

      {capped && (
        <div className="premium-glass rounded-2xl border border-blue-400/20 px-4 py-3 mb-5 sm:mb-6 text-xs sm:text-sm text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-300 shrink-0" />
          <span>
            Showing your top {feed?.cap} of {feed?.totalMatches.toLocaleString()} matches. Raise your minimum score in Tune matches to narrow them down.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[
          { label: "New since last visit", value: stats.newSinceVisit },
          { label: "High fit (80+)", value: stats.highFit },
          { label: "In your locations", value: stats.inLocations },
          { label: "Saved from Discover", value: stats.saved },
        ].map((s) => (
          <div key={s.label} className="premium-glass rounded-2xl px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{s.value}</p>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-300 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <div className="premium-glass rounded-2xl p-4 sm:p-5 mb-5 sm:mb-6">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <BellRing className="w-4 h-4 text-amber-300" />
            Follow-ups due
            <span className="text-xs font-semibold text-slate-300">
              (applied {FOLLOW_UP_DAYS}+ days ago, no reply logged)
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {followUps.slice(0, 6).map(({ job, days }) => (
              <div
                key={job.id}
                className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-xl px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-white truncate">
                    {job.company} <span className="font-normal text-slate-300">· {job.title}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Applied {days} days ago</p>
                </div>
                <button
                  onClick={() => openModal(job.id)}
                  className="text-xs font-semibold text-slate-200 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10"
                >
                  Open
                </button>
                <button
                  onClick={() => markFollowedUp(job.id).then(() => addToast("Follow-up logged"))}
                  className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 px-2.5 py-1.5 rounded-lg"
                >
                  Followed up
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 self-start">
          {(
            [
              ["intern", "Internships"],
              ["newgrad", "New grad"],
            ] as [Track, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                track === t ? "bg-white/20 text-white shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs font-semibold opacity-75">{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 self-start">
          {(["new", "saved", "dismissed"] as CardStatus[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                view === v ? "bg-white/20 text-white shadow" : "text-slate-300 hover:text-white"
              }`}
            >
              {v === "new" ? "To review" : v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {sponsorMode && (
            <Toggle on={hideRedFlags} onClick={() => setHideRedFlags((x) => !x)}>
              <ShieldCheck className="w-3.5 h-3.5" />
              Hide visa red flags
            </Toggle>
          )}
          {!!profile?.locations.preferred.length && (
            <Toggle on={locOnly} onClick={() => setLocOnly((x) => !x)}>
              <MapPin className="w-3.5 h-3.5" />
              My locations
            </Toggle>
          )}
          <Toggle on={focusOnly} onClick={() => setFocusOnly((x) => !x)}>
            <Target className="w-3.5 h-3.5" />
            My focus
          </Toggle>
        </div>
        <div className="flex items-center gap-2 xl:ml-auto w-full xl:w-auto">
          <div className="relative flex-1 xl:w-64">
            <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white/10 backdrop-blur-sm text-white placeholder-slate-200 font-medium shadow-inner"
            />
          </div>
          <CustomSelect
            value={sort}
            onChange={(v) => setSort(v as "fit" | "newest")}
            variant="glass"
            options={[
              { value: "fit", label: "Best fit" },
              { value: "newest", label: "Newest" },
            ]}
            className="w-32 text-sm font-medium"
          />
        </div>
      </div>

      {/* Results */}
      {!loaded || profileLoading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
      ) : !profile && items.length === 0 ? (
        <div className="premium-glass rounded-2xl p-8 text-center text-slate-200">
          <Compass className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <p className="font-bold text-white">Set up Discover</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Tell Discover what you're looking for and it will find matching internships and new-grad roles, screened
            for work-authorization requirements, twice a day.
          </p>
          {canEdit && (
            <Link
              to="/discover/settings"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Set up Discover
            </Link>
          )}
        </div>
      ) : items.length === 0 || profile?.enabled === false ? (
        // Turned off: show the off state even if an old feed doc is still there.
        <div className="premium-glass rounded-2xl p-8 text-center text-slate-200">
          <Compass className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <p className="font-bold text-white">{profile?.enabled === false ? "Discover is off" : "No roles yet"}</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            {profile?.enabled === false
              ? "Turn it back on in Tune matches to get new roles."
              : inviteOnly && !feed
                ? "Discover is invite-only during the beta. Your settings are saved, and matches will appear here once you're added."
                : `Your first matches arrive on the next refresh (${REFRESH_TIMES}).`}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="premium-glass rounded-2xl p-8 text-center text-slate-200 text-sm">
          Nothing matches these filters.
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-300 mb-3">
            Showing {Math.min(limit, filtered.length)} of {filtered.length}
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
            {filtered.slice(0, limit).map((d) => (
              <RoleCard
                key={d.roleKey}
                d={d}
                isNew={isNewSinceVisit(d)}
                sponsorMode={sponsorMode}
                onSave={handleSave}
                onDismiss={handleDismiss}
                onRestore={handleRestore}
                onHideCompany={canEdit && profile ? handleHideCompany : undefined}
                busy={!canEdit || busyId === d.roleKey}
              />
            ))}
          </div>
          {filtered.length > limit && (
            <button
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              className="self-center mt-5 mb-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10"
            >
              Show more
            </button>
          )}
        </>
      )}

      <p className="text-[11px] text-slate-400 mt-8 pb-2 text-center">
        Roles come from company career sites and the community lists by{" "}
        <a href="https://github.com/SimplifyJobs" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">
          SimplifyJobs
        </a>
        ,{" "}
        <a href="https://github.com/vanshb03/Summer2027-Internships" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">
          vanshb03
        </a>{" "}
        and{" "}
        <a href="https://github.com/speedyapply/2027-SWE-College-Jobs" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">
          speedyapply
        </a>
        . Screening is automatic: always read the posting before applying.
      </p>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
