const AI_ALTER_PATTERN = /<aialter\s+original="[^"]*"\s*>([\s\S]*?)<\/aialter>/gi;
const AI_ADD_PATTERN = /<aiadd>([\s\S]*?)<\/aiadd>/gi;

// Notes can contain our own <aialter original="...">corrected</aialter> and <aiadd>text</aiadd>
// review markers (see frontend/src/lib/aiMarkup.ts). Sending those raw into an AI prompt
// confuses the model into asking about/quoting the markup itself, so every AI feature
// must clean note content through this first.
export function stripReviewMarkup(markdown: string): string {
  return markdown.replace(AI_ALTER_PATTERN, "$1").replace(AI_ADD_PATTERN, "$1");
}
