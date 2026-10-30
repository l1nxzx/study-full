# Study design system

Study should feel like a quiet academic workspace: something you can sit in for hours reading notes,
answering questions and planning work. It is not a dashboard of cards. Typography, alignment, spacing and
hairline rules do most of the visual work; colour and containers are used only when they mean something.

## Palette: graphite and chalk

Tokens live in `src/index.css` (`:root` = light "paper", `.dark` = dark, the default). Use the tokens,
never raw colours, in components.

| Token | Use |
| --- | --- |
| `canvas` | Page ground. Never pure black. |
| `panel` | Sidebar, assistant panel, code blocks, the Markdown field. |
| `tint` | Hover and selected fills, user messages in chat. |
| `raised` | Menus, dialogs, toasts. |
| `rule` / `rule-strong` | Hairlines between rows / borders on controls. |
| `fg` / `fg-muted` / `fg-faint` | Primary text (chalk, never pure white) / secondary / metadata. |
| `accent` / `accent-fill` / `on-accent` | The single interactive colour (verdigris): links, active states, focus, the one primary button. |
| `ok` / `warn` / `bad` | Meaning only: correct and incorrect answers, changes, overdue work, errors. |
| `--kind-*` | Muted task-kind colours (homework, unit test, big exam, oral). |

Subject colours are user data. They appear only as a small square (`SubjectSwatch`), rendered slightly
desaturated, never as tinted rows or cards.

## Type

- **Instrument Sans** is the interface: navigation, controls, labels, page titles, lists of tasks.
- **Literata** is the material you study: note bodies and titles, assistant answers, quiz questions,
  flashcards, practice questions. Rule of thumb: if you would revise from it, it's serif.
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
  `ConfirmDialog`, `SubjectSwatch`/`SubjectLabel`.

## The assistant

The assistant is a workspace beside the page: a pushed column on wide screens, a sheet over the right
edge on mid-size screens, the full screen on phones (Ctrl/Cmd+J toggles it). With a note open it offers
Ask, Quiz, Flashcards and Practice as tabs; tools stay mounted while switching so progress isn't lost.

- **Ask**: user turns are small tinted blocks; answers are unboxed serif prose with Copy / Regenerate.
  Note-based answers state their source ("From your note ...", or a warning when they go beyond it).
  Failed requests render as errors with "Try again" and are never sent back as history.
- **Quiz**: one question at a time, answer choices as keyed rows (A-D), a verdict plus explanation
  ruled in ok/bad, a segmented progress bar that lets you revisit answered questions, a results review.
- **Flashcards**: a single sheet, answer revealed beneath the question, sorted into "again" / "got it",
  with a second round for the "again" pile.
- **Practice**: numbered open questions with hint and answer revealed on request.

No gamification: no points, streaks, badges or celebratory animation. Progress is stated as facts
("7 of 10 correct").

## Motion and states

- Transitions are colour/opacity only, 120ms. Nothing scales, bounces or glows. Reduced motion is respected.
- Loading uses skeletons that stay invisible for 150ms, then pulse slowly.
- Focus is a 2px accent outline on keyboard focus only.
