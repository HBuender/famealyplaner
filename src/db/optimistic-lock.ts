/**
 * Optimistic concurrency control for the shared Household. Two adults have
 * equal write access, so a mutating update must match the row's expected
 * `version`; if the update affects zero rows, another writer changed it first
 * and the caller must reload and retry rather than silently clobbering.
 *
 * Usage in a consumer (U5/U15/U17/U19):
 *   const res = await db.update(t).set({ ...changes, version: nextVersion(v) })
 *                      .where(and(eq(t.id, id), eq(t.version, v)));
 *   assertWriteApplied(res.rowCount ?? 0, "Household");
 */
export class StaleWriteError extends Error {
  constructor(public readonly entity: string) {
    super(`${entity} was changed by someone else — reload and try again.`);
    this.name = "StaleWriteError";
  }
}

/** The version a row should carry after a successful optimistic write. */
export function nextVersion(current: number): number {
  return current + 1;
}

/** Throw StaleWriteError when an optimistic update matched no row. */
export function assertWriteApplied(rowsAffected: number, entity: string): void {
  if (rowsAffected === 0) {
    throw new StaleWriteError(entity);
  }
}
