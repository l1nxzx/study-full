// Shared Tailwind Typography classes for anywhere note content is displayed as rendered
// prose - the read-only MarkdownRenderer and the rich WYSIWYG editor's live surface -
// so headings/code/blockquotes/etc. always look identical between the two.
export const PROSE_CLASSES = [
  "prose prose-neutral max-w-none dark:prose-invert",
  "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
  "prose-p:leading-relaxed prose-li:leading-relaxed",
  "prose-a:text-primary prose-code:before:content-none prose-code:after:content-none",
  "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal",
  "prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-muted",
  "prose-blockquote:border-primary/40 prose-blockquote:font-normal prose-blockquote:not-italic",
  "prose-img:rounded-lg prose-hr:border-border",
  "prose-table:text-sm",
].join(" ");
