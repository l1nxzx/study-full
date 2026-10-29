// A one-line plain-text glimpse of a note: Markdown syntax, math delimiters, callout markers
// and inline HTML are stripped so the preview reads like prose.
export function notePreview(markdown: string, title: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/^\s*#{1,6}\s.*$/m, (line) => (line.replace(/^\s*#+\s*/, "").trim() === title.trim() ? "" : line))
    .replace(/^\s*\|.*$/gm, " ")
    .replace(/\[!(NOTE|TIP|IMPORTANT|WARNING)\]/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[#*`>_=~|]/g, " ")
    .replace(/^\s*[-+]\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 180);
}
