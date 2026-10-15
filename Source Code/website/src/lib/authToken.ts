import type { User } from "firebase/auth";

/** True when the account is verified but the ID token still carries an older email_verified claim. */
export function needsVerifiedTokenRefresh(emailVerified: boolean, claim: unknown): boolean {
  return emailVerified && claim !== true;
}

/**
 * The rules read the token's email_verified claim, and a cached ID token keeps the value it was
 * minted with for up to an hour. Once the user reports verified (after reload()), forces a new
 * token so Firestore requests stop being denied.
 */
export async function ensureVerifiedToken(
  user: Pick<User, "emailVerified" | "getIdTokenResult" | "getIdToken">,
): Promise<void> {
  if (!user.emailVerified) return;
  const { claims } = await user.getIdTokenResult();
  if (needsVerifiedTokenRefresh(user.emailVerified, claims.email_verified)) {
    await user.getIdToken(true);
  }
}
