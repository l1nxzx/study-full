import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import authRoutes from "./auth.routes";
import subjectsRoutes from "./subjects.routes";
import classesRoutes from "./classes.routes";
import classSessionsRoutes from "./classSessions.routes";
import notesRoutes from "./notes.routes";
import tasksRoutes from "./tasks.routes";
import searchRoutes from "./search.routes";
import aiRoutes from "./ai.routes";
import scheduleIntegrationRoutes from "./scheduleIntegration.routes";
import scheduleEventsRoutes from "./scheduleEvents.routes";
import conversationsRoutes from "./conversations.routes";
import testTemplatesRoutes from "./testTemplates.routes";
import quizAttemptsRoutes from "./quizAttempts.routes";
import testsRoutes from "./tests.routes";
import testAttemptsRoutes from "./testAttempts.routes";
import activityRoutes from "./activity.routes";
import statsRoutes from "./stats.routes";

const router = Router();

router.use("/auth", authRoutes);

// Everything below requires a valid session.
router.use("/subjects", requireAuth, subjectsRoutes);
router.use("/classes", requireAuth, classesRoutes);
router.use("/class-sessions", requireAuth, classSessionsRoutes);
router.use("/notes", requireAuth, notesRoutes);
router.use("/tasks", requireAuth, tasksRoutes);
router.use("/search", requireAuth, searchRoutes);
router.use("/ai", requireAuth, aiRoutes);
router.use("/schedule-integration", requireAuth, scheduleIntegrationRoutes);
router.use("/schedule-events", requireAuth, scheduleEventsRoutes);
router.use("/conversations", requireAuth, conversationsRoutes);
router.use("/test-templates", requireAuth, testTemplatesRoutes);
router.use("/quizzes", requireAuth, quizAttemptsRoutes);
router.use("/tests", requireAuth, testsRoutes);
router.use("/test-attempts", requireAuth, testAttemptsRoutes);
router.use("/activity", requireAuth, activityRoutes);
router.use("/stats", requireAuth, statsRoutes);

export default router;
