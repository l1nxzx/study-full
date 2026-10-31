import { db } from "../config/firebase";

// Whether an account exists, is disabled, and when its sessions were last ended (a password
// reset or a disable ends every session that was issued before that moment). Checked on every
// request, from memory: changes made by the superadmin clear the entry at once, and the entry
// expires after a few minutes in any case.
export interface AccountStatus {
  disabled: boolean;
  /** Tokens issued at or before this time (ms) are no longer accepted. */
  sessionsValidFrom: number;
}

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; status: AccountStatus | null }>();

export async function accountStatus(userId: string): Promise<AccountStatus | null> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.status;
  const doc = await db.collection("users").doc(userId).get();
  const data = doc.data();
  const status: AccountStatus | null = doc.exists
    ? { disabled: data?.disabled === true, sessionsValidFrom: Number(data?.sessionsValidFrom ?? 0) }
    : null;
  cache.set(userId, { at: Date.now(), status });
  return status;
}

export function forgetAccountStatus(userId: string): void {
  cache.delete(userId);
}
