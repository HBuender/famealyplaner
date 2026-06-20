import { describe, expect, it } from "vitest";
import { isAllowedEmail, parseAllowlist } from "./allowlist";

describe("parseAllowlist", () => {
  it("splits, trims, lowercases, and drops empties", () => {
    expect(parseAllowlist(" A@x.com, b@Y.com ,, ")).toEqual(["a@x.com", "b@y.com"]);
  });
  it("returns [] for undefined/empty", () => {
    expect(parseAllowlist(undefined)).toEqual([]);
    expect(parseAllowlist("")).toEqual([]);
  });
});

describe("isAllowedEmail", () => {
  const list = ["hendrik.buender@gmail.com", "jennifer.buender@gmail.com"];
  it("allows a listed email (case-insensitive, trimmed)", () => {
    expect(isAllowedEmail("Hendrik.Buender@gmail.com", list)).toBe(true);
    expect(isAllowedEmail("  jennifer.buender@gmail.com ", list)).toBe(true);
  });
  it("denies an unlisted email", () => {
    expect(isAllowedEmail("intruder@example.com", list)).toBe(false);
  });
  it("denies null/empty", () => {
    expect(isAllowedEmail(null, list)).toBe(false);
    expect(isAllowedEmail(undefined, list)).toBe(false);
    expect(isAllowedEmail("", list)).toBe(false);
  });
});
