/* eslint-disable react-refresh/only-export-components -- context file intentionally exports its provider and consumer hook together */
import type { User } from "firebase/auth";
import {
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
} from "firebase/auth";
import { getDoc, onSnapshot, setDoc } from "firebase/firestore";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { recordAdminLog } from "../lib/adminLogger";
import { ensureVerifiedToken } from "../lib/authToken";
import { accountFromDoc, newAccountDoc, refs } from "../lib/db";
import type { Account } from "../lib/db";
import { auth } from "../lib/firebase";

export type { Account };

// Firebase Auth UIDs that may open the admin portal. This only shows the portal;
// firestore.rules (isAdmin) is what actually grants access, so keep the two in sync.
const ADMIN_UIDS = new Set(
  (import.meta.env.VITE_ADMIN_UIDS ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean),
);

interface AuthContextType {
  user: User | null;
  account: Account | null;
  impersonatedUser: Account | null;
  isAdmin: boolean;
  loading: boolean;
  /** Password sign-up whose email link hasn't been opened yet. */
  needsVerification: boolean;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  impersonateUser: (user: Account | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  account: null,
  impersonatedUser: null,
  isAdmin: false,
  loading: true,
  needsVerification: false,
  signOut: async () => {},
  updatePassword: async () => {},
  impersonateUser: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  // emailVerified as of the last time the ID token was known to match it. reload() flips
  // user.emailVerified in place before the token is refreshed, so the app reads this instead.
  const [emailVerified, setEmailVerified] = useState(false);
  const unsubAccount = useRef<(() => void) | null>(null);
  // Bumped on every auth change, so an older callback still awaiting knows it was superseded.
  const authGen = useRef(0);

  const isAdmin = !!user && ADMIN_UIDS.has(user.uid);
  const needsVerification =
    !!user && !emailVerified && user.providerData.some((p) => p.providerId === "password");

  const impersonateUser = (target: Account | null) => {
    if (!isAdmin) return;
    setImpersonatedUser(target);
    if (target) {
      recordAdminLog("GOD_MODE_ENTRY", target.email || target.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const gen = ++authGen.current;
      unsubAccount.current?.();
      unsubAccount.current = null;

      if (!currentUser) {
        setUser(null);
        setEmailVerified(false);
        setAccount(null);
        setLoading(false);
        return;
      }

      // A later sign-in or sign-out replaced this user while we were awaiting.
      const uid = currentUser.uid;
      const stale = () => gen !== authGen.current || auth.currentUser?.uid !== uid;

      // On load Firebase reloads the user, so emailVerified can be true while the cached token
      // still says false. Refresh it before anything subscribes, or the rules deny every read.
      try {
        await ensureVerifiedToken(currentUser);
      } catch (err) {
        console.error("Error refreshing the ID token:", err);
      }
      if (stale()) return;
      setEmailVerified(currentUser.emailVerified);
      setUser(currentUser);

      try {
        // The account doc may be created before the email is verified.
        const ref = refs.user(uid);
        if (!(await getDoc(ref)).exists()) {
          if (stale()) return;
          await setDoc(ref, newAccountDoc(currentUser));
        }
        if (stale()) return;
        // Live, so `onboarded` flips without a reload. A missing doc (mid account deletion)
        // keeps the last value rather than unmounting the page that is deleting it.
        unsubAccount.current = onSnapshot(
          ref,
          (snap) => {
            if (snap.exists()) setAccount(accountFromDoc(snap.id, snap.data()));
            setLoading(false);
          },
          (err) => {
            console.error("Error loading account:", err);
            setLoading(false);
          },
        );
      } catch (err) {
        console.error("Error loading account:", err);
        if (!stale()) setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubAccount.current?.();
    };
  }, []);

  const signOut = async () => {
    try {
      setImpersonatedUser(null);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error("No user logged in.");
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  /**
   * Re-reads emailVerified and, once it is true, makes sure the ID token's email_verified claim
   * matches. The re-render then flips needsVerification, which starts the data listeners.
   */
  const refreshUser = async () => {
    const current = auth.currentUser;
    if (!current) return;
    await current.reload();
    await ensureVerifiedToken(current);
    if (auth.currentUser === current) setEmailVerified(current.emailVerified);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        impersonatedUser,
        isAdmin,
        loading,
        needsVerification,
        signOut,
        updatePassword,
        impersonateUser,
        refreshUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
