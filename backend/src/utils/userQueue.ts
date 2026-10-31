// Runs one user's study-time writes and statistics reads one after another, in the order they
// arrived. Within one turn nothing else for that user runs, so a statistics read sees exactly the
// updates that finished before it, and no update is half-written when it reads. Turns are stamped
// with a strictly increasing number (per process), so the app can tell which updates a statistics
// answer already includes.
const queues = new Map<string, Promise<unknown>>();
let lastStamp = 0;

export function nextStamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

export function inUserQueue<T>(userId: string, turn: () => Promise<T>): Promise<T> {
  const previous = queues.get(userId) ?? Promise.resolve();
  const next = previous.then(turn, turn);
  queues.set(
    userId,
    next.catch(() => undefined)
  );
  return next;
}
