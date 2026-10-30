import { AI_MODELS, openai } from "../config/openai";
import { AppError } from "../utils/AppError";
import {
  askResultSchema,
  chatResultSchema,
  explainResultSchema,
  flashcardsResultSchema,
  quizResultSchema,
  testGenerationResultSchema,
  testGradingResultSchema,
  testGradingSummarySchema,
  rewriteResultSchema,
  summaryResultSchema,
} from "../models/ai.model";
import type { z } from "zod";

const MAX_CHARS_PER_NOTE = 8000;
const MAX_TOTAL_CHARS = 16000;

// The user's notes are in Slovak, so every AI feature responds in Slovak too.
const SLOVAK_INSTRUCTION = " Respond entirely in Slovak (slovenčina), including all JSON string values.";

// Full formatting guidance for prose-style responses (summary, explain, chat) that get
// rendered through the app's full Markdown renderer - structure, math, and the app's
// custom callout/highlight syntax are all supported there.
const MARKDOWN_FORMATTING_INSTRUCTION =
  " Format the text using Markdown so it's easy to read and study - the frontend renders it. Use ## or ### headings " +
  "for sections when appropriate, **bold** for key terms, *italic* for emphasis, bullet or numbered lists for " +
  "structured information, Markdown tables when comparing multiple items, and --- to separate major sections when " +
  "it helps. Use inline code (backticks) only for actual code, commands, variables, or technical syntax. Do not " +
  "over-format a simple answer - a short answer can just be one or two plain sentences, not a wall of headings and " +
  "bullets. Whenever the content includes mathematical equations, physics formulas, chemical notation, " +
  "calculations, units, or variables, use LaTeX instead of plain text: $...$ for inline math and $$...$$ on its own " +
  "line for a display equation (e.g. $F = ma$, then separately $$E = mc^2$$). Format units like $9.81\\,\\mathrm{m/s^2}$ " +
  "and chemical formulas like $H_2O$ or $CO_2$. Never spell out an equation as a plain-text sentence when it can be " +
  'proper math. For a genuinely important definition, warning, or key idea worth calling out, you may start a ' +
  'blockquote with exactly "[!NOTE]", "[!TIP]", "[!IMPORTANT]", or "[!WARNING]" on its own line, e.g. ' +
  '"> [!TIP]\\nShort tip text here." Actively use inline highlighting on any response longer than a couple of ' +
  "sentences: wrap the single most important term, name, number, or short phrase per key point in ==double equals " +
  'signs== (e.g. ==mitochondria==), or, when the emphasis has a specific meaning, use ' +
  '<highlight color="COLOR">text</highlight> with one of blue (general emphasis, same as ==text==), green (a correct ' +
  "result/answer), red (a common mistake or incorrect example), purple (a key concept worth remembering), orange " +
  "(secondary/supporting emphasis), or yellow (caution/warning - something to be careful about, not general " +
  "emphasis). Only wrap the specific word or short phrase, never a whole " +
  "sentence. Do not skip highlighting just because the answer felt short - if there is at least one term worth a " +
  "student remembering, mark it. Reserve callout blockquotes for content that truly deserves a whole boxed-out note, " +
  "but highlights should appear in most substantive answers.";

// Lighter formatting guidance for structured quiz/flashcard/practice content - only
// individual short strings inside a JSON array, rendered compactly (no headings, tables,
// callouts, or highlight marks there), so only math and basic emphasis apply.
const MATH_FORMATTING_INSTRUCTION =
  " Whenever a question, option, hint, or answer includes mathematical equations, physics formulas, chemical " +
  "notation, calculations, units, or variables, use LaTeX instead of plain text: $...$ for inline math (e.g. $F = ma$) " +
  "and $$...$$ for a standalone display equation. Format units like $9.81\\,\\mathrm{m/s^2}$ and chemical formulas " +
  "like $H_2O$. Never spell out an equation as a plain-text sentence when it can be proper math. You may use **bold** " +
  "for key terms, but do not use headings, tables, or callout syntax in these short strings.";

export interface NoteContext {
  title: string;
  contentMarkdown: string;
}

// Keeps prompts (and therefore cost) bounded regardless of how much the user pastes/selects.
export function buildNotesContext(notes: NoteContext[]): string {
  let total = 0;
  const parts: string[] = [];

  for (const note of notes) {
    const truncated = note.contentMarkdown.slice(0, MAX_CHARS_PER_NOTE);
    const block = `## ${note.title}\n\n${truncated}`;
    if (total + block.length > MAX_TOTAL_CHARS) break;
    parts.push(block);
    total += block.length;
  }

  return parts.join("\n\n---\n\n");
}

function requireOpenAI() {
  if (!openai) {
    throw AppError.serviceUnavailable(
      "AI features are not configured. Set OPENAI_API_KEY on the backend to enable them.",
      "AI_NOT_CONFIGURED"
    );
  }
  return openai;
}

async function requestJson<T>(params: {
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = requireOpenAI();

  const completion = await client.chat.completions.create({
    model: params.model,
    temperature: params.temperature ?? 0.4,
    ...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw AppError.serviceUnavailable("The AI returned an empty response. Please try again.", "AI_EMPTY_RESPONSE");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw AppError.serviceUnavailable("The AI returned a malformed response. Please try again.", "AI_BAD_RESPONSE");
  }

  const result = params.schema.safeParse(parsedJson);
  if (!result.success) {
    throw AppError.serviceUnavailable("The AI response didn't match the expected format. Please try again.", "AI_BAD_RESPONSE");
  }

  return result.data;
}

export async function generateSummary(note: NoteContext) {
  return requestJson({
    model: AI_MODELS.fast,
    schema: summaryResultSchema,
    system:
      "You are a study assistant summarizing a student's class notes. Base your summary strictly on the " +
      "provided note - do not add outside facts. Respond as JSON: " +
      '{ "quickSummary": string, "keyPoints": string[] }.' +
      MARKDOWN_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user: `Note title: ${note.title}\n\nNote content (Markdown):\n${note.contentMarkdown.slice(0, MAX_CHARS_PER_NOTE)}`,
  });
}

export async function explainText(note: NoteContext, selectedText: string, mode: "simple" | "detailed") {
  const depth =
    mode === "simple"
      ? "Explain it simply, in plain language, as if to a student encountering it for the first time."
      : "Explain it in depth, covering nuance, reasoning, and how it connects to the rest of the note.";

  return requestJson({
    model: AI_MODELS.fast,
    schema: explainResultSchema,
    system:
      "You are a study assistant. Explain the selected passage from a student's notes clearly and accurately. " +
      "Stay grounded in the note's subject matter - you may use general, well-known knowledge to clarify a concept, " +
      "but never invent specifics (numbers, names, claims) that aren't supported by the note or common knowledge. " +
      `${depth} Respond as JSON: { "explanation": string }.` +
      MARKDOWN_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user: `Full note "${note.title}" for context:\n${note.contentMarkdown.slice(0, MAX_CHARS_PER_NOTE)}\n\nSelected passage to explain:\n${selectedText}`,
  });
}

export async function generateQuiz(
  notes: NoteContext[],
  config: {
    numQuestions: number;
    difficulty: "easy" | "medium" | "hard";
    questionTypes: string[];
    includeBeyondNotes?: boolean;
    instructions?: string;
  }
) {
  const model = config.difficulty === "hard" ? AI_MODELS.capable : AI_MODELS.fast;
  const instructionsLine = config.instructions
    ? ` The student added these notes about the quiz they want - follow them as long as they fit the rules above: "${config.instructions}".`
    : "";

  const beyondNotesInstruction = config.includeBeyondNotes
    ? ` In addition to the ${config.numQuestions} questions above, include exactly one extra question (so ` +
      `${config.numQuestions + 1} total) that tests related knowledge not directly covered in the notes, but ` +
      "relevant to the same topic - a way to stretch a bit beyond the material. Mark only that one question's JSON " +
      'object with "beyondNotes": true. Every other question must omit that field or set it to false.'
    : "";

  return requestJson({
    model,
    schema: quizResultSchema,
    temperature: 0.6,
    system:
      "You are a quiz generator for a student's class notes. Write clear, well-formed, natural quiz questions - use " +
      "your own judgment for phrasing and structure rather than quoting the notes verbatim. The one hard requirement " +
      "is that every question (other than an explicitly marked beyond-notes question, see below) must be answerable " +
      "using only the concepts, facts, and definitions actually present in the notes - never invent facts that " +
      "aren't there or aren't reasonably implied. " +
      `Create exactly ${config.numQuestions} questions at ${config.difficulty} difficulty, using only these question ` +
      `types: ${config.questionTypes.join(", ")}.${beyondNotesInstruction}${instructionsLine} Respond as JSON matching this shape: ` +
      '{ "questions": [ { "type": "multiple_choice", "question": string, "options": string[4], "correctIndex": number, "explanation": string, "beyondNotes": boolean (optional) } ' +
      '| { "type": "true_false", "question": string, "correctAnswer": boolean, "explanation": string, "beyondNotes": boolean (optional) } ' +
      '| { "type": "short_answer", "question": string, "sampleAnswer": string, "explanation": string, "beyondNotes": boolean (optional) } ] }. ' +
      "Only use question types from the allowed list above." +
      MATH_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user: `Generate the quiz from these notes:\n\n${buildNotesContext(notes)}`,
  });
}

export async function generateFlashcards(notes: NoteContext[], count: number) {
  return requestJson({
    model: AI_MODELS.fast,
    schema: flashcardsResultSchema,
    temperature: 0.5,
    system:
      "You create flashcards (question/answer pairs) from a student's class notes for active-recall study. " +
      "Cover the most important concepts, not trivia. Respond as JSON: " +
      '{ "cards": [ { "question": string, "answer": string } ] }.' +
      MATH_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user: `Generate exactly ${count} flashcards from these notes:\n\n${buildNotesContext(notes)}`,
  });
}

export async function askNote(
  note: NoteContext,
  question: string,
  history: { role: "user" | "assistant"; content: string }[]
) {
  const client = requireOpenAI();

  const completion = await client.chat.completions.create({
    model: AI_MODELS.fast,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          `You are a study assistant helping a student understand their note titled "${note.title}" (content below). ` +
          "Use the note as your main source and stay consistent with it. Often, to understand the note the student " +
          "needs something the note doesn't explain - a prerequisite concept, background, a related topic, a worked " +
          "example. In that case answer fully and accurately from reliable general knowledge instead of refusing; " +
          "connect it back to the note where that helps. Never claim the note says something it doesn't. Set " +
          '"groundedInNote" to true when the answer comes from the note, and false when a meaningful part of it ' +
          "comes from outside the note. Do not add disclaimers about this in the answer text itself - the app shows " +
          'that separately. Respond as JSON: { "answer": string, "groundedInNote": boolean }.' +
          MARKDOWN_FORMATTING_INSTRUCTION +
          SLOVAK_INSTRUCTION +
          `\n\nNote content:\n${note.contentMarkdown.slice(0, MAX_CHARS_PER_NOTE)}`,
      },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: question },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw AppError.serviceUnavailable("The AI returned an empty response. Please try again.", "AI_EMPTY_RESPONSE");
  }

  const parsed = askResultSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw AppError.serviceUnavailable("The AI response didn't match the expected format. Please try again.", "AI_BAD_RESPONSE");
  }

  return parsed.data;
}

// The panel's general chat, used when no specific note is open. Not grounded in any
// note's content - just a plain study-assistant conversation, same cost/opt-in rules as
// everything else (only runs when the user sends a message). `context` is an optional,
// compact plain-text summary the frontend builds from the user's own data (subjects,
// open tasks, upcoming schedule with cancellations/substitutions, note titles - never
// note content) so the assistant can answer things like "am I substituted tomorrow?"
// without needing a note open, and so it feels personalized to more than just this one
// message.
export async function generalChat(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  context?: string
) {
  const client = requireOpenAI();

  const contextBlock = context
    ? `\n\nHere is a compact snapshot of the user's own data in the app right now (subjects, open tasks, upcoming ` +
      "schedule, and note titles only - never note content). Use it to answer questions about their schedule, " +
      "substitutions, cancellations, or tasks, and to make the conversation feel personalized - but don't recite it " +
      `back verbatim unless asked, and don't assume it's complete beyond what's listed:\n${context}`
    : "";

  const completion = await client.chat.completions.create({
    model: AI_MODELS.fast,
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a helpful, concise study assistant inside a personal school dashboard app called Study. Help with " +
          "studying, explaining concepts, homework questions, general study advice, or questions about the user's own " +
          'schedule/tasks (see context below, if provided). You do not have access to note content in this ' +
          'conversation. Respond as JSON: { "answer": string }.' +
          MARKDOWN_FORMATTING_INSTRUCTION +
          SLOVAK_INSTRUCTION +
          contextBlock,
      },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: message },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw AppError.serviceUnavailable("The AI returned an empty response. Please try again.", "AI_EMPTY_RESPONSE");
  }

  const parsed = chatResultSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw AppError.serviceUnavailable("The AI response didn't match the expected format. Please try again.", "AI_BAD_RESPONSE");
  }

  return parsed.data;
}

export interface RewriteOptions {
  scope: "full" | "selection";
  selectionText?: string;
  instructions?: string;
}

// A genuine rewrite (not a typo/handwriting correction pass) for notes typed quickly
// during class that may not read well - the student picks whether to rewrite the whole
// note or just a selected passage, and can add free-form instructions (make it more
// concise, add an example, explain a step in more depth, etc.). Returns plain rewritten
// Markdown with no diff markup: for "full" scope the whole note, for "selection" scope
// only the replacement text for that passage - the frontend shows a before/after
// preview and the student explicitly applies or discards it.
export async function rewriteNote(note: NoteContext, options: RewriteOptions) {
  const instructionsLine = options.instructions
    ? ` The student also specifically asked for this: "${options.instructions}" - follow it. Unlike a normal ` +
      "correction pass, you are allowed to add genuinely new content here (an example, an extra explanation, etc.) " +
      "if that's what they asked for, but only what they actually asked for - don't invent unrelated additions."
    : "";

  if (options.scope === "selection") {
    return requestJson({
      model: AI_MODELS.capable,
      schema: rewriteResultSchema,
      temperature: 0.5,
      system:
        "You rewrite ONE selected passage from a student's class notes so it reads more naturally and is easier to " +
        "understand - the student often has to write quickly during class, so the original can be a rough, run-on, " +
        "or unclear. Use the rest of the note only as context for terminology/consistency; rewrite ONLY the selected " +
        "passage below, and return ONLY the replacement text for that passage, not the whole note. You may freely " +
        "restructure sentences, turn a run-on into a list, fix grammar, and reorganize for clarity - you are not " +
        "limited to small corrections. Preserve the actual facts/meaning of the passage unless the student's own " +
        `instructions ask you to add something new.${instructionsLine} Respond as JSON: { "rewritten": string }.` +
        MARKDOWN_FORMATTING_INSTRUCTION +
        SLOVAK_INSTRUCTION,
      user: `Full note "${note.title}" for context:\n${note.contentMarkdown.slice(0, MAX_CHARS_PER_NOTE)}\n\nSelected passage to rewrite:\n${options.selectionText}`,
    });
  }

  return requestJson({
    model: AI_MODELS.capable,
    schema: rewriteResultSchema,
    temperature: 0.5,
    system:
      "You rewrite a student's class notes so they read more naturally and are easier to understand - the student " +
      "often has to write quickly during class, so the original can be rough, run-on, or unclear in places. Rewrite " +
      "the whole note: improve phrasing and clarity, and reorganize into clearer sections/lists where that genuinely " +
      "helps. Preserve all the actual information in the note - never drop a fact - but you are not limited to only " +
      `correcting wording; restructure freely where it makes the note clearer.${instructionsLine} Respond as JSON: ` +
      '{ "rewritten": string }.' +
      MARKDOWN_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user: `Note title: ${note.title}\n\nCurrent note content (Markdown):\n${note.contentMarkdown.slice(0, MAX_CHARS_PER_NOTE)}`,
  });
}

// ---- Tests: long, written-answer exams generated from notes and graded by the AI ----

export interface TestSettings {
  difficulty: "easy" | "medium" | "hard" | "very_hard";
  thinking: "recall" | "understanding" | "deep";
  logic: "low" | "medium" | "high";
  durationMinutes: number;
  instructions?: string;
}

const DIFFICULTY_TEXT: Record<TestSettings["difficulty"], string> = {
  easy: "easy - checks that the basics are understood",
  medium: "medium - a normal school test",
  hard: "hard - a demanding test that separates good from excellent answers",
  very_hard: "very hard - the hardest fair test you can write from this material",
};

const THINKING_TEXT: Record<TestSettings["thinking"], string> = {
  recall: "mostly recall: definitions, facts, formulas, stating and describing",
  understanding: "mostly understanding: explaining why, comparing, giving examples, applying a rule to a new case",
  deep: "mostly deep thinking: analysing, combining several ideas, multi-step reasoning, justifying conclusions",
};

const LOGIC_TEXT: Record<TestSettings["logic"], string> = {
  low: "few logic or problem-solving tasks",
  medium: "a fair share of tasks that need logical reasoning or problem solving (calculations, derivations, cause and effect)",
  high: "mostly tasks built on logical reasoning and problem solving (calculations, proofs, derivations, puzzles of cause and effect)",
};

// Generates a long written test. Every question carries its own point value (scaled to the
// effort it takes), an estimated time, a model answer and grading criteria - the latter two
// are kept on the server until the attempt is graded.
export async function generateTest(notes: NoteContext[], settings: TestSettings) {
  const instructionsLine = settings.instructions
    ? ` The student described the test they want like this - follow it as long as it fits the material: "${settings.instructions}".`
    : "";

  return requestJson({
    model: AI_MODELS.capable,
    schema: testGenerationResultSchema,
    temperature: 0.6,
    maxTokens: 14000,
    system:
      "You write real written school tests from a student's class notes. There are no answer options: every question " +
      "must be answered in writing (a sentence, a paragraph, a calculation, a derivation). Questions must be answerable " +
      "from the material in the notes (you may require combining and applying it). Write clear, unambiguous questions. " +
      `Difficulty: ${DIFFICULTY_TEXT[settings.difficulty]}. Kind of thinking: ${THINKING_TEXT[settings.thinking]}. ` +
      `Logic: ${LOGIC_TEXT[settings.logic]}. The whole test should take a well-prepared student about ` +
      `${settings.durationMinutes} minutes - choose the number of questions to fit that (between 3 and 40), and give each ` +
      'question an honest "estimatedMinutes". Give each question "points" (an integer from 1 to 20) proportional to ' +
      "the work and understanding it requires. For every question also write a complete, correct \"modelAnswer\" " +
      'and "criteria": a short list of what an answer must contain to earn full points (each criterion should be ' +
      'checkable). Give each question a short "topic" (2-4 words) naming what it tests.' +
      instructionsLine +
      ' Respond as JSON: { "title": string (a short test title), "questions": [ { "prompt": string, "points": number, ' +
      '"estimatedMinutes": number, "topic": string, "modelAnswer": string, "criteria": string[] } ] }.' +
      MATH_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user: `Write the test from these notes:\n\n${buildNotesContext(notes)}`,
  });
}

export interface GradingQuestion {
  id: string;
  prompt: string;
  points: number;
  topic?: string;
  modelAnswer: string;
  criteria: string[];
  answer: string;
}

// Questions per grading call. Small batches keep the model's attention on each answer and
// leave room in the output for the per-criterion evidence.
const GRADING_BATCH_SIZE = 6;

const GRADING_SYSTEM_PROMPT =
  "You are an experienced, fair teacher grading a student's written test answers. Grade every question on its own, " +
  "working through these steps in this order:\n" +
  '1. "checks": take the criteria one by one (if there are none, use the key points of the model answer). For each, ' +
  "read the WHOLE student answer and look for any part that expresses it, in any wording, order or level of detail: " +
  "a paraphrase, a synonym, an example that shows it, or a different but valid method all count. Copy that part of " +
  'the student\'s answer word for word into "evidence" (a short fragment). Status "met" when it fully expresses the ' +
  'criterion, "partial" when it does so only partly or imprecisely, "missing" only when no part of the answer ' +
  'expresses it (evidence is then "").\n' +
  '2. "errors": statements in the answer that are factually wrong, quoted word for word. Omissions do not belong here.\n' +
  '3. "awarded": points from 0 to maxPoints in steps of 0.5, following from the checks and errors. When every check ' +
  "is met and there are no errors, award maxPoints. Give partial points in proportion to what is right. Give nothing " +
  "for content that is wrong, irrelevant or only restates the question. Do not deduct for brevity, wording, spelling, " +
  "order or for things the criteria do not ask for, and do not reward length or confident wording.\n" +
  '4. "feedback": short and specific, addressed to the student, and consistent with your checks: never say something ' +
  "is missing or wrong unless a check or an error above says so. For a full-mark answer, say briefly what was good.\n" +
  '5. "correctAnswer": a concise full-mark answer. "toLearn": one sentence on what to study to do better, or "" when ' +
  "the answer earned full points.\n" +
  "The notes are for checking facts only: a correct statement that is not in the notes is still correct. " +
  'Respond as JSON: { "results": [ { "id": string, "checks": [ { "criterion": string, "evidence": string, ' +
  '"status": "met" | "partial" | "missing" } ], "errors": string[], "awarded": number, "feedback": string, ' +
  '"correctAnswer": string, "toLearn": string } ] }. Include every question id you were given.' +
  MATH_FORMATTING_INSTRUCTION +
  " Write all text values in Slovak (slovenčina); keep JSON keys and status values exactly as given, and copy " +
  "evidence exactly as the student wrote it.";

async function gradeBatch(notesContext: string, questions: GradingQuestion[]) {
  const payload = questions.map((q) => ({
    id: q.id,
    question: q.prompt,
    maxPoints: q.points,
    criteria: q.criteria,
    modelAnswer: q.modelAnswer,
    studentAnswer: q.answer,
  }));
  const result = await requestJson({
    model: AI_MODELS.capable,
    schema: testGradingResultSchema,
    temperature: 0,
    maxTokens: 8000,
    system: GRADING_SYSTEM_PROMPT,
    user:
      `The notes the test was written from (for checking facts):\n\n${notesContext}\n\n---\n\n` +
      `Questions with the student's answers (JSON):\n${JSON.stringify(payload)}`,
  });
  return result.results;
}

// A short overview of the whole graded test, written from the per-question results.
async function summarizeGrading(questions: GradingQuestion[], results: Awaited<ReturnType<typeof gradeBatch>>) {
  const byId = new Map(results.map((r) => [r.id, r]));
  const payload = questions.map((q) => ({
    topic: q.topic ?? "",
    question: q.prompt,
    maxPoints: q.points,
    awarded: byId.get(q.id)?.awarded ?? 0,
    feedback: byId.get(q.id)?.feedback ?? "",
  }));
  return requestJson({
    model: AI_MODELS.fast,
    schema: testGradingSummarySchema,
    temperature: 0.3,
    system:
      "You are a teacher writing a short overview of a student's graded written test. From the per-question results, " +
      'write a two or three sentence "summary" of how the test went, a list of "strengths" and a list of "toReview" ' +
      "topics (short noun phrases) the student should study, based only on questions that lost points. Respond as " +
      'JSON: { "summary": string, "strengths": string[], "toReview": string[] }.' +
      SLOVAK_INSTRUCTION,
    user: `Graded questions (JSON):\n${JSON.stringify(payload)}`,
  });
}

// Grades written answers against the model answer and criteria, a few questions per call (in
// parallel), then writes the overview. The prompt asks for evidence-based, objective marking:
// partial credit for partially correct work, nothing for wrong or irrelevant content, and no
// invented gaps in a correct answer.
export async function gradeTest(notes: NoteContext[], questions: GradingQuestion[]) {
  const notesContext = buildNotesContext(notes);
  const batches: GradingQuestion[][] = [];
  for (let i = 0; i < questions.length; i += GRADING_BATCH_SIZE) batches.push(questions.slice(i, i + GRADING_BATCH_SIZE));
  const results = (await Promise.all(batches.map((batch) => gradeBatch(notesContext, batch)))).flat();

  // The overview is a nicety; a failure here must not throw away the grades.
  const overview = await summarizeGrading(questions, results).catch(() => ({
    summary: "",
    strengths: [] as string[],
    toReview: questions
      .filter((q) => (results.find((r) => r.id === q.id)?.awarded ?? 0) < q.points)
      .map((q) => q.topic ?? "")
      .filter(Boolean),
  }));
  return { results, ...overview };
}
