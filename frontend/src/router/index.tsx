import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClassSessionPage } from "@/pages/ClassSessionPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { NoteNewPage } from "@/pages/NoteNewPage";
import { NotePage } from "@/pages/NotePage";
import { NotesListPage } from "@/pages/NotesListPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SchedulePage } from "@/pages/SchedulePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SubjectPage } from "@/pages/SubjectPage";
import { TasksPage } from "@/pages/TasksPage";
import { NewTestPage } from "@/pages/NewTestPage";
import { TestAttemptPage } from "@/pages/TestAttemptPage";
import { TestPage } from "@/pages/TestPage";
import { TestsPage } from "@/pages/TestsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotebookPage } from "@/pages/NotebookPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "notes/:id/read", element: <NotebookPage /> },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "schedule", element: <SchedulePage /> },
          { path: "notes", element: <NotesListPage /> },
          { path: "notes/new", element: <NoteNewPage /> },
          { path: "notes/:id", element: <NotePage /> },
          { path: "tasks", element: <TasksPage /> },
          { path: "subjects/:id", element: <SubjectPage /> },
          { path: "class-sessions/:id", element: <ClassSessionPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "tests", element: <TestsPage /> },
          { path: "tests/new", element: <NewTestPage /> },
          { path: "tests/:id", element: <TestPage /> },
          { path: "tests/attempts/:attemptId", element: <TestAttemptPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
