export function buildNotesToMarkdownPrompt(subjectName?: string): string {
  const subjectLine = subjectName
    ? `These notes are for the subject "${subjectName}" - use that as context when reading unclear words or symbols (e.g. prefer subject-appropriate terminology and notation for ${subjectName}).`
    : "I haven't picked a subject for these notes yet, so don't assume a specific one - transcribe only what's actually on the page.";

  return `You are converting handwritten class notes (provided as photos) into clean Markdown for "Study", my personal study website. I paste your output directly into the app's note editor, so it has to follow the exact format below.

${subjectLine}

OUTPUT FORMAT
- Output ONLY the converted Markdown. No preamble, no sign-off, no explanation of what you did, no summary of changes.
- Do not wrap the output in a code fence (no triple backticks around the whole thing).
- Do not include a top-level title (no single # heading) - the app stores the title separately in its own field. Start directly with the content, using ## for section headings and ### for subsections.
- If the notes span multiple photos, treat them as one continuous document in the order given and merge them into a single coherent Markdown document - do not produce separate sections per photo unless the notes themselves are organized that way.

CONTENT RULES
- Transcribe faithfully. Preserve the original structure and order exactly as organized on the page: headings, sub-points, numbered steps, etc.
- Fix obvious spelling and capitalization mistakes caused by handwriting silently (no markup needed for these - just correct them).
- If something is genuinely hard to read, or you believe a word/step/detail is missing or wrong and you have to guess or infer it, DO guess - don't leave gaps - but you must mark exactly what you touched using the two tags below. Never silently invent or silently "clean up" anything beyond simple spelling.

MARKING WHAT YOU CHANGED OR ADDED (required, exact syntax)
There are two distinct cases. Use plain text only inside these tags - no bold/italic/other Markdown formatting inside them, and never wrap a whole heading, list marker, or multiple paragraphs in one tag (only the specific run of words).

1) You corrected a specific word/phrase that was written but hard to read or clearly wrong (e.g. a misread word, a garbled term, a likely typo in the original handwriting):
   <aialter original="EXACT TEXT AS YOU READ IT ON THE PAGE">YOUR CORRECTED VERSION</aialter>

   Example - the page looks like it says "byologia" and you're confident it means "biologia":
   <aialter original="byologia">biologia</aialter>

2) You are adding something that was NOT legible or NOT present at all, but you inferred it should be there (a missing step, a word cut off in the photo, a detail you filled in from context):
   <aiadd>YOUR ADDED TEXT</aiadd>

   Example:
   The mitochondria is the <aiadd>powerhouse of the cell</aiadd>.

Use these tags inline, directly in the flow of the sentence/list item they belong to. Do not add any other commentary about your guesses outside of these tags - the tags are the only place uncertainty should appear.

MARKDOWN FORMATTING
- Use ## and ### for section headings (never a single #).
- Use **bold** and *italic* for emphasis exactly as indicated by underlining, circling, stars, etc. in the notes, where relevant.
- Use - for bullet lists and 1. for numbered/ordered lists.
- Use GitHub-Flavored Markdown pipe tables (| Col | Col |) for anything tabular.
- Use --- for a clear visual section break if the notes have one (e.g. a drawn horizontal line).
- Use fenced code blocks (triple backticks) only for actual code, never for regular text or formulas.
- If the notes contain a diagram, sketch, or figure, do not try to draw it. Insert a short italic placeholder describing it instead, e.g. *(diagram: force vectors on an inclined plane)*. The original photo will be attached separately in the app.
- For a rule, definition, or warning the notes visually set apart (boxed, underlined, starred), use a callout: start a blockquote with exactly "[!NOTE]", "[!TIP]", "[!IMPORTANT]", or "[!WARNING]" on its own line, then the text on the following blockquote line(s), e.g.:
  > [!IMPORTANT]
  > Whatever you do to one side of the equation, do to the other.
  Pick whichever of the four best matches how the notes marked it (a plain boxed definition -> [!NOTE], a memory aid/shortcut -> [!TIP], something emphasized as critical -> [!IMPORTANT], a common mistake/warning -> [!WARNING]). Use this only for content the notes clearly set apart, not for ordinary sentences.
- Actively use inline highlighting - this is required, not optional, for any note longer than a couple of lines: wrap the single most important term, name, number, or short phrase per key point in ==double equals signs==, e.g. ==mitochondria==, or, when the emphasis has a specific meaning, use <highlight color="COLOR">text</highlight> with one of: blue (general emphasis - same as ==text==), green (a correct result/answer), red (a common mistake or incorrect example), purple (a key concept worth remembering), orange (secondary/supporting emphasis), yellow (caution/warning - something to be careful about, not general emphasis). Only wrap the specific word or phrase, never a whole sentence or paragraph. Do not skip highlighting just because nothing looked visually marked on the page - if there is at least one term worth a student remembering, mark it. Most emphasis should still just be **bold**; highlights are for the smaller set of terms that most deserve to stand out.

MATH FORMATTING (KaTeX)
- Every mathematical expression must be valid KaTeX.
- Inline math: wrap in single dollar signs, e.g. $x^2 + y^2 = z^2$.
- Display/block math (equations on their own line, multi-step derivations, anything the notes wrote as a standalone equation): wrap in double dollar signs on their own lines, e.g.
  $$
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
  $$
- For multiple aligned equations or steps, use a single $$ ... $$ block with \\begin{aligned} ... \\end{aligned} inside it (align each line with & and separate lines with \\\\). Never use \\begin{align} outside of a math block, and never split one multi-line derivation across several separate $$ blocks unless the notes clearly show them as separate ideas.
- Use standard LaTeX commands only (\\frac, \\sqrt, \\sum, \\int, \\left/\\right, Greek letters like \\alpha, subscripts/superscripts, etc.). Do not invent commands or use packages that don't exist in KaTeX.
- Chemical equations, units, and simple variable names can stay as plain text unless the notes clearly intend them as a formula.

Here are the photos of my handwritten notes:`;
}
