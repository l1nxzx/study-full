# Study design system

Study should feel like a quiet academic workspace: something you can sit in for hours reading notes,
answering questions and planning work. It is not a dashboard of cards. Typography, alignment, spacing and
hairline rules do most of the visual work; colour and containers are used only when they mean something.

## Palette: soft graphite and lilac

Tokens live in `src/index.css` (`:root` = light "paper", `.dark` = dark, the default). Use the tokens,
never raw colours, in components. Greys are near-neutral (a faint cool cast, very low chroma) and the
dark ground is a lifted graphite rather than near-black, so long sessions stay relaxed.

| Token | Use |
| --- | --- |
| `canvas` | Page ground. Never pure black. |
| `panel` | Sidebar, assistant panel, code blocks, the Markdown field. |
| `tint` | Hover and selected fills, user messages in chat. |
| `raised` | Menus, dialogs, toasts. |
| `rule` / `rule-strong` | Hairlines between rows / borders on controls. |
| `fg` / `fg-muted` / `fg-faint` | Primary text (chalk, never pure white) / secondary / metadata. |
| `accent` / `accent-fill` / `on-accent` | The single interactive colour (pastel lilac): links, active states, focus, the one primary button. In dark mode the primary button is a pastel fill with dark text. |
| `ok` / `warn` / `bad` | Meaning only: correct and incorrect answers, changes, overdue work, errors. |
| `--kind-*` | Muted task-kind colours (homework, unit test, big exam, oral). |

Subject colours are user data. They appear only as a small square (`SubjectSwatch`), rendered slightly
desaturated, never as tinted rows or cards.

## Type

- **Instrument Sans** is the interface: navigation, controls, labels, page titles, lists of tasks.
- **Literata** is the material you study: note bodies and titles, assistant answers, quiz questions,
  flashcards, test questions. Rule of thumb: if you would revise from it, it's serif.
- Both faces are user preferences (Settings > Fonts): the reading font (`--reading-font`, used by
  `font-serif`) can be Literata, Instrument Sans or the system serif/sans; the interface font
  (`--ui-font`, used by `font-sans`) Instrument Sans or the system font. Preferences are stored on the
  account, cached in `localStorage` (`study.prefs`) and applied in `index.html` before first paint.
- Tables inside notes switch to the sans face for scanning. Code uses the system monospace.
- Sizes: `.page-title` 22px, `.material-title` 28 to 32px, `.section-title` 15px, body 14px,
  `.group-label` 12px semibold (sentence case, never all caps), `text-meta` 12px. Nothing is smaller
  than 12px except keyboard hints.
- Reading text: `.study-prose` (17px, 1.72 line height) for notes; `.study-prose-compact` for answers;
  `.study-prose-inline` inside quiz options and cards.

## Shape and space

- Radii are small (`xs` 2px to `lg` 6px). A flashcard, a dialog and an input are rounded; rows are not.
- Lists are rows separated by hairlines, under a `Section` heading ruled off below. No boxed cards.
- Every page sits in one frame (padding set once in `AppLayout`) and starts at the same left edge.
  `Page width="reading|default|wide"` only limits how far it extends right. Nothing is centred on its own.
- Layout breakpoints that depend on available width use **container queries** (`@3xl:`, `@4xl:`), because
  the assistant panel changes the content width independently of the window.

## Components

- `ui/`: `Button` (one filled primary per surface; `outline` and `ghost` otherwise), `Input`,
  `Textarea`, `Select`, `Checkbox`, `Segmented` (use instead of a Select when every option fits),
  `Tabs` (underlined), `Dialog` (bottom sheet on phones, near the top on desktop), `DropdownMenu`,
  `Skeleton`/`SkeletonLines`, `Kbd`, `Field` (label + control + hint).
- `layout/`: `Page`, `PageHeader`, `BackLink`, `Section`, `SectionLink`, `Sidebar`, `MobileNav`,
  `SearchDialog` (Ctrl/Cmd+K).
- `shared/`: `EmptyState` (plain text: what's missing and what to do), `InlineError`,
  `ConfirmDialog`, `SubjectSwatch`/`SubjectLabel`, `MoreMenu` (the three-dot menu for less frequent
  actions; destructive ones last). Pages put it in `PageHeader`'s `menu` slot (top-right corner), rows at
  the end of the row.

## The assistant

The assistant is a workspace beside the page: a pushed column on wide screens, a sheet over the right
edge on mid-size screens, the full screen on phones (Ctrl/Cmd+J toggles it). With a note open it offers
Ask, Quiz and Flashcards as tabs, plus a link to make a written test; tools stay mounted while switching.

- **Ask**: user turns are small tinted blocks; answers are unboxed serif prose with Copy / Regenerate.
  The assistant also answers beyond the note; such answers carry one quiet italic line ("Goes a little
  beyond your note."), never a warning box. Failed requests render as errors with "Try again" and are
  never sent back as history. Conversations are saved to the account (History, New).
- **Quiz**: one question at a time, answer choices as keyed rows (A-D), a verdict plus explanation
  ruled in ok/bad, a segmented progress bar that lets you revisit answered questions, a results review.
  Optional instructions steer generation. Every attempt is saved as you answer, resumable, and retryable.
- **Flashcards**: a single sheet, answer revealed beneath the question, sorted into "again" / "got it",
  with a second round for the "again" pile.

## Tests

Written tests have their own pages (`/tests`, `/tests/new`, `/tests/:id`, `/tests/attempts/:id`). You pick
notes, difficulty, how much thinking, how much logic, an estimated length and optional instructions.
The settings decide the test's shape in code (`backend/src/services/testPlan.ts`, mirrored for the
estimate in `frontend/src/lib/testPlan.ts`): the number of questions, the mix of recall, understanding and
deep-thinking questions, which are problems to reason through, and each question's minutes and points
(which add up to the chosen length). The AI outlines a distinct topic for every slot across all the notes,
then writes the questions a few at a time; the New test page shows the plan before you create it.
Writing runs in the background on the server: the test is stored at once as "being written", its page
says so (and that you can leave), the Tests list and the New test page show it, and a toast says when it's
ready or failed wherever you are. A failed test can be written again or deleted.
Every answer is handwritten (a textarea, no options), saved to the server as you type with a local backup,
so a refresh or a dropped connection loses nothing. Handing in sends the answers to be graded: each
question has points, partial credit in half points, feedback, the expected answer and what to revisit.
Grading is evidence-based: for every criterion the grader quotes the part of the answer that meets it
before giving points, and an answer that meets every criterion with nothing wrong gets full points.
Results stay stored; a result can be graded again, a test retaken, or a new one generated from the same notes.

## Notebook reader

`/notes/:id/read` lays a note out as ruled notebook pages: a two-page spread on wide screens, one page on
phones. A rule runs between every two rows (including above the first), and each line of text sits inside
its row with air above and below; rows are about 1.9 times the text size and the ruling is shifted so the
letters are centred. Headings are written within one row. Pages alternate like the two sides of an open
notebook: the margin line is on the left of odd pages and the right of even ones. Highlights are
see-through, so the ruling shows under them. Paper is white or neutral dark, text has three sizes (both
preferences); the note body is rendered once and not re-rendered while turning pages or switching paper.
Pages turn by swipe (moved directly, without re-rendering), edge taps, arrows, Page Up/Down, Space, wheel or
the slider; the position is kept per note. Full screen shows only the paper (browser full screen where
available); Esc or Back leave it.

## Statistics

Time is tracked while the app is visible and in use (idle after 4 minutes) and attributed to an area,
note, subject and test. The profile page (`/profile`) shows time by day, subject, activity, hour and
weekday, sessions, quiz accuracy and missed questions, test scores and topics to review. Notes and
subjects show their own figures. Charts are thin bars in the accent colour with hover tooltips.

No gamification: no streaks, badges or celebratory animation (test points are grading, not rewards). Progress is stated as facts
("7 of 10 correct").

## Instant feedback

Edits show before the server answers: saving a note (both editors), resolving AI corrections and
removing AI-added text, deleting a note, editing or deleting a task, renaming or recolouring a subject,
and preferences. The cached data is changed at once and put back if the server refuses; a failed note
save reopens the editor with your text. Creating things still waits, since it needs the server's id.

## Press menus and the sidebar

Actions that shouldn't sit on screen as buttons (easy to hit by accident) open from a right-click or a
long press, at the pointer (`usePressMenu` in `components/shared/PressMenu.tsx`): removing AI-added text,
and pinning or reordering subjects. The sidebar shows pinned subjects first, in the chosen order, then
the rest; only the first few (Settings > Sidebar, default 6) show before "Show more", and the open
subject always shows. Both are account preferences.

## Back button

Anything that covers the page closes with the system Back button (phones' back gesture included)
instead of navigating the page underneath: the assistant when it overlays the page (below 1280px),
its list of past chats, dialogs, menus, select lists, search, the phone menu, and the note editing
modes (which ask before discarding unsaved changes). Use `useCloseOnBack` from `src/lib/closeOnBack.ts`
for any new overlay; `Dialog`, `DropdownMenu` and `Select` from `components/ui` already do.

## Motion and states

- Transitions are colour/opacity only, 120ms. Nothing scales, bounces or glows. Reduced motion is respected.
- Loading uses skeletons that stay invisible for 150ms, then pulse slowly.
- Focus is a 2px accent outline on keyboard focus only.
