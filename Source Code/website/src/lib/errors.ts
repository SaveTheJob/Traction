/** User-facing text for a failed job write. */
export function jobsErrorMessage(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  return code === "permission-denied"
    ? "Your device clock looks off; check your time settings and try again."
    : "Couldn't save. Try again.";
}

/** User-facing text for a failed contact write. */
export function contactsErrorMessage(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  return code === "permission-denied"
    ? "Couldn't save. Verify your email and check your device clock, then try again."
    : "Couldn't save. Try again.";
}
