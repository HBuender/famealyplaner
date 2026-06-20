import { auth } from "./auth";
import { allowlist, isAllowedEmail } from "./allowlist";

/** Thrown by requireHouseholdSession when the caller is not an allowed user. */
export class AuthorizationError extends Error {
  constructor() {
    super("Not authorized");
    this.name = "AuthorizationError";
  }
}

/**
 * Server-only guard: every Server Action calls this first. It asserts a valid
 * session whose email is STILL in the current allowlist — re-checking the
 * allowlist, not just decoding the JWT, because a removed email's token stays
 * valid until expiry. Defense-in-depth alongside middleware.
 */
export async function requireHouseholdSession() {
  const session = await auth();
  if (!isAllowedEmail(session?.user?.email, allowlist())) {
    throw new AuthorizationError();
  }
  return session;
}
