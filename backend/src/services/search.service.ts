import { db } from "../config/firebase";

export type SearchResultType = "subject" | "note" | "class_session" | "task";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
}

// Plain substring search across the user's own data. Firestore has no full-text search,
// and this app's data volume is small enough that fetching-then-filtering is fine.
// Swap for a real search index (Algolia, Typesense) or embeddings if that ever changes.
export async function search(userId: string, rawQuery: string): Promise<SearchResult[]> {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const [subjectsSnap, notesSnap, sessionsSnap, tasksSnap] = await Promise.all([
    db.collection("subjects").where("userId", "==", userId).get(),
    db.collection("notes").where("userId", "==", userId).get(),
    db.collection("classSessions").where("userId", "==", userId).get(),
    db.collection("tasks").where("userId", "==", userId).get(),
  ]);

  const subjectNameById = new Map<string, string>();
  subjectsSnap.docs.forEach((doc) => subjectNameById.set(doc.id, doc.data().name));

  const results: SearchResult[] = [];

  for (const doc of subjectsSnap.docs) {
    const data = doc.data();
    if (data.name?.toLowerCase().includes(q)) {
      results.push({ type: "subject", id: doc.id, title: data.name });
    }
  }

  for (const doc of notesSnap.docs) {
    const data = doc.data();
    const titleMatch = data.title?.toLowerCase().includes(q);
    const contentMatch = data.contentMarkdown?.toLowerCase().includes(q);
    if (titleMatch || contentMatch) {
      results.push({
        type: "note",
        id: doc.id,
        title: data.title,
        subtitle: subjectNameById.get(data.subjectId),
        snippet: contentMatch ? extractSnippet(data.contentMarkdown, q) : undefined,
      });
    }
  }

  for (const doc of sessionsSnap.docs) {
    const data = doc.data();
    const title = data.title || subjectNameById.get(data.subjectId) || "Class session";
    if (title.toLowerCase().includes(q) || data.date?.includes(q)) {
      results.push({
        type: "class_session",
        id: doc.id,
        title,
        subtitle: `${subjectNameById.get(data.subjectId) ?? ""} · ${data.date}`,
      });
    }
  }

  for (const doc of tasksSnap.docs) {
    const data = doc.data();
    if (data.title?.toLowerCase().includes(q)) {
      results.push({
        type: "task",
        id: doc.id,
        title: data.title,
        subtitle: data.subjectId ? subjectNameById.get(data.subjectId) : undefined,
      });
    }
  }

  return results.slice(0, 50);
}

function extractSnippet(content: string, query: string, radius = 60): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return content.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + query.length + radius);
  return `${start > 0 ? "…" : ""}${content.slice(start, end)}${end < content.length ? "…" : ""}`;
}
