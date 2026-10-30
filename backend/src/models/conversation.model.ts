import { z } from "zod";

export const chatMessageSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(30000),
  label: z.string().max(40).optional(),
  groundedInNote: z.boolean().optional(),
  isError: z.boolean().optional(),
  createdAt: z.string().max(40).optional(),
});

export const createConversationSchema = z.object({
  noteId: z.string().min(1).nullable().optional(),
  title: z.string().trim().max(200).optional(),
  messages: z.array(chatMessageSchema).max(400).default([]),
});

export const updateConversationSchema = z.object({
  title: z.string().trim().max(200).optional(),
  messages: z.array(chatMessageSchema).max(400),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
