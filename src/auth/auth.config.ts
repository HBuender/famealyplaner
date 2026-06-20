import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { allowlist, isAllowedEmail } from "./allowlist";

/**
 * Edge-safe Auth.js config: providers + the sign-in allowlist gate. Kept
 * separate from the full config (auth.ts) so middleware can use it without
 * pulling in the Node-only token-refresh logic.
 *
 * A single Google consent grants both login and Calendar read: openid/email/
 * profile + calendar.readonly, with access_type=offline + prompt=consent to
 * guarantee a refresh token on every consent.
 */
export const authConfig = {
  providers: [
    Google({
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    signIn({ profile, account }) {
      if (account?.provider !== "google") return false;
      const p = profile as
        | { email?: string | null; email_verified?: boolean }
        | undefined;
      if (!p?.email_verified) return false;
      return isAllowedEmail(p.email, allowlist());
    },
  },
} satisfies NextAuthConfig;
