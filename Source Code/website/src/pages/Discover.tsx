/**
 * Discover: roles found and scored by the Traction collector.
 *
 * The collector (Source Code/collector, runs on a server on a timer) writes
 * one `discoveries` doc per matching role for this user. This page lets the
 * user triage them: save to the pipeline, open the posting, or dismiss.
 * It also surfaces "Applied" jobs that are due a follow-up.
 */

import { formatDistanceToNowStrict } from "date-fns";
import type { Timestamp } from "firebase/firestore";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  BellRing,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Cpu,
  ExternalLink,
  EyeOff,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CustomSelect from "../components/CustomSelect";
import type { ToastMessage } from "../components/Toast";
import ToastContainer from "../components/Toast";
import type { Job, Priority } from "../context/JobContext";
import { useJobs } from "../context/JobContext";
import { useEffectiveUserId } from "../hooks/useEffectiveUserId";
import { db } from "../lib/firebase";

// ── Types ───────────────────────────────────────────────────────────────────

type Track = "intern" | "newgrad";
type DiscoveryStatus = "new" | "saved" | "dismissed";

interface Discovery {
  id: string;
  userId: string;
  company: string;
  title: string;
  location: string;
  url: string;
  track: Track;
  terms: string[];
  category: string;
  sources: string[];
  fitScore: number;
  fitReasons: string[];
  flags: {
    citizen: boolean;
    exportControl: boolean;
    noSponsor: boolean;
    sponsorFriendly: boolean;
    screened: boolean;
  };
  flagSnippets: string[];
  gradWindow: string;
  postedAt?: Timestamp | null;
  firstSeenAt?: Timestamp | null;
  active: boolean;
  status: DiscoveryStatus;
  jobId?: string;
}

interface CollectorRun {
  lastRunAt?: Timestamp | null;
  rawPostings?: number;
  uniqueRoles?: number;
  sourceErrors?: Record<string, string>;
}

const PAGE_SIZE = 40;
const FOLLOW_UP_DAYS = 7;
const AZ_RE = /\b(AZ|Arizona|Phoenix|Tempe|Chandler|Scottsdale|Mesa|Gilbert|Tucson)\b/i;

// ── Helpers ─────────────────────────────────────────────────────────────────

function ago(ts?: Timestamp | null): string {
  if (!ts) return "";
  try {
    return formatDistanceToNowStrict(ts.toDate(), { addSuffix: true });
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
  if (score >= 80) return "High";
  if (score >= 70) return "Medium";
  return "Low";
}

function daysSince(dateApplied: string): number | null {
  const t = Date.parse(dateApplied);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function isHardware(d: Discovery): boolean {
  return (
    d.category.toLowerCase().includes("hardware") ||
    d.fitReasons.some((r) => r.startsWith("Core role match"))
  );
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

function FlagBadges({ d }: { d: Discovery }) {
  const badges: { label: string; cls: string; icon: React.ReactNode }[] = [];
  if (d.flags.citizen)
    badges.push({
      label: "Citizenship / clearance",
      cls: "bg-red-500/20 text-red-300 border-red-400/30",
      icon: <ShieldAlert className="w-3 h-3" />,
    });
  if (d.flags.exportControl && !d.flags.citizen)
    badges.push({
      label: "Export control",
      cls: "bg-amber-500/20 text-amber-200 border-amber-400/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    });
  if (d.flags.noSponsor && !d.flags.citizen)
    badges.push({
      label: "No sponsorship",
      cls: "bg-amber-500/20 text-amber-200 border-amber-400/30",
      icon: <AlertTriangle className="w-3 h-3" />,
    });
  if (d.flags.sponsorFriendly)
    badges.push({
      label: "Sponsor-friendly",
      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      icon: <ShieldCheck className="w-3 h-3" />,
    });
  if (!d.flags.screened && badges.length === 0)
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
          title={d.flagSnippets.join("\n\n") || undefined}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 border ${b.cls}`}
        >
          {b.icon}
          {b.label}
        </span>
      ))}
    </>
  );
}

function DiscoveryCard({
  d,
  isNew,
  onSave,
  onDismiss,
  onRestore,
  busy,
}: {
  d: Discovery;
  isNew: boolean;
  onSave: (d: Discovery) => void;
  onDismiss: (d: Discovery) => void;
  onRestore: (d: Discovery) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reasons = open ? d.fitReasons : d.fitReasons.slice(0, 3);
  const posted = ago(d.postedAt);

  return (
    <div className="premium-glass border border-white/5 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-12 h-12 rounded-xl border flex flex-col items-center justify-center ${scoreStyle(d.fitScore)}`}
          title="Fit score (0 to 100)"
        >
          <span className="text-lg font-extrabold leading-none">{d.fitScore}</span>
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
            {!d.active && (
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
        <FlagBadges d={d} />
      </div>

      <ul className="text-[12px] text-slate-300 space-y-1">
        {reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="text-slate-500">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {(d.fitReasons.length > 3 || d.flagSnippets.length > 0 || d.gradWindow) && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="self-start text-[12px] font-semibold text-blue-300 hover:text-blue-200 flex items-center gap-1"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? "Less" : "Details"}
        </button>
      )}
      {open && (d.flagSnippets.length > 0 || d.gradWindow) && (
        <div className="text-[12px] text-slate-300 bg-black/20 rounded-xl p-3 space-y-2 border border-white/5">
          {d.flagSnippets.map((s) => (
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
            <button
              disabled={busy}
              onClick={() => onDismiss(d)}
              className="ml-auto p-2 rounded-xl text-slate-300 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Not interested"
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
  const uid = useEffectiveUserId();
  const { jobs, createJob, markFollowedUp, openModal, limitError, clearLimitError } = useJobs();

  const [items, setItems] = useState<Discovery[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [run, setRun] = useState<CollectorRun | null>(null);
  const [track, setTrack] = useState<Track>("intern");
  const [view, setView] = useState<DiscoveryStatus>("new");
  const [search, setSearch] = useState("");
  const [hideRedFlags, setHideRedFlags] = useState(true);
  const [azOnly, setAzOnly] = useState(false);
  const [hwOnly, setHwOnly] = useState(false);
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

  useEffect(() => {
    if (limitError) {
      addToast(limitError, "warning");
      clearLimitError();
    }
  }, [limitError, addToast, clearLimitError]);

  // Live data
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "discoveries"), where("userId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Discovery));
        setLoaded(true);
      },
      (err) => {
        console.error("discoveries listener:", err);
        setLoaded(true);
      },
    );
    const unsubRun = onSnapshot(
      doc(db, "collectorRuns", uid),
      (snap) => setRun(snap.exists() ? (snap.data() as CollectorRun) : null),
      () => setRun(null),
    );
    return () => {
      unsub();
      unsubRun();
    };
  }, [uid]);

  // Reset paging when filters change
  useEffect(() => setLimit(PAGE_SIZE), [track, view, search, hideRedFlags, azOnly, hwOnly, sort]);

  const isNewSinceVisit = useCallback(
    (d: Discovery) => !!d.firstSeenAt && d.firstSeenAt.toMillis() > lastVisit,
    [lastVisit],
  );

  const followUps = useMemo(
    () =>
      jobs
        .filter((j: Job) => j.status === "Applied" && !j.followedUpAt)
        .map((j) => ({ job: j, days: daysSince(j.dateApplied) }))
        .filter((x): x is { job: Job; days: number } => x.days !== null && x.days >= FOLLOW_UP_DAYS)
        .sort((a, b) => b.days - a.days),
    [jobs],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = items.filter((d) => {
      if (d.track !== track) return false;
      if ((d.status || "new") !== view) return false;
      if (view === "new" && !d.active) return false;
      if (hideRedFlags && view === "new") {
        if (d.flags?.citizen) return false;
        if (d.track === "newgrad" && d.flags?.noSponsor) return false;
      }
      if (azOnly && !AZ_RE.test(d.location || "")) return false;
      if (hwOnly && !isHardware(d)) return false;
      if (s && !`${d.company} ${d.title} ${d.location}`.toLowerCase().includes(s)) return false;
      return true;
    });
    list.sort((a, b) =>
      sort === "fit"
        ? b.fitScore - a.fitScore || (b.postedAt?.toMillis() ?? 0) - (a.postedAt?.toMillis() ?? 0)
        : (b.postedAt?.toMillis() ?? b.firstSeenAt?.toMillis() ?? 0) -
          (a.postedAt?.toMillis() ?? a.firstSeenAt?.toMillis() ?? 0),
    );
    return list;
  }, [items, track, view, search, hideRedFlags, azOnly, hwOnly, sort]);

  const stats = useMemo(() => {
    const live = items.filter((d) => d.active && (d.status || "new") === "new");
    return {
      newSinceVisit: live.filter(isNewSinceVisit).length,
      highFit: live.filter((d) => d.fitScore >= 80 && !d.flags?.citizen).length,
      arizona: live.filter((d) => AZ_RE.test(d.location || "") && !d.flags?.citizen).length,
      saved: items.filter((d) => d.status === "saved").length,
    };
  }, [items, isNewSinceVisit]);

  const counts = useMemo(() => {
    const c: Record<Track, number> = { intern: 0, newgrad: 0 };
    for (const d of items) if (d.active && (d.status || "new") === "new") c[d.track]++;
    return c;
  }, [items]);

  // Actions
  const setStatus = async (d: Discovery, status: DiscoveryStatus, extra: Record<string, unknown> = {}) => {
    await updateDoc(doc(db, "discoveries", d.id), { status, ...extra });
  };

  const handleSave = async (d: Discovery) => {
    setBusyId(d.id);
    try {
      // A job already linked to this discovery means an earlier save got as far
      // as creating it; reuse it instead of adding a duplicate.
      const existing = jobs.find((j) => j.discoveryId === d.id);
      if (existing) {
        await setStatus(d, "saved", { jobId: existing.id });
        addToast(`Saved ${d.company} to your pipeline`);
        return;
      }
      const notes = [
        `Fit ${d.fitScore}/100 (Discover)`,
        ...d.fitReasons.map((r) => `- ${r}`),
        ...(d.flagSnippets.length ? ["", "Posting says:", ...d.flagSnippets.map((s) => `"${s}"`)] : []),
      ].join("\n");
      const jobId = await createJob({
        company: d.company,
        title: d.title,
        location: d.location,
        link: d.url,
        priority: priorityFor(d.fitScore),
        status: "Saved",
        notes,
        discoveryId: d.id,
        fitScore: d.fitScore,
      });
      if (!jobId) return;
      await setStatus(d, "saved", { jobId });
      addToast(`Saved ${d.company} to your pipeline`);
    } catch (e) {
      console.error(e);
      addToast("Couldn't save that role. Try again.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (d: Discovery) => {
    setBusyId(d.id);
    try {
      await setStatus(d, "dismissed");
    } catch (e) {
      console.error(e);
      addToast("Couldn't dismiss that role.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (d: Discovery) => {
    setBusyId(d.id);
    try {
      await setStatus(d, "new");
    } finally {
      setBusyId(null);
    }
  };

  const lastRun = ago(run?.lastRunAt);

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
              ? `Last refreshed ${lastRun}${run?.rawPostings ? ` from ${run.rawPostings.toLocaleString()} postings` : ""}.`
              : "Waiting for the first collector run."}
            {run?.sourceErrors && Object.keys(run.sourceErrors).length > 0 && (
              <span className="text-amber-300">
                {" "}
                {Object.keys(run.sourceErrors).length} source(s) failed last run.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[
          { label: "New since last visit", value: stats.newSinceVisit },
          { label: "High fit (80+)", value: stats.highFit },
          { label: "In Arizona", value: stats.arizona },
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
          {(["new", "saved", "dismissed"] as DiscoveryStatus[]).map((v) => (
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
          <Toggle on={hideRedFlags} onClick={() => setHideRedFlags((x) => !x)}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Hide visa red flags
          </Toggle>
          <Toggle on={azOnly} onClick={() => setAzOnly((x) => !x)}>
            <MapPin className="w-3.5 h-3.5" />
            Arizona
          </Toggle>
          <Toggle on={hwOnly} onClick={() => setHwOnly((x) => !x)}>
            <Cpu className="w-3.5 h-3.5" />
            Embedded &amp; hardware
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
      {!loaded ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="premium-glass rounded-2xl p-8 text-center text-slate-200">
          <Compass className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <p className="font-bold text-white">No roles yet</p>
          <p className="text-sm mt-1">
            Once the Traction collector runs on your server, matching roles show up here automatically.
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
              <DiscoveryCard
                key={d.id}
                d={d}
                isNew={isNewSinceVisit(d)}
                onSave={handleSave}
                onDismiss={handleDismiss}
                onRestore={handleRestore}
                busy={busyId === d.id}
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

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
