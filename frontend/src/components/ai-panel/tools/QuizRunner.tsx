import { Check, ChevronLeft, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { QuizQuestion } from "@/api/ai";
import * as quizzesApi from "@/api/quizzes";
import { InlineMarkdown } from "@/components/notes/InlineMarkdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { BeyondNotesMark } from "./ToolParts";

type Answer = quizzesApi.QuizAnswer;

const LETTERS = "ABCDEFGH";

const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  multiple_choice: "Multiple choice",
  true_false: "True or false",
  short_answer: "Short answer",
};

function isCorrect(question: QuizQuestion, answer: Answer): boolean {
  if (question.type === "multiple_choice") return answer.selectedIndex === question.correctIndex;
  if (question.type === "true_false") return answer.selectedBool === question.correctAnswer;
  return Boolean(answer.markedCorrect);
}

// A short-answer question isn't settled until the student has compared their answer with the
// model answer and said how it went.
function isSettled(question: QuizQuestion, answer: Answer): boolean {
  return answer.checked && (question.type !== "short_answer" || answer.markedCorrect !== undefined);
}

function canCheck(question: QuizQuestion, answer: Answer): boolean {
  if (question.type === "multiple_choice") return answer.selectedIndex !== undefined;
  if (question.type === "true_false") return answer.selectedBool !== undefined;
  return Boolean(answer.shortAnswerText?.trim());
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
}

/** One answer choice. A row in a ruled list, keyed A/B/C... - not a card. */
function ChoiceRow({
  keyLabel,
  state,
  disabled,
  onSelect,
  children,
}: {
  keyLabel: string;
  state: "idle" | "selected" | "correct" | "wrong" | "dimmed";
  disabled: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={state === "selected" || state === "wrong" || (state === "correct" && !disabled)}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 px-2 py-3 text-left transition-colors disabled:cursor-default",
        state === "idle" && "hover:bg-tint/60",
        state === "selected" && "bg-accent/[0.08]",
        state === "correct" && "bg-ok/[0.08]",
        state === "wrong" && "bg-bad/[0.08]",
        state === "dimmed" && "opacity-55"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-px flex size-6 shrink-0 items-center justify-center rounded-sm border text-meta font-semibold",
          state === "idle" && "border-rule-strong text-fg-muted",
          state === "dimmed" && "border-rule text-fg-faint",
          state === "selected" && "border-accent-fill bg-accent-fill text-on-accent",
          state === "correct" && "border-ok bg-ok text-canvas",
          state === "wrong" && "border-bad bg-bad text-canvas"
        )}
      >
        {state === "correct" ? <Check className="size-3.5" strokeWidth={3} /> : state === "wrong" ? <X className="size-3.5" strokeWidth={3} /> : keyLabel}
      </span>
      <span className="min-w-0 flex-1 pt-0.5">{children}</span>
    </button>
  );
}

function choiceState(selected: boolean, correct: boolean, checked: boolean): "idle" | "selected" | "correct" | "wrong" | "dimmed" {
  if (!checked) return selected ? "selected" : "idle";
  if (correct) return "correct";
  if (selected) return "wrong";
  return "dimmed";
}

function correctAnswerText(question: QuizQuestion): string {
  if (question.type === "multiple_choice") return `${LETTERS[question.correctIndex]}`;
  if (question.type === "true_false") return question.correctAnswer ? "True" : "False";
  return "";
}

interface QuizRunnerProps {
  attempt: quizzesApi.QuizAttempt;
  onNewQuiz: () => void;
  /** Start a new attempt with the same questions. */
  onRetry: () => void;
  isRetrying?: boolean;
  active: boolean;
}

export function QuizRunner({ attempt, onNewQuiz, onRetry, isRetrying, active }: QuizRunnerProps) {
  const quiz = attempt;
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Answer[]>(() => quiz.questions.map((_, i) => attempt.answers[i] ?? { checked: false }));
  const [finished, setFinished] = useState(attempt.status === "completed");
  const [index, setIndex] = useState(() => {
    const open = quiz.questions.findIndex((q, i) => !isSettled(q, answers[i] ?? { checked: false }));
    return open === -1 ? 0 : open;
  });
  const [saveFailed, setSaveFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  // Every answer is saved as you go, so a refresh or closing the panel never loses a quiz.
  const lastSaved = useRef(JSON.stringify({ answers, finished }));
  useEffect(() => {
    if (!attempt.id) return;
    const key = JSON.stringify({ answers, finished });
    if (key === lastSaved.current) return;
    const timer = setTimeout(() => {
      quizzesApi
        .saveQuiz(attempt.id, answers, finished)
        .then(() => {
          lastSaved.current = key;
          setSaveFailed(false);
          queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        })
        .catch(() => setSaveFailed(true));
    }, 400);
    return () => clearTimeout(timer);
  }, [answers, finished, attempt.id, queryClient, retryTick]);

  // After a failed save, try again every few seconds until it goes through.
  useEffect(() => {
    if (!saveFailed) return;
    const timer = setTimeout(() => setRetryTick((t) => t + 1), 8000);
    return () => clearTimeout(timer);
  }, [saveFailed, retryTick]);

  const question = quiz.questions[index];
  const answer = answers[index];
  const total = quiz.questions.length;
  // The furthest question you can jump to: everything already answered, plus the next one.
  const firstOpen = answers.findIndex((a, i) => !isSettled(quiz.questions[i], a));
  const reachable = firstOpen === -1 ? total - 1 : firstOpen;

  function updateAnswer(patch: Partial<Answer>) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function goNext() {
    if (index + 1 < total) setIndex((i) => i + 1);
    else setFinished(true);
  }


  // Keyboard: A-D / 1-4 to choose, T/F for true-false, Enter to check and continue, arrows to move.
  useEffect(() => {
    if (!active || finished) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (!answer.checked && question.type === "multiple_choice") {
        const byLetter = LETTERS.toLowerCase().indexOf(key);
        const byNumber = Number(key) - 1;
        const choice = byLetter >= 0 && key.length === 1 ? byLetter : byNumber;
        if (choice >= 0 && choice < question.options.length) {
          e.preventDefault();
          updateAnswer({ selectedIndex: choice });
          return;
        }
      }
      if (!answer.checked && question.type === "true_false" && (key === "t" || key === "f" || key === "1" || key === "2")) {
        e.preventDefault();
        updateAnswer({ selectedBool: key === "t" || key === "1" });
        return;
      }
      if (key === "enter") {
        if (!answer.checked && canCheck(question, answer)) {
          e.preventDefault();
          updateAnswer({ checked: true });
        } else if (isSettled(question, answer)) {
          e.preventDefault();
          goNext();
        }
      } else if (key === "arrowleft" && index > 0) {
        setIndex((i) => i - 1);
      } else if (key === "arrowright" && index < reachable && isSettled(question, answer)) {
        setIndex((i) => i + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (finished) {
    const results = quiz.questions.map((q, i) => isCorrect(q, answers[i]));
    const score = results.filter(Boolean).length;
    const missed = total - score;
    return (
      <div className="space-y-7">
        <div>
          <p className="text-meta text-fg-faint">Quiz finished</p>
          <p className="mt-1 text-xl font-semibold text-fg">
            {score} of {total} correct
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {missed === 0 ? "Every answer was right." : `${missed} ${missed === 1 ? "question is" : "questions are"} worth another look - they're marked below.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? "Starting..." : "Retry these questions"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onNewQuiz}>
              New quiz
            </Button>
          </div>
        </div>

        <ol className="divide-y divide-rule border-y border-rule">
          {quiz.questions.map((q, i) => {
            const correct = results[i];
            const a = answers[i];
            return (
              <li key={i} className="flex gap-3 py-4">
                <span
                  className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm", correct ? "text-ok" : "text-bad")}
                  aria-label={correct ? "Correct" : "Incorrect"}
                >
                  {correct ? <Check className="size-4" strokeWidth={2.5} /> : <X className="size-4" strokeWidth={2.5} />}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <InlineMarkdown className="text-[0.9375rem] text-fg" content={q.question} />
                  {q.type !== "short_answer" && !correct && (
                    <p className="text-meta text-fg-muted">
                      You answered{" "}
                      {q.type === "multiple_choice"
                        ? a.selectedIndex !== undefined
                          ? LETTERS[a.selectedIndex]
                          : "-"
                        : a.selectedBool === undefined
                          ? "-"
                          : a.selectedBool
                            ? "True"
                            : "False"}
                      ; the answer is {correctAnswerText(q)}.
                    </p>
                  )}
                  {q.type === "short_answer" && (
                    <p className="text-meta text-fg-muted">{correct ? "You marked this as right." : "You marked this as missed."}</p>
                  )}
                  {q.explanation && (
                    <details className="group text-meta">
                      <summary className="cursor-pointer list-none text-fg-faint hover:text-fg [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">Show explanation</span>
                        <span className="hidden group-open:inline">Hide explanation</span>
                      </summary>
                      <InlineMarkdown className="mt-1.5 text-[0.875rem] text-fg-muted" content={q.explanation} />
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const checked = answer.checked;
  const correct = checked && isCorrect(question, answer);

  return (
    <div className="space-y-6">
      {saveFailed && <p className="text-meta text-warn">Your answers aren't being saved right now. They'll be saved when the connection is back.</p>}
      {/* Progress: one tick per question, coloured once answered. Answered ones can be revisited. */}
      <div>
        <div className="mb-2 flex items-baseline justify-between text-meta">
          <span className="font-medium text-fg-muted">
            Question {index + 1} <span className="text-fg-faint">of {total}</span>
          </span>
          <span className="text-fg-faint">{TYPE_LABEL[question.type]}</span>
        </div>
        <div className="flex gap-[3px]">
          {quiz.questions.map((q, i) => {
            const a = answers[i];
            const settled = isSettled(q, a);
            return (
              <button
                key={i}
                type="button"
                disabled={i > reachable}
                onClick={() => setIndex(i)}
                aria-label={`Question ${i + 1}`}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "h-1.5 flex-1 rounded-xs transition-colors disabled:cursor-default",
                  settled ? (isCorrect(q, a) ? "bg-ok/70" : "bg-bad/70") : a.checked ? "bg-fg-faint" : "bg-rule-strong",
                  i === index && "outline outline-1 outline-offset-2 outline-fg-muted"
                )}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        {question.beyondNotes && <BeyondNotesMark />}
        <InlineMarkdown className="text-[1.0625rem] leading-relaxed text-fg" content={question.question} />
      </div>

      {question.type === "multiple_choice" && (
        <div role="radiogroup" aria-label="Answer choices" className="divide-y divide-rule border-y border-rule">
          {question.options.map((option, i) => (
            <ChoiceRow
              key={i}
              keyLabel={LETTERS[i]}
              state={choiceState(answer.selectedIndex === i, i === question.correctIndex, checked)}
              disabled={checked}
              onSelect={() => updateAnswer({ selectedIndex: i })}
            >
              <InlineMarkdown className="text-[0.9375rem] text-fg" content={option} />
            </ChoiceRow>
          ))}
        </div>
      )}

      {question.type === "true_false" && (
        <div role="radiogroup" aria-label="True or false" className="divide-y divide-rule border-y border-rule">
          {[true, false].map((value) => (
            <ChoiceRow
              key={String(value)}
              keyLabel={value ? "T" : "F"}
              state={choiceState(answer.selectedBool === value, value === question.correctAnswer, checked)}
              disabled={checked}
              onSelect={() => updateAnswer({ selectedBool: value })}
            >
              <span className="font-serif text-[0.9375rem] text-fg">{value ? "True" : "False"}</span>
            </ChoiceRow>
          ))}
        </div>
      )}

      {question.type === "short_answer" && (
        <div className="space-y-4">
          <Textarea
            disabled={checked}
            value={answer.shortAnswerText || ""}
            onChange={(e) => updateAnswer({ shortAnswerText: e.target.value })}
            placeholder="Write your answer"
            aria-label="Your answer"
            className="min-h-24 font-serif text-[0.9375rem]"
          />
          {checked && (
            <div className="space-y-1 border-l-2 border-rule-strong pl-3">
              <p className="text-meta font-medium text-fg-faint">Model answer</p>
              <InlineMarkdown className="text-[0.9375rem] text-fg" content={question.sampleAnswer} />
            </div>
          )}
        </div>
      )}

      {/* Feedback: a plain verdict and the reasoning, ruled in the verdict's colour. */}
      {checked && question.type !== "short_answer" && (
        <div className={cn("space-y-1 border-l-2 pl-3", correct ? "border-ok" : "border-bad")} aria-live="polite">
          <p className={cn("text-sm font-medium", correct ? "text-ok" : "text-bad")}>
            {correct ? "Correct." : `Not quite - the answer is ${correctAnswerText(question)}.`}
          </p>
          {question.explanation && <InlineMarkdown className="text-[0.9375rem] text-fg-muted" content={question.explanation} />}
        </div>
      )}

      {checked && question.type === "short_answer" && (
        <div className="space-y-2">
          <p className="text-[0.8125rem] text-fg-muted">How did your answer compare?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={answer.markedCorrect === true ? "secondary" : "outline"}
              className={cn(answer.markedCorrect === true && "border-ok text-ok")}
              onClick={() => updateAnswer({ markedCorrect: true })}
            >
              <Check /> I had it
            </Button>
            <Button
              size="sm"
              variant={answer.markedCorrect === false ? "secondary" : "outline"}
              className={cn(answer.markedCorrect === false && "border-bad text-bad")}
              onClick={() => updateAnswer({ markedCorrect: false })}
            >
              <X /> I missed something
            </Button>
          </div>
          {question.explanation && answer.markedCorrect !== undefined && (
            <InlineMarkdown className="pt-2 text-[0.9375rem] text-fg-muted" content={question.explanation} />
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)} disabled={index === 0} className="-ml-2.5">
          <ChevronLeft /> Previous
        </Button>
        {!checked ? (
          <Button onClick={() => updateAnswer({ checked: true })} disabled={!canCheck(question, answer)}>
            Check answer
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!isSettled(question, answer)}>
            {index + 1 < total ? "Next question" : "See results"}
          </Button>
        )}
      </div>
      {question.type !== "short_answer" && (
        <p className="hidden text-meta text-fg-faint lg:block">
          {question.type === "multiple_choice" ? `Keys: A-${LETTERS[question.options.length - 1]} to choose` : "Keys: T or F to choose"}, Enter to
          check and continue.
        </p>
      )}
    </div>
  );
}
