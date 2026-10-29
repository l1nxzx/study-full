import { CalendarDays, House, ListChecks, NotebookText } from "lucide-react";

// The one list of top-level sections, shared by the sidebar, the phone drawer and the
// phone's bottom bar.
export const mainNavItems = [
  { to: "/dashboard", label: "Overview", icon: House },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/notes", label: "Notes", icon: NotebookText },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
