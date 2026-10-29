import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import { env } from "./env";

if (!fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_ABSOLUTE_PATH)) {
  console.error(
    `Firebase service account file not found at: ${env.FIREBASE_SERVICE_ACCOUNT_ABSOLUTE_PATH}\n` +
      "Download it from Firebase Console > Project Settings > Service Accounts, " +
      "and point FIREBASE_SERVICE_ACCOUNT_PATH at it (see .env.example)."
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_ABSOLUTE_PATH, "utf-8")
);

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });
}

export const db = getFirestore();
export const bucket = getStorage().bucket();
export { FieldValue, Timestamp };

// Catches the single most common setup mistake (bucket name in .env doesn't match the
// real bucket, or Storage was never enabled in the Firebase console) at startup with an
// actionable message, instead of a confusing raw error on the first upload attempt.
export async function verifyStorageBucket(): Promise<void> {
  try {
    const [exists] = await bucket.exists();
    if (!exists) throw new Error("bucket does not exist");
  } catch (err) {
    console.error(
      `\nCould not reach Firebase Storage bucket "${env.FIREBASE_STORAGE_BUCKET}".\n` +
        "This almost always means one of two things:\n" +
        "  1. Storage was never enabled for this project - open the Firebase Console > Build > Storage > Get started.\n" +
        '  2. FIREBASE_STORAGE_BUCKET in backend/.env doesn\'t match the real bucket name - open Firebase Console > Storage\n' +
        '     and copy the exact name shown there (it starts with "gs://", e.g. your-project.firebasestorage.app or\n' +
        "     your-project.appspot.com - newer projects use the former, older ones the latter).\n" +
        `Underlying error: ${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(1);
  }
}
