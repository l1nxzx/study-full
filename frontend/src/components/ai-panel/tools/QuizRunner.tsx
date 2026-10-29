import { useState } from "react";
import type { QuizQuestion, QuizResult } from "@/api/ai";
import { InlineMarkdown } from "@/components/notes/InlineMarkdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Answer {
  checked: boolean;
  selectedIndex?: number;
  selectedBool?: boolean;
  shortAnswerText?: string;
  markedCorrect?: boolean;
}

function isCorrect(question: QuizQuestion, answer: Answer): boolean {
  if (question.type === "multiple_choice") return answer.selectedIndex === question.correctIndex;
  if (question.type === "true_false") return answer.selectedBool === question.correctAnswer;
  return Boolean(answer.markedCorrect);
}

export function QuizRunner({ quiz, onRestart }: { quiz: QuizResult; onRestart: () => void }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(quiz.questions.map(() => ({ checked: false })));
  const [finished, setFinished] = useState(false);

  const question = quiz.questions[index];
  const answer = answers[index];

  function updateAnswer(patch: Partial<Answer>) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function goNext() {
    if (index + 1 < quiz.questions.length) {
      setIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  }

  if (finished) {
    const score = answers.filter((a, i) => isCorrect(quiz.questions[i], a)).length;
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Quiz complete</p>
        <p className="text-3xl font-semibold">
          {score} / {quiz.questions.length}
        </p>
        <p className="text-lg text-muted-foreground">{pct}%</p>
        <Button onClick={onRestart}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {index + 1} of {quiz.questions.length}
        </span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((index + (answer.checked ? 1 : 0)) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {question.beyondNotes && <Badge variant="warning">Beyond your notes</Badge>}

      <InlineMarkdown className="text-sm font-medium text-foreground" content={question.question} />

      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {question.options.map((option, i) => {
            const selected = answer.selectedIndex === i;
            const showResult = answer.checked;
            const correct = i === question.correctIndex;
            return (
              <button
                key={i}
                disabled={answer.checked}
                onClick={() => updateAnswer({ selectedIndex: i })}
                className={cn(
                  "flex w-full items-center rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  !showResult && selected && "border-primary bg-accent",
                  !showResult && !selected && "border-input hover:bg-muted",
                  showResult && correct && "border-success bg-success/10",
                  showResult && selected && !correct && "border-destructive bg-destructive/10",
                  showResult && !selected && !correct && "border-input opacity-60"
                )}
              >
                <InlineMarkdown content={option} />
              </button>
            );
          })}
        </div>
      )}

      {question.type === "true_false" && (
        <div className="flex gap-2">
          {[true, false].map((value) => {
            const selected = answer.selectedBool === value;
            const showResult = answer.checked;
            const correct = value === question.correctAnswer;
            return (
              <button
                key={String(value)}
                disabled={answer.checked}
                onClick={() => updateAnswer({ selectedBool: value })}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  !showResult && selected && "border-primary bg-accent",
                  !showResult && !selected && "border-input hover:bg-muted",
                  showResult && correct && "border-success bg-success/10",
                  showResult && selected && !correct && "border-destructive bg-destructive/10"
                )}
              >
                {value ? "True" : "False"}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "short_answer" && (
        <div className="space-y-2">
          <textarea
            disabled={answer.checked}
            value={answer.shortAnswerText || ""}
            onChange={(e) => updateAnswer({ shortAnswerText: e.target.value })}
            placeholder="Your answer..."
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {answer.checked && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="font-medium">Sample answer: </span>
              <InlineMarkdown className="inline" content={question.sampleAnswer} />
            </div>
          )}
        </div>
      )}

      {answer.checked && question.type !== "short_answer" && (
        <div className="rounded-md bg-muted px-3 py-2">
          <InlineMarkdown className="text-sm text-muted-foreground" content={question.explanation} />
        </div>
      )}

      {answer.checked && question.type === "short_answer" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">How did you do?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={answer.markedCorrect === true ? "default" : "outline"}
              onClick={() => updateAnswer({ markedCorrect: true })}
            >
              I was right
            </Button>
            <Button
              size="sm"
              variant={answer.markedCorrect === false ? "destructive" : "outline"}
              onClick={() => updateAnswer({ markedCorrect: false })}
            >
              I was wrong
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {!answer.checked ? (
          <Button
            onClick={() => updateAnswer({ checked: true })}
            disabled={
              (question.type === "multiple_choice" && answer.selectedIndex === undefined) ||
              (question.type === "true_false" && answer.selectedBool === undefined) ||
              (question.type === "short_answer" && !answer.shortAnswerText?.trim())
            }
          >
            Check
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={question.type === "short_answer" && answer.markedCorrect === undefined}
          >
            {index + 1 < quiz.questions.length ? "Next" : "Finish"}
          </Button>
        )}
      </div>
    </div>
  );
}
