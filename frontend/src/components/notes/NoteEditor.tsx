import { useState } from "react";
import type { NoteInput } from "@/api/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useClassSessions } from "@/hooks/useClassSessions";
import { useSubjects } from "@/hooks/useSubjects";
import { formatDateLong } from "@/lib/date";
import { CopyPromptButton } from "./CopyPromptButton";
import { MarkdownRenderer } from "./MarkdownRenderer";

export interface NoteEditorValues extends NoteInput {}

interface NoteEditorProps {
  initialValues: NoteEditorValues;
  onSubmit: (values: NoteEditorValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function NoteEditor({ initialValues, onSubmit, onCancel, isSubmitting, submitLabel = "Save" }: NoteEditorProps) {
  const [values, setValues] = useState<NoteEditorValues>(initialValues);
  const { data: subjects } = useSubjects();
  const { data: sessions } = useClassSessions(values.subjectId ? { subjectId: values.subjectId } : {});
  const selectedSubjectName = subjects?.find((s) => s.id === values.subjectId)?.name;

  const canSubmit = values.title.trim().length > 0 && values.subjectId && values.date;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(values);
      }}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          placeholder="e.g. Linear Equations"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Select
            value={values.subjectId || undefined}
            onValueChange={(subjectId) => setValues((v) => ({ ...v, subjectId, sessionId: null }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note-date">Date</Label>
          <Input
            id="note-date"
            type="date"
            value={values.date}
            onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Class session (optional)</Label>
          <Select
            value={values.sessionId || "none"}
            onValueChange={(sessionId) => setValues((v) => ({ ...v, sessionId: sessionId === "none" ? null : sessionId }))}
            disabled={!values.subjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {sessions?.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title || formatDateLong(session.date)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Content</Label>
          <CopyPromptButton subjectName={selectedSubjectName} />
        </div>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              placeholder="Paste your cleaned-up Markdown notes here..."
              className="min-h-80 font-mono text-sm"
              value={values.contentMarkdown}
              onChange={(e) => setValues((v) => ({ ...v, contentMarkdown: e.target.value }))}
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-80 rounded-md border border-input px-4 py-3">
              <MarkdownRenderer content={values.contentMarkdown} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
