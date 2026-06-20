/**
 * The sole access gate (R2): only the two hardcoded adult emails may sign in.
 * Stored in the ALLOWED_EMAILS env var (comma-separated) so it is correctable
 * without a redeploy. Re-checked on every Server Action via
 * requireHouseholdSession — a removed email's JWT stays valid until expiry, so
 * decoding alone is not enough.
 */
export function parseAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(
  email: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

/** Read the current allowlist from the environment. */
export function allowlist(): string[] {
  return parseAllowlist(process.env.ALLOWED_EMAILS);
}
