import { addDays } from "date-fns";
import ical, { type ParameterValue, type VEvent } from "node-ical";
import * as subjectsService from "./subjects.service";
import * as scheduleEventsService from "./scheduleEvents.service";
import * as scheduleIntegrationService from "./scheduleIntegration.service";
import type { ScheduleEventStatus } from "./scheduleEvents.service";

// How far back/forward a sync looks. EduPage-style feeds typically only publish a
// rolling window of the school year anyway; this keeps the imported set focused on
// what's actually relevant to "what's my schedule right now."
const SYNC_WINDOW_PAST_DAYS = 3;
const SYNC_WINDOW_FUTURE_DAYS = 60;
// Imported lessons older than this are deleted on each sync. The Schedule page never looks further back.
const RETENTION_PAST_DAYS = 28;

// EduPage's feed encodes lesson times in UTC (confirmed against a real feed), so this
// must always render wall-clock time for the school's own timezone rather than
// whatever timezone the Node process happens to be running in - otherwise the schedule
// would silently shift by 1-2 hours depending on where the server is deployed.
const SCHOOL_TIMEZONE = "Europe/Bratislava";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SCHOOL_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDateInSchoolTz(date: Date): string {
  return dateFormatter.format(date); // en-CA -> "yyyy-MM-dd"
}

function formatTimeInSchoolTz(date: Date): string {
  return timeFormatter.format(date); // en-GB, hour12:false -> "HH:mm"
}

function textValue(value: ParameterValue | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : (value.val ?? "");
}

function toFetchableUrl(icsUrl: string): string {
  return icsUrl.replace(/^webcal:\/\//i, "https://");
}

// EduPage feeds mix real per-lesson entries (short codes like "MAT", "FYZ") with
// one-off administrative announcements ("Rozbor Školského poriadku", "Organizačné
// práce..."). Only titles that look like an actual subject code get auto-turned into a
// Subject - otherwise every unique announcement sentence would pollute the Subjects list.
function looksLikeSubjectCode(title: string): boolean {
  const trimmed = title.trim();
  return trimmed.length >= 2 && trimmed.length <= 10 && !trimmed.includes(" ");
}

// EduPage doesn't publish a documented custom encoding for substitutions/cancellations,
// so this only trusts the standard ICS STATUS property first, falling back to a
// best-effort keyword scan (English and Slovak/Czech school-system terms) over the
// summary/description as a secondary signal - not a guaranteed-correct parse of every
// possible EduPage phrasing, just a reasonable heuristic.
function classifyStatus(rawStatus: string | undefined, summary: string, description: string): ScheduleEventStatus {
  if (rawStatus === "CANCELLED") return "cancelled";

  const blob = `${summary} ${description}`.toLowerCase();
  if (/zrušen|zrusen|odpadá|odpada|cancell?ed/.test(blob)) return "cancelled";
  if (/suplov|náhrad|nahrad|zmena|substitut|changed|presun/.test(blob)) return "changed";
  return "scheduled";
}

interface Occurrence {
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  status: string | undefined;
}

function expandEvent(event: VEvent, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const occurrences: Occurrence[] = [];

  if (event.rrule) {
    let expanded: ReturnType<typeof ical.expandRecurringEvent> = [];
    try {
      expanded = ical.expandRecurringEvent(event, { from: rangeStart, to: rangeEnd });
    } catch {
      expanded = [];
    }
    for (const occ of expanded) {
      occurrences.push({
        start: occ.start,
        end: occ.end,
        summary: textValue(occ.event.summary ?? event.summary),
        description: textValue(occ.event.description ?? event.description),
        location: textValue(occ.event.location ?? event.location),
        status: occ.event.status ?? event.status,
      });
    }
  } else if (event.start && event.start >= rangeStart && event.start <= rangeEnd) {
    occurrences.push({
      start: event.start,
      end: event.end ?? event.start,
      summary: textValue(event.summary),
      description: textValue(event.description),
      location: textValue(event.location),
      status: event.status,
    });
  }

  return occurrences;
}

export interface SyncResult {
  ok: boolean;
  error?: string;
  count?: number;
}

export async function syncUserSchedule(userId: string): Promise<SyncResult> {
  const integration = await scheduleIntegrationService.getIntegration(userId);
  if (!integration?.icsUrl || !integration.connected) {
    return { ok: false, error: "Schedule integration is not connected" };
  }

  let parsed: Awaited<ReturnType<typeof ical.async.fromURL>>;
  try {
    parsed = await ical.async.fromURL(toFetchableUrl(integration.icsUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not fetch the calendar feed";
    await scheduleIntegrationService.recordSyncResult(userId, "error", message);
    return { ok: false, error: message };
  }

  try {
    // Memoizes subject lookups/creations for this sync run so the same code (e.g. "MAT"
    // appearing on every school day) only triggers one Firestore read/write, not one per
    // occurrence.
    const subjectIdByTitle = new Map<string, string | null>();
    async function resolveSubjectId(title: string): Promise<string | null> {
      const key = title.toLowerCase();
      if (subjectIdByTitle.has(key)) return subjectIdByTitle.get(key)!;
      if (!looksLikeSubjectCode(title)) {
        subjectIdByTitle.set(key, null);
        return null;
      }
      const subject = await subjectsService.findOrCreateSubjectByName(userId, title);
      subjectIdByTitle.set(key, subject.id);
      return subject.id;
    }

    const now = new Date();
    const rangeStart = addDays(now, -SYNC_WINDOW_PAST_DAYS);
    const rangeEnd = addDays(now, SYNC_WINDOW_FUTURE_DAYS);
    const seenUids = new Set<string>();

    // One read of everything this user already has, reused for both the upsert diff and
    // stale-event pruning below - the loop that follows only touches Firestore again for
    // subject lookups (memoized) and the final batched writes, instead of issuing a
    // separate query + unconditional write per occurrence (a 60-day feed is 300-400+
    // lessons, so that used to mean hundreds of reads and writes every 30 minutes).
    const existingDocs = await scheduleEventsService.listRawDocsByUser(userId);
    const items: scheduleEventsService.UpsertItem[] = [];

    for (const key of Object.keys(parsed)) {
      const item = parsed[key];
      if (!item || (item as { type?: string }).type !== "VEVENT") continue;
      const event = item as VEvent;

      for (const occurrence of expandEvent(event, rangeStart, rangeEnd)) {
        const summary = occurrence.summary || "Lesson";
        const dateStr = formatDateInSchoolTz(occurrence.start);
        const externalUid = `${event.uid}::${dateStr}`;
        seenUids.add(externalUid);

        const status = classifyStatus(occurrence.status, summary, occurrence.description);
        const subjectId = await resolveSubjectId(summary);

        items.push({
          externalUid,
          data: {
            source: "edupage",
            subjectId,
            title: summary,
            date: dateStr,
            startTime: formatTimeInSchoolTz(occurrence.start),
            endTime: formatTimeInSchoolTz(occurrence.end),
            room: occurrence.location || null,
            teacher: null,
            status,
            changeNote: status !== "scheduled" ? occurrence.description || null : null,
          },
        });
      }
    }

    await scheduleEventsService.batchUpsertScheduleEvents(userId, existingDocs, items);
    await scheduleEventsService.pruneStaleFutureEvents(userId, existingDocs, seenUids, formatDateInSchoolTz(now));
    await scheduleEventsService.pruneOldEvents(existingDocs, formatDateInSchoolTz(addDays(now, -RETENTION_PAST_DAYS)));
    await scheduleIntegrationService.recordSyncResult(userId, "ok");
    return { ok: true, count: seenUids.size };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not process the calendar feed";
    await scheduleIntegrationService.recordSyncResult(userId, "error", message);
    return { ok: false, error: message };
  } finally {
    // Whatever was written (even part of it, if the sync failed midway), the next read comes from Firestore.
    scheduleEventsService.invalidateScheduleEvents(userId);
  }
}
