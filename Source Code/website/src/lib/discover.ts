/**
 * Discover model shared by the Discover page, Tune matches and onboarding.
 * Mirrors `users/{uid}/discover/{settings,feed,triage}` (see the rules in
 * firestore.rules, which enforce the same limits on settings).
 */

import { toDate } from "./db";

export type Track = "intern" | "newgrad";

export interface DiscoverSettings {
  enabled: boolean;
  tracks: Track[];
  /** "YYYY-MM" or "" */
  graduation: string;
  terms: { available: string[]; partTime: string[] };
  /** The only work-authorization field. Never store visa type or status. */
  needsSponsorship: boolean;
  locations: { preferred: string[]; remoteOk: boolean };
  roleFamilies: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  companies: { warm: string[]; target: string[]; hidden: string[] };
  minScore: number;
  alerts: { webhook: string; minScore: number };
}

export interface RoleFamily {
  id: string;
  label: string;
}

export type Tier = "core" | "strong" | "ok";

/** One role in `discover/feed.cards`, written by the collector. */
export interface DiscoverCard {
  roleKey: string;
  company: string;
  title: string;
  location: string;
  url: string;
  track: Track;
  terms: string[];
  postedAt: Date | null;
  firstSeenAt: Date | null;
  score: number;
  tier: Tier;
  reasons: string[];
  flags: { citizen: boolean; exportControl: boolean; noSponsor: boolean; sponsorFriendly: boolean; screened: boolean };
  snippets: string[];
  gradWindow: string;
  closed: boolean;
}

export interface DiscoverFeed {
  refreshedAt: Date | null;
  totalMatches: number;
  cap: number;
  failedSources: number;
  cards: DiscoverCard[];
}

export interface TriageEntry {
  status: "saved" | "dismissed";
  jobId?: string;
  at: Date | null;
}

export type CardStatus = "new" | "saved" | "dismissed";
export type CardView = DiscoverCard & { status: CardStatus; jobId?: string };

/** A card merged with the user's triage mark; untouched cards are "new". */
export function cardView(card: DiscoverCard, triage: Record<string, TriageEntry>): CardView {
  const t = triage[card.roleKey];
  return { ...card, status: t?.status ?? "new", ...(t?.jobId ? { jobId: t.jobId } : {}) };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function cardFromRaw(r: Record<string, unknown>): DiscoverCard | null {
  if (typeof r.roleKey !== "string" || !r.roleKey) return null;
  const f = (r.flags ?? {}) as Record<string, unknown>;
  return {
    roleKey: r.roleKey,
    company: str(r.company),
    title: str(r.title),
    location: str(r.location),
    url: str(r.url),
    track: r.track === "newgrad" ? "newgrad" : "intern",
    terms: strs(r.terms),
    postedAt: toDate(r.postedAt),
    firstSeenAt: toDate(r.firstSeenAt),
    score: num(r.score),
    tier: r.tier === "core" || r.tier === "strong" ? r.tier : "ok",
    reasons: strs(r.reasons),
    flags: {
      citizen: f.citizen === true,
      exportControl: f.exportControl === true,
      noSponsor: f.noSponsor === true,
      sponsorFriendly: f.sponsorFriendly === true,
      screened: f.screened === true,
    },
    snippets: strs(r.snippets),
    gradWindow: str(r.gradWindow),
    closed: r.closed === true,
  };
}

/** Read `discover/feed` data; malformed cards are skipped. */
export function feedFromDoc(d: Record<string, unknown> | undefined): DiscoverFeed | null {
  if (!d) return null;
  const cards = Array.isArray(d.cards)
    ? d.cards.map((c) => cardFromRaw((c ?? {}) as Record<string, unknown>)).filter((c): c is DiscoverCard => !!c)
    : [];
  return {
    refreshedAt: toDate(d.refreshedAt),
    totalMatches: num(d.totalMatches),
    cap: num(d.cap),
    failedSources: num(d.failedSources),
    cards,
  };
}

export const LIMITS = {
  keywords: 50,
  locations: 50,
  companies: 100,
  terms: 12,
  text: 80,
  feedsPerUser: 20,
};

/** When the collector refreshes (its systemd timer runs on Phoenix time). */
export const REFRESH_TIMES = "6:40 and 14:40 Phoenix time";

/** Used until the collector has published `system/discover`. */
export const FALLBACK_FAMILIES: RoleFamily[] = [
  { id: "embedded", label: "Embedded & firmware" },
  { id: "hardware", label: "Hardware, silicon & test" },
  { id: "software", label: "Software engineering" },
  { id: "infra", label: "DevOps, SRE & cloud" },
  { id: "security", label: "Security" },
  { id: "data_ml", label: "Data & ML" },
  { id: "mobile_web", label: "Mobile & web" },
  { id: "it_support", label: "IT & support" },
  { id: "product", label: "Product & program management" },
  { id: "quant", label: "Quant & trading" },
];

export const DEFAULT_SETTINGS: DiscoverSettings = {
  enabled: true,
  tracks: ["intern", "newgrad"],
  graduation: "",
  terms: { available: [], partTime: [] },
  needsSponsorship: false,
  locations: { preferred: [], remoteOk: true },
  roleFamilies: [],
  includeKeywords: [],
  excludeKeywords: [],
  companies: { warm: [], target: [], hidden: [] },
  minScore: 60,
  alerts: { webhook: "", minScore: 70 },
};

export interface Preset {
  id: string;
  label: string;
  description: string;
  tracks: Track[];
  roleFamilies: string[];
}

export const PRESETS: Preset[] = [
  {
    id: "embedded-intern",
    label: "Embedded & hardware intern",
    description: "Firmware, FPGA, silicon, validation and test internships",
    tracks: ["intern"],
    roleFamilies: ["embedded", "hardware"],
  },
  {
    id: "software-intern",
    label: "Software intern",
    description: "SWE, backend, full-stack, mobile and platform internships",
    tracks: ["intern"],
    roleFamilies: ["software", "infra", "mobile_web"],
  },
  {
    id: "software-newgrad",
    label: "Software new grad",
    description: "Entry-level and new-grad software roles",
    tracks: ["newgrad"],
    roleFamilies: ["software", "infra", "mobile_web"],
  },
  {
    id: "data-ml-intern",
    label: "Data & ML intern",
    description: "Data science, ML engineering and analytics internships",
    tracks: ["intern"],
    roleFamilies: ["data_ml", "software"],
  },
];

export function applyPreset(p: DiscoverSettings, preset: Preset): DiscoverSettings {
  return { ...p, tracks: [...preset.tracks], roleFamilies: [...preset.roleFamilies] };
}

const strList = (v: unknown, cap: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .map((x) => x.trim().slice(0, LIMITS.text))
        .slice(0, cap)
    : [];

const clamp = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;

/** Fill in defaults and clamp stored settings so the UI can rely on every field. */
export function normalizeSettings(raw: Record<string, unknown> | undefined): DiscoverSettings {
  const d = raw ?? {};
  const terms = (d.terms ?? {}) as Record<string, unknown>;
  const locs = (d.locations ?? {}) as Record<string, unknown>;
  const cos = (d.companies ?? {}) as Record<string, unknown>;
  const alerts = (d.alerts ?? {}) as Record<string, unknown>;
  const tracks = strList(d.tracks, 2).filter((t): t is Track => t === "intern" || t === "newgrad");
  const grad = typeof d.graduation === "string" && /^20\d\d-(0[1-9]|1[0-2])$/.test(d.graduation) ? d.graduation : "";
  return {
    enabled: typeof d.enabled === "boolean" ? d.enabled : true,
    tracks: tracks.length ? tracks : ["intern", "newgrad"],
    graduation: grad,
    terms: { available: strList(terms.available, LIMITS.terms), partTime: strList(terms.partTime, LIMITS.terms) },
    needsSponsorship: d.needsSponsorship === true,
    locations: {
      preferred: strList(locs.preferred, LIMITS.locations),
      remoteOk: typeof locs.remoteOk === "boolean" ? locs.remoteOk : true,
    },
    roleFamilies: strList(d.roleFamilies, 20),
    includeKeywords: strList(d.includeKeywords, LIMITS.keywords),
    excludeKeywords: strList(d.excludeKeywords, LIMITS.keywords),
    companies: {
      warm: strList(cos.warm, LIMITS.companies),
      target: strList(cos.target, LIMITS.companies),
      hidden: strList(cos.hidden, LIMITS.companies),
    },
    minScore: clamp(d.minScore, 40, 90, 60),
    alerts: {
      webhook: typeof alerts.webhook === "string" && validWebhook(alerts.webhook) ? alerts.webhook : "",
      minScore: clamp(alerts.minScore, 40, 100, 70),
    },
  };
}

// Same patterns as firestore.rules and the collector: the server only ever posts to these.
const WEBHOOK_PATTERNS = [
  /^https:\/\/((ptb|canary)\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/,
  /^https:\/\/ntfy\.sh\/[A-Za-z0-9_-]{1,64}$/,
];

export function validWebhook(url: string): boolean {
  return url === "" || WEBHOOK_PATTERNS.some((rx) => rx.test(url));
}

// Hosts the collector accepts for "Add a careers page" (it re-checks them server-side).
const FEED_HOSTS = [
  /^[a-z0-9-]+(\.wd\d+)?\.myworkdayjobs\.com$/,
  /^wd\d+\.myworkdaysite\.com$/,
  /^(boards|job-boards)\.greenhouse\.io$/,
  /^jobs\.(eu\.)?lever\.co$/,
  /^jobs\.ashbyhq\.com$/,
  /^jobs\.smartrecruiters\.com$/,
];

export function feedUrlProblem(url: string): string | null {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return "That doesn't look like a link.";
  }
  if (!FEED_HOSTS.some((rx) => rx.test(u.hostname.toLowerCase()))) {
    return "Only Workday, Greenhouse, Lever, Ashby and SmartRecruiters career pages are supported.";
  }
  return null;
}

const SEASONS = ["Spring", "Summer", "Fall"] as const;
const SEASON_END_MONTH = { Spring: 5, Summer: 8, Fall: 12 } as const;

/** Terms from now through graduation, for chip suggestions ("Summer 2027", ...). */
export function upcomingTerms(graduation: string, now = new Date()): string[] {
  const m = /^(\d{4})-(\d{2})$/.exec(graduation);
  const lastYear = m ? Number(m[1]) : now.getFullYear() + 2;
  const lastMonth = m ? Number(m[2]) : 12;
  const out: string[] = [];
  for (let y = now.getFullYear(); y <= lastYear; y++) {
    for (const s of SEASONS) {
      const end = SEASON_END_MONTH[s];
      if (y === now.getFullYear() && end <= now.getMonth() + 1) continue;
      if (y === lastYear && end > lastMonth + 1) continue;
      out.push(`${s} ${y}`);
    }
  }
  return out;
}

/** Sensible defaults once a graduation month is known: summers before it are internship terms,
 * the final semester is part-time. */
export function suggestedTerms(graduation: string, now = new Date()): DiscoverSettings["terms"] {
  const terms = upcomingTerms(graduation, now);
  const summers = terms.filter((t) => t.startsWith("Summer"));
  const last = terms[terms.length - 1];
  return {
    available: summers.slice(0, 2),
    partTime: last && !last.startsWith("Summer") ? [last] : [],
  };
}

// ── Matching helpers (literal text, like the collector) ────────────────────

const STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
};
const CODES = Object.fromEntries(Object.entries(STATES).map(([c, n]) => [n.toLowerCase(), c]));

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive literal matcher; null when there's nothing to match. */
export function literalMatcher(words: string[]): RegExp | null {
  const parts = words.map((w) => w.trim()).filter(Boolean).map(escapeRx);
  return parts.length ? new RegExp(`(?<!\\w)(${parts.join("|")})(?!\\w)`, "i") : null;
}

/** Same expansion the collector uses: "Phoenix, AZ" matches Phoenix, Arizona and AZ (case-sensitive). */
export function locationMatcher(preferred: string[]): (location: string) => boolean {
  const places: string[] = [];
  const codes: string[] = [];
  for (const pref of preferred) {
    for (const raw of pref.split(",")) {
      const part = raw.trim();
      if (!part) continue;
      if (STATES[part.toUpperCase()]) {
        codes.push(part.toUpperCase());
        places.push(STATES[part.toUpperCase()]);
      } else {
        places.push(part);
        if (CODES[part.toLowerCase()]) codes.push(CODES[part.toLowerCase()]);
      }
    }
  }
  const placeRx = literalMatcher(places);
  const codeRx = codes.length ? new RegExp(`(?<![A-Za-z])(${codes.join("|")})(?![A-Za-z])`) : null;
  return (loc: string) => !!loc && (!!placeRx?.test(loc) || !!codeRx?.test(loc));
}
