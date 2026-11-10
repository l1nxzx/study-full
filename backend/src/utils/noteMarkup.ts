const AI_ALTER_PATTERN = /<aialter\s+original="[^"]*"\s*>([\s\S]*?)<\/aialter>/gi;
const AI_ADD_PATTERN = /<aiadd>([\s\S]*?)<\/aiadd>/gi;

// <notest>...</notest> wraps text the student keeps in the note but won't be examined on
// (see frontend/src/lib/aiMarkup.ts). A region whose closing tag is missing runs to the end
// of the note, the same way the note page shows it.
const NO_TEST_REGION_PATTERN = /<notest>[\s\S]*?(?:<\/notest>|$)/gi;
const NO_TEST_TAG_PATTERN = /<\/?notest>/gi;

export const NO_TEST_OPEN = "[[not examined]]";
export const NO_TEST_CLOSE = "[[/not examined]]";

function unwrapReviewTags(markdown: string): string {
  return markdown.replace(AI_ALTER_PATTERN, "$1").replace(AI_ADD_PATTERN, "$1");
}

// Notes can contain our own <aialter original="...">corrected</aialter> and <aiadd>text</aiadd>
// review markers and <notest> regions. Sending those raw into an AI prompt confuses the model
// into asking about/quoting the markup itself, so every AI feature must clean note content
// through one of the functions below first.
//
// For features that read or explain the note (summary, explain): every tag is unwrapped and
// all of the text stays.
export function stripReviewMarkup(markdown: string): string {
  return unwrapReviewTags(markdown).replace(NO_TEST_TAG_PATTERN, "");
}

// For everything that tests knowledge (quizzes, flashcards, tests and their grading): text
// marked as not examined is removed entirely, so no question can be written from it.
export function stripForTesting(markdown: string): string {
  const withoutRegions = markdown.replace(NO_TEST_REGION_PATTERN, " ").replace(NO_TEST_TAG_PATTERN, "");
  return unwrapReviewTags(withoutRegions)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

// For the note chat: the text stays (the student may ask about it), wrapped in plain markers
// the prompt explains, so a "quiz me" request in the chat leaves it out too.
export function markNotExamined(markdown: string): string {
  return unwrapReviewTags(markdown)
    .replace(/<notest>/gi, NO_TEST_OPEN)
    .replace(/<\/notest>/gi, NO_TEST_CLOSE);
}

// For rewriting: the <notest> tags stay as they are, so the rewritten note keeps the marking.
export function stripReviewTagsOnly(markdown: string): string {
  return unwrapReviewTags(markdown);
}
