import app from "./app";
import { env } from "./config/env";
import { verifyStorageBucket } from "./config/firebase"; // fail fast if Firebase credentials/storage are missing or invalid
import { startScheduleSyncLoop } from "./config/scheduler";
import { runStudyCleanupOnce } from "./services/studyCleanup.service";

async function start() {
  await verifyStorageBucket();

  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
    if (!env.aiEnabled) {
      console.log("AI features are disabled (no OPENAI_API_KEY set).");
    }
  });

  startScheduleSyncLoop();
  runStudyCleanupOnce().catch((err) => console.error("Study cleanup failed:", err));
}

start();
