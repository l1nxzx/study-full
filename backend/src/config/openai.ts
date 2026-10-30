import OpenAI from "openai";
import { env } from "./env";

// Tests and grading make a few calls in parallel; extra retries ride out short rate-limit
// spikes (the SDK waits as long as the API's retry-after asks).
export const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 4 }) : null;

// Centralized model selection so the rest of the app never hardcodes a model name.
// "fast" is used for cheap/simple tasks (summary, flashcards), "capable" for tasks
// that benefit from stronger reasoning (practice questions, ask-this-note).
export const AI_MODELS = {
  fast: env.OPENAI_MODEL_DEFAULT,
  capable: env.OPENAI_MODEL_ADVANCED,
};
