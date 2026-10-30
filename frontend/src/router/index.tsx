import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotesListPage } from "@/pages/NotesListPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SchedulePage } from "@/pages/SchedulePage";
import { TasksPage } from "@/pages/TasksPage";
import { TestsPage } from "@/pages/TestsPage";
import { ProtectedRoute } from "./ProtectedRoute";

// The bottom-bar sections load with the app; every other page is its own chunk, so launching
// doesn't parse the whole app. The service worker keeps the chunks on the device, and they are
// all loaded once the app is idle, so opening a page never waits on them.
const pages = {
  notebook: () => import("@/pages/NotebookPage").then((m) => m.NotebookPage),
  noteNew: () => import("@/pages/NoteNewPage").then((m) => m.NoteNewPage),
  note: () => import("@/pages/NotePage").then((m) => m.NotePage),
  subject: () => import("@/pages/SubjectPage").then((m) => m.SubjectPage),
  classSession: () => import("@/pages/ClassSessionPage").then((m) => m.ClassSessionPage),
  settings: () => import("@/pages/SettingsPage").then((m) => m.SettingsPage),
  profile: () => import("@/pages/ProfilePage").then((m) => m.ProfilePage),
  newTest: () => import("@/pages/NewTestPage").then((m) => m.NewTestPage),
  test: () => import("@/pages/TestPage").then((m) => m.TestPage),
  testAttempt: () => import("@/pages/TestAttemptPage").then((m) => m.TestAttemptPage),
};

function page(load: () => Promise<ComponentType>) {
  return async () => ({ Component: await load() });
}

export function preloadPages() {
  for (const load of Object.values(pages)) void load().catch(() => {});
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    // Only shown for the moment a page chunk is read from the device on a cold launch.
    hydrateFallbackElement: null,
    children: [
      { path: "notes/:id/read", lazy: page(pages.notebook) },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "schedule", element: <SchedulePage /> },
          { path: "notes", element: <NotesListPage /> },
          { path: "notes/new", lazy: page(pages.noteNew) },
          { path: "notes/:id", lazy: page(pages.note) },
          { path: "tasks", element: <TasksPage /> },
          { path: "subjects/:id", lazy: page(pages.subject) },
          { path: "class-sessions/:id", lazy: page(pages.classSession) },
          { path: "settings", lazy: page(pages.settings) },
          { path: "profile", lazy: page(pages.profile) },
          { path: "tests", element: <TestsPage /> },
          { path: "tests/new", lazy: page(pages.newTest) },
          { path: "tests/:id", lazy: page(pages.test) },
          { path: "tests/attempts/:attemptId", lazy: page(pages.testAttempt) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
