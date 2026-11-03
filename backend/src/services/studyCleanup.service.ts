import { db } from "../config/firebase";

// One-off cleanup of study time on chosen days, for one account. It runs at startup only when the
// two settings below are set on the server (Render environment), and only once: a record in
// meta/studyCleanup marks it done, so later starts skip it. Quiz and test attempts are never touched.
//   STUDY_CLEANUP_EMAIL  the account's email
//   STUDY_CLEANUP_DATES  days to clear, as YYYY-MM-DD, comma separated (days in the school timezone)
// Remove the two settings after it has run.

const SCHOOL_TIMEZONE = "Europe/Bratislava";
const BATCH_SIZE = 400;
const RECORD = db.collection("meta").doc("studyCleanup");

function localDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function runStudyCleanupOnce(): Promise<void> {
  const email = process.env.STUDY_CLEANUP_EMAIL?.trim().toLowerCase();
  const dates = (process.env.STUDY_CLEANUP_DATES ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  if (!email || dates.length === 0) return;
  if (dates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error("STUDY_CLEANUP_DATES must be YYYY-MM-DD");

  const key = `${email}|${dates.join(",")}`;
  const record = await RECORD.get();
  if (record.exists && record.data()?.key === key) {
    console.log("Study cleanup already done for these settings; skipping.");
    return;
  }

  const users = await db.collection("users").where("email", "==", email).get();
  if (users.size !== 1) {
    console.error(`Study cleanup: expected one account for the configured email, found ${users.size}. Nothing deleted.`);
    return;
  }
  const userId = users.docs[0].id;

  // Single-field equality queries only (no composite indexes); the day is matched in memory.
  const days = (await db.collection("activityDays").where("userId", "==", userId).get()).docs
    .filter((d) => dates.includes(d.data().date));
  const sessions = (await db.collection("studySessions").where("userId", "==", userId).get()).docs
    .filter((d) => typeof d.data().startedAt === "string" && dates.includes(localDate(d.data().startedAt)));

  const deletedDays = days.map((d) => ({ id: d.id, date: d.data().date, minutes: Math.round((d.data().seconds ?? 0) / 60) }));
  const deletedSessions = sessions.map((d) => ({ id: d.id, startedAt: d.data().startedAt, seconds: d.data().seconds ?? 0 }));
  console.log(`Study cleanup for ${userId}: ${days.length} daily activity documents, ${sessions.length} study sessions on ${dates.join(", ")}`);

  const refs = [...days, ...sessions].map((d) => d.ref);
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    refs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  // The exact list of what was deleted, kept in Firestore so it can be read later.
  await RECORD.set({
    key,
    userId,
    dates,
    completedAt: new Date().toISOString(),
    deletedDailyActivity: deletedDays,
    deletedStudySessions: deletedSessions,
    deletedTotalMinutes: deletedDays.reduce((sum, d) => sum + d.minutes, 0),
    kept: "quiz and test attempts",
  });
  console.log(`Study cleanup done: ${refs.length} documents deleted. Report saved in meta/studyCleanup.`);
}
