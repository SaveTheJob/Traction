import { useAuth } from "../context/AuthContext";

/**
 * Returns the effective user ID, accounting for admin impersonation.
 * When an admin is impersonating another user, returns the impersonated user's UID.
 * Otherwise returns the authenticated user's UID.
 */
export function useEffectiveUserId(): string | undefined {
  const { user, isAdmin, impersonatedUser } = useAuth();
  return isAdmin && impersonatedUser ? impersonatedUser.uid : user?.uid;
}
