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
  modelAnswer: string;
  criteria: string[];
  answer: string;
}

// Grades written answers against the model answer and criteria. The prompt asks for fair,
// objective marking: real partial credit for partially correct work, no points for wrong or
// irrelevant content, and no invented faults in a correct answer.
export async function gradeTest(notes: NoteContext[], questions: GradingQuestion[]) {
  const payload = questions.map((q) => ({
    id: q.id,
    question: q.prompt,
    maxPoints: q.points,
    modelAnswer: q.modelAnswer,
    criteria: q.criteria,
    studentAnswer: q.answer,
  }));

  return requestJson({
    model: AI_MODELS.capable,
    schema: testGradingResultSchema,
    temperature: 0.2,
    maxTokens: 12000,
    system:
      "You are an experienced, fair teacher grading a student's written test. For each question compare the student's " +
      "answer with the model answer and the criteria, and award points from 0 to maxPoints in steps of 0.5. Be " +
      "objective: give full points to an answer that is correct and complete, even if worded differently, ordered " +
      "differently, or using different but valid notation or method. Give partial points for answers that are partly " +
      "correct, in proportion to what they get right. Give no points for content that is wrong, irrelevant, or only " +
      "restates the question, and do not reward length or confident wording. Do not invent mistakes in a correct answer " +
      "and do not be harsh for the sake of it; small slips (spelling, a typo, a missing unit when the method and result " +
      "are clearly right) cost at most a little. Judge only what is actually written. For each question write short, " +
      'specific "feedback" for the student (what was right, what was wrong or missing), a concise "correctAnswer" ' +
      '(what a full-mark answer contains), and "toLearn": one sentence on what to study to do better, or an empty ' +
      'string when the answer earned full points. Then write a two or three sentence "summary" of the whole test, ' +
      'a list of "strengths" and a list of "toReview" topics (short noun phrases). Respond as JSON: { "results": ' +
      '[ { "id": string, "awarded": number, "feedback": string, "correctAnswer": string, "toLearn": string } ], ' +
      '"summary": string, "strengths": string[], "toReview": string[] }. Include every question id you were given.' +
      MATH_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user:
      `The notes the test was written from (for reference):\n\n${buildNotesContext(notes)}\n\n---\n\n` +
      `Questions with the student's answers (JSON):\n${JSON.stringify(payload)}`,
  });
}
