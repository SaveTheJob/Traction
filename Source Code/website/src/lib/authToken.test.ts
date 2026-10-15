import { describe, expect, it, vi } from "vitest";
import { ensureVerifiedToken, needsVerifiedTokenRefresh } from "./authToken";

function fakeUser(emailVerified: boolean, claim: unknown) {
  return {
    emailVerified,
    getIdTokenResult: vi.fn(async () => ({ claims: { email_verified: claim } })),
    getIdToken: vi.fn(async () => "token"),
  };
}

describe("needsVerifiedTokenRefresh", () => {
  it("refreshes only a verified user whose token claim is not true", () => {
    expect(needsVerifiedTokenRefresh(true, false)).toBe(true);
    expect(needsVerifiedTokenRefresh(true, undefined)).toBe(true);
    expect(needsVerifiedTokenRefresh(true, true)).toBe(false);
    expect(needsVerifiedTokenRefresh(false, false)).toBe(false);
  });
});

describe("ensureVerifiedToken", () => {
  it("forces a new token when the claim is stale", async () => {
    const u = fakeUser(true, false);
    await ensureVerifiedToken(u as never);
    expect(u.getIdToken).toHaveBeenCalledWith(true);
  });
  it("leaves a fresh token alone", async () => {
    const u = fakeUser(true, true);
    await ensureVerifiedToken(u as never);
    expect(u.getIdToken).not.toHaveBeenCalled();
  });
  it("does nothing for an unverified user", async () => {
    const u = fakeUser(false, false);
    await ensureVerifiedToken(u as never);
    expect(u.getIdTokenResult).not.toHaveBeenCalled();
    expect(u.getIdToken).not.toHaveBeenCalled();
  });
});
