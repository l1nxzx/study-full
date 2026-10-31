// The server's answers to the statistics requests, kept for a short time. Several pages and
// devices ask for the same answer within minutes; each answer is worked out from the whole history,
// so it's computed once per window. Study time doesn't clear it: the device adds the time that
// the answer doesn't include yet (see the asOf stamp). Anything the student changes that the
// statistics show (notes, subjects, tests, tries, chats, quizzes) clears it at once.
const ANSWER_MS = 2 * 60_000;
const answers = new Map<string, { at: number; value: Promise<unknown> }>();

export function cachedStatsAnswer<T>(userId: string, key: string, compute: () => Promise<T>): Promise<T> {
  const full = `${userId}|${key}`;
  const hit = answers.get(full);
  if (hit && Date.now() - hit.at < ANSWER_MS) return hit.value as Promise<T>;
  const value = compute();
  answers.set(full, { at: Date.now(), value });
  value.catch(() => {
    if (answers.get(full)?.value === value) answers.delete(full);
  });
  return value;
}

export function invalidateStatsAnswers(userId: string): void {
  for (const key of [...answers.keys()]) if (key.startsWith(`${userId}|`)) answers.delete(key);
}
