import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isExpired, refreshGoogleToken, type TokenSet } from "./refresh";

/**
 * Full Auth.js setup (Node runtime). JWT session strategy — with only two
 * users, the access/refresh/expiry live in the encrypted JWT (no DB adapter).
 * The jwt callback captures Google tokens on sign-in and refreshes them on
 * expiry, surfacing RefreshTokenError so the UI can force re-consent.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account }) {
      // Initial sign-in: capture the Google tokens.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        return token;
      }
      const current: TokenSet = {
        accessToken: token.accessToken as string | undefined,
        refreshToken: token.refreshToken as string | undefined,
        expiresAt: token.expiresAt as number | undefined,
      };
      if (!isExpired(current, Date.now())) return token;

      const refreshed = await refreshGoogleToken(current, {
        clientId: process.env.AUTH_GOOGLE_ID ?? "",
        clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      });
      token.accessToken = refreshed.accessToken;
      token.refreshToken = refreshed.refreshToken;
      token.expiresAt = refreshed.expiresAt;
      token.error = refreshed.error;
      return token;
    },
    async session({ session, token }) {
      // Expose the calendar access token + any refresh error to the server.
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
