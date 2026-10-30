// How long each kind of data counts as fresh in the app (time before a page open asks the server
// again). Changes made in the app always show at once, whatever this says: saving a note or a
// task refreshes the lists right away. These times only govern data that changes elsewhere: a
// second device, the calendar sync, or study time recorded in the background.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const FRESHNESS = {
  /** The imported school timetable: synced once a day by the server. */
  timetable: 24 * HOUR,
  /** Your weekly classes: change only when you edit them. */
  classes: 60 * MINUTE,
  /** Subjects: rarely change. */
  subjects: 10 * MINUTE,
  /** Notes and tasks: change often, mostly through this app. */
  notes: 2 * MINUTE,
  tasks: 2 * MINUTE,
  /** Tests and their tries. */
  tests: 5 * MINUTE,
  /** Statistics: study time is recorded continuously in the background. */
  stats: 5 * MINUTE,
} as const;
