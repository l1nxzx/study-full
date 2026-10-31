// A per-user copy of a list, kept in server memory. Lists are read on almost every page, and a
// personal app's lists change only when the user changes them, so the copy is kept until a write
// to the same data clears it: `afterWrite` runs a write and clears the copy when it finishes
// (also when it fails). Only the single server process holds these copies, and every write goes
// through it, so a copy is never stale for a change made in the app.
export function userCache<T>(onWrite?: (userId: string) => void) {
  // The promise itself is stored, so readers that start during a write share one load, and a
  // load that was in flight when a write cleared the copy never fills it again.
  const loads = new Map<string, Promise<T>>();

  function invalidate(userId: string): void {
    loads.delete(userId);
  }

  function get(userId: string, load: () => Promise<T>): Promise<T> {
    const existing = loads.get(userId);
    if (existing) return existing;
    const loading = load();
    loads.set(userId, loading);
    loading.catch(() => {
      if (loads.get(userId) === loading) loads.delete(userId);
    });
    return loading;
  }

  async function afterWrite<R>(userId: string, write: () => Promise<R>): Promise<R> {
    try {
      return await write();
    } finally {
      invalidate(userId);
      onWrite?.(userId);
    }
  }

  return { get, invalidate, afterWrite };
}
