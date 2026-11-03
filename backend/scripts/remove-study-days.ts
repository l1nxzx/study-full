// One-off cleanup: removes study time recorded on chosen days for one account.
// Only study time is removed (daily activity and study sessions). Quiz and test attempts are kept.
//
// Dry run (default, deletes nothing):
//   npx tsx scripts/remove-study-days.ts --email you@example.com --dates 2026-10-30,2026-10-31
// Delete for real:
//   npx tsx scripts/remove-study-days.ts --email you@example.com --dates 2026-10-30,2026-10-31 --yes

import { db } from "../src/config/firebase";

const SCHOOL_TIMEZONE = "Europe/Bratislava";
const BATCH_SIZE = 400;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

// The day a session started, as the app shows it (school timezone).
function localDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const dates = (arg("dates") ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  const apply = process.argv.includes("--yes");
  if (!email || dates.length === 0 || dates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
    console.error("Usage: --email <address> --dates YYYY-MM-DD[,YYYY-MM-DD...] [--yes]");
    process.exit(1);
  }

  const users = await db.collection("users").where("email", "==", email).get();
  if (users.size !== 1) {
    console.error(`Expected one account for ${email}, found ${users.size}. Nothing done.`);
    process.exit(1);
  }
  const userId = users.docs[0].id;

  // Single-field equality queries only (no composite indexes); the day is matched in memory.
  const days = (await db.collection("activityDays").where("userId", "==", userId).get()).docs
    .filter((d) => dates.includes(d.data().date));
  const sessions = (await db.collection("studySessions").where("userId", "==", userId).get()).docs
    .filter((d) => typeof d.data().startedAt === "string" && dates.includes(localDate(d.data().startedAt)));

  const seconds = days.reduce((sum, d) => sum + (d.data().seconds ?? 0), 0);
  console.log(`Account ${userId} (${email})`);
  console.log(`Days: ${dates.join(", ")}`);
  console.log(`Daily activity documents: ${days.length} (${Math.round(seconds / 60)} minutes)`);
  console.log(`Study sessions: ${sessions.length}`);
  console.log("Quiz and test attempts: kept");

  if (!apply) {
    console.log("\nDry run: nothing deleted. Run again with --yes to delete.");
    return;
  }

  const refs = [...days, ...sessions].map((d) => d.ref);
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    refs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
  console.log(`\nDeleted ${refs.length} documents.`);
  console.log("The statistics update within two minutes (or after a server restart).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
