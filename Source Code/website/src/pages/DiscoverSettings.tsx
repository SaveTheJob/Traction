/**
 * Discover > Tune matches: edits the user's `discover/settings` doc, which the
 * collector reads on its next run. Also files "Add a careers page" feed requests.
 */

import { addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  BellRing,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  Clock,
  Link2,
  MapPin,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ChipInput from "../components/ChipInput";
import type { ToastMessage } from "../components/Toast";
import ToastContainer from "../components/Toast";
import { useDiscoverFeed, useDiscoverSettings, useSystemDiscover } from "../hooks/useDiscover";
import { APP_NAME } from "../lib/app";
import { refs, toDate } from "../lib/db";
import type { DiscoverSettings as Settings, Track } from "../lib/discover";
import {
  DEFAULT_SETTINGS,
  LIMITS,
  PRESETS,
  REFRESH_TIMES,
  applyPreset,
  feedUrlProblem,
  suggestedTerms,
  upcomingTerms,
  validWebhook,
} from "../lib/discover";

interface FeedRequest {
  id: string;
  company: string;
  url: string;
  status: "pending" | "added" | "rejected";
  reason?: string;
  createdAt: Date | null;
}

const inputCls =
  "w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-2xl text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder:text-slate-500 color-scheme-dark";
const TERM_RE = /^(Spring|Summer|Fall|Winter) 20\d\d$/;

function Section({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="premium-glass rounded-2xl border border-white/5 p-5 sm:p-6">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {hint && <p className="text-xs text-slate-300 mt-1">{hint}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1.5 px-1">{hint}</p>}
    </div>
  );
}

function Pill({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all disabled:opacity-60 ${
        on ? "bg-blue-500/25 border-blue-400/40 text-white" : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
      }`}
    >
      {on && <Check className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export default function DiscoverSettings() {
  const { uid, settings: profile, loading, canEdit, save, remove } = useDiscoverSettings();
  const { feed } = useDiscoverFeed();
  const { families } = useSystemDiscover();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [feedNames, setFeedNames] = useState<string[]>([]);
  const [requests, setRequests] = useState<FeedRequest[]>([]);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedCompany, setFeedCompany] = useState("");
  const [feedError, setFeedError] = useState("");

  const addToast = useCallback((message: string, type: ToastMessage["type"] = "success") => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  }, []);

  // Start from the saved profile (or defaults), then apply ?preset= from onboarding once.
  useEffect(() => {
    if (loading || draft) return;
    let start = profile ?? DEFAULT_SETTINGS;
    const preset = PRESETS.find((p) => p.id === params.get("preset"));
    if (preset) {
      start = applyPreset(start, preset);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
    setDraft(start);
  }, [loading, profile, draft, params, setParams]);

  // Company autocomplete: shared feeds plus companies already in this user's matches.
  useEffect(
    () =>
      onSnapshot(
        refs.feeds(),
        (snap) =>
          setFeedNames(snap.docs.map((d) => d.data().company).filter((c): c is string => typeof c === "string")),
        (e) => console.error("company suggestions:", e),
      ),
    [],
  );
  const companyNames = useMemo(
    () => [...new Set([...feedNames, ...(feed?.cards ?? []).map((c) => c.company)])].sort((a, b) => a.localeCompare(b)),
    [feedNames, feed],
  );

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(refs.feedRequests(uid), orderBy("createdAt", "desc")),
      (snap) =>
        setRequests(
          snap.docs.map((d) => {
            const r = d.data();
            return {
              id: d.id,
              company: typeof r.company === "string" ? r.company : "",
              url: typeof r.url === "string" ? r.url : "",
              status: r.status === "added" || r.status === "rejected" ? r.status : "pending",
              reason: typeof r.reason === "string" ? r.reason : undefined,
              createdAt: toDate(r.createdAt),
            } satisfies FeedRequest;
          }),
        ),
      (err) => console.error("feedRequests listener:", err),
    );
  }, [uid]);

  const dirty = useMemo(
    () => !!draft && JSON.stringify(draft) !== JSON.stringify(profile ?? null),
    [draft, profile],
  );
  const termOptions = useMemo(() => (draft ? upcomingTerms(draft.graduation) : []), [draft]);

  if (loading || !draft) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  const set = (patch: Partial<Settings>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const webhookOk = validWebhook(draft.alerts.webhook.trim());

  const handleGraduation = (value: string) => {
    const hadNoTerms = !draft.terms.available.length && !draft.terms.partTime.length;
    set({ graduation: value, ...(hadNoTerms && value ? { terms: suggestedTerms(value) } : {}) });
  };

  const handleSave = async () => {
    if (!webhookOk) {
      addToast("That alert link isn't a Discord webhook or ntfy.sh topic.", "error");
      return;
    }
    if (!draft.roleFamilies.length && !draft.includeKeywords.length) {
      addToast("Pick at least one kind of role (or add a keyword) so Discover knows what to find.", "warning");
      return;
    }
    setSaving(true);
    try {
      await save({ ...draft, alerts: { ...draft.alerts, webhook: draft.alerts.webhook.trim() } });
      addToast(`Saved. Changes apply on the next refresh (${REFRESH_TIMES}).`);
    } catch (e) {
      console.error(e);
      addToast("Couldn't save your settings. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!uid || !profile) return;
    if (!window.confirm("Delete your Discover data? Your settings, matches and careers-page requests are removed. Jobs you saved to your pipeline stay.")) return;
    try {
      await remove();
      setDraft(DEFAULT_SETTINGS);
      addToast("Deleted.");
    } catch (e) {
      console.error(e);
      addToast("Couldn't delete your settings. Try again.", "error");
    }
  };

  const handleFeedRequest = async () => {
    const url = feedUrl.trim();
    const problem = feedUrlProblem(url);
    if (problem) {
      setFeedError(problem);
      return;
    }
    const added = requests.filter((r) => r.status !== "rejected").length;
    if (added >= LIMITS.feedsPerUser) {
      setFeedError(`You can add up to ${LIMITS.feedsPerUser} company feeds.`);
      return;
    }
    try {
      if (!uid) return;
      await addDoc(refs.feedRequests(uid), {
        company: feedCompany.trim().slice(0, LIMITS.text),
        url: url.slice(0, 500),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setFeedUrl("");
      setFeedCompany("");
      setFeedError("");
      addToast("Request sent. It's checked on the next refresh.");
    } catch (e) {
      console.error(e);
      setFeedError("Couldn't send that request. Try again.");
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 h-full flex flex-col max-w-[1100px] mx-auto overflow-y-auto scrollbar-theme w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <Link to="/discover" className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Discover
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <SlidersHorizontal className="w-7 h-7" />
            Tune matches
          </h1>
          <p className="text-white mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium">
            Tell Discover what to look for. Matches refresh at {REFRESH_TIMES}.
          </p>
        </div>
        <Pill on={draft.enabled} onClick={() => set({ enabled: !draft.enabled })} disabled={!canEdit}>
          {draft.enabled ? "Discover is on" : "Discover is off"}
        </Pill>
      </div>

      {!canEdit && (
        <div className="premium-glass rounded-2xl border border-amber-400/20 p-4 mb-5 text-sm text-amber-200">
          You're viewing someone else's settings. Only they can change them.
        </div>
      )}

      <fieldset disabled={!canEdit} className="space-y-4 sm:space-y-5 pb-24">
        <Section icon={<Sparkles className="w-4 h-4 text-blue-300" />} title="Start from a preset" hint="Sets the kinds of roles below. You can adjust everything after.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESETS.map((p) => {
              const active =
                JSON.stringify([...p.roleFamilies].sort()) === JSON.stringify([...draft.roleFamilies].sort()) &&
                JSON.stringify(p.tracks) === JSON.stringify(draft.tracks);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDraft(applyPreset(draft, p))}
                  className={`text-left rounded-2xl p-4 border transition-all ${
                    active ? "bg-blue-500/20 border-blue-400/40" : "bg-black/20 border-white/5 hover:bg-white/5"
                  }`}
                >
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    {active && <Check className="w-4 h-4 text-blue-300" />}
                    {p.label}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">{p.description}</p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={<Briefcase className="w-4 h-4 text-blue-300" />} title="What">
          <Field label="Looking for">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["intern", "Internships"],
                  ["newgrad", "New-grad roles"],
                ] as [Track, string][]
              ).map(([t, label]) => (
                <Pill
                  key={t}
                  on={draft.tracks.includes(t)}
                  onClick={() => {
                    const next = toggleIn(draft.tracks, t);
                    if (next.length) set({ tracks: next });
                  }}
                >
                  {label}
                </Pill>
              ))}
            </div>
          </Field>
          <Field label="Kinds of roles" hint="Titles in the families you pick score highest; related families score a little lower.">
            <div className="flex flex-wrap gap-2">
              {families.map((f) => (
                <Pill key={f.id} on={draft.roleFamilies.includes(f.id)} onClick={() => set({ roleFamilies: toggleIn(draft.roleFamilies, f.id) })}>
                  {f.label}
                </Pill>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Include keywords" hint="Titles with these words count as a top match.">
              <ChipInput
                values={draft.includeKeywords}
                onChange={(v) => set({ includeKeywords: v })}
                placeholder="e.g. Rust, robotics"
                max={LIMITS.keywords}
              />
            </Field>
            <Field label="Exclude keywords" hint="Titles with these words are never shown.">
              <ChipInput
                values={draft.excludeKeywords}
                onChange={(v) => set({ excludeKeywords: v })}
                placeholder="e.g. sales, automotive"
                max={LIMITS.keywords}
              />
            </Field>
          </div>
        </Section>

        <Section icon={<CalendarDays className="w-4 h-4 text-blue-300" />} title="When">
          <Field label="Graduation month" hint="Used to check new-grad start dates and graduation requirements.">
            <input
              type="month"
              value={draft.graduation}
              min="2024-01"
              max="2035-12"
              onChange={(e) => handleGraduation(e.target.value)}
              className={`${inputCls} max-w-xs`}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Available for internships" hint="Internships in other terms are hidden.">
              <ChipInput
                values={draft.terms.available}
                onChange={(v) => set({ terms: { ...draft.terms, available: v } })}
                placeholder="e.g. Summer 2027"
                suggestions={termOptions}
                showSuggestions
                max={LIMITS.terms}
                validate={(v) => (TERM_RE.test(v) ? null : 'Use a term like "Summer 2027".')}
              />
            </Field>
            <Field label="Part-time only" hint="Terms you could only work part-time (for example, a final semester).">
              <ChipInput
                values={draft.terms.partTime}
                onChange={(v) => set({ terms: { ...draft.terms, partTime: v } })}
                placeholder="e.g. Fall 2027"
                suggestions={termOptions.filter((t) => !draft.terms.available.includes(t))}
                showSuggestions
                max={LIMITS.terms}
                validate={(v) => (TERM_RE.test(v) ? null : 'Use a term like "Fall 2027".')}
              />
            </Field>
          </div>
        </Section>

        <Section icon={<MapPin className="w-4 h-4 text-blue-300" />} title="Where">
          <Field label="Preferred locations" hint='Cities or states, like "Phoenix, AZ" or "Texas". Other U.S. roles still show, ranked a bit lower.'>
            <ChipInput
              values={draft.locations.preferred}
              onChange={(v) => set({ locations: { ...draft.locations, preferred: v } })}
              placeholder="Add a city or state"
              max={LIMITS.locations}
            />
          </Field>
          <Pill on={draft.locations.remoteOk} onClick={() => set({ locations: { ...draft.locations, remoteOk: !draft.locations.remoteOk } })}>
            Remote roles are fine
          </Pill>
        </Section>

        <Section icon={<ShieldCheck className="w-4 h-4 text-blue-300" />} title="Work authorization">
          <Field label="Will you need visa sponsorship now or in the future?">
            <div className="flex flex-wrap gap-2">
              <Pill on={draft.needsSponsorship} onClick={() => set({ needsSponsorship: true })}>
                Yes
              </Pill>
              <Pill on={!draft.needsSponsorship} onClick={() => set({ needsSponsorship: false })}>
                No
              </Pill>
            </div>
          </Field>
          <p className="text-xs text-slate-300 -mt-2">
            This only controls screening: with "Yes", roles that require U.S. citizenship or rule out sponsorship are
            ranked down or hidden. With "No", those requirements are shown as notes. {APP_NAME} stores only this yes/no
            answer, never your visa type or status.
          </p>
        </Section>

        <Section icon={<Building2 className="w-4 h-4 text-blue-300" />} title="Companies">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Warm leads" hint="You know someone there. Ranked highest.">
              <ChipInput values={draft.companies.warm} onChange={(v) => set({ companies: { ...draft.companies, warm: v } })} placeholder="Add a company" suggestions={companyNames} max={LIMITS.companies} />
            </Field>
            <Field label="Targets" hint="Companies you'd like to work for.">
              <ChipInput values={draft.companies.target} onChange={(v) => set({ companies: { ...draft.companies, target: v } })} placeholder="Add a company" suggestions={companyNames} max={LIMITS.companies} />
            </Field>
            <Field label="Hidden" hint="Never shown.">
              <ChipInput values={draft.companies.hidden} onChange={(v) => set({ companies: { ...draft.companies, hidden: v } })} placeholder="Add a company" suggestions={companyNames} max={LIMITS.companies} />
            </Field>
          </div>

          <div className="pt-4 border-t border-white/5">
            <Field
              label="Add a careers page"
              hint={`Paste a Workday, Greenhouse, Lever, Ashby or SmartRecruiters link. Once it checks out, every ${APP_NAME} user gets roles from it.`}
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={feedUrl}
                  onChange={(e) => {
                    setFeedUrl(e.target.value);
                    setFeedError("");
                  }}
                  placeholder="https://jobs.lever.co/company"
                  maxLength={500}
                  className={`${inputCls} flex-[2]`}
                />
                <input
                  type="text"
                  value={feedCompany}
                  onChange={(e) => setFeedCompany(e.target.value)}
                  placeholder="Company name"
                  maxLength={LIMITS.text}
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleFeedRequest}
                  disabled={!feedUrl.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4" />
                  Add
                </button>
              </div>
            </Field>
            {feedError && <p className="text-[11px] font-semibold text-amber-300 mt-1.5 px-1">{feedError}</p>}
            {requests.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {requests.slice(0, 10).map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs bg-black/20 border border-white/5 rounded-xl px-3 py-2">
                    {r.status === "added" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    ) : r.status === "rejected" ? (
                      <X className="w-3.5 h-3.5 text-red-300 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className="font-semibold text-white truncate">{r.company || r.url}</span>
                    <span className="text-slate-400 ml-auto shrink-0">
                      {r.status === "pending" ? "Checked on the next refresh" : r.status === "added" ? r.reason || "Added" : r.reason || "Not added"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section icon={<BellRing className="w-4 h-4 text-blue-300" />} title="Matching & alerts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label={`Show roles scoring ${draft.minScore}+`} hint="Lower shows more roles; higher shows only strong fits.">
              <input
                type="range"
                min={40}
                max={90}
                step={5}
                value={draft.minScore}
                onChange={(e) => set({ minScore: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </Field>
            <Field label={`Alert me at ${draft.alerts.minScore}+`} hint="New roles at or above this score go to your alert link.">
              <input
                type="range"
                min={40}
                max={100}
                step={5}
                value={draft.alerts.minScore}
                onChange={(e) => set({ alerts: { ...draft.alerts, minScore: Number(e.target.value) } })}
                className="w-full accent-blue-500"
              />
            </Field>
          </div>
          <Field label="Alert link (optional)" hint="A Discord webhook URL or an ntfy.sh topic URL, like https://ntfy.sh/your-topic.">
            <input
              type="url"
              value={draft.alerts.webhook}
              onChange={(e) => set({ alerts: { ...draft.alerts, webhook: e.target.value } })}
              placeholder="https://discord.com/api/webhooks/..."
              maxLength={300}
              className={`${inputCls} ${webhookOk ? "" : "ring-2 ring-amber-400/40"}`}
            />
          </Field>
        </Section>

        {canEdit && profile && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-1">
            <p className="text-xs text-slate-400 flex-1">
              Deleting removes your settings, Discover matches and careers-page requests now. Jobs you saved to your
              pipeline stay.
            </p>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete my Discover data
            </button>
          </div>
        )}
      </fieldset>

      {canEdit && (
        <div className="sticky bottom-0 -mx-3 sm:mx-0 mt-auto p-3 sm:p-0 sm:pb-4">
          <div className="premium-glass-heavy rounded-2xl border border-white/10 p-3 flex items-center gap-3">
            <p className="text-xs text-slate-300 flex-1">
              {!profile ? "Save to turn on Discover." : dirty ? "You have unsaved changes." : "All changes saved."}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (!dirty && !!profile)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
