import OpenAI from "openai";
import { env } from "./env";

export const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

// Centralized model selection so the rest of the app never hardcodes a model name.
// "fast" is used for cheap/simple tasks (summary, flashcards), "capable" for tasks
// that benefit from stronger reasoning (practice questions, ask-this-note).
export const AI_MODELS = {
  fast: env.OPENAI_MODEL_DEFAULT,
  capable: env.OPENAI_MODEL_ADVANCED,
};
