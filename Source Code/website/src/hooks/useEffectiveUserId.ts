import { useAuth } from "../context/AuthContext";

/**
 * Returns the effective user ID, accounting for admin impersonation.
 * When an admin is impersonating another user, returns the impersonated user's UID.
 * Otherwise returns the authenticated user's UID.
 *
 * Returns undefined until a password sign-up verifies its email: the rules deny the
 * subcollections until then, and Firestore never retries a denied listener. The uid
 * appearing after verification is what starts the listeners.
 */
export function useEffectiveUserId(): string | undefined {
  const { user, isAdmin, impersonatedUser, needsVerification } = useAuth();
  if (needsVerification) return undefined;
  return isAdmin && impersonatedUser ? impersonatedUser.uid : user?.uid;
}
