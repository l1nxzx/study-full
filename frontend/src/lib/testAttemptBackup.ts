// This device's copy of an open try's answers and time, so nothing is lost offline, on a
// refresh, or when the app is closed before the server has the latest.

type Answers = Record<string, string>;

export interface LocalBackup {
  answers: Answers;
  elapsed: number;
  savedAt: number;
}

const backupKey = (id: string) => `study.test-attempt.${id}`;

export function readBackup(id: string): LocalBackup | null {
  try {
    const raw = localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as LocalBackup) : null;
  } catch {
    return null;
  }
}

export function writeBackup(id: string, backup: LocalBackup) {
  try {
    localStorage.setItem(backupKey(id), JSON.stringify(backup));
  } catch {
    // storage full or blocked - the server copy is still there
  }
}

export function clearBackup(id: string) {
  try {
    localStorage.removeItem(backupKey(id));
  } catch {
    // ignore
  }
}
