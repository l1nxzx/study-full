import { AI_MODELS, openai } from "../config/openai";
import { planTest, type QuestionKind, type QuestionSlot } from "./testPlan";
import { AppError } from "../utils/AppError";
import {
  askResultSchema,
  chatResultSchema,
  explainResultSchema,
  flashcardsResultSchema,
  quizResultSchema,
  testGradingResultSchema,
  testGradingSummarySchema,
  testOutlineSchema,
  testQuestionsSchema,
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
// Every note gets a fair share of the budget (short notes pass whole, and what they leave
// over goes to the longer ones), so picking many notes never silently drops the last ones.
export function buildNotesContext(notes: NoteContext[], limits = { perNote: MAX_CHARS_PER_NOTE, total: MAX_TOTAL_CHARS }): string {
  const budgets = new Map<number, number>();
  let remaining = limits.total;
  const byLength = notes.map((n, i) => ({ i, length: n.contentMarkdown.length })).sort((a, b) => a.length - b.length);
  byLength.forEach(({ i, length }, k) => {
    const share = Math.floor(remaining / (byLength.length - k));
    const budget = Math.min(length, limits.perNote, share);
    budgets.set(i, budget);
    remaining -= budget;
  });

  return notes
    .map((note, i) => `## ${note.title}\n\n${note.contentMarkdown.slice(0, budgets.get(i))}`)
    .join("\n\n---\n\n");
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

// Runs fn over items with at most `limit` calls in flight, keeping the results in order.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const AI_CONCURRENCY = 3;

async function requestJson<T>(params: {
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = requireOpenAI();

  // Reasoning models (o-series, gpt-5) only take the default temperature, and their hidden
  // reasoning counts towards the output limit, so they get extra room.
  const reasoning = /^(o\d|gpt-5)/.test(params.model);
  const completion = await client.chat.completions.create({
    model: params.model,
    ...(reasoning ? {} : { temperature: params.temperature ?? 0.4 }),
    ...(params.maxTokens ? { max_completion_tokens: reasoning ? params.maxTokens + 16000 : params.maxTokens } : {}),
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

// What each setting means for a single question. The settings decide the plan (testPlan.ts);
// these texts make every question live up to its slot.
const DIFFICULTY_TEXT: Record<TestSettings["difficulty"], string> = {
  easy: "easy: straightforward, one step, the question makes clear what is needed",
  medium: "medium: a normal school test question, about two steps",
  hard:
    "hard: demanding, several steps or ideas, nothing is hinted; it separates good students from excellent ones",
  very_hard:
    "very hard: the hardest fair question you can write from this material - an unfamiliar framing, several ideas " +
    "combined, precise justification needed; an average student would not get full points. Still answerable from " +
    "the notes plus reasoning",
};

const KIND_TEXT: Record<QuestionKind, string> = {
  recall: "recall: state, define, name, list or describe something from the notes precisely",
  understanding:
    "understanding: explain why or how, compare two things, give and justify an example, or apply a concept to a " +
    "given case",
  deep:
    "deep thinking: analyse a situation, combine ideas from different parts of the notes (or different notes), " +
    "evaluate or argue for a conclusion, or predict consequences in a new scenario the notes don't describe, " +
    "justifying each step. It must not be answerable by repeating one passage of the notes",
};

const PROBLEM_TEXT =
  "It is a problem to reason through: a calculation, a cause-and-effect chain of several steps, interpreting data " +
  "given in the question (numbers, a table, a described map or graph) and drawing conclusions, or a what-if " +
  "prediction. Put all the data needed in the question.";

function describeSlot(slot: QuestionSlot, index: number) {
  return (
    `Slot ${index + 1}: ${KIND_TEXT[slot.kind]}.${slot.problem ? ` ${PROBLEM_TEXT}` : ""} About ${slot.minutes} ` +
    `minutes of work for a well-prepared student, ${slot.points} points.`
  );
}

function instructionsLine(settings: TestSettings) {
  return settings.instructions
    ? ` The student described the test they want like this - follow it as long as it fits the material: "${settings.instructions}".`
    : "";
}

// Tests read more of the notes than other tools: a test can cover up to 15 notes.
const TEST_NOTES_LIMITS = { perNote: 16000, total: 40000 };
const TEST_WRITE_BATCH_SIZE = 6;

async function outlineTest(notesContext: string, settings: TestSettings, slots: QuestionSlot[]) {
  return requestJson({
    model: AI_MODELS.capable,
    schema: testOutlineSchema,
    temperature: 0.5,
    maxTokens: 4000,
    system:
      "You plan a written school test from a student's class notes. The test has a fixed list of question slots, each " +
      "with the kind of thinking it asks for. For every slot choose a distinct topic and say in one sentence what the " +
      "question will ask (its focus), fitting the slot. Cover the material broadly: spread the slots over all the " +
      "notes and their main ideas, and never test the same thing twice. Deep-thinking slots should combine ideas, " +
      `ideally from different notes. Overall difficulty: ${DIFFICULTY_TEXT[settings.difficulty]}.` +
      instructionsLine(settings) +
      ' Respond as JSON: { "title": string (a short test title), "outline": [ { "slot": number, "topic": string ' +
      '(2-4 words), "focus": string } ] } with exactly one entry per slot.' +
      SLOVAK_INSTRUCTION,
    user: `Slots:\n${slots.map(describeSlot).join("\n")}\n\nNotes:\n\n${notesContext}`,
  });
}

async function writeQuestions(
  notesContext: string,
  settings: TestSettings,
  slots: QuestionSlot[],
  outline: { slot: number; topic: string; focus: string }[],
  slotNumbers: number[]
) {
  const plan = outline.map((o) => `Slot ${o.slot}: ${o.topic} - ${o.focus}`).join("\n");
  const mine = slotNumbers
    .map((n) => {
      const o = outline.find((x) => x.slot === n);
      return `${describeSlot(slots[n - 1], n - 1)}${o ? ` Topic: ${o.topic}. Focus: ${o.focus}` : " Pick a topic no other slot covers."}`;
    })
    .join("\n");
  const result = await requestJson({
    model: AI_MODELS.capable,
    schema: testQuestionsSchema,
    temperature: 0.6,
    maxTokens: 8000,
    system:
      "You write questions for a real written school test from a student's class notes. There are no answer options: " +
      "every question is answered in writing (a sentence, a paragraph, a calculation, a derivation). Write exactly one " +
      "question for each slot you are given, matching its kind of thinking, its problem flag, its topic and focus, " +
      "and its minutes: the expected answer should take about that long to write, so a long slot needs a substantial " +
      `task, not a one-line answer. Difficulty of every question: ${DIFFICULTY_TEXT[settings.difficulty]}. Questions ` +
      "must be answerable from the notes (combining and applying them is fine), clear and unambiguous. For each " +
      'question also write a complete, correct "modelAnswer" and "criteria": a short list of what an answer must ' +
      'contain to earn full points, each one checkable. "topic" is 2-4 words naming what it tests.' +
      instructionsLine(settings) +
      ' Respond as JSON: { "questions": [ { "slot": number, "prompt": string, "topic": string, "modelAnswer": string, ' +
      '"criteria": string[] } ] } with one entry per slot you were given.' +
      MATH_FORMATTING_INSTRUCTION +
      SLOVAK_INSTRUCTION,
    user:
      `The whole test (for context, so your questions don't repeat the others):\n${plan}\n\n` +
      `Write the questions for these slots:\n${mine}\n\nNotes:\n\n${notesContext}`,
  });
  return result.questions.filter((q) => slotNumbers.includes(q.slot));
}

// Generates a written test. The number of questions, their kinds, minutes and points come from
// the plan (testPlan.ts); the AI outlines topics for the slots, then writes the questions a few
// slots per call, in parallel. Slots that come back empty are asked for again (twice at most).
export async function generateTest(notes: NoteContext[], settings: TestSettings) {
  const slots = planTest(settings);
  const notesContext = buildNotesContext(notes, TEST_NOTES_LIMITS);
  const { title, outline } = await outlineTest(notesContext, settings, slots);

  const written = new Map<number, Awaited<ReturnType<typeof writeQuestions>>[number]>();
  for (let round = 0; round < 3; round++) {
    const missing = slots.map((_, i) => i + 1).filter((n) => !written.has(n));
    if (missing.length === 0) break;
    const batches: number[][] = [];
    for (let i = 0; i < missing.length; i += TEST_WRITE_BATCH_SIZE) batches.push(missing.slice(i, i + TEST_WRITE_BATCH_SIZE));
    const results = await mapLimit(batches, AI_CONCURRENCY, (b) => writeQuestions(notesContext, settings, slots, outline, b));
    for (const r of results) {
      if (r.status === "fulfilled") for (const q of r.value) if (!written.has(q.slot)) written.set(q.slot, q);
    }
  }

  if (written.size < Math.min(slots.length, 3)) {
    throw AppError.serviceUnavailable("The AI couldn't write the test. Please try again.", "AI_BAD_RESPONSE");
  }

  const questions = slots.flatMap((slot, i) => {
    const q = written.get(i + 1);
    if (!q) return [];
    const planned = outline.find((o) => o.slot === i + 1);
    return [
      {
        prompt: q.prompt,
        points: slot.points,
        estimatedMinutes: slot.minutes,
        topic: (q.topic || planned?.topic || "").slice(0, 80),
        modelAnswer: q.modelAnswer,
        criteria: q.criteria,
        kind: slot.kind,
        problem: slot.problem,
      },
    ];
  });
  return { title, questions };
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
    maxTokens: 6000,
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

// Grades written answers against the model answer and criteria, a few questions per call (a
// few in parallel), then writes the overview. The prompt asks for evidence-based, objective marking:
// partial credit for partially correct work, nothing for wrong or irrelevant content, and no
// invented gaps in a correct answer.
export async function gradeTest(notes: NoteContext[], questions: GradingQuestion[]) {
  const notesContext = buildNotesContext(notes);
  const batches: GradingQuestion[][] = [];
  for (let i = 0; i < questions.length; i += GRADING_BATCH_SIZE) batches.push(questions.slice(i, i + GRADING_BATCH_SIZE));
  const settled = await mapLimit(batches, AI_CONCURRENCY, (batch) => gradeBatch(notesContext, batch));
  const failed = settled.find((r) => r.status === "rejected");
  if (failed) throw (failed as PromiseRejectedResult).reason;
  const results = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

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
