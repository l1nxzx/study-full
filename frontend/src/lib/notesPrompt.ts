export type PromptSource = "handwritten" | "presentation";
export type PromptFidelity = "exact" | "tidy" | "free";

export const PROMPT_SOURCES: { value: PromptSource; label: string; description: string }[] = [
  { value: "handwritten", label: "Handwritten notes", description: "Photos or a scanned PDF of notes written by hand." },
  { value: "presentation", label: "Presentation", description: "Slides from class: a PowerPoint, a PDF or screenshots." },
];

export const PROMPT_FIDELITIES: { value: PromptFidelity; label: string; description: string }[] = [
  { value: "exact", label: "Copy as is", description: "The same words in the same order. Nothing reworded, added or left out." },
  { value: "tidy", label: "Tidy up", description: "May fix mistakes and unclear wording and format things a bit differently. Adds nothing new." },
  {
    value: "free",
    label: "Rework freely",
    description: "Keeps the ideas and everything that is there, but may restructure, explain and add what helps.",
  },
];

export interface ConversionPromptOptions {
  source: PromptSource;
  fidelity: PromptFidelity;
  subjectName?: string;
}

// What the AI is given and how the prompt talks about it.
const SOURCE_TEXT: Record<PromptSource, { intro: string; material: string; closing: string }> = {
  handwritten: {
    intro: "You are converting handwritten class notes (provided as photos or a scanned PDF) into clean Markdown",
    material: "notes",
    closing: "Here are the photos of my handwritten notes:",
  },
  presentation: {
    intro:
      "You are converting a class presentation (slides, provided as a PowerPoint file, a PDF or screenshots) into study notes written in clean Markdown",
    material: "slides",
    closing: "Here is the presentation:",
  },
};

// The two review tags, shared by every prompt that uses them.
const TAG_SYNTAX = `What is inside these tags is formatted like any other text in the notes: use **bold**, *italic*, ==highlights==, inline math and so on there exactly as you would outside the tags, e.g. <aiadd>the **powerhouse** of the cell</aiadd>. Never wrap a whole heading, list marker, or multiple paragraphs in one tag (only the specific run of words), and keep the value of original="..." as plain text, exactly as written, without formatting or quotation marks.

1) __ALTER__:
   <aialter original="EXACT TEXT AS YOU READ IT ON THE PAGE">YOUR CORRECTED VERSION</aialter>

   Example - the page looks like it says "byologia" and you're confident it means "biologia":
   <aialter original="byologia">biologia</aialter>

2) __ADD__:
   <aiadd>YOUR ADDED TEXT</aiadd>

   Example:
   The mitochondria is the <aiadd>**powerhouse** of the cell</aiadd>.

Use these tags inline, directly in the flow of the sentence/list item they belong to. Do not add any other commentary about your guesses outside of these tags - the tags are the only place uncertainty should appear.`;

function tagSyntax(alterCase: string, addCase: string): string {
  return TAG_SYNTAX.replace("__ALTER__", alterCase).replace("__ADD__", addCase);
}

const HANDWRITTEN_ALTER = "You corrected a specific word/phrase that was written but hard to read or clearly wrong (e.g. a misread word, a garbled term, a likely typo in the original handwriting)";
const HANDWRITTEN_ADD = "You are adding something that was NOT legible or NOT present at all, but you inferred it should be there (a missing step, a word cut off in the photo, a detail you filled in from context)";
const SLIDES_ALTER = "You corrected a specific word/phrase/number on a slide that is clearly wrong (a typo that changes the meaning, a wrong term, an obvious factual or calculation slip)";
const SLIDES_ADD = "You are adding something that is NOT on the slides at all, but that you inferred should be there (a missing step, a word cut off in a screenshot, a detail you filled in from context)";

// How closely the result follows the source: the heart of each prompt.
function contentRules(source: PromptSource, fidelity: PromptFidelity): string {
  const handwritten = source === "handwritten";

  if (fidelity === "exact") {
    return handwritten
      ? `CONTENT RULES - COPY AS IS
- This is a transcription, not a rewrite. Keep the wording, the order and the structure exactly as on the page: the same headings, sub-points, numbered steps, abbreviations and examples. Do not rephrase, shorten, expand, reorder, merge or drop anything, and do not add explanations of your own.
- Fix obvious spelling and capitalization mistakes caused by handwriting silently (no markup needed for these - just correct them).
- If something is genuinely hard to read, or you believe a word/step/detail is missing or wrong and you have to guess or infer it, DO guess - don't leave gaps - but you must mark exactly what you touched using the two tags below. Never silently invent or silently "clean up" anything beyond simple spelling.

MARKING WHAT YOU CHANGED OR ADDED (required, exact syntax)
There are two distinct cases. ${tagSyntax(HANDWRITTEN_ALTER, HANDWRITTEN_ADD)}`
      : `CONTENT RULES - COPY AS IS
- This is a transcription of the slides, not a rewrite. Keep the wording of every slide exactly as written and in the same order: the same titles, bullet points, numbered steps, abbreviations and examples. Do not rephrase, shorten, expand, reorder or merge anything, do not turn bullet fragments into sentences, and do not add explanations of your own.
- Leave nothing of the content out. The only things to skip are those that carry no content: slide numbers, footers, logos, the author/date line, and slides that are only a title page, an agenda or a "thank you / questions?" page.
- If the file contains speaker notes, copy them too, as normal text right after the content of the slide they belong to.
- If a word is cut off or unreadable (e.g. in a screenshot), or something on a slide is clearly a mistake, fix or fill it in - but you must mark exactly what you touched using the two tags below. Never silently change anything.

MARKING WHAT YOU CHANGED OR ADDED (required, exact syntax)
There are two distinct cases. ${tagSyntax(SLIDES_ALTER, SLIDES_ADD)}`;
  }

  if (fidelity === "tidy") {
    return handwritten
      ? `CONTENT RULES - TIDY UP
- Keep everything the notes say - every fact, step, example and detail - and keep it in essentially the same order. You are cleaning the notes up, not rewriting them.
- You may: fix spelling, grammar and punctuation; finish clipped or abbreviated phrases so they read clearly; fix wording that is confusing; split a run-on into a list or merge scattered fragments about one thing; add a heading where a new topic clearly starts; move a stray remark to the place it belongs. Do these silently - no markup needed.
- You may not: add facts, explanations or examples that are not in the notes, or leave out anything that is.
- If something is genuinely hard to read, or a fact/term/number in the notes looks wrong, or a word/step is missing and you have to infer it, DO guess - don't leave gaps - but mark exactly what you touched using the two tags below.

MARKING GUESSES AND CORRECTIONS OF CONTENT (required, exact syntax)
There are two distinct cases. ${tagSyntax(HANDWRITTEN_ALTER, HANDWRITTEN_ADD)}`
      : `CONTENT RULES - TIDY UP
- Keep everything the slides say - every fact, step, example and detail - and keep it in essentially the same order. You are turning slides into readable notes, not writing new material.
- You may: turn clipped bullet fragments into short, clear statements; fix spelling, grammar and wording that is confusing; merge a topic that continues over several slides into one section; regroup bullets, turn a comparison into a table, or add a heading where it makes the structure clearer. Do these silently - no markup needed.
- You may not: add facts, explanations or examples that are not on the slides (or in their speaker notes), or leave out anything that is.
- Skip only what carries no content: slide numbers, footers, logos, the author/date line, and slides that are only a title page, an agenda or a "thank you / questions?" page.
- If the file contains speaker notes, work what they say into the section of the slide they belong to.
- If a fact/term/number on a slide looks wrong, or a word/step is missing or unreadable and you have to infer it, fix or fill it in - but mark exactly what you touched using the two tags below.

MARKING GUESSES AND CORRECTIONS OF CONTENT (required, exact syntax)
There are two distinct cases. ${tagSyntax(SLIDES_ALTER, SLIDES_ADD)}`;
  }

  const material = handwritten ? "notes" : "slides";
  return `CONTENT RULES - REWORK FREELY
- Write the best study notes you can from this material. What must stay: every idea, fact, definition, formula, step and example the ${material} contain${handwritten ? "" : " (including what the speaker notes say, if the file has them)"}. Nothing that is there may be lost or changed in meaning.
- Everything else is up to you: choose your own structure, order, headings and wording; turn fragments into clear explanations; group related things; use lists, tables and callouts wherever they make the material easier to learn.
- You may add what helps to understand and remember the material: a short explanation of why something holds, a missing intermediate step, a definition of a term the ${material} use without explaining, a simple example, a short summary of a section. Keep additions correct, relevant to the topic and at the level of the ${material} - do not drift into new topics, and do not pad.
- You do not need to mark your own additions or changes.${
    handwritten
      ? " Skip nothing because it is hard to read: make your best guess."
      : ' Skip only what carries no content: slide numbers, footers, logos, the author/date line, and slides that are only a title page, an agenda or a "thank you / questions?" page.'
  }
- One exception, so I can check it against the original: where ${
    handwritten ? "a word or number was unreadable and you had to guess it, or the notes state" : "the slides state"
  } something that is clearly wrong and you corrected it, wrap the corrected run of words like this (only the specific words; they can be formatted like any other text, but the value of original="..." stays plain text):
   <aialter original="EXACT TEXT AS IT IS IN THE ORIGINAL">YOUR CORRECTED VERSION</aialter>`;
}

function highlightRule(fidelity: PromptFidelity, material: string): string {
  const colors =
    "blue (general emphasis - same as ==text==), green (a correct result/answer), red (a common mistake or incorrect example), purple (a key concept worth remembering), orange (secondary/supporting emphasis), yellow (caution/warning - something to be careful about, not general emphasis)";
  if (fidelity === "exact") {
    return `- Inline highlighting: use it only where the ${material} themselves highlight something (highlighter pen, a coloured or marked word). Wrap that word or short phrase in ==double equals signs==, e.g. ==mitochondria==, or, to keep a specific colour meaning, use <highlight color="COLOR">text</highlight> with one of: ${colors}. Do not highlight anything the ${material} did not. A highlight can contain bold, italic, inline code or math (e.g. ==**term**==), and can itself sit inside bold.`;
  }
  return `- Actively use inline highlighting - this is required, not optional, for any note longer than a couple of lines: wrap the single most important term, name, number, or short phrase per key point in ==double equals signs==, e.g. ==mitochondria==, or, when the emphasis has a specific meaning, use <highlight color="COLOR">text</highlight> with one of: blue (general emphasis - same as ==text==), green (a correct result/answer), red (a common mistake or incorrect example), purple (a key concept worth remembering), orange (secondary/supporting emphasis), yellow (caution/warning - something to be careful about, not general emphasis). Only wrap the specific word or phrase, never a whole sentence or paragraph. Do not skip highlighting just because nothing looked visually marked in the original - if there is at least one term worth a student remembering, mark it. Most emphasis should still just be **bold**; highlights are for the smaller set of terms that most deserve to stand out. A highlight can contain bold, italic, inline code or math (e.g. ==**term**==), and can itself sit inside bold.`;
}

// The prompt to give ChatGPT/Claude together with the files. One prompt per kind of source
// (handwritten notes, a presentation) and per how freely the AI may treat it; the output
// format, the Markdown dialect and the math rules are the same for all of them, since the
// result is always pasted into the same note editor.
export function buildConversionPrompt({ source, fidelity, subjectName }: ConversionPromptOptions): string {
  const text = SOURCE_TEXT[source];
  const handwritten = source === "handwritten";
  const subjectLine = subjectName
    ? `These ${text.material} are for the subject "${subjectName}" - use that as context ${
        handwritten ? "when reading unclear words or symbols" : "for terminology and notation"
      } (e.g. prefer subject-appropriate terminology and notation for ${subjectName}).`
    : `I haven't picked a subject for these ${text.material} yet, so don't assume a specific one - ${
        fidelity === "free" ? "work from" : "transcribe only"
      } what's actually ${handwritten ? "on the page" : "on the slides"}.`;

  const emphasisRule =
    fidelity === "exact"
      ? `- Use **bold** and *italic* for emphasis exactly as the ${text.material} indicate it (${
          handwritten ? "underlining, circling, stars, etc." : "bold, italic, underlined or coloured text"
        }), and nowhere else.`
      : `- Use **bold** for key terms and *italic* for emphasis${
          handwritten ? ", including wherever the notes indicate it by underlining, circling, stars, etc." : ", including wherever the slides emphasize something."
        }`;

  const figureRule = handwritten
    ? "- If the notes contain a diagram, sketch, or figure, do not try to draw it. Insert a short italic placeholder describing it instead, e.g. *(diagram: force vectors on an inclined plane)*. The original photo will be attached separately in the app."
    : "- If a slide contains a picture, diagram, chart or graph, do not try to draw it. Write down the information it carries as text (its labels, the values or the relationship it shows - as a list or a table where that fits), and add a short italic placeholder describing it, e.g. *(diagram: the water cycle)*. A purely decorative picture is simply left out.";

  const calloutRule =
    fidelity === "exact"
      ? `- For a rule, definition, or warning the ${text.material} visually set apart (boxed, ${handwritten ? "underlined, starred" : "framed, in a coloured box"}), use a callout`
      : `- For a rule, definition, or warning that deserves to stand out${handwritten ? " (boxed, underlined or starred in the notes, or simply important)" : " (framed on the slide, or simply important)"}, use a callout`;
  const calloutScope =
    fidelity === "exact"
      ? `Pick whichever of the four best matches how the ${text.material} marked it (a plain boxed definition -> [!NOTE], a memory aid/shortcut -> [!TIP], something emphasized as critical -> [!IMPORTANT], a common mistake/warning -> [!WARNING]). Use this only for content the ${text.material} clearly set apart, not for ordinary sentences.`
      : "Pick whichever of the four fits (a definition -> [!NOTE], a memory aid/shortcut -> [!TIP], something critical -> [!IMPORTANT], a common mistake/warning -> [!WARNING]). Use callouts sparingly, not for ordinary sentences.";

  const structureRule = handwritten
    ? `- If the notes span multiple photos, treat them as one continuous document in the order given and merge them into a single coherent Markdown document - do not produce separate sections per photo unless the notes themselves are organized that way.`
    : `- Treat the whole presentation as one continuous document. Slide titles become ## section headings (### for sub-topics); a topic that continues over several slides is one section, not one section per slide. Never write "Slide 1", "Slide 2" or slide numbers.`;

  return `${text.intro} for "Study", my personal study website. I paste your output directly into the app's note editor, so it has to follow the exact format below.

${subjectLine}

OUTPUT FORMAT
- Output ONLY the converted Markdown. No preamble, no sign-off, no explanation of what you did, no summary of changes.
- Do not wrap the output in a code fence (no triple backticks around the whole thing).
- Do not include a top-level title (no single # heading) - the app stores the title separately in its own field. Start directly with the content, using ## for section headings and ### for subsections.
${structureRule}
- Write in the same language as the ${text.material}. Do not translate anything.

${contentRules(source, fidelity)}

MARKDOWN FORMATTING
- Use ## and ### for section headings (never a single #).
${emphasisRule}
- Use - for bullet lists and 1. for numbered/ordered lists.
- Use GitHub-Flavored Markdown pipe tables (| Col | Col |) for anything tabular.
- Use --- for a clear visual section break${fidelity === "exact" ? ` if the ${text.material} have one (e.g. a drawn horizontal line)` : " between major parts, where it helps"}.
- Use fenced code blocks (triple backticks) only for actual code, never for regular text or formulas.
${figureRule}
${calloutRule}: start a blockquote with exactly "[!NOTE]", "[!TIP]", "[!IMPORTANT]", or "[!WARNING]" on its own line, then the text on the following blockquote line(s), e.g.:
  > [!IMPORTANT]
  > Whatever you do to one side of the equation, do to the other.
  ${calloutScope}
${highlightRule(fidelity, text.material)}

MATH FORMATTING (KaTeX)
- Every mathematical expression must be valid KaTeX.
- Inline math: wrap in single dollar signs, e.g. $x^2 + y^2 = z^2$.
- Display/block math (equations on their own line, multi-step derivations, anything written as a standalone equation): wrap in double dollar signs on their own lines, e.g.
  $$
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
  $$
- For multiple aligned equations or steps, use a single $$ ... $$ block with \\begin{aligned} ... \\end{aligned} inside it (align each line with & and separate lines with \\\\). Never use \\begin{align} outside of a math block, and never split one multi-line derivation across several separate $$ blocks unless they are clearly separate ideas.
- Use standard LaTeX commands only (\\frac, \\sqrt, \\sum, \\int, \\left/\\right, Greek letters like \\alpha, subscripts/superscripts, etc.). Do not invent commands or use packages that don't exist in KaTeX.
- Chemical equations, units, and simple variable names can stay as plain text unless they are clearly meant as a formula.

${text.closing}`;
}
