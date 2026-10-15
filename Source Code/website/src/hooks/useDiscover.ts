import {
  FieldPath,
  deleteDoc,
  deleteField,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { refs, toDate } from "../lib/db";
import type { DiscoverFeed, DiscoverSettings, RoleFamily, TriageEntry } from "../lib/discover";
import { FALLBACK_FAMILIES, feedFromDoc, normalizeSettings } from "../lib/discover";
import { useEffectiveUserId } from "./useEffectiveUserId";

const OWN_ONLY = "You can only change your own Discover settings.";

/** True when the signed-in user is the effective user (admins viewing as someone else are read-only). */
function useCanEdit() {
  const { user } = useAuth();
  const uid = useEffectiveUserId();
  const canEdit = !!user && !!uid && user.uid === uid;
  return { uid, canEdit, isImpersonating: !!user && !!uid && user.uid !== uid };
}

/**
 * Live `users/{uid}/discover/settings` for the effective user, plus a save that writes the
 * whole document (the rules validate the full shape).
 */
export function useDiscoverSettings() {
  const { uid, canEdit, isImpersonating } = useCanEdit();
  const [settings, setSettings] = useState<DiscoverSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
    setLoading(true);
    return onSnapshot(
      refs.discoverSettings(uid),
      (snap) => {
        setSettings(snap.exists() ? normalizeSettings(snap.data()) : null);
        setLoading(false);
      },
      (err) => {
        console.error("discover settings listener:", err);
        setLoading(false);
      },
    );
  }, [uid]);

  const save = useCallback(
    async (next: DiscoverSettings) => {
      if (!canEdit || !uid) throw new Error(OWN_ONLY);
      await setDoc(refs.discoverSettings(uid), { ...next, updatedAt: serverTimestamp() });
    },
    [canEdit, uid],
  );

  /** Deletes settings, feed, triage and every careers-page request. Saved jobs stay. */
  const remove = useCallback(async () => {
    if (!canEdit || !uid) throw new Error(OWN_ONLY);
    await deleteDoc(refs.discoverSettings(uid));
    await deleteDoc(refs.discoverFeed(uid));
    await deleteDoc(refs.discoverTriage(uid));
    const reqs = await getDocs(refs.feedRequests(uid));
    await Promise.all(reqs.docs.map((d) => deleteDoc(d.ref)));
  }, [canEdit, uid]);

  return { uid, settings, loading, canEdit, isImpersonating, save, remove };
}

/** Live `discover/feed`: the cards the collector wrote for this user. */
export function useDiscoverFeed() {
  const uid = useEffectiveUserId();
  const [feed, setFeed] = useState<DiscoverFeed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
    setLoading(true);
    return onSnapshot(
      refs.discoverFeed(uid),
      (snap) => {
        setFeed(snap.exists() ? feedFromDoc(snap.data()) : null);
        setLoading(false);
      },
      (err) => {
        console.error("discover feed listener:", err);
        setLoading(false);
      },
    );
  }, [uid]);

  return { feed, loading };
}

/** Live `discover/triage`. Each write adds, changes or removes exactly one card mark. */
export function useTriage() {
  const { uid, canEdit } = useCanEdit();
  const [triage, setTriage] = useState<Record<string, TriageEntry>>({});

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      refs.discoverTriage(uid),
      (snap) => {
        const cards = (snap.data()?.cards ?? {}) as Record<string, Record<string, unknown>>;
        const out: Record<string, TriageEntry> = {};
        for (const [key, v] of Object.entries(cards)) {
          if (v?.status !== "saved" && v?.status !== "dismissed") continue;
          out[key] = {
            status: v.status,
            ...(typeof v.jobId === "string" ? { jobId: v.jobId } : {}),
            at: toDate(v.at),
          };
        }
        setTriage(out);
      },
      (err) => console.error("discover triage listener:", err),
    );
  }, [uid]);

  /** `null` removes the mark (restore). */
  const setStatus = useCallback(
    async (key: string, entry: Pick<TriageEntry, "status" | "jobId"> | null) => {
      if (!canEdit || !uid) throw new Error(OWN_ONLY);
      const ref = refs.discoverTriage(uid);
      if (entry) {
        await setDoc(
          ref,
          {
            cards: { [key]: { status: entry.status, ...(entry.jobId ? { jobId: entry.jobId } : {}), at: serverTimestamp() } },
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        await updateDoc(ref, new FieldPath("cards", key), deleteField(), "updatedAt", serverTimestamp());
      }
    },
    [canEdit, uid],
  );

  return { triage, setStatus, canEdit };
}

export interface SystemDiscover {
  families: RoleFamily[];
  inviteOnly: boolean;
}

/** Role-family labels and beta status published by the collector in `system/discover`. */
export function useSystemDiscover(): SystemDiscover {
  const [meta, setMeta] = useState<SystemDiscover>({ families: FALLBACK_FAMILIES, inviteOnly: false });
  useEffect(
    () =>
      onSnapshot(
        refs.systemDiscover(),
        (snap) => {
          const d = snap.data();
          const families = Array.isArray(d?.roleFamilies)
            ? (d.roleFamilies as RoleFamily[]).filter((f) => f && typeof f.id === "string" && typeof f.label === "string")
            : [];
          setMeta({
            families: families.length ? families : FALLBACK_FAMILIES,
            inviteOnly: d?.inviteOnly === true,
          });
        },
        () => undefined,
      ),
    [],
  );
  return meta;
}
