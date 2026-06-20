import { describe, expect, it } from "vitest";
import {
  StaleWriteError,
  assertWriteApplied,
  nextVersion,
} from "./optimistic-lock";

describe("optimistic-lock", () => {
  it("nextVersion increments by one", () => {
    expect(nextVersion(0)).toBe(1);
    expect(nextVersion(7)).toBe(8);
  });

  it("assertWriteApplied passes when at least one row was affected", () => {
    expect(() => assertWriteApplied(1, "Household")).not.toThrow();
  });

  it("assertWriteApplied throws StaleWriteError when no rows were affected", () => {
    expect(() => assertWriteApplied(0, "Household")).toThrow(StaleWriteError);
    try {
      assertWriteApplied(0, "MealPlan");
    } catch (e) {
      expect(e).toBeInstanceOf(StaleWriteError);
      expect((e as StaleWriteError).entity).toBe("MealPlan");
    }
  });
});
