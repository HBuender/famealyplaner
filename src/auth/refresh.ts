/**
 * Google OAuth access-token refresh (U3). Calendar read depends on a refresh
 * token that must be exchanged for a fresh access token when the current one
 * expires. Google often omits a new refresh_token on refresh, so we keep the
 * old one. On failure we surface RefreshTokenError so the UI can force
 * re-consent rather than the planner silently breaking.
 *
 * The fetch and clock are injected so the logic is unit-testable offline.
 */
export interface TokenSet {
  accessToken?: string;
  refreshToken?: string;
  /** Unix seconds at which the access token expires. */
  expiresAt?: number;
  error?: "RefreshTokenError";
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function isExpired(token: TokenSet, nowMs: number): boolean {
  if (!token.expiresAt) return true;
  return nowMs >= token.expiresAt * 1000;
}

export interface RefreshDeps {
  clientId: string;
  clientSecret: string;
  fetchFn?: typeof fetch;
  nowMs?: number;
}

export async function refreshGoogleToken(
  token: TokenSet,
  deps: RefreshDeps,
): Promise<TokenSet> {
  const doFetch = deps.fetchFn ?? fetch;
  const now = deps.nowMs ?? Date.now();
  if (!token.refreshToken) {
    return { ...token, error: "RefreshTokenError" };
  }
  try {
    const res = await doFetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: deps.clientId,
        client_secret: deps.clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    if (!res.ok) return { ...token, error: "RefreshTokenError" };
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };
    if (!data.access_token || !data.expires_in) {
      return { ...token, error: "RefreshTokenError" };
    }
    return {
      accessToken: data.access_token,
      expiresAt: Math.floor(now / 1000) + data.expires_in,
      // Google may omit a new refresh token — keep the existing one.
      refreshToken: data.refresh_token ?? token.refreshToken,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}
