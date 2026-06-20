import { describe, expect, it, vi } from "vitest";
import { isExpired, refreshGoogleToken, type TokenSet } from "./refresh";

const NOW = 1_750_000_000_000; // fixed clock (ms)

function okResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

describe("isExpired", () => {
  it("true when no expiry is set", () => {
    expect(isExpired({}, NOW)).toBe(true);
  });
  it("false when expiry is in the future", () => {
    expect(isExpired({ expiresAt: Math.floor(NOW / 1000) + 600 }, NOW)).toBe(false);
  });
  it("true when expiry has passed", () => {
    expect(isExpired({ expiresAt: Math.floor(NOW / 1000) - 1 }, NOW)).toBe(true);
  });
});

describe("refreshGoogleToken", () => {
  const deps = (fetchFn: typeof fetch) => ({
    clientId: "id",
    clientSecret: "secret",
    fetchFn,
    nowMs: NOW,
  });

  it("swaps the access token and computes the new expiry", async () => {
    const fetchFn = vi.fn(async () =>
      okResponse({ access_token: "new-access", expires_in: 3600 }),
    ) as unknown as typeof fetch;
    const token: TokenSet = { accessToken: "old", refreshToken: "r1", expiresAt: 1 };
    const out = await refreshGoogleToken(token, deps(fetchFn));
    expect(out.accessToken).toBe("new-access");
    expect(out.expiresAt).toBe(Math.floor(NOW / 1000) + 3600);
    expect(out.error).toBeUndefined();
  });

  it("keeps the existing refresh token when Google omits a new one", async () => {
    const fetchFn = vi.fn(async () =>
      okResponse({ access_token: "a", expires_in: 100 }),
    ) as unknown as typeof fetch;
    const out = await refreshGoogleToken({ refreshToken: "keep-me" }, deps(fetchFn));
    expect(out.refreshToken).toBe("keep-me");
  });

  it("adopts a rotated refresh token when provided", async () => {
    const fetchFn = vi.fn(async () =>
      okResponse({ access_token: "a", expires_in: 100, refresh_token: "rotated" }),
    ) as unknown as typeof fetch;
    const out = await refreshGoogleToken({ refreshToken: "old" }, deps(fetchFn));
    expect(out.refreshToken).toBe("rotated");
  });

  it("returns RefreshTokenError when there is no refresh token", async () => {
    const out = await refreshGoogleToken({}, deps(vi.fn() as unknown as typeof fetch));
    expect(out.error).toBe("RefreshTokenError");
  });

  it("returns RefreshTokenError on a non-OK response", async () => {
    const fetchFn = vi.fn(async () => ({ ok: false }) as Response) as unknown as typeof fetch;
    const out = await refreshGoogleToken({ refreshToken: "r" }, deps(fetchFn));
    expect(out.error).toBe("RefreshTokenError");
  });

  it("returns RefreshTokenError when the fetch throws", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    const out = await refreshGoogleToken({ refreshToken: "r" }, deps(fetchFn));
    expect(out.error).toBe("RefreshTokenError");
  });
});
