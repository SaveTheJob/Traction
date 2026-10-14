import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { DiscoveryProfile, RoleFamily } from "../lib/discover";
import { FALLBACK_FAMILIES, normalizeProfile } from "../lib/discover";
import { db } from "../lib/firebase";
import { useEffectiveUserId } from "./useEffectiveUserId";

/**
 * Live `discoveryProfiles/{uid}` for the effective user, plus a save that writes the
 * whole document (the rules validate the full shape). Saving is only allowed for the
 * signed-in user's own profile, so admins viewing as someone else get a read-only view.
 */
export function useDiscoveryProfile() {
  const { user } = useAuth();
  const uid = useEffectiveUserId();
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    return onSnapshot(
      doc(db, "discoveryProfiles", uid),
      (snap) => {
        setProfile(snap.exists() ? normalizeProfile(snap.data()) : null);
        setLoading(false);
      },
      (err) => {
        console.error("discoveryProfiles listener:", err);
        setLoading(false);
      },
    );
  }, [uid]);

  const canEdit = !!user && !!uid && user.uid === uid;

  const save = useCallback(
    async (next: DiscoveryProfile) => {
      if (!canEdit || !uid) throw new Error("You can only change your own Discover settings.");
      await setDoc(doc(db, "discoveryProfiles", uid), { ...next, updatedAt: serverTimestamp() });
    },
    [canEdit, uid],
  );

  return { uid, profile, loading, canEdit, isImpersonating: !!user && !!uid && user.uid !== uid, save };
}

export interface CollectorMeta {
  families: RoleFamily[];
  inviteOnly: boolean;
}

/** Role-family labels and beta status published by the collector. */
export function useCollectorMeta(): CollectorMeta {
  const [meta, setMeta] = useState<CollectorMeta>({ families: FALLBACK_FAMILIES, inviteOnly: false });
  useEffect(
    () =>
      onSnapshot(
        doc(db, "collectorMeta", "roleFamilies"),
        (snap) => {
          const d = snap.data();
          const families = Array.isArray(d?.families)
            ? (d.families as RoleFamily[]).filter((f) => f && typeof f.id === "string" && typeof f.label === "string")
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
